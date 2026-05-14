/**
 * period-report-excel.ts
 *
 * Multi-sheet .xlsx aligned with the Period Statement UI (categories, owners,
 * transfers, full transaction lines with method / balance-after / done-by).
 */

import * as XLSX from "xlsx";
import type { PeriodFinancialStatement } from "./finance-period-report";
import type { Transaction, FinanceStats } from "./finance-data";
import { CATEGORY_LABEL } from "./finance-data";
import {
  buildLedgerMetaByTxId,
} from "./finance-ledger-balance";

export type PeriodReportExcelContext = {
  stats: FinanceStats;
  allTransactions: Transaction[];
};

function fmtDateTime(d: Date | null): string {
  if (!d) return "";
  return d.toLocaleString("en-EG", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function num(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function pct(part: number, whole: number): string {
  if (!whole) return "0%";
  return `${((100 * part) / whole).toFixed(1)}%`;
}

function buildTransactionExportRows(
  txs: Transaction[],
  metaById: ReturnType<typeof buildLedgerMetaByTxId>,
): Record<string, string | number>[] {
  return txs.map((tx) => {
    const meta = metaById.get(tx.id);
    return {
      Date_time: fmtDateTime(tx.createdAt),
      Type: tx.type,
      Category: CATEGORY_LABEL[tx.category] ?? tx.category,
      Method: meta?.methodLabel ?? "",
      Amount_EGP: num(tx.amount),
      Balance_after_EGP:
        meta?.balanceAfter === null || meta?.balanceAfter === undefined
          ? "—"
          : num(meta.balanceAfter),
      Done_by: meta?.doneBy ?? "",
      Transfer_to: tx.transferTo ?? "",
      Owner_ID: tx.ownerId ?? "",
      Owner_name: tx.ownerName ?? "",
      Group_ID: tx.groupId ?? "",
      Split_label: tx.splitLabel ?? "",
      Purchase_ID: tx.purchaseId ?? "",
      Note: tx.note ?? "",
      Created_by_UID: tx.createdBy ?? "",
      Tx_ID: tx.id,
    };
  });
}

export function downloadPeriodReportExcel(
  stmt: PeriodFinancialStatement,
  fileBaseName: string,
  ctx: PeriodReportExcelContext,
): void {
  const { stats, allTransactions } = ctx;
  const metaById = buildLedgerMetaByTxId(allTransactions, stats);
  const exportedAt = new Date().toISOString();

  const wb = XLSX.utils.book_new();

  const fromStr = stmt.fromInclusive.toLocaleDateString("en-CA");
  const toStr = new Date(
    stmt.toExclusive.getTime() - 1,
  ).toLocaleDateString("en-CA");

  const anchor = stats.cashBalance + stats.bankBalance;

  const summaryRows: (string | number)[][] = [
    ["Loqta — Finance period statement"],
    ["From (inclusive)", fromStr],
    ["To (inclusive)", toStr],
    ["Exported at (UTC)", exportedAt],
    [],
    ["Current balances (anchor for Balance after column)", ""],
    ["Cash balance (EGP)", num(stats.cashBalance)],
    ["Bank balance (EGP)", num(stats.bankBalance)],
    ["Available (cash + bank) anchor (EGP)", num(anchor)],
    [],
    ["P&L summary (period)", "Amount (EGP)"],
    ["Total income", num(stmt.summary.income)],
    ["Total expenses (operating)", num(stmt.summary.expenses)],
    ["Net owner draws (withdrawals − returns)", num(stmt.summary.ownerDraws)],
    ["Net P&L (income − expenses − owner draws)", num(stmt.summary.net)],
    [],
    ["Transfers in period (not in P&L)", stmt.transfers.count],
    ["Sum of transfer amounts (informational)", num(stmt.transfers.volume)],
    [],
    [
      "Note",
      "Balance after each row uses the same running-balance rules as the Transactions table (newest-first ledger, split parts ordered).",
    ],
  ];
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet(summaryRows),
    "Summary",
  );

  const incTotal = stmt.summary.income || 0;
  const incRows: (string | number)[][] = [
    ["Category", "Amount (EGP)", "% of period income"],
  ];
  const incEntries = Object.entries(stmt.incomeByCategory).sort(
    (a, b) => b[1] - a[1],
  );
  for (const [cat, amt] of incEntries) {
    incRows.push([
      CATEGORY_LABEL[cat] ?? cat,
      num(amt),
      pct(amt, incTotal),
    ]);
  }
  if (incEntries.length === 0) incRows.push(["(none)", 0, "0%"]);
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(incRows), "Income");

  const expTotal = stmt.summary.expenses || 0;
  const expRows: (string | number)[][] = [
    ["Category", "Amount (EGP)", "% of period expenses"],
  ];
  const expEntries = Object.entries(stmt.expenseByCategory).sort(
    (a, b) => b[1] - a[1],
  );
  for (const [cat, amt] of expEntries) {
    expRows.push([
      CATEGORY_LABEL[cat] ?? cat,
      num(amt),
      pct(amt, expTotal),
    ]);
  }
  if (expEntries.length === 0) expRows.push(["(none)", 0, "0%"]);
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(expRows), "Expenses");

  const ownRows: (string | number)[][] = [
    ["Owner ID", "Name", "Withdrawals (EGP)", "Returns (EGP)", "Net to owner (EGP)"],
  ];
  for (const r of stmt.ownerActivity) {
    ownRows.push([
      r.ownerId,
      r.displayName,
      num(r.withdrawals),
      num(r.returns),
      num(r.netToOwner),
    ]);
  }
  if (stmt.ownerActivity.length === 0) ownRows.push(["(none)", "", 0, 0, 0]);
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(ownRows), "Owners");

  const trRows: Record<string, string | number>[] = [];
  for (const tx of stmt.transfers.rows) {
    const meta = metaById.get(tx.id);
    trRows.push({
      Date_time: fmtDateTime(tx.createdAt),
      From_method: tx.method,
      To_method: tx.transferTo ?? "",
      Amount_EGP: num(tx.amount),
      Done_by: meta?.doneBy ?? "",
      Note: tx.note ?? "",
      Created_by_UID: tx.createdBy ?? "",
      Tx_ID: tx.id,
    });
  }
  if (trRows.length === 0) trRows.push({ Date_time: "(none)" });
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(trRows),
    "Transfers",
  );

  const periodTxRows = buildTransactionExportRows(
    stmt.transactionsSorted,
    metaById,
  );
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(
      periodTxRows.length ? periodTxRows : [{ Date_time: "(none)" }],
    ),
    "Transactions_in_period",
  );

  const incomeLines = stmt.transactionsSorted.filter((t) => t.type === "income");
  const expLines = stmt.transactionsSorted.filter((t) => t.type === "expense");
  const ownerLines = stmt.transactionsSorted.filter(
    (t) => t.type === "owner_withdrawal" || t.type === "owner_return",
  );

  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(
      incomeLines.length
        ? buildTransactionExportRows(incomeLines, metaById)
        : [{ Date_time: "(no income rows)" }],
    ),
    "Income_lines",
  );
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(
      expLines.length
        ? buildTransactionExportRows(expLines, metaById)
        : [{ Date_time: "(no expense rows)" }],
    ),
    "Expense_lines",
  );
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(
      ownerLines.length
        ? buildTransactionExportRows(ownerLines, metaById)
        : [{ Date_time: "(no owner rows)" }],
    ),
    "Owner_lines",
  );

  const safeName = fileBaseName.replace(/[^\w\-]+/g, "_").slice(0, 120);
  XLSX.writeFile(wb, `${safeName}.xlsx`);
}
