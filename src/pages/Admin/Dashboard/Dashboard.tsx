/**
 * src/pages/Admin/Dashboard/Dashboard.tsx
 *
 * Admin analytics dashboard.
 * Reads 2 Firestore documents total (analytics/dashboard + analytics/topAuctions).
 * Real-time via onSnapshot.
 */

import { Box, IconButton, Tooltip } from "@mui/material";
import {
  Users,
  Package,
  Gavel,
  Star,
  TrendingUp,
  BarChart2,
  Layers,
  Ticket,
  FileText,
  RefreshCw,
  Tag,
} from "lucide-react";
import { getFunctions, httpsCallable } from "firebase/functions";
import { useState } from "react";
import toast from "react-hot-toast";
import app from "@/firebase/firebase";
import { useAuth } from "@/store/AuthContext/AuthContext";
import { colors } from "../Products/products-data";
import { useAnalytics } from "@/hooks/useAnalytics";

// ── Components ────────────────────────────────────────────────────────────────
import MetricCard from "./components/MetricCard";
import StatusPieCharts from "./components/StatusPieCharts";
import TopAuctionsCharts from "./components/TopAuctionsCharts";
import MarginReportTable from "./components/MarginReportTable";

export default function Dashboard() {
  const { analytics, topAuctions, loading, error, refetch } = useAnalytics();
  const { role } = useAuth();
  const [rebuilding, setRebuilding] = useState(false);

  const handleRebuild = async () => {
    if (rebuilding) return;
    setRebuilding(true);
    try {
      const fn = httpsCallable(getFunctions(app), "rebuildAnalytics");
      await fn({});
      await refetch();
      toast.success("Analytics rebuilt successfully");
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to rebuild analytics");
    } finally {
      setRebuilding(false);
    }
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, bgcolor: "#F8FAFC", minHeight: "100vh" }}>
      {/* ── Global style for shimmer ──────────────────────────────────────── */}
      <style>{`
        @keyframes shimmer {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <Box
        sx={{
          mb: 4,
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 2,
        }}
      >
        <div>
          <h1
            style={{
              margin: 0,
              fontSize: "1.75rem",
              fontWeight: 700,
              color: colors.primary,
            }}
          >
            <BarChart2
              size={28}
              style={{
                display: "inline",
                marginRight: 8,
                verticalAlign: "middle",
              }}
            />
            Analytics Dashboard
          </h1>
          <p
            style={{
              margin: "4px 0 0",
              color: colors.textSecondary,
              fontSize: "0.875rem",
            }}
          >
            Real-time insights across your platform
            {analytics.updatedAt && (
              <span style={{ marginLeft: 8, color: colors.textMuted }}>
                · Last updated {analytics.updatedAt.toLocaleTimeString()}
              </span>
            )}
          </p>
        </div>
        {role === "superAdmin" && (
          <Tooltip title="Rebuild analytics from scratch (superAdmin only)">
            <span>
              <IconButton
                onClick={handleRebuild}
                disabled={rebuilding}
                sx={{
                  border: `1px solid ${colors.border}`,
                  borderRadius: 2,
                  color: colors.primary,
                  "&:hover": { bgcolor: colors.primaryBg },
                }}
              >
                <RefreshCw
                  size={18}
                  style={{
                    animation: rebuilding ? "spin 1s linear infinite" : "none",
                  }}
                />
              </IconButton>
            </span>
          </Tooltip>
        )}
      </Box>

      {/* ── Section: Top Auctions ───────────────────────────────────────────── */}
      <SectionLabel label="Top Auctions" />
      <Box sx={{ mb: 4 }}>
        <TopAuctionsCharts topAuctions={topAuctions} loading={loading} />
      </Box>

      {/* ── Section: Status Distributions ──────────────────────────────────── */}
      <SectionLabel label="Status Distributions" />
      <Box sx={{ mb: 4 }}>
        <StatusPieCharts analytics={analytics} loading={loading} />
      </Box>

      {/* ── Section: Key Metrics ────────────────────────────────────────────── */}
      <SectionLabel label="Key Metrics" />
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr 1fr",
            sm: "repeat(3, 1fr)",
            lg: "repeat(5, 1fr)",
          },
          gap: 2.5,
          mb: 2.5,
        }}
      >
        <MetricCard
          label="Total Users"
          value={analytics.totalUsers}
          icon={<Users size={20} />}
          sub={`${analytics.activeUsers} active · ${analytics.inactiveUsers} blocked`}
          accentIndex={0}
          delay={0}
          loading={loading}
        />
        <MetricCard
          label="Total Products"
          value={analytics.totalProducts}
          icon={<Package size={20} />}
          sub={`${analytics.activeProducts} active · ${analytics.inactiveProducts} inactive`}
          accentIndex={1}
          delay={50}
          loading={loading}
        />
        <MetricCard
          label="Total Auctions"
          value={analytics.totalAuctions}
          icon={<Gavel size={20} />}
          sub={`${analytics.liveAuctions} live · ${analytics.upcomingAuctions} upcoming`}
          accentIndex={2}
          delay={100}
          loading={loading}
        />
        <MetricCard
          label="Highest Bid"
          value={
            analytics.highestWinningBid > 0
              ? `${analytics.highestWinningBid.toLocaleString()} EGP`
              : "—"
          }
          icon={<TrendingUp size={20} />}
          sub={`Avg: ${Math.round(analytics.avgWinningBid).toLocaleString()} EGP`}
          accentIndex={3}
          delay={150}
          loading={loading}
        />
        <MetricCard
          label="Avg Rating"
          value={
            analytics.avgRating > 0
              ? `${analytics.avgRating.toFixed(1)} / 5`
              : "—"
          }
          icon={<Star size={20} />}
          sub={`${analytics.totalRatings} reviews`}
          accentIndex={4}
          delay={200}
          loading={loading}
        />
      </Box>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr 1fr",
            sm: "repeat(3, 1fr)",
            lg: "repeat(5, 1fr)",
          },
          gap: 2.5,
          mb: 4,
        }}
      >
        <MetricCard
          label="Total Inventory"
          value={analytics.totalInventory.toLocaleString()}
          icon={<Layers size={20} />}
          sub="units across all products"
          accentIndex={0}
          delay={0}
          loading={loading}
        />
        <MetricCard
          label="Categories"
          value={analytics.totalCategories}
          icon={<Tag size={20} />}
          accentIndex={1}
          delay={50}
          loading={loading}
        />
        <MetricCard
          label="Vouchers"
          value={analytics.totalVouchers}
          icon={<Ticket size={20} />}
          accentIndex={2}
          delay={100}
          loading={loading}
        />
        <MetricCard
          label="Auction Requests"
          value={analytics.totalAuctionRequests}
          icon={<FileText size={20} />}
          accentIndex={3}
          delay={150}
          loading={loading}
        />
        <MetricCard
          label="Total Revenue"
          value={`${analytics.totalRevenue.toLocaleString()} EGP`}
          icon={<TrendingUp size={20} />}
          sub={`Avg margin ${analytics.avgMargin.toFixed(1)}%`}
          accentIndex={4}
          delay={200}
          loading={loading}
        />
      </Box>

      {/* ── Section: Financial Report ───────────────────────────────────────── */}
      <SectionLabel label="Financial Report" />
      <MarginReportTable topAuctions={topAuctions} loading={loading} />
    </Box>
  );
}

// ─── Section label ────────────────────────────────────────────────────────────

function SectionLabel({ label }: { label: string }) {
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2 }}>
      <Box
        sx={{ width: 3, height: 18, bgcolor: colors.primary, borderRadius: 2 }}
      />
      <span
        style={{
          fontSize: "0.78rem",
          fontWeight: 800,
          color: colors.textMuted,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
        }}
      >
        {label}
      </span>
    </Box>
  );
}
