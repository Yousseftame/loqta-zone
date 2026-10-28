/**
 * publicProfileService — read-only public display names / avatars.
 * Never contains email, phone, wallet, notes, role, etc.
 */

import { collection, doc, getDoc, getDocs, query, where } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, functions } from "@/firebase/firebase";

export interface PublicProfile {
  fullName: string;
  firstName: string;
  lastName: string;
  profileImage: string | null;
}

export function mapPublicProfile(raw: any): PublicProfile {
  return {
    fullName: raw?.fullName ?? "",
    firstName: raw?.firstName ?? "",
    lastName: raw?.lastName ?? "",
    profileImage: raw?.profileImage ?? null,
  };
}

export function displayNameFromPublic(
  p: PublicProfile | null | undefined,
  fallback = "Unknown",
): string {
  if (!p) return fallback;
  const fromFull = (p.fullName ?? "").trim();
  if (fromFull) return fromFull;
  const combined = `${p.firstName ?? ""} ${p.lastName ?? ""}`.trim();
  return combined || fallback;
}

export async function getPublicProfile(
  uid: string,
): Promise<PublicProfile | null> {
  try {
    const snap = await getDoc(doc(db, "publicProfiles", uid));
    if (!snap.exists()) return null;
    return mapPublicProfile(snap.data());
  } catch {
    return null;
  }
}

export async function getPublicDisplayName(
  uid: string,
  fallback = "Unknown",
): Promise<string> {
  return displayNameFromPublic(await getPublicProfile(uid), fallback);
}

/** Returns true if another account already uses this fullName. */
export async function isFullNameTaken(
  fullName: string,
  excludeUid?: string,
): Promise<boolean> {
  const q = query(
    collection(db, "publicProfiles"),
    where("fullName", "==", fullName),
  );
  const snap = await getDocs(q);
  if (snap.empty) return false;
  if (!excludeUid) return true;
  return snap.docs.some((d) => d.id !== excludeUid);
}

export async function ensureMyPublicProfile(): Promise<void> {
  try {
    const fn = httpsCallable(functions, "ensureMyPublicProfile");
    await fn({});
  } catch (err) {
    console.warn("[publicProfile] ensureMyPublicProfile failed:", err);
  }
}
