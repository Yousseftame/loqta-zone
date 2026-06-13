import { useEffect, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Button,
  TextField,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TablePagination,
  InputAdornment,
  Paper,
  Box,
  CircularProgress,
  Switch,
} from "@mui/material";
import {
  Plus,
  Search,
  X,
  AlertTriangle,
  Eye,
  Edit,
  Trash2,
  RefreshCw,
  CheckCircle2,
  Truck,
  Users,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useSuppliers } from "@/store/AdminContext/SupplierContext/SupplierContext";
import { usePermissions } from "@/permissions/usePermissions";
import type { Supplier } from "./suppliers-data";

// ── Reuse the same color palette as the rest of the admin panel ───────────────
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

export default function SuppliersList() {
  const navigate = useNavigate();
  const {
    suppliers,
    loading,
    error,
    refreshSuppliers,
    removeSupplier,
    toggleActive,
  } = useSuppliers();
  const { can } = usePermissions();

  const [filtered, setFiltered] = useState<Supplier[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [toDelete, setToDelete] = useState<Supplier | null>(null);
  const [loadingDelete, setLoadingDelete] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // ── Filter ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    let f = suppliers;
    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      f = f.filter(
        (sup) =>
          sup.name.toLowerCase().includes(s) ||
          sup.contactPerson.toLowerCase().includes(s) ||
          sup.email.toLowerCase().includes(s) ||
          sup.phone.toLowerCase().includes(s),
      );
    }
    setFiltered(f);
    setPage(0);
  }, [searchTerm, suppliers]);

  // ── Delete ─────────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!toDelete) return;
    setLoadingDelete(true);
    try {
      await removeSupplier(toDelete.id);
      setDeleteDialog(false);
      setToDelete(null);
    } catch {
      // toast shown in context
    } finally {
      setLoadingDelete(false);
    }
  };

  // ── Toggle active ──────────────────────────────────────────────────────────
  const handleToggle = async (sup: Supplier) => {
    setTogglingId(sup.id);
    try {
      await toggleActive(sup.id, !sup.isActive);
    } finally {
      setTogglingId(null);
    }
  };

  const activeCount = suppliers.filter((s) => s.isActive).length;
  const paginated = filtered.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage,
  );

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

  if (error) {
    return (
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 2,
          minHeight: "60vh",
          justifyContent: "center",
        }}
      >
        <p style={{ color: colors.error }}>{error}</p>
        <Button
          onClick={refreshSuppliers}
          startIcon={<RefreshCw size={16} />}
          variant="contained"
          sx={{ bgcolor: colors.primary }}
        >
          Retry
        </Button>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        mx: "auto",
        p: { xs: 2, md: 3 },
        bgcolor: "#F8FAFC",
        minHeight: "100vh",
      }}
    >
      {/* ── Header ── */}
      <Box
        sx={{
          mb: 4,
          display: "flex",
          flexDirection: { xs: "column", sm: "row" },
          alignItems: { sm: "center" },
          justifyContent: "space-between",
          gap: 2,
        }}
      >
        <div>
          <h1
            style={{
              color: colors.primary,
              margin: 0,
              fontSize: "1.75rem",
              fontWeight: 700,
            }}
          >
            <Truck
              size={28}
              style={{
                display: "inline",
                marginRight: 8,
                verticalAlign: "middle",
              }}
            />
            Suppliers
          </h1>
          <p
            style={{
              color: colors.textSecondary,
              margin: "4px 0 0",
              fontSize: "0.875rem",
            }}
          >
            Manage your product suppliers
          </p>
        </div>
        <Box sx={{ display: "flex", gap: 1 }}>
          <IconButton
            onClick={refreshSuppliers}
            sx={{
              color: colors.primary,
              border: `1px solid ${colors.border}`,
              borderRadius: 2,
            }}
            title="Refresh"
          >
            <RefreshCw size={18} />
          </IconButton>
          {can("suppliers", "create") && (
            <Button
              variant="contained"
              startIcon={<Plus size={18} />}
              onClick={() => navigate("/admin/suppliers/add")}
              sx={{
                bgcolor: colors.primary,
                color: "white",
                textTransform: "none",
                px: 3,
                py: 1.5,
                borderRadius: 2,
                fontWeight: 600,
                boxShadow: "none",
                width: { xs: "100%", sm: "auto" },
                "&:hover": { bgcolor: "#111" },
              }}
            >
              Add Supplier
            </Button>
          )}
        </Box>
      </Box>

      {/* ── Stat Cards ── */}
      <Box
        sx={{
          display: "grid",
          gap: 3,
          gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
          mb: 4,
        }}
      >
        {[
          {
            label: "Total Suppliers",
            value: suppliers.length,
            icon: <Truck size={22} />,
          },
          {
            label: "Active Suppliers",
            value: activeCount,
            icon: <CheckCircle2 size={22} />,
          },
        ].map(({ label, value, icon }) => (
          <Paper
            key={label}
            elevation={0}
            sx={{
              p: { xs: 2, md: 3 },
              borderRadius: 3,
              background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.primaryLight} 100%)`,
              color: "#fff",
            }}
          >
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div>
                <p
                  style={{
                    fontSize: "0.7rem",
                    fontWeight: 600,
                    opacity: 0.8,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    margin: 0,
                  }}
                >
                  {label}
                </p>
                <p
                  style={{
                    fontSize: "2rem",
                    fontWeight: 700,
                    margin: "4px 0 0",
                  }}
                >
                  {value}
                </p>
              </div>
              <Box
                sx={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  background: "rgba(255,255,255,0.2)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {icon}
              </Box>
            </Box>
          </Paper>
        ))}
      </Box>

      {/* ── Search ── */}
      <Paper
        elevation={0}
        sx={{
          p: 3,
          mb: 3,
          borderRadius: 3,
          bgcolor: "#fff",
          border: `1px solid ${colors.border}`,
        }}
      >
        <TextField
          placeholder="Search by name, contact person, email or phone…"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          variant="outlined"
          size="small"
          fullWidth
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search size={16} style={{ color: colors.textMuted }} />
              </InputAdornment>
            ),
            endAdornment: searchTerm && (
              <InputAdornment position="end">
                <IconButton size="small" onClick={() => setSearchTerm("")}>
                  <X size={14} />
                </IconButton>
              </InputAdornment>
            ),
          }}
          sx={{
            "& .MuiOutlinedInput-root": {
              "& fieldset": { borderColor: colors.border },
              "&:hover fieldset": { borderColor: colors.primary },
              "&.Mui-focused fieldset": { borderColor: colors.primary },
            },
          }}
        />
        <p
          style={{
            margin: "8px 0 0",
            fontSize: "0.85rem",
            color: colors.textSecondary,
          }}
        >
          <strong style={{ color: colors.primary }}>{filtered.length}</strong>{" "}
          results
        </p>
      </Paper>

      {/* ── Table ── */}
      <Paper
        elevation={0}
        sx={{
          borderRadius: 3,
          bgcolor: "#fff",
          border: `1px solid ${colors.border}`,
          overflow: "hidden",
        }}
      >
        <Box sx={{ overflowX: "auto", width: "100%" }}>
          <Table sx={{ minWidth: 700 }}>
            <TableHead>
              <TableRow sx={{ bgcolor: colors.primaryBg }}>
                {[
                  "Supplier",
                  "Contact Person",
                  "Email",
                  "Phone",
                  "Active",
                  "Actions",
                ].map((h) => (
                  <TableCell
                    key={h}
                    sx={{
                      fontWeight: 700,
                      color: colors.primaryDark,
                      fontSize: "0.72rem",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      whiteSpace: "nowrap",
                      ...(h === "Actions" && { textAlign: "center" }),
                    }}
                  >
                    {h}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {paginated.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 10 }}>
                    <Truck
                      size={44}
                      style={{
                        color: colors.textMuted,
                        margin: "0 auto 12px",
                        display: "block",
                      }}
                    />
                    <p style={{ color: colors.textSecondary, fontWeight: 600 }}>
                      No suppliers found
                    </p>
                    <p style={{ color: colors.textMuted, fontSize: "0.85rem" }}>
                      {searchTerm
                        ? "Try adjusting your search"
                        : "Add your first supplier to get started"}
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                paginated.map((sup) => (
                  <TableRow
                    key={sup.id}
                    sx={{
                      "&:hover": { bgcolor: colors.muted },
                      transition: "background 0.15s",
                    }}
                  >
                    {/* Supplier name */}
                    <TableCell sx={{ minWidth: 200 }}>
                      <Box
                        sx={{ display: "flex", alignItems: "center", gap: 1.5 }}
                      >
                        <Box
                          sx={{
                            width: 38,
                            height: 38,
                            borderRadius: 2,
                            bgcolor: colors.primaryBg,
                            border: `1px solid ${colors.primaryRing}`,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                          }}
                        >
                          <Truck size={16} style={{ color: colors.primary }} />
                        </Box>
                        <div>
                          <p
                            style={{
                              fontWeight: 600,
                              fontSize: "0.875rem",
                              color: colors.textPrimary,
                              margin: 0,
                            }}
                          >
                            {sup.name}
                          </p>
                          {sup.address && (
                            <p
                              style={{
                                color: colors.textMuted,
                                fontSize: "0.72rem",
                                margin: "2px 0 0",
                                maxWidth: 180,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {sup.address}
                            </p>
                          )}
                        </div>
                      </Box>
                    </TableCell>

                    {/* Contact person */}
                    <TableCell sx={{ minWidth: 150 }}>
                      <Box
                        sx={{ display: "flex", alignItems: "center", gap: 1 }}
                      >
                        <Users
                          size={13}
                          style={{ color: colors.textMuted, flexShrink: 0 }}
                        />
                        <span
                          style={{
                            fontSize: "0.875rem",
                            color: colors.textPrimary,
                          }}
                        >
                          {sup.contactPerson || "—"}
                        </span>
                      </Box>
                    </TableCell>

                    {/* Email */}
                    <TableCell sx={{ minWidth: 180 }}>
                      <span
                        style={{
                          fontSize: "0.85rem",
                          color: colors.textSecondary,
                        }}
                      >
                        {sup.email || "—"}
                      </span>
                    </TableCell>

                    {/* Phone */}
                    <TableCell sx={{ minWidth: 130 }}>
                      <span
                        style={{
                          fontSize: "0.85rem",
                          color: colors.textSecondary,
                        }}
                      >
                        {sup.phone || "—"}
                      </span>
                    </TableCell>

                    {/* Active toggle */}
                    <TableCell sx={{ minWidth: 100 }}>
                      <Box
                        sx={{ display: "flex", alignItems: "center", gap: 1 }}
                      >
                        <Switch
                          checked={sup.isActive}
                          disabled={togglingId === sup.id || !can("suppliers", "update")}
                          onChange={() => handleToggle(sup)}
                          size="small"
                          sx={{
                            "& .MuiSwitch-switchBase.Mui-checked": {
                              color: colors.primary,
                            },
                            "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track":
                              { bgcolor: colors.primary },
                          }}
                        />
                        <Chip
                          label={sup.isActive ? "Active" : "Inactive"}
                          size="small"
                          sx={{
                            bgcolor: sup.isActive
                              ? colors.successBg
                              : colors.errorBg,
                            color: sup.isActive ? colors.success : colors.error,
                            fontWeight: 700,
                            fontSize: "0.7rem",
                          }}
                        />
                      </Box>
                    </TableCell>

                    {/* Actions */}
                    <TableCell align="center" sx={{ minWidth: 110 }}>
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 0.5,
                        }}
                      >
                        {can("suppliers", "read") && (
                          <IconButton
                            size="small"
                            onClick={() => navigate(`/admin/suppliers/${sup.id}`)}
                            sx={{
                              color: colors.primary,
                              "&:hover": { bgcolor: colors.primaryBg },
                              borderRadius: 1.5,
                            }}
                            title="View"
                          >
                            <Eye size={16} />
                          </IconButton>
                        )}
                        {can("suppliers", "update") && (
                          <IconButton
                            size="small"
                            onClick={() =>
                              navigate(`/admin/suppliers/${sup.id}/edit`)
                            }
                            sx={{
                              color: "#7C3AED",
                              "&:hover": { bgcolor: "#F3E8FF" },
                              borderRadius: 1.5,
                            }}
                            title="Edit"
                          >
                            <Edit size={16} />
                          </IconButton>
                        )}
                        {can("suppliers", "delete") && (
                          <IconButton
                            size="small"
                            onClick={() => {
                              setToDelete(sup);
                              setDeleteDialog(true);
                            }}
                            sx={{
                              color: colors.error,
                              "&:hover": { bgcolor: colors.errorBg },
                              borderRadius: 1.5,
                            }}
                            title="Delete"
                          >
                            <Trash2 size={16} />
                          </IconButton>
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Box>
        <TablePagination
          component="div"
          count={filtered.length}
          page={page}
          onPageChange={(_e, p) => setPage(p)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
          rowsPerPageOptions={[5, 10, 25, 50]}
        />
      </Paper>

      {/* ── Delete Dialog ── */}
      <Dialog
        open={deleteDialog}
        onClose={() => !loadingDelete && setDeleteDialog(false)}
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
            Are you sure you want to delete <strong>{toDelete?.name}</strong>?
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
            disabled={loadingDelete}
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
            disabled={loadingDelete}
            variant="contained"
            startIcon={
              loadingDelete ? (
                <CircularProgress size={14} color="inherit" />
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
            {loadingDelete ? "Deleting…" : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
