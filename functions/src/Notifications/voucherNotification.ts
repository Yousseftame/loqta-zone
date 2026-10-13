/**
 * functions/src/Notifications/voucherNotification.ts
 *
 * i18n change: product.title is now { en, ar }.
 * Uses resolveProductTitle() from shared/i18nHelpers.
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
  code: string, type: string, discountAmount: number | null,
  expiryDate: Date, maxUses: number,
  auctionInfos: { productTitle: string; auctionNumber: number }[],
) {
  const expiry       = formatExpiry(expiryDate);
  const label        = typeLabel(type, discountAmount);
  const auctionLine  = auctionInfos.length > 0
    ? auctionInfos.slice(0, 4).map((a) => `${a.productTitle} (#${a.auctionNumber})`).join(", ")
      + (auctionInfos.length > 4 ? ` & ${auctionInfos.length - 4} more` : "")
    : "All Auctions";
  const auctionItems = JSON.stringify(auctionInfos.slice(0, 4).map((a) => ({ productTitle: a.productTitle, auctionNumber: a.auctionNumber })));
  const title = auctionInfos.length > 0 ? `Exclusive Voucher — ${label} on ${auctionInfos[0].productTitle}` : `Exclusive Voucher — ${label}`;
  const body  = auctionInfos.length > 0
    ? `Use code ${code} on ${auctionLine}. Expires ${expiry} · ${maxUses} uses only.`
    : `Use code ${code} on any auction. Expires ${expiry} · ${maxUses} uses only.`;
  return { title, body, voucherLabel: label, auctionLine, auctionItems, expiry, maxUses };
}

export const onVoucherCreated = onDocumentCreated(
  { document: "vouchers/{voucherId}", memory: "512MiB", timeoutSeconds: 120 },
  async (event) => {
    const snap      = event.data;
    const voucherId = event.params.voucherId;
    if (!snap?.exists) return;
    const data = snap.data()!;

    if (data.notifiedAt) return;
    if (!data.isActive) return;

    const expiryDate: Date =
      data.expiryDate instanceof Timestamp ? data.expiryDate.toDate() : new Date(data.expiryDate);
    if (expiryDate <= new Date()) return;

    const code               = (data.code ?? "").trim().toUpperCase() as string;
    const type               =  data.type          ?? "entry_free";
    const discountAmount     =  data.discountAmount ?? null;
    const maxUses            =  data.maxUses        ?? 0;
    const applicableAuctions = Array.isArray(data.applicableAuctions) ? data.applicableAuctions : [];

    const auctionInfos: { productTitle: string; auctionNumber: number }[] = [];
    if (applicableAuctions.length > 0) {
      try {
        const aSnaps = await Promise.all(
          applicableAuctions.slice(0, 4).map((id: string) => db.collection("auctions").doc(id).get()),
        );
        for (const aSnap of aSnaps) {
          if (!aSnap.exists) continue;
          const aData      = aSnap.data()!;
          const auctionNum = aData.auctionNumber ?? 0;
          const productId  = aData.productId    ?? "";
          if (!productId) continue;
          try {
            const pSnap = await db.collection("products").doc(productId).get();
            if (pSnap.exists) {
              // ← i18n: resolve from { en, ar } or legacy plain string
              auctionInfos.push({
                productTitle:  resolveProductTitle(pSnap.data()?.title) || "Product",
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

    // Notify only the users selected at create time (empty = notify nobody)
    const notifyUserIds: string[] = Array.isArray(data.notifyUserIds)
      ? [...new Set(
          (data.notifyUserIds as unknown[])
            .filter((id): id is string => typeof id === "string" && id.length > 0),
        )]
      : [];

    if (notifyUserIds.length === 0) {
      await snap.ref.update({ notifiedAt: FieldValue.serverTimestamp() });
      return;
    }

    const userSnaps = await Promise.all(
      notifyUserIds.map((uid) => db.collection("users").doc(uid).get()),
    );

    const tokenToUid = new Map<string, string>();
    const allUids: string[] = [];
    userSnaps.forEach((userSnap, idx) => {
      const uid = notifyUserIds[idx];
      if (!userSnap.exists) return;
      allUids.push(uid);
      const tokens: string[] = userSnap.data()?.fcmTokens ?? [];
      tokens.forEach((t: string) => {
        if (typeof t === "string" && t.length > 0) tokenToUid.set(t, uid);
      });
    });

    if (allUids.length === 0) {
      await snap.ref.update({ notifiedAt: FieldValue.serverTimestamp() });
      return;
    }

    await Promise.allSettled(
      chunk(allUids, FIRESTORE_BATCH_MAX).map(async (uids) => {
        const batch = db.batch();
        uids.forEach((uid) => {
          batch.set(db.collection("users").doc(uid).collection("notifications").doc(), {
            type: "voucher_created", voucherId, voucherCode: code, voucherLabel, auctionLine, auctionItems,
            expiry, maxUses, title, message: body, isRead: false, url: "/auctions", createdAt: FieldValue.serverTimestamp(),
          });
        });
        try { await batch.commit(); }
        catch (err) { console.error("[voucherNotification] Batch write failed:", err); }
      }),
    );

    const allTokens = Array.from(tokenToUid.keys());

    if (allTokens.length > 0) {
      await Promise.allSettled(
        chunk(allTokens, FCM_CHUNK_SIZE).map(async (tokens) => {
          try {
            const response = await messaging.sendEachForMulticast({
              tokens,
              data: { type: "voucher_created", voucherId, voucherCode: code, title, body, url: "/auctions" },
              webpush: { fcmOptions: { link: "/auctions" } },
            });

            const deadByUid = new Map<string, string[]>();
            response.responses.forEach((res, idx) => {
              if (!res.success && DEAD_TOKEN_CODES.has(res.error?.code ?? "")) {
                const uid = tokenToUid.get(tokens[idx]);
                if (uid) { const arr = deadByUid.get(uid) ?? []; arr.push(tokens[idx]); deadByUid.set(uid, arr); }
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
            console.error("[voucherNotification] FCM chunk error:", err);
          }
        }),
      );
    }

    await snap.ref.update({ notifiedAt: FieldValue.serverTimestamp() });
  },
);