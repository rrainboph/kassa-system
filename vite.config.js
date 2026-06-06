import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/', // КРИТИЧЕСКИ ВАЖНО: указывает Vercel искать файлы в корне
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'inline', // Гарантирует регистрацию воркера прямо в HTML
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'] // Кешировать все типы файлов
      },
      manifest: {
        name: 'Kassa System',
        short_name: 'Kassa',
        description: 'Cash accounting manager',
        theme_color: '#09090b',
        background_color: '#09090b',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        icons: [
          {
            src: 'icon-192.png', // Убрали первый слэш для относительного пути в PWA
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'icon-512.png', // Убрали первый слэш
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ]
})