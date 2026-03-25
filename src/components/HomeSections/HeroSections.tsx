/**
 * HeroSections.tsx — Dynamic slideshow version
 *
 * Loads active hero slides from Firestore (heroSlides collection).
 * Falls back to a static dark background if no slides are configured.
 *
 * Features:
 *  - Full-viewport images, object-fit: contain (no cropping)
 *  - Smooth cross-fade transitions between slides
 *  - Auto-advance every 5 seconds (pauses on hover)
 *  - Clickable dot navigation below
 *  - Keyboard arrow navigation
 *  - Preloads adjacent images for instant transitions
 */

import React, { useEffect, useState, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import SplitText from "../SplitText";
import {
  fetchActiveHeroSlides,
  type HeroSlide,
} from "@/service/heroSlide/heroSlideService";

const SLIDE_INTERVAL_MS = 5000;

export default function HeroSections() {
  const [slides, setSlides] = useState<HeroSlide[]>([]);
  const [current, setCurrent] = useState(0);
  const [prev, setPrev] = useState<number | null>(null);
  const [transitioning, setTransitioning] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [slidesLoading, setSlidesLoading] = useState(true);
  const [paused, setPaused] = useState(false);

  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === "ar";
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Load slides from Firestore ─────────────────────────────────────────────
  useEffect(() => {
    fetchActiveHeroSlides()
      .then((data :any) => setSlides(data))
      .catch((err :any) =>
        console.error("[HeroSections] Failed to load slides:", err),
      )
      .finally(() => setSlidesLoading(false));
  }, []);

  // ── Mount animation ────────────────────────────────────────────────────────
  useEffect(() => {
    const t = setTimeout(() => setLoaded(true), 120);
    return () => clearTimeout(t);
  }, []);

  // ── Preload adjacent images ────────────────────────────────────────────────
  useEffect(() => {
    if (slides.length < 2) return;
    const nextIdx = (current + 1) % slides.length;
    const img = new Image();
    img.src = slides[nextIdx].imageUrl;
  }, [current, slides]);

  // ── Transition to a given index ────────────────────────────────────────────
  const goTo = useCallback(
    (index: number) => {
      if (transitioning || index === current || slides.length < 2) return;
      setPrev(current);
      setCurrent(index);
      setTransitioning(true);
      setTimeout(() => {
        setPrev(null);
        setTransitioning(false);
      }, 700); // match CSS transition duration
    },
    [current, transitioning, slides.length],
  );

  const goNext = useCallback(
    () => goTo((current + 1) % slides.length),
    [goTo, current, slides.length],
  );

  const goPrev = useCallback(
    () => goTo((current - 1 + slides.length) % slides.length),
    [goTo, current, slides.length],
  );

  // ── Auto-advance ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (slides.length < 2 || paused) return;
    intervalRef.current = setInterval(goNext, SLIDE_INTERVAL_MS);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [slides.length, paused, goNext]);

  // ── Keyboard navigation ────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") goNext();
      if (e.key === "ArrowLeft") goPrev();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [goNext, goPrev]);

  // ── Decide what background to render ──────────────────────────────────────
  const hasSlides = slides.length > 0;
  const currentSlide = hasSlides ? slides[current] : null;
  const prevSlide = prev !== null && hasSlides ? slides[prev] : null;

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

        /* ── Slide layers ── */
        .hc-slide {
          position: absolute;
          inset: 0;
          z-index: 0;
          background-color: #0a0806;
        }

        .hc-slide-img {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: contain;   /* NO cropping — full image always visible */
          object-position: center;
          opacity: 0;
          transition: opacity 0.7s cubic-bezier(0.4, 0, 0.2, 1);
          will-change: opacity;
        }

        .hc-slide-img--visible {
          opacity: 1;
        }

        /* Subtle dark gradient behind text only (bottom + left) */
        .hc-overlay {
          position: absolute;
          inset: 0;
          background:
            linear-gradient(to top,  rgba(0,0,0,0.70) 0%, transparent 45%),
            linear-gradient(to right, rgba(0,0,0,0.55) 0%, transparent 50%);
          z-index: 5;
          pointer-events: none;
        }

        .hc-grain {
          position: absolute;
          inset: 0;
          z-index: 6;
          opacity: 0.035;
          pointer-events: none;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
          background-size: 200px 200px;
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
        .hc-word { display: block; overflow: visible; }
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
          text-shadow: 0 2px 50px rgba(0,0,0,0.55), 0 0 100px rgba(210,80,20,0.10);
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

        /* ── Dot navigation ── */
        .hc-dots {
          position: absolute;
          bottom: clamp(20px, 3.5vh, 36px);
          left: 50%;
          transform: translateX(-50%);
          z-index: 10;
          display: flex;
          align-items: center;
          gap: 8px;
          opacity: 0;
          transition: opacity 1s ease 2.4s;
        }
        .hc-dots--in { opacity: 1; }

        .hc-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          border: none;
          cursor: pointer;
          padding: 0;
          background: rgba(243, 232, 217, 0.35);
          transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
          outline: none;
        }
        .hc-dot:hover { background: rgba(243, 232, 217, 0.65); transform: scale(1.2); }
        .hc-dot--active {
          width: 24px;
          border-radius: 4px;
          background: rgba(243, 232, 217, 0.90);
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

        /* ── Arabic fix ── */
        .hc-ar-word .split-parent { overflow: visible !important; padding-right: 12px; }

        /* ── Mobile ── */
        @media (max-width: 640px) {
          .hc-root { align-items: center; }
          .hc-heading {
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
          .hc-text { font-size: clamp(76px, 23vw, 110px); text-align: center; }
          .hc-rule { display: none; }
          .hc-sub { text-align: center; margin-left: 0; font-size: clamp(9px, 3vw, 11px); }
          .hc-scroll { display: none; }
          .hc-meta {
            right: 50%;
            bottom: clamp(60px, 8vh, 80px);
            transform: translateX(50%) translateY(18px);
            text-align: center;
            align-items: center;
          }
          .hc-meta--in { transform: translateX(50%) translateY(0); }
          .hc-dots { bottom: clamp(16px, 2.5vh, 28px); }
        }
      `}</style>

      <section
        className="hc-root"
        dir="ltr"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        {/* ── Slide layers ── */}
        <div className="hc-slide">
          {/* Previous slide (fades out) */}
          {prevSlide && (
            <img
              key={`prev-${prevSlide.id}`}
              src={prevSlide.imageUrl}
              alt=""
              className="hc-slide-img"
              aria-hidden="true"
            />
          )}

          {/* Current slide (fades in) */}
          {currentSlide ? (
            <img
              key={`cur-${currentSlide.id}`}
              src={currentSlide.imageUrl}
              alt=""
              className="hc-slide-img hc-slide-img--visible"
            />
          ) : (
            // Fallback dark background when no slides configured
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: "linear-gradient(135deg, #0a0806 0%, #1a1008 100%)",
              }}
            />
          )}
        </div>

        <div className="hc-grain" />
        <div className="hc-overlay" />

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
              : { left: "clamp(28px, 5.5vw, 96px)", alignItems: "flex-start" }
          }
        >
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

        {/* ── Dot navigation (only when multiple slides) ── */}
        {slides.length > 1 && (
          <div
            className={`hc-dots ${loaded ? "hc-dots--in" : ""}`}
            role="tablist"
            aria-label="Slide navigation"
          >
            {slides.map((slide, i) => (
              <button
                key={slide.id}
                className={`hc-dot ${i === current ? "hc-dot--active" : ""}`}
                onClick={() => goTo(i)}
                aria-label={`Go to slide ${i + 1}`}
                aria-selected={i === current}
                role="tab"
              />
            ))}
          </div>
        )}

        {/* ── Scroll cue (only when no dots, or move it up) ── */}
        {slides.length <= 1 && (
          <div className={`hc-scroll ${loaded ? "hc-scroll--in" : ""}`}>
            <span className="hc-scroll-line" />
            <span className="hc-scroll-text">{t("hero.scroll")}</span>
          </div>
        )}
      </section>
    </>
  );
}
