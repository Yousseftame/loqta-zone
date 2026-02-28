/**
 * public/firebase-messaging-sw.js
 *
 * ⚠️  MUST be placed in /public so it is served at:
 *     https://yourdomain.com/firebase-messaging-sw.js
 *
 * Handles background push messages (tab closed / hidden).
 * Foreground messages are handled in useFcmToken.ts via onMessage().
 *
 * Note: Replace the config values below with your real Firebase config.
 * These values are NOT secret — they are the same public config from
 * your src/firebase/firebase.ts file.
 */

importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js");

// ── Paste your Firebase config here (same as src/firebase/firebase.ts) ────────

const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

const messaging = firebase.messaging();

// ── Background message handler ────────────────────────────────────────────────
messaging.onBackgroundMessage((payload) => {
  const { title = "Loqta Zone", body = "" } = payload.notification ?? {};
  const data = payload.data ?? {};

  self.registration.showNotification(title, {
    body,
    icon:              "/loqta-removebg-preview.png",
    badge:             "/loqta-removebg-preview.png",
    tag:               data.requestId ?? "loqta-notif", // prevents duplicate stacking
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