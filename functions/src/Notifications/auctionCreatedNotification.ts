/**
 * functions/src/Notifications/auctionCreatedNotification.ts
 *
 * Fires when a new auction document is created.
 * Sends an in-app notification + FCM push to ALL regular users (role === "user").
 *
 * Guard: auctionCreatedNotifiedAt stamp prevents re-firing if the function
 * retries or the document is re-created.
 *
 * FIX: DATA-ONLY FCM message — no `notification` field, no `webpush.notification`.
 * See auctionRegistrationNotification.ts for the full duplicate-prevention explanation.
 */

import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { getFirestore, FieldValue, Timestamp } from "firebase-admin/firestore";
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

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-EG", {
    day:   "numeric",
    month: "short",
    year:  "numeric",
    hour:  "2-digit",
    minute: "2-digit",
  });
}

export const onAuctionCreated = onDocumentCreated(
  {
    document:       "auctions/{auctionId}",
    timeoutSeconds: 120,
    memory:         "512MiB",
  },
  async (event) => {
    const snap      = event.data;
    const auctionId = event.params.auctionId;

    if (!snap?.exists) return;
    const data = snap.data()!;

    // ── Idempotency guard ──────────────────────────────────────────────────
    if (data.auctionCreatedNotifiedAt) return;

    // Only notify for active auctions
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
          productTitle     = productSnap.data()?.title     ?? "";
          productThumbnail = productSnap.data()?.thumbnail ?? "";
          if (productThumbnail === "null") productThumbnail = "";
        }
      } catch { /* non-fatal */ }
    }

    // ── Resolve start date ─────────────────────────────────────────────────
    let startDate = "—";
    try {
      const startTime = data.startTime instanceof Timestamp
        ? data.startTime.toDate()
        : new Date(data.startTime);
      startDate = formatDate(startTime);
    } catch { /* non-fatal */ }

    // ── Fetch all regular users ────────────────────────────────────────────
    let usersSnap;
    try {
      usersSnap = await db
        .collection("users")
        .where("role", "==", "user")
        .get();
    } catch (err) {
      console.error("[auctionCreated] Failed to fetch users:", err);
      return;
    }

    if (usersSnap.empty) {
      await snap.ref.update({
        auctionCreatedNotifiedAt: FieldValue.serverTimestamp(),
      });
      return;
    }

    // ── Build notification content ─────────────────────────────────────────
    const deepLink = `/auctions/register/${productId}`;

    const titleEn = productTitle
      ? `New Auction — ${productTitle}`
      : `New Auction #${auctionNumber} Is Live`;

    const bodyEn = productTitle
      ? `Auction #${auctionNumber} for "${productTitle}" starts ${startDate}. Register now and place your bid!`
      : `Auction #${auctionNumber} starts ${startDate}. Register now and place your bid!`;

    // ── Build token map + uid list ─────────────────────────────────────────
    const tokenToUid = new Map<string, string>();
    const allUids: string[] = [];

    usersSnap.docs.forEach((doc) => {
      allUids.push(doc.id);
      const tokens: string[] = doc.data()?.fcmTokens ?? [];
      tokens.forEach((t: string) => {
        if (typeof t === "string" && t.length > 0) tokenToUid.set(t, doc.id);
      });
    });

    // ── Write in-app notifications (batched) ───────────────────────────────
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

    // ── Send FCM pushes (chunked) ──────────────────────────────────────────
    const allTokens = Array.from(tokenToUid.keys());

    if (allTokens.length > 0) {
      await Promise.allSettled(
        chunk(allTokens, FCM_CHUNK_SIZE).map(async (tokens) => {
          try {
            // DATA-ONLY — no `notification` field, no `webpush.notification`
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
              webpush: {
                fcmOptions: { link: deepLink },
              },
            });

            // ── Prune dead tokens ────────────────────────────────────────
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

    // ── Stamp idempotency guard ────────────────────────────────────────────
    try {
      await snap.ref.update({
        auctionCreatedNotifiedAt: FieldValue.serverTimestamp(),
      });
    } catch (err) {
      console.error("[auctionCreated] Failed to stamp auctionCreatedNotifiedAt:", err);
    }
  },
);