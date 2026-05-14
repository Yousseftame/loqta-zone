/**
 * src/pages/Admin/Dashboard/components/MarginReportTable.tsx
 *
 * Table showing all ended auctions with financial analysis.
 * Reads from topAuctions.financialReport — the full un-capped list.
 *
 * Columns: Auction · Product · Winner · Winning Bid · Cost Price · Actual Profit · Margin %
 * Pagination: 10 rows per page with prev/next controls.
 */

import { useState, useMemo, useEffect } from "react";
import { Box, Paper, Chip, Collapse } from "@mui/material";
import {
  TrendingUp,
  TrendingDown,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Search,
  X,
} from "lucide-react";
import { colors } from "../../Products/products-data";
import type { TopAuction, TopAuctionsAnalytics } from "../analytics-data";

const PAGE_SIZE = 10;

/** Margin % aligned with table body (includes entry fees when cost exists). */
function getRowDisplayMarginPct(row: TopAuction): number {
  const hasPrice = row.actualPrice > 0;
  const profit =
    row.actualProfit ?? (hasPrice ? row.winningBid - row.actualPrice : 0);
  const entryFeeRevenue = row.entryFeeRevenue ?? 0;
  const totalProfit = row.totalActualProfit ?? profit + entryFeeRevenue;
  if (hasPrice) return (totalProfit / row.actualPrice) * 100;
  return row.margin ?? 0;
}

interface Props {
  topAuctions: TopAuctionsAnalytics;
  loading?: boolean;
}

export default function MarginReportTable({ topAuctions, loading }: Props) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [profitFilter, setProfitFilter] = useState("all"); // "all" | "profit" | "loss"
  const [marginPctFilter, setMarginPctFilter] = useState("all");
  const [entryFeeFilter, setEntryFeeFilter] = useState("all"); // all | with | without
  const [minBids, setMinBids] = useState("");
  const [minWinBid, setMinWinBid] = useState("");
  const [maxWinBid, setMaxWinBid] = useState("");
  const [advancedFiltersOpen, setAdvancedFiltersOpen] = useState(false);

  // Use the full financialReport list; fall back to byWinningBid for legacy
  const data = useMemo(() => {
    const full = topAuctions.financialReport ?? [];
    return full.length > 0 ? full : (topAuctions.byWinningBid ?? []);
  }, [topAuctions.financialReport, topAuctions.byWinningBid]);

  // Apply search + filters
  const filteredData = useMemo(() => {
    return data.filter((row) => {
      if (search) {
        const q = search.toLowerCase();
        const matchesAuction = String(row.auctionNumber).includes(q);
        const matchesProduct = (row.productTitle ?? "")
          .toLowerCase()
          .includes(q);
        const matchesWinner = (row.winnerName ?? "").toLowerCase().includes(q);
        const matchesAuctionId = (row.auctionId ?? "").toLowerCase().includes(q);
        const matchesWinnerId = (row.winnerId ?? "").toLowerCase().includes(q);
        const bidStr = String(row.winningBid);
        if (
          !matchesAuction &&
          !matchesProduct &&
          !matchesWinner &&
          !matchesAuctionId &&
          !matchesWinnerId &&
          !bidStr.includes(q)
        )
          return false;
      }
      if (profitFilter !== "all") {
        const p = row.totalActualProfit ?? row.actualProfit ?? 0;
        if (profitFilter === "profit" && p < 0) return false;
        if (profitFilter === "loss" && p >= 0) return false;
      }
      if (marginPctFilter !== "all") {
        const m = getRowDisplayMarginPct(row);
        if (marginPctFilter === "strong" && m < 25) return false;
        if (marginPctFilter === "moderate" && (m < 10 || m >= 25)) return false;
        if (marginPctFilter === "weak" && (m < 0 || m >= 10)) return false;
        if (marginPctFilter === "negative" && m >= 0) return false;
      }
      const efr = row.entryFeeRevenue ?? 0;
      if (entryFeeFilter === "with" && efr <= 0) return false;
      if (entryFeeFilter === "without" && efr > 0) return false;
      if (minBids.trim() !== "") {
        const n = parseInt(minBids, 10);
        if (!Number.isNaN(n) && row.totalBids < n) return false;
      }
      if (minWinBid.trim() !== "") {
        const n = parseFloat(minWinBid.replace(/,/g, ""));
        if (!Number.isNaN(n) && row.winningBid < n) return false;
      }
      if (maxWinBid.trim() !== "") {
        const n = parseFloat(maxWinBid.replace(/,/g, ""));
        if (!Number.isNaN(n) && row.winningBid > n) return false;
      }
      return true;
    });
  }, [
    data,
    search,
    profitFilter,
    marginPctFilter,
    entryFeeFilter,
    minBids,
    minWinBid,
    maxWinBid,
  ]);

  const hasFilters =
    search !== "" ||
    profitFilter !== "all" ||
    marginPctFilter !== "all" ||
    entryFeeFilter !== "all" ||
    minBids.trim() !== "" ||
    minWinBid.trim() !== "" ||
    maxWinBid.trim() !== "";
  const hasAdvancedFilters =
    profitFilter !== "all" ||
    marginPctFilter !== "all" ||
    entryFeeFilter !== "all" ||
    minBids.trim() !== "" ||
    minWinBid.trim() !== "" ||
    maxWinBid.trim() !== "";
  const clearFilters = () => {
    setSearch("");
    setProfitFilter("all");
    setMarginPctFilter("all");
    setEntryFeeFilter("all");
    setMinBids("");
    setMinWinBid("");
    setMaxWinBid("");
  };

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [
    search,
    profitFilter,
    marginPctFilter,
    entryFeeFilter,
    minBids,
    minWinBid,
    maxWinBid,
  ]);

  const totalPages = Math.max(1, Math.ceil(filteredData.length / PAGE_SIZE));

  const safePage = Math.min(page, totalPages);
  const pageData = filteredData.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE,
  );

  const handlePrev = () => setPage((p) => Math.max(1, p - 1));
  const handleNext = () => setPage((p) => Math.min(totalPages, p + 1));

  return (
    <Paper
      elevation={0}
      sx={{
        borderRadius: 3,
        border: `1px solid ${colors.border}`,
        overflow: "hidden",
      }}
    >
      {/* ── Header ─────────────────────────────────────────────────────────── */}
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
          Auction Financial Report
        </span>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Chip
            label="Ended Auctions"
            size="small"
            sx={{
              bgcolor: "#DCFCE7",
              color: "#22C55E",
              fontWeight: 700,
              fontSize: "0.68rem",
            }}
          />
          {data.length > 0 && (
            <Chip
              label={
                hasFilters
                  ? `${filteredData.length} / ${data.length}`
                  : `${data.length} total`
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
      {!loading && data.length > 0 && (
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
                placeholder="Search auction #, product, winner, IDs, winning bid…"
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
              value={profitFilter}
              onChange={(e) => setProfitFilter(e.target.value)}
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
              <option value="all">All Results</option>
              <option value="profit">📈 Profitable (EGP)</option>
              <option value="loss">📉 Loss-making (EGP)</option>
            </select>

            <select
              value={marginPctFilter}
              onChange={(e) => setMarginPctFilter(e.target.value)}
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
              <option value="all">All margins %</option>
              <option value="strong">Strong (≥ 25%)</option>
              <option value="moderate">Moderate (10–25%)</option>
              <option value="weak">Weak (0–10%)</option>
              <option value="negative">Negative (&lt; 0%)</option>
            </select>

            <select
              value={entryFeeFilter}
              onChange={(e) => setEntryFeeFilter(e.target.value)}
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
              <option value="all">Entry fees: any</option>
              <option value="with">With entry fee revenue</option>
              <option value="without">No entry fee revenue</option>
            </select>

            <input
              type="text"
              inputMode="numeric"
              value={minBids}
              onChange={(e) => setMinBids(e.target.value.replace(/[^\d]/g, ""))}
              placeholder="Min. total bids"
              aria-label="Minimum total bids"
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
              value={minWinBid}
              onChange={(e) => setMinWinBid(e.target.value)}
              placeholder="Min winning bid (EGP)"
              aria-label="Minimum winning bid in EGP"
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
              value={maxWinBid}
              onChange={(e) => setMaxWinBid(e.target.value)}
              placeholder="Max winning bid (EGP)"
              aria-label="Maximum winning bid in EGP"
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
      )}

      {/* ── Body ───────────────────────────────────────────────────────────── */}
      {loading ? (
        <Box sx={{ p: 3 }}>
          {[1, 2, 3, 4, 5].map((i) => (
            <Box key={i} sx={{ display: "flex", gap: 2, mb: 1.5 }}>
              {[60, 140, 100, 90, 80, 90, 70].map((w, j) => (
                <Box
                  key={j}
                  sx={{
                    height: 14,
                    width: w,
                    borderRadius: 2,
                    background:
                      "linear-gradient(90deg,#f0f0f0 25%,#e8e8e8 50%,#f0f0f0 75%)",
                    backgroundSize: "200% 100%",
                    animation: "shimmer 1.4s infinite",
                  }}
                />
              ))}
            </Box>
          ))}
        </Box>
      ) : filteredData.length === 0 ? (
        <Box sx={{ p: 5, textAlign: "center" }}>
          <p
            style={{ color: colors.textMuted, margin: 0, fontSize: "0.85rem" }}
          >
            {hasFilters
              ? "No auctions match the current filters."
              : "No ended auctions yet — financial data will appear here once auctions resolve."}
          </p>
        </Box>
      ) : (
        <>
          <Box sx={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#F8FAFC" }}>
                  {[
                    "Auction",
                    "Product",
                    "Winner",
                    "Winning Bid",
                    "Cost Price",
                    "Entry Fee Rev.",
                    "Actual Profit",
                    "Margin %",
                  ].map((h) => (
                    <th
                      key={h}
                      style={{
                        padding: "10px 16px",
                        textAlign: "left",
                        fontSize: "0.68rem",
                        fontWeight: 700,
                        color: colors.primaryDark,
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                        borderBottom: `1px solid ${colors.border}`,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pageData.map((row: TopAuction, i: number) => {
                  const hasPrice = row.actualPrice > 0;
                  const profit =
                    row.actualProfit ??
                    (hasPrice ? row.winningBid - row.actualPrice : 0);
                  const entryFeeRevenue = row.entryFeeRevenue ?? 0;
                  // totalProfit = bid margin profit + entry fee revenue
                  const totalProfit =
                    row.totalActualProfit ?? profit + entryFeeRevenue;
                  // Margin % uses totalActualProfit so entry fees are included
                  const displayMargin = hasPrice
                    ? (totalProfit / row.actualPrice) * 100
                    : row.margin;
                  const isPositive = displayMargin >= 0;
                  return (
                    <tr
                      key={row.auctionId}
                      style={{ background: i % 2 === 0 ? "#fff" : "#FAFAFA" }}
                    >
                      {/* Auction # */}
                      <td style={{ padding: "12px 16px" }}>
                        <span
                          style={{
                            fontWeight: 700,
                            color: colors.primary,
                            fontSize: "0.88rem",
                          }}
                        >
                          #{row.auctionNumber}
                        </span>
                      </td>

                      {/* Product */}
                      <td style={{ padding: "12px 16px", maxWidth: 160 }}>
                        <span
                          style={{
                            fontSize: "0.82rem",
                            color: colors.textPrimary,
                            fontWeight: 600,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            display: "block",
                          }}
                        >
                          {row.productTitle}
                        </span>
                      </td>

                      {/* Winner */}
                      <td style={{ padding: "12px 16px" }}>
                        <span
                          style={{
                            fontSize: "0.82rem",
                            color: colors.textSecondary,
                          }}
                        >
                          {row.winnerName || "—"}
                        </span>
                      </td>

                      {/* Winning Bid */}
                      <td
                        style={{ padding: "12px 16px", whiteSpace: "nowrap" }}
                      >
                        <span
                          style={{
                            fontWeight: 700,
                            color: "#3D6A8A",
                            fontSize: "0.88rem",
                          }}
                        >
                          {row.winningBid.toLocaleString()} EGP
                        </span>
                      </td>

                      {/* Cost Price */}
                      <td
                        style={{ padding: "12px 16px", whiteSpace: "nowrap" }}
                      >
                        <span
                          style={{
                            fontSize: "0.82rem",
                            color: colors.textSecondary,
                          }}
                        >
                          {hasPrice
                            ? `${row.actualPrice.toLocaleString()} EGP`
                            : "—"}
                        </span>
                      </td>

                      {/* Entry Fee Revenue */}
                      <td
                        style={{ padding: "12px 16px", whiteSpace: "nowrap" }}
                      >
                        {row.entryFeeRevenue > 0 ? (
                          <span
                            style={{
                              fontWeight: 600,
                              fontSize: "0.82rem",
                              color: "#7C3AED",
                            }}
                          >
                            +{row.entryFeeRevenue.toLocaleString()} EGP
                          </span>
                        ) : (
                          <span
                            style={{
                              color: colors.textMuted,
                              fontSize: "0.78rem",
                            }}
                          >
                            —
                          </span>
                        )}
                      </td>

                      {/* Actual Profit (totalActualProfit = margin profit + entry fee rev) */}
                      <td
                        style={{ padding: "12px 16px", whiteSpace: "nowrap" }}
                      >
                        {hasPrice || row.entryFeeRevenue > 0 ? (
                          <span
                            style={{
                              fontWeight: 700,
                              fontSize: "0.88rem",
                              color: totalProfit >= 0 ? "#059669" : "#DC2626",
                            }}
                          >
                            {totalProfit >= 0 ? "+" : ""}
                            {totalProfit.toLocaleString()} EGP
                          </span>
                        ) : (
                          <span
                            style={{
                              color: colors.textMuted,
                              fontSize: "0.78rem",
                            }}
                          >
                            —
                          </span>
                        )}
                      </td>

                      {/* Margin % — uses totalActualProfit (incl. entry fees) / actualPrice */}
                      <td style={{ padding: "12px 16px" }}>
                        {hasPrice ? (
                          <Chip
                            icon={
                              isPositive ? (
                                <TrendingUp size={12} />
                              ) : (
                                <TrendingDown size={12} />
                              )
                            }
                            label={`${isPositive ? "+" : ""}${displayMargin.toFixed(1)}%`}
                            size="small"
                            sx={{
                              bgcolor: isPositive ? "#DCFCE7" : "#FEE2E2",
                              color: isPositive ? "#22C55E" : "#EF4444",
                              fontWeight: 700,
                              fontSize: "0.7rem",
                              "& .MuiChip-icon": {
                                color: isPositive ? "#22C55E" : "#EF4444",
                              },
                            }}
                          />
                        ) : (
                          <span
                            style={{
                              color: colors.textMuted,
                              fontSize: "0.78rem",
                            }}
                          >
                            —
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Box>

          {/* ── Pagination ──────────────────────────────────────────────────── */}
          {totalPages > 1 && (
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
                  {(safePage - 1) * PAGE_SIZE + 1}–
                  {Math.min(safePage * PAGE_SIZE, filteredData.length)}
                </strong>{" "}
                of{" "}
                <strong style={{ color: colors.textPrimary }}>
                  {filteredData.length}
                </strong>{" "}
                {hasFilters ? "filtered" : ""} auctions
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
                  .filter((p) => {
                    // Always show first, last, current ± 1
                    return (
                      p === 1 || p === totalPages || Math.abs(p - safePage) <= 1
                    );
                  })
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
                          background:
                            item === safePage ? colors.primary : "#fff",
                          color:
                            item === safePage ? "#fff" : colors.textPrimary,
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
                      safePage === totalPages
                        ? colors.textMuted
                        : colors.primary,
                    cursor: safePage === totalPages ? "not-allowed" : "pointer",
                    transition: "all 0.15s",
                  }}
                >
                  <ChevronRight size={14} />
                </button>
              </Box>
            </Box>
          )}
        </>
      )}
    </Paper>
  );
}
