/**
 * src/service/Participantservice/Participantservice.ts
 *
 * i18n change: fetchProductName() now resolves { en, ar } objects as well
 * as legacy plain strings.
 */

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
import type { Participant } from "@/pages/Admin/Participants/Participants-data";
import { resolveProductTitle } from "@/lib/resolveLocalized";

// ─── Helper ───────────────────────────────────────────────────────────────────

function docToParticipant(auctionId: string, id: string, data: Record<string, any>): Participant {
  return {
    id,
    auctionId: data.auctionId ?? auctionId,
    userId: data.userId ?? id,
    fullName: "",
    hasPaid: data.hasPaid ?? false,
    joinedAt:
      data.joinedAt instanceof Timestamp
        ? data.joinedAt.toDate()
        : new Date(data.joinedAt ?? Date.now()),
    paymentId: data.paymentId ?? "",
    voucherUsed: data.voucherUsed ?? false,
  };
}

// ─── Fetch user full name from /users/{uid} ───────────────────────────────────

export async function fetchUserName(uid: string): Promise<string> {
  try {
    const snap = await getDoc(doc(db, "users", uid));
    if (!snap.exists()) return "Unknown";
    return snap.data().fullName || "Unknown";
  } catch {
    return "Unknown";
  }
}

// ─── Fetch product title from /products/{productId} ──────────────────────────
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

// ─── FETCH ALL participants for an auction (with resolved names) ──────────────

export async function fetchParticipantsForAuction(auctionId: string): Promise<Participant[]> {
  const q = query(
    collection(db, "auctions", auctionId, "Participants"),
    orderBy("joinedAt", "desc"),
  );
  const snap = await getDocs(q);
  const participants = snap.docs.map((d) => docToParticipant(auctionId, d.id, d.data()));

  const uniqueUserIds = [...new Set(participants.map((p) => p.userId))];
  const nameMap: Record<string, string> = {};
  await Promise.all(
    uniqueUserIds.map(async (uid) => {
      nameMap[uid] = await fetchUserName(uid);
    }),
  );

  return participants.map((p) => ({
    ...p,
    fullName: nameMap[p.userId] || "Unknown",
  }));
}

// ─── FETCH ONE participant ────────────────────────────────────────────────────

export async function fetchParticipant(
  auctionId: string,
  participantId: string,
): Promise<Participant | null> {
  const snap = await getDoc(
    doc(db, "auctions", auctionId, "Participants", participantId),
  );
  if (!snap.exists()) return null;
  return docToParticipant(auctionId, snap.id, snap.data());
}

// ─── DELETE participant ───────────────────────────────────────────────────────

export async function deleteParticipant(
  auctionId: string,
  participantId: string,
): Promise<void> {
  await deleteDoc(doc(db, "auctions", auctionId, "Participants", participantId));
}