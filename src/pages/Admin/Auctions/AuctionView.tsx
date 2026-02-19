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
  Gavel,
  DollarSign,
  Users,
  Calendar,
  Clock,
  AlertTriangle,
  Check,
  Radio,
  XCircle,
  CheckCircle2,
  Tag,
  TrendingUp,
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { colors } from "../Products/products-data";
import {
  getAuctionStatusStyle,
  type AuctionStatus,
  type Auction,
} from "./auctions-data";
import { useAuctions } from "@/store/AdminContext/AuctionContext/AuctionContext";

const statusIcon = (s: AuctionStatus) =>
  s === "live" ? (
    <Radio size={14} />
  ) : s === "upcoming" ? (
    <Clock size={14} />
  ) : s === "ended" ? (
    <CheckCircle2 size={14} />
  ) : (
    <XCircle size={14} />
  );

export default function AuctionView() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { getAuction, removeAuction, changeStatus } = useAuctions();

  const [auction, setAuction] = useState<Auction | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);
      const a = await getAuction(id);
      setAuction(a);
      setLoading(false);
    })();
  }, [id, getAuction]);

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

  return (
    <Box
      sx={{
        width :"100%",
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
          {/* Icon */}
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
            </Box>
            <Box sx={{ display: "flex", gap: 1, mt: 1.5, flexWrap: "wrap" }}>
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
              onClick={() => navigate(`/admin/auctions/${auction.id}/edit`)}
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
              value: `$${auction.startingPrice.toFixed(2)}`,
              icon: <DollarSign size={16} />,
              color: colors.primary,
            },
            {
              label: "Current Bid",
              value: `$${auction.currentBid.toFixed(2)}`,
              icon: <TrendingUp size={16} />,
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
              label: "Product ID",
              value: (
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
                <Chip
                  label={auction.bidType}
                  size="small"
                  sx={{
                    bgcolor:
                      auction.bidType === "fixed" ? "#EFF6FF" : "#F3E8FF",
                    color: auction.bidType === "fixed" ? "#3B82F6" : "#7C3AED",
                    fontWeight: 700,
                    textTransform: "capitalize",
                  }}
                />
              ),
            },
            {
              label: "Entry",
              value:
                auction.entryType === "paid" ? (
                  <span style={{ fontWeight: 600, color: colors.warning }}>
                    Paid — ${auction.entryFee}
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
                  ${auction.minimumIncrement.toFixed(2)}
                </span>
              ),
            },
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
              label: "Winner ID",
              value: auction.winnerId ? (
                <span
                  style={{
                    fontSize: "0.85rem",
                    fontFamily: "monospace",
                    color: colors.textPrimary,
                  }}
                >
                  {auction.winnerId}
                </span>
              ) : (
                <span style={{ color: colors.textMuted, fontSize: "0.85rem" }}>
                  —
                </span>
              ),
            },
            {
              label: "Winning Bid",
              value:
                auction.winningBid != null ? (
                  <span style={{ fontWeight: 700, color: "#22C55E" }}>
                    ${auction.winningBid.toFixed(2)}
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

          {/* Quick status change */}
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
              Quick Status Change
            </p>
            <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
              {(
                ["upcoming", "live", "ended", "cancelled"] as AuctionStatus[]
              ).map((s) => {
                const ss = getAuctionStatusStyle(s);
                const active = auction.status === s;
                return (
                  <button
                    key={s}
                    disabled={active}
                    onClick={async () => {
                      await changeStatus(auction.id, s);
                      setAuction((prev) =>
                        prev ? { ...prev, status: s } : prev,
                      );
                    }}
                    style={{
                      padding: "5px 16px",
                      borderRadius: 99,
                      fontSize: "0.78rem",
                      fontWeight: 600,
                      cursor: active ? "default" : "pointer",
                      transition: "all 0.15s",
                      border: `1.5px solid ${active ? ss.color : colors.border}`,
                      background: active ? ss.bg : "#fff",
                      color: active ? ss.color : colors.textSecondary,
                      opacity: active ? 1 : 0.8,
                    }}
                  >
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </button>
                );
              })}
            </Box>
          </Box>
        </Box>
      </Paper>

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
