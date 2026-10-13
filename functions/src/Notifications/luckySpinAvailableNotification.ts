/**
 * functions/src/Notifications/luckySpinAvailableNotification.ts
 *
 * Notifies non-winning participants when an auction resolves so they can
 * spin the Lucky Wheel for a next-entry discount — if they haven't claimed yet.
 *
 * Pattern mirrors lastOfferAvailableNotification (additive; does not modify it).
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

const FCM_CHUNK_SIZE      = 500;
const FIRESTORE_BATCH_MAX = 499;

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export const onAuctionResolvedLuckySpin = onDocumentUpdated(
  { document: "auctions/{auctionId}", timeoutSeconds: 120, memory: "512MiB" },
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
    if (after.luckySpinNotifiedAt) return;

    const winnerId: string       = after.winnerId as string;
    const auctionNumber: number  = after.auctionNumber ?? 0;
    const productId: string | undefined = after.productId;

    let productTitle = "";
    if (productId) {
      try {
        const productSnap = await db.collection("products").doc(productId).get();
        if (productSnap.exists) {
          productTitle = resolveProductTitle(productSnap.data()?.title) || "";
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
      console.error("[luckySpinAvailable] Failed to fetch participants:", err);
      return;
    }

    // Losers only
    const loserIds = participantIds.filter((uid) => uid !== winnerId);

    // Skip anyone who already claimed a lucky spin for this auction
    const recipientIds: string[] = [];
    await Promise.allSettled(
      loserIds.map(async (uid) => {
        try {
          const joinSnap = await db
            .collection("users").doc(uid)
            .collection("auctions").doc(auctionId)
            .get();
          if (joinSnap.exists && joinSnap.data()?.luckySpin) return;
          recipientIds.push(uid);
        } catch {
          recipientIds.push(uid);
        }
      }),
    );

    if (recipientIds.length === 0) {
      await event.data!.after.ref.update({
        luckySpinNotifiedAt: FieldValue.serverTimestamp(),
      });
      return;
    }

    const title = productTitle
      ? `Lucky Spin — ${productTitle}`
      : `Lucky Spin — Auction #${auctionNumber}`;
    const body = productTitle
      ? `You didn't win "${productTitle}" (#${auctionNumber}). Spin the lucky wheel for an exclusive discount on your next auction entry!`
      : `You didn't win Auction #${auctionNumber}. Spin the lucky wheel for an exclusive discount on your next auction entry!`;

    await Promise.allSettled(
      chunk(recipientIds, FIRESTORE_BATCH_MAX).map(async (uids) => {
        const batch = db.batch();
        uids.forEach((uid) => {
          batch.set(
            db.collection("users").doc(uid).collection("notifications").doc(),
            {
              type: "lucky_spin_available",
              auctionId,
              productId: productId ?? "",
              productTitle,
              auctionNumber,
              title,
              message: body,
              isRead: false,
              createdAt: FieldValue.serverTimestamp(),
            },
          );
        });
        try { await batch.commit(); }
        catch (err) { console.error("[luckySpinAvailable] Batch write failed:", err); }
      }),
    );

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
            const response = await messaging.sendEachForMulticast({
              tokens,
              data: {
                type: "lucky_spin_available",
                auctionId,
                productId: productId ?? "",
                productTitle,
                auctionNumber: String(auctionNumber),
                title,
                body,
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
            console.error("[luckySpinAvailable] FCM chunk error:", err);
          }
        }),
      );
    }

    try {
      await event.data!.after.ref.update({
        luckySpinNotifiedAt: FieldValue.serverTimestamp(),
      });
    } catch (err) {
      console.error("[luckySpinAvailable] Failed to stamp luckySpinNotifiedAt:", err);
    }
  },
);
