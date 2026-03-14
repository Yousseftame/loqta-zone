/**
 * src/permissions/usePermissions.ts
 *
 * Hook that returns a `can(module, action)` helper for the currently
 * signed-in admin. superAdmin always returns true. Regular admins are
 * checked against the permissions map stored in their Firestore doc
 * (loaded once at login, cached in context).
 *
 * Usage:
 *   const { can, permissions, loading } = usePermissions();
 *   if (!can("products", "delete")) return null;
 */

import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/firebase/firebase";
import { useAuth } from "@/store/AuthContext/AuthContext";
import {
  normalizePermissions,
  fullPermissions,
  type AdminPermissions,
  type PermissionModule,
  type PermissionAction,
} from "./permissions-data";

interface UsePermissionsReturn {
  can: (module: PermissionModule, action: PermissionAction) => boolean;
  permissions: AdminPermissions | null;
  loading: boolean;
}

export function usePermissions(): UsePermissionsReturn {
  const { user, role } = useAuth();
  const [permissions, setPermissions] = useState<AdminPermissions | null>(null);
  const [loading, setLoading]         = useState(true);

  useEffect(() => {
    if (!user) {
      setPermissions(null);
      setLoading(false);
      return;
    }

    // superAdmin has unrestricted access — no Firestore fetch needed
    if (role === "superAdmin") {
      setPermissions(fullPermissions());
      setLoading(false);
      return;
    }

    // Regular admin — fetch their permissions doc
    (async () => {
      try {
        const snap = await getDoc(doc(db, "users", user.uid));
        const raw  = snap.exists() ? snap.data()?.permissions : null;
        setPermissions(normalizePermissions(raw));
      } catch {
        // On error default to empty — fail safe
        setPermissions(normalizePermissions(null));
      } finally {
        setLoading(false);
      }
    })();
  }, [user, role]);

  const can = (module: PermissionModule, action: PermissionAction): boolean => {
    if (role === "superAdmin") return true;
    if (!permissions) return false;
    return permissions[module]?.[action] ?? false;
  };

  return { can, permissions, loading };
}