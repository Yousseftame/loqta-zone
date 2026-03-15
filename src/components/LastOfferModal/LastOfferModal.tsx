/**
 * LastOfferModal.tsx — fully localised (EN/AR)
 */

import { useEffect, useRef, useState } from "react";
import {
  collection,
  addDoc,
  getDoc,
  serverTimestamp,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { db } from "@/firebase/firebase";
import { useTranslation } from "react-i18next";

interface LastOfferModalProps {
  auctionId: string;
  userId: string;
  startingPrice: number;
  winningBid: number;
  winnerName: string;
  productTitle?: string;
  onClose: () => void;
}

type ModalState =
  | "idle"
  | "submitting"
  | "success"
  | "already_submitted"
  | "error";

export default function LastOfferModal({
  auctionId,
  userId,
  startingPrice,
  winningBid,
  winnerName,
  productTitle,
  onClose,
}: LastOfferModalProps) {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === "ar";
  const cur = isRtl ? "جنيه" : "EGP";

  const [visible, setVisible] = useState(false);
  const [offerInput, setOfferInput] = useState("");
  const [modalState, setModalState] = useState<ModalState>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [alreadyAmount, setAlreadyAmount] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 80);
    const checkExisting = async () => {
      try {
        const q = query(
          collection(db, "auctions", auctionId, "lastOffers"),
          where("userId", "==", userId),
        );
        const snap = await getDocs(q);
        if (!snap.empty) {
          setAlreadyAmount(snap.docs[0].data().amount ?? null);
          setModalState("already_submitted");
        }
      } catch {
        /* non-fatal */
      }
    };
    checkExisting();
    return () => clearTimeout(timer);
  }, [auctionId, userId]);

  useEffect(() => {
    if (visible && modalState === "idle") {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [visible, modalState]);

  const offerNum = Number(offerInput);
  const isValid = offerNum >= startingPrice && offerNum > 0;

  const handleSubmit = async () => {
    if (!isValid || modalState !== "idle") return;
    setModalState("submitting");
    setErrorMsg("");
    try {
      const q = query(
        collection(db, "auctions", auctionId, "lastOffers"),
        where("userId", "==", userId),
      );
      const existing = await getDocs(q);
      if (!existing.empty) {
        setAlreadyAmount(existing.docs[0].data().amount ?? null);
        setModalState("already_submitted");
        return;
      }
      await addDoc(collection(db, "auctions", auctionId, "lastOffers"), {
        userId,
        amount: offerNum,
        status: "pending",
        selectedbyAdmin: false,
        createdAt: serverTimestamp(),
      });
      setModalState("success");
    } catch {
      setErrorMsg(
        t("common.errorGeneric", "Something went wrong. Please try again."),
      );
      setModalState("error");
    }
  };

  const handleDismiss = () => {
    setVisible(false);
    setTimeout(onClose, 400);
  };

  return (
    <>
      <style>{LOM_CSS}</style>
      <div
        className={`lom-overlay ${visible ? "lom-in" : ""}`}
        dir={isRtl ? "rtl" : "ltr"}
      >
        <div className={`lom-box ${visible ? "lom-in" : ""}`}>
          <div className="lom-topbar" />
          <button
            className="lom-close"
            onClick={handleDismiss}
            aria-label="Close"
          >
            ✕
          </button>

          <div className="lom-icon-wrap">
            <div className="lom-icon-ring" />
            <div className="lom-icon">⚡</div>
          </div>

          <div className="lom-heading">{t("lastOffer.title")}</div>
          <div className="lom-subheading">
            {productTitle ? (
              <>
                {t("lastOffer.yourChance")}{" "}
                <span className="lom-accent">{productTitle}</span>
              </>
            ) : (
              t("lastOffer.backupChance")
            )}
          </div>

          <div className="lom-context-card">
            <div className="lom-ctx-row">
              <span className="lom-ctx-label">{t("lastOffer.winner")}</span>
              <span className="lom-ctx-val">{winnerName}</span>
            </div>
            <div className="lom-ctx-divider" />
            <div className="lom-ctx-row">
              <span className="lom-ctx-label">{t("lastOffer.winningBid")}</span>
              <span className="lom-ctx-val lom-ctx-gold">
                {winningBid.toLocaleString()}{" "}
                <span className="lom-ctx-cur">{cur}</span>
              </span>
            </div>
          </div>

          <div className="lom-info">
            <div className="lom-info-icon">ℹ</div>
            <div className="lom-info-text">{t("lastOffer.infoText")}</div>
          </div>

          {modalState === "already_submitted" && (
            <div className="lom-submitted-state">
              <div className="lom-submitted-check">✓</div>
              <div className="lom-submitted-title">
                {t("lastOffer.alreadyTitle")}
              </div>
              {alreadyAmount !== null && (
                <div className="lom-submitted-amount">
                  {alreadyAmount.toLocaleString()}{" "}
                  <span className="lom-submitted-cur">{cur}</span>
                </div>
              )}
              <div className="lom-submitted-note">
                {t("lastOffer.alreadyNote")}
              </div>
              <button className="lom-btn-secondary" onClick={handleDismiss}>
                {t("lastOffer.close")}
              </button>
            </div>
          )}

          {modalState === "success" && (
            <div className="lom-success-state">
              <div className="lom-success-ring" />
              <div className="lom-success-check">✓</div>
              <div className="lom-success-title">
                {t("lastOffer.successTitle")}
              </div>
              <div className="lom-success-amount">
                {offerNum.toLocaleString()}{" "}
                <span className="lom-success-cur">{cur}</span>
              </div>
              <div className="lom-success-note">
                {t("lastOffer.successNote")}
              </div>
              <button className="lom-btn-secondary" onClick={handleDismiss}>
                {t("lastOffer.done")}
              </button>
            </div>
          )}

          {(modalState === "idle" ||
            modalState === "submitting" ||
            modalState === "error") && (
            <div className="lom-form">
              <div className="lom-input-label">
                {t("lastOffer.label")}
                <span className="lom-input-min">
                  {t("lastOffer.minLabel", {
                    price: startingPrice.toLocaleString(),
                  })}
                </span>
              </div>

              <div
                className={`lom-input-wrap ${offerInput && !isValid ? "lom-input-error" : ""} ${offerInput && isValid ? "lom-input-valid" : ""}`}
              >
                <input
                  ref={inputRef}
                  className="lom-input"
                  type="number"
                  placeholder={startingPrice.toLocaleString()}
                  value={offerInput}
                  onChange={(e) => {
                    setOfferInput(e.target.value);
                    if (modalState === "error") setModalState("idle");
                  }}
                  onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                  disabled={modalState === "submitting"}
                  min={startingPrice}
                  style={{ textAlign: isRtl ? "right" : "left" }}
                />
                <span className="lom-input-cur">{cur}</span>
                {offerInput && isValid && (
                  <span className="lom-input-tick">✓</span>
                )}
              </div>

              {offerInput && !isValid && offerNum > 0 && (
                <div className="lom-input-hint lom-hint-error">
                  {t("lastOffer.minError", {
                    price: startingPrice.toLocaleString(),
                  })}
                </div>
              )}
              {modalState === "error" && (
                <div className="lom-input-hint lom-hint-error">{errorMsg}</div>
              )}

              <button
                className={`lom-submit ${isValid && modalState !== "submitting" ? "lom-submit-go" : "lom-submit-off"}`}
                onClick={handleSubmit}
                disabled={!isValid || modalState === "submitting"}
              >
                {modalState === "submitting" ? (
                  <>
                    <div className="lom-spinner" /> {t("lastOffer.submitting")}
                  </>
                ) : (
                  <>
                    <span className="lom-submit-icon">⚡</span>
                    {t("lastOffer.submitBtn")}
                    <span className="lom-submit-arrow">
                      {isRtl ? "←" : "→"}
                    </span>
                  </>
                )}
              </button>

              <button className="lom-skip" onClick={handleDismiss}>
                {t("lastOffer.skip")}
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

const LOM_CSS = `
@keyframes lom-pulse-ring { 0%{transform:scale(0.85);opacity:0.7} 100%{transform:scale(1.55);opacity:0} }
@keyframes lom-check-pop { 0%{transform:scale(0) rotate(-20deg);opacity:0} 65%{transform:scale(1.2) rotate(4deg)} 100%{transform:scale(1) rotate(0);opacity:1} }
@keyframes lom-shimmer { 0%{background-position:-200% center} 100%{background-position:200% center} }
@keyframes lom-success-ring { 0%{transform:scale(0.6);opacity:0.8} 100%{transform:scale(2.2);opacity:0} }
@keyframes lom-spin { to{transform:rotate(360deg)} }

.lom-overlay { position:fixed;inset:0;z-index:1300;background:rgba(6,12,20,0.92);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);display:flex;align-items:center;justify-content:center;padding:20px;font-family:'Outfit',system-ui,sans-serif;opacity:0;transition:opacity 0.4s ease; }
.lom-overlay.lom-in { opacity:1; }
.lom-box { position:relative;background:linear-gradient(160deg,rgba(255,255,255,0.038) 0%,rgba(255,255,255,0.018) 100%);border:1px solid rgba(201,169,110,0.24);border-radius:28px;padding:0 0 36px;max-width:440px;width:100%;display:flex;flex-direction:column;align-items:center;box-shadow:0 0 0 1px rgba(201,169,110,0.07),0 40px 80px rgba(0,0,0,0.55);opacity:0;transform:translateY(48px) scale(0.94);transition:opacity 0.5s cubic-bezier(0.22,1,0.36,1),transform 0.5s cubic-bezier(0.22,1,0.36,1);transition-delay:0.1s;overflow:hidden; }
.lom-box.lom-in { opacity:1;transform:translateY(0) scale(1); }
.lom-topbar { width:100%;height:3px;background:linear-gradient(90deg,transparent 0%,rgba(201,169,110,0.3) 20%,#c9a96e 50%,rgba(201,169,110,0.3) 80%,transparent 100%);margin-bottom:36px; }
.lom-close { position:absolute;top:16px;inset-inline-end:18px;background:none;border:none;color:rgba(229,224,198,0.2);font-size:14px;cursor:pointer;transition:color 0.2s;padding:4px 6px;font-family:'Outfit',system-ui,sans-serif;line-height:1; }
.lom-close:hover { color:rgba(229,224,198,0.7); }
.lom-icon-wrap { position:relative;display:flex;align-items:center;justify-content:center;margin-bottom:18px; }
.lom-icon-ring { position:absolute;width:64px;height:64px;border-radius:50%;border:1.5px solid rgba(201,169,110,0.3);animation:lom-pulse-ring 2.5s ease-out infinite; }
.lom-icon { width:56px;height:56px;border-radius:50%;background:rgba(201,169,110,0.09);border:1px solid rgba(201,169,110,0.28);display:flex;align-items:center;justify-content:center;font-size:22px;position:relative;z-index:1; }
.lom-heading { font-size:26px;font-weight:800;color:rgb(229,224,198);letter-spacing:-0.02em;margin-bottom:6px; }
.lom-subheading { font-size:13px;font-weight:300;color:rgba(229,224,198,0.38);text-align:center;max-width:300px;margin-bottom:24px;line-height:1.6; }
.lom-accent { color:rgba(201,169,110,0.85);font-weight:500; }
.lom-context-card { width:calc(100% - 48px);background:rgba(201,169,110,0.05);border:1px solid rgba(201,169,110,0.14);border-radius:16px;overflow:hidden;margin-bottom:16px; }
.lom-ctx-row { display:flex;align-items:center;justify-content:space-between;padding:12px 18px; }
.lom-ctx-divider { height:1px;background:rgba(201,169,110,0.08); }
.lom-ctx-label { font-size:10px;font-weight:600;color:rgba(229,224,198,0.28);letter-spacing:0.18em;text-transform:uppercase; }
.lom-ctx-val { font-size:14px;font-weight:600;color:rgba(229,224,198,0.7); }
.lom-ctx-gold { color:#c9a96e;font-size:18px;font-weight:700; }
.lom-ctx-cur { font-size:12px;color:rgba(201,169,110,0.45);font-weight:500; }
.lom-info { display:flex;align-items:flex-start;gap:10px;width:calc(100% - 48px);background:rgba(147,197,253,0.05);border:1px solid rgba(147,197,253,0.12);border-radius:12px;padding:12px 14px;margin-bottom:24px; }
.lom-info-icon { font-size:13px;color:rgba(147,197,253,0.6);flex-shrink:0;margin-top:1px;width:18px;height:18px;background:rgba(147,197,253,0.08);border-radius:50%;display:flex;align-items:center;justify-content:center; }
.lom-info-text { font-size:12px;line-height:1.65;color:rgba(229,224,198,0.35);font-weight:300; }
.lom-form { display:flex;flex-direction:column;align-items:center;gap:12px;width:calc(100% - 48px); }
.lom-input-label { width:100%;display:flex;align-items:center;justify-content:space-between;font-size:11px;font-weight:600;color:rgba(229,224,198,0.35);letter-spacing:0.14em;text-transform:uppercase; }
.lom-input-min { font-size:10px;font-weight:400;color:rgba(201,169,110,0.45);letter-spacing:0.04em;text-transform:none; }
.lom-input-wrap { position:relative;width:100%;transition:all 0.2s ease; }
.lom-input-wrap::after { content:'';position:absolute;inset:-1px;border-radius:13px;pointer-events:none;transition:box-shadow 0.25s ease; }
.lom-input-valid::after { box-shadow:0 0 0 2px rgba(74,222,128,0.25); }
.lom-input-error::after { box-shadow:0 0 0 2px rgba(248,113,113,0.25); }
.lom-input { width:100%;height:58px;background:rgba(255,255,255,0.04);border:1px solid rgba(201,169,110,0.2);border-radius:12px;color:rgb(229,224,198);font-family:'Outfit',system-ui,sans-serif;font-size:22px;font-weight:700;padding:0 80px 0 18px;outline:none;transition:border-color 0.2s ease;-moz-appearance:textfield; }
.lom-input::-webkit-outer-spin-button,.lom-input::-webkit-inner-spin-button { -webkit-appearance:none;margin:0; }
.lom-input:focus { border-color:rgba(201,169,110,0.5); }
.lom-input:disabled { opacity:0.5;cursor:not-allowed; }
.lom-input-valid .lom-input { border-color:rgba(74,222,128,0.35); }
.lom-input-error .lom-input { border-color:rgba(248,113,113,0.35); }
.lom-input-cur { position:absolute;right:38px;top:50%;transform:translateY(-50%);font-size:12px;font-weight:600;color:rgba(201,169,110,0.45);pointer-events:none; }
.lom-input-tick { position:absolute;right:14px;top:50%;transform:translateY(-50%);font-size:14px;color:#4ade80;pointer-events:none; }
.lom-input-hint { width:100%;font-size:11px;letter-spacing:0.04em;margin-top:-4px; }
.lom-hint-error { color:rgba(248,113,113,0.7); }
.lom-submit { width:100%;height:54px;border:none;border-radius:14px;font-family:'Outfit',system-ui,sans-serif;font-size:13px;font-weight:700;letter-spacing:0.08em;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:10px;transition:all 0.28s cubic-bezier(0.22,1,0.36,1);margin-top:4px; }
.lom-submit-icon { font-size:15px; }
.lom-submit-arrow { font-size:16px;transition:transform 0.2s; }
.lom-submit-go { background:linear-gradient(135deg,#c9a96e 0%,#b8934a 50%,#c9a96e 100%);background-size:200% auto;color:#09111a;box-shadow:0 6px 28px rgba(201,169,110,0.28);animation:lom-shimmer 3s linear infinite; }
.lom-submit-go:hover { transform:translateY(-2px);box-shadow:0 12px 40px rgba(201,169,110,0.38); }
.lom-submit-off { background:rgba(255,255,255,0.03);color:rgba(229,224,198,0.18);border:1px solid rgba(229,224,198,0.05);cursor:not-allowed;animation:none; }
.lom-skip { background:none;border:none;font-family:'Outfit',system-ui,sans-serif;font-size:12px;color:rgba(229,224,198,0.2);cursor:pointer;padding:4px 0;transition:color 0.2s;letter-spacing:0.04em; }
.lom-skip:hover { color:rgba(229,224,198,0.5); }
.lom-spinner { width:15px;height:15px;border:2px solid rgba(9,17,26,0.2);border-top-color:#09111a;border-radius:50%;animation:lom-spin 0.8s linear infinite; }
.lom-submitted-state,.lom-success-state { display:flex;flex-direction:column;align-items:center;gap:10px;width:calc(100% - 48px);text-align:center; }
.lom-submitted-check,.lom-success-check { width:52px;height:52px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:22px;margin-bottom:4px; }
.lom-submitted-check { background:rgba(201,169,110,0.1);border:1.5px solid rgba(201,169,110,0.3);color:#c9a96e; }
.lom-submitted-title { font-size:20px;font-weight:700;color:rgb(229,224,198); }
.lom-submitted-amount { font-size:36px;font-weight:800;color:#c9a96e;letter-spacing:-0.02em;line-height:1; }
.lom-submitted-cur,.lom-success-cur { font-size:14px;color:rgba(201,169,110,0.45);font-weight:500; }
.lom-submitted-note,.lom-success-note { font-size:12px;color:rgba(229,224,198,0.3);line-height:1.6;max-width:280px;margin-bottom:8px; }
.lom-success-ring { position:absolute;top:16px;width:60px;height:60px;border-radius:50%;border:2px solid rgba(74,222,128,0.4);animation:lom-success-ring 1.2s ease-out forwards; }
.lom-success-check { background:rgba(74,222,128,0.1);border:1.5px solid rgba(74,222,128,0.35);color:#4ade80;position:relative;z-index:1;animation:lom-check-pop 0.5s cubic-bezier(0.34,1.56,0.64,1) both; }
.lom-success-title { font-size:22px;font-weight:700;color:rgb(229,224,198); }
.lom-success-amount { font-size:40px;font-weight:800;color:#4ade80;letter-spacing:-0.02em;line-height:1; }
.lom-btn-secondary { width:100%;height:48px;background:rgba(255,255,255,0.04);border:1px solid rgba(229,224,198,0.08);border-radius:12px;font-family:'Outfit',system-ui,sans-serif;font-size:13px;font-weight:600;color:rgba(229,224,198,0.45);cursor:pointer;transition:all 0.25s ease;margin-top:4px; }
.lom-btn-secondary:hover { background:rgba(255,255,255,0.07);color:rgba(229,224,198,0.75);border-color:rgba(229,224,198,0.14); }
@media(max-width:480px){ .lom-box{border-radius:22px;} .lom-heading{font-size:22px;} }
`;
