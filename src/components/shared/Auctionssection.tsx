import React, { useState, useEffect, useRef, useCallback, memo } from "react";
import SplitText from "@/components/SplitText";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/store/AuthContext/AuthContext";
import LoginPromptModal from "@/components/shared/Loginpromptmodal";
import {
  collection,
  getDocs,
  getDoc,
  doc,
  query,
  orderBy,
  where,
  limit,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/firebase/firebase";
import { CountdownBar } from "./CountdownBar";

// ─── Reusable countdown stopwatch ─────────────────────────────────────────────

const GOLD = "#c9a96e";
const GOLD2 = "#b8944e";
const NAVY = "#2A4863";
const NAVY2 = "#1e3652";
const CREAM = "rgb(229,224,198)";

interface UpcomingAuction {
  id: string;
  productId: string;
  title: string;
  subtitle: string;
  image: string;
  startingPrice: number;
  currency: string;
  pieces: number;
  startsAt: string;
  sessionDate: string;
  isHot: boolean;
}
interface PastAuction {
  id: string;
  title: string;
  subtitle: string;
  image: string;
  winningPrice: number;
  currency: string;
  sessionDate: string;
  winner: {
    name: string;
    avatar: string;
    country: string;
    countryName: string;
  };
}

// ─── Data hook ────────────────────────────────────────────────────────────────
function useAuctionsData() {
  const [upcoming, setUpcoming] = useState<UpcomingAuction[]>([]);
  const [past, setPast] = useState<PastAuction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        setError(null);
        const now = Timestamp.now();
        const [upSnap, pastSnap] = await Promise.all([
          getDocs(
            query(
              collection(db, "auctions"),
              where("startTime", ">", now),
              where("isActive", "==", true),
              orderBy("startTime", "asc"),
            ),
          ),
          getDocs(
            query(
              collection(db, "auctions"),
              where("endTime", "<=", now),
              orderBy("endTime", "desc"),
              limit(5),
            ),
          ),
        ]);
        if (cancelled) return;

        const productIds = new Set<string>();
        [...upSnap.docs, ...pastSnap.docs].forEach((d) => {
          if (d.data().productId) productIds.add(d.data().productId);
        });
        const winnerIds = new Set<string>();
        pastSnap.docs.forEach((d) => {
          const w = d.data().winnerId;
          if (w && w !== "NO_WINNER") winnerIds.add(w);
        });

        const [productEntries, userEntries] = await Promise.all([
          Promise.all(
            Array.from(productIds).map(async (pid) => {
              try {
                const s = await getDoc(doc(db, "products", pid));
                return s.exists() ? ([pid, s.data()] as const) : null;
              } catch {
                return null;
              }
            }),
          ),
          Promise.all(
            Array.from(winnerIds).map(async (uid) => {
              try {
                const s = await getDoc(doc(db, "users", uid));
                return s.exists() ? ([uid, s.data()] as const) : null;
              } catch {
                return null;
              }
            }),
          ),
        ]);
        if (cancelled) return;

        const pMap: Record<string, any> = Object.fromEntries(
          productEntries.filter(Boolean) as any,
        );
        const uMap: Record<string, any> = Object.fromEntries(
          userEntries.filter(Boolean) as any,
        );

        const toDate = (v: any): Date =>
          v instanceof Timestamp ? v.toDate() : new Date(v);
        const fmt = (d: Date, o: Intl.DateTimeFormatOptions) =>
          d.toLocaleDateString("en-US", o);
        const fmtT = (d: Date) =>
          d.toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
          });

        const upcomingList: UpcomingAuction[] = upSnap.docs.map((d) => {
          const data = d.data(),
            p = pMap[data.productId] ?? {};
          const start = toDate(data.startTime),
            end = toDate(data.endTime);
          const image =
            p.thumbnail && p.thumbnail !== "null"
              ? p.thumbnail
              : (p.images?.[0] ?? "");
          return {
            id: d.id,
            productId: data.productId ?? "",
            title: p.title ?? "Auction",
            subtitle: [p.brand, p.model].filter(Boolean).join(" · "),
            image,
            startingPrice: data.startingPrice ?? 0,
            currency: "EGP",
            pieces: p.quantity ?? 1,
            startsAt: start.toISOString(),
            sessionDate: `${fmt(start, { month: "short", day: "numeric", year: "numeric" })} · ${fmtT(start)} – ${fmtT(end)}`,
            isHot: (data.totalBids ?? 0) > 5,
          };
        });

        const pastList: PastAuction[] = pastSnap.docs
          .filter((d) => {
            const w = d.data().winnerId;
            return w !== null && w !== undefined;
          })
          .map((d) => {
            const data = d.data(),
              p = pMap[data.productId] ?? {};
            const end = toDate(data.endTime);
            const image =
              p.thumbnail && p.thumbnail !== "null"
                ? p.thumbnail
                : (p.images?.[0] ?? "");
            const wid = data.winnerId as string,
              u = uMap[wid] ?? {};
            const winnerName =
              wid === "NO_WINNER"
                ? "No Winner"
                : (u.fullName ??
                    u.displayName ??
                    `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim()) ||
                  "Unknown";
            return {
              id: d.id,
              title: p.title ?? "Auction",
              subtitle: [p.brand, p.model].filter(Boolean).join(" · "),
              image,
              winningPrice: data.winningBid ?? 0,
              currency: "EGP",
              sessionDate: fmt(end, {
                weekday: "long",
                month: "long",
                day: "numeric",
                year: "numeric",
              }),
              winner: {
                name: winnerName,
                avatar: wid === "NO_WINNER" ? "" : (u.profileImage ?? ""),
                country: "🇪🇬",
                countryName: "Egypt",
              },
            };
          });

        setUpcoming(upcomingList);
        setPast(pastList);
      } catch (err: any) {
        if (!cancelled) {
          console.error("[AuctionsSection]", err);
          setError("Failed to load auctions");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return { upcoming, past, loading, error };
}

// ─── SkeletonCard ─────────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div
      className="ac"
      style={{
        borderRadius: 20,
        background: "rgba(255,255,255,0.028)",
        border: "1px solid rgba(229,224,198,0.08)",
        overflow: "hidden",
      }}
    >
      <style>{`@keyframes sh{0%{background-position:200% 0}100%{background-position:-200% 0}}.sk{background:linear-gradient(90deg,rgba(255,255,255,.04) 25%,rgba(255,255,255,.08) 50%,rgba(255,255,255,.04) 75%);background-size:200% 100%;animation:sh 1.5s infinite;border-radius:4px;}`}</style>
      <div className="sk ac-img" style={{ minHeight: 220 }} />
      <div
        style={{
          padding: "22px 24px",
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        <div className="sk" style={{ height: 20, width: "60%" }} />
        <div className="sk" style={{ height: 12, width: "40%" }} />
        <div className="sk" style={{ height: 10, width: 120 }} />
        <div className="sk" style={{ height: 24, width: "50%" }} />
        <div className="sk" style={{ height: 1 }} />
        <div className="sk" style={{ height: 90, borderRadius: 14 }} />
      </div>
    </div>
  );
}

// ─── UpcomingCard ─────────────────────────────────────────────────────────────
const UpcomingCard = memo(function UpcomingCard({
  item,
  index,
  isLoggedIn,
  onRegister,
}: {
  item: UpcomingAuction;
  index: number;
  isLoggedIn: boolean;
  onRegister: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [vis, setVis] = useState(false);
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === "ar";
  const cur = isRtl ? "جنيه" : item.currency;

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
      { threshold: 0.08 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className="ac ac-upcoming"
      style={{
        opacity: vis ? 1 : 0,
        transform: vis ? "translateY(0)" : "translateY(40px)",
        transition: `opacity 0.7s ease ${index * 0.1}s, transform 0.7s cubic-bezier(0.22,1,0.36,1) ${index * 0.1}s`,
        overflow: "hidden",
        minWidth: 0,
        willChange: "transform",
      }}
    >
      <div
        className="ac-img"
        style={{
          position: "relative",
          overflow: "hidden",
          background: "#0d1520",
          minHeight: 220,
        }}
      >
        {item.image ? (
          <img
            src={item.image}
            alt={item.title}
            loading="lazy"
            decoding="async"
            className="ac-img-inner"
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              objectPosition: "center",
              display: "block",
              minHeight: 180,
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
              minHeight: 180,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: `linear-gradient(135deg,${NAVY}18,${NAVY}08)`,
            }}
          >
            <span style={{ fontSize: 42, fontWeight: 900, color: `${NAVY}30` }}>
              {item.title[0].toUpperCase()}
            </span>
          </div>
        )}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(to right,transparent 50%,rgba(10,10,26,0.6))",
          }}
        />
        {item.isHot && (
          <div
            style={{
              position: "absolute",
              bottom: 10,
              left: 10,
              background: "rgba(160,40,40,0.85)",
              border: "1px solid rgba(255,100,100,0.3)",
              borderRadius: 6,
              padding: "3px 8px",
              fontSize: 11,
              fontWeight: 800,
              color: "#ffb0b0",
              letterSpacing: "0.1em",
              fontFamily: "'Jost', sans-serif",
            }}
          >
            🔥 HOT
          </div>
        )}
      </div>

      <div
        style={{
          padding: "20px clamp(16px,4vw,24px)",
          display: "flex",
          flexDirection: "column",
          gap: 12,
          minWidth: 0,
          overflow: "hidden",
          boxSizing: "border-box",
        }}
      >
        <div className="ac-top">
          <div style={{ minWidth: 0, flex: 1 }}>
            <h3
              style={{
                margin: 0,
                fontSize: 22,
                fontWeight: 900,
                color: CREAM,
                letterSpacing: "-0.01em",
                lineHeight: 1.2,
                wordBreak: "break-word",
              }}
            >
              {item.title}
            </h3>
            <p
              style={{
                margin: "3px 0 0",
                fontSize: 14,
                color: "rgba(229,224,198,0.55)",
                fontWeight: 400,
              }}
            >
              {item.subtitle}
            </p>
          </div>
          <button
            className="ac-btn ac-register-btn"
            onClick={onRegister}
            style={{
              background: `linear-gradient(135deg,${GOLD},${GOLD2})`,
              color: "#0a0a1a",
              border: "none",
              borderRadius: 999,
              padding: "10px 22px",
              fontSize: 14,
              fontWeight: 800,
              fontFamily: "'Jost', sans-serif",
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              cursor: "pointer",
              whiteSpace: "nowrap",
              flexShrink: 0,
              boxShadow: `0 4px 20px ${GOLD}44`,
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            {isLoggedIn
              ? t("auctionsSection.joinNow") || "✦ JOIN NOW"
              : t("auctionsSection.registerToJoin")}
          </button>
        </div>

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "8px 16px",
            fontSize: 13,
          }}
        >
          <span
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              color: "rgba(229,224,198)",
              flexWrap: "wrap",
              wordBreak: "break-word",
            }}
          >
            <span style={{ color: GOLD, fontSize: 13 }}>📅</span>
            {item.sessionDate}
          </span>
          <span
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              color: "rgba(229,224,198,0.5)",
            }}
          >
            <span style={{ color: GOLD, fontSize: 13 }}>📦</span>
            {item.pieces}{" "}
            {item.pieces === 1
              ? t("auctionsSection.piece")
              : t("auctionsSection.pieces")}
          </span>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            gap: 6,
            flexWrap: "wrap",
          }}
        >
          <span
            style={{
              fontSize: 14,
              color: "rgba(229,224,198,0.8)",
              fontWeight: 700,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
              fontFamily: "'Jost', sans-serif",
            }}
          >
            {t("auctionsSection.startingFrom")}
          </span>
          <span
            style={{
              fontSize: 20,
              fontWeight: 900,
              color: GOLD,
              fontFamily: "'Jost', sans-serif",
            }}
          >
            {item.startingPrice.toLocaleString()}
          </span>
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: `${GOLD}99`,
              fontFamily: "'Jost', sans-serif",
            }}
          >
            {cur}
          </span>
        </div>

        <div
          style={{
            height: 1,
            background: `linear-gradient(90deg,rgba(201,169,110,0.2),transparent)`,
          }}
        />

        <div style={{ minWidth: 0, overflow: "hidden" }}>
          <div
            style={{
              fontSize: 16,
              fontWeight: 800,
              color: "rgba(229,224,198,0.8)",
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              marginBottom: 10,
              fontFamily: "'Jost', sans-serif",
            }}
          >
            {t("auctionsSection.sessionStartsIn")}
          </div>
          <div style={{ overflow: "hidden" }}>
            <CountdownBar startsAt={item.startsAt} />
          </div>
        </div>
      </div>
    </div>
  );
});

// ─── HammerStamp ──────────────────────────────────────────────────────────────
function HammerStamp() {
  return (
    <div
      style={{
        position: "absolute",
        bottom: 10,
        left: "50%",
        transform: "translateX(-50%) rotate(-12deg)",
        pointerEvents: "none",
        zIndex: 10,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 5,
      }}
    >
      {/* Circle — scaleX(-1) mirrors it so the hammer faces right */}
      <div
        style={{
          width: 96,
          height: 96,
          borderRadius: "50%",
          border: "4px solid rgba(200,30,30,0.92)",
          boxShadow:
            "0 0 0 2px rgba(200,30,30,0.18), 0 0 28px rgba(200,30,30,0.45), inset 0 0 20px rgba(200,30,30,0.12)",
          background: "rgba(10,6,6,0.52)",
          backdropFilter: "blur(4px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          filter: "contrast(1.08) saturate(1.1)",
          transform: "scaleX(-1)",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 5,
            borderRadius: "50%",
            border: "1.5px solid rgba(200,30,30,0.45)",
          }}
        />
        <svg
          width="54"
          height="54"
          viewBox="0 0 48 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{ position: "relative", zIndex: 1 }}
        >
          <rect
            x="4"
            y="16"
            width="22"
            height="9"
            rx="2.5"
            fill="rgba(200,30,30,0.22)"
            stroke="rgba(220,40,40,0.95)"
            strokeWidth="2.2"
            transform="rotate(-45 15 20.5)"
          />
          <rect
            x="4"
            y="16"
            width="7"
            height="9"
            rx="2"
            fill="rgba(220,40,40,0.38)"
            stroke="rgba(230,50,50,0.95)"
            strokeWidth="2"
            transform="rotate(-45 15 20.5)"
          />
          <line
            x1="24"
            y1="24"
            x2="42"
            y2="42"
            stroke="rgba(220,40,40,0.9)"
            strokeWidth="4"
            strokeLinecap="round"
          />
          <line
            x1="30"
            y1="30"
            x2="34"
            y2="34"
            stroke="rgba(200,30,30,0.55)"
            strokeWidth="5"
            strokeLinecap="round"
          />
          <rect
            x="8"
            y="42"
            width="26"
            height="4"
            rx="2"
            fill="rgba(200,30,30,0.35)"
            stroke="rgba(210,40,40,0.8)"
            strokeWidth="1.8"
          />
        </svg>
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "50%",
            background:
              "radial-gradient(ellipse at 30% 30%, rgba(255,255,255,0.04) 0%, transparent 60%)",
            mixBlendMode: "overlay",
          }}
        />
      </div>

      {/* HAMMERED label — same red family as the stamp */}
      <span
        style={{
          fontSize: 15,
          fontWeight: 1000,
          letterSpacing: "0.22em",  
          textTransform: "uppercase",
          color: "rgba(220,40,40,0.92)",
          fontFamily: "'Jost', sans-serif",
          textShadow: "0 0 10px rgba(200,30,30,0.6)",
          background: "rgba(10,6,6,0.55)",
          borderRadius: 4,
          padding: "6px 6px",
          marginBottom: "8px",
          border: "1px solid rgba(200,30,30,0.35)",
        }}
      >
        HAMMERED
      </span>
    </div>
  );
}

// ─── PastCard ─────────────────────────────────────────────────────────────────
const PastCard = memo(function PastCard({
  item,
  index,
}: {
  item: PastAuction;
  index: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [vis, setVis] = useState(false);
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === "ar";
  const cur = isRtl ? "جنيه" : item.currency;

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
      { threshold: 0.08 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className="ac ac-past"
      style={{
        opacity: vis ? 1 : 0,
        transform: vis ? "translateY(0)" : "translateY(40px)",
        transition: `opacity 0.7s ease ${index * 0.1}s, transform 0.7s cubic-bezier(0.22,1,0.36,1) ${index * 0.1}s`,
        overflow: "hidden",
        minWidth: 0,
        willChange: "transform",
      }}
    >
      <div
        className="ac-img"
        style={{
          position: "relative",
          overflow: "hidden",
          background: "#0d1520",
          minHeight: 220,
        }}
      >
        {item.image ? (
          <img
            src={item.image}
            alt={item.title}
            loading="lazy"
            decoding="async"
            className="ac-img-inner ac-img-past"
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              objectPosition: "center",
              minHeight: 200,
              display: "block",
              filter: "grayscale(30%) brightness(0.75)",
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
              minHeight: 200,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: `linear-gradient(135deg,${NAVY}18,${NAVY}08)`,
              filter: "grayscale(30%) brightness(0.75)",
            }}
          >
            <span style={{ fontSize: 42, fontWeight: 900, color: `${NAVY}30` }}>
              {item.title[0].toUpperCase()}
            </span>
          </div>
        )}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(to right,transparent 40%,rgba(10,10,26,0.55))",
          }}
        />
        <HammerStamp />
      </div>

      <div
        style={{
          padding: "22px 24px",
          display: "flex",
          flexDirection: "column",
          gap: 14,
          minWidth: 0,
          boxSizing: "border-box",
        }}
      >
        <div>
          <h3
            style={{
              margin: 0,
              fontSize: 20,
              fontWeight: 900,
              color: CREAM,
              letterSpacing: "-0.01em",
              wordBreak: "break-word",
            }}
          >
            {item.title}
          </h3>
          <p
            style={{
              margin: "3px 0 0",
              fontSize: 14,
              color: "rgba(229,224,198,0.4)",
              fontWeight: 400,
            }}
          >
            {item.subtitle}
          </p>
        </div>
        <span
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontSize: 14,
            color: "rgba(229,224,198,0.75)",
            flexWrap: "wrap",
          }}
        >
          <span style={{ color: GOLD, fontSize: 13 }}>📅</span>
          {t("auctionsSection.session")}: {item.sessionDate}
        </span>
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            gap: 6,
            flexWrap: "wrap",
          }}
        >
          <span
            style={{
              fontSize: 14,
              color: "rgba(229,224,198,0.8)",
              fontWeight: 700,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              fontFamily: "'Jost', sans-serif",
            }}
          >
            {t("auctionsSection.winningPrice")}
          </span>
          <span
            style={{
              fontSize: 20,
              fontWeight: 900,
              color: "#7ecf9a",
              fontFamily: "'Jost', sans-serif",
            }}
          >
            {item.winningPrice.toLocaleString()}
          </span>
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: "#5aaa7a",
              fontFamily: "'Jost', sans-serif",
            }}
          >
            {cur}
          </span>
        </div>
        <div
          style={{
            height: 1,
            background:
              "linear-gradient(90deg,rgba(229,224,198,0.1),transparent)",
          }}
        />
        <div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: 8,
              marginBottom: 8,
            }}
          >
            {[
              t("auctionsSection.winner"),
              t("auctionsSection.name"),
              t("auctionsSection.country"),
            ].map((h) => (
              <span
                key={h}
                style={{
                  fontSize: 15,
                  fontWeight: 800,
                  color: "rgba(229,224,198)",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  fontFamily: "'Jost', sans-serif",
                }}
              >
                {h}
              </span>
            ))}
          </div>
          <div
            style={{
              height: 1,
              background: "rgba(229,224,198,0.08)",
              marginBottom: 10,
            }}
          />
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: 8,
              alignItems: "center",
            }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: "50%",
                border: `2px solid ${GOLD}55`,
                overflow: "hidden",
                background: NAVY2,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {item.winner.avatar ? (
                <img
                  src={item.winner.avatar}
                  alt={item.winner.name}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              ) : (
                <span style={{ fontSize: 16, color: "rgba(229,224,198,0.4)" }}>
                  {item.winner.name[0].toUpperCase()}
                </span>
              )}
            </div>
            <span
              style={{
                fontSize: 16,
                fontWeight: 700,
                color: CREAM,
                fontFamily: "'Jost', sans-serif",
                wordBreak: "break-word",
              }}
            >
              {item.winner.name}
            </span>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                flexWrap: "wrap",
              }}
            >
              <span style={{ fontSize: 22 }}>{item.winner.country}</span>
              <span
                style={{
                  fontSize: 15,
                  color: "rgba(229,224,198)",
                  fontFamily: "'Jost', sans-serif",
                }}
              >
                {item.winner.countryName}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

// ─── TabButton ────────────────────────────────────────────────────────────────
function TabButton({
  label,
  active,
  onClick,
  icon,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  icon: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`as-tab-btn${active ? " active" : ""}`}
      style={{
        position: "relative",
        background: "none",
        border: "none",
        cursor: "pointer",
        padding: "14px 32px",
        display: "flex",
        alignItems: "center",
        gap: 8,
        transition: "all 0.3s ease",
      }}
    >
      <span style={{ fontSize: 16 }}>{icon}</span>
      <span
        style={{
          fontFamily: "'Jost', sans-serif",
          fontSize: 17,
          fontWeight: 800,
          letterSpacing: "0.17em",
          textTransform: "uppercase",
          color: active ? GOLD : "rgba(229,224,198,0.8)",
          transition: "color 0.3s ease",
        }}
      >
        {label}
      </span>
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: active ? "8%" : "50%",
          right: active ? "8%" : "50%",
          height: 2,
          background: `linear-gradient(90deg,transparent,${GOLD},transparent)`,
          borderRadius: 999,
          transition:
            "left 0.45s cubic-bezier(0.22,1,0.36,1), right 0.45s cubic-bezier(0.22,1,0.36,1)",
          opacity: active ? 1 : 0,
          boxShadow: active ? `0 0 10px ${GOLD}88` : "none",
        }}
      />
    </button>
  );
}

// ─── Main section ─────────────────────────────────────────────────────────────
export default function AuctionsSection() {
  const [tab, setTab] = useState<"upcoming" | "past">("upcoming");
  const [anim, setAnim] = useState(false);
  const headerRef = useRef<HTMLDivElement>(null);
  const [vis, setVis] = useState(false);
  const [animKey, setAnimKey] = useState(0);
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === "ar";
  const { user } = useAuth();
  const navigate = useNavigate();
  const [modal, setModal] = useState(false);
  const { upcoming, past, loading, error } = useAuctionsData();

  const onRegister = useCallback(
    (productId: string) => {
      if (user) navigate(`/auctions/register/${productId}`);
      else setModal(true);
    },
    [user, navigate],
  );

  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setVis(true);
          setAnimKey((k) => k + 1);
          obs.disconnect();
        }
      },
      { threshold: 0.2 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    setAnimKey((k) => k + 1);
  }, [i18n.language]);

  const switchTab = (next: "upcoming" | "past") => {
    if (next === tab || anim) return;
    setAnim(true);
    setTimeout(() => {
      setTab(next);
      setAnim(false);
    }, 220);
  };

  const bg: React.CSSProperties = {
    position: "absolute",
    borderRadius: "50%",
    pointerEvents: "none",
  };

  return (
    <section
      dir={isAr ? "rtl" : "ltr"}
      style={{
        background: "linear-gradient(180deg,#1f2a3d 0%,#224266 100%)",
        padding: "100px 32px 120px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <style>{`
        @keyframes tabIn { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        @keyframes liveP  { 0%,100%{opacity:1;box-shadow:0 0 6px #5ee8a0} 50%{opacity:.4;box-shadow:0 0 12px #5ee8a0} }
        @keyframes cdFlip { from{opacity:0;transform:translateY(-6px)} to{opacity:1;transform:translateY(0)} }
        .lz-cd-digit { animation: cdFlip 0.22s cubic-bezier(0,0,0.2,1) both; }
        .tab-in  { animation: tabIn 0.38s cubic-bezier(0.22,1,0.36,1) forwards }
        .tab-out { opacity:0; transform:translateY(-8px); transition:opacity .2s ease,transform .2s ease }
        .ac { display:grid; grid-template-columns:220px 1fr; overflow:hidden; border-radius:20px; min-width:0; box-sizing:border-box; }
        .ac-img { position:relative; overflow:hidden; background:#0d1520; min-height:220px }
        .ac-top { display:flex; align-items:flex-start; justify-content:space-between; gap:16px }
        .ac-upcoming { background:rgba(255,255,255,0.028); border:1px solid rgba(229,224,198,0.08); backdrop-filter:blur(14px); box-shadow:0 4px 24px rgba(0,0,0,0.2); border-radius:20px; transition:background .3s ease,border-color .3s ease,box-shadow .3s ease; }
        .ac-upcoming:hover { background:rgba(255,255,255,0.055); border-color:rgba(201,169,110,0.4); box-shadow:0 24px 64px rgba(0,0,0,0.5),inset 0 1px 0 rgba(255,255,255,0.07); }
        .ac-past { background:rgba(255,255,255,0.022); border:1px solid rgba(229,224,198,0.07); backdrop-filter:blur(14px); box-shadow:0 4px 20px rgba(0,0,0,0.18); border-radius:20px; transition:background .3s ease,border-color .3s ease,box-shadow .3s ease; }
        .ac-past:hover { background:rgba(255,255,255,0.045); border-color:rgba(229,224,198,0.18); box-shadow:0 20px 56px rgba(0,0,0,0.4),inset 0 1px 0 rgba(255,255,255,0.06); }
        .ac-img-inner { transition:transform 0.65s cubic-bezier(0.25,0.46,0.45,0.94); }
        .ac-upcoming:hover .ac-img-inner, .ac-past:hover .ac-img-inner { transform:scale(1.06); }
        .ac-register-btn { transition:transform 0.3s ease,box-shadow 0.3s ease !important; }
        .ac-register-btn:hover { transform:translateY(-2px) scale(1.04) !important; box-shadow:0 8px 28px ${GOLD}55 !important; }
        .as-tab-btn span:last-of-type { transition:color 0.3s ease; }
        .as-tab-btn:not(.active):hover span:last-of-type { color:rgba(229,224,198,0.7) !important; }
        @media (max-width:640px) {
          .ac { grid-template-columns:1fr !important; width:100% !important; }
          .ac-img { height:200px !important; min-height:200px !important }
          .ac-top { flex-direction:column !important; align-items:stretch !important; gap:10px !important }
          .ac-btn { width:100% !important; padding:13px 0 !important; justify-content:center !important }
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

      {/* Background blobs */}
      <div
        style={{
          ...bg,
          top: "40%",
          left: "50%",
          transform: "translate(-50%,-50%)",
          width: 1000,
          height: 700,
          background:
            "radial-gradient(ellipse,rgba(42,72,99,0.12) 0%,transparent 65%)",
        }}
      />
      <div
        style={{
          ...bg,
          top: -80,
          right: "3%",
          width: 400,
          height: 400,
          background:
            "radial-gradient(circle,rgba(201,169,110,0.05) 0%,transparent 70%)",
        }}
      />
      <div
        style={{
          ...bg,
          bottom: -100,
          left: "5%",
          width: 360,
          height: 360,
          background:
            "radial-gradient(circle,rgba(42,72,99,0.1) 0%,transparent 70%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 1,
          background: `linear-gradient(90deg,transparent,${GOLD},rgba(229,224,198,0.5),${GOLD},transparent)`,
          opacity: 0.28,
        }}
      />

      {/* Header */}
      <div
        ref={headerRef}
        style={{
          textAlign: "center",
          marginBottom: 56,
          position: "relative",
          zIndex: 1,
        }}
      >
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 10,
            marginBottom: 20,
            opacity: vis ? 1 : 0,
            transform: vis ? "translateY(0)" : "translateY(14px)",
            transition: "opacity 0.55s ease,transform 0.55s ease",
          }}
        >
          <div
            style={{
              width: 32,
              height: 1,
              background: `linear-gradient(90deg,transparent,${GOLD})`,
            }}
          />
          <span
            style={{
              fontSize: 16,
              fontWeight: 800,
              color: GOLD,
              letterSpacing: "0.01em",
              textTransform: "uppercase",
              fontFamily: "'Jost', sans-serif",
            }}
          >
            {t("auctionsSection.eyebrow")}
          </span>
          <div
            style={{
              width: 32,
              height: 1,
              background: `linear-gradient(90deg,${GOLD},transparent)`,
            }}
          />
        </div>
        <div
          style={{
            fontSize: "clamp(32px,5vw,56px)",
            fontWeight: 900,
            color: "#fff",
            letterSpacing: "-0.025em",
            lineHeight: 1.1,
            marginBottom: 4,
          }}
        >
          <SplitText
            key={`l1-${animKey}`}
            text={t("auctionsSection.titleLine1")}
            tag="h2"
            className=""
            splitType={isAr ? "words" : "chars"}
            duration={1.0}
            delay={isAr ? 80 : 30}
            ease="power3.out"
            from={{ opacity: 0, y: 40, rotateX: -20 }}
            to={{ opacity: 1, y: 0, rotateX: 0 }}
          />
        </div>
        <div
          style={{
            fontSize: "clamp(32px,5vw,56px)",
            fontWeight: 900,
            color: GOLD,
            letterSpacing: "-0.025em",
            lineHeight: 1.1,
            marginBottom: 20,
          }}
        >
          <SplitText
            key={`l2-${animKey}`}
            text={t("auctionsSection.titleLine2")}
            tag="h2"
            className=""
            splitType={isAr ? "words" : "chars"}
            duration={1.0}
            delay={isAr ? 80 : 30}
            ease="power3.out"
            from={{ opacity: 0, y: 40 }}
            to={{ opacity: 1, y: 0 }}
          />
        </div>
        <p
          style={{
            color: "rgba(229,224,198,0.42)",
            fontSize: 16,
            maxWidth: 420,
            margin: "0 auto",
            lineHeight: 1.75,
            opacity: vis ? 1 : 0,
            transform: vis ? "translateY(0)" : "translateY(10px)",
            transition: "opacity 0.7s ease 0.2s,transform 0.7s ease 0.2s",
          }}
        >
          {tab === "upcoming"
            ? t("auctionsSection.subtitleUpcoming")
            : t("auctionsSection.subtitlePast")}
        </p>
      </div>

      {/* Tabs */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          marginBottom: 48,
          position: "relative",
          zIndex: 1,
          opacity: vis ? 1 : 0,
          transition: "opacity 0.7s ease 0.3s",
        }}
      >
        <div
          style={{
            display: "inline-flex",
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(229,224,198,0.08)",
            borderRadius: 999,
            padding: 4,
            gap: 2,
          }}
        >
          <TabButton
            label={t("auctionsSection.tabUpcoming")}
            icon=""
            active={tab === "upcoming"}
            onClick={() => switchTab("upcoming")}
          />
          <TabButton
            label={t("auctionsSection.tabPast")}
            icon=""
            active={tab === "past"}
            onClick={() => switchTab("past")}
          />
        </div>
      </div>

      {/* Content */}
      <div
        className={anim ? "tab-out" : "tab-in"}
        key={tab}
        style={{
          maxWidth: 1100,
          margin: "0 auto",
          display: "flex",
          flexDirection: "column",
          gap: 20,
          position: "relative",
          zIndex: 1,
          width: "100%",
          boxSizing: "border-box",
          overflow: "hidden",
        }}
      >
        {loading && (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        )}

        {!loading && error && (
          <div
            style={{
              textAlign: "center",
              padding: "60px 20px",
              color: "rgba(229,224,198,0.4)",
            }}
          >
            <div style={{ fontSize: 48, marginBottom: 12 }}>⚠️</div>
            <p style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>{error}</p>
          </div>
        )}

        {!loading && !error && tab === "upcoming" && (
          <>
            {upcoming.length > 0 && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  marginBottom: 4,
                }}
              >
                <div
                  style={{
                    width: 3,
                    height: 18,
                    background: GOLD,
                    borderRadius: 2,
                  }}
                />
                <span
                  style={{
                    fontSize: 15,
                    fontWeight: 800,
                    color: "rgba(229,224,198,0.9)",
                    letterSpacing: "0.18em",
                    textTransform: "uppercase",
                    fontFamily: "'Jost', sans-serif",
                  }}
                >
                  {t("auctionsSection.upcomingCount", {
                    count: upcoming.length,
                  })}
                </span>
              </div>
            )}
            {upcoming.length === 0 ? (
              <div
                style={{
                  textAlign: "center",
                  padding: "60px 20px",
                  color: "rgba(229,224,198,0.4)",
                }}
              >
                <div style={{ fontSize: 48, marginBottom: 12 }}>🔨</div>
                <p style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>
                  {isAr
                    ? "لا توجد مزادات قادمة الآن"
                    : "No upcoming auctions right now"}
                </p>
                <p style={{ fontSize: 15, marginTop: 6, opacity: 0.7 }}>
                  {isAr
                    ? "تحقق قريباً من جلسات جديدة"
                    : "Check back soon for new sessions"}
                </p>
              </div>
            ) : (
              upcoming.map((item, i) => (
                <UpcomingCard
                  key={item.id}
                  item={item}
                  index={i}
                  isLoggedIn={!!user}
                  onRegister={() => onRegister(item.productId)}
                />
              ))
            )}
          </>
        )}

        {!loading && !error && tab === "past" && (
          <>
            {past.length > 0 && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  marginBottom: 4,
                }}
              >
                <div
                  style={{
                    width: 3,
                    height: 18,
                    background: "rgba(126,207,154,0.7)",
                    borderRadius: 2,
                  }}
                />
                <span
                  style={{
                    fontSize: 15,
                    fontWeight: 800,
                    color: "rgba(229,224,198,0.9)",
                    letterSpacing: "0.18em",
                    textTransform: "uppercase",
                    fontFamily: "'Jost', sans-serif",
                  }}
                >
                  {t("auctionsSection.pastCount", { count: past.length })}
                </span>
              </div>
            )}
            {past.length === 0 ? (
              <div
                style={{
                  textAlign: "center",
                  padding: "60px 20px",
                  color: "rgba(229,224,198,0.4)",
                }}
              >
                <div style={{ fontSize: 48, marginBottom: 12 }}>🏆</div>
                <p style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>
                  {isAr
                    ? "لا توجد مزادات مكتملة بعد"
                    : "No completed auctions yet"}
                </p>
                <p style={{ fontSize: 15, marginTop: 6, opacity: 0.7 }}>
                  {isAr
                    ? "ستظهر الفائزون هنا بعد انتهاء المزادات"
                    : "Winners will appear here after auctions close"}
                </p>
              </div>
            ) : (
              past.map((item, i) => (
                <PastCard key={item.id} item={item} index={i} />
              ))
            )}
          </>
        )}
      </div>

      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: 1,
          background:
            "linear-gradient(90deg,transparent,rgba(229,224,198,0.1),transparent)",
        }}
      />
    </section>
  );
}
