/**
 * Custom Roles routes
 *
 * Provides endpoints for managing custom roles with permissions
 */

import { Router, Response, NextFunction } from 'express';
import { CustomRoleRepository } from '../repositories/CustomRoleRepository';
import { UserRepository } from '../repositories/UserRepository';
import { asyncHandler, authenticate } from '../middleware';
import { AuthenticatedRequest } from '../middleware/auth';
import { UserRole } from '@opsui/shared';
import { Permission } from '@opsui/shared';
import { nanoid } from 'nanoid';
import { getAuditService, AuditEventType } from '../services/AuditService';

const router = Router();
const customRoleRepo = new CustomRoleRepository();
const userRepo = new UserRepository();
const auditService = getAuditService();

// Helper middleware to check if user is admin
const requireAdmin = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  // Check base role - admins with any active role should still have admin access
  if (req.user?.baseRole !== UserRole.ADMIN) {
    res.status(403).json({
      error: 'Admin access required',
      code: 'FORBIDDEN',
    });
    return;
  }
  next();
};

interface CreateCustomRoleRequest {
  name: string;
  description: string;
  permissions: Permission[];
}

interface UpdateCustomRoleRequest {
  name?: string;
  description?: string;
  permissions?: Permission[];
}

/**
 * GET /api/custom-roles
 * Get all custom roles with their permissions (admin only)
 */
router.get(
  '/',
  authenticate,
  requireAdmin,
  asyncHandler(async (_req: AuthenticatedRequest, res: Response) => {
    const roles = await customRoleRepo.getAllRolesWithPermissions();

    // Also include system roles (predefined UserRole enum)
    const systemRoles = await customRoleRepo.getSystemRoles();

    // Combine all roles, deduplicating by roleId (system roles take precedence)
    const roleMap = new Map();
    for (const role of roles) {
      roleMap.set(role.roleId, role);
    }
    for (const systemRole of systemRoles) {
      roleMap.set(systemRole.roleId, systemRole);
    }

    const allRoles = Array.from(roleMap.values());

    res.json(allRoles);
  })
);

/**
 * GET /api/custom-roles/system
 * Get all system roles (predefined UserRole enum) with their default permissions (admin only)
 * IMPORTANT: This must come BEFORE /:roleId to avoid "system" being treated as a role ID
 */
router.get(
  '/system',
  authenticate,
  requireAdmin,
  asyncHandler(async (_req: AuthenticatedRequest, res: Response) => {
    const systemRoles = await customRoleRepo.getSystemRoles();
    res.json(systemRoles);
  })
);

/**
 * GET /api/custom-roles/permissions
 * Get all available permissions (admin only)
 * IMPORTANT: This must come BEFORE /:roleId to avoid "permissions" being treated as a role ID
 */
router.get(
  '/permissions',
  authenticate,
  requireAdmin,
  asyncHandler(async (_req: AuthenticatedRequest, res: Response) => {
    // Import permission groups
    const { PERMISSION_GROUPS } = await import('@opsui/shared');

    // Return permissions organized by groups
    res.json({
      permissions: Object.values(Permission),
      groups: PERMISSION_GROUPS,
    });
  })
);

/**
 * GET /api/custom-roles/my-permissions
 * Get current user's permissions (all users)
 * IMPORTANT: This must come BEFORE /:roleId to avoid "my-permissions" being treated as a role ID
 */
router.get(
  '/my-permissions',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      res.status(401).json({
        error: 'Not authenticated',
        code: 'NOT_AUTHENTICATED',
      });
      return;
    }

    const permissions = await customRoleRepo.getUserPermissions(req.user.userId, req.user.role);

    res.json({ permissions });
  })
);

/**
 * GET /api/custom-roles/:roleId
 * Get a specific custom role by ID (admin only)
 * IMPORTANT: This must come AFTER all specific routes to avoid catching them
 */
router.get(
  '/:roleId',
  authenticate,
  requireAdmin,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { roleId } = req.params;

    const role = await customRoleRepo.getCustomRoleById(roleId);

    if (!role) {
      res.status(404).json({
        error: 'Role not found',
        code: 'ROLE_NOT_FOUND',
      });
      return;
    }

    res.json(role);
  })
);

/**
 * POST /api/custom-roles
 * Create a new custom role (admin only)
 */
router.post(
  '/',
  authenticate,
  requireAdmin,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { name, description, permissions }: CreateCustomRoleRequest = req.body;

    // Validate request
    if (!name || !description) {
      res.status(400).json({
        error: 'Name and description are required',
        code: 'MISSING_FIELDS',
      });
      return;
    }

    // Validate name length
    if (name.length < 3 || name.length > 100) {
      res.status(400).json({
        error: 'Name must be between 3 and 100 characters',
        code: 'INVALID_NAME_LENGTH',
      });
      return;
    }

    // Validate permissions
    if (!permissions || !Array.isArray(permissions) || permissions.length === 0) {
      res.status(400).json({
        error: 'At least one permission is required',
        code: 'NO_PERMISSIONS',
      });
      return;
    }

    // Validate each permission
    const validPermissions = Object.values(Permission);
    const invalidPermissions = permissions.filter(p => !validPermissions.includes(p));

    if (invalidPermissions.length > 0) {
      res.status(400).json({
        error: 'Invalid permissions',
        code: 'INVALID_PERMISSIONS',
        details: invalidPermissions,
      });
      return;
    }

    // Generate role ID
    const roleId = `custom_${nanoid(8).toLowerCase()}`;

    // Create the role
    const newRole = await customRoleRepo.createCustomRole({
      roleId,
      name,
      description,
      permissions,
      grantedBy: req.user!.userId,
    });

    // Get admin user info for audit log
    const adminUser = await userRepo.findById(req.user!.userId);

    // Safely get IP and user-agent
    const ipAddress = req.ip || req.socket?.remoteAddress || null;
    const userAgent = req.get('user-agent') || null;

    // Log the custom role creation in audit logs
    try {
      await auditService.logAuthorization(
        AuditEventType.CUSTOM_ROLE_CREATED,
        req.user!.userId,
        adminUser?.email || req.user!.email || null,
        adminUser?.role || req.user!.effectiveRole || null,
        'custom_role',
        roleId,
        `Created custom role "${name}" (${roleId})`,
        undefined,
        { name, description, permissions },
        undefined,
        ipAddress,
        userAgent
      );
    } catch (auditError) {
      // Log the audit error but don't fail the request
      console.error('[customRoles] Failed to log role creation to audit:', auditError);
    }

    res.status(201).json(newRole);
  })
);

/**
 * PUT /api/custom-roles/:roleId
 * Update a custom role (admin only)
 */
router.put(
  '/:roleId',
  authenticate,
  requireAdmin,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { roleId } = req.params;
    const { name, description, permissions }: UpdateCustomRoleRequest = req.body;

    // Validate name length if provided
    if (name !== undefined && (name.length < 3 || name.length > 100)) {
      res.status(400).json({
        error: 'Name must be between 3 and 100 characters',
        code: 'INVALID_NAME_LENGTH',
      });
      return;
    }

    // Validate permissions if provided
    if (permissions !== undefined) {
      if (!Array.isArray(permissions) || permissions.length === 0) {
        res.status(400).json({
          error: 'At least one permission is required',
          code: 'NO_PERMISSIONS',
        });
        return;
      }

      const validPermissions = Object.values(Permission);
      const invalidPermissions = permissions.filter(p => !validPermissions.includes(p));

      if (invalidPermissions.length > 0) {
        res.status(400).json({
          error: 'Invalid permissions',
          code: 'INVALID_PERMISSIONS',
          details: invalidPermissions,
        });
        return;
      }
    }

    // Get the existing role for audit oldValues
    const existingRole = await customRoleRepo.getCustomRoleById(roleId);

    // Update the role
    const updatedRole = await customRoleRepo.updateCustomRole(roleId, {
      name,
      description,
      permissions,
      grantedBy: req.user!.userId,
    });

    // Get admin user info for audit log
    const adminUser = await userRepo.findById(req.user!.userId);

    // Safely get IP and user-agent
    const ipAddress = req.ip || req.socket?.remoteAddress || null;
    const userAgent = req.get('user-agent') || null;

    // Log the custom role update in audit logs
    try {
      await auditService.logAuthorization(
        AuditEventType.CUSTOM_ROLE_UPDATED,
        req.user!.userId,
        adminUser?.email || req.user!.email || null,
        adminUser?.role || req.user!.effectiveRole || null,
        'custom_role',
        roleId,
        `Updated custom role "${updatedRole.name}" (${roleId})`,
        existingRole
          ? {
              name: existingRole.name,
              description: existingRole.description,
              permissions: existingRole.permissions,
            }
          : undefined,
        { name, description, permissions },
        undefined,
        ipAddress,
        userAgent
      );
    } catch (auditError) {
      // Log the audit error but don't fail the request
      console.error('[customRoles] Failed to log role update to audit:', auditError);
    }

    res.json(updatedRole);
  })
);

/**
 * DELETE /api/custom-roles/:roleId
 * Delete a custom role (admin only)
 */
router.delete(
  '/:roleId',
  authenticate,
  requireAdmin,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { roleId } = req.params;

    // Get the existing role for audit log before deleting
    const existingRole = await customRoleRepo.getCustomRoleById(roleId);

    await customRoleRepo.deleteCustomRole(roleId);

    // Get admin user info for audit log
    const adminUser = await userRepo.findById(req.user!.userId);

    // Safely get IP and user-agent
    const ipAddress = req.ip || req.socket?.remoteAddress || null;
    const userAgent = req.get('user-agent') || null;

    // Log the custom role deletion in audit logs
    try {
      await auditService.logAuthorization(
        AuditEventType.CUSTOM_ROLE_DELETED,
        req.user!.userId,
        adminUser?.email || req.user!.email || null,
        adminUser?.role || req.user!.effectiveRole || null,
        'custom_role',
        roleId,
        `Deleted custom role "${existingRole?.name || roleId}" (${roleId})`,
        existingRole
          ? {
              name: existingRole.name,
              description: existingRole.description,
              permissions: existingRole.permissions,
            }
          : undefined,
        undefined,
        undefined,
        ipAddress,
        userAgent
      );
    } catch (auditError) {
      // Log the audit error but don't fail the request
      console.error('[customRoles] Failed to log role deletion to audit:', auditError);
    }

    res.json({ success: true, message: 'Role deleted successfully' });
  })
);

export default router;
