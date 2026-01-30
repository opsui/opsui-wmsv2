/**
 * Prometheus Metrics Middleware
 *
 * Provides HTTP metrics endpoint for Prometheus scraping
 * and request tracking middleware
 */

import { Request, Response, NextFunction } from 'express';
import promClient, { Registry, Counter, Histogram, Gauge, Summary } from 'prom-client';
import { logger } from '../config/logger';

// ============================================================================
// REGISTRY
// ============================================================================

const register = new Registry();

// Add default metrics (CPU, memory, etc.)
promClient.collectDefaultMetrics({
  register,
  prefix: 'wms_',
});

// ============================================================================
// HTTP METRICS
// ============================================================================

/**
 * Counter for total HTTP requests
 */
export const httpRequestsTotal = new Counter({
  name: 'wms_http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register],
});

/**
 * Histogram for HTTP request duration
 */
export const httpRequestDurationMs = new Histogram({
  name: 'wms_http_request_duration_ms',
  help: 'Duration of HTTP requests in milliseconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [1, 5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000],
  registers: [register],
});

/**
 * Histogram for request size
 */
export const httpRequestSizeBytes = new Histogram({
  name: 'wms_http_request_size_bytes',
  help: 'Size of HTTP requests in bytes',
  labelNames: ['method', 'route'],
  buckets: [100, 1000, 10000, 100000, 1000000, 10000000],
  registers: [register],
});

/**
 * Histogram for response size
 */
export const httpResponseSizeBytes = new Histogram({
  name: 'wms_http_response_size_bytes',
  help: 'Size of HTTP responses in bytes',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [100, 1000, 10000, 100000, 1000000, 10000000],
  registers: [register],
});

/**
 * Counter for HTTP errors
 */
export const httpErrorsTotal = new Counter({
  name: 'wms_http_errors_total',
  help: 'Total number of HTTP errors',
  labelNames: ['method', 'route', 'status_code', 'error_type'],
  registers: [register],
});

/**
 * Gauge for concurrent requests
 */
export const httpConcurrentRequests = new Gauge({
  name: 'wms_http_concurrent_requests',
  help: 'Number of concurrent HTTP requests',
  registers: [register],
});

// ============================================================================
// DATABASE METRICS
// ============================================================================

/**
 * Histogram for database query duration
 */
export const dbQueryDurationMs = new Histogram({
  name: 'wms_db_query_duration_ms',
  help: 'Duration of database queries in milliseconds',
  labelNames: ['operation', 'table'],
  buckets: [1, 5, 10, 25, 50, 100, 250, 500, 1000],
  registers: [register],
});

/**
 * Gauge for database connection pool
 */
export const dbConnectionPool = new Gauge({
  name: 'wms_db_connection_pool',
  help: 'Database connection pool statistics',
  labelNames: ['state'], // total, waiting, idle, active
  registers: [register],
});

/**
 * Counter for database errors
 */
export const dbErrorsTotal = new Counter({
  name: 'wms_db_errors_total',
  help: 'Total number of database errors',
  labelNames: ['operation', 'error_code'],
  registers: [register],
});

// ============================================================================
// CACHE METRICS (Redis)
// ============================================================================

/**
 * Counter for cache hits
 */
export const cacheHitsTotal = new Counter({
  name: 'wms_cache_hits_total',
  help: 'Total number of cache hits',
  labelNames: ['cache_type'],
  registers: [register],
});

/**
 * Counter for cache misses
 */
export const cacheMissesTotal = new Counter({
  name: 'wms_cache_misses_total',
  help: 'Total number of cache misses',
  labelNames: ['cache_type'],
  registers: [register],
});

/**
 * Gauge for cache size
 */
export const cacheSize = new Gauge({
  name: 'wms_cache_size',
  help: 'Current cache size',
  labelNames: ['cache_type'],
  registers: [register],
});

// ============================================================================
// BUSINESS METRICS
// ============================================================================

/**
 * Counter for orders processed
 */
export const ordersProcessedTotal = new Counter({
  name: 'wms_orders_processed_total',
  help: 'Total number of orders processed',
  labelNames: ['status', 'priority'],
  registers: [register],
});

/**
 * Histogram for order processing duration
 */
export const orderProcessingDurationMs = new Histogram({
  name: 'wms_order_processing_duration_ms',
  help: 'Duration from order creation to shipment in milliseconds',
  labelNames: ['priority'],
  buckets: [60000, 300000, 900000, 1800000, 3600000, 7200000, 14400000, 28800000],
  registers: [register],
});

/**
 * Counter for picks completed
 */
export const picksCompletedTotal = new Counter({
  name: 'wms_picks_completed_total',
  help: 'Total number of picks completed',
  labelNames: ['picker_id', 'zone'],
  registers: [register],
});

/**
 * Histogram for pick duration
 */
export const pickDurationMs = new Histogram({
  name: 'wms_pick_duration_ms',
  help: 'Duration of individual picks in milliseconds',
  labelNames: ['picker_id', 'zone'],
  buckets: [1000, 5000, 10000, 30000, 60000, 120000, 300000],
  registers: [register],
});

/**
 * Counter for inventory transactions
 */
export const inventoryTransactionsTotal = new Counter({
  name: 'wms_inventory_transactions_total',
  help: 'Total number of inventory transactions',
  labelNames: ['transaction_type', 'sku'],
  registers: [register],
});

/**
 * Gauge for current active users
 */
export const activeUsersGauge = new Gauge({
  name: 'wms_active_users',
  help: 'Number of currently active users by role',
  labelNames: ['role'],
  registers: [register],
});

/**
 * Gauge for orders by status
 */
export const ordersByStatusGauge = new Gauge({
  name: 'wms_orders_by_status',
  help: 'Number of orders by current status',
  labelNames: ['status'],
  registers: [register],
});

/**
 * Counter for exceptions raised
 */
export const exceptionsTotal = new Counter({
  name: 'wms_exceptions_total',
  help: 'Total number of order exceptions',
  labelNames: ['exception_type', 'severity'],
  registers: [register],
});

// ============================================================================
// RATE LIMITING METRICS
// ============================================================================

/**
 * Counter for rate limit violations
 */
export const rateLimitViolationsTotal = new Counter({
  name: 'wms_rate_limit_violations_total',
  help: 'Total number of rate limit violations',
  labelNames: ['endpoint', 'limit_type'],
  registers: [register],
});

// ============================================================================
// MIDDLEWARE
// ============================================================================

/**
 * Metrics tracking middleware
 */
export const metricsMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();

  // Increment concurrent requests
  httpConcurrentRequests.inc();

  // Track request size
  const contentLength = req.get('content-length');
  if (contentLength) {
    httpRequestSizeBytes
      .labels(req.method, req.route?.path || req.path)
      .observe(parseInt(contentLength, 10));
  }

  // Hook into response finish
  res.on('finish', () => {
    const duration = Date.now() - start;
    const route = req.route?.path || req.path;
    const statusCode = res.statusCode.toString();

    // Record request duration
    httpRequestDurationMs.labels(req.method, route, statusCode).observe(duration);

    // Increment total requests
    httpRequestsTotal.labels(req.method, route, statusCode).inc();

    // Track response size
    if (res.get('content-length')) {
      httpResponseSizeBytes
        .labels(req.method, route, statusCode)
        .observe(parseInt(res.get('content-length')!, 10));
    }

    // Track errors
    if (statusCode.startsWith('4') || statusCode.startsWith('5')) {
      httpErrorsTotal.labels(req.method, route, statusCode, 'http_error').inc();
    }

    // Decrement concurrent requests
    httpConcurrentRequests.dec();
  });

  next();
};

// ============================================================================
// METRICS ENDPOINT
// ============================================================================

/**
 * Metrics endpoint handler for Prometheus scraping
 * Returns metrics in Prometheus text format
 */
export async function metricsEndpoint(req: Request, res: Response): Promise<void> {
  try {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  } catch (error) {
    logger.error('Error generating metrics', { error });
    res.status(500).end('Error generating metrics');
  }
}

/**
 * Health check endpoint that includes metrics
 */
export async function healthWithMetrics(req: Request, res: Response): Promise<void> {
  try {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      metrics: {
        memory: process.memoryUsage(),
        cpu: process.cpuUsage(),
      },
    });
  } catch (error) {
    logger.error('Error in health check', { error });
    res.status(500).json({ status: 'error', error: 'Health check failed' });
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Reset all metrics (useful for testing)
 */
export function resetMetrics(): void {
  register.resetMetrics();
}

/**
 * Get metrics as JSON (for debugging)
 */
export async function getMetricsAsJSON(): Promise<any> {
  return register.getMetricsAsJSON();
}

/**
 * Create a custom counter
 */
export function createCounter(
  name: string,
  help: string,
  labelNames: string[] = []
): Counter<string> {
  return new Counter({
    name: `wms_${name}`,
    help,
    labelNames,
    registers: [register],
  });
}

/**
 * Create a custom histogram
 */
export function createHistogram(
  name: string,
  help: string,
  options?: {
    labelNames?: string[];
    buckets?: number[];
  }
): Histogram<string> {
  return new Histogram({
    name: `wms_${name}`,
    help,
    labelNames: options?.labelNames || [],
    buckets: options?.buckets || [1, 5, 10, 25, 50, 100, 250, 500, 1000],
    registers: [register],
  });
}

/**
 * Create a custom gauge
 */
export function createGauge(name: string, help: string, labelNames: string[] = []): Gauge<string> {
  return new Gauge({
    name: `wms_${name}`,
    help,
    labelNames,
    registers: [register],
  });
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  register,
  metricsEndpoint,
  healthWithMetrics,
  metricsMiddleware,
  resetMetrics,
  getMetricsAsJSON,
  createCounter,
  createHistogram,
  createGauge,

  // HTTP metrics
  httpRequestsTotal,
  httpRequestDurationMs,
  httpRequestSizeBytes,
  httpResponseSizeBytes,
  httpErrorsTotal,
  httpConcurrentRequests,

  // Database metrics
  dbQueryDurationMs,
  dbConnectionPool,
  dbErrorsTotal,

  // Cache metrics
  cacheHitsTotal,
  cacheMissesTotal,
  cacheSize,

  // Business metrics
  ordersProcessedTotal,
  orderProcessingDurationMs,
  picksCompletedTotal,
  pickDurationMs,
  inventoryTransactionsTotal,
  activeUsersGauge,
  ordersByStatusGauge,
  exceptionsTotal,

  // Rate limiting
  rateLimitViolationsTotal,
};
