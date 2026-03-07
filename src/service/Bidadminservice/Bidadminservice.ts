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
    bidderName: data.bidderName ?? "Unknown",
    amount: data.amount ?? 0,
    createdAt:
      data.createdAt instanceof Timestamp
        ? data.createdAt.toDate()
        : new Date(data.createdAt ?? Date.now()),
  };
}

// ─── FETCH ALL bids for an auction ────────────────────────────────────────────

export async function fetchBidsForAuction(auctionId: string): Promise<Bid[]> {
  const q = query(
    collection(db, "auctions", auctionId, "bids"),
    orderBy("createdAt", "desc"),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => docToBid(auctionId, d.id, d.data()));
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