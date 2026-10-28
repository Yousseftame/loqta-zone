/**
 * joinAuctionService.ts — joins via Cloud Function (Admin SDK).
 * Clients cannot write Participants / users/{uid}/auctions directly.
 */

import { httpsCallable } from "firebase/functions";
import { functions } from "@/firebase/firebase";
import { auditLogger } from "@/service/audit/auditLogger";
import type { AuditActor } from "@/service/audit/audit-log-data";

export interface AuctionToJoin {
  id: string;
  entryType: "free" | "paid";
  entryFee: number;
  title?: string;
}

export interface JoinResult {
  joined: string[];
  skipped: string[];
  errors: string[];
}

/**
 * @param userId  - authenticated uid (must match auth; server uses request.auth.uid)
 * @param auctions - auctions to join (server re-validates fees / eligibility)
 * @param actor   - optional AuditActor for client-side audit log
 */
export async function joinAuctions(
  userId: string,
  auctions: AuctionToJoin[],
  actor?: AuditActor,
): Promise<JoinResult> {
  if (!userId) throw new Error("User must be authenticated to join auctions");
  if (!auctions.length) throw new Error("No auctions selected");

  const fn = httpsCallable(functions, "joinAuctionsCallable");
  const res = await fn({ auctionIds: auctions.map((a) => a.id) });
  const data = (res.data ?? {}) as JoinResult;

  const result: JoinResult = {
    joined: Array.isArray(data.joined) ? data.joined : [],
    skipped: Array.isArray(data.skipped) ? data.skipped : [],
    errors: Array.isArray(data.errors) ? data.errors : [],
  };

  if (actor) {
    for (const id of result.joined) {
      const meta = auctions.find((a) => a.id === id);
      auditLogger.auctionJoin(
        actor,
        id,
        meta?.title ?? `Auction ${id.slice(0, 6)}`,
        meta?.entryType === "paid" ? (meta.entryFee ?? 0) : 0,
      );
    }
  }

  return result;
}
