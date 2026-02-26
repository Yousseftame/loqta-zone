import { useEffect, useState } from "react";
import {
  Button,
  Paper,
  Box,
  Chip,
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
  Tag,
  Calendar,
  AlertTriangle,
  Check,
  Globe,
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { colors } from "./Categories-data";
import type { Category } from "./Categories-data";
import { useCategories } from "@/store/AdminContext/CategoryContext/CategoryContext";

export default function CategoryView() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { getCategory, removeCategory } = useCategories();

  const [category, setCategory] = useState<Category | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);
      const c = await getCategory(id);
      setCategory(c);
      setLoading(false);
    })();
  }, [id, getCategory]);

  const handleDelete = async () => {
    if (!category) return;
    setDeleting(true);
    try {
      await removeCategory(category.id);
      setDone(true);
      setTimeout(() => navigate("/admin/categories"), 700);
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

  if (!category) {
    return (
      <Box sx={{ p: 4, textAlign: "center" }}>
        <p style={{ color: colors.textSecondary }}>Category not found.</p>
        <Button
          onClick={() => navigate("/admin/categories")}
          variant="contained"
          sx={{ mt: 2, bgcolor: colors.primary }}
        >
          Back
        </Button>
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
          {/* Icon */}
          <Box
            sx={{
              width: { xs: 56, md: 72 },
              height: { xs: 56, md: 72 },
              borderRadius: 3,
              bgcolor: "rgba(255,255,255,0.2)",
              border: "2px solid rgba(255,255,255,0.4)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Tag size={32} color="#fff" />
          </Box>

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
                {category.name.en}
              </h1>
              <Chip
                label={category.isActive ? "Active" : "Inactive"}
                size="small"
                sx={{
                  bgcolor: "rgba(255,255,255,0.25)",
                  color: "#fff",
                  fontWeight: 700,
                  fontSize: "0.7rem",
                }}
              />
            </Box>
            <p
              style={{
                margin: 0,
                color: "rgba(255,255,255,0.8)",
                fontSize: "1rem",
                direction: "rtl",
                textAlign: "left",
              }}
            >
              {category.name.ar}
            </p>
          </Box>

          <Box sx={{ display: "flex", gap: 1.5, flexShrink: 0 }}>
            <Button
              startIcon={<Edit size={16} />}
              onClick={() => navigate(`/admin/categories/${category.id}/edit`)}
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
          <Tag size={18} style={{ color: colors.primary }} />
          <span style={{ fontWeight: 700, color: colors.textPrimary }}>
            Category Details
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
          {/* Name row */}
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
              gap: 3,
            }}
          >
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
                Name (English)
              </p>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Globe size={14} style={{ color: colors.textMuted }} />
                <span
                  style={{
                    fontSize: "1rem",
                    fontWeight: 700,
                    color: colors.textPrimary,
                  }}
                >
                  {category.name.en}
                </span>
              </Box>
            </Box>
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
                Name (Arabic)
              </p>
              <span
                style={{
                  fontSize: "1rem",
                  fontWeight: 700,
                  color: colors.textPrimary,
                  direction: "rtl",
                  display: "block",
                }}
              >
                {category.name.ar}
              </span>
            </Box>
          </Box>

          {/* Description row */}
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
              gap: 3,
            }}
          >
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
                Description (English)
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
                  {category.description.en}
                </p>
              </Box>
            </Box>
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
                Description (Arabic)
              </p>
              <Box sx={{ bgcolor: colors.muted, borderRadius: 2, p: 2 }}>
                <p
                  style={{
                    margin: 0,
                    fontSize: "0.9rem",
                    color: colors.textSecondary,
                    lineHeight: 1.6,
                    direction: "rtl",
                    textAlign: "right",
                  }}
                >
                  {category.description.ar}
                </p>
              </Box>
            </Box>
          </Box>

          {/* Meta row */}
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr 1fr" },
              gap: 3,
              pt: 1,
              borderTop: `1px solid ${colors.border}`,
            }}
          >
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
                label={category.isActive ? "Active" : "Inactive"}
                size="small"
                sx={{
                  bgcolor: category.isActive ? "#DCFCE7" : "#FEE2E2",
                  color: category.isActive ? "#22C55E" : "#EF4444",
                  fontWeight: 700,
                }}
              />
            </Box>
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
                Date Created
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
                  {category.createdAt.toLocaleDateString()}
                </span>
              </Box>
            </Box>
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
                Last Updated
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
                  {category.updatedAt.toLocaleDateString()}
                </span>
              </Box>
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
            Are you sure you want to delete <strong>{category.name.en}</strong>?
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
              <strong>Warning:</strong> This action cannot be undone. Products
              using this category will not be automatically updated.
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
