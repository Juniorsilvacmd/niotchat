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
<<<<<<< HEAD
        target: 'http://192.168.100.55:8010',
=======
        target: 'http://172.21.31.23:8010',
>>>>>>> 8c56b62450b45f82237bce9672b2c4bcd20a31e4
        changeOrigin: true,
        secure: false
      },
      '/api-token-auth/': {
<<<<<<< HEAD
        target: 'http://192.168.100.55:8010',
=======
        target: 'http://172.21.31.23:8010',
>>>>>>> 8c56b62450b45f82237bce9672b2c4bcd20a31e4
        changeOrigin: true,
        secure: false
      },
      '/admin': {
<<<<<<< HEAD
        target: 'http://192.168.100.55:8010',
=======
        target: 'http://172.21.31.23:8010',
>>>>>>> 8c56b62450b45f82237bce9672b2c4bcd20a31e4
        changeOrigin: true,
        secure: false
      },
      '/ws/': {
<<<<<<< HEAD
        target: 'ws://192.168.100.55:8010',
=======
        target: 'ws://172.21.31.23:8010',
>>>>>>> 8c56b62450b45f82237bce9672b2c4bcd20a31e4
        ws: true,
        changeOrigin: true,
        secure: false
      },
      '/media/': {
<<<<<<< HEAD
        target: 'http://192.168.100.55:8010',
=======
        target: 'http://172.21.31.23:8010',
>>>>>>> 8c56b62450b45f82237bce9672b2c4bcd20a31e4
        changeOrigin: true,
        secure: false
      },
    }
  }
})
