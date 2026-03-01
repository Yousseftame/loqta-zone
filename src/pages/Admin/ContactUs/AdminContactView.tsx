import { useEffect, useState } from "react";
import {
  Paper,
  Box,
  Chip,
  Button,
  CircularProgress,
  Divider,
} from "@mui/material";
import {
  ArrowLeft,
  Mail,
  Phone,
  User,
  Calendar,
  Tag,
  MessageSquare,
  MailOpen,
  MessageSquareReply,
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

export default function AdminContactView() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { getContact, changeContactStatus } = useContactFeedback();

  const [msg, setMsg] = useState<ContactMessage | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);
      const data = await getContact(id);
      setMsg(data);
      // Auto-mark as seen when opened
      if (data && data.status === "new") {
        await changeContactStatus(id, "seen");
        setMsg((prev) => (prev ? { ...prev, status: "seen" } : prev));
      }
      setLoading(false);
    })();
  }, [id]);

  const handleStatusChange = async (status: ContactStatus) => {
    if (!id || !msg) return;
    setUpdating(true);
    try {
      await changeContactStatus(id, status);
      setMsg((prev) => (prev ? { ...prev, status } : prev));
    } finally {
      setUpdating(false);
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

  const sStyle = getContactStatusStyle(msg.status);

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

      {/* Hero card */}
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
                label={sStyle.label}
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
                { icon: <Mail size={12} />, text: msg.email },
                msg.phone && { icon: <Phone size={12} />, text: msg.phone },
              ]
                .filter(Boolean)
                .map((item: any) => (
                  <span
                    key={item.text}
                    style={{
                      fontSize: "0.75rem",
                      background: "rgba(255,255,255,0.2)",
                      color: "#fff",
                      padding: "3px 10px",
                      borderRadius: 99,
                      fontWeight: 600,
                      display: "flex",
                      alignItems: "center",
                      gap: 5,
                    }}
                  >
                    {item.icon} {item.text}
                  </span>
                ))}
            </Box>
          </Box>

          {/* Status actions */}
          <Box
            sx={{ display: "flex", gap: 1.5, flexShrink: 0, flexWrap: "wrap" }}
          >
            {msg.status !== "seen" && msg.status !== "replied" && (
              <Button
                disabled={updating}
                onClick={() => handleStatusChange("seen")}
                variant="contained"
                startIcon={<MailOpen size={15} />}
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
                Mark Seen
              </Button>
            )}
            {msg.status !== "replied" && (
              <Button
                disabled={updating}
                onClick={() => handleStatusChange("replied")}
                variant="contained"
                startIcon={<MessageSquareReply size={15} />}
                sx={{
                  bgcolor: "rgba(34,197,94,0.75)",
                  color: "#fff",
                  textTransform: "none",
                  borderRadius: 2,
                  fontWeight: 600,
                  "&:hover": { bgcolor: "rgba(34,197,94,0.9)" },
                }}
              >
                Mark Replied
              </Button>
            )}
          </Box>
        </Box>
      </Paper>

      {/* Details */}
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
              {
                label: "Status",
                icon: null,
                value: (
                  <Chip
                    label={sStyle.label}
                    size="small"
                    sx={{
                      bgcolor: sStyle.bg,
                      color: sStyle.color,
                      fontWeight: 700,
                    }}
                  />
                ),
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
                  <span style={{ color: colors.primary }}>{icon}</span> {label}
                </p>
                {typeof value === "string" ? (
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
                ) : (
                  value
                )}
              </Box>
            ))}
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
              — After replying, mark this message as <strong>Replied</strong>{" "}
              above.
            </p>
          </Box>
        </Box>
      </Paper>
    </Box>
  );
}
