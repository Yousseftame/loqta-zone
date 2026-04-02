/**
 * functions/src/Notifications/auctionEndedNotification.ts
 *
 * Trigger: onDocumentUpdated("auctions/{auctionId}")
 *
 * Fires when an auction resolves — winnerId transitions from null/undefined
 * to any value (real winner uid OR "NO_WINNER").
 *
 * What it does:
 *  1. Validates the transition is a fresh resolution
 *  2. Fetches the product title from the auction doc's productId
 *  3. Fetches all Participants in a single subcollection read
 *  4. Batch-writes one in-app notification per participant (winner included)
 *  5. Sends FCM push to all participant tokens in chunked multicast calls
 *  6. Stamps auctionEndedNotifiedAt on the auction doc for idempotency
 *
 * ─── Notification behaviour ─────────────────────────────────────────────────
 *  - NOT clickable / navigable — url field is intentionally omitted
 *  - type = "auction_ended"
 *  - Sent to ALL participants regardless of whether they won or lost
 *  - The winner already gets a separate bid_selected / last_offer_selected
 *    notification, so this one is purely a polite "thank you, see you soon"
 *
 * ─── Cost model ─────────────────────────────────────────────────────────────
 *  Reads  : 1 (product doc) + 1 (Participants query)
 *           + N user docs for FCM tokens (batched via Promise.all)
 *  Writes : 1 (auction idempotency stamp) + N (notification docs, batched)
 *           + token prune writes (only when dead tokens found)
 *  Fires ONCE per auction lifetime — negligible cost.
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

    // ── 1. Guard: winnerId must have JUST been set (null/undefined → any value) ─
    const justResolved =
      (before.winnerId === null || before.winnerId === undefined) &&
      !!after.winnerId;

    if (!justResolved) return;

    // ── 2. Idempotency guard ───────────────────────────────────────────────────
    if (after.auctionEndedNotifiedAt) {
      // console.log(`[auctionEnded] ${auctionId} already notified — skipping.`);
      return;
    }

    const auctionNumber: number = after.auctionNumber ?? 0;
    const productId: string     = after.productId     ?? "";

    // ── 3. Resolve product title ───────────────────────────────────────────────
    let productTitle = "";
    if (productId) {
      try {
        const productSnap = await db.collection("products").doc(productId).get();
        if (productSnap.exists) {
          productTitle = productSnap.data()?.title ?? "";
        }
      } catch {
        /* non-fatal — we'll show just the auction number */
      }
    }

    // ── 4. Fetch all participants ──────────────────────────────────────────────
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
      console.error(`[auctionEnded] Failed to fetch participants for ${auctionId}:`, err);
      return;
    }

    if (participantIds.length === 0) {
      // console.log(`[auctionEnded] No participants for ${auctionId} — nothing to notify.`);
      await event.data!.after.ref.update({
        auctionEndedNotifiedAt: FieldValue.serverTimestamp(),
      });
      return;
    }

    // ── 5. Build notification content ──────────────────────────────────────────
    // The title and body are intentionally warm and non-transactional.
    // Localization is handled client-side in NotificationBell (getLocalizedNotif).
    // We store the raw data fields so the client can reconstruct any language.

    const titleEn = `Auction #${auctionNumber} Has Ended`;
    const bodyEn  = productTitle
      ? `Thank you for participating in the auction for "${productTitle}" (#${auctionNumber}). We hope to see you in our next auction soon! 🎉`
      : `Thank you for participating in Auction #${auctionNumber}. We hope to see you in our next auction soon! 🎉`;

    // ── 6. Batch-write in-app notifications ───────────────────────────────────
    let notifWritten = 0;

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
              // url intentionally omitted — this notification is NOT clickable/navigable
              createdAt:     FieldValue.serverTimestamp(),
            },
          );
        });
        try {
          await batch.commit();
          notifWritten += uids.length;
        } catch (err) {
          console.error("[auctionEnded] Batch write failed:", err);
        }
      }),
    );

    // console.log(`[auctionEnded] In-app notifications written: ${notifWritten}`);

    // ── 7. Fetch FCM tokens for all participants ────────────────────────────────
    const tokenToUid = new Map<string, string>();

    await Promise.allSettled(
      participantIds.map(async (uid) => {
        try {
          const userSnap = await db.collection("users").doc(uid).get();
          if (!userSnap.exists) return;
          const rawTokens: string[] = userSnap.data()?.fcmTokens ?? [];
          const unique = [
            ...new Set(rawTokens.filter((t) => typeof t === "string" && t.length > 0)),
          ];
          unique.forEach((t) => tokenToUid.set(t, uid));
          // Self-heal duplicates while we're here
          if (unique.length < rawTokens.length) {
            await db.collection("users").doc(uid).update({ fcmTokens: unique });
          }
        } catch {
          /* non-fatal */
        }
      }),
    );

    // ── 8. Send FCM in chunks ──────────────────────────────────────────────────
    const allTokens = Array.from(tokenToUid.keys());
    let totalSent = 0, totalFailed = 0;

    if (allTokens.length > 0) {
      await Promise.allSettled(
        chunk(allTokens, FCM_CHUNK_SIZE).map(async (tokens) => {
          try {
            const response = await messaging.sendEachForMulticast({
              tokens,
              notification: { title: titleEn, body: bodyEn },
              data: {
                type:          "auction_ended",
                auctionId,
                productId:     productId ?? "",
                productTitle,
                auctionNumber: String(auctionNumber),
              },
              webpush: {
                notification: {
                  title: titleEn,
                  body:  bodyEn,
                  icon:               "/loqta-removebg-preview.png",
                  badge:              "/loqta-removebg-preview.png",
                  requireInteraction: false,
                },
                // No fcmOptions.link — intentionally non-navigable
              },
            });

            totalSent   += response.successCount;
            totalFailed += response.failureCount;

            // Prune dead tokens
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
            totalFailed += tokens.length;
          }
        }),
      );
    }

    // console.log(`[auctionEnded] FCM sent=${totalSent} failed=${totalFailed}`);

    // ── 9. Idempotency stamp ────────────────────────────────────────────────────
    try {
      await event.data!.after.ref.update({
        auctionEndedNotifiedAt: FieldValue.serverTimestamp(),
      });
    } catch (err) {
      console.error("[auctionEnded] Failed to stamp auctionEndedNotifiedAt:", err);
    }
  },
);