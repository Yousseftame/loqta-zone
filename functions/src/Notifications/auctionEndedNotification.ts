/**
 * functions/src/Notifications/auctionEndedNotification.ts
 *
 * i18n change: uses resolveProductTitle() for product.title.
 */

import { onDocumentUpdated } from "firebase-functions/v2/firestore";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { getMessaging, MulticastMessage } from "firebase-admin/messaging";
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

const FCM_CHUNK_SIZE      = 500;
const FIRESTORE_BATCH_MAX = 249;

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export const onAuctionEnded = onDocumentUpdated(
  { document: "auctions/{auctionId}", timeoutSeconds: 120, memory: "512MiB" },
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
    const winnerId: string      = after.winnerId      ?? "";
    
    const isRealWinner = winnerId && winnerId !== "NO_WINNER";

    let productTitle = "";
    if (productId) {
      try {
        const productSnap = await db.collection("products").doc(productId).get();
        if (productSnap.exists) {
          // ← i18n
          productTitle = resolveProductTitle(productSnap.data()?.title);
        }
      } catch { /* non-fatal */ }
    }

    let participantIds: string[] = [];
    try {
      const participantsSnap = await db
        .collection("auctions").doc(auctionId).collection("Participants").get();
      participantIds = participantsSnap.docs
        .map((d) => d.data().userId ?? d.id)
        .filter((uid) => typeof uid === "string" && uid.length > 0);
    } catch (err) {
      console.error("[auctionEnded] Failed to fetch participants:", err);
      return;
    }

    if (participantIds.length === 0) {
      await event.data!.after.ref.update({ auctionEndedNotifiedAt: FieldValue.serverTimestamp() });
      return;
    }

    // 1. Create Firestore Notifications
    await Promise.allSettled(
      chunk(participantIds, FIRESTORE_BATCH_MAX).map(async (uids) => {
        const batch = db.batch();
        uids.forEach((uid) => {
          let titleEnEnded = `Auction #${auctionNumber} Has Ended`;
          let bodyEnEnded  = productTitle
            ? `Thank you for participating in the auction for "${productTitle}" (#${auctionNumber}). We hope to see you in our next auction soon! 🎉`
            : `Thank you for participating in Auction #${auctionNumber}. We hope to see you in our next auction soon! 🎉`;

          // ALWAYS send auction_ended to everyone
          batch.set(
            db.collection("users").doc(uid).collection("notifications").doc(),
            { type: "auction_ended", auctionId, productId: productId ?? "", productTitle,
              auctionNumber, title: titleEnEnded, message: bodyEnEnded, isRead: false,
              createdAt: FieldValue.serverTimestamp() },
          );

          // If there is a real winner, additionally send winner/loser notification
          if (isRealWinner) {
            let type: string;
            let titleEn: string;
            let bodyEn: string;
            if (uid === winnerId) {
              type = "auction_winner";
              titleEn = `🎉 You Won Auction #${auctionNumber}!`;
              bodyEn = productTitle
                ? `Amazing news! You are the winner of the auction for "${productTitle}" (#${auctionNumber}). Tap to complete your payment.`
                : `Amazing news! You are the winner of Auction #${auctionNumber}. Tap to complete your payment.`;
            } else {
              type = "auction_loser";
              titleEn = `🍀 Better luck next time`;
              bodyEn = productTitle
                ? `Thank you for joining the auction for "${productTitle}" (#${auctionNumber}). Don't give up, your next win is just around the corner!`
                : `Thank you for participating in Auction #${auctionNumber}. Don't give up, your next win is just around the corner!`;
            }

            batch.set(
              db.collection("users").doc(uid).collection("notifications").doc(),
              { type, auctionId, productId: productId ?? "", productTitle,
                auctionNumber, title: titleEn, message: bodyEn, isRead: false,
                createdAt: FieldValue.serverTimestamp() },
            );
          }
        });
        try { await batch.commit(); }
        catch (err) { console.error("[auctionEnded] Batch write failed:", err); }
      }),
    );

    // 2. Resolve Tokens
    const tokenToUid = new Map<string, string>();
    const tokensByUid = new Map<string, string[]>();

    await Promise.allSettled(
      participantIds.map(async (uid) => {
        try {
          const userSnap = await db.collection("users").doc(uid).get();
          if (!userSnap.exists) return;
          const rawTokens: string[] = userSnap.data()?.fcmTokens ?? [];
          const unique = [...new Set(rawTokens.filter((t) => typeof t === "string" && t.length > 0))];
          unique.forEach((t) => tokenToUid.set(t, uid));
          tokensByUid.set(uid, unique);
          
          if (unique.length < rawTokens.length) {
            await db.collection("users").doc(uid).update({ fcmTokens: unique });
          }
        } catch { /* non-fatal */ }
      }),
    );

    const winnerTokens: string[] = [];
    const loserTokens: string[] = [];
    const allTokensArr: string[] = [];

    for (const [uid, tokens] of tokensByUid.entries()) {
      allTokensArr.push(...tokens);
      if (isRealWinner) {
        if (uid === winnerId) winnerTokens.push(...tokens);
        else loserTokens.push(...tokens);
      }
    }

    // Helper to send multicast
    const sendFCM = async (
      tokens: string[],
      type: string,
      titleEn: string,
      bodyEn: string
    ) => {
      if (tokens.length === 0) return;

      await Promise.allSettled(
        chunk(tokens, FCM_CHUNK_SIZE).map(async (batchTokens) => {
          try {
            const message: MulticastMessage = {
              tokens: batchTokens,
              data: {
                type,
                auctionId,
                productId: productId ?? "",
                productTitle,
                auctionNumber: String(auctionNumber),
                title: titleEn,
                body: bodyEn,
              },
            };
            const response = await messaging.sendEachForMulticast(message);

            const deadByUid = new Map<string, string[]>();
            response.responses.forEach((res, idx) => {
              if (!res.success && DEAD_TOKEN_CODES.has(res.error?.code ?? "")) {
                const uid = tokenToUid.get(batchTokens[idx]);
                if (uid) {
                  const arr = deadByUid.get(uid) ?? [];
                  arr.push(batchTokens[idx]);
                  deadByUid.set(uid, arr);
                }
              }
            });

            if (deadByUid.size > 0) {
              await Promise.allSettled(
                Array.from(deadByUid.entries()).map(([uid, dead]) =>
                  db.collection("users").doc(uid).update({ fcmTokens: FieldValue.arrayRemove(...dead) }),
                ),
              );
            }
          } catch (err) {
            console.error(`[auctionEnded] FCM chunk error (${type}):`, err);
          }
        })
      );
    };

    // 3. Send FCM Messages
    // Always send auction_ended to everyone
    await sendFCM(
      allTokensArr,
      "auction_ended",
      `Auction #${auctionNumber} Has Ended`,
      productTitle
        ? `Thank you for participating in the auction for "${productTitle}" (#${auctionNumber}). We hope to see you in our next auction soon! 🎉`
        : `Thank you for participating in Auction #${auctionNumber}. We hope to see you in our next auction soon! 🎉`
    );

    if (isRealWinner) {
      await sendFCM(
        winnerTokens,
        "auction_winner",
        `🎉 You Won Auction #${auctionNumber}!`,
        productTitle
          ? `Amazing news! You are the winner of the auction for "${productTitle}" (#${auctionNumber}). Tap to complete your payment.`
          : `Amazing news! You are the winner of Auction #${auctionNumber}. Tap to complete your payment.`
      );
      await sendFCM(
        loserTokens,
        "auction_loser",
        `🍀 Better luck next time`,
        productTitle
          ? `Thank you for joining the auction for "${productTitle}" (#${auctionNumber}). Don't give up, your next win is just around the corner!`
          : `Thank you for participating in Auction #${auctionNumber}. Don't give up, your next win is just around the corner!`
      );
    }

    try {
      await event.data!.after.ref.update({ auctionEndedNotifiedAt: FieldValue.serverTimestamp() });
    } catch (err) {
      console.error("[auctionEnded] Failed to stamp auctionEndedNotifiedAt:", err);
    }
  },
);