// src/pages/Admin/Voucher/voucher-data.ts

// ─── Types ────────────────────────────────────────────────────────────────────

// New canonical type names (backward-compat mapper in docToVoucher in the service)
// "join"     → "entry_free"
// "discount" → "final_discount"
export type VoucherType = "entry_free" | "entry_discount" | "final_discount";

// Subcollection: vouchers/{voucherId}/usages/{userId}
// Replaces the old usedBy array — queried via fetchVoucherUsages()
export interface VoucherUsage {
  userId:          string;
  auctionId:       string;
  voucherCode:     string;
  discountApplied: number;
  effectiveFee:    number;
  type:            VoucherType;
  usedAt:          Date;
}

export interface Voucher {
  id:                 string;
  code:               string;
  type:               VoucherType;
  discountAmount:     number | null;  // null for entry_free
  applicableAuctions: string[];       // empty = all auctions
  maxUses:            number;
  usageCount:         number;         // atomic counter — replaces usedBy array
  isActive:           boolean;
  expiryDate:         Date;
  createdAt:          Date;
  createdBy:          string;
  // usedBy[] is REMOVED — use fetchVoucherUsages() to read the subcollection
}

export interface VoucherFormData {
  code:               string;
  type:               VoucherType;
  discountAmount:     string;
  applicableAuctions: string[];
  maxUses:            string;
  isActive:           boolean;
  expiryDate:         string;
}

// ─── Computed helpers ─────────────────────────────────────────────────────────

export function getUsageCount(voucher: Voucher): number {
  return voucher.usageCount;
}

export function isVoucherExpired(voucher: Voucher): boolean {
  return new Date() > voucher.expiryDate;
}

export function getVoucherStatusLabel(
  voucher: Voucher,
): "active" | "expired" | "maxed" | "inactive" {
  if (!voucher.isActive) return "inactive";
  if (isVoucherExpired(voucher)) return "expired";
  if (voucher.usageCount >= voucher.maxUses) return "maxed";
  return "active";
}

export function getVoucherStatusStyle(
  status: "active" | "expired" | "maxed" | "inactive",
) {
  switch (status) {
    case "active":   return { bg: "#DCFCE7", color: "#22C55E" };
    case "expired":  return { bg: "#FEE2E2", color: "#EF4444" };
    case "maxed":    return { bg: "#FEF3C7", color: "#F59E0B" };
    case "inactive": return { bg: "#F1F5F9", color: "#64748B" };
  }
}

// ─── Type display helpers ─────────────────────────────────────────────────────

export function getVoucherTypeLabel(type: VoucherType): string {
  switch (type) {
    case "entry_free":      return "Free Entry";
    case "entry_discount":  return "Entry Fee Discount";
    case "final_discount":  return "Final Price Discount";
  }
}

export function getVoucherTypeStyle(type: VoucherType) {
  switch (type) {
    case "entry_free":     return { bg: "#EFF6FF", color: "#3B82F6" };
    case "entry_discount": return { bg: "#FFF7ED", color: "#EA580C" };
    case "final_discount": return { bg: "#F3E8FF", color: "#7C3AED" };
  }
}

// ─── Discount computation — mirrors Cloud Function logic for UI preview ────────

export function computeEffectiveFee(
  type:           VoucherType,
  originalFee:    number,
  discountAmount: number | null,
): { effectiveFee: number; discountApplied: number } {
  switch (type) {
    case "entry_free":
      return { effectiveFee: 0, discountApplied: originalFee };

    case "entry_discount": {
      const discount  = discountAmount ?? 0;
      const effective = Math.max(0, originalFee - discount);
      return { effectiveFee: effective, discountApplied: originalFee - effective };
    }

    case "final_discount":
      // Entry fee unchanged — discount hits the winning bid at settlement
      return { effectiveFee: originalFee, discountApplied: 0 };
  }
}

// ─── Constants ────────────────────────────────────────────────────────────────

export const DEFAULT_VOUCHER_FORM: VoucherFormData = {
  code:               "",
  type:               "entry_free",
  discountAmount:     "",
  applicableAuctions: [],
  maxUses:            "",
  isActive:           true,
  expiryDate:         "",
};

export function toDatetimeLocal(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}