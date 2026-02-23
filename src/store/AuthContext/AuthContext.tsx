import {
  createContext,
  useContext,
  useState,
  useEffect,
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
import toast from "react-hot-toast";
import { auth, db, storage } from "@/firebase/firebase";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
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

/** Fetch role from Firebase custom claims (refreshed token) */
const getRoleFromClaims = async (user: User): Promise<UserRole> => {
  // Force-refresh so we pick up any newly-set custom claims
  const idTokenResult = await user.getIdTokenResult(true);
  return (idTokenResult.claims.role as UserRole) || "user";
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        const userRole = await getRoleFromClaims(currentUser);
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

      // Check isBlocked in Firestore
      const userDoc = await getDoc(doc(db, "users", loggedUser.uid));
      if (userDoc.exists() && userDoc.data()?.isBlocked) {
        await firebaseSignOut(auth);
        toast.error("Your account has been blocked. Please contact support.");
        throw new Error("Account blocked");
      }

      const userRole = await getRoleFromClaims(loggedUser);
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

      // Upload profile image to Firebase Storage if provided
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
