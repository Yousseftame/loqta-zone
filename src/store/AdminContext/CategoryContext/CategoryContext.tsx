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
  Category,
  CategoryFormData,
} from "@/pages/Admin/Categories/Categories-data";
import {
  fetchCategories,
  fetchCategory,
  createCategory,
  updateCategory,
  deleteCategory,
  toggleCategoryActive,
} from "@/service/categories/Categoryservice";
import { useAuth } from "@/store/AuthContext/AuthContext";

interface CategoryContextType {
  categories: Category[];
  loading: boolean;
  error: string | null;
  refreshCategories: () => Promise<void>;
  getCategory: (id: string) => Promise<Category | null>;
  addCategory: (formData: CategoryFormData) => Promise<Category>;
  editCategory: (id: string, formData: CategoryFormData) => Promise<Category>;
  removeCategory: (id: string) => Promise<void>;
  toggleActive: (id: string, isActive: boolean) => Promise<void>;
}

const CategoryContext = createContext<CategoryContextType | undefined>(
  undefined,
);

export const useCategories = () => {
  const ctx = useContext(CategoryContext);
  if (!ctx)
    throw new Error("useCategories must be used within CategoryProvider");
  return ctx;
};

export const CategoryProvider = ({ children }: { children: ReactNode }) => {
  const { user, loading: authLoading } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshCategories = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchCategories();
      setCategories(data);
    } catch (err: any) {
      const msg = err?.message ?? "Failed to load categories";
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
    refreshCategories();
  }, [authLoading, user, refreshCategories]);

  const getCategory = useCallback(async (id: string) => {
    try {
      return await fetchCategory(id);
    } catch {
      toast.error("Failed to fetch category");
      return null;
    }
  }, []);

  const addCategory = useCallback(
    async (formData: CategoryFormData) => {
      try {
        const category = await createCategory(formData, user?.uid ?? "");
        setCategories((prev) => [category, ...prev]);
        toast.success("Category created successfully");
        return category;
      } catch (err: any) {
        toast.error(err?.message ?? "Failed to create category");
        throw err;
      }
    },
    [user],
  );

  const editCategory = useCallback(
    async (id: string, formData: CategoryFormData) => {
      try {
        const updated = await updateCategory(id, formData);
        // Re-fetch to get accurate timestamps
        const fresh = await fetchCategory(id);
        const result = fresh ?? updated;
        setCategories((prev) => prev.map((c) => (c.id === id ? result : c)));
        toast.success("Category updated successfully");
        return result;
      } catch (err: any) {
        toast.error(err?.message ?? "Failed to update category");
        throw err;
      }
    },
    [],
  );

  const removeCategory = useCallback(async (id: string) => {
    try {
      await deleteCategory(id);
      setCategories((prev) => prev.filter((c) => c.id !== id));
      toast.success("Category deleted");
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to delete category");
      throw err;
    }
  }, []);

  const toggleActive = useCallback(async (id: string, isActive: boolean) => {
    try {
      await toggleCategoryActive(id, isActive);
      setCategories((prev) =>
        prev.map((c) => (c.id === id ? { ...c, isActive } : c)),
      );
      toast.success(isActive ? "Category activated" : "Category deactivated");
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to toggle category");
      throw err;
    }
  }, []);

  return (
    <CategoryContext.Provider
      value={{
        categories,
        loading,
        error,
        refreshCategories,
        getCategory,
        addCategory,
        editCategory,
        removeCategory,
        toggleActive,
      }}
    >
      {children}
    </CategoryContext.Provider>
  );
};
