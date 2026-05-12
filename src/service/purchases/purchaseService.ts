/**
 * src/service/purchases/purchaseService.ts
 *
 * Firestore CRUD for the "purchases" collection + "purchasePayments" subcollection.
 *
 * ─── Payment accounting invariant ─────────────────────────────────────────────
 *   paidAmount + remainingAmount === totalCost   (enforced at every write)
 *   paymentStatus is always re-derived from (paidAmount, totalCost, dueDate)
 *   and written atomically with every change — it is never trusted from stale
 *   client state.
 *
 * ─── Payment recordings ───────────────────────────────────────────────────────
 *   Partial payments against an existing credit/partial purchase are stored as
 *   subcollection docs under purchases/{purchaseId}/purchasePayments/{id}.
 *   The parent doc's paidAmount / remainingAmount / paymentStatus are updated
 *   atomically in a writeBatch alongside the new subcollection doc.
 *
 * ─── Edge cases handled ───────────────────────────────────────────────────────
 *   • Recording a payment that fully settles the balance → paymentStatus = "paid"
 *   • Recording a payment larger than remainingAmount → clamped to remainingAmount
 *   • Cash purchase → paidAmount === totalCost, dueDate === null (enforced here)
 *   • Credit purchase → paidAmount === 0 (enforced here)
 *   • totalCost change on edit → paidAmount is preserved; remainingAmount and
 *     paymentStatus are re-derived. If paidAmount > newTotalCost the
 *     paidAmount is clamped to newTotalCost (overpaid → treated as paid).
 *   • Overdue detection is re-run on every read/write so it stays current.
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

const COLLECTION          = "purchases";
const PAYMENTS_COLLECTION = "purchasePayments";

// ─── Internal helpers ─────────────────────────────────────────────────────────

function parseNum(val: string): number {
  const n = Number(String(val).trim());
  return isNaN(n) ? 0 : n;
}

function toDate(raw: any): Date {
  if (raw instanceof Timestamp) return raw.toDate();
  if (raw instanceof Date)      return raw;
  if (raw)                      return new Date(raw);
  return new Date();
}

function toDateOrNull(raw: any): Date | null {
  if (!raw) return null;
  if (raw instanceof Timestamp) return raw.toDate();
  if (raw instanceof Date)      return raw;
  try { const d = new Date(raw); return isNaN(d.getTime()) ? null : d; }
  catch { return null; }
}

// ─── Resolve overdue status at read time ──────────────────────────────────────
// The stored paymentStatus may be stale (e.g. "unpaid" that became "overdue"
// overnight). We re-derive it from the live dueDate on every read.

function refreshPaymentStatus(purchase: Purchase): Purchase {
  if (purchase.paymentStatus === "paid") return purchase;  // paid = terminal
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

// ─── Resolve supplier + product names ────────────────────────────────────────

async function resolveNames(
  supplierId: string,
  productId: string,
): Promise<{ supplierName: string; productTitle: string }> {
  let supplierName = "";
  let productTitle = "";
  try {
    const sSnap = await getDoc(doc(db, "suppliers", supplierId));
    if (sSnap.exists()) supplierName = sSnap.data().name ?? "";
  } catch { /* non-fatal */ }
  try {
    const pSnap = await getDoc(doc(db, "products", productId));
    if (pSnap.exists()) {
      const raw = pSnap.data()?.title;
      if (typeof raw === "string")   productTitle = raw;
      else if (raw?.en)              productTitle = raw.en;
      else if (raw?.ar)              productTitle = raw.ar;
    }
  } catch { /* non-fatal */ }
  return { supplierName, productTitle };
}

// ─── Doc → Purchase ───────────────────────────────────────────────────────────

function docToPurchase(id: string, data: Record<string, any>): Purchase {
  const qty          = data.quantity   ?? 0;
  const unit         = data.unitCost   ?? 0;
  const totalCost    = data.totalCost  ?? qty * unit;
  const paidAmount   = data.paidAmount   ?? totalCost;   // legacy docs are assumed "cash/paid"
  const remainingAmount = data.remainingAmount ?? Math.max(0, totalCost - paidAmount);
  const dueDate      = toDateOrNull(data.dueDate);
  const paymentType  = (data.paymentType  as PaymentType)  ?? "cash";
  const paymentStatus = derivePaymentStatus(paymentType, paidAmount, totalCost, dueDate);

  return refreshPaymentStatus({
    id,
    supplierId:    data.supplierId    ?? "",
    supplierName:  data.supplierName  ?? "",
    productId:     data.productId     ?? "",
    productTitle:  data.productTitle  ?? "",
    quantity:      qty,
    unitCost:      unit,
    totalCost,
    paymentType,
    paymentStatus,
    paidAmount,
    remainingAmount,
    dueDate,
    status:        (data.status as PurchaseStatus) ?? "pending",
    notes:         data.notes        ?? "",
    purchaseDate:  toDate(data.purchaseDate),
    createdAt:     toDate(data.createdAt),
    updatedAt:     toDate(data.updatedAt),
    createdBy:     data.createdBy    ?? "",
  });
}

// ─── Build Firestore payload from form ────────────────────────────────────────
// All invariants are enforced here — callers never compute payment fields.

function buildPaymentPayload(
  formData: PurchaseFormData,
  totalCost: number,
): {
  paymentType: PaymentType;
  paymentStatus: PaymentStatus;
  paidAmount: number;
  remainingAmount: number;
  dueDate: Timestamp | null;
} {
  const paymentType  = formData.paymentType;
  const paidAmount   = derivePaidAmount(paymentType, formData.paidAmount, totalCost);
  const remainingAmount = Math.max(0, totalCost - paidAmount);
  const dueDate      = (paymentType !== "cash" && formData.dueDate)
    ? Timestamp.fromDate(new Date(formData.dueDate))
    : null;
  const dueDateJs    = dueDate ? dueDate.toDate() : null;
  const paymentStatus = derivePaymentStatus(paymentType, paidAmount, totalCost, dueDateJs);

  return { paymentType, paymentStatus, paidAmount, remainingAmount, dueDate };
}

// ─── FETCH ALL ────────────────────────────────────────────────────────────────

export async function fetchPurchases(): Promise<Purchase[]> {
  const q    = query(collection(db, COLLECTION), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => docToPurchase(d.id, d.data()));
}

// ─── FETCH ONE ────────────────────────────────────────────────────────────────

export async function fetchPurchase(id: string): Promise<Purchase | null> {
  const snap = await getDoc(doc(db, COLLECTION, id));
  if (!snap.exists()) return null;
  return docToPurchase(snap.id, snap.data());
}

// ─── CREATE ───────────────────────────────────────────────────────────────────

export async function createPurchase(
  formData: PurchaseFormData,
  createdByUid: string,
): Promise<Purchase> {
  const qty      = parseNum(formData.quantity);
  const unit     = parseNum(formData.unitCost);
  const totalCost = qty * unit;

  const { supplierName, productTitle } = await resolveNames(
    formData.supplierId,
    formData.productId,
  );

  const payment = buildPaymentPayload(formData, totalCost);

  const payload: Record<string, any> = {
    supplierId:       formData.supplierId,
    supplierName,
    productId:        formData.productId,
    productTitle,
    quantity:         qty,
    unitCost:         unit,
    totalCost,
    ...payment,
    status:           formData.status,
    notes:            formData.notes.trim(),
    purchaseDate:     formData.purchaseDate
      ? Timestamp.fromDate(new Date(formData.purchaseDate))
      : serverTimestamp(),
    createdAt:        serverTimestamp(),
    updatedAt:        serverTimestamp(),
    createdBy:        createdByUid,
  };

  const docRef = await addDoc(collection(db, COLLECTION), payload);
  const saved  = await fetchPurchase(docRef.id);
  if (saved) return saved;

  // Fallback (should not reach here)
  const now = new Date();
  return {
    id:            docRef.id,
    supplierId:    formData.supplierId,
    supplierName,
    productId:     formData.productId,
    productTitle,
    quantity:      qty,
    unitCost:      unit,
    totalCost,
    paymentType:   payment.paymentType,
    paymentStatus: payment.paymentStatus,
    paidAmount:    payment.paidAmount,
    remainingAmount: payment.remainingAmount,
    dueDate:       payment.dueDate?.toDate() ?? null,
    status:        formData.status,
    notes:         formData.notes.trim(),
    purchaseDate:  formData.purchaseDate ? new Date(formData.purchaseDate) : now,
    createdAt:     now,
    updatedAt:     now,
    createdBy:     createdByUid,
  };
}

// ─── UPDATE ───────────────────────────────────────────────────────────────────
// When totalCost changes, paidAmount is preserved (clamped if over).
// remainingAmount and paymentStatus are re-derived atomically.

export async function updatePurchase(
  id: string,
  formData: PurchaseFormData,
): Promise<Purchase> {
  const qty       = parseNum(formData.quantity);
  const unit      = parseNum(formData.unitCost);
  const totalCost = qty * unit;

  const { supplierName, productTitle } = await resolveNames(
    formData.supplierId,
    formData.productId,
  );

  const payment = buildPaymentPayload(formData, totalCost);

  await updateDoc(doc(db, COLLECTION, id), {
    supplierId:       formData.supplierId,
    supplierName,
    productId:        formData.productId,
    productTitle,
    quantity:         qty,
    unitCost:         unit,
    totalCost,
    ...payment,
    status:           formData.status,
    notes:            formData.notes.trim(),
    purchaseDate:     formData.purchaseDate
      ? Timestamp.fromDate(new Date(formData.purchaseDate))
      : serverTimestamp(),
    updatedAt:        serverTimestamp(),
  });

  const saved = await fetchPurchase(id);
  if (saved) return saved;

  const now = new Date();
  return {
    id,
    supplierId:    formData.supplierId,
    supplierName,
    productId:     formData.productId,
    productTitle,
    quantity:      qty,
    unitCost:      unit,
    totalCost,
    paymentType:   payment.paymentType,
    paymentStatus: payment.paymentStatus,
    paidAmount:    payment.paidAmount,
    remainingAmount: payment.remainingAmount,
    dueDate:       payment.dueDate?.toDate() ?? null,
    status:        formData.status,
    notes:         formData.notes.trim(),
    purchaseDate:  formData.purchaseDate ? new Date(formData.purchaseDate) : now,
    createdAt:     now,
    updatedAt:     now,
    createdBy:     "",
  };
}

// ─── DELETE ───────────────────────────────────────────────────────────────────

export async function deletePurchase(id: string): Promise<void> {
  // Note: Firestore does NOT auto-delete subcollections.
  // The purchasePayments subcollection is small and harmless as an orphan.
  // For production, a Cloud Function trigger on purchase deletion would clean it up.
  await deleteDoc(doc(db, COLLECTION, id));
}

// ─── UPDATE STATUS ONLY ───────────────────────────────────────────────────────

export async function updatePurchaseStatus(
  id: string,
  status: PurchaseStatus,
): Promise<void> {
  await updateDoc(doc(db, COLLECTION, id), {
    status,
    updatedAt: serverTimestamp(),
  });
}

// ─── RECORD A PAYMENT against an existing credit/partial purchase ─────────────
//
// Atomically:
//   1. Creates a new doc in purchases/{id}/purchasePayments
//   2. Updates the parent purchase: paidAmount, remainingAmount, paymentStatus
//
// Returns the updated Purchase.

export async function recordPayment(
  purchaseId: string,
  formData: RecordPaymentFormData,
  adminUid: string,
  adminName: string,
): Promise<Purchase> {
  // Re-read the current purchase state inside the batch preparation
  const current = await fetchPurchase(purchaseId);
  if (!current) throw new Error("Purchase not found.");

  if (current.paymentStatus === "paid") {
    throw new Error("This purchase is already fully paid.");
  }

  const amount = parseNum(formData.amount);
  if (!amount || amount <= 0) throw new Error("Payment amount must be greater than 0.");

  // Clamp to remaining balance — can't overpay
  const effectiveAmount   = Math.min(amount, current.remainingAmount);
  const newPaidAmount     = current.paidAmount + effectiveAmount;
  const newRemainingAmount = Math.max(0, current.totalCost - newPaidAmount);
  const newPaymentStatus  = derivePaymentStatus(
    current.paymentType,
    newPaidAmount,
    current.totalCost,
    current.dueDate,
  );

  const batch   = writeBatch(db);
  const now     = serverTimestamp();

  // 1. New payment doc in subcollection
  const paymentRef = doc(collection(db, COLLECTION, purchaseId, PAYMENTS_COLLECTION));
  batch.set(paymentRef, {
    amount:          effectiveAmount,
    method:          formData.method,
    note:            formData.note.trim(),
    paidAt:          formData.paidAt
      ? Timestamp.fromDate(new Date(formData.paidAt))
      : now,
    recordedBy:      adminUid,
    recordedByName:  adminName,
    createdAt:       now,
  });

  // 2. Update parent purchase
  batch.update(doc(db, COLLECTION, purchaseId), {
    paidAmount:       newPaidAmount,
    remainingAmount:  newRemainingAmount,
    paymentStatus:    newPaymentStatus,
    updatedAt:        now,
  });

  await batch.commit();

  const saved = await fetchPurchase(purchaseId);
  if (saved) return saved;

  // Fallback
  return {
    ...current,
    paidAmount:      newPaidAmount,
    remainingAmount: newRemainingAmount,
    paymentStatus:   newPaymentStatus,
    updatedAt:       new Date(),
  };
}

// ─── FETCH PAYMENT HISTORY for a purchase ────────────────────────────────────

export async function fetchPurchasePayments(purchaseId: string): Promise<PurchasePayment[]> {
  const q    = query(
    collection(db, COLLECTION, purchaseId, PAYMENTS_COLLECTION),
    orderBy("createdAt", "desc"),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id:             d.id,
      amount:         data.amount         ?? 0,
      method:         data.method         ?? "cash",
      note:           data.note           ?? "",
      paidAt:         toDate(data.paidAt ?? data.createdAt),
      recordedBy:     data.recordedBy     ?? "",
      recordedByName: data.recordedByName ?? "",
    };
  });
}

// ─── MARK AS FULLY PAID (manual override) ─────────────────────────────────────
// Used when the supplier confirms full settlement outside the system.

export async function markPurchaseFullyPaid(
  purchaseId: string,
  adminUid: string,
  adminName: string,
): Promise<Purchase> {
  const current = await fetchPurchase(purchaseId);
  if (!current) throw new Error("Purchase not found.");
  if (current.paymentStatus === "paid") throw new Error("Already fully paid.");

  const batch = writeBatch(db);
  const now   = serverTimestamp();

  // Record the remaining amount as a final payment
  if (current.remainingAmount > 0) {
    const paymentRef = doc(collection(db, COLLECTION, purchaseId, PAYMENTS_COLLECTION));
    batch.set(paymentRef, {
      amount:          current.remainingAmount,
      method:          "cash",
      note:            "Marked as fully paid (manual override)",
      paidAt:          now,
      recordedBy:      adminUid,
      recordedByName:  adminName,
      createdAt:       now,
    });
  }

  batch.update(doc(db, COLLECTION, purchaseId), {
    paidAmount:      current.totalCost,
    remainingAmount: 0,
    paymentStatus:   "paid" as PaymentStatus,
    updatedAt:       now,
  });

  await batch.commit();

  const saved = await fetchPurchase(purchaseId);
  return saved ?? { ...current, paidAmount: current.totalCost, remainingAmount: 0, paymentStatus: "paid" };
}