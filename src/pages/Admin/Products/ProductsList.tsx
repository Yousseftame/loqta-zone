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
  Avatar,
  Paper,
  Box,
  CircularProgress,
  Tooltip,
} from "@mui/material";
import {
  Plus,
  Search,
  X,
  AlertTriangle,
  Eye,
  Edit,
  Trash2,
  Package,
  ShoppingBag,
  RefreshCw,
  CheckCircle2,
  Gavel,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { type Product, colors, getAvatarColor } from "./products-data";
import { useProducts } from "@/store/AdminContext/ProductContext/ProductsCotnext";

export default function ProductsList() {
  const navigate = useNavigate();
  const { products, loading, error, refreshProducts, removeProduct } =
    useProducts();

  const [filtered, setFiltered] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [loadingDelete, setLoadingDelete] = useState(false);

  useEffect(() => {
    let f = products;
    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      f = f.filter(
        (p) =>
          p.title.toLowerCase().includes(s) ||
          p.brand.toLowerCase().includes(s) ||
          p.model.toLowerCase().includes(s) ||
          p.category.toLowerCase().includes(s),
      );
    }
    setFiltered(f);
    setPage(0);
  }, [searchTerm, products]);

  const handleDelete = async () => {
    if (!productToDelete) return;
    setLoadingDelete(true);
    try {
      await removeProduct(productToDelete);
      setDeleteDialog(false);
      setProductToDelete(null);
    } catch {
      // toast shown in context
    } finally {
      setLoadingDelete(false);
    }
  };

  const activeCount = products.filter((p) => p.isActive).length;
  const inactiveCount = products.length - activeCount;
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
          onClick={refreshProducts}
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
            <ShoppingBag
              size={28}
              style={{
                display: "inline",
                marginRight: 8,
                verticalAlign: "middle",
              }}
            />
            Products
          </h1>
          <p
            style={{
              color: colors.textSecondary,
              margin: "4px 0 0",
              fontSize: "0.875rem",
            }}
          >
            Manage your product catalogue
          </p>
        </div>
        <Box sx={{ display: "flex", gap: 1 }}>
          <IconButton
            onClick={refreshProducts}
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
            onClick={() => navigate("/admin/products/add")}
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
            Add New Product
          </Button>
        </Box>
      </Box>

      {/* ── Stat Cards ── */}
      <Box
        sx={{
          display: "grid",
          gap: 2.5,
          gridTemplateColumns: { xs: "1fr 1fr", sm: "repeat(3, 1fr)" },
          mb: 4,
        }}
      >
        {[
          {
            label: "Total Products",
            value: products.length,
            icon: <Package size={20} />,
          },
          {
            label: "Active Products",
            value: activeCount,
            icon: <CheckCircle2 size={20} />,
          },
          {
            label: "Inactive Products",
            value: inactiveCount,
            icon: <Package size={20} />,
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
                    fontSize: "1.9rem",
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

      {/* ── Search ── */}
      <Paper
        elevation={0}
        sx={{
          p: 2.5,
          mb: 3,
          borderRadius: 3,
          bgcolor: "#fff",
          border: `1px solid ${colors.border}`,
        }}
      >
        <TextField
          placeholder="Search by title, brand, model or category…"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          variant="outlined"
          size="small"
          fullWidth
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search size={15} style={{ color: colors.textMuted }} />
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
        <Box sx={{ mt: 1.5, display: "flex", alignItems: "center", gap: 1.5 }}>
          <span style={{ fontSize: "0.82rem", color: colors.textSecondary }}>
            <strong style={{ color: colors.primary }}>{filtered.length}</strong>{" "}
            result{filtered.length !== 1 ? "s" : ""}
          </span>
          {searchTerm && (
            <Button
              size="small"
              onClick={() => setSearchTerm("")}
              sx={{
                textTransform: "none",
                color: colors.primary,
                p: "1px 6px",
                fontSize: "0.78rem",
              }}
            >
              Clear
            </Button>
          )}
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
        <Box sx={{ overflowX: "auto" }}>
          <Table sx={{ minWidth: 600 }}>
            <TableHead>
              <TableRow sx={{ bgcolor: colors.primaryBg }}>
                {[
                  { label: "Product", align: "left" },
                  { label: "Category", align: "left" },
                  { label: "Price", align: "left" },
                  { label: "Stock", align: "left" },
                  { label: "Status", align: "left" },
                  { label: "Actions", align: "center" },
                ].map(({ label, align }) => (
                  <TableCell
                    key={label}
                    align={align as any}
                    sx={{
                      fontWeight: 700,
                      color: colors.primaryDark,
                      fontSize: "0.71rem",
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                      whiteSpace: "nowrap",
                      py: 1.5,
                      px: 2,
                      borderBottom: `2px solid ${colors.border}`,
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
                  <TableCell colSpan={7} align="center" sx={{ py: 10 }}>
                    <Package
                      size={44}
                      style={{
                        color: colors.textMuted,
                        margin: "0 auto 12px",
                        display: "block",
                      }}
                    />
                    <p
                      style={{
                        color: colors.textSecondary,
                        fontWeight: 600,
                        margin: 0,
                      }}
                    >
                      No products found
                    </p>
                    <p
                      style={{
                        color: colors.textMuted,
                        fontSize: "0.85rem",
                        margin: "4px 0 0",
                      }}
                    >
                      Try adjusting your search
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                paginated.map((product, idx) => (
                  <TableRow
                    key={product.id}
                    sx={{
                      "&:hover": { bgcolor: "#F8FAFF" },
                      "&:hover .row-actions": { opacity: 1 },
                      transition: "background 0.12s",
                      borderBottom:
                        idx < paginated.length - 1
                          ? `1px solid ${colors.border}`
                          : "none",
                    }}
                  >
                    {/* ── Product (thumbnail + title + description) ── */}
                    <TableCell sx={{ px: 2, py: 1.5, minWidth: 240 }}>
                      <Box
                        sx={{ display: "flex", alignItems: "center", gap: 1.5 }}
                      >
                        {product.thumbnail && product.thumbnail !== "null" ? (
                          <Box
                            component="img"
                            src={product.thumbnail}
                            alt={product.title}
                            onError={(e: any) => {
                              e.currentTarget.style.display = "none";
                            }}
                            sx={{
                              width: 44,
                              height: 44,
                              borderRadius: 2,
                              objectFit: "cover",
                              flexShrink: 0,
                              border: `1px solid ${colors.border}`,
                            }}
                          />
                        ) : (
                          <Avatar
                            sx={{
                              bgcolor: getAvatarColor(product.title),
                              width: 44,
                              height: 44,
                              fontSize: "1rem",
                              fontWeight: 700,
                              borderRadius: 2,
                              flexShrink: 0,
                            }}
                          >
                            {product.title.charAt(0).toUpperCase()}
                          </Avatar>
                        )}
                        <Box sx={{ minWidth: 0 }}>
                          <p
                            style={{
                              fontWeight: 700,
                              fontSize: "0.875rem",
                              color: colors.textPrimary,
                              margin: 0,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                              maxWidth: 180,
                            }}
                          >
                            {product.title}
                          </p>
                          <p
                            style={{
                              color: colors.textMuted,
                              fontSize: "0.72rem",
                              margin: "2px 0 0",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                              maxWidth: 180,
                            }}
                          >
                            {product.brand} · {product.model}
                          </p>
                        </Box>
                      </Box>
                    </TableCell>

                    {/* ── Category ── */}
                    <TableCell sx={{ px: 2, py: 1.5 }}>
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
                        {product.category}
                      </span>
                    </TableCell>

                    {/* ── Price ── */}
                    <TableCell sx={{ px: 2, py: 1.5, whiteSpace: "nowrap" }}>
                      <span
                        style={{
                          fontWeight: 700,
                          fontSize: "0.9rem",
                          color: colors.textPrimary,
                        }}
                      >
                        ${product.price.toFixed(2)}
                      </span>
                    </TableCell>

                    {/* ── Stock / Qty ── */}
                    <TableCell sx={{ px: 2, py: 1.5 }}>
                      {product.quantity === 0 ? (
                        <span
                          style={{
                            fontSize: "0.7rem",
                            background: colors.errorBg,
                            color: colors.error,
                            padding: "3px 9px",
                            borderRadius: 99,
                            fontWeight: 700,
                            whiteSpace: "nowrap",
                          }}
                        >
                          Out of Stock
                        </span>
                      ) : (
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "baseline",
                            gap: 0.5,
                          }}
                        >
                          <span
                            style={{
                              fontWeight: 700,
                              fontSize: "0.9rem",
                              color: colors.textPrimary,
                            }}
                          >
                            {product.quantity}
                          </span>
                          <span
                            style={{
                              fontSize: "0.7rem",
                              color: colors.textMuted,
                            }}
                          >
                            units
                          </span>
                        </Box>
                      )}
                    </TableCell>

                    {/* ── Status ── */}
                    <TableCell sx={{ px: 2, py: 1.5 }}>
                      <Chip
                        label={product.isActive ? "Active" : "Inactive"}
                        size="small"
                        sx={{
                          bgcolor: product.isActive ? "#DCFCE7" : "#FEE2E2",
                          color: product.isActive ? "#16A34A" : "#DC2626",
                          fontWeight: 700,
                          fontSize: "0.7rem",
                          height: 22,
                          border: `1px solid ${product.isActive ? "#BBF7D0" : "#FECACA"}`,
                        }}
                      />
                    </TableCell>

                  

                    {/* ── Actions ── */}
                    <TableCell align="center" sx={{ px: 2, py: 1.5 }}>
                      <Box
                        className="row-actions"
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 0.5,
                        }}
                      >
                        <Tooltip title="View" arrow>
                          <IconButton
                            size="small"
                            onClick={() =>
                              navigate(`/admin/products/${product.id}`)
                            }
                            sx={{
                              color: colors.primary,
                              "&:hover": { bgcolor: colors.primaryBg },
                              borderRadius: 1.5,
                              p: 0.7,
                            }}
                          >
                            <Eye size={15} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Edit" arrow>
                          <IconButton
                            size="small"
                            onClick={() =>
                              navigate(`/admin/products/${product.id}/edit`)
                            }
                            sx={{
                              color: "#7C3AED",
                              "&:hover": { bgcolor: "#F3E8FF" },
                              borderRadius: 1.5,
                              p: 0.7,
                            }}
                          >
                            <Edit size={15} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete" arrow>
                          <IconButton
                            size="small"
                            onClick={() => {
                              setProductToDelete(product);
                              setDeleteDialog(true);
                            }}
                            sx={{
                              color: colors.error,
                              "&:hover": { bgcolor: colors.errorBg },
                              borderRadius: 1.5,
                              p: 0.7,
                            }}
                          >
                            <Trash2 size={15} />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Box>

        <Box sx={{ borderTop: `1px solid ${colors.border}` }}>
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
            sx={{ "& .MuiTablePagination-toolbar": { px: 2 } }}
          />
        </Box>
      </Paper>

      {/* ── Delete Dialog ── */}
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
            <strong>{productToDelete?.title}</strong>? This will also remove all
            product images.
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
