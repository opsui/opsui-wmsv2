/**
 * Authentication routes
 */

import { Router } from 'express';
import { authService } from '../services/AuthService';
import { asyncHandler, authenticate } from '../middleware';
import { validate } from '../middleware/validation';
import { AuthenticatedRequest } from '../middleware/auth';

const router = Router();

/**
 * POST /api/auth/login
 * Login with email and password
 */
router.post(
  '/login',
  validate.login,
  asyncHandler(async (req, res) => {
    const tokens = await authService.login(req.body);
    res.json(tokens);
  })
);

/**
 * POST /api/auth/refresh
 * Refresh access token using refresh token
 */
router.post(
  '/refresh',
  asyncHandler(async (req, res) => {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      res.status(400).json({
        error: 'Refresh token is required',
        code: 'MISSING_REFRESH_TOKEN',
      });
      return;
    }

    const tokens = await authService.refreshToken(refreshToken);
    res.json(tokens);
  })
);

/**
 * POST /api/auth/logout
 * Logout current user
 */
router.post(
  '/logout',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    if (req.user) {
      await authService.logout(req.user.userId);
    }
    res.json({ message: 'Logged out successfully' });
  })
);

/**
 * GET /api/auth/me
 * Get current user info
 */
router.get(
  '/me',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    if (!req.user) {
      res.status(401).json({
        error: 'Not authenticated',
        code: 'NOT_AUTHENTICATED',
      });
      return;
    }

    const user = await authService.getUserById(req.user.userId);
    res.json(user);
  })
);

/**
 * POST /api/auth/change-password
 * Change current user's password
 */
router.post(
  '/change-password',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    if (!req.user) {
      res.status(401).json({
        error: 'Not authenticated',
        code: 'NOT_AUTHENTICATED',
      });
      return;
    }

    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      res.status(400).json({
        error: 'Current password and new password are required',
        code: 'MISSING_PASSWORDS',
      });
      return;
    }

    await authService.changePassword(req.user.userId, currentPassword, newPassword);
    res.json({ message: 'Password changed successfully' });
  })
);

/**
 * POST /api/auth/current-view
 * Update the current page/view the user is on
 */
router.post(
  '/current-view',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    if (!req.user) {
      res.status(401).json({
        error: 'Not authenticated',
        code: 'NOT_AUTHENTICATED',
      });
      return;
    }

    const { view } = req.body;

    // Allow empty string to clear the current view
    if (view === undefined) {
      res.status(400).json({
        error: 'View is required',
        code: 'MISSING_VIEW',
      });
      return;
    }

    await authService.updateCurrentView(req.user.userId, view);
    res.json({ message: 'Current view updated successfully' });
  })
);

/**
 * POST /api/auth/set-idle
 * Set picker to IDLE status immediately (when tab becomes hidden)
 */
router.post(
  '/set-idle',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    if (!req.user) {
      res.status(401).json({
        error: 'Not authenticated',
        code: 'NOT_AUTHENTICATED',
      });
      return;
    }

    await authService.setIdle(req.user.userId);
    res.json({ message: 'Picker status set to IDLE' });
  })
);

/**
 * POST /api/auth/set-active-role
 * Set active role for multi-role users (e.g., admin acting as picker/packer/stock-controller)
 */
router.post(
  '/set-active-role',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    if (!req.user) {
      res.status(401).json({
        error: 'Not authenticated',
        code: 'NOT_AUTHENTICATED',
      });
      return;
    }

    const { role } = req.body;

    if (!role) {
      res.status(400).json({
        error: 'Role is required',
        code: 'MISSING_ROLE',
      });
      return;
    }

    // Validate role (including new roles)
    const validRoles = [
      'PICKER',
      'PACKER',
      'STOCK_CONTROLLER',
      'ADMIN',
      'SUPERVISOR',
      'PRODUCTION',
      'INWARDS',
      'DISPATCH',
      'SALES',
      'MAINTENANCE',
      'RMA',
      'ACCOUNTING',
    ];
    if (!validRoles.includes(role)) {
      res.status(400).json({
        error: 'Invalid role',
        code: 'INVALID_ROLE',
      });
      return;
    }

    const user = await authService.setActiveRole(req.user.userId, role);
    res.json({ user, activeRole: role });
  })
);

/**
 * POST /api/auth/active-role
 * Alias for /set-active-role (for backwards compatibility)
 * Accepts both activeRole (camelCase) and active_role (snake_case)
 */
router.post(
  '/active-role',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    if (!req.user) {
      res.status(401).json({
        error: 'Not authenticated',
        code: 'NOT_AUTHENTICATED',
      });
      return;
    }

    // Accept both camelCase and snake_case (frontend converts to snake_case)
    const { activeRole, active_role } = req.body;
    const role = activeRole || active_role;

    if (!role) {
      res.status(400).json({
        error: 'Active role is required',
        code: 'MISSING_ROLE',
      });
      return;
    }

    // Validate role (including new roles)
    const validRoles = [
      'PICKER',
      'PACKER',
      'STOCK_CONTROLLER',
      'ADMIN',
      'SUPERVISOR',
      'PRODUCTION',
      'INWARDS',
      'DISPATCH',
      'SALES',
      'MAINTENANCE',
      'RMA',
      'ACCOUNTING',
    ];
    if (!validRoles.includes(role)) {
      res.status(400).json({
        error: 'Invalid role',
        code: 'INVALID_ROLE',
      });
      return;
    }

    const user = await authService.setActiveRole(req.user.userId, role);

    // Generate new access token with updated activeRole
    const { generateToken } = await import('../middleware/auth');
    const newAccessToken = generateToken({
      userId: user.userId,
      email: user.email,
      role: user.role,
      activeRole: role,
    });

    res.json({ user, activeRole: role, accessToken: newAccessToken });
  })
);

export default router;
