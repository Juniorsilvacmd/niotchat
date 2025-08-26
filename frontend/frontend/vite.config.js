// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 8012,
    strictPort: true,
    allowedHosts: 'all',         // aceita qualquer host (simplificado)
    cors: true,                  // habilitar CORS
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
      'Access-Control-Allow-Headers': 'X-Requested-With, content-type, Authorization'
    },
    proxy: {
      '/api': {
        target: 'http://192.168.100.55:8010',
        changeOrigin: true,
        secure: false
      },
      '/api-token-auth/': {
        target: 'http://192.168.100.55:8010',
        changeOrigin: true,
        secure: false
      },
      '/admin': {
        target: 'http://192.168.100.55:8010',
        changeOrigin: true,
        secure: false
      },
      '/ws/': {
        target: 'ws://192.168.100.55:8010',
        ws: true,
        changeOrigin: true,
        secure: false
      },
      '/media/': {
        target: 'http://192.168.100.55:8000',
        changeOrigin: true,
        secure: false
      },
    }
  }
})
