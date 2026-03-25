import { useEffect, useMemo, useState } from "react";
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
  Collapse,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Switch,
  FormControlLabel,
} from "@mui/material";
import {
  Search,
  X,
  AlertTriangle,
  Trash2,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Package,
  Clock,
  DollarSign,
  Star,
  Edit2,
  CheckCircle,
  XCircle,
 
} from "lucide-react";
import { LocalOffer as LocalOfferIcon } from "@mui/icons-material";
import { colors } from "../Products/products-data";
import { useAuctions } from "@/store/AdminContext/AuctionContext/AuctionContext";
import {
  fetchLastOffersForAuction,
  updateLastOffer,
  deleteLastOffer,
  fetchProductName,
} from "@/service/LastOfferService/LastOfferService";
import type {
  LastOffer,
  LastOfferStatus,
  LastOfferUpdateData,
} from "@/service/LastOfferService/LastOfferService";
import type { Auction } from "../Auctions/auctions-data";
import { usePermissions } from "@/permissions/usePermissions";

// ─── Status chip helper ───────────────────────────────────────────────────────

function StatusChip({ status }: { status: LastOfferStatus }) {
  const map: Record<
    LastOfferStatus,
    { bg: string; color: string; label: string }
  > = {
    pending: { bg: "#FEF3C7", color: "#D97706", label: "Pending" },
    accepted: { bg: "#DCFCE7", color: "#22C55E", label: "Accepted" },
    rejected: { bg: "#FEE2E2", color: "#EF4444", label: "Rejected" },
  };
  const s = map[status] ?? map.pending;
  return (
    <Chip
      label={s.label}
      size="small"
      sx={{
        bgcolor: s.bg,
        color: s.color,
        fontWeight: 700,
        fontSize: "0.68rem",
      }}
    />
  );
}

// ─── Edit Dialog ──────────────────────────────────────────────────────────────

interface EditDialogProps {
  offer: LastOffer | null;
  open: boolean;
  onClose: () => void;
  onSave: (offer: LastOffer, data: LastOfferUpdateData) => Promise<void>;
}

function EditDialog({ offer, open, onClose, onSave }: EditDialogProps) {
  const [status, setStatus] = useState<LastOfferStatus>("pending");
  const [selected, setSelected] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (offer) {
      setStatus(offer.status);
      setSelected(offer.selectedbyAdmin);
    }
  }, [offer]);

  const handleSave = async () => {
    if (!offer) return;
    setSaving(true);
    try {
      // Pass the full offer so the service can promote the winner if needed
      await onSave(offer, { status, selectedbyAdmin: selected });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={() => !saving && onClose()}
      maxWidth="sm"
      fullWidth
      PaperProps={{ sx: { borderRadius: 3 } }}
    >
      <DialogTitle
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1.5,
          color: colors.primary,
        }}
      >
        <Edit2 size={20} /> Edit Last Offer
      </DialogTitle>
      <DialogContent sx={{ pt: 2 }}>
        {offer && (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 3, mt: 1 }}>
            {/* Offer summary */}
            <Box
              sx={{
                p: 2,
                borderRadius: 2,
                bgcolor: colors.primaryBg,
                border: `1px solid ${colors.border}`,
              }}
            >
              <Box
                sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}
              >
                <span
                  style={{ fontSize: "0.8rem", color: colors.textSecondary }}
                >
                  User
                </span>
                <span
                  style={{
                    fontWeight: 700,
                    fontSize: "0.85rem",
                    color: colors.textPrimary,
                  }}
                >
                  {offer.userName}
                </span>
              </Box>
              <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                <span
                  style={{ fontSize: "0.8rem", color: colors.textSecondary }}
                >
                  Amount
                </span>
                <span
                  style={{
                    fontWeight: 700,
                    fontSize: "0.9rem",
                    color: "#22C55E",
                  }}
                >
                  {offer.amount.toLocaleString()} EGP
                </span>
              </Box>
            </Box>

            {/* Status */}
            <FormControl size="small" fullWidth>
              <InputLabel>Status</InputLabel>
              <Select
                value={status}
                label="Status"
                onChange={(e) => setStatus(e.target.value as LastOfferStatus)}
              >
                <MenuItem value="pending">Pending</MenuItem>
                <MenuItem value="accepted">Accepted</MenuItem>
                <MenuItem value="rejected">Rejected</MenuItem>
              </Select>
            </FormControl>

            {/* Selected by admin toggle */}
            <Box
              sx={{
                p: 2,
                borderRadius: 2,
                border: `1px solid ${selected ? "#22C55E44" : colors.border}`,
                bgcolor: selected ? "#F0FDF4" : "#fff",
                transition: "all 0.2s",
              }}
            >
              <FormControlLabel
                control={
                  <Switch
                    checked={selected}
                    onChange={(e) => setSelected(e.target.checked)}
                    sx={{
                      "& .MuiSwitch-switchBase.Mui-checked": {
                        color: "#22C55E",
                      },
                      "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track":
                        {
                          bgcolor: "#22C55E",
                        },
                    }}
                  />
                }
                label={
                  <Box>
                    <span
                      style={{
                        fontWeight: 600,
                        fontSize: "0.88rem",
                        color: colors.textPrimary,
                      }}
                    >
                      Selected by Admin
                    </span>
                    <p
                      style={{
                        margin: 0,
                        fontSize: "0.75rem",
                        color: colors.textSecondary,
                      }}
                    >
                      Mark this offer as the admin's chosen backup winner
                    </p>
                  </Box>
                }
              />
            </Box>
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ p: 3, gap: 1 }}>
        <Button
          onClick={onClose}
          disabled={saving}
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
          onClick={handleSave}
          disabled={saving}
          variant="contained"
          startIcon={
            saving ? (
              <CircularProgress size={14} color="inherit" />
            ) : (
              <Edit2 size={16} />
            )
          }
          sx={{
            textTransform: "none",
            bgcolor: colors.primary,
            "&:hover": { bgcolor: colors.primaryDark },
            borderRadius: 2,
            minWidth: 100,
          }}
        >
          {saving ? "Saving…" : "Save"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ─── Per-auction expandable row ───────────────────────────────────────────────

interface AuctionOfferRowProps {
  auction: Auction;
  subSearchTerm: string;
  statusFilter: string;
}

function AuctionOfferRow({
  auction,
  subSearchTerm,
  statusFilter,
}: AuctionOfferRowProps) {
  const [open, setOpen] = useState(false);
  const [offers, setOffers] = useState<LastOffer[]>([]);
  const [loadingOffers, setLoadingOffers] = useState(false);
  const [productName, setProductName] = useState("");
  const [editOffer, setEditOffer] = useState<LastOffer | null>(null);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [offerToDelete, setOfferToDelete] = useState<LastOffer | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [page, setPage] = useState(0);
      const { can } = usePermissions();

  const rowsPerPage = 5;

  // ── Row-level summary: loaded on mount so counts/selected show
  //    in the collapsed row before the user ever expands it.
  const [summary, setSummary] = useState<{
    count: number;
    pendingCount: number;
    selectedAmount: number | null;
  }>({ count: 0, pendingCount: 0, selectedAmount: null });

  useEffect(() => {
    if (auction.productId)
      fetchProductName(auction.productId).then(setProductName);
  }, [auction.productId]);

  useEffect(() => {
    let cancelled = false;
    fetchLastOffersForAuction(auction.id)
      .then((data) => {
        if (cancelled) return;
        const pending = data.filter((o) => o.status === "pending").length;
        const sel = data.find((o) => o.selectedbyAdmin);
        setSummary({
          count: data.length,
          pendingCount: pending,
          selectedAmount: sel ? sel.amount : null,
        });
        // Pre-populate offers so expanding is instant — no second fetch needed
        setOffers(data);
      })
      .catch(() => {
        /* non-fatal */
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auction.id]);

  const handleExpand = async () => {
    // Offers are pre-loaded on mount; only re-fetch if somehow empty
    if (!open && offers.length === 0) {
      setLoadingOffers(true);
      try {
        const data = await fetchLastOffersForAuction(auction.id);
        setOffers(data);
        const pending = data.filter((o) => o.status === "pending").length;
        const sel = data.find((o) => o.selectedbyAdmin);
        setSummary({
          count: data.length,
          pendingCount: pending,
          selectedAmount: sel ? sel.amount : null,
        });
      } finally {
        setLoadingOffers(false);
      }
    }
    setOpen((p) => !p);
  };

  const handleRefresh = async () => {
    setLoadingOffers(true);
    try {
      const data = await fetchLastOffersForAuction(auction.id);
      setOffers(data);
      const pending = data.filter((o) => o.status === "pending").length;
      const sel = data.find((o) => o.selectedbyAdmin);
      setSummary({
        count: data.length,
        pendingCount: pending,
        selectedAmount: sel ? sel.amount : null,
      });
    } finally {
      setLoadingOffers(false);
    }
  };

  const handleSaveEdit = async (
    offer: LastOffer,
    data: LastOfferUpdateData,
  ) => {
    // Pass the full offer so the service can atomically promote the auction winner
    // when selectedbyAdmin=true + status="accepted" is set simultaneously.
    await updateLastOffer(auction.id, offer.id, data, offer);
    setOffers((prev) => {
      const updated = prev.map((o) =>
        o.id === offer.id ? { ...o, ...data } : o,
      );
      const pending = updated.filter((o) => o.status === "pending").length;
      const sel = updated.find((o) => o.selectedbyAdmin);
      setSummary({
        count: updated.length,
        pendingCount: pending,
        selectedAmount: sel ? sel.amount : null,
      });
      return updated;
    });
  };

  const handleDelete = async () => {
    if (!offerToDelete) return;
    setDeleting(true);
    try {
      await deleteLastOffer(auction.id, offerToDelete.id);
      setOffers((prev) => {
        const updated = prev.filter((o) => o.id !== offerToDelete.id);
        const pending = updated.filter((o) => o.status === "pending").length;
        const sel = updated.find((o) => o.selectedbyAdmin);
        setSummary({
          count: updated.length,
          pendingCount: pending,
          selectedAmount: sel ? sel.amount : null,
        });
        return updated;
      });
      setDeleteDialog(false);
      setOfferToDelete(null);
    } finally {
      setDeleting(false);
    }
  };

  const filteredOffers = useMemo(() => {
    let f = offers;
    if (statusFilter !== "all") f = f.filter((o) => o.status === statusFilter);
    if (subSearchTerm) {
      const s = subSearchTerm.toLowerCase();
      f = f.filter(
        (o) =>
          o.userName.toLowerCase().includes(s) ||
          o.userId.toLowerCase().includes(s) ||
          String(o.amount).includes(s),
      );
    }
    return f;
  }, [offers, subSearchTerm, statusFilter]);

  const paginated = filteredOffers.slice(
    page * rowsPerPage,
    (page + 1) * rowsPerPage,
  );
  // topOffer used in the expanded panel for highlighting the highest bid
  const topOffer =
    offers.length > 0 ? Math.max(...offers.map((o) => o.amount)) : 0;
  // summary.pendingCount / summary.selectedAmount used for the collapsed row display

  return (
    <>
      {/* Auction summary row */}
      <TableRow
        sx={{
          cursor: "pointer",
          bgcolor: open ? colors.primaryBg : "transparent",
          "&:hover": { bgcolor: colors.muted },
          transition: "background 0.15s",
        }}
        onClick={handleExpand}
      >
        <TableCell sx={{ width: 48 }}>
          <IconButton size="small" sx={{ color: colors.primary }}>
            {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </IconButton>
        </TableCell>
        <TableCell>
          <span
            style={{
              fontWeight: 700,
              color: colors.primary,
              fontSize: "0.9rem",
            }}
          >
            #{auction.auctionNumber}
          </span>
        </TableCell>
        <TableCell>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 0.3 }}>
            <span
              style={{
                fontSize: "0.82rem",
                color: colors.textSecondary,
                fontFamily: "monospace",
              }}
            >
              {auction.productId.slice(0, 16)}…
            </span>
            {productName && (
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                <Package size={11} style={{ color: colors.primary }} />
                <span
                  style={{
                    fontSize: "0.75rem",
                    color: colors.primary,
                    fontWeight: 600,
                  }}
                >
                  {productName}
                </span>
              </Box>
            )}
          </Box>
        </TableCell>
        <TableCell>
          <Chip
            label={auction.status}
            size="small"
            sx={{
              bgcolor:
                auction.status === "live"
                  ? "#DCFCE7"
                  : auction.status === "upcoming"
                    ? "#EFF6FF"
                    : "#F1F5F9",
              color:
                auction.status === "live"
                  ? "#22C55E"
                  : auction.status === "upcoming"
                    ? "#3B82F6"
                    : "#64748B",
              fontWeight: 700,
              fontSize: "0.68rem",
              textTransform: "capitalize",
            }}
          />
        </TableCell>
        {/* Offers count — uses summary state, populated on mount */}
        <TableCell>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.8 }}>
            <span style={{ fontWeight: 700, color: colors.textPrimary }}>
              {summary.count}
            </span>
            <span style={{ color: colors.textMuted, fontSize: "0.75rem" }}>
              offers
            </span>
            {summary.pendingCount > 0 && (
              <Chip
                label={`${summary.pendingCount} pending`}
                size="small"
                sx={{
                  bgcolor: "#FEF3C7",
                  color: "#D97706",
                  fontWeight: 700,
                  fontSize: "0.62rem",
                }}
              />
            )}
          </Box>
        </TableCell>
        {/* Selected offer — uses summary state, populated on mount */}
        <TableCell>
          {summary.selectedAmount !== null ? (
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
              <Star size={13} style={{ color: "#F59E0B", fill: "#F59E0B" }} />
              <span
                style={{
                  fontWeight: 700,
                  color: "#22C55E",
                  fontSize: "0.85rem",
                }}
              >
                {summary.selectedAmount.toLocaleString()} EGP
              </span>
            </Box>
          ) : (
            <span style={{ color: colors.textMuted, fontSize: "0.78rem" }}>
              —
            </span>
          )}
        </TableCell>
        <TableCell>
          <span style={{ fontSize: "0.78rem", color: colors.textMuted }}>
            {auction.endTime.toLocaleDateString()}
          </span>
        </TableCell>
      </TableRow>

      {/* Expanded offers table */}
      <TableRow>
        <TableCell colSpan={7} sx={{ p: 0, border: 0 }}>
          <Collapse in={open} timeout="auto" unmountOnExit>
            <Box
              sx={{
                mx: 4,
                my: 2,
                borderRadius: 2,
                border: `1px solid ${colors.border}`,
                overflow: "hidden",
                bgcolor: "#fff",
              }}
            >
              {/* Sub-header */}
              <Box
                sx={{
                  px: 2.5,
                  py: 1.5,
                  bgcolor: colors.primaryBg,
                  borderBottom: `1px solid ${colors.border}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: 1,
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1.5,
                    flexWrap: "wrap",
                  }}
                >
                  <LocalOfferIcon
                    sx={{ fontSize: 15, color: colors.primary }}
                  />
                  <span
                    style={{
                      fontWeight: 700,
                      fontSize: "0.85rem",
                      color: colors.primaryDark,
                    }}
                  >
                    Last Offers — Auction #{auction.auctionNumber}
                  </span>
                  {productName && (
                    <Box
                      sx={{ display: "flex", alignItems: "center", gap: 0.5 }}
                    >
                      <Package
                        size={12}
                        style={{ color: colors.textSecondary }}
                      />
                      <span
                        style={{
                          fontSize: "0.78rem",
                          color: colors.textSecondary,
                          fontWeight: 600,
                        }}
                      >
                        {productName}
                      </span>
                    </Box>
                  )}
                  <Chip
                    label={`${offers.length} total`}
                    size="small"
                    sx={{
                      bgcolor: colors.primary,
                      color: "#fff",
                      fontWeight: 700,
                      fontSize: "0.68rem",
                    }}
                  />
                  {topOffer > 0 && (
                    <Chip
                      label={`Top: ${topOffer.toLocaleString()} EGP`}
                      size="small"
                      sx={{
                        bgcolor: "#DCFCE7",
                        color: "#22C55E",
                        fontWeight: 700,
                        fontSize: "0.68rem",
                      }}
                    />
                  )}
                </Box>
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRefresh();
                  }}
                  sx={{ color: colors.primary }}
                  title="Refresh"
                >
                  <RefreshCw size={14} />
                </IconButton>
              </Box>

              {loadingOffers ? (
                <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
                  <CircularProgress size={24} sx={{ color: colors.primary }} />
                </Box>
              ) : filteredOffers.length === 0 ? (
                <Box sx={{ py: 4, textAlign: "center" }}>
                  <LocalOfferIcon
                    sx={{
                      fontSize: 32,
                      color: colors.textMuted,
                      display: "block",
                      mx: "auto",
                      mb: 1,
                    }}
                  />
                  <p
                    style={{
                      color: colors.textSecondary,
                      fontSize: "0.85rem",
                      margin: 0,
                    }}
                  >
                    {offers.length === 0
                      ? "No last offers submitted for this auction"
                      : "No offers match your filter"}
                  </p>
                </Box>
              ) : (
                <>
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ bgcolor: "#F8FAFC" }}>
                        {[
                          "#",
                          "User",
                          "Amount",
                          "Status",
                          "Selected",
                          "Submitted",
                          "Actions",
                        ].map((h) => (
                          <TableCell
                            key={h}
                            sx={{
                              fontWeight: 700,
                              color: colors.primaryDark,
                              fontSize: "0.68rem",
                              textTransform: "uppercase",
                              letterSpacing: "0.05em",
                              py: 1,
                              ...(h === "Actions" && { textAlign: "center" }),
                            }}
                          >
                            {h}
                          </TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {paginated.map((offer, idx) => {
                        const rank = page * rowsPerPage + idx + 1;
                        const isTop = offer.amount === topOffer && topOffer > 0;
                        return (
                          <TableRow
                            key={offer.id}
                            sx={{
                              "&:hover": { bgcolor: colors.muted },
                              bgcolor: offer.selectedbyAdmin
                                ? "#F0FDF4"
                                : isTop
                                  ? "#FFFBEB"
                                  : "transparent",
                            }}
                          >
                            {/* Rank */}
                            <TableCell sx={{ py: 1 }}>
                              <Box
                                sx={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 0.75,
                                }}
                              >
                                <span
                                  style={{
                                    fontSize: "0.78rem",
                                    color: colors.textMuted,
                                  }}
                                >
                                  {rank}
                                </span>
                                {isTop && (
                                  <Chip
                                    label="TOP"
                                    size="small"
                                    sx={{
                                      bgcolor: "#22C55E",
                                      color: "#fff",
                                      fontWeight: 700,
                                      fontSize: "0.6rem",
                                      height: 16,
                                    }}
                                  />
                                )}
                                {offer.selectedbyAdmin && (
                                  <Star
                                    size={13}
                                    style={{
                                      color: "#F59E0B",
                                      fill: "#F59E0B",
                                    }}
                                  />
                                )}
                              </Box>
                            </TableCell>

                            {/* User */}
                            <TableCell sx={{ py: 1 }}>
                              <Box
                                sx={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 1,
                                }}
                              >
                                <Box
                                  sx={{
                                    width: 28,
                                    height: 28,
                                    borderRadius: "50%",
                                    bgcolor: colors.primaryBg,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    fontWeight: 700,
                                    color: colors.primary,
                                    fontSize: "0.72rem",
                                    flexShrink: 0,
                                  }}
                                >
                                  {offer.userName.charAt(0).toUpperCase()}
                                </Box>
                                <Box
                                  sx={{
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: 0.2,
                                  }}
                                >
                                  <span
                                    style={{
                                      fontWeight: 600,
                                      fontSize: "0.82rem",
                                      color: colors.textPrimary,
                                    }}
                                  >
                                    {offer.userName}
                                  </span>
                                  <span
                                    style={{
                                      fontSize: "0.68rem",
                                      fontFamily: "monospace",
                                      color: colors.textMuted,
                                      background: colors.muted,
                                      padding: "1px 5px",
                                      borderRadius: 3,
                                    }}
                                  >
                                    {offer.userId.slice(0, 14)}…
                                  </span>
                                </Box>
                              </Box>
                            </TableCell>

                            {/* Amount */}
                            <TableCell sx={{ py: 1 }}>
                              <Box
                                sx={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 0.5,
                                }}
                              >
                                <DollarSign
                                  size={13}
                                  style={{ color: "#22C55E" }}
                                />
                                <span
                                  style={{
                                    fontWeight: 700,
                                    color: isTop
                                      ? "#22C55E"
                                      : colors.textPrimary,
                                    fontSize: "0.88rem",
                                  }}
                                >
                                  {offer.amount.toLocaleString()} EGP
                                </span>
                              </Box>
                            </TableCell>

                            {/* Status */}
                            <TableCell sx={{ py: 1 }}>
                              <StatusChip status={offer.status} />
                            </TableCell>

                            {/* Selected */}
                            <TableCell sx={{ py: 1 }}>
                              {offer.selectedbyAdmin ? (
                                <Box
                                  sx={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 0.5,
                                  }}
                                >
                                  <CheckCircle
                                    size={15}
                                    style={{ color: "#22C55E" }}
                                  />
                                  <span
                                    style={{
                                      fontSize: "0.75rem",
                                      color: "#22C55E",
                                      fontWeight: 600,
                                    }}
                                  >
                                    Selected
                                  </span>
                                </Box>
                              ) : (
                                <Box
                                  sx={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 0.5,
                                  }}
                                >
                                  <XCircle
                                    size={15}
                                    style={{ color: colors.textMuted }}
                                  />
                                  <span
                                    style={{
                                      fontSize: "0.75rem",
                                      color: colors.textMuted,
                                    }}
                                  >
                                    Not selected
                                  </span>
                                </Box>
                              )}
                            </TableCell>

                            {/* Time */}
                            <TableCell sx={{ py: 1 }}>
                              <Box
                                sx={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 0.5,
                                }}
                              >
                                <Clock
                                  size={12}
                                  style={{ color: colors.textMuted }}
                                />
                                <span
                                  style={{
                                    fontSize: "0.75rem",
                                    color: colors.textMuted,
                                  }}
                                >
                                  {offer.createdAt.toLocaleString()}
                                </span>
                              </Box>
                            </TableCell>

                            {/* Actions */}
                            <TableCell align="center" sx={{ py: 1 }}>
                              <Box
                                sx={{
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  gap: 0.5,
                                }}
                              >
                                {can("lastOffers", "update") && <IconButton
                                  size="small"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditOffer(offer);
                                  }}
                                  sx={{
                                    color: colors.primary,
                                    "&:hover": { bgcolor: colors.primaryBg },
                                    borderRadius: 1.5,
                                  }}
                                  title="Edit offer"
                                >
                                  <Edit2 size={14} />
                                </IconButton>}
                                {can("lastOffers", "delete") && <IconButton
                                  size="small"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setOfferToDelete(offer);
                                    setDeleteDialog(true);
                                  }}
                                  sx={{
                                    color: colors.error,
                                    "&:hover": { bgcolor: colors.errorBg },
                                    borderRadius: 1.5,
                                  }}
                                  title="Delete offer"
                                >
                                  <Trash2 size={14} />
                                </IconButton>}
                              </Box>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                  <TablePagination
                    component="div"
                    count={filteredOffers.length}
                    page={page}
                    onPageChange={(_e, p) => setPage(p)}
                    rowsPerPage={rowsPerPage}
                    rowsPerPageOptions={[5]}
                    sx={{ borderTop: `1px solid ${colors.border}` }}
                  />
                </>
              )}
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>

      {/* Edit Dialog */}
      <EditDialog
        offer={editOffer}
        open={!!editOffer}
        onClose={() => setEditOffer(null)}
        onSave={handleSaveEdit}
      />

      {/* Delete Dialog */}
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
          <AlertTriangle size={20} /> Delete Last Offer
        </DialogTitle>
        <DialogContent>
          <p style={{ color: colors.textPrimary, margin: "0 0 12px" }}>
            Are you sure you want to delete the offer of{" "}
            <strong>{offerToDelete?.amount.toLocaleString()} EGP</strong> by{" "}
            <strong>{offerToDelete?.userName}</strong>? This cannot be undone.
          </p>
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
            disabled={deleting}
            variant="contained"
            startIcon={
              deleting ? (
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
              minWidth: 100,
            }}
          >
            {deleting ? "Deleting…" : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

// ─── Main LastOfferList page ──────────────────────────────────────────────────

export default function LastOfferList() {
  const { auctions, loading: auctionsLoading, refreshAuctions } = useAuctions();
  const [searchTerm, setSearchTerm] = useState("");
  const [auctionStatusFilter, setAuctionStatusFilter] = useState("ended");
  const [offerStatusFilter, setOfferStatusFilter] = useState("all");
      const { can } = usePermissions();


  // Only show auctions where lastOfferEnabled = true (or show all ended auctions)
  const filtered = useMemo(() => {
    let f = auctions.filter((a) => a.lastOfferEnabled);
    if (auctionStatusFilter !== "all")
      f = f.filter((a) => a.status === auctionStatusFilter);
    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      f = f.filter(
        (a) =>
          String(a.auctionNumber).includes(s) ||
          a.productId.toLowerCase().includes(s),
      );
    }
    return [...f].sort((a, b) => {
      const order = { live: 0, upcoming: 1, ended: 2 } as Record<
        string,
        number
      >;
      if (order[a.status] !== order[b.status])
        return order[a.status] - order[b.status];
      return b.endTime.getTime() - a.endTime.getTime();
    });
  }, [auctions, searchTerm, auctionStatusFilter]);

  const totalEligibleAuctions = auctions.filter(
    (a) => a.lastOfferEnabled,
  ).length;
  const endedWithLastOffer = auctions.filter(
    (a) => a.lastOfferEnabled && a.status === "ended",
  ).length;

  if (auctionsLoading) {
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
        mx: "auto",
        p: { xs: 2, md: 3 },
        bgcolor: "#F8FAFC",
        minHeight: "100vh",
      }}
    >
      {/* Header */}
      <Box
        sx={{
          mb: 4,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
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
            <LocalOfferIcon
              sx={{ fontSize: 28, mr: 1, verticalAlign: "middle" }}
            />
            Last Offer System
          </h1>
          <p
            style={{
              color: colors.textSecondary,
              margin: "4px 0 0",
              fontSize: "0.875rem",
            }}
          >
            Review and manage backup offers submitted by participants
          </p>
        </div>
        <IconButton
          onClick={refreshAuctions}
          sx={{
            color: colors.primary,
            border: `1px solid ${colors.border}`,
            borderRadius: 2,
          }}
          title="Refresh"
        >
          <RefreshCw size={18} />
        </IconButton>
      </Box>

      {/* Stats */}
      <Box
        sx={{
          display: "grid",
          gap: 2,
          gridTemplateColumns: { xs: "1fr ", sm: "repeat(3, 1fr)" },
          mb: 4,
        }}
      >
        {[
          {
            label: "Auctions with Last Offers",
            value: totalEligibleAuctions,
            icon: <LocalOfferIcon sx={{ fontSize: 20 }} />,
          },
          {
            label: "Ended — Offers Due",
            value: endedWithLastOffer,
            icon: <CheckCircle size={20} />,
          },
          {
            label: "Currently Showing",
            value: filtered.length,
            icon: <Search size={20} />,
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
                    fontSize: "0.65rem",
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
                    fontSize: "1.75rem",
                    fontWeight: 700,
                    margin: "4px 0 0",
                  }}
                >
                  {value}
                </p>
              </div>
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: 10,
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

      {/* Filters */}
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
        <Box
          sx={{
            display: "flex",
            gap: 2,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <TextField
            placeholder="Search by auction number or product ID…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            variant="outlined"
            size="small"
            sx={{
              flex: 1,
              minWidth: 220,
              "& .MuiOutlinedInput-root": {
                "& fieldset": { borderColor: colors.border },
                "&:hover fieldset": { borderColor: colors.primary },
                "&.Mui-focused fieldset": { borderColor: colors.primary },
              },
            }}
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
          />
          <select
            value={auctionStatusFilter}
            onChange={(e) => setAuctionStatusFilter(e.target.value)}
            style={{
              padding: "8px 14px",
              borderRadius: 8,
              border: `1px solid ${colors.border}`,
              fontSize: "0.85rem",
              color: colors.textPrimary,
              background: "#fff",
              outline: "none",
            }}
          >
            <option value="all">All Auction Status</option>
            <option value="live">Live</option>
            <option value="upcoming">Upcoming</option>
            <option value="ended">Ended</option>
          </select>
          <select
            value={offerStatusFilter}
            onChange={(e) => setOfferStatusFilter(e.target.value)}
            style={{
              padding: "8px 14px",
              borderRadius: 8,
              border: `1px solid ${colors.border}`,
              fontSize: "0.85rem",
              color: colors.textPrimary,
              background: "#fff",
              outline: "none",
            }}
          >
            <option value="all">All Offer Status</option>
            <option value="pending">Pending</option>
            <option value="accepted">Accepted</option>
            <option value="rejected">Rejected</option>
          </select>
          <p
            style={{
              margin: 0,
              fontSize: "0.85rem",
              color: colors.textSecondary,
            }}
          >
            <strong style={{ color: colors.primary }}>{filtered.length}</strong>{" "}
            auctions
          </p>
        </Box>
      </Paper>

      {/* Table */}
      <Paper
        elevation={0}
        sx={{
          borderRadius: 3,
          bgcolor: "#fff",
          border: `1px solid ${colors.border}`,
          overflow: "hidden",
        }}
      >
        <Box sx={{ overflowX: "auto" }}>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: colors.primaryBg }}>
                {[
                  "",
                  "Auction #",
                  "Product",
                  "Auction Status",
                  "Offers",
                  "Selected Offer",
                  "End Date",
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
                    }}
                  >
                    {h}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 10 }}>
                    <LocalOfferIcon
                      sx={{
                        fontSize: 44,
                        color: colors.textMuted,
                        display: "block",
                        mx: "auto",
                        mb: 1.5,
                      }}
                    />
                    <p style={{ color: colors.textSecondary, fontWeight: 600 }}>
                      No auctions found
                    </p>
                    <p style={{ color: colors.textMuted, fontSize: "0.85rem" }}>
                      {auctions.filter((a) => a.lastOfferEnabled).length === 0
                        ? "No auctions have the Last Offer feature enabled yet"
                        : "Try adjusting your filters"}
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((auction) => (
                  <AuctionOfferRow
                    key={auction.id}
                    auction={auction}
                    subSearchTerm=""
                    statusFilter={offerStatusFilter}
                  />
                ))
              )}
            </TableBody>
          </Table>
        </Box>
      </Paper>
    </Box>
  );
}
