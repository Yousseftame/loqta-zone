/**
 * src/hooks/useFinance.ts
 *
 * Fetches finance data with minimal Firestore reads:
 *
 *   finance_stats/dashboard  — 1 onSnapshot listener (all aggregated totals)
 *   transactions             — ALL docs ordered by createdAt desc, paginated client-side
 *
 * Pagination is done client-side after a full fetch so the TransactionsTable
 * can slice any page without additional Firestore reads.
 *
 * ─── Split Payment ────────────────────────────────────────────────────────────
 * When isSplit=true, addTransaction fires one addDoc per split part in a
 * writeBatch. All parts share a groupId (UUID) so the UI can group them.
 * Each part is a fully independent Firestore document — the Cloud Function
 * trigger handles each one separately, keeping aggregation correct.
 */

import { useEffect, useState, useCallback, useRef } from "react";
import {
  doc, collection,
  onSnapshot,
  getDoc,
  query, orderBy, addDoc, updateDoc, deleteDoc,
  serverTimestamp, Timestamp,
  writeBatch,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "@/firebase/firebase";
import {
  DEFAULT_FINANCE_STATS,
  type FinanceStats,
  type Transaction,
  type TransactionFormValues,
  type Owner,
  toDate,
} from "@/pages/Admin/Finance/finance-data";

// ─── Simple UUID generator (no external dependency) ──────────────────────────
function generateGroupId(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// ─── Parser ───────────────────────────────────────────────────────────────────

function parseStats(data: Record<string, any>): FinanceStats {
  const toArray = (raw: any): number[] => {
    if (Array.isArray(raw)) return raw.map(Number);
    if (raw && typeof raw === "object") {
      const arr = Array(12).fill(0);
      Object.entries(raw).forEach(([k, v]) => { arr[Number(k)] = Number(v) ?? 0; });
      return arr;
    }
    return Array(12).fill(0);
  };

  return {
    totalIncome:         data.totalIncome         ?? 0,
    totalExpenses:       data.totalExpenses        ?? 0,
    ownerBalance:        data.ownerBalance         ?? 0,
    cashBalance:         data.cashBalance          ?? 0,
    bankBalance:         data.bankBalance          ?? 0,
    monthlyIncome:       toArray(data.monthlyIncome),
    monthlyExpenses:     toArray(data.monthlyExpenses),
    expensesByCategory:  data.expensesByCategory   ?? {},
    ownerBalances:       data.ownerBalances        ?? {},
    updatedAt:           toDate(data.updatedAt),
  };
}

function parseTransaction(id: string, data: Record<string, any>): Transaction {
  return {
    id,
    type:          data.type,
    amount:        data.amount        ?? 0,
    method:        data.method        ?? "cash",
    category:      data.category      ?? "other",
    note:          data.note          ?? "",
    createdAt:     toDate(data.createdAt),
    createdBy:     data.createdBy     ?? "",
    createdByName: data.createdByName ?? "",
    transferTo:    data.transferTo    ?? undefined,
    groupId:       data.groupId       ?? undefined,
    splitLabel:    data.splitLabel    ?? undefined,
    splitTotal:    data.splitTotal    ?? undefined,
    ownerId:       data.ownerId       ?? undefined,
    ownerName:     data.ownerName     ?? undefined,
    purchaseId:    data.purchaseId    ?? undefined,
    accountId:       data.accountId       ?? undefined,
    transferToAccountId: data.transferToAccountId ?? undefined,
  };
}

function applyAccountPayload(
  payload: Record<string, unknown>,
  accountId?: string,
  transferToAccountId?: string,
  isTransfer?: boolean,
): void {
  if (accountId) payload.accountId = accountId;
  if (isTransfer && transferToAccountId) {
    payload.transferToAccountId = transferToAccountId;
  }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useFinance() {
  const [stats, setStats]               = useState<FinanceStats>(DEFAULT_FINANCE_STATS);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [owners, setOwners]             = useState<Owner[]>([]);
  const [loading, setLoading]           = useState(true);
  const [adding, setAdding]             = useState(false);
  const [updating, setUpdating]         = useState(false);
  const [error, setError]               = useState<string | null>(null);

  // fetchStatsDoc is used ONLY for the explicit rebuild flow in FinancePage.
  // onSnapshot below handles real-time balance card updates.
  const fetchStatsDoc = useCallback(async (): Promise<FinanceStats> => {
    try {
      const snap = await getDoc(doc(db, "finance_stats", "dashboard"));
      const s = snap.exists() ? parseStats(snap.data()) : DEFAULT_FINANCE_STATS;
      return s;
    } catch (err: any) {
      console.error("[useFinance] refetch error:", err?.code);
      return DEFAULT_FINANCE_STATS;
    }
  }, []);

  useEffect(() => {
    let loaded = 0;
    const unsubs: Unsubscribe[] = [];

    const markLoaded = () => {
      loaded += 1;
      if (loaded >= 3) setLoading(false);
    };

    // ── finance_stats/dashboard — LIVE listener (powers balance cards) ─────────
    // Charts use a separate "frozenStats" in FinancePage that only updates
    // on explicit rebuild — this way balances are real-time while charts
    // are immune to intermediate Cloud Function write states.
    const unsubStats = onSnapshot(
      doc(db, "finance_stats", "dashboard"),
      (snap) => {
        setStats(snap.exists() ? parseStats(snap.data()) : DEFAULT_FINANCE_STATS);
        setError(null);
        markLoaded();
      },
      (err) => {
        console.error("[useFinance] stats error:", err.code);
        if (err.code === "permission-denied") setError("Finance access denied.");
        markLoaded();
      },
    );
    unsubs.push(unsubStats);

    // ── ALL transactions (no limit — client-side pagination) ─────────────────
    const txQuery = query(
      collection(db, "transactions"),
      orderBy("createdAt", "desc"),
    );
    const unsubTx = onSnapshot(
      txQuery,
      (snap) => {
        setTransactions(snap.docs.map((d) => parseTransaction(d.id, d.data())));
        markLoaded();
      },
      (err) => {
        console.error("[useFinance] transactions error:", err.code);
        markLoaded();
      },
    );
    unsubs.push(unsubTx);

    // ── ALL owners ───────────────────────────────────────────────────────────
    const ownersQuery = query(collection(db, "owners"), orderBy("name", "asc"));
    const unsubOwners = onSnapshot(
      ownersQuery,
      (snap) => {
        setOwners(snap.docs.map((d) => ({
          id: d.id,
          name: d.data().name ?? "",
          createdAt: toDate(d.data().createdAt),
        })));
        markLoaded();
      },
      (err) => {
        console.error("[useFinance] owners error:", err.code);
        markLoaded();
      },
    );
    unsubs.push(unsubOwners);

    return () => unsubs.forEach((u) => u());
  }, [fetchStatsDoc]);

  // ─── Add transaction ───────────────────────────────────────────────────────
  // Handles both single and split payment modes.
  // Split: one Firestore doc per split part, all sharing a groupId.
  const addTransaction = useCallback(async (
    values: TransactionFormValues,
    adminId: string,
    adminName: string,
  ) => {
    setAdding(true);
    try {
      const isSplit = values.isSplit && values.splits && values.splits.length > 1;

      if (isSplit && values.splits) {
        // ── Split payment: write one doc per part in a batch ────────────────
        const groupId = generateGroupId();
        const totalParts = values.splits.length;
        const batch = writeBatch(db);

        values.splits.forEach((part, index) => {
          const ref = doc(collection(db, "transactions"));
          const payload: Record<string, any> = {
            type:          values.type,
            amount:        Number(part.amount),
            method:        part.method,
            category:      values.category,
            note:          values.note.trim(),
            createdAt:     serverTimestamp(),
            createdBy:     adminId,
            createdByName: adminName,
            groupId,
            splitLabel:    `Part ${index + 1} of ${totalParts}`,
            splitTotal:    totalParts,
          };
          applyAccountPayload(payload, part.accountId);
          batch.set(ref, payload);
        });

        await batch.commit();
      } else {
        // ── Single payment: same as before ──────────────────────────────────
        const payload: Record<string, any> = {
          type:          values.type,
          amount:        Number(values.amount),
          method:        values.method,
          category:      values.category,
          note:          values.note.trim(),
          createdAt:     serverTimestamp(),
          createdBy:     adminId,
          createdByName: adminName,
        };

        if (values.type === "transfer" && values.transferTo) {
          payload.transferTo = values.transferTo;
        }
        if (values.type === "owner_withdrawal" || values.type === "owner_return") {
          payload.ownerId = values.ownerId;
          payload.ownerName = values.ownerName;
        }
        applyAccountPayload(
          payload,
          values.accountId,
          values.transferToAccountId,
          values.type === "transfer",
        );

        await addDoc(collection(db, "transactions"), payload);
      }
    } finally {
      setAdding(false);
    }
  }, []);

  // ─── Update transaction ────────────────────────────────────────────────────
  // The Cloud Function onTransactionUpdated will reverse old values and apply new ones.
  // createdAt is intentionally NOT updated — we preserve the original timestamp.
  // Split transactions cannot be edited as a group — each part is edited individually.
  const updateTransaction = useCallback(async (
    txId: string,
    values: TransactionFormValues,
    adminId: string,
    adminName: string,
  ) => {
    setUpdating(true);
    try {
      const payload: Record<string, any> = {
        type:          values.type,
        amount:        Number(values.amount),
        method:        values.method,
        category:      values.category,
        note:          values.note.trim(),
        updatedBy:     adminId,
        updatedByName: adminName,
        updatedAt:     serverTimestamp(),
        // transferTo: only set for transfer type, clear it for other types
        transferTo:    values.type === "transfer" ? (values.transferTo ?? null) : null,
        ownerId:       (values.type === "owner_withdrawal" || values.type === "owner_return") ? (values.ownerId ?? null) : null,
        ownerName:     (values.type === "owner_withdrawal" || values.type === "owner_return") ? (values.ownerName ?? null) : null,
        accountId:     values.accountId ?? null,
        transferToAccountId:
          values.type === "transfer" ? (values.transferToAccountId ?? null) : null,
      };

      await updateDoc(doc(db, "transactions", txId), payload);
    } finally {
      setUpdating(false);
    }
  }, []);

  // ─── Add Owner ─────────────────────────────────────────────────────────────
  const addOwner = useCallback(async (name: string) => {
    setAdding(true);
    try {
      await addDoc(collection(db, "owners"), {
        name: name.trim(),
        createdAt: serverTimestamp(),
      });
    } finally {
      setAdding(false);
    }
  }, []);

  // ─── Delete Owner ──────────────────────────────────────────────────────────
  const deleteOwner = useCallback(async (ownerId: string, currentBalance: number) => {
    if (currentBalance !== 0) {
      throw new Error(`Cannot delete owner with a non-zero balance (${currentBalance.toLocaleString("en-EG")} EGP). Please settle their balance first.`);
    }
    setAdding(true);
    try {
      // Delete the owner document. The Cloud Function onOwnerDeleted will clean up finance_stats.
      await deleteDoc(doc(db, "owners", ownerId));
    } finally {
      setAdding(false);
    }
  }, []);

  return { stats, transactions, owners, loading, adding, updating, error, addTransaction, updateTransaction, addOwner, deleteOwner, refetchStats: fetchStatsDoc };
}