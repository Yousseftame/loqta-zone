/**
 * functions/src/Notifications/lastOfferAvailableNotification.ts
 *
 * Trigger: onDocumentUpdated("auctions/{auctionId}")
 *
 * Fires when an auction resolves (winnerId transitions from null/undefined
 * to a real winner UID that is NOT "NO_WINNER") AND lastOfferEnabled = true.
 *
 * What it does:
 *  1. Validates the transition is a fresh resolution with lastOfferEnabled
 *  2. Fetches all Participants in a single subcollection read
 *  3. Resolves the winner's display name + product title (already known
 *     from the auction doc — no extra reads needed for winnerId/winningBid)
 *  4. Batch-writes one in-app notification per non-winner participant
 *  5. Sends FCM push to all non-winner tokens in chunked multicast calls
 *  6. Stamps lastOfferNotifiedAt on the auction doc for idempotency
 *
 * ─── Cost model ────────────────────────────────────────────────────────────
 *  Reads  : 1 (winner user doc) + 1 (product doc) + 1 (Participants query)
 *           + N user docs for FCM tokens (batched via Promise.all)
 *  Writes : 1 (auction idempotency stamp) + N (notification docs, batched)
 *           + token prune writes (only when dead tokens found)
 *  This fires ONCE per auction lifetime. Negligible cost.
 *
 * ─── Deep-link ─────────────────────────────────────────────────────────────
 *  url stored on notification: /auctions/{auctionId}?lastOffer=1
 *  The frontend reads the ?lastOffer=1 param and opens LastOfferModal.
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

    // ── 1. Guard: must be a fresh resolution with a real winner ───────────
    const justResolved =
      (!before.winnerId || before.winnerId === null) &&
      !!after.winnerId &&
      after.winnerId !== "NO_WINNER";

    if (!justResolved) return;

    // ── 2. Guard: lastOfferEnabled must be true ────────────────────────────
    if (!(after.lastOfferEnabled ?? false)) return;

    // ── 3. Idempotency guard ───────────────────────────────────────────────
    if (after.lastOfferNotifiedAt) {
      // console.log(`[lastOfferAvailable] ${auctionId} already notified — skipping.`);
      return;
    }

    const winnerId   = after.winnerId  as string;
    const winningBid = after.winningBid ?? 0;
    const productId  = after.productId  as string | undefined;

    // ── 4. Resolve winner display name ────────────────────────────────────
    let winnerName = "The winner";
    try {
      const winnerSnap = await db.collection("users").doc(winnerId).get();
      if (winnerSnap.exists) {
        const u = winnerSnap.data()!;
        winnerName =
          (u.fullName ??
            u.displayName ??
            `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim()) ||
          "The winner";
      }
    } catch {
      /* non-fatal — default is fine */
    }

    // ── 5. Resolve product title ──────────────────────────────────────────
    let productTitle = "the item";
    if (productId) {
      try {
        const productSnap = await db.collection("products").doc(productId).get();
        if (productSnap.exists) {
          productTitle = productSnap.data()?.title ?? "the item";
        }
      } catch {
        /* non-fatal */
      }
    }

    // ── 6. Fetch all participants ─────────────────────────────────────────
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
      console.error(`[lastOfferAvailable] Failed to fetch participants for ${auctionId}:`, err);
      return;
    }

    // Exclude the winner — they don't need a last-offer prompt
    const recipientIds = participantIds.filter((uid) => uid !== winnerId);

    if (recipientIds.length === 0) {
      // console.log(`[lastOfferAvailable] No non-winner participants for ${auctionId}.`);
      await event.data!.after.ref.update({
        lastOfferNotifiedAt: FieldValue.serverTimestamp(),
      });
      return;
    }

    // ── 7. Build notification content ─────────────────────────────────────
    const formattedBid = winningBid.toLocaleString("en-EG");
    const deepLink     = `/auctions/${auctionId}?lastOffer=1`;

    const title = `🏷️ Last offer opportunity — ${productTitle}`;
    const body  =
      `${winnerName} won with ${formattedBid} EGP. ` +
      `If they don't complete payment, one of the last offers will be selected. ` +
      `Submit yours now — tap to place your offer.`;

    // ── 8. Batch-write in-app notifications ───────────────────────────────
    let notifWritten = 0;

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
        try {
          await batch.commit();
          notifWritten += uids.length;
        } catch (err) {
          console.error("[lastOfferAvailable] Batch write failed:", err);
        }
      }),
    );

    // console.log(`[lastOfferAvailable] In-app notifications written: ${notifWritten}`);

    // ── 9. Fetch FCM tokens for all recipients ────────────────────────────
    const tokenToUid = new Map<string, string>();

    await Promise.allSettled(
      recipientIds.map(async (uid) => {
        try {
          const userSnap = await db.collection("users").doc(uid).get();
          if (!userSnap.exists) return;
          const rawTokens: string[] = userSnap.data()?.fcmTokens ?? [];
          const unique = [...new Set(rawTokens.filter((t) => typeof t === "string" && t.length > 0))];
          unique.forEach((t) => tokenToUid.set(t, uid));
          // Self-heal duplicates while we're here
          if (unique.length < rawTokens.length) {
            await db.collection("users").doc(uid).update({ fcmTokens: unique });
          }
        } catch {
          /* non-fatal — user just won't get push */
        }
      }),
    );

    // ── 10. Send FCM in chunks ─────────────────────────────────────────────
    const allTokens = Array.from(tokenToUid.keys());
    let totalSent = 0, totalFailed = 0;

    if (allTokens.length > 0) {
      await Promise.allSettled(
        chunk(allTokens, FCM_CHUNK_SIZE).map(async (tokens) => {
          try {
            const response = await messaging.sendEachForMulticast({
              tokens,
              notification: { title, body },
              data: {
                type:         "last_offer_available",
                auctionId,
                productId:    productId ?? "",
                productTitle,
                winnerName,
                winningBid:   String(winningBid),
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
            console.error("[lastOfferAvailable] FCM chunk error:", err);
            totalFailed += tokens.length;
          }
        }),
      );
    }

    // console.log(`[lastOfferAvailable] FCM sent=${totalSent} failed=${totalFailed}`);

    // ── 11. Idempotency stamp ──────────────────────────────────────────────
    try {
      await event.data!.after.ref.update({
        lastOfferNotifiedAt: FieldValue.serverTimestamp(),
      });
    } catch (err) {
      console.error("[lastOfferAvailable] Failed to stamp lastOfferNotifiedAt:", err);
    }
  },
);