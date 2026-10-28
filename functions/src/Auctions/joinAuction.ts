/**
 * joinAuctionsCallable — server-side join (Admin SDK).
 * Clients can no longer write users/{uid}/auctions or Participants directly.
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, FieldValue, Timestamp } from "firebase-admin/firestore";

const db = getFirestore();

function paymentId(): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `SIM_${ts}_${rand}`;
}

export const joinAuctionsCallable = onCall(
  { timeoutSeconds: 60, memory: "256MiB" },
  async (request) => {
    if (!request.auth?.uid) {
      throw new HttpsError("unauthenticated", "You must be signed in.");
    }

    const userId = request.auth.uid;
    const auctionIds = (request.data?.auctionIds ?? []) as string[];

    if (!Array.isArray(auctionIds) || auctionIds.length === 0) {
      throw new HttpsError("invalid-argument", "auctionIds required.");
    }
    if (auctionIds.length > 20) {
      throw new HttpsError("invalid-argument", "Too many auctions.");
    }

    const userSnap = await db.collection("users").doc(userId).get();
    if (!userSnap.exists) {
      throw new HttpsError("not-found", "User profile not found.");
    }
    if (userSnap.data()?.isBlocked === true) {
      throw new HttpsError("permission-denied", "Account is blocked.");
    }

    const result = {
      joined: [] as string[],
      skipped: [] as string[],
      errors: [] as string[],
    };

    const now = new Date();

    for (const auctionId of auctionIds) {
      if (typeof auctionId !== "string" || !auctionId.trim()) {
        result.errors.push(String(auctionId));
        continue;
      }

      try {
        const auctionRef = db.collection("auctions").doc(auctionId);
        const participantRef = auctionRef.collection("Participants").doc(userId);
        const userAuctionRef = db
          .collection("users")
          .doc(userId)
          .collection("auctions")
          .doc(auctionId);
        const restrictedRef = auctionRef.collection("restricted").doc(userId);

        await db.runTransaction(async (tx) => {
          const [auctionSnap, participantSnap, restrictedSnap] =
            await Promise.all([
              tx.get(auctionRef),
              tx.get(participantRef),
              tx.get(restrictedRef),
            ]);

          if (!auctionSnap.exists) {
            throw new Error("SKIP:Auction does not exist");
          }

          const data = auctionSnap.data()!;
          if (data.isActive === false) {
            throw new Error("SKIP:Auction is not active");
          }

          const endTime: Date =
            data.endTime instanceof Timestamp
              ? data.endTime.toDate()
              : new Date(data.endTime);

          if (now > endTime) {
            throw new Error("SKIP:Auction has already ended");
          }

          if (participantSnap.exists) {
            throw new Error("SKIP:Already joined");
          }

          if (restrictedSnap.exists) {
            throw new Error("FATAL:Restricted from this auction");
          }

          const entryType = data.entryType === "paid" ? "paid" : "free";
          const entryFee =
            entryType === "paid" ? Number(data.entryFee ?? 0) || 0 : 0;
          const payId = paymentId();

          tx.set(userAuctionRef, {
            auctionId,
            amount: entryFee,
            originalAmount: entryFee,
            hasPaid: true,
            joinedAt: FieldValue.serverTimestamp(),
            paymentId: payId,
            totalAmount: [],
            voucherUsed: false,
            voucherId: null,
            voucherCode: null,
            discountApplied: 0,
          });

          tx.set(participantRef, {
            auctionId,
            userId,
            hasPaid: true,
            joinedAt: FieldValue.serverTimestamp(),
            paymentId: payId,
            voucherUsed: false,
            voucherId: null,
            voucherCode: null,
            discountApplied: 0,
          });

          tx.update(auctionRef, {
            totalParticipants: FieldValue.increment(1),
          });
        });

        result.joined.push(auctionId);
      } catch (err: any) {
        const msg = String(err?.message ?? err);
        if (msg.startsWith("FATAL:")) {
          throw new HttpsError(
            "permission-denied",
            msg.replace(/^FATAL:/, "").trim() ||
              "You have been restricted from joining this auction.",
          );
        }
        if (msg.startsWith("SKIP:")) {
          result.skipped.push(auctionId);
          continue;
        }
        console.error(`[joinAuctionsCallable] ${auctionId}:`, err);
        result.errors.push(auctionId);
      }
    }

    return result;
  },
);
