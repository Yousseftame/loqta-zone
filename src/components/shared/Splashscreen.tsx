import React, { useEffect, useState, useRef } from "react";
// ── Kick off homepage data fetches NOW so they're ready when splash ends ──────
import "@/lib/homeDataCache";

interface SplashScreenProps {
  onComplete: () => void;
  minDuration?: number;
}

function shouldSkipSplash(): boolean {
  try {
    if (sessionStorage.getItem("sp_shown") === "1") return true;
    sessionStorage.setItem("sp_shown", "1");
  } catch {
    return true;
  }
  return false;
}

export default function SplashScreen({
  onComplete,
  minDuration = 2800,
}: SplashScreenProps) {
  const [phase, setPhase] = useState<"enter" | "hold" | "exit" | "done">(
    "enter",
  );
  const [isVideoActive, setIsVideoActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const skipped = useRef(shouldSkipSplash());
  const transitionActive = useRef(false);

  const triggerExit = () => {
    if (transitionActive.current) return;
    transitionActive.current = true;
    setPhase("exit");
    const doneTimer = setTimeout(() => {
      setPhase("done");
      onComplete();
    }, 900);
    return doneTimer;
  };

  useEffect(() => {
    if (skipped.current) {
      onComplete();
      return;
    }

    if (videoRef.current) {
      videoRef.current.play().catch(() => {});
    }

    const backupDuration = Math.max(minDuration + 2000, 6000);
    const backupTimer = setTimeout(() => {
      triggerExit();
    }, backupDuration);

    return () => {
      clearTimeout(backupTimer);
    };
  }, [minDuration, onComplete]);

  if (skipped.current || phase === "done") return null;

  const handleVideoPlay = () => {
    setIsVideoActive(true);
    setPhase("hold");
  };

  const handleVideoEnded = () => {
    triggerExit();
  };

  return (
    <>
      <style>{`
        .sp-root {
          position: fixed;
          inset: 0;
          z-index: 99999;
          background: #162B46;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          pointer-events: none;
          will-change: transform;
        }

        /* Curtain panels — open on exit */
        .sp-panel-top,
        .sp-panel-bot {
          position: absolute;
          left: 0; right: 0;
          height: 50%;
          background: #162B46;
          z-index: 2;
          transition: transform 0.9s cubic-bezier(0.76, 0, 0.24, 1);
          will-change: transform;
        }
        .sp-panel-top { top: 0; transform: translateY(0); }
        .sp-panel-bot { bottom: 0; transform: translateY(0); }
        .sp-root.exiting .sp-panel-top { transform: translateY(-100%); }
        .sp-root.exiting .sp-panel-bot { transform: translateY(100%); }

        /* Video wrapper — sits above curtains */
        .sp-video-wrapper {
          position: absolute;
          inset: 0;
          z-index: 5;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #162B46;
          opacity: 0;
          transition: opacity 1s cubic-bezier(0.22, 1, 0.36, 1);
        }
        .sp-video-wrapper.video-active {
          opacity: 1;
        }

        /* Frameless video — no border, no shadow, no radius */
        .sp-video {
          display: block;
          width: auto;
          height: auto;
          max-width: 100vw;
          max-height: 100vh;
          object-fit: contain;
          background: #162B46;
        }

        /* Fade out on exit */
        .sp-root.exiting .sp-video-wrapper {
          opacity: 0;
          transition: opacity 0.5s ease;
        }
      `}</style>

      <div
        className={`sp-root ${phase === "exit" ? "exiting" : ""}`}
      >
        {/* Curtains that slide open on exit */}
        <div className="sp-panel-top" />
        <div className="sp-panel-bot" />

        {/* Full-bleed video */}
        <div className={`sp-video-wrapper ${isVideoActive ? "video-active" : ""}`}>
          <video
            ref={videoRef}
            className="sp-video"
            src="/Video%20Project%202.mp4"
            autoPlay
            muted={true}
            playsInline
            onPlay={handleVideoPlay}
            onEnded={handleVideoEnded}
          />
        </div>
      </div>
    </>
  );
}
