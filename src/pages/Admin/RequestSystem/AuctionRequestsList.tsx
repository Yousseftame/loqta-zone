import { useEffect, useState } from "react";
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
  TablePagination,
  InputAdornment,
  Paper,
  Box,
  TableContainer,
  CircularProgress,
} from "@mui/material";
import {
  Search,
  X,
  Eye,
  RefreshCw,
  InboxIcon,
  ClipboardList,
  Clock,
  CheckCircle2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  type AuctionRequest,
  colors,
  getStatusStyle,
  getUrgencyStyle,
  REQUEST_URGENCY_LABELS,
} from "./auction-requests-data";
import { useAuctionRequests } from "@/store/AdminContext/AuctionRequestContext/AuctionRequestContext";

export default function AuctionRequestsList() {
  const navigate = useNavigate();
  const { requests, loading, error, refreshRequests } = useAuctionRequests();

  const [filtered, setFiltered] = useState<AuctionRequest[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  useEffect(() => {
    let f = requests;
    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      f = f.filter(
        (r) =>
          r.productName.toLowerCase().includes(s) ||
          r.category.toLowerCase().includes(s) ||
          r.userId.toLowerCase().includes(s) ||
          r.status.toLowerCase().includes(s),
      );
    }
    setFiltered(f);
    setPage(0);
  }, [searchTerm, requests]);

  const pendingCount = requests.filter((r) => r.status === "pending").length;
  const matchedCount = requests.filter((r) => r.status === "matched").length;
  const paginated = filtered.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage,
  );

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

  if (error) {
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
        <p style={{ color: colors.error }}>{error}</p>
        <Button
          onClick={refreshRequests}
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
            <ClipboardList
              size={28}
              style={{
                display: "inline",
                marginRight: 8,
                verticalAlign: "middle",
              }}
            />
            Auction Requests
          </h1>
          <p
            style={{
              color: colors.textSecondary,
              margin: "4px 0 0",
              fontSize: "0.875rem",
            }}
          >
            Review and manage user auction requests
          </p>
        </div>
        <IconButton
          onClick={refreshRequests}
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
          {
            label: "Total Requests",
            value: requests.length,
            icon: <ClipboardList size={22} />,
          },
          {
            label: "Pending",
            value: pendingCount,
            icon: <Clock size={22} />,
          },
          {
            label: "Matched",
            value: matchedCount,
            icon: <CheckCircle2 size={22} />,
          },
        ].map(({ label, value, icon }) => (
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
                {icon}
              </Box>
            </Box>
          </Paper>
        ))}
      </Box>

      {/* ── Search ── */}
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
        <TextField
          placeholder="Search by product, category, user ID or status…"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          variant="outlined"
          size="small"
          fullWidth
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
          sx={{
            "& .MuiOutlinedInput-root": {
              "& fieldset": { borderColor: colors.border },
              "&:hover fieldset": { borderColor: colors.primary },
              "&.Mui-focused fieldset": { borderColor: colors.primary },
            },
          }}
        />
        <p
          style={{
            margin: "8px 0 0",
            fontSize: "0.85rem",
            color: colors.textSecondary,
          }}
        >
          <strong style={{ color: colors.primary }}>{filtered.length}</strong>{" "}
          results
        </p>
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
        <Box sx={{ overflowX: "auto" }}>
          <Table sx={{ minWidth: 700 }}>
            <TableHead>
              <TableRow sx={{ bgcolor: colors.primaryBg }}>
                {[
                  "Product / Category",
                  "Budget",
                  "Urgency",
                  "Status",
                  "Matched Auction",
                  "Submitted",
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
                  <TableCell colSpan={7} align="center" sx={{ py: 10 }}>
                    <InboxIcon
                      size={44}
                      style={{
                        color: colors.textMuted,
                        margin: "0 auto 12px",
                        display: "block",
                      }}
                    />
                    <p style={{ color: colors.textSecondary, fontWeight: 600 }}>
                      No requests found
                    </p>
                    <p style={{ color: colors.textMuted, fontSize: "0.85rem" }}>
                      Try adjusting your search
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                paginated.map((req) => {
                  const sStyle = getStatusStyle(req.status);
                  const uStyle = getUrgencyStyle(req.urgency);
                  return (
                    <TableRow
                      key={req.id}
                      sx={{
                        "&:hover": { bgcolor: colors.muted },
                        transition: "background 0.15s",
                      }}
                    >
                      {/* Product / Category */}
                      <TableCell sx={{ minWidth: 200 }}>
                        <p
                          style={{
                            fontWeight: 600,
                            fontSize: "0.875rem",
                            color: colors.textPrimary,
                            margin: 0,
                          }}
                        >
                          {req.productName}
                        </p>
                        <p
                          style={{
                            color: colors.textMuted,
                            fontSize: "0.75rem",
                            margin: "2px 0 0",
                          }}
                        >
                          {req.category}
                        </p>
                      </TableCell>

                      {/* Budget */}
                      <TableCell sx={{ minWidth: 100, whiteSpace: "nowrap" }}>
                        <span
                          style={{
                            fontWeight: 700,
                            color: colors.textPrimary,
                            fontSize: "0.875rem",
                          }}
                        >
                          {req.budget} EGP
                        </span>
                      </TableCell>

                      {/* Urgency */}
                      <TableCell sx={{ minWidth: 90 }}>
                        <span
                          style={{
                            fontSize: "0.75rem",
                            background: uStyle.bg,
                            color: uStyle.color,
                            padding: "3px 10px",
                            borderRadius: 99,
                            fontWeight: 700,
                          }}
                        >
                          {REQUEST_URGENCY_LABELS[req.urgency]}
                        </span>
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

                      {/* Matched Auction */}
                      <TableCell sx={{ minWidth: 130 }}>
                        {req.matchedAuctionId ? (
                          <span
                            style={{
                              fontSize: "0.78rem",
                              background: colors.primaryBg,
                              color: colors.primary,
                              padding: "3px 10px",
                              borderRadius: 99,
                              fontWeight: 600,
                              fontFamily: "monospace",
                            }}
                          >
                            {req.matchedAuctionId.slice(0, 10)}…
                          </span>
                        ) : (
                          <span
                            style={{
                              fontSize: "0.78rem",
                              color: colors.textMuted,
                            }}
                          >
                            —
                          </span>
                        )}
                      </TableCell>

                      {/* Submitted */}
                      <TableCell sx={{ minWidth: 110, whiteSpace: "nowrap" }}>
                        <span
                          style={{
                            fontSize: "0.8rem",
                            color: colors.textSecondary,
                          }}
                        >
                          {req.createdAt.toLocaleDateString()}
                        </span>
                      </TableCell>

                      {/* Actions */}
                      <TableCell align="center" sx={{ minWidth: 80 }}>
                        <IconButton
                          size="small"
                          onClick={() =>
                            navigate(`/admin/auctionRequests/${req.id}`)
                          }
                          sx={{
                            color: colors.primary,
                            "&:hover": { bgcolor: colors.primaryBg },
                            borderRadius: 1.5,
                          }}
                          title="View / Edit"
                        >
                          <Eye size={16} />
                        </IconButton>
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
