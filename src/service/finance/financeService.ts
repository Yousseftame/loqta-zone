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
 *   Edit (paidAmount delta)      → expense (positive delta) or income/refund (negative)
 *   Delete purchase              → income/refund for total paidAmount
 */

import {
  collection,
  doc,
  getDoc,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/firebase/firebase";
import type { PaymentMethod } from "@/pages/Admin/Finance/finance-data";

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

  await addDoc(collection(db, "transactions"), {
    type:          "expense",
    amount:        payload.amount,
    method:        payload.method,
    category:      "products",
    note:          payload.note.trim(),
    purchaseId:    payload.purchaseId,
    createdAt:     serverTimestamp(),
    createdBy:     payload.adminUid,
    createdByName: payload.adminName,
  });
}

// ─── Reversal logger ──────────────────────────────────────────────────────────

/**
 * Log a purchase-payment reversal (income/refund) to the `transactions` collection.
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
}): Promise<void> {
  if (payload.amount <= 0) return;

  await addDoc(collection(db, "transactions"), {
    type:          "income",
    amount:        payload.amount,
    method:        payload.method,
    category:      "refund_received",
    note:          payload.note.trim(),
    purchaseId:    payload.purchaseId,
    createdAt:     serverTimestamp(),
    createdBy:     payload.adminUid,
    createdByName: payload.adminName,
  });
}
