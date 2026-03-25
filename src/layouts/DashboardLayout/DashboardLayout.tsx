import AdminNavbar from "@/components/AdminNavbar/AdminNavbar";
import Sidebar from "@/components/Sidebar/Sidebar";
import React from "react";
import { Outlet } from "react-router-dom";

export default function DashboardLayout() {
  return (
    <div
      dir="ltr"
      className="flex h-screen w-full overflow-hidden bg-[#F9FAFB]"
    >
      {/* Sidebar */}
      <Sidebar />

      {/* Right Section */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden">
        {/* Top Navbar */}
        <AdminNavbar />

        {/* Page Content (tables scroll here) */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-6 md:px-8 min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
