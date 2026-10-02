import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/auth': { target: 'http://localhost:5000', changeOrigin: true },
      '/cases': { target: 'http://localhost:5000', changeOrigin: true },
      '/documents': { target: 'http://localhost:5000', changeOrigin: true },
      '/ledger': { target: 'http://localhost:5000', changeOrigin: true },
      '/search': { target: 'http://localhost:5000', changeOrigin: true },
      '/shares': { target: 'http://localhost:5000', changeOrigin: true },
      '/custody': { target: 'http://localhost:5000', changeOrigin: true },
      '/deadlines': { target: 'http://localhost:5000', changeOrigin: true },
      '/transfers': { target: 'http://localhost:5000', changeOrigin: true },
      '/ndso': { target: 'http://localhost:5000', changeOrigin: true },
      '/audit': { target: 'http://localhost:5000', changeOrigin: true },
      '/reports': { target: 'http://localhost:5000', changeOrigin: true },
      '/public': { target: 'http://localhost:5000', changeOrigin: true },
      '/esign': { target: 'http://localhost:5000', changeOrigin: true },
    }
  }
})
