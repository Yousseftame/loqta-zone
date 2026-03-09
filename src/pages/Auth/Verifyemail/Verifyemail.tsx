/**
 * src/pages/Auth/VerifyEmail/VerifyEmail.tsx
 *
 * Email verification page shown immediately after registration.
 * - Sends a Firebase verification email
 * - 50-second cooldown after send
 * - Polls every 3 seconds for verification
 * - Updates Firestore `verified` field on success
 * - Redirects to "/" once verified
 */

import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  sendEmailVerification,
  onAuthStateChanged,
  reload,
  signOut,
} from "firebase/auth";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "@/firebase/firebase";
import { useNavigate } from "react-router-dom";

// ── Constants ─────────────────────────────────────────────────
const COOLDOWN = 50;
const POLL_INTERVAL = 3000;

// ── Floating particle (purely decorative) ─────────────────────
function Particle({ style }: { style: React.CSSProperties }) {
  return (
    <div
      style={{
        position: "absolute",
        borderRadius: "50%",
        background: "rgba(201,169,110,0.12)",
        pointerEvents: "none",
        ...style,
      }}
    />
  );
}

export default function VerifyEmail() {
  const navigate = useNavigate();

  const [emailSent, setEmailSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [verified, setVerified] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Get current user's email
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (u) {
        setUserEmail(u.email);
        // Already verified edge-case
        if (u.emailVerified) {
          handleVerificationSuccess(u.uid);
        }
      } else {
        navigate("/login");
      }
    });
    return () => unsub();
  }, []);

  const handleVerificationSuccess = useCallback(async (uid: string) => {
    try {
      await updateDoc(doc(db, "users", uid), {
        verified: true,
        updatedAt: serverTimestamp(),
      });
    } catch {
      // non-fatal
    }
    setVerified(true);
  }, []);

  // Cooldown ticker
  const startCooldown = () => {
    setCooldown(COOLDOWN);
    cooldownRef.current = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(cooldownRef.current!);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Send email
  const handleSend = async () => {
    const user = auth.currentUser;
    if (!user) return;
    setSending(true);
    setError(null);
    try {
      await sendEmailVerification(user);
      setEmailSent(true);
      startCooldown();
    } catch (err: any) {
      const msgs: Record<string, string> = {
        "auth/too-many-requests": "Too many requests — please wait a moment.",
      };
      setError(msgs[err.code] ?? "Failed to send email. Please try again.");
    } finally {
      setSending(false);
    }
  };

  // Poll for verification
  useEffect(() => {
    if (!emailSent || verified) return;

    pollRef.current = setInterval(async () => {
      const user = auth.currentUser;
      if (!user) return;
      try {
        await reload(user);
        if (user.emailVerified) {
          clearInterval(pollRef.current!);
          await handleVerificationSuccess(user.uid);
        }
      } catch {
        // silent
      }
    }, POLL_INTERVAL);

    return () => clearInterval(pollRef.current!);
  }, [emailSent, verified]);

  // Manual check
  const handleManualCheck = async () => {
    const user = auth.currentUser;
    if (!user) return;
    setChecking(true);
    setError(null);
    try {
      await reload(user);
      if (user.emailVerified) {
        clearInterval(pollRef.current!);
        await handleVerificationSuccess(user.uid);
      } else {
        setError(
          "Your email hasn't been verified yet. Please check your inbox.",
        );
      }
    } catch {
      setError("Could not check verification status. Please try again.");
    } finally {
      setChecking(false);
    }
  };

  // Go home after verified
  const handleGoHome = () => navigate("/");

  // Logout
  const handleLogout = async () => {
    await signOut(auth);
    navigate("/login");
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearInterval(cooldownRef.current!);
      clearInterval(pollRef.current!);
    };
  }, []);

  // ── Design tokens ─────────────────────────────────────────
  const NAVY = "#1a2f45";
  const NAVY2 = "#0f1e2e";
  const GOLD = "#c9a96e";
  const GOLD2 = "#e8d5a3";
  const CREAM = "rgb(229,224,198)";

  const isButtonDisabled = cooldown > 0 || sending;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: `linear-gradient(135deg, ${NAVY2} 0%, ${NAVY} 60%, #1e3552 100%)`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <style>{`
        @keyframes ve-float {
          0%, 100% { transform: translateY(0px) rotate(0deg); opacity: 0.6; }
          50%       { transform: translateY(-18px) rotate(5deg); opacity: 1; }
        }
        @keyframes ve-pulse-ring {
          0%   { transform: scale(1);   opacity: 0.6; }
          70%  { transform: scale(1.35); opacity: 0;   }
          100% { transform: scale(1.35); opacity: 0;   }
        }
        @keyframes ve-spin-slow {
          from { transform: rotate(0deg);   }
          to   { transform: rotate(360deg); }
        }
        @keyframes ve-spin-slow-rev {
          from { transform: rotate(360deg); }
          to   { transform: rotate(0deg);   }
        }
        @keyframes ve-fade-up {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0);    }
        }
        @keyframes ve-shimmer {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        @keyframes ve-success-pop {
          0%   { transform: scale(0.5); opacity: 0; }
          70%  { transform: scale(1.12); }
          100% { transform: scale(1);   opacity: 1; }
        }
        @keyframes ve-dot-bounce {
          0%,80%,100% { transform: scale(0.55); opacity: 0.3; }
          40%          { transform: scale(1);    opacity: 1;   }
        }
        .ve-card {
          animation: ve-fade-up 0.72s cubic-bezier(0.22,1,0.36,1) both;
        }
        .ve-send-btn:hover:not(:disabled) {
          transform: translateY(-2px) scale(1.02);
          box-shadow: 0 12px 40px rgba(201,169,110,0.45) !important;
        }
        .ve-send-btn:active:not(:disabled) {
          transform: translateY(0) scale(0.98);
        }
        .ve-check-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          background: rgba(255,255,255,0.08) !important;
        }
        .ve-logout-btn:hover {
          color: rgba(229,224,198,0.7) !important;
        }
      `}</style>

      {/* Decorative particles */}
      {[
        {
          width: 320,
          height: 320,
          top: "-10%",
          left: "-8%",
          animationDelay: "0s",
          animationDuration: "7s",
        },
        {
          width: 200,
          height: 200,
          bottom: "5%",
          right: "-5%",
          animationDelay: "1.5s",
          animationDuration: "9s",
        },
        {
          width: 120,
          height: 120,
          top: "55%",
          left: "5%",
          animationDelay: "0.8s",
          animationDuration: "6s",
        },
        {
          width: 80,
          height: 80,
          top: "15%",
          right: "12%",
          animationDelay: "2s",
          animationDuration: "8s",
        },
      ].map((p, i) => (
        <Particle
          key={i}
          style={{
            width: p.width,
            height: p.height,
            top: p.top,
            left: (p as any).left,
            right: (p as any).right,
            bottom: (p as any).bottom,
            animation: `ve-float ${p.animationDuration} ease-in-out ${p.animationDelay} infinite`,
          }}
        />
      ))}

      {/* Ambient glow */}
      <div
        style={{
          position: "absolute",
          top: "30%",
          left: "50%",
          transform: "translate(-50%,-50%)",
          width: 600,
          height: 400,
          borderRadius: "50%",
          background:
            "radial-gradient(ellipse, rgba(201,169,110,0.07) 0%, transparent 65%)",
          pointerEvents: "none",
        }}
      />

      {/* Top gold line */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 2,
          background: `linear-gradient(90deg, transparent, ${GOLD}, ${CREAM}, ${GOLD}, transparent)`,
          opacity: 0.55,
        }}
      />

      {/* ── Card ── */}
      <div
        className="ve-card"
        style={{
          position: "relative",
          zIndex: 10,
          width: "100%",
          maxWidth: 480,
          margin: "0 24px",
          background: "rgba(255,255,255,0.035)",
          border: "1px solid rgba(201,169,110,0.18)",
          borderRadius: 24,
          backdropFilter: "blur(20px)",
          boxShadow:
            "0 32px 80px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.06)",
          overflow: "hidden",
        }}
      >
        {/* Gold top accent */}
        <div
          style={{
            height: 3,
            background: `linear-gradient(90deg, transparent, ${GOLD}, ${GOLD2}, ${GOLD}, transparent)`,
          }}
        />

        <div style={{ padding: "44px 40px 40px" }}>
          {/* ══ VERIFIED STATE ══ */}
          {verified ? (
            <div style={{ textAlign: "center" }}>
              {/* Success icon */}
              <div
                style={{
                  position: "relative",
                  width: 96,
                  height: 96,
                  margin: "0 auto 28px",
                  animation:
                    "ve-success-pop 0.6s cubic-bezier(0.34,1.56,0.64,1) both",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    borderRadius: "50%",
                    background: "rgba(126,207,154,0.15)",
                    border: "2px solid rgba(126,207,154,0.4)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <svg width="44" height="44" viewBox="0 0 44 44" fill="none">
                    <path
                      d="M10 22L18 30L34 14"
                      stroke="#7ecf9a"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                {/* Pulse rings */}
                {[1, 2].map((i) => (
                  <div
                    key={i}
                    style={{
                      position: "absolute",
                      inset: 0,
                      borderRadius: "50%",
                      border: "2px solid rgba(126,207,154,0.35)",
                      animation: `ve-pulse-ring 2s ease-out ${i * 0.4}s infinite`,
                    }}
                  />
                ))}
              </div>

              <h1
                style={{
                  margin: "0 0 10px",
                  fontSize: 28,
                  fontWeight: 700,
                  color: "#ffffff",
                  letterSpacing: "-0.02em",
                  lineHeight: 1.2,
                }}
              >
                Email Verified!
              </h1>
              <p
                style={{
                  margin: "0 0 32px",
                  fontSize: 14,
                  color: "rgba(229,224,198,0.5)",
                  lineHeight: 1.7,
                }}
              >
                Your account is now fully activated.
                <br />
                Welcome to Loqta Zone.
              </p>

              <button
                onClick={handleGoHome}
                className="ve-send-btn"
                style={{
                  width: "100%",
                  padding: "15px 0",
                  border: "none",
                  borderRadius: 12,
                  cursor: "pointer",
                  fontSize: 13,
                  fontWeight: 700,
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  color: "#0f1e2e",
                  background: `linear-gradient(120deg, ${GOLD} 0%, ${GOLD2} 55%, ${GOLD} 100%)`,
                  boxShadow: `0 6px 28px rgba(201,169,110,0.32)`,
                  transition: "all 0.32s cubic-bezier(0.34,1.56,0.64,1)",
                  fontFamily: "inherit",
                }}
              >
                Enter Loqta Zone →
              </button>
            </div>
          ) : (
            /* ══ MAIN STATE ══ */
            <>
              {/* Envelope icon */}
              <div
                style={{
                  position: "relative",
                  width: 88,
                  height: 88,
                  margin: "0 auto 32px",
                }}
              >
                {/* Outer spinning ring */}
                <div
                  style={{
                    position: "absolute",
                    inset: -4,
                    borderRadius: "50%",
                    border: `1.5px dashed rgba(201,169,110,0.35)`,
                    animation: "ve-spin-slow 14s linear infinite",
                  }}
                />
                {/* Inner spinning ring */}
                <div
                  style={{
                    position: "absolute",
                    inset: 4,
                    borderRadius: "50%",
                    border: `1.5px dashed rgba(201,169,110,0.18)`,
                    animation: "ve-spin-slow-rev 10s linear infinite",
                  }}
                />
                {/* Circle bg */}
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    borderRadius: "50%",
                    background: `linear-gradient(135deg, rgba(201,169,110,0.14) 0%, rgba(201,169,110,0.05) 100%)`,
                    border: `1px solid rgba(201,169,110,0.25)`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {/* Envelope SVG */}
                  <svg width="38" height="38" viewBox="0 0 38 38" fill="none">
                    <rect
                      x="4"
                      y="9"
                      width="30"
                      height="22"
                      rx="3"
                      stroke={GOLD}
                      strokeWidth="1.8"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M4 13L19 22L34 13"
                      stroke={GOLD}
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>

                {/* Pulse when email sent */}
                {emailSent && (
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      borderRadius: "50%",
                      border: `2px solid rgba(201,169,110,0.4)`,
                      animation: "ve-pulse-ring 2.2s ease-out infinite",
                    }}
                  />
                )}
              </div>

              {/* Headline */}
              <h1
                style={{
                  margin: "0 0 8px",
                  textAlign: "center",
                  fontSize: 26,
                  fontWeight: 700,
                  color: "#ffffff",
                  letterSpacing: "-0.02em",
                  lineHeight: 1.2,
                }}
              >
                Verify your email
              </h1>

              {/* Sub */}
              <p
                style={{
                  margin: "0 0 28px",
                  textAlign: "center",
                  fontSize: 13,
                  color: "rgba(229,224,198,0.45)",
                  lineHeight: 1.75,
                }}
              >
                {emailSent ? (
                  <>
                    We've sent a verification link to
                    <br />
                    <span style={{ color: GOLD, fontWeight: 600 }}>
                      {userEmail}
                    </span>
                    <br />
                    Check your inbox (and spam folder).
                  </>
                ) : (
                  <>
                    Click below to send a verification link
                    <br />
                    to{" "}
                    <span style={{ color: GOLD, fontWeight: 600 }}>
                      {userEmail ?? "your email"}
                    </span>
                  </>
                )}
              </p>

              {/* Error */}
              {error && (
                <div
                  style={{
                    marginBottom: 20,
                    padding: "12px 16px",
                    background: "rgba(220,60,60,0.1)",
                    border: "1px solid rgba(220,60,60,0.25)",
                    borderRadius: 10,
                    fontSize: 12,
                    color: "#ff9090",
                    textAlign: "center",
                    lineHeight: 1.5,
                  }}
                >
                  {error}
                </div>
              )}

              {/* ── Send button ── */}
              <button
                onClick={handleSend}
                disabled={isButtonDisabled}
                className="ve-send-btn"
                style={{
                  width: "100%",
                  padding: "15px 0",
                  border: "none",
                  borderRadius: 12,
                  cursor: isButtonDisabled ? "not-allowed" : "pointer",
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  color: isButtonDisabled ? "rgba(15,30,46,0.6)" : "#0f1e2e",
                  background: isButtonDisabled
                    ? "rgba(201,169,110,0.25)"
                    : `linear-gradient(120deg, ${GOLD} 0%, ${GOLD2} 55%, ${GOLD} 100%)`,
                  boxShadow: isButtonDisabled
                    ? "none"
                    : `0 6px 28px rgba(201,169,110,0.32)`,
                  transition: "all 0.32s ease",
                  fontFamily: "inherit",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 10,
                  marginBottom: 12,
                }}
              >
                {sending ? (
                  /* Loading dots */
                  <>
                    <span
                      style={{
                        color: "rgba(15,30,46,0.55)",
                        letterSpacing: "0.18em",
                      }}
                    >
                      Sending
                    </span>
                    {[0, 1, 2].map((i) => (
                      <span
                        key={i}
                        style={{
                          display: "inline-block",
                          width: 5,
                          height: 5,
                          borderRadius: "50%",
                          background: "rgba(15,30,46,0.5)",
                          animation: `ve-dot-bounce 1.2s ${i * 0.2}s ease-in-out infinite`,
                        }}
                      />
                    ))}
                  </>
                ) : cooldown > 0 ? (
                  /* Countdown */
                  <>
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 14 14"
                      fill="none"
                      style={{ opacity: 0.6 }}
                    >
                      <circle
                        cx="7"
                        cy="7"
                        r="5.5"
                        stroke="currentColor"
                        strokeWidth="1.4"
                      />
                      <path
                        d="M7 4.5V7L8.5 8.5"
                        stroke="currentColor"
                        strokeWidth="1.4"
                        strokeLinecap="round"
                      />
                    </svg>
                    <span style={{ color: "rgba(15,30,46,0.55)" }}>
                      Resend in {cooldown}s
                    </span>
                  </>
                ) : emailSent ? (
                  "Resend Verification Email"
                ) : (
                  "Send Verification Email"
                )}
              </button>

              {/* Cooldown bar */}
              {cooldown > 0 && (
                <div
                  style={{
                    height: 2,
                    borderRadius: 2,
                    background: "rgba(255,255,255,0.06)",
                    marginBottom: 20,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      borderRadius: 2,
                      background: `linear-gradient(90deg, ${GOLD}, ${GOLD2})`,
                      width: `${((COOLDOWN - cooldown) / COOLDOWN) * 100}%`,
                      transition: "width 1s linear",
                    }}
                  />
                </div>
              )}

              {/* Divider */}
              {emailSent && (
                <>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      margin: "4px 0 16px",
                    }}
                  >
                    <div
                      style={{
                        flex: 1,
                        height: 1,
                        background: "rgba(255,255,255,0.07)",
                      }}
                    />
                    <span
                      style={{
                        fontSize: 10,
                        color: "rgba(229,224,198,0.25)",
                        letterSpacing: "0.2em",
                        textTransform: "uppercase",
                      }}
                    >
                      or
                    </span>
                    <div
                      style={{
                        flex: 1,
                        height: 1,
                        background: "rgba(255,255,255,0.07)",
                      }}
                    />
                  </div>

                  {/* ── Manual check button ── */}
                  <button
                    onClick={handleManualCheck}
                    disabled={checking}
                    className="ve-check-btn"
                    style={{
                      width: "100%",
                      padding: "14px 0",
                      border: "1px solid rgba(201,169,110,0.25)",
                      borderRadius: 12,
                      cursor: checking ? "not-allowed" : "pointer",
                      fontSize: 12,
                      fontWeight: 700,
                      letterSpacing: "0.18em",
                      textTransform: "uppercase",
                      color: checking ? "rgba(201,169,110,0.4)" : GOLD,
                      background: "rgba(255,255,255,0.03)",
                      transition: "all 0.25s ease",
                      fontFamily: "inherit",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                    }}
                  >
                    {checking ? (
                      <>
                        <span style={{ color: "rgba(201,169,110,0.4)" }}>
                          Checking
                        </span>
                        {[0, 1, 2].map((i) => (
                          <span
                            key={i}
                            style={{
                              display: "inline-block",
                              width: 4,
                              height: 4,
                              borderRadius: "50%",
                              background: "rgba(201,169,110,0.4)",
                              animation: `ve-dot-bounce 1.2s ${i * 0.2}s ease-in-out infinite`,
                            }}
                          />
                        ))}
                      </>
                    ) : (
                      <>
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 14 14"
                          fill="none"
                        >
                          <path
                            d="M2 7C2 7 4 3 7 3C10 3 12 7 12 7C12 7 10 11 7 11C4 11 2 7 2 7Z"
                            stroke="currentColor"
                            strokeWidth="1.3"
                            strokeLinejoin="round"
                          />
                          <circle
                            cx="7"
                            cy="7"
                            r="1.8"
                            stroke="currentColor"
                            strokeWidth="1.3"
                          />
                        </svg>
                        I have verified my email
                      </>
                    )}
                  </button>

                  {/* Auto-checking notice */}
                  <p
                    style={{
                      marginTop: 14,
                      textAlign: "center",
                      fontSize: 11,
                      color: "rgba(229,224,198,0.25)",
                      letterSpacing: "0.02em",
                      lineHeight: 1.6,
                    }}
                  >
                    We're checking automatically every few seconds.
                    <br />
                    You can also click above once you've verified.
                  </p>
                </>
              )}

              {/* Tips box */}
              {emailSent && (
                <div
                  style={{
                    marginTop: 20,
                    padding: "14px 16px",
                    background: "rgba(201,169,110,0.05)",
                    border: "1px solid rgba(201,169,110,0.12)",
                    borderRadius: 10,
                  }}
                >
                  <p
                    style={{
                      margin: "0 0 8px",
                      fontSize: 10,
                      fontWeight: 700,
                      color: "rgba(201,169,110,0.55)",
                      letterSpacing: "0.2em",
                      textTransform: "uppercase",
                    }}
                  >
                    Didn't receive it?
                  </p>
                  {[
                    "Check your spam or junk folder",
                    "Make sure the email address is correct",
                    "Wait a moment and try resending",
                  ].map((tip, i) => (
                    <div
                      key={i}
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 8,
                        marginBottom: i < 2 ? 5 : 0,
                      }}
                    >
                      <span
                        style={{
                          color: GOLD,
                          fontSize: 10,
                          marginTop: 1,
                          flexShrink: 0,
                        }}
                      >
                        ·
                      </span>
                      <span
                        style={{
                          fontSize: 11,
                          color: "rgba(229,224,198,0.35)",
                          lineHeight: 1.5,
                        }}
                      >
                        {tip}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Logout link */}
              <div style={{ marginTop: 24, textAlign: "center" }}>
                <button
                  onClick={handleLogout}
                  className="ve-logout-btn"
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    fontSize: 11,
                    color: "rgba(229,224,198,0.28)",
                    fontFamily: "inherit",
                    letterSpacing: "0.04em",
                    transition: "color 0.2s ease",
                  }}
                >
                  Use a different account? Sign out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
