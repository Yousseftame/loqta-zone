import Carousel from "@/components/Carousel";
import CurvedLoop from "@/components/CurvedLoop";
import RotatingText from "@/components/RotatingText";
import ScrollStack, { ScrollStackItem } from "@/components/ScrollStack";
import ScrollVelocity from "@/components/ScrollVelocity";
// import Shuffle from "@/components/Shuffle";
import TrueFocus from "@/components/TrueFocus";
import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler";
import VariableProximity from "@/components/VariableProximity";
import React from "react";
import { useRef } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Pagination, Autoplay } from "swiper/modules";
import HeroSections from "@/components/HomeSections/HeroSections";
import { Typography } from "@mui/material";
import AuctionSwiper from "@/components/shared/AuctionSwiper";
import StatsSection from "@/components/shared/Statssection";
import HowItWorksSection from "@/components/shared/Howitworkssection";
import AuctionsSection from "@/components/shared/Auctionssection";
import AuctionRequestSection from "@/components/shared/Auctionrequestsection";
import { useTranslation } from "react-i18next";
import LiveAuctionsSection from "@/components/shared/LiveAuctionssection";

export default function Home() {

   


  return (
    <>
  
      <HeroSections />

    
      <LiveAuctionsSection/>
      <AuctionSwiper />
      <StatsSection />
      <HowItWorksSection />
      <AuctionsSection />
      <AuctionRequestSection />
    </>
  );
}
