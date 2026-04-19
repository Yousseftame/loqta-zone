/**
 * functions/src/Notifications/auctionRegistrationNotification.ts
 *
 * i18n change: uses resolveProductTitle() for product.title.
 */

import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { getMessaging } from "firebase-admin/messaging";
import { resolveProductTitle } from "../shared/i18nHelpers";

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
  { document: "auctions/{auctionId}/Participants/{userId}", timeoutSeconds: 60, memory: "256MiB" },
  async (event) => {
    const snap      = event.data;
    const auctionId = event.params.auctionId;
    const userId    = event.params.userId;

    if (!snap?.exists) return;
    const data = snap.data()!;

    if (data.notifiedRegistrationAt) return;

    let auctionNumber = 0;
    let productId     = "";
    let entryFee      = 0;
    let entryType     = "free";

    try {
      const auctionSnap = await db.collection("auctions").doc(auctionId).get();
      if (!auctionSnap.exists) return;
      const auctionData = auctionSnap.data()!;
      auctionNumber = auctionData.auctionNumber ?? 0;
      productId     = auctionData.productId     ?? "";
      entryFee      = auctionData.entryFee      ?? 0;
      entryType     = auctionData.entryType     ?? "free";
    } catch (err) {
      console.error("[auctionRegistration] Failed to fetch auction:", err);
      return;
    }

    if (!productId) return;

    let productTitle = "the item";
    try {
      const productSnap = await db.collection("products").doc(productId).get();
      if (productSnap.exists) {
        // ← i18n
        productTitle = resolveProductTitle(productSnap.data()?.title) || "the item";
      }
    } catch { /* non-fatal */ }

    const deepLink = `/auctions/register/${productId}`;
    const feeLabel = entryType === "paid" && entryFee > 0
      ? `${entryFee.toLocaleString("en-EG")} EGP entry fee`
      : "free entry";

    const title = `✅ You're registered for Auction #${auctionNumber}`;
    const body  = `You've successfully joined the auction for "${productTitle}" (#${auctionNumber}) with ${feeLabel}. Good luck!`;

    try {
      await db.collection("users").doc(userId).collection("notifications").doc().set({
        type: "auction_registered", auctionId, productId, productTitle, auctionNumber,
        entryFee, entryType, title, message: body, isRead: false, url: deepLink,
        createdAt: FieldValue.serverTimestamp(),
      });

      const userSnap = await db.collection("users").doc(userId).get();
      const rawTokens: string[] = userSnap.exists ? (userSnap.data()?.fcmTokens ?? []) : [];
      const uniqueTokens = [...new Set(rawTokens.filter((t) => typeof t === "string" && t.length > 0))];

      if (uniqueTokens.length < rawTokens.length) {
        await db.collection("users").doc(userId).update({ fcmTokens: uniqueTokens });
      }

      if (uniqueTokens.length === 0) {
        await snap.ref.update({ notifiedRegistrationAt: FieldValue.serverTimestamp() });
        return;
      }

      const fcmResponse = await messaging.sendEachForMulticast({
        tokens: uniqueTokens,
        data: { type: "auction_registered", auctionId, productId, productTitle,
          auctionNumber: String(auctionNumber), title, body, url: deepLink },
        webpush: { fcmOptions: { link: deepLink } },
      });

      const deadTokens: string[] = [];
      fcmResponse.responses.forEach((res, idx) => {
        if (!res.success && DEAD_TOKEN_CODES.has(res.error?.code ?? ""))
          deadTokens.push(uniqueTokens[idx]);
      });

      if (deadTokens.length > 0) {
        await db.collection("users").doc(userId).update({ fcmTokens: FieldValue.arrayRemove(...deadTokens) });
      }

      await snap.ref.update({ notifiedRegistrationAt: FieldValue.serverTimestamp() });
    } catch (err) {
      console.error(`[auctionRegistration] Error for uid=${userId}:`, err);
    }
  },
);