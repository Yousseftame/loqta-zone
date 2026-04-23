import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/store/AuthContext/AuthContext";
import { auth } from "@/firebase/firebase";

/**
 * VerificationGuard
 *
 * Wraps any layout/section of the app that requires a fully-verified account.
 *
 * How it works:
 *  - If `emailVerificationPending` is true in AuthContext, the user has a live
 *    Firebase session but has NOT verified their email yet. Redirect them to
 *    /verify-email regardless of which URL they try to visit.
 *  - During the auth loading phase, we synchronously inspect `auth.currentUser`:
 *    if an unverified user is already in the session, we hold rendering (return
 *    null) to prevent a flash of the protected page while state resolves.
 *  - Anonymous visitors (no session) and verified users pass straight through.
 */
const VerificationGuard: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { loading, emailVerificationPending } = useAuth();

  if (loading) {
    // Fast synchronous check: if there is already an unverified Firebase user,
    // hold rendering so the page doesn't flash before the redirect fires.
    const currentUser = auth.currentUser;
    if (currentUser && !currentUser.emailVerified) {
      return null;
    }
    // No session or already-verified session → show content immediately.
    return <>{children}</>;
  }

  if (emailVerificationPending) {
    return <Navigate to="/verify-email" replace />;
  }

  return <>{children}</>;
};

export default VerificationGuard;
