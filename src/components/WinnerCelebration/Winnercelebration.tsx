/**
 * WinnerCelebration.tsx — fully localised (EN/AR)
 */

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

interface WinnerCelebrationProps {
  winnerName: string;
  winningBid: number;
  isWinner: boolean;
  productTitle?: string;
}

interface Piece {
  id: number;
  left: number;
  delay: number;
  duration: number;
  color: string;
  size: number;
  shape: "rect" | "circle";
  rotation: number;
}

const COLORS = [
  "#c9a96e",
  "#fde68a",
  "#4ade80",
  "#93c5fd",
  "#f9a8d4",
  "#fbbf24",
  "#e2e8f0",
];

function generatePieces(count: number): Piece[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    delay: Math.random() * 4,
    duration: 2.5 + Math.random() * 3,
    color: COLORS[i % COLORS.length],
    size: 6 + Math.random() * 8,
    shape: Math.random() > 0.5 ? "rect" : "circle",
    rotation: Math.random() * 360,
  }));
}

export default function WinnerCelebration({
  winnerName,
  winningBid,
  isWinner,
  productTitle,
}: WinnerCelebrationProps) {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === "ar";

  const [pieces] = useState<Piece[]>(() => generatePieces(80));
  const [trophyVisible, setTrophyVisible] = useState(false);
  const [textVisible, setTextVisible] = useState(false);
  const [bidVisible, setBidVisible] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setTrophyVisible(true), 100);
    const t2 = setTimeout(() => setTextVisible(true), 500);
    const t3 = setTimeout(() => setBidVisible(true), 900);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, []);

  return (
    <>
      <style>{WC_CSS}</style>
      <div className="wc-overlay" dir={isRtl ? "rtl" : "ltr"}>
        <div className="wc-confetti" aria-hidden>
          {pieces.map((p) => (
            <div
              key={p.id}
              className="wc-piece"
              style={{
                left: `${p.left}%`,
                animationDelay: `${p.delay}s`,
                animationDuration: `${p.duration}s`,
                background: p.color,
                width: p.size,
                height: p.shape === "circle" ? p.size : p.size * 1.6,
                borderRadius: p.shape === "circle" ? "50%" : "2px",
                transform: `rotate(${p.rotation}deg)`,
              }}
            />
          ))}
        </div>

        <div className="wc-glow" aria-hidden>
          <div className="wc-ring wc-ring-1" />
          <div className="wc-ring wc-ring-2" />
          <div className="wc-ring wc-ring-3" />
        </div>

        <div className="wc-content">
          <div
            className={`wc-trophy ${trophyVisible ? "wc-in" : ""}`}
            aria-hidden
          >
            🏆
          </div>

          <div className={`wc-text-block ${textVisible ? "wc-in" : ""}`}>
            <div className={`wc-headline ${isWinner ? "wc-you-won" : ""}`}>
              {isWinner
                ? t("winnerCelebration.youWon")
                : t("winnerCelebration.weHaveWinner")}
            </div>

            {productTitle && (
              <div className="wc-product">
                {t("winnerCelebration.won")} {productTitle}
              </div>
            )}

            <div className="wc-winner-row">
              <div className="wc-crown" aria-hidden>
                👑
              </div>
              <div className="wc-winner-name">{winnerName}</div>
            </div>

            {isWinner && (
              <div className="wc-congrats">
                {t("winnerCelebration.congrats")}
              </div>
            )}
          </div>

          <div className={`wc-bid-block ${bidVisible ? "wc-in" : ""}`}>
            <div className="wc-bid-label">
              {t("winnerCelebration.winningBid")}
            </div>
            <div className="wc-bid-amount">
              <span className="wc-bid-num">{winningBid.toLocaleString()}</span>
              <span className="wc-bid-cur">{isRtl ? "جنيه" : "EGP"}</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

const WC_CSS = `
@keyframes wc-fall { 0%{transform:translateY(-40px) rotate(0deg);opacity:1} 80%{opacity:1} 100%{transform:translateY(110vh) rotate(800deg);opacity:0} }
@keyframes wc-fadein { from{opacity:0} to{opacity:1} }
@keyframes wc-slideup { from{opacity:0;transform:translateY(32px)} to{opacity:1;transform:translateY(0)} }
@keyframes wc-pop { 0%{transform:scale(0) rotate(-15deg);opacity:0} 65%{transform:scale(1.15) rotate(4deg)} 100%{transform:scale(1) rotate(0);opacity:1} }
@keyframes wc-shimmer { 0%{background-position:-300% center} 100%{background-position:300% center} }
@keyframes wc-pulse-ring { 0%{transform:scale(0.8);opacity:0.6} 100%{transform:scale(2.2);opacity:0} }
@keyframes wc-float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-10px)} }

.wc-overlay { position:fixed;inset:0;z-index:1100;display:flex;align-items:center;justify-content:center;font-family:'Outfit',system-ui,sans-serif;overflow:hidden;background:radial-gradient(ellipse at 50% 40%,rgba(201,169,110,0.18) 0%,rgba(9,17,26,1) 60%,rgba(9,17,26,1) 100%);backdrop-filter:blur(28px);-webkit-backdrop-filter:blur(28px);animation:wc-fadein 0.5s ease both; }
.wc-confetti { position:absolute;inset:0;pointer-events:none;overflow:hidden;z-index:0; }
.wc-piece { position:absolute;top:-30px;animation:wc-fall linear infinite; }
.wc-glow { position:absolute;inset:0;display:flex;align-items:center;justify-content:center;pointer-events:none;z-index:1; }
.wc-ring { position:absolute;border-radius:50%;border:2px solid rgba(201,169,110,0.25);animation:wc-pulse-ring 3s ease-out infinite; }
.wc-ring-1 { width:200px;height:200px;animation-delay:0s; }
.wc-ring-2 { width:300px;height:300px;animation-delay:0.6s; }
.wc-ring-3 { width:420px;height:420px;animation-delay:1.2s; }
.wc-content { position:relative;z-index:2;display:flex;flex-direction:column;align-items:center;gap:20px;padding:40px 24px;text-align:center;max-width:520px;width:100%; }
.wc-trophy { font-size:96px;line-height:1;opacity:0;transition:none;animation:wc-float 3s ease-in-out 1.2s infinite;filter:drop-shadow(0 0 30px rgba(201,169,110,0.5)); }
.wc-trophy.wc-in { animation:wc-pop 0.7s cubic-bezier(0.34,1.56,0.64,1) both,wc-float 3s ease-in-out 1.9s infinite; }
.wc-text-block { display:flex;flex-direction:column;align-items:center;gap:12px;opacity:0;transform:translateY(32px);transition:opacity 0.6s ease,transform 0.6s ease; }
.wc-text-block.wc-in { opacity:1;transform:translateY(0); }
.wc-headline { font-size:clamp(32px,6vw,52px);font-weight:800;letter-spacing:-0.02em;color:rgb(229,224,198);line-height:1.1; }
.wc-headline.wc-you-won { background:linear-gradient(135deg,#c9a96e 0%,#fde68a 40%,#c9a96e 80%);background-size:300% auto;-webkit-background-clip:text;-webkit-text-fill-color:transparent;animation:wc-shimmer 2.5s linear infinite; }
.wc-product { font-size:14px;font-weight:500;color:rgba(229,224,198,0.4);letter-spacing:0.04em; }
.wc-winner-row { display:flex;align-items:center;gap:10px;background:rgba(201,169,110,0.08);border:1px solid rgba(201,169,110,0.2);border-radius:99px;padding:8px 20px;margin-top:4px; }
.wc-crown { font-size:20px; }
.wc-winner-name { font-size:20px;font-weight:700;color:rgb(229,224,198); }
.wc-congrats { font-size:14px;font-weight:300;line-height:1.6;color:rgba(229,224,198,0.5);max-width:340px; }
.wc-bid-block { display:flex;flex-direction:column;align-items:center;gap:6px;opacity:0;transform:translateY(20px);transition:opacity 0.5s ease,transform 0.5s ease; }
.wc-bid-block.wc-in { opacity:1;transform:translateY(0); }
.wc-bid-label { font-size:10px;font-weight:600;color:rgba(229,224,198,0.28);letter-spacing:0.22em;text-transform:uppercase; }
.wc-bid-amount { display:flex;align-items:baseline;gap:6px; }
.wc-bid-num { font-size:clamp(44px,8vw,64px);font-weight:800;color:#c9a96e;letter-spacing:-0.03em;line-height:1; }
.wc-bid-cur { font-size:18px;font-weight:600;color:rgba(201,169,110,0.45); }
`;
