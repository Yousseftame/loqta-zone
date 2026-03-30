/**
 * src/pages/Admin/Dashboard/components/MetricCard.tsx
 *
 * Matches the exact visual language of TopAuctionsCharts:
 *   - White card, 1px #E2E8F0 border, borderRadius 12px
 *   - #EFF6FF header strip with #2A4863 label
 *   - Blue gradient progress bar using #2A4863 → #3D6A8A → #4A90BE → #0EA5E9
 *   - Clean, minimal, no visual noise
 */

import type { ReactNode } from "react";

// Exact palette from TopAuctionsCharts
const BLUES = ["#2A4863", "#3D6A8A", "#4A90BE", "#0EA5E9", "#38BDF8"];

export interface MetricCardProps {
  label: string;
  value: string | number;
  icon: ReactNode;
  sub?: string;
  /** Which of the 5 blues to use as the accent (0–4) */
  accentIndex?: number;
  loading?: boolean;
  delay?: number;
}

export default function MetricCard({
  label,
  value,
  icon,
  sub,
  accentIndex = 0,
  loading = false,
  delay = 0,
}: MetricCardProps) {
  const accent = BLUES[accentIndex % BLUES.length];
  function smartFormat(val: string | number): string {
    if (typeof val !== "number") return val;
    const absVal = Math.abs(val);
    if (absVal >= 1_000_000 && val % 1_000_000 === 0)
      return `${val / 1_000_000}M`;
    if (absVal >= 1_000 && val % 1_000 === 0) return `${val / 1_000}K`;
    return val.toLocaleString();
  }

  const displayValue = smartFormat(value);

  return (
    <div
      style={{
        background: "#ffffff",
        borderRadius: 12,
        border: "1px solid #E2E8F0",
        overflow: "hidden",
        boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
        animation: `mc-rise 0.4s cubic-bezier(0.22,1,0.36,1) ${delay}ms both`,
        transition: "box-shadow 0.2s, transform 0.2s",
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLDivElement;
        el.style.boxShadow = "0 6px 24px rgba(42,72,99,0.12)";
        el.style.transform = "translateY(-2px)";
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLDivElement;
        el.style.boxShadow = "0 1px 4px rgba(0,0,0,0.04)";
        el.style.transform = "";
      }}
    >
      {/* ── Header strip — identical to TopAuctions BarCard header ── */}
      <div
        style={{
          padding: "12px 20px",
          borderBottom: "1px solid #E2E8F0",
          background: "#EFF6FF",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
        }}
      >
        <span
          style={{
            fontWeight: 700,
            fontSize: "0.82rem",
            color: "#1E40AF",
            letterSpacing: "0.01em",
            fontFamily: "system-ui, -apple-system, sans-serif",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {label}
        </span>
        {/* Icon chip — small, styled like the "Top 5" chip in BarCard */}
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: 7,
            background: accent,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            color: "#fff",
            opacity: 0.92,
          }}
        >
          <span
            style={{
              display: "flex",
              alignItems: "center",
              transform: "scale(0.72)",
            }}
          >
            {icon}
          </span>
        </div>
      </div>

      {/* ── Body ── */}
      <div style={{ padding: "18px 20px 16px" }}>
        {/* Value */}
        {loading ? (
          <div
            style={{
              height: 32,
              width: "55%",
              borderRadius: 6,
              background:
                "linear-gradient(90deg,#f0f4f8 25%,#e2e8f0 50%,#f0f4f8 75%)",
              backgroundSize: "200% 100%",
              animation: "mc-shimmer 1.4s linear infinite",
              marginBottom: 10,
            }}
          />
        ) : (
          <p
            style={{
              margin: "0 0 10px",
              fontSize: "clamp(1.45rem, 2vw, 1.75rem)",
              fontWeight: 800,
              color: "#0F172A",
              letterSpacing: "-0.025em",
              lineHeight: 1,
              fontFamily: "system-ui, -apple-system, sans-serif",
              whiteSpace: "nowrap", // ← add this
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {displayValue}
          </p>
        )}

        {/* Thin gradient bar — the visual signature matching the bar chart colors */}
        <div
          style={{
            height: 3,
            borderRadius: 999,
            background: `linear-gradient(90deg, ${BLUES[0]}, ${BLUES[1]}, ${BLUES[2]}, ${BLUES[3]}, ${BLUES[4]})`,
            opacity: 0.55,
            marginBottom: sub ? 10 : 0,
          }}
        />

        {/* Sub text */}
        {sub && !loading && (
          <p
            style={{
              margin: 0,
              fontSize: "0.72rem",
              color: "#64748B",
              fontWeight: 500,
              fontFamily: "system-ui, -apple-system, sans-serif",
              lineHeight: 1.4,
            }}
          >
            {sub}
          </p>
        )}
        {sub && loading && (
          <div
            style={{
              height: 10,
              width: "70%",
              borderRadius: 4,
              background:
                "linear-gradient(90deg,#f0f4f8 25%,#e2e8f0 50%,#f0f4f8 75%)",
              backgroundSize: "200% 100%",
              animation: "mc-shimmer 1.4s linear infinite",
            }}
          />
        )}
      </div>

      <style>{`
        @keyframes mc-rise {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes mc-shimmer {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  );
}
