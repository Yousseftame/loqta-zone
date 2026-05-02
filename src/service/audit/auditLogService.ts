/**
 * auditLogService.ts
 *
 * Firestore service for writing and reading audit logs.
 * Collection: auditLogs
 *
 * Design decisions:
 * - Writes are fire-and-forget (non-blocking) — never throw to callers
 * - Reads are paginated with cursor-based pagination for the admin UI
 * - All timestamps stored as Firestore Timestamps, returned as JS Dates
 */

import {
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  limit,
  startAfter,
  where,
  Timestamp,
  type QueryDocumentSnapshot,
  type QueryConstraint,
} from "firebase/firestore";
import { db } from "@/firebase/firebase";
import type {
  AuditLog,
  AuditFilters,
  CreateAuditLogPayload,
} from "./audit-log-data";
import { ACTION_CATEGORY_MAP, ACTION_STATUS_MAP } from "./audit-log-data";

const COLLECTION = "auditLogs";
const PAGE_SIZE   = 50;

// ─── Parser ───────────────────────────────────────────────────────────────────

function docToLog(id: string, data: Record<string, any>): AuditLog {
  return {
    id,
    actor: {
      userId: data.actor?.userId ?? null,
      name:   data.actor?.name   ?? "Unknown",
      email:  data.actor?.email  ?? "",
      role:   data.actor?.role   ?? "guest",
    },
    action:      data.action      ?? "GUEST_VISIT",
    category:    data.category    ?? "guest",
    description: data.description ?? "",
    changes:     data.changes     ?? undefined,
    entityType:  data.entityType  ?? "System",
    entityId:    data.entityId    ?? undefined,
    entityName:  data.entityName  ?? undefined,
    route:       data.route       ?? undefined,
    timestamp:
      data.timestamp instanceof Timestamp
        ? data.timestamp.toDate()
        : new Date(data.timestamp ?? Date.now()),
    ipAddress:  data.ipAddress  ?? undefined,
    userAgent:  data.userAgent  ?? undefined,
    sessionId:  data.sessionId  ?? undefined,
    deviceId:   data.deviceId   ?? undefined,
    port:       data.port       ?? undefined,
    status:     data.status     ?? "info",
  };
}

// ─── WRITE (fire-and-forget) ──────────────────────────────────────────────────

function stripUndefined(obj: Record<string, any>): Record<string, any> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined)
  );
}

export async function writeAuditLog(
  payload: CreateAuditLogPayload,
): Promise<void> {
  try {
    const doc = stripUndefined({
      ...payload,
      category: payload.category ?? ACTION_CATEGORY_MAP[payload.action] ?? "system",
      status:   payload.status   ?? ACTION_STATUS_MAP[payload.action]   ?? "info",
      timestamp: Timestamp.now(),
    });
    await addDoc(collection(db, COLLECTION), doc);
  } catch (err) {
    console.warn("[AuditLog] Write failed (non-fatal):", err);
  }
}

// ─── READ (paginated) ─────────────────────────────────────────────────────────

export interface FetchAuditLogsResult {
  logs:    AuditLog[];
  lastDoc: QueryDocumentSnapshot | null;
  hasMore: boolean;
}

export async function fetchAuditLogs(
  filters: AuditFilters,
  after?: QueryDocumentSnapshot,
): Promise<FetchAuditLogsResult> {
  const constraints: QueryConstraint[] = [
    orderBy("timestamp", "desc"),
  ];

  // ── Apply filters ─────────────────────────────────────────────────────────

  if (filters.category) {
    constraints.push(where("category", "==", filters.category));
  }

  if (filters.status) {
    constraints.push(where("status", "==", filters.status));
  }

  if (filters.role) {
    constraints.push(where("actor.role", "==", filters.role));
  }

  if (filters.action) {
    constraints.push(where("action", "==", filters.action));
  }

  // Date range filters
  if (filters.dateFrom) {
    constraints.push(
      where("timestamp", ">=", Timestamp.fromDate(new Date(filters.dateFrom))),
    );
  }
  if (filters.dateTo) {
    // Include the full "to" day
    const toDate = new Date(filters.dateTo);
    toDate.setHours(23, 59, 59, 999);
    constraints.push(where("timestamp", "<=", Timestamp.fromDate(toDate)));
  }

  // Quick filter preset
  if (filters.quickFilter) {
    const now = new Date();
    if (filters.quickFilter === "today") {
      const start = new Date(now);
      start.setHours(0, 0, 0, 0);
      constraints.push(where("timestamp", ">=", Timestamp.fromDate(start)));
    } else if (filters.quickFilter === "last7days") {
      const start = new Date(now);
      start.setDate(start.getDate() - 7);
      constraints.push(where("timestamp", ">=", Timestamp.fromDate(start)));
    } else if (filters.quickFilter === "admin_only") {
      constraints.push(where("category", "==", "admin"));
    } else if (filters.quickFilter === "danger_only") {
      constraints.push(where("status", "in", ["danger", "warning"]));
    } else if (filters.quickFilter === "auth_only") {
      constraints.push(where("category", "==", "auth"));
    } else if (filters.quickFilter === "contact_only") {
      // ← NEW: filter to contact + feedback submissions
      constraints.push(where("category", "==", "contact"));
    }
  }

  constraints.push(limit(PAGE_SIZE + 1)); // fetch one extra to detect hasMore
  if (after) constraints.push(startAfter(after));

  const snap = await getDocs(query(collection(db, COLLECTION), ...constraints));
  const hasMore = snap.docs.length > PAGE_SIZE;
  const docs    = hasMore ? snap.docs.slice(0, PAGE_SIZE) : snap.docs;

  // Client-side text search (Firestore doesn't support full-text)
  let logs = docs.map((d) => docToLog(d.id, d.data()));

  if (filters.search) {
    const term = filters.search.toLowerCase();
    logs = logs.filter(
      (l) =>
        l.actor.name.toLowerCase().includes(term)  ||
        l.actor.email.toLowerCase().includes(term) ||
        l.description.toLowerCase().includes(term) ||
        l.action.toLowerCase().includes(term)      ||
        (l.entityName ?? "").toLowerCase().includes(term),
    );
  }

  return {
    logs,
    lastDoc: hasMore ? docs[docs.length - 1] : null,
    hasMore,
  };
}