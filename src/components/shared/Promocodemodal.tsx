/**
 * src/components/shared/Promocodemodal.tsx
 *
 * Redesigned voucher flow:
 *
 * OLD: validate in client → join → recordVoucherUsage() separately (3 operations, not atomic)
 *
 * NEW:
 *   Step 1: User types code → call validateVoucher CF (read-only, shows preview)
 *   Step 2: User clicks apply → store voucher in parent state (no write yet)
 *   Step 3: On checkout submit → call applyVoucher CF (atomic transaction, all writes)
 *
 * The modal only calls validateVoucher — a cheap read-only Cloud Function.
 * applyVoucher is called from AuctionRegisterPage after the user has joined.
 *
 * This way:
 * - No wasted writes if user changes their mind
 * - The atomic Cloud Function enforces all rules on submit
 * - The UI shows accurate real-time feedback
 */

import { useState } from "react";
import { getFunctions, httpsCallable } from "firebase/functions";
import app from "@/firebase/firebase";
import type { Voucher } from "@/pages/Admin/Voucher/voucher-data";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";

interface SelectedAuction {
  id: string;
  entryType: "free" | "paid";
  entryFee: number;
}

interface Props {
  // The single auction this voucher will apply to
  // (modal is opened per-auction in the new flow)
  auctionId: string;
  userId: string;
  auctionEntryFee: number;
  auctionEntryType: "free" | "paid";
  onApply: (voucher: Voucher, preview: VoucherPreview) => void;
  onClose: () => void;
}

export interface VoucherPreview {
  voucherId: string;
  effectiveFee: number;
  discountApplied: number;
  type: string;
  discountAmount: number | null;
}

interface ValidateResponse {
  valid: boolean;
  reason?: string;
  voucherId?: string;
  type?: string;
  discountAmount?: number | null;
  effectiveFee?: number;
  discountApplied?: number;
  remainingUses?: number;
}

const functions = getFunctions(app);
const validateVoucherFn = httpsCallable<
  { voucherCode: string; auctionId: string },
  ValidateResponse
>(functions, "validateVoucher");

export default function PromoCodeModal({
  auctionId,
  userId,
  auctionEntryFee,
  auctionEntryType,
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
  const [preview, setPreview] = useState<ValidateResponse | null>(null);

  const handleValidate = async () => {
    const code = input.trim().toUpperCase();
    if (!code) {
      setError({ text: t("promoModal.errors.empty"), isInfo: false });
      return;
    }

    setChecking(true);
    setError(null);
    setPreview(null);

    try {
      // Call the read-only Cloud Function — does NOT write anything
      const result = await validateVoucherFn({ voucherCode: code, auctionId });
      const data = result.data;

      if (!data.valid) {
        setError({
          text: data.reason ?? t("promoModal.errors.generic"),
          isInfo: false,
        });
        return;
      }

      // Show preview
      setPreview(data);

      // For final_discount, show info message before confirming
      if (data.type === "final_discount") {
        setError({
          text: t("promoModal.discountInfo", {
            amount: (data.discountAmount ?? 0).toLocaleString(),
          }),
          isInfo: true,
        });
      }
    } catch (err: any) {
      // Cloud Function errors have a message property
      const message =
        err?.message?.replace("Firebase: ", "").replace(/ \(.+\)/, "") ??
        t("promoModal.errors.generic");
      setError({ text: message, isInfo: false });
    } finally {
      setChecking(false);
    }
  };

  const handleApply = () => {
    if (!preview || !preview.voucherId) return;

    // Build a minimal Voucher object for the parent state
    // The parent will pass this to applyVoucher CF on checkout
    const voucher: Voucher = {
      id: preview.voucherId,
      code: input.trim().toUpperCase(),
      type: preview.type as any,
      discountAmount: preview.discountAmount ?? null,
      applicableAuctions: [],
      maxUses: 0, // not needed in parent state
      usageCount: 0, // not needed in parent state
      isActive: true,
      expiryDate: new Date(), // not needed in parent state
      createdAt: new Date(),
      createdBy: "",
    };

    const voucherPreview: VoucherPreview = {
      voucherId: preview.voucherId,
      effectiveFee: preview.effectiveFee ?? auctionEntryFee,
      discountApplied: preview.discountApplied ?? 0,
      type: preview.type ?? "",
      discountAmount: preview.discountAmount ?? null,
    };

    onApply(voucher, voucherPreview);

    const amount = (preview.discountAmount ?? 0).toLocaleString();
    const msg =
      preview.type === "entry_free"
        ? t("promoModal.toasts.join")
        : preview.type === "entry_discount"
          ? t("promoModal.toasts.entry_discount", { amount })
          : t("promoModal.toasts.discount", { amount });
    toast.success(msg);
  };

  return (
    <>
      <style>{`
        @keyframes pm-fadein  { from{opacity:0} to{opacity:1} }
        @keyframes pm-slidein { from{opacity:0;transform:translateY(24px) scale(0.97)} to{opacity:1;transform:translateY(0) scale(1)} }
        @keyframes pm-spin    { to{transform:rotate(360deg)} }
        .pm-overlay { position:fixed;inset:0;z-index:2000;background:rgba(4,8,16,0.82);backdrop-filter:blur(14px);display:flex;align-items:center;justify-content:center;padding:20px;animation:pm-fadein 0.2s ease both; }
        .pm-modal { background:linear-gradient(160deg,#0f1e2e 0%,#070c18 100%);border:1px solid rgba(201,169,110,0.22);border-radius:26px;width:100%;max-width:420px;padding:36px 30px 28px;box-shadow:0 48px 96px rgba(0,0,0,0.72);position:relative;animation:pm-slidein 0.32s cubic-bezier(0.22,1,0.36,1) both; }
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
        .pm-msg.info  { color:rgba(201,169,110,0.85);background:rgba(201,169,110,0.07);border:1px solid rgba(201,169,110,0.2); }
        .pm-preview { background:rgba(74,222,128,0.06);border:1px solid rgba(74,222,128,0.25);border-radius:12px;padding:14px 16px;margin-bottom:14px; }
        .pm-preview-row { display:flex;justify-content:space-between;align-items:center;font-size:13px;margin-bottom:6px; }
        .pm-preview-row:last-child { margin-bottom:0; }
        .pm-preview-label { color:rgba(229,224,198,0.45); }
        .pm-preview-value { font-weight:700;color:#4ade80; }
        .pm-preview-value.strike { text-decoration:line-through;color:rgba(229,224,198,0.3);font-weight:400; }
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
                setPreview(null);
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

          {/* Error / info message */}
          {error && (
            <div className={`pm-msg ${error.isInfo ? "info" : "error"}`}>
              {error.isInfo ? "ℹ️ " : "✖ "}
              {error.text}
            </div>
          )}

          {/* Valid voucher preview */}
          {preview?.valid && (
            <div className="pm-preview">
              {preview.type !== "final_discount" ? (
                <>
                  <div className="pm-preview-row">
                    <span className="pm-preview-label">Original fee</span>
                    <span className="pm-preview-value strike">
                      {auctionEntryFee.toLocaleString()} EGP
                    </span>
                  </div>
                  <div className="pm-preview-row">
                    <span className="pm-preview-label">You pay</span>
                    <span className="pm-preview-value">
                      {(preview.effectiveFee ?? 0) === 0
                        ? "FREE ✓"
                        : `${(preview.effectiveFee ?? 0).toLocaleString()} EGP`}
                    </span>
                  </div>
                  <div className="pm-preview-row">
                    <span className="pm-preview-label">You save</span>
                    <span className="pm-preview-value">
                      {(preview.discountApplied ?? 0).toLocaleString()} EGP
                    </span>
                  </div>
                </>
              ) : (
                <div className="pm-preview-row">
                  <span className="pm-preview-label">Final price discount</span>
                  <span className="pm-preview-value">
                    {(preview.discountAmount ?? 0).toLocaleString()} EGP off
                    winning bid
                  </span>
                </div>
              )}
              {preview.remainingUses !== undefined && (
                <div className="pm-preview-row">
                  <span className="pm-preview-label">Uses left</span>
                  <span
                    className="pm-preview-value"
                    style={{ color: "rgba(201,169,110,0.8)" }}
                  >
                    {preview.remainingUses}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Buttons */}
          {preview?.valid ? (
            <>
              <button className="pm-btn" onClick={handleApply}>
                {t("promoModal.applyAnyway")}
              </button>
              <button
                className="pm-btn-ghost"
                onClick={() => {
                  setPreview(null);
                  setError(null);
                  setInput("");
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
