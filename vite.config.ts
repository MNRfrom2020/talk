import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.ico", "apple-touch-icon.png", "mask-icon.svg"],
      manifest: {
        name: "Talk - Audio Streaming",
        short_name: "Talk",
        description: "Your favorite audio content, offline and online.",
        theme_color: "#000000",
        icons: [
          {
            src: "pwa-192x192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg}"],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.origin === self.location.origin,
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "local-assets",
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@admin": path.resolve(__dirname, "./src/admin"),
    },
  },
  server: {
    port: 9002,
    proxy: {
      // Proxy all /api requests to local PHP server
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
      // MNR ID OAuth proxy
      "/mnr-api": {
        target: "https://id.mnr.bd",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/mnr-api/, ""),
      },
    },
  },
});
