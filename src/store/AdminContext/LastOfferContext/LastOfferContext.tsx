import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import toast from "react-hot-toast";
import type {
  LastOffer,
  LastOfferUpdateData,
} from "@/service/LastOfferService/LastOfferService";
import {
  fetchLastOffersForAuction,
  updateLastOffer,
  deleteLastOffer,
} from "@/service/LastOfferService/LastOfferService";

interface LastOfferContextType {
  offers: LastOffer[];
  loading: boolean;
  error: string | null;
  currentAuctionId: string | null;
  loadOffers: (auctionId: string) => Promise<void>;
  editOffer: (
    auctionId: string,
    offer: LastOffer,
    data: LastOfferUpdateData,
  ) => Promise<void>;
  removeOffer: (auctionId: string, offerId: string) => Promise<void>;
  clearOffers: () => void;
}

const LastOfferContext = createContext<LastOfferContextType | undefined>(
  undefined,
);

export const useLastOffers = () => {
  const ctx = useContext(LastOfferContext);
  if (!ctx)
    throw new Error("useLastOffers must be used within LastOfferProvider");
  return ctx;
};

export const LastOfferProvider = ({ children }: { children: ReactNode }) => {
  const [offers, setOffers] = useState<LastOffer[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentAuctionId, setCurrentAuctionId] = useState<string | null>(null);

  const loadOffers = useCallback(async (auctionId: string) => {
    setLoading(true);
    setError(null);
    setCurrentAuctionId(auctionId);
    try {
      const data = await fetchLastOffersForAuction(auctionId);
      setOffers(data);
    } catch (err: any) {
      const msg = err?.message ?? "Failed to load last offers";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  const editOffer = useCallback(
    async (auctionId: string, offer: LastOffer, data: LastOfferUpdateData) => {
      try {
        await updateLastOffer(auctionId, offer.id, data, offer);
        setOffers((prev) =>
          prev.map((o) => (o.id === offer.id ? { ...o, ...data } : o)),
        );
        toast.success("Offer updated");
      } catch (err: any) {
        toast.error(err?.message ?? "Failed to update offer");
        throw err;
      }
    },
    [],
  );

  const removeOffer = useCallback(
    async (auctionId: string, offerId: string) => {
      try {
        await deleteLastOffer(auctionId, offerId);
        setOffers((prev) => prev.filter((o) => o.id !== offerId));
        toast.success("Offer deleted");
      } catch (err: any) {
        toast.error(err?.message ?? "Failed to delete offer");
        throw err;
      }
    },
    [],
  );

  const clearOffers = useCallback(() => {
    setOffers([]);
    setCurrentAuctionId(null);
    setError(null);
  }, []);

  return (
    <LastOfferContext.Provider
      value={{
        offers,
        loading,
        error,
        currentAuctionId,
        loadOffers,
        editOffer,
        removeOffer,
        clearOffers,
      }}
    >
      {children}
    </LastOfferContext.Provider>
  );
};
