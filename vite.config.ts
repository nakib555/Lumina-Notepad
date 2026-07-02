import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  resolve: {
    tsconfigPaths: true
  },
  plugins: [
    react({
      // @ts-expect-error missing type
      babel: {
        plugins: [
          ["babel-plugin-react-compiler"]
        ]
      }
    }), 
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: false,
      includeAssets: ['logo.svg', 'favicon.ico', 'robots.txt', 'apple-touch-icon.png'],
      manifest: {
        name: 'Lumina Notes',
        short_name: 'Lumina',
        description: 'A premium, minimal markdown note-taking app.',
        theme_color: '#6366F1',
        background_color: '#ffffff',
        display: 'standalone',
        icons: [
          {
            src: 'logo.svg',
            sizes: '192x192',
            type: 'image/svg+xml'
          },
          {
            src: 'logo.svg',
            sizes: '512x512',
            type: 'image/svg+xml'
          },
          {
            src: 'logo.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        maximumFileSizeToCacheInBytes: 20000000,
        clientsClaim: true,
        skipWaiting: true
      }
    })
  ],
  esbuild: {
    drop: ['console', 'debugger'],
  },
  build: {
    target: 'esnext',
    cssCodeSplit: true,
    chunkSizeWarningLimit: 10000,
    minify: 'esbuild',
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom')) {
              return 'vendor';
            }
            if (id.includes('@excalidraw')) {
              return 'excalidraw';
            }
            if (id.includes('marked') || id.includes('turndown') || id.includes('katex')) {
              return 'markdown';
            }
            if (id.includes('react-syntax-highlighter') || id.includes('highlight.js')) {
              return 'highlight';
            }
            if (id.includes('motion')) {
              return 'motion';
            }
            if (id.includes('@capacitor')) {
              return 'capacitor';
            }
          }
        }
      }
    }
  }
})
