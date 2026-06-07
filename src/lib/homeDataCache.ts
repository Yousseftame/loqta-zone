/**
 * homeDataCache.ts
 *
 * Fires all three homepage slide fetches IMMEDIATELY when this module is
 * imported — which happens during the SplashScreen — so the data is already
 * resolved (or near-resolved) by the time Home mounts.
 *
 * Components read from the cache via the helper functions below.
 * If the splash is skipped the cache still works: each component just awaits
 * the same in-flight promise (no duplicate requests, no double fetching).
 *
 * NOTHING is changed in the service layer or component logic — this is purely
 * additive prefetching layered on top.
 */

import { fetchActiveHeroSlides, type HeroSlide } from "@/service/heroSlide/heroSlideService";
import { fetchActiveLeftSectionSlides, type LeftSectionSlide } from "@/service/leftSection/leftSectionService";
import { fetchActiveRightSectionSlides, type RightSectionSlide } from "@/service/rightSection/rightSectionService";

// ── In-flight promises — created once, shared everywhere ─────────────────────
const _heroPromise: Promise<HeroSlide[]> = fetchActiveHeroSlides().catch(() => []);
const _leftPromise: Promise<LeftSectionSlide[]> = fetchActiveLeftSectionSlides().catch(() => []);
const _rightPromise: Promise<RightSectionSlide[]> = fetchActiveRightSectionSlides().catch(() => []);

// ── Resolved caches — set after the promise settles ──────────────────────────
let _heroCache: HeroSlide[] | null = null;
let _leftCache: LeftSectionSlide[] | null = null;
let _rightCache: RightSectionSlide[] | null = null;

_heroPromise.then((d) => { _heroCache = d; });
_leftPromise.then((d) => { _leftCache = d; });
_rightPromise.then((d) => { _rightCache = d; });

// ── Public API — components call these instead of the service directly ────────

/**
 * Returns cached hero slides synchronously if available,
 * otherwise awaits the in-flight promise.
 */
export function getHeroSlides(): Promise<HeroSlide[]> {
  if (_heroCache !== null) return Promise.resolve(_heroCache);
  return _heroPromise;
}

/**
 * Returns cached left-section slides synchronously if available,
 * otherwise awaits the in-flight promise.
 */
export function getLeftSectionSlides(): Promise<LeftSectionSlide[]> {
  if (_leftCache !== null) return Promise.resolve(_leftCache);
  return _leftPromise;
}

/**
 * Returns cached right-section slides synchronously if available,
 * otherwise awaits the in-flight promise.
 */
export function getRightSectionSlides(): Promise<RightSectionSlide[]> {
  if (_rightCache !== null) return Promise.resolve(_rightCache);
  return _rightPromise;
}
