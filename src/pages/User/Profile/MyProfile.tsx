/**
 * src/pages/User/Profile/MyProfile.tsx
 *
 * Live Firestore profile page — reads & writes to users/{uid}
 * Fields editable: firstName, lastName, phone, profileImage
 * Field locked:    email (Firebase Auth — cannot be changed here)
 *
 * Design: Loqta Zone dark luxury — matches Navbar/ProfileDropdown aesthetic
 *   Dark navy/midnight backgrounds · Gold (#c9a96e) accents
 *   Jost font · Subtle glass-morphism cards · Smooth animations
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
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
import { db, storage } from "@/firebase/firebase";
import { useAuth } from "@/store/AuthContext/AuthContext";

// ─── Types ────────────────────────────────────────────────────────────────────

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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(ts: any): string {
  if (!ts) return "—";
  const d = ts?.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function getRoleLabel(role: string) {
  if (role === "superAdmin")
    return {
      label: "Super Admin",
      color: "#c9a96e",
      bg: "rgba(201,169,110,0.15)",
      border: "rgba(201,169,110,0.3)",
    };
  if (role === "admin")
    return {
      label: "Admin",
      color: "#64a0ff",
      bg: "rgba(100,160,255,0.1)",
      border: "rgba(100,160,255,0.25)",
    };
  return {
    label: "Member",
    color: "rgba(229,224,198,0.55)",
    bg: "rgba(255,255,255,0.05)",
    border: "rgba(255,255,255,0.1)",
  };
}

const GOLD = "#c9a96e";
const GOLD2 = "#b8944e";
const CREAM = "rgb(229,224,198)";
const DARK = "#080d1a";
const NAVY = "#0e1c2e";

// ─── Stat Card ────────────────────────────────────────────────────────────────

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
      border: `1px solid rgba(201,169,110,0.13)`,
      borderRadius: 18,
      padding: "22px 20px",
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
        `0 12px 40px rgba(0,0,0,0.5), 0 0 0 1px rgba(201,169,110,0.18)`;
    }}
    onMouseLeave={(e) => {
      (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)";
      (e.currentTarget as HTMLDivElement).style.boxShadow = "none";
    }}
  >
    {/* glow corner */}
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
        width: 42,
        height: 42,
        borderRadius: 13,
        background: `${color}18`,
        border: `1px solid ${color}33`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Icon size={18} style={{ color }} strokeWidth={1.8} />
    </div>
    <div>
      <p
        style={{
          margin: 0,
          fontSize: 26,
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
          fontSize: 11,
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

// ─── Field Row ────────────────────────────────────────────────────────────────

const FieldRow = ({
  icon: Icon,
  label,
  value,
  locked,
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
      gap: 14,
      padding: "16px 20px",
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
        width: 38,
        height: 38,
        borderRadius: 11,
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
        size={15}
        style={{
          color: locked ? "rgba(229,224,198,0.25)" : GOLD,
          opacity: locked ? 0.6 : 1,
        }}
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
          marginBottom: 4,
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
        LOCKED
      </span>
    )}
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────

export default function MyProfile() {
  const { user } = useAuth();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingImg, setUploadingImg] = useState(false);

  // Edit state
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [newImage, setNewImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Fetch profile ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    setLoading(true);
    getDoc(doc(db, "users", user.uid))
      .then((snap) => {
        if (snap.exists()) {
          const d = snap.data() as UserProfile;
          setProfile(d);
          setFirstName(d.firstName || "");
          setLastName(d.lastName || "");
          setPhone(d.phone || "");
        }
      })
      .catch(() => toast.error("Failed to load profile"))
      .finally(() => setLoading(false));
  }, [user]);

  // ── Image change ──────────────────────────────────────────────────────────
  const handleImageChange = (file: File | null) => {
    setNewImage(file);
    setPreviewUrl(file ? URL.createObjectURL(file) : null);
  };

  // ── Cancel edit ───────────────────────────────────────────────────────────
  const cancelEdit = () => {
    if (!profile) return;
    setFirstName(profile.firstName || "");
    setLastName(profile.lastName || "");
    setPhone(profile.phone || "");
    setNewImage(null);
    setPreviewUrl(null);
    setEditing(false);
  };

  // ── Save ──────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!user || !profile) return;
    setSaving(true);
    try {
      let photoURL = profile.profileImage;

      // Upload new image if selected
      if (newImage) {
        setUploadingImg(true);
        const storageRef = ref(storage, `profileImages/${user.uid}`);
        await uploadBytes(storageRef, newImage);
        photoURL = await getDownloadURL(storageRef);
        setUploadingImg(false);
      }

      const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();

      // Update Firestore
      await updateDoc(doc(db, "users", user.uid), {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        fullName,
        phone: phone.trim(),
        profileImage: photoURL ?? null,
        updatedAt: serverTimestamp(),
      });

      // Update Firebase Auth profile
      await updateProfile(user, {
        displayName: fullName,
        ...(photoURL && photoURL !== profile.profileImage && { photoURL }),
      });

      // Update local state
      setProfile((prev) =>
        prev
          ? {
              ...prev,
              firstName: firstName.trim(),
              lastName: lastName.trim(),
              fullName,
              phone: phone.trim(),
              profileImage: photoURL ?? null,
            }
          : prev,
      );

      setNewImage(null);
      setPreviewUrl(null);
      setEditing(false);
      toast.success("Profile updated successfully ✦");
    } catch (err: any) {
      toast.error("Failed to save changes");
      console.error(err);
    } finally {
      setSaving(false);
      setUploadingImg(false);
    }
  };

  // ── Avatar ────────────────────────────────────────────────────────────────
  const avatarSrc = previewUrl || profile?.profileImage;
  const initials = profile
    ? `${profile.firstName?.[0] ?? ""}${profile.lastName?.[0] ?? ""}`.toUpperCase()
    : "?";
  const roleInfo = getRoleLabel(profile?.role ?? "user");

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading)
    return (
      <div
        style={{
          minHeight: "60vh",
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
            LOADING PROFILE
          </p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );

  if (!profile) return null;

  return (
    <>
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        .profile-save-btn:hover { 
          transform: translateY(-2px) !important;
          box-shadow: 0 8px 28px rgba(201,169,110,0.4) !important;
        }
        .profile-cancel-btn:hover {
          background: rgba(255,80,80,0.1) !important;
          border-color: rgba(255,80,80,0.3) !important;
          color: #ff6464 !important;
        }
        .profile-edit-btn:hover {
          background: rgba(201,169,110,0.12) !important;
          border-color: rgba(201,169,110,0.4) !important;
          color: #c9a96e !important;
        }
        .avatar-upload-overlay {
          opacity: 0;
          transition: opacity 0.25s;
        }
        .avatar-wrap:hover .avatar-upload-overlay {
          opacity: 1;
        }
      `}</style>

      <div
        style={{
          maxWidth: 860,
          margin: "0 auto",
          padding: "40px 20px 80px",
          fontFamily: "'Jost', sans-serif",
          animation: "fadeUp 0.5s ease both",
        }}
      >
        {/* ── Page header ── */}
        <div style={{ marginBottom: 36 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              marginBottom: 6,
            }}
          >
            <span
              style={{
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: "0.22em",
                textTransform: "uppercase",
                color: "rgba(201,169,110,0.5)",
              }}
            >
              Account
            </span>
            <span style={{ color: "rgba(229,224,198,0.15)", fontSize: 12 }}>
              ✦
            </span>
            <span
              style={{
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: "0.22em",
                textTransform: "uppercase",
                color: GOLD,
              }}
            >
              My Profile
            </span>
          </div>
          <h1
            style={{
              margin: 0,
              fontSize: "clamp(24px, 4vw, 32px)",
              fontWeight: 800,
              color: CREAM,
              letterSpacing: "-0.02em",
            }}
          >
            Your Profile
          </h1>
          <p
            style={{
              margin: "6px 0 0",
              fontSize: 13,
              color: "rgba(229,224,198,0.4)",
              fontWeight: 500,
            }}
          >
            Manage your personal information and account settings
          </p>
        </div>

        {/* ── Main card ── */}
        <div
          style={{
            background: `linear-gradient(160deg, ${NAVY} 0%, ${DARK} 100%)`,
            border: "1px solid rgba(201,169,110,0.14)",
            borderRadius: 24,
            overflow: "hidden",
            boxShadow:
              "0 24px 64px rgba(0,0,0,0.55), inset 0 1px 0 rgba(201,169,110,0.1)",
            marginBottom: 24,
            animation: "fadeUp 0.5s ease 0.05s both",
            position: "relative",
          }}
        >
          {/* Gold top line */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: 1.5,
              background:
                "linear-gradient(90deg, transparent, rgba(201,169,110,0.6), transparent)",
            }}
          />

          {/* ── Header section: avatar + name + role ── */}
          <div
            style={{
              padding: "36px 36px 28px",
              borderBottom: "1px solid rgba(229,224,198,0.06)",
              display: "flex",
              alignItems: "center",
              gap: 28,
              flexWrap: "wrap",
            }}
          >
            {/* Avatar */}
            <div
              className="avatar-wrap"
              style={{ position: "relative", flexShrink: 0 }}
            >
              <div
                style={{
                  width: 96,
                  height: 96,
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
                    style={{ fontSize: 28, fontWeight: 800, color: "#fff" }}
                  >
                    {initials}
                  </span>
                )}

                {/* Upload overlay — only in edit mode */}
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
                      gap: 4,
                    }}
                  >
                    <Camera size={20} style={{ color: GOLD }} />
                    <span
                      style={{
                        fontSize: 9,
                        fontWeight: 800,
                        color: GOLD,
                        letterSpacing: "0.08em",
                      }}
                    >
                      CHANGE
                    </span>
                  </div>
                )}
              </div>

              {/* Verified dot / blocked indicator */}
              {!profile.isBlocked && (
                              <div
                                  
                  style={{
                    position: "absolute",
                    bottom: 4,
                    right: 4,
                    width: 18,
                    height: 18,
                    borderRadius: "50%",
                    background: profile.verified
                      ? "#22c55e"
                      : "rgba(229,224,198,0.2)",
                    border: "2px solid #080d1a",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                                  }}
                                  
                              >
                                  
                                  {profile.verified && (
                                      
                    <Check size={9} style={{ color: "#fff" }} strokeWidth={3} />
                  )}
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                style={{ display: "none" }}
                onChange={(e) => handleImageChange(e.target.files?.[0] ?? null)}
              />
            </div>

            {/* Name + role */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  flexWrap: "wrap",
                  marginBottom: 6,
                }}
              >
                {editing ? (
                  <div style={{ display: "flex", gap: 10 }}>
                    <input
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="First name"
                      style={{
                        background: "rgba(255,255,255,0.05)",
                        border: "1px solid rgba(201,169,110,0.25)",
                        borderRadius: 10,
                        padding: "8px 14px",
                        color: CREAM,
                        fontSize: 18,
                        fontWeight: 800,
                        fontFamily: "'Jost',sans-serif",
                        outline: "none",
                        width: 140,
                      }}
                    />
                    <input
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="Last name"
                      style={{
                        background: "rgba(255,255,255,0.05)",
                        border: "1px solid rgba(201,169,110,0.25)",
                        borderRadius: 10,
                        padding: "8px 14px",
                        color: CREAM,
                        fontSize: 18,
                        fontWeight: 800,
                        fontFamily: "'Jost',sans-serif",
                        outline: "none",
                        width: 140,
                      }}
                    />
                  </div>
                ) : (
                  <h2
                    style={{
                      margin: 0,
                      fontSize: "clamp(18px, 3vw, 24px)",
                      fontWeight: 800,
                      color: CREAM,
                      letterSpacing: "-0.01em",
                    }}
                  >
                    {profile.fullName || "—"}
                  </h2>
                )}
                {/* Role badge */}
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                    padding: "4px 10px",
                    borderRadius: 999,
                    background: roleInfo.bg,
                    border: `1px solid ${roleInfo.border}`,
                    fontSize: 9,
                    fontWeight: 900,
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                    color: roleInfo.color,
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
                  fontSize: 13,
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
                  gap: 6,
                  marginTop: 8,
                }}
              >
                <Calendar
                  size={12}
                  style={{ color: "rgba(229,224,198,0.25)" }}
                />
                <span
                  style={{
                    fontSize: 11,
                    color: "rgba(229,224,198,0.3)",
                    fontWeight: 600,
                    letterSpacing: "0.04em",
                  }}
                >
                  Member since {formatDate(profile.createdAt)}
                </span>
              </div>
            </div>

            {/* Action buttons */}
            <div
              style={{
                display: "flex",
                gap: 10,
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
                      gap: 7,
                      padding: "10px 18px",
                      borderRadius: 999,
                      background: "rgba(255,80,80,0.06)",
                      border: "1px solid rgba(255,80,80,0.15)",
                      color: "rgba(255,120,120,0.7)",
                      fontSize: 11,
                      fontWeight: 800,
                      letterSpacing: "0.12em",
                      textTransform: "uppercase",
                      cursor: "pointer",
                      fontFamily: "'Jost',sans-serif",
                      transition: "all 0.22s",
                    }}
                  >
                    <X size={13} strokeWidth={2.5} />
                    Cancel
                  </button>
                  <button
                    className="profile-save-btn"
                    onClick={handleSave}
                    disabled={saving}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 7,
                      padding: "10px 22px",
                      borderRadius: 999,
                      background: saving
                        ? "rgba(201,169,110,0.4)"
                        : `linear-gradient(135deg, ${GOLD}, ${GOLD2})`,
                      border: "none",
                      color: "#0a0a1a",
                      fontSize: 11,
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
                            width: 13,
                            height: 13,
                            borderRadius: "50%",
                            border: "2px solid rgba(10,10,26,0.3)",
                            borderTopColor: "#0a0a1a",
                            animation: "spin 0.7s linear infinite",
                          }}
                        />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save size={13} strokeWidth={2.5} />
                        Save Changes
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
                    gap: 7,
                    padding: "10px 20px",
                    borderRadius: 999,
                    background: "rgba(201,169,110,0.07)",
                    border: "1px solid rgba(201,169,110,0.22)",
                    color: "rgba(201,169,110,0.7)",
                    fontSize: 11,
                    fontWeight: 800,
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    cursor: "pointer",
                    fontFamily: "'Jost',sans-serif",
                    transition: "all 0.22s",
                  }}
                >
                  <Edit3 size={13} strokeWidth={2} />
                  Edit Profile
                </button>
              )}
            </div>
          </div>

          {/* ── Info fields ── */}
          <div style={{ padding: "28px 36px" }}>
            <p
              style={{
                margin: "0 0 16px",
                fontSize: 10,
                fontWeight: 800,
                letterSpacing: "0.22em",
                textTransform: "uppercase",
                color: "rgba(201,169,110,0.45)",
              }}
            >
              Personal Information
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <FieldRow
                icon={User}
                label="First Name"
                value={profile.firstName || "—"}
                editing={editing}
                inputValue={firstName}
                onChange={setFirstName}
                placeholder="First name"
              />
              <FieldRow
                icon={User}
                label="Last Name"
                value={profile.lastName || "—"}
                editing={editing}
                inputValue={lastName}
                onChange={setLastName}
                placeholder="Last name"
              />
              <FieldRow
                icon={Mail}
                label="Email Address"
                value={profile.email || user?.email || "—"}
                locked
              />
              <FieldRow
                icon={Phone}
                label="Phone Number"
                value={profile.phone || "—"}
                editing={editing}
                inputValue={phone}
                onChange={setPhone}
                placeholder="+20 100 000 0000"
                type="tel"
              />
            </div>

            {/* Email locked notice */}
            {editing && (
              <div
                style={{
                  marginTop: 14,
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
                  size={14}
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
                  Email address cannot be changed here. Contact support if you
                  need to update your email.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ── Stats row ── */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
            gap: 16,
            animation: "fadeUp 0.5s ease 0.1s both",
          }}
        >
          <StatCard
            icon={Gavel}
            label="Total Bids"
            value={profile.totalBids ?? 0}
            color="#64a0ff"
          />
          <StatCard
            icon={Trophy}
            label="Total Wins"
            value={profile.totalWins ?? 0}
            color={GOLD}
          />
          <StatCard
            icon={Wallet}
            label="Wallet Balance"
            value={`${profile.walletBalance ?? 0} EGP`}
            color="#5ee8a0"
          />
          <StatCard
            icon={Shield}
            label="Account Status"
            value={profile.isBlocked ? "Blocked" : "Active"}
            color={profile.isBlocked ? "#ff6464" : "#5ee8a0"}
          />
        </div>

        {/* ── Account details ── */}
        <div
          style={{
            marginTop: 24,
            background: `linear-gradient(160deg, ${NAVY} 0%, ${DARK} 100%)`,
            border: "1px solid rgba(201,169,110,0.1)",
            borderRadius: 24,
            padding: "28px 36px",
            animation: "fadeUp 0.5s ease 0.15s both",
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
                "linear-gradient(90deg, transparent, rgba(201,169,110,0.35), transparent)",
            }}
          />

          <p
            style={{
              margin: "0 0 20px",
              fontSize: 10,
              fontWeight: 800,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color: "rgba(201,169,110,0.45)",
            }}
          >
            Account Details
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: 16,
            }}
          >
            {[
              {
                label: "Account Role",
                value: roleInfo.label,
                color: roleInfo.color,
              },
              {
                label: "Verification Status",
                value: profile.verified ? "Verified" : "Unverified",
                color: profile.verified ? "#5ee8a0" : "rgba(229,224,198,0.35)",
              },
              {
                label: "Account Status",
                value: profile.isBlocked ? "Blocked" : "Active",
                color: profile.isBlocked ? "#ff6464" : "#5ee8a0",
              },
              {
                label: "Member Since",
                value: formatDate(profile.createdAt),
                color: CREAM,
              },
            ].map((item) => (
              <div
                key={item.label}
                style={{
                  padding: "14px 18px",
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(229,224,198,0.05)",
                  borderRadius: 14,
                }}
              >
                <p
                  style={{
                    margin: "0 0 5px",
                    fontSize: 10,
                    fontWeight: 700,
                    color: "rgba(229,224,198,0.3)",
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                  }}
                >
                  {item.label}
                </p>
                <p
                  style={{
                    margin: 0,
                    fontSize: 14,
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
    </>
  );
}
