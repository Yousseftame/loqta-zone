/**
 * src/pages/Admin/Finance/components/AddTransactionModal.tsx
 *
 * Handles both CREATE and EDIT modes.
 *
 * Edit mode: pass `editingTx` prop. The modal pre-fills with the existing
 * transaction values. On submit, calls `onUpdate` instead of `onSubmit`.
 * The Cloud Function onTransactionUpdated handles reversing old + applying new.
 *
 * Balance Validation (Update 2):
 * Before saving, we compute whether the transaction would push any balance
 * negative. If so, we show a clear error and block the save.
 * Rules:
 *   - expense:          method balance must cover the amount
 *   - owner_withdrawal: method balance must cover the amount
 *   - transfer:         source balance must cover the amount
 *   - owner_return:     ownerBalance must cover the amount (can't return more than withdrawn)
 *   - income:           always allowed (money coming IN)
 *
 * Owner Return (Update 3):
 * New "↩ Return" tab. Owner puts money BACK into cash or bank.
 * Decrements ownerBalance, increments cash/bank.
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
  OWNER_RETURN_CATEGORIES,
  TRANSFER_CATEGORIES,
  type TransactionFormValues,
  type TransactionType,
  type PaymentMethod,
  type TransactionCategory,
  type TransferCategory,
  type FinanceStats,
  type Transaction,
} from "../finance-data";

// ─── Defaults by type ─────────────────────────────────────────────────────────

const DEFAULT_CATEGORY_BY_TYPE: Record<TransactionType, TransactionCategory> = {
  income: "auction_revenue",
  expense: "products",
  owner_withdrawal: "owner_draw",
  owner_return: "owner_return",
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
  owner_return: {
    label: "Return",
    emoji: "↩️",
    selectedBg: "#ECFDF5",
    selectedColor: "#065F46",
    selectedBorder: "#10B981",
    btnColor: "#10B981",
    btnHover: "#059669",
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
  updating?: boolean;
  onClose: () => void;
  onSubmit: (values: TransactionFormValues) => Promise<void>;
  onUpdate?: (values: TransactionFormValues) => Promise<void>;
  /** When provided, the modal opens in EDIT mode */
  editingTx?: Transaction | null;
  /** Optional pre-fill for new transactions (e.g. from product form) */
  initialValues?: Partial<TransactionFormValues>;
  /** Current live stats — used for balance validation */
  stats?: FinanceStats;
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

/** Build form from an existing transaction (edit mode) */
function buildFormFromTx(tx: Transaction): TransactionFormValues {
  return {
    type: tx.type,
    amount: String(tx.amount),
    method: tx.method,
    category: tx.category,
    note: tx.note ?? "",
    transferTo: tx.transferTo,
  };
}

/** Merge EMPTY defaults with any provided initialValues */
function buildInitialForm(
  init?: Partial<TransactionFormValues>,
): TransactionFormValues {
  if (!init) return EMPTY;
  return {
    ...EMPTY,
    ...init,
    transferTo:
      init.type === "transfer" ? (init.transferTo ?? "bank") : EMPTY.transferTo,
  };
}

// ─── Balance validator ────────────────────────────────────────────────────────
// Returns an error string if the transaction would cause a negative balance.
// When editing, we need to account for the fact that the OLD transaction
// will be reversed before the new one is applied.

function validateBalance(
  form: TransactionFormValues,
  stats: FinanceStats | undefined,
  editingTx: Transaction | null | undefined,
): string | null {
  if (!stats) return null;
  const amount = Number(form.amount);
  if (isNaN(amount) || amount <= 0) return null; // handled by amount validation

  // When editing, compute the balance as if the OLD transaction was reversed first
  let cashBalance = stats.cashBalance;
  let bankBalance = stats.bankBalance;
  let ownerBalance = stats.ownerBalance;

  if (editingTx) {
    const old = editingTx;
    const oldAmt = old.amount;
    // Reverse old transaction effect on balances
    if (old.type === "income") {
      if (old.method === "cash") cashBalance -= oldAmt;
      else bankBalance -= oldAmt;
    } else if (old.type === "expense") {
      if (old.method === "cash") cashBalance += oldAmt;
      else bankBalance += oldAmt;
    } else if (old.type === "owner_withdrawal") {
      if (old.method === "cash") cashBalance += oldAmt;
      else bankBalance += oldAmt;
      ownerBalance -= oldAmt;
    } else if (old.type === "owner_return") {
      if (old.method === "cash") cashBalance -= oldAmt;
      else bankBalance -= oldAmt;
      ownerBalance += oldAmt;
    } else if (old.type === "transfer") {
      const oldDest =
        old.transferTo ?? (old.method === "cash" ? "bank" : "cash");
      if (old.method === "cash") cashBalance += oldAmt;
      else bankBalance += oldAmt;
      if (oldDest === "cash") cashBalance -= oldAmt;
      else bankBalance -= oldAmt;
    }
  }

  // Now validate the NEW transaction against these adjusted balances
  if (form.type === "expense") {
    const sourceBalance = form.method === "cash" ? cashBalance : bankBalance;
    if (sourceBalance - amount < 0) {
      const sourceName = form.method === "cash" ? "Cash" : "Bank";
      return `Insufficient ${sourceName} balance. Available: ${sourceBalance.toLocaleString("en-EG")} EGP, needed: ${amount.toLocaleString("en-EG")} EGP.`;
    }
  } else if (form.type === "owner_withdrawal") {
    const sourceBalance = form.method === "cash" ? cashBalance : bankBalance;
    if (sourceBalance - amount < 0) {
      const sourceName = form.method === "cash" ? "Cash" : "Bank";
      return `Insufficient ${sourceName} balance. Available: ${sourceBalance.toLocaleString("en-EG")} EGP, needed: ${amount.toLocaleString("en-EG")} EGP.`;
    }
  } else if (form.type === "transfer") {
    const sourceBalance = form.method === "cash" ? cashBalance : bankBalance;
    if (sourceBalance - amount < 0) {
      const sourceName = form.method === "cash" ? "Cash" : "Bank";
      return `Insufficient ${sourceName} balance for transfer. Available: ${sourceBalance.toLocaleString("en-EG")} EGP, needed: ${amount.toLocaleString("en-EG")} EGP.`;
    }
  } else if (form.type === "owner_return") {
    if (ownerBalance - amount < 0) {
      return `Owner return exceeds the owner balance. Owner balance: ${ownerBalance.toLocaleString("en-EG")} EGP, return amount: ${amount.toLocaleString("en-EG")} EGP.`;
    }
  }

  return null;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AddTransactionModal({
  open,
  adding,
  updating = false,
  onClose,
  onSubmit,
  onUpdate,
  editingTx,
  initialValues,
  stats,
}: Props) {
  const isEditMode = !!editingTx;
  const isBusy = adding || updating;

  const [form, setForm] = useState<TransactionFormValues>(EMPTY);
  const [error, setError] = useState<string | null>(null);

  // Initialise form when modal opens or editingTx changes
  useEffect(() => {
    if (open) {
      if (editingTx) {
        setForm(buildFormFromTx(editingTx));
      } else {
        setForm(buildInitialForm(initialValues));
      }
      setError(null);
    }
  }, [open, editingTx]); // eslint-disable-line react-hooks/exhaustive-deps

  // Re-initialise when initialValues changes while modal is closed (new tx pre-fill)
  useEffect(() => {
    if (!open && !editingTx) {
      setForm(buildInitialForm(initialValues));
      setError(null);
    }
  }, [initialValues, open, editingTx]);

  const isTransfer = form.type === "transfer";
  const isOwner = form.type === "owner_withdrawal";
  const isOwnerReturn = form.type === "owner_return";

  const categories =
    form.type === "expense"
      ? EXPENSE_CATEGORIES
      : form.type === "owner_withdrawal"
        ? OWNER_CATEGORIES
        : form.type === "owner_return"
          ? OWNER_RETURN_CATEGORIES
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

    // ── Balance validation ─────────────────────────────────────────────────
    const balanceError = validateBalance(
      form,
      stats,
      isEditMode ? editingTx : null,
    );
    if (balanceError) {
      setError(balanceError);
      return;
    }

    try {
      if (isEditMode && onUpdate) {
        await onUpdate(form);
      } else {
        await onSubmit(form);
      }
      setForm(EMPTY);
      onClose();
    } catch (err: any) {
      setError(err?.message ?? "Failed to save transaction.");
    }
  };

  const handleClose = () => {
    if (isBusy) return;
    setForm(EMPTY);
    setError(null);
    onClose();
  };

  const tabCfg = TAB_CONFIG[form.type];
  const hasPrefill =
    !isEditMode && !!initialValues && Object.keys(initialValues).length > 0;

  // Balance hint shown below amount field
  const getBalanceHint = (): string | null => {
    if (!stats) return null;
    if (
      form.type === "expense" ||
      form.type === "owner_withdrawal" ||
      form.type === "transfer"
    ) {
      const bal =
        form.method === "cash" ? stats.cashBalance : stats.bankBalance;
      const name = form.method === "cash" ? "Cash" : "Bank";
      return `${name} available: ${bal.toLocaleString("en-EG")} EGP`;
    }
    if (form.type === "owner_return") {
      return `Owner balance available: ${stats.ownerBalance.toLocaleString("en-EG")} EGP`;
    }
    return null;
  };

  const balanceHint = getBalanceHint();

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
        {isEditMode
          ? "✏️ Edit Transaction"
          : hasPrefill
            ? "Log Product Expense"
            : "Add Transaction"}
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

        {/* Edit mode info banner */}
        {isEditMode && (
          <Box
            sx={{
              p: 1.5,
              bgcolor: "#EFF6FF",
              border: "1px solid #BFDBFE",
              borderRadius: 2,
              fontSize: "0.78rem",
              color: "#1E40AF",
              lineHeight: 1.5,
            }}
          >
            ✏️ Editing this transaction will automatically recalculate all
            affected balances.
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
                  fontSize: "0.7rem",
                  borderRadius: "8px !important",
                  border: `1px solid ${colors.border} !important`,
                  mx: 0.2,
                  py: 0.8,
                  px: 0.4,
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
                value="owner_return"
                sx={{
                  "&.Mui-selected": {
                    bgcolor: `${TAB_CONFIG.owner_return.selectedBg} !important`,
                    color: `${TAB_CONFIG.owner_return.selectedColor} !important`,
                    borderColor: `${TAB_CONFIG.owner_return.selectedBorder} !important`,
                  },
                }}
              >
                ↩️ Return
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

          {isOwnerReturn && (
            <Box
              sx={{
                mt: 1.5,
                p: 1.5,
                bgcolor: "#ECFDF5",
                border: "1px solid #A7F3D0",
                borderRadius: 2,
                fontSize: "0.75rem",
                color: "#065F46",
                lineHeight: 1.5,
              }}
            >
              ↩️ <strong>Owner Return</strong> puts money back into the business
              from the owner. It increases Cash or Bank balance and reduces the
              owner balance.
              {stats && (
                <div style={{ marginTop: 4, fontWeight: 700 }}>
                  Current owner balance:{" "}
                  {stats.ownerBalance.toLocaleString("en-EG")} EGP
                </div>
              )}
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
          helperText={balanceHint ?? undefined}
          FormHelperTextProps={{
            sx: { color: colors.textMuted, fontSize: "0.72rem" },
          }}
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
              helperText={
                stats
                  ? `Available: ${(form.method === "cash" ? stats.cashBalance : stats.bankBalance).toLocaleString("en-EG")} EGP`
                  : "Money will be taken from this balance"
              }
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
          /* For owner_return — "method" means the destination (where money goes INTO) */
          <TextField
            label={
              isOwner
                ? "Source (debit from)"
                : isOwnerReturn
                  ? "Destination (credit to)"
                  : "Payment Method"
            }
            select
            size="small"
            fullWidth
            value={form.method}
            onChange={(e) => set("method", e.target.value as PaymentMethod)}
            sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
            helperText={
              isOwner
                ? "The balance that will be reduced"
                : isOwnerReturn
                  ? "The balance that will be increased"
                  : undefined
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
          disabled={isBusy}
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
          disabled={isBusy}
          sx={{
            borderRadius: 2,
            textTransform: "none",
            fontWeight: 700,
            px: 3,
            bgcolor: tabCfg.btnColor,
            "&:hover": { bgcolor: tabCfg.btnHover },
            minWidth: 150,
          }}
        >
          {isBusy ? (
            <CircularProgress size={18} sx={{ color: "#fff" }} />
          ) : isEditMode ? (
            `Update ✏️`
          ) : (
            `Save ${tabCfg.emoji} ${tabCfg.label}`
          )}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
