/**
 * Express application configuration
 *
 * Sets up middleware, routes, and error handling
 */

import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import config from './config';
import { logger } from './config/logger';
import routes from './routes';
import {
  errorHandler,
  notFoundHandler,
  rateLimiter,
  requestId,
  auditLoggingMiddleware,
} from './middleware';
import {
  authRateLimiter,
  apiRateLimiter,
  writeOperationRateLimiter,
  csrfProtection,
  securityHeaders,
  requestSizeLimit,
  sanitizeInput,
} from './middleware/security';
import { testConnection, setupShutdownHandlers } from './db/client';
import { setupSwagger } from './docs/swagger';
import { metricsMiddleware, metricsEndpoint } from './observability/prometheus';
import { getAuditService } from './services/AuditService';

// ============================================================================
// CONNECTION TRACKING FOR HOT RELOAD
// ============================================================================

const activeConnections = new Set<string>();

function trackConnections(req: Request, res: Response, next: NextFunction): void {
  const connectionId = `${req.ip}-${Date.now()}-${Math.random()}`;
  activeConnections.add(connectionId);

  res.on('finish', () => {
    activeConnections.delete(connectionId);
  });

  res.on('close', () => {
    activeConnections.delete(connectionId);
  });

  next();
}

// Export for health checks and graceful shutdown
export function getActiveConnections(): number {
  return activeConnections.size;
}

export function getAllConnections(): Set<string> {
  return activeConnections;
}

// ============================================================================
// GRACEFUL SHUTDOWN
// ============================================================================

export async function waitForDrain(timeoutMs: number = 30000): Promise<boolean> {
  const startTime = Date.now();
  const initialCount = activeConnections.size;

  if (initialCount === 0) {
    logger.info('No active connections, immediate shutdown possible');
    return true;
  }

  logger.info(`Waiting for ${initialCount} active connections to drain...`);

  while (activeConnections.size > 0) {
    const elapsed = Date.now() - startTime;
    if (elapsed >= timeoutMs) {
      logger.warn(`Timeout waiting for connections to drain. ${activeConnections.size} remaining.`);
      return false;
    }

    // Log progress every 5 seconds
    if (elapsed % 5000 < 100) {
      logger.info(`Still waiting for ${activeConnections.size} connections to drain...`);
    }

    await new Promise(resolve => setTimeout(resolve, 100));
  }

  const drainTime = Date.now() - startTime;
  logger.info(`All connections drained in ${drainTime}ms`);
  return true;
}

// ============================================================================
// CREATE APP - HELPER FUNCTIONS
// ============================================================================

/**
 * Configure security middleware for the application
 */
function setupSecurityMiddleware(app: Application): void {
  // Custom security headers
  app.use(securityHeaders);

  // Helmet for additional security headers (with frameguard: deny to work with securityHeaders)
  app.use(helmet({ frameguard: { action: 'deny' } }));

  // CORS configuration
  app.use(
    cors({
      origin: config.cors.origin,
      credentials: true,
    })
  );

  // Request size limiting
  app.use(requestSizeLimit);

  // Input sanitization
  app.use(sanitizeInput);

  // CSRF protection for state-changing operations
  app.use('/api', csrfProtection);

  // Rate limiting (production only)
  if (config.isProduction()) {
    // Auth endpoints - stricter limits
    app.use('/api/auth/login', authRateLimiter);
    app.use('/api/auth/register', authRateLimiter);
    app.use('/api/auth/refresh', authRateLimiter);

    // General API rate limiting
    app.use('/api', apiRateLimiter);

    // Stricter limits for write operations
    app.use('/api', (req, res, next) => {
      if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
        return writeOperationRateLimiter(req, res, next);
      }
      next();
    });
  }
}

/**
 * Configure body parsing middleware
 */
function setupBodyParsing(app: Application): void {
  // Parse JSON bodies
  app.use(express.json({ limit: '10mb' }));

  // Parse URL-encoded bodies
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
}

/**
 * Configure compression middleware
 */
function setupCompression(app: Application): void {
  app.use(compression());
}

/**
 * Configure rate limiting middleware
 */
function setupRateLimiting(app: Application): void {
  if (config.isProduction()) {
    app.use('/api/', rateLimiter);
  }
}

/**
 * Configure request tracking middleware
 */
function setupRequestTracking(app: Application): void {
  // Request ID tracking
  app.use(requestId);

  // Request logging
  app.use((req, _res, next) => {
    logger.debug('Incoming request', {
      requestId: req.id,
      method: req.method,
      path: req.path,
      ip: req.ip,
      userAgent: req.get('user-agent'),
      activeConnections: activeConnections.size,
    });
    next();
  });
}

/**
 * Configure audit logging
 */
function setupAuditLogging(app: Application): void {
  // Log ALL API requests to audit logs
  app.use('/api', (req, res, next) => {
    auditLoggingMiddleware(req, res, next).catch(next);
  });
}

/**
 * Configure API routes
 */
function setupApiRoutes(app: Application): void {
  // API v1 routes
  app.use('/api/v1', routes);

  // Legacy API redirect (v1 is now current)
  app.get('/api', (_req, res) => {
    res.redirect(301, '/api/v1');
  });

  // Prometheus metrics endpoint (if enabled)
  if (config.prometheus.enabled) {
    app.get('/metrics', (req, res, next) => {
      metricsEndpoint(req, res).catch(next);
    });
  }
}

/**
 * Configure documentation routes
 */
function setupDocumentationRoutes(app: Application): void {
  if (!config.isProduction()) {
    setupSwagger(app);
    logger.info('Swagger UI available at http://localhost:3001/api/docs');
    logger.info('API v1 endpoint: http://localhost:3001/api/v1');
  }
}

/**
 * Configure system endpoints
 */
function setupSystemEndpoints(app: Application): void {
  // Root endpoint
  app.get('/', (_req, res) => {
    res.json({
      name: 'WMS API',
      version: '1.0.0',
      environment: config.nodeEnv,
      timestamp: new Date().toISOString(),
      endpoints: {
        api: '/api',
        health: '/health',
        ready: '/ready',
        docs: !config.isProduction() ? '/api/docs' : undefined,
      },
    });
  });

  // Health endpoint with connection info
  app.get('/health', (_req, res) => {
    res.json({
      status: 'ok',
      activeConnections: activeConnections.size,
      timestamp: new Date().toISOString(),
    });
  });

  // Readiness check for orchestrators
  app.get('/ready', (_req, res) => {
    const isReady = activeConnections.size < 100;
    res.status(isReady ? 200 : 503).json({
      ready: isReady,
      activeConnections: activeConnections.size,
      timestamp: new Date().toISOString(),
    });
  });
}

/**
 * Configure routes and endpoints
 */
function setupRoutes(app: Application): void {
  setupApiRoutes(app);
  setupDocumentationRoutes(app);
  setupSystemEndpoints(app);
}

/**
 * Configure error handlers
 */
function setupErrorHandlers(app: Application): void {
  // 404 handler
  app.use(notFoundHandler);

  // Global error handler
  app.use(errorHandler);
}

// ============================================================================
// CREATE APP
// ============================================================================

export function createApp(): Application {
  const app = express();

  // Setup all middleware and routes
  setupSecurityMiddleware(app);
  setupBodyParsing(app);
  setupCompression(app);
  setupRateLimiting(app);

  // Connection tracking
  app.use(trackConnections);

  // Prometheus metrics (if enabled)
  if (config.prometheus.enabled) {
    app.use(metricsMiddleware);
  }

  setupRequestTracking(app);
  setupAuditLogging(app);
  setupRoutes(app);
  setupErrorHandlers(app);

  return app;
}

// ============================================================================
// STARTUP
// ============================================================================

export async function startServer(): Promise<void> {
  logger.info('Starting WMS Backend...', {
    environment: config.nodeEnv,
    port: config.port,
  });

  // Test database connection
  const dbConnected = await testConnection();

  if (!dbConnected) {
    logger.error('Failed to connect to database');
    throw new Error('Database connection failed');
  }

  // Initialize Audit Service
  try {
    const auditService = getAuditService();
    await auditService.initialize();
    logger.info('Audit service initialized');
  } catch (error) {
    logger.error('Failed to initialize audit service', { error });
    // Don't fail startup, just log the error
  }

  // Setup shutdown handlers
  setupShutdownHandlers();

  logger.info('WMS Backend started successfully');
}
