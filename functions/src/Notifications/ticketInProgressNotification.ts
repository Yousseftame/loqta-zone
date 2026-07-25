/**
 * functions/src/Notifications/ticketInProgressNotification.ts
 *
 * Fires when an admin/super-admin changes an auction support ticket
 * status to "in_progress".
 *
 * - In-app notification under users/{userId}/notifications
 * - Browser push via data-only FCM (same pattern as contact/feedback)
 * - Requires userId on the ticket (always set on submit)
 * - Idempotent via notifiedInProgressAt stamp
 */

import { onDocumentUpdated } from "firebase-functions/v2/firestore";
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

export const onTicketInProgress = onDocumentUpdated(
  "auctionSupportTickets/{ticketId}",
  async (event) => {
    const before = event.data?.before.data();
    const after  = event.data?.after.data();
    if (!before || !after || !event.data) return;

    const justInProgress =
      before.status !== "in_progress" && after.status === "in_progress";
    if (!justInProgress) return;
    if (after.notifiedInProgressAt) return;

    const userId = after.userId as string | null | undefined;
    if (!userId || typeof userId !== "string") return;

    const ticketId = event.params.ticketId;
    const auctionNumber = after.auctionNumber ?? "";
    let productId = (after.productId as string | undefined) || "";
    const auctionId = (after.auctionId as string | undefined) || "";
    let productName = resolveProductTitle(after.productName, "");

    // Resolve missing product info from the auction / product docs
    // (older tickets may not have stored productName / productId).
    try {
      if ((!productName || !productId) && auctionId) {
        const auctionSnap = await db.collection("auctions").doc(String(auctionId)).get();
        if (auctionSnap.exists) {
          const aData = auctionSnap.data()!;
          if (!productId) productId = (aData.productId as string) || "";
        }
      }
      if (!productName && productId) {
        const productSnap = await db.collection("products").doc(productId).get();
        if (productSnap.exists) {
          productName = resolveProductTitle(productSnap.data()?.title, "");
        }
      }
    } catch (err) {
      console.warn("[ticketInProgressNotification] Could not resolve product name:", err);
    }

    const type  = "ticket_in_progress";
    const title = "We're working on your ticket ✓";
    const body  =
      productName && auctionNumber
        ? `Our support team has reviewed your ticket for "${productName}" Auction #${auctionNumber} and is working on it now. We'll solve it as soon as possible.`
        : auctionNumber
          ? `Our support team has reviewed your ticket for Auction #${auctionNumber} and is working on it now. We'll solve it as soon as possible.`
          : "Our support team has reviewed your ticket and is working on it now. We'll solve it as soon as possible.";

    const deepLink = productId
      ? `/auctions/register/${productId}`
      : auctionId
        ? `/auctions/${auctionId}`
        : "/auctions";

    try {
      await db.collection("users").doc(userId).collection("notifications").doc().set({
        type,
        title,
        message:       body,
        isRead:        false,
        url:           deepLink,
        ticketId,
        auctionId,
        auctionNumber,
        productId,
        productName,
        createdAt:     FieldValue.serverTimestamp(),
      });

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
        await event.data.after.ref.update({
          notifiedInProgressAt: FieldValue.serverTimestamp(),
        });
        return;
      }

      // DATA-ONLY — no top-level `notification` field (avoids duplicate browser toasts)
      const fcmResponse = await messaging.sendEachForMulticast({
        tokens: uniqueTokens,
        data: {
          type,
          title,
          body,
          url: deepLink,
          ticketId,
          auctionId: String(auctionId),
          auctionNumber: String(auctionNumber),
          productId,
          productName,
        },
        webpush: {
          fcmOptions: { link: deepLink },
        },
      });

      const deadTokens: string[] = [];
      fcmResponse.responses.forEach((res, idx) => {
        if (!res.success && DEAD_TOKEN_CODES.has(res.error?.code ?? "")) {
          deadTokens.push(uniqueTokens[idx]);
        }
      });

      if (deadTokens.length > 0) {
        await db.collection("users").doc(userId).update({
          fcmTokens: FieldValue.arrayRemove(...deadTokens),
        });
      }

      await event.data.after.ref.update({
        notifiedInProgressAt: FieldValue.serverTimestamp(),
      });
    } catch (err) {
      console.error(
        `[ticketInProgressNotification] Error for ticketId=${ticketId}:`,
        err,
      );
    }
  },
);
