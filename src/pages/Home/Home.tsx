import Carousel from '@/components/Carousel';
import CurvedLoop from '@/components/CurvedLoop';
import RotatingText from '@/components/RotatingText';
import ScrollStack, { ScrollStackItem } from '@/components/ScrollStack';
import ScrollVelocity from '@/components/ScrollVelocity';
import Shuffle from '@/components/Shuffle';
import TrueFocus from '@/components/TrueFocus';
import { AnimatedThemeToggler } from '@/components/ui/animated-theme-toggler';
import React from 'react'

export default function Home() {
  return (
    <>
      <AnimatedThemeToggler />
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
