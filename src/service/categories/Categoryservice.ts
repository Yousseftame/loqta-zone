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
import type { Category, CategoryFormData } from "@/pages/Admin/Categories/Categories-data";

const COLLECTION = "categories";

// ─── Helper ───────────────────────────────────────────────────────────────────

function docToCategory(id: string, data: Record<string, any>): Category {
  return {
    id,
    name: {
      en: data.name?.en ?? "",
      ar: data.name?.ar ?? "",
    },
    description: {
      en: data.description?.en ?? "",
      ar: data.description?.ar ?? "",
    },
    isActive: data.isActive ?? true,
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

// ─── FETCH ALL ────────────────────────────────────────────────────────────────

export async function fetchCategories(): Promise<Category[]> {
  const q = query(collection(db, COLLECTION), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => docToCategory(d.id, d.data()));
}

// ─── FETCH ONE ────────────────────────────────────────────────────────────────

export async function fetchCategory(id: string): Promise<Category | null> {
  const snap = await getDoc(doc(db, COLLECTION, id));
  if (!snap.exists()) return null;
  return docToCategory(snap.id, snap.data());
}

// ─── CREATE ───────────────────────────────────────────────────────────────────

export async function createCategory(
  formData: CategoryFormData,
  createdByUid: string,
): Promise<Category> {
  const payload = {
    name: { en: formData.nameEn, ar: formData.nameAr },
    description: { en: formData.descriptionEn, ar: formData.descriptionAr },
    isActive: formData.isActive,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    createdBy: createdByUid,
  };

  const docRef = await addDoc(collection(db, COLLECTION), payload);
  const now = new Date();

  return {
    id: docRef.id,
    name: { en: formData.nameEn, ar: formData.nameAr },
    description: { en: formData.descriptionEn, ar: formData.descriptionAr },
    isActive: formData.isActive,
    createdAt: now,
    updatedAt: now,
    createdBy: createdByUid,
  };
}

// ─── UPDATE ───────────────────────────────────────────────────────────────────

export async function updateCategory(
  id: string,
  formData: CategoryFormData,
): Promise<Category> {
  await updateDoc(doc(db, COLLECTION, id), {
    name: { en: formData.nameEn, ar: formData.nameAr },
    description: { en: formData.descriptionEn, ar: formData.descriptionAr },
    isActive: formData.isActive,
    updatedAt: serverTimestamp(),
  });

  const now = new Date();
  return {
    id,
    name: { en: formData.nameEn, ar: formData.nameAr },
    description: { en: formData.descriptionEn, ar: formData.descriptionAr },
    isActive: formData.isActive,
    createdAt: now,
    updatedAt: now,
    createdBy: "",
  };
}

// ─── DELETE ───────────────────────────────────────────────────────────────────

export async function deleteCategory(id: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTION, id));
}

// ─── TOGGLE ACTIVE ────────────────────────────────────────────────────────────

export async function toggleCategoryActive(
  id: string,
  isActive: boolean,
): Promise<void> {
  await updateDoc(doc(db, COLLECTION, id), {
    isActive,
    updatedAt: serverTimestamp(),
  });
}