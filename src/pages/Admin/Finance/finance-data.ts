/**
 * src/pages/Admin/Finance/finance-data.ts
 *
 * Single source of truth for all Finance types.
 *
 * Firestore schema:
 *   transactions/{id}          — every income / expense / owner_withdrawal entry
 *   finance_stats/dashboard    — pre-aggregated totals (Cloud Function only)
 *
 * ─── Accounting identity ─────────────────────────────────────────────────────
 *   totalIncome = cashBalance + bankBalance + ownerBalance + totalExpenses
 *
 * Every dollar earned goes to one of four places:
 *   • Still sitting in cash      → cashBalance
 *   • Still sitting in bank      → bankBalance
 *   • Taken by owner             → ownerBalance  (cumulative withdrawals)
 *   • Spent on business expenses → totalExpenses
 *
 * ─── Owner Withdrawal ────────────────────────────────────────────────────────
 * An owner_withdrawal is money the owner transfers from the business to themselves.
 * It is sourced from cash or bank (specified via `method`), so it REDUCES the
 * cashBalance or bankBalance → automatically reduces availableBalance.
 * It is NOT a business operating expense — it goes into ownerBalance instead.
 *
 * Cloud Function must handle owner_withdrawal transactions to:
 *   - Decrement cashBalance or bankBalance by amount
 *   - Increment ownerBalance by amount
 *   - NOT touch totalExpenses (owner draws are not expenses)
 *   - NOT touch totalIncome
 *
 * Dashboard reads: 2 documents total (finance_stats/dashboard + last 20 transactions)
 */

// ─── Enums ─────────────────────────────────────────────────────────────────

export type TransactionType     = "income" | "expense" | "owner_withdrawal";
export type PaymentMethod       = "cash" | "bank";
export type ExpenseCategory     = "ads" | "salary" | "products" | "maintenance" | "equipment" | "utilities" | "rent" | "other";
export type IncomeCategory      = "auction_revenue" | "registration_fee" | "sponsorship" | "refund_received" | "other";
export type OwnerCategory       = "owner_draw";
export type TransactionCategory = ExpenseCategory | IncomeCategory | OwnerCategory;

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
};

export const MONTH_LABELS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

import { Timestamp } from "firebase/firestore";
export function toDate(v: any): Date | null {
  if (!v) return null;
  if (v instanceof Timestamp) return v.toDate();
  if (v instanceof Date) return v;
  return new Date(v);
}