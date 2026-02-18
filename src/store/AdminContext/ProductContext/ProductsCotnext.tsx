// src/store/AdminContext/ProductContext/ProductsCotnext.tsx

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
  Product,
  ProductFormData,
} from "@/pages/Admin/Products/products-data";
import {
  fetchProducts,
  fetchProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  archiveProduct,
  toggleProductActive,
} from "@/service/products/productService";
import { useAuth } from "@/store/AuthContext/AuthContext";

interface ProductContextType {
  products: Product[];
  loading: boolean;
  error: string | null;
  refreshProducts: () => Promise<void>;
  getProduct: (id: string) => Promise<Product | null>;
  addProduct: (formData: ProductFormData) => Promise<Product>;
  editProduct: (
    id: string,
    formData: ProductFormData,
    previousImages: string[],
  ) => Promise<Product>;
  removeProduct: (product: Product) => Promise<void>;
  softArchive: (id: string) => Promise<void>;
  toggleActive: (id: string, isActive: boolean) => Promise<void>;
}

const ProductContext = createContext<ProductContextType | undefined>(undefined);

export const useProducts = () => {
  const ctx = useContext(ProductContext);
  if (!ctx) throw new Error("useProducts must be used within ProductProvider");
  return ctx;
};

export const ProductProvider = ({ children }: { children: ReactNode }) => {
  const { user, loading: authLoading } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      console.log("Fetching products...");
      const data = await fetchProducts();
      console.log("Products fetched:", data.length, data);
      setProducts(data);
    } catch (err: any) {
      console.error("fetchProducts error:", err);
      const msg = err?.message ?? "Failed to load products";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  // ✅ Wait for auth to resolve before fetching
  useEffect(() => {
    if (authLoading) return; // wait for Firebase auth to initialize
    if (!user) {
      // not logged in — don't fetch, stop loading
      setLoading(false);
      return;
    }
    refreshProducts(); // user is confirmed logged in → fetch
  }, [authLoading, user, refreshProducts]);

  const getProduct = useCallback(async (id: string) => {
    try {
      return await fetchProduct(id);
    } catch (err: any) {
      console.error("getProduct error:", err);
      toast.error("Failed to fetch product");
      return null;
    }
  }, []);

  const addProduct = useCallback(
    async (formData: ProductFormData) => {
      try {
        const product = await createProduct(formData, user?.uid ?? "");
        setProducts((prev) => [product, ...prev]);
        toast.success("Product created successfully");
        return product;
      } catch (err: any) {
        console.error("addProduct error:", err);
        toast.error(err?.message ?? "Failed to create product");
        throw err;
      }
    },
    [user],
  );

  const editProduct = useCallback(
    async (
      id: string,
      formData: ProductFormData,
      previousImages: string[],
    ) => {
      try {
        const updated = await updateProduct(id, formData, previousImages);
        setProducts((prev) => prev.map((p) => (p.id === id ? updated : p)));
        toast.success("Product updated successfully");
        return updated;
      } catch (err: any) {
        console.error("editProduct error:", err);
        toast.error(err?.message ?? "Failed to update product");
        throw err;
      }
    },
    [],
  );

  const removeProduct = useCallback(async (product: Product) => {
    try {
      await deleteProduct(product);
      setProducts((prev) => prev.filter((p) => p.id !== product.id));
      toast.success("Product deleted");
    } catch (err: any) {
      console.error("removeProduct error:", err);
      toast.error(err?.message ?? "Failed to delete product");
      throw err;
    }
  }, []);

  const softArchive = useCallback(async (id: string) => {
    try {
      await archiveProduct(id);
      setProducts((prev) =>
        prev.map((p) =>
          p.id === id
            ? { ...p, isArchived: true, status: "archived" as const }
            : p,
        ),
      );
      toast.success("Product archived");
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to archive product");
      throw err;
    }
  }, []);

  const toggleActive = useCallback(async (id: string, isActive: boolean) => {
    try {
      await toggleProductActive(id, isActive);
      setProducts((prev) =>
        prev.map((p) => (p.id === id ? { ...p, isActive } : p)),
      );
      toast.success(isActive ? "Product activated" : "Product deactivated");
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to toggle product");
      throw err;
    }
  }, []);

  return (
    <ProductContext.Provider
      value={{
        products,
        loading,
        error,
        refreshProducts,
        getProduct,
        addProduct,
        editProduct,
        removeProduct,
        softArchive,
        toggleActive,
      }}
    >
      {children}
    </ProductContext.Provider>
  );
};

