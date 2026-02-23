/**
 * useAdminActions
 *
 * Wraps Firebase callable Cloud Functions for admin / superAdmin use:
 *  - setUserRole(targetUid, role)
 *  - blockUser(targetUid, isBlocked)
 */

import app from "@/firebase/firebase";
import { getFunctions, httpsCallable } from "firebase/functions";
import toast from "react-hot-toast";

type UserRole = "user" | "admin" | "superAdmin";

export const useAdminActions = () => {
  const functions = getFunctions(app);

  /**
   * Change a user's role. Only callable by superAdmins.
   */
  const setUserRole = async (targetUid: string, role: UserRole) => {
    try {
      const fn = httpsCallable(functions, "setUserRole");
      const result = await fn({ targetUid, role });
      toast.success(`Role "${role}" assigned successfully.`);
      return result.data;
    } catch (error: any) {
      toast.error(error.message || "Failed to set role.");
      throw error;
    }
  };

  /**
   * Block or unblock a user. Callable by admin or superAdmin.
   */
  const blockUser = async (targetUid: string, isBlocked: boolean) => {
    try {
      const fn = httpsCallable(functions, "blockUser");
      const result = await fn({ targetUid, isBlocked });
      toast.success(isBlocked ? "User blocked." : "User unblocked.");
      return result.data;
    } catch (error: any) {
      toast.error(error.message || "Failed to update user status.");
      throw error;
    }
  };

  return { setUserRole, blockUser };
};