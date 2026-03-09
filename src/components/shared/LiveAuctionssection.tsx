import React, { useState, useEffect, useRef, useCallback, memo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/store/AuthContext/AuthContext";
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

// ── Tokens ─────────────────────────────────────────────────────
const GOLD = "#c9a96e";
const GOLD2 = "#e8d5a3";

// ── Types ──────────────────────────────────────────────────────
interface LiveAuction {
  id: string;
  productId: string;
  title: string;
  image: string;
  currentBid: number;
  totalBids: number;
  endsAt: string;
}

// ── Real-time hook ────────────────────────────────────────────
function useLiveAuctions() {
  const [auctions, setAuctions] = useState<LiveAuction[]>([]);
  const [loading, setLoading] = useState(true);

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
        const pm: Record<string, any> = {};
        await Promise.all(
          pids.map(async (pid) => {
            try {
              const s = await getDoc(doc(db, "products", pid));
              if (s.exists()) pm[pid] = s.data();
            } catch {}
          }),
        );

        setAuctions(
          live.map((d) => {
            const data = d.data();
            const p = pm[data.productId] ?? {};
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

// ── Countdown hook ────────────────────────────────────────────
function useCountdown(endsAt: string) {
  const calc = useCallback(() => {
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
  }, [endsAt]);
  const [time, set] = useState(calc);
  useEffect(() => {
    const id = setInterval(() => set(calc()), 1000);
    return () => clearInterval(id);
  }, [calc]);
  return time;
}

// ── Single flip digit ─────────────────────────────────────────
function FlipDigit({
  value,
  color,
  size = 28,
}: {
  value: string;
  color: string;
  size?: number;
}) {
  const [displayed, setDisplayed] = useState(value);
  const [flipping, setFlipping] = useState(false);
  const prev = useRef(value);

  useEffect(() => {
    if (value === prev.current) return;
    setFlipping(true);
    const t = setTimeout(() => {
      setDisplayed(value);
      prev.current = value;
      setFlipping(false);
    }, 220);
    return () => clearTimeout(t);
  }, [value]);

  const card: React.CSSProperties = {
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
      "0 2px 8px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)",
  };

  return (
    <div style={card}>
      {/* center seam */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: "50%",
          height: 1,
          background: "rgba(0,0,0,0.45)",
          zIndex: 2,
          pointerEvents: "none",
          transform: "translateY(-50%)",
        }}
      />
      <span
        style={{
          fontFamily: "'DM Mono','Courier New',monospace",
          fontSize: size,
          fontWeight: 700,
          color,
          lineHeight: 1,
          letterSpacing: "-0.04em",
          display: "block",
          transform: flipping
            ? "rotateX(90deg) scale(0.85)"
            : "rotateX(0deg) scale(1)",
          opacity: flipping ? 0 : 1,
          transition: flipping
            ? "transform 0.18s ease-in, opacity 0.18s ease-in"
            : "transform 0.22s cubic-bezier(0.34,1.56,0.64,1), opacity 0.18s ease-out",
          transformOrigin: "center center",
          userSelect: "none",
        }}
      >
        {displayed}
      </span>
    </div>
  );
}

// ── Flip unit (2 digits + label) ──────────────────────────────
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
          fontSize: 8,
          fontWeight: 600,
          letterSpacing: "0.22em",
          color: `${color}50`,
          textTransform: "uppercase",
        }}
      >
        {label}
      </span>
    </div>
  );
}

// ── Flip separator ────────────────────────────────────────────
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

// ── Full flip countdown ───────────────────────────────────────
function FlipCountdown({
  endsAt,
  size = 28,
}: {
  endsAt: string;
  size?: number;
}) {
  const { h, m, s, done, urgent } = useCountdown(endsAt);
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
        Session Ended
      </span>
    );
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 6 }}>
      {h > 0 && (
        <>
          <FlipUnit value={h} label="hrs" color={col} size={size} />
          <Sep color={col} />
        </>
      )}
      <FlipUnit value={m} label="min" color={col} size={size} />
      <Sep color={col} />
      <FlipUnit value={s} label="sec" color={col} size={size} />
    </div>
  );
}

// ── Compact row countdown (smaller) ──────────────────────────
function RowCountdown({ endsAt }: { endsAt: string }) {
  return <FlipCountdown endsAt={endsAt} size={18} />;
}

// ── Featured hero card ────────────────────────────────────────
const FeaturedCard = memo(function FeaturedCard({
  item,
  onJoin,
}: {
  item: LiveAuction;
  onJoin: () => void;
}) {
  const [hov, setHov] = useState(false);
  const [vis, setVis] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

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

  return (
    <div
      ref={ref}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      onClick={onJoin}
      style={{
        position: "relative",
        borderRadius: 20,
        overflow: "hidden",
        aspectRatio: "4/5",
        cursor: "pointer",
        opacity: vis ? 1 : 0,
        transform: vis ? "translateY(0)" : "translateY(28px)",
        transition:
          "opacity 0.65s ease, transform 0.65s cubic-bezier(0.22,1,0.36,1)",
        boxShadow: hov
          ? `0 40px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(201,169,110,0.35), 0 0 60px rgba(201,169,110,0.08)`
          : `0 16px 56px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.06)`,
      }}
      // @ts-ignore
      style2={{ transition: "box-shadow 0.5s ease" }}
    >
      {/* Image */}
      <div style={{ position: "absolute", inset: 0, background: "#06101e" }}>
        {item.image && (
          <img
            src={item.image}
            alt={item.title}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              transform: hov ? "scale(1.06)" : "scale(1)",
              filter: hov
                ? "brightness(0.5) saturate(1.1)"
                : "brightness(0.38) saturate(0.9)",
              transition:
                "transform 1s cubic-bezier(0.25,0.46,0.45,0.94), filter 0.8s ease",
              display: "block",
            }}
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        )}
      </div>

      {/* Gradient */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(to top, rgba(4,8,16,0.98) 0%, rgba(4,8,16,0.55) 45%, rgba(4,8,16,0.08) 80%, transparent 100%)",
        }}
      />

      {/* Top badges */}
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
              fontSize: 9,
              fontWeight: 700,
              color: GOLD,
              letterSpacing: "0.1em",
            }}
          >
            🔨 {item.totalBids}
          </div>
        )}
      </div>

      {/* Bottom */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          padding: "0 22px 24px",
        }}
      >
        {/* Title */}
        <h3
          style={{
            margin: "0 0 10px",
            fontSize: "clamp(18px,2.3vw,25px)",
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

        {/* Thin gold rule */}
        <div
          style={{
            height: 1,
            marginBottom: 14,
            background: `linear-gradient(90deg, ${GOLD}66, ${GOLD}1a, transparent)`,
          }}
        />

        {/* Countdown */}
        <div style={{ marginBottom: 16 }}>
          <div
            style={{
              fontSize: 8,
              fontWeight: 800,
              letterSpacing: "0.3em",
              color: "rgba(229,224,198,0.3)",
              textTransform: "uppercase",
              marginBottom: 10,
            }}
          >
            Closing in
          </div>
          <FlipCountdown endsAt={item.endsAt} size={26} />
        </div>

        {/* Price row */}
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
                fontSize: 8,
                fontWeight: 800,
                letterSpacing: "0.28em",
                color: "rgba(229,224,198,0.28)",
                textTransform: "uppercase",
                marginBottom: 5,
              }}
            >
              Current Bid
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
                EGP
              </span>
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div
              style={{
                fontSize: 8,
                fontWeight: 800,
                letterSpacing: "0.28em",
                color: "rgba(229,224,198,0.2)",
                textTransform: "uppercase",
                marginBottom: 5,
              }}
            >
              Bids
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

        {/* CTA */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onJoin();
          }}
          style={{
            width: "100%",
            padding: "14px 0",
            border: "none",
            borderRadius: 12,
            cursor: "pointer",
            fontSize: 10,
            fontWeight: 900,
            letterSpacing: "0.26em",
            textTransform: "uppercase",
            color: "#040810",
            background: hov
              ? `linear-gradient(120deg, ${GOLD2} 0%, ${GOLD} 50%, ${GOLD2} 100%)`
              : `linear-gradient(120deg, ${GOLD} 0%, ${GOLD2}bb 100%)`,
            boxShadow: hov
              ? `0 12px 44px rgba(201,169,110,0.45), 0 0 0 1px rgba(201,169,110,0.2)`
              : `0 4px 20px rgba(201,169,110,0.18)`,
            transform: hov ? "scale(1.025)" : "scale(1)",
            transition: "all 0.38s cubic-bezier(0.34,1.56,0.64,1)",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <span style={{ position: "relative", zIndex: 1 }}>
            Bid Now — Join Session
          </span>
          {hov && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                zIndex: 0,
                background:
                  "linear-gradient(105deg, transparent 35%, rgba(255,255,255,0.28) 50%, transparent 65%)",
                animation: "la-sweep 0.55s ease forwards",
              }}
            />
          )}
        </button>
      </div>
    </div>
  );
});

// ── Row item ──────────────────────────────────────────────────
const AuctionRow = memo(function AuctionRow({
  item,
  index,
  onJoin,
}: {
  item: LiveAuction;
  index: number;
  onJoin: () => void;
}) {
  const [hov, setHov] = useState(false);
  const [vis, setVis] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

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
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      onClick={onJoin}
      style={{
        position: "relative",
        cursor: "pointer",
        display: "grid",
        gridTemplateColumns: "64px 1fr auto auto",
        gap: "0 22px",
        alignItems: "center",
        padding: "20px 28px 20px 22px",
        opacity: vis ? 1 : 0,
        transform: vis ? "translateX(0)" : "translateX(-20px)",
        transition: `opacity 0.5s ease ${index * 0.08}s, transform 0.5s cubic-bezier(0.22,1,0.36,1) ${index * 0.08}s`,
        overflow: "hidden",
      }}
    >
      {/* hover bg */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: hov
            ? "linear-gradient(90deg, rgba(201,169,110,0.055), rgba(201,169,110,0.015))"
            : "transparent",
          transition: "background 0.35s ease",
          pointerEvents: "none",
        }}
      />

      {/* left accent bar */}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: "18%",
          bottom: "18%",
          width: 2,
          borderRadius: 2,
          background: hov
            ? `linear-gradient(180deg, transparent, ${GOLD}cc, transparent)`
            : "transparent",
          transition: "all 0.35s ease",
        }}
      />

      {/* thumb */}
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: 10,
          overflow: "hidden",
          flexShrink: 0,
          position: "relative",
          background: "#0a1525",
          border: `1px solid ${hov ? "rgba(201,169,110,0.4)" : "rgba(255,255,255,0.07)"}`,
          boxShadow: hov
            ? `0 8px 28px rgba(0,0,0,0.5)`
            : `0 2px 10px rgba(0,0,0,0.3)`,
          transition: "border-color 0.3s ease, box-shadow 0.3s ease",
        }}
      >
        {item.image ? (
          <img
            src={item.image}
            alt={item.title}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              display: "block",
              transform: hov ? "scale(1.12)" : "scale(1)",
              transition: "transform 0.7s cubic-bezier(0.25,0.46,0.45,0.94)",
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
        {/* live dot */}
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

      {/* title + meta */}
      <div style={{ minWidth: 0 }}>
        <div
          style={{
            fontSize: "clamp(13px,1.4vw,15px)",
            fontWeight: 900,
            color: hov ? "#ffffff" : "rgba(229,224,198,0.88)",
            letterSpacing: "-0.025em",
            lineHeight: 1.2,
            marginBottom: 6,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            transition: "color 0.25s ease",
          }}
        >
          {item.title}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 3 }}>
            <span
              style={{
                fontFamily: "'DM Mono',monospace",
                fontSize: 14,
                fontWeight: 700,
                color: hov ? GOLD : `${GOLD}99`,
                letterSpacing: "-0.03em",
                transition: "color 0.25s ease",
              }}
            >
              {item.currentBid.toLocaleString()}
            </span>
            <span
              style={{
                fontSize: 8,
                fontWeight: 800,
                color: "rgba(229,224,198,0.2)",
                letterSpacing: "0.14em",
              }}
            >
              EGP
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
              fontSize: 9,
              fontWeight: 800,
              letterSpacing: "0.16em",
              color: "rgba(229,224,198,0.25)",
              textTransform: "uppercase",
            }}
          >
            {item.totalBids} bid{item.totalBids !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      {/* countdown */}
      <div style={{ textAlign: "right", flexShrink: 0 }}>
        <div
          style={{
            fontSize: 8,
            fontWeight: 800,
            letterSpacing: "0.26em",
            color: "rgba(229,224,198,0.22)",
            textTransform: "uppercase",
            marginBottom: 8,
          }}
        >
          Ends in
        </div>
        <RowCountdown endsAt={item.endsAt} />
      </div>

      {/* join btn */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onJoin();
        }}
        style={{
          flexShrink: 0,
          width: 108,
          height: 40,
          borderRadius: 8,
          cursor: "pointer",
          background: hov
            ? `linear-gradient(120deg, ${GOLD2}, ${GOLD})`
            : "transparent",
          border: `1px solid ${hov ? "transparent" : "rgba(201,169,110,0.32)"}`,
          fontSize: 9,
          fontWeight: 900,
          letterSpacing: "0.2em",
          textTransform: "uppercase",
          color: hov ? "#040810" : GOLD,
          transform: hov ? "scale(1.05)" : "scale(1)",
          boxShadow: hov ? `0 6px 28px rgba(201,169,110,0.35)` : "none",
          transition: "all 0.32s cubic-bezier(0.34,1.56,0.64,1)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <span style={{ position: "relative", zIndex: 1 }}>Join Now</span>
        {hov && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 0,
              background:
                "linear-gradient(105deg, transparent 35%, rgba(255,255,255,0.25) 50%, transparent 65%)",
              animation: "la-sweep 0.5s ease forwards",
            }}
          />
        )}
      </button>

      {/* divider */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 22,
          right: 28,
          height: 1,
          background: hov
            ? "linear-gradient(90deg, rgba(201,169,110,0.18), rgba(201,169,110,0.04))"
            : "rgba(255,255,255,0.04)",
          transition: "background 0.35s ease",
        }}
      />
    </div>
  );
});

// ── Skeleton ──────────────────────────────────────────────────
function Skel({ style }: { style?: React.CSSProperties }) {
  return <div className="la-skel" style={{ borderRadius: 8, ...style }} />;
}

// ── Section ───────────────────────────────────────────────────
export default function LiveAuctionsSection() {
  const { auctions, loading } = useLiveAuctions();
  const { user } = useAuth();
  const navigate = useNavigate();
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

  return (
    <section
      style={{
        background: "linear-gradient(180deg, #050810 0%, #06101c 100%)",
        padding: "88px 0 108px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <style>{`
        @keyframes la-pulse  { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.7;transform:scale(1.18)} }
        @keyframes la-shimmer{ 0%{background-position:200% 0} 100%{background-position:-200% 0} }
        @keyframes la-sweep  { from{transform:translateX(-120%)} to{transform:translateX(220%)} }
        .la-skel {
          background: linear-gradient(90deg,rgba(255,255,255,0.03) 25%,rgba(255,255,255,0.07) 50%,rgba(255,255,255,0.03) 75%);
          background-size:200% 100%; animation:la-shimmer 1.8s infinite;
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

      {/* Ambient glow */}
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
            "radial-gradient(ellipse, rgba(201,169,110,0.04) 0%, transparent 65%)",
          pointerEvents: "none",
        }}
      />

      {/* ── Header ────────────────────────────────────────── */}
      <div
        ref={hdrRef}
        style={{
          maxWidth: 1200,
          margin: "0 auto 60px",
          padding: "0 48px",
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
            transition: "opacity 0.6s ease, transform 0.6s ease",
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
                  fontSize: 9,
                  fontWeight: 900,
                  color: "#4ade80",
                  letterSpacing: "0.28em",
                  textTransform: "uppercase",
                }}
              >
                Live Auctions
              </span>
            </div>
            {!loading && auctions.length > 0 && (
              <span
                style={{
                  fontSize: 9,
                  fontWeight: 700,
                  color: "rgba(201,169,110,0.45)",
                  letterSpacing: "0.14em",
                }}
              >
                {auctions.length} active
              </span>
            )}
          </div>

          <div
            style={{
              fontSize: "clamp(28px,4vw,46px)",
              fontWeight: 900,
              letterSpacing: "-0.03em",
              lineHeight: 1.05,
              color: "#fff",
            }}
          >
            Happening
            <br />
            <span
              style={{
                background: `linear-gradient(100deg, ${GOLD} 0%, ${GOLD2} 55%, ${GOLD} 100%)`,
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              Right Now.
            </span>
          </div>
        </div>

        <p
          style={{
            fontSize: 13,
            color: "rgba(229,224,198,0.28)",
            lineHeight: 1.8,
            maxWidth: 280,
            marginBottom: 6,
            opacity: hdrVis ? 1 : 0,
            transform: hdrVis ? "translateY(0)" : "translateY(14px)",
            transition: "opacity 0.7s ease 0.15s, transform 0.7s ease 0.15s",
          }}
        >
          These sessions are live. Every bid raises the stakes, place yours
          before the clock runs out.
        </p>
      </div>

      {/* ── Content grid ──────────────────────────────────── */}
      <div
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: "0 48px",
          display: "grid",
          gridTemplateColumns:
            loading || auctions.length <= 1
              ? "1fr"
              : auctions.length === 2
                ? "1fr 1fr"
                : "minmax(260px,360px) 1fr",
          gap: 3,
        }}
      >
        {loading ? (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "360px 1fr",
              gap: 3,
            }}
          >
            {/* featured skel */}
            <div
              style={{
                borderRadius: 20,
                overflow: "hidden",
                aspectRatio: "4/5",
              }}
            >
              <div
                className="la-skel"
                style={{ width: "100%", height: "100%" }}
              />
            </div>
            {/* rows skel */}
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
                  padding: "18px 28px 14px 22px",
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
                    padding: "20px 28px 20px 22px",
                    borderBottom: "1px solid rgba(255,255,255,0.04)",
                    display: "grid",
                    gridTemplateColumns: "64px 1fr auto auto",
                    gap: "0 22px",
                    alignItems: "center",
                  }}
                >
                  <Skel style={{ width: 64, height: 64, borderRadius: 10 }} />
                  <div
                    style={{ display: "flex", flexDirection: "column", gap: 8 }}
                  >
                    <Skel style={{ height: 13, width: "60%" }} />
                    <Skel style={{ height: 8, width: "38%" }} />
                  </div>
                  <Skel style={{ width: 72, height: 28 }} />
                  <Skel style={{ width: 108, height: 40, borderRadius: 8 }} />
                </div>
              ))}
            </div>
          </div>
        ) : auctions.length === 1 ? (
          <div style={{ maxWidth: 400, margin: "0 auto", width: "100%" }}>
            <FeaturedCard item={featured} onJoin={() => handleJoin(featured)} />
          </div>
        ) : (
          <>
            <FeaturedCard item={featured} onJoin={() => handleJoin(featured)} />

            {/* List panel */}
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
              {/* panel header */}
              <div
                style={{
                  padding: "18px 28px 14px 22px",
                  borderBottom: "1px solid rgba(255,255,255,0.05)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <span
                  style={{
                    fontSize: 9,
                    fontWeight: 800,
                    letterSpacing: "0.22em",
                    color: "rgba(229,224,198,0.22)",
                    textTransform: "uppercase",
                  }}
                >
                  More Sessions
                </span>
                <span
                  style={{
                    fontSize: 9,
                    fontWeight: 700,
                    color: "rgba(201,169,110,0.38)",
                    letterSpacing: "0.12em",
                  }}
                >
                  {rest.length} active
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
                  Only one live session right now
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* border lines */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 1,
          background:
            "linear-gradient(90deg, transparent, rgba(201,169,110,0.1), transparent)",
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
            "linear-gradient(90deg, transparent, rgba(201,169,110,0.1), transparent)",
        }}
      />
    </section>
  );
}
