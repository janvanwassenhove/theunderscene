import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'

// GitHub Pages serves this repo from https://<user>.github.io/theunderscene/.
// Every asset path — and the PWA scope/start_url — has to agree with that subpath
// or the deployed build breaks while localhost keeps working. Override with
// VITE_BASE=/ when hosting at a domain root.
const base = process.env.VITE_BASE ?? '/theunderscene/'

export default defineConfig({
  base,
  plugins: [
    vue(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons/*.png'],
      manifest: {
        id: base,
        name: 'The Underscene',
        short_name: 'Underscene',
        description:
          'Dig, build and staff an underground record label. A dungeon-management game for your phone.',
        theme_color: '#0d0b10',
        background_color: '#0d0b10',
        display: 'standalone',
        orientation: 'landscape',
        scope: base,
        start_url: base,
        categories: ['games', 'entertainment'],
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'icons/icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // App-shell model: everything the game needs is precached on first load,
        // so no gameplay ever touches the network again.
        globPatterns: ['**/*.{js,css,html,svg,png,woff2,json}'],
        navigateFallback: `${base}index.html`,
        cleanupOutdatedCaches: true,
      },
      devOptions: { enabled: false },
    }),
  ],
  build: {
    target: 'es2020',
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        manualChunks: {
          pixi: ['pixi.js'],
        },
      },
    },
  },
})
