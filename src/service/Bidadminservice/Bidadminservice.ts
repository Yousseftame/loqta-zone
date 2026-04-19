/**
 * Bidadminservice.ts — updated for i18n product title.
 * fetchProductName now resolves { en, ar } objects as well as legacy strings.
 */

import {
  collection, doc, getDocs, getDoc, deleteDoc, updateDoc, writeBatch,
  query, orderBy, serverTimestamp, Timestamp, type UpdateData,
} from "firebase/firestore";
import { db } from "@/firebase/firebase";
import type { Bid, BidUpdateData } from "@/pages/Admin/Biding/Bids-data";
import { resolveTitle } from "@/pages/Admin/Products/products-data";

function docToBid(auctionId: string, id: string, data: Record<string, any>): Bid {
  return {
    id, auctionId,
    userId:          data.userId          ?? "",
    bidderName:      data.bidderName      ?? "",
    amount:          data.amount          ?? 0,
    createdAt:
      data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(data.createdAt ?? Date.now()),
    status:          data.status          ?? "pending",
    selectedbyAdmin: data.selectedbyAdmin ?? false,
  };
}

export async function fetchUserName(uid: string): Promise<string> {
  try {
    const snap = await getDoc(doc(db, "users", uid));
    if (!snap.exists()) return "Unknown";
    const d = snap.data();
    return d.fullName ?? d.displayName ?? d.firstName ?? "Unknown";
  } catch { return "Unknown"; }
}

export async function fetchProductName(productId: string): Promise<string> {
  try {
    const snap = await getDoc(doc(db, "products", productId));
    if (!snap.exists()) return "";
    // ← i18n: resolve { en, ar } or legacy string
    return resolveTitle(snap.data()?.title, "en");
  } catch { return ""; }
}

export async function fetchBidsForAuction(auctionId: string): Promise<Bid[]> {
  const q    = query(collection(db, "auctions", auctionId, "bids"), orderBy("amount", "desc"));
  const snap = await getDocs(q);
  const bids = snap.docs.map((d) => docToBid(auctionId, d.id, d.data()));

  const missingNameIds = [...new Set(bids.filter((b) => !b.bidderName).map((b) => b.userId))];
  const nameMap: Record<string, string> = {};
  await Promise.all(missingNameIds.map(async (uid) => { nameMap[uid] = await fetchUserName(uid); }));

  return bids.map((b) => ({ ...b, bidderName: b.bidderName || nameMap[b.userId] || "Unknown" }));
}

export async function fetchBid(auctionId: string, bidId: string): Promise<Bid | null> {
  const snap = await getDoc(doc(db, "auctions", auctionId, "bids", bidId));
  if (!snap.exists()) return null;
  return docToBid(auctionId, snap.id, snap.data());
}

export async function updateBid(
  auctionId: string,
  bidId: string,
  data: BidUpdateData,
  bid?: Pick<Bid, "userId" | "amount">,
): Promise<void> {
  const shouldPromoteWinner = data.selectedbyAdmin === true && data.status === "accepted" && bid !== undefined;

  if (shouldPromoteWinner && bid) {
    const batch = writeBatch(db);
    batch.update(doc(db, "auctions", auctionId, "bids", bidId), data as UpdateData<BidUpdateData>);
    batch.update(doc(db, "auctions", auctionId), { winnerId: bid.userId, winningBid: bid.amount, updatedAt: serverTimestamp() });
    await batch.commit();
  } else {
    await updateDoc(doc(db, "auctions", auctionId, "bids", bidId), data as UpdateData<BidUpdateData>);
  }
}

export async function deleteBid(auctionId: string, bidId: string): Promise<void> {
  await deleteDoc(doc(db, "auctions", auctionId, "bids", bidId));
}