/**
 * auth.ts — Firebase Cloud Functions for auth / role management
 *
 * Functions exported:
 *  1. onUserCreated   — Triggered when a new user registers; sets default custom claim role="user"
 *  2. setUserRole     — Callable function (admin only) to change a user's role
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { auth as functionsAuth } from "firebase-functions/v1";

// Make sure admin is initialized (it's shared from index.ts)
const db = getFirestore();
const firebaseAuth = getAuth();

type UserRole = "user" | "admin" | "superAdmin";

// ─────────────────────────────────────────────────────────────────────────────
// 1. onUserCreated
//    Fires when Firebase Auth creates a new user.
//    Sets custom claim { role: "user" } and ensures Firestore doc exists.
// ─────────────────────────────────────────────────────────────────────────────
export const onUserCreated = functionsAuth.user().onCreate(async (user) => {
  try {
    // Set default custom claim
    await firebaseAuth.setCustomUserClaims(user.uid, { role: "user" });

    // Upsert Firestore doc — the client may have already created it,
    // but this is a safety net with merge: true
    const userRef = db.collection("users").doc(user.uid);
    await userRef.set(
      {
        email: user.email ?? "",
        role: "user",
        isBlocked: false,
        verified: false,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    console.log(`[onUserCreated] Set role=user for uid=${user.uid}`);
  } catch (error) {
    console.error("[onUserCreated] Error:", error);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. setUserRole  (callable — must be called by an authenticated superAdmin)
//
//    Request payload: { targetUid: string; role: UserRole }
//    - Updates Firebase Auth custom claims
//    - Updates Firestore users/{targetUid}.role
// ─────────────────────────────────────────────────────────────────────────────
export const setUserRole = onCall(async (request) => {
  // 1. Verify caller is authenticated
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "You must be signed in.");
  }

  // 2. Verify caller has superAdmin claim
  const callerClaims = request.auth.token;
  if (callerClaims.role !== "superAdmin") {
    throw new HttpsError(
      "permission-denied",
      "Only superAdmins can assign roles."
    );
  }

  // 3. Validate payload
  const { targetUid, role } = request.data as {
    targetUid: string;
    role: UserRole;
  };

  const validRoles: UserRole[] = ["user", "admin", "superAdmin"];
  if (!targetUid || !validRoles.includes(role)) {
    throw new HttpsError(
      "invalid-argument",
      `targetUid and a valid role (${validRoles.join(", ")}) are required.`
    );
  }

  // 4. Set custom claims on Firebase Auth
  await firebaseAuth.setCustomUserClaims(targetUid, { role });

  // 5. Update Firestore doc
  await db.collection("users").doc(targetUid).update({
    role,
    updatedAt: FieldValue.serverTimestamp(),
  });

  console.log(
    `[setUserRole] uid=${targetUid} role set to "${role}" by superAdmin uid=${request.auth.uid}`
  );

  return { success: true, message: `Role "${role}" assigned to user ${targetUid}.` };
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. blockUser  (callable — admin or superAdmin)
//
//    Request payload: { targetUid: string; isBlocked: boolean }
// ─────────────────────────────────────────────────────────────────────────────
export const blockUser = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "You must be signed in.");
  }

  const callerRole = request.auth.token.role as UserRole;
  if (callerRole !== "admin" && callerRole !== "superAdmin") {
    throw new HttpsError("permission-denied", "Insufficient permissions.");
  }

  const { targetUid, isBlocked } = request.data as {
    targetUid: string;
    isBlocked: boolean;
  };

  if (!targetUid || typeof isBlocked !== "boolean") {
    throw new HttpsError("invalid-argument", "targetUid and isBlocked (boolean) are required.");
  }

  // Disable / enable the Firebase Auth account
  await firebaseAuth.updateUser(targetUid, { disabled: isBlocked });

  // Update Firestore
  await db.collection("users").doc(targetUid).update({
    isBlocked,
    updatedAt: FieldValue.serverTimestamp(),
  });

  console.log(
    `[blockUser] uid=${targetUid} isBlocked=${isBlocked} by uid=${request.auth.uid}`
  );

  return { success: true };
});