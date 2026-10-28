/**
 * claimLuckySpin — server rolls the prize and persists it (Admin SDK).
 * Clients cannot write luckySpin / luckySpinCredit themselves.
 *
 * spin_again: returns prize without writing credit (user may call again).
 * Real prizes: written once; subsequent calls return the existing win.
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, FieldValue, Timestamp } from "firebase-admin/firestore";

const db = getFirestore();

const PRIZES = [
  { id: "10_off", label: "10% OFF", percent: 10, isFree: false, isSpinAgain: false },
  { id: "25_off", label: "25% OFF", percent: 25, isFree: false, isSpinAgain: false },
  { id: "50_off", label: "50% OFF", percent: 50, isFree: false, isSpinAgain: false },
  { id: "75_off", label: "75% OFF", percent: 75, isFree: false, isSpinAgain: false },
  { id: "free_entry", label: "FREE", percent: 100, isFree: true, isSpinAgain: false },
  { id: "spin_again", label: "SPIN AGAIN", percent: 0, isFree: false, isSpinAgain: true },
] as const;

function rollPrizeIndex(): number {
  const rand = Math.random();
  if (rand < 0.25) return 0; // 10%
  if (rand < 0.5) return 1; // 25%
  if (rand < 0.7) return 2; // 50%
  if (rand < 0.85) return 3; // 75%
  if (rand < 0.93) return 5; // spin again
  return 4; // free entry
}

export const claimLuckySpin = onCall(
  { timeoutSeconds: 30, memory: "256MiB" },
  async (request) => {
    if (!request.auth?.uid) {
      throw new HttpsError("unauthenticated", "You must be signed in.");
    }

    const userId = request.auth.uid;
    const auctionId = String(request.data?.auctionId ?? "").trim();
    if (!auctionId) {
      throw new HttpsError("invalid-argument", "auctionId required.");
    }

    const auctionRef = db.collection("auctions").doc(auctionId);
    const participantRef = auctionRef.collection("Participants").doc(userId);
    const userAuctionRef = db
      .collection("users")
      .doc(userId)
      .collection("auctions")
      .doc(auctionId);
    const userRef = db.collection("users").doc(userId);

    const auctionSnap = await auctionRef.get();
    if (!auctionSnap.exists) {
      throw new HttpsError("not-found", "Auction not found.");
    }
    const auction = auctionSnap.data()!;

    if (auction.luckySpinEnabled === false) {
      throw new HttpsError("failed-precondition", "Lucky spin is disabled.");
    }

    const endTime: Date =
      auction.endTime instanceof Timestamp
        ? auction.endTime.toDate()
        : new Date(auction.endTime);
    if (new Date() < endTime && auction.isActive !== false) {
      throw new HttpsError("failed-precondition", "Auction has not ended yet.");
    }

    if (auction.winnerId === userId) {
      throw new HttpsError("failed-precondition", "Winners cannot use lucky spin.");
    }

    const participantSnap = await participantRef.get();
    if (!participantSnap.exists) {
      throw new HttpsError(
        "failed-precondition",
        "You did not join this auction.",
      );
    }

    // Already claimed → return existing (no re-roll)
    const existingJoin = await userAuctionRef.get();
    if (!existingJoin.exists) {
      throw new HttpsError(
        "failed-precondition",
        "No join record for this auction.",
      );
    }
    const existingSpin = existingJoin.data()?.luckySpin;
    if (existingSpin?.prizeId && !existingSpin?.isSpinAgain) {
      return {
        alreadyClaimed: true,
        prize: {
          id: existingSpin.prizeId,
          label: existingSpin.label,
          percent: existingSpin.percent,
          isFree: !!existingSpin.isFree,
          isSpinAgain: false,
        },
      };
    }

    const prize = PRIZES[rollPrizeIndex()];

    // Spin again — do not persist a claimable credit
    if (prize.isSpinAgain) {
      return {
        alreadyClaimed: false,
        prize: {
          id: prize.id,
          label: prize.label,
          percent: prize.percent,
          isFree: prize.isFree,
          isSpinAgain: true,
        },
      };
    }

    let productTitle = "";
    try {
      if (auction.productId) {
        const pSnap = await db.collection("products").doc(auction.productId).get();
        if (pSnap.exists) {
          const title = pSnap.data()?.title;
          productTitle =
            typeof title === "string"
              ? title
              : (title?.en ?? title?.ar ?? "");
        }
      }
    } catch {
      /* non-fatal */
    }

    const winPayload = {
      prizeId: prize.id,
      percent: prize.percent,
      isFree: prize.isFree,
      label: prize.label,
      claimedAt: FieldValue.serverTimestamp(),
      status: "available",
      redeemedOnAuctionId: null,
    };

    try {
      await db.runTransaction(async (tx) => {
        const joinSnap = await tx.get(userAuctionRef);
        if (!joinSnap.exists) {
          throw new Error("JOIN_MISSING");
        }
        const again = joinSnap.data()?.luckySpin;
        if (again?.prizeId && again.prizeId !== "spin_again") {
          throw new Error("ALREADY_CLAIMED");
        }

        tx.update(userAuctionRef, { luckySpin: winPayload });
        tx.set(
          userRef,
          {
            luckySpinCredit: {
              prizeId: prize.id,
              percent: prize.percent,
              isFree: prize.isFree,
              label: prize.label,
              sourceAuctionId: auctionId,
              claimedAt: FieldValue.serverTimestamp(),
              status: "available",
            },
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true },
        );
      });
    } catch (err: any) {
      const msg = String(err?.message ?? err);
      if (msg.includes("JOIN_MISSING")) {
        throw new HttpsError("failed-precondition", "Join record missing.");
      }
      if (msg.includes("ALREADY_CLAIMED")) {
        throw new HttpsError("already-exists", "Lucky spin already claimed.");
      }
      throw err;
    }

    // Informational notification
    const title = "🎉 Lucky Spin Reward Claimed!";
    const message = prize.isFree
      ? productTitle
        ? `Congrats! You won FREE entry for your next auction (from "${productTitle}").`
        : "Congrats! You won FREE entry for your next auction!"
      : productTitle
        ? `Congrats! You won ${prize.percent}% OFF your next auction entry fee (from "${productTitle}").`
        : `Congrats! You won ${prize.percent}% OFF your next auction entry fee!`;

    try {
      await userRef.collection("notifications").add({
        type: "lucky_spin_claimed",
        auctionId,
        productTitle: productTitle || "",
        auctionNumber: auction.auctionNumber ?? 0,
        prizeId: prize.id,
        percent: prize.percent,
        isFree: prize.isFree,
        label: prize.label,
        title,
        message,
        isRead: false,
        createdAt: FieldValue.serverTimestamp(),
      });
    } catch (err) {
      console.warn("[claimLuckySpin] notification write failed:", err);
    }

    return {
      alreadyClaimed: false,
      prize: {
        id: prize.id,
        label: prize.label,
        percent: prize.percent,
        isFree: prize.isFree,
        isSpinAgain: false,
      },
    };
  },
);
