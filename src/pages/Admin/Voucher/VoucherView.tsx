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
  Avatar,
} from "@mui/material";
import {
  ArrowLeft,
  Edit,
  Trash2,
  Ticket,
  AlertTriangle,
  Check,
  Users,
  Calendar,
  Clock,
  Tag,
  ShieldCheck,
  Gavel,
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { doc, getDoc, Timestamp } from "firebase/firestore";
import { db } from "@/firebase/firebase";
import { colors } from "../Products/products-data";
import {
  type Voucher,
  getVoucherStatusLabel,
  getVoucherStatusStyle,
  getVoucherTypeLabel,
  getVoucherTypeStyle,
  getUsageCount,
} from "./voucher-data";
import { useVouchers } from "@/store/AdminContext/VoucherContext/VoucherContext";

// ─── Enriched auction info for the view card ──────────────────────────────────

interface AuctionDetail {
  id: string;
  auctionNumber: number;
  productTitle: string;
  productId: string;
  status: "upcoming" | "live" | "ended";
  isActive: boolean;
}

async function fetchAuctionDetails(ids: string[]): Promise<AuctionDetail[]> {
  if (ids.length === 0) return [];
  const snaps = await Promise.all(
    ids.map((id) => getDoc(doc(db, "auctions", id))),
  );
  const results: AuctionDetail[] = [];

  for (const snap of snaps) {
    if (!snap.exists()) continue;
    const d = snap.data();
    const endTime =
      d.endTime instanceof Timestamp ? d.endTime.toDate() : new Date(d.endTime);
    const startTime =
      d.startTime instanceof Timestamp
        ? d.startTime.toDate()
        : new Date(d.startTime);
    const now = new Date();
    const status: AuctionDetail["status"] =
      now < startTime ? "upcoming" : now <= endTime ? "live" : "ended";

    // Fetch product title
    let productTitle = "";
    if (d.productId) {
      try {
        const pSnap = await getDoc(doc(db, "products", d.productId));
        productTitle = pSnap.exists() ? (pSnap.data().title ?? "") : "";
      } catch {
        productTitle = "";
      }
    }

    results.push({
      id: snap.id,
      auctionNumber: d.auctionNumber ?? 0,
      productTitle,
      productId: d.productId ?? "",
      status,
      isActive: d.isActive ?? true,
    });
  }
  return results;
}

function statusColor(s: AuctionDetail["status"]): string {
  if (s === "live") return "#4ade80";
  if (s === "upcoming") return "#93c5fd";
  return "#f87171";
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function VoucherView() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { getVoucher, removeVoucher } = useVouchers();

  const [voucher, setVoucher] = useState<Voucher | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [done, setDone] = useState(false);

  // Enriched auction details for the applicable-auctions card
  const [auctionDetails, setAuctionDetails] = useState<AuctionDetail[]>([]);
  const [loadingAuctions, setLoadingAuctions] = useState(false);

  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);
      const v = await getVoucher(id);
      setVoucher(v);
      setLoading(false);
      // Fetch auction details once voucher is loaded
      if (v && v.applicableAuctions.length > 0) {
        setLoadingAuctions(true);
        fetchAuctionDetails(v.applicableAuctions)
          .then(setAuctionDetails)
          .catch(() => setAuctionDetails([]))
          .finally(() => setLoadingAuctions(false));
      }
    })();
  }, [id, getVoucher]);

  const handleDelete = async () => {
    if (!voucher) return;
    setDeleting(true);
    try {
      await removeVoucher(voucher.id);
      setDone(true);
      setTimeout(() => navigate("/admin/vouchers"), 700);
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

  if (!voucher) {
    return (
      <Box sx={{ p: 4, textAlign: "center" }}>
        <p style={{ color: colors.textSecondary }}>Voucher not found.</p>
        <Button
          onClick={() => navigate("/admin/vouchers")}
          variant="contained"
          sx={{ mt: 2, bgcolor: colors.primary }}
        >
          Back
        </Button>
      </Box>
    );
  }

  const statusLabel = getVoucherStatusLabel(voucher);
  const statusStyle = getVoucherStatusStyle(statusLabel);
  const typeLabel = getVoucherTypeLabel(voucher.type);
  const typeStyle = getVoucherTypeStyle(voucher.type);
  const usageCount = getUsageCount(voucher);
  const usagePct = Math.min((usageCount / voucher.maxUses) * 100, 100);
  const hasAmount =
    voucher.type === "discount" || voucher.type === "entry_discount";

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
        onClick={() => navigate("/admin/vouchers")}
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
        Back to Vouchers
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
            <Ticket size={32} color="#fff" />
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
                  fontSize: "1.6rem",
                  fontWeight: 700,
                  fontFamily: "monospace",
                  letterSpacing: "0.08em",
                }}
              >
                {voucher.code}
              </h1>
              <Chip
                label={
                  statusLabel.charAt(0).toUpperCase() + statusLabel.slice(1)
                }
                size="small"
                sx={{
                  bgcolor: "rgba(255,255,255,0.25)",
                  color: "#fff",
                  fontWeight: 700,
                  fontSize: "0.7rem",
                }}
              />
            </Box>
            <Box sx={{ display: "flex", gap: 1, mt: 0.5, flexWrap: "wrap" }}>
              {[
                typeLabel,
                voucher.isActive ? "Active" : "Inactive",
                `${usageCount} / ${voucher.maxUses} uses`,
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

          <Box sx={{ display: "flex", gap: 1.5, flexShrink: 0 }}>
            <Button
              startIcon={<Edit size={16} />}
              onClick={() => navigate(`/admin/vouchers/${voucher.id}/edit`)}
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
              label: "Type",
              value: typeLabel,
              icon: <Tag size={16} />,
              color: typeStyle.color,
            },
            {
              label: hasAmount
                ? voucher.type === "entry_discount"
                  ? "Entry Discount"
                  : "Final Discount"
                : "Discount",
              value:
                hasAmount && voucher.discountAmount != null
                  ? `${voucher.discountAmount} EGP`
                  : "—",
              icon: <ShieldCheck size={16} />,
              color: typeStyle.color,
            },
            {
              label: "Total Uses",
              value: `${usageCount} / ${voucher.maxUses}`,
              icon: <Users size={16} />,
              color: usageCount >= voucher.maxUses ? colors.error : "#0EA5E9",
            },
            {
              label: "Auctions",
              value:
                voucher.applicableAuctions.length === 0
                  ? "All"
                  : voucher.applicableAuctions.length,
              icon: <Gavel size={16} />,
              color: colors.primary,
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

      {/* ── Details + Applicable Auctions grid ── */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
          gap: 3,
          mb: 3,
        }}
      >
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
            <Ticket size={18} style={{ color: colors.primary }} />
            <span style={{ fontWeight: 700, color: colors.textPrimary }}>
              Voucher Details
            </span>
          </Box>
          <Box
            sx={{
              p: { xs: 2, md: 3 },
              display: "flex",
              flexDirection: "column",
              gap: 2.5,
            }}
          >
            {[
              {
                label: "Status",
                value: (
                  <Chip
                    label={
                      statusLabel.charAt(0).toUpperCase() + statusLabel.slice(1)
                    }
                    size="small"
                    sx={{
                      bgcolor: statusStyle.bg,
                      color: statusStyle.color,
                      fontWeight: 700,
                    }}
                  />
                ),
              },
              {
                label: "Active",
                value: (
                  <Chip
                    label={voucher.isActive ? "Active" : "Inactive"}
                    size="small"
                    sx={{
                      bgcolor: voucher.isActive ? "#DCFCE7" : "#FEE2E2",
                      color: voucher.isActive ? "#22C55E" : "#EF4444",
                      fontWeight: 700,
                    }}
                  />
                ),
              },
              {
                label: "Type",
                value: (
                  <Chip
                    label={typeLabel}
                    size="small"
                    sx={{
                      bgcolor: typeStyle.bg,
                      color: typeStyle.color,
                      fontWeight: 700,
                    }}
                  />
                ),
              },
              ...(hasAmount && voucher.discountAmount != null
                ? [
                    {
                      label:
                        voucher.type === "entry_discount"
                          ? "Entry Fee Discount"
                          : "Final Price Discount",
                      value: (
                        <span
                          style={{
                            fontWeight: 700,
                            fontSize: "1rem",
                            color: typeStyle.color,
                          }}
                        >
                          {voucher.discountAmount} EGP
                        </span>
                      ),
                    },
                  ]
                : []),
              {
                label: "Max Uses",
                value: (
                  <span style={{ fontWeight: 700, color: colors.textPrimary }}>
                    {voucher.maxUses}
                  </span>
                ),
              },
              {
                label: "Expiry Date",
                value: (
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Calendar size={14} style={{ color: colors.textMuted }} />
                    <span
                      style={{
                        fontWeight: 500,
                        color:
                          new Date() > voucher.expiryDate
                            ? colors.error
                            : colors.textPrimary,
                      }}
                    >
                      {voucher.expiryDate.toLocaleString()}
                    </span>
                  </Box>
                ),
              },
              {
                label: "Created At",
                value: (
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Clock size={14} style={{ color: colors.textMuted }} />
                    <span
                      style={{ fontWeight: 500, color: colors.textPrimary }}
                    >
                      {voucher.createdAt.toLocaleDateString()}
                    </span>
                  </Box>
                ),
              },
            ].map(({ label, value }) => (
              <Box key={label}>
                <p
                  style={{
                    margin: "0 0 6px",
                    fontSize: "0.72rem",
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

            {/* Usage progress bar */}
            <Box>
              <p
                style={{
                  margin: "0 0 6px",
                  fontSize: "0.72rem",
                  color: colors.textMuted,
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                }}
              >
                Usage Progress
              </p>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  mb: 0.5,
                }}
              >
                <span
                  style={{ fontSize: "0.82rem", color: colors.textSecondary }}
                >
                  {usageCount} used
                </span>
                <span
                  style={{ fontSize: "0.82rem", color: colors.textSecondary }}
                >
                  {voucher.maxUses - usageCount} remaining
                </span>
              </Box>
              <Box
                sx={{
                  height: 8,
                  borderRadius: 99,
                  bgcolor: colors.border,
                  overflow: "hidden",
                }}
              >
                <Box
                  sx={{
                    height: "100%",
                    width: `${usagePct}%`,
                    borderRadius: 99,
                    bgcolor:
                      usagePct >= 100
                        ? colors.error
                        : usagePct >= 75
                          ? colors.warning
                          : "#22C55E",
                    transition: "width 0.5s ease",
                  }}
                />
              </Box>
              <span
                style={{
                  fontSize: "0.75rem",
                  color: colors.textMuted,
                  marginTop: 4,
                  display: "block",
                }}
              >
                {usagePct.toFixed(0)}% used
              </span>
            </Box>
          </Box>
        </Paper>

        {/* ── Applicable Auctions Card ── */}
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
              Applicable Auctions
              <span
                style={{
                  marginLeft: 8,
                  fontSize: "0.75rem",
                  background: colors.primaryBg,
                  color: colors.primary,
                  padding: "2px 8px",
                  borderRadius: 99,
                  fontWeight: 700,
                }}
              >
                {voucher.applicableAuctions.length === 0
                  ? "All"
                  : voucher.applicableAuctions.length}
              </span>
            </span>
          </Box>
          <Box sx={{ p: { xs: 2, md: 3 } }}>
            {voucher.applicableAuctions.length === 0 ? (
              <Box
                sx={{
                  p: 3,
                  borderRadius: 2,
                  bgcolor: colors.primaryBg,
                  border: `1px solid ${colors.primaryRing}`,
                  textAlign: "center",
                }}
              >
                <Gavel
                  size={28}
                  style={{
                    color: colors.primary,
                    margin: "0 auto 8px",
                    display: "block",
                  }}
                />
                <p
                  style={{
                    margin: 0,
                    fontWeight: 600,
                    color: colors.primary,
                    fontSize: "0.875rem",
                  }}
                >
                  Applies to all auctions
                </p>
                <p
                  style={{
                    margin: "4px 0 0",
                    color: colors.textSecondary,
                    fontSize: "0.8rem",
                  }}
                >
                  No auction restriction set
                </p>
              </Box>
            ) : loadingAuctions ? (
              <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
                <CircularProgress size={24} sx={{ color: colors.primary }} />
              </Box>
            ) : (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                {auctionDetails.map((auction) => (
                  <Box
                    key={auction.id}
                    onClick={() => navigate(`/admin/auctions/${auction.id}`)}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1.5,
                      p: 1.5,
                      borderRadius: 2,
                      border: `1px solid ${colors.border}`,
                      cursor: "pointer",
                      transition: "all 0.15s",
                      "&:hover": {
                        bgcolor: colors.primaryBg,
                        borderColor: colors.primary,
                      },
                    }}
                  >
                    {/* Status dot */}
                    <Box
                      sx={{
                        width: 10,
                        height: 10,
                        borderRadius: "50%",
                        bgcolor: statusColor(auction.status),
                        flexShrink: 0,
                      }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p
                        style={{
                          margin: 0,
                          fontWeight: 600,
                          fontSize: "0.875rem",
                          color: colors.textPrimary,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {auction.productTitle || "—"}
                      </p>
                      <p
                        style={{
                          margin: 0,
                          fontSize: "0.75rem",
                          color: colors.textMuted,
                        }}
                      >
                        Auction #{auction.auctionNumber} ·{" "}
                        <span
                          style={{
                            color: statusColor(auction.status),
                            fontWeight: 600,
                            textTransform: "capitalize",
                          }}
                        >
                          {auction.status}
                        </span>
                      </p>
                    </div>
                    <Chip
                      label={auction.isActive ? "Active" : "Inactive"}
                      size="small"
                      sx={{
                        bgcolor: auction.isActive ? "#DCFCE7" : "#FEE2E2",
                        color: auction.isActive ? "#22C55E" : "#EF4444",
                        fontWeight: 700,
                        fontSize: "0.65rem",
                        flexShrink: 0,
                      }}
                    />
                  </Box>
                ))}
                {/* IDs not found in Firestore */}
                {voucher.applicableAuctions
                  .filter((aid) => !auctionDetails.find((a) => a.id === aid))
                  .map((aid) => (
                    <Box
                      key={aid}
                      sx={{
                        p: 1.5,
                        borderRadius: 2,
                        border: `1px solid ${colors.border}`,
                        bgcolor: colors.muted,
                      }}
                    >
                      <span
                        style={{
                          fontFamily: "monospace",
                          fontSize: "0.78rem",
                          color: colors.textMuted,
                        }}
                      >
                        {aid}
                      </span>
                    </Box>
                  ))}
              </Box>
            )}
          </Box>
        </Paper>
      </Box>

      {/* ── Used By ── */}
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
            px: 3,
            py: 2.5,
            borderBottom: `1px solid ${colors.border}`,
            display: "flex",
            alignItems: "center",
            gap: 1.5,
          }}
        >
          <Users size={18} style={{ color: colors.primary }} />
          <span style={{ fontWeight: 700, color: colors.textPrimary }}>
            Used By
            <span
              style={{
                marginLeft: 8,
                fontSize: "0.75rem",
                background: colors.primaryBg,
                color: colors.primary,
                padding: "2px 8px",
                borderRadius: 99,
                fontWeight: 700,
              }}
            >
              {usageCount}
            </span>
          </span>
        </Box>

        {voucher.usedBy.length === 0 ? (
          <Box sx={{ p: 4, textAlign: "center" }}>
            <Users
              size={36}
              style={{
                color: colors.textMuted,
                margin: "0 auto 10px",
                display: "block",
              }}
            />
            <p
              style={{
                color: colors.textSecondary,
                fontWeight: 600,
                margin: 0,
              }}
            >
              Not used yet
            </p>
            <p
              style={{
                color: colors.textMuted,
                fontSize: "0.85rem",
                margin: "4px 0 0",
              }}
            >
              This voucher code hasn't been redeemed by anyone yet.
            </p>
          </Box>
        ) : (
          <Box sx={{ p: 2 }}>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: {
                  xs: "1fr",
                  sm: "1fr 1fr",
                  md: "1fr 1fr 1fr",
                },
                gap: 1.5,
              }}
            >
              {voucher.usedBy.map((entry, i) => (
                <Box
                  key={`${entry.userId}-${i}`}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1.5,
                    p: 1.5,
                    borderRadius: 2,
                    border: `1px solid ${colors.border}`,
                    bgcolor: colors.muted,
                  }}
                >
                  <Avatar
                    sx={{
                      width: 36,
                      height: 36,
                      bgcolor: colors.primary,
                      fontSize: "0.875rem",
                      fontWeight: 700,
                      flexShrink: 0,
                    }}
                  >
                    {entry.userName.charAt(0).toUpperCase()}
                  </Avatar>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p
                      style={{
                        margin: 0,
                        fontWeight: 600,
                        fontSize: "0.875rem",
                        color: colors.textPrimary,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {entry.userName}
                    </p>
                    <p
                      style={{
                        margin: "2px 0 0",
                        fontSize: "0.72rem",
                        color: colors.textMuted,
                      }}
                    >
                      {entry.usedAt.toLocaleDateString()}{" "}
                      {entry.usedAt.toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </Box>
              ))}
            </Box>
          </Box>
        )}
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
            Are you sure you want to delete voucher{" "}
            <strong style={{ fontFamily: "monospace", color: colors.primary }}>
              {voucher.code}
            </strong>
            ? This cannot be undone.
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
