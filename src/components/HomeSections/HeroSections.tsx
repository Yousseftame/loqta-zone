/**
 * HeroSections.tsx — Premium Slideshow
 *
 * Fixes v3:
 *  1. Mobile height — taller aspect ratio (3/2 on phone, 16/9 on tablet)
 *  2. Drag/swipe works on ALL screens (mouse + touch), not just mobile
 *  3. Progress bar driven by JS rAF + Date.now() so it survives tab-switching:
 *     - records how far it had progressed when the tab was hidden
 *     - resumes from that exact point when the tab becomes visible again
 *     - pauses cleanly on hover / focus
 */

import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  fetchActiveHeroSlides,
  type HeroSlide,
} from "@/service/heroSlide/heroSlideService";

const SLIDE_INTERVAL_MS = 7000;
const ANIM_MS = 900;

export default function HeroSections() {
  const [slides, setSlides] = useState<HeroSlide[]>([]);
  const [current, setCurrent] = useState(0);
  const [prevIdx, setPrevIdx] = useState<number | null>(null);
  const [slideDir, setSlideDir] = useState<"next" | "prev">("next");
  const [animating, setAnimating] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [slidesLoading, setSlidesLoading] = useState(true);
  const [firstImageReady, setFirstImageReady] = useState(false);
  const [progress, setProgress] = useState(0);

  // All progress timing lives in refs — never re-creates callbacks on pause
  const rafRef = useRef<number | null>(null);
  const slideStartRef = useRef<number>(Date.now()); // wall-clock when this slide began (adjusted for pauses)
  const pauseStartRef = useRef<number | null>(null); // wall-clock when the current pause started

  // ── Unified drag/swipe refs (mouse + touch) ───────────────────────────────
  const dragStartX = useRef<number | null>(null);
  const dragStartY = useRef<number | null>(null);
  const isHDrag = useRef(false);
  const mouseDown = useRef(false);

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

  // ── Preload first slide ────────────────────────────────────────────────────
  useEffect(() => {
    if (slides.length === 0) return;
    const img = new Image();
    img.src = slides[0].imageUrl;
    if (img.complete) {
      setFirstImageReady(true);
    } else {
      img.onload = () => setFirstImageReady(true);
      img.onerror = () => setFirstImageReady(true);
    }
  }, [slides]);

  // ── Smooth initial mount ───────────────────────────────────────────────────
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

  // ── rAF progress loop ─────────────────────────────────────────────────────
  // pauseStartRef !== null  →  currently paused; skip advancing slideStartRef.
  // slideStartRef is a "virtual zero" that drifts forward whenever we pause,
  // so elapsed = Date.now() - slideStartRef always equals real active time.
  const tickProgress = useCallback(() => {
    if (pauseStartRef.current === null) {
      // Running — compute how much active time has passed
      const elapsed = Date.now() - slideStartRef.current;
      setProgress(Math.min(elapsed / SLIDE_INTERVAL_MS, 1));
    }
    // When paused we just loop without updating state (bar stays frozen)
    rafRef.current = requestAnimationFrame(tickProgress);
  }, []);

  useEffect(() => {
    if (slides.length < 2) return;
    slideStartRef.current = Date.now();
    pauseStartRef.current = null;
    setProgress(0);
    rafRef.current = requestAnimationFrame(tickProgress);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [slides.length, tickProgress]);

  // ── Tab visibility: freeze & resume without resetting ─────────────────────
  useEffect(() => {
    const onVisChange = () => {
      if (document.hidden) {
        // Treat hiding the tab exactly like a pause
        if (pauseStartRef.current === null) {
          pauseStartRef.current = Date.now();
        }
      } else {
        // Tab visible again — compensate slideStartRef for the hidden duration
        if (pauseStartRef.current !== null) {
          const hiddenMs = Date.now() - pauseStartRef.current;
          slideStartRef.current += hiddenMs;
          pauseStartRef.current = null;
        }
      }
    };
    document.addEventListener("visibilitychange", onVisChange);
    return () => document.removeEventListener("visibilitychange", onVisChange);
  }, []);

  // ── Hover pause/resume — purely ref-based, never resets the bar ───────────
  // We do NOT use a `paused` state effect here because that would cause
  // startAuto (which calls resetProgress) to re-run and wipe the position.
  // Instead we write directly to refs from event handlers.
  const pauseProgress = useCallback(() => {
    if (pauseStartRef.current === null) {
      pauseStartRef.current = Date.now();
    }
  }, []);

  const resumeProgress = useCallback(() => {
    if (pauseStartRef.current !== null) {
      const pausedMs = Date.now() - pauseStartRef.current;
      slideStartRef.current += pausedMs; // shift origin so elapsed is unchanged
      pauseStartRef.current = null;
    }
  }, []);

  // ── Reset progress when slide changes ─────────────────────────────────────
  const resetProgress = useCallback(() => {
    slideStartRef.current = Date.now();
    setProgress(0);
  }, []);

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
      resetProgress();

      animTimer.current = setTimeout(() => {
        setAnimating(false);
        setPrevIdx(null);
        animLock.current = false;
      }, ANIM_MS);
    },
    [current, slides.length, resetProgress],
  );

  const goNext = useCallback(
    () => goTo((current + 1) % slides.length, "next"),
    [current, slides.length, goTo],
  );
  const goPrev = useCallback(
    () => goTo((current - 1 + slides.length) % slides.length, "prev"),
    [current, slides.length, goTo],
  );

  // ── Auto-advance ───────────────────────────────────────────────────────────
  const startAuto = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(goNext, SLIDE_INTERVAL_MS);
    resetProgress();
  }, [goNext, resetProgress]);

  // Start auto-advance once slides are loaded — never restarts due to hover
  useEffect(() => {
    if (slides.length < 2) return;
    startAuto();
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [slides.length, startAuto]);

  // Pause/resume the setInterval separately from progress — these are independent
  const pauseInterval = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
  }, []);
  const resumeInterval = useCallback(() => {
    // Restart from a full 7s after the current moment so we don't jump immediately
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(goNext, SLIDE_INTERVAL_MS);
  }, [goNext]);

  // ── Keyboard navigation ────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") {
        goNext();
        resumeInterval();
      }
      if (e.key === "ArrowLeft") {
        goPrev();
        resumeInterval();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [goNext, goPrev, resumeInterval]);

  // ── Unified drag helpers (mouse + touch, all screen sizes) ────────────────
  const startDrag = useCallback((clientX: number, clientY: number) => {
    dragStartX.current = clientX;
    dragStartY.current = clientY;
    isHDrag.current = false;
  }, []);

  const moveDrag = useCallback((clientX: number, clientY: number) => {
    if (dragStartX.current === null || dragStartY.current === null)
      return false;
    const dx = clientX - dragStartX.current;
    const dy = clientY - dragStartY.current;
    if (!isHDrag.current && Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 8) {
      isHDrag.current = true;
    }
    return isHDrag.current;
  }, []);

  const endDrag = useCallback(
    (clientX: number) => {
      if (dragStartX.current === null) return;
      const dx = clientX - dragStartX.current;
      if (isHDrag.current && Math.abs(dx) > 40) {
        if (dx < 0) goNext();
        else goPrev();
        resumeInterval();
      }
      dragStartX.current = null;
      dragStartY.current = null;
      isHDrag.current = false;
      mouseDown.current = false;
    },
    [goNext, goPrev, resumeInterval],
  );

  // Touch
  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      startDrag(e.touches[0].clientX, e.touches[0].clientY);
    },
    [startDrag],
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      const isH = moveDrag(e.touches[0].clientX, e.touches[0].clientY);
      if (isH) e.preventDefault();
    },
    [moveDrag],
  );

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      endDrag(e.changedTouches[0].clientX);
    },
    [endDrag],
  );

  // Mouse (desktop drag-to-swipe)
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      mouseDown.current = true;
      startDrag(e.clientX, e.clientY);
    },
    [startDrag],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!mouseDown.current) return;
      moveDrag(e.clientX, e.clientY);
    },
    [moveDrag],
  );

  const handleMouseUp = useCallback(
    (e: React.MouseEvent) => {
      endDrag(e.clientX);
    },
    [endDrag],
  );

  const handleMouseLeaveSection = useCallback(
    (e: React.MouseEvent) => {
      resumeProgress();
      resumeInterval();
      if (mouseDown.current) endDrag(e.clientX);
    },
    [resumeProgress, resumeInterval, endDrag],
  );

  // ── Dot click ─────────────────────────────────────────────────────────────
  const handleDot = (i: number) => {
    goTo(i, i > current ? "next" : "prev");
    resumeInterval();
  };

  const progressWidth = `${Math.min(progress * 100, 100)}%`;

  return (
    <>
      <style>{`
        /* ─── Root ──────────────────────────────────────────────────────── */
        .hs-root {
          position: relative;
          width: 100%;
          height: 100vh;
          min-height: 500px;
          overflow: hidden;
          background: #09111a;
          touch-action: pan-y;
          cursor: grab;
          user-select: none;
          -webkit-user-select: none;
        }
        .hs-root:active { cursor: grabbing; }

        /*
         * ── Mobile: fixed height tall enough to feel immersive ────────────
         * aspect-ratio was too short. Use a min-height in vh units instead
         * so the image takes up a good chunk of the screen while remaining
         * wider than tall on every phone orientation.
         */
        @media (max-width: 640px) {
          .hs-root {
            height: 70vw;        /* ~62% of viewport width — taller than 16/9 (56vw) */
            min-height: 220px;
            aspect-ratio: unset;
          }
        }
        @media (min-width: 641px) and (max-width: 900px) {
          .hs-root {
            height: auto;
            min-height: unset;
            aspect-ratio: 16 / 9;
          }
        }

        /* ─── Slide layer ────────────────────────────────────────────────── */
        .hs-slide {
          position: absolute;
          inset: 0;
          overflow: hidden;
        }

        /* ─── Image ──────────────────────────────────────────────────────── */
        .hs-img {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: center center;
          display: block;
          -webkit-user-drag: none;
          pointer-events: none;
        }
        .hs-img-initial {
          opacity: 0;
          transition: opacity 1.1s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .hs-img-initial--in { opacity: 1; }

        /* ─── Slide animations ───────────────────────────────────────────── */
        .hs-cur-next { animation: hs-cur-next ${ANIM_MS}ms cubic-bezier(0.4,0,0.2,1) forwards; }
        .hs-cur-prev { animation: hs-cur-prev ${ANIM_MS}ms cubic-bezier(0.4,0,0.2,1) forwards; }
        @keyframes hs-cur-next { from{transform:translateX(0)} to{transform:translateX(-100%)} }
        @keyframes hs-cur-prev { from{transform:translateX(0)} to{transform:translateX(100%)}  }
        .hs-inc-next { animation: hs-inc-next ${ANIM_MS}ms cubic-bezier(0.4,0,0.2,1) forwards; }
        .hs-inc-prev { animation: hs-inc-prev ${ANIM_MS}ms cubic-bezier(0.4,0,0.2,1) forwards; }
        @keyframes hs-inc-next { from{transform:translateX(100%)} to{transform:translateX(0)} }
        @keyframes hs-inc-prev { from{transform:translateX(-100%)} to{transform:translateX(0)} }

        /* ─── Progress bar ───────────────────────────────────────────────── */
        .hs-progress-track {
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 3px;
          z-index: 30;
          background: rgba(255,255,255,0.12);
          pointer-events: none;
        }
        .hs-progress-fill {
          height: 100%;
          border-radius: 0 2px 2px 0;
          background: linear-gradient(
            90deg,
            rgba(255,255,255,0.5) 0%,
            rgba(255,255,255,0.95) 60%,
            #fff 100%
          );
          box-shadow: 0 0 8px rgba(255,255,255,0.45);
          /* width comes from inline style — no CSS transition/animation at all */
        }

        /* ─── Vignette ───────────────────────────────────────────────────── */
        .hs-vignette {
          position: absolute; inset: 0;
          background: radial-gradient(ellipse at center, transparent 48%, rgba(0,0,0,0.38) 100%);
          z-index: 10; pointer-events: none;
        }
        .hs-edge-bottom {
          position: absolute; bottom: 0; left: 0; right: 0; height: 160px;
          background: linear-gradient(to top, rgba(9,17,26,0.55), transparent);
          z-index: 11; pointer-events: none;
        }
        .hs-edge-top {
          position: absolute; top: 0; left: 0; right: 0; height: 100px;
          background: linear-gradient(to bottom, rgba(9,17,26,0.40), transparent);
          z-index: 11; pointer-events: none;
        }

        /* ─── Dots ───────────────────────────────────────────────────────── */
        .hs-dots {
          position: absolute;
          bottom: clamp(18px, 3.5vh, 38px);
          left: 50%; transform: translateX(-50%);
          z-index: 20;
          display: flex; gap: 8px; align-items: center;
          opacity: 0; transition: opacity 0.9s ease 0.8s;
        }
        .hs-dots--in { opacity: 1; }
        .hs-dot {
          width: 9px; height: 9px; border-radius: 50%;
          background: rgba(255,255,255,0.38);
          transition: all 0.3s cubic-bezier(0.22,1,0.36,1);
          cursor: pointer; border: none; padding: 0; flex-shrink: 0;
        }
        .hs-dot:hover { background: rgba(255,255,255,0.70); transform: scale(1.25); }
        .hs-dot--active {
          width: 28px; height: 9px; border-radius: 5px;
          background: rgba(255,255,255,0.92); transform: none;
        }

        /* ─── Counter ────────────────────────────────────────────────────── */
        .hs-counter {
          position: absolute;
          bottom: clamp(20px, 3.5vh, 40px);
          right: clamp(20px, 3vw, 56px);
          z-index: 20;
          font-family: 'Outfit', system-ui, sans-serif;
          font-size: clamp(10px, 1vw, 14px); font-weight: 300;
          color: rgba(255,255,255,0.35); letter-spacing: 0.22em;
          display: flex; align-items: center; gap: 7px;
          pointer-events: none; opacity: 0; transition: opacity 0.9s ease 1s;
        }
        .hs-counter--in { opacity: 1; }
        .hs-counter-cur {
          font-size: clamp(15px, 1.5vw, 22px); font-weight: 700;
          color: rgba(255,255,255,0.70);
        }
        .hs-counter-line { width: 16px; height: 1px; background: rgba(255,255,255,0.22); }

        /* ─── Skeleton ───────────────────────────────────────────────────── */
        .hs-skeleton {
          position: absolute; inset: 0;
          background: linear-gradient(110deg, #09111a 30%, #141e2b 50%, #09111a 70%);
          background-size: 200% 100%;
          animation: hs-shimmer 1.8s infinite;
          transition: opacity 0.8s ease;
        }
        .hs-skeleton--hidden { opacity: 0; pointer-events: none; }
        @keyframes hs-shimmer {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }

        /* ─── Mobile ─────────────────────────────────────────────────────── */
        @media (max-width: 640px) {
          .hs-counter { display: none; }
          .hs-dot--active { width: 22px; }
          .hs-dots { bottom: clamp(10px, 2.5vh, 20px); }
        }
      `}</style>

      <section
        className="hs-root"
        onMouseEnter={() => {
          pauseProgress();
          pauseInterval();
        }}
        onMouseLeave={handleMouseLeaveSection}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        aria-label="Hero image slideshow"
      >
        {/* ── Skeleton ── */}
        <div
          className={`hs-skeleton ${!slidesLoading ? "hs-skeleton--hidden" : ""}`}
        />

        {/* ── Fallback ── */}
        {!slidesLoading && slides.length === 0 && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "linear-gradient(135deg, #09111a, #1a2535)",
            }}
          />
        )}

        {/* ── Slides ── */}
        {slides.length > 0 && (
          <>
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
                  draggable={false}
                />
              </div>
            )}

            <div
              key={`cur-${slides[current].id}`}
              className={`hs-slide ${animating ? (slideDir === "next" ? "hs-inc-next" : "hs-inc-prev") : ""}`}
              style={{ zIndex: 2 }}
            >
              <img
                src={slides[current].imageUrl}
                alt=""
                aria-hidden="true"
                draggable={false}
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

        {/*
          Progress bar — width is inline style from rAF loop.
          No CSS animation involved, so:
            • tab switching pauses/resumes the bar at the exact pixel
            • hover pause freezes it in place
            • returning from another tab resumes from the right spot
        */}
        {slides.length > 1 && (
          <div className="hs-progress-track">
            <div
              className="hs-progress-fill"
              style={{ width: progressWidth }}
            />
          </div>
        )}

        {/* ── Dots ── */}
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

        {/* ── Counter ── */}
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
