/**
 * NotificationActionModals.tsx
 *
 * Hosts LastOfferModal / LuckySpinModal when opened from a notification click.
 * Does NOT navigate to the auction live page — modals overlay the current route.
 *
 * - Last offer: opens only if the user has not submitted yet
 * - Lucky spin: opens only if the user has not claimed yet
 */

import { useEffect, useState } from "react";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import { db } from "@/firebase/firebase";
import { useAuth } from "@/store/AuthContext/AuthContext";
import LastOfferModal from "@/components/LastOfferModal/LastOfferModal";
import LuckySpinModal from "@/components/LuckySpinModal/LuckySpinModal";
import { dismissPendingLastOffer } from "@/hooks/usePendingLastOffer";
import { getUserAuctionLuckySpin } from "@/service/luckySpinService/luckySpinService";
import { resolveProductTitle } from "@/lib/resolveLocalized";
import {
  OPEN_LAST_OFFER_EVENT,
  OPEN_LUCKY_SPIN_EVENT,
  type OpenLastOfferDetail,
  type OpenLuckySpinDetail,
} from "@/lib/postAuctionModalEvents";

interface LastOfferTarget {
  auctionId: string;
  startingPrice: number;
  winningBid: number;
  winnerName: string;
  productTitle: string;
}

interface LuckySpinTarget {
  auctionId: string;
  productTitle: string;
  auctionNumber?: number;
}

export default function NotificationActionModals() {
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === "ar";

  const [lastOffer, setLastOffer] = useState<LastOfferTarget | null>(null);
  const [luckySpin, setLuckySpin] = useState<LuckySpinTarget | null>(null);

  useEffect(() => {
    if (!user) return;

    const onLastOffer = async (ev: Event) => {
      const detail = (ev as CustomEvent<OpenLastOfferDetail>).detail;
      if (!detail?.auctionId) return;

      try {
        // Already submitted?
        const existingQ = query(
          collection(db, "auctions", detail.auctionId, "lastOffers"),
          where("userId", "==", user.uid),
        );
        const existing = await getDocs(existingQ);
        if (!existing.empty) {
          toast.success(
            isRtl
              ? "لقد قدّمت عرضك الأخير مسبقاً"
              : "You already submitted your last offer",
          );
          return;
        }

        const auctionSnap = await getDoc(doc(db, "auctions", detail.auctionId));
        if (!auctionSnap.exists()) {
          toast.error(
            t("common.errorGeneric", "Something went wrong. Please try again."),
          );
          return;
        }
        const a = auctionSnap.data();

        let productTitle =
          resolveProductTitle(detail.productTitle ?? "") || "";
        if (!productTitle && a.productId) {
          const pSnap = await getDoc(doc(db, "products", a.productId));
          if (pSnap.exists()) {
            productTitle = resolveProductTitle(pSnap.data()?.title) || "";
          }
        }

        let winnerName = detail.winnerName ?? "";
        const winnerId = a.winnerId as string | undefined;
        if ((!winnerName || winnerName === "The winner") && winnerId && winnerId !== "NO_WINNER") {
          const wSnap = await getDoc(doc(db, "users", winnerId));
          if (wSnap.exists()) {
            const u = wSnap.data();
            winnerName =
              u.fullName ??
              u.displayName ??
              `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() ??
              (isRtl ? "الفائز" : "The Winner");
          }
        }

        // Prevent PersistentLastOfferGate from also opening this auction
        dismissPendingLastOffer(detail.auctionId);

        setLuckySpin(null);
        setLastOffer({
          auctionId: detail.auctionId,
          startingPrice: a.startingPrice ?? 0,
          winningBid: detail.winningBid ?? a.winningBid ?? a.currentBid ?? 0,
          winnerName: winnerName || (isRtl ? "الفائز" : "The Winner"),
          productTitle,
        });
      } catch (err) {
        console.warn("[NotificationActionModals] last offer open failed:", err);
        toast.error(
          t("common.errorGeneric", "Something went wrong. Please try again."),
        );
      }
    };

    const onLuckySpin = async (ev: Event) => {
      const detail = (ev as CustomEvent<OpenLuckySpinDetail>).detail;
      if (!detail?.auctionId) return;

      try {
        const existing = await getUserAuctionLuckySpin(
          user.uid,
          detail.auctionId,
        );
        if (existing) {
          toast.success(
            isRtl
              ? "لقد استلمت جائزتك مسبقاً"
              : "You already claimed your Lucky Spin reward",
          );
          return;
        }

        let productTitle =
          resolveProductTitle(detail.productTitle ?? "") || "";
        let auctionNumber = detail.auctionNumber;

        if (!productTitle || auctionNumber == null) {
          const auctionSnap = await getDoc(
            doc(db, "auctions", detail.auctionId),
          );
          if (auctionSnap.exists()) {
            const a = auctionSnap.data();
            auctionNumber = auctionNumber ?? a.auctionNumber;
            if (!productTitle && a.productId) {
              const pSnap = await getDoc(doc(db, "products", a.productId));
              if (pSnap.exists()) {
                productTitle = resolveProductTitle(pSnap.data()?.title) || "";
              }
            }
          }
        }

        setLastOffer(null);
        setLuckySpin({
          auctionId: detail.auctionId,
          productTitle,
          auctionNumber,
        });
      } catch (err) {
        console.warn("[NotificationActionModals] lucky spin open failed:", err);
        toast.error(
          t("common.errorGeneric", "Something went wrong. Please try again."),
        );
      }
    };

    window.addEventListener(OPEN_LAST_OFFER_EVENT, onLastOffer);
    window.addEventListener(OPEN_LUCKY_SPIN_EVENT, onLuckySpin);
    return () => {
      window.removeEventListener(OPEN_LAST_OFFER_EVENT, onLastOffer);
      window.removeEventListener(OPEN_LUCKY_SPIN_EVENT, onLuckySpin);
    };
  }, [user, isRtl, t]);

  if (!user) return null;

  return (
    <>
      {lastOffer && (
        <LastOfferModal
          auctionId={lastOffer.auctionId}
          userId={user.uid}
          startingPrice={lastOffer.startingPrice}
          winningBid={lastOffer.winningBid}
          winnerName={lastOffer.winnerName}
          productTitle={lastOffer.productTitle}
          onClose={() => setLastOffer(null)}
        />
      )}

      {luckySpin && (
        <LuckySpinModal
          auctionId={luckySpin.auctionId}
          userId={user.uid}
          productTitle={luckySpin.productTitle}
          onClose={() => setLuckySpin(null)}
        />
      )}
    </>
  );
}
