import React, { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

const NotFound: React.FC = () => {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const el = containerRef.current;
      if (!el) return;
      const { innerWidth, innerHeight } = window;
      const x = (e.clientX / innerWidth - 0.5) * 24;
      const y = (e.clientY / innerHeight - 0.5) * 24;
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
    <div
      ref={containerRef}
      className="relative flex min-h-screen items-center justify-center overflow-hidden"
      style={{ background: "#0d1b26" }}
    >
      {/* ── Deep radial glow ── */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 65% at 50% 45%, #1b3448 0%, #0d1b26 70%)",
        }}
      />

      {/* ── Noise grain overlay ── */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          backgroundSize: "128px",
        }}
      />

      {/* ── Glowing orb — top right ── */}
      <div
        data-parallax="0.25"
        className="pointer-events-none absolute -right-32 -top-32 rounded-full transition-transform duration-500 ease-out"
        style={{
          width: 560,
          height: 560,
          background:
            "radial-gradient(circle, rgba(42,72,99,0.5) 0%, transparent 70%)",
          filter: "blur(48px)",
        }}
      />

      {/* ── Glowing orb — bottom left ── */}
      <div
        data-parallax="0.35"
        className="pointer-events-none absolute -bottom-40 -left-40 rounded-full transition-transform duration-500 ease-out"
        style={{
          width: 500,
          height: 500,
          background:
            "radial-gradient(circle, rgba(42,72,99,0.38) 0%, transparent 70%)",
          filter: "blur(56px)",
        }}
      />

      {/* ── Subtle grid ── */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.7) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.7) 1px, transparent 1px)",
          backgroundSize: "72px 72px",
        }}
      />

      {/* ── Rings — top left ── */}
      <div
        data-parallax="0.4"
        className="pointer-events-none absolute -left-28 top-8 rounded-full transition-transform duration-500 ease-out"
        style={{
          width: 360,
          height: 360,
          border: "1px solid rgba(42,72,99,0.65)",
        }}
      />
      <div
        data-parallax="0.55"
        className="pointer-events-none absolute -left-14 top-24 rounded-full transition-transform duration-500 ease-out"
        style={{
          width: 230,
          height: 230,
          border: "1px solid rgba(42,72,99,0.4)",
        }}
      />

      {/* ── Rings — bottom right ── */}
      <div
        data-parallax="0.3"
        className="pointer-events-none absolute -bottom-24 -right-24 rounded-full transition-transform duration-500 ease-out"
        style={{
          width: 400,
          height: 400,
          border: "1px solid rgba(42,72,99,0.5)",
        }}
      />

      {/* ── Compass / decorative wheel (faint background) ── */}
      <div
        data-parallax="0.12"
        className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 transition-transform duration-500 ease-out"
        style={{ opacity: 0.03, animation: "spinSlow 60s linear infinite" }}
      >
        <svg width="720" height="720" viewBox="0 0 720 720" fill="none">
          <circle cx="360" cy="360" r="310" stroke="white" strokeWidth="1" />
          <circle cx="360" cy="360" r="230" stroke="white" strokeWidth="0.8" />
          <circle cx="360" cy="360" r="150" stroke="white" strokeWidth="0.6" />
          <circle cx="360" cy="360" r="70" stroke="white" strokeWidth="0.5" />
          {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map(
            (deg) => (
              <line
                key={deg}
                x1="360"
                y1="50"
                x2="360"
                y2="670"
                stroke="white"
                strokeWidth="0.5"
                transform={`rotate(${deg} 360 360)`}
              />
            ),
          )}
        </svg>
      </div>

      {/* ── Twinkling dots ── */}
      {[
        { top: "16%", left: "11%", size: 3, p: "0.8", delay: "0s" },
        { top: "74%", left: "7%", size: 2, p: "1.1", delay: "0.5s" },
        { top: "22%", left: "87%", size: 4, p: "0.6", delay: "0.2s" },
        { top: "66%", left: "91%", size: 2, p: "1.3", delay: "0.8s" },
        { top: "44%", left: "5%", size: 2, p: "0.9", delay: "1.2s" },
        { top: "55%", left: "93%", size: 3, p: "0.7", delay: "0.3s" },
        { top: "88%", left: "45%", size: 2, p: "1.0", delay: "0.9s" },
        { top: "10%", left: "55%", size: 2, p: "1.4", delay: "0.6s" },
      ].map((dot, i) => (
        <div
          key={i}
          data-parallax={dot.p}
          className="pointer-events-none absolute rounded-full transition-transform duration-500 ease-out"
          style={{
            top: dot.top,
            left: dot.left,
            width: dot.size,
            height: dot.size,
            background: "rgba(255,255,255,0.4)",
            animation: `twinkle 3.5s ease-in-out infinite`,
            animationDelay: dot.delay,
          }}
        />
      ))}

      {/* ── Main content ── */}
      <div
        className="relative z-10 flex flex-col items-center px-6 text-center"
        style={{ animation: "fadeUp 1s cubic-bezier(0.22, 1, 0.36, 1) both" }}
      >
        {/* Ghost 404 number */}
        <div className="relative mb-1 select-none leading-none">
          {/* Outline layer */}
          <span
            className="font-serif font-bold leading-none tracking-tighter"
            style={{
              fontSize: "clamp(110px, 22vw, 200px)",
              WebkitTextStroke: "1.5px rgba(255,255,255,0.1)",
              color: "transparent",
              display: "block",
            }}
          >
            404
          </span>
          {/* Glow shadow */}
          <span
            className="pointer-events-none absolute inset-0 flex items-center justify-center font-serif font-bold leading-none tracking-tighter"
            style={{
              fontSize: "clamp(110px, 22vw, 200px)",
              color: "rgba(42,72,99,0.55)",
              transform: "translate(6px, 7px)",
              filter: "blur(4px)",
            }}
          >
            404
          </span>
        </div>

        {/* Divider with diamond */}
        <div
          className="mb-7 flex items-center gap-4"
          style={{
            animation: "fadeUp 1s cubic-bezier(0.22, 1, 0.36, 1) 0.1s both",
          }}
        >
          <div
            className="h-px w-20"
            style={{
              background:
                "linear-gradient(to right, transparent, rgba(42,72,99,0.9))",
            }}
          />
          <div
            className="h-2.5 w-2.5 rotate-45 rounded-sm"
            style={{ background: "#2A4863" }}
          />
          <div
            className="h-px w-20"
            style={{
              background:
                "linear-gradient(to left, transparent, rgba(42,72,99,0.9))",
            }}
          />
        </div>

        {/* Heading */}
        <h1
          className="mb-3 font-serif font-semibold tracking-wide"
          style={{
            fontSize: "clamp(1.6rem, 4vw, 2.5rem)",
            color: "rgba(255,255,255,0.88)",
            animation: "fadeUp 1s cubic-bezier(0.22, 1, 0.36, 1) 0.18s both",
          }}
        >
          Page Not Found
        </h1>

        {/* Subtitle */}
        <p
          className="mb-10 max-w-sm font-serif leading-relaxed"
          style={{
            fontSize: "clamp(0.88rem, 2vw, 1rem)",
            color: "rgba(255,255,255,0.36)",
            animation: "fadeUp 1s cubic-bezier(0.22, 1, 0.36, 1) 0.28s both",
          }}
        >
          The page you're looking for doesn't exist or may have been moved. Let
          us guide you back.
        </p>

        {/* Buttons */}
        <div
          className="flex flex-col gap-3 sm:flex-row"
          style={{
            animation: "fadeUp 1s cubic-bezier(0.22, 1, 0.36, 1) 0.38s both",
          }}
        >
          {/* Primary */}
          <button
            onClick={() => navigate(-1)}
            className="rounded-full px-9 py-3.5 font-serif text-sm tracking-widest uppercase transition-all duration-300 active:scale-95"
            style={{
              background: "#2A4863",
              color: "rgba(255,255,255,0.9)",
              border: "1px solid rgba(255,255,255,0.14)",
              boxShadow:
                "0 0 35px rgba(42,72,99,0.7), inset 0 1px 0 rgba(255,255,255,0.08)",
            }}
            onMouseEnter={(e) => {
              const btn = e.currentTarget as HTMLButtonElement;
              btn.style.background = "#34567a";
              btn.style.boxShadow =
                "0 0 55px rgba(42,72,99,1), inset 0 1px 0 rgba(255,255,255,0.12)";
            }}
            onMouseLeave={(e) => {
              const btn = e.currentTarget as HTMLButtonElement;
              btn.style.background = "#2A4863";
              btn.style.boxShadow =
                "0 0 35px rgba(42,72,99,0.7), inset 0 1px 0 rgba(255,255,255,0.08)";
            }}
          >
            ← Go Back
          </button>

          {/* Secondary */}
          <button
            onClick={() => navigate("/")}
            className="rounded-full px-9 py-3.5 font-serif text-sm tracking-widest uppercase transition-all duration-300 active:scale-95"
            style={{
              background: "transparent",
              color: "rgba(255,255,255,0.48)",
              border: "1px solid rgba(255,255,255,0.1)",
            }}
            onMouseEnter={(e) => {
              const btn = e.currentTarget as HTMLButtonElement;
              btn.style.color = "rgba(255,255,255,0.82)";
              btn.style.borderColor = "rgba(42,72,99,0.9)";
              btn.style.background = "rgba(42,72,99,0.22)";
            }}
            onMouseLeave={(e) => {
              const btn = e.currentTarget as HTMLButtonElement;
              btn.style.color = "rgba(255,255,255,0.48)";
              btn.style.borderColor = "rgba(255,255,255,0.1)";
              btn.style.background = "transparent";
            }}
          >
            Go Home
          </button>
        </div>

        {/* Footer label */}
        <p
          className="mt-16 font-serif text-xs tracking-[0.28em] uppercase"
          style={{
            color: "rgba(255,255,255,0.13)",
            animation: "fadeUp 1s cubic-bezier(0.22, 1, 0.36, 1) 0.52s both",
          }}
        >
          Error 404 · Page not found
        </p>
      </div>

      {/* ── Keyframes ── */}
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(32px); }
          to   { opacity: 1; transform: translateY(0);    }
        }
        @keyframes twinkle {
          0%, 100% { opacity: 0.15; transform: scale(0.8); }
          50%       { opacity: 1;   transform: scale(1.7); }
        }
        @keyframes spinSlow {
          from { transform: translate(-50%, -50%) rotate(0deg);   }
          to   { transform: translate(-50%, -50%) rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default NotFound;
