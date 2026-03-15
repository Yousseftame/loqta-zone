/**
 * AuctionLivePage.tsx — /auctions/:auctionId — fully localised (EN/AR)
 * Logic is identical to the original; only display strings use t().
 */

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  doc,
  getDoc,
  onSnapshot,
  collection,
  query,
  orderBy,
  Timestamp,
} from "firebase/firestore";
import { db, functions } from "@/firebase/firebase";
import { useAuth } from "@/store/AuthContext/AuthContext";
import { placeBid } from "@/service/auctions/bidService";
import { httpsCallable } from "firebase/functions";
import { useTranslation } from "react-i18next";
import WinnerCelebration from "@/components/WinnerCelebration/Winnercelebration";
import PostAuctionModal from "@/components/PostAuctionModal/PostAuctionModal";
import LastOfferModal from "@/components/LastOfferModal/LastOfferModal";
import toast from "react-hot-toast";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AuctionData {
  id: string;
  productId: string;
  auctionNumber: number;
  currentBid: number;
  startingPrice: number;
  minimumIncrement: number;
  bidType: "fixed" | "free";
  fixedBidValue: number | null;
  endTime: Date;
  startTime: Date;
  isActive: boolean;
  totalBids: number;
  totalParticipants: number;
  entryType: "free" | "paid";
  entryFee: number;
  winnerId: string | null;
  winningBid: number | null;
  lastOfferEnabled: boolean;
}

interface BidEntry {
  id: string;
  userId: string;
  bidderName: string;
  amount: number;
  createdAt: Date;
}
interface ProductData {
  title: string;
  thumbnail: string | null;
  images: string[];
  brand: string;
  model: string;
  description: string;
}

function toDate(v: any): Date {
  if (v instanceof Timestamp) return v.toDate();
  if (v?.seconds) return new Date(v.seconds * 1000);
  return new Date(v);
}

type AuctionStatus = "upcoming" | "live" | "ended";

function computeStatus(startTime: Date, endTime: Date): AuctionStatus {
  const now = new Date();
  if (now < startTime) return "upcoming";
  if (now <= endTime) return "live";
  return "ended";
}

function fmtCountdown(ms: number): string {
  if (ms <= 0) return "00:00:00";
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  if (h > 0) return `${pad(h)}:${pad(m)}:${pad(s)}`;
  return `${pad(m)}:${pad(s)}`;
}

function fmtDate(d: Date): string {
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
function fmtTime(d: Date): string {
  return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AuctionLivePage() {
  const { auctionId } = useParams<{ auctionId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === "ar";
  const cur = isRtl ? "جنيه" : "EGP";

  const [auction, setAuction] = useState<AuctionData | null>(null);
  const [product, setProduct] = useState<ProductData | null>(null);
  const [bids, setBids] = useState<BidEntry[]>([]);
  const [isParticipant, setIsParticipant] = useState<boolean | null>(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [bidding, setBidding] = useState(false);
  const [freeBidInput, setFreeBidInput] = useState("");
  const [liveStatus, setLiveStatus] = useState<AuctionStatus>("upcoming");
  const [countdown, setCountdown] = useState("");
  const [countdownMs, setCountdownMs] = useState(0);
  const statusIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fetchedUserIds = useRef<Set<string>>(new Set());
  const [userNames, setUserNames] = useState<Record<string, string>>({});
  const [showCelebration, setShowCelebration] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showLastOffer, setShowLastOffer] = useState(false);
  const [resolvedWinner, setResolvedWinner] = useState<{
    name: string;
    bid: number;
  } | null>(null);
  const winnerResolvedRef = useRef(false);
  const triggerFiredRef = useRef(false);
  const auctionRef = useRef<AuctionData | null>(null);
  const userRef = useRef(user);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  useEffect(() => {
    if (!auctionId || !user) {
      setIsParticipant(false);
      return;
    }
    getDoc(doc(db, "auctions", auctionId, "Participants", user.uid))
      .then((snap) => setIsParticipant(snap.exists()))
      .catch(() => setIsParticipant(false));
  }, [auctionId, user]);

  useEffect(() => {
    if (!auctionId) return;
    const unsub = onSnapshot(
      doc(db, "auctions", auctionId),
      (snap) => {
        if (!snap.exists()) {
          setPageLoading(false);
          return;
        }
        const d = snap.data();
        const auctionData: AuctionData = {
          id: snap.id,
          productId: d.productId ?? "",
          auctionNumber: d.auctionNumber ?? 0,
          currentBid: d.currentBid ?? 0,
          startingPrice: d.startingPrice ?? 0,
          minimumIncrement: d.minimumIncrement ?? 0,
          bidType: d.bidType ?? "free",
          fixedBidValue: d.fixedBidValue ?? null,
          endTime: toDate(d.endTime),
          startTime: toDate(d.startTime),
          isActive: d.isActive ?? true,
          totalBids: d.totalBids ?? 0,
          totalParticipants: d.totalParticipants ?? 0,
          entryType: d.entryType ?? "free",
          entryFee: d.entryFee ?? 0,
          winnerId: d.winnerId ?? null,
          winningBid: d.winningBid ?? null,
          lastOfferEnabled: d.lastOfferEnabled ?? true,
        };
        auctionRef.current = auctionData;
        setAuction(auctionData);
        setPageLoading(false);
      },
      () => setPageLoading(false),
    );
    return () => unsub();
  }, [auctionId]);

  useEffect(() => {
    if (!auction) return;
    if (statusIntervalRef.current) clearInterval(statusIntervalRef.current);
    const tick = () => {
      const status = computeStatus(auction.startTime, auction.endTime);
      setLiveStatus(status);
      const now = new Date();
      const target =
        status === "upcoming" ? auction.startTime : auction.endTime;
      const ms = target.getTime() - now.getTime();
      setCountdownMs(ms);
      setCountdown(fmtCountdown(ms));
      if (status === "ended" && !triggerFiredRef.current && auctionId && user) {
        triggerFiredRef.current = true;
        const resolve = httpsCallable(functions, "triggerResolveAuction");
        resolve({ auctionId }).catch((err) =>
          console.warn("[AuctionLivePage] triggerResolveAuction failed:", err),
        );
      }
    };
    tick();
    statusIntervalRef.current = setInterval(tick, 1000);
    return () => {
      if (statusIntervalRef.current) clearInterval(statusIntervalRef.current);
    };
  }, [auction?.startTime, auction?.endTime]);

  useEffect(() => {
    if (!auctionId) return;
    const q = query(
      collection(db, "auctions", auctionId, "bids"),
      orderBy("amount", "desc"),
    );
    const unsub = onSnapshot(q, (snap) => {
      setBids(
        snap.docs.map((d) => ({
          id: d.id,
          userId: d.data().userId ?? "",
          bidderName: d.data().bidderName ?? "",
          amount: d.data().amount ?? 0,
          createdAt: toDate(d.data().createdAt),
        })),
      );
    });
    return () => unsub();
  }, [auctionId]);

  useEffect(() => {
    if (!bids.length) return;
    const toFetch = bids
      .filter(
        (b) =>
          b.userId &&
          b.userId !== user?.uid &&
          !b.bidderName &&
          !fetchedUserIds.current.has(b.userId),
      )
      .map((b) => b.userId);
    const unique = [...new Set(toFetch)];
    if (!unique.length) return;
    unique.forEach((id) => fetchedUserIds.current.add(id));
    Promise.all(
      unique.map((uid) =>
        getDoc(doc(db, "users", uid)).then((snap) => ({
          uid,
          name: snap.exists()
            ? (snap.data().fullName ??
              snap.data().displayName ??
              snap.data().firstName ??
              `${uid.slice(0, 6)}…`)
            : `${uid.slice(0, 6)}…`,
        })),
      ),
    )
      .then((results) => {
        setUserNames((prev) => {
          const next = { ...prev };
          results.forEach(({ uid, name }) => {
            next[uid] = name;
          });
          return next;
        });
      })
      .catch(() => {});
  }, [bids]);

  useEffect(() => {
    if (!auction?.productId) return;
    getDoc(doc(db, "products", auction.productId)).then((snap) => {
      if (!snap.exists()) return;
      const d = snap.data();
      setProduct({
        title: d.title ?? "",
        thumbnail: d.thumbnail && d.thumbnail !== "null" ? d.thumbnail : null,
        images: Array.isArray(d.images) ? d.images : [],
        brand: d.brand ?? "",
        model: d.model ?? "",
        description: d.description ?? "",
      });
    });
  }, [auction?.productId]);

  useEffect(() => {
    if (!auction || winnerResolvedRef.current || isParticipant !== true) return;
    const hasWinner = auction.winnerId && auction.winnerId !== "NO_WINNER";
    const noWinner = auction.winnerId === "NO_WINNER";

    if (hasWinner) {
      winnerResolvedRef.current = true;
      const fetchAndShow = (fallbackName: string) => {
        const bid = auction.winningBid ?? auction.currentBid;
        setResolvedWinner({ name: fallbackName, bid });
        setShowCelebration(true);
        setTimeout(() => {
          const fresh = auctionRef.current;
          const currentIsWinner = fresh?.winnerId === userRef.current?.uid;
          setShowCelebration(false);
          if (!currentIsWinner && fresh?.lastOfferEnabled)
            setShowLastOffer(true);
          else setShowModal(true);
        }, 10000);
      };
      getDoc(doc(db, "users", auction.winnerId!))
        .then((snap) => {
          const name = snap.exists()
            ? (snap.data().fullName ??
              snap.data().displayName ??
              snap.data().firstName ??
              t("auctionLive.winner"))
            : t("auctionLive.winner");
          fetchAndShow(name);
        })
        .catch(() => fetchAndShow(t("auctionLive.winner")));
    } else if (noWinner) {
      winnerResolvedRef.current = true;
      setResolvedWinner({ name: "—", bid: 0 });
      setShowModal(true);
    }
  }, [auction?.winnerId, isParticipant]);

  const computeFixedBid = useCallback(
    () => (auction?.currentBid ?? 0) + (auction?.fixedBidValue ?? 0),
    [auction],
  );
  const computeMinFreeBid = useCallback(
    () => (auction?.currentBid ?? 0) + (auction?.minimumIncrement ?? 0),
    [auction],
  );

  const handleBid = async (overrideAmount?: number) => {
    if (!auction || !user || !auctionId) return;
    if (liveStatus !== "live") return;
    const amount = overrideAmount ?? Number(freeBidInput);
    if (!amount || isNaN(amount) || amount <= 0) {
      toast.error(t("auctionLive.bidBtn.place"));
      return;
    }
    setBidding(true);
    try {
      await placeBid({ auctionId, userId: user.uid, amount });
      toast.success(`${amount.toLocaleString()} ${cur}`);
      setFreeBidInput("");
    } catch (err: any) {
      toast.error(err?.message ?? t("common.errorGeneric", "Bid failed."));
    } finally {
      setBidding(false);
    }
  };

  const getBidderName = (bid: BidEntry): string => {
    if (bid.userId === user?.uid) return isRtl ? "أنت" : "You";
    if (bid.bidderName) return bid.bidderName;
    return userNames[bid.userId] ?? `${bid.userId.slice(0, 6)}…`;
  };

  const isLive = liveStatus === "live";
  const isUpcoming = liveStatus === "upcoming";
  const isEnded = liveStatus === "ended";
  const canBid = isLive && isParticipant === true && !bidding;
  const productImage = product?.thumbnail ?? product?.images?.[0] ?? null;
  const freeBidNum = Number(freeBidInput);
  const freeBidValid =
    auction?.bidType === "free" &&
    freeBidNum >= computeMinFreeBid() &&
    freeBidNum > 0;
  const isWinner = !!(auction?.winnerId && auction.winnerId === user?.uid);

  if (pageLoading || isParticipant === null) {
    return (
      <div style={S.center}>
        <div style={S.spinner} />
        <style>{`@keyframes lz-spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  if (!auction) {
    return (
      <div style={S.center}>
        <p style={{ color: "rgba(229,224,198,0.6)", fontFamily: "system-ui" }}>
          {t("auctionLive.notFound")}
        </p>
        <button style={S.backBtn} onClick={() => navigate(-1)}>
          {t("auctionLive.goBack")}
        </button>
      </div>
    );
  }

  return (
    <>
      <style>{CSS}</style>
      <div className="al" dir={isRtl ? "rtl" : "ltr"}>
        {/* ── TOP BAR ── */}
        <div className="al-bar">
          <button className="al-back" onClick={() => navigate(-1)}>
            <span className="al-arr">{isRtl ? "→" : "←"}</span>{" "}
            {t("auctionLive.back")}
          </button>
          <div className="al-bsep" />
          <span className="al-blabel">
            {t("auctionLive.auctionNum", { num: auction.auctionNumber })}
          </span>
          <div className="al-bsep" />
          <div className={`al-pill ${liveStatus}`}>
            <div className="al-pdot" />
            {liveStatus}
          </div>
        </div>

        {/* ── MAIN GRID ── */}
        <div className="al-wrap">
          {/* LEFT: product info */}
          <div className="al-left">
            <div className="al-imgcard">
              {productImage ? (
                <img
                  src={productImage}
                  alt={product?.title ?? ""}
                  className="al-img"
                />
              ) : (
                <div className="al-imgph">
                  {product?.title?.charAt(0) ?? "?"}
                </div>
              )}
              {isLive && <div className="al-live-badge">● LIVE</div>}
            </div>

            {product && (
              <div className="al-prodinfo">
                <div className="al-prodtitle">{product.title}</div>
                {product.description && (
                  <div className="al-proddesc">{product.description}</div>
                )}
                <div className="al-prodmeta">
                  {product.brand && (
                    <span className="al-metachip">{product.brand}</span>
                  )}
                  {product.model && (
                    <span className="al-metachip">{product.model}</span>
                  )}
                </div>
              </div>
            )}

            <div className="al-metarow">
              <div className="al-metablock">
                <div className="al-metalabel">
                  {t("auctionLive.participants")}
                </div>
                <div className="al-metaval">{auction.totalParticipants}</div>
              </div>
              <div className="al-metablock">
                <div className="al-metalabel">{t("auctionLive.totalBids")}</div>
                <div className="al-metaval">{auction.totalBids}</div>
              </div>
              <div className="al-metablock">
                <div className="al-metalabel">{t("auctionLive.entry")}</div>
                <div
                  className="al-metaval"
                  style={{
                    color: auction.entryType === "free" ? "#4ade80" : "#c9a96e",
                  }}
                >
                  {auction.entryType === "free"
                    ? t("auctionLive.entryFree")
                    : `${auction.entryFee.toLocaleString()} ${cur}`}
                </div>
              </div>
              <div className="al-metablock">
                <div className="al-metalabel">{t("auctionLive.ends")}</div>
                <div className="al-metaval al-metaval--sm">
                  {fmtDate(auction.endTime)}
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT: bid + history */}
          <div className="al-right">
            <div className="al-bidcard">
              <div className="al-bidcard-top">
                <div>
                  <div className="al-bidlabel">
                    {isEnded
                      ? t("auctionLive.winningBid")
                      : t("auctionLive.currentBid")}
                  </div>
                  <div className="al-bidnum">
                    {auction.currentBid.toLocaleString()}
                    <span className="al-bidcur">{cur}</span>
                  </div>
                </div>
                <div className="al-countdownblock">
                  <div className="al-cdlabel">
                    {isUpcoming
                      ? t("auctionLive.startsIn")
                      : isEnded
                        ? t("auctionLive.ended")
                        : t("auctionLive.endsIn")}
                  </div>
                  <div
                    className={`al-cdnum ${isEnded ? "ended" : countdownMs < 60000 ? "urgent" : ""}`}
                  >
                    {isEnded ? "—" : countdown}
                  </div>
                </div>
              </div>

              <div className="al-bidtype">
                {auction.bidType === "fixed"
                  ? t("auctionLive.bidType.fixed", {
                      amount: (auction.fixedBidValue ?? 0).toLocaleString(),
                    })
                  : t("auctionLive.bidType.free", {
                      amount: auction.minimumIncrement.toLocaleString(),
                    })}
              </div>

              {isParticipant ? (
                <>
                  {auction.bidType === "fixed" ? (
                    <button
                      className={`al-bidbtn ${canBid ? "go" : "off"}`}
                      onClick={() => handleBid(computeFixedBid())}
                      disabled={!canBid}
                    >
                      {bidding ? (
                        <>
                          <div className="al-spinner" />{" "}
                          {t("auctionLive.bidBtn.placing")}
                        </>
                      ) : isUpcoming ? (
                        t("auctionLive.bidBtn.upcoming", {
                          time: fmtTime(auction.startTime),
                        })
                      ) : isEnded ? (
                        t("auctionLive.bidBtn.ended")
                      ) : (
                        <>
                          {t("auctionLive.bidBtn.place", {
                            amount: computeFixedBid().toLocaleString(),
                          })}{" "}
                          <span className="al-bidarrow">
                            {isRtl ? "←" : "→"}
                          </span>
                        </>
                      )}
                    </button>
                  ) : (
                    <div className="al-freebid">
                      <div className="al-inputwrap">
                        <input
                          className="al-input"
                          type="number"
                          placeholder={`${isRtl ? "الحد الأدنى" : "Min"} ${computeMinFreeBid().toLocaleString()} ${cur}`}
                          value={freeBidInput}
                          onChange={(e) => setFreeBidInput(e.target.value)}
                          disabled={!canBid}
                          min={computeMinFreeBid()}
                          style={{ textAlign: isRtl ? "right" : "left" }}
                        />
                        <span className="al-inputcur">{cur}</span>
                      </div>
                      <button
                        className={`al-bidbtn ${canBid && freeBidValid ? "go" : "off"}`}
                        onClick={() => handleBid()}
                        disabled={!canBid || !freeBidValid}
                      >
                        {bidding ? (
                          <>
                            <div className="al-spinner" />{" "}
                            {t("auctionLive.bidBtn.placing")}
                          </>
                        ) : isUpcoming ? (
                          t("auctionLive.bidBtn.upcoming", {
                            time: fmtTime(auction.startTime),
                          })
                        ) : isEnded ? (
                          t("auctionLive.bidBtn.ended")
                        ) : (
                          <>
                            {t("auctionLive.bidBtn.placeFree")}{" "}
                            <span className="al-bidarrow">
                              {isRtl ? "←" : "→"}
                            </span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                  {isLive && (
                    <div className="al-biddesc">
                      {auction.bidType === "fixed"
                        ? t("auctionLive.bidDesc.fixed", {
                            amount: (
                              auction.fixedBidValue ?? 0
                            ).toLocaleString(),
                          })
                        : t("auctionLive.bidDesc.free", {
                            amount: computeMinFreeBid().toLocaleString(),
                          })}
                    </div>
                  )}
                </>
              ) : (
                <div className="al-notjoined">{t("auctionLive.notJoined")}</div>
              )}
            </div>

            {/* Bid history */}
            <div className="al-histcard">
              <div className="al-histtitle">
                {t("auctionLive.bidHistory")}
                <span className="al-histcount">{bids.length}</span>
              </div>
              {bids.length === 0 ? (
                <div className="al-histempty">{t("auctionLive.noBids")}</div>
              ) : (
                <div className="al-histlist">
                  {bids.map((bid, i) => (
                    <div
                      key={bid.id}
                      className={`al-histrow ${i === 0 ? "top" : ""}`}
                    >
                      <div className="al-histleft">
                        <div className={`al-histrank ${i === 0 ? "gold" : ""}`}>
                          {i === 0 ? "👑" : `#${i + 1}`}
                        </div>
                        <div className="al-histuid">{getBidderName(bid)}</div>
                      </div>
                      <div className="al-histamt">
                        {bid.amount.toLocaleString()}
                        <span className="al-histcur">{cur}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── NON-PARTICIPANT OVERLAY ── */}
        {isParticipant === false && (
          <div className="al-overlay">
            <div className="al-overlaybox">
              <div className="al-overlayicon">🔒</div>
              <div className="al-overlaytitle">
                {t("auctionLive.locked.title")}
              </div>
              <div className="al-overlaydesc">
                {t("auctionLive.locked.desc")}
              </div>
              <button
                className="al-overlaybtn"
                onClick={() =>
                  auction?.productId
                    ? navigate(`/auctions/register/${auction.productId}`)
                    : navigate(-1)
                }
              >
                {t("auctionLive.locked.joinBtn")}
              </button>
              <button className="al-overlayback" onClick={() => navigate(-1)}>
                {t("auctionLive.goBack")}
              </button>
            </div>
          </div>
        )}
      </div>

      {isParticipant === true && showCelebration && resolvedWinner && (
        <WinnerCelebration
          winnerName={resolvedWinner.name}
          winningBid={resolvedWinner.bid}
          isWinner={isWinner}
          productTitle={product?.title}
        />
      )}
      {isParticipant === true && showModal && resolvedWinner && (
        <PostAuctionModal
          winnerName={resolvedWinner.name}
          winningBid={resolvedWinner.bid}
          isWinner={isWinner}
          productTitle={product?.title}
          onBrowse={() => navigate("/")}
          onBack={() => navigate(-1)}
        />
      )}
      {isParticipant === true && showLastOffer && auction && user && (
        <LastOfferModal
          auctionId={auction.id}
          userId={user.uid}
          startingPrice={auction.startingPrice}
          winningBid={auction.winningBid ?? auction.currentBid}
          winnerName={resolvedWinner?.name ?? t("auctionLive.winner")}
          productTitle={product?.title}
          onClose={() => {
            setShowLastOffer(false);
            setShowModal(true);
          }}
        />
      )}
    </>
  );
}

const S: Record<string, React.CSSProperties> = {
  center: {
    minHeight: "100vh",
    background: "#09111a",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 20,
    fontFamily: "system-ui",
  },
  spinner: {
    width: 36,
    height: 36,
    border: "2px solid rgba(201,169,110,0.15)",
    borderTopColor: "#c9a96e",
    borderRadius: "50%",
    animation: "lz-spin 0.9s linear infinite",
  },
  backBtn: {
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
  },
};

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap');
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
@keyframes lz-spin   { to { transform: rotate(360deg); } }
@keyframes al-fadein { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
@keyframes al-pulse  { 0%,100% { box-shadow:0 0 0 0 rgba(74,222,128,0.4); } 50% { box-shadow:0 0 0 6px rgba(74,222,128,0); } }
@keyframes al-urgent { 0%,100% { color:#f87171; } 50% { color:#fca5a5; } }
.al { background:#09111a; font-family:'Outfit',system-ui,sans-serif; color:rgb(229,224,198); min-height:100vh; padding-top:120px; animation:al-fadein 0.5s ease both; }
@media(max-width:860px){ .al { padding-top:100px; } }
.al-bar { width:100%; height:50px; background:rgba(9,17,26,0.7); border-bottom:1px solid rgba(201,169,110,0.1); display:flex; align-items:center; padding:0 40px; gap:14px; backdrop-filter:blur(8px); }
@media(max-width:700px){ .al-bar { padding:0 20px; } }
.al-back { display:flex; align-items:center; gap:7px; background:none; border:none; cursor:pointer; font-family:'Outfit',system-ui,sans-serif; font-size:13px; font-weight:500; color:rgba(229,224,198,0.45); transition:color 0.2s; padding:0; }
.al-back:hover { color:rgba(229,224,198,0.9); }
.al-back:hover .al-arr { transform:translateX(-3px); }
.al-arr { display:inline-block; transition:transform 0.2s ease; }
.al-bsep { width:1px; height:16px; background:rgba(229,224,198,0.08); }
.al-blabel { font-size:13px; font-weight:500; color:rgba(229,224,198,0.4); }
.al-pill { display:inline-flex; align-items:center; gap:5px; padding:3px 10px; border-radius:99px; font-size:9px; font-weight:700; letter-spacing:0.14em; text-transform:uppercase; }
.al-pdot { width:5px; height:5px; border-radius:50%; flex-shrink:0; }
.al-pill.live { background:rgba(74,222,128,0.1); color:#4ade80; }
.al-pill.live .al-pdot { background:#4ade80; animation:al-pulse 1.5s ease-in-out infinite; }
.al-pill.upcoming { background:rgba(147,197,253,0.1); color:#93c5fd; }
.al-pill.upcoming .al-pdot { background:#93c5fd; }
.al-pill.ended { background:rgba(248,113,113,0.1); color:#f87171; }
.al-pill.ended .al-pdot { background:#f87171; }
.al-wrap { max-width:1160px; margin:0 auto; padding:28px 40px 100px; display:grid; grid-template-columns:1fr 1.1fr; gap:24px; align-items:start; }
@media(max-width:900px){ .al-wrap { grid-template-columns:1fr; padding:20px 20px 80px; } }
.al-left { display:flex; flex-direction:column; gap:16px; }
.al-imgcard { position:relative; border-radius:20px; overflow:hidden; border:1px solid rgba(201,169,110,0.13); aspect-ratio:16/10; background:rgba(255,255,255,0.02); }
.al-img { width:100%; height:100%; object-fit:cover; display:block; }
.al-imgph { width:100%; height:100%; display:flex; align-items:center; justify-content:center; font-size:80px; color:rgba(201,169,110,0.1); }
.al-live-badge { position:absolute; top:14px; left:14px; background:rgba(74,222,128,0.15); color:#4ade80; border:1px solid rgba(74,222,128,0.3); border-radius:99px; padding:4px 12px; font-size:10px; font-weight:700; letter-spacing:0.14em; backdrop-filter:blur(6px); }
.al-prodinfo { background:rgba(255,255,255,0.025); border:1px solid rgba(201,169,110,0.1); border-radius:16px; padding:20px 22px; }
.al-prodtitle { font-size:20px; font-weight:700; color:rgb(229,224,198); margin-bottom:8px; }
.al-proddesc { font-size:13px; line-height:1.7; color:rgba(229,224,198,0.38); margin-bottom:12px; font-weight:300; }
.al-prodmeta { display:flex; flex-wrap:wrap; gap:6px; }
.al-metachip { font-size:11px; font-weight:500; color:rgba(201,169,110,0.7); background:rgba(201,169,110,0.07); border:1px solid rgba(201,169,110,0.13); border-radius:99px; padding:3px 12px; }
.al-metarow { display:grid; grid-template-columns:repeat(4,1fr); gap:1px; background:rgba(201,169,110,0.07); border-radius:16px; overflow:hidden; border:1px solid rgba(201,169,110,0.1); }
@media(max-width:500px){ .al-metarow { grid-template-columns:repeat(2,1fr); } }
.al-metablock { background:rgba(9,17,26,0.8); padding:14px 16px; }
.al-metalabel { font-size:9px; font-weight:600; color:rgba(229,224,198,0.25); letter-spacing:0.18em; text-transform:uppercase; margin-bottom:6px; }
.al-metaval { font-size:18px; font-weight:700; color:rgba(229,224,198,0.85); }
.al-metaval--sm { font-size:13px; font-weight:500; }
.al-right { display:flex; flex-direction:column; gap:18px; }
.al-bidcard { background:rgba(255,255,255,0.028); border:1px solid rgba(201,169,110,0.18); border-radius:20px; padding:24px 26px; }
.al-bidcard-top { display:flex; align-items:flex-start; justify-content:space-between; margin-bottom:18px; padding-bottom:18px; border-bottom:1px solid rgba(201,169,110,0.08); }
.al-bidlabel { font-size:10px; font-weight:600; color:rgba(229,224,198,0.25); letter-spacing:0.2em; text-transform:uppercase; margin-bottom:6px; }
.al-bidnum { font-size:40px; font-weight:800; color:#c9a96e; letter-spacing:-0.02em; line-height:1; }
.al-bidcur { font-size:14px; color:rgba(201,169,110,0.5); font-weight:500; margin-inline-start:6px; }
.al-countdownblock { text-align:end; }
.al-cdlabel { font-size:10px; font-weight:600; color:rgba(229,224,198,0.25); letter-spacing:0.2em; text-transform:uppercase; margin-bottom:6px; }
.al-cdnum { font-size:28px; font-weight:700; color:rgb(229,224,198); letter-spacing:0.04em; font-variant-numeric:tabular-nums; }
.al-cdnum.urgent { animation:al-urgent 1s ease-in-out infinite; }
.al-cdnum.ended { color:rgba(229,224,198,0.3); }
.al-bidtype { font-size:11px; color:rgba(229,224,198,0.3); margin-bottom:18px; letter-spacing:0.04em; }
.al-freebid { display:flex; flex-direction:column; gap:10px; margin-bottom:10px; }
.al-inputwrap { position:relative; }
.al-input { width:100%; height:50px; background:rgba(255,255,255,0.04); border:1px solid rgba(201,169,110,0.2); border-radius:10px; color:rgb(229,224,198); font-family:'Outfit',system-ui,sans-serif; font-size:18px; font-weight:600; padding:0 60px 0 16px; outline:none; transition:border-color 0.2s; -moz-appearance:textfield; }
.al-input::-webkit-outer-spin-button,.al-input::-webkit-inner-spin-button { -webkit-appearance:none; margin:0; }
.al-input:focus { border-color:rgba(201,169,110,0.5); }
.al-input:disabled { opacity:0.4; cursor:not-allowed; }
.al-inputcur { position:absolute; inset-inline-end:16px; top:50%; transform:translateY(-50%); font-size:12px; font-weight:600; color:rgba(201,169,110,0.5); pointer-events:none; }
.al-bidbtn { width:100%; height:52px; border:none; border-radius:12px; font-family:'Outfit',system-ui,sans-serif; font-size:13px; font-weight:700; letter-spacing:0.1em; text-transform:uppercase; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:10px; transition:all 0.25s cubic-bezier(0.22,1,0.36,1); }
.al-bidbtn.go { background:linear-gradient(135deg,#c9a96e 0%,#b8934a 100%); color:#09111a; box-shadow:0 4px 22px rgba(201,169,110,0.25); }
.al-bidbtn.go:hover { transform:translateY(-2px); box-shadow:0 10px 34px rgba(201,169,110,0.35); }
.al-bidbtn.go:active { transform:translateY(0); }
.al-bidbtn.off { background:rgba(255,255,255,0.03); color:rgba(229,224,198,0.2); border:1px solid rgba(229,224,198,0.05); cursor:not-allowed; }
.al-bidarrow { font-size:16px; transition:transform 0.2s; }
.al-bidbtn.go:hover .al-bidarrow { transform:translateX(4px); }
.al-spinner { width:14px; height:14px; border:2px solid rgba(9,17,26,0.2); border-top-color:#09111a; border-radius:50%; animation:lz-spin 0.8s linear infinite; }
.al-biddesc { margin-top:10px; text-align:center; font-size:11px; color:rgba(229,224,198,0.2); letter-spacing:0.06em; }
.al-notjoined { text-align:center; padding:16px; font-size:13px; color:rgba(229,224,198,0.3); border:1px dashed rgba(229,224,198,0.08); border-radius:10px; }
.al-histcard { background:rgba(255,255,255,0.025); border:1px solid rgba(201,169,110,0.1); border-radius:20px; overflow:hidden; }
.al-histtitle { padding:16px 20px; border-bottom:1px solid rgba(201,169,110,0.08); font-size:12px; font-weight:600; color:rgba(229,224,198,0.35); letter-spacing:0.16em; text-transform:uppercase; display:flex; align-items:center; gap:10px; }
.al-histcount { background:rgba(201,169,110,0.1); color:rgba(201,169,110,0.7); border-radius:99px; padding:1px 9px; font-size:11px; font-weight:700; }
.al-histempty { padding:36px 20px; text-align:center; font-size:13px; color:rgba(229,224,198,0.2); }
.al-histlist { max-height:340px; overflow-y:auto; scrollbar-width:thin; scrollbar-color:rgba(201,169,110,0.15) transparent; }
.al-histlist::-webkit-scrollbar { width:4px; }
.al-histlist::-webkit-scrollbar-thumb { background:rgba(201,169,110,0.15); border-radius:99px; }
.al-histrow { display:flex; align-items:center; justify-content:space-between; padding:13px 20px; border-bottom:1px solid rgba(201,169,110,0.05); transition:background 0.2s; }
.al-histrow:last-child { border-bottom:none; }
.al-histrow.top { background:rgba(201,169,110,0.04); }
.al-histrow:hover { background:rgba(255,255,255,0.02); }
.al-histleft { display:flex; align-items:center; gap:12px; }
.al-histrank { width:28px; height:28px; border-radius:50%; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.06); display:flex; align-items:center; justify-content:center; font-size:10px; font-weight:700; color:rgba(229,224,198,0.4); flex-shrink:0; }
.al-histrank.gold { background:rgba(201,169,110,0.12); border-color:rgba(201,169,110,0.3); color:#c9a96e; font-size:14px; }
.al-histuid { font-size:13px; font-weight:500; color:rgba(229,224,198,0.55); }
.al-histamt { font-size:18px; font-weight:700; color:rgb(229,224,198); }
.al-histcur { font-size:11px; color:rgba(229,224,198,0.3); margin-inline-start:4px; font-weight:500; }
.al-overlay { position:fixed; inset:0; z-index:999; background:rgba(9,17,26,0.88); backdrop-filter:blur(12px); display:flex; align-items:center; justify-content:center; padding:20px; }
.al-overlaybox { background:rgba(255,255,255,0.03); border:1px solid rgba(201,169,110,0.2); border-radius:24px; padding:44px 40px; text-align:center; max-width:420px; width:100%; display:flex; flex-direction:column; align-items:center; gap:14px; }
.al-overlayicon { font-size:48px; margin-bottom:4px; }
.al-overlaytitle { font-size:22px; font-weight:700; color:rgb(229,224,198); }
.al-overlaydesc { font-size:14px; line-height:1.65; color:rgba(229,224,198,0.42); font-weight:300; }
.al-overlaybtn { margin-top:8px; width:100%; height:50px; border:none; border-radius:12px; background:linear-gradient(135deg,#c9a96e 0%,#b8934a 100%); color:#09111a; font-family:'Outfit',system-ui,sans-serif; font-size:13px; font-weight:700; letter-spacing:0.1em; text-transform:uppercase; cursor:pointer; transition:all 0.25s ease; box-shadow:0 4px 22px rgba(201,169,110,0.2); }
.al-overlaybtn:hover { transform:translateY(-2px); box-shadow:0 10px 34px rgba(201,169,110,0.3); }
.al-overlayback { background:none; border:none; cursor:pointer; font-family:'Outfit',system-ui,sans-serif; font-size:13px; color:rgba(229,224,198,0.3); transition:color 0.2s; padding:4px 0; }
.al-overlayback:hover { color:rgba(229,224,198,0.7); }
`;
