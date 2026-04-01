/**
 * functions/src/Analytics/analytics.ts
 *
 * Maintains the analytics/dashboard and analytics/topAuctions documents.
 *
 * ─── Architecture ─────────────────────────────────────────────────────────────
 * Instead of scanning large collections on every dashboard load, we maintain
 * two lightweight aggregation documents that are updated by triggers.
 *
 * Firestore paths:
 *   analytics/dashboard    — all scalar metrics (counts, sums, averages)
 *   analytics/topAuctions  — ranked top-N auction lists + full financialReport
 *
 * ─── Triggers ────────────────────────────────────────────────────────────────
 * 1. onUserWritten           — updates user / admin counts
 * 2. onProductWritten        — updates product counts, inventory totals
 * 3. onAuctionWritten        — updates auction counts, financial metrics
 * 4. onCategoryWritten       — updates category count
 * 5. onVoucherWritten        — updates voucher count
 * 6. onAuctionRequestWritten — updates request count
 * 7. onFeedbackWritten       — updates average rating (incremental, no collection scan)
 * 8. rebuildAnalytics        — HTTP callable, full rebuild (run once on deploy)
 *
 * ─── Cost model ──────────────────────────────────────────────────────────────
 * Dashboard reads : 2 documents (analytics/dashboard + analytics/topAuctions)
 * Writes          : 1-2 documents per mutation event (near zero marginal cost)
 *
 * ─── Key design decisions ────────────────────────────────────────────────────
 * • avgWinningBid    — NOT stored; derived client-side as totalRevenue/endedAuctions
 *                      to eliminate the concurrency race on concurrent resolutions.
 * • ratingSum        — stored alongside totalRatings so avgRating can be recomputed
 *                      incrementally without scanning the feedbackMessages collection.
 * • actualProfit     — winningBid - actualPrice, stored on each financialReport entry
 *                      so the client never has to recompute it.
 * • financialReport  — ALL ended auctions with a winner, sorted by winningBid desc,
 *                      stored on analytics/topAuctions. Not capped at TOP_N so the
 *                      admin can paginate through the full history.
 * • onAuctionWritten short-circuit — exits after 1 write when only totalBids
 *                    changed (the most frequent trigger path — every bid placed).
 * • product read     — fetched exactly once per auction resolution and passed into
 *                      updateTopAuctions so the doc is never read twice.
 */

import { onDocumentWritten } from "firebase-functions/v2/firestore";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, FieldValue, Timestamp } from "firebase-admin/firestore";

const db          = getFirestore();
const ANALYTICS   = "analytics";
const DASHBOARD   = "dashboard";
const TOP_AUCTIONS = "topAuctions";
const TOP_N       = 5;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function delta(before: any, after: any, field: string): number {
  const prev = before?.[field] ?? 0;
  const curr = after?.[field]  ?? 0;
  return curr - prev;
}

function wasCreated(before: any, after: any): boolean {
  return !before && !!after;
}

function wasDeleted(before: any, after: any): boolean {
  return !!before && !after;
}

// ─── 1. User written ──────────────────────────────────────────────────────────

export const onUserWritten = onDocumentWritten(
  { document: "users/{uid}", memory: "256MiB" },
  async (event) => {
    const before = event.data?.before.data();
    const after  = event.data?.after.data();

    const ref     = db.collection(ANALYTICS).doc(DASHBOARD);
    const updates: Record<string, any> = { updatedAt: FieldValue.serverTimestamp() };

    if (wasCreated(before, after)) {
      const role = after?.role ?? "user";
      updates.totalUsers       = FieldValue.increment(role === "user"       ? 1 : 0);
      updates.totalAdmins      = FieldValue.increment(role === "admin"      ? 1 : 0);
      updates.totalSuperAdmins = FieldValue.increment(role === "superAdmin" ? 1 : 0);
      if (!after?.isBlocked) updates.activeUsers   = FieldValue.increment(role === "user" ? 1 : 0);
      else                   updates.inactiveUsers = FieldValue.increment(role === "user" ? 1 : 0);

    } else if (wasDeleted(before, after)) {
      const role = before?.role ?? "user";
      updates.totalUsers       = FieldValue.increment(role === "user"       ? -1 : 0);
      updates.totalAdmins      = FieldValue.increment(role === "admin"      ? -1 : 0);
      updates.totalSuperAdmins = FieldValue.increment(role === "superAdmin" ? -1 : 0);
      if (!before?.isBlocked) updates.activeUsers   = FieldValue.increment(role === "user" ? -1 : 0);
      else                    updates.inactiveUsers = FieldValue.increment(role === "user" ? -1 : 0);

    } else {
      // Update — only care about isBlocked toggle on regular users
      const wasBlocked    = before?.isBlocked ?? false;
      const isBlocked     = after?.isBlocked  ?? false;
      const isRegularUser = (after?.role ?? "user") === "user";

      if (wasBlocked !== isBlocked && isRegularUser) {
        if (isBlocked) {
          updates.activeUsers   = FieldValue.increment(-1);
          updates.inactiveUsers = FieldValue.increment(1);
        } else {
          updates.activeUsers   = FieldValue.increment(1);
          updates.inactiveUsers = FieldValue.increment(-1);
        }
      }
    }

    await ref.set(updates, { merge: true });
  },
);

// ─── 2. Product written ───────────────────────────────────────────────────────

export const onProductWritten = onDocumentWritten(
  { document: "products/{productId}", memory: "256MiB" },
  async (event) => {
    const before = event.data?.before.data();
    const after  = event.data?.after.data();

    const ref     = db.collection(ANALYTICS).doc(DASHBOARD);
    const updates: Record<string, any> = { updatedAt: FieldValue.serverTimestamp() };

    if (wasCreated(before, after)) {
      updates.totalProducts       = FieldValue.increment(1);
      updates.activeProducts      = FieldValue.increment(after?.isActive ? 1 : 0);
      updates.inactiveProducts    = FieldValue.increment(after?.isActive ? 0 : 1);
      updates.totalInventory      = FieldValue.increment(after?.quantity ?? 0);
      updates.totalInventoryValue = FieldValue.increment(
        (after?.actualPrice ?? 0) * (after?.quantity ?? 0),
      );

    } else if (wasDeleted(before, after)) {
      updates.totalProducts       = FieldValue.increment(-1);
      updates.activeProducts      = FieldValue.increment(before?.isActive ? -1 : 0);
      updates.inactiveProducts    = FieldValue.increment(before?.isActive ?  0 : -1);
      updates.totalInventory      = FieldValue.increment(-(before?.quantity ?? 0));
      updates.totalInventoryValue = FieldValue.increment(
        -((before?.actualPrice ?? 0) * (before?.quantity ?? 0)),
      );

    } else {
      // Quantity / price delta
      const qtyDelta = delta(before, after, "quantity");
      if (qtyDelta !== 0) {
        updates.totalInventory      = FieldValue.increment(qtyDelta);
        updates.totalInventoryValue = FieldValue.increment(
          (after?.actualPrice ?? 0) * qtyDelta,
        );
      }
      // isActive flip
      if ((before?.isActive ?? true) !== (after?.isActive ?? true)) {
        if (after?.isActive) {
          updates.activeProducts   = FieldValue.increment(1);
          updates.inactiveProducts = FieldValue.increment(-1);
        } else {
          updates.activeProducts   = FieldValue.increment(-1);
          updates.inactiveProducts = FieldValue.increment(1);
        }
      }
    }

    await ref.set(updates, { merge: true });
  },
);

// ─── 3. Auction written ───────────────────────────────────────────────────────

export const onAuctionWritten = onDocumentWritten(
  { document: "auctions/{auctionId}", memory: "512MiB", timeoutSeconds: 60 },
  async (event) => {
    const before    = event.data?.before.data();
    const after     = event.data?.after.data();
    const auctionId = event.params.auctionId;

    const ref = db.collection(ANALYTICS).doc(DASHBOARD);

    // ── Short-circuit: only totalBids changed (fires on every bid placed) ─────
    // Most common trigger path. Skips all branching logic and exits after 1 write.
    const onlyBidsChanged =
      before &&
      after &&
      (before.totalBids  ?? 0) !== (after.totalBids  ?? 0) &&
      before.isActive    === after.isActive    &&
      before.winnerId    === after.winnerId    &&
      before.winningBid  === after.winningBid;

    if (onlyBidsChanged) {
      const bidDelta = delta(before, after, "totalBids");
      await ref.set(
        { totalBids: FieldValue.increment(bidDelta), updatedAt: FieldValue.serverTimestamp() },
        { merge: true },
      );
      return;
    }

    // ── Full update path ──────────────────────────────────────────────────────
    const updates: Record<string, any> = { updatedAt: FieldValue.serverTimestamp() };

    // Count / active-state changes
    if (wasCreated(before, after)) {
      updates.totalAuctions    = FieldValue.increment(1);
      updates.activeAuctions   = FieldValue.increment(after?.isActive ? 1 : 0);
      updates.inactiveAuctions = FieldValue.increment(after?.isActive ? 0 : 1);

    } else if (wasDeleted(before, after)) {
      updates.totalAuctions    = FieldValue.increment(-1);
      updates.activeAuctions   = FieldValue.increment(before?.isActive ? -1 :  0);
      updates.inactiveAuctions = FieldValue.increment(before?.isActive ?  0 : -1);

    } else {
      // isActive flip
      if ((before?.isActive ?? true) !== (after?.isActive ?? true)) {
        if (after?.isActive) {
          updates.activeAuctions   = FieldValue.increment(1);
          updates.inactiveAuctions = FieldValue.increment(-1);
        } else {
          updates.activeAuctions   = FieldValue.increment(-1);
          updates.inactiveAuctions = FieldValue.increment(1);
        }
      }
    }

    // Bid count delta (residual — not caught by short-circuit above)
    const bidDelta = delta(before, after, "totalBids");
    if (bidDelta !== 0) updates.totalBids = FieldValue.increment(bidDelta);

    // ── Winner / financial update — fires exactly once per auction resolution ─
    const justResolved =
      !before?.winnerId &&
      !!after?.winnerId &&
      after.winnerId !== "NO_WINNER";

    if (justResolved && after) {
      const winningBid = after.winningBid ?? 0;

      // Atomically increment both — these are the source of truth.
      // avgWinningBid is derived client-side (totalRevenue / endedAuctions)
      // so it is intentionally NOT stored here.
      updates.totalRevenue  = FieldValue.increment(winningBid);
      updates.endedAuctions = FieldValue.increment(1);

      // Single dashboard read — needed for highestWinningBid and avgMargin only
      const dashSnap = await ref.get();
      const dashData  = dashSnap.exists ? (dashSnap.data() ?? {}) : {};

      // highestWinningBid — last-write-wins is acceptable here
      const currentHighest = dashData.highestWinningBid ?? 0;
      if (winningBid > currentHighest) {
        updates.highestWinningBid = winningBid;
      }

      // Fetch product ONCE — passed to updateTopAuctions to avoid a second read
      const productId = after.productId as string | undefined;
      let productTitle = "Unknown Product";
      let actualPrice  = 0;

      if (productId) {
        try {
          const productSnap = await db.collection("products").doc(productId).get();
          if (productSnap.exists) {
            productTitle = productSnap.data()?.title       ?? "Unknown Product";
            actualPrice  = productSnap.data()?.actualPrice ?? 0;
          }
        } catch {
          // Non-fatal — defaults are already set above
        }
      }

      // avgMargin — running average using pre-read dashboard state
      // endedCount is +1 because the FieldValue.increment hasn't been committed yet
      if (actualPrice > 0) {
        const endedCount       = (dashData.endedAuctions ?? 0) + 1;
        const margin           = ((winningBid - actualPrice) / actualPrice) * 100;
        const currentAvgMargin = dashData.avgMargin ?? 0;
        updates.avgMargin      =
          (currentAvgMargin * (endedCount - 1) + margin) / endedCount;
      }

      // Update top-auctions list — product data already fetched, no second read
      await updateTopAuctions(auctionId, after, productTitle, actualPrice);
    }

    await ref.set(updates, { merge: true });
  },
);

// ─── Helper: update topAuctions document ─────────────────────────────────────
// productTitle and actualPrice are passed in from onAuctionWritten so the
// product document is never read twice for the same auction resolution.

async function updateTopAuctions(
  auctionId:    string,
  auctionData:  any,
  productTitle: string,
  actualPrice:  number,
): Promise<void> {
  try {
    const winningBid = auctionData.winningBid ?? 0;
    const margin     = actualPrice > 0
      ? ((winningBid - actualPrice) / actualPrice) * 100
      : 0;
    // actualProfit: the real EGP profit amount (not just percentage)
    const actualProfit = actualPrice > 0 ? winningBid - actualPrice : 0;

    // Resolve winner name
    let winnerName = "Unknown";
    const winnerId = auctionData.winnerId as string | undefined;
    if (winnerId && winnerId !== "NO_WINNER") {
      try {
        const userSnap = await db.collection("users").doc(winnerId).get();
        if (userSnap.exists) {
          const u = userSnap.data()!;
          winnerName =
            (u.fullName ??
              u.displayName ??
              `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim()) ||
            "Unknown";
        }
      } catch {
        // Non-fatal
      }
    }

    const entry = {
      auctionId,
      auctionNumber:     auctionData.auctionNumber     ?? 0,
      productTitle,
      totalBids:         auctionData.totalBids         ?? 0,
      totalParticipants: auctionData.totalParticipants ?? 0,
      winningBid,
      actualPrice,
      actualProfit,
      margin,
      winnerId:   winnerId ?? "",
      winnerName,
    };

    const topRef   = db.collection(ANALYTICS).doc(TOP_AUCTIONS);
    const topSnap  = await topRef.get();
    const existing = topSnap.exists
      ? topSnap.data()!
      : { byBids: [], byParticipants: [], byWinningBid: [], financialReport: [] };

    const upsert = (arr: any[], newEntry: any, sortKey: string) =>
      [...(arr ?? []).filter((a: any) => a.auctionId !== newEntry.auctionId), newEntry]
        .sort((a, b) => b[sortKey] - a[sortKey])
        .slice(0, TOP_N);

    // financialReport: ALL ended auctions with a real winner, sorted by winningBid desc
    // No slice — this is the full history used for the paginated financial table
    const upsertAll = (arr: any[], newEntry: any, sortKey: string) =>
      [...(arr ?? []).filter((a: any) => a.auctionId !== newEntry.auctionId), newEntry]
        .sort((a, b) => b[sortKey] - a[sortKey]);

    await topRef.set({
      byBids:          upsert(existing.byBids,         entry, "totalBids"),
      byParticipants:  upsert(existing.byParticipants, entry, "totalParticipants"),
      byWinningBid:    upsert(existing.byWinningBid,   entry, "winningBid"),
      financialReport: upsertAll(existing.financialReport ?? [], entry, "winningBid"),
      updatedAt:       FieldValue.serverTimestamp(),
    });
  } catch (err) {
    console.error("[Analytics] updateTopAuctions failed:", err);
  }
}

// ─── 4. Category written ──────────────────────────────────────────────────────

export const onCategoryWritten = onDocumentWritten(
  { document: "categories/{categoryId}", memory: "256MiB" },
  async (event) => {
    const before = event.data?.before.data();
    const after  = event.data?.after.data();
    if (wasCreated(before, after)) {
      await db.collection(ANALYTICS).doc(DASHBOARD).set(
        { totalCategories: FieldValue.increment(1), updatedAt: FieldValue.serverTimestamp() },
        { merge: true },
      );
    } else if (wasDeleted(before, after)) {
      await db.collection(ANALYTICS).doc(DASHBOARD).set(
        { totalCategories: FieldValue.increment(-1), updatedAt: FieldValue.serverTimestamp() },
        { merge: true },
      );
    }
  },
);

// ─── 5. Voucher written ───────────────────────────────────────────────────────

export const onVoucherWritten = onDocumentWritten(
  { document: "vouchers/{voucherId}", memory: "256MiB" },
  async (event) => {
    const before = event.data?.before.data();
    const after  = event.data?.after.data();
    if (wasCreated(before, after)) {
      await db.collection(ANALYTICS).doc(DASHBOARD).set(
        { totalVouchers: FieldValue.increment(1), updatedAt: FieldValue.serverTimestamp() },
        { merge: true },
      );
    } else if (wasDeleted(before, after)) {
      await db.collection(ANALYTICS).doc(DASHBOARD).set(
        { totalVouchers: FieldValue.increment(-1), updatedAt: FieldValue.serverTimestamp() },
        { merge: true },
      );
    }
  },
);

// ─── 6. Auction Request written ───────────────────────────────────────────────

export const onAuctionRequestWritten = onDocumentWritten(
  { document: "AuctionRequests/{requestId}", memory: "256MiB" },
  async (event) => {
    const before = event.data?.before.data();
    const after  = event.data?.after.data();
    if (wasCreated(before, after)) {
      await db.collection(ANALYTICS).doc(DASHBOARD).set(
        { totalAuctionRequests: FieldValue.increment(1), updatedAt: FieldValue.serverTimestamp() },
        { merge: true },
      );
    } else if (wasDeleted(before, after)) {
      await db.collection(ANALYTICS).doc(DASHBOARD).set(
        { totalAuctionRequests: FieldValue.increment(-1), updatedAt: FieldValue.serverTimestamp() },
        { merge: true },
      );
    }
  },
);

// ─── 7. Feedback written (ratings) ───────────────────────────────────────────

export const onFeedbackWritten = onDocumentWritten(
  { document: "feedbackMessages/{feedbackId}", memory: "256MiB" },
  async (event) => {
    const before = event.data?.before.data();
    const after  = event.data?.after.data();

    const ref     = db.collection(ANALYTICS).doc(DASHBOARD);
    const updates: Record<string, any> = { updatedAt: FieldValue.serverTimestamp() };

    if (wasCreated(before, after)) {
      const rating = after?.rating as number | undefined;
      if (typeof rating === "number" && rating > 0) {
        updates.totalRatings = FieldValue.increment(1);
        updates.ratingSum    = FieldValue.increment(rating);
      } else {
        return;
      }

    } else if (wasDeleted(before, after)) {
      const rating = before?.rating as number | undefined;
      if (typeof rating === "number" && rating > 0) {
        updates.totalRatings = FieldValue.increment(-1);
        updates.ratingSum    = FieldValue.increment(-rating);
      } else {
        return;
      }

    } else {
      const oldRating = before?.rating as number | undefined;
      const newRating = after?.rating  as number | undefined;
      if (oldRating === newRating) return;
      updates.ratingSum = FieldValue.increment((newRating ?? 0) - (oldRating ?? 0));
    }

    await ref.set(updates, { merge: true });

    const dash  = await ref.get();
    const sum   = dash.data()?.ratingSum    ?? 0;
    const count = dash.data()?.totalRatings ?? 0;
    await ref.set(
      { avgRating: count > 0 ? Math.round((sum / count) * 10) / 10 : 0 },
      { merge: true },
    );
  },
);

// ─── 8. Full rebuild (HTTP callable — run once on deploy or to fix drift) ─────

export const rebuildAnalytics = onCall(
  { timeoutSeconds: 300, memory: "512MiB" },
  async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Must be signed in.");

    const callerSnap = await db.collection("users").doc(request.auth.uid).get();
    if (callerSnap.data()?.role !== "superAdmin") {
      throw new HttpsError("permission-denied", "Only superAdmins can rebuild analytics.");
    }

    const [
      usersSnap, productsSnap, auctionsSnap,
      categoriesSnap, vouchersSnap, requestsSnap, feedbackSnap,
    ] = await Promise.all([
      db.collection("users").get(),
      db.collection("products").get(),
      db.collection("auctions").get(),
      db.collection("categories").get(),
      db.collection("vouchers").get(),
      db.collection("AuctionRequests").get(),
      db.collection("feedbackMessages").get(),
    ]);

    // ── Users ─────────────────────────────────────────────────────────────────
    let totalUsers = 0, activeUsers = 0, inactiveUsers = 0;
    let totalAdmins = 0, totalSuperAdmins = 0;

    for (const d of usersSnap.docs) {
      const u = d.data();
      if (u.role === "admin")      { totalAdmins++;      continue; }
      if (u.role === "superAdmin") { totalSuperAdmins++; continue; }
      totalUsers++;
      if (u.isBlocked) inactiveUsers++;
      else             activeUsers++;
    }

    // ── Products ──────────────────────────────────────────────────────────────
    let totalProducts = 0, activeProducts = 0, inactiveProducts = 0;
    let totalInventory = 0, totalInventoryValue = 0;

    for (const d of productsSnap.docs) {
      const p   = d.data();
      const qty = p.quantity    ?? 0;
      const ap  = p.actualPrice ?? 0;
      totalProducts++;
      totalInventory      += qty;
      totalInventoryValue += ap * qty;
      if (p.isActive) activeProducts++;
      else            inactiveProducts++;
    }

    // ── Auctions ──────────────────────────────────────────────────────────────
    let totalAuctions = 0, liveAuctions = 0, upcomingAuctions = 0, endedAuctions = 0;
    let activeAuctions = 0, inactiveAuctions = 0;
    let totalBids = 0, highestWinningBid = 0, totalRevenue = 0;
    let marginSum = 0, marginCount = 0;
    const topEntries: any[] = [];

    // Build lookup maps from already-fetched snaps — zero extra reads
    const productMap: Record<string, any> = {};
    for (const d of productsSnap.docs) productMap[d.id] = d.data();

    const userMap: Record<string, string> = {};
    for (const d of usersSnap.docs) {
      const u = d.data();
      userMap[d.id] =
        (u.fullName ?? u.displayName ??
          `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim()) || "Unknown";
    }

    const now = new Date();
    for (const d of auctionsSnap.docs) {
      const a = d.data();
      totalAuctions++;
      totalBids += a.totalBids ?? 0;
      if (a.isActive) activeAuctions++; else inactiveAuctions++;

      const startTime = a.startTime instanceof Timestamp
        ? a.startTime.toDate() : new Date(a.startTime);
      const endTime = a.endTime instanceof Timestamp
        ? a.endTime.toDate()   : new Date(a.endTime);

      if      (now < startTime) upcomingAuctions++;
      else if (now <= endTime)  liveAuctions++;
      else {
        endedAuctions++;
        const wb = a.winningBid ?? 0;
        if (wb > 0) {
          totalRevenue += wb;
          if (wb > highestWinningBid) highestWinningBid = wb;

          const product = productMap[a.productId];
          const ap      = product?.actualPrice ?? 0;
          if (ap > 0) {
            const margin = ((wb - ap) / ap) * 100;
            marginSum  += margin;
            marginCount++;
          }

          topEntries.push({
            auctionId:         d.id,
            auctionNumber:     a.auctionNumber     ?? 0,
            productTitle:      product?.title       ?? "Unknown",
            totalBids:         a.totalBids          ?? 0,
            totalParticipants: a.totalParticipants  ?? 0,
            winningBid:        wb,
            actualPrice:       product?.actualPrice ?? 0,
            actualProfit:      (product?.actualPrice ?? 0) > 0 ? wb - (product?.actualPrice ?? 0) : 0,
            margin:            (product?.actualPrice ?? 0) > 0
                                 ? ((wb - (product?.actualPrice ?? 0)) / (product?.actualPrice ?? 0)) * 100
                                 : 0,
            winnerId:          a.winnerId            ?? "",
            winnerName:        userMap[a.winnerId ?? ""] ?? "Unknown",
          });
        }
      }
    }

    const avgMargin = marginCount > 0 ? marginSum / marginCount : 0;

    // ── Ratings ───────────────────────────────────────────────────────────────
    const validRatings = feedbackSnap.docs
      .map((d) => d.data().rating as number)
      .filter((r) => typeof r === "number" && r > 0);

    const ratingSum = validRatings.reduce((a, b) => a + b, 0);
    const avgRating = validRatings.length > 0
      ? Math.round((ratingSum / validRatings.length) * 10) / 10
      : 0;

    // ── Write analytics/dashboard ─────────────────────────────────────────────
    const dashboard = {
      totalUsers,        activeUsers,       inactiveUsers,
      totalAdmins,       totalSuperAdmins,
      totalCategories:   categoriesSnap.size,
      totalProducts,     activeProducts,    inactiveProducts,
      totalInventory,    totalInventoryValue,
      totalAuctions,     liveAuctions,      upcomingAuctions,  endedAuctions,
      activeAuctions,    inactiveAuctions,
      totalBids,         highestWinningBid,
      totalVouchers:     vouchersSnap.size,
      totalAuctionRequests: requestsSnap.size,
      avgRating,         totalRatings: validRatings.length,    ratingSum,
      totalRevenue,      avgMargin,
      updatedAt:         FieldValue.serverTimestamp(),
    };

    await db.collection(ANALYTICS).doc(DASHBOARD).set(dashboard);

    // ── Write analytics/topAuctions ───────────────────────────────────────────
    const sortAndSlice = (arr: any[], key: string) =>
      [...arr].sort((a, b) => b[key] - a[key]).slice(0, TOP_N);

    const sortAll = (arr: any[], key: string) =>
      [...arr].sort((a, b) => b[key] - a[key]);

    await db.collection(ANALYTICS).doc(TOP_AUCTIONS).set({
      byBids:          sortAndSlice(topEntries, "totalBids"),
      byParticipants:  sortAndSlice(topEntries, "totalParticipants"),
      byWinningBid:    sortAndSlice(topEntries, "winningBid"),
      financialReport: sortAll(topEntries, "winningBid"),   // ALL entries, no cap
      updatedAt:       FieldValue.serverTimestamp(),
    });

    return { success: true, updatedAt: new Date().toISOString() };
  },
);