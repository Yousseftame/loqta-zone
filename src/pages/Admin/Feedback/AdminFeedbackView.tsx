import { useEffect, useState } from "react";
import {
  Paper,
  Box,
  Chip,
  Button,
  CircularProgress,
  Divider,
  Select,
  MenuItem,
  FormControl,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import {
  ArrowLeft,
  Mail,
  User,
  Calendar,
  Star,
  MessageSquare,
  ThumbsUp,
  Save,
  Trash2,
  AlertTriangle,
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { useContactFeedback } from "@/store/AdminContext/ContactFeedbackContext/ContactFeedbackContext";
import {
  colors,
  getFeedbackStatusStyle,
  FEEDBACK_CATEGORY_LABELS,
  STAR_LABELS,
  type FeedbackMessage,
  type FeedbackStatus,
} from "../ContactUs/contact-feedback-data";

const STATUS_OPTIONS: { value: FeedbackStatus; label: string }[] = [
  { value: "new", label: "New" },
  { value: "seen", label: "Seen" },
];

function StarDisplay({ rating }: { rating: number }) {
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          size={22}
          fill={s <= rating ? "#F59E0B" : "none"}
          color={s <= rating ? "#F59E0B" : "#CBD5E1"}
        />
      ))}
      <span
        style={{
          fontSize: "0.95rem",
          fontWeight: 700,
          color: "#D97706",
          marginLeft: 8,
        }}
      >
        {STAR_LABELS[rating] ?? ""}
      </span>
    </Box>
  );
}

export default function AdminFeedbackView() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { getFeedback, changeFeedbackStatus, removeFeedback } =
    useContactFeedback();

  const [fb, setFb] = useState<FeedbackMessage | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState<FeedbackStatus>("new");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);
      const data = await getFeedback(id);
      if (data) {
        setFb(data);
        setSelectedStatus(data.status);
      }
      setLoading(false);
    })();
  }, [id]);

  const handleSave = async () => {
    if (!id || !fb || selectedStatus === fb.status) return;
    setSaving(true);
    try {
      await changeFeedbackStatus(id, selectedStatus);
      setFb((prev) => (prev ? { ...prev, status: selectedStatus } : prev));
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    setDeleting(true);
    try {
      await removeFeedback(id);
      navigate("/admin/feedback");
    } finally {
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

  if (!fb) {
    return (
      <Box sx={{ p: 4, textAlign: "center" }}>
        <p style={{ color: colors.textSecondary }}>Feedback not found.</p>
        <Button
          onClick={() => navigate("/admin/feedback")}
          variant="contained"
          sx={{ mt: 2, bgcolor: colors.primary }}
        >
          Back
        </Button>
      </Box>
    );
  }

  const currentStyle = getFeedbackStatusStyle(fb.status);
  const isDirty = selectedStatus !== fb.status;

  return (
    <Box
      sx={{
        mx: "auto",
        p: { xs: 2, md: 4 },
        bgcolor: "#F8FAFC",
        minHeight: "100vh",
      }}
    >
      {/* Back */}
      <Button
        startIcon={<ArrowLeft size={16} />}
        onClick={() => navigate("/admin/feedback")}
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
        Back to Feedback
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
          {/* Avatar */}
          <Box
            sx={{
              width: { xs: 56, md: 72 },
              height: { xs: 56, md: 72 },
              borderRadius: 3,
              bgcolor: "rgba(255,255,255,0.2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "1.75rem",
              fontWeight: 700,
              color: "#fff",
              flexShrink: 0,
              border: "2px solid rgba(255,255,255,0.3)",
            }}
          >
            {fb.name ? fb.name.charAt(0).toUpperCase() : "★"}
          </Box>

          {/* Info */}
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
                {fb.title || "Feedback"}
              </h1>
              <Chip
                label={currentStyle.label}
                size="small"
                sx={{
                  bgcolor: "rgba(255,255,255,0.25)",
                  color: "#fff",
                  fontWeight: 700,
                  fontSize: "0.7rem",
                }}
              />
            </Box>
            <p
              style={{
                margin: "0 0 10px",
                color: "rgba(255,255,255,0.75)",
                fontSize: "0.85rem",
              }}
            >
              from{" "}
              <strong style={{ color: "#fff" }}>
                {fb.name || "Anonymous"}
              </strong>
              {fb.email && <> · {fb.email}</>}
            </p>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              {[1, 2, 3, 4, 5].map((s) => (
                <Star
                  key={s}
                  size={18}
                  fill={s <= fb.rating ? "#F59E0B" : "none"}
                  color={s <= fb.rating ? "#F59E0B" : "rgba(255,255,255,0.3)"}
                />
              ))}
              <span
                style={{
                  fontSize: "0.78rem",
                  color: "rgba(255,255,255,0.75)",
                  marginLeft: 6,
                }}
              >
                {STAR_LABELS[fb.rating]}
              </span>
            </Box>
          </Box>

          {/* Status changer + delete in hero */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1.5,
              flexShrink: 0,
              flexWrap: "wrap",
            }}
          >
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <Select
                value={selectedStatus}
                onChange={(e) =>
                  setSelectedStatus(e.target.value as FeedbackStatus)
                }
                renderValue={(val) => {
                  const s = getFeedbackStatusStyle(val as FeedbackStatus);
                  return (
                    <Chip
                      label={s.label}
                      size="small"
                      sx={{
                        bgcolor: "rgba(255,255,255,0.9)",
                        color: s.color,
                        fontWeight: 700,
                        fontSize: "0.7rem",
                        pointerEvents: "none",
                      }}
                    />
                  );
                }}
                sx={{
                  bgcolor: "rgba(255,255,255,0.15)",
                  "& .MuiOutlinedInput-notchedOutline": {
                    borderColor: "rgba(255,255,255,0.4)",
                  },
                  "&:hover .MuiOutlinedInput-notchedOutline": {
                    borderColor: "rgba(255,255,255,0.7)",
                  },
                  "& .MuiSelect-icon": { color: "#fff" },
                  "& .MuiSelect-select": { py: 0.75, pl: 1 },
                }}
              >
                {STATUS_OPTIONS.map((o) => {
                  const s = getFeedbackStatusStyle(o.value);
                  return (
                    <MenuItem key={o.value} value={o.value} sx={{ gap: 1 }}>
                      <Chip
                        label={o.label}
                        size="small"
                        sx={{
                          bgcolor: s.bg,
                          color: s.color,
                          fontWeight: 700,
                          fontSize: "0.7rem",
                          pointerEvents: "none",
                        }}
                      />
                    </MenuItem>
                  );
                })}
              </Select>
            </FormControl>
            <Button
              onClick={handleSave}
              disabled={saving || !isDirty}
              variant="contained"
              startIcon={<Save size={15} />}
              sx={{
                bgcolor: isDirty
                  ? "rgba(255,255,255,0.9)"
                  : "rgba(255,255,255,0.25)",
                color: isDirty ? "#7C3AED" : "rgba(255,255,255,0.6)",
                textTransform: "none",
                borderRadius: 2,
                fontWeight: 700,
                "&:hover": { bgcolor: "#fff" },
                "&:disabled": {
                  bgcolor: "rgba(255,255,255,0.2)",
                  color: "rgba(255,255,255,0.5)",
                },
                transition: "all 0.2s",
              }}
            >
              {saving ? "Saving…" : saved ? "Saved ✓" : "Save"}
            </Button>
            <Button
              onClick={() => setDeleteDialog(true)}
              variant="contained"
              startIcon={<Trash2 size={15} />}
              sx={{
                bgcolor: "rgba(239,68,68,0.75)",
                color: "#fff",
                textTransform: "none",
                borderRadius: 2,
                fontWeight: 700,
                "&:hover": { bgcolor: "rgba(239,68,68,0.9)" },
              }}
            >
              Delete
            </Button>
          </Box>
        </Box>
      </Paper>

      {/* ── Details ── */}
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
          <Star size={18} style={{ color: "#7C3AED" }} />
          <span style={{ fontWeight: 700, color: colors.textPrimary }}>
            Feedback Details
          </span>
        </Box>
        <Box
          sx={{
            p: { xs: 2, md: 3 },
            display: "flex",
            flexDirection: "column",
            gap: 3,
          }}
        >
          {/* Meta grid */}
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
              gap: 2.5,
            }}
          >
            {[
              {
                label: "Name",
                icon: <User size={14} />,
                value: fb.name || "Anonymous",
              },
              {
                label: "Email",
                icon: <Mail size={14} />,
                value: fb.email || "—",
              },
              {
                label: "Category",
                icon: <Star size={14} />,
                value:
                  (FEEDBACK_CATEGORY_LABELS[fb.category] ?? fb.category) || "—",
              },
              {
                label: "Date Submitted",
                icon: <Calendar size={14} />,
                value: fb.createdAt.toLocaleString(),
              },
            ].map(({ label, icon, value }) => (
              <Box key={label}>
                <p
                  style={{
                    margin: "0 0 6px",
                    fontSize: "0.72rem",
                    color: colors.textMuted,
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                  }}
                >
                  <span style={{ color: "#7C3AED" }}>{icon}</span>
                  {label}
                </p>
                <p
                  style={{
                    margin: 0,
                    fontSize: "0.9rem",
                    color: colors.textPrimary,
                    fontWeight: 500,
                  }}
                >
                  {value}
                </p>
              </Box>
            ))}

            {/* Rating */}
            <Box>
              <p
                style={{
                  margin: "0 0 8px",
                  fontSize: "0.72rem",
                  color: colors.textMuted,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                Rating
              </p>
              <StarDisplay rating={fb.rating} />
            </Box>

            {/* Status — enhanced inline changer */}
            <Box>
              <p
                style={{
                  margin: "0 0 8px",
                  fontSize: "0.72rem",
                  color: colors.textMuted,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                Status
              </p>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 2,
                  flexWrap: "wrap",
                }}
              >
                {/* Current persisted status */}
                <Chip
                  label={currentStyle.label}
                  size="small"
                  sx={{
                    bgcolor: currentStyle.bg,
                    color: currentStyle.color,
                    fontWeight: 700,
                  }}
                />
                {/* Inline quick-change */}
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <span
                    style={{ fontSize: "0.72rem", color: colors.textMuted }}
                  >
                    Change to:
                  </span>
                  <Box sx={{ display: "flex", gap: 0.75 }}>
                    {STATUS_OPTIONS.filter((o) => o.value !== fb.status).map(
                      (o) => {
                        const s = getFeedbackStatusStyle(o.value);
                        const isSelected = selectedStatus === o.value;
                        return (
                          <Chip
                            key={o.value}
                            label={o.label}
                            size="small"
                            onClick={() => setSelectedStatus(o.value)}
                            sx={{
                              bgcolor: isSelected ? s.bg : "#F1F5F9",
                              color: isSelected ? s.color : colors.textMuted,
                              fontWeight: 700,
                              fontSize: "0.68rem",
                              border: isSelected
                                ? `1.5px solid ${s.color}`
                                : "1.5px solid transparent",
                              cursor: "pointer",
                              transition: "all 0.15s",
                              "&:hover": { bgcolor: s.bg, color: s.color },
                            }}
                          />
                        );
                      },
                    )}
                  </Box>
                </Box>
                {isDirty && (
                  <Button
                    onClick={handleSave}
                    disabled={saving}
                    size="small"
                    variant="contained"
                    sx={{
                      bgcolor: "#7C3AED",
                      textTransform: "none",
                      borderRadius: 2,
                      fontSize: "0.72rem",
                      px: 1.5,
                      py: 0.5,
                      minWidth: 0,
                    }}
                  >
                    {saving ? "…" : "Save"}
                  </Button>
                )}
              </Box>
            </Box>
          </Box>

          {/* Recommend */}
          {fb.recommend && (
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1.5,
                bgcolor: "#F3E8FF",
                border: "1px solid #DDD6FE",
                borderRadius: 2,
                p: 2,
              }}
            >
              <ThumbsUp size={16} style={{ color: "#7C3AED", flexShrink: 0 }} />
              <p style={{ margin: 0, fontSize: "0.875rem", color: "#6D28D9" }}>
                <strong>Would recommend Loqta Zone?</strong> {fb.recommend}
              </p>
            </Box>
          )}

          <Divider />

          {/* Feedback body */}
          <Box>
            <p
              style={{
                margin: "0 0 10px",
                fontSize: "0.72rem",
                color: colors.textMuted,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                display: "flex",
                alignItems: "center",
                gap: 5,
              }}
            >
              <span style={{ color: "#7C3AED" }}>
                <MessageSquare size={14} />
              </span>{" "}
              Detailed Feedback
            </p>
            <Box
              sx={{
                bgcolor: colors.muted,
                borderRadius: 2,
                p: 2.5,
                border: `1px solid ${colors.border}`,
              }}
            >
              <p
                style={{
                  margin: 0,
                  fontSize: "0.9rem",
                  color: colors.textSecondary,
                  lineHeight: 1.75,
                  whiteSpace: "pre-wrap",
                }}
              >
                {fb.feedback}
              </p>
            </Box>
          </Box>
        </Box>
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
            Are you sure you want to delete the feedback from{" "}
            <strong>{fb.name || "Anonymous"}</strong>? This action cannot be
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
            {deleting ? "Deleting…" : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
