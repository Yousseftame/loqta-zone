/**
 * userService.ts — Admin service for managing users.
 *
 * Change vs previous version:
 *   docToUserAuction now maps voucherCode / voucherId / discountApplied.
 *   These fields are already written to users/{uid}/auctions/{auctionId} by
 *   the applyVoucher Cloud Function — zero extra Firestore reads needed.
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

// Maps users/{uid}/auctions/{auctionId}.
// All voucher fields are already on this doc (written by applyVoucher CF) — no extra reads.
function docToUserAuction(id: string, data: Record<string, any>): UserAuction {
  return {
    auctionId:       data.auctionId   ?? id,
    amount:          data.amount      ?? 0,
    hasPaid:         data.hasPaid     ?? false,
    joinedAt:        data.joinedAt instanceof Timestamp ? data.joinedAt.toDate() : new Date(),
    paymentId:       data.paymentId   ?? "",
    totalAmount:     Array.isArray(data.totalAmount) ? data.totalAmount : [],
    // Voucher fields — populated by applyVoucher CF after join, default to no-voucher state
    voucherUsed:     data.voucherUsed     ?? false,
    voucherCode:     data.voucherCode     ?? null,
    voucherId:       data.voucherId       ?? null,
    discountApplied: data.discountApplied ?? 0,
  };
}

// ─── Force-refresh the current user's ID token ────────────────────────────────

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

  try {
    const auctionsSnap = await getDocs(
      collection(db, "users", uid, "auctions"),
    );
    const auctions = auctionsSnap.docs
      .map((d) => docToUserAuction(d.id, d.data()))
      .sort((a, b) => b.joinedAt.getTime() - a.joinedAt.getTime());
    user.auctions = auctions;
  } catch {
    user.auctions = [];
  }

  return user;
}

// ─── BLOCK / UNBLOCK ─────────────────────────────────────────────────────────

export async function blockUserService(uid: string, isBlocked: boolean): Promise<void> {
  await refreshToken();
  try {
    const fn = httpsCallable(functions, "blockUser");
    await fn({ targetUid: uid, isBlocked });
  } catch (err: any) {
    if (
      err?.code === "functions/permission-denied" ||
      err?.message?.includes("permission-denied") ||
      err?.message?.includes("Insufficient permissions")
    ) {
      console.warn("[blockUserService] CF permission-denied — Firestore-only fallback.");
      await updateDoc(doc(db, "users", uid), { isBlocked, updatedAt: serverTimestamp() });
      return;
    }
    throw err;
  }
}

// ─── DELETE USER ──────────────────────────────────────────────────────────────

export async function deleteUserService(uid: string): Promise<void> {
  await refreshToken();
  try {
    const fn = httpsCallable(functions, "deleteUser");
    await fn({ targetUid: uid });
  } catch (err: any) {
    if (err?.code === "functions/not-found" || err?.message?.includes("NOT_FOUND")) {
      console.warn("[deleteUserService] CF not found — Firestore-only fallback.");
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

export async function fetchUserRestrictions(uid: string): Promise<string[]> {
  try {
    const snap = await getDoc(doc(db, "users", uid));
    if (!snap.exists()) return [];
    const data = snap.data();
    return Array.isArray(data.restrictedAuctions) ? data.restrictedAuctions : [];
  } catch {
    return [];
  }
}

// ─── RESTRICT FROM AUCTION ────────────────────────────────────────────────────

export async function restrictUserFromAuctionFull(
  uid: string,
  auctionId: string,
  userEmail: string,
): Promise<void> {
  await setDoc(doc(db, "auctions", auctionId, "restricted", uid), {
    userId: uid, userEmail, restrictedAt: serverTimestamp(),
  });
  const current = await fetchUserRestrictions(uid);
  if (!current.includes(auctionId)) {
    await updateDoc(doc(db, "users", uid), {
      restrictedAuctions: [...current, auctionId],
      updatedAt: serverTimestamp(),
    });
  }
}

// ─── REMOVE RESTRICTION ───────────────────────────────────────────────────────

export async function removeAuctionRestrictionFull(uid: string, auctionId: string): Promise<void> {
  await deleteDoc(doc(db, "auctions", auctionId, "restricted", uid));
  const current = await fetchUserRestrictions(uid);
  await updateDoc(doc(db, "users", uid), {
    restrictedAuctions: current.filter((id) => id !== auctionId),
    updatedAt: serverTimestamp(),
  });
}

// ─── INTERNAL NOTES ───────────────────────────────────────────────────────────

export async function saveInternalNotes(uid: string, notes: string): Promise<void> {
  await updateDoc(doc(db, "users", uid), { internalNotes: notes, updatedAt: serverTimestamp() });
}

// ─── CREATE ADMIN / SUPER ADMIN ───────────────────────────────────────────────

export interface CreateAdminPayload {
  firstName:   string;
  lastName:    string;
  email:       string;
  password:    string;
  role:        "admin" | "superAdmin";
  permissions?: import("@/permissions/permissions-data").AdminPermissions | null;
}

export async function createAdminService(payload: CreateAdminPayload): Promise<AppUser> {
  await refreshToken();
  const fn = httpsCallable(functions, "createAdminAccount");
  const result = await fn(payload);
  const data = result.data as Record<string, any>;
  return docToUser(data.uid, data);
}

// ─── UPDATE PERMISSIONS ───────────────────────────────────────────────────────

export async function updateAdminPermissionsService(
  uid: string,
  permissions: import("@/permissions/permissions-data").AdminPermissions,
): Promise<void> {
  await updateDoc(doc(db, "users", uid), { permissions, updatedAt: serverTimestamp() });
}