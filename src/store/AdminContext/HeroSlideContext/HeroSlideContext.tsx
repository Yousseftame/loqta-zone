/**
 * HeroSlideContext.tsx
 *
 * Manages hero slide state for the admin panel.
 * The homepage uses fetchActiveHeroSlides() directly (no context needed — lighter).
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
import type { HeroSlide, HeroSlideFormData } from "@/service/heroSlide/heroSlideService";
import {
  fetchHeroSlides,
  createHeroSlide,
  toggleHeroSlideActive,
  reorderHeroSlides,
  deleteHeroSlide,
} from "@/service/heroSlide/heroSlideService";
import { useAuth } from "@/store/AuthContext/AuthContext";

interface HeroSlideContextType {
  slides: HeroSlide[];
  loading: boolean;
  error: string | null;
  refreshSlides: () => Promise<void>;
  addSlide: (formData: HeroSlideFormData) => Promise<HeroSlide>;
  toggleActive: (id: string, isActive: boolean) => Promise<void>;
  reorder: (orderedIds: string[]) => Promise<void>;
  removeSlide: (slide: HeroSlide) => Promise<void>;
}

const HeroSlideContext = createContext<HeroSlideContextType | undefined>(
  undefined,
);

export const useHeroSlides = () => {
  const ctx = useContext(HeroSlideContext);
  if (!ctx)
    throw new Error("useHeroSlides must be used within HeroSlideProvider");
  return ctx;
};

export const HeroSlideProvider = ({ children }: { children: ReactNode }) => {
  const { user, loading: authLoading } = useAuth();
  const [slides, setSlides] = useState<HeroSlide[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshSlides = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchHeroSlides();
      setSlides(data);
    } catch (err: any) {
      const msg = err?.message ?? "Failed to load hero slides";
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
    async (formData: HeroSlideFormData) => {
      try {
        const slide = await createHeroSlide(formData, user?.uid ?? "");
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
      await toggleHeroSlideActive(id, isActive);
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
      // Optimistic update
      setSlides((prev) => {
        const map = new Map(prev.map((s) => [s.id, s]));
        return orderedIds
          .map((id, index) => ({ ...map.get(id)!, order: index }))
          .filter(Boolean);
      });
      try {
        await reorderHeroSlides(orderedIds);
      } catch (err: any) {
        toast.error("Failed to save order");
        refreshSlides(); // rollback
        throw err;
      }
    },
    [refreshSlides],
  );

  const removeSlide = useCallback(async (slide: HeroSlide) => {
    try {
      await deleteHeroSlide(slide);
      setSlides((prev) => prev.filter((s) => s.id !== slide.id));
      toast.success("Slide deleted");
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to delete slide");
      throw err;
    }
  }, []);

  return (
    <HeroSlideContext.Provider
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
    </HeroSlideContext.Provider>
  );
};
