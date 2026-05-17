import React, { useEffect, useState, useRef } from "react";

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

  // Safe exit function
  const triggerExit = () => {
    if (transitionActive.current) return;
    transitionActive.current = true;
    setPhase("exit");
    
    // Smooth transition matching the curtain slide
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

    // Force play in case browser struggles with autoplay
    if (videoRef.current) {
      videoRef.current.play().catch((err) => {
        console.log("Autoplay was prevented, waiting for user click.", err);
      });
    }

    // Backup timer: if video fails to play/load, transition automatically
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
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,700;1,300;1,700;1,900&family=Jost:wght@200;300;400&display=swap');

        .sp-root {
          position: fixed;
          inset: 0;
          z-index: 99999;
          background: transparent;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          pointer-events: none;
          will-change: transform;
        }

        .sp-panel-top,
        .sp-panel-bot {
          position: absolute;
          left: 0; right: 0;
          height: 50%;
          background: #080603;
          z-index: 2;
          transition: transform 0.9s cubic-bezier(0.76, 0, 0.24, 1);
          will-change: transform;
        }
        .sp-panel-top { top: 0; transform: translateY(0); }
        .sp-panel-bot { bottom: 0; transform: translateY(0); }
        .sp-root.exiting .sp-panel-top { transform: translateY(-100%); }
        .sp-root.exiting .sp-panel-bot { transform: translateY(100%); }

        .sp-grain {
          position: absolute;
          inset: 0;
          z-index: 3;
          opacity: 0.045;
          pointer-events: none;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
          background-size: 200px 200px;
          transition: opacity 0.5s ease;
        }
        .sp-root.exiting .sp-grain {
          opacity: 0;
        }

        .sp-glow {
          position: absolute;
          top: 50%; left: 50%;
          transform: translate(-50%, -50%);
          width: 750px; height: 750px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(201,169,110,0.08) 0%, transparent 68%);
          pointer-events: none;
          z-index: 1;
          animation: sp-pulse 6s ease-in-out infinite;
          transition: opacity 0.5s ease;
        }
        @keyframes sp-pulse {
          0%,100% { opacity: 0.5; transform: translate(-50%,-50%) scale(1); }
          50%      { opacity: 0.9;   transform: translate(-50%,-50%) scale(1.08); }
        }

        .sp-ring {
          position: absolute;
          top: 50%; left: 50%;
          border-radius: 50%;
          border: 1px solid rgba(201,169,110,0.07);
          pointer-events: none;
          z-index: 1;
          animation: sp-ring-breathe 8s ease-in-out infinite;
          transition: opacity 0.5s ease;
        }
        .sp-ring-1 { width: 320px; height: 320px; transform: translate(-50%,-50%); animation-delay: 0s; }
        .sp-ring-2 { width: 500px; height: 500px; transform: translate(-50%,-50%); animation-delay: 0.8s; border-color: rgba(201,169,110,0.04); }
        .sp-ring-3 { width: 700px; height: 700px; transform: translate(-50%,-50%); animation-delay: 1.6s; border-color: rgba(201,169,110,0.02); }
        @keyframes sp-ring-breathe {
          0%,100% { opacity: 0.5; }
          50%      { opacity: 0.8; }
        }

        .sp-edge-line {
          position: absolute;
          left: 0; right: 0;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(201,169,110,0.25), rgba(229,224,198,0.45), rgba(201,169,110,0.25), transparent);
          z-index: 4;
          opacity: 0;
          transition: opacity 0.8s ease;
        }
        .sp-edge-top { top: 0; }
        .sp-edge-bot { bottom: 0; }
        .sp-root.holding .sp-edge-line,
        .sp-root.exiting .sp-edge-line { opacity: 1; }

        .sp-corner {
          position: absolute;
          width: 32px; height: 32px;
          z-index: 4;
          opacity: 0;
          transition: opacity 0.8s ease;
        }
        .sp-root.holding .sp-corner,
        .sp-root.exiting .sp-corner { opacity: 1; }
        .sp-corner-tl { top: 28px; left: 28px;
          border-top: 1px solid rgba(201,169,110,0.25);
          border-left: 1px solid rgba(201,169,110,0.25); }
        .sp-corner-tr { top: 28px; right: 28px;
          border-top: 1px solid rgba(201,169,110,0.25);
          border-right: 1px solid rgba(201,169,110,0.25); }
        .sp-corner-bl { bottom: 28px; left: 28px;
          border-bottom: 1px solid rgba(201,169,110,0.25);
          border-left: 1px solid rgba(201,169,110,0.25); }
        .sp-corner-br { bottom: 28px; right: 28px;
          border-bottom: 1px solid rgba(201,169,110,0.25);
          border-right: 1px solid rgba(201,169,110,0.25); }

        .sp-vertical {
          position: absolute;
          left: 40px;
          top: 50%;
          transform: translateY(-50%) rotate(-90deg);
          transform-origin: center center;
          z-index: 4;
          font-family: 'Jost', sans-serif;
          font-size: 8px;
          font-weight: 300;
          letter-spacing: 0.32em;
          text-transform: uppercase;
          color: rgba(229,224,198,0.12);
          white-space: nowrap;
          opacity: 0;
          animation: sp-fade-up 0.8s ease 1s forwards;
          transition: opacity 0.5s ease;
        }

        .sp-season {
          position: absolute;
          bottom: 44px; right: 44px;
          z-index: 4;
          text-align: right;
          opacity: 0;
          animation: sp-fade-up 0.8s ease 1.2s forwards;
          transition: opacity 0.5s ease;
        }
        .sp-season-label {
          font-family: 'Jost', sans-serif;
          font-size: 8px;
          font-weight: 300;
          letter-spacing: 0.28em;
          text-transform: uppercase;
          color: rgba(229,224,198,0.15);
          display: block;
        }
        .sp-season-accent {
          width: 22px; height: 1px;
          background: rgba(201,169,110,0.3);
          margin: 6px 0 0 auto;
        }

        /* Video Container and Sizing */
        .sp-video-wrapper {
          position: absolute;
          inset: 0;
          z-index: 5;
          display: flex;
          align-items: center;
          justify-content: center;
          background: transparent;
          padding: 0; /* No offset, full bleed */
          opacity: 0;
          transform: scale(1.02);
          transition: opacity 1.2s cubic-bezier(0.22, 1, 0.36, 1),
                      transform 1.2s cubic-bezier(0.22, 1, 0.36, 1);
        }
        .sp-video-wrapper.video-active {
          opacity: 1;
          transform: scale(1);
        }

        .sp-video-frame {
          position: relative;
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          background: transparent;
        }

        .sp-video {
          display: block;
          width: 100%;
          height: 100%;
          object-fit: cover; /* expands video to fill the entire width and height */
        }

        /* Fade-out transitions on Exit */
        .sp-root.exiting .sp-video-wrapper,
        .sp-root.exiting .sp-glow,
        .sp-root.exiting .sp-ring,
        .sp-root.exiting .sp-corner,
        .sp-root.exiting .sp-season,
        .sp-root.exiting .sp-vertical,
        .sp-root.exiting .sp-edge-line {
          opacity: 0 !important;
          transform: translateY(-10px) scale(0.98);
          transition: opacity 0.5s ease, transform 0.5s ease;
        }

        @keyframes sp-fade-up {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        /* Removed max-width constraint on mobile for true full screen */

        @media (max-width: 500px) {
          .sp-corner { width: 20px; height: 20px; }
          .sp-corner-tl, .sp-corner-tr { top: 18px; }
          .sp-corner-bl, .sp-corner-br { bottom: 18px; }
          .sp-corner-tl, .sp-corner-bl { left: 18px; }
          .sp-corner-tr, .sp-corner-br { right: 18px; }
          .sp-season { bottom: 24px; right: 24px; }
          .sp-vertical { display: none; }
        }
      `}</style>

      <div
        className={`sp-root ${phase === "exit" ? "exiting" : phase === "hold" ? "holding" : ""}`}
      >
        {/* Curtains that open at exit */}
        <div className="sp-panel-top" />
        <div className="sp-panel-bot" />

        {/* Ambient Luxurious Effects */}
        <div className="sp-glow" />
        <div className="sp-grain" />
        <div className="sp-ring sp-ring-1" />
        <div className="sp-ring sp-ring-2" />
        <div className="sp-ring sp-ring-3" />
        <div className="sp-edge-line sp-edge-top" />
        <div className="sp-edge-line sp-edge-bot" />
        
        {/* Geometric Corner Lines */}
        <div className="sp-corner sp-corner-tl" />
        <div className="sp-corner sp-corner-tr" />
        <div className="sp-corner sp-corner-bl" />
        <div className="sp-corner sp-corner-br" />

        {/* Editorial Text Overlays */}
        <div className="sp-vertical">Auction · Luxury · Experience</div>
        <div className="sp-season">
          <span className="sp-season-label">Editorial Direction</span>
          <span className="sp-season-label" style={{ opacity: 0.5 }}>
            Season 2025
          </span>
          <div className="sp-season-accent" />
        </div>

        {/* Centered Luxury Video Frame */}
        <div className={`sp-video-wrapper ${isVideoActive ? "video-active" : ""}`}>
          <div className="sp-video-frame">
            <video
              ref={videoRef}
              className="sp-video"
              src="/hf_20260517_083750_63fd66a2-fa5c-4488-8e53-bee0b12db710.mp4"
              autoPlay
              muted={true}
              playsInline
              onPlay={handleVideoPlay}
              onEnded={handleVideoEnded}
            />
          </div>
        </div>
      </div>
    </>
  );
}

