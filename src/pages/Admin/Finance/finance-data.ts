/**
 * src/pages/Admin/Finance/finance-data.ts
 *
 * Single source of truth for all Finance types.
 *
 * Firestore schema:
 *   transactions/{id}          — every income / expense / owner_withdrawal / transfer entry
 *   finance_stats/dashboard    — pre-aggregated totals (Cloud Function only)
 *
 * ─── Accounting identity ─────────────────────────────────────────────────────
 *   totalIncome = cashBalance + bankBalance + ownerBalance + totalExpenses
 *
 * ─── Transfer ────────────────────────────────────────────────────────────────
 * A transfer moves money between cash and bank (or bank and cash).
 * It does NOT change totalIncome, totalExpenses, ownerBalance, or any monthly arrays.
 * It simply decrements the source balance and increments the destination balance.
 * The `method` field = source ("cash" | "bank"), and `transferTo` field = destination.
 * Net effect on available balance = zero.
 */

// ─── Enums ─────────────────────────────────────────────────────────────────

export type TransactionType     = "income" | "expense" | "owner_withdrawal" | "transfer";
export type PaymentMethod       = "cash" | "bank";
export type ExpenseCategory     = "ads" | "salary" | "products" | "maintenance" | "equipment" | "utilities" | "rent" | "other";
export type IncomeCategory      = "auction_revenue" | "registration_fee" | "sponsorship" | "refund_received" | "other";
export type OwnerCategory       = "owner_draw";
export type TransferCategory    = "cash_to_bank" | "bank_to_cash";
export type TransactionCategory = ExpenseCategory | IncomeCategory | OwnerCategory | TransferCategory;

// ─── Transaction document ───────────────────────────────────────────────────

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  method: PaymentMethod;
  category: TransactionCategory;
  note: string;
  createdAt: Date | null;
  createdBy: string;
  createdByName?: string;
  /** Only present for type="transfer" — the destination balance */
  transferTo?: PaymentMethod;
}

// ─── finance_stats/dashboard ────────────────────────────────────────────────

export interface FinanceStats {
  totalIncome: number;
  totalExpenses: number;
  ownerBalance: number;       // cumulative owner withdrawals
  cashBalance: number;
  bankBalance: number;
  monthlyIncome:   number[];  // index 0=Jan … 11=Dec, current year
  monthlyExpenses: number[];
  expensesByCategory: Record<string, number>;
  updatedAt: Date | null;
}

// ─── Form input ─────────────────────────────────────────────────────────────

export interface TransactionFormValues {
  type: TransactionType;
  amount: string;
  method: PaymentMethod;
  category: TransactionCategory;
  note: string;
  /** Only used when type="transfer" */
  transferTo?: PaymentMethod;
}

// ─── Defaults ───────────────────────────────────────────────────────────────

export const DEFAULT_FINANCE_STATS: FinanceStats = {
  totalIncome: 0,
  totalExpenses: 0,
  ownerBalance: 0,
  cashBalance: 0,
  bankBalance: 0,
  monthlyIncome:   Array(12).fill(0),
  monthlyExpenses: Array(12).fill(0),
  expensesByCategory: {},
  updatedAt: null,
};

// ─── Label maps ─────────────────────────────────────────────────────────────

export const EXPENSE_CATEGORIES: { value: ExpenseCategory; label: string }[] = [
  { value: "ads",         label: "Advertising" },
  { value: "products",    label: "Products" },
  { value: "salary",      label: "Salary" },
  { value: "maintenance", label: "Maintenance" },
  { value: "equipment",   label: "Equipment" },
  { value: "utilities",   label: "Utilities" },
  { value: "rent",        label: "Rent" },
  { value: "other",       label: "Other" },
];

export const INCOME_CATEGORIES: { value: IncomeCategory; label: string }[] = [
  { value: "auction_revenue",  label: "Auction Revenue" },
  { value: "registration_fee", label: "Registration Fee" },
  { value: "sponsorship",      label: "Sponsorship" },
  { value: "other",            label: "Other" },
];

export const OWNER_CATEGORIES: { value: OwnerCategory; label: string }[] = [
  { value: "owner_draw", label: "Owner Draw" },
];

export const TRANSFER_CATEGORIES: { value: TransferCategory; label: string }[] = [
  { value: "cash_to_bank", label: "Cash → Bank" },
  { value: "bank_to_cash", label: "Bank → Cash" },
];

export const CATEGORY_LABEL: Record<string, string> = {
  ads:               "Advertising",
  salary:            "Salary",
  products:          "Products",
  maintenance:       "Maintenance",
  equipment:         "Equipment",
  utilities:         "Utilities",
  rent:              "Rent",
  auction_revenue:   "Auction Revenue",
  registration_fee:  "Registration Fee",
  sponsorship:       "Sponsorship",
  other:             "Other",
  owner_draw:        "Owner Draw",
  cash_to_bank:      "Cash → Bank",
  bank_to_cash:      "Bank → Cash",
};

export const MONTH_LABELS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

import { Timestamp } from "firebase/firestore";
export function toDate(v: any): Date | null {
  if (!v) return null;
  if (v instanceof Timestamp) return v.toDate();
  if (v instanceof Date) return v;
  return new Date(v);
}