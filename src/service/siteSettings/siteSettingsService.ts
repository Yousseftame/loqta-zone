/**
 * siteSettingsService.ts — lightweight site-wide display flags.
 * Doc: siteSettings/home
 */

import {
  doc,
  getDoc,
  setDoc,
  onSnapshot,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/firebase/firebase";

const DOC_REF = doc(db, "siteSettings", "home");

/** Default when the settings doc does not exist yet — sections stay visible. */
const DEFAULT_AUCTIONS_SECTIONS_ENABLED = true;

export async function getAuctionsSectionsEnabled(): Promise<boolean> {
  const snap = await getDoc(DOC_REF);
  if (!snap.exists()) return DEFAULT_AUCTIONS_SECTIONS_ENABLED;
  const v = snap.data()?.auctionsSectionsEnabled;
  return typeof v === "boolean" ? v : DEFAULT_AUCTIONS_SECTIONS_ENABLED;
}

export async function setAuctionsSectionsEnabled(
  enabled: boolean,
): Promise<void> {
  await setDoc(
    DOC_REF,
    {
      auctionsSectionsEnabled: enabled,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}

export function subscribeAuctionsSectionsEnabled(
  onChange: (enabled: boolean) => void,
): () => void {
  return onSnapshot(
    DOC_REF,
    (snap) => {
      if (!snap.exists()) {
        onChange(DEFAULT_AUCTIONS_SECTIONS_ENABLED);
        return;
      }
      const v = snap.data()?.auctionsSectionsEnabled;
      onChange(
        typeof v === "boolean" ? v : DEFAULT_AUCTIONS_SECTIONS_ENABLED,
      );
    },
    () => onChange(DEFAULT_AUCTIONS_SECTIONS_ENABLED),
  );
}
