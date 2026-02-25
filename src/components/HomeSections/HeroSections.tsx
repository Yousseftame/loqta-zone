import React, { useEffect, useState } from "react";
import SplitText from "../SplitText";

export default function HeroSections() {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setLoaded(true), 120);
    return () => clearTimeout(t);
  }, []);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,700;1,700;1,900&family=Jost:wght@200;300;400&display=swap');

        /* ── Root ── */
        .hc-root {
          position: relative;
          width: 100%;
          height: 100vh;
          min-height: 620px;
          overflow: hidden;
          display: flex;
          align-items: flex-end;
        }

        /* ── Background ── */
        .hc-bg {
          position: absolute;
          inset: 0;
          background-image: url('/src/assets/heroSection.webp');
          background-size: cover;
          background-position: 62% top;
          background-repeat: no-repeat;
          animation: hc-zoom 20s ease-out forwards;
          z-index: 0;
        }

        @keyframes hc-zoom {
          from { transform: scale(1.06); }
          to   { transform: scale(1.00); }
        }

        /* ── Grain ── */
        .hc-grain {
          position: absolute;
          inset: 0;
          z-index: 1;
          opacity: 0.05;
          pointer-events: none;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
          background-size: 200px 200px;
        }

        /* ── Overlays ── */
        .hc-overlay-left {
          position: absolute;
          inset: 0;
          background: linear-gradient(
            112deg,
            rgba(5, 2, 1, 0.88) 0%,
            rgba(12, 4, 1, 0.65) 35%,
            rgba(0,0,0,0.12) 62%,
            transparent 100%
          );
          z-index: 2;
        }

        .hc-overlay-bottom {
          position: absolute;
          bottom: 0; left: 0; right: 0;
          height: 42%;
          background: linear-gradient(to top, rgba(3,1,0,0.72) 0%, transparent 100%);
          z-index: 2;
        }

        /* ── Heading ── */
        .hc-heading {
          position: absolute;
          left: clamp(28px, 5.5vw, 96px);
          bottom: clamp(56px, 9vh, 112px);
          z-index: 10;
          display: flex;
          flex-direction: column;
          line-height: 1;
        }

        .hc-word { display: block; overflow: visible; }

        .hc-word-1 { transform: translateX(0); }

        /* Editorial asymmetry — second word indented right */
        .hc-word-2 {
          transform: translateX(clamp(22px, 3.8vw, 68px)) translateY(-6px);
        }

        /* ── Text style ── */
        .hc-text {
          font-family: 'Cormorant Garamond', 'Didot', Georgia, serif;
          font-weight: 700;
          font-style: italic;
          font-size: clamp(110px, 17.8vw, 248px);
          line-height: 0.85;
          letter-spacing: -0.028em;
          color: #F3E8D9;
          display: inline-block;
          text-shadow:
            0 2px 50px rgba(0,0,0,0.55),
            0 0 100px rgba(210,80,20,0.10);
        }

        /* Second line outlined — premium contrast trick */
        .hc-text-outline {
          color: transparent;
          -webkit-text-stroke: 1.8px rgba(243, 232, 217, 0.70);
          text-shadow: none;
        }

        /* ── Thin rule ── */
        .hc-rule {
          width: 0;
          height: 1px;
          background: linear-gradient(90deg, rgba(243,232,217,0.50), transparent);
          margin-top: clamp(14px, 2vh, 26px);
          margin-left: 5px;
          transition: width 1.3s cubic-bezier(0.22,1,0.36,1) 1.5s;
        }
        .hc-rule--in { width: clamp(90px, 14vw, 200px); }

        /* ── Sub text ── */
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

        /* ── Meta (bottom right) ── */
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

        /* ── Scroll indicator ── */
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

        /* ── Mobile ── */
        @media (max-width: 640px) {
          .hc-heading {
            left: 50%;
            transform: translateX(-50%);
            align-items: center;
            bottom: clamp(100px, 16vh, 150px);
          }
          .hc-word-1 { transform: none; }
          .hc-word-2 { transform: translateX(clamp(10px, 5vw, 22px)); }
          .hc-text { font-size: clamp(76px, 23vw, 110px); }
          .hc-rule, .hc-scroll { display: none; }
          .hc-sub { text-align: center; margin-left: 0; }
          .hc-meta {
            right: 50%;
            transform: translateX(50%) translateY(18px);
            text-align: center;
            align-items: center;
            bottom: clamp(28px, 5vh, 48px);
          }
          .hc-meta--in { transform: translateX(50%) translateY(0); }
        }
      `}</style>

      <section className="hc-root">
        <div className="hc-bg" />
        <div className="hc-grain" />
        <div className="hc-overlay-left" />
        <div className="hc-overlay-bottom" />

        {/* ── Giant editorial heading ── */}
        <div className="hc-heading">
          <div className="hc-word hc-word-1">
            <SplitText
              text="LOQTA"
              className="hc-text"
              delay={55}
              duration={1.6}
              ease="power4.out"
              splitType="chars"
              from={{ opacity: 0, y: 80, skewY: 3 }}
              to={{ opacity: 1, y: 0, skewY: 0 }}
              threshold={0.05}
              rootMargin="0px"
              textAlign="left"
              tag="span"
            />
          </div>
          <div className="hc-word hc-word-2">
            <SplitText
              text="ZONE"
              className="hc-text hc-text-outline"
              delay={55}
              duration={1.6}
              ease="power4.out"
              splitType="chars"
              from={{ opacity: 0, y: 80, skewY: 3 }}
              to={{ opacity: 1, y: 0, skewY: 0 }}
              threshold={0.05}
              rootMargin="0px"
              textAlign="left"
              tag="span"
            />
          </div>

          <div className={`hc-rule ${loaded ? "hc-rule--in" : ""}`} />
          <p className={`hc-sub ${loaded ? "hc-sub--in" : ""}`}>
            Premium Online Auctions
          </p>
        </div>

        {/* ── Bottom-right meta ── */}
        <div className={`hc-meta ${loaded ? "hc-meta--in" : ""}`}>
          <div className="hc-meta-label">Editorial Direction</div>
          <div className="hc-meta-date">2026 — Season I</div>
          <div className="hc-meta-accent" />
        </div>

        {/* ── Scroll cue ── */}
        <div className={`hc-scroll ${loaded ? "hc-scroll--in" : ""}`}>
          <span className="hc-scroll-line" />
          <span className="hc-scroll-text">Scroll</span>
        </div>
      </section>
    </>
  );
}
