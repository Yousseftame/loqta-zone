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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TablePagination,
  InputAdornment,
  Paper,
  Box,
  CircularProgress,
} from "@mui/material";
import {
  Plus,
  Search,
  Filter,
  X,
  AlertTriangle,
  Eye,
  Edit,
  Trash2,
  CheckCircle2,
  XCircle,
  Clock,
  Radio,
  DollarSign,
  RefreshCw,
  Gavel,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { colors } from "../Products/products-data";
import {
  type Auction,
  type AuctionStatus,
  AUCTION_STATUSES,
  getAuctionStatusStyle,
} from "./auctions-data";
import { useAuctions } from "@/store/AdminContext/AuctionContext/AuctionContext";
import { useProducts } from "@/store/AdminContext/ProductContext/ProductsCotnext";

const statusIcon = (s: AuctionStatus) =>
  s === "live" ? (
    <Radio size={12} />
  ) : s === "upcoming" ? (
    <Clock size={12} />
  ) : (
    <CheckCircle2 size={12} />
  );

export default function AuctionsList() {
  const navigate = useNavigate();
  const { auctions, loading, error, refreshAuctions, removeAuction } =
    useAuctions();
  const { products } = useProducts();

  const [filtered, setFiltered] = useState<Auction[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [auctionToDelete, setAuctionToDelete] = useState<Auction | null>(null);
  const [loadingDelete, setLoadingDelete] = useState(false);

  useEffect(() => {
    let f = auctions;
    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      f = f.filter((a) => {
        const product = products.find((p) => p.id === a.productId);
        return (
          a.productId.toLowerCase().includes(s) ||
          String(a.auctionNumber).includes(s) ||
          (product?.title.toLowerCase().includes(s) ?? false)
        );
      });
    }
    if (statusFilter !== "all") f = f.filter((a) => a.status === statusFilter);
    setFiltered(f);
    setPage(0);
  }, [searchTerm, statusFilter, auctions]);

  const handleDelete = async () => {
    if (!auctionToDelete) return;
    setLoadingDelete(true);
    try {
      await removeAuction(auctionToDelete.id);
      setDeleteDialog(false);
      setAuctionToDelete(null);
    } catch {
      // toast shown in context
    } finally {
      setLoadingDelete(false);
    }
  };

  // Stats
  const liveCount = auctions.filter((a) => a.status === "live").length;
  const upcomingCount = auctions.filter((a) => a.status === "upcoming").length;
  const endedCount = auctions.filter((a) => a.status === "ended").length;
  const activeCount = auctions.filter((a) => a.isActive).length;
  const inactiveCount = auctions.filter((a) => !a.isActive).length;

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
          onClick={refreshAuctions}
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
            }}
          >
            <Gavel
              size={28}
              style={{
                display: "inline",
                marginRight: 8,
                verticalAlign: "middle",
              }}
            />
            Auctions
          </h1>
          <p
            style={{
              color: colors.textSecondary,
              margin: "4px 0 0",
              fontSize: "0.875rem",
            }}
          >
            Manage your auction listings
          </p>
        </div>
        <Box sx={{ display: "flex", gap: 1 }}>
          <IconButton
            onClick={refreshAuctions}
            sx={{
              color: colors.primary,
              border: `1px solid ${colors.border}`,
              borderRadius: 2,
            }}
            title="Refresh"
          >
            <RefreshCw size={18} />
          </IconButton>
          <Button
            variant="contained"
            startIcon={<Plus size={18} />}
            onClick={() => navigate("/admin/auctions/add")}
            sx={{
              bgcolor: colors.primary,
              color: "white",
              textTransform: "none",
              px: 3,
              py: 1.5,
              borderRadius: 2,
              fontWeight: 600,
              boxShadow: "none",
              width: { xs: "100%", sm: "auto" },
              "&:hover": { bgcolor: "#111" },
            }}
          >
            Add New Auction
          </Button>
        </Box>
      </Box>

      {/* Stats — 2 rows × 3 cols */}
      <Box
        sx={{
          display: "grid",
          gap: 2,
          gridTemplateColumns: { xs: "1fr 1fr", sm: "repeat(3, 1fr)" },
          mb: 4,
        }}
      >
        {[
          {
            label: "Total Auctions",
            value: auctions.length,
            icon: <Gavel size={20} />,
          },
          { label: "Live Now", value: liveCount, icon: <Radio size={20} /> },
          {
            label: "Upcoming",
            value: upcomingCount,
            icon: <Clock size={20} />,
          },
          {
            label: "Ended",
            value: endedCount,
            icon: <CheckCircle2 size={20} />,
          },
          {
            label: "Active",
            value: activeCount,
            icon: <CheckCircle2 size={20} />,
          },
          {
            label: "Inactive",
            value: inactiveCount,
            icon: <XCircle size={20} />,
          },
        ].map(({ label, value, icon }) => (
          <Paper
            key={label}
            elevation={0}
            sx={{
              p: { xs: 2, md: 2.5 },
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
                    fontSize: "0.65rem",
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
                    fontSize: "1.75rem",
                    fontWeight: 700,
                    margin: "4px 0 0",
                  }}
                >
                  {value}
                </p>
              </div>
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: 10,
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

      {/* Filters */}
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
            flexDirection: { xs: "column", md: "row" },
            gap: 2,
          }}
        >
          <TextField
            placeholder="Search by product ID or auction number…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            variant="outlined"
            size="small"
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
              flex: 1,
              "& .MuiOutlinedInput-root": {
                "& fieldset": { borderColor: colors.border },
                "&:hover fieldset": { borderColor: colors.primary },
                "&.Mui-focused fieldset": { borderColor: colors.primary },
              },
            }}
          />
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Filter
              size={16}
              style={{ color: colors.textMuted, flexShrink: 0 }}
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{
                padding: "8px 14px",
                borderRadius: 8,
                border: `1px solid ${colors.border}`,
                fontSize: "0.85rem",
                color: colors.textPrimary,
                background: "#fff",
                outline: "none",
              }}
            >
              <option value="all">All Status</option>
              {AUCTION_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </option>
              ))}
            </select>
          </Box>
        </Box>
        <Box
          sx={{
            mt: 2,
            display: "flex",
            alignItems: "center",
            gap: 1.5,
            flexWrap: "wrap",
          }}
        >
          <span style={{ fontSize: "0.85rem", color: colors.textSecondary }}>
            <strong style={{ color: colors.primary }}>{filtered.length}</strong>{" "}
            results
          </span>
          {liveCount > 0 && (
            <span
              style={{
                background: "#DCFCE7",
                color: "#22C55E",
                padding: "2px 10px",
                borderRadius: 99,
                fontSize: "0.72rem",
                fontWeight: 700,
              }}
            >
              🔴 {liveCount} live
            </span>
          )}
          {(searchTerm || statusFilter !== "all") && (
            <Button
              size="small"
              onClick={() => {
                setSearchTerm("");
                setStatusFilter("all");
              }}
              sx={{
                textTransform: "none",
                color: colors.primary,
                p: "2px 8px",
                fontSize: "0.8rem",
              }}
            >
              Clear filters
            </Button>
          )}
        </Box>
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
                  "#",
                  "Product",
                  "Price",
                  "Bid Type",
                  "Entry",
                  "Start / End",
                  "Participants",
                  "Status",
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
                  <TableCell colSpan={9} align="center" sx={{ py: 10 }}>
                    <Gavel
                      size={44}
                      style={{
                        color: colors.textMuted,
                        margin: "0 auto 12px",
                        display: "block",
                      }}
                    />
                    <p style={{ color: colors.textSecondary, fontWeight: 600 }}>
                      No auctions found
                    </p>
                    <p style={{ color: colors.textMuted, fontSize: "0.85rem" }}>
                      Try adjusting your search or filters
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                paginated.map((auction) => {
                  const sStyle = getAuctionStatusStyle(auction.status);
                  return (
                    <TableRow
                      key={auction.id}
                      sx={{
                        "&:hover": { bgcolor: colors.muted },
                        transition: "background 0.15s",
                      }}
                    >
                      {/* # */}
                      <TableCell>
                        <span
                          style={{
                            fontWeight: 700,
                            color: colors.primary,
                            fontSize: "0.9rem",
                          }}
                        >
                          #{auction.auctionNumber}
                        </span>
                      </TableCell>

                      {/* Product */}
                      <TableCell sx={{ minWidth: 180 }}>
                        {(() => {
                          const product = products.find(
                            (p) => p.id === auction.productId,
                          );
                          return (
                            <Box
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 1,
                              }}
                            >
                              {product?.thumbnail &&
                              product.thumbnail !== "null" ? (
                                <Box
                                  component="img"
                                  src={product.thumbnail}
                                  alt={product.title}
                                  sx={{
                                    width: 32,
                                    height: 32,
                                    borderRadius: 1.5,
                                    objectFit: "cover",
                                    flexShrink: 0,
                                    border: `1px solid ${colors.border}`,
                                  }}
                                />
                              ) : (
                                <Box
                                  sx={{
                                    width: 32,
                                    height: 32,
                                    borderRadius: 1.5,
                                    bgcolor: colors.primaryBg,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    flexShrink: 0,
                                    fontSize: "0.75rem",
                                    fontWeight: 700,
                                    color: colors.primary,
                                  }}
                                >
                                  {product ? product.title.charAt(0) : "?"}
                                </Box>
                              )}
                              <span
                                style={{
                                  fontSize: "0.85rem",
                                  fontWeight: 600,
                                  color: colors.textPrimary,
                                  whiteSpace: "nowrap",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  maxWidth: 130,
                                }}
                              >
                                {product ? (
                                  product.title
                                ) : (
                                  <span
                                    style={{
                                      color: colors.textMuted,
                                      fontStyle: "italic",
                                    }}
                                  >
                                    Unknown
                                  </span>
                                )}
                              </span>
                            </Box>
                          );
                        })()}
                      </TableCell>

                      {/* Price */}
                      <TableCell sx={{ whiteSpace: "nowrap" }}>
                        <p
                          style={{
                            margin: 0,
                            fontSize: "0.75rem",
                            color: colors.textMuted,
                          }}
                        >
                          Start
                        </p>
                        <span
                          style={{
                            fontWeight: 700,
                            color: colors.textPrimary,
                            fontSize: "0.85rem",
                          }}
                        >
                          {auction.startingPrice.toFixed(2)} EGP
                        </span>
                        <p
                          style={{
                            margin: "2px 0 0",
                            fontSize: "0.75rem",
                            color: colors.textMuted,
                          }}
                        >
                          Current
                        </p>
                        <span
                          style={{
                            fontWeight: 700,
                            color:
                              auction.currentBid > auction.startingPrice
                                ? "#22C55E"
                                : colors.textPrimary,
                            fontSize: "0.85rem",
                          }}
                        >
                          {auction.currentBid.toFixed(2)} EGP
                        </span>
                      </TableCell>

                      {/* Bid Type */}
                      <TableCell>
                        <Chip
                          label={auction.bidType}
                          size="small"
                          sx={{
                            bgcolor:
                              auction.bidType === "fixed"
                                ? "#EFF6FF"
                                : "#F3E8FF",
                            color:
                              auction.bidType === "fixed"
                                ? "#3B82F6"
                                : "#7C3AED",
                            fontWeight: 700,
                            fontSize: "0.7rem",
                            textTransform: "capitalize",
                          }}
                        />
                      </TableCell>

                      {/* Entry */}
                      <TableCell>
                        {auction.entryType === "paid" ? (
                          <span
                            style={{
                              fontSize: "0.78rem",
                              fontWeight: 600,
                              color: colors.warning,
                            }}
                          >
                            {auction.entryFee} EGP
                          </span>
                        ) : (
                          <span
                            style={{
                              fontSize: "0.78rem",
                              fontWeight: 600,
                              color: colors.success,
                            }}
                          >
                            Free
                          </span>
                        )}
                      </TableCell>

                      {/* Start / End */}
                      <TableCell>
                        <p
                          style={{
                            margin: 0,
                            fontSize: "0.75rem",
                            color: colors.textPrimary,
                            fontWeight: 500,
                          }}
                        >
                          {auction.startTime.toLocaleDateString()}
                        </p>
                        <p
                          style={{
                            margin: "2px 0 0",
                            fontSize: "0.75rem",
                            color: colors.textMuted,
                          }}
                        >
                          → {auction.endTime.toLocaleDateString()}
                        </p>
                      </TableCell>

                      {/* Participants */}
                      <TableCell>
                        <span
                          style={{ fontWeight: 600, color: colors.textPrimary }}
                        >
                          {auction.totalParticipants}
                        </span>
                        <span
                          style={{
                            color: colors.textMuted,
                            fontSize: "0.75rem",
                          }}
                        >
                          {" "}
                          / {auction.totalBids} bids
                        </span>
                      </TableCell>

                      {/* Status + Active */}
                      <TableCell sx={{ whiteSpace: "nowrap" }}>
                        <Box
                          sx={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 0.5,
                          }}
                        >
                          <Chip
                            icon={statusIcon(auction.status)}
                            label={auction.status}
                            size="small"
                            sx={{
                              bgcolor: sStyle.bg,
                              color: sStyle.color,
                              fontWeight: 700,
                              fontSize: "0.68rem",
                              textTransform: "capitalize",
                              width: "fit-content",
                            }}
                          />
                          <Chip
                            label={auction.isActive ? "Active" : "Inactive"}
                            size="small"
                            sx={{
                              bgcolor: auction.isActive ? "#DCFCE7" : "#FEE2E2",
                              color: auction.isActive ? "#22C55E" : "#EF4444",
                              fontWeight: 700,
                              fontSize: "0.68rem",
                              width: "fit-content",
                            }}
                          />
                        </Box>
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
                          <IconButton
                            size="small"
                            onClick={() =>
                              navigate(`/admin/auctions/${auction.id}`)
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
                          <IconButton
                            size="small"
                            onClick={() =>
                              navigate(`/admin/auctions/${auction.id}/edit`)
                            }
                            sx={{
                              color: "#7C3AED",
                              "&:hover": { bgcolor: "#F3E8FF" },
                              borderRadius: 1.5,
                            }}
                            title="Edit"
                          >
                            <Edit size={16} />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={() => {
                              setAuctionToDelete(auction);
                              setDeleteDialog(true);
                            }}
                            sx={{
                              color: colors.error,
                              "&:hover": { bgcolor: colors.errorBg },
                              borderRadius: 1.5,
                            }}
                            title="Delete"
                          >
                            <Trash2 size={16} />
                          </IconButton>
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

      {/* Delete Dialog */}
      <Dialog
        open={deleteDialog}
        onClose={() => !loadingDelete && setDeleteDialog(false)}
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
          <AlertTriangle size={22} /> Confirm Deletion
        </DialogTitle>
        <DialogContent>
          <p style={{ color: colors.textPrimary, marginBottom: 16 }}>
            Are you sure you want to delete{" "}
            <strong>Auction #{auctionToDelete?.auctionNumber}</strong>? This
            action cannot be undone.
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
              <strong>Warning:</strong> This action cannot be undone.
            </p>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3, gap: 1 }}>
          <Button
            onClick={() => setDeleteDialog(false)}
            disabled={loadingDelete}
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
            disabled={loadingDelete}
            variant="contained"
            startIcon={
              loadingDelete ? (
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
              minWidth: 110,
            }}
          >
            {loadingDelete ? "Deleting…" : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
