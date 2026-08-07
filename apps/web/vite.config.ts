import { defineConfig, loadEnv } from 'vite';
import viteReact from '@vitejs/plugin-react';
import { tanstackRouter } from '@tanstack/router-plugin/vite';
import { resolve } from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
  // Load env vars (loadEnv with prefix removes the prefix from keys)
  const env = loadEnv(mode, process.cwd(), '');

  // Empty means same-origin, so API calls are relative. That is correct in dev
  // (Vite proxies /api and /storage) and in production (the backend serves this
  // bundle itself). Only set VITE_BACKEND_URL when the API really is on another
  // origin — and note it is inlined at build time, so it cannot be changed later
  // without rebuilding.
  const defaultEnv = {
    VITE_BACKEND_URL: mode === 'development' ? '' : (env.VITE_BACKEND_URL ?? ''),
    BUILD_OUT_DIR: env.BUILD_OUT_DIR || './dist',
    SERVER_ORIGIN: env.SERVER_ORIGIN || 'http://localhost:5173',
    ANALAYZE_BUNDLE: env.ANALAYZE_BUNDLE || false,
  };

  return {
    define: {
      'import.meta.env.VITE_BACKEND_URL': JSON.stringify(defaultEnv.VITE_BACKEND_URL),
      'import.meta.env.BUILD_OUT_DIR': JSON.stringify(defaultEnv.BUILD_OUT_DIR),
      'import.meta.env.SERVER_ORIGIN': JSON.stringify(defaultEnv.SERVER_ORIGIN),
      'import.meta.env.ANALAYZE_BUNDLE': JSON.stringify(defaultEnv.ANALAYZE_BUNDLE),
    },
    plugins: [
      tanstackRouter({
        autoCodeSplitting: true,
      }),
      viteReact(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        workbox: {
          maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
          globIgnores: ['**/*.html'],
          navigateFallbackDenylist: [/^\/$/, /^\/home/, /^\/sign-in/, /^\/try-demo/],
          navigateFallback: null,
        },
        includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'logo.png', 'logo.webp'],
        manifest: {
          name: 'Wordy',
          short_name: 'Wordy',
          description: 'Centralized platform for students to manage educational information',
          theme_color: '#000000',
          background_color: '#ffffff',
          display: 'standalone',
          scope: '/',
          start_url: '/',
          icons: [
            {
              src: 'logo.png',
              sizes: 'any',
              type: 'image/png',
            },
            {
              src: 'logo.webp',
              sizes: 'any',
              type: 'image/webp',
            },
          ],
        },
      }),
    ],
    optimizeDeps: {
      rolldownOptions: {
        output: {
          strictExecutionOrder: true,
          codeSplitting: {
            groups: [
              {
                test: (id) => id.includes('icons'),
                name: 'icons',
              },
            ],
          },
        },
      },
    },
    build: {
      rolldownOptions: {
        output: {
          strictExecutionOrder: true,
          codeSplitting: {
            groups: [
              {
                test: (id) => id.includes('icons'),
                name: 'icons',
              },
            ],
          },
        },
      },
    },
    server: {
      port: 5173,
      strictPort: true,
      allowedHosts: ['wordyme.test'],
      proxy: {
        '/api': { target: 'http://localhost:3000', changeOrigin: true },
        '/storage': { target: 'http://localhost:3000', changeOrigin: true },
        // Socket.io connects to the current origin, because VITE_BACKEND_URL is
        // forced empty in development (above) so that nothing bakes a hostname
        // into a production bundle. Without this entry the handshake reaches
        // Vite, falls through to the SPA fallback, and the client is handed
        // index.html where it expects an Engine.IO packet — so it fails and
        // retries every few seconds, forever.
        //
        // ws: true is not optional. The handshake advertises
        // `upgrades: ["websocket"]`, so the transport switches immediately
        // afterwards, and the upgrade fails without it even once polling works.
        //
        // Production needs no equivalent: the backend serves the web bundle and
        // the socket from one origin, which is why this only ever broke locally.
        '/socket.io': { target: 'http://localhost:3000', changeOrigin: true, ws: true },
      },
    },
    preview: {
      port: 5173,
      strictPort: true,
    },
    resolve: {
      alias: {
        '@': resolve(__dirname, './src'),
      },
    },
  };
});
