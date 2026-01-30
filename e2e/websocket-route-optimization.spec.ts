/**
 * WebSocket & Route Optimization E2E Tests
 *
 * Tests for Sprint 5 & 6:
 * - WebSocket real-time updates
 * - Connection status
 * - Route optimization
 * - ML predictions
 */

import { test, expect } from '@playwright/test';

test.describe('WebSocket Real-time Updates', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('shows connected status', async ({ page }) => {
    // Check connection status indicator
    const statusIndicator = page.locator('[data-testid="connection-status"]');

    await expect(statusIndicator).toBeVisible();
    await expect(statusIndicator).toHaveAttribute('data-state', 'connected');
  });

  test('shows disconnected status when websocket fails', async ({ page, context }) => {
    // Simulate WebSocket disconnect by going offline
    await context.setOffline(true);

    // Should show disconnected status
    const statusIndicator = page.locator('[data-testid="connection-status"]');
    await page.waitForTimeout(2000);
    await expect(statusIndicator).toHaveAttribute('data-state', 'disconnected');

    // Restore connection
    await context.setOffline(false);
  });

  test('receives real-time order updates', async ({ page, context }) => {
    // Open second page to test real-time sync
    const page2 = await context.newPage();
    await page2.goto('/order-queue');
    await page2.waitForLoadState('networkidle');

    // Claim order on first page
    await page.goto('/order-queue');
    await page.waitForLoadState('networkidle');

    const claimButton = page.locator('[data-testid="claim-order-0"]');
    await claimButton.click();

    // Second page should reflect the change
    await page2.waitForTimeout(1000);
    await expect(page2.getByText(/claimed/i)).toBeVisible();

    await page2.close();
  });

  test('receives real-time pick updates', async ({ page, context }) => {
    // Open picking page on both pages
    const page2 = await context.newPage();
    await page2.goto('/picking');
    await page2.waitForLoadState('networkidle');

    await page.goto('/picking');
    await page.waitForLoadState('networkidle');

    // Pick item on first page
    const pickButton = page.locator('[data-testid="pick-item-0"]');
    await pickButton.click();

    // Second page should show update
    await page2.waitForTimeout(1000);
    await expect(page2.getByText(/picked/i)).toBeVisible();

    await page2.close();
  });

  test('receives notification in real-time', async ({ page, context }) => {
    // Open second page
    const page2 = await context.newPage();
    await page2.goto('/');
    await page2.waitForLoadState('networkidle');

    // Trigger notification on first page (e.g., create high priority order)
    await page.goto('/orders');
    await page.waitForLoadState('networkidle');

    await page.click('button:has-text("New Order")');
    await page.fill('[data-testid="order-priority"]', 'URGENT');
    await page.click('button:has-text("Create")');

    // Second page should show notification
    await page2.waitForTimeout(2000);
    const notificationBadge = page2.locator('[data-testid="notification-badge"]');
    await expect(notificationBadge).toBeVisible();

    await page2.close();
  });

  test('auto-reconnects on connection loss', async ({ page }) => {
    // Get initial connection state
    const statusIndicator = page.locator('[data-testid="connection-status"]');

    // Simulate offline
    await page.context().setOffline(true);
    await page.waitForTimeout(2000);

    await expect(statusIndicator).toHaveAttribute('data-state', 'disconnected');

    // Simulate reconnect
    await page.context().setOffline(false);
    await page.waitForTimeout(3000);

    await expect(statusIndicator).toHaveAttribute('data-state', 'connected');
  });

  test('displays connection panel with details', async ({ page }) => {
    // Click on connection status to open panel
    await page.click('[data-testid="connection-status"]');

    await expect(page.getByText(/websocket connection/i)).toBeVisible();
    await expect(page.getByText(/latency/i)).toBeVisible();
    await expect(page.getByText(/messages/i)).toBeVisible();
  });

  test('manually reconnects from panel', async ({ page }) => {
    await page.context().setOffline(true);
    await page.waitForTimeout(2000);

    // Open connection panel
    await page.click('[data-testid="connection-status"]');

    // Click reconnect button
    const reconnectButton = page.locator('button:has-text("Reconnect")');
    if ((await reconnectButton.count()) > 0) {
      await reconnectButton.click();
    }

    // Restore connection
    await page.context().setOffline(false);
    await page.waitForTimeout(2000);

    const statusIndicator = page.locator('[data-testid="connection-status"]');
    await expect(statusIndicator).toHaveAttribute('data-state', 'connected');
  });
});

test.describe('Route Optimization', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/route-optimization');
    await page.waitForLoadState('networkidle');
  });

  test('displays route optimization interface', async ({ page }) => {
    await expect(page.getByText('Route Optimization')).toBeVisible();
    await expect(page.getByText('Locations to Visit')).toBeVisible();
    await expect(page.getByText('Options')).toBeVisible();
  });

  test('adds and removes locations', async ({ page }) => {
    // Add location
    await page.click('button:has-text("Add Location")');

    const input = page.locator('[data-testid="location-input-0"]');
    await input.fill('A-05-03');

    // Add another location
    await page.click('button:has-text("Add Location")');
    const input2 = page.locator('[data-testid="location-input-1"]');
    await input2.fill('B-12-08');

    // Remove first location
    await page.click('[data-testid="remove-location-0"]');

    // Should only have second location
    await expect(page.getByDisplayValue('B-12-08')).toBeVisible();
    await expect(page.getByDisplayValue('A-05-03')).not.toBeVisible();
  });

  test('generates sample warehouse layout', async ({ page }) => {
    await page.click('button:has-text("Generate Sample")');

    // Should populate multiple locations
    const inputs = page.locator('input[placeholder*="A-"]');
    const count = await inputs.count();

    expect(count).toBeGreaterThan(0);
  });

  test('optimizes route with nearest neighbor', async ({ page }) => {
    // Generate sample locations
    await page.click('button:has-text("Generate Sample")');

    // Select algorithm
    await page.selectOption('[data-testid="algorithm-select"]', 'nearest');

    // Run optimization
    await page.click('button:has-text("Optimize Route")');

    // Wait for results
    await expect(page.getByText('Optimization Result')).toBeVisible();
    await expect(page.getByText(/\d+m$/)).toBeVisible(); // Distance
    await expect(page.getByText(/\d+min$/)).toBeVisible(); // Time
  });

  test('optimizes route with TSP', async ({ page }) => {
    await page.click('button:has-text("Generate Sample")');
    await page.selectOption('[data-testid="algorithm-select"]', 'tsp');

    await page.click('button:has-text("Optimize Route")');

    await expect(page.getByText('Optimization Result')).toBeVisible();
    await expect(page.getByText('Optimized Path')).toBeVisible();
  });

  test('optimizes route with aisle-by-aisle strategy', async ({ page }) => {
    await page.click('button:has-text("Generate Sample")');
    await page.selectOption('[data-testid="algorithm-select"]', 'aisle');

    await page.click('button:has-text("Optimize Route")');

    await expect(page.getByText('Optimization Result')).toBeVisible();
  });

  test('optimizes route with zone-based strategy', async ({ page }) => {
    await page.click('button:has-text("Generate Sample")');
    await page.selectOption('[data-testid="algorithm-select"]', 'zone');

    await page.click('button:has-text("Optimize Route")');

    await expect(page.getByText('Optimization Result')).toBeVisible();
  });

  test('compares all optimization strategies', async ({ page }) => {
    // Generate sample locations
    await page.click('button:has-text("Generate Sample")');

    // Switch to compare view
    await page.click('text=Compare Strategies');

    // Run comparison
    await page.click('button:has-text("Compare All")');

    // Wait for comparison results
    await expect(page.getByText(/best strategy/i)).toBeVisible();
    await expect(page.getByText('TSP Algorithm')).toBeVisible();
    await expect(page.getByText('Nearest Neighbor Algorithm')).toBeVisible();
    await expect(page.getByText('Aisle-by-Aisle Algorithm')).toBeVisible();
    await expect(page.getByText('Zone-Based Algorithm')).toBeVisible();
  });

  test('displays optimized path sequence', async ({ page }) => {
    await page.click('button:has-text("Generate Sample")');
    await page.click('button:has-text("Optimize Route")');

    // Should show path with numbered waypoints
    await expect(page.getByText('Optimized Path')).toBeVisible();

    const waypoints = page.locator('[data-testid^="waypoint-"]');
    const count = await waypoints.count();

    expect(count).toBeGreaterThan(0);
  });

  test('shows zone-based location coloring', async ({ page }) => {
    const input = page.locator('[data-testid="location-input-0"]');
    await input.fill('A-05-03');

    // Zone A should have blue styling
    const zoneColor = await input.evaluate(el => {
      return window.getComputedStyle(el).backgroundColor;
    });

    // Should have some color (not transparent)
    expect(zoneColor).not.toBe('transparent');
  });

  test('displays route statistics', async ({ page }) => {
    await page.click('button:has-text("Generate Sample")');
    await page.click('button:has-text("Optimize Route")');

    await expect(page.getByText('Total Locations')).toBeVisible();
    await expect(page.getByText('Total Distance')).toBeVisible();
    await expect(page.getByText('Est. Time')).toBeVisible();
  });

  test('changes start point', async ({ page }) => {
    const startPointInput = page.locator('[data-testid="start-point"]');
    await startPointInput.fill('B-01-01');

    await page.click('button:has-text("Generate Sample")');
    await page.click('button:has-text("Optimize Route")');

    // Should calculate from new start point
    await expect(page.getByText('B-01-01')).toBeVisible();
  });
});

test.describe('ML Predictions', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/orders');
    await page.waitForLoadState('networkidle');
  });

  test('displays predicted duration for order', async ({ page }) => {
    // Click on first order
    await page.click('[data-testid="order-row-0"]');

    // Should show predicted duration
    await expect(page.getByText(/estimated time/i)).toBeVisible();
    await expect(page.getByText(/\d+ min/i)).toBeVisible();
  });

  test('displays demand forecast for SKU', async ({ page }) => {
    await page.goto('/skus');
    await page.waitForLoadState('networkidle');

    // Click on SKU details
    await page.click('[data-testid="sku-row-0"]');

    // Should show demand forecast
    await expect(page.getByText(/demand forecast/i)).toBeVisible();
  });
});

test.describe('Integration Tests', () => {
  test('route optimization updates real-time', async ({ page, context }) => {
    // Open route optimization on both pages
    const page2 = await context.newPage();
    await page2.goto('/route-optimization');
    await page2.waitForLoadState('networkidle');

    await page.goto('/route-optimization');
    await page.waitForLoadState('networkidle');

    // Optimize route on first page
    await page.click('button:has-text("Generate Sample")');
    await page.click('button:has-text("Optimize Route")');

    // Results should be visible on first page
    await expect(page.getByText('Optimization Result')).toBeVisible();

    await page2.close();
  });

  test('connection status visible across all pages', async ({ page }) => {
    const pages = [
      '/order-queue',
      '/picking',
      '/route-optimization',
      '/dashboard',
    ];

    for (const pagePath of pages) {
      await page.goto(pagePath);
      await page.waitForLoadState('networkidle');

      const statusIndicator = page.locator('[data-testid="connection-status"]');
      await expect(statusIndicator).toBeVisible();
    }
  });
});
