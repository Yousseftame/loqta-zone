/**
 * src/components/Navbar/ProfileDropdown.tsx
 *
 * LIVE & DYNAMIC — subscribes to users/{uid} via onSnapshot.
 * Displays real-time: fullName, profileImage, role, totalBids, totalWins, walletBalance, verified
 *
 * Design matches existing Loqta Zone dark-gold aesthetic exactly.
 * All existing props, exports, and menu navigation are preserved.
 */

import { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  LogOut,
  User,
  LayoutDashboard,
  Ticket,
  Heart,
  Settings,
  Gavel,
  Trophy,
  Wallet,
  CheckCircle,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { doc, onSnapshot } from "firebase/firestore";
import type { User as FirebaseUser } from "firebase/auth";
import type { UserRole } from "@/store/AuthContext/AuthContext";
import { db } from "@/firebase/firebase";

// ── Design tokens ──────────────────────────────────────────────
const GOLD = "#c9a96e";
const GOLD2 = "#b8944e";
const CREAM = "rgb(229,224,198)";

// ── Menu items ─────────────────────────────────────────────────
const USER_ITEMS = [
  { labelKey: "auth.myProfile", to: "/my-profile", Icon: User },
  { labelKey: "auth.myBids", to: "/my-bids", Icon: Ticket },
  { labelKey: "auth.watchlist", to: "/watchlist", Icon: Heart },
  { labelKey: "auth.settings", to: "/settings", Icon: Settings },
];

const ADMIN_ITEMS = [
  { labelKey: "auth.dashboard", to: "/admin", Icon: LayoutDashboard },
  { labelKey: "auth.settings", to: "/settings", Icon: Settings },
];

// ── Firestore live profile ─────────────────────────────────────
interface LiveProfile {
  fullName: string;
  firstName: string;
  profileImage: string | null;
  role: UserRole;
  totalBids: number;
  totalWins: number;
  walletBalance: number;
  verified: boolean;
}

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
        marginTop: 5,
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
        {t(cfg.labelKey)}
      </span>
    </span>
  );
};

// ── Stat pill ──────────────────────────────────────────────────
const StatPill = ({
  icon: Icon,
  value,
  label,
  color,
}: {
  icon: any;
  value: number | string;
  label: string;
  color: string;
}) => (
  <div
    style={{
      flex: 1,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: 3,
      padding: "8px 6px",
      borderRadius: 10,
      background: "rgba(255,255,255,0.03)",
      border: "1px solid rgba(229,224,198,0.06)",
    }}
  >
    <Icon size={13} style={{ color, opacity: 0.85 }} strokeWidth={2} />
    <span
      style={{
        fontSize: 13,
        fontWeight: 800,
        color: CREAM,
        fontFamily: "'Jost',sans-serif",
        lineHeight: 1,
      }}
    >
      {value}
    </span>
    <span
      style={{
        fontSize: 8,
        fontWeight: 700,
        color: "rgba(229,224,198,0.3)",
        letterSpacing: "0.1em",
        textTransform: "uppercase",
        fontFamily: "'Jost',sans-serif",
      }}
    >
      {label}
    </span>
  </div>
);

// ── Menu item ──────────────────────────────────────────────────
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
  const [liveProfile, setLiveProfile] = useState<LiveProfile | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { t } = useTranslation();

  // ── Real-time Firestore subscription ──────────────────────
  useEffect(() => {
    if (!user?.uid) return;

    const unsub = onSnapshot(
      doc(db, "users", user.uid),
      (snap) => {
        if (!snap.exists()) return;
        const d = snap.data();
        setLiveProfile({
          fullName: d.fullName ?? user.displayName ?? "User",
          firstName: d.firstName ?? "",
          profileImage: d.profileImage ?? null,
          role: (d.role as UserRole) ?? "user",
          totalBids: d.totalBids ?? 0,
          totalWins: d.totalWins ?? 0,
          walletBalance: d.walletBalance ?? 0,
          verified: d.verified ?? false,
        });
      },
      (err) => {
        console.warn("[ProfileDropdown] Firestore snapshot error:", err);
      },
    );

    return () => unsub();
  }, [user?.uid]);

  // ── Derived display values ──────────────────────────────────
  const displayName = liveProfile?.fullName ?? user.displayName ?? "User";
  const photoURL = liveProfile?.profileImage ?? user.photoURL ?? null;
  const displayRole = (liveProfile?.role ?? role ?? "user") as UserRole;
  const initials = getInitials(displayName);
  const avatarColor = getAvatarColor(displayName);
  const menuItems =
    displayRole === "admin" || displayRole === "superAdmin"
      ? ADMIN_ITEMS
      : USER_ITEMS;

  // ── Outside click close ─────────────────────────────────────
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
          background: photoURL
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
          position: "relative",
        }}
      >
        {photoURL ? (
          <img
            src={photoURL}
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
        {/* Verified dot */}
        {liveProfile?.verified && (
          <span
            style={{
              position: "absolute",
              bottom: 1,
              right: 1,
              width: 12,
              height: 12,
              borderRadius: "50%",
              background: "#22c55e",
              border: "2px solid #080d1a",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <CheckCircle size={7} style={{ color: "#fff" }} strokeWidth={3} />
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
            right: 0,
            width: 240,
            background: "linear-gradient(160deg, #112237 0%, #0a0f1e 100%)",
            border: "1px solid rgba(201,169,110,0.18)",
            borderRadius: 16,
            padding: "0 0 8px",
            boxShadow:
              "0 20px 60px rgba(0,0,0,0.7), 0 0 0 1px rgba(201,169,110,0.06)",
            backdropFilter: "blur(20px)",
            zIndex: 200,
            animation: "loqDropIn 0.22s cubic-bezier(0.22,1,0.36,1)",
            overflow: "hidden",
          }}
        >
          {/* Gold top line */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: 1.5,
              background:
                "linear-gradient(90deg, transparent, rgba(201,169,110,0.6), transparent)",
            }}
          />

          {/* ── Header: avatar + name + email ── */}
          <div
            style={{
              padding: "14px 14px 12px",
              borderBottom: "1px solid rgba(229,224,198,0.07)",
              marginBottom: 0,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
              {/* Avatar */}
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: "50%",
                  flexShrink: 0,
                  background: photoURL
                    ? "transparent"
                    : `linear-gradient(135deg, ${avatarColor}, ${GOLD2})`,
                  border: `2px solid rgba(201,169,110,0.35)`,
                  overflow: "hidden",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 13,
                  fontWeight: 800,
                  color: "#fff",
                  fontFamily: "'Jost', sans-serif",
                  position: "relative",
                }}
              >
                {photoURL ? (
                  <img
                    src={photoURL}
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
                {liveProfile?.verified && (
                  <span
                    style={{
                      position: "absolute",
                      bottom: 1,
                      right: 1,
                      width: 11,
                      height: 11,
                      borderRadius: "50%",
                      background: "#22c55e",
                      border: "2px solid #0a0f1e",
                    }}
                  />
                )}
              </div>

              {/* Name + email */}
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
                  {displayName}
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
                <RoleBadge role={displayRole} />
              </div>
            </div>

            {/* ── Live stats row ── */}
            {liveProfile && (
              <div style={{ display: "flex", gap: 6, marginTop: 12 }}>
                <StatPill
                  icon={Gavel}
                  value={liveProfile.totalBids}
                  label="Bids"
                  color="#64a0ff"
                />
                <StatPill
                  icon={Trophy}
                  value={liveProfile.totalWins}
                  label="Wins"
                  color={GOLD}
                />
                <StatPill
                  icon={Wallet}
                  value={`${liveProfile.walletBalance}`}
                  label="EGP"
                  color="#5ee8a0"
                />
              </div>
            )}
          </div>

          {/* ── Menu items ── */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 2,
              padding: "6px 6px 0",
            }}
          >
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

          {/* ── Logout ── */}
          <div style={{ padding: "0 6px" }}>
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
        </div>
      )}
    </div>
  );
};
