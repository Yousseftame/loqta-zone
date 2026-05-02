/**
 * LogDetailModal.tsx
 *
 * Reusable modal components for AuditLogsPage.
 * Extracted for clean separation — import and use in AuditLogsPage.tsx.
 */

import { X } from "lucide-react";
import type {
  AuditLog,
  AuditActionCategory,
} from "../../../service/audit/audit-log-data";
import { CATEGORY_CONFIG } from "../../../service/audit/audit-log-data";

// ─── Design tokens (must match AuditLogsPage) ─────────────────────────────────
export const C = {
  primary: "#2A4863",
  primaryLight: "#3D6A8A",
  primaryDark: "#1E40AF",
  primaryBg: "#EFF6FF",
  primaryRing: "#DBEAFE",
  surface: "#FFFFFF",
  border: "#E2E8F0",
  muted: "#F8FAFC",
  textPrimary: "#0F172A",
  textSecondary: "#64748B",
  textMuted: "#94A3B8",
  success: "#22C55E",
  successBg: "#DCFCE7",
  error: "#EF4444",
  errorBg: "#FEE2E2",
  warning: "#F97316",
  warningBg: "#FFEDD5",
  info: "#3B82F6",
  infoBg: "#DBEAFE",
};

export const STATUS_LIGHT: Record<
  string,
  { bg: string; color: string; dot: string; label: string }
> = {
  success: {
    bg: "#DCFCE7",
    color: "#16A34A",
    dot: "#22C55E",
    label: "Success",
  },
  info: { bg: "#DBEAFE", color: "#1D4ED8", dot: "#3B82F6", label: "Info" },
  warning: {
    bg: "#FEF3C7",
    color: "#B45309",
    dot: "#F59E0B",
    label: "Warning",
  },
  danger: { bg: "#FEE2E2", color: "#DC2626", dot: "#EF4444", label: "Danger" },
};

const ROLE_STYLE: Record<string, { bg: string; color: string }> = {
  superAdmin: { bg: "#FEF3C7", color: "#B45309" },
  admin: { bg: "#FEE2E2", color: "#DC2626" },
  user: { bg: "#DBEAFE", color: "#2563EB" },
  guest: { bg: "#F3F4F6", color: "#6B7280" },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
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

// ─── Badge components ─────────────────────────────────────────────────────────
export function StatusBadge({ status }: { status: AuditLog["status"] }) {
  const s = STATUS_LIGHT[status] ?? STATUS_LIGHT.info;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        padding: "3px 10px",
        borderRadius: 999,
        background: s.bg,
        color: s.color,
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: "0.04em",
        border: `1px solid ${s.color}33`,
        whiteSpace: "nowrap",
      }}
    >
      <span
        style={{
          width: 5,
          height: 5,
          borderRadius: "50%",
          background: s.dot,
          flexShrink: 0,
        }}
      />
      {s.label}
    </span>
  );
}

export function CategoryBadge({ category }: { category: AuditActionCategory }) {
  const cfg = CATEGORY_CONFIG[category];
  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px 9px",
        borderRadius: 6,
        background: cfg.bg,
        color: cfg.color,
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        border: `1px solid ${cfg.border}`,
        whiteSpace: "nowrap",
      }}
    >
      {cfg.label}
    </span>
  );
}

export function RoleBadge({ role }: { role: AuditLog["actor"]["role"] }) {
  const s = ROLE_STYLE[role] ?? ROLE_STYLE.guest;
  return (
    <span
      style={{
        padding: "2px 8px",
        borderRadius: 5,
        background: s.bg,
        color: s.color,
        fontSize: 10,
        fontWeight: 700,
        textTransform: "capitalize",
        letterSpacing: "0.04em",
      }}
    >
      {role}
    </span>
  );
}

/** Prominent action badge — used in table rows and modal */
export function ActionBadge({ action }: { action: string }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        padding: "4px 10px",
        borderRadius: 7,
        background: `linear-gradient(135deg, ${C.primary} 0%, ${C.primaryLight} 100%)`,
        color: "#fff",
        fontSize: 10,
        fontWeight: 800,
        letterSpacing: "0.1em",
        textTransform: "uppercase",
        boxShadow: "0 2px 8px rgba(42,72,99,0.25)",
        whiteSpace: "nowrap",
      }}
    >
      {action}
    </span>
  );
}

// ─── Reusable: Modal Section ──────────────────────────────────────────────────
function ModalSection({
  icon,
  title,
  rows,
}: {
  icon: string;
  title: string;
  rows: [string, React.ReactNode][];
}) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div
        style={{
          fontSize: 10,
          fontWeight: 700,
          color: C.textMuted,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          marginBottom: 8,
          display: "flex",
          alignItems: "center",
          gap: 5,
        }}
      >
        <span>{icon}</span> {title}
      </div>
      <div
        style={{
          background: C.muted,
          border: `1px solid ${C.border}`,
          borderRadius: 10,
          overflow: "hidden",
        }}
      >
        {rows.map(([label, value], i) => (
          <div
            key={String(label)}
            style={{
              display: "flex",
              alignItems: "flex-start",
              padding: "9px 14px",
              gap: 12,
              borderBottom:
                i < rows.length - 1 ? `1px solid ${C.border}` : "none",
            }}
          >
            <span
              style={{
                minWidth: 80,
                fontSize: 11,
                color: C.textMuted,
                fontWeight: 600,
                letterSpacing: "0.04em",
                paddingTop: 1,
                flexShrink: 0,
              }}
            >
              {label}
            </span>
            <span
              style={{
                fontSize: 12,
                color: C.textPrimary,
                wordBreak: "break-all",
                fontFamily:
                  typeof value === "string" &&
                  (value.length > 20 ||
                    label === "IP Address" ||
                    label === "Session ID")
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
  );
}

// ─── Reusable: Who Section ────────────────────────────────────────────────────
export function WhoSection({ actor }: { actor: AuditLog["actor"] }) {
  return (
    <ModalSection
      icon="👤"
      title="Who"
      rows={[
        ["Name", actor.name || "—"],
        ["Email", actor.email || "—"],
        ["Role", <RoleBadge role={actor.role} />],
        ["User ID", actor.userId ?? "Guest"],
      ]}
    />
  );
}

// ─── Reusable: Where Section — improved visibility ────────────────────────────
export function WhereSection({
  log,
}: {
  log: Pick<AuditLog, "entityType" | "entityName" | "entityId" | "route">;
}) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div
        style={{
          fontSize: 10,
          fontWeight: 700,
          color: C.textMuted,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          marginBottom: 8,
          display: "flex",
          alignItems: "center",
          gap: 5,
        }}
      >
        <span>📍</span> Where
      </div>
      {/* Highlighted card for location — much more visible */}
      <div
        style={{
          background: `linear-gradient(135deg, ${C.primaryBg} 0%, #E0F2FE 100%)`,
          border: `1.5px solid ${C.primaryRing}`,
          borderRadius: 12,
          overflow: "hidden",
          boxShadow: "0 2px 8px rgba(42,72,99,0.08)",
        }}
      >
        {/* Entity Type + Name as a hero row */}
        <div
          style={{
            padding: "12px 16px",
            borderBottom: `1px solid ${C.primaryRing}`,
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: C.primary,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <span style={{ fontSize: 14 , color: "#fff" }}>✦</span>
          </div>
          <div>
            <div
              style={{
                fontSize: 11,
                color: C.textMuted,
                fontWeight: 600,
                marginBottom: 2,
              }}
            >
              {log.entityType ?? "—"}
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.primary }}>
              {log.entityName ?? "—"}
            </div>
          </div>
        </div>

        {/* Entity ID */}
        <div
          style={{
            padding: "8px 16px",
            borderBottom: `1px solid ${C.primaryRing}`,
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <span
            style={{
              minWidth: 80,
              fontSize: 11,
              color: C.textMuted,
              fontWeight: 600,
            }}
          >
            Entity ID
          </span>
          <span
            style={{
              fontSize: 11,
              fontFamily: "monospace",
              color: C.primaryLight,
              fontWeight: 600,
              wordBreak: "break-all",
            }}
          >
            {log.entityId ?? "—"}
          </span>
        </div>

        {/* Route */}
        <div
          style={{
            padding: "8px 16px",
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <span
            style={{
              minWidth: 80,
              fontSize: 11,
              color: C.textMuted,
              fontWeight: 600,
            }}
          >
            Route
          </span>
          <span
            style={{
              fontSize: 11,
              fontFamily: "monospace",
              color: C.primary,
              fontWeight: 700,
              wordBreak: "break-all",
              background: "#fff",
              padding: "2px 8px",
              borderRadius: 5,
              border: `1px solid ${C.primaryRing}`,
            }}
          >
            {log.route ?? "—"}
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Reusable: When Section ───────────────────────────────────────────────────
export function WhenSection({ timestamp }: { timestamp: Date }) {
  return (
    <ModalSection
      icon="🕐"
      title="When"
      rows={[
        ["Date", fmtDate(timestamp)],
        ["Time", fmtTime(timestamp)],
        ["Time Ago", timeAgo(timestamp)],
      ]}
    />
  );
}

// ─── Reusable: Meta Section ───────────────────────────────────────────────────
export function MetaSection({
  log,
}: {
  log: Pick<AuditLog, "ipAddress" | "userAgent" | "sessionId" | "deviceId" | "port">;
}) {
  return (
    <ModalSection
      icon="🔧"
      title="Meta"
      rows={[
        ["Device ID", log.deviceId ?? "—"],
        ["IP Address", log.ipAddress ?? "—"],
        ["Client Port", log.port ?? "—"],
        ["User Agent", log.userAgent ? truncate(log.userAgent, 50) : "—"],
      ]}
    />
  );
}

// ─── Reusable: Changes Section ────────────────────────────────────────────────
export function ChangesSection({ changes }: { changes: AuditLog["changes"] }) {
  if (!changes || changes.length === 0) return null;
  return (
    <div>
      <div
        style={{
          fontSize: 10,
          fontWeight: 700,
          color: C.textMuted,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          marginBottom: 8,
          display: "flex",
          alignItems: "center",
          gap: 5,
        }}
      >
        🔄 Changes
      </div>
      <div
        style={{
          background: C.muted,
          border: `1px solid ${C.border}`,
          borderRadius: 10,
          overflow: "hidden",
        }}
      >
        {changes.map((c, i) => (
          <div
            key={i}
            style={{
              padding: "10px 14px",
              borderBottom:
                i < changes.length - 1 ? `1px solid ${C.border}` : "none",
            }}
          >
            <div
              style={{
                fontSize: 11,
                color: C.primary,
                fontWeight: 700,
                marginBottom: 6,
              }}
            >
              {c.field}
            </div>
            <div
              style={{
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
                alignItems: "center",
              }}
            >
              <span
                style={{
                  padding: "2px 9px",
                  borderRadius: 5,
                  background: "#FEE2E2",
                  color: "#EF4444",
                  fontSize: 11,
                  fontFamily: "monospace",
                }}
              >
                − {String(c.before ?? "null")}
              </span>
              <span style={{ color: C.textMuted, fontSize: 11 }}>→</span>
              <span
                style={{
                  padding: "2px 9px",
                  borderRadius: 5,
                  background: "#DCFCE7",
                  color: "#22C55E",
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
  );
}

// ─── Reusable: Action Banner (top of modal) ───────────────────────────────────
export function ActionBanner({ log }: { log: AuditLog }) {
  const catCfg = CATEGORY_CONFIG[log.category];
  return (
    <div
      style={{
        background: catCfg.bg,
        border: `1px solid ${catCfg.border}`,
        borderRadius: 12,
        padding: "14px 16px",
        marginBottom: 20,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 10,
          flexWrap: "wrap",
        }}
      >
        <CategoryBadge category={log.category} />
        <StatusBadge status={log.status} />
        {/* Prominent action badge */}
        <ActionBadge action={log.action} />
      </div>
      <div
        style={{
          fontSize: 13,
          fontWeight: 600,
          color: C.textPrimary,
          lineHeight: 1.5,
        }}
      >
        {log.description}
      </div>
    </div>
  );
}

// ─── Main reusable LogDetailModal ─────────────────────────────────────────────
export function LogDetailModal({
  log,
  onClose,
}: {
  log: AuditLog;
  onClose: () => void;
}) {
  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 9998,
          background: "rgba(15,23,42,0.45)",
          backdropFilter: "blur(4px)",
          animation: "al-fadein 0.18s ease forwards",
        }}
      />

      {/* Modal */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 9999,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          pointerEvents: "none",
        }}
      >
        <div
          style={{
            pointerEvents: "all",
            background: "#ffffff",
            borderRadius: 20,
            boxShadow:
              "0 32px 80px rgba(15,23,42,0.18), 0 0 0 1px rgba(226,232,240,0.8)",
            width: "100%",
            maxWidth: 500,
            margin: "0 16px",
            maxHeight: "90vh",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            animation:
              "al-slidein 0.22s cubic-bezier(0.34,1.56,0.64,1) forwards",
          }}
        >
          {/* Top accent bar */}
          <div
            style={{
              height: 4,
              background: `linear-gradient(90deg, ${C.primary} 0%, ${C.primaryLight} 100%)`,
              flexShrink: 0,
            }}
          />

          {/* Header */}
          <div
            style={{
              padding: "20px 24px 16px",
              borderBottom: `1px solid ${C.border}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexShrink: 0,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: C.primaryBg,
                  border: `1px solid ${C.primaryRing}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <span style={{ fontSize: 16 }}>📋</span>
              </div>
              <div>
                <div
                  style={{
                    fontSize: 15,
                    fontWeight: 700,
                    color: C.textPrimary,
                  }}
                >
                  Log Details
                </div>
                {/* Action displayed prominently in header subtitle */}
                <div style={{ marginTop: 3 }}>
                  <ActionBadge action={log.action} />
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              style={{
                background: C.muted,
                border: `1px solid ${C.border}`,
                borderRadius: 8,
                padding: "6px 8px",
                cursor: "pointer",
                color: C.textMuted,
                display: "flex",
                alignItems: "center",
              }}
            >
              <X size={14} />
            </button>
          </div>

          {/* Scrollable body */}
          <div
            style={{ flex: 1, overflowY: "auto", padding: "20px 24px 24px" }}
          >
            <ActionBanner log={log} />
            <WhoSection actor={log.actor} />
            <WhereSection log={log} />
            <WhenSection timestamp={log.timestamp} />
            <MetaSection log={log} />
            <ChangesSection changes={log.changes} />
          </div>

          {/* Footer close */}
          <div
            style={{
              padding: "16px 24px",
              borderTop: `1px solid ${C.border}`,
              flexShrink: 0,
            }}
          >
            <button
              onClick={onClose}
              style={{
                width: "100%",
                padding: "11px 0",
                borderRadius: 10,
                border: `1.5px solid ${C.border}`,
                background: C.muted,
                color: C.textSecondary,
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "system-ui, -apple-system, sans-serif",
                transition: "all 0.18s ease",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background =
                  "#F1F5F9";
                (e.currentTarget as HTMLButtonElement).style.borderColor =
                  "#CBD5E1";
                (e.currentTarget as HTMLButtonElement).style.color =
                  C.textPrimary;
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background =
                  C.muted;
                (e.currentTarget as HTMLButtonElement).style.borderColor =
                  C.border;
                (e.currentTarget as HTMLButtonElement).style.color =
                  C.textSecondary;
              }}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
