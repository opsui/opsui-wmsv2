/**
 * NetSuite Webhook Routes
 *
 * Endpoints for receiving real-time updates from NetSuite SuiteScripts.
 */

import { Router, Request, Response } from 'express';
import { getPool } from '../db/client';
import { logger } from '../config/logger';
import { NetSuiteWebhookService, NetSuiteWebhookPayload } from '../services/NetSuiteWebhookService';
import { NetSuiteOrderSyncService } from '../services/NetSuiteOrderSyncService';
import { NetSuiteClient } from '../services/NetSuiteClient';

const router = Router();

// Initialize webhook service
let webhookService: NetSuiteWebhookService | null = null;

function getWebhookService(): NetSuiteWebhookService {
  if (!webhookService) {
    const pool = getPool();
    webhookService = new NetSuiteWebhookService(pool, client => {
      return new NetSuiteOrderSyncService(client);
    });
  }
  return webhookService;
}

/**
 * POST /api/webhooks/netsuite
 *
 * Receive webhook events from NetSuite.
 * Events are processed immediately for high-priority items or queued.
 */
router.post('/netsuite', async (req: Request, res: Response): Promise<void> => {
  const startTime = Date.now();

  try {
    const payload = req.body as NetSuiteWebhookPayload;
    const signature = (req.headers['x-netsuite-signature'] as string) || '';
    const integrationId =
      (req.headers['x-integration-id'] as string) || (req.query.integrationId as string);

    if (!payload || !payload.eventType || !payload.internalId) {
      res.status(400).json({
        error: 'Invalid webhook payload',
        required: ['eventType', 'internalId', 'recordType'],
      });
      return;
    }

    if (!integrationId) {
      res.status(400).json({
        error: 'Missing integration ID',
        hint: 'Include x-integration-id header or integrationId query param',
      });
      return;
    }

    logger.info('Received NetSuite webhook', {
      eventType: payload.eventType,
      internalId: payload.internalId,
      integrationId,
      hasSignature: !!signature,
    });

    const service = getWebhookService();
    const result = await service.handleWebhook(payload, signature, integrationId);

    const duration = Date.now() - startTime;

    if (result.success) {
      res.status(200).json({
        received: true,
        eventId: result.eventId,
        message: result.message || 'Webhook processed',
        durationMs: duration,
      });
    } else {
      res.status(result.error === 'Invalid signature' ? 401 : 400).json({
        received: false,
        eventId: result.eventId,
        error: result.error,
        durationMs: duration,
      });
    }
  } catch (error: any) {
    logger.error('Webhook processing error', {
      error: error.message,
      stack: error.stack,
    });

    res.status(500).json({
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

/**
 * GET /api/webhooks/netsuite/health
 *
 * Check webhook service health and pending events.
 */
router.get('/netsuite/health', async (_req: Request, res: Response): Promise<void> => {
  try {
    const service = getWebhookService();
    const pending = await service.getPendingCount();
    const failed = await service.getFailedCount();

    res.json({
      status: 'healthy',
      pendingEvents: pending,
      failedEvents: failed,
      processorRunning: true,
    });
  } catch (error: any) {
    res.status(500).json({
      status: 'unhealthy',
      error: error.message,
    });
  }
});

/**
 * POST /api/webhooks/netsuite/test
 *
 * Test endpoint for sending mock webhooks during development.
 */
router.post('/netsuite/test', async (req: Request, res: Response): Promise<void> => {
  if (process.env.NODE_ENV === 'production') {
    res.status(403).json({ error: 'Test endpoint disabled in production' });
    return;
  }

  try {
    const { eventType, internalId, tranId, integrationId } = req.body;

    if (!eventType || !internalId) {
      res.status(400).json({
        error: 'Missing required fields',
        required: ['eventType', 'internalId'],
      });
      return;
    }

    const payload: NetSuiteWebhookPayload = {
      eventType,
      internalId,
      tranId,
      recordType: eventType.includes('FULFILLMENT') ? 'itemFulfillment' : 'salesOrder',
      timestamp: new Date().toISOString(),
      data: req.body.data || {},
    };

    const service = getWebhookService();
    const result = await service.handleWebhook(
      payload,
      'test-signature', // Bypass signature check in dev
      integrationId || 'test-integration'
    );

    res.json({
      success: result.success,
      eventId: result.eventId,
      message: result.message,
      error: result.error,
    });
  } catch (error: any) {
    res.status(500).json({
      error: error.message,
    });
  }
});

/**
 * POST /api/webhooks/netsuite/secrets
 *
 * Register a webhook secret for an integration.
 */
router.post('/netsuite/secrets', async (req: Request, res: Response): Promise<void> => {
  try {
    const { integrationId, secretKey } = req.body;

    if (!integrationId || !secretKey) {
      res.status(400).json({
        error: 'Missing required fields',
        required: ['integrationId', 'secretKey'],
      });
      return;
    }

    const pool = getPool();
    await pool.query(
      `INSERT INTO netsuite_webhook_secrets (integration_id, secret_key)
       VALUES ($1, $2)
       ON CONFLICT (integration_id, secret_key) DO NOTHING`,
      [integrationId, secretKey]
    );

    // Deactivate old secrets
    await pool.query(
      `UPDATE netsuite_webhook_secrets
       SET is_active = false
       WHERE integration_id = $1 AND secret_key != $2`,
      [integrationId, secretKey]
    );

    res.json({
      success: true,
      message: 'Webhook secret registered',
    });
  } catch (error: any) {
    logger.error('Failed to register webhook secret', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

export default router;

/**
 * Register webhook service with app lifecycle
 */
export function initializeWebhookProcessor(): void {
  const service = getWebhookService();
  service.startProcessor(5000); // Process events every 5 seconds

  logger.info('NetSuite webhook processor started');

  // Graceful shutdown
  process.on('SIGTERM', () => {
    service.stopProcessor();
  });

  process.on('SIGINT', () => {
    service.stopProcessor();
  });
}
