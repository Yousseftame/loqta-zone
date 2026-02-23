/**
 * Firebase Cloud Functions — index.ts
 *
 * All function logic lives in separate files; we just import and export here.
 */

import * as admin from "firebase-admin";
import { setGlobalOptions } from "firebase-functions";

// Initialize Firebase Admin SDK once
if (!admin.apps.length) {
  admin.initializeApp();
}

setGlobalOptions({ maxInstances: 10 });

// ── Auth / Role functions ────────────────────────────────────────────────────
export { onUserCreated, setUserRole, blockUser } from "./Auth/auth";