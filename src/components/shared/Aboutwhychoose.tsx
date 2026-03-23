import React, { useRef, useState, useEffect } from "react";
import { useTranslation } from "react-i18next";

// ── Design tokens ─────────────────────────────────────────────
const GOLD = "#c9a96e";
const GOLD2 = "#b8944e";
const CREAM = "rgb(229, 224, 198)";

// ── useInView ─────────────────────────────────────────────────
function useInView(
  ref: React.RefObject<HTMLDivElement | null>,
  threshold = 0.06,
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

// ── useIsMobile ───────────────────────────────────────────────
function useIsMobile() {
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const handler = (e: MediaQueryListEvent) => setMobile(e.matches);
    setMobile(mq.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return mobile;
}

// ── Config ────────────────────────────────────────────────────
const REASONS = ["thrill", "value", "trust", "convenience"] as const;
type Reason = (typeof REASONS)[number];
const REASON_NUMERALS = ["I", "II", "III", "IV"];

// ── Unique architectural SVG icons ────────────────────────────
const ICONS: Record<Reason, React.ReactNode> = {
  thrill: (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      style={{ width: "100%", height: "100%" }}
    >
      <path
        d="M38 6L18 36h16L22 58 46 26H30L38 6Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <circle cx="38" cy="6" r="2" fill="currentColor" opacity="0.5" />
      <circle cx="22" cy="58" r="2" fill="currentColor" opacity="0.5" />
    </svg>
  ),
  value: (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      style={{ width: "100%", height: "100%" }}
    >
      <polygon
        points="32,6 54,26 32,58 10,26"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <polygon
        points="32,6 54,26 10,26"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinejoin="round"
        opacity="0.35"
      />
      <line
        x1="10"
        y1="26"
        x2="54"
        y2="26"
        stroke="currentColor"
        strokeWidth="1"
        opacity="0.35"
      />
    </svg>
  ),
  trust: (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      style={{ width: "100%", height: "100%" }}
    >
      <path
        d="M32 6L52 14v18c0 13-10 22-20 26C22 54 12 45 12 32V14Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path
        d="M23 32l6 6 12-13"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
  convenience: (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      style={{ width: "100%", height: "100%" }}
    >
      <circle cx="32" cy="32" r="22" stroke="currentColor" strokeWidth="1.4" />
      <ellipse
        cx="32"
        cy="32"
        rx="10"
        ry="22"
        stroke="currentColor"
        strokeWidth="1"
        opacity="0.4"
      />
      <line
        x1="10"
        y1="32"
        x2="54"
        y2="32"
        stroke="currentColor"
        strokeWidth="1"
        opacity="0.4"
      />
      <line
        x1="14"
        y1="20"
        x2="50"
        y2="20"
        stroke="currentColor"
        strokeWidth="1"
        opacity="0.25"
      />
      <line
        x1="14"
        y1="44"
        x2="50"
        y2="44"
        stroke="currentColor"
        strokeWidth="1"
        opacity="0.25"
      />
    </svg>
  ),
};

// ─────────────────────────────────────────────────────────────
// DESKTOP PANEL — tall vertical, hover-to-reveal
// ─────────────────────────────────────────────────────────────
function DesktopPanel({
  reason,
  index,
  visible,
  isActive,
  onEnter,
  onLeave,
  totalCount,
}: {
  reason: Reason;
  index: number;
  visible: boolean;
  isActive: boolean;
  onEnter: () => void;
  onLeave: () => void;
  totalCount: number;
}) {
  const { t } = useTranslation();
  const delay = 0.1 + index * 0.13;

  return (
    <div
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      style={{
        position: "relative",
        flex: 1,
        minHeight: "clamp(320px, 42vw, 500px)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-end",
        cursor: "pointer",
        overflow: "hidden",
        borderRight:
          index < totalCount - 1 ? "1px solid rgba(229,224,198,0.06)" : "none",
        opacity: visible ? 1 : 0,
        transform: visible
          ? "translateY(0) scaleY(1)"
          : "translateY(60px) scaleY(0.92)",
        transition: [
          `opacity 0.9s cubic-bezier(0.22,1,0.36,1) ${delay}s`,
          `transform 0.9s cubic-bezier(0.22,1,0.36,1) ${delay}s`,
        ].join(", "),
      }}
    >
      {/* Hover fill */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: isActive
            ? "linear-gradient(180deg, rgba(201,169,110,0.07) 0%, rgba(201,169,110,0.025) 100%)"
            : "transparent",
          transition: "background 0.55s ease",
        }}
      />

      {/* Top glow bar */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: isActive ? 0 : "50%",
          right: isActive ? 0 : "50%",
          height: 2,
          background: `linear-gradient(90deg, transparent, ${GOLD}, transparent)`,
          opacity: isActive ? 0.9 : 0,
          transition:
            "left 0.55s cubic-bezier(0.22,1,0.36,1), right 0.55s cubic-bezier(0.22,1,0.36,1), opacity 0.4s ease",
        }}
      />

      {/* Giant watermark numeral */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: `translate(-50%, -50%) translateY(${isActive ? "-16px" : "0px"})`,
          fontFamily: "'Cormorant Garamond', Georgia, serif",
          fontSize: "clamp(110px, 16vw, 200px)",
          fontWeight: 700,
          fontStyle: "italic",
          color: "transparent",
          WebkitTextStroke: `1px rgba(201,169,110,${isActive ? 0.15 : 0.05})`,
          userSelect: "none",
          pointerEvents: "none",
          lineHeight: 1,
          whiteSpace: "nowrap",
          transition: "all 0.55s cubic-bezier(0.22,1,0.36,1)",
        }}
      >
        {REASON_NUMERALS[index]}
      </div>

      {/* Icon */}
      <div
        style={{
          position: "absolute",
          top: "clamp(36px, 6vw, 72px)",
          left: "50%",
          width: "clamp(42px, 4.5vw, 56px)",
          height: "clamp(42px, 4.5vw, 56px)",
          transform: `translateX(-50%) scale(${isActive ? 1.18 : 1})`,
          color: isActive ? GOLD : "rgba(201,169,110,0.25)",
          filter: isActive
            ? `drop-shadow(0 0 14px rgba(201,169,110,0.55))`
            : "none",
          transition: "all 0.5s cubic-bezier(0.22,1,0.36,1)",
        }}
      >
        {ICONS[reason]}
      </div>

      {/* Concentric rings on active */}
      {isActive && (
        <div
          style={{
            position: "absolute",
            top: "clamp(36px, 6vw, 72px)",
            left: "50%",
            width: "clamp(42px, 4.5vw, 56px)",
            height: "clamp(42px, 4.5vw, 56px)",
            pointerEvents: "none",
          }}
        >
          {[80, 118, 158].map((sz, i) => (
            <div
              key={i}
              style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                width: sz,
                height: sz,
                marginTop: -sz / 2,
                marginLeft: -sz / 2,
                borderRadius: "50%",
                border: `1px solid rgba(201,169,110,${0.2 - i * 0.055})`,
                animation: `whyRingExpand 0.5s cubic-bezier(0.22,1,0.36,1) ${i * 0.07}s both`,
              }}
            />
          ))}
        </div>
      )}

      {/* Bottom content */}
      <div
        style={{
          position: "relative",
          zIndex: 2,
          padding: "0 clamp(18px, 2.5vw, 32px) 40px",
          textAlign: "center",
        }}
      >
        {/* Eyebrow */}
        <div
          style={{
            fontSize: 18,
            fontWeight: 800,
            color: isActive ? `${GOLD}cc` : "rgba(201,169,110,0.98)",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            fontFamily: "'Cormorant Garamond', Georgia, serif",
            fontStyle: "italic",
            marginBottom: 14,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            transition: "color 0.4s ease",
          }}
        >
          <div
            style={{
              width: isActive ? 22 : 8,
              height: 1,
              background: `linear-gradient(90deg, transparent, ${GOLD})`,
              transition: "width 0.5s cubic-bezier(0.22,1,0.36,1)",
            }}
          />
          {t(`aboutPage.whyChoose.items.${reason}.label`)}
          <div
            style={{
              width: isActive ? 22 : 8,
              height: 1,
              background: `linear-gradient(90deg, ${GOLD}, transparent)`,
              transition: "width 0.5s cubic-bezier(0.22,1,0.36,1)",
            }}
          />
        </div>

        {/* Title */}
        <h3
          style={{
            margin: "0 0 14px",
            fontFamily: "'Cormorant Garamond', Georgia, serif",
            fontSize: "clamp(20px, 2.2vw, 29px)",
            fontWeight: 700,
            fontStyle: "italic",
            color: isActive ? CREAM : "rgba(229,224,198,0.96)",
            letterSpacing: "-0.016em",
            lineHeight: 1.12,
            transition: "color 0.4s ease",
          }}
        >
          {t(`aboutPage.whyChoose.items.${reason}.title`)}
        </h3>

        {/* Gold rule */}
        <div
          style={{
            width: isActive ? 38 : 0,
            height: 1,
            background: `linear-gradient(90deg, transparent, ${GOLD}, transparent)`,
            margin: "0 auto 14px",
            transition: "width 0.5s cubic-bezier(0.22,1,0.36,1)",
          }}
        />

        {/* Body text — slides in */}
        <div
          style={{
            overflow: "hidden",
            maxHeight: isActive ? "140px" : "0px",
            opacity: isActive ? 1 : 0,
            transition:
              "max-height 0.55s cubic-bezier(0.22,1,0.36,1), opacity 0.4s ease 0.08s",
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: "clamp(11.5px, 0.9vw, 19px)",
              fontWeight: 300,
              color: "rgba(229,224,198,0.92)",
              lineHeight: 1.9,
              letterSpacing: "0.025em",
            }}
          >
            {t(`aboutPage.whyChoose.items.${reason}.body`)}
          </p>
        </div>

        {/* Hover hint */}
        {!isActive && (
          <div
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: "rgba(201,169,110,0.85)",
              letterSpacing: "0.28em",
              textTransform: "uppercase",
              fontFamily: "'Jost', sans-serif",
              marginTop: 6,
            }}
          >
            {t("aboutPage.whyChoose.hoverHint")}
          </div>
        )}
      </div>

      {/* Bottom rule */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: "12%",
          right: "12%",
          height: 1,
          background: isActive
            ? `linear-gradient(90deg, transparent, ${GOLD}55, transparent)`
            : "rgba(229,224,198,0.04)",
          transition: "background 0.5s ease",
        }}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// MOBILE CARD — horizontal layout, tap-to-expand accordion
// ─────────────────────────────────────────────────────────────
function MobileCard({
  reason,
  index,
  visible,
  isOpen,
  onToggle,
}: {
  reason: Reason;
  index: number;
  visible: boolean;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const { t } = useTranslation();
  const delay = 0.08 + index * 0.1;

  return (
    <div
      onClick={onToggle}
      style={{
        position: "relative",
        borderRadius: 18,
        background: isOpen
          ? "rgba(201,169,110,0.07)"
          : "rgba(255,255,255,0.025)",
        border: `1px solid ${isOpen ? "rgba(201,169,110,0.25)" : "rgba(229,224,198,0.08)"}`,
        backdropFilter: "blur(14px)",
        overflow: "hidden",
        cursor: "pointer",
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(32px)",
        transition: [
          `opacity 0.75s cubic-bezier(0.22,1,0.36,1) ${delay}s`,
          `transform 0.75s cubic-bezier(0.22,1,0.36,1) ${delay}s`,
          "border-color 0.4s ease",
          "background 0.4s ease",
          "box-shadow 0.4s ease",
        ].join(", "),
        boxShadow: isOpen
          ? "0 16px 48px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)"
          : "0 4px 20px rgba(0,0,0,0.2)",
      }}
    >
      {/* Left accent bar */}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: isOpen ? "8%" : "30%",
          bottom: isOpen ? "8%" : "30%",
          width: 2,
          borderRadius: 999,
          background: `linear-gradient(to bottom, ${GOLD}, ${GOLD2})`,
          opacity: isOpen ? 1 : 0,
          transition: "all 0.5s cubic-bezier(0.22,1,0.36,1)",
        }}
      />

      {/* Top shimmer when open */}
      {isOpen && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(105deg, transparent 30%, rgba(201,169,110,0.05) 50%, transparent 70%)",
            animation: "whyMobileShimmer 2.4s ease 0.1s infinite",
            pointerEvents: "none",
          }}
        />
      )}

      {/* ── Header row (always visible) ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
          padding: "20px 20px 20px 24px",
        }}
      >
        {/* Icon box */}
        <div
          style={{
            width: 46,
            height: 46,
            flexShrink: 0,
            borderRadius: 12,
            background: isOpen
              ? "rgba(201,169,110,0.12)"
              : "rgba(255,255,255,0.04)",
            border: `1px solid ${isOpen ? "rgba(201,169,110,0.3)" : "rgba(229,224,198,0.08)"}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 10,
            color: isOpen ? GOLD : "rgba(201,169,110,0.3)",
            filter: isOpen
              ? `drop-shadow(0 0 8px rgba(201,169,110,0.4))`
              : "none",
            transition: "all 0.4s ease",
          }}
        >
          {ICONS[reason]}
        </div>

        {/* Title + label */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 14,
              fontWeight: 800,
              color: isOpen ? `${GOLD}bb` : "rgba(201,169,110,0.98)",
              letterSpacing: "0.28em",
              textTransform: "uppercase",
              fontFamily: "'Cormorant Garamond', Georgia, serif",
              fontStyle: "italic",
              marginBottom: 5,
              transition: "color 0.35s ease",
            }}
          >
            {t(`aboutPage.whyChoose.items.${reason}.label`)}
          </div>
          <h3
            style={{
              margin: 0,
              fontFamily: "'Cormorant Garamond', Georgia, serif",
              fontSize: "clamp(18px, 5vw, 22px)",
              fontWeight: 700,
              fontStyle: "italic",
              color: isOpen ? CREAM : "rgba(229,224,198,0.65)",
              letterSpacing: "-0.015em",
              lineHeight: 1.1,
              transition: "color 0.35s ease",
            }}
          >
            {t(`aboutPage.whyChoose.items.${reason}.title`)}
          </h3>
        </div>

        {/* Roman numeral + chevron */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 4,
            flexShrink: 0,
          }}
        >
          <div
            style={{
              fontFamily: "'Cormorant Garamond', Georgia, serif",
              fontSize: 22,
              fontWeight: 700,
              fontStyle: "italic",
              color: isOpen ? `${GOLD}` : "rgba(201,169,110,0.2)",
              lineHeight: 1,
              transition: "color 0.35s ease",
            }}
          >
            {REASON_NUMERALS[index]}
          </div>
          {/* Chevron arrow */}
          <div
            style={{
              width: 16,
              height: 16,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
              transition: "transform 0.4s cubic-bezier(0.22,1,0.36,1)",
            }}
          >
            <svg
              viewBox="0 0 16 16"
              fill="none"
              style={{ width: "100%", height: "100%" }}
            >
              <path
                d="M4 6l4 4 4-4"
                stroke={isOpen ? GOLD : "rgba(201,169,110,0.3)"}
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>
      </div>

      {/* ── Expandable body ── */}
      <div
        style={{
          overflow: "hidden",
          maxHeight: isOpen ? "200px" : "0px",
          opacity: isOpen ? 1 : 0,
          transition:
            "max-height 0.5s cubic-bezier(0.22,1,0.36,1), opacity 0.35s ease 0.05s",
        }}
      >
        {/* Divider */}
        <div
          style={{
            margin: "0 20px",
            height: 1,
            background: `linear-gradient(90deg, transparent, rgba(201,169,110,0.2), transparent)`,
          }}
        />
        <p
          style={{
            margin: 0,
            padding: "18px 24px 24px",
            fontSize: 16.5,
            fontWeight: 300,
            color: "rgba(229,224,198,0.6)",
            lineHeight: 1.85,
            letterSpacing: "0.02em",
          }}
        >
          {t(`aboutPage.whyChoose.items.${reason}.body`)}
        </p>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════
export default function AboutWhyChoose() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const visible = useInView(sectionRef, 0.05);
  const [activeReason, setActiveReason] = useState<Reason | null>(null);
  const [openCard, setOpenCard] = useState<Reason | null>(null);
  const isMobile = useIsMobile();
  const { t } = useTranslation();

  // Desktop: auto-cycle once on entry
  useEffect(() => {
    if (!visible || isMobile) return;
    let idx = 0;
    const id = setInterval(() => {
      setActiveReason(REASONS[idx]);
      idx++;
      if (idx >= REASONS.length) {
        clearInterval(id);
        setTimeout(() => setActiveReason(null), 900);
      }
    }, 380);
    return () => clearInterval(id);
  }, [visible, isMobile]);

  // Mobile: auto-open first card on entry
  useEffect(() => {
    if (!visible || !isMobile) return;
    const t = setTimeout(() => setOpenCard("thrill"), 500);
    return () => clearTimeout(t);
  }, [visible, isMobile]);

  const handleMobileToggle = (reason: Reason) => {
    setOpenCard((prev) => (prev === reason ? null : reason));
  };

  return (
    <>
      <style>{`
        @keyframes whyFadeUp {
          from { opacity: 0; transform: translateY(32px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes whyRingExpand {
          from { opacity: 0; transform: translate(-50%,-50%) scale(0.3); }
          to   { opacity: 1; transform: translate(-50%,-50%) scale(1); }
        }
        @keyframes whyStatPop {
          from { opacity: 0; transform: translateY(20px) scale(0.9); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes whyMobileShimmer {
          0%   { transform: translateX(-130%) skewX(-12deg); opacity: 0; }
          20%  { opacity: 1; }
          100% { transform: translateX(240%) skewX(-12deg); opacity: 0; }
        }

        /* ── Desktop panels container ── */
        .why-panels-row {
          display: flex;
          flex-direction: row;
          max-width: 1200px;
          margin: 0 auto;
          border: 1px solid rgba(229,224,198,0.07);
          border-radius: 28px;
          overflow: hidden;
          backdrop-filter: blur(14px);
          background: rgba(255,255,255,0.018);
          box-shadow: 0 28px 80px rgba(0,0,0,0.52), inset 0 1px 0 rgba(255,255,255,0.035);
        }

        /* ── Mobile accordion container ── */
        .why-mobile-list {
          display: none;
          flex-direction: column;
          gap: 12px;
          max-width: 560px;
          margin: 0 auto;
        }

        /* ── Stats grid ── */
        .why-stats-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 14px;
          max-width: 1200px;
          margin: 36px auto 0;
          position: relative;
          zIndex: 1;
        }

        .why-stat-card {
          transition: transform 0.4s cubic-bezier(0.22,1,0.36,1),
                      border-color 0.4s ease, background 0.4s ease;
        }
        .why-stat-card:hover {
          transform: translateY(-5px);
          border-color: rgba(201,169,110,0.22) !important;
          background: rgba(201,169,110,0.06) !important;
        }

        /* ── Responsive breakpoints ── */
        @media (max-width: 767px) {
          .why-panels-row {
            display: none !important;
          }
          .why-mobile-list {
            display: flex !important;
          }
          .why-stats-grid {
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 10px !important;
            margin-top: 28px !important;
          }
        }

        @media (min-width: 768px) and (max-width: 1023px) {
          .why-stats-grid {
            grid-template-columns: repeat(2, 1fr) !important;
          }
        }
      `}</style>

      <section
        ref={sectionRef}
        style={{
          position: "relative",
          background: "linear-gradient(180deg,#224266 0%,#1f2a3d 100%)",
          padding: "120px 24px 130px",
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
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%,-50%)",
              width: 1100,
              height: 680,
              borderRadius: "50%",
              background:
                "radial-gradient(ellipse, rgba(42,72,99,0.17) 0%, transparent 65%)",
            }}
          />
          <div
            style={{
              position: "absolute",
              top: "12%",
              right: "6%",
              width: 400,
              height: 400,
              borderRadius: "50%",
              background:
                "radial-gradient(circle, rgba(201,169,110,0.07) 0%, transparent 70%)",
            }}
          />
          <div
            style={{
              position: "absolute",
              bottom: "12%",
              left: "4%",
              width: 320,
              height: 320,
              borderRadius: "50%",
              background:
                "radial-gradient(circle, rgba(42,72,99,0.13) 0%, transparent 70%)",
            }}
          />
          {[340, 620, 920].map((sz, i) => (
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
                border: `1px solid rgba(201,169,110,${0.045 - i * 0.012})`,
              }}
            />
          ))}
        </div>

        {/* ── HEADER ── */}
        <div
          style={{
            textAlign: "center",
            marginBottom: 64,
            position: "relative",
            zIndex: 1,
            opacity: visible ? 1 : 0,
            transform: visible ? "translateY(0)" : "translateY(28px)",
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
                fontSize: 16,
                fontWeight: 800,
                color: GOLD,
                letterSpacing: "0.02em",
                textTransform: "uppercase",
              }}
            >
              {t("aboutPage.whyChoose.eyebrow")}
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
                fontSize: "clamp(32px, 5.5vw, 64px)",
                fontWeight: 700,
                fontStyle: "italic",
                color: CREAM,
                letterSpacing: "-0.022em",
                lineHeight: 1,
                animation: visible
                  ? "whyFadeUp 1s cubic-bezier(0.22,1,0.36,1) 0.08s both"
                  : "none",
              }}
            >
              {t("aboutPage.whyChoose.titleLine1")}
            </h2>
          </div>

          {/* Title line 2 — gold outline */}
          <div style={{ overflow: "hidden", marginBottom: 22 }}>
            <h2
              style={{
                margin: 0,
                fontFamily: "'Cormorant Garamond', Georgia, serif",
                fontSize: "clamp(32px, 5.5vw, 64px)",
                fontWeight: 700,
                fontStyle: "italic",
                color: "transparent",
                WebkitTextStroke: `1.5px ${GOLD}`,
                letterSpacing: "-0.022em",
                lineHeight: 1,
                animation: visible
                  ? "whyFadeUp 1s cubic-bezier(0.22,1,0.36,1) 0.2s both"
                  : "none",
              }}
            >
              {t("aboutPage.whyChoose.titleLine2")}
            </h2>
          </div>

          {/* Description */}
          <p
            style={{
              margin: "0 auto",
              maxWidth: 500,
              fontSize: "clamp(13px, 1.1vw, 20px)",
              fontWeight: 300,
              color: "rgba(229,224,198,0.92)",
              lineHeight: 1.9,
              letterSpacing: "0.03em",
              animation: visible ? "whyFadeUp 0.9s ease 0.34s both" : "none",
            }}
          >
            {t("aboutPage.whyChoose.description")}
          </p>
        </div>

        {/* ── DESKTOP: Panels Row ── */}
        <div
          className="why-panels-row"
          style={{
            position: "relative",
            zIndex: 1,
            opacity: visible ? 1 : 0,
            transform: visible ? "translateY(0)" : "translateY(44px)",
            transition:
              "opacity 0.9s cubic-bezier(0.22,1,0.36,1) 0.22s, transform 0.9s cubic-bezier(0.22,1,0.36,1) 0.22s",
          }}
        >
          {/* Top accent line */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: "4%",
              right: "4%",
              height: 2,
              background: `linear-gradient(90deg, transparent, ${GOLD}44, ${GOLD}88, ${GOLD}44, transparent)`,
              borderRadius: 999,
              zIndex: 3,
              pointerEvents: "none",
            }}
          />

          {REASONS.map((reason, idx) => (
            <DesktopPanel
              key={reason}
              reason={reason}
              index={idx}
              visible={visible}
              isActive={activeReason === reason}
              onEnter={() => setActiveReason(reason)}
              onLeave={() => setActiveReason(null)}
              totalCount={REASONS.length}
            />
          ))}
        </div>

        {/* ── MOBILE: Accordion List ── */}
        <div
          className="why-mobile-list"
          style={{
            position: "relative",
            zIndex: 1,
            opacity: visible ? 1 : 0,
            transition: "opacity 0.7s ease 0.2s",
          }}
        >
          {REASONS.map((reason, idx) => (
            <MobileCard
              key={reason}
              reason={reason}
              index={idx}
              visible={visible}
              isOpen={openCard === reason}
              onToggle={() => handleMobileToggle(reason)}
            />
          ))}
        </div>

        {/* ── Bottom ornament ── */}
        <div
          style={{
            maxWidth: 1200,
            margin: "52px auto 0",
            display: "flex",
            alignItems: "center",
            gap: 16,
            position: "relative",
            zIndex: 1,
            opacity: visible ? 1 : 0,
            transition: "opacity 0.8s ease 1s",
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
