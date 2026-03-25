/**
 * HeroSections.tsx — Premium Slideshow
 *
 * Fixes applied:
 *  1. Initial load: dark bg (#09111a) stays visible while first image loads,
 *     then cross-fades smoothly in (no hard black→image flash)
 *  2. Slide swap animation slowed from 580ms → 900ms
 *  3. Dots enlarged and pill widened
 */

import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  fetchActiveHeroSlides,
  type HeroSlide,
} from "@/service/heroSlide/heroSlideService";

const SLIDE_INTERVAL_MS = 7000;
const ANIM_MS = 900; // slower swap — was 580ms

export default function HeroSections() {
  const [slides, setSlides] = useState<HeroSlide[]>([]);
  const [current, setCurrent] = useState(0);
  const [prevIdx, setPrevIdx] = useState<number | null>(null);
  const [slideDir, setSlideDir] = useState<"next" | "prev">("next");
  const [animating, setAnimating] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [slidesLoading, setSlidesLoading] = useState(true);
  const [paused, setPaused] = useState(false);

  // ── NEW: track whether the first image has finished loading ───────────────
  const [firstImageReady, setFirstImageReady] = useState(false);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const animTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const animLock = useRef(false);

  // ── Load slides ────────────────────────────────────────────────────────────
  useEffect(() => {
    fetchActiveHeroSlides()
      .then((data: any) => setSlides(data))
      .catch((err: any) =>
        console.error("[HeroSections] Failed to load slides:", err),
      )
      .finally(() => setSlidesLoading(false));
  }, []);

  // ── Preload the FIRST slide image as soon as slides arrive ─────────────────
  // This is the key fix: we keep the dark bg visible until the image is ready,
  // then fade it in — exactly like Dashboard.tsx does for the single hero image.
  useEffect(() => {
    if (slides.length === 0) return;
    const img = new Image();
    img.src = slides[0].imageUrl;
    if (img.complete) {
      // Already cached
      setFirstImageReady(true);
    } else {
      img.onload = () => setFirstImageReady(true);
      img.onerror = () => setFirstImageReady(true); // show anyway on error
    }
  }, [slides]);

  // ── Smooth initial mount (fade in dots / counter) ─────────────────────────
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 60);
    return () => clearTimeout(t);
  }, []);

  // ── Preload next image ─────────────────────────────────────────────────────
  useEffect(() => {
    if (slides.length < 2) return;
    const img = new Image();
    img.src = slides[(current + 1) % slides.length].imageUrl;
  }, [current, slides]);

  // ── Core slide transition ──────────────────────────────────────────────────
  const goTo = useCallback(
    (newIdx: number, dir: "next" | "prev") => {
      if (animLock.current || newIdx === current || slides.length < 2) return;
      animLock.current = true;

      if (animTimer.current) clearTimeout(animTimer.current);
      setPrevIdx(current);
      setSlideDir(dir);
      setCurrent(newIdx);
      setAnimating(true);

      animTimer.current = setTimeout(() => {
        setAnimating(false);
        setPrevIdx(null);
        animLock.current = false;
      }, ANIM_MS);
    },
    [current, slides.length],
  );

  const goNext = useCallback(() => {
    goTo((current + 1) % slides.length, "next");
  }, [current, slides.length, goTo]);

  const goPrev = useCallback(() => {
    goTo((current - 1 + slides.length) % slides.length, "prev");
  }, [current, slides.length, goTo]);

  // ── Auto-advance ───────────────────────────────────────────────────────────
  const startAuto = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(goNext, SLIDE_INTERVAL_MS);
  }, [goNext]);

  useEffect(() => {
    if (slides.length < 2 || paused) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }
    startAuto();
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [slides.length, paused, startAuto]);

  // ── Keyboard navigation ────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") {
        goNext();
        startAuto();
      }
      if (e.key === "ArrowLeft") {
        goPrev();
        startAuto();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [goNext, goPrev, startAuto]);

  // ── Dot click ─────────────────────────────────────────────────────────────
  const handleDot = (i: number) => {
    goTo(i, i > current ? "next" : "prev");
    startAuto();
  };

  return (
    <>
      <style>{`
        /* ─── Root ─────────────────────────────────────────────────────── */
        .hs-root {
          position: relative;
          width: 100%;
          height: 100vh;
          min-height: 500px;
          overflow: hidden;
          background: #09111a;
        }

        /* ─── Slide layer ───────────────────────────────────────────────── */
        .hs-slide {
          position: absolute;
          inset: 0;
          overflow: hidden;
        }

        /* ─── Image ─────────────────────────────────────────────────────── */
        .hs-img {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: center center;
          display: block;
        }

        /*
         * ── First-image smooth reveal ──────────────────────────────────
         * The image starts at opacity-0.
         * Once firstImageReady=true  →  .hs-img-fade--in is added → fades to 1.
         * The background #09111a shows through until then — no black flash.
         */
        .hs-img-initial {
          opacity: 0;
          transition: opacity 1.1s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .hs-img-initial--in {
          opacity: 1;
        }

        /* ─── Slide-out animations (slower) ────────────────────────────── */
        .hs-cur-next { animation: hs-cur-next ${ANIM_MS}ms cubic-bezier(0.4,0,0.2,1) forwards; }
        .hs-cur-prev { animation: hs-cur-prev ${ANIM_MS}ms cubic-bezier(0.4,0,0.2,1) forwards; }
        @keyframes hs-cur-next { from{transform:translateX(0)} to{transform:translateX(-100%)} }
        @keyframes hs-cur-prev { from{transform:translateX(0)} to{transform:translateX(100%)}  }

        /* ─── Slide-in animations (slower) ─────────────────────────────── */
        .hs-inc-next { animation: hs-inc-next ${ANIM_MS}ms cubic-bezier(0.4,0,0.2,1) forwards; }
        .hs-inc-prev { animation: hs-inc-prev ${ANIM_MS}ms cubic-bezier(0.4,0,0.2,1) forwards; }
        @keyframes hs-inc-next { from{transform:translateX(100%)} to{transform:translateX(0)} }
        @keyframes hs-inc-prev { from{transform:translateX(-100%)} to{transform:translateX(0)} }

        /* ─── Vignette ──────────────────────────────────────────────────── */
        .hs-vignette {
          position: absolute;
          inset: 0;
          background: radial-gradient(ellipse at center, transparent 48%, rgba(0,0,0,0.38) 100%);
          z-index: 10;
          pointer-events: none;
        }
        .hs-edge-bottom {
          position: absolute;
          bottom: 0; left: 0; right: 0;
          height: 160px;
          background: linear-gradient(to top, rgba(9,17,26,0.55), transparent);
          z-index: 11;
          pointer-events: none;
        }
        .hs-edge-top {
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 100px;
          background: linear-gradient(to bottom, rgba(9,17,26,0.40), transparent);
          z-index: 11;
          pointer-events: none;
        }

        /* ─── Dots — bigger ─────────────────────────────────────────────── */
        .hs-dots {
          position: absolute;
          bottom: clamp(18px, 3.5vh, 38px);
          left: 50%;
          transform: translateX(-50%);
          z-index: 20;
          display: flex;
          gap: 8px;
          align-items: center;
          opacity: 0;
          transition: opacity 0.9s ease 0.8s;
        }
        .hs-dots--in { opacity: 1; }

        /* Inactive dot: was 6×6, now 9×9 */
        .hs-dot {
          width: 9px;
          height: 9px;
          border-radius: 50%;
          background: rgba(255,255,255,0.38);
          transition: all 0.3s cubic-bezier(0.22,1,0.36,1);
          cursor: pointer;
          border: none;
          padding: 0;
          flex-shrink: 0;
        }
        .hs-dot:hover {
          background: rgba(255,255,255,0.70);
          transform: scale(1.25);
        }
        /* Active pill: was 20px wide, now 28px */
        .hs-dot--active {
          width: 28px;
          height: 9px;
          border-radius: 5px;
          background: rgba(255,255,255,0.92);
          transform: none;
        }

        /* ─── Slide counter ─────────────────────────────────────────────── */
        .hs-counter {
          position: absolute;
          bottom: clamp(20px, 3.5vh, 40px);
          right: clamp(20px, 3vw, 56px);
          z-index: 20;
          font-family: 'Outfit', system-ui, sans-serif;
          font-size: clamp(10px, 1vw, 14px);
          font-weight: 300;
          color: rgba(255,255,255,0.35);
          letter-spacing: 0.22em;
          display: flex;
          align-items: center;
          gap: 7px;
          pointer-events: none;
          opacity: 0;
          transition: opacity 0.9s ease 1s;
        }
        .hs-counter--in { opacity: 1; }
        .hs-counter-cur {
          font-size: clamp(15px, 1.5vw, 22px);
          font-weight: 700;
          color: rgba(255,255,255,0.70);
        }
        .hs-counter-line {
          width: 16px; height: 1px;
          background: rgba(255,255,255,0.22);
        }

        /* ─── Loading skeleton ──────────────────────────────────────────── */
        .hs-skeleton {
          position: absolute;
          inset: 0;
          background: linear-gradient(110deg, #09111a 30%, #141e2b 50%, #09111a 70%);
          background-size: 200% 100%;
          animation: hs-shimmer 1.8s infinite;
          /* fades out once slides arrive */
          transition: opacity 0.8s ease;
        }
        .hs-skeleton--hidden { opacity: 0; pointer-events: none; }
        @keyframes hs-shimmer {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }

        /* ─── Mobile ────────────────────────────────────────────────────── */
        @media (max-width: 640px) {
          .hs-counter { display: none; }
          .hs-dot--active { width: 22px; }
        }
      `}</style>

      <section
        className="hs-root"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        aria-label="Hero image slideshow"
      >
        {/*
          ── Shimmer skeleton ──────────────────────────────────────────────
          Shown while Firestore is fetching. Fades out once slides are loaded.
          This means the user NEVER sees a plain black screen — they always see
          the animated shimmer or the image.
        */}
        <div
          className={`hs-skeleton ${!slidesLoading ? "hs-skeleton--hidden" : ""}`}
        />

        {/* ── Fallback (no slides) ── */}
        {!slidesLoading && slides.length === 0 && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "linear-gradient(135deg, #09111a, #1a2535)",
            }}
          />
        )}

        {/* ── Slide layers ── */}
        {slides.length > 0 && (
          <>
            {/* Previous slide — slides out */}
            {animating && prevIdx !== null && slides[prevIdx] && (
              <div
                key={`prev-${slides[prevIdx].id}`}
                className={`hs-slide ${slideDir === "next" ? "hs-cur-next" : "hs-cur-prev"}`}
                style={{ zIndex: 1 }}
              >
                <img
                  src={slides[prevIdx].imageUrl}
                  alt=""
                  aria-hidden="true"
                  className="hs-img"
                />
              </div>
            )}

            {/*
              Current slide
              - On very first render (index 0, not animating):
                  applies hs-img-initial so it starts at opacity-0,
                  then hs-img-initial--in is added once firstImageReady=true
                  → smooth dark-bg → image cross-fade, identical to Dashboard.tsx
              - On subsequent slides (animating):
                  normal slide-in animation, no opacity trick needed
            */}
            <div
              key={`cur-${slides[current].id}`}
              className={`hs-slide ${
                animating
                  ? slideDir === "next"
                    ? "hs-inc-next"
                    : "hs-inc-prev"
                  : ""
              }`}
              style={{ zIndex: 2 }}
            >
              <img
                src={slides[current].imageUrl}
                alt=""
                aria-hidden="true"
                className={`hs-img${
                  !animating
                    ? ` hs-img-initial${firstImageReady ? " hs-img-initial--in" : ""}`
                    : ""
                }`}
              />
            </div>
          </>
        )}

        {/* ── Overlays ── */}
        <div className="hs-vignette" />
        <div className="hs-edge-top" />
        <div className="hs-edge-bottom" />

        {/* ── Dot navigation ── */}
        {slides.length > 1 && (
          <div
            className={`hs-dots ${mounted ? "hs-dots--in" : ""}`}
            role="tablist"
            aria-label="Slide navigation"
          >
            {slides.map((slide, i) => (
              <button
                key={slide.id}
                role="tab"
                aria-selected={i === current}
                aria-label={`Go to slide ${i + 1}`}
                className={`hs-dot ${i === current ? "hs-dot--active" : ""}`}
                onClick={() => handleDot(i)}
              />
            ))}
          </div>
        )}

        {/* ── Slide counter ── */}
        {slides.length > 1 && (
          <div className={`hs-counter ${mounted ? "hs-counter--in" : ""}`}>
            <span className="hs-counter-cur">
              {String(current + 1).padStart(2, "0")}
            </span>
            <span className="hs-counter-line" />
            <span>{String(slides.length).padStart(2, "0")}</span>
          </div>
        )}
      </section>
    </>
  );
}
