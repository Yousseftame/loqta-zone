/**
 * CountdownBar — Reusable skeuomorphic stopwatch countdown component.
 *
 * Usage:
 *   import { CountdownBar } from "@/components/CountdownBar";
 *   <CountdownBar startsAt={item.startsAt} />
 *
 * Font:
 *   Uses "Share Tech Mono" (Google Fonts) for the digit display —
 *   geometric, symmetric, military-instrument style.
 *   Add this ONCE to your index.html <head>:
 *   <link href="https://fonts.googleapis.com/css2?family=Share+Tech+Mono&display=swap" rel="stylesheet" />
 */

import React, { useState, useEffect, useRef } from "react";

// ─── Countdown logic ──────────────────────────────────────────────────────────
function calcCountdown(target: string) {
  const diff = new Date(target).getTime() - Date.now();
  if (diff <= 0) return { d: 0, h: 0, m: 0, s: 0, done: true };
  const total = Math.floor(diff / 1000);
  return {
    d: Math.floor(total / 86400),
    h: Math.floor((total % 86400) / 3600),
    m: Math.floor((total % 3600) / 60),
    s: total % 60,
    done: false,
  };
}

function useCountdown(target: string) {
  const [time, setTime] = useState(() => calcCountdown(target));
  useEffect(() => {
    if (time.done) return;
    const interval = setInterval(() => setTime(calcCountdown(target)), 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);
  return time;
}

// ─── Component ────────────────────────────────────────────────────────────────
interface CountdownBarProps {
  startsAt: string;
}

export function CountdownBar({ startsAt }: CountdownBarProps) {
  const { d, h, m, s, done } = useCountdown(startsAt);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pad = (n: number) => String(n).padStart(2, "0");

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;
    const W = 300,
      H = 330;
    canvas.width = W * dpr;
    canvas.height = H * dpr;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);

    const cx = W / 2; // 150
    const cy = H / 2 + 14; // 179
    const R = 112;

    ctx.clearRect(0, 0, W, H);

    // ── 1. Drop shadow ──────────────────────────────────────────────────────
    ctx.save();
    ctx.shadowColor = "rgba(8,18,36,0.55)";
    ctx.shadowBlur = 40;
    ctx.shadowOffsetY = 16;
    ctx.beginPath();
    ctx.arc(cx, cy, R + 8, 0, Math.PI * 2);
    ctx.fillStyle = "#1a3550";
    ctx.fill();
    ctx.restore();

    // ── 2. Outer rim ────────────────────────────────────────────────────────
    ctx.save();
    const rimGrad = ctx.createRadialGradient(
      cx - 22,
      cy - 28,
      8,
      cx,
      cy,
      R + 12,
    );
    rimGrad.addColorStop(0, "#3a607c");
    rimGrad.addColorStop(0.5, "#243f58");
    rimGrad.addColorStop(1, "#162d40");
    ctx.beginPath();
    ctx.arc(cx, cy, R + 10, 0, Math.PI * 2);
    ctx.fillStyle = rimGrad;
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.08)";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();

    // ── 3. Main face ────────────────────────────────────────────────────────
    ctx.save();
    const faceGrad = ctx.createRadialGradient(
      cx - 18,
      cy - 28,
      18,
      cx,
      cy,
      R + 2,
    );
    faceGrad.addColorStop(0, "#2e5878");
    faceGrad.addColorStop(0.5, "#1f4060");
    faceGrad.addColorStop(1, "#152d42");
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.fillStyle = faceGrad;
    ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,0.28)";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();

    // ── 4. Gold arc — transparent → gold → transparent ─────────────────────
    const arcStartDeg = 306,
      arcEndDeg = 390;
    const aS = ((arcStartDeg - 90) * Math.PI) / 180;
    const aE = ((arcEndDeg - 90) * Math.PI) / 180;
    const arcR = R - 20;
    const arcX1 = cx + arcR * Math.cos(aS),
      arcY1 = cy + arcR * Math.sin(aS);
    const arcX2 = cx + arcR * Math.cos(aE),
      arcY2 = cy + arcR * Math.sin(aE);

    // Soft glow
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, arcR, aS, aE);
    ctx.strokeStyle = "rgba(180,140,20,0.12)";
    ctx.lineWidth = 28;
    ctx.lineCap = "butt";
    ctx.stroke();
    ctx.restore();

    // Main metallic arc
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, arcR, aS, aE);
    const goldGrad = ctx.createLinearGradient(arcX1, arcY1, arcX2, arcY2);
    goldGrad.addColorStop(0, "rgba(160,120,24,0)");
    goldGrad.addColorStop(0.18, "rgba(200,155,35,0.55)");
    goldGrad.addColorStop(0.42, "rgba(228,188,60,0.82)");
    goldGrad.addColorStop(0.62, "rgba(200,160,40,0.75)");
    goldGrad.addColorStop(0.85, "rgba(170,128,28,0.45)");
    goldGrad.addColorStop(1, "rgba(140,105,20,0)");
    ctx.strokeStyle = goldGrad;
    ctx.lineWidth = 16;
    ctx.lineCap = "butt";
    ctx.stroke();
    ctx.restore();

    // Shimmer
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, arcR - 1, aS, aE);
    const shimGrad = ctx.createLinearGradient(arcX1, arcY1, arcX2, arcY2);
    shimGrad.addColorStop(0, "rgba(255,248,200,0)");
    shimGrad.addColorStop(0.35, "rgba(255,248,200,0.35)");
    shimGrad.addColorStop(0.65, "rgba(255,248,200,0.22)");
    shimGrad.addColorStop(1, "rgba(255,248,200,0)");
    ctx.strokeStyle = shimGrad;
    ctx.lineWidth = 4;
    ctx.lineCap = "butt";
    ctx.stroke();
    ctx.restore();

    // ── 5. Tick marks ───────────────────────────────────────────────────────
    [0, 30, 60, 90, 120, 150, 210, 270, 330].forEach((deg) => {
      const rad = ((deg - 90) * Math.PI) / 180;
      const x1 = cx + (R - 6) * Math.cos(rad);
      const y1 = cy + (R - 6) * Math.sin(rad);
      const x2 = cx + (R - 22) * Math.cos(rad);
      const y2 = cy + (R - 22) * Math.sin(rad);
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.strokeStyle =
        deg >= 296 || deg <= 44
          ? "rgba(220,180,70,0.8)"
          : "rgba(220,235,255,0.82)";
      ctx.lineWidth = 2;
      ctx.lineCap = "round";
      ctx.stroke();
      ctx.restore();
    });

    // ── 6. Counter box ──────────────────────────────────────────────────────
    if (!done) {
      const boxW = 202,
        boxH = 72;
      const boxX = cx - boxW / 2,
        boxY = cy + 10;
      const boxRad = 10;

      // Background
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(boxX, boxY, boxW, boxH, boxRad);
      ctx.fillStyle = "rgba(14,30,52,0.88)";
      ctx.fill();
      ctx.restore();

      // Inner glow
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(boxX, boxY, boxW, boxH, boxRad);
      const boxGlow = ctx.createRadialGradient(
        cx,
        boxY + boxH / 2,
        4,
        cx,
        boxY + boxH / 2,
        boxW / 1.6,
      );
      boxGlow.addColorStop(0, "rgba(201,169,110,0.10)");
      boxGlow.addColorStop(1, "rgba(201,169,110,0)");
      ctx.fillStyle = boxGlow;
      ctx.fill();
      ctx.restore();

      // Border
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(boxX, boxY, boxW, boxH, boxRad);
      ctx.strokeStyle = "rgba(201,169,110,0.45)";
      ctx.lineWidth = 1.2;
      ctx.stroke();
      ctx.restore();

      // Label row — Share Tech Mono for consistency
      const labels = ["DAYS", "HOURS", "MINS", "SECS"];
      const colW = boxW / 4;
      ctx.save();
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = '700 14px "Arial Narrow", Helvetica, Arial, sans-serif';
      ctx.fillStyle = "rgba(201,169,110,0.82)";
      labels.forEach((lbl, i) => {
        ctx.fillText(lbl, boxX + colW * i + colW / 2, boxY + 18);
      });
      ctx.restore();

      // Separator
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(boxX + 10, boxY + 27);
      ctx.lineTo(boxX + boxW - 10, boxY + 27);
      ctx.strokeStyle = "rgba(201,169,110,0.22)";
      ctx.lineWidth = 0.8;
      ctx.stroke();
      ctx.restore();

      // Colon separators
      const digitY = boxY + 52;
      ctx.save();
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = '400 17px "Share Tech Mono", monospace';
      ctx.fillStyle = "rgba(201,169,110,0.50)";
      [colW, colW * 2, colW * 3].forEach((cp) => {
        ctx.fillText(":", boxX + cp, digitY - 2);
      });
      ctx.restore();

      // Digits — Share Tech Mono, bold glow
      const digits = [pad(d), pad(h), pad(m), pad(s)];

      ctx.save();
      ctx.shadowColor = "rgba(220,175,60,0.80)";
      ctx.shadowBlur = 16;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = '700 28px "Share Tech Mono", monospace';
      ctx.fillStyle = "#e8c055";
      digits.forEach((dg, i) => {
        ctx.fillText(dg, boxX + colW * i + colW / 2, digitY);
      });
      ctx.restore();

      // Bright overlay pass
      ctx.save();
      ctx.globalAlpha = 0.26;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = '400 28px "Share Tech Mono", monospace';
      ctx.fillStyle = "#fff8c0";
      digits.forEach((dg, i) => {
        ctx.fillText(dg, boxX + colW * i + colW / 2, digitY);
      });
      ctx.restore();
    } else {
      ctx.save();
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.shadowColor = "rgba(94,232,160,0.55)";
      ctx.shadowBlur = 12;
      ctx.font = '400 20px "Share Tech Mono", monospace';
      ctx.fillStyle = "#5ee8a0";
      ctx.fillText("LIVE NOW", cx, cy + 44);
      ctx.restore();
    }

    // ── 7. Crown guard — top-left (~323°) ───────────────────────────────────
    const gS = ((308 - 90) * Math.PI) / 180;
    const gE = ((338 - 90) * Math.PI) / 180;

    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, R + 14, gS, gE);
    const navyGuard = ctx.createLinearGradient(
      cx + (R + 14) * Math.cos(gS),
      cy + (R + 14) * Math.sin(gS),
      cx + (R + 14) * Math.cos(gE),
      cy + (R + 14) * Math.sin(gE),
    );
    navyGuard.addColorStop(0, "#2a4f6a");
    navyGuard.addColorStop(0.5, "#1a3a52");
    navyGuard.addColorStop(1, "#243d55");
    ctx.strokeStyle = navyGuard;
    ctx.lineWidth = 18;
    ctx.lineCap = "round";
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, R + 14, gS, gE);
    ctx.strokeStyle = "rgba(255,255,255,0.07)";
    ctx.lineWidth = 5;
    ctx.lineCap = "round";
    ctx.stroke();
    ctx.restore();

    // ── 8. Crown button ─────────────────────────────────────────────────────
    const btnDeg = 323;
    const btnRad = ((btnDeg - 90) * Math.PI) / 180;
    const btnCx = cx + (R + 30) * Math.cos(btnRad);
    const btnCy = cy + (R + 30) * Math.sin(btnRad);
    const btnW = 13,
      btnH = 18,
      btnRadius = 4;

    ctx.save();
    ctx.translate(btnCx, btnCy);
    ctx.rotate(btnRad + Math.PI / 2);
    ctx.shadowColor = "rgba(0,0,0,0.5)";
    ctx.shadowBlur = 8;
    ctx.shadowOffsetX = 1;
    ctx.shadowOffsetY = 2;

    const btnGrad = ctx.createLinearGradient(
      -btnW / 2,
      -btnH / 2,
      btnW / 2,
      btnH / 2,
    );
    btnGrad.addColorStop(0, "#f2de82");
    btnGrad.addColorStop(0.2, "#d4a030");
    btnGrad.addColorStop(0.45, "#e8c060");
    btnGrad.addColorStop(0.7, "#a07820");
    btnGrad.addColorStop(1, "#c09028");
    ctx.beginPath();
    ctx.roundRect(-btnW / 2, -btnH / 2, btnW, btnH, btnRadius);
    ctx.fillStyle = btnGrad;
    ctx.fill();
    ctx.shadowBlur = 0;

    const hlGrad = ctx.createLinearGradient(
      -btnW / 2,
      -btnH / 2,
      btnW / 2,
      -btnH / 2 + 8,
    );
    hlGrad.addColorStop(0, "rgba(255,250,180,0.55)");
    hlGrad.addColorStop(1, "rgba(255,250,180,0)");
    ctx.beginPath();
    ctx.roundRect(-btnW / 2 + 2, -btnH / 2 + 2, btnW - 4, btnH / 2.5, 3);
    ctx.fillStyle = hlGrad;
    ctx.fill();

    ctx.strokeStyle = "rgba(100,65,5,0.32)";
    ctx.lineWidth = 0.8;
    [-3, 0, 3].forEach((y) => {
      ctx.beginPath();
      ctx.moveTo(-btnW / 2 + 3, y);
      ctx.lineTo(btnW / 2 - 3, y);
      ctx.stroke();
    });

    const capGrad = ctx.createRadialGradient(
      -2,
      -btnH / 2 - 2,
      1,
      0,
      -btnH / 2,
      btnW / 2,
    );
    capGrad.addColorStop(0, "#f8e898");
    capGrad.addColorStop(0.5, "#d4a840");
    capGrad.addColorStop(1, "#a07020");
    ctx.beginPath();
    ctx.ellipse(0, -btnH / 2, btnW / 2, 5, 0, 0, Math.PI * 2);
    ctx.fillStyle = capGrad;
    ctx.fill();
    ctx.strokeStyle = "rgba(255,250,160,0.4)";
    ctx.lineWidth = 0.8;
    ctx.stroke();
    ctx.restore();

    // ── 9. Top rim specular gleam ────────────────────────────────────────────
    ctx.save();
    ctx.beginPath();
    ctx.arc(
      cx,
      cy,
      R + 9,
      ((215 - 90) * Math.PI) / 180,
      ((310 - 90) * Math.PI) / 180,
    );
    ctx.strokeStyle = "rgba(255,255,255,0.08)";
    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    ctx.stroke();
    ctx.restore();
  }, [d, h, m, s, done]);

  // ── Live badge ─────────────────────────────────────────────────────────────
  if (done) {
    return (
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          padding: "10px 18px",
          border: "1px solid rgba(94,232,160,0.22)",
          borderRadius: 10,
          color: "#5ee8a0",
          fontSize: 14,
          fontFamily: "'Share Tech Mono', 'Courier New', monospace",
          letterSpacing: "0.14em",
        }}
      >
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: "#5ee8a0",
            boxShadow: "0 0 6px #5ee8a0",
            animation: "liveP 2s ease infinite",
            flexShrink: 0,
          }}
        />
        LIVE NOW
      </div>
    );
  }

  return (
    <canvas
      ref={canvasRef}
      style={{ width: 240, height: 264, display: "block" }}
    />
  );
}
