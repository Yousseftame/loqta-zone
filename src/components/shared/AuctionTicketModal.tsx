import { useState } from "react";
import { submitTicket } from "@/service/tickets/ticketService";
import type {
  TicketCategory,
  TicketPriority,
  AuctionStatus,
} from "@/pages/Admin/Tickets/ticket-data";
import {
  TICKET_CATEGORY_LABELS,
  TICKET_PRIORITY_LABELS,
} from "@/pages/Admin/Tickets/ticket-data";
import toast from "react-hot-toast";

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  auctionId:     string;
  auctionNumber: number;
  auctionStatus: AuctionStatus;
  productId?:    string;
  productName?:  string;
  userId:        string;
  userName:      string;
  userEmail:     string;
  isRtl?:       boolean;
  onClose:       () => void;
}

// ─── Static data ─────────────────────────────────────────────────────────────

const CATEGORIES = Object.entries(TICKET_CATEGORY_LABELS) as [TicketCategory, string][];
const PRIORITIES = Object.entries(TICKET_PRIORITY_LABELS) as [TicketPriority, string][];

const CATEGORY_ICONS: Record<TicketCategory, string> = {
  cant_enter:          "🚫",
  payment_issue:       "💳",
  registration_failed: "❌",
  technical_error:     "⚙️",
  wrong_fee_charged:   "💰",
  access_denied:       "🔒",
  other:               "❓",
};

const PRIORITY_COLORS: Record<TicketPriority, { bg: string; border: string; text: string; dot: string }> = {
  low:    { bg: "rgba(34,197,94,0.08)",  border: "rgba(34,197,94,0.3)",  text: "#4ade80", dot: "#22c55e" },
  medium: { bg: "rgba(251,191,36,0.08)", border: "rgba(251,191,36,0.3)", text: "#fbbf24", dot: "#f59e0b" },
  high:   { bg: "rgba(249,115,22,0.08)", border: "rgba(249,115,22,0.3)", text: "#fb923c", dot: "#f97316" },
  urgent: { bg: "rgba(239,68,68,0.1)",   border: "rgba(239,68,68,0.4)",  text: "#f87171", dot: "#ef4444" },
};

const AR_CATEGORY: Record<TicketCategory, string> = {
  cant_enter:          "لا أستطيع الدخول",
  payment_issue:       "مشكلة في الدفع",
  registration_failed: "فشل التسجيل",
  technical_error:     "خطأ تقني",
  wrong_fee_charged:   "رسوم خاطئة",
  access_denied:       "تم رفض الوصول",
  other:               "مشكلة أخرى",
};

const AR_PRIORITY: Record<TicketPriority, string> = {
  low:    "منخفضة",
  medium: "متوسطة",
  high:   "عالية",
  urgent: "عاجلة جداً",
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function AuctionTicketModal({
  auctionId,
  auctionNumber,
  auctionStatus,
  productId,
  productName,
  userId,
  userName,
  userEmail,
  isRtl = false,
  onClose,
}: Props) {
  const [category,    setCategory]    = useState<TicketCategory | "">("");
  const [priority,    setPriority]    = useState<TicketPriority>("medium");
  const [subject,     setSubject]     = useState("");
  const [description, setDescription] = useState("");
  const [phone,       setPhone]       = useState("");
  const [submitting,  setSubmitting]  = useState(false);
  const [submitted,   setSubmitted]   = useState(false);

  const canSubmit =
    category !== "" &&
    subject.trim().length >= 5 &&
    description.trim().length >= 20;

  const handleSubmit = async () => {
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    try {
      await submitTicket({
        auctionId,
        auctionNumber,
        auctionStatus,
        productId:   productId   || "",
        productName: productName || "",
        userId,
        userName,
        userEmail,
        userPhone:   phone.trim() || undefined,
        category:    category as TicketCategory,
        priority,
        subject:     subject.trim(),
        description: description.trim(),
        deviceInfo:  navigator.userAgent.substring(0, 200),
      });
      setSubmitted(true);
    } catch {
      toast.error(
        isRtl
          ? "فشل إرسال التذكرة. يرجى المحاولة مرة أخرى."
          : "Failed to submit. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Texts ────────────────────────────────────────────────────────────────

  const txt = {
    badge:       isRtl ? `مزاد #${auctionNumber}` : `Auction #${auctionNumber}`,
    title:       isRtl ? "📬 مركز الدعم الفني" : "📬 Support Help Desk",
    subtitle:    isRtl
      ? "نحن هنا لمساعدتك — أخبرنا بالمشكلة وسيتواصل معك فريقنا."
      : "We're here to help — describe your issue and our team will respond promptly.",
    catLabel:    isRtl ? "نوع المشكلة *" : "Issue Category *",
    prioLabel:   isRtl ? "الأولوية *" : "Priority *",
    subjectLbl:  isRtl ? "عنوان المشكلة *" : "Subject *",
    subjectPH:   isRtl ? "وصف مختصر للمشكلة…" : "Brief summary of your issue…",
    descLbl:     isRtl ? "تفاصيل المشكلة *" : "Describe the Problem *",
    descPH:      isRtl
      ? "اشرح ما حدث بالتفصيل: متى؟ ما الرسالة؟ هل حاولت مجدداً؟"
      : "What happened? When did it start? Any error messages? Steps to reproduce?",
    phoneLbl:    isRtl ? "رقم الجوال (اختياري)" : "Phone Number (optional)",
    phonePH:     isRtl ? "+20 xxxxxxxxxx" : "+1 (555) 000-0000",
    nameLbl:     isRtl ? "الاسم" : "Name",
    emailLbl:    isRtl ? "البريد" : "Email",
    validation:  isRtl
      ? "يرجى اختيار الفئة والأولوية وكتابة عنوان (5 أحرف) ووصف (20 حرف)."
      : "Select a category, enter a subject (min 5 chars) and description (min 20 chars).",
    submit:      isRtl ? "إرسال الطلب الآن" : "Submit Request",
    submitting:  isRtl ? "جارٍ الإرسال…" : "Submitting…",
    successTitle: isRtl ? "تم إرسال طلبك بنجاح!" : "Request Submitted!",
    successMsg:  isRtl
      ? "وصل طلبك إلى فريق الدعم وسيتواصلون معك قريباً على بريدك الإلكتروني."
      : "Your ticket has been received. Our support team will contact you shortly via email.",
    close:       isRtl ? "إغلاق" : "Close",
  };

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={submitting ? undefined : onClose}
        style={{ position: "fixed", inset: 0, zIndex: 9000, background: "rgba(5,12,20,0.82)", backdropFilter: "blur(8px)", animation: "tk-fi 0.2s ease" }}
      />

      {/* Modal wrapper */}
      <div
        dir={isRtl ? "rtl" : "ltr"}
        style={{ position: "fixed", inset: 0, zIndex: 9001, display: "flex", alignItems: "center", justifyContent: "center", padding: 16, pointerEvents: "none" }}
      >
      <div style={{
          pointerEvents: "all",
          background: "linear-gradient(160deg,#12223a 0%,#0d1a2b 100%)",
          border: "1px solid rgba(201,169,110,0.22)",
          borderRadius: 28,
          width: "100%",
          maxWidth: 600,
          maxHeight: "93vh",
          overflowY: "auto",
          scrollbarWidth: "thin",
          scrollbarColor: "rgba(201,169,110,0.25) transparent",
          boxShadow: "0 50px 120px rgba(0,0,0,0.75)",
          animation: "tk-si 0.3s cubic-bezier(0.34,1.5,0.64,1)",
          fontFamily: "'Outfit',system-ui,sans-serif",
        }}>
          {/* top gold bar */}
          <div style={{ height: 4, background: "linear-gradient(90deg,#c9a96e,#f0d090,#c9a96e)", borderRadius: "28px 28px 0 0" }} />

          <div style={{ padding: "clamp(18px,5vw,32px) clamp(16px,5vw,36px) clamp(20px,5vw,36px)" }}>

            {submitted ? (
              /* ── Success ── */
              <div style={{ textAlign: "center", padding: "28px 0" }}>
                <div style={{ fontSize: 64, marginBottom: 18 }}>📬</div>
                <h2 style={{ margin: "0 0 14px", fontSize: 26, fontWeight: 800, color: "#e5e0c6" }}>{txt.successTitle}</h2>
                <p style={{ margin: "0 0 30px", fontSize: 16, color: "rgba(229,224,198,0.65)", lineHeight: 1.8, maxWidth: 420, marginInline: "auto" }}>{txt.successMsg}</p>
                <button onClick={onClose} style={{ background: "linear-gradient(135deg,#c9a96e,#b8934a)", color: "#09111a", border: "none", borderRadius: 14, padding: "14px 44px", fontSize: 16, fontWeight: 800, cursor: "pointer", fontFamily: "inherit" }}>
                  {txt.close}
                </button>
              </div>
            ) : (
              <>
                {/* Header */}
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 26 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ marginBottom: 8, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.12em", color: "rgba(201,169,110,0.75)", textTransform: "uppercase" }}>{txt.badge}</span>
                      {productName && <span style={{ fontSize: 13, color: "rgba(229,224,198,0.45)", fontWeight: 500 }}>· {productName}</span>}
                      <span style={{ fontSize: 13, fontWeight: 800, color: auctionStatus === "live" ? "#4ade80" : "#93c5fd", textTransform: "uppercase", letterSpacing: "0.1em" }}>
                        ● {auctionStatus}
                      </span>
                    </div>
                    <h2 id="ticket-modal-title" style={{ margin: 0, fontSize: 26, fontWeight: 800, color: "#e5e0c6", lineHeight: 1.2 }}>{txt.title}</h2>
                    <p style={{ margin: "10px 0 0", fontSize: 15, color: "rgba(229,224,198,0.5)", lineHeight: 1.7 }}>{txt.subtitle}</p>
                  </div>
                  <button
                    onClick={onClose}
                    style={{ flexShrink: 0, marginInlineStart: 16, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "50%", width: 38, height: 38, cursor: "pointer", color: "rgba(229,224,198,0.45)", fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s" }}
                    onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.12)"; e.currentTarget.style.color = "#e5e0c6"; }}
                    onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; e.currentTarget.style.color = "rgba(229,224,198,0.45)"; }}
                  >✕</button>
                </div>

                {/* Divider */}
                <div style={{ height: 1, background: "linear-gradient(90deg,rgba(201,169,110,0.35),rgba(201,169,110,0.05),transparent)", marginBottom: 28 }} />

                {/* ── Category ── */}
                <div style={{ marginBottom: 22 }}>
                  <label style={LS}>{txt.catLabel}</label>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 10 }}>
                    {CATEGORIES.map(([key, enLabel]) => {
                      const active = category === key;
                      return (
                        <button key={key} onClick={() => setCategory(key)} style={{
                          background: active ? "rgba(201,169,110,0.14)" : "rgba(255,255,255,0.03)",
                          border: `1.5px solid ${active ? "rgba(201,169,110,0.6)" : "rgba(255,255,255,0.08)"}`,
                          borderRadius: 12,
                          padding: "12px 14px",
                          cursor: "pointer",
                          textAlign: "start",
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                          fontFamily: "inherit",
                          transition: "all 0.2s",
                        }}
                          onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.borderColor = "rgba(201,169,110,0.3)"; }}
                          onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.08)"; }}
                        >
                          <span style={{ fontSize: 20 }}>{CATEGORY_ICONS[key]}</span>
                          <span style={{ fontSize: 14, fontWeight: 600, color: active ? "rgba(201,169,110,0.95)" : "rgba(229,224,198,0.6)", lineHeight: 1.3 }}>
                            {isRtl ? AR_CATEGORY[key] : enLabel}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* ── Priority ── */}
                <div style={{ marginBottom: 22 }}>
                  <label style={LS}>{txt.prioLabel}</label>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(80px, 1fr))", gap: 8 }}>
                    {PRIORITIES.map(([key, enLabel]) => {
                      const active = priority === key;
                      const c = PRIORITY_COLORS[key];
                      return (
                        <button key={key} onClick={() => setPriority(key)} style={{
                          background: active ? c.bg : "rgba(255,255,255,0.03)",
                          border: `1.5px solid ${active ? c.border : "rgba(255,255,255,0.08)"}`,
                          borderRadius: 12,
                          padding: "12px 8px",
                          cursor: "pointer",
                          textAlign: "center",
                          fontFamily: "inherit",
                          transition: "all 0.2s",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          gap: 6,
                        }}
                          onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.borderColor = c.border; }}
                          onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.08)"; }}
                        >
                          <div style={{ width: 12, height: 12, borderRadius: "50%", background: c.dot, boxShadow: active ? `0 0 8px ${c.dot}` : "none" }} />
                          <span style={{ fontSize: 13, fontWeight: 700, color: active ? c.text : "rgba(229,224,198,0.5)" }}>
                            {isRtl ? AR_PRIORITY[key] : enLabel}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* ── Subject ── */}
                <div style={{ marginBottom: 18 }}>
                  <label style={LS}>{txt.subjectLbl}</label>
                  <input
                    value={subject}
                    onChange={e => setSubject(e.target.value)}
                    maxLength={120}
                    placeholder={txt.subjectPH}
                    style={IS}
                    onFocus={e => { e.currentTarget.style.borderColor = "rgba(201,169,110,0.5)"; }}
                    onBlur={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; }}
                  />
                </div>

                {/* ── Description ── */}
                <div style={{ marginBottom: 18 }}>
                  <label style={LS}>{txt.descLbl}</label>
                  <textarea
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    maxLength={1000}
                    rows={4}
                    placeholder={txt.descPH}
                    style={{ ...IS, resize: "vertical", minHeight: 110, lineHeight: 1.7 }}
                    onFocus={e => { e.currentTarget.style.borderColor = "rgba(201,169,110,0.5)"; }}
                    onBlur={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; }}
                  />
                  <p style={{ margin: "5px 0 0", fontSize: 12, color: "rgba(229,224,198,0.25)", textAlign: isRtl ? "left" : "right" }}>
                    {description.length} / 1000
                  </p>
                </div>

                {/* ── Phone ── */}
                <div style={{ marginBottom: 22 }}>
                  <label style={LS}>{txt.phoneLbl}</label>
                  <input
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder={txt.phonePH}
                    type="tel"
                    style={IS}
                    onFocus={e => { e.currentTarget.style.borderColor = "rgba(201,169,110,0.5)"; }}
                    onBlur={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; }}
                  />
                </div>

                {/* ── User info strip ── */}
                <div style={{ padding: "14px 18px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, marginBottom: 24, display: "flex", gap: 28, flexWrap: "wrap" }}>
                  {[
                    { label: txt.nameLbl,  value: userName  },
                    { label: txt.emailLbl, value: userEmail },
                  ].map(({ label, value }) => (
                    <div key={label}>
                      <p style={{ margin: 0, fontSize: 11, color: "rgba(229,224,198,0.3)", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase" }}>{label}</p>
                      <p style={{ margin: "4px 0 0", fontSize: 15, color: "rgba(229,224,198,0.7)", fontWeight: 500 }}>{value}</p>
                    </div>
                  ))}
                </div>

                {/* ── Validation hint ── */}
                {!canSubmit && (category !== "" || subject || description) && (
                  <div style={{ marginBottom: 18, padding: "12px 16px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.22)", borderRadius: 12, display: "flex", gap: 10, alignItems: "flex-start" }}>
                    <span style={{ fontSize: 18, flexShrink: 0 }}>⚠️</span>
                    <p style={{ margin: 0, fontSize: 14, color: "rgba(252,165,165,0.9)", lineHeight: 1.5 }}>{txt.validation}</p>
                  </div>
                )}

                {/* ── Submit ── */}
                <button
                  onClick={handleSubmit}
                  disabled={!canSubmit || submitting}
                  style={{
                    width: "100%",
                    height: 58,
                    border: "none",
                    borderRadius: 16,
                    background: canSubmit ? "linear-gradient(135deg,#c9a96e 0%,#b8934a 100%)" : "rgba(255,255,255,0.04)",
                    color: canSubmit ? "#09111a" : "rgba(229,224,198,0.2)",
                    fontSize: 17,
                    fontWeight: 800,
                    letterSpacing: "0.06em",
                    cursor: canSubmit ? "pointer" : "not-allowed",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 10,
                    fontFamily: "inherit",
                    transition: "all 0.25s ease",
                    boxShadow: canSubmit ? "0 10px 28px rgba(201,169,110,0.28)" : "none",
                  }}
                  onMouseEnter={e => { if (canSubmit) { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 16px 36px rgba(201,169,110,0.38)"; } }}
                  onMouseLeave={e => { if (canSubmit) { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "0 10px 28px rgba(201,169,110,0.28)"; } }}
                >
                  {submitting ? (
                    <>
                      <span style={{ width: 20, height: 20, border: "3px solid rgba(9,17,26,0.2)", borderTopColor: "#09111a", borderRadius: "50%", animation: "tk-sp 0.8s linear infinite", display: "inline-block" }} />
                      {txt.submitting}
                    </>
                  ) : (
                    <>📬 {txt.submit}</>
                  )}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes tk-fi { from { opacity:0 } to { opacity:1 } }
        @keyframes tk-si { from { opacity:0; transform:translateY(28px) scale(0.95) } to { opacity:1; transform:translateY(0) scale(1) } }
        @keyframes tk-sp { to { transform:rotate(360deg) } }
      `}</style>
    </>
  );
}

// ─── Shared styles ────────────────────────────────────────────────────────────

const LS: React.CSSProperties = {
  display: "block",
  fontSize: 13,
  fontWeight: 700,
  color: "rgba(201,169,110,0.8)",
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  marginBottom: 10,
};

const IS: React.CSSProperties = {
  width: "100%",
  background: "rgba(255,255,255,0.05)",
  border: "1.5px solid rgba(255,255,255,0.1)",
  borderRadius: 14,
  padding: "14px 18px",
  color: "#e5e0c6",
  fontSize: 16,
  fontFamily: "'Outfit',system-ui,sans-serif",
  outline: "none",
  boxSizing: "border-box",
  transition: "border-color 0.2s",
};
