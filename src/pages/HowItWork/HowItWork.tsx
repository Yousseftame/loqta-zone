import React, { useRef, useState, useEffect } from "react";

// ── Design tokens (matching site-wide scheme) ─────────────────
const GOLD = "#c9a96e";
const GOLD2 = "#b8944e";
const NAVY = "#2A4863";
const NAVY2 = "#1e3652";
const CREAM = "rgb(229, 224, 198)";
const BG_DARK = "#0a0a1a";

// ── Data ──────────────────────────────────────────────────────
const steps = [
  {
    number: "01",
    icon: "✦",
    title: "Create Your Account",
    subtitle: "Register in Minutes",
    description:
      "Sign up with your email or phone number — it's completely free. Verify your identity securely and unlock full access to Egypt's most exclusive online auction marketplace.",
    details: [
      "Enter your name, email, and phone number",
      "Verify your account via SMS or email",
      "Complete your profile to start bidding",
    ],
    tag: "Free · 2 Min Setup",
    accent: GOLD,
    iconBg: `linear-gradient(135deg, ${NAVY}, ${NAVY2})`,
  },
  {
    number: "02",
    icon: "◈",
    title: "Browse Live Auctions",
    subtitle: "Discover Premium Lots",
    description:
      "Explore curated auctions across electronics, beauty, wearables, fragrances, and more. Each lot is handpicked for quality and value. Filter by category, budget, or time remaining.",
    details: [
      "View upcoming and live auction sessions",
      "Filter by category, price range & date",
      "Save your favorite items to your watchlist",
    ],
    tag: "Updated Daily",
    accent: "#7eb8e0",
    iconBg: `linear-gradient(135deg, #1a3050, #0d2236)`,
  },
  {
    number: "03",
    icon: "⬡",
    title: "Apply a Promo Code",
    subtitle: "Exclusive Member Deals",
    description:
      "Before placing your bid, enter your promo code to unlock discounted entry fees and enhanced bidding power. Our members consistently save more with every session.",
    details: [
      "Receive promo codes via email & WhatsApp",
      "Apply codes at the checkout step",
      "Stack savings across multiple auctions",
    ],
    tag: "Members Only Perks",
    accent: "#a3c9a8",
    iconBg: `linear-gradient(135deg, #1a3228, #0d2218)`,
  },
  {
    number: "04",
    icon: "◇",
    title: "Register & Place Your Bid",
    subtitle: "Secure & Transparent",
    description:
      "Register for your chosen auction, place your bid, and compete live. Real-time countdown timers and live bid updates keep you in the loop every second of the session.",
    details: [
      "Register for the specific auction session",
      "Place your bid amount confidently",
      "Get live notifications on bid status",
    ],
    tag: "Live Countdown",
    accent: GOLD,
    iconBg: `linear-gradient(135deg, ${NAVY}, ${NAVY2})`,
  },
  {
    number: "05",
    icon: "★",
    title: "Win & Receive",
    subtitle: "Fast Nationwide Delivery",
    description:
      "If your bid wins, we handle the rest. Secure payment processing and verified delivery straight to your door — anywhere in Egypt. Your prize arrives fast, safely packed.",
    details: [
      "Receive a winner notification instantly",
      "Complete secure payment in-app",
      "Nationwide delivery — tracked & guaranteed",
    ],
    tag: "Guaranteed Delivery",
    accent: "#e0c07e",
    iconBg: `linear-gradient(135deg, #2c2010, #1a1408)`,
  },
];

const faqs = [
  {
    q: "Is it free to create an account?",
    a: "Yes, creating an account on Loqta Zone is completely free. You only pay when you win an auction.",
  },
  {
    q: "How do promo codes work?",
    a: "Promo codes are distributed to registered members via email, WhatsApp, and social media. They reduce your entry fee or unlock bidding advantages for specific auction sessions.",
  },
  {
    q: "What payment methods are accepted?",
    a: "We accept all major Egyptian payment methods including Visa, Mastercard, Vodafone Cash, and bank transfers for secure and seamless transactions.",
  },
  {
    q: "How quickly will I receive my order?",
    a: "Winning items are typically delivered within 2–5 business days anywhere in Egypt. All deliveries are tracked and fully insured.",
  },
  {
    q: "What happens if I win but can't pay?",
    a: "We encourage all bidders to bid responsibly. If payment isn't completed within the specified window, the win may be forfeited and your account may be restricted.",
  },
  {
    q: "Can I participate in multiple auctions at once?",
    a: "Absolutely. You can register and bid in as many simultaneous auctions as you like, giving you more chances to win premium products.",
  },
];

// ── Animated counter ──────────────────────────────────────────
function useCountUp(target: number, duration = 2, started: boolean) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!started) return;
    let start: number | null = null;
    const step = (ts: number) => {
      if (!start) start = ts;
      const pct = Math.min((ts - start) / (duration * 1000), 1);
      const eased = 1 - Math.pow(1 - pct, 3);
      setVal(Math.floor(eased * target));
      if (pct < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target, duration, started]);
  return val;
}

// ── Step card ─────────────────────────────────────────────────
function StepCard({
  step,
  index,
  isVisible,
}: {
  step: (typeof steps)[0];
  index: number;
  isVisible: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const isLeft = index % 2 === 0;

  return (
    <div
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? "translateY(0)" : `translateY(50px)`,
        transition: `opacity 0.8s cubic-bezier(0.22,1,0.36,1) ${index * 0.13}s, transform 0.8s cubic-bezier(0.22,1,0.36,1) ${index * 0.13}s`,
        display: "flex",
        flexDirection: "column",
        gap: 0,
      }}
    >
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          position: "relative",
          borderRadius: 24,
          background: hovered
            ? "rgba(255,255,255,0.065)"
            : "rgba(255,255,255,0.032)",
          border: `1px solid ${hovered ? `${step.accent}55` : "rgba(229,224,198,0.09)"}`,
          backdropFilter: "blur(16px)",
          boxShadow: hovered
            ? `0 28px 72px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.08), 0 0 0 1px ${step.accent}22`
            : "0 4px 28px rgba(0,0,0,0.22)",
          transform: hovered ? "translateY(-6px)" : "translateY(0)",
          transition: "all 0.45s cubic-bezier(0.22, 1, 0.36, 1)",
          overflow: "hidden",
          cursor: "default",
          padding: "32px 32px 28px",
        }}
      >
        {/* Top accent bar */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: hovered ? "6%" : "25%",
            right: hovered ? "6%" : "25%",
            height: 2,
            background: `linear-gradient(90deg, transparent, ${step.accent}, transparent)`,
            borderRadius: 999,
            transition: "all 0.5s cubic-bezier(0.22,1,0.36,1)",
            opacity: hovered ? 1 : 0.45,
          }}
        />

        {/* Corner glow */}
        <div
          style={{
            position: "absolute",
            top: -60,
            right: -60,
            width: 200,
            height: 200,
            borderRadius: "50%",
            background: `radial-gradient(circle, ${step.accent}${hovered ? "18" : "08"} 0%, transparent 70%)`,
            transition: "all 0.5s ease",
            pointerEvents: "none",
          }}
        />

        {/* Step number watermark */}
        <div
          style={{
            position: "absolute",
            bottom: -12,
            right: 20,
            fontFamily: "'Cormorant Garamond', Georgia, serif",
            fontSize: 120,
            fontWeight: 700,
            fontStyle: "italic",
            color: "transparent",
            WebkitTextStroke: `1px ${step.accent}${hovered ? "18" : "0d"}`,
            userSelect: "none",
            pointerEvents: "none",
            lineHeight: 1,
            transition: "all 0.5s ease",
          }}
        >
          {step.number}
        </div>

        {/* Header row */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            marginBottom: 22,
            gap: 12,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            {/* Icon circle */}
            <div
              style={{
                width: 54,
                height: 54,
                borderRadius: "50%",
                background: step.iconBg,
                border: `1.5px solid ${hovered ? `${step.accent}66` : "rgba(229,224,198,0.14)"}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 20,
                color: step.accent,
                boxShadow: hovered ? `0 0 24px ${step.accent}44` : "none",
                transition: "all 0.4s ease",
                flexShrink: 0,
              }}
            >
              {step.icon}
            </div>

            <div>
              <div
                style={{
                  fontSize: 9,
                  fontWeight: 800,
                  color: step.accent,
                  letterSpacing: "0.28em",
                  textTransform: "uppercase",
                  marginBottom: 3,
                }}
              >
                {step.subtitle}
              </div>
              <h3
                style={{
                  margin: 0,
                  fontSize: "clamp(18px, 2.2vw, 22px)",
                  fontWeight: 900,
                  color: CREAM,
                  letterSpacing: "-0.01em",
                  lineHeight: 1.15,
                }}
              >
                {step.title}
              </h3>
            </div>
          </div>

          {/* Step number pill */}
          <div
            style={{
              padding: "6px 14px",
              background: `${step.accent}14`,
              border: `1px solid ${step.accent}33`,
              borderRadius: 999,
              fontSize: 11,
              fontWeight: 800,
              color: step.accent,
              letterSpacing: "0.14em",
              whiteSpace: "nowrap",
              flexShrink: 0,
            }}
          >
            Step {step.number}
          </div>
        </div>

        {/* Description */}
        <p
          style={{
            margin: "0 0 20px",
            fontSize: 14,
            color: "rgba(229,224,198,0.55)",
            lineHeight: 1.85,
            fontWeight: 400,
          }}
        >
          {step.description}
        </p>

        {/* Detail bullets */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 8,
            marginBottom: 22,
          }}
        >
          {step.details.map((d, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                opacity: isVisible ? 1 : 0,
                transform: isVisible ? "translateX(0)" : "translateX(-12px)",
                transition: `opacity 0.6s ease ${index * 0.13 + i * 0.08 + 0.3}s, transform 0.6s ease ${index * 0.13 + i * 0.08 + 0.3}s`,
              }}
            >
              <div
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: step.accent,
                  flexShrink: 0,
                  boxShadow: `0 0 8px ${step.accent}88`,
                }}
              />
              <span
                style={{
                  fontSize: 12.5,
                  color: "rgba(229,224,198,0.48)",
                  fontWeight: 500,
                  letterSpacing: "0.01em",
                }}
              >
                {d}
              </span>
            </div>
          ))}
        </div>

        {/* Tag */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 7,
            background: `${step.accent}12`,
            border: `1px solid ${step.accent}30`,
            borderRadius: 999,
            padding: "6px 16px",
            fontSize: 10,
            fontWeight: 700,
            color: step.accent,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
          }}
        >
          <span
            style={{
              width: 5,
              height: 5,
              borderRadius: "50%",
              background: step.accent,
              display: "inline-block",
              boxShadow: `0 0 6px ${step.accent}`,
            }}
          />
          {step.tag}
        </div>
      </div>
    </div>
  );
}

// ── FAQ item ──────────────────────────────────────────────────
function FaqItem({ q, a, index }: { q: string; a: string; index: number }) {
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        borderRadius: 16,
        background:
          hovered || open
            ? "rgba(255,255,255,0.05)"
            : "rgba(255,255,255,0.025)",
        border: `1px solid ${open ? `${GOLD}44` : hovered ? "rgba(229,224,198,0.15)" : "rgba(229,224,198,0.08)"}`,
        backdropFilter: "blur(12px)",
        overflow: "hidden",
        transition: "all 0.35s cubic-bezier(0.22,1,0.36,1)",
        cursor: "pointer",
      }}
      onClick={() => setOpen((v) => !v)}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          padding: "20px 24px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <span
            style={{
              fontSize: 10,
              fontWeight: 800,
              color: `${GOLD}77`,
              letterSpacing: "0.2em",
              fontFamily: "'Jost', sans-serif",
              minWidth: 24,
            }}
          >
            {String(index + 1).padStart(2, "0")}
          </span>
          <span
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: open ? CREAM : "rgba(229,224,198,0.75)",
              letterSpacing: "-0.01em",
              lineHeight: 1.4,
              transition: "color 0.3s ease",
            }}
          >
            {q}
          </span>
        </div>
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: "50%",
            background: open ? `${GOLD}22` : "rgba(255,255,255,0.04)",
            border: `1px solid ${open ? `${GOLD}44` : "rgba(229,224,198,0.1)"}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            transform: open ? "rotate(45deg)" : "rotate(0deg)",
            transition: "all 0.35s cubic-bezier(0.22,1,0.36,1)",
            color: open ? GOLD : "rgba(229,224,198,0.4)",
            fontSize: 18,
            fontWeight: 300,
            lineHeight: 1,
          }}
        >
          +
        </div>
      </div>
      <div
        style={{
          maxHeight: open ? 200 : 0,
          overflow: "hidden",
          transition: "max-height 0.45s cubic-bezier(0.22,1,0.36,1)",
        }}
      >
        <div
          style={{
            padding: "0 24px 22px 52px",
            fontSize: 13.5,
            color: "rgba(229,224,198,0.5)",
            lineHeight: 1.8,
            fontWeight: 400,
          }}
        >
          {a}
        </div>
      </div>
    </div>
  );
}

// ── Trust badge ───────────────────────────────────────────────
function TrustBadge({
  icon,
  label,
  sub,
}: {
  icon: string;
  label: string;
  sub: string;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 10,
        padding: "28px 20px",
        borderRadius: 18,
        background: hovered
          ? "rgba(255,255,255,0.05)"
          : "rgba(255,255,255,0.025)",
        border: `1px solid ${hovered ? `${GOLD}33` : "rgba(229,224,198,0.07)"}`,
        transition: "all 0.4s cubic-bezier(0.22,1,0.36,1)",
        transform: hovered ? "translateY(-5px)" : "translateY(0)",
        cursor: "default",
        textAlign: "center",
      }}
    >
      <div style={{ fontSize: 28 }}>{icon}</div>
      <div
        style={{
          fontSize: 12,
          fontWeight: 800,
          color: CREAM,
          letterSpacing: "0.04em",
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 11,
          color: "rgba(229,224,198,0.4)",
          fontWeight: 400,
          lineHeight: 1.5,
        }}
      >
        {sub}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────
export default function HowItWork() {
  const heroRef = useRef<HTMLDivElement>(null);
  const stepsRef = useRef<HTMLDivElement>(null);
  const faqRef = useRef<HTMLDivElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);

  const [heroVisible, setHeroVisible] = useState(false);
  const [stepsVisible, setStepsVisible] = useState(false);
  const [faqVisible, setFaqVisible] = useState(false);
  const [ctaVisible, setCtaVisible] = useState(false);

  const [scrollY, setScrollY] = useState(0);

  const c1 = useCountUp(24800, 2, heroVisible);
  const c2 = useCountUp(3200, 2.2, heroVisible);
  const c3 = useCountUp(98, 1.8, heroVisible);

  useEffect(() => {
    const fn = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  useEffect(() => {
    const makeObs = (
      ref: React.RefObject<HTMLDivElement | null>,
      setter: (v: boolean) => void,
      threshold = 0.1,
    ) => {
      const el = ref.current;
      if (!el) return;
      const obs = new IntersectionObserver(
        ([e]) => {
          if (e.isIntersecting) {
            setter(true);
            obs.disconnect();
          }
        },
        { threshold },
      );
      obs.observe(el);
      return () => obs.disconnect();
    };
    const cleanups = [
      makeObs(heroRef, setHeroVisible, 0.05),
      makeObs(stepsRef, setStepsVisible, 0.05),
      makeObs(faqRef, setFaqVisible, 0.05),
      makeObs(ctaRef, setCtaVisible, 0.1),
    ];
    return () => cleanups.forEach((c) => c?.());
  }, []);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,700;1,700;1,900&family=Jost:wght@200;300;400;600;700;800&display=swap');

        * { box-sizing: border-box; }

        .hiw-page {
          font-family: 'Jost', 'Helvetica Neue', sans-serif;
          background: ${BG_DARK};
          min-height: 100vh;
          color: ${CREAM};
          overflow-x: hidden;
        }

        /* ── Grain overlay ── */
        .hiw-grain {
          position: fixed;
          inset: 0;
          z-index: 0;
          opacity: 0.025;
          pointer-events: none;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
          background-size: 200px 200px;
        }

        /* ── Step connector line ── */
        .step-connector {
          width: 2px;
          background: linear-gradient(to bottom, ${GOLD}44, ${GOLD}11);
          margin: 0 auto;
          border-radius: 999px;
          transition: height 0.8s ease;
        }

        /* ── Parallax hero text ── */
        .hero-word {
          display: block;
          overflow: hidden;
          line-height: 0.92;
        }

        @keyframes heroSlideUp {
          from { opacity: 0; transform: translateY(60px) skewY(2deg); }
          to   { opacity: 1; transform: translateY(0) skewY(0deg); }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulseGold {
          0%,100% { opacity: 0.3; transform: scale(1); }
          50%      { opacity: 0.55; transform: scale(1.08); }
        }
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }

        .hiw-word-1 { animation: heroSlideUp 1.2s cubic-bezier(0.22,1,0.36,1) 0.2s both; }
        .hiw-word-2 { animation: heroSlideUp 1.2s cubic-bezier(0.22,1,0.36,1) 0.38s both; }
        .hiw-hero-sub { animation: fadeInUp 0.9s ease 0.85s both; }
        .hiw-hero-meta { animation: fadeInUp 0.9s ease 1.1s both; }
        .hiw-hero-stats { animation: fadeInUp 0.9s ease 1.3s both; }
        .hiw-scroll-cue { animation: fadeInUp 0.9s ease 1.6s both; }

        @keyframes scrollPulse {
          0%,100% { transform: scaleY(1); opacity: 0.5; }
          50%      { transform: scaleY(1.2); opacity: 1; }
        }
        .scroll-line { animation: scrollPulse 2.8s ease-in-out 1.8s infinite; }

        @media (max-width: 640px) {
          .steps-grid { grid-template-columns: 1fr !important; }
          .trust-grid { grid-template-columns: 1fr 1fr !important; }
          .hero-text { font-size: clamp(72px, 22vw, 100px) !important; }
        }
      `}</style>

      <div className="hiw-page">
        <div className="hiw-grain" />

        {/* ════════ HERO ════════ */}
        <section
          ref={heroRef}
          style={{
            position: "relative",
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
            padding: "120px 32px 80px",
          }}
        >
          {/* Background radial glows */}
          <div
            style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
          >
            <div
              style={{
                position: "absolute",
                top: "20%",
                left: "50%",
                transform: `translateX(-50%) translateY(${scrollY * 0.08}px)`,
                width: 900,
                height: 900,
                borderRadius: "50%",
                background: `radial-gradient(circle, rgba(42,72,99,0.22) 0%, transparent 65%)`,
                animation: "pulseGold 7s ease-in-out infinite",
              }}
            />
            <div
              style={{
                position: "absolute",
                top: "-5%",
                right: "8%",
                transform: `translateY(${scrollY * 0.06}px)`,
                width: 380,
                height: 380,
                borderRadius: "50%",
                background: `radial-gradient(circle, rgba(201,169,110,0.08) 0%, transparent 70%)`,
              }}
            />
            <div
              style={{
                position: "absolute",
                bottom: "5%",
                left: "5%",
                transform: `translateY(${-scrollY * 0.04}px)`,
                width: 300,
                height: 300,
                borderRadius: "50%",
                background: `radial-gradient(circle, rgba(201,169,110,0.06) 0%, transparent 70%)`,
              }}
            />
          </div>

          {/* Decorative rings */}
          {[320, 550, 800].map((sz, i) => (
            <div
              key={i}
              style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: `translate(-50%, -50%) translateY(${scrollY * 0.03 * (i + 1)}px)`,
                width: sz,
                height: sz,
                borderRadius: "50%",
                border: `1px solid rgba(201,169,110,${0.06 - i * 0.015})`,
                pointerEvents: "none",
              }}
            />
          ))}

          {/* Top gold border */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: 1,
              background: `linear-gradient(90deg, transparent, ${GOLD}, rgba(229,224,198,0.7), ${GOLD}, transparent)`,
              opacity: 0.4,
            }}
          />

          {/* Eyebrow label */}
          <div
            className="hiw-hero-sub"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
              marginBottom: 32,
              position: "relative",
              zIndex: 2,
            }}
          >
            <div
              style={{
                width: 32,
                height: 1,
                background: `linear-gradient(90deg, transparent, ${GOLD})`,
              }}
            />
            <span
              style={{
                fontSize: 10,
                fontWeight: 800,
                color: GOLD,
                letterSpacing: "0.32em",
                textTransform: "uppercase",
              }}
            >
              · Getting Started ·
            </span>
            <div
              style={{
                width: 32,
                height: 1,
                background: `linear-gradient(90deg, ${GOLD}, transparent)`,
              }}
            />
          </div>

          {/* Hero heading */}
          <div
            style={{
              textAlign: "center",
              position: "relative",
              zIndex: 2,
              marginBottom: 28,
            }}
          >
            <div className="hero-word hiw-word-1">
              <span
                className="hero-text"
                style={{
                  fontFamily: "'Cormorant Garamond', Georgia, serif",
                  fontSize: "clamp(80px, 14vw, 180px)",
                  fontWeight: 700,
                  fontStyle: "italic",
                  color: CREAM,
                  letterSpacing: "-0.028em",
                  display: "inline-block",
                  textShadow: "0 2px 60px rgba(0,0,0,0.5)",
                }}
              >
                How It
              </span>
            </div>
            <div className="hero-word hiw-word-2">
              <span
                className="hero-text"
                style={{
                  fontFamily: "'Cormorant Garamond', Georgia, serif",
                  fontSize: "clamp(80px, 14vw, 180px)",
                  fontWeight: 700,
                  fontStyle: "italic",
                  color: "transparent",
                  WebkitTextStroke: `2px ${GOLD}`,
                  letterSpacing: "-0.028em",
                  display: "inline-block",
                }}
              >
                Works.
              </span>
            </div>
          </div>

          {/* Subtitle */}
          <p
            className="hiw-hero-sub"
            style={{
              position: "relative",
              zIndex: 2,
              fontSize: "clamp(13px, 1.3vw, 16px)",
              fontWeight: 300,
              letterSpacing: "0.06em",
              color: "rgba(229,224,198,0.5)",
              textAlign: "center",
              maxWidth: 480,
              lineHeight: 1.8,
              marginBottom: 56,
            }}
          >
            Five simple steps to start winning premium products from Egypt's
            most exclusive online auction platform.
          </p>

          {/* Inline stats */}
          <div
            className="hiw-hero-stats"
            style={{
              position: "relative",
              zIndex: 2,
              display: "flex",
              gap: "clamp(24px, 5vw, 72px)",
              alignItems: "center",
              justifyContent: "center",
              flexWrap: "wrap",
            }}
          >
            {[
              { val: c1, suffix: "+", label: "Registered Users" },
              { val: c2, suffix: "+", label: "Auctions Done" },
              { val: c3, suffix: "%", label: "Satisfaction" },
            ].map((s, i) => (
              <React.Fragment key={i}>
                {i > 0 && (
                  <div
                    style={{
                      width: 1,
                      height: 40,
                      background: "rgba(229,224,198,0.12)",
                      flexShrink: 0,
                    }}
                  />
                )}
                <div style={{ textAlign: "center" }}>
                  <div
                    style={{
                      fontSize: "clamp(28px, 3.5vw, 42px)",
                      fontWeight: 900,
                      color: GOLD,
                      letterSpacing: "-0.02em",
                      lineHeight: 1,
                      display: "flex",
                      alignItems: "baseline",
                      gap: 2,
                      justifyContent: "center",
                    }}
                  >
                    <span>{s.val.toLocaleString()}</span>
                    <span
                      style={{
                        fontSize: "0.55em",
                        fontWeight: 700,
                        opacity: 0.8,
                      }}
                    >
                      {s.suffix}
                    </span>
                  </div>
                  <div
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      color: "rgba(229,224,198,0.4)",
                      letterSpacing: "0.18em",
                      textTransform: "uppercase",
                      marginTop: 4,
                    }}
                  >
                    {s.label}
                  </div>
                </div>
              </React.Fragment>
            ))}
          </div>

          {/* Scroll cue */}
          <div
            className="hiw-scroll-cue"
            style={{
              position: "absolute",
              bottom: 40,
              left: "50%",
              transform: "translateX(-50%)",
              zIndex: 2,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span
              className="scroll-line"
              style={{
                display: "block",
                width: 1,
                height: 40,
                background: `linear-gradient(to bottom, transparent, ${GOLD}66)`,
                borderRadius: 999,
              }}
            />
            <span
              style={{
                fontSize: 8.5,
                fontWeight: 200,
                letterSpacing: "0.38em",
                textTransform: "uppercase",
                color: "rgba(229,224,198,0.3)",
              }}
            >
              Scroll
            </span>
          </div>
        </section>

        {/* ════════ STEPS SECTION ════════ */}
        <section
          ref={stepsRef}
          style={{
            background: `linear-gradient(180deg, #0a0a1a 0%, #0c1828 50%, #0a0a1a 100%)`,
            padding: "100px 32px 120px",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Top separator */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: 1,
              background: `linear-gradient(90deg, transparent, ${GOLD}, rgba(229,224,198,0.6), ${GOLD}, transparent)`,
              opacity: 0.3,
            }}
          />

          {/* Bg glow */}
          <div
            style={{
              position: "absolute",
              top: "40%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              width: 1100,
              height: 700,
              borderRadius: "50%",
              background:
                "radial-gradient(ellipse, rgba(42,72,99,0.14) 0%, transparent 65%)",
              pointerEvents: "none",
            }}
          />

          {/* Section header */}
          <div
            style={{
              textAlign: "center",
              marginBottom: 72,
              position: "relative",
              zIndex: 1,
              opacity: stepsVisible ? 1 : 0,
              transform: stepsVisible ? "translateY(0)" : "translateY(24px)",
              transition: "opacity 0.7s ease, transform 0.7s ease",
            }}
          >
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 10,
                marginBottom: 18,
              }}
            >
              <div
                style={{
                  width: 32,
                  height: 1,
                  background: `linear-gradient(90deg, transparent, ${GOLD})`,
                }}
              />
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 800,
                  color: GOLD,
                  letterSpacing: "0.3em",
                  textTransform: "uppercase",
                }}
              >
                · Step by Step ·
              </span>
              <div
                style={{
                  width: 32,
                  height: 1,
                  background: `linear-gradient(90deg, ${GOLD}, transparent)`,
                }}
              />
            </div>
            <h2
              style={{
                margin: 0,
                fontSize: "clamp(32px, 5vw, 56px)",
                fontWeight: 900,
                letterSpacing: "-0.025em",
                lineHeight: 1.08,
              }}
            >
              <span style={{ color: "#ffffff" }}>Your Journey </span>
              <span style={{ color: GOLD }}>Starts Here.</span>
            </h2>
            <p
              style={{
                marginTop: 16,
                fontSize: 14,
                color: "rgba(229,224,198,0.42)",
                fontWeight: 400,
                maxWidth: 440,
                marginInline: "auto",
                lineHeight: 1.75,
              }}
            >
              Follow these five steps and you'll go from first visit to winning
              your first auction in no time.
            </p>
          </div>

          {/* Steps grid */}
          <div
            className="steps-grid"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))",
              gap: 20,
              maxWidth: 1200,
              margin: "0 auto",
              position: "relative",
              zIndex: 1,
            }}
          >
            {steps.map((step, i) => (
              <StepCard
                key={step.number}
                step={step}
                index={i}
                isVisible={stepsVisible}
              />
            ))}

            {/* 5th card centered if odd */}
            {/* (grid auto-fit handles it) */}
          </div>

          {/* Connecting visual thread */}
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              gap: 12,
              marginTop: 56,
              opacity: stepsVisible ? 1 : 0,
              transition: "opacity 0.8s ease 0.6s",
              position: "relative",
              zIndex: 1,
            }}
          >
            {steps.map((s, i) => (
              <React.Fragment key={i}>
                <div
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: "50%",
                    background: s.accent,
                    boxShadow: `0 0 12px ${s.accent}88`,
                  }}
                />
                {i < steps.length - 1 && (
                  <div
                    style={{
                      flex: 1,
                      maxWidth: 60,
                      height: 1,
                      background: `linear-gradient(90deg, ${s.accent}55, ${steps[i + 1].accent}55)`,
                    }}
                  />
                )}
              </React.Fragment>
            ))}
          </div>
        </section>

        {/* ════════ TRUST BADGES ════════ */}
        <section
          style={{
            background: `linear-gradient(180deg, #0a0a1a 0%, #060610 100%)`,
            padding: "80px 32px",
            position: "relative",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: 1,
              background: `linear-gradient(90deg, transparent, rgba(229,224,198,0.12), transparent)`,
            }}
          />

          <div style={{ maxWidth: 1100, margin: "0 auto" }}>
            <div style={{ textAlign: "center", marginBottom: 48 }}>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 800,
                  color: `${GOLD}88`,
                  letterSpacing: "0.28em",
                  textTransform: "uppercase",
                }}
              >
                ✦ Why Loqta Zone ✦
              </span>
            </div>
            <div
              className="trust-grid"
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                gap: 16,
              }}
            >
              {[
                {
                  icon: "🔒",
                  label: "Secure Payments",
                  sub: "End-to-end encrypted transactions",
                },
                {
                  icon: "🚚",
                  label: "Fast Delivery",
                  sub: "2–5 business days nationwide",
                },
                {
                  icon: "🏆",
                  label: "Verified Winners",
                  sub: "Every win is publicly confirmed",
                },
                {
                  icon: "💬",
                  label: "Live Support",
                  sub: "Dedicated Arabic & English team",
                },
                {
                  icon: "🎟",
                  label: "Promo Codes",
                  sub: "Exclusive deals for members",
                },
                {
                  icon: "📱",
                  label: "Mobile Ready",
                  sub: "Bid anywhere, anytime",
                },
              ].map((b) => (
                <TrustBadge key={b.label} {...b} />
              ))}
            </div>
          </div>
        </section>

        {/* ════════ FAQ SECTION ════════ */}
        <section
          ref={faqRef}
          style={{
            background: `linear-gradient(180deg, #060610 0%, #0c1828 60%, #0a0a1a 100%)`,
            padding: "100px 32px 120px",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: 1,
              background: `linear-gradient(90deg, transparent, ${GOLD}, rgba(229,224,198,0.6), ${GOLD}, transparent)`,
              opacity: 0.22,
            }}
          />
          <div
            style={{
              position: "absolute",
              top: "30%",
              right: "-10%",
              width: 500,
              height: 500,
              borderRadius: "50%",
              background: `radial-gradient(circle, rgba(42,72,99,0.12) 0%, transparent 65%)`,
              pointerEvents: "none",
            }}
          />

          <div
            style={{
              maxWidth: 800,
              margin: "0 auto",
              position: "relative",
              zIndex: 1,
            }}
          >
            {/* Header */}
            <div
              style={{
                textAlign: "center",
                marginBottom: 60,
                opacity: faqVisible ? 1 : 0,
                transform: faqVisible ? "translateY(0)" : "translateY(24px)",
                transition: "opacity 0.7s ease, transform 0.7s ease",
              }}
            >
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 10,
                  marginBottom: 18,
                }}
              >
                <div
                  style={{
                    width: 32,
                    height: 1,
                    background: `linear-gradient(90deg, transparent, ${GOLD})`,
                  }}
                />
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 800,
                    color: GOLD,
                    letterSpacing: "0.3em",
                    textTransform: "uppercase",
                  }}
                >
                  · FAQ ·
                </span>
                <div
                  style={{
                    width: 32,
                    height: 1,
                    background: `linear-gradient(90deg, ${GOLD}, transparent)`,
                  }}
                />
              </div>
              <h2
                style={{
                  margin: 0,
                  fontSize: "clamp(28px, 4vw, 48px)",
                  fontWeight: 900,
                  letterSpacing: "-0.02em",
                }}
              >
                <span style={{ color: "#ffffff" }}>Common </span>
                <span style={{ color: GOLD }}>Questions.</span>
              </h2>
              <p
                style={{
                  marginTop: 14,
                  fontSize: 14,
                  color: "rgba(229,224,198,0.4)",
                  maxWidth: 380,
                  marginInline: "auto",
                  lineHeight: 1.75,
                }}
              >
                Everything you need to know before placing your first bid.
              </p>
            </div>

            {/* FAQ list */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {faqs.map((item, i) => (
                <div
                  key={i}
                  style={{
                    opacity: faqVisible ? 1 : 0,
                    transform: faqVisible
                      ? "translateY(0)"
                      : "translateY(20px)",
                    transition: `opacity 0.6s ease ${i * 0.08}s, transform 0.6s ease ${i * 0.08}s`,
                  }}
                >
                  <FaqItem q={item.q} a={item.a} index={i} />
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ════════ CTA SECTION ════════ */}
        <section
          ref={ctaRef}
          style={{
            background: `linear-gradient(180deg, #0a0a1a 0%, #060610 100%)`,
            padding: "100px 32px 120px",
            position: "relative",
            overflow: "hidden",
            textAlign: "center",
          }}
        >
          {/* Bg glow */}
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              width: 700,
              height: 700,
              borderRadius: "50%",
              background: `radial-gradient(circle, rgba(201,169,110,0.07) 0%, transparent 65%)`,
              pointerEvents: "none",
            }}
          />

          {/* Decorative rings */}
          {[200, 380, 580].map((sz, i) => (
            <div
              key={i}
              style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                width: sz,
                height: sz,
                borderRadius: "50%",
                border: `1px solid rgba(201,169,110,${0.08 - i * 0.02})`,
                pointerEvents: "none",
              }}
            />
          ))}

          <div
            style={{
              position: "relative",
              zIndex: 1,
              maxWidth: 580,
              margin: "0 auto",
              opacity: ctaVisible ? 1 : 0,
              transform: ctaVisible ? "translateY(0)" : "translateY(32px)",
              transition: "opacity 0.8s ease, transform 0.8s ease",
            }}
          >
            {/* Icon */}
            <div
              style={{
                width: 72,
                height: 72,
                borderRadius: "50%",
                margin: "0 auto 28px",
                background: `linear-gradient(135deg, ${NAVY}, ${NAVY2})`,
                border: `2px solid ${GOLD}44`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 28,
                boxShadow: `0 0 40px ${GOLD}22, 0 8px 32px rgba(0,0,0,0.5)`,
              }}
            >
              ✦
            </div>

            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 10,
                marginBottom: 20,
              }}
            >
              <div
                style={{
                  width: 32,
                  height: 1,
                  background: `linear-gradient(90deg, transparent, ${GOLD})`,
                }}
              />
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 800,
                  color: GOLD,
                  letterSpacing: "0.3em",
                  textTransform: "uppercase",
                }}
              >
                · Ready to Begin ·
              </span>
              <div
                style={{
                  width: 32,
                  height: 1,
                  background: `linear-gradient(90deg, ${GOLD}, transparent)`,
                }}
              />
            </div>

            <h2
              style={{
                margin: "0 0 16px",
                fontSize: "clamp(32px, 5vw, 56px)",
                fontWeight: 900,
                letterSpacing: "-0.025em",
                lineHeight: 1.1,
                fontFamily: "'Cormorant Garamond', Georgia, serif",
                fontStyle: "italic",
              }}
            >
              <span style={{ color: CREAM }}>Join </span>
              <span style={{ color: GOLD }}>Loqta Zone</span>
            </h2>

            <p
              style={{
                fontSize: 14,
                color: "rgba(229,224,198,0.45)",
                lineHeight: 1.8,
                marginBottom: 44,
                fontWeight: 400,
              }}
            >
              Create your free account today and start bidding on premium
              products. Your first win could be just one bid away.
            </p>

            {/* CTA buttons */}
            <div
              style={{
                display: "flex",
                gap: 14,
                justifyContent: "center",
                flexWrap: "wrap",
              }}
            >
              <button
                style={{
                  background: `linear-gradient(135deg, ${GOLD}, ${GOLD2})`,
                  color: "#0a0a1a",
                  border: "none",
                  borderRadius: 999,
                  padding: "16px 52px",
                  fontSize: 12,
                  fontWeight: 800,
                  letterSpacing: "0.22em",
                  textTransform: "uppercase",
                  cursor: "pointer",
                  boxShadow: `0 8px 32px ${GOLD}44`,
                  position: "relative",
                  overflow: "hidden",
                  transition: "all 0.35s cubic-bezier(0.22,1,0.36,1)",
                }}
                onMouseEnter={(e) => {
                  const b = e.currentTarget as HTMLButtonElement;
                  b.style.transform = "translateY(-4px) scale(1.04)";
                  b.style.boxShadow = `0 20px 54px ${GOLD}55`;
                }}
                onMouseLeave={(e) => {
                  const b = e.currentTarget as HTMLButtonElement;
                  b.style.transform = "translateY(0) scale(1)";
                  b.style.boxShadow = `0 8px 32px ${GOLD}44`;
                }}
              >
                ✦ Register Free
              </button>
              <button
                style={{
                  background: "transparent",
                  color: GOLD,
                  border: `1px solid ${GOLD}44`,
                  borderRadius: 999,
                  padding: "16px 40px",
                  fontSize: 12,
                  fontWeight: 800,
                  letterSpacing: "0.22em",
                  textTransform: "uppercase",
                  cursor: "pointer",
                  transition: "all 0.35s ease",
                }}
                onMouseEnter={(e) => {
                  const b = e.currentTarget as HTMLButtonElement;
                  b.style.background = `rgba(201,169,110,0.08)`;
                  b.style.borderColor = `${GOLD}88`;
                  b.style.boxShadow = `0 0 24px ${GOLD}22`;
                }}
                onMouseLeave={(e) => {
                  const b = e.currentTarget as HTMLButtonElement;
                  b.style.background = "transparent";
                  b.style.borderColor = `${GOLD}44`;
                  b.style.boxShadow = "none";
                }}
              >
                View Auctions
              </button>
            </div>

            {/* Trust note */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 20,
                marginTop: 36,
                flexWrap: "wrap",
              }}
            >
              {["🔒 Secure", "🚚 Fast Delivery", "🏆 Verified"].map((b) => (
                <span
                  key={b}
                  style={{
                    fontSize: 11,
                    color: "rgba(229,224,198,0.3)",
                    fontWeight: 600,
                    letterSpacing: "0.06em",
                  }}
                >
                  {b}
                </span>
              ))}
            </div>
          </div>

          {/* Bottom separator */}
          <div
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              height: 1,
              background:
                "linear-gradient(90deg, transparent, rgba(229,224,198,0.1), transparent)",
            }}
          />
        </section>
      </div>
    </>
  );
}
