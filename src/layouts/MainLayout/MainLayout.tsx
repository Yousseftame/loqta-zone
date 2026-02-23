import Footer from '@/components/Footer/Footer'
import Navbar from '@/components/Navbar/Navbar'
import NavigateTop from '@/components/shared/NavigateTop';
import ScrollToTop from '@/components/shared/ScrollToTop';
import React from 'react'
import { Outlet } from 'react-router-dom'

export default function MainLayout() {
  return (
    <div>
      <div className="min-h-screen flex flex-col bg-background">
        
        <Navbar />
        <main className="flex-1 w-full">
          <NavigateTop/>
          <Outlet />
        </main>
        <Footer />
      </div>
      <ScrollToTop/>
    </div>
    
  );
}
