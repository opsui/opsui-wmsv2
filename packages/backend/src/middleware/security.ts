/**
 * Security Middleware
 *
 * Provides CSRF protection, rate limiting, and other security measures
 */

import rateLimit from 'express-rate-limit';
import { Request, Response, NextFunction } from 'express';
import { logger } from '../config/logger';
import config from '../config';

// ============================================================================
// RATE LIMITING
// ============================================================================

/**
 * Rate limiter for authentication endpoints
 * Prevents brute force attacks on login
 * DISABLED in development mode
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 attempts per window (increased for development)
  message: 'Too many authentication attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  skipFailedRequests: false, // Count failed requests
  skip: () => process.env.NODE_ENV !== 'production' || process.env.DISABLE_RATE_LIMIT === 'true',
  validate: { trustProxy: false, xForwardedForHeader: false }, // Disable strict proxy validation
  handler: (req: Request, res: Response) => {
    logger.warn('Rate limit exceeded', {
      ip: req.ip,
      path: req.path,
      userAgent: req.get('user-agent'),
    });
    res.status(429).json({
      error: 'Too many attempts',
      message: 'Too many authentication attempts, please try again later',
      retryAfter: '15 minutes',
    });
  },
});

/**
 * Rate limiter for general API endpoints
 * DISABLED in development mode
 */
export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: 'Too many requests, please slow down',
  standardHeaders: true,
  legacyHeaders: false,
  skipFailedRequests: false,
  skip: () => process.env.NODE_ENV !== 'production' || process.env.DISABLE_RATE_LIMIT === 'true',
  validate: { trustProxy: false, xForwardedForHeader: false }, // Disable strict proxy validation
  handler: (req: Request, res: Response) => {
    logger.warn('API rate limit exceeded', {
      ip: req.ip,
      path: req.path,
      userId: (req as any).user?.userId,
    });
    res.status(429).json({
      error: 'Too many requests',
      message: 'Too many requests, please slow down',
      retryAfter: '15 minutes',
    });
  },
});

/**
 * Stricter rate limiter for write operations (POST, PUT, DELETE, PATCH)
 * DISABLED in development mode
 */
export const writeOperationRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 write operations per minute
  message: 'Too many write operations, please slow down',
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV !== 'production' || process.env.DISABLE_RATE_LIMIT === 'true',
  validate: { trustProxy: false, xForwardedForHeader: false }, // Disable strict proxy validation
  handler: (req: Request, res: Response) => {
    logger.warn('Write operation rate limit exceeded', {
      ip: req.ip,
      path: req.path,
      method: req.method,
      userId: (req as any).user?.userId,
    });
    res.status(429).json({
      error: 'Too many write operations',
      message: 'Too many write operations, please slow down',
      retryAfter: '1 minute',
    });
  },
});

// ============================================================================
// CSRF PROTECTION
// ============================================================================

/**
 * CSRF token validation middleware
 *
 * For API-first applications with JWT tokens, we use a simpler approach:
 * - Require Origin header for state-changing operations
 * - Validate Origin against whitelist
 * - Use SameSite cookie policy
 */
export const csrfProtection = (req: Request, res: Response, next: NextFunction) => {
  // Skip CSRF for GET, HEAD, OPTIONS requests (read-only)
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  // Skip CSRF in test environment
  if (process.env.NODE_ENV === 'test') {
    return next();
  }

  // Skip CSRF for API authentication endpoints (handle their own validation)
  // Check both path (relative to mount) and originalUrl (full path)
  if (req.path.startsWith('/auth/') || (req.originalUrl && req.originalUrl.includes('/auth/'))) {
    return next();
  }

  // For state-changing operations, validate Origin header
  const origin = req.get('origin');
  const referer = req.get('referer');

  // Use CORS origins from config (always an array)
  const allowedOrigins = config.cors.origin;

  // In development, be more permissive
  if (process.env.NODE_ENV === 'development') {
    // Check if request comes from local development
    if (origin && (origin.includes('localhost') || origin.includes('127.0.0.1'))) {
      return next();
    }
    if (referer && (referer.includes('localhost') || referer.includes('127.0.0.1'))) {
      return next();
    }
  }

  // Validate Origin or Referer
  const isValidOrigin = origin && allowedOrigins.includes(origin);
  const isValidReferer =
    referer && allowedOrigins.some((allowed: string) => referer.startsWith(allowed));

  if (!isValidOrigin && !isValidReferer) {
    logger.warn('CSRF protection: Invalid origin/referer', {
      ip: req.ip,
      method: req.method,
      path: req.path,
      origin,
      referer,
    });

    return res.status(403).json({
      error: 'Forbidden',
      message: 'Invalid origin for state-changing operation',
    });
  }

  next();
};

// ============================================================================
// SECURITY HEADERS
// ============================================================================

/**
 * Add security-related headers to responses
 */
export const securityHeaders = (_req: Request, res: Response, next: NextFunction) => {
  // Get allowed origins for CSP connect-src (always an array from config)
  const allowedOrigins = config.cors.origin.join(' ');

  // Content Security Policy - allow connections to configured CORS origins
  // This is critical for cross-origin requests from frontend to backend API
  res.setHeader(
    'Content-Security-Policy',
    `default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' ${allowedOrigins}; frame-ancestors 'none';`
  );

  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');

  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // Enable XSS filter
  res.setHeader('X-XSS-Protection', '1; mode=block');

  // Referrer policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Permissions policy
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=()');

  next();
};

// ============================================================================
// REQUEST SIZE LIMITING
// ============================================================================

/**
 * Limit request body size to prevent DoS attacks
 */
export const requestSizeLimit = (req: Request, res: Response, next: NextFunction) => {
  const contentLength = parseInt(req.get('content-length') || '0', 10);
  const MAX_SIZE = 10 * 1024 * 1024; // 10MB

  if (contentLength > MAX_SIZE) {
    logger.warn('Request size limit exceeded', {
      ip: req.ip,
      path: req.path,
      contentLength,
    });

    res.status(413).json({
      error: 'Payload too large',
      message: 'Request body size exceeds maximum allowed size (10MB)',
    });
    return;
  }

  next();
};

// ============================================================================
// SANITIZE INPUT
// ============================================================================

/**
 * Basic input sanitization middleware
 * Removes potentially dangerous characters from request body
 */
export const sanitizeInput = (req: Request, _res: Response, next: NextFunction) => {
  if (req.body && typeof req.body === 'object') {
    sanitizeObject(req.body);
  }

  if (req.query && typeof req.query === 'object') {
    sanitizeObject(req.query);
  }

  next();
};

function sanitizeObject(obj: any): any {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      if (typeof obj[key] === 'string') {
        // Remove potentially dangerous characters
        obj[key] = obj[key]
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
          .replace(/javascript:/gi, '')
          .replace(/on\w+\s*=/gi, '');
      } else if (typeof obj[key] === 'object') {
        sanitizeObject(obj[key]);
      }
    }
  }

  return obj;
}
