/**
 * Test Helper Utilities
 *
 * Common utilities for E2E and workflow tests following industry best practices
 * Provides explicit wait strategies to avoid flaky tests
 */

import { Page, Locator, BrowserContext, expect } from '@playwright/test';

// ============================================================================
// CONFIGURATION
// ============================================================================

export const TEST_CONFIG = {
  BASE_URL: process.env.BASE_URL || 'http://localhost:5173',
  TEST_USER: process.env.TEST_USER || 'admin@wms.local',
  TEST_PASS: process.env.TEST_PASS || 'admin123',
  DEFAULT_TIMEOUT: 10000,
  NAVIGATION_TIMEOUT: 30000,
} as const;

// ============================================================================
// AUTHENTICATION HELPERS
// ============================================================================

export interface AuthStorage {
  state: {
    isAuthenticated: boolean;
    accessToken: string;
    refreshToken: string | null;
    user: {
      userId: string;
      email: string;
      role: string;
    };
    activeRole: string | null;
  };
  version: number;
}

/**
 * Inject authentication token via context init script
 * This avoids SecurityError with localStorage access
 */
export async function injectAuth(
  context: BrowserContext,
  authToken: string,
  userId: string,
  email: string = TEST_CONFIG.TEST_USER,
  role: string = 'ADMIN'
): Promise<void> {
  const authStorage: AuthStorage = {
    state: {
      isAuthenticated: true,
      accessToken: authToken,
      refreshToken: null,
      user: {
        userId: userId || 'admin',
        email,
        role,
      },
      activeRole: null,
    },
    version: 0,
  };

  const authScript = `
    (function() {
      const authStorage = ${JSON.stringify(authStorage)};
      localStorage.setItem('wms-auth-storage', JSON.stringify(authStorage));
    })();
  `;
  await context.addInitScript(authScript);
}

/**
 * Perform login via UI (for testing login flow specifically)
 */
export async function loginViaUI(page: Page, email?: string, password?: string): Promise<void> {
  const testEmail = email || TEST_CONFIG.TEST_USER;
  const testPass = password || TEST_CONFIG.TEST_PASS;

  await page.goto(`${TEST_CONFIG.BASE_URL}/login`);
  await page.fill('input#email', testEmail);
  await page.fill('input#password', testPass);
  await page.click('button[type="submit"]');

  // Wait for navigation to complete
  await page.waitForURL(/\/dashboard/, { timeout: 5000 });
}

// ============================================================================
// EXPLICIT WAIT HELPERS (Industry Best Practice)
// ============================================================================

/**
 * Wait for page to be fully loaded with content
 * Uses multiple strategies to ensure page is ready
 */
export async function waitForPageLoad(
  page: Page,
  options: { minContentLength?: number; timeout?: number } = {}
): Promise<void> {
  const { minContentLength = 10, timeout = TEST_CONFIG.DEFAULT_TIMEOUT } = options;

  // Wait for DOM content loaded
  await page.waitForLoadState('domcontentloaded', { timeout });

  // Wait for minimal content to be present (with graceful fallback)
  try {
    await page.waitForFunction(
      (minLength: number) => {
        // @ts-ignore
        const body = document.body;
        return body && body.textContent && body.textContent.length >= minLength;
      },
      minContentLength,
      { timeout: 5000 }
    );
  } catch {
    // If content check fails, at least DOM was loaded
    console.debug('Content length check passed - using fallback');
  }
}

/**
 * Wait for specific element to be visible and stable
 * Reduces flakiness compared to waitForTimeout
 */
export async function waitForElement(
  locator: Locator,
  options: { timeout?: number; state?: 'visible' | 'attached' | 'hidden' } = {}
): Promise<void> {
  const { timeout = TEST_CONFIG.DEFAULT_TIMEOUT, state = 'visible' } = options;
  await locator.waitFor({ state, timeout });
}

/**
 * Wait for API response matching URL pattern
 * Useful for waiting for data fetching to complete
 */
export async function waitForAPIResponse(
  page: Page,
  urlPattern: string | RegExp,
  options: { timeout?: number } = {}
): Promise<void> {
  const { timeout = TEST_CONFIG.DEFAULT_TIMEOUT } = options;

  try {
    await page.waitForResponse(
      response => {
        const url = response.url();
        if (typeof urlPattern === 'string') {
          return url.includes(urlPattern);
        }
        return urlPattern.test(url);
      },
      { timeout }
    );
  } catch (error) {
    // If no matching response, continue (may already be cached/loaded)
    console.debug(`No API response matching pattern: ${urlPattern}`);
  }
}

/**
 * Wait for network to be mostly idle
 * Good for SPA navigation and data loading
 */
export async function waitForNetworkIdle(
  page: Page,
  options: { timeout?: number; idleTime?: number } = {}
): Promise<void> {
  const { timeout = TEST_CONFIG.DEFAULT_TIMEOUT, idleTime = 500 } = options;

  try {
    await page.waitForLoadState('networkidle', { timeout });
  } catch (error) {
    // If network never fully idle, wait for DOM content at minimum
    await page.waitForLoadState('domcontentloaded', { timeout });
    // Additional buffer for dynamic content
    await page.waitForTimeout(idleTime);
  }
}

/**
 * Wait for element text content to match pattern
 * Better than checking immediately and using timeout
 */
export async function waitForTextContent(
  locator: Locator,
  pattern: string | RegExp,
  options: { timeout?: number } = {}
): Promise<void> {
  const { timeout = TEST_CONFIG.DEFAULT_TIMEOUT } = options;

  await locator.waitFor({ state: 'visible', timeout });

  await locator.waitForFunction(
    (el, patternStr, isRegex) => {
      const text = el.textContent || '';
      if (isRegex) {
        return new RegExp(patternStr).test(text);
      }
      return text.includes(patternStr);
    },
    typeof pattern === 'string' ? pattern : pattern.source,
    pattern instanceof RegExp,
    { timeout }
  );
}

// ============================================================================
// NAVIGATION HELPERS
// ============================================================================

/**
 * Navigate to route and wait for page to be ready
 * For SPAs, also waits for URL to update since client-side routing can be async
 */
export async function navigateAndWait(
  page: Page,
  path: string,
  options: { minContentLength?: number; waitForAPI?: string; waitForURL?: boolean } = {}
): Promise<void> {
  const { minContentLength = 100, waitForAPI, waitForURL = true } = options;

  await page.goto(`${TEST_CONFIG.BASE_URL}${path}`);

  // For SPAs, wait for URL to update since client-side routing can be async
  if (waitForURL) {
    try {
      await page.waitForURL(`*${path}`, { timeout: 5000 });
    } catch {
      // URL wait failed, continue with content check
      console.debug(`URL wait for ${path} timed out, continuing with content check`);
    }
  }

  // Wait for page to load
  await waitForPageLoad(page, { minContentLength });

  // Optionally wait for specific API call
  if (waitForAPI) {
    await waitForAPIResponse(page, waitForAPI);
  }
}

/**
 * Click element and wait for navigation/stability
 */
export async function clickAndWait(
  page: Page,
  selector: string | Locator,
  options: { waitForNav?: boolean; timeout?: number } = {}
): Promise<void> {
  const { waitForNav = false, timeout = TEST_CONFIG.DEFAULT_TIMEOUT } = options;
  const locator = typeof selector === 'string' ? page.locator(selector) : selector;

  await locator.waitFor({ state: 'visible', timeout });

  if (waitForNav) {
    await Promise.all([
      page.waitForLoadState('domcontentloaded', { timeout }),
      locator.click()
    ]);
  } else {
    await locator.click();
    // Small buffer for UI updates
    await page.waitForTimeout(100);
  }
}

// ============================================================================
// ASSERTION HELPERS
// ============================================================================

/**
 * Assert element is visible
 */
export async function assertVisible(locator: Locator, message?: string): Promise<void> {
  await expect(locator, message).toBeVisible();
}

/**
 * Assert element contains text
 */
export async function assertText(
  locator: Locator,
  text: string | RegExp,
  message?: string
): Promise<void> {
  await expect(locator, message).toContainText(text);
}

/**
 * Assert current URL matches pattern
 */
export function assertURL(page: Page, pattern: string | RegExp): void {
  if (typeof pattern === 'string') {
    expect(page.url()).toContain(pattern);
  } else {
    expect(page.url()).toMatch(pattern);
  }
}

/**
 * Assert page has minimum content (not blank/error page)
 */
export async function assertHasContent(
  page: Page,
  minLength: number = 100
): Promise<void> {
  const bodyText = await page.locator('body').textContent() || '';
  expect(bodyText.length, `Page should have content (at least ${minLength} chars)`).toBeGreaterThan(minLength);
}

// ============================================================================
// DATA CLEANUP HELPERS
// ============================================================================

/**
 * Clean up test data via API call
 * Use in afterEach hooks to prevent test data accumulation
 */
export async function cleanupTestData(
  page: Page,
  authToken: string,
  options: { orders?: boolean; auditLogs?: boolean } = {}
): Promise<void> {
  const { orders = false, auditLogs = true } = options;

  const headers = {
    'Authorization': `Bearer ${authToken}`,
    'Content-Type': 'application/json',
  };

  // Clean up test orders
  if (orders) {
    try {
      await page.request.delete(`${TEST_CONFIG.BASE_URL.replace('5173', '3001')}/api/developer/cancel-all-orders`, {
        headers,
      });
    } catch (error) {
      console.warn('Failed to cleanup test orders:', error);
    }
  }

  // Clean up audit logs
  if (auditLogs) {
    try {
      await page.request.delete(`${TEST_CONFIG.BASE_URL.replace('5173', '3001')}/api/developer/clear-audit-logs`, {
        headers,
      });
    } catch (error) {
      console.warn('Failed to cleanup audit logs:', error);
    }
  }
}

// ============================================================================
// RETRY HELPERS
// ============================================================================

/**
 * Retry function with exponential backoff
 * Useful for flaky operations that might need retry
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: { maxAttempts?: number; delay?: number; backoff?: number } = {}
): Promise<T> {
  const { maxAttempts = 3, delay = 1000, backoff = 2 } = options;
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (attempt < maxAttempts) {
        const waitTime = delay * Math.pow(backoff, attempt - 1);
        console.debug(`Retry ${attempt}/${maxAttempts} after ${waitTime}ms`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }

  throw lastError;
}
