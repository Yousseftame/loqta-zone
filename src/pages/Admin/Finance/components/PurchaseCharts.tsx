/**
 * src/pages/Admin/Finance/components/PurchaseCharts.tsx
 *
 * Purchase analytics charts — computed entirely from the live purchases array.
 * No extra Firestore reads needed; data comes from usePurchases().
 *
 * Charts:
 *  1. Monthly Purchase Spend (bar) — total purchase cost per month, current year
 *  2. Payment Status Distribution (pie) — paid / partial / unpaid / overdue
 *  3. Top Suppliers by Spend (bar) — top-5 suppliers ranked by totalCost
 *
 * Edge-case safety:
 *  - Future months always show 0 (currentMonth guard)
 *  - Empty arrays render an empty-state placeholder, no crashes
 *  - All number operations guard against NaN with ?? 0
 */

import { useMemo } from "react";
import { Box, Paper, Chip, CircularProgress } from "@mui/material";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { ShoppingCart } from "lucide-react";
import { colors } from "../../Products/products-data";
import { MONTH_LABELS } from "../finance-data";
import { usePurchases } from "@/store/AdminContext/PurchaseContext/PurchaseContext";
import type { Purchase } from "@/pages/Admin/Purchases/purchases-data";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtEGP = (v: number) =>
  v >= 1_000_000
    ? `${(v / 1_000_000).toFixed(1)}M`
    : v >= 1_000
      ? `${(v / 1_000).toFixed(0)}k`
      : v.toLocaleString("en-EG");

const tooltipStyle = {
  borderRadius: 10,
  border: `1px solid ${colors.border}`,
  fontSize: "0.8rem",
};

const PIE_COLORS: Record<string, string> = {
  paid:    "#10B981",
  partial: "#F59E0B",
  unpaid:  "#F43F5E",
  overdue: "#7C3AED",
};

const STATUS_LABEL: Record<string, string> = {
  paid:    "Paid",
  partial: "Partial",
  unpaid:  "Unpaid",
  overdue: "Overdue",
};

const SUPPLIER_COLORS = [
  "#0EA5E9", "#10B981", "#F59E0B", "#8B5CF6", "#F43F5E",
];

// ─── Card wrapper ──────────────────────────────────────────────────────────────

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
        <span style={{ fontWeight: 700, fontSize: "0.9rem", color: colors.primaryDark }}>
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

// ─── Empty state ───────────────────────────────────────────────────────────────

function EmptyState({ label }: { label: string }) {
  return (
    <Box
      sx={{
        height: 240,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 1,
      }}
    >
      <ShoppingCart size={32} style={{ color: colors.textMuted, opacity: 0.5 }} />
      <span style={{ fontSize: "0.82rem", color: colors.textMuted }}>{label}</span>
    </Box>
  );
}

// ─── 1. Monthly Purchase Spend ─────────────────────────────────────────────────
// Bar chart — total purchase cost (totalCost) per month for the current year.
// Future months show 0. Buckets by purchaseDate month.

function MonthlyPurchaseSpend({
  purchases,
  loading,
}: {
  purchases: Purchase[];
  loading: boolean;
}) {
  const currentYear  = new Date().getFullYear();
  const currentMonth = new Date().getMonth(); // 0-indexed

  const data = useMemo(() => {
    const buckets = Array(12).fill(0);
    purchases.forEach((p) => {
      const d = p.purchaseDate instanceof Date ? p.purchaseDate : new Date(p.purchaseDate);
      if (d.getFullYear() === currentYear) {
        const m = d.getMonth();
        buckets[m] += p.totalCost ?? 0;
      }
    });
    return MONTH_LABELS.map((month, i) => ({
      month,
      spend: i <= currentMonth ? buckets[i] : 0,
    }));
  }, [purchases, currentYear, currentMonth]);

  return (
    <ChartCard
      title="Monthly Purchase Spend"
      chip={String(currentYear)}
    >
      {loading ? (
        <Box sx={{ height: 240, display: "flex", alignItems: "flex-end", gap: 1, px: 1 }}>
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
          <BarChart data={data} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={colors.border} vertical={false} />
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
                "Purchase Spend",
              ]}
            />
            <Bar dataKey="spend" fill={colors.primary} radius={[5, 5, 0, 0]} maxBarSize={40} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  );
}

// ─── 2. Payment Status Pie ─────────────────────────────────────────────────────
// Pie chart — count of purchases in each paymentStatus bucket.
// Uses derived paymentStatus from each purchase document.

const RADIAN = Math.PI / 180;

function renderStatusPieLabel({
  cx,
  cy,
  midAngle,
  innerRadius,
  outerRadius,
  percent,
}: {
  cx: number;
  cy: number;
  midAngle: number;
  innerRadius: number;
  outerRadius: number;
  percent: number;
}) {
  if (percent < 0.06) return null;
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
      style={{ fontSize: 11, fontWeight: 700, fontFamily: "system-ui,sans-serif" }}
    >
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
}

function PaymentStatusPie({
  purchases,
  loading,
}: {
  purchases: Purchase[];
  loading: boolean;
}) {
  const data = useMemo(() => {
    const counts: Record<string, number> = { paid: 0, partial: 0, unpaid: 0, overdue: 0 };
    purchases.forEach((p) => {
      const s = p.paymentStatus ?? "unpaid";
      counts[s] = (counts[s] ?? 0) + 1;
    });
    return Object.entries(counts)
      .filter(([, v]) => v > 0)
      .map(([key, value]) => ({ name: STATUS_LABEL[key] ?? key, value, key }));
  }, [purchases]);

  const total = data.reduce((s, d) => s + d.value, 0);

  return (
    <ChartCard title="Payment Status Distribution" chip="Purchases">
      {loading ? (
        <Box sx={{ height: 240, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <CircularProgress sx={{ color: colors.primary }} size={40} />
        </Box>
      ) : total === 0 ? (
        <EmptyState label="No purchases yet" />
      ) : (
        <ResponsiveContainer width="100%" height={240}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="44%"
              innerRadius={52}
              outerRadius={80}
              paddingAngle={2}
              dataKey="value"
              labelLine={false}
              label={renderStatusPieLabel as any}
            >
              {data.map((d, i) => (
                <Cell key={i} fill={PIE_COLORS[d.key] ?? "#94A3B8"} />
              ))}
            </Pie>
            <RTooltip
              contentStyle={tooltipStyle}
              formatter={(v, n) => [`${v} purchases`, n]}
            />
            <Legend
              iconType="circle"
              iconSize={7}
              formatter={(v) => (
                <span style={{ fontSize: "0.74rem", color: colors.textSecondary, fontWeight: 600 }}>
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

// ─── 3. Top Suppliers by Spend ─────────────────────────────────────────────────
// Horizontal bar — top 5 suppliers ranked by total spend (sum of totalCost).

function TopSuppliersBySpend({
  purchases,
  loading,
}: {
  purchases: Purchase[];
  loading: boolean;
}) {
  const data = useMemo(() => {
    const map: Record<string, { name: string; spend: number }> = {};
    purchases.forEach((p) => {
      const key = p.supplierId || p.supplierName;
      if (!map[key]) map[key] = { name: p.supplierName || "Unknown", spend: 0 };
      map[key].spend += p.totalCost ?? 0;
    });
    return Object.values(map)
      .sort((a, b) => b.spend - a.spend)
      .slice(0, 5);
  }, [purchases]);

  return (
    <ChartCard title="Top Suppliers by Spend" chip="Top 5">
      {loading ? (
        <Box sx={{ height: 240, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <CircularProgress sx={{ color: colors.primary }} size={40} />
        </Box>
      ) : data.length === 0 ? (
        <EmptyState label="No supplier data yet" />
      ) : (
        <ResponsiveContainer width="100%" height={240}>
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 4, right: 24, left: 8, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke={colors.border} horizontal={false} />
            <XAxis
              type="number"
              tickFormatter={fmtEGP}
              tick={{ fontSize: 10, fill: colors.textMuted }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              type="category"
              dataKey="name"
              tick={{ fontSize: 10, fill: colors.textMuted, fontWeight: 600 }}
              axisLine={false}
              tickLine={false}
              width={80}
            />
            <RTooltip
              contentStyle={tooltipStyle}
              formatter={(v) => [
                fmtEGP(typeof v === "number" ? v : Number(v ?? 0)) + " EGP",
                "Total Spend",
              ]}
            />
            <Bar dataKey="spend" radius={[0, 5, 5, 0]} maxBarSize={28}>
              {data.map((_, i) => (
                <Cell key={i} fill={SUPPLIER_COLORS[i % SUPPLIER_COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  );
}

// ─── Export ────────────────────────────────────────────────────────────────────

interface Props {
  loading?: boolean;
}

export default function PurchaseCharts({ loading = false }: Props) {
  const { purchases } = usePurchases();

  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: { xs: "1fr", md: "1fr 1fr", lg: "1fr 1fr 1fr" },
        gap: 3,
      }}
    >
      <MonthlyPurchaseSpend purchases={purchases} loading={loading} />
      <PaymentStatusPie     purchases={purchases} loading={loading} />
      <TopSuppliersBySpend  purchases={purchases} loading={loading} />
    </Box>
  );
}
