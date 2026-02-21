import Carousel from '@/components/Carousel';
import CurvedLoop from '@/components/CurvedLoop';
import RotatingText from '@/components/RotatingText';
import ScrollStack, { ScrollStackItem } from '@/components/ScrollStack';
import ScrollVelocity from '@/components/ScrollVelocity';
import Shuffle from '@/components/Shuffle';
import TrueFocus from '@/components/TrueFocus';
import { AnimatedThemeToggler } from '@/components/ui/animated-theme-toggler';
import VariableProximity from '@/components/VariableProximity';
import React from 'react'
import { useRef } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Pagination, Autoplay } from "swiper/modules";


export default function Home() {

  const containerRef = useRef(null);

  return (
    <>
      {/* <AnimatedThemeToggler /> */}
      <div className="flex-row  justify-center items-center">
        <div className=" mt-50  gap-10">
          <TrueFocus
            sentence="LOQTA ZONE"
            manualMode={false}
            blurAmount={5}
            borderColor="#5227FF"
            animationDuration={0.5}
            pauseBetweenAnimations={1}
          />

          <div style={{ height: "600px", position: "relative" }}>
            {/* <Carousel
              baseWidth={300}
              autoplay
              autoplayDelay={1000}
              pauseOnHover={false}
              loop={false}
              round={false}
            /> */}

            <div ref={containerRef} style={{ position: "relative" }}>
              <VariableProximity
                label={
                  "Hover me! And then star React Bits on GitHub, or else..."
                }
                className={"variable-proximity-demo"}
                fromFontVariationSettings="'wght' 400, 'opsz' 9"
                toFontVariationSettings="'wght' 1000, 'opsz' 40"
                containerRef={containerRef}
                radius={100}
                falloff="linear"
              />
            </div>

            <Swiper
              modules={[Navigation, Pagination, Autoplay]}
              spaceBetween={20}
              slidesPerView={4}
              navigation
              pagination={{ clickable: true }}
              autoplay={{ delay: 3000 }}
              loop
            >
              <SwiperSlide>Card 1</SwiperSlide>
              <SwiperSlide>Card 2</SwiperSlide>
              <SwiperSlide>Card 3</SwiperSlide>
            </Swiper>

            <CurvedLoop
              marqueeText="LOQTA ✦ ZONE ✦ LOQTA ✦ ZONE ✦ LOQTA ✦"
              speed={2}
              curveAmount={400}
              direction="right"
              interactive
              className="custom-text-style "
            />
          </div>

          {/* <RotatingText
          texts={["React", "Bits", "Is", "Cool!"]}
          mainClassName="px-2 sm:px-2 md:px-3 bg-cyan-300 text-black overflow-hidden py-0.5 sm:py-1 md:py-2 justify-center rounded-lg"
          staggerFrom={"last"}
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "-120%" }}
          staggerDuration={0.025}
          splitLevelClassName="overflow-hidden pb-0.5 sm:pb-1 md:pb-1"
          transition={{ type: "spring", damping: 30, stiffness: 400 }}
          rotationInterval={2000}
        /> */}
          {/* <Shuffle
          text="Hello World"
          shuffleDirection="right"
          duration={0.35}
          animationMode="evenodd"
          shuffleTimes={1}
          ease="power3.out"
          stagger={0.03}
          threshold={0.1}
          triggerOnce={true}
          triggerOnHover
          respectReducedMotion={true}
          loop={false}
          loopDelay={0}
        /> */}
        </div>
      </div>
    </>
  );
}
