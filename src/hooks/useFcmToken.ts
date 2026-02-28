/**
 * src/hooks/useFcmToken.ts
 *
 * Handles the full FCM token lifecycle for web:
 *  - Requests browser notification permission
 *  - Gets an FCM token tied to your VAPID key
 *  - Saves it to users/{uid}.fcmTokens[] in Firestore (arrayUnion = no duplicates)
 *  - Refreshes the token automatically when Firebase rotates it
 *  - Shows in-app toast for foreground messages
 *  - Exposes removeCurrentDeviceToken() for logout flow
 *
 * Usage: Call useFcmToken() once inside any component that only renders
 * for authenticated users (e.g. your main layout / AppShell).
 */

import { useEffect, useCallback, useRef } from "react";
import {
  getMessaging,
  getToken,
  onMessage,
  deleteToken,
  type Messaging,
} from "firebase/messaging";
import { doc, updateDoc, arrayUnion, arrayRemove } from "firebase/firestore";
import toast from "react-hot-toast";
import app, { db } from "@/firebase/firebase";
import { useAuth } from "@/store/AuthContext/AuthContext";

// ── Add your VAPID key to .env as VITE_FIREBASE_VAPID_KEY ────────────────────
// Firebase Console → Project Settings → Cloud Messaging → Web Push certificates
const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY as string;

// ─────────────────────────────────────────────────────────────────────────────

export function useFcmToken() {
  const { user } = useAuth();
  const messagingRef = useRef<Messaging | null>(null);
  const savedTokenRef = useRef<string | null>(null); // tracks what we stored this session

  // Lazily get messaging instance (avoids SSR issues)
  const getMsg = useCallback(() => {
    if (!messagingRef.current) {
      messagingRef.current = getMessaging(app);
    }
    return messagingRef.current;
  }, []);

  // ── Persist token to Firestore (arrayUnion ensures no duplicates) ─────────
  const saveToken = useCallback(
    async (token: string) => {
      if (!user) return;
      if (savedTokenRef.current === token) return; // already saved this session
      try {
        await updateDoc(doc(db, "users", user.uid), {
          fcmTokens: arrayUnion(token),
        });
        savedTokenRef.current = token;
        console.log("[FCM] Token registered for uid:", user.uid);
      } catch (err) {
        console.error("[FCM] Failed to save token:", err);
      }
    },
    [user],
  );

  // ── Remove token from Firestore ───────────────────────────────────────────
  const removeToken = useCallback(
    async (token: string) => {
      if (!user) return;
      try {
        await updateDoc(doc(db, "users", user.uid), {
          fcmTokens: arrayRemove(token),
        });
        savedTokenRef.current = null;
        console.log("[FCM] Token removed for uid:", user.uid);
      } catch (err) {
        console.error("[FCM] Failed to remove token:", err);
      }
    },
    [user],
  );

  // ── Public: call this on logout to deregister this device ────────────────
  const removeCurrentDeviceToken = useCallback(async () => {
    if (!user) return;
    try {
      const msg = getMsg();
      const token = await getToken(msg, { vapidKey: VAPID_KEY });
      if (token) {
        await deleteToken(msg);       // revoke from FCM servers
        await removeToken(token);     // remove from Firestore
      }
    } catch (err) {
      console.error("[FCM] Error removing token on logout:", err);
    }
  }, [user, getMsg, removeToken]);

  // ── Request permission + generate + save token ────────────────────────────
  const requestPermissionAndRegister = useCallback(async () => {
    if (!user) return;

    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      console.log("[FCM] Notification permission denied.");
      return;
    }

    try {
      const msg = getMsg();
      const token = await getToken(msg, { vapidKey: VAPID_KEY });
      if (token) {
        await saveToken(token);
      } else {
        console.warn(
          "[FCM] getToken returned empty — " +
            "make sure firebase-messaging-sw.js is in /public.",
        );
      }
    } catch (err) {
      // Common on localhost without HTTPS — not fatal
      console.error("[FCM] getToken error:", err);
    }
  }, [user, getMsg, saveToken]);

  // ── Mount: register + listen for foreground messages ─────────────────────
  useEffect(() => {
    if (!user) return;

    requestPermissionAndRegister();

    const msg = getMsg();

    // Foreground push: tab is open → show as a toast
    const unsubscribe = onMessage(msg, (payload) => {
      const { title = "Loqta Zone", body = "" } =
        payload.notification ?? {};

      toast(`🔔 ${title}${body ? `\n${body}` : ""}`, { duration: 6000 });

      console.log("[FCM] Foreground message:", payload);
    });

    return () => unsubscribe();
  }, [user, getMsg, requestPermissionAndRegister]);

  return { removeCurrentDeviceToken };
}