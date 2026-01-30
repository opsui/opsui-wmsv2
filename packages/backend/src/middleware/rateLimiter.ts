/**
 * Rate limiting middleware
 *
 * Prevents abuse by limiting request rate per IP address
 */

import rateLimit from 'express-rate-limit';
import config from '../config';

// ============================================================================
// RATE LIMITER
// ============================================================================

export const rateLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  message: {
    error: 'Too many requests from this IP, please try again later',
    code: 'RATE_LIMIT_EXCEEDED',
  },
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  // Skip rate limiting for health check endpoint and in development
  skip: req => req.path === '/health' || process.env.NODE_ENV !== 'production',
});

// ============================================================================
// STRICT RATE LIMITER (for auth endpoints)
// ============================================================================

export const authRateLimiterSimple = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 attempts per window (increased for development)
  message: {
    error: 'Too many authentication attempts, please try again later',
    code: 'AUTH_RATE_LIMIT_EXCEEDED',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV !== 'production', // Skip in development
});

// ============================================================================
// PICKING RATE LIMITER (for pick actions)
// ============================================================================

export const pickingRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 pick actions per minute
  message: {
    error: 'Too many pick actions, please slow down',
    code: 'PICK_RATE_LIMIT_EXCEEDED',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV !== 'production', // Skip in development
});
