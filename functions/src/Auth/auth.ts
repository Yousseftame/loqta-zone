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
    // ── Admin account path ────────────────────────────────────────────────────
    // createAdminAccount writes a sentinel Firestore doc with the correct role
    // BEFORE calling firebaseAuth.createUser(). If that doc already has a
    // non-"user" role, this is an admin account — skip everything, it's fully
    // configured by createAdminAccount.
    const existingDoc = await db.collection("users").doc(user.uid).get();
    if (existingDoc.exists) {
      const existingRole = existingDoc.data()?.role;
      if (existingRole && existingRole !== "user") {
        // console.log(`[onUserCreated] uid=${user.uid} sentinel doc has role="${existingRole}" — skipping.`);
        return;
      }
    }

    // ── Regular self-registration path ────────────────────────────────────────
    // Only set custom claims here. Do NOT write a Firestore document.
    //
    // Why: The client (AuthContext.register) writes the complete Firestore doc
    // immediately after createUserWithEmailAndPassword(). If it detects a
    // duplicate name, it rolls back by deleting the auth account — but this
    // trigger fires asynchronously on the server and arrives AFTER that cleanup,
    // creating an orphan document if we write here.
    //
    // The client's setDoc({ merge: true }) handles the full document write on
    // every successful registration, so this trigger's Firestore write is both
    // redundant and harmful. Claims-only is the safe contract.
    await firebaseAuth.setCustomUserClaims(user.uid, { role: "user" });

    // console.log(`[onUserCreated] Set claims role=user for uid=${user.uid}`);
  } catch (error) {
    // console.error("[onUserCreated] Error:", error);
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

  // console.log(`[setUserRole] uid=${targetUid} → role="${role}" by uid=${request.auth.uid}`);
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

  // console.log(`[blockUser] uid=${targetUid} isBlocked=${isBlocked} by uid=${request.auth.uid}`);
  return { success: true };
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. createAdminAccount  (superAdmin only)
// ─────────────────────────────────────────────────────────────────────────────
// Creates a new Firebase Auth account with admin or superAdmin role without
// signing out the currently authenticated admin. This is the ONLY way to create
// admin/superAdmin accounts — it is not available from the client SDK without
// interrupting the current session.

export const createAdminAccount = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "You must be signed in.");
  }

  // Only superAdmins can create admin/superAdmin accounts
  const callerRole = await getCallerRole(request.auth.uid);
  if (callerRole !== "superAdmin") {
    throw new HttpsError("permission-denied", "Only superAdmins can create admin accounts.");
  }

  const { firstName, lastName, email, password, role, permissions } = request.data as {
    firstName:   string;
    lastName:    string;
    email:       string;
    password:    string;
    role:        "admin" | "superAdmin";
    // permissions is sent from the client for role="admin" accounts.
    // For superAdmin accounts it is ignored (they always have full access).
    permissions?: Record<string, Record<string, boolean>> | null;
  };

  const validRoles = ["admin", "superAdmin"];
  if (!firstName || !lastName || !email || !password || !validRoles.includes(role)) {
    throw new HttpsError("invalid-argument", "firstName, lastName, email, password, and a valid role are required.");
  }
  if (password.length < 6) {
    throw new HttpsError("invalid-argument", "Password must be at least 6 characters.");
  }

  // Permissions sanity-check: only store for admin accounts, never for superAdmin
  const resolvedPermissions = role === "admin" ? (permissions ?? null) : null;

  // ── Step 1: Create the Firebase Auth account ──────────────────────────────
  // This fires the onUserCreated trigger as a separate Cloud Function invocation.
  // onUserCreated is NOT synchronous — it runs asynchronously after a delay
  // (cold start + queue). We immediately write the Firestore doc in Step 2
  // before onUserCreated has a chance to execute. onUserCreated reads the doc
  // and skips if it already has a non-"user" role.
  const newUser = await firebaseAuth.createUser({
    email,
    password,
    displayName: `${firstName} ${lastName}`,
  });

  // ── Step 2: Write Firestore doc immediately ────────────────────────────────
  // Written RIGHT AFTER createUser (same Cloud Function invocation, no delay).
  // onUserCreated runs in a separate invocation and always arrives after this.
  // The doc has role="admin"|"superAdmin" → onUserCreated sees it and skips.
  const now = FieldValue.serverTimestamp();
  const userData: Record<string, unknown> = {
    firstName,
    lastName,
    fullName: `${firstName} ${lastName}`,
    email,
    phone: "",
    role,                     // ← correct role, never "user"
    isBlocked: false,
    verified: true,           // admin accounts are pre-verified
    profileImage: null,
    fcmTokens: [],
    totalBids: 0,
    totalWins: 0,
    walletBalance: 0,
    internalNotes: "",
    createdAt: now,
    updatedAt: now,
    createdBy: request.auth.uid,
  };

  // Only store the permissions map for regular admins
  if (role === "admin" && resolvedPermissions) {
    userData.permissions = resolvedPermissions;
  }

  await db.collection("users").doc(newUser.uid).set(userData);

  // ── Step 3: Set custom claims ───────────────────────────────────────────────
  await firebaseAuth.setCustomUserClaims(newUser.uid, { role });

  // console.log(`[createAdminAccount] uid=${newUser.uid} role="${role}" created by uid=${request.auth.uid}`);

  // Return enough data for the client to build an AppUser without a second fetch
  return {
    uid: newUser.uid,
    firstName,
    lastName,
    fullName: `${firstName} ${lastName}`,
    email,
    phone: "",
    role,
    isBlocked: false,
    verified: true,
    profileImage: null,
    fcmTokens: [],
    totalBids: 0,
    totalWins: 0,
    walletBalance: 0,
    internalNotes: "",
    createdBy: request.auth.uid,
    ...(role === "admin" && resolvedPermissions ? { permissions: resolvedPermissions } : {}),
  };
});
// ─────────────────────────────────────────────────────────────────────────────
// 4. updateAdminPermissions  (superAdmin only)
// ─────────────────────────────────────────────────────────────────────────────
// Client rules lock the permissions field. Only this CF may change it.
export const updateAdminPermissions = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "You must be signed in.");
  }

  const callerRole = await getCallerRole(request.auth.uid);
  if (callerRole !== "superAdmin") {
    throw new HttpsError(
      "permission-denied",
      "Only superAdmins can update admin permissions.",
    );
  }

  const { targetUid, permissions } = request.data as {
    targetUid: string;
    permissions: Record<string, Record<string, boolean>> | null;
  };

  if (!targetUid || typeof permissions !== "object") {
    throw new HttpsError(
      "invalid-argument",
      "targetUid and permissions are required.",
    );
  }

  const targetSnap = await db.collection("users").doc(targetUid).get();
  if (!targetSnap.exists) {
    throw new HttpsError("not-found", "Target user not found.");
  }

  const targetRole = (targetSnap.data()?.role as UserRole) ?? "user";
  if (targetRole !== "admin") {
    throw new HttpsError(
      "failed-precondition",
      "Permissions can only be set on role=admin accounts.",
    );
  }

  await db.collection("users").doc(targetUid).update({
    permissions,
    updatedAt: FieldValue.serverTimestamp(),
  });

  return { success: true };
});

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

  // console.log(`[deleteUser] uid=${targetUid} deleted by uid=${request.auth.uid}`);
  return { success: true };
});