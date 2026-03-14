/**
 * PromoCodeModal.tsx
 *
 * Standalone modal for promo code validation on the AuctionRegisterPage.
 *
 * Props:
 *  - selectedAuctions : the list of auctions the user currently has selected
 *  - userId           : current user's uid (to check if already used)
 *  - onApply(voucher) : called with the valid Voucher when user confirms
 *  - onClose()        : called when user dismisses without applying
 *
 * Validation logic (in order):
 *  1. Code exists in Firestore
 *  2. isActive === true
 *  3. expiryDate > now
 *  4. usedBy.length < maxUses
 *  5. User hasn't already used this code
 *  6. applicableAuctions: if set, at least one selected auction must match
 *     (partial match is ALLOWED — shows a warning, not an error)
 *  7. type === "discount"  → info banner (applies to final price, not entry), still applies
 *  8. type === "join" / "entry_discount" → the applicable auctions must have at least one paid entry
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

// ─── Types ────────────────────────────────────────────────────────────────────

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

// ─── Helper: parse a raw Firestore doc into a Voucher ─────────────────────────

function parseVoucher(id: string, d: Record<string, any>): Voucher {
  return {
    id,
    code: d.code ?? "",
    type: d.type ?? "join",
    discountAmount: d.discountAmount ?? null,
    // Support legacy docs that still use applicableProducts field name
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

// ─── Component ────────────────────────────────────────────────────────────────

export default function PromoCodeModal({
  selectedAuctions,
  userId,
  onApply,
  onClose,
}: Props) {
  const [input, setInput] = useState("");
  const [checking, setChecking] = useState(false);

  // Error = blocking red message. Info = non-blocking amber message (still lets user apply).
  const [error, setError] = useState<{ text: string; isInfo: boolean } | null>(
    null,
  );

  // If set, we confirmed a "discount" type voucher and show a preview before user confirms
  const [pendingVoucher, setPendingVoucher] = useState<Voucher | null>(null);
  const [partialWarning, setPartialWarning] = useState<string>("");

  const handleValidate = async () => {
    const code = input.trim().toUpperCase();
    if (!code) {
      setError({ text: "Please enter a promo code.", isInfo: false });
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
        setError({ text: "This promo code doesn't exist.", isInfo: false });
        return;
      }

      const v = parseVoucher(snap.docs[0].id, snap.docs[0].data());

      // ── Hard validations ──────────────────────────────────────────────────

      if (!v.isActive) {
        setError({
          text: "This promo code is no longer active.",
          isInfo: false,
        });
        return;
      }

      if (new Date() > v.expiryDate) {
        setError({
          text: `This promo code expired on ${v.expiryDate.toLocaleDateString()}.`,
          isInfo: false,
        });
        return;
      }

      if (v.usedBy.length >= v.maxUses) {
        setError({
          text: "This promo code has reached its maximum number of uses.",
          isInfo: false,
        });
        return;
      }

      if (userId && v.usedBy.some((u) => u.userId === userId)) {
        setError({
          text: "You have already used this promo code.",
          isInfo: false,
        });
        return;
      }

      // ── Auction applicability ─────────────────────────────────────────────

      let coveredAuctions = selectedAuctions;
      if (v.applicableAuctions.length > 0) {
        coveredAuctions = selectedAuctions.filter((a) =>
          v.applicableAuctions.includes(a.id),
        );
        if (coveredAuctions.length === 0) {
          setError({
            text: "This promo code is not valid for any of your selected auctions.",
            isInfo: false,
          });
          return;
        }
        // Partial match — allow but warn
        if (coveredAuctions.length < selectedAuctions.length) {
          const uncovered = selectedAuctions.length - coveredAuctions.length;
          setPartialWarning(
            `This code applies to ${coveredAuctions.length} of your ${selectedAuctions.length} selected auctions. ` +
              `The other ${uncovered} will be charged at full price.`,
          );
        }
      }

      // ── Type-specific checks ──────────────────────────────────────────────

      if (v.type === "join" || v.type === "entry_discount") {
        const hasPaidCovered = coveredAuctions.some(
          (a) => a.entryType === "paid",
        );
        if (!hasPaidCovered) {
          setError({
            text: "The auctions this code applies to already have free entry, nothing to discount.",
            isInfo: false,
          });
          return;
        }
      }

      if (v.type === "discount") {
        // Not a blocking error — just show an informational note and let the user decide
        setPendingVoucher(v);
        setError({
          text: `This code gives a ${v.discountAmount?.toLocaleString() ?? 0} EGP discount off your final winning price, not the entry fee. You can still apply it now  the discount will be deducted when you pay the winning amount.`,
          isInfo: true,
        });
        return;
      }

      // ── All clear — apply immediately ─────────────────────────────────────
      applyVoucher(v);
    } catch {
      setError({
        text: "Failed to validate code. Please try again.",
        isInfo: false,
      });
    } finally {
      setChecking(false);
    }
  };

  function applyVoucher(v: Voucher) {
    onApply(v);
    toast.success(
      v.type === "join"
        ? "🎉 Promo applied! Entry fee waived."
        : v.type === "entry_discount"
          ? `🎉 Promo applied! ${v.discountAmount?.toLocaleString() ?? 0} EGP off entry fee.`
          : `🎉 Promo applied! ${v.discountAmount?.toLocaleString() ?? 0} EGP off your winning price.`,
    );
  }

  return (
    <>
      <style>{`
        @keyframes pm-fadein  { from{opacity:0} to{opacity:1} }
        @keyframes pm-slidein { from{opacity:0;transform:translateY(24px) scale(0.97)} to{opacity:1;transform:translateY(0) scale(1)} }
        @keyframes pm-spin    { to{transform:rotate(360deg)} }

        .pm-overlay {
          position:fixed; inset:0; z-index:2000;
          background:rgba(4,8,16,0.82);
          backdrop-filter:blur(14px);
          display:flex; align-items:center; justify-content:center; padding:20px;
          animation:pm-fadein 0.2s ease both;
        }
        .pm-modal {
          background:linear-gradient(160deg,#0f1e2e 0%,#070c18 100%);
          border:1px solid rgba(201,169,110,0.22);
          border-radius:26px;
          width:100%; max-width:420px;
          padding:36px 30px 28px;
          box-shadow:0 48px 96px rgba(0,0,0,0.72), 0 0 0 1px rgba(201,169,110,0.06);
          position:relative;
          animation:pm-slidein 0.32s cubic-bezier(0.22,1,0.36,1) both;
        }
        .pm-modal::before {
          content:''; position:absolute; top:0; left:0; right:0; height:2px;
          background:linear-gradient(90deg,transparent,rgba(201,169,110,0.65),transparent);
          border-radius:26px 26px 0 0;
        }
        .pm-close {
          position:absolute; top:14px; right:14px;
          background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.07);
          border-radius:9px; width:34px; height:34px; cursor:pointer;
          color:rgba(229,224,198,0.35); font-size:16px;
          display:flex; align-items:center; justify-content:center;
          transition:all 0.2s; line-height:1;
        }
        .pm-close:hover { background:rgba(248,113,113,0.1); color:#f87171; border-color:rgba(248,113,113,0.3); }

        .pm-icon {
          width:62px; height:62px; border-radius:18px;
          background:rgba(201,169,110,0.1); border:1px solid rgba(201,169,110,0.22);
          display:flex; align-items:center; justify-content:center;
          font-size:26px; margin:0 auto 18px;
        }
        .pm-title    { font-size:21px; font-weight:700; color:rgb(229,224,198); text-align:center; margin-bottom:6px; }
        .pm-subtitle { font-size:13px; color:rgba(229,224,198,0.38); text-align:center; margin-bottom:26px; line-height:1.65; }

        .pm-inputrow  { position:relative; margin-bottom:12px; }
        .pm-input {
          width:100%; height:52px;
          background:rgba(255,255,255,0.04);
          border:1.5px solid rgba(201,169,110,0.2);
          border-radius:13px;
          color:rgb(229,224,198);
          font-family:monospace; font-size:17px; font-weight:700; letter-spacing:0.12em;
          padding:0 52px 0 18px;
          outline:none; text-transform:uppercase;
          transition:border-color 0.2s;
        }
        .pm-input::placeholder {
          font-family:'Outfit',system-ui,sans-serif; font-weight:400;
          letter-spacing:0.03em; color:rgba(229,224,198,0.2); font-size:13px;
        }
        .pm-input:focus { border-color:rgba(201,169,110,0.6); }
        .pm-input-icon { position:absolute; right:16px; top:50%; transform:translateY(-50%); font-size:20px; pointer-events:none; }

        .pm-msg {
          font-size:12.5px; padding:10px 14px; border-radius:10px;
          margin-bottom:14px; line-height:1.6;
        }
        .pm-msg.error { color:#fca5a5; background:rgba(248,113,113,0.08); border:1px solid rgba(248,113,113,0.22); }
        .pm-msg.info  { color:rgba(201,169,110,0.85); background:rgba(201,169,110,0.07); border:1px solid rgba(201,169,110,0.2); }
        .pm-msg.warn  { color:rgba(251,191,36,0.85); background:rgba(251,191,36,0.07); border:1px solid rgba(251,191,36,0.2); }

        .pm-btn {
          width:100%; height:52px; border:none; border-radius:13px;
          background:linear-gradient(135deg,#c9a96e 0%,#b8934a 100%);
          color:#09111a; font-family:'Outfit',system-ui,sans-serif;
          font-size:12px; font-weight:800; letter-spacing:0.18em; text-transform:uppercase;
          cursor:pointer; display:flex; align-items:center; justify-content:center; gap:9px;
          transition:all 0.26s cubic-bezier(0.22,1,0.36,1);
          box-shadow:0 4px 22px rgba(201,169,110,0.22);
          margin-bottom:4px;
        }
        .pm-btn:hover:not(:disabled) { transform:translateY(-2px); box-shadow:0 10px 34px rgba(201,169,110,0.35); }
        .pm-btn:disabled { opacity:0.45; cursor:not-allowed; transform:none; }

        .pm-btn-ghost {
          width:100%; height:44px; border:1px solid rgba(229,224,198,0.08);
          border-radius:13px; background:transparent;
          color:rgba(229,224,198,0.35); font-family:'Outfit',system-ui,sans-serif;
          font-size:11px; font-weight:600; letter-spacing:0.1em; text-transform:uppercase;
          cursor:pointer; display:flex; align-items:center; justify-content:center;
          transition:all 0.2s;
          margin-top:8px;
        }
        .pm-btn-ghost:hover { border-color:rgba(229,224,198,0.2); color:rgba(229,224,198,0.6); }

        .pm-spinner {
          width:14px; height:14px;
          border:2px solid rgba(9,17,26,0.2); border-top-color:#09111a;
          border-radius:50%; animation:pm-spin 0.8s linear infinite;
        }
        .pm-hint { text-align:center; font-size:10.5px; color:rgba(229,224,198,0.16); margin-top:14px; letter-spacing:0.06em; }
      `}</style>

      <div
        className="pm-overlay"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div className="pm-modal">
          <button className="pm-close" onClick={onClose} aria-label="Close">
            ✕
          </button>

          <div className="pm-icon">🏷️</div>
          <div className="pm-title">Promo Code</div>
          <div className="pm-subtitle">
            Enter your promo code to unlock a discount
            <br />
            on your entry fee or final winning price.
          </div>

          {/* Input */}
          <div className="pm-inputrow">
            <input
              className="pm-input"
              type="text"
              placeholder="e.g. SUMMER25"
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
            />
            <span className="pm-input-icon">🎟️</span>
          </div>

          {/* Partial match warning (shown alongside error/info, not instead of it) */}
          {partialWarning && (
            <div className="pm-msg warn">⚠️ {partialWarning}</div>
          )}

          {/* Error / info message */}
          {error && (
            <div className={`pm-msg ${error.isInfo ? "info" : "error"}`}>
              {error.isInfo ? "ℹ️ " : "✖ "}
              {error.text}
            </div>
          )}

          {/* Primary CTA — label changes based on state */}
          {pendingVoucher ? (
            // "discount" type confirmed — user must explicitly confirm
            <>
              <button
                className="pm-btn"
                onClick={() => {
                  setChecking(false);
                  applyVoucher(pendingVoucher);
                }}
              >
                Apply Anyway
              </button>
              <button
                className="pm-btn-ghost"
                onClick={() => {
                  setPendingVoucher(null);
                  setError(null);
                }}
              >
                Enter a Different Code
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
                  <div className="pm-spinner" /> Checking…
                </>
              ) : (
                "Apply Code"
              )}
            </button>
          )}

          <div className="pm-hint">
            Codes are case-insensitive · One code per checkout
          </div>
        </div>
      </div>
    </>
  );

  
}
