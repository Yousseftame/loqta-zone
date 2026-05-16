/**
 * Payment accounts — shared types, Firestore helpers, and balance math.
 * Aggregate cash/bank on finance_stats/dashboard is unchanged (Cloud Function uses method).
 * Per-account balances are derived from transactions.accountId / transferToAccountId.
 */

import {
  collection,
  doc,
  getDocs,
  query,
  orderBy,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/firebase/firebase";
import type { PaymentMethod, Transaction, FinanceStats } from "@/pages/Admin/Finance/finance-data";

export type AccountMethod = PaymentMethod;
export type AccountStatus = "active" | "archived";

export interface PaymentAccount {
  id: string;
  name: string;
  method: AccountMethod;
  accountNumber?: string;
  notes?: string;
  isDefault: boolean;
  status: AccountStatus;
  color: string;
  icon: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export interface AccountBalanceResult {
  balance: number;
  income: number;
  expenses: number;
  txCount: number;
}

export interface MethodUnassignedResult {
  balance: number;
  txCount: number;
}

export function docToAccount(id: string, data: Record<string, unknown>): PaymentAccount {
  return {
    id,
    name: (data.name as string) ?? "",
    method: (data.method as AccountMethod) ?? "bank",
    accountNumber: (data.accountNumber as string) ?? "",
    notes: (data.notes as string) ?? "",
    isDefault: Boolean(data.isDefault),
    status: (data.status as AccountStatus) ?? "active",
    color: (data.color as string) ?? "#2A4863",
    icon: (data.icon as string) ?? "🏦",
    createdAt:
      data.createdAt instanceof Timestamp
        ? data.createdAt.toDate()
        : new Date(),
    updatedAt:
      data.updatedAt instanceof Timestamp
        ? data.updatedAt.toDate()
        : new Date(),
    createdBy: (data.createdBy as string) ?? "",
  };
}

export async function fetchPaymentAccounts(): Promise<PaymentAccount[]> {
  const q = query(
    collection(db, "paymentAccounts"),
    orderBy("createdAt", "asc"),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => docToAccount(d.id, d.data() as Record<string, unknown>));
}

export function getActiveAccounts(accounts: PaymentAccount[]): PaymentAccount[] {
  return accounts.filter((a) => a.status === "active");
}

/** Default active account for a method, or first active account of that method. */
export function getDefaultAccountIdForMethod(
  accounts: PaymentAccount[],
  method: PaymentMethod,
): string | undefined {
  const active = getActiveAccounts(accounts).filter((a) => a.method === method);
  const def = active.find((a) => a.isDefault);
  return def?.id ?? active[0]?.id;
}

export function accountMatchesMethod(
  accounts: PaymentAccount[],
  accountId: string | undefined,
  method: PaymentMethod,
): boolean {
  if (!accountId) return false;
  const acc = accounts.find((a) => a.id === accountId);
  return !!acc && acc.status === "active" && acc.method === method;
}

/** Running balance for one named account (linked transactions only). */
export function computeAccountBalance(
  accountId: string,
  transactions: Transaction[],
): AccountBalanceResult {
  let income = 0;
  let expenses = 0;
  let txCount = 0;

  for (const tx of transactions) {
    if (tx.type === "transfer") {
      if (tx.accountId === accountId) {
        txCount++;
        expenses += tx.amount;
      }
      if (tx.transferToAccountId === accountId) {
        txCount++;
        income += tx.amount;
      }
      continue;
    }

    if (tx.accountId !== accountId) continue;
    txCount++;

    if (tx.type === "income" || tx.type === "owner_return") {
      income += tx.amount;
    } else if (tx.type === "expense" || tx.type === "owner_withdrawal") {
      expenses += tx.amount;
    }
  }

  return { balance: income - expenses, income, expenses, txCount };
}

/** Transactions with no account link — includes transfers by method leg. */
export function computeUnassignedForMethod(
  transactions: Transaction[],
  method: PaymentMethod,
): MethodUnassignedResult {
  let balance = 0;
  let txCount = 0;

  for (const tx of transactions) {
    if (tx.type === "transfer") {
      const dest = tx.transferTo ?? (tx.method === "cash" ? "bank" : "cash");
      if (tx.method === method && !tx.accountId) {
        balance -= tx.amount;
        txCount++;
      }
      if (dest === method && !tx.transferToAccountId) {
        balance += tx.amount;
        txCount++;
      }
      continue;
    }

    if (tx.accountId) continue;
    if (tx.method !== method) continue;

    if (tx.type === "income" || tx.type === "owner_return") {
      balance += tx.amount;
      txCount++;
    } else if (tx.type === "expense" || tx.type === "owner_withdrawal") {
      balance -= tx.amount;
      txCount++;
    }
  }

  return { balance, txCount };
}

export function sumActiveAccountBalances(
  accounts: PaymentAccount[],
  transactions: Transaction[],
): { cash: number; bank: number } {
  let cash = 0;
  let bank = 0;
  for (const acc of getActiveAccounts(accounts)) {
    const { balance } = computeAccountBalance(acc.id, transactions);
    if (acc.method === "cash") cash += balance;
    else bank += balance;
  }
  return { cash, bank };
}

/** Compare dashboard stats vs tracked accounts + unassigned (should align when fully linked). */
export function computeReconciliation(
  stats: FinanceStats,
  accounts: PaymentAccount[],
  transactions: Transaction[],
): {
  cash: { dashboard: number; accounts: number; unassigned: number; combined: number; delta: number };
  bank: { dashboard: number; accounts: number; unassigned: number; combined: number; delta: number };
} {
  const tracked = sumActiveAccountBalances(accounts, transactions);
  const unCash = computeUnassignedForMethod(transactions, "cash");
  const unBank = computeUnassignedForMethod(transactions, "bank");
  const cashCombined = tracked.cash + unCash.balance;
  const bankCombined = tracked.bank + unBank.balance;

  return {
    cash: {
      dashboard: stats.cashBalance,
      accounts: tracked.cash,
      unassigned: unCash.balance,
      combined: cashCombined,
      delta: stats.cashBalance - cashCombined,
    },
    bank: {
      dashboard: stats.bankBalance,
      accounts: tracked.bank,
      unassigned: unBank.balance,
      combined: bankCombined,
      delta: stats.bankBalance - bankCombined,
    },
  };
}

/** Per-account sufficiency when an account is selected (optional extra check). */
export function getAccountAvailableBalance(
  accountId: string,
  transactions: Transaction[],
): number {
  return computeAccountBalance(accountId, transactions).balance;
}

export function validateAccountBalance(
  accountId: string,
  amount: number,
  transactions: Transaction[],
  editingTx: Transaction | null | undefined,
  /** Types that debit the account (outflow). */
  debitTypes: Transaction["type"][] = ["expense", "owner_withdrawal", "transfer"],
): string | null {
  let available = getAccountAvailableBalance(accountId, transactions);

  if (editingTx?.accountId === accountId && debitTypes.includes(editingTx.type)) {
    available += editingTx.amount;
  }
  if (
    editingTx?.transferToAccountId === accountId &&
    editingTx.type === "transfer"
  ) {
    available -= editingTx.amount;
  }

  if (amount > available) {
    return `Insufficient balance in this account. Available: ${available.toLocaleString("en-EG")} EGP, needed: ${amount.toLocaleString("en-EG")} EGP.`;
  }
  return null;
}

export function accountNameById(
  accounts: PaymentAccount[],
  accountId: string | undefined,
): string {
  if (!accountId) return "—";
  const acc = accounts.find((a) => a.id === accountId);
  return acc ? `${acc.icon} ${acc.name}` : accountId.slice(0, 8) + "…";
}

function poolMethodLabel(method: PaymentMethod): string {
  return method === "cash" ? "💵 Cash" : "🏦 Bank";
}

/** Wallet / method label for tables, reports, and ledger meta. */
export function buildMethodDisplay(
  tx: Transaction,
  accounts: PaymentAccount[] = [],
): string {
  const fromAcc = tx.accountId
    ? accountNameById(accounts, tx.accountId)
    : null;
  const toAcc = tx.transferToAccountId
    ? accountNameById(accounts, tx.transferToAccountId)
    : null;

  if (tx.type === "transfer") {
    const destMethod =
      tx.transferTo ?? (tx.method === "cash" ? "bank" : "cash");
    if (fromAcc && toAcc) return `${fromAcc} → ${toAcc}`;
    if (fromAcc)
      return `${fromAcc} → ${poolMethodLabel(destMethod)}`;
    if (toAcc) return `${poolMethodLabel(tx.method)} → ${toAcc}`;
    return `${poolMethodLabel(tx.method)} → ${poolMethodLabel(destMethod)}`;
  }

  if (tx.type === "owner_return") {
    if (fromAcc) return `${fromAcc} (in)`;
    return tx.method === "cash" ? "💵 Cash (in)" : "🏦 Bank (in)";
  }

  if (fromAcc) return fromAcc;
  return poolMethodLabel(tx.method);
}

export function methodFromAccountId(
  accounts: PaymentAccount[],
  accountId: string | undefined,
  fallback: PaymentMethod = "cash",
): PaymentMethod {
  if (!accountId) return fallback;
  const acc = accounts.find((a) => a.id === accountId && a.status === "active");
  return acc?.method ?? fallback;
}
