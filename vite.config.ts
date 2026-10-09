import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import { AUDIO_CACHE, RUNTIME_CACHE } from "./src/offline/cacheName.ts";

/**
 * GitHub Pages serves this repo at https://ankitshahy-crypto.github.io/Kids-app/
 * so built asset URLs must start with /Kids-app/.
 * The installed iPhone app sets VITE_BASE=./ (see npm run ios:sync) so the
 * Capacitor WebView can load those same files from disk.
 */
const base = process.env.VITE_BASE || "/Kids-app/";

function navigationAllowlist(appBase: string): RegExp[] {
  if (appBase.startsWith(".")) return [/^\/.*/];
  const stem = (appBase.endsWith("/") ? appBase : `${appBase}/`).replace(/\/$/, "");
  const escaped = stem.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return [new RegExp(`^${escaped}`)];
}

const allowlist = navigationAllowlist(base);

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "prompt",
      injectRegister: null,
      // The shell only. Sound clips are fetched into the runtime cache by the
      // offline download, once a child exists, so a first visit is quick.
      includeAssets: ["favicon.svg", "icons/*.png"],
      manifest: {
        name: "LittleNest Learning",
        short_name: "LittleNest",
        description: "Reading, math, colors, games and coding, time and money, building, and science for ages 3–7. No ads. Works offline once its lessons are saved on the device.",
        theme_color: "#FBF6EE",
        background_color: "#FBF6EE",
        display: "standalone",
        scope: base,
        start_url: base,
        lang: "en",
        icons: [
          { src: "icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
          { src: "icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
          { src: "icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        // The painted animals (public/animals, WebP) are part of the shell: a face is on every screen.
        globPatterns: ["**/*.{js,css,html,svg,png,webp,webm,mov,ico,woff2,webmanifest}"],
        maximumFileSizeToCacheInBytes: 10 * 1024 * 1024,
        navigateFallback: "index.html",
        navigateFallbackAllowlist: allowlist,
        clientsClaim: true,
        runtimeCaching: [
          // Sound clips first, from their own cache, which is never trimmed:
          // the offline pack is thousands of clips and every one must stay.
          {
            urlPattern: ({ url, request }: { url: URL; request: { method: string; mode: string } }) => {
              if (request.method !== "GET" || request.mode === "navigate") return false;
              const origin = globalThis.location?.origin;
              if (!origin || url.origin !== origin) return false;
              return /\/audio\/[a-z0-9]+(?:\/[a-z0-9-]+)*\.mp3$/.test(url.pathname);
            },
            handler: "CacheFirst",
            options: {
              cacheName: AUDIO_CACHE,
              cacheableResponse: { statuses: [200] },
              matchOptions: { ignoreVary: true },
              rangeRequests: true,
            },
          },
          // Everything else the page loads at run time. This one is trimmed.
          {
            urlPattern: ({ url, request }: { url: URL; request: { method: string; mode: string } }) => {
              if (request.method !== "GET" || request.mode === "navigate") return false;
              const origin = globalThis.location?.origin;
              if (!origin || url.origin !== origin) return false;
              if (url.pathname.endsWith("/sw.js") || url.pathname.endsWith("/dev-sw.js")) return false;
              if (/\/audio\/[a-z0-9]+(?:\/[a-z0-9-]+)*\.mp3$/.test(url.pathname)) return false;
              return true;
            },
            handler: "CacheFirst",
            options: {
              cacheName: RUNTIME_CACHE,
              cacheableResponse: { statuses: [200] },
              matchOptions: { ignoreVary: true },
              expiration: { maxEntries: 500, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
        ],
      },
      devOptions: {
        enabled: true,
        suppressWarnings: true,
        navigateFallback: "index.html",
        navigateFallbackAllowlist: allowlist,
      },
    }),
  ],
  base,
});
