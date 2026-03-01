// ─── Contact Message ──────────────────────────────────────────────────────────

export type ContactStatus = "new" | "seen" | "replied";

export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
  status: ContactStatus;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Feedback ─────────────────────────────────────────────────────────────────

export type FeedbackStatus = "new" | "seen";

export interface FeedbackMessage {
  id: string;
  name: string;
  email: string;
  category: string;
  rating: number;
  title: string;
  feedback: string;
  recommend: string;
  status: FeedbackStatus;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Colors (shared) ──────────────────────────────────────────────────────────

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
  border: "#E2E8F0",
  muted: "#F8FAFC",
  textPrimary: "#0F172A",
  textSecondary: "#64748B",
  textMuted: "#94A3B8",
};

export const getContactStatusStyle = (status: ContactStatus) => {
  switch (status) {
    case "new":
      return { bg: "#FEF3C7", color: "#D97706", label: "New" };
    case "seen":
      return { bg: "#DBEAFE", color: "#2563EB", label: "Seen" };
    case "replied":
      return { bg: "#DCFCE7", color: "#16A34A", label: "Replied" };
  }
};

export const getFeedbackStatusStyle = (status: FeedbackStatus) => {
  switch (status) {
    case "new":
      return { bg: "#FEF3C7", color: "#D97706", label: "New" };
    case "seen":
      return { bg: "#DBEAFE", color: "#2563EB", label: "Seen" };
  }
};

export const SUBJECT_LABELS: Record<string, string> = {
  general: "General Inquiry",
  auction: "Auction Question",
  payment: "Payment Issue",
  delivery: "Delivery Support",
  promo: "Promo Codes",
  other: "Other",
};

export const FEEDBACK_CATEGORY_LABELS: Record<string, string> = {
  auction: "Auction Experience",
  platform: "Platform & App",
  delivery: "Delivery & Packaging",
  support: "Customer Support",
  payment: "Payment Process",
  general: "General Experience",
};

export const STAR_LABELS = ["", "Poor", "Fair", "Good", "Great", "Excellent"];