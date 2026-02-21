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
      "https://images.unsplash.com/photo-1696446702183-cbd52e453f5b?w=700&q=85",
    auctionDate: "April",
    numAuctions: 2,
    isHot: true,
    category: "Phones",
    timeLeft: "1d 6h",
    bidsCount: 24,
  },
  {
    _id: "3",
    title: "Apple Watch Series 11",
    subtitle: "Midnight Aluminum · GPS",
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
    subtitle: "Wireless On-Ear · Blue",
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
    title: "Samsung Galaxy S25 Ultra",
    subtitle: "Titanium Black · 512GB",
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
    subtitle: "Noise Cancelling · Platinum",
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

// ── Card — wrapped in memo so parent re-renders never touch it ─
// This eliminates the flicker: card hover state is 100% local
// and never propagates up to cause a header re-render.
const AuctionCard = memo(function AuctionCard({ item }: { item: AuctionItem }) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        borderRadius: 18,
        overflow: "hidden",
        background: "#fff",
        border: `1px solid ${hovered ? "rgba(42,72,99,0.35)" : "rgba(42,72,99,0.10)"}`,
        boxShadow: hovered
          ? `0 20px 56px rgba(42,72,99,0.18), 0 4px 16px rgba(42,72,99,0.10)`
          : "0 2px 16px rgba(42,72,99,0.07)",
        transform: hovered ? "translateY(-7px)" : "translateY(0)",
        transition: "all 0.45s cubic-bezier(0.22, 1, 0.36, 1)",
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
        userSelect: "none",
      }}
    >
      {/* Promo banner */}
      <div
        style={{
          background: hovered
            ? `linear-gradient(90deg, ${NAVY2}, ${NAVY})`
            : `linear-gradient(90deg, ${NAVY}, #3a5a78)`,
          padding: "8px 0",
          textAlign: "center",
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: "0.22em",
          color: CREAM,
          textTransform: "uppercase",
          position: "relative",
          overflow: "hidden",
          transition: "background 0.4s ease",
        }}
      >
        <span style={{ position: "relative", zIndex: 1 }}>
          ✦ Apply Promo Code ✦
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
        style={{
          position: "relative",
          height: 260,
          overflow: "hidden",
          background: "#eef1f4",
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
            transition: "transform 0.65s cubic-bezier(0.25, 0.46, 0.45, 0.94)",
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
              "linear-gradient(to bottom, transparent 45%, rgba(20,35,52,0.72) 100%)",
          }}
        />

        {/* LOQTA ZONE stamp */}
        <div
          style={{
            position: "absolute",
            top: 12,
            left: 12,
            width: 56,
            height: 56,
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
              fontSize: 6.5,
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
            <span style={{ color: GOLD, fontSize: 8 }}>★★★</span>
          </span>
        </div>

        {/* Time / Hot badge */}
        <div
          style={{
            position: "absolute",
            top: 12,
            right: 12,
            background: item.isHot
              ? "rgba(160, 40, 40, 0.88)"
              : "rgba(20, 35, 52, 0.72)",
            backdropFilter: "blur(6px)",
            borderRadius: 999,
            padding: "5px 12px",
            display: "flex",
            alignItems: "center",
            gap: 5,
            fontSize: 11,
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
          style={{
            position: "absolute",
            bottom: 12,
            left: 12,
            right: 12,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div
            style={{
              background: "rgba(20,35,52,0.75)",
              backdropFilter: "blur(6px)",
              border: `1px solid rgba(229,224,198,0.25)`,
              borderRadius: 6,
              padding: "4px 10px",
              fontSize: 10,
              fontWeight: 700,
              color: CREAM,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
            }}
          >
            {item.category}
          </div>
          {item.bidsCount && (
            <div
              style={{
                background: "rgba(20,35,52,0.75)",
                backdropFilter: "blur(6px)",
                border: `1px solid rgba(229,224,198,0.18)`,
                borderRadius: 999,
                padding: "4px 10px",
                fontSize: 10,
                fontWeight: 600,
                color: CREAM2,
                letterSpacing: "0.04em",
              }}
            >
              🔨 {item.bidsCount} bids
            </div>
          )}
        </div>
      </div>

      {/* Card body */}
      <div
        style={{
          padding: "18px 20px 20px",
          display: "flex",
          flexDirection: "column",
          gap: 14,
          flex: 1,
        }}
      >
        <div>
          <h3
            style={{
              margin: 0,
              fontSize: 15,
              fontWeight: 800,
              color: NAVY,
              textTransform: "uppercase",
              letterSpacing: "0.04em",
            }}
          >
            {item.title}
          </h3>
          <p
            style={{
              margin: "4px 0 0",
              fontSize: 12,
              color: "#7a8ea0",
              fontWeight: 500,
            }}
          >
            {item.subtitle}
          </p>
        </div>

        <div
          style={{
            display: "flex",
            gap: 16,
            fontSize: 11,
            color: "#8fa0b0",
            fontWeight: 600,
            alignItems: "center",
            letterSpacing: "0.02em",
          }}
        >
          <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ opacity: 0.7 }}>📅</span> {item.auctionDate}
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ opacity: 0.7 }}>🔨</span> No. Auctions:{" "}
            {item.numAuctions}
          </span>
        </div>

        <div
          style={{
            height: 1,
            background: `linear-gradient(90deg, rgba(42,72,99,0.18), transparent)`,
          }}
        />

        {/* Price block */}
        <div
          style={{
            borderRadius: 14,
            background: hovered ? "rgba(42,72,99,0.04)" : "#f7f8fa",
            border: `1px solid rgba(42,72,99,0.10)`,
            padding: "14px 16px",
            display: "flex",
            flexDirection: "column",
            gap: 12,
            transition: "background 0.3s ease",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-end",
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 9,
                  color: "#9aabbb",
                  fontWeight: 700,
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  marginBottom: 4,
                }}
              >
                Starting From
              </div>
              <div
                style={{
                  fontSize: 21,
                  fontWeight: 900,
                  color: GOLD,
                  letterSpacing: "-0.01em",
                  lineHeight: 1,
                }}
              >
                {item.startingPrice.toLocaleString()}
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: "#b8996a",
                    marginLeft: 4,
                  }}
                >
                  {item.currency}
                </span>
              </div>
            </div>
            {item.currentBid && (
              <div style={{ textAlign: "right" }}>
                <div
                  style={{
                    fontSize: 9,
                    color: "#9aabbb",
                    fontWeight: 700,
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                    marginBottom: 4,
                  }}
                >
                  Current Bid
                </div>
                <div
                  style={{ fontSize: 14, fontWeight: 800, color: "#2d7a4f" }}
                >
                  {item.currentBid.toLocaleString()}
                  <span
                    style={{ fontSize: 10, marginLeft: 3, fontWeight: 600 }}
                  >
                    {item.currency}
                  </span>
                </div>
              </div>
            )}
          </div>

          <ShinyButton>✦ Register to Join ✦</ShinyButton>
        </div>
      </div>
    </div>
  );
});

// ── Header — fully isolated component, mirrors StatsSection ───
// once: false  →  re-animates each time the section scrolls into view
// animKey      →  forces SplitText to remount and replay on each entry
// memo         →  never re-renders from swiper/card state changes
const AuctionHeader = memo(function AuctionHeader() {
  const headerRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(headerRef, { once: false, margin: "-80px" });

  // Bump this key every time we re-enter the viewport to replay SplitText
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
        // Fixed min-height prevents layout shift during animation
        minHeight: 170,
      }}
    >
      {/* Eyebrow — gold side lines, identical to StatsSection */}
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

      {/* Line 1 — white with rotateX entry */}
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

      {/* Line 2 — gold */}
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

      {/* Subtext fades in after headline */}
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

      {/* Fully isolated header — card hover state can never reach it */}
      <AuctionHeader />

      {/* ── Swiper ──────────────────────────────────────────── */}
      <div style={{ padding: "0 20px" }}>
        <style>{`
          .lz-swiper { overflow: visible !important; }
          .lz-swiper-wrap { overflow: hidden; padding: 8px 4px 0; }
          .lz-swiper .swiper-slide { height: auto; }
          .lz-dot {
            width: 8px; height: 8px; border-radius: 4px;
            background: rgba(229,224,198,0.2);
            border: none; cursor: pointer;
            transition: width 0.2s ease, background 0.2s ease;
            padding: 0; flex-shrink: 0;
          }
          .lz-dot.active { width: 26px; background: #c9a96e; border-radius: 4px; }
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
            speed={5000}
            autoplay={{
              delay: 0,
              disableOnInteraction: false,
              pauseOnMouseEnter: true,
            }}
            allowTouchMove={true}
            freeMode={true}
            slidesPerView={2}
            spaceBetween={20}
            breakpoints={{
              0: { slidesPerView: 2, spaceBetween: 14 },
              640: { slidesPerView: 3, spaceBetween: 18 },
              900: { slidesPerView: 4, spaceBetween: 20 },
              1200: { slidesPerView: 5, spaceBetween: 22 },
            }}
          >
            {[...auctionItems, ...auctionItems].map((item, i) => (
              <SwiperSlide key={`${item._id}-${i}`}>
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
            marginTop: 28,
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
                }, 2000);
              }}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
