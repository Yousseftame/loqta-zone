/**
 * src/service/auctions/joinAuctionService.ts
 *
 * Handles joining an auction (registration only, no voucher).
 *
 * Voucher application is a SEPARATE step done via the applyVoucher Cloud Function
 * AFTER the user has joined. This separation means:
 *   - Join is fast and simple
 *   - Voucher application is atomic and enforceable server-side
 *   - If voucher fails, the user is still registered (they just pay full price)
 *
 * Flow:
 *   1. joinAuctions()     → registers user, sets voucherUsed: false, amount: entryFee
 *   2. applyVoucher CF    → updates voucherUsed: true, amount: effectiveFee
 *
 * Both steps are separated — joinAuctions never touches vouchers.
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
  id:        string;
  entryType: "free" | "paid";
  entryFee:  number;
}

export interface JoinResult {
  joined:  string[];
  skipped: string[];
  errors:  string[];
}

function generateSimulatedPaymentId(): string {
  const ts   = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `SIM_${ts}_${rand}`;
}

interface ValidationResult {
  valid:   boolean;
  reason?: string;
  fatal?:  boolean;
}

async function validateAuctionJoin(
  auctionId: string,
  userId:    string,
): Promise<ValidationResult> {
  const auctionSnap = await getDoc(doc(db, "auctions", auctionId));
  if (!auctionSnap.exists()) {
    return { valid: false, reason: "Auction does not exist" };
  }

  const data = auctionSnap.data();
  if (!data.isActive) return { valid: false, reason: "Auction is not active" };

  const endTime: Date =
    data.endTime instanceof Timestamp ? data.endTime.toDate() : new Date(data.endTime);
  if (new Date() > endTime) return { valid: false, reason: "Auction has already ended" };

  const participantSnap = await getDoc(
    doc(db, "auctions", auctionId, "Participants", userId),
  );
  if (participantSnap.exists()) {
    return { valid: false, reason: "Already joined this auction" };
  }

  const restrictedSnap = await getDoc(
    doc(db, "auctions", auctionId, "restricted", userId),
  );
  if (restrictedSnap.exists()) {
    return {
      valid:  false,
      fatal:  true,
      reason: "You have been restricted from joining this auction. Please contact support.",
    };
  }

  return { valid: true };
}

export async function joinAuctions(
  userId:   string,
  auctions: AuctionToJoin[],
): Promise<JoinResult> {
  if (!userId)        throw new Error("User must be authenticated to join auctions");
  if (!auctions.length) throw new Error("No auctions selected");

  const result: JoinResult = { joined: [], skipped: [], errors: [] };
  const validAuctions: AuctionToJoin[] = [];

  for (const auction of auctions) {
    try {
      const v = await validateAuctionJoin(auction.id, userId);
      if (v.valid) {
        validAuctions.push(auction);
      } else {
        console.warn(`[joinAuctions] Skipping ${auction.id}: ${v.reason}`);
        result.skipped.push(auction.id);
        if (v.fatal) throw new Error(v.reason);
      }
    } catch (err: any) {
      if (err?.message?.includes("restricted")) throw err;
      result.errors.push(auction.id);
    }
  }

  if (validAuctions.length === 0) return result;

  const batch     = writeBatch(db);
  const joinedAt  = serverTimestamp();
  const paymentId = generateSimulatedPaymentId();

  for (const auction of validAuctions) {
    const entryFee = auction.entryType === "paid" ? auction.entryFee : 0;

    // users/{uid}/auctions/{auctionId}
    // Voucher fields start as false/null — applyVoucher CF will update them
    batch.set(doc(db, "users", userId, "auctions", auction.id), {
      auctionId:       auction.id,
      amount:          entryFee,     // will be overwritten by applyVoucher if voucher used
      originalAmount:  entryFee,     // immutable audit trail
      hasPaid:         true,
      joinedAt,
      paymentId,
      totalAmount:     [],
      voucherUsed:     false,
      voucherId:       null,
      voucherCode:     null,
      discountApplied: 0,
    });

    // auctions/{auctionId}/Participants/{uid}
    batch.set(doc(db, "auctions", auction.id, "Participants", userId), {
      auctionId:       auction.id,
      userId,
      hasPaid:         true,
      joinedAt,
      paymentId,
      voucherUsed:     false,
      voucherId:       null,
      voucherCode:     null,
      discountApplied: 0,
    });

    // auctions/{auctionId} → increment totalParticipants
    batch.update(doc(db, "auctions", auction.id), {
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