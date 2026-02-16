import { AnimatedThemeToggler } from '@/components/ui/animated-theme-toggler';
import { Globe } from '@/components/ui/globe';
import { WordRotate } from '@/components/ui/word-rotate';
import React from 'react'
import { Outlet } from 'react-router-dom'

export default function AuthLayout() {
  return (
    <div>
      <AnimatedThemeToggler />
      <WordRotate words={["LOQTA", "ZONE"]} />
      <Globe />
      <Outlet />
    </div>
  );
}
