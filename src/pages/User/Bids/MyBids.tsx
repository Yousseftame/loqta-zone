/**
 * src/pages/User/Bids/MyBids.tsx
 *
 * Displays all auctions the user has joined from:
 *   users/{uid}/auctions  (subcollection)
 *
 * Each document contains:
 *   auctionId    string
 *   amount       number
 *   hasPaid      boolean
 *   joinedAt     Timestamp
 *   paymentId    string
 *   totalAmount  number[]
 *   voucherUsed  boolean
 */

import { useState, useEffect } from "react";
import {
  collection,
  getDocs,
  doc,
  getDoc,
  Timestamp,
} from "firebase/firestore";
import {
  Gavel,
  Trophy,
  CheckCircle2,
  XCircle,
  Calendar,
  ChevronRight,
  Tag,
  CreditCard,
  TrendingUp,
  Hash,
  Ticket,
  Sparkles,
  Wallet,
} from "lucide-react";
import { Link } from "react-router-dom";
import { db } from "@/firebase/firebase";
import { useAuth } from "@/store/AuthContext/AuthContext";

// ─── Tokens ───────────────────────────────────────────────────────────────────
const GOLD = "#c9a96e";
const GOLD2 = "#b8944e";
const CREAM = "rgb(229,224,198)";
const DARK = "#080d1a";
const NAVY = "#0e1c2e";
const NAVY2 = "#112237";

// ─── Types ────────────────────────────────────────────────────────────────────
interface UserAuctionEntry {
  id: string;
  auctionId: string;
  amount: number;
  hasPaid: boolean;
  joinedAt: Timestamp | null;
  paymentId: string;
  totalAmount: number[];
  voucherUsed: boolean;
}

interface AuctionMeta {
  productName?: string; // resolved: products/{productId}.title
  productId?: string;
  auctionNumber?: number; // shown as subtitle "Auction #N"
  imageUrl?: string;
  status?: string;
  endDate?: Timestamp | null;
  startingPrice?: number;
  category?: string;
}

interface EnrichedEntry extends UserAuctionEntry {
  meta: AuctionMeta;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatDate(ts: Timestamp | null | undefined): string {
  if (!ts) return "—";
  const d = ts?.toDate ? ts.toDate() : new Date(ts as any);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(ts: Timestamp | null | undefined): string {
  if (!ts) return "";
  const d = ts?.toDate ? ts.toDate() : new Date(ts as any);
  return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}

function maxBid(arr: number[]): number {
  if (!arr || arr.length === 0) return 0;
  return Math.max(...arr);
}

function getStatusConfig(status?: string) {
  switch (status) {
    case "active":
      return {
        label: "Live",
        color: "#5ee8a0",
        bg: "rgba(94,232,160,0.1)",
        border: "rgba(94,232,160,0.25)",
        pulse: true,
      };
    case "upcoming":
      return {
        label: "Upcoming",
        color: "#64a0ff",
        bg: "rgba(100,160,255,0.1)",
        border: "rgba(100,160,255,0.25)",
        pulse: false,
      };
    case "ended":
      return {
        label: "Ended",
        color: "rgba(229,224,198,0.35)",
        bg: "rgba(255,255,255,0.04)",
        border: "rgba(255,255,255,0.08)",
        pulse: false,
      };
    default:
      return null;
  }
}

// ─── Bid Sparkline ────────────────────────────────────────────────────────────
const BidSparkline = ({
  data,
  color = GOLD,
}: {
  data: number[];
  color?: string;
}) => {
  if (!data || data.length < 2) return null;
  const w = 80,
    h = 28;
  const min = Math.min(...data),
    max = Math.max(...data);
  const range = max - min || 1;
  const pts = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * w;
      const y = h - ((v - min) / range) * (h - 4) - 2;
      return `${x},${y}`;
    })
    .join(" ");
  const last = data[data.length - 1];
  const lx = w;
  const ly = h - ((last - min) / range) * (h - 4) - 2;
  return (
    <svg width={w} height={h} style={{ display: "block", overflow: "visible" }}>
      <polyline
        points={pts}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.7}
      />
      <circle cx={lx} cy={ly} r={2.5} fill={color} opacity={0.9} />
    </svg>
  );
};

// ─── Stat Pill ────────────────────────────────────────────────────────────────
const StatPill = ({
  icon: Icon,
  label,
  value,
  color = GOLD,
}: {
  icon: any;
  label: string;
  value: string | number;
  color?: string;
}) => (
  <div
    style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: 4,
      padding: "10px 14px",
      background: "rgba(255,255,255,0.025)",
      border: "1px solid rgba(229,224,198,0.06)",
      borderRadius: 12,
      minWidth: 0,
      flex: 1,
    }}
  >
    <Icon size={13} style={{ color, opacity: 0.85 }} strokeWidth={2} />
    <span
      style={{
        fontSize: 14,
        fontWeight: 800,
        color: CREAM,
        fontFamily: "'Jost',sans-serif",
        lineHeight: 1,
      }}
    >
      {value}
    </span>
    <span
      style={{
        fontSize: 9,
        fontWeight: 700,
        color: "rgba(229,224,198,0.3)",
        letterSpacing: "0.1em",
        textTransform: "uppercase" as const,
        fontFamily: "'Jost',sans-serif",
        textAlign: "center" as const,
      }}
    >
      {label}
    </span>
  </div>
);

// ─── Auction Card ─────────────────────────────────────────────────────────────
const AuctionCard = ({
  entry,
  index,
}: {
  entry: EnrichedEntry;
  index: number;
}) => {
  const [expanded, setExpanded] = useState(false);
  const statusCfg = getStatusConfig(entry.meta.status);
  const highestBid = maxBid(entry.totalAmount);
  const bidCount = entry.totalAmount?.length ?? 0;

  // Display name: product name if resolved, else fallback to "Auction #N" or short ID
  const displayTitle =
    entry.meta.productName ||
    (entry.meta.auctionNumber
      ? `Auction #${entry.meta.auctionNumber}`
      : `Auction ${entry.auctionId.slice(0, 8)}…`);

  // Subtitle: auction number if we have it
  const displaySubtitle = entry.meta.auctionNumber
    ? `Auction #${entry.meta.auctionNumber}`
    : null;

  return (
    <div
      style={{
        background: `linear-gradient(160deg, ${NAVY2} 0%, ${DARK} 100%)`,
        border: `1px solid ${expanded ? "rgba(201,169,110,0.22)" : "rgba(201,169,110,0.1)"}`,
        borderRadius: 20,
        overflow: "hidden",
        transition: "border-color 0.3s, box-shadow 0.3s, transform 0.3s",
        animation: `fadeUp 0.4s ease ${0.07 + index * 0.06}s both`,
        position: "relative",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.boxShadow =
          "0 16px 48px rgba(0,0,0,0.55), 0 0 0 1px rgba(201,169,110,0.15)";
        (e.currentTarget as HTMLDivElement).style.transform =
          "translateY(-2px)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = "none";
        (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)";
      }}
    >
      {/* Gold top line */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 1,
          background:
            "linear-gradient(90deg, transparent, rgba(201,169,110,0.4), transparent)",
        }}
      />

      {/* ── Main row ── */}
      <div
        style={{
          padding: "20px 20px 16px",
          display: "flex",
          gap: 16,
          alignItems: "flex-start",
        }}
      >
        {/* Image / placeholder */}
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: 14,
            flexShrink: 0,
            overflow: "hidden",
            background: `linear-gradient(135deg, ${NAVY} 0%, #1a3a5c 100%)`,
            border: "1px solid rgba(201,169,110,0.15)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
          }}
        >
          {entry.meta.imageUrl ? (
            <img
              src={entry.meta.imageUrl}
              alt={displayTitle}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            <Gavel
              size={26}
              style={{ color: "rgba(201,169,110,0.35)" }}
              strokeWidth={1.5}
            />
          )}
          {entry.meta.status === "active" && (
            <div
              style={{
                position: "absolute",
                top: 6,
                right: 6,
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: "#5ee8a0",
                boxShadow: "0 0 6px #5ee8a0",
                animation: "pulse 2s ease infinite",
              }}
            />
          )}
        </div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: 10,
              marginBottom: 6,
            }}
          >
            <div style={{ minWidth: 0 }}>
              {/* ── Product name as title ── */}
              <h3
                style={{
                  margin: 0,
                  fontSize: 15,
                  fontWeight: 800,
                  color: CREAM,
                  fontFamily: "'Jost',sans-serif",
                  letterSpacing: "-0.01em",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {displayTitle}
              </h3>
              {/* ── Auction number as subtitle (only shown if available) ── */}
              {displaySubtitle && (
                <p
                  style={{
                    margin: "3px 0 0",
                    fontSize: 10,
                    color: "rgba(229,224,198,0.28)",
                    fontFamily: "'Jost',sans-serif",
                  }}
                >
                  {displaySubtitle}
                </p>
              )}
            </div>

            {/* Status badge */}
            {statusCfg && (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                  padding: "4px 10px",
                  borderRadius: 999,
                  background: statusCfg.bg,
                  border: `1px solid ${statusCfg.border}`,
                  fontSize: 9,
                  fontWeight: 900,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  color: statusCfg.color,
                  flexShrink: 0,
                }}
              >
                {statusCfg.pulse && (
                  <span
                    style={{
                      width: 5,
                      height: 5,
                      borderRadius: "50%",
                      background: statusCfg.color,
                      boxShadow: `0 0 6px ${statusCfg.color}`,
                      animation: "pulse 2s ease infinite",
                    }}
                  />
                )}
                {statusCfg.label}
              </span>
            )}
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              flexWrap: "wrap",
            }}
          >
            <span
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                fontSize: 11,
                color: "rgba(229,224,198,0.38)",
                fontFamily: "'Jost',sans-serif",
              }}
            >
              <Calendar size={10} style={{ opacity: 0.6 }} />
              {formatDate(entry.joinedAt)}
            </span>
            
            {entry.voucherUsed && (
              <span
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  fontSize: 10,
                  color: GOLD,
                  fontFamily: "'Jost',sans-serif",
                  fontWeight: 700,
                }}
              >
                <Ticket size={10} /> Voucher applied
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Stat pills ── */}
      <div style={{ padding: "0 20px 16px", display: "flex", gap: 8 }}>
        <StatPill
          icon={Wallet}
          label="Entry"
          value={`${entry.amount} EGP`}
          color="#64a0ff"
        />
        <StatPill
          icon={TrendingUp}
          label="Highest"
          value={`${highestBid} EGP`}
          color={GOLD}
        />
        <StatPill icon={Gavel} label="Bids" value={bidCount} color="#5ee8a0" />
        <StatPill
          icon={entry.hasPaid ? CheckCircle2 : XCircle}
          label="Payment"
          value={entry.hasPaid ? "Paid" : "Pending"}
          color={entry.hasPaid ? "#5ee8a0" : "#ff6464"}
        />
      </div>

      {/* ── Expand toggle ── */}
      <button
        onClick={() => setExpanded((v) => !v)}
        style={{
          width: "100%",
          padding: "11px 20px",
          background: expanded
            ? "rgba(201,169,110,0.06)"
            : "rgba(255,255,255,0.02)",
          border: "none",
          borderTop: "1px solid rgba(229,224,198,0.05)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          cursor: "pointer",
          transition: "background 0.2s",
        }}
      >
        <span
          style={{
            fontSize: 10,
            fontWeight: 800,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            color: expanded ? GOLD : "rgba(229,224,198,0.3)",
            fontFamily: "'Jost',sans-serif",
            transition: "color 0.2s",
          }}
        >
          {expanded ? "Hide Details" : "View Details"}
        </span>
        <ChevronRight
          size={14}
          style={{
            color: expanded ? GOLD : "rgba(229,224,198,0.25)",
            transform: expanded ? "rotate(90deg)" : "rotate(0deg)",
            transition: "transform 0.25s, color 0.2s",
          }}
        />
      </button>

      {/* ── Expanded panel ── */}
      {expanded && (
        <div
          style={{
            padding: "18px 20px 20px",
            borderTop: "1px solid rgba(229,224,198,0.05)",
            animation: "expandIn 0.22s ease both",
          }}
        >
          {/* Bid history */}
          {entry.totalAmount && entry.totalAmount.length > 0 && (
            <div style={{ marginBottom: 18 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 10,
                }}
              >
                <p
                  style={{
                    margin: 0,
                    fontSize: 9,
                    fontWeight: 800,
                    letterSpacing: "0.2em",
                    textTransform: "uppercase",
                    color: "rgba(201,169,110,0.45)",
                  }}
                >
                  Bid History
                </p>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <BidSparkline data={entry.totalAmount} color={GOLD} />
                  <span
                    style={{
                      fontSize: 10,
                      color: "rgba(229,224,198,0.3)",
                      fontFamily: "'Jost',sans-serif",
                    }}
                  >
                    {bidCount} bid{bidCount !== 1 ? "s" : ""}
                  </span>
                </div>
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {entry.totalAmount.map((bid, i) => {
                  const isMax = bid === highestBid;
                  return (
                    <div
                      key={i}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 5,
                        padding: "5px 10px",
                        borderRadius: 8,
                        background: isMax
                          ? "rgba(201,169,110,0.12)"
                          : "rgba(255,255,255,0.03)",
                        border: `1px solid ${isMax ? "rgba(201,169,110,0.3)" : "rgba(229,224,198,0.06)"}`,
                      }}
                    >
                      <span
                        style={{
                          fontSize: 9,
                          color: isMax
                            ? "rgba(201,169,110,0.6)"
                            : "rgba(229,224,198,0.25)",
                          fontFamily: "'Jost',sans-serif",
                          fontWeight: 700,
                        }}
                      >
                        #{i + 1}
                      </span>
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 800,
                          color: isMax ? GOLD : "rgba(229,224,198,0.6)",
                          fontFamily: "'Jost',sans-serif",
                        }}
                      >
                        {bid.toLocaleString()}
                      </span>
                      <span
                        style={{
                          fontSize: 9,
                          color: isMax
                            ? "rgba(201,169,110,0.5)"
                            : "rgba(229,224,198,0.2)",
                          fontFamily: "'Jost',sans-serif",
                        }}
                      >
                        EGP
                      </span>
                      {isMax && <TrendingUp size={9} style={{ color: GOLD }} />}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Detail grid — Auction ID card removed */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: 8,
            }}
          >
            {[
              {
                icon: CreditCard,
                label: "Payment ID",
                value: entry.paymentId || "—",
                color: CREAM,
              },
              {
                icon: Calendar,
                label: "Joined At",
                value: `${formatDate(entry.joinedAt)} · ${formatTime(entry.joinedAt)}`,
                color: CREAM,
              },
              {
                icon: Wallet,
                label: "Entry Amount",
                value: `${entry.amount} EGP`,
                color: "#64a0ff",
              },
              {
                icon: entry.hasPaid ? CheckCircle2 : XCircle,
                label: "Payment Status",
                value: entry.hasPaid ? "Confirmed" : "Pending",
                color: entry.hasPaid ? "#5ee8a0" : "#ff9060",
              },
              {
                icon: Ticket,
                label: "Voucher Used",
                value: entry.voucherUsed ? "Yes" : "No",
                color: entry.voucherUsed ? GOLD : "rgba(229,224,198,0.35)",
              },
            ].map((row) => (
              <div
                key={row.label}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "10px 12px",
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(229,224,198,0.04)",
                  borderRadius: 11,
                }}
              >
                <row.icon
                  size={13}
                  style={{ color: row.color, opacity: 0.75, flexShrink: 0 }}
                  strokeWidth={2}
                />
                <div style={{ minWidth: 0 }}>
                  <p
                    style={{
                      margin: 0,
                      fontSize: 9,
                      fontWeight: 700,
                      color: "rgba(229,224,198,0.28)",
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      fontFamily: "'Jost',sans-serif",
                    }}
                  >
                    {row.label}
                  </p>
                  <p
                    style={{
                      margin: "2px 0 0",
                      fontSize: 11,
                      fontWeight: 700,
                      color: row.color,
                      fontFamily: "'Jost',sans-serif",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {row.value}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Empty State ──────────────────────────────────────────────────────────────
const EmptyState = () => (
  <div
    style={{
      textAlign: "center",
      padding: "80px 20px",
      animation: "fadeUp 0.5s ease both",
    }}
  >
    <div
      style={{
        width: 72,
        height: 72,
        borderRadius: "50%",
        background: "rgba(201,169,110,0.07)",
        border: "1px solid rgba(201,169,110,0.15)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        margin: "0 auto 20px",
      }}
    >
      <Gavel
        size={28}
        style={{ color: "rgba(201,169,110,0.4)" }}
        strokeWidth={1.5}
      />
    </div>
    <h3
      style={{
        margin: "0 0 8px",
        fontSize: 18,
        fontWeight: 800,
        color: CREAM,
        fontFamily: "'Jost',sans-serif",
      }}
    >
      No Auctions Yet
    </h3>
    <p
      style={{
        margin: "0 0 24px",
        fontSize: 13,
        color: "rgba(229,224,198,0.38)",
        fontFamily: "'Jost',sans-serif",
      }}
    >
      You haven't joined any auctions yet. Explore the marketplace to find your
      next bid.
    </p>
    <Link
      to="/"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 7,
        padding: "11px 24px",
        borderRadius: 999,
        background: `linear-gradient(135deg, ${GOLD}, ${GOLD2})`,
        color: "#0a0a1a",
        fontSize: 11,
        fontWeight: 900,
        letterSpacing: "0.14em",
        textTransform: "uppercase",
        textDecoration: "none",
        fontFamily: "'Jost',sans-serif",
        boxShadow: "0 4px 18px rgba(201,169,110,0.3)",
      }}
    >
      <Sparkles size={13} /> Explore Auctions
    </Link>
  </div>
);

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function MyBids() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<EnrichedEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      try {
        const snap = await getDocs(
          collection(db, "users", user.uid, "auctions"),
        );
        const raw: UserAuctionEntry[] = snap.docs.map((d) => ({
          id: d.id,
          auctionId: d.data().auctionId ?? d.id,
          amount: d.data().amount ?? 0,
          hasPaid: d.data().hasPaid ?? false,
          joinedAt: d.data().joinedAt ?? null,
          paymentId: d.data().paymentId ?? "",
          totalAmount: d.data().totalAmount ?? [],
          voucherUsed: d.data().voucherUsed ?? false,
        }));

        const enriched: EnrichedEntry[] = await Promise.all(
          raw.map(async (entry) => {
            try {
              // ── Step 1: fetch auction doc ──────────────────────────────
              const aSnap = await getDoc(doc(db, "auctions", entry.auctionId));
              if (!aSnap.exists()) return { ...entry, meta: {} };

              const aData = aSnap.data();
              const productId: string = aData.productId ?? "";

              // ── Step 2: fetch product doc to get the name & image ──────
              let productName: string | undefined;
              let imageUrl: string | undefined;
              let category: string | undefined;

              if (productId) {
                try {
                  const pSnap = await getDoc(doc(db, "products", productId));
                  if (pSnap.exists()) {
                    const pData = pSnap.data();
                    productName = pData.title ?? undefined;
                    // Use product thumbnail/images as the card image
                    imageUrl =
                      pData.thumbnail && pData.thumbnail !== "null"
                        ? pData.thumbnail
                        : Array.isArray(pData.images) && pData.images.length > 0
                          ? pData.images[0]
                          : undefined;
                    category = pData.category ?? undefined;
                  }
                } catch {
                  // product fetch failed — continue with no name
                }
              }

              const meta: AuctionMeta = {
                productName,
                productId,
                auctionNumber: aData.auctionNumber ?? undefined,
                // Fall back to auction-level image if product has none
                imageUrl:
                  imageUrl ?? aData.imageUrl ?? aData.image ?? undefined,
                status: aData.status ?? undefined,
                endDate: aData.endDate ?? aData.endTime ?? null,
                startingPrice: aData.startingPrice ?? undefined,
                category: category ?? aData.category ?? undefined,
              };

              return { ...entry, meta };
            } catch {
              return { ...entry, meta: {} };
            }
          }),
        );

        enriched.sort(
          (a, b) =>
            (b.joinedAt?.toMillis() ?? 0) - (a.joinedAt?.toMillis() ?? 0),
        );
        setEntries(enriched);
      } catch (err) {
        console.error("[MyBids] fetch error:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  const totalBids = entries.reduce(
    (s, e) => s + (e.totalAmount?.length ?? 0),
    0,
  );
  const paidCount = entries.filter((e) => e.hasPaid).length;

  if (loading)
    return (
      <div
        style={{
          minHeight: "100vh",
          background: DARK,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: "50%",
              border: `2px solid rgba(201,169,110,0.2)`,
              borderTopColor: GOLD,
              animation: "spin 0.9s linear infinite",
              margin: "0 auto 16px",
            }}
          />
          <p
            style={{
              color: "rgba(229,224,198,0.4)",
              fontFamily: "'Jost',sans-serif",
              fontSize: 13,
              letterSpacing: "0.1em",
            }}
          >
            LOADING YOUR BIDS
          </p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );

  return (
    <>
      <style>{`
        html, body, #root { background: ${DARK} !important; }
        @keyframes fadeUp   { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
        @keyframes expandIn { from { opacity:0; transform:translateY(-6px); } to { opacity:1; transform:translateY(0); } }
        @keyframes pulse    { 0%,100% { opacity:1; } 50% { opacity:0.4; } }
        @keyframes spin     { to { transform:rotate(360deg); } }
        .summary-card {
          background: linear-gradient(135deg, ${NAVY2} 0%, ${DARK} 100%);
          border: 1px solid rgba(201,169,110,0.11);
          border-radius: 18px; padding: 18px 16px;
          display: flex; flex-direction: column; gap: 8px;
          position: relative; overflow: hidden;
          transition: transform 0.25s, box-shadow 0.25s;
        }
        .summary-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 12px 36px rgba(0,0,0,0.5), 0 0 0 1px rgba(201,169,110,0.16);
        }
        .summary-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 14px; margin-bottom: 20px; }
        @media (max-width: 600px) { .summary-grid { gap: 10px; } }
        @media (max-width: 420px) { .summary-grid { grid-template-columns: 1fr 1fr; } }
      `}</style>

      <div
        style={{
          minHeight: "100vh",
          background: `radial-gradient(ellipse at 18% 0%, rgba(14,28,46,0.85) 0%, ${DARK} 58%)`,
          paddingTop: "130px",
          paddingBottom: "72px",
        }}
      >
        <div
          style={{
            maxWidth: 1200,
            margin: "0 auto",
            padding: "0 16px",
            fontFamily: "'Jost', sans-serif",
          }}
        >
          {/* ── Header ── */}
          <div style={{ marginBottom: 28, animation: "fadeUp 0.4s ease both" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 5,
              }}
            >
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 800,
                  letterSpacing: "0.22em",
                  textTransform: "uppercase",
                  color: "rgba(201,169,110,0.45)",
                }}
              >
                Account
              </span>
              <span style={{ color: "rgba(229,224,198,0.15)" }}>✦</span>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 800,
                  letterSpacing: "0.22em",
                  textTransform: "uppercase",
                  color: GOLD,
                }}
              >
                My Bids
              </span>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "flex-end",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: 10,
              }}
            >
              <div>
                <h1
                  style={{
                    margin: 0,
                    fontSize: "clamp(20px, 4vw, 28px)",
                    fontWeight: 800,
                    color: CREAM,
                    letterSpacing: "-0.02em",
                  }}
                >
                  Auction History
                </h1>
                <p
                  style={{
                    margin: "4px 0 0",
                    fontSize: 13,
                    color: "rgba(229,224,198,0.36)",
                    fontWeight: 500,
                  }}
                >
                  All auctions you've joined and your bidding activity
                </p>
              </div>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: "rgba(229,224,198,0.3)",
                  fontFamily: "'Jost',sans-serif",
                }}
              >
                {entries.length} auction{entries.length !== 1 ? "s" : ""}
              </span>
            </div>
          </div>

          {/* ── Summary cards ── */}
          {entries.length > 0 && (
            <div
              className="summary-grid"
              style={{ animation: "fadeUp 0.4s ease 0.06s both" }}
            >
              {[
                {
                  icon: Gavel,
                  label: "Auctions Joined",
                  value: entries.length,
                  color: "#64a0ff",
                },
                {
                  icon: Trophy,
                  label: "Total Bids Placed",
                  value: totalBids,
                  color: GOLD,
                },
                {
                  icon: CheckCircle2,
                  label: "Payments Confirmed",
                  value: paidCount,
                  color: "#5ee8a0",
                },
              ].map(({ icon: Icon, label, value, color }) => (
                <div key={label} className="summary-card">
                  <div
                    style={{
                      position: "absolute",
                      top: -24,
                      right: -24,
                      width: 64,
                      height: 64,
                      borderRadius: "50%",
                      background: `radial-gradient(circle, ${color}1a 0%, transparent 70%)`,
                      pointerEvents: "none",
                    }}
                  />
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 11,
                      background: `${color}18`,
                      border: `1px solid ${color}2e`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Icon size={16} style={{ color }} strokeWidth={1.8} />
                  </div>
                  <div>
                    <p
                      style={{
                        margin: 0,
                        fontSize: 22,
                        fontWeight: 800,
                        color: CREAM,
                        fontFamily: "'Jost',sans-serif",
                        lineHeight: 1,
                      }}
                    >
                      {value}
                    </p>
                    <p
                      style={{
                        margin: "3px 0 0",
                        fontSize: 10,
                        fontWeight: 700,
                        color: "rgba(229,224,198,0.35)",
                        fontFamily: "'Jost',sans-serif",
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                      }}
                    >
                      {label}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── List ── */}
          {entries.length === 0 ? (
            <EmptyState />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {entries.map((entry, i) => (
                <AuctionCard key={entry.id} entry={entry} index={i} />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
