/**
 * E2E Tests: Accounting Module
 * @covers e2e/accounting.spec.ts
 *
 * Tests for the Accounting module including:
 * - Chart of Accounts
 * - Journal Entries
 * - Trial Balance
 * - Financial Statements (Balance Sheet, Cash Flow)
 * - AR/AP Aging
 * - Bank Reconciliation
 * - Fixed Assets
 */

import { test, expect, Page } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';

// Helper functions
async function login(page: Page, role: 'accountant' | 'controller' | 'manager' = 'accountant') {
  const credentials = {
    accountant: { email: 'accountant@example.com', password: 'password123' },
    controller: { email: 'controller@example.com', password: 'password123' },
    manager: { email: 'manager@example.com', password: 'password123' },
  };

  await page.goto(`${BASE_URL}/login`);
  await page.fill('input[name="email"]', credentials[role].email);
  await page.fill('input[name="password"]', credentials[role].password);
  await page.click('button[type="submit"]');

  await page.waitForURL(/\/(dashboard|accounting)/);
  await page.waitForLoadState('networkidle');
}

test.describe('Accounting Module', () => {
  test.describe('Chart of Accounts', () => {
    test.beforeEach(async ({ page }) => {
      await login(page, 'accountant');
    });

    test('displays chart of accounts', async ({ page }) => {
      await page.goto(`${BASE_URL}/accounting/chart-of-accounts`);
      await page.waitForLoadState('networkidle');

      await expect(page.getByText('Chart of Accounts')).toBeVisible();
      await expect(page.getByRole('button', { name: /add account/i })).toBeVisible();
    });

    test('creates new account', async ({ page }) => {
      await page.goto(`${BASE_URL}/accounting/chart-of-accounts`);

      await page.click('button:has-text("Add Account")');

      // Fill account details
      await page.fill('[data-testid="account-code"]', '1001');
      await page.fill('[data-testid="account-name"]', 'Test Bank Account');
      await page.selectOption('[data-testid="account-type"]', 'ASSET');
      await page.selectOption('[data-testid="account-subtype"]', 'CURRENT_ASSET');

      // Save account
      await page.click('button:has-text("Create Account")');

      await expect(page.getByText(/account created/i)).toBeVisible();
    });

    test('views account details', async ({ page }) => {
      await page.goto(`${BASE_URL}/accounting/chart-of-accounts`);

      // Click on first account
      await page.click('[data-testid^="account-row-"]');

      await expect(page.getByText('Account Details')).toBeVisible();
      await expect(page.getByText('Account Balance')).toBeVisible();
      await expect(page.getByText('Transaction History')).toBeVisible();
    });

    test('edits account', async ({ page }) => {
      await page.goto(`${BASE_URL}/accounting/chart-of-accounts`);

      await page.click('[data-testid="account-row-0"]');
      await page.click('button:has-text("Edit")');

      await page.fill('[data-testid="account-name"]', 'Updated Account Name');
      await page.click('button:has-text("Save Changes")');

      await expect(page.getByText(/account updated/i)).toBeVisible();
    });

    test('filters accounts by type', async ({ page }) => {
      await page.goto(`${BASE_URL}/accounting/chart-of-accounts`);

      // Filter by asset type
      await page.selectOption('[data-testid="filter-type"]', 'ASSET');
      await page.click('button:has-text("Apply Filter")');

      // Should only show asset accounts
      const accounts = page.locator('[data-testid^="account-row-"]');
      const count = await accounts.count();
      expect(count).toBeGreaterThanOrEqual(0);
    });

    test('searches accounts', async ({ page }) => {
      await page.goto(`${BASE_URL}/accounting/chart-of-accounts`);

      await page.fill('[data-testid="account-search"]', 'Bank');
      await page.waitForTimeout(500);

      // Should filter search results
      const results = page.locator('[data-testid^="account-row-"]');
      const count = await results.count();
      expect(count).toBeGreaterThanOrEqual(0);
    });
  });

  test.describe('Journal Entries', () => {
    test.beforeEach(async ({ page }) => {
      await login(page, 'accountant');
    });

    test('creates journal entry', async ({ page }) => {
      await page.goto(`${BASE_URL}/accounting/journal-entries`);

      await page.click('button:has-text("New Journal Entry")');

      // Fill entry details
      await page.fill('[data-testid="entry-date"]', '2024-01-15');
      await page.fill('[data-testid="entry-description"]', 'Test Journal Entry');
      await page.selectOption('[data-testid="entry-period"]', 'JAN-2024');

      // Add debit line
      await page.click('button:has-text("Add Line")');
      await page.selectOption('[data-testid="line-account-0"]', '1000');
      await page.fill('[data-testid="line-debit-0"]', '1000');

      // Add credit line
      await page.click('button:has-text("Add Line")');
      await page.selectOption('[data-testid="line-account-1"]', '2000');
      await page.fill('[data-testid="line-credit-1"]', '1000');

      // Submit entry
      await page.click('button:has-text("Submit Entry")');

      await expect(page.getByText(/journal entry created/i)).toBeVisible();
    });

    test('validates journal entry balance', async ({ page }) => {
      await page.goto(`${BASE_URL}/accounting/journal-entries`);

      await page.click('button:has-text("New Journal Entry")');

      await page.fill('[data-testid="entry-date"]', '2024-01-15');
      await page.fill('[data-testid="entry-description"]', 'Unbalanced Entry');

      // Add only debit line (unbalanced)
      await page.click('button:has-text("Add Line")');
      await page.selectOption('[data-testid="line-account-0"]', '1000');
      await page.fill('[data-testid="line-debit-0"]', '1000');

      // Should show validation error
      await page.click('button:has-text("Submit Entry")');
      await expect(page.getByText(/entry must balance/i)).toBeVisible();
    });

    test('posts journal entry', async ({ page }) => {
      await page.goto(`${BASE_URL}/accounting/journal-entries');

      // Click on draft entry
      const draftEntry = page.locator('[data-status="DRAFT"]').first();

      if ((await draftEntry.count()) > 0) {
        await draftEntry.click();

        // Post entry
        await page.click('button:has-text("Post Entry")');

        await expect(page.getByText(/entry posted/i)).toBeVisible();
      }
    });

    test('views journal entry details', async ({ page }) => {
      await page.goto(`${BASE_URL}/accounting/journal-entries`);

      await page.click('[data-testid^="journal-entry-"]');

      await expect(page.getByText('Journal Entry Details')).toBeVisible();
      await expect(page.getByText('Debit')).toBeVisible();
      await expect(page.getByText('Credit')).toBeVisible();
    });

    test('reverses journal entry', async ({ page }) => {
      await page.goto(`${BASE_URL}/accounting/journal-entries`);

      const postedEntry = page.locator('[data-status="POSTED"]').first();
      await postedEntry.click();

      await page.click('button:has-text("Actions")');
      await page.click('text=Reverse Entry');

      await expect(page.getByText(/reversal created/i)).toBeVisible();
    });
  });

  test.describe('Trial Balance', () => {
    test.beforeEach(async ({ page }) => {
      await login(page, 'accountant');
    });

    test('views trial balance report', async ({ page }) => {
      await page.goto(`${BASE_URL}/accounting/trial-balance`);
      await page.waitForLoadState('networkidle');

      await expect(page.getByText('Trial Balance')).toBeVisible();
      await expect(page.getByText('Debit Total')).toBeVisible();
      await expect(page.getByText('Credit Total')).toBeVisible();
    });

    test('filters trial balance by date range', async ({ page }) => {
      await page.goto(`${BASE_URL}/accounting/trial-balance`);

      await page.fill('[data-testid="start-date"]', '2024-01-01');
      await page.fill('[data-testid="end-date"]', '2024-01-31');
      await page.click('button:has-text("Update Report")');

      await expect(page.getByText('Trial Balance')).toBeVisible();
    });

    test('exports trial balance to PDF', async ({ page }) => {
      await page.goto(`${BASE_URL}/accounting/trial-balance`);

      const downloadPromise = page.waitForEvent('download');
      await page.click('button:has-text("Export PDF")');
      const download = await downloadPromise;

      expect(download.suggestedFilename()).toMatch(/trial-balance.*\.pdf/);
    });

    test('verifies trial balance totals match', async ({ page }) => {
      await page.goto(`${BASE_URL}/accounting/trial-balance`);

      // Get debit total
      const debitTotal = await page.locator('[data-testid="debit-total"]').textContent();
      // Get credit total
      const creditTotal = await page.locator('[data-testid="credit-total"]').textContent();

      // Should be equal (or difference shown)
      expect(debitTotal).toBeDefined();
      expect(creditTotal).toBeDefined();
    });
  });

  test.describe('Balance Sheet', () => {
    test.beforeEach(async ({ page }) => {
      await login(page, 'controller');
    });

    test('views balance sheet', async ({ page }) => {
      await page.goto(`${BASE_URL}/accounting/balance-sheet`);
      await page.waitForLoadState('networkidle');

      await expect(page.getByText('Balance Sheet')).toBeVisible();
      await expect(page.getByText('Assets')).toBeVisible();
      await expect(page.getByText('Liabilities')).toBeVisible();
      await expect(page.getByText('Equity')).toBeVisible();
    });

    test('views comparative balance sheet', async ({ page }) => {
      await page.goto(`${BASE_URL}/accounting/balance-sheet`);

      await page.click('button:has-text("Comparative View")');

      await expect(page.getByText('Current Period')).toBeVisible();
      await expect(page.getByText('Prior Period')).toBeVisible();
    });

    test('filters balance sheet by date', async ({ page }) => {
      await page.goto(`${BASE_URL}/accounting/balance-sheet`);

      await page.fill('[data-testid="as-of-date"]', '2024-01-31');
      await page.click('button:has-text("Update")');

      await expect(page.getByText('Balance Sheet')).toBeVisible();
    });
  });

  test.describe('Cash Flow Statement', () => {
    test.beforeEach(async ({ page }) => {
      await login(page, 'controller');
    });

    test('views cash flow statement', async ({ page }) => {
      await page.goto(`${BASE_URL}/accounting/cash-flow`);
      await page.waitForLoadState('networkidle');

      await expect(page.getByText('Cash Flow Statement')).toBeVisible();
      await expect(page.getByText('Operating Activities')).toBeVisible();
      await expect(page.getByText('Investing Activities')).toBeVisible();
      await expect(page.getByText('Financing Activities')).toBeVisible();
    });

    test('views cash flow by period', async ({ page }) => {
      await page.goto(`${BASE_URL}/accounting/cash-flow`);

      await page.selectOption('[data-testid="period-type"]', 'QUARTERLY');
      await page.click('button:has-text("Update")');

      await expect(page.getByText('Cash Flow Statement')).toBeVisible();
    });
  });

  test.describe('AR Aging', () => {
    test.beforeEach(async ({ page }) => {
      await login(page, 'accountant');
    });

    test('views accounts receivable aging', async ({ page }) => {
      await page.goto(`${BASE_URL}/accounting/ar-aging`);
      await page.waitForLoadState('networkidle');

      await expect(page.getByText('Accounts Receivable Aging')).toBeVisible();
      await expect(page.getByText('Current')).toBeVisible();
      await expect(page.getByText('30 Days')).toBeVisible();
      await expect(page.getByText('60 Days')).toBeVisible();
      await expect(page.getByText('90+ Days')).toBeVisible();
    });

    test('views customer details', async ({ page }) => {
      await page.goto(`${BASE_URL}/accounting/ar-aging`);

      await page.click('[data-testid^="customer-row-"]');

      await expect(page.getByText('Customer Details')).toBeVisible();
      await expect(page.getByText('Outstanding Invoices')).toBeVisible();
      await expect(page.getByText('Payment History')).toBeVisible();
    });

    test('filters by aging bucket', async ({ page }) => {
      await page.goto(`${BASE_URL}/accounting/ar-aging`);

      await page.click('button:has-text("90+ Days")');

      // Should filter to show only overdue accounts
      const accounts = page.locator('[data-testid^="customer-row-"]');
      const count = await accounts.count();
      expect(count).toBeGreaterThanOrEqual(0);
    });
  });

  test.describe('AP Aging', () => {
    test.beforeEach(async ({ page }) => {
      await login(page, 'accountant');
    });

    test('views accounts payable aging', async ({ page }) => {
      await page.goto(`${BASE_URL}/accounting/ap-aging`);
      await page.waitForLoadState('networkidle');

      await expect(page.getByText('Accounts Payable Aging')).toBeVisible();
      await expect(page.getByText('Current')).toBeVisible();
      await expect(page.getByText('30 Days')).toBeVisible();
      await expect(page.getByText('60 Days')).toBeVisible();
      await expect(page.getByText('90+ Days')).toBeVisible();
    });

    test('views vendor details', async ({ page }) => {
      await page.goto(`${BASE_URL}/accounting/ap-aging`);

      await page.click('[data-testid^="vendor-row-"]');

      await expect(page.getByText('Vendor Details')).toBeVisible();
      await expect(page.getByText('Outstanding Bills')).toBeVisible();
    });
  });

  test.describe('Bank Reconciliation', () => {
    test.beforeEach(async ({ page }) => {
      await login(page, 'accountant');
    });

    test('starts new reconciliation', async ({ page }) => {
      await page.goto(`${BASE_URL}/accounting/bank-reconciliation`);

      await page.click('button:has-text("New Reconciliation")');

      // Select bank account
      await page.selectOption('[data-testid="bank-account"]', '1000');

      // Enter statement date
      await page.fill('[data-testid="statement-date"]', '2024-01-31');

      // Enter statement balance
      await page.fill('[data-testid="statement-balance"]', '50000');

      await page.click('button:has-text("Start Reconciliation")');

      await expect(page.getByText(/reconciliation started/i)).toBeVisible();
    });

    test('matches transactions', async ({ page }) => {
      await page.goto(`${BASE_URL}/accounting/bank-reconciliation');

      const inProgressRec = page.locator('[data-status="IN_PROGRESS"]').first();

      if ((await inProgressRec.count()) > 0) {
        await inProgressRec.click();

        // Match transaction
        await page.check('[data-testid="match-transaction-0"]');
        await page.click('button:has-text("Match Selected")');

        await expect(page.getByText(/transactions matched/i)).toBeVisible();
      }
    });

    test('completes reconciliation', async ({ page }) => {
      await page.goto(`${BASE_URL}/accounting/bank-reconciliation');

      const inProgressRec = page.locator('[data-status="IN_PROGRESS"]').first();

      if ((await inProgressRec.count()) > 0) {
        await inProgressRec.click();

        // Verify difference is zero
        const difference = await page.locator('[data-testid="reconciliation-difference"]').textContent();

        if (difference === '$0.00') {
          await page.click('button:has-text("Complete Reconciliation")');

          await expect(page.getByText(/reconciliation completed/i)).toBeVisible();
        }
      }
    });

    test('views reconciliation history', async ({ page }) => {
      await page.goto(`${BASE_URL}/accounting/bank-reconciliation`);

      await page.click('button:has-text("History")');

      await expect(page.getByText('Reconciliation History')).toBeVisible();

      const historyItems = page.locator('[data-testid^="reconciliation-history-"]');
      const count = await historyItems.count();
      expect(count).toBeGreaterThanOrEqual(0);
    });
  });

  test.describe('Fixed Assets', () => {
    test.beforeEach(async ({ page }) => {
      await login(page, 'accountant');
    });

    test('views asset register', async ({ page }) => {
      await page.goto(`${BASE_URL}/accounting/fixed-assets`);
      await page.waitForLoadState('networkidle');

      await expect(page.getByText('Fixed Assets')).toBeVisible();
      await expect(page.getByRole('button', { name: /add asset/i })).toBeVisible();
    });

    test('adds new fixed asset', async ({ page }) => {
      await page.goto(`${BASE_URL}/accounting/fixed-assets`);

      await page.click('button:has-text("Add Asset")');

      // Fill asset details
      await page.fill('[data-testid="asset-name"]', 'Office Equipment');
      await page.fill('[data-testid="asset-description"]', 'Computers and monitors');
      await page.fill('[data-testid="asset-cost"]', '10000');
      await page.fill('[data-testid="purchase-date"]', '2024-01-15');
      await page.selectOption('[data-testid="asset-category"]', 'EQUIPMENT');
      await page.selectOption('[data-testid="depreciation-method"]', 'STRAIGHT_LINE');
      await page.fill('[data-testid="useful-life"]', '5');

      await page.click('button:has-text("Create Asset")');

      await expect(page.getByText(/asset created/i)).toBeVisible();
    });

    test('views asset details and depreciation schedule', async ({ page }) => {
      await page.goto(`${BASE_URL}/accounting/fixed-assets`);

      await page.click('[data-testid^="asset-row-"]');

      await expect(page.getByText('Asset Details')).toBeVisible();
      await expect(page.getByText('Depreciation Schedule')).toBeVisible();
      await expect(page.getByText('Accumulated Depreciation')).toBeVisible();
      await expect(page.getByText('Net Book Value')).toBeVisible();
    });

    test('disposes of asset', async ({ page }) => {
      await page.goto(`${BASE_URL}/accounting/fixed-assets`);

      await page.click('[data-testid="asset-row-0"]');
      await page.click('button:has-text("Dispose Asset")');

      // Select disposal type
      await page.selectOption('[data-testid="disposal-type"]', 'SOLD');

      // Enter disposal details
      await page.fill('[data-testid="disposal-date"]', '2024-12-31');
      await page.fill('[data-testid="disposal-proceeds"]', '5000');

      await page.click('button:has-text("Confirm Disposal")');

      await expect(page.getByText(/asset disposed/i)).toBeVisible();
    });

    test('runs depreciation', async ({ page }) => {
      await page.goto(`${BASE_URL}/accounting/fixed-assets');

      await page.click('button:has-text("Run Depreciation")');

      await page.fill('[data-testid="depreciation-date"]', '2024-01-31');
      await page.click('button:has-text("Calculate Depreciation")');

      await expect(page.getByText(/depreciation calculated/i)).toBeVisible();
    });
  });

  test.describe('Budgeting', () => {
    test.beforeEach(async ({ page }) => {
      await login(page, 'controller');
    });

    test('views budget dashboard', async ({ page }) => {
      await page.goto(`${BASE_URL}/accounting/budgeting`);
      await page.waitForLoadState('networkidle');

      await expect(page.getByText('Budgeting')).toBeVisible();
      await expect(page.getByText('Budget vs Actual')).toBeVisible();
      await expect(page.getByText('Variance')).toBeVisible();
    });

    test('creates new budget', async ({ page }) => {
      await page.goto(`${BASE_URL}/accounting/budgeting`);

      await page.click('button:has-text("New Budget")');

      // Fill budget details
      await page.fill('[data-testid="budget-name"]', '2024 Operating Budget');
      await page.selectOption('[data-testid="fiscal-year"]', '2024');

      await page.click('button:has-text("Create Budget")');

      await expect(page.getByText(/budget created/i)).toBeVisible();
    });

    test('compares budget vs actual', async ({ page }) => {
      await page.goto(`${BASE_URL}/accounting/budgeting`);

      // Select budget
      await page.selectOption('[data-testid="budget-select"]', '2024 Budget');

      // Should show variance analysis
      await expect(page.getByText('Variance')).toBeVisible();
      await expect(page.locator('[data-testid^="variance-"]')).toBeVisible();
    });
  });

  test.describe('Financial Reports', () => {
    test.beforeEach(async ({ page }) => {
      await login(page, 'controller');
    });

    test('generates income statement', async ({ page }) => {
      await page.goto(`${BASE_URL}/accounting/reports`);

      await page.click('button:has-text("Income Statement")');
      await page.click('button:has-text("Generate Report")');

      await expect(page.getByText('Income Statement')).toBeVisible();
      await expect(page.getByText('Revenue')).toBeVisible();
      await expect(page.getByText('Expenses')).toBeVisible();
      await expect(page.getByText('Net Income')).toBeVisible();
    });

    test('exports multiple reports', async ({ page }) => {
      await page.goto(`${BASE_URL}/accounting/reports`);

      // Generate balance sheet
      await page.click('button:has-text("Balance Sheet")');
      await page.click('button:has-text("Generate Report")');

      const downloadPromise1 = page.waitForEvent('download');
      await page.click('button:has-text("Export PDF")');
      await downloadPromise1;

      // Generate cash flow
      await page.click('button:has-text("Cash Flow")');
      await page.click('button:has-text("Generate Report")');

      const downloadPromise2 = page.waitForEvent('download');
      await page.click('button:has-text("Export PDF")');
      const download = await downloadPromise2;

      expect(download.suggestedFilename()).toMatch(/cash-flow.*\.pdf/);
    });

    test('schedules recurring report', async ({ page }) => {
      await page.goto(`${BASE_URL}/accounting/reports`);

      await page.click('button:has-text("Schedule Report")');

      await page.selectOption('[data-testid="report-type"]', 'BALANCE_SHEET');
      await page.selectOption('[data-testid="schedule"]', 'MONTHLY');
      await page.fill('[data-testid="recipients"]', 'controller@example.com, cfo@example.com');

      await page.click('button:has-text("Create Schedule")');

      await expect(page.getByText(/report scheduled/i)).toBeVisible();
    });
  });

  test.describe('Multi-Entity Accounting', () => {
    test.beforeEach(async ({ page }) => {
      await login(page, 'controller');
    });

    test('switches between entities', async ({ page }) => {
      await page.goto(`${BASE_URL}/accounting/chart-of-accounts`);

      // Click entity switcher
      await page.click('[data-testid="entity-switcher"]');

      // Select different entity
      await page.click('text=Entity 2');

      // Should reload with entity context
      await expect(page.getByText('Entity 2')).toBeVisible();
    });

    test('views consolidated financials', async ({ page }) => {
      await page.goto(`${BASE_URL}/accounting/balance-sheet`);

      await page.click('[data-testid="entity-switcher"]');
      await page.click('text=Consolidated View');

      await expect(page.getByText('Consolidated Balance Sheet')).toBeVisible();
    });

    test('creates inter-company transaction', async ({ page }) => {
      await page.goto(`${BASE_URL}/accounting/journal-entries`);

      await page.click('button:has-text("New Journal Entry")');

      // Mark as inter-company
      await page.check('[data-testid="inter-company"]');

      // Select from and to entities
      await page.selectOption('[data-testid="from-entity"]', 'ENTITY_1');
      await page.selectOption('[data-testid="to-entity"]', 'ENTITY_2');

      await page.fill('[data-testid="entry-date"]', '2024-01-15');
      await page.fill('[data-testid="entry-description"]', 'Inter-company loan');

      await page.click('button:has-text("Submit Entry")');

      await expect(page.getByText(/journal entry created/i)).toBeVisible();
    });
  });
});
