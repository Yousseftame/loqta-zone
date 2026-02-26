import React, { useRef, useState, useEffect } from "react";
import { db } from "@/firebase/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { useAuth } from "@/store/AuthContext/AuthContext";

// ── Design tokens (matching Contact page) ─────────────────────
const GOLD = "#c9a96e";
const GOLD2 = "#b8944e";
const NAVY = "#2A4863";
const NAVY2 = "#1e3652";
const CREAM = "rgb(229, 224, 198)";
const BG = "#0a0a1a";

// ── useInView hook ─────────────────────────────────────────────
function useInView(
  ref: React.RefObject<HTMLDivElement | null>,
  threshold = 0.1,
) {
  const [visible, setVisible] = useState(false);
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
      { threshold },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return visible;
}

// ── Styled input field ─────────────────────────────────────────
function Field({
  label,
  type = "text",
  placeholder,
  value,
  onChange,
  required = false,
  textarea = false,
  rows = 4,
  icon,
}: {
  label: string;
  type?: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  textarea?: boolean;
  rows?: number;
  icon: string;
}) {
  const [focused, setFocused] = useState(false);
  const hasValue = value.length > 0;

  const sharedStyle: React.CSSProperties = {
    width: "100%",
    background: focused ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.025)",
    border: `1px solid ${focused ? `${GOLD}66` : hasValue ? "rgba(229,224,198,0.15)" : "rgba(229,224,198,0.08)"}`,
    borderRadius: 12,
    padding: textarea ? "14px 16px 14px 44px" : "0 16px 0 44px",
    color: CREAM,
    fontSize: 13.5,
    fontFamily: "'Jost', sans-serif",
    letterSpacing: "0.02em",
    outline: "none",
    transition: "all 0.3s ease",
    boxShadow: focused ? `0 0 0 3px ${GOLD}14` : "none",
    resize: "none" as const,
    ...(textarea ? {} : { height: 52, display: "flex", alignItems: "center" }),
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
      <label
        style={{
          fontSize: 10,
          fontWeight: 800,
          color: focused ? GOLD : "rgba(229,224,198,0.4)",
          letterSpacing: "0.22em",
          textTransform: "uppercase",
          transition: "color 0.3s ease",
          display: "flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        <span style={{ opacity: 0.7 }}>{icon}</span>
        {label}
        {required && <span style={{ color: GOLD, opacity: 0.7 }}>*</span>}
      </label>
      <div style={{ position: "relative" }}>
        <span
          style={{
            position: "absolute",
            left: 15,
            top: textarea ? 15 : "50%",
            transform: textarea ? "none" : "translateY(-50%)",
            fontSize: 15,
            opacity: focused ? 0.7 : 0.3,
            transition: "opacity 0.3s ease",
            pointerEvents: "none",
            color: GOLD,
          }}
        >
          {icon}
        </span>
        {textarea ? (
          <textarea
            rows={rows}
            placeholder={placeholder}
            value={value}
            required={required}
            onChange={(e) => onChange(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            style={{ ...sharedStyle, paddingTop: 14 }}
          />
        ) : (
          <input
            type={type}
            placeholder={placeholder}
            value={value}
            required={required}
            onChange={(e) => onChange(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            style={sharedStyle}
          />
        )}
      </div>
    </div>
  );
}

// ── Category pill selector ─────────────────────────────────────
const CATEGORIES = [
  { val: "electronics", label: "Electronics", icon: "💻" },
  { val: "fashion", label: "Fashion", icon: "👗" },
  { val: "watches", label: "Watches", icon: "⌚" },
  { val: "collectibles", label: "Collectibles", icon: "🏺" },
  { val: "gaming", label: "Gaming", icon: "🎮" },
  { val: "jewelry", label: "Jewelry", icon: "💎" },
  { val: "art", label: "Art & Decor", icon: "🎨" },
  { val: "other", label: "Other", icon: "◈" },
];

function CategoryPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <label
        style={{
          fontSize: 10,
          fontWeight: 800,
          color: "rgba(229,224,198,0.4)",
          letterSpacing: "0.22em",
          textTransform: "uppercase",
          display: "flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        <span style={{ opacity: 0.7 }}>◇</span>
        Category <span style={{ color: GOLD, opacity: 0.7 }}>*</span>
      </label>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {CATEGORIES.map((cat) => {
          const active = value === cat.val;
          return (
            <button
              key={cat.val}
              type="button"
              onClick={() => onChange(cat.val)}
              style={{
                padding: "8px 14px",
                borderRadius: 999,
                background: active
                  ? `rgba(201,169,110,0.16)`
                  : "rgba(255,255,255,0.03)",
                border: `1px solid ${active ? `${GOLD}88` : "rgba(229,224,198,0.09)"}`,
                color: active ? GOLD : "rgba(229,224,198,0.45)",
                fontSize: 11.5,
                fontWeight: active ? 700 : 500,
                letterSpacing: "0.04em",
                cursor: "pointer",
                transition: "all 0.28s cubic-bezier(0.22,1,0.36,1)",
                fontFamily: "'Jost', sans-serif",
                display: "flex",
                alignItems: "center",
                gap: 6,
                transform: active ? "scale(1.04)" : "scale(1)",
                boxShadow: active ? `0 0 14px ${GOLD}22` : "none",
              }}
            >
              <span>{cat.icon}</span>
              {cat.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Urgency selector ───────────────────────────────────────────
const URGENCY = [
  {
    val: "flexible",
    label: "Flexible",
    desc: "Whenever available",
    color: "#5ee8a0",
  },
  {
    val: "soon",
    label: "Within 1 week",
    desc: "Would love it soon",
    color: GOLD,
  },
  {
    val: "urgent",
    label: "ASAP",
    desc: "Need it right away",
    color: "#ff6b9d",
  },
];

function UrgencyPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <label
        style={{
          fontSize: 10,
          fontWeight: 800,
          color: "rgba(229,224,198,0.4)",
          letterSpacing: "0.22em",
          textTransform: "uppercase",
          display: "flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        <span style={{ opacity: 0.7 }}>⚡</span> Timeline
      </label>
      <div
        style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}
      >
        {URGENCY.map((u) => {
          const active = value === u.val;
          return (
            <button
              key={u.val}
              type="button"
              onClick={() => onChange(u.val)}
              style={{
                padding: "12px 10px",
                borderRadius: 12,
                background: active ? `${u.color}12` : "rgba(255,255,255,0.025)",
                border: `1px solid ${active ? `${u.color}55` : "rgba(229,224,198,0.08)"}`,
                color: active ? u.color : "rgba(229,224,198,0.45)",
                cursor: "pointer",
                transition: "all 0.28s cubic-bezier(0.22,1,0.36,1)",
                fontFamily: "'Jost', sans-serif",
                textAlign: "center" as const,
                boxShadow: active ? `0 4px 16px ${u.color}18` : "none",
              }}
            >
              <div style={{ fontSize: 12.5, fontWeight: 700, marginBottom: 3 }}>
                {u.label}
              </div>
              <div
                style={{ fontSize: 10, opacity: 0.6, letterSpacing: "0.04em" }}
              >
                {u.desc}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Submit button (matching Contact) ──────────────────────────
function SubmitBtn({ label, loading }: { label: string; loading: boolean }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      type="submit"
      disabled={loading}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        width: "100%",
        background: loading
          ? "rgba(201,169,110,0.4)"
          : `linear-gradient(135deg, ${GOLD}, ${GOLD2})`,
        color: "#0a0a1a",
        border: "none",
        borderRadius: 12,
        height: 54,
        fontSize: 11,
        fontWeight: 800,
        letterSpacing: "0.22em",
        textTransform: "uppercase",
        cursor: loading ? "not-allowed" : "pointer",
        boxShadow:
          hov && !loading ? `0 12px 36px ${GOLD}44` : `0 4px 18px ${GOLD}28`,
        transform: hov && !loading ? "translateY(-3px)" : "translateY(0)",
        transition: "all 0.35s cubic-bezier(0.22,1,0.36,1)",
        position: "relative",
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        fontFamily: "'Jost', sans-serif",
      }}
    >
      {hov && !loading && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)",
            animation: "shimmerBtn 0.7s ease forwards",
          }}
        />
      )}
      {loading ? (
        <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span
            style={{
              width: 16,
              height: 16,
              border: "2px solid #0a0a1a33",
              borderTop: "2px solid #0a0a1a",
              borderRadius: "50%",
              animation: "arSpin 0.8s linear infinite",
              display: "inline-block",
            }}
          />
          Submitting…
        </span>
      ) : (
        <span>{label}</span>
      )}
    </button>
  );
}

// ── Success state ──────────────────────────────────────────────
function SuccessState({
  productName,
  onReset,
}: {
  productName: string;
  onReset: () => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 24,
        padding: "56px 24px",
        textAlign: "center",
      }}
    >
      {/* Animated checkmark */}
      <div style={{ position: "relative" }}>
        <div
          style={{
            width: 88,
            height: 88,
            borderRadius: "50%",
            background: "rgba(201,169,110,0.1)",
            border: "1px solid rgba(201,169,110,0.3)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 36,
            boxShadow: `0 0 40px ${GOLD}28`,
            animation: "arPopIn 0.6s cubic-bezier(0.34,1.56,0.64,1) forwards",
          }}
        >
          ✦
        </div>
        {/* Orbiting ring */}
        <div
          style={{
            position: "absolute",
            inset: -8,
            borderRadius: "50%",
            border: `1px solid ${GOLD}33`,
            animation: "arOrbitRing 3s linear infinite",
          }}
        />
      </div>

      <div>
        <h3
          style={{
            margin: "0 0 8px",
            fontSize: 22,
            fontWeight: 900,
            color: CREAM,
            fontFamily: "'Cormorant Garamond', Georgia, serif",
            fontStyle: "italic",
          }}
        >
          Request Submitted!
        </h3>
        <p
          style={{
            margin: "0 0 6px",
            fontSize: 14,
            color: `${GOLD}cc`,
            fontWeight: 600,
          }}
        >
          "{productName}"
        </p>
        <p
          style={{
            margin: 0,
            fontSize: 12.5,
            color: "rgba(229,224,198,0.45)",
            lineHeight: 1.7,
            maxWidth: 320,
          }}
        >
          Our team will review your request and notify you when a matching
          auction becomes available.
        </p>
      </div>

      {/* Status tracker */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 0,
          background: "rgba(255,255,255,0.025)",
          border: "1px solid rgba(229,224,198,0.08)",
          borderRadius: 14,
          padding: "16px 24px",
          width: "100%",
          maxWidth: 380,
        }}
      >
        {[
          { label: "Submitted", done: true },
          { label: "Reviewing", done: false },
          { label: "Matched", done: false },
        ].map((step, i, arr) => (
          <React.Fragment key={step.label}>
            <div style={{ textAlign: "center", flex: 1 }}>
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  margin: "0 auto 6px",
                  background: step.done
                    ? `linear-gradient(135deg,${GOLD},${GOLD2})`
                    : "rgba(255,255,255,0.05)",
                  border: `1px solid ${step.done ? GOLD : "rgba(229,224,198,0.1)"}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: step.done ? 12 : 10,
                  color: step.done ? "#0a0a1a" : "rgba(229,224,198,0.25)",
                  fontWeight: 800,
                }}
              >
                {step.done ? "✓" : i + 1}
              </div>
              <div
                style={{
                  fontSize: 9,
                  fontWeight: 700,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: step.done ? GOLD : "rgba(229,224,198,0.3)",
                }}
              >
                {step.label}
              </div>
            </div>
            {i < arr.length - 1 && (
              <div
                style={{
                  flex: 1,
                  height: 1,
                  background: `linear-gradient(90deg, ${GOLD}55, rgba(229,224,198,0.08))`,
                  marginBottom: 22,
                }}
              />
            )}
          </React.Fragment>
        ))}
      </div>

      <button
        onClick={onReset}
        style={{
          background: "transparent",
          border: `1px solid ${GOLD}44`,
          color: GOLD,
          borderRadius: 999,
          padding: "10px 28px",
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          cursor: "pointer",
          transition: "all 0.3s ease",
          fontFamily: "'Jost', sans-serif",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.background = `${GOLD}12`;
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.background =
            "transparent";
        }}
      >
        Submit Another
      </button>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════
export default function AuctionRequestSection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const visible = useInView(sectionRef, 0.05);
  const { user } = useAuth();

  const [form, setForm] = useState({
    productName: "",
    category: "",
    budget: "",
    urgency: "flexible",
    notes: "",
  });
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [submittedName, setSubmittedName] = useState("");

  const set = (k: keyof typeof form) => (v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.productName.trim()) return;
    if (!form.category) {
      setError("Please select a category.");
      return;
    }

    setError("");
    setLoading(true);

    try {
      await addDoc(collection(db, "AuctionRequests"), {
        userId: user?.uid ?? "guest",
        productName: form.productName.trim(),
        category: form.category,
        budget: form.budget.trim() || null,
        urgency: form.urgency,
        notes: form.notes.trim() || null,
        status: "pending",
        matchedAuctionId: null,
        createdAt: serverTimestamp(),
      });

      setSubmittedName(form.productName.trim());
      setSent(true);
    } catch (err: any) {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setSent(false);
    setError("");
    setForm({
      productName: "",
      category: "",
      budget: "",
      urgency: "flexible",
      notes: "",
    });
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,700;1,700;1,900&family=Jost:wght@200;300;400;600;700;800&display=swap');

        @keyframes arSpin       { to { transform: rotate(360deg); } }
        @keyframes arPopIn      { from { transform: scale(0.5); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        @keyframes arOrbitRing  { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes arFadeUp     { from { opacity: 0; transform: translateY(28px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes arShimmerBtn { from { transform: translateX(-100%); } to { transform: translateX(200%); } }
        @keyframes arGoldSpin   { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes arPulse      { 0%,100% { opacity: 0.5; } 50% { opacity: 1; } }
        @keyframes arTextReveal {
          from { opacity: 0; transform: translateY(40px) skewY(1.5deg); }
          to   { opacity: 1; transform: translateY(0) skewY(0deg); }
        }

        .ar-section {
          position: relative;
          background: linear-gradient(180deg, #0c1828 0%, #0a0a1a 50%, #060610 100%);
          padding: 100px 32px 120px;
          overflow: hidden;
          font-family: 'Jost', sans-serif;
        }

        .ar-section input, .ar-section textarea, .ar-section select {
          color-scheme: dark;
        }
        .ar-section input::placeholder,
        .ar-section textarea::placeholder {
          color: rgba(229,224,198,0.28) !important;
        }
        @keyframes shimmerBtn {
          from { transform: translateX(-100%); }
          to   { transform: translateX(200%); }
        }

        .ar-card {
          position: relative;
          border-radius: 28px;
          overflow: hidden;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(229,224,198,0.08);
          backdrop-filter: blur(20px);
          box-shadow: 0 8px 64px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.05);
          max-width: 780px;
          margin: 0 auto;
        }

        .ar-card-top-line {
          position: absolute;
          top: 0; left: 10%; right: 10%;
          height: 2px;
          background: linear-gradient(90deg, transparent, ${GOLD}, transparent);
          border-radius: 999px;
          opacity: 0.7;
        }

        .ar-corner-glow {
          position: absolute;
          top: -80px; right: -80px;
          width: 280px; height: 280px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(201,169,110,0.07) 0%, transparent 70%);
          pointer-events: none;
        }
        .ar-corner-glow2 {
          position: absolute;
          bottom: -60px; left: -60px;
          width: 220px; height: 220px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(42,72,99,0.15) 0%, transparent 70%);
          pointer-events: none;
        }

        .ar-error {
          background: rgba(255,80,80,0.07);
          border: 1px solid rgba(255,80,80,0.2);
          border-radius: 10px;
          padding: 11px 16px;
          color: #ff9090;
          font-size: 12.5px;
          font-weight: 600;
          letter-spacing: 0.04em;
          font-family: 'Jost', sans-serif;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .ar-divider {
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(229,224,198,0.08), transparent);
        }

        /* Login prompt */
        .ar-login-prompt {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 18px;
          padding: 56px 24px;
          text-align: center;
        }

        @media (max-width: 600px) {
          .ar-urgency-grid { grid-template-columns: 1fr !important; }
          .ar-section { padding: 70px 20px 90px; }
        }
      `}</style>

      <section className="ar-section" ref={sectionRef}>
        {/* ── Background atmosphere ── */}
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
          {/* Center glow */}
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%,-50%)",
              width: 1000,
              height: 600,
              borderRadius: "50%",
              background:
                "radial-gradient(ellipse, rgba(42,72,99,0.18) 0%, transparent 65%)",
            }}
          />
          {/* Gold accent top-right */}
          <div
            style={{
              position: "absolute",
              top: "8%",
              right: "5%",
              width: 340,
              height: 340,
              borderRadius: "50%",
              background: `radial-gradient(circle, ${GOLD}0a 0%, transparent 70%)`,
            }}
          />
          {/* Decorative rings */}
          {[300, 520, 780].map((sz, i) => (
            <div
              key={i}
              style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%,-50%)",
                width: sz,
                height: sz,
                borderRadius: "50%",
                border: `1px solid rgba(201,169,110,${0.055 - i * 0.014})`,
              }}
            />
          ))}
        </div>

        {/* ── Top separator ── */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 1,
            background: `linear-gradient(90deg, transparent, ${GOLD}, rgba(229,224,198,0.6), ${GOLD}, transparent)`,
            opacity: 0.28,
          }}
        />

        {/* ── Section heading ── */}
        <div
          style={{
            textAlign: "center",
            marginBottom: 60,
            position: "relative",
            zIndex: 1,
            opacity: visible ? 1 : 0,
            transform: visible ? "translateY(0)" : "translateY(28px)",
            transition:
              "opacity 0.8s cubic-bezier(0.22,1,0.36,1), transform 0.8s cubic-bezier(0.22,1,0.36,1)",
          }}
        >
          {/* Eyebrow */}
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 12,
              marginBottom: 20,
            }}
          >
            <div
              style={{
                width: 36,
                height: 1,
                background: `linear-gradient(90deg, transparent, ${GOLD})`,
              }}
            />
            <span
              style={{
                fontSize: 10,
                fontWeight: 800,
                color: GOLD,
                letterSpacing: "0.32em",
                textTransform: "uppercase",
              }}
            >
              · Request an Auction ·
            </span>
            <div
              style={{
                width: 36,
                height: 1,
                background: `linear-gradient(90deg, ${GOLD}, transparent)`,
              }}
            />
          </div>

          {/* Headline */}
          <div style={{ overflow: "hidden", marginBottom: 8 }}>
            <h2
              style={{
                margin: 0,
                fontFamily: "'Cormorant Garamond', Georgia, serif",
                fontSize: "clamp(42px, 7vw, 88px)",
                fontWeight: 700,
                fontStyle: "italic",
                color: CREAM,
                letterSpacing: "-0.025em",
                lineHeight: 0.95,
                animation: visible
                  ? "arTextReveal 1.1s cubic-bezier(0.22,1,0.36,1) 0.1s both"
                  : "none",
              }}
            >
              Can't find what
            </h2>
          </div>
          <div style={{ overflow: "hidden", marginBottom: 20 }}>
            <h2
              style={{
                margin: 0,
                fontFamily: "'Cormorant Garamond', Georgia, serif",
                fontSize: "clamp(42px, 7vw, 88px)",
                fontWeight: 700,
                fontStyle: "italic",
                color: "transparent",
                WebkitTextStroke: `2px ${GOLD}`,
                letterSpacing: "-0.025em",
                lineHeight: 0.95,
                animation: visible
                  ? "arTextReveal 1.1s cubic-bezier(0.22,1,0.36,1) 0.22s both"
                  : "none",
              }}
            >
              you're looking for?
            </h2>
          </div>

          <p
            style={{
              fontSize: "clamp(13px, 1.2vw, 15px)",
              fontWeight: 300,
              letterSpacing: "0.05em",
              color: "rgba(229,224,198,0.48)",
              maxWidth: 480,
              margin: "0 auto",
              lineHeight: 1.9,
              animation: visible ? "arFadeUp 0.9s ease 0.55s both" : "none",
            }}
          >
            Tell us what item you'd like to bid on. We'll match it with an
            upcoming auction or create one just for you.
          </p>
        </div>

        {/* ── Card ── */}
        <div
          className="ar-card"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? "translateY(0)" : "translateY(40px)",
            transition:
              "opacity 0.9s cubic-bezier(0.22,1,0.36,1) 0.25s, transform 0.9s cubic-bezier(0.22,1,0.36,1) 0.25s",
            position: "relative",
            zIndex: 1,
          }}
        >
          <div className="ar-card-top-line" />
          <div className="ar-corner-glow" />
          <div className="ar-corner-glow2" />

          {/* Card header */}
          <div
            style={{
              padding: "32px 36px 0",
              display: "flex",
              alignItems: "flex-start",
              gap: 18,
              marginBottom: 28,
            }}
          >
            
            <div>
              <div
                style={{
                  fontSize: 9,
                  fontWeight: 800,
                  color: `${GOLD}99`,
                  letterSpacing: "0.26em",
                  textTransform: "uppercase",
                  marginBottom: 4,
                }}
              >
                Auction Request
              </div>
              <h3
                style={{
                  margin: 0,
                  fontSize: "clamp(18px, 2vw, 24px)",
                  fontWeight: 900,
                  color: CREAM,
                  letterSpacing: "-0.01em",
                }}
              >
                Find Your Next Bid
              </h3>
            </div>
          </div>

          {/* ── NOT LOGGED IN ── */}
          {!user ? (
            <div
              className="ar-login-prompt"
              style={{ padding: "36px 36px 40px" }}
            >
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: "50%",
                  background: "rgba(201,169,110,0.08)",
                  border: `1px solid ${GOLD}33`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 26,
                }}
              >
                🔒
              </div>
              <div>
                <p
                  style={{
                    margin: "0 0 6px",
                    fontSize: 15,
                    fontWeight: 700,
                    color: CREAM,
                  }}
                >
                  Sign in to submit a request
                </p>
                <p
                  style={{
                    margin: 0,
                    fontSize: 12.5,
                    color: "rgba(229,224,198,0.4)",
                    lineHeight: 1.7,
                  }}
                >
                  Create an account or log in to request your dream auction
                  item.
                </p>
              </div>
              <a
                href="/login"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  background: `linear-gradient(135deg, ${GOLD}, ${GOLD2})`,
                  color: "#0a0a1a",
                  borderRadius: 12,
                  padding: "13px 32px",
                  fontSize: 11,
                  fontWeight: 800,
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  textDecoration: "none",
                  boxShadow: `0 6px 24px ${GOLD}33`,
                  transition: "all 0.3s ease",
                }}
              >
                ✦ Sign In
              </a>
            </div>
          ) : sent ? (
            /* ── SUCCESS STATE ── */
            <div style={{ padding: "0 36px 36px" }}>
              <SuccessState productName={submittedName} onReset={handleReset} />
            </div>
          ) : (
            /* ── FORM ── */
            <form onSubmit={handleSubmit} style={{ padding: "0 36px 36px" }}>
              <div
                style={{ display: "flex", flexDirection: "column", gap: 22 }}
              >
                {/* Product name */}
                <Field
                  label="Product / Item Name"
                  placeholder="e.g. PlayStation 5, Vintage Rolex, Signed Jersey…"
                  value={form.productName}
                  onChange={set("productName")}
                  required
                  icon="🏷"
                />

                {/* Category picker */}
                <CategoryPicker
                  value={form.category}
                  onChange={set("category")}
                />

                {/* Budget (optional) */}
                <Field
                  label="Max Budget (Optional)"
                  placeholder="e.g. 5,000 EGP — leave blank if flexible"
                  value={form.budget}
                  onChange={set("budget")}
                  icon="💰"
                />

                {/* Urgency */}
                <UrgencyPicker value={form.urgency} onChange={set("urgency")} />

                {/* Notes */}
                <Field
                  label="Additional Notes"
                  placeholder="Any specific version, color, condition or details we should know…"
                  value={form.notes}
                  onChange={set("notes")}
                  textarea
                  rows={4}
                  icon="💬"
                />

                {/* Error */}
                {error && (
                  <div className="ar-error">
                    <span>⚠</span> {error}
                  </div>
                )}

                <div className="ar-divider" />

                <SubmitBtn label="✦ Submit Request" loading={loading} />
              </div>
            </form>
          )}
        </div>
      </section>
    </>
  );
}
