import React, { useRef, useState, useEffect } from "react";
import { useTranslation } from "react-i18next";

const GOLD = "#c9a96e";
const GOLD2 = "#b8944e";
const NAVY = "#2A4863";
const NAVY2 = "#1e3652";
const CREAM = "rgb(229, 224, 198)";

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

const SOLUTION_KEYS = ["transparency", "gamified", "smarter"] as const;
type SolutionKey = (typeof SOLUTION_KEYS)[number];

const STEP_NUMBERS = ["01", "02", "03"];

// Horizontal step indicator line
function StepLine({ active, done }: { active: boolean; done: boolean }) {
  return (
    <div
      style={{ flex: 1, height: 1, position: "relative", overflow: "hidden" }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            done || active
              ? `linear-gradient(90deg, ${GOLD}88, ${GOLD}22)`
              : "rgba(229,224,198,0.07)",
          transition: "background 0.6s ease",
        }}
      />
    </div>
  );
}

export default function AboutSolution() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const visible = useInView(sectionRef, 0.06);
  const [active, setActive] = useState<SolutionKey>("transparency");
  const [prevActive, setPrev] = useState<SolutionKey | null>(null);
  const [animating, setAnimating] = useState(false);
  const [userHeld, setUserHeld] = useState(false);
  const { t } = useTranslation();

  // Auto-cycle
  useEffect(() => {
    if (userHeld || !visible) return;
    const id = setInterval(() => {
      setActive((prev) => {
        const i = SOLUTION_KEYS.indexOf(prev);
        return SOLUTION_KEYS[(i + 1) % SOLUTION_KEYS.length];
      });
    }, 5000);
    return () => clearInterval(id);
  }, [userHeld, visible]);

  const handleSelect = (key: SolutionKey) => {
    if (key === active) return;
    setUserHeld(true);
    setPrev(active);
    setAnimating(true);
    setActive(key);
    setTimeout(() => {
      setAnimating(false);
      setPrev(null);
    }, 600);
  };

  const activeIdx = SOLUTION_KEYS.indexOf(active);
  const content = {
    key: active,
    number: STEP_NUMBERS[activeIdx],
  };

  return (
    <>
      <style>{`
        @keyframes solFadeUp {
          from { opacity: 0; transform: translateY(28px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes solSlideRight {
          from { opacity: 0; transform: translateX(-22px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes solRevealLine {
          from { transform: scaleX(0); transform-origin: left; }
          to   { transform: scaleX(1); transform-origin: left; }
        }
        @keyframes solNumberCount {
          from { opacity: 0; transform: translateY(18px) scale(0.92); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes solShimmer {
          0%   { transform: translateX(-130%) skewX(-14deg); opacity: 0; }
          20%  { opacity: 0.55; }
          100% { transform: translateX(220%) skewX(-14deg); opacity: 0; }
        }
        @keyframes solGlowPulse {
          0%,100% { opacity: 0.5; }
          50%      { opacity: 0.85; }
        }
        @keyframes solProgressFill {
          from { width: 0%; }
          to   { width: 100%; }
        }
        @keyframes solOrbit {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }

        .sol-step-btn {
          background: none;
          border: none;
          padding: 0;
          cursor: pointer;
          text-align: left;
          font-family: 'Jost', sans-serif;
          width: 100%;
          outline: none;
        }
        .sol-step-btn:focus-visible { outline: 1px solid rgba(201,169,110,0.5); border-radius: 4px; }

        .sol-content-enter {
          animation: solFadeUp 0.55s cubic-bezier(0.22,1,0.36,1) both;
        }
        .sol-line-enter {
          animation: solRevealLine 0.7s cubic-bezier(0.22,1,0.36,1) 0.1s both;
        }
        .sol-number-enter {
          animation: solNumberCount 0.5s cubic-bezier(0.34,1.56,0.64,1) both;
        }

        @media (max-width: 860px) {
          .sol-layout { grid-template-columns: 1fr !important; }
          .sol-steps-row { flex-direction: column !important; gap: 0 !important; }
          .sol-step-divider { display: none !important; }
        }
      `}</style>

      <section
        ref={sectionRef}
        style={{
          position: "relative",
          background: "linear-gradient(180deg,#1f2a3d 0%,#224266 100%)",
          padding: "120px 32px 130px",
          overflow: "hidden",
        }}
      >
        {/* Top border */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 1,
            background: `linear-gradient(90deg, transparent, ${GOLD}, rgba(229,224,198,0.55), ${GOLD}, transparent)`,
            opacity: 0.3,
          }}
        />

        {/* Background atmosphere */}
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
          <div
            style={{
              position: "absolute",
              top: "35%",
              left: "50%",
              transform: "translate(-50%,-50%)",
              width: 1200,
              height: 700,
              borderRadius: "50%",
              background:
                "radial-gradient(ellipse, rgba(42,72,99,0.2) 0%, transparent 65%)",
            }}
          />
          <div
            style={{
              position: "absolute",
              top: "10%",
              right: "-2%",
              width: 420,
              height: 420,
              borderRadius: "50%",
              background: `radial-gradient(circle, rgba(201,169,110,0.07) 0%, transparent 70%)`,
            }}
          />
          <div
            style={{
              position: "absolute",
              bottom: "5%",
              left: "-3%",
              width: 350,
              height: 350,
              borderRadius: "50%",
              background: `radial-gradient(circle, rgba(42,72,99,0.12) 0%, transparent 70%)`,
            }}
          />
          {/* Subtle orbit ring */}
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%,-50%)",
              width: 900,
              height: 900,
              borderRadius: "50%",
              border: "1px solid rgba(201,169,110,0.04)",
            }}
          />
        </div>

        {/* ── SECTION HEADER ── */}
        <div
          style={{
            textAlign: "center",
            marginBottom: 90,
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
                letterSpacing: "0.1em",
                textTransform: "uppercase",
              }}
            >
              {t("aboutPage.solution.eyebrow")}
            </span>
            <div
              style={{
                width: 36,
                height: 1,
                background: `linear-gradient(90deg, ${GOLD}, transparent)`,
              }}
            />
          </div>

          {/* Large italic serif kicker */}
          <div style={{ overflow: "hidden", marginBottom: 10 }}>
            <p
              style={{
                margin: 0,
                fontFamily: "'Cormorant Garamond', Georgia, serif",
                fontSize: "clamp(13px, 1.1vw, 17px)",
                fontWeight: 300,
                fontStyle: "italic",
                color: `${GOLD}cc`,
                letterSpacing: "0.12em",
                animation: visible ? "solFadeUp 0.9s ease 0.05s both" : "none",
              }}
            >
              {t("aboutPage.solution.kicker")}
            </p>
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
                  ? "solFadeUp 1s cubic-bezier(0.22,1,0.36,1) 0.12s both"
                  : "none",
              }}
            >
              {t("aboutPage.solution.titleLine1")}
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
                  ? "solFadeUp 1s cubic-bezier(0.22,1,0.36,1) 0.24s both"
                  : "none",
              }}
            >
              {t("aboutPage.solution.titleLine2")}
            </h2>
          </div>

          <p
            style={{
              margin: "0 auto",
              maxWidth: 500,
              fontSize: "clamp(13px, 1.1vw, 17px)",
              fontWeight: 300,
              color: "rgba(229,224,198,0.92)",
              lineHeight: 1.9,
              letterSpacing: "0.03em",
              animation: visible ? "solFadeUp 0.9s ease 0.36s both" : "none",
            }}
          >
            {t("aboutPage.solution.description")}
          </p>
        </div>

        {/* ── MAIN INTERACTIVE LAYOUT ── */}
        <div
          className="sol-layout"
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1.3fr",
            gap: 48,
            maxWidth: 1100,
            margin: "0 auto",
            position: "relative",
            zIndex: 1,
            alignItems: "center",
            opacity: visible ? 1 : 0,
            transform: visible ? "translateY(0)" : "translateY(40px)",
            transition:
              "opacity 0.9s cubic-bezier(0.22,1,0.36,1) 0.3s, transform 0.9s cubic-bezier(0.22,1,0.36,1) 0.3s",
          }}
        >
          {/* ── LEFT: Vertical step selector ── */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {SOLUTION_KEYS.map((key, idx) => {
              const isActive = active === key;
              const isDone = idx < activeIdx;
              return (
                <button
                  key={key}
                  className="sol-step-btn"
                  onClick={() => handleSelect(key)}
                >
                  {/* Connector line between buttons */}
                  {idx > 0 && (
                    <div
                      style={{
                        width: 1,
                        height: 20,
                        marginLeft: 20,
                        background: isDone
                          ? `linear-gradient(to bottom, ${GOLD}55, ${GOLD}22)`
                          : "rgba(229,224,198,0.07)",
                        transition: "background 0.5s ease",
                      }}
                    />
                  )}

                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 18,
                      padding: "20px 24px",
                      borderRadius: 14,
                      background: isActive
                        ? "rgba(201,169,110,0.07)"
                        : "rgba(255,255,255,0.02)",
                      border: `1px solid ${isActive ? "rgba(201,169,110,0.3)" : "rgba(229,224,198,0.06)"}`,
                      transition: "all 0.4s cubic-bezier(0.22,1,0.36,1)",
                      position: "relative",
                      overflow: "hidden",
                    }}
                  >
                    {/* Left accent bar */}
                    <div
                      style={{
                        position: "absolute",
                        left: 0,
                        top: "15%",
                        bottom: "15%",
                        width: isActive ? 2 : 0,
                        borderRadius: 999,
                        background: `linear-gradient(to bottom, ${GOLD}, ${GOLD2})`,
                        transition: "width 0.4s cubic-bezier(0.22,1,0.36,1)",
                      }}
                    />

                    {/* Progress fill for auto-advance */}
                    {isActive && !userHeld && (
                      <div
                        style={{
                          position: "absolute",
                          bottom: 0,
                          left: 0,
                          height: 1,
                          background: `linear-gradient(90deg, ${GOLD}, transparent)`,
                          animation: "solProgressFill 5s linear forwards",
                        }}
                        key={`${key}-progress`}
                      />
                    )}

                    {/* Step circle */}
                    <div
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: "50%",
                        flexShrink: 0,
                        background: isActive
                          ? `linear-gradient(135deg, ${NAVY}, ${NAVY2})`
                          : "rgba(255,255,255,0.03)",
                        border: `1px solid ${isActive ? `${GOLD}55` : "rgba(229,224,198,0.08)"}`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        transition: "all 0.4s ease",
                        boxShadow: isActive
                          ? `0 0 18px rgba(201,169,110,0.25)`
                          : "none",
                      }}
                    >
                      <span
                        style={{
                          fontFamily: "'Cormorant Garamond', Georgia, serif",
                          fontStyle: "italic",
                          fontSize: 19,
                          fontWeight: 700,
                          color: isActive ? GOLD : "rgba(229,224,198,0.25)",
                          transition: "color 0.3s ease",
                          letterSpacing: "0.05em",
                        }}
                      >
                        {STEP_NUMBERS[idx]}
                      </span>
                    </div>

                    {/* Step label text */}
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          fontSize: "clamp(14px, 1.3vw, 19px)",
                          fontWeight: 800,
                          color: isActive ? CREAM : "rgba(229,224,198,0.85)",
                          letterSpacing: "-0.01em",
                          lineHeight: 1.2,
                          transition: "color 0.35s ease",
                          marginBottom: 3,
                        }}
                      >
                        {t(`aboutPage.solution.items.${key}.title`)}
                      </div>
                      <div
                        style={{
                          fontSize: 15,
                          fontWeight: 400,
                          color: isActive
                            ? "rgba(229,224,198,0.9)"
                            : "rgba(229,224,198,0.78)",
                          transition: "color 0.35s ease",
                          letterSpacing: "0.02em",
                          overflow: "hidden",
                          display: "-webkit-box",
                          WebkitLineClamp: 1,
                          WebkitBoxOrient: "vertical",
                        }}
                      >
                        {t(`aboutPage.solution.items.${key}.teaser`)}
                      </div>
                    </div>

                    {/* Arrow indicator */}
                    <div
                      style={{
                        fontSize: 15,
                        color: isActive ? `${GOLD}88` : "rgba(229,224,198,0.1)",
                        transform: isActive
                          ? "translateX(0)"
                          : "translateX(-4px)",
                        opacity: isActive ? 1 : 0,
                        transition: "all 0.4s ease",
                        flexShrink: 0,
                        fontFamily: "monospace",
                      }}
                    >
                      ›
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* ── RIGHT: Large content reveal panel ── */}
          <div
            style={{
              position: "relative",
              borderRadius: 28,
              overflow: "hidden",
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(229,224,198,0.07)",
              backdropFilter: "blur(22px)",
              boxShadow:
                "0 12px 72px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.04)",
              minHeight: 380,
            }}
          >
            {/* Panel top accent */}
            <div
              style={{
                position: "absolute",
                top: 0,
                left: "8%",
                right: "8%",
                height: 2,
                background: `linear-gradient(90deg, transparent, ${GOLD}, transparent)`,
                opacity: 0.5,
                borderRadius: 999,
              }}
            />

            {/* Atmospheric corner glow */}
            <div
              style={{
                position: "absolute",
                top: -80,
                right: -80,
                width: 280,
                height: 280,
                borderRadius: "50%",
                background: `radial-gradient(circle, rgba(201,169,110,0.09) 0%, transparent 65%)`,
                pointerEvents: "none",
              }}
            />
            <div
              style={{
                position: "absolute",
                bottom: -60,
                left: -60,
                width: 220,
                height: 220,
                borderRadius: "50%",
                background: `radial-gradient(circle, rgba(42,72,99,0.15) 0%, transparent 65%)`,
                pointerEvents: "none",
              }}
            />

            {/* Animated content block */}
            <div
              key={active}
              className="sol-content-enter"
              style={{ padding: "52px 52px 48px" }}
            >
              {/* Large step number watermark */}
              <div
                style={{
                  position: "absolute",
                  top: 16,
                  right: 32,
                  fontFamily: "'Cormorant Garamond', Georgia, serif",
                  fontSize: "clamp(80px, 9vw, 120px)",
                  fontWeight: 700,
                  fontStyle: "italic",
                  color: "transparent",
                  WebkitTextStroke: `1px rgba(201,169,110,0.09)`,
                  userSelect: "none",
                  pointerEvents: "none",
                  lineHeight: 1,
                }}
              >
                {content.number}
              </div>

              {/* Eyebrow label */}
              <div
                style={{
                  fontSize: 15,
                  fontWeight: 800,
                  color: `${GOLD}`,
                  letterSpacing: "0.02em",
                  textTransform: "uppercase",
                  marginBottom: 20,
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <div
                  className="sol-line-enter"
                  style={{
                    width: 24,
                    height: 1,
                    background: `linear-gradient(90deg, ${GOLD}, transparent)`,
                    transformOrigin: "left",
                  }}
                />
                {t(`aboutPage.solution.items.${active}.label`)}
              </div>

              {/* Main title */}
              <h3
                style={{
                  margin: "0 0 22px",
                  fontFamily: "'Cormorant Garamond', Georgia, serif",
                  fontSize: "clamp(30px, 3.2vw, 44px)",
                  fontWeight: 700,
                  fontStyle: "italic",
                  color: CREAM,
                  letterSpacing: "-0.02em",
                  lineHeight: 1.1,
                  position: "relative",
                  zIndex: 1,
                }}
              >
                {t(`aboutPage.solution.items.${active}.title`)}
              </h3>

              {/* Gold rule */}
              <div
                className="sol-line-enter"
                style={{
                  width: 56,
                  height: 1,
                  background: `linear-gradient(90deg, ${GOLD}, transparent)`,
                  marginBottom: 24,
                  transformOrigin: "left",
                }}
              />

              {/* Body copy */}
              <p
                style={{
                  margin: "0 0 36px",
                  fontSize: "clamp(13.5px, 1.1vw, 19.5px)",
                  fontWeight: 300,
                  color: "rgba(229,224,198,0.98)",
                  lineHeight: 1.95,
                  letterSpacing: "0.005em",
                  maxWidth: 440,
                  position: "relative",
                  zIndex: 1,
                }}
              >
                {t(`aboutPage.solution.items.${active}.body`)}
              </p>

              {/* Step indicator dots row */}
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {SOLUTION_KEYS.map((k, i) => (
                  <div
                    key={k}
                    onClick={() => handleSelect(k)}
                    style={{
                      width: active === k ? 28 : 6,
                      height: 6,
                      borderRadius: 999,
                      background:
                        active === k
                          ? `linear-gradient(90deg, ${GOLD}, ${GOLD2})`
                          : "rgba(229,224,198,0.14)",
                      transition: "all 0.4s cubic-bezier(0.22,1,0.36,1)",
                      cursor: "pointer",
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── BOTTOM FULL-WIDTH MARQUEE STRIP ── */}
        <div
          style={{
            maxWidth: 1100,
            margin: "80px auto 0",
            position: "relative",
            zIndex: 1,
            opacity: visible ? 1 : 0,
            transition: "opacity 0.8s ease 0.7s",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "stretch",
              borderRadius: 16,
              overflow: "hidden",
              border: "1px solid rgba(229,224,198,0.07)",
            }}
          >
            {SOLUTION_KEYS.map((key, idx) => {
              const isAct = active === key;
              return (
                <div
                  key={key}
                  onClick={() => handleSelect(key)}
                  style={{
                    flex: 1,
                    padding: "20px 28px",
                    borderRight:
                      idx < 2 ? "1px solid rgba(229,224,198,0.07)" : "none",
                    background: isAct
                      ? "rgba(201,169,110,0.05)"
                      : "rgba(255,255,255,0.018)",
                    cursor: "pointer",
                    transition: "background 0.4s ease",
                    position: "relative",
                    overflow: "hidden",
                  }}
                >
                  {/* Shimmer on active */}
                  {isAct && (
                    <div
                      style={{
                        position: "absolute",
                        inset: 0,
                        background:
                          "linear-gradient(90deg, transparent, rgba(201,169,110,0.07), transparent)",
                        animation: "solShimmer 2.6s ease 0.3s infinite",
                        pointerEvents: "none",
                      }}
                    />
                  )}
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: isAct ? `${GOLD}aa` : "rgba(229,224,198,0.82)",
                      letterSpacing: "0.26em",
                      textTransform: "uppercase",
                      marginBottom: 6,
                      fontFamily: "'Cormorant Garamond', Georgia, serif",
                      fontStyle: "italic",
                      transition: "color 0.35s ease",
                    }}
                  >
                    {STEP_NUMBERS[idx]}
                  </div>
                  <div
                    style={{
                      fontSize: "clamp(12px, 1.1vw, 19.5px)",
                      fontWeight: 700,
                      color: isAct ? CREAM : "rgba(229,224,198,0.68)",
                      letterSpacing: "-0.01em",
                      transition: "color 0.35s ease",
                    }}
                  >
                    {t(`aboutPage.solution.items.${key}.title`)}
                  </div>
                  {/* Active underline */}
                  <div
                    style={{
                      position: "absolute",
                      bottom: 0,
                      left: isAct ? 0 : "50%",
                      right: isAct ? 0 : "50%",
                      height: 2,
                      background: `linear-gradient(90deg, transparent, ${GOLD}, transparent)`,
                      transition:
                        "left 0.55s cubic-bezier(0.22,1,0.36,1), right 0.55s cubic-bezier(0.22,1,0.36,1)",
                      opacity: 0.7,
                    }}
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* Bottom divider */}
        <div
          style={{
            maxWidth: 1100,
            margin: "56px auto 0",
            display: "flex",
            alignItems: "center",
            gap: 16,
            opacity: visible ? 1 : 0,
            transition: "opacity 0.8s ease 0.8s",
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
