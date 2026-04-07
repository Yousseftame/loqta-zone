/**
 * functions/src/Notifications/notifications.ts
 *
 * FIX: DATA-ONLY FCM message — removed `notification` and `webpush.notification`.
 * See auctionRegistrationNotification.ts for full explanation of the duplicate fix.
 */

import { onDocumentUpdated } from "firebase-functions/v2/firestore";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { getMessaging } from "firebase-admin/messaging";

const db = getFirestore();
const messaging = getMessaging();

const DEAD_TOKEN_CODES = new Set([
  "messaging/invalid-registration-token",
  "messaging/registration-token-not-registered",
  "messaging/invalid-argument",
  "messaging/mismatched-credential",
  "messaging/invalid-recipient",
]);

export const onAuctionRequestUpdated = onDocumentUpdated(
  "AuctionRequests/{requestId}",
  async (event) => {
    const before = event.data?.before.data();
    const after  = event.data?.after.data();

    if (!before || !after) return;

    const requestId = event.params.requestId;

    const justMatched = before.status !== "matched" && after.status === "matched";
    if (!justMatched) return;

    const { userId, productName, matchedAuctionId } = after as {
      userId: string;
      productName: string;
      matchedAuctionId: string | null;
    };

    if (!matchedAuctionId || !userId) return;

    if (after.notifiedMatchedAt) return;

    let productId = "";
    try {
      const auctionSnap = await db.collection("auctions").doc(matchedAuctionId).get();
      if (auctionSnap.exists) {
        productId = auctionSnap.data()?.productId ?? "";
      }
    } catch (err) {
      console.warn("[notifications] Could not fetch auction for productId:", err);
    }

    const title = "Your requested item is now available! 🎉";
    const body  = `${productName} is now live in auctions. Place your bid now!`;
    const url   = productId
      ? `/auctions/register/${productId}`
      : `/auctions/${matchedAuctionId}`;

    try {
      const notifRef = db
        .collection("users")
        .doc(userId)
        .collection("notifications")
        .doc();

      await notifRef.set({
        type:        "auction_matched",
        requestId,
        auctionId:   matchedAuctionId,
        productId,
        productName,
        title,
        message:     body,
        isRead:      false,
        createdAt:   FieldValue.serverTimestamp(),
      });

      const userSnap = await db.collection("users").doc(userId).get();
      const rawTokens: string[] = userSnap.exists
        ? (userSnap.data()?.fcmTokens ?? [])
        : [];

      const uniqueTokens = [...new Set(rawTokens.filter((t) => typeof t === "string" && t.length > 0))];

      if (uniqueTokens.length < rawTokens.length) {
        await db.collection("users").doc(userId).update({ fcmTokens: uniqueTokens });
      }

      if (uniqueTokens.length === 0) {
        await event.data!.after.ref.update({ notifiedMatchedAt: FieldValue.serverTimestamp() });
        return;
      }

      // DATA-ONLY — no `notification` field, no `webpush.notification`
      const fcmResponse = await messaging.sendEachForMulticast({
        tokens: uniqueTokens,
        data: {
          type:        "auction_matched",
          requestId,
          auctionId:   matchedAuctionId,
          productId,
          productName,
          title,
          body,
          url,
        },
        webpush: {
          fcmOptions: { link: url },
        },
      });

      const deadTokens: string[] = [];
      fcmResponse.responses.forEach((res, idx) => {
        if (!res.success) {
          const code = res.error?.code ?? "";
          if (DEAD_TOKEN_CODES.has(code)) deadTokens.push(uniqueTokens[idx]);
        }
      });

      if (deadTokens.length > 0) {
        await db.collection("users").doc(userId).update({
          fcmTokens: FieldValue.arrayRemove(...deadTokens),
        });
      }

      await event.data!.after.ref.update({
        notifiedMatchedAt: FieldValue.serverTimestamp(),
      });

    } catch (err) {
      console.error(`[notifications] Error for requestId=${requestId}:`, err);
    }
  },
);