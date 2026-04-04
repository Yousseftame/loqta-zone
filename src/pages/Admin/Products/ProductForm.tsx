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
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import {
  colors,
  DEFAULT_FORM_DATA,
  type ProductFormData,
} from "./products-data";
import { useProducts } from "@/store/AdminContext/ProductContext/ProductsCotnext";
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

export default function ProductForm() {
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();
  const isEdit = Boolean(id);
  const { getProduct, addProduct, editProduct } = useProducts();
  const { categories } = useCategories();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<ProductFormData>(DEFAULT_FORM_DATA);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [loadingProduct, setLoadingProduct] = useState(isEdit);
  const [newFeature, setNewFeature] = useState("");
  const [originalImages, setOriginalImages] = useState<string[]>([]);
  const [newImagePreviews, setNewImagePreviews] = useState<string[]>([]);

  const activeCategories = categories.filter((c) => c.isActive);

  useEffect(() => {
    if (!isEdit || !id) return;
    (async () => {
      setLoadingProduct(true);
      const p = await getProduct(id);
      if (p) {
        setOriginalImages(p.images);
        setForm({
          title: p.title,
          brand: p.brand,
          model: p.model,
          category: p.category,
          description: p.description,
          price: String(p.price),
          actualPrice: String(p.actualPrice ?? ""),
          quantity: String(p.quantity),
          isActive: p.isActive,
          features: p.features,
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
    const v = newFeature.trim();
    if (!v) return;
    field("features", [...form.features, v]);
    setNewFeature("");
  };

  const removeFeature = (i: number) =>
    field(
      "features",
      form.features.filter((_, idx) => idx !== i),
    );

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
    if (!form.title.trim()) e.title = "Title is required";
    if (!form.brand.trim()) e.brand = "Brand is required";
    if (!form.model.trim()) e.model = "Model is required";
    if (!form.category.trim()) e.category = "Category is required";
    if (!form.description.trim()) e.description = "Description is required";

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
        // Edit path — just navigate back, no expense prompt
        await editProduct(id, form, originalImages);
        navigate("/admin/Products");
      } else {
        // Add path — after success, navigate to ProductsList with prefill state
        // so AddTransactionModal opens automatically
        await addProduct(form);

        const costPrice = Number(form.actualPrice.trim());
        if (costPrice > 0) {
          // Pass the prefill data via location state; ProductsList reads it on mount
          navigate("/admin/Products", {
            state: {
              openExpenseModal: true,
              expensePrefill: {
                type: "expense" as const,
                amount: String(costPrice),
                method: "cash" as const,
                category: "products" as const,
                note: `Cost price for product: ${form.title.trim()}`,
              },
            },
          });
        } else {
          navigate("/admin/Products");
        }
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
          {/* Row 1 — Title + Brand */}
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
              gap: 2.5,
            }}
          >
            <TextField
              label="Title *"
              size="small"
              fullWidth
              value={form.title}
              onChange={(e) => field("title", e.target.value)}
              error={!!errors.title}
              helperText={errors.title}
              sx={inputSx}
            />
            <TextField
              label="Brand *"
              size="small"
              fullWidth
              value={form.brand}
              onChange={(e) => field("brand", e.target.value)}
              error={!!errors.brand}
              helperText={errors.brand}
              sx={inputSx}
            />
          </Box>

          {/* Row 2 — Model + Category */}
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
              gap: 2.5,
            }}
          >
            <TextField
              label="Model *"
              size="small"
              fullWidth
              value={form.model}
              onChange={(e) => field("model", e.target.value)}
              error={!!errors.model}
              helperText={errors.model}
              sx={inputSx}
            />

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
              {activeCategories.length === 0 && (
                <FormHelperText sx={{ color: colors.warning }}>
                  No active categories.{" "}
                  <span
                    onClick={() => navigate("/admin/categories/add")}
                    style={{
                      cursor: "pointer",
                      textDecoration: "underline",
                      color: colors.primary,
                    }}
                  >
                    Add one first.
                  </span>
                </FormHelperText>
              )}
            </FormControl>
          </Box>

          {/* Row 3 — Starting Price + Cost Price */}
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
                "Price you paid · will prompt an expense entry"
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

          {/* Row 4 — Quantity */}
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

          {/* Row 5 — isActive toggle */}
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

          {/* Features */}
          <Box>
            <p
              style={{
                fontSize: "0.75rem",
                color: colors.textSecondary,
                fontWeight: 600,
                marginBottom: 8,
              }}
            >
              Features
            </p>
            <Box sx={{ display: "flex", gap: 1, mb: 1.5 }}>
              <TextField
                size="small"
                fullWidth
                placeholder="Add a feature…"
                value={newFeature}
                onChange={(e) => setNewFeature(e.target.value)}
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
              {form.features.map((f, i) => (
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

          {/* Images */}
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
                ? "Any changes you make here will be saved and reflected immediately across the platform."
                : "Once you submit, the product will be live and visible based on its active status."}{" "}
              The <strong>Cost Price</strong> is only visible to admins and will
              never be shown to users.{" "}
              {!isEdit && (
                <strong>
                  If a cost price is set, you'll be prompted to log it as a
                  product expense automatically.
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
