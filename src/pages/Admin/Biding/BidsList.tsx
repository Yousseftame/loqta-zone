import { useEffect, useState, useMemo } from "react";
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
  DollarSign,
  ChevronDown,
  ChevronUp,
  Gavel,
  User,
  Clock,
  Package,
  Star,
  Edit2,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { colors } from "../Products/products-data";
import { useAuctions } from "@/store/AdminContext/AuctionContext/AuctionContext";
import {
  fetchBidsForAuction,
  deleteBid,
  updateBid,
  fetchProductName,
} from "@/service/Bidadminservice/Bidadminservice";
import type { Bid, BidStatus, BidUpdateData } from "./Bids-data";
import type { Auction } from "../Auctions/auctions-data";

// ─── Status chip ──────────────────────────────────────────────────────────────

function StatusChip({ status }: { status: BidStatus }) {
  const map: Record<BidStatus, { bg: string; color: string; label: string }> = {
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
  bid: Bid | null;
  open: boolean;
  onClose: () => void;
  onSave: (bid: Bid, data: BidUpdateData) => Promise<void>;
}

function EditDialog({ bid, open, onClose, onSave }: EditDialogProps) {
  const [status, setStatus] = useState<BidStatus>("pending");
  const [selected, setSelected] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (bid) {
      setStatus(bid.status);
      setSelected(bid.selectedbyAdmin);
    }
  }, [bid]);

  const handleSave = async () => {
    if (!bid) return;
    setSaving(true);
    try {
      await onSave(bid, { status, selectedbyAdmin: selected });
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
        <Edit2 size={20} /> Review Bid
      </DialogTitle>

      <DialogContent sx={{ pt: 2 }}>
        {bid && (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 3, mt: 1 }}>
            {/* Bid summary card */}
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
                  Bidder
                </span>
                <span
                  style={{
                    fontWeight: 700,
                    fontSize: "0.85rem",
                    color: colors.textPrimary,
                  }}
                >
                  {bid.bidderName}
                </span>
              </Box>
              <Box
                sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}
              >
                <span
                  style={{ fontSize: "0.8rem", color: colors.textSecondary }}
                >
                  User ID
                </span>
                <span
                  style={{
                    fontSize: "0.75rem",
                    fontFamily: "monospace",
                    color: colors.textMuted,
                  }}
                >
                  {bid.userId.slice(0, 20)}…
                </span>
              </Box>
              <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                <span
                  style={{ fontSize: "0.8rem", color: colors.textSecondary }}
                >
                  Bid Amount
                </span>
                <span
                  style={{
                    fontWeight: 700,
                    fontSize: "0.9rem",
                    color: "#22C55E",
                  }}
                >
                  {bid.amount.toLocaleString()} EGP
                </span>
              </Box>
            </Box>

            {/* Status selector */}
            <FormControl size="small" fullWidth>
              <InputLabel>Status</InputLabel>
              <Select
                value={status}
                label="Status"
                onChange={(e) => setStatus(e.target.value as BidStatus)}
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
                        { bgcolor: "#22C55E" },
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
                      Selecting this bid overrides the auction's Winner ID and
                      Winning Bid
                    </p>
                  </Box>
                }
              />
            </Box>

            {/* Warning when about to promote a winner */}
            {selected && status === "accepted" && (
              <Box
                sx={{
                  p: 1.5,
                  borderRadius: 2,
                  bgcolor: "#FFFBEB",
                  border: "1px solid #F59E0B",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 1,
                }}
              >
                <AlertTriangle
                  size={15}
                  style={{ color: "#D97706", flexShrink: 0, marginTop: 2 }}
                />
                <p style={{ margin: 0, fontSize: "0.78rem", color: "#92400E" }}>
                  <strong>Heads up:</strong> Saving will override the auction's
                  current winner with <strong>{bid.bidderName}</strong> at{" "}
                  <strong>{bid.amount.toLocaleString()} EGP</strong>.
                </p>
              </Box>
            )}
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

interface AuctionBidRowProps {
  auction: Auction;
  // NOTE: always pass "" from parent — subSearchTerm filters bids INSIDE the
  // expanded panel only, never the parent auction list.
  subSearchTerm: string;
}

function AuctionBidRow({ auction, subSearchTerm }: AuctionBidRowProps) {
  const [open, setOpen] = useState(false);
  const [bids, setBids] = useState<Bid[]>([]);
  const [loadingBids, setLoadingBids] = useState(false);
  const [productName, setProductName] = useState("");
  const [editBid, setEditBid] = useState<Bid | null>(null);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [bidToDelete, setBidToDelete] = useState<Bid | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [page, setPage] = useState(0);
  const rowsPerPage = 5;

  // Summary visible on the collapsed row — populated on mount
  const [summary, setSummary] = useState<{
    count: number;
    selectedBidderName: string | null;
    selectedAmount: number | null;
  }>({ count: 0, selectedBidderName: null, selectedAmount: null });

  useEffect(() => {
    if (auction.productId)
      fetchProductName(auction.productId).then(setProductName);
  }, [auction.productId]);

  // Pre-load bids so the summary shows immediately and expanding is instant
  useEffect(() => {
    let cancelled = false;
    fetchBidsForAuction(auction.id)
      .then((data) => {
        if (cancelled) return;
        setBids(data);
        const sel = data.find((b) => b.selectedbyAdmin);
        setSummary({
          count: data.length,
          selectedBidderName: sel ? sel.bidderName : null,
          selectedAmount: sel ? sel.amount : null,
        });
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
    if (!open && bids.length === 0) {
      setLoadingBids(true);
      try {
        const data = await fetchBidsForAuction(auction.id);
        setBids(data);
        const sel = data.find((b) => b.selectedbyAdmin);
        setSummary({
          count: data.length,
          selectedBidderName: sel ? sel.bidderName : null,
          selectedAmount: sel ? sel.amount : null,
        });
      } finally {
        setLoadingBids(false);
      }
    }
    setOpen((p) => !p);
  };

  const handleRefresh = async () => {
    setLoadingBids(true);
    try {
      const data = await fetchBidsForAuction(auction.id);
      setBids(data);
      const sel = data.find((b) => b.selectedbyAdmin);
      setSummary({
        count: data.length,
        selectedBidderName: sel ? sel.bidderName : null,
        selectedAmount: sel ? sel.amount : null,
      });
    } finally {
      setLoadingBids(false);
    }
  };

  const recomputeSummary = (updated: Bid[]) => {
    const sel = updated.find((b) => b.selectedbyAdmin);
    setSummary({
      count: updated.length,
      selectedBidderName: sel ? sel.bidderName : null,
      selectedAmount: sel ? sel.amount : null,
    });
  };

  const handleSaveEdit = async (bid: Bid, data: BidUpdateData) => {
    // Pass full bid so service can atomically promote auction winner when
    // selectedbyAdmin=true + status="accepted" are both set
    await updateBid(auction.id, bid.id, data, bid);
    setBids((prev) => {
      const updated = prev.map((b) =>
        b.id === bid.id ? { ...b, ...data } : b,
      );
      recomputeSummary(updated);
      return updated;
    });
  };

  const handleDelete = async () => {
    if (!bidToDelete) return;
    setDeleting(true);
    try {
      await deleteBid(auction.id, bidToDelete.id);
      setBids((prev) => {
        const updated = prev.filter((b) => b.id !== bidToDelete.id);
        recomputeSummary(updated);
        return updated;
      });
      setDeleteDialog(false);
      setBidToDelete(null);
    } finally {
      setDeleting(false);
    }
  };

  const filteredBids = useMemo(() => {
    if (!subSearchTerm) return bids;
    const s = subSearchTerm.toLowerCase();
    return bids.filter(
      (b) =>
        b.bidderName.toLowerCase().includes(s) ||
        b.userId.toLowerCase().includes(s) ||
        String(b.amount).includes(s),
    );
  }, [bids, subSearchTerm]);

  const paginated = filteredBids.slice(
    page * rowsPerPage,
    (page + 1) * rowsPerPage,
  );
  const topBid = bids.length > 0 ? Math.max(...bids.map((b) => b.amount)) : 0;

  return (
    <>
      {/* ── Auction summary row ─────────────────────────────────────────── */}
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

        {/* Auction # */}
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

        {/* Product */}
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

        {/* Auction status */}
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

        {/* Total bids */}
        <TableCell>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.8 }}>
            <span style={{ fontWeight: 700, color: colors.textPrimary }}>
              {summary.count}
            </span>
            <span style={{ color: colors.textMuted, fontSize: "0.75rem" }}>
              bids
            </span>
          </Box>
        </TableCell>

        {/* Current bid */}
        <TableCell>
          <span style={{ fontWeight: 700, color: "#22C55E" }}>
            {auction.currentBid.toFixed(2)} EGP
          </span>
        </TableCell>

        {/* Admin-selected bid — shows after admin picks one */}
        <TableCell>
          {summary.selectedAmount !== null ? (
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
              <Star size={13} style={{ color: "#F59E0B", fill: "#F59E0B" }} />
              <Box sx={{ display: "flex", flexDirection: "column", gap: 0 }}>
                <span
                  style={{
                    fontWeight: 700,
                    color: "#22C55E",
                    fontSize: "0.82rem",
                  }}
                >
                  {summary.selectedAmount.toLocaleString()} EGP
                </span>
                {summary.selectedBidderName && (
                  <span style={{ fontSize: "0.7rem", color: colors.textMuted }}>
                    {summary.selectedBidderName}
                  </span>
                )}
              </Box>
            </Box>
          ) : (
            <span style={{ color: colors.textMuted, fontSize: "0.78rem" }}>
              —
            </span>
          )}
        </TableCell>

        {/* End date */}
        <TableCell>
          <span style={{ fontSize: "0.78rem", color: colors.textMuted }}>
            {auction.endTime.toLocaleDateString()}
          </span>
        </TableCell>
      </TableRow>

      {/* ── Expanded bids panel ─────────────────────────────────────────── */}
      <TableRow>
        <TableCell colSpan={8} sx={{ p: 0, border: 0 }}>
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
                  <Gavel size={15} style={{ color: colors.primary }} />
                  <span
                    style={{
                      fontWeight: 700,
                      fontSize: "0.85rem",
                      color: colors.primaryDark,
                    }}
                  >
                    Bids — Auction #{auction.auctionNumber}
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
                    label={`${bids.length} total`}
                    size="small"
                    sx={{
                      bgcolor: colors.primary,
                      color: "#fff",
                      fontWeight: 700,
                      fontSize: "0.68rem",
                    }}
                  />
                  {topBid > 0 && (
                    <Chip
                      label={`Top: ${topBid.toLocaleString()} EGP`}
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
                  title="Refresh bids"
                >
                  <RefreshCw size={14} />
                </IconButton>
              </Box>

              {loadingBids ? (
                <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
                  <CircularProgress size={24} sx={{ color: colors.primary }} />
                </Box>
              ) : bids.length === 0 ? (
                <Box sx={{ py: 4, textAlign: "center" }}>
                  <Gavel
                    size={32}
                    style={{
                      color: colors.textMuted,
                      margin: "0 auto 8px",
                      display: "block",
                    }}
                  />
                  <p
                    style={{
                      color: colors.textSecondary,
                      fontSize: "0.85rem",
                      margin: 0,
                    }}
                  >
                    No bids found for this auction
                  </p>
                </Box>
              ) : (
                <>
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ bgcolor: "#F8FAFC" }}>
                        {[
                          "#",
                          "Bidder",
                          "Amount",
                          "Status",
                          "Selected",
                          "Time",
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
                      {paginated.map((bid, idx) => {
                        const rank = page * rowsPerPage + idx + 1;
                        const isTop = bid.amount === topBid && topBid > 0;
                        return (
                          <TableRow
                            key={bid.id}
                            sx={{
                              "&:hover": { bgcolor: colors.muted },
                              bgcolor: bid.selectedbyAdmin
                                ? "#F0FDF4" // green tint — admin selected
                                : isTop
                                  ? "#FFFBEB" // yellow tint — highest bid
                                  : "transparent",
                            }}
                          >
                            {/* Rank + badges */}
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
                                {bid.selectedbyAdmin && (
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

                            {/* Bidder */}
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
                                  {bid.bidderName
                                    ? bid.bidderName.charAt(0).toUpperCase()
                                    : "?"}
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
                                    {bid.bidderName || "Unknown"}
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
                                    {bid.userId.slice(0, 14)}…
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
                                  {bid.amount.toLocaleString()} EGP
                                </span>
                              </Box>
                            </TableCell>

                            {/* Status chip */}
                            <TableCell sx={{ py: 1 }}>
                              <StatusChip status={bid.status} />
                            </TableCell>

                            {/* Selected indicator */}
                            <TableCell sx={{ py: 1 }}>
                              {bid.selectedbyAdmin ? (
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
                                  {bid.createdAt.toLocaleString()}
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
                                <IconButton
                                  size="small"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditBid(bid);
                                  }}
                                  sx={{
                                    color: colors.primary,
                                    "&:hover": { bgcolor: colors.primaryBg },
                                    borderRadius: 1.5,
                                  }}
                                  title="Review bid"
                                >
                                  <Edit2 size={14} />
                                </IconButton>
                                <IconButton
                                  size="small"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setBidToDelete(bid);
                                    setDeleteDialog(true);
                                  }}
                                  sx={{
                                    color: colors.error,
                                    "&:hover": { bgcolor: colors.errorBg },
                                    borderRadius: 1.5,
                                  }}
                                  title="Delete bid"
                                >
                                  <Trash2 size={14} />
                                </IconButton>
                              </Box>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                  <TablePagination
                    component="div"
                    count={filteredBids.length}
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
        bid={editBid}
        open={!!editBid}
        onClose={() => setEditBid(null)}
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
          <AlertTriangle size={20} /> Delete Bid
        </DialogTitle>
        <DialogContent>
          <p style={{ color: colors.textPrimary, margin: "0 0 12px" }}>
            Are you sure you want to delete the bid of{" "}
            <strong>{bidToDelete?.amount.toLocaleString()} EGP</strong> by{" "}
            <strong>{bidToDelete?.bidderName}</strong>? This cannot be undone.
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
              <strong>Warning:</strong> Deleting a bid does not automatically
              update the auction's current bid amount.
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

// ─── Main BidsList Page ───────────────────────────────────────────────────────

export default function BidsList() {
  const { auctions, loading: auctionsLoading, refreshAuctions } = useAuctions();
  const [auctionSearch, setAuctionSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const filtered = useMemo(() => {
    let f = auctions;
    if (statusFilter !== "all") f = f.filter((a) => a.status === statusFilter);
    if (auctionSearch) {
      const s = auctionSearch.toLowerCase();
      f = f.filter(
        (a) =>
          String(a.auctionNumber).includes(s) ||
          a.productId.toLowerCase().includes(s),
      );
    }
    return [...f].sort((a, b) => {
      const order: Record<string, number> = { live: 0, upcoming: 1, ended: 2 };
      if (order[a.status] !== order[b.status])
        return order[a.status] - order[b.status];
      return b.totalBids - a.totalBids;
    });
  }, [auctions, auctionSearch, statusFilter]);

  const totalBids = auctions.reduce((acc, a) => acc + a.totalBids, 0);
  const liveAuctions = auctions.filter((a) => a.status === "live").length;
  const auctionsWithBids = auctions.filter((a) => a.totalBids > 0).length;

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
            <Gavel
              size={28}
              style={{
                display: "inline",
                marginRight: 8,
                verticalAlign: "middle",
              }}
            />
            Bids
          </h1>
          <p
            style={{
              color: colors.textSecondary,
              margin: "4px 0 0",
              fontSize: "0.875rem",
            }}
          >
            View, review, and manage all bids across auctions
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
          gridTemplateColumns: { xs: "1fr 1fr", sm: "repeat(3, 1fr)" },
          mb: 4,
        }}
      >
        {[
          { label: "Total Bids", value: totalBids, icon: <Gavel size={20} /> },
          {
            label: "Live Auctions",
            value: liveAuctions,
            icon: <DollarSign size={20} />,
          },
          {
            label: "Auctions with Bids",
            value: auctionsWithBids,
            icon: <User size={20} />,
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
            value={auctionSearch}
            onChange={(e) => setAuctionSearch(e.target.value)}
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
              endAdornment: auctionSearch && (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => setAuctionSearch("")}>
                    <X size={14} />
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
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
            <option value="all">All Status</option>
            <option value="live">Live</option>
            <option value="upcoming">Upcoming</option>
            <option value="ended">Ended</option>
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
                  "Status",
                  "Total Bids",
                  "Current Bid",
                  "Selected Bid",
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
                  <TableCell colSpan={8} align="center" sx={{ py: 10 }}>
                    <Gavel
                      size={44}
                      style={{
                        color: colors.textMuted,
                        margin: "0 auto 12px",
                        display: "block",
                      }}
                    />
                    <p style={{ color: colors.textSecondary, fontWeight: 600 }}>
                      No auctions found
                    </p>
                    <p style={{ color: colors.textMuted, fontSize: "0.85rem" }}>
                      Try adjusting your filters
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((auction) => (
                  <AuctionBidRow
                    key={auction.id}
                    auction={auction}
                    subSearchTerm=""
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
