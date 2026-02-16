import Footer from '@/components/Footer/Footer'
import Navbar from '@/components/Navbar/Navbar'
import React from 'react'
import { Outlet } from 'react-router-dom'

export default function MainLayout() {
  return (
      <div>
          <Navbar/>
          <Outlet />
          <Footer/>
    </div>
  )
}
