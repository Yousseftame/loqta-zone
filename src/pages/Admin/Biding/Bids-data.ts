// ─── Types ────────────────────────────────────────────────────────────────────

export interface Bid {
  id: string;
  auctionId: string;
  userId: string;
  bidderName: string;
  amount: number;
  createdAt: Date;
}

export interface BidsState {
  bids: Bid[];
  loading: boolean;
  error: string | null;
}