/**
 * public/firebase-messaging-sw.js
 *
 * ─── Fixes in this version ────────────────────────────────────────────────────
 *
 * FIX 1 — Duplicate browser notifications
 *   Root cause: When the page IS open (foreground), Firebase delivers the message
 *   to BOTH the service worker (onBackgroundMessage) AND the page (onMessage in
 *   useFCM). If the page's onMessage handler also shows a notification, the user
 *   sees two. The current useFCM.ts onMessage handler does NOT show a notification
 *   (correct), but the SW's onBackgroundMessage fires for ALL FCM messages — even
 *   when the page is in the foreground. Browsers are supposed to suppress SW
 *   notifications when the page is focused, but some do not reliably.
 *
 *   Fix: Check if a focused client exists before calling showNotification().
 *   If the user has the tab open and focused, skip the SW notification entirely —
 *   the bell's Firestore onSnapshot will update the UI in real time.
 *
 * FIX 2 — Notification deduplication (same message shown twice)
 *   Root cause: The `tag` field was set to `data.offerId ?? data.requestId ?? "loqta-notif"`.
 *   When the tag is the same static string "loqta-notif", browsers REPLACE the
 *   previous notification with the new one (not duplicate) — but if two different
 *   notifications arrive quickly and both get tag="loqta-notif", only the second
 *   is visible. Worse, some notification types had no unique tag at all.
 *
 *   Fix: Build a stable unique tag per notification type using the most specific
 *   identifier available (auctionId, voucherId, requestId). This lets the browser
 *   deduplicate identical re-deliveries while still stacking distinct notifications.
 *
 * FIX 3 — requireInteraction=true for ALL notification types
 *   Root cause: Every notification used requireInteraction=true, which keeps the
 *   notification visible until the user explicitly dismisses it. For informational
 *   notifications (voucher_created, auction_ended, auction_registered) this is
 *   unnecessarily aggressive and can cause the OS to stack notifications.
 *
 *   Fix: Only use requireInteraction=true for action-required notifications
 *   (bid_selected, last_offer_selected, last_offer_available).
 *
 * ⚠️  Service workers are plain JS — no import.meta.env. Config values are hardcoded.
 *     These are NOT secret keys.
 */

importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey:            "AIzaSyAYvQtEhnmJuQ98d6pE0FuDMM4BidAMODE",
  authDomain:        "loqtazone.firebaseapp.com",
  projectId:         "loqtazone",
  storageBucket:     "loqtazone.firebasestorage.app",
  messagingSenderId: "122947081944",
  appId:             "1:122947081944:web:44602c0e995e8f2f8729ad",
  measurementId:     "G-0DEFWCEYTZ",
});

const messaging = firebase.messaging();

// ── Helper: resolve the navigation URL from push data ────────────────────────

function resolveUrl(data) {
  if (!data) return "/";
  if (data.url) return data.url;

  switch (data.type) {
    case "auction_matched":
      return data.productId
        ? `/auctions/register/${data.productId}`
        : data.auctionId
          ? `/auctions/${data.auctionId}`
          : "/auctions";

    case "bid_selected":
    case "last_offer_selected":
      return data.auctionId
        ? `/last-offer-confirm/${data.auctionId}${data.winningBid ? `?amount=${data.winningBid}` : ""}`
        : "/";

    case "last_offer_available":
      return data.auctionId ? `/auctions/${data.auctionId}?lastOffer=1` : "/auctions";

    case "auction_registered":
      return data.productId ? `/auctions/register/${data.productId}` : "/auctions";

    case "voucher_created":
      return "/auctions";

    case "auction_ended":
      return "/auctions";

    default:
      return data.auctionId ? `/auctions/${data.auctionId}` : "/";
  }
}

// ── Helper: build a stable unique tag per notification ───────────────────────
// FIX 2: Unique tags prevent the browser from collapsing distinct notifications
// while still letting it deduplicate exact re-deliveries of the same event.

function resolveTag(data) {
  if (!data) return "loqta-notif";
  const type = data.type ?? "notif";

  // Build tag from: type + most specific identifier
  if (data.offerId)     return `${type}-${data.offerId}`;
  if (data.bidId)       return `${type}-${data.bidId}`;
  if (data.voucherId)   return `${type}-${data.voucherId}`;
  if (data.requestId)   return `${type}-${data.requestId}`;
  if (data.auctionId)   return `${type}-${data.auctionId}`;
  return `${type}-${Date.now()}`;
}

// ── Helper: only require interaction for action-required notifications ────────
// FIX 3: Informational notifications auto-dismiss; action-required ones persist.

function requiresInteraction(type) {
  return (
    type === "bid_selected" ||
    type === "last_offer_selected" ||
    type === "last_offer_available"
  );
}

// ── FIX 1: Check if page is focused before showing SW notification ────────────
// Returns true if any client (tab) of this origin is currently focused.
// If the user has the app open, we skip the SW notification to prevent duplicates.
// The in-app bell (Firestore onSnapshot) already handles foreground updates.

async function isPageFocused() {
  try {
    const clientList = await self.clients.matchAll({
      type: "window",
      includeUncontrolled: true,
    });
    return clientList.some((client) => client.focused);
  } catch {
    return false;
  }
}

// ── Background message handler ────────────────────────────────────────────────

messaging.onBackgroundMessage(async (payload) => {
  const { title = "Loqta Zone", body = "" } = payload.notification ?? {};
  const data = payload.data ?? {};

  // FIX 1: Don't show a browser notification if the user already has the tab open
  // and focused — the bell's real-time listener handles it there.
  const focused = await isPageFocused();
  if (focused) {
    console.info("[SW] Page is focused — skipping browser notification, bell will update.");
    return;
  }

  const url  = resolveUrl(data);
  const tag  = resolveTag(data);
  const type = data.type ?? "";

  self.registration.showNotification(title, {
    body,
    icon:               "/loqta-removebg-preview.png",
    badge:              "/loqta-removebg-preview.png",
    tag,                                          // FIX 2: unique per event
    requireInteraction: requiresInteraction(type), // FIX 3: only when needed
    data:               { url },
  });
});

// ── Click handler: focus existing tab or open new one ────────────────────────

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url ?? "/";

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        // Focus an existing tab pointing to this origin
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && "focus" in client) {
            client.navigate(targetUrl);
            return client.focus();
          }
        }
        // No existing tab — open a new one
        return clients.openWindow(targetUrl);
      }),
  );
});

// ── Install & activate: take control immediately ──────────────────────────────
// This ensures the SW activates without waiting for old tabs to close,
// which fixes the "new account SW not ready" timing issue (FIX 2 in useFCM).

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});