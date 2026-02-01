/**
 * Request ID Middleware
 *
 * Generates and tracks unique request IDs for log correlation and debugging
 */

import { v4 as uuidv4 } from 'uuid';
import { Request, Response, NextFunction } from 'express';
import { logger } from '../config/logger';

// ============================================================================
// TYPES
// ============================================================================

declare global {
  namespace Express {
    interface Request {
      id?: string;
    }
  }
}

// ============================================================================
// REQUEST ID MIDDLEWARE
// ============================================================================

/**
 * Generate and attach unique request ID to each request
 *
 * Request IDs are used for:
 * - Log correlation across services
 * - Debugging and troubleshooting
 * - Tracing request flow through the system
 * - Client-side error reporting
 */
export function requestId(req: Request, res: Response, next: NextFunction): void {
  // Get request ID from header or generate new one
  const requestId = (req.get('X-Request-ID') as string) || uuidv4();

  // Attach to request
  req.id = requestId;

  // Set response header for client reference
  res.setHeader('X-Request-ID', requestId);

  // Log request ID for correlation
  logger.debug('Request started', {
    requestId,
    method: req.method,
    path: req.path,
    ip: req.ip,
  });

  next();
}

// ============================================================================
// REQUEST ID LOGGING ENHANCER
// ============================================================================

/**
 * Enhance logger to include request ID automatically
 * This ensures all logs for a request are correlated
 */
export function enhanceLoggerWithRequestId(req: Request, _res: Response, next: NextFunction): void {
  if (req.id) {
    // Add request ID to all log context
    logger.defaultMeta = {
      ...logger.defaultMeta,
      requestId: req.id,
    };
  }

  next();
}
