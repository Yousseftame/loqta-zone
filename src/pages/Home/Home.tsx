import Carousel from "@/components/Carousel";
import CurvedLoop from "@/components/CurvedLoop";
import RotatingText from "@/components/RotatingText";
import ScrollStack, { ScrollStackItem } from "@/components/ScrollStack";
import ScrollVelocity from "@/components/ScrollVelocity";
import Shuffle from "@/components/Shuffle";
import TrueFocus from "@/components/TrueFocus";
import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler";
import VariableProximity from "@/components/VariableProximity";
import React from "react";
import { useRef } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Pagination, Autoplay } from "swiper/modules";
import HeroSections from "@/components/HomeSections/HeroSections";
import ImageCard from "@/components/shared/imageCard";
import { Typography } from "@mui/material";
import AuctionSwiper from "@/components/shared/AuctionSwiper";

export default function Home() {
  const staticRooms = [
    {
      _id: "1",
      roomNumber: "Luxury Watch",
      price: 2500,
      images: ["https://images.unsplash.com/photo-1523170335258-f5ed11844a49"],
    },
    {
      _id: "2",
      roomNumber: "Vintage Camera",
      price: 1200,
      images: ["https://images.unsplash.com/photo-1519183071298-a2962e402c6b"],
    },
    {
      _id: "3",
      roomNumber: "Classic Car",
      price: 15000,
      images: ["https://images.unsplash.com/photo-1493238792000-8113da705763"],
    },
    {
      _id: "4",
      roomNumber: "Classic Car",
      price: 15000,
      images: ["https://images.unsplash.com/photo-1493238792000-8113da705763"],
    },
    {
      _id: "3",
      roomNumber: "Classic Car",
      price: 15000,
      images: ["https://images.unsplash.com/photo-1493238792000-8113da705763"],
    },
    {
      _id: "3",
      roomNumber: "Classic Car",
      price: 15000,
      images: ["https://images.unsplash.com/photo-1493238792000-8113da705763"],
    },
  ];

  return (
    <>
      {/* <AnimatedThemeToggler /> */}
      <HeroSections />

      <CurvedLoop
        marqueeText="LOQTA ✦ ZONE ✦ LOQTA ✦ ZONE ✦ LOQTA ✦"
        speed={2}
        curveAmount={400}
        direction="right"
        interactive
        className="custom-text-style "
      />

      <AuctionSwiper />
    </>
  );
}
