import { Suspense } from "react";
import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler";
import { Globe } from "@/components/ui/globe";
import { WordRotate } from "@/components/ui/word-rotate";
import { ArrowLeft } from "lucide-react";
import React from "react";
import { Link, Outlet } from "react-router-dom";

export default function AuthLayout() {
  return (
    <div dir="ltr" className="min-h-screen flex">
      {/* ── Desktop-only absolute buttons (hidden on mobile) ── */}
      <div className="hidden lg:block">
        <div className="fixed top-6 right-6 z-50">
          <AnimatedThemeToggler className="w-10 h-10 flex items-center justify-center rounded-lg bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 text-gray-700 dark:text-gray-300" />
        </div>
        <Link
          to="/"
          className="fixed top-6 left-6 z-50 group flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-gray-800 border-2 rounded-lg hover:shadow-xl transition-all duration-300 hover:scale-105 text-gray-700 dark:text-gray-300 hover:border-gray-500 dark:hover:border-gray-400"
        >
          <ArrowLeft className="w-4 h-4 transition-transform duration-300 group-hover:-translate-x-1" />
          <span className="font-medium text-sm">Back to Site</span>
        </Link>
      </div>

      {/* Left Side - Auth Forms */}
      <div
        className="w-full lg:w-1/2 flex flex-col items-center justify-start lg:justify-center p-6 lg:p-8 relative overflow-hidden"
        style={{ backgroundColor: "white" }}
      >
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 via-white to-blue-50/30 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900" />

        {/* Decorative blobs */}
        <div className="absolute top-20 left-10 w-72 h-72 bg-blue-200/20 dark:bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-blue-200/20 dark:bg-blue-500/10 rounded-full blur-3xl" />

        {/* ── Mobile-only top bar (in-flow, not absolute) ── */}
        <div className="lg:hidden relative z-10 w-full flex items-center justify-between mb-6 flex-shrink-0">
          <Link
            to="/"
            className="group flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-lg shadow-sm hover:shadow-md transition-all duration-300 text-gray-700 dark:text-gray-300 hover:border-gray-400"
          >
            <ArrowLeft className="w-4 h-4 transition-transform duration-300 group-hover:-translate-x-1" />
            <span className="font-medium text-sm">Back to Site</span>
          </Link>
          <AnimatedThemeToggler className="w-10 h-10 flex items-center justify-center rounded-lg bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all duration-300 hover:scale-105 text-gray-700 dark:text-gray-300" />
        </div>

        {/* Form content */}
        <div className="relative z-10 w-full max-w-md">
          <Suspense
            fallback={
              <div className="space-y-4 animate-pulse">
                <div className="h-8 w-2/3 bg-gray-200 rounded-lg mx-auto" />
                <div className="h-12 bg-gray-100 rounded-xl" />
                <div className="h-12 bg-gray-100 rounded-xl" />
                <div className="h-12 bg-gray-200 rounded-xl" />
              </div>
            }
          >
            <Outlet />
          </Suspense>
        </div>
      </div>

      {/* Right Side - Globe (desktop only) */}
      <div className="hidden lg:flex lg:w-1/2 items-center justify-center relative overflow-hidden bg-gradient-to-br from-gray-900 via-gray-800 to-black dark:from-gray-950 dark:via-black dark:to-gray-900">
        {/* Grid pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:50px_50px]" />

        {/* Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-500/20 rounded-full blur-[120px]" />
        <div className="absolute top-1/4 right-1/4 w-[400px] h-[400px] bg-blue-500/10 rounded-full blur-[100px]" />

        {/* Word Rotate */}
        <div className="absolute top-12 left-1/2 -translate-x-1/2 z-20">
          <WordRotate
            words={["LOQTA", "ZONE"]}
            className="text-5xl font-bold text-white"
          />
        </div>

        {/* Globe */}
        <div className="relative w-full h-full flex items-center justify-center">
          <div className="relative w-[600px] h-[600px]">
            <Globe className="w-full h-full" />
          </div>
        </div>

        {/* Bottom text */}
        <div className="absolute bottom-12 left-1/2 -translate-x-1/2 text-center">
          <p className="text-white/60 text-sm">Connect with the world</p>
        </div>
      </div>
    </div>
  );
}
