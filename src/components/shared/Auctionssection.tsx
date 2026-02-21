import React, { useState, useEffect, useRef, useCallback } from "react";
import SplitText from "@/components/SplitText";

// ── Design tokens ─────────────────────────────────────────────
const GOLD = "#c9a96e";
const GOLD2 = "#b8944e";
const NAVY = "#2A4863";
const NAVY2 = "#1e3652";
const CREAM = "rgb(229, 224, 198)";
const BG = "#0a0a1a";

// ── Mock data ─────────────────────────────────────────────────
const upcomingAuctions = [
  {
    id: "u1",
    title: "GoPro Hero12 Camera",
    subtitle: "Black Edition · Action Camera",
    image:
      "https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?w=400&q=80",
    startingPrice: 1500,
    currency: "EGP",
    pieces: 1,
    endsAt: new Date(
      Date.now() + 1 * 60 * 60 * 1000 + 24 * 60 * 1000,
    ).toISOString(), // ~1h24m
    sessionDate: "Feb 21, 2026 · 8:00 PM – 10:01 PM",
    category: "Electronics",
    isHot: true,
  },
  {
    id: "u2",
    title: "Jaguar Perfume",
    subtitle: "Eau de Toilette · 100ml",
    image:
      "https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?w=400&q=80",
    startingPrice: 500,
    currency: "EGP",
    pieces: 1,
    endsAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days
    sessionDate: "Feb 23, 2026 · 6:00 PM – 10:00 PM",
    category: "Fragrance",
    isHot: false,
  },
  {
    id: "u3",
    title: "iPhone 17 Pro Max",
    subtitle: "Silver · 256GB",
    image:
      "https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?w=400&q=80",
    startingPrice: 8000,
    currency: "EGP",
    pieces: 2,
    endsAt: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString(), // 6 days
    sessionDate: "Feb 27, 2026 · 7:00 PM – 10:01 PM",
    category: "Phones",
    isHot: true,
  },
  {
    id: "u4",
    title: "Sony WH-1000XM5",
    subtitle: "Noise Cancelling · Black",
    image:
      "https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?w=400&q=80",
    startingPrice: 3200,
    currency: "EGP",
    pieces: 1,
    endsAt: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
    sessionDate: "Mar 3, 2026 · 8:00 PM – 11:00 PM",
    category: "Audio",
    isHot: false,
  },
];

const pastAuctions = [
  {
    id: "p1",
    title: "iPhone 16",
    subtitle: "Pink · 128GB",
    image:
      "https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=400&q=80",
    winningPrice: 50000,
    currency: "EGP",
    sessionDate: "Friday, February 20, 2026",
    winner: {
      name: "Hazem Mohamed",
      avatar: "",
      country: "🇪🇬",
      countryName: "Egypt",
    },
  },
  {
    id: "p2",
    title: "JBL Tune 520BT",
    subtitle: "Wireless On-Ear · White",
    image:
      "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&q=80",
    winningPrice: 1800,
    currency: "EGP",
    sessionDate: "Monday, February 16, 2026",
    winner: {
      name: "Youssef Shaaban",
      avatar: "",
      country: "🇪🇬",
      countryName: "Egypt",
    },
  },
  {
    id: "p3",
    title: "Xiaomi Electric Scooter 4 Lite",
    subtitle: "Black · 25km Range",
    image:
      "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&q=80",
    winningPrice: 14200,
    currency: "EGP",
    sessionDate: "Saturday, February 14, 2026",
    winner: {
      name: "علاء عز",
      avatar:
        "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&q=80",
      country: "🇪🇬",
      countryName: "Egypt",
    },
  },
];

// ── Countdown hook ─────────────────────────────────────────────
function useCountdown(endsAt: string) {
  const calc = useCallback(() => {
    const diff = new Date(endsAt).getTime() - Date.now();
    if (diff <= 0) return { d: 0, h: 0, m: 0, s: 0, done: true };
    const s = Math.floor(diff / 1000);
    return {
      d: Math.floor(s / 86400),
      h: Math.floor((s % 86400) / 3600),
      m: Math.floor((s % 3600) / 60),
      s: s % 60,
      done: false,
    };
  }, [endsAt]);

  const [time, setTime] = useState(calc);

  useEffect(() => {
    const t = setInterval(() => setTime(calc()), 1000);
    return () => clearInterval(t);
  }, [calc]);

  return time;
}

// ── Mobile detection hook ─────────────────────────────────────
function useIsMobile(breakpoint = 640) {
  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" ? window.innerWidth <= breakpoint : false,
  );
  useEffect(() => {
    const fn = () => setIsMobile(window.innerWidth <= breakpoint);
    window.addEventListener("resize", fn, { passive: true });
    fn();
    return () => window.removeEventListener("resize", fn);
  }, [breakpoint]);
  return isMobile;
}

// ── Single flip tile ──────────────────────────────────────────
function FlipTile({
  digit,
  W,
  H,
  R,
  fontSize,
}: {
  digit: string;
  W: number;
  H: number;
  R: number;
  fontSize: number;
}) {
  const [current, setCurrent] = useState(digit);
  const [next, setNext] = useState(digit);
  const [flipping, setFlipping] = useState(false);

  useEffect(() => {
    if (digit === current) return;
    setNext(digit);
    setFlipping(true);
    const done = setTimeout(() => {
      setCurrent(digit);
      setFlipping(false);
    }, 300);
    return () => clearTimeout(done);
  }, [digit]);

  const font: React.CSSProperties = {
    fontFamily: "'Jost', 'DM Mono', monospace",
    fontSize,
    fontWeight: 700,
    color: GOLD,
    position: "absolute",
    left: 0,
    right: 0,
    textAlign: "center" as const,
    lineHeight: `${H}px`,
    top: 0,
    userSelect: "none" as const,
  };

  return (
    <div
      style={{
        width: W,
        height: H,
        borderRadius: R,
        background: `linear-gradient(180deg, #243c55 0%, ${NAVY2} 100%)`,
        border: `1px solid rgba(201,169,110,0.2)`,
        boxShadow: `0 4px 14px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.07)`,
        position: "relative",
        overflow: "hidden",
        flexShrink: 0,
      }}
    >
      {/* Back plate */}
      <div style={{ ...font }}>{next}</div>

      {/* Top flap */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: "50%",
          overflow: "hidden",
          transformOrigin: "bottom center",
          transform: flipping ? "rotateX(-90deg)" : "rotateX(0deg)",
          transition: flipping ? "transform 0.15s ease-in" : "none",
          borderRadius: `${R}px ${R}px 0 0`,
          background: `linear-gradient(180deg, #2c4b68 0%, #243c55 100%)`,
          zIndex: 3,
        }}
      >
        <div style={{ ...font }}>{current}</div>
      </div>

      {/* Bottom flap */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: "50%",
          overflow: "hidden",
          transformOrigin: "top center",
          transform: flipping ? "rotateX(90deg)" : "rotateX(0deg)",
          transition: flipping ? "transform 0.15s ease-out 0.15s" : "none",
          borderRadius: `0 0 ${R}px ${R}px`,
          background: `linear-gradient(180deg, ${NAVY2} 0%, #162d45 100%)`,
          zIndex: 3,
        }}
      >
        <div style={{ ...font, top: `-${H / 2}px` }}>{next}</div>
      </div>

      {/* Centre divider */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: "50%",
          height: 1,
          background: "rgba(0,0,0,0.6)",
          zIndex: 10,
        }}
      />
    </div>
  );
}

// ── Flip digit unit (2 tiles + label) ─────────────────────────
function FlipDigit({
  value,
  label,
  W,
  H,
  R,
  fontSize,
}: {
  value: number;
  label: string;
  W: number;
  H: number;
  R: number;
  fontSize: number;
}) {
  const display = String(value).padStart(2, "0");
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 5,
      }}
    >
      <div style={{ display: "flex", gap: 3 }}>
        {display.split("").map((d, i) => (
          <FlipTile key={i} digit={d} W={W} H={H} R={R} fontSize={fontSize} />
        ))}
      </div>
      <span
        style={{
          fontSize: 8,
          fontWeight: 800,
          color: "rgba(229,224,198,0.38)",
          letterSpacing: "0.2em",
          textTransform: "uppercase",
        }}
      >
        {label}
      </span>
    </div>
  );
}

// ── Full countdown bar ─────────────────────────────────────────
function CountdownBar({ endsAt }: { endsAt: string }) {
  const { d, h, m, s, done } = useCountdown(endsAt);
  const isMobile = useIsMobile();

  // Tile dimensions — smaller on mobile so they always fit
  const W = isMobile ? 28 : 40;
  const H = isMobile ? 38 : 54;
  const R = isMobile ? 6 : 9;
  const FS = isMobile ? 20 : 30;
  const sepSize = isMobile ? 18 : 24;
  const sepLH = `${H}px`;
  const sepMB = isMobile ? 14 : 22;

  if (done) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "10px 16px",
          background: "rgba(160,40,40,0.15)",
          border: "1px solid rgba(255,80,80,0.25)",
          borderRadius: 10,
          color: "#ff8080",
          fontSize: 12,
          fontWeight: 700,
          letterSpacing: "0.1em",
        }}
      >
        ● ENDED
      </div>
    );
  }

  const Sep = () => (
    <span
      style={{
        fontSize: sepSize,
        fontWeight: 200,
        color: `${GOLD}55`,
        lineHeight: sepLH,
        marginBottom: sepMB,
        flexShrink: 0,
      }}
    >
      :
    </span>
  );

  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: isMobile ? 4 : 6,
        padding: isMobile ? "10px 12px" : "14px 16px",
        background: "rgba(10,10,26,0.6)",
        border: `1px solid rgba(201,169,110,0.15)`,
        borderRadius: 14,
        backdropFilter: "blur(8px)",
        flexWrap: "nowrap",
      }}
    >
      <FlipDigit value={d} label="Days" W={W} H={H} R={R} fontSize={FS} />
      <Sep />
      <FlipDigit value={h} label="Hours" W={W} H={H} R={R} fontSize={FS} />
      <Sep />
      <FlipDigit value={m} label="Mins" W={W} H={H} R={R} fontSize={FS} />
      <Sep />
      <FlipDigit value={s} label="Secs" W={W} H={H} R={R} fontSize={FS} />
    </div>
  );
}

// ── Upcoming auction card ──────────────────────────────────────
function UpcomingCard({
  item,
  index,
}: {
  item: (typeof upcomingAuctions)[0];
  index: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setVisible(true);
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
      className="auction-card"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(40px)",
        transition: `opacity 0.7s ease ${index * 0.1}s, transform 0.7s cubic-bezier(0.22,1,0.36,1) ${index * 0.1}s`,
        borderRadius: 20,
        background: hovered
          ? "rgba(255,255,255,0.055)"
          : "rgba(255,255,255,0.028)",
        border: `1px solid ${hovered ? "rgba(201,169,110,0.4)" : "rgba(229,224,198,0.08)"}`,
        backdropFilter: "blur(14px)",
        boxShadow: hovered
          ? `0 24px 64px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.07)`
          : "0 4px 24px rgba(0,0,0,0.2)",
      }}
    >
      {/* Image column */}
      <div
        className="auction-card-img"
        style={{
          position: "relative",
          overflow: "hidden",
          background: "#0d1520",
          minHeight: 220,
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
            transform: hovered ? "scale(1.08)" : "scale(1)",
            transition: "transform 0.65s cubic-bezier(0.25,0.46,0.45,0.94)",
            display: "block",
            minHeight: 180,
          }}
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = "none";
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(to right, transparent 50%, rgba(10,10,26,0.6))",
          }}
        />
        {/* Category badge */}
        <div
          style={{
            position: "absolute",
            top: 10,
            left: 10,
            background: "rgba(10,10,26,0.8)",
            backdropFilter: "blur(6px)",
            border: `1px solid rgba(201,169,110,0.3)`,
            borderRadius: 6,
            padding: "3px 8px",
            fontSize: 9,
            fontWeight: 800,
            color: GOLD,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
          }}
        >
          {item.category}
        </div>
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
              fontSize: 9,
              fontWeight: 800,
              color: "#ffb0b0",
              letterSpacing: "0.1em",
            }}
          >
            🔥 HOT
          </div>
        )}
      </div>

      {/* Content column */}
      <div
        className="auction-card-content"
        style={{
          padding: "22px 24px",
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        {/* Top row */}
        <div className="auction-card-top-row">
          <div>
            <h3
              style={{
                margin: 0,
                fontSize: 17,
                fontWeight: 900,
                color: CREAM,
                letterSpacing: "-0.01em",
                lineHeight: 1.2,
              }}
            >
              {item.title}
            </h3>
            <p
              style={{
                margin: "3px 0 0",
                fontSize: 12,
                color: "rgba(229,224,198,0.45)",
                fontWeight: 400,
              }}
            >
              {item.subtitle}
            </p>
          </div>

          {/* Register button */}
          <button
            className="auction-register-btn"
            style={{
              background: `linear-gradient(135deg, ${GOLD}, ${GOLD2})`,
              color: "#0a0a1a",
              border: "none",
              borderRadius: 999,
              padding: "10px 22px",
              fontSize: 10,
              fontWeight: 800,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              cursor: "pointer",
              whiteSpace: "nowrap",
              flexShrink: 0,
              boxShadow: `0 4px 20px ${GOLD}44`,
              transition: "all 0.3s ease",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.transform =
                "translateY(-2px) scale(1.04)";
              (e.currentTarget as HTMLButtonElement).style.boxShadow =
                `0 8px 28px ${GOLD}55`;
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.transform =
                "translateY(0) scale(1)";
              (e.currentTarget as HTMLButtonElement).style.boxShadow =
                `0 4px 20px ${GOLD}44`;
            }}
          >
            ✦ Register to Join
          </button>
        </div>

        {/* Session info */}
        <div
          style={{ display: "flex", flexWrap: "wrap", gap: 16, fontSize: 11 }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              color: "rgba(229,224,198,0.5)",
            }}
          >
            <span style={{ color: GOLD, fontSize: 13 }}>📅</span>
            <span>{item.sessionDate}</span>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              color: "rgba(229,224,198,0.5)",
            }}
          >
            <span style={{ color: GOLD, fontSize: 13 }}>📦</span>
            <span>
              {item.pieces} {item.pieces === 1 ? "Piece" : "Pieces"}
            </span>
          </div>
        </div>

        {/* Price */}
        <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
          <span
            style={{
              fontSize: 10,
              color: "rgba(229,224,198,0.4)",
              fontWeight: 700,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
            }}
          >
            Starting from
          </span>
          <span
            style={{
              fontSize: 20,
              fontWeight: 900,
              color: GOLD,
              letterSpacing: "-0.01em",
            }}
          >
            {item.startingPrice.toLocaleString()}
          </span>
          <span style={{ fontSize: 11, fontWeight: 600, color: `${GOLD}99` }}>
            {item.currency}
          </span>
        </div>

        {/* Divider */}
        <div
          style={{
            height: 1,
            background: `linear-gradient(90deg, rgba(201,169,110,0.2), transparent)`,
          }}
        />

        {/* Countdown */}
        <div>
          <div
            style={{
              fontSize: 9,
              fontWeight: 800,
              color: "rgba(229,224,198,0.35)",
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              marginBottom: 8,
            }}
          >
            ⏱ Session Starts In
          </div>
          <CountdownBar endsAt={item.endsAt} />
        </div>
      </div>
    </div>
  );
}

// ── Past auction card ──────────────────────────────────────────
function PastCard({
  item,
  index,
}: {
  item: (typeof pastAuctions)[0];
  index: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setVisible(true);
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
      className="auction-card"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(40px)",
        transition: `opacity 0.7s ease ${index * 0.1}s, transform 0.7s cubic-bezier(0.22,1,0.36,1) ${index * 0.1}s`,
        borderRadius: 20,
        background: hovered
          ? "rgba(255,255,255,0.045)"
          : "rgba(255,255,255,0.022)",
        border: `1px solid ${hovered ? "rgba(229,224,198,0.18)" : "rgba(229,224,198,0.07)"}`,
        backdropFilter: "blur(14px)",
        boxShadow: hovered
          ? "0 20px 56px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)"
          : "0 4px 20px rgba(0,0,0,0.18)",
      }}
    >
      {/* Image + sold out overlay */}
      <div
        className="auction-card-img"
        style={{
          position: "relative",
          overflow: "hidden",
          background: "#0d1520",
          minHeight: 220,
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
            minHeight: 200,
            display: "block",
            filter: "grayscale(30%) brightness(0.75)",
            transform: hovered ? "scale(1.06)" : "scale(1)",
            transition:
              "transform 0.65s cubic-bezier(0.25,0.46,0.45,0.94), filter 0.4s ease",
          }}
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = "none";
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(to right, transparent 40%, rgba(10,10,26,0.55))",
          }}
        />

        {/* SOLD OUT stamp */}
        <div
          style={{
            position: "absolute",
            bottom: 12,
            left: "50%",
            transform: "translateX(-50%) rotate(-8deg)",
            border: "3px solid rgba(180,40,40,0.9)",
            borderRadius: 6,
            padding: "5px 10px",
            fontSize: 11,
            fontWeight: 900,
            color: "rgba(220,60,60,0.95)",
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            whiteSpace: "nowrap",
            textShadow: "0 0 12px rgba(220,60,60,0.4)",
            boxShadow: "inset 0 0 16px rgba(220,60,60,0.15)",
            background: "rgba(10,10,26,0.5)",
          }}
        >
          SOLD OUT
        </div>
      </div>

      {/* Content */}
      <div
        className="auction-card-content"
        style={{
          padding: "22px 24px",
          display: "flex",
          flexDirection: "column",
          gap: 14,
        }}
      >
        {/* Title row */}
        <div>
          <h3
            style={{
              margin: 0,
              fontSize: 17,
              fontWeight: 900,
              color: CREAM,
              letterSpacing: "-0.01em",
            }}
          >
            {item.title}
          </h3>
          <p
            style={{
              margin: "3px 0 0",
              fontSize: 12,
              color: "rgba(229,224,198,0.4)",
              fontWeight: 400,
            }}
          >
            {item.subtitle}
          </p>
        </div>

        {/* Session + price */}
        <div
          style={{ display: "flex", flexWrap: "wrap", gap: 16, fontSize: 11 }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              color: "rgba(229,224,198,0.45)",
            }}
          >
            <span style={{ color: GOLD, fontSize: 13 }}>📅</span>
            <span>Session: {item.sessionDate}</span>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
          <span
            style={{
              fontSize: 10,
              color: "rgba(229,224,198,0.4)",
              fontWeight: 700,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
            }}
          >
            Winning Price
          </span>
          <span
            style={{
              fontSize: 20,
              fontWeight: 900,
              color: "#7ecf9a",
              letterSpacing: "-0.01em",
            }}
          >
            {item.winningPrice.toLocaleString()}
          </span>
          <span style={{ fontSize: 11, fontWeight: 600, color: "#5aaa7a" }}>
            {item.currency}
          </span>
        </div>

        {/* Divider */}
        <div
          style={{
            height: 1,
            background:
              "linear-gradient(90deg, rgba(229,224,198,0.1), transparent)",
          }}
        />

        {/* Winner row */}
        <div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: 8,
              marginBottom: 8,
            }}
          >
            {["Winner", "Name", "Country"].map((h) => (
              <span
                key={h}
                style={{
                  fontSize: 9,
                  fontWeight: 800,
                  color: "rgba(229,224,198,0.3)",
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
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
            {/* Avatar */}
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
                />
              ) : (
                <span style={{ fontSize: 16, color: "rgba(229,224,198,0.4)" }}>
                  {item.winner.name.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            {/* Name */}
            <span style={{ fontSize: 13, fontWeight: 700, color: CREAM }}>
              {item.winner.name}
            </span>
            {/* Country */}
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 22 }}>{item.winner.country}</span>
              <span style={{ fontSize: 11, color: "rgba(229,224,198,0.45)" }}>
                {item.winner.countryName}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Tab button ─────────────────────────────────────────────────
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
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
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
          fontSize: 12,
          fontWeight: 800,
          letterSpacing: "0.22em",
          textTransform: "uppercase",
          color: active
            ? GOLD
            : hovered
              ? "rgba(229,224,198,0.7)"
              : "rgba(229,224,198,0.35)",
          transition: "color 0.3s ease",
        }}
      >
        {label}
      </span>

      {/* Active underline */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: active ? "8%" : "50%",
          right: active ? "8%" : "50%",
          height: 2,
          background: `linear-gradient(90deg, transparent, ${GOLD}, transparent)`,
          borderRadius: 999,
          transition:
            "left 0.45s cubic-bezier(0.22,1,0.36,1), right 0.45s cubic-bezier(0.22,1,0.36,1)",
          opacity: active ? 1 : 0,
          boxShadow: active ? `0 0 10px ${GOLD}88` : "none",
        }}
      />
      {/* Hover underline (when not active) */}
      {!active && (
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: hovered ? "20%" : "50%",
            right: hovered ? "20%" : "50%",
            height: 1,
            background: "rgba(229,224,198,0.2)",
            borderRadius: 999,
            transition: "left 0.3s ease, right 0.3s ease",
          }}
        />
      )}
    </button>
  );
}

// ── Main Section ───────────────────────────────────────────────
export default function AuctionsSection() {
  const [activeTab, setActiveTab] = useState<"upcoming" | "past">("upcoming");
  const [prevTab, setPrevTab] = useState<"upcoming" | "past">("upcoming");
  const [animating, setAnimating] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const [headerVisible, setHeaderVisible] = useState(false);
  const [animKey, setAnimKey] = useState(0);

  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setHeaderVisible(true);
          setAnimKey((k) => k + 1);
          obs.disconnect();
        }
      },
      { threshold: 0.2 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const switchTab = (tab: "upcoming" | "past") => {
    if (tab === activeTab || animating) return;
    setAnimating(true);
    setPrevTab(activeTab);
    setTimeout(() => {
      setActiveTab(tab);
      setAnimating(false);
    }, 220);
  };

  return (
    <section
      ref={sectionRef}
      style={{
        background:
          "linear-gradient(180deg, #0a0a1a 0%, #0c1828 50%, #0a0a1a 100%)",
        padding: "100px 32px 120px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <style>{`
        @keyframes tabFadeIn {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .tab-content-enter {
          animation: tabFadeIn 0.38s cubic-bezier(0.22,1,0.36,1) forwards;
        }
        .tab-content-exit {
          opacity: 0;
          transform: translateY(-8px);
          transition: opacity 0.2s ease, transform 0.2s ease;
        }

        /* Desktop card layout */
        .auction-card {
          display: grid;
          grid-template-columns: 220px 1fr;
          overflow: hidden;
          border-radius: 20px;
        }
        .auction-card-img {
          position: relative;
          overflow: hidden;
          background: #0d1520;
          min-height: 220px;
        }
        .auction-card-content {
          padding: 22px 24px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          min-width: 0;
        }
        .auction-card-top-row {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 16px;
        }

        /* Mobile ≤ 640px */
        @media (max-width: 640px) {
          .auction-card {
            grid-template-columns: 1fr !important;
          }
          .auction-card-img {
            height: 200px !important;
            min-height: 200px !important;
            width: 100% !important;
          }
          .auction-card-content {
            padding: 16px !important;
          }
          .auction-card-top-row {
            flex-direction: column !important;
            align-items: stretch !important;
            gap: 10px !important;
          }
          .auction-register-btn {
            width: 100% !important;
            padding: 13px 0 !important;
            justify-content: center !important;
          }
        }
      `}</style>

      {/* Background atmosphere */}
      <div
        style={{
          position: "absolute",
          top: "40%",
          left: "50%",
          transform: "translate(-50%,-50%)",
          width: 1000,
          height: 700,
          borderRadius: "50%",
          background:
            "radial-gradient(ellipse, rgba(42,72,99,0.12) 0%, transparent 65%)",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: -80,
          right: "3%",
          width: 400,
          height: 400,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(201,169,110,0.05) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: -100,
          left: "5%",
          width: 360,
          height: 360,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(42,72,99,0.1) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />

      {/* Top separator */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 1,
          background: `linear-gradient(90deg, transparent, ${GOLD}, rgba(229,224,198,0.5), ${GOLD}, transparent)`,
          opacity: 0.28,
        }}
      />

      {/* ── Header ── */}
      <div
        ref={headerRef}
        style={{
          textAlign: "center",
          marginBottom: 56,
          position: "relative",
          zIndex: 1,
        }}
      >
        {/* Eyebrow */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 10,
            marginBottom: 20,
            opacity: headerVisible ? 1 : 0,
            transform: headerVisible ? "translateY(0)" : "translateY(14px)",
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
            · Auction House ·
          </span>
          <div
            style={{
              width: 32,
              height: 1,
              background: `linear-gradient(90deg, ${GOLD}, transparent)`,
            }}
          />
        </div>

        {/* Line 1 — white */}
        <div
          style={{
            fontSize: "clamp(32px, 5vw, 56px)",
            fontWeight: 900,
            color: "#ffffff",
            letterSpacing: "-0.025em",
            lineHeight: 1.1,
            marginBottom: 4,
          }}
        >
          <SplitText
            key={`auctions-line1-${animKey}`}
            text="Live &"
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
            fontSize: "clamp(32px, 5vw, 56px)",
            fontWeight: 900,
            color: GOLD,
            letterSpacing: "-0.025em",
            lineHeight: 1.1,
            marginBottom: 20,
          }}
        >
          <SplitText
            key={`auctions-line2-${animKey}`}
            text="Past Auctions."
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

        <p
          style={{
            color: "rgba(229,224,198,0.42)",
            fontSize: 14,
            fontWeight: 400,
            maxWidth: 420,
            margin: "0 auto",
            lineHeight: 1.75,
            opacity: headerVisible ? 1 : 0,
            transform: headerVisible ? "translateY(0)" : "translateY(10px)",
            transition: "opacity 0.7s ease 0.2s, transform 0.7s ease 0.2s",
          }}
        >
          {activeTab === "upcoming"
            ? "Discover exclusive upcoming auctions and register before seats run out."
            : "Browse our completed auctions and meet the winning bidders."}
        </p>
      </div>

      {/* ── Tab bar ── */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          marginBottom: 48,
          position: "relative",
          zIndex: 1,
          opacity: headerVisible ? 1 : 0,
          transition: "opacity 0.7s ease 0.3s",
        }}
      >
        <div
          style={{
            display: "inline-flex",
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(229,224,198,0.08)",
            borderRadius: 999,
            padding: "4px",
            gap: 2,
          }}
        >
          <TabButton
            label="Upcoming Auctions"
            icon=""
            active={activeTab === "upcoming"}
            onClick={() => switchTab("upcoming")}
          />
          <TabButton
            label="Past Auctions"
            icon=""
            active={activeTab === "past"}
            onClick={() => switchTab("past")}
          />
        </div>
      </div>

      {/* ── Content ── */}
      <div
        className={animating ? "tab-content-exit" : "tab-content-enter"}
        style={{
          maxWidth: 1100,
          margin: "0 auto",
          display: "flex",
          flexDirection: "column",
          gap: 20,
          position: "relative",
          zIndex: 1,
        }}
        key={activeTab}
      >
        {activeTab === "upcoming" ? (
          <>
            {/* Count label */}
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
                  fontSize: 11,
                  fontWeight: 800,
                  color: "rgba(229,224,198,0.4)",
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                }}
              >
                {upcomingAuctions.length} Upcoming Sessions
              </span>
            </div>
            {upcomingAuctions.map((item, i) => (
              <UpcomingCard key={item.id} item={item} index={i} />
            ))}
          </>
        ) : (
          <>
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
                  fontSize: 11,
                  fontWeight: 800,
                  color: "rgba(229,224,198,0.4)",
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                }}
              >
                {pastAuctions.length} Completed Auctions
              </span>
            </div>
            {pastAuctions.map((item, i) => (
              <PastCard key={item.id} item={item} index={i} />
            ))}
          </>
        )}
      </div>

      {/* Bottom separator */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: 1,
          background:
            "linear-gradient(90deg, transparent, rgba(229,224,198,0.1), transparent)",
        }}
      />
    </section>
  );
}
