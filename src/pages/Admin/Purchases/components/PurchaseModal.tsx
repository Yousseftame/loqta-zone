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
 *   credit:    dueDate required and must be in the future.
 *   partial:   paidAmount > 0, paidAmount < totalCost, dueDate required.
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
  ToggleButtonGroup,
  ToggleButton,
  Divider,
  Tooltip,
} from "@mui/material";
import { ShoppingCart, Info } from "lucide-react";
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

// ─── Form initialiser ─────────────────────────────────────────────────────────

function buildFormFromPurchase(p: Purchase): PurchaseFormData {
  const purchaseDateStr =
    p.purchaseDate instanceof Date
      ? p.purchaseDate.toISOString().split("T")[0]
      : new Date().toISOString().split("T")[0];

  const dueDateStr =
    p.dueDate instanceof Date ? p.dueDate.toISOString().split("T")[0] : "";

  // For partial purchases, show the paidAmount as a string
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

  const [form, setForm] = useState<PurchaseFormData>(DEFAULT_PURCHASE_FORM);
  const [error, setError] = useState<string | null>(null);

  const isEdit = !!editingPurchase;
  const activeSuppliers = suppliers.filter((s) => s.isActive);
  const activeProducts = products.filter((p) => p.isActive);

  // Reset form whenever the modal opens/closes or the editing target changes
  useEffect(() => {
    if (open) {
      setError(null);
      setForm(
        editingPurchase
          ? buildFormFromPurchase(editingPurchase)
          : DEFAULT_PURCHASE_FORM,
      );
    }
  }, [open, editingPurchase]);

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

  // Auto-fill unit cost from product's actualPrice when product changes (new only)
  const handleProductChange = (productId: string) => {
    set("productId", productId);
    if (!isEdit) {
      const prod = products.find((p) => p.id === productId);
      if (prod && prod.actualPrice > 0)
        set("unitCost", String(prod.actualPrice));
    }
  };

  // When payment type changes, reset payment-specific fields
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
      return "Unit cost must be greater than 0.";
    if (!form.purchaseDate) return "Please select a purchase date.";

    if (form.paymentType === "partial") {
      const paid = parseFloat(form.paidAmount);
      if (!form.paidAmount || isNaN(paid) || paid <= 0)
        return "Enter the amount paid upfront (down payment).";
      if (paid >= totalCost)
        return "For a partial payment the paid amount must be less than the total cost. Use 'Cash' if fully paid.";
      if (!form.dueDate)
        return "Please set a due date for the remaining balance.";
    }

    if (form.paymentType === "credit") {
      if (!form.dueDate) return "Please set a due date for the credit payment.";
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
    } catch (e: any) {
      setError(e?.message ?? "Failed to save purchase.");
    }
  };

  // ── Payment type card ───────────────────────────────────────────────────────

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
      {/* Header */}
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
            label="Unit Cost (EGP) *"
            type="number"
            size="small"
            fullWidth
            value={form.unitCost}
            onChange={(e) => set("unitCost", e.target.value)}
            inputProps={{ min: 0, step: "0.01" }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <span style={{ fontSize: "0.8rem", color: colors.textMuted }}>
                    EGP
                  </span>
                </InputAdornment>
              ),
            }}
            sx={inputSx}
          />
        </Box>

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

        {/* ── Partial: down payment amount ── */}
        {form.paymentType === "partial" && (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
            <TextField
              label="Down Payment Amount (EGP) *"
              type="number"
              size="small"
              fullWidth
              value={form.paidAmount}
              onChange={(e) => set("paidAmount", e.target.value)}
              inputProps={{
                min: 0,
                step: "0.01",
                max: totalCost > 0 ? totalCost - 0.01 : undefined,
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
              }}
              helperText={
                totalCost > 0
                  ? `Between 1 and ${(totalCost - 0.01).toLocaleString("en-EG")} EGP`
                  : "Enter quantity and unit cost first"
              }
              FormHelperTextProps={{
                sx: { fontSize: "0.7rem", color: colors.textMuted },
              }}
              sx={inputSx}
            />
            {/* Payment breakdown */}
            {totalCost > 0 &&
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

        {/* ── Credit / Partial: due date ── */}
        {(form.paymentType === "credit" || form.paymentType === "partial") && (
          <TextField
            label={`Payment Due Date *`}
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
