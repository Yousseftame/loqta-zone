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

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setLoading(false);
      return;
    }
    refreshProducts();
  }, [authLoading, user, refreshProducts]);

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
      try {
        const product = await createProduct(formData, user?.uid ?? "");
        setProducts((prev) => [product, ...prev]);
        toast.success("Product created successfully");
        return product;
      } catch (err: any) {
        toast.error(err?.message ?? "Failed to create product");
        throw err;
      }
    },
    [user],
  );

  const editProduct = useCallback(
    async (id: string, formData: ProductFormData, previousImages: string[]) => {
      try {
        // Save to Firestore + Storage
        await updateProduct(id, formData, previousImages);
        // Re-fetch from Firestore to get real saved URLs (guarantees thumbnail is correct)
        const fresh = await fetchProduct(id);
        if (!fresh) throw new Error("Failed to reload product after update");
        // Update the list with the freshly-fetched product — no page reload needed
        setProducts((prev) => prev.map((p) => (p.id === id ? fresh : p)));
        toast.success("Product updated successfully");
        return fresh;
      } catch (err: any) {
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
      toast.error(err?.message ?? "Failed to delete product");
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
        toggleActive,
      }}
    >
      {children}
    </ProductContext.Provider>
  );
};
