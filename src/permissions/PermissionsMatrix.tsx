/**
 * src/permissions/PermissionsMatrix.tsx
 *
 * A full CRUD permissions matrix rendered inside the CreateAdminForm (and
 * EditAdminPermissions) dialogs.
 *
 * - When role = "superAdmin": all checkboxes are checked + disabled, with
 *   a banner explaining full access is automatic.
 * - When role = "admin": fully interactive checkboxes.
 * - Includes "Grant All" / "Revoke All" per-row AND a global toggle.
 * - Checking any CRUD action automatically checks "read" (you can't
 *   create/update/delete what you can't see).
 */

import { Box, Chip, Tooltip } from "@mui/material";
import { ShieldCheck, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import { colors } from "@/pages/Admin/Products/products-data";
import {
  MODULE_META,
  fullPermissions,
  emptyPermissions,
  type AdminPermissions,
  type PermissionAction,
  type PermissionModule,
} from "./permissions-data";

// ─── Action label / color config ─────────────────────────────────────────────

const ACTION_CONFIG: Record<
  PermissionAction,
  { label: string; color: string; bg: string }
> = {
  create: { label: "Create", color: "#16A34A", bg: "#DCFCE7" },
  read: { label: "Read", color: "#2563EB", bg: "#DBEAFE" },
  update: { label: "Edit", color: "#D97706", bg: "#FEF3C7" },
  delete: { label: "Delete", color: "#DC2626", bg: "#FEE2E2" },
};

// ─── Props ────────────────────────────────────────────────────────────────────

interface PermissionsMatrixProps {
  role: "admin" | "superAdmin";
  value: AdminPermissions;
  onChange: (next: AdminPermissions) => void;
  disabled?: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function PermissionsMatrix({
  role,
  value,
  onChange,
  disabled,
}: PermissionsMatrixProps) {
  const isSuperAdmin = role === "superAdmin";
  const [collapsed, setCollapsed] = useState(false);

  // ── Helpers ────────────────────────────────────────────────────────────────

  /** Toggle a single cell */
  function toggle(module: PermissionModule, action: PermissionAction) {
    if (isSuperAdmin || disabled) return;
    const current = value[module][action];
    const next = {
      ...value,
      [module]: { ...value[module], [action]: !current },
    };

    // If enabling any non-read action, also auto-enable read
    if (!current && action !== "read") {
      next[module].read = true;
    }
    // If disabling read, also disable everything else (can't act on what you can't see)
    if (current && action === "read") {
      next[module] = {
        create: false,
        read: false,
        update: false,
        delete: false,
      };
    }
    onChange(next);
  }

  /** Toggle all actions for one row */
  function toggleRow(module: PermissionModule) {
    if (isSuperAdmin || disabled) return;
    const meta = MODULE_META.find((m) => m.key === module)!;
    const current = meta.actions.every((a) => value[module][a]);
    const next = { ...value, [module]: { ...value[module] } };
    for (const a of meta.actions) next[module][a] = !current;
    onChange(next);
  }

  /** Grant / revoke everything */
  function toggleAll(grant: boolean) {
    if (isSuperAdmin || disabled) return;
    onChange(grant ? fullPermissions() : emptyPermissions());
  }

  // ── Is all granted? ───────────────────────────────────────────────────────
  const allGranted = MODULE_META.every((m) =>
    m.actions.every((a) => value[m.key][a]),
  );
  const anyGranted = MODULE_META.some((m) =>
    m.actions.some((a) => value[m.key][a]),
  );

  return (
    <Box>
      {/* Header row */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          mb: 1.5,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <span
            style={{
              fontSize: "0.72rem",
              fontWeight: 700,
              color: colors.textMuted,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
            }}
          >
            Module Permissions
          </span>
          {!isSuperAdmin && (
            <Chip
              size="small"
              label={
                allGranted
                  ? "All granted"
                  : anyGranted
                    ? "Partial"
                    : "No access"
              }
              sx={{
                height: 18,
                fontSize: "0.62rem",
                fontWeight: 700,
                bgcolor: allGranted
                  ? "#DCFCE7"
                  : anyGranted
                    ? "#FEF3C7"
                    : "#FEE2E2",
                color: allGranted
                  ? "#16A34A"
                  : anyGranted
                    ? "#D97706"
                    : "#DC2626",
              }}
            />
          )}
        </Box>
        <Box sx={{ display: "flex", gap: 0.5, alignItems: "center" }}>
          {!isSuperAdmin && !disabled && (
            <>
              <button
                type="button"
                onClick={() => toggleAll(true)}
                style={{
                  fontSize: "0.7rem",
                  fontWeight: 600,
                  padding: "3px 8px",
                  borderRadius: 6,
                  border: `1px solid #16A34A`,
                  color: "#16A34A",
                  background: "#DCFCE7",
                  cursor: "pointer",
                }}
              >
                Grant All
              </button>
              <button
                type="button"
                onClick={() => toggleAll(false)}
                style={{
                  fontSize: "0.7rem",
                  fontWeight: 600,
                  padding: "3px 8px",
                  borderRadius: 6,
                  border: `1px solid #DC2626`,
                  color: "#DC2626",
                  background: "#FEE2E2",
                  cursor: "pointer",
                }}
              >
                Revoke All
              </button>
            </>
          )}
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: colors.textMuted,
              display: "flex",
              alignItems: "center",
              padding: "3px 4px",
            }}
          >
            {collapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
          </button>
        </Box>
      </Box>

      {/* superAdmin banner */}
      {isSuperAdmin && (
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1.5,
            p: 1.5,
            borderRadius: 2,
            mb: 1.5,
            bgcolor: "#FFFBEB",
            border: "1px solid #F59E0B",
          }}
        >
          <ShieldCheck size={16} style={{ color: "#D97706", flexShrink: 0 }} />
          <p
            style={{
              margin: 0,
              fontSize: "0.78rem",
              color: "#92400E",
              lineHeight: 1.5,
            }}
          >
            <strong>
              Super Admins have full access to all features by default.
            </strong>{" "}
            Individual permissions cannot be restricted.
          </p>
        </Box>
      )}

      {/* Matrix */}
      {!collapsed && (
        <Box
          sx={{
            border: `1px solid ${colors.border}`,
            borderRadius: 2,
            overflow: "hidden",
            opacity: isSuperAdmin ? 0.55 : 1,
          }}
        >
          {/* Column headers */}
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "1fr 36px 36px 36px 36px 60px",
              gap: 0,
              bgcolor: colors.primaryBg,
              borderBottom: `1px solid ${colors.border}`,
              px: 1.5,
              py: 1,
            }}
          >
            <span
              style={{
                fontSize: "0.65rem",
                fontWeight: 700,
                color: colors.primaryDark,
                textTransform: "uppercase",
              }}
            >
              Module
            </span>
            {(["create", "read", "update", "delete"] as PermissionAction[]).map(
              (a) => (
                <Tooltip key={a} title={ACTION_CONFIG[a].label} placement="top">
                  <Box sx={{ display: "flex", justifyContent: "center" }}>
                    <span
                      style={{
                        fontSize: "0.58rem",
                        fontWeight: 700,
                        color: ACTION_CONFIG[a].color,
                        textTransform: "uppercase",
                        letterSpacing: "0.03em",
                      }}
                    >
                      {ACTION_CONFIG[a].label.charAt(0)}
                    </span>
                  </Box>
                </Tooltip>
              ),
            )}
            <span
              style={{
                fontSize: "0.58rem",
                fontWeight: 700,
                color: colors.textMuted,
                textTransform: "uppercase",
                textAlign: "center",
              }}
            >
              All
            </span>
          </Box>

          {/* Module rows */}
          {MODULE_META.map((m, idx) => {
            const rowAllGranted = m.actions.every((a) => value[m.key][a]);
            return (
              <Box
                key={m.key}
                sx={{
                  display: "grid",
                  gridTemplateColumns: "1fr 36px 36px 36px 36px 60px",
                  gap: 0,
                  px: 1.5,
                  py: 0.75,
                  bgcolor: idx % 2 === 0 ? "#fff" : "#FAFAFA",
                  borderBottom:
                    idx < MODULE_META.length - 1
                      ? `1px solid ${colors.border}`
                      : "none",
                  alignItems: "center",
                  transition: "background 0.1s",
                  "&:hover": { bgcolor: colors.primaryBg },
                }}
              >
                {/* Module label */}
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                  <span style={{ fontSize: "0.85rem" }}>{m.icon}</span>
                  <span
                    style={{
                      fontSize: "0.78rem",
                      fontWeight: 500,
                      color: colors.textPrimary,
                    }}
                  >
                    {m.label}
                  </span>
                </Box>

                {/* CRUD checkboxes */}
                {(
                  ["create", "read", "update", "delete"] as PermissionAction[]
                ).map((action) => {
                  const applicable = m.actions.includes(action);
                  const checked = isSuperAdmin
                    ? true
                    : applicable
                      ? value[m.key][action]
                      : false;
                  return (
                    <Box
                      key={action}
                      sx={{ display: "flex", justifyContent: "center" }}
                    >
                      {applicable ? (
                        <Tooltip
                          title={`${ACTION_CONFIG[action].label} ${m.label}`}
                          placement="top"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            disabled={isSuperAdmin || disabled}
                            onChange={() => toggle(m.key, action)}
                            style={{
                              width: 15,
                              height: 15,
                              cursor:
                                isSuperAdmin || disabled
                                  ? "not-allowed"
                                  : "pointer",
                              accentColor: ACTION_CONFIG[action].color,
                            }}
                          />
                        </Tooltip>
                      ) : (
                        <span style={{ fontSize: "0.65rem", color: "#D1D5DB" }}>
                          —
                        </span>
                      )}
                    </Box>
                  );
                })}

                {/* Row toggle button */}
                <Box sx={{ display: "flex", justifyContent: "center" }}>
                  <button
                    type="button"
                    onClick={() => toggleRow(m.key)}
                    disabled={isSuperAdmin || disabled}
                    style={{
                      fontSize: "0.6rem",
                      fontWeight: 700,
                      padding: "2px 7px",
                      borderRadius: 5,
                      border: `1px solid ${rowAllGranted ? "#DC2626" : "#16A34A"}`,
                      color: rowAllGranted ? "#DC2626" : "#16A34A",
                      background: rowAllGranted ? "#FEE2E2" : "#DCFCE7",
                      cursor:
                        isSuperAdmin || disabled ? "not-allowed" : "pointer",
                      opacity: isSuperAdmin || disabled ? 0.5 : 1,
                    }}
                  >
                    {rowAllGranted ? "Revoke" : "All"}
                  </button>
                </Box>
              </Box>
            );
          })}
        </Box>
      )}
    </Box>
  );
}
