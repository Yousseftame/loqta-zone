/**
 * src/components/shared/Notificationbell.tsx
 *
 * auction_ended:
 * - New type added — styled elegantly like payment_confirmed (non-clickable)
 * - AuctionEndedIcon: a soft dark-gold circular icon with a gavel/flag motif
 * - FormattedAuctionEndedMessage: renders product name, auction number, warm farewell text
 * - Non-clickable — clicking does nothing, navigates nowhere
 * - Localized via t("notifications.auctionEnded.*")
 *
 * voucher_created localization:
 * - getLocalizedNotif now handles voucher_created — title uses t("notifications.voucherCreated.title/titleGeneric")
 * - FormattedVoucherMessage accepts { notif, t, isRTL } and uses t() for all UI strings
 * - CopyableCode accepts { code, t } and uses t() for "tap to copy" / "✓ copied"
 * - All other notification types unchanged
 *
 * auction_registered:
 * - New type added — styled like payment_confirmed (elegant + non-clickable icon)
 * - FormattedRegistrationMessage renders product name, auction number, entry fee
 * - Navigates to /auctions/register/{productId} on click
 */

import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/store/AuthContext/AuthContext";
import { X, Gavel, Trophy, Heart, Tag, Clock, Bell, Gift } from "lucide-react";
import {
  useNotifications,
  type AppNotification,
  type NotificationType,
} from "@/hooks/useNotifications";

// ── timeAgo ───────────────────────────────────────────────────────────────────
function timeAgo(date: Date): string {
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ── getLocalizedNotif ─────────────────────────────────────────────────────────
function getLocalizedNotif(
  notif: AppNotification,
  t: (key: string, opts?: Record<string, any>) => string,
): { title: string; message: string } {
  const fmt = (n: number) => n.toLocaleString("en-EG");
  const data = notif as any;

  function parseAmountFromMessage(msg: string): number {
    const match = msg.match(/([\d,]+)\s*EGP/i);
    if (!match) return 0;
    return parseInt(match[1].replace(/,/g, ""), 10) || 0;
  }
  function parseProductFromMessage(msg: string): string {
    const match = msg.match(/"([^"]+)"/);
    return match ? match[1] : "";
  }

  switch (notif.type) {
    case "bid_selected": {
      const amount = data.winningBid ?? data.amount ?? 0;
      const product = data.productTitle ?? data.productName ?? "";
      return {
        title: t("notifications.bidSelected.title"),
        message: t("notifications.bidSelected.message", {
          product: product || parseProductFromMessage(notif.message),
          amount: fmt(amount || parseAmountFromMessage(notif.message)),
        }),
      };
    }
    case "last_offer_selected": {
      const amount = data.winningBid ?? data.amount ?? 0;
      const product = data.productTitle ?? data.productName ?? "";
      return {
        title: t("notifications.lastOfferSelected.title"),
        message: t("notifications.lastOfferSelected.message", {
          product: product || parseProductFromMessage(notif.message),
          amount: fmt(amount || parseAmountFromMessage(notif.message)),
        }),
      };
    }
    case "payment_confirmed": {
      const amount = data.amount ?? data.winningBid ?? data.paymentAmount ?? 0;
      const product =
        data.productTitle ?? data.productName ?? data.itemTitle ?? "";
      return {
        title: t("notifications.paymentConfirmed.title"),
        message: t("notifications.paymentConfirmed.message", {
          product: product || parseProductFromMessage(notif.message),
          amount: fmt(amount || parseAmountFromMessage(notif.message)),
        }),
      };
    }
    case "auction_matched": {
      const product = data.productName ?? data.productTitle ?? "";
      return {
        title: t("notifications.auctionMatched.title"),
        message: t("notifications.auctionMatched.message", {
          product: product || parseProductFromMessage(notif.message),
        }),
      };
    }
    case "last_offer_available": {
      const product = (data.productTitle ?? data.productName ?? "") as string;
      return {
        title: product
          ? t("notifications.lastOfferAvailable.title", { product })
          : t("notifications.lastOfferAvailable.titleGeneric"),
        message: notif.message,
      };
    }
    case "voucher_created": {
      const label = (data.voucherLabel ?? "") as string;
      const title = label
        ? t("notifications.voucherCreated.title", { label })
        : t("notifications.voucherCreated.titleGeneric");
      return { title, message: notif.message };
    }
    case "auction_registered": {
      const num = (data.auctionNumber ?? 0) as number;
      return {
        title: t("notifications.auctionRegistered.title", { num }),
        message: notif.message,
      };
    }
    case "auction_ended": {
      const num = (data.auctionNumber ?? 0) as number;
      const product = (data.productTitle ?? "") as string;
      return {
        title: t("notifications.auctionEnded.title", { num }),
        message: product
          ? t("notifications.auctionEnded.message", { product, num })
          : t("notifications.auctionEnded.messageGeneric", { num }),
      };
    }
    default:
      return { title: notif.title, message: notif.message };
  }
}

// ── FormattedSelectionMessage ─────────────────────────────────────────────────
function FormattedSelectionMessage({ message }: { message: string }) {
  const parts = message.split(/\n\n/);
  const mainText = parts[0] ?? message;
  const warnText = parts[1] ?? null;

  const renderSegments = (text: string): React.ReactNode[] => {
    const segs: React.ReactNode[] = [];
    let rem = text,
      key = 0;
    const pm = rem.match(/"([^"]+)"/);
    if (pm) {
      const q = `"${pm[1]}"`,
        idx = rem.indexOf(q);
      if (idx > -1) {
        if (idx > 0) segs.push(<span key={key++}>{rem.slice(0, idx)}</span>);
        segs.push(
          <span key={key++} style={{ color: "#c9a96e", fontWeight: 600 }}>
            {q}
          </span>,
        );
        rem = rem.slice(idx + q.length);
      }
    }
    const am = rem.match(/([\d,]+\s*(?:EGP|جنيه))/i);
    if (am) {
      const idx = rem.indexOf(am[1]);
      if (idx > -1) {
        if (idx > 0) segs.push(<span key={key++}>{rem.slice(0, idx)}</span>);
        segs.push(
          <span key={key++} style={{ color: "#c9a96e", fontWeight: 700 }}>
            {am[1]}
          </span>,
        );
        rem = rem.slice(idx + am[1].length);
      }
    }
    if (rem) segs.push(<span key={key++}>{rem}</span>);
    return segs;
  };

  return (
    <div style={{ marginBottom: 4 }}>
      <p className="nf-item-msg" style={{ marginBottom: warnText ? 6 : 0 }}>
        {renderSegments(mainText)}
      </p>
      {warnText && (
        <p
          className="nf-item-msg"
          style={{
            marginBottom: 0,
            color: "rgba(255,200,100,0.7)",
            fontSize: "11px",
            fontWeight: 600,
            borderLeft: "2px solid rgba(255,180,80,0.4)",
            paddingLeft: 6,
            lineHeight: 1.5,
          }}
        >
          {warnText}
        </p>
      )}
    </div>
  );
}

// ── FormattedPaymentMessage ───────────────────────────────────────────────────
function FormattedPaymentMessage({
  message,
  onContactClick,
}: {
  message: string;
  onContactClick: () => void;
}) {
  const parts = message.split(/(contact us|تواصل معنا)/i);
  return (
    <p className="nf-item-msg" style={{ marginBottom: 4 }}>
      {parts.map((part, i) => {
        if (/^(contact us|تواصل معنا)$/i.test(part))
          return (
            <span
              key={i}
              onClick={(e) => {
                e.stopPropagation();
                onContactClick();
              }}
              style={{
                color: "#c9a96e",
                textDecoration: "underline",
                textUnderlineOffset: "2px",
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              {part}
            </span>
          );
        const am = part.match(/([\d,]+\s*(?:EGP|جنيه))/i);
        if (am) {
          const idx = part.indexOf(am[1]);
          return (
            <span key={i}>
              {part.slice(0, idx)}
              <span style={{ color: "#c9a96e", fontWeight: 700 }}>{am[1]}</span>
              {part.slice(idx + am[1].length)}
            </span>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </p>
  );
}

// ── FormattedMatchedMessage ───────────────────────────────────────────────────
function FormattedMatchedMessage({ message }: { message: string }) {
  const segs: React.ReactNode[] = [];
  let rem = message,
    key = 0;
  const idx = rem.search(/ is now live| متاح الآن/i);
  if (idx > 0) {
    segs.push(
      <span key={key++} style={{ color: "#c9a96e", fontWeight: 700 }}>
        {rem.slice(0, idx)}
      </span>,
    );
    rem = rem.slice(idx);
  }
  if (rem) segs.push(<span key={key++}>{rem}</span>);
  return (
    <p className="nf-item-msg" style={{ marginBottom: 4 }}>
      {segs.length > 0 ? segs : message}
    </p>
  );
}

// ── CopyableCode ──────────────────────────────────────────────────────────────
function CopyableCode({
  code,
  t,
}: {
  code: string;
  t: (key: string, opts?: Record<string, any>) => string;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard
      .writeText(code)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(() => {
        const ta = document.createElement("textarea");
        ta.value = code;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
  };

  return (
    <div
      onClick={handleCopy}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        background: "rgba(22, 45, 69, 0.7)",
        border: "1px solid rgba(201,169,110,0.28)",
        borderRadius: 6,
        padding: "5px 10px",
        cursor: "pointer",
        marginTop: 4,
        alignSelf: "flex-start",
        transition: "border-color 0.2s, background 0.2s",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.borderColor =
          "rgba(201,169,110,0.55)";
        (e.currentTarget as HTMLDivElement).style.background =
          "rgba(22,45,69,0.9)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.borderColor =
          "rgba(201,169,110,0.28)";
        (e.currentTarget as HTMLDivElement).style.background =
          "rgba(22,45,69,0.7)";
      }}
    >
      <span
        style={{
          fontWeight: 700,
          fontSize: "13px",
          color: "#c9a96e",
          userSelect: "all",
        }}
      >
        {code}
      </span>
      <span
        style={{
          fontSize: "10px",
          fontFamily: "'Jost',sans-serif",
          fontWeight: copied ? 600 : 400,
          color: copied ? "rgba(94,232,160,0.85)" : "rgba(201,169,110,0.35)",
          transition: "color 0.2s, font-weight 0.2s",
          userSelect: "none",
          minWidth: 52,
        }}
      >
        {copied
          ? t("notifications.voucherCreated.copied")
          : t("notifications.voucherCreated.tapToCopy")}
      </span>
    </div>
  );
}

// ── FormattedVoucherMessage ───────────────────────────────────────────────────
function FormattedVoucherMessage({
  notif,
  t,
  isRTL,
}: {
  notif: AppNotification;
  t: (key: string, opts?: Record<string, any>) => string;
  isRTL: boolean;
}) {
  const data = notif as any;

  let code = (data.voucherCode ?? "") as string;
  let label = (data.voucherLabel ?? "") as string;
  let expiry = (data.expiry ?? "") as string;
  let maxUses = (data.maxUses ?? 0) as number;

  let auctions: { productTitle: string; auctionNumber: number }[] = [];

  try {
    const raw = data.auctionItems ?? "";
    if (raw) auctions = JSON.parse(raw);
  } catch {
    /* ignore */
  }

  if (auctions.length === 0) {
    const line = (data.auctionLine ?? "") as string;
    if (line && line !== "All Auctions" && line !== "جميع المزادات") {
      const parsed = line.split(", ").map((part: string) => {
        const m = part.match(/^(.+)\s+\(#(\d+)\)$/);
        return m
          ? { productTitle: m[1].trim(), auctionNumber: parseInt(m[2], 10) }
          : { productTitle: part.trim(), auctionNumber: 0 };
      });
      if (parsed.length > 0) auctions = parsed;
    }
  }

  const msg = notif.message ?? "";

  if (!code) {
    const m = msg.match(/Use code ([A-Z0-9]+)/i);
    if (m) code = m[1].toUpperCase();
  }

  if (!expiry) {
    const m = msg.match(/Expires?\s+([A-Za-z]+\s+\d+,?\s+\d{4})/i);
    if (m) expiry = m[1];
  }

  if (!maxUses) {
    const m = msg.match(/·\s*(\d+)\s+uses?\s+only/i);
    if (m) maxUses = parseInt(m[1], 10);
  }

  if (auctions.length === 0 && code) {
    const afterCode = msg.replace(/Use code [A-Z0-9]+\s+on\s+/i, "");
    const beforeExpiry = afterCode.split(/\.\s*Expires/i)[0];
    if (beforeExpiry) {
      const parts = beforeExpiry.split(/,\s*/);
      const parsed = parts
        .map((part) => {
          const m = part.trim().match(/^(.+?)\s+\(#(\d+)\)$/);
          return m
            ? { productTitle: m[1].trim(), auctionNumber: parseInt(m[2], 10) }
            : null;
        })
        .filter(Boolean) as { productTitle: string; auctionNumber: number }[];
      if (parsed.length > 0) auctions = parsed;
    }
  }

  if (!label && notif.title) {
    const full = notif.title
      .replace(/^🎟️\s*/i, "")
      .replace(/^Exclusive Voucher\s*[—-]\s*/i, "")
      .replace(/^كوبون حصري\s*[—-]\s*/i, "");
    const onIdx = full.search(/\s+on\s+/i);
    label = onIdx > 0 ? full.slice(0, onIdx).trim() : full.trim();
    if (label.toLowerCase() === auctions[0]?.productTitle?.toLowerCase()) {
      label = "";
    }
  }

  const universalVoucher = auctions.length === 0;
  const hasAnyContent =
    code || label || expiry || maxUses > 0 || auctions.length > 0;

  if (!hasAnyContent) {
    return (
      <p className="nf-item-msg" style={{ marginBottom: 4 }}>
        {msg}
      </p>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 4,
        marginBottom: 4,
      }}
    >
      {label && (
        <p
          style={{
            fontFamily: "'Jost',sans-serif",
            fontSize: "11.5px",
            fontWeight: 500,
            color: "rgba(229,224,198,0.68)",
            margin: 0,
            lineHeight: 1.4,
            direction: isRTL ? "rtl" : "ltr",
          }}
        >
          <span style={{ color: "#c9a96e", fontWeight: 700 }}>{label}</span>
        </p>
      )}

      {universalVoucher ? (
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <span
            style={{
              display: "inline-block",
              width: 3,
              height: 3,
              borderRadius: "50%",
              background: "rgba(201,169,110,0.4)",
              flexShrink: 0,
            }}
          />
          <span
            style={{
              fontFamily: "'Jost',sans-serif",
              fontSize: "11px",
              color: "rgba(229,224,198,0.38)",
            }}
          >
            {t("notifications.voucherCreated.validOnAll")}
          </span>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {auctions.map((a, idx) => (
            <div
              key={idx}
              style={{ display: "flex", alignItems: "center", gap: 5 }}
            >
              <span
                style={{
                  display: "inline-block",
                  width: 3,
                  height: 3,
                  borderRadius: "50%",
                  background: "rgba(201,169,110,0.4)",
                  flexShrink: 0,
                }}
              />
              <span
                style={{
                  fontFamily: "'Jost',sans-serif",
                  fontSize: "12px",
                  color: "rgba(229,224,198,0.52)",
                  fontWeight: 400,
                }}
              >
                {a.productTitle}
                <span
                  style={{
                    color: "rgba(201,169,110,0.35)",
                    margin: "0 4px",
                  }}
                >
                  ·
                </span>
                <span
                  style={{
                    color: "rgba(201,169,110,0.6)",
                    fontWeight: 600,
                  }}
                >
                  #{a.auctionNumber}
                </span>
              </span>
            </div>
          ))}
        </div>
      )}

      {code && <CopyableCode code={code} t={t} />}

      {(expiry || maxUses > 0) && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 5,
            marginTop: 3,
            direction: isRTL ? "rtl" : "ltr",
          }}
        >
          {expiry && (
            <span
              style={{
                fontFamily: "'Jost',sans-serif",
                fontSize: "11.5px",
                color: "rgba(229,224,198,0.75)",
                lineHeight: 1.3,
              }}
            >
              {t("notifications.voucherCreated.exp", { date: expiry })}
            </span>
          )}
          {expiry && maxUses > 0 && (
            <span
              style={{
                color: "rgba(229,224,198,0.15)",
                fontSize: "9px",
                userSelect: "none",
              }}
            >
              ·
            </span>
          )}
          {maxUses > 0 && (
            <span
              style={{
                fontFamily: "'Jost',sans-serif",
                fontSize: "11.5px",
                color: "rgba(229,224,198,0.75)",
                lineHeight: 1.3,
              }}
            >
              {t("notifications.voucherCreated.usesOnly", { count: maxUses })}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// ── FormattedLastOfferAvailableMessage ────────────────────────────────────────
function FormattedLastOfferAvailableMessage({
  notif,
  t,
  isRTL,
}: {
  notif: AppNotification;
  t: (key: string, opts?: Record<string, any>) => string;
  isRTL: boolean;
}) {
  const data = notif as any;
  const winnerName = (data.winnerName ?? "") as string;
  const winningBid = (data.winningBid ?? 0) as number;
  const productTitle = (data.productTitle ?? data.productName ?? "") as string;
  const cur = isRTL ? "جنيه" : "EGP";

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 5,
        marginBottom: 4,
        direction: isRTL ? "rtl" : "ltr",
      }}
    >
      {productTitle && (
        <p
          style={{
            fontFamily: "'Jost',sans-serif",
            fontSize: "12.5px",
            fontWeight: 600,
            color: "rgba(201,169,110,0.9)",
            margin: 0,
            lineHeight: 1.4,
          }}
        >
          {productTitle}
        </p>
      )}

      {(winnerName || winningBid > 0) && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            flexWrap: "wrap",
          }}
        >
          {winnerName && (
            <span
              style={{
                fontFamily: "'Jost',sans-serif",
                fontSize: "11px",
                color: "rgba(229,224,198,0.45)",
                fontWeight: 400,
              }}
            >
              {isRTL ? "الفائز:" : "Winner:"}{" "}
              <span
                style={{ color: "rgba(229,224,198,0.65)", fontWeight: 600 }}
              >
                {winnerName}
              </span>
            </span>
          )}
          {winningBid > 0 && (
            <span
              style={{
                fontFamily: "'Jost',sans-serif",
                fontSize: "12px",
                fontWeight: 700,
                color: "#c9a96e",
              }}
            >
              {winningBid.toLocaleString("en-EG")}{" "}
              <span
                style={{
                  fontSize: "10px",
                  color: "rgba(201,169,110,0.45)",
                  fontWeight: 500,
                }}
              >
                {cur}
              </span>
            </span>
          )}
        </div>
      )}

      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 5,
          background: "rgba(201,169,110,0.08)",
          border: "1px solid rgba(201,169,110,0.2)",
          borderRadius: 6,
          padding: "4px 10px",
          marginTop: 2,
          alignSelf: "flex-start",
        }}
      >
        <span
          style={{
            fontSize: "11px",
            fontFamily: "'Jost',sans-serif",
            fontWeight: 800,
            letterSpacing: "0.1em",
            textTransform: "uppercase" as const,
            color: "#c9a96e",
          }}
        >
          {isRTL ? "✦ قدّم عرضك الأخير →" : "✦ Submit your last offer →"}
        </span>
      </div>
    </div>
  );
}

// ── FormattedRegistrationMessage ──────────────────────────────────────────────
function FormattedRegistrationMessage({
  notif,
  t,
  isRTL,
}: {
  notif: AppNotification;
  t: (key: string, opts?: Record<string, any>) => string;
  isRTL: boolean;
}) {
  const data = notif as any;
  const productTitle = (data.productTitle ?? "") as string;
  const auctionNum = (data.auctionNumber ?? 0) as number;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 5,
        marginBottom: 4,
        direction: isRTL ? "rtl" : "ltr",
      }}
    >
      {productTitle && (
        <p
          style={{
            fontFamily: "'Jost',sans-serif",
            fontSize: "12.5px",
            fontWeight: 500,
            color: "rgba(229,224,198,0.65)",
            margin: 0,
            lineHeight: 1.4,
          }}
        >
          {productTitle}
          {auctionNum > 0 && (
            <span
              style={{
                color: "rgba(56,189,210,0.5)",
                fontWeight: 600,
                marginLeft: isRTL ? 0 : 6,
                marginRight: isRTL ? 6 : 0,
                fontSize: "11px",
              }}
            >
              · #{auctionNum}
            </span>
          )}
        </p>
      )}

      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 5,
          background: "rgba(56,189,210,0.06)",
          border: "1px solid rgba(56,189,210,0.2)",
          borderRadius: 6,
          padding: "4px 10px",
          marginTop: 2,
          alignSelf: "flex-start",
        }}
      >
        <span
          style={{
            fontSize: "11px",
            fontFamily: "'Jost',sans-serif",
            fontWeight: 700,
            letterSpacing: "0.08em",
            color: "rgba(56,189,210,0.8)",
          }}
        >
          {t("notifications.auctionRegistered.goodLuck")}
        </span>
      </div>
    </div>
  );
}

// ── FormattedAuctionEndedMessage ──────────────────────────────────────────────
function FormattedAuctionEndedMessage({
  notif,
  t,
  isRTL,
}: {
  notif: AppNotification;
  t: (key: string, opts?: Record<string, any>) => string;
  isRTL: boolean;
}) {
  const data = notif as any;
  const productTitle = (data.productTitle ?? "") as string;
  const auctionNum = (data.auctionNumber ?? 0) as number;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 5,
        marginBottom: 4,
        direction: isRTL ? "rtl" : "ltr",
      }}
    >
      {/* Product name + auction number */}
      {productTitle && (
        <p
          style={{
            fontFamily: "'Jost',sans-serif",
            fontSize: "12.5px",
            fontWeight: 500,
            color: "rgba(229,224,198,0.62)",
            margin: 0,
            lineHeight: 1.4,
          }}
        >
          {productTitle}
          {auctionNum > 0 && (
            <span
              style={{
                color: "rgba(201,169,110,0.38)",
                fontWeight: 600,
                marginLeft: isRTL ? 0 : 6,
                marginRight: isRTL ? 6 : 0,
                fontSize: "11px",
              }}
            >
              · #{auctionNum}
            </span>
          )}
        </p>
      )}

      {/* Warm farewell pill */}
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 5,
          background: "rgba(201,169,110,0.06)",
          border: "1px solid rgba(201,169,110,0.16)",
          borderRadius: 6,
          padding: "4px 10px",
          marginTop: 2,
          alignSelf: "flex-start",
        }}
      >
        <span
          style={{
            fontSize: "11px",
            fontFamily: "'Jost',sans-serif",
            fontWeight: 700,
            letterSpacing: "0.08em",
            color: "rgba(201,169,110,0.65)",
          }}
        >
          {t("notifications.auctionEnded.seeYouSoon")}
        </span>
      </div>
    </div>
  );
}

// ── PaymentConfirmedIcon ──────────────────────────────────────────────────────
function PaymentConfirmedIcon() {
  return (
    <div
      style={{
        width: 44,
        height: 44,
        borderRadius: "50%",
        background: "linear-gradient(135deg,#22c55e 0%,#16a34a 100%)",
        border: "2.5px solid rgba(74,222,128,0.55)",
        boxShadow: "0 0 16px rgba(74,222,128,0.35), 0 4px 10px rgba(0,0,0,0.3)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        marginTop: 1,
      }}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <path
          d="M5 13l4 4L19 7"
          stroke="#fff"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

// ── AuctionRegisteredIcon ─────────────────────────────────────────────────────
function AuctionRegisteredIcon({ isUnread }: { isUnread: boolean }) {
  return (
    <div
      style={{
        width: 44,
        height: 44,
        borderRadius: "50%",
        background: "linear-gradient(135deg,#0e3d4f 0%,#061824 100%)",
        border: "2.5px solid rgba(56,189,210,0.5)",
        boxShadow: isUnread
          ? "0 0 16px rgba(56,189,210,0.28), 0 4px 12px rgba(0,0,0,0.35)"
          : "0 4px 10px rgba(0,0,0,0.25)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        marginTop: 1,
        position: "relative" as const,
      }}
    >
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <path
          d="M5 13l4 4L19 7"
          stroke="#38bdd2"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {isUnread && (
        <span
          style={{
            position: "absolute",
            bottom: -2,
            right: -2,
            width: 9,
            height: 9,
            borderRadius: "50%",
            background: "#38bdd2",
            border: "2px solid #080d1a",
            animation: "nfDotPulse 1.8s ease-in-out infinite",
          }}
        />
      )}
    </div>
  );
}

// ── AuctionEndedIcon ──────────────────────────────────────────────────────────
// Elegant dark-gold circular icon with a subtle gavel silhouette.
// Deliberately muted — this is a farewell, not a celebration.
function AuctionEndedIcon({ isUnread }: { isUnread: boolean }) {
  return (
    <div
      style={{
        width: 44,
        height: 44,
        borderRadius: "50%",
        background: "linear-gradient(135deg,#1c1608 0%,#0f0b04 100%)",
        border: "2px solid rgba(201,169,110,0.3)",
        boxShadow: isUnread
          ? "0 0 14px rgba(201,169,110,0.18), 0 4px 10px rgba(0,0,0,0.35)"
          : "0 4px 10px rgba(0,0,0,0.3)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        marginTop: 1,
        position: "relative" as const,
      }}
    >
      {/* Hourglass / time-ended SVG */}
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <path
          d="M5 2h14M5 22h14M6 2v5l6 5-6 5v5M18 2v5l-6 5 6 5v5"
          stroke="rgba(201,169,110,0.7)"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {isUnread && (
        <span
          style={{
            position: "absolute",
            bottom: -2,
            right: -2,
            width: 9,
            height: 9,
            borderRadius: "50%",
            background: "rgba(201,169,110,0.8)",
            border: "2px solid #080d1a",
            animation: "nfDotPulse 1.8s ease-in-out infinite",
          }}
        />
      )}
    </div>
  );
}

// ── VoucherTicketIcon ─────────────────────────────────────────────────────────
function VoucherTicketIcon({ isUnread }: { isUnread: boolean }) {
  return (
    <div
      style={{
        width: 44,
        height: 44,
        borderRadius: 14,
        flexShrink: 0,
        marginTop: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
      }}
    >
      <span style={{ fontSize: 30, lineHeight: 1, userSelect: "none" }}>
        🎟️
      </span>
      {isUnread && (
        <span
          style={{
            position: "absolute",
            bottom: -2,
            right: -2,
            width: 9,
            height: 9,
            borderRadius: "50%",
            background: "#c9a96e",
            border: "2px solid #080d1a",
            animation: "nfDotPulse 1.8s ease-in-out infinite",
          }}
        />
      )}
    </div>
  );
}

// ── LastOfferAvailableIcon ────────────────────────────────────────────────────
function LastOfferAvailableIcon({ isUnread }: { isUnread: boolean }) {
  return (
    <div
      style={{
        width: 44,
        height: 44,
        borderRadius: 14,
        flexShrink: 0,
        marginTop: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        background: "rgba(201,169,110,0.08)",
        border: "1px solid rgba(201,169,110,0.22)",
      }}
    >
      <span style={{ fontSize: 22, lineHeight: 1, userSelect: "none" }}>
        🏷️
      </span>
      {isUnread && (
        <span
          style={{
            position: "absolute",
            bottom: -2,
            right: -2,
            width: 9,
            height: 9,
            borderRadius: "50%",
            background: "#c9a96e",
            border: "2px solid #080d1a",
            animation: "nfDotPulse 1.8s ease-in-out infinite",
          }}
        />
      )}
    </div>
  );
}

// ── TYPE_CONFIG ───────────────────────────────────────────────────────────────
const TYPE_CONFIG: Record<
  NotificationType,
  { Icon: any; color: string; bg: string; border: string }
> = {
  auction_matched: {
    Icon: Gavel,
    color: "#c9a96e",
    bg: "rgba(201,169,110,0.13)",
    border: "rgba(201,169,110,0.28)",
  },
  bid: {
    Icon: Gavel,
    color: "#64a0ff",
    bg: "rgba(100,160,255,0.13)",
    border: "rgba(100,160,255,0.25)",
  },
  win: {
    Icon: Trophy,
    color: "#c9a96e",
    bg: "rgba(201,169,110,0.13)",
    border: "rgba(201,169,110,0.28)",
  },
  watchlist: {
    Icon: Heart,
    color: "#ff6b9d",
    bg: "rgba(255,107,157,0.13)",
    border: "rgba(255,107,157,0.25)",
  },
  promo: {
    Icon: Tag,
    color: "#5ee8a0",
    bg: "rgba(94,232,160,0.13)",
    border: "rgba(94,232,160,0.25)",
  },
  expiry: {
    Icon: Clock,
    color: "#ff9d5c",
    bg: "rgba(255,157,92,0.13)",
    border: "rgba(255,157,92,0.25)",
  },
  last_offer_selected: {
    Icon: Gift,
    color: "#c9a96e",
    bg: "rgba(201,169,110,0.12)",
    border: "rgba(201,169,110,0.35)",
  },
  bid_selected: {
    Icon: Trophy,
    color: "#c9a96e",
    bg: "rgba(201,169,110,0.12)",
    border: "rgba(201,169,110,0.35)",
  },
  payment_confirmed: {
    Icon: null,
    color: "#4ade80",
    bg: "rgba(74,222,128,0.1)",
    border: "rgba(74,222,128,0.3)",
  },
  voucher_created: {
    Icon: null,
    color: "#c9a96e",
    bg: "rgba(201,169,110,0.1)",
    border: "rgba(201,169,110,0.3)",
  },
  last_offer_available: {
    Icon: null,
    color: "#c9a96e",
    bg: "rgba(201,169,110,0.1)",
    border: "rgba(201,169,110,0.3)",
  },
  auction_registered: {
    Icon: null,
    color: "#c9a96e",
    bg: "rgba(201,169,110,0.08)",
    border: "rgba(201,169,110,0.28)",
  },
  auction_ended: {
    Icon: null, // uses AuctionEndedIcon
    color: "rgba(201,169,110,0.55)",
    bg: "rgba(201,169,110,0.05)",
    border: "rgba(201,169,110,0.18)",
  },
};

// ─────────────────────────────────────────────────────────────────────────────

export const NotificationBell = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === "ar";

  const [open, setOpen] = useState(false);
  const [attracted, setAttracted] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const { notifications, unreadCount, markRead, markAllRead, dismiss } =
    useNotifications();

  useEffect(() => {
    if (unreadCount === 0) return;
    const fire = () => {
      setAttracted(true);
      setTimeout(() => setAttracted(false), 2000);
    };
    const initial = setTimeout(fire, 1200);
    const interval = setInterval(fire, 7000);
    return () => {
      clearTimeout(initial);
      clearInterval(interval);
    };
  }, [unreadCount]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleItemClick = (notif: AppNotification) => {
    // Non-clickable types — mark read only, no navigation
    if (
      notif.type === "payment_confirmed" ||
      notif.type === "voucher_created" ||
      notif.type === "auction_ended"
    ) {
      markRead(notif.id);
      return;
    }
    markRead(notif.id);
    setOpen(false);

    // auction_registered — navigate to the register page for this product
    if (notif.type === "auction_registered") {
      const d = notif as any;
      const pid = d.productId ?? "";
      if (pid) navigate(`/auctions/register/${pid}`);
      return;
    }

    if (notif.url) {
      navigate(notif.url);
      return;
    }
    if (notif.type === "auction_matched") {
      const d = notif as any;
      const pid = d.productId ?? "";
      if (pid) navigate(`/auctions/register/${pid}`);
      else if (notif.auctionId) navigate(`/auctions/${notif.auctionId}`);
    }
  };

  if (!user) return null;

  const CONFIRM_TYPES: NotificationType[] = [
    "last_offer_selected",
    "bid_selected",
  ];

  const labelMarkAllRead = isRTL ? "قراءة الكل" : "Mark all read";
  const labelViewAll = isRTL
    ? "✦ عرض كل الإشعارات"
    : "✦ View all notifications";
  const labelCaughtUp = isRTL
    ? "لا توجد إشعارات جديدة!"
    : "You're all caught up!";
  const labelConfirmPurchase = isRTL
    ? "✦ تأكيد الشراء →"
    : "✦ Confirm purchase →";
  const labelNotifications = isRTL ? "الإشعارات" : "Notifications";
  const labelNewAlerts = (n: number) =>
    isRTL ? `${n} تنبيهات جديدة` : `${n} new alerts`;

  return (
    <>
      <style>{CSS}</style>
      <div className="nf-root" ref={panelRef}>
        {open && (
          <div className="nf-panel" dir={isRTL ? "rtl" : "ltr"}>
            <div className="nf-head">
              <div className="nf-head-left">
                <span className="nf-head-title">{labelNotifications}</span>
                {unreadCount > 0 && (
                  <span className="nf-new-pill">{unreadCount} NEW</span>
                )}
              </div>
              {unreadCount > 0 && (
                <button className="nf-markall" onClick={markAllRead}>
                  {labelMarkAllRead}
                </button>
              )}
            </div>

            <div className="nf-scroll">
              {notifications.length === 0 ? (
                <div className="nf-empty">
                  <div className="nf-empty-ring">
                    <Bell
                      size={24}
                      style={{ color: "rgba(201,169,110,0.35)" }}
                    />
                  </div>
                  <p className="nf-empty-txt">{labelCaughtUp}</p>
                </div>
              ) : (
                notifications.map((notif, i) => {
                  const isPaymentConfirmed = notif.type === "payment_confirmed";
                  const isConfirmType = CONFIRM_TYPES.includes(notif.type);
                  const isMatchedType = notif.type === "auction_matched";
                  const isVoucherType = notif.type === "voucher_created";
                  const isLastOfferAvailableType =
                    notif.type === "last_offer_available";
                  const isRegisteredType = notif.type === "auction_registered";
                  const isAuctionEndedType = notif.type === "auction_ended";

                  // auction_ended is NOT clickable (same as payment_confirmed, voucher_created)
                  const isClickable =
                    !isPaymentConfirmed &&
                    !isVoucherType &&
                    !isAuctionEndedType;

                  const cfg = TYPE_CONFIG[notif.type] ?? TYPE_CONFIG.promo;

                  const { title: localTitle, message: localMessage } =
                    getLocalizedNotif(notif, t);

                  return (
                    <div
                      key={notif.id}
                      className={[
                        "nf-item",
                        isClickable ? "is-clickable" : "",
                        !notif.isRead ? "unread" : "",
                        isPaymentConfirmed ? "payment-confirmed" : "",
                        isVoucherType ? "voucher-item" : "",
                        isRegisteredType ? "registered-item" : "",
                        isAuctionEndedType ? "ended-item" : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      style={{ animationDelay: `${i * 0.06}s` }}
                      onClick={() => handleItemClick(notif)}
                    >
                      {!notif.isRead && (
                        <span
                          className={`nf-unread-bar${
                            isPaymentConfirmed
                              ? " nf-unread-green"
                              : isRegisteredType
                                ? " nf-unread-teal"
                                : isAuctionEndedType
                                  ? " nf-unread-gold-dim"
                                  : ""
                          }`}
                        />
                      )}

                      {/* Icon column */}
                      {isPaymentConfirmed ? (
                        <PaymentConfirmedIcon />
                      ) : isVoucherType ? (
                        <VoucherTicketIcon isUnread={!notif.isRead} />
                      ) : isLastOfferAvailableType ? (
                        <LastOfferAvailableIcon isUnread={!notif.isRead} />
                      ) : isRegisteredType ? (
                        <AuctionRegisteredIcon isUnread={!notif.isRead} />
                      ) : isAuctionEndedType ? (
                        <AuctionEndedIcon isUnread={!notif.isRead} />
                      ) : (
                        <div
                          className="nf-icon"
                          style={{
                            background: cfg.bg,
                            border: `1px solid ${cfg.border}`,
                          }}
                        >
                          {cfg.Icon && (
                            <cfg.Icon
                              size={19}
                              style={{ color: cfg.color }}
                              strokeWidth={1.8}
                            />
                          )}
                          {!notif.isRead && (
                            <span
                              className="nf-icon-pulse"
                              style={{ background: cfg.color }}
                            />
                          )}
                        </div>
                      )}

                      {/* Body column */}
                      <div className="nf-body">
                        <p className="nf-item-title">{localTitle}</p>

                        {isConfirmType ? (
                          <FormattedSelectionMessage message={localMessage} />
                        ) : isPaymentConfirmed ? (
                          <FormattedPaymentMessage
                            message={localMessage}
                            onContactClick={() => {
                              setOpen(false);
                              navigate("/contact");
                            }}
                          />
                        ) : isMatchedType ? (
                          <FormattedMatchedMessage message={localMessage} />
                        ) : isVoucherType ? (
                          <FormattedVoucherMessage
                            notif={notif}
                            t={t}
                            isRTL={isRTL}
                          />
                        ) : isLastOfferAvailableType ? (
                          <FormattedLastOfferAvailableMessage
                            notif={notif}
                            t={t}
                            isRTL={isRTL}
                          />
                        ) : isRegisteredType ? (
                          <FormattedRegistrationMessage
                            notif={notif}
                            t={t}
                            isRTL={isRTL}
                          />
                        ) : isAuctionEndedType ? (
                          <FormattedAuctionEndedMessage
                            notif={notif}
                            t={t}
                            isRTL={isRTL}
                          />
                        ) : (
                          <p className="nf-item-msg">{localMessage}</p>
                        )}

                        {isConfirmType && (
                          <span className="nf-cta-pill">
                            {labelConfirmPurchase}
                          </span>
                        )}

                        <span className="nf-item-time">
                          {timeAgo(notif.createdAt)}
                        </span>
                      </div>

                      <button
                        className="nf-x"
                        onClick={(e) => {
                          e.stopPropagation();
                          dismiss(notif.id);
                        }}
                      >
                        <X size={11} strokeWidth={2.5} />
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            {notifications.length > 0 && (
              <div className="nf-foot">
                <button className="nf-foot-btn">{labelViewAll}</button>
              </div>
            )}
          </div>
        )}

        <div className="nf-fab-row">
          <span className="nf-label">
            {unreadCount > 0 ? labelNewAlerts(unreadCount) : labelNotifications}
          </span>
          <div
            className={`nf-circle${attracted && !open ? " attracted" : ""}`}
            onClick={() => setOpen((v) => !v)}
            role="button"
            aria-label="Notifications"
          >
            {attracted && !open && (
              <>
                <span className="nf-ripple" />
                <span className="nf-ripple" />
                <span className="nf-ripple" />
              </>
            )}
            <span className="nf-arc" />
            <img
              src="/loqta-removebg-preview.png"
              alt="Loqta Zone"
              className="nf-logo"
            />
            {unreadCount > 0 && (
              <span className="nf-badge">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default NotificationBell;

const CSS = `
@keyframes nfPanelIn{0%{opacity:0;transform:scale(0.88) translateY(24px);}60%{opacity:1;transform:scale(1.02) translateY(-4px);}100%{opacity:1;transform:scale(1) translateY(0);}}
@keyframes nfItemIn{from{opacity:0;transform:translateX(30px);}to{opacity:1;transform:translateX(0);}}
@keyframes nfBadgePop{0%{transform:scale(0) rotate(-20deg);}65%{transform:scale(1.3) rotate(8deg);}100%{transform:scale(1) rotate(0deg);}}
@keyframes nfRipple{0%{transform:scale(0.85);opacity:0.85;}100%{transform:scale(2.8);opacity:0;}}
@keyframes nfAttract{0%{transform:scale(1) rotate(0deg);}8%{transform:scale(1.2) rotate(-14deg);}18%{transform:scale(1.25) rotate(14deg);}28%{transform:scale(1.2) rotate(-10deg);}38%{transform:scale(1.22) rotate(10deg);}50%{transform:scale(1.16) rotate(-5deg);}62%{transform:scale(1.18) rotate(5deg);}78%{transform:scale(1.08) rotate(0deg);}100%{transform:scale(1) rotate(0deg);}}
@keyframes nfGoldSpin{from{transform:rotate(0deg);}to{transform:rotate(360deg);}}
@keyframes nfShine{0%{opacity:0;left:-80%;}35%{opacity:0.55;}100%{opacity:0;left:140%;}}
@keyframes nfBreathe{0%,100%{box-shadow:0 0 0 0 rgba(201,169,110,0),0 8px 32px rgba(0,0,0,0.6);}50%{box-shadow:0 0 0 10px rgba(201,169,110,0.14),0 14px 44px rgba(201,169,110,0.2);}}
@keyframes nfDotPulse{0%,100%{opacity:1;transform:scale(1);}50%{opacity:0.3;transform:scale(0.5);}}
@keyframes nfBadgeGlow{0%,100%{box-shadow:0 3px 10px rgba(255,61,90,0.55);}50%{box-shadow:0 3px 18px rgba(255,61,90,0.9),0 0 0 4px rgba(255,61,90,0.15);}}
.nf-root{position:fixed;bottom:28px;right:28px;z-index:9999;display:flex;flex-direction:column;align-items:flex-end;}
.nf-fab-row{display:flex;align-items:center;gap:0;position:relative;}
.nf-label{font-family:'Jost',sans-serif;font-size:11px;font-weight:800;letter-spacing:0.15em;text-transform:uppercase;color:#c9a96e;white-space:nowrap;background:linear-gradient(135deg,#0e1c2e,#0a0a1a);border:1px solid rgba(201,169,110,0.3);border-radius:10px;height:36px;display:flex;align-items:center;padding:0 14px;position:absolute;right:calc(100% + 12px);pointer-events:none;opacity:0;transform:translateX(8px);transition:opacity 0.25s ease,transform 0.25s ease;box-shadow:0 4px 16px rgba(0,0,0,0.4);}
.nf-label::after{content:'';position:absolute;right:-6px;top:50%;transform:translateY(-50%);width:0;height:0;border-top:6px solid transparent;border-bottom:6px solid transparent;border-left:6px solid rgba(201,169,110,0.3);}
.nf-fab-row:hover .nf-label{opacity:1;transform:translateX(0);}
.nf-circle{position:relative;width:76px;height:76px;border-radius:50%;background:linear-gradient(145deg,#162d45 0%,#0a0a1a 100%);border:2.5px solid rgba(201,169,110,0.45);display:flex;align-items:center;justify-content:center;transition:border-color 0.3s,transform 0.35s cubic-bezier(0.22,1,0.36,1);animation:nfBreathe 3.5s ease-in-out infinite;overflow:visible;flex-shrink:0;cursor:pointer;}
.nf-fab-row:hover .nf-circle{border-color:#c9a96e;transform:scale(1.08);animation:none;box-shadow:0 0 0 7px rgba(201,169,110,0.11),0 14px 44px rgba(201,169,110,0.3);}
.nf-circle.attracted{animation:nfAttract 1s cubic-bezier(0.22,1,0.36,1) forwards,nfBreathe 3.5s ease-in-out 1.1s infinite;}
.nf-arc{position:absolute;inset:-6px;border-radius:50%;border:2px solid transparent;border-top-color:rgba(201,169,110,0.65);border-right-color:rgba(201,169,110,0.18);animation:nfGoldSpin 3.8s linear infinite;pointer-events:none;}
.nf-ripple{position:absolute;inset:0;border-radius:50%;border:2.5px solid rgba(201,169,110,0.55);opacity:0;pointer-events:none;}
.nf-circle.attracted .nf-ripple:nth-child(1){animation:nfRipple 1.1s ease-out 0.0s forwards;}
.nf-circle.attracted .nf-ripple:nth-child(2){animation:nfRipple 1.1s ease-out 0.3s forwards;}
.nf-circle.attracted .nf-ripple:nth-child(3){animation:nfRipple 1.1s ease-out 0.6s forwards;}
.nf-logo{width:60px;height:60px;object-fit:contain;filter:drop-shadow(0 3px 10px rgba(201,169,110,0.55));transition:filter 0.3s,transform 0.3s;position:relative;z-index:2;}
.nf-fab-row:hover .nf-logo{filter:drop-shadow(0 5px 16px rgba(201,169,110,0.8));transform:scale(1.06);}
.nf-badge{position:absolute;top:-5px;right:-5px;min-width:26px;height:26px;border-radius:999px;background:linear-gradient(135deg,#ff3d5a,#c41e3a);border:3px solid #0a0a1a;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:900;color:#fff;font-family:'Jost',sans-serif;padding:0 5px;animation:nfBadgePop 0.5s cubic-bezier(0.22,1,0.36,1) both,nfBadgeGlow 2s ease-in-out 0.5s infinite;z-index:10;pointer-events:none;}
.nf-panel{position:absolute;bottom:calc(100% + 18px);right:0;width:365px;background:linear-gradient(160deg,#0f2035 0%,#080d1a 100%);border:1px solid rgba(201,169,110,0.22);border-radius:24px;box-shadow:0 32px 80px rgba(0,0,0,0.82),0 0 0 1px rgba(201,169,110,0.07),inset 0 1px 0 rgba(201,169,110,0.12);overflow:hidden;animation:nfPanelIn 0.42s cubic-bezier(0.22,1,0.36,1) both;max-height:530px;display:flex;flex-direction:column;}
.nf-panel::before{content:'';position:absolute;top:0;left:0;right:0;height:1.5px;background:linear-gradient(90deg,transparent,rgba(201,169,110,0.7),transparent);}
@media (max-width: 479px) {
  .nf-root{right:16px;bottom:16px;}
  .nf-panel{position:fixed;bottom:110px;left:10px;right:10px;width:auto;top:auto;border-radius:18px;max-height:calc(100dvh - 140px);}
}
.nf-head{padding:18px 20px 14px;border-bottom:1px solid rgba(229,224,198,0.06);display:flex;align-items:center;justify-content:space-between;flex-shrink:0;background:linear-gradient(135deg,rgba(201,169,110,0.05),transparent);}
.nf-head-left{display:flex;align-items:center;gap:8px;flex-wrap:nowrap;overflow:hidden;}
.nf-head-title{font-family:'Jost',sans-serif;font-size:14px;font-weight:800;letter-spacing:0.1em;text-transform:uppercase;color:#c9a96e;white-space:nowrap;flex-shrink:0;}
.nf-new-pill{font-family:'Jost',sans-serif;font-size:10px;font-weight:900;letter-spacing:0.06em;color:#fff;background:linear-gradient(135deg,#ff3d5a,#c41e3a);border-radius:999px;padding:4px 10px;white-space:nowrap;flex-shrink:0;line-height:1;display:inline-flex;align-items:center;}
.nf-markall{font-family:'Jost',sans-serif;font-size:9px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:rgba(201,169,110,0.55);background:none;border:none;cursor:pointer;padding:5px 10px;border-radius:8px;transition:all 0.2s;}
.nf-markall:hover{color:#c9a96e;background:rgba(201,169,110,0.09);}
.nf-scroll{overflow-y:auto;flex:1;scrollbar-width:thin;scrollbar-color:rgba(201,169,110,0.18) transparent;}
.nf-scroll::-webkit-scrollbar{width:3px;}
.nf-scroll::-webkit-scrollbar-thumb{background:rgba(201,169,110,0.18);border-radius:2px;}
.nf-item{display:flex;align-items:flex-start;gap:13px;padding:14px 16px 14px 22px;border-bottom:1px solid rgba(255,255,255,0.033);transition:background 0.2s;position:relative;animation:nfItemIn 0.38s cubic-bezier(0.22,1,0.36,1) both;}
.nf-item:last-child{border-bottom:none;}
.nf-item.is-clickable{cursor:pointer;}
.nf-item.is-clickable:hover{background:rgba(255,255,255,0.023);}
.nf-item.unread{background:rgba(201,169,110,0.03);}
.nf-item.is-clickable.unread:hover{background:rgba(201,169,110,0.055);}
.nf-item.payment-confirmed{background:rgba(74,222,128,0.03);cursor:default;}
.nf-item.voucher-item{cursor:default;}
.nf-item.voucher-item.unread{background:rgba(201,169,110,0.04);}
.nf-item.registered-item.unread{background:rgba(56,189,210,0.03);}
.nf-item.ended-item{cursor:default;}
.nf-item.ended-item.unread{background:rgba(201,169,110,0.025);}
.nf-unread-bar{position:absolute;left:0;top:12%;bottom:12%;width:3px;border-radius:0 3px 3px 0;background:linear-gradient(180deg,#c9a96e,#b8944e);box-shadow:0 0 8px rgba(201,169,110,0.65);}
.nf-unread-bar.nf-unread-green{background:linear-gradient(180deg,#4ade80,#22c55e);box-shadow:0 0 8px rgba(74,222,128,0.65);}
.nf-unread-bar.nf-unread-gold{background:linear-gradient(180deg,#c9a96e,#b8944e);box-shadow:0 0 10px rgba(201,169,110,0.7);}
.nf-unread-bar.nf-unread-teal{background:linear-gradient(180deg,#38bdd2,#0e9ab5);box-shadow:0 0 10px rgba(56,189,210,0.65);}
.nf-unread-bar.nf-unread-gold-dim{background:linear-gradient(180deg,rgba(201,169,110,0.55),rgba(184,148,78,0.4));box-shadow:0 0 6px rgba(201,169,110,0.3);}
.nf-icon{width:44px;height:44px;border-radius:14px;display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:1px;position:relative;}
.nf-icon-pulse{position:absolute;bottom:-2px;right:-2px;width:9px;height:9px;border-radius:50%;border:2px solid #080d1a;animation:nfDotPulse 1.8s ease-in-out infinite;}
.nf-body{flex:1;min-width:0;}
.nf-item-title{font-family:'Jost',sans-serif;font-size:13px;font-weight:700;color:rgb(229,224,198);margin:0 0 5px;padding-right:24px;line-height:1.3;}
.nf-item.unread .nf-item-title{color:#fff;}
.nf-item-msg{font-family:'Jost',sans-serif;font-size:11.5px;color:rgba(229,224,198,0.42);margin:0 0 5px;line-height:1.55;}
.nf-cta-pill{display:inline-flex;align-items:center;gap:4px;font-family:'Jost',sans-serif;font-size:11px;font-weight:800;letter-spacing:0.1em;text-transform:uppercase;color:#c9a96e;background:rgba(201,169,110,0.1);border:1px solid rgba(201,169,110,0.22);border-radius:5px;padding:3px 8px;margin-bottom:4px;}
.nf-item-time{font-family:'Jost',sans-serif;font-size:10px;font-weight:700;color:rgba(201,169,110,0.45);letter-spacing:0.05em;display:block;margin-top:3px;}
.nf-x{position:absolute;top:10px;right:10px;width:22px;height:22px;border-radius:7px;background:transparent;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;color:rgba(229,224,198,0.2);opacity:0;transition:all 0.2s;}
.nf-item:hover .nf-x{opacity:1;}
.nf-x:hover{background:rgba(255,61,90,0.13)!important;color:#ff6464!important;}
.nf-empty{padding:50px 20px;text-align:center;font-family:'Jost',sans-serif;}
.nf-empty-ring{width:64px;height:64px;border-radius:50%;border:1.5px solid rgba(201,169,110,0.18);display:flex;align-items:center;justify-content:center;margin:0 auto 14px;background:rgba(201,169,110,0.04);}
.nf-empty-txt{font-size:13px;font-weight:700;color:rgba(229,224,198,0.3);letter-spacing:0.06em;}
.nf-foot{padding:11px 20px;border-top:1px solid rgba(229,224,198,0.05);text-align:center;flex-shrink:0;background:linear-gradient(0deg,rgba(201,169,110,0.03),transparent);}
.nf-foot-btn{font-family:'Jost',sans-serif;font-size:10px;font-weight:800;letter-spacing:0.18em;text-transform:uppercase;color:rgba(201,169,110,0.5);background:none;border:none;cursor:pointer;padding:6px 16px;border-radius:8px;transition:all 0.2s;}
.nf-foot-btn:hover{color:#c9a96e;background:rgba(201,169,110,0.08);}
[dir="rtl"] .nf-unread-bar{left:unset;right:0;border-radius:3px 0 0 3px;}
[dir="rtl"] .nf-x{right:unset;left:10px;}
[dir="rtl"] .nf-item-title{padding-right:0;padding-left:24px;}
`;
