import AboutFeatures from "@/components/shared/Aboutfeatures";
import AboutPlatform from "@/components/shared/Aboutplatform";
import AboutProblem from "@/components/shared/Aboutproblem";
import AboutSolution from "@/components/shared/Aboutsolution";
import AboutVisionMission from "@/components/shared/Aboutvisionmission";
import React, { useRef, useState, useEffect } from "react";
import { useTranslation } from "react-i18next";

// ── Design tokens (site-wide) ─────────────────────────────────
const GOLD = "#c9a96e";
const GOLD2 = "#b8944e";
const NAVY = "#2A4863";
const NAVY2 = "#1e3652";
const CREAM = "rgb(229, 224, 198)";
const BG = "#0a0a1a";

// ── useInView hook ─────────────────────────────────────────────
function useInView(
  ref: React.RefObject<HTMLDivElement | null>,
  threshold = 0.1,
) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { threshold },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return visible;
}

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

// ══════════════════════════════════════════════════════════════
// ABOUT US HERO HEADER
// ══════════════════════════════════════════════════════════════
function AboutHero() {
  const heroRef = useRef<HTMLDivElement>(null);
  const heroVisible = useInView(heroRef, 0.05);
  const [scrollY, setScrollY] = useState(0);

  // Counters — start when hero becomes visible
  const c1 = useCountUp(24800, 2.2, heroVisible); // users
  const c2 = useCountUp(2020, 1.6, heroVisible); // founded year
  const c3 = useCountUp(98, 1.8, heroVisible); // satisfaction %

  useEffect(() => {
    const fn = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  const { t } = useTranslation();

  const pillStats = [
    {
      val: c1,
      suffix: "+",
      label: t("aboutPage.hero.stats.users"),
    },
    {
      val: c2,
      suffix: "",
      label: t("aboutPage.hero.stats.founded"),
    },
    {
      val: c3,
      suffix: "%",
      label: t("aboutPage.hero.stats.satisfaction"),
    },
  ];

  return (
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
        padding: "140px 32px 100px",
        background: BG,
      }}
    >
      {/* ── Atmosphere layers ── */}
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
        {/* Main radial pulse */}
        <div
          style={{
            position: "absolute",
            top: "28%",
            left: "50%",
            transform: `translateX(-50%) translateY(${scrollY * 0.07}px)`,
            width: 960,
            height: 960,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(42,72,99,0.22) 0%, transparent 65%)",
          }}
        />
        {/* Gold accent glow — top right */}
        <div
          style={{
            position: "absolute",
            top: "3%",
            right: "7%",
            transform: `translateY(${scrollY * 0.055}px)`,
            width: 400,
            height: 400,
            borderRadius: "50%",
            background: `radial-gradient(circle, rgba(201,169,110,0.09) 0%, transparent 70%)`,
          }}
        />
        {/* Subtle gold glow — bottom left */}
        <div
          style={{
            position: "absolute",
            bottom: "4%",
            left: "4%",
            transform: `translateY(${-scrollY * 0.035}px)`,
            width: 300,
            height: 300,
            borderRadius: "50%",
            background: `radial-gradient(circle, rgba(201,169,110,0.06) 0%, transparent 70%)`,
          }}
        />
      </div>

      {/* ── Decorative concentric rings ── */}
      {[320, 560, 820, 1100].map((sz, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: `translate(-50%, -50%) translateY(${scrollY * 0.025 * (i + 1)}px)`,
            width: sz,
            height: sz,
            borderRadius: "50%",
            border: `1px solid rgba(201,169,110,${0.065 - i * 0.013})`,
            pointerEvents: "none",
          }}
        />
      ))}

      {/* ── Top gold separator ── */}
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

      {/* ── Grain texture overlay ── */}
      <div className="about-grain" />

      {/* ══ CONTENT ══════════════════════════════════════════════ */}

      {/* Eyebrow */}
      <div className="about-hero-eyebrow">
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
          {t("aboutPage.hero.eyebrow")}
        </span>
        <div
          style={{
            width: 32,
            height: 1,
            background: `linear-gradient(90deg, ${GOLD}, transparent)`,
          }}
        />
      </div>

      {/* Main heading — two lines */}
      <div
        style={{
          textAlign: "center",
          position: "relative",
          zIndex: 2,
          marginBottom: 28,
        }}
      >
        {/* Line 1 — solid cream */}
        <div className="about-hero-word">
          <span
            className="about-hero-text about-w1"
            style={{
              fontFamily: "'Cormorant Garamond', Georgia, serif",
              fontSize: "clamp(72px, 13vw, 168px)",
              fontWeight: 700,
              fontStyle: "italic",
              color: CREAM,
              letterSpacing: "-0.028em",
              display: "inline-block",
              textShadow: "0 4px 80px rgba(0,0,0,0.55)",
            }}
          >
            {t("aboutPage.hero.line1")}
          </span>
        </div>

        {/* Line 2 — gold outline */}
        <div className="about-hero-word">
          <span
            className="about-hero-text about-w2"
            style={{
              fontFamily: "'Cormorant Garamond', Georgia, serif",
              fontSize: "clamp(72px, 13vw, 168px)",
              fontWeight: 700,
              fontStyle: "italic",
              color: "transparent",
              WebkitTextStroke: `2px ${GOLD}`,
              letterSpacing: "-0.028em",
              display: "inline-block",
            }}
          >
            {t("aboutPage.hero.line2")}
          </span>
        </div>
      </div>

      {/* Subtitle */}
      <p
        className="about-hero-sub"
        style={{
          position: "relative",
          zIndex: 2,
          fontSize: "clamp(13px, 1.3vw, 16px)",
          fontWeight: 300,
          letterSpacing: "0.05em",
          color: "rgba(229,224,198,0.48)",
          textAlign: "center",
          maxWidth: 520,
          lineHeight: 1.9,
          marginBottom: 60,
        }}
      >
        {t("aboutPage.hero.subtitle")}
      </p>

      {/* ── Stat pills row ── */}
      <div
        className="about-hero-stats"
        style={{
          position: "relative",
          zIndex: 2,
          display: "flex",
          gap: "clamp(20px, 4vw, 64px)",
          alignItems: "center",
          justifyContent: "center",
          flexWrap: "wrap",
          marginBottom: 56,
        }}
      >
        {pillStats.map((s, i) => (
          <React.Fragment key={i}>
            {i > 0 && (
              <div
                style={{
                  width: 1,
                  height: 44,
                  background: "rgba(229,224,198,0.12)",
                  flexShrink: 0,
                }}
              />
            )}
            <div style={{ textAlign: "center" }}>
              <div
                style={{
                  fontSize: "clamp(26px, 3.2vw, 42px)",
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
                {s.suffix && (
                  <span
                    style={{
                      fontSize: "0.55em",
                      fontWeight: 700,
                      opacity: 0.8,
                    }}
                  >
                    {s.suffix}
                  </span>
                )}
              </div>
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: "rgba(229,224,198,0.38)",
                  letterSpacing: "0.2em",
                  textTransform: "uppercase",
                  marginTop: 5,
                }}
              >
                {s.label}
              </div>
            </div>
          </React.Fragment>
        ))}
      </div>

      {/* ── Meta tags strip ── */}
      <div
        className="about-hero-meta"
        style={{
          position: "relative",
          zIndex: 2,
          display: "flex",
          gap: 12,
          flexWrap: "wrap",
          justifyContent: "center",
        }}
      >
        {(t("aboutPage.hero.tags", { returnObjects: true }) as string[]).map(
          (tag: string) => (
            <div
              key={tag}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "9px 20px",
                borderRadius: 999,
                background: "rgba(255,255,255,0.035)",
                border: "1px solid rgba(229,224,198,0.1)",
                fontSize: 11,
                fontWeight: 600,
                color: "rgba(229,224,198,0.5)",
                backdropFilter: "blur(8px)",
                letterSpacing: "0.08em",
              }}
            >
              <span
                style={{
                  width: 5,
                  height: 5,
                  borderRadius: "50%",
                  background: GOLD,
                  display: "inline-block",
                  opacity: 0.7,
                  boxShadow: `0 0 6px ${GOLD}`,
                  flexShrink: 0,
                }}
              />
              {tag}
            </div>
          ),
        )}
      </div>

      {/* ── Scroll cue ── */}
      <div
        className="about-scroll-cue"
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
          style={{
            display: "block",
            width: 1,
            height: 44,
            background: `linear-gradient(to bottom, transparent, ${GOLD}66)`,
            borderRadius: 999,
            animation: "aboutScrollPulse 2.8s ease-in-out 1.8s infinite",
          }}
        />
        <span
          style={{
            fontSize: 8.5,
            fontWeight: 200,
            letterSpacing: "0.38em",
            textTransform: "uppercase",
            color: "rgba(229,224,198,0.28)",
          }}
        >
          {t("aboutPage.hero.scroll")}
        </span>
      </div>
    </section>
  );
}

// ══════════════════════════════════════════════════════════════
// MAIN PAGE EXPORT
// ══════════════════════════════════════════════════════════════
export default function AboutUs() {
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,700;1,700;1,900&family=Jost:wght@200;300;400;600;700;800&display=swap');

        * { box-sizing: border-box; }

        .about-page {
          font-family: 'Jost', 'Helvetica Neue', sans-serif;
          background: #0a0a1a;
          min-height: 100vh;
          color: rgb(229,224,198);
          overflow-x: hidden;
        }

        /* ── Grain overlay ── */
        .about-grain {
          position: absolute;
          inset: 0;
          z-index: 1;
          opacity: 0.022;
          pointer-events: none;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
          background-size: 200px 200px;
        }

        /* ── Hero word wrapper ── */
        .about-hero-word {
          overflow: hidden;
          line-height: 0.92;
          position: relative;
          z-index: 2;
        }

        /* ── Staggered slide-up animations ── */
        @keyframes aboutSlideUp {
          from { opacity: 0; transform: translateY(64px) skewY(1.8deg); }
          to   { opacity: 1; transform: translateY(0) skewY(0deg); }
        }
        @keyframes aboutFadeUp {
          from { opacity: 0; transform: translateY(26px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes aboutScrollPulse {
          0%,100% { transform: scaleY(1); opacity: 0.5; }
          50%      { transform: scaleY(1.25); opacity: 1; }
        }
        @keyframes aboutGoldPulse {
          0%,100% { opacity: 0.35; transform: scale(1); }
          50%      { opacity: 0.6; transform: scale(1.07); }
        }
        @keyframes aboutOrbit {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes aboutShimmer {
          0%   { transform: translateX(-120%) skewX(-18deg); opacity: 0; }
          30%  { opacity: 1; }
          100% { transform: translateX(200%) skewX(-18deg); opacity: 0; }
        }

        .about-w1 {
          animation: aboutSlideUp 1.2s cubic-bezier(0.22,1,0.36,1) 0.18s both;
        }
        .about-w2 {
          animation: aboutSlideUp 1.2s cubic-bezier(0.22,1,0.36,1) 0.36s both;
        }
        .about-hero-eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 30px;
          position: relative;
          z-index: 2;
          animation: aboutFadeUp 0.9s ease 0.7s both;
        }
        .about-hero-sub {
          animation: aboutFadeUp 0.9s ease 0.88s both;
        }
        .about-hero-stats {
          animation: aboutFadeUp 0.9s ease 1.1s both;
        }
        .about-hero-meta {
          animation: aboutFadeUp 0.9s ease 1.28s both;
        }
        .about-scroll-cue {
          animation: aboutFadeUp 0.9s ease 1.55s both;
        }

        /* ── Responsive ── */
        @media (max-width: 640px) {
          .about-hero-text {
            font-size: clamp(60px, 20vw, 90px) !important;
          }
        }
      `}</style>

      <div className="about-page">
        {/* ── Hero header ── */}
        <AboutHero />

        {/* Future sections will be imported and placed here */}
        <AboutPlatform />
        <AboutProblem />
        <AboutSolution />
        <AboutFeatures />
        <AboutVisionMission />
      </div>
    </>
  );
}
