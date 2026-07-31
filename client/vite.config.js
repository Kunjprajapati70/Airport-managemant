import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: false,
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router-dom')) return 'react-vendor';
            if (id.includes('@reduxjs') || id.includes('react-redux')) return 'redux-vendor';
            if (id.includes('recharts')) return 'charts-vendor';
            if (id.includes('react-icons') || id.includes('react-hot-toast')) return 'ui-vendor';
            if (id.includes('socket.io-client')) return 'socket-vendor';
          }
        },
      },
    },
  },
  server: {
    // Dev-only proxy — not used in production build
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
})
