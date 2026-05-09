// ─── Auction Support Ticket ────────────────────────────────────────────────────

export type TicketStatus = "open" | "in_progress" | "resolved" | "closed";

export type TicketPriority = "low" | "medium" | "high" | "urgent";

export type TicketCategory =
  | "cant_enter"
  | "payment_issue"
  | "registration_failed"
  | "technical_error"
  | "wrong_fee_charged"
  | "access_denied"
  | "other";

export type AuctionStatus = "live" | "upcoming" | "ended";

export interface SupportTicket {
  id: string;
  // Auction info
  auctionId: string;
  auctionNumber: number;
  auctionStatus: AuctionStatus;
  // Product info
  productId?: string;
  productName?: string;
  // User info
  userId: string;
  userName: string;
  userEmail: string;
  userPhone?: string;
  // Ticket content
  category: TicketCategory;
  subject: string;
  description: string;
  // Optional context
  deviceInfo?: string;
  screenshotUrl?: string;
  // Admin fields
  status: TicketStatus;
  priority: TicketPriority;
  adminNote?: string;
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

// ─── Label Maps ───────────────────────────────────────────────────────────────

export const TICKET_CATEGORY_LABELS: Record<TicketCategory, string> = {
  cant_enter:           "Can't Enter Auction",
  payment_issue:        "Payment Issue",
  registration_failed:  "Registration Failed",
  technical_error:      "Technical / App Error",
  wrong_fee_charged:    "Wrong Fee Charged",
  access_denied:        "Access Denied",
  other:                "Other Issue",
};

export const TICKET_STATUS_LABELS: Record<TicketStatus, string> = {
  open:        "Open",
  in_progress: "In Progress",
  resolved:    "Resolved",
  closed:      "Closed",
};

export const TICKET_PRIORITY_LABELS: Record<TicketPriority, string> = {
  low:    "Low",
  medium: "Medium",
  high:   "High",
  urgent: "Urgent",
};

export const PRIORITY_ORDER: Record<TicketPriority, number> = {
  urgent: 4,
  high:   3,
  medium: 2,
  low:    1,
};

// ─── Style Helpers ────────────────────────────────────────────────────────────

export const getTicketStatusStyle = (status: TicketStatus) => {
  switch (status) {
    case "open":        return { bg: "#FEF3C7", color: "#D97706", label: "Open" };
    case "in_progress": return { bg: "#DBEAFE", color: "#2563EB", label: "In Progress" };
    case "resolved":    return { bg: "#DCFCE7", color: "#16A34A", label: "Resolved" };
    case "closed":      return { bg: "#F1F5F9", color: "#64748B", label: "Closed" };
  }
};

export const getTicketPriorityStyle = (priority: TicketPriority) => {
  switch (priority) {
    case "low":    return { bg: "#F0FDF4", color: "#15803D", label: "Low" };
    case "medium": return { bg: "#FFF7ED", color: "#C2410C", label: "Medium" };
    case "high":   return { bg: "#FEF2F2", color: "#DC2626", label: "High" };
    case "urgent": return { bg: "#4C0519", color: "#FB7185", label: "Urgent" };
  }
};

// ─── Colors ───────────────────────────────────────────────────────────────────

export const colors = {
  primary:      "#2A4863",
  primaryLight: "#3D6A8A",
  primaryDark:  "#1E40AF",
  primaryBg:    "#EFF6FF",
  primaryRing:  "#DBEAFE",
  success:      "#22C55E",
  successBg:    "#DCFCE7",
  error:        "#EF4444",
  errorBg:      "#FEE2E2",
  warning:      "#F97316",
  warningBg:    "#FFEDD5",
  border:       "#E2E8F0",
  muted:        "#F8FAFC",
  textPrimary:  "#0F172A",
  textSecondary: "#64748B",
  textMuted:    "#94A3B8",
};
