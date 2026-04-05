/**
 * public/firebase-messaging-sw.js
 *
 * ⚠️  Service workers are plain JS files — they CANNOT use import.meta.env.
 *     Config values must be hardcoded. These are NOT secret keys.
 *
 * Updated: handles last_offer_selected and payment_confirmed push types
 * with their correct deep-link URLs.
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

  // Explicit url field always wins
  if (data.url) return data.url;

  // Type-based routing
  switch (data.type) {
    case "last_offer_selected":
      return data.auctionId
        ? `/`
        : "/";

    case "auction_matched":
      return data.auctionId ? `/auctions/${data.auctionId}` : "/auctions";

    case "payment_confirmed":
      return data.auctionId ? `/auctions/${data.auctionId}` : "/";
    
    
    case "voucher_created":
  return "/";

    default:
      return data.auctionId ? `/auctions/${data.auctionId}` : "/";
  }
}

// ── Background message handler ────────────────────────────────────────────────
messaging.onBackgroundMessage((payload) => {
  const { title = "Loqta Zone", body = "" } = payload.notification ?? {};
  const data = payload.data ?? {};

  const url = resolveUrl(data);

  self.registration.showNotification(title, {
    body,
    icon:               "/loqta-removebg-preview.png",
    badge:              "/loqta-removebg-preview.png",
    tag:                data.offerId ?? data.requestId ?? "loqta-notif",
    requireInteraction: true,
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
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && "focus" in client) {
            client.navigate(targetUrl);
            return client.focus();
          }
        }
        return clients.openWindow(targetUrl);
      }),
  );
});