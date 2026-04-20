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
import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";
import { db, storage } from "@/firebase/firebase";
import type { Product, ProductFormData, LocalizedString } from "@/pages/Admin/Products/products-data";

const COLLECTION = "products";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Normalise a Firestore value that could be either the OLD plain string
 * format or the NEW { en, ar } object. This ensures zero breaking changes
 * for any documents written before the migration.
 */
function toLocalized(raw: any): LocalizedString {
  if (!raw) return { en: "", ar: "" };
  if (typeof raw === "string") return { en: raw, ar: "" };   // legacy plain string
  return { en: raw.en ?? "", ar: raw.ar ?? "" };
}

function toLocalizedArray(raw: any): LocalizedString[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item: any) => {
    if (typeof item === "string") return { en: item, ar: "" }; // legacy
    return { en: item.en ?? "", ar: item.ar ?? "" };
  });
}

function docToProduct(id: string, data: Record<string, any>): Product {
  return {
    id,
    title:         toLocalized(data.title),
    brand:         toLocalized(data.brand),
    model:         toLocalized(data.model),
    category:      data.category      ?? "",
    supplierId:    data.supplierId     ?? "",
    description:   toLocalized(data.description),
    price:         data.price         ?? 0,
    actualPrice:   data.actualPrice   ?? 0,
    quantity:      data.quantity      ?? 0,
    isActive:      data.isActive      ?? true,
    isArchived:    data.isArchived     ?? false,
    features:      toLocalizedArray(data.features),
    images:        Array.isArray(data.images)   ? data.images   : [],
    thumbnail:     !data.thumbnail || data.thumbnail === "null" ? null : data.thumbnail,
    totalAuctions: data.totalAuctions ?? 0,
    createdAt:     data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(),
    updatedAt:     data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : new Date(),
    createdBy:     data.createdBy     ?? "",
  };
}

async function uploadImage(productId: string, file: File): Promise<string> {
  const safeName   = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
  const storageRef = ref(storage, `products/${productId}/${safeName}`);
  const snapshot   = await uploadBytes(storageRef, file);
  return getDownloadURL(snapshot.ref);
}

async function deleteImageByUrl(url: string): Promise<void> {
  try {
    await deleteObject(ref(storage, url));
  } catch (err) {
    console.warn("Could not delete image:", url, err);
  }
}

function parseNum(val: string): number {
  const n = Number(String(val).trim());
  return isNaN(n) ? 0 : n;
}

// ─── Build Firestore payload from form ────────────────────────────────────────

function formToFields(formData: ProductFormData) {
  return {
    title:       { en: formData.titleEn.trim(), ar: formData.titleAr.trim() },
    brand:       { en: formData.brandEn.trim(), ar: formData.brandAr.trim() },
    model:       { en: formData.modelEn.trim(), ar: formData.modelAr.trim() },
    category:    formData.category,
    supplierId:  formData.supplierId,
    description: { en: formData.descriptionEn.trim(), ar: formData.descriptionAr.trim() },
    price:       parseNum(formData.price),
    actualPrice: parseNum(formData.actualPrice),
    quantity:    parseNum(formData.quantity),
    isActive:    formData.isActive,
    features:    formData.featuresEn.map((en, i) => ({
      en,
      ar: formData.featuresAr[i] ?? "",
    })),
  };
}

// ─── FETCH ALL ────────────────────────────────────────────────────────────────

export async function fetchProducts(): Promise<Product[]> {
  try {
    const q    = query(collection(db, COLLECTION), orderBy("createdAt", "desc"));
    const snap = await getDocs(q);
    return snap.docs.map((d) => docToProduct(d.id, d.data()));
  } catch (err: any) {
    console.warn("Fetch failed:", err.message);
    throw err;
  }
}

// ─── FETCH ONE ────────────────────────────────────────────────────────────────

export async function fetchProduct(id: string): Promise<Product | null> {
  const snap = await getDoc(doc(db, COLLECTION, id));
  if (!snap.exists()) return null;
  return docToProduct(snap.id, snap.data());
}

// ─── CREATE ───────────────────────────────────────────────────────────────────

export async function createProduct(
  formData: ProductFormData,
  createdByUid: string,
): Promise<Product> {
  const fields = formToFields(formData);

  const payload: Record<string, any> = {
    ...fields,
    isArchived:    false,
    images:        [],
    thumbnail:     null,
    totalAuctions: 0,
    createdAt:     serverTimestamp(),
    updatedAt:     serverTimestamp(),
    createdBy:     createdByUid,
  };

  const docRef = await addDoc(collection(db, COLLECTION), payload);

  const uploadedUrls: string[] = [];
  for (const file of formData.newImages) {
    try {
      const url = await uploadImage(docRef.id, file);
      uploadedUrls.push(url);
    } catch (err) {
      console.error("Image upload failed:", err);
    }
  }

  if (uploadedUrls.length > 0) {
    await updateDoc(docRef, { images: uploadedUrls, thumbnail: uploadedUrls[0] });
  }

  const now = new Date();
  return {
    id:            docRef.id,
    ...fields,
    isArchived:    false,
    images:        uploadedUrls,
    thumbnail:     uploadedUrls[0] ?? null,
    totalAuctions: 0,
    createdAt:     now,
    updatedAt:     now,
    createdBy:     createdByUid,
  };
}

// ─── UPDATE ───────────────────────────────────────────────────────────────────

export async function updateProduct(
  id: string,
  formData: ProductFormData,
  previousImages: string[],
): Promise<Product> {
  const fields = formToFields(formData);

  const newUrls: string[] = [];
  for (const file of formData.newImages) {
    try {
      const url = await uploadImage(id, file);
      newUrls.push(url);
    } catch (err) {
      console.error("Image upload failed:", err);
    }
  }

  const finalImages = [...formData.existingImages, ...newUrls];

  const removedUrls = previousImages.filter(
    (url) => !formData.existingImages.includes(url),
  );
  for (const url of removedUrls) {
    await deleteImageByUrl(url);
  }

  const thumbnailIsValid =
    formData.thumbnail &&
    formData.thumbnail !== "null" &&
    finalImages.includes(formData.thumbnail);

  const thumbnail = thumbnailIsValid ? formData.thumbnail : (finalImages[0] ?? null);

  await updateDoc(doc(db, COLLECTION, id), {
    ...fields,
    images:    finalImages,
    thumbnail: thumbnail ?? null,
    updatedAt: serverTimestamp(),
  });

  const now = new Date();
  return {
    id,
    ...fields,
    isArchived:    false,
    images:        finalImages,
    thumbnail,
    totalAuctions: 0,
    createdAt:     new Date(),
    updatedAt:     now,
    createdBy:     "",
  };
}

// ─── DELETE ───────────────────────────────────────────────────────────────────

export async function deleteProduct(product: Product): Promise<void> {
  for (const url of product.images) {
    await deleteImageByUrl(url);
  }
  await deleteDoc(doc(db, COLLECTION, product.id));
}

// ─── TOGGLE ACTIVE ────────────────────────────────────────────────────────────

export async function toggleProductActive(id: string, isActive: boolean): Promise<void> {
  await updateDoc(doc(db, COLLECTION, id), { isActive, updatedAt: serverTimestamp() });
}