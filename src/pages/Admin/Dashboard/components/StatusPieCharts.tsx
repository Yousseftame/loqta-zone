/**
 * src/pages/Admin/Dashboard/components/StatusPieCharts.tsx
 *
 * Pie charts using the EXACT same Paper/header/body shell as TopAuctionsCharts.
 * Pie segments use a high-contrast multi-hue palette for clear readability.
 */

import { Box, Paper, Chip } from "@mui/material";
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

// Distinct, high-contrast palette — each slice is immediately readable at a glance
const PIE_COLORS = ["#0EA5E9", "#10B981", "#F59E0B", "#8B5CF6", "#F43F5E"];

const RADIAN = Math.PI / 180;
const renderLabel = ({
  cx,
  cy,
  midAngle,
  innerRadius,
  outerRadius,
  percent,
}: any) => {
  if (percent < 0.08) return null;
  const r = innerRadius + (outerRadius - innerRadius) * 0.55;
  const x = cx + r * Math.cos(-midAngle * RADIAN);
  const y = cy + r * Math.sin(-midAngle * RADIAN);
  return (
    <text
      x={x}
      y={y}
      fill="#fff"
      textAnchor="middle"
      dominantBaseline="central"
      style={{
        fontSize: 11,
        fontWeight: 700,
        fontFamily: "system-ui, sans-serif",
      }}
    >
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

interface Segment {
  name: string;
  value: number;
}

function PieCard({
  title,
  segments,
  loading,
}: {
  title: string;
  segments: Segment[];
  loading?: boolean;
}) {
  const nonEmpty = segments.filter((s) => s.value > 0);
  const total = segments.reduce((a, b) => a + b.value, 0);

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
      {/* Header — pixel-identical to BarCard header */}
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
          label={total.toLocaleString()}
          size="small"
          sx={{
            bgcolor: colors.primary,
            color: "#fff",
            fontWeight: 700,
            fontSize: "0.68rem",
          }}
        />
      </Box>

      {/* Body */}
      <Box sx={{ p: { xs: 2, md: 2.5 } }}>
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
                width: 110,
                height: 110,
                borderRadius: "50%",
                background: "linear-gradient(180deg,#e8e8e8,#f0f0f0)",
                animation: "shimmer 1.4s infinite",
              }}
            />
          </Box>
        ) : nonEmpty.length === 0 ? (
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
                data={nonEmpty}
                cx="50%"
                cy="46%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={3}
                dataKey="value"
                labelLine={false}
                label={renderLabel}
              >
                {nonEmpty.map((_e, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  borderRadius: 10,
                  border: `1px solid ${colors.border}`,
                  fontSize: "0.8rem",
                }}
                formatter={(v, name) => [
                  typeof v === "number"
                    ? v.toLocaleString()
                    : Number(v ?? 0).toLocaleString(),
                  name,
                ]}
              />
              <Legend
                iconType="circle"
                iconSize={7}
                formatter={(value) => (
                  <span
                    style={{
                      fontSize: "0.76rem",
                      color: colors.textSecondary,
                      fontWeight: 600,
                      fontFamily: "system-ui, sans-serif",
                    }}
                  >
                    {value}
                  </span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        )}
      </Box>
    </Paper>
  );
}

interface Props {
  analytics: DashboardAnalytics;
  loading?: boolean;
}

export default function StatusPieCharts({ analytics, loading }: Props) {
  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", lg: "repeat(4, 1fr)" },
        gap: 3,
      }}
    >
      <PieCard
        title="Users"
        segments={[
          { name: "Active", value: analytics.activeUsers },
          { name: "Blocked", value: analytics.inactiveUsers },
        ]}
        loading={loading}
      />

      <PieCard
        title="Admin Roles"
        segments={[
          { name: "Admins", value: analytics.totalAdmins },
          { name: "Super Admins", value: analytics.totalSuperAdmins },
        ]}
        loading={loading}
      />

      <PieCard
        title="Auction Status"
        segments={[
          { name: "Live", value: analytics.liveAuctions },
          { name: "Upcoming", value: analytics.upcomingAuctions },
          { name: "Ended", value: analytics.endedAuctions },
        ]}
        loading={loading}
      />

      <PieCard
        title="Products"
        segments={[
          { name: "Active", value: analytics.activeProducts },
          { name: "Inactive", value: analytics.inactiveProducts },
        ]}
        loading={loading}
      />
    </Box>
  );
}
