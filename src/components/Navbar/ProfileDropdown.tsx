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
import type { User as FirebaseUser } from "firebase/auth";
import type { UserRole } from "@/store/AuthContext/AuthContext";

// ── Constants ─────────────────────────────────────────────────
const GOLD = "#c9a96e";
const GOLD2 = "#b8944e";
const CREAM = "rgb(229,224,198)";

const USER_ITEMS = [
  { label: "My Profile", to: "/profile", Icon: User },
  { label: "My Bids", to: "/my-bids", Icon: Ticket },
  { label: "Watchlist", to: "/watchlist", Icon: Heart },
  { label: "Settings", to: "/settings", Icon: Settings },
];

const ADMIN_ITEMS = [
  { label: "Dashboard", to: "/admin", Icon: LayoutDashboard },
  { label: "Settings", to: "/settings", Icon: Settings },
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
  const cfg = {
    superAdmin: {
      color: GOLD,
      bg: "rgba(201,169,110,0.15)",
      border: "rgba(201,169,110,0.3)",
      label: "Super Admin",
    },
    admin: {
      color: "#64a0ff",
      bg: "rgba(100,160,255,0.10)",
      border: "rgba(100,160,255,0.25)",
      label: "Admin",
    },
    user: {
      color: "rgba(229,224,198,0.45)",
      bg: "rgba(255,255,255,0.05)",
      border: "rgba(255,255,255,0.08)",
      label: "Member",
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
          fontSize: 9,
          fontWeight: 800,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: cfg.color,
          fontFamily: "'Jost', sans-serif",
        }}
      >
        {cfg.label}
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
  /** When true the dropdown opens upward (for mobile panel) */
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
          style={{
            position: "absolute",
            top: upward ? "auto" : "calc(100% + 12px)",
            bottom: upward ? "calc(100% + 12px)" : "auto",
            right: 0,
            width: 220,
            background: "linear-gradient(160deg, #112237 0%, #0a0f1e 100%)",
            border: "1px solid rgba(201,169,110,0.18)",
            borderRadius: 16,
            padding: 8,
            boxShadow:
              "0 20px 60px rgba(0,0,0,0.7), 0 0 0 1px rgba(201,169,110,0.06)",
            backdropFilter: "blur(20px)",
            zIndex: 200,
            animation: "loqDropIn 0.22s cubic-bezier(0.22,1,0.36,1)",
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
                label={item.label}
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
            Sign Out
          </button>
        </div>
      )}
    </div>
  );
};
