/**
 * src/pages/Admin/Dashboard/components/StatusPieCharts.tsx
 *
 * Three pie charts: Users, Products, Auctions status distributions.
 */

import { Box, Paper } from "@mui/material";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { colors } from "../../Products/products-data";
import type { DashboardAnalytics } from "../analytics-data";

const RADIAN = Math.PI / 180;

const renderCustomLabel = ({
  cx,
  cy,
  midAngle,
  innerRadius,
  outerRadius,
  percent,
}: any) => {
  if (percent < 0.05) return null;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.55;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text
      x={x}
      y={y}
      fill="#fff"
      textAnchor="middle"
      dominantBaseline="central"
      style={{ fontSize: 11, fontWeight: 700 }}
    >
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

interface PieCardProps {
  title: string;
  data: { name: string; value: number; color: string }[];
  loading?: boolean;
}

function PieCard({ title, data, loading }: PieCardProps) {
  const hasData = data.some((d) => d.value > 0);

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
      </Box>
      <Box sx={{ p: 2 }}>
        {loading ? (
          <Box
            sx={{
              height: 220,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Box
              sx={{
                width: 120,
                height: 120,
                borderRadius: "50%",
                background:
                  "linear-gradient(90deg,#f0f0f0 25%,#e8e8e8 50%,#f0f0f0 75%)",
                backgroundSize: "200% 100%",
                animation: "shimmer 1.4s infinite",
              }}
            />
          </Box>
        ) : !hasData ? (
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
            <PieChart>
              <Pie
                data={data.filter((d) => d.value > 0)}
                cx="50%"
                cy="50%"
                innerRadius={48}
                outerRadius={80}
                paddingAngle={3}
                dataKey="value"
                labelLine={false}
                label={renderCustomLabel}
              >
                {data
                  .filter((d) => d.value > 0)
                  .map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
              </Pie>
              <Tooltip
                formatter={(value) => [
                  typeof value === "number" ? value.toLocaleString() : value,
                  "",
                ]}
                contentStyle={{
                  borderRadius: 10,
                  border: `1px solid ${colors.border}`,
                  fontSize: "0.8rem",
                }}
              />
              <Legend
                iconType="circle"
                iconSize={8}
                formatter={(value) => (
                  <span
                    style={{
                      fontSize: "0.78rem",
                      color: colors.textSecondary,
                      fontWeight: 600,
                    }}
                  >
                    {value}
                  </span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        )}
        {/* Totals row */}
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            gap: 2,
            mt: 1,
            flexWrap: "wrap",
          }}
        >
          {data.map((d) => (
            <Box
              key={d.name}
              sx={{ display: "flex", alignItems: "center", gap: 0.5 }}
            >
              <Box
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  bgcolor: d.color,
                  flexShrink: 0,
                }}
              />
              <span
                style={{
                  fontSize: "0.72rem",
                  color: colors.textMuted,
                  fontWeight: 600,
                }}
              >
                {d.name}:{" "}
                <strong style={{ color: colors.textPrimary }}>
                  {d.value.toLocaleString()}
                </strong>
              </span>
            </Box>
          ))}
        </Box>
      </Box>
    </Paper>
  );
}

interface Props {
  analytics: DashboardAnalytics;
  loading?: boolean;
}

export default function StatusPieCharts({ analytics, loading }: Props) {
  const usersData = [
    { name: "Active", value: analytics.activeUsers, color: "#38BDF8" },
    { name: "Inactive", value: analytics.inactiveUsers, color: "#EF4444" },
  ];

  const adminsData = [
    { name: "Admins", value: analytics.totalAdmins, color: colors.primary },
    {
      name: "Super Admins",
      value: analytics.totalSuperAdmins,
      color: "#7C3AED",
    },
  ];

  const auctionsData = [
    { name: "Live", value: analytics.liveAuctions, color: "#38BDF8" },
    { name: "Upcoming", value: analytics.upcomingAuctions, color: "#3B82F6" },
    { name: "Ended", value: analytics.endedAuctions, color: "#94A3B8" },
  ];

  const productsData = [
    { name: "Active", value: analytics.activeProducts, color: "#38BDF8" },
    { name: "Inactive", value: analytics.inactiveProducts, color: "#EF4444" },
  ];

  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", lg: "repeat(4, 1fr)" },
        gap: 3,
      }}
    >
      <PieCard title="Users Distribution" data={usersData} loading={loading} />
      <PieCard title="Admin Roles" data={adminsData} loading={loading} />
      <PieCard title="Auction Status" data={auctionsData} loading={loading} />
      <PieCard
        title="Products Distribution"
        data={productsData}
        loading={loading}
      />
    </Box>
  );
}
