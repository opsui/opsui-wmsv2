/**
 * E2E Tests: HR & Payroll Module
 * @covers e2e/hr-payroll.spec.ts
 *
 * Tests for the HR and Payroll module including:
 * - Employee management
 * - Timesheet processing
 * - Leave requests
 * - Payroll runs
 * - HR reporting
 */

import { test, expect, Page } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';

// Helper functions
async function login(page: Page, role: 'hr' | 'payroll' | 'manager' | 'employee' = 'hr') {
  const credentials = {
    hr: { email: 'hr@example.com', password: 'password123' },
    payroll: { email: 'payroll@example.com', password: 'password123' },
    manager: { email: 'manager@example.com', password: 'password123' },
    employee: { email: 'employee@example.com', password: 'password123' },
  };

  await page.goto(`${BASE_URL}/login`);
  await page.fill('input[name="email"]', credentials[role].email);
  await page.fill('input[name="password"]', credentials[role].password);
  await page.click('button[type="submit"]');

  await page.waitForURL(/\/(dashboard|hr)/);
  await page.waitForLoadState('networkidle');
}

test.describe('HR & Payroll Module', () => {
  test.describe('Employee Management', () => {
    test.beforeEach(async ({ page }) => {
      await login(page, 'hr');
    });

    test('displays employee list', async ({ page }) => {
      await page.goto(`${BASE_URL}/hr/employees`);
      await page.waitForLoadState('networkidle');

      await expect(page.getByText('Employees')).toBeVisible();
      await expect(page.getByRole('button', { name: /add employee/i })).toBeVisible();
    });

    test('creates new employee', async ({ page }) => {
      await page.goto(`${BASE_URL}/hr/employees`);
      await page.click('button:has-text("Add Employee")');

      // Fill employee details
      await page.fill('[data-testid="employee-first-name"]', 'John');
      await page.fill('[data-testid="employee-last-name"]', 'Doe');
      await page.fill('[data-testid="employee-email"]', 'john.doe@example.com');
      await page.fill('[data-testid="employee-phone"]', '555-123-4567');

      // Select department
      await page.selectOption('[data-testid="employee-department"]', 'WAREHOUSE');

      // Select employment type
      await page.selectOption('[data-testid="employee-type"]', 'FULL_TIME');

      // Enter hire date
      await page.fill('[data-testid="employee-hire-date"]', '2024-01-15');

      // Set salary
      await page.fill('[data-testid="employee-salary"]', '50000');

      // Save employee
      await page.click('button:has-text("Create Employee")');

      await expect(page.getByText(/employee created/i)).toBeVisible();
    });

    test('views employee details', async ({ page }) => {
      await page.goto(`${BASE_URL}/hr/employees`);

      // Click on first employee
      const employeeRow = page.locator('[data-testid^="employee-row-"]').first();
      await employeeRow.click();

      // Should navigate to employee detail page
      await expect(page.getByText('Employee Details')).toBeVisible();
      await expect(page.getByText('Personal Information')).toBeVisible();
      await expect(page.getByText('Employment Details')).toBeVisible();
      await expect(page.getByText('Compensation')).toBeVisible();
    });

    test('edits employee information', async ({ page }) => {
      await page.goto(`${BASE_URL}/hr/employees`);
      await page.click('[data-testid="employee-row-0"]');

      // Click edit button
      await page.click('button:has-text("Edit")');

      // Modify phone number
      await page.fill('[data-testid="employee-phone"]', '555-999-8888');

      // Save changes
      await page.click('button:has-text("Save Changes")');

      await expect(page.getByText(/employee updated/i)).toBeVisible();
    });

    test('terminates employee', async ({ page }) => {
      await page.goto(`${BASE_URL}/hr/employees`);
      await page.click('[data-testid="employee-row-0"]');

      // Click actions menu
      await page.click('button:has-text("Actions")');
      await page.click('text=Terminate Employee');

      // Should show termination dialog
      await expect(page.getByText(/terminate employee/i)).toBeVisible();

      // Select termination reason
      await page.selectOption('[data-testid="termination-reason"]', 'RESIGNATION');

      // Enter termination date
      await page.fill('[data-testid="termination-date"]', '2024-12-31');

      // Confirm termination
      await page.click('button:has-text("Confirm Termination")');

      await expect(page.getByText(/employee terminated/i)).toBeVisible();
    });

    test('searches and filters employees', async ({ page }) => {
      await page.goto(`${BASE_URL}/hr/employees`);

      // Search by name
      await page.fill('[data-testid="employee-search"]', 'John');
      await page.waitForTimeout(500);

      // Should filter results
      const results = page.locator('[data-testid^="employee-row-"]');
      const count = await results.count();
      expect(count).toBeGreaterThanOrEqual(0);

      // Filter by department
      await page.click('button:has-text("Filters")');
      await page.selectOption('[data-testid="filter-department"]', 'WAREHOUSE');
      await page.click('button:has-text("Apply Filters")');
    });

    test('views employee organizational chart', async ({ page }) => {
      await page.goto(`${BASE_URL}/hr/employees`);

      // Click org chart view
      await page.click('button:has-text("Org Chart")');

      await expect(page.getByText('Organizational Chart')).toBeVisible();

      // Should show hierarchy
      await expect(page.locator('.org-chart-node')).toBeVisible();
    });
  });

  test.describe('Timesheet Management', () => {
    test.beforeEach(async ({ page }) => {
      await login(page, 'employee');
    });

    test('submits timesheet', async ({ page }) => {
      await page.goto(`${BASE_URL}/hr/timesheets`);
      await page.waitForLoadState('networkidle');

      // Click new timesheet button
      await page.click('button:has-text("New Timesheet")');

      // Select pay period
      await page.selectOption('[data-testid="pay-period"]', 'WEEKLY');

      // Add time entries
      await page.click('button:has-text("Add Entry")');
      await page.fill('[data-testid="entry-date-0"]', '2024-01-15');
      await page.fill('[data-testid="entry-hours-0"]', '8');
      await page.selectOption('[data-testid="entry-type-0"]', 'REGULAR');

      // Add overtime entry
      await page.click('button:has-text("Add Entry")');
      await page.fill('[data-testid="entry-date-1"]', '2024-01-16');
      await page.fill('[data-testid="entry-hours-1"]', '2');
      await page.selectOption('[data-testid="entry-type-1"]', 'OVERTIME');

      // Submit timesheet
      await page.click('button:has-text("Submit Timesheet")');

      await expect(page.getByText(/timesheet submitted/i)).toBeVisible();
    });

    test('views timesheet history', async ({ page }) => {
      await page.goto(`${BASE_URL}/hr/timesheets`);

      // Should show list of timesheets
      await expect(page.getByText('Timesheet History')).toBeVisible();

      const timesheets = page.locator('[data-testid^="timesheet-"]');
      const count = await timesheets.count();
      expect(count).toBeGreaterThanOrEqual(0);
    });

    test('edits draft timesheet', async ({ page }) => {
      await page.goto(`${BASE_URL}/hr/timesheets`);

      // Find draft timesheet
      const draftTimesheet = page.locator('[data-status="DRAFT"]').first();

      if ((await draftTimesheet.count()) > 0) {
        await draftTimesheet.click();

        // Modify entry
        await page.fill('[data-testid="entry-hours-0"]', '7.5');

        // Save as draft
        await page.click('button:has-text("Save Draft")');

        await expect(page.getByText(/timesheet saved/i)).toBeVisible();
      }
    });
  });

  test.describe('Timesheet Approval (Manager)', () => {
    test.beforeEach(async ({ page }) => {
      await login(page, 'manager');
    });

    test('approves timesheet', async ({ page }) => {
      await page.goto(`${BASE_URL}/hr/timesheets`);
      await page.click('button:has-text("Pending Approval")');

      // Select pending timesheet
      const pendingTimesheet = page.locator('[data-testid^="timesheet-"]').first();
      await pendingTimesheet.click();

      // Review details
      await expect(page.getByText('Timesheet Details')).toBeVisible();

      // Approve timesheet
      await page.click('button:has-text("Approve")');
      await page.click('button:has-text("Confirm Approval")');

      await expect(page.getByText(/timesheet approved/i)).toBeVisible();
    });

    test('rejects timesheet with reason', async ({ page }) => {
      await page.goto(`${BASE_URL}/hr/timesheets`);
      await page.click('button:has-text("Pending Approval")');

      const pendingTimesheet = page.locator('[data-testid^="timesheet-"]').first();
      await pendingTimesheet.click();

      // Reject timesheet
      await page.click('button:has-text("Reject")');

      // Enter rejection reason
      await page.fill('[data-testid="rejection-reason"]', 'Incorrect hours logged');

      // Submit rejection
      await page.click('button:has-text("Confirm Rejection")');

      await expect(page.getByText(/timesheet rejected/i)).toBeVisible();
    });

    test('bulk approves timesheets', async ({ page }) => {
      await page.goto(`${BASE_URL}/hr/timesheets`);
      await page.click('button:has-text("Pending Approval")');

      // Select multiple timesheets
      await page.check('[data-testid="select-timesheet-0"]');
      await page.check('[data-testid="select-timesheet-1"]');

      // Bulk approve
      await page.click('button:has-text("Bulk Approve")');
      await page.click('button:has-text("Confirm")');

      await expect(page.getByText(/timesheets approved/i)).toBeVisible();
    });
  });

  test.describe('Leave Management', () => {
    test.beforeEach(async ({ page }) => {
      await login(page, 'employee');
    });

    test('requests leave', async ({ page }) => {
      await page.goto(`${BASE_URL}/hr/leave`);
      await page.waitForLoadState('networkidle');

      // Click new request button
      await page.click('button:has-text("Request Leave")');

      // Select leave type
      await page.selectOption('[data-testid="leave-type"]', 'ANNUAL');

      // Set date range
      await page.fill('[data-testid="leave-start-date"]', '2024-02-01');
      await page.fill('[data-testid="leave-end-date"]', '2024-02-05');

      // Add notes
      await page.fill('[data-testid="leave-notes"]', 'Family vacation');

      // Submit request
      await page.click('button:has-text("Submit Request")');

      await expect(page.getByText(/leave request submitted/i)).toBeVisible();
    });

    test('views leave balance', async ({ page }) => {
      await page.goto(`${BASE_URL}/hr/leave-balances`);

      await expect(page.getByText('Leave Balances')).toBeVisible();

      // Should show different leave types
      await expect(page.getByText('Annual Leave')).toBeVisible();
      await expect(page.getByText('Sick Leave')).toBeVisible();
      await expect(page.getByText('Personal Leave')).toBeVisible();
    });

    test('cancels leave request', async ({ page }) => {
      await page.goto(`${BASE_URL}/hr/leave`);

      // Find pending request
      const pendingRequest = page.locator('[data-status="PENDING"]').first();

      if ((await pendingRequest.count()) > 0) {
        await pendingRequest.click();
        await page.click('button:has-text("Cancel Request")');
        await page.click('button:has-text("Confirm Cancellation")');

        await expect(page.getByText(/request cancelled/i)).toBeVisible();
      }
    });
  });

  test.describe('Leave Approval (Manager)', () => {
    test.beforeEach(async ({ page }) => {
      await login(page, 'manager');
    });

    test('approves leave request', async ({ page }) => {
      await page.goto(`${BASE_URL}/hr/leave`);
      await page.click('button:has-text("Pending Approval")');

      const pendingRequest = page.locator('[data-testid^="leave-request-"]').first();
      await pendingRequest.click();

      // View request details
      await expect(page.getByText('Leave Request Details')).toBeVisible();

      // Approve request
      await page.click('button:has-text("Approve")');

      await expect(page.getByText(/leave approved/i)).toBeVisible();
    });

    test('checks team leave calendar', async ({ page }) => {
      await page.goto(`${BASE_URL}/hr/leave`);
      await page.click('button:has-text("Team Calendar")');

      await expect(page.getByText('Team Leave Calendar')).toBeVisible();

      // Should show calendar view
      await expect(page.locator('.calendar-grid')).toBeVisible();
    });
  });

  test.describe('Payroll Processing', () => {
    test.beforeEach(async ({ page }) => {
      await login(page, 'payroll');
    });

    test('views payroll dashboard', async ({ page }) => {
      await page.goto(`${BASE_URL}/hr/payroll`);
      await page.waitForLoadState('networkidle');

      await expect(page.getByText('Payroll Dashboard')).toBeVisible();

      // Should show key metrics
      await expect(page.getByText('Total Payroll')).toBeVisible();
      await expect(page.getByText('Active Employees')).toBeVisible();
      await expect(page.getByText('Last Pay Run')).toBeVisible();
    });

    test('creates new pay run', async ({ page }) => {
      await page.goto(`${BASE_URL}/hr/payroll-runs`);

      // Click new pay run button
      await page.click('button:has-text("New Pay Run")');

      // Select pay period
      await page.selectOption('[data-testid="pay-period-type"]', 'WEEKLY');
      await page.fill('[data-testid="period-start"]', '2024-01-15');
      await page.fill('[data-testid="period-end"]', '2024-01-21');

      // Select pay date
      await page.fill('[data-testid="pay-date"]', '2024-01-26');

      // Create pay run
      await page.click('button:has-text("Create Pay Run")');

      await expect(page.getByText(/pay run created/i)).toBeVisible();
    });

    test('processes pay run', async ({ page }) => {
      await page.goto(`${BASE_URL}/hr/payroll-runs`);

      // Click on draft pay run
      const draftRun = page.locator('[data-status="DRAFT"]').first();

      if ((await draftRun.count()) > 0) {
        await draftRun.click();

        // Review pay run details
        await expect(page.getByText('Pay Run Details')).toBeVisible();

        // Process pay run
        await page.click('button:has-text("Process Pay Run")');

        await expect(page.getByText(/pay run processed/i)).toBeVisible();
      }
    });

    test('views payslip', async ({ page }) => {
      await page.goto(`${BASE_URL}/hr/payroll-runs`);

      // Click on completed pay run
      const completedRun = page.locator('[data-status="COMPLETED"]').first();
      await completedRun.click();

      // Click on employee payslip
      await page.click('[data-testid^="payslip-"]');

      await expect(page.getByText('Payslip')).toBeVisible();
      await expect(page.getByText('Earnings')).toBeVisible();
      await expect(page.getByText('Deductions')).toBeVisible();
      await expect(page.getByText('Net Pay')).toBeVisible();
    });

    test('handles payroll adjustments', async ({ page }) => {
      await page.goto(`${BASE_URL}/hr/payroll-runs`);

      const draftRun = page.locator('[data-status="DRAFT"]').first();

      if ((await draftRun.count()) > 0) {
        await draftRun.click();

        // Add adjustment
        await page.click('button:has-text("Add Adjustment")');

        // Select employee
        await page.selectOption('[data-testid="adjustment-employee"]', 'EMP001');

        // Select adjustment type
        await page.selectOption('[data-testid="adjustment-type"]', 'BONUS');

        // Enter amount
        await page.fill('[data-testid="adjustment-amount"]', '500');

        // Save adjustment
        await page.click('button:has-text("Save Adjustment")');

        await expect(page.getByText(/adjustment added/i)).toBeVisible();
      }
    });
  });

  test.describe('HR Reports', () => {
    test.beforeEach(async ({ page }) => {
      await login(page, 'hr');
    });

    test('generates headcount report', async ({ page }) => {
      await page.goto(`${BASE_URL}/hr/reports`);

      // Select headcount report
      await page.click('button:has-text("Headcount Report")');

      // Set date range
      await page.fill('[data-testid="report-start-date"]', '2024-01-01');
      await page.fill('[data-testid="report-end-date"]', '2024-12-31');

      // Generate report
      await page.click('button:has-text("Generate Report")');

      await expect(page.getByText('Headcount Report')).toBeVisible();
    });

    test('generates turnover report', async ({ page }) => {
      await page.goto(`${BASE_URL}/hr/reports`);

      await page.click('button:has-text("Turnover Report")');
      await page.click('button:has-text("Generate Report")');

      await expect(page.getByText(/turnover rate/i)).toBeVisible();
    });

    test('exports report to CSV', async ({ page }) => {
      await page.goto(`${BASE_URL}/hr/reports`);

      await page.click('button:has-text("Headcount Report")');
      await page.click('button:has-text("Generate Report")');

      // Wait for report to load
      await page.waitForSelector('[data-testid="report-results"]');

      // Export to CSV
      const downloadPromise = page.waitForEvent('download');
      await page.click('button:has-text("Export CSV")');
      const download = await downloadPromise;

      expect(download.suggestedFilename()).toMatch(/headcount.*\.csv/);
    });
  });

  test.describe('HR Settings', () => {
    test.beforeEach(async ({ page }) => {
      await login(page, 'hr');
    });

    test('configures leave policies', async ({ page }) => {
      await page.goto(`${BASE_URL}/hr/settings`);

      await page.click('button:has-text("Leave Policies")');

      // Edit annual leave policy
      await page.click('[data-testid="edit-policy-ANNUAL"]');

      await page.fill('[data-testid="annual-allowance"]', '20');
      await page.fill('[data-testid="max-carry-over"]', '5');

      await page.click('button:has-text("Save Policy")');

      await expect(page.getByText(/policy updated/i)).toBeVisible();
    });

    test('configures pay schedules', async ({ page }) => {
      await page.goto(`${BASE_URL}/hr/settings`);

      await page.click('button:has-text("Pay Schedules")');

      // Add new pay schedule
      await page.click('button:has-text("Add Schedule")');

      await page.fill('[data-testid="schedule-name"]', 'Semi-Monthly');
      await page.selectOption('[data-testid="schedule-frequency"]', 'SEMI_MONTHLY');

      await page.click('button:has-text("Create Schedule")');

      await expect(page.getByText(/schedule created/i)).toBeVisible();
    });

    test('configures holiday calendar', async ({ page }) => {
      await page.goto(`${BASE_URL}/hr/settings`);

      await page.click('button:has-text("Holidays")');

      // Add public holiday
      await page.click('button:has-text("Add Holiday")');

      await page.fill('[data-testid="holiday-name"]', 'Company Day');
      await page.fill('[data-testid="holiday-date"]', '2024-07-01');

      await page.click('button:has-text("Add Holiday")');

      await expect(page.getByText(/holiday added/i)).toBeVisible();
    });
  });

  test.describe('Self-Service (Employee)', () => {
    test.beforeEach(async ({ page }) => {
      await login(page, 'employee');
    });

    test('views personal information', async ({ page }) => {
      await page.goto(`${BASE_URL}/hr/my-profile`);

      await expect(page.getByText('My Profile')).toBeVisible();
      await expect(page.getByText('Personal Information')).toBeVisible();
      await expect(page.getByText('Employment Details')).toBeVisible();
    });

    test('updates personal contact details', async ({ page }) => {
      await page.goto(`${BASE_URL}/hr/my-profile`);

      await page.click('button:has-text("Edit Contact Info")');

      await page.fill('[data-testid="personal-phone"]', '555-111-2222');
      await page.fill('[data-testid="personal-email"]', 'newemail@example.com');

      await page.click('button:has-text("Save Changes")');

      await expect(page.getByText(/contact info updated/i)).toBeVisible();
    });

    test('views pay history', async ({ page }) => {
      await page.goto(`${BASE_URL}/hr/my-profile');

      await page.click('button:has-text("Pay History")');

      await expect(page.getByText('Pay History')).toBeVisible();

      const payEntries = page.locator('[data-testid^="pay-entry-"]');
      const count = await payEntries.count();
      expect(count).toBeGreaterThanOrEqual(0);
    });

    test('downloads payslip', async ({ page }) => {
      await page.goto(`${BASE_URL}/hr/my-profile`);

      await page.click('button:has-text("Pay History")');

      const downloadPromise = page.waitForEvent('download');
      await page.click('[data-testid^="download-payslip-"]');
      const download = await downloadPromise;

      expect(download.suggestedFilename()).toMatch(/payslip.*\.pdf/);
    });
  });
});
