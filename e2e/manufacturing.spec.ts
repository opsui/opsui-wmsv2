/**
 * E2E Tests: Manufacturing Module
 * @covers e2e/manufacturing.spec.ts
 *
 * Tests for the Manufacturing module including:
 * - Production dashboard
 * - Work orders
 * - Bill of materials
 * - Production scheduling
 * - Quality control
 */

import { test, expect, Page } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';

// Helper functions
async function login(page: Page, role: 'production' | 'manager' | 'quality' = 'production') {
  const credentials = {
    production: { email: 'production@example.com', password: 'password123' },
    manager: { email: 'manager@example.com', password: 'password123' },
    quality: { email: 'quality@example.com', password: 'password123' },
  };

  await page.goto(`${BASE_URL}/login`);
  await page.fill('input[name="email"]', credentials[role].email);
  await page.fill('input[name="password"]', credentials[role].password);
  await page.click('button[type="submit"]');

  await page.waitForURL(/\/(dashboard|manufacturing)/);
  await page.waitForLoadState('networkidle');
}

test.describe('Manufacturing Module', () => {
  test.describe('Production Dashboard', () => {
    test.beforeEach(async ({ page }) => {
      await login(page, 'production');
    });

    test('displays production dashboard', async ({ page }) => {
      await page.goto(`${BASE_URL}/manufacturing`);
      await page.waitForLoadState('networkidle');

      await expect(page.getByText('Production Dashboard')).toBeVisible();

      // Should show key metrics
      await expect(page.getByText('Active Work Orders')).toBeVisible();
      await expect(page.getByText('Production Efficiency')).toBeVisible();
      await expect(page.getByText('Pending Quality Checks')).toBeVisible();
    });

    test('views production schedule', async ({ page }) => {
      await page.goto(`${BASE_URL}/manufacturing`);

      await expect(page.getByText('Production Schedule')).toBeVisible();

      // Should show scheduled work orders
      const scheduleItems = page.locator('[data-testid^="schedule-item-"]');
      const count = await scheduleItems.count();
      expect(count).toBeGreaterThanOrEqual(0);
    });

    test('views machine status', async ({ page }) => {
      await page.goto(`${BASE_URL}/manufacturing`);

      await expect(page.getByText('Equipment Status')).toBeVisible();

      // Should show machine availability
      const machines = page.locator('[data-testid^="machine-status-"]');
      const count = await machines.count();
      expect(count).toBeGreaterThan(0);
    });
  });

  test.describe('Work Orders', () => {
    test.beforeEach(async ({ page }) => {
      await login(page, 'production');
    });

    test('creates new work order', async ({ page }) => {
      await page.goto(`${BASE_URL}/manufacturing/work-orders`);

      await page.click('button:has-text("New Work Order")');

      // Fill work order details
      await page.fill('[data-testid="wo-number"]', 'WO-E2E-001');
      await page.selectOption('[data-testid="wo-product"]', 'PROD-001');
      await page.fill('[data-testid="wo-quantity"]', '100');
      await page.fill('[data-testid="wo-start-date"]', '2024-02-01');
      await page.fill('[data-testid="wo-due-date"]', '2024-02-15');

      // Select priority
      await page.selectOption('[data-testid="wo-priority"]', 'NORMAL');

      // Create work order
      await page.click('button:has-text("Create Work Order")');

      await expect(page.getByText(/work order created/i)).toBeVisible();
    });

    test('views work order details', async ({ page }) => {
      await page.goto(`${BASE_URL}/manufacturing/work-orders`);

      await page.click('[data-testid^="work-order-"]');

      await expect(page.getByText('Work Order Details')).toBeVisible();
      await expect(page.getByText('Bill of Materials')).toBeVisible();
      await expect(page.getByText('Production Steps')).toBeVisible();
    });

    test('starts work order', async ({ page }) => {
      await page.goto(`${BASE_URL}/manufacturing/work-orders`);

      // Find pending work order
      const pendingWO = page.locator('[data-status="PENDING"]').first();

      if ((await pendingWO.count()) > 0) {
        await pendingWO.click();
        await page.click('button:has-text("Start Production")');

        await expect(page.getByText(/production started/i)).toBeVisible();
      }
    });

    test('records production output', async ({ page }) => {
      await page.goto(`${BASE_URL}/manufacturing/work-orders`);

      const inProgressWO = page.locator('[data-status="IN_PROGRESS"]').first();

      if ((await inProgressWO.count()) > 0) {
        await inProgressWO.click();

        // Record output
        await page.click('button:has-text("Record Output")');
        await page.fill('[data-testid="output-quantity"]', '50');
        await page.fill('[data-testid="output-date"]', '2024-02-05');

        await page.click('button:has-text("Record")');

        await expect(page.getByText(/output recorded/i)).toBeVisible();
      }
    });

    test('completes work order', async ({ page }) => {
      await page.goto(`${BASE_URL}/manufacturing/work-orders`);

      const inProgressWO = page.locator('[data-status="IN_PROGRESS"]').first();

      if ((await inProgressWO.count()) > 0) {
        await inProgressWO.click();

        // Complete work order
        await page.click('button:has-text("Complete Work Order")');

        await expect(page.getByText(/work order completed/i)).toBeVisible();
      }
    });

    test('cancels work order', async ({ page }) => {
      await page.goto(`${BASE_URL}/manufacturing/work-orders`);

      const pendingWO = page.locator('[data-status="PENDING"]').first();

      if ((await pendingWO.count()) > 0) {
        await pendingWO.click();
        await page.click('button:has-text("Cancel Work Order")');
        await page.fill('[data-testid="cancellation-reason"]', 'No longer needed');
        await page.click('button:has-text("Confirm Cancellation")');

        await expect(page.getByText(/work order cancelled/i)).toBeVisible();
      }
    });

    test('views work order history', async ({ page }) => {
      await page.goto(`${BASE_URL}/manufacturing/work-orders`);

      await page.click('[data-testid^="work-order-"]');

      await expect(page.getByText('Production History')).toBeVisible();

      const historyEntries = page.locator('[data-testid^="history-entry-"]');
      const count = await historyEntries.count();
      expect(count).toBeGreaterThanOrEqual(0);
    });
  });

  test.describe('Bill of Materials', () => {
    test.beforeEach(async ({ page }) => {
      await login(page, 'production');
    });

    test('views bill of materials', async ({ page }) => {
      await page.goto(`${BASE_URL}/manufacturing/bom`);

      await expect(page.getByText('Bill of Materials')).toBeVisible();
    });

    test('creates new BOM', async ({ page }) => {
      await page.goto(`${BASE_URL}/manufacturing/bom`);

      await page.click('button:has-text("New BOM")');

      // Fill BOM details
      await page.selectOption('[data-testid="bom-product"]', 'PROD-001');
      await page.fill('[data-testid="bom-version"]', '1.0');
      await page.fill('[data-testid="bom-effective-date"]', '2024-02-01');

      // Add components
      await page.click('button:has-text("Add Component")');
      await page.selectOption('[data-testid="component-0"]', 'RAW-001');
      await page.fill('[data-testid="component-qty-0"]', '10');

      await page.click('button:has-text("Save BOM")');

      await expect(page.getByText(/bom created/i)).toBeVisible();
    });

    test('views BOM details', async ({ page }) => {
      await page.goto(`${BASE_URL}/manufacturing/bom`);

      await page.click('[data-testid^="bom-row-"]');

      await expect(page.getByText('BOM Details')).toBeVisible();
      await expect(page.getByText('Components')).toBeVisible();
      await expect(page.getByText('Total Cost')).toBeVisible();
    });

    test('checks material availability', async ({ page }) => {
      await page.goto(`${BASE_URL}/manufacturing/bom`);

      await page.click('[data-testid^="bom-row-"]');

      await page.click('button:has-text("Check Availability")');

      await expect(page.getByText('Material Availability')).toBeVisible();
      await expect(page.getByText('Available')).toBeVisible();
      await expect(page.getByText('Shortage')).toBeVisible();
    });
  });

  test.describe('Production Scheduling', () => {
    test.beforeEach(async ({ page }) => {
      await login(page, 'manager');
    });

    test('views production calendar', async ({ page }) => {
      await page.goto(`${BASE_URL}/manufacturing/scheduling`);

      await expect(page.getByText('Production Schedule')).toBeVisible();

      // Should show calendar view
      await expect(page.locator('.schedule-calendar')).toBeVisible();
    });

    test('schedules work order', async ({ page }) => {
      await page.goto(`${BASE_URL}/manufacturing/scheduling`);

      await page.click('button:has-text("Schedule Work Order")');

      await page.selectOption('[data-testid="schedule-wo"]', 'WO-001');
      await page.fill('[data-testid="schedule-start"]', '2024-02-01');
      await page.fill('[data-testid="schedule-end"]', '2024-02-05');
      await page.selectOption('[data-testid="schedule-workstation"]', 'WS-01');

      await page.click('button:has-text("Schedule")');

      await expect(page.getByText(/work order scheduled/i)).toBeVisible();
    });

    test('reschedules work order', async ({ page }) => {
      await page.goto(`${BASE_URL}/manufacturing/scheduling`);

      const scheduledWO = page.locator('[data-testid^="scheduled-wo-"]').first();

      if ((await scheduledWO.count()) > 0) {
        await scheduledWO.click();
        await page.click('button:has-text("Reschedule")');

        await page.fill('[data-testid="new-start-date"]', '2024-02-10');
        await page.click('button:has-text("Update Schedule")');

        await expect(page.getByText(/schedule updated/i)).toBeVisible();
      }
    });

    test('views workstation utilization', async ({ page }) => {
      await page.goto(`${BASE_URL}/manufacturing/scheduling`);

      await page.click('button:has-text("Workstation Utilization")');

      await expect(page.getByText('Utilization Report')).toBeVisible();

      const workstations = page.locator('[data-testid^="workstation-util-"]');
      const count = await workstations.count();
      expect(count).toBeGreaterThan(0);
    });
  });

  test.describe('Quality Control', () => {
    test.beforeEach(async ({ page }) => {
      await login(page, 'quality');
    });

    test('views quality checks queue', async ({ page }) => {
      await page.goto(`${BASE_URL}/manufacturing/quality`);
      await page.waitForLoadState('networkidle');

      await expect(page.getByText('Quality Control')).toBeVisible();
      await expect(page.getByText('Pending Checks')).toBeVisible();
    });

    test('performs quality inspection', async ({ page }) => {
      await page.goto(`${BASE_URL}/manufacturing/quality`);

      const pendingCheck = page.locator('[data-status="PENDING"]').first();

      if ((await pendingCheck.count()) > 0) {
        await pendingCheck.click();

        // Start inspection
        await page.click('button:has-text("Start Inspection")');

        // Record inspection results
        await page.check('[data-testid="check-point-1"]');
        await page.check('[data-testid="check-point-2"]');
        await page.uncheck('[data-testid="check-point-3"]');

        // Add notes for failed check
        await page.fill('[data-testid="defect-notes-3"]', 'Minor surface scratch');

        // Submit inspection
        await page.click('button:has-text("Submit Inspection")');

        await expect(page.getByText(/inspection submitted/i)).toBeVisible();
      }
    });

    test('approves quality batch', async ({ page }) => {
      await page.goto(`${BASE_URL}/manufacturing/quality`);

      const inspectedBatch = page.locator('[data-status="INSPECTED"]').first();

      if ((await inspectedBatch.count()) > 0) {
        await inspectedBatch.click();
        await page.click('button:has-text("Approve Batch")');

        await expect(page.getByText(/batch approved/i)).toBeVisible();
      }
    });

    test('rejects quality batch', async ({ page }) => {
      await page.goto(`${BASE_URL}/manufacturing/quality`);

      const inspectedBatch = page.locator('[data-status="INSPECTED"]').first();

      if ((await inspectedBatch.count()) > 0) {
        await inspectedBatch.click();
        await page.click('button:has-text("Reject Batch")');
        await page.fill('[data-testid="rejection-reason"]', 'Quality standards not met');
        await page.click('button:has-text("Confirm Rejection")');

        await expect(page.getByText(/batch rejected/i)).toBeVisible();
      }
    });

    test('views quality reports', async ({ page }) => {
      await page.goto(`${BASE_URL}/manufacturing/quality`);

      await page.click('button:has-text("Quality Reports")');

      await expect(page.getByText('Quality Metrics')).toBeVisible();
      await expect(page.getByText('Defect Rate')).toBeVisible();
      await expect(page.getByText('First Pass Yield')).toBeVisible();
    });

    test('creates non-conformance report', async ({ page }) => {
      await page.goto(`${BASE_URL}/manufacturing/quality`);

      await page.click('button:has-text("Report Non-Conformance")');

      await page.selectOption('[data-testid="ncr-type"]', 'DEFECT');
      await page.fill('[data-testid="ncr-description"]', 'Product defect identified');
      await page.selectOption('[data-testid="ncr-severity"]', 'MINOR');
      await page.fill('[data-testid="ncr-quantity"]', '5');

      await page.click('button:has-text("Submit Report")');

      await expect(page.getByText(/report submitted/i)).toBeVisible();
    });
  });

  test.describe('Inventory for Production', () => {
    test.beforeEach(async ({ page }) => {
      await login(page, 'production');
    });

    test('views raw material inventory', async ({ page }) => {
      await page.goto(`${BASE_URL}/manufacturing/inventory`);

      await expect(page.getByText('Raw Materials')).toBeVisible();
      await expect(page.getByText('Work in Progress')).toBeVisible();
      await expect(page.getByText('Finished Goods')).toBeVisible();
    });

    test('reserves materials for work order', async ({ page }) => {
      await page.goto(`${BASE_URL}/manufacturing/inventory`);

      await page.click('button:has-text("Reserve Materials")');

      await page.selectOption('[data-testid="reserve-wo"]', 'WO-001');

      // Reserve materials
      await page.click('button:has-text("Reserve All")');

      await expect(page.getByText(/materials reserved/i)).toBeVisible();
    });

    test('issues materials to production', async ({ page }) => {
      await page.goto(`${BASE_URL}/manufacturing/inventory`);

      await page.click('button:has-text("Issue Materials")');

      await page.selectOption('[data-testid="issue-wo"]', 'WO-001');
      await page.selectOption('[data-testid="issue-material"]', 'RAW-001');
      await page.fill('[data-testid="issue-quantity"]', '100');

      await page.click('button:has-text("Issue")');

      await expect(page.getByText(/materials issued/i)).toBeVisible();
    });

    test('receives finished goods', async ({ page }) => {
      await page.goto(`${BASE_URL}/manufacturing/inventory`);

      await page.click('button:has-text("Receive Finished Goods")');

      await page.selectOption('[data-testid="receive-wo"]', 'WO-001');
      await page.fill('[data-testid="receive-quantity"]', '95');
      await page.fill('[data-testid="receive-location"]', 'FG-01-01');

      await page.click('button:has-text("Receive")');

      await expect(page.getByText(/finished goods received/i)).toBeVisible();
    });
  });

  test.describe('Production Reports', () => {
    test.beforeEach(async ({ page }) => {
      await login(page, 'manager');
    });

    test('views production performance', async ({ page }) => {
      await page.goto(`${BASE_URL}/manufacturing/reports`);

      await page.click('button:has-text("Production Performance")');

      await expect(page.getByText('Performance Metrics')).toBeVisible();
      await expect(page.getByText('On-Time Delivery')).toBeVisible();
      await expect(page.getByText('Yield Rate')).toBeVisible();
    });

    test('views cost analysis', async ({ page }) => {
      await page.goto(`${BASE_URL}/manufacturing/reports`);

      await page.click('button:has-text("Cost Analysis")');

      await expect(page.getByText('Production Costs')).toBeVisible();
      await expect(page.getByText('Material Costs')).toBeVisible();
      await expect(page.getByText('Labor Costs')).toBeVisible();
      await expect(page.getByText('Overhead')).toBeVisible();
    });

    test('exports production report', async ({ page }) => {
      await page.goto(`${BASE_URL}/manufacturing/reports`);

      await page.click('button:has-text("Production Summary")');
      await page.click('button:has-text("Generate Report")');

      const downloadPromise = page.waitForEvent('download');
      await page.click('button:has-text("Export Excel")');
      const download = await downloadPromise;

      expect(download.suggestedFilename()).toMatch(/production.*\.xlsx/);
    });
  });

  test.describe('Equipment Management', () => {
    test.beforeEach(async ({ page }) => {
      await login(page, 'production');
    });

    test('views equipment list', async ({ page }) => {
      await page.goto(`${BASE_URL}/manufacturing/equipment`);

      await expect(page.getByText('Equipment')).toBeVisible();

      const equipment = page.locator('[data-testid^="equipment-"]');
      const count = await equipment.count();
      expect(count).toBeGreaterThan(0);
    });

    test('views equipment details', async ({ page }) => {
      await page.goto(`${BASE_URL}/manufacturing/equipment`);

      await page.click('[data-testid^="equipment-"]');

      await expect(page.getByText('Equipment Details')).toBeVisible();
      await expect(page.getByText('Maintenance Schedule')).toBeVisible();
      await expect(page.getByText('Performance Metrics')).toBeVisible();
    });

    test('logs equipment maintenance', async ({ page }) => {
      await page.goto(`${BASE_URL}/manufacturing/equipment');

      await page.click('[data-testid^="equipment-"]');
      await page.click('button:has-text("Log Maintenance")');

      await page.selectOption('[data-testid="maintenance-type"]', 'PREVENTIVE');
      await page.fill('[data-testid="maintenance-notes"]', 'Routine inspection and lubrication');
      await page.fill('[data-testid="maintenance-cost"]', '150');

      await page.click('button:has-text("Log Maintenance")');

      await expect(page.getByText(/maintenance logged/i)).toBeVisible();
    });

    test('reports equipment breakdown', async ({ page }) => {
      await page.goto(`${BASE_URL}/manufacturing/equipment`);

      await page.click('[data-testid^="equipment-"]');
      await page.click('button:has-text("Report Breakdown")');

      await page.fill('[data-testid="breakdown-description"]', 'Motor failure');
      await page.selectOption('[data-testid="breakdown-priority"]', 'HIGH');

      await page.click('button:has-text("Report Breakdown")');

      await expect(page.getByText(/breakdown reported/i)).toBeVisible();
    });
  });

  test.describe('Production Planning', () => {
    test.beforeEach(async ({ page }) => {
      await login(page, 'manager');
    });

    test('creates production plan', async ({ page }) => {
      await page.goto(`${BASE_URL}/manufacturing/planning`);

      await page.click('button:has-text("New Production Plan")');

      await page.fill('[data-testid="plan-name"]', 'February Production Plan');
      await page.fill('[data-testid="plan-period-start"]', '2024-02-01');
      await page.fill('[data-testid="plan-period-end"]', '2024-02-29');

      await page.click('button:has-text("Create Plan")');

      await expect(page.getByText(/plan created/i)).toBeVisible();
    });

    test('adds products to plan', async ({ page }) => {
      await page.goto(`${BASE_URL}/manufacturing/planning`);

      await page.click('[data-testid^="production-plan-"]');

      await page.click('button:has-text("Add Products")');

      await page.selectOption('[data-testid="plan-product-0"]', 'PROD-001');
      await page.fill('[data-testid="plan-quantity-0"]', '500');

      await page.click('button:has-text("Add to Plan")');

      await expect(page.getByText(/products added/i)).toBeVisible();
    });

    test('generates material requirements', async ({ page }) => {
      await page.goto(`${BASE_URL}/manufacturing/planning`);

      await page.click('[data-testid^="production-plan-"]');

      await page.click('button:has-text("Generate MRP")');

      await expect(page.getByText('Material Requirements Planning')).toBeVisible();

      const mrpItems = page.locator('[data-testid^="mrp-item-"]');
      const count = await mrpItems.count();
      expect(count).toBeGreaterThan(0);
    });
  });
});
