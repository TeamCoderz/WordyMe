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
        includeAssets: [
          'favicon.ico',
          'favicon-16x16.png',
          'favicon-32x32.png',
          'apple-touch-icon.png',
          'logo.png',
          'logo.webp',
          'logo192.png',
          'logo512.png',
          'maskable-512.png',
        ],
        manifest: {
          name: 'WordyMe',
          short_name: 'WordyMe',
          description: 'Centralized platform for students to manage educational information',
          theme_color: '#000000',
          background_color: '#ffffff',
          display: 'standalone',
          scope: '/',
          start_url: '/',
          icons: [
            // Declared sizes must match the files. Android needs a real 192px
            // launcher icon and a 512px splash icon; upscaling a smaller file
            // is what made the installed icon look soft.
            {
              src: 'logo192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: 'logo512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any',
            },
            // Maskable icons are cropped to the launcher's shape (circle,
            // squircle, rounded square), so this one keeps the mark inside the
            // safe zone on an opaque background rather than letting Android
            // letterbox the transparent logo into a white tile.
            {
              src: 'maskable-512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
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
