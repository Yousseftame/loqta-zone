/**
 * src/store/AuthContext/AuthContext.tsx
 *
 * Changes vs previous version:
 *  - logout() now calls unregisterFCMToken() from useFCM.ts instead of
 *    inline FCM logic. The inline approach called getToken() during logout
 *    which could generate a brand-new token and then remove that new one,
 *    leaving all stale tokens behind. The hook-based approach reads from
 *    sessionStorage (the exact token registered for this tab) so the right
 *    token is always removed.
 *  - Removed direct firebase/messaging imports — all FCM logic lives in useFCM.ts.
 *  - Removed VAPID_KEY from this file — only useFCM.ts needs it.
 *  - Removed useRef import — no longer needed here.
 */

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  type ReactNode,
} from "react";
import {
  type User,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  onAuthStateChanged,
  updateProfile,
  deleteUser,
} from "firebase/auth";
import toast from "react-hot-toast";
import app, { auth, db, storage } from "@/firebase/firebase";
import { doc, setDoc, getDoc, deleteDoc, serverTimestamp, collection, query, where, getDocs } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { unregisterFCMToken } from "@/hooks/useFCM";
import { auditLogger, buildActor } from "@/service/audit/auditLogger";

export type UserRole = "user" | "admin" | "superAdmin";

export interface AppUser extends User {
  role?: UserRole;
}

interface AuthContextType {
  user: User | null;
  role: UserRole | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ role: UserRole }>;
  register: (
    firstName: string,
    lastName: string,
    email: string,
    phone: string,
    password: string,
    profileImage?: File | null,
  ) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};

const getRoleFromFirestore = async (user: User): Promise<UserRole> => {
  const snap = await getDoc(doc(db, "users", user.uid));
  if (snap.exists()) {
    return (snap.data().role as UserRole) || "user";
  }
  return "user";
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);

  // Ref to suppress onAuthStateChanged during registration so the
  // PublicRoute guard doesn't redirect away before we finish checking
  // for duplicate names.
  const registrationInProgressRef = useRef(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      // Skip state updates while registration is in progress
      if (registrationInProgressRef.current) return;

      if (currentUser) {
        setUser(currentUser);
        const userRole = await getRoleFromFirestore(currentUser);
        setRole(userRole);
      } else {
        setUser(null);
        setRole(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // ── LOGIN ──────────────────────────────────────────────────────────────────
  const login = async (
    email: string,
    password: string,
  ): Promise<{ role: UserRole }> => {
    try {
      const { user: loggedUser } = await signInWithEmailAndPassword(
        auth,
        email,
        password,
      );

      const userDoc = await getDoc(doc(db, "users", loggedUser.uid));
      if (userDoc.exists() && userDoc.data()?.isBlocked) {
        await firebaseSignOut(auth);
        toast.error("Your account has been blocked. Please contact support.");
        throw new Error("Account blocked");
      }

      const userRole = await getRoleFromFirestore(loggedUser);
      setRole(userRole);
      toast.success("Login successful");

      // 🔥 LOG AUDIT: log in 
      const role = await getRoleFromFirestore(loggedUser);
      const actor = buildActor(loggedUser, role);
      if (role === "admin" || role === "superAdmin") {
        auditLogger.adminLogin(actor);
      } else {
        auditLogger.login(actor);
      }
      return { role: userRole };
      // NOTE: FCM token registration happens automatically via the useFCM()
      // hook once the user state updates and the hook re-runs.
    } catch (error: any) {
      if (error.message === "Account blocked") throw error;
      const messages: Record<string, string> = {
        "auth/invalid-credential": "Invalid email or password.",
        "auth/wrong-password": "Invalid email or password.",
        "auth/user-not-found": "No account found with this email.",
        "auth/invalid-email": "Please enter a valid email address.",
        "auth/user-disabled": "This account has been Blocked.",
        "auth/too-many-requests":
          "Too many failed attempts. Please try again later.",
        "auth/network-request-failed": "Network error. Check your connection.",
      };
      toast.error(messages[error.code] || "Login failed. Please try again.");
      throw error;
    }
  };

  // ── REGISTER ───────────────────────────────────────────────────────────────
  const register = async (
    firstName: string,
    lastName: string,
    email: string,
    phone: string,
    password: string,
    profileImage?: File | null,
  ) => {
    // Block onAuthStateChanged from updating state during registration
    registrationInProgressRef.current = true;
    let newUser: User | null = null;
    try {
      const fullName = `${firstName.trim()} ${lastName.trim()}`;

      // 1) Create the Firebase Auth account first.
      //    This authenticates the user so the Firestore name-check query below
      //    satisfies the security rule: `allow read: if request.auth != null`.
      const credential = await createUserWithEmailAndPassword(
        auth,
        email,
        password,
      );
      newUser = credential.user;

      // 2) Now authenticated — check for duplicate fullName.
      //    The onUserCreated Cloud Function may have already written a partial
      //    doc; we check BEFORE doing any further work.
      const nameQuery = query(
        collection(db, "users"),
        where("fullName", "==", fullName),
      );
      const nameSnap = await getDocs(nameQuery);
      if (!nameSnap.empty) {
        // Duplicate found — roll back: delete the Auth account AND the partial
        // Firestore document that onUserCreated may have already written.
        await deleteDoc(doc(db, "users", newUser.uid));
        await deleteUser(newUser);
        registrationInProgressRef.current = false;
        toast.error("This name is already taken. Please use a different name.");
        throw new Error("duplicate-name");
      }

      // 3) No duplicate — proceed with profile setup
      let photoURL = "";
      if (profileImage) {
        const storageRef = ref(storage, `profileImages/${newUser.uid}`);
        await uploadBytes(storageRef, profileImage);
        photoURL = await getDownloadURL(storageRef);
      }

      await updateProfile(newUser, {
        displayName: fullName,
        ...(photoURL && { photoURL }),
      });

      // 4) Write the full Firestore document.
      //    The onUserCreated Cloud Function may have raced to write a partial
      //    doc; { merge: true } ensures our complete data always wins.
      await setDoc(
        doc(db, "users", newUser.uid),
        {
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          fullName,
          email,
          phone,
          role: "user",
          isBlocked: false,
          verified: false,
          profileImage: photoURL || null,
          fcmTokens: [], // initialise empty — useFCM hook will populate after mount
          totalBids: 0,
          totalWins: 0,
          walletBalance: 0,
          auctionRequests: [],
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          createdBy: newUser.uid,
        },
        { merge: true },
      );

      // 🔥 LOG AUDIT: register
      const actor = buildActor(newUser, "user", fullName);
      auditLogger.register(actor);

      // Registration complete — allow onAuthStateChanged to update state
      registrationInProgressRef.current = false;
      // Manually set the user/role so the app updates immediately
      setUser(newUser);
      setRole("user");

      toast.success("Account created successfully!");
    } catch (error: any) {
      registrationInProgressRef.current = false;
      if (error.message === "duplicate-name") throw error;
      const messages: Record<string, string> = {
        "auth/email-already-in-use":
          "This email is already registered. Please sign in.",
        "auth/weak-password": "Password should be at least 6 characters.",
        "auth/invalid-email": "Please enter a valid email address.",
        "auth/network-request-failed": "Network error. Check your connection.",
        "auth/operation-not-allowed": "Registration is currently disabled.",
      };
      toast.error(
        messages[error.code] || "Registration failed. Please try again.",
      );
      throw error;
    }
  };

  // ── LOGOUT ─────────────────────────────────────────────────────────────────
  const logout = async () => {
    try {
      // Remove this tab's FCM token before signing out.
      // unregisterFCMToken() reads from sessionStorage (written by useFCM on login)
      // so it always removes the correct token — not a freshly-generated one.
      if (user) {
        await unregisterFCMToken(user.uid);
      }

      // 🔥 LOG AUDIT: logout 
      if (user && role) {
        const actor = buildActor(user, role ?? "user");
        auditLogger.logout(actor);
      }

      await firebaseSignOut(auth);
      setRole(null);
      toast.success("Logged out successfully");
    } catch (error: any) {
      toast.error("Logout failed. Please try again.");
      throw error;
    }
  };

  // ── RESET PASSWORD ─────────────────────────────────────────────────────────
  const resetPassword = async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email);
      toast.success("Password reset email sent");
       auditLogger.passwordResetRequest(email);
    } catch (error: any) {
      const messages: Record<string, string> = {
        "auth/user-not-found": "No account found with this email address.",
        "auth/invalid-email": "Please enter a valid email address.",
        "auth/network-request-failed": "Network error. Check your connection.",
        "auth/too-many-requests": "Too many requests. Please try again later.",
      };
      toast.error(messages[error.code] || "Failed to send reset email.");
      throw error;
    }
  };

  return (
    <AuthContext.Provider
      value={{ user, role, loading, login, register, logout, resetPassword }}
    >
      {children}
    </AuthContext.Provider>
  );
};
