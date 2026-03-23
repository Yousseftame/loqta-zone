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

// ── Tab data keys ─────────────────────────────────────────────
const TAB_KEYS = ["accessible", "fair", "engaging"] as const;
type TabKey = (typeof TAB_KEYS)[number];

// ── Decorative roman numeral for each tab ─────────────────────
const TAB_NUMERALS = ["I", "II", "III"];

// ── Single tab panel ─────────────────────────────────────────
function TabPanel({
  tabKey,
  numeral,
  visible,
  active,
}: {
  tabKey: TabKey;
  numeral: string;
  visible: boolean;
  active: boolean;
}) {
  const { t } = useTranslation();

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        padding: "52px 56px 48px",
        opacity: active ? 1 : 0,
        transform: active
          ? "translateY(0) scale(1)"
          : "translateY(14px) scale(0.99)",
        transition:
          "opacity 0.55s cubic-bezier(0.22,1,0.36,1), transform 0.55s cubic-bezier(0.22,1,0.36,1)",
        pointerEvents: active ? "auto" : "none",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
      }}
    >
      {/* Roman numeral watermark */}
      <div
        style={{
          position: "absolute",
          bottom: 24,
          right: 36,
          fontFamily: "'Cormorant Garamond', Georgia, serif",
          fontSize: 96,
          fontWeight: 700,
          fontStyle: "italic",
          color: "transparent",
          WebkitTextStroke: `1px rgba(201,169,110,0.10)`,
          userSelect: "none",
          pointerEvents: "none",
          lineHeight: 1,
        }}
      >
        {numeral}
      </div>

      {/* Eyebrow label */}
      <div
        style={{
          fontSize: 17,
          fontWeight: 800,
          color: `${GOLD}`,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          marginBottom: 18,
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <div
          style={{
            width: 20,
            height: 1,
            background: `linear-gradient(90deg, ${GOLD}, transparent)`,
          }}
        />
        {t(`aboutPage.platform.tabs.${tabKey}.label`)}
      </div>

      {/* Heading */}
      <h3
        style={{
          margin: "0 0 20px",
          fontFamily: "'Cormorant Garamond', Georgia, serif",
          fontSize: "clamp(28px, 3.2vw, 42px)",
          fontWeight: 700,
          fontStyle: "italic",
          color: CREAM,
          letterSpacing: "-0.02em",
          lineHeight: 1.1,
        }}
      >
        {t(`aboutPage.platform.tabs.${tabKey}.title`)}
      </h3>

      {/* Thin gold rule */}
      <div
        style={{
          width: 48,
          height: 1,
          background: `linear-gradient(90deg, ${GOLD}, transparent)`,
          marginBottom: 22,
        }}
      />

      {/* Body text */}
      <p
        style={{
          margin: 0,
          fontSize: "clamp(13.5px, 1.1vw, 17.5px)",
          fontWeight: 300,
          color: "rgba(229,224,198,0.9)",
          lineHeight: 1.9,
          letterSpacing: "0.025em",
          maxWidth: 460,
        }}
      >
        {t(`aboutPage.platform.tabs.${tabKey}.body`)}
      </p>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════
export default function AboutPlatform() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const visible = useInView(sectionRef, 0.08);
  const [activeTab, setActiveTab] = useState<TabKey>("accessible");
  const { t } = useTranslation();

  // Auto-advance tabs when not yet interacted
  const [userInteracted, setUserInteracted] = useState(false);
  useEffect(() => {
    if (userInteracted || !visible) return;
    const interval = setInterval(() => {
      setActiveTab((prev) => {
        const idx = TAB_KEYS.indexOf(prev);
        return TAB_KEYS[(idx + 1) % TAB_KEYS.length];
      });
    }, 4000);
    return () => clearInterval(interval);
  }, [userInteracted, visible]);

  const handleTabClick = (key: TabKey) => {
    setUserInteracted(true);
    setActiveTab(key);
  };

  return (
    <>
      <style>{`
        /* ── Section keyframes ── */
        @keyframes apFadeUp {
          from { opacity: 0; transform: translateY(32px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes apLineGrow {
          from { transform: scaleX(0); }
          to   { transform: scaleX(1); }
        }
        @keyframes apProgressBar {
          from { width: 0%; }
          to   { width: 100%; }
        }
        @keyframes apShimmer {
          0%   { transform: translateX(-140%) skewX(-16deg); opacity: 0; }
          25%  { opacity: 0.6; }
          100% { transform: translateX(220%) skewX(-16deg); opacity: 0; }
        }

        /* ── Tab button ── */
        .ap-tab-btn {
          position: relative;
          background: transparent;
          border: none;
          cursor: pointer;
          padding: 0;
          text-align: left;
          font-family: 'Jost', sans-serif;
          outline: none;
          width: 100%;
        }
        .ap-tab-btn:focus-visible .ap-tab-inner {
          box-shadow: 0 0 0 2px rgba(201,169,110,0.5);
        }

        /* ── Auto-progress bar under active tab ── */
        .ap-progress-bar {
          position: absolute;
          bottom: 0;
          left: 0;
          height: 2px;
          background: linear-gradient(90deg, ${GOLD}, ${GOLD2});
          border-radius: 999px;
          transform-origin: left;
        }
        .ap-progress-bar.running {
          animation: apProgressBar 4s linear forwards;
        }

        /* ── Responsive panel height ── */
        .ap-panel-wrapper {
          position: relative;
          min-height: 320px;
        }
        @media (max-width: 900px) {
          .ap-layout { grid-template-columns: 1fr !important; }
          .ap-tabs-col { flex-direction: row !important; gap: 8px !important; }
          .ap-tab-inner { padding: 14px 18px !important; }
          .ap-panel-wrapper { min-height: 380px !important; }
        }
        @media (max-width: 560px) {
          .ap-panel-wrapper { min-height: 460px !important; }
          .ap-tabs-col { flex-direction: column !important; }
        }
      `}</style>

      <section
        ref={sectionRef}
        style={{
          position: "relative",
          background: "linear-gradient(180deg,#1f2a3d 0%,#224266 100%)",
          padding: "110px 32px 120px",
          overflow: "hidden",
        }}
      >
        {/* ── Top separator line ── */}
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

        {/* ── Background atmosphere ── */}
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
          <div
            style={{
              position: "absolute",
              top: "40%",
              left: "50%",
              transform: "translate(-50%,-50%)",
              width: 1000,
              height: 600,
              borderRadius: "50%",
              background:
                "radial-gradient(ellipse, rgba(42,72,99,0.15) 0%, transparent 65%)",
            }}
          />
          <div
            style={{
              position: "absolute",
              top: "10%",
              right: "4%",
              width: 340,
              height: 340,
              borderRadius: "50%",
              background: `radial-gradient(circle, rgba(201,169,110,0.07) 0%, transparent 70%)`,
            }}
          />
          {[260, 460, 700].map((sz, i) => (
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
                border: `1px solid rgba(201,169,110,${0.055 - i * 0.014})`,
              }}
            />
          ))}
        </div>

        {/* ── Section header ── */}
        <div
          style={{
            textAlign: "center",
            marginBottom: 72,
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
                fontSize: 15,
                fontWeight: 800,
                color: GOLD,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
              }}
            >
              {t("aboutPage.platform.eyebrow")}
            </span>
            <div
              style={{
                width: 36,
                height: 1,
                background: `linear-gradient(90deg, ${GOLD}, transparent)`,
              }}
            />
          </div>

          {/* Title — line 1 */}
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
                  ? "apFadeUp 1s cubic-bezier(0.22,1,0.36,1) 0.1s both"
                  : "none",
              }}
            >
              {t("aboutPage.platform.titleLine1")}
            </h2>
          </div>

          {/* Title — line 2 (gold outline) */}
          <div style={{ overflow: "hidden", marginBottom: 24 }}>
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
                  ? "apFadeUp 1s cubic-bezier(0.22,1,0.36,1) 0.22s both"
                  : "none",
              }}
            >
              {t("aboutPage.platform.titleLine2")}
            </h2>
          </div>

          {/* Description */}
          <p
            style={{
              margin: "0 auto",
              maxWidth: 520,
              fontSize: "clamp(13px, 1.15vw, 17px)",
              fontWeight: 300,
              color: "rgba(229,224,198,0.85)",
              lineHeight: 1.9,
              letterSpacing: "0.03em",
              animation: visible ? "apFadeUp 0.9s ease 0.38s both" : "none",
            }}
          >
            {t("aboutPage.platform.description")}
          </p>
        </div>

        {/* ── Two-column layout: tabs left · panel right ── */}
        <div
          className="ap-layout"
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1.45fr",
            gap: 32,
            maxWidth: 1100,
            margin: "0 auto",
            position: "relative",
            zIndex: 1,
            alignItems: "stretch",
            opacity: visible ? 1 : 0,
            transform: visible ? "translateY(0)" : "translateY(36px)",
            transition:
              "opacity 0.9s cubic-bezier(0.22,1,0.36,1) 0.3s, transform 0.9s cubic-bezier(0.22,1,0.36,1) 0.3s",
          }}
        >
          {/* ── LEFT — Tab selector column ── */}
          <div
            className="ap-tabs-col"
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 12,
              justifyContent: "center",
            }}
          >
            {TAB_KEYS.map((key, idx) => {
              const isActive = activeTab === key;
              return (
                <button
                  key={key}
                  className="ap-tab-btn"
                  onClick={() => handleTabClick(key)}
                  aria-selected={isActive}
                >
                  <div
                    className="ap-tab-inner"
                    style={{
                      position: "relative",
                      padding: "22px 28px",
                      borderRadius: 16,
                      background: isActive
                        ? "rgba(201,169,110,0.07)"
                        : "rgba(255,255,255,0.025)",
                      border: `1px solid ${isActive ? `${GOLD}55` : "rgba(229,224,198,0.07)"}`,
                      transition: "all 0.4s cubic-bezier(0.22,1,0.36,1)",
                      overflow: "hidden",
                      backdropFilter: "blur(12px)",
                    }}
                  >
                    {/* Left accent bar */}
                    <div
                      style={{
                        position: "absolute",
                        left: 0,
                        top: "20%",
                        bottom: "20%",
                        width: 2,
                        borderRadius: 999,
                        background: isActive
                          ? `linear-gradient(to bottom, ${GOLD}, ${GOLD2})`
                          : "rgba(229,224,198,0.08)",
                        transition: "background 0.4s ease",
                      }}
                    />

                    {/* Shimmer on active */}
                    {isActive && (
                      <div
                        style={{
                          position: "absolute",
                          inset: 0,
                          background:
                            "linear-gradient(90deg, transparent, rgba(201,169,110,0.08), transparent)",
                          animation: "apShimmer 2.4s ease 0.2s infinite",
                          pointerEvents: "none",
                        }}
                      />
                    )}

                    {/* Numeral */}
                    <div
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: isActive
                          ? `${GOLD}cc`
                          : "rgba(229,224,198,0.22)",
                        letterSpacing: "0.28em",
                        fontFamily: "'Cormorant Garamond', Georgia, serif",
                        fontStyle: "italic",
                        marginBottom: 7,
                        transition: "color 0.3s ease",
                      }}
                    >
                      {TAB_NUMERALS[idx]}
                    </div>

                    {/* Tab title */}
                    <div
                      style={{
                        fontSize: "clamp(15px, 1.5vw, 20px)",
                        fontWeight: 800,
                        color: isActive ? CREAM : "rgba(229,224,198,0.98)",
                        letterSpacing: "-0.01em",
                        lineHeight: 1.2,
                        transition: "color 0.35s ease",
                        fontFamily: "'Jost', sans-serif",
                      }}
                    >
                      {t(`aboutPage.platform.tabs.${key}.title`)}
                    </div>

                    {/* Short teaser line */}
                    <div
                      style={{
                        fontSize: 14.5,
                        fontWeight: 400,
                        color: isActive
                          ? "rgba(229,224,198,0.95)"
                          : "rgba(229,224,198,0.6)",
                        letterSpacing: "0.02em",
                        marginTop: 5,
                        lineHeight: 1.5,
                        transition: "color 0.35s ease",
                        overflow: "hidden",
                        display: "-webkit-box",
                        WebkitLineClamp: 1,
                        WebkitBoxOrient: "vertical",
                      }}
                    >
                      {t(`aboutPage.platform.tabs.${key}.teaser`)}
                    </div>

                    {/* Progress bar — only on active + auto-advance */}
                    {isActive && !userInteracted && (
                      <div
                        className="ap-progress-bar running"
                        key={`${key}-progress`}
                      />
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* ── RIGHT — Content panel ── */}
          <div
            style={{
              position: "relative",
              borderRadius: 24,
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(229,224,198,0.08)",
              backdropFilter: "blur(20px)",
              boxShadow:
                "0 8px 56px rgba(0,0,0,0.38), inset 0 1px 0 rgba(255,255,255,0.045)",
              overflow: "hidden",
            }}
          >
            {/* Panel top accent line */}
            <div
              style={{
                position: "absolute",
                top: 0,
                left: "8%",
                right: "8%",
                height: 2,
                background: `linear-gradient(90deg, transparent, ${GOLD}, transparent)`,
                opacity: 0.55,
                borderRadius: 999,
              }}
            />

            {/* Corner glow */}
            <div
              style={{
                position: "absolute",
                top: -60,
                right: -60,
                width: 240,
                height: 240,
                borderRadius: "50%",
                background: `radial-gradient(circle, rgba(201,169,110,0.08) 0%, transparent 65%)`,
                pointerEvents: "none",
              }}
            />

            {/* Stacked panels (all rendered, toggled by opacity) */}
            <div className="ap-panel-wrapper">
              {TAB_KEYS.map((key, idx) => (
                <TabPanel
                  key={key}
                  tabKey={key}
                  numeral={TAB_NUMERALS[idx]}
                  visible={visible}
                  active={activeTab === key}
                />
              ))}
            </div>
          </div>
        </div>

        {/* ── Bottom decorative divider ── */}
        <div
          style={{
            maxWidth: 1100,
            margin: "72px auto 0",
            display: "flex",
            alignItems: "center",
            gap: 16,
            opacity: visible ? 1 : 0,
            transition: "opacity 0.8s ease 0.6s",
          }}
        >
          <div
            style={{
              flex: 1,
              height: 1,
              background:
                "linear-gradient(90deg, transparent, rgba(229,224,198,0.08))",
            }}
          />
          <span
            style={{
              fontFamily: "'Cormorant Garamond', Georgia, serif",
              fontSize: 18,
              color: `${GOLD}55`,
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
                "linear-gradient(90deg, rgba(229,224,198,0.08), transparent)",
            }}
          />
        </div>
      </section>
    </>
  );
}
