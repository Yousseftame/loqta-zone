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
  Supplier,
  SupplierFormData,
} from "@/pages/Admin/Suppliers/suppliers-data";
import {
  fetchSuppliers,
  fetchSupplier,
  createSupplier,
  updateSupplier,
  deleteSupplier,
  toggleSupplierActive,
} from "@/service/suppliers/supplierService";
import { useAuth } from "@/store/AuthContext/AuthContext";

interface SupplierContextType {
  suppliers: Supplier[];
  loading: boolean;
  error: string | null;
  refreshSuppliers: () => Promise<void>;
  getSupplier: (id: string) => Promise<Supplier | null>;
  addSupplier: (formData: SupplierFormData) => Promise<Supplier>;
  editSupplier: (id: string, formData: SupplierFormData) => Promise<Supplier>;
  removeSupplier: (id: string) => Promise<void>;
  toggleActive: (id: string, isActive: boolean) => Promise<void>;
}

const SupplierContext = createContext<SupplierContextType | undefined>(
  undefined,
);

export const useSuppliers = () => {
  const ctx = useContext(SupplierContext);
  if (!ctx)
    throw new Error("useSuppliers must be used within SupplierProvider");
  return ctx;
};

export const SupplierProvider = ({ children }: { children: ReactNode }) => {
  const { user, role, loading: authLoading } = useAuth();
  const isAdmin = role === "admin" || role === "superAdmin";
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshSuppliers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchSuppliers();
      setSuppliers(data);
    } catch (err: any) {
      const msg = err?.message ?? "Failed to load suppliers";
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
    refreshSuppliers();
  }, [authLoading, user, isAdmin, refreshSuppliers]);

  const getSupplier = useCallback(async (id: string) => {
    try {
      return await fetchSupplier(id);
    } catch {
      toast.error("Failed to fetch supplier");
      return null;
    }
  }, []);

  const addSupplier = useCallback(
    async (formData: SupplierFormData) => {
      try {
        const supplier = await createSupplier(formData, user?.uid ?? "");
        setSuppliers((prev) => [supplier, ...prev]);
        toast.success("Supplier created successfully");
        return supplier;
      } catch (err: any) {
        toast.error(err?.message ?? "Failed to create supplier");
        throw err;
      }
    },
    [user],
  );

  const editSupplier = useCallback(
    async (id: string, formData: SupplierFormData) => {
      try {
        const updated = await updateSupplier(id, formData);
        setSuppliers((prev) => prev.map((s) => (s.id === id ? updated : s)));
        toast.success("Supplier updated successfully");
        return updated;
      } catch (err: any) {
        toast.error(err?.message ?? "Failed to update supplier");
        throw err;
      }
    },
    [],
  );

  const removeSupplier = useCallback(async (id: string) => {
    try {
      await deleteSupplier(id);
      setSuppliers((prev) => prev.filter((s) => s.id !== id));
      toast.success("Supplier deleted");
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to delete supplier");
      throw err;
    }
  }, []);

  const toggleActive = useCallback(async (id: string, isActive: boolean) => {
    try {
      await toggleSupplierActive(id, isActive);
      setSuppliers((prev) =>
        prev.map((s) => (s.id === id ? { ...s, isActive } : s)),
      );
      toast.success(isActive ? "Supplier activated" : "Supplier deactivated");
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to toggle supplier");
      throw err;
    }
  }, []);

  return (
    <SupplierContext.Provider
      value={{
        suppliers,
        loading,
        error,
        refreshSuppliers,
        getSupplier,
        addSupplier,
        editSupplier,
        removeSupplier,
        toggleActive,
      }}
    >
      {children}
    </SupplierContext.Provider>
  );
};
