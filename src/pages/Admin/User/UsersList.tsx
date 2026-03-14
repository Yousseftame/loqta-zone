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
  Avatar,
  Collapse,
} from "@mui/material";
import {
  Search,
  X,
  AlertTriangle,
  Eye,
  Trash2,
  RefreshCw,
  Users,
  ShieldOff,
  ShieldCheck,
  UserCheck,
  UserX,
  Filter,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronUp,
  StickyNote,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { colors } from "../Products/products-data";
import type { AppUser } from "./users-data";
import {
  fetchUsers,
  blockUserService,
  deleteUserService,
} from "@/service/users/userService";
import toast from "react-hot-toast";
import { usePermissions } from "@/permissions/usePermissions";

export default function UsersList() {
  const navigate = useNavigate();

  const [users, setUsers] = useState<AppUser[]>([]);
  const [filtered, setFiltered] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Block dialog
  const [blockDialog, setBlockDialog] = useState(false);
  const [blockTarget, setBlockTarget] = useState<AppUser | null>(null);
  const [blockLoading, setBlockLoading] = useState(false);

  // Expanded row (internal notes)
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  // Delete dialog
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AppUser | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
      const { can } = usePermissions();


  const load = async () => {
    setLoading(true);
    try {
      const data = await fetchUsers();
      // ✅ Fix 4: show ONLY role="user" in this list
      setUsers(data.filter((u) => u.role === "user"));
    } catch {
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    let f = users;
    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      f = f.filter(
        (u) =>
          u.fullName.toLowerCase().includes(s) ||
          u.email.toLowerCase().includes(s) ||
          u.phone.includes(s) ||
          u.id.toLowerCase().includes(s),
      );
    }
    if (statusFilter === "blocked") f = f.filter((u) => u.isBlocked);
    if (statusFilter === "active") f = f.filter((u) => !u.isBlocked);
    if (statusFilter === "verified") f = f.filter((u) => u.verified);
    setFiltered(f);
    setPage(0);
  }, [searchTerm, statusFilter, users]);

  // ── Block / Unblock ──────────────────────────────────────────────────────
  const handleBlock = async () => {
    if (!blockTarget) return;
    setBlockLoading(true);
    try {
      const newState = !blockTarget.isBlocked;
      await blockUserService(blockTarget.id, newState);
      setUsers((prev) =>
        prev.map((u) =>
          u.id === blockTarget.id ? { ...u, isBlocked: newState } : u,
        ),
      );
      toast.success(newState ? "User blocked" : "User unblocked");
      setBlockDialog(false);
      setBlockTarget(null);
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to update user status");
    } finally {
      setBlockLoading(false);
    }
  };

  // ── Delete ───────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!deleteTarget || deleteConfirmText !== deleteTarget.email) return;
    setDeleteLoading(true);
    try {
      await deleteUserService(deleteTarget.id);
      setUsers((prev) => prev.filter((u) => u.id !== deleteTarget.id));
      toast.success("User account permanently deleted");
      setDeleteDialog(false);
      setDeleteTarget(null);
      setDeleteConfirmText("");
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to delete user");
    } finally {
      setDeleteLoading(false);
    }
  };

  const totalUsers = users.length;
  const blockedCount = users.filter((u) => u.isBlocked).length;
  const verifiedCount = users.filter((u) => u.verified).length;
  const activeCount = users.filter((u) => !u.isBlocked).length;

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
            <Users
              size={28}
              style={{
                display: "inline",
                marginRight: 8,
                verticalAlign: "middle",
              }}
            />
            Users
          </h1>
          <p
            style={{
              color: colors.textSecondary,
              margin: "4px 0 0",
              fontSize: "0.875rem",
            }}
          >
            Manage registered users
          </p>
        </div>
        <IconButton
          onClick={load}
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
          gridTemplateColumns: { xs: "1fr 1fr", sm: "repeat(4, 1fr)" },
          mb: 4,
        }}
      >
        {[
          {
            label: "Total Users",
            value: totalUsers,
            icon: <Users size={20} />,
          },
          {
            label: "Active",
            value: activeCount,
            icon: <UserCheck size={20} />,
          },
          { label: "Blocked", value: blockedCount, icon: <UserX size={20} /> },
          {
            label: "Verified",
            value: verifiedCount,
            icon: <CheckCircle2 size={20} />,
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
            flexDirection: { xs: "column", md: "row" },
            gap: 2,
          }}
        >
          <TextField
            placeholder="Search by name, email, phone, or ID…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            variant="outlined"
            size="small"
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
              flex: 1,
              "& .MuiOutlinedInput-root": {
                "& fieldset": { borderColor: colors.border },
                "&:hover fieldset": { borderColor: colors.primary },
                "&.Mui-focused fieldset": { borderColor: colors.primary },
              },
            }}
          />
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Filter
              size={16}
              style={{ color: colors.textMuted, flexShrink: 0 }}
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
              <option value="active">Active</option>
              <option value="blocked">Blocked</option>
              <option value="verified">Verified</option>
            </select>
          </Box>
        </Box>
        <Box sx={{ mt: 2, display: "flex", alignItems: "center", gap: 1.5 }}>
          <span style={{ fontSize: "0.85rem", color: colors.textSecondary }}>
            <strong style={{ color: colors.primary }}>{filtered.length}</strong>{" "}
            results
          </span>
          {(searchTerm || statusFilter !== "all") && (
            <Button
              size="small"
              onClick={() => {
                setSearchTerm("");
                setStatusFilter("all");
              }}
              sx={{
                textTransform: "none",
                color: colors.primary,
                p: "2px 8px",
                fontSize: "0.8rem",
              }}
            >
              Clear filters
            </Button>
          )}
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
          <Table sx={{ minWidth: 800 }}>
            <TableHead>
              <TableRow sx={{ bgcolor: colors.primaryBg }}>
                {[
                  "",
                  "User",
                  "Email / Phone",
                  "Status",
                  "Stats",
                  "Joined",
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
                    <Users
                      size={44}
                      style={{
                        color: colors.textMuted,
                        margin: "0 auto 12px",
                        display: "block",
                      }}
                    />
                    <p style={{ color: colors.textSecondary, fontWeight: 600 }}>
                      No users found
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                paginated.map((user) => (
                  <>
                    <TableRow
                      key={user.id}
                      sx={{
                        "&:hover": { bgcolor: colors.muted },
                        transition: "background 0.15s",
                      }}
                    >
                      {/* Expand arrow */}
                      <TableCell sx={{ width: 40, pr: 0 }}>
                        <IconButton
                          size="small"
                          onClick={() =>
                            setExpandedRow(
                              expandedRow === user.id ? null : user.id,
                            )
                          }
                          sx={{ color: colors.primary, borderRadius: 1.5 }}
                          title="Internal Notes"
                        >
                          {expandedRow === user.id ? (
                            <ChevronUp size={16} />
                          ) : (
                            <ChevronDown size={16} />
                          )}
                        </IconButton>
                      </TableCell>

                      {/* Avatar + Name */}
                      <TableCell sx={{ minWidth: 200 }}>
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 1.5,
                          }}
                        >
                          <Avatar
                            src={user.profileImage ?? undefined}
                            sx={{
                              width: 36,
                              height: 36,
                              bgcolor: colors.primaryBg,
                              color: colors.primary,
                              fontSize: "0.85rem",
                              fontWeight: 700,
                              border: `2px solid ${user.isBlocked ? "#FEE2E2" : colors.border}`,
                            }}
                          >
                            {user.firstName.charAt(0)}
                            {user.lastName.charAt(0)}
                          </Avatar>
                          <div>
                            <p
                              style={{
                                margin: 0,
                                fontWeight: 600,
                                fontSize: "0.875rem",
                                color: colors.textPrimary,
                              }}
                            >
                              {user.fullName}
                            </p>
                            <p
                              style={{
                                margin: 0,
                                fontSize: "0.72rem",
                                color: colors.textMuted,
                                fontFamily: "monospace",
                              }}
                            >
                              {user.id.slice(0, 12)}…
                            </p>
                          </div>
                        </Box>
                      </TableCell>

                      {/* Email + Phone */}
                      <TableCell sx={{ minWidth: 180 }}>
                        <p
                          style={{
                            margin: 0,
                            fontSize: "0.82rem",
                            color: colors.textPrimary,
                            fontWeight: 500,
                          }}
                        >
                          {user.email}
                        </p>
                        <p
                          style={{
                            margin: "2px 0 0",
                            fontSize: "0.75rem",
                            color: colors.textMuted,
                          }}
                        >
                          {user.phone}
                        </p>
                      </TableCell>

                      {/* Status chips */}
                      <TableCell>
                        <Box
                          sx={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 0.5,
                          }}
                        >
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
                              fontSize: "0.68rem",
                              width: "fit-content",
                              "& .MuiChip-icon": { color: "inherit" },
                            }}
                          />
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
                              fontSize: "0.68rem",
                              width: "fit-content",
                              "& .MuiChip-icon": { color: "inherit" },
                            }}
                          />
                        </Box>
                      </TableCell>

                      {/* Stats */}
                      <TableCell>
                        <p
                          style={{
                            margin: 0,
                            fontSize: "0.75rem",
                            color: colors.textMuted,
                          }}
                        >
                          Bids:{" "}
                          <strong style={{ color: colors.textPrimary }}>
                            {user.totalBids}
                          </strong>
                        </p>
                        <p
                          style={{
                            margin: "2px 0 0",
                            fontSize: "0.75rem",
                            color: colors.textMuted,
                          }}
                        >
                          Wins:{" "}
                          <strong style={{ color: "#22C55E" }}>
                            {user.totalWins}
                          </strong>
                        </p>
                      </TableCell>

                      {/* Joined */}
                      <TableCell sx={{ whiteSpace: "nowrap" }}>
                        <p
                          style={{
                            margin: 0,
                            fontSize: "0.8rem",
                            color: colors.textPrimary,
                          }}
                        >
                          {user.createdAt.toLocaleDateString()}
                        </p>
                      </TableCell>

                      {/* Actions — ✅ Fix 1: delete button visible to all admins, not just superAdmin */}
                      <TableCell align="center">
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 0.5,
                          }}
                        >
                          {can("users", "read") && <IconButton
                            size="small"
                            onClick={() => navigate(`/admin/users/${user.id}`)}
                            sx={{
                              color: colors.primary,
                              "&:hover": { bgcolor: colors.primaryBg },
                              borderRadius: 1.5,
                            }}
                            title="View Details"
                          >
                            <Eye size={16} />
                          </IconButton>}
                          <IconButton
                            size="small"
                            onClick={() => {
                              setBlockTarget(user);
                              setBlockDialog(true);
                            }}
                            title={user.isBlocked ? "Unblock" : "Block"}
                            sx={{
                              color: user.isBlocked ? "#22C55E" : "#EF4444",
                              "&:hover": {
                                bgcolor: user.isBlocked ? "#DCFCE7" : "#FEE2E2",
                              },
                              borderRadius: 1.5,
                            }}
                          >
                            {user.isBlocked ? (
                              <ShieldCheck size={16} />
                            ) : (
                              <ShieldOff size={16} />
                            )}
                          </IconButton>
                          {/* ✅ Delete visible to all admins */}
                          {can("users", "delete") && <IconButton
                            size="small"
                            onClick={() => {
                              setDeleteTarget(user);
                              setDeleteConfirmText("");
                              setDeleteDialog(true);
                            }}
                            title="Delete User"
                            sx={{
                              color: colors.error,
                              "&:hover": { bgcolor: colors.errorBg },
                              borderRadius: 1.5,
                            }}
                          >
                            <Trash2 size={16} />
                          </IconButton>}
                        </Box>
                      </TableCell>
                    </TableRow>
                    {/* ── Expanded internal notes row ── */}
                    <TableRow key={`${user.id}-notes`}>
                      <TableCell colSpan={7} sx={{ p: 0, border: 0 }}>
                        <Collapse
                          in={expandedRow === user.id}
                          timeout="auto"
                          unmountOnExit
                        >
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
                                gap: 1.5,
                              }}
                            >
                              <StickyNote
                                size={15}
                                style={{ color: colors.primary }}
                              />
                              <span
                                style={{
                                  fontWeight: 700,
                                  fontSize: "0.85rem",
                                  color: colors.primaryDark,
                                }}
                              >
                                Internal Notes
                              </span>
                              <span
                                style={{
                                  fontSize: "0.78rem",
                                  color: colors.textSecondary,
                                }}
                              >
                                visible to admins only
                              </span>
                            </Box>
                            <Box sx={{ px: 2.5, py: 2 }}>
                              {user.internalNotes ? (
                                <p
                                  style={{
                                    margin: 0,
                                    fontSize: "0.85rem",
                                    color: colors.textPrimary,
                                    whiteSpace: "pre-wrap",
                                    lineHeight: 1.6,
                                  }}
                                >
                                  {user.internalNotes}
                                </p>
                              ) : (
                                <p
                                  style={{
                                    margin: 0,
                                    fontSize: "0.82rem",
                                    color: colors.textMuted,
                                    fontStyle: "italic",
                                  }}
                                >
                                  No notes — click View to add one.
                                </p>
                              )}
                            </Box>
                          </Box>
                        </Collapse>
                      </TableCell>
                    </TableRow>
                  </>
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
            color: blockTarget?.isBlocked ? "#22C55E" : colors.error,
          }}
        >
          {blockTarget?.isBlocked ? (
            <ShieldCheck size={22} />
          ) : (
            <ShieldOff size={22} />
          )}
          {blockTarget?.isBlocked ? "Unblock User" : "Block User"}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}>
            <Avatar
              src={blockTarget?.profileImage ?? undefined}
              sx={{
                width: 48,
                height: 48,
                bgcolor: colors.primaryBg,
                color: colors.primary,
                fontWeight: 700,
              }}
            >
              {blockTarget?.firstName.charAt(0)}
              {blockTarget?.lastName.charAt(0)}
            </Avatar>
            <div>
              <p
                style={{
                  margin: 0,
                  fontWeight: 700,
                  color: colors.textPrimary,
                }}
              >
                {blockTarget?.fullName}
              </p>
              <p
                style={{
                  margin: 0,
                  fontSize: "0.85rem",
                  color: colors.textSecondary,
                }}
              >
                {blockTarget?.email}
              </p>
            </div>
          </Box>
          {blockTarget?.isBlocked ? (
            <p style={{ color: colors.textPrimary }}>
              This will <strong>re-enable</strong> the user's account. They will
              be able to log in again.
            </p>
          ) : (
            <>
              <p style={{ color: colors.textPrimary }}>
                This action will <strong>immediately disable</strong> This user
                will be blocked from accessing the platform until unblocked.
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
                  <strong>Server-side action</strong> — The user will be blocked
                  from logging in immediately.
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
              ) : blockTarget?.isBlocked ? (
                <ShieldCheck size={16} />
              ) : (
                <ShieldOff size={16} />
              )
            }
            sx={{
              textTransform: "none",
              bgcolor: blockTarget?.isBlocked ? "#22C55E" : colors.error,
              "&:hover": {
                bgcolor: blockTarget?.isBlocked ? "#16A34A" : "#DC2626",
              },
              borderRadius: 2,
              minWidth: 120,
            }}
          >
            {blockLoading
              ? "Updating…"
              : blockTarget?.isBlocked
                ? "Unblock"
                : "Block User"}
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
          <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}>
            <Avatar
              src={deleteTarget?.profileImage ?? undefined}
              sx={{
                width: 48,
                height: 48,
                bgcolor: "#FEE2E2",
                color: "#EF4444",
                fontWeight: 700,
              }}
            >
              {deleteTarget?.firstName.charAt(0)}
              {deleteTarget?.lastName.charAt(0)}
            </Avatar>
            <div>
              <p
                style={{
                  margin: 0,
                  fontWeight: 700,
                  color: colors.textPrimary,
                }}
              >
                {deleteTarget?.fullName}
              </p>
              <p
                style={{
                  margin: 0,
                  fontSize: "0.85rem",
                  color: colors.textSecondary,
                }}
              >
                {deleteTarget?.email}
              </p>
            </div>
          </Box>
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
              <strong>⚠ Irreversible.</strong> Permanently delete this user and
              all their data. This action cannot be undone.
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
            placeholder={deleteTarget?.email}
            value={deleteConfirmText}
            onChange={(e) => setDeleteConfirmText(e.target.value)}
            error={
              deleteConfirmText.length > 0 &&
              deleteConfirmText !== deleteTarget?.email
            }
            helperText={
              deleteConfirmText.length > 0 &&
              deleteConfirmText !== deleteTarget?.email
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
            disabled={
              deleteLoading || deleteConfirmText !== deleteTarget?.email
            }
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
    </Box>
  );
}
