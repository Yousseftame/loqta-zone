import {
  collection,
  doc,
  getDocs,
  getDoc,
  updateDoc,
  serverTimestamp,
  Timestamp,
  query,
  orderBy,
} from "firebase/firestore";
import { db } from "@/firebase/firebase";
import type {
  AuctionRequest,
  AuctionRequestFormData,
} from "@/pages/Admin/RequestSystem/auction-requests-data";

const COLLECTION = "AuctionRequests";

// ─── Helper ───────────────────────────────────────────────────────────────────

function docToRequest(id: string, data: Record<string, any>): AuctionRequest {
  return {
    id,
    userId: data.userId ?? "",
    productName: data.productName ?? "",
    category: data.category ?? "",
    budget: data.budget ?? "",
    notes: data.notes ?? "",
    urgency: data.urgency ?? "flexible",
    status: data.status ?? "pending",
    matchedAuctionId: data.matchedAuctionId ?? null,
    createdAt:
      data.createdAt instanceof Timestamp
        ? data.createdAt.toDate()
        : new Date(),
    updatedAt:
      data.updatedAt instanceof Timestamp
        ? data.updatedAt.toDate()
        : undefined,
  };
}

// ─── FETCH ALL ────────────────────────────────────────────────────────────────

export async function fetchAuctionRequests(): Promise<AuctionRequest[]> {
  const q = query(
    collection(db, COLLECTION),
    orderBy("createdAt", "desc"),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => docToRequest(d.id, d.data()));
}

// ─── FETCH ONE ────────────────────────────────────────────────────────────────

export async function fetchAuctionRequest(
  id: string,
): Promise<AuctionRequest | null> {
  const snap = await getDoc(doc(db, COLLECTION, id));
  if (!snap.exists()) return null;
  return docToRequest(snap.id, snap.data());
}

// ─── UPDATE (admin edits status / matchedAuctionId / notes) ──────────────────

export async function updateAuctionRequest(
  id: string,
  formData: AuctionRequestFormData,
): Promise<AuctionRequest> {
  await updateDoc(doc(db, COLLECTION, id), {
    status: formData.status,
    matchedAuctionId: formData.matchedAuctionId.trim() || null,
    notes: formData.notes,
    updatedAt: serverTimestamp(),
  });

  const saved = await fetchAuctionRequest(id);
  if (saved) return saved;

  const now = new Date();
  return {
    id,
    userId: "",
    productName: "",
    category: "",
    budget: "",
    notes: formData.notes,
    urgency: "flexible",
    status: formData.status,
    matchedAuctionId: formData.matchedAuctionId.trim() || null,
    createdAt: now,
    updatedAt: now,
  };
}