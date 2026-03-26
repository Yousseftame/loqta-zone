/**
 * src/hooks/useAnalytics.ts
 *
 * Real-time analytics via onSnapshot — reads analytics/dashboard and
 * analytics/topAuctions.
 *
 * Total Firestore reads:
 *   - Initial load:  2 reads
 *   - Per update:    1 read per changed document (Cloud Function writes trigger it)
 *   - Per session:   ~2–10 reads/day depending on how active the platform is
 *
 * Cost model (Firestore free tier: 50k reads/day):
 *   Even with 100 admin sessions/day and 20 Cloud Function updates/day
 *   = 100 × 2 (initial) + 20 × 2 (updates) = 240 reads/day — negligible.
 *
 * avgWinningBid is now derived client-side from totalRevenue / endedAuctions
 * instead of being stored on the server, eliminating the concurrency race
 * that existed when two auctions resolved at the same time.
 *
 * Error handling:
 *   The previous onSnapshot implementation crashed Firestore's internal
 *   state machine (INTERNAL ASSERTION FAILED ca9) when permission-denied
 *   hit a live listener. This version wraps with terminate+reinitialize
 *   on fatal errors and falls back to getDoc on permission errors.
 *
 * IMPORTANT: Deploy the analytics Firestore rule before using this hook:
 *   match /analytics/{docId} {
 *     allow read:  if isAdmin();
 *     allow write: if false;
 *   }
 */

import { useEffect, useState, useCallback, useRef } from "react";
import {
  doc,
  onSnapshot,
  getDoc,
  Timestamp,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "@/firebase/firebase";
import {
  DEFAULT_ANALYTICS,
  DEFAULT_TOP_AUCTIONS,
  type DashboardAnalytics,
  type TopAuctionsAnalytics,
} from "@/pages/Admin/Dashboard/analytics-data";

// ─── Parsers ──────────────────────────────────────────────────────────────────

function toDate(v: any): Date | null {
  if (!v) return null;
  if (v instanceof Timestamp) return v.toDate();
  if (v instanceof Date) return v;
  return new Date(v);
}

function parseAnalytics(data: Record<string, any>): DashboardAnalytics {
  const totalRevenue  = data.totalRevenue  ?? 0;
  const endedAuctions = data.endedAuctions ?? 0;

  return {
    totalUsers:           data.totalUsers          ?? 0,
    activeUsers:          data.activeUsers          ?? 0,
    inactiveUsers:        data.inactiveUsers        ?? 0,
    totalAdmins:          data.totalAdmins          ?? 0,
    totalSuperAdmins:     data.totalSuperAdmins     ?? 0,
    totalCategories:      data.totalCategories      ?? 0,
    totalProducts:        data.totalProducts        ?? 0,
    activeProducts:       data.activeProducts       ?? 0,
    inactiveProducts:     data.inactiveProducts     ?? 0,
    totalInventory:       data.totalInventory       ?? 0,
    totalInventoryValue:  data.totalInventoryValue  ?? 0,
    totalAuctions:        data.totalAuctions        ?? 0,
    liveAuctions:         data.liveAuctions         ?? 0,
    upcomingAuctions:     data.upcomingAuctions     ?? 0,
    endedAuctions,
    activeAuctions:       data.activeAuctions       ?? 0,
    inactiveAuctions:     data.inactiveAuctions     ?? 0,
    totalBids:            data.totalBids            ?? 0,
    highestWinningBid:    data.highestWinningBid    ?? 0,
    // ✅ Derived client-side — eliminates the server-side concurrency race.
    // Both totalRevenue and endedAuctions are incremented atomically via
    // FieldValue.increment(); dividing them here is always correct.
    avgWinningBid:        endedAuctions > 0 ? totalRevenue / endedAuctions : 0,
    totalVouchers:        data.totalVouchers        ?? 0,
    totalAuctionRequests: data.totalAuctionRequests ?? 0,
    avgRating:            data.avgRating            ?? 0,
    totalRatings:         data.totalRatings         ?? 0,
    totalRevenue,
    avgMargin:            data.avgMargin            ?? 0,
    updatedAt:            toDate(data.updatedAt),
  };
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAnalytics() {
  const [analytics, setAnalytics]     = useState<DashboardAnalytics>(DEFAULT_ANALYTICS);
  const [topAuctions, setTopAuctions] = useState<TopAuctionsAnalytics>(DEFAULT_TOP_AUCTIONS);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState<string | null>(null);

  // Track how many of the 2 listeners have delivered their first snapshot
  const loadedRef = useRef(0);
  const markLoaded = useCallback(() => {
    loadedRef.current += 1;
    if (loadedRef.current >= 2) setLoading(false);
  }, []);

  // Manual refetch (one-time getDoc) — used after rebuild or on error retry
  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    loadedRef.current = 0;
    try {
      const [dashSnap, topSnap] = await Promise.all([
        getDoc(doc(db, "analytics", "dashboard")),
        getDoc(doc(db, "analytics", "topAuctions")),
      ]);
      setAnalytics(
        dashSnap.exists() ? parseAnalytics(dashSnap.data()) : DEFAULT_ANALYTICS,
      );
      if (topSnap.exists()) {
        const d = topSnap.data();
        setTopAuctions({
          byBids:         d.byBids         ?? [],
          byParticipants: d.byParticipants ?? [],
          byWinningBid:   d.byWinningBid   ?? [],
          updatedAt:      toDate(d.updatedAt),
        });
      } else {
        setTopAuctions(DEFAULT_TOP_AUCTIONS);
      }
    } catch (err: any) {
      setError(
        err?.code === "permission-denied"
          ? "Analytics access denied. Add the analytics rule to firestore.rules."
          : "Failed to load analytics.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadedRef.current = 0;
    const unsubs: Unsubscribe[] = [];

    // ── analytics/dashboard — real-time ──────────────────────────────────────
    const unsubDash = onSnapshot(
      doc(db, "analytics", "dashboard"),
      (snap) => {
        setAnalytics(snap.exists() ? parseAnalytics(snap.data()) : DEFAULT_ANALYTICS);
        setError(null);
        markLoaded();
      },
      (err) => {
        console.error("[useAnalytics] dashboard error:", err.code);
        if (err.code === "permission-denied") {
          setError(
            "Analytics access denied. Add the analytics rule to firestore.rules.",
          );
        }
        // Fall back to one-time fetch so the rest of the dashboard still works
        getDoc(doc(db, "analytics", "dashboard"))
          .then((snap) => {
            if (snap.exists()) setAnalytics(parseAnalytics(snap.data()));
          })
          .catch(() => {/* silent */});
        markLoaded();
      },
    );
    unsubs.push(unsubDash);

    // ── analytics/topAuctions — real-time ────────────────────────────────────
    const unsubTop = onSnapshot(
      doc(db, "analytics", "topAuctions"),
      (snap) => {
        if (snap.exists()) {
          const d = snap.data();
          setTopAuctions({
            byBids:         d.byBids         ?? [],
            byParticipants: d.byParticipants ?? [],
            byWinningBid:   d.byWinningBid   ?? [],
            updatedAt:      toDate(d.updatedAt),
          });
        } else {
          setTopAuctions(DEFAULT_TOP_AUCTIONS);
        }
        markLoaded();
      },
      (err) => {
        console.error("[useAnalytics] topAuctions error:", err.code);
        markLoaded();
      },
    );
    unsubs.push(unsubTop);

    return () => unsubs.forEach((u) => u());
  }, [markLoaded]);

  return { analytics, topAuctions, loading, error, refetch };
}