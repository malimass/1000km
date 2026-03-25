import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    VitePWA({
      registerType: "autoUpdate",
      // Forza il reload immediato della pagina quando è disponibile una nuova versione.
      // Senza questo, Android tende a tenere in cache la versione precedente.
      injectRegister: "auto",
      workbox: {
        skipWaiting: true,
        clientsClaim: true,
        // Tutte le richieste di navigazione ricevono sempre index.html fresco
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/api\//, /^\/assets\//, /\.pdf$/],
        // I file JS/CSS in /assets/ scadono dopo 1 giorno max
        runtimeCaching: [
          {
            urlPattern: /\/assets\/.*\.(js|css)$/,
            handler: "NetworkFirst",
            options: {
              cacheName: "js-css-cache",
              expiration: { maxEntries: 100, maxAgeSeconds: 86400 },
              networkTimeoutSeconds: 3,
            },
          },
        ],
      },
      includeAssets: ["favicon.ico", "apple-touch-icon.png", "icon-512.png"],
      manifest: {
        name: "1000km di Gratitudine",
        short_name: "1000km",
        description: "Cammino solidale Bologna-Calabria 2026",
        theme_color: "#ffffff",
        background_color: "#ffffff",
        display: "standalone",
        orientation: "portrait",
        scope: "/",
        start_url: "/",
        icons: [
          {
            src: "apple-touch-icon.png",
            sizes: "180x180",
            type: "image/png",
          },
          {
            src: "icon-512.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
    }),
  ].filter(Boolean),
  // Esclude i plugin Capacitor nativi dall'ottimizzazione Vite/PWA.
  // @capacitor-community/background-geolocation è solo codice nativo (iOS/Android)
  // e non ha un entry point JS valido — bundlarlo causa build failure su web/Vercel.
  optimizeDeps: {
    exclude: ["@capacitor-community/background-geolocation"],
  },
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      external: ["@capacitor-community/background-geolocation"],
      output: {
        manualChunks: {
          // Librerie UI React core
          "vendor-react": ["react", "react-dom", "react-router-dom"],
          // Grafici (recharts è la voce più pesante del Coach)
          "vendor-charts": ["recharts"],
          // Mappe (leaflet + react-leaflet)
          "vendor-maps": ["leaflet", "react-leaflet"],
        },
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
