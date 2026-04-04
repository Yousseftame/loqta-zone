/**
 * RightSectionContext.tsx
 *
 * Manages right section slide state for the admin panel.
 * The homepage uses fetchActiveRightSectionSlides() directly (no context needed — lighter).
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
  RightSectionSlide,
  RightSectionSlideFormData,
} from "@/service/rightSection/rightSectionService";
import {
  fetchRightSectionSlides,
  createRightSectionSlide,
  toggleRightSectionSlideActive,
  reorderRightSectionSlides,
  deleteRightSectionSlide,
} from "@/service/rightSection/rightSectionService";
import { useAuth } from "@/store/AuthContext/AuthContext";

interface RightSectionContextType {
  slides: RightSectionSlide[];
  loading: boolean;
  error: string | null;
  refreshSlides: () => Promise<void>;
  addSlide: (formData: RightSectionSlideFormData) => Promise<RightSectionSlide>;
  toggleActive: (id: string, isActive: boolean) => Promise<void>;
  reorder: (orderedIds: string[]) => Promise<void>;
  removeSlide: (slide: RightSectionSlide) => Promise<void>;
}

const RightSectionContext = createContext<RightSectionContextType | undefined>(
  undefined,
);

export const useRightSectionSlides = () => {
  const ctx = useContext(RightSectionContext);
  if (!ctx)
    throw new Error(
      "useRightSectionSlides must be used within RightSectionProvider",
    );
  return ctx;
};

export const RightSectionProvider = ({ children }: { children: ReactNode }) => {
  const { user, loading: authLoading } = useAuth();
  const [slides, setSlides] = useState<RightSectionSlide[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshSlides = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchRightSectionSlides();
      setSlides(data);
    } catch (err: any) {
      const msg = err?.message ?? "Failed to load right section slides";
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
    async (formData: RightSectionSlideFormData) => {
      try {
        const slide = await createRightSectionSlide(formData, user?.uid ?? "");
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
      await toggleRightSectionSlideActive(id, isActive);
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
        await reorderRightSectionSlides(orderedIds);
      } catch (err: any) {
        toast.error("Failed to save order");
        refreshSlides();
        throw err;
      }
    },
    [refreshSlides],
  );

  const removeSlide = useCallback(async (slide: RightSectionSlide) => {
    try {
      await deleteRightSectionSlide(slide);
      setSlides((prev) => prev.filter((s) => s.id !== slide.id));
      toast.success("Slide deleted");
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to delete slide");
      throw err;
    }
  }, []);

  return (
    <RightSectionContext.Provider
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
    </RightSectionContext.Provider>
  );
};
