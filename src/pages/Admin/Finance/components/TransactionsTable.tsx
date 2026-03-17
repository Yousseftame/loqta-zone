/**
 * src/pages/Admin/Finance/components/TransactionsTable.tsx
 *
 * Recent transactions table — same card shell as the rest of the dashboard.
 */

import { Box, Paper, Chip } from "@mui/material";
import { colors } from "../../Products/products-data";
import { CATEGORY_LABEL, type Transaction } from "../finance-data";

const METHOD_CHIP = {
  cash: { label: "Cash", bg: "#DBEAFE", color: "#1E40AF" },
  bank: { label: "Bank", bg: "#D1FAE5", color: "#065F46" },
};

const TYPE_CHIP = {
  income: { label: "Income", bg: "#D1FAE5", color: "#065F46" },
  expense: { label: "Expense", bg: "#FEE2E2", color: "#991B1B" },
};

function fmtDate(d: Date | null) {
  if (!d) return "—";
  return d.toLocaleDateString("en-EG", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

interface Props {
  transactions: Transaction[];
  loading?: boolean;
}

export default function TransactionsTable({
  transactions,
  loading = false,
}: Props) {
  return (
    <Paper
      elevation={0}
      sx={{
        borderRadius: 3,
        border: `1px solid ${colors.border}`,
        overflow: "hidden",
      }}
    >
      {/* Header */}
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

      {/* Table */}
      <Box sx={{ overflowX: "auto" }}>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: "0.82rem",
            fontFamily: "system-ui, sans-serif",
          }}
        >
          <thead>
            <tr style={{ background: "#F8FAFC" }}>
              {["Date", "Type", "Category", "Method", "Note", "Amount"].map(
                (h) => (
                  <th
                    key={h}
                    style={{
                      padding: "10px 16px",
                      textAlign: "left",
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
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array(5)
                .fill(0)
                .map((_, i) => (
                  <tr key={i}>
                    {Array(6)
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
                              width: j === 5 ? 70 : "80%",
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
                  colSpan={6}
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
              transactions.map((tx, i) => {
                const typeChip = TYPE_CHIP[tx.type];
                const methodChip = METHOD_CHIP[tx.method];
                const isExpense = tx.type === "expense";
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
                        }}
                      >
                        {typeChip.label}
                      </span>
                    </td>
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
                    <td
                      style={{
                        padding: "12px 16px",
                        borderBottom: `1px solid ${colors.border}`,
                        color: colors.textSecondary,
                        maxWidth: 220,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {tx.note || "—"}
                    </td>
                    <td
                      style={{
                        padding: "12px 16px",
                        borderBottom: `1px solid ${colors.border}`,
                        fontWeight: 800,
                        color: isExpense ? "#DC2626" : "#059669",
                        textAlign: "right",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {isExpense ? "−" : "+"}
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
