import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth, type UserRole } from "@/store/AuthContext/AuthContext";

interface ProtectedRouteProps {
  children: React.ReactNode;
  /** Roles allowed to access this route. If omitted, any authenticated user can access. */
  allowedRoles?: UserRole[];
  /**
   * Where to redirect unauthenticated users.
   * Defaults to "/login". Use "/" to send them to the home page.
   * The current path is passed as `?redirect=…` so the login modal or page
   * can send them back after sign-in.
   */
  unauthRedirect?: string;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowedRoles,
  unauthRedirect = "/login",
}) => {
  const { user, role, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <LoadingScreen />;
  }

  // Not authenticated
  if (!user) {
    // Preserve the attempted URL so login can redirect back
    const returnTo = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`${unauthRedirect}?redirect=${returnTo}`} replace />;
  }

  // Authenticated but wrong role → show unauthorized
  if (allowedRoles && role && !allowedRoles.includes(role)) {
    if (role === "user") return <Navigate to="/" replace />;
    return <Navigate to="/admin/hero-slides" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;

// ── Loading Screen ─────────────────────────────────────────────────────────
const LoadingScreen = () => (
  <div className="relative flex min-h-screen items-center justify-center overflow-hidden" style={{ backgroundColor: "#080603" }}>
    {/* Subtle central glow */}
    <div className="pointer-events-none absolute inset-0 flex justify-center items-center">
      <div className="w-[30rem] h-[30rem] rounded-full" style={{ background: "radial-gradient(circle, rgba(42,72,99,0.15) 0%, transparent 60%)", filter: "blur(40px)" }} />
    </div>

    <div className="flex flex-col items-center gap-6 z-10" style={{ animation: "fadeUp 0.8s cubic-bezier(0.22, 1, 0.36, 1) both" }}>
      <div className="relative flex h-14 w-14 items-center justify-center">
        {/* Premium static ring */}
        <div className="absolute inset-0 rounded-full border border-solid" style={{ borderColor: "rgba(42,72,99,0.5)" }} />
        {/* Primary animated semi-circle */}
        <div className="absolute inset-0 rounded-full border-[2px] border-transparent" style={{ borderTopColor: "rgb(229, 224, 198)", animation: "spin 1s ease-in-out infinite" }} />
        {/* Secondary inner ring reverse */}
        <div className="absolute inset-[4px] rounded-full border border-transparent" style={{ borderBottomColor: "rgba(42,72,99,0.8)", animation: "spin 1.5s linear infinite reverse" }} />
      </div>
      <p className="uppercase animate-pulse" style={{ fontFamily: "'Monteya', sans-serif", fontSize: "0.8rem", letterSpacing: "0.2em", color: "rgb(229, 224, 198)", opacity: 0.8 }}>
        Loading
      </p>
    </div>

    <style>{`
      @keyframes spin { to { transform: rotate(360deg); } }
      @keyframes fadeUp {
        from { opacity: 0; transform: translateY(15px); }
        to   { opacity: 1; transform: translateY(0);    }
      }
    `}</style>
  </div>
);
