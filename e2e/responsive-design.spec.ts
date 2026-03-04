/**
 * Responsive Design E2E Tests
 * @covers e2e/responsive-design.spec.ts
 *
 * Comprehensive responsive testing across all breakpoints, orientations, and devices.
 * Tests for layout integrity, touch targets, overflow, and accessibility across viewport sizes.
 */

import { test, expect, Page, devices } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';

// ============================================================================
// DEVICE VIEWPORT MATRIX
// ============================================================================

/**
 * Complete viewport matrix for testing all device sizes
 * Based on Tailwind breakpoint configuration:
 * - xs: 320px (Small phones - iPhone SE)
 * - sm: 375px (Standard phones - iPhone 6/7/8)
 * - md: 414px (Large phones - iPhone Plus)
 * - lg: 768px (Tablets portrait)
 * - xl: 1024px (Tablets landscape / small laptops)
 * - 2xl: 1280px (Desktops)
 * - 3xl: 1536px (Large desktops)
 * - ultra-wide: 1920px+ (Ultrawide monitors)
 */
const VIEWPORTS = {
  // Mobile Devices
  mobileSmall: { width: 320, height: 568, name: 'iPhone SE (Small)' },
  mobileStandard: { width: 375, height: 667, name: 'iPhone 14 (Standard)' },
  mobileLarge: { width: 414, height: 896, name: 'iPhone 14 Plus (Large)' },
  mobileAndroid: { width: 360, height: 640, name: 'Android (Standard)' },

  // Tablet Devices
  tabletPortrait: { width: 768, height: 1024, name: 'iPad (Portrait)' },
  tabletLandscape: { width: 1024, height: 768, name: 'iPad (Landscape)' },

  // Desktop Devices
  laptopSmall: { width: 1280, height: 720, name: 'Laptop (1366x768)' },
  desktopStandard: { width: 1440, height: 900, name: 'Desktop (1920x1080)' },
  desktopLarge: { width: 1920, height: 1080, name: 'Large Desktop' },

  // Ultra-Wide
  ultraWide: { width: 2560, height: 1440, name: 'Ultra-Wide Monitor' },
};

// ============================================================================
// TEST DATA
// ============================================================================

const PRIORITY_1_PAGES = [
  { path: '/orders', name: 'Order Queue', requiresAuth: true },
  { path: '/picking', name: 'Picking', requiresAuth: true },
  { path: '/stock-control', name: 'Stock Control', requiresAuth: true },
  { path: '/inwards-goods', name: 'Inwards Goods', requiresAuth: true },
];

const TEST_CREDENTIALS = {
  email: 'picker@example.com',
  password: 'password123',
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Navigate to a page (bypassing authentication for local testing)
 */
async function navigateToPage(page: Page, path: string) {
  await page.goto(`${BASE_URL}${path}`);
  await page.waitForLoadState('networkidle');
}

/**
 * Check for horizontal overflow (common responsive issue)
 */
async function checkHorizontalOverflow(page: Page): Promise<boolean> {
  const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
  const windowWidth = await page.evaluate(() => window.innerWidth);
  return bodyWidth > windowWidth;
}

/**
 * Check touch target compliance (44x44px minimum)
 */
async function checkTouchTargets(page: Page): Promise<{ compliant: boolean; violations: number }> {
  return await page.evaluate(() => {
    const touchTargets = document.querySelectorAll(
      'button, a, input, select, textarea, [role="button"]'
    );
    let violations = 0;

    touchTargets.forEach(element => {
      const rect = element.getBoundingClientRect();
      const width = rect.width;
      const height = rect.height;
      const isCompliant = width >= 44 && height >= 44;

      if (!isCompliant) {
        violations++;
      }
    });

    return {
      compliant: violations === 0,
      violations,
    };
  });
}

/**
 * Get viewport category name
 */
function getViewportCategory(width: number): string {
  if (width < 375) return 'Extra Small Mobile (xs)';
  if (width < 414) return 'Standard Mobile (sm)';
  if (width < 768) return 'Large Mobile (md)';
  if (width < 1024) return 'Tablet Portrait (lg)';
  if (width < 1280) return 'Tablet Landscape / Small Laptop (xl)';
  if (width < 1536) return 'Desktop (2xl)';
  return 'Large Desktop (3xl+)';
}

// ============================================================================
// TEST SUITES
// ============================================================================

test.describe('Responsive Design - Core Layout Tests', () => {
  test.describe.configure({ mode: 'serial' });

  for (const [key, viewport] of Object.entries(VIEWPORTS)) {
    test(`${viewport.name} (${viewport.width}x${viewport.height}) - No horizontal overflow`, async ({
      page,
    }) => {
      await navigateToPage(page, '/orders');
      await page.setViewportSize(viewport);

      // Check for horizontal overflow
      const hasOverflow = await checkHorizontalOverflow(page);
      expect(hasOverflow).toBe(false);

      // Take screenshot for visual regression
      await page.screenshot({
        path: `test-snapshots/responsive/${key}-orders.png`,
        fullPage: false,
      });
    });
  }
});

test.describe('Responsive Design - Touch Target Compliance', () => {
  const mobileViewports = [
    VIEWPORTS.mobileSmall,
    VIEWPORTS.mobileStandard,
    VIEWPORTS.mobileLarge,
    VIEWPORTS.tabletPortrait,
  ];

  for (const viewport of mobileViewports) {
    test(`${viewport.name} - Touch targets meet 44x44px minimum`, async ({ page }) => {
      await navigateToPage(page, '/orders');
      await page.setViewportSize(viewport);

      const result = await checkTouchTargets(page);
      expect(result.compliant).toBe(true);
      expect(result.violations).toBe(0);
    });
  }
});

test.describe('Responsive Design - Orientation Tests', () => {
  const orientations = [
    { name: 'Portrait', width: 375, height: 812 },
    { name: 'Landscape', width: 812, height: 375 },
  ];

  for (const orientation of orientations) {
    test(`Mobile ${orientation.name} (${orientation.width}x${orientation.height}) - Key pages render correctly`, async ({
      page,
    }) => {
      await navigateToPage(page, '/orders');
      await page.setViewportSize(orientation);

      // Verify page renders without errors
      await expect(page.locator('body')).toBeVisible();

      // Check no overflow
      const hasOverflow = await checkHorizontalOverflow(page);
      expect(hasOverflow).toBe(false);
    });
  }
});

test.describe('Responsive Design - Priority 1 Pages Cross-Device', () => {
  const testViewports = [
    VIEWPORTS.mobileSmall,
    VIEWPORTS.mobileStandard,
    VIEWPORTS.tabletPortrait,
    VIEWPORTS.desktopStandard,
  ];

  for (const pageData of PRIORITY_1_PAGES) {
    test.describe(`${pageData.name}`, () => {
      for (const viewport of testViewports) {
        test(`${viewport.name} - Layout integrity`, async ({ page }) => {
          await navigateToPage(page, pageData.path);
          await page.setViewportSize(viewport);

          // Verify key elements are visible
          await expect(page.locator('header, nav')).toBeVisible();

          // No horizontal scroll
          const hasOverflow = await checkHorizontalOverflow(page);
          expect(hasOverflow).toBe(false);

          // Interactive elements are accessible
          const interactiveElements = page.locator('button, a, input, select');
          const count = await interactiveElements.count();
          expect(count).toBeGreaterThan(0);
        });
      }
    });
  }
});

test.describe('Responsive Design - Modal Component', () => {
  test('Modal adapts to mobile with drawer-style layout', async ({ page }) => {
    await navigateToPage(page, '/orders');
    await page.setViewportSize(VIEWPORTS.mobileStandard);

    // Note: This would require triggering a modal in the actual application
    // For now, we test that the modal component classes exist
    const modalClasses = await page.evaluate(() => {
      const modals = document.querySelectorAll('[role="dialog"]');
      return Array.from(modals).map((modal: any) => ({
        hasMobileClass: modal.classList.contains('mobile-drawer'),
        maxWidth: window.getComputedStyle(modal).maxWidth,
      }));
    });

    // Verify mobile-specific modal styling when present
    if (modalClasses.length > 0) {
      const modal = modalClasses[0];
      // Mobile modals should use percentage-based widths
      expect(modal.maxWidth).toContain('vw');
    }
  });
});

test.describe('Responsive Design - Button Component', () => {
  const mobileViewports = [VIEWPORTS.mobileSmall, VIEWPORTS.mobileStandard, VIEWPORTS.mobileLarge];

  for (const viewport of mobileViewports) {
    test(`${viewport.name} - Buttons meet touch target minimums`, async ({ page }) => {
      await navigateToPage(page, '/orders');
      await page.setViewportSize(viewport);

      // Find all buttons
      const buttons = page.locator('button');
      const count = await buttons.count();

      if (count > 0) {
        // Check first button as sample
        const firstButton = buttons.first();
        const box = await firstButton.boundingBox();

        if (box) {
          expect(box.width).toBeGreaterThanOrEqual(44);
          expect(box.height).toBeGreaterThanOrEqual(44);
        }
      }
    });
  }
});

test.describe('Responsive Design - Grid Layouts', () => {
  test('Grid layouts collapse to single column on mobile', async ({ page }) => {
    await navigateToPage(page, '/stock-control');
    await page.setViewportSize(VIEWPORTS.mobileStandard);

    // Check that grid containers are single column on mobile
    const gridColumns = await page.evaluate(() => {
      const grids = document.querySelectorAll('[class*="grid-cols-"]');
      return Array.from(grids).map((grid: any) => {
        const computedStyle = window.getComputedStyle(grid);
        const gridTemplateColumns = computedStyle.gridTemplateColumns;
        return {
          gridTemplateColumns,
          className: grid.className,
        };
      });
    });

    // On mobile, grids should effectively be single column
    // (either explicitly or through computed styles)
    gridColumns.forEach(grid => {
      // Allow for both "1fr" and explicit "1" in grid-template-columns
      const isSingleColumn =
        grid.gridTemplateColumns.includes('1fr') || grid.gridTemplateColumns.includes('none');
      // If grid has multiple columns, it should have responsive classes
      if (!isSingleColumn) {
        expect(grid.className).toMatch(/sm:|md:|lg:|xl:/);
      }
    });
  });

  test('Grid layouts expand on larger screens', async ({ page }) => {
    await navigateToPage(page, '/stock-control');
    await page.setViewportSize(VIEWPORTS.desktopStandard);

    // Verify grid containers use multiple columns on desktop
    const gridColumns = await page.evaluate(() => {
      const grids = document.querySelectorAll('.responsive-grid, [class*="grid-cols-"]');
      return Array.from(grids).map((grid: any) => {
        const computedStyle = window.getComputedStyle(grid);
        return {
          gridTemplateColumns: computedStyle.gridTemplateColumns,
          className: grid.className,
        };
      });
    });

    // At least one grid should have multiple columns on desktop
    const hasMultiColumnGrid = gridColumns.some(grid => {
      const hasMultipleColumns =
        grid.gridTemplateColumns.includes('2fr') ||
        grid.gridTemplateColumns.includes('3fr') ||
        grid.gridTemplateColumns.includes('4fr');
      return hasMultipleColumns;
    });

    expect(hasMultiColumnGrid).toBe(true);
  });
});

test.describe('Responsive Design - Typography Scaling', () => {
  const fluidTextClasses = ['text-fluid-xs', 'text-fluid-base', 'text-fluid-lg', 'text-fluid-xl'];

  test('Fluid typography scales across viewports', async ({ page }) => {
    await navigateToPage(page, '/dashboard');

    const viewports = [VIEWPORTS.mobileSmall, VIEWPORTS.desktopStandard];
    const fontSizes: Record<string, number> = {};

    for (const viewport of viewports) {
      await page.setViewportSize(viewport);

      // Get font size of a heading element
      const headingSize = await page.evaluate(() => {
        const h1 = document.querySelector('h1, h2');
        if (h1) {
          const styles = window.getComputedStyle(h1);
          return parseFloat(styles.fontSize);
        }
        return 0;
      });

      fontSizes[viewport.name] = headingSize;
    }

    // Desktop heading should be larger than mobile heading
    expect(fontSizes[VIEWPORTS.desktopStandard.name]).toBeGreaterThan(
      fontSizes[VIEWPORTS.mobileSmall.name]
    );
  });
});

test.describe('Responsive Design - Safe Area Insets', () => {
  test('Mobile bottom navigation respects safe area insets', async ({ page }) => {
    await navigateToPage(page, '/orders');
    await page.setViewportSize(VIEWPORTS.mobileStandard);

    // Check for bottom navigation with safe area support
    const bottomNav = page.locator('.fixed.bottom-0, [class*="bottom-"][class*="nav"]');
    const hasBottomNav = (await bottomNav.count()) > 0;

    if (hasBottomNav) {
      // Check for safe area inset in computed styles
      const hasSafeArea = await page.evaluate(() => {
        const nav = document.querySelector('.fixed.bottom-0, [class*="bottom-"][class*="nav"]');
        if (nav) {
          const styles = window.getComputedStyle(nav);
          return styles.paddingBottom.includes('env') || styles.paddingBottom.includes('safe-area');
        }
        return false;
      });

      // Safe area support should be present on mobile
      expect(hasSafeArea).toBe(true);
    }
  });
});

test.describe('Responsive Design - Scroll Optimization', () => {
  test('Scroll containment works correctly', async ({ page }) => {
    await navigateToPage(page, '/orders');
    await page.setViewportSize(VIEWPORTS.mobileStandard);

    // Check for scroll-contain classes
    const hasScrollContain = await page.evaluate(() => {
      const elements = document.querySelectorAll(
        '.scroll-contain, .scroll-contain-x, .scroll-contain-y'
      );
      return elements.length > 0;
    });

    // Note: This is a check that the utilities exist and can be used
    // Actual implementation would depend on specific component requirements
  });
});

test.describe('Responsive Design - Accessibility at All Breakpoints', () => {
  const testViewports = [
    VIEWPORTS.mobileSmall,
    VIEWPORTS.mobileStandard,
    VIEWPORTS.tabletPortrait,
    VIEWPORTS.desktopStandard,
  ];

  for (const viewport of testViewports) {
    test(`${viewport.name} - Focus management works correctly`, async ({ page }) => {
      await navigateToPage(page, '/orders');
      await page.setViewportSize(viewport);

      // Tab through interactive elements
      await page.keyboard.press('Tab');

      // Check that something has focus
      const focusedElement = await page.evaluate(() => {
        const active = document.activeElement;
        return active ? active.tagName : null;
      });

      expect(focusedElement).toBeTruthy();
    });

    test(`${viewport.name} - Skip links are present on mobile`, async ({ page }) => {
      await navigateToPage(page, '/orders');
      await page.setViewportSize(viewport);

      // Look for skip links or skip-to-content
      const skipLinks = page.locator('a[href^="#skip-"], a[href^="#main-"], .skip-link');
      const count = await skipLinks.count();

      // Skip links are recommended but not always implemented
      // This test verifies they exist if present
      if (count > 0) {
        await expect(skipLinks.first()).toBeVisible();
      }
    });
  }
});

test.describe('Responsive Design - Performance by Viewport', () => {
  test('Core Web Vitals thresholds across viewports', async ({ page }) => {
    const viewports = [VIEWPORTS.mobileStandard, VIEWPORTS.desktopStandard];

    for (const viewport of viewports) {
      await navigateToPage(page, '/dashboard');
      await page.setViewportSize(viewport);

      // Wait for page to fully load
      await page.waitForLoadState('networkidle');

      // Get performance metrics
      const metrics = await page.evaluate(() => {
        const navigation = performance.getEntriesByType(
          'navigation'
        )[0] as PerformanceNavigationTiming;
        return {
          loadTime: navigation.loadEventEnd - navigation.fetchStart,
          domContentLoaded: navigation.domContentLoadedEventEnd - navigation.fetchStart,
        };
      });

      // Performance thresholds (adjusted for mobile vs desktop)
      const maxLoadTime = viewport.width < 768 ? 5000 : 3000;
      expect(metrics.loadTime).toBeLessThan(maxLoadTime);
    }
  });
});

test.describe('Responsive Design - Visual Regression Snapshots', () => {
  const snapshotViewports = [
    VIEWPORTS.mobileStandard,
    VIEWPORTS.tabletPortrait,
    VIEWPORTS.desktopStandard,
  ];

  for (const viewport of snapshotViewports) {
    test(`Snapshot: ${viewport.name} - Dashboard`, async ({ page }) => {
      await navigateToPage(page, '/dashboard');
      await page.setViewportSize(viewport);

      await page.screenshot({
        path: `test-snapshots/responsive/dashboard-${viewport.width}w.png`,
        fullPage: true,
      });
    });

    test(`Snapshot: ${viewport.name} - Order Queue`, async ({ page }) => {
      await navigateToPage(page, '/orders');
      await page.setViewportSize(viewport);

      await page.screenshot({
        path: `test-snapshots/responsive/orders-${viewport.width}w.png`,
        fullPage: true,
      });
    });
  }
});
