import { useEffect, useState } from "react";
import {
  Button,
  Paper,
  Box,
  Chip,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
} from "@mui/material";
import {
  ArrowLeft,
  Save,
  ClipboardList,
  User,
  Tag,
  DollarSign,
  AlignLeft,
  Zap,
  Calendar,
  Link2,
  Info,
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import {
  colors,
  getStatusStyle,
  getUrgencyStyle,
  REQUEST_STATUS_OPTIONS,
  REQUEST_URGENCY_LABELS,
  type AuctionRequest,
  type AuctionRequestFormData,
} from "./auction-requests-data";
import { useAuctionRequests } from "@/store/AdminContext/AuctionRequestContext/AuctionRequestContext";

const inputSx = {
  "& .MuiOutlinedInput-root": {
    bgcolor: "#fff",
    "& fieldset": { borderColor: colors.border },
    "&:hover fieldset": { borderColor: colors.primary },
    "&.Mui-focused fieldset": { borderColor: colors.primary, borderWidth: 2 },
  },
  "& .MuiInputLabel-root.Mui-focused": { color: colors.primary },
};

const selectSx = {
  bgcolor: "#fff",
  "& .MuiOutlinedInput-notchedOutline": { borderColor: colors.border },
  "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: colors.primary },
  "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
    borderColor: colors.primary,
    borderWidth: 2,
  },
};

export default function AuctionRequestView() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { getRequest, editRequest } = useAuctionRequests();

  const [request, setRequest] = useState<AuctionRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState<AuctionRequestFormData>({
    status: "pending",
    matchedAuctionId: "",
    notes: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);
      const r = await getRequest(id);
      if (r) {
        setRequest(r);
        setForm({
          status: r.status,
          matchedAuctionId: r.matchedAuctionId ?? "",
          notes: r.notes,
        });
      }
      setLoading(false);
    })();
  }, [id, getRequest]);

  const field = (key: keyof AuctionRequestFormData, value: any) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: "" }));
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (
      form.status === "matched" &&
      !form.matchedAuctionId.trim()
    ) {
      e.matchedAuctionId =
        "Matched Auction ID is required when status is 'matched'";
    }
    return e;
  };

  const handleSave = async () => {
    const e = validate();
    if (Object.keys(e).length) {
      setErrors(e);
      return;
    }
    if (!id) return;
    setSaving(true);
    try {
      const updated = await editRequest(id, form);
      setRequest(updated);
    } catch {
      // toast shown in context
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

  if (!request) {
    return (
      <Box sx={{ p: 4, textAlign: "center" }}>
        <p style={{ color: colors.textSecondary }}>Request not found.</p>
        <Button
          onClick={() => navigate("/admin/auctionRequests")}
          variant="contained"
          sx={{ mt: 2, bgcolor: colors.primary }}
        >
          Back
        </Button>
      </Box>
    );
  }

  const sStyle = getStatusStyle(request.status);
  const uStyle = getUrgencyStyle(request.urgency);

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
        onClick={() => navigate("/admin/auctionRequests")}
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
        Back to Requests
      </Button>

      {/* Page title */}
      <Box sx={{ mb: 4 }}>
        <h1
          style={{
            margin: 0,
            fontSize: "1.75rem",
            fontWeight: 700,
            color: colors.textPrimary,
          }}
        >
          Auction Request Details
        </h1>
        <p
          style={{
            margin: "4px 0 0",
            color: colors.textSecondary,
            fontSize: "0.875rem",
          }}
        >
          Review the request details and update the status below.
        </p>
      </Box>

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
              width: { xs: 56, md: 68 },
              height: { xs: 56, md: 68 },
              borderRadius: 3,
              bgcolor: "rgba(255,255,255,0.2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "2px solid rgba(255,255,255,0.35)",
              flexShrink: 0,
            }}
          >
            <ClipboardList size={28} color="#fff" />
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
              <h2
                style={{
                  margin: 0,
                  color: "#fff",
                  fontSize: "1.3rem",
                  fontWeight: 700,
                }}
              >
                {request.productName}
              </h2>
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
            <Box sx={{ display: "flex", gap: 1, mt: 1, flexWrap: "wrap" }}>
              {[
                `Category: ${request.category}`,
                `Budget: ${request.budget} EGP`,
                `Urgency: ${REQUEST_URGENCY_LABELS[request.urgency]}`,
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
              label: "Budget",
              value: `${request.budget} EGP`,
              icon: <DollarSign size={16} />,
              color: colors.primary,
            },
            {
              label: "Urgency",
              value: REQUEST_URGENCY_LABELS[request.urgency],
              icon: <Zap size={16} />,
              color: uStyle.color,
            },
            {
              label: "Current Status",
              value: sStyle.label,
              icon: <Tag size={16} />,
              color: sStyle.color,
            },
            {
              label: "Submitted",
              value: request.createdAt.toLocaleDateString(),
              icon: <Calendar size={16} />,
              color: "#7C3AED",
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

      {/* ── Read-only Details ── */}
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
          <User size={18} style={{ color: colors.primary }} />
          <span style={{ fontWeight: 700, color: colors.textPrimary }}>
            Request Information
          </span>
        </Box>
        <Box
          sx={{
            p: { xs: 2, md: 3 },
            display: "grid",
            gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
            gap: 3,
          }}
        >
          {[
            { label: "User ID", value: request.userId },
            { label: "Product Name", value: request.productName },
            { label: "Category", value: request.category },
            { label: "Budget", value: `${request.budget} EGP` },
            {
              label: "Urgency",
              value: (
                <span
                  style={{
                    fontSize: "0.78rem",
                    background: uStyle.bg,
                    color: uStyle.color,
                    padding: "3px 10px",
                    borderRadius: 99,
                    fontWeight: 700,
                  }}
                >
                  {REQUEST_URGENCY_LABELS[request.urgency]}
                </span>
              ),
            },
            {
              label: "Submitted On",
              value: request.createdAt.toLocaleString(),
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

          {/* Notes read-only */}
          <Box sx={{ gridColumn: { sm: "1 / -1" } }}>
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
              User Notes
            </p>
            <Box sx={{ bgcolor: colors.muted, borderRadius: 2, p: 2 }}>
              <p
                style={{
                  margin: 0,
                  fontSize: "0.9rem",
                  color: colors.textSecondary,
                  lineHeight: 1.6,
                }}
              >
                {request.notes || "—"}
              </p>
            </Box>
          </Box>
        </Box>
      </Paper>

      {/* ── Admin Edit Card ── */}
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
          <ClipboardList size={18} style={{ color: colors.primary }} />
          <span style={{ fontWeight: 700, color: colors.textPrimary }}>
            Admin Actions
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
          {/* Status select */}
          <FormControl size="small" fullWidth>
            <InputLabel sx={{ "&.Mui-focused": { color: colors.primary } }}>
              Status *
            </InputLabel>
            <Select
              value={form.status}
              label="Status *"
              onChange={(e) => field("status", e.target.value)}
              sx={selectSx}
            >
              {REQUEST_STATUS_OPTIONS.map((s) => {
                const style = getStatusStyle(s);
                return (
                  <MenuItem key={s} value={s}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <span
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          background: style.color,
                          display: "inline-block",
                          flexShrink: 0,
                        }}
                      />
                      <span style={{ fontWeight: 600, fontSize: "0.875rem" }}>
                        {style.label}
                      </span>
                    </Box>
                  </MenuItem>
                );
              })}
            </Select>
          </FormControl>

          {/* Matched Auction ID */}
          <TextField
            label="Matched Auction ID"
            size="small"
            fullWidth
            placeholder="Paste the Firestore auction document ID…"
            value={form.matchedAuctionId}
            onChange={(e) => field("matchedAuctionId", e.target.value)}
            error={!!errors.matchedAuctionId}
            helperText={
              errors.matchedAuctionId ||
              "Required when setting status to 'Matched'"
            }
            InputProps={{
              startAdornment: (
                <Box sx={{ mr: 1, display: "flex", color: colors.textMuted }}>
                  <Link2 size={16} />
                </Box>
              ),
            }}
            sx={inputSx}
          />

          {/* Admin notes override */}
          <TextField
            label="Notes"
            size="small"
            fullWidth
            multiline
            rows={3}
            placeholder="Add admin notes or update user notes…"
            value={form.notes}
            onChange={(e) => field("notes", e.target.value)}
            sx={inputSx}
          />

          {/* Info banner */}
          <Box
            sx={{
              display: "flex",
              alignItems: "flex-start",
              gap: 1.5,
              bgcolor: colors.primaryBg,
              border: `1px solid ${colors.primaryRing}`,
              borderRadius: 2,
              p: 2,
            }}
          >
            <Info
              size={16}
              style={{ color: colors.primary, flexShrink: 0, marginTop: 2 }}
            />
            <p
              style={{
                fontSize: "0.85rem",
                color: colors.primaryDark,
                margin: 0,
              }}
            >
              <strong>Note:</strong> Only <strong>Status</strong>,{" "}
              <strong>Matched Auction ID</strong>, and <strong>Notes</strong>{" "}
              can be edited by admins. All other fields are set by the user.
            </p>
          </Box>
        </Box>
      </Paper>

      {/* Footer actions */}
      <Box
        sx={{
          mt: 3,
          display: "flex",
          gap: 2,
          justifyContent: { xs: "stretch", sm: "flex-end" },
          flexDirection: { xs: "column-reverse", sm: "row" },
        }}
      >
        <Button
          onClick={() => navigate("/admin/auctionRequests")}
          variant="outlined"
          sx={{
            textTransform: "none",
            borderColor: colors.border,
            color: colors.textSecondary,
            borderRadius: 2,
            px: 4,
            width: { xs: "100%", sm: "auto" },
            "&:hover": { borderColor: colors.primary, color: colors.primary },
          }}
        >
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          variant="contained"
          disabled={saving}
          startIcon={
            saving ? (
              <CircularProgress size={16} color="inherit" />
            ) : (
              <Save size={16} />
            )
          }
          sx={{
            textTransform: "none",
            bgcolor: colors.primary,
            "&:hover": { bgcolor: "#111", color: "#fff" },
            borderRadius: 2,
            px: 4,
            fontWeight: 600,
            width: { xs: "100%", sm: "auto" },
            boxShadow: "0 4px 14px rgba(37,99,235,0.30)",
          }}
        >
          {saving ? "Saving…" : "Save Changes"}
        </Button>
      </Box>
    </Box>
  );
}