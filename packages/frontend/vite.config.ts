import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { gracefulShutdownPlugin } from './shutdown-plugin';
import { visualizer } from 'rollup-plugin-visualizer';
import fs from 'fs';
import { resolve } from 'path';

// ⚠️ CRITICAL: PORT LOCKING CONFIGURATION ⚠️
// Frontend port is locked to 5173 to prevent conflicts and duplicate instances
// Do NOT change this port without updating:
// - backend/.env (CORS_ORIGIN)
// - package.json scripts
// - Docker configurations
// - CI/CD pipelines
// - Documentation

const FRONTEND_PORT = 5173; // 🔒 LOCKED - Frontend Dev Server (never change)

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, process.cwd(), 'VITE_');

  // Backend API target - default to local backend for development
  // For production, set VITE_API_PROXY_TARGET in .env file
  const API_PROXY_TARGET = env.VITE_API_PROXY_TARGET || 'http://localhost:3001';

  return {
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
      host: true, // Listen on all addresses so LAN clients can connect
      strictPort: true, // ✅ CRITICAL: Exit if port is in use (prevents duplicates)
      // SPA fallback - all requests return index.html for client-side routing
      open: false, // Don't open browser automatically
      hmr: {
        overlay: true, // Show error overlay
        // When accessing from a remote browser, 'localhost' resolves to the client machine.
        // Use the server's LAN IP so the browser's HMR WebSocket reaches the dev server.
        host: '192.168.1.13',
        port: 5174,
        protocol: 'ws',
      },
      watch: {
        usePolling: false, // Use native FS events (polling caused infinite HMR reload loops on Windows)
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
          target: API_PROXY_TARGET,
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
            // Core React ecosystem
            'react-vendor': ['react', 'react-dom', 'react-router-dom'],
            // Data fetching
            'query-vendor': ['@tanstack/react-query'],
            // Charts (large library ~200KB)
            'recharts-vendor': ['recharts'],
            // Date utilities
            'date-fns-vendor': ['date-fns'],
            // State management
            'zustand-vendor': ['zustand'],
            // Shared utilities
            'shared-vendor': ['@opsui/shared'],
          },
        },
      },
    },
    optimizeDeps: {
      include: ['react', 'react-dom', 'react-router-dom', '@tanstack/react-query', '@opsui/shared'],
      force: false, // Don't force optimization on every start
    },
  };
});
