import { useEffect, useState, useMemo } from "react";
import {
  TextField,
  Button,
  Paper,
  Box,
  Switch,
  FormControlLabel,
  CircularProgress,
  MenuItem,
  Select,
  InputLabel,
  FormControl,
  FormHelperText,
} from "@mui/material";
import { ArrowLeft, Save, Gavel, Info } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { colors } from "../Products/products-data";
import {
  DEFAULT_AUCTION_FORM,
  computeAuctionStatus,
  type AuctionFormData,
  type BidType,
  type EntryType,
} from "./auctions-data";
import { useAuctions } from "@/store/AdminContext/AuctionContext/AuctionContext";
import { useProducts } from "@/store/AdminContext/ProductContext/ProductsCotnext";

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

// Format Date → datetime-local string (YYYY-MM-DDTHH:mm)
function toDatetimeLocal(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// Get current datetime rounded to the next minute (for min attribute)
function nowDatetimeLocal() {
  const d = new Date();
  d.setSeconds(0, 0);
  return toDatetimeLocal(d);
}

export default function AuctionForm() {
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();
  const isEdit = Boolean(id);
  const { getAuction, addAuction, editAuction, auctions } = useAuctions();
  const { products } = useProducts();

  const [form, setForm] = useState<AuctionFormData>(DEFAULT_AUCTION_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [loadingAuction, setLoadingAuction] = useState(isEdit);

  // Pre-fill on edit
  useEffect(() => {
    if (!isEdit || !id) return;
    (async () => {
      setLoadingAuction(true);
      const a = await getAuction(id);
      if (a) {
        setForm({
          productId: a.productId,
          auctionNumber: String(a.auctionNumber),
          startingPrice: String(a.startingPrice),
          minimumIncrement: String(a.minimumIncrement),
          bidType: a.bidType,
          fixedBidValue: a.fixedBidValue != null ? String(a.fixedBidValue) : "",
          startTime: toDatetimeLocal(a.startTime),
          endTime: toDatetimeLocal(a.endTime),
          entryType: a.entryType,
          entryFee: String(a.entryFee),
          isActive: a.isActive,
          lastOfferEnabled: a.lastOfferEnabled,
        });
      }
      setLoadingAuction(false);
    })();
  }, [id, isEdit, getAuction]);

  const field = (key: keyof AuctionFormData, value: any) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: "" }));
  };

  // Get auction numbers already used for the selected product (excluding current auction if editing)
  const usedAuctionNumbers = useMemo(() => {
    if (!form.productId) return new Set<number>();
    return new Set(
      auctions
        .filter((a) => a.productId === form.productId && a.id !== id)
        .map((a) => a.auctionNumber),
    );
  }, [auctions, form.productId, id]);

  // Auto-computed status preview
  const previewStatus = useMemo(() => {
    if (!form.startTime || !form.endTime) return null;
    return computeAuctionStatus(
      new Date(form.startTime),
      new Date(form.endTime),
    );
  }, [form.startTime, form.endTime]);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.productId) e.productId = "Please select a product";
    if (!form.auctionNumber || isNaN(Number(form.auctionNumber)))
      e.auctionNumber = "Enter a valid auction number";
    else if (usedAuctionNumbers.has(Number(form.auctionNumber)))
      e.auctionNumber = `Auction #${form.auctionNumber} already exists for this product`;
    if (
      !form.startingPrice ||
      isNaN(Number(form.startingPrice)) ||
      Number(form.startingPrice) < 0
    )
      e.startingPrice = "Enter a valid starting price";
    if (
      !form.minimumIncrement ||
      isNaN(Number(form.minimumIncrement)) ||
      Number(form.minimumIncrement) < 0
    )
      e.minimumIncrement = "Enter a valid increment";
    if (form.bidType === "fixed") {
      if (
        !form.fixedBidValue ||
        isNaN(Number(form.fixedBidValue)) ||
        Number(form.fixedBidValue) <= 0
      )
        e.fixedBidValue = "Enter a valid fixed bid amount";
    }
    if (!form.startTime) e.startTime = "Start time is required";
    else if (new Date(form.startTime) < new Date())
      e.startTime = "Start time cannot be in the past";
    if (!form.endTime) e.endTime = "End time is required";
    else if (
      form.startTime &&
      new Date(form.endTime) <= new Date(form.startTime)
    )
      e.endTime = "End time must be after start time";
    if (
      form.entryType === "paid" &&
      (!form.entryFee ||
        isNaN(Number(form.entryFee)) ||
        Number(form.entryFee) <= 0)
    )
      e.entryFee = "Enter a valid entry fee";
    return e;
  };

  const handleSave = async () => {
    const e = validate();
    if (Object.keys(e).length) {
      setErrors(e);
      return;
    }
    setSaving(true);
    try {
      if (isEdit && id) {
        await editAuction(id, form);
      } else {
        await addAuction(form);
      }
      navigate("/admin/auctions");
    } catch {
      // toast shown in context
    } finally {
      setSaving(false);
    }
  };

  if (loadingAuction) {
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

  const minDateTime = nowDatetimeLocal();

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
        onClick={() => navigate("/admin/auctions")}
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
        Back to Auctions
      </Button>

      {/* Title */}
      <Box sx={{ mb: 4 }}>
        <h1
          style={{
            margin: 0,
            fontSize: "1.75rem",
            fontWeight: 700,
            color: colors.textPrimary,
          }}
        >
          {isEdit ? "Edit Auction" : "Add New Auction"}
        </h1>
        <p
          style={{
            margin: "4px 0 0",
            color: colors.textSecondary,
            fontSize: "0.875rem",
          }}
        >
          {isEdit
            ? "Update the auction details below."
            : "Fill in the details to create a new auction."}
        </p>
      </Box>

      <Paper
        elevation={0}
        sx={{
          borderRadius: 3,
          border: `1px solid ${colors.border}`,
          overflow: "hidden",
          mb: 3,
        }}
      >
        {/* Card header */}
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
          <Gavel size={20} style={{ color: colors.primary }} />
          <span
            style={{
              fontWeight: 700,
              fontSize: "1rem",
              color: colors.textPrimary,
            }}
          >
            Auction Information
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
          {/* Row 1 — Product Select + Auction Number */}
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
              gap: 2.5,
            }}
          >
            {/* Product dropdown */}
            <FormControl size="small" fullWidth error={!!errors.productId}>
              <InputLabel sx={{ "&.Mui-focused": { color: colors.primary } }}>
                Product *
              </InputLabel>
              <Select
                value={form.productId}
                label="Product *"
                onChange={(e) => {
                  // Reset auction number when product changes
                  setForm((f) => ({
                    ...f,
                    productId: e.target.value,
                    auctionNumber: "",
                  }));
                  setErrors((er) => ({
                    ...er,
                    productId: "",
                    auctionNumber: "",
                  }));
                }}
                sx={selectSx}
              >
                {products.length === 0 && (
                  <MenuItem disabled value="">
                    No products available
                  </MenuItem>
                )}
                {products.map((p) => (
                  <MenuItem key={p.id} value={p.id}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      {p.thumbnail && p.thumbnail !== "null" ? (
                        <Box
                          component="img"
                          src={p.thumbnail}
                          alt={p.title}
                          sx={{
                            width: 24,
                            height: 24,
                            borderRadius: 1,
                            objectFit: "cover",
                            flexShrink: 0,
                          }}
                        />
                      ) : (
                        <Box
                          sx={{
                            width: 24,
                            height: 24,
                            borderRadius: 1,
                            bgcolor: colors.primaryBg,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "0.7rem",
                            fontWeight: 700,
                            color: colors.primary,
                            flexShrink: 0,
                          }}
                        >
                          {p.title.charAt(0)}
                        </Box>
                      )}
                      <span style={{ fontSize: "0.875rem" }}>{p.title}</span>
                    </Box>
                  </MenuItem>
                ))}
              </Select>
              {errors.productId && (
                <FormHelperText>{errors.productId}</FormHelperText>
              )}
            </FormControl>

            {/* Auction Number */}
            <TextField
              label="Auction Number *"
              size="small"
              type="number"
              fullWidth
              value={form.auctionNumber}
              onChange={(e) => field("auctionNumber", e.target.value)}
              error={!!errors.auctionNumber}
              helperText={
                errors.auctionNumber ||
                (form.productId && usedAuctionNumbers.size > 0
                  ? `Used numbers for this product: ${[...usedAuctionNumbers].sort((a, b) => a - b).join(", ")}`
                  : "")
              }
              sx={inputSx}
              disabled={!form.productId}
              placeholder={
                form.productId
                  ? "Enter unique number"
                  : "Select a product first"
              }
            />
          </Box>

          {/* Row 2 — Starting Price + Min Increment */}
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
              gap: 2.5,
            }}
          >
            <TextField
              label="Starting Price *"
              size="small"
              type="number"
              fullWidth
              value={form.startingPrice}
              onChange={(e) => field("startingPrice", e.target.value)}
              error={!!errors.startingPrice}
              helperText={errors.startingPrice}
              sx={inputSx}
            />
            <TextField
              label="Minimum Increment *"
              size="small"
              type="number"
              fullWidth
              value={form.minimumIncrement}
              onChange={(e) => field("minimumIncrement", e.target.value)}
              error={!!errors.minimumIncrement}
              helperText={errors.minimumIncrement}
              sx={inputSx}
            />
          </Box>

          {/* Row 3 — Start Time + End Time */}
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
              gap: 2.5,
            }}
          >
            <TextField
              label="Start Time *"
              size="small"
              type="datetime-local"
              fullWidth
              value={form.startTime}
              onChange={(e) => {
                field("startTime", e.target.value);
                // Clear end time if it's now before start time
                if (
                  form.endTime &&
                  new Date(form.endTime) <= new Date(e.target.value)
                ) {
                  setForm((f) => ({
                    ...f,
                    startTime: e.target.value,
                    endTime: "",
                  }));
                }
              }}
              error={!!errors.startTime}
              helperText={errors.startTime}
              sx={inputSx}
              InputLabelProps={{ shrink: true }}
              inputProps={{ min: minDateTime }}
            />
            <TextField
              label="End Time *"
              size="small"
              type="datetime-local"
              fullWidth
              value={form.endTime}
              onChange={(e) => field("endTime", e.target.value)}
              error={!!errors.endTime}
              helperText={errors.endTime}
              sx={inputSx}
              InputLabelProps={{ shrink: true }}
              // End time must be at least 1 minute after start time
              inputProps={{
                min: form.startTime
                  ? (() => {
                      const d = new Date(form.startTime);
                      d.setMinutes(d.getMinutes() + 1);
                      return toDatetimeLocal(d);
                    })()
                  : minDateTime,
              }}
              disabled={!form.startTime}
            />
          </Box>

          {/* Status preview banner */}
          {previewStatus && (
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1.5,
                p: 1.5,
                borderRadius: 2,
                bgcolor:
                  previewStatus === "live"
                    ? "#DCFCE7"
                    : previewStatus === "upcoming"
                      ? "#EFF6FF"
                      : "#F1F5F9",
                border: `1px solid ${previewStatus === "live" ? "#22C55E" : previewStatus === "upcoming" ? "#3B82F6" : "#94A3B8"}`,
              }}
            >
              <span
                style={{
                  fontSize: "0.78rem",
                  fontWeight: 700,
                  color:
                    previewStatus === "live"
                      ? "#22C55E"
                      : previewStatus === "upcoming"
                        ? "#3B82F6"
                        : "#64748B",
                }}
              >
                Auto Status:{" "}
                {previewStatus.charAt(0).toUpperCase() + previewStatus.slice(1)}
              </span>
              <span
                style={{ fontSize: "0.75rem", color: colors.textSecondary }}
              >
                — calculated automatically from the selected times
              </span>
            </Box>
          )}

          {/* Row 4 — Bid Type + Entry Type */}
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
              gap: 2.5,
            }}
          >
            {/* Bid Type pills */}
            <Box>
              <p
                style={{
                  fontSize: "0.75rem",
                  color: colors.textSecondary,
                  fontWeight: 600,
                  marginBottom: 6,
                }}
              >
                Bid Type *
              </p>
              <Box sx={{ display: "flex", gap: 1 }}>
                {(["fixed", "free"] as BidType[]).map((t) => {
                  const active = form.bidType === t;
                  return (
                    <button
                      key={t}
                      onClick={() => field("bidType", t)}
                      style={{
                        padding: "5px 20px",
                        borderRadius: 99,
                        fontSize: "0.78rem",
                        fontWeight: 600,
                        cursor: "pointer",
                        transition: "all 0.15s",
                        border: `1.5px solid ${active ? colors.primary : colors.border}`,
                        background: active ? colors.primaryBg : "#fff",
                        color: active ? colors.primary : colors.textSecondary,
                      }}
                    >
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </button>
                  );
                })}
              </Box>
            </Box>

            {/* Entry Type pills */}
            <Box>
              <p
                style={{
                  fontSize: "0.75rem",
                  color: colors.textSecondary,
                  fontWeight: 600,
                  marginBottom: 6,
                }}
              >
                Entry Type *
              </p>
              <Box sx={{ display: "flex", gap: 1 }}>
                {(["free", "paid"] as EntryType[]).map((t) => {
                  const active = form.entryType === t;
                  return (
                    <button
                      key={t}
                      onClick={() => field("entryType", t)}
                      style={{
                        padding: "5px 20px",
                        borderRadius: 99,
                        fontSize: "0.78rem",
                        fontWeight: 600,
                        cursor: "pointer",
                        transition: "all 0.15s",
                        border: `1.5px solid ${active ? colors.primary : colors.border}`,
                        background: active ? colors.primaryBg : "#fff",
                        color: active ? colors.primary : colors.textSecondary,
                      }}
                    >
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </button>
                  );
                })}
              </Box>
            </Box>
          </Box>

          {/* Fixed Bid Value (only when bidType === "fixed") */}
          {form.bidType === "fixed" && (
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", sm: "1fr 2fr" },
                gap: 2.5,
              }}
            >
              <TextField
                label="Fixed Bid Amount *"
                size="small"
                type="number"
                fullWidth
                value={form.fixedBidValue}
                onChange={(e) => field("fixedBidValue", e.target.value)}
                error={!!errors.fixedBidValue}
                helperText={
                  errors.fixedBidValue || "Each bid will be exactly this amount"
                }
                sx={inputSx}
              />
            </Box>
          )}

          {/* Entry Fee (conditional on paid) */}
          {form.entryType === "paid" && (
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", sm: "1fr 2fr" },
                gap: 2.5,
              }}
            >
              <TextField
                label="Entry Fee *"
                size="small"
                type="number"
                fullWidth
                value={form.entryFee}
                onChange={(e) => field("entryFee", e.target.value)}
                error={!!errors.entryFee}
                helperText={errors.entryFee}
                sx={inputSx}
              />
            </Box>
          )}

          {/* Active + Last Offer toggles */}
          <Box sx={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
            <FormControlLabel
              control={
                <Switch
                  checked={form.isActive}
                  onChange={(e) => field("isActive", e.target.checked)}
                  sx={{
                    "& .MuiSwitch-switchBase.Mui-checked": {
                      color: colors.primary,
                    },
                    "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": {
                      bgcolor: colors.primary,
                    },
                  }}
                />
              }
              label={
                <span
                  style={{
                    fontSize: "0.875rem",
                    fontWeight: 600,
                    color: colors.textPrimary,
                  }}
                >
                  Active
                </span>
              }
            />
            <FormControlLabel
              control={
                <Switch
                  checked={form.lastOfferEnabled}
                  onChange={(e) => field("lastOfferEnabled", e.target.checked)}
                  sx={{
                    "& .MuiSwitch-switchBase.Mui-checked": {
                      color: colors.primary,
                    },
                    "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": {
                      bgcolor: colors.primary,
                    },
                  }}
                />
              }
              label={
                <span
                  style={{
                    fontSize: "0.875rem",
                    fontWeight: 600,
                    color: colors.textPrimary,
                  }}
                >
                  Enable Last Offer
                </span>
              }
            />
          </Box>

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
              <strong>Note:</strong>{" "}
              {isEdit
                ? "Changes will be applied immediately. The auction status is automatically updated based on the start and end times."
                : "The auction status (upcoming / live / ended) is calculated automatically from the start and end times you set."}
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
          onClick={() => navigate("/admin/auctions")}
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
          {saving ? "Saving…" : isEdit ? "Save Changes" : "Create Auction"}
        </Button>
      </Box>
    </Box>
  );
}
