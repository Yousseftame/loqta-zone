/**
 * src/pages/User/Settings/ChangePassword.tsx
 * Localized — uses i18next via useTranslation()
 */

import { useState } from "react";
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
} from "firebase/auth";
import {
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
  AlertCircle,
  Check,
} from "lucide-react";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/store/AuthContext/AuthContext";
import { validatePassword } from "@/types/validation";

// ─── Tokens ──────────────────────────────────────────────────────────────────
const GOLD = "#c9a96e";
const GOLD2 = "#b8944e";
const CREAM = "rgb(229,224,198)";
const DARK = "#080d1a";
const NAVY = "#0e1c2e";
const NAVY2 = "#112237";

// ─── Password strength ────────────────────────────────────────────────────────
function getStrengthScore(pw: string): number {
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  return score;
}

// ─── Input component ──────────────────────────────────────────────────────────
const PasswordInput = ({
  id,
  label,
  value,
  onChange,
  onBlur,
  error,
  placeholder,
  show,
  onToggle,
  disabled,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  onBlur?: () => void;
  error?: string;
  placeholder?: string;
  show: boolean;
  onToggle: () => void;
  disabled?: boolean;
}) => (
  <div>
    <label
      style={{
        display: "block",
        marginBottom: 6,
        fontSize: 10,
        fontWeight: 800,
        letterSpacing: "0.16em",
        textTransform: "uppercase",
        color: "rgba(229,224,198,0.4)",
        fontFamily: "'Jost',sans-serif",
      }}
    >
      {label}
    </label>
    <div style={{ position: "relative" }}>
      <div
        style={{
          position: "absolute",
          left: 14,
          top: "50%",
          transform: "translateY(-50%)",
          pointerEvents: "none",
        }}
      >
        <Lock
          size={14}
          style={{ color: error ? "#ff6464" : "rgba(201,169,110,0.5)" }}
          strokeWidth={1.8}
        />
      </div>
      <input
        id={id}
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        placeholder={placeholder ?? "••••••••"}
        disabled={disabled}
        style={{
          width: "100%",
          padding: "13px 44px 13px 40px",
          background: error
            ? "rgba(255,100,100,0.04)"
            : "rgba(255,255,255,0.03)",
          border: `1px solid ${error ? "rgba(255,100,100,0.35)" : "rgba(201,169,110,0.18)"}`,
          borderRadius: 13,
          color: CREAM,
          fontSize: 14,
          fontFamily: "'Jost',sans-serif",
          fontWeight: 600,
          outline: "none",
          transition: "border-color 0.2s, background 0.2s",
          boxSizing: "border-box",
          opacity: disabled ? 0.5 : 1,
          cursor: disabled ? "not-allowed" : "text",
        }}
        onFocus={(e) => {
          if (!error)
            (e.target as HTMLInputElement).style.borderColor =
              "rgba(201,169,110,0.45)";
        }}
        onBlurCapture={(e) => {
          if (!error)
            (e.target as HTMLInputElement).style.borderColor =
              "rgba(201,169,110,0.18)";
        }}
      />
      <button
        type="button"
        onClick={onToggle}
        tabIndex={-1}
        style={{
          position: "absolute",
          right: 14,
          top: "50%",
          transform: "translateY(-50%)",
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: 0,
          color: "rgba(229,224,198,0.3)",
          display: "flex",
          alignItems: "center",
        }}
      >
        {show ? <EyeOff size={14} /> : <Eye size={14} />}
      </button>
    </div>
    {error && (
      <div
        style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 5 }}
      >
        <AlertCircle size={11} style={{ color: "#ff6464", flexShrink: 0 }} />
        <p
          style={{
            margin: 0,
            fontSize: 11,
            color: "#ff6464",
            fontFamily: "'Jost',sans-serif",
            fontWeight: 600,
          }}
        >
          {error}
        </p>
      </div>
    )}
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────
export default function ChangePassword() {
  const { user } = useAuth();
  const { t } = useTranslation();

  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [touched, setTouched] = useState({
    current: false,
    new: false,
    confirm: false,
  });
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  // ── Requirements (built from t() so they react to language changes) ────────
  const requirements = [
    {
      label: t("changePasswordPage.requirements.length"),
      test: (p: string) => p.length >= 8,
    },
    {
      label: t("changePasswordPage.requirements.uppercase"),
      test: (p: string) => /[A-Z]/.test(p),
    },
    {
      label: t("changePasswordPage.requirements.number"),
      test: (p: string) => /[0-9]/.test(p),
    },
    {
      label: t("changePasswordPage.requirements.special"),
      test: (p: string) => /[^A-Za-z0-9]/.test(p),
    },
  ];

  // ── Strength label ──────────────────────────────────────────────────────────
  const strengthLabels = [
    { label: t("changePasswordPage.strength.tooWeak"), color: "#ef4444" },
    { label: t("changePasswordPage.strength.weak"), color: "#f97316" },
    { label: t("changePasswordPage.strength.fair"), color: "#eab308" },
    { label: t("changePasswordPage.strength.strong"), color: "#22c55e" },
    { label: t("changePasswordPage.strength.strong"), color: "#22c55e" },
  ];
  const strengthScore = getStrengthScore(newPw);
  const strength = { score: strengthScore, ...strengthLabels[strengthScore] };

  // ── Validation ──────────────────────────────────────────────────────────────
  const currentError =
    touched.current && !currentPw.trim()
      ? t("changePasswordPage.errors.currentRequired")
      : "";
  const newPwResult = validatePassword(newPw);
  const newError = touched.new ? newPwResult.error : "";
  const confirmError = touched.confirm
    ? !confirmPw
      ? t("changePasswordPage.errors.confirmRequired")
      : confirmPw !== newPw
        ? t("changePasswordPage.errors.confirmMismatch")
        : ""
    : "";

  const isValid =
    !currentError &&
    !newPwResult.error &&
    confirmPw === newPw &&
    !!currentPw &&
    !!newPw &&
    !!confirmPw;

  // ── Submit ──────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({ current: true, new: true, confirm: true });
    if (!isValid || !user || !user.email) return;

    setSaving(true);
    try {
      const credential = EmailAuthProvider.credential(user.email, currentPw);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPw);

      setSuccess(true);
      setCurrentPw("");
      setNewPw("");
      setConfirmPw("");
      setTouched({ current: false, new: false, confirm: false });
      toast.success(t("changePasswordPage.toast.success"));
    } catch (err: any) {
      const errorMap: Record<string, string> = {
        "auth/wrong-password": t("changePasswordPage.errors.wrongPassword"),
        "auth/invalid-credential": t("changePasswordPage.errors.wrongPassword"),
        "auth/too-many-requests": t(
          "changePasswordPage.errors.tooManyRequests",
        ),
        "auth/requires-recent-login": t(
          "changePasswordPage.errors.requiresRecentLogin",
        ),
        "auth/network-request-failed": t(
          "changePasswordPage.errors.networkError",
        ),
        "auth/weak-password": t("changePasswordPage.errors.weakPassword"),
      };
      toast.error(errorMap[err.code] || t("changePasswordPage.errors.generic"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <style>{`
        html, body, #root { background: ${DARK} !important; }
        @keyframes fadeUp  { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
        @keyframes spin    { to { transform:rotate(360deg); } }
        @keyframes popIn   { from { opacity:0; transform:scale(0.88); } to { opacity:1; transform:scale(1); } }
        .pw-save-btn { transition: all 0.25s; }
        .pw-save-btn:hover:not(:disabled) { transform: translateY(-2px) !important; box-shadow: 0 8px 28px rgba(201,169,110,0.38) !important; }
        .req-item { transition: color 0.2s; }
      `}</style>

      <div
        style={{
          minHeight: "100vh",
          background: `radial-gradient(ellipse at 18% 0%, rgba(14,28,46,0.85) 0%, ${DARK} 58%)`,
          paddingTop: "130px",
          paddingBottom: "72px",
        }}
      >
        <div
          style={{
            maxWidth: 620,
            margin: "0 auto",
            padding: "0 16px",
            fontFamily: "'Jost', sans-serif",
          }}
        >
          {/* ── Breadcrumb + heading ── */}
          <div style={{ marginBottom: 28, animation: "fadeUp 0.4s ease both" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 5,
              }}
            >
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 800,
                  letterSpacing: "0.22em",
                  textTransform: "uppercase",
                  color: "rgba(201,169,110,0.45)",
                }}
              >
                {t("changePasswordPage.account")}
              </span>
              <span style={{ color: "rgba(229,224,198,0.15)" }}>✦</span>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 800,
                  letterSpacing: "0.22em",
                  textTransform: "uppercase",
                  color: GOLD,
                }}
              >
                {t("changePasswordPage.breadcrumb")}
              </span>
            </div>
            <h1
              style={{
                margin: 0,
                fontSize: "clamp(20px, 4vw, 28px)",
                fontWeight: 800,
                color: CREAM,
                letterSpacing: "-0.02em",
              }}
            >
              {t("changePasswordPage.heading")}
            </h1>
            <p
              style={{
                margin: "4px 0 0",
                fontSize: 13,
                color: "rgba(229,224,198,0.36)",
                fontWeight: 500,
              }}
            >
              {t("changePasswordPage.subheading")}
            </p>
          </div>

          {/* ── Success state ── */}
          {success && (
            <div
              style={{
                marginBottom: 20,
                padding: "16px 18px",
                borderRadius: 16,
                background: "rgba(94,232,160,0.07)",
                border: "1px solid rgba(94,232,160,0.2)",
                display: "flex",
                alignItems: "center",
                gap: 12,
                animation: "popIn 0.3s ease both",
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: "50%",
                  background: "rgba(94,232,160,0.12)",
                  border: "1px solid rgba(94,232,160,0.25)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <ShieldCheck
                  size={17}
                  style={{ color: "#5ee8a0" }}
                  strokeWidth={2}
                />
              </div>
              <div>
                <p
                  style={{
                    margin: 0,
                    fontSize: 13,
                    fontWeight: 700,
                    color: "#5ee8a0",
                    fontFamily: "'Jost',sans-serif",
                  }}
                >
                  {t("changePasswordPage.success.title")}
                </p>
                <p
                  style={{
                    margin: "2px 0 0",
                    fontSize: 11,
                    color: "rgba(94,232,160,0.6)",
                    fontFamily: "'Jost',sans-serif",
                  }}
                >
                  {t("changePasswordPage.success.subtitle")}
                </p>
              </div>
            </div>
          )}

          {/* ── Main card ── */}
          <div
            style={{
              background: `linear-gradient(160deg, ${NAVY2} 0%, ${DARK} 100%)`,
              border: "1px solid rgba(201,169,110,0.14)",
              borderRadius: 22,
              overflow: "hidden",
              boxShadow:
                "0 20px 60px rgba(0,0,0,0.6), inset 0 1px 0 rgba(201,169,110,0.1)",
              position: "relative",
              animation: "fadeUp 0.4s ease 0.07s both",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                height: 1.5,
                background:
                  "linear-gradient(90deg, transparent, rgba(201,169,110,0.55), transparent)",
              }}
            />

            <form onSubmit={handleSubmit} style={{ padding: "28px 24px 24px" }}>
              {/* Section: Current password */}
              <div style={{ marginBottom: 24 }}>
                <p
                  style={{
                    margin: "0 0 14px",
                    fontSize: 9,
                    fontWeight: 800,
                    letterSpacing: "0.22em",
                    textTransform: "uppercase",
                    color: "rgba(201,169,110,0.4)",
                  }}
                >
                  {t("changePasswordPage.sections.current")}
                </p>
                <PasswordInput
                  id="current"
                  label={t("changePasswordPage.fields.currentLabel")}
                  value={currentPw}
                  onChange={setCurrentPw}
                  onBlur={() => setTouched((p) => ({ ...p, current: true }))}
                  error={currentError}
                  show={showCurrent}
                  onToggle={() => setShowCurrent((v) => !v)}
                  disabled={saving}
                />
              </div>

              <div
                style={{
                  height: 1,
                  background:
                    "linear-gradient(90deg, transparent, rgba(229,224,198,0.07), transparent)",
                  marginBottom: 24,
                }}
              />

              {/* Section: New password */}
              <div style={{ marginBottom: 16 }}>
                <p
                  style={{
                    margin: "0 0 14px",
                    fontSize: 9,
                    fontWeight: 800,
                    letterSpacing: "0.22em",
                    textTransform: "uppercase",
                    color: "rgba(201,169,110,0.4)",
                  }}
                >
                  {t("changePasswordPage.sections.new")}
                </p>
                <PasswordInput
                  id="new"
                  label={t("changePasswordPage.fields.newLabel")}
                  value={newPw}
                  onChange={setNewPw}
                  onBlur={() => setTouched((p) => ({ ...p, new: true }))}
                  error={newError}
                  show={showNew}
                  onToggle={() => setShowNew((v) => !v)}
                  disabled={saving}
                />

                {/* Strength bar */}
                {newPw && (
                  <div style={{ marginTop: 10 }}>
                    <div style={{ display: "flex", gap: 4, marginBottom: 4 }}>
                      {[0, 1, 2, 3].map((i) => (
                        <div
                          key={i}
                          style={{
                            height: 3,
                            flex: 1,
                            borderRadius: 999,
                            background:
                              i < strength.score
                                ? strength.color
                                : "rgba(255,255,255,0.07)",
                            transition: "background 0.3s",
                          }}
                        />
                      ))}
                    </div>
                    <p
                      style={{
                        margin: 0,
                        fontSize: 11,
                        fontWeight: 700,
                        color: strength.color,
                        fontFamily: "'Jost',sans-serif",
                        transition: "color 0.3s",
                      }}
                    >
                      {strength.label}
                    </p>
                  </div>
                )}
              </div>

              {/* Requirements */}
              <div
                style={{
                  marginBottom: 20,
                  padding: "14px 16px",
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(229,224,198,0.05)",
                  borderRadius: 14,
                }}
              >
                <p
                  style={{
                    margin: "0 0 10px",
                    fontSize: 9,
                    fontWeight: 800,
                    letterSpacing: "0.16em",
                    textTransform: "uppercase",
                    color: "rgba(229,224,198,0.28)",
                    fontFamily: "'Jost',sans-serif",
                  }}
                >
                  {t("changePasswordPage.sections.requirements")}
                </p>
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 7 }}
                >
                  {requirements.map((req) => {
                    const met = req.test(newPw);
                    return (
                      <div
                        key={req.label}
                        className="req-item"
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                        }}
                      >
                        <div
                          style={{
                            width: 16,
                            height: 16,
                            borderRadius: "50%",
                            border: `1.5px solid ${met ? "#5ee8a0" : "rgba(229,224,198,0.15)"}`,
                            background: met
                              ? "rgba(94,232,160,0.12)"
                              : "transparent",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                            transition: "all 0.25s",
                          }}
                        >
                          {met && (
                            <Check
                              size={8}
                              style={{ color: "#5ee8a0" }}
                              strokeWidth={3}
                            />
                          )}
                        </div>
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 600,
                            color: met
                              ? "rgba(94,232,160,0.85)"
                              : "rgba(229,224,198,0.35)",
                            fontFamily: "'Jost',sans-serif",
                            transition: "color 0.25s",
                          }}
                        >
                          {req.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Confirm password */}
              <div style={{ marginBottom: 28 }}>
                <PasswordInput
                  id="confirm"
                  label={t("changePasswordPage.fields.confirmLabel")}
                  value={confirmPw}
                  onChange={setConfirmPw}
                  onBlur={() => setTouched((p) => ({ ...p, confirm: true }))}
                  error={confirmError}
                  placeholder={t(
                    "changePasswordPage.fields.confirmPlaceholder",
                  )}
                  show={showConfirm}
                  onToggle={() => setShowConfirm((v) => !v)}
                  disabled={saving}
                />
                {confirmPw && !confirmError && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 5,
                      marginTop: 5,
                    }}
                  >
                    <Check
                      size={11}
                      style={{ color: "#5ee8a0" }}
                      strokeWidth={3}
                    />
                    <span
                      style={{
                        fontSize: 11,
                        color: "#5ee8a0",
                        fontFamily: "'Jost',sans-serif",
                        fontWeight: 600,
                      }}
                    >
                      {t("changePasswordPage.passwordsMatch")}
                    </span>
                  </div>
                )}
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={saving}
                className="pw-save-btn"
                style={{
                  width: "100%",
                  padding: "14px 20px",
                  borderRadius: 999,
                  background: saving
                    ? "rgba(201,169,110,0.4)"
                    : `linear-gradient(135deg, ${GOLD}, ${GOLD2})`,
                  border: "none",
                  color: "#0a0a1a",
                  fontSize: 11,
                  fontWeight: 900,
                  letterSpacing: "0.16em",
                  textTransform: "uppercase",
                  cursor: saving ? "not-allowed" : "pointer",
                  fontFamily: "'Jost',sans-serif",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  boxShadow: saving
                    ? "none"
                    : "0 4px 18px rgba(201,169,110,0.3)",
                }}
              >
                {saving ? (
                  <>
                    <div
                      style={{
                        width: 14,
                        height: 14,
                        borderRadius: "50%",
                        border: "2px solid rgba(10,10,26,0.3)",
                        borderTopColor: "#0a0a1a",
                        animation: "spin 0.7s linear infinite",
                      }}
                    />
                    {t("changePasswordPage.submitting")}
                  </>
                ) : (
                  <>
                    <ShieldCheck size={14} strokeWidth={2.5} />
                    {t("changePasswordPage.submit")}
                  </>
                )}
              </button>
            </form>
          </div>

          {/* ── Security tip ── */}
          <div
            style={{
              marginTop: 16,
              padding: "14px 18px",
              borderRadius: 14,
              background: "rgba(201,169,110,0.04)",
              border: "1px solid rgba(201,169,110,0.1)",
              display: "flex",
              alignItems: "flex-start",
              gap: 10,
              animation: "fadeUp 0.4s ease 0.15s both",
            }}
          >
            <ShieldCheck
              size={14}
              style={{
                color: "rgba(201,169,110,0.5)",
                flexShrink: 0,
                marginTop: 1,
              }}
              strokeWidth={1.8}
            />
            <p
              style={{
                margin: 0,
                fontSize: 11,
                color: "rgba(229,224,198,0.35)",
                fontFamily: "'Jost',sans-serif",
                fontWeight: 500,
                lineHeight: 1.6,
              }}
            >
              {t("changePasswordPage.tip")}
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
