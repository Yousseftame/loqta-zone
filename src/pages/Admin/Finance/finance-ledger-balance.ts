/**
 * finance-ledger-balance.ts
 *
 * Running "available" balance + split ordering — MUST stay aligned with
 * TransactionsTable.tsx (anchor = cashBalance + bankBalance, newest-first list).
 */

import type { Transaction, FinanceStats } from "./finance-data";

function parseSplitPartNumber(splitLabel: string | undefined): number {
  if (!splitLabel) return Infinity;
  const match = splitLabel.match(/^Part\s+(\d+)/i);
  return match ? parseInt(match[1], 10) : Infinity;
}

export function sortSplitPartsInOrder(transactions: Transaction[]): Transaction[] {
  const result: Transaction[] = [];
  const emittedGroups = new Set<string>();

  const groupMap = new Map<string, Transaction[]>();
  for (const tx of transactions) {
    if (tx.groupId) {
      const arr = groupMap.get(tx.groupId) ?? [];
      arr.push(tx);
      groupMap.set(tx.groupId, arr);
    }
  }

  for (const [gid, parts] of groupMap.entries()) {
    groupMap.set(
      gid,
      [...parts].sort(
        (a, b) =>
          parseSplitPartNumber(a.splitLabel) -
          parseSplitPartNumber(b.splitLabel),
      ),
    );
  }

  for (const tx of transactions) {
    if (!tx.groupId) {
      result.push(tx);
    } else if (!emittedGroups.has(tx.groupId)) {
      emittedGroups.add(tx.groupId);
      const sorted = groupMap.get(tx.groupId) ?? [];
      result.push(...sorted);
    }
  }

  return result;
}

export function computeRunningBalances(
  transactions: Transaction[],
  currentAvailable: number,
): number[] {
  const result: number[] = new Array(transactions.length).fill(0);
  if (transactions.length === 0) return result;

  result[0] = currentAvailable;
  for (let i = 1; i < transactions.length; i++) {
    const prev = transactions[i - 1];
    if (prev.type === "income") {
      result[i] = result[i - 1] - prev.amount;
    } else if (prev.type === "transfer") {
      result[i] = result[i - 1];
    } else if (prev.type === "owner_return") {
      result[i] = result[i - 1] - prev.amount;
    } else {
      result[i] = result[i - 1] + prev.amount;
    }
  }
  return result;
}

/** Same display strings as TransactionsTable `buildMethodDisplay`. */
export function buildMethodDisplay(tx: Transaction): string {
  if (tx.type === "transfer") {
    const from = tx.method === "cash" ? "💵 Cash" : "🏦 Bank";
    const to = tx.transferTo === "cash" ? "💵 Cash" : "🏦 Bank";
    return `${from} → ${to}`;
  }
  if (tx.type === "owner_return") {
    return tx.method === "cash" ? "💵 Cash (in)" : "🏦 Bank (in)";
  }
  return tx.method === "cash" ? "💵 Cash" : "🏦 Bank";
}

export type TxLedgerMeta = {
  balanceAfter: number | null;
  methodLabel: string;
  doneBy: string;
};

/** Per transaction id — balance is null for transfers (same as main table). */
export function buildLedgerMetaByTxId(
  allTransactions: Transaction[],
  stats: FinanceStats,
): Map<string, TxLedgerMeta> {
  const sorted = sortSplitPartsInOrder(allTransactions);
  const currentAvailable = stats.cashBalance + stats.bankBalance;
  const balances = computeRunningBalances(sorted, currentAvailable);
  const map = new Map<string, TxLedgerMeta>();
  for (let i = 0; i < sorted.length; i++) {
    const tx = sorted[i];
    const doneBy =
      tx.createdByName?.trim() ||
      (tx.createdBy ? `${tx.createdBy.slice(0, 8)}…` : "—");
    map.set(tx.id, {
      balanceAfter: tx.type === "transfer" ? null : balances[i],
      methodLabel: buildMethodDisplay(tx),
      doneBy,
    });
  }
  return map;
}

export function fmtBalanceCell(n: number | null): string {
  if (n === null) return "—";
  const abs = Math.abs(n).toLocaleString("en-EG");
  return n < 0 ? `−${abs}` : abs;
}
