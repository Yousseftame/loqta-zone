// ─── Types ────────────────────────────────────────────────────────────────────

export type UserRole = "user" | "admin" | "superAdmin";

export interface UserAuction {
  auctionId: string;
  amount: number;
  hasPaid: boolean;
  joinedAt: Date;
  paymentId: string;
  totalAmount: number[];
  voucherUsed: boolean;
}

export interface AppUser {
  id: string;
  // Identity
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  phone: string;
  profileImage: string | null;
  // Role & Status
  role: UserRole;
  isBlocked: boolean;
  verified: boolean;
  // Stats
  totalBids: number;
  totalWins: number;
  walletBalance: number;
  // Meta
  fcmTokens: string[];
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  // Admin-only note
  internalNotes: string;
  // Subcollection (loaded on demand)
  auctions?: UserAuction[];
}

export const USER_ROLES: UserRole[] = ["user", "admin", "superAdmin"];

export const getRoleStyle = (role: UserRole) => {
  switch (role) {
    case "superAdmin": return { bg: "#FEF3C7", color: "#D97706", label: "Super Admin" };
    case "admin":      return { bg: "#EFF6FF", color: "#3B82F6", label: "Admin" };
    case "user":       return { bg: "#F1F5F9", color: "#64748B", label: "User" };
  }
};