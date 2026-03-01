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
  Select,
  MenuItem,
  FormControl,
} from "@mui/material";
import { Search, X, Eye, RefreshCw, Star, MailOpen } from "lucide-react";
import FeedbackIcon from "@mui/icons-material/Feedback";
import { useNavigate } from "react-router-dom";
import { useContactFeedback } from "@/store/AdminContext/ContactFeedbackContext/ContactFeedbackContext";
import {
  colors,
  getFeedbackStatusStyle,
  FEEDBACK_CATEGORY_LABELS,
  STAR_LABELS,
  type FeedbackStatus,
} from "../ContactUs/contact-feedback-data";

const STATUS_OPTIONS: { value: "" | FeedbackStatus; label: string }[] = [
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
  } = useContactFeedback();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"" | FeedbackStatus>("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

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
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <FeedbackIcon style={{ fontSize: 32 }} />
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

      {/* Stat cards */}
      <Box
        sx={{
          display: "grid",
          gap: 2,
          gridTemplateColumns: { xs: "1fr 1fr", sm: "repeat(3, 1fr)" },
          mb: 4,
        }}
      >
        {[
          { label: "New", value: newCount, color: "#D97706", bg: "#FEF3C7" },
          { label: "Seen", value: seenCount, color: "#2563EB", bg: "#DBEAFE" },
          {
            label: "Avg. Rating",
            value: avgRating,
            color: "#D97706",
            bg: "#FEF3C7",
          },
        ].map(({ label, value, color, bg }) => (
          <Paper
            key={label}
            elevation={0}
            sx={{
              p: { xs: 2, md: 3 },
              borderRadius: 3,
              border: `1px solid ${colors.border}`,
              bgcolor: bg,
            }}
          >
            <p
              style={{
                margin: 0,
                fontSize: "0.7rem",
                fontWeight: 700,
                color,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
              }}
            >
              {label === "Avg. Rating" ? "⭐ " : ""}
              {label}
            </p>
            <p
              style={{
                margin: "4px 0 0",
                fontSize: "2rem",
                fontWeight: 700,
                color,
              }}
            >
              {value}
            </p>
          </Paper>
        ))}
      </Box>

      {/* Filters */}
      <Paper
        elevation={0}
        sx={{
          p: 2.5,
          mb: 3,
          borderRadius: 3,
          bgcolor: "#fff",
          border: `1px solid ${colors.border}`,
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
            {STATUS_OPTIONS.map((o) => (
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
          <Table sx={{ minWidth: 700 }}>
            <TableHead>
              <TableRow sx={{ bgcolor: colors.primaryBg }}>
                {[
                  "User",
                  "Category",
                  "Rating",
                  "Title",
                  "Recommend",
                  "Status",
                  "Date",
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
                  </TableCell>
                </TableRow>
              ) : (
                paginated.map((fb) => {
                  const sStyle = getFeedbackStatusStyle(fb.status);
                  return (
                    <TableRow
                      key={fb.id}
                      sx={{
                        "&:hover": { bgcolor: colors.muted },
                        transition: "background 0.15s",
                      }}
                    >
                      {/* User */}
                      <TableCell sx={{ minWidth: 160 }}>
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 1.5,
                          }}
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
                                fb.status === "new"
                                  ? "#D97706"
                                  : colors.primary,
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
                      <TableCell sx={{ minWidth: 130 }}>
                        <span
                          style={{
                            fontSize: "0.75rem",
                            background: colors.primaryBg,
                            color: colors.primary,
                            padding: "3px 10px",
                            borderRadius: 99,
                            fontWeight: 600,
                          }}
                        >
                          {(FEEDBACK_CATEGORY_LABELS[fb.category] ??
                            fb.category) ||
                            "—"}
                        </span>
                      </TableCell>

                      {/* Rating */}
                      <TableCell sx={{ minWidth: 140 }}>
                        <StarDisplay rating={fb.rating} />
                      </TableCell>

                      {/* Title */}
                      <TableCell sx={{ minWidth: 160, maxWidth: 200 }}>
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
                      <TableCell sx={{ minWidth: 110 }}>
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

                      {/* Status */}
                      <TableCell sx={{ minWidth: 80 }}>
                        <Chip
                          label={sStyle.label}
                          size="small"
                          sx={{
                            bgcolor: sStyle.bg,
                            color: sStyle.color,
                            fontWeight: 700,
                            fontSize: "0.7rem",
                          }}
                        />
                      </TableCell>

                      {/* Date */}
                      <TableCell
                        sx={{
                          minWidth: 100,
                          fontSize: "0.78rem",
                          color: colors.textMuted,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {fb.createdAt.toLocaleDateString()}
                      </TableCell>

                      {/* Actions */}
                      <TableCell align="center" sx={{ minWidth: 100 }}>
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 0.5,
                          }}
                        >
                          <IconButton
                            size="small"
                            onClick={() => navigate(`/admin/feedback/${fb.id}`)}
                            sx={{
                              color: colors.primary,
                              "&:hover": { bgcolor: colors.primaryBg },
                              borderRadius: 1.5,
                            }}
                            title="View"
                          >
                            <Eye size={16} />
                          </IconButton>
                          {fb.status === "new" && (
                            <IconButton
                              size="small"
                              onClick={() =>
                                changeFeedbackStatus(fb.id, "seen")
                              }
                              sx={{
                                color: "#2563EB",
                                "&:hover": { bgcolor: "#DBEAFE" },
                                borderRadius: 1.5,
                              }}
                              title="Mark as Seen"
                            >
                              <MailOpen size={16} />
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
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
          rowsPerPageOptions={[5, 10, 25, 50]}
        />
      </Paper>
    </Box>
  );
}
