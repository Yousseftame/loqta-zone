/**
 * src/pages/Admin/Finance/components/AddTransactionModal.tsx
 *
 * Handles both CREATE and EDIT modes.
 *
 * Edit mode: pass `editingTx` prop. The modal pre-fills with the existing
 * transaction values. On submit, calls `onUpdate` instead of `onSubmit`.
 * The Cloud Function onTransactionUpdated handles reversing old + applying new.
 *
 * Balance Validation:
 * Before saving, we compute whether the transaction would push any balance
 * negative. If so, we show a clear error and block the save.
 *
 * ─── Split Payment (NEW) ──────────────────────────────────────────────────────
 * Available for income and expense types only (not owner/transfer/return).
 * A "Split Payment" toggle reveals a multi-part editor where the admin can
 * add 2–5 payment parts, each with its own method (cash/bank) and amount.
 * On submit, each part is saved as a separate Firestore doc sharing a groupId.
 * The total of all parts is validated against available balances before saving.
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
  Switch,
  FormControlLabel,
  IconButton,
  Tooltip,
} from "@mui/material";
import { PlusCircle, Trash2, SplitSquareHorizontal } from "lucide-react";
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
  type SplitPart,
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
  isSplit: false,
  splits: [],
};

// Split is only allowed for income and expense
const SPLIT_ALLOWED_TYPES: TransactionType[] = ["income", "expense"];

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
    isSplit: false,
    splits: [],
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
    isSplit: false,
    splits: [],
  };
}

/** Generate a unique key for a split part */
function newSplitKey(): string {
  return Math.random().toString(36).slice(2, 10);
}

/** Build default initial splits (2 parts) */
function buildDefaultSplits(): SplitPart[] {
  return [
    { key: newSplitKey(), method: "bank", amount: "" },
    { key: newSplitKey(), method: "cash", amount: "" },
  ];
}

// ─── Balance validator ────────────────────────────────────────────────────────

function validateBalance(
  form: TransactionFormValues,
  stats: FinanceStats | undefined,
  editingTx: Transaction | null | undefined,
): string | null {
  if (!stats) return null;

  let cashBalance = stats.cashBalance;
  let bankBalance = stats.bankBalance;
  let ownerBalance = stats.ownerBalance;

  if (editingTx) {
    const old = editingTx;
    const oldAmt = old.amount;
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

  // ── Split payment validation ───────────────────────────────────────────────
  if (form.isSplit && form.splits && form.splits.length > 0) {
    // Accumulate total debits per method
    let cashDebit = 0;
    let bankDebit = 0;
    for (const part of form.splits) {
      const amt = Number(part.amount);
      if (part.method === "cash") cashDebit += amt;
      else bankDebit += amt;
    }

    if (form.type === "expense") {
      if (cashDebit > 0 && cashBalance - cashDebit < 0) {
        return `Insufficient Cash balance for split. Available: ${cashBalance.toLocaleString("en-EG")} EGP, needed: ${cashDebit.toLocaleString("en-EG")} EGP.`;
      }
      if (bankDebit > 0 && bankBalance - bankDebit < 0) {
        return `Insufficient Bank balance for split. Available: ${bankBalance.toLocaleString("en-EG")} EGP, needed: ${bankDebit.toLocaleString("en-EG")} EGP.`;
      }
    }
    return null;
  }

  // ── Single payment validation ──────────────────────────────────────────────
  const amount = Number(form.amount);
  if (isNaN(amount) || amount <= 0) return null;

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

// ─── Split editor sub-component ───────────────────────────────────────────────

interface SplitEditorProps {
  splits: SplitPart[];
  stats: FinanceStats | undefined;
  transactionType: TransactionType;
  onChange: (splits: SplitPart[]) => void;
}

function SplitEditor({
  splits,
  stats,
  transactionType,
  onChange,
}: SplitEditorProps) {
  const totalCash = splits
    .filter((s) => s.method === "cash")
    .reduce((sum, s) => sum + (Number(s.amount) || 0), 0);
  const totalBank = splits
    .filter((s) => s.method === "bank")
    .reduce((sum, s) => sum + (Number(s.amount) || 0), 0);
  const grandTotal = totalCash + totalBank;

  const updatePart = (key: string, field: keyof SplitPart, value: string) => {
    onChange(splits.map((p) => (p.key === key ? { ...p, [field]: value } : p)));
  };

  const removePart = (key: string) => {
    if (splits.length <= 2) return; // minimum 2 parts
    onChange(splits.filter((p) => p.key !== key));
  };

  const addPart = () => {
    if (splits.length >= 5) return; // max 5 parts
    // Default to the method that hasn't been used yet, or alternate
    const usedMethods = splits.map((s) => s.method);
    const nextMethod: PaymentMethod =
      usedMethods.filter((m) => m === "bank").length <=
      usedMethods.filter((m) => m === "cash").length
        ? "bank"
        : "cash";
    onChange([
      ...splits,
      { key: newSplitKey(), method: nextMethod, amount: "" },
    ]);
  };

  const isExpense = transactionType === "expense";

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
      {/* Parts */}
      {splits.map((part, idx) => {
        const balanceAvailable =
          part.method === "cash"
            ? (stats?.cashBalance ?? 0)
            : (stats?.bankBalance ?? 0);
        const partAmt = Number(part.amount) || 0;
        const isOverBalance =
          isExpense && partAmt > 0 && partAmt > balanceAvailable;

        return (
          <Box
            key={part.key}
            sx={{
              display: "flex",
              gap: 1,
              alignItems: "flex-start",
              p: 1.5,
              borderRadius: 2,
              border: `1px solid ${isOverBalance ? "#FECACA" : "#E2E8F0"}`,
              bgcolor: isOverBalance ? "#FFF5F5" : "#F8FAFC",
              position: "relative",
              transition: "border-color 0.15s",
            }}
          >
            {/* Part label pill */}
            <Box
              sx={{
                position: "absolute",
                top: -10,
                left: 12,
                bgcolor: colors.primary,
                color: "#fff",
                borderRadius: 999,
                px: 1.2,
                py: 0.2,
                fontSize: "0.62rem",
                fontWeight: 800,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
              }}
            >
              Part {idx + 1}
            </Box>

            {/* Method selector */}
            <TextField
              select
              size="small"
              value={part.method}
              onChange={(e) => updatePart(part.key, "method", e.target.value)}
              sx={{
                width: 120,
                flexShrink: 0,
                "& .MuiOutlinedInput-root": { borderRadius: 1.5 },
              }}
              helperText={
                stats
                  ? `${part.method === "cash" ? "💵" : "🏦"} ${balanceAvailable.toLocaleString("en-EG")} EGP`
                  : undefined
              }
              FormHelperTextProps={{
                sx: {
                  fontSize: "0.65rem",
                  color: isOverBalance ? "#DC2626" : colors.textMuted,
                  mt: 0.3,
                },
              }}
            >
              <MenuItem value="cash">💵 Cash</MenuItem>
              <MenuItem value="bank">🏦 Bank</MenuItem>
            </TextField>

            {/* Amount */}
            <TextField
              label="Amount (EGP)"
              type="number"
              size="small"
              fullWidth
              value={part.amount}
              onChange={(e) => updatePart(part.key, "amount", e.target.value)}
              inputProps={{ min: 0, step: "0.01" }}
              error={isOverBalance}
              helperText={
                isOverBalance
                  ? `Exceeds ${part.method === "cash" ? "cash" : "bank"} balance`
                  : undefined
              }
              FormHelperTextProps={{ sx: { fontSize: "0.65rem", mt: 0.3 } }}
              sx={{ "& .MuiOutlinedInput-root": { borderRadius: 1.5 } }}
            />

            {/* Remove part button */}
            <Tooltip
              title={splits.length <= 2 ? "Minimum 2 parts" : "Remove part"}
            >
              <span>
                <IconButton
                  size="small"
                  onClick={() => removePart(part.key)}
                  disabled={splits.length <= 2}
                  sx={{
                    color: splits.length <= 2 ? "#CBD5E1" : "#EF4444",
                    "&:hover": {
                      bgcolor: splits.length <= 2 ? "transparent" : "#FEE2E2",
                    },
                    mt: 0.5,
                    flexShrink: 0,
                  }}
                >
                  <Trash2 size={14} />
                </IconButton>
              </span>
            </Tooltip>
          </Box>
        );
      })}

      {/* Add part button */}
      {splits.length < 5 && (
        <Button
          size="small"
          startIcon={<PlusCircle size={14} />}
          onClick={addPart}
          sx={{
            textTransform: "none",
            fontWeight: 700,
            fontSize: "0.75rem",
            color: colors.primary,
            borderRadius: 2,
            border: `1.5px dashed ${colors.border}`,
            py: 0.75,
            "&:hover": {
              bgcolor: colors.primaryBg,
              borderColor: colors.primary,
            },
          }}
        >
          Add Part ({splits.length}/5)
        </Button>
      )}

      {/* Summary totals */}
      {grandTotal > 0 && (
        <Box
          sx={{
            mt: 0.5,
            p: 1.5,
            borderRadius: 2,
            border: `1px solid ${colors.border}`,
            bgcolor: "#EFF6FF",
            display: "flex",
            gap: 2,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <span
              style={{
                fontSize: "0.68rem",
                fontWeight: 700,
                color: colors.textMuted,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                display: "block",
                marginBottom: 2,
              }}
            >
              Split Summary
            </span>
            <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
              {totalCash > 0 && (
                <span
                  style={{
                    fontSize: "0.78rem",
                    fontWeight: 700,
                    color: "#1E40AF",
                  }}
                >
                  💵 Cash: {totalCash.toLocaleString("en-EG")} EGP
                </span>
              )}
              {totalBank > 0 && (
                <span
                  style={{
                    fontSize: "0.78rem",
                    fontWeight: 700,
                    color: "#1E40AF",
                  }}
                >
                  🏦 Bank: {totalBank.toLocaleString("en-EG")} EGP
                </span>
              )}
            </Box>
          </Box>
          <Box sx={{ textAlign: "right", flexShrink: 0 }}>
            <span
              style={{
                fontSize: "0.68rem",
                fontWeight: 700,
                color: colors.textMuted,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                display: "block",
                marginBottom: 2,
              }}
            >
              Total
            </span>
            <span
              style={{
                fontSize: "1rem",
                fontWeight: 800,
                color: colors.primaryDark,
              }}
            >
              {grandTotal.toLocaleString("en-EG")} EGP
            </span>
          </Box>
        </Box>
      )}
    </Box>
  );
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

  // Re-initialise when initialValues changes while modal is closed
  useEffect(() => {
    if (!open && !editingTx) {
      setForm(buildInitialForm(initialValues));
      setError(null);
    }
  }, [initialValues, open, editingTx]);

  const isTransfer = form.type === "transfer";
  const isOwner = form.type === "owner_withdrawal";
  const isOwnerReturn = form.type === "owner_return";
  const splitAllowed = SPLIT_ALLOWED_TYPES.includes(form.type) && !isEditMode;
  const isSplitActive = splitAllowed && !!form.isSplit;

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
    const newSplitAllowed = SPLIT_ALLOWED_TYPES.includes(newType);
    if (newType === "transfer") {
      setForm((p) => ({
        ...p,
        type: "transfer",
        method: "cash",
        transferTo: "bank",
        category: "cash_to_bank",
        isSplit: false,
        splits: [],
      }));
    } else {
      setForm((p) => ({
        ...p,
        type: newType,
        category: DEFAULT_CATEGORY_BY_TYPE[newType],
        transferTo: undefined,
        // Reset split state when switching to a non-split-allowed type
        isSplit: newSplitAllowed ? p.isSplit : false,
        splits: newSplitAllowed ? p.splits : [],
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

  const handleSplitToggle = (enabled: boolean) => {
    if (enabled) {
      setForm((p) => ({
        ...p,
        isSplit: true,
        splits: buildDefaultSplits(),
        amount: "", // clear single amount
      }));
    } else {
      setForm((p) => ({
        ...p,
        isSplit: false,
        splits: [],
      }));
    }
  };

  const handleSplitsChange = (splits: SplitPart[]) => {
    setForm((p) => ({ ...p, splits }));
  };

  const handleSubmit = async () => {
    setError(null);

    if (isSplitActive) {
      // ── Split validation ────────────────────────────────────────────────
      const splits = form.splits ?? [];
      if (splits.length < 2) {
        setError("Split payment requires at least 2 parts.");
        return;
      }
      for (let i = 0; i < splits.length; i++) {
        const amt = Number(splits[i].amount);
        if (!splits[i].amount || isNaN(amt) || amt <= 0) {
          setError(
            `Part ${i + 1}: please enter a valid amount greater than 0.`,
          );
          return;
        }
      }

      const balanceError = validateBalance(form, stats, null);
      if (balanceError) {
        setError(balanceError);
        return;
      }

      try {
        await onSubmit(form);
        setForm(EMPTY);
        onClose();
      } catch (err: any) {
        setError(err?.message ?? "Failed to save transaction.");
      }
      return;
    }

    // ── Single validation ──────────────────────────────────────────────────
    const amount = Number(form.amount);
    if (!form.amount || isNaN(amount) || amount <= 0) {
      setError("Please enter a valid amount greater than 0.");
      return;
    }

    if (isTransfer && form.method === form.transferTo) {
      setError("Source and destination must be different.");
      return;
    }

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

  // Balance hint shown below amount field (single mode only)
  const getBalanceHint = (): string | null => {
    if (!stats || isSplitActive) return null;
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

  // Compute split total for submit button label
  const splitGrandTotal = isSplitActive
    ? (form.splits ?? []).reduce((sum, p) => sum + (Number(p.amount) || 0), 0)
    : 0;

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

        {/* ── Split Payment Toggle — only for income/expense, not edit mode ── */}
        {splitAllowed && (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              p: 1.5,
              borderRadius: 2,
              border: `1.5px solid ${isSplitActive ? colors.primary : colors.border}`,
              bgcolor: isSplitActive ? colors.primaryBg : "#FAFAFA",
              transition: "all 0.2s ease",
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <SplitSquareHorizontal
                size={16}
                color={isSplitActive ? colors.primary : colors.textMuted}
              />
              <Box>
                <div
                  style={{
                    fontSize: "0.82rem",
                    fontWeight: 700,
                    color: isSplitActive
                      ? colors.primaryDark
                      : colors.textSecondary,
                    lineHeight: 1.2,
                  }}
                >
                  Split Payment
                </div>
                <div
                  style={{
                    fontSize: "0.68rem",
                    color: colors.textMuted,
                    marginTop: 2,
                  }}
                >
                  Pay with multiple methods in one transaction
                </div>
              </Box>
            </Box>
            <Switch
              checked={isSplitActive}
              onChange={(e) => handleSplitToggle(e.target.checked)}
              size="small"
              sx={{
                "& .MuiSwitch-switchBase.Mui-checked": {
                  color: colors.primary,
                },
                "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": {
                  bgcolor: colors.primary,
                },
              }}
            />
          </Box>
        )}

        {/* ── Split editor OR single amount ── */}
        {isSplitActive ? (
          <SplitEditor
            splits={form.splits ?? buildDefaultSplits()}
            stats={stats}
            transactionType={form.type}
            onChange={handleSplitsChange}
          />
        ) : (
          <>
            {/* ── Amount (single mode) ── */}
            {!isTransfer && (
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
            )}

            {/* ── Transfer source/destination ── */}
            {isTransfer ? (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
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
                    sx={{
                      height: 1,
                      flex: 1,
                      bgcolor: "#DDD6FE",
                      borderRadius: 1,
                    }}
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
                    sx={{
                      height: 1,
                      flex: 1,
                      bgcolor: "#DDD6FE",
                      borderRadius: 1,
                    }}
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
              !isSplitActive && (
                /* Payment Method — single mode, non-transfer */
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
                  onChange={(e) =>
                    set("method", e.target.value as PaymentMethod)
                  }
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
              )
            )}
          </>
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
          ) : isSplitActive ? (
            `Save Split${splitGrandTotal > 0 ? ` · ${splitGrandTotal.toLocaleString("en-EG")} EGP` : ""}`
          ) : (
            `Save ${tabCfg.emoji} ${tabCfg.label}`
          )}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
