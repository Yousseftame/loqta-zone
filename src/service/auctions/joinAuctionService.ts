/**
 * joinAuctionService.ts
 *
 * Handles the full "join auction" flow after simulated payment.
 *
 * Security checks (server-side, before any write):
 *  1. User must be authenticated
 *  2. Auction must exist
 *  3. Auction must be isActive === true
 *  4. Auction endTime must be in the future
 *  5. User must NOT already be a Participant
 *  6. ✅ NEW: User must NOT be in auctions/{id}/restricted/{uid} subcollection
 *
 * Writes (single atomic batch):
 *  - users/{userId}/auctions/{auctionId}        ← user's participation record
 *  - auctions/{auctionId}/Participants/{userId}  ← auction's participant record
 *  - auctions/{auctionId}                        ← increment totalParticipants
 */

import {
  doc,
  getDoc,
  writeBatch,
  serverTimestamp,
  increment,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/firebase/firebase";

export interface AuctionToJoin {
  id: string;
  entryType: "free" | "paid";
  entryFee: number;
}

export interface JoinResult {
  joined: string[];
  skipped: string[];
  errors: string[];
}

function generateSimulatedPaymentId(): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `SIM_${ts}_${rand}`;
}

interface ValidationResult {
  valid: boolean;
  reason?: string;
}

async function validateAuctionJoin(
  auctionId: string,
  userId: string,
): Promise<ValidationResult> {
  const auctionRef = doc(db, "auctions", auctionId);
  const auctionSnap = await getDoc(auctionRef);

  if (!auctionSnap.exists()) {
    return { valid: false, reason: "Auction does not exist" };
  }

  const data = auctionSnap.data();

  if (!data.isActive) {
    return { valid: false, reason: "Auction is not active" };
  }

  const endTime: Date =
    data.endTime instanceof Timestamp
      ? data.endTime.toDate()
      : new Date(data.endTime);

  if (new Date() > endTime) {
    return { valid: false, reason: "Auction has already ended" };
  }

  // Check if already a participant
  const participantRef = doc(db, "auctions", auctionId, "Participants", userId);
  const participantSnap = await getDoc(participantRef);
  if (participantSnap.exists()) {
    return { valid: false, reason: "Already joined this auction" };
  }

  // ✅ NEW: Check if user is restricted from this auction
  const restrictedRef = doc(db, "auctions", auctionId, "restricted", userId);
  const restrictedSnap = await getDoc(restrictedRef);
  if (restrictedSnap.exists()) {
    return {
      valid: false,
      reason: "You have been restricted from joining this auction. Please contact support.",
    };
  }

  return { valid: true };
}

export async function joinAuctions(
  userId: string,
  auctions: AuctionToJoin[],
): Promise<JoinResult> {
  if (!userId) throw new Error("User must be authenticated to join auctions");
  if (!auctions.length) throw new Error("No auctions selected");

  const result: JoinResult = { joined: [], skipped: [], errors: [] };

  const validAuctions: AuctionToJoin[] = [];

  for (const auction of auctions) {
    try {
      const validation = await validateAuctionJoin(auction.id, userId);
      if (validation.valid) {
        validAuctions.push(auction);
      } else {
        console.warn(`[joinAuctions] Skipping ${auction.id}: ${validation.reason}`);
        result.skipped.push(auction.id);
        // Surface restriction error to the UI
        if (validation.reason?.includes("restricted")) {
          throw new Error(validation.reason);
        }
      }
    } catch (err: any) {
      // Re-throw restriction errors so the UI can show them
      if (err?.message?.includes("restricted")) throw err;
      console.error(`[joinAuctions] Validation error for ${auction.id}:`, err);
      result.errors.push(auction.id);
    }
  }

  if (validAuctions.length === 0) {
    return result;
  }

  const batch = writeBatch(db);
  const joinedAt = serverTimestamp();
  const paymentId = generateSimulatedPaymentId();

  for (const auction of validAuctions) {
    const entryFee = auction.entryType === "paid" ? auction.entryFee : 0;

    const userAuctionRef = doc(db, "users", userId, "auctions", auction.id);
    batch.set(userAuctionRef, {
      auctionId: auction.id,
      amount: entryFee,
      hasPaid: true,
      joinedAt,
      paymentId,
      totalAmount: [],
      voucherUsed: false,
    });

    const participantRef = doc(db, "auctions", auction.id, "Participants", userId);
    batch.set(participantRef, {
      auctionId: auction.id,
      userId,
      hasPaid: true,
      joinedAt,
      paymentId,
      voucherUsed: false,
    });

    const auctionRef = doc(db, "auctions", auction.id);
    batch.update(auctionRef, {
      totalParticipants: increment(1),
    });
  }

  try {
    await batch.commit();
    result.joined = validAuctions.map((a) => a.id);
  } catch (err) {
    console.error("[joinAuctions] Batch commit failed:", err);
    throw new Error("Failed to complete registration. Please try again.");
  }

  return result;
}