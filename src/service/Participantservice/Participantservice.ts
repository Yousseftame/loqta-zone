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

// ─── Helper ───────────────────────────────────────────────────────────────────

function docToParticipant(auctionId: string, id: string, data: Record<string, any>): Participant {
  return {
    id,
    auctionId: data.auctionId ?? auctionId,
    userId: data.userId ?? id,
    hasPaid: data.hasPaid ?? false,
    joinedAt:
      data.joinedAt instanceof Timestamp
        ? data.joinedAt.toDate()
        : new Date(data.joinedAt ?? Date.now()),
    paymentId: data.paymentId ?? "",
    voucherUsed: data.voucherUsed ?? false,
  };
}

// ─── FETCH ALL participants for an auction ────────────────────────────────────

export async function fetchParticipantsForAuction(auctionId: string): Promise<Participant[]> {
  const q = query(
    collection(db, "auctions", auctionId, "Participants"),
    orderBy("joinedAt", "desc"),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => docToParticipant(auctionId, d.id, d.data()));
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