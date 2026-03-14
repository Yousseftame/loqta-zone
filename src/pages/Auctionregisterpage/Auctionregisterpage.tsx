import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  doc,
  getDoc,
  updateDoc,
  arrayUnion,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/firebase/firebase";
import { joinAuctions } from "@/service/auctions/joinAuctionService";
import { useAuth } from "@/store/AuthContext/AuthContext";
import toast from "react-hot-toast";
import type { Voucher } from "@/pages/Admin/Voucher/voucher-data";
import PromoCodeModal from "@/components/shared/Promocodemodal";

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

function fmtDate(d: Date) {
  return d.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}
function fmtTime(d: Date) {
  return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}

export default function AuctionRegisterPage() {
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [product, setProduct] = useState<Product | null>(null);
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedAuctions, setSelectedAuctions] = useState<Set<string>>(
    new Set(),
  );
  const [agreed, setAgreed] = useState(false);
  const [checking, setChecking] = useState(false);

  // ── Promo code state ───────────────────────────────────────────────────────
  const [showPromoModal, setShowPromoModal] = useState(false);
  const [appliedVoucher, setAppliedVoucher] = useState<Voucher | null>(null);

  // ── Which auctions the logged-in user has ALREADY joined ──────────────────
  // Checked on load via auctions/{id}/Participants/{uid}.
  // These cards get a green "Registered ✓" badge and bypass the checkout flow
  // entirely — clicking them navigates directly to /auctions/{id}.
  const [joinedAuctionIds, setJoinedAuctionIds] = useState<Set<string>>(
    new Set(),
  );

  // ── Gallery state ──────────────────────────────────────────────────────────
  const [imgIndex, setImgIndex] = useState(0);
  const [prevIndex, setPrevIndex] = useState<number | null>(null);
  const [imgDir, setImgDir] = useState<"next" | "prev">("next");
  const [imgAnimating, setImgAnimating] = useState(false);
  const autoSlideRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const animTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Load product, auctions, and joined status ────────────────────────────
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

        setProduct({
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
        });

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

        // ── Check which auctions the user already joined ───────────────────
        // Run all Participant doc reads in parallel — fast even with many auctions
        if (user && acs.length > 0) {
          const checks = await Promise.allSettled(
            acs.map((a) =>
              getDoc(doc(db, "auctions", a.id, "Participants", user.uid)),
            ),
          );
          const joined = new Set<string>();
          checks.forEach((result, i) => {
            if (result.status === "fulfilled" && result.value.exists()) {
              joined.add(acs[i].id);
            }
          });
          if (!cancelled) setJoinedAuctionIds(joined);
        }
      } catch {
        if (!cancelled) setError("Failed to load. Please try again.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [productId, user?.uid]);

  // ── Gallery helpers ────────────────────────────────────────────────────────
  const allImages = product
    ? [
        ...new Set([
          ...(product.thumbnail ? [product.thumbnail] : []),
          ...product.images,
        ]),
      ]
    : [];

  const SLIDE_MS = 550;

  function triggerSlide(newIdx: number, dir: "next" | "prev") {
    if (imgAnimating || allImages.length <= 1) return;
    if (animTimerRef.current) clearTimeout(animTimerRef.current);
    setPrevIndex(imgIndex);
    setImgDir(dir);
    setImgIndex(newIdx);
    setImgAnimating(true);
    animTimerRef.current = setTimeout(() => {
      setImgAnimating(false);
      setPrevIndex(null);
    }, SLIDE_MS);
  }

  const startAutoSlide = useCallback(() => {
    if (autoSlideRef.current) clearInterval(autoSlideRef.current);
    autoSlideRef.current = setInterval(() => {
      setImgIndex((prev) => {
        const next = (prev + 1) % allImages.length;
        setPrevIndex(prev);
        setImgDir("next");
        setImgAnimating(true);
        if (animTimerRef.current) clearTimeout(animTimerRef.current);
        animTimerRef.current = setTimeout(() => {
          setImgAnimating(false);
          setPrevIndex(null);
        }, SLIDE_MS);
        return next;
      });
    }, 7000);
  }, [allImages.length]);

  useEffect(() => {
    if (allImages.length > 1) startAutoSlide();
    return () => {
      if (autoSlideRef.current) clearInterval(autoSlideRef.current);
      if (animTimerRef.current) clearTimeout(animTimerRef.current);
    };
  }, [allImages.length]);

  function goTo(newIdx: number, dir: "next" | "prev") {
    triggerSlide(newIdx, dir);
    startAutoSlide();
  }

  // ── Card click — joined cards navigate directly, others toggle selection ──
  const toggleAuction = useCallback(
    (id: string) => {
      if (joinedAuctionIds.has(id)) {
        navigate(`/auctions/${id}`);
        return;
      }
      setSelectedAuctions((prev) => {
        const next = new Set(prev);
        next.has(id) ? next.delete(id) : next.add(id);
        return next;
      });
    },
    [joinedAuctionIds, navigate],
  );

  // ── Derived — only count non-joined selections ─────────────────────────────
  const selectedList = auctions.filter(
    (a) => selectedAuctions.has(a.id) && !joinedAuctionIds.has(a.id),
  );

  // ── Total with voucher applied ─────────────────────────────────────────────
  const rawTotal = selectedList.reduce(
    (sum, a) => sum + (a.entryType === "paid" ? a.entryFee : 0),
    0,
  );

  // ── Helper: which selected auctions the voucher actually applies to ─────────
  function voucherApplicableAuctions(v: Voucher) {
    if (v.applicableAuctions.length === 0) return selectedList; // applies to all
    return selectedList.filter((a) => v.applicableAuctions.includes(a.id));
  }

  // Compute discounted total — only discount applicable auctions ─────────────
  function getDiscountedTotal(): number {
    if (!appliedVoucher) return rawTotal;

    const applicable = voucherApplicableAuctions(appliedVoucher);
    const notApplicable = selectedList.filter(
      (a) => !applicable.find((x) => x.id === a.id),
    );

    // Sum entry fees of non-applicable auctions (unchanged)
    const baseOther = notApplicable.reduce(
      (sum, a) => sum + (a.entryType === "paid" ? a.entryFee : 0),
      0,
    );
    // Sum entry fees of applicable auctions (may be discounted)
    const baseApplicable = applicable.reduce(
      (sum, a) => sum + (a.entryType === "paid" ? a.entryFee : 0),
      0,
    );

    if (appliedVoucher.type === "join") {
      // Waive entry fees only for applicable auctions
      return baseOther;
    }
    if (appliedVoucher.type === "entry_discount") {
      const discount = appliedVoucher.discountAmount ?? 0;
      return baseOther + Math.max(0, baseApplicable - discount);
    }
    return rawTotal; // "discount" = final price, no entry change
  }

  const total = getDiscountedTotal();
  const canCheckout = selectedList.length > 0 && agreed;

  // ── Record voucher usage in Firestore ─────────────────────────────────────
  async function recordVoucherUsage(voucherId: string) {
    if (!user) return;
    try {
      const userSnap = await getDoc(doc(db, "users", user.uid));
      const userName = userSnap.exists()
        ? (userSnap.data().fullName ?? userSnap.data().firstName ?? "Unknown")
        : "Unknown";
      await updateDoc(doc(db, "vouchers", voucherId), {
        usedBy: arrayUnion({
          userId: user.uid,
          userName,
          usedAt: new Date(),
        }),
      });
    } catch {
      /* non-fatal — usage recording failure shouldn't block join */
      console.warn("[promo] Failed to record voucher usage");
    }
  }

  // ── Checkout — only processes new (non-joined) auctions ───────────────────
  const handleCheckout = async () => {
    if (!user) {
      toast.error("You must be logged in to join an auction.");
      return;
    }
    if (!canCheckout) return;

    setChecking(true);
    try {
      // Build the list, adjusting entryFee if voucher is applied
      const applicableIds = appliedVoucher
        ? appliedVoucher.applicableAuctions.length > 0
          ? new Set(appliedVoucher.applicableAuctions)
          : null // null = applies to all
        : null;

      const auctionsToJoin = selectedList.map((a) => {
        if (!appliedVoucher)
          return { id: a.id, entryType: a.entryType, entryFee: a.entryFee };

        // Check if this specific auction is covered by the voucher
        const isCovered = applicableIds === null || applicableIds.has(a.id);
        if (!isCovered)
          return { id: a.id, entryType: a.entryType, entryFee: a.entryFee };

        if (appliedVoucher.type === "join") {
          return { id: a.id, entryType: "free" as const, entryFee: 0 };
        }
        if (
          appliedVoucher.type === "entry_discount" &&
          a.entryType === "paid"
        ) {
          const discounted = Math.max(
            0,
            a.entryFee - (appliedVoucher.discountAmount ?? 0),
          );
          return {
            id: a.id,
            entryType: (discounted === 0 ? "free" : "paid") as "free" | "paid",
            entryFee: discounted,
          };
        }
        return { id: a.id, entryType: a.entryType, entryFee: a.entryFee };
      });

      const result = await joinAuctions(user.uid, auctionsToJoin);

      if (result.errors.length > 0) {
        toast.error(
          `${result.errors.length} auction(s) could not be processed. Please try again.`,
        );
      }

      // Race condition: became joined between page-load and checkout — update state
      if (result.skipped.length > 0) {
        setJoinedAuctionIds((prev) => {
          const next = new Set(prev);
          result.skipped.forEach((id) => next.add(id));
          return next;
        });
      }

      if (result.joined.length > 0) {
        // Record voucher usage after successful join
        if (appliedVoucher) {
          await recordVoucherUsage(appliedVoucher.id);
          setAppliedVoucher(null);
        }

        setJoinedAuctionIds((prev) => {
          const next = new Set(prev);
          result.joined.forEach((id) => next.add(id));
          return next;
        });
        toast.success(
          `Successfully registered for ${result.joined.length} auction(s)!`,
        );
        navigate(`/auctions/${result.joined[0]}`);
      }
    } catch (err: any) {
      toast.error(err?.message ?? "Registration failed. Please try again.");
    } finally {
      setChecking(false);
    }
  };

  // ── Loading / error states ─────────────────────────────────────────────────
  if (loading)
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#09111a",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              width: 36,
              height: 36,
              border: "2px solid rgba(201,169,110,0.15)",
              borderTopColor: "#c9a96e",
              borderRadius: "50%",
              animation: "lz-spin 0.9s linear infinite",
              margin: "0 auto 14px",
            }}
          />
          <p
            style={{
              color: "rgba(229,224,198,0.35)",
              fontSize: 11,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              fontFamily: "system-ui",
            }}
          >
            Loading
          </p>
          <style>{`@keyframes lz-spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      </div>
    );

  if (error || !product)
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#09111a",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div style={{ textAlign: "center", padding: 40 }}>
          <p
            style={{
              color: "rgba(229,224,198,0.7)",
              fontSize: 16,
              fontWeight: 600,
              marginBottom: 20,
              fontFamily: "system-ui",
            }}
          >
            {error ?? "Product not found"}
          </p>
          <button
            onClick={() => navigate(-1)}
            style={{
              background: "#c9a96e",
              color: "#09111a",
              border: "none",
              borderRadius: 10,
              padding: "12px 32px",
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 700,
              letterSpacing: "0.06em",
              fontFamily: "system-ui",
            }}
          >
            ← Go Back
          </button>
        </div>
      </div>
    );

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .lz { background: #09111a; font-family: 'Outfit', system-ui, sans-serif; color: rgb(229,224,198); animation: lz-fadein 0.5s ease both; padding-top: 120px; }
        @media(max-width:860px){ .lz { padding-top: 100px; } }
        @keyframes lz-fadein  { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
        @keyframes lz-spin    { to{transform:rotate(360deg)} }
        @keyframes lz-pulse   { 0%,100%{box-shadow:0 0 0 0 rgba(74,222,128,0.4)} 50%{box-shadow:0 0 0 5px rgba(74,222,128,0)} }
        @keyframes lz-check   { from{transform:scale(0) rotate(-20deg)} 80%{transform:scale(1.15) rotate(3deg)} to{transform:scale(1) rotate(0)} }
        @keyframes lz-radio-in{ from{transform:scale(0)} 70%{transform:scale(1.3)} to{transform:scale(1)} }
        @keyframes lz-joined-in{from{opacity:0;transform:translateY(-4px)} to{opacity:1;transform:translateY(0)}}

        @keyframes lz-cur-next  { from{transform:translateX(0)}    to{transform:translateX(-100%)} }
        @keyframes lz-inc-next  { from{transform:translateX(100%)} to{transform:translateX(0)} }
        @keyframes lz-cur-prev  { from{transform:translateX(0)}    to{transform:translateX(100%)} }
        @keyframes lz-inc-prev  { from{transform:translateX(-100%)}to{transform:translateX(0)} }
        .lz-slide-cur-next { animation: lz-cur-next 0.55s cubic-bezier(0.4,0,0.2,1) forwards; }
        .lz-slide-inc-next { animation: lz-inc-next 0.55s cubic-bezier(0.4,0,0.2,1) forwards; }
        .lz-slide-cur-prev { animation: lz-cur-prev 0.55s cubic-bezier(0.4,0,0.2,1) forwards; }
        .lz-slide-inc-prev { animation: lz-inc-prev 0.55s cubic-bezier(0.4,0,0.2,1) forwards; }

        .lz-bar { width:100%; height:50px; background:rgba(9,17,26,0.55); border-bottom:1px solid rgba(201,169,110,0.1); display:flex; align-items:center; padding:0 40px; gap:14px; }
        @media(max-width:700px){ .lz-bar { padding:0 20px; } }
        .lz-back { display:flex; align-items:center; gap:7px; background:none; border:none; cursor:pointer; font-family:'Outfit',system-ui,sans-serif; font-size:13px; font-weight:500; color:rgba(229,224,198,0.45); transition:color 0.2s; padding:0; }
        .lz-back:hover { color:rgba(229,224,198,0.9); }
        .lz-back:hover .lz-arr { transform:translateX(-3px); }
        .lz-arr { display:inline-block; transition:transform 0.2s ease; }
        .lz-bsep { width:1px; height:16px; background:rgba(229,224,198,0.08); }
        .lz-blabel { font-size:13px; font-weight:400; color:rgba(229,224,198,0.22); letter-spacing:0.03em; }

        .lz-wrap { max-width:1160px; margin:0 auto; padding:24px 40px 100px; display:grid; grid-template-columns:1fr 1fr; gap:24px; align-items:start; }
        @media(max-width:860px){ .lz-wrap { grid-template-columns:1fr; padding:20px 20px 80px; } }

        .lz-pcard { background:rgba(255,255,255,0.028); border:1px solid rgba(201,169,110,0.13); border-radius:20px; overflow:hidden; }
        .lz-gallery { position:relative; width:100%; aspect-ratio:16/11; overflow:hidden; background:rgba(255,255,255,0.02); }
        .lz-gallery-img { position:absolute; inset:0; width:100%; height:100%; object-fit:cover; }
        .lz-gallery-ph { position:absolute; inset:0; display:flex; align-items:center; justify-content:center; font-size:80px; color:rgba(201,169,110,0.1); }
        .lz-dots { position:absolute; bottom:10px; left:50%; transform:translateX(-50%); display:flex; gap:5px; z-index:10; }
        .lz-dot { width:5px; height:5px; border-radius:50%; background:rgba(229,224,198,0.3); transition:all 0.25s ease; cursor:pointer; }
        .lz-dot.on { background:#c9a96e; width:16px; border-radius:3px; }
        .lz-thumbrow { display:flex; gap:8px; padding:12px 18px; border-bottom:1px solid rgba(201,169,110,0.07); overflow-x:auto; scrollbar-width:none; }
        .lz-thumbrow::-webkit-scrollbar { display:none; }
        .lz-t { width:44px; height:44px; flex-shrink:0; border-radius:7px; overflow:hidden; cursor:pointer; border:1.5px solid transparent; transition:all 0.22s cubic-bezier(0.22,1,0.36,1); opacity:0.4; }
        .lz-t:hover { opacity:0.75; transform:translateY(-2px); }
        .lz-t.on { border-color:#c9a96e; opacity:1; }
        .lz-t img { width:100%; height:100%; object-fit:cover; display:block; }

        .lz-pinfo { padding:22px 26px 28px; }
        .lz-ptitle { font-size:24px; font-weight:700; color:rgb(229,224,198); letter-spacing:-0.01em; line-height:1.2; }
        .lz-pdesc-top { font-size:13px; line-height:1.75; font-weight:300; color:rgba(229,224,198,0.42); margin-top:10px; margin-bottom:20px; }
        .lz-gold-line { height:1px; background:linear-gradient(90deg,rgba(201,169,110,0.4),rgba(201,169,110,0.07),transparent); margin-bottom:20px; }
        .lz-pricerow { display:flex; align-items:baseline; gap:8px; margin-bottom:22px; }
        .lz-plabel { font-size:11px; font-weight:500; color:rgba(229,224,198,0.3); letter-spacing:0.12em; text-transform:uppercase; }
        .lz-pnum { font-size:30px; font-weight:800; color:#c9a96e; letter-spacing:-0.01em; line-height:1; }
        .lz-pcur { font-size:13px; color:rgba(201,169,110,0.5); font-weight:500; }
        .lz-specs { display:flex; flex-direction:column; gap:9px; margin-bottom:20px; }
        .lz-srow { display:flex; align-items:center; }
        .lz-sk { font-size:12px; font-weight:400; color:rgba(229,224,198,0.3); letter-spacing:0.06em; min-width:105px; flex-shrink:0; }
        .lz-sdot { width:3px; height:3px; border-radius:50%; background:rgba(201,169,110,0.28); flex-shrink:0; margin-right:10px; }
        .lz-sv { font-size:13.5px; font-weight:500; color:rgba(229,224,198,0.78); }
        .lz-feats { display:flex; flex-wrap:wrap; gap:6px; padding-top:16px; border-top:1px solid rgba(201,169,110,0.07); }
        .lz-ftag { font-size:11px; font-weight:500; color:rgba(201,169,110,0.7); background:rgba(201,169,110,0.07); border:1px solid rgba(201,169,110,0.13); border-radius:99px; padding:3px 12px; letter-spacing:0.03em; }

        .lz-right { display:flex; flex-direction:column; gap:14px; }
        .lz-sec-label { font-size:10px; font-weight:600; color:rgba(229,224,198,0.25); letter-spacing:0.22em; text-transform:uppercase; padding:0 2px 2px; }

        /* ── Auction card base ── */
        .lz-acard { background:rgba(255,255,255,0.028); border:1px solid rgba(201,169,110,0.1); border-radius:16px; padding:20px 22px; cursor:pointer; user-select:none; position:relative; overflow:hidden; transition:all 0.28s cubic-bezier(0.22,1,0.36,1); }
        .lz-acard::before { content:''; position:absolute; inset:0; background:linear-gradient(135deg,rgba(201,169,110,0.05),transparent 55%); opacity:0; transition:opacity 0.28s ease; pointer-events:none; border-radius:16px; }
        .lz-acard:hover { border-color:rgba(201,169,110,0.26); transform:translateY(-2px); box-shadow:0 14px 44px rgba(0,0,0,0.32); }
        .lz-acard:hover::before { opacity:1; }
        .lz-acard.sel { border-color:rgba(201,169,110,0.55); background:rgba(201,169,110,0.05); box-shadow:0 0 0 1px rgba(201,169,110,0.16),0 14px 44px rgba(0,0,0,0.32); transform:translateY(-2px); }
        .lz-acard.sel::before { opacity:1; }

        /* ── Already-joined card ── */
        .lz-acard.joined { border-color:rgba(74,222,128,0.28); background:rgba(74,222,128,0.025); }
        .lz-acard.joined::before { background:linear-gradient(135deg,rgba(74,222,128,0.04),transparent 55%); }
        .lz-acard.joined:hover { border-color:rgba(74,222,128,0.52); background:rgba(74,222,128,0.05); box-shadow:0 14px 44px rgba(0,0,0,0.32),0 0 0 1px rgba(74,222,128,0.1); transform:translateY(-2px); }
        .lz-acard.joined:hover::before { opacity:1; }

        /* Registered badge */
        .lz-joined-badge { display:inline-flex; align-items:center; gap:5px; padding:4px 10px; border-radius:99px; background:rgba(74,222,128,0.1); border:1px solid rgba(74,222,128,0.28); color:#4ade80; font-size:9px; font-weight:800; letter-spacing:0.14em; text-transform:uppercase; margin-bottom:11px; animation:lz-joined-in 0.3s ease; }
        .lz-joined-dot { width:5px; height:5px; border-radius:50%; background:#4ade80; animation:lz-pulse 1.5s ease-in-out infinite; flex-shrink:0; }

        /* Rejoin button */
        .lz-rejoin-btn { width:100%; height:42px; border:1px solid rgba(74,222,128,0.35); border-radius:10px; background:rgba(74,222,128,0.06); color:#4ade80; font-family:'Outfit',system-ui,sans-serif; font-size:10px; font-weight:800; letter-spacing:0.18em; text-transform:uppercase; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:8px; transition:all 0.25s cubic-bezier(0.22,1,0.36,1); margin-top:14px; }
        .lz-rejoin-btn:hover { background:rgba(74,222,128,0.12); border-color:rgba(74,222,128,0.6); transform:translateY(-1px); box-shadow:0 6px 22px rgba(74,222,128,0.12); }
        .lz-rejoin-arrow { font-size:14px; transition:transform 0.2s ease; }
        .lz-rejoin-btn:hover .lz-rejoin-arrow { transform:translateX(4px); }

        .lz-ahead { display:flex; align-items:center; justify-content:space-between; margin-bottom:13px; }
        .lz-anum { font-size:13px; font-weight:500; color:rgba(229,224,198,0.3); }
        .lz-anum strong { font-size:17px; font-weight:700; color:rgba(229,224,198,0.85); margin-left:3px; }
        .lz-pill { display:inline-flex; align-items:center; gap:5px; padding:3px 10px; border-radius:99px; font-size:9px; font-weight:700; letter-spacing:0.14em; text-transform:uppercase; }
        .lz-pdot { width:5px; height:5px; border-radius:50%; flex-shrink:0; }
        .lz-pill.live { background:rgba(74,222,128,0.1); color:#4ade80; }
        .lz-pill.live .lz-pdot { background:#4ade80; animation:lz-pulse 1.5s ease-in-out infinite; }
        .lz-pill.upcoming { background:rgba(147,197,253,0.1); color:#93c5fd; }
        .lz-pill.upcoming .lz-pdot { background:#93c5fd; }

        .lz-atime { display:flex; align-items:center; gap:8px; margin-bottom:15px; flex-wrap:wrap; }
        .lz-tchip { font-size:12px; font-weight:400; color:rgba(229,224,198,0.42); display:flex; align-items:center; gap:5px; }
        .lz-tsep { color:rgba(229,224,198,0.15); }

        .lz-amoney { display:flex; padding:13px 0; border-top:1px solid rgba(201,169,110,0.08); border-bottom:1px solid rgba(201,169,110,0.08); margin-bottom:15px; }
        .lz-mblock { flex:1; }
        .lz-mblock + .lz-mblock { border-left:1px solid rgba(201,169,110,0.08); padding-left:18px; }
        .lz-mlabel { font-size:9px; font-weight:600; color:rgba(229,224,198,0.25); letter-spacing:0.18em; text-transform:uppercase; margin-bottom:5px; }
        .lz-mval { font-size:20px; font-weight:800; color:#c9a96e; line-height:1; }
        .lz-mval.free { font-size:16px; color:#4ade80; font-weight:700; }
        .lz-mcur { font-size:11px; color:rgba(201,169,110,0.42); margin-left:2px; font-weight:500; }

        .lz-lotag { display:inline-block; font-size:9px; font-weight:700; letter-spacing:0.12em; text-transform:uppercase; color:rgba(201,169,110,0.55); background:rgba(201,169,110,0.07); border:1px solid rgba(201,169,110,0.13); border-radius:5px; padding:2px 8px; margin-bottom:11px; }

        .lz-afoot { display:flex; align-items:center; justify-content:space-between; }
        .lz-afoot-t { font-size:12px; font-weight:400; color:rgba(229,224,198,0.22); transition:color 0.22s ease; }
        .lz-acard.sel .lz-afoot-t { color:rgba(201,169,110,0.65); }
        .lz-radio { width:26px; height:26px; border-radius:50%; border:1.5px solid rgba(229,224,198,0.12); background:rgba(255,255,255,0.02); display:flex; align-items:center; justify-content:center; transition:all 0.28s cubic-bezier(0.34,1.56,0.64,1); flex-shrink:0; }
        .lz-radio.on { border-color:#c9a96e; background:#c9a96e; box-shadow:0 0 0 3px rgba(201,169,110,0.14); }
        .lz-rdot { width:9px; height:9px; border-radius:50%; background:#09111a; transform:scale(0); transition:transform 0.28s cubic-bezier(0.34,1.56,0.64,1); }
        .lz-radio.on .lz-rdot { transform:scale(1); animation:lz-radio-in 0.3s cubic-bezier(0.34,1.56,0.64,1); }
        .lz-acard:active .lz-radio { transform:scale(0.88); }

        .lz-empty { text-align:center; padding:44px 20px; background:rgba(255,255,255,0.02); border:1px solid rgba(201,169,110,0.07); border-radius:16px; }
        .lz-empty-i { font-size:30px; opacity:0.2; margin-bottom:12px; }
        .lz-empty-t { font-size:14px; font-weight:500; color:rgba(229,224,198,0.4); margin-bottom:4px; }
        .lz-empty-s { font-size:12px; color:rgba(229,224,198,0.2); }

        .lz-cocard { background:rgba(255,255,255,0.028); border:1px solid rgba(201,169,110,0.13); border-radius:20px; overflow:hidden; }
        .lz-coinner { padding:22px 24px 24px; }
        .lz-selinfo { font-size:14px; color:rgba(229,224,198,0.28); margin-bottom:16px; letter-spacing:0.04em; }
        .lz-selinfo strong { color:rgba(229,224,198,0.5); }

        .lz-terms { display:flex; align-items:flex-start; gap:12px; padding:13px 15px; border-radius:12px; border:1px solid rgba(201,169,110,0.1); cursor:pointer; transition:all 0.22s ease; margin-bottom:18px; user-select:none; }
        .lz-terms:hover { border-color:rgba(201,169,110,0.22); background:rgba(201,169,110,0.03); }
        .lz-terms.on { border-color:rgba(201,169,110,0.38); background:rgba(201,169,110,0.05); }
        .lz-chk { width:22px; height:22px; flex-shrink:0; margin-top:1px; border-radius:6px; border:1.5px solid rgba(229,224,198,0.12); background:rgba(255,255,255,0.02); display:flex; align-items:center; justify-content:center; transition:all 0.25s cubic-bezier(0.34,1.56,0.64,1); }
        .lz-chk.on { border-color:#c9a96e; background:#c9a96e; box-shadow:0 0 0 3px rgba(201,169,110,0.14); }
        .lz-chkmark { font-size:11px; font-weight:900; color:#09111a; opacity:0; transform:scale(0) rotate(-20deg); transition:all 0.25s cubic-bezier(0.34,1.56,0.64,1); }
        .lz-chk.on .lz-chkmark { opacity:1; transform:scale(1) rotate(0); animation:lz-check 0.3s cubic-bezier(0.34,1.56,0.64,1); }
        .lz-ttext { font-size:12.5px; line-height:1.65; color:rgba(229,224,198,0.38); }
        .lz-tlink { color:#c9a96e; text-decoration:underline; text-underline-offset:2px; cursor:pointer; font-weight:600; background:none; border:none; font-family:inherit; font-size:inherit; padding:0; display:inline; }
        .lz-tlink:hover { color:#e0c080; }

        .lz-total { display:flex; align-items:center; justify-content:space-between; padding:16px 0; margin-bottom:18px; border-top:1px solid rgba(201,169,110,0.1); border-bottom:1px solid rgba(201,169,110,0.1); }
        .lz-tlabel { font-size:13px; font-weight:600; color:rgba(229,224,198,0.25); letter-spacing:0.18em; text-transform:uppercase; }
        .lz-tnum { font-size:28px; font-weight:800; color:rgb(229,224,198); letter-spacing:-0.01em; line-height:1; }
        .lz-tcur { font-size:13px; color:rgba(229,224,198,0.35); margin-left:4px; font-weight:500; }
        .lz-tfree { font-size:16px; font-weight:700; color:#4ade80; }
        .lz-tempty { font-size:22px; color:rgba(229,224,198,0.15); font-weight:300; }

        .lz-cta { width:100%; height:52px; border:none; border-radius:12px; font-family:'Outfit',system-ui,sans-serif; font-size:12px; font-weight:700; letter-spacing:0.14em; text-transform:uppercase; cursor:pointer; position:relative; overflow:hidden; display:flex; align-items:center; justify-content:center; gap:10px; transition:all 0.28s cubic-bezier(0.22,1,0.36,1); }
        .lz-cta.go { background:linear-gradient(135deg,#c9a96e 0%,#b8934a 100%); color:#09111a; box-shadow:0 4px 22px rgba(201,169,110,0.2); }
        .lz-cta.go:hover { transform:translateY(-2px); box-shadow:0 10px 34px rgba(201,169,110,0.3); }
        .lz-cta.go:active { transform:translateY(0); }
        .lz-cta.off { background:rgba(255,255,255,0.03); color:rgba(229,224,198,0.2); border:1px solid rgba(229,224,198,0.05); cursor:not-allowed; }
        .lz-shine { position:absolute; inset:0; background:linear-gradient(90deg,transparent,rgba(255,255,255,0.12),transparent); transform:translateX(-200%); transition:transform 0.7s ease; pointer-events:none; }
        .lz-cta.go:hover .lz-shine { transform:translateX(200%); }
        .lz-spinner { width:15px; height:15px; border:2px solid rgba(9,17,26,0.2); border-top-color:#09111a; border-radius:50%; animation:lz-spin 0.8s linear infinite; }
        .lz-secure { text-align:center; font-size:10px; color:rgba(229,224,198,0.18); margin-top:12px; letter-spacing:0.1em; }

        /* ── Promo code ── */
        .lz-promo-btn { width:100%; height:44px; border:1px dashed rgba(201,169,110,0.35); border-radius:12px; background:transparent; color:rgba(201,169,110,0.7); font-family:'Outfit',system-ui,sans-serif; font-size:11px; font-weight:700; letter-spacing:0.16em; text-transform:uppercase; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:8px; transition:all 0.25s cubic-bezier(0.22,1,0.36,1); margin-bottom:14px; }
        .lz-promo-btn:hover { border-color:rgba(201,169,110,0.65); color:#c9a96e; background:rgba(201,169,110,0.05); }
        .lz-promo-applied { display:flex; align-items:center; justify-content:space-between; padding:10px 14px; border-radius:10px; background:rgba(74,222,128,0.07); border:1px solid rgba(74,222,128,0.28); margin-bottom:14px; }
        .lz-promo-applied-left { display:flex; align-items:center; gap:8px; }
        .lz-promo-tag { font-family:monospace; font-size:13px; font-weight:700; color:#4ade80; letter-spacing:0.06em; }
        .lz-promo-desc { font-size:11px; color:rgba(74,222,128,0.7); font-weight:500; }
        .lz-promo-remove { background:none; border:none; cursor:pointer; color:rgba(229,224,198,0.25); font-size:16px; padding:0 2px; transition:color 0.2s; line-height:1; }
        .lz-promo-remove:hover { color:#f87171; }
        .lz-promo-info { font-size:11px; color:rgba(201,169,110,0.6); padding:8px 12px; border-radius:8px; background:rgba(201,169,110,0.06); border:1px solid rgba(201,169,110,0.14); margin-bottom:14px; line-height:1.5; }

        /* ── Promo modal overlay ── */
        .lz-promo-overlay { position:fixed; inset:0; z-index:2000; background:rgba(4,8,16,0.82); backdrop-filter:blur(12px); display:flex; align-items:center; justify-content:center; padding:20px; animation:lz-fadein 0.2s ease both; }
        .lz-promo-modal { background:linear-gradient(160deg,#0f1e2e 0%,#080d1a 100%); border:1px solid rgba(201,169,110,0.22); border-radius:24px; width:100%; max-width:420px; padding:32px 28px; box-shadow:0 40px 80px rgba(0,0,0,0.7); position:relative; }
        .lz-promo-modal::before { content:''; position:absolute; top:0; left:0; right:0; height:2px; background:linear-gradient(90deg,transparent,rgba(201,169,110,0.6),transparent); border-radius:24px 24px 0 0; }
        .lz-promo-close { position:absolute; top:16px; right:16px; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.08); border-radius:8px; width:32px; height:32px; cursor:pointer; color:rgba(229,224,198,0.4); font-size:18px; display:flex; align-items:center; justify-content:center; transition:all 0.2s; line-height:1; }
        .lz-promo-close:hover { background:rgba(255,61,90,0.12); color:#f87171; border-color:rgba(255,61,90,0.3); }
        .lz-promo-icon { width:56px; height:56px; border-radius:16px; background:rgba(201,169,110,0.1); border:1px solid rgba(201,169,110,0.2); display:flex; align-items:center; justify-content:center; font-size:24px; margin:0 auto 16px; }
        .lz-promo-title { font-size:20px; font-weight:700; color:rgb(229,224,198); text-align:center; margin-bottom:6px; }
        .lz-promo-subtitle { font-size:13px; color:rgba(229,224,198,0.38); text-align:center; margin-bottom:24px; line-height:1.6; }
        .lz-promo-inputrow { position:relative; margin-bottom:10px; }
        .lz-promo-input { width:100%; height:50px; background:rgba(255,255,255,0.04); border:1.5px solid rgba(201,169,110,0.2); border-radius:12px; color:rgb(229,224,198); font-family:monospace; font-size:16px; font-weight:700; letter-spacing:0.1em; padding:0 50px 0 18px; outline:none; text-transform:uppercase; transition:border-color 0.2s; }
        .lz-promo-input::placeholder { font-family:'Outfit',system-ui,sans-serif; font-weight:400; letter-spacing:0.04em; color:rgba(229,224,198,0.2); font-size:13px; }
        .lz-promo-input:focus { border-color:rgba(201,169,110,0.55); }
        .lz-promo-input-icon { position:absolute; right:16px; top:50%; transform:translateY(-50%); font-size:18px; pointer-events:none; }
        .lz-promo-err { font-size:12px; color:#f87171; margin-bottom:14px; padding:8px 12px; border-radius:8px; background:rgba(248,113,113,0.07); border:1px solid rgba(248,113,113,0.2); line-height:1.5; }
        .lz-promo-err.info { color:rgba(201,169,110,0.8); background:rgba(201,169,110,0.06); border-color:rgba(201,169,110,0.18); }
        .lz-promo-apply { width:100%; height:50px; border:none; border-radius:12px; background:linear-gradient(135deg,#c9a96e 0%,#b8934a 100%); color:#09111a; font-family:'Outfit',system-ui,sans-serif; font-size:12px; font-weight:800; letter-spacing:0.16em; text-transform:uppercase; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:8px; transition:all 0.25s cubic-bezier(0.22,1,0.36,1); box-shadow:0 4px 22px rgba(201,169,110,0.25); }
        .lz-promo-apply:hover { transform:translateY(-2px); box-shadow:0 10px 34px rgba(201,169,110,0.35); }
        .lz-promo-apply:disabled { opacity:0.5; cursor:not-allowed; transform:none; }
        .lz-promo-hint { text-align:center; font-size:11px; color:rgba(229,224,198,0.18); margin-top:14px; letter-spacing:0.06em; }
      `}</style>

      <div className="lz">
        <div className="lz-bar">
          <button className="lz-back" onClick={() => navigate(-1)}>
            <span className="lz-arr">←</span> Back
          </button>
          <div className="lz-bsep" />
          <span className="lz-blabel">Auction Registration</span>
        </div>

        <div className="lz-wrap">
          {/* ── LEFT: product card ── */}
          <div className="lz-pcard">
            <div className="lz-gallery">
              {imgAnimating && prevIndex !== null && allImages[prevIndex] && (
                <img
                  src={allImages[prevIndex]}
                  alt=""
                  className={`lz-gallery-img ${imgDir === "next" ? "lz-slide-cur-next" : "lz-slide-cur-prev"}`}
                  style={{ zIndex: 1 }}
                  onError={(e: any) => (e.currentTarget.style.display = "none")}
                />
              )}
              {allImages[imgIndex] ? (
                <img
                  key={imgIndex}
                  src={allImages[imgIndex]}
                  alt={product.title}
                  className={`lz-gallery-img ${imgAnimating ? (imgDir === "next" ? "lz-slide-inc-next" : "lz-slide-inc-prev") : ""}`}
                  style={{ zIndex: 2 }}
                  onError={(e: any) => (e.currentTarget.style.display = "none")}
                />
              ) : (
                <div className="lz-gallery-ph">{product.title.charAt(0)}</div>
              )}
              {allImages.length > 1 && (
                <div className="lz-dots">
                  {allImages.map((_, i) => (
                    <div
                      key={i}
                      className={`lz-dot ${i === imgIndex ? "on" : ""}`}
                      onClick={() => goTo(i, i > imgIndex ? "next" : "prev")}
                    />
                  ))}
                </div>
              )}
            </div>

            {allImages.length > 1 && (
              <div className="lz-thumbrow">
                {allImages.map((url, i) => (
                  <div
                    key={i}
                    className={`lz-t ${i === imgIndex ? "on" : ""}`}
                    onClick={() => goTo(i, i > imgIndex ? "next" : "prev")}
                  >
                    <img
                      src={url}
                      alt=""
                      onError={(e: any) =>
                        (e.currentTarget.src = "/fallback.jpg")
                      }
                    />
                  </div>
                ))}
              </div>
            )}

            <div className="lz-pinfo">
              <div className="lz-ptitle">{product.title}</div>
              {product.description && (
                <div className="lz-pdesc-top">{product.description}</div>
              )}
              <div className="lz-gold-line" />
              <div className="lz-pricerow">
                <span className="lz-plabel">Starting price</span>
                <span className="lz-pnum">
                  {product.price.toLocaleString()}
                </span>
                <span className="lz-pcur">EGP</span>
              </div>
              <div className="lz-specs">
                {product.brand && (
                  <div className="lz-srow">
                    <span className="lz-sk">Brand</span>
                    <span className="lz-sdot" />
                    <span className="lz-sv">{product.brand}</span>
                  </div>
                )}
                {product.model && (
                  <div className="lz-srow">
                    <span className="lz-sk">Model</span>
                    <span className="lz-sdot" />
                    <span className="lz-sv">{product.model}</span>
                  </div>
                )}
                <div className="lz-srow">
                  <span className="lz-sk">Category</span>
                  <span className="lz-sdot" />
                  <span className="lz-sv">{product.categoryName}</span>
                </div>
                <div className="lz-srow">
                  <span className="lz-sk">Availability</span>
                  <span className="lz-sdot" />
                  <span
                    className="lz-sv"
                    style={{
                      color: product.quantity > 0 ? "#4ade80" : "#f87171",
                    }}
                  >
                    {product.quantity > 0
                      ? `${product.quantity} units`
                      : "Out of stock"}
                  </span>
                </div>
                <div className="lz-srow">
                  <span className="lz-sk">Sessions</span>
                  <span className="lz-sdot" />
                  <span className="lz-sv">{product.totalAuctions} total</span>
                </div>
              </div>
              {product.features.length > 0 && (
                <div className="lz-feats">
                  {product.features.map((f, i) => (
                    <span key={i} className="lz-ftag">
                      {f}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── RIGHT ── */}
          <div className="lz-right">
            <div className="lz-sec-label">Choose your session</div>

            {auctions.length === 0 ? (
              <div className="lz-empty">
                <div className="lz-empty-i">🔍</div>
                <div className="lz-empty-t">No active auctions</div>
                <div className="lz-empty-s">
                  Check back soon for upcoming sessions
                </div>
              </div>
            ) : (
              auctions.map((a) => {
                const isJoined = joinedAuctionIds.has(a.id);
                const sel = !isJoined && selectedAuctions.has(a.id);

                return (
                  <div
                    key={a.id}
                    className={`lz-acard ${isJoined ? "joined" : sel ? "sel" : ""}`}
                    onClick={() => toggleAuction(a.id)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === "Enter" && toggleAuction(a.id)}
                  >
                    <div className="lz-ahead">
                      <div className="lz-anum">
                        Auction <strong>#{a.auctionNumber}</strong>
                      </div>
                      <div className={`lz-pill ${a.status}`}>
                        <div className="lz-pdot" />
                        {a.status}
                      </div>
                    </div>

                    {/* Badge row — green "Registered" for joined, or gold "last offer" tag */}
                    {isJoined ? (
                      <div className="lz-joined-badge">
                        <div className="lz-joined-dot" />
                        Registered ✓
                      </div>
                    ) : (
                      a.lastOfferEnabled && (
                        <div className="lz-lotag">⚡ Last offer enabled</div>
                      )
                    )}

                    <div className="lz-atime">
                      <div className="lz-tchip">📅 {fmtDate(a.startTime)}</div>
                      <span className="lz-tsep">·</span>
                      <div className="lz-tchip">
                        {fmtTime(a.startTime)} — {fmtTime(a.endTime)}
                      </div>
                    </div>

                    <div className="lz-amoney">
                      <div className="lz-mblock">
                        <div className="lz-mlabel">Starting price</div>
                        <span className="lz-mval">
                          {a.startingPrice.toLocaleString()}
                        </span>
                        <span className="lz-mcur">EGP</span>
                      </div>
                      <div className="lz-mblock">
                        <div className="lz-mlabel">Entry fee</div>
                        {a.entryType === "free" ? (
                          <div className="lz-mval free">Free</div>
                        ) : isJoined ? (
                          /* Already paid — don't show the amount again */
                          <div
                            className="lz-mval free"
                            style={{ fontSize: 14 }}
                          >
                            Paid ✓
                          </div>
                        ) : (
                          <>
                            <span className="lz-mval">
                              {a.entryFee.toLocaleString()}
                            </span>
                            <span className="lz-mcur">EGP</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Footer: rejoin CTA for joined, radio select for new */}
                    {isJoined ? (
                      <button
                        className="lz-rejoin-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/auctions/${a.id}`);
                        }}
                      >
                        Re-enter Auction Room
                        <span className="lz-rejoin-arrow">→</span>
                      </button>
                    ) : (
                      <div className="lz-afoot">
                        <span className="lz-afoot-t">
                          {sel
                            ? "Selected — tap to remove"
                            : "Tap to select this session"}
                        </span>
                        <div className={`lz-radio ${sel ? "on" : ""}`}>
                          <div className="lz-rdot" />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}

            {/* Checkout card — only shown when there are unjoined auctions available */}
            {auctions.some((a) => !joinedAuctionIds.has(a.id)) && (
              <div className="lz-cocard">
                <div className="lz-coinner">
                  {selectedList.length > 0 && (
                    <div className="lz-selinfo">
                      <strong>{selectedList.length}</strong> new session
                      {selectedList.length > 1 ? "s" : ""} selected
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

                  <div
                    className={`lz-terms ${agreed ? "on" : ""}`}
                    onClick={() => setAgreed((v) => !v)}
                  >
                    <div className={`lz-chk ${agreed ? "on" : ""}`}>
                      <span className="lz-chkmark">✓</span>
                    </div>
                    <div className="lz-ttext">
                      I agree to the{" "}
                      <button
                        className="lz-tlink"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate("/terms");
                        }}
                      >
                        Loqta Zone Terms & Conditions
                      </button>{" "}
                      and confirm all entries are final and non-refundable.
                    </div>
                  </div>

                  {/* ── Promo code section ── */}
                  {!appliedVoucher ? (
                    <button
                      className="lz-promo-btn"
                      onClick={() => setShowPromoModal(true)}
                    >
                      🏷️ Have a promo code?
                    </button>
                  ) : (
                    <>
                      <div className="lz-promo-applied">
                        <div className="lz-promo-applied-left">
                          <span style={{ fontSize: 16 }}>✅</span>
                          <div>
                            <div className="lz-promo-tag">
                              {appliedVoucher.code}
                            </div>
                            <div className="lz-promo-desc">
                              {appliedVoucher.type === "join"
                                ? "Entry fee waived"
                                : appliedVoucher.type === "entry_discount"
                                  ? `${appliedVoucher.discountAmount?.toLocaleString() ?? 0} EGP off entry fee`
                                  : `${appliedVoucher.discountAmount?.toLocaleString() ?? 0} EGP off final price`}
                              {/* Show partial match note */}
                              {appliedVoucher.applicableAuctions.length > 0 &&
                                (() => {
                                  const covered = selectedList.filter((a) =>
                                    appliedVoucher.applicableAuctions.includes(
                                      a.id,
                                    ),
                                  ).length;
                                  if (covered < selectedList.length) {
                                    return (
                                      <span
                                        style={{
                                          color: "rgba(201,169,110,0.7)",
                                          marginLeft: 6,
                                        }}
                                      >
                                        · {covered}/{selectedList.length}{" "}
                                        auctions
                                      </span>
                                    );
                                  }
                                  return null;
                                })()}
                            </div>
                          </div>
                        </div>
                        <button
                          className="lz-promo-remove"
                          onClick={() => setAppliedVoucher(null)}
                          title="Remove promo"
                        >
                          ✕
                        </button>
                      </div>
                      {/* Partial match explanation */}
                      {appliedVoucher.applicableAuctions.length > 0 &&
                        selectedList.some(
                          (a) =>
                            !appliedVoucher.applicableAuctions.includes(a.id),
                        ) && (
                          <div className="lz-promo-info">
                            ⚠️ This code only applies to{" "}
                            <strong>
                              {
                                selectedList.filter((a) =>
                                  appliedVoucher.applicableAuctions.includes(
                                    a.id,
                                  ),
                                ).length
                              }
                            </strong>{" "}
                            of your selected auctions. The remaining{" "}
                            {
                              selectedList.filter(
                                (a) =>
                                  !appliedVoucher.applicableAuctions.includes(
                                    a.id,
                                  ),
                              ).length
                            }{" "}
                            will be charged at full price.
                          </div>
                        )}
                      {appliedVoucher.type === "discount" && (
                        <div className="lz-promo-info">
                          ℹ️ This discount applies to your{" "}
                          <strong>final winning bid price</strong>, not the
                          entry fee. It'll be applied at payment time.
                        </div>
                      )}
                    </>
                  )}

                  <div className="lz-total">
                    <span className="lz-tlabel">Total payment</span>
                    {selectedList.length === 0 ? (
                      <span className="lz-tempty">—</span>
                    ) : total === 0 ? (
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "flex-end",
                          gap: 2,
                        }}
                      >
                        <span className="lz-tfree">Free Entry</span>
                        {appliedVoucher && rawTotal > 0 && (
                          <span
                            style={{
                              fontSize: 11,
                              color: "rgba(74,222,128,0.45)",
                              textDecoration: "line-through",
                            }}
                          >
                            was {rawTotal.toLocaleString()} EGP
                          </span>
                        )}
                      </div>
                    ) : (
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "flex-end",
                          gap: 2,
                        }}
                      >
                        <span>
                          <span className="lz-tnum">
                            {total.toLocaleString()}
                          </span>
                          <span className="lz-tcur">EGP</span>
                        </span>
                        {appliedVoucher &&
                          (appliedVoucher.type === "entry_discount" ||
                            appliedVoucher.type === "join") &&
                          rawTotal > total && (
                            <span
                              style={{
                                fontSize: 11,
                                color: "rgba(74,222,128,0.45)",
                                textDecoration: "line-through",
                              }}
                            >
                              was {rawTotal.toLocaleString()} EGP
                            </span>
                          )}
                      </div>
                    )}
                  </div>

                  <button
                    className={`lz-cta ${canCheckout ? "go" : "off"}`}
                    onClick={handleCheckout}
                    disabled={!canCheckout || checking}
                  >
                    <div className="lz-shine" />
                    {checking ? (
                      <>
                        <div className="lz-spinner" /> Processing…
                      </>
                    ) : canCheckout ? (
                      total === 0 ? (
                        "Register for Free"
                      ) : (
                        `Checkout · ${total.toLocaleString()} EGP`
                      )
                    ) : selectedList.length === 0 ? (
                      "Select a new session to continue"
                    ) : (
                      "Please agree to terms"
                    )}
                  </button>

                  <div className="lz-secure">
                    🔒 Secured by Loqta Zone · All entries are final
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Promo Code Modal ── */}
      {showPromoModal && (
        <PromoCodeModal
          selectedAuctions={selectedList}
          userId={user?.uid ?? ""}
          onApply={(voucher ) => {
            setAppliedVoucher(voucher);
            setShowPromoModal(false);
          }}
          onClose={() => setShowPromoModal(false)}
        />
      )}
    </>
  );
}
