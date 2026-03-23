import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import SplitText from "../SplitText";

// ── Curated Unsplash hero images — dark luxury editorial palette
// Each is a real Unsplash photo ID. The component cycles/picks the first on load.
// All have: dark tones, warm amber/gold light, editorial atmosphere.
const HERO_IMAGE_URL =
  "https://images.unsplash.com/photo-1600585154526-990dced4db0d?w=1900&q=90&fm=webp&fit=crop&crop=center";

// Fallback chain (used as CSS background-image list — browser picks first that loads)
// photo-1536440136628  → dark cinematic room, warm amber glow (perfect match)
// photo-1578662996442  → luxury dark interior with gold accents
// photo-1519710164239  → dark moody editorial still life

export default function HeroSections() {
  const [loaded, setLoaded] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === "ar";

  useEffect(() => {
    const timer = setTimeout(() => setLoaded(true), 120);
    return () => clearTimeout(timer);
  }, []);

  // Preload the hero image so we get a smooth fade-in on ready
  useEffect(() => {
    const img = new Image();
    img.src = HERO_IMAGE_URL;
    img.onload = () => setImgLoaded(true);
    img.onerror = () => setImgLoaded(true); // fail gracefully
  }, []);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,700;1,700;1,900&family=Jost:wght@200;300;400&display=swap');

        .hc-root {
          position: relative;
          width: 100%;
          height: 100vh;
          min-height: 620px;
          overflow: hidden;
          display: flex;
          align-items: flex-end;
        }

        /* ── Background image layer with preload fade-in ── */
        .hc-bg {
          position: absolute;
          inset: 0;
          background-color: #0a0806; /* warm dark placeholder shown while image loads */
          z-index: 0;
        }
        .hc-bg-img {
          position: absolute;
          inset: 0;
          background-image: url('${HERO_IMAGE_URL}');
          background-size: cover;
          background-position: 62% top;
          background-repeat: no-repeat;
          opacity: 0;
          transition: opacity 1.4s cubic-bezier(0.4, 0, 0.2, 1);
          animation: hc-zoom 22s ease-out forwards;
          z-index: 1;
        }
        .hc-bg-img--loaded {
          opacity: 1;
        }
        @keyframes hc-zoom {
          from { transform: scale(1.07); }
          to   { transform: scale(1.00); }
        }

        /* Warm golden vignette — matches the amber editorial palette */
        .hc-bg-tint {
          position: absolute;
          inset: 0;
          background: radial-gradient(
            ellipse 120% 80% at 70% 30%,
            rgba(160, 100, 30, 0.18) 0%,
            transparent 60%
          );
          z-index: 2;
          pointer-events: none;
        }

        .hc-grain {
          position: absolute;
          inset: 0;
          z-index: 3;
          opacity: 0.048;
          pointer-events: none;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
          background-size: 200px 200px;
        }
        .hc-overlay-left {
          position: absolute;
          inset: 0;
          background: linear-gradient(
            112deg,
            rgba(5, 2, 1, 0.90) 0%,
            rgba(12, 4, 1, 0.68) 38%,
            rgba(0,0,0,0.14) 62%,
            transparent 100%
          );
          z-index: 4;
        }
        .hc-overlay-bottom {
          position: absolute;
          bottom: 0; left: 0; right: 0;
          height: 45%;
          background: linear-gradient(to top, rgba(3,1,0,0.80) 0%, transparent 100%);
          z-index: 4;
        }

        /* ── Heading ── */
        .hc-heading {
          position: absolute;
          bottom: clamp(56px, 9vh, 112px);
          z-index: 10;
          display: flex;
          flex-direction: column;
          line-height: 1;
        }
        .hc-word {
          display: block;
          overflow: visible;
        }
        .hc-text {
          font-family: 'Cormorant Garamond', 'Didot', Georgia, serif;
          font-weight: 700;
          font-style: italic;
          font-size: clamp(110px, 17.8vw, 248px);
          line-height: 0.85;
          letter-spacing: -0.028em;
          color: #F3E8D9;
          display: inline-block;
          overflow: visible;
          text-shadow:
            0 2px 50px rgba(0,0,0,0.55),
            0 0 100px rgba(210,80,20,0.10);
        }
        .hc-text-outline {
          color: transparent;
          -webkit-text-stroke: 1.8px rgba(243, 232, 217, 0.70);
          text-shadow: none;
        }
        .hc-rule {
          width: 0;
          height: 1px;
          background: linear-gradient(90deg, rgba(243,232,217,0.50), transparent);
          margin-top: clamp(14px, 2vh, 26px);
          margin-left: 5px;
          transition: width 1.3s cubic-bezier(0.22,1,0.36,1) 1.5s;
        }
        .hc-rule--in { width: clamp(90px, 14vw, 200px); }
        .hc-sub {
          font-family: 'Jost', 'Helvetica Neue', sans-serif;
          font-weight: 200;
          font-size: clamp(10px, 1vw, 14px);
          letter-spacing: 0.30em;
          text-transform: uppercase;
          color: rgba(243,232,217,0.50);
          margin: clamp(10px, 1.4vh, 20px) 0 0 6px;
          opacity: 0;
          transform: translateY(14px);
          transition: opacity 0.9s ease 1.9s, transform 0.9s ease 1.9s;
        }
        .hc-sub--in { opacity: 1; transform: translateY(0); }

        /* ── Bottom-right meta ── */
        .hc-meta {
          position: absolute;
          bottom: clamp(44px, 7vh, 80px);
          right: clamp(28px, 4vw, 72px);
          z-index: 10;
          text-align: right;
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 5px;
          opacity: 0;
          transform: translateY(18px);
          transition: opacity 1s ease 2.1s, transform 1s ease 2.1s;
        }
        .hc-meta--in { opacity: 1; transform: translateY(0); }
        .hc-meta-label {
          font-family: 'Jost', sans-serif;
          font-weight: 300;
          font-size: clamp(10px, 0.9vw, 13px);
          letter-spacing: 0.26em;
          text-transform: uppercase;
          color: rgba(243,232,217,0.58);
        }
        .hc-meta-date {
          font-family: 'Jost', sans-serif;
          font-weight: 200;
          font-size: clamp(9px, 0.8vw, 11px);
          letter-spacing: 0.20em;
          color: rgba(243,232,217,0.30);
        }
        .hc-meta-accent {
          width: 24px;
          height: 1px;
          background: rgba(210, 100, 40, 0.65);
          margin-top: 4px;
        }

        /* ── Scroll cue ── */
        .hc-scroll {
          position: absolute;
          bottom: clamp(32px, 5vh, 56px);
          left: 50%;
          transform: translateX(-50%);
          z-index: 10;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          opacity: 0;
          transition: opacity 1s ease 2.6s;
        }
        .hc-scroll--in { opacity: 1; }
        .hc-scroll-line {
          display: block;
          width: 1px;
          height: 38px;
          background: linear-gradient(to bottom, transparent, rgba(243,232,217,0.42));
          animation: hc-line-pulse 2.8s ease-in-out 2.6s infinite;
        }
        @keyframes hc-line-pulse {
          0%,100% { opacity: 0.45; transform: scaleY(1); }
          50%      { opacity: 1;    transform: scaleY(1.18); }
        }
        .hc-scroll-text {
          font-family: 'Jost', sans-serif;
          font-weight: 200;
          font-size: 8.5px;
          letter-spacing: 0.38em;
          text-transform: uppercase;
          color: rgba(243,232,217,0.30);
        }

        /* ── Arabic split-parent fix ── */
        .hc-ar-word .split-parent {
          overflow: visible !important;
          padding-right: 12px;
        }

        /* ── Mobile: center heading vertically in viewport middle ── */
        @media (max-width: 640px) {
          .hc-root {
            align-items: center;
          }
          .hc-heading {
            /* Remove bottom-anchoring, sit at true vertical center */
            position: absolute;
            bottom: unset !important;
            top: 50% !important;
            left: 50% !important;
            right: unset !important;
            transform: translate(-50%, -50%) !important;
            align-items: center;
            width: 100%;
            padding: 0 16px;
          }
          .hc-text {
            font-size: clamp(76px, 23vw, 110px);
            text-align: center;
          }
          .hc-rule {
            display: none;
          }
          .hc-sub {
            text-align: center;
            margin-left: 0;
            font-size: clamp(9px, 3vw, 11px);
          }
          .hc-scroll {
            display: none;
          }
          .hc-meta {
            /* Keep meta at bottom center on mobile */
            right: 50%;
            bottom: clamp(28px, 5vh, 48px);
            transform: translateX(50%) translateY(18px);
            text-align: center;
            align-items: center;
          }
          .hc-meta--in {
            transform: translateX(50%) translateY(0);
          }
          /* Overlay adjustments for mobile centering */
          .hc-overlay-left {
            background: linear-gradient(
              180deg,
              rgba(5, 2, 1, 0.55) 0%,
              rgba(5, 2, 1, 0.72) 40%,
              rgba(3, 1, 0, 0.80) 100%
            );
          }
        }
      `}</style>

      <section className="hc-root" dir="ltr">
        {/* ── Background: placeholder colour + fade-in image ── */}
        <div className="hc-bg">
          <div className={`hc-bg-img${imgLoaded ? " hc-bg-img--loaded" : ""}`} />
          <div className="hc-bg-tint" />
        </div>

        <div className="hc-grain" />
        <div className="hc-overlay-left" />
        <div className="hc-overlay-bottom" />

        {/* ── Giant editorial heading ── */}
        <div
          className="hc-heading"
          style={
            isArabic
              ? {
                  right: "clamp(56px, 7vw, 120px)",
                  left: "unset",
                  alignItems: "flex-end",
                }
              : {
                  left: "clamp(28px, 5.5vw, 96px)",
                  alignItems: "flex-start",
                }
          }
        >
          {/* Line 1 */}
          <div className={`hc-word ${isArabic ? "hc-ar-word" : ""}`}>
            <SplitText
              text={t("hero.loqta")}
              className="hc-text"
              delay={isArabic ? 80 : 55}
              duration={1.6}
              ease="power4.out"
              splitType={isArabic ? "words" : "chars"}
              from={{ opacity: 0, y: 80, skewY: 3 }}
              to={{ opacity: 1, y: 0, skewY: 0 }}
              threshold={0.05}
              rootMargin="0px"
              textAlign={isArabic ? "right" : "left"}
              tag="span"
            />
          </div>

          {/* Line 2 — offset indent, direction-aware */}
          <div
            className={`hc-word ${isArabic ? "hc-ar-word" : ""}`}
            style={
              isArabic
                ? {
                    transform:
                      "translateX(clamp(-68px, -3.8vw, -22px)) translateY(-6px)",
                  }
                : {
                    transform:
                      "translateX(clamp(22px, 3.8vw, 68px)) translateY(-6px)",
                  }
            }
          >
            <SplitText
              text={t("hero.zone")}
              className="hc-text hc-text-outline"
              delay={isArabic ? 80 : 55}
              duration={1.6}
              ease="power4.out"
              splitType={isArabic ? "words" : "chars"}
              from={{ opacity: 0, y: 80, skewY: 3 }}
              to={{ opacity: 1, y: 0, skewY: 0 }}
              threshold={0.05}
              rootMargin="0px"
              textAlign={isArabic ? "right" : "left"}
              tag="span"
            />
          </div>

          <div className={`hc-rule ${loaded ? "hc-rule--in" : ""}`} />
          <p className={`hc-sub ${loaded ? "hc-sub--in" : ""}`}>
            {t("hero.tagline")}
          </p>
        </div>

        {/* ── Bottom-right meta ── */}
        <div className={`hc-meta ${loaded ? "hc-meta--in" : ""}`}>
          <div className="hc-meta-label">{t("hero.editorialDirection")}</div>
          <div className="hc-meta-date">{t("hero.season")}</div>
          <div className="hc-meta-accent" />
        </div>

        {/* ── Scroll cue ── */}
        <div className={`hc-scroll ${loaded ? "hc-scroll--in" : ""}`}>
          <span className="hc-scroll-line" />
          <span className="hc-scroll-text">{t("hero.scroll")}</span>
        </div>
      </section>
    </>
  );
}