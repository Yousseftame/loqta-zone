/**
 * src/pages/Admin/Purchases/components/PurchaseModal.tsx
 *
 * Add / Edit purchase order modal.
 * Supports three payment types: cash, credit, partial.
 *
 * ─── UI behaviour per payment type ───────────────────────────────────────────
 *   cash:    paidAmount = totalCost (auto-filled, locked). No dueDate shown.
 *   credit:  paidAmount = 0 (auto-filled, locked). dueDate is required.
 *   partial: paidAmount is editable (must be > 0 and < totalCost). dueDate required.
 *
 * ─── Validation rules ─────────────────────────────────────────────────────────
 *   All types: supplier, product, quantity, unitCost, purchaseDate required.
 *   credit:    dueDate required.
 *   partial:   paidAmount > 0, paidAmount < totalCost, dueDate required.
 *
 * ─── Edit behaviour ───────────────────────────────────────────────────────────
 *   When editing a credit purchase the paidAmount field is hidden (stays 0).
 *   When editing a partial purchase the original paidAmount is shown but is
 *   read-only — use "Record Payment" to add further payments instead.
 */

import { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
  Box,
  CircularProgress,
  Alert,
  InputAdornment,
  Divider,
  Tooltip,
} from "@mui/material";
import { ShoppingCart, Info, Lock } from "lucide-react";
import { colors } from "@/pages/Admin/Products/products-data";
import { useSuppliers } from "@/store/AdminContext/SupplierContext/SupplierContext";
import { useProducts } from "@/store/AdminContext/ProductContext/ProductsCotnext";
import { resolveTitle } from "@/pages/Admin/Products/products-data";
import type {
  Purchase,
  PurchaseFormData,
  PurchaseStatus,
  PaymentType,
} from "../purchases-data";
import {
  DEFAULT_PURCHASE_FORM,
  STATUS_CONFIG,
  PAYMENT_TYPE_CONFIG,
  derivePaidAmount,
} from "../purchases-data";
import type { Transaction } from "@/pages/Admin/Finance/finance-data";
import { fetchTransactionsForBalance } from "@/service/finance/financeService";
import PaymentAccountSelect, {
  pickDefaultAccountId,
} from "@/pages/Admin/Finance/components/PaymentAccountSelect";
import {
  usePaymentAccounts,
  getActiveAccounts,
} from "@/hooks/usePaymentAccounts";

// ─── Shared input style ───────────────────────────────────────────────────────

const inputSx = {
  "& .MuiOutlinedInput-root": {
    bgcolor: "#fff",
    "& fieldset": { borderColor: colors.border },
    "&:hover fieldset": { borderColor: colors.primary },
    "&.Mui-focused fieldset": { borderColor: colors.primary, borderWidth: 2 },
  },
  "& .MuiInputLabel-root.Mui-focused": { color: colors.primary },
};

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  open: boolean;
  saving: boolean;
  editingPurchase: Purchase | null | undefined;
  onClose: () => void;
  onSave: (formData: PurchaseFormData) => Promise<void>;
}

// ─── Build form from existing purchase (edit mode) ────────────────────────────

function buildFormFromPurchase(p: Purchase): PurchaseFormData {
  const purchaseDateStr =
    p.purchaseDate instanceof Date
      ? p.purchaseDate.toISOString().split("T")[0]
      : new Date().toISOString().split("T")[0];

  const dueDateStr =
    p.dueDate instanceof Date ? p.dueDate.toISOString().split("T")[0] : "";

  // For partial, show the current paidAmount so the admin can see it.
  // It becomes read-only in the UI — further payments go through "Record Payment".
  // For cash/credit we always derive (totalCost or 0), so keep empty string.
  const paidAmountStr = p.paymentType === "partial" ? String(p.paidAmount) : "";

  return {
    supplierId: p.supplierId,
    productId: p.productId,
    quantity: String(p.quantity),
    unitCost: String(p.unitCost),
    status: p.status,
    notes: p.notes,
    purchaseDate: purchaseDateStr,
    paymentType: p.paymentType,
    paidAmount: paidAmountStr,
    dueDate: dueDateStr,
    paymentMethod: "cash",
    paymentAccountId: "",
  };
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function PurchaseModal({
  open,
  saving,
  editingPurchase,
  onClose,
  onSave,
}: Props) {
  const { suppliers } = useSuppliers();
  const { products } = useProducts();
  const { accounts } = usePaymentAccounts();
  const activeAccounts = useMemo(() => getActiveAccounts(accounts), [accounts]);

  const [form, setForm] = useState<PurchaseFormData>(DEFAULT_PURCHASE_FORM);
  const [error, setError] = useState<string | null>(null);
  const [ledgerTx, setLedgerTx] = useState<Transaction[]>([]);

  const isEdit = !!editingPurchase;
  const activeSuppliers = suppliers.filter((s) => s.isActive);
  const activeProducts = products.filter((p) => p.isActive);

  useEffect(() => {
    if (!open) return;
    fetchTransactionsForBalance().then(setLedgerTx).catch(() => setLedgerTx([]));
  }, [open]);

  // Reset whenever the modal opens or the target purchase changes
  useEffect(() => {
    if (open) {
      setError(null);
      if (editingPurchase) {
        setForm(buildFormFromPurchase(editingPurchase));
      } else {
        const method = DEFAULT_PURCHASE_FORM.paymentMethod;
        setForm({
          ...DEFAULT_PURCHASE_FORM,
          paymentAccountId: pickDefaultAccountId(activeAccounts, method),
        });
      }
    }
  }, [open, editingPurchase, activeAccounts]);

  // ── Derived totals ──────────────────────────────────────────────────────────

  const qty = parseFloat(form.quantity) || 0;
  const unitCost = parseFloat(form.unitCost) || 0;
  const totalCost = qty * unitCost;

  const effectivePaidAmount = useMemo(
    () => derivePaidAmount(form.paymentType, form.paidAmount, totalCost),
    [form.paymentType, form.paidAmount, totalCost],
  );

  const remainingAmount = Math.max(0, totalCost - effectivePaidAmount);

  // ── Field setter ────────────────────────────────────────────────────────────

  const set = <K extends keyof PurchaseFormData>(
    k: K,
    v: PurchaseFormData[K],
  ) => setForm((prev) => ({ ...prev, [k]: v }));

  // Auto-fill unit cost from product's actualPrice on new orders only
  const handleProductChange = (productId: string) => {
    set("productId", productId);
    if (!isEdit) {
      const prod = products.find((p) => p.id === productId);
      if (prod && prod.actualPrice > 0)
        set("unitCost", String(prod.actualPrice));
    }
  };

  // Switching payment type resets payment-specific fields
  const handlePaymentTypeChange = (type: PaymentType) => {
    setForm((prev) => ({
      ...prev,
      paymentType: type,
      paidAmount: "",
      dueDate: type === "cash" ? "" : prev.dueDate,
    }));
  };

  // ── Validation ──────────────────────────────────────────────────────────────

  const validate = (): string | null => {
    if (!form.supplierId) return "Please select a supplier.";
    if (!form.productId) return "Please select a product.";
    if (!form.quantity || isNaN(qty) || qty <= 0)
      return "Quantity must be greater than 0.";
    if (!form.unitCost || isNaN(unitCost) || unitCost <= 0)
      return "Unit cost could not be determined — please select a product with a valid cost price.";
    if (!form.purchaseDate) return "Please select a purchase date.";

    if (form.paymentType === "partial") {
      const paid = parseFloat(form.paidAmount);
      if (!form.paidAmount || isNaN(paid) || paid <= 0)
        return "Enter the amount paid upfront (down payment).";
      if (paid >= totalCost)
        return "For partial payment the paid amount must be less than the total. Use 'Cash' if fully paid.";
      if (!form.dueDate)
        return "Please set a due date for the remaining balance.";
    }

    if (form.paymentType === "credit") {
      if (!form.dueDate) return "Please set a due date for the credit payment.";
    }

    if (
      !isEdit &&
      form.paymentType !== "credit" &&
      effectivePaidAmount > 0 &&
      activeAccounts.length > 0 &&
      !form.paymentAccountId
    ) {
      return "Please select the payment account for this purchase.";
    }

    return null;
  };

  const handleSave = async () => {
    setError(null);
    const err = validate();
    if (err) {
      setError(err);
      return;
    }
    try {
      await onSave(form);
    } catch (e: unknown) {
      setError((e as Error)?.message ?? "Failed to save purchase.");
    }
  };

  // ── Payment type options ────────────────────────────────────────────────────

  const paymentTypes: PaymentType[] = ["cash", "credit", "partial"];

  return (
    <Dialog
      open={open}
      onClose={() => {
        if (!saving) onClose();
      }}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: { borderRadius: 3, border: `1px solid ${colors.border}` },
      }}
    >
      {/* ── Header ── */}
      <DialogTitle
        sx={{
          fontWeight: 700,
          fontSize: "1rem",
          color: colors.primaryDark,
          borderBottom: `1px solid ${colors.border}`,
          pb: 2,
          display: "flex",
          alignItems: "center",
          gap: 1,
        }}
      >
        <ShoppingCart size={18} style={{ color: colors.primary }} />
        {isEdit ? "Edit Purchase Order" : "New Purchase Order"}
      </DialogTitle>

      <DialogContent
        sx={{
          pt: "20px !important",
          display: "flex",
          flexDirection: "column",
          gap: 2.5,
        }}
      >
        {error && (
          <Alert severity="error" sx={{ borderRadius: 2, fontSize: "0.8rem" }}>
            {error}
          </Alert>
        )}

        {/* ── Supplier ── */}
        <TextField
          label="Supplier *"
          select
          size="small"
          fullWidth
          value={form.supplierId}
          onChange={(e) => set("supplierId", e.target.value)}
          sx={inputSx}
        >
          {activeSuppliers.length === 0 && (
            <MenuItem disabled value="">
              <em>No active suppliers</em>
            </MenuItem>
          )}
          {activeSuppliers.map((s) => (
            <MenuItem key={s.id} value={s.id}>
              <Box sx={{ display: "flex", flexDirection: "column" }}>
                <span style={{ fontWeight: 600, fontSize: "0.875rem" }}>
                  {s.name}
                </span>
                {s.contactPerson && (
                  <span
                    style={{ fontSize: "0.72rem", color: colors.textMuted }}
                  >
                    {s.contactPerson}
                  </span>
                )}
              </Box>
            </MenuItem>
          ))}
        </TextField>

        {/* ── Product ── */}
        <TextField
          label="Product *"
          select
          size="small"
          fullWidth
          value={form.productId}
          onChange={(e) => handleProductChange(e.target.value)}
          sx={inputSx}
          helperText="Unit cost will auto-fill from the product's cost price."
          FormHelperTextProps={{
            sx: { fontSize: "0.7rem", color: colors.textMuted },
          }}
        >
          {activeProducts.length === 0 && (
            <MenuItem disabled value="">
              <em>No active products</em>
            </MenuItem>
          )}
          {activeProducts.map((p) => (
            <MenuItem key={p.id} value={p.id}>
              <Box sx={{ display: "flex", flexDirection: "column" }}>
                <span style={{ fontWeight: 600, fontSize: "0.875rem" }}>
                  {resolveTitle(p.title, "en")}
                </span>
                {p.actualPrice > 0 && (
                  <span
                    style={{ fontSize: "0.72rem", color: colors.textMuted }}
                  >
                    Cost: {p.actualPrice.toLocaleString("en-EG")} EGP
                  </span>
                )}
              </Box>
            </MenuItem>
          ))}
        </TextField>

        {/* ── Qty + Unit Cost ── */}
        <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
          <TextField
            label="Quantity *"
            type="number"
            size="small"
            fullWidth
            value={form.quantity}
            onChange={(e) => set("quantity", e.target.value)}
            inputProps={{ min: 1, step: 1 }}
            sx={inputSx}
          />
          <TextField
            label="Unit Cost (EGP)"
            type="number"
            size="small"
            fullWidth
            value={form.unitCost}
            disabled
            inputProps={{ readOnly: true }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <span style={{ fontSize: "0.8rem", color: colors.textMuted }}>
                    EGP
                  </span>
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  <Tooltip title="Auto-filled from the selected product's cost price">
                    <Lock size={14} style={{ color: colors.textMuted }} />
                  </Tooltip>
                </InputAdornment>
              ),
            }}
            helperText={
              form.productId
                ? "Auto-filled from product — read only"
                : "Select a product first"
            }
            FormHelperTextProps={{
              sx: { fontSize: "0.7rem", color: colors.textMuted },
            }}
            sx={{
              "& .MuiOutlinedInput-root": {
                bgcolor: "#F8FAFC",
                "& fieldset": { borderColor: colors.border },
              },
              "& .MuiInputLabel-root": { color: colors.textMuted },
            }}
          />
        </Box>

        {/* ── Sensitive-data warning ── */}
        {isEdit ? (
          <Box
            sx={{
              display: "flex",
              gap: 1.5,
              p: 1.5,
              borderRadius: 2,
              bgcolor: "#FFF1F2",
              border: "1px solid #FECDD3",
            }}
          >
            <span style={{ fontSize: "1rem", flexShrink: 0 }}>🚨</span>
            <Box>
              <p
                style={{
                  margin: 0,
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  color: "#9F1239",
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                }}
              >
                Editing these fields is very risky
              </p>
              <p
                style={{
                  margin: "4px 0 0",
                  fontSize: "0.72rem",
                  color: "#BE123C",
                  lineHeight: 1.5,
                }}
              >
                Changing the <strong>Quantity</strong> or{" "}
                <strong>Unit Cost</strong> will recalculate the Total Cost and
                may break the payment balance — especially if payments have
                already been recorded against this purchase. Only edit these if
                you are correcting a genuine data-entry mistake.
              </p>
            </Box>
          </Box>
        ) : (
          <Box
            sx={{
              display: "flex",
              gap: 1.5,
              p: 1.5,
              borderRadius: 2,
              bgcolor: "#FFFBEB",
              border: "1px solid #FDE68A",
            }}
          >
            <span style={{ fontSize: "1rem", flexShrink: 0 }}>⚠️</span>
            <p
              style={{
                margin: 0,
                fontSize: "0.72rem",
                color: "#92400E",
                lineHeight: 1.5,
              }}
            >
              <strong>Double-check Quantity and Unit Cost</strong> before
              saving. These values determine the Total Cost and drive all payment
              accounting — they should match the supplier invoice exactly.
            </p>
          </Box>
        )}

        {/* ── Total cost preview ── */}
        {totalCost > 0 && (
          <Box
            sx={{
              p: 1.5,
              borderRadius: 2,
              bgcolor: colors.primaryBg,
              border: `1px solid ${colors.primaryRing}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <span
              style={{
                fontSize: "0.78rem",
                color: colors.primaryDark,
                fontWeight: 600,
              }}
            >
              Total Cost
            </span>
            <span
              style={{
                fontSize: "1rem",
                fontWeight: 800,
                color: colors.primary,
              }}
            >
              {totalCost.toLocaleString("en-EG")} EGP
            </span>
          </Box>
        )}

        <Divider sx={{ my: 0.5 }} />

        {/* ── Payment type selector ── */}
        <Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}>
            <span
              style={{
                fontSize: "0.78rem",
                fontWeight: 700,
                color: colors.primaryDark,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
              }}
            >
              Payment Type
            </span>
            <Tooltip
              title="How this purchase is being paid for"
              placement="top"
            >
              <Info
                size={13}
                style={{ color: colors.textMuted, cursor: "help" }}
              />
            </Tooltip>
          </Box>

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 1,
            }}
          >
            {paymentTypes.map((type) => {
              const cfg = PAYMENT_TYPE_CONFIG[type];
              const selected = form.paymentType === type;
              return (
                <Box
                  key={type}
                  onClick={() => handlePaymentTypeChange(type)}
                  sx={{
                    p: 1.5,
                    borderRadius: 2,
                    border: `2px solid ${selected ? colors.primary : colors.border}`,
                    bgcolor: selected ? colors.primaryBg : "#fff",
                    cursor: "pointer",
                    transition: "all 0.15s",
                    "&:hover": {
                      borderColor: colors.primary,
                      bgcolor: colors.primaryBg,
                    },
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 0.5,
                    textAlign: "center",
                  }}
                >
                  <span style={{ fontSize: "1.25rem" }}>{cfg.icon}</span>
                  <span
                    style={{
                      fontSize: "0.72rem",
                      fontWeight: 700,
                      color: selected ? colors.primary : colors.textPrimary,
                      letterSpacing: "0.03em",
                    }}
                  >
                    {cfg.label}
                  </span>
                  <span
                    style={{
                      fontSize: "0.62rem",
                      color: colors.textMuted,
                      lineHeight: 1.3,
                    }}
                  >
                    {cfg.description}
                  </span>
                </Box>
              );
            })}
          </Box>
        </Box>

        {/* ── Partial: down payment amount ─────────────────────────────────────
            In edit mode this field is read-only — use "Record Payment" to add
            further payments against the outstanding balance.              ── */}
        {form.paymentType === "partial" && (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
            <TextField
              label={
                isEdit
                  ? "Original Down Payment (EGP)"
                  : "Down Payment Amount (EGP) *"
              }
              type="number"
              size="small"
              fullWidth
              value={form.paidAmount}
              onChange={(e) => !isEdit && set("paidAmount", e.target.value)}
              disabled={isEdit}
              inputProps={{
                min: 0,
                step: "0.01",
                max: totalCost > 0 ? totalCost - 0.01 : undefined,
                readOnly: isEdit,
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <span
                      style={{ fontSize: "0.8rem", color: colors.textMuted }}
                    >
                      EGP
                    </span>
                  </InputAdornment>
                ),
                endAdornment: isEdit ? (
                  <InputAdornment position="end">
                    <Tooltip title="To add more payments use the Record Payment action on the table row">
                      <Lock size={14} style={{ color: colors.textMuted }} />
                    </Tooltip>
                  </InputAdornment>
                ) : undefined,
              }}
              helperText={
                isEdit
                  ? "Original down payment — use Record Payment to add further payments"
                  : totalCost > 0
                    ? `Between 1 and ${(totalCost - 0.01).toLocaleString("en-EG")} EGP`
                    : "Enter quantity and unit cost first"
              }
              FormHelperTextProps={{
                sx: { fontSize: "0.7rem", color: colors.textMuted },
              }}
              sx={inputSx}
            />

            {/* Payment breakdown preview (new orders only) */}
            {!isEdit &&
              totalCost > 0 &&
              effectivePaidAmount > 0 &&
              effectivePaidAmount < totalCost && (
                <Box
                  sx={{
                    p: 1.5,
                    borderRadius: 2,
                    bgcolor: "#DBEAFE",
                    border: "1px solid #93C5FD",
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 1,
                  }}
                >
                  <Box>
                    <p
                      style={{
                        fontSize: "0.62rem",
                        fontWeight: 600,
                        color: "#1E40AF",
                        margin: 0,
                        textTransform: "uppercase",
                      }}
                    >
                      Paid Now
                    </p>
                    <p
                      style={{
                        fontSize: "0.9rem",
                        fontWeight: 800,
                        color: "#1E40AF",
                        margin: "2px 0 0",
                      }}
                    >
                      {effectivePaidAmount.toLocaleString("en-EG")} EGP
                    </p>
                  </Box>
                  <Box>
                    <p
                      style={{
                        fontSize: "0.62rem",
                        fontWeight: 600,
                        color: "#7F1D1D",
                        margin: 0,
                        textTransform: "uppercase",
                      }}
                    >
                      Remaining
                    </p>
                    <p
                      style={{
                        fontSize: "0.9rem",
                        fontWeight: 800,
                        color: "#7F1D1D",
                        margin: "2px 0 0",
                      }}
                    >
                      {remainingAmount.toLocaleString("en-EG")} EGP
                    </p>
                  </Box>
                </Box>
              )}
          </Box>
        )}

        {/* ── Payment method (wallet) — only for paid/partial new orders ────
            This tells the finance log which wallet the money came from.   ── */}
        {!isEdit && form.paymentType !== "credit" && (
          <PaymentAccountSelect
            value={form.paymentAccountId}
            transactions={ledgerTx}
            amountToValidate={effectivePaidAmount}
            onChange={(accountId, method) =>
              setForm((p) => ({
                ...p,
                paymentAccountId: accountId,
                paymentMethod: method,
              }))
            }
            helperText="Wallet debited in Finance when this order is saved"
          />
        )}

        {/* ── Credit / Partial: due date ── */}
        {(form.paymentType === "credit" || form.paymentType === "partial") && (
          <TextField
            label="Payment Due Date *"
            type="date"
            size="small"
            fullWidth
            value={form.dueDate}
            onChange={(e) => set("dueDate", e.target.value)}
            InputLabelProps={{ shrink: true }}
            helperText={
              form.paymentType === "credit"
                ? "Full payment must be made by this date"
                : "Remaining balance must be paid by this date"
            }
            FormHelperTextProps={{
              sx: { fontSize: "0.7rem", color: colors.textMuted },
            }}
            sx={inputSx}
          />
        )}

        <Divider sx={{ my: 0.5 }} />

        {/* ── Purchase status ── */}
        <TextField
          label="Purchase Status"
          select
          size="small"
          fullWidth
          value={form.status}
          onChange={(e) => set("status", e.target.value as PurchaseStatus)}
          sx={inputSx}
        >
          {(
            Object.entries(STATUS_CONFIG) as [
              PurchaseStatus,
              (typeof STATUS_CONFIG)[PurchaseStatus],
            ][]
          ).map(([key, cfg]) => (
            <MenuItem key={key} value={key}>
              <span>
                {cfg.emoji} {cfg.label}
              </span>
            </MenuItem>
          ))}
        </TextField>

        {/* ── Purchase date ── */}
        <TextField
          label="Purchase Date *"
          type="date"
          size="small"
          fullWidth
          value={form.purchaseDate}
          onChange={(e) => set("purchaseDate", e.target.value)}
          InputLabelProps={{ shrink: true }}
          sx={inputSx}
        />

        {/* ── Notes ── */}
        <TextField
          label="Notes (optional)"
          size="small"
          fullWidth
          multiline
          rows={2}
          value={form.notes}
          onChange={(e) => set("notes", e.target.value)}
          sx={inputSx}
        />
      </DialogContent>

      <DialogActions
        sx={{
          px: 3,
          pb: 2.5,
          borderTop: `1px solid ${colors.border}`,
          gap: 1.5,
        }}
      >
        <Button
          onClick={onClose}
          disabled={saving}
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
          onClick={handleSave}
          disabled={saving}
          sx={{
            borderRadius: 2,
            textTransform: "none",
            fontWeight: 700,
            px: 3,
            bgcolor: colors.primary,
            "&:hover": { bgcolor: colors.primaryDark },
            minWidth: 130,
          }}
        >
          {saving ? (
            <CircularProgress size={18} sx={{ color: "#fff" }} />
          ) : isEdit ? (
            "Update Order"
          ) : (
            "Create Order"
          )}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
