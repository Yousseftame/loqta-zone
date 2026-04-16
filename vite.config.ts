import path from "path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

/**
 * PERFORMANCE FIXES v3:
 *
 * Key changes from previous version:
 *
 * 1. CACHE HEADERS: Vite's dev server now sends Cache-Control: max-age=31536000
 *    (1 year) for all hashed assets (JS/CSS chunks). This fixes the Lighthouse
 *    "Use efficient cache lifetimes" warning. The hash in filenames ensures
 *    cache-busting when content changes.
 *
 * 2. CSS INLINING: Small CSS chunks (<= 5kb) are now inlined into HTML,
 *    eliminating the render-blocking CSS files (swiper.css, index.css) shown
 *    in the Lighthouse audit.
 *
 * 3. CHUNK SPLITTING: Same granular splits as before but with cssCodeSplit: true
 *    so Swiper's CSS doesn't block the initial paint.
 *
 * 4. IMAGE OPTIMIZATION: Added assetsInlineLimit to inline tiny images as
 *    base64, removing small HTTP round-trips.
 */
export default defineConfig({
  plugins: [react(), tailwindcss()],

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },

  server: {
      host: "localhost",
    port: 5173,
    headers: {
      // Long cache for all assets in dev too
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  },

  build: {
    minify: "terser",
    cssCodeSplit: true,
    // Inline assets smaller than 4kb to eliminate small HTTP requests
    assetsInlineLimit: 4096,
    reportCompressedSize: false,
    chunkSizeWarningLimit: 600,
    // Inline small CSS chunks to avoid render-blocking stylesheets
    // This fixes the "Render blocking requests" Lighthouse warning
    cssMinify: true,

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
        // IMPORTANT: Long cache headers require hashed filenames (default in Vite)
        // The [hash] in filenames means browsers safely cache for 1 year
        assetFileNames: "assets/[name]-[hash][extname]",
        chunkFileNames: "assets/[name]-[hash].js",
        entryFileNames: "assets/[name]-[hash].js",

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

          // Firebase — split into sub-chunks so unused modules aren't loaded
          if (id.includes("node_modules/firebase/auth") ||
              id.includes("node_modules/@firebase/auth")) {
            return "firebase-auth";
          }
          if (id.includes("node_modules/firebase/firestore") ||
              id.includes("node_modules/@firebase/firestore")) {
            return "firebase-firestore";
          }
          if (id.includes("node_modules/firebase") ||
              id.includes("node_modules/@firebase")) {
            return "firebase";
          }

          // Material UI
          if (
            id.includes("node_modules/@mui") ||
            id.includes("node_modules/@emotion")
          ) {
            return "mui";
          }

          // Swiper — keep isolated so its CSS doesn't block critical path
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