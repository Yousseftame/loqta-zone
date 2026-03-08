import {
  collection,
  doc,
  getDocs,
  getDoc,
  deleteDoc,
  query,
  orderBy,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/firebase/firebase";
import type { Bid } from "@/pages/Admin/Biding/Bids-data";

// ─── Helper ───────────────────────────────────────────────────────────────────

function docToBid(auctionId: string, id: string, data: Record<string, any>): Bid {
  return {
    id,
    auctionId,
    userId: data.userId ?? "",
    bidderName: data.bidderName ?? "",
    amount: data.amount ?? 0,
    createdAt:
      data.createdAt instanceof Timestamp
        ? data.createdAt.toDate()
        : new Date(data.createdAt ?? Date.now()),
  };
}

// ─── Fetch user full name from /users/{uid} ───────────────────────────────────

export async function fetchUserName(uid: string): Promise<string> {
  try {
    const snap = await getDoc(doc(db, "users", uid));
    if (!snap.exists()) return "Unknown";
    const data = snap.data();
    return data.fullName || "Unknown";
  } catch {
    return "Unknown";
  }
}

// ─── Fetch product title from /products/{productId} ──────────────────────────

export async function fetchProductName(productId: string): Promise<string> {
  try {
    const snap = await getDoc(doc(db, "products", productId));
    if (!snap.exists()) return "";
    return snap.data().title || "";
  } catch {
    return "";
  }
}

// ─── FETCH ALL bids for an auction (with resolved bidder names) ───────────────

export async function fetchBidsForAuction(auctionId: string): Promise<Bid[]> {
  const q = query(
    collection(db, "auctions", auctionId, "bids"),
    orderBy("createdAt", "desc"),
  );
  const snap = await getDocs(q);
  const bids = snap.docs.map((d) => docToBid(auctionId, d.id, d.data()));

  // Resolve names for bids that are missing bidderName
  const uniqueUserIds = [
    ...new Set(bids.filter((b) => !b.bidderName).map((b) => b.userId)),
  ];
  const nameMap: Record<string, string> = {};
  await Promise.all(
    uniqueUserIds.map(async (uid) => {
      nameMap[uid] = await fetchUserName(uid);
    }),
  );

  return bids.map((b) => ({
    ...b,
    bidderName: b.bidderName || nameMap[b.userId] || "Unknown",
  }));
}

// ─── FETCH ONE bid ────────────────────────────────────────────────────────────

export async function fetchBid(auctionId: string, bidId: string): Promise<Bid | null> {
  const snap = await getDoc(doc(db, "auctions", auctionId, "bids", bidId));
  if (!snap.exists()) return null;
  return docToBid(auctionId, snap.id, snap.data());
}

// ─── DELETE bid ───────────────────────────────────────────────────────────────

export async function deleteBid(auctionId: string, bidId: string): Promise<void> {
  await deleteDoc(doc(db, "auctions", auctionId, "bids", bidId));
}