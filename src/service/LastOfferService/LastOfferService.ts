/**
 * LastOfferService.ts
 *
 * Admin service for reading and managing lastOffers subcollections
 * across all auctions.
 *
 * Firestore path: auctions/{auctionId}/lastOffers/{offerId}
 *
 * Fields per offer:
 *  - userId          : string
 *  - amount          : number
 *  - status          : "pending" | "accepted" | "rejected"
 *  - selectedbyAdmin : boolean
 *  - createdAt       : Timestamp
 *
 * ─── Last-offer winner promotion logic ───────────────────────────────────────
 * When an admin sets selectedbyAdmin=true AND status="accepted" on an offer,
 * this service ALSO writes { winnerId, winningBid } back to the parent
 * auctions/{auctionId} document. This overrides the original auction winner
 * with the admin-selected last-offer winner.
 *
 * The two writes (lastOffers update + auction update) are sent as a single
 * Firestore batch so they are atomic — both succeed or both fail.
 *
 * Firestore rule requirement: admins must be allowed to update
 * winnerId + winningBid on ended auctions (see firestore.rules).
 */

import {
  collection,
  doc,
  getDocs,
  getDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  query,
  orderBy,
  serverTimestamp,
  Timestamp,
  type UpdateData,
} from "firebase/firestore";
import { db } from "@/firebase/firebase";

// ─── Types ────────────────────────────────────────────────────────────────────

export type LastOfferStatus = "pending" | "accepted" | "rejected";

export interface LastOffer {
  id: string;
  auctionId: string;
  userId: string;
  userName: string;        // resolved from /users/{uid}
  amount: number;
  status: LastOfferStatus;
  selectedbyAdmin: boolean;
  createdAt: Date;
}

export interface LastOfferUpdateData {
  status?: LastOfferStatus;
  selectedbyAdmin?: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function docToOffer(
  auctionId: string,
  id: string,
  data: Record<string, any>,
): LastOffer {
  return {
    id,
    auctionId,
    userId: data.userId ?? "",
    userName: "", // resolved separately
    amount: data.amount ?? 0,
    status: data.status ?? "pending",
    selectedbyAdmin: data.selectedbyAdmin ?? false,
    createdAt:
      data.createdAt instanceof Timestamp
        ? data.createdAt.toDate()
        : new Date(data.createdAt ?? Date.now()),
  };
}

async function resolveUserName(uid: string): Promise<string> {
  try {
    const snap = await getDoc(doc(db, "users", uid));
    if (!snap.exists()) return "Unknown";
    const d = snap.data();
    return d.fullName ?? d.displayName ?? d.firstName ?? "Unknown";
  } catch {
    return "Unknown";
  }
}

// ─── FETCH ALL last offers for one auction ────────────────────────────────────

export async function fetchLastOffersForAuction(
  auctionId: string,
): Promise<LastOffer[]> {
  const q = query(
    collection(db, "auctions", auctionId, "lastOffers"),
    orderBy("amount", "desc"),
  );
  const snap = await getDocs(q);
  const offers = snap.docs.map((d) => docToOffer(auctionId, d.id, d.data()));

  // Resolve user names in parallel
  const uniqueIds = [...new Set(offers.map((o) => o.userId))];
  const nameMap: Record<string, string> = {};
  await Promise.all(
    uniqueIds.map(async (uid) => {
      nameMap[uid] = await resolveUserName(uid);
    }),
  );

  return offers.map((o) => ({ ...o, userName: nameMap[o.userId] ?? "Unknown" }));
}

// ─── UPDATE a last offer — with optional winner promotion ─────────────────────
//
// Signature:
//   updateLastOffer(auctionId, offerId, updateData, offer?)
//
// When updateData.selectedbyAdmin === true AND updateData.status === "accepted",
// the function also promotes this offer's user as the auction winner by updating:
//   auctions/{auctionId}.winnerId   = offer.userId
//   auctions/{auctionId}.winningBid = offer.amount
//
// Both the lastOffer update and the auction update are committed atomically
// via a Firestore batch.
//
// The `offer` parameter must be supplied when winner promotion could occur
// (i.e. always pass it from the admin UI). If omitted, no promotion happens.

export async function updateLastOffer(
  auctionId: string,
  offerId: string,
  data: LastOfferUpdateData,
  offer?: Pick<LastOffer, "userId" | "amount">,
): Promise<void> {
  const shouldPromoteWinner =
    data.selectedbyAdmin === true &&
    data.status === "accepted" &&
    offer !== undefined;

  if (shouldPromoteWinner && offer) {
    // ── Atomic batch: update lastOffer + promote winner ───────────────────
    const batch = writeBatch(db);

    // 1. Update the lastOffer document (status + selectedbyAdmin)
    batch.update(
      doc(db, "auctions", auctionId, "lastOffers", offerId),
      data as UpdateData<LastOfferUpdateData>,
    );

    // 2. Override the auction winner with the selected last-offer user
    batch.update(doc(db, "auctions", auctionId), {
      winnerId:   offer.userId,
      winningBid: offer.amount,
      updatedAt:  serverTimestamp(),
    });

    await batch.commit();

    console.info(
      `[LastOfferService] Winner promoted for auction ${auctionId}:` +
      ` uid=${offer.userId} amount=${offer.amount}`,
    );
  } else {
    // ── Simple update — no winner change ──────────────────────────────────
    // This handles: status changes alone, deselection, rejection, etc.
    await updateDoc(
      doc(db, "auctions", auctionId, "lastOffers", offerId),
      data as UpdateData<LastOfferUpdateData>,
    );
  }
}

// ─── DELETE a last offer ──────────────────────────────────────────────────────

export async function deleteLastOffer(
  auctionId: string,
  offerId: string,
): Promise<void> {
  await deleteDoc(doc(db, "auctions", auctionId, "lastOffers", offerId));
}

// ─── Fetch product name helper ────────────────────────────────────────────────

export async function fetchProductName(productId: string): Promise<string> {
  try {
    const snap = await getDoc(doc(db, "products", productId));
    if (!snap.exists()) return "";
    return snap.data().title ?? "";
  } catch {
    return "";
  }
}