import React, { useRef, useState, useEffect, memo } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, FreeMode } from "swiper/modules";
import { useInView } from "motion/react";
import SplitText from "@/components/SplitText";
import "swiper/css/free-mode";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";
import { ShinyButton } from "../ui/shiny-button";

// ── Design tokens ─────────────────────────────────────────────
const NAVY = "#2A4863";
const NAVY2 = "#1e3652";
const CREAM = "rgb(229, 224, 198)";
const CREAM2 = "rgba(229, 224, 198, 0.75)";
const GOLD = "#c9a96e";

interface AuctionItem {
  _id: string;
  title: string;
  subtitle: string;
  startingPrice: number;
  currentBid?: number;
  currency: string;
  image: string;
  auctionDate: string;
  numAuctions: number;
  isHot?: boolean;
  timeLeft: string;
  category: string;
  bidsCount?: number;
}

const auctionItems: AuctionItem[] = [
  {
    _id: "1",
    title: "Mediceube Bundle",
    subtitle: "Premium Skin Care Set",
    startingPrice: 500,
    currency: "EGP",
    image:
      "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=700&q=85",
    auctionDate: "April",
    numAuctions: 1,
    category: "Beauty",
    timeLeft: "2d 14h",
    bidsCount: 7,
  },
  {
    _id: "2",
    title: "iPhone 16 Pro Max",
    subtitle: "Desert Titanium · 256GB",
    startingPrice: 5000,
    currentBid: 5800,
    currency: "EGP",
    image:
      "https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=400&q=80",
    auctionDate: "April",
    numAuctions: 2,
    isHot: true,
    category: "Phones",
    timeLeft: "1d 6h",
    bidsCount: 24,
  },
  {
    _id: "3",
    title: "Apple Watch S11",
    subtitle: "Midnight · GPS",
    startingPrice: 1500,
    currency: "EGP",
    image:
      "https://images.unsplash.com/photo-1551816230-ef5deaed4a26?w=700&q=85",
    auctionDate: "April",
    numAuctions: 2,
    category: "Wearables",
    timeLeft: "3d 2h",
    bidsCount: 13,
  },
  {
    _id: "4",
    title: "JBL Tune 520BT",
    subtitle: "Wireless · Blue",
    startingPrice: 500,
    currency: "EGP",
    image:
      "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=700&q=85",
    auctionDate: "April",
    numAuctions: 1,
    category: "Audio",
    timeLeft: "5d 8h",
    bidsCount: 5,
  },
  {
    _id: "5",
    title: "Galaxy S25 Ultra",
    subtitle: "Titanium · 512GB",
    startingPrice: 5000,
    currentBid: 6200,
    currency: "EGP",
    image:
      "https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=700&q=85",
    auctionDate: "April",
    numAuctions: 2,
    isHot: true,
    category: "Phones",
    timeLeft: "22h 15m",
    bidsCount: 31,
  },
  {
    _id: "6",
    title: "Sony WH-1000XM5",
    subtitle: "Noise Cancel · Platinum",
    startingPrice: 3200,
    currency: "EGP",
    image:
      "https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?w=700&q=85",
    auctionDate: "April",
    numAuctions: 1,
    category: "Audio",
    timeLeft: "4d 11h",
    bidsCount: 9,
  },
];

// ── Card ──────────────────────────────────────────────────────
const AuctionCard = memo(function AuctionCard({ item }: { item: AuctionItem }) {
  const [hovered, setHovered] = useState(false);

  return (
    <>
      {/* Responsive card styles injected once */}
      <style>{`
        .lz-card-img { height: 180px; }
        .lz-card-title { font-size: 11px; }
        .lz-card-subtitle { font-size: 10px; }
        .lz-card-meta { display: none !important; }
        .lz-card-price-label { font-size: 8px; }
        .lz-card-price-value { font-size: 16px; }
        .lz-card-bid-label { font-size: 8px; }
        .lz-card-bid-value { font-size: 11px; }
        .lz-card-body { padding: 10px 10px 12px; gap: 8px; }
        .lz-card-price-block { padding: 10px 10px; gap: 8px; }
        .lz-card-banner { font-size: 8px; padding: 5px 0; letter-spacing: 0.14em; }
        .lz-card-stamp { width: 38px; height: 38px; top: 8px; left: 8px; }
        .lz-card-stamp span { font-size: 5px !important; }
        .lz-card-stamp .lz-stamp-stars { font-size: 6px !important; }
        .lz-card-badge { font-size: 9px; padding: 3px 8px; top: 8px; right: 8px; }
        .lz-card-cat { font-size: 8px; padding: 3px 7px; }
        .lz-card-bids { font-size: 8px; padding: 3px 7px; }
        .lz-cat-row { bottom: 8px; left: 8px; right: 8px; }
        .lz-shiny-btn { font-size: 9px !important; padding: 7px 4px !important; }

        @media (min-width: 640px) {
          .lz-card-img { height: 220px; }
          .lz-card-title { font-size: 13px; }
          .lz-card-subtitle { font-size: 11px; }
          .lz-card-meta { display: flex !important; }
          .lz-card-price-label { font-size: 9px; }
          .lz-card-price-value { font-size: 19px; }
          .lz-card-bid-label { font-size: 9px; }
          .lz-card-bid-value { font-size: 13px; }
          .lz-card-body { padding: 14px 14px 16px; gap: 11px; }
          .lz-card-price-block { padding: 12px 12px; gap: 10px; }
          .lz-card-banner { font-size: 9px; padding: 7px 0; letter-spacing: 0.18em; }
          .lz-card-stamp { width: 48px; height: 48px; top: 10px; left: 10px; }
          .lz-card-stamp span { font-size: 6px !important; }
          .lz-card-stamp .lz-stamp-stars { font-size: 7px !important; }
          .lz-card-badge { font-size: 10px; padding: 4px 10px; top: 10px; right: 10px; }
          .lz-card-cat { font-size: 9px; padding: 3px 9px; }
          .lz-card-bids { font-size: 9px; padding: 3px 9px; }
          .lz-cat-row { bottom: 10px; left: 10px; right: 10px; }
          .lz-shiny-btn { font-size: 10px !important; padding: 9px 6px !important; }
        }

        @media (min-width: 900px) {
          .lz-card-img { height: 240px; }
          .lz-card-title { font-size: 15px; }
          .lz-card-subtitle { font-size: 12px; }
          .lz-card-price-label { font-size: 9px; }
          .lz-card-price-value { font-size: 21px; }
          .lz-card-bid-value { font-size: 14px; }
          .lz-card-body { padding: 18px 20px 20px; gap: 14px; }
          .lz-card-price-block { padding: 14px 16px; gap: 12px; }
          .lz-card-banner { font-size: 10px; padding: 8px 0; letter-spacing: 0.22em; }
          .lz-card-stamp { width: 56px; height: 56px; top: 12px; left: 12px; }
          .lz-card-stamp span { font-size: 6.5px !important; }
          .lz-card-stamp .lz-stamp-stars { font-size: 8px !important; }
          .lz-card-badge { font-size: 11px; padding: 5px 12px; top: 12px; right: 12px; }
          .lz-card-cat { font-size: 10px; padding: 4px 10px; }
          .lz-card-bids { font-size: 10px; padding: 4px 10px; }
          .lz-cat-row { bottom: 12px; left: 12px; right: 12px; }
          .lz-shiny-btn { font-size: 11px !important; padding: 10px 8px !important; }
        }
      `}</style>

      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          borderRadius: 14,
          overflow: "hidden",
          background: "#fff",
          border: `1px solid ${hovered ? "rgba(42,72,99,0.35)" : "rgba(42,72,99,0.10)"}`,
          boxShadow: hovered
            ? `0 20px 56px rgba(42,72,99,0.18), 0 4px 16px rgba(42,72,99,0.10)`
            : "0 2px 16px rgba(42,72,99,0.07)",
          transform: hovered ? "translateY(-5px)" : "translateY(0)",
          transition: "all 0.45s cubic-bezier(0.22, 1, 0.36, 1)",
          cursor: "pointer",
          display: "flex",
          flexDirection: "column",
          userSelect: "none",
          width: "100%",
        }}
      >
        {/* Promo banner */}
        <div
          className="lz-card-banner"
          style={{
            background: hovered
              ? `linear-gradient(90deg, ${NAVY2}, ${NAVY})`
              : `linear-gradient(90deg, ${NAVY}, #3a5a78)`,
            textAlign: "center",
            fontWeight: 700,
            color: CREAM,
            textTransform: "uppercase",
            position: "relative",
            overflow: "hidden",
            transition: "background 0.4s ease",
          }}
        >
          <span style={{ position: "relative", zIndex: 1 }}>
            ✦ Promo Code ✦
          </span>
          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "linear-gradient(90deg, transparent, rgba(229,224,198,0.18), transparent)",
              transform: hovered ? "translateX(200%)" : "translateX(-100%)",
              transition: "transform 0.7s ease",
            }}
          />
        </div>

        {/* Image */}
        <div
          className="lz-card-img"
          style={{
            position: "relative",
            overflow: "hidden",
            background: "#eef1f4",
            flexShrink: 0,
          }}
        >
          <img
            src={item.image}
            alt={item.title}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              objectPosition: "center",
              transform: hovered ? "scale(1.05)" : "scale(1)",
              transition:
                "transform 0.65s cubic-bezier(0.25, 0.46, 0.45, 0.94)",
              display: "block",
            }}
            onError={(e) => {
              (e.target as HTMLImageElement).src = "/fallback.jpg";
            }}
          />
          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "linear-gradient(to bottom, transparent 40%, rgba(20,35,52,0.75) 100%)",
            }}
          />

          {/* LOQTA ZONE stamp */}
          <div
            className="lz-card-stamp"
            style={{
              position: "absolute",
              borderRadius: "50%",
              background: `linear-gradient(135deg, ${NAVY}, ${NAVY2})`,
              border: `2px dashed ${CREAM2}`,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 4px 14px rgba(0,0,0,0.35)",
              transform: hovered
                ? "rotate(10deg) scale(1.08)"
                : "rotate(0deg) scale(1)",
              transition: "transform 0.45s cubic-bezier(0.34, 1.56, 0.64, 1)",
            }}
          >
            <span
              style={{
                fontWeight: 900,
                color: CREAM,
                textAlign: "center",
                lineHeight: 1.4,
                letterSpacing: "0.05em",
                textTransform: "uppercase",
              }}
            >
              LOQTA
              <br />
              ZONE
              <br />
              <span className="lz-stamp-stars" style={{ color: GOLD }}>
                ★★★
              </span>
            </span>
          </div>

          {/* Time / Hot badge */}
          <div
            className="lz-card-badge"
            style={{
              position: "absolute",
              background: item.isHot
                ? "rgba(160, 40, 40, 0.88)"
                : "rgba(20, 35, 52, 0.72)",
              backdropFilter: "blur(6px)",
              borderRadius: 999,
              display: "flex",
              alignItems: "center",
              gap: 4,
              fontWeight: 700,
              color: item.isHot ? "#ffd0d0" : CREAM2,
              letterSpacing: "0.04em",
              border: item.isHot
                ? "1px solid rgba(255,100,100,0.35)"
                : `1px solid rgba(229,224,198,0.2)`,
            }}
          >
            {item.isHot && <span>🔥</span>}
            <span>⏱ {item.timeLeft}</span>
          </div>

          {/* Category + bids */}
          <div
            className="lz-cat-row"
            style={{
              position: "absolute",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 4,
            }}
          >
            <div
              className="lz-card-cat"
              style={{
                background: "rgba(20,35,52,0.80)",
                backdropFilter: "blur(6px)",
                border: `1px solid rgba(229,224,198,0.25)`,
                borderRadius: 5,
                fontWeight: 700,
                color: CREAM,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                whiteSpace: "nowrap",
              }}
            >
              {item.category}
            </div>
            {item.bidsCount && (
              <div
                className="lz-card-bids"
                style={{
                  background: "rgba(20,35,52,0.80)",
                  backdropFilter: "blur(6px)",
                  border: `1px solid rgba(229,224,198,0.18)`,
                  borderRadius: 999,
                  fontWeight: 600,
                  color: CREAM2,
                  whiteSpace: "nowrap",
                }}
              >
                🔨 {item.bidsCount}
              </div>
            )}
          </div>
        </div>

        {/* Card body */}
        <div
          className="lz-card-body"
          style={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
          }}
        >
          {/* Title + subtitle */}
          <div>
            <h3
              className="lz-card-title"
              style={{
                margin: 0,
                fontWeight: 800,
                color: NAVY,
                textTransform: "uppercase",
                letterSpacing: "0.03em",
                lineHeight: 1.2,
                // Clamp to 2 lines max
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}
            >
              {item.title}
            </h3>
            <p
              className="lz-card-subtitle"
              style={{
                margin: "3px 0 0",
                color: "#7a8ea0",
                fontWeight: 500,
                lineHeight: 1.3,
                display: "-webkit-box",
                WebkitLineClamp: 1,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}
            >
              {item.subtitle}
            </p>
          </div>

          {/* Meta row — hidden on mobile */}
          <div
            className="lz-card-meta"
            style={{
              gap: 10,
              color: "#8fa0b0",
              fontWeight: 600,
              alignItems: "center",
              fontSize: 10,
            }}
          >
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ opacity: 0.7 }}>📅</span> {item.auctionDate}
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ opacity: 0.7 }}>🔨</span> ×{item.numAuctions}
            </span>
          </div>

          {/* Divider */}
          <div
            style={{
              height: 1,
              background: `linear-gradient(90deg, rgba(42,72,99,0.18), transparent)`,
              flexShrink: 0,
            }}
          />

          {/* Price block */}
          <div
            className="lz-card-price-block"
            style={{
              borderRadius: 10,
              background: hovered ? "rgba(42,72,99,0.04)" : "#f7f8fa",
              border: `1px solid rgba(42,72,99,0.10)`,
              display: "flex",
              flexDirection: "column",
              transition: "background 0.3s ease",
              flex: 1,
              justifyContent: "space-between",
            }}
          >
            {/* Starting + current bid */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-end",
                marginBottom: 8,
              }}
            >
              <div>
                <div
                  className="lz-card-price-label"
                  style={{
                    color: "#9aabbb",
                    fontWeight: 700,
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                    marginBottom: 2,
                  }}
                >
                  From
                </div>
                <div
                  className="lz-card-price-value"
                  style={{
                    fontWeight: 900,
                    color: GOLD,
                    letterSpacing: "-0.01em",
                    lineHeight: 1,
                  }}
                >
                  {item.startingPrice.toLocaleString()}
                  <span
                    style={{
                      fontSize: "0.55em",
                      fontWeight: 600,
                      color: "#b8996a",
                      marginLeft: 3,
                    }}
                  >
                    {item.currency}
                  </span>
                </div>
              </div>
              {item.currentBid && (
                <div style={{ textAlign: "right" }}>
                  <div
                    className="lz-card-bid-label"
                    style={{
                      color: "#9aabbb",
                      fontWeight: 700,
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      marginBottom: 2,
                    }}
                  >
                    Bid
                  </div>
                  <div
                    className="lz-card-bid-value"
                    style={{
                      fontWeight: 800,
                      color: "#2d7a4f",
                    }}
                  >
                    {item.currentBid.toLocaleString()}
                    <span
                      style={{
                        fontSize: "0.7em",
                        marginLeft: 2,
                        fontWeight: 600,
                      }}
                    >
                      {item.currency}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* CTA */}
            <ShinyButton className="lz-shiny-btn w-full !rounded-lg">
              ✦ Register To Join ✦
            </ShinyButton>
          </div>
        </div>
      </div>
    </>
  );
});

// ── Header ────────────────────────────────────────────────────
const AuctionHeader = memo(function AuctionHeader() {
  const headerRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(headerRef, { once: false, margin: "-80px" });
  const [animKey, setAnimKey] = useState(0);
  const wasInView = useRef(false);

  useEffect(() => {
    if (isInView && !wasInView.current) {
      setAnimKey((k) => k + 1);
      wasInView.current = true;
    } else if (!isInView) {
      wasInView.current = false;
    }
  }, [isInView]);

  return (
    <div
      ref={headerRef}
      style={{
        textAlign: "center",
        marginBottom: 52,
        padding: "0 24px",
        position: "relative",
        zIndex: 1,
        minHeight: 170,
      }}
    >
      {/* Eyebrow */}
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 10,
          marginBottom: 20,
          opacity: isInView ? 1 : 0,
          transform: isInView ? "translateY(0)" : "translateY(14px)",
          transition: "opacity 0.55s ease, transform 0.55s ease",
        }}
      >
        <div
          style={{
            width: 32,
            height: 1,
            background: `linear-gradient(90deg, transparent, ${GOLD})`,
          }}
        />
        <span
          style={{
            fontSize: 10,
            fontWeight: 800,
            color: GOLD,
            letterSpacing: "0.3em",
            textTransform: "uppercase",
          }}
        >
          · Live Auctions ·
        </span>
        <div
          style={{
            width: 32,
            height: 1,
            background: `linear-gradient(90deg, ${GOLD}, transparent)`,
          }}
        />
      </div>

      {/* Line 1 */}
      <div
        style={{
          fontSize: "clamp(26px, 4.5vw, 44px)",
          fontWeight: 900,
          color: "#ffffff",
          letterSpacing: "-0.02em",
          lineHeight: 1.1,
          marginBottom: 4,
        }}
      >
        <SplitText
          key={`line1-${animKey}`}
          text="Upcoming"
          tag="h2"
          className=""
          splitType="chars"
          duration={1.0}
          delay={30}
          ease="power3.out"
          from={{ opacity: 0, y: 40, rotateX: -20 }}
          to={{ opacity: 1, y: 0, rotateX: 0 }}
        />
      </div>

      {/* Line 2 */}
      <div
        style={{
          fontSize: "clamp(26px, 4.5vw, 44px)",
          fontWeight: 900,
          color: GOLD,
          letterSpacing: "-0.02em",
          lineHeight: 1.1,
          marginBottom: 20,
        }}
      >
        <SplitText
          key={`line2-${animKey}`}
          text="Auctions."
          tag="h2"
          className=""
          splitType="chars"
          duration={1.0}
          delay={30}
          ease="power3.out"
          from={{ opacity: 0, y: 40 }}
          to={{ opacity: 1, y: 0 }}
        />
      </div>

      {/* Subtext */}
      <p
        style={{
          margin: "0 auto",
          color: "rgba(229,224,198,0.45)",
          fontSize: 14,
          fontWeight: 400,
          letterSpacing: "0.01em",
          maxWidth: 480,
          lineHeight: 1.7,
          opacity: isInView ? 1 : 0,
          transform: isInView ? "translateY(0)" : "translateY(10px)",
          transition: "opacity 0.7s ease 0.35s, transform 0.7s ease 0.35s",
        }}
      >
        Register now and secure your spot before bidding opens.
      </p>
    </div>
  );
});

// ── Main section ──────────────────────────────────────────────
export default function AuctionSwiper() {
  const swiperRef = useRef<any>(null);
  const [activeIdx, setActiveIdx] = useState(0);
  const resumeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  return (
    <section
      style={{
        background: `linear-gradient(180deg, #0a0a1a 0%, #0d1b2a 50%, #0a0a1a 100%)`,
        padding: "72px 0 88px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Top gold border */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 3,
          background: `linear-gradient(90deg, transparent, ${GOLD}, ${CREAM}, ${GOLD}, transparent)`,
          opacity: 0.5,
        }}
      />

      {/* Decorative rings */}
      <div
        style={{
          position: "absolute",
          top: -120,
          right: -120,
          width: 500,
          height: 500,
          borderRadius: "50%",
          border: `1px solid rgba(229,224,198,0.08)`,
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: -80,
          right: -80,
          width: 350,
          height: 350,
          borderRadius: "50%",
          border: `1px solid rgba(229,224,198,0.05)`,
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: -100,
          left: -100,
          width: 400,
          height: 400,
          borderRadius: "50%",
          border: `1px solid rgba(201,169,110,0.08)`,
          pointerEvents: "none",
        }}
      />

      <AuctionHeader />

      {/* Swiper */}
      <div style={{ padding: "0 12px" }}>
        <style>{`
          .lz-swiper { overflow: visible !important; }
          .lz-swiper-wrap { overflow: hidden; padding: 8px 4px 4px; }
          .lz-swiper .swiper-slide { height: auto; }
          .lz-dot {
            width: 8px; height: 8px; border-radius: 4px;
            background: rgba(229,224,198,0.2);
            border: none; cursor: pointer;
            transition: width 0.2s ease, background 0.2s ease;
            padding: 0; flex-shrink: 0;
          }
          .lz-dot.active { width: 26px; background: #c9a96e; }
          .lz-dot:hover:not(.active) { background: rgba(229,224,198,0.4); }
        `}</style>

        <div className="lz-swiper-wrap">
          <Swiper
            className="lz-swiper"
            modules={[Autoplay, FreeMode]}
            onSwiper={(s) => {
              swiperRef.current = s;
            }}
            onSlideChange={(s) =>
              setActiveIdx(s.realIndex % auctionItems.length)
            }
            loop={true}
            speed={4000}
            autoplay={{
              delay: 0,
              disableOnInteraction: false,
              pauseOnMouseEnter: true,
            }}
            allowTouchMove={true}
            freeMode={true}
            breakpoints={{
              // Mobile: exactly 2 cards, tight gap
              0: { slidesPerView: 2, spaceBetween: 10 },
              // Tablet
              640: { slidesPerView: 3, spaceBetween: 14 },
              // Small desktop
              900: { slidesPerView: 4, spaceBetween: 18 },
              // Large desktop
              1200: { slidesPerView: 5, spaceBetween: 20 },
            }}
          >
            {[...auctionItems, ...auctionItems].map((item, i) => (
              <SwiperSlide key={`${item._id}-${i}`} style={{ height: "auto" }}>
                <AuctionCard item={item} />
              </SwiperSlide>
            ))}
          </Swiper>
        </div>

        {/* Dot navigation */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: 8,
            marginTop: 24,
          }}
        >
          {auctionItems.map((_, i) => (
            <button
              key={i}
              className={`lz-dot${activeIdx === i ? " active" : ""}`}
              onClick={() => {
                const sw = swiperRef.current;
                if (!sw) return;
                if (resumeTimer.current) clearTimeout(resumeTimer.current);
                sw.autoplay.stop();
                sw.params.speed = 600;
                sw.slideToLoop(i, 600);
                setActiveIdx(i);
                resumeTimer.current = setTimeout(() => {
                  sw.params.speed = 5000;
                  sw.autoplay.start();
                }, 1000);
              }}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

