/**
 * Global error handling middleware
 *
 * Catches all errors and formats them appropriately for the client
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '../config/logger';
import { WMSError } from '@opsui/shared';

// ============================================================================
// ERROR TYPES
// ============================================================================

interface AppError extends Error {
  statusCode?: number;
  code?: string;
  details?: unknown;
  stack?: string;
}

// ============================================================================
// ERROR HANDLER MIDDLEWARE
// ============================================================================

export function errorHandler(
  err: AppError,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Log the error
  logger.error('Request error', {
    error: err.message,
    code: err.code,
    statusCode: err.statusCode,
    path: req.path,
    method: req.method,
    stack: err.stack,
  });

  // Determine status code
  const statusCode = err.statusCode || 500;
  const code = err.code || 'INTERNAL_ERROR';

  // Format error response
  const errorResponse: {
    error: string;
    code: string;
    details?: unknown;
    stack?: string;
  } = {
    error: err.message || 'An unexpected error occurred',
    code,
  };

  // Include details for WMSError
  if (err instanceof WMSError) {
    errorResponse.details = err.details;
  }

  // Include stack trace in development
  if (process.env.NODE_ENV === 'development' && err.stack) {
    errorResponse.stack = err.stack;
  }

  res.status(statusCode).json(errorResponse);
}

// ============================================================================
// 404 HANDLER
// ============================================================================

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    error: `Route not found: ${req.method} ${req.path}`,
    code: 'NOT_FOUND',
  });
}

// ============================================================================
// ASYNC ERROR WRAPPER
// ============================================================================

/**
 * Wraps async route handlers to catch errors and pass them to error middleware
 */
export function asyncHandler<T extends Request = Request>(
  fn: (req: T, res: Response, next: NextFunction) => Promise<void> | void
) {
  return (req: T, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// ============================================================================
// VALIDATION ERROR FACTORY
// ============================================================================

export class ValidationError extends Error {
  constructor(
    message: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'ValidationError';
    this.statusCode = 400;
    this.code = 'VALIDATION_ERROR';
  }
  statusCode?: number;
  code?: string;
}

// ============================================================================
// HTTP ERROR FACTORIES
// ============================================================================

export function badRequest(message: string, details?: unknown) {
  const error = new Error(message) as AppError;
  error.statusCode = 400;
  error.code = 'BAD_REQUEST';
  error.details = details;
  return error;
}

export function unauthorized(message: string = 'Unauthorized') {
  const error = new Error(message) as AppError;
  error.statusCode = 401;
  error.code = 'UNAUTHORIZED';
  return error;
}

export function forbidden(message: string = 'Forbidden') {
  const error = new Error(message) as AppError;
  error.statusCode = 403;
  error.code = 'FORBIDDEN';
  return error;
}

export function notFound(resource: string, id?: string) {
  const message = id ? `${resource} (${id}) not found` : `${resource} not found`;
  const error = new Error(message) as AppError;
  error.statusCode = 404;
  error.code = 'NOT_FOUND';
  return error;
}

export function conflict(message: string, details?: unknown) {
  const error = new Error(message) as AppError;
  error.statusCode = 409;
  error.code = 'CONFLICT';
  error.details = details;
  return error;
}

export function internalError(message: string = 'Internal server error') {
  const error = new Error(message) as AppError;
  error.statusCode = 500;
  error.code = 'INTERNAL_ERROR';
  return error;
}
