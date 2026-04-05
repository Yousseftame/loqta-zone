/**
 * src/hooks/useFCM.ts
 *
 * ─── Fixes in this version ───────────────────────────────────────────────────
 *
 * FIX 1 — Duplicate notifications (re-registration on every page refresh)
 *   Root cause: `registeredRef.current` is an in-memory React ref. It resets to
 *   `false` on every page refresh / component remount, so `register()` runs again,
 *   calls `getToken()`, gets the same token (or occasionally a new one), and writes
 *   it again — which is harmless for arrayUnion but also re-registers the token
 *   with Firebase messaging infrastructure, sometimes causing duplicate FCM delivery.
 *
 *   Fix: Use sessionStorage as the guard instead of a ref. Key = `fcm_registered_{uid}`.
 *   sessionStorage persists across soft navigations (React Router) but clears on
 *   tab close — exactly the right lifetime. On page refresh the entry is still there,
 *   so `register()` is skipped (no re-registration). On new login it's absent.
 *
 * FIX 2 — New accounts never receiving notifications
 *   Root cause: On brand-new registrations the service worker is installed for the
 *   first time. `getToken()` requires the SW to be in "activated" state. If `getToken()`
 *   is called while the SW is still in "installing" or "waiting" state, it throws
 *   or returns empty. The hook had no SW-ready wait, so new accounts silently failed.
 *
 *   Fix: Before calling `getToken()`, wait for the SW registration to reach "active"
 *   state using a small poll / `updatefound` listener with a 10-second timeout.
 *
 * FIX 3 — Stale tokens accumulate (intermittent failures)
 *   Root cause: Old tokens from previous browsers/devices are never cleaned unless a
 *   Cloud Function send happens to hit them and prune. Tokens from logged-out tabs
 *   also stay behind if the user closes the tab without logging out.
 *
 *   Fix: On every registration, do a one-time deduplication of the current
 *   fcmTokens array — read it, deduplicate, write back. This is cheap (1 read + 1
 *   conditional write) and runs at most once per session per tab.
 *   Dead token pruning on send is already handled by Cloud Functions — this just
 *   prevents the array from bloating with exact duplicates from the client side.
 *
 * ─── Unchanged behaviour ─────────────────────────────────────────────────────
 * • arrayUnion write is idempotent — safe to call multiple times.
 * • Token rotation detection still works (compare current token vs stored token).
 * • unregisterFCMToken() used by AuthContext.logout() is unchanged.
 * • Foreground message handler is a no-op (bell updates via Firestore snapshot).
 */

import { useEffect } from "react";
import { getMessaging, getToken, onMessage, deleteToken } from "firebase/messaging";
import { doc, updateDoc, arrayUnion, arrayRemove, getDoc } from "firebase/firestore";
import app, { db } from "@/firebase/firebase";
import { useAuth } from "@/store/AuthContext/AuthContext";

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY as string;

// ── sessionStorage keys ───────────────────────────────────────────────────────
// fcm_token          : the token registered THIS tab (for logout cleanup)
// fcm_registered_{uid}: guard that survives page refresh; cleared on logout

const SESSION_TOKEN_KEY = "fcm_token";
const registeredKey = (uid: string) => `fcm_registered_${uid}`;

export function getStoredFCMToken(): string | null {
  try { return sessionStorage.getItem(SESSION_TOKEN_KEY); }
  catch { return null; }
}

function saveStoredFCMToken(token: string) {
  try { sessionStorage.setItem(SESSION_TOKEN_KEY, token); }
  catch { /* non-fatal */ }
}

function clearStoredFCMToken() {
  try { sessionStorage.removeItem(SESSION_TOKEN_KEY); }
  catch { /* non-fatal */ }
}

function isRegisteredThisSession(uid: string): boolean {
  try { return sessionStorage.getItem(registeredKey(uid)) === "1"; }
  catch { return false; }
}

function markRegisteredThisSession(uid: string) {
  try { sessionStorage.setItem(registeredKey(uid), "1"); }
  catch { /* non-fatal */ }
}

function clearRegisteredFlag(uid: string) {
  try { sessionStorage.removeItem(registeredKey(uid)); }
  catch { /* non-fatal */ }
}

// ── Wait for service worker to be active (fixes new-account first-load) ───────
// On brand-new installs the SW goes through installing → waiting → activated.
// getToken() silently fails or throws until SW is "active".
// We poll for up to 10 seconds then give up gracefully.

async function waitForServiceWorker(timeoutMs = 10_000): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator)) return null;
  try {
    const reg = await navigator.serviceWorker.register("/firebase-messaging-sw.js");

    // Already active — happy path (most page loads after first install)
    if (reg.active) return reg;

    // Wait for activation
    return new Promise((resolve) => {
      const deadline = setTimeout(() => resolve(null), timeoutMs);

      const sw = reg.installing ?? reg.waiting;
      if (!sw) { clearTimeout(deadline); resolve(null); return; }

      sw.addEventListener("statechange", function handler() {
        if (this.state === "activated") {
          clearTimeout(deadline);
          sw.removeEventListener("statechange", handler);
          resolve(reg);
        }
      });
    });
  } catch (err) {
    console.warn("[FCM] SW registration failed:", err);
    return null;
  }
}

// ── One-time client-side deduplication ───────────────────────────────────────
// Reads the user's fcmTokens array once per session and removes exact duplicates.
// Cheap: 1 read + 1 conditional write. Prevents array bloat from client-side
// multiple registrations that slipped through in previous versions.

async function deduplicateTokensOnce(uid: string, currentToken: string): Promise<void> {
  const key = `fcm_deduped_${uid}`;
  try {
    if (sessionStorage.getItem(key) === "1") return; // already done this session
    const snap = await getDoc(doc(db, "users", uid));
    if (!snap.exists()) return;
    const raw: string[] = snap.data()?.fcmTokens ?? [];
    const unique = [...new Set(raw.filter((t) => typeof t === "string" && t.length > 0))];
    if (unique.length < raw.length) {
      // There are exact duplicates — write back the deduplicated list
      await updateDoc(doc(db, "users", uid), { fcmTokens: unique });
      console.info(`[FCM] Deduplicated tokens for uid=${uid}: ${raw.length} → ${unique.length}`);
    }
    sessionStorage.setItem(key, "1");
  } catch {
    // Non-fatal — deduplication is a best-effort cleanup
  }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useFCM() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    // FIX 1: Use sessionStorage as the guard instead of a ref.
    // This persists across React re-renders and page refreshes within the tab,
    // but clears when the tab is closed — exactly the right lifetime.
    if (isRegisteredThisSession(user.uid)) return;

    if (!("serviceWorker" in navigator) || !("Notification" in window)) return;

    // Capture uid synchronously before any await (user state may change)
    const uid = user.uid;
    let unsubMessage: (() => void) | null = null;

    async function register() {
      try {
        // ── 1. Request permission ────────────────────────────────────────────
        const permission = await Notification.requestPermission();
        if (permission !== "granted") {
          console.info("[FCM] Notification permission not granted — skipping.");
          return;
        }

        // ── 2. FIX 2: Wait for SW to be active before calling getToken() ────
        // Critical for new accounts where the SW is being installed for the first time.
        const swReg = await waitForServiceWorker(10_000);
        if (!swReg) {
          console.warn("[FCM] SW not active after timeout — skipping token registration.");
          return;
        }

        // ── 3. Get current token ─────────────────────────────────────────────
        const messaging = getMessaging(app);
        const token = await getToken(messaging, {
          vapidKey: VAPID_KEY,
          serviceWorkerRegistration: swReg, // pass explicit registration — avoids SW lookup race
        });

        if (!token) {
          console.warn("[FCM] getToken() returned empty — SW may not be fully active.");
          return;
        }

        // ── 4. FIX 1: Mark registered BEFORE any async writes ───────────────
        // If the component unmounts and remounts (StrictMode double-invoke, hot reload)
        // while we're awaiting, the second invocation sees the flag and bails out.
        markRegisteredThisSession(uid);

        // ── 5. Detect token rotation ─────────────────────────────────────────
        // Read stored BEFORE overwriting so we can compare
        const previousToken = getStoredFCMToken();
        saveStoredFCMToken(token);

        // ── 6. Write to Firestore with arrayUnion (idempotent) ───────────────
        await updateDoc(doc(db, "users", uid), {
          fcmTokens: arrayUnion(token),
        });
        console.info(`[FCM] Token registered for uid=${uid}`);

        // ── 7. Remove stale token if rotation was detected ───────────────────
        if (previousToken && previousToken !== token) {
          console.info("[FCM] Token rotated — removing stale token.");
          try {
            await updateDoc(doc(db, "users", uid), {
              fcmTokens: arrayRemove(previousToken),
            });
          } catch {
            // Non-fatal — Cloud Function will prune on next send
          }
        }

        // ── 8. FIX 3: One-time deduplication of the stored array ─────────────
        // Cleans up any exact duplicates that accumulated from previous versions.
        await deduplicateTokensOnce(uid, token);

        // ── 9. Foreground message handler ────────────────────────────────────
        // NotificationBell updates via Firestore onSnapshot — no browser popup needed.
        // We still subscribe so the console shows foreground messages during dev.
        unsubMessage = onMessage(messaging, (payload) => {
          console.info("[FCM] Foreground message:", payload.notification?.title);
          // Intentionally NOT showing a toast here — the bell handles it.
          // Showing a browser Notification.show() here would be a DUPLICATE
          // because the SW also receives the message via onBackgroundMessage
          // when the page is not focused.
        });

      } catch (err: any) {
        // Clear the flag on failure so the next mount can retry
        clearRegisteredFlag(uid);
        console.warn("[FCM] Registration failed:", err?.code ?? err?.message ?? err);
      }
    }

    register();

    return () => {
      unsubMessage?.();
      // NOTE: Do NOT clear the registeredFlag here.
      // The cleanup function runs on every re-render in StrictMode.
      // Clearing the flag would defeat the duplicate-registration guard.
    };
  }, [user?.uid]); // re-run only when the user account changes
}

// ─── unregisterFCMToken — called by AuthContext.logout() ─────────────────────
// Deletes the FCM token from Firebase AND removes it from Firestore.
// Also clears the session guard so the next login re-registers cleanly.

export async function unregisterFCMToken(uid: string): Promise<void> {
  try {
    const messaging = getMessaging(app);

    // Get the current token (may differ from stored if SDK rotated it)
    let currentToken: string | null = null;
    try {
      currentToken = await getToken(messaging, { vapidKey: VAPID_KEY });
    } catch {
      currentToken = getStoredFCMToken();
    }

    // Delete from Firebase messaging infrastructure
    try { await deleteToken(messaging); }
    catch { /* non-fatal */ }

    // Remove both the current and the stored token from Firestore
    const storedToken = getStoredFCMToken();
    const tokensToRemove = [
      ...new Set([currentToken, storedToken].filter(Boolean)),
    ] as string[];

    if (tokensToRemove.length > 0) {
      await updateDoc(doc(db, "users", uid), {
        fcmTokens: arrayRemove(...tokensToRemove),
      });
      console.info(`[FCM] Token(s) removed on logout for uid=${uid}`);
    }

    // Clear session state so next login re-registers from scratch
    clearStoredFCMToken();
    clearRegisteredFlag(uid);

  } catch (err) {
    // Non-fatal — logout must succeed even if FCM cleanup fails
    console.warn("[FCM] Token cleanup on logout failed:", err);
  }
}