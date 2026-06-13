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
  editPurchasePayment,
  deletePurchasePayment,
} from "@/service/purchases/purchaseService";
import { useAuth } from "@/store/AuthContext/AuthContext";
import { auditLogger, buildActor } from "@/service/audit/auditLogger";
import {
  describePurchaseCreated,
  describePurchaseUpdated,
  describePurchaseDeleted,
  describePurchaseStatusChanged,
  describePurchasePaymentRecorded,
  describePurchaseMarkedPaid,
} from "@/service/audit/audit-description-helpers";
import {
  accountNameById,
  fetchPaymentAccounts,
} from "@/service/finance/paymentAccounts";

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
  editPayment: (purchaseId: string, paymentId: string, amount: string, note: string) => Promise<Purchase>;
  removePayment: (purchaseId: string, paymentId: string) => Promise<Purchase>;
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

        if (user && role) {
          const actor = buildActor(user, role as "admin" | "superAdmin");
          auditLogger.adminPurchaseCreated(
            actor,
            purchase.id,
            purchase.productTitle,
            describePurchaseCreated(purchase, adminName),
          );
        }

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
        const before = purchases.find((p) => p.id === id);
        const updated = await updatePurchase(id, formData, adminUid, adminName);
        setPurchases((prev) => prev.map((p) => (p.id === id ? updated : p)));
        toast.success("Purchase order updated");

        if (user && role && before) {
          const actor = buildActor(user, role as "admin" | "superAdmin");
          const { description, changes } = describePurchaseUpdated(
            before,
            updated,
            adminName,
          );
          auditLogger.adminPurchaseUpdated(
            actor,
            id,
            updated.productTitle,
            description,
            changes,
          );
        }

        return updated;
      } catch (err: unknown) {
        toast.error((err as Error)?.message ?? "Failed to update purchase");
        throw err;
      }
    },
    [adminUid, adminName, purchases, user, role],
  );

  const removePurchase = useCallback(async (id: string) => {
    try {
      // Capture name before deletion
      const existing = purchases.find((p) => p.id === id);
      await deletePurchase(id, adminUid, adminName);
      setPurchases((prev) => prev.filter((p) => p.id !== id));
      toast.success("Purchase order deleted");

      if (user && role && existing) {
        const actor = buildActor(user, role as "admin" | "superAdmin");
        auditLogger.adminPurchaseDeleted(
          actor,
          id,
          existing.productTitle,
          describePurchaseDeleted(existing, adminName),
        );
      }
    } catch (err: unknown) {
      toast.error((err as Error)?.message ?? "Failed to delete purchase");
      throw err;
    }
  }, [adminUid, adminName, purchases, user, role]);

  const changeStatus = useCallback(
    async (id: string, status: PurchaseStatus) => {
      try {
        await updatePurchaseStatus(id, status);
        const existing = purchases.find((p) => p.id === id);
        setPurchases((prev) =>
          prev.map((p) =>
            p.id === id ? { ...p, status, updatedAt: new Date() } : p,
          ),
        );
        toast.success(`Marked as ${status}`);

        if (user && role && existing) {
          const actor = buildActor(user, role as "admin" | "superAdmin");
          auditLogger.adminPurchaseStatusChanged(
            actor,
            id,
            existing.productTitle,
            describePurchaseStatusChanged(
              existing,
              existing.status,
              status,
              adminName,
            ),
          );
        }
      } catch (err: unknown) {
        toast.error((err as Error)?.message ?? "Failed to update status");
        throw err;
      }
    },
    [purchases, user, role, adminName],
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

        if (user && role) {
          const actor = buildActor(user, role as "admin" | "superAdmin");
          const existing = purchases.find((p) => p.id === purchaseId) ?? updated;
          const accounts = await fetchPaymentAccounts();
          const accountLabel = accountNameById(
            accounts,
            formData.paymentAccountId?.trim() || undefined,
          );
          auditLogger.adminPurchasePaymentRecorded(
            actor,
            purchaseId,
            existing.productTitle,
            describePurchasePaymentRecorded(
              existing,
              effectiveAmount,
              formData.method ?? "cash",
              formData.paymentAccountId ? accountLabel : undefined,
              adminName,
              updated.remainingAmount,
            ),
          );
        }

        return updated;
      } catch (err: unknown) {
        toast.error((err as Error)?.message ?? "Failed to record payment");
        throw err;
      }
    },
    [adminUid, adminName, purchases, user, role],
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

        if (user && role) {
          const actor = buildActor(user, role as "admin" | "superAdmin");
          const existing = purchases.find((p) => p.id === purchaseId) ?? updated;
          auditLogger.adminPurchaseMarkedPaid(
            actor,
            purchaseId,
            existing.productTitle,
            describePurchaseMarkedPaid(existing, adminName),
          );
        }

        return updated;
      } catch (err: unknown) {
        toast.error((err as Error)?.message ?? "Failed to mark as paid");
        throw err;
      }
    },
    [adminUid, adminName, purchases, user, role],
  );

  const getPurchasePayments = useCallback(async (purchaseId: string) => {
    try {
      return await fetchPurchasePayments(purchaseId);
    } catch {
      toast.error("Failed to load payment history");
      return [];
    }
  }, []);

  const handleEditPayment = useCallback(
    async (purchaseId: string, paymentId: string, amount: string, note: string) => {
      try {
        const { purchase: updated } = await editPurchasePayment(
          purchaseId,
          paymentId,
          amount,
          note,
          adminUid,
          adminName
        );
        setPurchases((prev) => prev.map((p) => (p.id === purchaseId ? updated : p)));
        toast.success("Payment updated successfully");
        return updated;
      } catch (err: unknown) {
        toast.error((err as Error)?.message ?? "Failed to edit payment");
        throw err;
      }
    },
    [adminUid, adminName]
  );

  const handleRemovePayment = useCallback(
    async (purchaseId: string, paymentId: string) => {
      try {
        const { purchase: updated } = await deletePurchasePayment(
          purchaseId,
          paymentId,
          adminUid,
          adminName
        );
        setPurchases((prev) => prev.map((p) => (p.id === purchaseId ? updated : p)));
        toast.success("Payment deleted successfully");
        return updated;
      } catch (err: unknown) {
        toast.error((err as Error)?.message ?? "Failed to delete payment");
        throw err;
      }
    },
    [adminUid, adminName]
  );

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
        editPayment: handleEditPayment,
        removePayment: handleRemovePayment,
      }}
    >
      {children}
    </PurchaseContext.Provider>
  );
};
