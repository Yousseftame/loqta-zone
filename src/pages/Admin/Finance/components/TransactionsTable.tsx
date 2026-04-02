/**
 * src/pages/Admin/Finance/components/TransactionsTable.tsx
 *
 * Recent transactions table with columns:
 *   Date · Type · Category · Method · Note · Done By · Balance After · Amount
 *
 * Now shows ALL transactions with client-side pagination (10 rows per page),
 * using the same pagination UI as MarginReportTable.
 *
 * ─── Balance After calculation ────────────────────────────────────────────────
 * Anchors on current available balance and walks backwards through the
 * sorted-desc list, undoing each transaction.
 *
 * ─── Transfer rows ────────────────────────────────────────────────────────────
 * Transfers show a special "Method" cell: "💵 Cash → 🏦 Bank" (or reverse).
 * They show "0 EGP" in the Amount column with a neutral style since they
 * don't change available balance. Balance After stays the same before/after.
 */

import { useState, useMemo } from "react";
import { Box, Paper, Chip } from "@mui/material";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { colors } from "../../Products/products-data";
import {
  CATEGORY_LABEL,
  type Transaction,
  type FinanceStats,
} from "../finance-data";

const PAGE_SIZE = 10;

// ─── Visual chip maps ─────────────────────────────────────────────────────────

const METHOD_CHIP: Record<
  string,
  { label: string; bg: string; color: string }
> = {
  cash: { label: "Cash", bg: "#DBEAFE", color: "#1E40AF" },
  bank: { label: "Bank", bg: "#D1FAE5", color: "#065F46" },
};

const TYPE_CHIP: Record<string, { label: string; bg: string; color: string }> =
  {
    income: { label: "Income", bg: "#D1FAE5", color: "#065F46" },
    expense: { label: "Expense", bg: "#FEE2E2", color: "#991B1B" },
    owner_withdrawal: { label: "Owner", bg: "#FEF3C7", color: "#78350F" },
    transfer: { label: "Transfer", bg: "#EDE9FE", color: "#4C1D95" },
  };

const AMOUNT_STYLE: Record<string, { color: string; sign: string }> = {
  income: { color: "#059669", sign: "+" },
  expense: { color: "#DC2626", sign: "−" },
  owner_withdrawal: { color: "#D97706", sign: "−" },
  transfer: { color: "#7C3AED", sign: "⇄ " },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(d: Date | null) {
  if (!d) return "—";
  return d.toLocaleDateString("en-EG", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function fmtBalance(n: number): string {
  const abs = Math.abs(n).toLocaleString("en-EG");
  return n < 0 ? `−${abs}` : abs;
}

/** Build the method display string for a transaction row */
function buildMethodDisplay(tx: Transaction): string {
  if (tx.type === "transfer") {
    const from = tx.method === "cash" ? "💵 Cash" : "🏦 Bank";
    const to = tx.transferTo === "cash" ? "💵 Cash" : "🏦 Bank";
    return `${from} → ${to}`;
  }
  return tx.method === "cash" ? "💵 Cash" : "🏦 Bank";
}

/**
 * Reconstructs running available balance for every transaction.
 * Transactions arrive sorted newest-first. We anchor on the current
 * available balance and walk backwards, undoing each transaction.
 *
 * Transfers are balance-neutral (they only shift between cash/bank,
 * not the combined available balance) so they don't move the running total.
 */
function computeRunningBalances(
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
      // Transfer doesn't change combined available balance — carry forward
      result[i] = result[i - 1];
    } else {
      // expense + owner_withdrawal both reduce available balance
      result[i] = result[i - 1] + prev.amount;
    }
  }
  return result;
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  transactions: Transaction[];
  stats: FinanceStats;
  loading?: boolean;
}

export default function TransactionsTable({
  transactions,
  stats,
  loading = false,
}: Props) {
  const [page, setPage] = useState(1);

  const currentAvailable = stats.cashBalance + stats.bankBalance;

  // Pre-compute ALL running balances (across the full list, not just current page)
  const allBalances = useMemo(
    () => computeRunningBalances(transactions, currentAvailable),
    [transactions, currentAvailable],
  );

  const totalPages = Math.max(1, Math.ceil(transactions.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);

  const pageStart = (safePage - 1) * PAGE_SIZE;
  const pageEnd = safePage * PAGE_SIZE;
  const pageData = transactions.slice(pageStart, pageEnd);
  const pageBalances = allBalances.slice(pageStart, pageEnd);

  const handlePrev = () => setPage((p) => Math.max(1, p - 1));
  const handleNext = () => setPage((p) => Math.min(totalPages, p + 1));

  const HEADERS = [
    "Date",
    "Type",
    "Category",
    "Method",
    "Note",
    "Done By",
    "Balance After",
    "Amount",
  ];

  return (
    <Paper
      elevation={0}
      sx={{
        borderRadius: 3,
        border: `1px solid ${colors.border}`,
        overflow: "hidden",
      }}
    >
      {/* ── Table header bar ── */}
      <Box
        sx={{
          px: 3,
          py: 2,
          borderBottom: `1px solid ${colors.border}`,
          bgcolor: colors.primaryBg,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 1,
        }}
      >
        <span
          style={{
            fontWeight: 700,
            fontSize: "0.9rem",
            color: colors.primaryDark,
          }}
        >
          Transactions
        </span>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Chip
            label="All Transactions"
            size="small"
            sx={{
              bgcolor: "#DCFCE7",
              color: "#22C55E",
              fontWeight: 700,
              fontSize: "0.68rem",
            }}
          />
          {transactions.length > 0 && (
            <Chip
              label={`${transactions.length} total`}
              size="small"
              sx={{
                bgcolor: colors.primaryBg,
                color: colors.primary,
                fontWeight: 700,
                fontSize: "0.68rem",
                border: `1px solid ${colors.border}`,
              }}
            />
          )}
        </Box>
      </Box>

      {/* ── Table ── */}
      <Box sx={{ overflowX: "auto" }}>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: "0.82rem",
            fontFamily: "system-ui, sans-serif",
          }}
        >
          {/* Column headers */}
          <thead>
            <tr style={{ background: "#F8FAFC" }}>
              {HEADERS.map((h) => (
                <th
                  key={h}
                  style={{
                    padding: "10px 16px",
                    textAlign:
                      h === "Amount" || h === "Balance After"
                        ? "right"
                        : "left",
                    fontWeight: 700,
                    color: colors.textMuted,
                    fontSize: "0.72rem",
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    whiteSpace: "nowrap",
                    borderBottom: `1px solid ${colors.border}`,
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>

          {/* Rows */}
          <tbody>
            {/* ── Skeleton loading ── */}
            {loading ? (
              Array(PAGE_SIZE)
                .fill(0)
                .map((_, i) => (
                  <tr key={i}>
                    {Array(8)
                      .fill(0)
                      .map((_, j) => (
                        <td
                          key={j}
                          style={{
                            padding: "14px 16px",
                            borderBottom: `1px solid ${colors.border}`,
                          }}
                        >
                          <div
                            style={{
                              height: 12,
                              borderRadius: 4,
                              background: "#EFF6FF",
                              width: j >= 6 ? 70 : "80%",
                              animation: "shimmer 1.4s infinite",
                            }}
                          />
                        </td>
                      ))}
                  </tr>
                ))
            ) : transactions.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  style={{
                    padding: "40px 16px",
                    textAlign: "center",
                    color: colors.textMuted,
                  }}
                >
                  No transactions yet
                </td>
              </tr>
            ) : (
              pageData.map((tx, i) => {
                const isTransfer = tx.type === "transfer";
                const typeChip = TYPE_CHIP[tx.type] ?? TYPE_CHIP.income;
                const amtStyle = AMOUNT_STYLE[tx.type] ?? AMOUNT_STYLE.income;
                const bal = pageBalances[i];
                const balNeg = bal < 0;
                const methodLabel = buildMethodDisplay(tx);

                // For transfers: method chip spans the whole from→to string
                // with a purple style instead of the normal cash/bank chip
                const methodChipStyle = isTransfer
                  ? { bg: "#EDE9FE", color: "#4C1D95" }
                  : (METHOD_CHIP[tx.method] ?? METHOD_CHIP.cash);

                const doneBy =
                  tx.createdByName?.trim() ||
                  (tx.createdBy ? `${tx.createdBy.slice(0, 8)}…` : "—");

                // Global row index (for alternating background)
                const globalIdx = pageStart + i;

                return (
                  <tr
                    key={tx.id}
                    style={{
                      background: globalIdx % 2 === 0 ? "#fff" : "#FAFAFA",
                      transition: "background 0.15s",
                    }}
                    onMouseEnter={(e) => {
                      (
                        e.currentTarget as HTMLTableRowElement
                      ).style.background = isTransfer ? "#F5F3FF" : "#EFF6FF";
                    }}
                    onMouseLeave={(e) => {
                      (
                        e.currentTarget as HTMLTableRowElement
                      ).style.background =
                        globalIdx % 2 === 0 ? "#fff" : "#FAFAFA";
                    }}
                  >
                    {/* Date */}
                    <td
                      style={{
                        padding: "12px 16px",
                        borderBottom: `1px solid ${colors.border}`,
                        color: colors.textSecondary,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {fmtDate(tx.createdAt)}
                    </td>

                    {/* Type */}
                    <td
                      style={{
                        padding: "12px 16px",
                        borderBottom: `1px solid ${colors.border}`,
                      }}
                    >
                      <span
                        style={{
                          background: typeChip.bg,
                          color: typeChip.color,
                          borderRadius: 999,
                          padding: "3px 10px",
                          fontSize: "0.72rem",
                          fontWeight: 700,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {typeChip.label}
                      </span>
                    </td>

                    {/* Category */}
                    <td
                      style={{
                        padding: "12px 16px",
                        borderBottom: `1px solid ${colors.border}`,
                        color: colors.primaryDark,
                        fontWeight: 600,
                      }}
                    >
                      {CATEGORY_LABEL[tx.category] ?? tx.category}
                    </td>

                    {/* Method / Transfer direction */}
                    <td
                      style={{
                        padding: "12px 16px",
                        borderBottom: `1px solid ${colors.border}`,
                      }}
                    >
                      <span
                        style={{
                          background: methodChipStyle.bg,
                          color: methodChipStyle.color,
                          borderRadius: 999,
                          padding: "3px 10px",
                          fontSize: "0.72rem",
                          fontWeight: 700,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {methodLabel}
                      </span>
                    </td>

                    {/* Note */}
                    <td
                      style={{
                        padding: "12px 16px",
                        borderBottom: `1px solid ${colors.border}`,
                        color: colors.textSecondary,
                        maxWidth: 160,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {tx.note || "—"}
                    </td>

                    {/* Done By */}
                    <td
                      style={{
                        padding: "12px 16px",
                        borderBottom: `1px solid ${colors.border}`,
                        whiteSpace: "nowrap",
                      }}
                    >
                      <span
                        title={doneBy}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 5,
                          background: "#F1F5F9",
                          border: "1px solid #E2E8F0",
                          borderRadius: 6,
                          padding: "3px 9px",
                          fontSize: "0.72rem",
                          fontWeight: 600,
                          color: colors.primaryDark,
                          maxWidth: 140,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        👤 {doneBy}
                      </span>
                    </td>

                    {/* Balance After */}
                    <td
                      style={{
                        padding: "12px 16px",
                        borderBottom: `1px solid ${colors.border}`,
                        textAlign: "right",
                        whiteSpace: "nowrap",
                      }}
                    >
                      <span
                        style={{
                          display: "inline-block",
                          fontWeight: 700,
                          fontSize: "0.8rem",
                          color: isTransfer
                            ? "#4C1D95"
                            : balNeg
                              ? "#DC2626"
                              : "#0f172a",
                          background: isTransfer
                            ? "#EDE9FE"
                            : balNeg
                              ? "#FEE2E2"
                              : "#F0FDF4",
                          border: `1px solid ${
                            isTransfer
                              ? "#DDD6FE"
                              : balNeg
                                ? "#FECACA"
                                : "#BBF7D0"
                          }`,
                          borderRadius: 6,
                          padding: "3px 9px",
                        }}
                      >
                        {isTransfer ? "—" : `${fmtBalance(bal)} EGP`}
                      </span>
                    </td>

                    {/* Amount */}
                    <td
                      style={{
                        padding: "12px 16px",
                        borderBottom: `1px solid ${colors.border}`,
                        fontWeight: 800,
                        color: amtStyle.color,
                        textAlign: "right",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {isTransfer ? (
                        /* show the transfer amount with neutral style */
                        <span style={{ fontWeight: 700, color: "#7C3AED" }}>
                          ⇄ {tx.amount.toLocaleString("en-EG")} EGP
                        </span>
                      ) : (
                        <>
                          {amtStyle.sign}
                          {tx.amount.toLocaleString("en-EG")} EGP
                        </>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </Box>

      {/* ── Pagination ── */}
      {!loading && totalPages > 1 && (
        <Box
          sx={{
            px: 3,
            py: 1.5,
            borderTop: `1px solid ${colors.border}`,
            bgcolor: "#FAFAFA",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 2,
            flexWrap: "wrap",
          }}
        >
          {/* Row range label */}
          <span
            style={{
              fontSize: "0.75rem",
              color: colors.textMuted,
              fontWeight: 500,
            }}
          >
            Showing{" "}
            <strong style={{ color: colors.textPrimary }}>
              {pageStart + 1}–{Math.min(pageEnd, transactions.length)}
            </strong>{" "}
            of{" "}
            <strong style={{ color: colors.textPrimary }}>
              {transactions.length}
            </strong>{" "}
            transactions
          </span>

          {/* Controls */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
            {/* Prev */}
            <button
              onClick={handlePrev}
              disabled={safePage === 1}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 30,
                height: 30,
                borderRadius: 7,
                border: `1px solid ${colors.border}`,
                background: safePage === 1 ? "#F1F5F9" : "#fff",
                color: safePage === 1 ? colors.textMuted : colors.primary,
                cursor: safePage === 1 ? "not-allowed" : "pointer",
                transition: "all 0.15s",
              }}
            >
              <ChevronLeft size={14} />
            </button>

            {/* Page pills */}
            {Array.from({ length: totalPages }, (_, idx) => idx + 1)
              .filter(
                (p) =>
                  p === 1 || p === totalPages || Math.abs(p - safePage) <= 1,
              )
              .reduce<(number | "…")[]>((acc, p, i, arr) => {
                if (i > 0) {
                  const prev = arr[i - 1] as number;
                  if (p - prev > 1) acc.push("…");
                }
                acc.push(p);
                return acc;
              }, [])
              .map((item, idx) =>
                item === "…" ? (
                  <span
                    key={`ellipsis-${idx}`}
                    style={{
                      fontSize: "0.75rem",
                      color: colors.textMuted,
                      padding: "0 2px",
                    }}
                  >
                    …
                  </span>
                ) : (
                  <button
                    key={item}
                    onClick={() => setPage(item as number)}
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: 7,
                      border: `1px solid ${item === safePage ? colors.primary : colors.border}`,
                      background: item === safePage ? colors.primary : "#fff",
                      color: item === safePage ? "#fff" : colors.textPrimary,
                      fontSize: "0.75rem",
                      fontWeight: item === safePage ? 700 : 500,
                      cursor: "pointer",
                      transition: "all 0.15s",
                    }}
                  >
                    {item}
                  </button>
                ),
              )}

            {/* Next */}
            <button
              onClick={handleNext}
              disabled={safePage === totalPages}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 30,
                height: 30,
                borderRadius: 7,
                border: `1px solid ${colors.border}`,
                background: safePage === totalPages ? "#F1F5F9" : "#fff",
                color:
                  safePage === totalPages ? colors.textMuted : colors.primary,
                cursor: safePage === totalPages ? "not-allowed" : "pointer",
                transition: "all 0.15s",
              }}
            >
              <ChevronRight size={14} />
            </button>
          </Box>
        </Box>
      )}
    </Paper>
  );
}
