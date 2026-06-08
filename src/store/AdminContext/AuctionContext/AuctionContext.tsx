/**
 * AuctionContext.tsx
 * Updated: Added auditLogger calls for admin auction create/delete.
 */

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
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/firebase/firebase";
import { useAuth } from "@/store/AuthContext/AuthContext";
import { auditLogger, buildActor } from "@/service/audit/auditLogger";
import {
  titleFromProductData,
  describeAuctionCreated,
  describeAuctionUpdated,
  describeAuctionDeleted,
  describeAuctionToggled,
} from "@/service/audit/audit-description-helpers";

async function fetchProductTitle(productId: string): Promise<string> {
  if (!productId) return "Unknown product";
  try {
    const snap = await getDoc(doc(db, "products", productId));
    return snap.exists()
      ? titleFromProductData(snap.data()?.title)
      : productId;
  } catch {
    return productId;
  }
}

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
  const { user, role, loading: authLoading } = useAuth();
  const isAdmin = role === "admin" || role === "superAdmin";
  const adminName = user?.displayName ?? "Admin";
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
    if (!user || !isAdmin) {
      setLoading(false);
      return;
    }
    refreshAuctions();
  }, [authLoading, user, isAdmin, refreshAuctions]);

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

        if (user && role) {
          const actor = buildActor(user, role as "admin" | "superAdmin");
          const productTitle = await fetchProductTitle(auction.productId);
          auditLogger.adminAuctionCreated(
            actor,
            auction.id,
            productTitle,
            describeAuctionCreated(auction, productTitle, adminName),
          );
        }

        return auction;
      } catch (err: any) {
        toast.error(err?.message ?? "Failed to create auction");
        throw err;
      }
    },
    [user, role],
  );

  const editAuction = useCallback(
    async (id: string, formData: AuctionFormData) => {
      try {
        const before = auctions.find((a) => a.id === id);
        const updated = await updateAuction(id, formData);
        setAuctions((prev) => prev.map((a) => (a.id === id ? updated : a)));
        toast.success("Auction updated successfully");

        if (user && role && before) {
          const actor = buildActor(user, role as "admin" | "superAdmin");
          const [titleBefore, titleAfter] = await Promise.all([
            fetchProductTitle(before.productId),
            fetchProductTitle(updated.productId),
          ]);
          const { description, changes } = describeAuctionUpdated(
            before,
            updated,
            titleBefore,
            titleAfter,
            adminName,
          );
          auditLogger.adminAuctionUpdated(
            actor,
            id,
            titleAfter,
            description,
            changes,
          );
        }

        return updated;
      } catch (err: any) {
        toast.error(err?.message ?? "Failed to update auction");
        throw err;
      }
    },
    [user, role, auctions, adminName],
  );

  const removeAuction = useCallback(
    async (id: string) => {
      // Find the auction name before deleting
      const auction = auctions.find((a) => a.id === id);
      try {
        await deleteAuction(id);
        setAuctions((prev) => prev.filter((a) => a.id !== id));
        toast.success("Auction deleted");

        if (user && role && auction) {
          const actor = buildActor(user, role as "admin" | "superAdmin");
          const productTitle = await fetchProductTitle(auction.productId);
          auditLogger.adminAuctionDeleted(
            actor,
            id,
            productTitle,
            describeAuctionDeleted(auction, productTitle, adminName),
          );
        }
      } catch (err: any) {
        toast.error(err?.message ?? "Failed to delete auction");
        throw err;
      }
    },
    [user, role, auctions, adminName],
  );

  const toggleActive = useCallback(async (id: string, isActive: boolean) => {
    try {
      await toggleAuctionActive(id, isActive);
      const auction = auctions.find((a) => a.id === id);
      setAuctions((prev) =>
        prev.map((a) => (a.id === id ? { ...a, isActive } : a)),
      );
      toast.success(isActive ? "Auction activated" : "Auction deactivated");

      if (user && role && auction) {
        const actor = buildActor(user, role as "admin" | "superAdmin");
        const productTitle = await fetchProductTitle(auction.productId);
        auditLogger.adminAuctionToggled(
          actor,
          id,
          productTitle,
          isActive,
          describeAuctionToggled(auction, productTitle, isActive, adminName),
        );
      }
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to toggle auction");
      throw err;
    }
  }, [user, role, auctions, adminName]);

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
