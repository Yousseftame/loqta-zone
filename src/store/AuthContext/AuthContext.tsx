/**
 * src/store/AuthContext/AuthContext.tsx
 *
 * Change vs original: logout() now calls removeCurrentDeviceToken()
 * before signing out so the FCM token is pruned from Firestore.
 *
 * Only the logout function is modified — everything else is identical.
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
} from "firebase/auth";
import { getMessaging, getToken, deleteToken } from "firebase/messaging";
import toast from "react-hot-toast";
import app, { auth, db, storage } from "@/firebase/firebase";
import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  arrayRemove,
  serverTimestamp,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

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

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY as string;

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

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
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
      return { role: userRole };
    } catch (error: any) {
      if (error.message === "Account blocked") throw error;
      const messages: Record<string, string> = {
        "auth/invalid-credential": "Invalid email or password.",
        "auth/wrong-password": "Invalid email or password.",
        "auth/user-not-found": "No account found with this email.",
        "auth/invalid-email": "Please enter a valid email address.",
        "auth/user-disabled": "This account has been disabled.",
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
    try {
      const { user: newUser } = await createUserWithEmailAndPassword(
        auth,
        email,
        password,
      );

      let photoURL = "";
      if (profileImage) {
        const storageRef = ref(storage, `profileImages/${newUser.uid}`);
        await uploadBytes(storageRef, profileImage);
        photoURL = await getDownloadURL(storageRef);
      }

      await updateProfile(newUser, {
        displayName: `${firstName} ${lastName}`,
        ...(photoURL && { photoURL }),
      });

      await setDoc(doc(db, "users", newUser.uid), {
        firstName,
        lastName,
        fullName: `${firstName} ${lastName}`,
        email,
        phone,
        role: "user",
        isBlocked: false,
        verified: false,
        profileImage: photoURL || null,
        fcmTokens: [], // ← initialise empty token array
        totalBids: 0,
        totalWins: 0,
        walletBalance: 0,
        auctionRequests: [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: newUser.uid,
      });

      toast.success("Account created successfully!");
    } catch (error: any) {
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
      // Remove this device's FCM token before signing out
      if (user) {
        try {
          const msg = getMessaging(app);
          const token = await getToken(msg, { vapidKey: VAPID_KEY });
          if (token) {
            await deleteToken(msg);
            await updateDoc(doc(db, "users", user.uid), {
              fcmTokens: arrayRemove(token),
            });
          }
        } catch (fcmErr) {
          // Non-fatal — proceed with logout even if token removal fails
          console.warn("[FCM] Token removal on logout failed:", fcmErr);
        }
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
      {!loading && children}
    </AuthContext.Provider>
  );
};
