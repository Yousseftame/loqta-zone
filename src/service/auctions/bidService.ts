/**
 * bidService.ts — places bids via Cloud Function only.
 * Amount / timing / auction rules are enforced server-side (Admin SDK).
 */

import { httpsCallable } from "firebase/functions";
import { functions } from "@/firebase/firebase";

export class RestrictedFromAuctionError extends Error {
  readonly code = "RESTRICTED_FROM_AUCTION" as const;
  constructor() {
    super("RESTRICTED_FROM_AUCTION");
    this.name = "RestrictedFromAuctionError";
  }
}

export interface PlaceBidParams {
  auctionId: string;
  userId: string;
  amount: number;
}

export interface PlaceBidResult {
  success: true;
  newBid: number;
}

export async function placeBid({
  auctionId,
  userId,
  amount,
}: PlaceBidParams): Promise<PlaceBidResult> {
  if (!auctionId) throw new Error("Invalid auction.");
  if (!userId) throw new Error("You must be logged in to bid.");
  if (!amount || amount <= 0) throw new Error("Invalid bid amount.");

  try {
    const fn = httpsCallable(functions, "placeBidCallable");
    const res = await fn({ auctionId, amount });
    const data = res.data as { success?: boolean; newBid?: number };
    return { success: true, newBid: Number(data.newBid ?? amount) };
  } catch (err: any) {
    const code = err?.code as string | undefined;
    const msg = String(err?.message ?? err);

    if (
      code === "functions/permission-denied" ||
      msg.includes("RESTRICTED_FROM_AUCTION")
    ) {
      throw new RestrictedFromAuctionError();
    }

    // Strip Firebase "functions/" prefixes for cleaner UI toasts
    const clean = msg
      .replace(/^Firebase:\s*/i, "")
      .replace(/^functions\/[a-z-]+\s*/i, "")
      .trim();

    throw new Error(clean || "Failed to place bid. Please try again.");
  }
}
