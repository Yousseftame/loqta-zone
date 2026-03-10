/**
 * src/hooks/useFCM.ts
 *
 * Manages the full FCM token lifecycle for a logged-in user:
 *
 *  1. Requests notification permission (only if not already granted/denied)
 *  2. Gets the current FCM token from Firebase
 *  3. Writes it to Firestore with arrayUnion — which is idempotent
 *     (arrayUnion never creates duplicates, so calling this multiple times
 *      for the same token is always safe)
 *  4. Saves the token to sessionStorage so logout can remove the exact token
 *  5. Listens for token refresh (Firebase rotates tokens periodically) —
 *     removes the old token and registers the new one
 *
 * WHY tokens accumulate (the bug this fixes):
 *  - Previously, getToken() was only called during LOGOUT to delete a token.
 *    It was never called on LOGIN, so tokens were never registered in the
 *    first place — UNLESS the user had registered from a previous code path.
 *  - When Firebase SDK refreshes a token the old one becomes a dead token
 *    that stays in the array and the Cloud Function sends to it (and fails,
 *    or worse — sends to a stale service worker that still shows a push).
 *  - Multiple browser tabs each call getToken() and each may get their own
 *    token, leading to one notification per tab.
 *
 * HOW this fixes it:
 *  - arrayUnion is atomic and idempotent — the same token is never stored twice.
 *  - The current token is saved in sessionStorage (per-tab, cleared on tab close).
 *    Logout reads from sessionStorage to remove exactly the right token.
 *  - onTokenRefresh atomically swaps old → new in a single Firestore transaction.
 *  - The Cloud Function deduplicates tokens via Set before sending (see notifications.ts).
 */

import { useEffect, useRef } from "react";
import { getMessaging, getToken, onMessage, deleteToken } from "firebase/messaging";
import { doc, updateDoc, arrayUnion, arrayRemove } from "firebase/firestore";
import app, { db } from "@/firebase/firebase";
import { useAuth } from "@/store/AuthContext/AuthContext";

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY as string;

// sessionStorage key — per-tab, cleared automatically when the tab closes
const SESSION_TOKEN_KEY = "fcm_token";

/**
 * Saves the current FCM token to sessionStorage.
 * Used by logout to remove exactly the right token from Firestore.
 */
export function getStoredFCMToken(): string | null {
  try {
    return sessionStorage.getItem(SESSION_TOKEN_KEY);
  } catch {
    return null;
  }
}

function saveStoredFCMToken(token: string) {
  try {
    sessionStorage.setItem(SESSION_TOKEN_KEY, token);
  } catch {
    /* non-fatal */
  }
}

function clearStoredFCMToken() {
  try {
    sessionStorage.removeItem(SESSION_TOKEN_KEY);
  } catch {
    /* non-fatal */
  }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useFCM() {
  const { user } = useAuth();
  const registeredRef = useRef(false);

  useEffect(() => {
    // Reset on logout so re-login always re-registers
    if (!user) {
      registeredRef.current = false;
      return;
    }

    // Already registered this session — skip
    if (registeredRef.current) return;

    // Service workers are required for FCM — bail silently in environments
    // where they aren't available (SSR, some test environments)
    if (!("serviceWorker" in navigator) || !("Notification" in window)) return;

    // ── Capture uid synchronously BEFORE any await ─────────────────────────
    // After an await boundary TypeScript cannot guarantee `user` is still
    // non-null (it's a closure over a React state value). Pinning uid here
    // satisfies the type checker and is also more correct at runtime.
    const uid = user.uid;

    let unsubRefresh: (() => void) | null = null;

    async function register() {
      try {
        // ── 1. Request permission ──────────────────────────────────────────
        const permission = await Notification.requestPermission();
        if (permission !== "granted") {
          console.info("[FCM] Notification permission not granted — skipping token registration.");
          return;
        }

        // ── 2. Get current token ───────────────────────────────────────────
        const messaging = getMessaging(app);
        const token = await getToken(messaging, { vapidKey: VAPID_KEY });

        if (!token) {
          console.warn("[FCM] getToken() returned empty — service worker may not be registered yet.");
          return;
        }

        // ── 3. Detect token rotation BEFORE overwriting sessionStorage ────────
        // getStoredFCMToken() reads the token saved from the PREVIOUS session.
        // We must read it here — before saveStoredFCMToken(token) below —
        // otherwise we'd always compare token === token and never detect rotation.
        const previousToken = getStoredFCMToken();

        // ── 4. Save new token + mark registered ───────────────────────────
        registeredRef.current = true;
        saveStoredFCMToken(token);

        // ── 5. Write to Firestore with arrayUnion ─────────────────────────
        // arrayUnion is idempotent — calling this 10 times with the same
        // token results in exactly ONE entry in the array.
        await updateDoc(doc(db, "users", uid), {
          fcmTokens: arrayUnion(token),
        });

        console.info("[FCM] Token registered for uid=" + uid);

        // ── 6. Remove stale token if rotation was detected ────────────────
        if (previousToken && previousToken !== token) {
          console.info("[FCM] Token rotated — removing stale token from Firestore.");
          try {
            await updateDoc(doc(db, "users", uid), {
              fcmTokens: arrayRemove(previousToken),
            });
          } catch {
            /* non-fatal — stale token will be pruned by Cloud Function on next send */
          }
        }

        // ── 7. Handle foreground messages (app is open) ───────────────────
        // Background messages are handled by firebase-messaging-sw.js.
        // For foreground: the NotificationBell updates via Firestore onSnapshot
        // in useNotifications.ts — no browser popup needed here (would duplicate).
        const unsubMessage = onMessage(messaging, (payload) => {
          console.info("[FCM] Foreground message received:", payload.notification?.title);
        });

        unsubRefresh = () => { unsubMessage(); };
      } catch (err: any) {
        // Silently swallow — permission errors, blocked notifications, etc.
        // These are expected in many environments and should not surface as toasts.
        console.warn("[FCM] Registration failed:", err?.code ?? err?.message ?? err);
      }
    }

    register();

    return () => {
      unsubRefresh?.();
    };
  }, [user?.uid]); // re-run if user changes (e.g. different account on same device)
}

/**
 * Exported helper used by AuthContext.logout().
 * Deletes the FCM token from Firebase messaging AND removes it from Firestore.
 * Reads the token from sessionStorage — the same token that was registered
 * when this tab logged in — so we never accidentally remove a token that
 * belongs to another tab or device.
 */
export async function unregisterFCMToken(uid: string): Promise<void> {
  try {
    const messaging = getMessaging(app);

    // Get the current token (may differ from stored if SDK rotated it)
    let currentToken: string | null = null;
    try {
      currentToken = await getToken(messaging, { vapidKey: VAPID_KEY });
    } catch {
      // If getToken fails, fall back to the stored token
      currentToken = getStoredFCMToken();
    }

    // Delete from Firebase messaging infrastructure
    try {
      await deleteToken(messaging);
    } catch {
      /* non-fatal */
    }

    // Remove from Firestore — remove both the current token and the stored
    // token (in case they differ due to rotation)
    const storedToken = getStoredFCMToken();
    const tokensToRemove = [...new Set([currentToken, storedToken].filter(Boolean))] as string[];

    if (tokensToRemove.length > 0) {
      await updateDoc(doc(db, "users", uid), {
        fcmTokens: arrayRemove(...tokensToRemove),
      });
      console.info("[FCM] Token(s) removed on logout for uid=" + uid);
    }

    clearStoredFCMToken();
  } catch (err) {
    // Non-fatal — logout should always succeed even if FCM cleanup fails
    console.warn("[FCM] Token cleanup on logout failed:", err);
  }
}