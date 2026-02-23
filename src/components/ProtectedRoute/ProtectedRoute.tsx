import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth, type UserRole } from "@/store/AuthContext/AuthContext";

interface ProtectedRouteProps {
  children: React.ReactNode;
  /** Roles allowed to access this route. If omitted, any authenticated user can access. */
  allowedRoles?: UserRole[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowedRoles,
}) => {
  const { user, role, loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  // Not authenticated → go to login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Authenticated but wrong role → show unauthorized
  if (allowedRoles && role && !allowedRoles.includes(role)) {
    // Redirect users to website, admins to admin panel
    if (role === "user") return <Navigate to="/" replace />;
    return <Navigate to="/admin" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;

// ── Loading Screen ─────────────────────────────────────────────────────────
const LoadingScreen = () => (
  <div
    className="relative flex min-h-screen items-center justify-center overflow-hidden"
    style={{ background: "#0d1b26" }}
  >
    <div
      className="pointer-events-none absolute inset-0"
      style={{
        background:
          "radial-gradient(ellipse 80% 65% at 50% 45%, #1b3448 0%, #0d1b26 70%)",
      }}
    />
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

    <div
      className="relative z-10 flex flex-col items-center gap-8"
      style={{ animation: "fadeUp 0.8s cubic-bezier(0.22, 1, 0.36, 1) both" }}
    >
      <div className="relative h-16 w-16">
        <div
          className="absolute inset-0 rounded-full"
          style={{ border: "2px solid rgba(42,72,99,0.35)" }}
        />
        <div
          className="absolute inset-0 rounded-full"
          style={{
            border: "2px solid transparent",
            borderTopColor: "#2A4863",
            boxShadow: "0 0 12px rgba(42,72,99,0.8)",
            animation: "spin 1.1s cubic-bezier(0.4, 0, 0.2, 1) infinite",
          }}
        />
        <div
          className="absolute inset-1 rounded-full"
          style={{
            border: "1.5px solid transparent",
            borderBottomColor: "rgba(42,72,99,0.5)",
            animation:
              "spin 1.8s cubic-bezier(0.4, 0, 0.2, 1) infinite reverse",
          }}
        />
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

    <style>{`
      @keyframes spin { to { transform: rotate(360deg); } }
      @keyframes pulse {
        0%, 80%, 100% { opacity: 0.2; transform: scale(0.75); }
        40%            { opacity: 1;   transform: scale(1.2);  }
      }
      @keyframes fadeUp {
        from { opacity: 0; transform: translateY(20px); }
        to   { opacity: 1; transform: translateY(0);    }
      }
    `}</style>
  </div>
);
