/**
 * MonthDetailModal.tsx
 *
 * Changes in this version:
 * 1. Split payment parts are sorted by part number (Part 1, 2, 3… in order).
 * 2. Split parts sharing a groupId are visually grouped inside a single
 *    bordered container with a group header showing totals — making it easy
 *    to distinguish two adjacent split groups from one another.
 * 3. Full mobile responsiveness: wrapping flex layouts, smaller text on
 *    narrow screens, truncation replaced with wrapping where needed.
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
import { CATEGORY_LABEL, type Transaction } from "../finance-data";
import {
  buildMethodDisplay,
  type PaymentAccount,
} from "@/hooks/usePaymentAccounts";

// ─── Types ────────────────────────────────────────────────────────────────────

interface MonthDetailModalProps {
  open: boolean;
  onClose: () => void;
  monthLabel: string;
  transactions: Transaction[];
  net: number;
  income: number;
  expenses: number;
  ownerDraws: number;
  paymentAccounts?: PaymentAccount[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

/** Extract numeric part number from "Part 3 of 8" → 3 */
function parseSplitPartNumber(label: string | undefined): number {
  if (!label) return Infinity;
  const m = label.match(/^Part\s+(\d+)/i);
  return m ? parseInt(m[1], 10) : Infinity;
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
    groupHeaderBg: string;
    groupHeaderBorder: string;
  }
> = {
  income: {
    label: "Income",
    sign: "+",
    amountColor: "#059669",
    bg: "#ECFDF5",
    border: "#A7F3D0",
    groupHeaderBg: "#D1FAE5",
    groupHeaderBorder: "#6EE7B7",
    icon: <ArrowUpCircle size={13} color="#059669" />,
  },
  expense: {
    label: "Expense",
    sign: "−",
    amountColor: "#DC2626",
    bg: "#FEF2F2",
    border: "#FECACA",
    groupHeaderBg: "#FEE2E2",
    groupHeaderBorder: "#FCA5A5",
    icon: <ArrowDownCircle size={13} color="#DC2626" />,
  },
  owner_withdrawal: {
    label: "Owner Draw",
    sign: "−",
    amountColor: "#D97706",
    bg: "#FFFBEB",
    border: "#FDE68A",
    groupHeaderBg: "#FEF3C7",
    groupHeaderBorder: "#FCD34D",
    icon: <UserMinus size={13} color="#D97706" />,
  },
  owner_return: {
    label: "Owner Return",
    sign: "+",
    amountColor: "#10B981",
    bg: "#ECFDF5",
    border: "#6EE7B7",
    groupHeaderBg: "#D1FAE5",
    groupHeaderBorder: "#A7F3D0",
    icon: <UserPlus size={13} color="#10B981" />,
  },
  transfer: {
    label: "Transfer",
    sign: "⇄",
    amountColor: "#7C3AED",
    bg: "#F5F3FF",
    border: "#DDD6FE",
    groupHeaderBg: "#EDE9FE",
    groupHeaderBorder: "#C4B5FD",
    icon: <ArrowLeftRight size={13} color="#7C3AED" />,
  },
};

// ─── Summary Row ──────────────────────────────────────────────────────────────

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
        flexWrap: "wrap",
        gap: 6,
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

// ─── Single transaction row (non-split or individual split part) ──────────────

function TxRow({
  tx,
  cfg,
  isLast,
  isInsideGroup,
  partIndex,
  paymentAccounts = [],
}: {
  tx: Transaction;
  cfg: (typeof TYPE_CONFIG)[string];
  isLast: boolean;
  isInsideGroup: boolean;
  partIndex?: number;
  paymentAccounts?: PaymentAccount[];
}) {
  const methodLabel = buildMethodDisplay(tx, paymentAccounts);
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        padding: "10px 14px",
        borderBottom: isLast ? "none" : "1px solid #F1F5F9",
        background: isInsideGroup
          ? partIndex !== undefined && partIndex % 2 === 0
            ? "#ffffff"
            : cfg.bg + "50"
          : "#ffffff",
        gap: 10,
        flexWrap: "wrap",
      }}
    >
      {/* Date & time */}
      <div style={{ flexShrink: 0, minWidth: 46, textAlign: "center" }}>
        <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "#1E293B" }}>
          {fmtDate(tx.createdAt)}
        </div>
        <div style={{ fontSize: "0.62rem", color: "#94A3B8", marginTop: 1 }}>
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
          alignSelf: "center",
        }}
      />

      {/* Category & note */}
      <div style={{ flex: 1, minWidth: 100 }}>
        <div
          style={{
            fontSize: "0.78rem",
            fontWeight: 600,
            color: "#1E293B",
            wordBreak: "break-word",
          }}
        >
          {CATEGORY_LABEL[tx.category] ?? tx.category}
        </div>
        {tx.note && (
          <div
            style={{
              fontSize: "0.68rem",
              color: "#94A3B8",
              marginTop: 2,
              wordBreak: "break-word",
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
          background: tx.method === "cash" ? "#DBEAFE" : "#D1FAE5",
          color: tx.method === "cash" ? "#1E40AF" : "#065F46",
          borderRadius: 5,
          padding: "2px 7px",
          alignSelf: "center",
          whiteSpace: "nowrap",
          maxWidth: "min(200px, 45vw)",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
        title={methodLabel}
      >
        {methodLabel}
      </div>

      {/* Amount */}
      <div
        style={{
          flexShrink: 0,
          minWidth: 80,
          textAlign: "right",
          fontSize: "0.85rem",
          fontWeight: 800,
          color: cfg.amountColor,
          fontFamily: "system-ui,sans-serif",
          alignSelf: "center",
        }}
      >
        {cfg.sign} {tx.amount.toLocaleString("en-EG")} EGP
      </div>
    </div>
  );
}

// ─── Split group card ─────────────────────────────────────────────────────────

function SplitGroupCard({
  parts,
  cfg,
  groupIndex,
  paymentAccounts = [],
}: {
  parts: Transaction[];
  cfg: (typeof TYPE_CONFIG)[string];
  groupIndex: number;
  paymentAccounts?: PaymentAccount[];
}) {
  const sortedParts = [...parts].sort(
    (a, b) =>
      parseSplitPartNumber(a.splitLabel) - parseSplitPartNumber(b.splitLabel),
  );

  const total = sortedParts.reduce((s, p) => s + p.amount, 0);
  const cashTotal = sortedParts
    .filter((p) => p.method === "cash")
    .reduce((s, p) => s + p.amount, 0);
  const bankTotal = sortedParts
    .filter((p) => p.method === "bank")
    .reduce((s, p) => s + p.amount, 0);

  const firstTx = sortedParts[0];

  return (
    <div
      style={{
        borderRadius: 12,
        border: `2px solid ${cfg.groupHeaderBorder}`,
        overflow: "hidden",
        background: "#fff",
        marginBottom: 10,
      }}
    >
      {/* Group header */}
      <div
        style={{
          background: cfg.groupHeaderBg,
          padding: "8px 14px",
          borderBottom: `1px solid ${cfg.groupHeaderBorder}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 6,
        }}
      >
        {/* Left: icon + label + date */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            flexWrap: "wrap",
          }}
        >
          {/* Split badge */}
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              background: "#7C3AED",
              color: "#fff",
              borderRadius: 999,
              padding: "2px 9px",
              fontSize: "0.65rem",
              fontWeight: 800,
              letterSpacing: "0.04em",
              whiteSpace: "nowrap",
            }}
          >
            🔀 Split · {sortedParts.length} parts
          </span>

          {/* Date */}
          <span
            style={{
              fontSize: "0.68rem",
              color: "#64748B",
              fontWeight: 500,
              whiteSpace: "nowrap",
            }}
          >
            {fmtDate(firstTx?.createdAt)} {fmtTime(firstTx?.createdAt)}
          </span>
        </div>

        {/* Right: method breakdown + total */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            flexWrap: "wrap",
          }}
        >
          {cashTotal > 0 && (
            <span
              style={{
                fontSize: "0.68rem",
                fontWeight: 700,
                color: "#1E40AF",
                background: "#DBEAFE",
                borderRadius: 5,
                padding: "2px 7px",
                whiteSpace: "nowrap",
              }}
            >
              💵 {cashTotal.toLocaleString("en-EG")} EGP
            </span>
          )}
          {bankTotal > 0 && (
            <span
              style={{
                fontSize: "0.68rem",
                fontWeight: 700,
                color: "#065F46",
                background: "#D1FAE5",
                borderRadius: 5,
                padding: "2px 7px",
                whiteSpace: "nowrap",
              }}
            >
              🏦 {bankTotal.toLocaleString("en-EG")} EGP
            </span>
          )}
          <span
            style={{
              fontSize: "0.78rem",
              fontWeight: 800,
              color: cfg.amountColor,
              fontFamily: "system-ui,sans-serif",
              whiteSpace: "nowrap",
            }}
          >
            = {cfg.sign} {total.toLocaleString("en-EG")} EGP
          </span>
        </div>
      </div>

      {/* Parts list */}
      {sortedParts.map((tx, idx) => {
        const isLast = idx === sortedParts.length - 1;
        return (
          <div key={tx.id}>
            {/* Part number pill */}
            <div
              style={{
                padding: "4px 14px 0",
                background: cfg.bg + "60",
              }}
            >
              <span
                style={{
                  display: "inline-block",
                  fontSize: "0.6rem",
                  fontWeight: 800,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase" as const,
                  background: cfg.amountColor,
                  color: "#fff",
                  borderRadius: 999,
                  padding: "1px 8px",
                }}
              >
                {tx.splitLabel ?? `Part ${idx + 1}`}
              </span>
            </div>
            <TxRow
              tx={tx}
              cfg={cfg}
              isLast={isLast}
              isInsideGroup
              partIndex={idx}
              paymentAccounts={paymentAccounts}
            />
          </div>
        );
      })}
    </div>
  );
}

// ─── Transaction group section (one type: income / expense / …) ──────────────

function TypeSection({
  type,
  txs,
  cfg,
  paymentAccounts = [],
}: {
  type: string;
  txs: Transaction[];
  cfg: (typeof TYPE_CONFIG)[string];
  paymentAccounts?: PaymentAccount[];
}) {
  // Separate split parts from standalone transactions
  const groupMap = new Map<string, Transaction[]>();
  const standalone: Transaction[] = [];

  for (const tx of txs) {
    if (tx.groupId) {
      const arr = groupMap.get(tx.groupId) ?? [];
      arr.push(tx);
      groupMap.set(tx.groupId, arr);
    } else {
      standalone.push(tx);
    }
  }

  // Build ordered list: standalone txs interleaved with split groups
  // preserving the original insertion order (first part seen = group position)
  type Item =
    | { kind: "standalone"; tx: Transaction }
    | { kind: "group"; groupId: string; parts: Transaction[] };

  const items: Item[] = [];
  const emittedGroups = new Set<string>();

  for (const tx of txs) {
    if (!tx.groupId) {
      items.push({ kind: "standalone", tx });
    } else if (!emittedGroups.has(tx.groupId)) {
      emittedGroups.add(tx.groupId);
      items.push({
        kind: "group",
        groupId: tx.groupId,
        parts: groupMap.get(tx.groupId) ?? [],
      });
    }
  }

  const typeTotal = txs.reduce((s, t) => s + t.amount, 0);

  return (
    <div style={{ padding: "16px 24px 0" }}>
      {/* Section header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 10,
          flexWrap: "wrap",
          gap: 6,
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
            textTransform: "uppercase" as const,
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
            whiteSpace: "nowrap",
          }}
        >
          {cfg.sign} {fmtEGP(typeTotal)}
        </span>
      </div>

      {/* Items */}
      {items.map((item, i) => {
        if (item.kind === "group") {
          return (
            <SplitGroupCard
              key={item.groupId}
              parts={item.parts}
              cfg={cfg}
              groupIndex={i}
              paymentAccounts={paymentAccounts}
            />
          );
        }

        // Standalone transaction (no group)
        const isLast = i === items.length - 1;
        return (
          <div
            key={item.tx.id}
            style={{
              borderRadius: 12,
              border: `1px solid ${cfg.border}`,
              overflow: "hidden",
              background: "#fff",
              marginBottom: 10,
            }}
          >
            <TxRow
              tx={item.tx}
              cfg={cfg}
              isLast
              isInsideGroup={false}
              paymentAccounts={paymentAccounts}
            />
          </div>
        );
      })}
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
  paymentAccounts = [],
}: MonthDetailModalProps) {
  if (!open) return null;

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
          padding: 12,
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
            maxHeight: "92vh",
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
              padding: "16px 20px 14px",
              borderBottom: `1px solid ${colors.border}`,
              background: "linear-gradient(135deg, #EFF6FF 0%, #F0FDF4 100%)",
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: 12,
              flexShrink: 0,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                minWidth: 0,
              }}
            >
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 10,
                  background: accentColor,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <Receipt size={18} color="#fff" />
              </div>
              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    fontSize: "clamp(0.88rem, 2.5vw, 1.05rem)",
                    fontWeight: 800,
                    color: "#0F172A",
                    fontFamily: "system-ui, sans-serif",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {monthLabel} — Monthly Report
                </div>
                <div
                  style={{
                    fontSize: "0.7rem",
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
                width: 30,
                height: 30,
                borderRadius: 8,
                border: `1px solid ${colors.border}`,
                background: "#fff",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#94A3B8",
                flexShrink: 0,
                transition: "all 0.15s",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.color = "#0F172A";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.color = "#94A3B8";
              }}
            >
              <X size={15} />
            </button>
          </div>

          {/* ── Scrollable Body ── */}
          <div style={{ overflowY: "auto", flex: 1 }}>
            {/* Net Summary Banner */}
            <div style={{ padding: "16px 20px 0" }}>
              <div
                style={{
                  borderRadius: 14,
                  background: accentBg,
                  border: `2px solid ${accentColor}22`,
                  padding: "16px 18px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: 10,
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: "0.6rem",
                      fontWeight: 800,
                      letterSpacing: "0.14em",
                      textTransform: "uppercase" as const,
                      color: "#94A3B8",
                      marginBottom: 5,
                    }}
                  >
                    Net Profit & Loss
                  </div>
                  <div
                    style={{
                      fontSize: "clamp(1.5rem, 5vw, 2rem)",
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
                    borderRadius: 9,
                    padding: "7px 14px",
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    whiteSpace: "nowrap",
                  }}
                >
                  {statusLabel}
                </div>
              </div>
            </div>

            {/* Summary Breakdown */}
            <div style={{ padding: "14px 20px 0" }}>
              <div
                style={{
                  fontSize: "0.62rem",
                  fontWeight: 800,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase" as const,
                  color: "#94A3B8",
                  marginBottom: 9,
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

              {/* Formula */}
              <div
                style={{
                  margin: "10px 0",
                  padding: "9px 12px",
                  background: "#F8FAFC",
                  borderRadius: 8,
                  border: `1px solid ${colors.border}`,
                  fontSize: "0.7rem",
                  color: "#64748B",
                  fontWeight: 500,
                  overflowX: "auto",
                  whiteSpace: "nowrap",
                }}
              >
                <span style={{ fontFamily: "monospace", fontSize: "0.75rem" }}>
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

            {/* Transaction Groups by Type */}
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
              return (
                <TypeSection
                  key={type}
                  type={type}
                  txs={txs}
                  cfg={cfg}
                  paymentAccounts={paymentAccounts}
                />
              );
            })}

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

            <div style={{ height: 20 }} />
          </div>

          {/* ── Footer ── */}
          <div
            style={{
              padding: "12px 20px",
              borderTop: `1px solid ${colors.border}`,
              background: "#F8FAFC",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexShrink: 0,
              flexWrap: "wrap",
              gap: 8,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <Layers size={13} color="#94A3B8" />
              <span
                style={{
                  fontSize: "0.7rem",
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
                padding: "7px 18px",
                borderRadius: 8,
                border: `1.5px solid ${colors.border}`,
                background: "#fff",
                color: "#374151",
                fontSize: "0.78rem",
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
