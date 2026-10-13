/**
 * Lightweight browser events so NotificationBell can open Last Offer /
 * Lucky Spin modals from MainLayout without navigating to the live page.
 */

export const OPEN_LAST_OFFER_EVENT = "loqta:open-last-offer";
export const OPEN_LUCKY_SPIN_EVENT = "loqta:open-lucky-spin";

export interface OpenLastOfferDetail {
  auctionId: string;
  productTitle?: string;
  winnerName?: string;
  winningBid?: number;
}

export interface OpenLuckySpinDetail {
  auctionId: string;
  productTitle?: string;
  auctionNumber?: number;
}

export function openLastOfferModal(detail: OpenLastOfferDetail) {
  window.dispatchEvent(
    new CustomEvent(OPEN_LAST_OFFER_EVENT, { detail }),
  );
}

export function openLuckySpinModal(detail: OpenLuckySpinDetail) {
  window.dispatchEvent(
    new CustomEvent(OPEN_LUCKY_SPIN_EVENT, { detail }),
  );
}
