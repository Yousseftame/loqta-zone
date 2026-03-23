import React, { useRef, useState, useEffect } from "react";
import { useTranslation } from "react-i18next";

const GOLD = "#c9a96e";
const GOLD2 = "#b8944e";
const NAVY = "#2A4863";
const NAVY2 = "#1e3652";
const CREAM = "rgb(229, 224, 198)";

function useInView(
  ref: React.RefObject<HTMLDivElement | null>,
  threshold = 0.08,
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

// ── Per-feature config ────────────────────────────────────────
const FEATURE_KEYS = ["realtime", "secure", "variety", "design"] as const;
type FeatureKey = (typeof FEATURE_KEYS)[number];

// Large abstract typographic glyphs — pure CSS geometry, no icons
const GLYPHS: Record<FeatureKey, React.ReactNode> = {
  realtime: (
    // Lightning — two diagonal bars forming a bolt shape
    <svg
      viewBox="0 0 60 60"
      fill="none"
      style={{ width: "100%", height: "100%" }}
    >
      <path
        d="M36 4 L18 34 H30 L24 56 L46 26 H33 L36 4Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  ),
  secure: (
    // Shield outline — minimal
    <svg
      viewBox="0 0 60 60"
      fill="none"
      style={{ width: "100%", height: "100%" }}
    >
      <path
        d="M30 6 L50 14 L50 30 C50 41 40 50 30 54 C20 50 10 41 10 30 L10 14 Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
        fill="none"
      />
      <path
        d="M22 30 L27 35 L38 24"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  ),
  variety: (
    // 2×2 grid of squares — catalogue
    <svg
      viewBox="0 0 60 60"
      fill="none"
      style={{ width: "100%", height: "100%" }}
    >
      <rect
        x="8"
        y="8"
        width="20"
        height="20"
        rx="3"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="none"
      />
      <rect
        x="32"
        y="8"
        width="20"
        height="20"
        rx="3"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="none"
      />
      <rect
        x="8"
        y="32"
        width="20"
        height="20"
        rx="3"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="none"
      />
      <rect
        x="32"
        y="32"
        width="20"
        height="20"
        rx="3"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="none"
      />
    </svg>
  ),
  design: (
    // Cursor / hand pointer — minimal
    <svg
      viewBox="0 0 60 60"
      fill="none"
      style={{ width: "100%", height: "100%" }}
    >
      <path
        d="M22 8 L22 36 L29 30 L34 42 L38 40 L33 28 L42 28 Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  ),
};

// ── Single feature tile ───────────────────────────────────────
function FeatureTile({
  featureKey,
  index,
  visible,
  isActive,
  onClick,
}: {
  featureKey: FeatureKey;
  index: number;
  visible: boolean;
  isActive: boolean;
  onClick: () => void;
}) {
  const { t } = useTranslation();
  const [hovered, setHovered] = useState(false);

  const lit = isActive || hovered;

  // Stagger delay per tile — zigzag: 0,2 top row, 1,3 bottom
  const staggerOrder = [0, 2, 1, 3][index];
  const delay = 0.12 + staggerOrder * 0.13;

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible
          ? lit
            ? "translateY(-6px) scale(1.015)"
            : "translateY(0) scale(1)"
          : `translateY(${44 + index * 10}px) scale(0.97)`,
        transition: [
          `opacity 0.8s cubic-bezier(0.22,1,0.36,1) ${delay}s`,
          `transform 0.65s cubic-bezier(0.22,1,0.36,1) ${visible ? "0s" : `${delay}s`}`,
          "box-shadow 0.45s ease",
          "border-color 0.4s ease",
          "background 0.4s ease",
        ].join(", "),
        position: "relative",
        borderRadius: 24,
        background: lit ? "rgba(255,255,255,0.055)" : "rgba(255,255,255,0.024)",
        border: `1px solid ${lit ? "rgba(201,169,110,0.32)" : "rgba(229,224,198,0.07)"}`,
        boxShadow: lit
          ? "0 28px 72px rgba(0,0,0,0.48), inset 0 1px 0 rgba(255,255,255,0.06)"
          : "0 4px 28px rgba(0,0,0,0.2)",
        backdropFilter: "blur(16px)",
        cursor: "pointer",
        overflow: "hidden",
        padding: "42px 36px 36px",
        display: "flex",
        flexDirection: "column",
        gap: 0,
      }}
    >
      {/* ── Top accent line ── */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: lit ? "5%" : "30%",
          right: lit ? "5%" : "30%",
          height: 2,
          background: `linear-gradient(90deg, transparent, rgba(201,169,110,${lit ? 0.85 : 0.32}), transparent)`,
          borderRadius: 999,
          transition:
            "left 0.55s cubic-bezier(0.22,1,0.36,1), right 0.55s cubic-bezier(0.22,1,0.36,1), background 0.4s ease",
        }}
      />

      {/* ── Corner atmospheric glow ── */}
      <div
        style={{
          position: "absolute",
          top: -60,
          right: -60,
          width: 180,
          height: 180,
          borderRadius: "50%",
          background: `radial-gradient(circle, rgba(201,169,110,${lit ? 0.1 : 0.04}) 0%, transparent 70%)`,
          pointerEvents: "none",
          transition: "background 0.5s ease",
        }}
      />

      {/* ── Shimmer sweep on hover ── */}
      {lit && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(105deg, transparent 35%, rgba(201,169,110,0.07) 50%, transparent 65%)",
            animation: "featShimmer 2s ease 0.1s infinite",
            pointerEvents: "none",
          }}
        />
      )}

      {/* ── Glyph area ── */}
      <div
        style={{
          width: 52,
          height: 52,
          marginBottom: 28,
          color: lit ? GOLD : "rgba(201,169,110,0.35)",
          transition: "color 0.4s ease",
          filter: lit ? `drop-shadow(0 0 8px rgba(201,169,110,0.4))` : "none",
          flexShrink: 0,
        }}
      >
        {GLYPHS[featureKey]}
      </div>

      {/* ── Feature number — italic serif ── */}
      <div
        style={{
          fontSize: 15,
          fontWeight: 800,
          color: lit ? "rgba(201,169,110,0.8)" : "rgba(201,169,110,0.78)",
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          fontFamily: "'Cormorant Garamond', Georgia, serif",
          fontStyle: "italic",
          marginBottom: 12,
          transition: "color 0.35s ease",
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <div
          style={{
            width: lit ? 22 : 12,
            height: 1,
            background: "linear-gradient(90deg, #c9a96e, transparent)",
            transition: "width 0.4s cubic-bezier(0.22,1,0.36,1)",
            flexShrink: 0,
          }}
        />
        {t(`aboutPage.features.items.${featureKey}.label`)}
      </div>

      {/* ── Title ── */}
      <h3
        style={{
          margin: "0 0 16px",
          fontFamily: "'Cormorant Garamond', Georgia, serif",
          fontSize: "clamp(22px, 2.2vw, 28px)",
          fontWeight: 700,
          fontStyle: "italic",
          color: lit ? CREAM : "rgba(229,224,198,0.82)",
          letterSpacing: "-0.018em",
          lineHeight: 1.12,
          transition: "color 0.35s ease",
        }}
      >
        {t(`aboutPage.features.items.${featureKey}.title`)}
      </h3>

      {/* ── Gold rule ── */}
      <div
        style={{
          width: lit ? 44 : 24,
          height: 1,
          background: "linear-gradient(90deg, #c9a96e, transparent)",
          marginBottom: 18,
          transition: "width 0.45s cubic-bezier(0.22,1,0.36,1)",
        }}
      />

      {/* ── Body ── */}
      <p
        style={{
          margin: 0,
          flex: 1,
          fontSize: "clamp(12.5px, 1vw, 20px)",
          fontWeight: 300,
          color: lit ? "rgba(229,224,198,0.98)" : "rgba(229,224,198,0.96)",
          lineHeight: 1.9,
          letterSpacing: "0.005em",
          transition: "color 0.35s ease",
        }}
      >
        {t(`aboutPage.features.items.${featureKey}.body`)}
      </p>

      {/* ── Watermark index number ── */}
      <div
        style={{
          position: "absolute",
          bottom: -10,
          right: 20,
          fontFamily: "'Cormorant Garamond', Georgia, serif",
          fontSize: 100,
          fontWeight: 700,
          fontStyle: "italic",
          color: "transparent",
          WebkitTextStroke: `1px rgba(201,169,110,${lit ? 0.11 : 0.055})`,
          userSelect: "none",
          pointerEvents: "none",
          lineHeight: 1,
          transition: "all 0.5s ease",
        }}
      >
        {String(index + 1).padStart(2, "0")}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════
export default function AboutFeatures() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const visible = useInView(sectionRef, 0.06);
  const [activeFeature, setActiveFeature] = useState<FeatureKey | null>(null);
  const { t } = useTranslation();

  // Pulse through features on load for 1 cycle, then stop
  useEffect(() => {
    if (!visible) return;
    let idx = 0;
    const id = setInterval(() => {
      setActiveFeature(FEATURE_KEYS[idx]);
      idx++;
      if (idx >= FEATURE_KEYS.length) {
        clearInterval(id);
        setTimeout(() => setActiveFeature(null), 700);
      }
    }, 320);
    return () => clearInterval(id);
  }, [visible]);

  return (
    <>
      <style>{`
        @keyframes featFadeUp {
          from { opacity: 0; transform: translateY(28px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes featShimmer {
          0%   { transform: translateX(-130%) skewX(-12deg); opacity: 0; }
          20%  { opacity: 1; }
          100% { transform: translateX(230%) skewX(-12deg); opacity: 0; }
        }
        @keyframes featLineGrow {
          from { width: 0; }
          to   { width: 100%; }
        }
        @keyframes featPulseRing {
          0%   { transform: translate(-50%,-50%) scale(0.94); opacity: 0.6; }
          50%  { transform: translate(-50%,-50%) scale(1.04); opacity: 0.35; }
          100% { transform: translate(-50%,-50%) scale(0.94); opacity: 0.6; }
        }

        /* 2×2 grid */
        .feat-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          max-width: 1100px;
          margin: 0 auto;
        }
        @media (max-width: 640px) {
          .feat-grid { grid-template-columns: 1fr !important; }
        }

        /* Central divider cross */
        .feat-cross-h {
          position: absolute;
          top: 50%;
          left: 5%;
          right: 5%;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(201,169,110,0.08), rgba(201,169,110,0.08), transparent);
          pointer-events: none;
          transform: translateY(-50%);
        }
        .feat-cross-v {
          position: absolute;
          left: 50%;
          top: 5%;
          bottom: 5%;
          width: 1px;
          background: linear-gradient(to bottom, transparent, rgba(201,169,110,0.08), rgba(201,169,110,0.08), transparent);
          pointer-events: none;
          transform: translateX(-50%);
        }
      `}</style>

      <section
        ref={sectionRef}
        style={{
          position: "relative",
          background: "linear-gradient(180deg,#224266 0%,#1f2a3d 100%)",  
          padding: "120px 32px 130px",
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
            background: `linear-gradient(90deg, transparent, ${GOLD}, rgba(229,224,198,0.5), ${GOLD}, transparent)`,
            opacity: 0.3,
          }}
        />

        {/* Background atmosphere */}
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
          {/* Central soft glow */}
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%,-50%)",
              width: 1100,
              height: 700,
              borderRadius: "50%",
              background:
                "radial-gradient(ellipse, rgba(42,72,99,0.17) 0%, transparent 65%)",
              animation: "featPulseRing 9s ease-in-out infinite",
            }}
          />
          {/* Gold top-left accent */}
          <div
            style={{
              position: "absolute",
              top: "6%",
              left: "3%",
              width: 360,
              height: 360,
              borderRadius: "50%",
              background:
                "radial-gradient(circle, rgba(201,169,110,0.06) 0%, transparent 70%)",
            }}
          />
          {/* Rings */}
          {[340, 600, 880].map((sz, i) => (
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
                border: `1px solid rgba(201,169,110,${0.048 - i * 0.011})`,
              }}
            />
          ))}
        </div>

        {/* ── HEADER ── */}
        <div
          style={{
            textAlign: "center",
            marginBottom: 88,
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
                background: `linear-gradient(90deg, transparent, ${GOLD})`,
              }}
            />
            <span
              style={{
                fontSize: 15,
                fontWeight: 800,
                color: GOLD,
                letterSpacing: "0.02em",
                textTransform: "uppercase",
              }}
            >
              {t("aboutPage.features.eyebrow")}
            </span>
            <div
              style={{
                width: 36,
                height: 1,
                background: `linear-gradient(90deg, ${GOLD}, transparent)`,
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
                  ? "featFadeUp 1s cubic-bezier(0.22,1,0.36,1) 0.08s both"
                  : "none",
              }}
            >
              {t("aboutPage.features.titleLine1")}
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
                WebkitTextStroke: `1.5px ${GOLD}`,
                letterSpacing: "-0.022em",
                lineHeight: 1,
                animation: visible
                  ? "featFadeUp 1s cubic-bezier(0.22,1,0.36,1) 0.2s both"
                  : "none",
              }}
            >
              {t("aboutPage.features.titleLine2")}
            </h2>
          </div>

          {/* Description */}
          <p
            style={{
              margin: "0 auto",
              maxWidth: 500,
              fontSize: "clamp(13px, 1.1vw, 18px)",
              fontWeight: 300,
              color: "rgba(229,224,198,0.92)",
              lineHeight: 1.9,
              letterSpacing: "0.03em",
              animation: visible ? "featFadeUp 0.9s ease 0.34s both" : "none",
            }}
          >
            {t("aboutPage.features.description")}
          </p>
        </div>

        {/* ── 2×2 GRID ── */}
        <div style={{ position: "relative", zIndex: 1 }}>
          {/* Ghost cross dividers */}
          <div
            style={{ position: "relative", maxWidth: 1100, margin: "0 auto" }}
          >
            <div className="feat-cross-h" />
            <div className="feat-cross-v" />
          </div>

          <div className="feat-grid">
            {FEATURE_KEYS.map((key, idx) => (
              <FeatureTile
                key={key}
                featureKey={key}
                index={idx}
                visible={visible}
                isActive={activeFeature === key}
                onClick={() =>
                  setActiveFeature(activeFeature === key ? null : key)
                }
              />
            ))}
          </div>
        </div>

        {/* ── BOTTOM EDITORIAL STRIP ── */}
        <div
          style={{
            maxWidth: 1100,
            margin: "72px auto 0",
            position: "relative",
            zIndex: 1,
            opacity: visible ? 1 : 0,
            transition: "opacity 0.9s ease 0.65s",
          }}
        >
          {/* Thin full-width rule */}
          <div
            style={{
              height: 1,
              background:
                "linear-gradient(90deg, transparent, rgba(229,224,198,0.08), rgba(229,224,198,0.08), transparent)",
              marginBottom: 28,
            }}
          />

          {/* Four-column label strip */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: 0,
            }}
          >
            {FEATURE_KEYS.map((key, idx) => (
              <div
                key={key}
                onClick={() =>
                  setActiveFeature(activeFeature === key ? null : key)
                }
                style={{
                  padding: "0 24px",
                  borderRight:
                    idx < 3 ? "1px solid rgba(229,224,198,0.06)" : "none",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                {/* Active dot */}
                <div
                  style={{
                    width: 5,
                    height: 5,
                    borderRadius: "50%",
                    flexShrink: 0,
                    background:
                      activeFeature === key ? GOLD : "rgba(201,169,110,0.22)",
                    boxShadow:
                      activeFeature === key
                        ? `0 0 8px rgba(201,169,110,0.7)`
                        : "none",
                    transition: "all 0.4s ease",
                  }}
                />
                <span
                  style={{
                    fontSize: 14,
                    fontWeight: 700,
                    color:
                      activeFeature === key
                        ? "rgba(229,224,198,0.95)"
                        : "rgba(229,224,198,0.62)",
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    transition: "color 0.35s ease",
                    fontFamily: "'Jost', sans-serif",
                  }}
                >
                  {t(`aboutPage.features.items.${key}.title`)}
                </span>
              </div>
            ))}
          </div>

          {/* Bottom ornament */}
          <div
            style={{
              marginTop: 40,
              display: "flex",
              alignItems: "center",
              gap: 16,
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
        </div>
      </section>
    </>
  );
}
