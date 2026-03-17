import React, { useRef, useState, useEffect, useMemo, memo } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, FreeMode } from "swiper/modules";
import { useInView } from "motion/react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import SplitText from "@/components/SplitText";
import { useAuth } from "@/store/AuthContext/AuthContext";
import { useUserJoinedProducts } from "@/hooks/useUserJoinedProducts";
import "swiper/css/free-mode";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";
import { ShinyButton } from "../ui/shiny-button";
import LoginPromptModal from "./Loginpromptmodal";
import { collection, getDocs, query, orderBy, where } from "firebase/firestore";
import { db } from "@/firebase/firebase";

const NAVY = "#2A4863";
const NAVY2 = "#1e3652";
const CREAM = "rgb(229, 224, 198)";
const CREAM2 = "rgba(229, 224, 198, 0.75)";
const GOLD = "#c9a96e";

// Refined registered palette — navy-gold, not green
const REG_BG = "#0d1a2a"; // deep navy, close to section bg
const REG_BORDER = "#c9a96e"; // gold border
const REG_BORDER_HOVER = "#e8c98a"; // lighter gold on hover
const REG_TITLE = "#e8c98a"; // warm gold title
const REG_SUBTITLE = "rgba(201,169,110,0.55)";
const REG_PRICE = "#c9a96e";
const REG_ACCENT = "rgba(201,169,110,0.18)";
const REG_ACCENT_HOVER = "rgba(201,169,110,0.26)";
const REG_RIBBON_BG = "rgba(20,12,2,0.92)";
const REG_STAMP_BORDER = "rgba(201,169,110,0.5)";
const CHECK_COLOR = "#c9a96e";

interface EnrichedProduct {
  id: string;
  title: string;
  brand: string;
  model: string;
  category: string;
  categoryName: string;
  description: string;
  price: number;
  quantity: number;
  isActive: boolean;
  images: string[];
  thumbnail: string | null;
  totalAuctions: number;
}

function usePublicProducts() {
  const [products, setProducts] = useState<EnrichedProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        setError(null);
        const [catSnap, prodSnap] = await Promise.all([
          getDocs(collection(db, "categories")),
          getDocs(
            query(
              collection(db, "products"),
              where("isActive", "==", true),
              orderBy("createdAt", "desc"),
            ),
          ),
        ]);
        if (cancelled) return;
        const categoryMap: Record<string, string> = {};
        catSnap.docs.forEach((d) => {
          categoryMap[d.id] = d.data().name?.en ?? d.id;
        });
        const enriched: EnrichedProduct[] = prodSnap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            title: data.title ?? "",
            brand: data.brand ?? "",
            model: data.model ?? "",
            category: data.category ?? "",
            categoryName: categoryMap[data.category] ?? data.category ?? "—",
            description: data.description ?? "",
            price: data.price ?? 0,
            quantity: data.quantity ?? 0,
            isActive: data.isActive ?? true,
            images: Array.isArray(data.images) ? data.images : [],
            thumbnail:
              !data.thumbnail || data.thumbnail === "null"
                ? null
                : data.thumbnail,
            totalAuctions: data.totalAuctions ?? 0,
          };
        });
        setProducts(enriched);
      } catch (err: any) {
        if (!cancelled) setError("Failed to load products");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);
  return { products, loading, error };
}

const CARD_CSS = `
  @keyframes lz-shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
  @keyframes lz-gold-pulse { 0%,100%{opacity:1;box-shadow:0 0 5px rgba(201,169,110,0.6)} 50%{opacity:.65;box-shadow:0 0 10px rgba(201,169,110,0.9)} }
  @keyframes lz-check-in { 0%{transform:scale(0) rotate(-20deg);opacity:0} 60%{transform:scale(1.2) rotate(4deg);opacity:1} 100%{transform:scale(1) rotate(0deg);opacity:1} }
  @keyframes lz-badge-glow { 0%,100%{box-shadow:0 0 0 0 rgba(201,169,110,0)} 50%{box-shadow:0 0 0 3px rgba(201,169,110,0.18)} }

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
  .lz-cat-row { bottom: 8px; left: 8px; right: 8px; }
  .lz-shiny-btn { font-size: 9px !important; padding: 7px 4px !important; }
  .lz-skel {
    background: linear-gradient(90deg, #eef1f4 25%, #e4e9ee 50%, #eef1f4 75%);
    background-size: 200% 100%;
    animation: lz-shimmer 1.5s infinite;
    border-radius: 4px;
  }

  /* ── Registered ribbon — elegant gold on near-black ── */
  .lz-reg-ribbon {
    position: absolute; top: 0; left: 0; right: 0; z-index: 4;
    display: flex; align-items: center; justify-content: center; gap: 6px;
    padding: 5px 0;
    background: ${REG_RIBBON_BG};
    backdrop-filter: blur(10px);
    border-bottom: 1px solid rgba(201,169,110,0.3);
    font-size: 8px; font-weight: 800; letter-spacing: 0.22em;
    text-transform: uppercase; color: ${GOLD};
  }
  .lz-reg-dot {
    width: 5px; height: 5px; border-radius: 50%;
    background: ${GOLD};
    animation: lz-gold-pulse 2.4s ease infinite; flex-shrink: 0;
  }

  /* ── "Registered" badge on card body ── */
  .lz-reg-pill {
    display: inline-flex; align-items: center; gap: 5px;
    padding: 3px 9px 3px 7px;
    background: rgba(201,169,110,0.1);
    border: 1px solid rgba(201,169,110,0.3);
    border-radius: 999px;
    font-size: 8px; font-weight: 800; letter-spacing: 0.18em;
    color: ${GOLD}; text-transform: uppercase;
    animation: lz-badge-glow 3s ease infinite;
  }
  .lz-reg-check {
    width: 13px; height: 13px; border-radius: 50%;
    background: ${GOLD}; display: flex; align-items: center; justify-content: center;
    font-size: 7px; color: #0d1a2a; font-weight: 900;
    animation: lz-check-in 0.5s cubic-bezier(0.34,1.56,0.64,1) both;
    flex-shrink: 0;
  }

  /* ── View sessions button ── */
  .lz-reg-btn {
    width: 100%; height: 36px; border-radius: 8px; cursor: pointer;
    background: rgba(201,169,110,0.1);
    border: 1px solid rgba(201,169,110,0.35);
    color: ${GOLD}; font-size: 9px !important; font-weight: 800;
    letter-spacing: 0.14em; text-transform: uppercase;
    display: flex; align-items: center; justify-content: center; gap: 6px;
    transition: all 0.3s cubic-bezier(0.22,1,0.36,1); font-family: inherit;
  }
  .lz-reg-btn:hover {
    background: rgba(201,169,110,0.18);
    border-color: rgba(201,169,110,0.65);
    transform: translateY(-1px);
    box-shadow: 0 6px 20px rgba(201,169,110,0.12);
  }
  .lz-reg-arrow { font-size: 11px; transition: transform 0.2s ease; }
  .lz-reg-btn:hover .lz-reg-arrow { transform: translateX(3px); }

  @media (min-width: 640px) {
    .lz-card-img { height: 220px; } .lz-card-title { font-size: 13px; } .lz-card-subtitle { font-size: 11px; }
    .lz-card-meta { display: flex !important; } .lz-card-price-label { font-size: 9px; } .lz-card-price-value { font-size: 19px; }
    .lz-card-bid-label { font-size: 9px; } .lz-card-bid-value { font-size: 13px; }
    .lz-card-body { padding: 14px 14px 16px; gap: 11px; } .lz-card-price-block { padding: 12px 12px; gap: 10px; }
    .lz-card-banner { font-size: 9px; padding: 7px 0; letter-spacing: 0.18em; }
    .lz-card-stamp { width: 48px; height: 48px; top: 10px; left: 10px; }
    .lz-card-stamp span { font-size: 6px !important; } .lz-card-stamp .lz-stamp-stars { font-size: 7px !important; }
    .lz-card-badge { font-size: 10px; padding: 4px 10px; top: 10px; right: 10px; }
    .lz-card-cat { font-size: 9px; padding: 3px 9px; } .lz-cat-row { bottom: 10px; left: 10px; right: 10px; }
    .lz-shiny-btn { font-size: 10px !important; padding: 9px 6px !important; }
    .lz-reg-ribbon { font-size: 9px; padding: 6px 0; } .lz-reg-btn { height: 38px; font-size: 10px !important; }
    .lz-reg-pill { font-size: 9px; padding: 3px 10px 3px 8px; }
    .lz-reg-check { width: 14px; height: 14px; font-size: 8px; }
  }
  @media (min-width: 900px) {
    .lz-card-img { height: 240px; } .lz-card-title { font-size: 15px; } .lz-card-subtitle { font-size: 12px; }
    .lz-card-price-value { font-size: 21px; } .lz-card-bid-value { font-size: 14px; }
    .lz-card-body { padding: 18px 20px 20px; gap: 14px; } .lz-card-price-block { padding: 14px 16px; gap: 12px; }
    .lz-card-banner { font-size: 10px; padding: 8px 0; letter-spacing: 0.22em; }
    .lz-card-stamp { width: 56px; height: 56px; top: 12px; left: 12px; }
    .lz-card-stamp span { font-size: 6.5px !important; } .lz-card-stamp .lz-stamp-stars { font-size: 8px !important; }
    .lz-card-badge { font-size: 11px; padding: 5px 12px; top: 12px; right: 12px; }
    .lz-card-cat { font-size: 10px; padding: 4px 10px; } .lz-cat-row { bottom: 12px; left: 12px; right: 12px; }
    .lz-shiny-btn { font-size: 11px !important; padding: 10px 8px !important; }
    .lz-reg-ribbon { font-size: 10px; } .lz-reg-btn { height: 40px; }
    .lz-reg-pill { font-size: 10px; }
  }
`;

const SkeletonCard = () => (
  <div
    style={{
      borderRadius: 14,
      overflow: "hidden",
      background: "#fff",
      border: `1px solid rgba(42,72,99,0.10)`,
      boxShadow: "0 2px 16px rgba(42,72,99,0.07)",
      display: "flex",
      flexDirection: "column",
      width: "100%",
      height: "100%",
    }}
  >
    <div
      className="lz-card-banner"
      style={{
        background: `linear-gradient(90deg, ${NAVY}, #3a5a78)`,
        opacity: 0.45,
      }}
    />
    <div
      className="lz-card-img lz-skel"
      style={{ flexShrink: 0, borderRadius: 0 }}
    />
    <div
      className="lz-card-body"
      style={{ display: "flex", flexDirection: "column", flex: 1 }}
    >
      <div
        style={{
          minHeight: 52,
          flexShrink: 0,
          display: "flex",
          flexDirection: "column",
          gap: 7,
        }}
      >
        <div className="lz-skel" style={{ height: 14, width: "72%" }} />
        <div className="lz-skel" style={{ height: 10, width: "44%" }} />
      </div>
      <div
        className="lz-card-meta"
        style={{ minHeight: 18, flexShrink: 0, alignItems: "center" }}
      >
        <div className="lz-skel" style={{ height: 10, width: "38%" }} />
      </div>
      <div
        style={{
          height: 1,
          background: `linear-gradient(90deg, rgba(42,72,99,0.18), transparent)`,
          flexShrink: 0,
        }}
      />
      <div
        className="lz-card-price-block"
        style={{
          borderRadius: 10,
          background: "#f7f8fa",
          border: "1px solid rgba(42,72,99,0.10)",
          display: "flex",
          flexDirection: "column",
          flex: 1,
          justifyContent: "space-between",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            marginBottom: 8,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <div className="lz-skel" style={{ height: 8, width: 40 }} />
            <div className="lz-skel" style={{ height: 20, width: 72 }} />
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 5,
              alignItems: "flex-end",
            }}
          >
            <div className="lz-skel" style={{ height: 8, width: 44 }} />
            <div className="lz-skel" style={{ height: 13, width: 24 }} />
          </div>
        </div>
        <div
          className="lz-skel"
          style={{ height: 34, borderRadius: 8, width: "100%" }}
        />
      </div>
    </div>
  </div>
);

const AuctionCard = memo(function AuctionCard({
  item,
  isJoined,
  isLoggedIn,
  onRegisterClick,
  t,
}: {
  item: EnrichedProduct;
  isJoined: boolean;
  isLoggedIn: boolean;
  onRegisterClick: () => void;
  t: (key: string) => string;
}) {
  const [hovered, setHovered] = useState(false);
  const displayImage =
    item.thumbnail && item.thumbnail !== "null"
      ? item.thumbnail
      : (item.images?.[0] ?? null);

  return (
    <div
      dir="ltr"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        borderRadius: 14,
        overflow: "hidden",
        // Registered: stays on the dark section bg, gold border signals premium status
        background: isJoined ? REG_BG : "#fff",
        border: isJoined
          ? `1.5px solid ${hovered ? REG_BORDER_HOVER : REG_BORDER}`
          : `1px solid ${hovered ? "rgba(42,72,99,0.35)" : "rgba(42,72,99,0.10)"}`,
        boxShadow: isJoined
          ? hovered
            ? `0 20px 48px rgba(201,169,110,0.14), 0 4px 16px rgba(201,169,110,0.07), inset 0 0 0 1px rgba(201,169,110,0.05)`
            : `0 4px 20px rgba(201,169,110,0.07), inset 0 0 0 1px rgba(201,169,110,0.03)`
          : hovered
            ? "0 20px 56px rgba(42,72,99,0.18), 0 4px 16px rgba(42,72,99,0.10)"
            : "0 2px 16px rgba(42,72,99,0.07)",
        transform: hovered ? "translateY(-5px)" : "translateY(0)",
        transition: "all 0.45s cubic-bezier(0.22, 1, 0.36, 1)",
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
        userSelect: "none",
        width: "100%",
        height: "100%",
      }}
    >
      {/* Top banner: promo code for unregistered, nothing for registered (ribbon replaces it) */}
      {!isJoined && (
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
            {t("auctionSwiper.promoCode")}
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
      )}

      {/* Image area */}
      <div
        className="lz-card-img"
        style={{
          position: "relative",
          overflow: "hidden",
          background: isJoined ? "#0a1420" : "#eef1f4",
          flexShrink: 0,
        }}
      >
        {/* Registered ribbon — replaces the harsh full-green top bar */}
        {isJoined && (
          <div className="lz-reg-ribbon">
            <div className="lz-reg-dot" />
            {t("auctionSwiper.registered") || "Registered"}
          </div>
        )}

        {displayImage ? (
          <img
            src={displayImage}
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
              // Registered: subtle sepia/desaturate tint — not dark green wash
              filter: isJoined
                ? "brightness(0.7) saturate(0.6) sepia(0.15)"
                : "none",
            }}
            onError={(e) => {
              (e.target as HTMLImageElement).src = "/fallback.jpg";
            }}
          />
        ) : (
          <div
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: isJoined
                ? `linear-gradient(135deg, rgba(201,169,110,0.07), rgba(201,169,110,0.02))`
                : `linear-gradient(135deg, ${NAVY}18, ${NAVY}08)`,
            }}
          >
            <span
              style={{
                fontSize: 42,
                fontWeight: 900,
                color: isJoined ? "rgba(201,169,110,0.2)" : `${NAVY}30`,
                textTransform: "uppercase",
              }}
            >
              {item.title.charAt(0)}
            </span>
          </div>
        )}

        {/* Gradient overlay */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: isJoined
              ? "linear-gradient(to bottom, transparent 30%, rgba(8,16,26,0.85) 100%)"
              : "linear-gradient(to bottom, transparent 40%, rgba(20,35,52,0.75) 100%)",
          }}
        />

        {/* Stamp */}
        <div
          className="lz-card-stamp"
          style={{
            position: "absolute",
            borderRadius: "50%",
            background: isJoined
              ? `linear-gradient(135deg, #1a1208, #0d0a05)`
              : `linear-gradient(135deg, ${NAVY}, ${NAVY2})`,
            border: `2px dashed ${isJoined ? REG_STAMP_BORDER : CREAM2}`,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: isJoined
              ? "0 4px 14px rgba(201,169,110,0.15)"
              : "0 4px 14px rgba(0,0,0,0.35)",
            transform: hovered
              ? "rotate(10deg) scale(1.08)"
              : "rotate(0deg) scale(1)",
            transition: "transform 0.45s cubic-bezier(0.34, 1.56, 0.64, 1)",
          }}
        >
          <span
            style={{
              fontWeight: 900,
              color: isJoined ? GOLD : CREAM,
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

        {/* Badge */}
        <div
          className="lz-card-badge"
          style={{
            position: "absolute",
            background: "rgba(20, 35, 52, 0.72)",
            backdropFilter: "blur(6px)",
            borderRadius: 999,
            display: "flex",
            alignItems: "center",
            gap: 4,
            fontWeight: 700,
            color: CREAM2,
            letterSpacing: "0.04em",
            border: `1px solid rgba(229,224,198,0.2)`,
          }}
        >
          <span>🔨 {item.totalAuctions}</span>
        </div>

        {/* Category */}
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
            {item.categoryName}
          </div>
        </div>
      </div>

      {/* Body */}
      <div
        className="lz-card-body"
        style={{ display: "flex", flexDirection: "column", flex: 1 }}
      >
        {/* Title row — registered badge sits here */}
        <div style={{ minHeight: 52, flexShrink: 0 }}>
          {isJoined && (
            <div style={{ marginBottom: 5 }}>
              <span className="lz-reg-pill">
                <span className="lz-reg-check">✓</span>
                {t("auctionSwiper.registeredLabel") || "Registered"}
              </span>
            </div>
          )}
          <h3
            className="lz-card-title"
            style={{
              margin: 0,
              fontWeight: 800,
              color: isJoined ? REG_TITLE : NAVY,
              textTransform: "uppercase",
              letterSpacing: "0.03em",
              lineHeight: 1.2,
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
              color: isJoined ? REG_SUBTITLE : "#7a8ea0",
              fontWeight: 500,
              lineHeight: 1.3,
              display: "-webkit-box",
              WebkitLineClamp: 1,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            · {item.model}
          </p>
        </div>

        {/* Meta (brand) */}
        <div
          className="lz-card-meta"
          style={{
            gap: 10,
            color: isJoined ? "rgba(201,169,110,0.4)" : "#8fa0b0",
            fontWeight: 600,
            alignItems: "center",
            fontSize: 10,
            minHeight: 18,
            flexShrink: 0,
          }}
        >
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ opacity: 0.7 }}>🏷️</span> {item.brand}
          </span>
        </div>

        {/* Divider */}
        <div
          style={{
            height: 1,
            background: isJoined
              ? "linear-gradient(90deg, rgba(201,169,110,0.25), transparent)"
              : "linear-gradient(90deg, rgba(42,72,99,0.18), transparent)",
            flexShrink: 0,
          }}
        />

        {/* Price block */}
        <div
          className="lz-card-price-block"
          style={{
            borderRadius: 10,
            background: isJoined
              ? hovered
                ? REG_ACCENT_HOVER
                : REG_ACCENT
              : hovered
                ? "rgba(42,72,99,0.04)"
                : "#f7f8fa",
            border: isJoined
              ? `1px solid rgba(201,169,110,0.18)`
              : `1px solid rgba(42,72,99,0.10)`,
            display: "flex",
            flexDirection: "column",
            transition: "background 0.3s ease",
            flex: 1,
            justifyContent: "space-between",
          }}
        >
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
                  color: isJoined ? "rgba(201,169,110,0.4)" : "#9aabbb",
                  fontWeight: 700,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  marginBottom: 2,
                }}
              >
                {t("auctionSwiper.from")}
              </div>
              <div
                className="lz-card-price-value"
                style={{
                  fontWeight: 900,
                  color: isJoined ? REG_PRICE : GOLD,
                  letterSpacing: "-0.01em",
                  lineHeight: 1,
                }}
              >
                {item.price.toLocaleString()}
                <span
                  style={{
                    fontSize: "0.55em",
                    fontWeight: 600,
                    color: isJoined ? "rgba(201,169,110,0.5)" : "#b8996a",
                    marginLeft: 3,
                  }}
                >
                  EGP
                </span>
              </div>
            </div>
            {item.totalAuctions > 0 && (
              <div style={{ textAlign: "right" }}>
                <div
                  className="lz-card-bid-label"
                  style={{
                    color: isJoined ? "rgba(201,169,110,0.4)" : "#9aabbb",
                    fontWeight: 700,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    marginBottom: 2,
                  }}
                >
                  Auctions
                </div>
                <div
                  className="lz-card-bid-value"
                  style={{
                    fontWeight: 800,
                    color: isJoined ? GOLD : NAVY,
                  }}
                >
                  ×{item.totalAuctions}
                </div>
              </div>
            )}
          </div>

          {/* CTA buttons */}
          {isJoined ? (
            <button className="lz-reg-btn" onClick={onRegisterClick}>
              <span>✓</span>
              <span>
                {t("auctionSwiper.viewSessions") || "View My Sessions"}
              </span>
              <span className="lz-reg-arrow">→</span>
            </button>
          ) : (
            <ShinyButton
              className="lz-shiny-btn w-full !rounded-lg"
              onClick={onRegisterClick}
            >
              {isLoggedIn
                ? t("auctionSwiper.joinNow") || "✦ JOIN NOW ✦"
                : t("auctionSwiper.registerToJoin")}
            </ShinyButton>
          )}
        </div>
      </div>
    </div>
  );
});

const AuctionHeader = memo(function AuctionHeader() {
  const headerRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(headerRef, { once: false, margin: "-80px" });
  const [animKey, setAnimKey] = useState(0);
  const wasInView = useRef(false);
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === "ar";
  useEffect(() => {
    if (isInView && !wasInView.current) {
      setAnimKey((k) => k + 1);
      wasInView.current = true;
    } else if (!isInView) {
      wasInView.current = false;
    }
  }, [isInView]);
  useEffect(() => {
    setAnimKey((k) => k + 1);
  }, [i18n.language]);

  return (
    <div
      ref={headerRef}
      dir={isArabic ? "rtl" : "ltr"}
      style={{
        textAlign: "center",
        marginBottom: 52,
        padding: "0 24px",
        position: "relative",
        zIndex: 1,
        minHeight: 170,
      }}
    >
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
          {t("auctionSwiper.eyebrow")}
        </span>
        <div
          style={{
            width: 32,
            height: 1,
            background: `linear-gradient(90deg, ${GOLD}, transparent)`,
          }}
        />
      </div>
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
          text={t("auctionSwiper.titleLine1")}
          tag="h2"
          className=""
          splitType={isArabic ? "words" : "chars"}
          duration={1.0}
          delay={isArabic ? 80 : 30}
          ease="power3.out"
          from={{ opacity: 0, y: 40, rotateX: -20 }}
          to={{ opacity: 1, y: 0, rotateX: 0 }}
        />
      </div>
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
          text={t("auctionSwiper.titleLine2")}
          tag="h2"
          className=""
          splitType={isArabic ? "words" : "chars"}
          duration={1.0}
          delay={isArabic ? 80 : 30}
          ease="power3.out"
          from={{ opacity: 0, y: 40 }}
          to={{ opacity: 1, y: 0 }}
        />
      </div>
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
        {t("auctionSwiper.subtitle")}
      </p>
    </div>
  );
});

const SwiperSection = memo(function SwiperSection({
  products,
  joinedProductIds,
  isLoggedIn,
  t,
  onRegisterClick,
}: {
  products: EnrichedProduct[];
  joinedProductIds: Set<string>;
  isLoggedIn: boolean;
  t: (key: string) => string;
  onRegisterClick: (id: string) => void;
}) {
  const swiperRef = useRef<any>(null);
  const [activeIdx, setActiveIdx] = useState(0);
  const resumeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loopedProducts = useMemo(
    () => (products.length > 0 ? [...products, ...products] : []),
    [products],
  );

  if (products.length === 0)
    return (
      <div
        style={{
          textAlign: "center",
          padding: "60px 20px",
          color: "rgba(229,224,198,0.4)",
        }}
      >
        <div style={{ fontSize: 48, marginBottom: 12 }}>🔨</div>
        <p style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>
          No products available yet
        </p>
      </div>
    );

  return (
    <>
      <style>{`.lz-swiper{overflow:visible!important}.lz-swiper-wrap{overflow:hidden;padding:8px 4px 4px}.lz-swiper .swiper-slide{height:auto}.lz-dot{width:8px;height:8px;border-radius:4px;background:rgba(229,224,198,0.2);border:none;cursor:pointer;transition:width .2s ease,background .2s ease;padding:0;flex-shrink:0}.lz-dot.active{width:26px;background:#c9a96e}.lz-dot:hover:not(.active){background:rgba(229,224,198,0.4)}`}</style>
      <div dir="ltr" className="lz-swiper-wrap">
        <Swiper
          className="lz-swiper"
          modules={[Autoplay, FreeMode]}
          onSwiper={(s) => {
            swiperRef.current = s;
          }}
          onSlideChange={(s) => setActiveIdx(s.realIndex % products.length)}
          loop={products.length > 2}
          speed={4000}
          autoplay={{
            delay: 0,
            disableOnInteraction: false,
            pauseOnMouseEnter: true,
          }}
          allowTouchMove={true}
          freeMode={true}
          dir="ltr"
          breakpoints={{
            0: { slidesPerView: 2, spaceBetween: 10 },
            640: { slidesPerView: 3, spaceBetween: 14 },
            900: { slidesPerView: 4, spaceBetween: 18 },
            1200: { slidesPerView: 5, spaceBetween: 20 },
          }}
        >
          {loopedProducts.map((item, i) => (
            <SwiperSlide
              key={`${item.id}-${i}`}
              style={{ height: "auto", display: "flex" }}
            >
              <AuctionCard
                item={item}
                isJoined={joinedProductIds.has(item.id)}
                isLoggedIn={isLoggedIn}
                onRegisterClick={() => onRegisterClick(item.id)}
                t={t}
              />
            </SwiperSlide>
          ))}
        </Swiper>
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          gap: 8,
          marginTop: 24,
        }}
      >
        {products.map((_, i) => (
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
    </>
  );
});

export default function AuctionSwiper() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [modalOpen, setModalOpen] = useState(false);
  const { products, loading, error } = usePublicProducts();
  const { joinedProductIds } = useUserJoinedProducts();

  const handleRegisterClick = (productId: string) => {
    if (user) navigate(`/auctions/register/${productId}`);
    else setModalOpen(true);
  };

  return (
    <section
      dir="ltr"
      style={{
        background: `linear-gradient(180deg, #0a0a1a 0%, #0d1b2a 50%, #0a0a1a 100%)`,
        padding: "72px 0 88px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <style>{CARD_CSS}</style>
      <LoginPromptModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onGoToLogin={() => {
          setModalOpen(false);
          navigate("/login");
        }}
      />
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
      <div style={{ padding: "0 12px" }}>
        {error && !loading && (
          <div
            style={{
              textAlign: "center",
              padding: "40px 20px",
              color: "rgba(229,224,198,0.5)",
              fontSize: 14,
            }}
          >
            {error}
          </div>
        )}
        {loading && (
          <div style={{ overflow: "hidden", padding: "8px 4px 4px" }}>
            <style>{`@media(min-width:640px){.lz-skel-grid{grid-template-columns:repeat(3,1fr)!important;gap:14px!important}}@media(min-width:900px){.lz-skel-grid{grid-template-columns:repeat(4,1fr)!important;gap:18px!important}}@media(min-width:1200px){.lz-skel-grid{grid-template-columns:repeat(5,1fr)!important;gap:20px!important}}`}</style>
            <div
              className="lz-skel-grid"
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, 1fr)",
                gap: 10,
              }}
            >
              {Array.from({ length: 5 }).map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          </div>
        )}
        {!loading && (
          <SwiperSection
            products={products}
            joinedProductIds={joinedProductIds}
            isLoggedIn={!!user}
            t={t}
            onRegisterClick={handleRegisterClick}
          />
        )}
      </div>
    </section>
  );
}
