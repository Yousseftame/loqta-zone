/**
 * src/pages/Admin/Finance/components/AddTransactionModal.tsx
 *
 * Modal form to add a new income or expense transaction.
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
  type TransactionFormValues,
  type TransactionType,
  type PaymentMethod,
  type TransactionCategory,
} from "../finance-data";

const EMPTY: TransactionFormValues = {
  type: "income",
  amount: "",
  method: "cash",
  category: "auction_revenue",
  note: "",
};

interface Props {
  open: boolean;
  adding: boolean;
  onClose: () => void;
  onSubmit: (values: TransactionFormValues) => Promise<void>;
}

export default function AddTransactionModal({
  open,
  adding,
  onClose,
  onSubmit,
}: Props) {
  const [form, setForm] = useState<TransactionFormValues>(EMPTY);
  const [error, setError] = useState<string | null>(null);

  const categories =
    form.type === "expense" ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;

  const set = <K extends keyof TransactionFormValues>(
    k: K,
    v: TransactionFormValues[K],
  ) => setForm((p) => ({ ...p, [k]: v }));

  const handleTypeChange = (type: TransactionType) => {
    const defaultCat = type === "expense" ? "other" : "auction_revenue";
    setForm((p) => ({
      ...p,
      type,
      category: defaultCat as TransactionCategory,
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

  const isExpense = form.type === "expense";

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

        {/* Type toggle */}
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
                  fontSize: "0.82rem",
                  borderRadius: "8px !important",
                  border: `1px solid ${colors.border} !important`,
                  mx: 0.5,
                },
              }}
            >
              <ToggleButton
                value="income"
                sx={{
                  "&.Mui-selected": {
                    bgcolor: "#D1FAE5 !important",
                    color: "#065F46 !important",
                    borderColor: "#059669 !important",
                  },
                }}
              >
                📈 Income
              </ToggleButton>
              <ToggleButton
                value="expense"
                sx={{
                  "&.Mui-selected": {
                    bgcolor: "#FEE2E2 !important",
                    color: "#991B1B !important",
                    borderColor: "#DC2626 !important",
                  },
                }}
              >
                📉 Expense
              </ToggleButton>
            </ToggleButtonGroup>
          </Box>
        </Box>

        {/* Amount */}
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

        {/* Method */}
        <TextField
          label="Payment Method"
          select
          size="small"
          fullWidth
          value={form.method}
          onChange={(e) => set("method", e.target.value as PaymentMethod)}
          sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
        >
          <MenuItem value="cash">💵 Cash</MenuItem>
          <MenuItem value="bank">🏦 Bank</MenuItem>
        </TextField>

        {/* Category */}
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

        {/* Note */}
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
            bgcolor: isExpense ? "#DC2626" : colors.primary,
            "&:hover": { bgcolor: isExpense ? "#B91C1C" : colors.primaryDark },
            minWidth: 120,
          }}
        >
          {adding ? (
            <CircularProgress size={18} sx={{ color: "#fff" }} />
          ) : (
            `Save ${isExpense ? "Expense" : "Income"}`
          )}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
