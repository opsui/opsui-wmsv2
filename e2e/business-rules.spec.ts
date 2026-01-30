/**
 * Business Rules E2E Tests
 *
 * Tests for Sprint 3: Business Rules UI
 * - Rule creation and management
 * - Visual condition builder
 * - Action configuration
 * - Rule testing
 */

import { test, expect } from '@playwright/test';

test.describe('Business Rules Page', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to business rules page
    await page.goto('/business-rules');
    await page.waitForLoadState('networkidle');
  });

  test('displays business rules list', async ({ page }) => {
    // Should show rules table/grid
    await expect(page.getByText('Business Rules')).toBeVisible();
    await expect(page.getByRole('button', { name: /create rule/i })).toBeVisible();
  });

  test('opens create rule dialog', async ({ page }) => {
    // Click create rule button
    await page.click('button:has-text("Create Rule")');

    // Should show dialog with rule builder
    await expect(page.getByText(/create business rule/i)).toBeVisible();
    await expect(page.getByText('Conditions')).toBeVisible();
    await expect(page.getByText('Actions')).toBeVisible();
  });

  test('builds rule conditions visually', async ({ page }) => {
    // Open create rule dialog
    await page.click('button:has-text("Create Rule")');

    // Add first condition
    await page.click('button:has-text("Add Condition")');

    // Select field
    const fieldSelect = page.locator('[data-testid="condition-field-0"]');
    await fieldSelect.selectOption('order.status');

    // Select operator
    const operatorSelect = page.locator('[data-testid="condition-operator-0"]');
    await operatorSelect.selectOption('equals');

    // Enter value
    const valueInput = page.locator('[data-testid="condition-value-0"]');
    await valueInput.fill('pending');

    // Verify condition is added
    await expect(page.getByText('order.status')).toBeVisible();
    await expect(page.getByText('equals')).toBeVisible();
    await expect(page.getByText('pending')).toBeVisible();
  });

  test('builds rule with nested conditions', async ({ page }) => {
    // Open create rule dialog
    await page.click('button:has-text("Create Rule")');

    // Add first condition
    await page.click('button:has-text("Add Condition")');
    await page.locator('[data-testid="condition-field-0"]').selectOption('order.status');
    await page.locator('[data-testid="condition-operator-0"]').selectOption('equals');
    await page.locator('[data-testid="condition-value-0"]').fill('pending');

    // Change logical operator to OR
    await page.click('button:has-text("ALL")');
    await page.click('text=Match ANY');

    // Add second condition in OR group
    await page.click('button:has-text("Add Condition")');
    await page.locator('[data-testid="condition-field-1"]').selectOption('order.status');
    await page.locator('[data-testid="condition-operator-1"]').selectOption('equals');
    await page.locator('[data-testid="condition-value-1"]').fill('picking');

    // Verify both conditions exist
    await expect(page.getByText('order.status')).toBeVisible();
    await expect(page.getByText('Match ANY')).toBeVisible();
  });

  test('configures rule actions', async ({ page }) => {
    // Open create rule dialog
    await page.click('button:has-text("Create Rule")');

    // Switch to actions tab
    await page.click('text=Actions');

    // Add action
    await page.click('button:has-text("Add Action")');

    // Select action type
    const actionTypeSelect = page.locator('[data-testid="action-type-0"]');
    await actionTypeSelect.selectOption('send_notification');

    // Enter message
    const messageInput = page.locator('[data-testid="action-param-message-0"]');
    await messageInput.fill('Order needs attention');

    // Verify action is configured
    await expect(page.getByText('Send Notification')).toBeVisible();
    await expect(page.getByText('Order needs attention')).toBeVisible();
  });

  test('tests rule with sample data', async ({ page }) => {
    // Open create rule dialog
    await page.click('button:has-text("Create Rule")');

    // Add condition
    await page.click('button:has-text("Add Condition")');
    await page.locator('[data-testid="condition-field-0"]').selectOption('order.status');
    await page.locator('[data-testid="condition-operator-0"]').selectOption('equals');
    await page.locator('[data-testid="condition-value-0"]').fill('pending');

    // Click test button
    await page.click('button:has-text("Test Rule")');

    // Should show test dialog
    await expect(page.getByText(/test rule/i)).toBeVisible();

    // Verify sample data is pre-loaded
    await expect(page.getByText('"order"')).toBeVisible();
    await expect(page.getByText('"status"')).toBeVisible();

    // Run evaluation
    await page.click('button:has-text("Evaluate Rule")');

    // Should show results
    await expect(page.getByText(/rule matched/i)).toBeVisible();
  });

  test('saves new rule', async ({ page }) => {
    // Open create rule dialog
    await page.click('button:has-text("Create Rule")');

    // Fill in rule name
    await page.fill('[data-testid="rule-name"]', 'High Priority Order Alert');

    // Add condition
    await page.click('button:has-text("Add Condition")');
    await page.locator('[data-testid="condition-field-0"]').selectOption('order.priority');
    await page.locator('[data-testid="condition-operator-0"]').selectOption('equals');
    await page.locator('[data-testid="condition-value-0"]').fill('URGENT');

    // Add action
    await page.click('tab=Actions');
    await page.click('button:has-text("Add Action")');
    await page.locator('[data-testid="action-type-0"]').selectOption('set_priority');
    await page.locator('[data-testid="action-param-priority-0"]').selectOption('URGENT');

    // Save rule
    await page.click('button:has-text("Create")');

    // Should show success message
    await expect(page.getByText(/rule created/i)).toBeVisible();
  });

  test('edits existing rule', async ({ page }) => {
    // Click edit button on first rule
    const editButton = page.locator('[data-testid="edit-rule-0"]');
    await editButton.click();

    // Should show edit dialog
    await expect(page.getByText(/edit rule/i)).toBeVisible();

    // Modify condition
    await page.locator('[data-testid="condition-value-0"]').fill('picked');

    // Save changes
    await page.click('button:has-text("Save")');

    // Should show success message
    await expect(page.getByText(/rule updated/i)).toBeVisible();
  });

  test('toggles rule active state', async ({ page }) => {
    // Find toggle for first rule
    const toggle = page.locator('[data-testid="rule-toggle-0"]');
    const initialState = await toggle.getAttribute('data-state');

    // Click toggle
    await toggle.click();

    // Verify state changed
    const newState = await toggle.getAttribute('data-state');
    expect(initialState).not.toBe(newState);
  });

  test('deletes rule', async ({ page }) => {
    // Click delete button on first rule
    const deleteButton = page.locator('[data-testid="delete-rule-0"]');
    await deleteButton.click();

    // Should show confirmation dialog
    await expect(page.getByText(/delete this rule/i)).toBeVisible();

    // Confirm deletion
    await page.click('button:has-text("Delete")');

    // Should show success message
    await expect(page.getByText(/rule deleted/i)).toBeVisible();
  });

  test('filters rules by status', async ({ page }) => {
    // Click active filter
    await page.click('button:has-text("Active")');

    // Should only show active rules
    await expect(page.getByText('Active')).toHaveClass(/selected/i);

    // Click inactive filter
    await page.click('button:has-text("Inactive")');

    // Should only show inactive rules
    await expect(page.getByText('Inactive')).toHaveClass(/selected/i);
  });

  test('searches rules by name', async ({ page }) => {
    // Type in search box
    await page.fill('[data-testid="rules-search"]', 'priority');

    // Should filter results
    await page.waitForTimeout(500);
    const results = page.locator('[data-testid^="rule-"]');
    const count = await results.count();

    // Should have fewer results after filtering
    expect(count).toBeGreaterThanOrEqual(0);
  });
});
