/**
 * auditLogger.ts
 *
 * THE single utility imported across the codebase to log events.
 * All other files call logger.xxx() — never writeAuditLog() directly.
 *
 * Design:
 * - Zero dependencies on React/hooks — works in services, hooks, components
 * - Detects browser context for userAgent automatically
 * - Fire-and-forget: never throws, never blocks the caller
 * - IP detection via ipify (graceful fallback if unavailable)
 *
 * Usage example:
 *   import { auditLogger } from "@/service/audit/auditLogger";
 *
 *   auditLogger.login({ userId: user.uid, name: "John", email: "john@x.com", role: "user" });
 *   auditLogger.bidPlaced(actor, auctionId, "iPhone 15", 5000);
 *   auditLogger.adminUserBlocked(adminActor, targetUserId, "Jane");
 */

import { writeAuditLog } from "./auditLogService";
import {
  ACTION_CATEGORY_MAP,
  ACTION_STATUS_MAP,
} from "./audit-log-data";
import type {
  AuditActor,
  AuditActionType,
  AuditEntityType,
  AuditChange,
  CreateAuditLogPayload,
} from "./audit-log-data";

// ─── IP detection (best-effort) ───────────────────────────────────────────────

let cachedIp: string | undefined;

async function getIpAddress(): Promise<string | undefined> {
  if (cachedIp) return cachedIp;
  try {
    const res = await fetch("https://api.ipify.org?format=json", {
      signal: AbortSignal.timeout(3000),
    });
    const json = await res.json();
    cachedIp = json.ip;
    return cachedIp;
  } catch {
    return undefined;
  }
}

// ─── Base log builder ─────────────────────────────────────────────────────────

async function log(
  action: AuditActionType,
  actor: AuditActor,
  entityType: AuditEntityType,
  description: string,
  extra?: {
    entityId?:   string;
    entityName?: string;
    route?:      string;
    changes?:    AuditChange[];
  },
): Promise<void> {
  const [ipAddress] = await Promise.all([getIpAddress()]);

  const payload: CreateAuditLogPayload = {
    actor,
    action,
    category: ACTION_CATEGORY_MAP[action] ?? "system",
    status:   ACTION_STATUS_MAP[action]   ?? "info",
    description,
    entityType,
    entityId:   extra?.entityId,
    entityName: extra?.entityName,
    route:      extra?.route ?? (typeof window !== "undefined" ? window.location.pathname : undefined),
    changes:    extra?.changes,
    ipAddress,
    userAgent:  typeof navigator !== "undefined" ? navigator.userAgent : undefined,
  };

  // Fire-and-forget
  writeAuditLog(payload).catch(() => {/* silent */});
}

// ─── Guest actor helper ───────────────────────────────────────────────────────

const GUEST_ACTOR: AuditActor = {
  userId: null,
  name:   "Guest",
  email:  "",
  role:   "guest",
};

// ─── Public API ───────────────────────────────────────────────────────────────

export const auditLogger = {

  // ── Auth ──────────────────────────────────────────────────────────────────

  login(actor: AuditActor) {
    log("LOGIN", actor, "User", `${actor.name} signed in`, { entityId: actor.userId ?? undefined, entityName: actor.name });
  },

  adminLogin(actor: AuditActor) {
    log("ADMIN_LOGIN", actor, "User", `Admin ${actor.name} signed in`, { entityId: actor.userId ?? undefined, entityName: actor.name });
  },

  logout(actor: AuditActor) {
    log("LOGOUT", actor, "User", `${actor.name} signed out`, { entityId: actor.userId ?? undefined, entityName: actor.name });
  },

  register(actor: AuditActor) {
    log("REGISTER", actor, "User", `New account created: ${actor.email}`, { entityId: actor.userId ?? undefined, entityName: actor.name });
  },

  passwordResetRequest(email: string) {
    const actor: AuditActor = { userId: null, name: email, email, role: "user" };
    log("PASSWORD_RESET_REQUEST", actor, "User", `Password reset requested for ${email}`);
  },

      passwordChanged(actor: AuditActor) {
      log("PASSWORD_CHANGED", actor, "User",
        `${actor.name} changed their password`,
        { entityId: actor.userId ?? undefined });
    },

  emailVerified(actor: AuditActor) {
    log("EMAIL_VERIFIED", actor, "User", `Email verified for ${actor.email}`, { entityId: actor.userId ?? undefined });
  },

  // ── Auction ───────────────────────────────────────────────────────────────

  auctionJoin(actor: AuditActor, auctionId: string, auctionName: string, entryFee: number) {
    log("AUCTION_JOIN", actor, "Auction",
      `${actor.name} joined auction "${auctionName}" (fee: ${entryFee === 0 ? "Free" : `${entryFee} EGP`})`,
      { entityId: auctionId, entityName: auctionName },
    );
  },

  bidPlaced(actor: AuditActor, auctionId: string, auctionName: string, amount: number) {
    log("BID_PLACED", actor, "Bid",
      `${actor.name} placed a bid of ${amount.toLocaleString()} EGP on "${auctionName}"`,
      { entityId: auctionId, entityName: auctionName },
    );
  },

  lastOfferSubmitted(actor: AuditActor, auctionId: string, auctionName: string, amount: number) {
    log("LAST_OFFER_SUBMITTED", actor, "LastOffer",
      `${actor.name} submitted a last offer of ${amount.toLocaleString()} EGP for "${auctionName}"`,
      { entityId: auctionId, entityName: auctionName },
    );
  },

  auctionRequestSubmitted(actor: AuditActor, productName: string) {
    log("AUCTION_REQUEST_SUBMITTED", actor, "AuctionRequest",
      `${actor.name} submitted an auction request for "${productName}"`,
      { entityName: productName },
    );
  },

  // ── Profile ───────────────────────────────────────────────────────────────

  profileUpdated(actor: AuditActor, changes: AuditChange[]) {
    log("PROFILE_UPDATED", actor, "User",
      `${actor.name} updated their profile`,
      { entityId: actor.userId ?? undefined, entityName: actor.name, changes },
    );
  },

  // ── Guest ─────────────────────────────────────────────────────────────────

  guestVisit(route: string) {
    log("GUEST_VISIT", GUEST_ACTOR, "Page",
      `Guest visited ${route}`,
      { route },
    );
  },

  // ── Admin: Auctions ───────────────────────────────────────────────────────

  adminAuctionCreated(actor: AuditActor, auctionId: string, auctionName: string) {
    log("ADMIN_AUCTION_CREATED", actor, "Auction",
      `Auction "${auctionName}" created`,
      { entityId: auctionId, entityName: auctionName },
    );
  },

  adminAuctionUpdated(actor: AuditActor, auctionId: string, auctionName: string, changes?: AuditChange[]) {
    log("ADMIN_AUCTION_UPDATED", actor, "Auction",
      `Auction "${auctionName}" updated`,
      { entityId: auctionId, entityName: auctionName, changes },
    );
  },

  adminAuctionDeleted(actor: AuditActor, auctionId: string, auctionName: string) {
    log("ADMIN_AUCTION_DELETED", actor, "Auction",
      `Auction "${auctionName}" deleted`,
      { entityId: auctionId, entityName: auctionName },
    );
  },

  // ── Admin: Products ───────────────────────────────────────────────────────

  adminProductCreated(actor: AuditActor, productId: string, productName: string) {
    log("ADMIN_PRODUCT_CREATED", actor, "Product",
      `Product "${productName}" created`,
      { entityId: productId, entityName: productName },
    );
  },

  adminProductUpdated(actor: AuditActor, productId: string, productName: string, changes?: AuditChange[]) {
    log("ADMIN_PRODUCT_UPDATED", actor, "Product",
      `Product "${productName}" updated`,
      { entityId: productId, entityName: productName, changes },
    );
  },

  adminProductDeleted(actor: AuditActor, productId: string, productName: string) {
    log("ADMIN_PRODUCT_DELETED", actor, "Product",
      `Product "${productName}" deleted`,
      { entityId: productId, entityName: productName },
    );
  },

  // ── Admin: Users ──────────────────────────────────────────────────────────

  adminUserBlocked(actor: AuditActor, targetId: string, targetName: string) {
    log("ADMIN_USER_BLOCKED", actor, "User",
      `User "${targetName}" was blocked by ${actor.name}`,
      { entityId: targetId, entityName: targetName },
    );
  },

  adminUserUnblocked(actor: AuditActor, targetId: string, targetName: string) {
    log("ADMIN_USER_UNBLOCKED", actor, "User",
      `User "${targetName}" was unblocked by ${actor.name}`,
      { entityId: targetId, entityName: targetName },
    );
  },

  adminUserRoleChanged(actor: AuditActor, targetId: string, targetName: string, from: string, to: string) {
    log("ADMIN_USER_ROLE_CHANGED", actor, "User",
      `${targetName}'s role changed from "${from}" → "${to}" by ${actor.name}`,
      {
        entityId:   targetId,
        entityName: targetName,
        changes:    [{ field: "role", before: from, after: to }],
      },
    );
  },

  // ── Admin: Vouchers ───────────────────────────────────────────────────────

  adminVoucherCreated(actor: AuditActor, voucherId: string, code: string) {
    log("ADMIN_VOUCHER_CREATED", actor, "Voucher",
      `Voucher "${code}" created`,
      { entityId: voucherId, entityName: code },
    );
  },

  adminVoucherDeleted(actor: AuditActor, voucherId: string, code: string) {
    log("ADMIN_VOUCHER_DELETED", actor, "Voucher",
      `Voucher "${code}" deleted`,
      { entityId: voucherId, entityName: code },
    );
  },

  // ── Admin: Categories ─────────────────────────────────────────────────────

  adminCategoryCreated(actor: AuditActor, catId: string, catName: string) {
    log("ADMIN_CATEGORY_CREATED", actor, "Category",
      `Category "${catName}" created`,
      { entityId: catId, entityName: catName },
    );
  },

  adminCategoryDeleted(actor: AuditActor, catId: string, catName: string) {
    log("ADMIN_CATEGORY_DELETED", actor, "Category",
      `Category "${catName}" deleted`,
      { entityId: catId, entityName: catName },
    );
  },

  // ── Admin: Last Offers / Bids ─────────────────────────────────────────────

  adminLastOfferAccepted(actor: AuditActor, auctionId: string, userName: string, amount: number) {
    log("ADMIN_LAST_OFFER_ACCEPTED", actor, "LastOffer",
      `Last offer of ${amount.toLocaleString()} EGP by "${userName}" accepted`,
      { entityId: auctionId, entityName: userName },
    );
  },

  adminLastOfferRejected(actor: AuditActor, auctionId: string, userName: string) {
    log("ADMIN_LAST_OFFER_REJECTED", actor, "LastOffer",
      `Last offer by "${userName}" rejected`,
      { entityId: auctionId, entityName: userName },
    );
  },

  adminBidDeleted(actor: AuditActor, auctionId: string, bidId: string, amount: number) {
    log("ADMIN_BID_DELETED", actor, "Bid",
      `Bid of ${amount.toLocaleString()} EGP deleted`,
      { entityId: bidId, entityName: `Bid ${amount.toLocaleString()} EGP` },
    );
  },

  adminParticipantRemoved(actor: AuditActor, auctionId: string, participantName: string) {
    log("ADMIN_PARTICIPANT_REMOVED", actor, "Auction",
      `Participant "${participantName}" removed from auction`,
      { entityId: auctionId, entityName: participantName },
    );
  },
};

// ─── Helper to build AuditActor from auth context ────────────────────────────

export function buildActor(
  user: { uid: string; email?: string | null; displayName?: string | null } | null,
  role: "user" | "admin" | "superAdmin" | "guest" = "user",
  name?: string,
): AuditActor {
  if (!user) return { userId: null, name: "Guest", email: "", role: "guest" };
  return {
    userId: user.uid,
    name:   name ?? user.displayName ?? user.email ?? "User",
    email:  user.email ?? "",
    role,
  };
}