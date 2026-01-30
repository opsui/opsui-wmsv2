/**
 * Standalone auth setup script
 * Creates admin authentication state for Playwright tests
 */

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const AUTH_FILE = path.join(__dirname, 'playwright', '.auth', 'admin.json');
const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';

async function setupAuth() {
  console.log('🔐 Starting authentication setup...');
  console.log(`   Base URL: ${BASE_URL}`);

  // Create auth directory if it doesn't exist
  const authDir = path.dirname(AUTH_FILE);
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
    console.log(`   Created directory: ${authDir}`);
  }

  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Navigate to login page
    console.log('   Navigating to /login...');
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });

    // Wait for login form
    await page.waitForSelector('input[type="email"], input[placeholder*="email" i]', { timeout: 10000 });
    console.log('   ✓ Login form visible');

    // Fill credentials
    await page.fill('input[type="email"], input[placeholder*="email" i]', 'admin@wms.local');
    await page.fill('input[type="password"], input[placeholder*="password" i]', 'admin123');
    console.log('   ✓ Credentials entered');

    // Submit form
    await page.click('button[type="submit"], button:has-text("Sign In"), button:has-text("Login")');
    console.log('   ✓ Login form submitted');

    // Wait for redirect
    await page.waitForURL(/^(?!.*\/login).*$/, { timeout: 15000 });
    console.log('   ✓ Login successful');

    // Verify auth in localStorage
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
      throw new Error('Authentication failed - no valid auth state in localStorage');
    }

    console.log(`   ✓ Auth verified for user: ${authStorage.state.user?.email || 'admin'}`);

    // Test protected route
    await page.goto(`${BASE_URL}/orders`, { waitUntil: 'domcontentloaded' });
    const currentUrl = page.url();

    if (currentUrl.includes('/login')) {
      throw new Error('Auth failed - redirected to login when accessing /orders');
    }

    console.log('   ✓ Protected route accessible (/orders)');

    // Save auth state
    await context.storageState({ path: AUTH_FILE });
    console.log(`   ✓ Auth state saved to: ${AUTH_FILE}`);

    console.log('\n✅ Authentication setup complete!');
    console.log('   This file will be used by all future Playwright tests.');

  } catch (error) {
    console.error('\n❌ Auth setup failed:', error.message);
    throw error;
  } finally {
    await browser.close();
  }
}

setupAuth().catch(err => {
  console.error(err);
  process.exit(1);
});
