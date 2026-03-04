import { useEffect, useState } from "react";

interface SplashScreenProps {
  onComplete: () => void;
  minDuration?: number; // ms — keep splash visible for at least this long
}

export default function SplashScreen({
  onComplete,
  minDuration = 2800,
}: SplashScreenProps) {
  const [phase, setPhase] = useState<"enter" | "hold" | "exit">("enter");

  useEffect(() => {
    // Phase 1 — enter animations play (750ms)
    const holdTimer = setTimeout(() => setPhase("hold"), 750);

    // Phase 2 — hold for minDuration, then exit
    const exitTimer = setTimeout(() => setPhase("exit"), minDuration);

    // Phase 3 — after exit animation (900ms), notify parent
    const doneTimer = setTimeout(() => onComplete(), minDuration + 900);

    return () => {
      clearTimeout(holdTimer);
      clearTimeout(exitTimer);
      clearTimeout(doneTimer);
    };
  }, [minDuration, onComplete]);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,700;1,300;1,700;1,900&family=Jost:wght@200;300;400&display=swap');

        /* ── Root overlay ── */
        .sp-root {
          position: fixed;
          inset: 0;
          z-index: 99999;
          background: #080603;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          pointer-events: none;
        }

        /* Exit: two panels split vertically and slide away */
        .sp-panel-top,
        .sp-panel-bot {
          position: absolute;
          left: 0; right: 0;
          height: 50%;
          background: #080603;
          z-index: 2;
          transition: transform 0.9s cubic-bezier(0.76, 0, 0.24, 1);
        }
        .sp-panel-top { top: 0; transform: translateY(0); }
        .sp-panel-bot { bottom: 0; transform: translateY(0); }
        .sp-root.exiting .sp-panel-top { transform: translateY(-100%); }
        .sp-root.exiting .sp-panel-bot { transform: translateY(100%); }

        /* ── Film grain ── */
        .sp-grain {
          position: absolute;
          inset: 0;
          z-index: 1;
          opacity: 0.055;
          pointer-events: none;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
          background-size: 200px 200px;
        }

        /* ── Ambient radial glow ── */
        .sp-glow {
          position: absolute;
          top: 50%; left: 50%;
          transform: translate(-50%, -50%);
          width: 700px; height: 700px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(201,169,110,0.10) 0%, transparent 68%);
          pointer-events: none;
          z-index: 1;
          animation: sp-pulse 5s ease-in-out infinite;
        }
        @keyframes sp-pulse {
          0%,100% { opacity: 0.6; transform: translate(-50%,-50%) scale(1); }
          50%      { opacity: 1;   transform: translate(-50%,-50%) scale(1.1); }
        }

        /* ── Decorative rings ── */
        .sp-ring {
          position: absolute;
          top: 50%; left: 50%;
          border-radius: 50%;
          border: 1px solid rgba(201,169,110,0.10);
          pointer-events: none;
          z-index: 1;
          animation: sp-ring-breathe 7s ease-in-out infinite;
        }
        .sp-ring-1 { width: 220px; height: 220px; transform: translate(-50%,-50%); animation-delay: 0s; }
        .sp-ring-2 { width: 380px; height: 380px; transform: translate(-50%,-50%); animation-delay: 0.6s; border-color: rgba(201,169,110,0.07); }
        .sp-ring-3 { width: 560px; height: 560px; transform: translate(-50%,-50%); animation-delay: 1.2s; border-color: rgba(201,169,110,0.04); }
        @keyframes sp-ring-breathe {
          0%,100% { opacity: 0.7; }
          50%      { opacity: 1; }
        }

        /* ── Top & bottom edge lines ── */
        .sp-edge-line {
          position: absolute;
          left: 0; right: 0;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(201,169,110,0.35), rgba(229,224,198,0.55), rgba(201,169,110,0.35), transparent);
          z-index: 3;
          opacity: 0;
          transition: opacity 0.8s ease;
        }
        .sp-edge-top { top: 0; }
        .sp-edge-bot { bottom: 0; }
        .sp-root.holding .sp-edge-line,
        .sp-root.exiting .sp-edge-line { opacity: 1; }

        /* ── Centre content wrapper ── */
        .sp-center {
          position: relative;
          z-index: 5;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0;
        }

        /* ── Eyebrow ── */
        .sp-eyebrow {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 22px;
          opacity: 0;
          transform: translateY(14px);
          animation: sp-fade-up 0.8s cubic-bezier(0.22,1,0.36,1) 0.25s forwards;
        }
        .sp-eyebrow-line {
          width: 28px; height: 1px;
          background: linear-gradient(90deg, transparent, #c9a96e);
        }
        .sp-eyebrow-line.right { background: linear-gradient(90deg, #c9a96e, transparent); }
        .sp-eyebrow-text {
          font-family: 'Jost', sans-serif;
          font-size: 9px;
          font-weight: 300;
          letter-spacing: 0.38em;
          text-transform: uppercase;
          color: rgba(201,169,110,0.7);
        }

        /* ── Logo mark (diamond) ── */
        .sp-mark {
          width: 44px; height: 44px;
          border: 1.5px solid rgba(201,169,110,0.45);
          transform: rotate(45deg);
          display: flex; align-items: center; justify-content: center;
          margin-bottom: 28px;
          opacity: 0;
          animation: sp-mark-in 1.1s cubic-bezier(0.22,1,0.36,1) 0.1s forwards;
          box-shadow: 0 0 24px rgba(201,169,110,0.15), inset 0 0 12px rgba(201,169,110,0.05);
        }
        .sp-mark-inner {
          width: 14px; height: 14px;
          background: #c9a96e;
          opacity: 0.75;
        }
        @keyframes sp-mark-in {
          from { opacity: 0; transform: rotate(45deg) scale(0.6); }
          70%  { transform: rotate(45deg) scale(1.07); }
          to   { opacity: 1; transform: rotate(45deg) scale(1); }
        }

        /* ── Wordmark ── */
        .sp-word-loqta {
          font-family: 'Cormorant Garamond', Georgia, serif;
          font-size: clamp(72px, 16vw, 132px);
          font-weight: 700;
          font-style: italic;
          color: #F3E8D9;
          letter-spacing: -0.028em;
          line-height: 0.88;
          display: block;
          text-shadow: 0 2px 60px rgba(0,0,0,0.6);
          opacity: 0;
          transform: translateY(48px) skewY(1.5deg);
          animation: sp-word-up 1.2s cubic-bezier(0.22,1,0.36,1) 0.18s forwards;
        }
        .sp-word-zone {
          font-family: 'Cormorant Garamond', Georgia, serif;
          font-size: clamp(72px, 16vw, 132px);
          font-weight: 700;
          font-style: italic;
          color: transparent;
          -webkit-text-stroke: 1.6px rgba(243,232,217,0.65);
          letter-spacing: -0.028em;
          line-height: 0.88;
          display: block;
          margin-left: clamp(20px, 3.5vw, 56px);
          opacity: 0;
          transform: translateY(48px) skewY(1.5deg);
          animation: sp-word-up 1.2s cubic-bezier(0.22,1,0.36,1) 0.34s forwards;
        }
        @keyframes sp-word-up {
          from { opacity: 0; transform: translateY(48px) skewY(1.5deg); }
          to   { opacity: 1; transform: translateY(0) skewY(0); }
        }

        /* ── Gold rule ── */
        .sp-rule {
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(201,169,110,0.5), transparent);
          margin-top: 20px;
          width: 0;
          animation: sp-rule-expand 1s cubic-bezier(0.22,1,0.36,1) 1s forwards;
          align-self: stretch;
        }
        @keyframes sp-rule-expand {
          from { width: 0; opacity: 0; }
          to   { width: 100%; opacity: 1; }
        }

        /* ── Tagline ── */
        .sp-tagline {
          font-family: 'Jost', sans-serif;
          font-size: 9.5px;
          font-weight: 200;
          letter-spacing: 0.36em;
          text-transform: uppercase;
          color: rgba(229,224,198,0.38);
          margin-top: 14px;
          opacity: 0;
          animation: sp-fade-up 0.8s ease 1.3s forwards;
        }

        /* ── Progress bar ── */
        .sp-progress-wrap {
          width: clamp(160px, 28vw, 260px);
          margin-top: 44px;
          opacity: 0;
          animation: sp-fade-up 0.7s ease 1.5s forwards;
        }
        .sp-progress-track {
          width: 100%;
          height: 1px;
          background: rgba(229,224,198,0.08);
          border-radius: 999px;
          overflow: hidden;
          position: relative;
        }
        .sp-progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #c9a96e, rgba(243,232,217,0.8), #c9a96e);
          background-size: 200% 100%;
          border-radius: 999px;
          animation: sp-fill 2.2s cubic-bezier(0.4,0,0.2,1) 1.6s forwards,
                     sp-shimmer 1.8s ease 1.6s infinite;
          width: 0%;
        }
        @keyframes sp-fill {
          0%   { width: 0%; }
          60%  { width: 85%; }
          100% { width: 100%; }
        }
        @keyframes sp-shimmer {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        .sp-progress-label {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 9px;
        }
        .sp-progress-text {
          font-family: 'Jost', sans-serif;
          font-size: 8px;
          font-weight: 300;
          letter-spacing: 0.26em;
          text-transform: uppercase;
          color: rgba(229,224,198,0.22);
        }

        /* ── Corner ornaments ── */
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
          border-top: 1px solid rgba(201,169,110,0.35);
          border-left: 1px solid rgba(201,169,110,0.35); }
        .sp-corner-tr { top: 28px; right: 28px;
          border-top: 1px solid rgba(201,169,110,0.35);
          border-right: 1px solid rgba(201,169,110,0.35); }
        .sp-corner-bl { bottom: 28px; left: 28px;
          border-bottom: 1px solid rgba(201,169,110,0.35);
          border-left: 1px solid rgba(201,169,110,0.35); }
        .sp-corner-br { bottom: 28px; right: 28px;
          border-bottom: 1px solid rgba(201,169,110,0.35);
          border-right: 1px solid rgba(201,169,110,0.35); }

        /* ── Generic fade-up ── */
        @keyframes sp-fade-up {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        /* ── Season label (bottom right) ── */
        .sp-season {
          position: absolute;
          bottom: 44px; right: 44px;
          z-index: 4;
          text-align: right;
          opacity: 0;
          animation: sp-fade-up 0.8s ease 1.8s forwards;
        }
        .sp-season-label {
          font-family: 'Jost', sans-serif;
          font-size: 8px;
          font-weight: 300;
          letter-spacing: 0.28em;
          text-transform: uppercase;
          color: rgba(229,224,198,0.2);
          display: block;
        }
        .sp-season-accent {
          width: 22px; height: 1px;
          background: rgba(201,169,110,0.45);
          margin: 6px 0 0 auto;
        }

        /* ── Left vertical label ── */
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
          color: rgba(229,224,198,0.15);
          white-space: nowrap;
          opacity: 0;
          animation: sp-fade-up 0.8s ease 1.9s forwards;
        }

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
        className={`sp-root ${
          phase === "exit" ? "exiting" : phase === "hold" ? "holding" : ""
        }`}
      >
        {/* Split-exit panels */}
        <div className="sp-panel-top" />
        <div className="sp-panel-bot" />

        {/* Atmosphere */}
        <div className="sp-glow" />
        <div className="sp-grain" />

        {/* Decorative rings */}
        <div className="sp-ring sp-ring-1" />
        <div className="sp-ring sp-ring-2" />
        <div className="sp-ring sp-ring-3" />

        {/* Edge lines */}
        <div className="sp-edge-line sp-edge-top" />
        <div className="sp-edge-line sp-edge-bot" />

        {/* Corner ornaments */}
        <div className="sp-corner sp-corner-tl" />
        <div className="sp-corner sp-corner-tr" />
        <div className="sp-corner sp-corner-bl" />
        <div className="sp-corner sp-corner-br" />

        {/* Vertical label */}
        <div className="sp-vertical">Auction · Luxury · Experience</div>

        {/* Season / edition label */}
        <div className="sp-season">
          <span className="sp-season-label">Editorial Direction</span>
          <span className="sp-season-label" style={{ opacity: 0.5 }}>
            Season 2025
          </span>
          <div className="sp-season-accent" />
        </div>

        {/* ── Centre wordmark ── */}
        <div className="sp-center">
          {/* Eyebrow */}
          <div className="sp-eyebrow">
            <div className="sp-eyebrow-line" />
            <span className="sp-eyebrow-text">Welcome to</span>
            <div className="sp-eyebrow-line right" />
          </div>

          {/* Diamond mark */}
          <div className="sp-mark">
            <div className="sp-mark-inner" />
          </div>

          {/* Wordmark */}
          <span className="sp-word-loqta">Loqta</span>
          <span className="sp-word-zone">Zone</span>

          {/* Rule */}
          <div className="sp-rule" />

          {/* Tagline */}
          <div className="sp-tagline">Bid · Win · Own</div>

          {/* Progress */}
          <div className="sp-progress-wrap">
            <div className="sp-progress-track">
              <div className="sp-progress-fill" />
            </div>
            <div className="sp-progress-label">
              <span className="sp-progress-text">Loading experience</span>
              <span className="sp-progress-text">✦</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
