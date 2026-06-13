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
  Truck,
  AlertTriangle,
  Check,
  Phone,
  Mail,
  MapPin,
  User,
  Calendar,
  FileText,
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { useSuppliers } from "@/store/AdminContext/SupplierContext/SupplierContext";
import { usePermissions } from "@/permissions/usePermissions";
import type { Supplier } from "./suppliers-data";

const colors = {
  primary: "#2A4863",
  primaryLight: "#3D6A8A",
  primaryBg: "#EFF6FF",
  primaryRing: "#DBEAFE",
  primaryDark: "#1E40AF",
  success: "#22C55E",
  successBg: "#DCFCE7",
  error: "#EF4444",
  errorBg: "#FEE2E2",
  border: "#E2E8F0",
  muted: "#F8FAFC",
  textPrimary: "#0F172A",
  textSecondary: "#64748B",
  textMuted: "#94A3B8",
};

export default function SupplierView() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { getSupplier, removeSupplier } = useSuppliers();
  const { can } = usePermissions();

  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);
      const s = await getSupplier(id);
      setSupplier(s);
      setLoading(false);
    })();
  }, [id, getSupplier]);

  const handleDelete = async () => {
    if (!supplier) return;
    setDeleting(true);
    try {
      await removeSupplier(supplier.id);
      setDone(true);
      setTimeout(() => navigate("/admin/suppliers"), 700);
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

  if (!supplier) {
    return (
      <Box sx={{ p: 4, textAlign: "center" }}>
        <p style={{ color: colors.textSecondary }}>Supplier not found.</p>
        <Button
          onClick={() => navigate("/admin/suppliers")}
          variant="contained"
          sx={{ mt: 2, bgcolor: colors.primary }}
        >
          Back
        </Button>
      </Box>
    );
  }

  const detailRows = [
    {
      label: "Contact Person",
      value: supplier.contactPerson || "—",
      icon: <User size={14} />,
    },
    { label: "Email", value: supplier.email || "—", icon: <Mail size={14} /> },
    { label: "Phone", value: supplier.phone || "—", icon: <Phone size={14} /> },
    {
      label: "Address",
      value: supplier.address || "—",
      icon: <MapPin size={14} />,
    },
    {
      label: "Date Added",
      value: supplier.createdAt.toLocaleDateString(),
      icon: <Calendar size={14} />,
    },
  ];

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
        onClick={() => navigate("/admin/suppliers")}
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
        Back to Suppliers
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
          {/* Icon avatar */}
          <Box
            sx={{
              width: 72,
              height: 72,
              borderRadius: 3,
              bgcolor: "rgba(255,255,255,0.2)",
              border: "2px solid rgba(255,255,255,0.4)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Truck size={32} color="#fff" />
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
                {supplier.name}
              </h1>
              <Chip
                label={supplier.isActive ? "Active" : "Inactive"}
                size="small"
                sx={{
                  bgcolor: "rgba(255,255,255,0.25)",
                  color: "#fff",
                  fontWeight: 700,
                  fontSize: "0.7rem",
                }}
              />
            </Box>
            {supplier.address && (
              <p
                style={{
                  margin: 0,
                  color: "rgba(255,255,255,0.75)",
                  fontSize: "0.875rem",
                }}
              >
                {supplier.address}
              </p>
            )}
          </Box>

          <Box sx={{ display: "flex", gap: 1.5, flexShrink: 0 }}>
            {can("suppliers", "update") && (
              <Button
                startIcon={<Edit size={16} />}
                onClick={() => navigate(`/admin/suppliers/${supplier.id}/edit`)}
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
            )}
            {can("suppliers", "delete") && (
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
            )}
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
          <Truck size={18} style={{ color: colors.primary }} />
          <span style={{ fontWeight: 700, color: colors.textPrimary }}>
            Supplier Details
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
          {/* Active status */}
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
              label={supplier.isActive ? "Active" : "Inactive"}
              size="small"
              sx={{
                bgcolor: supplier.isActive ? colors.successBg : colors.errorBg,
                color: supplier.isActive ? colors.success : colors.error,
                fontWeight: 700,
              }}
            />
          </Box>

          {/* Detail rows */}
          {detailRows.map(({ label, value, icon }) => (
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
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <span style={{ color: colors.textMuted, flexShrink: 0 }}>
                  {icon}
                </span>
                <span
                  style={{
                    fontSize: "0.9rem",
                    color: colors.textPrimary,
                    fontWeight: 500,
                  }}
                >
                  {value}
                </span>
              </Box>
            </Box>
          ))}

          {/* Notes — full width */}
          {supplier.notes && (
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
                Notes
              </p>
              <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1 }}>
                <FileText
                  size={14}
                  style={{
                    color: colors.textMuted,
                    marginTop: 2,
                    flexShrink: 0,
                  }}
                />
                <Box
                  sx={{ bgcolor: colors.muted, borderRadius: 2, p: 2, flex: 1 }}
                >
                  <p
                    style={{
                      margin: 0,
                      fontSize: "0.9rem",
                      color: colors.textSecondary,
                      lineHeight: 1.6,
                    }}
                  >
                    {supplier.notes}
                  </p>
                </Box>
              </Box>
            </Box>
          )}
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
            Are you sure you want to delete <strong>{supplier.name}</strong>?
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
              linked to this supplier will keep the supplier ID but the name
              will no longer resolve.
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
