/**
 * src/pages/Admin/Finance/components/TransactionsTable.tsx
 *
 * Recent transactions table with columns:
 *   Date · Type · Category · Method · Note · Done By · Balance After · Amount
 *
 * ─── Balance After calculation ────────────────────────────────────────────────
 * "Available Balance" = cashBalance + bankBalance (the liquid business money).
 * Owner withdrawals reduce cashBalance or bankBalance, so they also reduce
 * the available balance — exactly like an expense.
 *
 * Transactions arrive sorted newest-first (desc by createdAt).
 * We anchor on the CURRENT available balance (cashBalance + bankBalance from stats)
 * and walk backwards, undoing each transaction to reconstruct the historical balance.
 *
 *   Walk rule:
 *     income            → added money to available  → undo by subtracting
 *     expense           → removed money             → undo by adding
 *     owner_withdrawal  → removed money             → undo by adding (same as expense)
 *
 * Zero extra Firestore reads — uses only data already in memory.
 */

import { Box, Paper, Chip } from "@mui/material";
import { colors } from "../../Products/products-data";
import {
  CATEGORY_LABEL,
  type Transaction,
  type FinanceStats,
} from "../finance-data";

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
  };

// Amount color / sign by type
const AMOUNT_STYLE: Record<string, { color: string; sign: string }> = {
  income: { color: "#059669", sign: "+" },
  expense: { color: "#DC2626", sign: "−" },
  owner_withdrawal: { color: "#D97706", sign: "−" },
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

/**
 * Reconstructs running available balance (cashBalance + bankBalance) at the
 * moment of each transaction, starting from the current available balance and
 * walking backwards through the sorted-desc transaction list.
 *
 * Rule:
 *   income            → added to available  → undo: subtract
 *   expense           → removed             → undo: add
 *   owner_withdrawal  → removed (same as expense) → undo: add
 */
function computeRunningBalances(
  transactions: Transaction[],
  currentAvailable: number,
): number[] {
  const result: number[] = new Array(transactions.length).fill(0);
  if (transactions.length === 0) return result;

  // Index 0 = most recent tx → its "balance after" equals current available
  result[0] = currentAvailable;

  for (let i = 1; i < transactions.length; i++) {
    const prev = transactions[i - 1];
    // Undo prev transaction to get the balance before it was applied
    if (prev.type === "income") {
      result[i] = result[i - 1] - prev.amount; // income added → subtract to go back
    } else {
      // expense or owner_withdrawal both removed money → add back to go back
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
  const currentAvailable = stats.cashBalance + stats.bankBalance;
  const balances = computeRunningBalances(transactions, currentAvailable);

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
        }}
      >
        <span
          style={{
            fontWeight: 700,
            fontSize: "0.9rem",
            color: colors.primaryDark,
          }}
        >
          Recent Transactions
        </span>
        <Chip
          label={`Last ${transactions.length}`}
          size="small"
          sx={{
            bgcolor: colors.primary,
            color: "#fff",
            fontWeight: 700,
            fontSize: "0.68rem",
          }}
        />
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
              Array(5)
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
            ) : /* ── Empty state ── */
            transactions.length === 0 ? (
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
              /* ── Data rows ── */
              transactions.map((tx, i) => {
                const typeChip = TYPE_CHIP[tx.type] ?? TYPE_CHIP.income;
                const methodChip = METHOD_CHIP[tx.method] ?? METHOD_CHIP.cash;
                const amtStyle = AMOUNT_STYLE[tx.type] ?? AMOUNT_STYLE.income;
                const bal = balances[i];
                const balNeg = bal < 0;

                // Done By: prefer stored name, fall back to truncated uid
                const doneBy =
                  tx.createdByName?.trim() ||
                  (tx.createdBy ? `${tx.createdBy.slice(0, 8)}…` : "—");

                return (
                  <tr
                    key={tx.id}
                    style={{
                      background: i % 2 === 0 ? "#fff" : "#FAFAFA",
                      transition: "background 0.15s",
                    }}
                    onMouseEnter={(e) => {
                      (
                        e.currentTarget as HTMLTableRowElement
                      ).style.background = "#EFF6FF";
                    }}
                    onMouseLeave={(e) => {
                      (
                        e.currentTarget as HTMLTableRowElement
                      ).style.background = i % 2 === 0 ? "#fff" : "#FAFAFA";
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

                    {/* Method */}
                    <td
                      style={{
                        padding: "12px 16px",
                        borderBottom: `1px solid ${colors.border}`,
                      }}
                    >
                      <span
                        style={{
                          background: methodChip.bg,
                          color: methodChip.color,
                          borderRadius: 999,
                          padding: "3px 10px",
                          fontSize: "0.72rem",
                          fontWeight: 700,
                        }}
                      >
                        {methodChip.label}
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
                          color: balNeg ? "#DC2626" : "#0f172a",
                          background: balNeg ? "#FEE2E2" : "#F0FDF4",
                          border: `1px solid ${balNeg ? "#FECACA" : "#BBF7D0"}`,
                          borderRadius: 6,
                          padding: "3px 9px",
                        }}
                      >
                        {fmtBalance(bal)} EGP
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
                      {amtStyle.sign}
                      {tx.amount.toLocaleString("en-EG")} EGP
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </Box>
    </Paper>
  );
}
