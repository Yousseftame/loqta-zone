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
  TableContainer,
  CircularProgress,
} from "@mui/material";
import {
  Plus,
  Search,
  X,
  AlertTriangle,
  Eye,
  Edit,
  Trash2,
  Tag,
  CheckCircle2,
  RefreshCw,
  Globe,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { colors } from "./Categories-data";
import type { Category } from "./Categories-data";
import { useCategories } from "@/store/AdminContext/CategoryContext/CategoryContext";

export default function CategoriesList() {
  const navigate = useNavigate();
  const { categories, loading, error, refreshCategories, removeCategory } =
    useCategories();

  const [filtered, setFiltered] = useState<Category[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(
    null,
  );
  const [loadingDelete, setLoadingDelete] = useState(false);

  useEffect(() => {
    let f = categories;
    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      f = f.filter(
        (c) =>
          c.name.en.toLowerCase().includes(s) ||
          c.name.ar.toLowerCase().includes(s) ||
          c.description.en.toLowerCase().includes(s),
      );
    }
    setFiltered(f);
    setPage(0);
  }, [searchTerm, categories]);

  const handleDelete = async () => {
    if (!categoryToDelete) return;
    setLoadingDelete(true);
    try {
      await removeCategory(categoryToDelete.id);
      setDeleteDialog(false);
      setCategoryToDelete(null);
    } catch {
      // toast shown in context
    } finally {
      setLoadingDelete(false);
    }
  };

  const activeCount = categories.filter((c) => c.isActive).length;
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
          onClick={refreshCategories}
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
            <Tag
              size={28}
              style={{
                display: "inline",
                marginRight: 8,
                verticalAlign: "middle",
              }}
            />
            Categories
          </h1>
          <p
            style={{
              color: colors.textSecondary,
              margin: "4px 0 0",
              fontSize: "0.875rem",
            }}
          >
            Manage product categories
          </p>
        </div>
        <Box sx={{ display: "flex", gap: 1 }}>
          <IconButton
            onClick={refreshCategories}
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
            onClick={() => navigate("/admin/categories/add")}
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
            Add New Category
          </Button>
        </Box>
      </Box>

      {/* ── Stat Cards ── */}
      <Box
        sx={{
          display: "grid",
          gap: 3,
          gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
          mb: 4,
        }}
      >
        {[
          {
            label: "Total Categories",
            value: categories.length,
            icon: <Tag size={22} />,
          },
          {
            label: "Active Categories",
            value: activeCount,
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
          placeholder="Search by name or description…"
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
          <Table sx={{ minWidth: 600 }}>
            <TableHead>
              <TableRow sx={{ bgcolor: colors.primaryBg }}>
                {[
                  "Name (EN)",
                  "Name (AR)",
                  "Description",
                  "Status",
                  "Created",
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
                    <Tag
                      size={44}
                      style={{
                        color: colors.textMuted,
                        margin: "0 auto 12px",
                        display: "block",
                      }}
                    />
                    <p style={{ color: colors.textSecondary, fontWeight: 600 }}>
                      No categories found
                    </p>
                    <p style={{ color: colors.textMuted, fontSize: "0.85rem" }}>
                      Try adjusting your search or add a new category
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                paginated.map((category) => (
                  <TableRow
                    key={category.id}
                    sx={{
                      "&:hover": { bgcolor: colors.muted },
                      transition: "background 0.15s",
                    }}
                  >
                    {/* Name EN */}
                    <TableCell sx={{ minWidth: 150 }}>
                      <Box
                        sx={{ display: "flex", alignItems: "center", gap: 1 }}
                      >
                        <Box
                          sx={{
                            width: 32,
                            height: 32,
                            borderRadius: 2,
                            bgcolor: colors.primaryBg,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                          }}
                        >
                          <Globe size={14} style={{ color: colors.primary }} />
                        </Box>
                        <span
                          style={{
                            fontWeight: 600,
                            fontSize: "0.875rem",
                            color: colors.textPrimary,
                          }}
                        >
                          {category.name.en}
                        </span>
                      </Box>
                    </TableCell>

                    {/* Name AR */}
                    <TableCell sx={{ minWidth: 130 }}>
                      <span
                        style={{
                          fontSize: "0.875rem",
                          color: colors.textPrimary,
                          fontFamily: "inherit",
                          direction: "rtl",
                          display: "block",
                        }}
                      >
                        {category.name.ar}
                      </span>
                    </TableCell>

                    {/* Description */}
                    <TableCell sx={{ minWidth: 200, maxWidth: 300 }}>
                      <p
                        style={{
                          margin: 0,
                          fontSize: "0.8rem",
                          color: colors.textSecondary,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {category.description.en}
                      </p>
                    </TableCell>

                    {/* Status */}
                    <TableCell sx={{ minWidth: 90 }}>
                      <Chip
                        label={category.isActive ? "Active" : "Inactive"}
                        size="small"
                        sx={{
                          bgcolor: category.isActive ? "#DCFCE7" : "#FEE2E2",
                          color: category.isActive ? "#22C55E" : "#EF4444",
                          fontWeight: 700,
                          fontSize: "0.7rem",
                        }}
                      />
                    </TableCell>

                    {/* Created */}
                    <TableCell sx={{ minWidth: 110, whiteSpace: "nowrap" }}>
                      <span
                        style={{
                          fontSize: "0.78rem",
                          color: colors.textMuted,
                        }}
                      >
                        {category.createdAt.toLocaleDateString()}
                      </span>
                    </TableCell>

                    {/* Actions */}
                    <TableCell align="center" sx={{ minWidth: 110 }}>
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
                            navigate(`/admin/categories/${category.id}`)
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
                            navigate(`/admin/categories/${category.id}/edit`)
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
                            setCategoryToDelete(category);
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
                ))
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
            <strong>{categoryToDelete?.name.en}</strong>?
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
              <strong>Warning:</strong> This action cannot be undone. Products
              using this category will not be automatically updated.
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
