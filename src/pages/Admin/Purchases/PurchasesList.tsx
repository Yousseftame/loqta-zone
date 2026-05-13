/**
 * src/pages/Admin/Purchases/PurchasesList.tsx
 *
 * Full purchase management page with:
 *   - Payment type + status display (cash / credit / partial)
 *   - Overdue detection with live badge
 *   - Record Payment modal (for credit/partial purchases)
 *   - Mark as Fully Paid action
 *   - Payment History drawer per purchase
 *   - Liabilities summary cards (what we owe suppliers)
 *   - Filtered views: All / Unpaid / Overdue / Partial
 */

import { useState, useEffect, useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Button,
  TextField,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TablePagination,
  InputAdornment,
  Paper,
  Box,
  CircularProgress,
  Chip,
  Tab,
  Tabs,
  Tooltip,
  MenuItem,
} from "@mui/material";
import {
  Plus,
  Search,
  X,
  AlertTriangle,
  Edit,
  Trash2,
  RefreshCw,
  ShoppingCart,

  TrendingUp,
  CheckCircle2,
  CreditCard,
  Clock,
  DollarSign,
  AlertCircle,
  Banknote,
  History,
  CheckCheck,
} from "lucide-react";
import { colors } from "@/pages/Admin/Products/products-data";
import { usePurchases } from "@/store/AdminContext/PurchaseContext/PurchaseContext";
import type {
  Purchase,
  PurchaseFormData,
  PurchaseStatus,
  PaymentStatus,
  PurchasePayment,
  RecordPaymentFormData,
} from "./purchases-data";
import {
  STATUS_CONFIG,
  PAYMENT_STATUS_CONFIG,
  PAYMENT_TYPE_CONFIG,
  DEFAULT_RECORD_PAYMENT_FORM,
} from "./purchases-data";
import PurchaseModal from "./components/PurchaseModal";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(d: Date | null | undefined): string {
  if (!d) return "—";
  return d.toLocaleDateString("en-EG", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function fmtEGP(n: number): string {
  return `${n.toLocaleString("en-EG")} EGP`;
}

function isDueSoon(dueDate: Date | null): boolean {
  if (!dueDate) return false;
  const days = (dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
  return days >= 0 && days <= 7;
}

// ─── Status Quick-change pill ─────────────────────────────────────────────────

function StatusChip({
  status,
  purchaseId,
  onChange,
}: {
  status: PurchaseStatus;
  purchaseId: string;
  onChange: (id: string, s: PurchaseStatus) => void;
}) {
  const [open, setOpen] = useState(false);
  const cfg = STATUS_CONFIG[status];
  return (
    <Box sx={{ position: "relative", display: "inline-block" }}>
      <Chip
        label={`${cfg.emoji} ${cfg.label}`}
        size="small"
        onClick={() => setOpen((v) => !v)}
        sx={{
          bgcolor: cfg.bg,
          color: cfg.color,
          fontWeight: 700,
          fontSize: "0.7rem",
          border: `1px solid ${cfg.border}`,
          cursor: "pointer",
          "&:hover": { opacity: 0.85 },
        }}
      />
      {open && (
        <>
          <Box
            onClick={() => setOpen(false)}
            sx={{ position: "fixed", inset: 0, zIndex: 9 }}
          />
          <Box
            sx={{
              position: "absolute",
              top: "calc(100% + 4px)",
              left: 0,
              zIndex: 10,
              bgcolor: "#fff",
              borderRadius: 2,
              border: `1px solid ${colors.border}`,
              boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
              minWidth: 140,
              overflow: "hidden",
            }}
          >
            {(
              Object.entries(STATUS_CONFIG) as [
                PurchaseStatus,
                (typeof STATUS_CONFIG)[PurchaseStatus],
              ][]
            ).map(([key, c]) => (
              <Box
                key={key}
                onClick={() => {
                  onChange(purchaseId, key);
                  setOpen(false);
                }}
                sx={{
                  px: 1.5,
                  py: 1,
                  cursor: "pointer",
                  fontSize: "0.78rem",
                  fontWeight: key === status ? 700 : 500,
                  bgcolor: key === status ? c.bg : "transparent",
                  color: c.color,
                  "&:hover": { bgcolor: c.bg },
                  transition: "background 0.1s",
                }}
              >
                {c.emoji} {c.label}
              </Box>
            ))}
          </Box>
        </>
      )}
    </Box>
  );
}

// ─── Payment Status badge ─────────────────────────────────────────────────────

function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  const cfg = PAYMENT_STATUS_CONFIG[status];
  return (
    <Chip
      label={`${cfg.emoji} ${cfg.label}`}
      size="small"
      sx={{
        bgcolor: cfg.bg,
        color: cfg.color,
        fontWeight: 700,
        fontSize: "0.7rem",
        border: `1px solid ${cfg.border}`,
      }}
    />
  );
}

// ─── Record Payment Dialog ────────────────────────────────────────────────────

function RecordPaymentDialog({
  open,
  purchase,
  saving,
  onClose,
  onRecord,
}: {
  open: boolean;
  purchase: Purchase | null;
  saving: boolean;
  onClose: () => void;
  onRecord: (formData: RecordPaymentFormData) => Promise<void>;
}) {
  const [form, setForm] = useState<RecordPaymentFormData>(
    DEFAULT_RECORD_PAYMENT_FORM,
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setError(null);
      setForm({
        ...DEFAULT_RECORD_PAYMENT_FORM,
        amount: purchase?.remainingAmount
          ? String(purchase.remainingAmount)
          : "",
      });
    }
  }, [open, purchase]);

  const set = <K extends keyof RecordPaymentFormData>(
    k: K,
    v: RecordPaymentFormData[K],
  ) => setForm((prev) => ({ ...prev, [k]: v }));

  const validate = (): string | null => {
    const amount = parseFloat(form.amount);
    if (!form.amount || isNaN(amount) || amount <= 0)
      return "Enter a valid payment amount.";
    if (purchase && amount > purchase.remainingAmount)
      return `Amount cannot exceed remaining balance of ${fmtEGP(purchase.remainingAmount)}.`;
    if (!form.paidAt) return "Select a payment date.";
    return null;
  };

  const handleSubmit = async () => {
    setError(null);
    const err = validate();
    if (err) {
      setError(err);
      return;
    }
    try {
      await onRecord(form);
    } catch (e: unknown) {
      setError((e as Error)?.message ?? "Failed to record payment.");
    }
  };

  if (!purchase) return null;

  const inputSx = {
    "& .MuiOutlinedInput-root": {
      bgcolor: "#fff",
      "& fieldset": { borderColor: colors.border },
      "&:hover fieldset": { borderColor: colors.primary },
      "&.Mui-focused fieldset": { borderColor: colors.primary, borderWidth: 2 },
    },
    "& .MuiInputLabel-root.Mui-focused": { color: colors.primary },
  };

  return (
    <Dialog
      open={open}
      onClose={() => !saving && onClose()}
      maxWidth="xs"
      fullWidth
      PaperProps={{ sx: { borderRadius: 3 } }}
    >
      <DialogTitle
        sx={{
          fontWeight: 700,
          fontSize: "0.95rem",
          color: colors.primaryDark,
          borderBottom: `1px solid ${colors.border}`,
          pb: 2,
          display: "flex",
          alignItems: "center",
          gap: 1,
        }}
      >
        <Banknote size={17} style={{ color: colors.primary }} />
        Record Payment
      </DialogTitle>

      <DialogContent
        sx={{
          pt: "20px !important",
          display: "flex",
          flexDirection: "column",
          gap: 2,
        }}
      >
        {/* Summary */}
        <Box
          sx={{
            p: 1.5,
            borderRadius: 2,
            bgcolor: colors.primaryBg,
            border: `1px solid ${colors.primaryRing}`,
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: "0.78rem",
              fontWeight: 600,
              color: colors.primaryDark,
            }}
          >
            {purchase.productTitle} — {purchase.supplierName}
          </p>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 1,
              mt: 1,
            }}
          >
            <Box>
              <p
                style={{
                  margin: 0,
                  fontSize: "0.62rem",
                  color: colors.textMuted,
                  textTransform: "uppercase",
                  fontWeight: 600,
                }}
              >
                Total
              </p>
              <p
                style={{
                  margin: "2px 0 0",
                  fontSize: "0.85rem",
                  fontWeight: 700,
                  color: colors.textPrimary,
                }}
              >
                {fmtEGP(purchase.totalCost)}
              </p>
            </Box>
            <Box>
              <p
                style={{
                  margin: 0,
                  fontSize: "0.62rem",
                  color: "#7F1D1D",
                  textTransform: "uppercase",
                  fontWeight: 600,
                }}
              >
                Still Owed
              </p>
              <p
                style={{
                  margin: "2px 0 0",
                  fontSize: "0.85rem",
                  fontWeight: 700,
                  color: "#DC2626",
                }}
              >
                {fmtEGP(purchase.remainingAmount)}
              </p>
            </Box>
          </Box>
        </Box>

        {error && (
          <Box
            sx={{
              p: 1.5,
              bgcolor: "#FEE2E2",
              borderRadius: 2,
              fontSize: "0.8rem",
              color: "#7F1D1D",
            }}
          >
            {error}
          </Box>
        )}

        {/* Amount */}
        <TextField
          label="Payment Amount (EGP) *"
          type="number"
          size="small"
          fullWidth
          value={form.amount}
          onChange={(e) => set("amount", e.target.value)}
          inputProps={{
            min: 0.01,
            step: "0.01",
            max: purchase.remainingAmount,
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <span style={{ fontSize: "0.8rem", color: colors.textMuted }}>
                  EGP
                </span>
              </InputAdornment>
            ),
          }}
          helperText={`Max: ${fmtEGP(purchase.remainingAmount)}`}
          FormHelperTextProps={{ sx: { fontSize: "0.7rem" } }}
          sx={inputSx}
        />

        {/* Method */}
        <TextField
          label="Payment Method"
          select
          size="small"
          fullWidth
          value={form.method}
          onChange={(e) => set("method", e.target.value as "cash" | "bank")}
          sx={inputSx}
        >
          <MenuItem value="cash">💵 Cash</MenuItem>
          <MenuItem value="bank">🏦 Bank Transfer</MenuItem>
        </TextField>

        {/* Date */}
        <TextField
          label="Payment Date *"
          type="date"
          size="small"
          fullWidth
          value={form.paidAt}
          onChange={(e) => set("paidAt", e.target.value)}
          InputLabelProps={{ shrink: true }}
          sx={inputSx}
        />

        {/* Note */}
        <TextField
          label="Note (optional)"
          size="small"
          fullWidth
          value={form.note}
          onChange={(e) => set("note", e.target.value)}
          sx={inputSx}
        />
      </DialogContent>

      <DialogActions
        sx={{ px: 3, pb: 2.5, borderTop: `1px solid ${colors.border}`, gap: 1 }}
      >
        <Button
          onClick={onClose}
          disabled={saving}
          sx={{ textTransform: "none", color: colors.textSecondary }}
        >
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={saving}
          sx={{
            textTransform: "none",
            fontWeight: 700,
            bgcolor: colors.primary,
            "&:hover": { bgcolor: colors.primaryDark },
            minWidth: 120,
            borderRadius: 2,
          }}
        >
          {saving ? (
            <CircularProgress size={16} sx={{ color: "#fff" }} />
          ) : (
            "Record Payment"
          )}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ─── Payment History Dialog ───────────────────────────────────────────────────

function PaymentHistoryDialog({
  open,
  purchase,
  payments,
  loadingHistory,
  onClose,
}: {
  open: boolean;
  purchase: Purchase | null;
  payments: PurchasePayment[];
  loadingHistory: boolean;
  onClose: () => void;
}) {
  if (!purchase) return null;
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{ sx: { borderRadius: 3 } }}
    >
      <DialogTitle
        sx={{
          fontWeight: 700,
          fontSize: "0.95rem",
          color: colors.primaryDark,
          borderBottom: `1px solid ${colors.border}`,
          pb: 2,
          display: "flex",
          alignItems: "center",
          gap: 1,
        }}
      >
        <History size={17} style={{ color: colors.primary }} />
        Payment History — {purchase.productTitle}
      </DialogTitle>
      <DialogContent sx={{ pt: "20px !important" }}>
        {/* Summary bar */}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 1.5,
            mb: 2.5,
          }}
        >
          {[
            {
              label: "Total Cost",
              value: fmtEGP(purchase.totalCost),
              color: colors.primaryDark,
            },
            {
              label: "Paid",
              value: fmtEGP(purchase.paidAmount),
              color: "#16A34A",
            },
            {
              label: "Remaining",
              value: fmtEGP(purchase.remainingAmount),
              color: "#DC2626",
            },
          ].map(({ label, value, color }) => (
            <Box
              key={label}
              sx={{
                p: 1.5,
                borderRadius: 2,
                bgcolor: "#F8FAFC",
                border: `1px solid ${colors.border}`,
                textAlign: "center",
              }}
            >
              <p
                style={{
                  margin: 0,
                  fontSize: "0.62rem",
                  color: colors.textMuted,
                  fontWeight: 600,
                  textTransform: "uppercase",
                }}
              >
                {label}
              </p>
              <p
                style={{
                  margin: "4px 0 0",
                  fontSize: "0.85rem",
                  fontWeight: 800,
                  color,
                }}
              >
                {value}
              </p>
            </Box>
          ))}
        </Box>

        {loadingHistory ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
            <CircularProgress size={28} sx={{ color: colors.primary }} />
          </Box>
        ) : payments.length === 0 ? (
          <Box sx={{ textAlign: "center", py: 4, color: colors.textMuted }}>
            <History
              size={32}
              style={{ margin: "0 auto 8px", display: "block" }}
            />
            <p style={{ margin: 0, fontSize: "0.875rem" }}>
              No payments recorded yet
            </p>
          </Box>
        ) : (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
            {payments.map((pay) => (
              <Box
                key={pay.id}
                sx={{
                  p: 1.5,
                  borderRadius: 2,
                  bgcolor: "#F8FAFC",
                  border: `1px solid ${colors.border}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <Box>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <span
                      style={{
                        fontWeight: 700,
                        fontSize: "0.9rem",
                        color: "#16A34A",
                      }}
                    >
                      +{fmtEGP(pay.amount)}
                    </span>
                    <Chip
                      label={pay.method === "cash" ? "💵 Cash" : "🏦 Bank"}
                      size="small"
                      sx={{
                        fontSize: "0.65rem",
                        height: 18,
                        bgcolor: "#F1F5F9",
                        color: colors.textSecondary,
                      }}
                    />
                  </Box>
                  {pay.note && (
                    <p
                      style={{
                        margin: "2px 0 0",
                        fontSize: "0.72rem",
                        color: colors.textMuted,
                      }}
                    >
                      {pay.note}
                    </p>
                  )}
                  <p
                    style={{
                      margin: "2px 0 0",
                      fontSize: "0.7rem",
                      color: colors.textMuted,
                    }}
                  >
                    by {pay.recordedByName} · {fmtDate(pay.paidAt)}
                  </p>
                </Box>
              </Box>
            ))}
          </Box>
        )}
      </DialogContent>
      <DialogActions
        sx={{ px: 3, pb: 2, borderTop: `1px solid ${colors.border}` }}
      >
        <Button
          onClick={onClose}
          sx={{ textTransform: "none", color: colors.textSecondary }}
        >
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ─── Mark Fully Paid Confirmation Dialog ─────────────────────────────────────

function MarkFullyPaidDialog({
  open,
  purchase,
  saving,
  onClose,
  onConfirm,
}: {
  open: boolean;
  purchase: Purchase | null;
  saving: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}) {
  if (!purchase) return null;
  return (
    <Dialog
      open={open}
      onClose={() => !saving && onClose()}
      maxWidth="xs"
      fullWidth
      PaperProps={{ sx: { borderRadius: 3 } }}
    >
      <DialogTitle
        sx={{
          fontWeight: 700,
          fontSize: "0.95rem",
          color: "#0D9488",
          borderBottom: `1px solid ${colors.border}`,
          pb: 2,
          display: "flex",
          alignItems: "center",
          gap: 1,
        }}
      >
        <CheckCheck size={18} style={{ color: "#0D9488" }} />
        Confirm Full Payment
      </DialogTitle>

      <DialogContent sx={{ pt: "20px !important", display: "flex", flexDirection: "column", gap: 2 }}>
        {/* Summary */}
        <Box
          sx={{
            p: 1.5,
            borderRadius: 2,
            bgcolor: "#F0FDFA",
            border: "1px solid #99F6E4",
          }}
        >
          <p style={{ margin: 0, fontSize: "0.78rem", fontWeight: 600, color: "#0F766E" }}>
            {purchase.productTitle} — {purchase.supplierName}
          </p>
          <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1, mt: 1 }}>
            <Box>
              <p style={{ margin: 0, fontSize: "0.62rem", color: colors.textMuted, textTransform: "uppercase", fontWeight: 600 }}>Total Cost</p>
              <p style={{ margin: "2px 0 0", fontSize: "0.85rem", fontWeight: 700, color: colors.textPrimary }}>{fmtEGP(purchase.totalCost)}</p>
            </Box>
            <Box>
              <p style={{ margin: 0, fontSize: "0.62rem", color: "#7F1D1D", textTransform: "uppercase", fontWeight: 600 }}>Remaining to Pay</p>
              <p style={{ margin: "2px 0 0", fontSize: "0.85rem", fontWeight: 700, color: "#DC2626" }}>{fmtEGP(purchase.remainingAmount)}</p>
            </Box>
          </Box>
        </Box>

        {/* Warning */}
        <Box sx={{ display: "flex", gap: 1.5, p: 1.5, borderRadius: 2, bgcolor: "#FFFBEB", border: "1px solid #FDE68A" }}>
          <span style={{ fontSize: "1rem", flexShrink: 0 }}>⚠️</span>
          <p style={{ margin: 0, fontSize: "0.72rem", color: "#92400E", lineHeight: 1.5 }}>
            This will mark the entire remaining balance of{" "}
            <strong>{fmtEGP(purchase.remainingAmount)}</strong> as paid and
            close this purchase. This action <strong>cannot be undone</strong> —
            it creates a payment record in the audit trail.
          </p>
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2.5, borderTop: `1px solid ${colors.border}`, gap: 1 }}>
        <Button
          onClick={onClose}
          disabled={saving}
          sx={{ textTransform: "none", color: colors.textSecondary }}
        >
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={onConfirm}
          disabled={saving}
          startIcon={saving ? <CircularProgress size={14} color="inherit" /> : <CheckCheck size={15} />}
          sx={{
            textTransform: "none",
            fontWeight: 700,
            bgcolor: "#0D9488",
            "&:hover": { bgcolor: "#0F766E" },
            minWidth: 150,
            borderRadius: 2,
          }}
        >
          {saving ? "Processing…" : "Yes, Mark Fully Paid"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ─── Tab values ───────────────────────────────────────────────────────────────

type FilterTab = "all" | "unpaid" | "overdue" | "partial";

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function PurchasesList() {
  const {
    purchases,
    loading,
    error,
    refreshPurchases,
    addPurchase,
    editPurchase,
    removePurchase,
    changeStatus,
    recordPayment,
    markFullyPaid,
    getPurchasePayments,
  } = usePurchases();

  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [activeTab, setActiveTab] = useState<FilterTab>("all");

  // Modals
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingPurchase, setEditingPurchase] = useState<Purchase | null>(null);

  // Delete
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [toDelete, setToDelete] = useState<Purchase | null>(null);
  const [loadingDelete, setLoadingDelete] = useState(false);

  // Record payment
  const [paymentDialog, setPaymentDialog] = useState(false);
  const [paymentTarget, setPaymentTarget] = useState<Purchase | null>(null);
  const [recordingSaving, setRecordingSaving] = useState(false);

  // History
  const [historyDialog, setHistoryDialog] = useState(false);
  const [historyTarget, setHistoryTarget] = useState<Purchase | null>(null);
  const [historyPayments, setHistoryPayments] = useState<PurchasePayment[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Mark fully paid confirmation
  const [markPaidDialog, setMarkPaidDialog] = useState(false);
  const [markPaidTarget, setMarkPaidTarget] = useState<Purchase | null>(null);
  const [markPaidSaving, setMarkPaidSaving] = useState(false);

  // ── Computed stats ──────────────────────────────────────────────────────────

  const stats = useMemo(() => {
    const totalSpend = purchases.reduce((s, p) => s + p.totalCost, 0);
    const totalOwed = purchases.reduce((s, p) => s + p.remainingAmount, 0);
    const overdueAmount = purchases
      .filter((p) => p.paymentStatus === "overdue")
      .reduce((s, p) => s + p.remainingAmount, 0);
    const receivedCount = purchases.filter(
      (p) => p.status === "received",
    ).length;
    const overdueCount = purchases.filter(
      (p) => p.paymentStatus === "overdue",
    ).length;
    const unpaidCount = purchases.filter(
      (p) => p.paymentStatus === "unpaid" || p.paymentStatus === "partial",
    ).length;
    return {
      totalSpend,
      totalOwed,
      overdueAmount,
      receivedCount,
      overdueCount,
      unpaidCount,
    };
  }, [purchases]);

  // ── Filtered list ───────────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    let list = purchases;

    // Tab filter
    if (activeTab === "unpaid") {
      list = list.filter((p) => p.paymentStatus === "unpaid");
    } else if (activeTab === "overdue") {
      list = list.filter((p) => p.paymentStatus === "overdue");
    } else if (activeTab === "partial") {
      list = list.filter((p) => p.paymentStatus === "partial");
    }

    // Text search
    if (searchTerm.trim()) {
      const s = searchTerm.toLowerCase();
      list = list.filter(
        (p) =>
          p.productTitle.toLowerCase().includes(s) ||
          p.supplierName.toLowerCase().includes(s) ||
          p.notes.toLowerCase().includes(s) ||
          STATUS_CONFIG[p.status].label.toLowerCase().includes(s) ||
          PAYMENT_TYPE_CONFIG[p.paymentType].label.toLowerCase().includes(s),
      );
    }
    return list;
  }, [purchases, searchTerm, activeTab]);

  const paginated = filtered.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage,
  );

  useEffect(() => {
    setPage(0);
  }, [searchTerm, activeTab]);

  // ── Handlers ───────────────────────────────────────────────────────────────

  const openAdd = () => {
    setEditingPurchase(null);
    setModalOpen(true);
  };
  const openEdit = (p: Purchase) => {
    setEditingPurchase(p);
    setModalOpen(true);
  };

  const handleSave = async (formData: PurchaseFormData) => {
    setSaving(true);
    try {
      if (editingPurchase) await editPurchase(editingPurchase.id, formData);
      else await addPurchase(formData);
      setModalOpen(false);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!toDelete) return;
    setLoadingDelete(true);
    try {
      await removePurchase(toDelete.id);
      setDeleteDialog(false);
      setToDelete(null);
    } finally {
      setLoadingDelete(false);
    }
  };

  const openRecordPayment = (p: Purchase) => {
    setPaymentTarget(p);
    setPaymentDialog(true);
  };

  const handleRecordPayment = async (formData: RecordPaymentFormData) => {
    if (!paymentTarget) return;
    setRecordingSaving(true);
    try {
      await recordPayment(paymentTarget.id, formData);
      setPaymentDialog(false);
      setPaymentTarget(null);
    } finally {
      setRecordingSaving(false);
    }
  };

  const openMarkPaidConfirm = (p: Purchase) => {
    setMarkPaidTarget(p);
    setMarkPaidDialog(true);
  };

  const handleMarkFullyPaid = async () => {
    if (!markPaidTarget) return;
    setMarkPaidSaving(true);
    try {
      await markFullyPaid(markPaidTarget.id);
      setMarkPaidDialog(false);
      setMarkPaidTarget(null);
    } catch {
      /* toast handled in context */
    } finally {
      setMarkPaidSaving(false);
    }
  };

  const openHistory = async (p: Purchase) => {
    setHistoryTarget(p);
    setHistoryDialog(true);
    setLoadingHistory(true);
    setHistoryPayments([]);
    const payments = await getPurchasePayments(p.id);
    setHistoryPayments(payments);
    setLoadingHistory(false);
  };

  // ── Loading / Error ─────────────────────────────────────────────────────────

  if (loading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "60vh",
        }}
      >
        <CircularProgress sx={{ color: colors.primary }} />
      </Box>
    );
  }

  if (error) {
    return (
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 2,
          minHeight: "60vh",
          justifyContent: "center",
        }}
      >
        <p style={{ color: colors.error }}>{error}</p>
        <Button
          onClick={refreshPurchases}
          startIcon={<RefreshCw size={16} />}
          variant="contained"
          sx={{ bgcolor: colors.primary }}
        >
          Retry
        </Button>
      </Box>
    );
  }

  // ── Stat card data ──────────────────────────────────────────────────────────

  const statCards = [
    {
      label: "Total Orders",
      value: purchases.length,
      icon: <ShoppingCart size={22} />,
      warn: false,
    },
    {
      label: "Total Spend",
      value: fmtEGP(stats.totalSpend),
      icon: <TrendingUp size={22} />,
      warn: false,
    },
    {
      label: "Total Owed",
      value: fmtEGP(stats.totalOwed),
      icon: <CreditCard size={22} />,
      warn: stats.totalOwed > 0,
    },
    {
      label: "Overdue",
      value: fmtEGP(stats.overdueAmount),
      icon: <AlertCircle size={22} />,
      warn: stats.overdueAmount > 0,
    },
    {
      label: "Received",
      value: stats.receivedCount,
      icon: <CheckCircle2 size={22} />,
      warn: false,
    },
    {
      label: "Unpaid / Partial",
      value: stats.unpaidCount,
      icon: <Clock size={22} />,
      warn: stats.unpaidCount > 0,
    },
  ];

  return (
    <Box
      sx={{
        mx: "auto",
        p: { xs: 2, md: 3 },
        bgcolor: "#F8FAFC",
        minHeight: "100vh",
      }}
    >
      {/* ── Header ── */}
      <Box
        sx={{
          mb: 4,
          display: "flex",
          flexDirection: { xs: "column", sm: "row" },
          alignItems: { sm: "center" },
          justifyContent: "space-between",
          gap: 2,
        }}
      >
        <div>
          <h1
            style={{
              color: colors.primary,
              margin: 0,
              fontSize: "1.75rem",
              fontWeight: 700,
            }}
          >
            <ShoppingCart
              size={28}
              style={{
                display: "inline",
                marginRight: 8,
                verticalAlign: "middle",
              }}
            />
            Purchase Orders
          </h1>
          <p
            style={{
              color: colors.textSecondary,
              margin: "4px 0 0",
              fontSize: "0.875rem",
            }}
          >
            Track supplier purchases with full payment accounting
          </p>
        </div>
        <Box sx={{ display: "flex", gap: 1 }}>
          <IconButton
            onClick={refreshPurchases}
            sx={{
              color: colors.primary,
              border: `1px solid ${colors.border}`,
              borderRadius: 2,
            }}
            title="Refresh"
          >
            <RefreshCw size={18} />
          </IconButton>
          <Button
            variant="contained"
            startIcon={<Plus size={18} />}
            onClick={openAdd}
            sx={{
              bgcolor: colors.primary,
              color: "white",
              textTransform: "none",
              px: 3,
              py: 1.5,
              borderRadius: 2,
              fontWeight: 600,
              boxShadow: "none",
              "&:hover": { bgcolor: "#111" },
            }}
          >
            New Purchase Order
          </Button>
        </Box>
      </Box>

      {/* ── Stat Cards ── */}
      <Box
        sx={{
          display: "grid",
          gap: { xs: 1.5, md: 2 },
          gridTemplateColumns: {
            xs: "1fr 1fr",
            sm: "repeat(3, 1fr)",
            md: "repeat(6, 1fr)",
          },
          mb: 3,
        }}
      >
        {statCards.map(({ label, value, icon, warn }) => (
          <Paper
            key={label}
            elevation={0}
            sx={{
              p: { xs: 1.5, md: 2 },
              borderRadius: 3,
              background: warn
                ? "linear-gradient(135deg, #DC2626 0%, #EF4444 100%)"
                : `linear-gradient(135deg, ${colors.primary} 0%, ${colors.primaryLight} 100%)`,
              color: "#fff",
            }}
          >
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 1,
              }}
            >
              <div style={{ minWidth: 0, flex: 1 }}>
                <p
                  style={{
                    fontSize: "0.58rem",
                    fontWeight: 600,
                    opacity: 0.8,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    margin: 0,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {label}
                </p>
                <p
                  style={{
                    fontSize: typeof value === "number" ? "1.4rem" : "0.85rem",
                    fontWeight: 700,
                    margin: "4px 0 0",
                    lineHeight: 1.1,
                    wordBreak: "break-all",
                  }}
                >
                  {value}
                </p>
              </div>
              <Box
                sx={{
                  width: { xs: 30, md: 38 },
                  height: { xs: 30, md: 38 },
                  flexShrink: 0,
                  borderRadius: 10,
                  background: "rgba(255,255,255,0.2)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {icon}
              </Box>
            </Box>
          </Paper>
        ))}
      </Box>

      {/* ── Overdue alert banner ── */}
      {stats.overdueAmount > 0 && (
        <Paper
          elevation={0}
          sx={{
            p: 2,
            mb: 3,
            borderRadius: 2,
            bgcolor: "#FFF7ED",
            border: "1px solid #FED7AA",
            display: "flex",
            alignItems: "center",
            gap: 1.5,
          }}
        >
          <AlertTriangle
            size={18}
            style={{ color: "#F97316", flexShrink: 0 }}
          />
          <p style={{ margin: 0, fontSize: "0.875rem", color: "#7C2D12" }}>
            <strong>Overdue payments:</strong> You have{" "}
            {fmtEGP(stats.overdueAmount)} in overdue supplier payments. Please
            settle outstanding balances to maintain good supplier relationships.
          </p>
        </Paper>
      )}

      {/* ── Search + Tabs ── */}
      <Paper
        elevation={0}
        sx={{
          p: 2,
          mb: 2,
          borderRadius: 3,
          bgcolor: "#fff",
          border: `1px solid ${colors.border}`,
        }}
      >
        <TextField
          placeholder="Search by product, supplier, status…"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          variant="outlined"
          size="small"
          fullWidth
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search size={16} style={{ color: colors.textMuted }} />
              </InputAdornment>
            ),
            endAdornment: searchTerm && (
              <InputAdornment position="end">
                <IconButton size="small" onClick={() => setSearchTerm("")}>
                  <X size={14} />
                </IconButton>
              </InputAdornment>
            ),
          }}
          sx={{
            mb: 2,
            "& .MuiOutlinedInput-root": {
              "& fieldset": { borderColor: colors.border },
              "&:hover fieldset": { borderColor: colors.primary },
              "&.Mui-focused fieldset": { borderColor: colors.primary },
            },
          }}
        />

        <Tabs
          value={activeTab}
          onChange={(_e, v) => setActiveTab(v)}
          variant="scrollable"
          scrollButtons="auto"
          allowScrollButtonsMobile
          sx={{
            minHeight: 36,
            "& .MuiTab-root": {
              textTransform: "none",
              fontSize: { xs: "0.72rem", sm: "0.8rem" },
              minHeight: 36,
              py: 0.5,
              px: { xs: 1.5, sm: 2 },
              minWidth: { xs: "auto", sm: 90 },
            },
            "& .Mui-selected": { color: colors.primary, fontWeight: 700 },
            "& .MuiTabs-indicator": { bgcolor: colors.primary },
          }}
        >
          <Tab value="all" label={`All (${purchases.length})`} />
          <Tab
            value="unpaid"
            label={`Unpaid (${purchases.filter((p) => p.paymentStatus === "unpaid").length})`}
          />
          <Tab
            value="overdue"
            label={`Overdue (${stats.overdueCount})`}
            sx={{
              color: stats.overdueCount > 0 ? "#DC2626 !important" : undefined,
            }}
          />
          <Tab
            value="partial"
            label={`Partial (${purchases.filter((p) => p.paymentStatus === "partial").length})`}
          />
        </Tabs>

        <p
          style={{
            margin: "8px 0 0",
            fontSize: "0.85rem",
            color: colors.textSecondary,
          }}
        >
          <strong style={{ color: colors.primary }}>{filtered.length}</strong>{" "}
          results
        </p>
      </Paper>

      {/* ── Table ── */}
      <Paper
        elevation={0}
        sx={{
          borderRadius: 3,
          bgcolor: "#fff",
          border: `1px solid ${colors.border}`,
          overflow: "hidden",
        }}
      >
        <Box sx={{ overflowX: "auto", width: "100%" }}>
          <Table sx={{ minWidth: 1100 }}>
            <TableHead>
              <TableRow sx={{ bgcolor: colors.primaryBg }}>
                {[
                  "Date",
                  "Product",
                  "Supplier",
                  "Qty",
                  "Total Cost",
                  "Payment Type",
                  "Paid",
                  "Remaining",
                  "Due Date",
                  "Pay. Status",
                  "Status",
                  "Actions",
                ].map((h) => (
                  <TableCell
                    key={h}
                    sx={{
                      fontWeight: 700,
                      color: colors.primaryDark,
                      fontSize: "0.68rem",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      whiteSpace: "nowrap",
                      ...(h === "Actions" && { textAlign: "center" }),
                    }}
                  >
                    {h}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>

            <TableBody>
              {paginated.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={12} align="center" sx={{ py: 10 }}>
                    <ShoppingCart
                      size={44}
                      style={{
                        color: colors.textMuted,
                        margin: "0 auto 12px",
                        display: "block",
                      }}
                    />
                    <p style={{ color: colors.textSecondary, fontWeight: 600 }}>
                      No purchase orders found
                    </p>
                    <p style={{ color: colors.textMuted, fontSize: "0.85rem" }}>
                      {searchTerm
                        ? "Try adjusting your search"
                        : "Create your first purchase order to get started"}
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                paginated.map((p, idx) => {
                  const typeCfg = PAYMENT_TYPE_CONFIG[p.paymentType];
                  const dueSoon = isDueSoon(p.dueDate);
                  const isUnpaid = p.paymentStatus !== "paid";

                  return (
                    <TableRow
                      key={p.id}
                      sx={{
                        bgcolor:
                          p.paymentStatus === "overdue"
                            ? "#FFF7ED"
                            : idx % 2 === 0
                              ? "#fff"
                              : "#FAFAFA",
                        "&:hover": { bgcolor: colors.muted },
                        transition: "background 0.15s",
                      }}
                    >
                      {/* Date */}
                      <TableCell
                        sx={{
                          whiteSpace: "nowrap",
                          fontSize: "0.82rem",
                          color: colors.textSecondary,
                        }}
                      >
                        {fmtDate(p.purchaseDate)}
                      </TableCell>

                      {/* Product */}
                      <TableCell sx={{ minWidth: 150 }}>
                        <Box
                          sx={{ display: "flex", alignItems: "center", gap: 1 }}
                        >
                          <Box
                            sx={{
                              width: 6,
                              height: 6,
                              borderRadius: "50%",
                              bgcolor: colors.primary,
                              flexShrink: 0,
                            }}
                          />
                          <span
                            style={{
                              fontWeight: 600,
                              fontSize: "0.875rem",
                              color: colors.textPrimary,
                            }}
                          >
                            {p.productTitle || "—"}
                          </span>
                        </Box>
                      </TableCell>

                      {/* Supplier */}
                      <TableCell sx={{ minWidth: 130 }}>
                        <span
                          style={{
                            fontSize: "0.78rem",
                            background: colors.primaryBg,
                            color: colors.primary,
                            padding: "3px 10px",
                            borderRadius: 99,
                            fontWeight: 600,
                            whiteSpace: "nowrap",
                          }}
                        >
                          {p.supplierName || "—"}
                        </span>
                      </TableCell>

                      {/* Qty */}
                      <TableCell>
                        <span
                          style={{ fontWeight: 700, color: colors.textPrimary }}
                        >
                          {p.quantity}
                        </span>
                      </TableCell>

                      {/* Total Cost */}
                      <TableCell sx={{ whiteSpace: "nowrap" }}>
                        <span
                          style={{ fontWeight: 700, color: colors.primaryDark }}
                        >
                          {fmtEGP(p.totalCost)}
                        </span>
                      </TableCell>

                      {/* Payment Type */}
                      <TableCell>
                        <Chip
                          label={`${typeCfg.icon} ${typeCfg.label}`}
                          size="small"
                          sx={{
                            bgcolor: typeCfg.bg,
                            color: typeCfg.color,
                            border: `1px solid ${typeCfg.border}`,
                            fontWeight: 700,
                            fontSize: "0.68rem",
                          }}
                        />
                      </TableCell>

                      {/* Paid */}
                      <TableCell sx={{ whiteSpace: "nowrap" }}>
                        <span
                          style={{
                            fontSize: "0.82rem",
                            fontWeight: 700,
                            color:
                              p.paidAmount > 0 ? "#16A34A" : colors.textMuted,
                          }}
                        >
                          {fmtEGP(p.paidAmount)}
                        </span>
                      </TableCell>

                      {/* Remaining */}
                      <TableCell sx={{ whiteSpace: "nowrap" }}>
                        <span
                          style={{
                            fontSize: "0.82rem",
                            fontWeight: 700,
                            color:
                              p.remainingAmount > 0 ? "#DC2626" : "#16A34A",
                          }}
                        >
                          {p.remainingAmount > 0
                            ? fmtEGP(p.remainingAmount)
                            : "✓"}
                        </span>
                      </TableCell>

                      {/* Due Date */}
                      <TableCell sx={{ whiteSpace: "nowrap" }}>
                        {p.dueDate ? (
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 0.5,
                            }}
                          >
                            <span
                              style={{
                                fontSize: "0.78rem",
                                color:
                                  p.paymentStatus === "overdue"
                                    ? "#DC2626"
                                    : dueSoon
                                      ? "#D97706"
                                      : colors.textSecondary,
                                fontWeight:
                                  p.paymentStatus === "overdue" || dueSoon
                                    ? 700
                                    : 400,
                              }}
                            >
                              {fmtDate(p.dueDate)}
                            </span>
                            {dueSoon &&
                              p.paymentStatus !== "overdue" &&
                              p.paymentStatus !== "paid" && (
                                <Tooltip title="Due within 7 days">
                                  <AlertTriangle
                                    size={12}
                                    style={{ color: "#D97706" }}
                                  />
                                </Tooltip>
                              )}
                            {p.paymentStatus === "overdue" && (
                              <Tooltip title="Overdue!">
                                <AlertCircle
                                  size={12}
                                  style={{ color: "#DC2626" }}
                                />
                              </Tooltip>
                            )}
                          </Box>
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
                      </TableCell>

                      {/* Payment Status */}
                      <TableCell>
                        <PaymentStatusBadge status={p.paymentStatus} />
                      </TableCell>

                      {/* Purchase Status */}
                      <TableCell>
                        <StatusChip
                          status={p.status}
                          purchaseId={p.id}
                          onChange={changeStatus}
                        />
                      </TableCell>

                      {/* Actions */}
                      <TableCell align="center" sx={{ minWidth: 130 }}>
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 0.5,
                            flexWrap: "wrap",
                          }}
                        >
                          {/* Record Payment — only if not fully paid */}
                          {isUnpaid && (
                            <Tooltip title="Record Payment">
                              <IconButton
                                size="small"
                                onClick={() => openRecordPayment(p)}
                                sx={{
                                  color: "#16A34A",
                                  "&:hover": { bgcolor: "#DCFCE7" },
                                  borderRadius: 1.5,
                                }}
                              >
                                <DollarSign size={15} />
                              </IconButton>
                            </Tooltip>
                          )}

                          {/* Mark fully paid — opens confirmation dialog */}
                          {isUnpaid && (
                            <Tooltip title="Mark as Fully Paid">
                              <IconButton
                                size="small"
                                onClick={() => openMarkPaidConfirm(p)}
                                sx={{
                                  color: "#0D9488",
                                  "&:hover": { bgcolor: "#F0FDFA" },
                                  borderRadius: 1.5,
                                }}
                              >
                                <CheckCheck size={15} />
                              </IconButton>
                            </Tooltip>
                          )}

                          {/* Payment history */}
                          {p.paymentType !== "cash" && (
                            <Tooltip title="Payment History">
                              <IconButton
                                size="small"
                                onClick={() => openHistory(p)}
                                sx={{
                                  color: "#7C3AED",
                                  "&:hover": { bgcolor: "#F3E8FF" },
                                  borderRadius: 1.5,
                                }}
                              >
                                <History size={15} />
                              </IconButton>
                            </Tooltip>
                          )}

                          {/* Edit */}
                          <Tooltip title="Edit">
                            <IconButton
                              size="small"
                              onClick={() => openEdit(p)}
                              sx={{
                                color: "#2563EB",
                                "&:hover": { bgcolor: "#DBEAFE" },
                                borderRadius: 1.5,
                              }}
                            >
                              <Edit size={15} />
                            </IconButton>
                          </Tooltip>

                          {/* Delete */}
                          <Tooltip title="Delete">
                            <IconButton
                              size="small"
                              onClick={() => {
                                setToDelete(p);
                                setDeleteDialog(true);
                              }}
                              sx={{
                                color: colors.error,
                                "&:hover": { bgcolor: "#FEE2E2" },
                                borderRadius: 1.5,
                              }}
                            >
                              <Trash2 size={15} />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </Box>

        <TablePagination
          component="div"
          count={filtered.length}
          page={page}
          onPageChange={(_e, p) => setPage(p)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
          rowsPerPageOptions={[5, 10, 25, 50]}
        />
      </Paper>

      {/* ── Add / Edit Modal ── */}
      <PurchaseModal
        open={modalOpen}
        saving={saving}
        editingPurchase={editingPurchase}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
      />

      {/* ── Record Payment Dialog ── */}
      <RecordPaymentDialog
        open={paymentDialog}
        purchase={paymentTarget}
        saving={recordingSaving}
        onClose={() => {
          setPaymentDialog(false);
          setPaymentTarget(null);
        }}
        onRecord={handleRecordPayment}
      />

      {/* ── Payment History Dialog ── */}
      <PaymentHistoryDialog
        open={historyDialog}
        purchase={historyTarget}
        payments={historyPayments}
        loadingHistory={loadingHistory}
        onClose={() => {
          setHistoryDialog(false);
          setHistoryTarget(null);
          setHistoryPayments([]);
        }}
      />

      {/* ── Mark Fully Paid Confirmation ── */}
      <MarkFullyPaidDialog
        open={markPaidDialog}
        purchase={markPaidTarget}
        saving={markPaidSaving}
        onClose={() => {
          setMarkPaidDialog(false);
          setMarkPaidTarget(null);
        }}
        onConfirm={handleMarkFullyPaid}
      />

      {/* ── Delete Confirm ── */}
      <Dialog
        open={deleteDialog}
        onClose={() => !loadingDelete && setDeleteDialog(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1.5,
            color: colors.error,
          }}
        >
          <AlertTriangle size={22} /> Confirm Deletion
        </DialogTitle>
        <DialogContent>
          <p style={{ color: colors.textPrimary, marginBottom: 12 }}>
            Are you sure you want to delete the purchase order for{" "}
            <strong>{toDelete?.productTitle}</strong>?
            {toDelete && toDelete.remainingAmount > 0 && (
              <span
                style={{
                  color: "#DC2626",
                  display: "block",
                  marginTop: 8,
                  fontSize: "0.875rem",
                }}
              >
                ⚠️ This purchase has an outstanding balance of{" "}
                {fmtEGP(toDelete.remainingAmount)}. Deleting it will remove all
                payment records.
              </span>
            )}
          </p>
          <Box
            sx={{
              bgcolor: "#FEE2E2",
              border: `1px solid ${colors.error}`,
              borderRadius: 2,
              p: 2,
            }}
          >
            <p style={{ fontSize: "0.875rem", color: colors.error, margin: 0 }}>
              <strong>Warning:</strong> This action cannot be undone.
            </p>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3, gap: 1 }}>
          <Button
            onClick={() => setDeleteDialog(false)}
            disabled={loadingDelete}
            variant="outlined"
            sx={{
              textTransform: "none",
              borderColor: colors.border,
              color: colors.textPrimary,
              borderRadius: 2,
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleDelete}
            disabled={loadingDelete}
            variant="contained"
            startIcon={
              loadingDelete ? (
                <CircularProgress size={14} color="inherit" />
              ) : (
                <Trash2 size={16} />
              )
            }
            sx={{
              textTransform: "none",
              bgcolor: colors.error,
              "&:hover": { bgcolor: "#DC2626" },
              borderRadius: 2,
              minWidth: 110,
            }}
          >
            {loadingDelete ? "Deleting…" : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
