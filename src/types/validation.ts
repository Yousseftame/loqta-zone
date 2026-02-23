// ─────────────────────────────────────────────────────────────
// validation.ts — shared form validation rules for Loqta Zone
// ─────────────────────────────────────────────────────────────

export type ValidationResult = { valid: boolean; error: string };

// ── Primitives ────────────────────────────────────────────────

export const validateFirstName = (v: string): ValidationResult => {
  if (!v.trim()) return { valid: false, error: "First name is required." };
  if (v.trim().length < 2) return { valid: false, error: "At least 2 characters." };
  if (v.trim().length > 30) return { valid: false, error: "Max 30 characters." };
  if (!/^[a-zA-Z\u0600-\u06FF\s'-]+$/.test(v.trim()))
    return { valid: false, error: "Letters only." };
  return { valid: true, error: "" };
};

export const validateLastName = (v: string): ValidationResult => {
  if (!v.trim()) return { valid: false, error: "Last name is required." };
  if (v.trim().length < 2) return { valid: false, error: "At least 2 characters." };
  if (v.trim().length > 30) return { valid: false, error: "Max 30 characters." };
  if (!/^[a-zA-Z\u0600-\u06FF\s'-]+$/.test(v.trim()))
    return { valid: false, error: "Letters only." };
  return { valid: true, error: "" };
};

export const validateEmail = (v: string): ValidationResult => {
  if (!v.trim()) return { valid: false, error: "Email is required." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()))
    return { valid: false, error: "Enter a valid email address." };
  return { valid: true, error: "" };
};

export const validatePhone = (v: string): ValidationResult => {
  const digits = v.replace(/\D/g, "");
  if (!v.trim()) return { valid: false, error: "Phone number is required." };
  if (digits.length < 10) return { valid: false, error: "At least 10 digits required." };
  if (digits.length > 15) return { valid: false, error: "Max 15 digits." };
  if (!/^[0-9+\-\s()]+$/.test(v.trim()))
    return { valid: false, error: "Invalid phone format." };
  return { valid: true, error: "" };
};

export const validatePassword = (v: string): ValidationResult => {
  if (!v) return { valid: false, error: "Password is required." };
  if (v.length < 8) return { valid: false, error: "At least 8 characters." };
  if (!/[A-Z]/.test(v)) return { valid: false, error: "Include at least one uppercase letter." };
  if (!/[0-9]/.test(v)) return { valid: false, error: "Include at least one number." };
  if (!/[^A-Za-z0-9]/.test(v))
    return { valid: false, error: "Include at least one special character." };
  return { valid: true, error: "" };
};

export const validateConfirmPassword = (
  password: string,
  confirm: string
): ValidationResult => {
  if (!confirm) return { valid: false, error: "Please confirm your password." };
  if (confirm !== password) return { valid: false, error: "Passwords do not match." };
  return { valid: true, error: "" };
};

export const validateProfileImage = (file: File | null): ValidationResult => {
  if (!file) return { valid: true, error: "" }; // optional
  const allowed = ["image/jpeg", "image/png", "image/webp"];
  if (!allowed.includes(file.type))
    return { valid: false, error: "Only JPG, PNG, or WEBP images allowed." };
  if (file.size > 10 * 1024 * 1024)
    return { valid: false, error: "Image must be under 3 MB." };
  return { valid: true, error: "" };
};

// ── Full register form ────────────────────────────────────────

export interface RegisterFormErrors {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  profileImage: string;
}

export const validateRegisterForm = (fields: {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  profileImage: File | null;
}): { errors: RegisterFormErrors; isValid: boolean } => {
  const errors: RegisterFormErrors = {
    firstName: validateFirstName(fields.firstName).error,
    lastName: validateLastName(fields.lastName).error,
    email: validateEmail(fields.email).error,
    phone: validatePhone(fields.phone).error,
    password: validatePassword(fields.password).error,
    confirmPassword: validateConfirmPassword(fields.password, fields.confirmPassword).error,
    profileImage: validateProfileImage(fields.profileImage).error,
  };

  const isValid = Object.values(errors).every((e) => !e);
  return { errors, isValid };
};

// ── Login form ────────────────────────────────────────────────

export const validateLoginForm = (fields: {
  email: string;
  password: string;
}): { errors: { email: string; password: string }; isValid: boolean } => {
  const errors = {
    email: validateEmail(fields.email).error,
    password: !fields.password ? "Password is required." : "",
  };
  return { errors, isValid: Object.values(errors).every((e) => !e) };
};

// ── Password strength meter (0–4) ────────────────────────────

export const getPasswordStrength = (
  password: string
): { score: number; label: string; color: string } => {
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  const levels = [
    { label: "Too weak", color: "#ef4444" },
    { label: "Weak",     color: "#f97316" },
    { label: "Fair",     color: "#eab308" },
    { label: "Strong",   color: "#22c55e" },
    { label: "Strong",   color: "#22c55e" },
  ];
  return { score, ...levels[score] };
};