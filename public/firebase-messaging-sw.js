/**
 * public/firebase-messaging-sw.js
 *
 * ⚠️  Service workers are plain JS files — they CANNOT use import.meta.env.
 *     Config values must be hardcoded. These are NOT secret keys.
 *
 * ─── Root cause of duplicate notifications ───────────────────────────────────
 *
 * PROBLEM: Every notification showed TWICE in the browser.
 *
 * ROOT CAUSE: The Cloud Functions send FCM messages with BOTH:
 *   1. A top-level `notification` field  → browser auto-shows notification #1
 *   2. A `webpush.notification` field    → service worker shows notification #2
 *
 * When FCM receives a message that has a `notification` field, Chrome
 * automatically displays it WITHOUT going through the service worker at all.
 * Then `onBackgroundMessage` fires and the SW shows it again → DUPLICATE.
 *
 * THE FIX IS IN THE CLOUD FUNCTIONS — remove the top-level `notification`
 * field and remove `webpush.notification` from every sendEachForMulticast call.
 * Keep only the `data` field. This SW then reads from `payload.data` and
 * calls showNotification() exactly once.
 *
 * ─── Other fixes ─────────────────────────────────────────────────────────────
 * - `clients` bare global → `self.clients` to fix linter error.
 * - Unique tag per notification prevents silent browser deduplication.
 * - resolveUrl() covers all notification types.
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

var messaging = firebase.messaging();

// ── Helper: resolve navigation URL from push data ─────────────────────────────
function resolveUrl(data) {
  if (!data) return "/";

  if (data.url && data.url !== "/") return data.url;

  switch (data.type) {
    case "auction_registered":
      if (data.productId) return "/auctions/register/" + data.productId;
      if (data.auctionId) return "/auctions/" + data.auctionId;
      return "/auctions";

    case "auction_matched":
      if (data.productId) return "/auctions/register/" + data.productId;
      if (data.auctionId) return "/auctions/" + data.auctionId;
      return "/auctions";

    case "auction_ended":
      if (data.auctionId) return "/auctions/" + data.auctionId;
      return "/auctions";

    case "last_offer_available":
      if (data.auctionId) return "/auctions/" + data.auctionId + "?lastOffer=1";
      return "/auctions";

    case "last_offer_selected":
      if (data.auctionId) {
        var amount = data.winningBid ? "?amount=" + data.winningBid : "";
        return "/last-offer-confirm/" + data.auctionId + amount;
      }
      return "/auctions";

    case "bid_selected":
      if (data.auctionId) {
        var amt = data.winningBid ? "?amount=" + data.winningBid : "";
        return "/last-offer-confirm/" + data.auctionId + amt;
      }
      return "/auctions";

    case "payment_confirmed":
      if (data.auctionId) return "/auctions/" + data.auctionId;
      return "/auctions";

    case "voucher_created":
      return "/auctions";

    default:
      if (data.auctionId) return "/auctions/" + data.auctionId;
      return "/auctions";
  }
}

// ── Background message handler ────────────────────────────────────────────────
// Fires ONLY when the app is in the background (tab hidden or closed).
// When the app is OPEN, Firebase routes to onMessage() in the app instead.
//
// IMPORTANT: This will only fire (and show exactly 1 notification) when your
// Cloud Functions send DATA-ONLY messages. If they include a `notification`
// field, Chrome auto-shows it and this handler ALSO fires → 2 notifications.
messaging.onBackgroundMessage(function(payload) {
  console.log("[SW] Background message received, type:", payload.data && payload.data.type);

  var data = payload.data || {};

  // Read title/body from data fields (data-only messages).
  // Falls back to payload.notification during Cloud Function migration.
  var title = data.title
    || (payload.notification && payload.notification.title)
    || "LOQTA ZONE";
  var body = data.body
    || (payload.notification && payload.notification.body)
    || "";

  var url = resolveUrl(data);
  var tag = (data.type || "loqta") + "-" + Date.now();

  self.registration.showNotification(title, {
    body:               body,
    icon:               "/loqta-removebg-preview.png",
    badge:              "/loqta-removebg-preview.png",
    tag:                tag,
    requireInteraction: true,
    data:               { url: url },
  });
});

// ── Notification click handler ────────────────────────────────────────────────
// FIX: `self.clients` instead of bare `clients` — fixes the linter error
// "Could not find name 'clients'. Did you mean 'client'?"
self.addEventListener("notificationclick", function(event) {
  event.notification.close();
  var targetUrl = (event.notification.data && event.notification.data.url) || "/";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then(function(clientList) {
        for (var i = 0; i < clientList.length; i++) {
          var client = clientList[i];
          if (client.url.indexOf(self.location.origin) !== -1 && "focus" in client) {
            client.navigate(targetUrl);
            return client.focus();
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl);
        }
      })
  );
});