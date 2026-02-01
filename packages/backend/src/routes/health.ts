/**
 * Health check routes
 */

import { Router } from 'express';
import { getHealthStatus } from '../db/client';
import config from '../config';

const router = Router();

/**
 * GET /health
 * Basic health check (doesn't require DB)
 */
router.get('/', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: config.nodeEnv,
  });
});

/**
 * GET /health/detailed
 * Detailed health check (includes DB status)
 */
router.get('/detailed', async (_req, res) => {
  const dbHealth = await getHealthStatus();

  const health = {
    status: dbHealth.healthy ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: config.nodeEnv,
    database: {
      healthy: dbHealth.healthy,
      connections: dbHealth.connections,
      waiting: dbHealth.waiting,
      max: dbHealth.max,
    },
    features: {
      websocket: config.features.websocket,
      redisCache: config.features.redisCache,
      auditLog: config.features.auditLog,
    },
  };

  res.status(dbHealth.healthy ? 200 : 503).json(health);
});

/**
 * GET /health/ready
 * Readiness probe (for Kubernetes)
 */
router.get('/ready', async (_req, res) => {
  const dbHealth = await getHealthStatus();

  if (dbHealth.healthy) {
    res.status(200).json({ status: 'ready' });
  } else {
    res.status(503).json({ status: 'not ready', database: 'unhealthy' });
  }
});

/**
 * GET /health/live
 * Liveness probe (for Kubernetes)
 */
router.get('/live', (_req, res) => {
  res.status(200).json({ status: 'alive' });
});

export default router;
