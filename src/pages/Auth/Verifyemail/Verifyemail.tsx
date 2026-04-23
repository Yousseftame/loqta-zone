import React, { useEffect, useRef, useState } from "react";
import { Mail, RotateCcw, CheckCircle, LogIn, AlertCircle } from "lucide-react";
import { Button } from "@/components/shared/AuthButton";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/store/AuthContext/AuthContext";
import { auth } from "@/firebase/firebase";
import toast from "react-hot-toast";

// Cooldown between resend attempts (seconds)
const RESEND_COOLDOWN = 60;

export default function VerifyEmail() {
  const { sendVerificationEmail, checkEmailVerified, logout } = useAuth();
  const navigate = useNavigate();

  const [countdown, setCountdown] = useState(0);
  const [isSending, setIsSending] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [noSession, setNoSession] = useState(false);
  const [verifiedSuccess, setVerifiedSuccess] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Determine the masked email to display
  const currentUser = auth.currentUser;
  const userEmail = currentUser?.email ?? "";

  // If there is no Firebase user at all when the page loads, show a fallback.
  useEffect(() => {
    if (!auth.currentUser) {
      setNoSession(true);
    }
  }, []);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const startCountdown = () => {
    setCountdown(RESEND_COOLDOWN);
    timerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          timerRef.current = null;
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleResend = async () => {
    if (countdown > 0 || isSending) return;
    setIsSending(true);
    try {
      await sendVerificationEmail();
      startCountdown();
    } catch {
      // Toast is shown in context
    } finally {
      setIsSending(false);
    }
  };

  const handleCheckVerified = async () => {
    if (isChecking) return;
    setIsChecking(true);
    try {
      const verified = await checkEmailVerified();
      if (verified) {
        setVerifiedSuccess(true);
        toast.success("Email verified! Welcome to Loqta Zone 🎉");
        setTimeout(() => navigate("/"), 1800);
      } else {
        toast.error("Email not verified yet. Please check your inbox.");
      }
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsChecking(false);
    }
  };

  // ── Success screen ─────────────────────────────────────────────────────────
  if (verifiedSuccess) {
    return (
      <div className="w-full space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="flex justify-center">
          <div className="w-24 h-24 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center shadow-lg shadow-green-500/20">
            <CheckCircle className="w-12 h-12 text-green-600 dark:text-green-400" />
          </div>
        </div>
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-green-600 to-emerald-500 bg-clip-text text-transparent">
            Verified!
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Your account is confirmed. Redirecting you now…
          </p>
        </div>
      </div>
    );
  }

  // ── No session screen ──────────────────────────────────────────────────────
  if (noSession) {
    return (
      <div className="w-full space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="flex justify-center">
          <div className="w-24 h-24 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shadow-lg shadow-amber-500/20">
            <AlertCircle className="w-12 h-12 text-amber-600 dark:text-amber-400" />
          </div>
        </div>
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-[#2A4863] to-[#2A4863] bg-clip-text text-transparent">
            Session Expired
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            We couldn't find your account session. Please sign in again or create a new account.
          </p>
        </div>
        <div className="flex flex-col gap-3">
          <Button variant="primary" size="lg" fullWidth onClick={() => navigate("/login")}>
            Back to Login
          </Button>
          <Button variant="outline" size="lg" fullWidth onClick={() => navigate("/register")}>
            Create Account
          </Button>
        </div>
      </div>
    );
  }

  // ── Main verification screen ───────────────────────────────────────────────
  return (
    <div className="w-full space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">

      {/* Animated envelope icon */}
      <div className="flex justify-center">
        <div className="relative">
          {/* Outer pulse ring */}
          <div
            className="absolute inset-0 rounded-full opacity-20"
            style={{
              background: "radial-gradient(circle, #2A4863 0%, transparent 70%)",
              animation: "ping 2s cubic-bezier(0, 0, 0.2, 1) infinite",
              scale: "1.6",
            }}
          />
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#2A4863]/10 to-blue-100/50 dark:from-[#2A4863]/20 dark:to-blue-900/20 border-2 border-[#2A4863]/20 flex items-center justify-center shadow-lg shadow-[#2A4863]/10">
            <Mail className="w-12 h-12 text-[#2A4863] dark:text-blue-400" style={{ animation: "bounce 2s ease-in-out infinite" }} />
          </div>
        </div>
      </div>

      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-[#2A4863] to-[#2A4863] dark:from-[#2A4863] dark:to-blue-400 bg-clip-text text-transparent">
          Verify Your Email
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          We've sent a verification link to
        </p>
        {userEmail && (
          <p className="font-semibold text-gray-900 dark:text-white text-base">
            {userEmail}
          </p>
        )}
      </div>

      {/* Instruction card */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border-2 border-[#2A4863]/20 dark:border-blue-800/40 rounded-xl p-5 space-y-3">
        <h3 className="font-semibold text-gray-900 dark:text-white text-sm">
          What to do next:
        </h3>
        <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
          {[
            "Open the email we sent you",
            "Click the \"Verify Email\" button in the email",
            "Come back here and click \"I've Verified My Email\"",
            "Check your spam folder if you don't see it",
          ].map((step, i) => (
            <li key={i} className="flex items-start gap-2">
              <span
                className="flex-shrink-0 w-5 h-5 rounded-full text-xs font-bold flex items-center justify-center mt-0.5"
                style={{ backgroundColor: "rgba(42,72,99,0.12)", color: "#2A4863" }}
              >
                {i + 1}
              </span>
              <span>{step}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Primary action: I've Verified */}
      <Button
        variant="primary"
        size="lg"
        fullWidth
        icon={<CheckCircle className="w-5 h-5" />}
        iconPosition="right"
        loading={isChecking}
        disabled={isChecking}
        onClick={handleCheckVerified}
      >
        {isChecking ? "Checking…" : "I've Verified My Email"}
      </Button>

      {/* Resend button with countdown */}
      <div className="space-y-2">
        <Button
          variant="outline"
          size="lg"
          fullWidth
          icon={<RotateCcw className={`w-4 h-4 ${isSending ? "animate-spin" : ""}`} />}
          iconPosition="left"
          loading={isSending}
          disabled={countdown > 0 || isSending}
          onClick={handleResend}
        >
          {isSending
            ? "Sending…"
            : countdown > 0
            ? `Resend in ${countdown}s`
            : "Resend Verification Email"}
        </Button>

        {/* Cooldown progress bar */}
        {countdown > 0 && (
          <div className="w-full h-1 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${(countdown / RESEND_COOLDOWN) * 100}%`,
                background: "linear-gradient(90deg, #2A4863, #4a7a9b)",
                transition: "width 1s linear",
              }}
            />
          </div>
        )}
      </div>

      {/* Divider + back to login */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-200 dark:border-gray-700" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-4 bg-white dark:bg-gray-900 text-gray-500">or</span>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <p className="text-center text-sm text-gray-600 dark:text-gray-400">
          Wrong email address?{" "}
          <button
            onClick={async () => {
              await logout();
              navigate("/register");
            }}
            className="font-semibold text-[#2A4863] hover:opacity-75 transition-opacity"
          >
            Register again
          </button>
        </p>
        <p className="text-center text-sm text-gray-600 dark:text-gray-400">
          Already verified and can't log in?{" "}
          <Link
            to="/login"
            className="font-semibold text-[#2A4863] hover:opacity-75 transition-opacity inline-flex items-center gap-1"
          >
            <LogIn className="w-3.5 h-3.5" />
            Back to Login
          </Link>
        </p>
      </div>

      <style>{`
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }
        @keyframes ping {
          75%, 100% { transform: scale(1.6); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
