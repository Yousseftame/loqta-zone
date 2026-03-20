/**
 * useUserJoinedProducts.ts
 *
 * Lightweight hook that returns two sets for the current user:
 *   - joinedProductIds : Set of productIds where the user has joined an auction
 *                        that is still live or upcoming (endTime in the future).
 *                        FIX: ended auctions are excluded so the product card
 *                        reverts to its normal UI once all its auctions finish.
 *   - joinedAuctionIds : Set of ALL auctionIds the user has joined (including ended).
 *
 * Strategy:
 *   Read users/{uid}/auctions (subcollection) — each doc has an auctionId field.
 *   Then fetch the productId + endTime for each joined auction from the auctions
 *   collection. Only auctions with endTime > now contribute to joinedProductIds.
 *
 * This is O(joined auctions) reads, which is small for typical users.
 * Results are cached in module-level memory per uid so multiple consumers
 * (AuctionSwiper, AuctionsSection, etc.) share a single fetch per session.
 */

import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  doc,
  getDoc,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/firebase/firebase";
import { useAuth } from "@/store/AuthContext/AuthContext";

interface JoinedState {
  joinedProductIds: Set<string>;
  joinedAuctionIds: Set<string>;
  loading: boolean;
}

// ── Module-level cache (shared across hook instances in same tab) ─────────────
const cache: Map<string, { productIds: Set<string>; auctionIds: Set<string> }> = new Map();

export function useUserJoinedProducts(): JoinedState {
  const { user } = useAuth();
  const [state, setState] = useState<JoinedState>({
    joinedProductIds: new Set(),
    joinedAuctionIds: new Set(),
    loading: true,
  });

  useEffect(() => {
    if (!user) {
      setState({ joinedProductIds: new Set(), joinedAuctionIds: new Set(), loading: false });
      return;
    }

    // Return cached result instantly if available
    const cached = cache.get(user.uid);
    if (cached) {
      setState({
        joinedProductIds: cached.productIds,
        joinedAuctionIds: cached.auctionIds,
        loading: false,
      });
      return;
    }

    let cancelled = false;

    async function load() {
      try {
        // Step 1: get all auction IDs user has joined
        const userAuctionsSnap = await getDocs(
          collection(db, "users", user!.uid, "auctions"),
        );
        if (cancelled) return;

        const auctionIds = new Set<string>(
          userAuctionsSnap.docs.map((d) => d.id),
        );

        if (auctionIds.size === 0) {
          const empty = { productIds: new Set<string>(), auctionIds: new Set<string>() };
          cache.set(user!.uid, empty);
          if (!cancelled) setState({ joinedProductIds: new Set(), joinedAuctionIds: new Set(), loading: false });
          return;
        }

        // Step 2: fetch productId + endTime for each joined auction
        const auctionDocs = await Promise.all(
          Array.from(auctionIds).map((id) =>
            getDoc(doc(db, "auctions", id)).catch(() => null),
          ),
        );
        if (cancelled) return;

        const now = new Date();
        // FIX 2: only add productId to joinedProductIds when the auction is
        // still live or upcoming (endTime > now). Ended auctions are excluded
        // so the product card reverts to its default UI after the auction ends.
        const productIds = new Set<string>();
        auctionDocs.forEach((snap) => {
          if (!snap?.exists()) return;
          const data = snap.data();
          const pid = data.productId;
          if (!pid) return;

          const endTime: Date =
            data.endTime instanceof Timestamp
              ? data.endTime.toDate()
              : new Date(data.endTime);

          // Only mark as joined when auction is still active (not ended)
          if (endTime > now) {
            productIds.add(pid);
          }
        });

        const result = { productIds, auctionIds };
        cache.set(user!.uid, result);

        if (!cancelled) {
          setState({
            joinedProductIds: productIds,
            joinedAuctionIds: auctionIds,
            loading: false,
          });
        }
      } catch {
        if (!cancelled) setState({ joinedProductIds: new Set(), joinedAuctionIds: new Set(), loading: false });
      }
    }

    load();
    return () => { cancelled = true; };
  }, [user?.uid]);

  return state;
}

/** Call this after a successful join to invalidate the cache for the current user */
export function invalidateJoinedCache(uid: string) {
  cache.delete(uid);
}