/**
 * src/pages/Admin/Purchases/components/PurchaseModal.tsx
 *
 * Add / Edit purchase order modal.
 * Uses the same visual language (colors, inputSx, etc.) as ProductForm / SupplierForm.
 * Supplier and Product dropdowns read from their respective contexts — zero extra fetches.
 */

import { useState, useEffect } from "react";
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
} from "@mui/material";
import { ShoppingCart } from "lucide-react";
import { colors } from "@/pages/Admin/Products/products-data";
import { useSuppliers } from "@/store/AdminContext/SupplierContext/SupplierContext";
import { useProducts } from "@/store/AdminContext/ProductContext/ProductsCotnext";
import { resolveTitle } from "@/pages/Admin/Products/products-data";
import type {
  Purchase,
  PurchaseFormData,
  PurchaseStatus,
} from "../purchases-data";
import { DEFAULT_PURCHASE_FORM, STATUS_CONFIG } from "../purchases-data";

const inputSx = {
  "& .MuiOutlinedInput-root": {
    bgcolor: "#fff",
    "& fieldset": { borderColor: colors.border },
    "&:hover fieldset": { borderColor: colors.primary },
    "&.Mui-focused fieldset": { borderColor: colors.primary, borderWidth: 2 },
  },
  "& .MuiInputLabel-root.Mui-focused": { color: colors.primary },
};

interface Props {
  open: boolean;
  saving: boolean;
  editingPurchase?: Purchase | null;
  onClose: () => void;
  onSave: (formData: PurchaseFormData) => Promise<void>;
}

function buildFormFromPurchase(p: Purchase): PurchaseFormData {
  return {
    supplierId: p.supplierId,
    productId: p.productId,
    quantity: String(p.quantity),
    unitCost: String(p.unitCost),
    status: p.status,
    notes: p.notes,
    purchaseDate:
      p.purchaseDate instanceof Date
        ? p.purchaseDate.toISOString().split("T")[0]
        : new Date().toISOString().split("T")[0],
  };
}

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

  const set = <K extends keyof PurchaseFormData>(
    k: K,
    v: PurchaseFormData[K],
  ) => setForm((prev) => ({ ...prev, [k]: v }));

  // Auto-fill unit cost from product's actualPrice when product changes
  const handleProductChange = (productId: string) => {
    set("productId", productId);
    if (!isEdit) {
      const prod = products.find((p) => p.id === productId);
      if (prod && prod.actualPrice > 0) {
        set("unitCost", String(prod.actualPrice));
      }
    }
  };

  const validate = (): string | null => {
    if (!form.supplierId) return "Please select a supplier.";
    if (!form.productId) return "Please select a product.";
    const qty = Number(form.quantity);
    const unit = Number(form.unitCost);
    if (!form.quantity || isNaN(qty) || qty <= 0)
      return "Quantity must be greater than 0.";
    if (!form.unitCost || isNaN(unit) || unit <= 0)
      return "Unit cost must be greater than 0.";
    if (!form.purchaseDate) return "Please select a purchase date.";
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

  const qty = Number(form.quantity) || 0;
  const unitCost = Number(form.unitCost) || 0;
  const total = qty * unitCost;

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

        {/* Supplier */}
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

        {/* Product */}
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

        {/* Quantity + Unit Cost */}
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

        {/* Total preview */}
        {total > 0 && (
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
              {total.toLocaleString("en-EG")} EGP
            </span>
          </Box>
        )}

        {/* Status */}
        <TextField
          label="Status"
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

        {/* Purchase Date */}
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

        {/* Notes */}
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
