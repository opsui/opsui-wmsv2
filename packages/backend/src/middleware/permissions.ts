/**
 * Permission-based access control middleware
 *
 * Checks if users have specific permissions based on their role(s)
 */

import { Response, NextFunction } from 'express';
import { Permission, UserRole, ForbiddenError, WMSError } from '@opsui/shared';
import { AuthenticatedRequest } from './auth';
import { customRoleRepository } from '../repositories/CustomRoleRepository';

// Cache for user permissions to avoid repeated database lookups
const permissionsCache = new Map<string, { permissions: Permission[]; expiresAt: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Clean up expired cache entries
 */
function cleanExpiredCacheEntries() {
  const now = Date.now();
  for (const [key, value] of permissionsCache.entries()) {
    if (value.expiresAt < now) {
      permissionsCache.delete(key);
    }
  }
}

// Run cache cleanup every minute
setInterval(cleanExpiredCacheEntries, 60000);

/**
 * Get all permissions for a user
 * Combines permissions from their base role and any custom roles
 */
async function getUserPermissions(userId: string, baseRole: UserRole): Promise<Permission[]> {
  // TEMPORARY: Bypass cache for debugging
  // Check cache first
  // const cached = permissionsCache.get(userId);
  // if (cached && cached.expiresAt > Date.now()) {
  //   console.log('[getUserPermissions] Returning cached permissions for user:', userId);
  //   return cached.permissions;
  // }

  console.log('[getUserPermissions] Cache BYPASSED, fetching fresh permissions for user:', userId, 'role:', baseRole);

  // Get permissions from repository (combines base role and custom role permissions)
  const permissions = await customRoleRepository.getUserPermissions(userId, baseRole);

  console.log('[getUserPermissions] Fetched permissions:', permissions.length, 'for user:', userId);

  // Cache with expiration (commented out for debugging)
  // permissionsCache.set(userId, {
  //   permissions,
  //   expiresAt: Date.now() + CACHE_TTL,
  // });

  return permissions;
}

/**
 * Check if user has a specific permission
 */
export function hasPermission(
  userPermissions: Permission[],
  requiredPermission: Permission
): boolean {
  // Convert to strings for comparison (handles enum reference issues)
  const permissionStrings = userPermissions.map(p => String(p));
  const required = String(requiredPermission);

  // Admins have full access
  if (permissionStrings.includes('admin_full_access')) {
    console.log('[hasPermission] User has ADMIN_FULL_ACCESS, granting access');
    return true;
  }

  console.log('[hasPermission] Checking for permission:', required, 'in', permissionStrings);
  const hasPermission = permissionStrings.includes(required);
  console.log('[hasPermission] Has permission:', hasPermission);
  return hasPermission;
}

/**
 * Check if user has ANY of the specified permissions (OR logic)
 */
export function hasAnyPermission(
  userPermissions: Permission[],
  requiredPermissions: Permission[]
): boolean {
  // Admins have full access
  if (userPermissions.includes(Permission.ADMIN_FULL_ACCESS)) {
    return true;
  }

  return requiredPermissions.some(permission => userPermissions.includes(permission));
}

/**
 * Check if user has ALL of the specified permissions (AND logic)
 */
export function hasAllPermissions(
  userPermissions: Permission[],
  requiredPermissions: Permission[]
): boolean {
  // Admins have full access
  if (userPermissions.includes(Permission.ADMIN_FULL_ACCESS)) {
    return true;
  }

  return requiredPermissions.every(permission => userPermissions.includes(permission));
}

/**
 * Middleware factory to require a specific permission
 *
 * @example
 * router.get('/orders', requirePermission(Permission.VIEW_ORDERS), getOrdersHandler);
 */
export function requirePermission(permission: Permission) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new ForbiddenError('Authentication required');
      }

      // ADMIN base role always has full access, regardless of effective role
      if (req.user.baseRole === UserRole.ADMIN) {
        console.log('[requirePermission] User has ADMIN base role, granting access');
        next();
        return;
      }

      console.log('[requirePermission] Checking permission:', permission, 'for user:', req.user.userId, 'role:', req.user.role, 'baseRole:', req.user.baseRole);
      const userPermissions = await getUserPermissions(req.user.userId, req.user.role);
      console.log('[requirePermission] User permissions count:', userPermissions.length);
      console.log('[requirePermission] Permissions:', userPermissions.map(p => String(p)));
      console.log('[requirePermission] Required:', String(permission));
      console.log('[requirePermission] Has ADMIN_FULL_ACCESS:', userPermissions.includes('admin_full_access' as any));
      console.log('[requirePermission] Has required permission:', userPermissions.includes(permission));

      if (!hasPermission(userPermissions, permission)) {
        // Include debug info in the error details
        const debugInfo = {
          userId: req.user.userId,
          role: req.user.role,
          baseRole: req.user.baseRole,
          required: String(permission),
          userPermissions: userPermissions.map(p => String(p)),
          hasAdminFullAccess: userPermissions.includes('admin_full_access' as any),
        };
        console.log('[requirePermission] Permission denied, debug info:', debugInfo);
        // Use WMSError directly to include debug details
        throw new WMSError(
          'FORBIDDEN',
          403,
          `Permission required: ${permission.replace(/_/g, ' ')}`,
          debugInfo
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Middleware factory to require ANY of the specified permissions (OR logic)
 *
 * @example
 * router.post('/reports', requireAnyPermission([
 *   Permission.VIEW_REPORTS,
 *   Permission.GENERATE_REPORTS
 * ]), generateReportHandler);
 */
export function requireAnyPermission(permissions: Permission[]) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new ForbiddenError('Authentication required');
      }

      const userPermissions = await getUserPermissions(req.user.userId, req.user.role);

      if (!hasAnyPermission(userPermissions, permissions)) {
        throw new ForbiddenError(
          `One of these permissions required: ${permissions.map(p => p.replace(/_/g, ' ')).join(', ')}`
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Middleware factory to require ALL of the specified permissions (AND logic)
 *
 * @example
 * router.post('/orders', requireAllPermissions([
 *   Permission.VIEW_ORDERS,
 *   Permission.CREATE_ORDERS
 * ]), createOrderHandler);
 */
export function requireAllPermissions(permissions: Permission[]) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new ForbiddenError('Authentication required');
      }

      const userPermissions = await getUserPermissions(req.user.userId, req.user.role);

      if (!hasAllPermissions(userPermissions, permissions)) {
        throw new ForbiddenError(
          `All of these permissions required: ${permissions.map(p => p.replace(/_/g, ' ')).join(', ')}`
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Clear permissions cache for a specific user
 * Call this when granting/revoking roles or changing permissions
 */
export function clearUserPermissionsCache(userId: string): void {
  permissionsCache.delete(userId);
}

/**
 * Clear entire permissions cache
 * Call this when role definitions change
 */
export function clearAllPermissionsCache(): void {
  permissionsCache.clear();
}
