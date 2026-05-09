import { useState, useEffect } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/firebase/firebase";
import {
  Box,
  Paper,
  CircularProgress,
  Button,
  Chip,
  Divider,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
} from "@mui/material";
import {
  ArrowLeft,
  RefreshCw,
  Save,
  Ticket,
  User,
  Calendar,
  AlertCircle,
} from "lucide-react";
import { useParams, useNavigate } from "react-router-dom";
import { useTickets } from "@/store/AdminContext/TicketContext/TicketContext";
import {
  colors,
  TICKET_CATEGORY_LABELS,
  TICKET_STATUS_LABELS,
  TICKET_PRIORITY_LABELS,
  getTicketStatusStyle,
  getTicketPriorityStyle,
  type SupportTicket,
  type TicketStatus,
  type TicketPriority,
} from "./ticket-data";

export default function AdminTicketView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getTicket, changeTicketStatus, changeTicketPriority, saveAdminNote } =
    useTickets();

  const [ticket, setTicket]         = useState<SupportTicket | null>(null);
  const [loading, setLoading]       = useState(true);
  const [savingNote, setSavingNote] = useState(false);
  const [adminNote, setAdminNote]   = useState("");
  const [status, setStatus]         = useState<TicketStatus>("open");
  const [priority, setPriority]     = useState<TicketPriority>("medium");
  const [saving, setSaving]         = useState(false);
  const [productInfo, setProductInfo] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    async function load() {
      setLoading(true);
      const data = await getTicket(id!);
      if (!cancelled && data) {
        setTicket(data);
        setAdminNote(data.adminNote ?? "");
        setStatus(data.status);
        setPriority(data.priority);
      }
      if (!cancelled) setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, [id]);

  // ── Auto-fetch real-time auction status & product info ────────────────────────
  useEffect(() => {
    if (!ticket) return;
    if (!ticket.auctionId) return;

    let cancelled = false;
    (async () => {
      try {
        // 1. Get auction doc
        const auctSnap = await getDoc(doc(db, "auctions", ticket.auctionId));
        if (!auctSnap.exists() || cancelled) return;
        const data = auctSnap.data();

        // 2. Compute real-time status
        const computeAuctionStatus = (startTime: any, endTime: any) => {
          const now = new Date();
          const start = startTime?.toDate?.() || new Date(startTime);
          const end = endTime?.toDate?.() || new Date(endTime);
          if (now < start) return "upcoming";
          if (now >= start && now <= end) return "live";
          return "ended";
        };
        const realStatus = computeAuctionStatus(data.startTime, data.endTime);

        if (realStatus !== ticket.auctionStatus && !cancelled) {
          setTicket((prev) => (prev ? { ...prev, auctionStatus: realStatus } : prev));
        }

        // 3. Get product doc if needed
        if (!ticket.productName || !ticket.productId) {
          const productId = data.productId as string | undefined;
          if (!productId) return;

          const prodSnap = await getDoc(doc(db, "products", productId));
          if (!prodSnap.exists() || cancelled) return;
          const title = prodSnap.data().title;
          const name =
            title && typeof title === "object"
              ? (title["en"] || title["ar"] || Object.values(title)[0] || "")
              : String(title ?? "");

          if (!cancelled) setProductInfo({ id: productId, name: String(name) });
        }
      } catch { /* silent fail */ }
    })();
    return () => { cancelled = true; };
  }, [ticket?.id, ticket?.auctionId, ticket?.auctionStatus, ticket?.productId, ticket?.productName]);

  const handleSaveAll = async () => {
    if (!ticket) return;
    setSaving(true);
    try {
      if (status !== ticket.status)     await changeTicketStatus(ticket.id, status);
      if (priority !== ticket.priority) await changeTicketPriority(ticket.id, priority);
      if (adminNote !== ticket.adminNote) await saveAdminNote(ticket.id, adminNote);
      setTicket((prev) => prev ? { ...prev, status, priority, adminNote, updatedAt: new Date() } : prev);
    } finally { setSaving(false); }
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "60vh" }}>
        <CircularProgress sx={{ color: colors.primary }} />
      </Box>
    );
  }

  if (!ticket) {
    return (
      <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, minHeight: "60vh", justifyContent: "center" }}>
        <AlertCircle size={44} style={{ color: colors.textMuted }} />
        <p style={{ color: colors.textSecondary, fontWeight: 600 }}>Ticket not found</p>
        <Button onClick={() => navigate("/admin/tickets")} startIcon={<ArrowLeft size={16} />} variant="contained" sx={{ bgcolor: colors.primary, textTransform: "none" }}>
          Back to Tickets
        </Button>
      </Box>
    );
  }

  const statusStyle = getTicketStatusStyle(ticket.status);
  const prioStyle   = getTicketPriorityStyle(ticket.priority);

  return (
    <Box sx={{ mx: "auto", p: { xs: 2, md: 3 }, bgcolor: "#F8FAFC", minHeight: "100vh" }}>

      {/* ── Header ── */}
      <Box sx={{ mb: 4, display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
        <Button onClick={() => navigate("/admin/tickets")} startIcon={<ArrowLeft size={16} />} variant="outlined"
          sx={{ textTransform: "none", borderColor: colors.border, color: colors.textSecondary, borderRadius: 2, "&:hover": { borderColor: colors.primary, color: colors.primary } }}>
          Tickets
        </Button>
        <Box sx={{ flex: 1 }}>
          <h1 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 700, color: colors.primary, display: "flex", alignItems: "center", gap: 8 }}>
            <Ticket size={24} /> Ticket #{ticket.auctionNumber} — {ticket.subject}
          </h1>
          <p style={{ margin: "4px 0 0", fontSize: "0.8rem", color: colors.textMuted }}>
            Submitted {ticket.createdAt.toLocaleString()} · Last updated {ticket.updatedAt.toLocaleString()}
          </p>
        </Box>
        <Box sx={{ display: "flex", gap: 1 }}>
          <Chip label={statusStyle.label} size="small" sx={{ bgcolor: statusStyle.bg, color: statusStyle.color, fontWeight: 700 }} />
          <Chip label={prioStyle.label}   size="small" sx={{ bgcolor: prioStyle.bg,   color: prioStyle.color,   fontWeight: 700 }} />
        </Box>
      </Box>

      <Box sx={{ display: "grid", gap: 3, gridTemplateColumns: { xs: "1fr", lg: "1fr 380px" } }}>

        {/* ── LEFT: Ticket details ── */}
        <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>

          {/* User info */}
          <Paper elevation={0} sx={{ p: 3, borderRadius: 3, bgcolor: "#fff", border: `1px solid ${colors.border}` }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
              <User size={18} style={{ color: colors.primary }} />
              <h2 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color: colors.textPrimary }}>User Information</h2>
            </Box>
            <Divider sx={{ mb: 2 }} />
            <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" } }}>
              {[
                { label: "Name",   value: ticket.userName },
                { label: "Email",  value: ticket.userEmail },
                { label: "Phone",  value: ticket.userPhone  || "—" },
                { label: "User ID", value: ticket.userId },
              ].map(({ label, value }) => (
                <div key={label}>
                  <p style={{ margin: 0, fontSize: "0.72rem", fontWeight: 600, color: colors.textMuted, textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</p>
                  <p style={{ margin: "4px 0 0", fontSize: "0.9rem", color: colors.textPrimary, wordBreak: "break-all" }}>{value}</p>
                </div>
              ))}
            </Box>
          </Paper>

          {/* Auction info */}
          <Paper elevation={0} sx={{ p: 3, borderRadius: 3, bgcolor: "#fff", border: `1px solid ${colors.border}` }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
              <Calendar size={18} style={{ color: colors.primary }} />
              <h2 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color: colors.textPrimary }}>Auction Information</h2>
            </Box>
            <Divider sx={{ mb: 2 }} />
            <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" } }}>
              {[
                { label: "Auction ID",     value: ticket.auctionId },
                { label: "Auction #",      value: `#${ticket.auctionNumber}` },
                { label: "Auction Status", value: ticket.auctionStatus.charAt(0).toUpperCase() + ticket.auctionStatus.slice(1) },
                { label: "Category",       value: TICKET_CATEGORY_LABELS[ticket.category] },
                { label: "Product Name",   value: ticket.productName || productInfo?.name || "—" },
                { label: "Product ID",     value: ticket.productId  || productInfo?.id  || "—" },
              ].map(({ label, value }) => (
                <div key={label}>
                  <p style={{ margin: 0, fontSize: "0.72rem", fontWeight: 600, color: colors.textMuted, textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</p>
                  <p style={{ margin: "4px 0 0", fontSize: "0.9rem", color: colors.textPrimary, wordBreak: "break-all" }}>{value}</p>
                </div>
              ))}
            </Box>
          </Paper>

          {/* Issue description */}
          <Paper elevation={0} sx={{ p: 3, borderRadius: 3, bgcolor: "#fff", border: `1px solid ${colors.border}` }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
              <AlertCircle size={18} style={{ color: colors.primary }} />
              <h2 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color: colors.textPrimary }}>Issue Details</h2>
            </Box>
            <Divider sx={{ mb: 2 }} />
            <div>
              <p style={{ margin: 0, fontSize: "0.72rem", fontWeight: 600, color: colors.textMuted, textTransform: "uppercase", letterSpacing: "0.06em" }}>Subject</p>
              <p style={{ margin: "4px 0 16px", fontSize: "1rem", fontWeight: 600, color: colors.textPrimary }}>{ticket.subject}</p>
              <p style={{ margin: 0, fontSize: "0.72rem", fontWeight: 600, color: colors.textMuted, textTransform: "uppercase", letterSpacing: "0.06em" }}>Description</p>
              <Box sx={{ mt: 1, p: 2.5, bgcolor: "#F8FAFC", borderRadius: 2, border: `1px solid ${colors.border}` }}>
                <p style={{ margin: 0, fontSize: "0.9rem", color: colors.textPrimary, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{ticket.description}</p>
              </Box>
              {ticket.deviceInfo && (
                <>
                  <p style={{ margin: "16px 0 0", fontSize: "0.72rem", fontWeight: 600, color: colors.textMuted, textTransform: "uppercase", letterSpacing: "0.06em" }}>Device / Browser Info</p>
                  <p style={{ margin: "4px 0 0", fontSize: "0.8rem", color: colors.textSecondary, fontFamily: "monospace" }}>{ticket.deviceInfo}</p>
                </>
              )}
            </div>
          </Paper>
        </Box>

        {/* ── RIGHT: Admin panel ── */}
        <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
          <Paper elevation={0} sx={{ p: 3, borderRadius: 3, bgcolor: "#fff", border: `1px solid ${colors.border}` }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
              <RefreshCw size={18} style={{ color: colors.primary }} />
              <h2 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color: colors.textPrimary }}>Admin Controls</h2>
            </Box>
            <Divider sx={{ mb: 3 }} />

            {/* Status */}
            <FormControl fullWidth size="small" sx={{ mb: 2 }}>
              <InputLabel>Status</InputLabel>
              <Select value={status} label="Status" onChange={(e) => setStatus(e.target.value as TicketStatus)}>
                {(Object.keys(TICKET_STATUS_LABELS) as TicketStatus[]).map((s) => {
                  const st = getTicketStatusStyle(s);
                  return (
                    <MenuItem key={s} value={s}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: st.color }} />
                        {st.label}
                      </Box>
                    </MenuItem>
                  );
                })}
              </Select>
            </FormControl>

            {/* Priority */}
            <FormControl fullWidth size="small" sx={{ mb: 3 }}>
              <InputLabel>Priority</InputLabel>
              <Select value={priority} label="Priority" onChange={(e) => setPriority(e.target.value as TicketPriority)}>
                {(Object.keys(TICKET_PRIORITY_LABELS) as TicketPriority[]).map((p) => {
                  const ps = getTicketPriorityStyle(p);
                  return (
                    <MenuItem key={p} value={p}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: ps.color }} />
                        {ps.label}
                      </Box>
                    </MenuItem>
                  );
                })}
              </Select>
            </FormControl>

            {/* Admin note */}
            <TextField
              label="Admin Note / Response"
              placeholder="Add a note about this ticket or describe the resolution…"
              value={adminNote}
              onChange={(e) => setAdminNote(e.target.value)}
              multiline
              rows={5}
              fullWidth
              variant="outlined"
              size="small"
              sx={{ mb: 3, "& .MuiOutlinedInput-root": { "& fieldset": { borderColor: colors.border }, "&:hover fieldset": { borderColor: colors.primary }, "&.Mui-focused fieldset": { borderColor: colors.primary } } }}
            />

            <Button
              onClick={handleSaveAll}
              disabled={saving}
              fullWidth
              variant="contained"
              startIcon={saving ? <CircularProgress size={14} color="inherit" /> : <Save size={16} />}
              sx={{ textTransform: "none", bgcolor: colors.primary, "&:hover": { bgcolor: colors.primaryLight }, borderRadius: 2, py: 1.2, fontWeight: 600 }}
            >
              {saving ? "Saving…" : "Save Changes"}
            </Button>
          </Paper>
        </Box>
      </Box>
    </Box>
  );
}
