/**
 * src/pages/Admin/Finance/components/FinanceCards.tsx
 *
 * Six premium "credit card" style balance cards:
 *
 *   [HERO — full width]  Available Balance  = cashBalance + bankBalance
 *   [Row of 5]           Cash Balance · Bank Balance · Owner Balance · Total Income · Total Expenses
 *
 * ─── Accounting identity verified ────────────────────────────────────────────
 *   totalIncome = cashBalance + bankBalance + ownerBalance + totalExpenses
 *
 * Every dollar earned goes to one of four places:
 *   • Still in cash              → cashBalance
 *   • Still in bank              → bankBalance
 *   • Taken by the owner         → ownerBalance  (owner draws, not operating expenses)
 *   • Spent on business expenses → totalExpenses
 *
 * Available Balance = cashBalance + bankBalance
 *   An owner_withdrawal reduces cashBalance or bankBalance → reduces Available automatically.
 *   totalIncome and totalExpenses are NOT touched by owner withdrawals.
 *
 * No Firestore changes needed for Available Balance — it's derived client-side.
 * ownerBalance is stored in finance_stats/dashboard by the Cloud Function.
 */

import type { FinanceStats } from "../finance-data";

interface CardConfig {
  label: string;
  value: (s: FinanceStats) => number;
  sub: string;
  gradient: string;
  chip: string;
  chipBg: string;
  icon: string;
  accentLine: string;
  featured?: boolean;
}

// ─── Card definitions ─────────────────────────────────────────────────────────

const HERO_CARD: CardConfig = {
  label: "Available Balance",
  value: (s) => s.cashBalance + s.bankBalance,
  sub: "Cash + Bank · reduced by expenses & owner withdrawals",
  gradient:
    "linear-gradient(135deg, #1e1b4b 0%, #312e81 45%, #4338ca 80%, #6366f1 100%)",
  chip: "LIQUID",
  chipBg: "rgba(255,255,255,0.15)",
  icon: "💰",
  accentLine: "linear-gradient(90deg, #818cf8, #c7d2fe, #818cf8)",
  featured: true,
};


const DETAIL_CARDS: CardConfig[] = [
  {
    label: "Cash Balance",
    value: (s) => s.cashBalance,
    sub: "Available in cash",
    gradient: "linear-gradient(135deg, #1a2f47 0%, #2A4863 55%, #3D6A8A 100%)",
    chip: "CASH",
    chipBg: "rgba(255,255,255,0.12)",
    icon: "💵",
    accentLine: "linear-gradient(90deg, #4A90BE, #38BDF8)",
  },
  {
    label: "Bank Balance",
    value: (s) => s.bankBalance,
    sub: "Available in bank",
    gradient: "linear-gradient(135deg, #0f2027 0%, #1a3a4a 55%, #2c5364 100%)",
    chip: "BANK",
    chipBg: "rgba(255,255,255,0.12)",
    icon: "🏦",
    accentLine: "linear-gradient(90deg, #0EA5E9, #38BDF8)",
  },
  {
    label: "Owner Balance",
    value: (s) => s.ownerBalance,
    sub: "Total withdrawn by owner",
    gradient: "linear-gradient(135deg, #451a03 0%, #78350f 50%, #92400e 100%)",
    chip: "OWNER",
    chipBg: "rgba(255,255,255,0.12)",
    icon: "👤",
    accentLine: "linear-gradient(90deg, #F59E0B, #FCD34D)",
  },
  {
    label: "Total Income",
    value: (s) => s.totalIncome,
    sub: "Cash + Bank + Owner + Expenses",
    gradient: "linear-gradient(135deg, #064e3b 0%, #065f46 55%, #059669 100%)",
    chip: "INCOME",
    chipBg: "rgba(255,255,255,0.12)",
    icon: "📈",
    accentLine: "linear-gradient(90deg, #10B981, #34D399)",
  },
  {
    label: "Total Expenses",
    value: (s) => s.totalExpenses,
    sub: "All-time operating expenses",
    gradient: "linear-gradient(135deg, #4c0519 0%, #7f1d1d 55%, #991b1b 100%)",
    chip: "EXPENSES",
    chipBg: "rgba(255,255,255,0.12)",
    icon: "📉",
    accentLine: "linear-gradient(90deg, #F43F5E, #FB7185)",
  },
];

// ─── Single card component ────────────────────────────────────────────────────

function CreditCard({
  config,
  stats,
  loading,
  index,
}: {
  config: CardConfig;
  stats: FinanceStats;
  loading: boolean;
  index: number;
}) {
  const rawValue = config.value(stats);
  const isNeg = rawValue < 0;
  const formatted = `${isNeg ? "−" : ""}${Math.abs(rawValue).toLocaleString("en-EG")} EGP`;

  const baseShadow = config.featured
    ? "0 24px 80px rgba(99,102,241,0.4), 0 0 0 1px rgba(255,255,255,0.1)"
    : "0 20px 60px rgba(0,0,0,0.35), 0 0 0 1px rgba(255,255,255,0.07)";
  const hoverShadow = config.featured
    ? "0 32px 100px rgba(99,102,241,0.55), 0 0 0 1px rgba(255,255,255,0.15)"
    : "0 28px 80px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,255,255,0.12)";

  return (
    <div
      style={{
        position: "relative",
        borderRadius: 20,
        background: config.gradient,
        padding: config.featured ? "30px 32px 26px" : "26px 28px 22px",
        overflow: "hidden",
        boxShadow: baseShadow,
        animation: `card-rise 0.45s cubic-bezier(0.22,1,0.36,1) ${index * 70}ms both`,
        transition: "transform 0.25s ease, box-shadow 0.25s ease",
        cursor: "default",
        minHeight: config.featured ? 155 : 178,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLDivElement;
        el.style.transform = "translateY(-4px) scale(1.01)";
        el.style.boxShadow = hoverShadow;
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLDivElement;
        el.style.transform = "";
        el.style.boxShadow = baseShadow;
      }}
    >
      {/* Glass sheen */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: 20,
          background:
            "linear-gradient(135deg, rgba(255,255,255,0.07) 0%, transparent 50%, rgba(255,255,255,0.03) 100%)",
          pointerEvents: "none",
        }}
      />

      {/* Animated shimmer sweep — featured card only */}
      {config.featured && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: 20,
            background:
              "linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.05) 50%, transparent 70%)",
            backgroundSize: "200% 100%",
            animation: "shimmer-sweep 3.5s ease infinite",
            pointerEvents: "none",
          }}
        />
      )}

      {/* Decorative blur circles */}
      <div
        style={{
          position: "absolute",
          top: -40,
          right: -40,
          width: config.featured ? 200 : 140,
          height: config.featured ? 200 : 140,
          borderRadius: "50%",
          background: "rgba(255,255,255,0.04)",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: 20,
          right: 20,
          width: config.featured ? 100 : 70,
          height: config.featured ? 100 : 70,
          borderRadius: "50%",
          background: "rgba(255,255,255,0.05)",
          pointerEvents: "none",
        }}
      />

      {/* ── Top row: label + chip ── */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          position: "relative",
        }}
      >
        <div>
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              color: "rgba(255,255,255,0.55)",
              fontFamily: "system-ui, sans-serif",
            }}
          >
            {config.label}
          </div>
          <div style={{ fontSize: config.featured ? 26 : 20, marginTop: 4 }}>
            {config.icon}
          </div>
        </div>
        <div
          style={{
            background: config.chipBg,
            border: "1px solid rgba(255,255,255,0.18)",
            borderRadius: 6,
            padding: "4px 10px",
            fontSize: 9,
            fontWeight: 800,
            letterSpacing: "0.12em",
            color: "rgba(255,255,255,0.8)",
            fontFamily: "system-ui, sans-serif",
            backdropFilter: "blur(4px)",
          }}
        >
          {config.chip}
        </div>
      </div>

      {/* ── Value ── */}
      <div style={{ position: "relative", marginTop: 12 }}>
        {loading ? (
          <div
            style={{
              height: config.featured ? 40 : 32,
              width: "60%",
              borderRadius: 8,
              background: "rgba(255,255,255,0.08)",
              animation: "fc-shimmer 1.4s ease infinite",
            }}
          />
        ) : (
          <div
            style={{
              fontSize: config.featured
                ? "clamp(1.7rem, 3vw, 2.2rem)"
                : "clamp(1.3rem, 2vw, 1.65rem)",
              fontWeight: 800,
              color: isNeg ? "#FCA5A5" : "#ffffff",
              letterSpacing: "-0.02em",
              fontFamily: "system-ui, sans-serif",
              lineHeight: 1.1,
            }}
          >
            {formatted}
          </div>
        )}
      </div>

      {/* ── Bottom: accent bar + sub label ── */}
      <div style={{ position: "relative", marginTop: 16 }}>
        <div
          style={{
            height: config.featured ? 3 : 2,
            borderRadius: 999,
            background: config.accentLine,
            opacity: 0.8,
            marginBottom: 10,
          }}
        />
        <div
          style={{
            fontSize: "0.72rem",
            color: "rgba(255,255,255,0.5)",
            fontWeight: 500,
            fontFamily: "system-ui, sans-serif",
          }}
        >
          {config.sub}
        </div>
      </div>

      <style>{`
        @keyframes card-rise {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes fc-shimmer {
          0%,100% { opacity: 0.4; }
          50%      { opacity: 0.8; }
        }
        @keyframes shimmer-sweep {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  );
}

// ─── Grid layout ─────────────────────────────────────────────────────────────

interface Props {
  stats: FinanceStats;
  loading?: boolean;
}

export default function FinanceCards({ stats, loading = false }: Props) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Hero: Available Balance — full width */}
      <CreditCard
        config={HERO_CARD}
        stats={stats}
        loading={loading}
        index={0}
      />
      {/* 5 detail cards in responsive grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px,1fr))",
          gap: 20,
        }}
      >
        {DETAIL_CARDS.map((cfg, i) => (
          <CreditCard
            key={cfg.label}
            config={cfg}
            stats={stats}
            loading={loading}
            index={i + 1}
          />
        ))}
      </div>
    </div>
  );
}
