/**
 * functions/src/Auctions/auctionWinner.ts
 *
 * ─── Architecture: 3 functions, zero wasted polling ──────────────────────────
 *
 * 1. triggerResolveAuction  (HTTP callable)
 *    Called by the FRONTEND countdown timer the instant it hits zero.
 *    Resolves one specific auction by ID. Returns immediately.
 *    Cost: 1 read + 1 transaction. Fires exactly once per auction end.
 *    This is the PRIMARY path — winner appears within ~1-2 seconds of endTime.
 *
 * 2. onBidWritten  (Firestore trigger)
 *    Fires when any bid doc is written. If endTime has passed → resolve.
 *    Handles edge case: bid placed in the final milliseconds, races with endTime.
 *    Cost: 1 read per bid (exits early if endTime not passed yet).
 *
 * 3. resolveAuctionWinners  (Scheduled — every 10 minutes, safety net only)
 *    Catches auctions that ended with ZERO bids (no bid = no trigger) and
 *    any auction where the frontend was closed before calling #1.
 *    When everything is healthy: 1 query read → empty → exits. Negligible cost.
 *
 * ─── Why this approach is zero-polling ───────────────────────────────────────
 *    #1 fires from the client's own countdown — not a server interval.
 *    #2 fires from an actual DB write — not a timer.
 *    #3 is a once-per-10-min fallback, costs 1 read when nothing needs resolving.
 *
 * ─── Idempotency ─────────────────────────────────────────────────────────────
 *    All three share resolveWinnerForAuction(). The transaction re-reads
 *    winnerId inside the transaction body. If already set → exits immediately.
 *    Safe to call from all 3 paths concurrently.
 */

import { onCall, HttpsError }    from "firebase-functions/v2/https";
import { onDocumentWritten }     from "firebase-functions/v2/firestore";
import { onSchedule }            from "firebase-functions/v2/scheduler";
import { getFirestore, FieldValue, Timestamp } from "firebase-admin/firestore";

const db = getFirestore();

// ─── Core shared logic ────────────────────────────────────────────────────────

/**
 * resolveWinnerForAuction
 *
 * Shared by all 3 functions. Fully idempotent.
 * - Pre-checks winnerId and endTime before opening a transaction.
 * - Fetches the top bid outside the transaction (read-only, no contention).
 * - Transaction re-reads winnerId to guard against concurrent resolution.
 */
async function resolveWinnerForAuction(auctionId: string): Promise<void> {
  const auctionRef = db.collection("auctions").doc(auctionId);

  // ── Pre-check: bail early if already resolved or endTime not passed ────────
  const preCheck = await auctionRef.get();
  if (!preCheck.exists) {
    console.log(`[winner] Auction ${auctionId} does not exist.`);
    return;
  }

  const preData = preCheck.data()!;

  // Already resolved — nothing to do
  if (preData.winnerId !== null && preData.winnerId !== undefined) {
    console.log(`[winner] Auction ${auctionId} already resolved — skipping.`);
    return;
  }

  // Hasn't ended yet — called too early (shouldn't happen with countdown guard)
  const endTime: Date =
    preData.endTime instanceof Timestamp
      ? preData.endTime.toDate()
      : new Date(preData.endTime);

  if (new Date() < endTime) {
    console.log(`[winner] Auction ${auctionId} hasn't ended yet — skipping.`);
    return;
  }

  // ── Fetch highest bid outside transaction ──────────────────────────────────
  const bidsSnap = await db
    .collection("auctions")
    .doc(auctionId)
    .collection("bids")
    .orderBy("amount", "desc")
    .limit(1)
    .get();

  // ── Transaction: re-read + write atomically ────────────────────────────────
  await db.runTransaction(async (transaction) => {
    const freshSnap = await transaction.get(auctionRef);
    if (!freshSnap.exists) return;

    const fresh = freshSnap.data()!;

    // Idempotency guard inside transaction (concurrent call may have beaten us)
    if (fresh.winnerId !== null && fresh.winnerId !== undefined) {
      console.log(`[winner] Auction ${auctionId} resolved by concurrent run — skipping.`);
      return;
    }

    if (bidsSnap.empty) {
      transaction.update(auctionRef, {
        winnerId:   "NO_WINNER",
        winningBid: 0,
        isActive:   false,
        updatedAt:  FieldValue.serverTimestamp(),
      });
      console.log(`[winner] Auction ${auctionId} → NO_WINNER (no bids).`);
      return;
    }

    const topBid     = bidsSnap.docs[0].data();
    const winnerId   = topBid.userId   as string;
    const winningBid = topBid.amount   as number;

    transaction.update(auctionRef, {
      winnerId,
      winningBid,
      isActive:  false,
      updatedAt: FieldValue.serverTimestamp(),
    });

    transaction.update(db.collection("users").doc(winnerId), {
      totalWins: FieldValue.increment(1),
    });

    console.log(`[winner] Auction ${auctionId} → winner=${winnerId} bid=${winningBid}`);
  });
}

// ─── Function 1: HTTP callable — PRIMARY path ─────────────────────────────────
//
// Called by the frontend the instant the countdown hits zero.
// Resolves the specific auction immediately — winner appears in ~1-2 seconds.
// Requires the caller to be authenticated (prevents abuse).

export const triggerResolveAuction = onCall(
  {
    timeoutSeconds: 30,
    memory: "256MiB",
  },
  async (request) => {
    // Must be authenticated — prevents random callers from hammering this
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Must be signed in.");
    }

    const auctionId = request.data?.auctionId as string | undefined;
    if (!auctionId || typeof auctionId !== "string") {
      throw new HttpsError("invalid-argument", "auctionId is required.");
    }

    try {
      await resolveWinnerForAuction(auctionId);
      return { success: true };
    } catch (err) {
      console.error(`[triggerResolveAuction] Error for ${auctionId}:`, err);
      throw new HttpsError("internal", "Failed to resolve auction.");
    }
  },
);

// ─── Function 2: Firestore trigger — edge case handler ────────────────────────
//
// Fires on every bid write. Handles the race condition where a bid lands
// in the final milliseconds and the endTime passes before Function 1 is called.

export const onBidWritten = onDocumentWritten(
  {
    document:       "auctions/{auctionId}/bids/{bidId}",
    timeoutSeconds: 60,
    memory:         "256MiB",
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

// ─── Function 3: Scheduled — safety net only ──────────────────────────────────
//
// Catches auctions that ended with zero bids (no trigger) or where the
// frontend was closed before the countdown fired Function 1.
// Healthy-state cost: 1 Firestore query read per 10 minutes. Negligible.

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
      auctionsSnap.docs.map((d) =>
        resolveWinnerForAuction(d.id).catch((err) =>
          console.error(`[resolveAuctionWinners] Error for ${d.id}:`, err),
        ),
      ),
    );

    console.log("[resolveAuctionWinners] Done.");
  },
);