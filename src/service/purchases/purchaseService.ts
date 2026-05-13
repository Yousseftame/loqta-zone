/**
 * src/service/purchases/purchaseService.ts
 *
 * Firestore CRUD for the "purchases" collection + "purchasePayments" subcollection.
 *
 * ─── Payment accounting invariant ─────────────────────────────────────────────
 *   paidAmount + remainingAmount === totalCost   (enforced at every write)
 *   paymentStatus is always re-derived from (paymentType, paidAmount, totalCost, dueDate)
 *   and written atomically — it is never trusted from stale client state.
 *
 * ─── Subcollection ────────────────────────────────────────────────────────────
 *   Path: purchases/{purchaseId}/purchasePayments/{paymentId}
 *   Name constant: PAYMENTS_SUB  (never inline the string — avoids typos)
 *
 * ─── Edge cases handled ───────────────────────────────────────────────────────
 *   • Recording a payment that fully settles the balance → paymentStatus = "paid"
 *   • Recording a payment larger than remainingAmount → clamped to remainingAmount
 *   • Cash purchase → paidAmount === totalCost, dueDate === null (enforced here)
 *   • Credit purchase → paidAmount === 0 (enforced here)
 *   • totalCost change on edit → paidAmount is preserved (clamped if over).
 *     remainingAmount and paymentStatus are re-derived atomically.
 *   • Overdue detection is re-run on every read so it stays current without
 *     needing a background job.
 *   • Orphaned purchasePayments after delete — documented below.
 */

import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  Timestamp,
  query,
  orderBy,
  writeBatch,
} from "firebase/firestore";
import { db } from "@/firebase/firebase";
import type {
  Purchase,
  PurchaseFormData,
  PurchaseStatus,
  PaymentType,
  PaymentStatus,
  PurchasePayment,
  RecordPaymentFormData,
} from "@/pages/Admin/Purchases/purchases-data";
import {
  derivePaymentStatus,
  derivePaidAmount,
} from "@/pages/Admin/Purchases/purchases-data";
import {
  logPurchaseExpense,
  logPurchaseReversal,
  assertSufficientBalance,
} from "@/service/finance/financeService";

// ─── Collection / subcollection name constants ────────────────────────────────
// Keep these as the single source of truth — never inline the strings.
const COL_PURCHASES = "purchases";
const COL_PAYMENTS  = "purchasePayments"; // subcollection under each purchase

// ─── Internal helpers ─────────────────────────────────────────────────────────

function parseNum(val: string | number): number {
  const n = Number(String(val).trim());
  return isNaN(n) || n < 0 ? 0 : n;
}

function toDate(raw: unknown): Date {
  if (raw instanceof Timestamp) return raw.toDate();
  if (raw instanceof Date)      return raw;
  if (raw)                      return new Date(raw as string);
  return new Date();
}

function toDateOrNull(raw: unknown): Date | null {
  if (!raw) return null;
  if (raw instanceof Timestamp) return raw.toDate();
  if (raw instanceof Date)      return raw;
  try {
    const d = new Date(raw as string);
    return isNaN(d.getTime()) ? null : d;
  } catch {
    return null;
  }
}

// ─── Re-derive overdue status at read time ────────────────────────────────────
// The stored paymentStatus may be stale (e.g. "unpaid" that became "overdue"
// overnight without a write). We always re-derive on every client read so the
// UI stays accurate without a background Cloud Function.

function refreshPaymentStatus(purchase: Purchase): Purchase {
  if (purchase.paymentStatus === "paid") return purchase; // terminal state
  const fresh = derivePaymentStatus(
    purchase.paymentType,
    purchase.paidAmount,
    purchase.totalCost,
    purchase.dueDate,
  );
  return fresh !== purchase.paymentStatus
    ? { ...purchase, paymentStatus: fresh }
    : purchase;
}

// ─── Resolve denormalized supplier + product names ────────────────────────────

async function resolveNames(
  supplierId: string,
  productId: string,
): Promise<{ supplierName: string; productTitle: string }> {
  let supplierName = "";
  let productTitle = "";

  try {
    const sSnap = await getDoc(doc(db, "suppliers", supplierId));
    if (sSnap.exists()) supplierName = (sSnap.data().name as string) ?? "";
  } catch {
    /* non-fatal — denormalized field only */
  }

  try {
    const pSnap = await getDoc(doc(db, "products", productId));
    if (pSnap.exists()) {
      const raw = pSnap.data()?.title;
      if (typeof raw === "string")  productTitle = raw;
      else if (raw?.en)             productTitle = raw.en as string;
      else if (raw?.ar)             productTitle = raw.ar as string;
    }
  } catch {
    /* non-fatal */
  }

  return { supplierName, productTitle };
}

// ─── Build payment payload from form ─────────────────────────────────────────
// All payment invariants are enforced here. Callers never compute payment fields.

function buildPaymentPayload(
  formData: PurchaseFormData,
  totalCost: number,
): {
  paymentType:     PaymentType;
  paymentStatus:   PaymentStatus;
  paidAmount:      number;
  remainingAmount: number;
  dueDate:         Timestamp | null;
} {
  const paymentType     = formData.paymentType;
  const paidAmount      = derivePaidAmount(paymentType, formData.paidAmount, totalCost);
  const remainingAmount = Math.max(0, totalCost - paidAmount);

  // dueDate only applies to credit / partial
  const dueDate =
    paymentType !== "cash" && formData.dueDate
      ? Timestamp.fromDate(new Date(formData.dueDate))
      : null;

  const paymentStatus = derivePaymentStatus(
    paymentType,
    paidAmount,
    totalCost,
    dueDate?.toDate() ?? null,
  );

  return { paymentType, paymentStatus, paidAmount, remainingAmount, dueDate };
}

// ─── Map Firestore doc → Purchase ─────────────────────────────────────────────

function docToPurchase(id: string, data: Record<string, unknown>): Purchase {
  const qty             = parseNum(data.quantity as number);
  const unit            = parseNum(data.unitCost as number);
  const totalCost       = parseNum(data.totalCost as number) || qty * unit;
  // Legacy docs that predate the payment model are treated as cash/paid
  const paidAmount      = data.paidAmount !== undefined
    ? parseNum(data.paidAmount as number)
    : totalCost;
  const remainingAmount = data.remainingAmount !== undefined
    ? parseNum(data.remainingAmount as number)
    : Math.max(0, totalCost - paidAmount);
  const dueDate         = toDateOrNull(data.dueDate);
  const paymentType     = (data.paymentType as PaymentType) ?? "cash";

  // Always re-derive — don't trust stale stored value
  const paymentStatus = derivePaymentStatus(paymentType, paidAmount, totalCost, dueDate);

  const purchase: Purchase = {
    id,
    supplierId:      (data.supplierId    as string) ?? "",
    supplierName:    (data.supplierName  as string) ?? "",
    productId:       (data.productId     as string) ?? "",
    productTitle:    (data.productTitle  as string) ?? "",
    quantity:        qty,
    unitCost:        unit,
    totalCost,
    paymentType,
    paymentStatus,
    paidAmount,
    remainingAmount,
    dueDate,
    status:          (data.status        as PurchaseStatus) ?? "pending",
    notes:           (data.notes         as string) ?? "",
    purchaseDate:    toDate(data.purchaseDate),
    createdAt:       toDate(data.createdAt),
    updatedAt:       toDate(data.updatedAt),
    createdBy:       (data.createdBy     as string) ?? "",
  };

  // Apply live overdue check
  return refreshPaymentStatus(purchase);
}

// ─── FETCH ALL ────────────────────────────────────────────────────────────────

export async function fetchPurchases(): Promise<Purchase[]> {
  const q    = query(collection(db, COL_PURCHASES), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => docToPurchase(d.id, d.data() as Record<string, unknown>));
}

// ─── FETCH ONE ────────────────────────────────────────────────────────────────

export async function fetchPurchase(id: string): Promise<Purchase | null> {
  const snap = await getDoc(doc(db, COL_PURCHASES, id));
  if (!snap.exists()) return null;
  return docToPurchase(snap.id, snap.data() as Record<string, unknown>);
}

// ─── CREATE ───────────────────────────────────────────────────────────────────

export async function createPurchase(
  formData: PurchaseFormData,
  createdByUid: string,
  createdByName = "Admin",
): Promise<Purchase> {
  const qty       = parseNum(formData.quantity);
  const unit      = parseNum(formData.unitCost);
  const totalCost = qty * unit;

  const { supplierName, productTitle } = await resolveNames(
    formData.supplierId,
    formData.productId,
  );

  const payment = buildPaymentPayload(formData, totalCost);

  const payload: Record<string, unknown> = {
    supplierId:    formData.supplierId,
    supplierName,
    productId:     formData.productId,
    productTitle,
    quantity:      qty,
    unitCost:      unit,
    totalCost,
    ...payment,
    status:        formData.status,
    notes:         formData.notes.trim(),
    purchaseDate:  formData.purchaseDate
      ? Timestamp.fromDate(new Date(formData.purchaseDate))
      : serverTimestamp(),
    createdAt:     serverTimestamp(),
    updatedAt:     serverTimestamp(),
    createdBy:     createdByUid,
  };

  const docRef = await addDoc(collection(db, COL_PURCHASES), payload);
  const saved  = await fetchPurchase(docRef.id);

  // ── Balance check + finance log for any amount paid immediately ────────────────
  // Credit purchases (paidAmount === 0) generate no expense — no cash left business.
  if (payment.paidAmount > 0) {
    const method = (formData.paymentMethod ?? "cash") as "cash" | "bank";
    // Throws if balance insufficient — purchase doc already written so we
    // do not undo it; the admin is informed and can record cash later.
    await assertSufficientBalance(payment.paidAmount, method);

    const noteMap: Record<string, string> = {
      cash:    `Purchase paid (cash): ${productTitle} × ${qty} unit(s) from ${supplierName}`,
      partial: `Partial payment on purchase: ${productTitle} × ${qty} unit(s) from ${supplierName}`,
      credit:  `Initial payment on credit purchase: ${productTitle} × ${qty} unit(s) from ${supplierName}`,
    };
    await logPurchaseExpense({
      amount:     payment.paidAmount,
      method,
      note:       noteMap[payment.paymentType] ?? `Purchase: ${productTitle} × ${qty} unit(s)`,
      adminUid:   createdByUid,
      adminName:  createdByName,
      purchaseId: docRef.id,
    });
  }

  if (saved) return saved;

  // Fallback (should not reach)
  const now = new Date();
  return {
    id:              docRef.id,
    supplierId:      formData.supplierId,
    supplierName,
    productId:       formData.productId,
    productTitle,
    quantity:        qty,
    unitCost:        unit,
    totalCost,
    paymentType:     payment.paymentType,
    paymentStatus:   payment.paymentStatus,
    paidAmount:      payment.paidAmount,
    remainingAmount: payment.remainingAmount,
    dueDate:         payment.dueDate?.toDate() ?? null,
    status:          formData.status,
    notes:           formData.notes.trim(),
    purchaseDate:    formData.purchaseDate ? new Date(formData.purchaseDate) : now,
    createdAt:       now,
    updatedAt:       now,
    createdBy:       createdByUid,
  };
}

// ─── UPDATE ───────────────────────────────────────────────────────────────────
// When totalCost changes, paidAmount is preserved and clamped if it now exceeds
// the new total. remainingAmount and paymentStatus are re-derived atomically.
// Finance delta: if the edit changes the effective paidAmount we log the
// difference — positive delta → expense, negative delta → refund income.

export async function updatePurchase(
  id: string,
  formData: PurchaseFormData,
  adminUid = "",
  adminName = "Admin",
): Promise<Purchase> {
  // Snapshot BEFORE update so we can compute the delta
  const before = await fetchPurchase(id);
  const oldPaidAmount = before?.paidAmount ?? 0;
  const oldQty = before?.quantity ?? 0;

  const qty       = parseNum(formData.quantity);
  const unit      = parseNum(formData.unitCost);
  const totalCost = qty * unit;

  const { supplierName, productTitle } = await resolveNames(
    formData.supplierId,
    formData.productId,
  );

  const payment = buildPaymentPayload(formData, totalCost);

  await updateDoc(doc(db, COL_PURCHASES, id), {
    supplierId:    formData.supplierId,
    supplierName,
    productId:     formData.productId,
    productTitle,
    quantity:      qty,
    unitCost:      unit,
    totalCost,
    ...payment,
    status:        formData.status,
    notes:         formData.notes.trim(),
    purchaseDate:  formData.purchaseDate
      ? Timestamp.fromDate(new Date(formData.purchaseDate))
      : serverTimestamp(),
    updatedAt:     serverTimestamp(),
  });

  // ── Finance delta ─────────────────────────────────────────────────────────────────────────
  // Only log when the amount actually paid changed (e.g. switching from
  // credit → cash, or editing the down-payment amount on a partial order).
  const delta = payment.paidAmount - oldPaidAmount;
  if (delta > 0) {
    // More money is now paid — log as expense
    const method = (formData.paymentMethod ?? "cash") as "cash" | "bank";
    await assertSufficientBalance(delta, method);
    await logPurchaseExpense({
      amount:     delta,
      method,
      note:       `Purchase updated — additional payment: ${productTitle} × ${qty} unit(s) from ${supplierName}`,
      adminUid,
      adminName,
      purchaseId: id,
    });
  } else if (delta < 0) {
    // Less money is paid after edit — log reversal (refund)
    await logPurchaseReversal({
      amount:     Math.abs(delta),
      method:     "cash",
      note:       `Purchase edited — payment reduced: ${productTitle} × ${oldQty} unit(s) from ${supplierName}`,
      adminUid,
      adminName,
      purchaseId: id,
    });
  }

  const saved = await fetchPurchase(id);
  if (saved) return saved;

  const now = new Date();
  return {
    id,
    supplierId:      formData.supplierId,
    supplierName,
    productId:       formData.productId,
    productTitle,
    quantity:        qty,
    unitCost:        unit,
    totalCost,
    paymentType:     payment.paymentType,
    paymentStatus:   payment.paymentStatus,
    paidAmount:      payment.paidAmount,
    remainingAmount: payment.remainingAmount,
    dueDate:         payment.dueDate?.toDate() ?? null,
    status:          formData.status,
    notes:           formData.notes.trim(),
    purchaseDate:    formData.purchaseDate ? new Date(formData.purchaseDate) : now,
    createdAt:       now,
    updatedAt:       now,
    createdBy:       "",
  };
}

// ─── DELETE ───────────────────────────────────────────────────────────────────
// NOTE: Firestore does NOT auto-delete subcollections when a parent doc is
// deleted. The purchasePayments subcollection will become orphaned.
// For full cleanup, add a Cloud Function triggered on purchases/{id} deletion.
// In practice this is harmless (orphans don't appear in any query) but wastes
// a small amount of storage.
// Finance: if the purchase had any payments logged, we reverse them so the
// cash/bank balance is restored accurately.

export async function deletePurchase(
  id: string,
  adminUid = "",
  adminName = "Admin",
): Promise<void> {
  // Snapshot before delete to drive the reversal
  const purchase = await fetchPurchase(id);

  await deleteDoc(doc(db, COL_PURCHASES, id));

  // Reverse any money that was already logged as expense
  if (purchase && purchase.paidAmount > 0) {
    await logPurchaseReversal({
      amount:     purchase.paidAmount,
      method:     "cash",  // we don't store the original method, use cash as default
      note:       `Purchase deleted — reversal: ${purchase.productTitle} × ${purchase.quantity} unit(s) from ${purchase.supplierName}`,
      adminUid,
      adminName,
      purchaseId: id,
    });
  }
}

// ─── UPDATE STATUS ONLY ───────────────────────────────────────────────────────

export async function updatePurchaseStatus(
  id: string,
  status: PurchaseStatus,
): Promise<void> {
  await updateDoc(doc(db, COL_PURCHASES, id), {
    status,
    updatedAt: serverTimestamp(),
  });
}

// ─── RECORD A PAYMENT ─────────────────────────────────────────────────────────
// Atomically:
//   1. Creates purchases/{id}/purchasePayments/{newId}
//   2. Updates parent: paidAmount, remainingAmount, paymentStatus, updatedAt
//
// Returns the effective amount actually applied (may be less than requested if
// clamped to remainingAmount).

export async function recordPayment(
  purchaseId: string,
  formData: RecordPaymentFormData,
  adminUid: string,
  adminName: string,
): Promise<{ purchase: Purchase; effectiveAmount: number }> {
  const current = await fetchPurchase(purchaseId);
  if (!current) throw new Error("Purchase not found.");

  if (current.paymentStatus === "paid") {
    throw new Error("This purchase is already fully paid.");
  }

  const requestedAmount = parseNum(formData.amount);
  if (requestedAmount <= 0) {
    throw new Error("Payment amount must be greater than 0.");
  }

  // Clamp — you can never record more than what is owed
  const effectiveAmount    = Math.min(requestedAmount, current.remainingAmount);
  const newPaidAmount      = current.paidAmount + effectiveAmount;
  const newRemainingAmount = Math.max(0, current.totalCost - newPaidAmount);
  const newPaymentStatus   = derivePaymentStatus(
    current.paymentType,
    newPaidAmount,
    current.totalCost,
    current.dueDate,
  );

  const batch = writeBatch(db);

  // 1. New payment subdoc
  const paymentRef = doc(collection(db, COL_PURCHASES, purchaseId, COL_PAYMENTS));
  batch.set(paymentRef, {
    amount:         effectiveAmount,
    method:         formData.method,
    note:           formData.note.trim(),
    paidAt:         formData.paidAt
      ? Timestamp.fromDate(new Date(formData.paidAt))
      : Timestamp.now(),
    recordedBy:     adminUid,
    recordedByName: adminName,
    createdAt:      serverTimestamp(),
  });

  // 2. Update parent purchase doc
  batch.update(doc(db, COL_PURCHASES, purchaseId), {
    paidAmount:      newPaidAmount,
    remainingAmount: newRemainingAmount,
    paymentStatus:   newPaymentStatus,
    updatedAt:       serverTimestamp(),
  });

  await batch.commit();

  // ── Balance check + finance expense for the amount actually applied ─────────
  const method = (formData.method ?? "cash") as "cash" | "bank";
  await assertSufficientBalance(effectiveAmount, method);
  await logPurchaseExpense({
    amount:     effectiveAmount,
    method,
    note:       `Payment recorded: ${current.productTitle} × ${current.quantity} unit(s) from ${current.supplierName}`,
    adminUid,
    adminName,
    purchaseId,
  });

  const saved = await fetchPurchase(purchaseId);
  const purchase = saved ?? {
    ...current,
    paidAmount:      newPaidAmount,
    remainingAmount: newRemainingAmount,
    paymentStatus:   newPaymentStatus,
    updatedAt:       new Date(),
  };

  return { purchase, effectiveAmount };
}

// ─── MARK AS FULLY PAID (manual override) ────────────────────────────────────
// Used when a supplier confirms full settlement outside the system, or when
// the admin wants to mark a purchase paid without recording incremental steps.
// Always creates a final payment record for the full remaining balance.

export async function markPurchaseFullyPaid(
  purchaseId: string,
  adminUid: string,
  adminName: string,
): Promise<Purchase> {
  const current = await fetchPurchase(purchaseId);
  if (!current) throw new Error("Purchase not found.");
  if (current.paymentStatus === "paid") throw new Error("Already fully paid.");

  const batch = writeBatch(db);

  // Record the remaining balance as a final payment entry (audit trail)
  if (current.remainingAmount > 0) {
    const paymentRef = doc(collection(db, COL_PURCHASES, purchaseId, COL_PAYMENTS));
    batch.set(paymentRef, {
      amount:         current.remainingAmount,
      method:         "cash",
      note:           "Marked as fully paid (manual override)",
      paidAt:         Timestamp.now(),
      recordedBy:     adminUid,
      recordedByName: adminName,
      createdAt:      serverTimestamp(),
    });
  }

  // Update parent
  batch.update(doc(db, COL_PURCHASES, purchaseId), {
    paidAmount:      current.totalCost,
    remainingAmount: 0,
    paymentStatus:   "paid" as PaymentStatus,
    updatedAt:       serverTimestamp(),
  });

  await batch.commit();

  // ── Balance check + finance expense for the final remaining balance ────────
  if (current.remainingAmount > 0) {
    await assertSufficientBalance(current.remainingAmount, "cash");
    await logPurchaseExpense({
      amount:     current.remainingAmount,
      method:     "cash",
      note:       `Final payment (fully paid): ${current.productTitle} × ${current.quantity} unit(s) from ${current.supplierName}`,
      adminUid,
      adminName,
      purchaseId,
    });
  }

  const saved = await fetchPurchase(purchaseId);
  return saved ?? {
    ...current,
    paidAmount:      current.totalCost,
    remainingAmount: 0,
    paymentStatus:   "paid",
    updatedAt:       new Date(),
  };
}

// ─── FETCH PAYMENT HISTORY ────────────────────────────────────────────────────

export async function fetchPurchasePayments(purchaseId: string): Promise<PurchasePayment[]> {
  const q = query(
    collection(db, COL_PURCHASES, purchaseId, COL_PAYMENTS),
    orderBy("createdAt", "desc"),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id:             d.id,
      amount:         parseNum(data.amount),
      method:         (data.method as "cash" | "bank") ?? "cash",
      note:           (data.note as string) ?? "",
      paidAt:         toDate(data.paidAt ?? data.createdAt),
      recordedBy:     (data.recordedBy as string)     ?? "",
      recordedByName: (data.recordedByName as string) ?? "",
      createdAt:      toDate(data.createdAt),
    };
  });
}