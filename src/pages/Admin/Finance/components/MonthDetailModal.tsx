/**
 * MonthDetailModal.tsx
 *
 * Modal that shows all transactions for a specific calendar month,
 * grouped and summarised like a financial receipt/invoice.
 * Called from NetProfitLoss when the user clicks a month row.
 */

import { useMemo } from "react";
import {
  TrendingUp,
  TrendingDown,
  X,
  Receipt,
  ArrowUpCircle,
  ArrowDownCircle,
  ArrowLeftRight,
  UserMinus,
  UserPlus,
  Layers,
} from "lucide-react";
import { colors } from "../../Products/products-data";
import {
  CATEGORY_LABEL,
  type Transaction,
} from "../finance-data";

// ─── Types ────────────────────────────────────────────────────────────────────

interface MonthDetailModalProps {
  open: boolean;
  onClose: () => void;
  monthLabel: string; // e.g. "April 2026"
  transactions: Transaction[];
  net: number;
  income: number;
  expenses: number;
  ownerDraws: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function fmtEGP(n: number): string {
  return `${Math.abs(n).toLocaleString("en-EG")} EGP`;
}

function fmtDate(d: Date | null): string {
  if (!d) return "—";
  return d.toLocaleDateString("en-EG", { day: "2-digit", month: "short" });
}

function fmtTime(d: Date | null): string {
  if (!d) return "";
  return d.toLocaleTimeString("en-EG", { hour: "2-digit", minute: "2-digit" });
}

const TYPE_CONFIG: Record<
  string,
  {
    label: string;
    icon: React.ReactNode;
    amountColor: string;
    sign: string;
    bg: string;
    border: string;
  }
> = {
  income: {
    label: "Income",
    sign: "+",
    amountColor: "#059669",
    bg: "#ECFDF5",
    border: "#A7F3D0",
    icon: <ArrowUpCircle size={13} color="#059669" />,
  },
  expense: {
    label: "Expense",
    sign: "−",
    amountColor: "#DC2626",
    bg: "#FEF2F2",
    border: "#FECACA",
    icon: <ArrowDownCircle size={13} color="#DC2626" />,
  },
  owner_withdrawal: {
    label: "Owner Draw",
    sign: "−",
    amountColor: "#D97706",
    bg: "#FFFBEB",
    border: "#FDE68A",
    icon: <UserMinus size={13} color="#D97706" />,
  },
  owner_return: {
    label: "Owner Return",
    sign: "+",
    amountColor: "#10B981",
    bg: "#ECFDF5",
    border: "#6EE7B7",
    icon: <UserPlus size={13} color="#10B981" />,
  },
  transfer: {
    label: "Transfer",
    sign: "⇄",
    amountColor: "#7C3AED",
    bg: "#F5F3FF",
    border: "#DDD6FE",
    icon: <ArrowLeftRight size={13} color="#7C3AED" />,
  },
};

function SummaryRow({
  label,
  amount,
  color,
  bg,
  icon,
}: {
  label: string;
  amount: number;
  color: string;
  bg: string;
  icon: React.ReactNode;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "10px 16px",
        borderRadius: 10,
        background: bg,
        marginBottom: 6,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {icon}
        <span
          style={{ fontSize: "0.82rem", fontWeight: 600, color: "#374151" }}
        >
          {label}
        </span>
      </div>
      <span
        style={{
          fontSize: "0.9rem",
          fontWeight: 800,
          color,
          fontFamily: "system-ui,sans-serif",
        }}
      >
        {fmtEGP(amount)}
      </span>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function MonthDetailModal({
  open,
  onClose,
  monthLabel,
  transactions,
  net,
  income,
  expenses,
  ownerDraws,
}: MonthDetailModalProps) {
  if (!open) return null;

  // Group transactions by type for the receipt view
  const grouped = useMemo(() => {
    const groups: Record<string, Transaction[]> = {
      income: [],
      expense: [],
      owner_withdrawal: [],
      owner_return: [],
      transfer: [],
    };
    for (const tx of transactions) {
      if (groups[tx.type]) groups[tx.type].push(tx);
    }
    return groups;
  }, [transactions]);

  const isProfit = net > 0;
  const isLoss = net < 0;

  const accentColor = isLoss ? "#DC2626" : isProfit ? "#059669" : "#64748B";
  const accentBg = isLoss ? "#FEF2F2" : isProfit ? "#ECFDF5" : "#F8FAFC";
  const statusLabel = isLoss
    ? "📉 Loss"
    : isProfit
      ? "📈 Profit"
      : "➖ Break-even";

  const transactionCount = transactions.length;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 9998,
          background: "rgba(15,23,42,0.5)",
          backdropFilter: "blur(6px)",
          animation: "mfd-fadein 0.18s ease forwards",
        }}
      />

      {/* Modal */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 9999,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 16,
          pointerEvents: "none",
        }}
      >
        <div
          style={{
            pointerEvents: "all",
            background: "#ffffff",
            borderRadius: 20,
            boxShadow:
              "0 32px 80px rgba(15,23,42,0.2), 0 0 0 1px rgba(226,232,240,0.8)",
            width: "100%",
            maxWidth: 680,
            maxHeight: "90vh",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            animation:
              "mfd-slidein 0.24s cubic-bezier(0.34,1.56,0.64,1) forwards",
          }}
        >
          {/* ── Header ── */}
          <div
            style={{
              padding: "20px 24px 16px",
              borderBottom: `1px solid ${colors.border}`,
              background: "linear-gradient(135deg, #EFF6FF 0%, #F0FDF4 100%)",
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              flexShrink: 0,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 12,
                  background: accentColor,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Receipt size={20} color="#fff" />
              </div>
              <div>
                <div
                  style={{
                    fontSize: "1.1rem",
                    fontWeight: 800,
                    color: "#0F172A",
                    fontFamily: "system-ui, sans-serif",
                  }}
                >
                  {monthLabel} — Monthly Report
                </div>
                <div
                  style={{
                    fontSize: "0.72rem",
                    color: "#64748B",
                    fontWeight: 500,
                    marginTop: 2,
                  }}
                >
                  {transactionCount} transaction
                  {transactionCount !== 1 ? "s" : ""} · Income − Expenses −
                  Owner Draws
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                border: `1px solid ${colors.border}`,
                background: "#fff",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#94A3B8",
                transition: "all 0.15s",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.color = "#0F172A";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.color = "#94A3B8";
              }}
            >
              <X size={16} />
            </button>
          </div>

          {/* ── Scrollable Body ── */}
          <div style={{ overflowY: "auto", flex: 1 }}>
            {/* ── Net Summary Banner ── */}
            <div style={{ padding: "20px 24px 0" }}>
              <div
                style={{
                  borderRadius: 16,
                  background: accentBg,
                  border: `2px solid ${accentColor}22`,
                  padding: "18px 20px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: 12,
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: "0.65rem",
                      fontWeight: 800,
                      letterSpacing: "0.14em",
                      textTransform: "uppercase",
                      color: "#94A3B8",
                      marginBottom: 6,
                    }}
                  >
                    Net Profit &amp; Loss
                  </div>
                  <div
                    style={{
                      fontSize: "2rem",
                      fontWeight: 900,
                      color: accentColor,
                      fontFamily: "system-ui,sans-serif",
                      letterSpacing: "-0.03em",
                      lineHeight: 1,
                    }}
                  >
                    {isLoss ? "−" : isProfit ? "+" : ""}
                    {fmtEGP(Math.abs(net))}
                  </div>
                </div>
                <div
                  style={{
                    background: accentColor,
                    color: "#fff",
                    borderRadius: 10,
                    padding: "8px 16px",
                    fontSize: "0.78rem",
                    fontWeight: 700,
                  }}
                >
                  {statusLabel}
                </div>
              </div>
            </div>

            {/* ── Summary Breakdown ── */}
            <div style={{ padding: "16px 24px 0" }}>
              <div
                style={{
                  fontSize: "0.65rem",
                  fontWeight: 800,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: "#94A3B8",
                  marginBottom: 10,
                }}
              >
                Summary
              </div>
              <SummaryRow
                label="Total Income"
                amount={income}
                color="#059669"
                bg="#ECFDF5"
                icon={<ArrowUpCircle size={15} color="#059669" />}
              />
              <SummaryRow
                label="Total Expenses"
                amount={expenses}
                color="#DC2626"
                bg="#FEF2F2"
                icon={<ArrowDownCircle size={15} color="#DC2626" />}
              />
              <SummaryRow
                label="Owner Draws"
                amount={ownerDraws}
                color="#D97706"
                bg="#FFFBEB"
                icon={<UserMinus size={15} color="#D97706" />}
              />

              {/* Divider with formula */}
              <div
                style={{
                  margin: "12px 0",
                  padding: "10px 14px",
                  background: "#F8FAFC",
                  borderRadius: 8,
                  border: `1px solid ${colors.border}`,
                  fontSize: "0.72rem",
                  color: "#64748B",
                  fontWeight: 500,
                }}
              >
                <span style={{ fontFamily: "monospace", fontSize: "0.78rem" }}>
                  Net = {income.toLocaleString("en-EG")} −{" "}
                  {expenses.toLocaleString("en-EG")} −{" "}
                  {ownerDraws.toLocaleString("en-EG")} ={" "}
                  <strong style={{ color: accentColor }}>
                    {net > 0 ? "+" : ""}
                    {net.toLocaleString("en-EG")} EGP
                  </strong>
                </span>
              </div>
            </div>

            {/* ── Transaction Groups ── */}
            {(
              [
                "income",
                "expense",
                "owner_withdrawal",
                "owner_return",
                "transfer",
              ] as const
            ).map((type) => {
              const txs = grouped[type];
              if (!txs || txs.length === 0) return null;
              const cfg = TYPE_CONFIG[type];
              const typeTotal = txs.reduce((s, t) => s + t.amount, 0);

              return (
                <div key={type} style={{ padding: "16px 24px 0" }}>
                  {/* Group header */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: 8,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 7,
                        fontSize: "0.7rem",
                        fontWeight: 800,
                        letterSpacing: "0.1em",
                        textTransform: "uppercase",
                        color: "#64748B",
                      }}
                    >
                      {cfg.icon}
                      {cfg.label}s ({txs.length})
                    </div>
                    <span
                      style={{
                        fontSize: "0.82rem",
                        fontWeight: 700,
                        color: cfg.amountColor,
                      }}
                    >
                      {cfg.sign} {fmtEGP(typeTotal)}
                    </span>
                  </div>

                  {/* Transaction rows */}
                  <div
                    style={{
                      borderRadius: 12,
                      border: `1px solid ${cfg.border}`,
                      overflow: "hidden",
                      background: "#fff",
                    }}
                  >
                    {txs.map((tx, idx) => {
                      const isSplit = !!tx.groupId;
                      const isLast = idx === txs.length - 1;
                      return (
                        <div
                          key={tx.id}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            padding: "10px 14px",
                            borderBottom: isLast ? "none" : `1px solid #F1F5F9`,
                            background: idx % 2 === 0 ? "#fff" : cfg.bg + "50",
                            gap: 12,
                            transition: "background 0.12s",
                          }}
                        >
                          {/* Date & time */}
                          <div
                            style={{
                              flexShrink: 0,
                              textAlign: "center",
                              minWidth: 50,
                            }}
                          >
                            <div
                              style={{
                                fontSize: "0.72rem",
                                fontWeight: 700,
                                color: "#1E293B",
                              }}
                            >
                              {fmtDate(tx.createdAt)}
                            </div>
                            <div
                              style={{
                                fontSize: "0.62rem",
                                color: "#94A3B8",
                                marginTop: 1,
                              }}
                            >
                              {fmtTime(tx.createdAt)}
                            </div>
                          </div>

                          {/* Divider */}
                          <div
                            style={{
                              width: 1,
                              height: 30,
                              background: "#E2E8F0",
                              flexShrink: 0,
                            }}
                          />

                          {/* Category & note */}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div
                              style={{
                                fontSize: "0.78rem",
                                fontWeight: 600,
                                color: "#1E293B",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {CATEGORY_LABEL[tx.category] ?? tx.category}
                              {isSplit && tx.splitLabel && (
                                <span
                                  style={{
                                    marginLeft: 6,
                                    fontSize: "0.62rem",
                                    fontWeight: 700,
                                    background: "#F5F3FF",
                                    color: "#7C3AED",
                                    borderRadius: 4,
                                    padding: "1px 5px",
                                  }}
                                >
                                  🔀 {tx.splitLabel}
                                </span>
                              )}
                            </div>
                            {tx.note && (
                              <div
                                style={{
                                  fontSize: "0.68rem",
                                  color: "#94A3B8",
                                  marginTop: 2,
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {tx.note}
                              </div>
                            )}
                          </div>

                          {/* Method badge */}
                          <div
                            style={{
                              fontSize: "0.62rem",
                              fontWeight: 700,
                              flexShrink: 0,
                              background:
                                tx.method === "cash" ? "#DBEAFE" : "#D1FAE5",
                              color:
                                tx.method === "cash" ? "#1E40AF" : "#065F46",
                              borderRadius: 5,
                              padding: "2px 7px",
                            }}
                          >
                            {tx.method === "cash" ? "💵" : "🏦"}{" "}
                            {tx.method === "cash" ? "Cash" : "Bank"}
                            {type === "transfer" && tx.transferTo && (
                              <> → {tx.transferTo === "cash" ? "💵" : "🏦"}</>
                            )}
                          </div>

                          {/* Amount */}
                          <div
                            style={{
                              flexShrink: 0,
                              minWidth: 90,
                              textAlign: "right",
                              fontSize: "0.85rem",
                              fontWeight: 800,
                              color: cfg.amountColor,
                              fontFamily: "system-ui,sans-serif",
                            }}
                          >
                            {cfg.sign} {tx.amount.toLocaleString("en-EG")} EGP
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {/* Empty state */}
            {transactionCount === 0 && (
              <div
                style={{
                  padding: "48px 24px",
                  textAlign: "center",
                  color: "#94A3B8",
                  fontSize: "0.85rem",
                }}
              >
                No transactions recorded for {monthLabel}
              </div>
            )}

            {/* Bottom padding */}
            <div style={{ height: 24 }} />
          </div>

          {/* ── Footer ── */}
          <div
            style={{
              padding: "14px 24px",
              borderTop: `1px solid ${colors.border}`,
              background: "#F8FAFC",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexShrink: 0,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Layers size={13} color="#94A3B8" />
              <span
                style={{
                  fontSize: "0.72rem",
                  color: "#94A3B8",
                  fontWeight: 500,
                }}
              >
                {transactionCount} transaction
                {transactionCount !== 1 ? "s" : ""} in {monthLabel}
              </span>
            </div>
            <button
              onClick={onClose}
              style={{
                padding: "8px 20px",
                borderRadius: 8,
                border: `1.5px solid ${colors.border}`,
                background: "#fff",
                color: "#374151",
                fontSize: "0.8rem",
                fontWeight: 700,
                cursor: "pointer",
                transition: "all 0.15s",
                fontFamily: "system-ui, sans-serif",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background =
                  "#F1F5F9";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background =
                  "#fff";
              }}
            >
              Close
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes mfd-fadein  { from { opacity: 0 } to { opacity: 1 } }
        @keyframes mfd-slidein { from { opacity: 0; transform: translateY(20px) scale(0.97) } to { opacity: 1; transform: translateY(0) scale(1) } }
      `}</style>
    </>
  );
}
