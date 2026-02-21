import { useState, useEffect } from "react";
import { Menu, X, Globe } from "lucide-react";
import { Link } from "react-router-dom";

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [lang, setLang] = useState<"en" | "ar">("en");
  const [langOpen, setLangOpen] = useState(false);

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

  const navLinks = [
    { label: "Auctions", to: "/menu" },
    { label: "How it works", to: "/gallery" },
    { label: "About Us", to: "/about" },
    { label: "Contact Us", to: "/contact" },
  ];

  const LangSwitcher = ({ mobile = false }: { mobile?: boolean }) => (
    <div className={`lang-switcher relative ${mobile ? "" : ""}`}>
      <button
        onClick={() => setLangOpen((v) => !v)}
        className={mobile ? "lang-bubble-mobile" : "lang-bubble"}
        aria-label="Switch language"
      >
        <Globe
          size={mobile ? 14 : 12}
          strokeWidth={2.2}
          className="opacity-80"
        />
        <span>{lang.toUpperCase()}</span>
        <span
          className="transition-transform duration-200 inline-block"
          style={{
            transform: langOpen ? "rotate(180deg)" : "rotate(0deg)",
            fontSize: "0.6rem",
            opacity: 0.7,
          }}
        >
          ▾
        </span>
      </button>

      {langOpen && (
        <div
          className={
            mobile ? "lang-dropdown lang-dropdown-up" : "lang-dropdown"
          }
        >
          {(["en", "ar"] as const).map((l) => (
            <button
              key={l}
              onClick={() => {
                setLang(l);
                setLangOpen(false);
              }}
              className={`lang-option ${lang === l ? "lang-option-active" : ""}`}
            >
              <span>{l === "en" ? "🇬🇧" : "🇪🇬"}</span>
              <span>{l === "en" ? "English" : "العربية"}</span>
              {lang === l && (
                <span className="ml-auto text-xs opacity-70">✓</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <>
      <nav
        className="fixed top-0 left-0 right-0 z-50"
        style={{
          background: isScrolled
            ? "linear-gradient(90deg, #0a0a1a 0%, #0d1b2a 50%, #0a0a1a 100%)"
            : "transparent",
          backdropFilter: isScrolled ? "blur(12px)" : "blur(0px)",
          WebkitBackdropFilter: isScrolled ? "blur(12px)" : "blur(0px)",
          boxShadow: isScrolled ? "0 4px 24px rgba(0,0,0,0.4)" : "none",
          padding: isScrolled ? "4px 0" : "8px 0",
          transition:
            "background 0.5s ease, backdrop-filter 0.5s ease, box-shadow 0.5s ease, padding 0.5s ease",
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

            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center gap-7 ml-auto">
              {navLinks.map((link) => (
                <Link
                  key={link.label}
                  to={link.to}
                  className="nav-link text-secondary/90 hover:text-secondary text-sm tracking-wide transition-colors duration-300"
                >
                  {link.label}
                </Link>
              ))}

              {/* Auth Buttons */}
              <div className="flex items-center gap-3 ml-1">
                <Link to="/register" className="btn-nav-register">
                  Register
                </Link>
                <Link to="/signin" className="btn-nav-signin">
                  Sign In
                </Link>
                <LangSwitcher />
              </div>
            </div>

            {/* Mobile: lang bubble + hamburger */}
            <div className="lg:hidden flex items-center gap-2">
              <LangSwitcher mobile />
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="text-secondary p-2 hover:opacity-80 transition-opacity z-[70]"
                aria-label="Toggle menu"
              >
                {isMenuOpen ? <X size={28} /> : <Menu size={28} />}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      <div
        className={`lg:hidden fixed inset-0 z-[60] flex items-center justify-center transition-all duration-300 ${
          isMenuOpen
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        }`}
      >
        <div
          className="absolute inset-0 backdrop-blur-sm"
          style={{
            background:
              "linear-gradient(90deg, #0a0a1aF7 0%, #0d1b2aF7 50%, #0a0a1aF7 100%)",
          }}
          onClick={() => setIsMenuOpen(false)}
        />

        <div className="relative z-[61] flex flex-col items-center justify-center space-y-6 px-6 w-full">
          <Link to="/" onClick={() => setIsMenuOpen(false)} className="mb-2">
            <img
              src="/loqta-removebg-preview.png"
              alt="Loqta Zone"
              className="h-28 sm:h-32"
            />
          </Link>

          {navLinks.map((link, index) => (
            <Link
              key={link.label}
              to={link.to}
              onClick={() => setIsMenuOpen(false)}
              className="nav-link text-2xl text-secondary hover:text-secondary/80 transition-colors duration-300"
              style={{
                animation: isMenuOpen
                  ? `fadeInUp 0.4s ease-out ${index * 0.1}s forwards`
                  : "none",
                opacity: 1,
              }}
            >
              {link.label}
            </Link>
          ))}

          <div
            className="flex flex-col gap-3 pt-2 w-full max-w-xs"
            style={{
              animation: isMenuOpen
                ? `fadeInUp 0.4s ease-out ${navLinks.length * 0.1 + 0.1}s forwards`
                : "none",
              opacity: 1,
            }}
          >
            <Link
              to="/register"
              onClick={() => setIsMenuOpen(false)}
              className="btn-nav-register-mobile"
            >
              Register
            </Link>
            <Link
              to="/signin"
              onClick={() => setIsMenuOpen(false)}
              className="btn-nav-signin-mobile"
            >
              Sign In
            </Link>
          </div>
        </div>
      </div>
    </>
  );
};

export default Navbar;
