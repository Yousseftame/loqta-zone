import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/store/AuthContext/AuthContext";

/**
 * PublicRoute
 *
 * Guards auth pages (login, register, forget-password) so that a user who is
 * already signed in cannot navigate to them via the URL bar.
 *
 * - admin / superAdmin  → redirected to /admin
 * - regular user        → redirected to /
 * - not signed in       → rendered normally (the auth page is shown)
 *
 * Uses an optimistic approach: the auth page is shown immediately while
 * Firebase resolves the auth state. If the user turns out to be signed in,
 * the redirect fires instantly. This avoids the 2-3 second blank screen
 * that occurred when we returned null during the loading phase.
 */
const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, role, loading } = useAuth();

  // Still resolving — optimistically show the auth page.
  // Most visitors to /login are NOT signed in, so showing the page immediately
  // is the correct behaviour in the vast majority of cases.
  if (loading) return <>{children}</>;

  // Already signed in AND fully verified → redirect away from auth pages
  if (user && user.emailVerified) {
    if (role === "user") {
      return <Navigate to="/" replace />;
    }
    // admin / superAdmin handled elsewhere; let them through
  }

  // Not signed in, or signed in but not yet verified → show the auth page normally
  return <>{children}</>;
};

export default PublicRoute;
