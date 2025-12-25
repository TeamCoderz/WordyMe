import { defineConfig } from 'vite';
import viteReact from '@vitejs/plugin-react';
import { tanstackRouter } from '@tanstack/router-plugin/vite';
import { resolve } from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
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
});
