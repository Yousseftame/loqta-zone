/**
 * src/permissions/permissions-data.ts
 *
 * Single source of truth for all admin module permissions.
 */

export type PermissionAction = "create" | "read" | "update" | "delete" | "pay";

export interface ModulePermissions {
  create: boolean;
  read: boolean;
  update: boolean;
  delete: boolean;
  /** Record / edit / reverse purchase payments (Purchases module only). */
  pay: boolean;
}

export type PermissionModule =
  | "categories"
  | "products"
  | "purchases"
  | "auctions"
  | "vouchers"
  | "auctionRequests"
  | "contacts"
  | "feedback"
  | "bids"
  | "participants"
  | "lastOffers"
  | "users"
  | "scheduling"
  | "payment"
  | "auditLogs"
  | "tickets"
  | "suppliers";

export type AdminPermissions = Record<PermissionModule, ModulePermissions>;

export interface ModuleMeta {
  key: PermissionModule;
  label: string;
  icon: string;
  actions: PermissionAction[];
}

export const MODULE_META: ModuleMeta[] = [
  { key: "categories", label: "Categories", icon: "🗂️", actions: ["create", "read", "update", "delete"] },
  { key: "products", label: "Products", icon: "📦", actions: ["create", "read", "update", "delete"] },
  {
    key: "purchases",
    label: "Purchases",
    icon: "🛒",
    actions: ["create", "read", "update", "delete", "pay"],
  },
  { key: "auctions", label: "Auctions", icon: "🔨", actions: ["create", "read", "update", "delete"] },
  { key: "vouchers", label: "Vouchers", icon: "🎟️", actions: ["create", "read", "update", "delete"] },
  { key: "auctionRequests", label: "Auction Requests", icon: "📋", actions: ["read", "update"] },
  { key: "contacts", label: "Contacts", icon: "💬", actions: ["read", "update", "delete"] },
  { key: "feedback", label: "Feedback", icon: "⭐", actions: ["read", "update", "delete"] },
  { key: "bids", label: "Bids", icon: "💰", actions: ["read", "update", "delete"] },
  { key: "participants", label: "Participants", icon: "👥", actions: ["read", "delete"] },
  { key: "lastOffers", label: "Last Offers", icon: "🏷️", actions: ["read", "update", "delete"] },
  { key: "users", label: "Users", icon: "👤", actions: ["read", "update", "delete"] },
  { key: "tickets", label: "Support Tickets", icon: "🎫", actions: ["read", "update", "delete"] },
  { key: "suppliers", label: "Suppliers", icon: "🏢", actions: ["create", "read", "update", "delete"] },
];

function blankModule(): ModulePermissions {
  return { create: false, read: false, update: false, delete: false, pay: false };
}

function fullModule(): ModulePermissions {
  return { create: true, read: true, update: true, delete: true, pay: true };
}

/** Full access — used as the base for superAdmin and the "Grant All" helper */
export function fullPermissions(): AdminPermissions {
  const result = {} as AdminPermissions;
  for (const m of MODULE_META) {
    result[m.key] = fullModule();
  }
  return result;
}

/** No access — used as the starting point when building a new admin's permissions */
export function emptyPermissions(): AdminPermissions {
  const result = {} as AdminPermissions;
  for (const m of MODULE_META) {
    result[m.key] = blankModule();
  }
  return result;
}

/**
 * Merge a partial permissions map with the empty baseline.
 * Handles legacy docs that were created before the permissions field / pay action existed.
 */
export function normalizePermissions(
  raw: Partial<AdminPermissions> | null | undefined,
): AdminPermissions {
  const base = emptyPermissions();
  if (!raw) return base;
  for (const m of MODULE_META) {
    if (raw[m.key]) {
      base[m.key] = {
        create: raw[m.key]?.create ?? false,
        read: raw[m.key]?.read ?? false,
        update: raw[m.key]?.update ?? false,
        delete: raw[m.key]?.delete ?? false,
        pay: raw[m.key]?.pay ?? false,
      };
    }
  }
  return base;
}
