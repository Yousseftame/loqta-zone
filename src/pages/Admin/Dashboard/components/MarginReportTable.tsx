/**
 * src/pages/Admin/Dashboard/components/MarginReportTable.tsx
 *
 * Table showing all ended auctions with financial analysis.
 * Reads from topAuctions.financialReport — the full un-capped list.
 *
 * Columns: Auction · Product · Winner · Winning Bid · Cost Price · Actual Profit · Margin %
 * Pagination: 10 rows per page with prev/next controls.
 */

import { useState, useMemo } from "react";
import { Box, Paper, Chip } from "@mui/material";
import {
  TrendingUp,
  TrendingDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { colors } from "../../Products/products-data";
import type { TopAuction, TopAuctionsAnalytics } from "../analytics-data";

const PAGE_SIZE = 10;

interface Props {
  topAuctions: TopAuctionsAnalytics;
  loading?: boolean;
}

export default function MarginReportTable({ topAuctions, loading }: Props) {
  const [page, setPage] = useState(1);

  // Use the full financialReport list; fall back to byWinningBid for legacy
  // Firestore docs written before financialReport was added (no rebuild yet).
  const data = useMemo(() => {
    const full = topAuctions.financialReport ?? [];
    return full.length > 0 ? full : (topAuctions.byWinningBid ?? []);
  }, [topAuctions.financialReport, topAuctions.byWinningBid]);

  const totalPages = Math.max(1, Math.ceil(data.length / PAGE_SIZE));

  // Clamp page whenever data length changes (e.g. after rebuild)
  const safePage = Math.min(page, totalPages);
  const pageData = data.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

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
              label={`${data.length} total`}
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
      ) : data.length === 0 ? (
        <Box sx={{ p: 5, textAlign: "center" }}>
          <p
            style={{ color: colors.textMuted, margin: 0, fontSize: "0.85rem" }}
          >
            No ended auctions yet — financial data will appear here once
            auctions resolve.
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
                  const isPositive = row.margin >= 0;
                  const profit =
                    row.actualProfit ??
                    (hasPrice ? row.winningBid - row.actualPrice : 0);
                  const isProfitPos = profit >= 0;

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

                      {/* Actual Profit (new column) */}
                      <td
                        style={{ padding: "12px 16px", whiteSpace: "nowrap" }}
                      >
                        {hasPrice ? (
                          <span
                            style={{
                              fontWeight: 700,
                              fontSize: "0.88rem",
                              color: isProfitPos ? "#059669" : "#DC2626",
                            }}
                          >
                            {isProfitPos ? "+" : ""}
                            {profit.toLocaleString()} EGP
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

                      {/* Margin % */}
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
                            label={`${isPositive ? "+" : ""}${row.margin.toFixed(1)}%`}
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
                  {(safePage - 1) * PAGE_SIZE + 1}–
                  {Math.min(safePage * PAGE_SIZE, data.length)}
                </strong>{" "}
                of{" "}
                <strong style={{ color: colors.textPrimary }}>
                  {data.length}
                </strong>{" "}
                auctions
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
