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
import type { Voucher, VoucherFormData, UsedByEntry } from "@/pages/Admin/Voucher/voucher-data";

const COLLECTION = "vouchers";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function docToVoucher(id: string, data: Record<string, any>): Voucher {
  // Normalize usedBy — each entry may be a plain object with a Timestamp usedAt
  const usedBy: UsedByEntry[] = Array.isArray(data.usedBy)
    ? data.usedBy.map((entry: any) => ({
        userId: entry.userId ?? "",
        userName: entry.userName ?? "Unknown",
        usedAt:
          entry.usedAt instanceof Timestamp
            ? entry.usedAt.toDate()
            : new Date(entry.usedAt ?? Date.now()),
      }))
    : [];

  return {
    id,
    code: data.code ?? "",
    type: data.type ?? "join",
    discountAmount: data.discountAmount ?? null,
    applicableProducts: Array.isArray(data.applicableProducts)
      ? data.applicableProducts
      : [],
    maxUses: data.maxUses ?? 1,
    usedBy,
    isActive: data.isActive ?? true,
    expiryDate:
      data.expiryDate instanceof Timestamp
        ? data.expiryDate.toDate()
        : new Date(data.expiryDate ?? Date.now()),
    createdAt:
      data.createdAt instanceof Timestamp
        ? data.createdAt.toDate()
        : new Date(),
    updatedAt:
      data.updatedAt instanceof Timestamp
        ? data.updatedAt.toDate()
        : new Date(),
    createdBy: data.createdBy ?? "",
  };
}

function formToPayload(formData: VoucherFormData, createdBy = "") {
  return {
    code: formData.code.trim().toUpperCase(),
    type: formData.type,
    discountAmount:
      formData.type === "discount" && formData.discountAmount
        ? Number(formData.discountAmount)
        : null,
    applicableProducts: formData.applicableProducts,
    maxUses: Number(formData.maxUses),
    isActive: formData.isActive,
    expiryDate: Timestamp.fromDate(new Date(formData.expiryDate)),
    ...(createdBy && { createdBy }),
  };
}

// ─── FETCH ALL ────────────────────────────────────────────────────────────────

export async function fetchVouchers(): Promise<Voucher[]> {
    const q = query(
      collection(db, COLLECTION),
      orderBy("createdAt", "desc")
    );

    const snap = await getDocs(q);
  return snap.docs.map((d) => docToVoucher(d.id, d.data()));
}

// ─── FETCH ONE ────────────────────────────────────────────────────────────────

export async function fetchVoucher(id: string): Promise<Voucher | null> {
  const snap = await getDoc(doc(db, COLLECTION, id));
  if (!snap.exists()) return null;
  return docToVoucher(snap.id, snap.data());
}

// ─── CREATE ───────────────────────────────────────────────────────────────────

export async function createVoucher(
  formData: VoucherFormData,
  createdByUid: string,
): Promise<Voucher> {
  const payload = {
    ...formToPayload(formData, createdByUid),
    usedBy: [],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const docRef = await addDoc(collection(db, COLLECTION), payload);

  const saved = await fetchVoucher(docRef.id);
  if (saved) return saved;

  // Fallback
  const now = new Date();
  return {
    id: docRef.id,
    code: formData.code.trim().toUpperCase(),
    type: formData.type,
    discountAmount:
      formData.type === "discount" && formData.discountAmount
        ? Number(formData.discountAmount)
        : null,
    applicableProducts: formData.applicableProducts,
    maxUses: Number(formData.maxUses),
    usedBy: [],
    isActive: formData.isActive,
    expiryDate: new Date(formData.expiryDate),
    createdAt: now,
    updatedAt: now,
    createdBy: createdByUid,
  };
}

// ─── UPDATE ───────────────────────────────────────────────────────────────────

export async function updateVoucher(
  id: string,
  formData: VoucherFormData,
): Promise<Voucher> {
  const payload = {
    ...formToPayload(formData),
    updatedAt: serverTimestamp(),
  };

  await updateDoc(doc(db, COLLECTION, id), payload);

  const saved = await fetchVoucher(id);
  if (saved) return saved;

  const now = new Date();
  return {
    id,
    code: formData.code.trim().toUpperCase(),
    type: formData.type,
    discountAmount:
      formData.type === "discount" && formData.discountAmount
        ? Number(formData.discountAmount)
        : null,
    applicableProducts: formData.applicableProducts,
    maxUses: Number(formData.maxUses),
    usedBy: [],
    isActive: formData.isActive,
    expiryDate: new Date(formData.expiryDate),
    createdAt: now,
    updatedAt: now,
    createdBy: "",
  };
}

// ─── DELETE ───────────────────────────────────────────────────────────────────

export async function deleteVoucher(id: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTION, id));
}

// ─── TOGGLE ACTIVE ────────────────────────────────────────────────────────────

export async function toggleVoucherActive(
  id: string,
  isActive: boolean,
): Promise<void> {
  await updateDoc(doc(db, COLLECTION, id), {
    isActive,
    updatedAt: serverTimestamp(),
  });
}