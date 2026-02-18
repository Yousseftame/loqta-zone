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
import type {
  Product,
  ProductFormData,
  ProductStatus,
} from "@/pages/Admin/Products/products-data";

const COLLECTION = "products";

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
    thumbnail:
      !data.thumbnail || data.thumbnail === "null" ? null : data.thumbnail,
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

async function uploadImage(productId: string, file: File): Promise<string> {
  // Use timestamp to avoid filename collisions
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

// ─── FETCH ALL ────────────────────────────────────────────────────────────────
export async function fetchProducts(): Promise<Product[]> {
  try {
    const q = query(collection(db, COLLECTION));
    const snap = await getDocs(q);
    return snap.docs.map((d) => docToProduct(d.id, d.data()));
  } catch (err: any) {
    // If Firestore index doesn't exist yet, fall back to unordered
    console.warn("Ordered fetch failed, trying unordered:", err.message);
    const snap = await getDocs(collection(db, COLLECTION));
    return snap.docs.map((d) => docToProduct(d.id, d.data()));
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
  // 1. Build base payload — no images yet
  const payload: Record<string, any> = {
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
    thumbnail: "null",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    createdBy: createdByUid,
  };

  // 2. Create doc to get the ID
  const docRef = await addDoc(collection(db, COLLECTION), payload);

  // 3. Upload images using the new doc ID
  const uploadedUrls: string[] = [];
  for (const file of formData.newImages) {
    try {
      const url = await uploadImage(docRef.id, file);
      uploadedUrls.push(url);
    } catch (err) {
      console.error("Image upload failed:", err);
    }
  }

  // 4. Update doc with image data if any images were uploaded
  if (uploadedUrls.length > 0) {
    const thumbnail = uploadedUrls[0];
    await updateDoc(docRef, {
      images: uploadedUrls,
      thumbnail,
    });
  }

  // 5. Build and return product locally (avoids serverTimestamp timing issue)
  const now = new Date();
  return {
    id: docRef.id,
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
    images: uploadedUrls,
    thumbnail: uploadedUrls[0] ?? null,
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
  // 1. Upload new images
  const newUrls: string[] = [];
  for (const file of formData.newImages) {
    try {
      const url = await uploadImage(id, file);
      newUrls.push(url);
    } catch (err) {
      console.error("Image upload failed:", err);
    }
  }

  // 2. Final image list
  const finalImages = [...formData.existingImages, ...newUrls];

  // 3. Delete removed images from Storage
  const removedUrls = previousImages.filter(
    (url) => !formData.existingImages.includes(url),
  );
  for (const url of removedUrls) {
    await deleteImageByUrl(url);
  }

  // 4. Determine thumbnail
  const thumbnail =
    formData.thumbnail && formData.thumbnail !== "null"
      ? formData.thumbnail
      : finalImages[0] ?? "null";

  // 5. Update Firestore
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
    thumbnail,
    updatedAt: serverTimestamp(),
  });

  // 6. Return updated product locally
  const now = new Date();
  return {
    id,
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
    images: finalImages,
    thumbnail: thumbnail === "null" ? null : thumbnail,
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
export async function toggleProductActive(
  id: string,
  isActive: boolean,
): Promise<void> {
  await updateDoc(doc(db, COLLECTION, id), {
    isActive,
    updatedAt: serverTimestamp(),
  });
}

// ─── ARCHIVE ─────────────────────────────────────────────────────────────────
export async function archiveProduct(id: string): Promise<void> {
  await updateDoc(doc(db, COLLECTION, id), {
    isArchived: true,
    status: "archived",
    updatedAt: serverTimestamp(),
  });
}