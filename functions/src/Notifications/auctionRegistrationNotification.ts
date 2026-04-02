/**
 * functions/src/Notifications/auctionRegistrationNotification.ts
 *
 * Trigger: onDocumentCreated("auctions/{auctionId}/Participants/{userId}")
 *
 * Fires when a user successfully registers (joins) an auction.
 *
 * What it does:
 *  1. Fetches the auction doc to get auctionNumber + productId
 *  2. Fetches the product doc to get productTitle
 *  3. Creates users/{userId}/notifications/{id} — in-app notification
 *  4. Sends FCM push to all registered tokens on the user's doc
 *  5. Prunes dead tokens automatically
 *  6. Stamps notifiedRegistrationAt to prevent duplicate runs (idempotency)
 *
 * Navigation deep-link:
 *   /auctions/register/{productId}
 *   — Takes the user back to the registration page for this product.
 */

import { onDocumentCreated } from "firebase-functions/v2/firestore";
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

export const onAuctionRegistration = onDocumentCreated(
  {
    document:       "auctions/{auctionId}/Participants/{userId}",
    timeoutSeconds: 60,
    memory:         "256MiB",
  },
  async (event) => {
    const snap      = event.data;
    const auctionId = event.params.auctionId;
    const userId    = event.params.userId;

    if (!snap?.exists) return;
    const data = snap.data()!;

    // ── Idempotency guard ──────────────────────────────────────────────────
    if (data.notifiedRegistrationAt) {
      // console.log(`[auctionRegistration] Already notified uid=${userId} auction=${auctionId}`);
      return;
    }

    // ── 1. Fetch auction ───────────────────────────────────────────────────
    let auctionNumber = 0;
    let productId     = "";
    let entryFee      = 0;
    let entryType     = "free";

    try {
      const auctionSnap = await db.collection("auctions").doc(auctionId).get();
      if (!auctionSnap.exists) {
        console.warn(`[auctionRegistration] Auction ${auctionId} not found.`);
        return;
      }
      const auctionData = auctionSnap.data()!;
      auctionNumber = auctionData.auctionNumber ?? 0;
      productId     = auctionData.productId     ?? "";
      entryFee      = auctionData.entryFee      ?? 0;
      entryType     = auctionData.entryType     ?? "free";
    } catch (err) {
      console.error("[auctionRegistration] Failed to fetch auction:", err);
      return;
    }

    if (!productId) {
      console.warn(`[auctionRegistration] No productId on auction ${auctionId}.`);
      return;
    }

    // ── 2. Fetch product ───────────────────────────────────────────────────
    let productTitle = "the item";
    try {
      const productSnap = await db.collection("products").doc(productId).get();
      if (productSnap.exists) {
        productTitle = productSnap.data()?.title ?? "the item";
      }
    } catch {
      /* non-fatal — default is fine */
    }

    // ── 3. Build notification content ──────────────────────────────────────
    const deepLink = `/auctions/register/${productId}`;

    const feeLabel = entryType === "paid" && entryFee > 0
      ? `${entryFee.toLocaleString("en-EG")} EGP entry fee`
      : "free entry";

    const title = `✅ You're registered for Auction #${auctionNumber}`;
    const body  = `You've successfully joined the auction for "${productTitle}" (#${auctionNumber}) with ${feeLabel}. Good luck!`;

    // ── 4. Write in-app notification ───────────────────────────────────────
    try {
      const notifRef = db
        .collection("users")
        .doc(userId)
        .collection("notifications")
        .doc();

      await notifRef.set({
        type:          "auction_registered",
        auctionId,
        productId,
        productTitle,
        auctionNumber,
        entryFee,
        entryType,
        title,
        message:       body,
        isRead:        false,
        url:           deepLink,
        createdAt:     FieldValue.serverTimestamp(),
      });

      // console.log(`[auctionRegistration] In-app notification created uid=${userId} notifId=${notifRef.id}`);

      // ── 5. Fetch + deduplicate FCM tokens ─────────────────────────────
      const userSnap = await db.collection("users").doc(userId).get();
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
        // console.log(`[auctionRegistration] No FCM tokens for uid=${userId} — push skipped.`);
        await snap.ref.update({ notifiedRegistrationAt: FieldValue.serverTimestamp() });
        return;
      }

      // ── 6. Send FCM push ───────────────────────────────────────────────
      const fcmResponse = await messaging.sendEachForMulticast({
        tokens: uniqueTokens,
        notification: { title, body },
        data: {
          type:          "auction_registered",
          auctionId,
          productId,
          productTitle,
          auctionNumber: String(auctionNumber),
          url:           deepLink,
        },
        webpush: {
          notification: {
            title,
            body,
            icon:               "/loqta-removebg-preview.png",
            badge:              "/loqta-removebg-preview.png",
            requireInteraction: false,
          },
          fcmOptions: { link: deepLink },
        },
      });

      // ── 7. Prune dead tokens ───────────────────────────────────────────
      const deadTokens: string[] = [];
      fcmResponse.responses.forEach((res, idx) => {
        if (!res.success) {
          const code = res.error?.code ?? "";
          console.warn(`[auctionRegistration] FCM failed token[${idx}]: ${code}`);
          if (DEAD_TOKEN_CODES.has(code)) deadTokens.push(uniqueTokens[idx]);
        }
      });

      if (deadTokens.length > 0) {
        await db.collection("users").doc(userId).update({
          fcmTokens: FieldValue.arrayRemove(...deadTokens),
        });
      }

      // console.log(
      //   `[auctionRegistration] FCM uid=${userId}: ` +
      //   `${fcmResponse.successCount} sent / ${fcmResponse.failureCount} failed`,
      // );

      // ── 8. Idempotency stamp ───────────────────────────────────────────
      await snap.ref.update({
        notifiedRegistrationAt: FieldValue.serverTimestamp(),
      });

    } catch (err) {
      console.error(`[auctionRegistration] Error for uid=${userId} auction=${auctionId}:`, err);
    }
  },
);