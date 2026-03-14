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
  Star,
  Trash2,
  ChevronDown,
  AlertTriangle,
} from "lucide-react";
import FeedbackIcon from "@mui/icons-material/Feedback";
import { useNavigate } from "react-router-dom";
import { useContactFeedback } from "@/store/AdminContext/ContactFeedbackContext/ContactFeedbackContext";
import {
  colors,
  getFeedbackStatusStyle,
  FEEDBACK_CATEGORY_LABELS,
  STAR_LABELS,
  type FeedbackMessage,
  type FeedbackStatus,
} from "../ContactUs/contact-feedback-data";
import { usePermissions } from "@/permissions/usePermissions";

const STATUS_FILTER_OPTIONS: { value: "" | FeedbackStatus; label: string }[] = [
  { value: "", label: "All Statuses" },
  { value: "new", label: "New" },
  { value: "seen", label: "Seen" },
];

function StarDisplay({ rating }: { rating: number }) {
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          size={13}
          fill={s <= rating ? "#F59E0B" : "none"}
          color={s <= rating ? "#F59E0B" : "#CBD5E1"}
        />
      ))}
      <span
        style={{ fontSize: "0.72rem", color: colors.textMuted, marginLeft: 4 }}
      >
        {STAR_LABELS[rating]}
      </span>
    </Box>
  );
}

export default function AdminFeedbackList() {
  const navigate = useNavigate();
  const {
    feedbacks,
    feedbackLoading,
    feedbackError,
    refreshFeedbacks,
    changeFeedbackStatus,
    removeFeedback,
  } = useContactFeedback();
      const { can } = usePermissions();


  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"" | FeedbackStatus>("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [menuAnchor, setMenuAnchor] = useState<{
    el: HTMLElement;
    id: string;
  } | null>(null);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [fbToDelete, setFbToDelete] = useState<FeedbackMessage | null>(null);
  const [deleting, setDeleting] = useState(false);

  const filtered = feedbacks.filter((f) => {
    const s = search.toLowerCase();
    const matchesSearch =
      !s ||
      f.name.toLowerCase().includes(s) ||
      f.email.toLowerCase().includes(s) ||
      f.title.toLowerCase().includes(s) ||
      f.feedback.toLowerCase().includes(s);
    const matchesStatus = !statusFilter || f.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const paginated = filtered.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage,
  );

  const newCount = feedbacks.filter((f) => f.status === "new").length;
  const seenCount = feedbacks.filter((f) => f.status === "seen").length;
  const avgRating = feedbacks.length
    ? (
        feedbacks.reduce((acc, f) => acc + f.rating, 0) / feedbacks.length
      ).toFixed(1)
    : "—";

  const handleStatusChange = async (id: string, status: FeedbackStatus) => {
    setUpdatingId(id);
    try {
      await changeFeedbackStatus(id, status);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!fbToDelete) return;
    setDeleting(true);
    try {
      await removeFeedback(fbToDelete.id);
      setDeleteDialog(false);
      setFbToDelete(null);
    } finally {
      setDeleting(false);
    }
  };

  if (feedbackLoading) {
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

  if (feedbackError) {
    return (
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 2,
          minHeight: "60vh",
          justifyContent: "center",
        }}
      >
        <p style={{ color: colors.error }}>{feedbackError}</p>
        <Button
          onClick={refreshFeedbacks}
          startIcon={<RefreshCw size={16} />}
          variant="contained"
          sx={{ bgcolor: colors.primary }}
        >
          Retry
        </Button>
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
      {/* ── Header ── */}
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
            <FeedbackIcon
              style={{ fontSize: 28, marginRight: 8, verticalAlign: "middle" }}
            />
            User Feedback
          </h1>
          <p
            style={{
              color: colors.textSecondary,
              margin: "4px 0 0",
              fontSize: "0.875rem",
            }}
          >
            Review and manage feedback submitted by users
          </p>
        </div>
        <IconButton
          onClick={refreshFeedbacks}
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

      {/* ── Stat Cards ── */}
      <Box
        sx={{
          display: "grid",
          gap: 3,
          gridTemplateColumns: { xs: "1fr", sm: "repeat(3, 1fr)" },
          mb: 4,
        }}
      >
        {[
          { label: "New Feedback", value: newCount },
          { label: "Seen", value: seenCount },
          { label: "Avg. Rating", value: avgRating },
        ].map(({ label, value }) => (
          <Paper
            key={label}
            elevation={0}
            sx={{
              p: { xs: 2, md: 3 },
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
                    fontSize: "0.7rem",
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
                    fontSize: "2rem",
                    fontWeight: 700,
                    margin: "4px 0 0",
                  }}
                >
                  {value}
                </p>
              </div>
              <Box
                sx={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  background: "rgba(255,255,255,0.2)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Star size={22} color="#fff" />
              </Box>
            </Box>
          </Paper>
        ))}
      </Box>

      {/* ── Search & Filter ── */}
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
            placeholder="Search by name, email, title…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
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
              endAdornment: search && (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => setSearch("")}>
                    <X size={14} />
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <Select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as "" | FeedbackStatus);
                setPage(0);
              }}
              displayEmpty
              sx={{ "& fieldset": { borderColor: colors.border } }}
            >
              {STATUS_FILTER_OPTIONS.map((o) => (
                <MenuItem key={o.value} value={o.value}>
                  {o.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <p
            style={{
              margin: 0,
              fontSize: "0.85rem",
              color: colors.textSecondary,
            }}
          >
            <strong style={{ color: colors.primary }}>{filtered.length}</strong>{" "}
            results
          </p>
        </Box>
      </Paper>

      {/* ── Table ── */}
      <Paper
        elevation={0}
        sx={{
          borderRadius: 3,
          bgcolor: "#fff",
          border: `1px solid ${colors.border}`,
          overflow: "hidden",
        }}
      >
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: colors.primaryBg }}>
              {[
                { label: "User" },
                { label: "Category" },
                { label: "Rating" },
                { label: "Title" },
                { label: "Recommend" },
                { label: "Status" },
                { label: "Date" },
                { label: "Actions", center: true },
              ].map(({ label, center }) => (
                <TableCell
                  key={label}
                  sx={{
                    fontWeight: 700,
                    color: colors.primaryDark,
                    fontSize: "0.72rem",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    whiteSpace: "nowrap",
                    ...(center && { textAlign: "center" }),
                  }}
                >
                  {label}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {paginated.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 10 }}>
                  <Star
                    size={44}
                    style={{
                      color: colors.textMuted,
                      margin: "0 auto 12px",
                      display: "block",
                    }}
                  />
                  <p style={{ color: colors.textSecondary, fontWeight: 600 }}>
                    No feedback found
                  </p>
                  <p style={{ color: colors.textMuted, fontSize: "0.85rem" }}>
                    Try adjusting your search
                  </p>
                </TableCell>
              </TableRow>
            ) : (
              paginated.map((fb) => {
                const isUpdating = updatingId === fb.id;
                return (
                  <TableRow
                    key={fb.id}
                    sx={{
                      "&:hover": { bgcolor: colors.muted },
                      transition: "background 0.15s",
                    }}
                  >
                    {/* User */}
                    <TableCell>
                      <Box
                        sx={{ display: "flex", alignItems: "center", gap: 1.5 }}
                      >
                        <Box
                          sx={{
                            width: 34,
                            height: 34,
                            borderRadius: "50%",
                            bgcolor:
                              fb.status === "new"
                                ? "#FEF3C7"
                                : colors.primaryBg,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                            fontWeight: 700,
                            color:
                              fb.status === "new" ? "#D97706" : colors.primary,
                            fontSize: "0.8rem",
                          }}
                        >
                          {fb.name ? fb.name.charAt(0).toUpperCase() : "?"}
                        </Box>
                        <div>
                          <p
                            style={{
                              margin: 0,
                              fontWeight: fb.status === "new" ? 700 : 600,
                              fontSize: "0.85rem",
                              color: colors.textPrimary,
                            }}
                          >
                            {fb.name || "Anonymous"}
                          </p>
                          <p
                            style={{
                              margin: "2px 0 0",
                              fontSize: "0.7rem",
                              color: colors.textMuted,
                            }}
                          >
                            {fb.email || "—"}
                          </p>
                        </div>
                      </Box>
                    </TableCell>

                    {/* Category */}
                    <TableCell>
                      <span
                        style={{
                          fontSize: "0.75rem",
                          background: colors.primaryBg,
                          color: colors.primary,
                          padding: "3px 10px",
                          borderRadius: 99,
                          fontWeight: 600,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {(FEEDBACK_CATEGORY_LABELS[fb.category] ??
                          fb.category) ||
                          "—"}
                      </span>
                    </TableCell>

                    {/* Rating */}
                    <TableCell>
                      <StarDisplay rating={fb.rating} />
                    </TableCell>

                    {/* Title */}
                    <TableCell sx={{ maxWidth: 160 }}>
                      <p
                        style={{
                          margin: 0,
                          fontSize: "0.82rem",
                          color: colors.textSecondary,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {fb.title || "—"}
                      </p>
                    </TableCell>

                    {/* Recommend */}
                    <TableCell>
                      <span
                        style={{
                          fontSize: "0.72rem",
                          color: colors.textMuted,
                          fontStyle: fb.recommend ? "normal" : "italic",
                        }}
                      >
                        {fb.recommend || "—"}
                      </span>
                    </TableCell>

                    {/* Status — click chip to open dropdown menu */}
                    <TableCell>
                      <Tooltip
                        title="Click to change status"
                        placement="top"
                        arrow
                      >
                        <Chip
                          label={
                            isUpdating
                              ? "…"
                              : getFeedbackStatusStyle(fb.status).label
                          }
                          size="small"
                          onClick={(e) =>
                            setMenuAnchor({ el: e.currentTarget, id: fb.id })
                          }
                          icon={<ChevronDown size={11} />}
                          sx={{
                            bgcolor: getFeedbackStatusStyle(fb.status).bg,
                            color: getFeedbackStatusStyle(fb.status).color,
                            fontWeight: 700,
                            fontSize: "0.7rem",
                            cursor: "pointer",
                            "& .MuiChip-icon": { color: "inherit", ml: "6px" },
                            "&:hover": { opacity: 0.8 },
                          }}
                        />
                      </Tooltip>
                      <Menu
                        anchorEl={
                          menuAnchor?.id === fb.id ? menuAnchor.el : null
                        }
                        open={menuAnchor?.id === fb.id}
                        onClose={() => setMenuAnchor(null)}
                        anchorOrigin={{
                          vertical: "bottom",
                          horizontal: "left",
                        }}
                        transformOrigin={{
                          vertical: "top",
                          horizontal: "left",
                        }}
                      >
                        {(["new", "seen"] as FeedbackStatus[]).map((s) => {
                          const style = getFeedbackStatusStyle(s);
                          return (
                            <MenuItem
                              key={s}
                              onClick={() => {
                                setMenuAnchor(null);
                                handleStatusChange(fb.id, s);
                              }}
                              selected={fb.status === s}
                              sx={{ gap: 1 }}
                            >
                              <Chip
                                label={style.label}
                                size="small"
                                sx={{
                                  bgcolor: style.bg,
                                  color: style.color,
                                  fontWeight: 700,
                                  fontSize: "0.7rem",
                                  pointerEvents: "none",
                                }}
                              />
                            </MenuItem>
                          );
                        })}
                      </Menu>
                    </TableCell>

                    {/* Date */}
                    <TableCell
                      sx={{
                        fontSize: "0.78rem",
                        color: colors.textMuted,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {fb.createdAt.toLocaleDateString()}
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
                        {can("feedback", "read") && <IconButton
                          size="small"
                          onClick={() => navigate(`/admin/feedback/${fb.id}`)}
                          sx={{
                            color: colors.primary,
                            "&:hover": { bgcolor: colors.primaryBg },
                            borderRadius: 1.5,
                          }}
                          title="View full feedback"
                        >
                          <Eye size={16} />
                        </IconButton>}
                        {can("feedback", "delete") && <IconButton
                          size="small"
                          onClick={() => {
                            setFbToDelete(fb);
                            setDeleteDialog(true);
                          }}
                          sx={{
                            color: colors.error,
                            "&:hover": { bgcolor: colors.errorBg },
                            borderRadius: 1.5,
                          }}
                          title="Delete feedback"
                        >
                          <Trash2 size={16} />
                        </IconButton>}
                      </Box>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
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
          <AlertTriangle size={22} /> Delete Feedback
        </DialogTitle>
        <DialogContent>
          <p style={{ color: colors.textPrimary, marginBottom: 12 }}>
            Are you sure you want to delete feedback from{" "}
            <strong>{fbToDelete?.name || "Anonymous"}</strong>? This action
            cannot be undone.
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
              <strong>Warning:</strong> This will permanently remove the
              feedback from Firestore.
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
            onClick={handleDeleteConfirm}
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
    </Box>
  );
}
