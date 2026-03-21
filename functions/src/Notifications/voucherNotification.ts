/**
 * functions/src/Notifications/voucherNotification.ts
 *
 * Trigger: onDocumentCreated("vouchers/{voucherId}")
 *
 * Always broadcasts to ALL users.
 * Stores structured fields for elegant bell rendering:
 *   - auctionItems: JSON string of [{productTitle, auctionNumber}] array
 *     so the bell can render each as a separate bullet point
 *   - auctionLine: plain string fallback for FCM body
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

function formatExpiry(d: Date): string {
  return d.toLocaleDateString("en-EG", { day: "numeric", month: "short", year: "numeric" });
}

function typeLabel(type: string, discountAmount: number | null): string {
  switch (type) {
    case "entry_free":     return "Free Entry";
    case "entry_discount": return discountAmount ? `Save ${discountAmount.toLocaleString("en-EG")} EGP on Entry Fee` : "Entry Fee Discount";
    case "final_discount": return discountAmount ? `Save ${discountAmount.toLocaleString("en-EG")} EGP on Final Price` : "Final Price Discount";
    default:               return "Special Offer";
  }
}

function buildNotification(
  code:           string,
  type:           string,
  discountAmount: number | null,
  expiryDate:     Date,
  maxUses:        number,
  auctionInfos:   { productTitle: string; auctionNumber: number }[],
): {
  title:        string;
  body:         string;
  voucherLabel: string;
  auctionLine:  string;   // plain string for FCM body
  auctionItems: string;   // JSON array for bell rendering
  expiry:       string;
  maxUses:      number;
} {
  const expiry = formatExpiry(expiryDate);
  const label  = typeLabel(type, discountAmount);

  // Plain string for FCM push body
  const auctionLine = auctionInfos.length > 0
    ? auctionInfos
        .slice(0, 4)
        .map((a) => `${a.productTitle} (#${a.auctionNumber})`)
        .join(", ")
      + (auctionInfos.length > 4 ? ` & ${auctionInfos.length - 4} more` : "")
    : "All Auctions";

  // JSON array for structured bell rendering (each item = one bullet)
  const auctionItems = JSON.stringify(
    auctionInfos.slice(0, 4).map((a) => ({
      productTitle:  a.productTitle,
      auctionNumber: a.auctionNumber,
    })),
  );

  const title = auctionInfos.length > 0
    ? `Exclusive Voucher — ${label} on ${auctionInfos[0].productTitle}`
    : `Exclusive Voucher — ${label}`;

  const body = auctionInfos.length > 0
    ? `Use code ${code} on ${auctionLine}. Expires ${expiry} · ${maxUses} uses only.`
    : `Use code ${code} on any auction. Expires ${expiry} · ${maxUses} uses only.`;

  return { title, body, voucherLabel: label, auctionLine, auctionItems, expiry, maxUses };
}

async function sendChunk(
  tokens:     string[],
  title:      string,
  body:       string,
  data:       Record<string, string>,
  tokenToUid: Map<string, string>,
): Promise<{ sent: number; failed: number }> {
  const response = await messaging.sendEachForMulticast({
    tokens,
    notification: { title, body },
    data,
    webpush: {
      notification: {
        title, body,
        icon:  "/loqta-removebg-preview.png",
        badge: "/loqta-removebg-preview.png",
        requireInteraction: false,
      },
      fcmOptions: { link: "/auctions" },
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
        db.collection("users").doc(uid).update({ fcmTokens: FieldValue.arrayRemove(...dead) }),
      ),
    );
  }
  return { sent: response.successCount, failed: response.failureCount };
}

export const onVoucherCreated = onDocumentCreated(
  { document: "vouchers/{voucherId}", memory: "512MiB", timeoutSeconds: 120 },
  async (event) => {
    const snap      = event.data;
    const voucherId = event.params.voucherId;
    if (!snap?.exists) return;
    const data = snap.data()!;

    if (data.notifiedAt) {
      console.log(`[voucherNotification] ${voucherId} already notified — skipping.`);
      return;
    }
    if (!data.isActive) return;

    const expiryDate: Date =
      data.expiryDate instanceof Timestamp ? data.expiryDate.toDate() : new Date(data.expiryDate);
    if (expiryDate <= new Date()) return;

    const code               = (data.code ?? "").trim().toUpperCase() as string;
    const type               =  data.type          ?? "entry_free";
    const discountAmount     =  data.discountAmount ?? null;
    const maxUses            =  data.maxUses        ?? 0;
    const applicableAuctions = Array.isArray(data.applicableAuctions) ? data.applicableAuctions : [];

    // Resolve auction numbers + product titles
    const auctionInfos: { productTitle: string; auctionNumber: number }[] = [];
    if (applicableAuctions.length > 0) {
      try {
        const aSnaps = await Promise.all(
          applicableAuctions.slice(0, 4).map((id: string) =>
            db.collection("auctions").doc(id).get(),
          ),
        );
        for (const aSnap of aSnaps) {
          if (!aSnap.exists) continue;
          const aData       = aSnap.data()!;
          const auctionNum  = aData.auctionNumber ?? 0;
          const productId   = aData.productId    ?? "";
          if (!productId) continue;
          try {
            const pSnap = await db.collection("products").doc(productId).get();
            if (pSnap.exists) {
              auctionInfos.push({
                productTitle:  pSnap.data()?.title ?? "Product",
                auctionNumber: auctionNum,
              });
            }
          } catch { /* non-fatal */ }
        }
      } catch (err) {
        console.warn("[voucherNotification] Could not resolve auction info:", err);
      }
    }

    const { title, body, voucherLabel, auctionLine, auctionItems, expiry } =
      buildNotification(code, type, discountAmount, expiryDate, maxUses, auctionInfos);

    const fcmData: Record<string, string> = {
      type:        "voucher_created",
      voucherId,
      voucherCode: code,
      url:         "/auctions",
    };

    const usersSnap = await db.collection("users").get();
    if (usersSnap.empty) {
      await snap.ref.update({ notifiedAt: FieldValue.serverTimestamp() });
      return;
    }

    const tokenToUid = new Map<string, string>();
    const allUids: string[] = [];
    usersSnap.docs.forEach((doc) => {
      allUids.push(doc.id);
      const tokens: string[] = doc.data()?.fcmTokens ?? [];
      tokens.forEach((t: string) => {
        if (typeof t === "string" && t.length > 0) tokenToUid.set(t, doc.id);
      });
    });

    console.log(`[voucherNotification] ${allUids.length} users, ${tokenToUid.size} tokens`);

    let inAppWritten = 0;
    await Promise.allSettled(
      chunk(allUids, FIRESTORE_BATCH_MAX).map(async (uids) => {
        const batch = db.batch();
        uids.forEach((uid) => {
          batch.set(
            db.collection("users").doc(uid).collection("notifications").doc(),
            {
              type:         "voucher_created",
              voucherId,
              voucherCode:  code,
              voucherLabel,
              auctionLine,
              auctionItems, // JSON string — bell parses this for bullet rendering
              expiry,
              maxUses,
              title,
              message:      body,
              isRead:       false,
              url:          "/auctions",
              createdAt:    FieldValue.serverTimestamp(),
            },
          );
        });
        try { await batch.commit(); inAppWritten += uids.length; }
        catch (err) { console.error("[voucherNotification] Batch write failed:", err); }
      }),
    );

    console.log(`[voucherNotification] In-app written: ${inAppWritten}`);

    const allTokens = Array.from(tokenToUid.keys());
    let totalSent = 0, totalFailed = 0;
    if (allTokens.length > 0) {
      await Promise.allSettled(
        chunk(allTokens, FCM_CHUNK_SIZE).map(async (tokens) => {
          try {
            const { sent, failed } = await sendChunk(tokens, title, body, fcmData, tokenToUid);
            totalSent += sent; totalFailed += failed;
          } catch (err) {
            console.error("[voucherNotification] FCM chunk error:", err);
            totalFailed += tokens.length;
          }
        }),
      );
      console.log(`[voucherNotification] FCM sent=${totalSent} failed=${totalFailed}`);
    }

    await snap.ref.update({ notifiedAt: FieldValue.serverTimestamp() });
    console.log(`[voucherNotification] Done for ${voucherId}`);
  },
);