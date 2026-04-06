/**
 * src/hooks/useFCM.ts
 *
 * ─── Root cause of the remaining 2-token problem ──────────────────────────────
 *
 * The previous fix added registeredUids.add(uid) AFTER the first await
 * (Notification.requestPermission). React StrictMode unmounts+remounts
 * synchronously, so BOTH mount calls reach the registeredUids.has() check
 * before either one awaits — both pass the guard, both call
 * requestPermission(), both call getToken(), and both write to Firestore.
 * Result: 2 tokens in Firestore → every Cloud Function call sends to both
 * tokens → 2 browser notifications.
 *
 * ─── The real fix ────────────────────────────────────────────────────────────
 *
 * Use TWO sets:
 *   • pendingUids  — added SYNCHRONOUSLY before any await. Blocks the second
 *                    StrictMode mount immediately, before any async work starts.
 *   • registeredUids — added after successful token write. Used to skip
 *                      re-registration on future renders without re-doing work.
 *
 * This guarantees exactly one registration per uid per page session regardless
 * of how many times React mounts/unmounts the component.
 *
 * ─── Also fixed in this version ──────────────────────────────────────────────
 *
 * • registeredUids.clear() on logout was clearing ALL uids. Changed to
 *   .delete(uid) so only the logged-out user's entry is removed.
 *
 * • Deduplication: on login we read the full fcmTokens array and collapse any
 *   duplicate copies of the current token that accumulated from previous
 *   broken sessions. This is a one-time self-heal — after this runs, the
 *   Cloud Functions' dead-token pruning keeps the array clean going forward.
 */

import { useEffect, useRef } from "react";
import {
  getMessaging,
  getToken,
  onMessage,
  deleteToken,
} from "firebase/messaging";
import {
  doc,
  setDoc,
  updateDoc,
  getDoc,
  arrayUnion,
  arrayRemove,
} from "firebase/firestore";
import app, { db } from "@/firebase/firebase";
import { useAuth } from "@/store/AuthContext/AuthContext";

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY as string;
const SESSION_TOKEN_KEY = "fcm_token";

// ─── MODULE-SCOPE dual guard ──────────────────────────────────────────────────
//
// pendingUids:
//   Added SYNCHRONOUSLY before the first await. This is the critical guard.
//   React StrictMode runs both useEffect calls synchronously before yielding
//   to microtasks, so by the time the second mount's effect body runs, the
//   first mount has already added the uid here — blocking re-entry cleanly.
//
// registeredUids:
//   Added after a successful Firestore write. Prevents re-registration on
//   future re-renders (e.g. context updates) without repeating all the work.
//
// On logout: ONLY the specific uid is removed from both sets so other users
// on the same device session aren't affected and re-login registers fresh.
const pendingUids    = new Set<string>();
const registeredUids = new Set<string>();

// ─── Session storage helpers ──────────────────────────────────────────────────
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

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useFCM() {
  const { user } = useAuth();
  const unsubRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    // Logout: clean up foreground listener only. Guards are cleared in
    // unregisterFCMToken() which is called by AuthContext.logout().
    if (!user) {
      unsubRef.current?.();
      unsubRef.current = null;
      return;
    }

    // Already registered OR registration is in-flight — skip entirely.
    if (registeredUids.has(user.uid) || pendingUids.has(user.uid)) return;

    if (!("serviceWorker" in navigator) || !("Notification" in window)) return;

    const uid = user.uid;

    // ── SYNCHRONOUS guard — must happen before ANY await ─────────────────
    // This line runs before React yields. The StrictMode second mount sees
    // pendingUids.has(uid) === true and returns early above.
    pendingUids.add(uid);

    async function register() {
      try {
        // ── 1. Permission ─────────────────────────────────────────────────
        const permission = await Notification.requestPermission();
        if (permission !== "granted") {
          console.info("[FCM] Permission not granted.");
          pendingUids.delete(uid);
          return;
        }

        // ── 2. Read previous token BEFORE getting new one ─────────────────
        const previousToken = getStoredFCMToken();

        // ── 3. Get token from Firebase ────────────────────────────────────
        const messaging = getMessaging(app);
        const token = await getToken(messaging, { vapidKey: VAPID_KEY });

        if (!token) {
          console.warn("[FCM] getToken() empty — SW may not be registered yet.");
          pendingUids.delete(uid);
          return;
        }

        // ── 4. Persist to session storage ─────────────────────────────────
        saveStoredFCMToken(token);

        // ── 5. Write to Firestore ─────────────────────────────────────────
        // setDoc+merge works for brand-new accounts (no doc yet) AND existing
        // accounts. arrayUnion is idempotent — same token never stored twice.
        await setDoc(
          doc(db, "users", uid),
          { fcmTokens: arrayUnion(token) },
          { merge: true },
        );

        // ── 6. Self-heal: collapse any duplicate tokens from broken sessions ─
        // If a previous session wrote the same token twice (due to the old
        // StrictMode bug), clean it up now. After this runs once, it stays clean.
        try {
          const userSnap = await getDoc(doc(db, "users", uid));
          if (userSnap.exists()) {
            const rawTokens: string[] = userSnap.data()?.fcmTokens ?? [];
            const hasDuplicates = rawTokens.filter(t => t === token).length > 1;
            if (hasDuplicates) {
              // arrayRemove removes ALL occurrences, then re-add exactly once
              await updateDoc(doc(db, "users", uid), { fcmTokens: arrayRemove(token) });
              await updateDoc(doc(db, "users", uid), { fcmTokens: arrayUnion(token) });
              console.info("[FCM] Self-healed duplicate token entries.");
            }
          }
        } catch {
          /* non-fatal */
        }

        // ── 7. Remove stale token if rotation detected ────────────────────
        if (previousToken && previousToken !== token) {
          console.info("[FCM] Token rotated — removing stale token.");
          try {
            await updateDoc(doc(db, "users", uid), {
              fcmTokens: arrayRemove(previousToken),
            });
          } catch { /* non-fatal */ }
        }

        // ── 8. Mark fully registered ──────────────────────────────────────
        registeredUids.add(uid);
        console.info("[FCM] Token registered for uid=" + uid);

        // ── 9. Foreground listener ────────────────────────────────────────
        // CRITICAL: Do NOT call showNotification() here.
        // When the app is OPEN, Firebase bypasses the service worker and
        // calls this handler instead. The service worker handles BACKGROUND
        // notifications. The NotificationBell handles FOREGROUND via Firestore
        // onSnapshot. Showing a notification here would cause duplicates.
        const unsub = onMessage(messaging, (payload) => {
          console.info("[FCM] Foreground message:", payload.notification?.title);
          // Bell updates automatically via useNotifications (Firestore onSnapshot).
          // No browser notification needed here — would duplicate the SW one.
        });
        unsubRef.current = unsub;

      } catch (err: any) {
        // Allow retry on next render
        pendingUids.delete(uid);
        console.warn("[FCM] Registration failed:", err?.code ?? err?.message ?? err);
      }
    }

    register();

    return () => {
      // Only clean up the foreground listener.
      // Do NOT touch pendingUids/registeredUids here — StrictMode unmounts
      // then immediately remounts. If we cleared the guards in cleanup,
      // the second mount would re-register and we'd be back to 2 tokens.
      unsubRef.current?.();
      unsubRef.current = null;
    };
  }, [user?.uid]);
}

// ─── Logout helper (called by AuthContext.logout()) ───────────────────────────
export async function unregisterFCMToken(uid: string): Promise<void> {
  try {
    const messaging = getMessaging(app);

    // Get current token from Firebase SDK (most reliable source)
    let currentToken: string | null = null;
    try {
      currentToken = await getToken(messaging, { vapidKey: VAPID_KEY });
    } catch {
      // Fall back to session storage if SDK fails
      currentToken = getStoredFCMToken();
    }

    // Delete from Firebase messaging infrastructure
    try { await deleteToken(messaging); }
    catch { /* non-fatal */ }

    // Remove from Firestore — union of current + stored to catch rotation cases
    const storedToken = getStoredFCMToken();
    const tokensToRemove = [
      ...new Set([currentToken, storedToken].filter(Boolean)),
    ] as string[];

    if (tokensToRemove.length > 0) {
      await updateDoc(doc(db, "users", uid), {
        fcmTokens: arrayRemove(...tokensToRemove),
      });
      console.info("[FCM] Token(s) removed on logout for uid=" + uid);
    }

    clearStoredFCMToken();

  } catch (err) {
    console.warn("[FCM] Token cleanup on logout failed:", err);
  } finally {
    // Always clear guards — even on error — so re-login can register fresh.
    // Use .delete(uid) NOT .clear() — don't affect other users.
    pendingUids.delete(uid);
    registeredUids.delete(uid);
  }
}