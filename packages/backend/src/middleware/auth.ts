/**
 * Authentication and authorization middleware
 *
 * Handles JWT validation and role-based access control
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { logger } from '../config/logger';
import config from '../config';
import { UserRole, UnauthorizedError, ForbiddenError } from '@opsui/shared';

// ============================================================================
// TYPES
// ============================================================================

export interface JWTPayload {
  userId: string;
  email: string;
  role: UserRole; // Base role from database
  baseRole: UserRole; // Alias for base role (same as role field)
  activeRole?: UserRole | null; // Active role for multi-role users
  effectiveRole: UserRole; // The role being used (active role or base role)
  iat?: number;
  exp?: number;
}

export interface AuthenticatedRequest extends Request {
  user?: JWTPayload;
}

// ============================================================================
// AUTHENTICATION MIDDLEWARE
// ============================================================================

/**
 * Verify JWT token and attach user to request
 * Supports active role switching for multi-role users
 * TEST MODE: When config.testMode is true AND NOT in production, authentication is bypassed
 */
export function authenticate(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  try {
    // TEST MODE: Bypass authentication for automated testing ONLY in non-production environments
    // SECURITY: Never bypass authentication in production, even if testMode is enabled
    if (config.testMode && config.nodeEnv !== 'production') {
      // Attach a mock admin user for testing
      req.user = {
        userId: 'test-admin-user',
        email: 'test@wms.local',
        role: UserRole.ADMIN,
        baseRole: UserRole.ADMIN,
        activeRole: null,
        effectiveRole: UserRole.ADMIN,
      };
      logger.debug('TEST MODE: Authentication bypassed, using mock admin user');
      return next();
    }

    // SECURITY: If testMode is enabled in production, log a warning and proceed with normal auth
    if (config.testMode && config.nodeEnv === 'production') {
      logger.warn('SECURITY WARNING: TEST_MODE is enabled in production. Ignoring and requiring authentication.');
    }

    // Get token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('Missing or invalid Authorization header');
    }

    const token = authHeader.substring(7);

    // Verify token
    const decoded = jwt.verify(token, config.jwt.secret) as any;

    // Determine effective role (active role or base role)
    const effectiveRole = decoded.activeRole || decoded.role;

    // Attach user to request with all role information
    req.user = {
      userId: decoded.userId,
      email: decoded.email,
      role: effectiveRole as UserRole,
      baseRole: decoded.role as UserRole,
      activeRole: decoded.activeRole || null,
      effectiveRole: effectiveRole as UserRole,
    };

    logger.debug('User authenticated', {
      userId: decoded.userId,
      email: decoded.email,
      baseRole: decoded.role,
      activeRole: decoded.activeRole,
      effectiveRole,
    });

    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      next(new UnauthorizedError('Token expired'));
    } else if (error instanceof jwt.JsonWebTokenError) {
      next(new UnauthorizedError('Invalid token'));
    } else {
      next(error);
    }
  }
}

// ============================================================================
// AUTHORIZATION MIDDLEWARE
// ============================================================================

/**
 * Check if user has required role
 * ADMIN base role always has access regardless of effective role
 */
export function authorize(...allowedRoles: UserRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new UnauthorizedError('User not authenticated'));
    }

    // ADMIN base role always has access to everything
    if (req.user.baseRole === UserRole.ADMIN) {
      next();
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new ForbiddenError(`User role '${req.user.role}' not authorized for this resource`)
      );
    }

    next();
  };
}

/**
 * Check if user is admin
 * ADMIN base role always has access regardless of effective role
 */
export function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  if (!req.user) {
    return next(new UnauthorizedError('User not authenticated'));
  }

  // Check base role - admins with any active role should still have admin access
  if (req.user.baseRole !== UserRole.ADMIN) {
    return next(new ForbiddenError('Admin access required'));
  }

  next();
}

/**
 * Check if user is supervisor or admin
 */
export function requireSupervisor(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  if (!req.user) {
    return next(new UnauthorizedError('User not authenticated'));
  }

  if (req.user.role !== UserRole.SUPERVISOR && req.user.role !== UserRole.ADMIN) {
    return next(new ForbiddenError('Supervisor or admin access required'));
  }

  next();
}

/**
 * Check if user is a picker
 */
export function requirePicker(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  if (!req.user) {
    return next(new UnauthorizedError('User not authenticated'));
  }

  if (req.user.role !== UserRole.PICKER && req.user.role !== UserRole.ADMIN) {
    return next(new ForbiddenError('Picker access required'));
  }

  next();
}

// ============================================================================
// TOKEN GENERATION
// ============================================================================

/**
 * Generate JWT token for user
 */
export function generateToken(user: {
  userId: string;
  email: string;
  role: UserRole;
  activeRole?: UserRole | null;
}): string {
  const effectiveRole = user.activeRole || user.role;
  const payload: JWTPayload = {
    userId: user.userId,
    email: user.email,
    role: user.role,
    baseRole: user.role,
    activeRole: user.activeRole,
    effectiveRole: effectiveRole,
  };

  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn,
  } as jwt.SignOptions);
}

/**
 * Generate refresh token (longer-lived)
 */
export function generateRefreshToken(user: {
  userId: string;
  email: string;
  role: UserRole;
  activeRole?: UserRole | null;
}): string {
  const effectiveRole = user.activeRole || user.role;
  const payload: JWTPayload = {
    userId: user.userId,
    email: user.email,
    role: user.role,
    baseRole: user.role,
    activeRole: user.activeRole,
    effectiveRole: effectiveRole,
  };

  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.refreshExpiresIn,
  } as jwt.SignOptions);
}

/**
 * Verify and decode JWT token
 */
export function verifyToken(token: string): JWTPayload {
  return jwt.verify(token, config.jwt.secret) as JWTPayload;
}
