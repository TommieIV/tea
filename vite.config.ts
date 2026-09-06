import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['tea_fav.png'],
      manifest: {
        name: 'TEA',
        short_name: 'TEA',
        description: 'A modular workspace platform.',
        theme_color: '#b5121b',
        background_color: '#fff8f8',
        display: 'standalone',
        start_url: '/',
        icons: [
          {
            src: 'tea_fav.png',
            sizes: '1254x1254',
            type: 'image/png',
            purpose: 'any',
          },
        ],
      },
      workbox: {
        navigateFallback: '/index.html',
        globPatterns: ['**/*.{js,css,html,svg,ico,png,webp}'],
      },
    }),
  ],
})
