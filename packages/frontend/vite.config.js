import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { gracefulShutdownPlugin } from './shutdown-plugin';
import { visualizer } from 'rollup-plugin-visualizer';
// ⚠️ CRITICAL: PORT LOCKING CONFIGURATION ⚠️
// Frontend port is locked to 5173 to prevent conflicts and duplicate instances
// Do NOT change this port without updating:
// - backend/.env (CORS_ORIGIN)
// - package.json scripts
// - Docker configurations
// - CI/CD pipelines
// - Documentation
var FRONTEND_PORT = 5173; // 🔒 LOCKED - Frontend Dev Server (never change)
export default defineConfig({
  plugins: [
    react({
      // Fast Refresh is automatically enabled by @vitejs/plugin-react
      // No manual babel configuration needed
    }),
    gracefulShutdownPlugin({
      timeout: 10000, // 10 second shutdown timeout
      logShutdown: true,
    }),
    visualizer({
      open: false,
      gzipSize: true,
      brotliSize: true,
      filename: 'stats.html',
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: FRONTEND_PORT,
    host: true, // Listen on all addresses (0.0.0.0)
    strictPort: true, // ✅ CRITICAL: Exit if port is in use (prevents duplicates)
    // SPA fallback - all requests return index.html for client-side routing
    open: false, // Don't open browser automatically
    hmr: {
      overlay: true, // Show error overlay
      // Use the server's LAN IP so remote browsers can reach the HMR WebSocket
      host: '192.168.1.13',
      port: 5174,
      protocol: 'ws',
    },
    watch: {
      usePolling: false, // Native FS events (polling caused infinite reload loops on Windows)
      ignored: [
        '**/node_modules/**',
        '**/.git/**',
        '**/dist/**',
        '**/coverage/**',
        '**/.vscode/**',
      ],
    },
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        timeout: 60000, // 60 second timeout
        proxyTimeout: 60000, // 60 second proxy timeout
        ws: true, // Proxy WebSocket connections
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'query-vendor': ['@tanstack/react-query'],
        },
      },
    },
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom', '@tanstack/react-query', '@opsui/shared'],
    force: false, // Don't force optimization on every start
  },
});
