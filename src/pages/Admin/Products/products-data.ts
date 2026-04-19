// ─── Firebase-aligned types ───────────────────────────────────────────────────

export interface LocalizedString {
  en: string;
  ar: string;
}

export interface Product {
  id: string;
  title: LocalizedString;        // ← was string
  brand: string;
  model: string;
  category: string;
  supplierId: string;
  description: LocalizedString;  // ← was string
  price: number;
  actualPrice: number;           // cost price — admin panel only
  quantity: number;
  isActive: boolean;
  isArchived: boolean;
  features: LocalizedString[];   // ← was string[]
  images: string[];
  thumbnail: string | null;
  totalAuctions: number;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export interface ProductFormData {
  titleEn: string;               // ← was title: string
  titleAr: string;               // ← new
  brand: string;
  model: string;
  category: string;
  supplierId: string;
  descriptionEn: string;         // ← was description: string
  descriptionAr: string;         // ← new
  price: string;
  actualPrice: string;
  quantity: string;
  isActive: boolean;
  featuresEn: string[];          // ← was features: string[]
  featuresAr: string[];          // ← new
  newImages: File[];
  existingImages: string[];
  thumbnail: string | null;
}

export const colors = {
  primary: "#2A4863",
  primaryLight: "#3D6A8A",
  primaryDark: "#1E40AF",
  primaryBg: "#EFF6FF",
  primaryRing: "#DBEAFE",
  success: "#22C55E",
  successBg: "#DCFCE7",
  error: "#EF4444",
  errorBg: "#FEE2E2",
  warning: "#F97316",
  warningBg: "#FFEDD5",
  accent: "#F59E0B",
  accentBg: "#FEF3C7",
  surface: "#FFFFFF",
  border: "#E2E8F0",
  muted: "#F8FAFC",
  textPrimary: "#0F172A",
  textSecondary: "#64748B",
  textMuted: "#94A3B8",
};

export const avatarPalette = [
  "#2A4863", "#7C3AED", "#0EA5E9", "#10B981",
  "#F59E0B", "#EF4444", "#EC4899", "#8B5CF6",
];

export const getAvatarColor = (name: string) =>
  avatarPalette[name.charCodeAt(0) % avatarPalette.length];

export const DEFAULT_FORM_DATA: ProductFormData = {
  titleEn: "",
  titleAr: "",
  brand: "",
  model: "",
  category: "",
  supplierId: "",
  descriptionEn: "",
  descriptionAr: "",
  price: "",
  actualPrice: "",
  quantity: "",
  isActive: true,
  featuresEn: [],
  featuresAr: [],
  newImages: [],
  existingImages: [],
  thumbnail: null,
};

// ─── Helper: resolve localised string safely ──────────────────────────────────
// Used wherever a plain string is needed (analytics, notifications, display).

export function resolveTitle(
  title: LocalizedString | string | undefined | null,
  lang: "en" | "ar" = "en",
): string {
  if (!title) return "";
  if (typeof title === "string") return title;          // legacy doc
  return title[lang] || title.en || title.ar || "";
}