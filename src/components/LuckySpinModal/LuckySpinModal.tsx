/**
 * LuckySpinModal.tsx
 *
 * "The Lucky Spin" post-auction consolation reward for all non-winning bidders.
 * Expansive luxury 2-column stage with:
 *  - Big wheel on the left with 100% upright, non-inverting horizontal slice text
 *  - Perfect prize showcase panel on the right
 *  - Official Loqta Zone branding logo
 *  - Luxury capsule audio control (no cheap buttons)
 *  - Grand pure-white header title (no top chip)
 *  - No "X" button
 *  - Direct account-credited discount rewards (no voucher codes)
 */

import React, { useState, useEffect, useRef, useMemo } from "react";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import {
  LUCKY_SPIN_PRIZES,
  getUserAuctionLuckySpin,
  claimLuckySpinPrize,
  type LuckySpinPrize,
} from "@/service/luckySpinService/luckySpinService";

interface LuckySpinModalProps {
  auctionId: string;
  userId: string;
  productTitle?: string;
  onClose: () => void;
  onClaim?: (prize: LuckySpinPrize) => void;
}

// ── Realistic Mechanical Wheel Audio Engine ──────────────────────────────────
class RealisticWheelAudio {
  private ctx: AudioContext | null = null;
  public enabled: boolean = true;

  constructor() {
    try {
      const saved = localStorage.getItem("loqta_spin_sound");
      if (saved !== null) {
        this.enabled = saved === "1";
      }
    } catch {
      /* ignore */
    }
  }

  private initCtx() {
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
  }

  public toggle(): boolean {
    this.enabled = !this.enabled;
    try {
      localStorage.setItem("loqta_spin_sound", this.enabled ? "1" : "0");
    } catch {
      /* ignore */
    }
    return this.enabled;
  }

  /**
   * Powerful mechanical ratchet peg click
   */
  public playRatchetClick(intensity: number = 1.0) {
    if (!this.enabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      const vol = Math.max(0.25, Math.min(1.0, intensity));

      // 1. Sharp flapper snap
      const snap = this.ctx.createOscillator();
      const snapGain = this.ctx.createGain();
      snap.type = "sine";
      snap.frequency.setValueAtTime(3600 + Math.random() * 400, now);
      snap.frequency.exponentialRampToValueAtTime(800, now + 0.012);
      snapGain.gain.setValueAtTime(0.45 * vol, now);
      snapGain.gain.exponentialRampToValueAtTime(0.001, now + 0.014);
      snap.connect(snapGain);
      snapGain.connect(this.ctx.destination);
      snap.start(now);
      snap.stop(now + 0.014);

      // 2. Wooden/acrylic peg thump
      const body = this.ctx.createOscillator();
      const bodyGain = this.ctx.createGain();
      body.type = "triangle";
      body.frequency.setValueAtTime(540 + Math.random() * 60, now);
      body.frequency.exponentialRampToValueAtTime(140, now + 0.026);
      bodyGain.gain.setValueAtTime(0.55 * vol, now);
      bodyGain.gain.exponentialRampToValueAtTime(0.001, now + 0.028);
      body.connect(bodyGain);
      bodyGain.connect(this.ctx.destination);
      body.start(now);
      body.stop(now + 0.028);

      // 3. Transient friction texture
      const bufferSize = Math.floor(this.ctx.sampleRate * 0.008);
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const channel = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        channel[i] = (Math.random() * 2 - 1) * 0.35;
      }
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;
      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(0.35 * vol, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.008);
      noise.connect(noiseGain);
      noiseGain.connect(this.ctx.destination);
      noise.start(now);
    } catch {
      /* ignore */
    }
  }

  /**
   * Triumphant golden celebration fanfare
   */
  public playWinFanfare() {
    if (!this.enabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const chords = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
      chords.forEach((freq, idx) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        const t0 = this.ctx!.currentTime + idx * 0.09;
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, t0);
        gain.gain.setValueAtTime(0, t0);
        gain.gain.linearRampToValueAtTime(0.28, t0 + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.45);
        osc.connect(gain);
        gain.connect(this.ctx!.destination);
        osc.start(t0);
        osc.stop(t0 + 0.45);
      });
    } catch {
      /* ignore */
    }
  }

  /**
   * Cash/reward claim celebration chime
   */
  public playClaimSound() {
    if (!this.enabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      // High pleasant celebratory chime: C5, E5, G5, C6, E6
      const freqs = [523.25, 659.25, 783.99, 1046.5, 1318.51];
      freqs.forEach((freq, idx) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        const t0 = now + idx * 0.08;
        osc.type = "triangle";
        osc.frequency.setValueAtTime(freq, t0);
        gain.gain.setValueAtTime(0, t0);
        gain.gain.linearRampToValueAtTime(0.32, t0 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.65);
        osc.connect(gain);
        gain.connect(this.ctx!.destination);
        osc.start(t0);
        osc.stop(t0 + 0.65);
      });
    } catch {
      /* ignore */
    }
  }
}

const audioFX = new RealisticWheelAudio();

export default function LuckySpinModal({
  auctionId,
  userId,
  productTitle,
  onClose,
  onClaim,
}: LuckySpinModalProps) {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === "ar";

  const [visible, setVisible] = useState(false);
  const [loadingExisting, setLoadingExisting] = useState(true);
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [wonPrize, setWonPrize] = useState<LuckySpinPrize | null>(null);
  const [spinAgainNotice, setSpinAgainNotice] = useState(false);
  const [soundOn, setSoundOn] = useState(audioFX.enabled);
  const [isClaimed, setIsClaimed] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);

  const pointerRef = useRef<HTMLDivElement | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const lastAngleRef = useRef(0);
  const claimInFlightRef = useRef(false);

  const numSlices = LUCKY_SPIN_PRIZES.length; // 6
  const sliceAngle = 360 / numSlices; // 60°
  const pegInterval = 30; // 12 pegs = 1 peg every 30°

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 80);
    let cancelled = false;

    getUserAuctionLuckySpin(userId, auctionId)
      .then((existing) => {
        if (cancelled || !existing) return;
        const prize = LUCKY_SPIN_PRIZES.find((p) => p.id === existing.prizeId);
        if (!prize) return;
        claimInFlightRef.current = true;
        setWonPrize(prize);
        setIsClaimed(true);
        const targetIndex = LUCKY_SPIN_PRIZES.findIndex((p) => p.id === prize.id);
        if (targetIndex >= 0) {
          const sliceCenterAngle = targetIndex * sliceAngle;
          const baseTargetAngle = (360 - sliceCenterAngle) % 360;
          setRotation(baseTargetAngle);
          lastAngleRef.current = baseTargetAngle;
        }
      })
      .catch((err) => {
        console.warn("[LuckySpinModal] Failed to load existing spin:", err);
      })
      .finally(() => {
        if (!cancelled) setLoadingExisting(false);
      });

    return () => {
      cancelled = true;
      clearTimeout(timer);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [auctionId, userId, sliceAngle]);

  const toggleSound = () => {
    const state = audioFX.toggle();
    setSoundOn(state);
  };

  const finishClaimedPrize = (prize: LuckySpinPrize) => {
    claimInFlightRef.current = true;
    setIsClaimed(true);
    setWonPrize(prize);
    setShowCelebration(true);
    audioFX.playClaimSound();
    onClaim?.(prize);
    setTimeout(() => onClose(), 2200);
  };

  const handleClaim = async () => {
    if (claiming) return;
    if (isClaimed) {
      onClose();
      return;
    }
  };

  const handleSpin = async () => {
    if (
      spinning ||
      loadingExisting ||
      isClaimed ||
      claimInFlightRef.current ||
      (wonPrize && !spinAgainNotice)
    )
      return;

    setSpinning(true);
    setSpinAgainNotice(false);
    setWonPrize(null);
    setClaiming(true);

    let prize: LuckySpinPrize;
    try {
      // Server rolls + persists (except spin_again). Client cannot forge prizes.
      const result = await claimLuckySpinPrize(auctionId);
      prize = result.prize;

      if (result.alreadyClaimed) {
        setClaiming(false);
        setSpinning(false);
        finishClaimedPrize(prize);
        return;
      }
    } catch (err: any) {
      console.error("[LuckySpinModal] claimLuckySpin failed:", err);
      setSpinning(false);
      setClaiming(false);
      toast.error(
        err?.message ??
          t("luckySpin.claimFailed", "Could not save your reward. Please try again."),
      );
      return;
    }

    setClaiming(false);

    const targetIndex = Math.max(
      0,
      LUCKY_SPIN_PRIZES.findIndex((p) => p.id === prize.id),
    );

    const sliceCenterAngle = targetIndex * sliceAngle;
    const baseTargetAngle = (360 - sliceCenterAngle) % 360;

    const fullSpins = 6 + Math.floor(Math.random() * 3);
    const randomJitter = (Math.random() - 0.5) * 16;

    const currentRotationMod = lastAngleRef.current % 360;
    const additionalAngle =
      fullSpins * 360 +
      ((baseTargetAngle - currentRotationMod + 360) % 360) +
      randomJitter;

    const startAngle = lastAngleRef.current;
    const endAngle = startAngle + additionalAngle;
    lastAngleRef.current = endAngle;

    const duration = 4800; // ms
    const startTime = performance.now();
    let lastTime = startTime;

    let needleAngle = 0;
    let needleVelocity = 0;
    let wasInContact = false;

    const step = (now: number) => {
      const dt = Math.min(0.033, Math.max(0.001, (now - lastTime) / 1000));
      lastTime = now;

      const elapsed = now - startTime;
      const progress = Math.min(1.0, elapsed / duration);

      const eased = 1 - Math.pow(1 - progress, 3.8);
      const currentAngle = startAngle + (endAngle - startAngle) * eased;

      const pegPhase = currentAngle % pegInterval;
      const inContact = pegPhase >= 16 && pegPhase < 29.4;
      const speedFactor = Math.max(0, 1 - Math.pow(progress, 1.8));

      if (inContact && speedFactor > 0.012) {
        const contactFraction = (pegPhase - 16) / (29.4 - 16);
        const targetPush =
          Math.sin(contactFraction * (Math.PI * 0.5)) * (18 + 7 * speedFactor);
        needleAngle = targetPush;
        needleVelocity = 0;
        wasInContact = true;
      } else {
        if (wasInContact) {
          wasInContact = false;
          audioFX.playRatchetClick(speedFactor);
          needleVelocity = -520 * (0.35 + 0.65 * speedFactor);
        }

        const springForce = -3200 * needleAngle - 70 * needleVelocity;
        needleVelocity += springForce * dt;
        needleAngle += needleVelocity * dt;
      }

      if (pointerRef.current) {
        pointerRef.current.style.transform = `translateX(-50%) rotate(${needleAngle.toFixed(2)}deg)`;
      }

      if (progress < 1.0) {
        animFrameRef.current = requestAnimationFrame(step);
      } else {
        let settleFrames = 0;
        const settleStep = () => {
          settleFrames++;
          needleAngle *= 0.82;
          if (pointerRef.current) {
            pointerRef.current.style.transform = `translateX(-50%) rotate(${needleAngle.toFixed(2)}deg)`;
          }
          if (settleFrames < 16 && Math.abs(needleAngle) > 0.05) {
            requestAnimationFrame(settleStep);
          } else if (pointerRef.current) {
            pointerRef.current.style.transform = `translateX(-50%) rotate(0deg)`;
          }
        };
        requestAnimationFrame(settleStep);
      }
    };

    animFrameRef.current = requestAnimationFrame(step);
    setRotation(endAngle);

    setTimeout(() => {
      setSpinning(false);
      audioFX.playRatchetClick(0.35);

      if (prize.isSpinAgain) {
        setSpinAgainNotice(true);
      } else {
        setWonPrize(prize);
        audioFX.playWinFanfare();
        finishClaimedPrize(prize);
      }
    }, duration);
  };

  // Center & radius of wheel SVG
  const radius = 170;
  const center = 190; // viewBox 0 0 380 380
  const centroidRadius = 116;

  // Wheel wedges & counter-rotating non-inverting text
  const slicesSvg = useMemo(() => {
    return LUCKY_SPIN_PRIZES.map((prize, i) => {
      const startAngle = (i * sliceAngle - sliceAngle / 2) * (Math.PI / 180);
      const endAngle = (i * sliceAngle + sliceAngle / 2) * (Math.PI / 180);

      const x1 = center + radius * Math.sin(startAngle);
      const y1 = center - radius * Math.cos(startAngle);
      const x2 = center + radius * Math.sin(endAngle);
      const y2 = center - radius * Math.cos(endAngle);

      const pathData = `M ${center} ${center} L ${x1} ${y1} A ${radius} ${radius} 0 0 1 ${x2} ${y2} Z`;

      // Centroid in wheel space
      const midAngleRad = (i * sliceAngle) * (Math.PI / 180);
      const cx = center + centroidRadius * Math.sin(midAngleRad);
      const cy = center - centroidRadius * Math.cos(midAngleRad);

      return (
        <g key={prize.id} className="lz-slice-group">
          {/* Slice wedge */}
          <path
            d={pathData}
            fill={prize.isFree ? "url(#goldGradient)" : prize.color}
            stroke="rgba(201,169,110,0.35)"
            strokeWidth="1.5"
            className={`lz-slice ${wonPrize?.id === prize.id ? "lz-won-slice" : ""}`}
          />

          {/* 
            Counter-rotating Text Group:
            When the wheel rotates by `rotation`, this group counter-rotates by `-rotation`
            around its own center (cx, cy) with the EXACT same easing curve!
            This ensures EVERY text label remains 100% horizontal & upright at ALL times!
          */}
          <g
            className="lz-slice-text-counter"
            style={{
              transform: `translate(${cx}px, ${cy}px) rotate(${-rotation}deg)`,
              transformOrigin: "0px 0px",
              transition: spinning
                ? "transform 4.8s cubic-bezier(0.12, 0.8, 0.15, 1.0)"
                : "none",
            }}
          >
            {prize.id === "10_off" && (
              <>
                <text
                  x="0"
                  y="-6"
                  textAnchor="middle"
                  fill="#ffffff"
                  fontSize="20"
                  fontWeight="900"
                  fontFamily="'Outfit', system-ui, sans-serif"
                  letterSpacing="0.02em"
                >
                  10%
                </text>
                <text
                  x="0"
                  y="14"
                  textAnchor="middle"
                  fill="#e5e0c6"
                  fontSize="14"
                  fontWeight="800"
                  fontFamily="'Outfit', system-ui, sans-serif"
                  letterSpacing="0.05em"
                >
                  OFF
                </text>
              </>
            )}

            {prize.id === "25_off" && (
              <>
                <text
                  x="0"
                  y="-6"
                  textAnchor="middle"
                  fill="#ffffff"
                  fontSize="20"
                  fontWeight="900"
                  fontFamily="'Outfit', system-ui, sans-serif"
                  letterSpacing="0.02em"
                >
                  25%
                </text>
                <text
                  x="0"
                  y="14"
                  textAnchor="middle"
                  fill="#e5e0c6"
                  fontSize="14"
                  fontWeight="800"
                  fontFamily="'Outfit', system-ui, sans-serif"
                  letterSpacing="0.05em"
                >
                  OFF
                </text>
              </>
            )}

            {prize.id === "50_off" && (
              <>
                <text
                  x="0"
                  y="-6"
                  textAnchor="middle"
                  fill="#ffffff"
                  fontSize="20"
                  fontWeight="900"
                  fontFamily="'Outfit', system-ui, sans-serif"
                  letterSpacing="0.02em"
                >
                  50%
                </text>
                <text
                  x="0"
                  y="14"
                  textAnchor="middle"
                  fill="#e5e0c6"
                  fontSize="14"
                  fontWeight="800"
                  fontFamily="'Outfit', system-ui, sans-serif"
                  letterSpacing="0.05em"
                >
                  OFF
                </text>
              </>
            )}

            {prize.id === "75_off" && (
              <>
                <text
                  x="0"
                  y="-6"
                  textAnchor="middle"
                  fill="#ffffff"
                  fontSize="20"
                  fontWeight="900"
                  fontFamily="'Outfit', system-ui, sans-serif"
                  letterSpacing="0.02em"
                >
                  75%
                </text>
                <text
                  x="0"
                  y="14"
                  textAnchor="middle"
                  fill="#e5e0c6"
                  fontSize="14"
                  fontWeight="800"
                  fontFamily="'Outfit', system-ui, sans-serif"
                  letterSpacing="0.05em"
                >
                  OFF
                </text>
              </>
            )}

            {prize.id === "free_entry" && (
              <text
                x="0"
                y="6"
                textAnchor="middle"
                fill="#09131e"
                fontSize="22"
                fontWeight="950"
                fontFamily="'Outfit', system-ui, sans-serif"
                letterSpacing="0.04em"
              >
                FREE
              </text>
            )}

            {prize.id === "spin_again" && (
              <>
                <text
                  x="0"
                  y="-6"
                  textAnchor="middle"
                  fill="#ffffff"
                  fontSize="16"
                  fontWeight="900"
                  fontFamily="'Outfit', system-ui, sans-serif"
                  letterSpacing="0.02em"
                >
                  SPIN
                </text>
                <text
                  x="0"
                  y="13"
                  textAnchor="middle"
                  fill="#ffffff"
                  fontSize="14"
                  fontWeight="900"
                  fontFamily="'Outfit', system-ui, sans-serif"
                  letterSpacing="0.02em"
                >
                  AGAIN
                </text>
              </>
            )}
          </g>
        </g>
      );
    });
  }, [sliceAngle, wonPrize, rotation, spinning]);

  return (
    <>
      <style>{LUCKY_SPIN_CSS}</style>

      <div
        className={`lz-grand-overlay ${visible ? "lz-spin-in" : ""}`}
        dir={isRtl ? "rtl" : "ltr"}
      >
        <div className={`lz-grand-modal ${visible ? "lz-spin-in" : ""}`}>
          {/* Confetti Particle Burst on Claim */}
          {showCelebration && (
            <div className="lz-confetti-stage" aria-hidden="true">
              {Array.from({ length: 42 }).map((_, idx) => (
                <span
                  key={idx}
                  className="lz-confetti-piece"
                  style={
                    {
                      "--x": `${(idx % 14) * 7 + (idx % 3) * 2}%`,
                      "--delay": `${(idx * 0.025).toFixed(3)}s`,
                      "--speed": `${1.1 + (idx % 5) * 0.2}s`,
                      "--color":
                        idx % 4 === 0
                          ? "#fed777"
                          : idx % 4 === 1
                          ? "#22c55e"
                          : idx % 4 === 2
                          ? "#ffffff"
                          : "#f59e0b",
                      "--size": `${8 + (idx % 5) * 3}px`,
                    } as React.CSSProperties
                  }
                />
              ))}
            </div>
          )}

          {/* Top Bar with Loqta Zone Logo and Enhanced Sound Control */}
          <div className="lz-grand-topbar">
            {/* Edge 1: Loqta Zone Logo */}
            <div className="lz-brand-edge">
              <img
                src="/loqta-removebg-preview.png"
                alt="Loqta Zone"
                className="lz-brand-logo-img"
              />
            </div>

            {/* Edge 2: Enhanced Luxury Sound Switch */}
            <button
              className="lz-sound-pill-btn"
              onClick={toggleSound}
              title={soundOn ? "Mute Wheel Audio" : "Enable Wheel Audio"}
            >
              <span className="lz-sound-icon-wrap">
                {soundOn ? (
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#fed777"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                    <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
                  </svg>
                ) : (
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="rgba(229,224,198,0.5)"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                    <line x1="23" y1="9" x2="17" y2="15" />
                    <line x1="17" y1="9" x2="23" y2="15" />
                  </svg>
                )}
              </span>
              <span className="lz-sound-text">
                {soundOn
                  ? t("luckySpin.audioOn", "SOUND ON")
                  : t("luckySpin.audioMuted", "MUTED")}
              </span>
              <span className={`lz-sound-dot ${soundOn ? "active" : ""}`} />
            </button>
          </div>

          {/* Grand Header: Pure White Title (No Chip) */}
          <div className="lz-grand-head">
            <h1 className="lz-grand-title">
              {t("luckySpin.title", "THE LUCKY SPIN")}
            </h1>
            <p className="lz-grand-subtitle">
              {t(
                "luckySpin.subtitle",
                "Didn't win the auction? Spin the wheel to unlock your exclusive entry discount for the next event!",
              )}
            </p>
          </div>

          {/* Expansive 2-Column Stage: Big Spinner on Left, Prize Showcase on Right */}
          <div className="lz-showcase-stage">
            {/* ── LEFT: The Big Spinner ── */}
            <div className="lz-left-wheel-col">
              <div className="lz-wheel-stage">
                {/* 3D Faceted Spring-Damper Arrow Pointer at 12 o'clock */}
                <div ref={pointerRef} className="lz-wheel-pointer">
                  <svg
                    width="38"
                    height="46"
                    viewBox="0 0 38 46"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <defs>
                      <linearGradient
                        id="needleLeft"
                        x1="4"
                        y1="5"
                        x2="19"
                        y2="44"
                        gradientUnits="userSpaceOnUse"
                      >
                        <stop stopColor="#ffffff" />
                        <stop offset="0.45" stopColor="#fed777" />
                        <stop offset="1" stopColor="#e5a93c" />
                      </linearGradient>
                      <linearGradient
                        id="needleRight"
                        x1="19"
                        y1="5"
                        x2="34"
                        y2="44"
                        gradientUnits="userSpaceOnUse"
                      >
                        <stop stopColor="#f7df9e" />
                        <stop offset="0.45" stopColor="#d49727" />
                        <stop offset="1" stopColor="#aa7114" />
                      </linearGradient>
                      <linearGradient
                        id="pinRim"
                        x1="13"
                        y1="6"
                        x2="25"
                        y2="17"
                        gradientUnits="userSpaceOnUse"
                      >
                        <stop stopColor="#ffffff" />
                        <stop offset="0.5" stopColor="#c9a96e" />
                        <stop offset="1" stopColor="#543e12" />
                      </linearGradient>
                    </defs>

                    {/* Left faceted wing */}
                    <path
                      d="M19 44L4 8C3.2 6.5 4.3 5 6 5H19V44Z"
                      fill="url(#needleLeft)"
                    />
                    {/* Right faceted wing */}
                    <path
                      d="M19 44V5H32C33.7 5 34.8 6.5 34 8L19 44Z"
                      fill="url(#needleRight)"
                    />
                    {/* Outer border */}
                    <path
                      d="M19 44L4 8C3.2 6.5 4.3 5 6 5H32C33.7 5 34.8 6.5 34 8L19 44Z"
                      stroke="#ffffff"
                      strokeWidth="2.2"
                      strokeLinejoin="round"
                    />

                    {/* Top Hinge Pivot Screw */}
                    <circle
                      cx="19"
                      cy="11.5"
                      r="5.5"
                      fill="url(#pinRim)"
                      stroke="#ffffff"
                      strokeWidth="1.2"
                    />
                    <circle cx="19" cy="11.5" r="3" fill="#09131e" />
                    <circle
                      cx="17.8"
                      cy="10.3"
                      r="1"
                      fill="rgba(255,255,255,0.75)"
                    />
                  </svg>
                </div>

                {/* Rotating Big SVG Wheel */}
                <div className="lz-wheel-rim-wrapper">
                  <svg
                    className="lz-wheel-svg"
                    viewBox="0 0 380 380"
                  >
                    <defs>
                      <linearGradient
                        id="goldGradient"
                        x1="0"
                        y1="0"
                        x2="1"
                        y2="1"
                      >
                        <stop offset="0%" stopColor="#f5b842" />
                        <stop offset="50%" stopColor="#e5a93c" />
                        <stop offset="100%" stopColor="#d19124" />
                      </linearGradient>

                      <linearGradient
                        id="rimGradient"
                        x1="0"
                        y1="0"
                        x2="1"
                        y2="1"
                      >
                        <stop offset="0%" stopColor="#fed777" />
                        <stop offset="35%" stopColor="#c9a96e" />
                        <stop offset="70%" stopColor="#e5a93c" />
                        <stop offset="100%" stopColor="#967434" />
                      </linearGradient>

                      <filter
                        id="wheelShadow"
                        x="-10%"
                        y="-10%"
                        width="120%"
                        height="120%"
                      >
                        <feDropShadow
                          dx="0"
                          dy="8"
                          stdDeviation="12"
                          floodColor="#000000"
                          floodOpacity="0.6"
                        />
                      </filter>
                    </defs>

                    {/* Outer Rim Frame */}
                    <circle
                      cx="190"
                      cy="190"
                      r="184"
                      fill="none"
                      stroke="url(#rimGradient)"
                      strokeWidth="11"
                      filter="url(#wheelShadow)"
                    />
                    <circle
                      cx="190"
                      cy="190"
                      r="174"
                      fill="#08101a"
                      stroke="rgba(201,169,110,0.5)"
                      strokeWidth="2"
                    />

                    {/* 12 Outer Pegs */}
                    {Array.from({ length: 12 }).map((_, idx) => {
                      const pegAngle = (idx * 30 * Math.PI) / 180;
                      const px = 190 + 179 * Math.sin(pegAngle);
                      const py = 190 - 179 * Math.cos(pegAngle);
                      return (
                        <circle
                          key={idx}
                          cx={px}
                          cy={py}
                          r="3.4"
                          fill="#fceda4"
                          stroke="#6c5018"
                          strokeWidth="1"
                        />
                      );
                    })}

                    {/* Rotating Rotor Group */}
                    <g
                      style={{
                        transform: `rotate(${rotation}deg)`,
                        transformOrigin: "190px 190px",
                        transition: spinning
                          ? "transform 4.8s cubic-bezier(0.12, 0.8, 0.15, 1.0)"
                          : "none",
                      }}
                    >
                      {slicesSvg}
                    </g>
                  </svg>

                  {/* Center Hub */}
                  <div
                    className={`lz-center-spin-btn ${spinning ? "lz-btn-spinning" : ""}`}
                    onClick={handleSpin}
                    role="button"
                    tabIndex={0}
                    aria-label="Spin the wheel"
                  >
                    <div className="lz-center-btn-inner">
                      {spinning ? (
                        <div className="lz-hub-clean-loader" title="Spinning...">
                          <svg
                            className="lz-hub-loader-svg"
                            width="28"
                            height="28"
                            viewBox="0 0 24 24"
                            fill="none"
                          >
                            <circle
                              cx="12"
                              cy="12"
                              r="9"
                              stroke="rgba(11, 21, 33, 0.2)"
                              strokeWidth="2.5"
                            />
                            <path
                              d="M12 3 A 9 9 0 0 1 21 12"
                              stroke="#0b1521"
                              strokeWidth="2.5"
                              strokeLinecap="round"
                            />
                          </svg>
                        </div>
                      ) : (
                        <span className="lz-center-spin-text">
                          {t("luckySpin.spinHub", "SPIN")}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ── RIGHT: The Prize Showcase in Perfect Shape ── */}
            <div
              className="lz-right-showcase-col"
              style={{
                direction: isRtl ? "rtl" : "ltr",
                textAlign: isRtl ? "right" : "left",
              }}
            >
              {/* Outcome 1: Won Prize Showcase (Direct Reward, No Voucher Code) */}
              {wonPrize && (
                <div className="lz-prize-showcase-card lz-prize-won-card">
                  <div className="lz-reward-badge-ribbon">
                    <span className="lz-badge-star">✦</span>
                    {t("luckySpin.wonTag", "EXCLUSIVE BIDDER REWARD")}
                    <span className="lz-badge-star">✦</span>
                  </div>

                  <div className="lz-prize-hero-row">
                    <div className="lz-prize-trophy-circle">
                      {wonPrize.isFree ? "🌟" : "🎁"}
                    </div>
                    <div className="lz-prize-headline-col">
                      <span className="lz-prize-super-title">
                        {t("luckySpin.congrats", "CONGRATULATIONS!")}
                      </span>
                      <h2 className="lz-prize-amount-title">
                        {wonPrize.isFree
                          ? isRtl
                            ? "دخول مجاني بالكامل 100%!"
                            : "100% FREE ENTRY WON!"
                          : isRtl
                          ? `خصم ${wonPrize.percent}% على رسوم الدخول!`
                          : `${wonPrize.percent}% OFF NEXT ENTRY FEE!`}
                      </h2>
                    </div>
                  </div>

                  <p className="lz-prize-instruction">
                    {t(
                      "luckySpin.youWon",
                      "Your entry fee discount has been auto-credited to your account for your next auction room.",
                    )}
                  </p>

                  <div className="lz-reward-perks-box">
                    <div className="lz-perk-item">
                      <span className="lz-perk-check">✓</span>
                      <span>
                        {isRtl
                          ? "سيتم تطبيق الخصم تلقائياً عند تسجيل المزاد القادم"
                          : "Automatically applied at checkout on your next auction registration"}
                      </span>
                    </div>
                    <div className="lz-perk-item">
                      <span className="lz-perk-check">✓</span>
                      <span>
                        {isRtl
                          ? "صالح لجميع المزادات القادمة في منصة لقطة زون"
                          : "Valid for all upcoming auctions across Loqta Zone"}
                      </span>
                    </div>
                  </div>

                  {showCelebration && (
                    <div className="lz-claim-celebrate-toast">
                      <span className="lz-celebrate-toast-icon">🎉</span>
                      <div className="lz-celebrate-toast-content">
                        <strong>
                          {isRtl
                            ? "تم استلام الخصم بنجاح!"
                            : "Reward Claimed & Activated!"}
                        </strong>
                        <span>
                          {isRtl
                            ? "تم حفظ الخصم وسيطبق آلياً عند تسجيل مزادك القادم."
                            : "Your entry discount is safely applied to your next auction registration."}
                        </span>
                      </div>
                    </div>
                  )}

                  <button
                    className={`lz-claim-cta-btn ${isClaimed ? "lz-btn-claimed" : ""}`}
                    onClick={handleClaim}
                    disabled={claiming}
                  >
                    {claiming ? (
                      <>
                        <span className="lz-spin-circle-loader" />
                        <span>
                          {isRtl ? "جارٍ الحفظ…" : "Saving reward…"}
                        </span>
                      </>
                    ) : isClaimed ? (
                      <>
                        <span className="lz-claim-check-anim">✓</span>
                        <span>
                          {isRtl
                            ? "تم الاستلام — متابعة"
                            : "Claimed — Continue"}
                        </span>
                      </>
                    ) : (
                      t("luckySpin.claimAndContinue", "Claim Reward & Continue")
                    )}
                  </button>
                </div>
              )}

              {/* Outcome 2: Free Re-Spin Showcase */}
              {spinAgainNotice && (
                <div className="lz-prize-showcase-card lz-prize-respin-card">
                  <div className="lz-respin-icon-hero">🎉</div>
                  <h2 className="lz-respin-title">
                    {t("luckySpin.spinAgainTitle", "FREE RE-SPIN UNLOCKED!")}
                  </h2>
                  <p className="lz-respin-desc">
                    {t(
                      "luckySpin.spinAgainDesc",
                      "You hit the lucky re-spin! Give the wheel another whirl and claim your prize.",
                    )}
                  </p>

                  <button
                    className="lz-grand-spin-btn lz-pulse-glow-btn"
                    onClick={handleSpin}
                    disabled={spinning || loadingExisting}
                  >
                    <span className="lz-btn-icon">↺</span>
                    {t("luckySpin.spinAgainAction", "Spin Again Now!")}
                  </button>
                </div>
              )}

              {/* Outcome 3: Initial Ready to Spin / Spinning State */}
              {!wonPrize && !spinAgainNotice && (
                <div className="lz-prize-showcase-card lz-prize-ready-card">
                  <div className="lz-ready-head-block">
                    <span className="lz-ready-tag">
                      ✦ {isRtl ? "فرصة حصرية لكل متزايد" : "EXCLUSIVE SECOND CHANCE"}
                    </span>
                    <h3 className="lz-ready-main-title">
                      {isRtl
                        ? "لم يحالفك الحظ؟ دوّر واربح!"
                        : "Didn't Win? You're in Luck!"}
                    </h3>
                    <p className="lz-ready-body">
                      {isRtl
                        ? "كل متزايد لم يفز بالحدث يحصل على فرصة حصرية لتدوير عجلة الحظ والفوز بخصم فوري على رسوم الدخول لمزاده القادم!"
                        : "Every bidder who doesn't win receives an exclusive free spin on our consolation wheel. Spin to discount your entry fee for the next auction or get 100% free entry!"}
                    </p>
                  </div>

                  {/* 3 Luxury Perk Showcase Badges */}
                  <div className="lz-perks-trio-grid">
                    <div className="lz-trio-badge">
                      <span className="lz-trio-icon">🏷️</span>
                      <div className="lz-trio-texts">
                        <strong>
                          {t("luckySpin.perks.discounts", "Up to 75% OFF")}
                        </strong>
                        <span>
                          {isRtl
                            ? "خصومات كبرى على الدخول"
                            : "Big entry fee discounts"}
                        </span>
                      </div>
                    </div>

                    <div className="lz-trio-badge lz-trio-gold">
                      <span className="lz-trio-icon">🌟</span>
                      <div className="lz-trio-texts">
                        <strong>
                          {t("luckySpin.perks.free", "100% Free Entry")}
                        </strong>
                        <span>
                          {isRtl
                            ? "دخول مجاني بالكامل"
                            : "Golden slice free pass"}
                        </span>
                      </div>
                    </div>

                    <div className="lz-trio-badge">
                      <span className="lz-trio-icon lz-trio-icon-retry">↺</span>
                      <div className="lz-trio-texts">
                        <strong>
                          {t("luckySpin.perks.respin", "Extra Re-Spins")}
                        </strong>
                        <span>
                          {isRtl
                            ? "فرص إضافية للتدوير"
                            : "Instant re-spin chances"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Grand Action Button */}
                  <div className="lz-action-wrapper">
                    <button
                      className={`lz-grand-spin-btn ${spinning || loadingExisting ? "disabled" : ""}`}
                      onClick={handleSpin}
                      disabled={spinning || loadingExisting}
                    >
                      {spinning ? (
                        <>
                          <span className="lz-spin-circle-loader" />
                          <span>
                            {t("luckySpin.spinning", "Spinning… Good Luck!")}
                          </span>
                        </>
                      ) : (
                        <>
                          <span className="lz-btn-icon">⚡</span>
                          <span>
                            {t("luckySpin.spinBtn", "SPIN THE WHEEL")}
                          </span>
                        </>
                      )}
                    </button>
                    <div className="lz-action-footnote">
                      {isRtl
                        ? "إضغط على الزر أو على منتصف العجلة للتدوير"
                        : "Click the button or tap SPIN in the center hub"}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ── Grand Luxury Stylesheet ──────────────────────────────────────────────────
const LUCKY_SPIN_CSS = `
@keyframes lz-backdrop-fade { from { opacity: 0; } to { opacity: 1; } }
@keyframes lz-scale-in { 
  from { opacity: 0; transform: translateY(24px) scale(0.97); } 
  to { opacity: 1; transform: translateY(0) scale(1); } 
}
@keyframes lz-pulse-glow {
  0% { box-shadow: 0 0 0 0 rgba(229, 169, 60, 0.6); }
  70% { box-shadow: 0 0 0 16px rgba(229, 169, 60, 0); }
  100% { box-shadow: 0 0 0 0 rgba(229, 169, 60, 0); }
}
@keyframes lz-spin { to { transform: rotate(360deg); } }

/* Full-Screen Grand Overlay */
.lz-grand-overlay {
  position: fixed;
  inset: 0;
  z-index: 1250;
  background: radial-gradient(ellipse at 50% 25%, #101c2c 0%, #08111c 65%, #04080e 100%);
  backdrop-filter: blur(28px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  font-family: 'Outfit', system-ui, -apple-system, sans-serif;
  opacity: 0;
  transition: opacity 0.4s ease;
  overflow-y: auto;
}
.lz-grand-overlay.lz-spin-in {
  opacity: 1;
}

/* Grand Modal Container */
.lz-grand-modal {
  background: rgba(13, 22, 33, 0.92);
  border: 1px solid rgba(201, 169, 110, 0.32);
  box-shadow: 0 32px 100px rgba(0, 0, 0, 0.88), inset 0 1px 0 rgba(255, 255, 255, 0.1);
  border-radius: 30px;
  padding: 26px 42px 34px;
  width: min(96vw, 1180px);
  min-height: min(88vh, 720px);
  position: relative;
  display: flex;
  flex-direction: column;
  transform: translateY(24px) scale(0.97);
  transition: transform 0.45s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.45s ease;
}
.lz-grand-modal.lz-spin-in {
  transform: translateY(0) scale(1);
}

/* Top Bar: Positioned at top edges with zero content collision */
.lz-grand-topbar {
  position: absolute;
  top: 10px;
  left: 24px;
  right: 32px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  pointer-events: none;
  z-index: 30;
}

.lz-brand-edge {
  pointer-events: auto;
  display: flex;
  align-items: center;
}
.lz-brand-logo-img {
  height: 130px;
  width: auto;
  object-fit: contain;
  margin-top: -14px;
  margin-left: -14px;
  filter: drop-shadow(0 4px 22px rgba(201, 169, 110, 0.7));
  transition: transform 0.25s ease;
  user-select: none;
}
.lz-brand-logo-img:hover {
  transform: scale(1.05);
}

/* Luxury Sound Control Pill */
.lz-sound-pill-btn {
  pointer-events: auto;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.06) 0%, rgba(201, 169, 110, 0.1) 100%);
  border: 1px solid rgba(201, 169, 110, 0.42);
  box-shadow: 0 4px 18px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.15);
  border-radius: 999px;
  padding: 8px 16px;
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  transition: all 0.25s ease;
  font-family: 'Outfit', system-ui, sans-serif;
}
.lz-sound-pill-btn:hover {
  background: linear-gradient(135deg, rgba(201, 169, 110, 0.15) 0%, rgba(201, 169, 110, 0.25) 100%);
  border-color: rgba(254, 215, 119, 0.65);
  box-shadow: 0 0 20px rgba(201, 169, 110, 0.35);
  transform: translateY(-1px);
}
.lz-sound-icon-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
}
.lz-sound-text {
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.12em;
  color: #fed777;
  text-transform: uppercase;
}
.lz-sound-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: rgba(229, 224, 198, 0.25);
  transition: all 0.2s ease;
}
.lz-sound-dot.active {
  background: #22c55e;
  box-shadow: 0 0 10px #22c55e, 0 0 20px rgba(34, 197, 94, 0.4);
}

/* Grand Header with White Title - Lifted up with generous breathing room */
.lz-grand-head {
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 0px;
  margin-bottom: 38px;
  z-index: 10;
}
.lz-grand-title {
  color: #ffffff;
  font-size: 34px;
  font-weight: 900;
  letter-spacing: 0.05em;
  margin: 0;
  text-transform: uppercase;
  text-shadow: 0 2px 24px rgba(255, 255, 255, 0.22), 0 0 40px rgba(201, 169, 110, 0.15);
}
.lz-grand-subtitle {
  color: rgba(229, 224, 198, 0.72);
  font-size: 14px;
  max-width: 640px;
  margin: 0 auto;
  line-height: 1.5;
}

/* ── 2-Column Showcase Stage: Left Spinner, Right Prize Display ── */
.lz-showcase-stage {
  display: grid;
  grid-template-columns: 460px 1fr;
  gap: 48px;
  align-items: center;
  width: 100%;
  flex: 1;
  direction: ltr !important; /* CRITICAL: always keep spinner on left and prize showcase on right */
}

/* ── Left Column: The Big Spinner ── */
.lz-left-wheel-col {
  display: flex;
  justify-content: center;
  align-items: center;
}

.lz-wheel-stage {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
}

/* Top Pointer Needle */
.lz-wheel-pointer {
  position: absolute;
  top: -14px;
  left: 50%;
  transform: translateX(-50%) rotate(0deg);
  transform-origin: 50% 11.5px;
  z-index: 25;
  filter: drop-shadow(0 4px 12px rgba(0, 0, 0, 0.8));
  will-change: transform;
  pointer-events: none;
}

.lz-wheel-rim-wrapper {
  position: relative;
  width: 420px;
  height: 420px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.lz-wheel-svg {
  width: 100%;
  height: 100%;
  display: block;
  user-select: none;
}

.lz-slice {
  transition: filter 0.3s ease;
}
.lz-won-slice {
  filter: brightness(1.22) drop-shadow(0 0 12px rgba(229, 169, 60, 0.8));
}

/* Center Hub Button */
.lz-center-spin-btn {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 88px;
  height: 88px;
  border-radius: 50%;
  background: radial-gradient(circle, #ffe391 0%, #e5a93c 70%, #b87c18 100%);
  border: 3.5px solid #ffffff;
  box-shadow: 0 4px 22px rgba(0, 0, 0, 0.55), inset 0 2px 4px rgba(255, 255, 255, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 20;
  transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.2s ease;
  animation: lz-pulse-glow 2.4s infinite;
}
.lz-center-spin-btn:hover {
  transform: translate(-50%, -50%) scale(1.06);
  box-shadow: 0 6px 26px rgba(229, 169, 60, 0.6), inset 0 2px 6px rgba(255, 255, 255, 0.8);
}
.lz-center-spin-btn:active {
  transform: translate(-50%, -50%) scale(0.96);
}
.lz-btn-spinning {
  pointer-events: none;
  animation: none;
  opacity: 0.9;
}
.lz-center-btn-inner {
  display: flex;
  align-items: center;
  justify-content: center;
}
.lz-center-spin-text {
  font-size: 16px;
  font-weight: 900;
  color: #0b1521;
  letter-spacing: 0.04em;
  font-family: 'Outfit', system-ui, sans-serif;
}

/* ── Right Column: Prize Showcase ── */
.lz-right-showcase-col {
  width: 100%;
  display: flex;
  flex-direction: column;
}

.lz-prize-showcase-card {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(201, 169, 110, 0.24);
  border-radius: 24px;
  padding: 30px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.4);
  animation: lz-scale-in 0.35s ease;
}

/* ── Ready State Card ── */
.lz-ready-head-block {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.lz-ready-tag {
  color: #fed777;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}
.lz-ready-main-title {
  color: #ffffff;
  font-size: 24px;
  font-weight: 800;
  margin: 0;
  line-height: 1.25;
}
.lz-ready-body {
  color: rgba(229, 224, 198, 0.72);
  font-size: 13.5px;
  line-height: 1.55;
  margin: 0;
}

/* Perk Trio Grid */
.lz-perks-trio-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}
.lz-trio-badge {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 14px;
  padding: 14px 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  transition: all 0.2s ease;
}
.lz-trio-badge:hover {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(201, 169, 110, 0.35);
  transform: translateY(-2px);
}
.lz-trio-gold {
  background: rgba(229, 169, 60, 0.1) !important;
  border-color: rgba(229, 169, 60, 0.35) !important;
}
.lz-trio-icon {
  font-size: 22px;
  line-height: 1;
}
.lz-trio-icon-retry {
  color: #fed777;
}
.lz-trio-texts {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.lz-trio-texts strong {
  font-size: 13px;
  color: #fed777;
  font-weight: 800;
}
.lz-trio-texts span {
  font-size: 11px;
  color: rgba(229, 224, 198, 0.6);
  line-height: 1.35;
}

/* Grand CTA Spin Button */
.lz-action-wrapper {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
}
.lz-grand-spin-btn {
  width: 100%;
  height: 54px;
  border-radius: 14px;
  border: none;
  background: linear-gradient(135deg, #fed777 0%, #e5a93c 60%, #c48b26 100%);
  color: #08101a;
  font-size: 15px;
  font-weight: 800;
  letter-spacing: 0.06em;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  box-shadow: 0 6px 24px rgba(229, 169, 60, 0.35);
  transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
  font-family: 'Outfit', system-ui, sans-serif;
}
.lz-grand-spin-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 10px 32px rgba(229, 169, 60, 0.5);
}
.lz-grand-spin-btn:active:not(:disabled) {
  transform: translateY(0);
}
.lz-grand-spin-btn.disabled {
  opacity: 0.72;
  cursor: not-allowed;
}
.lz-btn-icon {
  font-size: 18px;
}
.lz-action-footnote {
  font-size: 11.5px;
  color: rgba(229, 224, 198, 0.45);
  text-align: center;
}
.lz-spin-circle-loader {
  width: 18px;
  height: 18px;
  border: 2.5px solid rgba(8, 16, 26, 0.25);
  border-top-color: #08101a;
  border-radius: 50%;
  animation: lz-spin 0.8s linear infinite;
}

/* ── Prize Won Card (Direct Reward, No Voucher Code) ── */
.lz-prize-won-card {
  background: radial-gradient(circle at 50% 0%, rgba(201, 169, 110, 0.15) 0%, rgba(14, 23, 35, 0.8) 100%);
  border: 1px solid rgba(229, 169, 60, 0.45);
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.6), 0 0 30px rgba(201, 169, 110, 0.15);
}

.lz-reward-badge-ribbon {
  background: rgba(201, 169, 110, 0.15);
  border: 1px solid rgba(201, 169, 110, 0.4);
  color: #fed777;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.16em;
  padding: 5px 14px;
  border-radius: 999px;
  align-self: flex-start;
  display: flex;
  align-items: center;
  gap: 6px;
  text-transform: uppercase;
}
.lz-badge-star {
  color: #fed777;
}

.lz-prize-hero-row {
  display: flex;
  align-items: center;
  gap: 18px;
}
.lz-prize-trophy-circle {
  width: 68px;
  height: 68px;
  border-radius: 50%;
  background: radial-gradient(circle, #fed777 0%, #e5a93c 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 34px;
  box-shadow: 0 8px 24px rgba(229, 169, 60, 0.4);
  flex-shrink: 0;
}
.lz-prize-headline-col {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.lz-prize-super-title {
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.14em;
  color: #fed777;
}
.lz-prize-amount-title {
  font-size: 26px;
  font-weight: 900;
  color: #ffffff;
  margin: 0;
  line-height: 1.2;
}

.lz-prize-instruction {
  font-size: 13.5px;
  color: rgba(229, 224, 198, 0.8);
  line-height: 1.5;
  margin: 0;
}

.lz-reward-perks-box {
  background: rgba(8, 16, 26, 0.65);
  border: 1px solid rgba(201, 169, 110, 0.25);
  border-radius: 14px;
  padding: 14px 18px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.lz-perk-item {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 12.5px;
  color: #e5e0c6;
}
.lz-perk-check {
  color: #4ade80;
  font-weight: 900;
}

.lz-claim-cta-btn {
  width: 100%;
  height: 52px;
  border-radius: 14px;
  border: none;
  background: linear-gradient(135deg, #fed777 0%, #e5a93c 60%, #c48b26 100%);
  color: #08101a;
  font-family: 'Outfit', system-ui, sans-serif;
  font-size: 15px;
  font-weight: 900;
  letter-spacing: 0.04em;
  cursor: pointer;
  box-shadow: 0 6px 24px rgba(229, 169, 60, 0.35);
  transition: all 0.25s ease;
}
.lz-claim-cta-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 32px rgba(229, 169, 60, 0.5);
}

/* Hub Clean Minimal Loader while spinning */
.lz-hub-clean-loader {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
}
.lz-hub-loader-svg {
  display: block;
  animation: lz-spin 0.9s linear infinite;
  transform-origin: center;
}

/* Confetti Celebration Stage */
.lz-confetti-stage {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
  border-radius: inherit;
  z-index: 60;
}
.lz-confetti-piece {
  position: absolute;
  top: -16px;
  left: var(--x);
  width: var(--size);
  height: var(--size);
  background: var(--color);
  opacity: 0;
  border-radius: 2px;
  animation: lz-confetti-fall var(--speed) cubic-bezier(0.25, 0.46, 0.45, 0.94) var(--delay) forwards;
}
@keyframes lz-confetti-fall {
  0% {
    opacity: 1;
    transform: translateY(0) rotate(0deg) scale(0.6);
  }
  25% {
    opacity: 1;
    transform: translateY(140px) rotate(180deg) scale(1.2);
  }
  100% {
    opacity: 0;
    transform: translateY(780px) rotate(720deg) scale(0.7);
  }
}

/* Claim Celebration Toast in Card */
.lz-claim-celebrate-toast {
  display: flex;
  align-items: center;
  gap: 12px;
  background: linear-gradient(135deg, rgba(34, 197, 94, 0.16) 0%, rgba(201, 169, 110, 0.18) 100%);
  border: 1px solid rgba(74, 222, 128, 0.5);
  box-shadow: 0 8px 24px rgba(34, 197, 94, 0.25);
  border-radius: 14px;
  padding: 12px 16px;
  animation: lz-scale-in 0.35s ease;
}
.lz-celebrate-toast-icon {
  font-size: 26px;
  line-height: 1;
}
.lz-celebrate-toast-content {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.lz-celebrate-toast-content strong {
  font-size: 13.5px;
  color: #4ade80;
  font-weight: 800;
}
.lz-celebrate-toast-content span {
  font-size: 11.5px;
  color: rgba(229, 224, 198, 0.85);
  line-height: 1.35;
}

/* Claim Button Success State */
.lz-btn-claimed {
  background: linear-gradient(135deg, #22c55e 0%, #16a34a 60%, #15803d 100%) !important;
  color: #ffffff !important;
  box-shadow: 0 0 30px rgba(34, 197, 94, 0.6) !important;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  pointer-events: none;
}
.lz-claim-check-anim {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.25);
  font-size: 14px;
  font-weight: 900;
}

/* ── Respin Card ── */
.lz-prize-respin-card {
  align-items: center;
  text-align: center;
  gap: 14px;
}
.lz-respin-icon-hero {
  font-size: 48px;
  line-height: 1;
}
.lz-respin-title {
  color: #ffffff;
  font-size: 24px;
  font-weight: 900;
  margin: 0;
}
.lz-respin-desc {
  color: rgba(229, 224, 198, 0.75);
  font-size: 13.5px;
  line-height: 1.5;
  max-width: 420px;
  margin: 0;
}
.lz-pulse-glow-btn {
  animation: lz-pulse-glow 1.8s infinite;
}

/* ── Mobile Responsive Overhaul (Zero Overlap & True Responsive Layout) ── */
@media (max-width: 900px) {
  .lz-grand-overlay {
    padding: 12px 12px 48px;
    align-items: flex-start;
  }
  .lz-grand-modal {
    width: 100%;
    max-width: 520px;
    min-height: auto;
    margin: 12px auto 40px;
    padding: 16px 16px 24px;
    border-radius: 24px;
    gap: 14px;
  }

  /* Reset Topbar from absolute to clean in-flow row */
  .lz-grand-topbar {
    position: static !important;
    top: auto !important;
    left: auto !important;
    right: auto !important;
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 6px;
    padding: 0 4px;
  }
  .lz-brand-logo-img {
    height: 52px !important;
    margin-top: 0 !important;
    margin-left: 0 !important;
  }
  .lz-sound-pill-btn {
    padding: 6px 12px;
    gap: 6px;
  }
  .lz-sound-text {
    font-size: 10px;
  }

  /* Grand Header sits cleanly below topbar with zero overlap */
  .lz-grand-head {
    margin-top: 0 !important;
    margin-bottom: 14px !important;
    gap: 4px;
  }
  .lz-grand-title {
    font-size: 24px !important;
    letter-spacing: 0.04em;
  }
  .lz-grand-subtitle {
    font-size: 12px !important;
    line-height: 1.45;
    padding: 0 4px;
    max-width: 100%;
  }

  /* 2-Column becomes vertical stack: Spinner on top, Prize below */
  .lz-showcase-stage {
    grid-template-columns: 1fr !important;
    display: flex !important;
    flex-direction: column !important;
    align-items: center;
    gap: 20px;
    width: 100%;
  }

  /* Wheel scaled to fit mobile screens comfortably */
  .lz-left-wheel-col {
    width: 100%;
    display: flex;
    justify-content: center;
  }
  .lz-wheel-rim-wrapper {
    width: min(84vw, 320px) !important;
    height: min(84vw, 320px) !important;
  }
  .lz-wheel-pointer {
    top: -12px !important;
  }
  .lz-center-spin-btn {
    width: 72px !important;
    height: 72px !important;
  }
  .lz-center-spin-text {
    font-size: 14px !important;
  }

  /* Prize Showcase Panel on Mobile */
  .lz-right-showcase-col {
    width: 100%;
  }
  .lz-prize-showcase-card {
    padding: 18px 14px !important;
    border-radius: 18px !important;
    gap: 14px !important;
  }
  .lz-prize-amount-title {
    font-size: 19px !important;
  }
  .lz-prize-trophy-circle {
    width: 48px !important;
    height: 48px !important;
    font-size: 26px !important;
  }
  .lz-reward-badge-ribbon {
    font-size: 10px !important;
    padding: 4px 12px !important;
  }
  .lz-prize-instruction {
    font-size: 12.5px !important;
  }
  .lz-reward-perks-box {
    padding: 10px 12px !important;
    gap: 6px !important;
  }
  .lz-perk-item {
    font-size: 11.5px !important;
    gap: 8px !important;
  }
  .lz-perks-trio-grid {
    grid-template-columns: 1fr !important;
    gap: 8px !important;
  }
  .lz-trio-badge {
    flex-direction: row !important;
    align-items: center !important;
    padding: 10px 12px !important;
    gap: 12px !important;
  }
  .lz-claim-cta-btn,
  .lz-grand-spin-btn {
    height: 48px !important;
    font-size: 14px !important;
    border-radius: 12px !important;
  }
}

@media (max-width: 400px) {
  .lz-wheel-rim-wrapper {
    width: 280px !important;
    height: 280px !important;
  }
  .lz-center-spin-btn {
    width: 66px !important;
    height: 66px !important;
  }
  .lz-center-spin-text {
    font-size: 13px !important;
  }
  .lz-grand-title {
    font-size: 21px !important;
  }
}
`;
