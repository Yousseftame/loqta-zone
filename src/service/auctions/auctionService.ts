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
} from "firebase/firestore";
import { db } from "@/firebase/firebase";
import type {
  Auction,
  AuctionFormData,
  AuctionStatus,
} from "@/pages/Admin/Auctions/auctions-data";

const COLLECTION = "auctions";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function docToAuction(id: string, data: Record<string, any>): Auction {
  return {
    id,
    productId: data.productId ?? "",
    auctionNumber: data.auctionNumber ?? 0,
    startingPrice: data.startingPrice ?? 0,
    currentBid: data.currentBid ?? 0,
    minimumIncrement: data.minimumIncrement ?? 0,
    bidType: data.bidType ?? "fixed",
    startTime:
      data.startTime instanceof Timestamp
        ? data.startTime.toDate()
        : new Date(data.startTime),
    endTime:
      data.endTime instanceof Timestamp
        ? data.endTime.toDate()
        : new Date(data.endTime),
    entryType: data.entryType ?? "free",
    entryFee: data.entryFee ?? 0,
    status: (data.status as AuctionStatus) ?? "upcoming",
    winnerId: data.winnerId ?? null,
    winningBid: data.winningBid ?? null,
    totalBids: data.totalBids ?? 0,
    totalParticipants: data.totalParticipants ?? 0,
    lastOfferEnabled: data.lastOfferEnabled ?? false,
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

function formToPayload(formData: AuctionFormData, createdBy = "") {
  return {
    productId: formData.productId,
    auctionNumber: Number(formData.auctionNumber),
    startingPrice: Number(formData.startingPrice),
    currentBid: Number(formData.startingPrice), // reset to starting price
    minimumIncrement: Number(formData.minimumIncrement),
    bidType: formData.bidType,
    startTime: Timestamp.fromDate(new Date(formData.startTime)),
    endTime: Timestamp.fromDate(new Date(formData.endTime)),
    entryType: formData.entryType,
    entryFee: formData.entryType === "paid" ? Number(formData.entryFee) : 0,
    status: formData.status,
    lastOfferEnabled: formData.lastOfferEnabled,
    ...(createdBy && { createdBy }),
  };
}

// ─── FETCH ALL ────────────────────────────────────────────────────────────────

export async function fetchAuctions(): Promise<Auction[]> {
  const snap = await getDocs(collection(db, COLLECTION));
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
  const now = new Date();

  return {
    id: docRef.id,
    productId: formData.productId,
    auctionNumber: Number(formData.auctionNumber),
    startingPrice: Number(formData.startingPrice),
    currentBid: Number(formData.startingPrice),
    minimumIncrement: Number(formData.minimumIncrement),
    bidType: formData.bidType,
    startTime: new Date(formData.startTime),
    endTime: new Date(formData.endTime),
    entryType: formData.entryType,
    entryFee: formData.entryType === "paid" ? Number(formData.entryFee) : 0,
    status: formData.status,
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

  await updateDoc(doc(db, COLLECTION, id), payload);

  const now = new Date();
  return {
    id,
    productId: formData.productId,
    auctionNumber: Number(formData.auctionNumber),
    startingPrice: Number(formData.startingPrice),
    currentBid: Number(formData.startingPrice),
    minimumIncrement: Number(formData.minimumIncrement),
    bidType: formData.bidType,
    startTime: new Date(formData.startTime),
    endTime: new Date(formData.endTime),
    entryType: formData.entryType,
    entryFee: formData.entryType === "paid" ? Number(formData.entryFee) : 0,
    status: formData.status,
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
  await deleteDoc(doc(db, COLLECTION, id));
}

// ─── UPDATE STATUS ────────────────────────────────────────────────────────────

export async function updateAuctionStatus(
  id: string,
  status: AuctionStatus,
): Promise<void> {
  await updateDoc(doc(db, COLLECTION, id), {
    status,
    updatedAt: serverTimestamp(),
  });
}