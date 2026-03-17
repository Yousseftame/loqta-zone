/**
 * src/pages/Admin/Finance/components/FinanceCards.tsx
 *
 * Four premium "credit card" style balance cards:
 *   Cash Balance · Bank Balance · Total Income · Total Expenses
 *
 * Design language: dark glass morphism, chip details, subtle holographic sheen —
 * think Visa Infinite / Amex Black. Keeps the dashboard's navy palette as the
 * anchor colour while each card has its own accent gradient.
 */

import type { FinanceStats } from "../finance-data";

// ─── Card config ──────────────────────────────────────────────────────────────

interface CardConfig {
  label: string;
  value: (s: FinanceStats) => number;
  sub: string;
  gradient: string;
  chip: string; // card network label
  chipBg: string;
  icon: string; // emoji stand-in — swap for lucide if preferred
  accentLine: string;
}

const CARDS: CardConfig[] = [
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
    label: "Total Income",
    value: (s) => s.totalIncome,
    sub: "All-time income",
    gradient: "linear-gradient(135deg, #064e3b 0%, #065f46 55%, #059669 100%)",
    chip: "INCOME",
    chipBg: "rgba(255,255,255,0.12)",
    icon: "📈",
    accentLine: "linear-gradient(90deg, #10B981, #34D399)",
  },
  {
    label: "Total Expenses",
    value: (s) => s.totalExpenses,
    sub: "All-time expenses",
    gradient: "linear-gradient(135deg, #4c0519 0%, #7f1d1d 55%, #991b1b 100%)",
    chip: "EXPENSES",
    chipBg: "rgba(255,255,255,0.12)",
    icon: "📉",
    accentLine: "linear-gradient(90deg, #F43F5E, #FB7185)",
  },
];

// ─── Single card ──────────────────────────────────────────────────────────────

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
  const formatted = `${isNeg ? "-" : ""}${Math.abs(rawValue).toLocaleString("en-EG")} EGP`;

  return (
    <div
      style={{
        position: "relative",
        borderRadius: 20,
        background: config.gradient,
        padding: "26px 28px 22px",
        overflow: "hidden",
        boxShadow:
          "0 20px 60px rgba(0,0,0,0.35), 0 0 0 1px rgba(255,255,255,0.07)",
        animation: `card-rise 0.45s cubic-bezier(0.22,1,0.36,1) ${index * 80}ms both`,
        transition: "transform 0.25s ease, box-shadow 0.25s ease",
        cursor: "default",
        minHeight: 178,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLDivElement;
        el.style.transform = "translateY(-4px) scale(1.01)";
        el.style.boxShadow =
          "0 28px 80px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,255,255,0.12)";
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLDivElement;
        el.style.transform = "";
        el.style.boxShadow =
          "0 20px 60px rgba(0,0,0,0.35), 0 0 0 1px rgba(255,255,255,0.07)";
      }}
    >
      {/* Holographic sheen overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: 20,
          background:
            "linear-gradient(135deg, rgba(255,255,255,0.06) 0%, transparent 50%, rgba(255,255,255,0.03) 100%)",
          pointerEvents: "none",
        }}
      />

      {/* Decorative circle blur top-right */}
      <div
        style={{
          position: "absolute",
          top: -40,
          right: -40,
          width: 140,
          height: 140,
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
          width: 70,
          height: 70,
          borderRadius: "50%",
          background: "rgba(255,255,255,0.04)",
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
              color: "rgba(255,255,255,0.5)",
              fontFamily: "system-ui, sans-serif",
            }}
          >
            {config.label}
          </div>
          <div style={{ fontSize: 20, marginTop: 4 }}>{config.icon}</div>
        </div>
        {/* Card network chip */}
        <div
          style={{
            background: config.chipBg,
            border: "1px solid rgba(255,255,255,0.15)",
            borderRadius: 6,
            padding: "4px 10px",
            fontSize: 9,
            fontWeight: 800,
            letterSpacing: "0.12em",
            color: "rgba(255,255,255,0.7)",
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
              height: 32,
              width: "65%",
              borderRadius: 8,
              background: "rgba(255,255,255,0.08)",
              animation: "fc-shimmer 1.4s ease infinite",
            }}
          />
        ) : (
          <div
            style={{
              fontSize: "clamp(1.3rem, 2vw, 1.65rem)",
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

      {/* ── Bottom row: sub label + accent bar ── */}
      <div style={{ position: "relative", marginTop: 16 }}>
        {/* Thin holographic gradient line */}
        <div
          style={{
            height: 2,
            borderRadius: 999,
            background: config.accentLine,
            opacity: 0.7,
            marginBottom: 10,
          }}
        />
        <div
          style={{
            fontSize: "0.72rem",
            color: "rgba(255,255,255,0.45)",
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
      `}</style>
    </div>
  );
}

// ─── Grid ─────────────────────────────────────────────────────────────────────

interface Props {
  stats: FinanceStats;
  loading?: boolean;
}

export default function FinanceCards({ stats, loading = false }: Props) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
        gap: 20,
      }}
    >
      {CARDS.map((cfg, i) => (
        <CreditCard
          key={cfg.label}
          config={cfg}
          stats={stats}
          loading={loading}
          index={i}
        />
      ))}
    </div>
  );
}
