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
  Package,
  DollarSign,
  Star,
  ShoppingBag,
  Check,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  STATIC_PRODUCTS,
 type Product,
 type ProductStatus,
 type ProductCategory,
  CATEGORIES,
  STATUSES,
  colors,
  getCategoryColor,
  getStatusStyle,
  getAvatarColor,
} from "./products-data";

export default function ProductsList() {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>(STATIC_PRODUCTS);
  const [filtered, setFiltered] = useState<Product[]>(STATIC_PRODUCTS);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [loadingDelete, setLoadingDelete] = useState(false);

  /* ── filter ─────────────────────────────────── */
  useEffect(() => {
    let f = products;
    if (searchTerm)
      f = f.filter(
        (p) =>
          p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.category.toLowerCase().includes(searchTerm.toLowerCase()),
      );
    if (categoryFilter !== "all")
      f = f.filter((p) => p.category === categoryFilter);
    if (statusFilter !== "all") f = f.filter((p) => p.status === statusFilter);
    setFiltered(f);
    setPage(0);
  }, [searchTerm, categoryFilter, statusFilter, products]);

  /* ── delete ──────────────────────────────────── */
  const handleDelete = async () => {
    if (!productToDelete) return;
    setLoadingDelete(true);
    await new Promise((r) => setTimeout(r, 600));
    setProducts((prev) => prev.filter((p) => p.id !== productToDelete.id));
    setDeleteDialog(false);
    setProductToDelete(null);
    setLoadingDelete(false);
  };

  /* ── stats ───────────────────────────────────── */
  const totalValue = products.reduce((s, p) => s + p.price * p.stock, 0);
  const avgRating = (
    products.reduce((s, p) => s + p.rating, 0) / products.length
  ).toFixed(1);
  const activeCount = products.filter((p) => p.status === "active").length;
  const outOfStock = products.filter((p) => p.stock === 0).length;

  const paginated = filtered.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage,
  );

  /* ── status icon ─────────────────────────────── */
  const statusIcon = (s: ProductStatus) =>
    s === "active" ? (
      <CheckCircle2 size={12} />
    ) : s === "inactive" ? (
      <XCircle size={12} />
    ) : (
      <Clock size={12} />
    );

  /* ─────────────────────────────────────────────── */
  return (
    <Box
      sx={{
        maxWidth: 1900,
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
            style={{ color: colors.primary, margin: 0 }}
            className="text-3xl font-bold flex items-center gap-2"
          >
            <ShoppingBag size={30} /> Products
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

            transition: "all 0.3s ease",

            "&:hover": {
              bgcolor: "#111",
              color: "#fff",
            },
          }}
        >
          Add New Product
        </Button>
      </Box>

      {/* ── Stats Cards — 1 col mobile, 2 col sm+ ── */}
      <Box
        sx={{
          display: "grid",
          gap: 3,
          gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
          mb: 4,
        }}
      >
        {/* Total Products — #2A4863 gradient */}
        <Paper
          elevation={0}
          sx={{
            p: { xs: 2, md: 3 },
            borderRadius: 3,
            background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.primaryLight} 100%)`,
            color: "#fff",
            boxShadow: "",
          }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p
                style={{
                  fontSize: "0.7rem",
                  fontWeight: 600,
                  opacity: 0.8,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                }}
              >
                Total Products
              </p>
              <p
                style={{ fontSize: "2rem", fontWeight: 700, margin: "4px 0 0" }}
              >
                {products.length}
              </p>
            </div>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: "rgba(255,255,255,0.2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Package size={22} />
            </div>
          </div>
        </Paper>

        {/* Active — green gradient */}
        <Paper
          elevation={0}
          sx={{
            p: { xs: 2, md: 3 },
            borderRadius: 3,
            background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.primaryLight} 100%)`,
            color: "#fff",
            boxShadow: "",
          }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p
                style={{
                  fontSize: "0.7rem",
                  fontWeight: 600,
                  opacity: 0.8,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                }}
              >
                Active
              </p>
              <p
                style={{ fontSize: "2rem", fontWeight: 700, margin: "4px 0 0" }}
              >
                {activeCount}
              </p>
            </div>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: "rgba(255,255,255,0.2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <CheckCircle2 size={22} />
            </div>
          </div>
        </Paper>

        {/* Avg Rating — amber gradient */}
        <Paper
          elevation={0}
          sx={{
            p: { xs: 2, md: 3 },
            borderRadius: 3,
            background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.primaryLight} 100%)`,
            color: "#fff",
            boxShadow: "",
          }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p
                style={{
                  fontSize: "0.7rem",
                  fontWeight: 600,
                  opacity: 0.8,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                }}
              >
                Avg Rating
              </p>
              <p
                style={{ fontSize: "2rem", fontWeight: 700, margin: "4px 0 0" }}
              >
                {avgRating}
              </p>
            </div>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: "rgba(255,255,255,0.2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Star size={22} />
            </div>
          </div>
        </Paper>

        {/* Inventory Value — sky gradient */}
        <Paper
          elevation={0}
          sx={{
            p: { xs: 2, md: 3 },
            borderRadius: 3,
            background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.primaryLight} 100%)`,
            color: "#fff",
            boxShadow: "",
          }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p
                style={{
                  fontSize: "0.7rem",
                  fontWeight: 600,
                  opacity: 0.8,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                }}
              >
                Inventory Value
              </p>
              <p
                style={{ fontSize: "2rem", fontWeight: 700, margin: "4px 0 0" }}
              >
                ${(totalValue / 1000).toFixed(0)}k
              </p>
            </div>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: "rgba(255,255,255,0.2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <DollarSign size={22} />
            </div>
          </div>
        </Paper>
      </Box>

      {/* ── Category pills ── */}
      <Box
        sx={{
          mb: 3,
          display: "flex",
          gap: 1,
          overflowX: "auto",
          pb: 0.5,
          "&::-webkit-scrollbar": { height: 4 },
          "&::-webkit-scrollbar-track": { bgcolor: "transparent" },
          "&::-webkit-scrollbar-thumb": {
            bgcolor: colors.border,
            borderRadius: 2,
          },
        }}
      >
        {["all", ...CATEGORIES].map((cat) => (
          <button
            key={cat}
            onClick={() => setCategoryFilter(cat)}
            style={{
              padding: "6px 14px",
              borderRadius: 99,
              fontSize: "0.78rem",
              fontWeight: 600,
              border: `1.5px solid ${categoryFilter === cat ? colors.primary : colors.border}`,
              background: categoryFilter === cat ? colors.primary : "#fff",
              color: categoryFilter === cat ? "#fff" : colors.textSecondary,
              cursor: "pointer",
              transition: "all 0.18s",
              flexShrink: 0,
            }}
          >
            {cat === "all" ? "All" : cat}
          </button>
        ))}
      </Box>

      {/* ── Filters ── */}
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
            placeholder="Search by name, SKU, or category…"
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
                flex: 1,
                width: "100%",
              }}
            >
              <option value="all">All Status</option>
              {STATUSES.map((s) => (
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
          {outOfStock > 0 && (
            <span
              style={{
                background: colors.errorBg,
                color: colors.error,
                padding: "2px 10px",
                borderRadius: 99,
                fontSize: "0.72rem",
                fontWeight: 700,
              }}
            >
              ⚠ {outOfStock} out of stock
            </span>
          )}
          {(searchTerm ||
            statusFilter !== "all" ||
            categoryFilter !== "all") && (
            <Button
              size="small"
              onClick={() => {
                setSearchTerm("");
                setStatusFilter("all");
                setCategoryFilter("all");
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
        {/* Scroll container — shows horizontal scrollbar on mobile */}
        <Box
          sx={{
            overflowX: "auto",
            WebkitOverflowScrolling: "touch",
            "&::-webkit-scrollbar": { height: 6 },
            "&::-webkit-scrollbar-track": { bgcolor: colors.muted },
            "&::-webkit-scrollbar-thumb": {
              bgcolor: colors.border,
              borderRadius: 3,
              "&:hover": { bgcolor: colors.textMuted },
            },
          }}
        >
          <Table sx={{ minWidth: 700 }}>
            <TableHead>
              <TableRow sx={{ bgcolor: colors.primaryBg }}>
                {[
                  "Product",
                  "SKU",
                  "Category",
                  "Price",
                  "Stock",
                  "Rating",
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
                  <TableCell colSpan={8} align="center" sx={{ py: 10 }}>
                    <Package
                      size={44}
                      style={{
                        color: colors.textMuted,
                        margin: "0 auto 12px",
                        display: "block",
                      }}
                    />
                    <p style={{ color: colors.textSecondary, fontWeight: 600 }}>
                      No products found
                    </p>
                    <p style={{ color: colors.textMuted, fontSize: "0.85rem" }}>
                      Try adjusting your search or filters
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                paginated.map((product) => {
                  const sStyle = getStatusStyle(product.status);
                  const catColor = getCategoryColor(
                    product.category as ProductCategory,
                  );
                  const isLow = product.stock > 0 && product.stock < 10;

                  return (
                    <TableRow
                      key={product.id}
                      sx={{
                        "&:hover": { bgcolor: colors.muted },
                        transition: "background 0.15s",
                      }}
                    >
                      {/* Product */}
                      <TableCell sx={{ minWidth: 220 }}>
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 1.5,
                          }}
                        >
                          <Avatar
                            sx={{
                              bgcolor: getAvatarColor(product.name),
                              width: 40,
                              height: 40,
                              fontSize: "0.95rem",
                              fontWeight: 700,
                              borderRadius: 2,
                              flexShrink: 0,
                            }}
                          >
                            {product.name.charAt(0)}
                          </Avatar>
                          <div>
                            <p
                              style={{
                                fontWeight: 600,
                                fontSize: "0.875rem",
                                color: colors.textPrimary,
                                margin: 0,
                                whiteSpace: "nowrap",
                              }}
                            >
                              {product.name}
                            </p>
                            <p
                              style={{
                                color: colors.textMuted,
                                fontSize: "0.75rem",
                                margin: "2px 0 0",
                                maxWidth: 200,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {product.description}
                            </p>
                          </div>
                        </Box>
                      </TableCell>

                      {/* SKU */}
                      <TableCell sx={{ minWidth: 140, whiteSpace: "nowrap" }}>
                        <span
                          style={{
                            fontFamily: "monospace",
                            fontSize: "0.78rem",
                            background: colors.muted,
                            padding: "3px 8px",
                            borderRadius: 6,
                            color: colors.textSecondary,
                          }}
                        >
                          {product.sku}
                        </span>
                      </TableCell>

                      {/* Category */}
                      <TableCell sx={{ minWidth: 120 }}>
                        <Chip
                          label={product.category}
                          size="small"
                          sx={{
                            bgcolor: catColor.bg,
                            color: catColor.text,
                            fontWeight: 600,
                            fontSize: "0.72rem",
                          }}
                        />
                      </TableCell>

                      {/* Price */}
                      <TableCell sx={{ minWidth: 90, whiteSpace: "nowrap" }}>
                        <span
                          style={{ fontWeight: 700, color: colors.textPrimary }}
                        >
                          ${product.price.toFixed(2)}
                        </span>
                      </TableCell>

                      {/* Stock */}
                      <TableCell sx={{ minWidth: 100 }}>
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 0.75,
                          }}
                        >
                          <span
                            style={{
                              fontWeight: 600,
                              fontSize: "0.875rem",
                              color:
                                product.stock === 0
                                  ? colors.error
                                  : isLow
                                    ? colors.warning
                                    : colors.textPrimary,
                            }}
                          >
                            {product.stock === 0 ? "—" : product.stock}
                          </span>
                          {product.stock === 0 && (
                            <span
                              style={{
                                fontSize: "0.65rem",
                                background: colors.errorBg,
                                color: colors.error,
                                padding: "1px 6px",
                                borderRadius: 99,
                                fontWeight: 700,
                              }}
                            >
                              OOS
                            </span>
                          )}
                          {isLow && (
                            <span
                              style={{
                                fontSize: "0.65rem",
                                background: colors.warningBg,
                                color: colors.warning,
                                padding: "1px 6px",
                                borderRadius: 99,
                                fontWeight: 700,
                              }}
                            >
                              Low
                            </span>
                          )}
                        </Box>
                      </TableCell>

                      {/* Rating */}
                      <TableCell sx={{ minWidth: 80, whiteSpace: "nowrap" }}>
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 0.5,
                          }}
                        >
                          <Star
                            size={13}
                            style={{ color: "#F59E0B" }}
                            fill="#F59E0B"
                          />
                          <span
                            style={{
                              fontWeight: 600,
                              fontSize: "0.875rem",
                              color: colors.textPrimary,
                            }}
                          >
                            {product.rating}
                          </span>
                        </Box>
                      </TableCell>

                      {/* Status */}
                      <TableCell sx={{ minWidth: 100 }}>
                        <Chip
                          icon={statusIcon(product.status)}
                          label={product.status}
                          size="small"
                          sx={{
                            bgcolor: sStyle.bg,
                            color: sStyle.color,
                            fontWeight: 700,
                            fontSize: "0.7rem",
                            textTransform: "capitalize",
                          }}
                        />
                      </TableCell>

                      {/* Actions — 3 inline icons */}
                      <TableCell align="center" sx={{ minWidth: 110 }}>
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 0.5,
                          }}
                        >
                          {/* View */}
                          <IconButton
                            size="small"
                            onClick={() =>
                              navigate(`/admin/products/${product.id}`)
                            }
                            sx={{
                              color: colors.primary,
                              "&:hover": { bgcolor: colors.primaryBg },
                              borderRadius: 1.5,
                            }}
                            title="View details"
                          >
                            <Eye size={16} />
                          </IconButton>
                          {/* Edit */}
                          <IconButton
                            size="small"
                            onClick={() =>
                              navigate(`/admin/products/${product.id}/edit`)
                            }
                            sx={{
                              color: "#7C3AED",
                              "&:hover": { bgcolor: "#F3E8FF" },
                              borderRadius: 1.5,
                            }}
                            title="Edit product"
                          >
                            <Edit size={16} />
                          </IconButton>
                          {/* Delete */}
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
                            }}
                            title="Delete product"
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

        <Box sx={{ overflowX: "auto" }}>
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
            sx={{
              "& .MuiTablePagination-toolbar": {
                flexWrap: "wrap",
                justifyContent: { xs: "center", sm: "flex-end" },
              },
            }}
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
            <strong>{productToDelete?.name}</strong>?
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
            startIcon={loadingDelete ? null : <Trash2 size={16} />}
            sx={{
              textTransform: "none",
              bgcolor: colors.error,
              "&:hover": { bgcolor: "#DC2626" },
              borderRadius: 2,
              minWidth: 110,
            }}
          >
            {loadingDelete ? <Check size={16} /> : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
