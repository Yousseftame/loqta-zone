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
} from "@mui/material";
import {
  Search,
  X,
  AlertTriangle,
  Trash2,
  RefreshCw,
  Users,
  ChevronDown,
  ChevronUp,
  Clock,
  CheckCircle,
  XCircle,
  CreditCard,
  Tag,
  Package,
} from "lucide-react";
import { colors } from "../Products/products-data";
import { useAuctions } from "@/store/AdminContext/AuctionContext/AuctionContext";
import {
  fetchParticipantsForAuction,
  deleteParticipant,
  fetchProductName,
} from "@/service/Participantservice/Participantservice";
import type { Participant } from "./Participants-data";
import type { Auction } from "../Auctions/auctions-data";
import { usePermissions } from "@/permissions/usePermissions";

// ─── Per-auction row with expandable participants ─────────────────────────────

interface AuctionParticipantRowProps {
  auction: Auction;
  // subSearchTerm is always "" from the parent — it only filters participants
  // inside the expanded panel, never used to filter which auction rows show.
  subSearchTerm: string;
}

function AuctionParticipantRow({
  auction,
  subSearchTerm,
}: AuctionParticipantRowProps) {
  const [open, setOpen] = useState(false);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loadingPart, setLoadingPart] = useState(false);
  const [productName, setProductName] = useState<string>("");
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [partToDelete, setPartToDelete] = useState<Participant | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [page, setPage] = useState(0);
  const rowsPerPage = 5;
      const { can } = usePermissions();


  useEffect(() => {
    if (auction.productId)
      fetchProductName(auction.productId).then(setProductName);
  }, [auction.productId]);

  const handleExpand = async () => {
    if (!open && participants.length === 0) {
      setLoadingPart(true);
      try {
        setParticipants(await fetchParticipantsForAuction(auction.id));
      } finally {
        setLoadingPart(false);
      }
    }
    setOpen((prev) => !prev);
  };

  const handleRefresh = async () => {
    setLoadingPart(true);
    try {
      setParticipants(await fetchParticipantsForAuction(auction.id));
    } finally {
      setLoadingPart(false);
    }
  };

  const handleDelete = async () => {
    if (!partToDelete) return;
    setDeleting(true);
    try {
      await deleteParticipant(auction.id, partToDelete.id);
      setParticipants((prev) => prev.filter((p) => p.id !== partToDelete.id));
      setDeleteDialog(false);
      setPartToDelete(null);
    } finally {
      setDeleting(false);
    }
  };

  // subSearchTerm only filters within the expanded panel
  const filteredParticipants = useMemo(() => {
    if (!subSearchTerm) return participants;
    const s = subSearchTerm.toLowerCase();
    return participants.filter(
      (p) =>
        p.userId.toLowerCase().includes(s) ||
        p.fullName.toLowerCase().includes(s) ||
        p.paymentId.toLowerCase().includes(s),
    );
  }, [participants, subSearchTerm]);

  const paginated = filteredParticipants.slice(
    page * rowsPerPage,
    (page + 1) * rowsPerPage,
  );
  const paidCount = participants.filter((p) => p.hasPaid).length;
  const voucherCount = participants.filter((p) => p.voucherUsed).length;

  return (
    <>
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
        <TableCell>
          <span style={{ fontWeight: 700, color: colors.textPrimary }}>
            {auction.totalParticipants}
          </span>
          <span style={{ color: colors.textMuted, fontSize: "0.75rem" }}>
            {" "}
            joined
          </span>
        </TableCell>
        <TableCell>
          <Chip
            label={
              auction.entryType === "paid" ? `${auction.entryFee} EGP` : "Free"
            }
            size="small"
            sx={{
              bgcolor: auction.entryType === "paid" ? "#FEF3C7" : "#DCFCE7",
              color: auction.entryType === "paid" ? "#D97706" : "#22C55E",
              fontWeight: 700,
              fontSize: "0.68rem",
            }}
          />
        </TableCell>
        <TableCell>
          <span style={{ fontSize: "0.78rem", color: colors.textMuted }}>
            {auction.endTime.toLocaleDateString()}
          </span>
        </TableCell>
      </TableRow>

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
                  <Users size={15} style={{ color: colors.primary }} />
                  <span
                    style={{
                      fontWeight: 700,
                      fontSize: "0.85rem",
                      color: colors.primaryDark,
                    }}
                  >
                    Participants for Auction #{auction.auctionNumber}
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
                    label={`${participants.length} total`}
                    size="small"
                    sx={{
                      bgcolor: colors.primary,
                      color: "#fff",
                      fontWeight: 700,
                      fontSize: "0.68rem",
                    }}
                  />
                  {paidCount > 0 && (
                    <Chip
                      label={`${paidCount} paid`}
                      size="small"
                      sx={{
                        bgcolor: "#DCFCE7",
                        color: "#22C55E",
                        fontWeight: 700,
                        fontSize: "0.68rem",
                      }}
                    />
                  )}
                  {voucherCount > 0 && (
                    <Chip
                      label={`${voucherCount} voucher`}
                      size="small"
                      sx={{
                        bgcolor: "#F3E8FF",
                        color: "#7C3AED",
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
                  title="Refresh participants"
                >
                  <RefreshCw size={14} />
                </IconButton>
              </Box>

              {loadingPart ? (
                <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
                  <CircularProgress size={24} sx={{ color: colors.primary }} />
                </Box>
              ) : participants.length === 0 ? (
                <Box sx={{ py: 4, textAlign: "center" }}>
                  <Users
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
                    No participants found for this auction
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
                          "Payment ID",
                          "Has Paid",
                          "Voucher Used",
                          "Joined At",
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
                      {paginated.map((participant, idx) => {
                        const rank = page * rowsPerPage + idx + 1;
                        return (
                          <TableRow
                            key={participant.id}
                            sx={{ "&:hover": { bgcolor: colors.muted } }}
                          >
                            <TableCell sx={{ py: 1 }}>
                              <span
                                style={{
                                  fontSize: "0.78rem",
                                  color: colors.textMuted,
                                }}
                              >
                                {rank}
                              </span>
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
                                    width: 30,
                                    height: 30,
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
                                  {participant.fullName
                                    ? participant.fullName
                                        .charAt(0)
                                        .toUpperCase()
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
                                    {participant.fullName || "Unknown"}
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
                                    {participant.userId.slice(0, 14)}…
                                  </span>
                                </Box>
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
                                <CreditCard
                                  size={12}
                                  style={{ color: colors.textMuted }}
                                />
                                <span
                                  style={{
                                    fontSize: "0.72rem",
                                    fontFamily: "monospace",
                                    color: colors.textMuted,
                                  }}
                                >
                                  {participant.paymentId || "—"}
                                </span>
                              </Box>
                            </TableCell>
                            <TableCell sx={{ py: 1 }}>
                              {participant.hasPaid ? (
                                <Box
                                  sx={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 0.5,
                                  }}
                                >
                                  <CheckCircle
                                    size={14}
                                    style={{ color: "#22C55E" }}
                                  />
                                  <span
                                    style={{
                                      fontSize: "0.75rem",
                                      color: "#22C55E",
                                      fontWeight: 600,
                                    }}
                                  >
                                    Paid
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
                                    size={14}
                                    style={{ color: colors.error }}
                                  />
                                  <span
                                    style={{
                                      fontSize: "0.75rem",
                                      color: colors.error,
                                      fontWeight: 600,
                                    }}
                                  >
                                    Unpaid
                                  </span>
                                </Box>
                              )}
                            </TableCell>
                            <TableCell sx={{ py: 1 }}>
                              {participant.voucherUsed ? (
                                <Box
                                  sx={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 0.5,
                                  }}
                                >
                                  <Tag size={13} style={{ color: "#7C3AED" }} />
                                  <span
                                    style={{
                                      fontSize: "0.75rem",
                                      color: "#7C3AED",
                                      fontWeight: 600,
                                    }}
                                  >
                                    Yes
                                  </span>
                                </Box>
                              ) : (
                                <span
                                  style={{
                                    fontSize: "0.75rem",
                                    color: colors.textMuted,
                                  }}
                                >
                                  —
                                </span>
                              )}
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
                                  {participant.joinedAt.toLocaleString()}
                                </span>
                              </Box>
                            </TableCell>
                            <TableCell align="center" sx={{ py: 1 }}>
                              {can("participants", "delete") && <IconButton
                                
                                size="small"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setPartToDelete(participant);
                                  setDeleteDialog(true);
                                }}
                                sx={{
                                  color: colors.error,
                                  "&:hover": { bgcolor: colors.errorBg },
                                  borderRadius: 1.5,
                                }}
                                title="Remove participant"
                              >
                                <Trash2 size={14} />
                              </IconButton>}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                  <TablePagination
                    component="div"
                    count={filteredParticipants.length}
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
          <AlertTriangle size={20} /> Remove Participant
        </DialogTitle>
        <DialogContent>
          <p style={{ color: colors.textPrimary, margin: "0 0 12px" }}>
            Are you sure you want to remove{" "}
            <strong>{partToDelete?.fullName || partToDelete?.userId}</strong>{" "}
            from this auction? This cannot be undone.
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
              <strong>Warning:</strong> Removing a participant does not
              automatically decrement the auction's total participants counter.
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
            {deleting ? "Removing…" : "Remove"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

// ─── Main ParticipantsList Page ───────────────────────────────────────────────

export default function ParticipantsList() {
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
      const order = { live: 0, upcoming: 1, ended: 2 };
      if (order[a.status] !== order[b.status])
        return order[a.status] - order[b.status];
      return b.totalParticipants - a.totalParticipants;
    });
  }, [auctions, auctionSearch, statusFilter]);

  const totalParticipants = auctions.reduce(
    (acc, a) => acc + a.totalParticipants,
    0,
  );
  const paidAuctions = auctions.filter((a) => a.entryType === "paid").length;
  const freeAuctions = auctions.filter((a) => a.entryType === "free").length;

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
            <Users
              size={28}
              style={{
                display: "inline",
                marginRight: 8,
                verticalAlign: "middle",
              }}
            />
            Auction Participants
          </h1>
          <p
            style={{
              color: colors.textSecondary,
              margin: "4px 0 0",
              fontSize: "0.875rem",
            }}
          >
            View and manage participants across all auctions
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

      <Box
        sx={{
          display: "grid",
          gap: 2,
          gridTemplateColumns: { xs: "1fr 1fr", sm: "repeat(3, 1fr)" },
          mb: 4,
        }}
      >
        {[
          {
            label: "Total Participants",
            value: totalParticipants,
            icon: <Users size={20} />,
          },
          {
            label: "Paid-Entry Auctions",
            value: paidAuctions,
            icon: <CreditCard size={20} />,
          },
          {
            label: "Free-Entry Auctions",
            value: freeAuctions,
            icon: <CheckCircle size={20} />,
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
                  "Participants",
                  "Entry Type",
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
                    <Users
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
                  // subSearchTerm="" so expanding always shows all participants regardless of auction search
                  <AuctionParticipantRow
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
