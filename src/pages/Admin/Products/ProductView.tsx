import { useEffect, useState } from "react";
import {
  Button,
  Paper,
  Box,
  Chip,
  Avatar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
} from "@mui/material";
import {
  ArrowLeft,
  Edit,
  Trash2,
  Package,
  DollarSign,
  Layers,
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Check,
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import {
  colors,
  getStatusStyle,
  getAvatarColor,
  type ProductStatus,
} from "./products-data";
import type { Product } from "./products-data";
import { useProducts } from "@/store/AdminContext/ProductContext/ProductsCotnext";

const statusIcon = (s: ProductStatus) =>
  s === "published" ? (
    <CheckCircle2 size={14} />
  ) : s === "archived" ? (
    <XCircle size={14} />
  ) : (
    <Clock size={14} />
  );

export default function ProductView() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { getProduct, removeProduct } = useProducts();

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [done, setDone] = useState(false);
  const [activeImg, setActiveImg] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);
      const p = await getProduct(id);
      setProduct(p);
      setActiveImg(p?.thumbnail ?? p?.images?.[0] ?? null);
      setLoading(false);
    })();
  }, [id, getProduct]);

  const handleDelete = async () => {
    if (!product) return;
    setDeleting(true);
    try {
      await removeProduct(product);
      setDone(true);
      setTimeout(() => navigate("/admin/Products"), 700);
    } catch {
      setDeleting(false);
    }
  };

  if (loading) {
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

  if (!product) {
    return (
      <Box sx={{ p: 4, textAlign: "center" }}>
        <p style={{ color: colors.textSecondary }}>Product not found.</p>
        <Button
          onClick={() => navigate("/admin/Products")}
          variant="contained"
          sx={{ mt: 2, bgcolor: colors.primary }}
        >
          Back
        </Button>
      </Box>
    );
  }

  const sStyle = getStatusStyle(product.status);
  const inventoryValue = (product.price * product.availableQuantity).toFixed(2);

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

      {/* ── Hero Card ── */}
      <Paper
        elevation={0}
        sx={{
          borderRadius: 3,
          border: `1px solid ${colors.border}`,
          overflow: "hidden",
          mb: 3,
        }}
      >
        <Box
          sx={{
            background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.primaryLight} 100%)`,
            p: { xs: 3, md: 4 },
            display: "flex",
            flexDirection: { xs: "column", sm: "row" },
            alignItems: { sm: "center" },
            gap: 3,
          }}
        >
          {/* Thumbnail or Avatar */}
          {activeImg && activeImg !== "null" ? (
            <Box
              component="img"
              src={activeImg}
              alt={product.title}
              sx={{
                width: { xs: 60, md: 80 },
                height: { xs: 60, md: 80 },
                borderRadius: 3,
                objectFit: "cover",
                border: "2px solid rgba(255,255,255,0.4)",
                flexShrink: 0,
              }}
            />
          ) : (
            <Avatar
              sx={{
                bgcolor: "rgba(255,255,255,0.25)",
                width: { xs: 60, md: 72 },
                height: { xs: 60, md: 72 },
                fontSize: "2rem",
                fontWeight: 700,
                borderRadius: 3,
                border: "2px solid rgba(255,255,255,0.4)",
              }}
            >
              {product.title.charAt(0)}
            </Avatar>
          )}

          <Box sx={{ flex: 1 }}>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1.5,
                flexWrap: "wrap",
                mb: 0.5,
              }}
            >
              <h1
                style={{
                  margin: 0,
                  color: "#fff",
                  fontSize: "1.4rem",
                  fontWeight: 700,
                }}
              >
                {product.title}
              </h1>
              <Chip
                icon={statusIcon(product.status)}
                label={product.status}
                size="small"
                sx={{
                  bgcolor: "rgba(255,255,255,0.25)",
                  color: "#fff",
                  fontWeight: 700,
                  fontSize: "0.7rem",
                  textTransform: "capitalize",
                  "& .MuiChip-icon": { color: "#fff" },
                }}
              />
            </Box>
            <p
              style={{
                margin: 0,
                color: "rgba(255,255,255,0.75)",
                fontSize: "0.875rem",
              }}
            >
              {product.description}
            </p>
            <Box sx={{ display: "flex", gap: 1, mt: 1.5, flexWrap: "wrap" }}>
              {[
                `Brand: ${product.brand}`,
                `Model: ${product.model}`,
                `Category: ${product.category}`,
              ].map((tag) => (
                <span
                  key={tag}
                  style={{
                    fontSize: "0.75rem",
                    background: "rgba(255,255,255,0.2)",
                    color: "#fff",
                    padding: "3px 10px",
                    borderRadius: 99,
                    fontWeight: 600,
                  }}
                >
                  {tag}
                </span>
              ))}
            </Box>
          </Box>

          {/* Actions */}
          <Box sx={{ display: "flex", gap: 1.5, flexShrink: 0 }}>
            <Button
              startIcon={<Edit size={16} />}
              onClick={() => navigate(`/admin/products/${product.id}/edit`)}
              variant="contained"
              sx={{
                bgcolor: "rgba(255,255,255,0.2)",
                color: "#fff",
                textTransform: "none",
                borderRadius: 2,
                fontWeight: 600,
                border: "1px solid rgba(255,255,255,0.35)",
                "&:hover": { bgcolor: "rgba(255,255,255,0.3)" },
              }}
            >
              Edit
            </Button>
            <Button
              startIcon={<Trash2 size={16} />}
              onClick={() => setDeleteDialog(true)}
              variant="contained"
              sx={{
                bgcolor: "rgba(239,68,68,0.75)",
                color: "#fff",
                textTransform: "none",
                borderRadius: 2,
                fontWeight: 600,
                "&:hover": { bgcolor: "rgba(239,68,68,0.9)" },
              }}
            >
              Delete
            </Button>
          </Box>
        </Box>

        {/* Stats row */}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr 1fr", sm: "repeat(4, 1fr)" },
            borderTop: `1px solid ${colors.border}`,
          }}
        >
          {[
            {
              label: "Price",
              value: `$${product.price.toFixed(2)}`,
              icon: <DollarSign size={16} />,
              color: colors.primary,
            },
            {
              label: "Available",
              value:
                product.availableQuantity === 0
                  ? "Out of stock"
                  : `${product.availableQuantity} units`,
              icon: <Layers size={16} />,
              color:
                product.availableQuantity === 0
                  ? colors.error
                  : product.availableQuantity < 10
                    ? colors.warning
                    : colors.success,
            },
            {
              label: "Total Qty",
              value: `${product.totalQuantity} units`,
              icon: <Package size={16} />,
              color: "#0EA5E9",
            },
            {
              label: "Inv. Value",
              value: `$${inventoryValue}`,
              icon: <DollarSign size={16} />,
              color: "#7C3AED",
            },
          ].map(({ label, value, icon, color }, i) => (
            <Box
              key={label}
              sx={{
                p: { xs: 2, md: 3 },
                display: "flex",
                alignItems: "center",
                gap: 2,
                borderRight: {
                  xs: i % 2 === 0 ? `1px solid ${colors.border}` : "none",
                  sm: i < 3 ? `1px solid ${colors.border}` : "none",
                },
                borderBottom: {
                  xs: i < 2 ? `1px solid ${colors.border}` : "none",
                  sm: "none",
                },
              }}
            >
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: 2,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  bgcolor: `${color}18`,
                  color,
                }}
              >
                {icon}
              </Box>
              <div>
                <p
                  style={{
                    margin: 0,
                    fontSize: "0.7rem",
                    color: colors.textMuted,
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  {label}
                </p>
                <p
                  style={{
                    margin: "2px 0 0",
                    fontWeight: 700,
                    color: colors.textPrimary,
                    fontSize: "0.95rem",
                  }}
                >
                  {value}
                </p>
              </div>
            </Box>
          ))}
        </Box>
      </Paper>

      {/* ── Images Gallery ── */}
      {product.images.length > 0 && (
        <Paper
          elevation={0}
          sx={{
            borderRadius: 3,
            border: `1px solid ${colors.border}`,
            overflow: "hidden",
            mb: 3,
          }}
        >
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
            <Package size={18} style={{ color: colors.primary }} />
            <span style={{ fontWeight: 700, color: colors.textPrimary }}>
              Product Images
            </span>
          </Box>
          <Box sx={{ p: 3 }}>
            {activeImg && activeImg !== "null" && (
              <Box
                component="img"
                src={activeImg}
                alt="active"
                sx={{
                  width: "100%",
                  maxHeight: 320,
                  objectFit: "contain",
                  borderRadius: 2,
                  border: `1px solid ${colors.border}`,
                  mb: 2,
                  bgcolor: colors.muted,
                }}
              />
            )}
            <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap" }}>
              {product.images.map((url) => (
                <Box
                  key={url}
                  onClick={() => setActiveImg(url)}
                  sx={{
                    width: 64,
                    height: 64,
                    borderRadius: 2,
                    overflow: "hidden",
                    cursor: "pointer",
                    border: `2px solid ${activeImg === url ? colors.primary : colors.border}`,
                    transition: "border 0.15s",
                  }}
                >
                  <Box
                    component="img"
                    src={url}
                    alt="thumb"
                    sx={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                </Box>
              ))}
            </Box>
          </Box>
        </Paper>
      )}

      {/* ── Details Card ── */}
      <Paper
        elevation={0}
        sx={{
          borderRadius: 3,
          border: `1px solid ${colors.border}`,
          overflow: "hidden",
        }}
      >
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
          <Package size={18} style={{ color: colors.primary }} />
          <span style={{ fontWeight: 700, color: colors.textPrimary }}>
            Product Details
          </span>
        </Box>
        <Box
          sx={{
            p: { xs: 2, md: 3 },
            display: "grid",
            gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
            gap: 3,
          }}
        >
          {[
            {
              label: "Status",
              value: (
                <Chip
                  icon={statusIcon(product.status)}
                  label={product.status}
                  size="small"
                  sx={{
                    bgcolor: sStyle.bg,
                    color: sStyle.color,
                    fontWeight: 700,
                    textTransform: "capitalize",
                  }}
                />
              ),
            },
            {
              label: "Active",
              value: (
                <Chip
                  label={product.isActive ? "Active" : "Inactive"}
                  size="small"
                  sx={{
                    bgcolor: product.isActive ? "#DCFCE7" : "#FEE2E2",
                    color: product.isActive ? "#22C55E" : "#EF4444",
                    fontWeight: 700,
                  }}
                />
              ),
            },
            {
              label: "Category",
              value: (
                <span
                  style={{
                    fontSize: "0.875rem",
                    color: colors.textPrimary,
                    fontWeight: 600,
                  }}
                >
                  {product.category}
                </span>
              ),
            },
            {
              label: "Date Added",
              value: (
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Calendar size={14} style={{ color: colors.textMuted }} />
                  <span
                    style={{
                      fontSize: "0.9rem",
                      color: colors.textPrimary,
                      fontWeight: 500,
                    }}
                  >
                    {product.createdAt.toLocaleDateString()}
                  </span>
                </Box>
              ),
            },
          ].map(({ label, value }) => (
            <Box key={label}>
              <p
                style={{
                  margin: "0 0 8px",
                  fontSize: "0.75rem",
                  color: colors.textMuted,
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                }}
              >
                {label}
              </p>
              {value}
            </Box>
          ))}

          {/* Features */}
          {product.features.length > 0 && (
            <Box>
              <p
                style={{
                  margin: "0 0 8px",
                  fontSize: "0.75rem",
                  color: colors.textMuted,
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                }}
              >
                Features
              </p>
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                {product.features.map((f, i) => (
                  <span
                    key={i}
                    style={{
                      fontSize: "0.78rem",
                      background: colors.primaryBg,
                      color: colors.primary,
                      padding: "3px 10px",
                      borderRadius: 99,
                      fontWeight: 600,
                    }}
                  >
                    {f}
                  </span>
                ))}
              </Box>
            </Box>
          )}

          {/* Description */}
          <Box sx={{ gridColumn: { sm: "1 / -1" } }}>
            <p
              style={{
                margin: "0 0 8px",
                fontSize: "0.75rem",
                color: colors.textMuted,
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.04em",
              }}
            >
              Description
            </p>
            <Box sx={{ bgcolor: colors.muted, borderRadius: 2, p: 2 }}>
              <p
                style={{
                  margin: 0,
                  fontSize: "0.9rem",
                  color: colors.textSecondary,
                  lineHeight: 1.6,
                }}
              >
                {product.description}
              </p>
            </Box>
          </Box>
        </Box>
      </Paper>

      {/* ── Delete Dialog ── */}
      <Dialog
        open={deleteDialog}
        onClose={() => !deleting && setDeleteDialog(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1.5,
            color: colors.error,
          }}
        >
          <AlertTriangle size={22} /> Confirm Deletion
        </DialogTitle>
        <DialogContent>
          <p style={{ color: colors.textPrimary, marginBottom: 16 }}>
            Are you sure you want to delete <strong>{product.title}</strong>?
            All images in Storage will also be permanently removed.
          </p>
          <Box
            sx={{
              bgcolor: colors.errorBg,
              border: `1px solid ${colors.error}`,
              borderRadius: 2,
              p: 2,
            }}
          >
            <p style={{ fontSize: "0.875rem", color: colors.error, margin: 0 }}>
              <strong>Warning:</strong> This action cannot be undone.
            </p>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3, gap: 1 }}>
          <Button
            onClick={() => setDeleteDialog(false)}
            disabled={deleting}
            variant="outlined"
            sx={{
              textTransform: "none",
              borderColor: colors.border,
              color: colors.textPrimary,
              borderRadius: 2,
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleDelete}
            disabled={deleting || done}
            variant="contained"
            startIcon={
              deleting ? (
                <CircularProgress size={14} color="inherit" />
              ) : done ? (
                <Check size={16} />
              ) : (
                <Trash2 size={16} />
              )
            }
            sx={{
              textTransform: "none",
              bgcolor: colors.error,
              "&:hover": { bgcolor: "#DC2626" },
              borderRadius: 2,
              minWidth: 110,
            }}
          >
            {done ? "Deleted!" : deleting ? "Deleting…" : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
