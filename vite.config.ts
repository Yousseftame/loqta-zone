import path from "path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

/**
 * PERFORMANCE FIXES v2:
 *
 * The previous config produced a 913 KB "vendor" chunk because it caught
 * everything not explicitly named. We now explicitly split:
 *
 *   react-core   — react + react-dom (always needed, load first, small-ish)
 *   router       — react-router-dom
 *   motion       — framer-motion / motion (large animation library)
 *   lucide       — lucide-react (icon library, can be huge)
 *   firebase     — firebase SDK (large, stable)
 *   mui          — @mui + @emotion
 *   swiper       — swiper
 *   i18n         — i18next + react-i18next
 *   gsap         — gsap
 *   vendor       — everything else (now much smaller)
 */
export default defineConfig({
  plugins: [react(), tailwindcss()],

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },

  server: {
    host: true,
    port: 5173,
  },

  build: {
    minify: "terser",
    cssCodeSplit: true,
    reportCompressedSize: false,
    chunkSizeWarningLimit: 600,

    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ["console.info", "console.debug", "console.warn"],
        passes: 2,
      },
      mangle: true,
    },

    rollupOptions: {
      output: {
        manualChunks(id: string) {
          // React core — tiny, critical, always cached
          if (
            id.includes("node_modules/react/") ||
            id.includes("node_modules/react-dom/") ||
            id.includes("node_modules/scheduler/")
          ) {
            return "react-core";
          }

          // Router
          if (
            id.includes("node_modules/react-router") ||
            id.includes("node_modules/@remix-run")
          ) {
            return "router";
          }

          // Animation libraries
          if (
            id.includes("node_modules/framer-motion") ||
            id.includes("node_modules/motion")
          ) {
            return "motion";
          }

          // Icon library
          if (id.includes("node_modules/lucide-react")) {
            return "lucide";
          }

          // Firebase
          if (
            id.includes("node_modules/firebase") ||
            id.includes("node_modules/@firebase")
          ) {
            return "firebase";
          }

          // Material UI
          if (
            id.includes("node_modules/@mui") ||
            id.includes("node_modules/@emotion")
          ) {
            return "mui";
          }

          // Swiper
          if (id.includes("node_modules/swiper")) {
            return "swiper";
          }

          // i18n
          if (
            id.includes("node_modules/i18next") ||
            id.includes("node_modules/react-i18next")
          ) {
            return "i18n";
          }

          // GSAP
          if (id.includes("node_modules/gsap")) {
            return "gsap";
          }

          // Everything else — now much smaller
          if (id.includes("node_modules")) {
            return "vendor";
          }
        },
      },
    },
  },
});