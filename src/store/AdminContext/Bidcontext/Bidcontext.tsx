/**
 * BidContext.tsx
 *
 * Updated to include editBid() so BidsList can call winner-promotion
 * through context, mirroring LastOfferContext.editOffer().
 */

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import toast from "react-hot-toast";
import type { Bid, BidUpdateData } from "@/pages/Admin/Biding/Bids-data";
import {
  fetchBidsForAuction,
  deleteBid,
  updateBid,
} from "@/service/Bidadminservice/Bidadminservice";

interface BidContextType {
  bids: Bid[];
  loading: boolean;
  error: string | null;
  currentAuctionId: string | null;
  loadBids: (auctionId: string) => Promise<void>;
  editBid: (auctionId: string, bid: Bid, data: BidUpdateData) => Promise<void>;
  removeBid: (auctionId: string, bidId: string) => Promise<void>;
  clearBids: () => void;
}

const BidContext = createContext<BidContextType | undefined>(undefined);

export const useBids = () => {
  const ctx = useContext(BidContext);
  if (!ctx) throw new Error("useBids must be used within BidProvider");
  return ctx;
};

export const BidProvider = ({ children }: { children: ReactNode }) => {
  const [bids, setBids] = useState<Bid[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentAuctionId, setCurrentAuctionId] = useState<string | null>(null);

  const loadBids = useCallback(async (auctionId: string) => {
    setLoading(true);
    setError(null);
    setCurrentAuctionId(auctionId);
    try {
      const data = await fetchBidsForAuction(auctionId);
      setBids(data);
    } catch (err: any) {
      const msg = err?.message ?? "Failed to load bids";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  // Passes full bid so service can atomically promote winner when needed
  const editBid = useCallback(
    async (auctionId: string, bid: Bid, data: BidUpdateData) => {
      try {
        await updateBid(auctionId, bid.id, data, bid);
        setBids((prev) =>
          prev.map((b) => (b.id === bid.id ? { ...b, ...data } : b)),
        );
        toast.success("Bid updated");
      } catch (err: any) {
        toast.error(err?.message ?? "Failed to update bid");
        throw err;
      }
    },
    [],
  );

  const removeBid = useCallback(async (auctionId: string, bidId: string) => {
    try {
      await deleteBid(auctionId, bidId);
      setBids((prev) => prev.filter((b) => b.id !== bidId));
      toast.success("Bid deleted");
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to delete bid");
      throw err;
    }
  }, []);

  const clearBids = useCallback(() => {
    setBids([]);
    setCurrentAuctionId(null);
    setError(null);
  }, []);

  return (
    <BidContext.Provider
      value={{
        bids,
        loading,
        error,
        currentAuctionId,
        loadBids,
        editBid,
        removeBid,
        clearBids,
      }}
    >
      {children}
    </BidContext.Provider>
  );
};
