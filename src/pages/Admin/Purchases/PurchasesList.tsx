/**
 * src/pages/Admin/Purchases/PurchasesList.tsx
 *
 * Standalone admin page for Purchase Orders.
 * Visual language matches ProductsList / SuppliersList exactly.
 */

import { useState, useEffect, useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Button,
  TextField,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TablePagination,
  InputAdornment,
  Paper,
  Box,
  CircularProgress,
  Chip,
} from "@mui/material";
import {
  Plus,
  Search,
  X,
  AlertTriangle,
  Edit,
  Trash2,
  RefreshCw,
  ShoppingCart,
  Package,
  TrendingUp,
  CheckCircle2,
} from "lucide-react";
import { colors } from "@/pages/Admin/Products/products-data";
import { usePurchases } from "@/store/AdminContext/PurchaseContext/PurchaseContext";
import type {
  Purchase,
  PurchaseFormData,
  PurchaseStatus,
} from "./purchases-data";
import { STATUS_CONFIG } from "./purchases-data";
import PurchaseModal from "./components/PurchaseModal";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(d: Date | null | undefined): string {
  if (!d) return "—";
  return d.toLocaleDateString("en-EG", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function fmtEGP(n: number): string {
  return `${n.toLocaleString("en-EG")} EGP`;
}

// ─── Status Quick-change pill ─────────────────────────────────────────────────

function StatusChip({
  status,
  purchaseId,
  onChange,
}: {
  status: PurchaseStatus;
  purchaseId: string;
  onChange: (id: string, s: PurchaseStatus) => void;
}) {
  const [open, setOpen] = useState(false);
  const cfg = STATUS_CONFIG[status];

  return (
    <Box sx={{ position: "relative", display: "inline-block" }}>
      <Chip
        label={`${cfg.emoji} ${cfg.label}`}
        size="small"
        onClick={() => setOpen((v) => !v)}
        sx={{
          bgcolor: cfg.bg,
          color: cfg.color,
          fontWeight: 700,
          fontSize: "0.7rem",
          border: `1px solid ${cfg.border}`,
          cursor: "pointer",
          "&:hover": { opacity: 0.85 },
        }}
      />
      {open && (
        <>
          <Box
            onClick={() => setOpen(false)}
            sx={{ position: "fixed", inset: 0, zIndex: 9 }}
          />
          <Box
            sx={{
              position: "absolute",
              top: "calc(100% + 4px)",
              left: 0,
              zIndex: 10,
              bgcolor: "#fff",
              borderRadius: 2,
              border: `1px solid ${colors.border}`,
              boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
              minWidth: 140,
              overflow: "hidden",
            }}
          >
            {(
              Object.entries(STATUS_CONFIG) as [
                PurchaseStatus,
                (typeof STATUS_CONFIG)[PurchaseStatus],
              ][]
            ).map(([key, c]) => (
              <Box
                key={key}
                onClick={() => {
                  onChange(purchaseId, key);
                  setOpen(false);
                }}
                sx={{
                  px: 1.5,
                  py: 1,
                  cursor: "pointer",
                  fontSize: "0.78rem",
                  fontWeight: key === status ? 700 : 500,
                  bgcolor: key === status ? c.bg : "transparent",
                  color: c.color,
                  "&:hover": { bgcolor: c.bg },
                  transition: "background 0.1s",
                }}
              >
                {c.emoji} {c.label}
              </Box>
            ))}
          </Box>
        </>
      )}
    </Box>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function PurchasesList() {
  const {
    purchases,
    loading,
    error,
    refreshPurchases,
    addPurchase,
    editPurchase,
    removePurchase,
    changeStatus,
  } = usePurchases();

  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingPurchase, setEditingPurchase] = useState<Purchase | null>(null);

  // Delete dialog
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [toDelete, setToDelete] = useState<Purchase | null>(null);
  const [loadingDelete, setLoadingDelete] = useState(false);

  // ── Derived stats ──────────────────────────────────────────────────────────
  const totalSpend = useMemo(
    () => purchases.reduce((s, p) => s + p.totalCost, 0),
    [purchases],
  );
  const receivedCount = useMemo(
    () => purchases.filter((p) => p.status === "received").length,
    [purchases],
  );
  const pendingCount = useMemo(
    () => purchases.filter((p) => p.status === "pending").length,
    [purchases],
  );

  // ── Filter ─────────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    if (!searchTerm.trim()) return purchases;
    const s = searchTerm.toLowerCase();
    return purchases.filter(
      (p) =>
        p.productTitle.toLowerCase().includes(s) ||
        p.supplierName.toLowerCase().includes(s) ||
        p.notes.toLowerCase().includes(s) ||
        STATUS_CONFIG[p.status].label.toLowerCase().includes(s),
    );
  }, [purchases, searchTerm]);

  const paginated = filtered.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage,
  );

  useEffect(() => {
    setPage(0);
  }, [searchTerm]);

  // ── Handlers ───────────────────────────────────────────────────────────────

  const openAdd = () => {
    setEditingPurchase(null);
    setModalOpen(true);
  };
  const openEdit = (p: Purchase) => {
    setEditingPurchase(p);
    setModalOpen(true);
  };

  const handleSave = async (formData: PurchaseFormData) => {
    setSaving(true);
    try {
      if (editingPurchase) {
        await editPurchase(editingPurchase.id, formData);
      } else {
        await addPurchase(formData);
      }
      setModalOpen(false);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!toDelete) return;
    setLoadingDelete(true);
    try {
      await removePurchase(toDelete.id);
      setDeleteDialog(false);
      setToDelete(null);
    } finally {
      setLoadingDelete(false);
    }
  };

  // ── Loading / Error ────────────────────────────────────────────────────────

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
          onClick={refreshPurchases}
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
            <ShoppingCart
              size={28}
              style={{
                display: "inline",
                marginRight: 8,
                verticalAlign: "middle",
              }}
            />
            Purchase Orders
          </h1>
          <p
            style={{
              color: colors.textSecondary,
              margin: "4px 0 0",
              fontSize: "0.875rem",
            }}
          >
            Track products bought from suppliers
          </p>
        </div>
        <Box sx={{ display: "flex", gap: 1 }}>
          <IconButton
            onClick={refreshPurchases}
            sx={{
              color: colors.primary,
              border: `1px solid ${colors.border}`,
              borderRadius: 2,
            }}
            title="Refresh"
          >
            <RefreshCw size={18} />
          </IconButton>
          <Button
            variant="contained"
            startIcon={<Plus size={18} />}
            onClick={openAdd}
            sx={{
              bgcolor: colors.primary,
              color: "white",
              textTransform: "none",
              px: 3,
              py: 1.5,
              borderRadius: 2,
              fontWeight: 600,
              boxShadow: "none",
              "&:hover": { bgcolor: "#111" },
            }}
          >
            New Purchase Order
          </Button>
        </Box>
      </Box>

      {/* ── Stat Cards ── */}
      <Box
        sx={{
          display: "grid",
          gap: 3,
          gridTemplateColumns: {
            xs: "1fr",
            sm: "repeat(2, 1fr)",
            md: "repeat(4, 1fr)",
          },
          mb: 4,
        }}
      >
        {[
          {
            label: "Total Orders",
            value: purchases.length,
            icon: <ShoppingCart size={22} />,
          },
          {
            label: "Total Spend",
            value: fmtEGP(totalSpend),
            icon: <TrendingUp size={22} />,
          },
          {
            label: "Received",
            value: receivedCount,
            icon: <CheckCircle2 size={22} />,
          },
          {
            label: "Pending",
            value: pendingCount,
            icon: <Package size={22} />,
          },
        ].map(({ label, value, icon }) => (
          <Paper
            key={label}
            elevation={0}
            sx={{
              p: { xs: 2, md: 2.5 },
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
                    fontSize: typeof value === "number" ? "2rem" : "1.4rem",
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
          placeholder="Search by product, supplier, status or notes…"
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
          <Table sx={{ minWidth: 780 }}>
            <TableHead>
              <TableRow sx={{ bgcolor: colors.primaryBg }}>
                {[
                  "Date",
                  "Product",
                  "Supplier",
                  "Qty",
                  "Unit Cost",
                  "Total Cost",
                  "Status",
                  "Notes",
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
                  <TableCell colSpan={9} align="center" sx={{ py: 10 }}>
                    <ShoppingCart
                      size={44}
                      style={{
                        color: colors.textMuted,
                        margin: "0 auto 12px",
                        display: "block",
                      }}
                    />
                    <p style={{ color: colors.textSecondary, fontWeight: 600 }}>
                      No purchase orders found
                    </p>
                    <p style={{ color: colors.textMuted, fontSize: "0.85rem" }}>
                      {searchTerm
                        ? "Try adjusting your search"
                        : "Create your first purchase order to get started"}
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                paginated.map((p, idx) => (
                  <TableRow
                    key={p.id}
                    sx={{
                      bgcolor: idx % 2 === 0 ? "#fff" : "#FAFAFA",
                      "&:hover": { bgcolor: colors.muted },
                      transition: "background 0.15s",
                    }}
                  >
                    {/* Date */}
                    <TableCell
                      sx={{
                        whiteSpace: "nowrap",
                        fontSize: "0.82rem",
                        color: colors.textSecondary,
                      }}
                    >
                      {fmtDate(p.purchaseDate)}
                    </TableCell>

                    {/* Product */}
                    <TableCell sx={{ minWidth: 160 }}>
                      <Box
                        sx={{ display: "flex", alignItems: "center", gap: 1 }}
                      >
                        <Box
                          sx={{
                            width: 6,
                            height: 6,
                            borderRadius: "50%",
                            bgcolor: colors.primary,
                            flexShrink: 0,
                          }}
                        />
                        <span
                          style={{
                            fontWeight: 600,
                            fontSize: "0.875rem",
                            color: colors.textPrimary,
                          }}
                        >
                          {p.productTitle || "—"}
                        </span>
                      </Box>
                    </TableCell>

                    {/* Supplier */}
                    <TableCell sx={{ minWidth: 140 }}>
                      <span
                        style={{
                          fontSize: "0.78rem",
                          background: colors.primaryBg,
                          color: colors.primary,
                          padding: "3px 10px",
                          borderRadius: 99,
                          fontWeight: 600,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {p.supplierName || "—"}
                      </span>
                    </TableCell>

                    {/* Qty */}
                    <TableCell>
                      <span
                        style={{ fontWeight: 700, color: colors.textPrimary }}
                      >
                        {p.quantity}
                      </span>
                    </TableCell>

                    {/* Unit Cost */}
                    <TableCell sx={{ whiteSpace: "nowrap" }}>
                      <span
                        style={{
                          fontSize: "0.85rem",
                          color: colors.textSecondary,
                        }}
                      >
                        {fmtEGP(p.unitCost)}
                      </span>
                    </TableCell>

                    {/* Total Cost */}
                    <TableCell sx={{ whiteSpace: "nowrap" }}>
                      <span
                        style={{ fontWeight: 700, color: colors.primaryDark }}
                      >
                        {fmtEGP(p.totalCost)}
                      </span>
                    </TableCell>

                    {/* Status — clickable to change */}
                    <TableCell>
                      <StatusChip
                        status={p.status}
                        purchaseId={p.id}
                        onChange={changeStatus}
                      />
                    </TableCell>

                    {/* Notes */}
                    <TableCell sx={{ maxWidth: 160 }}>
                      <span
                        style={{
                          fontSize: "0.78rem",
                          color: p.notes ? colors.textSecondary : "#CBD5E1",
                          fontStyle: p.notes ? "normal" : "italic",
                          display: "block",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {p.notes || "—"}
                      </span>
                    </TableCell>

                    {/* Actions */}
                    <TableCell align="center" sx={{ minWidth: 90 }}>
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 0.5,
                        }}
                      >
                        <IconButton
                          size="small"
                          onClick={() => openEdit(p)}
                          sx={{
                            color: "#7C3AED",
                            "&:hover": { bgcolor: "#F3E8FF" },
                            borderRadius: 1.5,
                          }}
                          title="Edit"
                        >
                          <Edit size={16} />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => {
                            setToDelete(p);
                            setDeleteDialog(true);
                          }}
                          sx={{
                            color: colors.error,
                            "&:hover": { bgcolor: "#FEE2E2" },
                            borderRadius: 1.5,
                          }}
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </IconButton>
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

      {/* ── Add / Edit Modal ── */}
      <PurchaseModal
        open={modalOpen}
        saving={saving}
        editingPurchase={editingPurchase}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
      />

      {/* ── Delete Confirm ── */}
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
          <p style={{ color: colors.textPrimary, marginBottom: 12 }}>
            Are you sure you want to delete the purchase order for{" "}
            <strong>{toDelete?.productTitle}</strong>?
          </p>
          <Box
            sx={{
              bgcolor: "#FEE2E2",
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
