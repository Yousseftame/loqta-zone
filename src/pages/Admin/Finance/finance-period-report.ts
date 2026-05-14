/**
 * finance-period-report.ts
 *
 * Custom date-range financial statement — pure functions, no React.
 * P&L rules MUST stay aligned with NetProfitLoss.tsx / Monthly P&L History:
 *   Net = Σ income − Σ expenses − Σ owner_withdrawals + Σ owner_returns
 *   Transfers excluded from P&L (balance-neutral) but listed separately.
 *
 * Date range: half-open interval [fromInclusive, toExclusive) in LOCAL time,
 * matching month boundaries (startOfMonth-style) used elsewhere in Finance.
 */

import type { Transaction } from "./finance-data";

export function calcNetForRange(
  txs: Transaction[],
  fromInclusive: Date,
  toExclusive: Date,
): {
  net: number;
  income: number;
  expenses: number;
  ownerDraws: number;
} {
  let income = 0;
  let expenses = 0;
  let ownerDraws = 0;
  for (const tx of txs) {
    const d = tx.createdAt;
    if (!d || d < fromInclusive || d >= toExclusive) continue;
    if (tx.type === "income") income += tx.amount;
    else if (tx.type === "expense") expenses += tx.amount;
    else if (tx.type === "owner_withdrawal") ownerDraws += tx.amount;
    else if (tx.type === "owner_return") ownerDraws -= tx.amount;
  }
  return { net: income - expenses - ownerDraws, income, expenses, ownerDraws };
}

export function txsInHalfOpenRange(
  txs: Transaction[],
  fromInclusive: Date,
  toExclusive: Date,
): Transaction[] {
  return txs.filter((tx) => {
    const d = tx.createdAt;
    return !!d && d >= fromInclusive && d < toExclusive;
  });
}

/** Parse YYYY-MM-DD from <input type="date"> as local midnight start. */
export function localDayStart(iso: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso.trim())) return null;
  const [ys, ms, ds] = iso.trim().split("-");
  const y = Number(ys);
  const m = Number(ms);
  const d = Number(ds);
  if (!y || m < 1 || m > 12 || d < 1 || d > 31) return null;
  const dt = new Date(y, m - 1, d, 0, 0, 0, 0);
  if (dt.getFullYear() !== y || dt.getMonth() !== m - 1 || dt.getDate() !== d)
    return null;
  return dt;
}

/** Inclusive end date → exclusive range end (start of next local day). */
export function localInclusiveEndToExclusive(iso: string): Date | null {
  const start = localDayStart(iso);
  if (!start) return null;
  const next = new Date(start);
  next.setDate(next.getDate() + 1);
  return next;
}

export type PeriodRange =
  | { ok: true; fromInclusive: Date; toExclusive: Date }
  | { ok: false; error: string };

const MAX_RANGE_MS = 800 * 24 * 60 * 60 * 1000; // ~27 months — generous, avoids accidental huge exports

export function parsePeriodRangeInputs(
  fromIso: string,
  toIso: string,
): PeriodRange {
  const t = fromIso.trim();
  const u = toIso.trim();
  if (!t || !u) return { ok: false, error: "Choose both a start date and an end date." };
  const fromInclusive = localDayStart(t);
  const toExclusive = localInclusiveEndToExclusive(u);
  if (!fromInclusive || !toExclusive)
    return { ok: false, error: "Invalid date — use the date picker values only." };
  if (fromInclusive >= toExclusive)
    return { ok: false, error: "Start date must be on or before end date." };
  if (toExclusive.getTime() - fromInclusive.getTime() > MAX_RANGE_MS)
    return { ok: false, error: "Selected range is too long for export (max ~27 months)." };
  return { ok: true, fromInclusive, toExclusive };
}

export type OwnerActivityRow = {
  ownerId: string;
  displayName: string;
  withdrawals: number;
  returns: number;
  /** withdrawals minus returns (cash leaving business to owner, net of returns) */
  netToOwner: number;
};

export type PeriodFinancialStatement = {
  fromInclusive: Date;
  toExclusive: Date;
  summary: {
    net: number;
    income: number;
    expenses: number;
    ownerDraws: number;
  };
  incomeByCategory: Record<string, number>;
  expenseByCategory: Record<string, number>;
  transfers: {
    rows: Transaction[];
    count: number;
    /** Sum of transfer amounts (informational; not P&L). */
    volume: number;
  };
  ownerActivity: OwnerActivityRow[];
  /** Newest first — same ordering as main transaction list. */
  transactionsSorted: Transaction[];
};

export function buildPeriodFinancialStatement(
  txs: Transaction[],
  fromInclusive: Date,
  toExclusive: Date,
): PeriodFinancialStatement {
  const summary = calcNetForRange(txs, fromInclusive, toExclusive);
  const inRange = txsInHalfOpenRange(txs, fromInclusive, toExclusive);

  const incomeByCategory: Record<string, number> = {};
  const expenseByCategory: Record<string, number> = {};
  const transferRows: Transaction[] = [];
  let transferVolume = 0;

  const ownerMap = new Map<
    string,
    { displayName: string; withdrawals: number; returns: number }
  >();

  for (const tx of inRange) {
    if (tx.type === "income") {
      const k = tx.category ?? "other";
      incomeByCategory[k] = (incomeByCategory[k] ?? 0) + tx.amount;
    } else if (tx.type === "expense") {
      const k = tx.category ?? "other";
      expenseByCategory[k] = (expenseByCategory[k] ?? 0) + tx.amount;
    } else if (tx.type === "transfer") {
      transferRows.push(tx);
      transferVolume += tx.amount;
    } else if (tx.type === "owner_withdrawal") {
      const id = tx.ownerId ?? "_unknown";
      const cur = ownerMap.get(id) ?? {
        displayName: tx.ownerName?.trim() || id,
        withdrawals: 0,
        returns: 0,
      };
      cur.withdrawals += tx.amount;
      if (tx.ownerName?.trim()) cur.displayName = tx.ownerName.trim();
      ownerMap.set(id, cur);
    } else if (tx.type === "owner_return") {
      const id = tx.ownerId ?? "_unknown";
      const cur = ownerMap.get(id) ?? {
        displayName: tx.ownerName?.trim() || id,
        withdrawals: 0,
        returns: 0,
      };
      cur.returns += tx.amount;
      if (tx.ownerName?.trim()) cur.displayName = tx.ownerName.trim();
      ownerMap.set(id, cur);
    }
  }

  transferRows.sort((a, b) => {
    const da = a.createdAt?.getTime() ?? 0;
    const db = b.createdAt?.getTime() ?? 0;
    return db - da;
  });

  const ownerActivity: OwnerActivityRow[] = [...ownerMap.entries()].map(
    ([ownerId, v]) => ({
      ownerId,
      displayName: v.displayName,
      withdrawals: v.withdrawals,
      returns: v.returns,
      netToOwner: v.withdrawals - v.returns,
    }),
  );
  ownerActivity.sort((a, b) => b.netToOwner - a.netToOwner);

  const transactionsSorted = [...inRange].sort((a, b) => {
    const da = a.createdAt?.getTime() ?? 0;
    const db = b.createdAt?.getTime() ?? 0;
    return db - da;
  });

  return {
    fromInclusive,
    toExclusive,
    summary,
    incomeByCategory,
    expenseByCategory,
    transfers: {
      rows: transferRows,
      count: transferRows.length,
      volume: transferVolume,
    },
    ownerActivity,
    transactionsSorted,
  };
}
