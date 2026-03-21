import Footer from "@/components/Footer/Footer";
import Navbar from "@/components/Navbar/Navbar";
import NavigateTop from "@/components/shared/NavigateTop";
import NotificationBell from "@/components/shared/Notificationbell";
import PersistentLastOfferGate from "@/components/shared/PersistentLastOfferGate";
import ScrollToTop from "@/components/shared/ScrollToTop";
import { useFCM } from "@/hooks/useFCM";
import React from "react";
import { Outlet } from "react-router-dom";

export default function MainLayout() {
  useFCM(); 
  return (
    <div>
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />
        <main className="flex-1 w-full">
          <NavigateTop />
          <Outlet />
        </main>
        <Footer />
      </div>
      {/* <ScrollToTop /> */}
      <NotificationBell />

      {/*
        Checks once per session whether the user missed submitting a last offer
        on any ended auction. Shows the LastOfferModal silently in the background.
        Renders null when there is nothing to show.
      */}
      <PersistentLastOfferGate />
    </div>
  );
}
