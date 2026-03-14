/**
 * Authentication and authorization middleware
 *
 * Handles JWT validation and role-based access control
 */

import { ForbiddenError, UnauthorizedError, UserRole } from '@opsui/shared';
import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import config from '../config';
import { logger } from '../config/logger';
import { tokenBlacklistService } from '../services/TokenBlacklistService';

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
  organizationId?: string | null; // Current organization context
  organizationRole?: string | null; // User's role in the organization
  iat?: number;
  exp?: number;
}

// Make Express.User (used by @types/passport) compatible with JWTPayload
// so that AuthenticatedRequest is assignable to Express Request
declare global {
  namespace Express {
    interface User extends JWTPayload {}
  }
}

/**
 * Compact JWT payload for optimized token size (~40% smaller)
 * Uses shortened field names to reduce token payload
 */
export interface CompactJWTPayload {
  uid: string; // userId
  eml: string; // email
  r: UserRole; // role (base role)
  ar?: UserRole | null; // activeRole
  oid?: string | null; // organizationId
  or?: string | null; // organizationRole
  iat?: number;
  exp?: number;
}

/**
 * Expand compact JWT payload to full format for backward compatibility
 */
function expandPayload(compact: CompactJWTPayload): JWTPayload {
  return {
    userId: compact.uid,
    email: compact.eml,
    role: compact.r,
    baseRole: compact.r, // Computed: same as role
    activeRole: compact.ar ?? null,
    effectiveRole: compact.ar ?? compact.r, // Computed: activeRole || role
    organizationId: compact.oid ?? null,
    organizationRole: compact.or ?? null,
    iat: compact.iat,
    exp: compact.exp,
  };
}

/**
 * Check if payload is in compact format
 */
function isCompactPayload(payload: unknown): payload is CompactJWTPayload {
  return typeof payload === 'object' && payload !== null && 'uid' in payload;
}

// AuthenticatedRequest extends Request with typed user property and request ID
export interface AuthenticatedRequest extends Request {
  id?: string;
  user?: JWTPayload;
  organizationId?: string | null; // Current organization context from header or token
}

// ============================================================================
// AUTHENTICATION MIDDLEWARE
// ============================================================================

/**
 * Verify JWT token and attach user to request
 * Supports active role switching for multi-role users
 * TEST MODE: When config.testMode is true, requires special test API key
 */
export function authenticate(req: AuthenticatedRequest, _res: Response, next: NextFunction): void {
  try {
    // SECURITY: Test mode requires special X-Test-API-Key header for authenticated test requests
    // This prevents accidental exposure while allowing automated testing
    if (config.testMode && config.nodeEnv !== 'production') {
      const testApiKey = req.headers['x-test-api-key'] as string;

      if (testApiKey === process.env.TEST_API_KEY) {
        // Verify test API key is set before using test mode
        if (!process.env.TEST_API_KEY) {
          logger.error('TEST MODE: TEST_API_KEY environment variable not set');
          return next(new UnauthorizedError('Test mode not properly configured'));
        }

        // Attach a mock admin user for testing
        req.user = {
          userId: 'test-admin-user',
          email: 'test@wms.local',
          role: UserRole.ADMIN,
          baseRole: UserRole.ADMIN,
          activeRole: null,
          effectiveRole: UserRole.ADMIN,
        };
        logger.debug('TEST MODE: Authentication via test API key');
        return next();
      }
      // If test API key is not provided, fall through to normal JWT authentication
    }

    // SECURITY: If testMode is enabled in production, log a critical security warning
    if (config.testMode && config.nodeEnv === 'production') {
      logger.error(
        'SECURITY CRITICAL: TEST_MODE is enabled in production! This is a security risk.'
      );
    }

    // Get token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('Missing or invalid Authorization header');
    }

    const token = authHeader.substring(7);

    // Verify token with proper type checking
    const decoded = jwt.verify(token, config.jwt.secret);

    // Handle both compact (new) and legacy (old) token formats
    let payload: JWTPayload;
    if (isCompactPayload(decoded)) {
      // New compact format - expand to full format
      payload = expandPayload(decoded);
    } else {
      // Legacy format - use as-is for backward compatibility
      payload = decoded as JWTPayload;
    }

    // Check if token is blacklisted
    const tokenId = `${payload.userId}:${payload.iat}`;
    if (tokenBlacklistService.isBlacklisted(tokenId)) {
      throw new UnauthorizedError('Token has been revoked');
    }

    // Determine effective role (active role or base role)
    const effectiveRole = payload.activeRole || payload.role;

    // Attach user to request with all role information
    req.user = {
      userId: payload.userId,
      email: payload.email,
      role: effectiveRole as UserRole,
      baseRole: payload.role as UserRole,
      activeRole: payload.activeRole || null,
      effectiveRole: effectiveRole as UserRole,
      organizationId: payload.organizationId ?? null,
      organizationRole: payload.organizationRole ?? null,
    };

    logger.debug('User authenticated', {
      userId: payload.userId,
      email: payload.email,
      baseRole: payload.role,
      activeRole: payload.activeRole,
      effectiveRole,
      tokenFormat: isCompactPayload(decoded) ? 'compact' : 'legacy',
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
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction): void => {
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
export function requireAdmin(req: AuthenticatedRequest, _res: Response, next: NextFunction): void {
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
  _res: Response,
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
export function requirePicker(req: AuthenticatedRequest, _res: Response, next: NextFunction): void {
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
 * Generate JWT token for user (compact format)
 * Uses shortened field names for ~40% smaller token size
 */
export function generateToken(user: {
  userId: string;
  email: string;
  role: UserRole;
  activeRole?: UserRole | null;
  organizationId?: string | null;
  organizationRole?: string | null;
}): string {
  const payload: CompactJWTPayload = {
    uid: user.userId,
    eml: user.email,
    r: user.role,
    ar: user.activeRole,
    oid: user.organizationId ?? null,
    or: user.organizationRole ?? null,
  };

  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn,
  } as jwt.SignOptions);
}

/**
 * Generate refresh token (longer-lived, compact format)
 */
export function generateRefreshToken(user: {
  userId: string;
  email: string;
  role: UserRole;
  activeRole?: UserRole | null;
  organizationId?: string | null;
  organizationRole?: string | null;
}): string {
  const payload: CompactJWTPayload = {
    uid: user.userId,
    eml: user.email,
    r: user.role,
    ar: user.activeRole,
    oid: user.organizationId ?? null,
    or: user.organizationRole ?? null,
  };

  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.refreshExpiresIn,
  } as jwt.SignOptions);
}

/**
 * Verify and decode JWT token
 * Handles both compact (new) and legacy (old) token formats
 */
export function verifyToken(token: string): JWTPayload {
  const decoded = jwt.verify(token, config.jwt.secret);

  if (isCompactPayload(decoded)) {
    return expandPayload(decoded);
  }
  return decoded as JWTPayload;
}
