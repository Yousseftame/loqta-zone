import { useState, useRef, useEffect } from "react";
import {
  KeyRound,
  LogOut,
  ChevronDown,
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
  AlertCircle,
  Check,
} from "lucide-react";
import { useLocation } from "react-router-dom";
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
} from "firebase/auth";
import toast from "react-hot-toast";
import { useAuth } from "../../store/AuthContext/AuthContext";
import { validatePassword } from "@/types/validation";

// ── Change Password Modal ─────────────────────────────────────────────────────

const requirements = [
  { label: "At least 8 characters", test: (p: string) => p.length >= 8 },
  { label: "One uppercase letter (A–Z)", test: (p: string) => /[A-Z]/.test(p) },
  { label: "One number (0–9)", test: (p: string) => /[0-9]/.test(p) },
  {
    label: "One special character",
    test: (p: string) => /[^A-Za-z0-9]/.test(p),
  },
];

function getStrength(pw: string) {
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  const levels = [
    { label: "Too weak", color: "#ef4444" },
    { label: "Weak", color: "#f97316" },
    { label: "Fair", color: "#eab308" },
    { label: "Strong", color: "#22c55e" },
    { label: "Strong", color: "#22c55e" },
  ];
  return { score, ...levels[score] };
}

function PwInput({
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
  label: string;
  value: string;
  onChange: (v: string) => void;
  onBlur?: () => void;
  error?: string;
  placeholder?: string;
  show: boolean;
  onToggle: () => void;
  disabled?: boolean;
}) {
  return (
    <div>
      <label
        style={{
          display: "block",
          marginBottom: 5,
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          color: "#64748B",
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
      >
        {label}
      </label>
      <div style={{ position: "relative" }}>
        <div
          style={{
            position: "absolute",
            left: 12,
            top: "50%",
            transform: "translateY(-50%)",
            pointerEvents: "none",
          }}
        >
          <Lock
            size={13}
            style={{ color: error ? "#ef4444" : "#94A3B8" }}
            strokeWidth={2}
          />
        </div>
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          placeholder={placeholder ?? "••••••••"}
          disabled={disabled}
          style={{
            width: "100%",
            padding: "10px 38px 10px 36px",
            background: error ? "#FFF5F5" : "#F8FAFC",
            border: `1.5px solid ${error ? "#FCA5A5" : "#E2E8F0"}`,
            borderRadius: 10,
            color: "#0F172A",
            fontSize: 13,
            fontFamily: "system-ui, -apple-system, sans-serif",
            fontWeight: 500,
            outline: "none",
            transition: "border-color 0.18s, background 0.18s",
            boxSizing: "border-box",
            opacity: disabled ? 0.6 : 1,
            cursor: disabled ? "not-allowed" : "text",
          }}
          onFocus={(e) => {
            if (!error)
              (e.target as HTMLInputElement).style.borderColor = "#2A4863";
          }}
          onBlurCapture={(e) => {
            if (!error)
              (e.target as HTMLInputElement).style.borderColor = "#E2E8F0";
          }}
        />
        <button
          type="button"
          onClick={onToggle}
          tabIndex={-1}
          style={{
            position: "absolute",
            right: 12,
            top: "50%",
            transform: "translateY(-50%)",
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: 0,
            color: "#94A3B8",
            display: "flex",
            alignItems: "center",
          }}
        >
          {show ? <EyeOff size={13} /> : <Eye size={13} />}
        </button>
      </div>
      {error && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            marginTop: 4,
          }}
        >
          <AlertCircle size={11} style={{ color: "#ef4444", flexShrink: 0 }} />
          <p
            style={{
              margin: 0,
              fontSize: 11,
              color: "#ef4444",
              fontFamily: "system-ui, sans-serif",
              fontWeight: 600,
            }}
          >
            {error}
          </p>
        </div>
      )}
    </div>
  );
}

function ChangePasswordModal({ onClose }: { onClose: () => void }) {
  const { user } = useAuth();

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

  const currentError =
    touched.current && !currentPw.trim() ? "Current password is required." : "";
  const newPwResult = validatePassword(newPw);
  const newError = touched.new ? newPwResult.error : "";
  const confirmError = touched.confirm
    ? !confirmPw
      ? "Please confirm your new password."
      : confirmPw !== newPw
        ? "Passwords do not match."
        : ""
    : "";

  const strength = getStrength(newPw);
  const isValid =
    !currentError &&
    !newPwResult.error &&
    confirmPw === newPw &&
    !!currentPw &&
    !!newPw &&
    !!confirmPw;

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
      toast.success("Password changed successfully");
      setTimeout(onClose, 1800);
    } catch (err: any) {
      const msgs: Record<string, string> = {
        "auth/wrong-password": "Current password is incorrect.",
        "auth/invalid-credential": "Current password is incorrect.",
        "auth/too-many-requests": "Too many attempts. Try again later.",
        "auth/requires-recent-login": "Please sign out and back in first.",
        "auth/weak-password": "New password is too weak.",
      };
      toast.error(msgs[err.code] || "Failed to change password.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={saving ? undefined : onClose}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 9998,
          background: "rgba(15,23,42,0.4)",
          backdropFilter: "blur(4px)",
          animation: "cpw-fade 0.18s ease forwards",
        }}
      />

      {/* Modal */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 9999,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          pointerEvents: "none",
        }}
      >
        <div
          style={{
            pointerEvents: "all",
            background: "#ffffff",
            borderRadius: 20,
            boxShadow:
              "0 32px 80px rgba(15,23,42,0.18), 0 0 0 1px rgba(226,232,240,0.9)",
            width: "100%",
            maxWidth: 460,
            margin: "0 16px",
            overflow: "hidden",
            animation:
              "cpw-slide 0.22s cubic-bezier(0.34,1.56,0.64,1) forwards",
            maxHeight: "90vh",
            overflowY: "auto",
          }}
        >
          {/* Accent bar */}
          <div
            style={{
              height: 4,
              background: "linear-gradient(90deg, #2A4863 0%, #4A90BE 100%)",
            }}
          />

          <div style={{ padding: "28px 28px 24px" }}>
            {/* Header */}
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                marginBottom: 22,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    background:
                      "linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%)",
                    border: "1px solid #BFDBFE",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <KeyRound
                    size={19}
                    style={{ color: "#2A4863" }}
                    strokeWidth={2}
                  />
                </div>
                <div>
                  <h2
                    style={{
                      margin: 0,
                      fontSize: 17,
                      fontWeight: 700,
                      color: "#0F172A",
                      letterSpacing: "-0.02em",
                      fontFamily: "system-ui, -apple-system, sans-serif",
                    }}
                  >
                    Change Password
                  </h2>
                  <p
                    style={{
                      margin: "2px 0 0",
                      fontSize: 12,
                      color: "#64748B",
                      fontFamily: "system-ui, sans-serif",
                    }}
                  >
                    Update your admin account password
                  </p>
                </div>
              </div>
              {!saving && (
                <button
                  onClick={onClose}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "#94A3B8",
                    padding: 4,
                    borderRadius: 6,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    transition: "all 0.15s",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background =
                      "#F1F5F9";
                    (e.currentTarget as HTMLButtonElement).style.color =
                      "#475569";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background =
                      "none";
                    (e.currentTarget as HTMLButtonElement).style.color =
                      "#94A3B8";
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M18 6L6 18M6 6l12 12"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                </button>
              )}
            </div>

            {/* Success banner */}
            {success && (
              <div
                style={{
                  marginBottom: 18,
                  padding: "12px 16px",
                  background: "#F0FDF4",
                  border: "1px solid #BBF7D0",
                  borderRadius: 10,
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  animation: "cpw-fade 0.25s ease",
                }}
              >
                <ShieldCheck
                  size={16}
                  style={{ color: "#16A34A", flexShrink: 0 }}
                  strokeWidth={2}
                />
                <p
                  style={{
                    margin: 0,
                    fontSize: 13,
                    fontWeight: 600,
                    color: "#15803D",
                    fontFamily: "system-ui, sans-serif",
                  }}
                >
                  Password updated successfully!
                </p>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              {/* Divider label */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 16,
                }}
              >
                <div style={{ height: 1, flex: 1, background: "#E2E8F0" }} />
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: "#94A3B8",
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    fontFamily: "system-ui, sans-serif",
                  }}
                >
                  Current
                </span>
                <div style={{ height: 1, flex: 1, background: "#E2E8F0" }} />
              </div>

              <div style={{ marginBottom: 18 }}>
                <PwInput
                  label="Current Password"
                  value={currentPw}
                  onChange={setCurrentPw}
                  onBlur={() => setTouched((p) => ({ ...p, current: true }))}
                  error={currentError}
                  show={showCurrent}
                  onToggle={() => setShowCurrent((v) => !v)}
                  disabled={saving}
                />
              </div>

              {/* Divider label */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 16,
                }}
              >
                <div style={{ height: 1, flex: 1, background: "#E2E8F0" }} />
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: "#94A3B8",
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    fontFamily: "system-ui, sans-serif",
                  }}
                >
                  New Password
                </span>
                <div style={{ height: 1, flex: 1, background: "#E2E8F0" }} />
              </div>

              <div style={{ marginBottom: 10 }}>
                <PwInput
                  label="New Password"
                  value={newPw}
                  onChange={setNewPw}
                  onBlur={() => setTouched((p) => ({ ...p, new: true }))}
                  error={newError}
                  show={showNew}
                  onToggle={() => setShowNew((v) => !v)}
                  disabled={saving}
                />
              </div>

              {/* Strength bar */}
              {newPw && (
                <div style={{ marginBottom: 14 }}>
                  <div style={{ display: "flex", gap: 3, marginBottom: 4 }}>
                    {[0, 1, 2, 3].map((i) => (
                      <div
                        key={i}
                        style={{
                          height: 3,
                          flex: 1,
                          borderRadius: 999,
                          background:
                            i < strength.score ? strength.color : "#E2E8F0",
                          transition: "background 0.25s",
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
                      fontFamily: "system-ui, sans-serif",
                    }}
                  >
                    {strength.label}
                  </p>
                </div>
              )}

              {/* Requirements */}
              <div
                style={{
                  marginBottom: 14,
                  padding: "12px 14px",
                  background: "#F8FAFC",
                  border: "1px solid #E2E8F0",
                  borderRadius: 10,
                }}
              >
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 6 }}
                >
                  {requirements.map((req) => {
                    const met = req.test(newPw);
                    return (
                      <div
                        key={req.label}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 7,
                        }}
                      >
                        <div
                          style={{
                            width: 15,
                            height: 15,
                            borderRadius: "50%",
                            border: `1.5px solid ${met ? "#22c55e" : "#CBD5E1"}`,
                            background: met
                              ? "rgba(34,197,94,0.1)"
                              : "transparent",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                            transition: "all 0.2s",
                          }}
                        >
                          {met && (
                            <Check
                              size={8}
                              style={{ color: "#22c55e" }}
                              strokeWidth={3}
                            />
                          )}
                        </div>
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 500,
                            color: met ? "#15803D" : "#94A3B8",
                            fontFamily: "system-ui, sans-serif",
                            transition: "color 0.2s",
                          }}
                        >
                          {req.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div style={{ marginBottom: 22 }}>
                <PwInput
                  label="Confirm New Password"
                  value={confirmPw}
                  onChange={setConfirmPw}
                  onBlur={() => setTouched((p) => ({ ...p, confirm: true }))}
                  error={confirmError}
                  placeholder="Re-enter new password"
                  show={showConfirm}
                  onToggle={() => setShowConfirm((v) => !v)}
                  disabled={saving}
                />
                {confirmPw && !confirmError && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      marginTop: 4,
                    }}
                  >
                    <Check
                      size={11}
                      style={{ color: "#22c55e" }}
                      strokeWidth={3}
                    />
                    <span
                      style={{
                        fontSize: 11,
                        color: "#15803D",
                        fontFamily: "system-ui, sans-serif",
                        fontWeight: 600,
                      }}
                    >
                      Passwords match
                    </span>
                  </div>
                )}
              </div>

              {/* Buttons */}
              <div style={{ display: "flex", gap: 10 }}>
                <button
                  type="button"
                  onClick={onClose}
                  disabled={saving}
                  style={{
                    flex: 1,
                    padding: "11px 0",
                    borderRadius: 10,
                    border: "1.5px solid #E2E8F0",
                    background: "#F8FAFC",
                    color: "#475569",
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: saving ? "not-allowed" : "pointer",
                    fontFamily: "system-ui, -apple-system, sans-serif",
                    transition: "all 0.18s",
                    opacity: saving ? 0.5 : 1,
                  }}
                  onMouseEnter={(e) => {
                    if (!saving) {
                      (e.currentTarget as HTMLButtonElement).style.background =
                        "#F1F5F9";
                      (e.currentTarget as HTMLButtonElement).style.borderColor =
                        "#CBD5E1";
                    }
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background =
                      "#F8FAFC";
                    (e.currentTarget as HTMLButtonElement).style.borderColor =
                      "#E2E8F0";
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  style={{
                    flex: 1,
                    padding: "11px 0",
                    borderRadius: 10,
                    border: "none",
                    background: saving
                      ? "rgba(42,72,99,0.5)"
                      : "linear-gradient(135deg, #2A4863 0%, #1e3652 100%)",
                    color: "#ffffff",
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: saving ? "not-allowed" : "pointer",
                    fontFamily: "system-ui, -apple-system, sans-serif",
                    boxShadow: saving
                      ? "none"
                      : "0 4px 14px rgba(42,72,99,0.35)",
                    transition: "all 0.18s",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 7,
                  }}
                  onMouseEnter={(e) => {
                    if (!saving) {
                      (e.currentTarget as HTMLButtonElement).style.transform =
                        "translateY(-1px)";
                      (e.currentTarget as HTMLButtonElement).style.boxShadow =
                        "0 6px 20px rgba(42,72,99,0.45)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.transform = "";
                    (e.currentTarget as HTMLButtonElement).style.boxShadow =
                      saving ? "none" : "0 4px 14px rgba(42,72,99,0.35)";
                  }}
                >
                  {saving ? (
                    <>
                      <svg
                        width="13"
                        height="13"
                        viewBox="0 0 24 24"
                        fill="none"
                        style={{ animation: "cpw-spin 0.7s linear infinite" }}
                      >
                        <circle
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="rgba(255,255,255,0.3)"
                          strokeWidth="2.5"
                        />
                        <path
                          d="M12 2a10 10 0 0 1 10 10"
                          stroke="white"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                        />
                      </svg>
                      Updating…
                    </>
                  ) : (
                    <>
                      <ShieldCheck size={13} strokeWidth={2.5} />
                      Update Password
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes cpw-fade  { from { opacity: 0 } to { opacity: 1 } }
        @keyframes cpw-slide { from { opacity: 0; transform: translateY(14px) scale(0.97) } to { opacity: 1; transform: translateY(0) scale(1) } }
        @keyframes cpw-spin  { to { transform: rotate(360deg) } }
      `}</style>
    </>
  );
}

// ── AdminNavbar ───────────────────────────────────────────────────────────────

const AdminNavbar = () => {
  const { user, role } = useAuth();
  const location = useLocation();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [showPwModal, setShowPwModal] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const adminName = user?.displayName || user?.email?.split("@")[0] || "Admin";

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const getPageTitle = () => {
    if (location.pathname.includes("Dashboard")) return "Dashboard";
    if (location.pathname.includes("Products")) return "Products";
    if (location.pathname.includes("categories")) return "Categories";
    if (location.pathname.includes("vouchers")) return "Vouchers";
    if (location.pathname.includes("auctionRequests"))
      return "Auction Requests";
    if (location.pathname.includes("contacts")) return "Contacts";
    if (location.pathname.includes("feedback")) return "Feedback";
    if (location.pathname.includes("lastoffers")) return "Last Offer";
    if (location.pathname.includes("bids")) return "Bids";
    if (location.pathname.includes("participants"))
      return "Auction Participants";
    if (location.pathname.includes("users")) return "Users";
    if (location.pathname.includes("admins")) return "Admins";
    return "Dashboard";
  };

  return (
    <>
      {showPwModal && (
        <ChangePasswordModal onClose={() => setShowPwModal(false)} />
      )}

      {/* On mobile: pl-16 to make room for the hamburger button (fixed at left-4) */}
      <header className="sticky top-0 z-30 h-16 md:h-20 pl-16 pr-4 md:px-10 flex items-center justify-between bg-white/80 backdrop-blur-md border-b border-[#E2E8F0] shadow-sm">
        {/* Left — Page Title */}
        <h1 className="text-base md:text-xl font-semibold text-[#2A4863] tracking-wide truncate">
          {getPageTitle()}
        </h1>

        {/* Right — Profile dropdown */}
        <div ref={dropdownRef} style={{ position: "relative" }}>
          <button
            onClick={() => setDropdownOpen((v) => !v)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              background: dropdownOpen ? "#EFF6FF" : "transparent",
              border: `1px solid ${dropdownOpen ? "#BFDBFE" : "transparent"}`,
              borderRadius: 12,
              padding: "6px 12px 6px 6px",
              cursor: "pointer",
              transition: "all 0.18s",
            }}
            onMouseEnter={(e) => {
              if (!dropdownOpen)
                (e.currentTarget as HTMLButtonElement).style.background =
                  "#F8FAFC";
            }}
            onMouseLeave={(e) => {
              if (!dropdownOpen)
                (e.currentTarget as HTMLButtonElement).style.background =
                  "transparent";
            }}
          >
            {/* Avatar */}
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: "50%",
                background: "linear-gradient(135deg, #DBEAFE 0%, #BFDBFE 100%)",
                border: "2px solid #93C5FD",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#1E40AF",
                fontWeight: 700,
                fontSize: 14,
                fontFamily: "system-ui, -apple-system, sans-serif",
                flexShrink: 0,
              }}
            >
              {adminName.charAt(0).toUpperCase()}
            </div>

            {/* Name + role */}
            <div
              style={{
                textAlign: "left",
                display: "flex",
                flexDirection: "column",
              }}
              className="hidden sm:flex"
            >
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: "#0F172A",
                  lineHeight: 1.2,
                  fontFamily: "system-ui, sans-serif",
                }}
              >
                {adminName}
              </span>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  color: "#64748B",
                  letterSpacing: "0.05em",
                  textTransform: "uppercase",
                  fontFamily: "system-ui, sans-serif",
                }}
              >
                {role === "superAdmin" ? "Super Admin" : "Administrator"}
              </span>
            </div>

            {/* Chevron */}
            <ChevronDown
              size={14}
              style={{
                color: "#94A3B8",
                transform: dropdownOpen ? "rotate(180deg)" : "rotate(0deg)",
                transition: "transform 0.2s ease",
              }}
            />
          </button>

          {/* Dropdown */}
          {dropdownOpen && (
            <div
              style={{
                position: "absolute",
                right: 0,
                top: "calc(100% + 8px)",
                width: 210,
                background: "#ffffff",
                border: "1px solid #E2E8F0",
                borderRadius: 14,
                boxShadow:
                  "0 16px 48px rgba(15,23,42,0.12), 0 0 0 1px rgba(226,232,240,0.6)",
                overflow: "hidden",
                animation:
                  "cpw-slide 0.18s cubic-bezier(0.34,1.56,0.64,1) forwards",
                zIndex: 100,
              }}
            >
              {/* User info header */}
              <div
                style={{
                  padding: "14px 16px 12px",
                  borderBottom: "1px solid #F1F5F9",
                  background: "#F8FAFC",
                }}
              >
                <p
                  style={{
                    margin: 0,
                    fontSize: 12,
                    fontWeight: 600,
                    color: "#0F172A",
                    fontFamily: "system-ui, sans-serif",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {user?.email}
                </p>
                <p
                  style={{
                    margin: "2px 0 0",
                    fontSize: 10,
                    fontWeight: 700,
                    color: "#2A4863",
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    fontFamily: "system-ui, sans-serif",
                  }}
                >
                  {role === "superAdmin" ? "Super Admin" : "Administrator"}
                </p>
              </div>

              {/* Menu items */}
              <div style={{ padding: "6px" }}>
                <button
                  onClick={() => {
                    setDropdownOpen(false);
                    setShowPwModal(true);
                  }}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "9px 12px",
                    borderRadius: 9,
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    transition: "background 0.15s",
                    textAlign: "left",
                  }}
                  onMouseEnter={(e) =>
                    ((e.currentTarget as HTMLButtonElement).style.background =
                      "#EFF6FF")
                  }
                  onMouseLeave={(e) =>
                    ((e.currentTarget as HTMLButtonElement).style.background =
                      "none")
                  }
                >
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 7,
                      background: "#EFF6FF",
                      border: "1px solid #DBEAFE",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <KeyRound
                      size={13}
                      style={{ color: "#2A4863" }}
                      strokeWidth={2}
                    />
                  </div>
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 500,
                      color: "#334155",
                      fontFamily: "system-ui, sans-serif",
                    }}
                  >
                    Change Password
                  </span>
                </button>
              </div>
            </div>
          )}
        </div>
      </header>
    </>
  );
};

export default AdminNavbar;
