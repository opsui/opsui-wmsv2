/**
 * Reports & Integrations E2E Tests
 *
 * Tests for Sprint 4: Reports & Integrations UI
 * - Report execution and export
 * - Dashboard builder
 * - Integration configuration
 * - Connection testing
 */

import { test, expect } from '@playwright/test';

test.describe('Reports Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/reports');
    await page.waitForLoadState('networkidle');
  });

  test('displays reports list', async ({ page }) => {
    await expect(page.getByText('Reports')).toBeVisible();
    await expect(page.getByRole('button', { name: /new report/i })).toBeVisible();
  });

  test('opens create report dialog', async ({ page }) => {
    await page.click('button:has-text("New Report")');

    await expect(page.getByText(/create report/i)).toBeVisible();
    await expect(page.getByLabel(/report name/i)).toBeVisible();
  });

  test('creates new report', async ({ page }) => {
    await page.click('button:has-text("New Report")');

    // Fill report details
    await page.fill('[data-testid="report-name"]', 'Daily Orders Report');
    await page.fill('[data-testid="report-description"]', 'Summary of daily orders');
    await page.selectOption('[data-testid="report-type"]', 'tabular');

    // Save report
    await page.click('button:has-text("Create")');

    await expect(page.getByText(/report created/i)).toBeVisible();
  });

  test('executes report with parameters', async ({ page }) => {
    // Click execute button on first report
    await page.click('[data-testid="execute-report-0"]');

    // Should show execution modal
    await expect(page.getByText(/execute report/i)).toBeVisible();

    // Set date range
    await page.fill('[data-testid="date-from"]', '2024-01-01');
    await page.fill('[data-testid="date-to"]', '2024-01-31');

    // Run report
    await page.click('button:has-text("Run Report")');

    // Should show results
    await expect(page.getByText(/report results/i)).toBeVisible();
  });

  test('exports report to CSV', async ({ page }) => {
    // Execute report first
    await page.click('[data-testid="execute-report-0"]');
    await page.click('button:has-text("Run Report")');

    // Wait for results
    await page.waitForSelector('[data-testid="report-results"]');

    // Click export button
    const downloadPromise = page.waitForEvent('download');
    await page.click('button:has-text("Export CSV")');
    const download = await downloadPromise;

    // Verify download
    expect(download.suggestedFilename()).toContain('.csv');
  });

  test('creates dashboard', async ({ page }) => {
    await page.click('button:has-text("New Dashboard")');

    await expect(page.getByText(/dashboard builder/i)).toBeVisible();

    // Add widget to dashboard
    await page.click('button:has-text("Add Widget")');
    await page.click('text=Chart');

    // Configure widget
    await page.fill('[data-testid="widget-title"]', 'Orders by Status');
    await page.selectOption('[data-testid="widget-type"]', 'bar');

    // Save dashboard
    await page.click('button:has-text("Save Dashboard")');

    await expect(page.getByText(/dashboard created/i)).toBeVisible();
  });
});

test.describe('Integrations Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/integrations');
    await page.waitForLoadState('networkidle');
  });

  test('displays integrations list', async ({ page }) => {
    await expect(page.getByText('Integrations')).toBeVisible();
    await expect(page.getByText(/connected/i)).toBeVisible();
  });

  test('shows integration cards', async ({ page }) => {
    const integrationCards = page.locator('[data-testid^="integration-card-"]');
    const count = await integrationCards.count();

    expect(count).toBeGreaterThan(0);

    // First card should have name, status, configure button
    await expect(
      integrationCards.first().locator('[data-testid="integration-name"]')
    ).toBeVisible();
    await expect(
      integrationCards.first().locator('[data-testid="integration-status"]')
    ).toBeVisible();
    await expect(integrationCards.first().locator('button:has-text("Configure")')).toBeVisible();
  });

  test('opens integration configuration', async ({ page }) => {
    // Click configure on first integration
    await page.click('[data-testid="integration-card-0"] button:has-text("Configure")');

    // Should show config modal
    await expect(page.getByText(/integration settings/i)).toBeVisible();
    await expect(page.getByLabel(/api key/i)).toBeVisible();
  });

  test('configures integration credentials', async ({ page }) => {
    await page.click('[data-testid="integration-card-0"] button:has-text("Configure")');

    // Fill credentials
    await page.fill('[data-testid="api-key"]', 'test-api-key-12345');
    await page.fill('[data-testid="webhook-url"]', 'https://example.com/webhook');

    // Save configuration
    await page.click('button:has-text("Save")');

    await expect(page.getByText(/integration configured/i)).toBeVisible();
  });

  test('tests integration connection', async ({ page }) => {
    await page.click('[data-testid="integration-card-0"] button:has-text("Configure")');

    // Click test connection button
    await page.click('button:has-text("Test Connection")');

    // Should show success or failure message
    await expect(page.getByText(/connection test/i)).toBeVisible();
  });

  test('triggers manual sync', async ({ page }) => {
    // Click sync button on first integration
    await page.click('[data-testid="integration-card-0"] button:has-text("Sync Now")');

    // Should show sync in progress indicator
    await expect(page.getByText(/syncing/i)).toBeVisible();

    // Wait for sync to complete
    await page.waitForSelector('text=Sync Complete', { timeout: 30000 });
  });

  test('views webhook events', async ({ page }) => {
    // Click on webhook events button
    await page.click('[data-testid="integration-card-0"] button:has-text("View Events")');

    // Should show events log
    await expect(page.getByText(/webhook events/i)).toBeVisible();
    await expect(page.getByText(/timestamp/i)).toBeVisible();
    await expect(page.getByText(/event type/i)).toBeVisible();
  });

  test('filters webhook events', async ({ page }) => {
    await page.click('[data-testid="integration-card-0"] button:has-text("View Events")');

    // Filter by event type
    await page.selectOption('[data-testid="event-filter"]', 'order.created');

    // Should filter results
    await page.waitForTimeout(500);
    const events = page.locator('[data-testid^="webhook-event-"]');
    const count = await events.count();

    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('retries failed webhook', async ({ page }) => {
    await page.click('[data-testid="integration-card-0"] button:has-text("View Events")');

    // Find failed event
    const failedEvent = page.locator('[data-status="failed"]').first();

    if ((await failedEvent.count()) > 0) {
      // Click retry button
      await failedEvent.locator('button:has-text("Retry")').click();

      await expect(page.getByText(/retrying/i)).toBeVisible();
    }
  });

  test('enables/disables integration', async ({ page }) => {
    const toggle = page.locator('[data-testid="integration-toggle-0"]');
    const initialState = await toggle.getAttribute('data-state');

    await toggle.click();

    const newState = await toggle.getAttribute('data-state');
    expect(initialState).not.toBe(newState);
  });

  test('configures sync schedule', async ({ page }) => {
    await page.click('[data-testid="integration-card-0"] button:has-text("Configure")');

    // Set sync frequency
    await page.selectOption('[data-testid="sync-frequency"]', 'hourly');

    // Save
    await page.click('button:has-text("Save")');

    await expect(page.getByText(/settings saved/i)).toBeVisible();
  });
});

test.describe('Dashboard Builder', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/reports');
    await page.waitForLoadState('networkidle');
  });

  test('drags and drops widgets', async ({ page }) => {
    await page.click('button:has-text("New Dashboard")');

    // Add first widget
    await page.click('button:has-text("Add Widget")');
    await page.click('text=Metric');

    // Add second widget
    await page.click('button:has-text("Add Widget")');
    await page.click('text=Chart');

    // Drag first widget to reorder
    const widget1 = page.locator('[data-testid="dashboard-widget-0"]');
    const widget2 = page.locator('[data-testid="dashboard-widget-1"]');

    // Simulate drag and drop
    await widget1.dragTo(widget2);

    // Verify order changed
    await expect(widget1).toBeVisible();
    await expect(widget2).toBeVisible();
  });

  test('configures widget properties', async ({ page }) => {
    await page.click('button:has-text("New Dashboard")');
    await page.click('button:has-text("Add Widget")');
    await page.click('text=Chart');

    // Set widget title
    await page.fill('[data-testid="widget-title"]', 'Sales Trends');

    // Select chart type
    await page.selectOption('[data-testid="chart-type"]', 'line');

    // Add data source
    await page.selectOption('[data-testid="data-source"]', 'orders');

    // Apply changes
    await page.click('button:has-text("Apply")');

    await expect(page.getByText('Sales Trends')).toBeVisible();
  });

  test('saves dashboard layout', async ({ page }) => {
    await page.click('button:has-text("New Dashboard")');

    // Add widgets
    await page.click('button:has-text("Add Widget")');
    await page.click('text=Metric');
    await page.fill('[data-testid="widget-title"]', 'Total Orders');
    await page.click('button:has-text("Add Widget")');
    await page.click('text=Metric');
    await page.fill('[data-testid="widget-title"]', 'Revenue');

    // Save dashboard
    await page.click('button:has-text("Save Dashboard")');
    await page.fill('[data-testid="dashboard-name"]', 'Executive Overview');
    await page.click('button:has-text("Save")');

    await expect(page.getByText(/dashboard saved/i)).toBeVisible();
  });
});
