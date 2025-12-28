import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': '/src',
    },
  },
  // Build output goes to /app/* path
  base: '/app/',
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      input: 'Z:/ReactCRM/index.html',
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-query': ['@tanstack/react-query'],
          'vendor-forms': ['react-hook-form', '@hookform/resolvers', 'zod'],
        },
      },
    },
    // Warn if chunk exceeds 500KB
    chunkSizeWarningLimit: 500,
  },
  server: {
    port: 5173,
    // Proxy API calls to backend during development
    proxy: {
      // New FastAPI backend (React CRM API v2)
      '/api/v2': {
        target: 'http://localhost:5001',
        changeOrigin: true,
      },
      // Legacy Flask backend (for gradual migration)
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
});
