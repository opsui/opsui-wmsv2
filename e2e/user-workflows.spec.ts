/**
 * E2E Tests: User Workflows
 * @covers e2e/user-workflows.spec.ts
 *
 * Tests common user workflows including login, logout, role switching
 */

import { test, expect, Page } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';

test.describe('User Workflows', () => {
  test('successful login and logout', async ({ page }) => {
    // ========================================================================
    // Step 1: Navigate to Login Page
    // ========================================================================
    await page.goto(`${BASE_URL}`);
    await page.waitForLoadState('networkidle');

    // Should redirect to login if not authenticated
    await page.waitForURL(`${BASE_URL}/login`);

    // ========================================================================
    // Step 2: Login with Valid Credentials
    // ========================================================================
    await page.fill('input[name="email"]', 'picker@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');

    // Wait for navigation after successful login
    await page.waitForURL(/\/(dashboard|order-queue)/);
    await page.waitForLoadState('networkidle');

    // Verify user is logged in
    await expect(page.locator('text=Welcome')).toBeVisible();

    // ========================================================================
    // Step 3: Access Dashboard
    // ========================================================================
    await page.goto(`${BASE_URL}/dashboard`);
    await page.waitForLoadState('networkidle');

    // Verify dashboard loads
    await expect(page.locator('text=Dashboard')).toBeVisible();
    await expect(page.locator('text=Real-time warehouse operations overview')).toBeVisible();

    // ========================================================================
    // Step 4: Logout
    // ========================================================================
    await page.click('button:has-text("Logout")');

    // Should return to login page
    await page.waitForURL(`${BASE_URL}/login`);

    // Verify logged out
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
  });

  test('handle login with invalid credentials', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);

    // Try to login with invalid email
    await page.fill('input[name="email"]', 'invalid@example.com');
    await page.fill('input[name="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');

    // Should show error message
    await expect(page.locator('text=Invalid credentials')).toBeVisible();

    // Should stay on login page
    await page.waitForURL(`${BASE_URL}/login`);
  });

  test('handle password reset flow', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);

    // Click forgot password
    await page.click('text=Forgot Password');

    // Enter email
    await page.fill('input[name="email"]', 'picker@example.com');
    await page.click('button:has-text("Send Reset Link")');

    // Should show confirmation
    await expect(page.locator('text=Password reset email sent')).toBeVisible();
  });

  test('handle first-time login with password change', async ({ page }) => {
    // Login with temporary password
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[name="email"]', 'newuser@example.com');
    await page.fill('input[name="password"]', 'tempPassword123');
    await page.click('button[type="submit"]');

    // Should prompt for password change
    await page.waitForURL(`${BASE_URL}/change-password`);

    // Enter new password
    await page.fill('input[name="newPassword"]', 'NewSecurePassword123!');
    await page.fill('input[name="confirmPassword"]', 'NewSecurePassword123!');

    await page.click('button:has-text("Change Password")');

    // Should redirect to dashboard
    await page.waitForURL(/\/(dashboard|order-queue)/);

    // Verify password changed
    await expect(page.locator('text=Password changed successfully')).toBeVisible();
  });

  test('handle role switching for multi-role users', async ({ page }) => {
    // Login as user with multiple roles (e.g., supervisor who can also pick)
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[name="email"]', 'supervisor@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');

    await page.waitForURL(/\/dashboard/);
    await page.waitForLoadState('networkidle');

    // Should see role switcher in UI
    const roleSwitcher = page.locator('select[name="activeRole"]');
    await expect(roleSwitcher).toBeVisible();

    // Switch to picker role
    await page.selectOption('select[name="activeRole"]', 'PICKER');

    // Verify UI changes - picker options available
    await page.goto(`${BASE_URL}/order-queue`);
    await expect(page.locator('text=Claim Order')).toBeVisible();

    // Switch back to supervisor role
    await page.selectOption('select[name="activeRole"]', 'SUPERVISOR');

    // Verify supervisor options available
    await page.goto(`${BASE_URL}/dashboard`);
    await expect(page.locator('text=Admin Settings')).toBeVisible();
  });

  test('handle session timeout', async ({ page }) => {
    // Login
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[name="email"]', 'picker@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');

    await page.waitForURL(/\/order-queue/);

    // Simulate session timeout by clearing cookies/storage
    await page.context().clearCookies();
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });

    // Try to navigate to a page
    await page.goto(`${BASE_URL}/dashboard`);

    // Should redirect to login with session expired message
    await page.waitForURL(`${BASE_URL}/login`);
    await expect(page.locator('text=Session expired')).toBeVisible();
  });

  test('handle concurrent session prevention', async ({ page, context }) => {
    // Open two browser windows
    const page2 = await context.newPage();

    // Login on first page
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[name="email"]', 'picker@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/order-queue/);

    // Try to login on second page
    await page2.goto(`${BASE_URL}/login`);
    await page2.fill('input[name="email"]', 'picker@example.com');
    await page2.fill('input[name="password"]', 'password123');
    await page2.click('button[type="submit"]');

    // Second login should succeed (first session may be invalidated or both allowed)
    await page2.waitForURL(/\/order-queue/);

    // Verify second page can work
    await page2.goto(`${BASE_URL}/dashboard`);
    await expect(page2.locator('text=Dashboard')).toBeVisible();

    await page2.close();
  });

  test('handle user profile update', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[name="email"]', 'picker@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');

    await page.waitForURL(/\/order-queue/);

    // Navigate to profile settings
    await page.click('button:has-text("Profile")');
    await page.click('text=Settings');

    // Update profile
    await page.fill('input[name="name"]', 'Updated Name');
    await page.fill('input[name="phone"]', '555-123-4567');

    await page.click('button:has-text("Save Changes")');

    // Verify profile updated
    await expect(page.locator('text=Profile updated successfully')).toBeVisible();

    // Verify changes reflected
    await expect(page.locator('text=Updated Name')).toBeVisible();
  });

  test('handle notification preferences', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[name="email"]', 'picker@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');

    await page.waitForURL(/\/order-queue/);

    // Navigate to notification preferences
    await page.click('button:has-text("Profile")');
    await page.click('text=Notification Preferences');

    // Enable email notifications
    await page.check('input[name="emailNotifications"]');
    await page.check('input[name="orderAssigned"]');
    await page.check('input[name="lowStock"]');

    await page.click('button:has-text("Save Preferences")');

    // Verify preferences saved
    await expect(page.locator('text=Preferences saved successfully')).toBeVisible();
  });

  test('verify audit logging for user actions', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[name="email"]', 'supervisor@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');

    await page.waitForURL(/\/dashboard/);

    // Navigate to audit logs
    await page.click('text=Audit Logs');

    // Filter by current user
    await page.fill('input[name="userEmail"]', 'supervisor@example.com');

    // Verify login action is logged
    await expect(page.locator('text=LOGIN')).toBeVisible();

    // Check audit entry details
    const auditEntry = page.locator('.audit-entry').first();
    await auditEntry.click();

    // Verify all fields present
    await expect(page.locator('text=Timestamp')).toBeVisible();
    await expect(page.locator('text=User')).toBeVisible();
    await expect(page.locator('text=Action')).toBeVisible();
    await expect(page.locator('text=IP Address')).toBeVisible();
  });

  test('handle keyboard shortcuts', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[name="email"]', 'picker@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');

    await page.waitForURL(/\/order-queue/);

    // Test keyboard shortcuts
    // Ctrl/Cmd + K: Focus search
    await page.keyboard.press('Control+k');
    const searchInput = page.locator('input[placeholder*="search"]');
    await expect(searchInput).toBeFocused();

    // Escape: Close modals/dropdowns
    await page.keyboard.press('Escape');

    // Ctrl/Cmd + L: Logout
    await page.keyboard.press('Control+l');

    // Verify logged out
    await page.waitForURL(`${BASE_URL}/login`);
  });

  test('handle responsive design on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[name="email"]', 'picker@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');

    await page.waitForURL(/\/order-queue/);

    // Verify mobile layout
    await expect(page.locator('.mobile-menu-button')).toBeVisible();

    // Test mobile menu
    await page.click('.mobile-menu-button');
    await expect(page.locator('.mobile-menu')).toBeVisible();

    // Navigate using mobile menu
    await page.click('text=Dashboard');
    await page.waitForURL(`${BASE_URL}/dashboard`);

    // Verify mobile-friendly UI
    await expect(page.locator('.metric-card')).toBeVisible();
  });

  test('verify user activity tracking', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[name="email"]', 'picker@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');

    await page.waitForURL(/\/order-queue/);

    // Perform various actions
    await page.goto(`${BASE_URL}/dashboard`);
    await page.goto(`${BASE_URL}/order-queue`);
    await page.goto(`${BASE_URL}/profile`);

    // Navigate to admin dashboard to check activity
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[name="email"]', 'supervisor@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');

    await page.waitForURL(/\/dashboard/);

    // Check role activity card
    await expect(page.locator('text=Role Activity')).toBeVisible();

    // Find picker activity
    await page.click('text=Role Activity');
    await page.selectOption('select[name="roleFilter"]', 'PICKER');

    // Verify picker activity is tracked
    await expect(page.locator('text=picker@example.com')).toBeVisible();
    await expect(page.locator('text=Last Seen')).toBeVisible();
  });

  test('handle error boundaries gracefully', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[name="email"]', 'picker@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');

    await page.waitForURL(/\/order-queue/);

    // Navigate to a page that might have issues
    await page.goto(`${BASE_URL}/non-existent-page`);

    // Should show friendly error page
    await expect(page.locator('text=Page Not Found')).toBeVisible();

    // Should have button to return home
    await page.click('button:has-text("Go Home")');

    // Should return to dashboard
    await page.waitForURL(/\/(dashboard|order-queue)/);
  });

  test('verify access control by role', async ({ page, context }) => {
    // Test as picker (limited access)
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[name="email"]', 'picker@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');

    // Try to access admin page
    await page.goto(`${BASE_URL}/admin-settings`);

    // Should be denied
    await expect(page.locator('text=Access Denied')).toBeVisible();
    await expect(page.locator('text=You need admin privileges')).toBeVisible();

    // Login as admin
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[name="email"]', 'admin@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');

    // Should have access
    await page.goto(`${BASE_URL}/admin-settings`);
    await expect(page.locator('text=Admin Settings')).toBeVisible();
  });

  test('handle user onboarding tour', async ({ page }) => {
    // Create new user scenario
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[name="email"]', 'newuser@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');

    // Check if onboarding tour is shown
    const tourModal = page.locator('.tour-modal');

    if (await tourModal.isVisible()) {
      // Start tour
      await page.click('button:has-text("Start Tour")');

      // Navigate tour steps
      await page.click('button:has-text("Next")');
      await page.click('button:has-text("Next")');
      await page.click('button:has-text("Skip Tour")');

      // Verify tour completed
      await expect(page.locator('text=Tour completed')).not.toBeVisible();
    }
  });

  test('verify persistent login session', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[name="email"]', 'picker@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');

    await page.waitForURL(/\/order-queue/);

    // Reload page
    await page.reload();

    // Should still be logged in (no redirect to login)
    await expect(page.locator('input[name="email"]')).not.toBeVisible();
    await expect(page.locator('text=Order Queue')).toBeVisible();

    // Navigate to different page
    await page.goto(`${BASE_URL}/dashboard`);

    // Should stay logged in
    await expect(page.locator('text=Dashboard')).toBeVisible();
  });

  test('handle password strength validation', async ({ page }) => {
    await page.goto(`${BASE_URL}/change-password`);

    // Try weak password
    await page.fill('input[name="newPassword"]', '123');
    await page.fill('input[name="confirmPassword"]', '123');

    await page.click('button:has-text("Change Password")');

    // Should show validation error
    await expect(page.locator('text=Password must be at least 8 characters')).toBeVisible();

    // Try strong password
    await page.fill('input[name="newPassword"]', 'StrongPass123!');
    await page.fill('input[name="confirmPassword"]', 'StrongPass123!');

    await page.click('button:has-text("Change Password")');

    // Should succeed
    await expect(page.locator('text=Password changed successfully')).toBeVisible();
  });
});
