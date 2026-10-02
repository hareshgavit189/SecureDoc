import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const apiProxy = {
  target: 'http://localhost:5000',
  changeOrigin: true,
  bypass: (req) => req.headers.accept?.includes('text/html') ? req.url : undefined,
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          charts: ['chart.js', 'react-chartjs-2'],
          bootstrap: ['bootstrap', 'react-bootstrap'],
        },
      },
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/auth': apiProxy,
      '/cases': apiProxy,
      '/documents': apiProxy,
      '/ledger': apiProxy,
      '/search': apiProxy,
      '/shares': apiProxy,
      '/custody': apiProxy,
      '/deadlines': apiProxy,
      '/transfers': apiProxy,
      '/ndso': apiProxy,
      '/audit': apiProxy,
      '/reports': apiProxy,
      '/public': apiProxy,
      '/esign': apiProxy,
    }
  }
})
