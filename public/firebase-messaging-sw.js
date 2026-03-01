/**
 * public/firebase-messaging-sw.js
 *
 * ⚠️  Service workers are plain JS files — they CANNOT use import.meta.env.
 *     Config values must be hardcoded. These are NOT secret keys.
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

// ── Background message handler ────────────────────────────────────────────────
messaging.onBackgroundMessage((payload) => {
  const { title = "Loqta Zone", body = "" } = payload.notification ?? {};
  const data = payload.data ?? {};

  self.registration.showNotification(title, {
    body,
    icon:               "/loqta-removebg-preview.png",
    badge:              "/loqta-removebg-preview.png",
    tag:                data.requestId ?? "loqta-notif",
    requireInteraction: true,
    data: {
      url: data.auctionId ? `/auctions/${data.auctionId}` : "/auctions",
    },
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