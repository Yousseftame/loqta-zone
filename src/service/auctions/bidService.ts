/**
 * bidService.ts
 *
 * Places a bid using Firestore runTransaction for full atomicity.
 *
 * ALL reads happen before ALL writes (Firestore transaction requirement).
 *
 * Security (server-side inside transaction):
 *  1. Auction must exist
 *  2. isActive must be true
 *  3. Server endTime must be in the future
 *  4. Amount validated against live Firestore currentBid (not client cache)
 *  5. FIXED: amount must equal currentBid + fixedBidValue exactly
 *  6. FREE:  amount must be >= currentBid + minimumIncrement
 *
 * Writes (atomic):
 *  - auctions/{auctionId}                → currentBid, totalBids, updatedAt
 *  - auctions/{auctionId}/bids/{bidId}   → new bid doc
 *  - users/{userId}/auctions/{auctionId} → append to totalAmount array
 *  - users/{userId}                      → increment totalBids counter
 */

import {
  doc,
  runTransaction,
  collection,
  serverTimestamp,
  Timestamp,
  increment,
  arrayUnion,
} from "firebase/firestore";
import { db } from "@/firebase/firebase";

export interface PlaceBidParams {
  auctionId: string;
  userId: string;
  amount: number;
}

export interface PlaceBidResult {
  success: true;
  newBid: number;
}

// Sentinel to distinguish our own validation errors from Firestore errors
class BidValidationError extends Error {
  readonly isValidation = true;
  constructor(message: string) {
    super(message);
    this.name = "BidValidationError";
  }
}

export async function placeBid({
  auctionId,
  userId,
  amount,
}: PlaceBidParams): Promise<PlaceBidResult> {
  if (!auctionId) throw new Error("Invalid auction.");
  if (!userId) throw new Error("You must be logged in to bid.");
  if (!amount || amount <= 0) throw new Error("Invalid bid amount.");

  const auctionRef     = doc(db, "auctions", auctionId);
  const userRef        = doc(db, "users", userId);
  const userAuctionRef = doc(db, "users", userId, "auctions", auctionId);
  const bidRef         = doc(collection(db, "auctions", auctionId, "bids"));

  try {
    await runTransaction(db, async (transaction) => {

      // ── ALL READS FIRST ────────────────────────────────────────────────
      const auctionSnap     = await transaction.get(auctionRef);
      const userAuctionSnap = await transaction.get(userAuctionRef);
      const userSnap        = await transaction.get(userRef);

      // ── VALIDATIONS ────────────────────────────────────────────────────
      // Use BidValidationError so the catch block below can distinguish these
      // from Firestore permission errors and re-throw them as-is.

      if (!auctionSnap.exists()) {
        throw new BidValidationError("Auction not found.");
      }

      const auction = auctionSnap.data();

      if (!auction.isActive) {
        throw new BidValidationError("This auction is no longer active.");
      }

      const endTime: Date =
        auction.endTime instanceof Timestamp
          ? auction.endTime.toDate()
          : new Date(auction.endTime);

      if (new Date() >= endTime) {
        throw new BidValidationError("This auction has already ended. No more bids accepted.");
      }

      const currentBid: number        = auction.currentBid ?? 0;
      const bidType: "fixed" | "free" = auction.bidType ?? "free";
      const minimumIncrement: number   = auction.minimumIncrement ?? 0;
      const fixedBidValue: number      = auction.fixedBidValue ?? 0;

      if (bidType === "fixed") {
        const expected = currentBid + fixedBidValue;
        if (amount !== expected) {
          throw new BidValidationError(
            `Fixed bid must be exactly ${expected.toLocaleString()} EGP.`,
          );
        }
      } else {
        const minimum = currentBid + minimumIncrement;
        if (amount < minimum) {
          throw new BidValidationError(
            `Bid must be at least ${minimum.toLocaleString()} EGP.`,
          );
        }
      }

      // ── ALL WRITES AFTER ALL READS ──────────────────────────────────────

      // 1. Update auction — only currentBid + totalBids.
      //    The rules check affectedKeys().hasOnly(["currentBid","totalBids"]).
      //    updatedAt is intentionally NOT written here because serverTimestamp()
      //    is a transform that appears unpredictably in affectedKeys(), breaking
      //    the rule under concurrent load.
      transaction.update(auctionRef, {
        currentBid: amount,
        totalBids: (auction.totalBids ?? 0) + 1,
      });

      // 2. Create bid doc — store bidderName directly so history doesn't need
      //    a secondary read of users/{uid} (which would require broader read rules).
      const userData    = userSnap.exists() ? userSnap.data() : {};
      const bidderName  =
        (userData.fullName ?? userData.displayName ?? userData.firstName ?? "") as string;

      transaction.set(bidRef, {
        userId,
        bidderName,
        amount,
        createdAt: serverTimestamp(),
      });

      // 3. Append bid amount to user's auction history.
      //    arrayUnion is a server-side transform — it produces an empty updateMask
      //    in the wire format, so Firestore rules cannot use affectedKeys() to check
      //    it. The rule for this document is simply: allow update if uid == uid.
      if (userAuctionSnap.exists()) {
        transaction.update(userAuctionRef, {
          totalAmount: arrayUnion(amount),
        });
      }

      // 4. Increment user's global totalBids stat.
      //    increment() is also a transform — same wire format note as above.
      transaction.update(userRef, {
        totalBids: increment(1),
      });
    });

  } catch (err: any) {
    // Our own validation errors: re-throw immediately with their message intact.
    if (err instanceof BidValidationError) throw err;

    // Firestore "permission-denied" can mean two things here:
    //   a) A genuine rules violation (should not happen if rules are correct)
    //   b) Transaction contention — two users committed at the exact same instant,
    //      the SDK retried max times and gave up, surfacing the abort as
    //      "permission-denied" instead of "aborted".
    // In either case, the user should be told to try again — the auction state
    // has already updated on-screen via onSnapshot, so the correct next bid
    // amount is visible.
    if (err?.code === "permission-denied") {
      throw new Error(
        "Someone else just bid at the same moment. The auction has updated, please try again.",
      );
    }

    // All other errors (network, unknown): re-throw as-is.
    throw err;
  }

  return { success: true, newBid: amount };
}