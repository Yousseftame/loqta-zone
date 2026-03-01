import React, { useRef, useState, useEffect } from "react";
import {
  submitContactMessage,
  submitFeedbackMessage,
} from "@/service/contactFeedback/contactFeedbackService";

// ── Design tokens ─────────────────────────────────────────────
const GOLD = "#c9a96e";
const GOLD2 = "#b8944e";
const NAVY = "#2A4863";
const NAVY2 = "#1e3652";
const CREAM = "rgb(229, 224, 198)";
const BG = "#0a0a1a";

// ── Helpers ───────────────────────────────────────────────────
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

// ── Styled input ──────────────────────────────────────────────
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

// ── Star rating ───────────────────────────────────────────────
function StarRating({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  const [hovered, setHovered] = useState(0);
  const labels = ["", "Poor", "Fair", "Good", "Great", "Excellent"];
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
        <span style={{ opacity: 0.7 }}>⭐</span>Your Rating{" "}
        <span style={{ color: GOLD, opacity: 0.7 }}>*</span>
      </label>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            onMouseEnter={() => setHovered(star)}
            onMouseLeave={() => setHovered(0)}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: 28,
              padding: "2px",
              color:
                star <= (hovered || value) ? GOLD : "rgba(229,224,198,0.15)",
              transform:
                star <= (hovered || value) ? "scale(1.18)" : "scale(1)",
              transition: "all 0.22s cubic-bezier(0.22,1,0.36,1)",
              filter:
                star <= (hovered || value)
                  ? `drop-shadow(0 0 6px ${GOLD}88)`
                  : "none",
            }}
          >
            ★
          </button>
        ))}
        {(hovered || value) > 0 && (
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: GOLD,
              letterSpacing: "0.1em",
              marginLeft: 6,
              opacity: 0.8,
            }}
          >
            {labels[hovered || value]}
          </span>
        )}
      </div>
    </div>
  );
}

// ── Select field ──────────────────────────────────────────────
function SelectField({
  label,
  value,
  onChange,
  options,
  icon,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { val: string; label: string }[];
  icon: string;
}) {
  const [focused, setFocused] = useState(false);
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
      </label>
      <div style={{ position: "relative" }}>
        <span
          style={{
            position: "absolute",
            left: 15,
            top: "50%",
            transform: "translateY(-50%)",
            fontSize: 15,
            opacity: focused ? 0.7 : 0.3,
            transition: "opacity 0.3s ease",
            pointerEvents: "none",
            color: GOLD,
            zIndex: 1,
          }}
        >
          {icon}
        </span>
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{
            width: "100%",
            height: 52,
            background: focused
              ? "rgba(255,255,255,0.05)"
              : "rgba(255,255,255,0.025)",
            border: `1px solid ${focused ? `${GOLD}66` : "rgba(229,224,198,0.08)"}`,
            borderRadius: 12,
            padding: "0 16px 0 44px",
            color: value ? CREAM : "rgba(229,224,198,0.35)",
            fontSize: 13.5,
            fontFamily: "'Jost', sans-serif",
            letterSpacing: "0.02em",
            outline: "none",
            transition: "all 0.3s ease",
            boxShadow: focused ? `0 0 0 3px ${GOLD}14` : "none",
            cursor: "pointer",
            appearance: "none",
          }}
        >
          {options.map((o) => (
            <option
              key={o.val}
              value={o.val}
              style={{ background: "#0d1b2a", color: CREAM }}
            >
              {o.label}
            </option>
          ))}
        </select>
        <span
          style={{
            position: "absolute",
            right: 16,
            top: "50%",
            transform: "translateY(-50%)",
            fontSize: 10,
            color: "rgba(229,224,198,0.35)",
            pointerEvents: "none",
          }}
        >
          ▼
        </span>
      </div>
    </div>
  );
}

// ── Submit button ─────────────────────────────────────────────
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
              border: `2px solid #0a0a1a33`,
              borderTop: "2px solid #0a0a1a",
              borderRadius: "50%",
              animation: "spin 0.8s linear infinite",
              display: "inline-block",
            }}
          />
          Sending…
        </span>
      ) : (
        <span>{label}</span>
      )}
    </button>
  );
}

// ── Success state ─────────────────────────────────────────────
function SuccessState({
  message,
  onReset,
}: {
  message: string;
  onReset: () => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 20,
        padding: "48px 24px",
        textAlign: "center",
        minHeight: 300,
      }}
    >
      <div
        style={{
          width: 72,
          height: 72,
          borderRadius: "50%",
          background: "rgba(126,207,154,0.12)",
          border: "1px solid rgba(126,207,154,0.3)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 32,
          boxShadow: "0 0 32px rgba(126,207,154,0.2)",
          animation: "popIn 0.5s cubic-bezier(0.34,1.56,0.64,1) forwards",
        }}
      >
        ✓
      </div>
      <div>
        <div
          style={{
            fontSize: 18,
            fontWeight: 900,
            color: CREAM,
            marginBottom: 8,
          }}
        >
          {message}
        </div>
        <div
          style={{
            fontSize: 13,
            color: "rgba(229,224,198,0.45)",
            lineHeight: 1.7,
          }}
        >
          We'll get back to you within 24 hours.
        </div>
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
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.background = `${GOLD}12`;
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.background =
            "transparent";
        }}
      >
        Send Another
      </button>
    </div>
  );
}

// ── Contact info item ─────────────────────────────────────────
function ContactInfo({
  icon,
  label,
  value,
  sub,
}: {
  icon: string;
  label: string;
  value: string;
  sub?: string;
}) {
  const [hov, setHov] = useState(false);
  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 16,
        padding: "18px 20px",
        borderRadius: 14,
        background: hov ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.025)",
        border: `1px solid ${hov ? `${GOLD}33` : "rgba(229,224,198,0.07)"}`,
        transition: "all 0.35s ease",
        cursor: "default",
        transform: hov ? "translateX(4px)" : "translateX(0)",
      }}
    >
      <div
        style={{
          width: 42,
          height: 42,
          borderRadius: 10,
          flexShrink: 0,
          background: `linear-gradient(135deg, ${NAVY}, ${NAVY2})`,
          border: `1px solid ${hov ? `${GOLD}55` : "rgba(229,224,198,0.1)"}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 18,
          transition: "border-color 0.3s ease",
          boxShadow: hov ? `0 0 16px ${GOLD}22` : "none",
        }}
      >
        {icon}
      </div>
      <div>
        <div
          style={{
            fontSize: 9,
            fontWeight: 800,
            color: `${GOLD}88`,
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            marginBottom: 3,
          }}
        >
          {label}
        </div>
        <div
          style={{
            fontSize: 13.5,
            fontWeight: 700,
            color: CREAM,
            lineHeight: 1.4,
          }}
        >
          {value}
        </div>
        {sub && (
          <div
            style={{
              fontSize: 11,
              color: "rgba(229,224,198,0.4)",
              marginTop: 2,
            }}
          >
            {sub}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Card wrapper ──────────────────────────────────────────────
function FormCard({
  children,
  title,
  subtitle,
  icon,
  accentColor = GOLD,
  delay = 0,
  visible,
}: {
  children: React.ReactNode;
  title: string;
  subtitle: string;
  icon: string;
  accentColor?: string;
  delay?: number;
  visible: boolean;
}) {
  return (
    <div
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(40px)",
        transition: `opacity 0.8s cubic-bezier(0.22,1,0.36,1) ${delay}s, transform 0.8s cubic-bezier(0.22,1,0.36,1) ${delay}s`,
        borderRadius: 24,
        overflow: "hidden",
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(229,224,198,0.08)",
        backdropFilter: "blur(16px)",
        boxShadow:
          "0 8px 48px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.05)",
        position: "relative",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 0,
          left: "10%",
          right: "10%",
          height: 2,
          background: `linear-gradient(90deg, transparent, ${accentColor}, transparent)`,
          borderRadius: 999,
          opacity: 0.6,
        }}
      />
      <div
        style={{
          position: "absolute",
          top: -60,
          right: -60,
          width: 220,
          height: 220,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${accentColor}0e 0%, transparent 70%)`,
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          padding: "32px 32px 0",
          display: "flex",
          alignItems: "flex-start",
          gap: 18,
          marginBottom: 28,
        }}
      >
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: 14,
            flexShrink: 0,
            background: `linear-gradient(135deg, ${NAVY}, ${NAVY2})`,
            border: `1.5px solid ${accentColor}44`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 22,
            color: accentColor,
            boxShadow: `0 0 20px ${accentColor}22`,
          }}
        >
          {icon}
        </div>
        <div>
          <div
            style={{
              fontSize: 9,
              fontWeight: 800,
              color: `${accentColor}99`,
              letterSpacing: "0.26em",
              textTransform: "uppercase",
              marginBottom: 4,
            }}
          >
            {subtitle}
          </div>
          <h2
            style={{
              margin: 0,
              fontSize: "clamp(20px, 2.5vw, 26px)",
              fontWeight: 900,
              color: CREAM,
              letterSpacing: "-0.01em",
            }}
          >
            {title}
          </h2>
        </div>
      </div>
      <div style={{ padding: "0 32px 32px" }}>{children}</div>
    </div>
  );
}

// ── CONTACT FORM ──────────────────────────────────────────────
function ContactForm({ visible }: { visible: boolean }) {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    subject: "",
    message: "",
  });
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const set = (k: keyof typeof form) => (v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) {
      setError("Please fill in all required fields.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await submitContactMessage(form);
      setSent(true);
    } catch (err) {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSent(false);
    setForm({ name: "", email: "", phone: "", subject: "", message: "" });
    setError("");
  };

  if (sent)
    return (
      <FormCard
        title="Message Sent"
        subtitle="Contact Us"
        icon="✉"
        visible={visible}
        delay={0}
      >
        <SuccessState
          message="Your message has been received!"
          onReset={resetForm}
        />
      </FormCard>
    );

  return (
    <FormCard
      title="Get in Touch"
      subtitle="Contact Us"
      icon="✉"
      visible={visible}
      delay={0}
    >
      <form
        onSubmit={handleSubmit}
        style={{ display: "flex", flexDirection: "column", gap: 18 }}
      >
        <div
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}
          className="form-row"
        >
          <Field
            label="Full Name"
            placeholder="Your name"
            value={form.name}
            onChange={set("name")}
            required
            icon="👤"
          />
          <Field
            label="Email Address"
            type="email"
            placeholder="your@email.com"
            value={form.email}
            onChange={set("email")}
            required
            icon="✉"
          />
        </div>
        <div
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}
          className="form-row"
        >
          <Field
            label="Phone Number"
            type="tel"
            placeholder="+20 1xx xxx xxxx"
            value={form.phone}
            onChange={set("phone")}
            icon="📞"
          />
          <SelectField
            label="Subject"
            icon="◈"
            value={form.subject}
            onChange={set("subject")}
            options={[
              { val: "", label: "Select a topic…" },
              { val: "general", label: "General Inquiry" },
              { val: "auction", label: "Auction Question" },
              { val: "payment", label: "Payment Issue" },
              { val: "delivery", label: "Delivery Support" },
              { val: "promo", label: "Promo Codes" },
              { val: "other", label: "Other" },
            ]}
          />
        </div>
        <Field
          label="Your Message"
          placeholder="Write your message here…"
          value={form.message}
          onChange={set("message")}
          required
          textarea
          rows={5}
          icon="💬"
        />
        {error && (
          <p
            style={{
              margin: 0,
              fontSize: 12,
              color: "#EF4444",
              fontWeight: 600,
            }}
          >
            {error}
          </p>
        )}
        <div
          style={{
            height: 1,
            background:
              "linear-gradient(90deg, transparent, rgba(229,224,198,0.08), transparent)",
          }}
        />
        <SubmitBtn label="✦ Send Message" loading={loading} />
      </form>
    </FormCard>
  );
}

// ── FEEDBACK FORM ─────────────────────────────────────────────
function FeedbackForm({ visible }: { visible: boolean }) {
  const [form, setForm] = useState({
    name: "",
    email: "",
    category: "",
    rating: 0,
    title: "",
    feedback: "",
    recommend: "",
  });
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const set = (k: keyof typeof form) => (v: string | number) =>
    setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.rating) {
      setError("Please select a rating.");
      return;
    }
    if (!form.feedback.trim()) {
      setError("Please provide your feedback.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await submitFeedbackMessage({
        name: form.name,
        email: form.email,
        category: form.category,
        rating: form.rating,
        title: form.title,
        feedback: form.feedback,
        recommend: form.recommend,
      });
      setSent(true);
    } catch (err) {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSent(false);
    setForm({
      name: "",
      email: "",
      category: "",
      rating: 0,
      title: "",
      feedback: "",
      recommend: "",
    });
    setError("");
  };

  if (sent)
    return (
      <FormCard
        title="Feedback Received"
        subtitle="Share Feedback"
        icon="★"
        accentColor="#a3c9a8"
        visible={visible}
        delay={0.15}
      >
        <SuccessState
          message="Thank you for your feedback!"
          onReset={resetForm}
        />
      </FormCard>
    );

  return (
    <FormCard
      title="Share Your Experience"
      subtitle="Your Feedback"
      icon="★"
      accentColor="#a3c9a8"
      visible={visible}
      delay={0.15}
    >
      <form
        onSubmit={handleSubmit}
        style={{ display: "flex", flexDirection: "column", gap: 18 }}
      >
        <div
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}
          className="form-row"
        >
          <Field
            label="Your Name"
            placeholder="Your name"
            value={form.name}
            onChange={set("name")}
            icon="👤"
          />
          <Field
            label="Email"
            type="email"
            placeholder="your@email.com"
            value={form.email}
            onChange={set("email")}
            icon="✉"
          />
        </div>
        <SelectField
          label="Feedback Category"
          icon="◇"
          value={form.category}
          onChange={set("category")}
          options={[
            { val: "", label: "What's your feedback about?" },
            { val: "auction", label: "Auction Experience" },
            { val: "platform", label: "Platform & App" },
            { val: "delivery", label: "Delivery & Packaging" },
            { val: "support", label: "Customer Support" },
            { val: "payment", label: "Payment Process" },
            { val: "general", label: "General Experience" },
          ]}
        />
        <StarRating value={form.rating} onChange={(v) => set("rating")(v)} />
        <Field
          label="Feedback Title"
          placeholder="Sum it up in a few words…"
          value={form.title}
          onChange={set("title")}
          icon="✦"
        />
        <Field
          label="Detailed Feedback"
          placeholder="Tell us about your experience in detail…"
          value={form.feedback}
          onChange={set("feedback")}
          required
          textarea
          rows={5}
          icon="💬"
        />
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
            <span style={{ opacity: 0.7 }}>🤝</span> Would you recommend Loqta
            Zone?
          </label>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {["Definitely!", "Probably", "Not Sure", "Probably Not"].map(
              (opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => set("recommend")(opt)}
                  style={{
                    padding: "9px 18px",
                    borderRadius: 999,
                    background:
                      form.recommend === opt
                        ? `rgba(163,201,168,0.18)`
                        : "rgba(255,255,255,0.03)",
                    border: `1px solid ${form.recommend === opt ? "#a3c9a888" : "rgba(229,224,198,0.1)"}`,
                    color:
                      form.recommend === opt
                        ? "#a3c9a8"
                        : "rgba(229,224,198,0.45)",
                    fontSize: 11.5,
                    fontWeight: 700,
                    letterSpacing: "0.04em",
                    cursor: "pointer",
                    transition: "all 0.28s ease",
                    fontFamily: "'Jost', sans-serif",
                  }}
                >
                  {opt}
                </button>
              ),
            )}
          </div>
        </div>
        {error && (
          <p
            style={{
              margin: 0,
              fontSize: 12,
              color: "#EF4444",
              fontWeight: 600,
            }}
          >
            {error}
          </p>
        )}
        <div
          style={{
            height: 1,
            background:
              "linear-gradient(90deg, transparent, rgba(229,224,198,0.08), transparent)",
          }}
        />
        <SubmitBtn label="✦ Submit Feedback" loading={loading} />
      </form>
    </FormCard>
  );
}

// ── MAIN PAGE ─────────────────────────────────────────────────
export default function ContactUs() {
  const heroRef = useRef<HTMLDivElement>(null);
  const formsRef = useRef<HTMLDivElement>(null);
  const infoRef = useRef<HTMLDivElement>(null);
  const heroVisible = useInView(heroRef, 0.05);
  const formsVisible = useInView(formsRef, 0.05);
  const infoVisible = useInView(infoRef, 0.05);
  const [scrollY, setScrollY] = useState(0);
  useEffect(() => {
    const fn = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,700;1,700;1,900&family=Jost:wght@200;300;400;600;700;800&display=swap');
        * { box-sizing: border-box; }
        .cu-page { font-family: 'Jost', 'Helvetica Neue', sans-serif; background: ${BG}; min-height: 100vh; color: ${CREAM}; overflow-x: hidden; }
        .cu-grain { position: fixed; inset: 0; z-index: 0; opacity: 0.025; pointer-events: none; background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E"); background-size: 200px 200px; }
        @keyframes heroUp { from { opacity: 0; transform: translateY(56px) skewY(1.5deg); } to { opacity: 1; transform: translateY(0) skewY(0); } }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(22px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes popIn { from { transform: scale(0.5); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        @keyframes shimmerBtn { from { transform: translateX(-100%); } to { transform: translateX(200%); } }
        @keyframes pulseRing { 0%,100% { transform: translate(-50%,-50%) scale(1); opacity: 0.4; } 50% { transform: translate(-50%,-50%) scale(1.08); opacity: 0.65; } }
        .hero-w1 { animation: heroUp 1.15s cubic-bezier(0.22,1,0.36,1) 0.2s both; }
        .hero-w2 { animation: heroUp 1.15s cubic-bezier(0.22,1,0.36,1) 0.36s both; }
        .hero-sub { animation: fadeUp 0.9s ease 0.8s both; }
        .hero-meta { animation: fadeUp 0.9s ease 1.05s both; }
        .hero-scroll { animation: fadeUp 0.9s ease 1.4s both; }
        @keyframes scrollPulse { 0%,100% { transform: scaleY(1); opacity: 0.5; } 50% { transform: scaleY(1.25); opacity: 1; } }
        .scroll-line { animation: scrollPulse 2.8s ease-in-out 1.6s infinite; }
        @media (max-width: 700px) { .form-row { grid-template-columns: 1fr !important; } .forms-layout { grid-template-columns: 1fr !important; } .info-grid { grid-template-columns: 1fr !important; } .hero-txt { font-size: clamp(64px, 20vw, 96px) !important; } }
        input::placeholder, textarea::placeholder { color: rgba(229,224,198,0.28) !important; }
        input, textarea, select { color-scheme: dark; }
      `}</style>
      <div className="cu-page">
        <div className="cu-grain" />

        {/* HERO */}
        <section
          ref={heroRef}
          style={{
            position: "relative",
            minHeight: "88vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
            padding: "140px 32px 80px",
          }}
        >
          <div
            style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
          >
            <div
              style={{
                position: "absolute",
                top: "30%",
                left: "50%",
                transform: `translateX(-50%) translateY(${scrollY * 0.07}px)`,
                width: 800,
                height: 800,
                borderRadius: "50%",
                background:
                  "radial-gradient(circle, rgba(42,72,99,0.25) 0%, transparent 65%)",
                animation: "pulseRing 7s ease-in-out infinite",
              }}
            />
            <div
              style={{
                position: "absolute",
                top: "5%",
                right: "6%",
                transform: `translateY(${scrollY * 0.06}px)`,
                width: 360,
                height: 360,
                borderRadius: "50%",
                background: `radial-gradient(circle, rgba(201,169,110,0.09) 0%, transparent 70%)`,
              }}
            />
          </div>
          {[280, 480, 720].map((sz, i) => (
            <div
              key={i}
              style={{
                position: "absolute",
                top: "48%",
                left: "50%",
                transform: `translate(-50%,-50%) translateY(${scrollY * 0.025 * (i + 1)}px)`,
                width: sz,
                height: sz,
                borderRadius: "50%",
                border: `1px solid rgba(201,169,110,${0.07 - i * 0.018})`,
                pointerEvents: "none",
              }}
            />
          ))}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: 1,
              background: `linear-gradient(90deg, transparent, ${GOLD}, rgba(229,224,198,0.7), ${GOLD}, transparent)`,
              opacity: 0.38,
            }}
          />
          <div
            className="hero-sub"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
              marginBottom: 28,
              zIndex: 2,
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
                letterSpacing: "0.32em",
                textTransform: "uppercase",
              }}
            >
              · Reach Us ·
            </span>
            <div
              style={{
                width: 32,
                height: 1,
                background: `linear-gradient(90deg, ${GOLD}, transparent)`,
              }}
            />
          </div>
          <div
            style={{
              textAlign: "center",
              position: "relative",
              zIndex: 2,
              marginBottom: 24,
            }}
          >
            <div style={{ overflow: "hidden", lineHeight: 0.92 }}>
              <span
                className="hero-w1 hero-txt"
                style={{
                  fontFamily: "'Cormorant Garamond', Georgia, serif",
                  fontSize: "clamp(76px, 13vw, 170px)",
                  fontWeight: 700,
                  fontStyle: "italic",
                  color: CREAM,
                  letterSpacing: "-0.028em",
                  display: "block",
                  textShadow: "0 2px 60px rgba(0,0,0,0.5)",
                }}
              >
                Contact
              </span>
            </div>
            <div style={{ overflow: "hidden", lineHeight: 0.92 }}>
              <span
                className="hero-w2 hero-txt"
                style={{
                  fontFamily: "'Cormorant Garamond', Georgia, serif",
                  fontSize: "clamp(76px, 13vw, 170px)",
                  fontWeight: 700,
                  fontStyle: "italic",
                  color: "transparent",
                  WebkitTextStroke: `2px ${GOLD}`,
                  letterSpacing: "-0.028em",
                  display: "block",
                }}
              >
                Us.
              </span>
            </div>
          </div>
          <p
            className="hero-sub"
            style={{
              position: "relative",
              zIndex: 2,
              fontSize: "clamp(13px, 1.3vw, 16px)",
              fontWeight: 300,
              letterSpacing: "0.05em",
              color: "rgba(229,224,198,0.48)",
              textAlign: "center",
              maxWidth: 460,
              lineHeight: 1.85,
              marginBottom: 44,
            }}
          >
            Have a question, need support, or want to share your experience?
            We're here — always ready to help.
          </p>
          <div
            className="hero-meta"
            style={{
              position: "relative",
              zIndex: 2,
              display: "flex",
              gap: 12,
              flexWrap: "wrap",
              justifyContent: "center",
            }}
          >
            {[
              { icon: "✉", text: "hello@loqtazone.com" },
              { icon: "📞", text: "+20 100 000 0000" },
              { icon: "📍", text: "Cairo, Egypt" },
              { icon: "⏱", text: "24h Response Time" },
            ].map((p) => (
              <div
                key={p.text}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 7,
                  padding: "8px 16px",
                  borderRadius: 999,
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(229,224,198,0.1)",
                  fontSize: 11.5,
                  fontWeight: 600,
                  color: "rgba(229,224,198,0.55)",
                  backdropFilter: "blur(8px)",
                }}
              >
                <span style={{ color: GOLD, fontSize: 13 }}>{p.icon}</span>
                {p.text}
              </div>
            ))}
          </div>
          <div
            className="hero-scroll"
            style={{
              position: "absolute",
              bottom: 36,
              left: "50%",
              transform: "translateX(-50%)",
              zIndex: 2,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span
              className="scroll-line"
              style={{
                display: "block",
                width: 1,
                height: 40,
                background: `linear-gradient(to bottom, transparent, ${GOLD}66)`,
                borderRadius: 999,
              }}
            />
            <span
              style={{
                fontSize: 8.5,
                fontWeight: 200,
                letterSpacing: "0.38em",
                textTransform: "uppercase",
                color: "rgba(229,224,198,0.28)",
              }}
            >
              Scroll
            </span>
          </div>
        </section>

        {/* FORMS */}
        <section
          ref={formsRef}
          style={{
            background: `linear-gradient(180deg, #0a0a1a 0%, #0c1828 50%, #0a0a1a 100%)`,
            padding: "80px 32px 100px",
            position: "relative",
            overflow: "hidden",
          }}
        >
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
          <div
            style={{
              position: "absolute",
              top: "40%",
              left: "50%",
              transform: "translate(-50%,-50%)",
              width: 1200,
              height: 700,
              borderRadius: "50%",
              background:
                "radial-gradient(ellipse, rgba(42,72,99,0.12) 0%, transparent 65%)",
              pointerEvents: "none",
            }}
          />
          <div
            style={{
              textAlign: "center",
              marginBottom: 56,
              opacity: formsVisible ? 1 : 0,
              transform: formsVisible ? "translateY(0)" : "translateY(20px)",
              transition: "opacity 0.7s ease, transform 0.7s ease",
              position: "relative",
              zIndex: 1,
            }}
          >
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 10,
                marginBottom: 14,
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
                · Two Ways to Reach Us ·
              </span>
              <div
                style={{
                  width: 32,
                  height: 1,
                  background: `linear-gradient(90deg, ${GOLD}, transparent)`,
                }}
              />
            </div>
            <h2
              style={{
                margin: 0,
                fontSize: "clamp(28px, 4vw, 46px)",
                fontWeight: 900,
                letterSpacing: "-0.025em",
              }}
            >
              <span style={{ color: "#fff" }}>Send a Message </span>
              <span style={{ color: GOLD }}>or Share Feedback.</span>
            </h2>
          </div>
          <div
            className="forms-layout"
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 24,
              maxWidth: 1200,
              margin: "0 auto",
              position: "relative",
              zIndex: 1,
              alignItems: "start",
            }}
          >
            <ContactForm visible={formsVisible} />
            <FeedbackForm visible={formsVisible} />
          </div>
        </section>

        {/* CONTACT INFO */}
        <section
          ref={infoRef}
          style={{
            background: `linear-gradient(180deg, #0a0a1a 0%, #060610 100%)`,
            padding: "80px 32px 100px",
            position: "relative",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: 1,
              background: `linear-gradient(90deg, transparent, rgba(229,224,198,0.1), transparent)`,
            }}
          />
          <div style={{ maxWidth: 1100, margin: "0 auto" }}>
            <div
              style={{
                textAlign: "center",
                marginBottom: 52,
                opacity: infoVisible ? 1 : 0,
                transform: infoVisible ? "translateY(0)" : "translateY(20px)",
                transition: "opacity 0.7s ease, transform 0.7s ease",
              }}
            >
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 800,
                  color: `${GOLD}88`,
                  letterSpacing: "0.28em",
                  textTransform: "uppercase",
                }}
              >
                ✦ Find Us ✦
              </span>
              <h2
                style={{
                  margin: "12px 0 0",
                  fontSize: "clamp(24px, 3.5vw, 40px)",
                  fontWeight: 900,
                  letterSpacing: "-0.02em",
                }}
              >
                <span style={{ color: "#fff" }}>Other Ways to </span>
                <span style={{ color: GOLD }}>Connect.</span>
              </h2>
            </div>
            <div
              className="info-grid"
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                gap: 14,
              }}
            >
              {[
                {
                  icon: "✉",
                  label: "Email",
                  value: "hello@loqtazone.com",
                  sub: "We reply within 24 hours",
                },
                {
                  icon: "📞",
                  label: "Phone",
                  value: "+20 100 000 0000",
                  sub: "Sun–Thu, 9AM–9PM",
                },
                {
                  icon: "📱",
                  label: "WhatsApp",
                  value: "+20 100 000 0000",
                  sub: "Fast responses on WhatsApp",
                },
                {
                  icon: "📍",
                  label: "Location",
                  value: "Cairo, Egypt",
                  sub: "Online-first platform",
                },
                {
                  icon: "📘",
                  label: "Facebook",
                  value: "@LoqtaZone",
                  sub: "Follow for auction updates",
                },
                {
                  icon: "📸",
                  label: "Instagram",
                  value: "@LoqtaZone",
                  sub: "Behind the scenes & wins",
                },
              ].map((item, i) => (
                <div
                  key={item.label}
                  style={{
                    opacity: infoVisible ? 1 : 0,
                    transform: infoVisible
                      ? "translateY(0)"
                      : "translateY(24px)",
                    transition: `opacity 0.6s ease ${i * 0.07}s, transform 0.6s ease ${i * 0.07}s`,
                  }}
                >
                  <ContactInfo {...item} />
                </div>
              ))}
            </div>
            <div
              style={{
                marginTop: 56,
                textAlign: "center",
                opacity: infoVisible ? 1 : 0,
                transition: "opacity 0.8s ease 0.5s",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 16,
                  justifyContent: "center",
                  marginBottom: 16,
                }}
              >
                <div
                  style={{
                    flex: 1,
                    maxWidth: 120,
                    height: 1,
                    background: `linear-gradient(90deg, transparent, rgba(229,224,198,0.12))`,
                  }}
                />
                <span style={{ fontSize: 18, color: GOLD, opacity: 0.6 }}>
                  ✦
                </span>
                <div
                  style={{
                    flex: 1,
                    maxWidth: 120,
                    height: 1,
                    background: `linear-gradient(90deg, rgba(229,224,198,0.12), transparent)`,
                  }}
                />
              </div>
              <p
                style={{
                  fontSize: 12,
                  color: "rgba(229,224,198,0.28)",
                  letterSpacing: "0.08em",
                  margin: 0,
                }}
              >
                Crafted with ✦ in Egypt · Loqta Zone Premium Auctions
              </p>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
