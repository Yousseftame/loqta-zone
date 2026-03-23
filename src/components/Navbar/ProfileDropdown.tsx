import { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  LogOut,
  User,
  LayoutDashboard,
  Ticket,
  Heart,
  Settings,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import type { User as FirebaseUser } from "firebase/auth";
import type { UserRole } from "@/store/AuthContext/AuthContext";

// ── Constants ─────────────────────────────────────────────────
const GOLD = "#c9a96e";
const GOLD2 = "#b8944e";
const CREAM = "rgb(229,224,198)";

const USER_ITEMS = [
  { labelKey: "auth.myProfile", to: "/my-profile", Icon: User },
  { labelKey: "auth.myBids", to: "/my-bids", Icon: Ticket },
  // { labelKey: "auth.watchlist", to: "/watchlist", Icon: Heart },
  { labelKey: "auth.settings", to: "/change-password", Icon: Settings },
];

const ADMIN_ITEMS = [
  { labelKey: "auth.dashboard", to: "/admin", Icon: LayoutDashboard },
  { labelKey: "auth.settings", to: "/settings", Icon: Settings },
];

// ── Helpers ────────────────────────────────────────────────────
const getInitials = (name?: string | null) => {
  if (!name) return "?";
  const p = name.trim().split(" ");
  return p.length === 1
    ? p[0][0].toUpperCase()
    : (p[0][0] + p[p.length - 1][0]).toUpperCase();
};

const getAvatarColor = (name?: string | null) => {
  if (!name) return GOLD;
  const h = name.split("").reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
  return `hsl(${h}, 55%, 48%)`;
};

// ── Role badge ─────────────────────────────────────────────────
const RoleBadge = ({ role }: { role: UserRole }) => {
  const { t } = useTranslation();

  const cfg = {
    superAdmin: {
      color: GOLD,
      bg: "rgba(201,169,110,0.15)",
      border: "rgba(201,169,110,0.3)",
      labelKey: "common.superAdmin",
    },
    admin: {
      color: "#64a0ff",
      bg: "rgba(100,160,255,0.10)",
      border: "rgba(100,160,255,0.25)",
      labelKey: "common.admin",
    },
    user: {
      color: "rgba(229,224,198,0.45)",
      bg: "rgba(255,255,255,0.05)",
      border: "rgba(255,255,255,0.08)",
      labelKey: "common.member",
    },
  }[role];

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: "3px 8px",
        borderRadius: 999,
        background: cfg.bg,
        border: `1px solid ${cfg.border}`,
        marginTop: 6,
      }}
    >
      <span
        style={{
          width: 5,
          height: 5,
          borderRadius: "50%",
          background: cfg.color,
          boxShadow: role !== "user" ? `0 0 6px ${cfg.color}` : "none",
        }}
      />
      <span
        style={{
          fontSize: 13,
          fontWeight: 800,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: cfg.color,
          fontFamily: "'Jost', sans-serif",
        }}
      >
        {t(cfg.labelKey)}
      </span>
    </span>
  );
};

// ── Dropdown menu item ─────────────────────────────────────────
const MenuItem = ({
  to,
  Icon,
  label,
  onClick,
}: {
  to: string;
  Icon: React.ElementType;
  label: string;
  onClick?: () => void;
}) => (
  <Link
    to={to}
    onClick={onClick}
    style={{
      display: "flex",
      alignItems: "center",
      gap: 10,
      padding: "9px 12px",
      borderRadius: 10,
      textDecoration: "none",
      color: "rgba(229,224,198,0.65)",
      fontSize: 13,
      fontWeight: 600,
      fontFamily: "'Jost', sans-serif",
      transition: "all 0.2s ease",
    }}
    onMouseEnter={(e) => {
      const el = e.currentTarget as HTMLAnchorElement;
      el.style.background = "rgba(201,169,110,0.07)";
      el.style.color = CREAM;
    }}
    onMouseLeave={(e) => {
      const el = e.currentTarget as HTMLAnchorElement;
      el.style.background = "transparent";
      el.style.color = "rgba(229,224,198,0.65)";
    }}
  >
    <Icon size={14} strokeWidth={2} style={{ opacity: 0.7, flexShrink: 0 }} />
    {label}
  </Link>
);

// ── Main component ─────────────────────────────────────────────
interface ProfileDropdownProps {
  user: FirebaseUser;
  role: UserRole | null;
  onLogout: () => Promise<void>;
  upward?: boolean;
}

export const ProfileDropdown = ({
  user,
  role,
  onLogout,
  upward = false,
}: ProfileDropdownProps) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { t } = useTranslation();

  const initials = getInitials(user.displayName);
  const avatarColor = getAvatarColor(user.displayName);
  const menuItems =
    role === "admin" || role === "superAdmin" ? ADMIN_ITEMS : USER_ITEMS;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleLogout = async () => {
    setOpen(false);
    await onLogout();
    navigate("/");
  };

  // ── Compute safe dropdown positioning ──────────────────────
  // On mobile the avatar can be very close to the right edge.
  // We calculate how much space is available to the right of the
  // dropdown's right edge (0px offset) and clamp accordingly so it
  // never overflows the viewport.
  const [dropStyle, setDropStyle] = useState<React.CSSProperties>({});

  useEffect(() => {
    if (!open || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const dropW = 220;
    const viewW = window.innerWidth;
    const safeMargin = 8; // px from viewport edge

    // Default: align right edge of dropdown with right edge of avatar
    let rightOffset = 0;

    // If the dropdown would go off the left edge of the screen, push it right
    const leftEdge = rect.right - dropW;
    if (leftEdge < safeMargin) {
      // Switch to left-aligned relative to avatar instead
      rightOffset = -(viewW - rect.right - safeMargin);
      if (rightOffset > 0) rightOffset = 0; // don't push past right edge
    }

    setDropStyle({
      right: rightOffset,
      // Cap width so it never exceeds available screen width
      width: Math.min(dropW, viewW - safeMargin * 2),
    });
  }, [open]);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      {/* ── Avatar button ── */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Profile menu"
        style={{
          width: 45,
          height: 45,
          borderRadius: "50%",
          padding: 0,
          cursor: "pointer",
          background: user.photoURL
            ? "transparent"
            : `linear-gradient(135deg, ${avatarColor}, ${GOLD2})`,
          border: `2px solid ${open ? GOLD : "rgba(201,169,110,0.35)"}`,
          boxShadow: open
            ? `0 0 0 3px rgba(201,169,110,0.18), 0 4px 16px rgba(201,169,110,0.25)`
            : "0 2px 8px rgba(0,0,0,0.35)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
          transition: "all 0.28s ease",
          flexShrink: 0,
        }}
      >
        {user.photoURL ? (
          <img
            src={user.photoURL}
            alt="Profile"
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          <span
            style={{
              fontSize: 13,
              fontWeight: 800,
              color: "#fff",
              fontFamily: "'Jost', sans-serif",
            }}
          >
            {initials}
          </span>
        )}
      </button>

      {/* ── Dropdown panel ── */}
      {open && (
        <div
          dir="ltr"
          style={{
            position: "absolute",
            top: upward ? "auto" : "calc(100% + 12px)",
            bottom: upward ? "calc(100% + 12px)" : "auto",
            // right is computed dynamically to avoid viewport overflow
            ...dropStyle,
            // Minimum 220px, but capped to viewport on tiny screens
            background: "linear-gradient(180deg,#224266 0%,#1f2a3d 100%)",
            border: "1px solid rgba(201,169,110,0.18)",
            borderRadius: 16,
            padding: 8,
            boxShadow:
              "0 20px 60px rgba(0,0,0,0.7), 0 0 0 1px rgba(201,169,110,0.06)",
            backdropFilter: "blur(20px)",
            zIndex: 200,
            animation: "loqDropIn 0.22s cubic-bezier(0.22,1,0.36,1)",
            // Prevent content from being cut off on small screens
            maxHeight: "calc(100vh - 80px)",
            overflowY: "auto",
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: "10px 12px 12px",
              borderBottom: "1px solid rgba(229,224,198,0.07)",
              marginBottom: 6,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: "50%",
                  background: user.photoURL
                    ? "transparent"
                    : `linear-gradient(135deg, ${avatarColor}, ${GOLD2})`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  fontSize: 11,
                  fontWeight: 800,
                  color: "#fff",
                  fontFamily: "'Jost', sans-serif",
                  overflow: "hidden",
                }}
              >
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt="Profile"
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                  />
                ) : (
                  initials
                )}
              </div>
              <div style={{ minWidth: 0 }}>
                <p
                  style={{
                    margin: 0,
                    fontSize: 13,
                    fontWeight: 700,
                    color: CREAM,
                    fontFamily: "'Jost', sans-serif",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {user.displayName || "User"}
                </p>
                <p
                  style={{
                    margin: 0,
                    fontSize: 10,
                    color: "rgba(229,224,198,0.38)",
                    fontFamily: "'Jost', sans-serif",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {user.email}
                </p>
              </div>
            </div>
            {role && <RoleBadge role={role} />}
          </div>

          {/* Items */}
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {menuItems.map((item) => (
              <MenuItem
                key={item.to}
                to={item.to}
                Icon={item.Icon}
                label={t(item.labelKey)}
                onClick={() => setOpen(false)}
              />
            ))}
          </div>

          <div
            style={{
              margin: "6px 0",
              height: 1,
              background:
                "linear-gradient(90deg, transparent, rgba(229,224,198,0.07), transparent)",
            }}
          />

          {/* Logout */}
          <button
            onClick={handleLogout}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "9px 12px",
              borderRadius: 10,
              border: "none",
              background: "transparent",
              color: "rgba(255,100,100,0.65)",
              fontSize: 13,
              fontWeight: 600,
              fontFamily: "'Jost', sans-serif",
              cursor: "pointer",
              transition: "all 0.2s ease",
              textAlign: "left",
            }}
            onMouseEnter={(e) => {
              const el = e.currentTarget as HTMLButtonElement;
              el.style.background = "rgba(255,80,80,0.08)";
              el.style.color = "#ff6464";
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget as HTMLButtonElement;
              el.style.background = "transparent";
              el.style.color = "rgba(255,100,100,0.65)";
            }}
          >
            <LogOut size={14} strokeWidth={2} style={{ flexShrink: 0 }} />
            {t("auth.signOut")}
          </button>
        </div>
      )}
    </div>
  );
};
