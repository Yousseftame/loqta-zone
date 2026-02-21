import React, { useRef, useState, useEffect } from "react";
import { useInView } from "motion/react";
import CountUp from "@/components/CountUp";
import SplitText from "@/components/SplitText";

// ── Design tokens ──────────────────────────────────────────────
const NAVY = "#2A4863";
const NAVY2 = "#1e3652";
const GOLD = "#c9a96e";
const CREAM = "rgb(229, 224, 198)";

// ── Stats data ─────────────────────────────────────────────────
const stats = [
  {
    value: 24800,
    suffix: "+",
    label: "Registered Users",
    description: "Trusted bidders across Egypt",
  },
  {
    value: 3200,
    suffix: "+",
    label: "Auctions Completed",
    description: "Successfully closed deals",
  },
  {
    value: 98,
    suffix: "%",
    label: "Satisfaction Rate",
    description: "From verified buyer reviews",
  },
  {
    value: 180,
    suffix: "M+",
    label: "EGP in Bids Placed",
    description: "Total value transacted",
  },
];

// ── Single stat card ───────────────────────────────────────────
function StatCard({
  stat,
  index,
  startCount,
}: {
  stat: (typeof stats)[0];
  index: number;
  startCount: boolean;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: "relative",
        borderRadius: 20,
        padding: "36px 28px 32px",
        background: hovered
          ? "rgba(255,255,255,0.06)"
          : "rgba(255,255,255,0.03)",
        border: `1px solid ${hovered ? `rgba(201,169,110,0.35)` : "rgba(229,224,198,0.08)"}`,
        backdropFilter: "blur(12px)",
        boxShadow: hovered
          ? `0 24px 64px rgba(0,0,0,0.4), 0 0 0 1px rgba(201,169,110,0.2), inset 0 1px 0 rgba(255,255,255,0.08)`
          : `0 4px 24px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.04)`,
        transform: hovered ? "translateY(-6px)" : "translateY(0)",
        transition: "all 0.45s cubic-bezier(0.22, 1, 0.36, 1)",
        cursor: "default",
        overflow: "hidden",
        // staggered entrance
        opacity: 0,
        animation: startCount
          ? `statFadeUp 0.7s cubic-bezier(0.22, 1, 0.36, 1) ${index * 0.12}s forwards`
          : "none",
      }}
    >
      {/* Subtle corner glow on hover */}
      <div
        style={{
          position: "absolute",
          top: -40,
          right: -40,
          width: 120,
          height: 120,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${hovered ? "rgba(201,169,110,0.12)" : "rgba(201,169,110,0.04)"} 0%, transparent 70%)`,
          transition: "all 0.45s ease",
          pointerEvents: "none",
        }}
      />

      {/* Gold top accent line */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: hovered ? "10%" : "30%",
          right: hovered ? "10%" : "30%",
          height: 2,
          background: `linear-gradient(90deg, transparent, ${GOLD}, transparent)`,
          borderRadius: 999,
          transition: "all 0.5s cubic-bezier(0.22, 1, 0.36, 1)",
          opacity: hovered ? 1 : 0.4,
        }}
      />

      {/* Label */}
      <div
        style={{
          fontSize: 13,
          fontWeight: 800,
          color: CREAM,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          marginBottom: 6,
        }}
      >
        {stat.label}
      </div>

      {/* Description */}
      <div
        style={{
          fontSize: 12,
          color: "rgba(229,224,198,0.45)",
          fontWeight: 400,
          letterSpacing: "0.02em",
          lineHeight: 1.5,
          marginBottom: 20,
        }}
      >
        {stat.description}
      </div>

      {/* Number */}
      <div
        style={{
          fontSize: "clamp(36px, 4vw, 52px)",
          fontWeight: 900,
          color: GOLD,
          letterSpacing: "-0.02em",
          lineHeight: 1,
          display: "flex",
          alignItems: "baseline",
          gap: 2,
        }}
      >
        {startCount ? (
          <CountUp
            from={0}
            to={stat.value}
            duration={2.2}
            delay={index * 0.12}
            separator=","
            className=""
          />
        ) : (
          <span>0</span>
        )}
        <span
          style={{
            fontSize: "clamp(20px, 2vw, 28px)",
            fontWeight: 800,
            color: GOLD,
            opacity: 0.8,
          }}
        >
          {stat.suffix}
        </span>
      </div>
    </div>
  );
}

// ── Main section ───────────────────────────────────────────────
export default function StatsSection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-100px" });
  const [startCount, setStartCount] = useState(false);

  useEffect(() => {
    if (isInView) setStartCount(true);
  }, [isInView]);

  return (
    <section
      ref={sectionRef}
      style={{
        background:
          "linear-gradient(180deg, #0a0a1a 0%, #0d1b2a 50%, #0a0a1a 100%)",
        padding: "96px 24px 104px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <style>{`
        @keyframes statFadeUp {
          from { opacity: 0; transform: translateY(32px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulseGold {
          0%, 100% { opacity: 0.15; transform: scale(1); }
          50%       { opacity: 0.25; transform: scale(1.05); }
        }
      `}</style>

      {/* ── Background atmosphere ────────────────────────────── */}
      {/* Large soft glow — center */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: 700,
          height: 700,
          borderRadius: "50%",
          background: `radial-gradient(circle, rgba(42,72,99,0.18) 0%, transparent 70%)`,
          animation: "pulseGold 6s ease-in-out infinite",
          pointerEvents: "none",
        }}
      />
      {/* Gold glow — top left */}
      <div
        style={{
          position: "absolute",
          top: -80,
          left: "10%",
          width: 300,
          height: 300,
          borderRadius: "50%",
          background: `radial-gradient(circle, rgba(201,169,110,0.07) 0%, transparent 70%)`,
          pointerEvents: "none",
        }}
      />
      {/* Gold glow — bottom right */}
      <div
        style={{
          position: "absolute",
          bottom: -60,
          right: "8%",
          width: 280,
          height: 280,
          borderRadius: "50%",
          background: `radial-gradient(circle, rgba(201,169,110,0.06) 0%, transparent 70%)`,
          pointerEvents: "none",
        }}
      />

      {/* Thin gold separator top */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 1,
          background: `linear-gradient(90deg, transparent, ${GOLD}, rgba(229,224,198,0.6), ${GOLD}, transparent)`,
          opacity: 0.3,
        }}
      />

      {/* ── Header ───────────────────────────────────────────── */}
      <div
        style={{
          textAlign: "center",
          marginBottom: 64,
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
            By The Numbers
          </span>
          <div
            style={{
              width: 32,
              height: 1,
              background: `linear-gradient(90deg, ${GOLD}, transparent)`,
            }}
          />
        </div>

        {/* SplitText headline — line 1 */}
        {isInView && (
          <div
            style={{
              fontSize: "clamp(28px, 5vw, 52px)",
              fontWeight: 900,
              color: "#ffffff",
              letterSpacing: "-0.02em",
              lineHeight: 1.1,
              marginBottom: 4,
            }}
          >
            <SplitText
              text="Trusted by Thousands"
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
        )}

        {/* SplitText headline — line 2 */}
        {isInView && (
          <div
            style={{
              fontSize: "clamp(28px, 5vw, 52px)",
              fontWeight: 900,
              color: GOLD,
              letterSpacing: "-0.02em",
              lineHeight: 1.1,
              marginBottom: 20,
            }}
          >
            <SplitText
              text="Across Every Auction."
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
        )}

        <p
          style={{
            color: "rgba(229,224,198,0.45)",
            fontSize: 15,
            fontWeight: 400,
            maxWidth: 480,
            margin: "0 auto",
            lineHeight: 1.7,
            letterSpacing: "0.01em",
          }}
        >
          Real numbers from a platform built on transparency, trust, and
          results.
        </p>
      </div>

      {/* ── Stats grid ───────────────────────────────────────── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 20,
          maxWidth: 1400,
          margin: "0 auto",
          position: "relative",
          zIndex: 1,
        }}
      >
        {stats.map((stat, i) => (
          <StatCard
            key={stat.label}
            stat={stat}
            index={i}
            startCount={startCount}
          />
        ))}
      </div>

      {/* ── Bottom separator ─────────────────────────────────── */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: 1,
          background: `linear-gradient(90deg, transparent, rgba(229,224,198,0.12), transparent)`,
        }}
      />
    </section>
  );
}
