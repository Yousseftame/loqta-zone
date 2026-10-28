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
  sendEmailVerification,
  reload,
} from "firebase/auth";
import toast from "react-hot-toast";
import app, { auth, db, storage, functions } from "@/firebase/firebase";
import { doc, setDoc, getDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { httpsCallable } from "firebase/functions";
import { unregisterFCMToken } from "@/hooks/useFCM";
import { auditLogger, buildActor } from "@/service/audit/auditLogger";
import {
  ensureMyPublicProfile,
  isFullNameTaken,
} from "@/service/users/publicProfileService";

async function syncVerifiedViaCloudFunction(): Promise<void> {
  try {
    const fn = httpsCallable(functions, "syncEmailVerified");
    await fn({});
  } catch (err) {
    console.warn("[Auth] syncEmailVerified failed:", err);
  }
}

export type UserRole = "user" | "admin" | "superAdmin";

export interface AppUser extends User {
  role?: UserRole;
}

interface AuthContextType {
  user: User | null;
  role: UserRole | null;
  loading: boolean;
  /** True when a Firebase user exists but has not yet verified their email. */
  emailVerificationPending: boolean;
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
  sendVerificationEmail: () => Promise<void>;
  checkEmailVerified: () => Promise<boolean>;
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
  const [emailVerificationPending, setEmailVerificationPending] = useState(false);

  // Ref to suppress onAuthStateChanged during registration so the
  // PublicRoute guard doesn't redirect away before we finish checking
  // for duplicate names.
  const registrationInProgressRef = useRef(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      // Skip state updates while registration is in progress
      if (registrationInProgressRef.current) return;

      if (currentUser) {
        try {
          // Read the Firestore doc once — extract both role and verified field
          const snap = await getDoc(doc(db, "users", currentUser.uid));
          const data = snap.exists() ? snap.data() : {};
          const userRole = (data.role as UserRole) || "user";
          const firestoreVerified = data.verified === true;

          // Non-user roles (admin, superAdmin) bypass the email-verification gate.
          // Regular users must have emailVerified=true OR Firestore verified=true.
          if (userRole !== "user" || currentUser.emailVerified || firestoreVerified) {
            setUser(currentUser);
            setRole(userRole);
            setEmailVerificationPending(false);
            void ensureMyPublicProfile();
          } else {
            // Unverified regular user:
            // Keep the Firebase session alive (auth.currentUser stays set so the
            // /verify-email page can send emails), but do NOT expose the user to
            // the rest of the app. The VerificationGuard will redirect any route.
            setUser(null);
            setRole(null);
            setEmailVerificationPending(true);
          }
        } catch (err) {
          console.error("[Auth] Failed to load user profile:", err);
          // Still expose the Firebase session so the user isn't locked out.
          setUser(currentUser);
          setRole("user");
          setEmailVerificationPending(false);
        }
      } else {
        setUser(null);
        setRole(null);
        setEmailVerificationPending(false);
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

      // ── Verification gate ──────────────────────────────────────────────────
      // Reload the Firebase user to get the most up-to-date emailVerified flag.
      await reload(loggedUser);
      const freshUser = auth.currentUser!;

      if (!freshUser.emailVerified) {
        // Check if Firestore already has verified=true (edge case: admin override)
        const firestoreVerified = userDoc.exists() && userDoc.data()?.verified === true;
        if (!firestoreVerified) {
          // Keep the user signed in so the verify-email page can send emails,
          // but throw a special error so useLogin redirects to /verify-email
          throw new Error("email-not-verified");
        }
      } else {
        // Firebase auth says verified — sync Firestore via Cloud Function only
        if (userDoc.exists() && userDoc.data()?.verified !== true) {
          await syncVerifiedViaCloudFunction();
        }
      }
      // ── End verification gate ──────────────────────────────────────────────

      const userRole = await getRoleFromFirestore(loggedUser);
      setRole(userRole);
      void ensureMyPublicProfile();
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
      if (error.message === "email-not-verified") throw error;
      const messages: Record<string, string> = {
        "auth/invalid-credential": "Invalid email or password.",
        "auth/wrong-password": "Invalid email or password.",
        "auth/user-not-found": "No account found with this email.",
        "auth/invalid-email": "Please enter a valid email address.",
        "auth/user-disabled": "This account has been Blocked.",
        "auth/too-many-requests":
          "Too many failed attempts. Please try again later.",
        "auth/network-request-failed": "Network error. Check your connection.",
        "permission-denied":
          "Could not verify your account. Please try again in a moment.",
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

      // 2) Check duplicate fullName via publicProfiles (no access to private user docs).
      if (await isFullNameTaken(fullName)) {
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

      // 5) Send email verification via Firebase Auth.
      //    Wrapped in its own try-catch: by this point the account + Firestore
      //    doc are already created, so a transient email-send failure should NOT
      //    surface as "Registration failed". The user can resend from /verify-email.
      try {
        await sendEmailVerification(newUser);
      } catch {
        // Non-fatal: page has a Resend button
      }

      // 🔥 LOG AUDIT: register
      const actor = buildActor(newUser, "user", fullName);
      auditLogger.register(actor);

      // Registration complete — allow onAuthStateChanged to update state
      registrationInProgressRef.current = false;
      // NOTE: we deliberately do NOT call setUser here so that the
      // PublicRoute/ProtectedRoute guards don't redirect the user away
      // from the verify-email page. auth.currentUser is still set so
      // the verify-email page can access the user's email and resend.
      setRole(null);
      // Signal the VerificationGuard to block access to the rest of the app
      setEmailVerificationPending(true);

      toast.success("Account created! Please check your email to verify.");
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

  // ── SEND VERIFICATION EMAIL ────────────────────────────────────────────────
  const sendVerificationEmail = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      toast.error("No user session found. Please register again.");
      throw new Error("no-user");
    }
    try {
      await sendEmailVerification(currentUser);
      toast.success("Verification email sent! Check your inbox.");
    } catch (error: any) {
      const messages: Record<string, string> = {
        "auth/too-many-requests": "Too many requests. Please wait before resending.",
        "auth/network-request-failed": "Network error. Check your connection.",
      };
      toast.error(messages[error.code] || "Failed to send verification email.");
      throw error;
    }
  };

  // ── CHECK EMAIL VERIFIED ───────────────────────────────────────────────────
  // Reloads the Firebase user and, if verified, syncs Firestore + app state.
  const checkEmailVerified = async (): Promise<boolean> => {
    const currentUser = auth.currentUser;
    if (!currentUser) return false;
    await reload(currentUser);
    const fresh = auth.currentUser!;
    if (fresh.emailVerified) {
      await syncVerifiedViaCloudFunction();
      // Lift the verification gate and admit the user into the app
      setEmailVerificationPending(false);
      setUser(fresh);
      const userRole = await getRoleFromFirestore(fresh);
      setRole(userRole);
      return true;
    }
    return false;
  };

  return (
    <AuthContext.Provider
      value={{ user, role, loading, emailVerificationPending, login, register, logout, resetPassword, sendVerificationEmail, checkEmailVerified }}
    >
      {children}
    </AuthContext.Provider>
  );
};
