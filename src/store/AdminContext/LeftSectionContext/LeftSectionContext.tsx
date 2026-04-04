/**
 * LeftSectionContext.tsx
 *
 * Manages left section slide state for the admin panel.
 * The homepage uses fetchActiveLeftSectionSlides() directly (no context needed — lighter).
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
  LeftSectionSlide,
  LeftSectionSlideFormData,
} from "@/service/leftSection/leftSectionService";
import {
  fetchLeftSectionSlides,
  createLeftSectionSlide,
  toggleLeftSectionSlideActive,
  reorderLeftSectionSlides,
  deleteLeftSectionSlide,
} from "@/service/leftSection/leftSectionService";
import { useAuth } from "@/store/AuthContext/AuthContext";

interface LeftSectionContextType {
  slides: LeftSectionSlide[];
  loading: boolean;
  error: string | null;
  refreshSlides: () => Promise<void>;
  addSlide: (formData: LeftSectionSlideFormData) => Promise<LeftSectionSlide>;
  toggleActive: (id: string, isActive: boolean) => Promise<void>;
  reorder: (orderedIds: string[]) => Promise<void>;
  removeSlide: (slide: LeftSectionSlide) => Promise<void>;
}

const LeftSectionContext = createContext<LeftSectionContextType | undefined>(
  undefined,
);

export const useLeftSectionSlides = () => {
  const ctx = useContext(LeftSectionContext);
  if (!ctx)
    throw new Error(
      "useLeftSectionSlides must be used within LeftSectionProvider",
    );
  return ctx;
};

export const LeftSectionProvider = ({ children }: { children: ReactNode }) => {
  const { user, loading: authLoading } = useAuth();
  const [slides, setSlides] = useState<LeftSectionSlide[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshSlides = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchLeftSectionSlides();
      setSlides(data);
    } catch (err: any) {
      const msg = err?.message ?? "Failed to load left section slides";
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
    refreshSlides();
  }, [authLoading, user, refreshSlides]);

  const addSlide = useCallback(
    async (formData: LeftSectionSlideFormData) => {
      try {
        const slide = await createLeftSectionSlide(formData, user?.uid ?? "");
        setSlides((prev) => [...prev, slide].sort((a, b) => a.order - b.order));
        toast.success("Slide added successfully");
        return slide;
      } catch (err: any) {
        toast.error(err?.message ?? "Failed to add slide");
        throw err;
      }
    },
    [user],
  );

  const toggleActive = useCallback(async (id: string, isActive: boolean) => {
    try {
      await toggleLeftSectionSlideActive(id, isActive);
      setSlides((prev) =>
        prev.map((s) => (s.id === id ? { ...s, isActive } : s)),
      );
      toast.success(isActive ? "Slide activated" : "Slide hidden");
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to toggle slide");
      throw err;
    }
  }, []);

  const reorder = useCallback(
    async (orderedIds: string[]) => {
      setSlides((prev) => {
        const map = new Map(prev.map((s) => [s.id, s]));
        return orderedIds
          .map((id, index) => ({ ...map.get(id)!, order: index }))
          .filter(Boolean);
      });
      try {
        await reorderLeftSectionSlides(orderedIds);
      } catch (err: any) {
        toast.error("Failed to save order");
        refreshSlides();
        throw err;
      }
    },
    [refreshSlides],
  );

  const removeSlide = useCallback(async (slide: LeftSectionSlide) => {
    try {
      await deleteLeftSectionSlide(slide);
      setSlides((prev) => prev.filter((s) => s.id !== slide.id));
      toast.success("Slide deleted");
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to delete slide");
      throw err;
    }
  }, []);

  return (
    <LeftSectionContext.Provider
      value={{
        slides,
        loading,
        error,
        refreshSlides,
        addSlide,
        toggleActive,
        reorder,
        removeSlide,
      }}
    >
      {children}
    </LeftSectionContext.Provider>
  );
};
