/**
 * src/hooks/useNotifications.ts
 *
 * Fixed: better error handling so permission errors don't bubble up as toasts
 */

import { useEffect, useState, useCallback } from "react";
import {
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
  writeBatch,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/firebase/firebase";
import { useAuth } from "@/store/AuthContext/AuthContext";

export type NotificationType =
  | "auction_matched"
  | "bid"
  | "win"
  | "watchlist"
  | "promo"
  | "expiry";

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  auctionId?: string;
  requestId?: string;
  createdAt: Date;
}

export function useNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, "users", user.uid, "notifications"),
      orderBy("createdAt", "desc"),
      limit(50),
    );

    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        setNotifications(
          snap.docs.map((d) => {
            const data = d.data();
            return {
              id: d.id,
              type: (data.type as NotificationType) ?? "promo",
              title: data.title ?? "",
              message: data.message ?? "",
              isRead: data.isRead ?? false,
              auctionId: data.auctionId ?? undefined,
              requestId: data.requestId ?? undefined,
              createdAt:
                data.createdAt instanceof Timestamp
                  ? data.createdAt.toDate()
                  : new Date(),
            };
          }),
        );
        setLoading(false);
      },
      (err) => {
        // Silently fail — don't show error toast for permission issues
        // This happens for users with no notifications subcollection yet
        console.warn("[useNotifications] Snapshot error (likely no docs yet):", err.code);
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, [user]);

  const markRead = useCallback(
    async (id: string) => {
      if (!user) return;
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
      );
      try {
        await updateDoc(
          doc(db, "users", user.uid, "notifications", id),
          { isRead: true },
        );
      } catch (err) {
        console.error("[useNotifications] markRead failed:", err);
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, isRead: false } : n)),
        );
      }
    },
    [user],
  );

  const markAllRead = useCallback(async () => {
    if (!user) return;
    const unread = notifications.filter((n) => !n.isRead);
    if (unread.length === 0) return;

    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));

    try {
      const batch = writeBatch(db);
      unread.forEach((n) =>
        batch.update(doc(db, "users", user.uid, "notifications", n.id), {
          isRead: true,
        }),
      );
      await batch.commit();
    } catch (err) {
      console.error("[useNotifications] markAllRead failed:", err);
      setNotifications((prev) =>
        prev.map((n) => {
          const wasUnread = unread.find((u) => u.id === n.id);
          return wasUnread ? { ...n, isRead: false } : n;
        }),
      );
    }
  }, [user, notifications]);

  const dismiss = useCallback(
    async (id: string) => {
      if (!user) return;
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      try {
        await deleteDoc(doc(db, "users", user.uid, "notifications", id));
      } catch (err) {
        console.error("[useNotifications] dismiss failed:", err);
      }
    },
    [user],
  );

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return { notifications, unreadCount, loading, markRead, markAllRead, dismiss };
}