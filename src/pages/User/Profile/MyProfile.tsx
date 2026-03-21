/**
 * src/pages/User/Profile/MyProfile.tsx
 * Localized — uses i18next via useTranslation()
 */

import { useState, useEffect, useRef } from "react";
import {
  doc,
  updateDoc,
  serverTimestamp,
  onSnapshot,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { updateProfile } from "firebase/auth";
import {
  Camera,
  Mail,
  Phone,
  User,
  Shield,
  Trophy,
  Gavel,
  Wallet,
  Save,
  X,
  Check,
  AlertCircle,
  Lock,
  Calendar,
  Edit3,
} from "lucide-react";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import { db, storage } from "@/firebase/firebase";
import { useAuth } from "@/store/AuthContext/AuthContext";

// ─── Design tokens ─────────────────────────────────────────────────────────
const GOLD = "#c9a96e";
const GOLD2 = "#b8944e";
const CREAM = "rgb(229,224,198)";
const DARK = "#080d1a";
const NAVY = "#0e1c2e";

// ─── Types ─────────────────────────────────────────────────────────────────
interface UserProfile {
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  phone: string;
  profileImage: string | null;
  role: string;
  totalBids: number;
  totalWins: number;
  walletBalance: number;
  verified: boolean;
  isBlocked: boolean;
  createdAt: any;
}

// ─── Helpers ────────────────────────────────────────────────────────────────
function formatDate(ts: any, locale: string): string {
  if (!ts) return "—";
  const d = ts?.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString(locale === "ar" ? "ar-EG" : "en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function getRoleColor(role: string) {
  if (role === "superAdmin")
    return {
      color: "#c9a96e",
      bg: "rgba(201,169,110,0.15)",
      border: "rgba(201,169,110,0.3)",
    };
  if (role === "admin")
    return {
      color: "#64a0ff",
      bg: "rgba(100,160,255,0.1)",
      border: "rgba(100,160,255,0.25)",
    };
  return {
    color: "rgba(229,224,198,0.55)",
    bg: "rgba(255,255,255,0.05)",
    border: "rgba(255,255,255,0.1)",
  };
}

// ─── Stat Card ──────────────────────────────────────────────────────────────
const StatCard = ({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: any;
  label: string;
  value: number | string;
  color: string;
}) => (
  <div
    style={{
      background: `linear-gradient(135deg, ${NAVY} 0%, ${DARK} 100%)`,
      border: "1px solid rgba(201,169,110,0.13)",
      borderRadius: 18,
      padding: "20px 18px",
      display: "flex",
      flexDirection: "column",
      gap: 10,
      position: "relative",
      overflow: "hidden",
      transition: "transform 0.25s, box-shadow 0.25s",
    }}
    onMouseEnter={(e) => {
      (e.currentTarget as HTMLDivElement).style.transform = "translateY(-3px)";
      (e.currentTarget as HTMLDivElement).style.boxShadow =
        "0 12px 40px rgba(0,0,0,0.5), 0 0 0 1px rgba(201,169,110,0.18)";
    }}
    onMouseLeave={(e) => {
      (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)";
      (e.currentTarget as HTMLDivElement).style.boxShadow = "none";
    }}
  >
    <div
      style={{
        position: "absolute",
        top: -30,
        right: -30,
        width: 80,
        height: 80,
        borderRadius: "50%",
        background: `radial-gradient(circle, ${color}22 0%, transparent 70%)`,
        pointerEvents: "none",
      }}
    />
    <div
      style={{
        width: 40,
        height: 40,
        borderRadius: 12,
        background: `${color}18`,
        border: `1px solid ${color}33`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Icon size={17} style={{ color }} strokeWidth={1.8} />
    </div>
    <div>
      <p
        style={{
          margin: 0,
          fontSize: 22,
          fontWeight: 800,
          color: CREAM,
          fontFamily: "'Jost',sans-serif",
          lineHeight: 1,
        }}
      >
        {value}
      </p>
      <p
        style={{
          margin: "4px 0 0",
          fontSize: 10,
          fontWeight: 700,
          color: "rgba(229,224,198,0.4)",
          fontFamily: "'Jost',sans-serif",
          letterSpacing: "0.1em",
          textTransform: "uppercase",
        }}
      >
        {label}
      </p>
    </div>
  </div>
);

// ─── Field Row ──────────────────────────────────────────────────────────────
const FieldRow = ({
  icon: Icon,
  label,
  value,
  locked,
  lockedLabel,
  editing,
  inputValue,
  onChange,
  placeholder,
  type = "text",
}: {
  icon: any;
  label: string;
  value: string;
  locked?: boolean;
  lockedLabel?: string;
  editing?: boolean;
  inputValue?: string;
  onChange?: (v: string) => void;
  placeholder?: string;
  type?: string;
}) => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      gap: 12,
      padding: "14px 16px",
      background: locked
        ? "rgba(255,255,255,0.015)"
        : editing
          ? "rgba(201,169,110,0.04)"
          : "transparent",
      borderRadius: 14,
      border: `1px solid ${locked ? "rgba(255,255,255,0.04)" : editing ? "rgba(201,169,110,0.2)" : "rgba(255,255,255,0.05)"}`,
      transition: "all 0.25s",
    }}
  >
    <div
      style={{
        width: 36,
        height: 36,
        borderRadius: 10,
        flexShrink: 0,
        background: locked
          ? "rgba(255,255,255,0.04)"
          : "rgba(201,169,110,0.09)",
        border: `1px solid ${locked ? "rgba(255,255,255,0.06)" : "rgba(201,169,110,0.18)"}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Icon
        size={14}
        style={{ color: locked ? "rgba(229,224,198,0.25)" : GOLD }}
        strokeWidth={1.8}
      />
    </div>
    <div style={{ flex: 1, minWidth: 0 }}>
      <p
        style={{
          margin: 0,
          fontSize: 10,
          fontWeight: 700,
          color: "rgba(229,224,198,0.35)",
          fontFamily: "'Jost',sans-serif",
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          marginBottom: 3,
        }}
      >
        {label}{" "}
        {locked && (
          <Lock
            size={8}
            style={{
              display: "inline",
              verticalAlign: "middle",
              marginLeft: 3,
              opacity: 0.5,
            }}
          />
        )}
      </p>
      {editing && !locked && onChange ? (
        <input
          type={type}
          value={inputValue ?? ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          style={{
            width: "100%",
            background: "none",
            border: "none",
            outline: "none",
            color: CREAM,
            fontSize: 14,
            fontWeight: 600,
            fontFamily: "'Jost',sans-serif",
            padding: 0,
          }}
        />
      ) : (
        <p
          style={{
            margin: 0,
            fontSize: 14,
            fontWeight: 600,
            color: locked ? "rgba(229,224,198,0.35)" : CREAM,
            fontFamily: "'Jost',sans-serif",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {value || "—"}
        </p>
      )}
    </div>
    {locked && (
      <span
        style={{
          fontSize: 9,
          fontWeight: 800,
          letterSpacing: "0.1em",
          color: "rgba(229,224,198,0.2)",
          fontFamily: "'Jost',sans-serif",
          textTransform: "uppercase",
          flexShrink: 0,
        }}
      >
        {lockedLabel}
      </span>
    )}
  </div>
);

// ─── Main Component ─────────────────────────────────────────────────────────
export default function MyProfile() {
  const { user } = useAuth();
  const { t, i18n } = useTranslation();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingImg, setUploadingImg] = useState(false);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [newImage, setNewImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Role label ──────────────────────────────────────────────────────────
  const getRoleLabel = (role: string) => {
    const colors = getRoleColor(role);
    if (role === "superAdmin")
      return { label: t("common.superAdmin"), ...colors };
    if (role === "admin") return { label: t("common.admin"), ...colors };
    return { label: t("common.member"), ...colors };
  };

  // ── Real-time Firestore subscription ────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    setLoading(true);
    const unsub = onSnapshot(
      doc(db, "users", user.uid),
      (snap) => {
        if (snap.exists()) {
          const d = snap.data() as UserProfile;
          setProfile(d);
          setFirstName((prev) => (editing ? prev : d.firstName || ""));
          setLastName((prev) => (editing ? prev : d.lastName || ""));
          setPhone((prev) => (editing ? prev : d.phone || ""));
        }
        setLoading(false);
      },
      (err) => {
        console.error("[MyProfile] snapshot error:", err);
        toast.error(t("profilePage.toast.loadError"));
        setLoading(false);
      },
    );
    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const handleImageChange = (file: File | null) => {
    setNewImage(file);
    setPreviewUrl(file ? URL.createObjectURL(file) : null);
  };

  const cancelEdit = () => {
    if (!profile) return;
    setFirstName(profile.firstName || "");
    setLastName(profile.lastName || "");
    setPhone(profile.phone || "");
    setNewImage(null);
    setPreviewUrl(null);
    setEditing(false);
  };

  const handleSave = async () => {
    if (!user || !profile) return;
    setSaving(true);
    try {
      let photoURL = profile.profileImage;
      if (newImage) {
        setUploadingImg(true);
        const storageRef = ref(storage, `profileImages/${user.uid}`);
        await uploadBytes(storageRef, newImage);
        photoURL = await getDownloadURL(storageRef);
        setUploadingImg(false);
      }
      const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();
      await updateDoc(doc(db, "users", user.uid), {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        fullName,
        phone: phone.trim(),
        profileImage: photoURL ?? null,
        updatedAt: serverTimestamp(),
      });
      await updateProfile(user, {
        displayName: fullName,
        ...(photoURL && photoURL !== profile.profileImage && { photoURL }),
      });
      setNewImage(null);
      setPreviewUrl(null);
      setEditing(false);
      toast.success(t("profilePage.toast.success"));
    } catch (err: any) {
      toast.error(t("profilePage.toast.error"));
      console.error(err);
    } finally {
      setSaving(false);
      setUploadingImg(false);
    }
  };

  const avatarSrc = previewUrl || profile?.profileImage;
  const initials = profile
    ? `${profile.firstName?.[0] ?? ""}${profile.lastName?.[0] ?? ""}`.toUpperCase()
    : "?";
  const roleInfo = getRoleLabel(profile?.role ?? "user");

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading)
    return (
      <div
        style={{
          minHeight: "100vh",
          background: DARK,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: "50%",
              border: `2px solid rgba(201,169,110,0.2)`,
              borderTopColor: GOLD,
              animation: "spin 0.9s linear infinite",
              margin: "0 auto 16px",
            }}
          />
          <p
            style={{
              color: "rgba(229,224,198,0.4)",
              fontFamily: "'Jost',sans-serif",
              fontSize: 13,
              letterSpacing: "0.1em",
            }}
          >
            {t("common.loading")}
          </p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );

  if (!profile) return null;

  return (
    <>
      <style>{`
        html, body, #root { background: ${DARK} !important; }
        @keyframes fadeUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
        @keyframes spin   { to { transform:rotate(360deg); } }
        .profile-save-btn:hover   { transform:translateY(-2px) !important; box-shadow:0 8px 28px rgba(201,169,110,0.4) !important; }
        .profile-cancel-btn:hover { background:rgba(255,80,80,0.1) !important; border-color:rgba(255,80,80,0.3) !important; color:#ff6464 !important; }
        .profile-edit-btn:hover   { background:rgba(201,169,110,0.12) !important; border-color:rgba(201,169,110,0.4) !important; color:#c9a96e !important; }
        .avatar-upload-overlay { opacity:0; transition:opacity 0.25s; }
        .avatar-wrap:hover .avatar-upload-overlay { opacity:1; }
        .profile-header-flex { display:flex; align-items:center; gap:24px; flex-wrap:wrap; }
        .profile-name-row { display:flex; align-items:center; gap:10px; flex-wrap:wrap; margin-bottom:6px; }
        .profile-name-inputs { display:flex; gap:10px; flex-wrap:wrap; }
        .profile-name-input {
          background:rgba(255,255,255,0.05); border:1px solid rgba(201,169,110,0.25);
          border-radius:10px; padding:8px 14px; color:${CREAM}; font-size:17px;
          font-weight:800; font-family:'Jost',sans-serif; outline:none; width:130px; min-width:0;
        }
        .stats-grid   { display:grid; grid-template-columns:repeat(4,1fr); gap:14px; margin-bottom:18px; }
        .account-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:14px; }
        @media (max-width:860px) { .stats-grid { grid-template-columns:repeat(2,1fr); } .account-grid { grid-template-columns:repeat(2,1fr); } }
        @media (max-width:600px) {
          .profile-header-flex { flex-direction:column; align-items:flex-start; gap:14px; }
          .profile-name-input  { width:100%; flex:1 1 110px; font-size:15px; }
          .profile-name-inputs { width:100%; }
          .stats-grid          { grid-template-columns:repeat(2,1fr); gap:10px; }
          .account-grid        { grid-template-columns:repeat(2,1fr); gap:10px; }
          .profile-action-btns { align-self:flex-start; }
        }
        @media (max-width:380px) { .account-grid { grid-template-columns:1fr; } }
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
            maxWidth: 890,
            margin: "0 auto",
            padding: "0 16px",
            fontFamily: "'Jost', sans-serif",
            animation: "fadeUp 0.45s ease both",
          }}
        >
          {/* ── Breadcrumb + heading ── */}
          <div style={{ marginBottom: 26 }}>
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
                {t("profilePage.account")}
              </span>
              <span style={{ color: "rgba(229,224,198,0.15)", fontSize: 11 }}>
                ✦
              </span>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 800,
                  letterSpacing: "0.22em",
                  textTransform: "uppercase",
                  color: GOLD,
                }}
              >
                {t("profilePage.breadcrumb")}
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
              {t("profilePage.heading")}
            </h1>
            <p
              style={{
                margin: "4px 0 0",
                fontSize: 13,
                color: "rgba(229,224,198,0.36)",
                fontWeight: 500,
              }}
            >
              {t("profilePage.subheading")}
            </p>
          </div>

          {/* ══ MAIN CARD ══════════════════════════════════════════════════ */}
          <div
            style={{
              background: `linear-gradient(160deg, ${NAVY} 0%, ${DARK} 100%)`,
              border: "1px solid rgba(201,169,110,0.14)",
              borderRadius: 22,
              overflow: "hidden",
              boxShadow:
                "0 20px 60px rgba(0,0,0,0.6), inset 0 1px 0 rgba(201,169,110,0.1)",
              marginBottom: 18,
              position: "relative",
              animation: "fadeUp 0.45s ease 0.07s both",
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

            {/* Header */}
            <div
              style={{
                padding: "26px 22px 20px",
                borderBottom: "1px solid rgba(229,224,198,0.06)",
              }}
            >
              <div className="profile-header-flex">
                {/* Avatar */}
                <div
                  className="avatar-wrap"
                  style={{ position: "relative", flexShrink: 0 }}
                >
                  <div
                    style={{
                      width: 86,
                      height: 86,
                      borderRadius: "50%",
                      background: avatarSrc
                        ? "transparent"
                        : `linear-gradient(135deg, #1a3a5c, ${GOLD2})`,
                      border: `3px solid rgba(201,169,110,0.4)`,
                      boxShadow: `0 0 0 5px rgba(201,169,110,0.07), 0 8px 24px rgba(0,0,0,0.5)`,
                      overflow: "hidden",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: editing ? "pointer" : "default",
                      transition: "border-color 0.25s",
                      position: "relative",
                    }}
                    onClick={() => editing && fileInputRef.current?.click()}
                  >
                    {avatarSrc ? (
                      <img
                        src={avatarSrc}
                        alt="Profile"
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                        }}
                      />
                    ) : (
                      <span
                        style={{ fontSize: 26, fontWeight: 800, color: "#fff" }}
                      >
                        {initials}
                      </span>
                    )}
                    {editing && (
                      <div
                        className="avatar-upload-overlay"
                        style={{
                          position: "absolute",
                          inset: 0,
                          borderRadius: "50%",
                          background: "rgba(0,0,0,0.6)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexDirection: "column",
                          gap: 3,
                        }}
                      >
                        <Camera size={18} style={{ color: GOLD }} />
                        <span
                          style={{
                            fontSize: 8,
                            fontWeight: 800,
                            color: GOLD,
                            letterSpacing: "0.08em",
                          }}
                        >
                          {t("profilePage.avatar.change")}
                        </span>
                      </div>
                    )}
                  </div>

                  {!profile.isBlocked && (
                    <div
                      title={
                        profile.verified
                          ? t("profilePage.accountInfo.verified")
                          : t("profilePage.accountInfo.unverified")
                      }
                      style={{
                        position: "absolute",
                        bottom: 3,
                        right: 3,
                        width: 18,
                        height: 18,
                        borderRadius: "50%",
                        background: profile.verified
                          ? "rgba(229,224,198,0.2)"
                          : "#22c55e",
                        border: "2.5px solid #080d1a",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {profile.verified && (
                        <Check
                          size={8}
                          style={{ color: "#fff" }}
                          strokeWidth={3}
                        />
                      )}
                    </div>
                  )}

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    style={{ display: "none" }}
                    onChange={(e) =>
                      handleImageChange(e.target.files?.[0] ?? null)
                    }
                  />
                </div>

                {/* Name + meta */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="profile-name-row">
                    {editing ? (
                      <div className="profile-name-inputs">
                        <input
                          className="profile-name-input"
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                          placeholder={t("profilePage.fields.firstName")}
                        />
                        <input
                          className="profile-name-input"
                          value={lastName}
                          onChange={(e) => setLastName(e.target.value)}
                          placeholder={t("profilePage.fields.lastName")}
                        />
                      </div>
                    ) : (
                      <h2
                        style={{
                          margin: 0,
                          fontSize: "clamp(16px, 3vw, 22px)",
                          fontWeight: 800,
                          color: CREAM,
                          letterSpacing: "-0.01em",
                        }}
                      >
                        {profile.fullName || "—"}
                      </h2>
                    )}
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 5,
                        padding: "3px 9px",
                        borderRadius: 999,
                        background: roleInfo.bg,
                        border: `1px solid ${roleInfo.border}`,
                        fontSize: 9,
                        fontWeight: 900,
                        letterSpacing: "0.14em",
                        textTransform: "uppercase",
                        color: roleInfo.color,
                        flexShrink: 0,
                      }}
                    >
                      <span
                        style={{
                          width: 5,
                          height: 5,
                          borderRadius: "50%",
                          background: roleInfo.color,
                          boxShadow: `0 0 6px ${roleInfo.color}`,
                        }}
                      />
                      {roleInfo.label}
                    </span>
                  </div>
                  <p
                    style={{
                      margin: 0,
                      fontSize: 12,
                      color: "rgba(229,224,198,0.38)",
                      fontWeight: 500,
                    }}
                  >
                    {profile.email}
                  </p>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 5,
                      marginTop: 6,
                    }}
                  >
                    <Calendar
                      size={11}
                      style={{ color: "rgba(229,224,198,0.22)" }}
                    />
                    <span
                      style={{
                        fontSize: 10,
                        color: "rgba(229,224,198,0.28)",
                        fontWeight: 600,
                      }}
                    >
                      {t("profilePage.memberSince", {
                        date: formatDate(profile.createdAt, i18n.language),
                      })}
                    </span>
                  </div>
                </div>

                {/* Action buttons */}
                <div
                  className="profile-action-btns"
                  style={{
                    display: "flex",
                    gap: 8,
                    flexShrink: 0,
                    alignSelf: "flex-start",
                  }}
                >
                  {editing ? (
                    <>
                      <button
                        className="profile-cancel-btn"
                        onClick={cancelEdit}
                        disabled={saving}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          padding: "9px 16px",
                          borderRadius: 999,
                          background: "rgba(255,80,80,0.06)",
                          border: "1px solid rgba(255,80,80,0.15)",
                          color: "rgba(255,120,120,0.7)",
                          fontSize: 10,
                          fontWeight: 800,
                          letterSpacing: "0.12em",
                          textTransform: "uppercase",
                          cursor: "pointer",
                          fontFamily: "'Jost',sans-serif",
                          transition: "all 0.22s",
                        }}
                      >
                        <X size={12} strokeWidth={2.5} />{" "}
                        {t("profilePage.cancel")}
                      </button>
                      <button
                        className="profile-save-btn"
                        onClick={handleSave}
                        disabled={saving}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          padding: "9px 20px",
                          borderRadius: 999,
                          background: saving
                            ? "rgba(201,169,110,0.4)"
                            : `linear-gradient(135deg, ${GOLD}, ${GOLD2})`,
                          border: "none",
                          color: "#0a0a1a",
                          fontSize: 10,
                          fontWeight: 900,
                          letterSpacing: "0.12em",
                          textTransform: "uppercase",
                          cursor: saving ? "not-allowed" : "pointer",
                          fontFamily: "'Jost',sans-serif",
                          transition: "all 0.25s",
                          boxShadow: "0 4px 16px rgba(201,169,110,0.28)",
                        }}
                      >
                        {saving ? (
                          <>
                            <div
                              style={{
                                width: 12,
                                height: 12,
                                borderRadius: "50%",
                                border: "2px solid rgba(10,10,26,0.3)",
                                borderTopColor: "#0a0a1a",
                                animation: "spin 0.7s linear infinite",
                              }}
                            />
                            {t("profilePage.saving")}
                          </>
                        ) : (
                          <>
                            <Save size={12} strokeWidth={2.5} />{" "}
                            {t("profilePage.saveChanges")}
                          </>
                        )}
                      </button>
                    </>
                  ) : (
                    <button
                      className="profile-edit-btn"
                      onClick={() => setEditing(true)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        padding: "9px 18px",
                        borderRadius: 999,
                        background: "rgba(201,169,110,0.07)",
                        border: "1px solid rgba(201,169,110,0.22)",
                        color: "rgba(201,169,110,0.7)",
                        fontSize: 10,
                        fontWeight: 800,
                        letterSpacing: "0.12em",
                        textTransform: "uppercase",
                        cursor: "pointer",
                        fontFamily: "'Jost',sans-serif",
                        transition: "all 0.22s",
                      }}
                    >
                      <Edit3 size={12} strokeWidth={2} />{" "}
                      {t("profilePage.editProfile")}
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Personal info fields */}
            <div style={{ padding: "20px 22px" }}>
              <p
                style={{
                  margin: "0 0 12px",
                  fontSize: 9,
                  fontWeight: 800,
                  letterSpacing: "0.22em",
                  textTransform: "uppercase",
                  color: "rgba(201,169,110,0.4)",
                }}
              >
                {t("profilePage.personalInfo")}
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                <FieldRow
                  icon={User}
                  label={t("profilePage.fields.firstName")}
                  value={profile.firstName || "—"}
                  editing={editing}
                  inputValue={firstName}
                  onChange={setFirstName}
                  placeholder={t("profilePage.fields.firstName")}
                />
                <FieldRow
                  icon={User}
                  label={t("profilePage.fields.lastName")}
                  value={profile.lastName || "—"}
                  editing={editing}
                  inputValue={lastName}
                  onChange={setLastName}
                  placeholder={t("profilePage.fields.lastName")}
                />
                <FieldRow
                  icon={Mail}
                  label={t("profilePage.fields.email")}
                  value={profile.email || user?.email || "—"}
                  locked
                  lockedLabel={t("profilePage.locked")}
                />
                <FieldRow
                  icon={Phone}
                  label={t("profilePage.fields.phone")}
                  value={profile.phone || "—"}
                  editing={editing}
                  inputValue={phone}
                  onChange={setPhone}
                  placeholder={t("profilePage.fields.phonePlaceholder")}
                  type="tel"
                />
              </div>

              {editing && (
                <div
                  style={{
                    marginTop: 12,
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "10px 14px",
                    borderRadius: 10,
                    background: "rgba(255,200,60,0.05)",
                    border: "1px solid rgba(255,200,60,0.12)",
                  }}
                >
                  <AlertCircle
                    size={13}
                    style={{ color: "rgba(255,200,60,0.55)", flexShrink: 0 }}
                  />
                  <p
                    style={{
                      margin: 0,
                      fontSize: 11,
                      color: "rgba(255,200,60,0.55)",
                      fontFamily: "'Jost',sans-serif",
                      fontWeight: 600,
                    }}
                  >
                    {t("profilePage.emailNote")}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* ══ STATS ══════════════════════════════════════════════════════ */}
          <div
            className="stats-grid"
            style={{ animation: "fadeUp 0.45s ease 0.13s both" }}
          >
            <StatCard
              icon={Gavel}
              label={t("profilePage.stats.totalBids")}
              value={profile.totalBids ?? 0}
              color="#64a0ff"
            />
            <StatCard
              icon={Trophy}
              label={t("profilePage.stats.totalWins")}
              value={profile.totalWins ?? 0}
              color={GOLD}
            />
            <StatCard
              icon={Wallet}
              label={t("profilePage.stats.walletBalance")}
              value={`${profile.walletBalance ?? 0} EGP`}
              color="#5ee8a0"
            />
            <StatCard
              icon={Shield}
              label={t("profilePage.stats.accountStatus")}
              value={
                profile.isBlocked
                  ? t("profilePage.accountInfo.blocked")
                  : t("profilePage.accountInfo.active")
              }
              color={profile.isBlocked ? "#ff6464" : "#5ee8a0"}
            />
          </div>

          {/* ══ ACCOUNT DETAILS ════════════════════════════════════════════ */}
          <div
            style={{
              background: `linear-gradient(160deg, ${NAVY} 0%, ${DARK} 100%)`,
              border: "1px solid rgba(201,169,110,0.1)",
              borderRadius: 22,
              padding: "20px 22px",
              animation: "fadeUp 0.45s ease 0.19s both",
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
                background:
                  "linear-gradient(90deg, transparent, rgba(201,169,110,0.3), transparent)",
              }}
            />
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
              {t("profilePage.accountDetails")}
            </p>

            <div className="account-grid">
              {[
                {
                  label: t("profilePage.accountInfo.role"),
                  value: roleInfo.label,
                  color: roleInfo.color,
                },
                {
                  label: t("profilePage.accountInfo.verification"),
                  value: profile.verified
                    ? t("profilePage.accountInfo.verified")
                    : t("profilePage.accountInfo.unverified"),
                  color: profile.verified
                    ? "#5ee8a0"
                    : "rgba(229,224,198,0.35)",
                },
                {
                  label: t("profilePage.accountInfo.status"),
                  value: profile.isBlocked
                    ? t("profilePage.accountInfo.blocked")
                    : t("profilePage.accountInfo.active"),
                  color: profile.isBlocked ? "#ff6464" : "#5ee8a0",
                },
                {
                  label: t("profilePage.accountInfo.memberSince"),
                  value: formatDate(profile.createdAt, i18n.language),
                  color: CREAM,
                },
              ].map((item) => (
                <div
                  key={item.label}
                  style={{
                    padding: "12px 15px",
                    background: "rgba(255,255,255,0.02)",
                    border: "1px solid rgba(229,224,198,0.05)",
                    borderRadius: 13,
                  }}
                >
                  <p
                    style={{
                      margin: "0 0 4px",
                      fontSize: 9,
                      fontWeight: 700,
                      color: "rgba(229,224,198,0.28)",
                      letterSpacing: "0.12em",
                      textTransform: "uppercase",
                    }}
                  >
                    {item.label}
                  </p>
                  <p
                    style={{
                      margin: 0,
                      fontSize: 13,
                      fontWeight: 700,
                      color: item.color,
                    }}
                  >
                    {item.value}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
