/**
 * src/pages/Admin/Finance/components/TransactionsTable.tsx
 *
 * Recent transactions table.
 *
 * UPDATE 1 — Editable transactions:
 *   Each row now has an ✏️ Edit button. Clicking it opens AddTransactionModal
 *   in edit mode pre-filled with that transaction's values. On save, the Cloud
 *   Function onTransactionUpdated reverses the old values and applies the new
 *   ones atomically. The running "Balance After" column then recalculates
 *   automatically because it is derived entirely from the live transactions list.
 *
 * UPDATE 2 — Balance validation:
 *   AddTransactionModal now receives the live `stats` prop so it can validate
 *   that the new values won't push any balance negative before saving.
 *
 * UPDATE 3 — Split payment grouping:
 *   Transactions sharing a `groupId` are visually grouped with a colored
 *   left border and a "Part N of M" badge. The first part of a group shows
 *   a "🔀 Split" header row above it. Split parts within a group are always
 *   sorted by their part number (Part 1, Part 2, Part 3...) regardless of
 *   the order Firestore returns them.
 *
 * ─── Balance After calculation ────────────────────────────────────────────────
 * Anchors on current available balance and walks backwards through the
 * sorted-desc list, undoing each transaction.
 *
 * ─── Transfer rows ────────────────────────────────────────────────────────────
 * Transfers show "—" in Balance After and "⇄ N EGP" in Amount (balance-neutral).
 */

import { useState, useMemo, useEffect } from "react";
import { Box, Paper, Chip, Collapse, IconButton, Tooltip } from "@mui/material";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Search,
  X,
} from "lucide-react";
import { colors } from "../../Products/products-data";
import {
  CATEGORY_LABEL,
  resolveTransactionCategoryLabel,
  type Transaction,
  type FinanceStats,
  type TransactionFormValues,
  type Owner,
} from "../finance-data";
import AddTransactionModal from "./AddTransactionModal";
import { usePaymentAccounts, buildMethodDisplay } from "@/hooks/usePaymentAccounts";

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
    owner_return: { label: "↩ Return", bg: "#ECFDF5", color: "#065F46" },
    transfer: { label: "Transfer", bg: "#EDE9FE", color: "#4C1D95" },
  };

const AMOUNT_STYLE: Record<string, { color: string; sign: string }> = {
  income: { color: "#059669", sign: "+" },
  expense: { color: "#DC2626", sign: "−" },
  owner_withdrawal: { color: "#D97706", sign: "−" },
  owner_return: { color: "#10B981", sign: "+" },
  transfer: { color: "#7C3AED", sign: "⇄ " },
};

// Split group accent color
const SPLIT_ACCENT = "#7C3AED";
const SPLIT_BG = "#F5F3FF";
const SPLIT_BORDER = "#DDD6FE";

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

 * Extract the part number from a splitLabel string like "Part 3 of 5" → 3.
 * Returns Infinity if it can't parse, so unparseable labels sort to the end.
 */
function parseSplitPartNumber(splitLabel: string | undefined): number {
  if (!splitLabel) return Infinity;
  const match = splitLabel.match(/^Part\s+(\d+)/i);
  return match ? parseInt(match[1], 10) : Infinity;
}

/**
 * Re-order transactions so that split parts within the same group are
 * sorted by their part number (1, 2, 3…) while keeping non-split
 * transactions and group ordering intact.
 *
 * Strategy:
 * - Walk through the array maintaining original inter-group order.
 * - When we encounter the first part of a new group, collect ALL parts
 *   of that group from the array, sort them by part number, and emit
 *   them in order before moving on.
 */
function sortSplitPartsInOrder(transactions: Transaction[]): Transaction[] {
  const result: Transaction[] = [];
  const emittedGroups = new Set<string>();

  // Build a quick lookup: groupId → all transactions in that group
  const groupMap = new Map<string, Transaction[]>();
  for (const tx of transactions) {
    if (tx.groupId) {
      const arr = groupMap.get(tx.groupId) ?? [];
      arr.push(tx);
      groupMap.set(tx.groupId, arr);
    }
  }

  // Sort each group's parts by part number once
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
      // Non-split transaction: emit as-is
      result.push(tx);
    } else if (!emittedGroups.has(tx.groupId)) {
      // First encounter of this group: emit all sorted parts
      emittedGroups.add(tx.groupId);
      const sorted = groupMap.get(tx.groupId) ?? [];
      result.push(...sorted);
    }
    // Subsequent parts of an already-emitted group: skip (already added above)
  }

  return result;
}

/**
 * Reconstructs running available balance for every transaction.
 * Transactions arrive sorted newest-first. We anchor on the current
 * available balance and walk backwards, undoing each transaction.
 */
/** Local date range (YYYY-MM-DD from `<input type="date" />`) vs transaction timestamp */
function inDateRange(
  createdAt: Date | null,
  dateFrom: string,
  dateTo: string,
): boolean {
  if (!dateFrom && !dateTo) return true;
  if (!createdAt) return false;
  const t = createdAt.getTime();
  if (dateFrom) {
    const start = new Date(`${dateFrom}T00:00:00`);
    if (t < start.getTime()) return false;
  }
  if (dateTo) {
    const end = new Date(`${dateTo}T23:59:59.999`);
    if (t > end.getTime()) return false;
  }
  return true;
}

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
      result[i] = result[i - 1]; // neutral
    } else if (prev.type === "owner_return") {
      result[i] = result[i - 1] - prev.amount;
    } else {
      // expense + owner_withdrawal both reduced available balance
      result[i] = result[i - 1] + prev.amount;
    }
  }
  return result;
}

// ─── Split group header row ───────────────────────────────────────────────────

function SplitGroupHeaderRow({
  groupId,
  colSpan,
  parts,
}: {
  groupId: string;
  colSpan: number;
  parts: Transaction[];
}) {
  const total = parts.reduce((s, p) => s + p.amount, 0);
  const typeChip = TYPE_CHIP[parts[0]?.type] ?? TYPE_CHIP.income;
  const cashTotal = parts
    .filter((p) => p.method === "cash")
    .reduce((s, p) => s + p.amount, 0);
  const bankTotal = parts
    .filter((p) => p.method === "bank")
    .reduce((s, p) => s + p.amount, 0);

  return (
    <tr>
      <td
        colSpan={colSpan}
        style={{
          padding: "8px 16px 6px",
          background: SPLIT_BG,
          borderTop: `2px solid ${SPLIT_ACCENT}`,
          borderBottom: `1px solid ${SPLIT_BORDER}`,
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1.5,
            flexWrap: "wrap",
          }}
        >
          {/* Split badge */}
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              background: SPLIT_ACCENT,
              color: "#fff",
              borderRadius: 999,
              padding: "3px 10px",
              fontSize: "0.7rem",
              fontWeight: 800,
              letterSpacing: "0.05em",
            }}
          >
            🔀 Split · {parts.length} parts
          </span>

          {/* Type */}
          <span
            style={{
              background: typeChip.bg,
              color: typeChip.color,
              borderRadius: 999,
              padding: "3px 10px",
              fontSize: "0.7rem",
              fontWeight: 700,
            }}
          >
            {typeChip.label}
          </span>

          {/* Method breakdown */}
          <Box
            sx={{
              display: "flex",
              gap: 1,
              ml: "auto",
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            {cashTotal > 0 && (
              <span
                style={{
                  fontSize: "0.72rem",
                  fontWeight: 700,
                  color: "#1E40AF",
                  background: "#DBEAFE",
                  borderRadius: 6,
                  padding: "2px 8px",
                }}
              >
                💵 {cashTotal.toLocaleString("en-EG")} EGP
              </span>
            )}
            {bankTotal > 0 && (
              <span
                style={{
                  fontSize: "0.72rem",
                  fontWeight: 700,
                  color: "#065F46",
                  background: "#D1FAE5",
                  borderRadius: 6,
                  padding: "2px 8px",
                }}
              >
                🏦 {bankTotal.toLocaleString("en-EG")} EGP
              </span>
            )}
            <span
              style={{
                fontSize: "0.78rem",
                fontWeight: 800,
                color: SPLIT_ACCENT,
                marginLeft: 4,
              }}
            >
              Total: {total.toLocaleString("en-EG")} EGP
            </span>
          </Box>
        </Box>
      </td>
    </tr>
  );
}

// ─── Transaction Detail Modal ─────────────────────────────────────────────────

function TransactionDetailModal({
  tx,
  balance,
  methodLabel,
  onClose,
  onEdit,
}: {
  tx: Transaction;
  balance: number;
  methodLabel: string;
  onClose: () => void;
  onEdit: () => void;
}) {
  const isTransfer = tx.type === "transfer";
  const isSplitPart = !!tx.groupId;
  const typeChip = TYPE_CHIP[tx.type] ?? TYPE_CHIP.income;
  const amtStyle = AMOUNT_STYLE[tx.type] ?? AMOUNT_STYLE.income;
  const balNeg = balance < 0;

  const doneBy =
    tx.createdByName?.trim() ||
    (tx.createdBy ? `${tx.createdBy.slice(0, 8)}…` : "—");

  const accentColor =
    tx.type === "income"
      ? "#059669"
      : tx.type === "expense"
        ? "#DC2626"
        : tx.type === "owner_withdrawal"
          ? "#D97706"
          : tx.type === "owner_return"
            ? "#10B981"
            : "#7C3AED";

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 9998,
          background: "rgba(15, 23, 42, 0.45)",
          backdropFilter: "blur(4px)",
          animation: "tdm-fadein 0.18s ease forwards",
        }}
      />
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 9999,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          pointerEvents: "none",
        }}
      >
        <div
          style={{
            pointerEvents: "all",
            background: "#ffffff",
            borderRadius: 20,
            boxShadow:
              "0 32px 80px rgba(15,23,42,0.18), 0 0 0 1px rgba(226,232,240,0.8)",
            width: "100%",
            maxWidth: 420,
            margin: "0 16px",
            overflow: "hidden",
            animation:
              "tdm-slidein 0.22s cubic-bezier(0.34,1.56,0.64,1) forwards",
          }}
        >
          <div
            style={{
              height: 4,
              background: `linear-gradient(90deg, ${isSplitPart ? SPLIT_ACCENT : accentColor} 0%, ${isSplitPart ? SPLIT_ACCENT : accentColor}99 100%)`,
            }}
          />
          <div style={{ padding: "28px 28px 24px" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 20,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span
                  style={{
                    background: typeChip.bg,
                    color: typeChip.color,
                    borderRadius: 999,
                    padding: "4px 14px",
                    fontSize: "0.78rem",
                    fontWeight: 700,
                  }}
                >
                  {typeChip.label}
                </span>
                {/* Split badge in detail modal */}
                {isSplitPart && tx.splitLabel && (
                  <span
                    style={{
                      background: SPLIT_BG,
                      color: SPLIT_ACCENT,
                      border: `1px solid ${SPLIT_BORDER}`,
                      borderRadius: 999,
                      padding: "4px 10px",
                      fontSize: "0.7rem",
                      fontWeight: 700,
                    }}
                  >
                    🔀 {tx.splitLabel}
                  </span>
                )}
              </div>
              <span
                style={{
                  fontSize: "0.78rem",
                  color: "#64748B",
                  fontWeight: 500,
                }}
              >
                {fmtDate(tx.createdAt)}
              </span>
            </div>

            <div
              style={{
                fontSize: "2rem",
                fontWeight: 800,
                color: amtStyle.color,
                letterSpacing: "-0.02em",
                fontFamily: "system-ui, sans-serif",
                marginBottom: 20,
              }}
            >
              {isTransfer
                ? `⇄ ${tx.amount.toLocaleString("en-EG")} EGP`
                : `${amtStyle.sign}${tx.amount.toLocaleString("en-EG")} EGP`}
            </div>

            <div
              style={{ height: 1, background: "#E2E8F0", marginBottom: 18 }}
            />

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 12,
                fontFamily: "system-ui, sans-serif",
              }}
            >
              <DetailRow
                label="Category"
                value={resolveTransactionCategoryLabel(tx)}
              />
              <DetailRow label="Method" value={methodLabel} />
              <DetailRow label="Done By" value={`👤 ${doneBy}`} />
              {!isTransfer && (
                <DetailRow
                  label="Balance After"
                  value={`${fmtBalance(balance)} EGP`}
                  valueColor={balNeg ? "#DC2626" : "#0f172a"}
                />
              )}
              {isSplitPart && tx.splitLabel && (
                <DetailRow
                  label="Split Part"
                  value={tx.splitLabel}
                  valueColor={SPLIT_ACCENT}
                />
              )}
              <div>
                <span
                  style={{
                    fontSize: "0.7rem",
                    fontWeight: 700,
                    color: "#94A3B8",
                    letterSpacing: "0.08em",
                    textTransform: "uppercase" as const,
                    display: "block",
                    marginBottom: 6,
                  }}
                >
                  Note
                </span>
                <div
                  style={{
                    background: "#F8FAFC",
                    border: "1px solid #E2E8F0",
                    borderRadius: 10,
                    padding: "10px 14px",
                    fontSize: "0.85rem",
                    color: tx.note ? "#1E293B" : "#94A3B8",
                    lineHeight: 1.6,
                    fontStyle: tx.note ? "normal" : "italic",
                    wordBreak: "break-word" as const,
                    whiteSpace: "pre-wrap" as const,
                    minHeight: 44,
                  }}
                >
                  {tx.note || "No note provided"}
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 22 }}>
              <button
                onClick={onEdit}
                style={{
                  flex: 1,
                  padding: "11px 0",
                  borderRadius: 10,
                  border: "1.5px solid #BFDBFE",
                  background: "#EFF6FF",
                  color: "#1E40AF",
                  fontSize: "14px",
                  fontWeight: 700,
                  cursor: "pointer",
                  fontFamily: "system-ui, sans-serif",
                  transition: "all 0.18s ease",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background =
                    "#DBEAFE";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background =
                    "#EFF6FF";
                }}
              >
                ✏️ Edit
              </button>
              <button
                onClick={onClose}
                style={{
                  flex: 1,
                  padding: "11px 0",
                  borderRadius: 10,
                  border: "1.5px solid #E2E8F0",
                  background: "#F8FAFC",
                  color: "#475569",
                  fontSize: "14px",
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: "system-ui, sans-serif",
                  transition: "all 0.18s ease",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background =
                    "#F1F5F9";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background =
                    "#F8FAFC";
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
      <style>{`
        @keyframes tdm-fadein  { from { opacity: 0 } to { opacity: 1 } }
        @keyframes tdm-slidein { from { opacity: 0; transform: translateY(16px) scale(0.97) } to { opacity: 1; transform: translateY(0) scale(1) } }
      `}</style>
    </>
  );
}

function DetailRow({
  label,
  value,
  valueColor,
}: {
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-between",
        gap: 12,
      }}
    >
      <span
        style={{
          fontSize: "0.78rem",
          fontWeight: 600,
          color: "#94A3B8",
          flexShrink: 0,
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontSize: "0.82rem",
          fontWeight: 600,
          color: valueColor ?? "#1E293B",
          textAlign: "right",
        }}
      >
        {value}
      </span>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  transactions: Transaction[];
  stats: FinanceStats;
  owners?: Owner[];
  loading?: boolean;
  updating?: boolean;
  onUpdateTransaction?: (
    txId: string,
    values: TransactionFormValues,
    beforeTx: Transaction,
  ) => Promise<void>;
}

export default function TransactionsTable({
  transactions,
  stats,
  owners,
  loading = false,
  updating = false,
  onUpdateTransaction,
}: Props) {
  const { accounts: paymentAccounts } = usePaymentAccounts();
  const methodLabelFor = (tx: Transaction) =>
    buildMethodDisplay(tx, paymentAccounts);

  const [page, setPage] = useState(1);
  const [selectedTx, setSelectedTx] = useState<{
    tx: Transaction;
    balance: number;
  } | null>(null);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);

  // ── Search / filter state ─────────────────────────────────────────────────
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [methodFilter, setMethodFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [ownerFilter, setOwnerFilter] = useState("all");
  const [splitFilter, setSplitFilter] = useState("all"); // all | split | standalone
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [amountMin, setAmountMin] = useState("");
  const [amountMax, setAmountMax] = useState("");
  const [advancedFiltersOpen, setAdvancedFiltersOpen] = useState(false);
  useEffect(() => {
    setPage(1);
  }, [
    search,
    typeFilter,
    methodFilter,
    categoryFilter,
    ownerFilter,
    splitFilter,
    dateFrom,
    dateTo,
    amountMin,
    amountMax,
  ]);

  const currentAvailable = stats.cashBalance + stats.bankBalance;

  // ── Sort split parts within groups, keeping overall order intact ──────────
  const sortedTransactions = useMemo(
    () => sortSplitPartsInOrder(transactions),
    [transactions],
  );

  const categoryOptions = useMemo(() => {
    const set = new Set<string>();
    for (const tx of sortedTransactions) set.add(tx.category);
    return [...set].sort((a, b) =>
      (CATEGORY_LABEL[a] ?? a).localeCompare(CATEGORY_LABEL[b] ?? b),
    );
  }, [sortedTransactions]);

  const ownerOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const tx of sortedTransactions) {
      if (tx.ownerId)
        map.set(tx.ownerId, tx.ownerName?.trim() || tx.ownerId.slice(0, 8));
    }
    return [...map.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [sortedTransactions]);

  const allBalances = useMemo(
    () => computeRunningBalances(sortedTransactions, currentAvailable),
    [sortedTransactions, currentAvailable],
  );

  // Pair each tx with its pre-computed balance BEFORE filtering.
  // This guarantees "Balance After" is always accurate regardless of
  // which rows are currently visible — filtering cannot corrupt the running balance.
  const filteredWithBalance = useMemo(() => {
    const result: { tx: Transaction; balance: number }[] = [];
    for (let i = 0; i < sortedTransactions.length; i++) {
      const tx = sortedTransactions[i];
      if (typeFilter !== "all" && tx.type !== typeFilter) continue;
      if (methodFilter !== "all" && tx.method !== methodFilter) continue;
      if (categoryFilter !== "all" && tx.category !== categoryFilter) continue;
      if (ownerFilter !== "all" && tx.ownerId !== ownerFilter) continue;
      if (splitFilter === "split" && !tx.groupId) continue;
      if (splitFilter === "standalone" && tx.groupId) continue;
      if (!inDateRange(tx.createdAt, dateFrom, dateTo)) continue;
      if (amountMin !== "") {
        const n = parseFloat(amountMin.replace(/,/g, ""));
        if (!Number.isNaN(n) && tx.amount < n) continue;
      }
      if (amountMax !== "") {
        const n = parseFloat(amountMax.replace(/,/g, ""));
        if (!Number.isNaN(n) && tx.amount > n) continue;
      }
      if (search) {
        const q = search.toLowerCase();
        const note = (tx.note ?? "").toLowerCase();
        const cat = (CATEGORY_LABEL[tx.category] ?? tx.category).toLowerCase();
        const by = (tx.createdByName ?? "").toLowerCase();
        const ownerNm = (tx.ownerName ?? "").toLowerCase();
        const idPart = (tx.id ?? "").toLowerCase();
        const transferTo = (tx.transferTo ?? "").toLowerCase();
        const amountStr = tx.amount.toLocaleString("en-EG").toLowerCase();
        const plainAmount = String(tx.amount);
        if (
          !note.includes(q) &&
          !cat.includes(q) &&
          !by.includes(q) &&
          !ownerNm.includes(q) &&
          !amountStr.includes(q) &&
          !plainAmount.includes(q) &&
          !idPart.includes(q) &&
          !transferTo.includes(q)
        )
          continue;
      }
      result.push({ tx, balance: allBalances[i] });
    }
    return result;
  }, [
    sortedTransactions,
    allBalances,
    search,
    typeFilter,
    methodFilter,
    categoryFilter,
    ownerFilter,
    splitFilter,
    dateFrom,
    dateTo,
    amountMin,
    amountMax,
  ]);

  const hasFilters =
    search !== "" ||
    typeFilter !== "all" ||
    methodFilter !== "all" ||
    categoryFilter !== "all" ||
    ownerFilter !== "all" ||
    splitFilter !== "all" ||
    dateFrom !== "" ||
    dateTo !== "" ||
    amountMin !== "" ||
    amountMax !== "";
  const hasAdvancedFilters =
    typeFilter !== "all" ||
    methodFilter !== "all" ||
    categoryFilter !== "all" ||
    ownerFilter !== "all" ||
    splitFilter !== "all" ||
    dateFrom !== "" ||
    dateTo !== "" ||
    amountMin !== "" ||
    amountMax !== "";
  const clearFilters = () => {
    setSearch("");
    setTypeFilter("all");
    setMethodFilter("all");
    setCategoryFilter("all");
    setOwnerFilter("all");
    setSplitFilter("all");
    setDateFrom("");
    setDateTo("");
    setAmountMin("");
    setAmountMax("");
  };

  const totalPages = Math.max(
    1,
    Math.ceil(filteredWithBalance.length / PAGE_SIZE),
  );
  const safePage = Math.min(page, totalPages);
  const pageStart = (safePage - 1) * PAGE_SIZE;
  const pageEnd = safePage * PAGE_SIZE;
  const pageData = filteredWithBalance
    .slice(pageStart, pageEnd)
    .map((x) => x.tx);
  const pageBalances = filteredWithBalance
    .slice(pageStart, pageEnd)
    .map((x) => x.balance);

  // groupMap is built from the FULL sorted list so split-group header rows
  // always show correct totals even when some parts are filtered out.
  const groupMap = useMemo(() => {
    const map = new Map<string, Transaction[]>();
    for (const tx of sortedTransactions) {
      if (tx.groupId) {
        const arr = map.get(tx.groupId) ?? [];
        arr.push(tx);
        map.set(tx.groupId, arr);
      }
    }
    return map;
  }, [sortedTransactions]);

  const handlePrev = () => setPage((p) => Math.max(1, p - 1));
  const handleNext = () => setPage((p) => Math.min(totalPages, p + 1));

  const handleRowClick = (tx: Transaction, bal: number) => {
    setSelectedTx({ tx, balance: bal });
  };

  const handleEditFromDetail = () => {
    if (!selectedTx) return;
    setEditingTx(selectedTx.tx);
    setSelectedTx(null);
  };

  const handleEditFromRow = (e: React.MouseEvent, tx: Transaction) => {
    e.stopPropagation();
    setEditingTx(tx);
  };

  const handleEditClose = () => setEditingTx(null);

  const handleEditSubmit = async (values: TransactionFormValues) => {
    if (!editingTx || !onUpdateTransaction) return;
    await onUpdateTransaction(editingTx.id, values, editingTx);
    setEditingTx(null);
  };

  const HEADERS = [
    "Date",
    "Type",
    "Category",
    "Method",
    "Note",
    "Done By",
    "Balance After",
    "Amount",
    "",
  ];

  // Track which group IDs have already had their header row rendered on this page
  const renderedGroupHeaders = new Set<string>();

  return (
    <>
      {/* ── Detail Modal ── */}
      {selectedTx && (
        <TransactionDetailModal
          tx={selectedTx.tx}
          balance={selectedTx.balance}
          methodLabel={methodLabelFor(selectedTx.tx)}
          onClose={() => setSelectedTx(null)}
          onEdit={handleEditFromDetail}
        />
      )}

      {/* ── Edit Modal ── */}
      <AddTransactionModal
        open={!!editingTx}
        adding={false}
        updating={updating}
        onClose={handleEditClose}
        onSubmit={async () => {}} // unused in edit mode
        onUpdate={handleEditSubmit}
        editingTx={editingTx}
        stats={stats}
        transactions={transactions}
        owners={owners}
      />

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
            px: { xs: 1.5, sm: 3 },
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
            {sortedTransactions.length > 0 && (
              <Chip
                label={
                  hasFilters
                    ? `${filteredWithBalance.length} / ${sortedTransactions.length}`
                    : `${sortedTransactions.length} total`
                }
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

        {/* ── Filter bar ─────────────────────────────────────────────────────── */}
        <Box
          sx={{
            px: { xs: 1.5, sm: 2 },
            py: 1.5,
            borderBottom: `1px solid ${colors.border}`,
            bgcolor: "#FAFAFA",
            display: "flex",
            flexDirection: "column",
            gap: 1.5,
          }}
        >
          <Box
            sx={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              gap: 1.5,
            }}
          >
            <Box
              sx={{
                position: "relative",
                flex: "1 1 200px",
                minWidth: 0,
                maxWidth: { sm: 420 },
              }}
            >
              <Search
                size={13}
                style={{
                  position: "absolute",
                  left: 9,
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: colors.textMuted,
                  pointerEvents: "none",
                }}
              />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search note, category, user, amount, owner, tx ID…"
                style={{
                  width: "100%",
                  padding: "8px 10px 8px 30px",
                  border: `1px solid ${colors.border}`,
                  borderRadius: 8,
                  fontSize: "0.8rem",
                  color: "#1E293B",
                  background: "#fff",
                  outline: "none",
                  fontFamily: "system-ui,sans-serif",
                  boxSizing: "border-box",
                }}
              />
            </Box>

            <Box
              sx={{
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                gap: 1,
                justifyContent: { xs: "stretch", sm: "flex-end" },
                flex: { xs: "1 1 100%", sm: "0 0 auto" },
              }}
            >
              <Box
                component="button"
                type="button"
                onClick={() => setAdvancedFiltersOpen((o) => !o)}
                aria-expanded={advancedFiltersOpen}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 0.5,
                  py: 1,
                  px: 1.5,
                  border: `1px solid ${colors.border}`,
                  borderRadius: 2,
                  fontSize: "0.78rem",
                  fontWeight: 600,
                  color: colors.primary,
                  bgcolor: "#fff",
                  cursor: "pointer",
                  fontFamily: "system-ui,sans-serif",
                  flex: { xs: 1, sm: "0 0 auto" },
                  whiteSpace: "nowrap",
                }}
              >
                Advanced filters
                {hasAdvancedFilters && !advancedFiltersOpen ? (
                  <Box
                    component="span"
                    sx={{
                      color: "#D97706",
                      fontSize: "0.72rem",
                      fontWeight: 700,
                    }}
                  >
                    · on
                  </Box>
                ) : null}
                <ChevronDown
                  size={16}
                  color={colors.primary}
                  style={{
                    flexShrink: 0,
                    transform: advancedFiltersOpen
                      ? "rotate(180deg)"
                      : "rotate(0deg)",
                    transition: "transform 0.2s ease",
                  }}
                />
              </Box>

              {hasFilters && (
                <Box
                  component="button"
                  type="button"
                  onClick={clearFilters}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 0.75,
                    py: 1,
                    px: 2,
                    border: `1px solid ${colors.border}`,
                    borderRadius: 2,
                    fontSize: "0.78rem",
                    fontWeight: 600,
                    color: colors.textMuted,
                    bgcolor: "#fff",
                    cursor: "pointer",
                    fontFamily: "system-ui,sans-serif",
                    flex: { xs: 1, sm: "0 0 auto" },
                  }}
                >
                  <X size={12} /> Clear all
                </Box>
              )}
            </Box>
          </Box>

          <Collapse in={advancedFiltersOpen} timeout="auto">
            <Box
              sx={{
                display: "grid",
                width: "100%",
                gap: 1.5,
                pt: 0.25,
                gridTemplateColumns: {
                  xs: "minmax(0, 1fr)",
                  sm: "repeat(2, minmax(0, 1fr))",
                  md: "repeat(auto-fill, minmax(min(100%, 148px), 1fr))",
                },
                alignItems: "stretch",
              }}
            >
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 10px",
                border: `1px solid ${colors.border}`,
                borderRadius: 8,
                fontSize: "0.8rem",
                color: "#1E293B",
                background: "#fff",
                cursor: "pointer",
                fontFamily: "system-ui,sans-serif",
                outline: "none",
                boxSizing: "border-box",
              }}
            >
              <option value="all">All Types</option>
              <option value="income">Income</option>
              <option value="expense">Expense</option>
              <option value="owner_withdrawal">Owner Draw</option>
              <option value="owner_return">↩ Return</option>
              <option value="transfer">Transfer</option>
            </select>

            <select
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 10px",
                border: `1px solid ${colors.border}`,
                borderRadius: 8,
                fontSize: "0.8rem",
                color: "#1E293B",
                background: "#fff",
                cursor: "pointer",
                fontFamily: "system-ui,sans-serif",
                outline: "none",
                boxSizing: "border-box",
              }}
            >
              <option value="all">All Methods</option>
              <option value="cash">💵 Cash</option>
              <option value="bank">🏦 Bank</option>
            </select>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 10px",
                border: `1px solid ${colors.border}`,
                borderRadius: 8,
                fontSize: "0.8rem",
                color: "#1E293B",
                background: "#fff",
                cursor: "pointer",
                fontFamily: "system-ui,sans-serif",
                outline: "none",
                boxSizing: "border-box",
              }}
            >
              <option value="all">All Categories</option>
              {categoryOptions.map((c) => (
                <option key={c} value={c}>
                  {CATEGORY_LABEL[c] ?? c}
                </option>
              ))}
            </select>

            {ownerOptions.length > 0 && (
              <select
                value={ownerFilter}
                onChange={(e) => setOwnerFilter(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px 10px",
                  border: `1px solid ${colors.border}`,
                  borderRadius: 8,
                  fontSize: "0.8rem",
                  color: "#1E293B",
                  background: "#fff",
                  cursor: "pointer",
                  fontFamily: "system-ui,sans-serif",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              >
                <option value="all">All Owners</option>
                {ownerOptions.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
            )}

            <select
              value={splitFilter}
              onChange={(e) => setSplitFilter(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 10px",
                border: `1px solid ${colors.border}`,
                borderRadius: 8,
                fontSize: "0.8rem",
                color: "#1E293B",
                background: "#fff",
                cursor: "pointer",
                fontFamily: "system-ui,sans-serif",
                outline: "none",
                boxSizing: "border-box",
              }}
            >
              <option value="all">All Payments</option>
              <option value="split">Split payments only</option>
              <option value="standalone">Single-line only</option>
            </select>

            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              aria-label="From date"
              style={{
                width: "100%",
                padding: "8px 10px",
                border: `1px solid ${colors.border}`,
                borderRadius: 8,
                fontSize: "0.8rem",
                color: "#1E293B",
                background: "#fff",
                fontFamily: "system-ui,sans-serif",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              aria-label="To date"
              style={{
                width: "100%",
                padding: "8px 10px",
                border: `1px solid ${colors.border}`,
                borderRadius: 8,
                fontSize: "0.8rem",
                color: "#1E293B",
                background: "#fff",
                fontFamily: "system-ui,sans-serif",
                outline: "none",
                boxSizing: "border-box",
              }}
            />

            <input
              type="text"
              inputMode="decimal"
              value={amountMin}
              onChange={(e) => setAmountMin(e.target.value)}
              placeholder="Min amount (EGP)"
              aria-label="Minimum amount in EGP"
              style={{
                width: "100%",
                padding: "8px 10px",
                border: `1px solid ${colors.border}`,
                borderRadius: 8,
                fontSize: "0.8rem",
                color: "#1E293B",
                background: "#fff",
                outline: "none",
                fontFamily: "system-ui,sans-serif",
                boxSizing: "border-box",
              }}
            />
            <input
              type="text"
              inputMode="decimal"
              value={amountMax}
              onChange={(e) => setAmountMax(e.target.value)}
              placeholder="Max amount (EGP)"
              aria-label="Maximum amount in EGP"
              style={{
                width: "100%",
                padding: "8px 10px",
                border: `1px solid ${colors.border}`,
                borderRadius: 8,
                fontSize: "0.8rem",
                color: "#1E293B",
                background: "#fff",
                outline: "none",
                fontFamily: "system-ui,sans-serif",
                boxSizing: "border-box",
              }}
            />
            </Box>
          </Collapse>
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
            <thead>
              <tr style={{ background: "#F8FAFC" }}>
                {HEADERS.map((h, hi) => (
                  <th
                    key={h || `h-${hi}`}
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
                      width: h === "" ? 40 : undefined,
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {loading ? (
                Array(PAGE_SIZE)
                  .fill(0)
                  .map((_, i) => (
                    <tr key={i}>
                      {Array(9)
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
              ) : sortedTransactions.length === 0 ? (
                <tr>
                  <td
                    colSpan={9}
                    style={{
                      padding: "40px 16px",
                      textAlign: "center",
                      color: colors.textMuted,
                    }}
                  >
                    No transactions yet
                  </td>
                </tr>
              ) : filteredWithBalance.length === 0 ? (
                <tr>
                  <td
                    colSpan={9}
                    style={{
                      padding: "40px 16px",
                      textAlign: "center",
                      color: colors.textMuted,
                    }}
                  >
                    No transactions match the current filters.
                  </td>
                </tr>
              ) : (
                pageData.map((tx, i) => {
                  const isTransfer = tx.type === "transfer";
                  const isSplitPart = !!tx.groupId;
                  const typeChip = TYPE_CHIP[tx.type] ?? TYPE_CHIP.income;
                  const amtStyle = AMOUNT_STYLE[tx.type] ?? AMOUNT_STYLE.income;
                  const bal = pageBalances[i];
                  const balNeg = bal < 0;
                  const methodLabel = methodLabelFor(tx);

                  const methodChipStyle = isTransfer
                    ? { bg: "#EDE9FE", color: "#4C1D95" }
                    : tx.type === "owner_return"
                      ? { bg: "#ECFDF5", color: "#065F46" }
                      : (METHOD_CHIP[tx.method] ?? METHOD_CHIP.cash);

                  const doneBy =
                    tx.createdByName?.trim() ||
                    (tx.createdBy ? `${tx.createdBy.slice(0, 8)}…` : "—");

                  const globalIdx = pageStart + i;

                  // ── Determine row background ──────────────────────────────
                  const defaultBg = isSplitPart
                    ? SPLIT_BG
                    : globalIdx % 2 === 0
                      ? "#fff"
                      : "#FAFAFA";

                  const hoverBg = isSplitPart
                    ? "#EDE9FE"
                    : isTransfer
                      ? "#F5F3FF"
                      : tx.type === "owner_return"
                        ? "#ECFDF5"
                        : "#EFF6FF";

                  // ── Check if we need to render a split group header ───────
                  const rows: React.ReactNode[] = [];
                  if (
                    isSplitPart &&
                    tx.groupId &&
                    !renderedGroupHeaders.has(tx.groupId)
                  ) {
                    renderedGroupHeaders.add(tx.groupId);
                    const groupParts = groupMap.get(tx.groupId) ?? [];
                    rows.push(
                      <SplitGroupHeaderRow
                        key={`split-header-${tx.groupId}`}
                        groupId={tx.groupId}
                        colSpan={HEADERS.length}
                        parts={groupParts}
                      />,
                    );
                  }

                  // ── The transaction row itself ────────────────────────────
                  rows.push(
                    <tr
                      key={tx.id}
                      onClick={() => handleRowClick(tx, bal)}
                      style={{
                        background: defaultBg,
                        transition: "background 0.15s",
                        cursor: "pointer",
                        // Split parts get a colored left border
                        borderLeft: isSplitPart
                          ? `3px solid ${SPLIT_ACCENT}`
                          : undefined,
                      }}
                      onMouseEnter={(e) => {
                        (
                          e.currentTarget as HTMLTableRowElement
                        ).style.background = hoverBg;
                      }}
                      onMouseLeave={(e) => {
                        (
                          e.currentTarget as HTMLTableRowElement
                        ).style.background = defaultBg;
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
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 0.75,
                            flexWrap: "wrap",
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
                          {/* Split part badge */}
                          {isSplitPart && tx.splitLabel && (
                            <span
                              style={{
                                background: SPLIT_BG,
                                color: SPLIT_ACCENT,
                                border: `1px solid ${SPLIT_BORDER}`,
                                borderRadius: 999,
                                padding: "2px 7px",
                                fontSize: "0.62rem",
                                fontWeight: 700,
                                whiteSpace: "nowrap",
                              }}
                            >
                              {tx.splitLabel}
                            </span>
                          )}
                        </Box>
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
                        {resolveTransactionCategoryLabel(tx)}
                        {tx.ownerName && (
                          <span
                            style={{
                              color: colors.textMuted,
                              fontSize: "0.75rem",
                              marginLeft: 6,
                            }}
                          >
                            ({tx.ownerName})
                          </span>
                        )}
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
                          color: tx.note ? colors.textSecondary : "#CBD5E1",
                          maxWidth: 160,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          fontStyle: tx.note ? "normal" : "italic",
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
                            border: `1px solid ${isTransfer ? "#DDD6FE" : balNeg ? "#FECACA" : "#BBF7D0"}`,
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

                      {/* Edit button */}
                      <td
                        style={{
                          padding: "6px 8px",
                          borderBottom: `1px solid ${colors.border}`,
                          textAlign: "center",
                        }}
                      >
                        <Tooltip title="Edit transaction" placement="left">
                          <IconButton
                            size="small"
                            onClick={(e) => handleEditFromRow(e, tx)}
                            sx={{
                              color: colors.textMuted,
                              "&:hover": {
                                color: colors.primary,
                                bgcolor: colors.primaryBg,
                              },
                              borderRadius: 1.5,
                              p: 0.75,
                            }}
                          >
                            <Pencil size={13} />
                          </IconButton>
                        </Tooltip>
                      </td>
                    </tr>,
                  );

                  return rows;
                })
              )}
            </tbody>
          </table>
        </Box>

        {/* ── Pagination ── */}
        {!loading && totalPages > 1 && (
          <Box
            sx={{
              px: { xs: 1.5, sm: 3 },
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
            <span
              style={{
                fontSize: "0.75rem",
                color: colors.textMuted,
                fontWeight: 500,
              }}
            >
              Showing{" "}
              <strong style={{ color: colors.textPrimary }}>
                {pageStart + 1}–
                {Math.min(pageEnd, filteredWithBalance.length)}
              </strong>{" "}
              of{" "}
              <strong style={{ color: colors.textPrimary }}>
                {filteredWithBalance.length}
              </strong>{" "}
              {hasFilters ? "filtered " : ""}transactions
            </span>

            <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
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
    </>
  );
}
