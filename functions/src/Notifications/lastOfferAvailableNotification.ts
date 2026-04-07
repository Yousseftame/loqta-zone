/**
 * functions/src/Notifications/lastOfferAvailableNotification.ts
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

export const onAuctionResolvedLastOffer = onDocumentUpdated(
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
      (!before.winnerId || before.winnerId === null) &&
      !!after.winnerId &&
      after.winnerId !== "NO_WINNER";

    if (!justResolved) return;
    if (!(after.lastOfferEnabled ?? false)) return;
    if (after.lastOfferNotifiedAt) return;

    const winnerId   = after.winnerId  as string;
    const winningBid = after.winningBid ?? 0;
    const productId  = after.productId  as string | undefined;

    let winnerName = "The winner";
    try {
      const winnerSnap = await db.collection("users").doc(winnerId).get();
      if (winnerSnap.exists) {
        const u = winnerSnap.data()!;
        winnerName =
          (u.fullName ?? u.displayName ?? `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim()) ||
          "The winner";
      }
    } catch { /* non-fatal */ }

    let productTitle = "the item";
    if (productId) {
      try {
        const productSnap = await db.collection("products").doc(productId).get();
        if (productSnap.exists) {
          productTitle = productSnap.data()?.title ?? "the item";
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
      console.error(`[lastOfferAvailable] Failed to fetch participants:`, err);
      return;
    }

    const recipientIds = participantIds.filter((uid) => uid !== winnerId);

    if (recipientIds.length === 0) {
      await event.data!.after.ref.update({ lastOfferNotifiedAt: FieldValue.serverTimestamp() });
      return;
    }

    const formattedBid = winningBid.toLocaleString("en-EG");
    const deepLink     = `/auctions/${auctionId}?lastOffer=1`;

    const title = `🏷️ Last offer opportunity — ${productTitle}`;
    const body  =
      `${winnerName} won with ${formattedBid} EGP. ` +
      `If they don't complete payment, one of the last offers will be selected. ` +
      `Submit yours now — tap to place your offer.`;

    // Write in-app notifications
    await Promise.allSettled(
      chunk(recipientIds, FIRESTORE_BATCH_MAX).map(async (uids) => {
        const batch = db.batch();
        uids.forEach((uid) => {
          batch.set(
            db.collection("users").doc(uid).collection("notifications").doc(),
            {
              type:         "last_offer_available",
              auctionId,
              productId:    productId ?? "",
              productTitle,
              winnerName,
              winningBid,
              title,
              message:      body,
              isRead:       false,
              url:          deepLink,
              createdAt:    FieldValue.serverTimestamp(),
            },
          );
        });
        try { await batch.commit(); }
        catch (err) { console.error("[lastOfferAvailable] Batch write failed:", err); }
      }),
    );

    // Fetch FCM tokens
    const tokenToUid = new Map<string, string>();

    await Promise.allSettled(
      recipientIds.map(async (uid) => {
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
                type:         "last_offer_available",
                auctionId,
                productId:    productId ?? "",
                productTitle,
                winnerName,
                winningBid:   String(winningBid),
                title,
                body,
                url:          deepLink,
              },
              webpush: {
                fcmOptions: { link: deepLink },
              },
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
            console.error("[lastOfferAvailable] FCM chunk error:", err);
          }
        }),
      );
    }

    try {
      await event.data!.after.ref.update({
        lastOfferNotifiedAt: FieldValue.serverTimestamp(),
      });
    } catch (err) {
      console.error("[lastOfferAvailable] Failed to stamp lastOfferNotifiedAt:", err);
    }
  },
);