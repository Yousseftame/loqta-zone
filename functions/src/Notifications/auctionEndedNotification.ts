/**
 * functions/src/Notifications/auctionEndedNotification.ts
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

const FCM_CHUNK_SIZE      = 500;
const FIRESTORE_BATCH_MAX = 499;

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export const onAuctionEnded = onDocumentUpdated(
  {
    document:       "auctions/{auctionId}",
    timeoutSeconds: 120,
    memory:         "512MiB",
  },
  async (event) => {
    const before = event.data?.before.data();
    const after  = event.data?.after.data();

    if (!before || !after) return;

    const auctionId = event.params.auctionId;

    const justResolved =
      (before.winnerId === null || before.winnerId === undefined) &&
      !!after.winnerId;

    if (!justResolved) return;

    if (after.auctionEndedNotifiedAt) return;

    const auctionNumber: number = after.auctionNumber ?? 0;
    const productId: string     = after.productId     ?? "";

    let productTitle = "";
    if (productId) {
      try {
        const productSnap = await db.collection("products").doc(productId).get();
        if (productSnap.exists) {
          productTitle = productSnap.data()?.title ?? "";
        }
      } catch { /* non-fatal */ }
    }

    let participantIds: string[] = [];
    try {
      const participantsSnap = await db
        .collection("auctions")
        .doc(auctionId)
        .collection("Participants")
        .get();

      participantIds = participantsSnap.docs
        .map((d) => d.data().userId ?? d.id)
        .filter((uid) => typeof uid === "string" && uid.length > 0);
    } catch (err) {
      console.error(`[auctionEnded] Failed to fetch participants:`, err);
      return;
    }

    if (participantIds.length === 0) {
      await event.data!.after.ref.update({
        auctionEndedNotifiedAt: FieldValue.serverTimestamp(),
      });
      return;
    }

    const titleEn = `Auction #${auctionNumber} Has Ended`;
    const bodyEn  = productTitle
      ? `Thank you for participating in the auction for "${productTitle}" (#${auctionNumber}). We hope to see you in our next auction soon! 🎉`
      : `Thank you for participating in Auction #${auctionNumber}. We hope to see you in our next auction soon! 🎉`;

    // Write in-app notifications
    await Promise.allSettled(
      chunk(participantIds, FIRESTORE_BATCH_MAX).map(async (uids) => {
        const batch = db.batch();
        uids.forEach((uid) => {
          batch.set(
            db.collection("users").doc(uid).collection("notifications").doc(),
            {
              type:          "auction_ended",
              auctionId,
              productId:     productId ?? "",
              productTitle,
              auctionNumber,
              title:         titleEn,
              message:       bodyEn,
              isRead:        false,
              createdAt:     FieldValue.serverTimestamp(),
            },
          );
        });
        try { await batch.commit(); }
        catch (err) { console.error("[auctionEnded] Batch write failed:", err); }
      }),
    );

    // Fetch FCM tokens
    const tokenToUid = new Map<string, string>();

    await Promise.allSettled(
      participantIds.map(async (uid) => {
        try {
          const userSnap = await db.collection("users").doc(uid).get();
          if (!userSnap.exists) return;
          const rawTokens: string[] = userSnap.data()?.fcmTokens ?? [];
          const unique = [...new Set(rawTokens.filter((t) => typeof t === "string" && t.length > 0))];
          unique.forEach((t) => tokenToUid.set(t, uid));
          if (unique.length < rawTokens.length) {
            await db.collection("users").doc(uid).update({ fcmTokens: unique });
          }
        } catch { /* non-fatal */ }
      }),
    );

    const allTokens = Array.from(tokenToUid.keys());

    if (allTokens.length > 0) {
      await Promise.allSettled(
        chunk(allTokens, FCM_CHUNK_SIZE).map(async (tokens) => {
          try {
            // DATA-ONLY — no `notification` field, no `webpush.notification`
            const response = await messaging.sendEachForMulticast({
              tokens,
              data: {
                type:          "auction_ended",
                auctionId,
                productId:     productId ?? "",
                productTitle,
                auctionNumber: String(auctionNumber),
                title:         titleEn,
                body:          bodyEn,
              },
              // No webpush.notification — auction_ended is non-navigable
            });

            const deadByUid = new Map<string, string[]>();
            response.responses.forEach((res, idx) => {
              if (!res.success && DEAD_TOKEN_CODES.has(res.error?.code ?? "")) {
                const uid = tokenToUid.get(tokens[idx]);
                if (uid) {
                  const arr = deadByUid.get(uid) ?? [];
                  arr.push(tokens[idx]);
                  deadByUid.set(uid, arr);
                }
              }
            });

            if (deadByUid.size > 0) {
              await Promise.allSettled(
                Array.from(deadByUid.entries()).map(([uid, dead]) =>
                  db.collection("users").doc(uid).update({
                    fcmTokens: FieldValue.arrayRemove(...dead),
                  }),
                ),
              );
            }
          } catch (err) {
            console.error("[auctionEnded] FCM chunk error:", err);
          }
        }),
      );
    }

    try {
      await event.data!.after.ref.update({
        auctionEndedNotifiedAt: FieldValue.serverTimestamp(),
      });
    } catch (err) {
      console.error("[auctionEnded] Failed to stamp auctionEndedNotifiedAt:", err);
    }
  },
);