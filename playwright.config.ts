/**
 * Playwright configuration for WMS E2E tests
 *
 * Tests cover:
 * - Business Rules UI (Sprint 3)
 * - Reports & Integrations UI (Sprint 4)
 * - WebSocket Real-time Updates (Sprint 5)
 * - Route Optimization & ML APIs (Sprint 6)
 */

import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  // Test directory
  testDir: './e2e',
  testMatch: ['*.spec.ts'],

  // Fully parallel test execution
  fullyParallel: true,

  // CI settings
  forbidOnly: !!process.env.CI,

  // Retry on failure
  retries: process.env.CI ? 2 : 0,

  // Workers - use 1/4 of available CPUs
  workers: process.env.CI ? 2 : undefined,

  // Reporter configuration
  reporter: [
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['json', { outputFile: 'playwright-report/results.json' }],
    ['list'],
  ],

  // Output directory for test artifacts
  outputDir: 'test-results',

  // Global settings
  use: {
    // Base URL for tests
    baseURL: process.env.BASE_URL || 'http://localhost:5173',

    // Test mode - bypass authentication when enabled
    storageState: process.env.TEST_MODE === 'true' ? undefined : 'playwright/.auth/admin.json',

    // Trace collection on failure
    trace: 'retain-on-failure',

    // Screenshot on failure
    screenshot: 'only-on-failure',

    // Video recording
    video: 'retain-on-failure',

    // Timeout settings
    actionTimeout: 10000,
    navigationTimeout: 30000,

    // Viewport size
    viewport: { width: 1280, height: 720 },

    // Ignore HTTPS errors for local dev
    ignoreHTTPSErrors: true,

    // Accept downloads
    acceptDownloads: true,
  },

  // Test timeout (per test)
  timeout: 60 * 1000, // 60 seconds per test

  // Expect timeout
  expect: {
    timeout: 10000,
  },

  // Projects
  projects: [
    // Setup project - runs before tests to establish authentication
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
    },
    // Main test project
    {
      name: 'chromium',
      dependencies: ['setup'],
      use: {
        ...devices['Desktop Chrome'],
      },
    },
  ],

  // Web server
  webServer: process.env.SKIP_SERVER ? undefined : {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
