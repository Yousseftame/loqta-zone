import React, { useRef, useState, useEffect } from "react";
import { useTranslation } from "react-i18next";

// ── Design tokens ─────────────────────────────────────────────
const GOLD = "#c9a96e";
const GOLD2 = "#b8944e";
const NAVY = "#2A4863";
const NAVY2 = "#1e3652";
const CREAM = "rgb(229, 224, 198)";

// ── useInView ─────────────────────────────────────────────────
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

// ── Per-card accent config ────────────────────────────────────
const CARD_META = [
  { numeral: "I", accentOpacity: "0.72", tintOpacity: "0.055" },
  { numeral: "II", accentOpacity: "0.58", tintOpacity: "0.042" },
  { numeral: "III", accentOpacity: "0.46", tintOpacity: "0.032" },
] as const;

const CARD_KEYS = ["transparency", "trust", "static"] as const;
type CardKey = (typeof CARD_KEYS)[number];

// ── Single problem card ───────────────────────────────────────
function ProblemCard({ index, visible }: { index: number; visible: boolean }) {
  const { t } = useTranslation();
  const [hovered, setHovered] = useState(false);
  const meta = CARD_META[index];
  const key: CardKey = CARD_KEYS[index];

  const accentColor = `rgba(201,169,110,${meta.accentOpacity})`;
  const tintColor = `rgba(201,169,110,${meta.tintOpacity})`;

  // Staggered entrance — controlled entirely by inline style
  const entranceStyle: React.CSSProperties = {
    opacity: visible ? 1 : 0,
    transform: visible
      ? hovered
        ? "translateY(-8px)"
        : "translateY(0)"
      : `translateY(${52 + index * 14}px)`,
    transition: [
      `opacity 0.85s cubic-bezier(0.22,1,0.36,1) ${0.18 + index * 0.15}s`,
      `transform 0.85s cubic-bezier(0.22,1,0.36,1) ${visible ? "0s" : `${0.18 + index * 0.15}s`}`,
      `box-shadow 0.45s ease`,
      `border-color 0.4s ease`,
      `background 0.4s ease`,
    ].join(", "),
  };

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        ...entranceStyle,
        position: "relative",
        borderRadius: 22,
        background: hovered
          ? "rgba(255,255,255,0.055)"
          : "rgba(255,255,255,0.026)",
        border: `1px solid ${hovered ? "rgba(201,169,110,0.28)" : "rgba(229,224,198,0.075)"}`,
        backdropFilter: "blur(18px)",
        boxShadow: hovered
          ? "0 32px 80px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06), 0 0 0 1px rgba(201,169,110,0.10)"
          : "0 4px 32px rgba(0,0,0,0.22)",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        padding: "44px 40px 38px",
        cursor: "default",
      }}
    >
      {/* Top accent line */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: hovered ? "6%" : "28%",
          right: hovered ? "6%" : "28%",
          height: 2,
          background: `linear-gradient(90deg, transparent, ${accentColor}, transparent)`,
          borderRadius: 999,
          opacity: hovered ? 0.95 : 0.38,
          transition:
            "left 0.55s cubic-bezier(0.22,1,0.36,1), right 0.55s cubic-bezier(0.22,1,0.36,1), opacity 0.4s ease",
        }}
      />

      {/* Corner radial glow */}
      <div
        style={{
          position: "absolute",
          top: -72,
          right: -72,
          width: 230,
          height: 230,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${tintColor} 0%, transparent 70%)`,
          pointerEvents: "none",
          transition: "opacity 0.5s ease",
          opacity: hovered ? 1.8 : 1,
        }}
      />

      {/* Watermark numeral */}
      <div
        style={{
          position: "absolute",
          bottom: -14,
          right: 26,
          fontFamily: "'Cormorant Garamond', Georgia, serif",
          fontSize: 108,
          fontWeight: 700,
          fontStyle: "italic",
          color: "transparent",
          WebkitTextStroke: `1px rgba(201,169,110,${hovered ? 0.13 : 0.065})`,
          userSelect: "none",
          pointerEvents: "none",
          lineHeight: 1,
          transition: "all 0.5s ease",
        }}
      >
        {meta.numeral}
      </div>

      {/* Eyebrow / label */}
      <div
        style={{
          fontSize: 15,
          fontWeight: 700,
          color: hovered ? "rgba(201,169,110,0.85)" : "rgba(201,169,110,0.76)",
          letterSpacing: "0.2em",
          textTransform: "uppercase",
          fontFamily: "'Cormorant Garamond', Georgia, serif",
          fontStyle: "italic",
          marginBottom: 18,
          transition: "color 0.35s ease",
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <div
          style={{
            width: hovered ? 28 : 16,
            height: 1,
            background: "linear-gradient(90deg, #c9a96e, transparent)",
            transition: "width 0.4s cubic-bezier(0.22,1,0.36,1)",
            flexShrink: 0,
          }}
        />
        {t(`aboutPage.problem.cards.${key}.label`)}
      </div>

      {/* Title */}
      <h3
        style={{
          margin: "0 0 20px",
          fontFamily: "'Cormorant Garamond', Georgia, serif",
          fontSize: "clamp(24px, 2.4vw, 32px)",
          fontWeight: 700,
          fontStyle: "italic",
          color: hovered ? CREAM : "rgba(229,224,198,0.85)",
          letterSpacing: "-0.018em",
          lineHeight: 1.12,
          transition: "color 0.35s ease",
        }}
      >
        {t(`aboutPage.problem.cards.${key}.title`)}
      </h3>

      {/* Gold rule */}
      <div
        style={{
          width: hovered ? 52 : 32,
          height: 1,
          background: "linear-gradient(90deg, #c9a96e, transparent)",
          marginBottom: 22,
          transition: "width 0.45s cubic-bezier(0.22,1,0.36,1)",
        }}
      />

      {/* Body */}
      <p
        style={{
          margin: 0,
          flex: 1,
          fontSize: "clamp(13px, 1.05vw, 17.5px)",
          fontWeight: 300,
          color: hovered ? "rgba(229,224,198,0.62)" : "rgba(229,224,198,0.8)",
          lineHeight: 1.92,
          letterSpacing: "0.025em",
          transition: "color 0.35s ease",
        }}
      >
        {t(`aboutPage.problem.cards.${key}.body`)}
      </p>

      {/* Bottom connector trail */}
      <div
        style={{
          marginTop: 32,
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <div
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            flexShrink: 0,
            background: hovered ? GOLD : "rgba(201,169,110,0.25)",
            boxShadow: hovered ? "0 0 10px rgba(201,169,110,0.65)" : "none",
            transition: "background 0.4s ease, box-shadow 0.4s ease",
          }}
        />
        <div
          style={{
            flex: 1,
            height: 1,
            background: hovered
              ? "linear-gradient(90deg, rgba(201,169,110,0.45), transparent)"
              : "rgba(229,224,198,0.055)",
            transition: "background 0.4s ease",
          }}
        />
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════
export default function AboutProblem() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const visible = useInView(sectionRef, 0.07);
  const { t } = useTranslation();

  return (
    <>
      <style>{`
        @keyframes probFadeUp {
          from { opacity: 0; transform: translateY(30px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        .prob-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
          max-width: 1100px;
          margin: 0 auto;
          align-items: stretch;
        }
        @media (max-width: 900px) {
          .prob-grid { grid-template-columns: 1fr 1fr !important; }
        }
        @media (max-width: 560px) {
          .prob-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      <section
        ref={sectionRef}
        style={{
          position: "relative",
          background: "linear-gradient(180deg,#224266 0%,#1f2a3d 100%)",
          padding: "110px 32px 120px",
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
            background:
              "linear-gradient(90deg, transparent, #c9a96e, rgba(229,224,198,0.5), #c9a96e, transparent)",
            opacity: 0.28,
          }}
        />

        {/* Background atmosphere */}
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
          <div
            style={{
              position: "absolute",
              top: "38%",
              left: "50%",
              transform: "translate(-50%,-50%)",
              width: 1100,
              height: 660,
              borderRadius: "50%",
              background:
                "radial-gradient(ellipse, rgba(30,54,82,0.17) 0%, transparent 65%)",
            }}
          />
          <div
            style={{
              position: "absolute",
              bottom: "8%",
              left: "2%",
              width: 380,
              height: 380,
              borderRadius: "50%",
              background:
                "radial-gradient(circle, rgba(201,169,110,0.05) 0%, transparent 70%)",
            }}
          />
          {[280, 500, 760].map((sz, i) => (
            <div
              key={i}
              style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%,-50%)",
                width: sz,
                height: sz,
                borderRadius: "50%",
                border: `1px solid rgba(201,169,110,${0.048 - i * 0.012})`,
              }}
            />
          ))}
        </div>

        {/* Section header */}
        <div
          style={{
            textAlign: "center",
            marginBottom: 80,
            position: "relative",
            zIndex: 1,
            opacity: visible ? 1 : 0,
            transform: visible ? "translateY(0)" : "translateY(30px)",
            transition:
              "opacity 0.8s cubic-bezier(0.22,1,0.36,1), transform 0.8s cubic-bezier(0.22,1,0.36,1)",
          }}
        >
          {/* Eyebrow */}
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 12,
              marginBottom: 22,
            }}
          >
            <div
              style={{
                width: 36,
                height: 1,
                background: "linear-gradient(90deg, transparent, #c9a96e)",
              }}
            />
            <span
              style={{
                fontSize: 15,
                fontWeight: 800,
                color: GOLD,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
              }}
            >
              {t("aboutPage.problem.eyebrow")}
            </span>
            <div
              style={{
                width: 36,
                height: 1,
                background: "linear-gradient(90deg, #c9a96e, transparent)",
              }}
            />
          </div>

          {/* Title line 1 */}
          <div style={{ overflow: "hidden", marginBottom: 6 }}>
            <h2
              style={{
                margin: 0,
                fontFamily: "'Cormorant Garamond', Georgia, serif",
                fontSize: "clamp(36px, 5.5vw, 64px)",
                fontWeight: 700,
                fontStyle: "italic",
                color: CREAM,
                letterSpacing: "-0.022em",
                lineHeight: 1,
                animation: visible
                  ? "probFadeUp 1s cubic-bezier(0.22,1,0.36,1) 0.08s both"
                  : "none",
              }}
            >
              {t("aboutPage.problem.titleLine1")}
            </h2>
          </div>

          {/* Title line 2 — gold outline */}
          <div style={{ overflow: "hidden", marginBottom: 26 }}>
            <h2
              style={{
                margin: 0,
                fontFamily: "'Cormorant Garamond', Georgia, serif",
                fontSize: "clamp(36px, 5.5vw, 64px)",
                fontWeight: 700,
                fontStyle: "italic",
                color: "transparent",
                WebkitTextStroke: "1.5px #c9a96e",
                letterSpacing: "-0.022em",
                lineHeight: 1,
                animation: visible
                  ? "probFadeUp 1s cubic-bezier(0.22,1,0.36,1) 0.2s both"
                  : "none",
              }}
            >
              {t("aboutPage.problem.titleLine2")}
            </h2>
          </div>

          {/* Description */}
          <p
            style={{
              margin: "0 auto",
              maxWidth: 500,
              fontSize: "clamp(13px, 1.15vw, 17px)",
              fontWeight: 300,
              color: "rgba(229,224,198,0.82)",
              lineHeight: 1.9,
              letterSpacing: "0.01em",
              animation: visible ? "probFadeUp 0.9s ease 0.34s both" : "none",
            }}
          >
            {t("aboutPage.problem.description")}
          </p>
        </div>

        {/* Cards */}
        <div className="prob-grid" style={{ position: "relative", zIndex: 1 }}>
          {[0, 1, 2].map((i) => (
            <ProblemCard key={i} index={i} visible={visible} />
          ))}
        </div>

        {/* Bottom divider */}
        <div
          style={{
            maxWidth: 1100,
            margin: "72px auto 0",
            display: "flex",
            alignItems: "center",
            gap: 16,
            opacity: visible ? 1 : 0,
            transition: "opacity 0.8s ease 0.7s",
          }}
        >
          <div
            style={{
              flex: 1,
              height: 1,
              background:
                "linear-gradient(90deg, transparent, rgba(229,224,198,0.07))",
            }}
          />
          <span
            style={{
              fontFamily: "'Cormorant Garamond', Georgia, serif",
              fontSize: 18,
              color: "rgba(201,169,110,0.38)",
              fontStyle: "italic",
            }}
          >
            ✦
          </span>
          <div
            style={{
              flex: 1,
              height: 1,
              background:
                "linear-gradient(90deg, rgba(229,224,198,0.07), transparent)",
            }}
          />
        </div>
      </section>
    </>
  );
}
