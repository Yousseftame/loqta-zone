import AdminNavbar from '@/components/AdminNavbar/AdminNavbar';
import Sidebar from '@/components/Sidebar/Sidebar'
import React from 'react'
import { Outlet } from 'react-router-dom'

export default function DashboardLayout() {
  return (
    <div className="flex h-screen w-screen bg-[#F9FAFB] overflow-hidden">
      {/* Sidebar */}
      <Sidebar />

      {/* Right Section */}
      <div className="flex-1 flex flex-col min-h-screen ">
        {/* Top Navbar */}
        <AdminNavbar />

        {/* Page Content (tables scroll here) */}
        <main className="flex-1 overflow-y-auto px-8 py-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
