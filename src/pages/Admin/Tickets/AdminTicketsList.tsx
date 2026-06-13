import { useState } from "react";
import {
  Paper,
  Box,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Chip,
  IconButton,
  TextField,
  InputAdornment,
  TablePagination,
  CircularProgress,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tooltip,
  Menu,
  MenuItem,
  FormControl,
  Select,
} from "@mui/material";
import {
  Search,
  X,
  Eye,
  RefreshCw,
  Trash2,
  ChevronDown,
  AlertTriangle,
  Ticket,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTickets } from "@/store/AdminContext/TicketContext/TicketContext";
import { useAuctions } from "@/store/AdminContext/AuctionContext/AuctionContext";
import { getAuctionStatusStyle } from "@/pages/Admin/Auctions/auctions-data";
import {
  colors,
  TICKET_CATEGORY_LABELS,
  getTicketStatusStyle,
  getTicketPriorityStyle,
  PRIORITY_ORDER,
  type SupportTicket,
  type TicketStatus,
  type TicketPriority,
} from "./ticket-data";
import { usePermissions } from "@/permissions/usePermissions";

const STATUS_OPTIONS: { value: "" | TicketStatus; label: string }[] = [
  { value: "",            label: "All Statuses" },
  { value: "open",        label: "Open" },
  { value: "in_progress", label: "In Progress" },
  { value: "resolved",    label: "Resolved" },
  { value: "closed",      label: "Closed" },
];

const PRIORITY_OPTIONS: { value: "" | TicketPriority; label: string }[] = [
  { value: "",       label: "All Priorities" },
  { value: "urgent", label: "Urgent" },
  { value: "high",   label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low",    label: "Low" },
];

export default function AdminTicketsList() {
  const navigate = useNavigate();
  const { tickets, loading, error, refreshTickets, changeTicketStatus, changeTicketPriority, removeTicket } =
    useTickets();
  const { auctions, refreshAuctions } = useAuctions();
  const { can } = usePermissions();

  const [search, setSearch]               = useState("");
  const [statusFilter, setStatusFilter]   = useState<"" | TicketStatus>("");
  const [priorityFilter, setPriorityFilter] = useState<"" | TicketPriority>("");
  const [page, setPage]                   = useState(0);
  const [rowsPerPage, setRowsPerPage]     = useState(10);
  const [updatingId, setUpdatingId]       = useState<string | null>(null);
  const [menuAnchor, setMenuAnchor]       = useState<{ el: HTMLElement; id: string; type: "status" | "priority" } | null>(null);
  const [deleteDialog, setDeleteDialog]   = useState(false);
  const [toDelete, setToDelete]           = useState<SupportTicket | null>(null);
  const [deleting, setDeleting]           = useState(false);

  // ── Filter & Sort ─────────────────────────────────────────────────────────────
  const ticketsWithRealTimeStatus = tickets.map((t) => {
    const auct = auctions.find((a) => a.id === t.auctionId);
    return auct ? { ...t, auctionStatus: auct.status } : t;
  });

  const filtered = ticketsWithRealTimeStatus.filter((t) => {
    const s = search.toLowerCase();
    const matchSearch =
      !s ||
      t.userName.toLowerCase().includes(s) ||
      t.userEmail.toLowerCase().includes(s) ||
      t.subject.toLowerCase().includes(s) ||
      t.auctionId.toLowerCase().includes(s) ||
      String(t.auctionNumber).includes(s);
    const matchStatus   = !statusFilter   || t.status   === statusFilter;
    const matchPriority = !priorityFilter || t.priority === priorityFilter;
    return matchSearch && matchStatus && matchPriority;
  }).sort((a, b) => {
    // 1. Live auction status always first
    const aLive = a.auctionStatus === "live" ? 1 : 0;
    const bLive = b.auctionStatus === "live" ? 1 : 0;
    if (aLive !== bLive) return bLive - aLive;
    // 2. Highest priority next (urgent=4 > high=3 > medium=2 > low=1)
    const pA = PRIORITY_ORDER[a.priority] ?? 0;
    const pB = PRIORITY_ORDER[b.priority] ?? 0;
    if (pA !== pB) return pB - pA;
    // 3. Newest first
    return (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0);
  });

  const paginated = filtered.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  // ── Stat counts ───────────────────────────────────────────────────────────────
  const openCount       = tickets.filter((t) => t.status === "open").length;
  const inProgressCount = tickets.filter((t) => t.status === "in_progress").length;
  const resolvedCount   = tickets.filter((t) => t.status === "resolved").length;
  const urgentCount     = tickets.filter((t) => t.priority === "urgent").length;

  const handleStatusChange = async (id: string, status: TicketStatus) => {
    setUpdatingId(id);
    try { await changeTicketStatus(id, status); }
    finally { setUpdatingId(null); }
  };

  const handlePriorityChange = async (id: string, priority: TicketPriority) => {
    setUpdatingId(id);
    try { await changeTicketPriority(id, priority); }
    finally { setUpdatingId(null); }
  };

  const handleDeleteConfirm = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await removeTicket(toDelete.id);
      setDeleteDialog(false);
      setToDelete(null);
    } finally { setDeleting(false); }
  };

  const handleRefresh = async () => {
    await refreshTickets();
    await refreshAuctions();
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "60vh" }}>
        <CircularProgress sx={{ color: colors.primary }} />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, minHeight: "60vh", justifyContent: "center" }}>
        <p style={{ color: colors.error }}>{error}</p>
        <Button onClick={handleRefresh} startIcon={<RefreshCw size={16} />} variant="contained" sx={{ bgcolor: colors.primary }}>
          Retry
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ mx: "auto", p: { xs: 2, md: 3 }, bgcolor: "#F8FAFC", minHeight: "100vh" }}>

      {/* ── Header ── */}
      <Box sx={{ mb: 4, display: "flex", flexDirection: { xs: "column", sm: "row" }, alignItems: { sm: "center" }, justifyContent: "space-between", gap: 2 }}>
        <div>
          <h1 style={{ color: colors.primary, margin: 0, fontSize: "1.75rem", fontWeight: 700, display: "flex", alignItems: "center", gap: 10 }}>
            <Ticket size={28} />
            Support Tickets
          </h1>
          <p style={{ color: colors.textSecondary, margin: "4px 0 0", fontSize: "0.875rem" }}>
            Manage auction entry support requests from users
          </p>
        </div>
        <IconButton onClick={handleRefresh} sx={{ color: colors.primary, border: `1px solid ${colors.border}`, borderRadius: 2 }} title="Refresh">
          <RefreshCw size={18} />
        </IconButton>
      </Box>

      {/* ── Stat Cards ── */}
      <Box sx={{ display: "grid", gap: 3, gridTemplateColumns: { xs: "1fr 1fr", sm: "repeat(4, 1fr)" }, mb: 4 }}>
        {[
          { label: "Open",        value: openCount,       color: "#D97706", bg: "#FEF3C7" },
          { label: "In Progress", value: inProgressCount, color: "#2563EB", bg: "#DBEAFE" },
          { label: "Resolved",    value: resolvedCount,   color: "#16A34A", bg: "#DCFCE7" },
          { label: "Urgent",      value: urgentCount,     color: "#DC2626", bg: "#FEE2E2" },
        ].map(({ label, value, color, bg }) => (
          <Paper key={label} elevation={0} sx={{ p: { xs: 2, md: 3 }, borderRadius: 3, background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.primaryLight} 100%)`, color: "#fff" }}>
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <p style={{ fontSize: "0.7rem", fontWeight: 600, opacity: 0.8, textTransform: "uppercase", letterSpacing: "0.06em", margin: 0 }}>{label}</p>
                <p style={{ fontSize: "2rem", fontWeight: 700, margin: "4px 0 0" }}>{value}</p>
              </div>
              <Box sx={{ width: 44, height: 44, borderRadius: 12, background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Ticket size={22} color="#fff" />
              </Box>
            </Box>
          </Paper>
        ))}
      </Box>

      {/* ── Search & Filter ── */}
      <Paper elevation={0} sx={{ p: 3, mb: 3, borderRadius: 3, bgcolor: "#fff", border: `1px solid ${colors.border}` }}>
        <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", alignItems: "center" }}>
          <TextField
            placeholder="Search by user, email, subject, auction…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            variant="outlined"
            size="small"
            sx={{ flex: 1, minWidth: 220, "& .MuiOutlinedInput-root": { "& fieldset": { borderColor: colors.border }, "&:hover fieldset": { borderColor: colors.primary }, "&.Mui-focused fieldset": { borderColor: colors.primary } } }}
            InputProps={{
              startAdornment: <InputAdornment position="start"><Search size={16} style={{ color: colors.textMuted }} /></InputAdornment>,
              endAdornment: search && (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => setSearch("")}><X size={14} /></IconButton>
                </InputAdornment>
              ),
            }}
          />
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <Select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value as "" | TicketStatus); setPage(0); }} displayEmpty sx={{ "& fieldset": { borderColor: colors.border } }}>
              {STATUS_OPTIONS.map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <Select value={priorityFilter} onChange={(e) => { setPriorityFilter(e.target.value as "" | TicketPriority); setPage(0); }} displayEmpty sx={{ "& fieldset": { borderColor: colors.border } }}>
              {PRIORITY_OPTIONS.map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
            </Select>
          </FormControl>
          <p style={{ margin: 0, fontSize: "0.85rem", color: colors.textSecondary }}>
            <strong style={{ color: colors.primary }}>{filtered.length}</strong> results
          </p>
        </Box>
      </Paper>

      {/* ── Table ── */}
      <Paper elevation={0} sx={{ borderRadius: 3, bgcolor: "#fff", border: `1px solid ${colors.border}`, overflow: "hidden" }}>
        <Box sx={{ overflowX: "auto", width: "100%" }}>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: colors.primaryBg }}>
                {["User", "Auction", "Category", "Subject", "Status", "Priority", "Date", "Actions"].map((col) => (
                  <TableCell key={col} sx={{ fontWeight: 700, color: colors.primaryDark, fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap", ...(col === "Actions" && { textAlign: "center" }) }}>
                    {col}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {paginated.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 10 }}>
                    <Ticket size={44} style={{ color: colors.textMuted, margin: "0 auto 12px", display: "block" }} />
                    <p style={{ color: colors.textSecondary, fontWeight: 600 }}>No tickets found</p>
                    <p style={{ color: colors.textMuted, fontSize: "0.85rem" }}>Users haven't submitted any support tickets yet</p>
                  </TableCell>
                </TableRow>
              ) : (
                paginated.map((ticket) => {
                  const isUpdating  = updatingId === ticket.id;
                  const statusStyle = getTicketStatusStyle(ticket.status);
                  const prioStyle   = getTicketPriorityStyle(ticket.priority);

                  return (
                    <TableRow key={ticket.id} sx={{ "&:hover": { bgcolor: colors.muted }, transition: "background 0.15s" }}>

                      {/* User */}
                      <TableCell>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                          <Box sx={{ width: 36, height: 36, borderRadius: "50%", bgcolor: ticket.status === "open" ? "#FEF3C7" : colors.primaryBg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontWeight: 700, color: ticket.status === "open" ? "#D97706" : colors.primary, fontSize: "0.85rem" }}>
                            {ticket.userName.charAt(0).toUpperCase()}
                          </Box>
                          <div>
                            <p style={{ margin: 0, fontWeight: ticket.status === "open" ? 700 : 600, fontSize: "0.875rem", color: colors.textPrimary }}>{ticket.userName}</p>
                            <p style={{ margin: "2px 0 0", fontSize: "0.72rem", color: colors.textMuted }}>{ticket.userEmail}</p>
                          </div>
                        </Box>
                      </TableCell>

                      {/* Auction */}
                      <TableCell>
                        <div>
                          <p style={{ margin: 0, fontSize: "0.8rem", fontWeight: 600, color: colors.textPrimary }}>#{ticket.auctionNumber}</p>
                          <span style={{ fontSize: "0.7rem", background: getAuctionStatusStyle(ticket.auctionStatus as any)?.bg || "#DBEAFE", color: getAuctionStatusStyle(ticket.auctionStatus as any)?.color || "#2563EB", padding: "2px 8px", borderRadius: 99, fontWeight: 600 }}>
                            {ticket.auctionStatus}
                          </span>
                        </div>
                      </TableCell>

                      {/* Category */}
                      <TableCell>
                        <span style={{ fontSize: "0.75rem", background: colors.primaryBg, color: colors.primary, padding: "3px 10px", borderRadius: 99, fontWeight: 600, whiteSpace: "nowrap" }}>
                          {TICKET_CATEGORY_LABELS[ticket.category]}
                        </span>
                      </TableCell>

                      {/* Subject */}
                      <TableCell sx={{ maxWidth: 200 }}>
                        <p style={{ margin: 0, fontSize: "0.82rem", color: colors.textSecondary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {ticket.subject}
                        </p>
                      </TableCell>

                      {/* Status */}
                      <TableCell>
                        <Tooltip title={can("tickets", "update") ? "Click to change status" : "Status"} placement="top" arrow>
                          <Chip
                            label={isUpdating ? "…" : statusStyle.label}
                            size="small"
                            onClick={(e) => can("tickets", "update") && setMenuAnchor({ el: e.currentTarget, id: ticket.id, type: "status" })}
                            icon={can("tickets", "update") ? <ChevronDown size={11} /> : undefined}
                            sx={{ bgcolor: statusStyle.bg, color: statusStyle.color, fontWeight: 700, fontSize: "0.7rem", cursor: can("tickets", "update") ? "pointer" : "default", "& .MuiChip-icon": { color: "inherit", ml: "6px" }, "&:hover": { opacity: can("tickets", "update") ? 0.8 : 1 } }}
                          />
                        </Tooltip>
                        <Menu
                          anchorEl={menuAnchor?.id === ticket.id && menuAnchor.type === "status" ? menuAnchor.el : null}
                          open={menuAnchor?.id === ticket.id && menuAnchor?.type === "status"}
                          onClose={() => setMenuAnchor(null)}
                          anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
                          transformOrigin={{ vertical: "top", horizontal: "left" }}
                        >
                          {(["open", "in_progress", "resolved", "closed"] as TicketStatus[]).map((s) => {
                            const st = getTicketStatusStyle(s);
                            return (
                              <MenuItem key={s} onClick={() => { setMenuAnchor(null); handleStatusChange(ticket.id, s); }} selected={ticket.status === s} sx={{ gap: 1 }}>
                                <Chip label={st.label} size="small" sx={{ bgcolor: st.bg, color: st.color, fontWeight: 700, fontSize: "0.7rem", pointerEvents: "none" }} />
                              </MenuItem>
                            );
                          })}
                        </Menu>
                      </TableCell>

                      {/* Priority — clickable to change */}
                      <TableCell>
                        <Tooltip title={can("tickets", "update") ? "Click to change priority" : "Priority"} placement="top" arrow>
                          <Chip
                            label={isUpdating ? "…" : prioStyle.label}
                            size="small"
                            onClick={(e) => can("tickets", "update") && setMenuAnchor({ el: e.currentTarget, id: ticket.id, type: "priority" })}
                            icon={can("tickets", "update") ? <ChevronDown size={11} /> : undefined}
                            sx={{ bgcolor: prioStyle.bg, color: prioStyle.color, fontWeight: 700, fontSize: "0.7rem", cursor: can("tickets", "update") ? "pointer" : "default", "& .MuiChip-icon": { color: "inherit", ml: "6px" }, "&:hover": { opacity: can("tickets", "update") ? 0.8 : 1 } }}
                          />
                        </Tooltip>
                        <Menu
                          anchorEl={menuAnchor?.id === ticket.id && menuAnchor.type === "priority" ? menuAnchor.el : null}
                          open={menuAnchor?.id === ticket.id && menuAnchor?.type === "priority"}
                          onClose={() => setMenuAnchor(null)}
                          anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
                          transformOrigin={{ vertical: "top", horizontal: "left" }}
                        >
                          {(["urgent", "high", "medium", "low"] as TicketPriority[]).map((p) => {
                            const ps = getTicketPriorityStyle(p);
                            return (
                              <MenuItem key={p} onClick={() => { setMenuAnchor(null); handlePriorityChange(ticket.id, p); }} selected={ticket.priority === p} sx={{ gap: 1 }}>
                                <Chip label={ps.label} size="small" sx={{ bgcolor: ps.bg, color: ps.color, fontWeight: 700, fontSize: "0.7rem", pointerEvents: "none" }} />
                              </MenuItem>
                            );
                          })}
                        </Menu>
                      </TableCell>

                      {/* Date */}
                      <TableCell sx={{ fontSize: "0.78rem", color: colors.textMuted, whiteSpace: "nowrap" }}>
                        {ticket.createdAt.toLocaleDateString()}
                      </TableCell>

                      {/* Actions */}
                      <TableCell align="center">
                        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 0.5 }}>
                          {can("tickets", "read") && (
                            <IconButton size="small" onClick={() => navigate(`/admin/tickets/${ticket.id}`)} sx={{ color: colors.primary, "&:hover": { bgcolor: colors.primaryBg }, borderRadius: 1.5 }} title="View ticket">
                              <Eye size={16} />
                            </IconButton>
                          )}
                          {can("tickets", "delete") && (
                            <IconButton size="small" onClick={() => { setToDelete(ticket); setDeleteDialog(true); }} sx={{ color: colors.error, "&:hover": { bgcolor: colors.errorBg }, borderRadius: 1.5 }} title="Delete ticket">
                              <Trash2 size={16} />
                            </IconButton>
                          )}
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
          onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
          rowsPerPageOptions={[5, 10, 25, 50]}
        />
      </Paper>

      {/* ── Delete Dialog ── */}
      <Dialog open={deleteDialog} onClose={() => !deleting && setDeleteDialog(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1.5, color: colors.error }}>
          <AlertTriangle size={22} /> Delete Ticket
        </DialogTitle>
        <DialogContent>
          <p style={{ color: colors.textPrimary, marginBottom: 12 }}>
            Are you sure you want to delete the ticket from <strong>{toDelete?.userName}</strong>? This action cannot be undone.
          </p>
          <Box sx={{ bgcolor: colors.errorBg, border: `1px solid ${colors.error}`, borderRadius: 2, p: 2 }}>
            <p style={{ fontSize: "0.875rem", color: colors.error, margin: 0 }}>
              <strong>Warning:</strong> This will permanently remove the ticket from Firestore.
            </p>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3, gap: 1 }}>
          <Button onClick={() => setDeleteDialog(false)} disabled={deleting} variant="outlined" sx={{ textTransform: "none", borderColor: colors.border, color: colors.textPrimary, borderRadius: 2 }}>
            Cancel
          </Button>
          <Button onClick={handleDeleteConfirm} disabled={deleting} variant="contained"
            startIcon={deleting ? <CircularProgress size={14} color="inherit" /> : <Trash2 size={16} />}
            sx={{ textTransform: "none", bgcolor: colors.error, "&:hover": { bgcolor: "#DC2626" }, borderRadius: 2, minWidth: 100 }}>
            {deleting ? "Deleting…" : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
