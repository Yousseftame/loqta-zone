/**
 * src/hooks/useFinance.ts
 *
 * Fetches finance data with minimal Firestore reads:
 *
 *   finance_stats/dashboard  — 1 onSnapshot listener (all aggregated totals)
 *   transactions             — ALL docs ordered by createdAt desc, paginated client-side
 *
 * Pagination is done client-side after a full fetch so the TransactionsTable
 * can slice any page without additional Firestore reads. For very large datasets
 * (10k+ transactions) switch to server-side cursor pagination.
 */

import { useEffect, useState, useCallback } from "react";
import {
  doc, collection,
  onSnapshot,
  query, orderBy, addDoc,
  serverTimestamp, Timestamp,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "@/firebase/firebase";
import {
  DEFAULT_FINANCE_STATS,
  type FinanceStats,
  type Transaction,
  type TransactionFormValues,
  toDate,
} from "@/pages/Admin/Finance/finance-data";

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
  };
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useFinance() {
  const [stats, setStats]               = useState<FinanceStats>(DEFAULT_FINANCE_STATS);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading]           = useState(true);
  const [adding, setAdding]             = useState(false);
  const [error, setError]               = useState<string | null>(null);

  useEffect(() => {
    let loaded = 0;
    const unsubs: Unsubscribe[] = [];

    const markLoaded = () => {
      loaded += 1;
      if (loaded >= 2) setLoading(false);
    };

    // ── finance_stats/dashboard ──────────────────────────────────────────────
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

    return () => unsubs.forEach((u) => u());
  }, []);

  // ─── Add transaction ───────────────────────────────────────────────────────
  const addTransaction = useCallback(async (
    values: TransactionFormValues,
    adminId: string,
    adminName: string,
  ) => {
    setAdding(true);
    try {
      await addDoc(collection(db, "transactions"), {
        type:          values.type,
        amount:        Number(values.amount),
        method:        values.method,
        category:      values.category,
        note:          values.note.trim(),
        createdAt:     serverTimestamp(),
        createdBy:     adminId,
        createdByName: adminName,
      });
    } finally {
      setAdding(false);
    }
  }, []);

  return { stats, transactions, loading, adding, error, addTransaction };
}