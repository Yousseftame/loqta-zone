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
export { onUserCreated, setUserRole, blockUser } from "./Auth/auth";

// ── Notifications ────────────────────────────────────────────────────────────
export { onAuctionRequestUpdated } from "./Notifications/notifications";

// ── Auction winner resolution ─────────────────────────────────────────────────
// onBidWritten          — Firestore trigger, fires on every bid write (~1s latency)
// resolveAuctionWinners — Scheduled safety net every 10 min (catches zero-bid auctions)
export { onBidWritten, resolveAuctionWinners } from "./Auctions/auctionWinner";