/**
 * functions/src/shared/i18nHelpers.ts
 *
 * Shared utilities for resolving localised Firestore fields.
 *
 * Product title/description/features were migrated from plain strings to
 * { en: string, ar: string } objects.  These helpers handle both the new
 * format and legacy plain-string documents so no migration script is needed.
 */

/**
 * Resolve a product title (or any localised string field) to a plain string.
 *
 * Handles:
 *   - New format:  { en: "iPhone", ar: "آيفون" }  → "iPhone"  (or "آيفون" if lang="ar")
 *   - Legacy docs: "iPhone"  → "iPhone"  (untouched)
 *   - Missing/null → fallback string
 */
export function resolveLocalizedString(
  raw: any,
  lang: "en" | "ar" = "en",
  fallback = "",
): string {
  if (!raw) return fallback;
  if (typeof raw === "string") return raw || fallback;
  const value = raw[lang] || raw.en || raw.ar || fallback;
  return value;
}

/** Convenience wrapper specifically for product titles */
export function resolveProductTitle(
  raw: any,
  fallback = "Unknown Product",
): string {
  return resolveLocalizedString(raw, "en", fallback);
}