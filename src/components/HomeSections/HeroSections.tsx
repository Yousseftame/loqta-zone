import React from 'react'
import SplitText from "../SplitText";


export default function HeroSections() {
    const handleAnimationComplete = () => {
      console.log("All letters have animated!");
    };
  return (
    <>
      <SplitText
        text="Hello, youuuuuu!"
        className="text-2xl font-semibold text-center"
        delay={50}
        duration={1.25}
        ease="power3.out"
        splitType="chars"
        from={{ opacity: 0, y: 40 }}
        to={{ opacity: 1, y: 0 }}
        threshold={0.1}
        rootMargin="-100px"
        textAlign="center"
        onLetterAnimationComplete={handleAnimationComplete}
        showCallback
      />
    </>
  );
}
