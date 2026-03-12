/**
 * PersistentLastOfferGate.tsx
 *
 * Mounted once in MainLayout. Silently checks whether the current user
 * has any auctions where they missed submitting a last offer, then shows
 * the LastOfferModal for each one (sequentially, one at a time).
 *
 * ─── Lifecycle ────────────────────────────────────────────────────────────────
 *  Mount  → usePendingLastOffer runs the check in the background
 *  Check complete → if queue is non-empty, show modal for queue[0]
 *  User submits OR skips → dismiss(auctionId) → queue shifts → show queue[1]
 *  Queue empty → component renders null silently
 *
 * ─── Why a small delay before showing ────────────────────────────────────────
 *  We wait 2 seconds after the queue is populated before showing the modal.
 *  This prevents the modal from competing with the page's own loading state.
 *  The user sees the page first, then the modal slides in.
 *
 * ─── Re-use ───────────────────────────────────────────────────────────────────
 *  Reuses the exact same LastOfferModal component used in AuctionLivePage.
 *  No duplicate UI code.
 */

import { useEffect, useState } from "react";
import { useAuth } from "@/store/AuthContext/AuthContext";
import LastOfferModal from "@/components/LastOfferModal/LastOfferModal";
import { usePendingLastOffer } from "@/hooks/usePendingLastOffer";

// Delay (ms) before the first modal appears — lets the page paint first
const SHOW_DELAY_MS = 2000;

export default function PersistentLastOfferGate() {
  const { user } = useAuth();
  const { queue, dismiss } = usePendingLastOffer();
  const [readyToShow, setReadyToShow] = useState(false);

  // Wait a moment before showing so it doesn't fight with page load
  useEffect(() => {
    if (queue.length === 0) {
      setReadyToShow(false);
      return;
    }
    const t = setTimeout(() => setReadyToShow(true), SHOW_DELAY_MS);
    return () => clearTimeout(t);
  }, [queue.length]);

  // Not logged in, nothing in queue, or not ready yet
  if (!user || queue.length === 0 || !readyToShow) return null;

  const current = queue[0];

  const handleClose = () => {
    dismiss(current.auctionId);
    // readyToShow resets via the useEffect above when queue shifts
  };

  return (
    <LastOfferModal
      auctionId={current.auctionId}
      userId={user.uid}
      startingPrice={current.startingPrice}
      winningBid={current.winningBid}
      winnerName={current.winnerName}
      productTitle={current.productTitle}
      onClose={handleClose}
    />
  );
}
