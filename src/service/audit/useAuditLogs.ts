/**
 * useAuditLogs.ts
 *
 * React hook for fetching paginated audit logs with live filter support.
 * Used exclusively by the AuditLogsPage admin component.
 */

import { useState, useCallback, useRef, useEffect } from "react";
import type { QueryDocumentSnapshot } from "firebase/firestore";
import { fetchAuditLogs } from "./auditLogService";
import type { AuditLog, AuditFilters } from "./audit-log-data";
import { DEFAULT_AUDIT_FILTERS } from "./audit-log-data";

export function useAuditLogs() {
  const [logs,    setLogs]    = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [filters, setFilters] = useState<AuditFilters>(DEFAULT_AUDIT_FILTERS);

  const lastDocRef    = useRef<QueryDocumentSnapshot | null>(null);
  const activeFilters = useRef<AuditFilters>(DEFAULT_AUDIT_FILTERS);

  // ── Initial / filtered load ───────────────────────────────────────────────

  const loadLogs = useCallback(async (newFilters?: AuditFilters) => {
    const f = newFilters ?? activeFilters.current;
    activeFilters.current = f;
    lastDocRef.current    = null;

    setLoading(true);
    setError(null);
    setLogs([]);

    try {
      const result = await fetchAuditLogs(f);
      setLogs(result.logs);
      setHasMore(result.hasMore);
      lastDocRef.current = result.lastDoc;
    } catch (err: any) {
      setError(err?.message ?? "Failed to load audit logs");
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Load more (pagination) ────────────────────────────────────────────────

  const loadMore = useCallback(async () => {
    if (!hasMore || loading || !lastDocRef.current) return;

    setLoading(true);
    try {
      const result = await fetchAuditLogs(activeFilters.current, lastDocRef.current ?? undefined);
      setLogs((prev) => [...prev, ...result.logs]);
      setHasMore(result.hasMore);
      lastDocRef.current = result.lastDoc;
    } catch (err: any) {
      setError(err?.message ?? "Failed to load more logs");
    } finally {
      setLoading(false);
    }
  }, [hasMore, loading]);

  // ── Apply filters ─────────────────────────────────────────────────────────

  const applyFilters = useCallback(
    (newFilters: Partial<AuditFilters>) => {
      const merged = { ...activeFilters.current, ...newFilters };
      setFilters(merged);
      loadLogs(merged);
    },
    [loadLogs],
  );

  const resetFilters = useCallback(() => {
    setFilters(DEFAULT_AUDIT_FILTERS);
    loadLogs(DEFAULT_AUDIT_FILTERS);
  }, [loadLogs]);

  // ── Initial load ──────────────────────────────────────────────────────────

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  return {
    logs,
    loading,
    error,
    hasMore,
    filters,
    loadMore,
    applyFilters,
    resetFilters,
    refresh: () => loadLogs(activeFilters.current),
  };
}