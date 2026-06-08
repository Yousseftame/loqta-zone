/**
 * audit-log-data.ts
 *
 * Single source of truth for audit log types, action categories,
 * and entity definitions used across the logging system.
 */

// ─── Action Types ─────────────────────────────────────────────────────────────

export type AuditActionType =
  // Auth
  | "LOGIN"
  | "LOGOUT"
  | "REGISTER"
  | "PASSWORD_RESET_REQUEST"
  | "PASSWORD_CHANGED"
  | "EMAIL_VERIFIED"
  // Auctions
  | "AUCTION_JOIN"
  | "AUCTION_VIEW"
  | "BID_PLACED"
  | "LAST_OFFER_SUBMITTED"
  | "AUCTION_REQUEST_SUBMITTED"
  // Profile
  | "PROFILE_UPDATED"
  // Contact & Feedback  ← NEW
  | "CONTACT_SUBMITTED"
  | "FEEDBACK_SUBMITTED"
  // Guest
  | "GUEST_VISIT"
  | "GUEST_PAGE_VIEW"
  // Admin
  | "ADMIN_LOGIN"
  | "ADMIN_LOGOUT"
  | "ADMIN_AUCTION_CREATED"
  | "ADMIN_AUCTION_UPDATED"
  | "ADMIN_AUCTION_DELETED"
  | "ADMIN_AUCTION_TOGGLED"
  | "ADMIN_PRODUCT_CREATED"
  | "ADMIN_PRODUCT_UPDATED"
  | "ADMIN_PRODUCT_DELETED"
  | "ADMIN_USER_BLOCKED"
  | "ADMIN_USER_UNBLOCKED"
  | "ADMIN_USER_ROLE_CHANGED"
  | "ADMIN_VOUCHER_CREATED"
  | "ADMIN_VOUCHER_UPDATED"
  | "ADMIN_VOUCHER_DELETED"
  | "ADMIN_CATEGORY_CREATED"
  | "ADMIN_CATEGORY_UPDATED"
  | "ADMIN_CATEGORY_DELETED"
  | "ADMIN_LAST_OFFER_ACCEPTED"
  | "ADMIN_LAST_OFFER_REJECTED"
  | "ADMIN_BID_DELETED"
  | "ADMIN_PARTICIPANT_REMOVED"
  // Admin — Finance / Transactions
  | "ADMIN_TRANSACTION_CREATED"
  | "ADMIN_TRANSACTION_UPDATED"
  | "ADMIN_TRANSACTION_DELETED"
  | "ADMIN_OWNER_CREATED"
  | "ADMIN_OWNER_DELETED"
  | "ADMIN_PAYMENT_ACCOUNT_CREATED"
  | "ADMIN_PAYMENT_ACCOUNT_UPDATED"
  | "ADMIN_PAYMENT_ACCOUNT_ARCHIVED"
  | "ADMIN_PAYMENT_ACCOUNT_DEFAULT_SET"
  // Admin — Purchases
  | "ADMIN_PURCHASE_CREATED"
  | "ADMIN_PURCHASE_UPDATED"
  | "ADMIN_PURCHASE_DELETED"
  | "ADMIN_PURCHASE_STATUS_CHANGED"
  | "ADMIN_PURCHASE_PAYMENT_RECORDED"
  | "ADMIN_PURCHASE_MARKED_PAID";

// ─── Action Category (for color coding) ──────────────────────────────────────

export type AuditActionCategory =
  | "auth"        // blue
  | "auction"     // gold
  | "profile"     // purple
  | "guest"       // gray
  | "admin"       // red/orange
  | "contact"     // teal  ← NEW
  | "system";     // teal

// ─── Entity Types ─────────────────────────────────────────────────────────────

export type AuditEntityType =
  | "User"
  | "Auction"
  | "Product"
  | "Bid"
  | "LastOffer"
  | "Voucher"
  | "Category"
  | "AuctionRequest"
  | "ContactMessage"
  | "FeedbackMessage"
  | "Transaction"
  | "Purchase"
  | "Owner"
  | "PaymentAccount"
  | "System"
  | "Page";

// ─── Change record (before/after diff) ───────────────────────────────────────

export interface AuditChange {
  field: string;
  before: any;
  after: any;
}

// ─── Actor (who performed the action) ────────────────────────────────────────

export interface AuditActor {
  userId: string | null;
  name: string;
  email: string;
  role: "user" | "admin" | "superAdmin" | "guest";
}

// ─── Full audit log document ──────────────────────────────────────────────────

export interface AuditLog {
  id: string;

  // WHO
  actor: AuditActor;

  // WHAT
  action: AuditActionType;
  category: AuditActionCategory;
  description: string;          // human-readable summary
  changes?: AuditChange[];      // before/after diffs

  // WHERE
  entityType: AuditEntityType;
  entityId?: string;
  entityName?: string;
  route?: string;               // page path e.g. "/auctions/abc"

  // WHEN
  timestamp: Date;

  // META
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
  deviceId?: string;
  port?: string;

  // STATUS
  status: "success" | "warning" | "danger" | "info";
}

// ─── Payload for creating a new log (id/timestamp handled by service) ─────────

export type CreateAuditLogPayload = Omit<AuditLog, "id" | "timestamp">;

// ─── Action → Category mapping ────────────────────────────────────────────────

export const ACTION_CATEGORY_MAP: Record<AuditActionType, AuditActionCategory> = {
  LOGIN:                        "auth",
  LOGOUT:                       "auth",
  REGISTER:                     "auth",
  PASSWORD_RESET_REQUEST:       "auth",
  PASSWORD_CHANGED:             "auth",
  EMAIL_VERIFIED:               "auth",
  AUCTION_JOIN:                 "auction",
  AUCTION_VIEW:                 "auction",
  BID_PLACED:                   "auction",
  LAST_OFFER_SUBMITTED:         "auction",
  AUCTION_REQUEST_SUBMITTED:    "auction",
  PROFILE_UPDATED:              "profile",
  CONTACT_SUBMITTED:            "contact",   
  FEEDBACK_SUBMITTED:           "contact",  
  GUEST_VISIT:                  "guest",
  GUEST_PAGE_VIEW:              "guest",
  ADMIN_LOGIN:                   "admin",
  ADMIN_LOGOUT:                  "admin",
  ADMIN_AUCTION_CREATED:        "admin",
  ADMIN_AUCTION_UPDATED:        "admin",
  ADMIN_AUCTION_DELETED:        "admin",
  ADMIN_PRODUCT_CREATED:        "admin",
  ADMIN_PRODUCT_UPDATED:        "admin",
  ADMIN_PRODUCT_DELETED:        "admin",
  ADMIN_USER_BLOCKED:           "admin",
  ADMIN_USER_UNBLOCKED:         "admin",
  ADMIN_USER_ROLE_CHANGED:      "admin",
  ADMIN_VOUCHER_CREATED:        "admin",
  ADMIN_VOUCHER_UPDATED:        "admin",
  ADMIN_VOUCHER_DELETED:        "admin",
  ADMIN_CATEGORY_CREATED:       "admin",
  ADMIN_CATEGORY_UPDATED:       "admin",
  ADMIN_CATEGORY_DELETED:       "admin",
  ADMIN_LAST_OFFER_ACCEPTED:    "admin",
  ADMIN_LAST_OFFER_REJECTED:    "admin",
  ADMIN_BID_DELETED:            "admin",
  ADMIN_PARTICIPANT_REMOVED:    "admin",
  ADMIN_AUCTION_TOGGLED:        "admin",
  ADMIN_TRANSACTION_CREATED:    "admin",
  ADMIN_TRANSACTION_UPDATED:    "admin",
  ADMIN_TRANSACTION_DELETED:    "admin",
  ADMIN_OWNER_CREATED:          "admin",
  ADMIN_OWNER_DELETED:          "admin",
  ADMIN_PAYMENT_ACCOUNT_CREATED:    "admin",
  ADMIN_PAYMENT_ACCOUNT_UPDATED:    "admin",
  ADMIN_PAYMENT_ACCOUNT_ARCHIVED: "admin",
  ADMIN_PAYMENT_ACCOUNT_DEFAULT_SET: "admin",
  ADMIN_PURCHASE_CREATED:       "admin",
  ADMIN_PURCHASE_UPDATED:       "admin",
  ADMIN_PURCHASE_DELETED:       "admin",
  ADMIN_PURCHASE_STATUS_CHANGED:    "admin",
  ADMIN_PURCHASE_PAYMENT_RECORDED:  "admin",
  ADMIN_PURCHASE_MARKED_PAID:       "admin",
};

// ─── Action → Status mapping ──────────────────────────────────────────────────

export const ACTION_STATUS_MAP: Record<AuditActionType, AuditLog["status"]> = {
  LOGIN:                        "success",
  LOGOUT:                       "info",
  REGISTER:                     "success",
  PASSWORD_RESET_REQUEST:       "warning",
  PASSWORD_CHANGED:             "warning",
  EMAIL_VERIFIED:               "success",
  AUCTION_JOIN:                 "success",
  AUCTION_VIEW:                 "info",
  BID_PLACED:                   "success",
  LAST_OFFER_SUBMITTED:         "success",
  AUCTION_REQUEST_SUBMITTED:    "info",
  PROFILE_UPDATED:              "info",
  CONTACT_SUBMITTED:            "info",   
  FEEDBACK_SUBMITTED:           "info",   
  GUEST_VISIT:                  "info",
  GUEST_PAGE_VIEW:              "info",
  ADMIN_LOGIN:                  "success",
  ADMIN_LOGOUT:           "info",
  ADMIN_AUCTION_CREATED:        "success",
  ADMIN_AUCTION_UPDATED:        "warning",
  ADMIN_AUCTION_DELETED:        "danger",
  ADMIN_PRODUCT_CREATED:        "success",
  ADMIN_PRODUCT_UPDATED:        "warning",
  ADMIN_PRODUCT_DELETED:        "danger",
  ADMIN_USER_BLOCKED:           "danger",
  ADMIN_USER_UNBLOCKED:         "warning",
  ADMIN_USER_ROLE_CHANGED:      "warning",
  ADMIN_VOUCHER_CREATED:        "success",
  ADMIN_VOUCHER_UPDATED:        "warning",
  ADMIN_VOUCHER_DELETED:        "danger",
  ADMIN_CATEGORY_CREATED:       "success",
  ADMIN_CATEGORY_UPDATED:       "warning",
  ADMIN_CATEGORY_DELETED:       "danger",
  ADMIN_LAST_OFFER_ACCEPTED:    "success",
  ADMIN_LAST_OFFER_REJECTED:    "danger",
  ADMIN_BID_DELETED:            "danger",
  ADMIN_PARTICIPANT_REMOVED:    "danger",
  ADMIN_AUCTION_TOGGLED:        "info",
  ADMIN_TRANSACTION_CREATED:    "success",
  ADMIN_TRANSACTION_UPDATED:    "warning",
  ADMIN_TRANSACTION_DELETED:    "danger",
  ADMIN_OWNER_CREATED:          "success",
  ADMIN_OWNER_DELETED:          "danger",
  ADMIN_PAYMENT_ACCOUNT_CREATED:    "success",
  ADMIN_PAYMENT_ACCOUNT_UPDATED:    "warning",
  ADMIN_PAYMENT_ACCOUNT_ARCHIVED:   "warning",
  ADMIN_PAYMENT_ACCOUNT_DEFAULT_SET: "info",
  ADMIN_PURCHASE_CREATED:       "success",
  ADMIN_PURCHASE_UPDATED:       "warning",
  ADMIN_PURCHASE_DELETED:       "danger",
  ADMIN_PURCHASE_STATUS_CHANGED:    "warning",
  ADMIN_PURCHASE_PAYMENT_RECORDED:  "success",
  ADMIN_PURCHASE_MARKED_PAID:       "success",
};

// ─── Category UI config ───────────────────────────────────────────────────────

export const CATEGORY_CONFIG: Record<
  AuditActionCategory,
  { label: string; color: string; bg: string; border: string }
> = {
  auth:    { label: "Auth",    color: "#3B82F6", bg: "#EFF6FF", border: "#BFDBFE" },
  auction: { label: "Auction", color: "#B45309", bg: "#FFFBEB", border: "#FDE68A" },
  profile: { label: "Profile", color: "#7C3AED", bg: "#F5F3FF", border: "#DDD6FE" },
  guest:   { label: "Guest",   color: "#6B7280", bg: "#F9FAFB", border: "#E5E7EB" },
  admin:   { label: "Admin",   color: "#DC2626", bg: "#FEF2F2", border: "#FECACA" },
  contact: { label: "Contact", color: "#0D9488", bg: "#F0FDFA", border: "#99F6E4" }, 
  system:  { label: "System",  color: "#0D9488", bg: "#F0FDFA", border: "#99F6E4" },
};

// ─── Status UI config ─────────────────────────────────────────────────────────

export const STATUS_CONFIG: Record<
  AuditLog["status"],
  { label: string; color: string; bg: string; dot: string }
> = {
  success: { label: "Success", color: "#16A34A", bg: "#DCFCE7", dot: "#22C55E" },
  warning: { label: "Warning", color: "#D97706", bg: "#FEF3C7", dot: "#F59E0B" },
  danger:  { label: "Danger",  color: "#DC2626", bg: "#FEE2E2", dot: "#EF4444" },
  info:    { label: "Info",    color: "#2563EB", bg: "#DBEAFE", dot: "#3B82F6" },
};

// ─── Quick filter presets ─────────────────────────────────────────────────────

export interface QuickFilter {
  key: string;
  label: string;
  description: string;
}

export const QUICK_FILTERS: QuickFilter[] = [
  { key: "today",         label: "Today",       description: "Logs from today"             },
  { key: "last7days",     label: "Last 7 Days", description: "Logs from last 7 days"       },
  { key: "admin_only",    label: "Admin Only",  description: "All admin actions"           },
  { key: "danger_only",   label: "Errors",      description: "Danger/warning actions"      },
  { key: "auth_only",     label: "Auth Events", description: "Login/logout/register"       },
  { key: "contact_only",  label: "Contact",     description: "Contact & feedback forms"    },
  { key: "auction_admin", label: "Auctions",    description: "Admin auction CRUD actions"  },
  { key: "finance_only",  label: "Finance",     description: "Finance transaction logs"    },
  { key: "purchase_only", label: "Purchases",   description: "Purchase order logs"         },
];

// ─── Default/empty audit log for UI placeholders ──────────────────────────────

export const DEFAULT_AUDIT_FILTERS = {
  search:     "",
  action:     "" as AuditActionType | "",
  category:   "" as AuditActionCategory | "",
  role:       "" as AuditActor["role"] | "",
  status:     "" as AuditLog["status"] | "",
  dateFrom:   "",
  dateTo:     "",
  quickFilter: "" as string,
};

export type AuditFilters = typeof DEFAULT_AUDIT_FILTERS;