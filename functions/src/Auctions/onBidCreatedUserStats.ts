/**
 * When a bid doc is created:
 *  - increment users/{uid}.totalBids
 *  - append amount to users/{uid}/auctions/{auctionId}.totalAmount
 * Clients can no longer write these fields.
 */

import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

const db = getFirestore();

export const onBidCreatedUserStats = onDocumentCreated(
  {
    document: "auctions/{auctionId}/bids/{bidId}",
    timeoutSeconds: 30,
    memory: "256MiB",
  },
  async (event) => {
    const data = event.data?.data();
    const userId = data?.userId;
    const amount = Number(data?.amount);
    const auctionId = event.params.auctionId as string;
    if (!userId || typeof userId !== "string") return;

    try {
      await db.collection("users").doc(userId).update({
        totalBids: FieldValue.increment(1),
        updatedAt: FieldValue.serverTimestamp(),
      });
    } catch (err) {
      console.error(
        `[onBidCreatedUserStats] totalBids failed uid=${userId}:`,
        err,
      );
    }

    if (!auctionId || !Number.isFinite(amount) || amount <= 0) return;

    try {
      const joinRef = db
        .collection("users")
        .doc(userId)
        .collection("auctions")
        .doc(auctionId);
      const joinSnap = await joinRef.get();
      if (joinSnap.exists) {
        await joinRef.update({
          totalAmount: FieldValue.arrayUnion(amount),
        });
      }
    } catch (err) {
      console.error(
        `[onBidCreatedUserStats] totalAmount failed uid=${userId}:`,
        err,
      );
    }
  },
);
