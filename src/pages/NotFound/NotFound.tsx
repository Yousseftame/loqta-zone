import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

const NotFound: React.FC = () => {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 60);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const fn = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const el = containerRef.current;
      if (!el) return;
      const { innerWidth, innerHeight } = window;
      const x = (e.clientX / innerWidth - 0.5) * 18;
      const y = (e.clientY / innerHeight - 0.5) * 18;
      const layers = el.querySelectorAll<HTMLElement>("[data-parallax]");
      layers.forEach((layer) => {
        const speed = parseFloat(layer.dataset.parallax || "1");
        layer.style.transform = `translate(${x * speed}px, ${y * speed}px)`;
      });
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  return (
    <>
      <style>{`

        .nf-root {
          position: relative;
          min-height: 100vh;
          background: #080603;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          font-family: 'Jost', sans-serif;
          color: rgb(229, 224, 198);
        }

        /* ── Film grain ── */
        .nf-grain {
          position: fixed;
          inset: 0;
          z-index: 0;
          opacity: 0.04;
          pointer-events: none;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
          background-size: 200px 200px;
        }

        /* ── Ambient glows ── */
        .nf-glow-main {
          position: absolute;
          top: 40%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 800px;
          height: 800px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(201,169,110,0.07) 0%, transparent 65%);
          pointer-events: none;
          z-index: 0;
          animation: nf-pulse 6s ease-in-out infinite;
        }
        .nf-glow-tr {
          position: absolute;
          top: -10%;
          right: -8%;
          width: 500px;
          height: 500px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(42,72,99,0.28) 0%, transparent 68%);
          pointer-events: none;
          z-index: 0;
        }
        .nf-glow-bl {
          position: absolute;
          bottom: -15%;
          left: -8%;
          width: 440px;
          height: 440px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(42,72,99,0.22) 0%, transparent 68%);
          pointer-events: none;
          z-index: 0;
        }
        @keyframes nf-pulse {
          0%,100% { opacity: 0.7; transform: translate(-50%, -50%) scale(1); }
          50%      { opacity: 1;   transform: translate(-50%, -50%) scale(1.06); }
        }

        /* ── Decorative rings ── */
        .nf-ring {
          position: absolute;
          top: 50%;
          left: 50%;
          border-radius: 50%;
          border: 1px solid rgba(201,169,110,0.1);
          pointer-events: none;
          z-index: 0;
          animation: nf-ring-breathe 7s ease-in-out infinite;
        }
        .nf-ring-1 { width: 200px; height: 200px; transform: translate(-50%,-50%); animation-delay: 0s; }
        .nf-ring-2 { width: 380px; height: 380px; transform: translate(-50%,-50%); animation-delay: 0.8s; border-color: rgba(201,169,110,0.065); }
        .nf-ring-3 { width: 600px; height: 600px; transform: translate(-50%,-50%); animation-delay: 1.6s; border-color: rgba(201,169,110,0.035); }
        .nf-ring-4 { width: 900px; height: 900px; transform: translate(-50%,-50%); animation-delay: 2.4s; border-color: rgba(201,169,110,0.018); }
        @keyframes nf-ring-breathe {
          0%,100% { opacity: 0.6; }
          50%      { opacity: 1; }
        }

        /* ── Top & bottom edge lines ── */
        .nf-edge {
          position: absolute;
          left: 0; right: 0;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(201,169,110,0.35), rgba(229,224,198,0.55), rgba(201,169,110,0.35), transparent);
          z-index: 3;
          pointer-events: none;
        }
        .nf-edge-top { top: 0; }
        .nf-edge-bot { bottom: 0; }

        /* ── Corner ornaments ── */
        .nf-corner {
          position: absolute;
          width: 36px; height: 36px;
          z-index: 4;
          pointer-events: none;
          opacity: 0;
          transition: opacity 0.9s ease;
        }
        .nf-root.ready .nf-corner { opacity: 1; }
        .nf-corner-tl { top: 32px; left: 32px;
          border-top: 1px solid rgba(201,169,110,0.4);
          border-left: 1px solid rgba(201,169,110,0.4); }
        .nf-corner-tr { top: 32px; right: 32px;
          border-top: 1px solid rgba(201,169,110,0.4);
          border-right: 1px solid rgba(201,169,110,0.4); }
        .nf-corner-bl { bottom: 32px; left: 32px;
          border-bottom: 1px solid rgba(201,169,110,0.4);
          border-left: 1px solid rgba(201,169,110,0.4); }
        .nf-corner-br { bottom: 32px; right: 32px;
          border-bottom: 1px solid rgba(201,169,110,0.4);
          border-right: 1px solid rgba(201,169,110,0.4); }

        /* ── Vertical side labels ── */
        .nf-vertical {
          position: absolute;
          top: 50%;
          z-index: 4;
          font-size: 8px;
          font-weight: 300;
          letter-spacing: 0.32em;
          text-transform: uppercase;
          color: rgba(229,224,198,0.15);
          white-space: nowrap;
          pointer-events: none;
          opacity: 0;
          transition: opacity 0.9s ease 0.8s;
        }
        .nf-root.ready .nf-vertical { opacity: 1; }
        .nf-vertical-l { left: 40px; transform: translateY(-50%) rotate(-90deg); }
        .nf-vertical-r { right: 40px; transform: translateY(-50%) rotate(90deg); }

        /* ── Centre stage ── */
        .nf-stage {
          position: relative;
          z-index: 5;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0;
          padding: 0 24px;
          text-align: center;
          max-width: 680px;
          width: 100%;
        }

        /* ── Eyebrow ── */
        .nf-eyebrow {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 32px;
          opacity: 0;
          transform: translateY(12px);
          transition: opacity 0.8s ease 0.15s, transform 0.8s cubic-bezier(0.22,1,0.36,1) 0.15s;
        }
        .nf-root.ready .nf-eyebrow { opacity: 1; transform: translateY(0); }
        .nf-eyebrow-line {
          width: 36px; height: 1px;
          background: linear-gradient(90deg, transparent, #c9a96e);
        }
        .nf-eyebrow-line.r { background: linear-gradient(90deg, #c9a96e, transparent); }
        .nf-eyebrow-text {
          font-size: 9px;
          font-weight: 300;
          letter-spacing: 0.38em;
          text-transform: uppercase;
          color: rgba(201,169,110,0.65);
        }

        /* ── Diamond mark ── */
        .nf-mark {
          width: 48px; height: 48px;
          border: 1.5px solid rgba(201,169,110,0.4);
          transform: rotate(45deg) scale(0.5);
          display: flex; align-items: center; justify-content: center;
          margin-bottom: 36px;
          opacity: 0;
          box-shadow: 0 0 28px rgba(201,169,110,0.12), inset 0 0 14px rgba(201,169,110,0.04);
          transition: opacity 0.7s ease 0.05s, transform 0.9s cubic-bezier(0.22,1,0.36,1) 0.05s;
        }
        .nf-root.ready .nf-mark {
          opacity: 1;
          transform: rotate(45deg) scale(1);
        }
        .nf-mark-inner {
          width: 14px; height: 14px;
          background: #c9a96e;
          opacity: 0.7;
        }

        /* ── 404 ghost number ── */
        .nf-ghost {
          position: relative;
          margin-bottom: -12px;
          opacity: 0;
          transform: translateY(30px);
          transition: opacity 0.7s ease 0.25s, transform 0.9s cubic-bezier(0.22,1,0.36,1) 0.25s;
        }
        .nf-root.ready .nf-ghost { opacity: 1; transform: translateY(0); }
        .nf-ghost-text {
          font-size: clamp(100px, 22vw, 200px);
          font-weight: 700;
          font-style: italic;
          letter-spacing: -0.04em;
          line-height: 0.88;
          display: block;
          /* hollow outline */
          color: white;
          -webkit-text-stroke: 1.5px rgba(201,169,110,0.2);
          user-select: none;
          position: relative;
          z-index: 1;
        }
        /* soft glow shadow behind the number */
        .nf-ghost-shadow {
          font-family: 'Cormorant Garamond', Georgia, serif;
          font-size: clamp(100px, 22vw, 200px);
          font-weight: 700;
          font-style: italic;
          letter-spacing: -0.04em;
          line-height: 0.88;
          display: block;
          color: rgba(201,169,110,0.07);
          position: absolute;
          top: 8px; left: 6px;
          filter: blur(6px);
          user-select: none;
          z-index: 0;
        }

        /* ── Heading ── */
        .nf-heading {
          font-family: 'Cormorant Garamond', Georgia, serif;
          font-size: clamp(28px, 5vw, 46px);
          font-weight: 700;
          font-style: italic;
          color: rgb(243, 232, 217);
          letter-spacing: -0.01em;
          line-height: 1.1;
          margin-bottom: 16px;
          opacity: 0;
          transform: translateY(18px);
          transition: opacity 0.8s ease 0.4s, transform 0.9s cubic-bezier(0.22,1,0.36,1) 0.4s;
        }
        .nf-root.ready .nf-heading { opacity: 1; transform: translateY(0); }

        /* ── Gold rule ── */
        .nf-rule {
          height: 1px;
          width: 0;
          background: linear-gradient(90deg, transparent, rgba(201,169,110,0.55), transparent);
          margin: 0 auto 24px;
          transition: width 0.9s cubic-bezier(0.22,1,0.36,1) 0.65s;
          align-self: stretch;
        }
        .nf-root.ready .nf-rule { width: 100%; }

        /* ── Description ── */
        .nf-desc {
          font-size: clamp(13px, 1.4vw, 15px);
          font-weight: 300;
          letter-spacing: 0.04em;
          line-height: 1.85;
          color: rgba(229,224,198,0.4);
          max-width: 420px;
          margin: 0 auto 44px;
          opacity: 0;
          transform: translateY(12px);
          transition: opacity 0.8s ease 0.7s, transform 0.8s cubic-bezier(0.22,1,0.36,1) 0.7s;
        }
        .nf-root.ready .nf-desc { opacity: 1; transform: translateY(0); }

        /* ── Buttons ── */
        .nf-btns {
          display: flex;
          gap: 14px;
          flex-wrap: wrap;
          justify-content: center;
          opacity: 0;
          transform: translateY(12px);
          transition: opacity 0.8s ease 0.9s, transform 0.8s cubic-bezier(0.22,1,0.36,1) 0.9s;
        }
        .nf-root.ready .nf-btns { opacity: 1; transform: translateY(0); }

        .nf-btn-primary {
          background: linear-gradient(135deg, #c9a96e 0%, #b8934a 100%);
          color: #080603;
          border: none;
          border-radius: 999px;
          padding: 14px 44px;
          font-family: 'Jost', sans-serif;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.28em;
          text-transform: uppercase;
          cursor: pointer;
          box-shadow: 0 6px 28px rgba(201,169,110,0.28);
          transition: all 0.35s cubic-bezier(0.22,1,0.36,1);
          position: relative;
          overflow: hidden;
        }
        .nf-btn-primary::after {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.14), transparent);
          transform: translateX(-200%);
          transition: transform 0.6s ease;
          border-radius: 999px;
        }
        .nf-btn-primary:hover {
          transform: translateY(-3px);
          box-shadow: 0 14px 44px rgba(201,169,110,0.38);
        }
        .nf-btn-primary:hover::after { transform: translateX(200%); }
        .nf-btn-primary:active { transform: translateY(0); }

        .nf-btn-secondary {
          background: transparent;
          color: rgba(229,224,198,0.45);
          border: 1px solid rgba(201,169,110,0.25);
          border-radius: 999px;
          padding: 14px 36px;
          font-family: 'Jost', sans-serif;
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.28em;
          text-transform: uppercase;
          cursor: pointer;
          transition: all 0.35s cubic-bezier(0.22,1,0.36,1);
        }
        .nf-btn-secondary:hover {
          color: rgba(229,224,198,0.9);
          border-color: rgba(201,169,110,0.55);
          background: rgba(201,169,110,0.05);
          transform: translateY(-2px);
        }

        /* ── Bottom label ── */
        .nf-footer-label {
          position: absolute;
          bottom: 44px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 4;
          display: flex;
          align-items: center;
          gap: 14px;
          opacity: 0;
          transition: opacity 0.8s ease 1.1s;
          white-space: nowrap;
        }
        .nf-root.ready .nf-footer-label { opacity: 1; }
        .nf-footer-dot {
          width: 3px; height: 3px;
          border-radius: 50%;
          background: rgba(201,169,110,0.35);
        }
        .nf-footer-text {
          font-size: 8px;
          font-weight: 300;
          letter-spacing: 0.3em;
          text-transform: uppercase;
          color: rgba(229,224,198,0.2);
        }

        /* ── Season label (bottom-right) ── */
        .nf-season {
          position: absolute;
          bottom: 44px;
          right: 44px;
          z-index: 4;
          text-align: right;
          opacity: 0;
          transition: opacity 0.8s ease 1.2s;
        }
        .nf-root.ready .nf-season { opacity: 1; }
        .nf-season-text {
          font-size: 8px;
          font-weight: 300;
          letter-spacing: 0.26em;
          text-transform: uppercase;
          color: rgba(229,224,198,0.18);
          display: block;
        }
        .nf-season-line {
          width: 22px; height: 1px;
          background: rgba(201,169,110,0.4);
          margin: 6px 0 0 auto;
        }

        /* ── Responsive ── */
        @media (max-width: 600px) {
          .nf-corner { width: 22px; height: 22px; }
          .nf-corner-tl, .nf-corner-tr { top: 20px; }
          .nf-corner-bl, .nf-corner-br { bottom: 20px; }
          .nf-corner-tl, .nf-corner-bl { left: 20px; }
          .nf-corner-tr, .nf-corner-br { right: 20px; }
          .nf-vertical { display: none; }
          .nf-season { display: none; }
          .nf-footer-label { bottom: 24px; }
          .nf-btn-primary, .nf-btn-secondary { width: 100%; text-align: center; }
          .nf-btns { flex-direction: column; width: 100%; }
        }
      `}</style>

      <div ref={containerRef} className={`nf-root${mounted ? " ready" : ""}`}>
        {/* Atmosphere */}
        <div className="nf-grain" />
        <div className="nf-glow-main" />
        <div
          className="nf-glow-tr"
          data-parallax="0.2"
          style={{ transition: "transform 0.6s ease" }}
        />
        <div
          className="nf-glow-bl"
          data-parallax="0.3"
          style={{ transition: "transform 0.6s ease" }}
        />

        {/* Decorative rings */}
        <div
          className="nf-ring nf-ring-1"
          data-parallax="0.06"
          style={{ transition: "transform 0.6s ease" }}
        />
        <div
          className="nf-ring nf-ring-2"
          data-parallax="0.04"
          style={{ transition: "transform 0.6s ease" }}
        />
        <div
          className="nf-ring nf-ring-3"
          data-parallax="0.025"
          style={{ transition: "transform 0.6s ease" }}
        />
        <div
          className="nf-ring nf-ring-4"
          data-parallax="0.01"
          style={{ transition: "transform 0.6s ease" }}
        />

        {/* Edge lines */}
        <div className="nf-edge nf-edge-top" />
        <div className="nf-edge nf-edge-bot" />

        {/* Corner ornaments */}
        <div className="nf-corner nf-corner-tl" />
        <div className="nf-corner nf-corner-tr" />
        <div className="nf-corner nf-corner-bl" />
        <div className="nf-corner nf-corner-br" />

        {/* Vertical side labels */}
        <div className="nf-vertical nf-vertical-l">
          Loqta Zone · Auction Platform
        </div>
        <div className="nf-vertical nf-vertical-r">Error · Not Found</div>

        {/* Centre stage */}
        <div className="nf-stage">
          {/* Eyebrow */}
          <div className="nf-eyebrow">
            <div className="nf-eyebrow-line" />
            <span className="nf-eyebrow-text">Page Not Found</span>
            <div className="nf-eyebrow-line r" />
          </div>

          {/* Diamond mark */}
          <div className="nf-mark">
            <div className="nf-mark-inner" />
          </div>

          {/* Ghost 404 */}
          <div className="nf-ghost">
            <span className="nf-ghost-shadow" aria-hidden="true">
              404
            </span>
            <span className="nf-ghost-text">404</span>
          </div>

          {/* Heading */}
          <h1 className="nf-heading">Lost in the Auction</h1>

          {/* Gold rule */}
          <div className="nf-rule" />

          {/* Description */}
          <p className="nf-desc">
            The page you're looking for doesn't exist or may have been moved.
            Perhaps a rare item has already been claimed — let us guide you
            back.
          </p>

          {/* Buttons */}
          <div className="nf-btns">
            <button className="nf-btn-primary" onClick={() => navigate(-1)}>
              ← Go Back
            </button>
            <button className="nf-btn-secondary" onClick={() => navigate("/")}>
              Return Home
            </button>
          </div>
        </div>

        {/* Footer label */}
        <div className="nf-footer-label">
          <div className="nf-footer-dot" />
          <span className="nf-footer-text">Error 404</span>
          <div className="nf-footer-dot" />
          <span className="nf-footer-text">Page not found</span>
          <div className="nf-footer-dot" />
        </div>

        {/* Season label */}
        <div className="nf-season">
          <span className="nf-season-text">Loqta Zone</span>
          <span className="nf-season-text" style={{ opacity: 0.5 }}>
            Season 2025
          </span>
          <div className="nf-season-line" />
        </div>
      </div>
    </>
  );
};

export default NotFound;
