import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(),tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 8012,
    proxy: {
      '/api': {
        target: 'http://172.21.31.23:8010',
        changeOrigin: true,
        secure: false
      },
      '/api-token-auth/': {
        target: 'http://172.21.31.23:8010',
        changeOrigin: true,
        secure: false
      },
      '/admin': {
        target: 'http://172.21.31.23:8010',
        changeOrigin: true,
        secure: false
      },
      '/ws/': {
        target: 'ws://172.21.31.23:8010',
        ws: true,
        changeOrigin: true,
        secure: false
      },
      '/media/': {
        target: 'http://172.21.31.23:8010',
        changeOrigin: true,
        secure: false
      },
    }
  }
})
