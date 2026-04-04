/**
 * src/pages/Admin/Finance/components/AddTransactionModal.tsx
 *
 * Updated: accepts an optional `initialValues` prop so the modal can be
 * pre-filled from outside (e.g. after adding a product with a cost price).
 * When `initialValues` changes while the modal is closed, the form resets
 * to those values the next time it opens.
 */

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogActions,
  Button,
  TextField,
  MenuItem,
  ToggleButton,
  ToggleButtonGroup,
  CircularProgress,
  Box,
  Alert,
} from "@mui/material";
import { colors } from "../../Products/products-data";
import {
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  OWNER_CATEGORIES,
  TRANSFER_CATEGORIES,
  type TransactionFormValues,
  type TransactionType,
  type PaymentMethod,
  type TransactionCategory,
  type TransferCategory,
} from "../finance-data";

// ─── Defaults by type ─────────────────────────────────────────────────────────

const DEFAULT_CATEGORY_BY_TYPE: Record<TransactionType, TransactionCategory> = {
  income: "auction_revenue",
  expense: "products", // ← default to "products" for expense (most common from product form)
  owner_withdrawal: "owner_draw",
  transfer: "cash_to_bank",
};

const EMPTY: TransactionFormValues = {
  type: "income",
  amount: "",
  method: "cash",
  category: "auction_revenue",
  note: "",
  transferTo: "bank",
};

// ─── Tab visual config ────────────────────────────────────────────────────────

const TAB_CONFIG: Record<
  TransactionType,
  {
    label: string;
    emoji: string;
    selectedBg: string;
    selectedColor: string;
    selectedBorder: string;
    btnColor: string;
    btnHover: string;
  }
> = {
  income: {
    label: "Income",
    emoji: "📈",
    selectedBg: "#D1FAE5",
    selectedColor: "#065F46",
    selectedBorder: "#059669",
    btnColor: colors.primary,
    btnHover: colors.primaryDark,
  },
  expense: {
    label: "Expense",
    emoji: "📉",
    selectedBg: "#FEE2E2",
    selectedColor: "#991B1B",
    selectedBorder: "#DC2626",
    btnColor: "#DC2626",
    btnHover: "#B91C1C",
  },
  owner_withdrawal: {
    label: "Owner",
    emoji: "👤",
    selectedBg: "#FEF3C7",
    selectedColor: "#78350F",
    selectedBorder: "#D97706",
    btnColor: "#D97706",
    btnHover: "#B45309",
  },
  transfer: {
    label: "Transfer",
    emoji: "🔄",
    selectedBg: "#EDE9FE",
    selectedColor: "#4C1D95",
    selectedBorder: "#7C3AED",
    btnColor: "#7C3AED",
    btnHover: "#6D28D9",
  },
};

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  open: boolean;
  adding: boolean;
  onClose: () => void;
  onSubmit: (values: TransactionFormValues) => Promise<void>;
  /** Optional pre-fill: when provided, the modal opens with these values loaded */
  initialValues?: Partial<TransactionFormValues>;
}

// ─── Helper: derive transferTo and category from method for transfers ─────────

function deriveTransferFields(method: PaymentMethod): {
  transferTo: PaymentMethod;
  category: TransferCategory;
} {
  if (method === "cash") {
    return { transferTo: "bank", category: "cash_to_bank" };
  }
  return { transferTo: "cash", category: "bank_to_cash" };
}

/** Merge EMPTY defaults with any provided initialValues */
function buildInitialForm(
  init?: Partial<TransactionFormValues>,
): TransactionFormValues {
  if (!init) return EMPTY;
  return {
    ...EMPTY,
    ...init,
    // Ensure transferTo is set correctly for transfer type
    transferTo:
      init.type === "transfer" ? (init.transferTo ?? "bank") : EMPTY.transferTo,
  };
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AddTransactionModal({
  open,
  adding,
  onClose,
  onSubmit,
  initialValues,
}: Props) {
  const [form, setForm] = useState<TransactionFormValues>(
    buildInitialForm(initialValues),
  );
  const [error, setError] = useState<string | null>(null);

  // Re-initialise the form whenever initialValues changes (e.g. product was saved)
  // Only applies when modal is closed so we don't reset a half-filled form
  useEffect(() => {
    if (!open) {
      setForm(buildInitialForm(initialValues));
      setError(null);
    }
  }, [initialValues, open]);

  // Also reset when modal opens fresh with new initialValues
  useEffect(() => {
    if (open) {
      setForm(buildInitialForm(initialValues));
      setError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const isTransfer = form.type === "transfer";
  const isOwner = form.type === "owner_withdrawal";

  // Categories depend on active type
  const categories =
    form.type === "expense"
      ? EXPENSE_CATEGORIES
      : form.type === "owner_withdrawal"
        ? OWNER_CATEGORIES
        : form.type === "transfer"
          ? TRANSFER_CATEGORIES
          : INCOME_CATEGORIES;

  const set = <K extends keyof TransactionFormValues>(
    k: K,
    v: TransactionFormValues[K],
  ) => setForm((p) => ({ ...p, [k]: v }));

  const handleTypeChange = (newType: TransactionType) => {
    if (newType === "transfer") {
      setForm((p) => ({
        ...p,
        type: "transfer",
        method: "cash",
        transferTo: "bank",
        category: "cash_to_bank",
      }));
    } else {
      setForm((p) => ({
        ...p,
        type: newType,
        category: DEFAULT_CATEGORY_BY_TYPE[newType],
        transferTo: undefined,
      }));
    }
  };

  const handleTransferSourceChange = (source: PaymentMethod) => {
    const { transferTo, category } = deriveTransferFields(source);
    setForm((p) => ({
      ...p,
      method: source,
      transferTo,
      category,
    }));
  };

  const handleSubmit = async () => {
    setError(null);
    const amount = Number(form.amount);
    if (!form.amount || isNaN(amount) || amount <= 0) {
      setError("Please enter a valid amount greater than 0.");
      return;
    }

    if (isTransfer && form.method === form.transferTo) {
      setError("Source and destination must be different.");
      return;
    }

    try {
      await onSubmit(form);
      setForm(EMPTY);
      onClose();
    } catch (err: any) {
      setError(err?.message ?? "Failed to save transaction.");
    }
  };

  const handleClose = () => {
    if (adding) return;
    setForm(EMPTY);
    setError(null);
    onClose();
  };

  const tabCfg = TAB_CONFIG[form.type];

  // Whether the modal was opened with a pre-fill (shows a helpful banner)
  const hasPrefill = !!initialValues && Object.keys(initialValues).length > 0;

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: { borderRadius: 3, border: `1px solid ${colors.border}` },
      }}
    >
      {/* ── Title ── */}
      <DialogTitle
        sx={{
          fontWeight: 700,
          fontSize: "1rem",
          color: colors.primaryDark,
          borderBottom: `1px solid ${colors.border}`,
          pb: 2,
        }}
      >
        {hasPrefill ? "Log Product Expense" : "Add Transaction"}
      </DialogTitle>

      {/* ── Body ── */}
      <DialogContent
        sx={{
          pt: "20px !important",
          display: "flex",
          flexDirection: "column",
          gap: 2.5,
        }}
      >
        {/* Pre-fill context banner */}
        {hasPrefill && (
          <Box
            sx={{
              p: 1.5,
              bgcolor: "#FEF3C7",
              border: "1px solid #FDE68A",
              borderRadius: 2,
              fontSize: "0.78rem",
              color: "#78350F",
              lineHeight: 1.5,
            }}
          >
            💡 The cost price from your new product has been pre-filled below.
            Review the details and click <strong>Save</strong> to log it as a
            product expense.
          </Box>
        )}

        {error && (
          <Alert severity="error" sx={{ borderRadius: 2, fontSize: "0.8rem" }}>
            {error}
          </Alert>
        )}

        {/* ── Type toggle ── */}
        <Box>
          <label
            style={{
              fontSize: "0.75rem",
              fontWeight: 700,
              color: colors.textMuted,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
            }}
          >
            Type
          </label>
          <Box sx={{ mt: 0.75 }}>
            <ToggleButtonGroup
              exclusive
              value={form.type}
              size="small"
              fullWidth
              onChange={(_, v) => {
                if (v) handleTypeChange(v as TransactionType);
              }}
              sx={{
                "& .MuiToggleButton-root": {
                  textTransform: "none",
                  fontWeight: 700,
                  fontSize: "0.75rem",
                  borderRadius: "8px !important",
                  border: `1px solid ${colors.border} !important`,
                  mx: 0.3,
                  py: 0.9,
                  px: 0.5,
                },
              }}
            >
              <ToggleButton
                value="income"
                sx={{
                  "&.Mui-selected": {
                    bgcolor: `${TAB_CONFIG.income.selectedBg} !important`,
                    color: `${TAB_CONFIG.income.selectedColor} !important`,
                    borderColor: `${TAB_CONFIG.income.selectedBorder} !important`,
                  },
                }}
              >
                📈 Income
              </ToggleButton>

              <ToggleButton
                value="expense"
                sx={{
                  "&.Mui-selected": {
                    bgcolor: `${TAB_CONFIG.expense.selectedBg} !important`,
                    color: `${TAB_CONFIG.expense.selectedColor} !important`,
                    borderColor: `${TAB_CONFIG.expense.selectedBorder} !important`,
                  },
                }}
              >
                📉 Expense
              </ToggleButton>

              <ToggleButton
                value="owner_withdrawal"
                sx={{
                  "&.Mui-selected": {
                    bgcolor: `${TAB_CONFIG.owner_withdrawal.selectedBg} !important`,
                    color: `${TAB_CONFIG.owner_withdrawal.selectedColor} !important`,
                    borderColor: `${TAB_CONFIG.owner_withdrawal.selectedBorder} !important`,
                  },
                }}
              >
                👤 Owner
              </ToggleButton>

              <ToggleButton
                value="transfer"
                sx={{
                  "&.Mui-selected": {
                    bgcolor: `${TAB_CONFIG.transfer.selectedBg} !important`,
                    color: `${TAB_CONFIG.transfer.selectedColor} !important`,
                    borderColor: `${TAB_CONFIG.transfer.selectedBorder} !important`,
                  },
                }}
              >
                🔄 Transfer
              </ToggleButton>
            </ToggleButtonGroup>
          </Box>

          {isOwner && (
            <Box
              sx={{
                mt: 1.5,
                p: 1.5,
                bgcolor: "#FFFBEB",
                border: "1px solid #FDE68A",
                borderRadius: 2,
                fontSize: "0.75rem",
                color: "#78350F",
                lineHeight: 1.5,
              }}
            >
              💡 <strong>Owner Withdrawal</strong> transfers business money to
              the owner. It reduces Cash or Bank balance and is tracked
              separately from operating expenses.
            </Box>
          )}

          {isTransfer && (
            <Box
              sx={{
                mt: 1.5,
                p: 1.5,
                bgcolor: "#F5F3FF",
                border: "1px solid #DDD6FE",
                borderRadius: 2,
                fontSize: "0.75rem",
                color: "#4C1D95",
                lineHeight: 1.5,
              }}
            >
              🔄 <strong>Transfer</strong> moves money between Cash and Bank.
              Your available balance stays the same.
            </Box>
          )}
        </Box>

        {/* ── Amount ── */}
        <TextField
          label="Amount (EGP)"
          type="number"
          size="small"
          fullWidth
          value={form.amount}
          onChange={(e) => set("amount", e.target.value)}
          inputProps={{ min: 0, step: "0.01" }}
          sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
        />

        {/* ── Transfer source/destination ── */}
        {isTransfer ? (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
            <TextField
              label="From (source)"
              select
              size="small"
              fullWidth
              value={form.method}
              onChange={(e) =>
                handleTransferSourceChange(e.target.value as PaymentMethod)
              }
              sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
              helperText="Money will be taken from this balance"
            >
              <MenuItem value="cash">💵 Cash</MenuItem>
              <MenuItem value="bank">🏦 Bank</MenuItem>
            </TextField>

            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 1,
                py: 0.5,
              }}
            >
              <Box
                sx={{ height: 1, flex: 1, bgcolor: "#DDD6FE", borderRadius: 1 }}
              />
              <Box
                sx={{
                  px: 1.5,
                  py: 0.5,
                  bgcolor: "#EDE9FE",
                  border: "1px solid #DDD6FE",
                  borderRadius: 999,
                  fontSize: "0.72rem",
                  fontWeight: 700,
                  color: "#6D28D9",
                  whiteSpace: "nowrap",
                }}
              >
                🔄 Transfer to
              </Box>
              <Box
                sx={{ height: 1, flex: 1, bgcolor: "#DDD6FE", borderRadius: 1 }}
              />
            </Box>

            <TextField
              label="To (destination)"
              size="small"
              fullWidth
              value={form.transferTo === "cash" ? "💵 Cash" : "🏦 Bank"}
              InputProps={{ readOnly: true }}
              sx={{
                "& .MuiOutlinedInput-root": {
                  borderRadius: 2,
                  bgcolor: "#F5F3FF",
                },
              }}
              helperText="Money will be added to this balance"
            />
          </Box>
        ) : (
          <TextField
            label={isOwner ? "Source (debit from)" : "Payment Method"}
            select
            size="small"
            fullWidth
            value={form.method}
            onChange={(e) => set("method", e.target.value as PaymentMethod)}
            sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
            helperText={
              isOwner ? "The balance that will be reduced" : undefined
            }
          >
            <MenuItem value="cash">💵 Cash</MenuItem>
            <MenuItem value="bank">🏦 Bank</MenuItem>
          </TextField>
        )}

        {/* ── Category ── */}
        {!isTransfer && (
          <TextField
            label="Category"
            select
            size="small"
            fullWidth
            value={form.category}
            onChange={(e) =>
              set("category", e.target.value as TransactionCategory)
            }
            sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
          >
            {categories.map((c) => (
              <MenuItem key={c.value} value={c.value}>
                {c.label}
              </MenuItem>
            ))}
          </TextField>
        )}

        {/* ── Note ── */}
        <TextField
          label="Note (optional)"
          size="small"
          fullWidth
          multiline
          rows={2}
          value={form.note}
          onChange={(e) => set("note", e.target.value)}
          sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
        />
      </DialogContent>

      {/* ── Actions ── */}
      <DialogActions
        sx={{
          px: 3,
          pb: 2.5,
          borderTop: `1px solid ${colors.border}`,
          gap: 1.5,
        }}
      >
        <Button
          onClick={handleClose}
          disabled={adding}
          sx={{
            borderRadius: 2,
            textTransform: "none",
            color: colors.textSecondary,
            fontWeight: 600,
          }}
        >
          {hasPrefill ? "Skip" : "Cancel"}
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={adding}
          sx={{
            borderRadius: 2,
            textTransform: "none",
            fontWeight: 700,
            px: 3,
            bgcolor: tabCfg.btnColor,
            "&:hover": { bgcolor: tabCfg.btnHover },
            minWidth: 140,
          }}
        >
          {adding ? (
            <CircularProgress size={18} sx={{ color: "#fff" }} />
          ) : (
            `Save ${tabCfg.emoji} ${tabCfg.label}`
          )}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
