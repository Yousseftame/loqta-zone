/**
 * LeftRightSections.tsx — Two side-by-side slideshows below the hero
 *
 * Each panel is a full clone of HeroSections logic:
 *  - rAF progress bar (tab-switch safe, hover-pause safe)
 *  - Mouse + touch swipe on all screen sizes
 *  - Keyboard navigation (arrow keys control whichever panel is hovered/focused)
 *  - Vignette, skeleton, first-image fade-in, dots, counter
 *  - Auto-advance every 5s (offset: left starts at 0ms, right at 2500ms)
 *
 * On mobile (< 640px): stacks vertically, each panel full width.
 * On tablet+: side by side, equal width, 4px gap.
 */

import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  fetchActiveLeftSectionSlides,
  type LeftSectionSlide,
} from "@/service/leftSection/leftSectionService";
import {
  fetchActiveRightSectionSlides,
  type RightSectionSlide,
} from "@/service/rightSection/rightSectionService";

const SLIDE_INTERVAL_MS = 5000;
const ANIM_MS = 800;

// ─── Generic slide type for the panel ────────────────────────────────────────
interface AnySlide {
  id: string;
  imageUrl: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Single panel — self-contained, identical logic to HeroSections
// ─────────────────────────────────────────────────────────────────────────────
interface PanelProps {
  slides: AnySlide[];
  loading: boolean;
  /** Stagger the initial auto-advance so the two panels don't change in sync */
  initialDelayMs?: number;
  instanceId: string; // for CSS keyframe namespacing
}

function SlidePanel({
  slides,
  loading,
  initialDelayMs = 0,
  instanceId,
}: PanelProps) {
  const [current, setCurrent] = useState(0);
  const [prevIdx, setPrevIdx] = useState<number | null>(null);
  const [slideDir, setSlideDir] = useState<"next" | "prev">("next");
  const [animating, setAnimating] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [firstImageReady, setFirstImageReady] = useState(false);
  const [progress, setProgress] = useState(0);

  const rafRef = useRef<number | null>(null);
  const slideStartRef = useRef<number>(Date.now());
  const pauseStartRef = useRef<number | null>(null);

  const dragStartX = useRef<number | null>(null);
  const dragStartY = useRef<number | null>(null);
  const isHDrag = useRef(false);
  const mouseDown = useRef(false);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const animTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const animLock = useRef(false);

  // ── Preload first image ──────────────────────────────────────────────────
  useEffect(() => {
    if (slides.length === 0) return;
    const img = new Image();
    img.src = slides[0].imageUrl;
    if (img.complete) setFirstImageReady(true);
    else {
      img.onload = () => setFirstImageReady(true);
      img.onerror = () => setFirstImageReady(true);
    }
  }, [slides]);

  // ── Preload next image ───────────────────────────────────────────────────
  useEffect(() => {
    if (slides.length < 2) return;
    const img = new Image();
    img.src = slides[(current + 1) % slides.length].imageUrl;
  }, [current, slides]);

  // ── Smooth mount ─────────────────────────────────────────────────────────
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 80);
    return () => clearTimeout(t);
  }, []);

  // ── rAF progress loop ────────────────────────────────────────────────────
  const tickProgress = useCallback(() => {
    if (pauseStartRef.current === null) {
      const elapsed = Date.now() - slideStartRef.current;
      setProgress(Math.min(elapsed / SLIDE_INTERVAL_MS, 1));
    }
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

  // ── Tab visibility ───────────────────────────────────────────────────────
  useEffect(() => {
    const onVisChange = () => {
      if (document.hidden) {
        if (pauseStartRef.current === null) pauseStartRef.current = Date.now();
      } else {
        if (pauseStartRef.current !== null) {
          slideStartRef.current += Date.now() - pauseStartRef.current;
          pauseStartRef.current = null;
        }
      }
    };
    document.addEventListener("visibilitychange", onVisChange);
    return () => document.removeEventListener("visibilitychange", onVisChange);
  }, []);

  // ── Pause/resume helpers ─────────────────────────────────────────────────
  const pauseProgress = useCallback(() => {
    if (pauseStartRef.current === null) pauseStartRef.current = Date.now();
  }, []);

  const resumeProgress = useCallback(() => {
    if (pauseStartRef.current !== null) {
      slideStartRef.current += Date.now() - pauseStartRef.current;
      pauseStartRef.current = null;
    }
  }, []);

  const resetProgress = useCallback(() => {
    slideStartRef.current = Date.now();
    setProgress(0);
  }, []);

  // ── Core transition ──────────────────────────────────────────────────────
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

  // ── Auto-advance ─────────────────────────────────────────────────────────
  const pauseInterval = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
  }, []);

  const resumeInterval = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(goNext, SLIDE_INTERVAL_MS);
  }, [goNext]);

  useEffect(() => {
    if (slides.length < 2) return;
    const t = setTimeout(() => {
      resetProgress();
      intervalRef.current = setInterval(goNext, SLIDE_INTERVAL_MS);
    }, initialDelayMs);
    return () => {
      clearTimeout(t);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [slides.length, goNext, resetProgress, initialDelayMs]);

  // ── Drag helpers ─────────────────────────────────────────────────────────
  const startDrag = useCallback((x: number, y: number) => {
    dragStartX.current = x;
    dragStartY.current = y;
    isHDrag.current = false;
  }, []);

  const moveDrag = useCallback((x: number, y: number) => {
    if (dragStartX.current === null || dragStartY.current === null)
      return false;
    const dx = x - dragStartX.current;
    const dy = y - dragStartY.current;
    if (!isHDrag.current && Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 8)
      isHDrag.current = true;
    return isHDrag.current;
  }, []);

  const endDrag = useCallback(
    (x: number) => {
      if (dragStartX.current === null) return;
      const dx = x - dragStartX.current;
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

  // Touch handlers
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

  // Mouse handlers
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

  const handleMouseLeave = useCallback(
    (e: React.MouseEvent) => {
      resumeProgress();
      resumeInterval();
      if (mouseDown.current) endDrag(e.clientX);
    },
    [resumeProgress, resumeInterval, endDrag],
  );

  const handleDot = (i: number) => {
    goTo(i, i > current ? "next" : "prev");
    resumeInterval();
  };

  const id = instanceId;
  const progressWidth = `${Math.min(progress * 100, 100)}%`;

  return (
    <>
      <style>{`
        /* ── Panel root ───────────────────────────────────────── */
        .lrs-root-${id} {
          position: relative;
          width: 100%;
          height: 100%;
          overflow: hidden;
          background: #09111a;
          touch-action: pan-y;
          cursor: grab;
          user-select: none;
          -webkit-user-select: none;
        }
        .lrs-root-${id}:active { cursor: grabbing; }

        /* ── Slide layer ──────────────────────────────────────── */
        .lrs-slide-${id} {
          position: absolute;
          inset: 0;
          overflow: hidden;
        }

        /* ── Image ────────────────────────────────────────────── */
        .lrs-img-${id} {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: center;
          display: block;
          -webkit-user-drag: none;
          pointer-events: none;
        }
        .lrs-img-init-${id} {
          opacity: 0;
          transition: opacity 1.1s cubic-bezier(0.4,0,0.2,1);
        }
        .lrs-img-init-in-${id} { opacity: 1; }

        /* ── Slide animations ─────────────────────────────────── */
        .lrs-cur-next-${id} { animation: lrs-cur-next-${id} ${ANIM_MS}ms cubic-bezier(0.4,0,0.2,1) forwards; }
        .lrs-cur-prev-${id} { animation: lrs-cur-prev-${id} ${ANIM_MS}ms cubic-bezier(0.4,0,0.2,1) forwards; }
        @keyframes lrs-cur-next-${id} { from{transform:translateX(0)} to{transform:translateX(-100%)} }
        @keyframes lrs-cur-prev-${id} { from{transform:translateX(0)} to{transform:translateX(100%)} }
        .lrs-inc-next-${id} { animation: lrs-inc-next-${id} ${ANIM_MS}ms cubic-bezier(0.4,0,0.2,1) forwards; }
        .lrs-inc-prev-${id} { animation: lrs-inc-prev-${id} ${ANIM_MS}ms cubic-bezier(0.4,0,0.2,1) forwards; }
        @keyframes lrs-inc-next-${id} { from{transform:translateX(100%)} to{transform:translateX(0)} }
        @keyframes lrs-inc-prev-${id} { from{transform:translateX(-100%)} to{transform:translateX(0)} }

        /* ── Overlays ─────────────────────────────────────────── */
        .lrs-vignette-${id} {
          position: absolute; inset: 0;
          background: radial-gradient(ellipse at center, transparent 48%, rgba(0,0,0,0.35) 100%);
          z-index: 10; pointer-events: none;
        }
        .lrs-edge-bottom-${id} {
          position: absolute; bottom: 0; left: 0; right: 0; height: 120px;
          background: linear-gradient(to top, rgba(9,17,26,0.52), transparent);
          z-index: 11; pointer-events: none;
        }
        .lrs-edge-top-${id} {
          position: absolute; top: 0; left: 0; right: 0; height: 80px;
          background: linear-gradient(to bottom, rgba(9,17,26,0.38), transparent);
          z-index: 11; pointer-events: none;
        }

        /* ── Progress bar ─────────────────────────────────────── */
        // .lrs-prog-track-${id} {
        //   position: absolute;
        //   bottom: 0; left: 0; right: 0; height: 2px;
        //   background: rgba(255,255,255,0.12);
        //   z-index: 20; pointer-events: none;
        // }
        .lrs-prog-fill-${id} {
          height: 100%;
          background: rgba(255,255,255,0.75);
          transition: none;
        }

        /* ── Dots ─────────────────────────────────────────────── */
        .lrs-dots-${id} {
          position: absolute;
          bottom: clamp(12px, 2.8vh, 28px);
          left: 50%; transform: translateX(-50%);
          z-index: 20;
          display: flex; gap: 6px; align-items: center;
          opacity: 0; transition: opacity 0.9s ease 0.8s;
        }
        .lrs-dots-in-${id} { opacity: 1; }
        .lrs-dot-${id} {
          width: 7px; height: 7px; border-radius: 50%;
          background: rgba(255,255,255,0.35);
          transition: all 0.3s cubic-bezier(0.22,1,0.36,1);
          cursor: pointer; border: none; padding: 0; flex-shrink: 0;
        }
        .lrs-dot-${id}:hover { background: rgba(255,255,255,0.68); transform: scale(1.25); }
        .lrs-dot-active-${id} {
          width: 22px; height: 7px; border-radius: 4px;
          background: rgba(255,255,255,0.90); transform: none;
        }

        /* ── Counter ──────────────────────────────────────────── */
        .lrs-counter-${id} {
          position: absolute;
          bottom: clamp(14px, 2.8vh, 28px);
          right: clamp(12px, 2.5vw, 28px);
          z-index: 20;
          font-family: 'Outfit', system-ui, sans-serif;
          font-size: clamp(9px, 0.9vw, 12px); font-weight: 300;
          color: rgba(255,255,255,0.35); letter-spacing: 0.2em;
          display: flex; align-items: center; gap: 5px;
          pointer-events: none;
          opacity: 0; transition: opacity 0.9s ease 1s;
        }
        .lrs-counter-in-${id} { opacity: 1; }
        .lrs-counter-cur-${id} {
          font-size: clamp(13px, 1.3vw, 18px); font-weight: 700;
          color: rgba(255,255,255,0.70);
        }
        .lrs-counter-line-${id} { width: 12px; height: 1px; background: rgba(255,255,255,0.22); }

        /* ── Skeleton ─────────────────────────────────────────── */
        .lrs-skeleton-${id} {
          position: absolute; inset: 0;
          background: linear-gradient(110deg, #09111a 30%, #141e2b 50%, #09111a 70%);
          background-size: 200% 100%;
          animation: lrs-shimmer-${id} 1.8s infinite;
          transition: opacity 0.8s ease;
        }
        .lrs-skeleton-hidden-${id} { opacity: 0; pointer-events: none; }
        @keyframes lrs-shimmer-${id} {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>

      <div
        className={`lrs-root-${id}`}
        onMouseEnter={() => {
          pauseProgress();
          pauseInterval();
        }}
        onMouseLeave={handleMouseLeave}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        aria-label="Section image slideshow"
      >
        {/* Skeleton */}
        <div
          className={`lrs-skeleton-${id} ${!loading ? `lrs-skeleton-hidden-${id}` : ""}`}
        />

        {/* Fallback */}
        {!loading && slides.length === 0 && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "linear-gradient(135deg, #09111a, #1a2535)",
            }}
          />
        )}

        {/* Slides */}
        {slides.length > 0 && (
          <>
            {animating && prevIdx !== null && slides[prevIdx] && (
              <div
                key={`prev-${slides[prevIdx].id}`}
                className={`lrs-slide-${id} ${slideDir === "next" ? `lrs-cur-next-${id}` : `lrs-cur-prev-${id}`}`}
                style={{ zIndex: 1 }}
              >
                <img
                  src={slides[prevIdx].imageUrl}
                  alt=""
                  aria-hidden="true"
                  className={`lrs-img-${id}`}
                  draggable={false}
                />
              </div>
            )}
            <div
              key={`cur-${slides[current].id}`}
              className={`lrs-slide-${id} ${animating ? (slideDir === "next" ? `lrs-inc-next-${id}` : `lrs-inc-prev-${id}`) : ""}`}
              style={{ zIndex: 2 }}
            >
              <img
                src={slides[current].imageUrl}
                alt=""
                aria-hidden="true"
                draggable={false}
                className={`lrs-img-${id}${
                  !animating
                    ? ` lrs-img-init-${id}${firstImageReady ? ` lrs-img-init-in-${id}` : ""}`
                    : ""
                }`}
              />
            </div>
          </>
        )}

        {/* Overlays */}
        <div className={`lrs-vignette-${id}`} />
        <div className={`lrs-edge-top-${id}`} />
        <div className={`lrs-edge-bottom-${id}`} />

        {/* Progress bar */}
        {/* {slides.length > 1 && (
          <div className={`lrs-prog-track-${id}`}>
            <div
              className={`lrs-prog-fill-${id}`}
              style={{ width: progressWidth }}
            />
          </div>
        )} */}

        {/* Dots */}
        {slides.length > 1 && (
          <div
            className={`lrs-dots-${id} ${mounted ? `lrs-dots-in-${id}` : ""}`}
            role="tablist"
            aria-label="Slide navigation"
          >
            {slides.map((slide, i) => (
              <button
                key={slide.id}
                role="tab"
                aria-selected={i === current}
                aria-label={`Go to slide ${i + 1}`}
                className={`lrs-dot-${id} ${i === current ? `lrs-dot-active-${id}` : ""}`}
                onClick={() => handleDot(i)}
              />
            ))}
          </div>
        )}

        {/* Counter */}
        {slides.length > 1 && (
          <div
            className={`lrs-counter-${id} ${mounted ? `lrs-counter-in-${id}` : ""}`}
          >
            <span className={`lrs-counter-cur-${id}`}>
              {String(current + 1).padStart(2, "0")}
            </span>
            <span className={`lrs-counter-line-${id}`} />
            <span>{String(slides.length).padStart(2, "0")}</span>
          </div>
        )}
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Exported component — wrapper with data fetching + layout
// ─────────────────────────────────────────────────────────────────────────────
export default function LeftRightSections() {
  const [leftSlides, setLeftSlides] = useState<LeftSectionSlide[]>([]);
  const [rightSlides, setRightSlides] = useState<RightSectionSlide[]>([]);
  const [leftLoading, setLeftLoading] = useState(true);
  const [rightLoading, setRightLoading] = useState(true);

  useEffect(() => {
    fetchActiveLeftSectionSlides()
      .then(setLeftSlides)
      .catch((err) =>
        console.error("[LeftRightSections] left fetch error:", err),
      )
      .finally(() => setLeftLoading(false));

    fetchActiveRightSectionSlides()
      .then(setRightSlides)
      .catch((err) =>
        console.error("[LeftRightSections] right fetch error:", err),
      )
      .finally(() => setRightLoading(false));
  }, []);

  // Don't render the row at all if both sections have no images and finished loading
  const bothEmpty =
    !leftLoading &&
    !rightLoading &&
    leftSlides.length === 0 &&
    rightSlides.length === 0;

  if (bothEmpty) return null;

  return (
    <>
      <style>{`
        .lrs-wrapper {
          width: 100%;
          background: #09111a;
          display: flex;
          gap: 4px;
        }

        /* Each panel's aspect ratio */
        .lrs-panel {
          flex: 1;
          min-width: 0;
          /* Tall on mobile, 16:9 on desktop */
          aspect-ratio: 4 / 3;
        }

        @media (max-width: 639px) {
          .lrs-wrapper {
            flex-direction: column;
            gap: 4px;
          }
          .lrs-panel {
            flex: none;
            width: 100%;
            aspect-ratio: 16 / 9;
          }
        }

        @media (min-width: 640px) and (max-width: 1023px) {
          .lrs-panel {
            aspect-ratio: 3 / 2;
          }
        }
      `}</style>

      <div className="lrs-wrapper">
        {/* Only render a panel if it has content or is still loading */}
        {(leftLoading || leftSlides.length > 0) && (
          <div className="lrs-panel">
            <SlidePanel
              slides={leftSlides}
              loading={leftLoading}
              initialDelayMs={0}
              instanceId="left"
            />
          </div>
        )}
        {(rightLoading || rightSlides.length > 0) && (
          <div className="lrs-panel">
            <SlidePanel
              slides={rightSlides}
              loading={rightLoading}
              initialDelayMs={SLIDE_INTERVAL_MS / 2}
              instanceId="right"
            />
          </div>
        )}
      </div>
    </>
  );
}
