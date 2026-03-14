/**
 * src/permissions/permissions-data.ts
 *
 * Single source of truth for all admin module permissions.
 *
 * DESIGN:
 *  - Each module has up to 4 CRUD operations: create, read, update, delete
 *  - superAdmin always has full access — permissions are not stored / checked for them
 *  - admin accounts get a `permissions` map in their Firestore doc
 *  - The `can(module, action)` helper is used everywhere in the UI
 *
 * MODULES:
 *  categories, products, auctions, vouchers, auctionRequests,
 *  contacts, feedback, bids, participants, lastOffers,
 *  users, scheduling, payment
 *  (admins is superAdmin-only and never appears in permissions)
 */

export type PermissionAction = "create" | "read" | "update" | "delete";

export interface ModulePermissions {
  create: boolean;
  read:   boolean;
  update: boolean;
  delete: boolean;
}

// All modules an admin can be granted access to
export type PermissionModule =
  | "categories"
  | "products"
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
  | "payment";

export type AdminPermissions = Record<PermissionModule, ModulePermissions>;

// Human-readable labels shown in the permissions UI
export interface ModuleMeta {
  key: PermissionModule;
  label: string;
  icon: string; // emoji for quick visual scanning
  // Which actions are meaningful for this module (some are read-only by nature)
  actions: PermissionAction[];
}

export const MODULE_META: ModuleMeta[] = [
  { key: "categories",      label: "Categories",        icon: "🗂️",  actions: ["create","read","update","delete"] },
  { key: "products",        label: "Products",          icon: "📦",  actions: ["create","read","update","delete"] },
  { key: "auctions",        label: "Auctions",          icon: "🔨",  actions: ["create","read","update","delete"] },
  { key: "vouchers",        label: "Vouchers",          icon: "🎟️",  actions: ["create","read","update","delete"] },
  { key: "auctionRequests", label: "Auction Requests",  icon: "📋",  actions: ["read","update"] },
  { key: "contacts",        label: "Contacts",          icon: "💬",  actions: ["read","update","delete"] },
  { key: "feedback",        label: "Feedback",          icon: "⭐",  actions: ["read","update","delete"] },
  { key: "bids",            label: "Bids",              icon: "💰",  actions: ["read","update","delete"] },
  { key: "participants",    label: "Participants",       icon: "👥",  actions: ["read","delete"] },
  { key: "lastOffers",      label: "Last Offers",       icon: "🏷️",  actions: ["read","update","delete"] },
  { key: "users",           label: "Users",             icon: "👤",  actions: ["read","update","delete"] },
  { key: "scheduling",      label: "Scheduling",        icon: "📅",  actions: ["read","update"] },
  { key: "payment",         label: "Payments",          icon: "💳",  actions: ["read"] },
];

/** Full access — used as the base for superAdmin and the "Grant All" helper */
export function fullPermissions(): AdminPermissions {
  const result = {} as AdminPermissions;
  for (const m of MODULE_META) {
    result[m.key] = { create: true, read: true, update: true, delete: true };
  }
  return result;
}

/** No access — used as the starting point when building a new admin's permissions */
export function emptyPermissions(): AdminPermissions {
  const result = {} as AdminPermissions;
  for (const m of MODULE_META) {
    result[m.key] = { create: false, read: false, update: false, delete: false };
  }
  return result;
}

/**
 * Merge a partial permissions map with the empty baseline.
 * Handles legacy docs that were created before the permissions field existed.
 */
export function normalizePermissions(raw: Partial<AdminPermissions> | null | undefined): AdminPermissions {
  const base = emptyPermissions();
  if (!raw) return base;
  for (const m of MODULE_META) {
    if (raw[m.key]) {
      base[m.key] = {
        create: raw[m.key]?.create ?? false,
        read:   raw[m.key]?.read   ?? false,
        update: raw[m.key]?.update ?? false,
        delete: raw[m.key]?.delete ?? false,
      };
    }
  }
  return base;
}