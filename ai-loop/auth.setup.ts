/**
 * Authentication Setup for Playwright Tests
 *
 * This setup file performs a ONE-TIME login and saves the authentication state.
 * The saved state is then reused across all test runs via playwright.config.ts.
 *
 * Benefits:
 * - Faster tests (no login on every run)
 * - Fresh tokens on demand
 * - Prevents JWT expiration issues
 * - Industry-standard Playwright pattern
 *
 * Usage:
 *   npx playwright test auth.setup.ts
 *
 * The auth state will be saved to: playwright/.auth/admin.json
 */

import { test as setup, expect } from '@playwright/test';

const AUTH_FILE = 'playwright/.auth/admin.json';

setup('authenticate', async ({ page, context }) => {
  console.log('🔐 Starting authentication setup...');

  // Navigate to login page
  await page.goto('/login');
  console.log('✓ Navigated to login page');

  // Wait for login form to be visible
  await expect(page.locator('input[type="email"], input[placeholder*="email" i]')).toBeVisible();
  await expect(
    page.locator('input[type="password"], input[placeholder*="password" i]')
  ).toBeVisible();
  console.log('✓ Login form is visible');

  // Fill in credentials
  await page.locator('input[type="email"], input[placeholder*="email" i]').fill('admin@wms.local');
  await page.locator('input[type="password"], input[placeholder*="password" i]').fill('admin123');
  console.log('✓ Credentials entered');

  // Submit login form
  await page
    .locator('button[type="submit"], button:has-text("Sign In"), button:has-text("Login")')
    .click();
  console.log('✓ Login form submitted');

  // Wait for successful login - check for redirect away from /login
  await page.waitForURL(/^(?!.*\/login).*$/, { timeout: 10000 });
  console.log('✓ Login successful - redirected from /login');

  // Verify authentication by checking localStorage
  const authStorage = await page.evaluate(() => {
    const stored = localStorage.getItem('wms-auth-storage');
    if (!stored) return null;
    try {
      return JSON.parse(stored);
    } catch {
      return null;
    }
  });

  if (!authStorage || !authStorage.state?.isAuthenticated) {
    throw new Error('❌ Authentication failed: No valid auth state found in localStorage');
  }

  console.log('✓ Authentication state verified in localStorage');
  console.log(`  - User: ${authStorage.state.user?.email || 'N/A'}`);
  console.log(`  - Role: ${authStorage.state.activeRole || 'N/A'}`);
  console.log(`  - Token present: ${!!authStorage.state.accessToken}`);

  // Verify we can access a protected route
  await page.goto('/orders');
  await page.waitForLoadState('networkidle');

  // Check we're not redirected back to login
  const currentUrl = page.url();
  if (currentUrl.includes('/login')) {
    throw new Error('❌ Authentication failed: Redirected to /login when accessing /orders');
  }

  console.log('✓ Protected route access verified (/orders)');

  // Save the authentication state to a file
  await context.storageState({ path: AUTH_FILE });
  console.log(`✓ Authentication state saved to ${AUTH_FILE}`);

  // Create backup with timestamp for easy rollback
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = `playwright/.auth/admin-${timestamp}.json`;
  await context.storageState({ path: backupPath });
  console.log(`✓ Backup created: ${backupPath}`);

  console.log('\n✅ Authentication setup complete!');
  console.log('   This auth state will be reused for all future test runs.');
  console.log('   To refresh: Run this setup again or delete playwright/.auth/admin.json');
});

setup('authenticate-picker', async ({ page, context }) => {
  console.log('🔐 Starting picker authentication setup...');

  await page.goto('/login');

  await page.locator('input[type="email"], input[placeholder*="email" i]').fill('picker@wms.local');
  await page.locator('input[type="password"], input[placeholder*="password" i]').fill('picker123');

  await page
    .locator('button[type="submit"], button:has-text("Sign In"), button:has-text("Login")')
    .click();
  await page.waitForURL(/^(?!.*\/login).*$/, { timeout: 10000 });

  const authStorage = await page.evaluate(() => {
    const stored = localStorage.getItem('wms-auth-storage');
    if (!stored) return null;
    try {
      return JSON.parse(stored);
    } catch {
      return null;
    }
  });

  if (!authStorage || !authStorage.state?.isAuthenticated) {
    throw new Error('❌ Picker authentication failed');
  }

  console.log('✓ Picker authentication verified');

  // Verify picker role
  if (authStorage.state.activeRole !== 'PICKER' && authStorage.state.activeRole !== 'WAREHOUSE') {
    console.warn(
      `⚠️  Warning: Active role is ${authStorage.state.activeRole}, expected PICKER or WAREHOUSE`
    );
  }

  await page.goto('/orders');
  await page.waitForLoadState('networkidle');

  if (page.url().includes('/login')) {
    throw new Error('❌ Picker authentication failed: Redirected to /login');
  }

  await context.storageState({ path: 'playwright/.auth/picker.json' });
  console.log('✓ Picker auth state saved to playwright/.auth/picker.json');
});
