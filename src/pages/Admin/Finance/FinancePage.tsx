import { useState } from "react";
import { Box, Button, IconButton, Tooltip } from "@mui/material";
import { DollarSign, RefreshCw, PlusCircle } from "lucide-react";
import { getFunctions, httpsCallable } from "firebase/functions";
import toast from "react-hot-toast";
import app from "@/firebase/firebase";
import { useAuth } from "@/store/AuthContext/AuthContext";
import { colors } from "../Products/products-data";
import { useFinance } from "@/hooks/useFinance";

import FinanceCards from "./components/FinanceCards";
import FinanceCharts from "./components/FinanceCharts";
import TransactionsTable from "./components/TransactionsTable";
import AddTransactionModal from "./components/AddTransactionModal";

export default function FinancePage() {
  const { user, role } = useAuth();
  const { stats, transactions, loading, adding, error, addTransaction } =
    useFinance();

  const [modalOpen, setModalOpen] = useState(false);
  const [rebuilding, setRebuilding] = useState(false);

  const handleRebuild = async () => {
    if (rebuilding) return;
    setRebuilding(true);
    try {
      const fn = httpsCallable(getFunctions(app), "rebuildFinanceStats");
      const result = (await fn({})) as any;
      toast.success(
        `Finance rebuilt — ${result.data.processed} transactions processed`,
      );
    } catch (err: any) {
      toast.error(err?.message ?? "Rebuild failed");
    } finally {
      setRebuilding(false);
    }
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, bgcolor: "#F8FAFC", minHeight: "100vh" }}>
      <style>{`
        @keyframes shimmer {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>

      {/* ── Header ───────────────────────────────────────────────────────── */}
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
            <DollarSign
              size={26}
              style={{
                display: "inline",
                marginRight: 8,
                verticalAlign: "middle",
              }}
            />
            Finance
          </h1>
          <p
            style={{
              margin: "4px 0 0",
              color: colors.textSecondary,
              fontSize: "0.875rem",
            }}
          >
            Track income, expenses and balances
            {stats.updatedAt && (
              <span style={{ marginLeft: 8, color: colors.textMuted }}>
                · Updated {stats.updatedAt.toLocaleTimeString()}
              </span>
            )}
          </p>
        </div>

        <Box sx={{ display: "flex", gap: 1.5, alignItems: "center" }}>
          {role === "superAdmin" && (
            <Tooltip title="Rebuild finance stats from scratch">
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
                      animation: rebuilding
                        ? "spin 1s linear infinite"
                        : "none",
                    }}
                  />
                </IconButton>
              </span>
            </Tooltip>
          )}
          <Button
            variant="contained"
            startIcon={<PlusCircle size={16} />}
            onClick={() => setModalOpen(true)}
            sx={{
              borderRadius: 2,
              textTransform: "none",
              fontWeight: 700,
              bgcolor: colors.primary,
              "&:hover": { bgcolor: colors.primaryDark },
            }}
          >
            Add Transaction
          </Button>
        </Box>
      </Box>

      {error && (
        <Box
          sx={{
            mb: 3,
            p: 2,
            bgcolor: "#FEE2E2",
            borderRadius: 2,
            color: "#991B1B",
            fontSize: "0.85rem",
          }}
        >
          {error}
        </Box>
      )}

      {/* ── Balance Cards ─────────────────────────────────────────────────── */}
      <SectionLabel label="Balances" />
      <Box sx={{ mb: 4 }}>
        <FinanceCards stats={stats} loading={loading} />
      </Box>

      {/* ── Charts ───────────────────────────────────────────────────────── */}
      <SectionLabel label="Analytics" />
      <Box sx={{ mb: 4 }}>
        <FinanceCharts stats={stats} loading={loading} />
      </Box>

      {/* ── Transactions ─────────────────────────────────────────────────── */}
      <SectionLabel label="Recent Transactions" />
      {/* Pass stats so TransactionsTable can compute running available balance */}
      <TransactionsTable
        transactions={transactions}
        stats={stats}
        loading={loading}
      />

      {/* ── Modal ────────────────────────────────────────────────────────── */}
      <AddTransactionModal
        open={modalOpen}
        adding={adding}
        onClose={() => setModalOpen(false)}
        onSubmit={(values) =>
          addTransaction(values, user?.uid ?? "", user?.displayName ?? "Admin")
        }
      />
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
