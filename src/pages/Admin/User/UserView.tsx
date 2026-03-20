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
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from "@mui/material";
import {
  ArrowLeft,
  ShieldOff,
  ShieldCheck,
  Trash2,
  AlertTriangle,
  Crown,
  Users,
  Gavel,
  Calendar,
  Phone,
  Mail,
  CheckCircle2,
  XCircle,
  Ban,
  UserX,
  UserCheck,
  Lock,
  StickyNote,
  Save,
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { colors } from "../Products/products-data";
import type { AppUser, UserRole } from "./users-data";
import { getRoleStyle, USER_ROLES } from "./users-data";
import {
  fetchUser,
  blockUserService,
  deleteUserService,
  setUserRoleService,
  restrictUserFromAuctionFull,
  removeAuctionRestrictionFull,
  fetchUserRestrictions,
  saveInternalNotes,
} from "@/service/users/userService";
import { fetchAuctions } from "@/service/auctions/auctionService";
import type { Auction } from "@/pages/Admin/Auctions/auctions-data";
import { useAuth } from "@/store/AuthContext/AuthContext";
import toast from "react-hot-toast";

const DetailRow = ({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) => (
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
      {label}
    </p>
    <div>{value}</div>
  </Box>
);

export default function UserView() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { role: currentRole } = useAuth();

  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [restrictedIds, setRestrictedIds] = useState<string[]>([]);

  const [blockDialog, setBlockDialog] = useState(false);
  const [blockLoading, setBlockLoading] = useState(false);

  const [deleteDialog, setDeleteDialog] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");

  const [roleDialog, setRoleDialog] = useState(false);
  const [selectedRole, setSelectedRole] = useState<UserRole>("user");
  const [roleLoading, setRoleLoading] = useState(false);

  const [restrictTarget, setRestrictTarget] = useState<Auction | null>(null);
  const [restrictLoading, setRestrictLoading] = useState(false);

  // Internal notes
  const [notesEdit, setNotesEdit] = useState("");
  const [notesSaving, setNotesSaving] = useState(false);

  const load = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [u, allAuctions, restricted] = await Promise.all([
        fetchUser(id),
        fetchAuctions(),
        fetchUserRestrictions(id),
      ]);
      setUser(u);
      setAuctions(allAuctions);
      setRestrictedIds(restricted);
      if (u) setSelectedRole(u.role);
      if (u) setNotesEdit(u.internalNotes ?? "");
    } catch (err: any) {
      toast.error("Failed to load user: " + (err?.message ?? ""));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [id]);

  const handleBlock = async () => {
    if (!user) return;
    setBlockLoading(true);
    try {
      const newState = !user.isBlocked;
      await blockUserService(user.id, newState);
      setUser((prev) => (prev ? { ...prev, isBlocked: newState } : prev));
      toast.success(newState ? "User blocked" : "User unblocked");
      setBlockDialog(false);
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to update status");
    } finally {
      setBlockLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!user || deleteConfirm !== user.email) return;
    setDeleteLoading(true);
    try {
      await deleteUserService(user.id);
      toast.success("User permanently deleted");
      navigate("/admin/users");
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to delete user");
      setDeleteLoading(false);
    }
  };

  const handleRoleChange = async () => {
    if (!user) return;
    setRoleLoading(true);
    try {
      await setUserRoleService(user.id, selectedRole);
      setUser((prev) => (prev ? { ...prev, role: selectedRole } : prev));
      toast.success(`Role updated to "${getRoleStyle(selectedRole).label}"`);
      setRoleDialog(false);
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to update role");
    } finally {
      setRoleLoading(false);
    }
  };

  const handleRestrict = async (auction: Auction) => {
    if (!user) return;
    setRestrictTarget(auction);
    setRestrictLoading(true);
    try {
      if (restrictedIds.includes(auction.id)) {
        await removeAuctionRestrictionFull(user.id, auction.id);
        setRestrictedIds((prev) => prev.filter((i) => i !== auction.id));
        toast.success(
          `Restriction removed from Auction #${auction.auctionNumber}`,
        );
      } else {
        await restrictUserFromAuctionFull(user.id, auction.id, user.email);
        setRestrictedIds((prev) => [...prev, auction.id]);
        toast.success(`User restricted from Auction #${auction.auctionNumber}`);
      }
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to update restriction");
    } finally {
      setRestrictLoading(false);
      setRestrictTarget(null);
    }
  };

  const handleSaveNotes = async () => {
    if (!user) return;
    setNotesSaving(true);
    try {
      await saveInternalNotes(user.id, notesEdit);
      setUser((prev) => (prev ? { ...prev, internalNotes: notesEdit } : prev));
      toast.success("Notes saved");
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to save notes");
    } finally {
      setNotesSaving(false);
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

  if (!user) {
    return (
      <Box sx={{ p: 4, textAlign: "center" }}>
        <p style={{ color: colors.textSecondary }}>User not found.</p>
        <Button
          onClick={() => navigate("/admin/users")}
          variant="contained"
          sx={{ mt: 2, bgcolor: colors.primary }}
        >
          Back
        </Button>
      </Box>
    );
  }

  const rStyle = getRoleStyle(user.role);

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
      <Button
        startIcon={<ArrowLeft size={16} />}
        onClick={() => navigate("/admin/users")}
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
        Back to Users
      </Button>

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
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
          <Avatar
            src={user.profileImage ?? undefined}
            sx={{
              width: { xs: 64, md: 80 },
              height: { xs: 64, md: 80 },
              border: "3px solid rgba(255,255,255,0.4)",
              fontSize: "1.5rem",
              fontWeight: 700,
              bgcolor: "rgba(255,255,255,0.2)",
              color: "#fff",
              flexShrink: 0,
            }}
          >
            {user.firstName.charAt(0)}
            {user.lastName.charAt(0)}
          </Avatar>
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
                {user.fullName}
              </h1>
              <Chip
                label={rStyle.label}
                size="small"
                sx={{
                  bgcolor: "rgba(255,255,255,0.25)",
                  color: "#fff",
                  fontWeight: 700,
                  fontSize: "0.7rem",
                }}
              />
              {user.isBlocked && (
                <Chip
                  icon={<UserX size={12} />}
                  label="Blocked"
                  size="small"
                  sx={{
                    bgcolor: "rgba(239,68,68,0.7)",
                    color: "#fff",
                    fontWeight: 700,
                    fontSize: "0.7rem",
                    "& .MuiChip-icon": { color: "#fff" },
                  }}
                />
              )}
              {user.verified && (
                <Chip
                  icon={<CheckCircle2 size={12} />}
                  label="Verified"
                  size="small"
                  sx={{
                    bgcolor: "rgba(34,197,94,0.7)",
                    color: "#fff",
                    fontWeight: 700,
                    fontSize: "0.7rem",
                    "& .MuiChip-icon": { color: "#fff" },
                  }}
                />
              )}
            </Box>
            <p
              style={{
                margin: "0 0 8px",
                color: "rgba(255,255,255,0.85)",
                fontSize: "0.9rem",
              }}
            >
              {user.email}
            </p>
            <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
              {[
                `${user.totalBids} Bids`,
                `${user.totalWins} Wins`,
                `Joined ${user.createdAt.toLocaleDateString()}`,
              ].map((t) => (
                <span
                  key={t}
                  style={{
                    fontSize: "0.75rem",
                    background: "rgba(255,255,255,0.2)",
                    color: "#fff",
                    padding: "3px 10px",
                    borderRadius: 99,
                    fontWeight: 600,
                  }}
                >
                  {t}
                </span>
              ))}
            </Box>
          </Box>
          <Box
            sx={{ display: "flex", gap: 1.5, flexWrap: "wrap", flexShrink: 0 }}
          >
            <Button
              startIcon={
                user.isBlocked ? (
                  <ShieldCheck size={16} />
                ) : (
                  <ShieldOff size={16} />
                )
              }
              onClick={() => setBlockDialog(true)}
              variant="contained"
              sx={{
                bgcolor: user.isBlocked
                  ? "rgba(34,197,94,0.7)"
                  : "rgba(239,68,68,0.7)",
                color: "#fff",
                textTransform: "none",
                borderRadius: 2,
                fontWeight: 600,
                border: "1px solid rgba(255,255,255,0.2)",
                "&:hover": {
                  bgcolor: user.isBlocked
                    ? "rgba(34,197,94,0.9)"
                    : "rgba(239,68,68,0.9)",
                },
              }}
            >
              {user.isBlocked ? "Unblock" : "Block"}
            </Button>
            <Button
              startIcon={<Trash2 size={16} />}
              onClick={() => {
                setDeleteConfirm("");
                setDeleteDialog(true);
              }}
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
              label: "Total Bids",
              value: user.totalBids,
              icon: <Gavel size={16} />,
              color: colors.primary,
            },
            {
              label: "Total Wins",
              value: user.totalWins,
              icon: <Crown size={16} />,
              color: "#D97706",
            },
            {
              label: "Auctions Joined",
              value: user.auctions?.length ?? 0,
              icon: <Gavel size={16} />,
              color: "#7C3AED",
            },
            {
              label: "Restrictions",
              value: restrictedIds.length,
              icon: <Ban size={16} />,
              color: "#EF4444",
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

      {/* ── Details + Auctions ──────────────────────────────────────────── */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", lg: "1fr 1fr" },
          gap: 3,
          mb: 3,
        }}
      >
        {/* User Details */}
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
            <Users size={18} style={{ color: colors.primary }} />
            <span style={{ fontWeight: 700, color: colors.textPrimary }}>
              User Details
            </span>
          </Box>
          <Box
            sx={{
              p: 3,
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 3,
            }}
          >
            <DetailRow
              label="First Name"
              value={
                <span style={{ fontWeight: 600, color: colors.textPrimary }}>
                  {user.firstName}
                </span>
              }
            />
            <DetailRow
              label="Last Name"
              value={
                <span style={{ fontWeight: 600, color: colors.textPrimary }}>
                  {user.lastName}
                </span>
              }
            />
            <DetailRow
              label="Email"
              value={
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                  <Mail size={14} style={{ color: colors.textMuted }} />
                  <span
                    style={{
                      fontSize: "0.85rem",
                      color: colors.textPrimary,
                      wordBreak: "break-all",
                    }}
                  >
                    {user.email}
                  </span>
                </Box>
              }
            />
            <DetailRow
              label="Phone"
              value={
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                  <Phone size={14} style={{ color: colors.textMuted }} />
                  <span
                    style={{ fontSize: "0.85rem", color: colors.textPrimary }}
                  >
                    {user.phone || "—"}
                  </span>
                </Box>
              }
            />
            <DetailRow
              label="Status"
              value={
                <Chip
                  icon={
                    user.isBlocked ? (
                      <UserX size={12} />
                    ) : (
                      <UserCheck size={12} />
                    )
                  }
                  label={user.isBlocked ? "Blocked" : "Active"}
                  size="small"
                  sx={{
                    bgcolor: user.isBlocked ? "#FEE2E2" : "#DCFCE7",
                    color: user.isBlocked ? "#EF4444" : "#22C55E",
                    fontWeight: 700,
                    "& .MuiChip-icon": { color: "inherit" },
                  }}
                />
              }
            />
            <DetailRow
              label="Verified"
              value={
                <Chip
                  icon={
                    user.verified ? (
                      <CheckCircle2 size={12} />
                    ) : (
                      <XCircle size={12} />
                    )
                  }
                  label={user.verified ? "Verified" : "Unverified"}
                  size="small"
                  sx={{
                    bgcolor: user.verified ? "#EFF6FF" : "#F1F5F9",
                    color: user.verified ? "#3B82F6" : "#94A3B8",
                    fontWeight: 700,
                    "& .MuiChip-icon": { color: "inherit" },
                  }}
                />
              }
            />
            <DetailRow
              label="UID"
              value={
                <span
                  style={{
                    fontSize: "0.75rem",
                    fontFamily: "monospace",
                    background: colors.primaryBg,
                    color: colors.primary,
                    padding: "3px 8px",
                    borderRadius: 6,
                    display: "inline-block",
                    wordBreak: "break-all",
                  }}
                >
                  {user.id}
                </span>
              }
            />
            <DetailRow
              label="FCM Tokens"
              value={
                <span style={{ fontSize: "0.85rem", color: colors.textMuted }}>
                  {user.fcmTokens.length} device(s)
                </span>
              }
            />
            <DetailRow
              label="Created At"
              value={
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                  <Calendar size={14} style={{ color: colors.textMuted }} />
                  <span
                    style={{ fontSize: "0.82rem", color: colors.textPrimary }}
                  >
                    {user.createdAt.toLocaleString()}
                  </span>
                </Box>
              }
            />
            <DetailRow
              label="Updated At"
              value={
                <span
                  style={{ fontSize: "0.82rem", color: colors.textPrimary }}
                >
                  {user.updatedAt.toLocaleString()}
                </span>
              }
            />
          </Box>
        </Paper>

        {/* Joined Auctions */}
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
              Joined Auctions
            </span>
            <Chip
              label={user.auctions?.length ?? 0}
              size="small"
              sx={{
                ml: "auto",
                bgcolor: colors.primaryBg,
                color: colors.primary,
                fontWeight: 700,
              }}
            />
          </Box>
          <Box sx={{ maxHeight: 420, overflowY: "auto" }}>
            {!user.auctions?.length ? (
              <Box sx={{ p: 4, textAlign: "center" }}>
                <Gavel
                  size={36}
                  style={{ color: colors.textMuted, marginBottom: 8 }}
                />
                <p style={{ color: colors.textMuted, fontSize: "0.875rem" }}>
                  No auctions joined yet
                </p>
              </Box>
            ) : (
              user.auctions.map((ua, i) => {
                const auctionDoc = auctions.find((a) => a.id === ua.auctionId);
                return (
                  <Box
                    key={ua.auctionId}
                    sx={{
                      p: 2.5,
                      borderBottom:
                        i < (user.auctions?.length ?? 1) - 1
                          ? `1px solid ${colors.border}`
                          : "none",
                      "&:hover": { bgcolor: colors.muted },
                    }}
                  >
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        gap: 1,
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <p
                          style={{
                            margin: 0,
                            fontWeight: 700,
                            fontSize: "0.9rem",
                            color: colors.textPrimary,
                          }}
                        >
                          {auctionDoc ? (
                            `Auction #${auctionDoc.auctionNumber}`
                          ) : (
                            <span
                              style={{
                                fontFamily: "monospace",
                                fontSize: "0.78rem",
                                color: colors.textMuted,
                              }}
                            >
                              {ua.auctionId}
                            </span>
                          )}
                        </p>
                        {auctionDoc && (
                          <Chip
                            label={auctionDoc.status}
                            size="small"
                            sx={{
                              mt: 0.5,
                              fontSize: "0.65rem",
                              fontWeight: 700,
                              textTransform: "capitalize",
                              bgcolor:
                                auctionDoc.status === "live"
                                  ? "#DCFCE7"
                                  : auctionDoc.status === "upcoming"
                                    ? "#EFF6FF"
                                    : "#F1F5F9",
                              color:
                                auctionDoc.status === "live"
                                  ? "#22C55E"
                                  : auctionDoc.status === "upcoming"
                                    ? "#3B82F6"
                                    : "#64748B",
                            }}
                          />
                        )}
                        <p
                          style={{
                            margin: "6px 0 0",
                            fontSize: "0.78rem",
                            color: colors.textMuted,
                          }}
                        >
                          Joined: {ua.joinedAt.toLocaleDateString()} · Entry:{" "}
                          {ua.amount > 0
                            ? `${ua.amount.toLocaleString()} EGP`
                            : "Free"}
                        </p>

                        {/* ── Voucher badge ─────────────────────────────────────────────────
                            All fields (voucherUsed / voucherCode / discountApplied) are already
                            on this Firestore doc — written by the applyVoucher Cloud Function.
                            Zero extra reads: the data comes in with the subcollection load above. */}
                        {ua.voucherUsed && ua.voucherCode && (
                          <Box
                            sx={{
                              mt: 0.75,
                              display: "flex",
                              alignItems: "center",
                              gap: 0.8,
                              flexWrap: "wrap",
                            }}
                          >
                            <span
                              style={{
                                fontSize: "0.7rem",
                                fontWeight: 700,
                                background: "rgba(74,222,128,0.1)",
                                color: "#22C55E",
                                padding: "2px 9px",
                                borderRadius: 99,
                                border: "1px solid rgba(74,222,128,0.3)",
                                fontFamily: "monospace",
                                letterSpacing: "0.04em",
                              }}
                            >
                              🏷️ {ua.voucherCode}
                            </span>
                            {ua.discountApplied > 0 && (
                              <span
                                style={{
                                  fontSize: "0.7rem",
                                  color: "#22C55E",
                                  fontWeight: 600,
                                }}
                              >
                                −{ua.discountApplied.toLocaleString()} EGP saved
                              </span>
                            )}
                          </Box>
                        )}

                        {ua.totalAmount.length > 0 && (
                          <Box
                            sx={{
                              mt: 0.5,
                              display: "flex",
                              gap: 0.5,
                              flexWrap: "wrap",
                            }}
                          >
                            {ua.totalAmount.map((bid, idx) => (
                              <span
                                key={idx}
                                style={{
                                  fontSize: "0.7rem",
                                  fontWeight: 700,
                                  background: colors.primaryBg,
                                  color: colors.primary,
                                  padding: "2px 7px",
                                  borderRadius: 99,
                                }}
                              >
                                {bid.toLocaleString()} EGP
                              </span>
                            ))}
                          </Box>
                        )}
                        <p
                          style={{
                            margin: "2px 0 0",
                            fontSize: "0.72rem",
                            color: colors.textMuted,
                            fontFamily: "monospace",
                          }}
                        >
                          Payment: {ua.paymentId}
                        </p>
                      </div>
                      <Chip
                        label={ua.hasPaid ? "Paid" : "Free"}
                        size="small"
                        sx={{
                          bgcolor: ua.hasPaid ? "#DCFCE7" : "#F1F5F9",
                          color: ua.hasPaid ? "#22C55E" : "#64748B",
                          fontWeight: 700,
                          fontSize: "0.68rem",
                          flexShrink: 0,
                        }}
                      />
                    </Box>
                  </Box>
                );
              })
            )}
          </Box>
        </Paper>
      </Box>

      {/* ── Internal Notes ─────────────────────────────────────────────── */}
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
          <StickyNote size={18} style={{ color: colors.primary }} />
          <span style={{ fontWeight: 700, color: colors.textPrimary }}>
            Internal Notes
          </span>
          <span style={{ fontSize: "0.8rem", color: colors.textSecondary }}>
            visible to admins only
          </span>
        </Box>
        <Box sx={{ p: 3 }}>
          <TextField
            fullWidth
            multiline
            minRows={3}
            maxRows={8}
            placeholder="Add a note or warning about this user (e.g. 'Suspected fraud — monitor activity', 'VIP customer'…)"
            value={notesEdit}
            onChange={(e) => setNotesEdit(e.target.value)}
            size="small"
            sx={{
              mb: 2,
              "& .MuiOutlinedInput-root": {
                "& fieldset": { borderColor: colors.border },
                "&:hover fieldset": { borderColor: colors.primary },
                "&.Mui-focused fieldset": { borderColor: colors.primary },
              },
            }}
          />
          <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
            <Button
              onClick={handleSaveNotes}
              disabled={
                notesSaving || notesEdit === (user?.internalNotes ?? "")
              }
              variant="contained"
              startIcon={
                notesSaving ? (
                  <CircularProgress size={14} color="inherit" />
                ) : (
                  <Save size={15} />
                )
              }
              sx={{
                textTransform: "none",
                bgcolor: colors.primary,
                "&:hover": { bgcolor: "#111" },
                borderRadius: 2,
                fontWeight: 600,
              }}
            >
              {notesSaving ? "Saving…" : "Save Notes"}
            </Button>
          </Box>
        </Box>
      </Paper>

      {/* ── Auction Access Control ─────────────────────────────────────── */}
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
            flexWrap: "wrap",
          }}
        >
          <Ban size={18} style={{ color: "#EF4444" }} />
          <span style={{ fontWeight: 700, color: colors.textPrimary }}>
            Auction Access Control
          </span>
          <span style={{ fontSize: "0.8rem", color: colors.textSecondary }}>
            Restrict user from joining or bidding in specific auctions
          </span>
          {restrictedIds.length > 0 && (
            <Chip
              label={`${restrictedIds.length} restricted`}
              size="small"
              sx={{
                ml: "auto",
                bgcolor: "#FEE2E2",
                color: "#EF4444",
                fontWeight: 700,
              }}
            />
          )}
        </Box>
        <Box sx={{ p: 3 }}>
          {restrictedIds.length > 0 && (
            <Box
              sx={{
                mb: 3,
                p: 2,
                bgcolor: "#FEF2F2",
                border: "1px solid #FCA5A5",
                borderRadius: 2,
              }}
            >
              <p
                style={{
                  margin: "0 0 8px",
                  fontWeight: 600,
                  color: "#DC2626",
                  fontSize: "0.875rem",
                }}
              >
                Currently restricted from {restrictedIds.length} auction(s):
              </p>
              <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                {restrictedIds.map((rid) => {
                  const a = auctions.find((x) => x.id === rid);
                  return (
                    <Chip
                      key={rid}
                      label={
                        a ? `Auction #${a.auctionNumber}` : rid.slice(0, 10)
                      }
                      size="small"
                      sx={{
                        bgcolor: "#FEE2E2",
                        color: "#DC2626",
                        fontWeight: 700,
                      }}
                    />
                  );
                })}
              </Box>
            </Box>
          )}

          {auctions.length === 0 ? (
            <p
              style={{
                textAlign: "center",
                color: colors.textMuted,
                fontSize: "0.875rem",
              }}
            >
              No auctions found
            </p>
          ) : (
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: {
                  xs: "1fr",
                  sm: "repeat(2, 1fr)",
                  md: "repeat(3, 1fr)",
                },
                gap: 2,
              }}
            >
              {auctions.map((auction) => {
                const isRestricted = restrictedIds.includes(auction.id);
                const isProcessing =
                  restrictTarget?.id === auction.id && restrictLoading;
                return (
                  <Box
                    key={auction.id}
                    sx={{
                      p: 2,
                      borderRadius: 2,
                      border: `1px solid ${isRestricted ? "#FCA5A5" : colors.border}`,
                      bgcolor: isRestricted ? "#FEF2F2" : "#fff",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: 1,
                    }}
                  >
                    <div style={{ flex: 1, overflow: "hidden" }}>
                      <p
                        style={{
                          margin: 0,
                          fontWeight: 600,
                          fontSize: "0.85rem",
                          color: colors.textPrimary,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        Auction #{auction.auctionNumber}
                      </p>
                      <Chip
                        label={auction.status}
                        size="small"
                        sx={{
                          mt: 0.5,
                          fontSize: "0.65rem",
                          fontWeight: 700,
                          textTransform: "capitalize",
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
                        }}
                      />
                    </div>
                    <Button
                      size="small"
                      onClick={() => handleRestrict(auction)}
                      disabled={isProcessing}
                      variant={isRestricted ? "contained" : "outlined"}
                      startIcon={
                        isProcessing ? (
                          <CircularProgress size={12} color="inherit" />
                        ) : isRestricted ? (
                          <Lock size={13} />
                        ) : (
                          <Ban size={13} />
                        )
                      }
                      sx={{
                        textTransform: "none",
                        fontWeight: 600,
                        fontSize: "0.75rem",
                        borderRadius: 1.5,
                        flexShrink: 0,
                        minWidth: 100,
                        ...(isRestricted
                          ? {
                              bgcolor: "#EF4444",
                              "&:hover": { bgcolor: "#DC2626" },
                              color: "#fff",
                            }
                          : {
                              borderColor: "#EF4444",
                              color: "#EF4444",
                              "&:hover": {
                                bgcolor: "#FEF2F2",
                                borderColor: "#DC2626",
                              },
                            }),
                      }}
                    >
                      {isProcessing
                        ? "…"
                        : isRestricted
                          ? "Unrestrict"
                          : "Restrict"}
                    </Button>
                  </Box>
                );
              })}
            </Box>
          )}
        </Box>
      </Paper>

      {/* ── Block Dialog ── */}
      <Dialog
        open={blockDialog}
        onClose={() => !blockLoading && setBlockDialog(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1.5,
            color: user.isBlocked ? "#22C55E" : colors.error,
          }}
        >
          {user.isBlocked ? <ShieldCheck size={22} /> : <ShieldOff size={22} />}
          {user.isBlocked ? "Unblock User" : "Block User"}
        </DialogTitle>
        <DialogContent>
          {user.isBlocked ? (
            <p style={{ color: colors.textPrimary }}>
              Re-enable <strong>{user.fullName}</strong>'s account. They will be
              able to log in again.
            </p>
          ) : (
            <>
              <p style={{ color: colors.textPrimary }}>
                Immediately disable <strong>{user.fullName}</strong>'s Firebase
                Auth account. They cannot log in until unblocked.
              </p>
              <Box
                sx={{
                  bgcolor: "#FEF2F2",
                  border: "1px solid #FCA5A5",
                  borderRadius: 2,
                  p: 2,
                  mt: 1,
                }}
              >
                <p
                  style={{ fontSize: "0.875rem", color: "#DC2626", margin: 0 }}
                >
                  <strong>Server-side action.</strong> Firebase Auth rejects all
                  login attempts immediately.
                </p>
              </Box>
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 3, gap: 1 }}>
          <Button
            onClick={() => setBlockDialog(false)}
            disabled={blockLoading}
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
            onClick={handleBlock}
            disabled={blockLoading}
            variant="contained"
            startIcon={
              blockLoading ? (
                <CircularProgress size={14} color="inherit" />
              ) : user.isBlocked ? (
                <ShieldCheck size={16} />
              ) : (
                <ShieldOff size={16} />
              )
            }
            sx={{
              textTransform: "none",
              bgcolor: user.isBlocked ? "#22C55E" : colors.error,
              "&:hover": { bgcolor: user.isBlocked ? "#16A34A" : "#DC2626" },
              borderRadius: 2,
              minWidth: 110,
            }}
          >
            {blockLoading ? "Updating…" : user.isBlocked ? "Unblock" : "Block"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Delete Dialog ── */}
      <Dialog
        open={deleteDialog}
        onClose={() => !deleteLoading && setDeleteDialog(false)}
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
          <AlertTriangle size={22} /> Permanently Delete User
        </DialogTitle>
        <DialogContent>
          <Box
            sx={{
              bgcolor: "#FEF2F2",
              border: "1px solid #FCA5A5",
              borderRadius: 2,
              p: 2,
              mb: 2,
            }}
          >
            <p style={{ fontSize: "0.875rem", color: "#DC2626", margin: 0 }}>
              <strong>⚠ Irreversible.</strong> Deletes Firebase Auth account AND
              all Firestore data for <strong>{user.fullName}</strong>.
            </p>
          </Box>
          <p
            style={{
              color: colors.textSecondary,
              fontSize: "0.9rem",
              marginBottom: 8,
            }}
          >
            Type the user's email to confirm:
          </p>
          <TextField
            fullWidth
            size="small"
            placeholder={user.email}
            value={deleteConfirm}
            onChange={(e) => setDeleteConfirm(e.target.value)}
            error={deleteConfirm.length > 0 && deleteConfirm !== user.email}
            helperText={
              deleteConfirm.length > 0 && deleteConfirm !== user.email
                ? "Email does not match"
                : ""
            }
            sx={{
              "& .MuiOutlinedInput-root": {
                "& fieldset": { borderColor: colors.border },
                "&.Mui-focused fieldset": { borderColor: colors.error },
              },
            }}
          />
        </DialogContent>
        <DialogActions sx={{ p: 3, gap: 1 }}>
          <Button
            onClick={() => setDeleteDialog(false)}
            disabled={deleteLoading}
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
            disabled={deleteLoading || deleteConfirm !== user.email}
            variant="contained"
            startIcon={
              deleteLoading ? (
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
              minWidth: 120,
            }}
          >
            {deleteLoading ? "Deleting…" : "Delete Forever"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Role Dialog — superAdmin only ── */}
      <Dialog
        open={roleDialog}
        onClose={() => !roleLoading && setRoleDialog(false)}
        maxWidth="xs"
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
          <Crown size={22} /> Change Role
        </DialogTitle>
        <DialogContent>
          <p
            style={{
              color: colors.textSecondary,
              marginBottom: 16,
              fontSize: "0.9rem",
            }}
          >
            Select a new role for <strong>{user.fullName}</strong>.
          </p>
          <FormControl fullWidth size="small">
            <InputLabel sx={{ "&.Mui-focused": { color: colors.primary } }}>
              Role
            </InputLabel>
            <Select
              value={selectedRole}
              label="Role"
              onChange={(e) => setSelectedRole(e.target.value as UserRole)}
              sx={{
                bgcolor: "#fff",
                "& .MuiOutlinedInput-notchedOutline": {
                  borderColor: colors.border,
                },
                "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                  borderColor: colors.primary,
                },
              }}
            >
              {USER_ROLES.map((r) => {
                const s = getRoleStyle(r);
                return (
                  <MenuItem key={r} value={r}>
                    <Chip
                      label={s.label}
                      size="small"
                      sx={{ bgcolor: s.bg, color: s.color, fontWeight: 700 }}
                    />
                  </MenuItem>
                );
              })}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions sx={{ p: 3, gap: 1 }}>
          <Button
            onClick={() => setRoleDialog(false)}
            disabled={roleLoading}
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
            onClick={handleRoleChange}
            disabled={roleLoading || selectedRole === user.role}
            variant="contained"
            startIcon={
              roleLoading ? (
                <CircularProgress size={14} color="inherit" />
              ) : (
                <Crown size={16} />
              )
            }
            sx={{
              textTransform: "none",
              bgcolor: colors.primary,
              "&:hover": { bgcolor: "#111" },
              borderRadius: 2,
              minWidth: 110,
            }}
          >
            {roleLoading ? "Updating…" : "Save Role"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
