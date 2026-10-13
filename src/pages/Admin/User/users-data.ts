// ─── Types ────────────────────────────────────────────────────────────────────

export type UserRole = "user" | "admin" | "superAdmin";

/** Lucky spin win stored on users/{uid}/auctions/{auctionId}.luckySpin */
export interface UserAuctionLuckySpin {
  prizeId: string;
  percent: number;
  isFree: boolean;
  label: string;
  claimedAt: Date;
  status: "available" | "redeemed";
  redeemedOnAuctionId: string | null;
}

export interface UserAuction {
  auctionId: string;
  amount: number;
  hasPaid: boolean;
  joinedAt: Date;
  paymentId: string;
  totalAmount: number[];
  // Voucher fields — written by applyVoucher CF; null / 0 when no voucher used
  voucherUsed: boolean;
  voucherCode: string | null;
  voucherId: string | null;
  discountApplied: number;
  // Lucky spin consolation prize for this auction (null if not spun / winner)
  luckySpin: UserAuctionLuckySpin | null;
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
  // RBAC permissions — only present on role="admin" docs, null for users/superAdmins
  permissions?: import("@/permissions/permissions-data").AdminPermissions | null;
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