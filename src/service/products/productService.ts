import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  query,
  orderBy,
  Timestamp,
} from "firebase/firestore";
import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";
import { db, storage } from "@/firebase/firebase";
import type { Product, ProductFormData, ProductStatus } from "@/pages/Admin/Products/products-data";

const COLLECTION = "products";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Convert a Firestore doc snapshot → Product */
function docToProduct(id: string, data: Record<string, any>): Product {
  return {
    id,
    title: data.title ?? "",
    brand: data.brand ?? "",
    model: data.model ?? "",
    category: data.category ?? "",
    description: data.description ?? "",
    price: data.price ?? 0,
    availableQuantity: data.availableQuantity ?? 0,
    totalQuantity: data.totalQuantity ?? 0,
    status: (data.status as ProductStatus) ?? "draft",
    isActive: data.isActive ?? true,
    isArchived: data.isArchived ?? false,
    features: Array.isArray(data.features) ? data.features : [],
    images: Array.isArray(data.images) ? data.images : [],
    thumbnail: data.thumbnail === "null" ? null : (data.thumbnail ?? null),
    createdAt: data.createdAt instanceof Timestamp
      ? data.createdAt.toDate()
      : new Date(),
    updatedAt: data.updatedAt instanceof Timestamp
      ? data.updatedAt.toDate()
      : new Date(),
    createdBy: data.createdBy ?? "",
  };
}

/** Upload one image file to Storage; returns download URL */
async function uploadImage(productId: string, file: File): Promise<string> {
  const storageRef = ref(storage, `products/${productId}/${file.name}`);
  await uploadBytes(storageRef, file);
  return getDownloadURL(storageRef);
}

/** Delete one image from Storage by its download URL */
async function deleteImageByUrl(url: string): Promise<void> {
  try {
    const fileRef = ref(storage, url);
    await deleteObject(fileRef);
  } catch {
    // Ignore: file may already be gone
  }
}

// ─── Service functions ────────────────────────────────────────────────────────

/** Fetch all products ordered by createdAt desc */
export async function fetchProducts(): Promise<Product[]> {
  const q = query(collection(db, COLLECTION), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => docToProduct(d.id, d.data()));
}

/** Fetch a single product by ID */
export async function fetchProduct(id: string): Promise<Product | null> {
  const snap = await getDoc(doc(db, COLLECTION, id));
  if (!snap.exists()) return null;
  return docToProduct(snap.id, snap.data());
}

/**
 * Create a new product.
 * Images in formData.newImages are uploaded first, then their URLs are stored.
 */
export async function createProduct(
  formData: ProductFormData,
  createdByUid: string
): Promise<Product> {
  // 1. Create the doc first (to get an ID for the storage path)
  const docRef = await addDoc(collection(db, COLLECTION), {
    title: formData.title,
    brand: formData.brand,
    model: formData.model,
    category: formData.category,
    description: formData.description,
    price: Number(formData.price),
    availableQuantity: Number(formData.availableQuantity),
    totalQuantity: Number(formData.totalQuantity),
    status: formData.status,
    isActive: formData.isActive,
    isArchived: false,
    features: formData.features,
    images: [],
    thumbnail: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    createdBy: createdByUid,
  });

  // 2. Upload images (if any)
  const uploadedUrls: string[] = [];
  for (const file of formData.newImages) {
    const url = await uploadImage(docRef.id, file);
    uploadedUrls.push(url);
  }

  // 3. Update doc with image URLs & thumbnail
  const thumbnail = uploadedUrls[0] ?? null;
  await updateDoc(docRef, {
    images: uploadedUrls,
    thumbnail: thumbnail ?? "null",
  });

  const snap = await getDoc(docRef);
  return docToProduct(snap.id, snap.data()!);
}

/**
 * Update an existing product.
 * - Uploads formData.newImages to Storage
 * - Keeps formData.existingImages (already-uploaded URLs)
 * - Deletes any removed images from Storage
 */
export async function updateProduct(
  id: string,
  formData: ProductFormData,
  previousImages: string[]
): Promise<Product> {
  // 1. Upload new images
  const newUrls: string[] = [];
  for (const file of formData.newImages) {
    const url = await uploadImage(id, file);
    newUrls.push(url);
  }

  // 2. Final image list = kept existing + newly uploaded
  const finalImages = [...formData.existingImages, ...newUrls];

  // 3. Delete images that were removed
  const removedUrls = previousImages.filter(
    (url) => !formData.existingImages.includes(url)
  );
  for (const url of removedUrls) {
    await deleteImageByUrl(url);
  }

  // 4. Determine thumbnail
  const thumbnail = formData.thumbnail ?? finalImages[0] ?? null;

  // 5. Update Firestore doc
  await updateDoc(doc(db, COLLECTION, id), {
    title: formData.title,
    brand: formData.brand,
    model: formData.model,
    category: formData.category,
    description: formData.description,
    price: Number(formData.price),
    availableQuantity: Number(formData.availableQuantity),
    totalQuantity: Number(formData.totalQuantity),
    status: formData.status,
    isActive: formData.isActive,
    features: formData.features,
    images: finalImages,
    thumbnail: thumbnail ?? "null",
    updatedAt: serverTimestamp(),
  });

  const snap = await getDoc(doc(db, COLLECTION, id));
  return docToProduct(snap.id, snap.data()!);
}

/**
 * Delete a product and all its Storage images.
 */
export async function deleteProduct(product: Product): Promise<void> {
  // 1. Delete all images from Storage
  for (const url of product.images) {
    await deleteImageByUrl(url);
  }

  // 2. Delete Firestore doc
  await deleteDoc(doc(db, COLLECTION, product.id));
}

/**
 * Toggle isActive field (soft enable/disable).
 */
export async function toggleProductActive(
  id: string,
  isActive: boolean
): Promise<void> {
  await updateDoc(doc(db, COLLECTION, id), {
    isActive,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Archive a product (soft delete).
 */
export async function archiveProduct(id: string): Promise<void> {
  await updateDoc(doc(db, COLLECTION, id), {
    isArchived: true,
    status: "archived",
    updatedAt: serverTimestamp(),
  });
}