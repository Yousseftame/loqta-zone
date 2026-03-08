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
 */

import {
  collection,
  doc,
  getDocs,
  getDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
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

// ─── UPDATE a last offer (status + selectedbyAdmin) ───────────────────────────

export async function updateLastOffer(
  auctionId: string,
  offerId: string,
  data: LastOfferUpdateData,
): Promise<void> {
  await updateDoc(
    doc(db, "auctions", auctionId, "lastOffers", offerId),
    data as UpdateData<LastOfferUpdateData>,
  );
}

// ─── DELETE a last offer ──────────────────────────────────────────────────────

export async function deleteLastOffer(
  auctionId: string,
  offerId: string,
): Promise<void> {
  await deleteDoc(doc(db, "auctions", auctionId, "lastOffers", offerId));
}

// ─── Fetch product name helper (reused from other services) ──────────────────

export async function fetchProductName(productId: string): Promise<string> {
  try {
    const snap = await getDoc(doc(db, "products", productId));
    if (!snap.exists()) return "";
    return snap.data().title ?? "";
  } catch {
    return "";
  }
}