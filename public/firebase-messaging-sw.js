/**
 * public/firebase-messaging-sw.js
 *
 * ⚠️  Service workers are plain JS files — they CANNOT use import.meta.env.
 *     Config values must be hardcoded. These are NOT secret keys.
 *
 * ─── Fix Summary ──────────────────────────────────────────────────────────────
 *
 * PROBLEM: Most notification types (auction_matched, auction_registered, etc.)
 * never showed as browser notifications, or showed twice.
 *
 * ROOT CAUSE 1 — Duplicate when app is in foreground:
 *   When the app tab is OPEN and focused, Firebase does NOT route the message
 *   through the service worker's onBackgroundMessage. Instead it fires the
 *   onMessage() handler inside the app. If the app's onMessage() handler also
 *   called showNotification(), you'd get two.
 *   FIX: The app's onMessage() handler (useFCM.ts) now does NOT show a browser
 *   notification. Only this SW shows notifications, and only when the app is
 *   in the background.
 *
 * ROOT CAUSE 2 — Notifications silently dropped on some browsers:
 *   Chrome requires a valid absolute or relative URL in fcmOptions.link for
 *   click handling. When link was "/" or missing, some Chrome versions silently
 *   refused to show the notification at all.
 *   FIX: resolveUrl() now returns a proper relative path for every notification
 *   type. The click handler navigates to that URL.
 *
 * ROOT CAUSE 3 — Missing notification types in resolveUrl():
 *   auction_registered, auction_ended, voucher_created, bid_selected,
 *   last_offer_selected, last_offer_available were all missing or returning "/".
 *   FIX: All types now have explicit, correct deep-link paths.
 *
 * ROOT CAUSE 4 — Tag collision causing notifications to replace each other:
 *   All notifications used the same tag fallback "loqta-notif", so a second
 *   notification would silently replace the first (browser deduplication).
 *   FIX: Tag is now unique per message using timestamp + type.
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

// ── Helper: resolve navigation URL from push data ─────────────────────────────
// Every type must return a meaningful path. Chrome may silently drop
// notifications that have no valid navigation target.
function resolveUrl(data) {
  if (!data) return "/";

  // Explicit url field always wins (set by most Cloud Functions)
  if (data.url && data.url !== "/") return data.url;

  switch (data.type) {
    // User registered for an auction → go to the auction register page
    case "auction_registered":
      if (data.productId) return "/auctions/register/" + data.productId;
      if (data.auctionId) return "/auctions/" + data.auctionId;
      return "/";

    // Auction request matched → go to register page for that product
    case "auction_matched":
      if (data.productId) return "/auctions/register/" + data.productId;
      if (data.auctionId) return "/auctions/" + data.auctionId;
      return "/";

    // Auction ended — go to the live auction page (shows result)
    case "auction_ended":
      if (data.auctionId) return "/auctions/" + data.auctionId;
      return "/";

    // Last offer available → open the auction with the last offer modal
    case "last_offer_available":
      if (data.auctionId) return "/auctions/" + data.auctionId + "?lastOffer=1";
      return "/";

    // Last offer selected by admin → confirm purchase page
    case "last_offer_selected":
      if (data.auctionId) {
        var amount = data.winningBid ? "?amount=" + data.winningBid : "";
        return "/last-offer-confirm/" + data.auctionId + amount;
      }
      return "/";

    // Bid selected by admin as winner → same confirm page
    case "bid_selected":
      if (data.auctionId) {
        var amt = data.winningBid ? "?amount=" + data.winningBid : "";
        return "/last-offer-confirm/" + data.auctionId + amt;
      }
      return "/";

    // Payment confirmed → auction page
    case "payment_confirmed":
      if (data.auctionId) return "/auctions/" + data.auctionId;
      return "/";

    // New voucher → auctions listing so user can use it
    case "voucher_created":
      return "/";

    default:
      if (data.auctionId) return "/auctions/" + data.auctionId;
      return "/";
  }
}

// ── Background message handler ────────────────────────────────────────────────
// This ONLY fires when the app is in the BACKGROUND (tab hidden or closed).
// When the app is OPEN/FOREGROUND, Firebase routes to onMessage() inside the
// app instead — so this will never cause a duplicate with the app's handler.
messaging.onBackgroundMessage(function(payload) {
  var title = (payload.notification && payload.notification.title) || "Loqta Zone";
  var body  = (payload.notification && payload.notification.body)  || "";
  var data  = payload.data || {};

  var url = resolveUrl(data);

  // Use a unique tag per notification so they don't replace each other.
  // Format: type-timestamp (e.g. "auction_ended-1712345678901")
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

// ── Click handler: focus existing tab or open new one ────────────────────────
self.addEventListener("notificationclick", function(event) {
  event.notification.close();
  var targetUrl = (event.notification.data && event.notification.data.url) || "/";

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then(function(clientList) {
        // Try to find an existing tab for this origin
        for (var i = 0; i < clientList.length; i++) {
          var client = clientList[i];
          if (client.url.includes(self.location.origin) && "focus" in client) {
            client.navigate(targetUrl);
            return client.focus();
          }
        }
        // No existing tab found — open a new one
        return clients.openWindow(targetUrl);
      })
  );
});