// ─── Firebase-aligned types ───────────────────────────────────────────────────

export type RequestStatus = "pending" | "reviewed" | "matched" | "rejected";
export type RequestUrgency = "flexible" | "soon" | "urgent";

export interface AuctionRequest {
  id: string;
  userId: string;
  productName: string;
  category: string;
  budget: string;
  notes: string;
  urgency: RequestUrgency;
  status: RequestStatus;
  matchedAuctionId: string | null;
  createdAt: Date;
  updatedAt?: Date;
}

export interface AuctionRequestFormData {
  status: RequestStatus;
  matchedAuctionId: string;
  notes: string;
}

export const REQUEST_STATUS_OPTIONS: RequestStatus[] = [
  "pending",
  "reviewed",
  "matched",
  "rejected",
];

export const REQUEST_URGENCY_LABELS: Record<RequestUrgency, string> = {
  flexible: "Flexible",
  soon: "Soon",
  urgent: "Urgent",
};

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

export function getStatusStyle(status: RequestStatus): {
  bg: string;
  color: string;
  label: string;
} {
  switch (status) {
    case "pending":
      return { bg: "#FEF3C7", color: "#D97706", label: "Pending" };
    case "reviewed":
      return { bg: "#DBEAFE", color: "#2563EB", label: "Reviewed" };
    case "matched":
      return { bg: "#DCFCE7", color: "#16A34A", label: "Matched" };
    case "rejected":
      return { bg: "#FEE2E2", color: "#DC2626", label: "Rejected" };
  }
}

export function getUrgencyStyle(urgency: RequestUrgency): {
  bg: string;
  color: string;
} {
  switch (urgency) {
    case "flexible":
      return { bg: "#F0FDF4", color: "#15803D" };
    case "soon":
      return { bg: "#FEF9C3", color: "#A16207" };
    case "urgent":
      return { bg: "#FEE2E2", color: "#DC2626" };
  }
}