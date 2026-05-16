/**
 * src/store/AdminContext/PurchaseContext/PurchaseContext.tsx
 *
 * Global state for purchases with payment tracking.
 * Wraps all service calls with toast feedback and optimistic local state updates.
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
  PurchasePayment,
  RecordPaymentFormData,
} from "@/pages/Admin/Purchases/purchases-data";
import {
  fetchPurchases,
  fetchPurchase,
  createPurchase,
  updatePurchase,
  deletePurchase,
  updatePurchaseStatus,
  recordPayment,
  fetchPurchasePayments,
  markPurchaseFullyPaid,
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
  // Payment management
  recordPayment: (
    purchaseId: string,
    formData: RecordPaymentFormData,
  ) => Promise<Purchase>;
  markFullyPaid: (purchaseId: string) => Promise<Purchase>;
  getPurchasePayments: (purchaseId: string) => Promise<PurchasePayment[]>;
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

  // ── Helpers ─────────────────────────────────────────────────────────────────

  const adminUid = user?.uid ?? "";
  const adminName =
    (user as { displayName?: string } | null)?.displayName ?? "Admin";

  function fmtEGP(n: number) {
    return `${n.toLocaleString("en-EG")} EGP`;
  }

  // ── Load ─────────────────────────────────────────────────────────────────────

  const refreshPurchases = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchPurchases();
      setPurchases(data);
    } catch (err: unknown) {
      const msg = (err as Error)?.message ?? "Failed to load purchases";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user || role !== "superAdmin") {
      setLoading(false);
      return;
    }
    refreshPurchases();
  }, [authLoading, user, role, refreshPurchases]);

  // ── CRUD ─────────────────────────────────────────────────────────────────────

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
        const purchase = await createPurchase(formData, adminUid, adminName);
        setPurchases((prev) => [purchase, ...prev]);
        toast.success("Purchase order created");
        return purchase;
      } catch (err: unknown) {
        toast.error((err as Error)?.message ?? "Failed to create purchase");
        throw err;
      }
    },
    [adminUid, adminName],
  );

  const editPurchase = useCallback(
    async (id: string, formData: PurchaseFormData) => {
      try {
        const updated = await updatePurchase(id, formData, adminUid, adminName);
        setPurchases((prev) => prev.map((p) => (p.id === id ? updated : p)));
        toast.success("Purchase order updated");
        return updated;
      } catch (err: unknown) {
        toast.error((err as Error)?.message ?? "Failed to update purchase");
        throw err;
      }
    },
    [adminUid, adminName],
  );

  const removePurchase = useCallback(async (id: string) => {
    try {
      await deletePurchase(id, adminUid, adminName);
      setPurchases((prev) => prev.filter((p) => p.id !== id));
      toast.success("Purchase order deleted");
    } catch (err: unknown) {
      toast.error((err as Error)?.message ?? "Failed to delete purchase");
      throw err;
    }
  }, [adminUid, adminName]);

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
      } catch (err: unknown) {
        toast.error((err as Error)?.message ?? "Failed to update status");
        throw err;
      }
    },
    [],
  );

  // ── Payment management ────────────────────────────────────────────────────────

  const handleRecordPayment = useCallback(
    async (purchaseId: string, formData: RecordPaymentFormData) => {
      try {
        // Service now returns { purchase, effectiveAmount } so we show the
        // ACTUAL amount applied (in case it was clamped to remainingAmount).
        const { purchase: updated, effectiveAmount } = await recordPayment(
          purchaseId,
          formData,
          adminUid,
          adminName,
        );

        setPurchases((prev) =>
          prev.map((p) => (p.id === purchaseId ? updated : p)),
        );

        if (updated.paymentStatus === "paid") {
          toast.success("Payment recorded — purchase fully settled! ✅");
        } else {
          toast.success(
            `Payment of ${fmtEGP(effectiveAmount)} recorded successfully`,
          );
        }

        return updated;
      } catch (err: unknown) {
        toast.error((err as Error)?.message ?? "Failed to record payment");
        throw err;
      }
    },
    [adminUid, adminName],
  );

  const handleMarkFullyPaid = useCallback(
    async (purchaseId: string) => {
      try {
        const updated = await markPurchaseFullyPaid(
          purchaseId,
          adminUid,
          adminName,
        );
        setPurchases((prev) =>
          prev.map((p) => (p.id === purchaseId ? updated : p)),
        );
        toast.success("Purchase marked as fully paid ✅");
        return updated;
      } catch (err: unknown) {
        toast.error((err as Error)?.message ?? "Failed to mark as paid");
        throw err;
      }
    },
    [adminUid, adminName],
  );

  const getPurchasePayments = useCallback(async (purchaseId: string) => {
    try {
      return await fetchPurchasePayments(purchaseId);
    } catch {
      toast.error("Failed to load payment history");
      return [];
    }
  }, []);

  // ── Provider ─────────────────────────────────────────────────────────────────

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
        recordPayment: handleRecordPayment,
        markFullyPaid: handleMarkFullyPaid,
        getPurchasePayments,
      }}
    >
      {children}
    </PurchaseContext.Provider>
  );
};
