import { useEffect, useState, useMemo } from "react";
import { Navigate } from "react-router-dom";
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
} from "@mui/material";
import {
  Search,
  X,
  AlertTriangle,
  Trash2,
  RefreshCw,
  ShieldOff,
  ShieldCheck,
  Shield,
  Crown,
  UserCog,
  Mail,
  UserPlus,
  Check,
  KeyRound,
} from "lucide-react";
import { colors } from "../Products/products-data";
import type { AppUser, UserRole } from "./users-data";
import { getRoleStyle } from "./users-data";
import {
  fetchUsers,
  blockUserService,
  deleteUserService,
  setUserRoleService,
} from "@/service/users/userService";
import { useAuth } from "@/store/AuthContext/AuthContext";
import CreateAdminForm from "./CreateAdminForm";
import EditAdminPermissions from "./EditAdminPermissions";
import type { AdminPermissions } from "@/permissions/permissions-data";
import toast from "react-hot-toast";

// ─── Role chip ────────────────────────────────────────────────────────────────

function RoleChip({ role }: { role: UserRole }) {
  const s = getRoleStyle(role);
  return (
    <Chip
      size="small"
      label={s.label}
      icon={
        role === "superAdmin" ? (
          <Crown size={12} style={{ color: s.color }} />
        ) : (
          <Shield size={12} style={{ color: s.color }} />
        )
      }
      sx={{
        bgcolor: s.bg,
        color: s.color,
        fontWeight: 700,
        fontSize: "0.68rem",
        "& .MuiChip-icon": { ml: "6px" },
      }}
    />
  );
}

// ─── Status chip ──────────────────────────────────────────────────────────────

function StatusChip({ blocked }: { blocked: boolean }) {
  return (
    <Chip
      size="small"
      label={blocked ? "Blocked" : "Active"}
      sx={{
        bgcolor: blocked ? "#FEE2E2" : "#DCFCE7",
        color: blocked ? "#EF4444" : "#22C55E",
        fontWeight: 700,
        fontSize: "0.68rem",
      }}
    />
  );
}

// ─── Edit Role Dialog ─────────────────────────────────────────────────────────

interface EditRoleDialogProps {
  target: AppUser | null;
  open: boolean;
  onClose: () => void;
  onSave: (uid: string, role: UserRole) => Promise<void>;
}

function EditRoleDialog({
  target,
  open,
  onClose,
  onSave,
}: EditRoleDialogProps) {
  const [role, setRole] = useState<UserRole>("admin");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (target) setRole(target.role);
  }, [target]);

  const handleSave = async () => {
    if (!target) return;
    setSaving(true);
    try {
      await onSave(target.id, role);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const s = getRoleStyle(role);

  return (
    <Dialog
      open={open}
      onClose={() => !saving && onClose()}
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
        <UserCog size={20} /> Change Role
      </DialogTitle>
      <DialogContent sx={{ pt: 2 }}>
        {target && (
          <Box
            sx={{ display: "flex", flexDirection: "column", gap: 2.5, mt: 1 }}
          >
            <Box
              sx={{
                p: 2,
                borderRadius: 2,
                bgcolor: colors.primaryBg,
                border: `1px solid ${colors.border}`,
                display: "flex",
                alignItems: "center",
                gap: 1.5,
              }}
            >
              <Avatar
                src={target.profileImage ?? undefined}
                sx={{
                  width: 36,
                  height: 36,
                  bgcolor: colors.primary,
                  fontSize: "0.85rem",
                }}
              >
                {target.fullName.charAt(0).toUpperCase()}
              </Avatar>
              <Box>
                <p
                  style={{
                    margin: 0,
                    fontWeight: 700,
                    fontSize: "0.88rem",
                    color: colors.textPrimary,
                  }}
                >
                  {target.fullName}
                </p>
                <p
                  style={{
                    margin: 0,
                    fontSize: "0.75rem",
                    color: colors.textSecondary,
                  }}
                >
                  {target.email}
                </p>
              </Box>
            </Box>

            <Box sx={{ display: "flex", gap: 1 }}>
              {(["admin", "superAdmin"] as const).map((r) => {
                const rs = getRoleStyle(r);
                const active = role === r;
                return (
                  <Box
                    key={r}
                    onClick={() => setRole(r)}
                    sx={{
                      flex: 1,
                      p: 1.5,
                      borderRadius: 2,
                      cursor: "pointer",
                      textAlign: "center",
                      border: `2px solid ${active ? rs.color : colors.border}`,
                      bgcolor: active ? rs.bg : "#fff",
                      transition: "all 0.15s",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 0.8,
                    }}
                  >
                    {r === "superAdmin" ? (
                      <Crown
                        size={14}
                        style={{ color: active ? rs.color : colors.textMuted }}
                      />
                    ) : (
                      <Shield
                        size={14}
                        style={{ color: active ? rs.color : colors.textMuted }}
                      />
                    )}
                    <span
                      style={{
                        fontSize: "0.8rem",
                        fontWeight: active ? 700 : 500,
                        color: active ? rs.color : colors.textMuted,
                      }}
                    >
                      {rs.label}
                    </span>
                    {active && <Check size={12} style={{ color: rs.color }} />}
                  </Box>
                );
              })}
            </Box>

            {role !== target.role && (
              <Box
                sx={{
                  p: 1.5,
                  borderRadius: 2,
                  bgcolor: "#FFFBEB",
                  border: "1px solid #F59E0B",
                }}
              >
                <p style={{ margin: 0, fontSize: "0.78rem", color: "#92400E" }}>
                  <strong>Changing</strong> from{" "}
                  <strong>{getRoleStyle(target.role).label}</strong> →{" "}
                  <strong>{s.label}</strong>
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
          disabled={saving || !target || role === target.role}
          variant="contained"
          startIcon={
            saving ? (
              <CircularProgress size={14} color="inherit" />
            ) : (
              <Check size={16} />
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
          {saving ? "Saving…" : "Save Role"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ─── Main AdminsList ──────────────────────────────────────────────────────────

export default function AdminsList() {
  const { user: currentUser, role: currentRole } = useAuth();

  // ── superAdmin-only guard ─────────────────────────────────────────────────
  // Blocks any non-superAdmin (including role="admin") who navigates to
  // /admin/admins directly via the URL bar — they are redirected to /admin.
  if (currentRole !== "superAdmin") {
    return <Navigate to="/admin" replace />;
  }

  const [admins, setAdmins] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [page, setPage] = useState(0);
  const rowsPerPage = 10;

  // Dialogs
  const [createOpen, setCreateOpen] = useState(false);

  const [blockTarget, setBlockTarget] = useState<AppUser | null>(null);
  const [blockLoading, setBlockLoading] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<AppUser | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [roleTarget, setRoleTarget] = useState<AppUser | null>(null);
  const [permTarget, setPermTarget] = useState<AppUser | null>(null);

  // ── Load ──────────────────────────────────────────────────────────────────

  const load = async () => {
    setLoading(true);
    try {
      const all = await fetchUsers();
      setAdmins(
        all.filter((u) => u.role === "admin" || u.role === "superAdmin"),
      );
    } catch {
      toast.error("Failed to load admins");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  // ── Filtering ─────────────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    let f = admins;
    if (roleFilter !== "all") f = f.filter((u) => u.role === roleFilter);
    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      f = f.filter(
        (u) =>
          u.fullName.toLowerCase().includes(s) ||
          u.email.toLowerCase().includes(s) ||
          u.id.toLowerCase().includes(s),
      );
    }
    return [...f].sort((a, b) => {
      if (a.role !== b.role) return a.role === "superAdmin" ? -1 : 1;
      return b.createdAt.getTime() - a.createdAt.getTime();
    });
  }, [admins, searchTerm, roleFilter]);

  const paginated = filtered.slice(
    page * rowsPerPage,
    (page + 1) * rowsPerPage,
  );

  const isSelf = (uid: string) => uid === currentUser?.uid;

  // ── Block / Unblock ───────────────────────────────────────────────────────

  const handleBlock = async () => {
    if (!blockTarget) return;
    setBlockLoading(true);
    try {
      const next = !blockTarget.isBlocked;
      await blockUserService(blockTarget.id, next);
      setAdmins((prev) =>
        prev.map((u) =>
          u.id === blockTarget.id ? { ...u, isBlocked: next } : u,
        ),
      );
      toast.success(next ? "Account blocked" : "Account unblocked");
      setBlockTarget(null);
    } catch (err: any) {
      toast.error(err?.message ?? "Failed");
    } finally {
      setBlockLoading(false);
    }
  };

  // ── Delete ────────────────────────────────────────────────────────────────

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await deleteUserService(deleteTarget.id);
      setAdmins((prev) => prev.filter((u) => u.id !== deleteTarget.id));
      toast.success("Account deleted");
      setDeleteTarget(null);
      setDeleteConfirm("");
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to delete");
    } finally {
      setDeleteLoading(false);
    }
  };

  // ── Role change ───────────────────────────────────────────────────────────

  const handleRoleChange = async (uid: string, role: UserRole) => {
    try {
      await setUserRoleService(uid, role);
      setAdmins((prev) => prev.map((u) => (u.id === uid ? { ...u, role } : u)));
      toast.success(`Role updated to ${getRoleStyle(role).label}`);
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to update role");
      throw err;
    }
  };

  // ── Permissions saved ────────────────────────────────────────────────────

  const handlePermsSaved = (uid: string, permissions: AdminPermissions) => {
    setAdmins((prev) =>
      prev.map((u) => (u.id === uid ? { ...u, permissions } : u)),
    );
  };

  // ── Stats ─────────────────────────────────────────────────────────────────

  const totalAdmins = admins.filter((u) => u.role === "admin").length;
  const totalSuperAdmins = admins.filter((u) => u.role === "superAdmin").length;
  const totalBlocked = admins.filter((u) => u.isBlocked).length;

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
      {/* ── Header ────────────────────────────────────────────────────────── */}
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
            <Shield
              size={28}
              style={{
                display: "inline",
                marginRight: 8,
                verticalAlign: "middle",
              }}
            />
            Admins & Super Admins
          </h1>
          <p
            style={{
              color: colors.textSecondary,
              margin: "4px 0 0",
              fontSize: "0.875rem",
            }}
          >
            Manage admin accounts, roles, and access — visible to Super Admins
            only
          </p>
        </div>
        <Box sx={{ display: "flex", gap: 1 }}>
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
          <Button
            variant="contained"
            startIcon={<UserPlus size={16} />}
            onClick={() => setCreateOpen(true)}
            sx={{
              textTransform: "none",
              bgcolor: colors.primary,
              "&:hover": { bgcolor: colors.primaryDark },
              borderRadius: 2,
              fontWeight: 600,
            }}
          >
            New Admin
          </Button>
        </Box>
      </Box>

      {/* ── Stats ─────────────────────────────────────────────────────────── */}
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
            label: "Super Admins",
            value: totalSuperAdmins,
            icon: <Crown size={20} />,
          },
          { label: "Admins", value: totalAdmins, icon: <Shield size={20} /> },
          {
            label: "Blocked",
            value: totalBlocked,
            icon: <ShieldOff size={20} />,
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

      {/* ── Filters ───────────────────────────────────────────────────────── */}
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
            placeholder="Search by name, email, or UID…"
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
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
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
            <option value="all">All Roles</option>
            <option value="admin">Admin</option>
            <option value="superAdmin">Super Admin</option>
          </select>
          <p
            style={{
              margin: 0,
              fontSize: "0.85rem",
              color: colors.textSecondary,
            }}
          >
            <strong style={{ color: colors.primary }}>{filtered.length}</strong>{" "}
            accounts
          </p>
        </Box>
      </Paper>

      {/* ── Table ─────────────────────────────────────────────────────────── */}
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
                {["Admin", "Email", "Role", "Status", "Created", "Actions"].map(
                  (h) => (
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
                  ),
                )}
              </TableRow>
            </TableHead>
            <TableBody>
              {paginated.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 10 }}>
                    <Shield
                      size={44}
                      style={{
                        color: colors.textMuted,
                        margin: "0 auto 12px",
                        display: "block",
                      }}
                    />
                    <p style={{ color: colors.textSecondary, fontWeight: 600 }}>
                      No admins found
                    </p>
                    <p style={{ color: colors.textMuted, fontSize: "0.85rem" }}>
                      {searchTerm || roleFilter !== "all"
                        ? "Try adjusting your filters"
                        : "Create the first admin account"}
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                paginated.map((admin) => {
                  const self = isSelf(admin.id);
                  return (
                    <TableRow
                      key={admin.id}
                      sx={{
                        "&:hover": { bgcolor: colors.muted },
                        bgcolor: self ? colors.primaryBg : "transparent",
                        transition: "background 0.15s",
                      }}
                    >
                      {/* Avatar + name */}
                      <TableCell>
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 1.5,
                          }}
                        >
                          <Avatar
                            src={admin.profileImage ?? undefined}
                            sx={{
                              width: 36,
                              height: 36,
                              bgcolor:
                                admin.role === "superAdmin"
                                  ? "#FEF3C7"
                                  : colors.primaryBg,
                              color:
                                admin.role === "superAdmin"
                                  ? "#D97706"
                                  : colors.primary,
                              fontWeight: 700,
                              fontSize: "0.85rem",
                            }}
                          >
                            {admin.fullName.charAt(0).toUpperCase()}
                          </Avatar>
                          <Box>
                            <Box
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 0.8,
                              }}
                            >
                              <span
                                style={{
                                  fontWeight: 600,
                                  fontSize: "0.88rem",
                                  color: colors.textPrimary,
                                }}
                              >
                                {admin.fullName}
                              </span>
                              {self && (
                                <Chip
                                  label="You"
                                  size="small"
                                  sx={{
                                    height: 18,
                                    fontSize: "0.62rem",
                                    bgcolor: colors.primaryBg,
                                    color: colors.primary,
                                    fontWeight: 700,
                                  }}
                                />
                              )}
                            </Box>
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
                              {admin.id.slice(0, 16)}…
                            </span>
                          </Box>
                        </Box>
                      </TableCell>

                      {/* Email */}
                      <TableCell>
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 0.5,
                          }}
                        >
                          <Mail size={13} style={{ color: colors.textMuted }} />
                          <span
                            style={{
                              fontSize: "0.83rem",
                              color: colors.textSecondary,
                            }}
                          >
                            {admin.email}
                          </span>
                        </Box>
                      </TableCell>

                      {/* Role */}
                      <TableCell>
                        <RoleChip role={admin.role} />
                      </TableCell>

                      {/* Status */}
                      <TableCell>
                        <StatusChip blocked={admin.isBlocked} />
                      </TableCell>

                      {/* Created */}
                      <TableCell>
                        <span
                          style={{
                            fontSize: "0.78rem",
                            color: colors.textMuted,
                          }}
                        >
                          {admin.createdAt.toLocaleDateString()}
                        </span>
                      </TableCell>

                      {/* Actions */}
                      <TableCell align="center">
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 0.5,
                          }}
                        >
                          {/* Edit role */}
                          <IconButton
                            size="small"
                            disabled={self}
                            onClick={() => setRoleTarget(admin)}
                            sx={{
                              color: colors.primary,
                              "&:hover": { bgcolor: colors.primaryBg },
                              borderRadius: 1.5,
                              "&.Mui-disabled": { opacity: 0.3 },
                            }}
                            title={
                              self
                                ? "Cannot modify your own role"
                                : "Change role"
                            }
                          >
                            <UserCog size={15} />
                          </IconButton>

                          {/* Edit permissions */}
                          <IconButton
                            size="small"
                            disabled={self || admin.role === "superAdmin"}
                            onClick={() => setPermTarget(admin)}
                            sx={{
                              color: "#7C3AED",
                              "&:hover": { bgcolor: "#F5F3FF" },
                              borderRadius: 1.5,
                              "&.Mui-disabled": { opacity: 0.3 },
                            }}
                            title={
                              admin.role === "superAdmin"
                                ? "Super Admins have full access"
                                : self
                                  ? "Cannot edit your own permissions"
                                  : "Edit permissions"
                            }
                          >
                            <KeyRound size={15} />
                          </IconButton>

                          {/* Block / Unblock */}
                          <IconButton
                            size="small"
                            disabled={self}
                            onClick={() => setBlockTarget(admin)}
                            sx={{
                              color: admin.isBlocked ? "#22C55E" : colors.error,
                              "&:hover": {
                                bgcolor: admin.isBlocked
                                  ? "#DCFCE7"
                                  : colors.errorBg,
                              },
                              borderRadius: 1.5,
                              "&.Mui-disabled": { opacity: 0.3 },
                            }}
                            title={
                              self
                                ? "Cannot block yourself"
                                : admin.isBlocked
                                  ? "Unblock"
                                  : "Block"
                            }
                          >
                            {admin.isBlocked ? (
                              <ShieldCheck size={15} />
                            ) : (
                              <ShieldOff size={15} />
                            )}
                          </IconButton>

                          {/* Delete */}
                          <IconButton
                            size="small"
                            disabled={self}
                            onClick={() => {
                              setDeleteTarget(admin);
                              setDeleteConfirm("");
                            }}
                            sx={{
                              color: colors.error,
                              "&:hover": { bgcolor: colors.errorBg },
                              borderRadius: 1.5,
                              "&.Mui-disabled": { opacity: 0.3 },
                            }}
                            title={
                              self ? "Cannot delete yourself" : "Delete account"
                            }
                          >
                            <Trash2 size={15} />
                          </IconButton>
                        </Box>
                      </TableCell>
                    </TableRow>
                  );
                })
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
          rowsPerPageOptions={[10]}
          sx={{ borderTop: `1px solid ${colors.border}` }}
        />
      </Paper>

      {/* ── Create Admin Form (separate component) ────────────────────────── */}
      <CreateAdminForm
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreate={(newAdmin) => setAdmins((prev) => [newAdmin, ...prev])}
      />

      {/* ── Edit Role Dialog ──────────────────────────────────────────────── */}
      <EditRoleDialog
        target={roleTarget}
        open={!!roleTarget}
        onClose={() => setRoleTarget(null)}
        onSave={handleRoleChange}
      />

      {/* ── Block / Unblock Dialog ────────────────────────────────────────── */}
      <Dialog
        open={!!blockTarget}
        onClose={() => !blockLoading && setBlockTarget(null)}
        maxWidth="xs"
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
            <ShieldCheck size={20} />
          ) : (
            <ShieldOff size={20} />
          )}
          {blockTarget?.isBlocked ? "Unblock Account" : "Block Account"}
        </DialogTitle>
        <DialogContent>
          <p style={{ color: colors.textPrimary, margin: 0 }}>
            {blockTarget?.isBlocked ? (
              <>
                Are you sure you want to <strong>unblock</strong>{" "}
                <strong>{blockTarget?.fullName}</strong>? They will regain
                access immediately.
              </>
            ) : (
              <>
                Are you sure you want to <strong>block</strong>{" "}
                <strong>{blockTarget?.fullName}</strong>? They will not be able
                to sign in.
              </>
            )}
          </p>
        </DialogContent>
        <DialogActions sx={{ p: 3, gap: 1 }}>
          <Button
            onClick={() => setBlockTarget(null)}
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
              minWidth: 100,
            }}
          >
            {blockLoading
              ? "Saving…"
              : blockTarget?.isBlocked
                ? "Unblock"
                : "Block"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Edit Permissions Dialog ──────────────────────────────────────── */}
      <EditAdminPermissions
        target={permTarget}
        open={!!permTarget}
        onClose={() => setPermTarget(null)}
        onSaved={handlePermsSaved}
      />

      {/* ── Delete Dialog ─────────────────────────────────────────────────── */}
      <Dialog
        open={!!deleteTarget}
        onClose={() => !deleteLoading && setDeleteTarget(null)}
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
          <AlertTriangle size={20} /> Delete Admin Account
        </DialogTitle>
        <DialogContent>
          <p style={{ color: colors.textPrimary, margin: "0 0 16px" }}>
            You are about to permanently delete{" "}
            <strong>{deleteTarget?.fullName}</strong>'s account (
            <strong>{deleteTarget?.email}</strong>). This removes their 
             account and all  data. This action cannot be undone.
          </p>
          <Box
            sx={{
              bgcolor: colors.errorBg,
              border: `1px solid ${colors.error}`,
              borderRadius: 2,
              p: 2,
              mb: 2,
            }}
          >
            <p style={{ fontSize: "0.875rem", color: colors.error, margin: 0 }}>
              <strong>Warning:</strong> Type <strong>DELETE</strong> below to
              confirm.
            </p>
          </Box>
          <TextField
            placeholder='Type "DELETE" to confirm'
            value={deleteConfirm}
            onChange={(e) => setDeleteConfirm(e.target.value)}
            size="small"
            fullWidth
            sx={{
              "& .MuiOutlinedInput-root": {
                "& fieldset": { borderColor: colors.border },
                "&:hover fieldset": { borderColor: colors.error },
                "&.Mui-focused fieldset": { borderColor: colors.error },
              },
            }}
          />
        </DialogContent>
        <DialogActions sx={{ p: 3, gap: 1 }}>
          <Button
            onClick={() => setDeleteTarget(null)}
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
            disabled={deleteLoading || deleteConfirm !== "DELETE"}
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
              minWidth: 100,
            }}
          >
            {deleteLoading ? "Deleting…" : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
