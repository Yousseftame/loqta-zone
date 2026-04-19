/**
 * src/service/LastOfferService/LastOfferService.ts
 *
 * i18n change: fetchProductName() now resolves { en, ar } objects as well
 * as legacy plain strings, using resolveProductTitle() from resolveLocalized.
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
import { resolveProductTitle } from "@/lib/resolveLocalized";

// ─── Types ────────────────────────────────────────────────────────────────────

export type LastOfferStatus = "pending" | "accepted" | "rejected";

export interface LastOffer {
  id: string;
  auctionId: string;
  userId: string;
  userName: string;
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
    userName: "",
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
    const batch = writeBatch(db);
    batch.update(
      doc(db, "auctions", auctionId, "lastOffers", offerId),
      data as UpdateData<LastOfferUpdateData>,
    );
    batch.update(doc(db, "auctions", auctionId), {
      winnerId:   offer.userId,
      winningBid: offer.amount,
      updatedAt:  serverTimestamp(),
    });
    await batch.commit();
  } else {
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
// ← i18n FIX: resolves { en, ar } object or legacy plain string

export async function fetchProductName(productId: string): Promise<string> {
  try {
    const snap = await getDoc(doc(db, "products", productId));
    if (!snap.exists()) return "";
    return resolveProductTitle(snap.data()?.title, "");
  } catch {
    return "";
  }
}