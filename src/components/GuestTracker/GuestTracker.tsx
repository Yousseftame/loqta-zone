/**
 * src/components/GuestTracker.tsx
 *
 * Tracks guest (unauthenticated) page visits and logs them to auditLogs.
 * The auditLogger automatically captures the user's IP via ipify.org.
 *
 * Place this component inside your MainLayout (or any layout that wraps
 * public pages) so it has access to useLocation() via React Router context.
 *
 * Usage in MainLayout.tsx:
 *   import GuestTracker from "@/components/GuestTracker";
 *   // Inside your layout JSX, just before <Outlet />:
 *   <GuestTracker />
 */

import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/store/AuthContext/AuthContext";
import { auditLogger } from "@/service/audit/auditLogger";

// Pages to never track (auth flows, not real content pages)
const SKIP_PATHS = ["/login", "/register", "/forget-password", "/verify-email"];

// Minimum ms between logs for the same path (prevents duplicate logs on
// StrictMode double-render or rapid back/forward navigation)
const DEBOUNCE_MS = 2000;

export default function GuestTracker() {
  const { user, loading } = useAuth();
  const location = useLocation();
  const lastLoggedRef = useRef<{ path: string; time: number } | null>(null);

  useEffect(() => {
    // Wait for auth to resolve — avoids logging a guest visit on page load
    // when the user is actually already signed in (token still loading)
    if (loading) return;

    // Only track genuine guests
    if (user) return;

    const path = location.pathname;

    // Skip auth pages
    if (SKIP_PATHS.some((p) => path.startsWith(p))) return;

    // Skip admin routes
    if (path.startsWith("/admin")) return;

    // Debounce: skip if we already logged this exact path very recently
    const now = Date.now();
    if (
      lastLoggedRef.current?.path === path &&
      now - lastLoggedRef.current.time < DEBOUNCE_MS
    )
      return;

    // Record before firing so StrictMode double-effects don't double-log
    lastLoggedRef.current = { path, time: now };

    // Fire-and-forget — IP is fetched inside auditLogger (cached after first call)
    auditLogger.guestVisit(path);
  }, [location.pathname, user, loading]);

  // Renders nothing — pure side-effect component
  return null;
}
