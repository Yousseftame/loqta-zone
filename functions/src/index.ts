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