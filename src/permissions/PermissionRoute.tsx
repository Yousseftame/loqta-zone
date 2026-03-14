/**
 * src/permissions/PermissionRoute.tsx
 *
 * Route-level permission guard.
 *
 * Wraps a page element and checks whether the current admin has the required
 * permission before rendering. If not, redirects to /admin.
 *
 * superAdmin always passes through — no check needed.
 * While permissions are loading the existing admin LoadingScreen is shown
 * so there is no flash of unauthorized content.
 *
 * Usage in routes.tsx:
 *   element: <PermissionRoute module="products" action="create"><ProductForm /></PermissionRoute>
 */

import { Navigate } from "react-router-dom";
import { useAuth } from "@/store/AuthContext/AuthContext";
import { usePermissions } from "./usePermissions";
import type { PermissionModule, PermissionAction } from "./permissions-data";

interface PermissionRouteProps {
  module: PermissionModule;
  action: PermissionAction;
  children: React.ReactNode;
}

export default function PermissionRoute({
  module,
  action,
  children,
}: PermissionRouteProps) {
  const { role, loading: authLoading } = useAuth();
  const { can, loading: permLoading } = usePermissions();

  // Still resolving auth or permissions — render nothing to avoid flash
  if (authLoading || permLoading) return null;

  // superAdmin bypasses all permission checks
  if (role === "superAdmin") return <>{children}</>;

  // Regular admin — check the specific action
  if (!can(module, action)) {
    return <Navigate to="/admin" replace />;
  }

  return <>{children}</>;
}
