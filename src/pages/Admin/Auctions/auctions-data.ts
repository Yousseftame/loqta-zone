// ─── Types ────────────────────────────────────────────────────────────────────

export type AuctionStatus = "upcoming" | "live" | "ended" | "cancelled";
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
  // Time
  startTime: Date;
  endTime: Date;
  // Entry
  entryType: EntryType;
  entryFee: number;
  // Status
  status: AuctionStatus;
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
  startTime: string; // ISO string from datetime-local input
  endTime: string;
  entryType: EntryType;
  entryFee: string;
  status: AuctionStatus;
  lastOfferEnabled: boolean;
}

// ─── Constants ────────────────────────────────────────────────────────────────

export const AUCTION_STATUSES: AuctionStatus[] = [
  "upcoming",
  "live",
  "ended",
  "cancelled",
];

export const DEFAULT_AUCTION_FORM: AuctionFormData = {
  productId: "",
  auctionNumber: "",
  startingPrice: "",
  minimumIncrement: "",
  bidType: "fixed",
  startTime: "",
  endTime: "",
  entryType: "free",
  entryFee: "0",
  status: "upcoming",
  lastOfferEnabled: false,
};

// ─── Styles ───────────────────────────────────────────────────────────────────

export const getAuctionStatusStyle = (status: AuctionStatus) => {
  switch (status) {
    case "upcoming":   return { bg: "#EFF6FF", color: "#3B82F6" };
    case "live":       return { bg: "#DCFCE7", color: "#22C55E" };
    case "ended":      return { bg: "#F1F5F9", color: "#64748B" };
    case "cancelled":  return { bg: "#FEE2E2", color: "#EF4444" };
  }
};