/**
 * functions/src/Notifications/lastOfferNotification.ts
 *
 * Trigger: onDocumentUpdated("auctions/{auctionId}/lastOffers/{offerId}")
 *
 * Fires when an admin sets selectedbyAdmin=true AND status="accepted" on a
 * last-offer document.
 *
 * What it does:
 *  1. Validates the transition (both fields must flip together)
 *  2. Creates users/{userId}/notifications/{id} — in-app notification
 *  3. Sends FCM push to all registered tokens on the selected user's doc
 *  4. Prunes dead tokens automatically
 *  5. Stamps notifiedLastOfferSelectedAt to prevent duplicate runs
 *
 * Navigation target (deep link):
 *   /last-offer-confirm/{auctionId}?amount={winningBid}
 *   — This route renders the confirmation/payment page (LastOfferConfirmPage)
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

    // ── 1. Guard: must have JUST become selectedbyAdmin=true AND status="accepted"
    const justSelected =
      (before.selectedbyAdmin !== true || before.status !== "accepted") &&
      after.selectedbyAdmin === true &&
      after.status === "accepted";

    if (!justSelected) return;

    // ── 2. Idempotency guard
    if (after.notifiedLastOfferSelectedAt) {
      // console.log(`[lastOfferNotification] offerId=${event.params.offerId} already notified — skipping.`);
      return;
    }

    const userId = after.userId as string | undefined;
    if (!userId) {
      console.warn(`[lastOfferNotification] offerId=${event.params.offerId}: no userId — skipping.`);
      return;
    }

    // ── 3. Fetch auction + product title for a rich notification
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
      // ── 4. Write in-app notification
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

      // console.log(`[lastOfferNotification] In-app notification created: uid=${userId} notifId=${notifRef.id}`);

      // ── 5. Fetch + deduplicate FCM tokens
      const userSnap    = await db.collection("users").doc(userId).get();
      const rawTokens: string[] = userSnap.exists
        ? (userSnap.data()?.fcmTokens ?? [])
        : [];

      const uniqueTokens = [...new Set(
        rawTokens.filter((t) => typeof t === "string" && t.length > 0),
      )];

      if (uniqueTokens.length < rawTokens.length) {
        await db.collection("users").doc(userId).update({ fcmTokens: uniqueTokens });
      }

      if (uniqueTokens.length === 0) {
        // console.log(`[lastOfferNotification] No FCM tokens for uid=${userId} — push skipped.`);
        await event.data!.after.ref.update({
          notifiedLastOfferSelectedAt: FieldValue.serverTimestamp(),
        });
        return;
      }

      // ── 6. Send FCM push
      const fcmResponse = await messaging.sendEachForMulticast({
        tokens: uniqueTokens,
        notification: { title, body },
        data: {
          type:         "last_offer_selected",
          auctionId,
          offerId:      event.params.offerId,
          winningBid:   String(winningBid),
          productTitle,
          url:          deepLink,
        },
        webpush: {
          notification: {
            title,
            body,
            icon:               "/loqta-removebg-preview.png",
            badge:              "/loqta-removebg-preview.png",
            requireInteraction: true,
          },
          fcmOptions: { link: deepLink },
        },
      });

      // ── 7. Prune dead tokens
      const deadTokens: string[] = [];
      fcmResponse.responses.forEach((res, idx) => {
        if (!res.success) {
          const code = res.error?.code ?? "";
          console.warn(`[lastOfferNotification] FCM failed token[${idx}]: ${code}`);
          if (DEAD_TOKEN_CODES.has(code)) deadTokens.push(uniqueTokens[idx]);
        }
      });

      if (deadTokens.length > 0) {
        await db.collection("users").doc(userId).update({
          fcmTokens: FieldValue.arrayRemove(...deadTokens),
        });
        // console.log(`[lastOfferNotification] Pruned ${deadTokens.length} dead token(s) for uid=${userId}`);
      }

      // console.log(
      //   `[lastOfferNotification] FCM result uid=${userId}: ` +
      //   `${fcmResponse.successCount} sent / ${fcmResponse.failureCount} failed`,
      // );

      // ── 8. Idempotency stamp
      await event.data!.after.ref.update({
        notifiedLastOfferSelectedAt: FieldValue.serverTimestamp(),
      });

    } catch (err) {
      console.error(`[lastOfferNotification] Error for offerId=${event.params.offerId}:`, err);
    }
  },
);