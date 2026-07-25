// ─── Types ────────────────────────────────────────────────────────────────────

export interface Participant {
  id: string;
  auctionId: string;
  userId: string;
  fullName: string;       // resolved from /users/{uid}.fullName
  email?: string;         // resolved from /users/{uid}.email
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