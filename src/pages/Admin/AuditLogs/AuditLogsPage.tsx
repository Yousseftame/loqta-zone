/**
 * AuditLogsPage.tsx
 *
 * Full production-ready Audit Logs admin page.
 * Dark navy + gold design consistent with the rest of Loqta Zone admin.
 */

import { useState, useRef } from "react";
import { useAuditLogs } from "@/service/audit/useAuditLogs";
import type {
  AuditLog,
  AuditActionCategory,
  AuditFilters,
} from "../../../service/audit/audit-log-data";
import {
  CATEGORY_CONFIG,
  STATUS_CONFIG,
  QUICK_FILTERS,
  DEFAULT_AUDIT_FILTERS,
} from "../../../service/audit/audit-log-data";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(d: Date): string {
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
function fmtTime(d: Date): string {
  return d.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}
function fmtDateTime(d: Date): string {
  return `${fmtDate(d)} · ${fmtTime(d)}`;
}
function timeAgo(d: Date): string {
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return `${Math.floor(diff)}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}
function truncate(str: string, n = 60): string {
  return str.length > n ? str.slice(0, n) + "…" : str;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: AuditLog["status"] }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        padding: "2px 9px",
        borderRadius: 99,
        background: cfg.bg,
        color: cfg.color,
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: "0.06em",
        border: `1px solid ${cfg.color}22`,
        whiteSpace: "nowrap",
      }}
    >
      <span
        style={{
          width: 5,
          height: 5,
          borderRadius: "50%",
          background: cfg.dot,
          flexShrink: 0,
        }}
      />
      {cfg.label}
    </span>
  );
}

function CategoryBadge({ category }: { category: AuditActionCategory }) {
  const cfg = CATEGORY_CONFIG[category];
  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px 8px",
        borderRadius: 6,
        background: cfg.bg,
        color: cfg.color,
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: "0.1em",
        textTransform: "uppercase",
        border: `1px solid ${cfg.border}`,
        whiteSpace: "nowrap",
      }}
    >
      {cfg.label}
    </span>
  );
}

function RoleBadge({ role }: { role: AuditLog["actor"]["role"] }) {
  const map: Record<string, { color: string; bg: string }> = {
    superAdmin: { color: "#B45309", bg: "#FEF3C7" },
    admin: { color: "#DC2626", bg: "#FEE2E2" },
    user: { color: "#2563EB", bg: "#DBEAFE" },
    guest: { color: "#6B7280", bg: "#F3F4F6" },
  };
  const s = map[role] ?? map.guest;
  return (
    <span
      style={{
        padding: "1px 7px",
        borderRadius: 5,
        background: s.bg,
        color: s.color,
        fontSize: 10,
        fontWeight: 700,
        textTransform: "capitalize",
        letterSpacing: "0.06em",
      }}
    >
      {role}
    </span>
  );
}

// ─── Log Detail Drawer ────────────────────────────────────────────────────────

function LogDetailDrawer({
  log,
  onClose,
}: {
  log: AuditLog;
  onClose: () => void;
}) {
  const catCfg = CATEGORY_CONFIG[log.category];
  const stsCfg = STATUS_CONFIG[log.status];

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 1200,
          background: "rgba(9,17,26,0.6)",
          backdropFilter: "blur(4px)",
        }}
      />
      {/* Drawer */}
      <div
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
          zIndex: 1201,
          width: "min(520px, 100vw)",
          background: "linear-gradient(180deg,#1a2a3d 0%,#111c2a 100%)",
          borderLeft: "1px solid rgba(201,169,110,0.15)",
          display: "flex",
          flexDirection: "column",
          boxShadow: "-20px 0 60px rgba(0,0,0,0.5)",
          animation: "al-slide-in 0.3s cubic-bezier(0.22,1,0.36,1)",
        }}
      >
        <style>{`@keyframes al-slide-in{from{transform:translateX(100%)}to{transform:translateX(0)}}`}</style>

        {/* Header */}
        <div
          style={{
            padding: "20px 24px",
            borderBottom: "1px solid rgba(201,169,110,0.1)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                background: stsCfg.dot,
                boxShadow: `0 0 8px ${stsCfg.dot}`,
              }}
            />
            <span
              style={{
                color: "rgb(229,224,198)",
                fontWeight: 700,
                fontSize: 15,
              }}
            >
              Log Details
            </span>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "rgba(229,224,198,0.35)",
              fontSize: 18,
              transition: "color 0.2s",
            }}
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "24px",
            scrollbarWidth: "thin",
          }}
        >
          {/* Action banner */}
          <div
            style={{
              background: `${catCfg.color}12`,
              border: `1px solid ${catCfg.color}30`,
              borderRadius: 14,
              padding: "16px 18px",
              marginBottom: 20,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 8,
              }}
            >
              <CategoryBadge category={log.category} />
              <StatusBadge status={log.status} />
            </div>
            <div
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: "rgb(229,224,198)",
                lineHeight: 1.5,
              }}
            >
              {log.description}
            </div>
            <div
              style={{
                fontSize: 11,
                color: "rgba(229,224,198,0.35)",
                marginTop: 6,
                fontFamily: "monospace",
              }}
            >
              {log.action}
            </div>
          </div>

          {/* Detail sections */}
          {[
            {
              title: "👤 WHO",
              rows: [
                ["Name", log.actor.name || "—"],
                ["Email", log.actor.email || "—"],
                ["Role", <RoleBadge role={log.actor.role} />],
                ["User ID", log.actor.userId ?? "Guest"],
              ],
            },
            {
              title: "📍 WHERE",
              rows: [
                ["Entity Type", log.entityType],
                ["Entity Name", log.entityName ?? "—"],
                ["Entity ID", log.entityId ?? "—"],
                ["Route", log.route ?? "—"],
              ],
            },
            {
              title: "🕐 WHEN",
              rows: [
                ["Date", fmtDate(log.timestamp)],
                ["Time", fmtTime(log.timestamp)],
                ["Time Ago", timeAgo(log.timestamp)],
              ],
            },
            {
              title: "🔧 META",
              rows: [
                ["IP Address", log.ipAddress ?? "—"],
                [
                  "User Agent",
                  log.userAgent ? truncate(log.userAgent, 55) : "—",
                ],
                ["Session ID", log.sessionId ?? "—"],
              ],
            },
          ].map((section) => (
            <div key={section.title} style={{ marginBottom: 20 }}>
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: "rgba(201,169,110,0.6)",
                  letterSpacing: "0.2em",
                  textTransform: "uppercase",
                  marginBottom: 10,
                }}
              >
                {section.title}
              </div>
              <div
                style={{
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(201,169,110,0.08)",
                  borderRadius: 10,
                  overflow: "hidden",
                }}
              >
                {section.rows.map(([label, value], i) => (
                  <div
                    key={String(label)}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      padding: "10px 14px",
                      gap: 12,
                      borderBottom:
                        i < section.rows.length - 1
                          ? "1px solid rgba(255,255,255,0.04)"
                          : "none",
                    }}
                  >
                    <span
                      style={{
                        minWidth: 88,
                        fontSize: 11,
                        color: "rgba(229,224,198,0.3)",
                        fontWeight: 600,
                        letterSpacing: "0.06em",
                        paddingTop: 1,
                      }}
                    >
                      {label}
                    </span>
                    <span
                      style={{
                        fontSize: 12,
                        color: "rgba(229,224,198,0.8)",
                        wordBreak: "break-all",
                        fontFamily:
                          typeof value === "string" && value.length > 20
                            ? "monospace"
                            : "inherit",
                      }}
                    >
                      {value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Changes diff */}
          {log.changes && log.changes.length > 0 && (
            <div>
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: "rgba(201,169,110,0.6)",
                  letterSpacing: "0.2em",
                  textTransform: "uppercase",
                  marginBottom: 10,
                }}
              >
                🔄 CHANGES
              </div>
              <div
                style={{
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(201,169,110,0.08)",
                  borderRadius: 10,
                  overflow: "hidden",
                }}
              >
                {log.changes.map((c, i) => (
                  <div
                    key={i}
                    style={{
                      padding: "10px 14px",
                      borderBottom:
                        i < (log.changes?.length ?? 0) - 1
                          ? "1px solid rgba(255,255,255,0.04)"
                          : "none",
                    }}
                  >
                    <div
                      style={{
                        fontSize: 11,
                        color: "rgba(201,169,110,0.7)",
                        fontWeight: 700,
                        marginBottom: 6,
                      }}
                    >
                      {c.field}
                    </div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <span
                        style={{
                          padding: "2px 8px",
                          borderRadius: 5,
                          background: "#FEE2E2",
                          color: "#DC2626",
                          fontSize: 11,
                          fontFamily: "monospace",
                        }}
                      >
                        − {String(c.before ?? "null")}
                      </span>
                      <span
                        style={{
                          color: "rgba(229,224,198,0.3)",
                          fontSize: 11,
                          alignSelf: "center",
                        }}
                      >
                        →
                      </span>
                      <span
                        style={{
                          padding: "2px 8px",
                          borderRadius: 5,
                          background: "#DCFCE7",
                          color: "#16A34A",
                          fontSize: 11,
                          fontFamily: "monospace",
                        }}
                      >
                        + {String(c.after ?? "null")}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
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

  const inputStyle: React.CSSProperties = {
    width: "100%",
    height: 36,
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(201,169,110,0.15)",
    borderRadius: 8,
    color: "rgb(229,224,198)",
    fontSize: 12,
    padding: "0 10px",
    outline: "none",
    fontFamily: "'Outfit',system-ui,sans-serif",
    transition: "border-color 0.2s",
  };
  const selectStyle: React.CSSProperties = { ...inputStyle, cursor: "pointer" };
  const labelStyle: React.CSSProperties = {
    fontSize: 10,
    fontWeight: 700,
    color: "rgba(229,224,198,0.35)",
    letterSpacing: "0.14em",
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
        background: "rgba(255,255,255,0.025)",
        border: "1px solid rgba(201,169,110,0.1)",
        borderRadius: 16,
        padding: "20px 22px",
        marginBottom: 20,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 16,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span
            style={{ fontSize: 13, fontWeight: 700, color: "rgb(229,224,198)" }}
          >
            Filters
          </span>
          {activeCount > 0 && (
            <span
              style={{
                padding: "1px 7px",
                borderRadius: 99,
                background: "rgba(201,169,110,0.15)",
                color: "#c9a96e",
                fontSize: 10,
                fontWeight: 700,
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
              background: "none",
              border: "1px solid rgba(229,224,198,0.1)",
              borderRadius: 7,
              padding: "5px 12px",
              cursor: "pointer",
              color: "rgba(229,224,198,0.4)",
              fontSize: 11,
              fontFamily: "'Outfit',system-ui,sans-serif",
              transition: "all 0.2s",
            }}
          >
            Reset
          </button>
          <button
            onClick={() => onApply(local)}
            style={{
              background: "linear-gradient(135deg,#c9a96e,#b8934a)",
              border: "none",
              borderRadius: 7,
              padding: "5px 14px",
              cursor: "pointer",
              color: "#09111a",
              fontSize: 11,
              fontWeight: 700,
              fontFamily: "'Outfit',system-ui,sans-serif",
            }}
          >
            Apply
          </button>
        </div>
      </div>

      {/* Filter grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill,minmax(170px,1fr))",
          gap: 14,
        }}
      >
        {/* Search */}
        <div style={{ gridColumn: "span 2" }}>
          <label style={labelStyle}>Search</label>
          <input
            style={{
              ...inputStyle,
              paddingLeft: 32,
              backgroundImage:
                "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%23c9a96e66' stroke-width='2'%3E%3Ccircle cx='11' cy='11' r='8'/%3E%3Cpath d='M21 21l-4.35-4.35'/%3E%3C/svg%3E\")",
              backgroundRepeat: "no-repeat",
              backgroundPosition: "10px center",
            }}
            placeholder="Name, email, action, entity…"
            value={local.search}
            onChange={(e) => set("search", e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onApply(local)}
          />
        </div>

        {/* Category */}
        <div>
          <label style={labelStyle}>Category</label>
          <select
            style={selectStyle}
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

        {/* Status */}
        <div>
          <label style={labelStyle}>Status</label>
          <select
            style={selectStyle}
            value={local.status}
            onChange={(e) => set("status", e.target.value)}
          >
            <option value="">All Statuses</option>
            {Object.entries(STATUS_CONFIG).map(([k, v]) => (
              <option key={k} value={k}>
                {v.label}
              </option>
            ))}
          </select>
        </div>

        {/* Role */}
        <div>
          <label style={labelStyle}>Role</label>
          <select
            style={selectStyle}
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

        {/* Date From */}
        <div>
          <label style={labelStyle}>From</label>
          <input
            type="date"
            style={inputStyle}
            value={local.dateFrom}
            onChange={(e) => set("dateFrom", e.target.value)}
          />
        </div>

        {/* Date To */}
        <div>
          <label style={labelStyle}>To</label>
          <input
            type="date"
            style={inputStyle}
            value={local.dateTo}
            onChange={(e) => set("dateTo", e.target.value)}
          />
        </div>
      </div>

      {/* Quick filters */}
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
                padding: "4px 12px",
                borderRadius: 99,
                cursor: "pointer",
                fontSize: 11,
                fontWeight: 700,
                fontFamily: "'Outfit',system-ui,sans-serif",
                transition: "all 0.2s",
                background: active
                  ? "rgba(201,169,110,0.15)"
                  : "rgba(255,255,255,0.03)",
                border: active
                  ? "1px solid rgba(201,169,110,0.4)"
                  : "1px solid rgba(229,224,198,0.06)",
                color: active ? "#c9a96e" : "rgba(229,224,198,0.4)",
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

// ─── Stats Bar ────────────────────────────────────────────────────────────────

function StatsBar({ logs }: { logs: AuditLog[] }) {
  const counts = logs.reduce(
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

  return (
    <div
      style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 20 }}
    >
      {/* Total */}
      <div
        style={{
          flex: "0 0 auto",
          padding: "10px 18px",
          background: "rgba(255,255,255,0.025)",
          border: "1px solid rgba(201,169,110,0.12)",
          borderRadius: 12,
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <span style={{ fontSize: 22, fontWeight: 800, color: "#c9a96e" }}>
          {logs.length}
        </span>
        <span
          style={{
            fontSize: 11,
            color: "rgba(229,224,198,0.4)",
            letterSpacing: "0.1em",
          }}
        >
          TOTAL
        </span>
      </div>

      {/* Status counts */}
      {(["success", "info", "warning", "danger"] as const).map((s) => {
        const cfg = STATUS_CONFIG[s];
        const n = counts[s] ?? 0;
        if (!n) return null;
        return (
          <div
            key={s}
            style={{
              flex: "0 0 auto",
              padding: "10px 16px",
              background: `${cfg.bg}`,
              border: `1px solid ${cfg.color}22`,
              borderRadius: 12,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: "50%",
                background: cfg.dot,
                flexShrink: 0,
              }}
            />
            <span style={{ fontSize: 18, fontWeight: 800, color: cfg.color }}>
              {n}
            </span>
            <span
              style={{
                fontSize: 10,
                color: cfg.color,
                opacity: 0.7,
                letterSpacing: "0.1em",
                fontWeight: 700,
              }}
            >
              {s.toUpperCase()}
            </span>
          </div>
        );
      })}

      {/* Top category */}
      {Object.entries(catCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([cat, n]) => {
          const cfg = CATEGORY_CONFIG[cat as AuditActionCategory];
          if (!cfg) return null;
          return (
            <div
              key={cat}
              style={{
                flex: "0 0 auto",
                padding: "10px 16px",
                background: cfg.bg,
                border: `1px solid ${cfg.border}`,
                borderRadius: 12,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <span style={{ fontSize: 16, fontWeight: 800, color: cfg.color }}>
                {n}
              </span>
              <span
                style={{
                  fontSize: 10,
                  color: cfg.color,
                  opacity: 0.8,
                  letterSpacing: "0.1em",
                  fontWeight: 700,
                }}
              >
                {cfg.label.toUpperCase()}
              </span>
            </div>
          );
        })}
    </div>
  );
}

// ─── Main Table Row ───────────────────────────────────────────────────────────

function LogRow({ log, onClick }: { log: AuditLog; onClick: () => void }) {
  const [hovered, setHovered] = useState(false);

  return (
    <tr
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        borderBottom: "1px solid rgba(201,169,110,0.05)",
        cursor: "pointer",
        background: hovered ? "rgba(201,169,110,0.04)" : "transparent",
        transition: "background 0.15s",
      }}
    >
      {/* Timestamp */}
      <td
        style={{
          padding: "12px 16px",
          whiteSpace: "nowrap",
          verticalAlign: "middle",
        }}
      >
        <div
          style={{
            fontSize: 12,
            color: "rgba(229,224,198,0.7)",
            fontWeight: 500,
          }}
        >
          {fmtDate(log.timestamp)}
        </div>
        <div
          style={{ fontSize: 10, color: "rgba(229,224,198,0.3)", marginTop: 2 }}
        >
          {fmtTime(log.timestamp)}
        </div>
        <div
          style={{
            fontSize: 9,
            color: "rgba(201,169,110,0.5)",
            marginTop: 3,
            letterSpacing: "0.06em",
          }}
        >
          {timeAgo(log.timestamp)}
        </div>
      </td>

      {/* Actor */}
      <td style={{ padding: "12px 16px", verticalAlign: "middle" }}>
        <div
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: "rgba(229,224,198,0.85)",
          }}
        >
          {truncate(log.actor.name, 22)}
        </div>
        {log.actor.email && (
          <div
            style={{
              fontSize: 10,
              color: "rgba(229,224,198,0.3)",
              marginTop: 2,
            }}
          >
            {truncate(log.actor.email, 28)}
          </div>
        )}
        <div style={{ marginTop: 4 }}>
          <RoleBadge role={log.actor.role} />
        </div>
      </td>

      {/* Action */}
      <td style={{ padding: "12px 16px", verticalAlign: "middle" }}>
        <div style={{ marginBottom: 5 }}>
          <CategoryBadge category={log.category} />
        </div>
        <div
          style={{
            fontSize: 11,
            color: "rgba(201,169,110,0.7)",
            fontFamily: "monospace",
            letterSpacing: "0.03em",
          }}
        >
          {log.action}
        </div>
      </td>

      {/* Description */}
      <td
        style={{ padding: "12px 16px", verticalAlign: "middle", maxWidth: 280 }}
      >
        <div
          style={{
            fontSize: 12,
            color: "rgba(229,224,198,0.75)",
            lineHeight: 1.5,
          }}
        >
          {truncate(log.description, 70)}
        </div>
        {log.entityName && (
          <div
            style={{
              fontSize: 10,
              color: "rgba(229,224,198,0.3)",
              marginTop: 3,
            }}
          >
            {log.entityType}: {truncate(log.entityName, 30)}
          </div>
        )}
      </td>

      {/* Status */}
      <td
        style={{
          padding: "12px 16px",
          verticalAlign: "middle",
          textAlign: "center",
        }}
      >
        <StatusBadge status={log.status} />
      </td>

      {/* Meta */}
      <td style={{ padding: "12px 16px", verticalAlign: "middle" }}>
        {log.ipAddress && (
          <div
            style={{
              fontSize: 10,
              color: "rgba(229,224,198,0.3)",
              fontFamily: "monospace",
            }}
          >
            {log.ipAddress}
          </div>
        )}
        {log.changes && log.changes.length > 0 && (
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 3,
              padding: "1px 6px",
              borderRadius: 5,
              background: "rgba(201,169,110,0.08)",
              color: "rgba(201,169,110,0.7)",
              fontSize: 9,
              fontWeight: 700,
              marginTop: 3,
            }}
          >
            {log.changes.length} change{log.changes.length > 1 ? "s" : ""}
          </div>
        )}
      </td>
    </tr>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState({ hasFilters }: { hasFilters: boolean }) {
  return (
    <tr>
      <td colSpan={6}>
        <div style={{ textAlign: "center", padding: "60px 20px" }}>
          <div style={{ fontSize: 40, marginBottom: 12, opacity: 0.2 }}>📋</div>
          <div
            style={{
              fontSize: 15,
              fontWeight: 600,
              color: "rgba(229,224,198,0.5)",
              marginBottom: 6,
            }}
          >
            No audit logs found
          </div>
          <div style={{ fontSize: 12, color: "rgba(229,224,198,0.25)" }}>
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
  const tableRef = useRef<HTMLDivElement>(null);

  const hasActiveFilters = Object.entries(filters).some(
    ([k, v]) => v && v !== DEFAULT_AUDIT_FILTERS[k as keyof AuditFilters],
  );

  // Column headers
  const cols = [
    { key: "timestamp", label: "Timestamp", w: 130 },
    { key: "actor", label: "Actor", w: 160 },
    { key: "action", label: "Category", w: 130 },
    { key: "description", label: "Description", w: undefined },
    { key: "status", label: "Status", w: 90 },
    { key: "meta", label: "Meta", w: 100 },
  ];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap');
        .al-page { font-family: 'Outfit', system-ui, sans-serif; color: rgb(229,224,198); }
        .al-page input, .al-page select { color-scheme: dark; }
        .al-page input::placeholder { color: rgba(229,224,198,0.2); }
        .al-page input:focus, .al-page select:focus {
          border-color: rgba(201,169,110,0.4) !important;
          outline: none;
        }
        .al-tbl { width: 100%; border-collapse: collapse; }
        .al-tbl thead th {
          padding: 10px 16px;
          font-size: 9px; font-weight: 700; letter-spacing: 0.16em; text-transform: uppercase;
          color: rgba(229,224,198,0.3);
          border-bottom: 1px solid rgba(201,169,110,0.1);
          text-align: left; white-space: nowrap;
          background: rgba(255,255,255,0.015);
          position: sticky; top: 0; z-index: 1;
        }
        .al-tbl tbody tr:last-child { border-bottom: none; }
        .al-spinner { width: 28px; height: 28px; border: 2px solid rgba(201,169,110,0.15); border-top-color: #c9a96e; border-radius: 50%; animation: al-spin 0.8s linear infinite; }
        @keyframes al-spin { to { transform: rotate(360deg); } }
        .al-load-more-btn {
          width: 100%; height: 44px;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(201,169,110,0.15);
          border-radius: 10px; cursor: pointer;
          color: rgba(229,224,198,0.45); font-family: 'Outfit', system-ui, sans-serif;
          font-size: 12px; font-weight: 700; letter-spacing: 0.08em;
          transition: all 0.25s ease;
        }
        .al-load-more-btn:hover:not(:disabled) {
          background: rgba(201,169,110,0.08);
          border-color: rgba(201,169,110,0.3);
          color: #c9a96e;
        }
        .al-load-more-btn:disabled { opacity: 0.4; cursor: not-allowed; }
        @keyframes al-fadein { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
      `}</style>

      <div
        className="al-page"
        style={{
          padding: "28px 32px 80px",
          minHeight: "100vh",
          animation: "al-fadein 0.4s ease",
        }}
      >
        {/* ── PAGE HEADER ─────────────────────────────────────────────────── */}
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
                color: "rgb(229,224,198)",
                letterSpacing: "-0.02em",
                margin: 0,
              }}
            >
              Audit Logs
            </h1>
            <p
              style={{
                fontSize: 13,
                color: "rgba(229,224,198,0.35)",
                marginTop: 4,
                margin: "4px 0 0",
              }}
            >
              Complete activity trail · All user and admin actions
            </p>
          </div>

          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            {/* Filter toggle */}
            <button
              onClick={() => setShowFilters((v) => !v)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 7,
                padding: "9px 16px",
                borderRadius: 10,
                cursor: "pointer",
                fontFamily: "'Outfit',system-ui,sans-serif",
                fontSize: 12,
                fontWeight: 700,
                transition: "all 0.2s",
                background: showFilters
                  ? "rgba(201,169,110,0.12)"
                  : "rgba(255,255,255,0.04)",
                border: showFilters
                  ? "1px solid rgba(201,169,110,0.35)"
                  : "1px solid rgba(229,224,198,0.08)",
                color: showFilters ? "#c9a96e" : "rgba(229,224,198,0.6)",
              }}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
              </svg>
              Filters
              {hasActiveFilters && (
                <span
                  style={{
                    width: 16,
                    height: 16,
                    borderRadius: "50%",
                    background: "#c9a96e",
                    color: "#09111a",
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

            {/* Refresh */}
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
                fontFamily: "'Outfit',system-ui,sans-serif",
                fontSize: 12,
                fontWeight: 600,
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(229,224,198,0.06)",
                color: "rgba(229,224,198,0.45)",
                opacity: loading ? 0.5 : 1,
                transition: "all 0.2s",
              }}
            >
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                style={{
                  animation: loading ? "al-spin 0.8s linear infinite" : "none",
                }}
              >
                <polyline points="23 4 23 10 17 10" />
                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
              </svg>
              Refresh
            </button>
          </div>
        </div>

        {/* ── FILTER PANEL ────────────────────────────────────────────────── */}
        {showFilters && (
          <FilterPanel
            filters={filters}
            onApply={(f) => applyFilters(f)}
            onReset={() => {
              resetFilters();
            }}
          />
        )}

        {/* ── ERROR ───────────────────────────────────────────────────────── */}
        {error && (
          <div
            style={{
              padding: "14px 18px",
              borderRadius: 12,
              marginBottom: 20,
              background: "rgba(220,38,38,0.08)",
              border: "1px solid rgba(220,38,38,0.2)",
              color: "#f87171",
              fontSize: 13,
            }}
          >
            ⚠️ {error}
          </div>
        )}

        {/* ── STATS BAR ───────────────────────────────────────────────────── */}
        {logs.length > 0 && <StatsBar logs={logs} />}

        {/* ── TABLE ───────────────────────────────────────────────────────── */}
        <div
          ref={tableRef}
          style={{
            background: "rgba(255,255,255,0.022)",
            border: "1px solid rgba(201,169,110,0.1)",
            borderRadius: 18,
            overflow: "hidden",
          }}
        >
          <div style={{ overflowX: "auto" }}>
            <table className="al-tbl">
              <thead>
                <tr>
                  {cols.map((c) => (
                    <th key={c.key} style={{ width: c.w }}>
                      {c.label}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {loading && logs.length === 0 ? (
                  <tr>
                    <td colSpan={6}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          padding: "60px 20px",
                          gap: 14,
                        }}
                      >
                        <div className="al-spinner" />
                        <span
                          style={{
                            fontSize: 13,
                            color: "rgba(229,224,198,0.3)",
                          }}
                        >
                          Loading audit logs…
                        </span>
                      </div>
                    </td>
                  </tr>
                ) : logs.length === 0 ? (
                  <EmptyState hasFilters={hasActiveFilters} />
                ) : (
                  logs.map((log) => (
                    <LogRow
                      key={log.id}
                      log={log}
                      onClick={() => setSelectedLog(log)}
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Load more */}
          {(hasMore || (loading && logs.length > 0)) && (
            <div
              style={{
                padding: "16px 20px",
                borderTop: "1px solid rgba(201,169,110,0.06)",
              }}
            >
              <button
                className="al-load-more-btn"
                onClick={loadMore}
                disabled={loading}
              >
                {loading ? (
                  <span
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                    }}
                  >
                    <div
                      className="al-spinner"
                      style={{ width: 14, height: 14 }}
                    />{" "}
                    Loading…
                  </span>
                ) : (
                  "Load More Logs"
                )}
              </button>
            </div>
          )}

          {/* Footer */}
          {logs.length > 0 && (
            <div
              style={{
                padding: "10px 20px",
                borderTop: "1px solid rgba(201,169,110,0.06)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <span style={{ fontSize: 11, color: "rgba(229,224,198,0.25)" }}>
                Showing {logs.length} log{logs.length !== 1 ? "s" : ""}
                {hasActiveFilters ? " (filtered)" : ""}
              </span>
              {hasActiveFilters && (
                <button
                  onClick={resetFilters}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    fontSize: 11,
                    color: "rgba(201,169,110,0.5)",
                    fontFamily: "'Outfit',system-ui,sans-serif",
                    transition: "color 0.2s",
                  }}
                >
                  Clear all filters
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── DETAIL DRAWER ────────────────────────────────────────────────── */}
      {selectedLog && (
        <LogDetailDrawer
          log={selectedLog}
          onClose={() => setSelectedLog(null)}
        />
      )}
    </>
  );
}
