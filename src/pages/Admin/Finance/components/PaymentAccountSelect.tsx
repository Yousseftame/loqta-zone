/**
 * Reusable payment-account picker (grouped by cash / bank).
 */

import { useMemo } from "react";
import { TextField, MenuItem } from "@mui/material";
import { colors } from "../../Products/products-data";
import {
  usePaymentAccounts,
  getActiveAccounts,
  getDefaultAccountIdForMethod,
  computeAccountBalance,
  type PaymentAccount,
} from "@/hooks/usePaymentAccounts";
import type { Transaction } from "../finance-data";
import type { PaymentMethod } from "../finance-data";

type Props = {
  label?: string;
  value: string;
  onChange: (accountId: string, method: PaymentMethod) => void;
  required?: boolean;
  disabled?: boolean;
  helperText?: string;
  transactions?: Transaction[];
  /** Amount to validate against account balance (optional) */
  amountToValidate?: number;
};

export default function PaymentAccountSelect({
  label = "Payment account *",
  value,
  onChange,
  required = true,
  disabled = false,
  helperText,
  transactions = [],
  amountToValidate,
}: Props) {
  const { accounts, loading } = usePaymentAccounts();
  const active = useMemo(() => getActiveAccounts(accounts), [accounts]);

  const cashAccounts = active.filter((a) => a.method === "cash");
  const bankAccounts = active.filter((a) => a.method === "bank");

  const selected = active.find((a) => a.id === value);
  const balance =
    value && transactions.length > 0
      ? computeAccountBalance(value, transactions).balance
      : null;

  const balanceHint =
    selected && balance !== null
      ? `Available in ${selected.name}: ${balance.toLocaleString("en-EG")} EGP`
      : undefined;

  const overLimit =
    amountToValidate != null &&
    amountToValidate > 0 &&
    balance !== null &&
    amountToValidate > balance;

  if (!loading && active.length === 0) {
    return (
      <TextField
        label="Payment method *"
        select
        size="small"
        fullWidth
        value={selected?.method ?? "cash"}
        disabled={disabled}
        onChange={(e) => onChange("", e.target.value as PaymentMethod)}
        helperText="No payment accounts yet — using cash/bank pool"
        sx={inputSx}
      >
        <MenuItem value="cash">💵 Cash (pool)</MenuItem>
        <MenuItem value="bank">🏦 Bank (pool)</MenuItem>
      </TextField>
    );
  }

  return (
    <TextField
      label={label}
      select
      size="small"
      fullWidth
      required={required}
      disabled={disabled || loading}
      value={value || ""}
      onChange={(e) => {
        const id = e.target.value;
        const acc = active.find((a) => a.id === id);
        onChange(id, acc?.method ?? "cash");
      }}
      error={overLimit}
      helperText={
        overLimit
          ? `Insufficient account balance (need ${amountToValidate!.toLocaleString("en-EG")} EGP)`
          : helperText ?? balanceHint
      }
      FormHelperTextProps={{ sx: { fontSize: "0.7rem" } }}
      sx={inputSx}
    >
      <MenuItem value="" disabled>
        <em>Select account…</em>
      </MenuItem>
      {cashAccounts.length > 0 && (
        <MenuItem disabled sx={{ opacity: 1, fontWeight: 700, fontSize: "0.7rem" }}>
          💵 Cash wallets
        </MenuItem>
      )}
      {cashAccounts.map((a) => (
        <MenuItem key={a.id} value={a.id}>
          {a.icon} {a.name}
          {a.isDefault ? " · default" : ""}
        </MenuItem>
      ))}
      {bankAccounts.length > 0 && (
        <MenuItem disabled sx={{ opacity: 1, fontWeight: 700, fontSize: "0.7rem" }}>
          🏦 Bank accounts
        </MenuItem>
      )}
      {bankAccounts.map((a) => (
        <MenuItem key={a.id} value={a.id}>
          {a.icon} {a.name}
          {a.isDefault ? " · default" : ""}
        </MenuItem>
      ))}
    </TextField>
  );
}

const inputSx = {
  "& .MuiOutlinedInput-root": {
    bgcolor: "#fff",
    "& fieldset": { borderColor: colors.border },
    "&:hover fieldset": { borderColor: colors.primary },
    "&.Mui-focused fieldset": { borderColor: colors.primary, borderWidth: 2 },
  },
  "& .MuiInputLabel-root.Mui-focused": { color: colors.primary },
};

export function pickDefaultAccountId(
  accounts: PaymentAccount[],
  method: PaymentMethod,
): string {
  return getDefaultAccountIdForMethod(accounts, method) ?? "";
}
