import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import vuetify from 'vite-plugin-vuetify';
import vueI18n from '@intlify/unplugin-vue-i18n/vite';
import { VitePWA } from 'vite-plugin-pwa';

// GitHub Pages serves the app from https://<user>.github.io/<repo>/
const BASE = '/netz-countdown/';

// Same base for dev, build and preview, so local tests use the same URLs as GitHub Pages.
export default defineConfig(() => ({
  base: BASE,
  plugins: [
    vue(),
    vuetify({ autoImport: true }),
    vueI18n({
      include: [fileURLToPath(new URL('./src/i18n/locales/**', import.meta.url))],
      strictMessage: false
    }),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon-180x180.png'],
      manifest: {
        name: 'Netz Countdown',
        short_name: 'Netz',
        description: 'Countdown to the visible sunrise from your own calendar.',
        lang: 'en',
        display: 'standalone',
        orientation: 'any',
        background_color: '#000000',
        theme_color: '#000000',
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}']
      }
    })
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  server: {
    port: 4173
  }
}));
