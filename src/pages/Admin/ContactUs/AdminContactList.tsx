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
import {
  Search,
  X,
  Eye,
  RefreshCw,
  Mail,
  MailOpen,
  MessageSquareReply,
} from "lucide-react";
import ContactsIcon from "@mui/icons-material/Contacts";
import { useNavigate } from "react-router-dom";
import { useContactFeedback } from "@/store/AdminContext/ContactFeedbackContext/ContactFeedbackContext";
import {
  colors,
  getContactStatusStyle,
  SUBJECT_LABELS,
  type ContactStatus,
} from "./contact-feedback-data";

const STATUS_OPTIONS: { value: "" | ContactStatus; label: string }[] = [
  { value: "", label: "All Statuses" },
  { value: "new", label: "New" },
  { value: "seen", label: "Seen" },
  { value: "replied", label: "Replied" },
];

export default function AdminContactList() {
  const navigate = useNavigate();
  const {
    contacts,
    contactLoading,
    contactError,
    refreshContacts,
    changeContactStatus,
  } = useContactFeedback();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"" | ContactStatus>("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const filtered = contacts.filter((c) => {
    const s = search.toLowerCase();
    const matchesSearch =
      !s ||
      c.name.toLowerCase().includes(s) ||
      c.email.toLowerCase().includes(s) ||
      c.subject.toLowerCase().includes(s) ||
      c.message.toLowerCase().includes(s);
    const matchesStatus = !statusFilter || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const paginated = filtered.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage,
  );

  const newCount = contacts.filter((c) => c.status === "new").length;
  const seenCount = contacts.filter((c) => c.status === "seen").length;
  const repliedCount = contacts.filter((c) => c.status === "replied").length;

  if (contactLoading) {
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

  if (contactError) {
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
        <p style={{ color: colors.error }}>{contactError}</p>
        <Button
          onClick={refreshContacts}
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
            <ContactsIcon style={{ fontSize: 32 }} />
            Contact Messages
          </h1>
          <p
            style={{
              color: colors.textSecondary,
              margin: "4px 0 0",
              fontSize: "0.875rem",
            }}
          >
            Manage incoming contact messages from users
          </p>
        </div>
        <IconButton
          onClick={refreshContacts}
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
            label: "Replied",
            value: repliedCount,
            color: "#16A34A",
            bg: "#DCFCE7",
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
          placeholder="Search by name, email, subject…"
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
              setStatusFilter(e.target.value as "" | ContactStatus);
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
          <Table sx={{ minWidth: 650 }}>
            <TableHead>
              <TableRow sx={{ bgcolor: colors.primaryBg }}>
                {[
                  "Sender",
                  "Subject",
                  "Message Preview",
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
                  <TableCell colSpan={6} align="center" sx={{ py: 10 }}>
                    <Mail
                      size={44}
                      style={{
                        color: colors.textMuted,
                        margin: "0 auto 12px",
                        display: "block",
                      }}
                    />
                    <p style={{ color: colors.textSecondary, fontWeight: 600 }}>
                      No messages found
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                paginated.map((msg) => {
                  const sStyle = getContactStatusStyle(msg.status);
                  return (
                    <TableRow
                      key={msg.id}
                      sx={{
                        "&:hover": { bgcolor: colors.muted },
                        transition: "background 0.15s",
                        fontWeight: msg.status === "new" ? 700 : 400,
                      }}
                    >
                      {/* Sender */}
                      <TableCell sx={{ minWidth: 180 }}>
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 1.5,
                          }}
                        >
                          <Box
                            sx={{
                              width: 36,
                              height: 36,
                              borderRadius: "50%",
                              bgcolor:
                                msg.status === "new"
                                  ? "#FEF3C7"
                                  : colors.primaryBg,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              flexShrink: 0,
                              fontWeight: 700,
                              color:
                                msg.status === "new"
                                  ? "#D97706"
                                  : colors.primary,
                              fontSize: "0.85rem",
                            }}
                          >
                            {msg.name.charAt(0).toUpperCase()}
                          </Box>
                          <div>
                            <p
                              style={{
                                margin: 0,
                                fontWeight: msg.status === "new" ? 700 : 600,
                                fontSize: "0.875rem",
                                color: colors.textPrimary,
                              }}
                            >
                              {msg.name}
                            </p>
                            <p
                              style={{
                                margin: "2px 0 0",
                                fontSize: "0.72rem",
                                color: colors.textMuted,
                              }}
                            >
                              {msg.email}
                            </p>
                          </div>
                        </Box>
                      </TableCell>

                      {/* Subject */}
                      <TableCell sx={{ minWidth: 140 }}>
                        <span
                          style={{
                            fontSize: "0.78rem",
                            background: colors.primaryBg,
                            color: colors.primary,
                            padding: "3px 10px",
                            borderRadius: 99,
                            fontWeight: 600,
                          }}
                        >
                          {(SUBJECT_LABELS[msg.subject] ?? msg.subject) || "—"}
                        </span>
                      </TableCell>

                      {/* Message Preview */}
                      <TableCell sx={{ minWidth: 200, maxWidth: 260 }}>
                        <p
                          style={{
                            margin: 0,
                            fontSize: "0.82rem",
                            color: colors.textSecondary,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            maxWidth: 240,
                          }}
                        >
                          {msg.message}
                        </p>
                      </TableCell>

                      {/* Status */}
                      <TableCell sx={{ minWidth: 100 }}>
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
                        {msg.createdAt.toLocaleDateString()}
                      </TableCell>

                      {/* Actions */}
                      <TableCell align="center" sx={{ minWidth: 130 }}>
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
                            onClick={() =>
                              navigate(`/admin/contacts/${msg.id}`)
                            }
                            sx={{
                              color: colors.primary,
                              "&:hover": { bgcolor: colors.primaryBg },
                              borderRadius: 1.5,
                            }}
                            title="View"
                          >
                            <Eye size={16} />
                          </IconButton>
                          {msg.status === "new" && (
                            <IconButton
                              size="small"
                              onClick={() =>
                                changeContactStatus(msg.id, "seen")
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
                          {msg.status !== "replied" && (
                            <IconButton
                              size="small"
                              onClick={() =>
                                changeContactStatus(msg.id, "replied")
                              }
                              sx={{
                                color: "#16A34A",
                                "&:hover": { bgcolor: "#DCFCE7" },
                                borderRadius: 1.5,
                              }}
                              title="Mark as Replied"
                            >
                              <MessageSquareReply size={16} />
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
