/**
 * joinAuctionService.ts
 *
 * Handles the full "join auction" flow after simulated payment.
 *
 * Security checks (server-side, before any write):
 *  1. User must be authenticated (caller must pass uid)
 *  2. Auction must exist
 *  3. Auction must be isActive === true
 *  4. Auction status must NOT be "ended" (endTime > now)
 *  5. User must NOT already be a Participant in that auction
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

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AuctionToJoin {
  id: string;
  entryType: "free" | "paid";
  entryFee: number;
}

export interface JoinResult {
  joined: string[];   // auction IDs successfully joined
  skipped: string[];  // auction IDs skipped (already joined or failed security)
  errors: string[];   // auction IDs that had unexpected errors
}

// ─── Simulated payment ID generator ──────────────────────────────────────────
// Replace this with the real gateway's transaction ID when payment is ready.

function generateSimulatedPaymentId(): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `SIM_${ts}_${rand}`;
}

// ─── Security validator (per auction) ────────────────────────────────────────

interface ValidationResult {
  valid: boolean;
  reason?: string;
}

async function validateAuctionJoin(
  auctionId: string,
  userId: string,
): Promise<ValidationResult> {
  // 1. Fetch auction document
  const auctionRef = doc(db, "auctions", auctionId);
  const auctionSnap = await getDoc(auctionRef);

  if (!auctionSnap.exists()) {
    return { valid: false, reason: "Auction does not exist" };
  }

  const data = auctionSnap.data();

  // 2. Must be active
  if (!data.isActive) {
    return { valid: false, reason: "Auction is not active" };
  }

  // 3. Must not be ended — endTime must be in the future
  const endTime: Date =
    data.endTime instanceof Timestamp
      ? data.endTime.toDate()
      : new Date(data.endTime);

  if (new Date() > endTime) {
    return { valid: false, reason: "Auction has already ended" };
  }

  // 4. User must not already be a Participant
  const participantRef = doc(
    db,
    "auctions",
    auctionId,
    "Participants",
    userId,
  );
  const participantSnap = await getDoc(participantRef);

  if (participantSnap.exists()) {
    return { valid: false, reason: "Already joined this auction" };
  }

  return { valid: true };
}

// ─── Main join function ───────────────────────────────────────────────────────

export async function joinAuctions(
  userId: string,
  auctions: AuctionToJoin[],
): Promise<JoinResult> {
  if (!userId) throw new Error("User must be authenticated to join auctions");
  if (!auctions.length) throw new Error("No auctions selected");

  const result: JoinResult = { joined: [], skipped: [], errors: [] };

  // ── Step 1: Validate all auctions BEFORE writing anything ──────────────────
  // We validate first so we never do a partial batch write on bad data.

  const validAuctions: AuctionToJoin[] = [];

  for (const auction of auctions) {
    try {
      const validation = await validateAuctionJoin(auction.id, userId);
      if (validation.valid) {
        validAuctions.push(auction);
      } else {
        console.warn(
          `[joinAuctions] Skipping auction ${auction.id}: ${validation.reason}`,
        );
        result.skipped.push(auction.id);
      }
    } catch (err) {
      console.error(`[joinAuctions] Validation error for ${auction.id}:`, err);
      result.errors.push(auction.id);
    }
  }

  if (validAuctions.length === 0) {
    // Nothing to write — return early with skipped/error info
    return result;
  }

  // ── Step 2: Build atomic batch ─────────────────────────────────────────────
  // Firestore batch limit is 500 ops. Each auction = 3 ops (2 sets + 1 update).
  // With a realistic max of ~10 auctions per checkout this is always safe.

  const batch = writeBatch(db);
  const joinedAt = serverTimestamp();
  const paymentId = generateSimulatedPaymentId();

  for (const auction of validAuctions) {
    const entryFee = auction.entryType === "paid" ? auction.entryFee : 0;

    // ── Write 1: users/{userId}/auctions/{auctionId} ───────────────────────
    const userAuctionRef = doc(
      db,
      "users",
      userId,
      "auctions",
      auction.id,
    );

    batch.set(userAuctionRef, {
      auctionId: auction.id,
      amount: entryFee,       // entry fee paid to join (0 if free)
      hasPaid: true,
      joinedAt,
      paymentId,
      totalAmount: [],        // bid amounts — populated later when user bids
      voucherUsed: false,
    });

    // ── Write 2: auctions/{auctionId}/Participants/{userId} ────────────────
    const participantRef = doc(
      db,
      "auctions",
      auction.id,
      "Participants",
      userId,
    );

    batch.set(participantRef, {
      auctionId: auction.id,
      userId,
      hasPaid: true,
      joinedAt,
      paymentId,
      voucherUsed: false,
    });

    // ── Write 3: increment auctions/{auctionId}.totalParticipants ──────────
    const auctionRef = doc(db, "auctions", auction.id);

    batch.update(auctionRef, {
      totalParticipants: increment(1),
    });
  }

  // ── Step 3: Commit the batch atomically ────────────────────────────────────
  try {
    await batch.commit();
    result.joined = validAuctions.map((a) => a.id);
  } catch (err) {
    console.error("[joinAuctions] Batch commit failed:", err);
    // If the batch fails, nothing was written — safe to throw
    throw new Error(
      "Failed to complete registration. Please try again.",
    );
  }

  return result;
}