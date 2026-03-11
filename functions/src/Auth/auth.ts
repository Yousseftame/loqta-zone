/**
 * auth.ts — Firebase Cloud Functions for auth / role management
 *
 * KEY FIX vs previous version:
 *  - blockUser and deleteUser now verify the caller's role by reading their
 *    Firestore document (db.collection("users").doc(uid).get()) instead of
 *    checking request.auth.token.role (JWT custom claim).
 *
 *  WHY: Custom claims are embedded in the JWT at login time. They are NOT
 *  updated automatically when you change a user's role — the user must log out
 *  and back in to get a new token. This means an admin promoted in Firestore
 *  but still holding an old JWT token with role="user" would get a 403 on
 *  every Cloud Function call that checks request.auth.token.role.
 *
 *  FIX: Read the role from Firestore server-side inside the function. This is
 *  always current. Cost: 1 extra Firestore read per call — acceptable for admin ops.
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { auth as functionsAuth } from "firebase-functions/v1";

const db = getFirestore();
const firebaseAuth = getAuth();

type UserRole = "user" | "admin" | "superAdmin";

// ─── Helper: get caller's role from Firestore ─────────────────────────────────
// This is always current — not stale like JWT claims.

async function getCallerRole(uid: string): Promise<UserRole> {
  const snap = await db.collection("users").doc(uid).get();
  if (!snap.exists) return "user";
  return (snap.data()?.role as UserRole) ?? "user";
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. onUserCreated
// ─────────────────────────────────────────────────────────────────────────────
export const onUserCreated = functionsAuth.user().onCreate(async (user) => {
  try {
    await firebaseAuth.setCustomUserClaims(user.uid, { role: "user" });

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
// 2. setUserRole  (superAdmin only)
// ─────────────────────────────────────────────────────────────────────────────
export const setUserRole = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "You must be signed in.");
  }

  // Check Firestore role — not JWT claim
  const callerRole = await getCallerRole(request.auth.uid);
  if (callerRole !== "superAdmin") {
    throw new HttpsError("permission-denied", "Only superAdmins can assign roles.");
  }

  const { targetUid, role } = request.data as { targetUid: string; role: UserRole };
  const validRoles: UserRole[] = ["user", "admin", "superAdmin"];

  if (!targetUid || !validRoles.includes(role)) {
    throw new HttpsError("invalid-argument", `targetUid and a valid role are required.`);
  }

  // Update Firebase Auth custom claims
  await firebaseAuth.setCustomUserClaims(targetUid, { role });

  // Update Firestore
  await db.collection("users").doc(targetUid).update({
    role,
    updatedAt: FieldValue.serverTimestamp(),
  });

  console.log(`[setUserRole] uid=${targetUid} → role="${role}" by uid=${request.auth.uid}`);
  return { success: true };
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. blockUser  (admin or superAdmin — checks Firestore role, not JWT)
// ─────────────────────────────────────────────────────────────────────────────
export const blockUser = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "You must be signed in.");
  }

  // ✅ Read from Firestore — always current, not stale JWT
  const callerRole = await getCallerRole(request.auth.uid);
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

  // Prevent admins from blocking other admins/superAdmins
  const targetRole = await getCallerRole(targetUid);
  if (targetRole === "superAdmin" && callerRole !== "superAdmin") {
    throw new HttpsError("permission-denied", "Admins cannot block superAdmins.");
  }
  if (targetRole === "admin" && callerRole === "admin") {
    throw new HttpsError("permission-denied", "Admins cannot block other admins.");
  }

  // Disable / enable Firebase Auth account
  await firebaseAuth.updateUser(targetUid, { disabled: isBlocked });

  // Update Firestore
  await db.collection("users").doc(targetUid).update({
    isBlocked,
    updatedAt: FieldValue.serverTimestamp(),
  });

  console.log(`[blockUser] uid=${targetUid} isBlocked=${isBlocked} by uid=${request.auth.uid}`);
  return { success: true };
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. deleteUser  (admin or superAdmin — checks Firestore role, not JWT)
// ─────────────────────────────────────────────────────────────────────────────
export const deleteUser = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "You must be signed in.");
  }

  // ✅ Read from Firestore — always current
  const callerRole = await getCallerRole(request.auth.uid);
  if (callerRole !== "admin" && callerRole !== "superAdmin") {
    throw new HttpsError("permission-denied", "Insufficient permissions.");
  }

  const { targetUid } = request.data as { targetUid: string };

  if (!targetUid) {
    throw new HttpsError("invalid-argument", "targetUid is required.");
  }

  // Prevent deleting superAdmins unless you are one
  const targetRole = await getCallerRole(targetUid);
  if (targetRole === "superAdmin" && callerRole !== "superAdmin") {
    throw new HttpsError("permission-denied", "Cannot delete a superAdmin account.");
  }

  // 1. Delete Firebase Auth account
  try {
    await firebaseAuth.deleteUser(targetUid);
  } catch (err: any) {
    if (err.code !== "auth/user-not-found") {
      throw new HttpsError("internal", `Failed to delete Auth account: ${err.message}`);
    }
    // user-not-found is fine — continue to delete Firestore doc
  }

  // 2. Delete Firestore document
  await db.collection("users").doc(targetUid).delete();

  console.log(`[deleteUser] uid=${targetUid} deleted by uid=${request.auth.uid}`);
  return { success: true };
});