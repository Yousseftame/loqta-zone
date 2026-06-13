import { useEffect, useState, useRef } from "react";
import {
  TextField,
  Button,
  Paper,
  Box,
  Switch,
  FormControlLabel,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  InputAdornment,
  Tabs,
  Tab,
} from "@mui/material";
import {
  ArrowLeft,
  Save,
  Package,
  Info,
  Plus,
  X,
  Upload,
  Lock,
  Globe,
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import {
  colors,
  DEFAULT_FORM_DATA,
  type ProductFormData,
} from "./products-data";
import { useProducts } from "@/store/AdminContext/ProductContext/ProductsCotnext";
import { useCategories } from "@/store/AdminContext/CategoryContext/CategoryContext";
import { useSuppliers } from "@/store/AdminContext/SupplierContext/SupplierContext";

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

const numericProps = {
  inputMode: "decimal" as const,
  pattern: "[0-9]*\\.?[0-9]*",
};

function sanitizeNumeric(val: string): string {
  const cleaned = val.replace(/[^0-9.]/g, "");
  const parts = cleaned.split(".");
  if (parts.length > 2) return parts[0] + "." + parts.slice(1).join("");
  return cleaned;
}

// ─── Lang tab ────────────────────────────────────────────────────────────────

function LangTabPanel({
  value,
  index,
  children,
}: {
  value: number;
  index: number;
  children: React.ReactNode;
}) {
  return value === index ? <>{children}</> : null;
}

export default function ProductForm() {
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();
  const isEdit = Boolean(id);
  const { getProduct, addProduct, editProduct } = useProducts();
  const { categories } = useCategories();
  const { suppliers } = useSuppliers();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<ProductFormData>(DEFAULT_FORM_DATA);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [loadingProduct, setLoadingProduct] = useState(isEdit);
  const [langTab, setLangTab] = useState(0); // 0 = EN, 1 = AR
  const [newFeatureEn, setNewFeatureEn] = useState("");
  const [newFeatureAr, setNewFeatureAr] = useState("");
  const [originalImages, setOriginalImages] = useState<string[]>([]);
  const [newImagePreviews, setNewImagePreviews] = useState<string[]>([]);

  const activeCategories = categories.filter((c) => c.isActive);
  const activeSuppliers = suppliers.filter((s) => s.isActive);

  // ── Pre-fill on edit ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isEdit || !id) return;
    (async () => {
      setLoadingProduct(true);
      const p = await getProduct(id);
      if (p) {
        setOriginalImages(p.images);
        setForm({
          titleEn: typeof p.title === "string" ? p.title : p.title.en,
          titleAr: typeof p.title === "string" ? "" : p.title.ar,
          brandEn: typeof p.brand === "string" ? p.brand : (p.brand?.en ?? ""),
          brandAr: typeof p.brand === "string" ? "" : (p.brand?.ar ?? ""),
          modelEn: typeof p.model === "string" ? p.model : (p.model?.en ?? ""),
          modelAr: typeof p.model === "string" ? "" : (p.model?.ar ?? ""),
          category: p.category,
          supplierId: p.supplierId,
          descriptionEn:
            typeof p.description === "string"
              ? p.description
              : p.description.en,
          descriptionAr:
            typeof p.description === "string" ? "" : p.description.ar,
          price: String(p.price),
          actualPrice: String(p.actualPrice ?? ""),
          quantity: String(p.quantity),
          isActive: p.isActive,
          featuresEn: p.features.map((f) => (typeof f === "string" ? f : f.en)),
          featuresAr: p.features.map((f) =>
            typeof f === "string" ? "" : f.ar,
          ),
          newImages: [],
          existingImages: p.images,
          thumbnail: p.thumbnail,
        });
      }
      setLoadingProduct(false);
    })();
  }, [id, isEdit, getProduct]);

  const field = (key: keyof ProductFormData, value: any) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: "" }));
  };

  const numField =
    (key: "price" | "actualPrice" | "quantity") =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      field(key, sanitizeNumeric(e.target.value));
    };

  const addFeature = () => {
    const en = newFeatureEn.trim();
    const ar = newFeatureAr.trim();
    if (!en) return;
    field("featuresEn", [...form.featuresEn, en]);
    field("featuresAr", [...form.featuresAr, ar]);
    setNewFeatureEn("");
    setNewFeatureEn("");
    setNewFeatureAr("");
  };

  const addFeatureAr = () => {
    const en = newFeatureEn.trim();
    const ar = newFeatureAr.trim();
    if (!ar) return;
    field("featuresEn", [...form.featuresEn, en]);
    field("featuresAr", [...form.featuresAr, ar]);
    setNewFeatureEn("");
    setNewFeatureAr("");
  };

  const removeFeature = (i: number) => {
    field(
      "featuresEn",
      form.featuresEn.filter((_, idx) => idx !== i),
    );
    field(
      "featuresAr",
      form.featuresAr.filter((_, idx) => idx !== i),
    );
  };

  const handleImageFiles = (files: FileList | null) => {
    if (!files) return;
    const newFiles = Array.from(files);
    const newPreviews = newFiles.map((f) => URL.createObjectURL(f));
    setForm((prev) => ({
      ...prev,
      newImages: [...prev.newImages, ...newFiles],
    }));
    setNewImagePreviews((prev) => [...prev, ...newPreviews]);
  };

  const removeNewImage = (i: number) => {
    URL.revokeObjectURL(newImagePreviews[i]);
    setForm((prev) => ({
      ...prev,
      newImages: prev.newImages.filter((_, idx) => idx !== i),
    }));
    setNewImagePreviews((prev) => prev.filter((_, idx) => idx !== i));
  };

  const removeExistingImage = (url: string) => {
    const remaining = form.existingImages.filter((u) => u !== url);
    const newThumbnail =
      form.thumbnail === url ? (remaining[0] ?? null) : form.thumbnail;
    setForm((f) => ({
      ...f,
      existingImages: remaining,
      thumbnail: newThumbnail,
    }));
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.titleEn.trim()) e.titleEn = "English title is required";
    if (!form.titleAr.trim()) e.titleAr = "Arabic title is required";
    if (!form.brandEn.trim()) e.brandEn = "English brand is required";
    if (!form.modelEn.trim()) e.modelEn = "English model is required";
    if (!form.brandAr.trim()) e.brandAr = "Arabic brand is required";
    if (!form.modelAr.trim()) e.modelAr = "Arabic model is required";
    if (!form.category.trim()) e.category = "Category is required";
    if (!form.descriptionEn.trim())
      e.descriptionEn = "English description is required";
    if (!form.descriptionAr.trim())
      e.descriptionAr = "Arabic description is required";
    const priceVal = Number(form.price.trim());
    if (!form.price.trim() || isNaN(priceVal) || priceVal < 0)
      e.price = "Enter a valid starting price";
    if (form.actualPrice.trim() !== "") {
      const apVal = Number(form.actualPrice.trim());
      if (isNaN(apVal) || apVal < 0) e.actualPrice = "Enter a valid cost price";
    }
    const qtyVal = Number(form.quantity.trim());
    if (!form.quantity.trim() || isNaN(qtyVal) || qtyVal < 0)
      e.quantity = "Enter a valid quantity";

    // If there are Arabic-tab errors, auto-switch to show them
    const arErrors = ["titleAr", "descriptionAr", "brandAr", "modelAr"];
    if (arErrors.some((k) => e[k])) setLangTab(1);
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
        await editProduct(id, form, originalImages);
        navigate("/admin/Products");
      } else {
        await addProduct(form);
        navigate("/admin/Products");
      }
    } catch {
      // toast already shown in context/service
    } finally {
      setSaving(false);
    }
  };

  if (loadingProduct) {
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

        <Box
          sx={{
            p: { xs: 2, md: 3 },
            display: "flex",
            flexDirection: "column",
            gap: 3,
          }}
        >
          {/* ── Language tabs for title, description, features ── */}
          <Box
            sx={{
              border: `1px solid ${colors.border}`,
              borderRadius: 2,
              overflow: "hidden",
            }}
          >
            <Box
              sx={{
                borderBottom: `1px solid ${colors.border}`,
                bgcolor: colors.muted,
              }}
            >
              <Tabs
                value={langTab}
                onChange={(_e, v) => setLangTab(v)}
                sx={{
                  "& .MuiTab-root": {
                    textTransform: "none",
                    fontWeight: 600,
                    minHeight: 44,
                  },
                  "& .Mui-selected": { color: colors.primary },
                  "& .MuiTabs-indicator": { bgcolor: colors.primary },
                }}
              >
                <Tab
                  icon={<Globe size={14} />}
                  iconPosition="start"
                  label="English"
                  sx={{
                    gap: 0.5,
                    color:
                      errors.titleEn || errors.descriptionEn
                        ? colors.error
                        : undefined,
                  }}
                />
                <Tab
                  icon={<Globe size={14} />}
                  iconPosition="start"
                  label="العربية"
                  sx={{
                    gap: 0.5,
                    color:
                      errors.titleAr || errors.descriptionAr
                        ? colors.error
                        : undefined,
                  }}
                />
              </Tabs>
            </Box>

            <Box sx={{ p: { xs: 2, md: 2.5 } }}>
              {/* ── English panel ── */}
              <LangTabPanel value={langTab} index={0}>
                <Box
                  sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}
                >
                  <TextField
                    label="Title (English) *"
                    size="small"
                    fullWidth
                    value={form.titleEn}
                    onChange={(e) => field("titleEn", e.target.value)}
                    error={!!errors.titleEn}
                    helperText={errors.titleEn}
                    sx={inputSx}
                    placeholder="e.g. iPhone 15 Pro Max"
                  />
                  <TextField
                    label="Description (English) *"
                    size="small"
                    fullWidth
                    multiline
                    rows={4}
                    value={form.descriptionEn}
                    onChange={(e) => field("descriptionEn", e.target.value)}
                    error={!!errors.descriptionEn}
                    helperText={errors.descriptionEn}
                    sx={inputSx}
                    placeholder="Describe the product in English…"
                  />

                  {/* English features */}
                  <Box>
                    <p
                      style={{
                        fontSize: "0.75rem",
                        color: colors.textSecondary,
                        fontWeight: 600,
                        marginBottom: 8,
                      }}
                    >
                      Features (English)
                    </p>
                    <Box sx={{ display: "flex", gap: 1, mb: 1.5 }}>
                      <TextField
                        size="small"
                        fullWidth
                        placeholder="Add an English feature…"
                        value={newFeatureEn}
                        onChange={(e) => setNewFeatureEn(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            addFeature();
                          }
                        }}
                        sx={inputSx}
                      />
                      <Button
                        onClick={addFeature}
                        variant="outlined"
                        sx={{
                          borderColor: colors.border,
                          color: colors.primary,
                          minWidth: 40,
                          px: 1.5,
                          borderRadius: 2,
                        }}
                      >
                        <Plus size={18} />
                      </Button>
                    </Box>
                    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                      {form.featuresEn.map((f, i) => (
                        <Box
                          key={i}
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 0.5,
                            bgcolor: colors.primaryBg,
                            border: `1px solid ${colors.primaryRing}`,
                            borderRadius: 99,
                            px: 1.5,
                            py: 0.5,
                          }}
                        >
                          <span
                            style={{
                              fontSize: "0.78rem",
                              color: colors.primary,
                              fontWeight: 600,
                            }}
                          >
                            {f}
                          </span>
                          <button
                            onClick={() => removeFeature(i)}
                            style={{
                              background: "none",
                              border: "none",
                              cursor: "pointer",
                              color: colors.primary,
                              display: "flex",
                              padding: 0,
                            }}
                          >
                            <X size={13} />
                          </button>
                        </Box>
                      ))}
                    </Box>
                  </Box>

                  {/* ── Row: Brand + Model (English) ── */}
                  <Box
                    sx={{
                      display: "grid",
                      gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
                      gap: 2.5,
                    }}
                  >
                    <TextField
                      label="Brand (English) *"
                      size="small"
                      fullWidth
                      value={form.brandEn}
                      onChange={(e) => field("brandEn", e.target.value)}
                      error={!!errors.brandEn}
                      helperText={errors.brandEn}
                      sx={inputSx}
                    />
                    <TextField
                      label="Model (English) *"
                      size="small"
                      fullWidth
                      value={form.modelEn}
                      onChange={(e) => field("modelEn", e.target.value)}
                      error={!!errors.modelEn}
                      helperText={errors.modelEn}
                      sx={inputSx}
                    />
                  </Box>
                </Box>
              </LangTabPanel>

              {/* ── Arabic panel ── */}
              <LangTabPanel value={langTab} index={1}>
                <Box
                  sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}
                >
                  <TextField
                    label="العنوان (عربي) *"
                    size="small"
                    fullWidth
                    value={form.titleAr}
                    onChange={(e) => field("titleAr", e.target.value)}
                    error={!!errors.titleAr}
                    helperText={errors.titleAr}
                    sx={{
                      ...inputSx,
                      "& input": { direction: "rtl", textAlign: "right" },
                    }}
                    placeholder="مثال: آيفون 15 برو ماكس"
                  />
                  <TextField
                    label="الوصف (عربي) *"
                    size="small"
                    fullWidth
                    multiline
                    rows={4}
                    value={form.descriptionAr}
                    onChange={(e) => field("descriptionAr", e.target.value)}
                    error={!!errors.descriptionAr}
                    helperText={errors.descriptionAr}
                    sx={{
                      ...inputSx,
                      "& textarea": { direction: "rtl", textAlign: "right" },
                    }}
                    placeholder="اكتب وصف المنتج بالعربية…"
                  />

                  {/* Arabic features */}
                  <Box>
                    <p
                      style={{
                        fontSize: "0.75rem",
                        color: colors.textSecondary,
                        fontWeight: 600,
                        marginBottom: 8,
                      }}
                    >
                      المميزات (عربي)
                    </p>
                    <Box sx={{ display: "flex", gap: 1, mb: 1.5 }}>
                      <TextField
                        size="small"
                        fullWidth
                        placeholder="أضف ميزة بالعربية…"
                        value={newFeatureAr}
                        onChange={(e) => setNewFeatureAr(e.target.value)}
                        sx={{
                          ...inputSx,
                          "& input": { direction: "rtl", textAlign: "right" },
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            addFeatureAr();
                          }
                        }}
                      />
                      <Button
                        onClick={addFeatureAr}
                        variant="outlined"
                        sx={{
                          borderColor: colors.border,
                          color: colors.primary,
                          minWidth: 40,
                          px: 1.5,
                          borderRadius: 2,
                        }}
                      >
                        <Plus size={18} />
                      </Button>
                    </Box>
                    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                      {form.featuresAr.map((f, i) => (
                        <Box
                          key={i}
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 0.5,
                            bgcolor: "#FFF7ED",
                            border: `1px solid #FED7AA`,
                            borderRadius: 99,
                            px: 1.5,
                            py: 0.5,
                            direction: "rtl",
                          }}
                        >
                          <span
                            style={{
                              fontSize: "0.78rem",
                              color: "#C2410C",
                              fontWeight: 600,
                            }}
                          >
                            {f || `—`}
                          </span>
                        </Box>
                      ))}
                      {form.featuresEn.length > 0 &&
                        form.featuresAr.every((f) => !f) && (
                          <p
                            style={{
                              fontSize: "0.75rem",
                              color: colors.textMuted,
                              margin: 0,
                            }}
                          >
                            Arabic translations will be saved when you type them
                            in the field above and add them via the English tab.
                          </p>
                        )}
                    </Box>
                    <Box
                      sx={{
                        mt: 1.5,
                        p: 1.5,
                        bgcolor: "#FFF7ED",
                        borderRadius: 2,
                        border: "1px solid #FED7AA",
                      }}
                    >
                      <p
                        style={{
                          margin: 0,
                          fontSize: "0.78rem",
                          color: "#92400E",
                        }}
                      >
                        <strong>Tip:</strong> Add features on the English tab.
                        Arabic translations are paired by position — the Arabic
                        field above corresponds to the feature being added
                        simultaneously.
                      </p>
                    </Box>
                    </Box>

                  {/* ── Row: Brand + Model (Arabic) ── */}
                  <Box
                    sx={{
                      display: "grid",
                      gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
                      gap: 2.5,
                    }}
                  >
                    <TextField
                      label="الماركة (عربي) *"
                      size="small"
                      fullWidth
                      value={form.brandAr}
                      onChange={(e) => field("brandAr", e.target.value)}
                      error={!!errors.brandAr}
                      helperText={errors.brandAr}
                      sx={{
                        ...inputSx,
                        "& input": { direction: "rtl", textAlign: "right" },
                      }}
                    />
                    <TextField
                      label="الموديل (عربي) *"
                      size="small"
                      fullWidth
                      value={form.modelAr}
                      onChange={(e) => field("modelAr", e.target.value)}
                      error={!!errors.modelAr}
                      helperText={errors.modelAr}
                      sx={{
                        ...inputSx,
                        "& input": { direction: "rtl", textAlign: "right" },
                      }}
                    />
                  </Box>
                </Box>
              </LangTabPanel>
            </Box>
          </Box>

          {/* ── Row: Category ── */}
          <FormControl size="small" fullWidth error={!!errors.category}>
            <InputLabel sx={{ "&.Mui-focused": { color: colors.primary } }}>
              Category *
            </InputLabel>
            <Select
              value={form.category}
              label="Category *"
              onChange={(e) => field("category", e.target.value)}
              sx={selectSx}
            >
              {activeCategories.length === 0 && (
                <MenuItem disabled value="">
                  <em>No active categories found</em>
                </MenuItem>
              )}
              {activeCategories.map((cat) => (
                <MenuItem key={cat.id} value={cat.id}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <span style={{ fontWeight: 600, fontSize: "0.875rem" }}>
                      {cat.name.en}
                    </span>
                    <span
                      style={{ fontSize: "0.75rem", color: colors.textMuted }}
                    >
                      — {cat.name.ar}
                    </span>
                  </Box>
                </MenuItem>
              ))}
            </Select>
            {errors.category && (
              <FormHelperText>{errors.category}</FormHelperText>
            )}
          </FormControl>

          {/* ── Row: Supplier ── */}
          <FormControl size="small" fullWidth>
            <InputLabel sx={{ "&.Mui-focused": { color: colors.primary } }}>
              Supplier
            </InputLabel>
            <Select
              value={form.supplierId}
              label="Supplier"
              onChange={(e) => field("supplierId", e.target.value)}
              sx={selectSx}
            >
              <MenuItem value="">
                <em style={{ color: colors.textMuted }}>
                  No supplier selected
                </em>
              </MenuItem>
              {activeSuppliers.map((sup) => (
                <MenuItem key={sup.id} value={sup.id}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <span style={{ fontWeight: 600, fontSize: "0.875rem" }}>
                      {sup.name}
                    </span>
                    {sup.contactPerson && (
                      <span
                        style={{ fontSize: "0.75rem", color: colors.textMuted }}
                      >
                        — {sup.contactPerson}
                      </span>
                    )}
                  </Box>
                </MenuItem>
              ))}
            </Select>
            <FormHelperText>
              Optional — select the supplier this product comes from.
            </FormHelperText>
          </FormControl>

          {/* ── Row: Prices ── */}
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
              gap: 2.5,
            }}
          >
            <TextField
              label="Starting Price (EGP) *"
              size="small"
              fullWidth
              value={form.price}
              onChange={numField("price")}
              error={!!errors.price}
              helperText={errors.price}
              inputProps={numericProps}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <span
                      style={{ color: colors.textMuted, fontSize: "0.85rem" }}
                    >
                      EGP
                    </span>
                  </InputAdornment>
                ),
              }}
              sx={inputSx}
            />
            <TextField
              label="Cost Price (EGP) — Admin only"
              size="small"
              fullWidth
              value={form.actualPrice}
              onChange={numField("actualPrice")}
              error={!!errors.actualPrice}
              helperText={
                errors.actualPrice ||
                "Price you paid · complete it in purchase tab  "
              }
              inputProps={numericProps}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <span
                      style={{ color: colors.textMuted, fontSize: "0.85rem" }}
                    >
                      EGP
                    </span>
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <Lock size={14} style={{ color: colors.textMuted }} />
                  </InputAdornment>
                ),
              }}
              sx={{
                ...inputSx,
                "& .MuiOutlinedInput-root": {
                  ...inputSx["& .MuiOutlinedInput-root"],
                  bgcolor: "#FFFBEB",
                },
              }}
            />
          </Box>

          {/* ── Row: Quantity ── */}
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
              gap: 2.5,
            }}
          >
            <TextField
              label="Quantity *"
              size="small"
              fullWidth
              value={form.quantity}
              onChange={numField("quantity")}
              error={!!errors.quantity}
              helperText={errors.quantity}
              inputProps={numericProps}
              sx={inputSx}
            />
          </Box>

          {/* ── Active toggle ── */}
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

          {/* ── Images ── */}
          <Box>
            <p
              style={{
                fontSize: "0.75rem",
                color: colors.textSecondary,
                fontWeight: 600,
                marginBottom: 8,
              }}
            >
              Images
            </p>

            {form.existingImages.length > 0 && (
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5, mb: 2 }}>
                {form.existingImages.map((url) => (
                  <Box
                    key={url}
                    sx={{ position: "relative", width: 80, height: 80 }}
                  >
                    <Box
                      component="img"
                      src={url}
                      alt="product"
                      sx={{
                        width: 80,
                        height: 80,
                        borderRadius: 2,
                        objectFit: "cover",
                        border: `1px solid ${colors.border}`,
                      }}
                    />
                    <button
                      onClick={() => removeExistingImage(url)}
                      style={{
                        position: "absolute",
                        top: -6,
                        right: -6,
                        width: 20,
                        height: 20,
                        borderRadius: "50%",
                        background: colors.error,
                        border: "none",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#fff",
                        padding: 0,
                      }}
                    >
                      <X size={11} />
                    </button>
                    {form.thumbnail === url && (
                      <span
                        style={{
                          position: "absolute",
                          bottom: 2,
                          left: 2,
                          fontSize: "0.55rem",
                          background: colors.primary,
                          color: "#fff",
                          padding: "1px 4px",
                          borderRadius: 4,
                          fontWeight: 700,
                        }}
                      >
                        THUMB
                      </span>
                    )}
                  </Box>
                ))}
              </Box>
            )}

            {newImagePreviews.length > 0 && (
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5, mb: 2 }}>
                {newImagePreviews.map((previewUrl, i) => (
                  <Box
                    key={previewUrl}
                    sx={{ position: "relative", width: 80, height: 80 }}
                  >
                    <Box
                      component="img"
                      src={previewUrl}
                      alt={`new-${i}`}
                      sx={{
                        width: 80,
                        height: 80,
                        borderRadius: 2,
                        objectFit: "cover",
                        border: `2px dashed ${colors.primary}`,
                      }}
                    />
                    <button
                      onClick={() => removeNewImage(i)}
                      style={{
                        position: "absolute",
                        top: -6,
                        right: -6,
                        width: 20,
                        height: 20,
                        borderRadius: "50%",
                        background: colors.error,
                        border: "none",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#fff",
                        padding: 0,
                      }}
                    >
                      <X size={11} />
                    </button>
                  </Box>
                ))}
              </Box>
            )}

            <Box
              onClick={() => fileInputRef.current?.click()}
              sx={{
                border: `2px dashed ${colors.border}`,
                borderRadius: 2,
                p: 3,
                textAlign: "center",
                cursor: "pointer",
                transition: "all 0.15s",
                "&:hover": {
                  borderColor: colors.primary,
                  bgcolor: colors.primaryBg,
                },
              }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                handleImageFiles(e.dataTransfer.files);
              }}
            >
              <Upload
                size={24}
                style={{
                  color: colors.textMuted,
                  margin: "0 auto 8px",
                  display: "block",
                }}
              />
              <p
                style={{
                  margin: 0,
                  fontSize: "0.85rem",
                  color: colors.textSecondary,
                  fontWeight: 500,
                }}
              >
                Click or drag & drop images here
              </p>
              <p
                style={{
                  margin: "4px 0 0",
                  fontSize: "0.75rem",
                  color: colors.textMuted,
                }}
              >
                PNG, JPG, WEBP — multiple files supported
              </p>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*"
                hidden
                onChange={(e) => handleImageFiles(e.target.files)}
              />
            </Box>

            {form.existingImages.length > 1 && (
              <Box sx={{ mt: 2 }}>
                <p
                  style={{
                    fontSize: "0.75rem",
                    color: colors.textSecondary,
                    fontWeight: 600,
                    marginBottom: 6,
                  }}
                >
                  Select Thumbnail
                </p>
                <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                  {form.existingImages.map((url) => (
                    <Box
                      key={url}
                      onClick={() => field("thumbnail", url)}
                      sx={{
                        width: 50,
                        height: 50,
                        borderRadius: 2,
                        overflow: "hidden",
                        cursor: "pointer",
                        border: `2px solid ${form.thumbnail === url ? colors.primary : colors.border}`,
                      }}
                    >
                      <Box
                        component="img"
                        src={url}
                        sx={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                        }}
                      />
                    </Box>
                  ))}
                </Box>
              </Box>
            )}
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
                : "Once submitted, the product will be live based on its active status."}{" "}
              The <strong>Cost Price</strong> is only visible to admins.{" "}
              {!isEdit && (
                <strong>
                  If a cost price is set, you'll be prompted to log it as a
                  product expense.
                </strong>
              )}
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
          {saving ? "Saving…" : isEdit ? "Save Changes" : "Create Product"}
        </Button>
      </Box>
    </Box>
  );
}
