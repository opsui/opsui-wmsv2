import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    // Disable threads for integration tests to avoid DataCloneError with axios
    threads: false,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/mockData/*',
        'src/main.tsx',
        'src/vite-env.d.ts',
        // Exclude integration tests from coverage
        'src/test/integration/**',
      ],
      thresholds: {
        // Set realistic thresholds based on current coverage (as of 2026-02-02)
        // These should be gradually increased as more tests are added
        lines: 17,
        functions: 14,
        branches: 52,
        statements: 17,
      },
    },
    // Exclude integration tests from default test run
    exclude: ['**/integration/**'],
    include: ['src/**/*.{test,spec}.{ts,tsx}', 'tests/**/*.{test,spec}.{ts,tsx}'],
    watchPlugins: ['@vitest/ui/watcher'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@shared': path.resolve(__dirname, '../shared/src'),
    },
  },
});
