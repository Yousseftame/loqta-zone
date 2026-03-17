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
  return d.getMonth();  // 0 = Jan
}

// ─── Helper: build atomic increment update for one transaction ───────────────

function buildUpdate(
  type: "income" | "expense",
  method: "cash" | "bank",
  category: string,
  amount: number,
  month: number,
  sign: 1 | -1,           // +1 = apply, -1 = reverse
): Record<string, any> {
  const amt = amount * sign;
  const update: Record<string, any> = {
    updatedAt: FieldValue.serverTimestamp(),
  };

  if (type === "income") {
    update.totalIncome                  = FieldValue.increment(amt);
    update[`monthlyIncome.${month}`]    = FieldValue.increment(amt);
    if (method === "cash") update.cashBalance = FieldValue.increment(amt);
    else                   update.bankBalance = FieldValue.increment(amt);
  } else {
    update.totalExpenses                  = FieldValue.increment(amt);
    update[`monthlyExpenses.${month}`]    = FieldValue.increment(amt);
    update[`expensesByCategory.${category}`] = FieldValue.increment(amt);
    if (method === "cash") update.cashBalance = FieldValue.increment(-amt);  // expense reduces balance
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
      type: "income" | "expense";
      method: "cash" | "bank";
      category: string;
      amount: number;
    };

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
      type: "income" | "expense";
      method: "cash" | "bank";
      category: string;
      amount: number;
    };

    const month  = monthIndex(data);
    const update = buildUpdate(type, method, category, amount, month, -1);

    await STATS().set(update, { merge: true });
  },
);

// ─── 3. Rebuild Finance Stats (HTTP Callable, superAdmin only) ───────────────

export const rebuildFinanceStats = onCall(
  { memory: "512MiB" },
  async (request) => {
    // Auth check
    if (!request.auth) throw new HttpsError("unauthenticated", "Login required");
    const callerDoc = await db.collection("users").doc(request.auth.uid).get();
    const role = callerDoc.data()?.role;
    if (role !== "superAdmin") throw new HttpsError("permission-denied", "SuperAdmin only");

    // Full scan
    const snap = await db.collection("transactions").get();

    const stats = {
      totalIncome:         0,
      totalExpenses:       0,
      cashBalance:         0,
      bankBalance:         0,
      monthlyIncome:       Array(12).fill(0) as number[],
      monthlyExpenses:     Array(12).fill(0) as number[],
      expensesByCategory:  {} as Record<string, number>,
    };

    snap.forEach((doc) => {
      const d = doc.data();
      const { type, method, category, amount } = d as {
        type: "income" | "expense";
        method: "cash" | "bank";
        category: string;
        amount: number;
      };
      const month = monthIndex(d);

      if (type === "income") {
        stats.totalIncome += amount;
        stats.monthlyIncome[month] = (stats.monthlyIncome[month] ?? 0) + amount;
        if (method === "cash") stats.cashBalance += amount;
        else                   stats.bankBalance += amount;
      } else {
        stats.totalExpenses += amount;
        stats.monthlyExpenses[month] = (stats.monthlyExpenses[month] ?? 0) + amount;
        stats.expensesByCategory[category] = (stats.expensesByCategory[category] ?? 0) + amount;
        if (method === "cash") stats.cashBalance -= amount;
        else                   stats.bankBalance -= amount;
      }
    });

    await STATS().set({ ...stats, updatedAt: FieldValue.serverTimestamp() });
    return { ok: true, processed: snap.size };
  },
);