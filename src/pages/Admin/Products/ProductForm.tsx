import { useEffect, useState } from "react";
import { TextField, Button, Paper, Box, Chip } from "@mui/material";
import { ArrowLeft, Save, Package, Info } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import {
  STATIC_PRODUCTS,
type  Product,
 type ProductStatus,
type  ProductCategory,
  CATEGORIES,
  STATUSES,
  colors,
  getCategoryColor,
  getStatusStyle,
} from "./products-data";

const inputSx = {
  "& .MuiOutlinedInput-root": {
    bgcolor: "#fff",
    "& fieldset": { borderColor: colors.border },
    "&:hover fieldset": { borderColor: colors.primary },
    "&.Mui-focused fieldset": { borderColor: colors.primary, borderWidth: 2 },
  },
  "& .MuiInputLabel-root.Mui-focused": { color: colors.primary },
};

export default function ProductForm() {
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();
  const isEdit = Boolean(id);

  const [form, setForm] = useState({
    name: "",
    sku: "",
    category: "Electronics" as ProductCategory,
    price: "",
    stock: "",
    status: "active" as ProductStatus,
    description: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  /* pre-fill on edit */
  useEffect(() => {
    if (isEdit && id) {
      const p = STATIC_PRODUCTS.find((x) => x.id === id);
      if (p) {
        setForm({
          name: p.name,
          sku: p.sku,
          category: p.category,
          price: String(p.price),
          stock: String(p.stock),
          status: p.status,
          description: p.description,
        });
      }
    }
  }, [id, isEdit]);

  const field = (key: string, value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: "" }));
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "Product name is required";
    if (!form.sku.trim()) e.sku = "SKU is required";
    if (!form.price || isNaN(Number(form.price)) || Number(form.price) < 0)
      e.price = "Enter a valid price";
    if (!form.stock || isNaN(Number(form.stock)) || Number(form.stock) < 0)
      e.stock = "Enter a valid stock quantity";
    if (!form.description.trim()) e.description = "Description is required";
    return e;
  };

  const handleSave = async () => {
    const e = validate();
    if (Object.keys(e).length) {
      setErrors(e);
      return;
    }

    setSaving(true);
    await new Promise((r) => setTimeout(r, 700));
    setSaving(false);
    setSaved(true);
    setTimeout(() => navigate("/admin/Products"), 900);
  };

  const sStyle = getStatusStyle(form.status);
  const catColor = getCategoryColor(form.category);

  return (
    <Box
      sx={{
        maxWidth: 900,
        mx: "auto",
        p: { xs: 2, md: 4 },
        bgcolor: "#F8FAFC",
        minHeight: "100vh",
      }}
    >
      {/* ── Back link ── */}
      <Button
        startIcon={<ArrowLeft size={16} />}
        onClick={() => navigate("/admin/Products")}
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
        Back to Products
      </Button>

      {/* ── Page title ── */}
      <Box sx={{ mb: 4 }}>
        <h1
          style={{
            margin: 0,
            fontSize: "1.75rem",
            fontWeight: 700,
            color: colors.textPrimary,
          }}
        >
          {isEdit ? "Edit Product" : "Add New Product"}
        </h1>
        <p
          style={{
            margin: "4px 0 0",
            color: colors.textSecondary,
            fontSize: "0.875rem",
          }}
        >
          {isEdit
            ? "Update the product details below."
            : "Fill in the details to create a new product."}
        </p>
      </Box>

      {/* ── Card ── */}
      <Paper
        elevation={0}
        sx={{
          borderRadius: 3,
          border: `1px solid ${colors.border}`,
          overflow: "hidden",
        }}
      >
        {/* Card header strip */}
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
          <Package size={20} style={{ color: colors.primary }} />
          <span
            style={{
              fontWeight: 700,
              fontSize: "1rem",
              color: colors.textPrimary,
            }}
          >
            Product Information
          </span>
        </Box>

        {/* Form fields */}
        <Box
          sx={{
            p: { xs: 2, md: 3 },
            display: "flex",
            flexDirection: "column",
            gap: 3,
          }}
        >
          {/* Row 1 — Name + SKU */}
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
              gap: 2.5,
            }}
          >
            <TextField
              label="Product Name *"
              size="small"
              fullWidth
              value={form.name}
              onChange={(e) => field("name", e.target.value)}
              error={!!errors.name}
              helperText={errors.name}
              sx={inputSx}
            />
            <TextField
              label="SKU *"
              size="small"
              fullWidth
              value={form.sku}
              onChange={(e) => field("sku", e.target.value)}
              error={!!errors.sku}
              helperText={errors.sku}
              sx={inputSx}
            />
          </Box>

          {/* Row 2 — Price + Stock */}
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
              gap: 2.5,
            }}
          >
            <TextField
              label="Price ($) *"
              size="small"
              type="number"
              fullWidth
              value={form.price}
              onChange={(e) => field("price", e.target.value)}
              error={!!errors.price}
              helperText={errors.price}
              sx={inputSx}
            />
            <TextField
              label="Stock Quantity *"
              size="small"
              type="number"
              fullWidth
              value={form.stock}
              onChange={(e) => field("stock", e.target.value)}
              error={!!errors.stock}
              helperText={errors.stock}
              sx={inputSx}
            />
          </Box>

          {/* Row 3 — Category + Status */}
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
              gap: 2.5,
            }}
          >
            {/* Category */}
            <Box>
              <p
                style={{
                  fontSize: "0.75rem",
                  color: colors.textSecondary,
                  fontWeight: 600,
                  marginBottom: 6,
                }}
              >
                Category *
              </p>
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                {CATEGORIES.map((cat) => {
                  const cc = getCategoryColor(cat);
                  const active = form.category === cat;
                  return (
                    <button
                      key={cat}
                      onClick={() => field("category", cat)}
                      style={{
                        padding: "5px 14px",
                        borderRadius: 99,
                        fontSize: "0.78rem",
                        fontWeight: 600,
                        cursor: "pointer",
                        transition: "all 0.15s",
                        border: `1.5px solid ${active ? cc.text : colors.border}`,
                        background: active ? cc.bg : "#fff",
                        color: active ? cc.text : colors.textSecondary,
                      }}
                    >
                      {cat}
                    </button>
                  );
                })}
              </Box>
            </Box>

            {/* Status */}
            <Box>
              <p
                style={{
                  fontSize: "0.75rem",
                  color: colors.textSecondary,
                  fontWeight: 600,
                  marginBottom: 6,
                }}
              >
                Status *
              </p>
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                {STATUSES.map((s) => {
                  const ss = getStatusStyle(s);
                  const active = form.status === s;
                  return (
                    <button
                      key={s}
                      onClick={() => field("status", s)}
                      style={{
                        padding: "5px 16px",
                        borderRadius: 99,
                        fontSize: "0.78rem",
                        fontWeight: 600,
                        cursor: "pointer",
                        transition: "all 0.15s",
                        border: `1.5px solid ${active ? ss.color : colors.border}`,
                        background: active ? ss.bg : "#fff",
                        color: active ? ss.color : colors.textSecondary,
                      }}
                    >
                      {s.charAt(0).toUpperCase() + s.slice(1)}
                    </button>
                  );
                })}
              </Box>
            </Box>
          </Box>

          {/* Description */}
          <TextField
            label="Description *"
            size="small"
            fullWidth
            multiline
            rows={4}
            value={form.description}
            onChange={(e) => field("description", e.target.value)}
            error={!!errors.description}
            helperText={errors.description}
            sx={inputSx}
          />

          {/* Note banner */}
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
              {isEdit
                ? "Changes will be saved immediately and reflected in the product catalogue."
                : "The product will be created with the selected status and available in your catalogue."}
            </p>
          </Box>
        </Box>
      </Paper>

      {/* ── Footer actions ── */}
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
          onClick={() => navigate("/admin/Products")}
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
          disabled={saving || saved}
          startIcon={saving ? null : <Save size={16} />}
          sx={{
            textTransform: "none",
            bgcolor: colors.primary,
            "&:hover": {
  bgcolor: "#111",
  color: "#fff",
}
,
            borderRadius: 2,
            px: 4,
            fontWeight: 600,
            width: { xs: "100%", sm: "auto" },
            boxShadow: "0 4px 14px rgba(37,99,235,0.30)",
          }}
        >
          {saved
            ? "✓ Saved!"
            : saving
              ? "Saving…"
              : isEdit
                ? "Save Changes"
                : "Create Product"}
        </Button>
      </Box>
    </Box>
  );
}
