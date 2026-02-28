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
 */

import { onDocumentUpdated } from "firebase-functions/v2/firestore";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { getMessaging } from "firebase-admin/messaging";

const db = getFirestore();
const messaging = getMessaging();

// ─────────────────────────────────────────────────────────────────────────────

export const onAuctionRequestUpdated = onDocumentUpdated(
  "AuctionRequests/{requestId}",
  async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();

    if (!before || !after) return;

    const requestId = event.params.requestId;

    // ── 1. Guard: status must have just changed TO "matched" ─────────────────
    const justMatched =
      before.status !== "matched" && after.status === "matched";
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
      console.log(
        `[notifications] requestId=${requestId} already notified — skipping.`,
      );
      return;
    }

    const title = "Your requested item is now available! 🎉";
    const body = `${productName} is now live in auctions. Place your bid now!`;

    try {
      // ── 4. Write in-app notification ───────────────────────────────────────
      const notifRef = db
        .collection("users")
        .doc(userId)
        .collection("notifications")
        .doc(); // auto-ID

      await notifRef.set({
        type: "auction_matched",
        requestId,
        auctionId: matchedAuctionId,
        title,
        message: body,
        isRead: false,
        createdAt: FieldValue.serverTimestamp(),
      });

      console.log(
        `[notifications] In-app notification created: ` +
          `uid=${userId} notifId=${notifRef.id}`,
      );

      // ── 5. Send FCM push ───────────────────────────────────────────────────
      const userSnap = await db.collection("users").doc(userId).get();
      const tokens: string[] = userSnap.exists
        ? (userSnap.data()?.fcmTokens ?? [])
        : [];

      if (tokens.length > 0) {
        const fcmResponse = await messaging.sendEachForMulticast({
          tokens,
          notification: { title, body },
          data: {
            type: "auction_matched",
            requestId,
            auctionId: matchedAuctionId,
            productName,
            url: `/auctions/${matchedAuctionId}`,
          },
          webpush: {
            notification: {
              title,
              body,
              icon: "/loqta-removebg-preview.png",
              badge: "/loqta-removebg-preview.png",
              requireInteraction: true,
            },
            fcmOptions: { link: `/auctions/${matchedAuctionId}` },
          },
        });

        // ── 6. Prune dead tokens ─────────────────────────────────────────────
        const deadTokens: string[] = [];
        fcmResponse.responses.forEach((res, idx) => {
          if (!res.success) {
            const code = res.error?.code ?? "";
            console.warn(`[notifications] FCM failed token[${idx}]: ${code}`);
            if (
              [
                "messaging/invalid-registration-token",
                "messaging/registration-token-not-registered",
                "messaging/invalid-argument",
              ].includes(code)
            ) {
              deadTokens.push(tokens[idx]);
            }
          }
        });

        if (deadTokens.length > 0) {
          await db
            .collection("users")
            .doc(userId)
            .update({ fcmTokens: FieldValue.arrayRemove(...deadTokens) });
          console.log(
            `[notifications] Removed ${deadTokens.length} dead token(s) for uid=${userId}`,
          );
        }

        console.log(
          `[notifications] FCM sent uid=${userId}: ` +
            `${fcmResponse.successCount} ok / ${fcmResponse.failureCount} failed`,
        );
      } else {
        console.log(
          `[notifications] No FCM tokens for uid=${userId} — push skipped.`,
        );
      }

      // ── 7. Stamp idempotency field so this never runs twice ────────────────
      await event.data!.after.ref.update({
        notifiedMatchedAt: FieldValue.serverTimestamp(),
      });
    } catch (err) {
      // Never re-throw — Cloud Functions would retry and could duplicate the notification
      console.error(
        `[notifications] Error for requestId=${requestId}:`,
        err,
      );
    }
  },
);