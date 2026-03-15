/**
 * PromoCodeModal.tsx — fully localised (EN/AR)
 */

import { useState } from "react";
import {
  collection,
  getDocs,
  query,
  where,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/firebase/firebase";
import type { Voucher } from "@/pages/Admin/Voucher/voucher-data";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";

interface SelectedAuction {
  id: string;
  entryType: "free" | "paid";
  entryFee: number;
}
interface Props {
  selectedAuctions: SelectedAuction[];
  userId: string;
  onApply: (voucher: Voucher) => void;
  onClose: () => void;
}

function parseVoucher(id: string, d: Record<string, any>): Voucher {
  return {
    id,
    code: d.code ?? "",
    type: d.type ?? "join",
    discountAmount: d.discountAmount ?? null,
    applicableAuctions: Array.isArray(d.applicableAuctions)
      ? d.applicableAuctions
      : Array.isArray(d.applicableProducts)
        ? d.applicableProducts
        : [],
    maxUses: d.maxUses ?? 1,
    usedBy: Array.isArray(d.usedBy) ? d.usedBy : [],
    isActive: d.isActive ?? true,
    expiryDate:
      d.expiryDate instanceof Timestamp
        ? d.expiryDate.toDate()
        : new Date(d.expiryDate ?? Date.now()),
    createdAt:
      d.createdAt instanceof Timestamp ? d.createdAt.toDate() : new Date(),
    updatedAt:
      d.updatedAt instanceof Timestamp ? d.updatedAt.toDate() : new Date(),
    createdBy: d.createdBy ?? "",
  };
}

export default function PromoCodeModal({
  selectedAuctions,
  userId,
  onApply,
  onClose,
}: Props) {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === "ar";

  const [input, setInput] = useState("");
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<{ text: string; isInfo: boolean } | null>(
    null,
  );
  const [pendingVoucher, setPendingVoucher] = useState<Voucher | null>(null);
  const [partialWarning, setPartialWarning] = useState<string>("");

  const handleValidate = async () => {
    const code = input.trim().toUpperCase();
    if (!code) {
      setError({ text: t("promoModal.errors.empty"), isInfo: false });
      return;
    }

    setChecking(true);
    setError(null);
    setPendingVoucher(null);
    setPartialWarning("");

    try {
      const snap = await getDocs(
        query(collection(db, "vouchers"), where("code", "==", code)),
      );
      if (snap.empty) {
        setError({ text: t("promoModal.errors.notFound"), isInfo: false });
        return;
      }

      const v = parseVoucher(snap.docs[0].id, snap.docs[0].data());

      if (!v.isActive) {
        setError({ text: t("promoModal.errors.inactive"), isInfo: false });
        return;
      }
      if (new Date() > v.expiryDate) {
        setError({
          text: t("promoModal.errors.expired", {
            date: v.expiryDate.toLocaleDateString(),
          }),
          isInfo: false,
        });
        return;
      }
      if (v.usedBy.length >= v.maxUses) {
        setError({ text: t("promoModal.errors.maxUses"), isInfo: false });
        return;
      }
      if (userId && v.usedBy.some((u: any) => u.userId === userId)) {
        setError({ text: t("promoModal.errors.alreadyUsed"), isInfo: false });
        return;
      }

      let coveredAuctions = selectedAuctions;
      if (v.applicableAuctions.length > 0) {
        coveredAuctions = selectedAuctions.filter((a) =>
          v.applicableAuctions.includes(a.id),
        );
        if (coveredAuctions.length === 0) {
          setError({
            text: t("promoModal.errors.notApplicable"),
            isInfo: false,
          });
          return;
        }
        if (coveredAuctions.length < selectedAuctions.length) {
          const uncovered = selectedAuctions.length - coveredAuctions.length;
          setPartialWarning(
            t("promoModal.partial", {
              covered: coveredAuctions.length,
              total: selectedAuctions.length,
              uncovered,
            }),
          );
        }
      }

      if (v.type === "join" || v.type === "entry_discount") {
        const hasPaidCovered = coveredAuctions.some(
          (a) => a.entryType === "paid",
        );
        if (!hasPaidCovered) {
          setError({ text: t("promoModal.errors.freeEntry"), isInfo: false });
          return;
        }
      }

      if (v.type === "discount") {
        setPendingVoucher(v);
        setError({
          text: t("promoModal.discountInfo", {
            amount: (v.discountAmount ?? 0).toLocaleString(),
          }),
          isInfo: true,
        });
        return;
      }

      applyVoucher(v);
    } catch {
      setError({ text: t("promoModal.errors.generic"), isInfo: false });
    } finally {
      setChecking(false);
    }
  };

  function applyVoucher(v: Voucher) {
    onApply(v);
    const amount = (v.discountAmount ?? 0).toLocaleString();
    const msg =
      v.type === "join"
        ? t("promoModal.toasts.join")
        : v.type === "entry_discount"
          ? t("promoModal.toasts.entry_discount", { amount })
          : t("promoModal.toasts.discount", { amount });
    toast.success(msg);
  }

  return (
    <>
      <style>{`
        @keyframes pm-fadein { from{opacity:0} to{opacity:1} }
        @keyframes pm-slidein { from{opacity:0;transform:translateY(24px) scale(0.97)} to{opacity:1;transform:translateY(0) scale(1)} }
        @keyframes pm-spin { to{transform:rotate(360deg)} }
        .pm-overlay { position:fixed;inset:0;z-index:2000;background:rgba(4,8,16,0.82);backdrop-filter:blur(14px);display:flex;align-items:center;justify-content:center;padding:20px;animation:pm-fadein 0.2s ease both; }
        .pm-modal { background:linear-gradient(160deg,#0f1e2e 0%,#070c18 100%);border:1px solid rgba(201,169,110,0.22);border-radius:26px;width:100%;max-width:420px;padding:36px 30px 28px;box-shadow:0 48px 96px rgba(0,0,0,0.72),0 0 0 1px rgba(201,169,110,0.06);position:relative;animation:pm-slidein 0.32s cubic-bezier(0.22,1,0.36,1) both; }
        .pm-modal::before { content:'';position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,transparent,rgba(201,169,110,0.65),transparent);border-radius:26px 26px 0 0; }
        .pm-close { position:absolute;top:14px;inset-inline-end:14px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.07);border-radius:9px;width:34px;height:34px;cursor:pointer;color:rgba(229,224,198,0.35);font-size:16px;display:flex;align-items:center;justify-content:center;transition:all 0.2s;line-height:1; }
        .pm-close:hover { background:rgba(248,113,113,0.1);color:#f87171;border-color:rgba(248,113,113,0.3); }
        .pm-icon { width:62px;height:62px;border-radius:18px;background:rgba(201,169,110,0.1);border:1px solid rgba(201,169,110,0.22);display:flex;align-items:center;justify-content:center;font-size:26px;margin:0 auto 18px; }
        .pm-title { font-size:21px;font-weight:700;color:rgb(229,224,198);text-align:center;margin-bottom:6px; }
        .pm-subtitle { font-size:13px;color:rgba(229,224,198,0.38);text-align:center;margin-bottom:26px;line-height:1.65; }
        .pm-inputrow { position:relative;margin-bottom:12px; }
        .pm-input { width:100%;height:52px;background:rgba(255,255,255,0.04);border:1.5px solid rgba(201,169,110,0.2);border-radius:13px;color:rgb(229,224,198);font-family:monospace;font-size:17px;font-weight:700;letter-spacing:0.12em;padding:0 52px 0 18px;outline:none;text-transform:uppercase;transition:border-color 0.2s; }
        .pm-input::placeholder { font-family:'Outfit',system-ui,sans-serif;font-weight:400;letter-spacing:0.03em;color:rgba(229,224,198,0.2);font-size:13px; }
        .pm-input:focus { border-color:rgba(201,169,110,0.6); }
        .pm-input-icon { position:absolute;right:16px;top:50%;transform:translateY(-50%);font-size:20px;pointer-events:none; }
        .pm-msg { font-size:12.5px;padding:10px 14px;border-radius:10px;margin-bottom:14px;line-height:1.6; }
        .pm-msg.error { color:#fca5a5;background:rgba(248,113,113,0.08);border:1px solid rgba(248,113,113,0.22); }
        .pm-msg.info { color:rgba(201,169,110,0.85);background:rgba(201,169,110,0.07);border:1px solid rgba(201,169,110,0.2); }
        .pm-msg.warn { color:rgba(251,191,36,0.85);background:rgba(251,191,36,0.07);border:1px solid rgba(251,191,36,0.2); }
        .pm-btn { width:100%;height:52px;border:none;border-radius:13px;background:linear-gradient(135deg,#c9a96e 0%,#b8934a 100%);color:#09111a;font-family:'Outfit',system-ui,sans-serif;font-size:12px;font-weight:800;letter-spacing:0.18em;text-transform:uppercase;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:9px;transition:all 0.26s cubic-bezier(0.22,1,0.36,1);box-shadow:0 4px 22px rgba(201,169,110,0.22);margin-bottom:4px; }
        .pm-btn:hover:not(:disabled) { transform:translateY(-2px);box-shadow:0 10px 34px rgba(201,169,110,0.35); }
        .pm-btn:disabled { opacity:0.45;cursor:not-allowed;transform:none; }
        .pm-btn-ghost { width:100%;height:44px;border:1px solid rgba(229,224,198,0.08);border-radius:13px;background:transparent;color:rgba(229,224,198,0.35);font-family:'Outfit',system-ui,sans-serif;font-size:11px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all 0.2s;margin-top:8px; }
        .pm-btn-ghost:hover { border-color:rgba(229,224,198,0.2);color:rgba(229,224,198,0.6); }
        .pm-spinner { width:14px;height:14px;border:2px solid rgba(9,17,26,0.2);border-top-color:#09111a;border-radius:50%;animation:pm-spin 0.8s linear infinite; }
        .pm-hint { text-align:center;font-size:10.5px;color:rgba(229,224,198,0.16);margin-top:14px;letter-spacing:0.06em; }
      `}</style>

      <div
        className="pm-overlay"
        dir={isRtl ? "rtl" : "ltr"}
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div className="pm-modal">
          <button className="pm-close" onClick={onClose} aria-label="Close">
            ✕
          </button>

          <div className="pm-icon">🏷️</div>
          <div className="pm-title">{t("promoModal.title")}</div>
          <div className="pm-subtitle" style={{ whiteSpace: "pre-line" }}>
            {t("promoModal.subtitle")}
          </div>

          <div className="pm-inputrow">
            <input
              className="pm-input"
              type="text"
              placeholder={t("promoModal.placeholder")}
              value={input}
              onChange={(e) => {
                setInput(e.target.value.toUpperCase());
                setError(null);
                setPendingVoucher(null);
                setPartialWarning("");
              }}
              onKeyDown={(e) =>
                e.key === "Enter" && !checking && handleValidate()
              }
              autoFocus
              maxLength={20}
              disabled={checking}
              style={{ direction: "ltr", textAlign: isRtl ? "right" : "left" }}
            />
            <span className="pm-input-icon">🎟️</span>
          </div>

          {partialWarning && (
            <div className="pm-msg warn">⚠️ {partialWarning}</div>
          )}
          {error && (
            <div className={`pm-msg ${error.isInfo ? "info" : "error"}`}>
              {error.isInfo ? "ℹ️ " : "✖ "}
              {error.text}
            </div>
          )}

          {pendingVoucher ? (
            <>
              <button
                className="pm-btn"
                onClick={() => {
                  setChecking(false);
                  applyVoucher(pendingVoucher);
                }}
              >
                {t("promoModal.applyAnyway")}
              </button>
              <button
                className="pm-btn-ghost"
                onClick={() => {
                  setPendingVoucher(null);
                  setError(null);
                }}
              >
                {t("promoModal.differentCode")}
              </button>
            </>
          ) : (
            <button
              className="pm-btn"
              onClick={handleValidate}
              disabled={checking || !input.trim()}
            >
              {checking ? (
                <>
                  <div className="pm-spinner" /> {t("promoModal.checking")}
                </>
              ) : (
                t("promoModal.applyBtn")
              )}
            </button>
          )}

          <div className="pm-hint">{t("promoModal.hint")}</div>
        </div>
      </div>
    </>
  );
}
