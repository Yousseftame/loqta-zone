/**
 * functions/src/Notifications/bidWinnerNotification.ts
 *
 * Trigger: onDocumentUpdated("auctions/{auctionId}/bids/{bidId}")
 *
 * Fires when an admin sets selectedbyAdmin=true AND status="accepted" on a
 * bid document — the same pattern as the Last Offer system.
 *
 * What it does:
 *  1. Validates the transition (both fields must flip together, first time only)
 *  2. Creates users/{userId}/notifications/{id} — in-app notification
 *  3. Sends FCM push to all registered tokens on the selected user's doc
 *  4. Prunes dead tokens automatically
 *  5. Stamps notifiedBidSelectedAt to prevent duplicate runs
 *
 * Navigation deep-link:
 *   /last-offer-confirm/{auctionId}?amount={winningBid}
 *   — Reuses the SAME confirmation page as the last offer flow.
 *     The page is payment-gateway-agnostic, so it works for both paths.
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

export const onBidSelected = onDocumentUpdated(
  "auctions/{auctionId}/bids/{bidId}",
  async (event) => {
    const before = event.data?.before.data();
    const after  = event.data?.after.data();

    if (!before || !after) return;

    const auctionId = event.params.auctionId;
    const bidId     = event.params.bidId;

    // ── 1. Guard: must have JUST become selectedbyAdmin=true AND status="accepted"
    // (was NOT both true before, IS both true now)
    const justSelected =
      (before.selectedbyAdmin !== true || before.status !== "accepted") &&
      after.selectedbyAdmin === true &&
      after.status === "accepted";

    if (!justSelected) return;

    // ── 2. Idempotency guard — never fire twice for the same bid doc
    if (after.notifiedBidSelectedAt) {
      // console.log(`[bidWinnerNotification] bidId=${bidId} already notified — skipping.`);
      return;
    }

    const userId = after.userId as string | undefined;
    if (!userId) {
      console.warn(`[bidWinnerNotification] bidId=${bidId}: no userId — skipping.`);
      return;
    }

    // ── 3. Fetch auction + product for rich notification content
    let productTitle = "the item";
    let winningBid: number = after.amount ?? 0;

    try {
      const auctionSnap = await db.collection("auctions").doc(auctionId).get();
      if (auctionSnap.exists) {
        const auctionData = auctionSnap.data()!;
        // Use the bid's own amount as the confirmed winning bid
        winningBid = after.amount ?? auctionData.winningBid ?? 0;

        if (auctionData.productId) {
          const productSnap = await db
            .collection("products")
            .doc(auctionData.productId)
            .get();
          if (productSnap.exists) {
            productTitle = productSnap.data()?.title ?? "the item";
          }
        }
      }
    } catch (err) {
      console.warn("[bidWinnerNotification] Could not fetch auction/product:", err);
    }

    const formattedAmount = winningBid.toLocaleString("en-EG");
    // Reuse the same confirm page — it works for both last offers and bids
    const deepLink = `/last-offer-confirm/${auctionId}?amount=${winningBid}`;

    const title = "🎉 Congratulations! You've won the auction!";
   const body  =
  `Your bid of ${formattedAmount} EGP for "${productTitle}" has been selected as the winning bid. Tap to confirm your purchase.\n\n⚠️ Complete your payment within 24 hours or the item will be reassigned to another bidder.`;

    try {
      // ── 4. Write in-app notification
      const notifRef = db
        .collection("users")
        .doc(userId)
        .collection("notifications")
        .doc();

      await notifRef.set({
        type:        "bid_selected",
        auctionId,
        bidId,
        winningBid,
        productTitle,
        title,
        message:     body,
        isRead:      false,
        url:         deepLink,
        createdAt:   FieldValue.serverTimestamp(),
      });

      // console.log(
      //   `[bidWinnerNotification] In-app notification created: uid=${userId} notifId=${notifRef.id}`,
      // );

      // ── 5. Fetch + deduplicate FCM tokens
      const userSnap    = await db.collection("users").doc(userId).get();
      const rawTokens: string[] = userSnap.exists
        ? (userSnap.data()?.fcmTokens ?? [])
        : [];

      const uniqueTokens = [
        ...new Set(rawTokens.filter((t) => typeof t === "string" && t.length > 0)),
      ];

      if (uniqueTokens.length < rawTokens.length) {
        await db.collection("users").doc(userId).update({ fcmTokens: uniqueTokens });
      }

      if (uniqueTokens.length === 0) {
        // console.log(`[bidWinnerNotification] No FCM tokens for uid=${userId} — push skipped.`);
        await event.data!.after.ref.update({
          notifiedBidSelectedAt: FieldValue.serverTimestamp(),
        });
        return;
      }

      // ── 6. Send FCM push
      const fcmResponse = await messaging.sendEachForMulticast({
        tokens: uniqueTokens,
        notification: { title, body },
        data: {
          type:         "bid_selected",
          auctionId,
          bidId,
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
          console.warn(`[bidWinnerNotification] FCM failed token[${idx}]: ${code}`);
          if (DEAD_TOKEN_CODES.has(code)) deadTokens.push(uniqueTokens[idx]);
        }
      });

      if (deadTokens.length > 0) {
        await db.collection("users").doc(userId).update({
          fcmTokens: FieldValue.arrayRemove(...deadTokens),
        });
        // console.log(
        //   `[bidWinnerNotification] Pruned ${deadTokens.length} dead token(s) for uid=${userId}`,
        // );
      }

      // console.log(
      //   `[bidWinnerNotification] FCM result uid=${userId}: ` +
      //   `${fcmResponse.successCount} sent / ${fcmResponse.failureCount} failed`,
      // );

      // ── 8. Idempotency stamp
      await event.data!.after.ref.update({
        notifiedBidSelectedAt: FieldValue.serverTimestamp(),
      });
    } catch (err) {
      console.error(`[bidWinnerNotification] Error for bidId=${bidId}:`, err);
    }
  },
);