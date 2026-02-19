import { useEffect, useState } from "react";
import {
  TextField,
  Button,
  Paper,
  Box,
  Switch,
  FormControlLabel,
  CircularProgress,
  Checkbox,
  ListItemText,
  OutlinedInput,
  InputLabel,
  FormControl,
  FormHelperText,
  Select,
  MenuItem,
} from "@mui/material";
import { ArrowLeft, Save, Ticket, Info, RefreshCw } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { colors } from "../Products/products-data";
import {
  DEFAULT_VOUCHER_FORM,
  toDatetimeLocal,
  type VoucherFormData,
  type VoucherType,
} from "./voucher-data";
import { useVouchers } from "@/store/AdminContext/VoucherContext/VoucherContext";
import { useProducts } from "@/store/AdminContext/ProductContext/ProductsCotnext";

const inputSx = {
  "& .MuiOutlinedInput-root": {
    bgcolor: "#fff",
    "& fieldset": { borderColor: colors.border },
    "&:hover fieldset": { borderColor: colors.primary },
    "&.Mui-focused fieldset": { borderColor: colors.primary, borderWidth: 2 },
  },
  "& .MuiInputLabel-root.Mui-focused": { color: colors.primary },
};

const selectSx = {
  bgcolor: "#fff",
  "& .MuiOutlinedInput-notchedOutline": { borderColor: colors.border },
  "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: colors.primary },
  "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
    borderColor: colors.primary,
    borderWidth: 2,
  },
};

function generateCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  return Array.from({ length: 8 }, () =>
    chars.charAt(Math.floor(Math.random() * chars.length)),
  ).join("");
}

export default function VoucherForm() {
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();
  const isEdit = Boolean(id);
  const { getVoucher, addVoucher, editVoucher } = useVouchers();
  const { products } = useProducts();

  const [form, setForm] = useState<VoucherFormData>(DEFAULT_VOUCHER_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [loadingVoucher, setLoadingVoucher] = useState(isEdit);

  // Pre-fill on edit
  useEffect(() => {
    if (!isEdit || !id) return;
    (async () => {
      setLoadingVoucher(true);
      const v = await getVoucher(id);
      if (v) {
        setForm({
          code: v.code,
          type: v.type,
          discountAmount:
            v.discountAmount != null ? String(v.discountAmount) : "",
          applicableProducts: v.applicableProducts,
          maxUses: String(v.maxUses),
          isActive: v.isActive,
          expiryDate: toDatetimeLocal(v.expiryDate),
        });
      }
      setLoadingVoucher(false);
    })();
  }, [id, isEdit, getVoucher]);

  const field = (key: keyof VoucherFormData, value: any) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: "" }));
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.code.trim()) e.code = "Voucher code is required";
    else if (!/^[A-Z0-9_-]{3,20}$/i.test(form.code.trim()))
      e.code = "Code must be 3–20 alphanumeric characters (or - _)";
    if (form.type === "discount") {
      if (
        !form.discountAmount ||
        isNaN(Number(form.discountAmount)) ||
        Number(form.discountAmount) <= 0
      )
        e.discountAmount = "Enter a valid discount amount";
    }
    if (
      !form.maxUses ||
      isNaN(Number(form.maxUses)) ||
      Number(form.maxUses) < 1
    )
      e.maxUses = "Max uses must be at least 1";
    if (!form.expiryDate) e.expiryDate = "Expiry date is required";
    else if (new Date(form.expiryDate) <= new Date())
      e.expiryDate = "Expiry date must be in the future";
    return e;
  };

  const handleSave = async () => {
    const e = validate();
    if (Object.keys(e).length) {
      setErrors(e);
      return;
    }
    setSaving(true);
    try {
      if (isEdit && id) {
        await editVoucher(id, form);
      } else {
        await addVoucher(form);
      }
      navigate("/admin/vouchers");
    } catch {
      // toast shown in context
    } finally {
      setSaving(false);
    }
  };

  if (loadingVoucher) {
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

  return (
    <Box
      sx={{
        width: "100%",
        mx: "auto",
        p: { xs: 2, md: 4 },
        bgcolor: "#F8FAFC",
        minHeight: "100vh",
      }}
    >
      {/* Back */}
      <Button
        startIcon={<ArrowLeft size={16} />}
        onClick={() => navigate("/admin/vouchers")}
        variant="outlined"
        sx={{
          mb: 3,
          textTransform: "none",
          borderColor: colors.border,
          color: colors.textSecondary,
          borderRadius: 2,
          "&:hover": {
            borderColor: colors.primary,
            color: colors.primary,
            bgcolor: colors.primaryBg,
          },
        }}
      >
        Back to Vouchers
      </Button>

      {/* Title */}
      <Box sx={{ mb: 4 }}>
        <h1
          style={{
            margin: 0,
            fontSize: "1.75rem",
            fontWeight: 700,
            color: colors.textPrimary,
          }}
        >
          {isEdit ? "Edit Voucher" : "Add New Voucher"}
        </h1>
        <p
          style={{
            margin: "4px 0 0",
            color: colors.textSecondary,
            fontSize: "0.875rem",
          }}
        >
          {isEdit
            ? "Update the voucher details below."
            : "Fill in the details to create a new voucher code."}
        </p>
      </Box>

      <Paper
        elevation={0}
        sx={{
          borderRadius: 3,
          border: `1px solid ${colors.border}`,
          overflow: "hidden",
          mb: 3,
        }}
      >
        {/* Card header */}
        <Box
          sx={{
            px: 3,
            py: 2.5,
            borderBottom: `1px solid ${colors.border}`,
            display: "flex",
            alignItems: "center",
            gap: 1.5,
          }}
        >
          <Ticket size={20} style={{ color: colors.primary }} />
          <span
            style={{
              fontWeight: 700,
              fontSize: "1rem",
              color: colors.textPrimary,
            }}
          >
            Voucher Information
          </span>
        </Box>

        <Box
          sx={{
            p: { xs: 2, md: 3 },
            display: "flex",
            flexDirection: "column",
            gap: 3,
          }}
        >
          {/* Code + generate button */}
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", sm: "1fr auto" },
              gap: 2,
              alignItems: "flex-start",
            }}
          >
            <TextField
              label="Voucher Code *"
              size="small"
              fullWidth
              value={form.code}
              onChange={(e) => field("code", e.target.value.toUpperCase())}
              error={!!errors.code}
              helperText={
                errors.code ||
                "Alphanumeric code users will enter (e.g. SUMMER25)"
              }
              sx={inputSx}
              inputProps={{
                style: { fontFamily: "monospace", letterSpacing: "0.08em" },
              }}
            />
            <Button
              onClick={() => field("code", generateCode())}
              variant="outlined"
              startIcon={<RefreshCw size={15} />}
              sx={{
                mt: { xs: 0, sm: "2px" },
                textTransform: "none",
                borderColor: colors.border,
                color: colors.primary,
                borderRadius: 2,
                whiteSpace: "nowrap",
                "&:hover": {
                  borderColor: colors.primary,
                  bgcolor: colors.primaryBg,
                },
              }}
            >
              Generate
            </Button>
          </Box>

          {/* Voucher Type */}
          <Box>
            <p
              style={{
                fontSize: "0.75rem",
                color: colors.textSecondary,
                fontWeight: 600,
                marginBottom: 8,
              }}
            >
              Voucher Type *
            </p>
            <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap" }}>
              {(
                [
                  {
                    value: "join",
                    label: "Join / Entry",
                    desc: "Allows user to enter an auction without paying the entry fee",
                  },
                  {
                    value: "discount",
                    label: "Final Price Discount",
                    desc: "Applies a discount amount to the final auction price",
                  },
                ] as { value: VoucherType; label: string; desc: string }[]
              ).map(({ value, label, desc }) => {
                const active = form.type === value;
                return (
                  <Box
                    key={value}
                    onClick={() => {
                      field("type", value);
                      if (value === "join") field("discountAmount", "");
                    }}
                    sx={{
                      flex: { xs: "1 1 100%", sm: "1 1 calc(50% - 6px)" },
                      p: 2,
                      borderRadius: 2,
                      cursor: "pointer",
                      border: `2px solid ${active ? colors.primary : colors.border}`,
                      background: active ? colors.primaryBg : "#fff",
                      transition: "all 0.15s",
                      "&:hover": {
                        borderColor: colors.primary,
                        background: colors.primaryBg,
                      },
                    }}
                  >
                    <p
                      style={{
                        margin: 0,
                        fontWeight: 700,
                        fontSize: "0.875rem",
                        color: active ? colors.primary : colors.textPrimary,
                      }}
                    >
                      {label}
                    </p>
                    <p
                      style={{
                        margin: "4px 0 0",
                        fontSize: "0.78rem",
                        color: colors.textSecondary,
                        lineHeight: 1.4,
                      }}
                    >
                      {desc}
                    </p>
                  </Box>
                );
              })}
            </Box>
          </Box>

          {/* Discount Amount — only for discount type */}
          {form.type === "discount" && (
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", sm: "1fr 2fr" },
                gap: 2.5,
              }}
            >
              <TextField
                label="Discount Amount (EGP) *"
                size="small"
                type="number"
                fullWidth
                value={form.discountAmount}
                onChange={(e) => field("discountAmount", e.target.value)}
                error={!!errors.discountAmount}
                helperText={
                  errors.discountAmount ||
                  "Amount deducted from the final auction price"
                }
                sx={inputSx}
              />
            </Box>
          )}

          {/* Applicable Products */}
          <FormControl
            size="small"
            fullWidth
            error={!!errors.applicableProducts}
          >
            <InputLabel sx={{ "&.Mui-focused": { color: colors.primary } }}>
              Applicable Products (leave empty for all)
            </InputLabel>
            <Select
              multiple
              value={form.applicableProducts}
              onChange={(e) => {
                const val = e.target.value;
                field(
                  "applicableProducts",
                  typeof val === "string" ? val.split(",") : val,
                );
              }}
              input={
                <OutlinedInput label="Applicable Products (leave empty for all)" />
              }
              renderValue={(selected) => {
                if (selected.length === 0) return "All products";
                return selected
                  .map((id) => {
                    const p = products.find((pr) => pr.id === id);
                    return p ? p.title : id;
                  })
                  .join(", ");
              }}
              sx={selectSx}
            >
              {products.length === 0 ? (
                <MenuItem disabled>No products available</MenuItem>
              ) : (
                products.map((p) => (
                  <MenuItem key={p.id} value={p.id}>
                    <Checkbox
                      checked={form.applicableProducts.includes(p.id)}
                      sx={{
                        color: colors.primary,
                        "&.Mui-checked": { color: colors.primary },
                      }}
                    />
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      {p.thumbnail && p.thumbnail !== "null" ? (
                        <Box
                          component="img"
                          src={p.thumbnail}
                          alt={p.title}
                          sx={{
                            width: 28,
                            height: 28,
                            borderRadius: 1,
                            objectFit: "cover",
                            flexShrink: 0,
                          }}
                        />
                      ) : (
                        <Box
                          sx={{
                            width: 28,
                            height: 28,
                            borderRadius: 1,
                            bgcolor: colors.primaryBg,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "0.7rem",
                            fontWeight: 700,
                            color: colors.primary,
                            flexShrink: 0,
                          }}
                        >
                          {p.title.charAt(0)}
                        </Box>
                      )}
                      <ListItemText primary={p.title} />
                    </Box>
                  </MenuItem>
                ))
              )}
            </Select>
            {form.applicableProducts.length > 0 && (
              <FormHelperText sx={{ color: colors.textSecondary }}>
                {form.applicableProducts.length} product
                {form.applicableProducts.length > 1 ? "s" : ""} selected
              </FormHelperText>
            )}
            {!form.applicableProducts.length && (
              <FormHelperText sx={{ color: colors.textMuted }}>
                Leave empty to apply to all products
              </FormHelperText>
            )}
          </FormControl>

          {/* Max Uses + Expiry */}
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
              gap: 2.5,
            }}
          >
            <TextField
              label="Max Uses *"
              size="small"
              type="number"
              fullWidth
              value={form.maxUses}
              onChange={(e) => field("maxUses", e.target.value)}
              error={!!errors.maxUses}
              helperText={
                errors.maxUses ||
                "Maximum number of times this code can be used"
              }
              sx={inputSx}
              inputProps={{ min: 1 }}
            />
            <TextField
              label="Expiry Date *"
              size="small"
              type="datetime-local"
              fullWidth
              value={form.expiryDate}
              onChange={(e) => field("expiryDate", e.target.value)}
              error={!!errors.expiryDate}
              helperText={errors.expiryDate}
              sx={inputSx}
              InputLabelProps={{ shrink: true }}
            />
          </Box>

          {/* Active Toggle */}
          <Box>
            <FormControlLabel
              control={
                <Switch
                  checked={form.isActive}
                  onChange={(e) => field("isActive", e.target.checked)}
                  sx={{
                    "& .MuiSwitch-switchBase.Mui-checked": {
                      color: colors.primary,
                    },
                    "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": {
                      bgcolor: colors.primary,
                    },
                  }}
                />
              }
              label={
                <span
                  style={{
                    fontSize: "0.875rem",
                    fontWeight: 600,
                    color: colors.textPrimary,
                  }}
                >
                  Active
                </span>
              }
            />
          </Box>

          {/* Info banner */}
          <Box
            sx={{
              display: "flex",
              alignItems: "flex-start",
              gap: 1.5,
              bgcolor: colors.primaryBg,
              border: `1px solid ${colors.primaryRing}`,
              borderRadius: 2,
              p: 2,
            }}
          >
            <Info
              size={16}
              style={{ color: colors.primary, flexShrink: 0, marginTop: 2 }}
            />
            <p
              style={{
                fontSize: "0.85rem",
                color: colors.primaryDark,
                margin: 0,
              }}
            >
              <strong>Note:</strong>{" "}
              {form.type === "join"
                ? "A Join voucher allows users to enter a paid auction without paying the entry fee."
                : "A Final Price Discount voucher deducts the specified amount from the user's final bid price."}{" "}
              {form.applicableProducts.length === 0
                ? "This voucher will be valid for all products."
                : `This voucher is restricted to ${form.applicableProducts.length} selected product(s).`}
            </p>
          </Box>
        </Box>
      </Paper>

      {/* Footer actions */}
      <Box
        sx={{
          mt: 3,
          display: "flex",
          gap: 2,
          justifyContent: { xs: "stretch", sm: "flex-end" },
          flexDirection: { xs: "column-reverse", sm: "row" },
        }}
      >
        <Button
          onClick={() => navigate("/admin/vouchers")}
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
          startIcon={
            saving ? (
              <CircularProgress size={16} color="inherit" />
            ) : (
              <Save size={16} />
            )
          }
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
          {saving ? "Saving…" : isEdit ? "Save Changes" : "Create Voucher"}
        </Button>
      </Box>
    </Box>
  );
}
