/**
 * usePendingLastOffer.ts
 *
 * Detects auctions where the current user:
 *  1. Was a registered participant
 *  2. Did NOT win (winnerId is set, not "NO_WINNER", not their uid)
 *  3. The auction has lastOfferEnabled = true
 *  4. The auction has ended
 *  5. They have NOT yet submitted a last offer
 *  6. They haven't dismissed the modal this browser session
 *
 * Returns a queue of qualifying auctions. The UI shows them one at a time.
 * When the user closes a modal (submit OR skip), that auction is session-dismissed
 * so it won't reappear until the next browser session — unless they submitted,
 * in which case condition 5 prevents it permanently.
 *
 * ─── Firestore read path ──────────────────────────────────────────────────────
 * 1. users/{uid}/auctions                       → get all auctionIds user joined
 * 2. auctions/{auctionId}  (batch getDoc)       → filter by ended/winner/lastOffer
 * 3. auctions/{auctionId}/lastOffers  (query)   → confirm no existing submission
 *
 * Total reads: 1 + N + M  where N = auctions joined, M = qualifying auctions.
 * In practice M is almost always 0 or 1. Runs once per login session.
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

// Session-storage key prefix — dismissed auctions won't reappear this session
const DISMISSED_PREFIX = "lo_dismissed_";

function isDismissed(auctionId: string): boolean {
  try { return sessionStorage.getItem(DISMISSED_PREFIX + auctionId) === "1"; }
  catch { return false; }
}

export function dismissPendingLastOffer(auctionId: string): void {
  try { sessionStorage.setItem(DISMISSED_PREFIX + auctionId, "1"); }
  catch { /* non-fatal */ }
}

// ─── Shape returned to the UI ─────────────────────────────────────────────────

export interface PendingLastOfferAuction {
  auctionId: string;
  startingPrice: number;
  winningBid: number;
  winnerName: string;   // resolved name of the winner
  productTitle: string; // resolved from products/{productId}
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function usePendingLastOffer(): {
  queue: PendingLastOfferAuction[];
  dismiss: (auctionId: string) => void;
  loading: boolean;
} {
  const { user } = useAuth();
  const [queue,   setQueue]   = useState<PendingLastOfferAuction[]>([]);
  const [loading, setLoading] = useState(false);
  const checkedRef = useRef(false); // run once per login session

  const dismiss = (auctionId: string) => {
    dismissPendingLastOffer(auctionId);
    setQueue((prev) => prev.filter((a) => a.auctionId !== auctionId));
  };

  useEffect(() => {
    // Reset the guard when the user changes (logout → login)
    if (!user) {
      checkedRef.current = false;
      setQueue([]);
      return;
    }

    // Already ran this session for this user
    if (checkedRef.current) return;
    checkedRef.current = true;

    const uid = user.uid;

    async function check() {
      setLoading(true);
      try {
        // ── Step 1: get all auctions this user joined ─────────────────────
        const joinedSnap = await getDocs(
          collection(db, "users", uid, "auctions"),
        );
        console.log("[usePendingLastOffer] Joined auctions:", joinedSnap.size);
        if (joinedSnap.empty) return;

        const joinedAuctionIds: string[] = joinedSnap.docs.map(
          (d) => d.data().auctionId ?? d.id,
        );

        // ── Step 2: batch-fetch each auction, filter qualifying ones ──────
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

          // Must be ended — status is computed client-side only, so compare endTime
          const endTime = d.endTime?.toDate?.() ?? null;
          if (!endTime || endTime > new Date()) continue;

          // Must have a real winner (not NO_WINNER, not null/undefined)
          const winnerId = d.winnerId as string | null | undefined;
          if (!winnerId || winnerId === "NO_WINNER") continue;

          // Must not be this user (they won, they don't need last offer)
          if (winnerId === uid) continue;

          // Must have lastOfferEnabled
          if (!(d.lastOfferEnabled ?? true)) continue;

          // Must not have been session-dismissed already
          if (isDismissed(snap.id)) continue;

          qualifying.push({
            auctionId:    snap.id,
            productId:    d.productId ?? "",
            winnerId,
            startingPrice: d.startingPrice ?? 0,
            winningBid:    d.winningBid ?? d.currentBid ?? 0,
          });
        }

        console.log("[usePendingLastOffer] Qualifying auctions:", qualifying.length, qualifying.map(q => q.auctionId));
        if (qualifying.length === 0) return;

        // ── Step 3: check each qualifying auction for existing lastOffer ──
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

        // ── Step 4: resolve winner names + product titles ─────────────────
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

        const productTitles: Record<string, string> = {};
        productSnaps.forEach((snap, i) => {
          productTitles[uniqueProductIds[i]] = snap.exists()
            ? (snap.data().title ?? "")
            : "";
        });

        const result: PendingLastOfferAuction[] = stillPending.map((item) => ({
          auctionId:    item.auctionId,
          startingPrice: item.startingPrice,
          winningBid:   item.winningBid,
          winnerName:   winnerNames[item.winnerId]  ?? "The Winner",
          productTitle: productTitles[item.productId] ?? "",
        }));

        // Sort: most recently ended first would need endTime — sort by winningBid desc as proxy
        result.sort((a, b) => b.winningBid - a.winningBid);

        setQueue(result);
      } catch (err) {
        // Non-fatal — if this check fails, user simply doesn't see the modal
        console.warn("[usePendingLastOffer] Check failed:", err);
      } finally {
        setLoading(false);
      }
    }

    check();
  }, [user?.uid]); // eslint-disable-line react-hooks/exhaustive-deps

  return { queue, dismiss, loading };
}