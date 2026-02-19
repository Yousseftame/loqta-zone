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
  Voucher,
  VoucherFormData,
} from "@/pages/Admin/Voucher/voucher-data";
import {
  fetchVouchers,
  fetchVoucher,
  createVoucher,
  updateVoucher,
  deleteVoucher,
  toggleVoucherActive,
} from "@/service/vouchers/voucherService";
import { useAuth } from "@/store/AuthContext/AuthContext";

interface VoucherContextType {
  vouchers: Voucher[];
  loading: boolean;
  error: string | null;
  refreshVouchers: () => Promise<void>;
  getVoucher: (id: string) => Promise<Voucher | null>;
  addVoucher: (formData: VoucherFormData) => Promise<Voucher>;
  editVoucher: (id: string, formData: VoucherFormData) => Promise<Voucher>;
  removeVoucher: (id: string) => Promise<void>;
  toggleActive: (id: string, isActive: boolean) => Promise<void>;
}

const VoucherContext = createContext<VoucherContextType | undefined>(undefined);

export const useVouchers = () => {
  const ctx = useContext(VoucherContext);
  if (!ctx) throw new Error("useVouchers must be used within VoucherProvider");
  return ctx;
};

export const VoucherProvider = ({ children }: { children: ReactNode }) => {
  const { user, loading: authLoading } = useAuth();
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshVouchers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchVouchers();
      setVouchers(data);
    } catch (err: any) {
      const msg = err?.message ?? "Failed to load vouchers";
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
    refreshVouchers();
  }, [authLoading, user, refreshVouchers]);

  const getVoucher = useCallback(async (id: string) => {
    try {
      return await fetchVoucher(id);
    } catch {
      toast.error("Failed to fetch voucher");
      return null;
    }
  }, []);

  const addVoucher = useCallback(
    async (formData: VoucherFormData) => {
      try {
        const voucher = await createVoucher(formData, user?.uid ?? "");
        setVouchers((prev) => [voucher, ...prev]);
        toast.success("Voucher created successfully");
        return voucher;
      } catch (err: any) {
        toast.error(err?.message ?? "Failed to create voucher");
        throw err;
      }
    },
    [user],
  );

  const editVoucher = useCallback(
    async (id: string, formData: VoucherFormData) => {
      try {
        const updated = await updateVoucher(id, formData);
        setVouchers((prev) => prev.map((v) => (v.id === id ? updated : v)));
        toast.success("Voucher updated successfully");
        return updated;
      } catch (err: any) {
        toast.error(err?.message ?? "Failed to update voucher");
        throw err;
      }
    },
    [],
  );

  const removeVoucher = useCallback(async (id: string) => {
    try {
      await deleteVoucher(id);
      setVouchers((prev) => prev.filter((v) => v.id !== id));
      toast.success("Voucher deleted");
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to delete voucher");
      throw err;
    }
  }, []);

  const toggleActive = useCallback(async (id: string, isActive: boolean) => {
    try {
      await toggleVoucherActive(id, isActive);
      setVouchers((prev) =>
        prev.map((v) => (v.id === id ? { ...v, isActive } : v)),
      );
      toast.success(isActive ? "Voucher activated" : "Voucher deactivated");
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to toggle voucher");
      throw err;
    }
  }, []);

  return (
    <VoucherContext.Provider
      value={{
        vouchers,
        loading,
        error,
        refreshVouchers,
        getVoucher,
        addVoucher,
        editVoucher,
        removeVoucher,
        toggleActive,
      }}
    >
      {children}
    </VoucherContext.Provider>
  );
};
