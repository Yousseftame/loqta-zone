// src/service/vouchers/voucherService.ts
//
// Client-side Firestore service for vouchers (admin CRUD only).
// Voucher APPLICATION is done exclusively via the applyVoucher Cloud Function —
// never from the client directly.

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
  limit,
  startAfter,
  type QueryDocumentSnapshot,
} from "firebase/firestore";
import { db } from "@/firebase/firebase";
import type {
  Voucher,
  VoucherFormData,
  VoucherUsage,
} from "@/pages/Admin/Voucher/voucher-data";

const COLLECTION = "vouchers";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function docToVoucher(id: string, data: Record<string, any>): Voucher {
  // Support legacy docs that still have the old "join" / "discount" type names
  let type = data.type ?? "entry_free";
  if (type === "join")     type = "entry_free";
  if (type === "discount") type = "final_discount";

  // Support legacy docs that still have applicableProducts
  const applicableAuctions: string[] = Array.isArray(data.applicableAuctions)
    ? data.applicableAuctions
    : Array.isArray(data.applicableProducts)
      ? data.applicableProducts
      : [];

  return {
    id,
    code:               data.code               ?? "",
    type,
    discountAmount:     data.discountAmount      ?? null,
    applicableAuctions,
    maxUses:            data.maxUses             ?? 1,
    // New field — default to usedBy.length for legacy docs that still have it
    usageCount:         data.usageCount          ?? (Array.isArray(data.usedBy) ? data.usedBy.length : 0),
    isActive:           data.isActive            ?? true,
    expiryDate:
      data.expiryDate instanceof Timestamp
        ? data.expiryDate.toDate()
        : new Date(data.expiryDate ?? Date.now()),
    createdAt:
      data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(),
    createdBy: data.createdBy ?? "",
  };
}

function formToPayload(formData: VoucherFormData, createdBy = "") {
  const needsAmount =
    formData.type === "entry_discount" || formData.type === "final_discount";

  return {
    code:               formData.code.trim().toUpperCase(),
    type:               formData.type,
    discountAmount:
      needsAmount && formData.discountAmount
        ? Number(formData.discountAmount)
        : null,
    applicableAuctions: formData.applicableAuctions,
    maxUses:            Number(formData.maxUses),
    isActive:           formData.isActive,
    expiryDate:         Timestamp.fromDate(new Date(formData.expiryDate)),
    ...(createdBy && { createdBy }),
  };
}

// ─── FETCH ALL (with optional pagination) ─────────────────────────────────────

export async function fetchVouchers(
  pageSize = 50,
  after?: QueryDocumentSnapshot,
): Promise<{ vouchers: Voucher[]; lastDoc: QueryDocumentSnapshot | null }> {
  let q = query(
    collection(db, COLLECTION),
    orderBy("createdAt", "desc"),
    limit(pageSize),
  );
  if (after) q = query(q, startAfter(after));

  const snap = await getDocs(q);
  return {
    vouchers: snap.docs.map((d) => docToVoucher(d.id, d.data())),
    lastDoc:  snap.docs[snap.docs.length - 1] ?? null,
  };
}

// ─── FETCH ONE ────────────────────────────────────────────────────────────────

export async function fetchVoucher(id: string): Promise<Voucher | null> {
  const snap = await getDoc(doc(db, COLLECTION, id));
  if (!snap.exists()) return null;
  return docToVoucher(snap.id, snap.data());
}

// ─── FETCH USAGES (subcollection — for admin view) ───────────────────────────
// Returns who used this voucher and on which auction.
// Paginated — never loads the entire subcollection at once.

export async function fetchVoucherUsages(
  voucherId: string,
  pageSize = 20,
  after?: QueryDocumentSnapshot,
): Promise<{ usages: VoucherUsage[]; lastDoc: QueryDocumentSnapshot | null }> {
  let q = query(
    collection(db, COLLECTION, voucherId, "usages"),
    orderBy("usedAt", "desc"),
    limit(pageSize),
  );
  if (after) q = query(q, startAfter(after));

  const snap = await getDocs(q);
  const usages: VoucherUsage[] = snap.docs.map((d) => {
    const data = d.data();
    return {
      userId:          d.id,
      auctionId:       data.auctionId       ?? "",
      voucherCode:     data.voucherCode      ?? "",
      discountApplied: data.discountApplied  ?? 0,
      effectiveFee:    data.effectiveFee     ?? 0,
      type:            data.type             ?? "entry_free",
      usedAt:
        data.usedAt instanceof Timestamp
          ? data.usedAt.toDate()
          : new Date(data.usedAt ?? Date.now()),
    };
  });

  return {
    usages,
    lastDoc: snap.docs[snap.docs.length - 1] ?? null,
  };
}

// ─── CREATE ───────────────────────────────────────────────────────────────────

export async function createVoucher(
  formData: VoucherFormData,
  createdByUid: string,
): Promise<Voucher> {
  const payload = {
    ...formToPayload(formData, createdByUid),
    usageCount: 0,           // ← new atomic counter, starts at 0
    createdAt:  serverTimestamp(),
    updatedAt:  serverTimestamp(),
  };

  const docRef = await addDoc(collection(db, COLLECTION), payload);
  const saved  = await fetchVoucher(docRef.id);
  if (saved) return saved;

  // Fallback
  const needsAmount =
    formData.type === "entry_discount" || formData.type === "final_discount";
  const now = new Date();
  return {
    id:                 docRef.id,
    code:               formData.code.trim().toUpperCase(),
    type:               formData.type,
    discountAmount:
      needsAmount && formData.discountAmount ? Number(formData.discountAmount) : null,
    applicableAuctions: formData.applicableAuctions,
    maxUses:            Number(formData.maxUses),
    usageCount:         0,
    isActive:           formData.isActive,
    expiryDate:         new Date(formData.expiryDate),
    createdAt:          now,
    createdBy:          createdByUid,
  };
}

// ─── UPDATE ───────────────────────────────────────────────────────────────────
// NOTE: usageCount is NOT in the form — it's managed exclusively by the
// Cloud Function. Passing it here would overwrite the atomic counter.

export async function updateVoucher(
  id:       string,
  formData: VoucherFormData,
): Promise<Voucher> {
  const payload = {
    ...formToPayload(formData),
    updatedAt: serverTimestamp(),
    // usageCount intentionally omitted
  };

  await updateDoc(doc(db, COLLECTION, id), payload);
  const saved = await fetchVoucher(id);
  if (saved) return saved;

  const needsAmount =
    formData.type === "entry_discount" || formData.type === "final_discount";
  const now = new Date();
  return {
    id,
    code:               formData.code.trim().toUpperCase(),
    type:               formData.type,
    discountAmount:
      needsAmount && formData.discountAmount ? Number(formData.discountAmount) : null,
    applicableAuctions: formData.applicableAuctions,
    maxUses:            Number(formData.maxUses),
    usageCount:         0, // will be refreshed on re-fetch
    isActive:           formData.isActive,
    expiryDate:         new Date(formData.expiryDate),
    createdAt:          new Date(),
    createdBy:          "",
  };
}

// ─── DELETE ───────────────────────────────────────────────────────────────────
// Note: Firestore does NOT auto-delete subcollections when you delete a parent doc.
// For production, use a Cloud Function (triggered on voucher deletion) to clean up
// the usages subcollection. For now, the orphaned subcollection is harmless.

export async function deleteVoucher(id: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTION, id));
}

// ─── TOGGLE ACTIVE ────────────────────────────────────────────────────────────

export async function toggleVoucherActive(
  id:       string,
  isActive: boolean,
): Promise<void> {
  await updateDoc(doc(db, COLLECTION, id), {
    isActive,
    updatedAt: serverTimestamp(),
  });
}