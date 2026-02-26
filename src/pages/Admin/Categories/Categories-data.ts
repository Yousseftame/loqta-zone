// ─── Firebase-aligned types ───────────────────────────────────────────────────

export interface Category {
  id: string;
  name: {
    en: string;
    ar: string;
  };
  description: {
    en: string;
    ar: string;
  };
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export interface CategoryFormData {
  nameEn: string;
  nameAr: string;
  descriptionEn: string;
  descriptionAr: string;
  isActive: boolean;
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
  surface: "#FFFFFF",
  border: "#E2E8F0",
  muted: "#F8FAFC",
  textPrimary: "#0F172A",
  textSecondary: "#64748B",
  textMuted: "#94A3B8",
};

export const DEFAULT_CATEGORY_FORM: CategoryFormData = {
  nameEn: "",
  nameAr: "",
  descriptionEn: "",
  descriptionAr: "",
  isActive: true,
};