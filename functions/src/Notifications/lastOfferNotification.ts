/**
 * functions/src/Notifications/lastOfferNotification.ts
 *
 * FIX: DATA-ONLY FCM message — removed `notification` and `webpush.notification`.
 * See auctionRegistrationNotification.ts for full explanation of the duplicate fix.
 */

import { onDocumentUpdated } from "firebase-functions/v2/firestore";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { getMessaging } from "firebase-admin/messaging";

const db        = getFirestore();
const messaging = getMessaging();

const DEAD_TOKEN_CODES = new Set([
  "messaging/invalid-registration-token",
  "messaging/registration-token-not-registered",
  "messaging/invalid-argument",
  "messaging/mismatched-credential",
  "messaging/invalid-recipient",
]);

export const onLastOfferSelected = onDocumentUpdated(
  "auctions/{auctionId}/lastOffers/{offerId}",
  async (event) => {
    const before = event.data?.before.data();
    const after  = event.data?.after.data();

    if (!before || !after) return;

    const auctionId = event.params.auctionId;

    const justSelected =
      (before.selectedbyAdmin !== true || before.status !== "accepted") &&
      after.selectedbyAdmin === true &&
      after.status === "accepted";

    if (!justSelected) return;
    if (after.notifiedLastOfferSelectedAt) return;

    const userId = after.userId as string | undefined;
    if (!userId) return;

    let productTitle = "the item";
    let winningBid: number = after.amount ?? 0;

    try {
      const auctionSnap = await db.collection("auctions").doc(auctionId).get();
      if (auctionSnap.exists) {
        const auctionData = auctionSnap.data()!;
        winningBid = auctionData.winningBid ?? after.amount ?? 0;
        if (auctionData.productId) {
          const productSnap = await db.collection("products").doc(auctionData.productId).get();
          if (productSnap.exists) {
            productTitle = productSnap.data()?.title ?? "the item";
          }
        }
      }
    } catch (err) {
      console.warn("[lastOfferNotification] Could not fetch auction/product:", err);
    }

    const formattedAmount = winningBid.toLocaleString("en-EG");
    const deepLink        = `/last-offer-confirm/${auctionId}?amount=${winningBid}`;

    const title = "🎉 Congratulations! You've been selected!";
    const body  = `Your last offer for "${productTitle}" has been accepted. Amount: ${formattedAmount} EGP. Tap to confirm your purchase.\n\n⚠️ Complete your payment within 24 hours or the item will be reassigned to another bidder.`;

    try {
      const notifRef = db
        .collection("users")
        .doc(userId)
        .collection("notifications")
        .doc();

      await notifRef.set({
        type:        "last_offer_selected",
        auctionId,
        offerId:     event.params.offerId,
        winningBid,
        productTitle,
        title,
        message:     body,
        isRead:      false,
        url:         deepLink,
        createdAt:   FieldValue.serverTimestamp(),
      });

      const userSnap    = await db.collection("users").doc(userId).get();
      const rawTokens: string[] = userSnap.exists
        ? (userSnap.data()?.fcmTokens ?? [])
        : [];

      const uniqueTokens = [...new Set(rawTokens.filter((t) => typeof t === "string" && t.length > 0))];

      if (uniqueTokens.length < rawTokens.length) {
        await db.collection("users").doc(userId).update({ fcmTokens: uniqueTokens });
      }

      if (uniqueTokens.length === 0) {
        await event.data!.after.ref.update({
          notifiedLastOfferSelectedAt: FieldValue.serverTimestamp(),
        });
        return;
      }

      // DATA-ONLY — no `notification` field, no `webpush.notification`
      const fcmResponse = await messaging.sendEachForMulticast({
        tokens: uniqueTokens,
        data: {
          type:         "last_offer_selected",
          auctionId,
          offerId:      event.params.offerId,
          winningBid:   String(winningBid),
          productTitle,
          title,
          body,
          url:          deepLink,
        },
        webpush: {
          fcmOptions: { link: deepLink },
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
        notifiedLastOfferSelectedAt: FieldValue.serverTimestamp(),
      });

    } catch (err) {
      console.error(`[lastOfferNotification] Error:`, err);
    }
  },
);