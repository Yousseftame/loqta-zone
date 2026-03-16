/**
 * src/pages/Admin/Dashboard/analytics-data.ts
 *
 * Single source of truth for all analytics types.
 * The `analytics/dashboard` Firestore doc maps 1:1 to DashboardAnalytics.
 */

// ─── Core analytics document (Firestore: analytics/dashboard) ────────────────

export interface DashboardAnalytics {
  // Users
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;

  // Admins
  totalAdmins: number;
  totalSuperAdmins: number;

  // Categories
  totalCategories: number;

  // Products
  totalProducts: number;
  activeProducts: number;
  inactiveProducts: number;
  totalInventory: number;       // sum of all product quantities
  totalInventoryValue: number;  // sum of (actualPrice * qty)

  // Auctions
  totalAuctions: number;
  liveAuctions: number;
  upcomingAuctions: number;
  endedAuctions: number;
  activeAuctions: number;
  inactiveAuctions: number;
  totalBids: number;
  highestWinningBid: number;
  avgWinningBid: number;

  // Vouchers
  totalVouchers: number;

  // Auction Requests
  totalAuctionRequests: number;

  // Ratings
  avgRating: number;
  totalRatings: number;

  // Financial
  totalRevenue: number;         // sum of all winningBids
  avgMargin: number;            // average profit margin across ended auctions

  // Meta
  updatedAt: Date | null;
}

// ─── Top-N analytics (Firestore: analytics/topAuctions) ─────────────────────

export interface TopAuction {
  auctionId: string;
  auctionNumber: number;
  productTitle: string;
  totalBids: number;
  totalParticipants: number;
  winningBid: number;
  actualPrice: number;
  margin: number;
  winnerId: string;
  winnerName: string;
}

export interface TopAuctionsAnalytics {
  byBids: TopAuction[];
  byParticipants: TopAuction[];
  byWinningBid: TopAuction[];
  updatedAt: Date | null;
}

// ─── Margin report entry ──────────────────────────────────────────────────────

export interface MarginReport {
  auctionId: string;
  auctionNumber: number;
  productTitle: string;
  winningBid: number;
  actualPrice: number;
  margin: number;        // percentage
  winnerName: string;
  endedAt: Date | null;
}

// ─── Defaults ─────────────────────────────────────────────────────────────────

export const DEFAULT_ANALYTICS: DashboardAnalytics = {
  totalUsers: 0,
  activeUsers: 0,
  inactiveUsers: 0,
  totalAdmins: 0,
  totalSuperAdmins: 0,
  totalCategories: 0,
  totalProducts: 0,
  activeProducts: 0,
  inactiveProducts: 0,
  totalInventory: 0,
  totalInventoryValue: 0,
  totalAuctions: 0,
  liveAuctions: 0,
  upcomingAuctions: 0,
  endedAuctions: 0,
  activeAuctions: 0,
  inactiveAuctions: 0,
  totalBids: 0,
  highestWinningBid: 0,
  avgWinningBid: 0,
  totalVouchers: 0,
  totalAuctionRequests: 0,
  avgRating: 0,
  totalRatings: 0,
  totalRevenue: 0,
  avgMargin: 0,
  updatedAt: null,
};

export const DEFAULT_TOP_AUCTIONS: TopAuctionsAnalytics = {
  byBids: [],
  byParticipants: [],
  byWinningBid: [],
  updatedAt: null,
};