import React, { useRef, useState, useEffect } from "react";

// ── Design tokens ─────────────────────────────────────────────
const GOLD = "#c9a96e";
const GOLD2 = "#b8944e";
const NAVY = "#2A4863";
const NAVY2 = "#1e3652";
const CREAM = "rgb(229, 224, 198)";

// ── Social links ──────────────────────────────────────────────
const socials = [
  {
    name: "Instagram",
    href: "#",
    icon: (
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  {
    name: "Facebook",
    href: "#",
    icon: (
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
      </svg>
    ),
  },
  {
    name: "WhatsApp",
    href: "#",
    icon: (
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
      </svg>
    ),
  },
  {
    name: "TikTok",
    href: "#",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
        <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.28 6.28 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.77a4.85 4.85 0 0 1-1.01-.08z" />
      </svg>
    ),
  },
];

const quickLinks = [
  { label: "Upcoming Auctions", href: "#" },
  { label: "Past Results", href: "#" },
  { label: "How It Works", href: "#" },
  { label: "Register to Bid", href: "#" },
  { label: "Promo Codes", href: "#" },
];

const legalLinks = [
  { label: "Terms & Conditions", href: "#" },
  { label: "Privacy Policy", href: "#" },
  { label: "Refund Policy", href: "#" },
  { label: "Cookie Policy", href: "#" },
];

// ── Social icon button ────────────────────────────────────────
function SocialBtn({ item }: { item: (typeof socials)[0] }) {
  const [hovered, setHovered] = useState(false);
  return (
    <a
      href={item.href}
      aria-label={item.name}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: 42,
        height: 42,
        borderRadius: "50%",
        background: hovered
          ? `linear-gradient(135deg, ${NAVY}, ${NAVY2})`
          : "rgba(255,255,255,0.04)",
        border: `1px solid ${hovered ? `${GOLD}66` : "rgba(229,224,198,0.1)"}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: hovered ? GOLD : "rgba(229,224,198,0.45)",
        textDecoration: "none",
        boxShadow: hovered ? `0 0 18px ${GOLD}33` : "none",
        transform: hovered ? "translateY(-3px)" : "translateY(0)",
        transition: "all 0.35s cubic-bezier(0.22,1,0.36,1)",
        cursor: "pointer",
      }}
    >
      {item.icon}
    </a>
  );
}

// ── Animated link ─────────────────────────────────────────────
function FooterLink({ label, href }: { label: string; href: string }) {
  const [hovered, setHovered] = useState(false);
  return (
    <a
      href={href}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        color: hovered ? CREAM : "rgba(229,224,198,0.45)",
        textDecoration: "none",
        fontSize: 13,
        fontWeight: 400,
        letterSpacing: "0.01em",
        transition: "color 0.25s ease",
        lineHeight: 1.6,
      }}
    >
      <span
        style={{
          display: "inline-block",
          width: hovered ? 14 : 6,
          height: 1,
          background: hovered ? GOLD : "rgba(201,169,110,0.4)",
          borderRadius: 999,
          transition:
            "width 0.3s cubic-bezier(0.22,1,0.36,1), background 0.3s ease",
          flexShrink: 0,
        }}
      />
      {label}
    </a>
  );
}

// ── Newsletter input ──────────────────────────────────────────
function Newsletter() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [focused, setFocused] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) {
      setSubmitted(true);
    }
  };

  if (submitted) {
    return (
      <div
        style={{
          padding: "14px 20px",
          background: "rgba(126,207,154,0.1)",
          border: "1px solid rgba(126,207,154,0.25)",
          borderRadius: 12,
          color: "#7ecf9a",
          fontSize: 13,
          fontWeight: 600,
          letterSpacing: "0.04em",
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        ✦ You're on the list — we'll be in touch!
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{ display: "flex", flexDirection: "column", gap: 10 }}
    >
      <div
        style={{
          display: "flex",
          gap: 0,
          border: `1px solid ${focused ? `${GOLD}55` : "rgba(229,224,198,0.1)"}`,
          borderRadius: 12,
          overflow: "hidden",
          transition: "border-color 0.3s ease",
          boxShadow: focused ? `0 0 0 3px ${GOLD}18` : "none",
        }}
      >
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder="your@email.com"
          required
          style={{
            flex: 1,
            background: "rgba(255,255,255,0.04)",
            border: "none",
            outline: "none",
            padding: "12px 16px",
            color: CREAM,
            fontSize: 13,
            fontFamily: "'Jost', sans-serif",
            letterSpacing: "0.02em",
          }}
        />
        <button
          type="submit"
          style={{
            background: `linear-gradient(135deg, ${GOLD}, ${GOLD2})`,
            border: "none",
            color: "#0a0a1a",
            padding: "12px 18px",
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            cursor: "pointer",
            whiteSpace: "nowrap",
            transition: "opacity 0.2s ease",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.opacity = "0.85";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.opacity = "1";
          }}
        >
          Join
        </button>
      </div>
      <p
        style={{
          margin: 0,
          fontSize: 10,
          color: "rgba(229,224,198,0.25)",
          letterSpacing: "0.05em",
        }}
      >
        No spam. Auction alerts only. Unsubscribe anytime.
      </p>
    </form>
  );
}

// ── Main Footer ───────────────────────────────────────────────
export default function Footer() {
  const footerRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = footerRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { threshold: 0.05 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const year = new Date().getFullYear();

  return (
    <footer
      ref={footerRef}
      style={{
        background: "linear-gradient(180deg, #0a0a1a 0%, #060610 100%)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <style>{`
        @media (max-width: 768px) {
          .footer-grid { grid-template-columns: 1fr !important; gap: 40px !important; }
          .footer-bottom-row { flex-direction: column !important; gap: 16px !important; text-align: center !important; }
          .footer-legal-links { justify-content: center !important; flex-wrap: wrap !important; }
          .footer-logo-stamp { font-size: clamp(56px, 18vw, 96px) !important; }
        }
        @media (max-width: 480px) {
          .footer-cols { grid-template-columns: 1fr !important; }
        }
        @media (min-width: 481px) and (max-width: 768px) {
          .footer-cols { grid-template-columns: 1fr 1fr !important; }
        }
      `}</style>

      {/* ── Top gold border ── */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 1,
          background: `linear-gradient(90deg, transparent, ${GOLD}, rgba(229,224,198,0.7), ${GOLD}, transparent)`,
          opacity: 0.35,
        }}
      />

      {/* ── Decorative background elements ── */}
      <div
        style={{
          position: "absolute",
          bottom: -60,
          right: -60,
          width: 400,
          height: 400,
          borderRadius: "50%",
          background: `radial-gradient(circle, rgba(42,72,99,0.12) 0%, transparent 70%)`,
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: 0,
          left: "50%",
          transform: "translateX(-50%)",
          width: 600,
          height: 300,
          background: `radial-gradient(ellipse, rgba(201,169,110,0.04) 0%, transparent 70%)`,
          pointerEvents: "none",
        }}
      />

      {/* ── Giant watermark logo ── */}
      <div
        className="footer-logo-stamp"
        style={{
          position: "absolute",
          bottom: 40,
          left: "50%",
          transform: "translateX(-50%)",
          fontFamily: "'Cormorant Garamond', Georgia, serif",
          fontSize: "clamp(72px, 14vw, 160px)",
          fontWeight: 700,
          fontStyle: "italic",
          color: "transparent",
          WebkitTextStroke: "1px rgba(229,224,198,0.04)",
          whiteSpace: "nowrap",
          userSelect: "none",
          pointerEvents: "none",
          letterSpacing: "-0.03em",
          zIndex: 0,
        }}
      >
        LOQTA ZONE
      </div>

      {/* ── Main content ── */}
      <div
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: "72px 32px 0",
          position: "relative",
          zIndex: 1,
        }}
      >
        {/* ── Top section: brand + columns ── */}
        <div
          className="footer-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "1.4fr 2fr",
            gap: 64,
            marginBottom: 56,
            opacity: visible ? 1 : 0,
            transform: visible ? "translateY(0)" : "translateY(30px)",
            transition:
              "opacity 0.8s ease, transform 0.8s cubic-bezier(0.22,1,0.36,1)",
          }}
        >
          {/* ── Brand column ── */}
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            {/* Logo */}
            <div>
              <div
                style={{
                  fontFamily: "'Cormorant Garamond', Georgia, serif",
                  fontSize: 36,
                  fontWeight: 700,
                  fontStyle: "italic",
                  letterSpacing: "-0.02em",
                  lineHeight: 1,
                  marginBottom: 4,
                }}
              >
                <span style={{ color: CREAM }}>Loqta</span>
                <span style={{ color: GOLD }}> Zone</span>
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  marginTop: 6,
                }}
              >
                <div
                  style={{
                    width: 28,
                    height: 1,
                    background: `linear-gradient(90deg, ${GOLD}, transparent)`,
                  }}
                />
                <span
                  style={{
                    fontSize: 9,
                    fontWeight: 800,
                    color: `${GOLD}99`,
                    letterSpacing: "0.28em",
                    textTransform: "uppercase",
                  }}
                >
                  Premium Auctions · Egypt
                </span>
              </div>
            </div>

            {/* Tagline */}
            <p
              style={{
                margin: 0,
                fontSize: 13.5,
                color: "rgba(229,224,198,0.45)",
                lineHeight: 1.8,
                fontWeight: 400,
                maxWidth: 280,
              }}
            >
              Egypt's most exclusive online auction platform — where every bid
              is a chance to win premium products at unbeatable prices.
            </p>

            {/* Socials */}
            <div>
              <div
                style={{
                  fontSize: 9,
                  fontWeight: 800,
                  color: "rgba(229,224,198,0.3)",
                  letterSpacing: "0.22em",
                  textTransform: "uppercase",
                  marginBottom: 12,
                }}
              >
                Follow Us
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                {socials.map((s) => (
                  <SocialBtn key={s.name} item={s} />
                ))}
              </div>
            </div>

            {/* Trust badges */}
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              {[
                "🔒 Secure Payments",
                "🚚 Fast Delivery",
                "🏆 Verified Winners",
              ].map((badge) => (
                <div
                  key={badge}
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: "rgba(229,224,198,0.35)",
                    letterSpacing: "0.05em",
                    padding: "5px 10px",
                    border: "1px solid rgba(229,224,198,0.08)",
                    borderRadius: 6,
                    background: "rgba(255,255,255,0.02)",
                  }}
                >
                  {badge}
                </div>
              ))}
            </div>
          </div>

          {/* ── Right: 3 link columns + newsletter ── */}
          <div style={{ display: "flex", flexDirection: "column", gap: 40 }}>
            <div
              className="footer-cols"
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr",
                gap: 24,
              }}
            >
              {/* Quick links */}
              <div>
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 800,
                    color: GOLD,
                    letterSpacing: "0.24em",
                    textTransform: "uppercase",
                    marginBottom: 18,
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <div
                    style={{
                      width: 16,
                      height: 1,
                      background: `linear-gradient(90deg, ${GOLD}, transparent)`,
                    }}
                  />
                  Explore
                </div>
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 10 }}
                >
                  {quickLinks.map((l) => (
                    <FooterLink key={l.label} {...l} />
                  ))}
                </div>
              </div>

              {/* Legal */}
              <div>
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 800,
                    color: GOLD,
                    letterSpacing: "0.24em",
                    textTransform: "uppercase",
                    marginBottom: 18,
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <div
                    style={{
                      width: 16,
                      height: 1,
                      background: `linear-gradient(90deg, ${GOLD}, transparent)`,
                    }}
                  />
                  Legal
                </div>
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 10 }}
                >
                  {legalLinks.map((l) => (
                    <FooterLink key={l.label} {...l} />
                  ))}
                </div>
              </div>

              {/* Contact */}
              <div>
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 800,
                    color: GOLD,
                    letterSpacing: "0.24em",
                    textTransform: "uppercase",
                    marginBottom: 18,
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <div
                    style={{
                      width: 16,
                      height: 1,
                      background: `linear-gradient(90deg, ${GOLD}, transparent)`,
                    }}
                  />
                  Contact
                </div>
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 12 }}
                >
                  {[
                    { icon: "✉", label: "hello@loqtazone.com" },
                    { icon: "📞", label: "+20 100 000 0000" },
                    { icon: "📍", label: "Cairo, Egypt" },
                  ].map(({ icon, label }) => (
                    <div
                      key={label}
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 8,
                      }}
                    >
                      <span
                        style={{ fontSize: 13, marginTop: 1, opacity: 0.6 }}
                      >
                        {icon}
                      </span>
                      <span
                        style={{
                          fontSize: 12,
                          color: "rgba(229,224,198,0.45)",
                          lineHeight: 1.6,
                        }}
                      >
                        {label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Newsletter */}
            <div
              style={{
                padding: "24px",
                background: "rgba(255,255,255,0.025)",
                border: "1px solid rgba(229,224,198,0.07)",
                borderRadius: 16,
                position: "relative",
                overflow: "hidden",
              }}
            >
              {/* Corner accent */}
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  height: 2,
                  background: `linear-gradient(90deg, transparent, ${GOLD}55, transparent)`,
                }}
              />
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 800,
                  color: GOLD,
                  letterSpacing: "0.24em",
                  textTransform: "uppercase",
                  marginBottom: 6,
                }}
              >
                ✦ Stay in the Loop
              </div>
              <p
                style={{
                  margin: "0 0 14px",
                  fontSize: 12,
                  color: "rgba(229,224,198,0.4)",
                  lineHeight: 1.6,
                }}
              >
                Get notified about upcoming auctions, exclusive deals and promo
                codes.
              </p>
              <Newsletter />
            </div>
          </div>
        </div>

        {/* ── Divider ── */}
        <div
          style={{
            height: 1,
            background:
              "linear-gradient(90deg, transparent, rgba(229,224,198,0.1) 20%, rgba(229,224,198,0.1) 80%, transparent)",
            opacity: visible ? 1 : 0,
            transition: "opacity 0.8s ease 0.2s",
          }}
        />

        {/* ── Bottom bar ── */}
        <div
          className="footer-bottom-row"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "22px 0 28px",
            opacity: visible ? 1 : 0,
            transform: visible ? "translateY(0)" : "translateY(10px)",
            transition: "opacity 0.7s ease 0.3s, transform 0.7s ease 0.3s",
          }}
        >
          {/* Copyright */}
          <div
            style={{
              fontSize: 11,
              color: "rgba(229,224,198,0.25)",
              fontWeight: 400,
              letterSpacing: "0.04em",
            }}
          >
            © {year} Loqta Zone. All rights reserved.
          </div>

          {/* Legal links inline */}
          <div
            className="footer-legal-links"
            style={{ display: "flex", gap: 24, alignItems: "center" }}
          >
            {legalLinks.slice(0, 2).map(({ label, href }) => (
              <a
                key={label}
                href={href}
                style={{
                  fontSize: 11,
                  color: "rgba(229,224,198,0.25)",
                  textDecoration: "none",
                  letterSpacing: "0.04em",
                  transition: "color 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLAnchorElement).style.color =
                    `${GOLD}99`;
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLAnchorElement).style.color =
                    "rgba(229,224,198,0.25)";
                }}
              >
                {label}
              </a>
            ))}
          </div>

          {/* Made with */}
          <div
            style={{
              fontSize: 10,
              color: "rgba(229,224,198,0.18)",
              letterSpacing: "0.06em",
              fontWeight: 500,
            }}
          >
            Crafted with ✦ in Egypt
          </div>
        </div>
      </div>
    </footer>
  );
}
