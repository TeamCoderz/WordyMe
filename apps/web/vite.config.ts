import { defineConfig, loadEnv } from 'vite';
import viteReact from '@vitejs/plugin-react';
import { tanstackRouter } from '@tanstack/router-plugin/vite';
import { resolve } from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
  // Load env vars (loadEnv with prefix removes the prefix from keys)
  const env = loadEnv(mode, process.cwd(), '');

  // In dev, use empty URL so API goes through the proxy (works for both localhost and wordyme.test). For builds, use env or default.
  const defaultEnv = {
    VITE_BACKEND_URL:
      mode === 'development' ? '' : (env.VITE_BACKEND_URL ?? 'http://localhost:3000'),
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
    optimizeDeps: {
      rolldownOptions: {
        experimental: {
          strictExecutionOrder: true,
        },
        output: {
          advancedChunks: {
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
    build: {
      rollupOptions: {
        experimental: {
          strictExecutionOrder: true,
        },
        output: {
          advancedChunks: {
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
