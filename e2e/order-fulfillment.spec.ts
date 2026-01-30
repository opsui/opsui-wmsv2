/**
 * E2E Tests: Order Fulfillment Workflow
 * @covers e2e/order-fulfillment.spec.ts
 *
 * Tests the complete order fulfillment workflow from order creation to shipping
 */

import { test, expect, Page } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';

// Helper functions
async function login(page: Page, role: 'picker' | 'packer' | 'supervisor' = 'picker') {
  const credentials = {
    picker: { email: 'picker@example.com', password: 'password123' },
    packer: { email: 'packer@example.com', password: 'password123' },
    supervisor: { email: 'supervisor@example.com', password: 'password123' },
  };

  await page.goto(`${BASE_URL}/login`);
  await page.fill('input[name="email"]', credentials[role].email);
  await page.fill('input[name="password"]', credentials[role].password);
  await page.click('button[type="submit"]');

  // Wait for navigation after login
  await page.waitForURL(/\/(dashboard|order-queue)/);
  await page.waitForLoadState('networkidle');
}

test.describe('Order Fulfillment Workflow', () => {
  test.beforeEach(async ({ page }) => {
    // Login as supervisor to create test order
    await login(page, 'supervisor');
  });

  test('complete order fulfillment: pick → pack → ship', async ({ page, context }) => {
    // ========================================================================
    // Step 1: Create Test Order (as Supervisor)
    // ========================================================================
    await page.goto(`${BASE_URL}/orders`);

    // Create new order button
    await page.click('button:has-text("New Order")');

    // Fill order form
    await page.fill('input[name="customerName"]', 'E2E Test Customer');
    await page.fill('input[name="customerAddress"]', '123 Test Street, Test City, TC 12345');

    // Add items
    await page.click('button:has-text("Add Item")');
    await page.fill('input[name="sku[]"]', 'E2E-SKU-001');
    await page.fill('input[name="quantity[]"]', '2');

    await page.click('button:has-text("Add Item")');
    await page.fill('input[name="sku[]"]', 'E2E-SKU-002');
    await page.fill('input[name="quantity[]"]', '1');

    // Submit order
    await page.click('button[type="submit"]:has-text("Create Order")');

    // Get order ID from URL or success message
    const orderId = await page.locator('.order-id').textContent() || 'ORD-E2E-001';
    console.log(`Created order: ${orderId}`);

    // ========================================================================
    // Step 2: Picker Claims Order
    // ========================================================================
    await page.goto(`${BASE_URL}/login`);
    await login(page, 'picker');

    // Navigate to order queue
    await page.goto(`${BASE_URL}/order-queue`);
    await page.waitForLoadState('networkidle');

    // Find and claim the test order
    const orderCard = page.locator(`text=${orderId}`).first();
    await expect(orderCard).toBeVisible();

    await page.click(`button:has-text("Claim")`, { hasText: orderId });

    // Wait for navigation to picking page
    await page.waitForURL(`/orders/${orderId}/pick`);
    await page.waitForLoadState('networkidle');

    // ========================================================================
    // Step 3: Picker Picks Items
    // ========================================================================

    // First item: E2E-SKU-001
    await expect(page.locator('text=E2E-SKU-001')).toBeVisible();
    await expect(page.locator('text=Qty: 2')).toBeVisible();

    // Simulate scan
    const scanInput = page.locator('input[placeholder*="scan"]');
    await scanInput.fill('E2E-SKU-001');
    await page.keyboard.press('Enter');

    // Wait for pick confirmation
    await expect(page.locator('text=Item picked successfully')).toBeVisible({ timeout: 5000 });

    // Verify progress updated
    await expect(page.locator('text=Progress: 50%')).toBeVisible();

    // Second item: E2E-SKU-002
    await expect(page.locator('text=E2E-SKU-002')).toBeVisible();
    await expect(page.locator('text=Qty: 1')).toBeVisible();

    await scanInput.fill('E2E-SKU-002');
    await page.keyboard.press('Enter');

    // Wait for pick confirmation
    await expect(page.locator('text=Item picked successfully')).toBeVisible({ timeout: 5000 });

    // Verify all items picked
    await expect(page.locator('text=Progress: 100%')).toBeVisible();
    await expect(page.locator('text=Complete Order')).toBeVisible();

    // Complete picking
    await page.click('button:has-text("Complete Order")');

    // Verify order completed
    await expect(page.locator('text=Order completed successfully')).toBeVisible();

    // Should redirect to order queue
    await page.waitForURL(`${BASE_URL}/order-queue`);

    // ========================================================================
    // Step 4: Packer Processes Order
    // ========================================================================
    await page.goto(`${BASE_URL}/login`);
    await login(page, 'packer');

    // Navigate to packing queue
    await page.goto(`${BASE_URL}/packing-queue`);
    await page.waitForLoadState('networkidle');

    // Find the test order
    const packOrderCard = page.locator(`text=${orderId}`).first();
    await expect(packOrderCard).toBeVisible();

    await page.click('button:has-text("Start Packing")', { hasText: orderId });

    // Wait for navigation to packing page
    await page.waitForURL(`/orders/${orderId}/pack`);
    await page.waitForLoadState('networkidle');

    // ========================================================================
    // Step 5: Packer Selects Package and Carrier
    // ========================================================================

    // Verify items are displayed
    await expect(page.locator('text=E2E-SKU-001')).toBeVisible();
    await expect(page.locator('text=E2E-SKU-002')).toBeVisible();

    // Select package type
    await page.click('button:has-text("Medium Box")');

    // Select carrier
    await page.click('button:has-text("FedEx")');

    // Select service level
    await page.click('button:has-text("Ground")');

    // Enter package weight
    await page.fill('input[name="weight"]', '2.5');

    // ========================================================================
    // Step 6: Generate Shipping Label
    // ========================================================================
    await page.click('button:has-text("Generate Label")');

    // Wait for label generation
    await expect(page.locator('text=Label generated successfully')).toBeVisible({ timeout: 10000 });

    // Verify tracking number is displayed
    const trackingNumber = page.locator('text=1Z');
    await expect(trackingNumber).toBeVisible();

    // ========================================================================
    // Step 7: Complete Packing
    // ========================================================================
    await page.click('button:has-text("Complete Packing")');

    // Verify packing completed
    await expect(page.locator('text=Package shipped successfully')).toBeVisible();

    // Should return to packing queue
    await page.waitForURL(`${BASE_URL}/packing-queue`);

    // ========================================================================
    // Step 8: Verify Order Status (as Supervisor)
    // ========================================================================
    await page.goto(`${BASE_URL}/login`);
    await login(page, 'supervisor');

    await page.goto(`${BASE_URL}/orders`);
    await page.waitForLoadState('networkidle');

    // Search for the order
    await page.fill('input[placeholder*="search"]', orderId);

    // Verify order status is SHIPPED
    const shippedBadge = page.locator(`text=SHIPPED`);
    await expect(shippedBadge).toBeVisible();

    // Verify tracking info
    await page.click(`text=${orderId}`);
    await expect(page.locator(`text=1Z`)).toBeVisible();
  });

  test('handle exception during picking', async ({ page }) => {
    // Login as picker
    await login(page, 'picker');
    await page.goto(`${BASE_URL}/order-queue`);

    // Find an order to pick
    const orderCard = page.locator('.order-card').first();
    await orderCard.click();

    await page.click('button:has-text("Claim")');
    await page.waitForURL(/\/orders\/.*\/pick/);

    // Report exception instead of picking
    await page.click('button:has-text("Report Exception")');

    // Select exception type
    await page.click('button:has-text("Out of Stock")');

    // Enter reason
    await page.fill('textarea[name="reason"]', 'Item not found in bin location');

    // Submit exception
    await page.click('button:has-text("Submit Exception")');

    // Verify exception was logged
    await expect(page.locator('text=Exception reported successfully')).toBeVisible();

    // Verify we can continue to next item
    await expect(page.locator('text=Continue to next item')).toBeVisible();
  });

  test('handle partial pick with skip', async ({ page }) => {
    await login(page, 'picker');
    await page.goto(`${BASE_URL}/order-queue`);

    const orderCard = page.locator('.order-card').first();
    await orderCard.click();

    await page.click('button:has-text("Claim")');
    await page.waitForURL(/\/orders\/.*\/pick/);

    // Skip first item
    await page.click('button:has-text("Skip")');

    // Select skip reason
    await page.click('button:has-text("Damaged")');

    // Confirm skip
    await page.click('button:has-text("Confirm Skip")');

    // Verify item is marked as skipped
    await expect(page.locator('text=SKIPPED')).toBeVisible();

    // Continue to next item
    await page.click('button:has-text("Next Item")');

    // Pick remaining items and complete
    // ... (similar to main test)
  });

  test('handle order cancellation mid-pick', async ({ page }) => {
    await login(page, 'picker');
    await page.goto(`${BASE_URL}/order-queue`);

    // Claim order
    const orderCard = page.locator('.order-card').first();
    await orderCard.click();
    await page.click('button:has-text("Claim")');
    await page.waitForURL(/\/orders\/.*\/pick/);

    // Unclaim order
    await page.click('button:has-text("Unclaim")');

    // Confirm unclaim
    await page.click('button:has-text("Confirm Unclaim")');

    // Verify returned to order queue
    await page.waitForURL(`${BASE_URL}/order-queue`);

    // Verify order shows as PENDING again
    const unclaimedOrder = page.locator('.order-card').filter({ hasText: 'PENDING' });
    await expect(unclaimedOrder).toBeVisible();
  });

  test('verify real-time updates during picking', async ({ page, context }) => {
    // Open two browser contexts to test real-time updates
    const page2 = await context.newPage();

    // Both log in as pickers
    await login(page, 'picker');
    await login(page2, 'picker');

    // Page 1: Claim order
    await page.goto(`${BASE_URL}/order-queue`);
    const orderCard = page.locator('.order-card').first();
    const orderId = await orderCard.locator('.order-id').textContent();

    await page.click('button:has-text("Claim")');

    // Page 2: Verify order is no longer available
    await page2.goto(`${BASE_URL}/order-queue`);
    await page2.waitForLoadState('networkidle');

    const claimedOrder = page2.locator(`text=${orderId}`);
    await expect(claimedOrder).not.toBeVisible();

    // Page 2: Verify order moved to PICKING status
    await page2.click('button:has-text("PICKING"');
    await expect(page2.locator(`text=${orderId}`)).toBeVisible();

    await page2.close();
  });

  test('handle low stock warning during packing', async ({ page }) => {
    await login(page, 'packer');
    await page.goto(`${BASE_URL}/packing-queue`);

    const orderCard = page.locator('.order-card').first();
    await orderCard.click();
    await page.click('button:has-text("Start Packing")');

    // If low stock warning appears
    const lowStockWarning = page.locator('text=Low stock warning');
    if (await lowStockWarning.isVisible()) {
      await expect(page.locator('text=SKU is running low')).toBeVisible();

      // Acknowledge warning
      await page.click('button:has-text("Acknowledge")');
    }

    // Continue with packing
    await page.click('button:has-text("Medium Box")');
    await page.click('button:has-text("Generate Label")');
  });

  test('verify order priority affects queue order', async ({ page }) => {
    await login(page, 'picker');
    await page.goto(`${BASE_URL}/order-queue`);

    // HIGH priority orders should appear first
    const firstOrder = page.locator('.order-card').first();
    const priorityBadge = firstOrder.locator('.badge:has-text("HIGH")');
    await expect(priorityBadge).toBeVisible();
  });

  test('handle multiple active orders limit', async ({ page }) => {
    await login(page, 'picker');
    await page.goto(`${BASE_URL}/order-queue`);

    // Try to claim 6 orders (limit is 5)
    for (let i = 0; i < 6; i++) {
      await page.click(`button:has-text("Claim")`);

      if (i === 5) {
        // Should see error about max active orders
        await expect(page.locator('text=maximum of 5 active orders')).toBeVisible();
      }
    }
  });

  test('verify order history tracking', async ({ page }) => {
    await login(page, 'supervisor');
    await page.goto(`${BASE_URL}/orders`);

    // Click on an order
    const orderCard = page.locator('.order-card').first();
    await orderCard.click();

    // Verify timeline/history section
    await expect(page.locator('text=Order History')).toBeVisible();
    await expect(page.locator('text=Timeline')).toBeVisible();

    // Verify history entries
    await expect(page.locator('text=Created')).toBeVisible();
    await expect(page.locator('text=Claimed')).toBeVisible();
    await expect(page.locator('text=Picked')).toBeVisible();
    await expect(page.locator('text=Packed')).toBeVisible();
    await expect(page.locator('text=Shipped')).toBeVisible();
  });
});
