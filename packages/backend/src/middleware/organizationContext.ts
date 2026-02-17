/**
 * Organization Context Middleware
 *
 * Handles organization context for multi-tenant requests.
 * Extracts organization from header, token, or user's default.
 * Validates user has access to the organization.
 */

import { ForbiddenError } from '@opsui/shared';
import { NextFunction, Response } from 'express';
import { logger } from '../config/logger';
import { organizationUserRepository } from '../repositories/OrganizationRepository';
import { AuthenticatedRequest } from './auth';

// ============================================================================
// ORGANIZATION CONTEXT MIDDLEWARE
// ============================================================================

/**
 * Extract and validate organization context
 *
 * Organization can be specified via:
 * 1. X-Organization-ID header (explicit)
 * 2. JWT token organizationId field
 * 3. User's default organization (from database)
 *
 * Sets req.organizationId for use in downstream handlers
 */
export async function organizationContext(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      return next(); // No user, skip organization context
    }

    let organizationId: string | null = null;

    // 1. Check explicit header
    const headerOrgId = req.headers['x-organization-id'] as string;
    if (headerOrgId) {
      organizationId = headerOrgId;
    }

    // 2. Check JWT token
    if (!organizationId && req.user.organizationId) {
      organizationId = req.user.organizationId;
    }

    // 3. Get user's default organization from database
    if (!organizationId) {
      const memberships = await organizationUserRepository.findUserOrganizations(req.user.userId);
      const primary = memberships.find(m => m.isPrimary);
      organizationId = primary?.organizationId || memberships[0]?.organizationId || null;
    }

    // Set organization context
    req.organizationId = organizationId;

    // Log for debugging
    if (organizationId) {
      logger.debug('Organization context set', {
        userId: req.user.userId,
        organizationId,
        source: headerOrgId ? 'header' : req.user.organizationId ? 'token' : 'default',
      });
    }

    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Require organization context
 * Returns 400 if no organization is set
 */
export function requireOrganization(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  if (!req.organizationId) {
    res.status(400).json({
      error: 'Organization context required',
      code: 'ORGANIZATION_REQUIRED',
      message:
        'Please specify an organization via X-Organization-ID header or set a default organization',
    });
    return;
  }
  next();
}

/**
 * Validate user has access to the organization
 * Must be used after organizationContext
 */
export async function validateOrganizationAccess(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      return next(new ForbiddenError('Not authenticated'));
    }

    if (!req.organizationId) {
      return next(); // No organization set, skip validation
    }

    // Check access
    const hasAccess = await organizationUserRepository.checkUserAccess(
      req.user.userId,
      req.organizationId
    );

    if (!hasAccess) {
      return next(new ForbiddenError('You do not have access to this organization'));
    }

    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Require organization and validate access
 * Combines requireOrganization and validateOrganizationAccess
 */
export async function requireOrganizationAccess(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // First set context
    await organizationContext(req, _res, async err => {
      if (err) return next(err);

      // Check organization is set
      if (!req.organizationId) {
        return next(new Error('Organization context required'));
      }

      // Validate access
      if (!req.user) {
        return next(new ForbiddenError('Not authenticated'));
      }

      const hasAccess = await organizationUserRepository.checkUserAccess(
        req.user.userId,
        req.organizationId
      );

      if (!hasAccess) {
        return next(new ForbiddenError('You do not have access to this organization'));
      }

      next();
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Organization role check middleware factory
 */
export function requireOrganizationRole(...allowedRoles: string[]) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        return next(new ForbiddenError('Not authenticated'));
      }

      if (!req.organizationId) {
        res.status(400).json({
          error: 'Organization context required',
          code: 'ORGANIZATION_REQUIRED',
        });
        return;
      }

      const membership = await organizationUserRepository.findByOrganizationAndUser(
        req.organizationId,
        req.user.userId
      );

      if (!membership || !membership.isActive) {
        return next(new ForbiddenError('You do not have access to this organization'));
      }

      if (!allowedRoles.includes(membership.role)) {
        return next(new ForbiddenError(`Organization role ${allowedRoles.join(' or ')} required`));
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Organization permission check middleware factory
 */
export function requireOrganizationPermission(
  permission: 'canManageUsers' | 'canManageBilling' | 'canManageSettings' | 'canInviteUsers'
) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        return next(new ForbiddenError('Not authenticated'));
      }

      if (!req.organizationId) {
        res.status(400).json({
          error: 'Organization context required',
          code: 'ORGANIZATION_REQUIRED',
        });
        return;
      }

      const membership = await organizationUserRepository.findByOrganizationAndUser(
        req.organizationId,
        req.user.userId
      );

      if (!membership || !membership.isActive) {
        return next(new ForbiddenError('You do not have access to this organization'));
      }

      // Owners and admins have all permissions
      if (membership.role === 'ORG_OWNER' || membership.role === 'ORG_ADMIN') {
        return next();
      }

      // Check specific permission
      if (!membership[permission]) {
        return next(new ForbiddenError(`You do not have permission: ${permission}`));
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get organization ID from request
 * Utility for use in route handlers
 */
export function getOrganizationId(req: AuthenticatedRequest): string | null {
  return req.organizationId || null;
}

/**
 * Get organization ID or throw
 * Use when organization is required
 */
export function getOrganizationIdOrThrow(req: AuthenticatedRequest): string {
  if (!req.organizationId) {
    throw new Error('Organization context not set');
  }
  return req.organizationId;
}
