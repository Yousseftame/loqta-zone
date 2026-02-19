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
  increment,
  query,
  orderBy,
} from "firebase/firestore";
import { db } from "@/firebase/firebase";
import type {
  Auction,
  AuctionFormData,
  AuctionStatus,
} from "@/pages/Admin/Auctions/auctions-data";
import { computeAuctionStatus } from "@/pages/Admin/Auctions/auctions-data";

const COLLECTION = "auctions";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function docToAuction(id: string, data: Record<string, any>): Auction {
  const startTime =
    data.startTime instanceof Timestamp
      ? data.startTime.toDate()
      : new Date(data.startTime);
  const endTime =
    data.endTime instanceof Timestamp
      ? data.endTime.toDate()
      : new Date(data.endTime);

  return {
    id,
    productId: data.productId ?? "",
    auctionNumber: data.auctionNumber ?? 0,
    startingPrice: data.startingPrice ?? 0,
    currentBid: data.currentBid ?? 0,
    minimumIncrement: data.minimumIncrement ?? 0,
    bidType: data.bidType ?? "fixed",
    fixedBidValue: data.fixedBidValue ?? null,
    startTime,
    endTime,
    entryType: data.entryType ?? "free",
    entryFee: data.entryFee ?? 0,
    // Always re-compute status from dates — source of truth
    status: computeAuctionStatus(startTime, endTime),
    isActive: data.isActive ?? true,
    winnerId: data.winnerId ?? null,
    winningBid: data.winningBid ?? null,
    totalBids: data.totalBids ?? 0,
    totalParticipants: data.totalParticipants ?? 0,
    lastOfferEnabled: data.lastOfferEnabled ?? false,
    createdAt:
      data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(),
    updatedAt:
      data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : new Date(),
    createdBy: data.createdBy ?? "",
  };
}

function formToPayload(formData: AuctionFormData, createdBy = "") {
  const startTime = Timestamp.fromDate(new Date(formData.startTime));
  const endTime = Timestamp.fromDate(new Date(formData.endTime));
  const computedStatus = computeAuctionStatus(
    new Date(formData.startTime),
    new Date(formData.endTime),
  );

  return {
    productId: formData.productId,
    auctionNumber: Number(formData.auctionNumber),
    startingPrice: Number(formData.startingPrice),
    currentBid: Number(formData.startingPrice),
    minimumIncrement: Number(formData.minimumIncrement),
    bidType: formData.bidType,
    fixedBidValue:
      formData.bidType === "fixed" && formData.fixedBidValue
        ? Number(formData.fixedBidValue)
        : null,
    startTime,
    endTime,
    entryType: formData.entryType,
    entryFee: formData.entryType === "paid" ? Number(formData.entryFee) : 0,
    status: computedStatus,
    isActive: formData.isActive,
    lastOfferEnabled: formData.lastOfferEnabled,
    ...(createdBy && { createdBy }),
  };
}

// ─── FETCH ALL ────────────────────────────────────────────────────────────────

export async function fetchAuctions(): Promise<Auction[]> {
     const q = query(
      collection(db, COLLECTION),
      orderBy("createdAt", "desc")
    );

    const snap = await getDocs(q);
  return snap.docs.map((d) => docToAuction(d.id, d.data()));
}

// ─── FETCH ONE ────────────────────────────────────────────────────────────────

export async function fetchAuction(id: string): Promise<Auction | null> {
  const snap = await getDoc(doc(db, COLLECTION, id));
  if (!snap.exists()) return null;
  return docToAuction(snap.id, snap.data());
}

// ─── CREATE ───────────────────────────────────────────────────────────────────

export async function createAuction(
  formData: AuctionFormData,
  createdByUid: string,
): Promise<Auction> {
  const payload = {
    ...formToPayload(formData, createdByUid),
    winnerId: null,
    winningBid: null,
    totalBids: 0,
    totalParticipants: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const docRef = await addDoc(collection(db, COLLECTION), payload);

  // Increment the linked product's totalAuctions counter
  await updateDoc(doc(db, "products", formData.productId), {
    totalAuctions: increment(1),
    updatedAt: serverTimestamp(),
  });

  // Re-fetch to get exact saved data
  const saved = await fetchAuction(docRef.id);
  if (saved) return saved;

  // Fallback (should not happen)
  const now = new Date();
  return {
    id: docRef.id,
    productId: formData.productId,
    auctionNumber: Number(formData.auctionNumber),
    startingPrice: Number(formData.startingPrice),
    currentBid: Number(formData.startingPrice),
    minimumIncrement: Number(formData.minimumIncrement),
    bidType: formData.bidType,
    fixedBidValue:
      formData.bidType === "fixed" && formData.fixedBidValue
        ? Number(formData.fixedBidValue)
        : null,
    startTime: new Date(formData.startTime),
    endTime: new Date(formData.endTime),
    entryType: formData.entryType,
    entryFee: formData.entryType === "paid" ? Number(formData.entryFee) : 0,
    status: computeAuctionStatus(new Date(formData.startTime), new Date(formData.endTime)),
    isActive: formData.isActive,
    winnerId: null,
    winningBid: null,
    totalBids: 0,
    totalParticipants: 0,
    lastOfferEnabled: formData.lastOfferEnabled,
    createdAt: now,
    updatedAt: now,
    createdBy: createdByUid,
  };
}

// ─── UPDATE ───────────────────────────────────────────────────────────────────

export async function updateAuction(
  id: string,
  formData: AuctionFormData,
): Promise<Auction> {
  const payload = {
    ...formToPayload(formData),
    updatedAt: serverTimestamp(),
  };

  // If the product changed, decrement the old product and increment the new one
  const existing = await fetchAuction(id);
  if (existing && existing.productId !== formData.productId) {
    await updateDoc(doc(db, "products", existing.productId), {
      totalAuctions: increment(-1),
      updatedAt: serverTimestamp(),
    });
    await updateDoc(doc(db, "products", formData.productId), {
      totalAuctions: increment(1),
      updatedAt: serverTimestamp(),
    });
  }

  await updateDoc(doc(db, COLLECTION, id), payload);

  // Re-fetch to get exact saved data (including server timestamps)
  const saved = await fetchAuction(id);
  if (saved) return saved;

  // Fallback
  const now = new Date();
  return {
    id,
    productId: formData.productId,
    auctionNumber: Number(formData.auctionNumber),
    startingPrice: Number(formData.startingPrice),
    currentBid: Number(formData.startingPrice),
    minimumIncrement: Number(formData.minimumIncrement),
    bidType: formData.bidType,
    fixedBidValue:
      formData.bidType === "fixed" && formData.fixedBidValue
        ? Number(formData.fixedBidValue)
        : null,
    startTime: new Date(formData.startTime),
    endTime: new Date(formData.endTime),
    entryType: formData.entryType,
    entryFee: formData.entryType === "paid" ? Number(formData.entryFee) : 0,
    status: computeAuctionStatus(new Date(formData.startTime), new Date(formData.endTime)),
    isActive: formData.isActive,
    winnerId: null,
    winningBid: null,
    totalBids: 0,
    totalParticipants: 0,
    lastOfferEnabled: formData.lastOfferEnabled,
    createdAt: new Date(),
    updatedAt: now,
    createdBy: "",
  };
}

// ─── DELETE ───────────────────────────────────────────────────────────────────

export async function deleteAuction(id: string): Promise<void> {
  // Decrement the linked product's totalAuctions counter before deleting
  const existing = await fetchAuction(id);
  if (existing?.productId) {
    await updateDoc(doc(db, "products", existing.productId), {
      totalAuctions: increment(-1),
      updatedAt: serverTimestamp(),
    });
  }
  await deleteDoc(doc(db, COLLECTION, id));
}

// ─── TOGGLE ACTIVE ────────────────────────────────────────────────────────────

export async function toggleAuctionActive(id: string, isActive: boolean): Promise<void> {
  await updateDoc(doc(db, COLLECTION, id), {
    isActive,
    updatedAt: serverTimestamp(),
  });
}