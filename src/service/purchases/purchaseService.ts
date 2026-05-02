/**
 * src/service/purchases/purchaseService.ts
 *
 * Firestore CRUD for the "purchases" collection.
 * Denormalizes supplierName + productTitle at write-time so list reads are
 * O(1) with no joins. If names change the doc keeps the snapshot value —
 * acceptable for purchase order history.
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
} from "firebase/firestore";
import { db } from "@/firebase/firebase";
import type { Purchase, PurchaseFormData, PurchaseStatus } from "@/pages/Admin/Purchases/purchases-data";

const COLLECTION = "purchases";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function docToPurchase(id: string, data: Record<string, any>): Purchase {
  const qty  = data.quantity ?? 0;
  const unit = data.unitCost ?? 0;
  return {
    id,
    supplierId:   data.supplierId   ?? "",
    supplierName: data.supplierName ?? "",
    productId:    data.productId    ?? "",
    productTitle: data.productTitle ?? "",
    quantity:     qty,
    unitCost:     unit,
    totalCost:    data.totalCost ?? qty * unit,
    status:       (data.status as PurchaseStatus) ?? "pending",
    notes:        data.notes ?? "",
    purchaseDate:
      data.purchaseDate instanceof Timestamp
        ? data.purchaseDate.toDate()
        : data.purchaseDate
          ? new Date(data.purchaseDate)
          : new Date(),
    createdAt:
      data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(),
    updatedAt:
      data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : new Date(),
    createdBy: data.createdBy ?? "",
  };
}

// Resolve human-readable names at write time
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
      if (typeof raw === "string") productTitle = raw;
      else if (raw?.en) productTitle = raw.en;
      else if (raw?.ar) productTitle = raw.ar;
    }
  } catch { /* non-fatal */ }

  return { supplierName, productTitle };
}

function parseNum(val: string): number {
  const n = Number(String(val).trim());
  return isNaN(n) ? 0 : n;
}

// ─── FETCH ALL ────────────────────────────────────────────────────────────────

export async function fetchPurchases(): Promise<Purchase[]> {
  const q = query(collection(db, COLLECTION), orderBy("createdAt", "desc"));
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
  const qty  = parseNum(formData.quantity);
  const unit = parseNum(formData.unitCost);
  const { supplierName, productTitle } = await resolveNames(
    formData.supplierId,
    formData.productId,
  );

  const payload = {
    supplierId:   formData.supplierId,
    supplierName,
    productId:    formData.productId,
    productTitle,
    quantity:     qty,
    unitCost:     unit,
    totalCost:    qty * unit,
    status:       formData.status,
    notes:        formData.notes.trim(),
    purchaseDate: formData.purchaseDate
      ? Timestamp.fromDate(new Date(formData.purchaseDate))
      : serverTimestamp(),
    createdAt:    serverTimestamp(),
    updatedAt:    serverTimestamp(),
    createdBy:    createdByUid,
  };

  const docRef = await addDoc(collection(db, COLLECTION), payload);
  const saved  = await fetchPurchase(docRef.id);
  if (saved) return saved;

  const now = new Date();
  return {
    id:           docRef.id,
    supplierId:   formData.supplierId,
    supplierName,
    productId:    formData.productId,
    productTitle,
    quantity:     qty,
    unitCost:     unit,
    totalCost:    qty * unit,
    status:       formData.status,
    notes:        formData.notes.trim(),
    purchaseDate: formData.purchaseDate ? new Date(formData.purchaseDate) : now,
    createdAt:    now,
    updatedAt:    now,
    createdBy:    createdByUid,
  };
}

// ─── UPDATE ───────────────────────────────────────────────────────────────────

export async function updatePurchase(
  id: string,
  formData: PurchaseFormData,
): Promise<Purchase> {
  const qty  = parseNum(formData.quantity);
  const unit = parseNum(formData.unitCost);
  const { supplierName, productTitle } = await resolveNames(
    formData.supplierId,
    formData.productId,
  );

  await updateDoc(doc(db, COLLECTION, id), {
    supplierId:   formData.supplierId,
    supplierName,
    productId:    formData.productId,
    productTitle,
    quantity:     qty,
    unitCost:     unit,
    totalCost:    qty * unit,
    status:       formData.status,
    notes:        formData.notes.trim(),
    purchaseDate: formData.purchaseDate
      ? Timestamp.fromDate(new Date(formData.purchaseDate))
      : serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  const saved = await fetchPurchase(id);
  if (saved) return saved;

  const now = new Date();
  return {
    id,
    supplierId:   formData.supplierId,
    supplierName,
    productId:    formData.productId,
    productTitle,
    quantity:     qty,
    unitCost:     unit,
    totalCost:    qty * unit,
    status:       formData.status,
    notes:        formData.notes.trim(),
    purchaseDate: formData.purchaseDate ? new Date(formData.purchaseDate) : now,
    createdAt:    now,
    updatedAt:    now,
    createdBy:    "",
  };
}

// ─── DELETE ───────────────────────────────────────────────────────────────────

export async function deletePurchase(id: string): Promise<void> {
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