/**
 * functions/src/Notifications/notifications.ts
 *
 * Trigger: onDocumentUpdated("AuctionRequests/{requestId}")
 *
 * When status flips to "matched" AND matchedAuctionId is set:
 *  1. Creates users/{userId}/notifications/{id} document
 *  2. Sends FCM push to all registered tokens on that user's doc
 *  3. Removes dead tokens automatically
 *  4. Stamps notifiedMatchedAt to prevent duplicate notifications
 *
 * Updated: notification doc now stores productName and productId so the
 * bell component can display the product name and navigate to the correct
 * register page (/auction/register/{productId}).
 */

import { onDocumentUpdated } from "firebase-functions/v2/firestore";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { getMessaging } from "firebase-admin/messaging";

const db = getFirestore();
const messaging = getMessaging();

// All FCM error codes that indicate a token is permanently dead
const DEAD_TOKEN_CODES = new Set([
  "messaging/invalid-registration-token",
  "messaging/registration-token-not-registered",
  "messaging/invalid-argument",
  "messaging/mismatched-credential",      // token belongs to different project
  "messaging/invalid-recipient",
]);

export const onAuctionRequestUpdated = onDocumentUpdated(
  "AuctionRequests/{requestId}",
  async (event) => {
    const before = event.data?.before.data();
    const after  = event.data?.after.data();

    if (!before || !after) return;

    const requestId = event.params.requestId;

    // ── 1. Guard: status must have just changed TO "matched" ─────────────────
    const justMatched = before.status !== "matched" && after.status === "matched";
    if (!justMatched) return;

    // ── 2. Guard: matchedAuctionId must be present ────────────────────────────
    const { userId, productName, matchedAuctionId } = after as {
      userId: string;
      productName: string;
      matchedAuctionId: string | null;
    };

    if (!matchedAuctionId || !userId) {
      console.warn(
        `[notifications] requestId=${requestId}: matched status but ` +
        `userId or matchedAuctionId missing. Skipping.`,
      );
      return;
    }

    // ── 3. Idempotency guard: only run once even if the document is re-saved ──
    if (after.notifiedMatchedAt) {
      // console.log(`[notifications] requestId=${requestId} already notified — skipping.`);
      return;
    }

    // ── 3b. Fetch productId from the matched auction ──────────────────────────
    // Needed so the bell can navigate to /auction/register/{productId}
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

    try {
      // ── 4. Write in-app notification ───────────────────────────────────────
      const notifRef = db
        .collection("users")
        .doc(userId)
        .collection("notifications")
        .doc();

      await notifRef.set({
        type:        "auction_matched",
        requestId,
        auctionId:   matchedAuctionId,
        productId,                        // ← NEW: stored for navigation
        productName,                      // ← NEW: stored for display in bell
        title,
        message:     body,
        isRead:      false,
        createdAt:   FieldValue.serverTimestamp(),
      });

      // console.log(`[notifications] In-app notification created: uid=${userId} notifId=${notifRef.id}`);

      // ── 5. Fetch tokens + deduplicate ──────────────────────────────────────
      const userSnap = await db.collection("users").doc(userId).get();
      const rawTokens: string[] = userSnap.exists
        ? (userSnap.data()?.fcmTokens ?? [])
        : [];

      // Deduplicate: convert to Set, filter empty strings
      const uniqueTokens = [...new Set(rawTokens.filter((t) => typeof t === "string" && t.length > 0))];

      // Self-heal: if we found duplicates, write the deduplicated list back
      if (uniqueTokens.length < rawTokens.length) {
        // console.log(
        //   `[notifications] Found ${rawTokens.length - uniqueTokens.length} duplicate token(s) for uid=${userId} — deduplicating.`,
        // );
        await db.collection("users").doc(userId).update({ fcmTokens: uniqueTokens });
      }

      if (uniqueTokens.length === 0) {
        // console.log(`[notifications] No FCM tokens for uid=${userId} — push skipped.`);
        // Still stamp idempotency so we don't retry
        await event.data!.after.ref.update({ notifiedMatchedAt: FieldValue.serverTimestamp() });
        return;
      }

      // ── 6. Send FCM push ───────────────────────────────────────────────────
      // console.log(`[notifications] Sending to ${uniqueTokens.length} unique token(s) for uid=${userId}`);

      const fcmResponse = await messaging.sendEachForMulticast({
        tokens: uniqueTokens,
        notification: { title, body },
        data: {
          type:        "auction_matched",
          requestId,
          auctionId:   matchedAuctionId,
          productId,
          productName,
          url:         productId
            ? `/auctions/register/${productId}`
            : `/auctions/${matchedAuctionId}`,
        },
        webpush: {
          notification: {
            title,
            body,
            icon:               "/loqta-removebg-preview.png",
            badge:              "/loqta-removebg-preview.png",
            requireInteraction: true,
          },
          fcmOptions: {
            link: productId
              ? `/auctions/register/${productId}`
              : `/auctions/${matchedAuctionId}`,
          },
        },
      });

      // ── 7. Prune dead tokens ───────────────────────────────────────────────
      const deadTokens: string[] = [];
      fcmResponse.responses.forEach((res, idx) => {
        if (!res.success) {
          const code = res.error?.code ?? "";
          console.warn(`[notifications] FCM failed token[${idx}]: ${code}`);
          if (DEAD_TOKEN_CODES.has(code)) {
            deadTokens.push(uniqueTokens[idx]);
          }
        }
      });

      if (deadTokens.length > 0) {
        await db.collection("users").doc(userId).update({
          fcmTokens: FieldValue.arrayRemove(...deadTokens),
        });
        // console.log(`[notifications] Pruned ${deadTokens.length} dead token(s) for uid=${userId}`);
      }

      // console.log(
      //   `[notifications] FCM result uid=${userId}: ` +
      //   `${fcmResponse.successCount} sent / ${fcmResponse.failureCount} failed`,
      // );

      // ── 8. Stamp idempotency field so this never runs twice ────────────────
      await event.data!.after.ref.update({
        notifiedMatchedAt: FieldValue.serverTimestamp(),
      });

    } catch (err) {
      // Never re-throw — Cloud Functions would retry and could duplicate the notification
      console.error(`[notifications] Error for requestId=${requestId}:`, err);
    }
  },
);