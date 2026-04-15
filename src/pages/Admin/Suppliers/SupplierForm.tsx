import { useEffect, useState } from "react";
import {
  TextField,
  Button,
  Paper,
  Box,
  Switch,
  FormControlLabel,
  CircularProgress,
} from "@mui/material";
import { ArrowLeft, Save, Truck, Info } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { useSuppliers } from "@/store/AdminContext/SupplierContext/SupplierContext";
import type { SupplierFormData } from "./suppliers-data";
import { DEFAULT_SUPPLIER_FORM } from "./suppliers-data";

const colors = {
  primary:       "#2A4863",
  primaryLight:  "#3D6A8A",
  primaryBg:     "#EFF6FF",
  primaryRing:   "#DBEAFE",
  primaryDark:   "#1E40AF",
  border:        "#E2E8F0",
  muted:         "#F8FAFC",
  textPrimary:   "#0F172A",
  textSecondary: "#64748B",
  textMuted:     "#94A3B8",
  error:         "#EF4444",
};

const inputSx = {
  "& .MuiOutlinedInput-root": {
    bgcolor: "#fff",
    "& fieldset":                { borderColor: colors.border },
    "&:hover fieldset":          { borderColor: colors.primary },
    "&.Mui-focused fieldset":    { borderColor: colors.primary, borderWidth: 2 },
  },
  "& .MuiInputLabel-root.Mui-focused": { color: colors.primary },
};

export default function SupplierForm() {
  const navigate  = useNavigate();
  const { id }    = useParams<{ id?: string }>();
  const isEdit    = Boolean(id);
  const { getSupplier, addSupplier, editSupplier } = useSuppliers();

  const [form,           setForm]           = useState<SupplierFormData>(DEFAULT_SUPPLIER_FORM);
  const [errors,         setErrors]         = useState<Record<string, string>>({});
  const [saving,         setSaving]         = useState(false);
  const [loadingSupplier,setLoadingSupplier]= useState(isEdit);

  // ── Load existing supplier for edit ───────────────────────────────────────
  useEffect(() => {
    if (!isEdit || !id) return;
    (async () => {
      setLoadingSupplier(true);
      const s = await getSupplier(id);
      if (s) {
        setForm({
          name:          s.name,
          contactPerson: s.contactPerson,
          email:         s.email,
          phone:         s.phone,
          address:       s.address,
          isActive:      s.isActive,
          notes:         s.notes,
        });
      }
      setLoadingSupplier(false);
    })();
  }, [id, isEdit, getSupplier]);

  const field = (key: keyof SupplierFormData, value: any) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: "" }));
  };

  // ── Validate ──────────────────────────────────────────────────────────────
  const validate = (): Record<string, string> => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "Supplier name is required";
    if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      e.email = "Enter a valid email address";
    }
    return e;
  };

  // ── Save ──────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }

    setSaving(true);
    try {
      if (isEdit && id) {
        await editSupplier(id, form);
      } else {
        await addSupplier(form);
      }
      navigate("/admin/suppliers");
    } catch {
      // toast shown in context
    } finally {
      setSaving(false);
    }
  };

  if (loadingSupplier) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "60vh" }}>
        <CircularProgress sx={{ color: colors.primary }} />
      </Box>
    );
  }

  return (
    <Box sx={{ width: "100%", mx: "auto", p: { xs: 2, md: 4 }, bgcolor: "#F8FAFC", minHeight: "100vh" }}>
      {/* Back */}
      <Button
        startIcon={<ArrowLeft size={16} />}
        onClick={() => navigate("/admin/suppliers")}
        variant="outlined"
        sx={{
          mb: 3,
          textTransform: "none",
          borderColor: colors.border,
          color: colors.textSecondary,
          borderRadius: 2,
          "&:hover": { borderColor: colors.primary, color: colors.primary, bgcolor: colors.primaryBg },
        }}
      >
        Back to Suppliers
      </Button>

      {/* Title */}
      <Box sx={{ mb: 4 }}>
        <h1 style={{ margin: 0, fontSize: "1.75rem", fontWeight: 700, color: colors.textPrimary }}>
          {isEdit ? "Edit Supplier" : "Add New Supplier"}
        </h1>
        <p style={{ margin: "4px 0 0", color: colors.textSecondary, fontSize: "0.875rem" }}>
          {isEdit ? "Update the supplier details below." : "Fill in the details to create a new supplier."}
        </p>
      </Box>

      {/* ── Main card ── */}
      <Paper elevation={0} sx={{ borderRadius: 3, border: `1px solid ${colors.border}`, overflow: "hidden", mb: 3 }}>
        {/* Header strip */}
        <Box sx={{ px: 3, py: 2.5, borderBottom: `1px solid ${colors.border}`, display: "flex", alignItems: "center", gap: 1.5 }}>
          <Truck size={20} style={{ color: colors.primary }} />
          <span style={{ fontWeight: 700, fontSize: "1rem", color: colors.textPrimary }}>
            Supplier Information
          </span>
        </Box>

        <Box sx={{ p: { xs: 2, md: 3 }, display: "flex", flexDirection: "column", gap: 3 }}>
          {/* Row 1 — Name */}
          <TextField
            label="Supplier Name *"
            size="small"
            fullWidth
            value={form.name}
            onChange={(e) => field("name", e.target.value)}
            error={!!errors.name}
            helperText={errors.name}
            sx={inputSx}
          />

          {/* Row 2 — Contact Person + Phone */}
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2.5 }}>
            <TextField
              label="Contact Person"
              size="small"
              fullWidth
              value={form.contactPerson}
              onChange={(e) => field("contactPerson", e.target.value)}
              sx={inputSx}
            />
            <TextField
              label="Phone"
              size="small"
              fullWidth
              value={form.phone}
              onChange={(e) => field("phone", e.target.value)}
              sx={inputSx}
            />
          </Box>

          {/* Row 3 — Email */}
          <TextField
            label="Email"
            size="small"
            fullWidth
            type="email"
            value={form.email}
            onChange={(e) => field("email", e.target.value)}
            error={!!errors.email}
            helperText={errors.email}
            sx={inputSx}
          />

          {/* Row 4 — Address */}
          <TextField
            label="Address"
            size="small"
            fullWidth
            value={form.address}
            onChange={(e) => field("address", e.target.value)}
            sx={inputSx}
          />

          {/* Row 5 — Active toggle */}
          <Box>
            <FormControlLabel
              control={
                <Switch
                  checked={form.isActive}
                  onChange={(e) => field("isActive", e.target.checked)}
                  sx={{
                    "& .MuiSwitch-switchBase.Mui-checked":              { color: colors.primary },
                    "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": { bgcolor: colors.primary },
                  }}
                />
              }
              label={
                <span style={{ fontSize: "0.875rem", fontWeight: 600, color: colors.textPrimary }}>
                  Active
                </span>
              }
            />
          </Box>

          {/* Row 6 — Notes */}
          <TextField
            label="Notes"
            size="small"
            fullWidth
            multiline
            rows={3}
            value={form.notes}
            onChange={(e) => field("notes", e.target.value)}
            helperText="Internal notes — not visible to users"
            sx={inputSx}
          />

          {/* Info banner */}
          <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1.5, bgcolor: colors.primaryBg, border: `1px solid ${colors.primaryRing}`, borderRadius: 2, p: 2 }}>
            <Info size={16} style={{ color: colors.primary, flexShrink: 0, marginTop: 2 }} />
            <p style={{ fontSize: "0.85rem", color: colors.primaryDark, margin: 0 }}>
              <strong>Note:</strong> Only the supplier name is required. You can assign this supplier to products from the product form.
            </p>
          </Box>
        </Box>
      </Paper>

      {/* Footer actions */}
      <Box sx={{ mt: 3, display: "flex", gap: 2, justifyContent: { xs: "stretch", sm: "flex-end" }, flexDirection: { xs: "column-reverse", sm: "row" } }}>
        <Button
          onClick={() => navigate("/admin/suppliers")}
          variant="outlined"
          sx={{
            textTransform: "none",
            borderColor: colors.border,
            color: colors.textSecondary,
            borderRadius: 2,
            px: 4,
            width: { xs: "100%", sm: "auto" },
            "&:hover": { borderColor: colors.primary, color: colors.primary },
          }}
        >
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          variant="contained"
          disabled={saving}
          startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <Save size={16} />}
          sx={{
            textTransform: "none",
            bgcolor: colors.primary,
            "&:hover": { bgcolor: "#111", color: "#fff" },
            borderRadius: 2,
            px: 4,
            fontWeight: 600,
            width: { xs: "100%", sm: "auto" },
            boxShadow: "0 4px 14px rgba(37,99,235,0.30)",
          }}
        >
          {saving ? "Saving…" : isEdit ? "Save Changes" : "Create Supplier"}
        </Button>
      </Box>
    </Box>
  );
}