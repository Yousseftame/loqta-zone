import { useState, useEffect } from "react";
import { Globe, ChevronDown } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";

const GOLD = "#c9a96e";

interface LangSwitcherProps {
  mobile?: boolean;
}

const LangSwitcher = ({ mobile = false }: LangSwitcherProps) => {
  const { currentLang, changeLanguage } = useLanguage();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest(".lang-sw")) setOpen(false);
    };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, []);

  return (
    <div className="lang-sw" style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 5,
          background: open ? "rgba(201,169,110,.08)" : "rgba(255,255,255,.04)",
          border: `1px solid ${open ? "rgba(201,169,110,.35)" : "rgba(229,224,198,.12)"}`,
          borderRadius: 999,
          padding: mobile ? "8px 14px" : "6px 12px",
          color: "rgba(229,224,198,.7)",
          cursor: "pointer",
          fontSize: mobile ? 13 : 11,
          fontWeight: 700,
          letterSpacing: ".08em",
          fontFamily: "'Jost',sans-serif",
          transition: "all .25s",
          whiteSpace: "nowrap",
        }}
      >
        <Globe
          size={mobile ? 14 : 12}
          strokeWidth={2}
          style={{ opacity: 0.8 }}
        />
        <span>{currentLang.toUpperCase()}</span>
        <ChevronDown
          size={10}
          strokeWidth={2.5}
          style={{
            transform: open ? "rotate(180deg)" : "none",
            transition: "transform .22s",
            opacity: 0.65,
          }}
        />
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: mobile ? "auto" : "calc(100% + 8px)",
            bottom: mobile ? "calc(100% + 8px)" : "auto",
            right: 0,
            background: "linear-gradient(160deg,#162d45,#0d1b2a)",
            border: "1px solid rgba(201,169,110,.18)",
            borderRadius: 12,
            padding: 6,
            minWidth: 148,
            boxShadow: "0 16px 40px rgba(0,0,0,.55)",
            zIndex: 100,
            animation: "loqDropIn .22s cubic-bezier(.22,1,.36,1)",
          }}
        >
          {(["en", "ar"] as const).map((l) => (
            <button
              key={l}
              onClick={() => {
                changeLanguage(l);
                setOpen(false);
              }}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "9px 10px",
                background:
                  currentLang === l ? "rgba(201,169,110,.12)" : "transparent",
                border: "none",
                borderRadius: 8,
                cursor: "pointer",
                color: currentLang === l ? GOLD : "rgba(229,224,198,.55)",
                fontSize: 12,
                fontWeight: currentLang === l ? 700 : 500,
                fontFamily: "'Jost',sans-serif",
                textAlign: "left",
                transition: "all .2s",
              }}
            >
              <span style={{ fontSize: 16 }}>{l === "en" ? "🇬🇧" : "🇪🇬"}</span>
              <span>{l === "en" ? "English" : "العربية"}</span>
              {currentLang === l && (
                <span
                  style={{ marginLeft: "auto", fontSize: 10, opacity: 0.65 }}
                >
                  ✓
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default LangSwitcher;
