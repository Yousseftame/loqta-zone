import { useEffect, useState, useRef } from "react";
import {
  TextField,
  Button,
  Paper,
  Box,
  Switch,
  FormControlLabel,
  CircularProgress,
} from "@mui/material";
import {
  ArrowLeft,
  Save,
  Package,
  Info,
  Plus,
  X,
  Upload,
  Image,
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import {
  colors,
  STATUSES,
  DEFAULT_FORM_DATA,
  type ProductStatus,
  type ProductFormData,
  getStatusStyle,
} from "./products-data";
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

export default function ProductForm() {
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();
  const isEdit = Boolean(id);
  const { getProduct, addProduct, editProduct } = useProducts();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<ProductFormData>(DEFAULT_FORM_DATA);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [loadingProduct, setLoadingProduct] = useState(isEdit);
  const [newFeature, setNewFeature] = useState("");
  const [originalImages, setOriginalImages] = useState<string[]>([]);

  // ── Pre-fill on edit ────────────────────────────────────────────────────────
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
          availableQuantity: String(p.availableQuantity),
          totalQuantity: String(p.totalQuantity),
          status: p.status,
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

  // ── Features ───────────────────────────────────────────────────────────────
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

  // ── Images ─────────────────────────────────────────────────────────────────
  const handleImageFiles = (files: FileList | null) => {
    if (!files) return;
    field("newImages", [...form.newImages, ...Array.from(files)]);
  };

  const removeNewImage = (i: number) =>
    field(
      "newImages",
      form.newImages.filter((_, idx) => idx !== i),
    );

  const removeExistingImage = (url: string) =>
    field(
      "existingImages",
      form.existingImages.filter((u) => u !== url),
    );

  // ── Validation ─────────────────────────────────────────────────────────────
  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.title.trim()) e.title = "Title is required";
    if (!form.brand.trim()) e.brand = "Brand is required";
    if (!form.model.trim()) e.model = "Model is required";
    if (!form.category.trim()) e.category = "Category is required";
    if (!form.description.trim()) e.description = "Description is required";
    if (!form.price || isNaN(Number(form.price)) || Number(form.price) < 0)
      e.price = "Enter a valid price";
    if (
      !form.availableQuantity ||
      isNaN(Number(form.availableQuantity)) ||
      Number(form.availableQuantity) < 0
    )
      e.availableQuantity = "Enter a valid available quantity";
    if (
      !form.totalQuantity ||
      isNaN(Number(form.totalQuantity)) ||
      Number(form.totalQuantity) < 0
    )
      e.totalQuantity = "Enter a valid total quantity";
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
        await editProduct(id, form, originalImages);
      } else {
        await addProduct(form);
      }
      navigate("/admin/Products");
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
        maxWidth: 900,
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
            <TextField
              label="Category *"
              size="small"
              fullWidth
              value={form.category}
              onChange={(e) => field("category", e.target.value)}
              error={!!errors.category}
              helperText={errors.category}
              sx={inputSx}
              placeholder="e.g. Electronics"
            />
          </Box>

          {/* Row 3 — Price + Available Qty + Total Qty */}
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", sm: "repeat(3,1fr)" },
              gap: 2.5,
            }}
          >
            <TextField
              label="Price *"
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
              label="Available Qty *"
              size="small"
              type="number"
              fullWidth
              value={form.availableQuantity}
              onChange={(e) => field("availableQuantity", e.target.value)}
              error={!!errors.availableQuantity}
              helperText={errors.availableQuantity}
              sx={inputSx}
            />
            <TextField
              label="Total Qty *"
              size="small"
              type="number"
              fullWidth
              value={form.totalQuantity}
              onChange={(e) => field("totalQuantity", e.target.value)}
              error={!!errors.totalQuantity}
              helperText={errors.totalQuantity}
              sx={inputSx}
            />
          </Box>

          {/* Row 4 — Status + isActive */}
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
              gap: 2.5,
            }}
          >
            {/* Status pills */}
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
            {/* isActive toggle */}
            <Box sx={{ display: "flex", alignItems: "center" }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={form.isActive}
                    onChange={(e) => field("isActive", e.target.checked)}
                    sx={{
                      "& .MuiSwitch-switchBase.Mui-checked": {
                        color: colors.primary,
                      },
                      "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track":
                        { bgcolor: colors.primary },
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

          {/* Images upload */}
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

            {/* Existing images */}
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

            {/* New images previews */}
            {form.newImages.length > 0 && (
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5, mb: 2 }}>
                {form.newImages.map((file, i) => (
                  <Box
                    key={i}
                    sx={{ position: "relative", width: 80, height: 80 }}
                  >
                    <Box
                      component="img"
                      src={URL.createObjectURL(file)}
                      alt={file.name}
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

            {/* Drop zone */}
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

            {/* Thumbnail selector */}
            {(form.existingImages.length > 0 || form.newImages.length > 0) &&
              form.existingImages.length > 1 && (
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
                ? "Changes will be saved to Firestore immediately."
                : "The product will be created in Firestore and images uploaded to Firebase Storage."}
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
