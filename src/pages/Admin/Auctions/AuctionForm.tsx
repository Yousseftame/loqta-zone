import { useEffect, useState } from "react";
import {
  TextField, Button, Paper, Box, Switch, FormControlLabel, CircularProgress,
} from "@mui/material";
import { ArrowLeft, Save, Gavel, Info } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { colors } from "../Products/products-data";
import {
  AUCTION_STATUSES, DEFAULT_AUCTION_FORM, getAuctionStatusStyle,
  type AuctionFormData, type AuctionStatus, type BidType, type EntryType,
} from "./auctions-data";
import { useAuctions } from "@/store/AdminContext/AuctionContext/AuctionContext";

const inputSx = {
  "& .MuiOutlinedInput-root": {
    bgcolor: "#fff",
    "& fieldset": { borderColor: colors.border },
    "&:hover fieldset": { borderColor: colors.primary },
    "&.Mui-focused fieldset": { borderColor: colors.primary, borderWidth: 2 },
  },
  "& .MuiInputLabel-root.Mui-focused": { color: colors.primary },
};

// Convert Date → datetime-local string
function toDatetimeLocal(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function AuctionForm() {
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();
  const isEdit = Boolean(id);
  const { getAuction, addAuction, editAuction } = useAuctions();

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
          startTime: toDatetimeLocal(a.startTime),
          endTime: toDatetimeLocal(a.endTime),
          entryType: a.entryType,
          entryFee: String(a.entryFee),
          status: a.status,
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

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.productId.trim()) e.productId = "Product ID is required";
    if (!form.auctionNumber || isNaN(Number(form.auctionNumber))) e.auctionNumber = "Enter a valid auction number";
    if (!form.startingPrice || isNaN(Number(form.startingPrice)) || Number(form.startingPrice) < 0) e.startingPrice = "Enter a valid starting price";
    if (!form.minimumIncrement || isNaN(Number(form.minimumIncrement)) || Number(form.minimumIncrement) < 0) e.minimumIncrement = "Enter a valid increment";
    if (!form.startTime) e.startTime = "Start time is required";
    if (!form.endTime) e.endTime = "End time is required";
    if (form.startTime && form.endTime && new Date(form.endTime) <= new Date(form.startTime)) e.endTime = "End time must be after start time";
    if (form.entryType === "paid" && (!form.entryFee || isNaN(Number(form.entryFee)) || Number(form.entryFee) <= 0)) e.entryFee = "Enter a valid entry fee";
    return e;
  };

  const handleSave = async () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
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
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "60vh" }}>
        <CircularProgress sx={{ color: colors.primary }} />
      </Box>
    );
  }

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
          {/* Row 1 — Product ID + Auction Number */}
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
              gap: 2.5,
            }}
          >
            <TextField
              label="Product ID *"
              size="small"
              fullWidth
              value={form.productId}
              onChange={(e) => field("productId", e.target.value)}
              error={!!errors.productId}
              helperText={errors.productId}
              sx={inputSx}
              placeholder="Firestore product document ID"
            />
            <TextField
              label="Auction Number *"
              size="small"
              type="number"
              fullWidth
              value={form.auctionNumber}
              onChange={(e) => field("auctionNumber", e.target.value)}
              error={!!errors.auctionNumber}
              helperText={errors.auctionNumber}
              sx={inputSx}
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
              onChange={(e) => field("startTime", e.target.value)}
              error={!!errors.startTime}
              helperText={errors.startTime}
              sx={inputSx}
              InputLabelProps={{ shrink: true }}
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
            />
          </Box>

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

          {/* Entry Fee (conditional) */}
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

          {/* Status pills */}
          <Box>
            <p
              style={{
                fontSize: "0.75rem",
                color: colors.textSecondary,
                fontWeight: 600,
                marginBottom: 6,
              }}
            >
              Status *
            </p>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
              {AUCTION_STATUSES.map((s) => {
                const ss = getAuctionStatusStyle(s);
                const active = form.status === s;
                return (
                  <button
                    key={s}
                    onClick={() => field("status", s as AuctionStatus)}
                    style={{
                      padding: "5px 16px",
                      borderRadius: 99,
                      fontSize: "0.78rem",
                      fontWeight: 600,
                      cursor: "pointer",
                      transition: "all 0.15s",
                      border: `1.5px solid ${active ? ss.color : colors.border}`,
                      background: active ? ss.bg : "#fff",
                      color: active ? ss.color : colors.textSecondary,
                    }}
                  >
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </button>
                );
              })}
            </Box>
          </Box>

          {/* Last Offer toggle */}
          <Box sx={{ display: "flex", alignItems: "center" }}>
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
                ? "Changes will be saved to Firestore immediately."
                : "The auction will be linked to the product by its Firestore document ID."}
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