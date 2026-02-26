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
import { ArrowLeft, Save, Tag, Info } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import {
  colors,
  DEFAULT_CATEGORY_FORM,
  type CategoryFormData,
} from "./Categories-data";
import { useCategories } from "@/store/AdminContext/CategoryContext/CategoryContext";

const inputSx = {
  "& .MuiOutlinedInput-root": {
    bgcolor: "#fff",
    "& fieldset": { borderColor: colors.border },
    "&:hover fieldset": { borderColor: colors.primary },
    "&.Mui-focused fieldset": { borderColor: colors.primary, borderWidth: 2 },
  },
  "& .MuiInputLabel-root.Mui-focused": { color: colors.primary },
};

export default function CategoryForm() {
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();
  const isEdit = Boolean(id);
  const { getCategory, addCategory, editCategory } = useCategories();

  const [form, setForm] = useState<CategoryFormData>(DEFAULT_CATEGORY_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [loadingCategory, setLoadingCategory] = useState(isEdit);

  // ── Pre-fill on edit ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isEdit || !id) return;
    (async () => {
      setLoadingCategory(true);
      const c = await getCategory(id);
      if (c) {
        setForm({
          nameEn: c.name.en,
          nameAr: c.name.ar,
          descriptionEn: c.description.en,
          descriptionAr: c.description.ar,
          isActive: c.isActive,
        });
      }
      setLoadingCategory(false);
    })();
  }, [id, isEdit, getCategory]);

  const field = (key: keyof CategoryFormData, value: any) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: "" }));
  };

  // ── Validation ─────────────────────────────────────────────────────────────
  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.nameEn.trim()) e.nameEn = "English name is required";
    if (!form.nameAr.trim()) e.nameAr = "Arabic name is required";
    if (!form.descriptionEn.trim())
      e.descriptionEn = "English description is required";
    if (!form.descriptionAr.trim())
      e.descriptionAr = "Arabic description is required";
    return e;
  };

  // ── Save ───────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    const e = validate();
    if (Object.keys(e).length) {
      setErrors(e);
      return;
    }
    setSaving(true);
    try {
      if (isEdit && id) {
        await editCategory(id, form);
      } else {
        await addCategory(form);
      }
      navigate("/admin/categories");
    } catch {
      // toast already shown in context
    } finally {
      setSaving(false);
    }
  };

  if (loadingCategory) {
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
        onClick={() => navigate("/admin/categories")}
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
        Back to Categories
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
          {isEdit ? "Edit Category" : "Add New Category"}
        </h1>
        <p
          style={{
            margin: "4px 0 0",
            color: colors.textSecondary,
            fontSize: "0.875rem",
          }}
        >
          {isEdit
            ? "Update the category details below."
            : "Fill in the details to create a new category."}
        </p>
      </Box>

      {/* ── Main card ── */}
      <Paper
        elevation={0}
        sx={{
          borderRadius: 3,
          border: `1px solid ${colors.border}`,
          overflow: "hidden",
          mb: 3,
        }}
      >
        {/* Header strip */}
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
          <Tag size={20} style={{ color: colors.primary }} />
          <span
            style={{
              fontWeight: 700,
              fontSize: "1rem",
              color: colors.textPrimary,
            }}
          >
            Category Information
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
          {/* Section: Name */}
          <Box>
            <p
              style={{
                fontSize: "0.75rem",
                fontWeight: 700,
                color: colors.textMuted,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                margin: "0 0 12px",
              }}
            >
              Category Name
            </p>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
                gap: 2.5,
              }}
            >
              <TextField
                label="Name (English) *"
                size="small"
                fullWidth
                value={form.nameEn}
                onChange={(e) => field("nameEn", e.target.value)}
                error={!!errors.nameEn}
                helperText={errors.nameEn}
                sx={inputSx}
                placeholder="e.g. Electronics"
              />
              <TextField
                label="Name (Arabic) *"
                size="small"
                fullWidth
                value={form.nameAr}
                onChange={(e) => field("nameAr", e.target.value)}
                error={!!errors.nameAr}
                helperText={errors.nameAr}
                sx={{
                  ...inputSx,
                  "& input": { direction: "rtl", textAlign: "right" },
                }}
                placeholder="مثال: إلكترونيات"
              />
            </Box>
          </Box>

          {/* Section: Description */}
          <Box>
            <p
              style={{
                fontSize: "0.75rem",
                fontWeight: 700,
                color: colors.textMuted,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                margin: "0 0 12px",
              }}
            >
              Description
            </p>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
                gap: 2.5,
              }}
            >
              <TextField
                label="Description (English) *"
                size="small"
                fullWidth
                multiline
                rows={3}
                value={form.descriptionEn}
                onChange={(e) => field("descriptionEn", e.target.value)}
                error={!!errors.descriptionEn}
                helperText={errors.descriptionEn}
                sx={inputSx}
                placeholder="e.g. Electronic devices and gadgets"
              />
              <TextField
                label="Description (Arabic) *"
                size="small"
                fullWidth
                multiline
                rows={3}
                value={form.descriptionAr}
                onChange={(e) => field("descriptionAr", e.target.value)}
                error={!!errors.descriptionAr}
                helperText={errors.descriptionAr}
                sx={{
                  ...inputSx,
                  "& textarea": { direction: "rtl", textAlign: "right" },
                }}
                placeholder="مثال: أجهزة إلكترونية وأدوات"
              />
            </Box>
          </Box>

          {/* isActive toggle */}
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
              {isEdit
                ? "Changes will be reflected immediately across the platform."
                : "Categories are used to organise products. Products can be assigned a category when creating or editing them."}
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
          onClick={() => navigate("/admin/categories")}
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
          {saving ? "Saving…" : isEdit ? "Save Changes" : "Create Category"}
        </Button>
      </Box>
    </Box>
  );
}
