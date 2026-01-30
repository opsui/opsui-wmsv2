import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for WMS crawler
 *
 * Industry-standard configuration following Playwright best practices:
 * - Proper output directories
 * - Retry logic for flaky tests
 * - Timeout settings optimized for crawling
 * - Detailed reporting options
 */
export default defineConfig({
  // Test directory
  testDir: './',
  testMatch: ['*.spec.ts'],
  // Setup files for authentication
  testIgnore: ['*.setup.ts'],

  // Fully parallel - but we override to 1 worker for crawler to avoid race conditions
  fullyParallel: false,

  // CI settings
  forbidOnly: !!process.env.CI,

  // Retry on failure (industry standard: 1 retry for CI, 0 for local)
  retries: process.env.CI ? 1 : 0,

  // Workers - limit to 1 for crawler to avoid concurrent login issues
  workers: 1,

  // Reporter configuration
  reporter: [
    [
      'html',
      {
        outputFolder: 'playwright-report',
        open: 'never',
      },
    ],
    ['json', { outputFile: 'playwright-report/results.json' }],
    ['list'],
  ],

  // Output directory for test artifacts
  outputDir: 'test-results',

  // Global settings
  use: {
    // Base URL for tests
    baseURL: process.env.BASE_URL || 'http://localhost:5173',

    // Test mode - set to 'true' to disable authentication requirements
    // The backend must also be started with TEST_MODE=true environment variable
    // Example: TEST_MODE=true npm run dev:backend

    // Reuse authentication state from auth.setup.ts
    // This eliminates the need to login on every test run
    // Note: When TEST_MODE=true, authentication is bypassed entirely
    storageState: process.env.TEST_MODE === 'true' ? undefined : 'playwright/.auth/admin.json',

    // Disable trace collection for crawler (causes file system errors)
    trace: 'off',

    // Disable screenshots for crawler
    screenshot: 'off',

    // Disable video recording for crawler
    video: 'off',

    // Timeout settings (industry standard for crawling)
    actionTimeout: 10000, // 10s for actions
    navigationTimeout: 30000, // 30s for navigation

    // Viewport size
    viewport: { width: 1280, height: 720 },

    // Ignore HTTPS errors (for local dev)
    ignoreHTTPSErrors: true,

    // Accept downloads (may be needed for some pages)
    acceptDownloads: true,

    // Capture console and network logs
    locale: 'en-US',
    timezoneId: 'Pacific/Auckland',
  },

  // Test timeout (per test)
  timeout: 30 * 60 * 1000, // 30 minutes per test (for 100% coverage crawling)

  // Expect timeout
  expect: {
    timeout: 10000,
  },

  // Projects - using Chromium (most stable for crawling)
  projects: [
    // Setup project - runs before tests to establish authentication
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
    },
    // Main crawler project - uses authentication from setup
    {
      name: 'chromium',
      dependencies: ['setup'],
      use: {
        ...devices['Desktop Chrome'],
        // Use bundled Chromium for compatibility
        // (Chrome channel requires Chrome to be installed)
        launchOptions: {
          // Run in headed mode (visible browser) to watch the crawler in action
          headless: false,
          // Slow down actions slightly so you can see what's happening
          slowMo: 200, // 200ms delay between actions
        },
      },
    },
  ],

  // Web server (optional - if you want the crawler to start the server)
  // webServer: {
  //   command: 'npm run dev',
  //   url: 'http://localhost:5173',
  //   reuseExistingServer: !process.env.CI,
  //   timeout: 120000,
  // },
});
