/**
 * src/store/AdminContext/PurchaseContext/PurchaseContext.tsx
 *
 * Global state for purchases. Pattern is identical to every other admin context
 * (CategoryContext, SupplierContext, etc.) — zero new patterns introduced.
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
  Purchase,
  PurchaseFormData,
  PurchaseStatus,
} from "@/pages/Admin/Purchases/purchases-data";
import {
  fetchPurchases,
  fetchPurchase,
  createPurchase,
  updatePurchase,
  deletePurchase,
  updatePurchaseStatus,
} from "@/service/purchases/purchaseService";
import { useAuth } from "@/store/AuthContext/AuthContext";

interface PurchaseContextType {
  purchases: Purchase[];
  loading: boolean;
  error: string | null;
  refreshPurchases: () => Promise<void>;
  getPurchase: (id: string) => Promise<Purchase | null>;
  addPurchase: (formData: PurchaseFormData) => Promise<Purchase>;
  editPurchase: (id: string, formData: PurchaseFormData) => Promise<Purchase>;
  removePurchase: (id: string) => Promise<void>;
  changeStatus: (id: string, status: PurchaseStatus) => Promise<void>;
}

const PurchaseContext = createContext<PurchaseContextType | undefined>(
  undefined,
);

export const usePurchases = () => {
  const ctx = useContext(PurchaseContext);
  if (!ctx)
    throw new Error("usePurchases must be used within PurchaseProvider");
  return ctx;
};

export const PurchaseProvider = ({ children }: { children: ReactNode }) => {
  const { user, role, loading: authLoading } = useAuth();
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshPurchases = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchPurchases();
      setPurchases(data);
    } catch (err: any) {
      const msg = err?.message ?? "Failed to load purchases";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user || (role !== "admin" && role !== "superAdmin")) {
      setLoading(false);
      return;
    }
    refreshPurchases();
  }, [authLoading, user, role, refreshPurchases]);

  const getPurchase = useCallback(async (id: string) => {
    try {
      return await fetchPurchase(id);
    } catch {
      toast.error("Failed to fetch purchase");
      return null;
    }
  }, []);

  const addPurchase = useCallback(
    async (formData: PurchaseFormData) => {
      try {
        const purchase = await createPurchase(formData, user?.uid ?? "");
        setPurchases((prev) => [purchase, ...prev]);
        toast.success("Purchase order created");
        return purchase;
      } catch (err: any) {
        toast.error(err?.message ?? "Failed to create purchase");
        throw err;
      }
    },
    [user],
  );

  const editPurchase = useCallback(
    async (id: string, formData: PurchaseFormData) => {
      try {
        const updated = await updatePurchase(id, formData);
        setPurchases((prev) => prev.map((p) => (p.id === id ? updated : p)));
        toast.success("Purchase order updated");
        return updated;
      } catch (err: any) {
        toast.error(err?.message ?? "Failed to update purchase");
        throw err;
      }
    },
    [],
  );

  const removePurchase = useCallback(async (id: string) => {
    try {
      await deletePurchase(id);
      setPurchases((prev) => prev.filter((p) => p.id !== id));
      toast.success("Purchase order deleted");
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to delete purchase");
      throw err;
    }
  }, []);

  const changeStatus = useCallback(
    async (id: string, status: PurchaseStatus) => {
      try {
        await updatePurchaseStatus(id, status);
        setPurchases((prev) =>
          prev.map((p) =>
            p.id === id ? { ...p, status, updatedAt: new Date() } : p,
          ),
        );
        toast.success(`Marked as ${status}`);
      } catch (err: any) {
        toast.error(err?.message ?? "Failed to update status");
        throw err;
      }
    },
    [],
  );

  return (
    <PurchaseContext.Provider
      value={{
        purchases,
        loading,
        error,
        refreshPurchases,
        getPurchase,
        addPurchase,
        editPurchase,
        removePurchase,
        changeStatus,
      }}
    >
      {children}
    </PurchaseContext.Provider>
  );
};
