import React, { useRef, useState, useEffect } from "react";

// ── Design tokens ────────────────────────────────────────────
const NAVY2 = "#1e3652";
const GOLD = "#c9a96e";
const CREAM = "rgb(229, 224, 198)";

// ── Steps data ────────────────────────────────────────────────
const steps = [
  {
    number: "01",
    icon: "✦",
    title: "Create Your Account",
    subtitle: "Register in Minutes",
    description:
      "Sign up with your email or phone number. Verify your identity securely and unlock access to Egypt's most exclusive online auction marketplace.",
    tag: "Free · 2 Min Setup",
    accent: GOLD,
  },
  {
    number: "02",
    icon: "◈",
    title: "Browse Live Auctions",
    subtitle: "Discover Premium Lots",
    description:
      "Explore curated auctions across electronics, beauty, wearables, and more. Filter by category, budget, or time remaining to find your perfect item.",
    tag: "Updated Daily",
    accent: "#7eb8e0",
  },
  {
    number: "03",
    icon: "⬡",
    title: "Place Your Bid",
    subtitle: "Secure & Transparent",
    description:
      "Register for the auction, apply a promo code if you have one, and place your bid. Real-time updates keep you in the loop every second.",
    tag: "Live Countdown",
    accent: "#a3c9a8",
  },
  {
    number: "04",
    icon: "◇",
    title: "Win & Receive",
    subtitle: "Fast Nationwide Delivery",
    description:
      "If your bid wins, we handle the rest. Secure payment processing and verified delivery straight to your door — anywhere in Egypt.",
    tag: "Guaranteed Delivery",
    accent: GOLD,
  },
];

// ── Card content (no positioning logic here) ──────────────────
function CardInner({
  step,
  isActive,
}: {
  step: (typeof steps)[0];
  isActive: boolean;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: "relative",
        borderRadius: 22,
        padding: "30px 28px 26px",
        background: hovered
          ? "rgba(255,255,255,0.068)"
          : isActive
            ? "rgba(255,255,255,0.052)"
            : "rgba(255,255,255,0.028)",
        border: `1px solid ${
          hovered
            ? "rgba(201,169,110,0.45)"
            : isActive
              ? "rgba(201,169,110,0.25)"
              : "rgba(229,224,198,0.09)"
        }`,
        backdropFilter: "blur(14px)",
        boxShadow: hovered
          ? `0 24px 64px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08)`
          : isActive
            ? "0 10px 40px rgba(0,0,0,0.32)"
            : "0 4px 20px rgba(0,0,0,0.2)",
        transform: hovered ? "translateY(-6px)" : "translateY(0)",
        transition: "all 0.42s cubic-bezier(0.22, 1, 0.36, 1)",
        cursor: "default",
        overflow: "hidden",
        height: "100%",
        boxSizing: "border-box",
      }}
    >
      {/* Top accent bar */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: hovered ? "8%" : "28%",
          right: hovered ? "8%" : "28%",
          height: 2,
          background: `linear-gradient(90deg, transparent, ${step.accent}, transparent)`,
          borderRadius: 999,
          transition: "all 0.5s cubic-bezier(0.22,1,0.36,1)",
          opacity: hovered ? 1 : isActive ? 0.65 : 0.32,
        }}
      />

      {/* Corner glow */}
      <div
        style={{
          position: "absolute",
          top: -40,
          right: -40,
          width: 160,
          height: 160,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${step.accent}${hovered ? "1e" : "0a"} 0%, transparent 70%)`,
          transition: "all 0.5s ease",
          pointerEvents: "none",
        }}
      />

      {/* Row: icon + number */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          marginBottom: 18,
        }}
      >
        {/* Icon */}
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: "50%",
            background: `linear-gradient(135deg, ${NAVY2}, #162d45)`,
            border: `1.5px solid ${hovered ? `${step.accent}66` : "rgba(229,224,198,0.12)"}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 18,
            color: step.accent,
            boxShadow: hovered ? `0 0 20px ${step.accent}44` : "none",
            transition: "all 0.4s ease",
            flexShrink: 0,
          }}
        >
          {step.icon}
        </div>

        {/* Step number — thin sans */}
        <span
          style={{
            fontFamily: "'Jost', 'DM Sans', 'Helvetica Neue', sans-serif",
            fontSize: 72,
            fontWeight: 200,
            color: hovered ? `${step.accent}50` : "rgba(229,224,198,0.08)",
            lineHeight: 1,
            letterSpacing: "-0.04em",
            transition: "color 0.4s ease",
            userSelect: "none",
          }}
        >
          {step.number}
        </span>
      </div>

      {/* Subtitle */}
      <div
        style={{
          fontSize: 10,
          fontWeight: 800,
          color: step.accent,
          letterSpacing: "0.25em",
          textTransform: "uppercase",
          marginBottom: 6,
        }}
      >
        {step.subtitle}
      </div>

      {/* Title */}
      <h3
        style={{
          margin: "0 0 10px",
          fontSize: 20,
          fontWeight: 900,
          color: CREAM,
          letterSpacing: "-0.01em",
          lineHeight: 1.2,
        }}
      >
        {step.title}
      </h3>

      {/* Description */}
      <p
        style={{
          margin: "0 0 20px",
          fontSize: 13.5,
          color: "rgba(229,224,198,0.5)",
          lineHeight: 1.8,
          fontWeight: 400,
        }}
      >
        {step.description}
      </p>

      {/* Tag */}
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          background: `${step.accent}14`,
          border: `1px solid ${step.accent}33`,
          borderRadius: 999,
          padding: "5px 14px",
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
          }}
        />
        {step.tag}
      </div>
    </div>
  );
}

// ── Single row in the timeline grid ───────────────────────────
// Layout: [left card zone] [node column] [right card zone]
// Even index (0,2) → card on left, empty on right
// Odd  index (1,3) → empty on left, card on right
function TimelineRow({
  step,
  index,
  isActive,
  isPast,
  isLast,
}: {
  step: (typeof steps)[0];
  index: number;
  isActive: boolean;
  isPast: boolean;
  isLast: boolean;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const side = index % 2 === 0 ? "left" : "right";

  // Per-card IntersectionObserver — independent trigger, no shared state
  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1, rootMargin: "0px 0px -40px 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      className="hiw-row"
      style={{
        display: "grid",
        // 3 columns: left card | center spine (56px) | right card
        gridTemplateColumns: "1fr 56px 1fr",
        alignItems: "center",
        position: "relative",
      }}
    >
      {/* ── Left slot (desktop only — hidden on mobile) ── */}
      <div
        className="hiw-left-slot"
        ref={side === "left" ? cardRef : undefined}
        style={{
          paddingRight: 32,
          opacity: side === "left" ? (visible ? 1 : 0) : 1,
          transform:
            side === "left"
              ? visible
                ? "translateX(0)"
                : "translateX(-56px)"
              : "none",
          transition:
            side === "left"
              ? "opacity 0.72s cubic-bezier(0.22,1,0.36,1), transform 0.72s cubic-bezier(0.22,1,0.36,1)"
              : "none",
        }}
      >
        <div className="hiw-desktop-card">
          {side === "left" && <CardInner step={step} isActive={isActive} />}
        </div>
      </div>

      {/* ── Center: spine segment + node ── */}
      <div
        className="hiw-spine-col"
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          position: "relative",
          alignSelf: "stretch",
        }}
      >
        {/* Spine line above node */}
        <div
          style={{
            flex: 1,
            width: 2,
            background:
              "linear-gradient(to bottom, transparent, rgba(229,224,198,0.1))",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Gold fill overlay — covers from top based on isPast/isActive */}
          {(isPast || isActive) && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: `linear-gradient(to bottom, ${GOLD}88, ${GOLD})`,
                boxShadow: `0 0 8px ${GOLD}55`,
              }}
            />
          )}
        </div>

        {/* Node */}
        <div
          style={{
            position: "relative",
            width: 56,
            height: 56,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          {/* Pulse ring */}
          <div
            style={{
              position: "absolute",
              width: isActive ? 50 : 30,
              height: isActive ? 50 : 30,
              borderRadius: "50%",
              border: `1px solid ${
                isActive
                  ? `${step.accent}55`
                  : isPast
                    ? `${GOLD}33`
                    : "rgba(229,224,198,0.1)"
              }`,
              transition: "all 0.6s cubic-bezier(0.22,1,0.36,1)",
              animation: isActive
                ? "nodeRing 2.6s ease-in-out infinite"
                : "none",
            }}
          />
          {/* Core dot */}
          <div
            style={{
              width: isActive ? 20 : 12,
              height: isActive ? 20 : 12,
              borderRadius: "50%",
              background: isActive
                ? `linear-gradient(135deg, ${step.accent}, ${step.accent}bb)`
                : isPast
                  ? `linear-gradient(135deg, ${GOLD}aa, ${GOLD}66)`
                  : "rgba(255,255,255,0.08)",
              border: `2px solid ${
                isActive
                  ? step.accent
                  : isPast
                    ? `${GOLD}66`
                    : "rgba(229,224,198,0.2)"
              }`,
              boxShadow: isActive
                ? `0 0 16px ${step.accent}88, 0 0 32px ${step.accent}33`
                : "none",
              transition: "all 0.6s cubic-bezier(0.22,1,0.36,1)",
              zIndex: 1,
            }}
          />
        </div>

        {/* Spine line below node */}
        {!isLast && (
          <div
            style={{
              flex: 1,
              width: 2,
              background:
                "linear-gradient(to bottom, rgba(229,224,198,0.1), transparent)",
              position: "relative",
              overflow: "hidden",
            }}
          >
            {isPast && (
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background: `linear-gradient(to bottom, ${GOLD}, ${GOLD}66)`,
                  boxShadow: `0 0 8px ${GOLD}44`,
                }}
              />
            )}
          </div>
        )}
        {/* Cap at the very bottom — no extra node */}
        {isLast && (
          <div style={{ height: 24, width: 2, background: "transparent" }} />
        )}
      </div>

      {/* ── Right slot ── */}
      <div
        className="hiw-right-slot"
        ref={side === "right" ? cardRef : undefined}
        style={{
          paddingLeft: 32,
          opacity: side === "right" ? (visible ? 1 : 0) : 1,
          transform:
            side === "right"
              ? visible
                ? "translateX(0)"
                : "translateX(56px)"
              : "none",
          transition:
            side === "right"
              ? "opacity 0.72s cubic-bezier(0.22,1,0.36,1), transform 0.72s cubic-bezier(0.22,1,0.36,1)"
              : "none",
        }}
      >
        {/* Desktop: show card only when this slot is "right" */}
        <div className="hiw-desktop-card">
          {side === "right" && <CardInner step={step} isActive={isActive} />}
        </div>
        {/* Mobile: ALL cards render here regardless of side */}
        <div className="hiw-mobile-card">
          <CardInner step={step} isActive={isActive} />
        </div>
      </div>
    </div>
  );
}

// ── Main Section ──────────────────────────────────────────────
export default function HowItWorksSection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const [headerVisible, setHeaderVisible] = useState(false);
  const [progress, setProgress] = useState(0);

  // Header observer — fires once, no flicker
  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setHeaderVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.25 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Scroll progress for active node tracking
  useEffect(() => {
    const handleScroll = () => {
      const el = sectionRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const winH = window.innerHeight;
      const p = Math.min(
        1,
        Math.max(0, (winH - rect.top) / (rect.height + winH)),
      );
      setProgress(p);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Which step is currently "active" based on scroll
  const activeIndex = Math.min(
    steps.length - 1,
    Math.floor(progress * steps.length * 1.1),
  );

  return (
    <section
      ref={sectionRef}
      style={{
        background:
          "linear-gradient(180deg, #0a0a1a 0%, #0b1520 40%, #0d1b2a 70%, #0a0a1a 100%)",
        padding: "100px 32px 130px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <style>{`
        @keyframes nodeRing {
          0%,100% { opacity:0.5; transform:scale(1); }
          50%      { opacity:0.12; transform:scale(1.4); }
        }

        /* ── Mobile: stick-left layout ── */
        @media (max-width: 640px) {
          .hiw-row {
            grid-template-columns: 40px 1fr !important;
          }
          .hiw-left-slot  { display: none !important; }
          .hiw-spine-col  { grid-column: 1 !important; }
          .hiw-right-slot {
            grid-column: 2 !important;
            padding-left: 16px !important;
            padding-right: 0 !important;
            opacity: 1 !important;
            transform: none !important;
            transition: none !important;
          }
          .hiw-mobile-card {
            display: block !important;
          }
          .hiw-desktop-card {
            display: none !important;
          }
        }

        @media (min-width: 641px) {
          .hiw-mobile-card { display: none !important; }
          .hiw-desktop-card { display: block !important; }
        }
      `}</style>

      {/* Background glows */}
      <div
        style={{
          position: "absolute",
          top: "35%",
          left: "50%",
          transform: "translate(-50%,-50%)",
          width: 900,
          height: 900,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(42,72,99,0.13) 0%, transparent 65%)",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: -60,
          right: "5%",
          width: 340,
          height: 340,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(201,169,110,0.055) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: -80,
          left: "8%",
          width: 300,
          height: 300,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(42,72,99,0.09) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />

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

      {/* ── Header ── */}
      <div
        ref={headerRef}
        style={{
          textAlign: "center",
          marginBottom: 80,
          position: "relative",
          zIndex: 1,
        }}
      >
        {/* Eyebrow */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 10,
            marginBottom: 20,
            opacity: headerVisible ? 1 : 0,
            transform: headerVisible ? "translateY(0)" : "translateY(14px)",
            transition: "opacity 0.55s ease, transform 0.55s ease",
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
            · Simple Process ·
          </span>
          <div
            style={{
              width: 32,
              height: 1,
              background: `linear-gradient(90deg, ${GOLD}, transparent)`,
            }}
          />
        </div>

        {/* Headline — one row, no SplitText, no flicker */}
        <h2
          style={{
            margin: "0 0 20px",
            fontSize: "clamp(36px, 5.5vw, 62px)",
            fontWeight: 900,
            letterSpacing: "-0.028em",
            lineHeight: 1.05,
            whiteSpace: "nowrap",
            opacity: headerVisible ? 1 : 0,
            transform: headerVisible ? "translateY(0)" : "translateY(28px)",
            transition: "opacity 0.7s ease 0.1s, transform 0.7s ease 0.1s",
          }}
        >
          <span style={{ color: "#ffffff" }}>How It </span>
          <span style={{ color: GOLD }}>Works.</span>
        </h2>

        <p
          style={{
            color: "rgba(229,224,198,0.45)",
            fontSize: 14,
            fontWeight: 400,
            maxWidth: 400,
            margin: "0 auto",
            lineHeight: 1.75,
            opacity: headerVisible ? 1 : 0,
            transform: headerVisible ? "translateY(0)" : "translateY(10px)",
            transition: "opacity 0.7s ease 0.22s, transform 0.7s ease 0.22s",
          }}
        >
          Four simple steps to start winning premium auctions across Egypt.
        </p>
      </div>

      {/* ── Timeline grid ── */}
      <div
        style={{
          maxWidth: 1000,
          margin: "0 auto",
          position: "relative",
          zIndex: 1,
        }}
      >
        {steps.map((step, i) => (
          <TimelineRow
            key={step.number}
            step={step}
            index={i}
            isActive={activeIndex === i}
            isPast={i < activeIndex}
            isLast={i === steps.length - 1}
          />
        ))}
      </div>

      {/* ── CTA ── */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 24,
          marginTop: 80,
          position: "relative",
          zIndex: 1,
          opacity: progress > 0.28 ? 1 : 0,
          transform: progress > 0.28 ? "translateY(0)" : "translateY(18px)",
          transition: "opacity 0.75s ease, transform 0.75s ease",
        }}
      >
        {/* Row 1: rule · label · rule — all perfectly centered */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 16,
            width: "100%",
          }}
        >
          <div
            style={{
              width: 64,
              height: 1,
              background: `linear-gradient(90deg, transparent, rgba(229,224,198,0.25))`,
              flexShrink: 0,
            }}
          />
          <span
            style={{
              fontSize: 11,
              color: "rgba(229,224,198,0.35)",
              letterSpacing: "0.24em",
              textTransform: "uppercase",
              fontWeight: 700,
              whiteSpace: "nowrap",
            }}
          >
            Ready to start?
          </span>
          <div
            style={{
              width: 64,
              height: 1,
              background: `linear-gradient(90deg, rgba(229,224,198,0.25), transparent)`,
              flexShrink: 0,
            }}
          />
        </div>

        {/* Row 2: button — centered on its own row */}
        <button
          style={{
            background: `linear-gradient(135deg, ${GOLD}, #b8944e)`,
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
            transition: "all 0.35s cubic-bezier(0.22,1,0.36,1)",
            whiteSpace: "nowrap",
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
          ✦ Join Loqta Zone
        </button>
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
            "linear-gradient(90deg, transparent, rgba(229,224,198,0.12), transparent)",
        }}
      />
    </section>
  );
}
