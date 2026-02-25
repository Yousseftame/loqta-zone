import { useState, useEffect } from "react";
import {
  X,
  Globe,
  ChevronDown,
  Menu,
  LogOut,
  User,
  LayoutDashboard,
  Ticket,
  Heart,
  Settings,
} from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/store/AuthContext/AuthContext";
import { ProfileDropdown } from "./ProfileDropdown";

// ── Design tokens ──────────────────────────────────────────────
const GOLD = "#c9a96e";
const GOLD2 = "#b8944e";
const CREAM = "rgb(229, 224, 198)";

const NAV_LINKS = [
  { label: "Auctions", to: "/", icon: "◇" },
  { label: "How it works", to: "/how-it-works", icon: "◈" },
  { label: "About Us", to: "/about", icon: "✦" },
  { label: "Contact Us", to: "/contact", icon: "◇" },
];

const USER_MOBILE_ITEMS = [
  { label: "My Profile", to: "/profile", Icon: User },
  { label: "My Bids", to: "/my-bids", Icon: Ticket },
  { label: "Watchlist", to: "/watchlist", Icon: Heart },
  { label: "Settings", to: "/settings", Icon: Settings },
];
const ADMIN_MOBILE_ITEMS = [
  { label: "Dashboard", to: "/admin", Icon: LayoutDashboard },
  { label: "Settings", to: "/settings", Icon: Settings },
];

// ── Language Switcher ──────────────────────────────────────────
const LangSwitcher = ({ mobile = false }: { mobile?: boolean }) => {
  const [lang, setLang] = useState<"en" | "ar">("en");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest(".lang-sw")) setOpen(false);
    };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, []);

  return (
    <div className="lang-sw" style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 5,
          background: open ? "rgba(201,169,110,.08)" : "rgba(255,255,255,.04)",
          border: `1px solid ${open ? "rgba(201,169,110,.35)" : "rgba(229,224,198,.12)"}`,
          borderRadius: 999,
          padding: mobile ? "8px 14px" : "6px 12px",
          color: "rgba(229,224,198,.7)",
          cursor: "pointer",
          fontSize: mobile ? 13 : 11,
          fontWeight: 700,
          letterSpacing: ".08em",
          fontFamily: "'Jost',sans-serif",
          transition: "all .25s",
          whiteSpace: "nowrap",
        }}
      >
        <Globe
          size={mobile ? 14 : 12}
          strokeWidth={2}
          style={{ opacity: 0.8 }}
        />
        <span>{lang.toUpperCase()}</span>
        <ChevronDown
          size={10}
          strokeWidth={2.5}
          style={{
            transform: open ? "rotate(180deg)" : "none",
            transition: "transform .22s",
            opacity: 0.65,
          }}
        />
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: mobile ? "auto" : "calc(100% + 8px)",
            bottom: mobile ? "calc(100% + 8px)" : "auto",
            right: 0,
            background: "linear-gradient(160deg,#162d45,#0d1b2a)",
            border: "1px solid rgba(201,169,110,.18)",
            borderRadius: 12,
            padding: 6,
            minWidth: 148,
            boxShadow: "0 16px 40px rgba(0,0,0,.55)",
            zIndex: 100,
            animation: "loqDropIn .22s cubic-bezier(.22,1,.36,1)",
          }}
        >
          {(["en", "ar"] as const).map((l) => (
            <button
              key={l}
              onClick={() => {
                setLang(l);
                setOpen(false);
              }}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "9px 10px",
                background:
                  lang === l ? "rgba(201,169,110,.12)" : "transparent",
                border: "none",
                borderRadius: 8,
                cursor: "pointer",
                color: lang === l ? GOLD : "rgba(229,224,198,.55)",
                fontSize: 12,
                fontWeight: lang === l ? 700 : 500,
                fontFamily: "'Jost',sans-serif",
                textAlign: "left",
                transition: "all .2s",
              }}
            >
              <span style={{ fontSize: 16 }}>{l === "en" ? "🇬🇧" : "🇪🇬"}</span>
              <span>{l === "en" ? "English" : "العربية"}</span>
              {lang === l && (
                <span
                  style={{ marginLeft: "auto", fontSize: 10, opacity: 0.65 }}
                >
                  ✓
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// ══════════════════════════════════════════════════════════════
// NAVBAR
// ══════════════════════════════════════════════════════════════
const Navbar = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, role, logout } = useAuth();
  const mobileItems =
    role === "admin" || role === "superAdmin"
      ? ADMIN_MOBILE_ITEMS
      : USER_MOBILE_ITEMS;

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", fn);
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
        .btn-ghost { font-family:'Jost',sans-serif; font-size:11px; font-weight:800; letter-spacing:.18em; text-transform:uppercase; padding:9px 20px; border-radius:999px; border:1px solid rgba(201,169,110,.45); color:${GOLD}; background:transparent; text-decoration:none; transition:all .3s; display:inline-flex; align-items:center; white-space:nowrap; }
        .btn-ghost:hover { background:rgba(201,169,110,.08); border-color:${GOLD}; box-shadow:0 0 18px rgba(201,169,110,.18); }
         .btn-nav-signin {
          font-family: 'Jost', sans-serif;
          font-size: 11px;
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

      {/* ── TOP BAR ──────────────────────────────────────────── */}
      <nav
        className="fixed top-0 left-0 right-0 z-50"
        style={{
          background: scrolled
            ? "linear-gradient(90deg,#0a0a1a,#0d1b2a 50%,#0a0a1a)"
            : "transparent",
          backdropFilter: scrolled ? "blur(12px)" : "none",
          boxShadow: scrolled ? "0 4px 24px rgba(0,0,0,.4)" : "none",
          borderBottom: scrolled ? "1px solid rgba(229,224,198,.07)" : "none",
          padding: scrolled ? "4px 0" : "8px 0",
          transition: "all .5s",
        }}
      >
        <div className="max-w-7xl mx-auto px-6 lg:px-12 flex items-center justify-between">
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
            {NAV_LINKS.map((l) => (
              <Link
                key={l.label}
                to={l.to}
                className={`loq-link ${location.pathname === l.to ? "active" : ""}`}
              >
                {l.label}
              </Link>
            ))}
            <div className="flex items-center gap-3 ml-2">
              {user ? (
                <ProfileDropdown user={user} role={role} onLogout={logout} />
              ) : (
                <>
                  <Link to="/register" className="btn-ghost">
                    Register
                  </Link>
                  <Link to="/login" className="btn-nav-signin">
                    Sign In
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

      {/* ── MOBILE BACKDROP ──────────────────────────────────── */}
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

      {/* ── MOBILE PANEL ─────────────────────────────────────── */}
      <div
        className="lg:hidden"
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
          width: "min(320px,85vw)",
          zIndex: 60,
          background: "linear-gradient(160deg,#0e1c2e,#0a0a1a 55%,#060611)",
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
            Menu
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
          {NAV_LINKS.map((link, i) => {
            const active = location.pathname === link.to;
            return (
              <Link
                key={link.label}
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
                <span style={{ flex: 1 }}>{link.label}</span>
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

        {/* Mobile auth */}
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
              {/* User info card */}
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

              {mobileItems.map(({ label, to, Icon }) => (
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
                  {label}
                </Link>
              ))}

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
                Sign Out
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
                ✦ Register
              </Link>
              <Link
                to="/login"
                onClick={() => setMenuOpen(false)}
                className="btn-nav-signin"
                style={{
                  justifyContent: "center",
                  borderRadius: 13,
                  padding: 13,
                }}
              >
                Sign In
              </Link>
            </>
          )}
        </div>

        {/* Language */}
        <div
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
            Language
          </p>
          <LangSwitcher mobile />
        </div>

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
            © {new Date().getFullYear()} Loqta Zone · Premium Auctions
          </p>
        </div>
      </div>
    </>
  );
};

export default Navbar;
