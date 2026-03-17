/**
 * src/pages/Admin/Finance/components/FinanceCharts.tsx
 *
 * Three charts — all inside the same Paper/header shell as TopAuctionsCharts:
 *   1. Pie  — Expenses by Category
 *   2. Bar  — Monthly Expenses
 *   3. Line — Income vs Expenses over the year
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

// Consistent palette across all three charts
const PIE_COLORS = [
  "#0EA5E9",
  "#10B981",
  "#F59E0B",
  "#8B5CF6",
  "#F43F5E",
  "#6366F1",
  "#14B8A6",
];
const INCOME_CLR = "#10B981";
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

// ─── Wrapper card — identical shell to TopAuctions BarCard ───────────────────

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

// ─── 1. Expenses Pie ──────────────────────────────────────────────────────────

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
  const renderLabel = ({
    cx,
    cy,
    midAngle,
    innerRadius,
    outerRadius,
    percent,
  }: any) => {
    if (percent < 0.07) return null;
    const r = innerRadius + (outerRadius - innerRadius) * 0.55;
    return (
      <text
        x={cx + r * Math.cos(-midAngle * RADIAN)}
        y={cy + r * Math.sin(-midAngle * RADIAN)}
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

  return (
    <ChartCard title="Expenses by Category" chip="Pie">
      {loading ? (
        <Box
          sx={{
            height: 240,
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
            height: 240,
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
        <ResponsiveContainer width="100%" height={240}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="44%"
              innerRadius={52}
              outerRadius={84}
              paddingAngle={3}
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
              formatter={(v, n) => [
                fmtEGP(typeof v === "number" ? v : Number(v ?? 0)) + " EGP",
                n === "income" ? "Income" : "Expenses",
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

// ─── 3. Income vs Expenses Line ───────────────────────────────────────────────

function IncomeVsExpensesLine({
  stats,
  loading,
}: {
  stats: FinanceStats;
  loading: boolean;
}) {
  const data = MONTH_LABELS.map((month, i) => ({
    month,
    income: stats.monthlyIncome[i] ?? 0,
    expenses: stats.monthlyExpenses[i] ?? 0,
  }));

  return (
    <ChartCard title="Income vs Expenses" chip="Monthly">
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
                n === "income" ? "Income" : "Expenses",
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
                  {v === "income" ? "Income" : "Expenses"}
                </span>
              )}
            />
            <Line
              type="monotone"
              dataKey="income"
              stroke={INCOME_CLR}
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
      <IncomeVsExpensesLine stats={stats} loading={loading} />
    </Box>
  );
}
