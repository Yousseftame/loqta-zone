/**
 * AuditLogsPage.tsx — Fixed responsive stats cards + all existing features
 */

import { useState } from "react";
import { useAuditLogs } from "@/service/audit/useAuditLogs";
import type {
  AuditLog,
  AuditActionCategory,
  AuditFilters,
} from "../../../service/audit/audit-log-data";
import {
  CATEGORY_CONFIG,
  QUICK_FILTERS,
  DEFAULT_AUDIT_FILTERS,
} from "../../../service/audit/audit-log-data";
import { ChevronLeft, ChevronRight, RefreshCw, Filter } from "lucide-react";

import {
  C,
  STATUS_LIGHT,
  StatusBadge,
  CategoryBadge,
  RoleBadge,
  ActionBadge,
  LogDetailModal,
} from "./Logdetailmodal";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/store/AuthContext/AuthContext";

const PAGE_SIZE = 15;

function fmtDate(d: Date) {
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
function fmtTime(d: Date) {
  return d.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}
function timeAgo(d: Date) {
  const s = (Date.now() - d.getTime()) / 1000;
  if (s < 60) return `${Math.floor(s)}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}
function truncate(str: string, n = 60) {
  return str.length > n ? str.slice(0, n) + "…" : str;
}

// ─── Filter Panel ─────────────────────────────────────────────────────────────
function FilterPanel({
  filters,
  onApply,
  onReset,
}: {
  filters: AuditFilters;
  onApply: (f: Partial<AuditFilters>) => void;
  onReset: () => void;
}) {
  const [local, setLocal] = useState(filters);
  const set = (key: keyof AuditFilters, val: string) =>
    setLocal((p) => ({ ...p, [key]: val }));

  const inputBase: React.CSSProperties = {
    width: "100%",
    height: 36,
    background: C.surface,
    border: `1px solid ${C.border}`,
    borderRadius: 8,
    color: C.textPrimary,
    fontSize: 12,
    padding: "0 10px",
    outline: "none",
    fontFamily: "system-ui, -apple-system, sans-serif",
    transition: "border-color 0.2s",
    boxSizing: "border-box",
  };
  const labelBase: React.CSSProperties = {
    fontSize: 10,
    fontWeight: 700,
    color: C.textMuted,
    letterSpacing: "0.12em",
    textTransform: "uppercase",
    marginBottom: 5,
    display: "block",
  };

  const activeCount = Object.entries(local).filter(
    ([k, v]) => v && v !== DEFAULT_AUDIT_FILTERS[k as keyof AuditFilters],
  ).length;

  return (
    <div
      style={{
        background: C.surface,
        border: `1px solid ${C.border}`,
        borderRadius: 16,
        padding: "20px 22px",
        marginBottom: 20,
        boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 16,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Filter size={15} style={{ color: C.primary }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: C.textPrimary }}>
            Filters
          </span>
          {activeCount > 0 && (
            <span
              style={{
                padding: "1px 8px",
                borderRadius: 999,
                background: C.primaryBg,
                color: C.primary,
                fontSize: 10,
                fontWeight: 700,
                border: `1px solid ${C.primaryRing}`,
              }}
            >
              {activeCount} active
            </span>
          )}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={onReset}
            style={{
              background: C.muted,
              border: `1px solid ${C.border}`,
              borderRadius: 8,
              padding: "6px 14px",
              cursor: "pointer",
              color: C.textSecondary,
              fontSize: 11,
              fontWeight: 600,
              fontFamily: "system-ui, sans-serif",
              transition: "all 0.2s",
            }}
          >
            Reset
          </button>
          <button
            onClick={() => onApply(local)}
            style={{
              background: `linear-gradient(135deg, ${C.primary} 0%, #1e3652 100%)`,
              border: "none",
              borderRadius: 8,
              padding: "6px 16px",
              cursor: "pointer",
              color: "#fff",
              fontSize: 11,
              fontWeight: 700,
              fontFamily: "system-ui, sans-serif",
              boxShadow: "0 4px 12px rgba(42,72,99,0.3)",
            }}
          >
            Apply
          </button>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))",
          gap: 14,
        }}
      >
        <div style={{ gridColumn: "span 2" }}>
          <label style={labelBase}>Search</label>
          <input
            style={{
              ...inputBase,
              paddingLeft: 32,
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%2394A3B8' stroke-width='2'%3E%3Ccircle cx='11' cy='11' r='8'/%3E%3Cpath d='M21 21l-4.35-4.35'/%3E%3C/svg%3E")`,
              backgroundRepeat: "no-repeat",
              backgroundPosition: "10px center",
            }}
            placeholder="Name, email, action, entity…"
            value={local.search}
            onChange={(e) => set("search", e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onApply(local)}
            onFocus={(e) => (e.currentTarget.style.borderColor = C.primary)}
            onBlur={(e) => (e.currentTarget.style.borderColor = C.border)}
          />
        </div>
        <div>
          <label style={labelBase}>Category</label>
          <select
            style={{ ...inputBase, cursor: "pointer" }}
            value={local.category}
            onChange={(e) => set("category", e.target.value)}
          >
            <option value="">All Categories</option>
            {Object.entries(CATEGORY_CONFIG).map(([k, v]) => (
              <option key={k} value={k}>
                {v.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label style={labelBase}>Status</label>
          <select
            style={{ ...inputBase, cursor: "pointer" }}
            value={local.status}
            onChange={(e) => set("status", e.target.value)}
          >
            <option value="">All Statuses</option>
            {Object.entries(STATUS_LIGHT).map(([k, v]) => (
              <option key={k} value={k}>
                {v.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label style={labelBase}>Role</label>
          <select
            style={{ ...inputBase, cursor: "pointer" }}
            value={local.role}
            onChange={(e) => set("role", e.target.value)}
          >
            <option value="">All Roles</option>
            <option value="superAdmin">Super Admin</option>
            <option value="admin">Admin</option>
            <option value="user">User</option>
            <option value="guest">Guest</option>
          </select>
        </div>
        <div>
          <label style={labelBase}>From</label>
          <input
            type="date"
            style={inputBase}
            value={local.dateFrom}
            onChange={(e) => set("dateFrom", e.target.value)}
          />
        </div>
        <div>
          <label style={labelBase}>To</label>
          <input
            type="date"
            style={inputBase}
            value={local.dateTo}
            onChange={(e) => set("dateTo", e.target.value)}
          />
        </div>
      </div>

      <div style={{ marginTop: 14, display: "flex", gap: 6, flexWrap: "wrap" }}>
        {QUICK_FILTERS.map((qf) => {
          const active = local.quickFilter === qf.key;
          return (
            <button
              key={qf.key}
              onClick={() => {
                const next = active ? "" : qf.key;
                set("quickFilter", next);
                onApply({ ...local, quickFilter: next });
              }}
              title={qf.description}
              style={{
                padding: "4px 13px",
                borderRadius: 999,
                cursor: "pointer",
                fontSize: 11,
                fontWeight: 700,
                fontFamily: "system-ui, sans-serif",
                transition: "all 0.2s",
                background: active ? C.primaryBg : C.muted,
                border: `1px solid ${active ? C.primaryRing : C.border}`,
                color: active ? C.primary : C.textMuted,
              }}
            >
              {qf.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Stats Bar — FIXED responsive grid ───────────────────────────────────────
function StatsBar({ logs }: { logs: AuditLog[] }) {
  const statusCounts = logs.reduce(
    (acc, l) => {
      acc[l.status] = (acc[l.status] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  const catCounts = logs.reduce(
    (acc, l) => {
      acc[l.category] = (acc[l.category] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  // Build all cards into one flat array for a clean responsive grid
  const cards: { label: string; count: number; dot?: string }[] = [
    { label: "TOTAL", count: logs.length },
    ...(["success", "info", "warning", "danger"] as const)
      .filter((s) => (statusCounts[s] ?? 0) > 0)
      .map((s) => ({
        label: s.toUpperCase(),
        count: statusCounts[s],
        dot: STATUS_LIGHT[s].dot,
      })),
    ...Object.entries(catCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .filter(([cat]) => CATEGORY_CONFIG[cat as AuditActionCategory])
      .map(([cat, n]) => ({
        label: CATEGORY_CONFIG[cat as AuditActionCategory].label.toUpperCase(),
        count: n,
      })),
  ];

  return (
    <>
      <style>{`
        .al-stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
          gap: 10px;
          margin-bottom: 20px;
        }
        @media (max-width: 480px) {
          .al-stats-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 8px;
          }
        }
      `}</style>
      <div className="al-stats-grid">
        {cards.map((card, i) => (
          <div
            key={i}
            style={{
              padding: "12px 14px",
              background: `linear-gradient(135deg, ${C.primary} 0%, #3D6A8A 100%)`,
              borderRadius: 12,
              display: "flex",
              flexDirection: "column",
              gap: 4,
              boxShadow: "0 4px 14px rgba(42,72,99,0.2)",
              minWidth: 0,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              {card.dot && (
                <span
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: "50%",
                    background: card.dot,
                    flexShrink: 0,
                    boxShadow: `0 0 0 2px rgba(255,255,255,0.25)`,
                  }}
                />
              )}
              <span
                style={{
                  fontSize: 22,
                  fontWeight: 800,
                  color: "#fff",
                  lineHeight: 1,
                }}
              >
                {card.count}
              </span>
            </div>
            <span
              style={{
                fontSize: 10,
                color: "rgba(255,255,255,0.7)",
                letterSpacing: "0.1em",
                fontWeight: 600,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {card.label}
            </span>
          </div>
        ))}
      </div>
    </>
  );
}

// ─── Table Row ────────────────────────────────────────────────────────────────
function LogRow({
  log,
  onClick,
  globalIdx,
}: {
  log: AuditLog;
  onClick: () => void;
  globalIdx: number;
}) {
  const [hovered, setHovered] = useState(false);
  const defaultBg = globalIdx % 2 === 0 ? "#fff" : C.muted;
  return (
    <tr
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? C.primaryBg : defaultBg,
        borderBottom: `1px solid ${C.border}`,
        cursor: "pointer",
        transition: "background 0.15s",
      }}
    >
      <td
        style={{
          padding: "12px 16px",
          whiteSpace: "nowrap",
          verticalAlign: "middle",
        }}
      >
        <div style={{ fontSize: 12, color: C.textPrimary, fontWeight: 500 }}>
          {fmtDate(log.timestamp)}
        </div>
        <div style={{ fontSize: 10, color: C.textMuted, marginTop: 2 }}>
          {fmtTime(log.timestamp)}
        </div>
        <div
          style={{
            fontSize: 9,
            color: C.primary,
            marginTop: 3,
            fontWeight: 600,
            opacity: 0.7,
          }}
        >
          {timeAgo(log.timestamp)}
        </div>
      </td>
      <td style={{ padding: "12px 16px", verticalAlign: "middle" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div
            style={{
              width: 30,
              height: 30,
              borderRadius: "50%",
              background: C.primaryBg,
              border: `1px solid ${C.primaryRing}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: C.primary,
              fontWeight: 700,
              fontSize: 12,
              flexShrink: 0,
            }}
          >
            {(log.actor.name || "?").charAt(0).toUpperCase()}
          </div>
          <div>
            <div
              style={{ fontSize: 12, fontWeight: 600, color: C.textPrimary }}
            >
              {truncate(log.actor.name, 20)}
            </div>
            {log.actor.email && (
              <div style={{ fontSize: 10, color: C.textMuted, marginTop: 1 }}>
                {truncate(log.actor.email, 25)}
              </div>
            )}
            <div style={{ marginTop: 3 }}>
              <RoleBadge role={log.actor.role} />
            </div>
          </div>
        </div>
      </td>
      <td style={{ padding: "12px 16px", verticalAlign: "middle" }}>
        <div style={{ marginBottom: 5 }}>
          <CategoryBadge category={log.category} />
        </div>
        <div style={{ marginTop: 4 }}>
          <ActionBadge action={log.action} />
        </div>
      </td>
      <td
        style={{ padding: "12px 16px", verticalAlign: "middle", maxWidth: 260 }}
      >
        <div style={{ fontSize: 12, color: C.textSecondary, lineHeight: 1.5 }}>
          {truncate(log.description, 65)}
        </div>
        {log.entityName && (
          <div style={{ fontSize: 10, color: C.textMuted, marginTop: 3 }}>
            {log.entityType}: {truncate(log.entityName, 28)}
          </div>
        )}
      </td>
      <td
        style={{
          padding: "12px 16px",
          verticalAlign: "middle",
          textAlign: "center",
        }}
      >
        <StatusBadge status={log.status} />
      </td>
      <td style={{ padding: "12px 16px", verticalAlign: "middle" }}>
        {log.ipAddress && (
          <span
            style={{
              display: "inline-block",
              padding: "2px 8px",
              borderRadius: 5,
              background: C.muted,
              border: `1px solid ${C.border}`,
              fontSize: 10,
              color: C.textMuted,
              fontFamily: "monospace",
            }}
          >
            {log.ipAddress}
          </span>
        )}
        {log.changes && log.changes.length > 0 && (
          <div style={{ marginTop: 4 }}>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 3,
                padding: "2px 7px",
                borderRadius: 5,
                background: C.primaryBg,
                color: C.primary,
                fontSize: 9,
                fontWeight: 700,
                border: `1px solid ${C.primaryRing}`,
              }}
            >
              {log.changes.length} change{log.changes.length > 1 ? "s" : ""}
            </span>
          </div>
        )}
      </td>
    </tr>
  );
}

function EmptyState({ hasFilters }: { hasFilters: boolean }) {
  return (
    <tr>
      <td colSpan={6}>
        <div style={{ textAlign: "center", padding: "60px 20px" }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 16,
              background: C.primaryBg,
              border: `1px solid ${C.primaryRing}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px",
              fontSize: 28,
            }}
          >
            📋
          </div>
          <div
            style={{
              fontSize: 15,
              fontWeight: 600,
              color: C.textSecondary,
              marginBottom: 6,
            }}
          >
            No audit logs found
          </div>
          <div style={{ fontSize: 13, color: C.textMuted }}>
            {hasFilters
              ? "Try adjusting or clearing your filters"
              : "Actions will appear here as they occur"}
          </div>
        </div>
      </td>
    </tr>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AuditLogsPage() {
  const {
    logs,
    loading,
    error,
    hasMore,
    filters,
    loadMore,
    applyFilters,
    resetFilters,
    refresh,
  } = useAuditLogs();
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);

  const hasActiveFilters = Object.entries(filters).some(
    ([k, v]) => v && v !== DEFAULT_AUDIT_FILTERS[k as keyof AuditFilters],
  );

  const totalPages = Math.max(1, Math.ceil(logs.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageStart = (safePage - 1) * PAGE_SIZE;
  const pageData = logs.slice(pageStart, pageStart + PAGE_SIZE);

  const cols = [
    { key: "timestamp", label: "Timestamp", w: 130 },
    { key: "actor", label: "Actor", w: 180 },
    { key: "category", label: "Category", w: 160 },
    { key: "description", label: "Description", w: undefined },
    { key: "status", label: "Status", w: 100 },
    { key: "meta", label: "Meta", w: 110 },
  ];
   const { role } = useAuth();

   if (role !== "superAdmin") {
     return <Navigate to="/admin/hero-slides" replace />;
   }

  

  return (
    <>
      <style>{`
        @keyframes al-fadein  { from { opacity: 0 } to { opacity: 1 } }
        @keyframes al-slidein { from { opacity: 0; transform: translateY(16px) scale(0.97) } to { opacity: 1; transform: translateY(0) scale(1) } }
        @keyframes al-spin    { to { transform: rotate(360deg) } }
        @keyframes al-fadepage { from { opacity: 0; transform: translateY(10px) } to { opacity: 1; transform: translateY(0) } }
      `}</style>

      <div
        style={{
          padding: "28px 32px 80px",
          minHeight: "100vh",
          background: "#F8FAFC",
          fontFamily: "system-ui, -apple-system, sans-serif",
          animation: "al-fadepage 0.35s ease",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            marginBottom: 24,
            flexWrap: "wrap",
            gap: 14,
          }}
        >
          <div>
            <h1
              style={{
                fontSize: 26,
                fontWeight: 800,
                color: C.textPrimary,
                letterSpacing: "-0.02em",
                margin: 0,
              }}
            >
              Audit Logs
            </h1>
            <p style={{ fontSize: 13, color: C.textMuted, margin: "4px 0 0" }}>
              Complete activity trail · All user and admin actions
            </p>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <button
              onClick={() => setShowFilters((v) => !v)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 7,
                padding: "9px 16px",
                borderRadius: 10,
                cursor: "pointer",
                fontFamily: "system-ui, sans-serif",
                fontSize: 13,
                fontWeight: 600,
                transition: "all 0.2s",
                background: showFilters ? C.primaryBg : C.surface,
                border: `1px solid ${showFilters ? C.primaryRing : C.border}`,
                color: showFilters ? C.primary : C.textSecondary,
                boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
              }}
            >
              <Filter size={14} />
              Filters
              {hasActiveFilters && (
                <span
                  style={{
                    width: 17,
                    height: 17,
                    borderRadius: "50%",
                    background: C.primary,
                    color: "#fff",
                    fontSize: 9,
                    fontWeight: 900,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  !
                </span>
              )}
            </button>
            <button
              onClick={refresh}
              disabled={loading}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "9px 14px",
                borderRadius: 10,
                cursor: loading ? "not-allowed" : "pointer",
                fontFamily: "system-ui, sans-serif",
                fontSize: 13,
                fontWeight: 600,
                background: C.surface,
                border: `1px solid ${C.border}`,
                color: C.textSecondary,
                opacity: loading ? 0.5 : 1,
                transition: "all 0.2s",
                boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
              }}
            >
              <RefreshCw
                size={13}
                style={{
                  animation: loading ? "al-spin 0.8s linear infinite" : "none",
                }}
              />
              Refresh
            </button>
          </div>
        </div>

        {showFilters && (
          <FilterPanel
            filters={filters}
            onApply={(f) => {
              applyFilters(f);
              setPage(1);
            }}
            onReset={() => {
              resetFilters();
              setPage(1);
            }}
          />
        )}

        {error && (
          <div
            style={{
              padding: "14px 18px",
              borderRadius: 12,
              marginBottom: 20,
              background: "#FEE2E2",
              border: `1px solid #EF444433`,
              color: "#EF4444",
              fontSize: 13,
            }}
          >
            ⚠️ {error}
          </div>
        )}

        {logs.length > 0 && <StatsBar logs={logs} />}

        {/* Table */}
        <div
          style={{
            background: C.surface,
            border: `1px solid ${C.border}`,
            borderRadius: 16,
            overflow: "hidden",
            boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
          }}
        >
          <div
            style={{
              padding: "14px 20px",
              borderBottom: `1px solid ${C.border}`,
              background: C.primaryBg,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 8,
            }}
          >
            <span
              style={{
                fontWeight: 700,
                fontSize: "0.9rem",
                color: C.primaryDark,
              }}
            >
              Activity Log
            </span>
            {logs.length > 0 && (
              <span
                style={{
                  padding: "3px 10px",
                  borderRadius: 999,
                  background: C.surface,
                  border: `1px solid ${C.primaryRing}`,
                  fontSize: 11,
                  fontWeight: 700,
                  color: C.primary,
                }}
              >
                {logs.length} total{hasActiveFilters ? " (filtered)" : ""}
              </span>
            )}
          </div>

          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: "0.82rem",
              }}
            >
              <thead>
                <tr style={{ background: C.muted }}>
                  {cols.map((c) => (
                    <th
                      key={c.key}
                      style={{
                        width: c.w,
                        padding: "10px 16px",
                        textAlign: c.key === "status" ? "center" : "left",
                        fontWeight: 700,
                        color: C.textMuted,
                        fontSize: "0.72rem",
                        letterSpacing: "0.06em",
                        textTransform: "uppercase",
                        whiteSpace: "nowrap",
                        borderBottom: `1px solid ${C.border}`,
                        position: "sticky",
                        top: 0,
                        zIndex: 1,
                        background: C.muted,
                      }}
                    >
                      {c.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading && logs.length === 0 ? (
                  Array(8)
                    .fill(0)
                    .map((_, i) => (
                      <tr
                        key={i}
                        style={{ borderBottom: `1px solid ${C.border}` }}
                      >
                        {Array(6)
                          .fill(0)
                          .map((_, j) => (
                            <td key={j} style={{ padding: "14px 16px" }}>
                              <div
                                style={{
                                  height: 12,
                                  borderRadius: 4,
                                  background: C.primaryBg,
                                  width: j === 5 ? 60 : "75%",
                                }}
                              />
                            </td>
                          ))}
                      </tr>
                    ))
                ) : logs.length === 0 ? (
                  <EmptyState hasFilters={hasActiveFilters} />
                ) : (
                  pageData.map((log, i) => (
                    <LogRow
                      key={log.id}
                      log={log}
                      globalIdx={pageStart + i}
                      onClick={() => setSelectedLog(log)}
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {!loading && totalPages > 1 && (
            <div
              style={{
                padding: "12px 20px",
                borderTop: `1px solid ${C.border}`,
                background: C.muted,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                flexWrap: "wrap",
              }}
            >
              <span
                style={{
                  fontSize: "0.75rem",
                  color: C.textMuted,
                  fontWeight: 500,
                }}
              >
                Showing{" "}
                <strong style={{ color: C.textPrimary }}>
                  {pageStart + 1}–{Math.min(pageStart + PAGE_SIZE, logs.length)}
                </strong>{" "}
                of{" "}
                <strong style={{ color: C.textPrimary }}>{logs.length}</strong>{" "}
                logs
              </span>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={safePage === 1}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 30,
                    height: 30,
                    borderRadius: 7,
                    border: `1px solid ${C.border}`,
                    background: safePage === 1 ? C.muted : C.surface,
                    color: safePage === 1 ? C.textMuted : C.primary,
                    cursor: safePage === 1 ? "not-allowed" : "pointer",
                    transition: "all 0.15s",
                  }}
                >
                  <ChevronLeft size={14} />
                </button>
                {Array.from({ length: totalPages }, (_, idx) => idx + 1)
                  .filter(
                    (p) =>
                      p === 1 ||
                      p === totalPages ||
                      Math.abs(p - safePage) <= 1,
                  )
                  .reduce<(number | "…")[]>((acc, p, i, arr) => {
                    if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push("…");
                    acc.push(p);
                    return acc;
                  }, [])
                  .map((item, idx) =>
                    item === "…" ? (
                      <span
                        key={`el-${idx}`}
                        style={{
                          fontSize: "0.75rem",
                          color: C.textMuted,
                          padding: "0 2px",
                        }}
                      >
                        …
                      </span>
                    ) : (
                      <button
                        key={item}
                        onClick={() => setPage(item as number)}
                        style={{
                          width: 30,
                          height: 30,
                          borderRadius: 7,
                          border: `1px solid ${item === safePage ? C.primary : C.border}`,
                          background: item === safePage ? C.primary : C.surface,
                          color: item === safePage ? "#fff" : C.textPrimary,
                          fontSize: "0.75rem",
                          fontWeight: item === safePage ? 700 : 500,
                          cursor: "pointer",
                          transition: "all 0.15s",
                        }}
                      >
                        {item}
                      </button>
                    ),
                  )}
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={safePage === totalPages}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 30,
                    height: 30,
                    borderRadius: 7,
                    border: `1px solid ${C.border}`,
                    background: safePage === totalPages ? C.muted : C.surface,
                    color: safePage === totalPages ? C.textMuted : C.primary,
                    cursor: safePage === totalPages ? "not-allowed" : "pointer",
                    transition: "all 0.15s",
                  }}
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}

          {(hasMore || (loading && logs.length > 0)) && !loading && (
            <div
              style={{
                padding: "16px 20px",
                borderTop: `1px solid ${C.border}`,
              }}
            >
              <button
                onClick={loadMore}
                disabled={loading}
                style={{
                  width: "100%",
                  height: 42,
                  borderRadius: 10,
                  cursor: "pointer",
                  background: C.primaryBg,
                  border: `1px solid ${C.primaryRing}`,
                  color: C.primary,
                  fontFamily: "system-ui, sans-serif",
                  fontSize: 13,
                  fontWeight: 700,
                  transition: "all 0.2s",
                }}
              >
                Load More Logs
              </button>
            </div>
          )}

          {logs.length > 0 && (
            <div
              style={{
                padding: "10px 20px",
                borderTop: `1px solid ${C.border}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <span style={{ fontSize: 11, color: C.textMuted }}>
                Showing {logs.length} log{logs.length !== 1 ? "s" : ""}
                {hasActiveFilters ? " (filtered)" : ""}
              </span>
              {hasActiveFilters && (
                <button
                  onClick={() => {
                    resetFilters();
                    setPage(1);
                  }}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    fontSize: 11,
                    color: C.primary,
                    fontFamily: "system-ui, sans-serif",
                    transition: "color 0.2s",
                    fontWeight: 600,
                  }}
                >
                  Clear all filters
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {selectedLog && (
        <LogDetailModal
          log={selectedLog}
          onClose={() => setSelectedLog(null)}
        />
      )}
    </>
  );
}
