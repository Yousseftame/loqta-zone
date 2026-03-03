import React, { useRef, useState, useEffect } from "react";
import { useTranslation } from "react-i18next";

const GOLD = "#c9a96e";
const CREAM = "rgb(229,224,198)";

function useInView(
  ref: React.RefObject<HTMLDivElement | null>,
  threshold = 0.12,
) {
  const [v, setV] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setV(true);
          obs.disconnect();
        }
      },
      { threshold },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return v;
}

function useScrollProgress(ref: React.RefObject<HTMLDivElement | null>) {
  const [p, setP] = useState(0);
  useEffect(() => {
    const fn = () => {
      const el = ref.current;
      if (!el) return;
      const { top, height } = el.getBoundingClientRect();
      setP(
        Math.max(
          0,
          Math.min(
            1,
            (window.innerHeight - top) / (window.innerHeight + height),
          ),
        ),
      );
    };
    window.addEventListener("scroll", fn, { passive: true });
    fn();
    return () => window.removeEventListener("scroll", fn);
  }, []);
  return p;
}

// ── Hoverable column wrapper ──────────────────────────────────
function VmColumn({
  children,
  visible,
  slideDir,
  delay = 0,
  extraStyle = {},
}: {
  children: React.ReactNode;
  visible: boolean;
  slideDir: "left" | "right";
  delay?: number;
  extraStyle?: React.CSSProperties;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="vm-col"
      data-hovered={hovered ? "true" : "false"}
      style={{
        position: "relative",
        padding: "72px 64px 96px 64px",
        opacity: visible ? 1 : 0,
        transform: visible
          ? hovered
            ? "translateY(-4px)"
            : "translateY(0)"
          : `translateX(${slideDir === "left" ? "-44px" : "44px"})`,
        transition: [
          `opacity 1.1s cubic-bezier(.22,1,.36,1) ${delay}s`,
          `transform ${visible ? "0.4s" : `1.1s cubic-bezier(.22,1,.36,1) ${delay}s`} ease`,
          "background 0.45s ease",
          "box-shadow 0.45s ease",
        ].join(", "),
        background: hovered ? "rgba(201,169,110,0.05)" : "transparent",
        boxShadow: hovered ? "inset 0 0 80px rgba(201,169,110,0.05)" : "none",
        cursor: "default",
        ...extraStyle,
      }}
    >
      {/* top hover accent line */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: hovered ? "5%" : "40%",
          right: hovered ? "5%" : "40%",
          height: 2,
          background: `linear-gradient(90deg, transparent, ${GOLD}, transparent)`,
          opacity: hovered ? 0.7 : 0,
          transition:
            "left 0.55s cubic-bezier(.22,1,.36,1), right 0.55s cubic-bezier(.22,1,.36,1), opacity 0.4s ease",
          borderRadius: 999,
          zIndex: 2,
        }}
      />

      {/* left vertical glow bar */}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: hovered ? "8%" : "40%",
          bottom: hovered ? "8%" : "40%",
          width: 2,
          background: `linear-gradient(to bottom, transparent, ${GOLD}66, transparent)`,
          opacity: hovered ? 1 : 0,
          transition:
            "opacity 0.4s ease, top 0.55s cubic-bezier(.22,1,.36,1), bottom 0.55s cubic-bezier(.22,1,.36,1)",
          borderRadius: 999,
        }}
      />

      {children}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// MAIN
// ══════════════════════════════════════════════════════════════
export default function AboutVisionMission() {
  const secRef = useRef<HTMLDivElement>(null);
  const headRef = useRef<HTMLDivElement>(null);
  const vRef = useRef<HTMLDivElement>(null);
  const mRef = useRef<HTMLDivElement>(null);

  const progress = useScrollProgress(secRef);
  const headVis = useInView(headRef, 0.1);
  const vVis = useInView(vRef, 0.15);
  const mVis = useInView(mRef, 0.15);

  const { t } = useTranslation();

  return (
    <>
      <style>{`
        @keyframes vmFadeUp { from{opacity:0;transform:translateY(36px)} to{opacity:1;transform:translateY(0)} }
        @keyframes vmFadeIn { from{opacity:0} to{opacity:1} }
        @keyframes vmGrow   { from{transform:scaleX(0);transform-origin:left} to{transform:scaleX(1);transform-origin:left} }
        @keyframes vmPulse  { 0%,100%{opacity:.45;transform:scale(1)} 50%{opacity:.75;transform:scale(1.06)} }
        @keyframes vmOrnamGrow { from{width:28px} to{width:52px} }

        .vm-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0;
        }
        .vm-ornament-line { width: 28px; transition: width .5s cubic-bezier(.22,1,.36,1); }
        .vm-ornament-dot  { transition: transform .4s ease, background .4s ease, box-shadow .4s ease; }
        .vm-col:hover .vm-ornament-line { width: 52px; }
        .vm-col:hover .vm-ornament-dot  { transform: scale(1.7); background: ${GOLD} !important; box-shadow: 0 0 10px rgba(201,169,110,.65); }
        .vm-col:hover .vm-label-text    { letter-spacing: .42em !important; }
        .vm-col:hover .vm-heading       { text-shadow: 0 2px 32px rgba(201,169,110,.18); }
        .vm-col:hover .vm-body          { color: rgba(229,224,198,.7) !important; }

        @media(max-width:780px){
          .vm-grid { grid-template-columns: 1fr !important; }
          .vm-col + .vm-col { border-top: 1px solid rgba(201,169,110,.12) !important; border-left: none !important; }
        }
      `}</style>

      <section
        ref={secRef}
        style={{
          position: "relative",
          background:
            "linear-gradient(180deg,#0a0a1a 0%,#07101e 50%,#0a0a1a 100%)",
          overflow: "hidden",
        }}
      >
        {/* top rule */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 1,
            background: `linear-gradient(90deg,transparent,${GOLD},rgba(229,224,198,.45),${GOLD},transparent)`,
            opacity: 0.28,
          }}
        />

        {/* scroll rail */}
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: 2,
            height: "100%",
            background: "rgba(201,169,110,.05)",
            zIndex: 2,
          }}
        >
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: `${progress * 100}%`,
              background: `linear-gradient(to bottom,transparent,${GOLD}55,${GOLD})`,
              transition: "height .06s linear",
            }}
          />
        </div>

        {/* atmosphere */}
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
          <div
            style={{
              position: "absolute",
              top: "15%",
              left: "5%",
              width: 580,
              height: 580,
              borderRadius: "50%",
              background:
                "radial-gradient(circle,rgba(42,72,99,.17) 0%,transparent 65%)",
              animation: "vmPulse 10s ease-in-out infinite",
            }}
          />
          <div
            style={{
              position: "absolute",
              bottom: "10%",
              right: "4%",
              width: 480,
              height: 480,
              borderRadius: "50%",
              background: `radial-gradient(circle,rgba(201,169,110,.065) 0%,transparent 65%)`,
              animation: "vmPulse 13s ease-in-out 3s infinite",
            }}
          />
          {[360, 660, 980].map((s, i) => (
            <div
              key={i}
              style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%,-50%)",
                width: s,
                height: s,
                borderRadius: "50%",
                border: `1px solid rgba(201,169,110,${0.042 - i * 0.012})`,
              }}
            />
          ))}
        </div>

        {/* ══ BIG SECTION TITLE ══ */}
        <div
          ref={headRef}
          style={{
            maxWidth: 1280,
            margin: "0 auto",
            padding: "110px 64px 80px",
            position: "relative",
            zIndex: 1,
          }}
        >
          {/* eyebrow */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              marginBottom: 32,
              opacity: headVis ? 1 : 0,
              transition: "opacity .7s ease .05s",
            }}
          >
            <div
              style={{
                width: 36,
                height: 1,
                background: `linear-gradient(90deg,transparent,${GOLD})`,
              }}
            />
            <span
              style={{
                fontFamily: "'Jost',sans-serif",
                fontSize: 10,
                fontWeight: 800,
                color: GOLD,
                letterSpacing: ".32em",
                textTransform: "uppercase",
              }}
            >
              {t("aboutPage.vm.eyebrow")}
            </span>
          </div>

          {/* Giant title */}
          <div style={{ overflow: "hidden" }}>
            <h2
              style={{
                margin: 0,
                fontFamily: "'Cormorant Garamond',Georgia,serif",
                fontSize: "clamp(52px,8vw,108px)",
                fontWeight: 700,
                letterSpacing: "-.03em",
                lineHeight: 0.9,
                color: CREAM,
                animation: headVis
                  ? "vmFadeUp 1s cubic-bezier(.22,1,.36,1) .1s both"
                  : "none",
              }}
            >
              {t("aboutPage.vm.titleWord1")}{" "}
              <span
                style={{
                  color: "transparent",
                  WebkitTextStroke: `1.5px ${GOLD}`,
                  fontStyle: "italic",
                }}
              >
                &amp;
              </span>{" "}
              <span style={{ fontStyle: "italic", color: GOLD }}>
                {t("aboutPage.vm.titleWord2")}
              </span>
            </h2>
          </div>

        
        </div>

        {/* ══ TWO-COLUMN PANEL ══ */}
        <div
          className="vm-grid"
          style={{
            maxWidth: 1280,
            margin: "0 auto",
            position: "relative",
            zIndex: 1,
          }}
        >
          {/* ── VISION COL ── */}
          <div ref={vRef}>
            <VmColumn
              visible={vVis}
              slideDir="left"
              extraStyle={{
                borderTop: `1px solid rgba(201,169,110,.12)`,
                borderRight: `1px solid rgba(201,169,110,.12)`,
              }}
            >
              {/* corner glow */}
              <div
                style={{
                  position: "absolute",
                  top: -60,
                  left: -60,
                  width: 280,
                  height: 280,
                  borderRadius: "50%",
                  pointerEvents: "none",
                  background: `radial-gradient(circle,rgba(201,169,110,.07) 0%,transparent 70%)`,
                }}
              />

              {/* LABEL — larger now */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  marginBottom: 36,
                  opacity: vVis ? 1 : 0,
                  transition: "opacity .7s ease .2s",
                }}
              >
                <div
                  style={{
                    height: 1,
                    width: 0,
                    background: `linear-gradient(90deg,${GOLD},transparent)`,
                    animation: vVis ? "vmGrow .8s ease .35s forwards" : "none",
                    minWidth: 0,
                  }}
                />
                <span
                  className="vm-label-text"
                  style={{
                    fontFamily: "'Jost',sans-serif",
                    fontSize: 13, // ← up from 9px
                    fontWeight: 800,
                    color: GOLD,
                    letterSpacing: ".32em",
                    textTransform: "uppercase",
                    transition: "letter-spacing .5s cubic-bezier(.22,1,.36,1)",
                  }}
                >
                  {t("aboutPage.vm.visionLabel")}
                </span>
              </div>

              {/* heading */}
              <div style={{ overflow: "hidden", marginBottom: 28 }}>
                <h3
                  className="vm-heading"
                  style={{
                    margin: 0,
                    fontFamily: "'Cormorant Garamond',Georgia,serif",
                    fontSize: "clamp(32px,4vw,56px)",
                    fontWeight: 600,
                    fontStyle: "italic",
                    color: CREAM,
                    letterSpacing: "-.02em",
                    lineHeight: 1.1,
                    transition: "text-shadow .4s ease",
                    animation: vVis
                      ? "vmFadeUp 1s cubic-bezier(.22,1,.36,1) .18s both"
                      : "none",
                  }}
                >
                  {t("aboutPage.vm.visionHeading")}
                </h3>
              </div>

              {/* ornament */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 36,
                  opacity: vVis ? 1 : 0,
                  transition: "opacity .7s ease .5s",
                }}
              >
                <div
                  className="vm-ornament-line"
                  style={{
                    height: 1,
                    background: `${GOLD}66`,
                    borderRadius: 999,
                  }}
                />
                <div
                  className="vm-ornament-dot"
                  style={{
                    width: 5,
                    height: 5,
                    borderRadius: "50%",
                    background: `${GOLD}55`,
                  }}
                />
              </div>

              {/* body */}
              <p
                className="vm-body"
                style={{
                  margin: 0,
                  fontFamily: "'Jost',sans-serif",
                  fontSize: "clamp(14px,1.2vw,17px)",
                  fontWeight: 300,
                  color: "rgba(229,224,198,.55)",
                  lineHeight: 1.95,
                  letterSpacing: ".02em",
                  maxWidth: 520,
                  transition: "color .4s ease",
                  opacity: vVis ? 1 : 0,
                  transform: vVis ? "translateY(0)" : "translateY(18px)",
                  // @ts-ignore
                  "--entry-transition":
                    "opacity .9s ease .6s,transform .9s ease .6s",
                }}
              >
                {t("aboutPage.vm.visionBody")}
              </p>
            </VmColumn>
          </div>

          {/* ── MISSION COL ── */}
          <div ref={mRef}>
            <VmColumn
              visible={mVis}
              slideDir="right"
              delay={0.15}
              extraStyle={{
                borderTop: `1px solid rgba(201,169,110,.12)`,
              }}
            >
              {/* corner glow */}
              <div
                style={{
                  position: "absolute",
                  top: -60,
                  right: -60,
                  width: 280,
                  height: 280,
                  borderRadius: "50%",
                  pointerEvents: "none",
                  background: `radial-gradient(circle,rgba(42,72,99,.12) 0%,transparent 70%)`,
                }}
              />

              {/* LABEL — larger */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  marginBottom: 36,
                  opacity: mVis ? 1 : 0,
                  transition: "opacity .7s ease .2s",
                }}
              >
                <div
                  style={{
                    height: 1,
                    width: 0,
                    background: `linear-gradient(90deg,${GOLD},transparent)`,
                    animation: mVis ? "vmGrow .8s ease .35s forwards" : "none",
                    minWidth: 0,
                  }}
                />
                <span
                  className="vm-label-text"
                  style={{
                    fontFamily: "'Jost',sans-serif",
                    fontSize: 13,
                    fontWeight: 800,
                    color: GOLD,
                    letterSpacing: ".32em",
                    textTransform: "uppercase",
                    transition: "letter-spacing .5s cubic-bezier(.22,1,.36,1)",
                  }}
                >
                  {t("aboutPage.vm.missionLabel")}
                </span>
              </div>

              {/* heading */}
              <div style={{ overflow: "hidden", marginBottom: 28 }}>
                <h3
                  className="vm-heading"
                  style={{
                    margin: 0,
                    fontFamily: "'Cormorant Garamond',Georgia,serif",
                    fontSize: "clamp(32px,4vw,56px)",
                    fontWeight: 600,
                    fontStyle: "italic",
                    color: CREAM,
                    letterSpacing: "-.02em",
                    lineHeight: 1.1,
                    transition: "text-shadow .4s ease",
                    animation: mVis
                      ? "vmFadeUp 1s cubic-bezier(.22,1,.36,1) .18s both"
                      : "none",
                  }}
                >
                  {t("aboutPage.vm.missionHeading")}
                </h3>
              </div>

              {/* ornament */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 36,
                  opacity: mVis ? 1 : 0,
                  transition: "opacity .7s ease .5s",
                }}
              >
                <div
                  className="vm-ornament-line"
                  style={{
                    height: 1,
                    background: `${GOLD}66`,
                    borderRadius: 999,
                  }}
                />
                <div
                  className="vm-ornament-dot"
                  style={{
                    width: 5,
                    height: 5,
                    borderRadius: "50%",
                    background: `${GOLD}55`,
                  }}
                />
              </div>

              {/* body */}
              <p
                className="vm-body"
                style={{
                  margin: 0,
                  fontFamily: "'Jost',sans-serif",
                  fontSize: "clamp(14px,1.2vw,17px)",
                  fontWeight: 300,
                  color: "rgba(229,224,198,.55)",
                  lineHeight: 1.95,
                  letterSpacing: ".02em",
                  maxWidth: 520,
                  transition: "color .4s ease",
                  opacity: mVis ? 1 : 0,
                  transform: mVis ? "translateY(0)" : "translateY(18px)",
                }}
              >
                {t("aboutPage.vm.missionBody")}
              </p>
            </VmColumn>
          </div>
        </div>

        {/* ── bottom divider ── */}
        <div
          style={{
            maxWidth: 1280,
            margin: "0 auto",
            padding: "56px 64px 80px",
            position: "relative",
            zIndex: 1,
            opacity: mVis ? 1 : 0,
            transition: "opacity .9s ease .8s",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div
              style={{
                flex: 1,
                height: 1,
                background:
                  "linear-gradient(90deg,transparent,rgba(201,169,110,.18))",
              }}
            />
            <span
              style={{
                fontFamily: "'Cormorant Garamond',Georgia,serif",
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
                  "linear-gradient(90deg,rgba(201,169,110,.18),transparent)",
              }}
            />
          </div>
        </div>
      </section>
    </>
  );
}
