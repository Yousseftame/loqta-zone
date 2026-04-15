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
import type { Supplier, SupplierFormData } from "@/pages/Admin/Suppliers/suppliers-data";

const COLLECTION = "suppliers";

// ─── Helper ───────────────────────────────────────────────────────────────────

function docToSupplier(id: string, data: Record<string, any>): Supplier {
  return {
    id,
    name:          data.name          ?? "",
    contactPerson: data.contactPerson ?? "",
    email:         data.email         ?? "",
    phone:         data.phone         ?? "",
    address:       data.address       ?? "",
    isActive:      data.isActive      ?? true,
    notes:         data.notes         ?? "",
    createdAt:
      data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(),
    updatedAt:
      data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : new Date(),
    createdBy: data.createdBy ?? "",
  };
}

// ─── FETCH ALL ────────────────────────────────────────────────────────────────

export async function fetchSuppliers(): Promise<Supplier[]> {
  const q = query(collection(db, COLLECTION), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => docToSupplier(d.id, d.data()));
}

// ─── FETCH ONE ────────────────────────────────────────────────────────────────

export async function fetchSupplier(id: string): Promise<Supplier | null> {
  const snap = await getDoc(doc(db, COLLECTION, id));
  if (!snap.exists()) return null;
  return docToSupplier(snap.id, snap.data());
}

// ─── CREATE ───────────────────────────────────────────────────────────────────

export async function createSupplier(
  formData: SupplierFormData,
  createdByUid: string,
): Promise<Supplier> {
  const payload = {
    name:          formData.name.trim(),
    contactPerson: formData.contactPerson.trim(),
    email:         formData.email.trim(),
    phone:         formData.phone.trim(),
    address:       formData.address.trim(),
    isActive:      formData.isActive,
    notes:         formData.notes.trim(),
    createdAt:     serverTimestamp(),
    updatedAt:     serverTimestamp(),
    createdBy:     createdByUid,
  };

  const docRef = await addDoc(collection(db, COLLECTION), payload);

  const now = new Date();
  return {
    id:            docRef.id,
    name:          formData.name.trim(),
    contactPerson: formData.contactPerson.trim(),
    email:         formData.email.trim(),
    phone:         formData.phone.trim(),
    address:       formData.address.trim(),
    isActive:      formData.isActive,
    notes:         formData.notes.trim(),
    createdAt:     now,
    updatedAt:     now,
    createdBy:     createdByUid,
  };
}

// ─── UPDATE ───────────────────────────────────────────────────────────────────

export async function updateSupplier(
  id: string,
  formData: SupplierFormData,
): Promise<Supplier> {
  await updateDoc(doc(db, COLLECTION, id), {
    name:          formData.name.trim(),
    contactPerson: formData.contactPerson.trim(),
    email:         formData.email.trim(),
    phone:         formData.phone.trim(),
    address:       formData.address.trim(),
    isActive:      formData.isActive,
    notes:         formData.notes.trim(),
    updatedAt:     serverTimestamp(),
  });

  // Re-fetch for accurate timestamps
  const fresh = await fetchSupplier(id);
  if (fresh) return fresh;

  const now = new Date();
  return {
    id,
    name:          formData.name.trim(),
    contactPerson: formData.contactPerson.trim(),
    email:         formData.email.trim(),
    phone:         formData.phone.trim(),
    address:       formData.address.trim(),
    isActive:      formData.isActive,
    notes:         formData.notes.trim(),
    createdAt:     now,
    updatedAt:     now,
    createdBy:     "",
  };
}

// ─── DELETE ───────────────────────────────────────────────────────────────────

export async function deleteSupplier(id: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTION, id));
}

// ─── TOGGLE ACTIVE ────────────────────────────────────────────────────────────

export async function toggleSupplierActive(
  id: string,
  isActive: boolean,
): Promise<void> {
  await updateDoc(doc(db, COLLECTION, id), {
    isActive,
    updatedAt: serverTimestamp(),
  });
}