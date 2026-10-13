/**
 * luckySpinService.ts
 *
 * Lucky Spin prize definitions + persistence on the user collection.
 *
 * Stored at:
 *   users/{uid}/auctions/{auctionId}.luckySpin  → history per auction (admin Joined Auctions)
 *   users/{uid}.luckySpinCredit                 → active credit for the next entry fee
 */

import {
  collection,
  doc,
  getDoc,
  updateDoc,
  addDoc,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/firebase/firebase";

export type LuckySpinPrizeType =
  | "10_off"
  | "25_off"
  | "50_off"
  | "75_off"
  | "free_entry"
  | "spin_again";

export type LuckySpinStatus = "available" | "redeemed";

export interface LuckySpinPrize {
  id: LuckySpinPrizeType;
  label: string;
  labelAr: string;
  percent: number; // 10, 25, 50, 75, 100 for free, 0 for spin_again
  isFree: boolean;
  isSpinAgain: boolean;
  color: string;
  textColor: string;
}

/** Persisted win on users/{uid}/auctions/{auctionId} */
export interface LuckySpinWin {
  prizeId: LuckySpinPrizeType;
  percent: number;
  isFree: boolean;
  label: string;
  claimedAt: Date;
  status: LuckySpinStatus;
  redeemedOnAuctionId: string | null;
}

/** Active redeemable credit on users/{uid} */
export interface LuckySpinCredit {
  prizeId: LuckySpinPrizeType;
  percent: number;
  isFree: boolean;
  label: string;
  sourceAuctionId: string;
  claimedAt: Date;
  status: LuckySpinStatus;
}

export const LUCKY_SPIN_PRIZES: LuckySpinPrize[] = [
  {
    id: "10_off",
    label: "10% OFF",
    labelAr: "خصم 10%",
    percent: 10,
    isFree: false,
    isSpinAgain: false,
    color: "#0f1d2d",
    textColor: "#f4f1ea",
  },
  {
    id: "25_off",
    label: "25% OFF",
    labelAr: "خصم 25%",
    percent: 25,
    isFree: false,
    isSpinAgain: false,
    color: "#0a1624",
    textColor: "#f4f1ea",
  },
  {
    id: "50_off",
    label: "50% OFF",
    labelAr: "خصم 50%",
    percent: 50,
    isFree: false,
    isSpinAgain: false,
    color: "#0f1d2d",
    textColor: "#f4f1ea",
  },
  {
    id: "75_off",
    label: "75% OFF",
    labelAr: "خصم 75%",
    percent: 75,
    isFree: false,
    isSpinAgain: false,
    color: "#0a1624",
    textColor: "#f4f1ea",
  },
  {
    id: "free_entry",
    label: "FREE",
    labelAr: "دخول مجاني",
    percent: 100,
    isFree: true,
    isSpinAgain: false,
    color: "#e5a93c",
    textColor: "#081018",
  },
  {
    id: "spin_again",
    label: "SPIN AGAIN",
    labelAr: "دوّر مجدداً",
    percent: 0,
    isFree: false,
    isSpinAgain: true,
    color: "#0f1d2d",
    textColor: "#f4f1ea",
  },
];

function toDate(v: any): Date {
  if (v instanceof Timestamp) return v.toDate();
  if (v?.toDate) return v.toDate();
  if (v?.seconds) return new Date(v.seconds * 1000);
  if (typeof v === "string" || typeof v === "number") return new Date(v);
  return new Date();
}

export function mapLuckySpinWin(raw: any): LuckySpinWin | null {
  if (!raw || typeof raw !== "object") return null;
  if (!raw.prizeId) return null;
  return {
    prizeId: raw.prizeId,
    percent: Number(raw.percent) || 0,
    isFree: !!raw.isFree,
    label: raw.label ?? "",
    claimedAt: toDate(raw.claimedAt),
    status: raw.status === "redeemed" ? "redeemed" : "available",
    redeemedOnAuctionId: raw.redeemedOnAuctionId ?? null,
  };
}

/**
 * Returns the lucky spin win for this user+auction if already claimed.
 */
export async function getUserAuctionLuckySpin(
  userId: string,
  auctionId: string,
): Promise<LuckySpinWin | null> {
  const snap = await getDoc(doc(db, "users", userId, "auctions", auctionId));
  if (!snap.exists()) return null;
  return mapLuckySpinWin(snap.data()?.luckySpin);
}

export interface SaveLuckySpinOptions {
  productTitle?: string;
  auctionNumber?: number;
}

/**
 * Persist a lucky spin prize:
 *  1) users/{uid}/auctions/{auctionId}.luckySpin  (history for admin)
 *  2) users/{uid}.luckySpinCredit                 (active next-entry credit)
 *  3) users/{uid}/notifications                   (prize-claimed message)
 *
 * Guards against overwriting an existing win for the same auction.
 */
export async function saveLuckySpinPrize(
  auctionId: string,
  userId: string,
  prize: LuckySpinPrize,
  opts: SaveLuckySpinOptions = {},
): Promise<LuckySpinWin> {
  if (prize.isSpinAgain) {
    throw new Error("spin_again is not a claimable prize");
  }

  const auctionRef = doc(db, "users", userId, "auctions", auctionId);
  const userRef = doc(db, "users", userId);

  const existingSnap = await getDoc(auctionRef);
  if (!existingSnap.exists()) {
    throw new Error("User has no join record for this auction");
  }

  const existing = mapLuckySpinWin(existingSnap.data()?.luckySpin);
  if (existing) {
    return existing;
  }

  let productTitle = opts.productTitle ?? "";
  let auctionNumber = opts.auctionNumber;

  if (!productTitle || auctionNumber == null) {
    try {
      const auctionSnap = await getDoc(doc(db, "auctions", auctionId));
      if (auctionSnap.exists()) {
        const a = auctionSnap.data();
        auctionNumber = auctionNumber ?? a.auctionNumber;
        if (!productTitle && a.productId) {
          const pSnap = await getDoc(doc(db, "products", a.productId));
          if (pSnap.exists()) {
            const title = pSnap.data()?.title;
            productTitle =
              typeof title === "string"
                ? title
                : (title?.en ?? title?.ar ?? "");
          }
        }
      }
    } catch {
      /* non-fatal */
    }
  }

  const winPayload = {
    prizeId: prize.id,
    percent: prize.percent,
    isFree: prize.isFree,
    label: prize.label,
    claimedAt: serverTimestamp(),
    status: "available" as LuckySpinStatus,
    redeemedOnAuctionId: null,
  };

  await updateDoc(auctionRef, { luckySpin: winPayload });

  await updateDoc(userRef, {
    luckySpinCredit: {
      prizeId: prize.id,
      percent: prize.percent,
      isFree: prize.isFree,
      label: prize.label,
      sourceAuctionId: auctionId,
      claimedAt: serverTimestamp(),
      status: "available" as LuckySpinStatus,
    },
    updatedAt: serverTimestamp(),
  });

  // Prize-claimed notification (informational)
  const title = "🎉 Lucky Spin Reward Claimed!";
  const message = prize.isFree
    ? productTitle
      ? `Congrats! You won FREE entry for your next auction (from "${productTitle}").`
      : "Congrats! You won FREE entry for your next auction!"
    : productTitle
      ? `Congrats! You won ${prize.percent}% OFF your next auction entry fee (from "${productTitle}").`
      : `Congrats! You won ${prize.percent}% OFF your next auction entry fee!`;

  try {
    await addDoc(collection(db, "users", userId, "notifications"), {
      type: "lucky_spin_claimed",
      auctionId,
      productTitle: productTitle || "",
      auctionNumber: auctionNumber ?? 0,
      prizeId: prize.id,
      percent: prize.percent,
      isFree: prize.isFree,
      label: prize.label,
      title,
      message,
      isRead: false,
      createdAt: serverTimestamp(),
    });
  } catch (err) {
    console.warn("[luckySpinService] Failed to write claimed notification:", err);
  }

  return {
    prizeId: prize.id,
    percent: prize.percent,
    isFree: prize.isFree,
    label: prize.label,
    claimedAt: new Date(),
    status: "available",
    redeemedOnAuctionId: null,
  };
}
