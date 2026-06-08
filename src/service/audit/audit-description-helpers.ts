/**
 * Rich audit descriptions + before/after diffs for Finance, Purchases, and Auctions.
 */

import type { AuditChange } from "./audit-log-data";
import type {
  Transaction,
  TransactionFormValues,
  TransactionType,
  PaymentMethod,
} from "@/pages/Admin/Finance/finance-data";
import {
  CATEGORY_LABEL,
  resolveTransactionCategoryLabel,
} from "@/pages/Admin/Finance/finance-data";
import {
  accountNameById,
  buildMethodDisplay,
  type PaymentAccount,
} from "@/service/finance/paymentAccounts";
import type { Purchase } from "@/pages/Admin/Purchases/purchases-data";
import {
  STATUS_CONFIG,
  PAYMENT_TYPE_CONFIG,
  PAYMENT_STATUS_CONFIG,
} from "@/pages/Admin/Purchases/purchases-data";
import type { Auction, AuctionFormData } from "@/pages/Admin/Auctions/auctions-data";
import { resolveLocalizedField } from "@/lib/resolveLocalized";

// ─── Formatters ───────────────────────────────────────────────────────────────

export function fmtEGP(n: number): string {
  return `${Number(n).toLocaleString("en-EG")} EGP`;
}

function fmtVal(v: unknown): string {
  if (v === null || v === undefined || v === "") return "—";
  if (typeof v === "boolean") return v ? "Yes" : "No";
  if (v instanceof Date) return fmtDateTime(v);
  if (typeof v === "number") return String(v);
  return String(v);
}

function fmtDateTime(d: Date | string): string {
  const date = d instanceof Date ? d : new Date(d);
  if (isNaN(date.getTime())) return String(d);
  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const TX_TYPE_LABEL: Record<TransactionType, string> = {
  income: "Income",
  expense: "Expense",
  owner_withdrawal: "Owner withdrawal",
  owner_return: "Owner return",
  transfer: "Transfer",
};

function methodLabel(m: PaymentMethod): string {
  return m === "cash" ? "Cash" : "Bank";
}

export function buildChanges(
  fields: {
    key: string;
    label: string;
    before: unknown;
    after: unknown;
    format?: (v: unknown) => string;
  }[],
): AuditChange[] {
  const changes: AuditChange[] = [];
  for (const f of fields) {
    const b = f.format ? f.format(f.before) : fmtVal(f.before);
    const a = f.format ? f.format(f.after) : fmtVal(f.after);
    if (b !== a) changes.push({ field: f.label, before: b, after: a });
  }
  return changes;
}

function txSnapshotFromForm(
  values: TransactionFormValues,
  accounts: PaymentAccount[],
): Partial<Transaction> {
  return {
    type: values.type,
    amount: Number(values.amount),
    method: values.method,
    category: values.category,
    note: values.note?.trim() ?? "",
    transferTo: values.transferTo,
    ownerId: values.ownerId,
    ownerName: values.ownerName,
    accountId: values.accountId,
    transferToAccountId: values.transferToAccountId,
  };
}

function walletLine(tx: Partial<Transaction>, accounts: PaymentAccount[]): string {
  return buildMethodDisplay(tx as Transaction, accounts);
}

// ─── Finance: Transactions ────────────────────────────────────────────────────

export function describeTransactionCreated(
  values: TransactionFormValues,
  accounts: PaymentAccount[],
  adminName: string,
  splitParts?: { method: PaymentMethod; amount: number; accountId?: string }[],
): string {
  const typeLabel = TX_TYPE_LABEL[values.type];
  const catLabel =
    values.type === "transfer"
      ? resolveTransactionCategoryLabel(txSnapshotFromForm(values, accounts) as Transaction)
      : (CATEGORY_LABEL[values.category] ?? values.category);

  if (splitParts && splitParts.length > 1) {
    const total = splitParts.reduce((s, p) => s + p.amount, 0);
    const parts = splitParts
      .map((p, i) => {
        const line = walletLine(
          { type: values.type, method: p.method, accountId: p.accountId },
          accounts,
        );
        return `part ${i + 1}: ${fmtEGP(p.amount)} (${line})`;
      })
      .join("; ");
    const note = values.note?.trim() ? ` · Note: "${values.note.trim()}"` : "";
    return `${adminName} recorded split ${typeLabel.toLowerCase()} — ${fmtEGP(total)} [${catLabel}] · ${parts}${note}`;
  }

  const amount = Number(values.amount);
  const snap = txSnapshotFromForm(values, accounts) as Transaction;
  const wallet = walletLine(snap, accounts);
  const note = values.note?.trim() ? ` · Note: "${values.note.trim()}"` : "";

  if (values.type === "owner_withdrawal" || values.type === "owner_return") {
    const owner = values.ownerName?.trim() || "—";
    return `${adminName} recorded ${typeLabel.toLowerCase()} — ${fmtEGP(amount)} for owner "${owner}" via ${wallet} [${catLabel}]${note}`;
  }

  if (values.type === "transfer") {
    return `${adminName} recorded transfer — ${fmtEGP(amount)} · ${wallet} [${catLabel}]${note}`;
  }

  return `${adminName} recorded ${typeLabel.toLowerCase()} — ${fmtEGP(amount)} via ${wallet} [${catLabel}]${note}`;
}

export function describeTransactionUpdated(
  before: Transaction,
  after: TransactionFormValues,
  accounts: PaymentAccount[],
  adminName: string,
): { description: string; changes: AuditChange[] } {
  const afterSnap = txSnapshotFromForm(after, accounts);
  const catFmt = (v: unknown) =>
    CATEGORY_LABEL[String(v)] ?? resolveTransactionCategoryLabel({
      ...before,
      category: String(v) as Transaction["category"],
    });

  const changes = buildChanges([
    { key: "type", label: "Type", before: before.type, after: after.type, format: (v) => TX_TYPE_LABEL[v as TransactionType] ?? fmtVal(v) },
    { key: "amount", label: "Amount", before: before.amount, after: Number(after.amount), format: (v) => fmtEGP(Number(v)) },
    { key: "category", label: "Category", before: before.category, after: after.category, format: catFmt },
    { key: "method", label: "Method", before: before.method, after: after.method, format: (v) => methodLabel(v as PaymentMethod) },
    { key: "note", label: "Note", before: before.note, after: after.note?.trim() ?? "" },
    { key: "ownerName", label: "Owner", before: before.ownerName, after: after.ownerName },
    { key: "transferTo", label: "Transfer destination", before: before.transferTo, after: after.transferTo, format: (v) => (v ? methodLabel(v as PaymentMethod) : "—") },
    {
      key: "accountId",
      label: "From account",
      before: before.accountId,
      after: after.accountId,
      format: (v) => accountNameById(accounts, v as string | undefined),
    },
    {
      key: "transferToAccountId",
      label: "To account",
      before: before.transferToAccountId,
      after: after.transferToAccountId,
      format: (v) => accountNameById(accounts, v as string | undefined),
    },
  ]);

  const summary = changes.length
    ? changes.map((c) => `${c.field}: ${c.before} → ${c.after}`).join(" · ")
    : "no field changes";

  const description = `${adminName} updated ${TX_TYPE_LABEL[before.type].toLowerCase()} (${fmtEGP(before.amount)}) — ${summary}`;

  return { description, changes };
}

export function describeTransactionDeleted(
  tx: Transaction,
  accounts: PaymentAccount[],
  adminName: string,
): string {
  const wallet = walletLine(tx, accounts);
  const cat =
    tx.type === "transfer"
      ? resolveTransactionCategoryLabel(tx)
      : (CATEGORY_LABEL[tx.category] ?? tx.category);
  const owner =
    tx.ownerName && (tx.type === "owner_withdrawal" || tx.type === "owner_return")
      ? ` · Owner: "${tx.ownerName}"`
      : "";
  const note = tx.note?.trim() ? ` · Note: "${tx.note.trim()}"` : "";
  return `${adminName} deleted ${TX_TYPE_LABEL[tx.type].toLowerCase()} — ${fmtEGP(tx.amount)} via ${wallet} [${cat}]${owner}${note}`;
}

// ─── Finance: Owners & payment accounts ───────────────────────────────────────

export function describeOwnerCreated(name: string, adminName: string): string {
  return `${adminName} added owner "${name.trim()}"`;
}

export function describeOwnerDeleted(name: string, adminName: string): string {
  return `${adminName} deleted owner "${name.trim()}"`;
}

export function describePaymentAccountCreated(
  account: Pick<PaymentAccount, "name" | "method" | "icon" | "isDefault">,
  adminName: string,
): string {
  const def = account.isDefault ? " · set as default" : "";
  return `${adminName} created payment account ${account.icon} "${account.name}" (${methodLabel(account.method)})${def}`;
}

export function describePaymentAccountUpdated(
  before: PaymentAccount,
  after: Pick<PaymentAccount, "name" | "method" | "icon" | "accountNumber" | "notes" | "isDefault" | "color">,
  adminName: string,
): { description: string; changes: AuditChange[] } {
  const changes = buildChanges([
    { key: "name", label: "Name", before: before.name, after: after.name },
    { key: "method", label: "Method", before: before.method, after: after.method, format: (v) => methodLabel(v as PaymentMethod) },
    { key: "icon", label: "Icon", before: before.icon, after: after.icon },
    { key: "accountNumber", label: "Account number", before: before.accountNumber, after: after.accountNumber },
    { key: "notes", label: "Notes", before: before.notes, after: after.notes },
    { key: "isDefault", label: "Default", before: before.isDefault, after: after.isDefault },
    { key: "color", label: "Color", before: before.color, after: after.color },
  ]);

  const summary = changes.length
    ? changes.map((c) => `${c.field}: ${c.before} → ${c.after}`).join(" · ")
    : "no field changes";

  return {
    description: `${adminName} updated payment account "${before.name}" — ${summary}`,
    changes,
  };
}

export function describePaymentAccountArchived(
  account: PaymentAccount,
  archived: boolean,
  adminName: string,
): string {
  const action = archived ? "archived" : "restored";
  return `${adminName} ${action} payment account ${account.icon} "${account.name}" (${methodLabel(account.method)})`;
}

export function describePaymentAccountDefaultSet(
  account: PaymentAccount,
  adminName: string,
): string {
  return `${adminName} set ${account.icon} "${account.name}" as default ${methodLabel(account.method)} account`;
}

// ─── Purchases ────────────────────────────────────────────────────────────────

export function describePurchaseCreated(p: Purchase, adminName: string): string {
  const pay =
    p.paymentType === "cash"
      ? `paid in full (${fmtEGP(p.paidAmount)})`
      : p.paymentType === "credit"
        ? `on credit (${fmtEGP(p.remainingAmount)} due)`
        : `partial — paid ${fmtEGP(p.paidAmount)}, remaining ${fmtEGP(p.remainingAmount)}`;
  const due = p.dueDate ? ` · due ${fmtDateTime(p.dueDate)}` : "";
  return `${adminName} created purchase "${p.productTitle}" × ${p.quantity} from "${p.supplierName}" — total ${fmtEGP(p.totalCost)} (${pay}${due}) · status: ${STATUS_CONFIG[p.status].label}`;
}

export function describePurchaseUpdated(
  before: Purchase,
  after: Purchase,
  adminName: string,
): { description: string; changes: AuditChange[] } {
  const changes = buildChanges([
    { key: "productTitle", label: "Product", before: before.productTitle, after: after.productTitle },
    { key: "supplierName", label: "Supplier", before: before.supplierName, after: after.supplierName },
    { key: "quantity", label: "Quantity", before: before.quantity, after: after.quantity },
    { key: "unitCost", label: "Unit cost", before: before.unitCost, after: after.unitCost, format: (v) => fmtEGP(Number(v)) },
    { key: "totalCost", label: "Total", before: before.totalCost, after: after.totalCost, format: (v) => fmtEGP(Number(v)) },
    { key: "paymentType", label: "Payment type", before: before.paymentType, after: after.paymentType, format: (v) => PAYMENT_TYPE_CONFIG[v as Purchase["paymentType"]]?.label ?? fmtVal(v) },
    { key: "paidAmount", label: "Paid", before: before.paidAmount, after: after.paidAmount, format: (v) => fmtEGP(Number(v)) },
    { key: "remainingAmount", label: "Remaining", before: before.remainingAmount, after: after.remainingAmount, format: (v) => fmtEGP(Number(v)) },
    { key: "paymentStatus", label: "Payment status", before: before.paymentStatus, after: after.paymentStatus, format: (v) => PAYMENT_STATUS_CONFIG[v as Purchase["paymentStatus"]]?.label ?? fmtVal(v) },
    { key: "status", label: "Order status", before: before.status, after: after.status, format: (v) => STATUS_CONFIG[v as Purchase["status"]]?.label ?? fmtVal(v) },
    { key: "dueDate", label: "Due date", before: before.dueDate, after: after.dueDate, format: (v) => (v ? fmtDateTime(v as Date) : "—") },
    { key: "notes", label: "Notes", before: before.notes, after: after.notes },
  ]);

  const summary = changes.length
    ? changes.map((c) => `${c.field}: ${c.before} → ${c.after}`).join(" · ")
    : "no field changes";

  return {
    description: `${adminName} updated purchase "${after.productTitle}" from "${after.supplierName}" — ${summary}`,
    changes,
  };
}

export function describePurchaseDeleted(p: Purchase, adminName: string): string {
  return `${adminName} deleted purchase "${p.productTitle}" × ${p.quantity} from "${p.supplierName}" — ${fmtEGP(p.totalCost)} (${PAYMENT_STATUS_CONFIG[p.paymentStatus].label})`;
}

export function describePurchaseStatusChanged(
  p: Purchase,
  from: string,
  to: string,
  adminName: string,
): string {
  return `${adminName} changed purchase "${p.productTitle}" order status: ${STATUS_CONFIG[from as Purchase["status"]]?.label ?? from} → ${STATUS_CONFIG[to as Purchase["status"]]?.label ?? to}`;
}

export function describePurchasePaymentRecorded(
  p: Purchase,
  amount: number,
  method: string,
  accountLabel: string | undefined,
  adminName: string,
  remainingAfter: number,
): string {
  const via = accountLabel ? `${accountLabel} (${method})` : method;
  const remain =
    remainingAfter > 0
      ? ` · remaining ${fmtEGP(remainingAfter)}`
      : " · fully settled";
  return `${adminName} recorded ${fmtEGP(amount)} payment for "${p.productTitle}" from "${p.supplierName}" via ${via}${remain}`;
}

export function describePurchaseMarkedPaid(p: Purchase, adminName: string): string {
  return `${adminName} marked purchase "${p.productTitle}" from "${p.supplierName}" as fully paid — total ${fmtEGP(p.totalCost)}`;
}

// ─── Auctions ─────────────────────────────────────────────────────────────────

export function describeAuctionCreated(
  auction: Auction,
  productTitle: string,
  adminName: string,
): string {
  const entry =
    auction.entryType === "paid"
      ? `paid entry ${fmtEGP(auction.entryFee)}`
      : "free entry";
  return `${adminName} created auction #${auction.auctionNumber} "${productTitle}" — start ${fmtDateTime(auction.startTime)}, end ${fmtDateTime(auction.endTime)} · starting ${fmtEGP(auction.startingPrice)} · ${auction.bidType} bids · ${entry}`;
}

export function describeAuctionUpdated(
  before: Auction,
  after: Auction,
  productTitleBefore: string,
  productTitleAfter: string,
  adminName: string,
): { description: string; changes: AuditChange[] } {
  const changes = buildChanges([
    { key: "product", label: "Product", before: productTitleBefore, after: productTitleAfter },
    { key: "auctionNumber", label: "Auction #", before: before.auctionNumber, after: after.auctionNumber },
    { key: "startingPrice", label: "Starting price", before: before.startingPrice, after: after.startingPrice, format: (v) => fmtEGP(Number(v)) },
    { key: "minimumIncrement", label: "Min increment", before: before.minimumIncrement, after: after.minimumIncrement, format: (v) => fmtEGP(Number(v)) },
    { key: "bidType", label: "Bid type", before: before.bidType, after: after.bidType },
    { key: "maximumBidLimit", label: "Max bid limit", before: before.maximumBidLimit ?? "", after: after.maximumBidLimit ?? "", format: (v) => (v === "" || v == null ? "—" : fmtEGP(Number(v))) },
    { key: "startTime", label: "Start", before: before.startTime, after: after.startTime, format: (v) => fmtDateTime(v as Date) },
    { key: "endTime", label: "End", before: before.endTime, after: after.endTime, format: (v) => fmtDateTime(v as Date) },
    { key: "entryType", label: "Entry", before: before.entryType, after: after.entryType },
    { key: "entryFee", label: "Entry fee", before: before.entryFee, after: after.entryFee, format: (v) => fmtEGP(Number(v)) },
    { key: "isActive", label: "Active", before: before.isActive, after: after.isActive },
    { key: "lastOfferEnabled", label: "Last offer", before: before.lastOfferEnabled, after: after.lastOfferEnabled },
    { key: "enableChat", label: "Chat", before: before.enableChat, after: after.enableChat },
  ]);

  const summary = changes.length
    ? changes.map((c) => `${c.field}: ${c.before} → ${c.after}`).join(" · ")
    : "no field changes";

  return {
    description: `${adminName} updated auction #${after.auctionNumber} "${productTitleAfter}" — ${summary}`,
    changes,
  };
}

export function describeAuctionDeleted(
  auction: Auction,
  productTitle: string,
  adminName: string,
): string {
  return `${adminName} deleted auction #${auction.auctionNumber} "${productTitle}"`;
}

export function describeAuctionToggled(
  auction: Auction,
  productTitle: string,
  isActive: boolean,
  adminName: string,
): string {
  return `${adminName} ${isActive ? "activated" : "deactivated"} auction #${auction.auctionNumber} "${productTitle}"`;
}

/** Resolve product title from Firestore raw field */
export function titleFromProductData(title: unknown): string {
  return resolveLocalizedField(title, "en", "Unknown product");
}
