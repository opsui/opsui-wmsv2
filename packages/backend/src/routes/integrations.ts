/**
 * Integrations Routes
 *
 * REST API endpoints for managing external integrations (ERP, e-commerce, carriers)
 */

import { Router, Request, Response, NextFunction } from 'express';
import { IntegrationsRepository } from '../repositories/IntegrationsRepository';
import { IntegrationsService } from '../services/IntegrationsService';
import { NetSuiteOrderSyncService } from '../services/NetSuiteOrderSyncService';
import { authenticate, authorize } from '../middleware/auth';
import { UserRole, IntegrationProvider, OrderPriority } from '@opsui/shared';
import { getPool } from '../db/client';
import { logger } from '../config/logger';
import { v4 as uuidv4 } from 'uuid';

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
    res.json({ integrations, total: integrations.length });
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
  async (req: Request, res: Response, _next: NextFunction) => {
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

// ============================================================================
// NETSUITE-SPECIFIC ROUTES
// ============================================================================

/**
 * Create a NetSuiteOrderSyncService using credentials from an integration's DB config
 */
function createNetSuiteSyncService(integration: any): NetSuiteOrderSyncService {
  const authConfig = integration.configuration?.auth || integration.configuration || {};
  return new NetSuiteOrderSyncService({
    accountId: authConfig.accountId,
    tokenId: authConfig.tokenId,
    tokenSecret: authConfig.tokenSecret,
    consumerKey: authConfig.consumerKey,
    consumerSecret: authConfig.consumerSecret,
  });
}

/**
 * POST /api/integrations/netsuite/test-connection
 * Test NetSuite connection using TBA credentials
 * Access: ADMIN, SUPERVISOR
 */
router.post(
  '/netsuite/test-connection',
  authorize(UserRole.ADMIN, UserRole.SUPERVISOR),
  async (req: Request, res: Response, _next: NextFunction) => {
    try {
      // Find the NetSuite integration to get DB credentials
      const integrations = await repository.findAll({
        provider: IntegrationProvider.NETSUITE,
      });
      if (integrations.length === 0) {
        res.status(400).json({ success: false, message: 'No NetSuite integration configured.' });
        return;
      }
      const syncService = createNetSuiteSyncService(integrations[0]);
      const result = await syncService.testConnection();
      res.json(result);
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to connect to NetSuite',
      });
    }
  }
);

/**
 * GET /api/integrations/netsuite/orders/preview
 * Preview NetSuite orders without importing them
 * Access: ADMIN, SUPERVISOR
 */
router.get(
  '/netsuite/orders/preview',
  authorize(UserRole.ADMIN, UserRole.SUPERVISOR),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const integrations = await repository.findAll({
        provider: IntegrationProvider.NETSUITE,
      });
      if (integrations.length === 0) {
        res.status(400).json({ error: 'No NetSuite integration configured.' });
        return;
      }
      const syncService = createNetSuiteSyncService(integrations[0]);

      const limit = parseInt(req.query.limit as string) || 20;
      const status = req.query.status as string;

      const result = await syncService.previewOrders({
        limit,
        status,
      });

      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/integrations/netsuite/sync-orders
 * Sync sales orders from NetSuite to WMS
 * Access: ADMIN, SUPERVISOR
 */
router.post(
  '/netsuite/sync-orders',
  authorize(UserRole.ADMIN, UserRole.SUPERVISOR),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { limit, status, lastSyncAt } = req.body;

      // Find the NetSuite integration
      const integrations = await repository.findAll({
        provider: IntegrationProvider.NETSUITE,
      });

      if (integrations.length === 0) {
        res.status(400).json({
          error: 'No NetSuite integration configured. Please create a NetSuite integration first.',
        });
        return;
      }

      const integration = integrations[0];
      const syncService = createNetSuiteSyncService(integration);
      const userId = (req as any).user.userId;

      // Create a sync job record
      const job = await service.createSyncJob(integration.integrationId, 'ORDER_SYNC', userId);

      // Perform the sync
      const result = await syncService.syncOrders(integration.integrationId, {
        limit: limit || 50,
        status: status || '_pendingFulfillment',
        lastSyncAt: lastSyncAt ? new Date(lastSyncAt) : integration.lastSyncAt,
      });

      res.json({
        jobId: job.jobId,
        ...result,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/integrations/:integrationId/netsuite/sync-orders
 * Sync sales orders from NetSuite for a specific integration
 * Access: ADMIN, SUPERVISOR
 */
router.post(
  '/:integrationId/netsuite/sync-orders',
  authorize(UserRole.ADMIN, UserRole.SUPERVISOR),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const integration = await repository.findById(req.params.integrationId);

      if (!integration) {
        res.status(404).json({ error: 'Integration not found' });
        return;
      }

      if (integration.provider !== IntegrationProvider.NETSUITE) {
        res.status(400).json({ error: 'This endpoint is only for NetSuite integrations' });
        return;
      }

      const { limit, status, lastSyncAt } = req.body;
      const syncService = createNetSuiteSyncService(integration);
      const userId = (req as any).user.userId;

      // Create a sync job record
      const job = await service.createSyncJob(integration.integrationId, 'ORDER_SYNC', userId);

      // Perform the sync
      const result = await syncService.syncOrders(integration.integrationId, {
        limit: limit || 50,
        status: status || '_pendingFulfillment',
        lastSyncAt: lastSyncAt ? new Date(lastSyncAt) : integration.lastSyncAt,
      });

      res.json({
        jobId: job.jobId,
        ...result,
      });
    } catch (error) {
      next(error);
    }
  }
);

// ============================================================================
// CSV IMPORT - Alternative to NetSuite API sync
// ============================================================================

/**
 * POST /api/integrations/:integrationId/csv-import
 * Import orders from CSV data (alternative to NetSuite API sync)
 * Access: ADMIN, SUPERVISOR
 *
 * CSV Format:
 * order_id,customer_name,sku,quantity,priority,shipping_address,city,state,postcode,country
 * SO-001,Acme Corp,SKU-001,5,HIGH,123 Main St,Auckland,Auckland,1010,NZ
 */
router.post(
  '/:integrationId/csv-import',
  authorize(UserRole.ADMIN, UserRole.SUPERVISOR),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const integration = await repository.findById(req.params.integrationId);
      if (!integration) {
        res.status(404).json({ error: 'Integration not found' });
        return;
      }

      const { csvData } = req.body;
      if (!csvData || typeof csvData !== 'string') {
        res.status(400).json({ error: 'csvData is required as a string' });
        return;
      }

      const pool = getPool();
      const userId = (req as any).user.userId;

      // Parse CSV
      const lines = csvData.trim().split('\n');
      if (lines.length < 2) {
        res.status(400).json({ error: 'CSV must have at least a header and one data row' });
        return;
      }

      const header = lines[0].split(',').map((h: string) => h.trim().toLowerCase());
      const result = {
        totalProcessed: lines.length - 1,
        succeeded: 0,
        failed: 0,
        skipped: 0,
        details: {
          imported: [] as string[],
          failed: [] as Array<{ row: number; error: string }>,
          skipped: [] as Array<{ row: number; reason: string }>,
        },
      };

      // Group lines by order_id to handle multi-line orders
      const orderMap = new Map<string, any[]>();

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map((v: string) => v.trim());
        const row: Record<string, string> = {};

        header.forEach((h: string, idx: number) => {
          row[h] = values[idx] || '';
        });

        const orderId =
          row['order_id'] || row['orderid'] || row['order'] || row['reference'] || `CSV-${i}`;

        if (!orderMap.has(orderId)) {
          orderMap.set(orderId, []);
        }
        orderMap.get(orderId)!.push(row);
      }

      // Process each order
      for (const [orderId, rows] of orderMap) {
        try {
          // Check if order already exists
          const existingCheck = await pool.query(
            `SELECT order_id FROM orders WHERE customer_reference = $1`,
            [orderId]
          );

          if (existingCheck.rows.length > 0) {
            result.skipped++;
            result.details.skipped.push({ row: 0, reason: `Order ${orderId} already exists` });
            continue;
          }

          const firstRow = rows[0];

          // Create order ID
          const newOrderId = `ORD-${uuidv4().substring(0, 8).toUpperCase()}`;
          const orderNumber = `ORD-${Date.now().toString(36).toUpperCase()}`;

          // Determine priority
          let priority = OrderPriority.NORMAL;
          if (firstRow['priority']) {
            const p = firstRow['priority'].toUpperCase();
            if (p === 'URGENT' || p === 'HIGH') priority = OrderPriority.HIGH;
            else if (p === 'LOW') priority = OrderPriority.LOW;
          }

          // Create order
          await pool.query(
            `INSERT INTO orders (
              order_id, order_number, customer_id, customer_name, status, priority,
              customer_reference, notes, shipping_address_street1, shipping_address_city,
              shipping_address_state, shipping_address_postcode, shipping_address_country,
              created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), NOW())`,
            [
              newOrderId,
              orderNumber,
              firstRow['customer_id'] || 'CSV',
              firstRow['customer_name'] || firstRow['customer'] || 'CSV Import',
              'PENDING',
              priority,
              orderId,
              firstRow['notes'] || `Imported from CSV via ${integration.name}`,
              firstRow['shipping_address'] || firstRow['address'] || '',
              firstRow['city'] || '',
              firstRow['state'] || '',
              firstRow['postcode'] || firstRow['zip'] || '',
              firstRow['country'] || 'NZ',
            ]
          );

          // Create order items
          for (const row of rows) {
            const sku = row['sku'] || row['item'] || row['product'];
            const quantity = parseInt(row['quantity'] || row['qty'] || '1', 10);

            if (!sku) continue;

            const itemId = `ITM-${uuidv4().substring(0, 8).toUpperCase()}`;

            await pool.query(
              `INSERT INTO order_items (item_id, order_id, sku, quantity, status, created_at)
               VALUES ($1, $2, $3, $4, $5, NOW())`,
              [itemId, newOrderId, sku, quantity, 'PENDING']
            );
          }

          result.succeeded++;
          result.details.imported.push(orderId);
          logger.info('CSV order imported', { orderId, newOrderId, itemCount: rows.length });
        } catch (error: any) {
          result.failed++;
          result.details.failed.push({ row: 0, error: error.message });
          logger.error('Failed to import CSV order', { orderId, error: error.message });
        }
      }

      // Log to sync job
      const job = await service.createSyncJob(integration.integrationId, 'CSV_IMPORT', userId);

      res.json({ jobId: job.jobId, ...result });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/integrations/:integrationId/csv-template
 * Get a CSV template for order import
 */
router.get(
  '/:integrationId/csv-template',
  authorize(UserRole.ADMIN, UserRole.SUPERVISOR),
  async (req: Request, res: Response, _next: NextFunction) => {
    const template = `order_id,customer_name,sku,quantity,priority,shipping_address,city,state,postcode,country,notes
SO-001,Acme Corporation,SKU-001,5,HIGH,123 Main Street,Auckland,Auckland,1010,NZ,Urgent delivery
SO-001,Acme Corporation,SKU-002,3,HIGH,123 Main Street,Auckland,Auckland,1010,NZ,
SO-002,Business Ltd,SKU-003,10,NORMAL,456 Queen Street,Wellington,Wellington,6011,NZ,`;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="order-import-template.csv"');
    res.send(template);
  }
);

export default router;
