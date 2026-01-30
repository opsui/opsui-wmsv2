/**
 * Generate Playwright Authentication State
 *
 * Run this script to create/refresh the authentication state for tests.
 * Usage: node setup-auth.js
 */

const { chromium } = require('playwright');
const path = require('path');

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';
const AUTH_DIR = path.join(__dirname, 'playwright', '.auth');
const ADMIN_AUTH_FILE = path.join(AUTH_DIR, 'admin.json');
const PICKER_AUTH_FILE = path.join(AUTH_DIR, 'picker.json');

async function setupAuth() {
  console.log('🔐 Starting authentication setup...\n');

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    baseURL: BASE_URL,
    viewport: { width: 1280, height: 720 },
  });

  const page = await context.newPage();

  // Admin authentication
  console.log('--- Setting up Admin Authentication ---');
  await page.goto('/login');
  console.log('✓ Navigated to login page');

  await page.waitForLoadState('networkidle');

  // Try multiple selectors for email field
  const emailSelectors = [
    'input[type="email"]',
    'input[placeholder*="email" i]',
    'input[name="email"]',
    '#email',
  ];

  let emailField = null;
  for (const selector of emailSelectors) {
    try {
      emailField = await page.locator(selector).first();
      await emailField.waitFor({ state: 'visible', timeout: 2000 });
      console.log(`✓ Found email field with selector: ${selector}`);
      break;
    } catch {
      continue;
    }
  }

  if (!emailField) {
    console.error('❌ Could not find email field');
    await browser.close();
    process.exit(1);
  }

  // Try multiple selectors for password field
  const passwordSelectors = [
    'input[type="password"]',
    'input[placeholder*="password" i]',
    'input[name="password"]',
    '#password',
  ];

  let passwordField = null;
  for (const selector of passwordSelectors) {
    try {
      passwordField = await page.locator(selector).first();
      await passwordField.waitFor({ state: 'visible', timeout: 2000 });
      console.log(`✓ Found password field with selector: ${selector}`);
      break;
    } catch {
      continue;
    }
  }

  if (!passwordField) {
    console.error('❌ Could not find password field');
    await browser.close();
    process.exit(1);
  }

  // Fill in admin credentials
  await emailField.fill('admin@wms.local');
  await passwordField.fill('admin123');
  console.log('✓ Credentials entered (admin@wms.local)');

  // Try multiple selectors for submit button
  const submitSelectors = [
    'button[type="submit"]',
    'button:has-text("Sign In")',
    'button:has-text("Login")',
    'button:has-text("Log In")',
    'form button',
  ];

  let submitButton = null;
  for (const selector of submitSelectors) {
    try {
      submitButton = await page.locator(selector).first();
      await submitButton.waitFor({ state: 'visible', timeout: 2000 });
      console.log(`✓ Found submit button with selector: ${selector}`);
      break;
    } catch {
      continue;
    }
  }

  if (!submitButton) {
    console.error('❌ Could not find submit button');
    await browser.close();
    process.exit(1);
  }

  await submitButton.click();
  console.log('✓ Login form submitted');

  // Wait for navigation
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);

  // Check authentication state
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
    console.error('❌ Authentication failed: No valid auth state found');
    console.error('Current URL:', page.url());
    await browser.close();
    process.exit(1);
  }

  console.log('✓ Authentication verified in localStorage');
  console.log(`  - User: ${authStorage.state.user?.email || 'N/A'}`);
  console.log(`  - Role: ${authStorage.state.activeRole || 'N/A'}`);
  console.log(`  - Token present: ${!!authStorage.state.accessToken}`);

  // Verify we can access a protected route
  await page.goto('/orders');
  await page.waitForLoadState('networkidle');

  if (page.url().includes('/login')) {
    console.error('❌ Authentication failed: Redirected to /login when accessing /orders');
    await browser.close();
    process.exit(1);
  }

  console.log('✓ Protected route access verified (/orders)');

  // Save admin auth state
  await context.storageState({ path: ADMIN_AUTH_FILE });
  console.log(`✓ Admin auth state saved to: ${ADMIN_AUTH_FILE}`);

  // Create timestamped backup
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(AUTH_DIR, `admin-${timestamp}.json`);
  await context.storageState({ path: backupPath });
  console.log(`✓ Backup created: ${backupPath}`);

  // Setup picker authentication
  console.log('\n--- Setting up Picker Authentication ---');

  // Create new context for picker
  const pickerContext = await browser.newContext({
    baseURL: BASE_URL,
    viewport: { width: 1280, height: 720 },
  });
  const pickerPage = await pickerContext.newPage();

  await pickerPage.goto('/login');

  const pickerEmailField = pickerPage.locator('input[type="email"], input[placeholder*="email" i]').first();
  const pickerPasswordField = pickerPage.locator('input[type="password"], input[placeholder*="password" i]').first();
  const pickerSubmitButton = pickerPage.locator('button[type="submit"], button:has-text("Sign In")').first();

  await pickerEmailField.fill('picker@wms.local');
  await pickerPasswordField.fill('picker123');
  await pickerSubmitButton.click();

  await pickerPage.waitForLoadState('networkidle');
  await pickerPage.waitForTimeout(2000);

  const pickerAuthStorage = await pickerPage.evaluate(() => {
    const stored = localStorage.getItem('wms-auth-storage');
    if (!stored) return null;
    try {
      return JSON.parse(stored);
    } catch {
      return null;
    }
  });

  if (!pickerAuthStorage || !pickerAuthStorage.state?.isAuthenticated) {
    console.warn('⚠️  Picker authentication failed (optional, admin is primary)');
  } else {
    await pickerContext.storageState({ path: PICKER_AUTH_FILE });
    console.log(`✓ Picker auth state saved to: ${PICKER_AUTH_FILE}`);
  }

  await browser.close();

  console.log('\n✅ Authentication setup complete!');
  console.log('   This auth state will be reused for all future test runs.');
  console.log('   To refresh: Run this script again or delete the auth files.');
}

setupAuth().catch(error => {
  console.error('❌ Authentication setup failed:', error);
  process.exit(1);
});
