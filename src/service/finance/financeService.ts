/**
 * src/service/finance/financeService.ts
 *
 * Pure Firestore helpers for the finance/transactions collection.
 * This module has NO React dependencies — it can safely be called from
 * any service layer (purchaseService, etc.) without breaking hook rules.
 *
 * The Cloud Function trigger (onTransactionCreated / onTransactionDeleted)
 * handles updating finance_stats/dashboard automatically.
 *
 * ─── Purchase → Finance mapping ──────────────────────────────────────────────
 *   Cash purchase (fully paid)   → 1 expense for totalCost
 *   Partial purchase (paid now)  → 1 expense for paidAmount
 *   Credit purchase (0 paid)     → no expense (no cash left the business)
 *   Record payment               → 1 expense for effectiveAmount
 *   Mark as fully paid           → 1 expense for remainingAmount (final tranche)
 *   Edit (paidAmount delta)      → expense (positive delta) or negative expense (negative)
 *   Delete purchase              → negative expense rows (same category as purchase) so
 *                                  totalExpenses / products roll back with cash/bank.
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  orderBy,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/firebase/firebase";
import type { PaymentMethod } from "@/pages/Admin/Finance/finance-data";
import {
  fetchPaymentAccounts,
  getDefaultAccountIdForMethod,
  validateAccountBalance,
} from "@/service/finance/paymentAccounts";
import type { Transaction } from "@/pages/Admin/Finance/finance-data";
import { toDate } from "@/pages/Admin/Finance/finance-data";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PurchaseExpensePayload {
  /** Amount in EGP that physically left the business right now */
  amount: number;
  /** Which wallet was used */
  method: PaymentMethod;
  /** Human-readable note shown in the finance transaction list */
  note: string;
  /** UID of the admin performing the action */
  adminUid: string;
  /** Display name of the admin */
  adminName: string;
  /** Purchase document ID — stored for cross-referencing */
  purchaseId: string;
  /** Optional wallet; defaults to the active default account for `method` */
  accountId?: string;
}

async function resolveAccountId(
  method: PaymentMethod,
  explicit?: string,
): Promise<string | undefined> {
  if (explicit) return explicit;
  try {
    const accounts = await fetchPaymentAccounts();
    return getDefaultAccountIdForMethod(accounts, method);
  } catch {
    return undefined;
  }
}

// ─── Balance check ─────────────────────────────────────────────────────────────

/**
 * Read the current cash / bank balances from finance_stats/dashboard.
 * Returns zeroes if the document doesn't exist yet (new project).
 */
export async function getFinanceBalance(): Promise<{
  cashBalance: number;
  bankBalance: number;
}> {
  try {
    const snap = await getDoc(doc(db, "finance_stats", "dashboard"));
    if (!snap.exists()) return { cashBalance: 0, bankBalance: 0 };
    const data = snap.data();
    return {
      cashBalance: Number(data.cashBalance ?? 0),
      bankBalance: Number(data.bankBalance ?? 0),
    };
  } catch {
    // Non-fatal: if stats can't be read, skip the check
    return { cashBalance: Infinity, bankBalance: Infinity };
  }
}

/**
 * Validate that the requested amount does not exceed the available balance
 * for the given payment method. Throws a user-readable Error if insufficient.
 */
export async function assertSufficientBalance(
  amount: number,
  method: PaymentMethod,
): Promise<void> {
  if (amount <= 0) return; // nothing to pay

  const { cashBalance, bankBalance } = await getFinanceBalance();
  const available = method === "bank" ? bankBalance : cashBalance;

  if (amount > available) {
    const methodLabel = method === "bank" ? "Bank" : "Cash";
    throw new Error(
      `Insufficient ${methodLabel} balance. ` +
        `Available: ${available.toLocaleString("en-EG")} EGP — ` +
        `Required: ${amount.toLocaleString("en-EG")} EGP. ` +
        `Please top up your ${methodLabel} balance or choose a different payment method.`,
    );
  }
}

export async function fetchTransactionsForBalance(): Promise<Transaction[]> {
  const q = query(
    collection(db, "transactions"),
    orderBy("createdAt", "desc"),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      type: data.type,
      amount: data.amount ?? 0,
      method: data.method ?? "cash",
      category: data.category ?? "other",
      note: data.note ?? "",
      createdAt: toDate(data.createdAt),
      createdBy: data.createdBy ?? "",
      createdByName: data.createdByName,
      transferTo: data.transferTo,
      accountId: data.accountId,
      transferToAccountId: data.transferToAccountId,
    } as Transaction;
  });
}

/**
 * Pool-level check (finance_stats) plus per-wallet check when accountId is set.
 */
export async function assertSufficientPaymentBalance(
  amount: number,
  method: PaymentMethod,
  accountId?: string,
): Promise<void> {
  await assertSufficientBalance(amount, method);
  if (!accountId || amount <= 0) return;

  const transactions = await fetchTransactionsForBalance();
  const msg = validateAccountBalance(
    accountId,
    amount,
    transactions,
    null,
    ["expense", "owner_withdrawal", "transfer"],
  );
  if (msg) throw new Error(msg);
}

export async function resolvePurchasePayment(
  paymentMethod: PaymentMethod,
  paymentAccountId?: string,
): Promise<{ method: PaymentMethod; accountId?: string }> {
  const accounts = await fetchPaymentAccounts();
  if (paymentAccountId) {
    const acc = accounts.find(
      (a) => a.id === paymentAccountId && a.status === "active",
    );
    if (!acc) {
      throw new Error("Selected payment account is not available.");
    }
    return { method: acc.method, accountId: acc.id };
  }
  const defaultId = getDefaultAccountIdForMethod(accounts, paymentMethod);
  return { method: paymentMethod, accountId: defaultId };
}

// ─── Expense logger ───────────────────────────────────────────────────────────

/**
 * Log a product-purchase expense to the `transactions` collection.
 * Only call this when actual money leaves the business (amount > 0).
 * Silently no-ops if amount <= 0 to keep callers simple.
 */
export async function logPurchaseExpense(
  payload: PurchaseExpensePayload,
): Promise<void> {
  if (payload.amount <= 0) return;

  const accountId = await resolveAccountId(payload.method, payload.accountId);

  await addDoc(collection(db, "transactions"), {
    type:          "expense",
    amount:        payload.amount,
    method:        payload.method,
    category:      "products",
    note:          payload.note.trim(),
    purchaseId:    payload.purchaseId,
    ...(accountId ? { accountId } : {}),
    createdAt:     serverTimestamp(),
    createdBy:     payload.adminUid,
    createdByName: payload.adminName,
  });
}

// ─── Reversal logger ──────────────────────────────────────────────────────────

/**
 * Log a purchase-payment reversal as a **negative expense** (category `products`).
 * The Cloud Function treats income as revenue (totalIncome++) and does not reduce
 * totalExpenses — so reversals must mirror `logPurchaseExpense` with a negative amount
 * to restore cash/bank and expense aggregates together.
 *
 * Used when a purchase is deleted or when an edit reduces the paid amount.
 * Silently no-ops if amount <= 0.
 */
export async function logPurchaseReversal(payload: {
  amount: number;
  method: PaymentMethod;
  note: string;
  adminUid: string;
  adminName: string;
  purchaseId: string;
  accountId?: string;
}): Promise<void> {
  if (payload.amount <= 0) return;

  const accountId = await resolveAccountId(payload.method, payload.accountId);

  await addDoc(collection(db, "transactions"), {
    type:          "expense",
    amount:        -payload.amount,
    method:        payload.method,
    category:      "products",
    note:          payload.note.trim(),
    purchaseId:    payload.purchaseId,
    ...(accountId ? { accountId } : {}),
    createdAt:     serverTimestamp(),
    createdBy:     payload.adminUid,
    createdByName: payload.adminName,
  });
}
