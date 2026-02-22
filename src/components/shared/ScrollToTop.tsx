import { useState, useEffect } from "react";
import { MoveUp } from "lucide-react";

export default function ScrollToTop() {
  const [isVisible, setIsVisible] = useState(false);

  // Show button when page is scrolled down
  const toggleVisibility = () => {
    if (window.pageYOffset > 300) {
      setIsVisible(true);
    } else {
      setIsVisible(false);
    }
  };

  // Scroll to top smoothly
  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  useEffect(() => {
    window.addEventListener("scroll", toggleVisibility);

    return () => {
      window.removeEventListener("scroll", toggleVisibility);
    };
  }, []);

  return (
    <div
      className={`fixed bottom-8 right-8 z-50 transition-all duration-500 ease-in-out ${
        isVisible
          ? "opacity-100 translate-y-0"
          : "opacity-0 translate-y-16 pointer-events-none"
      }`}
    >
      <button
        onClick={scrollToTop}
        className="p-4 rounded-full bg-[#c9a96e]/80 text-white shadow-lg hover:bg-[#c9a96e] transition-all duration-300 hover:scale-110 group"
        aria-label="Scroll to top"
      >
        <MoveUp />
      </button>
    </div>
  );
}
