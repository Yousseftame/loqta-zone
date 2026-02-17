// ─── Firebase-aligned types ───────────────────────────────────────────────────

export type ProductStatus = "published" | "draft" | "archived";

export interface Product {
  id: string;                  // Firestore document ID
  title: string;
  brand: string;
  model: string;
  category: string;
  description: string;
  price: number;
  availableQuantity: number;
  totalQuantity: number;
  status: ProductStatus;
  isActive: boolean;
  isArchived: boolean;
  features: string[];
  images: string[];            // Storage download URLs
  thumbnail: string | null;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export interface ProductFormData {
  title: string;
  brand: string;
  model: string;
  category: string;
  description: string;
  price: string;
  availableQuantity: string;
  totalQuantity: string;
  status: ProductStatus;
  isActive: boolean;
  features: string[];
  newImages: File[];           // files queued for upload
  existingImages: string[];    // already-uploaded URLs to keep
  thumbnail: string | null;
}

export const STATUSES: ProductStatus[] = ["published", "draft", "archived"];

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

export const getStatusStyle = (status: ProductStatus) => {
  switch (status) {
    case "published": return { bg: "#DCFCE7", color: "#22C55E" };
    case "draft":     return { bg: "#FFEDD5", color: "#F97316" };
    case "archived":  return { bg: "#FEE2E2", color: "#EF4444" };
  }
};

export const avatarPalette = [
  "#2A4863", "#7C3AED", "#0EA5E9", "#10B981",
  "#F59E0B", "#EF4444", "#EC4899", "#8B5CF6",
];

export const getAvatarColor = (name: string) =>
  avatarPalette[name.charCodeAt(0) % avatarPalette.length];

export const DEFAULT_FORM_DATA: ProductFormData = {
  title: "",
  brand: "",
  model: "",
  category: "",
  description: "",
  price: "",
  availableQuantity: "",
  totalQuantity: "",
  status: "draft",
  isActive: true,
  features: [],
  newImages: [],
  existingImages: [],
  thumbnail: null,
};