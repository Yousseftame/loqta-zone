import React, { useRef, useState, useEffect, useMemo, memo, useCallback } from "react";
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
import {
  collection,
  getDocs,
  query,
  orderBy,
  where,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/firebase/firebase";

const NAVY = "#2A4863";
const NAVY2 = "#1e3652";
const CREAM = "rgb(229, 224, 198)";
const CREAM2 = "rgba(229, 224, 198, 0.75)";
const GOLD = "#c9a96e";

const REG_BG = "#0d1a2a";
const REG_BORDER = "#c9a96e";
const REG_BORDER_HOVER = "#e8c98a";
const REG_TITLE = "#e8c98a";
const REG_SUBTITLE = "rgba(201,169,110,0.55)";
const REG_PRICE = "#c9a96e";
const REG_ACCENT = "rgba(201,169,110,0.18)";
const REG_ACCENT_HOVER = "rgba(201,169,110,0.26)";
const REG_RIBBON_BG = "rgba(20,12,2,0.92)";
const REG_STAMP_BORDER = "rgba(201,169,110,0.5)";

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
  activeAuctionCount: number;
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
        const [catSnap, prodSnap, auctSnap] = await Promise.all([
          getDocs(collection(db, "categories")),
          getDocs(
            query(
              collection(db, "products"),
              where("isActive", "==", true),
              orderBy("createdAt", "desc"),
            ),
          ),
          getDocs(
            query(collection(db, "auctions"), where("isActive", "==", true)),
          ),
        ]);
        if (cancelled) return;

        const categoryMap: Record<string, string> = {};
        catSnap.docs.forEach((d) => {
          categoryMap[d.id] = d.data().name?.en ?? d.id;
        });

        const now = new Date();
        const activeCountMap: Record<string, number> = {};
        auctSnap.docs.forEach((d) => {
          const data = d.data();
          const productId: string = data.productId ?? "";
          if (!productId) return;
          const endTime: Date =
            data.endTime instanceof Timestamp
              ? data.endTime.toDate()
              : new Date(data.endTime);
          if (endTime > now) {
            activeCountMap[productId] = (activeCountMap[productId] ?? 0) + 1;
          }
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
            activeAuctionCount: activeCountMap[d.id] ?? 0,
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
    return () => { cancelled = true; };
  }, []);
  return { products, loading, error };
}

const CARD_CSS = `
  @keyframes lz-shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
  @keyframes lz-gold-pulse { 0%,100%{opacity:1} 50%{opacity:.65} }
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

  /* Card hover — CSS only, no JS state */
  .lz-card-wrap {
    border-radius: 14px;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;
    cursor: pointer;
    user-select: none;
    will-change: transform;
    transition: transform 0.35s cubic-bezier(0.22,1,0.36,1), box-shadow 0.35s cubic-bezier(0.22,1,0.36,1), border-color 0.35s ease;
  }
  .lz-card-wrap:hover { transform: translateY(-5px); }
  .lz-card-wrap.default { background:#fff; border:1px solid rgba(42,72,99,0.10); box-shadow:0 2px 16px rgba(42,72,99,0.07); }
  .lz-card-wrap.default:hover { border-color:rgba(42,72,99,0.35); box-shadow:0 20px 56px rgba(42,72,99,0.18), 0 4px 16px rgba(42,72,99,0.10); }
  .lz-card-wrap.registered { background:${REG_BG}; border:1.5px solid ${REG_BORDER}; box-shadow:0 4px 20px rgba(201,169,110,0.07); }
  .lz-card-wrap.registered:hover { border-color:${REG_BORDER_HOVER}; box-shadow:0 20px 48px rgba(201,169,110,0.14), 0 4px 16px rgba(201,169,110,0.07); }

  /* Image zoom — CSS only */
  .lz-img-inner { width:100%;height:100%;object-fit:cover;object-position:center;display:block;transition:transform 0.55s cubic-bezier(0.25,0.46,0.45,0.94); }
  .lz-card-wrap:hover .lz-img-inner { transform:scale(1.05); }

  /* Price block hover — CSS only */
  .lz-price-block-default { background:#f7f8fa; transition:background 0.3s ease; }
  .lz-card-wrap:hover .lz-price-block-default { background:rgba(42,72,99,0.04); }
  .lz-price-block-registered { background:${REG_ACCENT}; transition:background 0.3s ease; }
  .lz-card-wrap:hover .lz-price-block-registered { background:${REG_ACCENT_HOVER}; }

  /* Banner shimmer — CSS only */
  .lz-banner-shimmer { position:absolute;inset:0;background:linear-gradient(90deg,transparent,rgba(229,224,198,0.18),transparent);transform:translateX(-100%);transition:transform 0.7s ease; }
  .lz-card-wrap:hover .lz-banner-shimmer { transform:translateX(200%); }

  /* Stamp rotate — CSS only */
  .lz-stamp-inner { transition:transform 0.45s cubic-bezier(0.34,1.56,0.64,1); }
  .lz-card-wrap:hover .lz-stamp-inner { transform:rotate(10deg) scale(1.08); }

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
  .lz-reg-btn {
    width: 100%; height: 36px; border-radius: 8px; cursor: pointer;
    background: rgba(201,169,110,0.1);
    border: 1px solid rgba(201,169,110,0.35);
    color: ${GOLD}; font-size: 9px !important; font-weight: 800;
    letter-spacing: 0.14em; text-transform: uppercase;
    display: flex; align-items: center; justify-content: center; gap: 6px;
    transition: background 0.3s, border-color 0.3s, transform 0.3s, box-shadow 0.3s; font-family: inherit;
  }
  .lz-reg-btn:hover { background:rgba(201,169,110,0.18); border-color:rgba(201,169,110,0.65); transform:translateY(-1px); box-shadow:0 6px 20px rgba(201,169,110,0.12); }
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
    <div className="lz-card-banner" style={{ background: `linear-gradient(90deg, ${NAVY}, #3a5a78)`, opacity: 0.45 }} />
    <div className="lz-card-img lz-skel" style={{ flexShrink: 0, borderRadius: 0 }} />
    <div className="lz-card-body" style={{ display: "flex", flexDirection: "column", flex: 1 }}>
      <div style={{ minHeight: 52, flexShrink: 0, display: "flex", flexDirection: "column", gap: 7 }}>
        <div className="lz-skel" style={{ height: 14, width: "72%" }} />
        <div className="lz-skel" style={{ height: 10, width: "44%" }} />
      </div>
      <div className="lz-card-meta" style={{ minHeight: 18, flexShrink: 0, alignItems: "center" }}>
        <div className="lz-skel" style={{ height: 10, width: "38%" }} />
      </div>
      <div style={{ height: 1, background: `linear-gradient(90deg, rgba(42,72,99,0.18), transparent)`, flexShrink: 0 }} />
      <div
        className="lz-card-price-block"
        style={{ borderRadius: 10, background: "#f7f8fa", border: "1px solid rgba(42,72,99,0.10)", display: "flex", flexDirection: "column", flex: 1, justifyContent: "space-between" }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 8 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <div className="lz-skel" style={{ height: 8, width: 40 }} />
            <div className="lz-skel" style={{ height: 20, width: 72 }} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 5, alignItems: "flex-end" }}>
            <div className="lz-skel" style={{ height: 8, width: 44 }} />
            <div className="lz-skel" style={{ height: 13, width: 24 }} />
          </div>
        </div>
        <div className="lz-skel" style={{ height: 34, borderRadius: 8, width: "100%" }} />
      </div>
    </div>
  </div>
);

// ─── AuctionCard: zero JS hover state — all transitions via CSS classes ───────
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
  const displayImage =
    item.thumbnail && item.thumbnail !== "null"
      ? item.thumbnail
      : (item.images?.[0] ?? null);

  return (
    <div
      dir="ltr"
      className={`lz-card-wrap ${isJoined ? "registered" : "default"}`}
    >
      {/* Top banner */}
      {!isJoined && (
        <div
          className="lz-card-banner"
          style={{
            background: `linear-gradient(90deg, ${NAVY}, #3a5a78)`,
            textAlign: "center",
            fontWeight: 700,
            fontSize:11,
            color: CREAM,
            textTransform: "uppercase",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <span style={{ position: "relative", zIndex: 1 }}>
            {t("auctionSwiper.promoCode")}
          </span>
          <div className="lz-banner-shimmer" />
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
        {isJoined && (
          <div className="lz-reg-ribbon">
            <div className="   text-[14px] lz-reg-dot" />
            {t("auctionSwiper.registered") || "Registered"}
          </div>
        )}

        {displayImage ? (
          <img
            src={displayImage}
            alt={item.title}
            className="lz-img-inner"
            loading="lazy"
            decoding="async"
            style={{
              filter: isJoined ? "brightness(0.7) saturate(0.6) sepia(0.15)" : "none",
            }}
            onError={(e) => { (e.target as HTMLImageElement).src = "/fallback.jpg"; }}
          />
        ) : (
          <div
            style={{
              width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center",
              background: isJoined
                ? `linear-gradient(135deg, rgba(201,169,110,0.07), rgba(201,169,110,0.02))`
                : `linear-gradient(135deg, ${NAVY}18, ${NAVY}08)`,
            }}
          >
            <span style={{ fontSize: 42, fontWeight: 900, color: isJoined ? "rgba(201,169,110,0.2)" : `${NAVY}30`, textTransform: "uppercase" }}>
              {item.title.charAt(0)}
            </span>
          </div>
        )}

        {/* Gradient overlay */}
        <div
          style={{
            position: "absolute", inset: 0,
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
            background: isJoined ? `linear-gradient(135deg, #1a1208, #0d0a05)` : `linear-gradient(135deg, ${NAVY}, ${NAVY2})`,
            border: `2px dashed ${isJoined ? REG_STAMP_BORDER : CREAM2}`,
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            boxShadow: isJoined ? "0 4px 14px rgba(201,169,110,0.15)" : "0 4px 14px rgba(0,0,0,0.35)",
            ...(isJoined && { top: "calc(30px + 8px)" }),
          }}
        >
          {/* Inner wrapper gets the CSS hover transform */}
          <div className="lz-stamp-inner" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
            <span
              style={{
                fontWeight: 900, color: isJoined ? GOLD : CREAM, textAlign: "center",
                lineHeight: 1.4, letterSpacing: "0.05em", textTransform: "uppercase",
              }}
            >
              LOQTA<br />ZONE<br />
              <span className="lz-stamp-stars" style={{ color: GOLD }}>★★★</span>
            </span>
          </div>
        </div>

        {/* Badge */}
        <div
          className="lz-card-badge"
          style={{
            position: "absolute",
            background: "rgba(20, 35, 52, 0.72)",
            backdropFilter: "blur(6px)",
            borderRadius: 999,
            display: "flex", alignItems: "center", gap: 4,
            fontWeight: 700, color: CREAM2, letterSpacing: "0.04em",
            border: `1px solid rgba(229,224,198,0.2)`,
            ...(isJoined && { top: "calc(30px + 8px)" }),
          }}
        >
          <span>🔨 {item.activeAuctionCount}</span>
        </div>

        {/* Category */}
        <div className="lz-cat-row" style={{ position: "absolute", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 4 }}>
          <div
            className="lz-card-cat"
            style={{
              background: "rgba(20,35,52,0.80)", backdropFilter: "blur(6px)",
              border: `1px solid rgba(229,224,198,0.25)`, borderRadius: 5,
              fontWeight: 700, color: CREAM, letterSpacing: "0.1em",
              textTransform: "uppercase", whiteSpace: "nowrap",
            }}
          >
            {item.categoryName}
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="lz-card-body" style={{ display: "flex", flexDirection: "column", flex: 1 }}>
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
              margin: 0, fontWeight: 800, color: isJoined ? REG_TITLE : NAVY,
              fontSize:14,
              textTransform: "uppercase", letterSpacing: "0.03em", lineHeight: 1.2,
              display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
            }}
          >
            {item.title}
          </h3>
          <p
            className="lz-card-subtitle"
            style={{
              margin: "3px 0 0", color: isJoined ? REG_SUBTITLE : "#7a8ea0",
              fontWeight: 500, lineHeight: 1.3,fontSize :11,
              display: "-webkit-box", WebkitLineClamp: 1, WebkitBoxOrient: "vertical", overflow: "hidden",
            }}
          >
            · {item.model}
          </p>
        </div>

        <div
          className="lz-card-meta"
          style={{ gap: 10, color: isJoined ? "rgba(201,169,110,0.4)" : "#8fa0b0", fontWeight: 600, alignItems: "center", fontSize: 14, minHeight: 18, flexShrink: 0 }}
        >
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ opacity: 0.7 }}>🏷️</span> {item.brand}
          </span>
        </div>

        <div style={{ height: 1, background: isJoined ? "linear-gradient(90deg, rgba(201,169,110,0.25), transparent)" : "linear-gradient(90deg, rgba(42,72,99,0.18), transparent)", flexShrink: 0 }} />

        {/* Price block */}
        <div
          className={`lz-card-price-block ${isJoined ? "lz-price-block-registered" : "lz-price-block-default"}`}
          style={{
            borderRadius: 10,
            border: isJoined ? `1px solid rgba(201,169,110,0.18)` : `1px solid rgba(42,72,99,0.10)`,
            display: "flex", flexDirection: "column", flex: 1, justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 8 }}>
            <div>
              <div
                className="lz-card-price-label"
                style={{ color: isJoined ? "rgba(201,169,110,0.4)" : "#9aabbb", fontWeight: 700, fontSize:13 , letterSpacing: "0.04em", textTransform: "uppercase", marginBottom: 2 }}
              >
                {t("auctionSwiper.from")}
              </div>
              <div
                className="lz-card-price-value"
                style={{ fontWeight: 900, color: isJoined ? REG_PRICE : GOLD, letterSpacing: "-0.01em", lineHeight: 1 }}
              >
                {item.price.toLocaleString()}
                <span style={{ fontSize: "0.55em", fontWeight: 600, color: isJoined ? "rgba(201,169,110,0.5)" : "#b8996a", marginLeft: 3 }}>
                  EGP
                </span>
              </div>
            </div>
            {item.activeAuctionCount > 0 && (
              <div style={{ textAlign: "right" }}>
                <div
                  className="lz-card-bid-label"
                  style={{ color: isJoined ? "rgba(201,169,110,0.4)" : "#9aabbb", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 2 }}
                >
                  Auctions
                </div>
                <div className="lz-card-bid-value" style={{ fontWeight: 800, color: isJoined ? GOLD : NAVY }}>
                  ×{item.activeAuctionCount}
                </div>
              </div>
            )}
          </div>

          {isJoined ? (
            <button className="lz-reg-btn" onClick={onRegisterClick}>
              <span   className=" text-[15px]">{t("auctionSwiper.viewSessions") || "View My Sessions"}</span>
              <span className="lz-reg-arrow">→</span>
            </button>
          ) : (
            <ShinyButton className="lz-shiny-btn w-full !rounded-lg" onClick={onRegisterClick}>
              {isLoggedIn ? t("auctionSwiper.joinNow") || "✦ JOIN NOW ✦" : t("auctionSwiper.registerToJoin")}
            </ShinyButton>
          )}
        </div>
      </div>
    </div>
  );
});

// ─── Header: once:true so it only animates on first entry ─────────────────────
const AuctionHeader = memo(function AuctionHeader() {
  const headerRef = useRef<HTMLDivElement>(null);
  // once:true = animate in once, never re-trigger on scroll
  const isInView = useInView(headerRef, { once: true, margin: "-80px" });
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === "ar";

  // animKey only for language changes, not scroll
  const [animKey, setAnimKey] = useState(0);
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
        <div style={{ width: 32, height: 1, background: `linear-gradient(90deg, transparent, ${GOLD})` }} />
        <span style={{ fontSize: 15, fontWeight: 800, color: GOLD, letterSpacing: "0.03em", textTransform: "uppercase" }}>
          {t("auctionSwiper.eyebrow")}
        </span>
        <div style={{ width: 32, height: 1, background: `linear-gradient(90deg, ${GOLD}, transparent)` }} />
      </div>
      <div style={{ fontSize: "clamp(26px, 4.5vw, 44px)", fontWeight: 900, color: "#ffffff", letterSpacing: "-0.02em", lineHeight: 1.1, marginBottom: 4 }}>
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
      <div style={{ fontSize: "clamp(26px, 4.5vw, 44px)", fontWeight: 900, color: GOLD, letterSpacing: "-0.02em", lineHeight: 1.1, marginBottom: 20 }}>
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
          margin: "0 auto", color: "rgba(229,224,198)", fontSize: 16, fontWeight: 400,
          letterSpacing: "0.01em", maxWidth: 480, lineHeight: 1.7,
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

// ─── SwiperSection: no looped duplication, optimized autoplay ─────────────────
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

  const handleDotClick = useCallback((i: number) => {
    const sw = swiperRef.current;
    if (!sw) return;
    if (resumeTimer.current) clearTimeout(resumeTimer.current);
    sw.autoplay.stop();
    sw.params.speed = 600;
    sw.slideToLoop(i, 600);
    setActiveIdx(i);
    resumeTimer.current = setTimeout(() => {
      sw.params.speed = 3500;
      sw.autoplay.start();
    }, 1200);
  }, []);

  if (products.length === 0)
    return (
      <div style={{ textAlign: "center", padding: "60px 20px", color: "rgba(229,224,198,0.4)" }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>🔨</div>
        <p style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>No products available yet</p>
      </div>
    );

  return (
    <>
      <style>{`.lz-swiper{overflow:visible!important}.lz-swiper-wrap{overflow:hidden;padding:8px 4px 4px}.lz-swiper .swiper-slide{height:auto}.lz-dot{width:8px;height:8px;border-radius:4px;background:rgba(229,224,198,0.2);border:none;cursor:pointer;transition:width .2s ease,background .2s ease;padding:0;flex-shrink:0}.lz-dot.active{width:26px;background:#c9a96e}.lz-dot:hover:not(.active){background:rgba(229,224,198,0.4)}`}</style>
      <div dir="ltr" className="lz-swiper-wrap">
        <Swiper
          className="lz-swiper"
          modules={[Autoplay]}
          onSwiper={(s) => { swiperRef.current = s; }}
          onSlideChange={(s) => setActiveIdx(s.realIndex % products.length)}
          loop={products.length > 2}
          speed={3500}
          autoplay={{
            delay: 1,               // near-zero delay = continuous, but not 0 which causes jank
            disableOnInteraction: false,
            pauseOnMouseEnter: true,
          }}
          allowTouchMove={true}
          grabCursor={true}
          watchSlidesProgress={false}
          breakpoints={{
            0:    { slidesPerView: 2, spaceBetween: 10 },
            640:  { slidesPerView: 3, spaceBetween: 14 },
            900:  { slidesPerView: 4, spaceBetween: 18 },
            1200: { slidesPerView: 5, spaceBetween: 20 },
          }}
        >
          {products.map((item) => (
            <SwiperSlide key={item.id} style={{ height: "auto", display: "flex" }}>
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
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 8, marginTop: 24 }}>
        {products.map((_, i) => (
          <button
            key={i}
            className={`lz-dot${activeIdx === i ? " active" : ""}`}
            onClick={() => handleDotClick(i)}
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

  const handleRegisterClick = useCallback((productId: string) => {
    if (user) navigate(`/auctions/register/${productId}`);
    else setModalOpen(true);
  }, [user, navigate]);

  return (
    <section
      dir="ltr"
      style={{
        background: "linear-gradient(180deg,#1f2a3d 0%,#224266 100%)",
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