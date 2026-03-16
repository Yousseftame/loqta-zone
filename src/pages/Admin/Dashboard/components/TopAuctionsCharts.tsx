/**
 * src/pages/Admin/Dashboard/components/TopAuctionsCharts.tsx
 *
 * Bar charts for top auctions by bids, participants, and winning bid.
 */

import { Box, Paper, Chip } from "@mui/material";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from "recharts";
import { colors } from "../../Products/products-data";
import type { TopAuctionsAnalytics, TopAuction } from "../analytics-data";

const ACCENT_COLORS = [
  colors.primary, "#3D6A8A", "#4A90BE", "#0EA5E9", "#38BDF8",
];

interface BarCardProps {
  title: string;
  data: TopAuction[];
  dataKey: keyof TopAuction;
  valueLabel: string;
  formatter?: (v: number) => string;
  loading?: boolean;
}

function BarCard({ title, data, dataKey, valueLabel, formatter, loading }: BarCardProps) {
  const chartData = data.map((a) => ({
    name: `#${a.auctionNumber}`,
    fullName: a.productTitle,
    value: a[dataKey] as number,
  }));

  const fmt = formatter ?? ((v: number) => v.toLocaleString());

  return (
    <Paper
      elevation={0}
      sx={{
        borderRadius: 3,
        border: `1px solid ${colors.border}`,
        overflow: "hidden",
        flex: 1,
        minWidth: 0,
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
          {title}
        </span>
        <Chip
          label={`Top ${data.length}`}
          size="small"
          sx={{
            bgcolor: colors.primary,
            color: "#fff",
            fontWeight: 700,
            fontSize: "0.68rem",
          }}
        />
      </Box>
      <Box sx={{ p: { xs: 2, md: 2.5 } }}>
        {loading ? (
          <Box
            sx={{
              height: 220,
              display: "flex",
              alignItems: "flex-end",
              gap: 1,
              px: 2,
            }}
          >
            {[60, 90, 75, 50, 80].map((h, i) => (
              <Box
                key={i}
                sx={{
                  flex: 1,
                  height: `${h}%`,
                  borderRadius: "4px 4px 0 0",
                  background: "linear-gradient(180deg,#e8e8e8,#f0f0f0)",
                  animation: "shimmer 1.4s infinite",
                }}
              />
            ))}
          </Box>
        ) : data.length === 0 ? (
          <Box
            sx={{
              height: 220,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <p
              style={{
                color: colors.textMuted,
                fontSize: "0.85rem",
                margin: 0,
              }}
            >
              No data yet
            </p>
          </Box>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart
              data={chartData}
              margin={{ top: 4, right: 8, left: -16, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke={colors.border}
                vertical={false}
              />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11, fill: colors.textMuted, fontWeight: 600 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tickFormatter={fmt}
                tick={{ fontSize: 10, fill: colors.textMuted }}
                axisLine={false}
                tickLine={false}
                width={48}
              />
              <Tooltip
                cursor={{ fill: `${colors.primary}10` }}
                contentStyle={{
                  borderRadius: 10,
                  border: `1px solid ${colors.border}`,
                  fontSize: "0.8rem",
                }}
                formatter={(value, _name, item) => [
                  fmt(Number(value ?? 0)),
                  item?.payload?.fullName || valueLabel,
                ]}
              />

              <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={56}>
                {chartData.map((_entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={ACCENT_COLORS[index % ACCENT_COLORS.length]}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </Box>
    </Paper>
  );
}

interface Props {
  topAuctions: TopAuctionsAnalytics;
  loading?: boolean;
}

export default function TopAuctionsCharts({ topAuctions, loading }: Props) {
  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: { xs: "1fr", md: "1fr 1fr 1fr" },
        gap: 3,
      }}
    >
      <BarCard
        title="Top Auctions by Bids"
        data={topAuctions.byBids}
        dataKey="totalBids"
        valueLabel="Bids"
        loading={loading}
      />
      <BarCard
        title="Top by Participants"
        data={topAuctions.byParticipants}
        dataKey="totalParticipants"
        valueLabel="Participants"
        loading={loading}
      />
      <BarCard
        title="Top by Winning Bid"
        data={topAuctions.byWinningBid}
        dataKey="winningBid"
        valueLabel="EGP"
        formatter={(v) => `${(v / 1000).toFixed(0)}k`}
        loading={loading}
      />
    </Box>
  );
}