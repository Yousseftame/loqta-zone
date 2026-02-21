import React from "react";
import { Navigate } from "react-router-dom";
import { useAuthState } from "../../hooks/useAuthState";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, loading } = useAuthState();

  if (loading) {
    return (
      <div
        className="relative flex min-h-screen items-center justify-center overflow-hidden"
        style={{ background: "#0d1b26" }}
      >
        {/* ── Radial glow ── */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 80% 65% at 50% 45%, #1b3448 0%, #0d1b26 70%)",
          }}
        />

        {/* ── Noise grain ── */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
            backgroundSize: "128px",
          }}
        />

        {/* ── Glowing orb top-right ── */}
        <div
          className="pointer-events-none absolute -right-32 -top-32 rounded-full"
          style={{
            width: 480,
            height: 480,
            background:
              "radial-gradient(circle, rgba(42,72,99,0.45) 0%, transparent 70%)",
            filter: "blur(48px)",
          }}
        />

        {/* ── Glowing orb bottom-left ── */}
        <div
          className="pointer-events-none absolute -bottom-36 -left-36 rounded-full"
          style={{
            width: 420,
            height: 420,
            background:
              "radial-gradient(circle, rgba(42,72,99,0.35) 0%, transparent 70%)",
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

        {/* ── Twinkling dots ── */}
        {[
          { top: "18%", left: "12%", size: 2, delay: "0s" },
          { top: "72%", left: "8%", size: 3, delay: "0.5s" },
          { top: "24%", left: "88%", size: 2, delay: "0.3s" },
          { top: "68%", left: "90%", size: 2, delay: "0.9s" },
          { top: "46%", left: "5%", size: 2, delay: "1.1s" },
        ].map((dot, i) => (
          <div
            key={i}
            className="pointer-events-none absolute rounded-full"
            style={{
              top: dot.top,
              left: dot.left,
              width: dot.size,
              height: dot.size,
              background: "rgba(255,255,255,0.4)",
              animation: "twinkle 3.5s ease-in-out infinite",
              animationDelay: dot.delay,
            }}
          />
        ))}

        {/* ── Spinner + text ── */}
        <div
          className="relative z-10 flex flex-col items-center gap-8"
          style={{
            animation: "fadeUp 0.8s cubic-bezier(0.22, 1, 0.36, 1) both",
          }}
        >
          {/* Spinner */}
          <div className="relative h-16 w-16">
            {/* Track */}
            <div
              className="absolute inset-0 rounded-full"
              style={{ border: "2px solid rgba(42,72,99,0.35)" }}
            />
            {/* Arc */}
            <div
              className="absolute inset-0 rounded-full"
              style={{
                border: "2px solid transparent",
                borderTopColor: "#2A4863",
                boxShadow: "0 0 12px rgba(42,72,99,0.8)",
                animation: "spin 1.1s cubic-bezier(0.4, 0, 0.2, 1) infinite",
              }}
            />
            {/* Second slower arc */}
            <div
              className="absolute inset-1 rounded-full"
              style={{
                border: "1.5px solid transparent",
                borderBottomColor: "rgba(42,72,99,0.5)",
                animation:
                  "spin 1.8s cubic-bezier(0.4, 0, 0.2, 1) infinite reverse",
              }}
            />
            {/* Center dot */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div
                className="h-2 w-2 rounded-full"
                style={{
                  background: "#2A4863",
                  boxShadow: "0 0 8px rgba(42,72,99,1)",
                }}
              />
            </div>
          </div>

          {/* Text */}
          <div className="flex flex-col items-center gap-2">
            <p
              className="font-serif tracking-widest uppercase"
              style={{
                fontSize: "0.78rem",
                color: "rgba(255,255,255,0.45)",
                letterSpacing: "0.28em",
              }}
            >
              Please wait
            </p>

            {/* Animated dots */}
            <div className="flex gap-1.5">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="rounded-full"
                  style={{
                    width: 5,
                    height: 5,
                    background: "#2A4863",
                    boxShadow: "0 0 6px rgba(42,72,99,0.8)",
                    animation: "pulse 1.4s ease-in-out infinite",
                    animationDelay: `${i * 0.22}s`,
                  }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* ── Keyframes ── */}
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
          @keyframes pulse {
            0%, 80%, 100% { opacity: 0.2; transform: scale(0.75); }
            40%            { opacity: 1;   transform: scale(1.2);  }
          }
          @keyframes fadeUp {
            from { opacity: 0; transform: translateY(20px); }
            to   { opacity: 1; transform: translateY(0);    }
          }
          @keyframes twinkle {
            0%, 100% { opacity: 0.15; transform: scale(0.8); }
            50%       { opacity: 1;   transform: scale(1.7); }
          }
        `}</style>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
