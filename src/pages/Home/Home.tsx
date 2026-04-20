import CurvedLoop from "@/components/CurvedLoop";
import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler";
import React from "react";
import { useRef } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Pagination, Autoplay } from "swiper/modules";
import HeroSections from "@/components/HomeSections/HeroSections";
import { Typography } from "@mui/material";
import AuctionSwiper from "@/components/shared/AuctionSwiper";
import HowItWorksSection from "@/components/shared/Howitworkssection";
import AuctionsSection from "@/components/shared/Auctionssection";
import AuctionRequestSection from "@/components/shared/Auctionrequestsection";
import { useTranslation } from "react-i18next";
import LiveAuctionsSection from "@/components/shared/LiveAuctionssection";
import LeftRightSections from "@/components/HomeSections/LeftRightSections";

export default function Home() {
  return (
    <>
      <style>{`
        /* Shared wrapper: centers both slideshow sections at 90% on desktop */
        .home-slides-wrapper {
          width: 100%;
          background: #09111a;
        }

        .home-slides-inner {
          width: 95%;
          margin: 0 auto;
        }

        /* Mobile: fully flush, no centering, no side space */
        @media (max-width: 639px) {
          .home-slides-inner {
            width: 100%;
            margin: 0;
          }
        }
      `}</style>

      <div className="home-slides-wrapper">
        <div className="home-slides-inner">
          <HeroSections />
          <LeftRightSections />
        </div>
      </div>

      <LiveAuctionsSection />
      <AuctionSwiper />
      <AuctionsSection />
    </>
  );
}
