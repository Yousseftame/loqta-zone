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
  InputLabel,
} from "@mui/material";
import {
  ArrowLeft,
  Mail,
  Phone,
  User,
  Calendar,
  Tag,
  MessageSquare,
  Save,
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { useContactFeedback } from "@/store/AdminContext/ContactFeedbackContext/ContactFeedbackContext";
import {
  colors,
  getContactStatusStyle,
  SUBJECT_LABELS,
  type ContactMessage,
  type ContactStatus,
} from "./contact-feedback-data";

const STATUS_OPTIONS: { value: ContactStatus; label: string }[] = [
  { value: "new", label: "New" },
  { value: "seen", label: "Seen" },
  { value: "replied", label: "Replied" },
];

export default function AdminContactView() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { getContact, changeContactStatus } = useContactFeedback();

  const [msg, setMsg] = useState<ContactMessage | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState<ContactStatus>("new");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Load message — NO auto-status change
  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);
      const data = await getContact(id);
      if (data) {
        setMsg(data);
        setSelectedStatus(data.status);
      }
      setLoading(false);
    })();
  }, [id]);

  const handleSave = async () => {
    if (!id || !msg || selectedStatus === msg.status) return;
    setSaving(true);
    try {
      await changeContactStatus(id, selectedStatus);
      setMsg((prev) => (prev ? { ...prev, status: selectedStatus } : prev));
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
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

  if (!msg) {
    return (
      <Box sx={{ p: 4, textAlign: "center" }}>
        <p style={{ color: colors.textSecondary }}>Message not found.</p>
        <Button
          onClick={() => navigate("/admin/contacts")}
          variant="contained"
          sx={{ mt: 2, bgcolor: colors.primary }}
        >
          Back
        </Button>
      </Box>
    );
  }

  const currentStyle = getContactStatusStyle(msg.status);
  const selectedStyle = getContactStatusStyle(selectedStatus);
  const isDirty = selectedStatus !== msg.status;

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
        onClick={() => navigate("/admin/contacts")}
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
        Back to Messages
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
            {msg.name.charAt(0).toUpperCase()}
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
                {msg.name}
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
            <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
              {[
                { icon: "✉", text: msg.email },
                ...(msg.phone ? [{ icon: "📞", text: msg.phone }] : []),
              ].map((item) => (
                <span
                  key={item.text}
                  style={{
                    fontSize: "0.75rem",
                    background: "rgba(255,255,255,0.2)",
                    color: "#fff",
                    padding: "3px 10px",
                    borderRadius: 99,
                    fontWeight: 600,
                  }}
                >
                  {item.icon} {item.text}
                </span>
              ))}
            </Box>
          </Box>

          {/* Status changer in hero */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1.5,
              flexShrink: 0,
              flexWrap: "wrap",
            }}
          >
            <FormControl size="small" sx={{ minWidth: 130 }}>
              <Select
                value={selectedStatus}
                onChange={(e) =>
                  setSelectedStatus(e.target.value as ContactStatus)
                }
                renderValue={(val) => {
                  const s = getContactStatusStyle(val as ContactStatus);
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
                  const s = getContactStatusStyle(o.value);
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
                color: isDirty ? colors.primary : "rgba(255,255,255,0.6)",
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
          <MessageSquare size={18} style={{ color: colors.primary }} />
          <span style={{ fontWeight: 700, color: colors.textPrimary }}>
            Message Details
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
              { label: "Full Name", icon: <User size={14} />, value: msg.name },
              { label: "Email", icon: <Mail size={14} />, value: msg.email },
              {
                label: "Phone",
                icon: <Phone size={14} />,
                value: msg.phone || "—",
              },
              {
                label: "Subject",
                icon: <Tag size={14} />,
                value: (SUBJECT_LABELS[msg.subject] ?? msg.subject) || "—",
              },
              {
                label: "Date Received",
                icon: <Calendar size={14} />,
                value: msg.createdAt.toLocaleString(),
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
                  <span style={{ color: colors.primary }}>{icon}</span>
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

            {/* Current status display */}
            <Box>
              <p
                style={{
                  margin: "0 0 6px",
                  fontSize: "0.72rem",
                  color: colors.textMuted,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                Current Status
              </p>
              <Chip
                label={currentStyle.label}
                size="small"
                sx={{
                  bgcolor: currentStyle.bg,
                  color: currentStyle.color,
                  fontWeight: 700,
                }}
              />
            </Box>
          </Box>

          <Divider />

          {/* Message body */}
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
              <span style={{ color: colors.primary }}>
                <MessageSquare size={14} />
              </span>{" "}
              Message
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
                {msg.message}
              </p>
            </Box>
          </Box>

          {/* Reply hint */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1.5,
              bgcolor: colors.primaryBg,
              border: `1px solid ${colors.primaryRing}`,
              borderRadius: 2,
              p: 2,
            }}
          >
            <Mail size={16} style={{ color: colors.primary, flexShrink: 0 }} />
            <p
              style={{
                fontSize: "0.85rem",
                color: colors.primaryDark,
                margin: 0,
              }}
            >
              <strong>Reply via email:</strong>{" "}
              <a
                href={`mailto:${msg.email}?subject=Re: ${SUBJECT_LABELS[msg.subject] ?? msg.subject}`}
                style={{ color: colors.primary }}
              >
                {msg.email}
              </a>{" "}
              — After replying, change the status to <strong>Replied</strong>{" "}
              above and click Save.
            </p>
          </Box>
        </Box>
      </Paper>
    </Box>
  );
}
