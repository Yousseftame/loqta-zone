/**
 * functions/src/Notifications/auctionCreatedNotification.ts
 *
 * i18n change: product.title is now { en, ar } instead of a plain string.
 * Use resolveProductTitle() from shared/i18nHelpers to extract the EN value
 * (and legacy plain-string docs continue to work unchanged).
 */

import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { getFirestore, FieldValue, Timestamp } from "firebase-admin/firestore";
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

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-EG", {
    day:    "numeric",
    month:  "short",
    year:   "numeric",
    hour:   "2-digit",
    minute: "2-digit",
  });
}

export const onAuctionCreated = onDocumentCreated(
  { document: "auctions/{auctionId}", timeoutSeconds: 120, memory: "512MiB" },
  async (event) => {
    const snap      = event.data;
    const auctionId = event.params.auctionId;

    if (!snap?.exists) return;
    const data = snap.data()!;

    if (data.auctionCreatedNotifiedAt) return;
    if (!data.isActive) return;

    const auctionNumber: number = data.auctionNumber ?? 0;
    const productId: string     = data.productId     ?? "";

    // ── Resolve product title + thumbnail ──────────────────────────────────
    let productTitle     = "";
    let productThumbnail = "";
    if (productId) {
      try {
        const productSnap = await db.collection("products").doc(productId).get();
        if (productSnap.exists) {
          // ← i18n: resolve from { en, ar } or legacy plain string
          productTitle     = resolveProductTitle(productSnap.data()?.title);
          productThumbnail = productSnap.data()?.thumbnail ?? "";
          if (productThumbnail === "null") productThumbnail = "";
        }
      } catch { /* non-fatal */ }
    }

    let startDate = "—";
    try {
      const startTime = data.startTime instanceof Timestamp
        ? data.startTime.toDate()
        : new Date(data.startTime);
      startDate = formatDate(startTime);
    } catch { /* non-fatal */ }

    let usersSnap;
    try {
      usersSnap = await db.collection("users").where("role", "==", "user").get();
    } catch (err) {
      console.error("[auctionCreated] Failed to fetch users:", err);
      return;
    }

    if (usersSnap.empty) {
      await snap.ref.update({ auctionCreatedNotifiedAt: FieldValue.serverTimestamp() });
      return;
    }

    const deepLink = `/auctions/register/${productId}`;

    const titleEn = productTitle
      ? `New Auction — ${productTitle}`
      : `New Auction #${auctionNumber} Is Live`;

    const bodyEn = productTitle
      ? `Auction #${auctionNumber} for "${productTitle}" starts ${startDate}. Register now and place your bid!`
      : `Auction #${auctionNumber} starts ${startDate}. Register now and place your bid!`;

    const tokenToUid = new Map<string, string>();
    const allUids: string[] = [];

    usersSnap.docs.forEach((doc) => {
      allUids.push(doc.id);
      const tokens: string[] = doc.data()?.fcmTokens ?? [];
      tokens.forEach((t: string) => {
        if (typeof t === "string" && t.length > 0) tokenToUid.set(t, doc.id);
      });
    });

    await Promise.allSettled(
      chunk(allUids, FIRESTORE_BATCH_MAX).map(async (uids) => {
        const batch = db.batch();
        uids.forEach((uid) => {
          batch.set(
            db.collection("users").doc(uid).collection("notifications").doc(),
            {
              type:             "auction_created",
              auctionId,
              productId:        productId ?? "",
              productTitle,
              productThumbnail,
              auctionNumber,
              startDate,
              title:            titleEn,
              message:          bodyEn,
              isRead:           false,
              url:              deepLink,
              createdAt:        FieldValue.serverTimestamp(),
            },
          );
        });
        try { await batch.commit(); }
        catch (err) { console.error("[auctionCreated] Batch write failed:", err); }
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
                type:             "auction_created",
                auctionId,
                productId:        productId ?? "",
                productTitle,
                productThumbnail,
                auctionNumber:    String(auctionNumber),
                startDate,
                title:            titleEn,
                body:             bodyEn,
                url:              deepLink,
              },
              webpush: { fcmOptions: { link: deepLink } },
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
            console.error("[auctionCreated] FCM chunk error:", err);
          }
        }),
      );
    }

    try {
      await snap.ref.update({ auctionCreatedNotifiedAt: FieldValue.serverTimestamp() });
    } catch (err) {
      console.error("[auctionCreated] Failed to stamp auctionCreatedNotifiedAt:", err);
    }
  },
);