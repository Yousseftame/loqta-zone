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



// ── Last Offer — winner selected notification ─────────────────────────────────
// Fires when admin sets selectedbyAdmin=true + status="accepted" on a lastOffer doc.
// Sends in-app + FCM push to the selected user with a deep-link to confirm purchase.
export { onLastOfferSelected } from "./Notifications/lastOfferNotification";


// Bid selected by admin as winner → notify user + deep-link to confirm page
// (fires when selectedbyAdmin=true AND status="accepted" set on a bid doc)
export { onBidSelected } from "./Notifications/bidWinnerNotification";

export { onVoucherCreated } from "./Notifications/voucherNotification";



// ── Auction winner resolution ─────────────────────────────────────────────────
// triggerResolveAuction — HTTP callable, fired by frontend countdown (PRIMARY path)
// onBidWritten          — Firestore trigger, handles last-second bid edge case
// resolveAuctionWinners — Scheduled safety net every 10 min (fallback only)
export { triggerResolveAuction, onBidWritten, resolveAuctionWinners } from "./Auctions/auctionWinner";




// ── Analytics ────────────────────────────────────────────────────────────

export { onUserWritten, onProductWritten, onAuctionWritten,
         onCategoryWritten, onVoucherWritten, onAuctionRequestWritten,
         onFeedbackWritten, rebuildAnalytics } from "./Analytics/analytics";




 // ── Finance ──────────────────────────────────────────────────────────────────
        
export { onTransactionCreated, onTransactionDeleted, rebuildFinanceStats } from "./Finance/finance";


// ── Vouchers ──────────────────────────────────────────────────────────────────
// applyVoucher  — atomic transaction: validates + applies voucher in one shot
// validateVoucher — read-only pre-flight check for UI feedback
export { applyVoucher, validateVoucher } from "./Vouchers/voucherService";