// ─── Types ────────────────────────────────────────────────────────────────────

export type BidStatus = "pending" | "accepted" | "rejected";

export interface Bid {
  id: string;
  auctionId: string;
  userId: string;
  bidderName: string;
  amount: number;
  createdAt: Date;
  // Admin-managed fields — these do NOT exist on docs written before this
  // feature was added. Always default to "pending" / false when missing.
  status: BidStatus;
  selectedbyAdmin: boolean;
}

export interface BidUpdateData {
  status?: BidStatus;
  selectedbyAdmin?: boolean;
}

export interface BidsState {
  bids: Bid[];
  loading: boolean;
  error: string | null;
}