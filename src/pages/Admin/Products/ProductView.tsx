import { useState } from "react";
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
} from "@mui/material";
import {
  ArrowLeft,
  Edit,
  Trash2,
  Package,
  Tag,
  DollarSign,
  Layers,
  Star,
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Check,
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import {
  STATIC_PRODUCTS,
 type ProductStatus,
  colors,
  getCategoryColor,
  getStatusStyle,
  getAvatarColor,
} from "./products-data";

const statusIcon = (s: ProductStatus) =>
  s === "active" ? (
    <CheckCircle2 size={14} />
  ) : s === "inactive" ? (
    <XCircle size={14} />
  ) : (
    <Clock size={14} />
  );

export default function ProductView() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const product =
    STATIC_PRODUCTS.find((p) => p.id === id) ?? STATIC_PRODUCTS[0];

  const [deleteDialog, setDeleteDialog] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleDelete = async () => {
    setLoading(true);
    await new Promise((r) => setTimeout(r, 700));
    setLoading(false);
    setDone(true);
    setTimeout(() => navigate("/admin/Products"), 700);
  };

  const sStyle = getStatusStyle(product.status);
  const catColor = getCategoryColor(product.category);
  const avatarBg = getAvatarColor(product.name);
  const inventoryValue = (product.price * product.stock).toFixed(2);

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
      {/* ── Back ── */}
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
        {/* #2A4863 gradient header */}
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
            {product.name.charAt(0)}
          </Avatar>

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
                {product.name}
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
              <span
                style={{
                  fontSize: "0.75rem",
                  background: "rgba(255,255,255,0.2)",
                  color: "#fff",
                  padding: "3px 10px",
                  borderRadius: 99,
                  fontWeight: 600,
                }}
              >
                SKU: {product.sku}
              </span>
              <span
                style={{
                  fontSize: "0.75rem",
                  background: "rgba(255,255,255,0.2)",
                  color: "#fff",
                  padding: "3px 10px",
                  borderRadius: 99,
                }}
              >
                Added {product.createdAt}
              </span>
            </Box>
          </Box>

          {/* Action buttons */}
          <Box
            sx={{
              display: "flex",
              gap: 1.5,
              flexShrink: 0,
              flexDirection: { xs: "row", sm: "row" },
              width: { xs: "100%", sm: "auto" },
              mt: { xs: 1, sm: 0 },
            }}
          >
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
                backdropFilter: "blur(4px)",
                flex: { xs: 1, sm: "none" },
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
                border: "1px solid rgba(239,68,68,0.4)",
                "&:hover": { bgcolor: "rgba(239,68,68,0.9)" },
                flex: { xs: 1, sm: "none" },
              }}
            >
              Delete
            </Button>
          </Box>
        </Box>

        {/* ── Stats row — 4 mini cards in gradient header bottom ── */}
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
              label: "Stock",
              value:
                product.stock === 0 ? "Out of stock" : `${product.stock} units`,
              icon: <Layers size={16} />,
              color:
                product.stock === 0
                  ? colors.error
                  : product.stock < 10
                    ? colors.warning
                    : colors.success,
            },
            {
              label: "Rating",
              value: `★ ${product.rating} / 5.0`,
              icon: <Star size={16} />,
              color: "#F59E0B",
            },
            {
              label: "Inv. Value",
              value: `$${inventoryValue}`,
              icon: <Tag size={16} />,
              color: "#0EA5E9",
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
          {/* Category */}
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
              Category
            </p>
            <Chip
              label={product.category}
              size="small"
              sx={{
                bgcolor: catColor.bg,
                color: catColor.text,
                fontWeight: 600,
              }}
            />
          </Box>

          {/* Status */}
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
              Status
            </p>
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
          </Box>

          {/* SKU */}
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
              SKU
            </p>
            <span
              style={{
                fontFamily: "monospace",
                fontSize: "0.9rem",
                background: colors.muted,
                padding: "4px 10px",
                borderRadius: 6,
                color: colors.textSecondary,
              }}
            >
              {product.sku}
            </span>
          </Box>

          {/* Date Added */}
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
              Date Added
            </p>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Calendar size={14} style={{ color: colors.textMuted }} />
              <span
                style={{
                  fontSize: "0.9rem",
                  color: colors.textPrimary,
                  fontWeight: 500,
                }}
              >
                {product.createdAt}
              </span>
            </Box>
          </Box>

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
        onClose={() => !loading && setDeleteDialog(false)}
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
            Are you sure you want to delete <strong>{product.name}</strong>?
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
            disabled={loading}
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
            disabled={loading || done}
            variant="contained"
            startIcon={loading || done ? null : <Trash2 size={16} />}
            sx={{
              textTransform: "none",
              bgcolor: colors.error,
              "&:hover": { bgcolor: "#DC2626" },
              borderRadius: 2,
              minWidth: 110,
            }}
          >
            {done ? <Check size={16} /> : loading ? "Deleting…" : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
