/**
 * functions/src/Notifications/contactFeedbackSeenNotification.ts
 *
 * Fires when an admin/super-admin changes a contact or feedback message
 * from status "new" → "seen".
 *
 * - In-app notification under users/{userId}/notifications
 * - Browser push via data-only FCM (same pattern as bid/voucher)
 * - Only when the document has a userId (logged-in submitter)
 * - Guests and legacy docs without userId are skipped
 * - Idempotent via notifiedSeenAt stamp
 */

import { onDocumentUpdated } from "firebase-functions/v2/firestore";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import type { DocumentData, DocumentReference } from "firebase-admin/firestore";
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

type SeenKind = "contact" | "feedback";

const COPY: Record<SeenKind, { type: string; title: string; body: string }> = {
  contact: {
    type:  "contact_seen",
    title: "We've seen your message ✓",
    body:  "Your contact message has been reviewed by our team. We're working on it and will reply within 24 hours.",
  },
  feedback: {
    type:  "feedback_seen",
    title: "We've seen your feedback ✓",
    body:  "Thank you for your feedback! Our team has reviewed it and is working on it now. We appreciate you sharing your experience with us.",
  },
};

async function notifySeen(
  kind: SeenKind,
  docId: string,
  before: DocumentData,
  after: DocumentData,
  docRef: DocumentReference,
): Promise<void> {
  const justSeen = before.status === "new" && after.status === "seen";
  if (!justSeen) return;
  if (after.notifiedSeenAt) return;

  const userId = after.userId as string | null | undefined;
  if (!userId || typeof userId !== "string") return;

  const { type, title, body } = COPY[kind];
  const deepLink = "/contact";

  try {
    await db.collection("users").doc(userId).collection("notifications").doc().set({
      type,
      title,
      message:    body,
      isRead:     false,
      url:        deepLink,
      sourceId:   docId,
      sourceKind: kind,
      createdAt:  FieldValue.serverTimestamp(),
    });

    const userSnap = await db.collection("users").doc(userId).get();
    const rawTokens: string[] = userSnap.exists
      ? (userSnap.data()?.fcmTokens ?? [])
      : [];
    const uniqueTokens = [
      ...new Set(rawTokens.filter((t) => typeof t === "string" && t.length > 0)),
    ];

    if (uniqueTokens.length < rawTokens.length) {
      await db.collection("users").doc(userId).update({ fcmTokens: uniqueTokens });
    }

    if (uniqueTokens.length === 0) {
      await docRef.update({ notifiedSeenAt: FieldValue.serverTimestamp() });
      return;
    }

    // DATA-ONLY — no top-level `notification` field (avoids duplicate browser toasts)
    const fcmResponse = await messaging.sendEachForMulticast({
      tokens: uniqueTokens,
      data: {
        type,
        title,
        body,
        url: deepLink,
        sourceId: docId,
        sourceKind: kind,
      },
      webpush: {
        fcmOptions: { link: deepLink },
      },
    });

    const deadTokens: string[] = [];
    fcmResponse.responses.forEach((res, idx) => {
      if (!res.success && DEAD_TOKEN_CODES.has(res.error?.code ?? "")) {
        deadTokens.push(uniqueTokens[idx]);
      }
    });

    if (deadTokens.length > 0) {
      await db.collection("users").doc(userId).update({
        fcmTokens: FieldValue.arrayRemove(...deadTokens),
      });
    }

    await docRef.update({ notifiedSeenAt: FieldValue.serverTimestamp() });
  } catch (err) {
    console.error(
      `[contactFeedbackSeenNotification] Error for ${kind} id=${docId}:`,
      err,
    );
  }
}

export const onContactMessageSeen = onDocumentUpdated(
  "contactMessages/{messageId}",
  async (event) => {
    const before = event.data?.before.data();
    const after  = event.data?.after.data();
    if (!before || !after || !event.data) return;

    await notifySeen(
      "contact",
      event.params.messageId,
      before,
      after,
      event.data.after.ref,
    );
  },
);

export const onFeedbackMessageSeen = onDocumentUpdated(
  "feedbackMessages/{messageId}",
  async (event) => {
    const before = event.data?.before.data();
    const after  = event.data?.after.data();
    if (!before || !after || !event.data) return;

    await notifySeen(
      "feedback",
      event.params.messageId,
      before,
      after,
      event.data.after.ref,
    );
  },
);
