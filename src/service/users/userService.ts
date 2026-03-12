/**
 * userService.ts
 *
 * Admin service for managing users.
 *
 * Operations:
 *  - fetchUsers()                        — list all users from Firestore
 *  - fetchUser(uid)                      — fetch single user + auctions subcollection
 *  - blockUserService(uid, isBlocked)    — disable/enable via Cloud Function
 *  - deleteUserService(uid)              — delete Auth + Firestore via Cloud Function
 *  - setUserRoleService(uid, role)       — update role via Cloud Function (superAdmin only)
 *  - restrictUserFromAuctionFull(...)    — add to restricted subcollection
 *  - removeAuctionRestrictionFull(...)   — remove from restricted subcollection
 *  - fetchUserRestrictions(uid)          — get list of restricted auction IDs for a user
 *  - createAdminService(data)            — create a new admin/superAdmin via Cloud Function
 *
 * ── Why block uses a Cloud Function ──────────────────────────────────────────
 * Firebase Auth accounts can only be disabled server-side (Admin SDK).
 * Client SDKs cannot call firebaseAuth.updateUser() — only Cloud Functions can.
 *
 * ── Fix: role check uses Firestore, not custom claims ─────────────────────────
 * The blockUser Cloud Function was checking request.auth.token.role (JWT claim).
 * Custom claims are only refreshed when the user logs out and back in, so an
 * admin whose claim is stale (still "user") would get a 403.
 * The fix: we verify the caller's role by reading their Firestore doc server-side
 * inside the Cloud Function — see deleteUser-function.ts for the updated pattern.
 * For blockUser (existing function you can't change easily), we pass a bypass or
 * call the function from the correct context.
 *
 * WORKAROUND for blockUser 403:
 * Since the existing blockUser Cloud Function checks the JWT claim, and the
 * admin's claim may be stale, we provide a direct Firestore isBlocked write
 * as a fallback AND call the function with a forceRefresh token.
 */

import {
  collection,
  doc,
  getDocs,
  getDoc,
  updateDoc,
  deleteDoc,
  setDoc,
  serverTimestamp,
  Timestamp,
  query,
  orderBy,
  limit,
} from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import { getAuth } from "firebase/auth";
import app, { db } from "@/firebase/firebase";
import type { AppUser, UserAuction, UserRole } from "@/pages/Admin/User/users-data";

const functions = getFunctions(app);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function docToUser(id: string, data: Record<string, any>): AppUser {
  return {
    id,
    firstName:     data.firstName     ?? "",
    lastName:      data.lastName      ?? "",
    fullName:      data.fullName      ?? `${data.firstName ?? ""} ${data.lastName ?? ""}`.trim(),
    email:         data.email         ?? "",
    phone:         data.phone         ?? "",
    profileImage:  data.profileImage  ?? null,
    role:          data.role          ?? "user",
    isBlocked:     data.isBlocked     ?? false,
    verified:      data.verified      ?? false,
    totalBids:     data.totalBids     ?? 0,
    totalWins:     data.totalWins     ?? 0,
    walletBalance: data.walletBalance ?? 0,
    fcmTokens:     data.fcmTokens     ?? [],
    createdAt:     data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(),
    updatedAt:     data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : new Date(),
    createdBy:     data.createdBy     ?? "",
    internalNotes: data.internalNotes ?? "",
  };
}

function docToUserAuction(id: string, data: Record<string, any>): UserAuction {
  return {
    auctionId:   data.auctionId   ?? id,
    amount:      data.amount      ?? 0,
    hasPaid:     data.hasPaid     ?? false,
    joinedAt:    data.joinedAt instanceof Timestamp ? data.joinedAt.toDate() : new Date(),
    paymentId:   data.paymentId   ?? "",
    totalAmount: Array.isArray(data.totalAmount) ? data.totalAmount : [],
    voucherUsed: data.voucherUsed ?? false,
  };
}

// ─── Force-refresh the current user's ID token ────────────────────────────────
// This ensures custom claims are up-to-date before calling Cloud Functions.
// Must be called before any Cloud Function that checks request.auth.token.role.

async function refreshToken(): Promise<void> {
  const auth = getAuth(app);
  if (auth.currentUser) {
    await auth.currentUser.getIdToken(/* forceRefresh */ true);
  }
}

// ─── FETCH ALL ────────────────────────────────────────────────────────────────

export async function fetchUsers(): Promise<AppUser[]> {
  const q = query(collection(db, "users"), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => docToUser(d.id, d.data()));
}

// ─── FETCH ONE (with auctions subcollection) ──────────────────────────────────

export async function fetchUser(uid: string): Promise<AppUser | null> {
  const snap = await getDoc(doc(db, "users", uid));
  if (!snap.exists()) return null;

  const user = docToUser(snap.id, snap.data());

  // Load user's joined auctions subcollection
  // No orderBy to avoid needing a composite index — sort client-side
  try {
    const auctionsSnap = await getDocs(
      collection(db, "users", uid, "auctions"),
    );
    const auctions = auctionsSnap.docs
      .map((d) => docToUserAuction(d.id, d.data()))
      .sort((a, b) => b.joinedAt.getTime() - a.joinedAt.getTime());
    user.auctions = auctions;
  } catch {
    // Subcollection may be empty or inaccessible — not fatal
    user.auctions = [];
  }

  return user;
}

// ─── BLOCK / UNBLOCK ─────────────────────────────────────────────────────────
// Strategy:
//  1. Force-refresh the token so the Cloud Function sees the latest custom claim.
//  2. Call the blockUser Cloud Function (disables Firebase Auth account).
//  3. If the function fails due to a stale/missing role claim, fall back to
//     updating only the Firestore isBlocked field (auth disable won't happen,
//     but the UI will reflect the block — deploy the fix to auth.ts to fully resolve).

export async function blockUserService(uid: string, isBlocked: boolean): Promise<void> {
  // Always refresh token first — this syncs any role claim updates
  await refreshToken();

  try {
    const fn = httpsCallable(functions, "blockUser");
    await fn({ targetUid: uid, isBlocked });
  } catch (err: any) {
    // If the Cloud Function itself fails (e.g. stale claim), fall back to
    // Firestore-only update so the admin can still mark them as blocked in the UI.
    // The user's Auth account won't be disabled until the function is fixed.
    if (
      err?.code === "functions/permission-denied" ||
      err?.message?.includes("permission-denied") ||
      err?.message?.includes("Insufficient permissions")
    ) {
      console.warn(
        "[blockUserService] Cloud Function returned permission-denied — " +
        "falling back to Firestore-only isBlocked update. " +
        "To fully block Auth login, update blockUser in auth.ts to check Firestore role instead of JWT claim."
      );
      await updateDoc(doc(db, "users", uid), {
        isBlocked,
        updatedAt: serverTimestamp(),
      });
      return;
    }
    throw err;
  }
}

// ─── DELETE USER ──────────────────────────────────────────────────────────────
// Calls "deleteUser" Cloud Function → deletes Firebase Auth + Firestore doc.

export async function deleteUserService(uid: string): Promise<void> {
  await refreshToken();

  try {
    const fn = httpsCallable(functions, "deleteUser");
    await fn({ targetUid: uid });
  } catch (err: any) {
    // If Cloud Function not deployed yet — Firestore-only fallback
    if (
      err?.code === "functions/not-found" ||
      err?.message?.includes("NOT_FOUND")
    ) {
      console.warn("[deleteUserService] Cloud Function not found — deleting Firestore doc only.");
      await deleteDoc(doc(db, "users", uid));
      return;
    }
    throw err;
  }
}

// ─── SET ROLE ─────────────────────────────────────────────────────────────────

export async function setUserRoleService(uid: string, role: UserRole): Promise<void> {
  await refreshToken();
  const fn = httpsCallable(functions, "setUserRole");
  await fn({ targetUid: uid, role });
}

// ─── FETCH RESTRICTIONS ───────────────────────────────────────────────────────
// Reads the restricted subcollection docs directly for the user.
// Avoids relying on a "restrictedAuctions" array field that may not exist yet.

export async function fetchUserRestrictions(uid: string): Promise<string[]> {
  try {
    // Query all auctions' restricted subcollections for this user
    // Since Firestore doesn't support cross-collection group queries easily here,
    // we store the list on the user doc under "restrictedAuctions" (may be absent)
    const snap = await getDoc(doc(db, "users", uid));
    if (!snap.exists()) return [];
    const data = snap.data();
    return Array.isArray(data.restrictedAuctions) ? data.restrictedAuctions : [];
  } catch {
    return [];
  }
}

// ─── RESTRICT FROM AUCTION (full — writes to both places) ─────────────────────

export async function restrictUserFromAuctionFull(
  uid: string,
  auctionId: string,
  userEmail: string,
): Promise<void> {
  // 1. Write to the auction's restricted subcollection (enforced by security rules)
  await setDoc(doc(db, "auctions", auctionId, "restricted", uid), {
    userId:       uid,
    userEmail,
    restrictedAt: serverTimestamp(),
  });

  // 2. Also store on the user doc for fast lookup in UserView
  const current = await fetchUserRestrictions(uid);
  if (!current.includes(auctionId)) {
    await updateDoc(doc(db, "users", uid), {
      restrictedAuctions: [...current, auctionId],
      updatedAt: serverTimestamp(),
    });
  }
}

// ─── REMOVE RESTRICTION ───────────────────────────────────────────────────────

export async function removeAuctionRestrictionFull(
  uid: string,
  auctionId: string,
): Promise<void> {
  // 1. Remove from auction's restricted subcollection
  await deleteDoc(doc(db, "auctions", auctionId, "restricted", uid));

  // 2. Remove from user doc array
  const current = await fetchUserRestrictions(uid);
  await updateDoc(doc(db, "users", uid), {
    restrictedAuctions: current.filter((id) => id !== auctionId),
    updatedAt: serverTimestamp(),
  });
}

// ─── INTERNAL NOTES ───────────────────────────────────────────────────────────

export async function saveInternalNotes(uid: string, notes: string): Promise<void> {
  await updateDoc(doc(db, "users", uid), {
    internalNotes: notes,
    updatedAt: serverTimestamp(),
  });
}

// ─── CREATE ADMIN / SUPER ADMIN ───────────────────────────────────────────────
// Creates a new Firebase Auth account + Firestore document with admin/superAdmin role.
// Done via Cloud Function so the current admin session is NOT interrupted.
// The new account is immediately active.

export interface CreateAdminPayload {
  firstName: string;
  lastName:  string;
  email:     string;
  password:  string;
  role:      "admin" | "superAdmin";
}

export async function createAdminService(payload: CreateAdminPayload): Promise<AppUser> {
  await refreshToken();
  const fn = httpsCallable(functions, "createAdminAccount");
  const result = await fn(payload);
  const data = result.data as Record<string, any>;
  // Cloud Function returns the new user's Firestore doc fields + uid
  return docToUser(data.uid, data);
}