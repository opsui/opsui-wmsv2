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
// CREATE APP
// ============================================================================

export function createApp(): Application {
  const app = express();

  // --------------------------------------------------------------------------
  // SECURITY MIDDLEWARE
  // --------------------------------------------------------------------------

  // Custom security headers
  app.use(securityHeaders);

  // Helmet for additional security headers
  app.use(helmet());

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

  // Rate limiting
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

  // --------------------------------------------------------------------------
  // BODY PARSING
  // --------------------------------------------------------------------------

  // Parse JSON bodies
  app.use(express.json({ limit: '10mb' }));

  // Parse URL-encoded bodies
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // --------------------------------------------------------------------------
  // COMPRESSION
  // --------------------------------------------------------------------------

  app.use(compression());

  // --------------------------------------------------------------------------
  // RATE LIMITING
  // --------------------------------------------------------------------------

  if (config.isProduction()) {
    app.use('/api/', rateLimiter);
  }

  // --------------------------------------------------------------------------
  // REQUEST ID TRACKING
  // --------------------------------------------------------------------------

  app.use(requestId);

  // --------------------------------------------------------------------------
  // PROMETHEUS METRICS
  // --------------------------------------------------------------------------

  if (config.prometheus.enabled) {
    app.use(metricsMiddleware);
  }

  // --------------------------------------------------------------------------
  // CONNECTION TRACKING
  // --------------------------------------------------------------------------

  app.use(trackConnections);

  // --------------------------------------------------------------------------
  // REQUEST LOGGING
  // --------------------------------------------------------------------------

  app.use((req, res, next) => {
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

  // --------------------------------------------------------------------------
  // AUDIT LOGGING
  // --------------------------------------------------------------------------

  // Log ALL API requests to audit logs
  app.use('/api', auditLoggingMiddleware);

  // --------------------------------------------------------------------------
  // ROUTES
  // --------------------------------------------------------------------------

  // API routes
  app.use('/api', routes);

  // Prometheus metrics endpoint (if enabled)
  if (config.prometheus.enabled) {
    app.get('/metrics', metricsEndpoint);
  }

  // API Documentation (Swagger UI) - Only in development
  if (!config.isProduction()) {
    setupSwagger(app);
    logger.info('Swagger UI available at http://localhost:3001/api/docs');
  }

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
    const isReady = activeConnections.size < 100; // Consider ready if not overloaded
    res.status(isReady ? 200 : 503).json({
      ready: isReady,
      activeConnections: activeConnections.size,
      timestamp: new Date().toISOString(),
    });
  });

  // --------------------------------------------------------------------------
  // ERROR HANDLING
  // --------------------------------------------------------------------------

  // 404 handler
  app.use(notFoundHandler);

  // Global error handler
  app.use(errorHandler);

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
