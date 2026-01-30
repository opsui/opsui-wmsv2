/**
 * Integrations Routes
 *
 * REST API endpoints for managing external integrations (ERP, e-commerce, carriers)
 */

import { Router, Request, Response, NextFunction } from 'express';
import { IntegrationsRepository } from '../repositories/IntegrationsRepository';
import { IntegrationsService } from '../services/IntegrationsService';
import { authenticate, authorize } from '../middleware/auth';
import { UserRole } from '@opsui/shared';
import { getPool } from '../db/client';

const router = Router();
const repository = new IntegrationsRepository(getPool());
const service = new IntegrationsService(repository);

// ============================================================================
// MIDDLEWARE
// ============================================================================

// Apply authentication to all routes
router.use(authenticate);

// ============================================================================
// INTEGRATIONS CRUD
// ============================================================================

/**
 * GET /api/integrations
 * List all integrations with optional filtering
 * Access: ADMIN, SUPERVISOR (read-only)
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Non-admins can only view active integrations
    const filters: any = {};
    if (req.query.type) filters.type = req.query.type;
    if (req.query.provider) filters.provider = req.query.provider;
    if (req.query.status) filters.status = req.query.status;

    const integrations = await repository.findAll(filters);
    res.json(integrations);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/integrations/:integrationId
 * Get a specific integration by ID
 * Access: All authenticated users
 */
router.get('/:integrationId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const integration = await repository.findById(req.params.integrationId);
    if (!integration) {
      res.status(404).json({ error: 'Integration not found' });
      return;
    }
    res.json(integration);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/integrations
 * Create a new integration
 * Access: ADMIN only
 */
router.post(
  '/',
  authorize(UserRole.ADMIN),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const integration = await service.createIntegration(req.body);
      res.status(201).json(integration);
    } catch (error: any) {
      if (error.message.includes('Missing required configuration fields')) {
        res.status(400).json({ error: error.message });
        return;
      }
      next(error);
    }
  }
);

/**
 * PUT /api/integrations/:integrationId
 * Update an integration
 * Access: ADMIN only
 */
router.put(
  '/:integrationId',
  authorize(UserRole.ADMIN),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const integration = await service.updateIntegration(req.params.integrationId, req.body);
      if (!integration) {
        res.status(404).json({ error: 'Integration not found' });
        return;
      }
      res.json(integration);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /api/integrations/:integrationId
 * Delete an integration
 * Access: ADMIN only
 */
router.delete(
  '/:integrationId',
  authorize(UserRole.ADMIN),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const deleted = await service.deleteIntegration(req.params.integrationId);
      if (!deleted) {
        res.status(404).json({ error: 'Integration not found' });
        return;
      }
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
);

// ============================================================================
// CONNECTION TESTING
// ============================================================================

/**
 * POST /api/integrations/:integrationId/test
 * Test connection to an external integration
 * Access: ADMIN, SUPERVISOR
 */
router.post(
  '/:integrationId/test',
  authorize(UserRole.ADMIN, UserRole.SUPERVISOR),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await service.testConnection(req.params.integrationId);
      res.json(result);
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }
);

// ============================================================================
// SYNC JOBS
// ============================================================================

/**
 * GET /api/integrations/:integrationId/sync-jobs
 * Get sync job history for an integration
 * Access: ADMIN, SUPERVISOR
 */
router.get(
  '/:integrationId/sync-jobs',
  authorize(UserRole.ADMIN, UserRole.SUPERVISOR),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const jobs = await repository.findSyncJobs(req.params.integrationId, limit);
      res.json(jobs);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/integrations/:integrationId/sync
 * Trigger a manual sync job
 * Access: ADMIN, SUPERVISOR
 */
router.post(
  '/:integrationId/sync',
  authorize(UserRole.ADMIN, UserRole.SUPERVISOR),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const jobType = (req.query.type as string) || 'FULL_SYNC';
      const userId = (req as any).user.userId;

      const job = await service.createSyncJob(req.params.integrationId, jobType as any, userId);
      res.status(201).json(job);
    } catch (error: any) {
      if (error.message.includes('must be active')) {
        res.status(400).json({ error: error.message });
        return;
      }
      next(error);
    }
  }
);

/**
 * GET /api/integrations/sync-jobs/:jobId
 * Get details of a specific sync job
 * Access: ADMIN, SUPERVISOR
 */
router.get(
  '/sync-jobs/:jobId',
  authorize(UserRole.ADMIN, UserRole.SUPERVISOR),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const job = await repository.findSyncJobById(req.params.jobId);
      if (!job) {
        res.status(404).json({ error: 'Sync job not found' });
        return;
      }
      res.json(job);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/integrations/sync-jobs/:jobId/logs
 * Get logs for a specific sync job
 * Access: ADMIN, SUPERVISOR
 */
router.get(
  '/sync-jobs/:jobId/logs',
  authorize(UserRole.ADMIN, UserRole.SUPERVISOR),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const limit = parseInt(req.query.limit as string) || 100;
      const logs = await repository.findSyncLogEntrys(req.params.jobId, limit);
      res.json(logs);
    } catch (error) {
      next(error);
    }
  }
);

// ============================================================================
// WEBHOOKS
// ============================================================================

/**
 * POST /api/integrations/:integrationId/webhooks
 * Receive webhook from external system
 * Access: Public (with integration verification)
 */
router.post('/:integrationId/webhooks', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const integration = await repository.findById(req.params.integrationId);
    if (!integration) {
      res.status(404).json({ error: 'Integration not found' });
      return;
    }

    // Verify webhook signature if configured
    // This is a simplified check - production should use HMAC signatures
    const signature = req.headers['x-webhook-signature'] as string;
    if (integration.webhookSettings?.secretKey && !signature) {
      res.status(401).json({ error: 'Missing webhook signature' });
      return;
    }

    const eventType = req.headers['x-webhook-event'] as string;
    if (!eventType) {
      res.status(400).json({ error: 'Missing event type header' });
      return;
    }

    const event = await service.handleWebhook(req.params.integrationId, eventType as any, req.body);

    res.status(202).json({
      message: 'Webhook received',
      eventId: event.eventId,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/integrations/:integrationId/webhooks
 * Get webhook event history for an integration
 * Access: ADMIN, SUPERVISOR
 */
router.get(
  '/:integrationId/webhooks',
  authorize(UserRole.ADMIN, UserRole.SUPERVISOR),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const filters: any = { integrationId: req.params.integrationId };
      if (req.query.status) filters.status = req.query.status;
      if (req.query.eventType) filters.eventType = req.query.eventType;

      const events = await repository.findWebhookEvents(filters, limit);
      res.json(events);
    } catch (error) {
      next(error);
    }
  }
);

// ============================================================================
// CARRIER ACCOUNTS
// ============================================================================

/**
 * GET /api/integrations/:integrationId/carrier-accounts
 * Get carrier accounts for an integration
 * Access: ADMIN, SUPERVISOR
 */
router.get(
  '/:integrationId/carrier-accounts',
  authorize(UserRole.ADMIN, UserRole.SUPERVISOR),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const accounts = await repository.findCarrierAccounts(req.params.integrationId);
      res.json(accounts);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/integrations/:integrationId/carrier-accounts
 * Create a new carrier account
 * Access: ADMIN
 */
router.post(
  '/:integrationId/carrier-accounts',
  authorize(UserRole.ADMIN),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const account = await service.createCarrierAccount(req.params.integrationId, req.body);
      res.status(201).json(account);
    } catch (error: any) {
      if (error.message.includes('can only be added to')) {
        res.status(400).json({ error: error.message });
        return;
      }
      next(error);
    }
  }
);

/**
 * PUT /api/integrations/carrier-accounts/:carrierAccountId
 * Update a carrier account
 * Access: ADMIN
 */
router.put(
  '/carrier-accounts/:carrierAccountId',
  authorize(UserRole.ADMIN),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const account = await service.updateCarrierAccount(req.params.carrierAccountId, req.body);
      if (!account) {
        res.status(404).json({ error: 'Carrier account not found' });
        return;
      }
      res.json(account);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /api/integrations/carrier-accounts/:carrierAccountId
 * Delete a carrier account
 * Access: ADMIN
 */
router.delete(
  '/carrier-accounts/:carrierAccountId',
  authorize(UserRole.ADMIN),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const deleted = await service.deleteCarrierAccount(req.params.carrierAccountId);
      if (!deleted) {
        res.status(404).json({ error: 'Carrier account not found' });
        return;
      }
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
);

export default router;
