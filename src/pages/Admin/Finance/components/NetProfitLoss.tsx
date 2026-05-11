/**
 * src/pages/Admin/Finance/components/NetProfitLoss.tsx
 *
 * ─── What's shown ─────────────────────────────────────────────────────────────
 * 1. Three summary cards  — Today / Last 7 Days / This Month (current)
 * 2. Monthly History table — every calendar month that has any transaction,
 *    newest → oldest, permanently visible. Each row shows:
 *      Net P&L · % vs prev month · Income · Expenses · Owner Draw · Status
 *    Clicking a row opens MonthDetailModal with the full transaction breakdown.
 *
 * ─── Formula ──────────────────────────────────────────────────────────────────
 *   Net P&L = Σ income − Σ expenses − Σ owner_withdrawals
 *   Transfers are excluded (balance-neutral).
 *
 * ─── Data source ──────────────────────────────────────────────────────────────
 *   Filtered client-side from transactions[] already loaded by useFinance().
 *   Zero extra Firestore reads.
 */

import { useMemo, useState } from "react";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  ChevronDown,
  ChevronUp,
  ExternalLink,
} from "lucide-react";
import { colors } from "../../Products/products-data";
import type { Transaction } from "../finance-data";
import MonthDetailModal from "./MonthDetailModal";

// ─── Types ────────────────────────────────────────────────────────────────────

interface PeriodResult {
  net: number;
  income: number;
  expenses: number;
  ownerDraws: number;
  pctChange: number | null;
}

interface MonthRow {
  year: number;
  month: number;
  label: string;
  isCurrent: boolean;
  net: number;
  income: number;
  expenses: number;
  ownerDraws: number;
  pctChange: number | null;
  /** Transactions that belong to this month */
  transactions: Transaction[];
}

interface Props {
  transactions: Transaction[];
  loading?: boolean;
}

// ─── Pure helpers ─────────────────────────────────────────────────────────────

const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

function startOfDay(d: Date): Date {
  const r = new Date(d);
  r.setHours(0, 0, 0, 0);
  return r;
}
function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}
function startOfMonth(y: number, m: number): Date {
  return new Date(y, m, 1, 0, 0, 0, 0);
}

function calcNet(
  txs: Transaction[],
  from: Date,
  to: Date,
): { net: number; income: number; expenses: number; ownerDraws: number } {
  let income = 0, expenses = 0, ownerDraws = 0;
  for (const tx of txs) {
    const d = tx.createdAt;
    if (!d || d < from || d >= to) continue;
    if (tx.type === "income") income += tx.amount;
    else if (tx.type === "expense") expenses += tx.amount;
    else if (tx.type === "owner_withdrawal") ownerDraws += tx.amount;
    else if (tx.type === "owner_return") ownerDraws -= tx.amount; // cancels the withdrawal's P&L impact
  }
  return { net: income - expenses - ownerDraws, income, expenses, ownerDraws };
}

function txsInRange(txs: Transaction[], from: Date, to: Date): Transaction[] {
  return txs.filter((tx) => {
    const d = tx.createdAt;
    return d && d >= from && d < to;
  });
}

function pctChange(curr: number, prev: number): number | null {
  if (prev === 0) return null;
  return ((curr - prev) / Math.abs(prev)) * 100;
}

// ─── Compute summary (Today / 7d / Current Month) ────────────────────────────

function computeSummary(txs: Transaction[]): {
  today: PeriodResult;
  week: PeriodResult;
  month: PeriodResult;
} {
  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = addDays(todayStart, 1);
  const yestStart = addDays(todayStart, -1);
  const weekStart = addDays(todayStart, -6);
  const prevWEnd = weekStart;
  const prevWStart = addDays(weekStart, -7);
  const mStart = startOfMonth(now.getFullYear(), now.getMonth());
  const mEnd = todayEnd;
  const pmStart = startOfMonth(now.getFullYear(), now.getMonth() - 1);
  const pmEnd = mStart;

  const tC = calcNet(txs, todayStart, todayEnd);
  const tP = calcNet(txs, yestStart, todayStart);
  const wC = calcNet(txs, weekStart, todayEnd);
  const wP = calcNet(txs, prevWStart, prevWEnd);
  const mC = calcNet(txs, mStart, mEnd);
  const mP = calcNet(txs, pmStart, pmEnd);

  return {
    today: { ...tC, pctChange: pctChange(tC.net, tP.net) },
    week:  { ...wC, pctChange: pctChange(wC.net, wP.net) },
    month: { ...mC, pctChange: pctChange(mC.net, mP.net) },
  };
}

// ─── Compute monthly history ──────────────────────────────────────────────────

function computeMonthlyHistory(txs: Transaction[]): MonthRow[] {
  if (txs.length === 0) return [];

  const buckets = new Map<string, { year: number; month: number }>();
  for (const tx of txs) {
    if (!tx.createdAt) continue;
    const y = tx.createdAt.getFullYear();
    const m = tx.createdAt.getMonth();
    const key = `${y}-${String(m).padStart(2, "0")}`;
    if (!buckets.has(key)) buckets.set(key, { year: y, month: m });
  }

  const sorted = [...buckets.values()].sort((a, b) =>
    a.year !== b.year ? a.year - b.year : a.month - b.month,
  );

  const now = new Date();
  const curY = now.getFullYear();
  const curM = now.getMonth();

  const rows: MonthRow[] = [];
  for (let i = 0; i < sorted.length; i++) {
    const { year, month } = sorted[i];
    const from = startOfMonth(year, month);
    const to   = startOfMonth(year, month + 1);
    const curr = calcNet(txs, from, to);
    const monthTxs = txsInRange(txs, from, to);

    let prevNet = 0;
    if (i > 0) {
      const p = sorted[i - 1];
      const pFrom = startOfMonth(p.year, p.month);
      const pTo   = startOfMonth(p.year, p.month + 1);
      prevNet = calcNet(txs, pFrom, pTo).net;
    }

    rows.push({
      year,
      month,
      label: `${MONTH_NAMES[month]} ${year}`,
      isCurrent: year === curY && month === curM,
      net: curr.net,
      income: curr.income,
      expenses: curr.expenses,
      ownerDraws: curr.ownerDraws,
      pctChange: i === 0 ? null : pctChange(curr.net, prevNet),
      transactions: monthTxs,
    });
  }

  return rows.reverse();
}

// ─── Formatters ───────────────────────────────────────────────────────────────

function fmtEGP(n: number): string {
  const abs = Math.abs(n).toLocaleString("en-EG");
  return n < 0 ? `−${abs}` : `+${abs}`;
}
function fmtPct(n: number): string {
  return `${Math.abs(n).toFixed(1)}%`;
}

// ─── Summary card ─────────────────────────────────────────────────────────────

function SummaryCard({
  label, sub, period, index,
}: {
  label: string; sub: string; period: PeriodResult; index: number;
}) {
  const isProfit = period.net > 0;
  const isLoss   = period.net < 0;

  const gradient = isLoss
    ? "linear-gradient(135deg,#450a0a 0%,#7f1d1d 45%,#991b1b 80%,#b91c1c 100%)"
    : isProfit
    ? "linear-gradient(135deg,#1e1b4b 0%,#312e81 45%,#4338ca 80%,#6366f1 100%)"
    : "linear-gradient(135deg,#1e293b 0%,#334155 55%,#475569 100%)";

  const accentLine = isLoss
    ? "linear-gradient(90deg,#F43F5E,#FB7185,#FDA4AF)"
    : isProfit
    ? "linear-gradient(90deg,#818cf8,#c7d2fe,#818cf8)"
    : "linear-gradient(90deg,#94A3B8,#CBD5E1)";

  const glowRGB = isLoss ? "185,28,28" : isProfit ? "99,102,241" : "30,41,59";
  const base        = `0 20px 60px rgba(${glowRGB},0.4), 0 0 0 1px rgba(255,255,255,0.1)`;
  const hoverShadow = `0 28px 80px rgba(${glowRGB},0.55), 0 0 0 1px rgba(255,255,255,0.15)`;

  const hasPct  = period.pctChange !== null;
  const pctPos  = (period.pctChange ?? 0) >= 0;
  const pctIsZero = period.pctChange === 0;

  return (
    <div
      style={{
        position: "relative", borderRadius: 20, background: gradient,
        padding: "28px 30px 24px", overflow: "hidden", boxShadow: base,
        animation: `pnl-rise 0.48s cubic-bezier(0.22,1,0.36,1) ${index * 80}ms both`,
        transition: "transform 0.25s ease,box-shadow 0.25s ease",
        cursor: "default", display: "flex", flexDirection: "column",
        justifyContent: "space-between", minHeight: 210,
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLDivElement;
        el.style.transform = "translateY(-4px) scale(1.01)";
        el.style.boxShadow = hoverShadow;
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLDivElement;
        el.style.transform = "";
        el.style.boxShadow = base;
      }}
    >
      <div style={{
        position: "absolute", inset: 0, borderRadius: 20,
        background: "linear-gradient(135deg,rgba(255,255,255,0.08) 0%,transparent 50%,rgba(255,255,255,0.03) 100%)",
        pointerEvents: "none",
      }} />
      <div style={{
        position: "absolute", top: -50, right: -50, width: 160, height: 160,
        borderRadius: "50%", background: "rgba(255,255,255,0.04)", pointerEvents: "none",
      }} />

      {/* top */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", position: "relative" }}>
        <div>
          <div style={{
            fontSize: 10, fontWeight: 700, letterSpacing: "0.16em",
            textTransform: "uppercase", color: "rgba(255,255,255,0.5)",
            fontFamily: "system-ui,sans-serif",
          }}>{label}</div>
          <div style={{ fontSize: 22, marginTop: 5 }}>
            {isLoss ? "📉" : isProfit ? "📈" : "➖"}
          </div>
        </div>
        <div style={{
          background: isLoss ? "rgba(244,63,94,0.2)" : isProfit ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.1)",
          border: "1px solid rgba(255,255,255,0.18)", borderRadius: 6,
          padding: "4px 10px", fontSize: 9, fontWeight: 800,
          letterSpacing: "0.12em", color: "rgba(255,255,255,0.85)",
          fontFamily: "system-ui,sans-serif",
        }}>
          {isLoss ? "LOSS" : isProfit ? "PROFIT" : "NEUTRAL"}
        </div>
      </div>

      {/* value */}
      <div style={{ position: "relative", marginTop: 10 }}>
        <div style={{
          fontSize: "clamp(1.5rem,2.5vw,1.9rem)", fontWeight: 800,
          color: "#fff", letterSpacing: "-0.025em",
          fontFamily: "system-ui,sans-serif", lineHeight: 1.1,
        }}>
          {fmtEGP(period.net)} EGP
        </div>

        {hasPct ? (
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 4, marginTop: 6,
            background: pctIsZero ? "rgba(148,163,184,0.18)" : pctPos ? "rgba(129,140,248,0.25)" : "rgba(244,63,94,0.2)",
            border: `1px solid ${pctIsZero ? "rgba(148,163,184,0.3)" : pctPos ? "rgba(129,140,248,0.45)" : "rgba(244,63,94,0.35)"}`,
            borderRadius: 999, padding: "3px 10px",
            fontSize: "0.72rem", fontWeight: 700,
            color: pctIsZero ? "rgba(255,255,255,0.6)" : pctPos ? "#c7d2fe" : "#FDA4AF",
            fontFamily: "system-ui,sans-serif",
          }}>
            {pctIsZero ? <Minus size={10} /> : pctPos ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
            {pctIsZero ? "No change" : `${pctPos ? "▲" : "▼"} ${fmtPct(period.pctChange!)}`} vs {sub}
          </div>
        ) : ""}
      </div>

      {/* breakdown */}
      <div style={{ position: "relative", marginTop: 14 }}>
        <div style={{ height: 2, borderRadius: 999, background: accentLine, opacity: 0.75, marginBottom: 10 }} />
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
          <MiniStat label="Income"     value={period.income}     color="#c7d2fe" />
          <MiniStat label="Expenses"   value={period.expenses}   color="#FDA4AF" />
          <MiniStat label="Owner Draw" value={period.ownerDraws} color="#FCD34D" />
        </div>
      </div>

      <style>{`@keyframes pnl-rise{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}`}</style>
    </div>
  );
}

function MiniStat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
      <span style={{
        fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.08em",
        textTransform: "uppercase", color: "rgba(255,255,255,0.4)",
        fontFamily: "system-ui,sans-serif",
      }}>{label}</span>
      <span style={{ fontSize: "0.76rem", fontWeight: 700, color, fontFamily: "system-ui,sans-serif" }}>
        {value.toLocaleString("en-EG")} EGP
      </span>
    </div>
  );
}

// ─── Monthly History Table ────────────────────────────────────────────────────

function MonthlyHistoryTable({
  rows, loading,
}: {
  rows: MonthRow[];
  loading: boolean;
}) {
  const [expanded, setExpanded] = useState(true);
  const [modalRow, setModalRow] = useState<MonthRow | null>(null);

  return (
    <>
      {/* Month detail modal */}
      {modalRow && (
        <MonthDetailModal
          open={!!modalRow}
          onClose={() => setModalRow(null)}
          monthLabel={modalRow.label}
          transactions={modalRow.transactions}
          net={modalRow.net}
          income={modalRow.income}
          expenses={modalRow.expenses}
          ownerDraws={modalRow.ownerDraws}
        />
      )}

      <div style={{
        borderRadius: 16, border: `1px solid ${colors.border}`,
        overflow: "hidden", background: "#fff",
      }}>
        {/* header */}
        <div
          onClick={() => setExpanded((v) => !v)}
          style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "14px 20px",
            background: colors.primaryBg,
            borderBottom: expanded ? `1px solid ${colors.border}` : "none",
            cursor: "pointer", userSelect: "none",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontWeight: 700, fontSize: "0.9rem", color: colors.primaryDark }}>
              Monthly P&L History
            </span>
            {!loading && rows.length > 0 && (
              <span style={{
                background: colors.primary, color: "#fff",
                borderRadius: 999, padding: "2px 9px",
                fontSize: "0.68rem", fontWeight: 700,
              }}>
                {rows.length} month{rows.length !== 1 ? "s" : ""}
              </span>
            )}
            <span style={{ fontSize: "0.72rem", color: colors.textMuted, fontWeight: 500 }}>
              · All calendar months with transactions
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, color: colors.textMuted }}>
            {!loading && rows.length > 0 && (
              <span style={{ fontSize: "0.65rem", color: "#94A3B8", fontWeight: 500 }}>
                Click row for details
              </span>
            )}
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </div>
        </div>

        {expanded && (
          <div style={{ overflowX: "auto" }}>
            <table style={{
              width: "100%", borderCollapse: "collapse",
              fontSize: "0.82rem", fontFamily: "system-ui,sans-serif",
            }}>
              <thead>
                <tr style={{ background: "#F8FAFC" }}>
                  {["Month","Net P&L","vs Prev Month","Income","Expenses","Owner Draw","Status",""].map((h) => (
                    <th key={h} style={{
                      padding: "10px 16px",
                      textAlign: ["Net P&L","Income","Expenses","Owner Draw"].includes(h) ? "right" : "left",
                      fontWeight: 700, color: colors.textMuted,
                      fontSize: "0.7rem", letterSpacing: "0.07em",
                      textTransform: "uppercase", whiteSpace: "nowrap",
                      borderBottom: `1px solid ${colors.border}`,
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array(4).fill(0).map((_, i) => (
                    <tr key={i}>
                      {Array(8).fill(0).map((_, j) => (
                        <td key={j} style={{ padding: "14px 16px", borderBottom: `1px solid ${colors.border}` }}>
                          <div style={{
                            height: 12, borderRadius: 4, background: "#EFF6FF",
                            width: "70%", animation: "sk-pulse 1.4s ease infinite",
                          }} />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{
                      padding: "40px 16px", textAlign: "center",
                      color: colors.textMuted, fontSize: "0.85rem",
                    }}>
                      No transaction history yet
                    </td>
                  </tr>
                ) : (
                  rows.map((row, i) => {
                    const isProfit = row.net > 0;
                    const isLoss   = row.net < 0;
                    const pctPos   = (row.pctChange ?? 0) >= 0;
                    const pctIsZero = row.pctChange === 0;
                    const evenBg   = i % 2 === 0 ? "#fff" : "#FAFAFA";
                    const hasDetails = row.transactions.length > 0;

                    return (
                      <tr
                        key={`${row.year}-${row.month}`}
                        style={{
                          background: evenBg, transition: "background 0.15s",
                          cursor: hasDetails ? "pointer" : "default",
                        }}
                        onMouseEnter={(e) => {
                          (e.currentTarget as HTMLTableRowElement).style.background = hasDetails ? "#EFF6FF" : evenBg;
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as HTMLTableRowElement).style.background = evenBg;
                        }}
                        onClick={() => hasDetails && setModalRow(row)}
                        title={hasDetails ? `Click to view ${row.transactions.length} transactions in ${row.label}` : ""}
                      >
                        {/* Month label */}
                        <td style={{ padding: "13px 16px", borderBottom: `1px solid ${colors.border}`, fontWeight: 600, color: colors.primaryDark, whiteSpace: "nowrap" }}>
                          {row.label}
                          {row.isCurrent && (
                            <span style={{
                              marginLeft: 8, fontSize: "0.65rem", fontWeight: 700,
                              background: "#DBEAFE", color: "#1D4ED8",
                              borderRadius: 999, padding: "2px 7px",
                            }}>
                              CURRENT
                            </span>
                          )}
                        </td>

                        {/* Net P&L */}
                        <td style={{ padding: "13px 16px", borderBottom: `1px solid ${colors.border}`, textAlign: "right", whiteSpace: "nowrap" }}>
                          <span style={{
                            fontWeight: 800, fontSize: "0.88rem",
                            color: isLoss ? "#DC2626" : isProfit ? "#059669" : "#64748B",
                          }}>
                            {fmtEGP(row.net)} EGP
                          </span>
                        </td>

                        {/* % vs prev month */}
                        <td style={{ padding: "13px 16px", borderBottom: `1px solid ${colors.border}`, whiteSpace: "nowrap" }}>
                          {row.pctChange === null ? (
                            <span style={{ fontSize: "0.72rem", color: "#94A3B8", fontStyle: "italic" }}>First month</span>
                          ) : (
                            <span style={{
                              display: "inline-flex", alignItems: "center", gap: 4,
                              borderRadius: 999, padding: "3px 10px",
                              fontSize: "0.72rem", fontWeight: 700,
                              background: pctIsZero ? "#F1F5F9" : pctPos ? "#EEF2FF" : "#FEE2E2",
                              color: pctIsZero ? "#64748B" : pctPos ? "#3730a3" : "#991B1B",
                            }}>
                              {pctIsZero ? <Minus size={10} /> : pctPos ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                              {pctIsZero ? "No change" : `${pctPos ? "▲" : "▼"} ${fmtPct(row.pctChange)}`}
                            </span>
                          )}
                        </td>

                        {/* Income */}
                        <td style={{ padding: "13px 16px", borderBottom: `1px solid ${colors.border}`, textAlign: "right", color: "#059669", fontWeight: 600, whiteSpace: "nowrap" }}>
                          +{row.income.toLocaleString("en-EG")} EGP
                        </td>

                        {/* Expenses */}
                        <td style={{ padding: "13px 16px", borderBottom: `1px solid ${colors.border}`, textAlign: "right", color: "#DC2626", fontWeight: 600, whiteSpace: "nowrap" }}>
                          −{row.expenses.toLocaleString("en-EG")} EGP
                        </td>

                        {/* Owner Draw */}
                        <td style={{ padding: "13px 16px", borderBottom: `1px solid ${colors.border}`, textAlign: "right", color: "#D97706", fontWeight: 600, whiteSpace: "nowrap" }}>
                          −{row.ownerDraws.toLocaleString("en-EG")} EGP
                        </td>

                        {/* Status badge */}
                        <td style={{ padding: "13px 16px", borderBottom: `1px solid ${colors.border}` }}>
                          <span style={{
                            display: "inline-block", borderRadius: 6,
                            padding: "3px 10px", fontSize: "0.7rem", fontWeight: 700,
                            background: isLoss ? "#FEE2E2" : isProfit ? "#EEF2FF" : "#F1F5F9",
                            color: isLoss ? "#991B1B" : isProfit ? "#3730a3" : "#475569",
                          }}>
                            {isLoss ? "📉 Loss" : isProfit ? "📈 Profit" : "➖ Break-even"}
                          </span>
                        </td>

                        {/* Details arrow */}
                        <td style={{ padding: "13px 12px", borderBottom: `1px solid ${colors.border}`, textAlign: "center", whiteSpace: "nowrap" }}>
                          {hasDetails && (
                            <div style={{
                              display: "inline-flex", alignItems: "center", gap: 4,
                              fontSize: "0.65rem", fontWeight: 700,
                              color: colors.primary, opacity: 0.7,
                            }}>
                              <ExternalLink size={12} />
                              <span>{row.transactions.length}</span>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <style>{`@keyframes sk-pulse{0%,100%{opacity:.4}50%{opacity:.8}}`}</style>
    </>
  );
}

// ─── Skeleton summary card ────────────────────────────────────────────────────

function SkeletonCard({ index }: { index: number }) {
  return (
    <div style={{
      borderRadius: 20,
      background: "linear-gradient(135deg,#1e293b 0%,#334155 100%)",
      padding: "28px 30px 24px", minHeight: 210,
      display: "flex", flexDirection: "column", justifyContent: "space-between",
      animation: `pnl-rise 0.48s ease ${index * 80}ms both`,
      boxShadow: "0 20px 60px rgba(15,23,42,0.3)",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <div style={{ width: 80, height: 12, borderRadius: 4, background: "rgba(255,255,255,0.08)", animation: "sk-pulse 1.4s ease infinite" }} />
        <div style={{ width: 52, height: 22, borderRadius: 6, background: "rgba(255,255,255,0.06)", animation: "sk-pulse 1.4s ease infinite" }} />
      </div>
      <div>
        <div style={{ width: "65%", height: 32, borderRadius: 6, background: "rgba(255,255,255,0.08)", animation: "sk-pulse 1.4s ease infinite", marginBottom: 10 }} />
        <div style={{ width: 140, height: 22, borderRadius: 999, background: "rgba(255,255,255,0.06)", animation: "sk-pulse 1.4s ease infinite" }} />
      </div>
      <div>
        <div style={{ height: 2, borderRadius: 999, background: "rgba(255,255,255,0.07)", marginBottom: 10 }} />
        <div style={{ display: "flex", gap: 12 }}>
          {[70, 80, 75].map((w, i) => (
            <div key={i} style={{ width: w, height: 28, borderRadius: 4, background: "rgba(255,255,255,0.06)", animation: "sk-pulse 1.4s ease infinite" }} />
          ))}
        </div>
      </div>
      <style>{`@keyframes pnl-rise{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}@keyframes sk-pulse{0%,100%{opacity:.4}50%{opacity:.8}}`}</style>
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export default function NetProfitLoss({ transactions, loading = false }: Props) {
  const { today, week, month } = useMemo(() => computeSummary(transactions), [transactions]);
  const history = useMemo(() => computeMonthlyHistory(transactions), [transactions]);

  const cards = [
    { label: "Today",       sub: "yesterday",    period: today },
    { label: "Last 7 Days", sub: "prior 7 days", period: week  },
    { label: "This Month",  sub: "last month",   period: month },
  ];

  return (
    <div>
      {/* Section header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
        <div style={{ width: 3, height: 18, background: colors.primary, borderRadius: 2 }} />
        <span style={{ fontSize: "0.78rem", fontWeight: 800, color: colors.textMuted, letterSpacing: "0.14em", textTransform: "uppercase" }}>
          Net Profit &amp; Loss
        </span>
        <span style={{ fontSize: "0.7rem", fontWeight: 600, color: colors.textMuted, opacity: 0.6 }}>
          · Income − Expenses − Owner Draws
        </span>
      </div>

      {/* Summary cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 20, marginBottom: 20 }}>
        {loading
          ? [0, 1, 2].map((i) => <SkeletonCard key={i} index={i} />)
          : cards.map((c, i) => (
              <SummaryCard key={c.label} label={c.label} sub={c.sub} period={c.period} index={i} />
            ))}
      </div>

      {/* Monthly history table */}
      <MonthlyHistoryTable rows={history} loading={loading} />
    </div>
  );
}