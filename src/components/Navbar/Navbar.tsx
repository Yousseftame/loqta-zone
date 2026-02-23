import { useState, useEffect } from "react";
import { X, Globe, ChevronDown, Menu } from "lucide-react";
import { Link, useLocation } from "react-router-dom";

// ── Design tokens ─────────────────────────────────────────────
const GOLD = "#c9a96e";
const GOLD2 = "#b8944e";
const CREAM = "rgb(229, 224, 198)";

const navLinks = [
  {
    label: "Auctions", to: "/", icon:
      "◇"
  },
  { label: "How it works", to: "/how-it-works", icon: "◈" },
  { label: "About Us", to: "/about", icon: "✦" },
  { label: "Contact Us", to: "/contact", icon: "◇" },
];

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [lang, setLang] = useState<"en" | "ar">("en");
  const [langOpen, setLangOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest(".lang-switcher")) setLangOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (isMenuOpen) {
      const scrollY = window.scrollY;
      document.body.style.position = "fixed";
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = "100%";
      document.body.style.overflow = "hidden";
    } else {
      const scrollY = document.body.style.top;
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.width = "";
      document.body.style.overflow = "";
      window.scrollTo(0, parseInt(scrollY || "0") * -1);
    }
    return () => {
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.width = "";
      document.body.style.overflow = "";
    };
  }, [isMenuOpen]);

  useEffect(() => {
    setIsMenuOpen(false);
  }, [location.pathname]);

  const LangSwitcher = ({ mobile = false }: { mobile?: boolean }) => (
    <div className="lang-switcher" style={{ position: "relative" }}>
      <button
        onClick={() => setLangOpen((v) => !v)}
        aria-label="Switch language"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 5,
          background: langOpen
            ? "rgba(201,169,110,0.08)"
            : "rgba(255,255,255,0.04)",
          border: `1px solid ${langOpen ? "rgba(201,169,110,0.35)" : "rgba(229,224,198,0.12)"}`,
          borderRadius: 999,
          padding: mobile ? "8px 14px" : "6px 12px",
          color: "rgba(229,224,198,0.7)",
          cursor: "pointer",
          fontSize: mobile ? 13 : 11,
          fontWeight: 700,
          letterSpacing: "0.08em",
          fontFamily: "'Jost', sans-serif",
          transition: "all 0.25s ease",
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
            transform: langOpen ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.22s ease",
            opacity: 0.65,
          }}
        />
      </button>

      {langOpen && (
        <div
          style={{
            position: "absolute",
            top: mobile ? "auto" : "calc(100% + 8px)",
            bottom: mobile ? "calc(100% + 8px)" : "auto",
            right: 0,
            background: "linear-gradient(160deg, #162d45, #0d1b2a)",
            border: "1px solid rgba(201,169,110,0.18)",
            borderRadius: 12,
            padding: 6,
            minWidth: 148,
            boxShadow: "0 16px 40px rgba(0,0,0,0.55)",
            backdropFilter: "blur(14px)",
            zIndex: 100,
            animation: "loqDropIn 0.22s cubic-bezier(0.22,1,0.36,1)",
          }}
        >
          {(["en", "ar"] as const).map((l) => (
            <button
              key={l}
              onClick={() => {
                setLang(l);
                setLangOpen(false);
              }}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "9px 10px",
                background:
                  lang === l ? "rgba(201,169,110,0.12)" : "transparent",
                border: "none",
                borderRadius: 8,
                cursor: "pointer",
                color: lang === l ? GOLD : "rgba(229,224,198,0.55)",
                fontSize: 12,
                fontWeight: lang === l ? 700 : 500,
                fontFamily: "'Jost', sans-serif",
                letterSpacing: "0.04em",
                textAlign: "left",
                transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) => {
                if (lang !== l)
                  (e.currentTarget as HTMLButtonElement).style.background =
                    "rgba(255,255,255,0.04)";
              }}
              onMouseLeave={(e) => {
                if (lang !== l)
                  (e.currentTarget as HTMLButtonElement).style.background =
                    "transparent";
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

  return (
    <>
      <style>{`
        @keyframes loqDropIn {
          from { opacity: 0; transform: translateY(-8px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }

        .loq-nav-link {
          position: relative;
          font-family: 'Jost', sans-serif;
          font-size: 19px;
          font-weight: 700;
          letter-spacing: 0.04em;
          color: rgba(229,224,198,0.85);
          text-decoration: none;
          padding: 6px 0;
          transition: color 0.25s ease;
        }
        .loq-nav-link::after {
          content: '';
          position: absolute;
          bottom: 0;
          left: 0;
          width: 0;
          height: 1.5px;
          background: linear-gradient(90deg, ${GOLD}, transparent);
          border-radius: 999px;
          transition: width 0.35s cubic-bezier(0.22,1,0.36,1);
        }
        .loq-nav-link:hover { color: ${CREAM}; }
        .loq-nav-link:hover::after,
        .loq-nav-link.active::after { width: 100%; }
        .loq-nav-link.active { color: ${GOLD}; }

        .btn-nav-register {
          font-family: 'Jost', sans-serif;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          padding: 9px 20px;
          border-radius: 999px;
          border: 1px solid rgba(201,169,110,0.45);
          color: ${GOLD};
          background: transparent;
          text-decoration: none;
          transition: all 0.3s ease;
          white-space: nowrap;
          display: inline-flex;
          align-items: center;
        }
        .btn-nav-register:hover {
          background: rgba(201,169,110,0.08);
          border-color: ${GOLD};
          box-shadow: 0 0 18px rgba(201,169,110,0.18);
        }
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

      {/* ════════ TOP NAVBAR ════════ */}
      <nav
        className="fixed top-0 left-0 right-0 z-50"
        style={{
          background: isScrolled
            ? "linear-gradient(90deg, #0a0a1a 0%, #0d1b2a 50%, #0a0a1a 100%)"
            : "transparent",
          backdropFilter: isScrolled ? "blur(12px)" : "blur(0px)",
          WebkitBackdropFilter: isScrolled ? "blur(12px)" : "blur(0px)",
          boxShadow: isScrolled ? "0 4px 24px rgba(0,0,0,0.4)" : "none",
          borderBottom: isScrolled
            ? "1px solid rgba(229,224,198,0.07)"
            : "none",
          padding: isScrolled ? "4px 0" : "8px 0",
          transition: "all 0.5s ease",
        }}
      >
        <div className="max-w-7xl mx-auto px-6 lg:px-12">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <Link
              to="/"
              className="flex-shrink-0 transition-transform hover:scale-105 duration-300"
              style={{ marginTop: "-18px", marginBottom: "-18px" }}
            >
              <img
                src="/loqta-removebg-preview.png"
                alt="Loqta Zone"
                className="h-32 lg:h-36 w-auto opacity-95 drop-shadow-lg"
              />
            </Link>

            {/* Desktop nav */}
            <div className="hidden lg:flex items-center gap-8 ml-auto">
              {navLinks.map((link) => (
                <Link
                  key={link.label}
                  to={link.to}
                  className={`loq-nav-link ${location.pathname === link.to ? "active" : ""}`}
                >
                  {link.label}
                </Link>
              ))}
              <div className="flex items-center gap-3 ml-2">
                <Link to="/register" className="btn-nav-register">
                  Register
                </Link>
                <Link to="/signin" className="btn-nav-signin">
                  Sign In
                </Link>
                <LangSwitcher />
              </div>
            </div>

            {/* Mobile: lang + Menu icon */}
            <div className="lg:hidden flex items-center gap-2">
              <LangSwitcher mobile />
              <button
                onClick={() => setIsMenuOpen((v) => !v)}
                aria-label={isMenuOpen ? "Close menu" : "Open menu"}
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 12,
                  background: isMenuOpen
                    ? "rgba(201,169,110,0.1)"
                    : "rgba(255,255,255,0.04)",
                  border: `1px solid ${isMenuOpen ? "rgba(201,169,110,0.3)" : "rgba(229,224,198,0.1)"}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  transition: "all 0.3s ease",
                  color: isMenuOpen ? GOLD : "rgba(229,224,198,0.8)",
                  position: "relative",
                  zIndex: 70,
                }}
              >
                {isMenuOpen ? (
                  <X size={20} strokeWidth={2} />
                ) : (
                  <Menu size={20} strokeWidth={2} />
                )}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* ════════ MOBILE MENU ════════ */}

      {/* Backdrop */}
      <div
        className="lg:hidden"
        onClick={() => setIsMenuOpen(false)}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 55,
          background: "rgba(5,8,18,0.7)",
          backdropFilter: "blur(4px)",
          WebkitBackdropFilter: "blur(4px)",
          opacity: isMenuOpen ? 1 : 0,
          pointerEvents: isMenuOpen ? "auto" : "none",
          transition: "opacity 0.38s ease",
        }}
      />

      {/* Slide-in panel */}
      <div
        className="lg:hidden"
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
          width: "min(320px, 85vw)",
          zIndex: 60,
          background:
            "linear-gradient(160deg, #0e1c2e 0%, #0a0a1a 55%, #060611 100%)",
          borderLeft: "1px solid rgba(201,169,110,0.1)",
          boxShadow: "-24px 0 64px rgba(0,0,0,0.65)",
          transform: isMenuOpen ? "translateX(0)" : "translateX(110%)",
          transition: "transform 0.48s cubic-bezier(0.22,1,0.36,1)",
          display: "flex",
          flexDirection: "column",
          overflowY: "auto",
          overflowX: "hidden",
        }}
      >
        {/* Gold top line */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 1,
            background: `linear-gradient(90deg, transparent, ${GOLD}66, transparent)`,
          }}
        />

        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "18px 18px 14px",
            borderBottom: "1px solid rgba(229,224,198,0.055)",
            flexShrink: 0,
          }}
        >
          <Link to="/" onClick={() => setIsMenuOpen(false)}>
            <img
              src="/loqta-removebg-preview.png"
              alt="Loqta Zone"
              style={{ height: 130, width: "auto", objectFit: "fill" }}
            />
          </Link>
          <button
            onClick={() => setIsMenuOpen(false)}
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(229,224,198,0.08)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              color: "rgba(229,224,198,0.55)",
              transition: "all 0.25s ease",
              flexShrink: 0,
            }}
            onMouseEnter={(e) => {
              const b = e.currentTarget as HTMLButtonElement;
              b.style.background = "rgba(201,169,110,0.08)";
              b.style.borderColor = "rgba(201,169,110,0.22)";
              b.style.color = GOLD;
            }}
            onMouseLeave={(e) => {
              const b = e.currentTarget as HTMLButtonElement;
              b.style.background = "rgba(255,255,255,0.04)";
              b.style.borderColor = "rgba(229,224,198,0.08)";
              b.style.color = "rgba(229,224,198,0.55)";
            }}
          >
            <X size={15} strokeWidth={2} />
          </button>
        </div>

        {/* Section label */}
        <div style={{ padding: "18px 20px 6px", flexShrink: 0 }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              opacity: isMenuOpen ? 1 : 0,
              transform: isMenuOpen ? "translateY(0)" : "translateY(6px)",
              transition: "opacity 0.4s ease 0.08s, transform 0.4s ease 0.08s",
            }}
          >
            <div
              style={{
                width: 18,
                height: 1,
                background: `linear-gradient(90deg, ${GOLD}88, transparent)`,
              }}
            />
            <span
              style={{
                fontSize: 9,
                fontWeight: 800,
                color: `${GOLD}77`,
                letterSpacing: "0.28em",
                textTransform: "uppercase",
                fontFamily: "'Jost', sans-serif",
              }}
            >
              Menu
            </span>
          </div>
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
          {navLinks.map((link, i) => {
            const isActive = location.pathname === link.to;
            return (
              <Link
                key={link.label}
                to={link.to}
                onClick={() => setIsMenuOpen(false)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  padding: "14px 16px",
                  borderRadius: 14,
                  background: isActive
                    ? "rgba(201,169,110,0.08)"
                    : "transparent",
                  border: `1px solid ${isActive ? "rgba(201,169,110,0.2)" : "transparent"}`,
                  textDecoration: "none",
                  color: isActive ? GOLD : "rgba(229,224,198,0.72)",
                  fontSize: 14,
                  fontWeight: 600,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  fontFamily: "'Jost', sans-serif",
                  transition: "all 0.28s ease",
                  opacity: isMenuOpen ? 1 : 0,
                  transform: isMenuOpen ? "translateX(0)" : "translateX(20px)",
                  transitionDelay: isMenuOpen ? `${0.1 + i * 0.055}s` : "0s",
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    const el = e.currentTarget as HTMLAnchorElement;
                    el.style.background = "rgba(255,255,255,0.04)";
                    el.style.borderColor = "rgba(229,224,198,0.07)";
                    el.style.color = CREAM;
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    const el = e.currentTarget as HTMLAnchorElement;
                    el.style.background = "transparent";
                    el.style.borderColor = "transparent";
                    el.style.color = "rgba(229,224,198,0.72)";
                  }
                }}
              >
                <span
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 10,
                    background: isActive
                      ? "rgba(201,169,110,0.12)"
                      : "rgba(255,255,255,0.04)",
                    border: `1px solid ${isActive ? "rgba(201,169,110,0.22)" : "rgba(229,224,198,0.07)"}`,
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
                {isActive && (
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background: GOLD,
                      boxShadow: `0 0 8px ${GOLD}`,
                      flexShrink: 0,
                    }}
                  />
                )}
              </Link>
            );
          })}
        </div>

        {/* Divider */}
        <div
          style={{
            margin: "14px 20px",
            height: 1,
            background:
              "linear-gradient(90deg, transparent, rgba(229,224,198,0.08), transparent)",
            opacity: isMenuOpen ? 1 : 0,
            transition: "opacity 0.4s ease 0.3s",
            flexShrink: 0,
          }}
        />

        {/* Auth buttons */}
        <div
          style={{
            padding: "0 12px",
            display: "flex",
            flexDirection: "column",
            gap: 10,
            opacity: isMenuOpen ? 1 : 0,
            transform: isMenuOpen ? "translateY(0)" : "translateY(12px)",
            transition: "opacity 0.4s ease 0.32s, transform 0.4s ease 0.32s",
            flexShrink: 0,
          }}
        >
          <Link
            to="/register"
            onClick={() => setIsMenuOpen(false)}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              padding: "13px",
              borderRadius: 13,
              border: "1px solid rgba(201,169,110,0.32)",
              background: "transparent",
              color: GOLD,
              textDecoration: "none",
              fontSize: 12,
              fontWeight: 800,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              fontFamily: "'Jost', sans-serif",
              transition: "background 0.28s ease",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.background =
                "rgba(201,169,110,0.07)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.background =
                "transparent";
            }}
          >
            ✦ Register
          </Link>
          <Link
            to="/signin"
            onClick={() => setIsMenuOpen(false)}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "13px",
              borderRadius: 13,
              background: `linear-gradient(135deg, ${GOLD}, ${GOLD2})`,
              border: "none",
              color: "#0a0a1a",
              textDecoration: "none",
              fontSize: 12,
              fontWeight: 800,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              fontFamily: "'Jost', sans-serif",
              boxShadow: `0 6px 22px rgba(201,169,110,0.32)`,
              transition: "opacity 0.28s ease",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.opacity = "0.88";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.opacity = "1";
            }}
          >
            Sign In
          </Link>
        </div>

        {/* Language */}
        <div
          style={{
            padding: "18px 20px 10px",
            opacity: isMenuOpen ? 1 : 0,
            transition: "opacity 0.4s ease 0.38s",
            flexShrink: 0,
          }}
        >
          <div
            style={{
              fontSize: 9,
              fontWeight: 800,
              color: "rgba(229,224,198,0.22)",
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              fontFamily: "'Jost', sans-serif",
              marginBottom: 10,
            }}
          >
            Language
          </div>
          <LangSwitcher mobile />
        </div>

        {/* Footer */}
        <div
          style={{
            marginTop: "auto",
            padding: "14px 20px 32px",
            borderTop: "1px solid rgba(229,224,198,0.05)",
            opacity: isMenuOpen ? 1 : 0,
            transition: "opacity 0.4s ease 0.42s",
            flexShrink: 0,
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: 10,
              color: "rgba(229,224,198,0.15)",
              letterSpacing: "0.06em",
              fontFamily: "'Jost', sans-serif",
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
