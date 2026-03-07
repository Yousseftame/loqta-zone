// ─── Types ────────────────────────────────────────────────────────────────────

export interface Participant {
  id: string; // document ID (same as userId)
  auctionId: string;
  userId: string;
  hasPaid: boolean;
  joinedAt: Date;
  paymentId: string;
  voucherUsed: boolean;
}

export interface ParticipantsState {
  participants: Participant[];
  loading: boolean;
  error: string | null;
}