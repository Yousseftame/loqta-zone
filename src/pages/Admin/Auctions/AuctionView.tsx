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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TablePagination,
  IconButton,
} from "@mui/material";
import {
  ArrowLeft,
  Edit,
  Trash2,
  Gavel,
  DollarSign,
  Users,
  Calendar,
  Clock,
  AlertTriangle,
  Check,
  Radio,
  CheckCircle2,
  User,
  RefreshCw,
  CheckCircle,
  XCircle,
  CreditCard,
  Tag,
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/firebase/firebase";
import { colors, resolveTitle } from "../Products/products-data";
import {
  getAuctionStatusStyle,
  type AuctionStatus,
  type Auction,
} from "./auctions-data";
import { useAuctions } from "@/store/AdminContext/AuctionContext/AuctionContext";
import { useProducts } from "@/store/AdminContext/ProductContext/ProductsCotnext";
import AuctionChat from "@/pages/AuctionLivePage/components/AuctionChat";
import { usePermissions } from "@/permissions/usePermissions";
import type { Participant } from "@/pages/Admin/Participants/Participants-data";
import {
  fetchParticipantsForAuction,
  deleteParticipant,
} from "@/service/Participantservice/Participantservice";

const statusIcon = (s: AuctionStatus) =>
  s === "live" ? (
    <Radio size={14} />
  ) : s === "upcoming" ? (
    <Clock size={14} />
  ) : (
    <CheckCircle2 size={14} />
  );

// ─── Lazy winner info — 1 extra getDoc, fires only when a real winner exists ──
interface WinnerInfo {
  name: string;
  email: string;
}

async function fetchWinnerInfo(uid: string): Promise<WinnerInfo | null> {
  try {
    const snap = await getDoc(doc(db, "users", uid));
    if (!snap.exists()) return null;
    const d = snap.data();
    return {
      name:
        (d.fullName ?? `${d.firstName ?? ""} ${d.lastName ?? ""}`.trim()) ||
        "Unknown",
      email: d.email ?? "",
    };
  } catch {
    return null;
  }
}

// ─── Participants section (mirrors Auction Participants list) ─────────────────
function AuctionParticipantsSection({
  auctionId,
  auctionNumber,
}: {
  auctionId: string;
  auctionNumber: number;
}) {
  const navigate = useNavigate();
  const { can } = usePermissions();
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loadingPart, setLoadingPart] = useState(true);
  const [page, setPage] = useState(0);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [partToDelete, setPartToDelete] = useState<Participant | null>(null);
  const [deleting, setDeleting] = useState(false);
  const rowsPerPage = 5;

  const loadParticipants = async () => {
    setLoadingPart(true);
    try {
      setParticipants(await fetchParticipantsForAuction(auctionId));
      setPage(0);
    } finally {
      setLoadingPart(false);
    }
  };

  useEffect(() => {
    loadParticipants();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auctionId]);

  const handleDelete = async () => {
    if (!partToDelete) return;
    setDeleting(true);
    try {
      await deleteParticipant(auctionId, partToDelete.id);
      setParticipants((prev) => prev.filter((p) => p.id !== partToDelete.id));
      setDeleteDialog(false);
      setPartToDelete(null);
    } finally {
      setDeleting(false);
    }
  };

  const paginated = participants.slice(
    page * rowsPerPage,
    (page + 1) * rowsPerPage,
  );
  const paidCount = participants.filter((p) => p.hasPaid).length;
  const voucherCount = participants.filter((p) => p.voucherUsed).length;

  return (
    <>
      <Paper
        elevation={0}
        sx={{
          borderRadius: 3,
          border: `1px solid ${colors.border}`,
          overflow: "hidden",
          mt: 3,
        }}
      >
        <Box
          sx={{
            px: 2.5,
            py: 1.75,
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
            <Users size={16} style={{ color: colors.primary }} />
            <span
              style={{
                fontWeight: 700,
                fontSize: "0.9rem",
                color: colors.primaryDark,
              }}
            >
              Participants for Auction #{auctionNumber}
            </span>
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
            onClick={loadParticipants}
            sx={{ color: colors.primary }}
            title="Refresh participants"
          >
            <RefreshCw size={14} />
          </IconButton>
        </Box>

        {loadingPart ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 5 }}>
            <CircularProgress size={26} sx={{ color: colors.primary }} />
          </Box>
        ) : participants.length === 0 ? (
          <Box sx={{ py: 5, textAlign: "center" }}>
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
            <Box sx={{ overflowX: "auto" }}>
              <Table size="small" sx={{ minWidth: 720 }}>
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
                          py: 1.25,
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
                        <TableCell sx={{ py: 1.25 }}>
                          <span
                            style={{
                              fontSize: "0.78rem",
                              color: colors.textMuted,
                            }}
                          >
                            {rank}
                          </span>
                        </TableCell>
                        <TableCell sx={{ py: 1.25 }}>
                          <Box
                            onClick={() =>
                              navigate(`/admin/users/${participant.userId}`)
                            }
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 1.25,
                              cursor: "pointer",
                              borderRadius: 1.5,
                              py: 0.25,
                              px: 0.5,
                              mx: -0.5,
                              transition: "background 0.15s",
                              "&:hover": { bgcolor: colors.primaryBg },
                            }}
                            title="View user profile"
                          >
                            <Box
                              sx={{
                                width: 34,
                                height: 34,
                                borderRadius: "50%",
                                bgcolor: colors.primaryBg,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontWeight: 700,
                                color: colors.primary,
                                fontSize: "0.75rem",
                                flexShrink: 0,
                              }}
                            >
                              {participant.fullName
                                ? participant.fullName.charAt(0).toUpperCase()
                                : "?"}
                            </Box>
                            <Box
                              sx={{
                                display: "flex",
                                flexDirection: "column",
                                gap: 0.2,
                                minWidth: 0,
                              }}
                            >
                              <span
                                style={{
                                  fontWeight: 700,
                                  fontSize: "0.85rem",
                                  color: colors.primary,
                                  textDecoration: "underline",
                                  textUnderlineOffset: 2,
                                }}
                              >
                                {participant.fullName || "Unknown"}
                              </span>
                              {participant.email ? (
                                <span
                                  style={{
                                    fontSize: "0.72rem",
                                    color: colors.textSecondary,
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "nowrap",
                                  }}
                                >
                                  {participant.email}
                                </span>
                              ) : null}
                              <span
                                style={{
                                  fontSize: "0.66rem",
                                  fontFamily: "monospace",
                                  color: colors.textMuted,
                                  background: colors.muted,
                                  padding: "1px 5px",
                                  borderRadius: 3,
                                  width: "fit-content",
                                }}
                              >
                                {participant.userId.slice(0, 14)}…
                              </span>
                            </Box>
                          </Box>
                        </TableCell>
                        <TableCell sx={{ py: 1.25 }}>
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
                        <TableCell sx={{ py: 1.25 }}>
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
                        <TableCell sx={{ py: 1.25 }}>
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
                        <TableCell sx={{ py: 1.25 }}>
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
                        <TableCell align="center" sx={{ py: 1.25 }}>
                          {can("participants", "delete") && (
                            <IconButton
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
                            </IconButton>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Box>
            <TablePagination
              component="div"
              count={participants.length}
              page={page}
              onPageChange={(_e, p) => setPage(p)}
              rowsPerPage={rowsPerPage}
              rowsPerPageOptions={[5]}
              sx={{ borderTop: `1px solid ${colors.border}` }}
            />
          </>
        )}
      </Paper>

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
          <p style={{ color: colors.textPrimary, marginBottom: 12 }}>
            Remove{" "}
            <strong>{partToDelete?.fullName || partToDelete?.userId}</strong>{" "}
            from Auction #{auctionNumber}?
          </p>
          <Box
            sx={{
              bgcolor: colors.errorBg,
              border: `1px solid ${colors.error}`,
              borderRadius: 2,
              p: 2,
            }}
          >
            <p style={{ fontSize: "0.85rem", color: colors.error, margin: 0 }}>
              This removes their participant record only. It does not change the
              auction participant count automatically.
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
            }}
          >
            {deleting ? "Removing…" : "Remove"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

export default function AuctionView() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { getAuction, removeAuction } = useAuctions();
  const { products } = useProducts();
  const { can } = usePermissions();

  const [auction, setAuction] = useState<Auction | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [done, setDone] = useState(false);

  // Winner identity — resolved lazily after auction loads
  const [winnerInfo, setWinnerInfo] = useState<WinnerInfo | null>(null);

  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);
      const a = await getAuction(id);
      setAuction(a);
      setLoading(false);
    })();
  }, [id, getAuction]);

  // Fire exactly once when winnerId becomes a real UID (not null / "NO_WINNER")
  useEffect(() => {
    if (!auction?.winnerId || auction.winnerId === "NO_WINNER") return;
    fetchWinnerInfo(auction.winnerId).then(setWinnerInfo);
  }, [auction?.winnerId]);

  const handleDelete = async () => {
    if (!auction) return;
    setDeleting(true);
    try {
      await removeAuction(auction.id);
      setDone(true);
      setTimeout(() => navigate("/admin/auctions"), 700);
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

  if (!auction) {
    return (
      <Box sx={{ p: 4, textAlign: "center" }}>
        <p style={{ color: colors.textSecondary }}>Auction not found.</p>
        <Button
          onClick={() => navigate("/admin/auctions")}
          variant="contained"
          sx={{ mt: 2, bgcolor: colors.primary }}
        >
          Back
        </Button>
      </Box>
    );
  }

  const sStyle = getAuctionStatusStyle(auction.status);
  const linkedProduct = products.find((p) => p.id === auction.productId);

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
        onClick={() => navigate("/admin/auctions")}
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
        Back to Auctions
      </Button>

      {/* Hero Card */}
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
          {linkedProduct?.thumbnail && linkedProduct.thumbnail !== "null" ? (
            <Box
              component="img"
              src={linkedProduct.thumbnail}
              alt={resolveTitle(linkedProduct.title)}
              sx={{
                width: { xs: 60, md: 72 },
                height: { xs: 60, md: 72 },
                borderRadius: 3,
                objectFit: "cover",
                border: "2px solid rgba(255,255,255,0.4)",
                flexShrink: 0,
              }}
            />
          ) : (
            <Box
              sx={{
                width: { xs: 60, md: 72 },
                height: { xs: 60, md: 72 },
                borderRadius: 3,
                background: "rgba(255,255,255,0.2)",
                border: "2px solid rgba(255,255,255,0.4)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <Gavel size={32} color="#fff" />
            </Box>
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
                Auction #{auction.auctionNumber}
              </h1>
              <Chip
                icon={statusIcon(auction.status)}
                label={auction.status}
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
              <Chip
                label={auction.isActive ? "Active" : "Inactive"}
                size="small"
                sx={{
                  bgcolor: "rgba(255,255,255,0.2)",
                  color: "#fff",
                  fontWeight: 700,
                  fontSize: "0.7rem",
                }}
              />
            </Box>
            {linkedProduct && (
              <p
                style={{
                  margin: "0 0 8px",
                  color: "rgba(255,255,255,0.85)",
                  fontSize: "0.9rem",
                  fontWeight: 600,
                }}
              >
                {resolveTitle(linkedProduct.title)}
              </p>
            )}
            <Box sx={{ display: "flex", gap: 1, mt: 0.5, flexWrap: "wrap" }}>
              {[
                `Bid: ${auction.bidType}`,
                `Entry: ${auction.entryType}`,
                auction.lastOfferEnabled ? "Last Offer ON" : "Last Offer OFF",
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
              onClick={() =>
                navigate(
                  auction.bidType === "decreasing"
                    ? `/admin/auctions/${auction.id}/edit-decreasing`
                    : `/admin/auctions/${auction.id}/edit`
                )
              }
              disabled={auction.status === "ended"}
              variant="contained"
              title={
                auction.status === "ended"
                  ? "Cannot edit an ended auction"
                  : undefined
              }
              sx={{
                bgcolor:
                  auction.status === "ended"
                    ? "rgba(255,255,255,0.08)"
                    : "rgba(255,255,255,0.2)",
                color:
                  auction.status === "ended" ? "rgba(255,255,255,0.4)" : "#fff",
                textTransform: "none",
                borderRadius: 2,
                fontWeight: 600,
                border: "1px solid rgba(255,255,255,0.2)",
                "&:hover": {
                  bgcolor:
                    auction.status === "ended"
                      ? "rgba(255,255,255,0.08)"
                      : "rgba(255,255,255,0.3)",
                },
                "&.Mui-disabled": {
                  color: "rgba(255,255,255,0.38)",
                  bgcolor: "rgba(255,255,255,0.08)",
                },
                cursor: auction.status === "ended" ? "not-allowed" : "pointer",
              }}
            >
              Edit
            </Button>
            <Button
              startIcon={<Trash2 size={16} />}
              onClick={() => setDeleteDialog(true)}
              variant="contained"
              disabled={!can("auctions", "delete")}
              title={
                !can("auctions", "delete")
                  ? "You do not have permission to delete auctions"
                  : undefined
              }
              sx={{
                bgcolor: !can("auctions", "delete") ? "rgba(255,255,255,0.08)" : "rgba(239,68,68,0.75)",
                color: !can("auctions", "delete") ? "rgba(255,255,255,0.4)" : "#fff",
                textTransform: "none",
                borderRadius: 2,
                fontWeight: 600,
                border: !can("auctions", "delete") ? "1px solid rgba(255,255,255,0.2)" : "none",
                "&:hover": { 
                  bgcolor: !can("auctions", "delete") ? "rgba(255,255,255,0.08)" : "rgba(239,68,68,0.9)" 
                },
                "&.Mui-disabled": {
                  color: "rgba(255,255,255,0.38)",
                  bgcolor: "rgba(255,255,255,0.08)",
                },
                cursor: !can("auctions", "delete") ? "not-allowed" : "pointer",
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
              label: "Starting Price",
              value: `${auction.startingPrice.toFixed(2)} EGP`,
              icon: <DollarSign size={16} />,
              color: colors.primary,
            },
            {
              label: "Current Bid",
              value: `${auction.currentBid.toFixed(2)} EGP`,
              icon: <DollarSign size={16} />,
              color: "#22C55E",
            },
            {
              label: "Participants",
              value: auction.totalParticipants,
              icon: <Users size={16} />,
              color: "#0EA5E9",
            },
            {
              label: "Total Bids",
              value: auction.totalBids,
              icon: <Gavel size={16} />,
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

      {/* Details Card */}
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
          <Gavel size={18} style={{ color: colors.primary }} />
          <span style={{ fontWeight: 700, color: colors.textPrimary }}>
            Auction Details
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
                  icon={statusIcon(auction.status)}
                  label={auction.status}
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
                  label={auction.isActive ? "Active" : "Inactive"}
                  size="small"
                  sx={{
                    bgcolor: auction.isActive ? "#DCFCE7" : "#FEE2E2",
                    color: auction.isActive ? "#22C55E" : "#EF4444",
                    fontWeight: 700,
                  }}
                />
              ),
            },
            {
              label: "Product",
              value: linkedProduct ? (
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  {linkedProduct.thumbnail &&
                    linkedProduct.thumbnail !== "null" && (
                      <Box
                        component="img"
                        src={linkedProduct.thumbnail}
                        alt={resolveTitle(linkedProduct.title)}
                        sx={{
                          width: 28,
                          height: 28,
                          borderRadius: 1,
                          objectFit: "cover",
                        }}
                      />
                    )}
                  <span
                    style={{
                      fontSize: "0.875rem",
                      fontWeight: 600,
                      color: colors.textPrimary,
                    }}
                  >
                    {resolveTitle(linkedProduct.title)}
                  </span>
                </Box>
              ) : (
                <span
                  style={{
                    fontSize: "0.85rem",
                    fontFamily: "monospace",
                    background: colors.primaryBg,
                    color: colors.primary,
                    padding: "3px 10px",
                    borderRadius: 6,
                    fontWeight: 600,
                  }}
                >
                  {auction.productId}
                </span>
              ),
            },
            {
              label: "Bid Type",
              value: (
                <Box
                  sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}
                >
                  <Chip
                    label={auction.bidType}
                    size="small"
                    sx={{
                      bgcolor:
                        auction.bidType === "fixed" ? "#EFF6FF" : "#F3E8FF",
                      color:
                        auction.bidType === "fixed" ? "#3B82F6" : "#7C3AED",
                      fontWeight: 700,
                      textTransform: "capitalize",
                      width: "fit-content",
                    }}
                  />
                  {auction.bidType === "fixed" &&
                    auction.fixedBidValue != null && (
                      <span
                        style={{
                          fontSize: "0.82rem",
                          color: colors.textSecondary,
                        }}
                      >
                        Fixed amount:{" "}
                        <strong style={{ color: colors.textPrimary }}>
                          {auction.fixedBidValue.toFixed(2)} EGP
                        </strong>
                      </span>
                    )}
                </Box>
              ),
            },
            {
              label: "Entry",
              value:
                auction.entryType === "paid" ? (
                  <span style={{ fontWeight: 600, color: colors.warning }}>
                    Paid — {auction.entryFee} EGP
                  </span>
                ) : (
                  <Chip
                    label="Free"
                    size="small"
                    sx={{
                      bgcolor: colors.successBg,
                      color: colors.success,
                      fontWeight: 700,
                    }}
                  />
                ),
            },
            {
              label: "Min. Increment",
              value: (
                <span style={{ fontWeight: 700, color: colors.textPrimary }}>
                  {auction.minimumIncrement.toFixed(2)} EGP
                </span>
              ),
            },
            ...(auction.maximumBidLimit != null
              ? [
                  {
                    label: "Max Bid Limit",
                    value: (
                      <span style={{ fontWeight: 700, color: colors.textPrimary }}>
                        {auction.maximumBidLimit.toFixed(2)} EGP
                      </span>
                    ),
                  },
                ]
              : []),
            ...(auction.minimumPrice != null
              ? [
                  {
                    label: "Minimum Price",
                    value: (
                      <span style={{ fontWeight: 700, color: colors.textPrimary }}>
                        {auction.minimumPrice.toFixed(2)} EGP
                      </span>
                    ),
                  },
                ]
              : []),
            {
              label: "Last Offer",
              value: (
                <Chip
                  label={auction.lastOfferEnabled ? "Enabled" : "Disabled"}
                  size="small"
                  sx={{
                    bgcolor: auction.lastOfferEnabled
                      ? colors.successBg
                      : colors.muted,
                    color: auction.lastOfferEnabled
                      ? colors.success
                      : colors.textMuted,
                    fontWeight: 700,
                  }}
                />
              ),
            },
            {
              label: "Start Time",
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
                    {auction.startTime.toLocaleString()}
                  </span>
                </Box>
              ),
            },
            {
              label: "End Time",
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
                    {auction.endTime.toLocaleString()}
                  </span>
                </Box>
              ),
            },
            {
              label: "Winner",
              value: !auction.winnerId ? (
                // No winner set yet
                <span style={{ color: colors.textMuted, fontSize: "0.85rem" }}>
                  —
                </span>
              ) : auction.winnerId === "NO_WINNER" ? (
                <Chip
                  label="No Winner"
                  size="small"
                  sx={{ bgcolor: "#F1F5F9", color: "#64748B", fontWeight: 700 }}
                />
              ) : (
                // ── Real winner: UID pill + resolved name + email ───────────
                // Cost: 1 extra getDoc, fires once, result cached in winnerInfo state
                <Box
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 0.7,
                    cursor: "pointer",
                    p: 1.2,
                    borderRadius: 2,
                    border: `1px solid ${colors.primary}`,
                    backgroundColor: colors.primaryBg,
                    transition: "all 0.2s ease",

                    "&:hover": {
                     
                      transform: "translateY(-2px)",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.1)",

                      "& span": {
                        color: "#fff",
                      },
                    },
                  }}
                >
                  {/* UID — always visible immediately */}
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.8 }}>
                    <User
                      size={13}
                      style={{ color: colors.textMuted, flexShrink: 0 }}
                    />
                    <span
                      style={{
                        fontSize: "0.78rem",
                        fontFamily: "monospace",
                        background: colors.primaryBg,
                        color: colors.primary,
                        padding: "2px 8px",
                        borderRadius: 5,
                        fontWeight: 600,
                        wordBreak: "break-all",
                      }}
                    >
                      {auction.winnerId}
                    </span>
                  </Box>
                  {/* Resolved name + email — appear once the single getDoc completes */}
                  {winnerInfo ? (
                    <Box
                      sx={{
                        pl: 0.2,
                        display: "flex",
                        flexDirection: "column",
                        gap: 0.2,
                      }}
                    >
                      <span
                        style={{
                          fontSize: "0.88rem",
                          fontWeight: 700,
                          color: colors.textPrimary,
                        }}
                      >
                        {winnerInfo.name}
                      </span>
                      <span
                        style={{
                          fontSize: "0.78rem",
                          color: colors.textSecondary,
                        }}
                      >
                        {winnerInfo.email}
                      </span>
                    </Box>
                  ) : (
                    <span
                      style={{
                        fontSize: "0.75rem",
                        color: colors.textMuted,
                        paddingLeft: 0.2,
                        fontStyle: "italic",
                      }}
                    >
                      Resolving…
                    </span>
                  )}
                </Box>
              ),
            },
            {
              label: "Winning Bid",
              value:
                auction.winningBid != null ? (
                  <span style={{ fontWeight: 700, color: "#22C55E" }}>
                    {auction.winningBid.toFixed(2)} EGP
                  </span>
                ) : (
                  <span
                    style={{ color: colors.textMuted, fontSize: "0.85rem" }}
                  >
                    —
                  </span>
                ),
            },
            {
              label: "Created At",
              value: (
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Clock size={14} style={{ color: colors.textMuted }} />
                  <span
                    style={{
                      fontSize: "0.9rem",
                      color: colors.textPrimary,
                      fontWeight: 500,
                    }}
                  >
                    {auction.createdAt.toLocaleDateString()}
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
        </Box>
      </Paper>

      {/* ── Participants (same details as Auction Participants page) ── */}
      <AuctionParticipantsSection
        auctionId={auction.id}
        auctionNumber={auction.auctionNumber}
      />

      {/* ── Chat Panel (read-only admin view) ── */}
      {auction.enableChat && (
        <Paper
          elevation={0}
          sx={{
            borderRadius: 3,
            border: `1px solid ${colors.border}`,
            overflow: "hidden",
            mt: 3,
            background: "#0d1723",
          }}
        >
          <AuctionChat
            auctionId={auction.id}
            userId="admin"
            userName="Admin"
            isEnded={auction.status === "ended"}
            isLive={auction.status === "live"}
            auctionNumber={auction.auctionNumber}
            readOnly
            isModerator
          />
        </Paper>
      )}

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
          <AlertTriangle size={22} /> Confirm Deletion
        </DialogTitle>
        <DialogContent>
          <p style={{ color: colors.textPrimary, marginBottom: 16 }}>
            Are you sure you want to delete{" "}
            <strong>Auction #{auction.auctionNumber}</strong>? This cannot be
            undone.
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
