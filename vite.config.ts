import path from "path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

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
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ["console.info", "console.debug", "console.warn"],
      },
    } as any,

    rollupOptions: {
      output: {
        manualChunks(id: string) {
          // Firebase — keep all firebase/* together, it's tightly coupled
          if (
            id.includes("node_modules/firebase") ||
            id.includes("node_modules/@firebase")
          ) {
            return "firebase";
          }
          // Material UI + Emotion (peer dep)
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
          // React core — tiny but on the critical path, isolate for caching
          if (
            id.includes("node_modules/react-dom") ||
            id.includes("node_modules/react/") ||
            id.includes("node_modules/scheduler")
          ) {
            return "react";
          }
          // React Router
          if (
            id.includes("node_modules/react-router") ||
            id.includes("node_modules/@remix-run")
          ) {
            return "router";
          }
          // Axios / HTTP
          if (id.includes("node_modules/axios")) {
            return "axios";
          }
          // date / number utils
          if (
            id.includes("node_modules/date-fns") ||
            id.includes("node_modules/dayjs") ||
            id.includes("node_modules/moment")
          ) {
            return "date-utils";
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