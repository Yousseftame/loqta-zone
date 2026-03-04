import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

// ── Tokens ────────────────────────────────────────────────────
const GOLD = "#c9a96e";
const NAVY = "#2A4863";
const NAVY2 = "#1e3652";
const CREAM = "rgb(229, 224, 198)";

interface LoginPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGoToLogin: () => void;
}

export default function LoginPromptModal({
  isOpen,
  onClose,
  onGoToLogin,
}: LoginPromptModalProps) {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === "ar";

  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [loginHov, setLoginHov] = useState(false);
  const [cancelHov, setCancelHov] = useState(false);

  /* ── mount / unmount ───────────────────────────────────────── */
  useEffect(() => {
    if (isOpen) {
      setMounted(true);
      requestAnimationFrame(() =>
        requestAnimationFrame(() => setVisible(true)),
      );
    } else {
      setVisible(false);
      const id = setTimeout(() => setMounted(false), 500);
      return () => clearTimeout(id);
    }
  }, [isOpen]);

  /* ── keyboard + scroll lock ────────────────────────────────── */
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  if (!mounted) return null;

  const arrow = isRtl ? "←" : "→";
  const fillOrigin = isRtl ? "right" : "left";

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,600;1,600;1,900&family=Jost:wght@300;500;700;800&display=swap');

        @keyframes lpm-scan {
          0%   { transform: translateY(-100%); opacity: 0.6; }
          100% { transform: translateY(500%);  opacity: 0;   }
        }
        @keyframes lpm-blink {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.25; }
        }
        @keyframes lpm-orbit {
          from { transform: rotate(0deg)   translateX(28px) rotate(0deg); }
          to   { transform: rotate(360deg) translateX(28px) rotate(-360deg); }
        }
        @keyframes lpm-glow-breathe {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50%       { opacity: 0.65; transform: scale(1.06); }
        }

        .lpm-scan-line { animation: lpm-scan 2.6s cubic-bezier(.4,0,.6,1) infinite; }
        .lpm-blink-dot { animation: lpm-blink 1.4s ease-in-out infinite; }
        .lpm-orbit-dot { animation: lpm-orbit 3.2s linear infinite; }
        .lpm-glow-anim { animation: lpm-glow-breathe 2.8s ease-in-out infinite; }
      `}</style>

      {/* ── Backdrop ─────────────────────────────────────────── */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 9998,
          background: "rgba(3, 6, 16, 0.9)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          opacity: visible ? 1 : 0,
          transition: "opacity 0.45s ease",
        }}
      />

      {/* ── Centering shell ───────────────────────────────────── */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 9999,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 20,
          pointerEvents: "none",
        }}
      >
        {/* ══════ MODAL CARD ══════════════════════════════════════ */}
        <div
          dir={isRtl ? "rtl" : "ltr"}
          onClick={(e) => e.stopPropagation()}
          style={{
            pointerEvents: "auto",
            width: "100%",
            maxWidth: 500,
            borderRadius: 6,
            overflow: "hidden",
            background: "#05080f",
            border: `1px solid rgba(201,169,110,0.25)`,
            boxShadow: `
              0 0 0 1px rgba(201,169,110,0.05),
              0 60px 140px rgba(0,0,0,0.9),
              0 0 60px rgba(201,169,110,0.04) inset
            `,
            opacity: visible ? 1 : 0,
            transform: visible
              ? "translateY(0) scale(1)"
              : "translateY(52px) scale(0.95)",
            transition:
              "opacity 0.48s cubic-bezier(0.22,1,0.36,1), transform 0.48s cubic-bezier(0.22,1,0.36,1)",
            fontFamily: "'Jost', sans-serif",
            position: "relative",
          }}
        >
          {/* accent bar — start edge (left in LTR, right in RTL via dir) */}
          <div
            style={{
              position: "absolute",
              insetInlineStart: 0,
              top: 0,
              bottom: 0,
              width: 3,
              background: `linear-gradient(to bottom, transparent 0%, ${GOLD} 30%, ${GOLD} 70%, transparent 100%)`,
              opacity: 0.7,
            }}
          />

          {/* scan line */}
          <div
            className="lpm-scan-line"
            style={{
              position: "absolute",
              inset: "0 0 auto 0",
              height: "35%",
              background: `linear-gradient(to bottom, transparent, rgba(201,169,110,0.035), transparent)`,
              pointerEvents: "none",
              zIndex: 0,
            }}
          />

          {/* top-end corner bracket (top-right LTR / top-left RTL) */}
          <svg
            width="48"
            height="48"
            viewBox="0 0 48 48"
            style={{
              position: "absolute",
              top: 0,
              ...(isRtl ? { left: 0 } : { right: 0 }),
              opacity: 0.22,
              pointerEvents: "none",
              ...(isRtl ? { transform: "scaleX(-1)" } : {}),
            }}
          >
            <path d="M48 0 L48 48 L0 0 Z" fill={GOLD} />
          </svg>
          <svg
            width="28"
            height="28"
            viewBox="0 0 28 28"
            style={{
              position: "absolute",
              top: 6,
              ...(isRtl ? { left: 6 } : { right: 6 }),
              opacity: 0.5,
              pointerEvents: "none",
            }}
          >
            <line
              x1={isRtl ? "0" : "28"}
              y1="0"
              x2={isRtl ? "0" : "28"}
              y2="28"
              stroke={GOLD}
              strokeWidth="0.8"
            />
            <line
              x1="0"
              y1="0"
              x2="28"
              y2="0"
              stroke={GOLD}
              strokeWidth="0.8"
            />
          </svg>

          {/* bottom-start corner bracket */}
          <svg
            width="48"
            height="48"
            viewBox="0 0 48 48"
            style={{
              position: "absolute",
              bottom: 0,
              ...(isRtl ? { right: 0 } : { left: 0 }),
              opacity: 0.22,
              pointerEvents: "none",
              ...(isRtl ? { transform: "scaleX(-1)" } : {}),
            }}
          >
            <path d="M0 48 L0 0 L48 48 Z" fill={GOLD} />
          </svg>

          {/* ── TOP STATUS BAR ───────────────────────────────── */}
          <div
            style={{
              background: `linear-gradient(${isRtl ? "270deg" : "90deg"}, ${NAVY2}cc, #0b1a2bcc)`,
              borderBottom: `1px solid rgba(201,169,110,0.18)`,
              padding: "10px 18px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              position: "relative",
              zIndex: 1,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
              <span
                className="lpm-blink-dot"
                style={{
                  display: "inline-block",
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: GOLD,
                  boxShadow: `0 0 7px ${GOLD}`,
                }}
              />
              <span
                style={{
                  fontSize: 8.5,
                  fontWeight: 800,
                  letterSpacing: isRtl ? "0.04em" : "0.32em",
                  textTransform: "uppercase",
                  color: `${GOLD}bb`,
                }}
              >
                {t("loginModal.eyebrow")}
              </span>
            </div>
            <button
              onClick={onClose}
              style={{
                background: "none",
                border: `1px solid rgba(201,169,110,0.15)`,
                color: "rgba(201,169,110,0.38)",
                width: 26,
                height: 26,
                borderRadius: 3,
                cursor: "pointer",
                fontSize: 13,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "all 0.25s ease",
                fontFamily: "inherit",
              }}
              onMouseEnter={(e) => {
                const b = e.currentTarget;
                b.style.background = `rgba(201,169,110,0.1)`;
                b.style.borderColor = `rgba(201,169,110,0.4)`;
                b.style.color = GOLD;
              }}
              onMouseLeave={(e) => {
                const b = e.currentTarget;
                b.style.background = "none";
                b.style.borderColor = "rgba(201,169,110,0.15)";
                b.style.color = "rgba(201,169,110,0.38)";
              }}
            >
              ✕
            </button>
          </div>

          {/* ── SPLIT BODY ────────────────────────────────────── */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1.6fr",
              position: "relative",
              zIndex: 1,
            }}
          >
            {/* ── LEFT — visual panel ──────────────────────── */}
            <div
              style={{
                background: `linear-gradient(160deg, ${NAVY2} 0%, #070d18 100%)`,
                borderInlineEnd: `1px solid rgba(201,169,110,0.12)`,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: "36px 18px",
                gap: 18,
                position: "relative",
                overflow: "hidden",
              }}
            >
              {/* dot-grid */}
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  backgroundImage: `radial-gradient(circle, rgba(201,169,110,0.07) 1px, transparent 1px)`,
                  backgroundSize: "18px 18px",
                  pointerEvents: "none",
                }}
              />
              {/* breathing glow */}
              <div
                className="lpm-glow-anim"
                style={{
                  position: "absolute",
                  width: 140,
                  height: 140,
                  borderRadius: "50%",
                  background: `radial-gradient(circle, rgba(201,169,110,0.16) 0%, transparent 70%)`,
                  pointerEvents: "none",
                }}
              />
              {/* icon + orbit */}
              <div
                style={{
                  position: "relative",
                  width: 72,
                  height: 72,
                  flexShrink: 0,
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    borderRadius: "50%",
                    border: `1px solid rgba(201,169,110,0.2)`,
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    inset: 9,
                    borderRadius: "50%",
                    background: `linear-gradient(135deg, ${NAVY}, ${NAVY2})`,
                    border: `1.5px solid rgba(201,169,110,0.32)`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 22,
                    boxShadow: `0 4px 22px rgba(0,0,0,0.55), 0 0 18px rgba(201,169,110,0.1)`,
                  }}
                >
                  🔑
                </div>
                <div
                  style={{
                    position: "absolute",
                    top: "50%",
                    left: "50%",
                    marginTop: -3,
                    marginLeft: -3,
                  }}
                >
                  <div
                    className="lpm-orbit-dot"
                    style={{
                      width: 5,
                      height: 5,
                      borderRadius: "50%",
                      background: GOLD,
                      boxShadow: `0 0 7px ${GOLD}`,
                    }}
                  />
                </div>
              </div>
              {/* label tag */}
              <div
                style={{
                  background: `rgba(201,169,110,0.07)`,
                  border: `1px solid rgba(201,169,110,0.2)`,
                  borderRadius: 3,
                  padding: "4px 12px",
                  fontSize: 8.5,
                  fontWeight: 800,
                  letterSpacing: isRtl ? "0.04em" : "0.22em",
                  color: `${GOLD}aa`,
                  textTransform: "uppercase",
                  position: "relative",
                  zIndex: 1,
                }}
              >
                {t("loginModal.membersOnly")}
              </div>
              {/* deco lines */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 5,
                  width: "75%",
                  alignItems: "center",
                  position: "relative",
                  zIndex: 1,
                }}
              >
                {[1, 0.55, 0.22].map((op, i) => (
                  <div
                    key={i}
                    style={{
                      height: 1,
                      width: `${100 - i * 18}%`,
                      background: `rgba(201,169,110,${op * 0.28})`,
                      borderRadius: 999,
                    }}
                  />
                ))}
              </div>
            </div>

            {/* ── RIGHT — text + actions ────────────────────── */}
            <div
              style={{
                padding: "30px 26px 26px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                gap: 18,
              }}
            >
              {/* copy */}
              <div>
                <p
                  style={{
                    margin: "0 0 9px",
                    fontSize: 8.5,
                    fontWeight: 800,
                    letterSpacing: isRtl ? "0.04em" : "0.28em",
                    textTransform: "uppercase",
                    color: `${GOLD}77`,
                  }}
                >
                  {t("loginModal.subtitle_label")}
                </p>
                <h2
                  style={{
                    margin: "0 0 12px",
                    fontFamily: isRtl
                      ? "'Jost', sans-serif"
                      : "'Cormorant Garamond', Georgia, serif",
                    fontSize: "clamp(20px, 3vw, 25px)",
                    fontWeight: isRtl ? 700 : 600,
                    fontStyle: isRtl ? "normal" : "italic",
                    color: CREAM,
                    lineHeight: 1.3,
                    letterSpacing: isRtl ? "0" : "-0.01em",
                  }}
                >
                  {t("loginModal.title")}
                </h2>
                <p
                  style={{
                    margin: 0,
                    fontSize: 12.5,
                    lineHeight: 1.75,
                    color: "rgba(229,224,198,0.42)",
                    fontWeight: 300,
                    letterSpacing: "0.01em",
                  }}
                >
                  {t("loginModal.subtitle")}
                </p>
              </div>

              {/* hairline */}
              <div
                style={{
                  height: 1,
                  background: isRtl
                    ? `linear-gradient(270deg, rgba(201,169,110,0.18), transparent)`
                    : `linear-gradient(90deg, rgba(201,169,110,0.18), transparent)`,
                }}
              />

              {/* ── Buttons ──────────────────────────────────── */}
              <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                {/* PRIMARY */}
                <button
                  onClick={onGoToLogin}
                  onMouseEnter={() => setLoginHov(true)}
                  onMouseLeave={() => setLoginHov(false)}
                  style={{
                    position: "relative",
                    overflow: "hidden",
                    width: "100%",
                    height: 48,
                    borderRadius: 4,
                    border: `1px solid ${loginHov ? GOLD : `rgba(201,169,110,0.45)`}`,
                    background: "transparent",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "0 18px",
                    transition: "border-color 0.3s ease, box-shadow 0.35s ease",
                    boxShadow: loginHov
                      ? `0 6px 28px rgba(201,169,110,0.2), inset 0 1px 0 rgba(201,169,110,0.08)`
                      : "none",
                    fontFamily: "inherit",
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      background: `linear-gradient(${isRtl ? "270deg" : "90deg"}, ${NAVY2}f0, ${NAVY}f0)`,
                      transform: loginHov ? "scaleX(1)" : "scaleX(0)",
                      transformOrigin: fillOrigin,
                      transition: "transform 0.38s cubic-bezier(0.22,1,0.36,1)",
                    }}
                  />
                  <span
                    style={{
                      position: "relative",
                      fontSize: 10.5,
                      fontWeight: 800,
                      letterSpacing: isRtl ? "0.04em" : "0.22em",
                      textTransform: "uppercase",
                      color: loginHov ? GOLD : "rgba(229,224,198,0.7)",
                      transition: "color 0.3s ease",
                    }}
                  >
                    {t("loginModal.loginBtn")}
                  </span>
                  <span
                    style={{
                      position: "relative",
                      fontSize: 16,
                      color: loginHov ? GOLD : "rgba(229,224,198,0.25)",
                      transform: loginHov
                        ? `translateX(${isRtl ? "-5px" : "5px"})`
                        : "translateX(0)",
                      transition: "all 0.3s ease",
                    }}
                  >
                    {arrow}
                  </span>
                </button>

                {/* SECONDARY — Maybe Later (more visible now) */}
                <button
                  onClick={onClose}
                  onMouseEnter={() => setCancelHov(true)}
                  onMouseLeave={() => setCancelHov(false)}
                  style={{
                    width: "100%",
                    height: 38,
                    borderRadius: 4,
                    // Resting state: gold-tinted border + faint warm bg — easy to notice
                    border: `1px solid rgba(201,169,110,${cancelHov ? "0.32" : "0.2"})`,
                    background: cancelHov
                      ? "rgba(201,169,110,0.06)"
                      : "rgba(201,169,110,0.03)",
                    cursor: "pointer",
                    fontSize: 9.5,
                    fontWeight: 700,
                    letterSpacing: isRtl ? "0.04em" : "0.22em",
                    textTransform: "uppercase",
                    // Resting text is visibly readable, not just a ghost
                    color: `rgba(229,224,198,${cancelHov ? "0.58" : "0.42"})`,
                    transition: "all 0.25s ease",
                    fontFamily: "inherit",
                  }}
                >
                  {t("loginModal.cancelBtn")}
                </button>
              </div>

              {/* trust note */}
              <p
                style={{
                  margin: 0,
                  fontSize: 9.5,
                  color: "rgba(229,224,198,0.18)",
                  letterSpacing: "0.07em",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  justifyContent: isRtl ? "flex-end" : "flex-start",
                }}
              >
                <span style={{ color: `${GOLD}44`, fontSize: 10 }}>✦</span>
                {t("loginModal.trustNote")}
              </p>
            </div>
          </div>

          {/* ── BOTTOM STRIP ──────────────────────────────────── */}
          <div
            style={{
              borderTop: `1px solid rgba(201,169,110,0.08)`,
              padding: "7px 18px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              background: "rgba(201,169,110,0.015)",
              position: "relative",
              zIndex: 1,
            }}
          >
            <span
              style={{
                fontSize: 8,
                fontWeight: 800,
                letterSpacing: "0.26em",
                textTransform: "uppercase",
                color: "rgba(201,169,110,0.22)",
              }}
            >
              LOQTA ZONE
            </span>
            <div style={{ display: "flex", gap: 5 }}>
              {[0.1, 0.18, 0.28].map((op, i) => (
                <div
                  key={i}
                  style={{
                    width: 4,
                    height: 4,
                    borderRadius: "50%",
                    background: `rgba(201,169,110,${op})`,
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
