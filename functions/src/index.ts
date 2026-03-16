/**
 * functions/src/index.ts
 *
 * Firebase Cloud Functions entry point.
 * Admin SDK is initialized once here; all functions are imported from sub-files.
 */

import * as admin from "firebase-admin";
import { setGlobalOptions } from "firebase-functions";

if (!admin.apps.length) {
  admin.initializeApp();
}

setGlobalOptions({ maxInstances: 10 });

// ── Auth / Role management ───────────────────────────────────────────────────
export { onUserCreated, setUserRole, blockUser, deleteUser, createAdminAccount } from "./Auth/auth";
// ── Notifications ────────────────────────────────────────────────────────────
export { onAuctionRequestUpdated } from "./Notifications/notifications";

// ── Auction winner resolution ─────────────────────────────────────────────────
// triggerResolveAuction — HTTP callable, fired by frontend countdown (PRIMARY path)
// onBidWritten          — Firestore trigger, handles last-second bid edge case
// resolveAuctionWinners — Scheduled safety net every 10 min (fallback only)
export { triggerResolveAuction, onBidWritten, resolveAuctionWinners } from "./Auctions/auctionWinner";


// ── Analytics ────────────────────────────────────────────────────────────

export { onUserWritten, onProductWritten, onAuctionWritten,
         onCategoryWritten, onVoucherWritten, onAuctionRequestWritten,
         onFeedbackWritten, rebuildAnalytics } from "./Analytics/analytics";

