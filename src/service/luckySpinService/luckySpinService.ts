/**
 * luckySpinService.ts
 *
 * Prize definitions + read helpers.
 * Claiming is server-side only via claimLuckySpin Cloud Function.
 */

import { doc, getDoc, Timestamp } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, functions } from "@/firebase/firebase";

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
  percent: number;
  isFree: boolean;
  isSpinAgain: boolean;
  color: string;
  textColor: string;
}

export interface LuckySpinWin {
  prizeId: LuckySpinPrizeType;
  percent: number;
  isFree: boolean;
  label: string;
  claimedAt: Date;
  status: LuckySpinStatus;
  redeemedOnAuctionId: string | null;
}

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

export async function getUserAuctionLuckySpin(
  userId: string,
  auctionId: string,
): Promise<LuckySpinWin | null> {
  const snap = await getDoc(doc(db, "users", userId, "auctions", auctionId));
  if (!snap.exists()) return null;
  return mapLuckySpinWin(snap.data()?.luckySpin);
}

export interface ClaimLuckySpinResult {
  alreadyClaimed: boolean;
  prize: LuckySpinPrize;
}

/**
 * Server rolls + persists the prize. Clients never write luckySpin fields.
 */
export async function claimLuckySpinPrize(
  auctionId: string,
): Promise<ClaimLuckySpinResult> {
  const fn = httpsCallable(functions, "claimLuckySpin");
  const res = await fn({ auctionId });
  const data = res.data as {
    alreadyClaimed?: boolean;
    prize?: {
      id: LuckySpinPrizeType;
      label: string;
      percent: number;
      isFree: boolean;
      isSpinAgain: boolean;
    };
  };

  const id = data.prize?.id;
  const fromCatalog = LUCKY_SPIN_PRIZES.find((p) => p.id === id);
  if (!fromCatalog || !data.prize) {
    throw new Error("Invalid lucky spin response");
  }

  return {
    alreadyClaimed: !!data.alreadyClaimed,
    prize: fromCatalog,
  };
}

/** @deprecated Use claimLuckySpinPrize — kept name for older imports */
export async function saveLuckySpinPrize(
  auctionId: string,
  _userId: string,
  _prize: LuckySpinPrize,
  _opts: { productTitle?: string; auctionNumber?: number } = {},
): Promise<LuckySpinWin> {
  const result = await claimLuckySpinPrize(auctionId);
  if (result.prize.isSpinAgain) {
    throw new Error("spin_again is not a claimable prize");
  }
  return {
    prizeId: result.prize.id,
    percent: result.prize.percent,
    isFree: result.prize.isFree,
    label: result.prize.label,
    claimedAt: new Date(),
    status: "available",
    redeemedOnAuctionId: null,
  };
}
