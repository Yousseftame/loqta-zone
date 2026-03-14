/**
 * src/pages/Admin/User/EditAdminPermissions.tsx
 *
 * Dialog for editing an existing admin's permissions after creation.
 * Opened from the AdminsList action buttons.
 */

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Avatar,
  CircularProgress,
} from "@mui/material";
import { ShieldCheck } from "lucide-react";
import { colors } from "../Products/products-data";
import type { AppUser } from "./users-data";
import { updateAdminPermissionsService } from "@/service/users/userService";
import PermissionsMatrix from "@/permissions/PermissionsMatrix";
import {
  normalizePermissions,
  type AdminPermissions,
} from "@/permissions/permissions-data";
import toast from "react-hot-toast";

interface EditAdminPermissionsProps {
  target: AppUser | null;
  open: boolean;
  onClose: () => void;
  onSaved: (uid: string, permissions: AdminPermissions) => void;
}

export default function EditAdminPermissions({
  target,
  open,
  onClose,
  onSaved,
}: EditAdminPermissionsProps) {
  const [permissions, setPermissions] = useState<AdminPermissions>(
    normalizePermissions(null),
  );
  const [saving, setSaving] = useState(false);

  // Reset permissions whenever a new target is set
  useEffect(() => {
    if (target) {
      setPermissions(normalizePermissions(target.permissions));
    }
  }, [target]);

  const handleSave = async () => {
    if (!target) return;
    setSaving(true);
    try {
      await updateAdminPermissionsService(target.id, permissions);
      toast.success("Permissions updated");
      onSaved(target.id, permissions);
      onClose();
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to update permissions");
    } finally {
      setSaving(false);
    }
  };

  const isSuperAdmin = target?.role === "superAdmin";

  return (
    <Dialog
      open={open}
      onClose={() => !saving && onClose()}
      maxWidth="md"
      fullWidth
      PaperProps={{ sx: { borderRadius: 3 } }}
    >
      <DialogTitle
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1.5,
          color: colors.primary,
        }}
      >
        <ShieldCheck size={20} /> Edit Permissions
      </DialogTitle>

      <DialogContent sx={{ pt: 2 }}>
        {target && (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
            {/* Target admin info */}
            <Box
              sx={{
                p: 2,
                borderRadius: 2,
                bgcolor: colors.primaryBg,
                border: `1px solid ${colors.border}`,
                display: "flex",
                alignItems: "center",
                gap: 1.5,
              }}
            >
              <Avatar
                src={target.profileImage ?? undefined}
                sx={{
                  width: 36,
                  height: 36,
                  bgcolor: colors.primary,
                  fontSize: "0.85rem",
                }}
              >
                {target.fullName.charAt(0).toUpperCase()}
              </Avatar>
              <Box>
                <p
                  style={{
                    margin: 0,
                    fontWeight: 700,
                    fontSize: "0.88rem",
                    color: colors.textPrimary,
                  }}
                >
                  {target.fullName}
                </p>
                <p
                  style={{
                    margin: 0,
                    fontSize: "0.75rem",
                    color: colors.textSecondary,
                  }}
                >
                  {target.email}
                </p>
              </Box>
            </Box>

            {/* Permissions matrix */}
            <PermissionsMatrix
              role={target.role as "admin" | "superAdmin"}
              value={permissions}
              onChange={setPermissions}
              disabled={saving || isSuperAdmin}
            />
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 3, gap: 1 }}>
        <Button
          onClick={onClose}
          disabled={saving}
          variant="outlined"
          sx={{
            textTransform: "none",
            borderColor: colors.border,
            color: colors.textPrimary,
            borderRadius: 2,
          }}
        >
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          disabled={saving || isSuperAdmin}
          variant="contained"
          startIcon={
            saving ? (
              <CircularProgress size={14} color="inherit" />
            ) : (
              <ShieldCheck size={16} />
            )
          }
          sx={{
            textTransform: "none",
            bgcolor: colors.primary,
            "&:hover": { bgcolor: colors.primaryDark },
            borderRadius: 2,
            minWidth: 130,
          }}
        >
          {saving ? "Saving…" : "Save Permissions"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
