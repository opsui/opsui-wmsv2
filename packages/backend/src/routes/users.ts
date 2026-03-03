/**
 * User management routes
 *
 * Provides endpoints for listing users (admin only)
 * and creating users (admin or org admins with can_manage_users permission)
 */

import { Router, Response, NextFunction } from 'express';
import { UserRepository } from '../repositories/UserRepository';
import { asyncHandler, authenticate } from '../middleware';
import { AuthenticatedRequest } from '../middleware/auth';
import { UserRole } from '@opsui/shared';
import { organizationService } from '../services/OrganizationService';
import { organizationUserRepository } from '../repositories/OrganizationRepository';

const router = Router();
const userRepo = new UserRepository();

// Helper middleware to check if user is admin
// ADMIN base role always has access (same as authorize middleware)
const requireAdmin = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (req.user?.baseRole !== UserRole.ADMIN) {
    res.status(403).json({
      error: 'Admin access required',
      code: 'FORBIDDEN',
    });
    return;
  }
  next();
};

/**
 * GET /api/users
 * Get all users (admin only)
 */
router.get(
  '/',
  authenticate,
  requireAdmin,
  asyncHandler(async (_req: AuthenticatedRequest, res) => {
    const users = await userRepo.getAllUsers();
    res.json(users);
  })
);

/**
 * GET /api/users/assignable
 * Get users that can be assigned tasks (authenticated users)
 * Returns basic info (userId, name, role) for active users who can perform work
 */
router.get(
  '/assignable',
  authenticate,
  asyncHandler(async (_req: AuthenticatedRequest, res) => {
    const assignableRoles = [
      UserRole.PICKER,
      UserRole.PACKER,
      UserRole.STOCK_CONTROLLER,
      UserRole.SUPERVISOR,
      UserRole.ADMIN,
      UserRole.INWARDS,
    ];

    const assignableUsers = await userRepo.getAssignableUsers(assignableRoles);
    res.json(assignableUsers);
  })
);

/**
 * POST /api/users
 * Create a new user
 *
 * - ADMIN: Can create users globally (without organizationId) or for any org
 * - Org admins (with can_manage_users): Can only create users for their org (must provide organizationId)
 */
router.post(
  '/',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { name, email, password, role, organizationId, organizationRole } = req.body;

    // Validate required fields
    if (!name || !email || !password) {
      res.status(400).json({
        error: 'name, email, and password are required',
        code: 'MISSING_FIELDS',
      });
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      res.status(400).json({
        error: 'Invalid email format',
        code: 'INVALID_EMAIL',
      });
      return;
    }

    // Validate password (minimum 6 characters)
    if (password.length < 6) {
      res.status(400).json({
        error: 'Password must be at least 6 characters long',
        code: 'INVALID_PASSWORD',
      });
      return;
    }

    // Validate role
    if (!role || !Object.values(UserRole).includes(role)) {
      res.status(400).json({
        error: 'Invalid role',
        code: 'INVALID_ROLE',
      });
      return;
    }

    // Permission check: ADMIN always allowed; org members need can_manage_users
    const isAdmin = req.user?.baseRole === UserRole.ADMIN;

    if (!isAdmin) {
      // Non-admin must provide organizationId and have can_manage_users permission
      if (!organizationId) {
        res.status(403).json({
          error: 'Non-admin users must specify an organizationId',
          code: 'ORGANIZATION_REQUIRED',
        });
        return;
      }

      // Verify caller has can_manage_users permission in the organization
      try {
        await organizationService.checkPermission(
          organizationId,
          req.user!.userId,
          'can_manage_users'
        );
      } catch (error: any) {
        res.status(403).json({
          error: 'You do not have permission to create users in this organization',
          code: 'FORBIDDEN',
        });
        return;
      }
    }

    // Generate user ID
    const { generateUserId } = await import('@opsui/shared');
    const userId = generateUserId();

    // Create the user
    const newUser = await userRepo.createUserWithPassword({
      userId,
      name,
      email,
      password,
      role,
    });

    console.log('[POST /users] User created:', newUser);

    // If organizationId is provided, assign user to organization
    if (organizationId) {
      await organizationUserRepository.assignUser({
        organizationId,
        userId: newUser.userId,
        role: organizationRole || 'ORG_MEMBER',
        isPrimary: true,
        canManageUsers: false,
        canManageBilling: false,
        canManageSettings: false,
        canInviteUsers: false,
      });

      console.log('[POST /users] User assigned to organization:', {
        userId: newUser.userId,
        organizationId,
        role: organizationRole || 'ORG_MEMBER',
      });
    }

    res.status(201).json(newUser);
  })
);

/**
 * DELETE /api/users/:userId
 * Soft delete a user (mark for deletion, admin only)
 *
 * User will be marked as deleted and inaccessible for 3 days.
 * After 3 days, the user will be permanently deleted.
 * Admin can restore the user during the 3-day grace period.
 */
router.delete(
  '/:userId',
  authenticate,
  requireAdmin,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { userId } = req.params;
    console.log('[DELETE /users/:userId] Soft deleting user:', userId);

    // Use soft delete - marks user for deletion
    const deletedUser = await userRepo.softDeleteUser(userId);
    console.log('[DELETE /users/:userId] User marked for deletion:', deletedUser);

    // Return the user object with deleted_at timestamp
    res.json(deletedUser);
  })
);

/**
 * POST /api/users/:userId/restore
 * Restore a soft-deleted user (admin only)
 *
 * Clears the deleted_at timestamp, preventing permanent deletion.
 * User will be accessible and editable again.
 */
router.post(
  '/:userId/restore',
  authenticate,
  requireAdmin,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { userId } = req.params;
    console.log('[POST /users/:userId/restore] Restoring user:', userId);

    // Restore user - clears deleted_at timestamp
    const restoredUser = await userRepo.restoreUser(userId);
    console.log('[POST /users/:userId/restore] User restored:', restoredUser);

    // Return the restored user object
    res.json(restoredUser);
  })
);

/**
 * PATCH /api/users/:userId
 * Update a user (admin only)
 */
router.patch(
  '/:userId',
  authenticate,
  requireAdmin,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { userId } = req.params;
    const { name, email, role, active } = req.body;

    const updatedUser = await userRepo.updateUser(userId, {
      name,
      email,
      role,
      active,
    });

    res.json(updatedUser);
  })
);

export default router;
