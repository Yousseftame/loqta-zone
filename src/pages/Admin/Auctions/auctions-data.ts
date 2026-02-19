// ─── Types ────────────────────────────────────────────────────────────────────

export type AuctionStatus = "upcoming" | "live" | "ended";
export type BidType = "fixed" | "free";
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
  // Meta
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export interface AuctionFormData {
  productId: string;
  auctionNumber: string;
  startingPrice: string;
  minimumIncrement: string;
  bidType: BidType;
  fixedBidValue: string;          // only relevant when bidType === "fixed"
  startTime: string;              // ISO string from datetime-local input
  endTime: string;
  entryType: EntryType;
  entryFee: string;
  isActive: boolean;
  lastOfferEnabled: boolean;
}

// ─── Auto-calculate status from dates ─────────────────────────────────────────
export function computeAuctionStatus(startTime: Date, endTime: Date): AuctionStatus {
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
  startTime: "",
  endTime: "",
  entryType: "free",
  entryFee: "0",
  isActive: true,
  lastOfferEnabled: false,
};

// ─── Styles ───────────────────────────────────────────────────────────────────

export const getAuctionStatusStyle = (status: AuctionStatus) => {
  switch (status) {
    case "upcoming":  return { bg: "#EFF6FF", color: "#3B82F6" };
    case "live":      return { bg: "#DCFCE7", color: "#22C55E" };
    case "ended":     return { bg: "#F1F5F9", color: "#64748B" };
  }
};