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
  AuctionRequest,
  AuctionRequestFormData,
} from "@/pages/Admin/RequestSystem/auction-requests-data";
import {
  fetchAuctionRequests,
  fetchAuctionRequest,
  updateAuctionRequest,
} from "@/service/auctionRequest/auctionRequestService";
import { useAuth } from "@/store/AuthContext/AuthContext";

interface AuctionRequestContextType {
  requests: AuctionRequest[];
  loading: boolean;
  error: string | null;
  refreshRequests: () => Promise<void>;
  getRequest: (id: string) => Promise<AuctionRequest | null>;
  editRequest: (
    id: string,
    formData: AuctionRequestFormData,
  ) => Promise<AuctionRequest>;
}

const AuctionRequestContext = createContext<
  AuctionRequestContextType | undefined
>(undefined);

export const useAuctionRequests = () => {
  const ctx = useContext(AuctionRequestContext);
  if (!ctx)
    throw new Error(
      "useAuctionRequests must be used within AuctionRequestProvider",
    );
  return ctx;
};

export const AuctionRequestProvider = ({
  children,
}: {
  children: ReactNode;
}) => {
  const { user, role, loading: authLoading } = useAuth();
  const [requests, setRequests] = useState<AuctionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isAdmin = role === "admin" || role === "superAdmin";

  const refreshRequests = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAuctionRequests();
      setRequests(data);
    } catch (err: any) {
      const msg = err?.message ?? "Failed to load auction requests";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;

    // ← KEY FIX: only fetch if user is admin/superAdmin
    // Regular users cannot list the AuctionRequests collection
    if (!user || !isAdmin) {
      setLoading(false);
      setRequests([]);
      return;
    }

    refreshRequests();
  }, [authLoading, user, isAdmin, refreshRequests]);

  const getRequest = useCallback(async (id: string) => {
    try {
      return await fetchAuctionRequest(id);
    } catch {
      toast.error("Failed to fetch auction request");
      return null;
    }
  }, []);

  const editRequest = useCallback(
    async (id: string, formData: AuctionRequestFormData) => {
      try {
        const updated = await updateAuctionRequest(id, formData);
        setRequests((prev) => prev.map((r) => (r.id === id ? updated : r)));
        toast.success("Request updated successfully");
        return updated;
      } catch (err: any) {
        toast.error(err?.message ?? "Failed to update request");
        throw err;
      }
    },
    [],
  );

  return (
    <AuctionRequestContext.Provider
      value={{
        requests,
        loading,
        error,
        refreshRequests,
        getRequest,
        editRequest,
      }}
    >
      {children}
    </AuctionRequestContext.Provider>
  );
};
