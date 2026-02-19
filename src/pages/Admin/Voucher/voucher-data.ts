// ─── Types ────────────────────────────────────────────────────────────────────

export type VoucherType = "join" | "discount";

export interface UsedByEntry {
  userId: string;
  userName: string;
  usedAt: Date;
}

export interface Voucher {
  id: string;
  code: string;
  type: VoucherType;
  discountAmount: number | null; // only when type === "discount"
  applicableProducts: string[];  // array of product IDs
  maxUses: number;
  usedBy: UsedByEntry[];
  isActive: boolean;
  expiryDate: Date;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export interface VoucherFormData {
  code: string;
  type: VoucherType;
  discountAmount: string;        // only relevant when type === "discount"
  applicableProducts: string[];  // product IDs
  maxUses: string;
  isActive: boolean;
  expiryDate: string;            // ISO string from datetime-local input
}

// ─── Computed helpers ─────────────────────────────────────────────────────────

export function getUsageCount(voucher: Voucher): number {
  return voucher.usedBy.length;
}

export function isVoucherExpired(voucher: Voucher): boolean {
  return new Date() > voucher.expiryDate;
}

export function getVoucherStatusLabel(voucher: Voucher): "active" | "expired" | "maxed" | "inactive" {
  if (!voucher.isActive) return "inactive";
  if (isVoucherExpired(voucher)) return "expired";
  if (getUsageCount(voucher) >= voucher.maxUses) return "maxed";
  return "active";
}

export function getVoucherStatusStyle(status: "active" | "expired" | "maxed" | "inactive") {
  switch (status) {
    case "active":   return { bg: "#DCFCE7", color: "#22C55E" };
    case "expired":  return { bg: "#FEE2E2", color: "#EF4444" };
    case "maxed":    return { bg: "#FEF3C7", color: "#F59E0B" };
    case "inactive": return { bg: "#F1F5F9", color: "#64748B" };
  }
}

// ─── Constants ────────────────────────────────────────────────────────────────

export const DEFAULT_VOUCHER_FORM: VoucherFormData = {
  code: "",
  type: "join",
  discountAmount: "",
  applicableProducts: [],
  maxUses: "",
  isActive: true,
  expiryDate: "",
};

// ─── Format datetime-local ───────────────────────────────────────────────────

export function toDatetimeLocal(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}