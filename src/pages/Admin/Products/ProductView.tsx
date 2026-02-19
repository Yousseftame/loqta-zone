import { useEffect, useState, useMemo } from "react";
import {
  Button,
  Paper,
  Box,
  Chip,
  Avatar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
} from "@mui/material";
import {
  ArrowLeft,
  Edit,
  Trash2,
  Package,
  DollarSign,
  Layers,
  Calendar,
  AlertTriangle,
  Check,
  Gavel,
  Radio,
  Clock,
  CheckCircle2,
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { colors, getAvatarColor } from "./products-data";
import type { Product } from "./products-data";
import { useProducts } from "@/store/AdminContext/ProductContext/ProductsCotnext";
import { useAuctions } from "@/store/AdminContext/AuctionContext/AuctionContext";
import {
  getAuctionStatusStyle,
  type AuctionStatus,
} from "../Auctions/auctions-data";

const auctionStatusIcon = (s: AuctionStatus) =>
  s === "live" ? (
    <Radio size={12} />
  ) : s === "upcoming" ? (
    <Clock size={12} />
  ) : (
    <CheckCircle2 size={12} />
  );

export default function ProductView() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { getProduct, removeProduct } = useProducts();
  const { auctions } = useAuctions();

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [done, setDone] = useState(false);
  const [activeImg, setActiveImg] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);
      const p = await getProduct(id);
      setProduct(p);
      const thumb = p?.thumbnail && p.thumbnail !== "null" ? p.thumbnail : null;
      setActiveImg(thumb ?? p?.images?.[0] ?? null);
      setLoading(false);
    })();
  }, [id, getProduct]);

  const handleDelete = async () => {
    if (!product) return;
    setDeleting(true);
    try {
      await removeProduct(product);
      setDone(true);
      setTimeout(() => navigate("/admin/Products"), 700);
    } catch {
      setDeleting(false);
    }
  };

  // All auctions linked to this product — computed live, no Firestore field needed
  const linkedAuctions = useMemo(
    () =>
      auctions
        .filter((a) => a.productId === id)
        .sort((a, b) => a.auctionNumber - b.auctionNumber),
    [auctions, id],
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

  if (!product) {
    return (
      <Box sx={{ p: 4, textAlign: "center" }}>
        <p style={{ color: colors.textSecondary }}>Product not found.</p>
        <Button
          onClick={() => navigate("/admin/Products")}
          variant="contained"
          sx={{ mt: 2, bgcolor: colors.primary }}
        >
          Back
        </Button>
      </Box>
    );
  }

  const inventoryValue = (product.price * product.quantity).toFixed(2);

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
        onClick={() => navigate("/admin/Products")}
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
        Back to Products
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
          {activeImg ? (
            <Box
              component="img"
              src={activeImg}
              alt={product.title}
              onError={(e: any) => {
                e.currentTarget.style.display = "none";
              }}
              sx={{
                width: { xs: 60, md: 80 },
                height: { xs: 60, md: 80 },
                borderRadius: 3,
                objectFit: "cover",
                border: "2px solid rgba(255,255,255,0.4)",
                flexShrink: 0,
              }}
            />
          ) : (
            <Avatar
              sx={{
                bgcolor: "rgba(255,255,255,0.25)",
                width: { xs: 60, md: 72 },
                height: { xs: 60, md: 72 },
                fontSize: "2rem",
                fontWeight: 700,
                borderRadius: 3,
                border: "2px solid rgba(255,255,255,0.4)",
              }}
            >
              {product.title.charAt(0)}
            </Avatar>
          )}

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
                {product.title}
              </h1>
              <Chip
                label={product.isActive ? "Active" : "Inactive"}
                size="small"
                sx={{
                  bgcolor: "rgba(255,255,255,0.25)",
                  color: "#fff",
                  fontWeight: 700,
                  fontSize: "0.7rem",
                }}
              />
            </Box>
            <p
              style={{
                margin: 0,
                color: "rgba(255,255,255,0.75)",
                fontSize: "0.875rem",
              }}
            >
              {product.description}
            </p>
            <Box sx={{ display: "flex", gap: 1, mt: 1.5, flexWrap: "wrap" }}>
              {[
                `Brand: ${product.brand}`,
                `Model: ${product.model}`,
                `Category: ${product.category}`,
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

          <Box sx={{ display: "flex", gap: 1.5, flexShrink: 0 }}>
            <Button
              startIcon={<Edit size={16} />}
              onClick={() => navigate(`/admin/products/${product.id}/edit`)}
              variant="contained"
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
              Edit
            </Button>
            <Button
              startIcon={<Trash2 size={16} />}
              onClick={() => setDeleteDialog(true)}
              variant="contained"
              sx={{
                bgcolor: "rgba(239,68,68,0.75)",
                color: "#fff",
                textTransform: "none",
                borderRadius: 2,
                fontWeight: 600,
                "&:hover": { bgcolor: "rgba(239,68,68,0.9)" },
              }}
            >
              Delete
            </Button>
          </Box>
        </Box>

        {/* Stats row — now 4 cards including Total Auctions */}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr 1fr", sm: "repeat(4, 1fr)" },
            borderTop: `1px solid ${colors.border}`,
          }}
        >
          {[
            {
              label: "Price",
              value: `$${product.price.toFixed(2)}`,
              icon: <DollarSign size={16} />,
              color: colors.primary,
            },
            {
              label: "Quantity",
              value:
                product.quantity === 0
                  ? "Out of stock"
                  : `${product.quantity} units`,
              icon: <Layers size={16} />,
              color: product.quantity === 0 ? colors.error : colors.success,
            },
            {
              label: "Inventory Value",
              value: `$${inventoryValue}`,
              icon: <DollarSign size={16} />,
              color: "#7C3AED",
            },
            {
              label: "Total Auctions",
              value: product.totalAuctions,
              icon: <Gavel size={16} />,
              color: "#0EA5E9",
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

      {/* ── Images Gallery ── */}
      {product.images && product.images.length > 0 && (
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
            <Package size={18} style={{ color: colors.primary }} />
            <span style={{ fontWeight: 700, color: colors.textPrimary }}>
              Product Images
            </span>
          </Box>
          <Box sx={{ p: 3 }}>
            {activeImg && (
              <Box
                component="img"
                src={activeImg}
                alt="active"
                onError={(e: any) => {
                  e.currentTarget.style.display = "none";
                }}
                sx={{
                  width: "100%",
                  maxHeight: 320,
                  objectFit: "contain",
                  borderRadius: 2,
                  border: `1px solid ${colors.border}`,
                  mb: 2,
                  bgcolor: colors.muted,
                }}
              />
            )}
            <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap" }}>
              {product.images.map((url) => (
                <Box
                  key={url}
                  onClick={() => setActiveImg(url)}
                  sx={{
                    width: 64,
                    height: 64,
                    borderRadius: 2,
                    overflow: "hidden",
                    cursor: "pointer",
                    border: `2px solid ${activeImg === url ? colors.primary : colors.border}`,
                    transition: "border 0.15s",
                  }}
                >
                  <Box
                    component="img"
                    src={url}
                    alt="thumb"
                    onError={(e: any) => {
                      e.currentTarget.style.opacity = "0.3";
                    }}
                    sx={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                </Box>
              ))}
            </Box>
          </Box>
        </Paper>
      )}

      {/* ── Linked Auctions ── */}
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
            justifyContent: "space-between",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <Gavel size={18} style={{ color: colors.primary }} />
            <span style={{ fontWeight: 700, color: colors.textPrimary }}>
              Linked Auctions
              <span
                style={{
                  marginLeft: 8,
                  fontSize: "0.75rem",
                  background: colors.primaryBg,
                  color: colors.primary,
                  padding: "2px 8px",
                  borderRadius: 99,
                  fontWeight: 700,
                }}
              >
                {linkedAuctions.length}
              </span>
            </span>
          </Box>
          <Button
            size="small"
            onClick={() => navigate("/admin/auctions/add")}
            variant="outlined"
            sx={{
              textTransform: "none",
              borderColor: colors.border,
              color: colors.primary,
              borderRadius: 2,
              fontSize: "0.78rem",
              "&:hover": {
                borderColor: colors.primary,
                bgcolor: colors.primaryBg,
              },
            }}
          >
            + Add Auction
          </Button>
        </Box>

        {linkedAuctions.length === 0 ? (
          <Box sx={{ p: 4, textAlign: "center" }}>
            <Gavel
              size={36}
              style={{
                color: colors.textMuted,
                margin: "0 auto 10px",
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
              No auctions yet
            </p>
            <p
              style={{
                color: colors.textMuted,
                fontSize: "0.85rem",
                margin: "4px 0 0",
              }}
            >
              This product has no linked auctions.
            </p>
          </Box>
        ) : (
          <Box
            sx={{ p: 2, display: "flex", flexDirection: "column", gap: 1.5 }}
          >
            {linkedAuctions.map((auction) => {
              const sStyle = getAuctionStatusStyle(auction.status);
              return (
                <Box
                  key={auction.id}
                  onClick={() => navigate(`/admin/auctions/${auction.id}`)}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 2,
                    p: 2,
                    borderRadius: 2,
                    border: `1px solid ${colors.border}`,
                    cursor: "pointer",
                    transition: "all 0.15s",
                    "&:hover": {
                      bgcolor: colors.primaryBg,
                      borderColor: colors.primary,
                    },
                  }}
                >
                  {/* Auction number badge */}
                  <Box
                    sx={{
                      width: 40,
                      height: 40,
                      borderRadius: 2,
                      bgcolor: colors.primaryBg,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <span
                      style={{
                        fontWeight: 700,
                        color: colors.primary,
                        fontSize: "0.85rem",
                      }}
                    >
                      #{auction.auctionNumber}
                    </span>
                  </Box>

                  {/* Details */}
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1,
                        flexWrap: "wrap",
                      }}
                    >
                      <span
                        style={{
                          fontWeight: 600,
                          fontSize: "0.875rem",
                          color: colors.textPrimary,
                        }}
                      >
                        Auction #{auction.auctionNumber}
                      </span>
                      <Chip
                        icon={auctionStatusIcon(auction.status)}
                        label={auction.status}
                        size="small"
                        sx={{
                          bgcolor: sStyle.bg,
                          color: sStyle.color,
                          fontWeight: 700,
                          fontSize: "0.68rem",
                          textTransform: "capitalize",
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
                        }}
                      />
                    </Box>
                    <Box
                      sx={{
                        display: "flex",
                        gap: 2,
                        mt: 0.5,
                        flexWrap: "wrap",
                      }}
                    >
                      <span
                        style={{ fontSize: "0.75rem", color: colors.textMuted }}
                      >
                        Start: {auction.startTime.toLocaleDateString()}
                      </span>
                      <span
                        style={{ fontSize: "0.75rem", color: colors.textMuted }}
                      >
                        End: {auction.endTime.toLocaleDateString()}
                      </span>
                      <span
                        style={{ fontSize: "0.75rem", color: colors.textMuted }}
                      >
                        {auction.totalBids} bids · {auction.totalParticipants}{" "}
                        participants
                      </span>
                    </Box>
                  </Box>

                  {/* Price info */}
                  <Box sx={{ textAlign: "right", flexShrink: 0 }}>
                    <p
                      style={{
                        margin: 0,
                        fontWeight: 700,
                        color: colors.textPrimary,
                        fontSize: "0.9rem",
                      }}
                    >
                      ${auction.currentBid.toFixed(2)}
                    </p>
                    <p
                      style={{
                        margin: "2px 0 0",
                        fontSize: "0.72rem",
                        color: colors.textMuted,
                      }}
                    >
                      current bid
                    </p>
                  </Box>
                </Box>
              );
            })}
          </Box>
        )}
      </Paper>

      {/* ── Details Card ── */}
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
          <Package size={18} style={{ color: colors.primary }} />
          <span style={{ fontWeight: 700, color: colors.textPrimary }}>
            Product Details
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
            {
              label: "Active",
              value: (
                <Chip
                  label={product.isActive ? "Active" : "Inactive"}
                  size="small"
                  sx={{
                    bgcolor: product.isActive ? "#DCFCE7" : "#FEE2E2",
                    color: product.isActive ? "#22C55E" : "#EF4444",
                    fontWeight: 700,
                  }}
                />
              ),
            },
            {
              label: "Category",
              value: (
                <span
                  style={{
                    fontSize: "0.875rem",
                    color: colors.textPrimary,
                    fontWeight: 600,
                  }}
                >
                  {product.category}
                </span>
              ),
            },
            {
              label: "Date Added",
              value: (
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Calendar size={14} style={{ color: colors.textMuted }} />
                  <span
                    style={{
                      fontSize: "0.9rem",
                      color: colors.textPrimary,
                      fontWeight: 500,
                    }}
                  >
                    {product.createdAt.toLocaleDateString()}
                  </span>
                </Box>
              ),
            },
            {
              label: "Total Auctions",
              value: (
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Gavel size={14} style={{ color: colors.textMuted }} />
                  <span
                    style={{
                      fontSize: "0.9rem",
                      color: colors.textPrimary,
                      fontWeight: 700,
                    }}
                  >
                    {linkedAuctions.length}
                  </span>
                  {linkedAuctions.length > 0 && (
                    <span
                      style={{ fontSize: "0.75rem", color: colors.textMuted }}
                    >
                      (
                      {linkedAuctions.filter((a) => a.status === "live").length}{" "}
                      live,{" "}
                      {
                        linkedAuctions.filter((a) => a.status === "upcoming")
                          .length
                      }{" "}
                      upcoming)
                    </span>
                  )}
                </Box>
              ),
            },
          ].map(({ label, value }) => (
            <Box key={label}>
              <p
                style={{
                  margin: "0 0 8px",
                  fontSize: "0.75rem",
                  color: colors.textMuted,
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                }}
              >
                {label}
              </p>
              {value}
            </Box>
          ))}

          {/* Features */}
          {product.features && product.features.length > 0 && (
            <Box>
              <p
                style={{
                  margin: "0 0 8px",
                  fontSize: "0.75rem",
                  color: colors.textMuted,
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                }}
              >
                Features
              </p>
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                {product.features.map((f, i) => (
                  <span
                    key={i}
                    style={{
                      fontSize: "0.78rem",
                      background: colors.primaryBg,
                      color: colors.primary,
                      padding: "3px 10px",
                      borderRadius: 99,
                      fontWeight: 600,
                    }}
                  >
                    {f}
                  </span>
                ))}
              </Box>
            </Box>
          )}

          {/* Description */}
          <Box sx={{ gridColumn: { sm: "1 / -1" } }}>
            <p
              style={{
                margin: "0 0 8px",
                fontSize: "0.75rem",
                color: colors.textMuted,
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.04em",
              }}
            >
              Description
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
                {product.description}
              </p>
            </Box>
          </Box>
        </Box>
      </Paper>

      {/* ── Delete Dialog ── */}
      <Dialog
        open={deleteDialog}
        onClose={() => !deleting && setDeleteDialog(false)}
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
            Are you sure you want to delete <strong>{product.title}</strong>?
            This will also remove all product images.
          </p>
          {linkedAuctions.length > 0 && (
            <Box
              sx={{
                bgcolor: colors.warningBg,
                border: `1px solid ${colors.warning}`,
                borderRadius: 2,
                p: 2,
                mb: 2,
              }}
            >
              <p
                style={{
                  fontSize: "0.875rem",
                  color: colors.warning,
                  margin: 0,
                }}
              >
                <strong>Note:</strong> This product has {linkedAuctions.length}{" "}
                linked auction{linkedAuctions.length > 1 ? "s" : ""}. Those
                auctions will not be automatically deleted.
              </p>
            </Box>
          )}
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
            disabled={deleting}
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
            disabled={deleting || done}
            variant="contained"
            startIcon={
              deleting ? (
                <CircularProgress size={14} color="inherit" />
              ) : done ? (
                <Check size={16} />
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
            {done ? "Deleted!" : deleting ? "Deleting…" : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
