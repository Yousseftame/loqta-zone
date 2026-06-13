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
 * ─── Split Payment ────────────────────────────────────────────────────────────
 * Available for income and expense types only (not owner/transfer/return).
 * A "Split Payment" toggle reveals a multi-part editor where the admin can
 * add any number of payment parts (minimum 2), each with its own method
 * (cash/bank) and amount. On submit, each part is saved as a separate
 * Firestore doc sharing a groupId. The total of all parts is validated
 * against available balances before saving.
 */

import { useState, useEffect, useMemo } from "react";
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
  type Owner,
} from "../finance-data";
import {
  usePaymentAccounts,
  getDefaultAccountIdForMethod,
  getActiveAccounts,
  accountMatchesMethod,
  validateAccountBalance,
  type PaymentAccount,
} from "@/hooks/usePaymentAccounts";

// ─── Defaults by type ─────────────────────────────────────────────────────────

const DEFAULT_CATEGORY_BY_TYPE: Record<TransactionType, TransactionCategory> = {
  income: "auction_revenue",
  expense: "other",
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
  accountId: undefined,
  transferToAccountId: undefined,
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
  owners?: Owner[];
  /** Full ledger — used for per-account balance checks */
  transactions?: Transaction[];
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

function deriveSameMethodTransferCategory(method: PaymentMethod): TransferCategory {
  return method === "cash" ? "cash_to_cash" : "bank_to_bank";
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
    ownerId: tx.ownerId,
    ownerName: tx.ownerName,
    accountId: tx.accountId,
    transferToAccountId: tx.transferToAccountId,
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
    ownerId: init.ownerId,
    ownerName: init.ownerName,
  };
}

/** Generate a unique key for a split part */
function newSplitKey(): string {
  return Math.random().toString(36).slice(2, 10);
}

/** Build default initial splits (2 parts) */
function buildDefaultSplits(
  accounts: PaymentAccount[] = [],
): SplitPart[] {
  const bankId = getDefaultAccountIdForMethod(accounts, "bank");
  const cashId = getDefaultAccountIdForMethod(accounts, "cash");
  return [
    { key: newSplitKey(), method: "bank", amount: "", accountId: bankId },
    { key: newSplitKey(), method: "cash", amount: "", accountId: cashId },
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
    let specificOwnerBalance = form.ownerId && stats.ownerBalances ? (stats.ownerBalances[form.ownerId] || 0) : ownerBalance;
    if (editingTx && editingTx.ownerId === form.ownerId) {
      specificOwnerBalance += Number(editingTx.amount); // reverse the old return
    }

    if (specificOwnerBalance - amount < 0) {
      return `Owner return exceeds the owner balance. Owner balance: ${specificOwnerBalance.toLocaleString("en-EG")} EGP, return amount: ${amount.toLocaleString("en-EG")} EGP.`;
    }
  }

  return null;
}

// ─── Split editor sub-component ───────────────────────────────────────────────

interface SplitEditorProps {
  splits: SplitPart[];
  stats: FinanceStats | undefined;
  transactionType: TransactionType;
  accounts: PaymentAccount[];
  onChange: (splits: SplitPart[]) => void;
}

function SplitEditor({
  splits,
  stats,
  transactionType,
  accounts,
  onChange,
}: SplitEditorProps) {
  const active = getActiveAccounts(accounts);
  const totalCash = splits
    .filter((s) => s.method === "cash")
    .reduce((sum, s) => sum + (Number(s.amount) || 0), 0);
  const totalBank = splits
    .filter((s) => s.method === "bank")
    .reduce((sum, s) => sum + (Number(s.amount) || 0), 0);
  const grandTotal = totalCash + totalBank;

  const updatePart = (
    key: string,
    field: keyof SplitPart,
    value: string | PaymentMethod,
  ) => {
    onChange(
      splits.map((p) => {
        if (p.key !== key) return p;
        const next = { ...p, [field]: value } as SplitPart;
        if (field === "method") {
          next.accountId = getDefaultAccountIdForMethod(
            accounts,
            value as PaymentMethod,
          );
        }
        return next;
      }),
    );
  };

  const removePart = (key: string) => {
    if (splits.length <= 2) return; // minimum 2 parts
    onChange(splits.filter((p) => p.key !== key));
  };

  const addPart = () => {
    // Alternate between bank and cash for the new part
    const usedMethods = splits.map((s) => s.method);
    const nextMethod: PaymentMethod =
      usedMethods.filter((m) => m === "bank").length <=
      usedMethods.filter((m) => m === "cash").length
        ? "bank"
        : "cash";
    onChange([
      ...splits,
      {
        key: newSplitKey(),
        method: nextMethod,
        amount: "",
        accountId: getDefaultAccountIdForMethod(accounts, nextMethod),
      },
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
              flexDirection: { xs: "column", sm: "row" },
              flexWrap: "wrap",
              gap: 1.5,
              alignItems: { xs: "stretch", sm: "flex-start" },
              p: 1.5,
              pt: 2,
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
              label="Method"
              value={part.method}
              onChange={(e) => updatePart(part.key, "method", e.target.value)}
              sx={{
                width: { xs: "100%", sm: 112 },
                flexShrink: 0,
                "& .MuiOutlinedInput-root": { borderRadius: 1.5 },
              }}
            >
              <MenuItem value="cash">💵 Cash</MenuItem>
              <MenuItem value="bank">🏦 Bank</MenuItem>
            </TextField>

            {active.length > 0 && (
              <TextField
                select
                size="small"
                label="Wallet account"
                required
                value={part.accountId ?? ""}
                onChange={(e) =>
                  updatePart(part.key, "accountId", e.target.value)
                }
                sx={{
                  flex: { xs: "1 1 100%", sm: "1 1 180px" },
                  minWidth: { sm: 160 },
                  "& .MuiOutlinedInput-root": { borderRadius: 1.5 },
                }}
              >
                {active
                  .filter((a) => a.method === part.method)
                  .map((a) => (
                    <MenuItem key={a.id} value={a.id}>
                      {a.icon} {a.name}
                      {a.isDefault ? " · default" : ""}
                    </MenuItem>
                  ))}
              </TextField>
            )}

            <TextField
              label="Amount (EGP)"
              type="number"
              size="small"
              value={part.amount}
              onChange={(e) => updatePart(part.key, "amount", e.target.value)}
              inputProps={{ min: 0, step: "0.01" }}
              error={isOverBalance}
              helperText={
                isOverBalance
                  ? `Exceeds ${part.method === "cash" ? "cash" : "bank"} pool`
                  : stats
                    ? `Pool: ${balanceAvailable.toLocaleString("en-EG")} EGP`
                    : undefined
              }
              FormHelperTextProps={{
                sx: {
                  fontSize: "0.65rem",
                  color: isOverBalance ? "#DC2626" : colors.textMuted,
                  mt: 0.3,
                },
              }}
              sx={{
                flex: { xs: "1 1 100%", sm: "1 1 140px" },
                minWidth: { sm: 120 },
                "& .MuiOutlinedInput-root": { borderRadius: 1.5 },
              }}
            />

            <Tooltip
              title={splits.length <= 2 ? "Minimum 2 parts" : "Remove part"}
            >
              <span style={{ alignSelf: "flex-end" }}>
                <IconButton
                  size="small"
                  onClick={() => removePart(part.key)}
                  disabled={splits.length <= 2}
                  sx={{
                    color: splits.length <= 2 ? "#CBD5E1" : "#EF4444",
                    "&:hover": {
                      bgcolor: splits.length <= 2 ? "transparent" : "#FEE2E2",
                    },
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

      {/* Add part button — no maximum cap */}
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
        Add Part ({splits.length} parts)
      </Button>

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
  owners = [],
  transactions = [],
}: Props) {
  const isEditMode = !!editingTx;
  const isBusy = adding || updating;
  const { accounts: paymentAccounts } = usePaymentAccounts();
  const activeAccounts = useMemo(
    () => getActiveAccounts(paymentAccounts),
    [paymentAccounts],
  );

  const [form, setForm] = useState<TransactionFormValues>(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [transferKind, setTransferKind] = useState<"pool" | "account">("pool");

  // Initialise form when modal opens or editingTx changes
  useEffect(() => {
    if (open) {
      if (editingTx) {
        const next = buildFormFromTx(editingTx);
        setForm(next);
        if (editingTx.type === "transfer") {
          const dest =
            editingTx.transferTo ??
            deriveTransferFields(editingTx.method).transferTo;
          setTransferKind(
            dest !== editingTx.method ? "pool" : "account",
          );
        }
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
      const useAccounts = activeAccounts.length >= 2;
      setTransferKind(useAccounts ? "account" : "pool");
      const cashDefault = getDefaultAccountIdForMethod(activeAccounts, "cash");
      const bankDefault = getDefaultAccountIdForMethod(activeAccounts, "bank");
      setForm((p) => ({
        ...p,
        type: "transfer",
        method: "cash",
        transferTo: useAccounts ? "cash" : "bank",
        category: useAccounts ? "cash_to_cash" : "cash_to_bank",
        isSplit: false,
        splits: [],
        accountId: useAccounts ? cashDefault : undefined,
        transferToAccountId: useAccounts
          ? activeAccounts.find(
              (a) => a.method === "cash" && a.id !== cashDefault,
            )?.id ?? bankDefault
          : undefined,
      }));
    } else {
      setForm((p) => ({
        ...p,
        type: newType,
        category: DEFAULT_CATEGORY_BY_TYPE[newType],
        transferTo: undefined,
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
      accountId: getDefaultAccountIdForMethod(activeAccounts, source),
      transferToAccountId: getDefaultAccountIdForMethod(
        activeAccounts,
        transferTo,
      ),
    }));
  };

  const handleMethodChange = (method: PaymentMethod) => {
    setForm((p) => ({
      ...p,
      method,
      accountId:
        p.accountId && accountMatchesMethod(activeAccounts, p.accountId, method)
          ? p.accountId
          : getDefaultAccountIdForMethod(activeAccounts, method),
    }));
  };

  const enrichFormForSubmit = (
    values: TransactionFormValues,
  ): TransactionFormValues => {
    if (values.isSplit && values.splits?.length) {
      return {
        ...values,
        splits: values.splits.map((part) => ({
          ...part,
          accountId:
            part.accountId ||
            getDefaultAccountIdForMethod(activeAccounts, part.method),
        })),
      };
    }
    if (values.type === "transfer" && transferKind === "account") {
      const from = activeAccounts.find((a) => a.id === values.accountId);
      const m = from?.method ?? values.method;
      return {
        ...values,
        method: m,
        transferTo: m,
        category: deriveSameMethodTransferCategory(m),
        accountId: values.accountId,
        transferToAccountId: values.transferToAccountId,
      };
    }
    if (values.type === "transfer") {
      const dest =
        values.transferTo ?? deriveTransferFields(values.method).transferTo;
      return {
        ...values,
        transferTo: dest,
        accountId:
          values.accountId ||
          getDefaultAccountIdForMethod(activeAccounts, values.method),
        transferToAccountId:
          values.transferToAccountId ||
          getDefaultAccountIdForMethod(activeAccounts, dest),
      };
    }
    return {
      ...values,
      accountId:
        values.accountId ||
        getDefaultAccountIdForMethod(activeAccounts, values.method),
    };
  };

  const checkAccountBalance = (
    values: TransactionFormValues,
    amount: number,
  ): string | null => {
    if (!values.accountId || !transactions.length) return null;
    const debitTypes: Transaction["type"][] =
      values.type === "transfer"
        ? ["transfer"]
        : values.type === "expense" || values.type === "owner_withdrawal"
          ? [values.type]
          : [];
    if (!debitTypes.length) return null;
    return validateAccountBalance(
      values.accountId,
      amount,
      transactions,
      editingTx ?? null,
      debitTypes,
    );
  };

  const handleSplitToggle = (enabled: boolean) => {
    if (enabled) {
      setForm((p) => ({
        ...p,
        isSplit: true,
        splits: buildDefaultSplits(activeAccounts),
        amount: "",
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
        if (activeAccounts.length > 0 && !splits[i].accountId) {
          setError(`Part ${i + 1}: select a wallet account.`);
          return;
        }
      }

      const balanceError = validateBalance(form, stats, null);
      if (balanceError) {
        setError(balanceError);
        return;
      }

      const prepared = enrichFormForSubmit(form);
      if (form.type === "expense") {
        for (const part of prepared.splits ?? []) {
          const amt = Number(part.amount);
          const accErr = part.accountId
            ? validateAccountBalance(
                part.accountId,
                amt,
                transactions,
                null,
                ["expense"],
              )
            : null;
          if (accErr) {
            setError(accErr);
            return;
          }
        }
      }

      try {
        await onSubmit(prepared);
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

    if (isTransfer && transferKind === "pool" && form.method === form.transferTo) {
      setError("Source and destination must be different.");
      return;
    }

    if (isTransfer && transferKind === "pool" && activeAccounts.length > 0) {
      const dest =
        form.transferTo ?? deriveTransferFields(form.method).transferTo;
      if (!form.accountId || !form.transferToAccountId) {
        setError("Select both source and destination wallet accounts.");
        return;
      }
      const fromAcc = activeAccounts.find((a) => a.id === form.accountId);
      const toAcc = activeAccounts.find((a) => a.id === form.transferToAccountId);
      if (fromAcc && fromAcc.method !== form.method) {
        setError("Source account must match the cash/bank direction.");
        return;
      }
      if (toAcc && toAcc.method !== dest) {
        setError("Destination account must match the transfer destination type.");
        return;
      }
    }

    if (isTransfer && transferKind === "account") {
      if (!form.accountId || !form.transferToAccountId) {
        setError("Select both source and destination accounts.");
        return;
      }
      if (form.accountId === form.transferToAccountId) {
        setError("Source and destination accounts must be different.");
        return;
      }
      const fromAcc = activeAccounts.find((a) => a.id === form.accountId);
      const toAcc = activeAccounts.find((a) => a.id === form.transferToAccountId);
      if (fromAcc && toAcc && fromAcc.method !== toAcc.method) {
        setError("Both accounts must be the same type (cash or bank).");
        return;
      }
    }

    if (isOwner || isOwnerReturn) {
      if (!form.ownerId) {
        setError("Please select an owner.");
        return;
      }
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

    const prepared = enrichFormForSubmit(form);
    const accountErr = checkAccountBalance(prepared, amount);
    if (accountErr) {
      setError(accountErr);
      return;
    }

    if (isTransfer && prepared.transferToAccountId) {
      const destAcc = activeAccounts.find(
        (a) => a.id === prepared.transferToAccountId,
      );
      if (destAcc && destAcc.method !== prepared.transferTo) {
        setError("Destination account must match the transfer destination type.");
        return;
      }
    }

    try {
      if (isEditMode && onUpdate) {
        await onUpdate(prepared);
      } else {
        await onSubmit(prepared);
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
          {!isEditMode && (
            <>
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
            </>
          )}

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
            splits={form.splits ?? buildDefaultSplits(activeAccounts)}
            stats={stats}
            transactionType={form.type}
            accounts={paymentAccounts}
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
                {activeAccounts.length >= 2 && (
                  <ToggleButtonGroup
                    exclusive
                    size="small"
                    value={transferKind}
                    onChange={(_e, v) => {
                      if (!v) return;
                      setTransferKind(v);
                      if (v === "pool") {
                        handleTransferSourceChange(form.method || "cash");
                      }
                    }}
                    sx={{ alignSelf: "flex-start" }}
                  >
                    <ToggleButton value="account" sx={{ textTransform: "none", px: 2 }}>
                      Between accounts
                    </ToggleButton>
                    <ToggleButton value="pool" sx={{ textTransform: "none", px: 2 }}>
                      Cash ↔ Bank pool
                    </ToggleButton>
                  </ToggleButtonGroup>
                )}
                {activeAccounts.length > 0 && transferKind === "account" ? (
                  <>
                    <TextField
                      label="From account"
                      select
                      size="small"
                      fullWidth
                      required
                      value={form.accountId ?? ""}
                      onChange={(e) => {
                        const id = e.target.value;
                        if (!id) return;
                        const acc = activeAccounts.find((a) => a.id === id);
                        if (!acc) return;
                        const peer = activeAccounts.find(
                          (a) =>
                            a.method === acc.method && a.id !== acc.id,
                        );
                        setForm((p) => ({
                          ...p,
                          accountId: id,
                          method: acc.method,
                          transferTo: acc.method,
                          category: deriveSameMethodTransferCategory(acc.method),
                          transferToAccountId:
                            p.transferToAccountId &&
                            activeAccounts.find(
                              (a) => a.id === p.transferToAccountId,
                            )?.method === acc.method &&
                            p.transferToAccountId !== id
                              ? p.transferToAccountId
                              : peer?.id,
                        }));
                      }}
                      sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
                    >
                      {activeAccounts.map((a) => (
                        <MenuItem key={a.id} value={a.id}>
                          {a.icon} {a.name} ({a.method})
                        </MenuItem>
                      ))}
                    </TextField>
                    <TextField
                      label="To account"
                      select
                      size="small"
                      fullWidth
                      required
                      value={form.transferToAccountId ?? ""}
                      onChange={(e) => {
                        const id = e.target.value;
                        const acc = activeAccounts.find((a) => a.id === id);
                        if (!acc) return;
                        setForm((p) => ({
                          ...p,
                          transferToAccountId: id,
                          transferTo: acc.method,
                        }));
                      }}
                      sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
                    >
                      {activeAccounts
                        .filter(
                          (a) =>
                            a.method ===
                              activeAccounts.find((x) => x.id === form.accountId)
                                ?.method && a.id !== form.accountId,
                        )
                        .map((a) => (
                          <MenuItem key={a.id} value={a.id}>
                            {a.icon} {a.name}
                          </MenuItem>
                        ))}
                    </TextField>
                  </>
                ) : activeAccounts.length > 0 && transferKind === "pool" ? (
                  <>
                    <TextField
                      label="Direction"
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
                          ? `${form.method === "cash" ? "Cash" : "Bank"} pool: ${(form.method === "cash" ? stats.cashBalance : stats.bankBalance).toLocaleString("en-EG")} EGP`
                          : undefined
                      }
                    >
                      <MenuItem value="cash">💵 Cash → Bank</MenuItem>
                      <MenuItem value="bank">🏦 Bank → Cash</MenuItem>
                    </TextField>
                    <TextField
                      label={`From (${form.method === "cash" ? "cash" : "bank"} wallet)`}
                      select
                      size="small"
                      fullWidth
                      required
                      value={form.accountId ?? ""}
                      onChange={(e) => {
                        const id = e.target.value;
                        if (!id) return;
                        setForm((p) => ({ ...p, accountId: id }));
                      }}
                      sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
                    >
                      {activeAccounts
                        .filter((a) => a.method === form.method)
                        .map((a) => (
                          <MenuItem key={a.id} value={a.id}>
                            {a.icon} {a.name}
                            {a.isDefault ? " · default" : ""}
                          </MenuItem>
                        ))}
                    </TextField>
                    <TextField
                      label={`To (${(form.transferTo ?? deriveTransferFields(form.method).transferTo) === "cash" ? "cash" : "bank"} wallet)`}
                      select
                      size="small"
                      fullWidth
                      required
                      value={form.transferToAccountId ?? ""}
                      onChange={(e) => {
                        const id = e.target.value;
                        if (!id) return;
                        setForm((p) => ({ ...p, transferToAccountId: id }));
                      }}
                      sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
                    >
                      {activeAccounts
                        .filter(
                          (a) =>
                            a.method ===
                            (form.transferTo ??
                              deriveTransferFields(form.method).transferTo),
                        )
                        .map((a) => (
                          <MenuItem key={a.id} value={a.id}>
                            {a.icon} {a.name}
                            {a.isDefault ? " · default" : ""}
                          </MenuItem>
                        ))}
                    </TextField>
                  </>
                ) : (
                  <>
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
                          : undefined
                      }
                    >
                      <MenuItem value="cash">💵 Cash</MenuItem>
                      <MenuItem value="bank">🏦 Bank</MenuItem>
                    </TextField>
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
                    />
                  </>
                )}
              </Box>
            ) : (
              !isSplitActive && (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  {(isOwner || isOwnerReturn) && (
                    <TextField
                      label="Select Owner"
                      select
                      size="small"
                      fullWidth
                      value={form.ownerId || ""}
                      onChange={(e) => {
                        const ownerId = e.target.value;
                        const ownerName = owners?.find(o => o.id === ownerId)?.name || "";
                        setForm(p => ({ ...p, ownerId, ownerName }));
                      }}
                      sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
                      helperText="Which owner does this apply to?"
                    >
                      {owners?.map((o) => (
                        <MenuItem key={o.id} value={o.id}>
                          {o.name}
                        </MenuItem>
                      ))}
                    </TextField>
                  )}
                  {/* Payment Method — single mode, non-transfer */}
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
                      handleMethodChange(e.target.value as PaymentMethod)
                    }
                    sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
                    helperText={
                      isOwner
                        ? "The balance pool that will be reduced"
                        : isOwnerReturn
                          ? "The balance pool that will be increased"
                          : undefined
                    }
                  >
                    <MenuItem value="cash">💵 Cash</MenuItem>
                    <MenuItem value="bank">🏦 Bank</MenuItem>
                  </TextField>
                  {activeAccounts.length > 0 && (
                    <TextField
                      label="Wallet account"
                      select
                      size="small"
                      fullWidth
                      value={form.accountId ?? ""}
                      onChange={(e) =>
                        set("accountId", e.target.value || undefined)
                      }
                      sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
                      helperText="Optional — links this row to a named account"
                    >
                      <MenuItem value="">
                        <em>Unassigned ({form.method})</em>
                      </MenuItem>
                      {activeAccounts
                        .filter((a) => a.method === form.method)
                        .map((a) => (
                          <MenuItem key={a.id} value={a.id}>
                            {a.icon} {a.name}
                            {a.isDefault ? " · default" : ""}
                          </MenuItem>
                        ))}
                    </TextField>
                  )}
                </Box>
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
