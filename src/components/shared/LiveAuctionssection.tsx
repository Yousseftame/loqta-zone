import React, { useState, useEffect, useRef, useCallback, memo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/store/AuthContext/AuthContext";
import { useTranslation } from "react-i18next";
import LoginPromptModal from "@/components/shared/Loginpromptmodal";
import {
  collection,
  query,
  where,
  onSnapshot,
  getDoc,
  doc,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/firebase/firebase";

const GOLD = "#c9a96e";
const GOLD2 = "#e8d5a3";

interface LiveAuction {
  id: string;
  productId: string;
  title: string;
  image: string;
  currentBid: number;
  totalBids: number;
  endsAt: string;
}

// ─── Data hook: product cache prevents re-fetching on every snapshot tick ─────
function useLiveAuctions() {
  const [auctions, setAuctions] = useState<LiveAuction[]>([]);
  const [loading, setLoading] = useState(true);
  const productCache = useRef<Record<string, any>>({});

  useEffect(() => {
    const q = query(
      collection(db, "auctions"),
      where("isActive", "==", true),
      where("endTime", ">", Timestamp.now()),
    );

    const unsub = onSnapshot(
      q,
      async (snap) => {
        if (snap.empty) {
          setAuctions([]);
          setLoading(false);
          return;
        }
        const now = new Date();
        const live = snap.docs.filter((d) => {
          const st = d.data().startTime;
          return (st instanceof Timestamp ? st.toDate() : new Date(st)) <= now;
        });

        const pids = [
          ...new Set(live.map((d) => d.data().productId).filter(Boolean)),
        ];
        const missing = pids.filter((pid) => !productCache.current[pid]);
        if (missing.length > 0) {
          await Promise.all(
            missing.map(async (pid) => {
              try {
                const s = await getDoc(doc(db, "products", pid));
                if (s.exists()) productCache.current[pid] = s.data();
              } catch {}
            }),
          );
        }

        setAuctions(
          live.map((d) => {
            const data = d.data(),
              p = productCache.current[data.productId] ?? {};
            const img =
              p.thumbnail && p.thumbnail !== "null"
                ? p.thumbnail
                : (p.images?.[0] ?? "");
            const end =
              data.endTime instanceof Timestamp
                ? data.endTime.toDate()
                : new Date(data.endTime);
            return {
              id: d.id,
              productId: data.productId ?? "",
              title: p.title ?? "Live Auction",
              image: img,
              currentBid: data.currentBid ?? data.startingPrice ?? 0,
              totalBids: data.totalBids ?? 0,
              endsAt: end.toISOString(),
            };
          }),
        );
        setLoading(false);
      },
      () => setLoading(false),
    );
    return () => unsub();
  }, []);

  return { auctions, loading };
}

// ─── Countdown ────────────────────────────────────────────────────────────────
function calcCountdown(endsAt: string) {
  const diff = new Date(endsAt).getTime() - Date.now();
  if (diff <= 0) return { h: 0, m: 0, s: 0, done: true, urgent: false };
  const t = Math.floor(diff / 1000);
  return {
    h: Math.floor(t / 3600),
    m: Math.floor((t % 3600) / 60),
    s: t % 60,
    done: false,
    urgent: t < 3600,
  };
}

function useCountdown(endsAt: string) {
  const [time, set] = useState(() => calcCountdown(endsAt));
  useEffect(() => {
    if (time.done) return;
    const id = setInterval(() => set(calcCountdown(endsAt)), 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endsAt]);
  return time;
}

function FlipDigit({
  value,
  color,
  size = 28,
}: {
  value: string;
  color: string;
  size?: number;
}) {
  return (
    <div
      style={{
        width: size * 1.05,
        height: size * 1.3,
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.07)",
        borderRadius: 5,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        overflow: "hidden",
        boxShadow:
          "0 2px 8px rgba(0,0,0,0.4),inset 0 1px 0 rgba(255,255,255,0.05)",
      }}
    >
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: "50%",
          height: 1,
          background: "rgba(255,255,255,0.1)",
          zIndex: 2,
          pointerEvents: "none",
          transform: "translateY(-50%)",
        }}
      />
      <span
        key={value}
        className="la-flip-digit"
        style={{
          fontFamily: "'DM Mono','Courier New',monospace",
          fontSize: size,
          fontWeight: 700,
          color,
          lineHeight: 1,
          letterSpacing: "-0.04em",
          display: "block",
          userSelect: "none",
        }}
      >
        {value}
      </span>
    </div>
  );
}

function FlipUnit({
  value,
  label,
  color,
  size,
}: {
  value: number;
  label: string;
  color: string;
  size?: number;
}) {
  const pad = String(value).padStart(2, "0");
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 5,
      }}
    >
      <div style={{ display: "flex", gap: 2 }}>
        <FlipDigit value={pad[0]} color={color} size={size} />
        <FlipDigit value={pad[1]} color={color} size={size} />
      </div>
      <span
        style={{
          fontSize: 13,
          fontWeight: 600,
          letterSpacing: 0,
          color: `${color}`,
          textTransform: "uppercase",
          direction: "ltr",
        }}
      >
        {label}
      </span>
    </div>
  );
}

function Sep({ color }: { color: string }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 5,
        paddingBottom: 16,
      }}
    >
      <div
        style={{
          width: 3,
          height: 3,
          borderRadius: "50%",
          background: `${color}55`,
        }}
      />
      <div
        style={{
          width: 3,
          height: 3,
          borderRadius: "50%",
          background: `${color}55`,
        }}
      />
    </div>
  );
}

function FlipCountdown({
  endsAt,
  size = 28,
}: {
  endsAt: string;
  size?: number;
}) {
  const { h, m, s, done, urgent } = useCountdown(endsAt);
  const { t } = useTranslation();
  const col = urgent ? "#ff8888" : GOLD;
  if (done)
    return (
      <span
        style={{
          fontFamily: "'DM Mono',monospace",
          fontSize: 13,
          fontWeight: 700,
          color: "#ff6060",
          letterSpacing: "0.18em",
          textTransform: "uppercase",
        }}
      >
        {t("liveAuctions.ended", "Session Ended")}
      </span>
    );
  return (
    <div dir="ltr" style={{ display: "flex", alignItems: "flex-end", gap: 6 }}>
      {h > 0 && (
        <>
          <FlipUnit
            value={h}
            label={t("auctionsSection.hours")}
            color={col}
            size={size}
          />
          <Sep color={col} />
        </>
      )}
      <FlipUnit
        value={m}
        label={t("auctionsSection.mins")}
        color={col}
        size={size}
      />
      <Sep color={col} />
      <FlipUnit
        value={s}
        label={t("auctionsSection.secs")}
        color={col}
        size={size}
      />
    </div>
  );
}

function RowCountdown({ endsAt }: { endsAt: string }) {
  return <FlipCountdown endsAt={endsAt} size={18} />;
}

// ─── useIsMobile ──────────────────────────────────────────────────────────────
function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth < breakpoint : false,
  );
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    setIsMobile(mq.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [breakpoint]);
  return isMobile;
}

// ─── FeaturedCard (unchanged) ─────────────────────────────────────────────────
const FeaturedCard = memo(function FeaturedCard({
  item,
  onJoin,
  compact = false,
}: {
  item: LiveAuction;
  onJoin: () => void;
  compact?: boolean;
}) {
  const [vis, setVis] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === "ar";
  const cur = isRtl ? "جنيه" : "EGP";

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setVis(true);
          obs.disconnect();
        }
      },
      { threshold: 0.1 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // ── MOBILE COMPACT CARD ────────────────────────────────────────────────────
  if (compact) {
    return (
      <div
        ref={ref}
        onClick={onJoin}
        className="la-featured-card"
        style={{
          position: "relative",
          borderRadius: 20,
          overflow: "hidden",
          cursor: "pointer",
          opacity: vis ? 1 : 0,
          transform: vis ? "translateY(0)" : "translateY(28px)",
          transition:
            "opacity 0.65s ease,transform 0.65s cubic-bezier(0.22,1,0.36,1)",
          background: "#06101e",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            position: "relative",
            height: 160,
            flexShrink: 0,
            overflow: "hidden",
          }}
        >
          {item.image && (
            <img
              src={item.image}
              alt={item.title}
              loading="lazy"
              decoding="async"
              className="la-feat-img"
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                display: "block",
              }}
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          )}
          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "linear-gradient(to bottom,rgba(4,8,16,0.1) 0%,rgba(4,8,16,0.7) 100%)",
            }}
          />
          <div
            style={{
              position: "absolute",
              top: 12,
              left: 12,
              display: "flex",
              alignItems: "center",
              gap: 6,
              background: "rgba(4,8,16,0.8)",
              backdropFilter: "blur(10px)",
              border: "1px solid rgba(74,222,128,0.3)",
              borderRadius: 999,
              padding: "5px 11px",
            }}
          >
            <div
              style={{
                width: 7,
                height: 7,
                borderRadius: "50%",
                background: "#4ade80",
                animation: "la-pulse 1.5s infinite",
              }}
            />
            <span
              style={{
                fontSize: 13,
                fontWeight: 900,
                color: "#4ade80",
                letterSpacing: "0.22em",
              }}
            >
              LIVE
            </span>
          </div>
          {item.totalBids > 0 && (
            <div
              style={{
                position: "absolute",
                top: 12,
                right: 12,
                background: "rgba(4,8,16,0.8)",
                backdropFilter: "blur(10px)",
                border: "1px solid rgba(201,169,110,0.2)",
                borderRadius: 999,
                padding: "5px 11px",
                fontSize: 9,
                fontWeight: 700,
                color: GOLD,
                letterSpacing: "0.1em",
              }}
            >
              🔨 {item.totalBids}
            </div>
          )}
          <div
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              padding: "0 16px 12px",
            }}
          >
            <h3
              style={{
                margin: 0,
                fontSize: "clamp(16px,4.5vw,22px)",
                fontWeight: 900,
                color: "#ffffff",
                letterSpacing: "-0.03em",
                lineHeight: 1.15,
                display: "-webkit-box",
                WebkitLineClamp: 1,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
                textShadow: "0 2px 16px rgba(0,0,0,0.9)",
              }}
            >
              {item.title}
            </h3>
          </div>
        </div>

        <div
          style={{
            padding: "14px 16px 16px",
            background:
              "linear-gradient(180deg,rgba(4,8,16,0.96),rgba(6,14,24,0.99))",
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          <div
            style={{
              height: 1,
              background: `linear-gradient(90deg,${GOLD}55,${GOLD}11,transparent)`,
            }}
          />
          <div>
            <div
              style={{
                fontSize: 15,
                fontWeight: 800,
                letterSpacing: "0.3em",
                color: "rgba(229,224,198,0.9",
                textTransform: "uppercase",
                marginBottom: 8,
              }}
            >
              {t("liveAuctions.closingIn", "Closing in")}
            </div>
            <FlipCountdown endsAt={item.endsAt} size={22} />
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "space-between",
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 800,
                  letterSpacing: "0.28em",
                  color: "rgba(229,224,198,0.9)",
                  textTransform: "uppercase",
                  marginBottom: 4,
                }}
              >
                {t("liveAuctions.currentBid", "Current Bid")}
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 5 }}>
                <span
                  style={{
                    fontFamily: "'DM Mono','Courier New',monospace",
                    fontSize: "clamp(20px,5vw,26px)",
                    fontWeight: 700,
                    color: GOLD,
                    letterSpacing: "-0.04em",
                    lineHeight: 1,
                    textShadow: `0 0 24px ${GOLD}55`,
                  }}
                >
                  {item.currentBid.toLocaleString()}
                </span>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: `${GOLD}55`,
                    letterSpacing: "0.14em",
                  }}
                >
                  {cur}
                </span>
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 800,
                  letterSpacing: "0.28em",
                  color: "rgba(229,224,198,0.9)",
                  textTransform: "uppercase",
                  marginBottom: 4,
                }}
              >
                {t("liveAuctions.bids", "Bids")}
              </div>
              <div
                style={{
                  fontFamily: "'DM Mono',monospace",
                  fontSize: 20,
                  fontWeight: 700,
                  color: "rgba(229,224,198,0.5)",
                  letterSpacing: "-0.03em",
                }}
              >
                {item.totalBids}
              </div>
            </div>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onJoin();
            }}
            className="la-cta-btn"
            style={{
              width: "100%",
              padding: "13px 0",
              border: "none",
              borderRadius: 12,
              cursor: "pointer",
              fontSize: 10,
              fontWeight: 900,
              letterSpacing: "0.26em",
              textTransform: "uppercase",
              color: "#040810",
              position: "relative",
              overflow: "hidden",
            }}
          >
            <span style={{ position: "relative", zIndex: 1 }}>
              {t("liveAuctions.bidNow", "Bid Now — Join Session")}
            </span>
            <div className="la-sweep-shine" />
          </button>
        </div>
      </div>
    );
  }

  // ── DESKTOP FULL CARD ──────────────────────────────────────────────────────
  return (
    <div
      ref={ref}
      onClick={onJoin}
      className="la-featured-card"
      style={{
        position: "relative",
        borderRadius: 20,
        overflow: "hidden",
        aspectRatio: "4/5",
        cursor: "pointer",
        opacity: vis ? 1 : 0,
        transform: vis ? "translateY(0)" : "translateY(28px)",
        transition:
          "opacity 0.65s ease,transform 0.65s cubic-bezier(0.22,1,0.36,1)",
      }}
    >
      <div style={{ position: "absolute", inset: 0, background: "#06101e" }}>
        {item.image && (
          <img
            src={item.image}
            alt={item.title}
            loading="lazy"
            decoding="async"
            className="la-feat-img"
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              display: "block",
            }}
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        )}
      </div>
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(to top,rgba(4,8,16,0.98) 0%,rgba(4,8,16,0.55) 45%,rgba(4,8,16,0.08) 80%,transparent 100%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: 16,
          left: 16,
          right: 16,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            background: "rgba(4,8,16,0.75)",
            backdropFilter: "blur(10px)",
            border: "1px solid rgba(74,222,128,0.3)",
            borderRadius: 999,
            padding: "5px 11px",
          }}
        >
          <div
            style={{
              width: 7,
              height: 7,
              borderRadius: "50%",
              background: "#4ade80",
              animation: "la-pulse 1.5s infinite",
            }}
          />
          <span
            style={{
              fontSize: 9,
              fontWeight: 900,
              color: "#4ade80",
              letterSpacing: "0.22em",
            }}
          >
            LIVE
          </span>
        </div>
        {item.totalBids > 0 && (
          <div
            style={{
              background: "rgba(4,8,16,0.75)",
              backdropFilter: "blur(10px)",
              border: "1px solid rgba(201,169,110,0.2)",
              borderRadius: 999,
              padding: "5px 11px",
              fontSize: 12,
              fontWeight: 700,
              color: GOLD,
              letterSpacing: "0.1em",
            }}
          >
            🔨 {item.totalBids}
          </div>
        )}
      </div>
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          padding: "0 22px 24px",
        }}
      >
        <h3
          style={{
            margin: "0 0 10px",
            fontSize: "30px",
            fontWeight: 900,
            color: "#ffffff",
            letterSpacing: "-0.03em",
            lineHeight: 1.1,
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
            textShadow: "0 2px 24px rgba(0,0,0,0.8)",
          }}
        >
          {item.title}
        </h3>
        <div
          style={{
            height: 1,
            marginBottom: 14,
            background: `linear-gradient(90deg, ${GOLD}66, ${GOLD}1a, transparent)`,
          }}
        />
        <div style={{ marginBottom: 16 }}>
          <div
            style={{
              fontSize: 14,
              fontWeight: 800,
              letterSpacing: "0.3em",
              color: "rgba(229,224,198,0.9)",
              textTransform: "uppercase",
              marginBottom: 10,
            }}
          >
            {t("liveAuctions.closingIn", "Closing in")}
          </div>
          <FlipCountdown endsAt={item.endsAt} size={26} />
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            marginBottom: 18,
          }}
        >
          <div>
            <div
              style={{
                fontSize: 14,
                fontWeight: 800,
                letterSpacing: "0.28em",
                color: "rgba(229,224,198,0.9)",
                textTransform: "uppercase",
                marginBottom: 5,
              }}
            >
              {t("liveAuctions.currentBid", "Current Bid")}
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 5 }}>
              <span
                style={{
                  fontFamily: "'DM Mono','Courier New',monospace",
                  fontSize: "clamp(24px,2.6vw,32px)",
                  fontWeight: 700,
                  color: GOLD,
                  letterSpacing: "-0.04em",
                  lineHeight: 1,
                  textShadow: `0 0 28px ${GOLD}55`,
                }}
              >
                {item.currentBid.toLocaleString()}
              </span>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: `${GOLD}55`,
                  letterSpacing: "0.14em",
                  paddingBottom: 3,
                }}
              >
                {cur}
              </span>
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div
              style={{
                fontSize: 13,
                fontWeight: 800,
                letterSpacing: "0.08em",
                color: "rgba(229,224,198,0.9)",
                textTransform: "uppercase",
                marginBottom: 5,
              }}
            >
              {t("liveAuctions.bids", "Bids")}
            </div>
            <div
              style={{
                fontFamily: "'DM Mono',monospace",
                fontSize: 22,
                fontWeight: 700,
                color: "rgba(229,224,198,0.5)",
                letterSpacing: "-0.03em",
              }}
            >
              {item.totalBids}
            </div>
          </div>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onJoin();
          }}
          className="la-cta-btn"
          style={{
            width: "100%",
            padding: "14px 0",
            border: "none",
            borderRadius: 12,
            cursor: "pointer",
            fontSize: 13,
            fontWeight: 900,
            letterSpacing: "0.26em",
            textTransform: "uppercase",
            color: "#040810",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <span style={{ position: "relative", zIndex: 1 }}>
            {t("liveAuctions.bidNow", "Bid Now — Join Session")}
          </span>
          <div className="la-sweep-shine" />
        </button>
      </div>
    </div>
  );
});

// ─── AuctionRow ───────────────────────────────────────────────────────────────
const AuctionRow = memo(function AuctionRow({
  item,
  index,
  onJoin,
}: {
  item: LiveAuction;
  index: number;
  onJoin: () => void;
}) {
  const [vis, setVis] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === "ar";
  const cur = isRtl ? "جنيه" : "EGP";

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setTimeout(() => setVis(true), index * 85);
          obs.disconnect();
        }
      },
      { threshold: 0.1 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [index]);

  return (
    <div
      ref={ref}
      onClick={onJoin}
      className="la-row"
      style={{
        position: "relative",
        cursor: "pointer",
        /*
         * DESKTOP: 4-column single-row grid (thumb | info | countdown | btn)
         * MOBILE:  overridden via CSS to a 2-row layout (see <style> block)
         */
        display: "grid",
        gridTemplateColumns: "48px 1fr auto auto",
        gridTemplateRows: "auto auto",
        gap: "0 10px",
        alignItems: "center",
        padding: "14px",
        opacity: vis ? 1 : 0,
        transform: vis
          ? "translateX(0)"
          : `translateX(${isRtl ? "20px" : "-20px"})`,
        transition: `opacity 0.5s ease ${index * 0.08}s, transform 0.5s cubic-bezier(0.22,1,0.36,1) ${index * 0.08}s`,
        overflow: "hidden",
      }}
    >
      {/* Hover bg — CSS only */}
      <div className="la-row-bg" />
      <div className="la-row-accent" />

      {/* ── Thumbnail ── */}
      <div
        className="la-row-thumb"
        style={{
          width: 48,
          height: 48,
          borderRadius: 10,
          overflow: "hidden",
          flexShrink: 0,
          position: "relative",
          background: "#0a1525",
          /* mobile: spans both rows so it sits full-height on the left */
          gridRow: "1 / 3",
        }}
      >
        {item.image ? (
          <img
            src={item.image}
            alt={item.title}
            loading="lazy"
            decoding="async"
            className="la-row-img"
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              display: "block",
            }}
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
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
              background: "linear-gradient(135deg,#1a2f47,#0a1525)",
            }}
          >
            <span
              style={{
                color: "rgba(201,169,110,0.3)",
                fontSize: 20,
                fontWeight: 900,
              }}
            >
              {item.title.charAt(0)}
            </span>
          </div>
        )}
        <div
          style={{
            position: "absolute",
            bottom: 4,
            left: "50%",
            transform: "translateX(-50%)",
            background: "rgba(4,8,16,0.85)",
            backdropFilter: "blur(4px)",
            borderRadius: 4,
            padding: "2px 5px",
            display: "flex",
            alignItems: "center",
            gap: 3,
          }}
        >
          <div
            style={{
              width: 5,
              height: 5,
              borderRadius: "50%",
              background: "#4ade80",
              animation: "la-pulse 1.5s infinite",
            }}
          />
          <span
            style={{
              fontSize: 7,
              fontWeight: 900,
              color: "#4ade80",
              letterSpacing: "0.14em",
            }}
          >
            LIVE
          </span>
        </div>
      </div>

      {/* ── Title + bid  (row 1, col 2) ── */}
      <div
        style={{ minWidth: 0, gridColumn: 2, gridRow: 1, alignSelf: "center" }}
      >
        <div
          className="la-row-title"
          style={{
            fontSize: "clamp(19px,1.4vw,15px)",
            fontWeight: 900,
            letterSpacing: "-0.025em",
            lineHeight: 1.2,
            marginBottom: 5,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {item.title}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 3 }}>
            <span
              className="la-row-bid"
              style={{
                fontFamily: "'DM Mono',monospace",
                fontSize: 15,
                fontWeight: 700,
                letterSpacing: "-0.03em",
              }}
            >
              {item.currentBid.toLocaleString()}
            </span>
            <span
              style={{
                fontSize: 10,
                fontWeight: 800,
                color: "rgba(229,224,198,0.2)",
              }}
            >
              {cur}
            </span>
          </div>
          <span
            style={{
              width: 1,
              height: 9,
              background: "rgba(255,255,255,0.08)",
              display: "inline-block",
            }}
          />
          <span
            style={{
              fontSize: 12,
              fontWeight: 800,
              letterSpacing: "0.02em",
              color: "rgba(229,224,198,0.9)",
              textTransform: "uppercase",
            }}
          >
            {item.totalBids}{" "}
            {t("liveAuctions.bidCount", item.totalBids !== 1 ? "bids" : "bid")}
          </span>
        </div>
      </div>

      {/* ── Desktop countdown (col 3, row 1) — hidden on mobile via CSS ── */}
      <div
        className="la-row-countdown"
        style={{ textAlign: "right", flexShrink: 0, gridColumn: 3, gridRow: 1 }}
      >
        <div
          style={{
            fontSize: 12,
            fontWeight: 800,
            letterSpacing: "0.22em",
            color: "rgba(229,224,198,0.62)",
            textTransform: "uppercase",
            marginBottom: 6,
          }}
        >
          {t("liveAuctions.endsIn", "Ends in")}
        </div>
        <RowCountdown endsAt={item.endsAt} />
      </div>

      {/* ── Join button (col 4, row 1 on desktop / col 3 top-right on mobile) ── */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onJoin();
        }}
        className="la-row-btn"
        style={{
          flexShrink: 0,
          width: 76,
          height: 34,
          borderRadius: 8,
          cursor: "pointer",
          fontSize: 13,
          fontWeight: 900,
          textTransform: "uppercase",
          position: "relative",
          overflow: "hidden",
          gridColumn: 4,
          gridRow: 1,
          alignSelf: "center",
        }}
      >
        <span style={{ position: "relative", zIndex: 1 }}>
          {t("liveAuctions.joinNow", "Join Now")}
        </span>
        <div className="la-sweep-shine" />
      </button>

      {/* ── Mobile-only countdown row (row 2, cols 2-4) ── */}
      <div
        className="la-row-countdown-inline"
        style={{
          gridColumn: "2 / -1",
          gridRow: 2,
          display: "none" /* shown via CSS on mobile */,
          alignItems: "center",
          gap: 8,
          paddingTop: 6,
        }}
      >
        <span
          style={{
            fontSize: 10,
            fontWeight: 800,
            letterSpacing: "0.2em",
            color: "rgba(229,224,198,0.5)",
            textTransform: "uppercase",
            flexShrink: 0,
          }}
        >
          {t("liveAuctions.endsIn", "Ends in")}
        </span>
        <RowCountdown endsAt={item.endsAt} />
      </div>

      {/* Bottom divider */}
      <div
        className="la-row-divider"
        style={{
          position: "absolute",
          bottom: 0,
          left: 16,
          right: 18,
          height: 1,
        }}
      />
    </div>
  );
});

function Skel({ style }: { style?: React.CSSProperties }) {
  return <div className="la-skel" style={{ borderRadius: 8, ...style }} />;
}

// ─── Main section ─────────────────────────────────────────────────────────────
export default function LiveAuctionsSection() {
  const { auctions, loading } = useLiveAuctions();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === "ar";
  const isMobile = useIsMobile(768);
  const [modal, setModal] = useState(false);
  const [hdrVis, setHdrVis] = useState(false);
  const hdrRef = useRef<HTMLDivElement>(null);

  const handleJoin = useCallback(
    (a: LiveAuction) => {
      if (user) navigate(`/auctions/register/${a.productId}`);
      else setModal(true);
    },
    [user, navigate],
  );

  useEffect(() => {
    const el = hdrRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setHdrVis(true);
          obs.disconnect();
        }
      },
      { threshold: 0.2 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  if (!loading && auctions.length === 0) return null;

  const featured = auctions[0];
  const rest = auctions.slice(1);

  const getGridCols = () => {
    if (loading) return isMobile ? "1fr" : "360px 1fr";
    if (auctions.length <= 1) return "1fr";
    if (isMobile) return "1fr";
    if (auctions.length === 2) return "1fr 1fr";
    return "minmax(260px,360px) 1fr";
  };

  return (
    <section
      dir={isRtl ? "rtl" : "ltr"}
      style={{
        background: "linear-gradient(180deg,#1f2a3d 0%,#224266 100%)",
        padding: isMobile ? "60px 0 72px" : "88px 0 108px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <style>{`
        @keyframes la-pulse  { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.7;transform:scale(1.18)} }
        @keyframes la-shimmer{ 0%{background-position:200% 0} 100%{background-position:-200% 0} }
        @keyframes la-sweep  { from{transform:translateX(-120%)} to{transform:translateX(220%)} }

        @keyframes la-flip-in { from{opacity:0;transform:rotateX(90deg) scale(0.85)} to{opacity:1;transform:rotateX(0deg) scale(1)} }
        .la-flip-digit { animation: la-flip-in 0.22s cubic-bezier(0.34,1.56,0.64,1) both; }

        .la-skel { background:linear-gradient(90deg,rgba(255,255,255,0.03) 25%,rgba(255,255,255,0.07) 50%,rgba(255,255,255,0.03) 75%); background-size:200% 100%; animation:la-shimmer 1.8s infinite; }

        /* ── Featured card ────────────────────────────────────────────────── */
        .la-featured-card {
          box-shadow: 0 16px 56px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.06);
          transition: box-shadow 0.4s ease;
          will-change: transform;
        }
        .la-featured-card:hover {
          box-shadow: 0 40px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(201,169,110,0.35);
        }
        .la-feat-img {
          filter: brightness(0.38) saturate(0.9);
          transition: transform 1s cubic-bezier(0.25,0.46,0.45,0.94), filter 0.8s ease;
        }
        .la-featured-card:hover .la-feat-img {
          transform: scale(1.06);
          filter: brightness(0.5) saturate(1.1);
        }

        /* ── CTA button ───────────────────────────────────────────────────── */
        .la-cta-btn {
          background: linear-gradient(120deg,${GOLD} 0%,${GOLD2}bb 100%);
          box-shadow: 0 4px 20px rgba(201,169,110,0.18);
          transform: scale(1);
          transition: background 0.38s ease, box-shadow 0.38s ease, transform 0.38s cubic-bezier(0.34,1.56,0.64,1);
        }
        .la-cta-btn:hover {
          background: linear-gradient(120deg,${GOLD2} 0%,${GOLD} 50%,${GOLD2} 100%);
          box-shadow: 0 12px 44px rgba(201,169,110,0.45);
          transform: scale(1.025);
        }
        .la-cta-btn:hover .la-sweep-shine { animation: la-sweep 0.55s ease forwards; }
        .la-sweep-shine {
          position: absolute; inset: 0; z-index: 0;
          background: linear-gradient(105deg,transparent 35%,rgba(255,255,255,0.28) 50%,transparent 65%);
          transform: translateX(-120%);
        }

        /* ── Row ──────────────────────────────────────────────────────────── */
        .la-row { transition: none; }
        .la-row-bg {
          position: absolute; inset: 0; pointer-events: none;
          background: transparent;
          transition: background 0.35s ease;
        }
        .la-row:hover .la-row-bg {
          background: linear-gradient(90deg,rgba(201,169,110,0.055),rgba(201,169,110,0.015));
        }
        .la-row-accent {
          position: absolute; left: 0; top: 18%; bottom: 18%;
          width: 2px; border-radius: 2px;
          background: transparent;
          transition: background 0.35s ease;
        }
        .la-row:hover .la-row-accent {
          background: linear-gradient(180deg,transparent,${GOLD}cc,transparent);
        }
        .la-row-thumb {
          border: 1px solid rgba(255,255,255,0.07);
          box-shadow: 0 2px 10px rgba(0,0,0,0.3);
          transition: border-color 0.3s ease, box-shadow 0.3s ease;
        }
        .la-row:hover .la-row-thumb {
          border-color: rgba(201,169,110,0.4);
          box-shadow: 0 8px 28px rgba(0,0,0,0.5);
        }
        .la-row-img { transform: scale(1); transition: transform 0.7s cubic-bezier(0.25,0.46,0.45,0.94); }
        .la-row:hover .la-row-img { transform: scale(1.12); }
        .la-row-title { color: rgba(229,224,198,0.88); transition: color 0.25s ease; }
        .la-row:hover .la-row-title { color: #ffffff; }
        .la-row-bid { color: ${GOLD}99; transition: color 0.25s ease; }
        .la-row:hover .la-row-bid { color: ${GOLD}; }
        .la-row-divider { background: rgba(255,255,255,0.04); transition: background 0.35s ease; }
        .la-row:hover .la-row-divider { background: linear-gradient(90deg,rgba(201,169,110,0.18),rgba(201,169,110,0.04)); }

        /* ── Row join button ──────────────────────────────────────────────── */
        .la-row-btn {
          background: transparent;
          border: 1px solid rgba(201,169,110,0.32);
          color: ${GOLD};
          box-shadow: none;
          transform: scale(1);
          transition: all 0.32s cubic-bezier(0.34,1.56,0.64,1);
        }
        .la-row:hover .la-row-btn {
          background: linear-gradient(120deg,${GOLD2},${GOLD});
          border-color: transparent;
          color: #040810;
          transform: scale(1.05);
          box-shadow: 0 6px 28px rgba(201,169,110,0.35);
        }
        .la-row:hover .la-row-btn .la-sweep-shine { animation: la-sweep 0.5s ease forwards; }

        /* ── Mobile-only row layout overrides ────────────────────────────── */
        @media (max-width: 767px) {
          /*
           * Row 1: thumbnail (spans 2 rows) | title+bid | [gap] | Join Now btn
           * Row 2: thumbnail (cont.)        | Ends-in countdown (spans cols 2-4)
           *
           * Grid columns: 48px thumb | 1fr info | auto btn
           */
          .la-row {
            grid-template-columns: 48px 1fr auto !important;
            grid-template-rows: auto auto !important;
          }

          /* Thumbnail — spans both rows */
          .la-row > .la-row-thumb {
            grid-column: 1 !important;
            grid-row: 1 / 3 !important;
            align-self: stretch !important;
            height: auto !important;
            min-height: 48px !important;
          }

          /* Title + bid — row 1, col 2 */
          .la-row > div[style*="minWidth: 0"] {
            grid-column: 2 !important;
            grid-row: 1 !important;
          }

          /* Join Now button — row 1, col 3 (top right) */
          .la-row > .la-row-btn {
            grid-column: 3 !important;
            grid-row: 1 !important;
            align-self: center !important;
          }

          /* Desktop countdown — hidden */
          .la-row-countdown {
            display: none !important;
          }

          /* Mobile countdown row — row 2, cols 2-3 */
          .la-row-countdown-inline {
            display: flex !important;
            grid-column: 2 / -1 !important;
            grid-row: 2 !important;
          }
        }
      `}</style>

      <LoginPromptModal
        isOpen={modal}
        onClose={() => setModal(false)}
        onGoToLogin={() => {
          setModal(false);
          navigate("/login");
        }}
      />

      <div
        style={{
          position: "absolute",
          top: "25%",
          left: "40%",
          transform: "translate(-50%,-50%)",
          width: 800,
          height: 500,
          borderRadius: "50%",
          background:
            "radial-gradient(ellipse,rgba(201,169,110,0.04) 0%,transparent 65%)",
          pointerEvents: "none",
        }}
      />

      {/* Header */}
      <div
        ref={hdrRef}
        style={{
          maxWidth: 1200,
          margin: isMobile ? "0 auto 36px" : "0 auto 60px",
          padding: isMobile ? "0 20px" : "0 48px",
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          gap: 24,
          flexWrap: "wrap",
        }}
      >
        <div
          style={{
            opacity: hdrVis ? 1 : 0,
            transform: hdrVis ? "translateY(0)" : "translateY(20px)",
            transition: "opacity 0.6s ease,transform 0.6s ease",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              marginBottom: 18,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 7,
                border: "1px solid rgba(74,222,128,0.25)",
                borderRadius: 999,
                padding: "5px 13px",
                background: "rgba(74,222,128,0.07)",
              }}
            >
              <div
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  background: "#4ade80",
                  animation: "la-pulse 1.5s infinite",
                }}
              />
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 900,
                  color: "#4ade80",
                  letterSpacing: "0.28em",
                  textTransform: "uppercase",
                }}
              >
                {t("liveAuctions.title", "Live Auctions")}
              </span>
            </div>
            {!loading && auctions.length > 0 && (
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: "rgba(201,169,110,0.9)",
                  letterSpacing: "0.14em",
                }}
              >
                {auctions.length} {t("liveAuctions.active", "active")}
              </span>
            )}
          </div>
          <div
            style={{
              fontSize: isMobile
                ? "clamp(26px,7vw,36px)"
                : "clamp(28px,4vw,46px)",
              fontWeight: 900,
              letterSpacing: "-0.03em",
              lineHeight: 1.05,
              color: "#fff",
            }}
          >
            {t("liveAuctions.happening", "Happening")}
            <br />
            <span
              style={{
                background: `linear-gradient(100deg,${GOLD} 0%,${GOLD2} 55%,${GOLD} 100%)`,
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              {t("liveAuctions.rightNow", "Right Now.")}
            </span>
          </div>
        </div>
        {!isMobile && (
          <p
            style={{
              fontSize: 15,
              color: "rgba(229,224,198)",
              fontWeight: 700,
              lineHeight: 1.8,
              maxWidth: 280,
              marginBottom: 6,
              opacity: hdrVis ? 1 : 0,
              transform: hdrVis ? "translateY(0)" : "translateY(14px)",
              transition: "opacity 0.7s ease 0.15s,transform 0.7s ease 0.15s",
            }}
          >
            {t(
              "liveAuctions.subtitle",
              "These sessions are live. Every bid raises the stakes, place yours before the clock runs out.",
            )}
          </p>
        )}
      </div>

      {/* Content */}
      <div
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: isMobile ? "0 16px" : "0 48px",
          display: "grid",
          gridTemplateColumns: getGridCols(),
          gap: isMobile ? 16 : 3,
        }}
      >
        {loading ? (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: isMobile ? "1fr" : "360px 1fr",
              gap: isMobile ? 16 : 3,
            }}
          >
            <div
              style={{
                borderRadius: 20,
                overflow: "hidden",
                aspectRatio: isMobile ? "16/10" : "4/5",
              }}
            >
              <div
                className="la-skel"
                style={{ width: "100%", height: "100%" }}
              />
            </div>
            <div
              style={{
                background: "rgba(255,255,255,0.02)",
                border: "1px solid rgba(255,255,255,0.05)",
                borderRadius: 20,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  padding: "18px 18px 14px",
                  borderBottom: "1px solid rgba(255,255,255,0.05)",
                  display: "flex",
                  justifyContent: "space-between",
                }}
              >
                <Skel style={{ height: 9, width: 100 }} />
                <Skel style={{ height: 9, width: 50 }} />
              </div>
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  style={{
                    padding: "14px",
                    borderBottom: "1px solid rgba(255,255,255,0.04)",
                    display: "grid",
                    gridTemplateColumns: "48px 1fr auto auto",
                    gridTemplateRows: "auto auto",
                    gap: "0 10px",
                    alignItems: "center",
                  }}
                >
                  <Skel style={{ width: 48, height: 48, borderRadius: 10 }} />
                  <div
                    style={{ display: "flex", flexDirection: "column", gap: 8 }}
                  >
                    <Skel style={{ height: 12, width: "60%" }} />
                    <Skel style={{ height: 8, width: "38%" }} />
                  </div>
                  <Skel style={{ width: 52, height: 22 }} />
                  <Skel style={{ width: 76, height: 34, borderRadius: 8 }} />
                </div>
              ))}
            </div>
          </div>
        ) : auctions.length === 1 ? (
          <div
            style={{
              maxWidth: isMobile ? "100%" : 400,
              margin: "0 auto",
              width: "100%",
            }}
          >
            <FeaturedCard
              item={featured}
              onJoin={() => handleJoin(featured)}
              compact={isMobile}
            />
          </div>
        ) : (
          <>
            <FeaturedCard
              item={featured}
              onJoin={() => handleJoin(featured)}
              compact={isMobile}
            />
            <div
              style={{
                background: "rgba(255,255,255,0.018)",
                border: "1px solid rgba(255,255,255,0.05)",
                borderRadius: 20,
                overflow: "hidden",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <div
                style={{
                  padding: "16px 18px 12px",
                  borderBottom: "1px solid rgba(255,255,255,0.05)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <span
                  style={{
                    fontSize: 15,
                    fontWeight: 800,
                    letterSpacing: "0.22em",
                    color: "rgba(229,224,198)",
                    textTransform: "uppercase",
                  }}
                >
                  {t("liveAuctions.moreSessions", "More Sessions")}
                </span>
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: "rgba(201,169,110)",
                    letterSpacing: "0.12em",
                  }}
                >
                  {rest.length} {t("liveAuctions.active", "active")}
                </span>
              </div>
              {rest.length > 0 ? (
                rest.map((a, i) => (
                  <AuctionRow
                    key={a.id}
                    item={a}
                    index={i}
                    onJoin={() => handleJoin(a)}
                  />
                ))
              ) : (
                <div
                  style={{
                    flex: 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "rgba(229,224,198,0.15)",
                    fontSize: 12,
                    padding: 40,
                  }}
                >
                  {t("liveAuctions.onlyOne", "Only one live session right now")}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 1,
          background:
            "linear-gradient(90deg,transparent,rgba(201,169,110,0.1),transparent)",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: 1,
          background:
            "linear-gradient(90deg,transparent,rgba(201,169,110,0.1),transparent)",
        }}
      />
    </section>
  );
}
