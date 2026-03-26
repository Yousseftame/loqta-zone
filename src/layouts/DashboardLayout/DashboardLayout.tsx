import { Suspense } from "react";
import AdminNavbar from "@/components/AdminNavbar/AdminNavbar";
import Sidebar from "@/components/Sidebar/Sidebar";
import React from "react";
import { Outlet } from "react-router-dom";

// ── Skeleton fallback shown while a lazy admin page is loading ────────────────
function PageSkeleton() {
  return (
    <div className="flex-1 p-8 space-y-4 animate-pulse">
      {/* Top bar skeleton */}
      <div className="h-8 w-1/3 bg-gray-200 rounded-lg" />
      {/* Card row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="h-28 bg-gray-100 rounded-2xl border border-gray-200"
          />
        ))}
      </div>
      {/* Table skeleton */}
      <div className="mt-6 rounded-2xl border border-gray-200 overflow-hidden">
        <div className="h-12 bg-gray-100 border-b border-gray-200" />
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="h-14 bg-white border-b border-gray-100 last:border-0"
          />
        ))}
      </div>
    </div>
  );
}

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
          <Suspense fallback={<PageSkeleton />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  );
}
