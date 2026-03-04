/**
 * Playwright configuration for ERP E2E tests
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

    // Test mode - bypass authentication by default for local development
    // Set USE_AUTH=true to enable auth file loading
    storageState: process.env.USE_AUTH === 'true' ? 'playwright/.auth/admin.json' : undefined,

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
    // Desktop Chrome (default)
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 },
      },
    },

    // Mobile Device Projects
    {
      name: 'mobile-small',
      use: {
        ...devices['iPhone SE'],
        viewport: { width: 320, height: 568 },
        userAgent:
          'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
      },
    },

    {
      name: 'mobile-standard',
      use: {
        ...devices['iPhone 13'],
        viewport: { width: 375, height: 667 },
      },
    },

    {
      name: 'mobile-android',
      use: {
        ...devices['Pixel 5'],
        viewport: { width: 360, height: 640 },
      },
    },

    // Tablet Projects
    {
      name: 'tablet-portrait',
      use: {
        ...devices['iPad Pro 11'],
        viewport: { width: 768, height: 1024 },
      },
    },

    {
      name: 'tablet-landscape',
      use: {
        ...devices['iPad Pro 11 landscape'],
        viewport: { width: 1024, height: 768 },
      },
    },

    // Desktop Projects
    {
      name: 'desktop-standard',
      use: {
        ...devices['Desktop Chrome HiDPI'],
        viewport: { width: 1440, height: 900 },
      },
    },

    {
      name: 'desktop-large',
      use: {
        viewport: { width: 1920, height: 1080 },
      },
    },

    // Ultra-Wide Monitor
    {
      name: 'ultra-wide',
      use: {
        viewport: { width: 2560, height: 1440 },
      },
    },
  ],

  // Web server
  webServer: process.env.SKIP_SERVER
    ? undefined
    : {
        command: 'cd packages/frontend && npm run dev',
        url: 'http://localhost:5173',
        reuseExistingServer: true,
        timeout: 120000,
      },
});
