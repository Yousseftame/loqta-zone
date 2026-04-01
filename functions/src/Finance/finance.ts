/**
 * functions/src/Finance/finance.ts
 *
 * Cloud Functions for the Finance module.
 *
 * ─── Architecture ────────────────────────────────────────────────────────────
 * transactions/{id}        — raw transaction documents
 * finance_stats/dashboard  — single aggregated document updated by trigger
 *
 * ─── Functions ───────────────────────────────────────────────────────────────
 * 1. onTransactionCreated  — updates finance_stats/dashboard on every new tx
 * 2. onTransactionDeleted  — reverses the aggregation when a tx is deleted
 * 3. rebuildFinanceStats   — HTTP callable, full rebuild from scratch (superAdmin)
 *
 * ─── Transaction types handled ───────────────────────────────────────────────
 * "income"           → totalIncome++, monthlyIncome[m]++, cash/bankBalance++
 * "expense"          → totalExpenses++, monthlyExpenses[m]++, expensesByCategory++,
 *                       cash/bankBalance--
 * "owner_withdrawal" → ownerBalance++, cash/bankBalance--
 *                       Does NOT touch totalIncome or totalExpenses.
 *                       Does NOT appear in monthlyIncome or monthlyExpenses.
 *
 * ─── Accounting identity ─────────────────────────────────────────────────────
 *   totalIncome = cashBalance + bankBalance + ownerBalance + totalExpenses
 *
 * ─── Safety ──────────────────────────────────────────────────────────────────
 * All balance/total updates use FieldValue.increment() — atomic, no race conditions.
 * Monthly buckets use dot-notation keys (e.g. "monthlyIncome.3") so only
 * the relevant month is touched, not the whole array.
 */

import { onDocumentCreated, onDocumentDeleted } from "firebase-functions/v2/firestore";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

const db    = getFirestore();
const STATS = () => db.collection("finance_stats").doc("dashboard");

// ─── Helper: resolve month index from Firestore Timestamp ────────────────────

function monthIndex(data: Record<string, any>): number {
  const ts = data.createdAt;
  if (!ts) return new Date().getMonth();
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.getMonth(); // 0 = Jan … 11 = Dec
}

// ─── Helper: build atomic increment update for one transaction ───────────────
//
// sign: +1 = apply transaction, -1 = reverse transaction (for delete trigger)
//
// owner_withdrawal:
//   - Increments ownerBalance by amount (or decrements on delete)
//   - Decrements cashBalance or bankBalance (or increments on delete)
//   - Does NOT touch totalIncome, totalExpenses, or monthly arrays

function buildUpdate(
  type:     "income" | "expense" | "owner_withdrawal",
  method:   "cash" | "bank",
  category: string,
  amount:   number,
  month:    number,
  sign:     1 | -1,
): Record<string, any> {
  const amt = amount * sign;
  const update: Record<string, any> = {
    updatedAt: FieldValue.serverTimestamp(),
  };

  if (type === "income") {
    // Money came into the business — goes into cash or bank
    update.totalIncome                = FieldValue.increment(amt);
    update[`monthlyIncome.${month}`]  = FieldValue.increment(amt);
    if (method === "cash") update.cashBalance = FieldValue.increment(amt);
    else                   update.bankBalance = FieldValue.increment(amt);

  } else if (type === "expense") {
    // Operating cost — reduces cash or bank, tracked by category
    update.totalExpenses                       = FieldValue.increment(amt);
    update[`monthlyExpenses.${month}`]         = FieldValue.increment(amt);
    update[`expensesByCategory.${category}`]   = FieldValue.increment(amt);
    // Expense debits the balance (sign already applied to amt, so negate for balance)
    if (method === "cash") update.cashBalance = FieldValue.increment(-amt);
    else                   update.bankBalance = FieldValue.increment(-amt);

  } else if (type === "owner_withdrawal") {
    // Owner takes money out of the business for personal use.
    // Rules:
    //   ✅ ownerBalance   += amount  (track cumulative owner draws)
    //   ✅ cash/bankBal   -= amount  (money leaves the business wallet)
    //   ❌ totalIncome    unchanged  (this is NOT new income)
    //   ❌ totalExpenses  unchanged  (this is NOT an operating expense)
    //   ❌ monthlyIncome  unchanged
    //   ❌ monthlyExpenses unchanged
    update.ownerBalance = FieldValue.increment(amt);
    // amt = amount * sign; for the balance we need to subtract on apply (+sign)
    // and add back on reverse (-sign) — which is exactly -amt.
    if (method === "cash") update.cashBalance = FieldValue.increment(-amt);
    else                   update.bankBalance = FieldValue.increment(-amt);
  }

  return update;
}

// ─── 1. Transaction Created ──────────────────────────────────────────────────

export const onTransactionCreated = onDocumentCreated(
  { document: "transactions/{id}", memory: "256MiB" },
  async (event) => {
    const data = event.data?.data();
    if (!data) return;

    const { type, method, category, amount } = data as {
      type:     "income" | "expense" | "owner_withdrawal";
      method:   "cash" | "bank";
      category: string;
      amount:   number;
    };

    // Guard: skip if type is unrecognised (defensive, should never happen)
    if (!["income", "expense", "owner_withdrawal"].includes(type)) {
      console.warn(`[onTransactionCreated] Unknown type="${type}" — skipping.`);
      return;
    }

    const month  = monthIndex(data);
    const update = buildUpdate(type, method, category, amount, month, 1);

    await STATS().set(update, { merge: true });
  },
);

// ─── 2. Transaction Deleted ──────────────────────────────────────────────────

export const onTransactionDeleted = onDocumentDeleted(
  { document: "transactions/{id}", memory: "256MiB" },
  async (event) => {
    const data = event.data?.data();
    if (!data) return;

    const { type, method, category, amount } = data as {
      type:     "income" | "expense" | "owner_withdrawal";
      method:   "cash" | "bank";
      category: string;
      amount:   number;
    };

    if (!["income", "expense", "owner_withdrawal"].includes(type)) {
      console.warn(`[onTransactionDeleted] Unknown type="${type}" — skipping.`);
      return;
    }

    const month  = monthIndex(data);
    // sign = -1 reverses the original effect atomically
    const update = buildUpdate(type, method, category, amount, month, -1);

    await STATS().set(update, { merge: true });
  },
);

// ─── 3. Rebuild Finance Stats (HTTP Callable, superAdmin only) ───────────────
//
// Scans ALL transactions and recomputes finance_stats/dashboard from scratch.
// Safe to call at any time — overwrites the dashboard doc with the correct values.
// Use this to fix any drift caused by missed triggers or legacy data.

export const rebuildFinanceStats = onCall(
  { memory: "512MiB" },
  async (request) => {
    // ── Auth guard ────────────────────────────────────────────────────────────
    if (!request.auth) throw new HttpsError("unauthenticated", "Login required");

    const callerDoc = await db.collection("users").doc(request.auth.uid).get();
    const role = callerDoc.data()?.role;
    if (role !== "superAdmin") {
      throw new HttpsError("permission-denied", "SuperAdmin only");
    }

    // ── Full scan ─────────────────────────────────────────────────────────────
    const snap = await db.collection("transactions").get();

    const stats = {
      totalIncome:         0,
      totalExpenses:       0,
      ownerBalance:        0,          // ← NEW: cumulative owner withdrawals
      cashBalance:         0,
      bankBalance:         0,
      monthlyIncome:       Array(12).fill(0) as number[],
      monthlyExpenses:     Array(12).fill(0) as number[],
      expensesByCategory:  {} as Record<string, number>,
    };

    snap.forEach((doc) => {
      const d = doc.data();
      const { type, method, category, amount } = d as {
        type:     string;
        method:   "cash" | "bank";
        category: string;
        amount:   number;
      };
      const month = monthIndex(d);

      if (type === "income") {
        stats.totalIncome += amount;
        stats.monthlyIncome[month] = (stats.monthlyIncome[month] ?? 0) + amount;
        if (method === "cash") stats.cashBalance += amount;
        else                   stats.bankBalance += amount;

      } else if (type === "expense") {
        stats.totalExpenses += amount;
        stats.monthlyExpenses[month] = (stats.monthlyExpenses[month] ?? 0) + amount;
        stats.expensesByCategory[category] = (stats.expensesByCategory[category] ?? 0) + amount;
        if (method === "cash") stats.cashBalance -= amount;
        else                   stats.bankBalance -= amount;

      } else if (type === "owner_withdrawal") {
        // Owner draw: reduces liquid balance, tracked in ownerBalance
        // Does NOT touch totalIncome, totalExpenses, or monthly arrays
        stats.ownerBalance += amount;
        if (method === "cash") stats.cashBalance -= amount;
        else                   stats.bankBalance -= amount;

      } else {
        console.warn(`[rebuildFinanceStats] Unknown type="${type}" on doc=${doc.id} — skipped.`);
      }
    });

    await STATS().set({
      ...stats,
      updatedAt: FieldValue.serverTimestamp(),
    });

    return { ok: true, processed: snap.size };
  },
);