import path from "path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

/**
 * PERFORMANCE FIXES:
 *
 * manualChunks — splits the bundle so the browser can cache stable
 * vendor libraries independently from your app code:
 *   • firebase   — large, changes rarely
 *   • mui        — large, changes rarely
 *   • swiper     — medium, changes rarely
 *   • i18n       — medium, changes rarely
 *   • vendor     — everything else from node_modules
 *
 * Without splitting, a single-byte change to your app code busts the
 * cache for the entire ~2 MB bundle. With splitting, only the changed
 * chunk needs to be re-downloaded.
 *
 * minify: "terser" — produces ~15-20% smaller output than esbuild
 * (the Vite default) at the cost of a slightly longer build time.
 *
 * cssCodeSplit — each lazy chunk gets only the CSS it needs, so the
 * initial page doesn't pay for styles from lazy-loaded sections.
 *
 * reportCompressedSize: false — speeds up the build (cosmetic only).
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

    terserOptions: {
      compress: {
        drop_console: true,   // removes all console.log in production
        drop_debugger: true,
        pure_funcs: ["console.info", "console.debug", "console.warn"],
      },
    },

    rollupOptions: {
      output: {
        manualChunks(id: string) {
          // Firebase — keep all firebase/* together, it's tightly coupled
          if (id.includes("node_modules/firebase") || id.includes("node_modules/@firebase")) {
            return "firebase";
          }
          // Material UI
          if (id.includes("node_modules/@mui") || id.includes("node_modules/@emotion")) {
            return "mui";
          }
          // Swiper
          if (id.includes("node_modules/swiper")) {
            return "swiper";
          }
          // i18n
          if (id.includes("node_modules/i18next") || id.includes("node_modules/react-i18next")) {
            return "i18n";
          }
          // GSAP (used in Tact Innovations / SplitText)
          if (id.includes("node_modules/gsap")) {
            return "gsap";
          }
          // Everything else from node_modules
          if (id.includes("node_modules")) {
            return "vendor";
          }
        },
      },
    },
  },
});