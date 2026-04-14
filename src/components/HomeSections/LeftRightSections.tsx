/**
 * LeftRightSections.tsx — Two side-by-side slideshows below the hero
 *
 * PERFORMANCE FIXES:
 *  - Firestore fetches are deferred via requestIdleCallback (falls back to
 *    setTimeout 200ms) so they don't compete with the hero LCP image fetch.
 *  - All panel images use loading="lazy" + decoding="async" — they are
 *    below the fold so the browser should not fetch them eagerly.
 *  - Removed the opacity:0 / new Image() first-image gate (same LCP
 *    pattern fixed in HeroSections). Panel images render at full opacity;
 *    they are below the fold so this doesn't affect LCP.
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

interface AnySlide {
  id: string;
  imageUrl: string;
}

interface PanelProps {
  slides: AnySlide[];
  loading: boolean;
  initialDelayMs?: number;
  instanceId: string;
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

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 80);
    return () => clearTimeout(t);
  }, []);

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

  const startDrag = useCallback((x: number, y: number) => {
    dragStartX.current = x;
    dragStartY.current = y;
    isHDrag.current = false;
  }, []);

  const moveDrag = useCallback((x: number, y: number) => {
    if (dragStartX.current === null || dragStartY.current === null)
      return false;
    const dx = x - dragStartX.current,
      dy = y - dragStartY.current;
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

  return (
    <>
      <style>{`
        .lrs-root-${id} {
          position: relative; width: 100%; height: 100%;
          overflow: hidden; background: #09111a;
          touch-action: pan-y; cursor: grab;
          user-select: none; -webkit-user-select: none;
        }
        .lrs-root-${id}:active { cursor: grabbing; }
        .lrs-slide-${id} { position: absolute; inset: 0; overflow: hidden; }
        .lrs-img-${id} {
          position: absolute; inset: 0; width: 100%; height: 100%;
          object-fit: cover; object-position: center;
          display: block; -webkit-user-drag: none; pointer-events: none;
        }
        .lrs-cur-next-${id} { animation: lrs-cur-next-${id} ${ANIM_MS}ms cubic-bezier(0.4,0,0.2,1) forwards; }
        .lrs-cur-prev-${id} { animation: lrs-cur-prev-${id} ${ANIM_MS}ms cubic-bezier(0.4,0,0.2,1) forwards; }
        @keyframes lrs-cur-next-${id} { from{transform:translateX(0)} to{transform:translateX(-100%)} }
        @keyframes lrs-cur-prev-${id} { from{transform:translateX(0)} to{transform:translateX(100%)} }
        .lrs-inc-next-${id} { animation: lrs-inc-next-${id} ${ANIM_MS}ms cubic-bezier(0.4,0,0.2,1) forwards; }
        .lrs-inc-prev-${id} { animation: lrs-inc-prev-${id} ${ANIM_MS}ms cubic-bezier(0.4,0,0.2,1) forwards; }
        @keyframes lrs-inc-next-${id} { from{transform:translateX(100%)} to{transform:translateX(0)} }
        @keyframes lrs-inc-prev-${id} { from{transform:translateX(-100%)} to{transform:translateX(0)} }
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
        .lrs-dots-${id} {
          position: absolute; bottom: clamp(12px, 2.8vh, 28px);
          left: 50%; transform: translateX(-50%);
          z-index: 20; display: flex; gap: 6px; align-items: center;
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
        .lrs-dot-active-${id} { width: 22px; height: 7px; border-radius: 4px; background: rgba(255,255,255,0.90); transform: none; }
        .lrs-counter-${id} {
          position: absolute; bottom: clamp(14px, 2.8vh, 28px); right: clamp(12px, 2.5vw, 28px);
          z-index: 20; font-family: 'Outfit', system-ui, sans-serif;
          font-size: clamp(9px, 0.9vw, 12px); font-weight: 300;
          color: rgba(255,255,255,0.35); letter-spacing: 0.2em;
          display: flex; align-items: center; gap: 5px;
          pointer-events: none; opacity: 0; transition: opacity 0.9s ease 1s;
        }
        .lrs-counter-in-${id} { opacity: 1; }
        .lrs-counter-cur-${id} { font-size: clamp(13px, 1.3vw, 18px); font-weight: 700; color: rgba(255,255,255,0.70); }
        .lrs-counter-line-${id} { width: 12px; height: 1px; background: rgba(255,255,255,0.22); }
        .lrs-skeleton-${id} {
          position: absolute; inset: 0;
          background: linear-gradient(110deg, #09111a 30%, #141e2b 50%, #09111a 70%);
          background-size: 200% 100%; animation: lrs-shimmer-${id} 1.8s infinite; transition: opacity 0.8s ease;
        }
        .lrs-skeleton-hidden-${id} { opacity: 0; pointer-events: none; }
        @keyframes lrs-shimmer-${id} { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
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
        <div
          className={`lrs-skeleton-${id} ${!loading ? `lrs-skeleton-hidden-${id}` : ""}`}
        />

        {!loading && slides.length === 0 && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "linear-gradient(135deg, #09111a, #1a2535)",
            }}
          />
        )}

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
                  loading="lazy"
                  decoding="async"
                />
              </div>
            )}
            <div
              key={`cur-${slides[current].id}`}
              className={`lrs-slide-${id} ${animating ? (slideDir === "next" ? `lrs-inc-next-${id}` : `lrs-inc-prev-${id}`) : ""}`}
              style={{ zIndex: 2 }}
            >
              {/* PERF: all panel images are below the fold — always lazy */}
              <img
                src={slides[current].imageUrl}
                alt=""
                aria-hidden="true"
                draggable={false}
                className={`lrs-img-${id}`}
                loading="lazy"
                decoding="async"
              />
            </div>
          </>
        )}

        <div className={`lrs-vignette-${id}`} />
        <div className={`lrs-edge-top-${id}`} />
        <div className={`lrs-edge-bottom-${id}`} />

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

// ─── Helper: defer a callback until the browser is idle ──────────────────────
function runWhenIdle(cb: () => void, fallbackMs = 200) {
  if (typeof window !== "undefined" && "requestIdleCallback" in window) {
    (window as any).requestIdleCallback(cb, { timeout: 2000 });
  } else {
    setTimeout(cb, fallbackMs);
  }
}

export default function LeftRightSections() {
  const [leftSlides, setLeftSlides] = useState<LeftSectionSlide[]>([]);
  const [rightSlides, setRightSlides] = useState<RightSectionSlide[]>([]);
  const [leftLoading, setLeftLoading] = useState(true);
  const [rightLoading, setRightLoading] = useState(true);

  useEffect(() => {
    // PERF: Defer these Firestore fetches until the browser is idle so they
    // don't compete with the hero image / LCP fetch on initial load.
    runWhenIdle(() => {
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
    });
  }, []);

  const bothEmpty =
    !leftLoading &&
    !rightLoading &&
    leftSlides.length === 0 &&
    rightSlides.length === 0;
  if (bothEmpty) return null;

  return (
    <>
      <style>{`
        .lrs-outer {
          width: 100%;
          background: #09111a;
          box-sizing: border-box;
        }
        @media (min-width: 640px) { .lrs-outer { padding-top: 1.5rem; } }
        @media (max-width: 639px) { .lrs-outer { padding-top: 0; } }

        .lrs-wrapper { display: flex; gap: 4px; }

        .lrs-panel { flex: 1; min-width: 0; aspect-ratio: 16 / 9; }

        @media (max-width: 639px) {
          .lrs-wrapper { flex-direction: column; gap: 0; }
          .lrs-panel { flex: none; width: 100%; aspect-ratio: 4 / 3; }
        }
        @media (min-width: 640px) and (max-width: 1023px) {
          .lrs-panel { aspect-ratio: 16 / 9; }
        }
      `}</style>

      <div className="lrs-outer">
        <div className="lrs-wrapper">
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
      </div>
    </>
  );
}
