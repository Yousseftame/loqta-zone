import { useState, useEffect } from "react";
import {
  X,
  Menu,
  LogOut,
  User,
  LayoutDashboard,
  Ticket,
  Heart,
  Settings,
} from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/store/AuthContext/AuthContext";
import { ProfileDropdown } from "./ProfileDropdown";
import LangSwitcher from "./LangSwitcher";

// ── Design tokens ──────────────────────────────────────────────────────────────
const GOLD = "#c9a96e";
const GOLD2 = "#b8944e";
const CREAM = "rgb(229, 224, 198)";

const NAV_LINKS = [
  { labelKey: "nav.auctions", to: "/", icon: "◇" },
  { labelKey: "nav.howItWorks", to: "/how-it-works", icon: "◈" },
  { labelKey: "nav.about", to: "/aboutUs", icon: "✦" },
  { labelKey: "nav.contact", to: "/contact", icon: "◇" },
  { labelKey: "nav.cantFind", to: "/cantFind", icon: "◇" },
];

// ── Keep these in EXACT sync with ProfileDropdown.tsx ─────────────────────────
const USER_MOBILE_ITEMS = [
  { labelKey: "auth.myProfile", to: "/my-profile", Icon: User },
  { labelKey: "auth.myBids", to: "/my-bids", Icon: Ticket },
  // { labelKey: "auth.watchlist", to: "/watchlist", Icon: Heart },
  { labelKey: "auth.settings", to: "/change-password", Icon: Settings },
];

const ADMIN_MOBILE_ITEMS = [
  { labelKey: "auth.dashboard", to: "/admin", Icon: LayoutDashboard },
  { labelKey: "auth.settings", to: "/settings", Icon: Settings },
];

// ══════════════════════════════════════════════════════════════════════════════
// NAVBAR
// ══════════════════════════════════════════════════════════════════════════════
const Navbar = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [bgProgress, setBgProgress] = useState(0);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, role, logout } = useAuth();
  const { t, i18n } = useTranslation();

  const mobileItems =
    role === "admin" || role === "superAdmin"
      ? ADMIN_MOBILE_ITEMS
      : USER_MOBILE_ITEMS;

  const visibleNavLinks = NAV_LINKS.filter(
    (l) => l.labelKey !== "nav.cantFind" || !!user,
  );

  useEffect(() => {
    const fn = () => {
      const y = window.scrollY;
      setScrolled(y > 50);
      setBgProgress(Math.min(1, y / 120));
    };
    fn();
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (menuOpen) {
      const y = window.scrollY;
      document.body.style.cssText = `position:fixed;top:-${y}px;width:100%;overflow:hidden`;
    } else {
      const y = document.body.style.top;
      document.body.style.cssText = "";
      window.scrollTo(0, parseInt(y || "0") * -1);
    }
    return () => {
      document.body.style.cssText = "";
    };
  }, [menuOpen]);

  return (
    <>
      <style>{`
        @keyframes loqDropIn {
          from { opacity:0; transform:translateY(-8px) scale(.97); }
          to   { opacity:1; transform:translateY(0) scale(1); }
        }
        .loq-link { position:relative; font-family:'Jost',sans-serif; font-size:19px; font-weight:700; letter-spacing:.04em; color:rgba(229,224,198,.85); text-decoration:none; padding:6px 0; transition:color .25s; }
        .loq-link::after { content:''; position:absolute; bottom:0; left:0; width:0; height:1.5px; background:linear-gradient(90deg,${GOLD},transparent); border-radius:999px; transition:width .35s cubic-bezier(.22,1,.36,1); }
        .loq-link:hover,.loq-link.active { color:${GOLD}; }
        .loq-link:hover::after,.loq-link.active::after { width:100%; }
        .btn-ghost { font-family:'Jost',sans-serif; font-size:13px; font-weight:800; letter-spacing:.18em; text-transform:uppercase; padding:9px 20px; border-radius:999px; border:1px solid rgba(201,169,110,.45); color:${GOLD}; background:transparent; text-decoration:none; transition:all .3s; display:inline-flex; align-items:center; white-space:nowrap; }
        .btn-ghost:hover { background:rgba(201,169,110,.08); border-color:${GOLD}; box-shadow:0 0 18px rgba(201,169,110,.18); }
        .btn-nav-signin {
          font-family: 'Jost', sans-serif;
          font-size: 13px;
          font-weight: 800;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          padding: 9px 20px;
          border-radius: 999px;
          border: none;
          color: #0a0a1a;
          background: linear-gradient(135deg, ${GOLD}, ${GOLD2});
          text-decoration: none;
          transition: all 0.3s ease;
          white-space: nowrap;
          box-shadow: 0 4px 16px rgba(201,169,110,0.28);
          display: inline-flex;
          align-items: center;
        }
        .btn-nav-signin:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(201,169,110,0.42);
        }
      `}</style>

      {/* ── TOP BAR ─────────────────────────────────────────────────────────── */}
      <nav
        dir="ltr"
        className="fixed top-0 left-0 right-0 z-50"
        style={{
          padding: scrolled ? "4px 0" : "8px 0",
          transition: "padding .5s",
        }}
      >
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 0,
            background: "linear-gradient(180deg,#1f2a3d 0%,#224266 100%)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            boxShadow: "0 4px 24px rgba(0,0,0,.4)",
            borderBottom: "1px solid rgba(229,224,198,.07)",
            opacity: bgProgress,
            transition: "opacity 0.45s cubic-bezier(0.4, 0, 0.2, 1)",
            pointerEvents: "none",
          }}
        />

        <div
          className="max-w-7xl mx-auto px-6 lg:px-12 flex items-center justify-between"
          style={{ position: "relative", zIndex: 1 }}
        >
          <Link
            to="/"
            style={{ marginTop: -18, marginBottom: -18 }}
            className="flex-shrink-0 hover:scale-105 transition-transform duration-300"
          >
            <img
              src="/loqta-removebg-preview.png"
              alt="Loqta Zone"
              className="h-32 lg:h-36 w-auto opacity-95 drop-shadow-lg"
            />
          </Link>

          {/* Desktop links + auth */}
          <div className="hidden lg:flex items-center gap-8 ml-auto">
            <div
              dir={i18n.language === "ar" ? "rtl" : "ltr"}
              className="flex items-center gap-8"
            >
              {visibleNavLinks.map((l) => (
                <Link
                  key={l.labelKey}
                  to={l.to}
                  className={`loq-link ${location.pathname === l.to ? "active" : ""}`}
                >
                  {t(l.labelKey)}
                </Link>
              ))}
            </div>

            <div dir="ltr" className="flex items-center gap-3 ml-2">
              {user ? (
                <ProfileDropdown user={user} role={role} onLogout={logout} />
              ) : (
                <>
                  <Link to="/register" className="btn-ghost">
                    {t("auth.register")}
                  </Link>
                  <Link to="/login" className="btn-nav-signin">
                    {t("auth.signIn")}
                  </Link>
                </>
              )}
              <LangSwitcher />
            </div>
          </div>

          {/* Mobile controls */}
          <div className="lg:hidden flex items-center gap-2">
            {user && (
              <ProfileDropdown user={user} role={role} onLogout={logout} />
            )}
            <LangSwitcher mobile />
            <button
              onClick={() => setMenuOpen((v) => !v)}
              style={{
                width: 42,
                height: 42,
                borderRadius: 12,
                background: menuOpen
                  ? "rgba(201,169,110,.1)"
                  : "rgba(255,255,255,.04)",
                border: `1px solid ${menuOpen ? "rgba(201,169,110,.3)" : "rgba(229,224,198,.1)"}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                color: menuOpen ? GOLD : "rgba(229,224,198,.8)",
                position: "relative",
                zIndex: 70,
                transition: "all .3s",
              }}
            >
              {menuOpen ? (
                <X size={20} strokeWidth={2} />
              ) : (
                <Menu size={20} strokeWidth={2} />
              )}
            </button>
          </div>
        </div>
      </nav>

      {/* ── MOBILE BACKDROP ─────────────────────────────────────────────────── */}
      <div
        className="lg:hidden"
        onClick={() => setMenuOpen(false)}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 55,
          background: "rgba(5,8,18,.7)",
          backdropFilter: "blur(4px)",
          opacity: menuOpen ? 1 : 0,
          pointerEvents: menuOpen ? "auto" : "none",
          transition: "opacity .38s",
        }}
      />

      {/* ── MOBILE PANEL ────────────────────────────────────────────────────── */}
      <div
        dir="ltr"
        className="lg:hidden"
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
          width: "min(320px,85vw)",
          zIndex: 60,
          background: "linear-gradient(180deg,#1f2a3d 0%,#224266 100%)",
          borderLeft: "1px solid rgba(201,169,110,.1)",
          boxShadow: "-24px 0 64px rgba(0,0,0,.65)",
          transform: menuOpen ? "translateX(0)" : "translateX(110%)",
          transition: "transform .48s cubic-bezier(.22,1,.36,1)",
          display: "flex",
          flexDirection: "column",
          overflowY: "auto",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 1,
            background: `linear-gradient(90deg,transparent,${GOLD}66,transparent)`,
          }}
        />

        {/* Panel header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "18px 18px 14px",
            borderBottom: "1px solid rgba(229,224,198,.055)",
            flexShrink: 0,
          }}
        >
          <Link to="/" onClick={() => setMenuOpen(false)}>
            <img
              src="/loqta-removebg-preview.png"
              alt="Loqta Zone"
              style={{ height: 130, width: "auto" }}
            />
          </Link>
          <button
            onClick={() => setMenuOpen(false)}
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: "rgba(255,255,255,.04)",
              border: "1px solid rgba(229,224,198,.08)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              color: "rgba(229,224,198,.55)",
            }}
          >
            <X size={15} strokeWidth={2} />
          </button>
        </div>

        {/* Section label */}
        <div style={{ padding: "16px 20px 6px", flexShrink: 0 }}>
          <span
            style={{
              fontSize: 9,
              fontWeight: 800,
              color: `${GOLD}77`,
              letterSpacing: ".28em",
              textTransform: "uppercase",
              fontFamily: "'Jost',sans-serif",
            }}
          >
            {t("nav.menu")}
          </span>
        </div>

        {/* Nav links */}
        <div
          style={{
            padding: "4px 12px",
            display: "flex",
            flexDirection: "column",
            gap: 3,
            flexShrink: 0,
          }}
        >
          {visibleNavLinks.map((link, i) => {
            const active = location.pathname === link.to;
            return (
              <Link
                key={link.labelKey}
                to={link.to}
                onClick={() => setMenuOpen(false)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  padding: "14px 16px",
                  borderRadius: 14,
                  background: active ? "rgba(201,169,110,.08)" : "transparent",
                  border: `1px solid ${active ? "rgba(201,169,110,.2)" : "transparent"}`,
                  textDecoration: "none",
                  color: active ? GOLD : "rgba(229,224,198,.72)",
                  fontSize: 14,
                  fontWeight: 600,
                  letterSpacing: ".08em",
                  textTransform: "uppercase",
                  fontFamily: "'Jost',sans-serif",
                  opacity: menuOpen ? 1 : 0,
                  transform: menuOpen ? "translateX(0)" : "translateX(20px)",
                  transition: `all .28s ease ${menuOpen ? 0.1 + i * 0.055 : 0}s`,
                }}
              >
                <span
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 10,
                    background: active
                      ? "rgba(201,169,110,.12)"
                      : "rgba(255,255,255,.04)",
                    border: `1px solid ${active ? "rgba(201,169,110,.22)" : "rgba(229,224,198,.07)"}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 14,
                    flexShrink: 0,
                  }}
                >
                  {link.icon}
                </span>
                <span style={{ flex: 1 }}>{t(link.labelKey)}</span>
                {active && (
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background: GOLD,
                      boxShadow: `0 0 8px ${GOLD}`,
                    }}
                  />
                )}
              </Link>
            );
          })}
        </div>

        <div
          style={{
            margin: "14px 20px",
            height: 1,
            background:
              "linear-gradient(90deg,transparent,rgba(229,224,198,.08),transparent)",
            flexShrink: 0,
          }}
        />

        {/* ── Mobile auth section ──────────────────────────────────────────── */}
        <div
          style={{
            padding: "0 12px",
            display: "flex",
            flexDirection: "column",
            gap: 8,
            opacity: menuOpen ? 1 : 0,
            transform: menuOpen ? "translateY(0)" : "translateY(12px)",
            transition: "opacity .4s ease .32s, transform .4s ease .32s",
            flexShrink: 0,
          }}
        >
          {user ? (
            <>
              {/* User info card — matches ProfileDropdown header */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "12px 14px",
                  borderRadius: 14,
                  background: "rgba(201,169,110,.05)",
                  border: "1px solid rgba(201,169,110,.12)",
                  marginBottom: 2,
                }}
              >
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: "50%",
                    background: user.photoURL
                      ? "transparent"
                      : `linear-gradient(135deg,#64a080,${GOLD2})`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    fontSize: 14,
                    fontWeight: 800,
                    color: "#fff",
                    fontFamily: "'Jost',sans-serif",
                    border: "2px solid rgba(201,169,110,.3)",
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
                    (user.displayName?.[0]?.toUpperCase() ?? "?")
                  )}
                </div>
                <div style={{ minWidth: 0 }}>
                  <p
                    style={{
                      margin: 0,
                      fontSize: 13,
                      fontWeight: 700,
                      color: CREAM,
                      fontFamily: "'Jost',sans-serif",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {user.displayName || "User"}
                  </p>
                  <p
                    style={{
                      margin: 0,
                      fontSize: 10,
                      color: "rgba(229,224,198,.38)",
                      fontFamily: "'Jost',sans-serif",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {user.email}
                  </p>
                </div>
              </div>

              {/* Menu items — identical routes & labels as ProfileDropdown */}
              {mobileItems.map(({ labelKey, to, Icon }) => (
                <Link
                  key={to}
                  to={to}
                  onClick={() => setMenuOpen(false)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "12px 14px",
                    borderRadius: 13,
                    textDecoration: "none",
                    color: "rgba(229,224,198,.7)",
                    fontSize: 13,
                    fontWeight: 600,
                    fontFamily: "'Jost',sans-serif",
                    border: "1px solid transparent",
                    transition: "all .22s",
                  }}
                  onMouseEnter={(e) => {
                    const el = e.currentTarget as HTMLAnchorElement;
                    el.style.background = "rgba(201,169,110,.06)";
                    el.style.borderColor = "rgba(201,169,110,.14)";
                  }}
                  onMouseLeave={(e) => {
                    const el = e.currentTarget as HTMLAnchorElement;
                    el.style.background = "transparent";
                    el.style.borderColor = "transparent";
                  }}
                >
                  <span
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 9,
                      background: "rgba(255,255,255,.04)",
                      border: "1px solid rgba(229,224,198,.07)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <Icon size={14} strokeWidth={2} style={{ opacity: 0.65 }} />
                  </span>
                  {t(labelKey)}
                </Link>
              ))}

              {/* Sign out */}
              <button
                onClick={async () => {
                  setMenuOpen(false);
                  await logout();
                  navigate("/");
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "12px 14px",
                  borderRadius: 13,
                  border: "1px solid rgba(255,80,80,.15)",
                  background: "rgba(255,80,80,.05)",
                  color: "rgba(255,100,100,.75)",
                  fontSize: 13,
                  fontWeight: 700,
                  fontFamily: "'Jost',sans-serif",
                  cursor: "pointer",
                  transition: "all .22s",
                  marginTop: 2,
                  width: "100%",
                  textAlign: "left",
                }}
                onMouseEnter={(e) => {
                  const el = e.currentTarget as HTMLButtonElement;
                  el.style.background = "rgba(255,80,80,.1)";
                  el.style.color = "#ff6464";
                }}
                onMouseLeave={(e) => {
                  const el = e.currentTarget as HTMLButtonElement;
                  el.style.background = "rgba(255,80,80,.05)";
                  el.style.color = "rgba(255,100,100,.75)";
                }}
              >
                <span
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 9,
                    background: "rgba(255,80,80,.08)",
                    border: "1px solid rgba(255,80,80,.15)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <LogOut size={14} strokeWidth={2} />
                </span>
                {t("auth.signOut")}
              </button>
            </>
          ) : (
            <>
              <Link
                to="/register"
                onClick={() => setMenuOpen(false)}
                className="btn-ghost"
                style={{
                  justifyContent: "center",
                  borderRadius: 13,
                  padding: 13,
                }}
              >
                ✦ {t("auth.register")}
              </Link>
              <Link
                to="/login"
                onClick={() => setMenuOpen(false)}
                className="btn-nav-signin"
                style={{
                  justifyContent: "center",
                  borderRadius: 13,
                  padding: 13,
                  fontSize:15,
                }}
              >
                {t("auth.signIn")}
              </Link>
            </>
          )}
        </div>

        {/* Language */}
        {/* <div
          style={{
            padding: "18px 20px 10px",
            opacity: menuOpen ? 1 : 0,
            transition: "opacity .4s ease .38s",
            flexShrink: 0,
          }}
        >
          <p
            style={{
              margin: "0 0 10px",
              fontSize: 9,
              fontWeight: 800,
              color: "rgba(229,224,198,.22)",
              letterSpacing: ".22em",
              textTransform: "uppercase",
              fontFamily: "'Jost',sans-serif",
            }}
          >
            {t("nav.language")}
          </p>
          
        </div> */}

        {/* Footer */}
        <div
          style={{
            marginTop: "auto",
            padding: "14px 20px 32px",
            borderTop: "1px solid rgba(229,224,198,.05)",
            opacity: menuOpen ? 1 : 0,
            transition: "opacity .4s ease .42s",
            flexShrink: 0,
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: 10,
              color: "rgba(229,224,198,.15)",
              letterSpacing: ".06em",
              fontFamily: "'Jost',sans-serif",
            }}
          >
            © {new Date().getFullYear()} {t("footer.copyright")}
          </p>
        </div>
      </div>
    </>
  );
};

export default Navbar;
