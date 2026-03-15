/**
 * PostAuctionModal.tsx — fully localised (EN/AR)
 */

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

interface PostAuctionModalProps {
  winnerName: string;
  winningBid: number;
  isWinner: boolean;
  productTitle?: string;
  onBrowse: () => void;
  onBack: () => void;
}

export default function PostAuctionModal({
  winnerName,
  winningBid,
  isWinner,
  productTitle,
  onBrowse,
  onBack,
}: PostAuctionModalProps) {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === "ar";
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 80);
    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      <style>{PAM_CSS}</style>
      <div
        className={`pam-overlay ${visible ? "pam-in" : ""}`}
        dir={isRtl ? "rtl" : "ltr"}
      >
        <div className={`pam-box ${visible ? "pam-in" : ""}`}>
          <div className="pam-icon">{isWinner ? "🏆" : "🏁"}</div>

          <div className="pam-title">
            {isWinner ? t("postAuction.congrats") : t("postAuction.ended")}
          </div>

          {productTitle && <div className="pam-product">{productTitle}</div>}

          <div className="pam-card">
            <div className="pam-card-row">
              <span className="pam-card-label">{t("postAuction.winner")}</span>
              <span className="pam-card-value pam-card-name">
                {isWinner ? t("postAuction.youWon") : winnerName}
              </span>
            </div>
            <div className="pam-divider" />
            <div className="pam-card-row">
              <span className="pam-card-label">
                {t("postAuction.winningBid")}
              </span>
              <span className="pam-card-value pam-card-bid">
                {winningBid.toLocaleString()}{" "}
                <span className="pam-cur">{isRtl ? "جنيه" : "EGP"}</span>
              </span>
            </div>
          </div>

          <div className="pam-msg">
            {isWinner ? t("postAuction.winnerMsg") : t("postAuction.loserMsg")}
          </div>

          <div className="pam-actions">
            <button className="pam-btn pam-primary" onClick={onBrowse}>
              <span className="pam-btn-icon">🏠</span>
              {t("postAuction.browse")}
            </button>
            <button className="pam-btn pam-secondary" onClick={onBack}>
              <span className="pam-btn-icon">{isRtl ? "→" : "←"}</span>
              {t("postAuction.back")}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

const PAM_CSS = `
@keyframes pam-backdrop { from{opacity:0} to{opacity:1} }
@keyframes pam-rise { from{opacity:0;transform:translateY(40px) scale(0.96)} to{opacity:1;transform:translateY(0) scale(1)} }

.pam-overlay { position:fixed;inset:0;z-index:1200;background:rgba(9,17,26,0.88);backdrop-filter:blur(18px);display:flex;align-items:center;justify-content:center;padding:20px;font-family:'Outfit',system-ui,sans-serif;opacity:0;transition:opacity 0.4s ease; }
.pam-overlay.pam-in { opacity:1; }
.pam-box { background:rgba(255,255,255,0.03);border:1px solid rgba(201,169,110,0.22);border-radius:28px;padding:44px 40px 40px;max-width:460px;width:100%;display:flex;flex-direction:column;align-items:center;gap:18px;text-align:center;opacity:0;transform:translateY(40px) scale(0.96);transition:opacity 0.5s cubic-bezier(0.22,1,0.36,1),transform 0.5s cubic-bezier(0.22,1,0.36,1);transition-delay:0.1s; }
.pam-box.pam-in { opacity:1;transform:translateY(0) scale(1); }
.pam-icon { font-size:52px;line-height:1;margin-bottom:4px; }
.pam-title { font-size:26px;font-weight:800;color:rgb(229,224,198);letter-spacing:-0.01em; }
.pam-product { font-size:13px;color:rgba(229,224,198,0.4);font-weight:400;margin-top:-8px; }
.pam-card { width:100%;background:rgba(201,169,110,0.06);border:1px solid rgba(201,169,110,0.16);border-radius:16px;overflow:hidden; }
.pam-card-row { display:flex;align-items:center;justify-content:space-between;padding:14px 20px; }
.pam-divider { height:1px;background:rgba(201,169,110,0.1); }
.pam-card-label { font-size:11px;font-weight:600;color:rgba(229,224,198,0.3);letter-spacing:0.16em;text-transform:uppercase; }
.pam-card-value { font-weight:700;color:rgb(229,224,198);text-align:right; }
.pam-card-name { font-size:16px; }
.pam-card-bid { font-size:22px;color:#c9a96e; }
.pam-cur { font-size:13px;color:rgba(201,169,110,0.55);font-weight:500; }
.pam-msg { font-size:13px;font-weight:300;line-height:1.7;color:rgba(229,224,198,0.4);max-width:340px; }
.pam-actions { display:flex;flex-direction:column;gap:10px;width:100%;margin-top:4px; }
.pam-btn { width:100%;height:52px;border:none;border-radius:14px;font-family:'Outfit',system-ui,sans-serif;font-size:14px;font-weight:700;letter-spacing:0.04em;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:10px;transition:all 0.25s cubic-bezier(0.22,1,0.36,1); }
.pam-btn-icon { font-size:16px; }
.pam-primary { background:linear-gradient(135deg,#c9a96e 0%,#b8934a 100%);color:#09111a;box-shadow:0 4px 24px rgba(201,169,110,0.22); }
.pam-primary:hover { transform:translateY(-2px);box-shadow:0 10px 36px rgba(201,169,110,0.34); }
.pam-primary:active { transform:translateY(0); }
.pam-secondary { background:rgba(255,255,255,0.04);color:rgba(229,224,198,0.5);border:1px solid rgba(229,224,198,0.08); }
.pam-secondary:hover { background:rgba(255,255,255,0.08);color:rgba(229,224,198,0.85);border-color:rgba(229,224,198,0.15); }
@media(max-width:480px){ .pam-box{padding:36px 24px 32px;border-radius:22px;} .pam-title{font-size:22px;} }
`;
