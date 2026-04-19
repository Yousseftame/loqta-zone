/**
 * src/hooks/usePendingLastOffer.ts
 *
 * i18n change: productTitles resolution now uses resolveProductTitle()
 * to handle both { en, ar } objects and legacy plain strings.
 */

import { useEffect, useState, useRef } from "react";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { db } from "@/firebase/firebase";
import { useAuth } from "@/store/AuthContext/AuthContext";
import { resolveProductTitle } from "@/lib/resolveLocalized";

const DISMISSED_PREFIX = "lo_dismissed_";

function isDismissed(auctionId: string): boolean {
  try { return sessionStorage.getItem(DISMISSED_PREFIX + auctionId) === "1"; }
  catch { return false; }
}

export function dismissPendingLastOffer(auctionId: string): void {
  try { sessionStorage.setItem(DISMISSED_PREFIX + auctionId, "1"); }
  catch { /* non-fatal */ }
}

export interface PendingLastOfferAuction {
  auctionId: string;
  startingPrice: number;
  winningBid: number;
  winnerName: string;
  productTitle: string;
}

export function usePendingLastOffer(): {
  queue: PendingLastOfferAuction[];
  dismiss: (auctionId: string) => void;
  loading: boolean;
} {
  const { user } = useAuth();
  const [queue,   setQueue]   = useState<PendingLastOfferAuction[]>([]);
  const [loading, setLoading] = useState(false);
  const checkedRef = useRef(false);

  const dismiss = (auctionId: string) => {
    dismissPendingLastOffer(auctionId);
    setQueue((prev) => prev.filter((a) => a.auctionId !== auctionId));
  };

  useEffect(() => {
    if (!user) {
      checkedRef.current = false;
      setQueue([]);
      return;
    }

    if (checkedRef.current) return;
    checkedRef.current = true;

    const uid = user.uid;

    async function check() {
      setLoading(true);
      try {
        // Step 1: get all auctions this user joined
        const joinedSnap = await getDocs(
          collection(db, "users", uid, "auctions"),
        );
        if (joinedSnap.empty) return;

        const joinedAuctionIds: string[] = joinedSnap.docs.map(
          (d) => d.data().auctionId ?? d.id,
        );

        // Step 2: batch-fetch each auction, filter qualifying ones
        const auctionDocs = await Promise.all(
          joinedAuctionIds.map((id) => getDoc(doc(db, "auctions", id))),
        );

        type QualifyingAuction = {
          auctionId:    string;
          productId:    string;
          winnerId:     string;
          startingPrice: number;
          winningBid:   number;
        };

        const qualifying: QualifyingAuction[] = [];

        for (const snap of auctionDocs) {
          if (!snap.exists()) continue;
          const d = snap.data();

          const endTime = d.endTime?.toDate?.() ?? null;
          if (!endTime || endTime > new Date()) continue;

          const winnerId = d.winnerId as string | null | undefined;
          if (!winnerId || winnerId === "NO_WINNER") continue;
          if (winnerId === uid) continue;
          if (!(d.lastOfferEnabled ?? true)) continue;
          if (isDismissed(snap.id)) continue;

          qualifying.push({
            auctionId:     snap.id,
            productId:     d.productId ?? "",
            winnerId,
            startingPrice: d.startingPrice ?? 0,
            winningBid:    d.winningBid ?? d.currentBid ?? 0,
          });
        }

        if (qualifying.length === 0) return;

        // Step 3: check each qualifying auction for existing lastOffer
        const stillPending: QualifyingAuction[] = [];

        await Promise.all(
          qualifying.map(async (item) => {
            const q = query(
              collection(db, "auctions", item.auctionId, "lastOffers"),
              where("userId", "==", uid),
            );
            const existing = await getDocs(q);
            if (existing.empty) {
              stillPending.push(item);
            }
          }),
        );

        if (stillPending.length === 0) return;

        // Step 4: resolve winner names + product titles
        const uniqueWinnerIds  = [...new Set(stillPending.map((a) => a.winnerId))];
        const uniqueProductIds = [...new Set(stillPending.map((a) => a.productId).filter(Boolean))];

        const [winnerSnaps, productSnaps] = await Promise.all([
          Promise.all(uniqueWinnerIds.map((id) => getDoc(doc(db, "users", id)))),
          Promise.all(uniqueProductIds.map((id) => getDoc(doc(db, "products", id)))),
        ]);

        const winnerNames: Record<string, string> = {};
        winnerSnaps.forEach((snap, i) => {
          const d = snap.exists() ? snap.data() : {};
          winnerNames[uniqueWinnerIds[i]] =
            d.fullName ?? d.displayName ?? d.firstName ?? "The Winner";
        });

        // ← i18n FIX: resolve { en, ar } or legacy plain string
        const productTitles: Record<string, string> = {};
        productSnaps.forEach((snap, i) => {
          productTitles[uniqueProductIds[i]] = snap.exists()
            ? resolveProductTitle(snap.data()?.title, "")
            : "";
        });

        const result: PendingLastOfferAuction[] = stillPending.map((item) => ({
          auctionId:     item.auctionId,
          startingPrice: item.startingPrice,
          winningBid:    item.winningBid,
          winnerName:    winnerNames[item.winnerId]    ?? "The Winner",
          productTitle:  productTitles[item.productId] ?? "",
        }));

        result.sort((a, b) => b.winningBid - a.winningBid);
        setQueue(result);
      } catch (err) {
        console.warn("[usePendingLastOffer] Check failed:", err);
      } finally {
        setLoading(false);
      }
    }

    check();
  }, [user?.uid]); // eslint-disable-line react-hooks/exhaustive-deps

  return { queue, dismiss, loading };
}