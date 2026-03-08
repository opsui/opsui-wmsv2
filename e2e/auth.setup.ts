/**
 * Authentication Setup for Playwright Tests
 * Refreshes auth tokens before running tests
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
  await page.locator('button[type="submit"]').click();
  console.log('✓ Login form submitted');

  // Wait for successful login - check for redirect away from /login
  // The redirect might take a bit, also wait for localStorage to be updated
  await page.waitForFunction(
    () => {
      const stored = localStorage.getItem('wms-auth-storage');
      if (!stored) return false;
      try {
        const data = JSON.parse(stored);
        return data.state?.isAuthenticated === true;
      } catch {
        return false;
      }
    },
    { timeout: 20000 }
  );
  console.log('✓ Login successful - auth state stored');

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
  console.log(`  - Token present: ${!!authStorage.state.accessToken}`);

  // Save the authentication state to a file
  await context.storageState({ path: AUTH_FILE });
  console.log(`✓ Authentication state saved to ${AUTH_FILE}`);

  console.log('\n✅ Authentication setup complete!');
});
