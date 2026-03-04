import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { collection, getDocs, query, where, orderBy } from "firebase/firestore";
import { db } from "@/firebase/firebase";

// ── Design tokens (matching site palette) ────────────────────────────────────
const NAVY = "#2A4863";
const NAVY2 = "#1e3652";
const GOLD = "#c9a96e";
const GOLD2 = "#b8996a";
const CREAM = "rgb(229, 224, 198)";
const BG = "#f5f7fa";

// ── Types ─────────────────────────────────────────────────────────────────────
interface Product {
  id: string;
  title: string;
  brand: string;
  model: string;
  category: string;
  categoryName?: string;
  description: string;
  price: number;
  quantity: number;
  isActive: boolean;
  features: string[];
  images: string[];
  thumbnail: string | null;
  totalAuctions: number;
}

interface Auction {
  id: string;
  productId: string;
  auctionNumber: number;
  startingPrice: number;
  minimumIncrement: number;
  bidType: "fixed" | "free";
  fixedBidValue: number | null;
  startTime: Date;
  endTime: Date;
  entryType: "free" | "paid";
  entryFee: number;
  status: "upcoming" | "live" | "ended";
  isActive: boolean;
  totalBids: number;
  totalParticipants: number;
  lastOfferEnabled: boolean;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtDate(d: Date) {
  return d.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
function fmtTime(d: Date) {
  return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}
function statusColor(s: string) {
  if (s === "live") return { bg: "#dcfce7", color: "#16a34a", dot: "#22c55e" };
  if (s === "upcoming")
    return { bg: "#eff6ff", color: "#2563eb", dot: "#3b82f6" };
  return { bg: "#f1f5f9", color: "#64748b", dot: "#94a3b8" };
}

// ── Main component ────────────────────────────────────────────────────────────
export default function AuctionRegisterPage() {
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();

  const [product, setProduct] = useState<Product | null>(null);
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedAuctions, setSelectedAuctions] = useState<Set<string>>(
    new Set(),
  );
  const [activeImage, setActiveImage] = useState<string | null>(null);
  const [agreed, setAgreed] = useState(false);
  const [checking, setChecking] = useState(false);

  // ── Fetch ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!productId) return;
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
              where("__name__", "==", productId),
            ),
          ),
          getDocs(
            query(
              collection(db, "auctions"),
              where("productId", "==", productId),
              where("isActive", "==", true),
              orderBy("auctionNumber", "asc"),
            ),
          ),
        ]);

        if (cancelled) return;

        // category map
        const catMap: Record<string, string> = {};
        catSnap.docs.forEach((d) => {
          catMap[d.id] = d.data().name?.en ?? d.id;
        });

        if (prodSnap.empty) {
          setError("Product not found");
          setLoading(false);
          return;
        }

        const pDoc = prodSnap.docs[0];
        const pd = pDoc.data();
        const thumb =
          !pd.thumbnail || pd.thumbnail === "null" ? null : pd.thumbnail;

        const p: Product = {
          id: pDoc.id,
          title: pd.title ?? "",
          brand: pd.brand ?? "",
          model: pd.model ?? "",
          category: pd.category ?? "",
          categoryName: catMap[pd.category] ?? pd.category ?? "—",
          description: pd.description ?? "",
          price: pd.price ?? 0,
          quantity: pd.quantity ?? 0,
          isActive: pd.isActive ?? true,
          features: Array.isArray(pd.features) ? pd.features : [],
          images: Array.isArray(pd.images) ? pd.images : [],
          thumbnail: thumb,
          totalAuctions: pd.totalAuctions ?? 0,
        };
        setProduct(p);
        setActiveImage(thumb ?? p.images[0] ?? null);

        const { Timestamp } = await import("firebase/firestore");
        const toDate = (v: any) =>
          v instanceof Timestamp ? v.toDate() : new Date(v);
        const now = new Date();

        const acs: Auction[] = auctSnap.docs
          .map((d) => {
            const a = d.data();
            const st = toDate(a.startTime);
            const et = toDate(a.endTime);
            const stat: "upcoming" | "live" | "ended" =
              now < st ? "upcoming" : now <= et ? "live" : "ended";
            return {
              id: d.id,
              productId: a.productId ?? "",
              auctionNumber: a.auctionNumber ?? 0,
              startingPrice: a.startingPrice ?? 0,
              minimumIncrement: a.minimumIncrement ?? 0,
              bidType: a.bidType ?? "fixed",
              fixedBidValue: a.fixedBidValue ?? null,
              startTime: st,
              endTime: et,
              entryType: a.entryType ?? "free",
              entryFee: a.entryFee ?? 0,
              status: stat,
              isActive: a.isActive ?? true,
              totalBids: a.totalBids ?? 0,
              totalParticipants: a.totalParticipants ?? 0,
              lastOfferEnabled: a.lastOfferEnabled ?? false,
            };
          })
          .filter((a) => a.status !== "ended");

        setAuctions(acs);
      } catch (e: any) {
        if (!cancelled) setError("Failed to load. Please try again.");
        console.error(e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [productId]);

  // ── Selection ──────────────────────────────────────────────────────────────
  const toggleAuction = useCallback((id: string) => {
    setSelectedAuctions((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  // ── Total ──────────────────────────────────────────────────────────────────
  const selectedList = auctions.filter((a) => selectedAuctions.has(a.id));
  const total = selectedList.reduce(
    (sum, a) => sum + (a.entryType === "paid" ? a.entryFee : 0),
    0,
  );
  const canCheckout = selectedAuctions.size > 0 && agreed;

  // ── Checkout ───────────────────────────────────────────────────────────────
  const handleCheckout = async () => {
    if (!canCheckout) return;
    setChecking(true);
    await new Promise((r) => setTimeout(r, 1200)); // replace with real payment call
    setChecking(false);
    // navigate("/checkout/success");
  };

  // ── Loading / Error states ─────────────────────────────────────────────────
  if (loading)
    return (
      <div
        style={{
          minHeight: "100vh",
          background: BG,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              width: 48,
              height: 48,
              border: `3px solid ${GOLD}`,
              borderTopColor: "transparent",
              borderRadius: "50%",
              animation: "spin 0.8s linear infinite",
              margin: "0 auto 16px",
            }}
          />
          <p style={{ color: NAVY, fontWeight: 600, fontSize: 15 }}>
            Loading auction details…
          </p>
          <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
        </div>
      </div>
    );

  if (error || !product)
    return (
      <div
        style={{
          minHeight: "100vh",
          background: BG,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div style={{ textAlign: "center", padding: 40 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>⚠️</div>
          <p
            style={{
              color: NAVY,
              fontWeight: 700,
              fontSize: 18,
              marginBottom: 8,
            }}
          >
            {error ?? "Product not found"}
          </p>
          <button
            onClick={() => navigate(-1)}
            style={{
              ...btnBase,
              background: NAVY,
              color: "#fff",
              padding: "10px 28px",
            }}
          >
            Go Back
          </button>
        </div>
      </div>
    );

  const displayImg = activeImage ?? product.images[0] ?? null;

  return (
    <>
      <style>{`
        * { box-sizing: border-box; }
        body { margin: 0; font-family: 'Segoe UI', system-ui, sans-serif; }

        @keyframes spin    { to { transform: rotate(360deg); } }
        @keyframes fadeUp  { from { opacity:0; transform:translateY(18px); } to { opacity:1; transform:translateY(0); } }
        @keyframes pulse   { 0%,100% { box-shadow: 0 0 0 0 rgba(201,169,110,0.4); } 50% { box-shadow: 0 0 0 8px rgba(201,169,110,0); } }
        @keyframes ripple  { from { transform: scale(0); opacity:0.6; } to { transform: scale(2.5); opacity:0; } }
        @keyframes checkPop { 0% { transform:scale(0) rotate(-20deg); } 70% { transform:scale(1.2) rotate(3deg); } 100% { transform:scale(1) rotate(0); } }

        .page-wrap { min-height:100vh; background:${BG}; padding:0 0 80px; }

        /* top bar */
        .top-bar { background: linear-gradient(135deg,${NAVY2},${NAVY}); padding:18px 40px; display:flex; align-items:center; gap:16px; position:sticky; top:0; z-index:100; box-shadow:0 4px 24px rgba(30,54,82,0.18); }
        .back-btn { background:rgba(255,255,255,0.1); border:1px solid rgba(255,255,255,0.2); color:#fff; padding:8px 18px; border-radius:99px; cursor:pointer; font-size:13px; font-weight:600; display:flex; align-items:center; gap:6px; transition:all 0.2s ease; }
        .back-btn:hover { background:rgba(255,255,255,0.2); transform:translateX(-2px); }
        .top-bar-title { color:#fff; font-size:15px; font-weight:700; letter-spacing:0.04em; opacity:0.85; }
        .top-bar-badge { margin-left:auto; background:rgba(201,169,110,0.2); border:1px solid rgba(201,169,110,0.4); color:${GOLD}; padding:4px 14px; border-radius:99px; font-size:11px; font-weight:800; letter-spacing:0.14em; text-transform:uppercase; }

        /* hero */
        .hero { background:linear-gradient(135deg,${NAVY2} 0%,${NAVY} 60%,#3D6A8A 100%); padding:40px 40px 0; position:relative; overflow:hidden; }
        .hero::before { content:''; position:absolute; inset:0; background-image:radial-gradient(circle at 70% 50%, rgba(201,169,110,0.07) 0%, transparent 60%); pointer-events:none; }
        .hero-ring { position:absolute; border-radius:50%; border:1px solid rgba(229,224,198,0.08); pointer-events:none; }
        .hero-content { position:relative; z-index:1; display:flex; align-items:flex-end; gap:20px; }
        .hero-img { width:72px; height:72px; border-radius:12px; object-fit:cover; border:2px solid rgba(255,255,255,0.3); flex-shrink:0; }
        .hero-text h1 { margin:0; color:#fff; font-size:clamp(20px,3vw,26px); font-weight:800; letter-spacing:-0.01em; }
        .hero-text p  { margin:4px 0 0; color:rgba(229,224,198,0.65); font-size:13px; }
        .hero-tabs { display:flex; gap:0; margin-top:28px; position:relative; z-index:1; }
        .hero-tab { padding:10px 24px; font-size:12px; font-weight:700; letter-spacing:0.1em; text-transform:uppercase; color:rgba(255,255,255,0.5); border-bottom:2px solid transparent; cursor:default; }
        .hero-tab.active { color:#fff; border-bottom-color:${GOLD}; }

        /* layout */
        .content { display:grid; grid-template-columns:1fr 1fr; gap:24px; padding:28px 40px; max-width:1400px; margin:0 auto; animation:fadeUp 0.5s ease; }
        @media (max-width:900px) { .content { grid-template-columns:1fr; padding:20px; } .top-bar { padding:14px 20px; } .hero { padding:28px 20px 0; } }

        /* panels */
        .panel { background:#fff; border-radius:16px; border:1px solid #e8edf3; box-shadow:0 2px 20px rgba(42,72,99,0.06); overflow:hidden; }
        .panel-header { padding:18px 24px; border-bottom:1px solid #f0f4f8; display:flex; align-items:center; gap:10px; }
        .panel-header-icon { width:34px; height:34px; border-radius:8px; background:${NAVY}10; display:flex; align-items:center; justify-content:center; font-size:16px; flex-shrink:0; }
        .panel-header h2 { margin:0; font-size:14px; font-weight:800; color:${NAVY}; letter-spacing:0.03em; text-transform:uppercase; }
        .panel-body { padding:24px; }

        /* product gallery */
        .gallery-main { width:100%; aspect-ratio:4/3; border-radius:12px; overflow:hidden; border:1px solid #eef1f4; background:#f7f9fb; margin-bottom:12px; position:relative; }
        .gallery-main img { width:100%; height:100%; object-fit:cover; transition:transform 0.4s ease; }
        .gallery-main:hover img { transform:scale(1.03); }
        .gallery-thumbs { display:flex; gap:8px; flex-wrap:wrap; }
        .thumb-btn { width:52px; height:52px; border-radius:8px; overflow:hidden; cursor:pointer; border:2px solid transparent; transition:border-color 0.2s,transform 0.2s; flex-shrink:0; }
        .thumb-btn:hover { transform:scale(1.06); }
        .thumb-btn.active { border-color:${GOLD}; }
        .thumb-btn img { width:100%; height:100%; object-fit:cover; }

        /* product meta grid */
        .meta-grid { display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-top:20px; }
        .meta-item { background:#f7f9fb; border-radius:10px; padding:12px 14px; }
        .meta-label { font-size:10px; font-weight:700; color:#9aabbb; letter-spacing:0.14em; text-transform:uppercase; margin-bottom:4px; }
        .meta-value { font-size:14px; font-weight:700; color:${NAVY}; }
        .price-value { font-size:20px; font-weight:900; color:${GOLD}; }

        /* features */
        .features-list { display:flex; flex-wrap:wrap; gap:6px; margin-top:16px; }
        .feature-tag { background:${NAVY}08; border:1px solid ${NAVY}15; border-radius:99px; padding:4px 12px; font-size:11px; font-weight:600; color:${NAVY}; }

        /* desc */
        .desc-text { font-size:13.5px; line-height:1.7; color:#64748b; margin-top:14px; background:#f7f9fb; border-radius:10px; padding:14px 16px; border-left:3px solid ${GOLD}; }

        /* auctions */
        .auction-list { display:flex; flex-direction:column; gap:14px; }
        .auction-card { border:2px solid #e8edf3; border-radius:14px; padding:20px; cursor:pointer; transition:all 0.25s cubic-bezier(0.22,1,0.36,1); position:relative; overflow:hidden; user-select:none; }
        .auction-card::before { content:''; position:absolute; inset:0; background:linear-gradient(135deg,${NAVY}04,transparent); opacity:0; transition:opacity 0.25s; pointer-events:none; }
        .auction-card:hover { border-color:${NAVY}40; box-shadow:0 8px 32px rgba(42,72,99,0.10); transform:translateY(-2px); }
        .auction-card:hover::before { opacity:1; }
        .auction-card.selected { border-color:${GOLD}; background:linear-gradient(135deg,rgba(201,169,110,0.05),rgba(201,169,110,0.02)); box-shadow:0 8px 32px rgba(201,169,110,0.15); }
        .auction-card.selected::before { opacity:1; }
        .auction-card.ended-card { opacity:0.5; cursor:not-allowed; }

        /* auction card header */
        .ac-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:16px; }
        .ac-num { font-size:18px; font-weight:900; color:${NAVY}; }
        .ac-status { display:flex; align-items:center; gap:5px; padding:4px 10px; border-radius:99px; font-size:10px; font-weight:800; letter-spacing:0.08em; text-transform:uppercase; }
        .ac-status-dot { width:6px; height:6px; border-radius:50%; flex-shrink:0; }
        .live-dot { animation:pulse 1.5s infinite; }

        /* auction details grid */
        .ac-grid { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
        .ac-field { background:#f7f9fb; border-radius:8px; padding:10px 12px; }
        .ac-field-label { font-size:9px; font-weight:700; color:#9aabbb; letter-spacing:0.12em; text-transform:uppercase; margin-bottom:3px; }
        .ac-field-value { font-size:13px; font-weight:700; color:${NAVY}; }
        .ac-field-value.gold { color:${GOLD}; font-size:15px; }
        .ac-field-value.free { color:#22c55e; }
        .ac-field-value.paid { color:#e07b39; }

        /* date/time row */
        .ac-datetime { display:flex; align-items:center; gap:8px; margin-bottom:14px; flex-wrap:wrap; }
        .ac-date-badge { display:flex; align-items:center; gap:5px; background:#f0f4f8; border-radius:8px; padding:6px 10px; font-size:11px; font-weight:600; color:${NAVY}; }

        /* radio/checkbox */
        .ac-selector { display:flex; align-items:center; justify-content:space-between; margin-top:16px; padding-top:14px; border-top:1px solid #f0f4f8; }
        .ac-selector-label { font-size:12px; font-weight:600; color:#64748b; }
        .custom-radio { width:22px; height:22px; border-radius:50%; border:2px solid #d1d5db; background:#fff; display:flex; align-items:center; justify-content:center; transition:all 0.2s cubic-bezier(0.34,1.56,0.64,1); flex-shrink:0; position:relative; overflow:hidden; }
        .custom-radio.checked { border-color:${GOLD}; background:${GOLD}; }
        .custom-radio .check-inner { width:8px; height:8px; border-radius:50%; background:#fff; transform:scale(0); transition:transform 0.25s cubic-bezier(0.34,1.56,0.64,1); }
        .custom-radio.checked .check-inner { transform:scale(1); animation:checkPop 0.3s cubic-bezier(0.34,1.56,0.64,1); }
        .custom-radio .ripple { position:absolute; inset:0; border-radius:50%; background:${GOLD}30; transform:scale(0); }
        .auction-card:active .custom-radio .ripple { animation:ripple 0.4s ease-out; }

        /* empty auctions */
        .no-auctions { text-align:center; padding:40px 20px; }
        .no-auctions .icon { font-size:44px; margin-bottom:12px; }

        /* footer sticky bar */
        .footer-bar { background:#fff; border-radius:16px; border:1px solid #e8edf3; box-shadow:0 2px 20px rgba(42,72,99,0.06); margin-top:8px; overflow:hidden; }
        .footer-bar-inner { padding:20px 24px; }

        /* terms */
        .terms-row { display:flex; align-items:center; gap:12px; margin-bottom:20px; cursor:pointer; padding:14px 16px; border-radius:10px; border:1.5px solid #e8edf3; transition:all 0.2s ease; }
        .terms-row:hover { border-color:${GOLD}60; background:rgba(201,169,110,0.03); }
        .terms-row.agreed { border-color:${GOLD}; background:rgba(201,169,110,0.06); }
        .custom-check { width:22px; height:22px; border-radius:6px; border:2px solid #d1d5db; background:#fff; display:flex; align-items:center; justify-content:center; transition:all 0.2s cubic-bezier(0.34,1.56,0.64,1); flex-shrink:0; position:relative; overflow:hidden; }
        .custom-check.checked { border-color:${GOLD}; background:${GOLD}; }
        .check-mark { opacity:0; transform:scale(0) rotate(-10deg); color:#fff; font-size:13px; font-weight:900; transition:all 0.25s cubic-bezier(0.34,1.56,0.64,1); }
        .custom-check.checked .check-mark { opacity:1; transform:scale(1) rotate(0deg); }
        .terms-text { font-size:12.5px; color:#64748b; line-height:1.5; }
        .terms-text strong { color:${NAVY}; }
        .terms-link { color:${GOLD}; font-weight:700; text-decoration:underline; cursor:pointer; }

        /* total row */
        .total-row { display:flex; align-items:center; justify-content:space-between; padding:14px 16px; background:#f7f9fb; border-radius:10px; margin-bottom:16px; }
        .total-label { font-size:11px; font-weight:700; color:#9aabbb; letter-spacing:0.1em; text-transform:uppercase; }
        .total-amount { font-size:22px; font-weight:900; color:${NAVY}; letter-spacing:-0.02em; }
        .total-amount span { font-size:12px; font-weight:600; color:#9aabbb; margin-left:4px; }
        .total-free { font-size:13px; font-weight:700; color:#22c55e; }

        /* selected summary */
        .sel-summary { font-size:11px; color:#64748b; margin-bottom:14px; padding:8px 12px; background:#f0f4f8; border-radius:8px; }

        /* checkout button */
        .checkout-btn { width:100%; padding:16px; border-radius:12px; border:none; cursor:pointer; font-size:14px; font-weight:800; letter-spacing:0.08em; text-transform:uppercase; display:flex; align-items:center; justify-content:center; gap:10px; position:relative; overflow:hidden; transition:all 0.3s cubic-bezier(0.22,1,0.36,1); }
        .checkout-btn:not(.disabled) { background:linear-gradient(135deg,${NAVY2},${NAVY}); color:#fff; box-shadow:0 6px 24px rgba(42,72,99,0.25); }
        .checkout-btn:not(.disabled):hover { transform:translateY(-2px); box-shadow:0 12px 36px rgba(42,72,99,0.30); }
        .checkout-btn:not(.disabled):hover .btn-shine { transform:translateX(200%); }
        .checkout-btn:not(.disabled):active { transform:translateY(0); box-shadow:0 4px 16px rgba(42,72,99,0.20); }
        .checkout-btn.disabled { background:#e8edf3; color:#9aabbb; cursor:not-allowed; }
        .btn-shine { position:absolute; inset:0; background:linear-gradient(90deg,transparent,rgba(255,255,255,0.1),transparent); transform:translateX(-100%); transition:transform 0.6s ease; pointer-events:none; }
        .btn-spinner { width:18px; height:18px; border:2px solid rgba(255,255,255,0.3); border-top-color:#fff; border-radius:50%; animation:spin 0.7s linear infinite; }
        .btn-gold-bar { position:absolute; bottom:0; left:0; right:0; height:2px; background:linear-gradient(90deg,${GOLD},${GOLD2},${GOLD}); opacity:0; transition:opacity 0.3s; }
        .checkout-btn:not(.disabled):hover .btn-gold-bar { opacity:1; }

        /* disclaimer */
        .disclaimer { text-align:center; font-size:10px; color:#9aabbb; margin-top:10px; }
        .disclaimer span { color:${GOLD}; }

        /* badge */
        .lz-badge { display:inline-flex; align-items:center; gap:4px; background:${NAVY}; border-radius:99px; padding:3px 10px; }
        .lz-badge span { font-size:9px; font-weight:800; letter-spacing:0.14em; color:${CREAM}; text-transform:uppercase; }
        .lz-badge .star { color:${GOLD}; font-size:8px; }
      `}</style>

      <div className="page-wrap">
        {/* ── Top bar ── */}
        <div className="top-bar">
          <button className="back-btn" onClick={() => navigate(-1)}>
            ← Back
          </button>
          <span className="top-bar-title">Register for Auction</span>
          <div className="lz-badge">
            <span className="star">★</span>
            <span>Loqta Zone</span>
            <span className="star">★</span>
          </div>
        </div>

        {/* ── Hero ── */}
        <div className="hero">
          <div
            className="hero-ring"
            style={{ width: 400, height: 400, top: -200, right: -100 }}
          />
          <div
            className="hero-ring"
            style={{ width: 250, height: 250, top: -100, right: 50 }}
          />
          <div className="hero-content">
            {displayImg ? (
              <img
                className="hero-img"
                src={displayImg}
                alt={product.title}
                onError={(e: any) => (e.currentTarget.style.display = "none")}
              />
            ) : (
              <div
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: 12,
                  background: "rgba(255,255,255,0.15)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 28,
                  fontWeight: 900,
                  color: "rgba(255,255,255,0.6)",
                  border: "2px solid rgba(255,255,255,0.2)",
                }}
              >
                {product.title.charAt(0)}
              </div>
            )}
            <div className="hero-text">
              <h1>{product.title}</h1>
              <p>
                {product.brand} · {product.model} · {product.categoryName}
              </p>
            </div>
          </div>
          <div className="hero-tabs">
            <div className="hero-tab active">Product Details</div>
            <div className="hero-tab active" style={{ marginLeft: 4 }}>
              Select Auction
            </div>
          </div>
        </div>

        {/* ── Main content ── */}
        <div className="content">
          {/* ─── LEFT: Product ───────────────────────────────────────── */}
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {/* Gallery */}
            <div className="panel">
              <div className="panel-header">
                <div className="panel-header-icon">🖼️</div>
                <h2>Product Gallery</h2>
              </div>
              <div className="panel-body">
                <div className="gallery-main">
                  {displayImg ? (
                    <img
                      src={displayImg}
                      alt={product.title}
                      onError={(e: any) =>
                        (e.currentTarget.style.display = "none")
                      }
                    />
                  ) : (
                    <div
                      style={{
                        width: "100%",
                        height: "100%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 56,
                        fontWeight: 900,
                        color: `${NAVY}20`,
                      }}
                    >
                      {product.title.charAt(0)}
                    </div>
                  )}
                </div>
                {product.images.length > 1 && (
                  <div className="gallery-thumbs">
                    {product.images.map((url, i) => (
                      <button
                        key={i}
                        className={`thumb-btn ${activeImage === url ? "active" : ""}`}
                        onClick={() => setActiveImage(url)}
                      >
                        <img
                          src={url}
                          alt={`img-${i}`}
                          onError={(e: any) =>
                            (e.currentTarget.src = "/fallback.jpg")
                          }
                        />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Details */}
            <div className="panel">
              <div className="panel-header">
                <div className="panel-header-icon">📦</div>
                <h2>Product Details</h2>
              </div>
              <div className="panel-body">
                <div className="meta-grid">
                  <div className="meta-item" style={{ gridColumn: "1 / -1" }}>
                    <div className="meta-label">Starting Price</div>
                    <div className="price-value">
                      {product.price.toLocaleString()}{" "}
                      <span
                        style={{ fontSize: 13, fontWeight: 600, color: GOLD2 }}
                      >
                        EGP
                      </span>
                    </div>
                  </div>
                  <div className="meta-item">
                    <div className="meta-label">Brand</div>
                    <div className="meta-value">{product.brand}</div>
                  </div>
                  <div className="meta-item">
                    <div className="meta-label">Model</div>
                    <div className="meta-value">{product.model}</div>
                  </div>
                  <div className="meta-item">
                    <div className="meta-label">Category</div>
                    <div className="meta-value">{product.categoryName}</div>
                  </div>
                  <div className="meta-item">
                    <div className="meta-label">Stock</div>
                    <div
                      className="meta-value"
                      style={{
                        color: product.quantity > 0 ? "#22c55e" : "#ef4444",
                      }}
                    >
                      {product.quantity > 0
                        ? `${product.quantity} units`
                        : "Out of stock"}
                    </div>
                  </div>
                  <div className="meta-item">
                    <div className="meta-label">Total Auctions</div>
                    <div className="meta-value">🔨 {product.totalAuctions}</div>
                  </div>
                  <div className="meta-item">
                    <div className="meta-label">Status</div>
                    <div
                      className="meta-value"
                      style={{
                        color: product.isActive ? "#22c55e" : "#ef4444",
                      }}
                    >
                      {product.isActive ? "✓ Active" : "✗ Inactive"}
                    </div>
                  </div>
                </div>

                {product.description && (
                  <div className="desc-text">{product.description}</div>
                )}

                {product.features.length > 0 && (
                  <>
                    <div
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        color: "#9aabbb",
                        letterSpacing: "0.14em",
                        textTransform: "uppercase",
                        marginTop: 20,
                        marginBottom: 8,
                      }}
                    >
                      Features
                    </div>
                    <div className="features-list">
                      {product.features.map((f, i) => (
                        <span key={i} className="feature-tag">
                          ✓ {f}
                        </span>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* ─── RIGHT: Auctions + Checkout ──────────────────────────── */}
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {/* Auctions list */}
            <div className="panel">
              <div className="panel-header">
                <div className="panel-header-icon">🔨</div>
                <h2>Available Auctions</h2>
                {auctions.length > 0 && (
                  <span
                    style={{
                      marginLeft: "auto",
                      fontSize: 11,
                      fontWeight: 700,
                      background: `${NAVY}10`,
                      color: NAVY,
                      padding: "3px 10px",
                      borderRadius: 99,
                    }}
                  >
                    {auctions.length} available
                  </span>
                )}
              </div>
              <div className="panel-body">
                {auctions.length === 0 ? (
                  <div className="no-auctions">
                    <div className="icon">🔍</div>
                    <p
                      style={{
                        fontWeight: 700,
                        color: NAVY,
                        fontSize: 15,
                        margin: "0 0 6px",
                      }}
                    >
                      No Active Auctions
                    </p>
                    <p style={{ color: "#94a3b8", fontSize: 13 }}>
                      There are no upcoming or live auctions for this product
                      right now.
                    </p>
                  </div>
                ) : (
                  <div className="auction-list">
                    {auctions.map((a) => {
                      const sel = selectedAuctions.has(a.id);
                      const sc = statusColor(a.status);
                      const isLive = a.status === "live";
                      return (
                        <div
                          key={a.id}
                          className={`auction-card ${sel ? "selected" : ""}`}
                          onClick={() => toggleAuction(a.id)}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) =>
                            e.key === "Enter" && toggleAuction(a.id)
                          }
                        >
                          {/* Header */}
                          <div className="ac-header">
                            <div>
                              <div
                                style={{
                                  fontSize: 10,
                                  fontWeight: 700,
                                  color: "#9aabbb",
                                  letterSpacing: "0.1em",
                                  textTransform: "uppercase",
                                  marginBottom: 2,
                                }}
                              >
                                Auction
                              </div>
                              <div className="ac-num">#{a.auctionNumber}</div>
                            </div>
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 8,
                              }}
                            >
                              <div
                                className="ac-status"
                                style={{ background: sc.bg, color: sc.color }}
                              >
                                <div
                                  className={`ac-status-dot ${isLive ? "live-dot" : ""}`}
                                  style={{ background: sc.dot }}
                                />
                                {a.status}
                              </div>
                              <div
                                className="custom-radio"
                                style={{ cursor: "pointer" }}
                              >
                                <div
                                  className={`check-inner ${sel ? "checked" : ""}`}
                                  style={{
                                    background: sel ? "#fff" : "transparent",
                                    transform: sel ? "scale(1)" : "scale(0)",
                                  }}
                                />
                                <div className="ripple" />
                              </div>
                            </div>
                          </div>

                          {/* Date / time */}
                          <div className="ac-datetime">
                            <div className="ac-date-badge">
                              📅 {fmtDate(a.startTime)}
                            </div>
                            <div style={{ color: "#94a3b8", fontSize: 11 }}>
                              →
                            </div>
                            <div className="ac-date-badge">
                              🏁 {fmtDate(a.endTime)}
                            </div>
                          </div>
                          <div
                            style={{
                              display: "flex",
                              gap: 12,
                              marginBottom: 14,
                            }}
                          >
                            <div
                              style={{
                                fontSize: 11,
                                color: "#64748b",
                                display: "flex",
                                alignItems: "center",
                                gap: 4,
                              }}
                            >
                              <span>🕐</span> Start:{" "}
                              <strong style={{ color: NAVY }}>
                                {fmtTime(a.startTime)}
                              </strong>
                            </div>
                            <div
                              style={{
                                fontSize: 11,
                                color: "#64748b",
                                display: "flex",
                                alignItems: "center",
                                gap: 4,
                              }}
                            >
                              <span>🕐</span> End:{" "}
                              <strong style={{ color: NAVY }}>
                                {fmtTime(a.endTime)}
                              </strong>
                            </div>
                          </div>

                          {/* Details grid */}
                          <div className="ac-grid">
                            <div className="ac-field">
                              <div className="ac-field-label">
                                Starting Price
                              </div>
                              <div className="ac-field-value gold">
                                {a.startingPrice.toLocaleString()}{" "}
                                <span style={{ fontSize: 10, color: GOLD2 }}>
                                  EGP
                                </span>
                              </div>
                            </div>
                            <div className="ac-field">
                              <div className="ac-field-label">Entry Fee</div>
                              <div
                                className={`ac-field-value ${a.entryType === "free" ? "free" : "paid"}`}
                              >
                                {a.entryType === "free"
                                  ? "🎟 Free"
                                  : `💳 ${a.entryFee.toLocaleString()} EGP`}
                              </div>
                            </div>
                            <div className="ac-field">
                              <div className="ac-field-label">Bid Type</div>
                              <div className="ac-field-value">
                                {a.bidType === "fixed" ? (
                                  <>
                                    🔒 Fixed —{" "}
                                    <span style={{ color: GOLD }}>
                                      {a.fixedBidValue?.toLocaleString()} EGP
                                    </span>
                                  </>
                                ) : (
                                  "🔓 Free Bidding"
                                )}
                              </div>
                            </div>
                            <div className="ac-field">
                              <div className="ac-field-label">
                                Min. Increment
                              </div>
                              <div className="ac-field-value">
                                +{a.minimumIncrement.toLocaleString()} EGP
                              </div>
                            </div>
                            <div className="ac-field">
                              <div className="ac-field-label">Participants</div>
                              <div className="ac-field-value">
                                👥 {a.totalParticipants}
                              </div>
                            </div>
                            <div className="ac-field">
                              <div className="ac-field-label">Total Bids</div>
                              <div className="ac-field-value">
                                🔨 {a.totalBids}
                              </div>
                            </div>
                          </div>

                          {/* Last offer badge */}
                          {a.lastOfferEnabled && (
                            <div
                              style={{
                                marginTop: 12,
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 5,
                                background: "rgba(201,169,110,0.1)",
                                border: `1px solid rgba(201,169,110,0.3)`,
                                borderRadius: 6,
                                padding: "4px 10px",
                                fontSize: 10,
                                fontWeight: 700,
                                color: GOLD,
                                letterSpacing: "0.08em",
                              }}
                            >
                              ⚡ LAST OFFER ENABLED
                            </div>
                          )}

                          {/* Selector */}
                          <div className="ac-selector">
                            <div className="ac-selector-label">
                              {sel
                                ? "✓ Selected for registration"
                                : "Click to select this auction"}
                            </div>
                            <div
                              className="custom-radio"
                              style={{
                                borderColor: sel ? GOLD : "#d1d5db",
                                background: sel ? GOLD : "#fff",
                              }}
                            >
                              <div
                                className="check-inner"
                                style={{
                                  background: "#fff",
                                  transform: sel ? "scale(1)" : "scale(0)",
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* ── Checkout footer ── */}
            <div className="footer-bar">
              <div className="footer-bar-inner">
                {/* Selected summary */}
                {selectedAuctions.size > 0 && (
                  <div className="sel-summary">
                    🎯 <strong>{selectedAuctions.size}</strong> auction
                    {selectedAuctions.size > 1 ? "s" : ""} selected
                    {selectedList.some((a) => a.entryType === "paid") && (
                      <>
                        {" "}
                        ·{" "}
                        {
                          selectedList.filter((a) => a.entryType === "paid")
                            .length
                        }{" "}
                        paid,{" "}
                        {
                          selectedList.filter((a) => a.entryType === "free")
                            .length
                        }{" "}
                        free
                      </>
                    )}
                  </div>
                )}

                {/* Terms */}
                <div
                  className={`terms-row ${agreed ? "agreed" : ""}`}
                  onClick={() => setAgreed((v) => !v)}
                >
                  <div className={`custom-check ${agreed ? "checked" : ""}`}>
                    <span className="check-mark">✓</span>
                  </div>
                  <div className="terms-text">
                    I agree to the <strong>LOQTA ZONE</strong>{" "}
                    <span
                      className="terms-link"
                      onClick={(e) => {
                        e.stopPropagation(); /* open terms */
                      }}
                    >
                      Terms & Conditions
                    </span>{" "}
                    and confirm that all selected auction entries are final and
                    non-refundable.
                  </div>
                </div>

                {/* Total */}
                <div className="total-row">
                  <div>
                    <div className="total-label">Total Payment</div>
                    {selectedAuctions.size === 0 && (
                      <div
                        style={{ fontSize: 11, color: "#9aabbb", marginTop: 2 }}
                      >
                        No auctions selected
                      </div>
                    )}
                  </div>
                  {total === 0 && selectedAuctions.size > 0 ? (
                    <div className="total-free">🎟 FREE ENTRY</div>
                  ) : (
                    <div className="total-amount">
                      {total.toLocaleString()}
                      <span>EGP</span>
                    </div>
                  )}
                </div>

                {/* Checkout button */}
                <button
                  className={`checkout-btn ${!canCheckout ? "disabled" : ""}`}
                  onClick={handleCheckout}
                  disabled={!canCheckout || checking}
                >
                  <div className="btn-shine" />
                  {checking ? (
                    <>
                      <div className="btn-spinner" /> Processing…
                    </>
                  ) : canCheckout ? (
                    <>
                      {total === 0
                        ? "🎟 Register for Free"
                        : `💳 Checkout — ${total.toLocaleString()} EGP`}
                    </>
                  ) : selectedAuctions.size === 0 ? (
                    "Select an Auction to Continue"
                  ) : (
                    "Please Agree to Terms"
                  )}
                  <div className="btn-gold-bar" />
                </button>

                <p className="disclaimer">
                  🔒 Secured by <span>LOQTA ZONE</span> · All entries are final
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ── Tiny inline helper for button base styles ─────────────────────────────────
const btnBase: React.CSSProperties = {
  border: "none",
  borderRadius: 10,
  fontWeight: 700,
  cursor: "pointer",
  fontSize: 14,
  transition: "all 0.2s ease",
};
