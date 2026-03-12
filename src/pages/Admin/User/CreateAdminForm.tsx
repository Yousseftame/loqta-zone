/**
 * src/pages/Admin/User/CreateAdminForm.tsx
 *
 * Standalone form component for creating a new admin or superAdmin account.
 * - Full field validation using the shared validation.ts rules
 * - Confirm password field
 * - Password strength meter
 * - Role picker (Admin / Super Admin)
 * - Extracted from AdminsList so it can be tested / reused independently
 */

import { useState, useCallback } from "react";
import {
  Button,
  TextField,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  InputAdornment,
  Box,
  CircularProgress,
  LinearProgress,
} from "@mui/material";
import {
  ShieldPlus,
  Crown,
  Shield,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Check,
  UserPlus,
  User,
} from "lucide-react";
import { colors } from "../Products/products-data";
import type { AppUser, UserRole } from "./users-data";
import { getRoleStyle } from "./users-data";
import { createAdminService } from "@/service/users/userService";
import {
  validateFirstName,
  validateLastName,
  validateEmail,
  validatePassword,
  validateConfirmPassword,
  getPasswordStrength,
} from "@/types/validation";
import toast from "react-hot-toast";

// ─── Field style helper ────────────────────────────────────────────────────────

const fieldSx = (hasError: boolean) => ({
  "& .MuiOutlinedInput-root": {
    "& fieldset": { borderColor: hasError ? "#EF4444" : colors.border },
    "&:hover fieldset": { borderColor: hasError ? "#EF4444" : colors.primary },
    "&.Mui-focused fieldset": {
      borderColor: hasError ? "#EF4444" : colors.primary,
    },
  },
  "& .MuiFormHelperText-root": {
    color: hasError ? "#EF4444" : colors.textMuted,
  },
});

// ─── Password strength bar ─────────────────────────────────────────────────────

function PasswordStrengthBar({ password }: { password: string }) {
  if (!password) return null;
  const { score, label, color } = getPasswordStrength(password);
  return (
    <Box sx={{ mt: -1 }}>
      <LinearProgress
        variant="determinate"
        value={(score / 4) * 100}
        sx={{
          height: 4,
          borderRadius: 2,
          bgcolor: "#E2E8F0",
          "& .MuiLinearProgress-bar": { bgcolor: color, borderRadius: 2 },
        }}
      />
      <p
        style={{
          margin: "4px 0 0",
          fontSize: "0.72rem",
          color,
          fontWeight: 600,
        }}
      >
        {label}
      </p>
    </Box>
  );
}

// ─── Form state ────────────────────────────────────────────────────────────────

interface FormState {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  role: "admin" | "superAdmin";
}

interface FormErrors {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
}

const EMPTY_STATE: FormState = {
  firstName: "",
  lastName: "",
  email: "",
  password: "",
  confirmPassword: "",
  role: "admin",
};

const EMPTY_ERRORS: FormErrors = {
  firstName: "",
  lastName: "",
  email: "",
  password: "",
  confirmPassword: "",
};

function validateAll(f: FormState): FormErrors {
  return {
    firstName: validateFirstName(f.firstName).error,
    lastName: validateLastName(f.lastName).error,
    email: validateEmail(f.email).error,
    password: validatePassword(f.password).error,
    confirmPassword: validateConfirmPassword(f.password, f.confirmPassword)
      .error,
  };
}

// ─── Props ─────────────────────────────────────────────────────────────────────

interface CreateAdminFormProps {
  open: boolean;
  onClose: () => void;
  onCreate: (admin: AppUser) => void;
}

// ─── Component ─────────────────────────────────────────────────────────────────

export default function CreateAdminForm({
  open,
  onClose,
  onCreate,
}: CreateAdminFormProps) {
  const [form, setForm] = useState<FormState>(EMPTY_STATE);
  const [errors, setErrors] = useState<FormErrors>(EMPTY_ERRORS);
  const [touched, setTouched] = useState<
    Partial<Record<keyof FormErrors, boolean>>
  >({});
  const [showPw, setShowPw] = useState(false);
  const [showCpw, setShowCpw] = useState(false);
  const [saving, setSaving] = useState(false);

  // ── Helpers ──────────────────────────────────────────────────────────────

  const set =
    (field: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) => {
      const next = { ...form, [field]: e.target.value };
      setForm(next);
      if (touched[field as keyof FormErrors]) {
        setErrors(validateAll(next));
      }
    };

  const setRole = (role: "admin" | "superAdmin") =>
    setForm((f) => ({ ...f, role }));

  const blur = (field: keyof FormErrors) => () => {
    setTouched((t) => ({ ...t, [field]: true }));
    setErrors(validateAll(form));
  };

  const reset = useCallback(() => {
    setForm(EMPTY_STATE);
    setErrors(EMPTY_ERRORS);
    setTouched({});
    setShowPw(false);
    setShowCpw(false);
  }, []);

  const handleClose = () => {
    if (saving) return;
    reset();
    onClose();
  };

  // ── Submit ────────────────────────────────────────────────────────────────

  const handleCreate = async () => {
    // Mark all fields touched so errors show
    setTouched({
      firstName: true,
      lastName: true,
      email: true,
      password: true,
      confirmPassword: true,
    });
    const errs = validateAll(form);
    setErrors(errs);

    if (Object.values(errs).some(Boolean)) {
      toast.error("Please fix the errors before submitting.");
      return;
    }

    setSaving(true);
    try {
      const newAdmin = await createAdminService({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        password: form.password,
        role: form.role,
      });
      const label = form.role === "superAdmin" ? "Super Admin" : "Admin";
      toast.success(`${label} account created successfully`);
      onCreate(newAdmin);
      handleClose();
    } catch (err: any) {
      // Surface Firebase-specific errors clearly
      const msg = err?.message ?? "Failed to create account";
      if (
        msg.includes("email-already-in-use") ||
        msg.includes("EMAIL_EXISTS")
      ) {
        toast.error("An account with this email already exists.");
      } else {
        toast.error(msg);
      }
    } finally {
      setSaving(false);
    }
  };

  // ── Derived ───────────────────────────────────────────────────────────────

  const show = (f: keyof FormErrors): boolean => !!touched[f] && !!errors[f];

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{ sx: { borderRadius: 3 } }}
    >
      {/* Header */}
      <DialogTitle
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1.5,
          color: colors.primary,
          pb: 1,
        }}
      >
        <ShieldPlus size={20} />
        Create Admin Account
      </DialogTitle>

      <DialogContent sx={{ pt: 1 }}>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5, mt: 1 }}>
          {/* ── Role picker ────────────────────────────────────────────────── */}
          <Box>
            <p
              style={{
                margin: "0 0 8px",
                fontSize: "0.72rem",
                fontWeight: 600,
                color: colors.textMuted,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              Account Role
            </p>
            <Box sx={{ display: "flex", gap: 1 }}>
              {(["admin", "superAdmin"] as const).map((r) => {
                const s = getRoleStyle(r);
                const active = form.role === r;
                return (
                  <Box
                    key={r}
                    onClick={() => !saving && setRole(r)}
                    sx={{
                      flex: 1,
                      p: 1.5,
                      borderRadius: 2,
                      cursor: saving ? "not-allowed" : "pointer",
                      border: `2px solid ${active ? s.color : colors.border}`,
                      bgcolor: active ? s.bg : "#FAFAFA",
                      transition: "all 0.15s",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 0.8,
                      opacity: saving ? 0.6 : 1,
                    }}
                  >
                    {r === "superAdmin" ? (
                      <Crown
                        size={15}
                        style={{ color: active ? s.color : colors.textMuted }}
                      />
                    ) : (
                      <Shield
                        size={15}
                        style={{ color: active ? s.color : colors.textMuted }}
                      />
                    )}
                    <span
                      style={{
                        fontSize: "0.82rem",
                        fontWeight: active ? 700 : 500,
                        color: active ? s.color : colors.textMuted,
                      }}
                    >
                      {s.label}
                    </span>
                    {active && <Check size={13} style={{ color: s.color }} />}
                  </Box>
                );
              })}
            </Box>
          </Box>

          {/* ── Name row ───────────────────────────────────────────────────── */}
          <Box sx={{ display: "flex", gap: 1.5 }}>
            <TextField
              label="First Name"
              value={form.firstName}
              onChange={set("firstName")}
              onBlur={blur("firstName")}
              error={show("firstName")}
              helperText={show("firstName") ? errors.firstName : " "}
              size="small"
              fullWidth
                          disabled={saving}
                          
             
              sx={fieldSx(show("firstName"))}
            />
            <TextField
              label="Last Name"
              value={form.lastName}
              onChange={set("lastName")}
              onBlur={blur("lastName")}
              error={show("lastName")}
              helperText={show("lastName") ? errors.lastName : " "}
              size="small"
              fullWidth
              disabled={saving}
              sx={fieldSx(show("lastName"))}
            />
          </Box>

          {/* ── Email ──────────────────────────────────────────────────────── */}
          <TextField
            label="Email Address"
            type="email"
            value={form.email}
            onChange={set("email")}
            onBlur={blur("email")}
            error={show("email")}
            helperText={show("email") ? errors.email : " "}
            size="small"
            fullWidth
            disabled={saving}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Mail size={14} style={{ color: colors.textMuted }} />
                </InputAdornment>
              ),
            }}
            sx={fieldSx(show("email"))}
          />

          {/* ── Password ───────────────────────────────────────────────────── */}
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
            <TextField
              label="Password"
              type={showPw ? "text" : "password"}
              value={form.password}
              onChange={set("password")}
              onBlur={blur("password")}
              error={show("password")}
              helperText={
                show("password")
                  ? errors.password
                  : "Min 8 chars, uppercase, number, special char"
              }
              size="small"
              fullWidth
              disabled={saving}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Lock size={14} style={{ color: colors.textMuted }} />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      size="small"
                      onClick={() => setShowPw(!showPw)}
                      disabled={saving}
                    >
                      {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              sx={fieldSx(show("password"))}
            />
            <PasswordStrengthBar password={form.password} />
          </Box>

          {/* ── Confirm password ───────────────────────────────────────────── */}
          <TextField
            label="Confirm Password"
            type={showCpw ? "text" : "password"}
            value={form.confirmPassword}
            onChange={set("confirmPassword")}
            onBlur={blur("confirmPassword")}
            error={show("confirmPassword")}
            helperText={show("confirmPassword") ? errors.confirmPassword : " "}
            size="small"
            fullWidth
            disabled={saving}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Lock size={14} style={{ color: colors.textMuted }} />
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    size="small"
                    onClick={() => setShowCpw(!showCpw)}
                    disabled={saving}
                  >
                    {showCpw ? <EyeOff size={15} /> : <Eye size={15} />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
            sx={fieldSx(show("confirmPassword"))}
          />

          {/* ── Info box ───────────────────────────────────────────────────── */}
          <Box
            sx={{
              p: 1.5,
              borderRadius: 2,
              bgcolor: colors.primaryBg,
              border: `1px solid ${colors.border}`,
            }}
          >
            <p
              style={{
                margin: 0,
                fontSize: "0.78rem",
                color: colors.textSecondary,
                lineHeight: 1.6,
              }}
            >
              A account will be created with the{" "}
              <strong style={{ color: getRoleStyle(form.role).color }}>
                {getRoleStyle(form.role).label}
              </strong>{" "}
              role. The account is immediately active and can sign in.
            </p>
          </Box>
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 3, pt: 1, gap: 1 }}>
        <Button
          onClick={handleClose}
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
          onClick={handleCreate}
          disabled={saving}
          variant="contained"
          startIcon={
            saving ? (
              <CircularProgress size={14} color="inherit" />
            ) : (
              <UserPlus size={16} />
            )
          }
          sx={{
            textTransform: "none",
            bgcolor: colors.primary,
            "&:hover": { bgcolor: colors.primaryDark },
            borderRadius: 2,
            minWidth: 140,
          }}
        >
          {saving ? "Creating…" : "Create Account"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
