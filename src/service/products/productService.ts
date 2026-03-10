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
import type { Product, ProductFormData } from "@/pages/Admin/Products/products-data";

const COLLECTION = "products";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function docToProduct(id: string, data: Record<string, any>): Product {
  return {
    id,
    title: data.title ?? "",
    brand: data.brand ?? "",
    model: data.model ?? "",
    category: data.category ?? "",
    description: data.description ?? "",
    price: data.price ?? 0,
    actualPrice: data.actualPrice ?? 0,   // new field — defaults to 0 for legacy docs
    quantity: data.quantity ?? 0,
    isActive: data.isActive ?? true,
    isArchived: data.isArchived ?? false,
    features: Array.isArray(data.features) ? data.features : [],
    images: Array.isArray(data.images) ? data.images : [],
    thumbnail: !data.thumbnail || data.thumbnail === "null" ? null : data.thumbnail,
    totalAuctions: data.totalAuctions ?? 0,
    createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(),
    updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : new Date(),
    createdBy: data.createdBy ?? "",
  };
}

async function uploadImage(productId: string, file: File): Promise<string> {
  const safeName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
  const storageRef = ref(storage, `products/${productId}/${safeName}`);
  const snapshot = await uploadBytes(storageRef, file);
  return getDownloadURL(snapshot.ref);
}

async function deleteImageByUrl(url: string): Promise<void> {
  try {
    const fileRef = ref(storage, url);
    await deleteObject(fileRef);
  } catch (err) {
    console.warn("Could not delete image:", url, err);
  }
}

// ─── Safe numeric parser ──────────────────────────────────────────────────────
// Trims whitespace and parses the FULL string — avoids partial-value bugs
// from controlled inputs that fire onChange mid-keystroke.
function parseNum(val: string): number {
  const trimmed = String(val).trim();
  const n = Number(trimmed);
  return isNaN(n) ? 0 : n;
}

// ─── FETCH ALL ────────────────────────────────────────────────────────────────

export async function fetchProducts(): Promise<Product[]> {
  try {
    const q = query(
      collection(db, COLLECTION),
      orderBy("createdAt", "desc")
    );
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
  // Use parseNum to avoid partial-value / float precision issues
  const price = parseNum(formData.price);
  const actualPrice = parseNum(formData.actualPrice);
  const quantity = parseNum(formData.quantity);

  const payload: Record<string, any> = {
    title: formData.title,
    brand: formData.brand,
    model: formData.model,
    category: formData.category,
    description: formData.description,
    price,
    actualPrice,
    quantity,
    isActive: formData.isActive,
    isArchived: false,
    features: formData.features,
    images: [],
    thumbnail: null,
    totalAuctions: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    createdBy: createdByUid,
  };

  const docRef = await addDoc(collection(db, COLLECTION), payload);

  // Upload images using the new doc ID
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
    await updateDoc(docRef, {
      images: uploadedUrls,
      thumbnail: uploadedUrls[0],
    });
  }

  const now = new Date();
  return {
    id: docRef.id,
    title: formData.title,
    brand: formData.brand,
    model: formData.model,
    category: formData.category,
    description: formData.description,
    price,
    actualPrice,
    quantity,
    isActive: formData.isActive,
    isArchived: false,
    features: formData.features,
    images: uploadedUrls,
    thumbnail: uploadedUrls[0] ?? null,
    totalAuctions: 0,
    createdAt: now,
    updatedAt: now,
    createdBy: createdByUid,
  };
}

// ─── UPDATE ───────────────────────────────────────────────────────────────────

export async function updateProduct(
  id: string,
  formData: ProductFormData,
  previousImages: string[],
): Promise<Product> {
  const price = parseNum(formData.price);
  const actualPrice = parseNum(formData.actualPrice);
  const quantity = parseNum(formData.quantity);

  // Upload new images
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

  // Delete removed images from Storage
  const removedUrls = previousImages.filter(
    (url) => !formData.existingImages.includes(url),
  );
  for (const url of removedUrls) {
    await deleteImageByUrl(url);
  }

  // Determine thumbnail
  const thumbnailIsValid =
    formData.thumbnail &&
    formData.thumbnail !== "null" &&
    finalImages.includes(formData.thumbnail);

  const thumbnail = thumbnailIsValid ? formData.thumbnail : (finalImages[0] ?? null);

  await updateDoc(doc(db, COLLECTION, id), {
    title: formData.title,
    brand: formData.brand,
    model: formData.model,
    category: formData.category,
    description: formData.description,
    price,
    actualPrice,
    quantity,
    isActive: formData.isActive,
    features: formData.features,
    images: finalImages,
    thumbnail: thumbnail ?? null,
    updatedAt: serverTimestamp(),
  });

  const now = new Date();
  return {
    id,
    title: formData.title,
    brand: formData.brand,
    model: formData.model,
    category: formData.category,
    description: formData.description,
    price,
    actualPrice,
    quantity,
    isActive: formData.isActive,
    isArchived: false,
    features: formData.features,
    images: finalImages,
    thumbnail,
    totalAuctions: 0,
    createdAt: new Date(),
    updatedAt: now,
    createdBy: "",
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
  await updateDoc(doc(db, COLLECTION, id), {
    isActive,
    updatedAt: serverTimestamp(),
  });
}