/**
 * Role Assignment routes
 *
 * Allows admins to grant and revoke additional roles for users
 */

import { Router, Response, NextFunction } from 'express';
import { RoleAssignmentRepository } from '../repositories/RoleAssignmentRepository';
import { asyncHandler, authenticate } from '../middleware';
import { AuthenticatedRequest } from '../middleware/auth';
import { getPool } from '../db/client';
import { UserRole } from '@opsui/shared';
import { getAuditService, AuditEventType } from '../services/AuditService';
import { UserRepository } from '../repositories/UserRepository';

const router = Router();
const roleAssignmentRepo = new RoleAssignmentRepository(getPool());
const auditService = getAuditService();
const userRepo = new UserRepository();

// Helper middleware to check if user is admin
// ADMIN role always has access (same as authorize middleware)
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
 * GET /api/role-assignments
 * Get all role assignments (admin only)
 */
router.get(
  '/',
  authenticate,
  requireAdmin,
  asyncHandler(async (_req: AuthenticatedRequest, res) => {
    const assignments = await roleAssignmentRepo.getAllRoleAssignments();
    res.json(assignments);
  })
);

/**
 * GET /api/role-assignments/user/:userId
 * Get role assignments for a specific user
 */
router.get(
  '/user/:userId',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { userId } = req.params;

    // Users can view their own role assignments, admins can view any
    if (req.user?.userId !== userId && req.user?.baseRole !== UserRole.ADMIN) {
      res.status(403).json({
        error: 'You do not have permission to view role assignments for this user',
        code: 'FORBIDDEN',
      });
      return;
    }

    const assignments = await roleAssignmentRepo.getRoleAssignmentsForUser(userId);
    res.json(assignments);
  })
);

/**
 * GET /api/role-assignments/my-roles
 * Get current user's additional roles
 */
router.get(
  '/my-roles',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    if (!req.user) {
      res.status(401).json({
        error: 'Not authenticated',
        code: 'NOT_AUTHENTICATED',
      });
      return;
    }

    const roles = await roleAssignmentRepo.getUserRoleAssignments(req.user.userId);
    res.json(roles);
  })
);

/**
 * POST /api/role-assignments/grant
 * Grant a role to a user (admin only)
 */
router.post(
  '/grant',
  authenticate,
  requireAdmin,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    if (!req.user) {
      res.status(401).json({
        error: 'Not authenticated',
        code: 'NOT_AUTHENTICATED',
      });
      return;
    }

    // Accept both camelCase and snake_case (frontend sends snake_case)
    const { userId, user_id, role } = req.body;
    const finalUserId = userId || user_id;

    if (!finalUserId || !role) {
      res.status(400).json({
        error: 'userId and role are required',
        code: 'MISSING_FIELDS',
      });
      return;
    }

    // Validate role
    if (!Object.values(UserRole).includes(role)) {
      res.status(400).json({
        error: 'Invalid role',
        code: 'INVALID_ROLE',
      });
      return;
    }

    const assignment = await roleAssignmentRepo.grantRole(
      { userId: finalUserId, role },
      req.user.userId
    );

    // Fetch target user details for audit log
    const targetUser = await userRepo.findById(finalUserId);

    // Get admin user info for audit log
    const adminUser = await userRepo.findById(req.user.userId);

    // Safely get IP and user-agent
    const ipAddress = req.ip || req.socket?.remoteAddress || null;
    const userAgent = req.get('user-agent') || null;

    // Log the role grant in audit logs
    try {
      await auditService.logAuthorization(
        AuditEventType.ROLE_GRANTED,
        req.user.userId,
        adminUser?.email || req.user.email || null,
        adminUser?.role || req.user?.effectiveRole || null,
        'user_role',
        finalUserId,
        `Granted role "${role}" to user ${targetUser?.name || finalUserId}`,
        undefined,
        undefined,
        {
          details: {
            role: role,
            grantedTo: targetUser?.name || finalUserId,
            grantedToEmail: targetUser?.email,
            grantedBy: adminUser?.name || req.user.userId,
            grantedByEmail: adminUser?.email || req.user.email,
          },
        },
        ipAddress,
        userAgent
      );
    } catch (auditError) {
      // Log the audit error but don't fail the request
      console.error('[roleAssignments] Failed to log role grant to audit:', auditError);
    }

    res.status(201).json(assignment);
  })
);

/**
 * DELETE /api/role-assignments/revoke
 * Revoke a role from a user (admin only)
 */
router.delete(
  '/revoke',
  authenticate,
  requireAdmin,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    if (!req.user) {
      res.status(401).json({
        error: 'Not authenticated',
        code: 'NOT_AUTHENTICATED',
      });
      return;
    }

    // Accept both camelCase and snake_case (frontend sends snake_case)
    const { userId, user_id, role } = req.body;
    const finalUserId = userId || user_id;

    if (!finalUserId || !role) {
      res.status(400).json({
        error: 'userId and role are required',
        code: 'MISSING_FIELDS',
      });
      return;
    }

    await roleAssignmentRepo.revokeRole({ userId: finalUserId, role });

    // Fetch target user details for audit log
    const targetUser = await userRepo.findById(finalUserId);

    // Get admin user info for audit log
    const adminUser = await userRepo.findById(req.user.userId);

    // Safely get IP and user-agent
    const ipAddress = req.ip || req.socket?.remoteAddress || null;
    const userAgent = req.get('user-agent') || null;

    // Log the role revoke in audit logs
    try {
      await auditService.logAuthorization(
        AuditEventType.ROLE_REVOKED,
        req.user.userId,
        adminUser?.email || req.user.email || null,
        adminUser?.role || req.user?.effectiveRole || null,
        'user_role',
        finalUserId,
        `Revoked role "${role}" from user ${targetUser?.name || finalUserId}`,
        undefined,
        undefined,
        {
          details: {
            role: role,
            revokedFrom: targetUser?.name || finalUserId,
            revokedFromEmail: targetUser?.email,
            revokedBy: adminUser?.name || req.user.userId,
            revokedByEmail: adminUser?.email || req.user.email,
          },
        },
        ipAddress,
        userAgent
      );
    } catch (auditError) {
      // Log the audit error but don't fail the request
      console.error('[roleAssignments] Failed to log role revoke to audit:', auditError);
    }

    res.json({ message: 'Role revoked successfully' });
  })
);

export default router;
