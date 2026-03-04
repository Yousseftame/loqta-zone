import { useState, useEffect } from "react";
import { MoveUp } from "lucide-react";

export default function ScrollToTop() {
  const [isVisible, setIsVisible] = useState(false);

  const toggleVisibility = () => {
    if (window.pageYOffset > 300) {
      setIsVisible(true);
    } else {
      setIsVisible(false);
    }
  };

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
      className={`fixed bottom-8 right-30 z-50 transition-all duration-500 ease-in-out ${
        isVisible
          ? "opacity-100 translate-y-0"
          : "opacity-0 translate-y-16 pointer-events-none"
      }`}
    >
      <button
        onClick={scrollToTop}
        className="flex items-center justify-center w-15 h-15 rounded-full bg-[#c9a96e]/80 text-white shadow-lg hover:bg-[#c9a96e] transition-all duration-300 hover:scale-110"
        aria-label="Scroll to top"
      >
        <MoveUp size={25} />
      </button>
    </div>
  );
}
