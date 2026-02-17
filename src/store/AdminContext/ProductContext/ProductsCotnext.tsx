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

// ─── Context shape ────────────────────────────────────────────────────────────
interface ProductContextType {
  // State
  products: Product[];
  loading: boolean;
  error: string | null;

  // CRUD
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

// ─── Provider ─────────────────────────────────────────────────────────────────
export const ProductProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchProducts();
      setProducts(data);
    } catch (err: any) {
      const msg = err?.message ?? "Failed to load products";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load on mount
  useEffect(() => {
    refreshProducts();
  }, [refreshProducts]);

  const getProduct = useCallback(async (id: string) => {
    try {
      return await fetchProduct(id);
    } catch (err: any) {
      toast.error("Failed to fetch product");
      return null;
    }
  }, []);

  const addProduct = useCallback(
    async (formData: ProductFormData) => {
      const product = await createProduct(formData, user?.uid ?? "");
      setProducts((prev) => [product, ...prev]);
      toast.success("Product created successfully");
      return product;
    },
    [user],
  );

  const editProduct = useCallback(
    async (id: string, formData: ProductFormData, previousImages: string[]) => {
      const updated = await updateProduct(id, formData, previousImages);
      setProducts((prev) => prev.map((p) => (p.id === id ? updated : p)));
      toast.success("Product updated successfully");
      return updated;
    },
    [],
  );

  const removeProduct = useCallback(async (product: Product) => {
    await deleteProduct(product);
    setProducts((prev) => prev.filter((p) => p.id !== product.id));
    toast.success("Product deleted");
  }, []);

  const softArchive = useCallback(async (id: string) => {
    await archiveProduct(id);
    setProducts((prev) =>
      prev.map((p) =>
        p.id === id ? { ...p, isArchived: true, status: "archived" } : p,
      ),
    );
    toast.success("Product archived");
  }, []);

  const toggleActive = useCallback(async (id: string, isActive: boolean) => {
    await toggleProductActive(id, isActive);
    setProducts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, isActive } : p)),
    );
    toast.success(isActive ? "Product activated" : "Product deactivated");
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
