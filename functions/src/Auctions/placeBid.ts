/**
 * placeBidCallable — ONLY allowed path to create bids / bump currentBid.
 * Full server-side validation (Admin SDK). Clients cannot write bids.
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, FieldValue, Timestamp } from "firebase-admin/firestore";

const db = getFirestore();

export const placeBidCallable = onCall(
  { timeoutSeconds: 30, memory: "256MiB" },
  async (request) => {
    if (!request.auth?.uid) {
      throw new HttpsError("unauthenticated", "You must be signed in.");
    }

    const userId = request.auth.uid;
    const auctionId = String(request.data?.auctionId ?? "").trim();
    const amount = Number(request.data?.amount);

    if (!auctionId) {
      throw new HttpsError("invalid-argument", "auctionId is required.");
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new HttpsError("invalid-argument", "Invalid bid amount.");
    }

    const auctionRef = db.collection("auctions").doc(auctionId);
    const participantRef = auctionRef.collection("Participants").doc(userId);
    const restrictedRef = auctionRef.collection("restricted").doc(userId);
    const userRef = db.collection("users").doc(userId);
    const bidRef = auctionRef.collection("bids").doc();

    try {
      const newBid = await db.runTransaction(async (tx) => {
        const [auctionSnap, participantSnap, restrictedSnap, userSnap] =
          await Promise.all([
            tx.get(auctionRef),
            tx.get(participantRef),
            tx.get(restrictedRef),
            tx.get(userRef),
          ]);

        if (!auctionSnap.exists) {
          throw new HttpsError("not-found", "Auction not found.");
        }

        const auction = auctionSnap.data()!;

        if (auction.isActive === false) {
          throw new HttpsError(
            "failed-precondition",
            "This auction is no longer active.",
          );
        }

        if (restrictedSnap.exists) {
          throw new HttpsError(
            "permission-denied",
            "RESTRICTED_FROM_AUCTION",
          );
        }

        if (!participantSnap.exists) {
          throw new HttpsError(
            "failed-precondition",
            "You must join this auction before bidding.",
          );
        }

        if (userSnap.exists && userSnap.data()?.isBlocked === true) {
          throw new HttpsError("permission-denied", "Account is blocked.");
        }

        const startTime: Date =
          auction.startTime instanceof Timestamp
            ? auction.startTime.toDate()
            : new Date(auction.startTime);
        const endTime: Date =
          auction.endTime instanceof Timestamp
            ? auction.endTime.toDate()
            : new Date(auction.endTime);

        const now = new Date();

        // All bid types: reject before start / after end (UI hides this; DevTools must not bypass).
        if (now < startTime) {
          throw new HttpsError(
            "failed-precondition",
            "This auction has not started yet.",
          );
        }
        if (now >= endTime) {
          throw new HttpsError(
            "failed-precondition",
            "This auction has already ended. No more bids accepted.",
          );
        }

        // Already resolved
        if (
          auction.winnerId !== null &&
          auction.winnerId !== undefined
        ) {
          throw new HttpsError(
            "failed-precondition",
            "This auction is already resolved.",
          );
        }

        const currentBid = Number(auction.currentBid ?? 0);
        const bidType = (auction.bidType as string) || "free";
        const minimumIncrement = Number(auction.minimumIncrement ?? 0);
        const fixedBidValue = Number(auction.fixedBidValue ?? 0);
        const maximumBidLimit =
          auction.maximumBidLimit == null
            ? null
            : Number(auction.maximumBidLimit);

        if (bidType === "fixed") {
          const expected = currentBid + fixedBidValue;
          // Allow tiny float tolerance
          if (Math.abs(amount - expected) > 0.0001) {
            throw new HttpsError(
              "invalid-argument",
              `Fixed bid must be exactly ${expected} EGP.`,
            );
          }
        } else if (bidType === "decreasing") {
          // Buzz-to-win: first valid buzz ends the auction. Only via this CF.
          if ((auction.totalBids ?? 0) > 0) {
            throw new HttpsError(
              "failed-precondition",
              "This auction has already ended.",
            );
          }

          const startingPrice = Number(auction.startingPrice ?? 0);
          const minimumPrice = Number(auction.minimumPrice ?? 0);
          const totalMs = Math.max(1, endTime.getTime() - startTime.getTime());
          const elapsedMs = Math.max(0, now.getTime() - startTime.getTime());
          const progress = Math.max(0, Math.min(1, elapsedMs / totalMs));
          // Same formula as AuctionLivePage decreasingPrice
          const expectedPrice =
            startingPrice -
            progress * (startingPrice - minimumPrice);
          const expectedFloor = Math.floor(expectedPrice);

          // Must buzz at (approx) the live decreasing price — not the floor early.
          // Allow small skew for client/server clock + Math.floor differences.
          const minAccepted = Math.max(minimumPrice, expectedFloor - 2);
          const maxAccepted = Math.max(startingPrice, expectedFloor + 2);

          if (amount < minAccepted || amount > maxAccepted) {
            throw new HttpsError(
              "invalid-argument",
              `Buzz price must match the current decreasing price (~${expectedFloor} EGP).`,
            );
          }
        } else {
          // free / ascending
          const minimum = currentBid + minimumIncrement;
          if (amount < minimum) {
            throw new HttpsError(
              "invalid-argument",
              `Bid must be at least ${minimum} EGP.`,
            );
          }
        }

        if (maximumBidLimit != null && amount > maximumBidLimit) {
          throw new HttpsError(
            "invalid-argument",
            "Your bid exceeds the maximum limit for this auction.",
          );
        }

        const userData = userSnap.exists ? userSnap.data()! : {};
        const bidderName = String(
          userData.fullName ??
            userData.displayName ??
            userData.firstName ??
            "",
        );

        const auctionUpdate: Record<string, unknown> = {
          currentBid: amount,
          totalBids: FieldValue.increment(1),
        };

        if (bidType === "decreasing") {
          auctionUpdate.endTime = FieldValue.serverTimestamp();
          auctionUpdate.isActive = false;
        }

        tx.update(auctionRef, auctionUpdate);
        tx.set(bidRef, {
          userId,
          bidderName,
          amount,
          createdAt: FieldValue.serverTimestamp(),
        });

        return amount;
      });

      return { success: true, newBid };
    } catch (err: any) {
      if (err instanceof HttpsError) throw err;
      console.error(`[placeBidCallable] auction=${auctionId}:`, err);
      throw new HttpsError(
        "aborted",
        "Someone else just bid at the same moment. Please try again.",
      );
    }
  },
);
