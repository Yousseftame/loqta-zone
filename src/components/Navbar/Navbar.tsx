import { useState, useEffect } from "react";
import {
  Facebook,
  FacebookIcon,
  Instagram,
  InstagramIcon,
  Menu,
  X,
} from "lucide-react";
import { Link } from "react-router-dom";


const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (isMenuOpen) {
      // Save current scroll position
      const scrollY = window.scrollY;
      document.body.style.position = "fixed";
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = "100%";
      document.body.style.overflow = "hidden";
    } else {
      // Restore scroll position
      const scrollY = document.body.style.top;
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.width = "";
      document.body.style.overflow = "";
      window.scrollTo(0, parseInt(scrollY || "0") * -1);
    }

    return () => {
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.width = "";
      document.body.style.overflow = "";
    };
  }, [isMenuOpen]);

  const navLinks = [
    { label: "Auctions", to: "/menu" },
    { label: "How it works", to: "/gallery" },
    { label: "About Us", to: "/contact" },
    { label: "Contact Us", to: "/contact" },
  ];

  return (
    <>
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          isScrolled
            ? "bg-[#2A4863]/95 backdrop-blur-md shadow-lg py-4"
            : "bg-transparent py-8 lg:py-8"
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 lg:px-12">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <Link
              to="/"
              className="flex-shrink-0 transition-transform hover:scale-105 duration-300"
            >
              <img
                src="/loqta-removebg-preview.png"
                alt="Rubinos"
                className="  h-16 lg:h-16 w-auto opacity-90"
              />
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center gap-8 ml-auto">
              {navLinks.map((link) => (
                <Link
                  key={link.label}
                  to={link.to}
                  className="nav-link text-secondary/90 hover:text-secondary text-sm tracking-wide transition-colors duration-300"
                >
                  {link.label}
                </Link>
              ))}

              {/* Reserve Button - social links buttons  */}

              <div>
                <a
                  href="https://www.facebook.com/profile.php?id=100094085240582"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-seaworthy-nav  "
                >
                  <FacebookIcon />
                </a>

                <a
                  href="https://www.instagram.com/rubinos.eg/?fbclid=IwY2xjawPTNHFleHRuA2FlbQIxMABicmlkETE0aVk5ZExEQjRLamU4NnlDc3J0YwZhcHBfaWQQMjIyMDM5MTc4ODIwMDg5MgABHh6RekMP4QEdS5fhEntWrBEHq95LVVFzdAkeHNn0mFRx0ctm3BXUss7gjPDu_aem_WDL_jQcTeBrVOQJqWlq2wA#"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-seaworthy-nav  "
                >
                  <InstagramIcon />
                </a>
              </div>
            </div>

            {/* Mobile menu button */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="lg:hidden text-secondary p-2 hover:opacity-80 transition-opacity z-[70]"
              aria-label="Toggle menu"
            >
              {isMenuOpen ? <X size={28} /> : <Menu size={28} />}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Menu - Completely separate overlay */}
      {isMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-[60] flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-[#2A4863]/95 backdrop-blur-sm"
            onClick={() => setIsMenuOpen(false)}
          />

          {/* Menu Content */}

          <div className="relative z-[61] flex flex-col items-center justify-center space-y-6 px-6">
            <Link
              to={"/"}
              onClick={() => {
                setIsMenuOpen(false);
              }}
            >
              <img
                src="/loqta-removebg-preview.png"
                alt="Rubinos"
                className="h-20 sm:h-24 mb-2"
              />
            </Link>

            {navLinks.map((link, index) => (
              <Link
                key={link.label}
                to={link.to}
                onClick={() => setIsMenuOpen(false)}
                className="nav-link text-2xl text-secondary hover:text-secondary/80 transition-colors duration-300"
                style={{
                  animation: `fadeInUp 0.4s ease-out ${index * 0.1}s forwards`,
                  opacity: 0,
                }}
              >
                {link.label}
              </Link>
            ))}

            <div className=" flex gap-5 pt-4">
              <a
                href="https://www.instagram.com/rubinos.eg/?fbclid=IwY2xjawPTNHFleHRuA2FlbQIxMABicmlkETE0aVk5ZExEQjRLamU4NnlDc3J0YwZhcHBfaWQQMjIyMDM5MTc4ODIwMDg5MgABHh6RekMP4QEdS5fhEntWrBEHq95LVVFzdAkeHNn0mFRx0ctm3BXUss7gjPDu_aem_WDL_jQcTeBrVOQJqWlq2wA#"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-seaworthy-solid mt-4"
                style={{
                  animation: `fadeInUp 0.4s ease-out ${navLinks.length * 0.1}s forwards`,
                  opacity: 0,
                }}
              >
                <Instagram />
              </a>
              <a
                href="https://www.facebook.com/profile.php?id=100094085240582"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-seaworthy-solid mt-4"
                style={{
                  animation: `fadeInUp 0.4s ease-out ${navLinks.length * 0.1}s forwards`,
                  opacity: 0,
                }}
              >
                <Facebook />
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Navbar;
