import React from 'react'
import logo from "../../assets/loqta-removebg-preview.png";
import CardNav from '../CardNav';

export default function Navbar() {

    const items = [
      {
        label: "About",
        bgColor: "#0D0716",
        textColor: "#fff",
        links: [
          { label: "Company", ariaLabel: "About Company", href: "" },
          { label: "Careers", ariaLabel: "About Careers", href: "" },
        ],
      },
      {
        label: "Projects",
        bgColor: "#170D27",
        textColor: "#fff",
        links: [
          { label: "Featured", ariaLabel: "Featured Projects", href: "" },
          {
            label: "Case Studies",
            ariaLabel: "Project Case Studies",
            href: "",
          },
        ],
      },
      {
        label: "Contact",
        bgColor: "#271E37",
        textColor: "#fff",
        links: [
          { label: "Email", ariaLabel: "Email us", href: "" },
          { label: "Twitter", ariaLabel: "Twitter", href: "" },
          { label: "LinkedIn", ariaLabel: "LinkedIn", href: "" },
        ],
      },
    ];

  return (
    <>
      <div className="     fixed top-0 left-0 w-full z-50">
        <CardNav
          logo={logo}
          logoAlt="Company Logo"
          items={items}
          baseColor="#fff"
          menuColor="#000"
          buttonBgColor="#111"
          buttonTextColor="#fff"
          ease="power3.out"
          theme="light"
        />
      </div>
    </>
  );
}
