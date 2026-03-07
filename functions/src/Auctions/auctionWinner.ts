/**
 * functions/src/Auctions/auctionWinner.ts
 *
 * ─── Architecture ────────────────────────────────────────────────────────────
 *
 * TWO functions — zero wasted polling:
 *
 * 1. onBidWritten  (Firestore trigger)
 *    Fires the instant ANY document is written inside
 *    auctions/{auctionId}/bids/{bidId}.
 *    Checks: has endTime passed on this auction?
 *      YES → resolve winner immediately.
 *      NO  → do nothing (bid was placed during live auction, normal flow).
 *
 *    Cost: 1 read + 1 transaction per bid — exactly what you'd already pay
 *    to update the auction doc in bidService.ts. No extra overhead.
 *    The winner is determined within ~1 second of the auction ending.
 *
 * 2. resolveAuctionWinners  (Scheduled — every 10 minutes, safety net only)
 *    Catches any auction that onBidWritten missed:
 *      - Auctions that ended with ZERO bids (no bid write = no trigger)
 *      - Cold-start failures or transient errors in onBidWritten
 *    Reads only auctions where endTime <= now AND winnerId == null.
 *    If none exist: 1 lightweight query read, nothing else.
 *    Typical cost per run: ~1 read. Negligible.
 *
 * ─── Why not ONLY the trigger? ───────────────────────────────────────────────
 *    If an auction ends with no bids, no bid is ever written, so onBidWritten
 *    never fires. The safety net closes those auctions. Without it they'd sit
 *    open forever with isActive=true.
 *
 * ─── Idempotency ─────────────────────────────────────────────────────────────
 *    Both functions use a Firestore transaction that re-reads winnerId inside
 *    the transaction. If it's already set, the function exits immediately.
 *    Safe to run concurrently or multiple times.
 */

import { onDocumentWritten } from "firebase-functions/v2/firestore";
import { onSchedule }        from "firebase-functions/v2/scheduler";
import { getFirestore, FieldValue, Timestamp } from "firebase-admin/firestore";

const db = getFirestore();

// ─── Shared helper ────────────────────────────────────────────────────────────

/**
 * resolveWinnerForAuction
 *
 * Core logic used by both functions.
 * Reads the highest bid, then runs a transaction to set winnerId + winningBid.
 * Fully idempotent — exits early if winnerId is already set.
 */
async function resolveWinnerForAuction(auctionId: string): Promise<void> {
  const auctionRef = db.collection("auctions").doc(auctionId);

  // Quick pre-check before opening a transaction (saves a transaction attempt
  // if this auction has already been resolved by a concurrent invocation)
  const preCheck = await auctionRef.get();
  if (!preCheck.exists) return;

  const preData = preCheck.data()!;
  if (preData.winnerId !== null && preData.winnerId !== undefined) {
    console.log(`[winner] Auction ${auctionId} already resolved — skipping.`);
    return;
  }

  // Check endTime BEFORE opening a transaction
  const endTime: Date = preData.endTime instanceof Timestamp
    ? preData.endTime.toDate()
    : new Date(preData.endTime);

  if (new Date() < endTime) {
    // Auction hasn't ended yet — bid was placed during live window, normal flow
    return;
  }

  // Fetch the highest bid (outside transaction — read-only, no contention risk)
  const bidsSnap = await db
    .collection("auctions")
    .doc(auctionId)
    .collection("bids")
    .orderBy("amount", "desc")
    .limit(1)
    .get();

  // Transaction: re-read auction to guard against concurrent resolution
  await db.runTransaction(async (transaction) => {
    const freshSnap = await transaction.get(auctionRef);
    if (!freshSnap.exists) return;

    const fresh = freshSnap.data()!;

    // Idempotency guard inside transaction
    if (fresh.winnerId !== null && fresh.winnerId !== undefined) {
      console.log(`[winner] Auction ${auctionId} resolved by concurrent run — skipping.`);
      return;
    }

    if (bidsSnap.empty) {
      // ── No bids — close with no winner ──────────────────────────────────
      transaction.update(auctionRef, {
        winnerId:  "NO_WINNER",
        winningBid: 0,
        isActive:  false,
        updatedAt: FieldValue.serverTimestamp(),
      });
      console.log(`[winner] Auction ${auctionId} → NO_WINNER (no bids).`);
      return;
    }

    // ── Winner found ─────────────────────────────────────────────────────
    const topBid     = bidsSnap.docs[0].data();
    const winnerId   = topBid.userId   as string;
    const winningBid = topBid.amount   as number;

    // Update auction
    transaction.update(auctionRef, {
      winnerId,
      winningBid,
      isActive:  false,
      updatedAt: FieldValue.serverTimestamp(),
    });

    // Increment winner's totalWins stat
    const winnerRef = db.collection("users").doc(winnerId);
    transaction.update(winnerRef, {
      totalWins: FieldValue.increment(1),
    });

    console.log(`[winner] Auction ${auctionId} → winner=${winnerId} bid=${winningBid}`);
  });
}

// ─── Function 1: Firestore trigger ───────────────────────────────────────────
//
// Fires on every bid write (create/update/delete).
// Checks if the auction's endTime has passed — if so, resolves the winner.
// This covers the most common case: someone places the last bid right before or
// after time expires, or a bid write happens just as the clock hits zero.

export const onBidWritten = onDocumentWritten(
  {
    document:      "auctions/{auctionId}/bids/{bidId}",
    timeoutSeconds: 60,
    memory:        "256MiB",
  },
  async (event) => {
    const auctionId = event.params.auctionId;

    try {
      await resolveWinnerForAuction(auctionId);
    } catch (err) {
      console.error(`[onBidWritten] Error for auction ${auctionId}:`, err);
    }
  },
);

// ─── Function 2: Scheduled safety net ────────────────────────────────────────
//
// Runs every 10 minutes. Catches:
//   - Auctions that ended with ZERO bids (trigger never fires)
//   - Any auction the trigger missed due to transient errors
//
// Typical execution when everything is healthy:
//   1 Firestore list query → empty result → function exits.
//   Cost: ~1 document read per 10 minutes. Negligible.

export const resolveAuctionWinners = onSchedule(
  {
    schedule:       "every 10 minutes",
    timeoutSeconds: 120,
    memory:         "256MiB",
  },
  async () => {
    const now = new Date();

    const auctionsSnap = await db
      .collection("auctions")
      .where("endTime",  "<=", now)
      .where("winnerId", "==", null)
      .where("isActive", "==", true)
      .get();

    if (auctionsSnap.empty) {
      console.log("[resolveAuctionWinners] Nothing to resolve.");
      return;
    }

    console.log(`[resolveAuctionWinners] Resolving ${auctionsSnap.size} missed auction(s).`);

    await Promise.allSettled(
      auctionsSnap.docs.map((doc) =>
        resolveWinnerForAuction(doc.id).catch((err) =>
          console.error(`[resolveAuctionWinners] Error for ${doc.id}:`, err),
        ),
      ),
    );

    console.log("[resolveAuctionWinners] Done.");
  },
);