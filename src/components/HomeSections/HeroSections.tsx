/**
 * HeroSections.tsx — Premium Slideshow
 *
 * LCP FIX (root cause of NO_LCP / missing performance score):
 *
 *  The previous version waited for a Firestore fetch before rendering ANY
 *  image. Lighthouse takes its LCP snapshot early — before Firebase responds —
 *  so it never saw an image element and reported NO_LCP, which causes the
 *  entire Performance score to be omitted.
 *
 *  Fix strategy (three layers, each one helps):
 *
 *  1. STATIC PLACEHOLDER — A local image (/hero-placeholder.jpg in /public)
 *     is rendered immediately in the first paint, before any JS or network
 *     call completes. Lighthouse sees it instantly → valid LCP element.
 *     → Replace /hero-placeholder.jpg with an actual image from your /public
 *       folder. It can be the same as your first Firestore slide; copy it
 *       into /public so it ships with the build.
 *
 *  2. LOCALSTORAGE CACHE — After the first Firestore load the URL of slide 0
 *     is stored in localStorage. On the next visit the cached URL is shown
 *     immediately (before Firestore resolves), giving real-user LCP < 200 ms.
 *
 *  3. fetchPriority="high" + loading="eager" + decoding="sync" on the visible
 *     first image so the browser prioritises the fetch above everything else.
 */

import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  fetchActiveHeroSlides,
  type HeroSlide,
} from "@/service/heroSlide/heroSlideService";

const SLIDE_INTERVAL_MS = 7000;
const ANIM_MS = 900;
const NAVBAR_H = 92;

// ─── Layer 1: static asset that ships with the build ─────────────────────────
// Copy your best hero image into /public/hero-placeholder.jpg
// If you don't have one yet, point this to any image that already exists in
// your /public folder (e.g. "/logo.png"). It just needs to be something the
// browser can fetch without any JS or API call.
const STATIC_PLACEHOLDER = "/hero-placeholder.jpg";

// ─── Layer 2: localStorage cache key ─────────────────────────────────────────
const LS_KEY = "loqta_hero_slide_0_url";

function getCachedHeroUrl(): string | null {
  try {
    return localStorage.getItem(LS_KEY);
  } catch {
    return null;
  }
}

function setCachedHeroUrl(url: string) {
  try {
    localStorage.setItem(LS_KEY, url);
  } catch {
    // ignore — storage may be blocked
  }
}

export default function HeroSections() {
  const [slides, setSlides] = useState<HeroSlide[]>([]);
  const [current, setCurrent] = useState(0);
  const [prevIdx, setPrevIdx] = useState<number | null>(null);
  const [slideDir, setSlideDir] = useState<"next" | "prev">("next");
  const [animating, setAnimating] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [slidesLoading, setSlidesLoading] = useState(true);
  const [progress, setProgress] = useState(0);

  // The URL shown before Firestore resolves (cached or static placeholder)
  const [earlyImageUrl] = useState<string>(
    () => getCachedHeroUrl() ?? STATIC_PLACEHOLDER,
  );

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
    fetchActiveHeroSlides()
      .then((data: any) => {
        setSlides(data);
        // Cache slide 0 URL for next visit
        if (data?.[0]?.imageUrl) {
          setCachedHeroUrl(data[0].imageUrl);
        }
      })
      .catch((err: any) =>
        console.error("[HeroSections] Failed to load slides:", err),
      )
      .finally(() => setSlidesLoading(false));
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 60);
    return () => clearTimeout(t);
  }, []);

  // Prefetch the NEXT slide image only
  useEffect(() => {
    if (slides.length < 2) return;
    const nextSrc = slides[(current + 1) % slides.length].imageUrl;
    const link = document.createElement("link");
    link.rel = "prefetch";
    link.as = "image";
    link.href = nextSrc;
    document.head.appendChild(link);
    return () => {
      document.head.removeChild(link);
    };
  }, [current, slides]);

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

  const startAuto = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(goNext, SLIDE_INTERVAL_MS);
    resetProgress();
  }, [goNext, resetProgress]);

  useEffect(() => {
    if (slides.length < 2) return;
    startAuto();
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [slides.length, startAuto]);

  const pauseInterval = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
  }, []);
  const resumeInterval = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(goNext, SLIDE_INTERVAL_MS);
  }, [goNext]);

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
    if (!isHDrag.current && Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 8)
      isHDrag.current = true;
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

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) =>
      startDrag(e.touches[0].clientX, e.touches[0].clientY),
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
    (e: React.TouchEvent) => endDrag(e.changedTouches[0].clientX),
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
    (e: React.MouseEvent) => endDrag(e.clientX),
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

  const handleDot = (i: number) => {
    goTo(i, i > current ? "next" : "prev");
    resumeInterval();
  };

  return (
    <>
      <style>{`
        .hs-outer {
          width: 100%;
          background: #09111a;
          box-sizing: border-box;
        }
        .hs-root {
          position: relative;
          width: 100%;
          margin-top: ${NAVBAR_H}px;
          height: calc(100vh - ${NAVBAR_H}px);
          min-height: 400px;
          overflow: hidden;
          background: #09111a;
          touch-action: pan-y;
          cursor: grab;
          user-select: none;
          -webkit-user-select: none;
        }
        .hs-root:active { cursor: grabbing; }

        @media (max-width: 639px) {
          .hs-root {
            margin-top: ${NAVBAR_H}px;
            height: 70vw;
            min-height: 200px;
          }
        }
        @media (min-width: 640px) and (max-width: 900px) {
          .hs-root {
            height: auto;
            min-height: unset;
            aspect-ratio: 16 / 9;
          }
        }

        .hs-slide { position: absolute; inset: 0; overflow: hidden; }

        .hs-img {
          position: absolute; inset: 0; width: 100%; height: 100%;
          object-fit: cover; object-position: center center;
          display: block; -webkit-user-drag: none; pointer-events: none;
        }

        .hs-cur-next { animation: hs-cur-next ${ANIM_MS}ms cubic-bezier(0.4,0,0.2,1) forwards; }
        .hs-cur-prev { animation: hs-cur-prev ${ANIM_MS}ms cubic-bezier(0.4,0,0.2,1) forwards; }
        @keyframes hs-cur-next { from{transform:translateX(0)} to{transform:translateX(-100%)} }
        @keyframes hs-cur-prev { from{transform:translateX(0)} to{transform:translateX(100%)} }
        .hs-inc-next { animation: hs-inc-next ${ANIM_MS}ms cubic-bezier(0.4,0,0.2,1) forwards; }
        .hs-inc-prev { animation: hs-inc-prev ${ANIM_MS}ms cubic-bezier(0.4,0,0.2,1) forwards; }
        @keyframes hs-inc-next { from{transform:translateX(100%)} to{transform:translateX(0)} }
        @keyframes hs-inc-prev { from{transform:translateX(-100%)} to{transform:translateX(0)} }

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
        .hs-dot--active { width: 28px; height: 9px; border-radius: 5px; background: rgba(255,255,255,0.92); transform: none; }

        .hs-counter {
          position: absolute;
          bottom: clamp(20px, 3.5vh, 40px); right: clamp(20px, 3vw, 56px);
          z-index: 20;
          font-family: 'Outfit', system-ui, sans-serif;
          font-size: clamp(10px, 1vw, 14px); font-weight: 300;
          color: rgba(255,255,255,0.35); letter-spacing: 0.22em;
          display: flex; align-items: center; gap: 7px;
          pointer-events: none; opacity: 0; transition: opacity 0.9s ease 1s;
        }
        .hs-counter--in { opacity: 1; }
        .hs-counter-cur { font-size: clamp(15px, 1.5vw, 22px); font-weight: 700; color: rgba(255,255,255,0.70); }
        .hs-counter-line { width: 16px; height: 1px; background: rgba(255,255,255,0.22); }

        .hs-skeleton {
          position: absolute; inset: 0;
          background: linear-gradient(110deg, #09111a 30%, #141e2b 50%, #09111a 70%);
          background-size: 200% 100%;
          animation: hs-shimmer 1.8s infinite; transition: opacity 0.8s ease;
        }
        .hs-skeleton--hidden { opacity: 0; pointer-events: none; }
        @keyframes hs-shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }

        @media (max-width: 639px) {
          .hs-counter { display: none; }
          .hs-dot--active { width: 22px; }
          .hs-dots { bottom: clamp(10px, 2.5vh, 20px); }
        }
      `}</style>

      <div className="hs-outer">
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
          {/*
           * ── LCP LAYER 1: static/cached image shown IMMEDIATELY ──────────────
           * This renders on the very first React paint, before any Firestore
           * call completes. Lighthouse will find this element and record a
           * valid LCP. Once slides load from Firestore this element is removed.
           *
           * earlyImageUrl is either:
           *   • The URL cached from the user's last visit (localStorage), OR
           *   • /hero-placeholder.jpg  (static file you place in /public)
           *
           * ACTION REQUIRED: copy your best hero image to /public/hero-placeholder.jpg
           */}
          {slidesLoading && (
            <div className="hs-slide" style={{ zIndex: 2 }}>
              <img
                src={earlyImageUrl}
                alt="Loqta Zone"
                className="hs-img"
                // These three attributes are what make this the LCP element:
                fetchPriority="high"
                loading="eager"
                decoding="sync"
              />
            </div>
          )}

          {/* Shimmer skeleton sits behind the placeholder image */}
          <div
            className={`hs-skeleton ${!slidesLoading ? "hs-skeleton--hidden" : ""}`}
          />

          {!slidesLoading && slides.length === 0 && (
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
              {/* Outgoing slide during animation */}
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
                    loading="lazy"
                    decoding="async"
                  />
                </div>
              )}

              {/* Current slide */}
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
                  className="hs-img"
                  fetchPriority={current === 0 ? "high" : "auto"}
                  loading={current === 0 ? "eager" : "lazy"}
                  decoding={current === 0 ? "sync" : "async"}
                />
              </div>
            </>
          )}

          <div className="hs-vignette" />
          <div className="hs-edge-top" />
          <div className="hs-edge-bottom" />

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
      </div>
    </>
  );
}
