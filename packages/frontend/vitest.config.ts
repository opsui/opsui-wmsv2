import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    // Enable threads for faster parallel test execution in CI
    threads: true,
    minThreads: 2,
    maxThreads: 4,
    // Increase timeout for CI environments
    testTimeout: 30000,
    hookTimeout: 30000,
    // Disable isolation to allow parallel execution (state management via beforeEach)
    isolate: false,
    // Use threading for faster execution
    pool: 'threads',
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
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
    },
    // Exclude integration tests from default test run
    exclude: ['**/integration/**'],
    include: ['src/**/*.{test,spec}.{ts,tsx}', 'tests/**/*.{test,spec}.{ts,tsx}'],
    watchPlugins: ['@vitest/ui/watcher'],
    // Limit number of tests running in parallel
    maxConcurrency: 4,
    // Don't run tests in random order (makes debugging easier)
    shuffle: false,
    // Use fake timers to avoid setTimeout hanging
    fakeTimers: {
      global: true,
      shouldClearNativeTimers: true,
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@shared': path.resolve(__dirname, '../shared/src'),
    },
  },
});
