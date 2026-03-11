/**
 * Bidadminservice.ts
 *
 * Admin service for reading and managing bids subcollections across auctions.
 * Firestore path: auctions/{auctionId}/bids/{bidId}
 *
 * ─── Bid winner-promotion logic ──────────────────────────────────────────────
 * When admin sets selectedbyAdmin=true AND status="accepted" on a bid, this
 * service ALSO atomically writes { winnerId, winningBid } to the parent
 * auctions/{auctionId} document — identical to the Last Offer system.
 *
 * Use case: no participant submitted a last offer, so admin manually picks the
 * second-highest bid (or any bid) as the override winner.
 *
 * Both writes are committed in a single Firestore writeBatch.
 */

import {
  collection,
  doc,
  getDocs,
  getDoc,
  deleteDoc,
  updateDoc,
  writeBatch,
  query,
  orderBy,
  serverTimestamp,
  Timestamp,
  type UpdateData,
} from "firebase/firestore";
import { db } from "@/firebase/firebase";
import type { Bid, BidUpdateData } from "@/pages/Admin/Biding/Bids-data";

// ─── Helper ───────────────────────────────────────────────────────────────────

function docToBid(auctionId: string, id: string, data: Record<string, any>): Bid {
  return {
    id,
    auctionId,
    userId:      data.userId      ?? "",
    bidderName:  data.bidderName  ?? "",
    amount:      data.amount      ?? 0,
    createdAt:
      data.createdAt instanceof Timestamp
        ? data.createdAt.toDate()
        : new Date(data.createdAt ?? Date.now()),
    // Graceful defaults for docs written before this feature existed
    status:          data.status          ?? "pending",
    selectedbyAdmin: data.selectedbyAdmin ?? false,
  };
}

// ─── Fetch user full name ─────────────────────────────────────────────────────

export async function fetchUserName(uid: string): Promise<string> {
  try {
    const snap = await getDoc(doc(db, "users", uid));
    if (!snap.exists()) return "Unknown";
    const d = snap.data();
    return d.fullName ?? d.displayName ?? d.firstName ?? "Unknown";
  } catch {
    return "Unknown";
  }
}

// ─── Fetch product title ──────────────────────────────────────────────────────

export async function fetchProductName(productId: string): Promise<string> {
  try {
    const snap = await getDoc(doc(db, "products", productId));
    if (!snap.exists()) return "";
    return snap.data().title ?? "";
  } catch {
    return "";
  }
}

// ─── Fetch ALL bids for an auction ────────────────────────────────────────────
// Sorted by amount DESC so rank 1 = highest bid, rank 2 = second-highest, etc.

export async function fetchBidsForAuction(auctionId: string): Promise<Bid[]> {
  const q = query(
    collection(db, "auctions", auctionId, "bids"),
    orderBy("amount", "desc"),
  );
  const snap = await getDocs(q);
  const bids = snap.docs.map((d) => docToBid(auctionId, d.id, d.data()));

  // Resolve names for legacy docs that have no bidderName stored
  const missingNameIds = [...new Set(
    bids.filter((b) => !b.bidderName).map((b) => b.userId),
  )];
  const nameMap: Record<string, string> = {};
  await Promise.all(
    missingNameIds.map(async (uid) => { nameMap[uid] = await fetchUserName(uid); }),
  );

  return bids.map((b) => ({
    ...b,
    bidderName: b.bidderName || nameMap[b.userId] || "Unknown",
  }));
}

// ─── Fetch ONE bid ────────────────────────────────────────────────────────────

export async function fetchBid(auctionId: string, bidId: string): Promise<Bid | null> {
  const snap = await getDoc(doc(db, "auctions", auctionId, "bids", bidId));
  if (!snap.exists()) return null;
  return docToBid(auctionId, snap.id, snap.data());
}

// ─── UPDATE bid — with optional atomic winner promotion ───────────────────────
//
//   updateBid(auctionId, bidId, data, bid?)
//
// When data.selectedbyAdmin === true AND data.status === "accepted",
// ALSO promotes bid.userId/bid.amount as the auction winner via writeBatch.
// `bid` must be passed from the UI (always available there).
// If omitted (defensive), only the bid doc is updated — no winner change.

export async function updateBid(
  auctionId: string,
  bidId: string,
  data: BidUpdateData,
  bid?: Pick<Bid, "userId" | "amount">,
): Promise<void> {
  const shouldPromoteWinner =
    data.selectedbyAdmin === true &&
    data.status === "accepted" &&
    bid !== undefined;

  if (shouldPromoteWinner && bid) {
    const batch = writeBatch(db);

    // 1. Update the bid doc
    batch.update(
      doc(db, "auctions", auctionId, "bids", bidId),
      data as UpdateData<BidUpdateData>,
    );

    // 2. Override the auction winner atomically
    batch.update(doc(db, "auctions", auctionId), {
      winnerId:   bid.userId,
      winningBid: bid.amount,
      updatedAt:  serverTimestamp(),
    });

    await batch.commit();

    console.info(
      `[BidAdminService] Winner promoted from bid — auction=${auctionId}` +
      ` uid=${bid.userId} amount=${bid.amount}`,
    );
  } else {
    await updateDoc(
      doc(db, "auctions", auctionId, "bids", bidId),
      data as UpdateData<BidUpdateData>,
    );
  }
}

// ─── DELETE bid ───────────────────────────────────────────────────────────────

export async function deleteBid(auctionId: string, bidId: string): Promise<void> {
  await deleteDoc(doc(db, "auctions", auctionId, "bids", bidId));
}