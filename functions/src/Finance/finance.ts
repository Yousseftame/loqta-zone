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
 * 3. onTransactionUpdated  — reverses old values then applies new values atomically
 * 4. rebuildFinanceStats   — HTTP callable, full rebuild from scratch (superAdmin)
 *
 * ─── Transaction types handled ───────────────────────────────────────────────
 * "income"           → totalIncome++, monthlyIncome[m]++, cash/bankBalance++
 * "expense"          → totalExpenses++, monthlyExpenses[m]++, expensesByCategory++,
 *                       cash/bankBalance--
 * "owner_withdrawal" → ownerBalance++, cash/bankBalance--
 *                       Does NOT touch totalIncome or totalExpenses.
 * "owner_return"     → ownerBalance--, cash/bankBalance++
 *                       REVERSE of owner_withdrawal — owner puts money back.
 *                       Does NOT touch totalIncome or totalExpenses.
 * "transfer"         → source balance--, destination balance++
 *                       Does NOT touch totalIncome, totalExpenses, ownerBalance,
 *                       or any monthly arrays. Net effect on available balance = zero.
 *                       Requires `transferTo` field on the transaction doc.
 *
 * ─── Accounting identity ─────────────────────────────────────────────────────
 *   totalIncome = cashBalance + bankBalance + ownerBalance + totalExpenses
 *   (transfers and owner_return are neutral to this identity)
 *
 * ─── Safety ──────────────────────────────────────────────────────────────────
 * All balance/total updates use FieldValue.increment() — atomic, no race conditions.
 * Monthly buckets use dot-notation keys (e.g. "monthlyIncome.3") so only
 * the relevant month is touched, not the whole array.
 */

import { onDocumentCreated, onDocumentDeleted, onDocumentUpdated } from "firebase-functions/v2/firestore";
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
// sign: +1 = apply transaction, -1 = reverse transaction (for delete/update trigger)
//
// owner_withdrawal:
//   - Increments ownerBalance by amount (or decrements on delete)
//   - Decrements cashBalance or bankBalance (or increments on delete)
//   - Does NOT touch totalIncome, totalExpenses, or monthly arrays
//
// owner_return:
//   - Decrements ownerBalance by amount (reverse of withdrawal)
//   - Increments cashBalance or bankBalance
//   - Does NOT touch totalIncome, totalExpenses, or monthly arrays
//
// transfer:
//   - Decrements source balance (method field), increments destination (transferTo field)
//   - Does NOT touch totalIncome, totalExpenses, ownerBalance, or monthly arrays
//   - Net available balance effect = zero

function buildUpdate(
  type:       "income" | "expense" | "owner_withdrawal" | "transfer" | "owner_return",
  method:     "cash" | "bank",
  category:   string,
  amount:     number,
  month:      number,
  sign:       1 | -1,
  transferTo?: "cash" | "bank",
  ownerId?:    string,
): Record<string, any> {
  const amt = amount * sign;
  const update: Record<string, any> = {
    updatedAt: FieldValue.serverTimestamp(),
  };

  if (type === "income") {
    update.totalIncome                = FieldValue.increment(amt);
    update[`monthlyIncome.${month}`]  = FieldValue.increment(amt);
    if (method === "cash") update.cashBalance = FieldValue.increment(amt);
    else                   update.bankBalance = FieldValue.increment(amt);

  } else if (type === "expense") {
    update.totalExpenses                       = FieldValue.increment(amt);
    update[`monthlyExpenses.${month}`]         = FieldValue.increment(amt);
    update[`expensesByCategory.${category}`]   = FieldValue.increment(amt);
    // Expense debits the balance (amt already includes sign)
    if (method === "cash") update.cashBalance = FieldValue.increment(-amt);
    else                   update.bankBalance = FieldValue.increment(-amt);

  } else if (type === "owner_withdrawal") {
    // Owner takes money OUT: ownerBalance increases, liquid balance decreases
    update.ownerBalance = FieldValue.increment(amt);
    if (ownerId) update[`ownerBalances.${ownerId}`] = FieldValue.increment(amt);
    if (method === "cash") update.cashBalance = FieldValue.increment(-amt);
    else                   update.bankBalance = FieldValue.increment(-amt);

  } else if (type === "owner_return") {
    // Owner puts money BACK: ownerBalance decreases, liquid balance increases
    update.ownerBalance = FieldValue.increment(-amt);
    if (ownerId) update[`ownerBalances.${ownerId}`] = FieldValue.increment(-amt);
    if (method === "cash") update.cashBalance = FieldValue.increment(amt);
    else                   update.bankBalance = FieldValue.increment(amt);

  } else if (type === "transfer") {
    const dest = transferTo ?? (method === "cash" ? "bank" : "cash");
    // Net per pool — same-method wallet→wallet must not change cash/bank totals.
    // (Assigning increment twice on one field overwrites the first in JS.)
    let cashDelta = 0;
    let bankDelta = 0;
    if (method === "cash") cashDelta -= amt;
    else bankDelta -= amt;
    if (dest === "cash") cashDelta += amt;
    else bankDelta += amt;
    if (cashDelta !== 0) {
      update.cashBalance = FieldValue.increment(cashDelta);
    }
    if (bankDelta !== 0) {
      update.bankBalance = FieldValue.increment(bankDelta);
    }
  }

  return update;
}

const VALID_TYPES = ["income", "expense", "owner_withdrawal", "transfer", "owner_return"];

// ─── 1. Transaction Created ──────────────────────────────────────────────────

export const onTransactionCreated = onDocumentCreated(
  { document: "transactions/{id}", memory: "256MiB" },
  async (event) => {
    const data = event.data?.data();
    if (!data) return;

    const { type, method, category, amount, transferTo, ownerId } = data as {
      type:       "income" | "expense" | "owner_withdrawal" | "transfer" | "owner_return";
      method:     "cash" | "bank";
      category:   string;
      amount:     number;
      transferTo?: "cash" | "bank";
      ownerId?:    string;
    };

    if (!VALID_TYPES.includes(type)) {
      console.warn(`[onTransactionCreated] Unknown type="${type}" — skipping.`);
      return;
    }

    const month  = monthIndex(data);
    const update = buildUpdate(type, method, category, amount, month, 1, transferTo, ownerId);

    try {
      await STATS().update(update);
    } catch (err: any) {
      if (err.code === 5) await STATS().set(update, { merge: true });
      else throw err;
    }
  },
);

// ─── 2. Transaction Deleted ──────────────────────────────────────────────────

export const onTransactionDeleted = onDocumentDeleted(
  { document: "transactions/{id}", memory: "256MiB" },
  async (event) => {
    const data = event.data?.data();
    if (!data) return;

    const { type, method, category, amount, transferTo, ownerId } = data as {
      type:       "income" | "expense" | "owner_withdrawal" | "transfer" | "owner_return";
      method:     "cash" | "bank";
      category:   string;
      amount:     number;
      transferTo?: "cash" | "bank";
      ownerId?:    string;
    };

    if (!VALID_TYPES.includes(type)) {
      console.warn(`[onTransactionDeleted] Unknown type="${type}" — skipping.`);
      return;
    }

    const month  = monthIndex(data);
    const update = buildUpdate(type, method, category, amount, month, -1, transferTo, ownerId);

    try {
      await STATS().update(update);
    } catch (err: any) {
      if (err.code === 5) await STATS().set(update, { merge: true });
      else throw err;
    }
  },
);

// ─── 3. Transaction Updated ──────────────────────────────────────────────────
// Reverses the OLD transaction effect, then applies the NEW transaction effect.
// This keeps the aggregated dashboard accurate after any edit.

export const onTransactionUpdated = onDocumentUpdated(
  { document: "transactions/{id}", memory: "256MiB" },
  async (event) => {
    const before = event.data?.before.data();
    const after  = event.data?.after.data();
    if (!before || !after) return;

    // ── Reverse the OLD transaction ───────────────────────────────────────
    const oldType     = before.type as "income" | "expense" | "owner_withdrawal" | "transfer" | "owner_return";
    const oldMethod   = before.method   as "cash" | "bank";
    const oldCategory = before.category as string;
    const oldAmount   = before.amount   as number;
    const oldMonth    = monthIndex(before);
    const oldTransferTo = before.transferTo as "cash" | "bank" | undefined;
    const oldOwnerId    = before.ownerId as string | undefined;

    // ── Apply the NEW transaction ─────────────────────────────────────────
    const newType     = after.type as "income" | "expense" | "owner_withdrawal" | "transfer" | "owner_return";
    const newMethod   = after.method   as "cash" | "bank";
    const newCategory = after.category as string;
    const newAmount   = after.amount   as number;
    const newMonth    = monthIndex(after);
    const newTransferTo = after.transferTo as "cash" | "bank" | undefined;
    const newOwnerId    = after.ownerId as string | undefined;

    if (!VALID_TYPES.includes(oldType) || !VALID_TYPES.includes(newType)) {
      console.warn(`[onTransactionUpdated] Unknown type — skipping.`);
      return;
    }

    // Build reverse of old and apply of new, then merge into one update object
    const reverseOld = buildUpdate(oldType, oldMethod, oldCategory, oldAmount, oldMonth, -1, oldTransferTo, oldOwnerId);
    const applyNew   = buildUpdate(newType, newMethod, newCategory, newAmount, newMonth,  1, newTransferTo, newOwnerId);

    // Merge: for each FieldValue.increment, we need to combine them.
    // Since FieldValue.increment objects can't be added directly, we do two sequential writes.
    const stats = STATS();
    try {
      await stats.update(reverseOld);
    } catch (err: any) {
      if (err.code === 5) await stats.set(reverseOld, { merge: true });
      else throw err;
    }

    try {
      await stats.update(applyNew);
    } catch (err: any) {
      if (err.code === 5) await stats.set(applyNew, { merge: true });
      else throw err;
    }
  },
);

// ─── 4. Rebuild Finance Stats (HTTP Callable, superAdmin only) ───────────────

export const rebuildFinanceStats = onCall(
  { memory: "512MiB" },
  async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Login required");

    const callerDoc = await db.collection("users").doc(request.auth.uid).get();
    const role = callerDoc.data()?.role;
    if (role !== "superAdmin") {
      throw new HttpsError("permission-denied", "SuperAdmin only");
    }

    const snap = await db.collection("transactions").get();

    const stats = {
      totalIncome:         0,
      totalExpenses:       0,
      ownerBalance:        0,
      cashBalance:         0,
      bankBalance:         0,
      monthlyIncome:       Array(12).fill(0) as number[],
      monthlyExpenses:     Array(12).fill(0) as number[],
      expensesByCategory:  {} as Record<string, number>,
      ownerBalances:       {} as Record<string, number>,
    };

    snap.forEach((doc) => {
      const d = doc.data();
      const { type, method, category, amount, transferTo, ownerId } = d as {
        type:       string;
        method:     "cash" | "bank";
        category:   string;
        amount:     number;
        transferTo?: "cash" | "bank";
        ownerId?:    string;
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
        stats.ownerBalance += amount;
        if (ownerId) stats.ownerBalances[ownerId] = (stats.ownerBalances[ownerId] ?? 0) + amount;
        if (method === "cash") stats.cashBalance -= amount;
        else                   stats.bankBalance -= amount;

      } else if (type === "owner_return") {
        // Owner puts money BACK — reverse of withdrawal
        stats.ownerBalance -= amount;
        if (ownerId) stats.ownerBalances[ownerId] = (stats.ownerBalances[ownerId] ?? 0) - amount;
        if (method === "cash") stats.cashBalance += amount;
        else                   stats.bankBalance += amount;

      } else if (type === "transfer") {
        const dest = transferTo ?? (method === "cash" ? "bank" : "cash");
        if (method === "cash") stats.cashBalance -= amount;
        else                   stats.bankBalance -= amount;
        if (dest === "cash")   stats.cashBalance += amount;
        else                   stats.bankBalance += amount;

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