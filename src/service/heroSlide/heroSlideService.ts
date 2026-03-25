/**
 * heroSlideService.ts
 *
 * Firestore collection: heroSlides
 * Storage path: heroSlides/{slideId}/{filename}
 *
 * Each document:
 *   imageUrl   : string   — Firebase Storage download URL
 *   order      : number   — display order (lower = first)
 *   isActive   : boolean  — show/hide on homepage
 *   createdAt  : Timestamp
 *   updatedAt  : Timestamp
 *   createdBy  : string   — uid
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
import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";
import { db, storage } from "@/firebase/firebase";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface HeroSlide {
  id: string;
  imageUrl: string;
  order: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export interface HeroSlideFormData {
  imageFile: File | null;
  isActive: boolean;
}

const COLLECTION = "heroSlides";

// ─── Helper ───────────────────────────────────────────────────────────────────

function docToSlide(id: string, data: Record<string, any>): HeroSlide {
  return {
    id,
    imageUrl:  data.imageUrl  ?? "",
    order:     data.order     ?? 0,
    isActive:  data.isActive  ?? true,
    createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(),
    updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : new Date(),
    createdBy: data.createdBy ?? "",
  };
}

async function uploadSlideImage(slideId: string, file: File): Promise<string> {
  const safeName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
  const storageRef = ref(storage, `heroSlides/${slideId}/${safeName}`);
  const snapshot = await uploadBytes(storageRef, file);
  return getDownloadURL(snapshot.ref);
}

async function deleteSlideImage(url: string): Promise<void> {
  try {
    await deleteObject(ref(storage, url));
  } catch (err) {
    console.warn("[heroSlideService] Could not delete image:", url, err);
  }
}

// ─── FETCH ALL (ordered by `order` ASC) ──────────────────────────────────────

export async function fetchHeroSlides(): Promise<HeroSlide[]> {
  const q = query(collection(db, COLLECTION), orderBy("order", "asc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => docToSlide(d.id, d.data()));
}

// ─── FETCH ACTIVE ONLY (for homepage) ────────────────────────────────────────

export async function fetchActiveHeroSlides(): Promise<HeroSlide[]> {
  const all = await fetchHeroSlides();
  return all.filter((s) => s.isActive);
}

// ─── FETCH ONE ────────────────────────────────────────────────────────────────

export async function fetchHeroSlide(id: string): Promise<HeroSlide | null> {
  const snap = await getDoc(doc(db, COLLECTION, id));
  if (!snap.exists()) return null;
  return docToSlide(snap.id, snap.data());
}

// ─── CREATE ───────────────────────────────────────────────────────────────────

export async function createHeroSlide(
  formData: HeroSlideFormData,
  createdByUid: string,
): Promise<HeroSlide> {
  if (!formData.imageFile) throw new Error("Image file is required");

  // Determine next order value
  const existing = await fetchHeroSlides();
  const nextOrder = existing.length > 0
    ? Math.max(...existing.map((s) => s.order)) + 1
    : 0;

  // Create placeholder doc first to get the ID for Storage path
  const docRef = await addDoc(collection(db, COLLECTION), {
    imageUrl:  "",
    order:     nextOrder,
    isActive:  formData.isActive,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    createdBy: createdByUid,
  });

  // Upload image using the doc ID
  const imageUrl = await uploadSlideImage(docRef.id, formData.imageFile);

  // Write the final URL back
  await updateDoc(docRef, { imageUrl });

  return {
    id:        docRef.id,
    imageUrl,
    order:     nextOrder,
    isActive:  formData.isActive,
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: createdByUid,
  };
}

// ─── TOGGLE ACTIVE ────────────────────────────────────────────────────────────

export async function toggleHeroSlideActive(
  id: string,
  isActive: boolean,
): Promise<void> {
  await updateDoc(doc(db, COLLECTION, id), {
    isActive,
    updatedAt: serverTimestamp(),
  });
}

// ─── REORDER (batch write all orders atomically) ──────────────────────────────

export async function reorderHeroSlides(
  orderedIds: string[],
): Promise<void> {
  const batch = writeBatch(db);
  orderedIds.forEach((id, index) => {
    batch.update(doc(db, COLLECTION, id), {
      order:     index,
      updatedAt: serverTimestamp(),
    });
  });
  await batch.commit();
}

// ─── DELETE ───────────────────────────────────────────────────────────────────

export async function deleteHeroSlide(slide: HeroSlide): Promise<void> {
  if (slide.imageUrl) {
    await deleteSlideImage(slide.imageUrl);
  }
  await deleteDoc(doc(db, COLLECTION, slide.id));
}