/**
 * src/pages/Admin/Purchases/purchases-data.ts
 *
 * Types and constants for the Purchase Orders module.
 *
 * ─── Payment Model ────────────────────────────────────────────────────────────
 *
 * paymentType:
 *   "cash"    — Paid in full at purchase time. paidAmount = totalCost, remainingAmount = 0.
 *   "credit"  — Nothing paid at purchase time. Supplier will be paid later.
 *               paidAmount = 0, remainingAmount = totalCost.
 *   "partial" — A deposit/down-payment was made. Remainder owed to supplier.
 *               paidAmount > 0, remainingAmount = totalCost - paidAmount.
 *
 * paymentStatus (derived + stored — source of truth on the doc):
 *   "unpaid"   — credit purchase, nothing paid yet.
 *   "partial"  — partial purchase with remaining balance > 0.
 *   "paid"     — fully paid (cash or after settling a credit/partial).
 *   "overdue"  — remainingAmount > 0 AND dueDate has passed.
 *
 * dueDate:
 *   Only relevant for credit and partial purchases. null for cash.
 *   Stored as Firestore Timestamp on the doc, passed as ISO date string in the form.
 *
 * ─── Invariants the service enforces ─────────────────────────────────────────
 *   paidAmount + remainingAmount === totalCost (always)
 *   cash:    paidAmount === totalCost, remainingAmount === 0, dueDate === null
 *   credit:  paidAmount === 0,         remainingAmount === totalCost
 *   partial: 0 < paidAmount < totalCost, remainingAmount = totalCost - paidAmount
 *
 * ─── Payment Recordings ───────────────────────────────────────────────────────
 *   Payments against an existing credit/partial purchase are recorded via
 *   PurchasePayment documents in the `purchasePayments` subcollection.
 *   Each payment increments paidAmount and decrements remainingAmount on the
 *   parent purchase doc atomically. This gives a full audit trail.
 */

export type PurchaseStatus = "pending" | "received" | "cancelled";
export type PaymentType    = "cash" | "credit" | "partial";
export type PaymentStatus  = "unpaid" | "partial" | "paid" | "overdue";

// ─── Purchase Payment (subcollection doc) ─────────────────────────────────────
// Stored at: purchases/{purchaseId}/purchasePayments/{paymentId}

export interface PurchasePayment {
  id: string;
  amount: number;
  method: "cash" | "bank";
  note: string;
  paidAt: Date;
  recordedBy: string;       // admin uid
  recordedByName: string;   // admin display name (denormalized)
  createdAt: Date;
}

// ─── Main Purchase document ───────────────────────────────────────────────────

export interface Purchase {
  id: string;
  supplierId: string;
  supplierName: string;          // denormalized
  productId: string;
  productTitle: string;          // denormalized (EN)
  quantity: number;
  unitCost: number;
  totalCost: number;             // quantity × unitCost — always

  // ── Payment fields ──────────────────────────────────────────────────────────
  paymentType: PaymentType;      // cash | credit | partial
  paymentStatus: PaymentStatus;  // unpaid | partial | paid | overdue
  paidAmount: number;            // amount paid so far
  remainingAmount: number;       // totalCost - paidAmount
  dueDate: Date | null;          // null for cash purchases
  /** Cash/bank used for money paid at create time (no purchasePayments row yet) */
  initialPayMethod?: "cash" | "bank";

  // ── Purchase status ─────────────────────────────────────────────────────────
  status: PurchaseStatus;
  notes: string;
  purchaseDate: Date;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

// ─── Form data (all strings for controlled inputs) ────────────────────────────

export interface PurchaseFormData {
  supplierId: string;
  productId: string;
  quantity: string;
  unitCost: string;
  status: PurchaseStatus;
  notes: string;
  purchaseDate: string;    // "YYYY-MM-DD"

  // Payment fields
  paymentType: PaymentType;
  paidAmount: string;      // empty string = 0 for credit; ignored for cash
  dueDate: string;         // "YYYY-MM-DD" or "" for cash
  /** Which wallet (cash / bank) the initial payment comes from */
  paymentMethod: "cash" | "bank";
  /** Named payment account (preferred over paymentMethod when set) */
  paymentAccountId: string;
}

// ─── Record payment form ──────────────────────────────────────────────────────

export interface RecordPaymentFormData {
  amount: string;
  method: "cash" | "bank";
  paymentAccountId: string;
  note: string;
  paidAt: string;          // "YYYY-MM-DD"
}

// ─── Defaults ─────────────────────────────────────────────────────────────────

export const DEFAULT_PURCHASE_FORM: PurchaseFormData = {
  supplierId:   "",
  productId:    "",
  quantity:     "",
  unitCost:     "",
  status:       "pending",
  notes:        "",
  purchaseDate: new Date().toISOString().split("T")[0],
  paymentType:   "cash",
  paidAmount:    "",
  dueDate:       "",
  paymentMethod: "cash",
  paymentAccountId: "",
};

export const DEFAULT_RECORD_PAYMENT_FORM: RecordPaymentFormData = {
  amount: "",
  method: "cash",
  paymentAccountId: "",
  note:   "",
  paidAt: new Date().toISOString().split("T")[0],
};

// ─── Status configs ───────────────────────────────────────────────────────────

export const STATUS_CONFIG: Record<
  PurchaseStatus,
  { label: string; bg: string; color: string; border: string; emoji: string }
> = {
  pending:   { label: "Pending",   bg: "#FEF3C7", color: "#92400E", border: "#FCD34D", emoji: "⏳" },
  received:  { label: "Received",  bg: "#DCFCE7", color: "#14532D", border: "#86EFAC", emoji: "✅" },
  cancelled: { label: "Cancelled", bg: "#FEE2E2", color: "#7F1D1D", border: "#FCA5A5", emoji: "❌" },
};

export const PAYMENT_TYPE_CONFIG: Record<
  PaymentType,
  { label: string; bg: string; color: string; border: string; icon: string; description: string }
> = {
  cash: {
    label: "Cash",
    bg: "#DCFCE7", color: "#14532D", border: "#86EFAC", icon: "💵",
    description: "Paid in full at time of purchase",
  },
  credit: {
    label: "Credit",
    bg: "#FEF3C7", color: "#92400E", border: "#FCD34D", icon: "📋",
    description: "Full amount to be paid later (supplier credit)",
  },
  partial: {
    label: "Partial",
    bg: "#DBEAFE", color: "#1E40AF", border: "#93C5FD", icon: "💳",
    description: "Down payment now, remainder owed later",
  },
};

export const PAYMENT_STATUS_CONFIG: Record<
  PaymentStatus,
  { label: string; bg: string; color: string; border: string; dot: string; emoji: string }
> = {
  unpaid:  { label: "Unpaid",  bg: "#FEE2E2", color: "#7F1D1D", border: "#FCA5A5", dot: "#EF4444", emoji: "🔴" },
  partial: { label: "Partial", bg: "#DBEAFE", color: "#1E40AF", border: "#93C5FD", dot: "#3B82F6", emoji: "🔵" },
  paid:    { label: "Paid",    bg: "#DCFCE7", color: "#14532D", border: "#86EFAC", dot: "#22C55E", emoji: "🟢" },
  overdue: { label: "Overdue", bg: "#FFF7ED", color: "#7C2D12", border: "#FED7AA", dot: "#F97316", emoji: "🟠" },
};

// ─── Pure helper: derive paymentStatus from purchase fields ───────────────────
// Used both in the service (writes) and in the UI (display).
// Rules:
//   - If fully paid → "paid"  (terminal, always wins)
//   - If past due date and still owes money → "overdue"
//   - If credit with nothing paid → "unpaid"
//   - If partial (some paid, some remaining) → "partial"

export function derivePaymentStatus(
  paymentType: PaymentType,
  paidAmount: number,
  totalCost: number,
  dueDate: Date | null,
): PaymentStatus {
  // Fully paid — terminal state, no further checks needed
  if (paidAmount >= totalCost) return "paid";

  // Past due and still owes → overdue (applies to both credit and partial)
  if (dueDate && new Date() > dueDate) return "overdue";

  // Credit: nothing paid yet, not overdue
  if (paymentType === "credit") return "unpaid";

  // Partial: some paid, some remaining, not overdue
  return "partial";
}

// ─── Pure helper: derive paidAmount from form fields ─────────────────────────
//   cash    → totalCost (fully paid immediately)
//   credit  → 0         (nothing paid yet)
//   partial → parsed value from form, clamped 0..totalCost

export function derivePaidAmount(
  paymentType: PaymentType,
  paidAmountStr: string,
  totalCost: number,
): number {
  if (paymentType === "cash")   return totalCost;
  if (paymentType === "credit") return 0;
  // partial
  const v = parseFloat(paidAmountStr);
  if (isNaN(v) || v < 0) return 0;
  return Math.min(v, totalCost);
}