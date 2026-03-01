/**
 * src/hooks/useFcmToken.ts
 *
 * Fixed:
 *  - Uses setDoc with merge:true instead of updateDoc → works for old accounts
 *    that don't have fcmTokens field yet (updateDoc fails on missing fields)
 *  - Checks permission state before requesting to avoid double-prompt
 */

import { useEffect, useCallback, useRef } from "react";
import {
  getMessaging,
  getToken,
  onMessage,
  deleteToken,
  type Messaging,
} from "firebase/messaging";
import { doc, setDoc, updateDoc, arrayUnion, arrayRemove } from "firebase/firestore";
import toast from "react-hot-toast";
import app, { db } from "@/firebase/firebase";
import { useAuth } from "@/store/AuthContext/AuthContext";

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY as string;

export function useFcmToken() {
  const { user } = useAuth();
  const messagingRef = useRef<Messaging | null>(null);
  const savedTokenRef = useRef<string | null>(null);
  const registeredRef = useRef(false); // prevent double-registration

  const getMsg = useCallback(() => {
    if (!messagingRef.current) {
      messagingRef.current = getMessaging(app);
    }
    return messagingRef.current;
  }, []);

  // Use setDoc with merge so it works even if fcmTokens field doesn't exist yet
  const saveToken = useCallback(
    async (token: string) => {
      if (!user) return;
      if (savedTokenRef.current === token) return;
      try {
        await setDoc(
          doc(db, "users", user.uid),
          { fcmTokens: arrayUnion(token) },
          { merge: true }  // ← KEY FIX: won't fail if field is missing
        );
        savedTokenRef.current = token;
        console.log("[FCM] Token registered for uid:", user.uid);
      } catch (err) {
        console.error("[FCM] Failed to save token:", err);
      }
    },
    [user],
  );

  const removeToken = useCallback(
    async (token: string) => {
      if (!user) return;
      try {
        await updateDoc(doc(db, "users", user.uid), {
          fcmTokens: arrayRemove(token),
        });
        savedTokenRef.current = null;
      } catch (err) {
        console.error("[FCM] Failed to remove token:", err);
      }
    },
    [user],
  );

  const removeCurrentDeviceToken = useCallback(async () => {
    if (!user) return;
    try {
      const msg = getMsg();
      const token = await getToken(msg, { vapidKey: VAPID_KEY });
      if (token) {
        await deleteToken(msg);
        await removeToken(token);
      }
    } catch (err) {
      console.error("[FCM] Error removing token on logout:", err);
    }
  }, [user, getMsg, removeToken]);

  const requestPermissionAndRegister = useCallback(async () => {
    if (!user) return;
    if (registeredRef.current) return; // ← prevent running twice
    registeredRef.current = true;

    // Check current permission — don't re-request if already granted/denied
    const currentPermission = Notification.permission;
    
    let permission = currentPermission;
    if (currentPermission === "default") {
      permission = await Notification.requestPermission();
    }
    
    if (permission !== "granted") {
      console.log("[FCM] Notification permission:", permission);
      return;
    }

    try {
      const msg = getMsg();
      const token = await getToken(msg, { vapidKey: VAPID_KEY });
      if (token) {
        await saveToken(token);
      } else {
        console.warn("[FCM] getToken returned empty — check firebase-messaging-sw.js is in /public");
      }
    } catch (err) {
      console.error("[FCM] getToken error:", err);
    }
  }, [user, getMsg, saveToken]);

  useEffect(() => {
    if (!user) {
      registeredRef.current = false; // reset on logout
      return;
    }

    requestPermissionAndRegister();

    const msg = getMsg();

    const unsubscribe = onMessage(msg, (payload) => {
      const { title = "Loqta Zone", body = "" } = payload.notification ?? {};
      toast(`🔔 ${title}${body ? `\n${body}` : ""}`, { duration: 6000 });
      console.log("[FCM] Foreground message:", payload);
    });

    return () => unsubscribe();
  }, [user]); // ← only depend on user, not the callbacks

  return { removeCurrentDeviceToken };
}