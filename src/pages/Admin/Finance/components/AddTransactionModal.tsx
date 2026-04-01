/**
 * src/pages/Admin/Finance/components/AddTransactionModal.tsx
 *
 * Modal form to add a new income, expense, or owner withdrawal transaction.
 *
 * ─── Owner Withdrawal tab ────────────────────────────────────────────────────
 * Selecting "Owner" creates a transaction with type="owner_withdrawal".
 * The method field (cash/bank) determines which balance is debited.
 * The Cloud Function handles updating ownerBalance and debiting cashBalance/bankBalance.
 * Owner withdrawals do NOT affect totalIncome or totalExpenses.
 */

import { useState } from "react";
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
  type TransactionFormValues,
  type TransactionType,
  type PaymentMethod,
  type TransactionCategory,
} from "../finance-data";

// ─── Defaults by type ─────────────────────────────────────────────────────────

const DEFAULT_CATEGORY_BY_TYPE: Record<TransactionType, TransactionCategory> = {
  income: "auction_revenue",
  expense: "other",
  owner_withdrawal: "owner_draw",
};

const EMPTY: TransactionFormValues = {
  type: "income",
  amount: "",
  method: "cash",
  category: "auction_revenue",
  note: "",
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
};

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  open: boolean;
  adding: boolean;
  onClose: () => void;
  onSubmit: (values: TransactionFormValues) => Promise<void>;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AddTransactionModal({
  open,
  adding,
  onClose,
  onSubmit,
}: Props) {
  const [form, setForm] = useState<TransactionFormValues>(EMPTY);
  const [error, setError] = useState<string | null>(null);

  // Categories depend on active type
  const categories =
    form.type === "expense"
      ? EXPENSE_CATEGORIES
      : form.type === "owner_withdrawal"
        ? OWNER_CATEGORIES
        : INCOME_CATEGORIES;

  const set = <K extends keyof TransactionFormValues>(
    k: K,
    v: TransactionFormValues[K],
  ) => setForm((p) => ({ ...p, [k]: v }));

  const handleTypeChange = (newType: TransactionType) => {
    setForm((p) => ({
      ...p,
      type: newType,
      category: DEFAULT_CATEGORY_BY_TYPE[newType],
    }));
  };

  const handleSubmit = async () => {
    setError(null);
    const amount = Number(form.amount);
    if (!form.amount || isNaN(amount) || amount <= 0) {
      setError("Please enter a valid amount greater than 0.");
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
  const isOwner = form.type === "owner_withdrawal";

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
        Add Transaction
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
        {error && (
          <Alert severity="error" sx={{ borderRadius: 2, fontSize: "0.8rem" }}>
            {error}
          </Alert>
        )}

        {/* ── Type toggle: Income / Expense / Owner ── */}
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
                  fontSize: "0.8rem",
                  borderRadius: "8px !important",
                  border: `1px solid ${colors.border} !important`,
                  mx: 0.4,
                  py: 0.9,
                },
              }}
            >
              {/* Income */}
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

              {/* Expense */}
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

              {/* Owner Withdrawal */}
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
            </ToggleButtonGroup>
          </Box>

          {/* Owner Withdrawal explanation */}
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
              the owner. It reduces Cash or Bank balance (choose below) and is
              tracked separately from operating expenses — it does <em>not</em>{" "}
              count as a business expense.
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

        {/* ── Method (cash / bank) — always visible, critical for owner withdrawals ── */}
        <TextField
          label={isOwner ? "Source (debit from)" : "Payment Method"}
          select
          size="small"
          fullWidth
          value={form.method}
          onChange={(e) => set("method", e.target.value as PaymentMethod)}
          sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
          helperText={isOwner ? "The balance that will be reduced" : undefined}
        >
          <MenuItem value="cash">💵 Cash</MenuItem>
          <MenuItem value="bank">🏦 Bank</MenuItem>
        </TextField>

        {/* ── Category ── */}
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
          Cancel
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
            minWidth: 130,
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
