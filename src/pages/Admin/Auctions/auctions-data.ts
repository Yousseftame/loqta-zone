// ─── Types ────────────────────────────────────────────────────────────────────

export type AuctionStatus = "upcoming" | "live" | "ended";
export type BidType = "fixed" | "free" | "decreasing";
export type EntryType = "free" | "paid";

export interface Auction {
  id: string;
  // Relation
  productId: string;
  // Auction Info
  auctionNumber: number;
  startingPrice: number;
  currentBid: number;
  minimumIncrement: number;
  bidType: BidType;
  fixedBidValue: number | null;   // only used when bidType === "fixed"
  maximumBidLimit?: number;       // only used when bidType is "fixed" or "free"
  minimumPrice?: number;          // only used when bidType === "decreasing"
  // Time
  startTime: Date;
  endTime: Date;
  // Entry
  entryType: EntryType;
  entryFee: number;
  // Status — auto-calculated from dates, stored for querying
  status: AuctionStatus;
  // Active
  isActive: boolean;
  // Winner
  winnerId: string | null;
  winningBid: number | null;
  // Control
  totalBids: number;
  totalParticipants: number;
  // Last Offer
  lastOfferEnabled: boolean;
  // Lucky Spin
  luckySpinEnabled: boolean;
  // Meta
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  enableChat: boolean;
}

export interface AuctionFormData {
  productId: string;
  auctionNumber: string;
  startingPrice: string;
  minimumIncrement: string;
  bidType: BidType;
  fixedBidValue: string;          // only relevant when bidType === "fixed"
  maximumBidLimit: string;        // optional limit for "fixed" or "free"
  minimumPrice: string;           // only relevant when bidType === "decreasing"
  startTime: string;              // ISO string from datetime-local input
  endTime: string;
  entryType: EntryType;
  entryFee: string;
  isActive: boolean;
  lastOfferEnabled: boolean;
  luckySpinEnabled: boolean;
  enableChat: boolean;
}

// ─── Auto-calculate status from dates ─────────────────────────────────────────
export function computeAuctionStatus(startTime: Date, endTime: Date, isActive: boolean = true): AuctionStatus {
  if (!isActive) return "ended";
  const now = new Date();
  if (now < startTime) return "upcoming";
  if (now >= startTime && now <= endTime) return "live";
  return "ended";
}

// ─── Constants ────────────────────────────────────────────────────────────────

export const AUCTION_STATUSES: AuctionStatus[] = ["upcoming", "live", "ended"];

export const DEFAULT_AUCTION_FORM: AuctionFormData = {
  productId: "",
  auctionNumber: "",
  startingPrice: "",
  minimumIncrement: "",
  bidType: "fixed",
  fixedBidValue: "",
  maximumBidLimit: "",
  minimumPrice: "",
  startTime: "",
  endTime: "",
  entryType: "free",
  entryFee: "0",
  isActive: true,
  lastOfferEnabled: true,
  luckySpinEnabled: true,
  enableChat: true,
};

// ─── Styles ───────────────────────────────────────────────────────────────────

export const getAuctionStatusStyle = (status: AuctionStatus) => {
  switch (status) {
    case "upcoming":  return { bg: "#EFF6FF", color: "#3B82F6" };
    case "live":      return { bg: "#DCFCE7", color: "#22C55E" };
    case "ended":     return { bg: "#FEE2E2", color: "#DC2626" };
  }
};