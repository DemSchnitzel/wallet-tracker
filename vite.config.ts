import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

const versionJsonPlugin = {
  name: 'version-json',
  generateBundle() {
    const buildTime = Date.now();
    const d = new Date(buildTime);
    const pad = (n: number) => String(n).padStart(2, '0');
    const defaultVersion = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    const version = process.env.APP_VERSION ?? defaultVersion;
    (this as any).emitFile({
      type: 'asset',
      fileName: 'version.json',
      source: JSON.stringify({ buildTime, version }),
    });
  },
};

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      versionJsonPlugin,
      VitePWA({
        registerType: 'autoUpdate',
        // version.json + changelog.json werden vom SW ausgeschlossen,
        // damit das Update-Detection-System weiterhin funktioniert.
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2,woff,ttf}'],
          navigateFallback: 'index.html',
          // version.json & changelog.json: immer vom Netz holen, Fallback auf Cache
          runtimeCaching: [
            {
              urlPattern: /\/(version|changelog)\.json(\?.*)?$/,
              handler: 'NetworkFirst',
              options: {
                cacheName: 'app-meta',
                networkTimeoutSeconds: 4,
                cacheableResponse: { statuses: [0, 200] },
              },
            },
          ],
        },
        manifest: {
          name: 'Wallet Tracker',
          short_name: 'Wallet',
          description: 'A simple wallet tracker app',
          start_url: '/',
          display: 'standalone',
          background_color: '#09090B',
          theme_color: '#09090B',
          icons: [
            { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
            { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          ],
        },
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            // Schwere Chart-Bibliothek in eigenen Chunk
            'vendor-recharts': ['recharts'],
            // Datum-Utilities
            'vendor-date': ['date-fns'],
            // Icon-Bibliothek
            'vendor-icons': ['@hugeicons/react', '@hugeicons/core-free-icons'],
            // Animation + Carousel
            'vendor-ui': ['motion', 'embla-carousel-react', 'embla-carousel'],
            // UI-Primitives
            'vendor-primitives': ['@base-ui/react', 'sonner', 'react-day-picker', 'next-themes'],
          },
        },
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify - file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
