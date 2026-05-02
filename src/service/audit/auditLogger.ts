/**
 * auditLogger.ts
 *
 * THE single utility imported across the codebase to log events.
 *
 * ── IP Detection Fix ──────────────────────────────────────────────────────────
 * The previous version cached the IP at MODULE level — meaning if two users
 * logged in on the same tab (logout → login), User B would get User A's IP.
 *
 * Fix: cache per browser SESSION using sessionStorage. Each new tab / session
 * gets a fresh IP lookup. The cache is cleared on logout via clearSessionIp().
 *
 * Multiple IP providers are tried in order so a single provider outage
 * doesn't silently drop the IP.
 *
 * ── User Agent ───────────────────────────────────────────────────────────────
 * navigator.userAgent is captured at call-time (not module load time) so it
 * always reflects the real browser making the request.
 *
 * ── Same IP on two PCs? ───────────────────────────────────────────────────────
 * If two machines on the same home/office network show the same IP, that is
 * CORRECT — they share one public IP via NAT/router. ipify returns the public
 * IP seen by the internet, which is the same for every device behind a NAT.
 * To distinguish devices you would need the private LAN IP (not possible from
 * the browser for security reasons) or a device fingerprint.
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

// ─── Session-scoped IP cache ──────────────────────────────────────────────────
// Using sessionStorage means each new tab/session fetches a fresh IP.
// This prevents cross-user IP leakage when a tab is reused across logouts.

const SESSION_IP_KEY = "audit_cached_ip_data";

function getStoredIpData(): { ip?: string; port?: string } | null {
  try { 
    const data = sessionStorage.getItem(SESSION_IP_KEY);
    return data ? JSON.parse(data) : null;
  }
  catch { return null; }
}

function storeIpData(ip: string, port?: string): void {
  try { sessionStorage.setItem(SESSION_IP_KEY, JSON.stringify({ ip, port })); }
  catch { /* non-fatal */ }
}

/** Call this on logout to ensure the next login gets a fresh IP lookup */
export function clearSessionIp(): void {
  try { sessionStorage.removeItem(SESSION_IP_KEY); }
  catch { /* non-fatal */ }
}

// Multiple providers tried in order — first success wins
const IP_PROVIDERS = [
  { url: "https://ifconfig.me/all.json",                parse: (j: any) => ({ ip: j.ip_addr, port: j.port?.toString() }) },
  { url: "https://am.i.mullvad.net/json",               parse: (j: any) => ({ ip: j.ip, port: j.port?.toString() }) },
  { url: "https://api.ipify.org?format=json",           parse: (j: any) => ({ ip: j.ip }) },
  { url: "https://api64.ipify.org?format=json",         parse: (j: any) => ({ ip: j.ip }) },
  { url: "https://api.my-ip.io/v2/ip.json",             parse: (j: any) => ({ ip: j.ip }) },
  { url: "https://ipapi.co/json/",                      parse: (j: any) => ({ ip: j.ip }) },
];

async function fetchIpFromProvider(provider: (typeof IP_PROVIDERS)[0]): Promise<{ ip?: string; port?: string } | null> {
  try {
    const res = await fetch(provider.url, {
      signal: AbortSignal.timeout(4000),
      // Prevent browser from serving a cached response from a previous session
      cache: "no-store",
    });
    if (!res.ok) return null;
    const json = await res.json();
    const data = provider.parse(json);
    return typeof data.ip === "string" && data.ip.length > 0 ? data : null;
  } catch {
    return null;
  }
}

async function getIpAddressData(): Promise<{ ip?: string; port?: string }> {
  // 1. Return session-cached value (same user, same tab, multiple actions)
  const stored = getStoredIpData();
  if (stored?.ip) return stored;

  // 2. Try providers in order
  for (const provider of IP_PROVIDERS) {
    const data = await fetchIpFromProvider(provider);
    if (data?.ip) {
      storeIpData(data.ip, data.port);
      return data;
    }
  }

  // 3. All providers failed — log without IP rather than blocking the write
  console.warn("[AuditLogger] Could not determine IP address from any provider.");
  return {};
}

// ─── Device ID capture ────────────────────────────────────────────────────────
// Captured per browser and persisted in localStorage

function getDeviceId(): string {
  try {
    let id = localStorage.getItem("audit_device_id");
    if (!id) {
      id = "dev_" + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      localStorage.setItem("audit_device_id", id);
    }
    return id;
  } catch {
    return "unknown-device";
  }
}

// ─── User Agent capture ───────────────────────────────────────────────────────
// Captured at call-time so it always reflects the actual browser.
// navigator.userAgent is always available synchronously.

function getUserAgent(): string | undefined {
  if (typeof navigator === "undefined") return undefined;
  return navigator.userAgent || undefined;
}

// ─── Current page route ───────────────────────────────────────────────────────

function getCurrentRoute(): string | undefined {
  if (typeof window === "undefined") return undefined;
  return window.location.pathname || undefined;
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
  // Capture userAgent and deviceId synchronously
  const userAgent = getUserAgent();
  const deviceId  = getDeviceId();
  const route     = extra?.route ?? getCurrentRoute();

  // IP fetch is async — run in parallel with nothing else blocking the log
  const { ip: ipAddress, port } = await getIpAddressData();

  const payload: CreateAuditLogPayload = {
    actor,
    action,
    category:   ACTION_CATEGORY_MAP[action] ?? "system",
    status:     ACTION_STATUS_MAP[action]   ?? "info",
    description,
    entityType,
    entityId:   extra?.entityId,
    entityName: extra?.entityName,
    route,
    changes:    extra?.changes,
    ipAddress,
    port,
    deviceId,
    userAgent,
  };

  // Fire-and-forget — never blocks the caller
  writeAuditLog(payload).catch(() => { /* silent */ });
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
    log("LOGIN", actor, "User", `${actor.name} signed in`, {
      entityId: actor.userId ?? undefined, entityName: actor.name,
    });
  },

  adminLogin(actor: AuditActor) {
    log("ADMIN_LOGIN", actor, "User", `Admin ${actor.name} signed in`, {
      entityId: actor.userId ?? undefined, entityName: actor.name,
    });
  },

  adminLogout(actor: AuditActor) {
  clearSessionIp();
  log("ADMIN_LOGOUT", actor, "User", `Admin ${actor.name} signed out`, {
    entityId: actor.userId ?? undefined, entityName: actor.name,
  });
},

  logout(actor: AuditActor) {
    // Clear the session IP so the next login gets a fresh lookup
    clearSessionIp();
    log("LOGOUT", actor, "User", `${actor.name} signed out`, {
      entityId: actor.userId ?? undefined, entityName: actor.name,
    });
  },

  register(actor: AuditActor) {
    log("REGISTER", actor, "User", `New account created: ${actor.email}`, {
      entityId: actor.userId ?? undefined, entityName: actor.name,
    });
  },

  passwordResetRequest(email: string) {
    const actor: AuditActor = { userId: null, name: email, email, role: "user" };
    log("PASSWORD_RESET_REQUEST", actor, "User", `Password reset requested for ${email}`);
  },

  passwordChanged(actor: AuditActor) {
    log("PASSWORD_CHANGED", actor, "User", `${actor.name} changed their password`, {
      entityId: actor.userId ?? undefined,
    });
  },

  emailVerified(actor: AuditActor) {
    log("EMAIL_VERIFIED", actor, "User", `Email verified for ${actor.email}`, {
      entityId: actor.userId ?? undefined,
    });
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

  contactSubmitted(
    name: string,
    email: string,
    subject?: string,
    userId?: string | null,
    userRole: "user" | "guest" = userId ? "user" : "guest",
  ) {
    const actor: AuditActor = {
      userId: userId ?? null,
      name:   name || email || "Anonymous",
      email:  email || "",
      role:   userRole,
    };
    const subjectLabel = subject && subject !== "" ? ` — subject: "${subject}"` : "";
    log(
      "CONTACT_SUBMITTED", actor, "ContactMessage",
      `Contact form submitted by ${actor.name} (${actor.email})${subjectLabel}`,
      { entityName: actor.name, route: "/contact" },
    );
  },

  feedbackSubmitted(
    name: string,
    email: string,
    category?: string,
    rating?: number,
    userId?: string | null,
    userRole: "user" | "guest" = userId ? "user" : "guest",
  ) {
    const actor: AuditActor = {
      userId: userId ?? null,
      name:   name || email || "Anonymous",
      email:  email || "",
      role:   userRole,
    };
    const categoryLabel = category && category !== "" ? ` [${category}]` : "";
    const ratingLabel   = rating ? ` — ${rating}★` : "";
    log(
      "FEEDBACK_SUBMITTED", actor, "FeedbackMessage",
      `Feedback submitted by ${actor.name} (${actor.email})${categoryLabel}${ratingLabel}`,
      { entityName: actor.name, route: "/contact" },
    );
  },

  // ── Guest ─────────────────────────────────────────────────────────────────

  guestVisit(route: string) {
    log("GUEST_VISIT", GUEST_ACTOR, "Page", `Guest visited ${route}`, { route });
  },

  // ── Admin: Auctions ───────────────────────────────────────────────────────

  adminAuctionCreated(actor: AuditActor, auctionId: string, auctionName: string) {
    log("ADMIN_AUCTION_CREATED", actor, "Auction", `Auction "${auctionName}" created`, {
      entityId: auctionId, entityName: auctionName,
    });
  },

  adminAuctionUpdated(actor: AuditActor, auctionId: string, auctionName: string, changes?: AuditChange[]) {
    log("ADMIN_AUCTION_UPDATED", actor, "Auction", `Auction "${auctionName}" updated`, {
      entityId: auctionId, entityName: auctionName, changes,
    });
  },

  adminAuctionDeleted(actor: AuditActor, auctionId: string, auctionName: string) {
    log("ADMIN_AUCTION_DELETED", actor, "Auction", `Auction "${auctionName}" deleted`, {
      entityId: auctionId, entityName: auctionName,
    });
  },

  // ── Admin: Products ───────────────────────────────────────────────────────

  adminProductCreated(actor: AuditActor, productId: string, productName: string) {
    log("ADMIN_PRODUCT_CREATED", actor, "Product", `Product "${productName}" created`, {
      entityId: productId, entityName: productName,
    });
  },

  adminProductUpdated(actor: AuditActor, productId: string, productName: string, changes?: AuditChange[]) {
    log("ADMIN_PRODUCT_UPDATED", actor, "Product", `Product "${productName}" updated`, {
      entityId: productId, entityName: productName, changes,
    });
  },

  adminProductDeleted(actor: AuditActor, productId: string, productName: string) {
    log("ADMIN_PRODUCT_DELETED", actor, "Product", `Product "${productName}" deleted`, {
      entityId: productId, entityName: productName,
    });
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
      { entityId: targetId, entityName: targetName, changes: [{ field: "role", before: from, after: to }] },
    );
  },

  // ── Admin: Vouchers ───────────────────────────────────────────────────────

  adminVoucherCreated(actor: AuditActor, voucherId: string, code: string) {
    log("ADMIN_VOUCHER_CREATED", actor, "Voucher", `Voucher "${code}" created`, {
      entityId: voucherId, entityName: code,
    });
  },

  adminVoucherDeleted(actor: AuditActor, voucherId: string, code: string) {
    log("ADMIN_VOUCHER_DELETED", actor, "Voucher", `Voucher "${code}" deleted`, {
      entityId: voucherId, entityName: code,
    });
  },

  // ── Admin: Categories ─────────────────────────────────────────────────────

  adminCategoryCreated(actor: AuditActor, catId: string, catName: string) {
    log("ADMIN_CATEGORY_CREATED", actor, "Category", `Category "${catName}" created`, {
      entityId: catId, entityName: catName,
    });
  },

  adminCategoryDeleted(actor: AuditActor, catId: string, catName: string) {
    log("ADMIN_CATEGORY_DELETED", actor, "Category", `Category "${catName}" deleted`, {
      entityId: catId, entityName: catName,
    });
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