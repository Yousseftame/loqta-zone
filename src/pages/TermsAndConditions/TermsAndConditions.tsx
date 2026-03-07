import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

// ── Design tokens ─────────────────────────────────────────────
const GOLD = "#c9a96e";
const CREAM = "rgb(229, 224, 198)";
const BG = "#0a0a1a";
const NAVY = "#2A4863";
const NAVY2 = "#1e3652";

// ── Types ─────────────────────────────────────────────────────
type ContentBlock =
  | { type: "text"; text: string }
  | { type: "subheading"; text: string }
  | { type: "bullets"; items: string[] }
  | { type: "list"; items: { term: string; def: string }[] }
  | { type: "tags"; items: string[] }
  | { type: "warning"; text: string }
  | { type: "contact"; items: { label: string; value: string }[] };

type Section = {
  number: string;
  title: string;
  icon: string;
  content: ContentBlock[];
};

// ── Sidebar nav item ──────────────────────────────────────────
function NavItem({
  section,
  active,
  onClick,
  isRtl,
}: {
  section: Section;
  active: boolean;
  onClick: () => void;
  isRtl: boolean;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        width: "100%",
        padding: "10px 14px",
        background: active ? `rgba(201,169,110,0.12)` : "transparent",
        border: `1px solid ${active ? `${GOLD}44` : "transparent"}`,
        borderRadius: 10,
        cursor: "pointer",
        textAlign: isRtl ? "right" : "left",
        direction: isRtl ? "rtl" : "ltr",
        transition: "all 0.2s ease",
        marginBottom: 4,
      }}
    >
      <span
        style={{
          fontSize: 11,
          fontWeight: 800,
          color: active ? GOLD : "rgba(229,224,198,0.3)",
          minWidth: 22,
          fontFamily: "'Jost', sans-serif",
        }}
      >
        {section.number.padStart(2, "0")}
      </span>
      <span
        style={{
          fontSize: 12.5,
          fontWeight: 600,
          color: active ? CREAM : "rgba(229,224,198,0.45)",
          letterSpacing: "0.01em",
          lineHeight: 1.3,
        }}
      >
        {section.title}
      </span>
    </button>
  );
}

// ── Section renderer ──────────────────────────────────────────
function SectionBlock({
  section,
  isRtl,
}: {
  section: Section;
  isRtl: boolean;
}) {
  return (
    <div
      id={`section-${section.number}`}
      style={{
        marginBottom: 48,
        paddingBottom: 48,
        borderBottom: "1px solid rgba(229,224,198,0.07)",
        direction: isRtl ? "rtl" : "ltr",
      }}
    >
      {/* Section header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
          marginBottom: 24,
        }}
      >
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 10,
            background: `linear-gradient(135deg, ${NAVY}, ${NAVY2})`,
            border: `1.5px solid ${GOLD}33`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 18,
            flexShrink: 0,
          }}
        >
          {section.icon}
        </div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
          <span
            style={{
              fontSize: 11,
              fontWeight: 800,
              color: `${GOLD}99`,
              letterSpacing: "0.18em",
              fontFamily: "'Jost', sans-serif",
            }}
          >
            {section.number.padStart(2, "0")}
          </span>
          <h2
            style={{
              margin: 0,
              fontSize: "clamp(18px, 2vw, 22px)",
              fontWeight: 800,
              color: CREAM,
              letterSpacing: "-0.01em",
            }}
          >
            {section.title}
          </h2>
        </div>
      </div>

      {/* Section content */}
      <div style={{ paddingInlineStart: 58 }}>
        {section.content.map((block, i) => {
          if (block.type === "text") {
            return (
              <p
                key={i}
                style={{
                  margin: "0 0 14px",
                  fontSize: 14,
                  color: "rgba(229,224,198,0.7)",
                  lineHeight: 1.85,
                  fontWeight: 400,
                }}
              >
                {block.text}
              </p>
            );
          }
          if (block.type === "subheading") {
            return (
              <h3
                key={i}
                style={{
                  margin: "20px 0 10px",
                  fontSize: 13.5,
                  fontWeight: 800,
                  color: GOLD,
                  letterSpacing: isRtl ? "0" : "0.04em",
                  textTransform: isRtl ? "none" : ("uppercase" as const),
                }}
              >
                {block.text}
              </h3>
            );
          }
          if (block.type === "bullets") {
            return (
              <ul
                key={i}
                style={{
                  margin: "0 0 16px",
                  padding: 0,
                  listStyle: "none",
                  display: "flex",
                  flexDirection: "column" as const,
                  gap: 8,
                }}
              >
                {block.items.map((item, j) => (
                  <li
                    key={j}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 10,
                    }}
                  >
                    <span
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        background: GOLD,
                        flexShrink: 0,
                        marginTop: 7,
                        opacity: 0.7,
                      }}
                    />
                    <span
                      style={{
                        fontSize: 13.5,
                        color: "rgba(229,224,198,0.65)",
                        lineHeight: 1.75,
                        fontWeight: 400,
                      }}
                    >
                      {item}
                    </span>
                  </li>
                ))}
              </ul>
            );
          }
          if (block.type === "list") {
            return (
              <div
                key={i}
                style={{
                  display: "flex",
                  flexDirection: "column" as const,
                  gap: 10,
                  marginBottom: 16,
                }}
              >
                {block.items.map((item, j) => (
                  <div
                    key={j}
                    style={{
                      display: "flex",
                      gap: 12,
                      padding: "12px 16px",
                      background: "rgba(255,255,255,0.025)",
                      border: "1px solid rgba(229,224,198,0.07)",
                      borderRadius: 10,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: 800,
                        color: GOLD,
                        whiteSpace: "nowrap" as const,
                        minWidth: 110,
                      }}
                    >
                      {item.term}
                    </span>
                    <span
                      style={{
                        fontSize: 13,
                        color: "rgba(229,224,198,0.6)",
                        lineHeight: 1.7,
                      }}
                    >
                      {item.def}
                    </span>
                  </div>
                ))}
              </div>
            );
          }
          if (block.type === "warning") {
            return (
              <div
                key={i}
                style={{
                  display: "flex",
                  gap: 12,
                  padding: "14px 16px",
                  background: "rgba(239,68,68,0.06)",
                  border: "1px solid rgba(239,68,68,0.25)",
                  borderRadius: 10,
                  marginBottom: 16,
                }}
              >
                <span style={{ fontSize: 16, flexShrink: 0 }}>⚠️</span>
                <span
                  style={{
                    fontSize: 13,
                    color: "rgba(239,180,180,0.85)",
                    lineHeight: 1.75,
                    fontWeight: 500,
                  }}
                >
                  {block.text}
                </span>
              </div>
            );
          }
          if (block.type === "tags") {
            return (
              <div
                key={i}
                style={{
                  display: "flex",
                  gap: 8,
                  flexWrap: "wrap" as const,
                  margin: "12px 0 16px",
                }}
              >
                {block.items.map((tag, j) => (
                  <span
                    key={j}
                    style={{
                      padding: "6px 16px",
                      background: `${GOLD}14`,
                      border: `1px solid ${GOLD}33`,
                      borderRadius: 999,
                      fontSize: 12,
                      fontWeight: 700,
                      color: GOLD,
                      letterSpacing: "0.06em",
                    }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            );
          }
          if (block.type === "contact") {
            return (
              <div
                key={i}
                style={{
                  display: "flex",
                  flexDirection: "column" as const,
                  gap: 8,
                  marginTop: 8,
                }}
              >
                {block.items.map((c, j) => (
                  <div
                    key={j}
                    style={{ display: "flex", gap: 12, alignItems: "center" }}
                  >
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 800,
                        color: `${GOLD}88`,
                        letterSpacing: isRtl ? "0" : "0.16em",
                        textTransform: isRtl ? "none" : ("uppercase" as const),
                        minWidth: 80,
                      }}
                    >
                      {c.label}
                    </span>
                    <span
                      style={{ fontSize: 13.5, color: CREAM, fontWeight: 600 }}
                    >
                      {c.value}
                    </span>
                  </div>
                ))}
              </div>
            );
          }
          return null;
        })}
      </div>
    </div>
  );
}

// ── MAIN PAGE ─────────────────────────────────────────────────
export default function Terms() {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === "ar";
    const navigate = useNavigate();


  const [activeSection, setActiveSection] = useState("1");
  const [agreed, setAgreed] = useState(false);

  const scrollToSection = (num: string) => {
    setActiveSection(num);
    const el = document.getElementById(`section-${num}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const SECTION_ICONS = [
    "📖",
    "🏛",
    "✅",
    "⚖",
    "💳",
    "🚚",
    "🏷",
    "🚫",
    "🔄",
    "⚠",
    "©",
    "📝",
    "🏛",
    "✉",
  ];

  const rawSections = t("termsPage.sections", { returnObjects: true }) as any[];
  const SECTIONS: Section[] = rawSections.map((s: any, i: number) => ({
    number: String(i + 1),
    title: s.title,
    icon: SECTION_ICONS[i],
    content: s.content,
  }));

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@600;700&family=Jost:wght@300;400;600;700;800&display=swap');
        * { box-sizing: border-box; }
        .terms-page { font-family: 'Jost', 'Helvetica Neue', sans-serif; background: ${BG}; min-height: 100vh; color: ${CREAM}; }
        .terms-sidebar::-webkit-scrollbar { width: 4px; }
        .terms-sidebar::-webkit-scrollbar-track { background: transparent; }
        .terms-sidebar::-webkit-scrollbar-thumb { background: rgba(201,169,110,0.2); border-radius: 99px; }
        .terms-content::-webkit-scrollbar { width: 5px; }
        .terms-content::-webkit-scrollbar-track { background: transparent; }
        .terms-content::-webkit-scrollbar-thumb { background: rgba(229,224,198,0.1); border-radius: 99px; }
        @media (max-width: 860px) {
          .terms-layout { flex-direction: column !important; }
          .terms-sidebar { position: static !important; width: 100% !important; height: auto !important; max-height: 240px !important; border-inline-end: none !important; border-bottom: 1px solid rgba(229,224,198,0.08) !important; }
        }
      `}</style>

      <div className="terms-page" dir={isRtl ? "rtl" : "ltr"}>
        {/* ── Top header bar ── */}
        <div
          style={{
            borderBottom: "1px solid rgba(229,224,198,0.1)",
            background: "rgba(255,255,255,0.02)",
            backdropFilter: "blur(12px)",
            padding: "20px 32px",
            paddingTop: 100,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 9,
                background: `linear-gradient(135deg, ${NAVY}, ${NAVY2})`,
                border: `1.5px solid ${GOLD}44`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 16,
              }}
            >
              ⚖
            </div>
            <div>
              <div
                style={{
                  fontSize: 9,
                  fontWeight: 800,
                  color: `${GOLD}88`,
                  letterSpacing: isRtl ? "0" : "0.24em",
                  textTransform: "uppercase",
                  marginBottom: 2,
                }}
              >
                {t("termsPage.brand")}
              </div>
              <div
                style={{
                  fontSize: 15,
                  fontWeight: 800,
                  color: CREAM,
                  letterSpacing: "-0.01em",
                }}
              >
                {t("termsPage.pageTitle")}
              </div>
            </div>
          </div>
          <div
            style={{
              padding: "6px 14px",
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(229,224,198,0.12)",
              borderRadius: 8,
              fontSize: 11,
              color: "rgba(229,224,198,0.45)",
              fontWeight: 600,
              letterSpacing: "0.04em",
            }}
          >
            {t("termsPage.lastUpdated")}
          </div>
        </div>

        {/* ── Intro banner ── */}
        <div
          style={{
            background: `linear-gradient(135deg, rgba(42,72,99,0.3), rgba(30,54,82,0.2))`,
            borderBottom: "1px solid rgba(229,224,198,0.07)",
            padding: "32px",
          }}
        >
          <div style={{ maxWidth: 820, margin: "0 auto", textAlign: "center" }}>
            <h1
              style={{
                margin: "0 0 12px",
                fontFamily: "'Cormorant Garamond', Georgia, serif",
                fontSize: "clamp(28px, 4vw, 40px)",
                fontWeight: 700,
                color: CREAM,
                letterSpacing: "-0.01em",
              }}
            >
              {t("termsPage.intro.heading")}
            </h1>
            <p
              style={{
                margin: 0,
                fontSize: 14,
                color: "rgba(229,224,198,0.55)",
                lineHeight: 1.8,
                maxWidth: 580,
                marginInline: "auto",
              }}
            >
              {t("termsPage.intro.subtitle")}
            </p>
          </div>
        </div>

        {/* ── Main layout ── */}
        <div
          className="terms-layout"
          style={{ display: "flex", maxWidth: 1200, margin: "0 auto" }}
        >
          {/* Sidebar */}
          <aside
            className="terms-sidebar"
            style={{
              width: 260,
              flexShrink: 0,
              position: "sticky",
              top: 0,
              height: "calc(100vh - 130px)",
              overflowY: "auto",
              borderInlineEnd: "1px solid rgba(229,224,198,0.07)",
              padding: "24px 16px",
            }}
          >
            <div
              style={{
                fontSize: 9,
                fontWeight: 800,
                color: `${GOLD}77`,
                letterSpacing: isRtl ? "0" : "0.24em",
                textTransform: "uppercase",
                marginBottom: 14,
                paddingInlineStart: 14,
              }}
            >
              {t("termsPage.contentsLabel")}
            </div>
            {SECTIONS.map((s) => (
              <NavItem
                key={s.number}
                section={s}
                active={activeSection === s.number}
                onClick={() => scrollToSection(s.number)}
                isRtl={isRtl}
              />
            ))}
          </aside>

          {/* Content */}
          <main
            className="terms-content"
            style={{ flex: 1, padding: "40px 48px", overflowY: "auto" }}
          >
            {SECTIONS.map((s) => (
              <SectionBlock key={s.number} section={s} isRtl={isRtl} />
            ))}

            {/* ── Agreement checkbox ── */}
            <div
              style={{
                marginTop: 8,
                padding: "28px 32px",
                background: "rgba(255,255,255,0.03)",
                border: `1px solid ${agreed ? `${GOLD}44` : "rgba(229,224,198,0.1)"}`,
                borderRadius: 16,
                transition: "border-color 0.3s ease",
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: GOLD,
                  letterSpacing: isRtl ? "0" : "0.12em",
                  textTransform: "uppercase",
                  marginBottom: 16,
                }}
              >
                {t("termsPage.agreement.title")}
              </div>

              <label
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 14,
                  cursor: "pointer",
                  marginBottom: 20,
                }}
              >
                <div
                  onClick={() => setAgreed(!agreed)}
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 6,
                    border: `2px solid ${agreed ? GOLD : "rgba(229,224,198,0.25)"}`,
                    background: agreed ? `${GOLD}22` : "transparent",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    marginTop: 1,
                    transition: "all 0.25s ease",
                    cursor: "pointer",
                  }}
                >
                  {agreed && (
                    <span
                      style={{
                        fontSize: 13,
                        color: GOLD,
                        fontWeight: 800,
                        lineHeight: 1,
                      }}
                    >
                      ✓
                    </span>
                  )}
                </div>
                <span
                  style={{
                    fontSize: 13.5,
                    color: "rgba(229,224,198,0.7)",
                    lineHeight: 1.75,
                    fontWeight: 400,
                  }}
                >
                  {t("termsPage.agreement.checkboxLabel")}
                </span>
              </label>

              <button
                disabled={!agreed}
                onClick={() => navigate(-1)}
                style={{
                  width: "100%",
                  height: 52,
                  background: agreed
                    ? `linear-gradient(135deg, #c9a96e, #b8944e)`
                    : "rgba(229,224,198,0.06)",
                  border: `1px solid ${agreed ? "transparent" : "rgba(229,224,198,0.1)"}`,
                  borderRadius: 12,
                  color: agreed ? "#0a0a1a" : "rgba(229,224,198,0.25)",
                  fontSize: 12,
                  fontWeight: 800,
                  letterSpacing: isRtl ? "0" : "0.2em",
                  textTransform: "uppercase",
                  cursor: agreed ? "pointer" : "not-allowed",
                  transition: "all 0.3s ease",
                  fontFamily: "'Jost', sans-serif",
                  boxShadow: agreed
                    ? "0 8px 28px rgba(201,169,110,0.3)"
                    : "none",
                }}
              >
                {agreed
                  ? t("termsPage.agreement.btnAgreed")
                  : t("termsPage.agreement.btnPending")}
              </button>

              {!agreed && (
                <p
                  style={{
                    margin: "12px 0 0",
                    fontSize: 11.5,
                    color: "rgba(229,224,198,0.3)",
                    textAlign: "center",
                    fontWeight: 500,
                  }}
                >
                  {t("termsPage.agreement.hint")}
                </p>
              )}
            </div>
          </main>
        </div>
      </div>
    </>
  );
}
