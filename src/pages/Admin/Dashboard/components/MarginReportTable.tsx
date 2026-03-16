/**
 * src/pages/Admin/Dashboard/components/MarginReportTable.tsx
 *
 * Table showing top auctions with financial analysis.
 * Reads from the already-populated topAuctions.byWinningBid list.
 */

import { Box, Paper, Chip } from "@mui/material";
import { TrendingUp, TrendingDown } from "lucide-react";
import { colors } from "../../Products/products-data";
import type { TopAuction, TopAuctionsAnalytics } from "../analytics-data";

interface Props {
  topAuctions: TopAuctionsAnalytics;
  loading?: boolean;
}

export default function MarginReportTable({ topAuctions, loading }: Props) {
  const data = topAuctions.byWinningBid;

  return (
    <Paper
      elevation={0}
      sx={{
        borderRadius: 3,
        border: `1px solid ${colors.border}`,
        overflow: "hidden",
      }}
    >
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
          Auction Financial Report
        </span>
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
      </Box>

      {loading ? (
        <Box sx={{ p: 3 }}>
          {[1, 2, 3].map((i) => (
            <Box key={i} sx={{ display: "flex", gap: 2, mb: 1.5 }}>
              {[120, 160, 80, 80, 80, 80].map((w, j) => (
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
                  "Margin",
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
              {data.map((row: TopAuction, i: number) => {
                const isPositive = row.margin >= 0;
                return (
                  <tr
                    key={row.auctionId}
                    style={{
                      background: i % 2 === 0 ? "#fff" : "#FAFAFA",
                    }}
                  >
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
                    <td style={{ padding: "12px 16px", whiteSpace: "nowrap" }}>
                      <span
                        style={{
                          fontWeight: 700,
                          color: "#22C55E",
                          fontSize: "0.88rem",
                        }}
                      >
                        {row.winningBid.toLocaleString()} EGP
                      </span>
                    </td>
                    <td style={{ padding: "12px 16px", whiteSpace: "nowrap" }}>
                      <span
                        style={{
                          fontSize: "0.82rem",
                          color: colors.textSecondary,
                        }}
                      >
                        {row.actualPrice > 0
                          ? `${row.actualPrice.toLocaleString()} EGP`
                          : "—"}
                      </span>
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      {row.actualPrice > 0 ? (
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
      )}
    </Paper>
  );
}
