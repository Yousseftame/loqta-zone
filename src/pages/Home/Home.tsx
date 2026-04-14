/**
 * Home.tsx
 *
 * PERFORMANCE NOTES:
 *  - LiveAuctionsSection, AuctionSwiper, AuctionsSection are lazily
 *    imported (React.lazy) so their JS is NOT included in the initial bundle.
 *  - Each section only mounts once its placeholder sentinel enters the
 *    viewport (IntersectionObserver with rootMargin "300px" so it loads
 *    slightly before the user reaches it). Until then it renders a
 *    lightweight placeholder div — zero Firestore reads, zero JS parse cost.
 */

import React, { lazy, Suspense, useEffect, useRef, useState } from "react";
import HeroSections from "@/components/HomeSections/HeroSections";
import LeftRightSections from "@/components/HomeSections/LeftRightSections";

// ─── Lazy-loaded below-fold sections ─────────────────────────────────────────
const LiveAuctionsSection = lazy(
  () => import("@/components/shared/LiveAuctionssection"),
);
const AuctionSwiper = lazy(() => import("@/components/shared/AuctionSwiper"));
const AuctionsSection = lazy(
  () => import("@/components/shared/Auctionssection"),
);

// ─── Minimal dark skeleton shown while a lazy section loads ──────────────────
function SectionSkeleton({ height = 400 }: { height?: number }) {
  return (
    <div
      style={{
        width: "100%",
        height,
        background: "linear-gradient(180deg,#1f2a3d 0%,#224266 100%)",
      }}
    />
  );
}

// ─── Wrapper that defers rendering until the section is near the viewport ────
function LazySection({
  children,
  skeletonHeight = 400,
  rootMargin = "300px",
}: {
  children: React.ReactNode;
  skeletonHeight?: number;
  rootMargin?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { rootMargin },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [rootMargin]);

  return (
    <div ref={ref}>
      {visible ? (
        <Suspense fallback={<SectionSkeleton height={skeletonHeight} />}>
          {children}
        </Suspense>
      ) : (
        <SectionSkeleton height={skeletonHeight} />
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function Home() {
  return (
    <>
      <style>{`
        .home-slides-wrapper {
          width: 100%;
          background: #09111a;
        }
        .home-slides-inner {
          width: 95%;
          margin: 0 auto;
        }
        @media (max-width: 639px) {
          .home-slides-inner {
            width: 100%;
            margin: 0;
          }
        }
      `}</style>

      {/* ── Above the fold: loaded eagerly ── */}
      <div className="home-slides-wrapper">
        <div className="home-slides-inner">
          <HeroSections />
          <LeftRightSections />
        </div>
      </div>

      {/* ── Below the fold: deferred until near viewport ── */}
      <LazySection skeletonHeight={500} rootMargin="300px">
        <LiveAuctionsSection />
      </LazySection>

      <LazySection skeletonHeight={600} rootMargin="300px">
        <AuctionSwiper />
      </LazySection>

      <LazySection skeletonHeight={700} rootMargin="300px">
        <AuctionsSection />
      </LazySection>
    </>
  );
}
