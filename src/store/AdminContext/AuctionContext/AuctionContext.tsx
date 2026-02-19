import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import toast from "react-hot-toast";
import type {
  Auction,
  AuctionFormData,
} from "@/pages/Admin/Auctions/auctions-data";
import {
  fetchAuctions,
  fetchAuction,
  createAuction,
  updateAuction,
  deleteAuction,
  toggleAuctionActive,
} from "@/service/auctions/auctionService";
import { useAuth } from "@/store/AuthContext/AuthContext";

interface AuctionContextType {
  auctions: Auction[];
  loading: boolean;
  error: string | null;
  refreshAuctions: () => Promise<void>;
  getAuction: (id: string) => Promise<Auction | null>;
  addAuction: (formData: AuctionFormData) => Promise<Auction>;
  editAuction: (id: string, formData: AuctionFormData) => Promise<Auction>;
  removeAuction: (id: string) => Promise<void>;
  toggleActive: (id: string, isActive: boolean) => Promise<void>;
}

const AuctionContext = createContext<AuctionContextType | undefined>(undefined);

export const useAuctions = () => {
  const ctx = useContext(AuctionContext);
  if (!ctx) throw new Error("useAuctions must be used within AuctionProvider");
  return ctx;
};

export const AuctionProvider = ({ children }: { children: ReactNode }) => {
  const { user, loading: authLoading } = useAuth();
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshAuctions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAuctions();
      setAuctions(data);
    } catch (err: any) {
      const msg = err?.message ?? "Failed to load auctions";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setLoading(false);
      return;
    }
    refreshAuctions();
  }, [authLoading, user, refreshAuctions]);

  const getAuction = useCallback(async (id: string) => {
    try {
      return await fetchAuction(id);
    } catch {
      toast.error("Failed to fetch auction");
      return null;
    }
  }, []);

  const addAuction = useCallback(
    async (formData: AuctionFormData) => {
      try {
        const auction = await createAuction(formData, user?.uid ?? "");
        setAuctions((prev) => [auction, ...prev]);
        toast.success("Auction created successfully");
        return auction;
      } catch (err: any) {
        toast.error(err?.message ?? "Failed to create auction");
        throw err;
      }
    },
    [user],
  );

  const editAuction = useCallback(
    async (id: string, formData: AuctionFormData) => {
      try {
        const updated = await updateAuction(id, formData);
        setAuctions((prev) => prev.map((a) => (a.id === id ? updated : a)));
        toast.success("Auction updated successfully");
        return updated;
      } catch (err: any) {
        toast.error(err?.message ?? "Failed to update auction");
        throw err;
      }
    },
    [],
  );

  const removeAuction = useCallback(async (id: string) => {
    try {
      await deleteAuction(id);
      setAuctions((prev) => prev.filter((a) => a.id !== id));
      toast.success("Auction deleted");
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to delete auction");
      throw err;
    }
  }, []);

  const toggleActive = useCallback(async (id: string, isActive: boolean) => {
    try {
      await toggleAuctionActive(id, isActive);
      setAuctions((prev) =>
        prev.map((a) => (a.id === id ? { ...a, isActive } : a)),
      );
      toast.success(isActive ? "Auction activated" : "Auction deactivated");
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to toggle auction");
      throw err;
    }
  }, []);

  return (
    <AuctionContext.Provider
      value={{
        auctions,
        loading,
        error,
        refreshAuctions,
        getAuction,
        addAuction,
        editAuction,
        removeAuction,
        toggleActive,
      }}
    >
      {children}
    </AuctionContext.Provider>
  );
};
