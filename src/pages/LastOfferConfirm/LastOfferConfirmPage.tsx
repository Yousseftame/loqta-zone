/**
 * src/pages/LastOfferConfirm/LastOfferConfirmPage.tsx
 *
 * Route: /last-offer-confirm/:auctionId?amount=XXXX
 */

import { useEffect, useState, useCallback } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import {
  doc,
  getDoc,
  addDoc,
  collection,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/firebase/firebase";
import { useAuth } from "@/store/AuthContext/AuthContext";

type PageState = "loading" | "pending" | "paying" | "success" | "error";

interface AuctionInfo {
  productTitle: string;
  productImage: string | null;
  winningBid: number;
  auctionNumber: number;
}

const CUR = "EGP";
const fmt = (n: number) => n.toLocaleString("en-EG");

export default function LastOfferConfirmPage() {
  const { auctionId } = useParams<{ auctionId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const amountFromUrl = Number(searchParams.get("amount") ?? 0);

  const [pageState, setPageState] = useState<PageState>("loading");
  const [info, setInfo] = useState<AuctionInfo | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!auctionId) {
      setError("Invalid auction link.");
      setPageState("error");
      return;
    }
    (async () => {
      try {
        const aSnap = await getDoc(doc(db, "auctions", auctionId));
        if (!aSnap.exists()) throw new Error("Auction not found.");
        const aData = aSnap.data();
        let productTitle = "Your item";
        let productImage: string | null = null;
        if (aData.productId) {
          const pSnap = await getDoc(doc(db, "products", aData.productId));
          if (pSnap.exists()) {
            productTitle = pSnap.data().title ?? "Your item";
            productImage = pSnap.data().thumbnail ?? null;
          }
        }
        setInfo({
          productTitle,
          productImage,
          winningBid: amountFromUrl || (aData.winningBid ?? 0),
          auctionNumber: aData.auctionNumber ?? 0,
        });
        setPageState("pending");
      } catch (err: any) {
        setError(err.message ?? "Could not load auction details.");
        setPageState("error");
      }
    })();
  }, [auctionId, amountFromUrl]);

  const handleConfirm = useCallback(async () => {
    if (!user || !auctionId || !info) return;
    setPageState("paying");
    try {
      await new Promise((res) => setTimeout(res, 2200));
      await addDoc(collection(db, "users", user.uid, "notifications"), {
        type: "payment_confirmed",
        auctionId,
        winningBid: info.winningBid,
        productTitle: info.productTitle,
        title: "✅ Payment Confirmed!",
        message:
          `Your payment of ${fmt(info.winningBid)} ${CUR} for ` +
          `"${info.productTitle}" was successful. Your product will be delivered ` +
          `within a maximum of 10 days. Thank you for choosing Loqta Zone! ` +
          `If you need anything, feel free to contact us.`,
        isRead: false,
        url: null,
        createdAt: serverTimestamp(),
      });
      setPageState("success");
    } catch (err: any) {
      setError(err.message ?? "Payment failed. Please try again.");
      setPageState("error");
    }
  }, [user, auctionId, info]);

  return (
    <>
      <style>{CSS}</style>
      {/* Full-page wrapper — pushes content below the fixed navbar */}
      <div className="loc-page">
        <div className="loc-card">
          {pageState === "loading" && (
            <div className="loc-center">
              <div className="loc-spinner" />
              <p className="loc-hint">Loading your order…</p>
            </div>
          )}

          {pageState === "error" && (
            <div className="loc-center">
              <div className="loc-error-icon">✕</div>
              <h2 className="loc-title" style={{ color: "#ff6464" }}>
                Something went wrong
              </h2>
              <p className="loc-hint">{error}</p>
              <button
                className="loc-btn-secondary"
                onClick={() => navigate("/")}
              >
                Go to Home
              </button>
            </div>
          )}

          {pageState === "paying" && (
            <div className="loc-center">
              <div className="loc-spinner" />
              <h2 className="loc-title">Processing Payment…</h2>
              <p className="loc-hint">Please wait, do not close this page.</p>
            </div>
          )}

          {pageState === "pending" && info && (
            <>
              <div className="loc-topbar" />
              <div className="loc-header">
                <div className="loc-badge-row">
                  <span className="loc-badge">🎉 You've been selected!</span>
                </div>
                <h1 className="loc-title">Confirm Your Purchase</h1>
                <p className="loc-subtitle">
                  Congratulations! Your last offer was chosen by our team.
                  Please confirm your purchase to secure your item.
                </p>
              </div>

              <div className="loc-product-card">
                {info.productImage && (
                  <div className="loc-img-wrap">
                    <img
                      src={info.productImage}
                      alt={info.productTitle}
                      className="loc-img"
                    />
                    <div className="loc-img-overlay" />
                  </div>
                )}
                <div className="loc-product-info">
                  <span className="loc-product-label">ITEM</span>
                  <span className="loc-product-title">{info.productTitle}</span>
                  {info.auctionNumber > 0 && (
                    <span className="loc-auction-num">
                      Auction #{info.auctionNumber}
                    </span>
                  )}
                </div>
              </div>

              <div className="loc-amount-card">
                <span className="loc-amount-label">Amount to Pay</span>
                <div className="loc-amount-row">
                  <span className="loc-amount">{fmt(info.winningBid)}</span>
                  <span className="loc-amount-cur">{CUR}</span>
                </div>
                <span className="loc-amount-note">
                  Your confirmed last-offer amount
                </span>
              </div>

              <div className="loc-info-box">
                <span className="loc-info-icon">📦</span>
                <p className="loc-info-text">
                  Once payment is confirmed, your product will be delivered
                  within
                  <strong> a maximum of 10 days</strong>. Our team will contact
                  you with delivery details.
                </p>
              </div>

              <button className="loc-confirm-btn" onClick={handleConfirm}>
                <span>💳</span>
                Confirm Purchase
                <span>→</span>
              </button>

              <button className="loc-skip" onClick={() => navigate("/")}>
                Remind me later
              </button>
            </>
          )}

          {pageState === "success" && info && (
            <>
              <div className="loc-topbar loc-topbar-green" />
              <div className="loc-success-wrap">
                <div className="loc-success-ring-outer" />
                <div className="loc-success-ring" />
                <div className="loc-success-check">✓</div>

                <h1 className="loc-title loc-success-title">
                  Payment Successful!
                </h1>
                <div className="loc-success-amount">
                  {fmt(info.winningBid)}
                  <span className="loc-success-cur"> {CUR}</span>
                </div>
                <p className="loc-success-product">"{info.productTitle}"</p>

                <div className="loc-delivery-card">
                  <div className="loc-delivery-row">
                    <span className="loc-delivery-icon">📦</span>
                    <div>
                      <p className="loc-delivery-label">Estimated Delivery</p>
                      <p className="loc-delivery-val">Within 10 days</p>
                    </div>
                  </div>
                  <div className="loc-delivery-divider" />
                  <div className="loc-delivery-row">
                    <span className="loc-delivery-icon">💬</span>
                    <div>
                      <p className="loc-delivery-label">Need help?</p>
                      <p className="loc-delivery-val">
                        Don't hesitate to{" "}
                        <button
                          className="loc-contact-link"
                          onClick={() => navigate("/contact")}
                        >
                          contact us
                        </button>
                      </p>
                    </div>
                  </div>
                </div>

                <p className="loc-thank-you">
                  Thank you for choosing <strong>Loqta Zone</strong>! We truly
                  appreciate your trust and look forward to serving you again.
                  🌟
                </p>

                <button
                  className="loc-btn-secondary loc-btn-green"
                  onClick={() => navigate("/")}
                >
                  Back to Home
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}

const CSS = `
@keyframes loc-check-pop{0%{transform:scale(0) rotate(-20deg);opacity:0;}65%{transform:scale(1.25) rotate(5deg);}100%{transform:scale(1) rotate(0);opacity:1;}}
@keyframes loc-ring-pulse{0%{transform:scale(0.6);opacity:0.8;}100%{transform:scale(2.4);opacity:0;}}
@keyframes loc-ring-outer{0%{transform:scale(0.5);opacity:0.6;}100%{transform:scale(3);opacity:0;}}
@keyframes loc-shimmer{0%{background-position:-200% center;}100%{background-position:200% center;}}
@keyframes loc-spin{to{transform:rotate(360deg);}}
@keyframes loc-fade-up{from{opacity:0;transform:translateY(20px);}to{opacity:1;transform:translateY(0);}}

/*
  loc-page:
  - min-height: 100vh so it fills the screen
  - padding-top: 100px pushes everything below the fixed navbar (adjust if
    your navbar height is different — most fixed navbars are 64–80px)
  - padding-bottom: 40px so the card doesn't touch the screen bottom on mobile
  - On very small screens (≤480px) we reduce horizontal padding so the card
    doesn't feel cramped
*/
.loc-page {
  min-height: 100vh;
  background: linear-gradient(160deg, #060c14 0%, #0a0a1a 100%);
  display: flex;
  align-items: flex-start;       /* align to top, not center — avoids navbar overlap */
  justify-content: center;
  padding: 100px 16px 60px;      /* top:100px clears navbar | bottom:60px mobile breathing room */
  font-family: 'Outfit', system-ui, sans-serif;
  box-sizing: border-box;
}

.loc-card {
  width: 100%;
  max-width: 480px;
  background: linear-gradient(160deg, rgba(255,255,255,0.038) 0%, rgba(255,255,255,0.018) 100%);
  border: 1px solid rgba(201,169,110,0.22);
  border-radius: 28px;
  overflow: hidden;
  box-shadow: 0 0 0 1px rgba(201,169,110,0.06), 0 40px 80px rgba(0,0,0,0.6);
  animation: loc-fade-up 0.5s cubic-bezier(0.22,1,0.36,1) both;
  /* Let the card grow naturally — no fixed height */
}

.loc-topbar{width:100%;height:3px;background:linear-gradient(90deg,transparent 0%,rgba(201,169,110,0.3) 20%,#c9a96e 50%,rgba(201,169,110,0.3) 80%,transparent 100%);}
.loc-topbar-green{background:linear-gradient(90deg,transparent 0%,rgba(74,222,128,0.3) 20%,#4ade80 50%,rgba(74,222,128,0.3) 80%,transparent 100%);}

.loc-center{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;padding:60px 32px;text-align:center;}
.loc-spinner{width:44px;height:44px;border:3px solid rgba(201,169,110,0.15);border-top-color:#c9a96e;border-radius:50%;animation:loc-spin 0.9s linear infinite;}
.loc-error-icon{width:56px;height:56px;border-radius:50%;background:rgba(255,100,100,0.1);border:1.5px solid rgba(255,100,100,0.35);display:flex;align-items:center;justify-content:center;font-size:22px;color:#ff6464;}

.loc-header{padding:28px 32px 0;text-align:center;}
.loc-badge-row{margin-bottom:12px;}
.loc-badge{display:inline-flex;align-items:center;gap:6px;font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#c9a96e;background:rgba(201,169,110,0.1);border:1px solid rgba(201,169,110,0.25);border-radius:999px;padding:5px 14px;}
.loc-title{font-size:26px;font-weight:800;color:rgb(229,224,198);letter-spacing:-0.02em;margin:0 0 8px;}
.loc-subtitle{font-size:13px;font-weight:300;color:rgba(229,224,198,0.38);line-height:1.65;margin:0;}
.loc-hint{font-size:13px;color:rgba(229,224,198,0.38);margin:0;}

.loc-product-card{margin:20px 24px 0;border-radius:16px;background:rgba(201,169,110,0.05);border:1px solid rgba(201,169,110,0.14);overflow:hidden;display:flex;align-items:center;}
.loc-img-wrap{position:relative;width:90px;height:90px;flex-shrink:0;}
.loc-img{width:100%;height:100%;object-fit:cover;}
.loc-img-overlay{position:absolute;inset:0;background:linear-gradient(90deg,transparent 60%,rgba(9,17,26,0.6));}
.loc-product-info{display:flex;flex-direction:column;gap:3px;padding:14px 16px;}
.loc-product-label{font-size:9px;font-weight:700;letter-spacing:0.18em;color:rgba(201,169,110,0.45);text-transform:uppercase;}
.loc-product-title{font-size:15px;font-weight:700;color:rgb(229,224,198);line-height:1.3;}
.loc-auction-num{font-size:11px;color:rgba(229,224,198,0.28);}

.loc-amount-card{margin:14px 24px 0;padding:16px 20px;border-radius:16px;background:rgba(201,169,110,0.05);border:1px solid rgba(201,169,110,0.18);display:flex;flex-direction:column;gap:4px;align-items:center;}
.loc-amount-label{font-size:10px;font-weight:700;letter-spacing:0.18em;color:rgba(201,169,110,0.45);text-transform:uppercase;}
.loc-amount-row{display:flex;align-items:baseline;gap:6px;}
.loc-amount{font-size:40px;font-weight:800;color:#c9a96e;letter-spacing:-0.02em;line-height:1;}
.loc-amount-cur{font-size:16px;font-weight:600;color:rgba(201,169,110,0.5);}
.loc-amount-note{font-size:11px;color:rgba(229,224,198,0.25);}

.loc-info-box{margin:14px 24px 0;padding:12px 14px;border-radius:12px;background:rgba(147,197,253,0.04);border:1px solid rgba(147,197,253,0.1);display:flex;align-items:flex-start;gap:10px;}
.loc-info-icon{font-size:18px;flex-shrink:0;margin-top:1px;}
.loc-info-text{font-size:12px;line-height:1.65;color:rgba(229,224,198,0.35);margin:0;}
.loc-info-text strong{color:rgba(229,224,198,0.6);}

.loc-confirm-btn{display:flex;align-items:center;justify-content:center;gap:10px;width:calc(100% - 48px);margin:20px 24px 0;height:56px;border:none;border-radius:14px;background:linear-gradient(135deg,#c9a96e 0%,#b8934a 50%,#c9a96e 100%);background-size:200% auto;color:#09111a;font-family:'Outfit',system-ui,sans-serif;font-size:14px;font-weight:800;letter-spacing:0.06em;cursor:pointer;animation:loc-shimmer 3s linear infinite;box-shadow:0 8px 32px rgba(201,169,110,0.3);transition:transform 0.2s,box-shadow 0.2s;}
.loc-confirm-btn:hover{transform:translateY(-2px);box-shadow:0 14px 42px rgba(201,169,110,0.42);}

.loc-skip{display:block;background:none;border:none;width:100%;font-family:'Outfit',system-ui,sans-serif;font-size:12px;color:rgba(229,224,198,0.2);cursor:pointer;padding:14px 0 24px;transition:color 0.2s;text-align:center;}
.loc-skip:hover{color:rgba(229,224,198,0.5);}

.loc-btn-secondary{display:flex;align-items:center;justify-content:center;width:calc(100% - 48px);height:48px;background:rgba(255,255,255,0.04);border:1px solid rgba(229,224,198,0.08);border-radius:12px;font-family:'Outfit',system-ui,sans-serif;font-size:13px;font-weight:600;color:rgba(229,224,198,0.45);cursor:pointer;transition:all 0.25s ease;margin:0 auto;}
.loc-btn-secondary:hover{background:rgba(255,255,255,0.07);color:rgba(229,224,198,0.75);border-color:rgba(229,224,198,0.14);}
.loc-btn-green{margin-top:20px;border-color:rgba(74,222,128,0.2);color:rgba(74,222,128,0.7);}
.loc-btn-green:hover{background:rgba(74,222,128,0.08);color:#4ade80;border-color:rgba(74,222,128,0.35);}

/* ── Success ── */
.loc-success-wrap{display:flex;flex-direction:column;align-items:center;padding:36px 32px 40px;text-align:center;}
.loc-success-ring-outer{position:absolute;width:80px;height:80px;border-radius:50%;border:2px solid rgba(74,222,128,0.2);animation:loc-ring-outer 1.4s ease-out 0.1s forwards;}
.loc-success-ring{position:absolute;width:70px;height:70px;border-radius:50%;border:2px solid rgba(74,222,128,0.4);animation:loc-ring-pulse 1.1s ease-out forwards;}
.loc-success-check{width:64px;height:64px;border-radius:50%;background:rgba(74,222,128,0.1);border:2px solid rgba(74,222,128,0.4);display:flex;align-items:center;justify-content:center;font-size:28px;color:#4ade80;position:relative;z-index:1;animation:loc-check-pop 0.6s cubic-bezier(0.34,1.56,0.64,1) 0.2s both;margin-bottom:20px;}
.loc-success-title{color:#4ade80 !important;margin-bottom:6px !important;}
.loc-success-amount{font-size:48px;font-weight:800;color:#4ade80;letter-spacing:-0.02em;line-height:1;margin-bottom:4px;}
.loc-success-cur{font-size:18px;color:rgba(74,222,128,0.5);}
.loc-success-product{font-size:14px;color:rgba(229,224,198,0.45);margin:0 0 20px;font-style:italic;}

.loc-delivery-card{width:100%;border-radius:16px;background:rgba(74,222,128,0.04);border:1px solid rgba(74,222,128,0.15);overflow:hidden;margin-bottom:20px;}
.loc-delivery-row{display:flex;align-items:center;gap:14px;padding:14px 18px;}
.loc-delivery-icon{font-size:20px;flex-shrink:0;}
.loc-delivery-label{font-size:10px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:rgba(74,222,128,0.45);margin:0 0 2px;}
.loc-delivery-val{font-size:14px;font-weight:600;color:rgba(229,224,198,0.75);margin:0;}
.loc-delivery-divider{height:1px;background:rgba(74,222,128,0.08);}
.loc-contact-link{background:none;border:none;padding:0;font-family:inherit;font-size:inherit;font-weight:inherit;color:rgba(201,169,110,0.85);text-decoration:underline;text-underline-offset:2px;cursor:pointer;transition:color 0.2s;}
.loc-contact-link:hover{color:#c9a96e;}

.loc-thank-you{font-size:13px;line-height:1.7;color:rgba(229,224,198,0.35);margin:0 0 4px;}
.loc-thank-you strong{color:rgba(229,224,198,0.6);}

/* ── Mobile ── */
@media (max-width: 480px) {
  .loc-page {
    padding: 90px 12px 40px;   /* slightly less top on small phones */
    align-items: flex-start;
  }
  .loc-card {
    border-radius: 20px;
  }
  .loc-title { font-size: 22px; }
  .loc-amount { font-size: 32px; }
  .loc-success-amount { font-size: 36px; }
  .loc-header { padding: 22px 20px 0; }
  .loc-product-card { margin: 16px 16px 0; }
  .loc-amount-card { margin: 12px 16px 0; }
  .loc-info-box { margin: 12px 16px 0; }
  .loc-confirm-btn { width: calc(100% - 32px); margin-left: 16px; margin-right: 16px; }
  .loc-success-wrap { padding: 28px 20px 32px; }
  .loc-delivery-card { width: 100%; }
}
`;
