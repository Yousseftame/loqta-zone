/**
 * src/pages/Admin/Finance/components/FinanceCharts.tsx
 *
 * Changes:
 *  1. "Income vs Expenses" line chart → replaced with "Available Balance vs Expenses"
 *     Available Balance per month = monthlyIncome[i] - monthlyExpenses[i] (running net for that month).
 *     This is the monthly available (net) income, not total income.
 *  2. Expenses pie chart: ALL categories now render. Small slices (<7%) have their
 *     percentage label rendered OUTSIDE the slice with a connector line, so nothing is hidden.
 */

import { Box, Paper, Chip } from "@mui/material";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip as RTooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  LineChart,
  Line,
} from "recharts";
import { colors } from "../../Products/products-data";
import {
  MONTH_LABELS,
  CATEGORY_LABEL,
  type FinanceStats,
} from "../finance-data";

const PIE_COLORS = [
  "#0EA5E9",
  "#10B981",
  "#F59E0B",
  "#8B5CF6",
  "#F43F5E",
  "#6366F1",
  "#14B8A6",
  "#F97316",
  "#EC4899",
  "#84CC16",
];
const AVAILABLE_CLR = "#818cf8"; // indigo — matches Available Balance card
const EXPENSE_CLR = "#F43F5E";

const fmtEGP = (v: number) =>
  v >= 1_000_000
    ? `${(v / 1_000_000).toFixed(1)}M`
    : v >= 1_000
      ? `${(v / 1_000).toFixed(0)}k`
      : v.toLocaleString();

const tooltipStyle = {
  borderRadius: 10,
  border: `1px solid ${colors.border}`,
  fontSize: "0.8rem",
};

// ─── Wrapper card ─────────────────────────────────────────────────────────────

function ChartCard({
  title,
  chip,
  children,
}: {
  title: string;
  chip?: string;
  children: React.ReactNode;
}) {
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
        {chip && (
          <Chip
            label={chip}
            size="small"
            sx={{
              bgcolor: colors.primary,
              color: "#fff",
              fontWeight: 700,
              fontSize: "0.68rem",
            }}
          />
        )}
      </Box>
      <Box sx={{ p: { xs: 2, md: 2.5 } }}>{children}</Box>
    </Paper>
  );
}

// ─── 1. Expenses Pie — ALL categories shown, small slices use outside label ───

function ExpensesPie({
  stats,
  loading,
}: {
  stats: FinanceStats;
  loading: boolean;
}) {
  const data = Object.entries(stats.expensesByCategory)
    .filter(([, v]) => v > 0)
    .map(([k, v]) => ({ name: CATEGORY_LABEL[k] ?? k, value: v }))
    .sort((a, b) => b.value - a.value);

  const RADIAN = Math.PI / 180;

  // Custom label: renders INSIDE for large slices, OUTSIDE (with line) for small ones.
  // This ensures every slice shows its percentage — nothing is hidden.
  const renderLabel = ({
    cx,
    cy,
    midAngle,
    innerRadius,
    outerRadius,
    percent,
    index,
  }: any) => {
    const pct = (percent * 100).toFixed(0);

    if (percent >= 0.07) {
      // Large enough → label inside the slice
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
          {`${pct}%`}
        </text>
      );
    }

    // Small slice → label outside with a connector line
    const outerR = outerRadius + 18;
    const lineStart = outerRadius + 4;
    const sx = cx + lineStart * Math.cos(-midAngle * RADIAN);
    const sy = cy + lineStart * Math.sin(-midAngle * RADIAN);
    const ex = cx + outerR * Math.cos(-midAngle * RADIAN);
    const ey = cy + outerR * Math.sin(-midAngle * RADIAN);
    const textAnchor = ex > cx ? "start" : "end";

    return (
      <g>
        <line
          x1={sx}
          y1={sy}
          x2={ex}
          y2={ey}
          stroke={PIE_COLORS[index % PIE_COLORS.length]}
          strokeWidth={1}
        />
        <text
          x={ex + (textAnchor === "start" ? 4 : -4)}
          y={ey}
          textAnchor={textAnchor}
          dominantBaseline="central"
          style={{
            fontSize: 10,
            fontWeight: 700,
            fontFamily: "system-ui, sans-serif",
            fill: colors.primaryDark,
          }}
        >
          {`${pct}%`}
        </text>
      </g>
    );
  };

  return (
    <ChartCard title="Expenses by Category" chip="Pie">
      {loading ? (
        <Box
          sx={{
            height: 260,
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
              bgcolor: "#EFF6FF",
              animation: "shimmer 1.4s infinite",
            }}
          />
        </Box>
      ) : data.length === 0 ? (
        <Box
          sx={{
            height: 260,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <span style={{ color: colors.textMuted, fontSize: "0.85rem" }}>
            No expense data yet
          </span>
        </Box>
      ) : (
        <ResponsiveContainer width="100%" height={260}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="44%"
              innerRadius={48}
              outerRadius={76}
              paddingAngle={2}
              dataKey="value"
              labelLine={false}
              label={renderLabel}
            >
              {data.map((_, i) => (
                <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
              ))}
            </Pie>
            <RTooltip
              contentStyle={tooltipStyle}
              formatter={(v, n) => [
                fmtEGP(typeof v === "number" ? v : Number(v ?? 0)) + " EGP",
                n,
              ]}
            />
            <Legend
              iconType="circle"
              iconSize={7}
              formatter={(v) => (
                <span
                  style={{
                    fontSize: "0.74rem",
                    color: colors.textSecondary,
                    fontWeight: 600,
                  }}
                >
                  {v}
                </span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  );
}

// ─── 2. Monthly Expenses Bar ──────────────────────────────────────────────────

function MonthlyExpensesBar({
  stats,
  loading,
}: {
  stats: FinanceStats;
  loading: boolean;
}) {
  const data = MONTH_LABELS.map((month, i) => ({
    month,
    expenses: stats.monthlyExpenses[i] ?? 0,
  }));

  return (
    <ChartCard
      title="Expenses per Month"
      chip={new Date().getFullYear().toString()}
    >
      {loading ? (
        <Box
          sx={{
            height: 240,
            display: "flex",
            alignItems: "flex-end",
            gap: 1,
            px: 1,
          }}
        >
          {[50, 80, 60, 90, 70, 55, 85, 65, 75, 50, 80, 60].map((h, i) => (
            <Box
              key={i}
              sx={{
                flex: 1,
                height: `${h}%`,
                borderRadius: "4px 4px 0 0",
                bgcolor: "#EFF6FF",
                animation: "shimmer 1.4s infinite",
              }}
            />
          ))}
        </Box>
      ) : (
        <ResponsiveContainer width="100%" height={240}>
          <BarChart
            data={data}
            margin={{ top: 4, right: 8, left: -16, bottom: 0 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke={colors.border}
              vertical={false}
            />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 10, fill: colors.textMuted, fontWeight: 600 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tickFormatter={fmtEGP}
              tick={{ fontSize: 10, fill: colors.textMuted }}
              axisLine={false}
              tickLine={false}
              width={44}
            />
            <RTooltip
              contentStyle={tooltipStyle}
              formatter={(v) => [
                fmtEGP(typeof v === "number" ? v : Number(v ?? 0)) + " EGP",
                "Expenses",
              ]}
            />
            <Bar
              dataKey="expenses"
              fill={EXPENSE_CLR}
              radius={[5, 5, 0, 0]}
              maxBarSize={40}
            />
          </BarChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  );
}

// ─── 3. Available Balance vs Expenses Line ────────────────────────────────────
// "Available Balance" per month = monthlyIncome[i] - monthlyExpenses[i]
// This shows the net available (income minus expenses) for each month,
// replacing the previous "Total Income" line.

function AvailableVsExpensesLine({
  stats,
  loading,
}: {
  stats: FinanceStats;
  loading: boolean;
}) {
  const data = MONTH_LABELS.map((month, i) => ({
    month,
    available: (stats.monthlyIncome[i] ?? 0) - (stats.monthlyExpenses[i] ?? 0),
    expenses: stats.monthlyExpenses[i] ?? 0,
  }));

  return (
    <ChartCard title="Available Balance vs Expenses" chip="Monthly">
      {loading ? (
        <Box
          sx={{
            height: 240,
            bgcolor: "#EFF6FF",
            borderRadius: 2,
            animation: "shimmer 1.4s infinite",
          }}
        />
      ) : (
        <ResponsiveContainer width="100%" height={240}>
          <LineChart
            data={data}
            margin={{ top: 4, right: 12, left: -16, bottom: 0 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke={colors.border}
              vertical={false}
            />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 10, fill: colors.textMuted, fontWeight: 600 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tickFormatter={fmtEGP}
              tick={{ fontSize: 10, fill: colors.textMuted }}
              axisLine={false}
              tickLine={false}
              width={44}
            />
            <RTooltip
              contentStyle={tooltipStyle}
              formatter={(v, n) => [
                fmtEGP(Number(v ?? 0)) + " EGP",
                n === "available" ? "Available Balance" : "Expenses",
              ]}
            />
            <Legend
              iconType="circle"
              iconSize={7}
              formatter={(v) => (
                <span
                  style={{
                    fontSize: "0.74rem",
                    color: colors.textSecondary,
                    fontWeight: 600,
                  }}
                >
                  {v === "available" ? "Available Balance" : "Expenses"}
                </span>
              )}
            />
            <Line
              type="monotone"
              dataKey="available"
              stroke={AVAILABLE_CLR}
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 5 }}
            />
            <Line
              type="monotone"
              dataKey="expenses"
              stroke={EXPENSE_CLR}
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  );
}

// ─── Export ───────────────────────────────────────────────────────────────────

interface Props {
  stats: FinanceStats;
  loading?: boolean;
}

export default function FinanceCharts({ stats, loading = false }: Props) {
  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: { xs: "1fr", md: "1fr 1fr", lg: "1fr 1fr 1fr" },
        gap: 3,
      }}
    >
      <ExpensesPie stats={stats} loading={loading} />
      <MonthlyExpensesBar stats={stats} loading={loading} />
      <AvailableVsExpensesLine stats={stats} loading={loading} />
    </Box>
  );
}
