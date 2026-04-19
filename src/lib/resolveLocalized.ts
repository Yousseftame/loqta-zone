    /**
 * src/utils/resolveLocalized.ts
 *
 * Frontend mirror of functions/src/shared/i18nHelpers.ts
 *
 * Use this in ALL places that read product.title / product.description /
 * product.features directly from a Firestore snapshot (i.e. raw `data.title`
 * before it goes through productService.ts's `toLocalized()`).
 *
 * productService.ts already normalises docs into LocalizedString before
 * putting them in the Product type — so components that receive a typed
 * `Product` from context should use `resolveTitle()` from products-data.ts.
 *
 * THIS helper is for the handful of hooks that query Firestore directly
 * and map the raw snapshot data themselves:
 *   - usePublicProducts() in AuctionSwiper.tsx
 *   - useUpcomingAuctions() / usePastAuctions() in Auctionssection.tsx
 *   - useLiveAuctions() in LiveAuctionssection.tsx
 *   - usePendingLastOffer.ts
 */

/**
 * Resolves a Firestore field that is either:
 *   - A plain string (legacy doc written before the i18n migration)
 *   - A { en: string; ar: string } object (new format)
 *   - null / undefined
 *
 * Returns a plain EN string in all cases, with a safe fallback.
 */
export function resolveLocalizedField(
  raw: unknown,
  lang: "en" | "ar" = "en",
  fallback = "",
): string {
  if (!raw) return fallback;
  if (typeof raw === "string") return raw || fallback;
  if (typeof raw === "object") {
    const obj = raw as Record<string, string>;
    return obj[lang] || obj.en || obj.ar || fallback;
  }
  return fallback;
}

/** Convenience wrapper for product title specifically */
export function resolveProductTitle(
  raw: unknown,
  fallback = "Unknown Product",
): string {
  return resolveLocalizedField(raw, "en", fallback);
}