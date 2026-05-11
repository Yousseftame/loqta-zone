/**
 * src/pages/Admin/Finance/FinancePage.tsx  (updated — adds Payment Accounts tab)
 *
 * Only change vs original: adds a tab bar with three tabs:
 *   Overview (existing content) | Transactions (existing) | Payment Accounts (new)
 *
 * Zero existing logic is changed. All original imports remain intact.
 */

import { useState } from "react";
import { Box, Button, IconButton, Tooltip, Dialog, DialogTitle, DialogContent, DialogActions, TextField, CircularProgress } from "@mui/material";
import {
  DollarSign,
  RefreshCw,
  PlusCircle,
  CreditCard,
  List,
  LayoutDashboard,
  BarChart2,
  UserPlus,
} from "lucide-react";
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
import NetProfitLoss from "./components/NetProfitLoss";
import PaymentAccountsTab from "./components/PaymentAccountsTab";
import AnalyticsDashboardTab from "./components/AnalyticsDashboardTab";
import type { TransactionFormValues } from "./finance-data";

// ─── Tab definitions ──────────────────────────────────────────────────────────

type FinanceTab = "overview" | "transactions" | "accounts" | "analytics";

const TABS: { key: FinanceTab; label: string; icon: React.ReactNode }[] = [
  { key: "overview", label: "Overview", icon: <LayoutDashboard size={15} /> },
  { key: "transactions", label: "Transactions", icon: <List size={15} /> },
  {
    key: "accounts",
    label: "Payment Accounts",
    icon: <CreditCard size={15} />,
  },
  {
    key: "analytics",
    label: "Analytics Dashboard",
    icon: <BarChart2 size={15} />,
  },
];

export default function FinancePage() {
  const { user, role } = useAuth();
  const {
    stats,
    transactions,
    owners,
    loading,
    adding,
    updating,
    error,
    addTransaction,
    updateTransaction,
    addOwner,
    deleteOwner,
  } = useFinance();

  const [activeTab, setActiveTab] = useState<FinanceTab>("overview");
  const [modalOpen, setModalOpen] = useState(false);
  const [ownerModalOpen, setOwnerModalOpen] = useState(false);
  const [newOwnerName, setNewOwnerName] = useState("");
  const [ownerToDelete, setOwnerToDelete] = useState<typeof owners[0] | null>(null);
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

  const handleAddTransaction = async (values: TransactionFormValues) => {
    await addTransaction(values, user?.uid ?? "", user?.displayName ?? "Admin");
  };

  const handleUpdateTransaction = async (
    txId: string,
    values: TransactionFormValues,
  ) => {
    await updateTransaction(
      txId,
      values,
      user?.uid ?? "",
      user?.displayName ?? "Admin",
    );
    toast.success("Transaction updated successfully.");
  };

  const handleAddOwner = async () => {
    if (!newOwnerName.trim()) return;
    try {
      await addOwner(newOwnerName);
      toast.success("Owner added successfully!");
      setOwnerModalOpen(false);
      setNewOwnerName("");
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to add owner");
    }
  };

  const handleDeleteOwner = (ownerId: string) => {
    const owner = owners.find((o) => o.id === ownerId);
    if (!owner) return;
    setOwnerToDelete(owner);
  };

  const confirmDeleteOwner = async () => {
    if (!ownerToDelete) return;
    const currentBalance = stats.ownerBalances?.[ownerToDelete.id] ?? 0;
    try {
      await deleteOwner(ownerToDelete.id, currentBalance);
      toast.success("Owner deleted successfully");
      setOwnerToDelete(null);
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to delete owner");
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

      {/* ── Header ── */}
      <Box
        sx={{
          mb: 3,
          display: "flex",
          flexDirection: { xs: "column", sm: "row" },
          alignItems: { xs: "flex-start", sm: "center" },
          justifyContent: "space-between",
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

        <Box 
          sx={{ 
            display: "flex", 
            gap: 1, 
            alignItems: "center",
            width: { xs: "100%", sm: "auto" },
            justifyContent: { xs: "flex-start", sm: "flex-end" }
          }}
        >
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
                    p: { xs: 0.75, sm: 1 },
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
          {activeTab !== "accounts" && (
            <>
              <Button
                variant="outlined"
                startIcon={<UserPlus size={16} />}
                onClick={() => setOwnerModalOpen(true)}
                sx={{
                  borderRadius: 2,
                  textTransform: "none",
                  fontWeight: 700,
                  fontSize: { xs: "0.75rem", sm: "0.875rem" },
                  px: { xs: 1.5, sm: 2 },
                  py: { xs: 0.75, sm: 1 },
                  borderColor: colors.border, // Subtle border
                  color: colors.textPrimary,
                  "&:hover": { borderColor: colors.primary, bgcolor: colors.primaryBg },
                }}
              >
                Add Owner
              </Button>
              <Button
                variant="contained"
                startIcon={<PlusCircle size={16} />}
                onClick={() => setModalOpen(true)}
                sx={{
                  borderRadius: 2,
                  textTransform: "none",
                  fontWeight: 700,
                  fontSize: { xs: "0.75rem", sm: "0.875rem" },
                  px: { xs: 1.5, sm: 2 },
                  py: { xs: 0.75, sm: 1 },
                  bgcolor: colors.primary,
                  boxShadow: "0 4px 12px rgba(37, 99, 235, 0.2)",
                  "&:hover": { bgcolor: colors.primaryDark },
                }}
              >
                Add Transaction
              </Button>
            </>
          )}
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

      {/* ── Tab Bar ── */}
      {/* Outer wrapper: scrollable on mobile, normal on desktop */}
      <Box
        sx={{
          mb: 3,
          overflowX: { xs: "auto", md: "visible" },
          /* hide scrollbar visually but keep it functional */
          "&::-webkit-scrollbar": { display: "none" },
          msOverflowStyle: "none",
          scrollbarWidth: "none",
        }}
      >
        <Box
          sx={{
            display: "flex",
            gap: 0,
            borderRadius: 12,
            border: `1px solid ${colors.border}`,
            background: "#fff",
            overflow: "hidden",
            /* mobile: natural content width so all tabs are reachable */
            width: { xs: "max-content", md: "fit-content" },
            boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
          }}
        >
          {TABS.map((tab, i) => {
            const active = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "9px 18px",
                  border: "none",
                  borderRight:
                    i < TABS.length - 1 ? `1px solid ${colors.border}` : "none",
                  background: active ? colors.primary : "transparent",
                  color: active ? "#fff" : colors.textSecondary,
                  fontSize: "0.78rem",
                  fontWeight: active ? 700 : 500,
                  cursor: "pointer",
                  transition: "all 0.15s",
                  whiteSpace: "nowrap",
                }}
              >
                {tab.icon}
                {tab.label}
              </button>
            );
          })}
        </Box>
      </Box>

      {/* ── Tab Content ── */}

      {/* OVERVIEW tab */}
      {activeTab === "overview" && (
        <>
          <Box sx={{ mb: 4 }}>
            <NetProfitLoss transactions={transactions} loading={loading} />
          </Box>

          <SectionLabel label="Balances" />
          <Box sx={{ mb: 4 }}>
            <FinanceCards 
        stats={stats} 
        owners={owners} 
        loading={loading} 
        onDeleteOwner={handleDeleteOwner}
      />
          </Box>

          <SectionLabel label="Analytics" />
          <Box sx={{ mb: 4 }}>
            <FinanceCharts stats={stats} loading={loading} />
          </Box>
        </>
      )}

      {/* TRANSACTIONS tab */}
      {activeTab === "transactions" && (
        <>
          <SectionLabel label="All Transactions" />
          <TransactionsTable
            transactions={transactions}
            stats={stats}
            loading={loading}
            updating={updating}
            onUpdateTransaction={handleUpdateTransaction}
          />
        </>
      )}

      {/* PAYMENT ACCOUNTS tab */}
      {activeTab === "accounts" && (
        <PaymentAccountsTab transactions={transactions} loading={loading} />
      )}

      {/* ANALYTICS tab */}
      {activeTab === "analytics" && <AnalyticsDashboardTab />}

      {/* ── Add Transaction Modal (available on all tabs except accounts) ── */}
      <AddTransactionModal
        open={modalOpen}
        adding={adding}
        updating={false}
        onClose={() => setModalOpen(false)}
        onSubmit={handleAddTransaction}
        stats={stats}
        owners={owners}
      />

      {/* ── Add Owner Modal ── */}
      <Dialog
        open={ownerModalOpen}
        onClose={() => setOwnerModalOpen(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3, p: 1 } }}
      >
        <DialogTitle sx={{ fontWeight: 800, fontSize: "1.1rem" }}>
          Add New Owner
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 1 }}>
            <TextField
              label="Owner Name"
              size="small"
              fullWidth
              value={newOwnerName}
              onChange={(e) => setNewOwnerName(e.target.value)}
              sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
              autoFocus
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={() => setOwnerModalOpen(false)}
            disabled={adding}
            sx={{
              borderRadius: 2,
              textTransform: "none",
              color: colors.textSecondary,
              fontWeight: 600,
            }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleAddOwner}
            disabled={adding || !newOwnerName.trim()}
            sx={{
              borderRadius: 2,
              textTransform: "none",
              fontWeight: 700,
              bgcolor: colors.primary,
              "&:hover": { bgcolor: colors.primaryDark },
            }}
          >
            {adding ? <CircularProgress size={18} sx={{ color: "#fff" }} /> : "Save Owner"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Delete Owner Confirmation Modal ── */}
      <Dialog
        open={!!ownerToDelete}
        onClose={() => setOwnerToDelete(null)}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3, p: 1 } }}
      >
        <DialogTitle sx={{ fontWeight: 800, fontSize: "1.1rem" }}>
          Delete Owner
        </DialogTitle>
        <DialogContent>
          <p style={{ margin: 0, fontSize: "0.9rem", color: colors.textSecondary, lineHeight: 1.5 }}>
            Are you sure you want to delete <strong style={{ color: colors.textPrimary }}>{ownerToDelete?.name}</strong>?
          </p>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={() => setOwnerToDelete(null)}
            disabled={adding}
            sx={{
              borderRadius: 2,
              textTransform: "none",
              color: colors.textSecondary,
              fontWeight: 600,
            }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={confirmDeleteOwner}
            disabled={adding}
            sx={{
              borderRadius: 2,
              textTransform: "none",
              fontWeight: 700,
              bgcolor: "#ef4444",
              "&:hover": { bgcolor: "#dc2626" },
            }}
          >
            {adding ? <CircularProgress size={18} sx={{ color: "#fff" }} /> : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>
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
