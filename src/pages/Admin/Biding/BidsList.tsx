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
} from "lucide-react";
import { colors } from "../Products/products-data";
import { useAuctions } from "@/store/AdminContext/AuctionContext/AuctionContext";
import {
  fetchBidsForAuction,
  deleteBid,
} from "@/service/Bidadminservice/Bidadminservice";
import type { Bid } from "./Bids-data";
import type { Auction } from "../Auctions/auctions-data";

// ─── Per-auction row with expandable bids ────────────────────────────────────

interface AuctionBidRowProps {
  auction: Auction;
  searchTerm: string;
}

function AuctionBidRow({ auction, searchTerm }: AuctionBidRowProps) {
  const [open, setOpen] = useState(false);
  const [bids, setBids] = useState<Bid[]>([]);
  const [loadingBids, setLoadingBids] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [bidToDelete, setBidToDelete] = useState<Bid | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [page, setPage] = useState(0);
  const rowsPerPage = 5;

  const handleExpand = async () => {
    if (!open && bids.length === 0) {
      setLoadingBids(true);
      try {
        const data = await fetchBidsForAuction(auction.id);
        setBids(data);
      } finally {
        setLoadingBids(false);
      }
    }
    setOpen((prev) => !prev);
  };

  const handleRefresh = async () => {
    setLoadingBids(true);
    try {
      const data = await fetchBidsForAuction(auction.id);
      setBids(data);
    } finally {
      setLoadingBids(false);
    }
  };

  const handleDelete = async () => {
    if (!bidToDelete) return;
    setDeleting(true);
    try {
      await deleteBid(auction.id, bidToDelete.id);
      setBids((prev) => prev.filter((b) => b.id !== bidToDelete.id));
      setDeleteDialog(false);
      setBidToDelete(null);
    } finally {
      setDeleting(false);
    }
  };

  const filteredBids = useMemo(() => {
    if (!searchTerm) return bids;
    const s = searchTerm.toLowerCase();
    return bids.filter(
      (b) =>
        b.bidderName.toLowerCase().includes(s) ||
        b.userId.toLowerCase().includes(s) ||
        String(b.amount).includes(s),
    );
  }, [bids, searchTerm]);

  const paginated = filteredBids.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage,
  );

  const topBid = bids.length > 0 ? Math.max(...bids.map((b) => b.amount)) : 0;

  return (
    <>
      {/* Auction Summary Row */}
      <TableRow
        sx={{
          "&:hover": { bgcolor: colors.muted },
          transition: "background 0.15s",
          cursor: "pointer",
          bgcolor: open ? colors.primaryBg : "transparent",
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
          <span
            style={{
              fontSize: "0.82rem",
              color: colors.textSecondary,
              fontFamily: "monospace",
            }}
          >
            {auction.productId.slice(0, 16)}…
          </span>
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
        <TableCell>
          <span style={{ fontWeight: 700, color: colors.textPrimary }}>
            {auction.totalBids}
          </span>
          <span style={{ color: colors.textMuted, fontSize: "0.75rem" }}>
            {" "}
            bids
          </span>
        </TableCell>
        <TableCell>
          <span style={{ fontWeight: 700, color: "#22C55E" }}>
            {auction.currentBid.toFixed(2)} EGP
          </span>
        </TableCell>
        <TableCell>
          <span style={{ fontSize: "0.78rem", color: colors.textMuted }}>
            {auction.endTime.toLocaleDateString()}
          </span>
        </TableCell>
      </TableRow>

      {/* Expanded Bids Sub-table */}
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
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                  <Gavel size={15} style={{ color: colors.primary }} />
                  <span
                    style={{
                      fontWeight: 700,
                      fontSize: "0.85rem",
                      color: colors.primaryDark,
                    }}
                  >
                    Bids for Auction #{auction.auctionNumber}
                  </span>
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
                      label={`Top: ${topBid.toFixed(2)} EGP`}
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
              ) : filteredBids.length === 0 ? (
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
                          "User ID",
                          "Amount",
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
                        const isTop = bid.amount === topBid;
                        return (
                          <TableRow
                            key={bid.id}
                            sx={{
                              "&:hover": { bgcolor: colors.muted },
                              bgcolor: isTop ? "#F0FDF4" : "transparent",
                            }}
                          >
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
                              </Box>
                            </TableCell>
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
                                <span
                                  style={{
                                    fontWeight: 600,
                                    fontSize: "0.82rem",
                                    color: colors.textPrimary,
                                  }}
                                >
                                  {bid.bidderName || "Anonymous"}
                                </span>
                              </Box>
                            </TableCell>
                            <TableCell sx={{ py: 1 }}>
                              <span
                                style={{
                                  fontSize: "0.72rem",
                                  fontFamily: "monospace",
                                  color: colors.textMuted,
                                  background: colors.muted,
                                  padding: "2px 6px",
                                  borderRadius: 4,
                                }}
                              >
                                {bid.userId.slice(0, 12)}…
                              </span>
                            </TableCell>
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
                            <TableCell align="center" sx={{ py: 1 }}>
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
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const filtered = useMemo(() => {
    let f = auctions;
    if (statusFilter !== "all") f = f.filter((a) => a.status === statusFilter);
    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      f = f.filter(
        (a) =>
          String(a.auctionNumber).includes(s) ||
          a.productId.toLowerCase().includes(s),
      );
    }
    // Sort: live first, then by totalBids desc
    return [...f].sort((a, b) => {
      const order = { live: 0, upcoming: 1, ended: 2 };
      if (order[a.status] !== order[b.status])
        return order[a.status] - order[b.status];
      return b.totalBids - a.totalBids;
    });
  }, [auctions, searchTerm, statusFilter]);

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
            View and manage all bids across auctions
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
                  "Product ID",
                  "Status",
                  "Total Bids",
                  "Current Bid",
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
                    searchTerm={searchTerm}
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
