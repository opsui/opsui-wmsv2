/**
 * E-commerce Integration Routes
 *
 * API endpoints for e-commerce platform integration
 */

import { Router } from 'express';
import { ecommerceService } from '../services/EcommerceService';
import { asyncHandler, authenticate } from '../middleware';
import { AuthenticatedRequest } from '../middleware/auth';

const router = Router();

// ============================================================================
// CONNECTION MANAGEMENT
// ============================================================================

/**
 * GET /api/ecommerce/connections
 * Get all e-commerce connections
 */
router.get(
  '/connections',
  authenticate,
  asyncHandler(async (_req: AuthenticatedRequest, res) => {
    const connections = await ecommerceService.getAllConnections();
    res.json(connections);
  })
);

/**
 * GET /api/ecommerce/connections/active
 * Get active connections
 */
router.get(
  '/connections/active',
  authenticate,
  asyncHandler(async (_req: AuthenticatedRequest, res) => {
    const connections = await ecommerceService.getActiveConnections();
    res.json(connections);
  })
);

/**
 * GET /api/ecommerce/connections/:connectionId
 * Get a specific connection
 */
router.get(
  '/connections/:connectionId',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { connectionId } = req.params;
    const connection = await ecommerceService.getConnection(connectionId);

    if (!connection) {
      res.status(404).json({ error: 'Connection not found' });
      return;
    }

    res.json(connection);
  })
);

/**
 * POST /api/ecommerce/connections
 * Create a new connection
 */
router.post(
  '/connections',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const connection = await ecommerceService.createConnection({
      ...req.body,
      createdBy: req.user?.userId,
    });
    res.status(201).json(connection);
  })
);

/**
 * PUT /api/ecommerce/connections/:connectionId
 * Update a connection
 */
router.put(
  '/connections/:connectionId',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { connectionId } = req.params;
    const connection = await ecommerceService.updateConnection(connectionId, req.body);

    if (!connection) {
      res.status(404).json({ error: 'Connection not found' });
      return;
    }

    res.json(connection);
  })
);

/**
 * DELETE /api/ecommerce/connections/:connectionId
 * Delete a connection
 */
router.delete(
  '/connections/:connectionId',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { connectionId } = req.params;
    const success = await ecommerceService.deleteConnection(connectionId);

    if (!success) {
      res.status(404).json({ error: 'Connection not found' });
      return;
    }

    res.status(204).send();
  })
);

/**
 * POST /api/ecommerce/connections/:connectionId/test
 * Test a connection
 */
router.post(
  '/connections/:connectionId/test',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { connectionId } = req.params;
    const result = await ecommerceService.testConnection(connectionId);
    res.json(result);
  })
);

// ============================================================================
// PRODUCT MAPPING
// ============================================================================

/**
 * GET /api/ecommerce/connections/:connectionId/mappings
 * Get product mappings for a connection
 */
router.get(
  '/connections/:connectionId/mappings',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { connectionId } = req.params;
    const mappings = await ecommerceService.getProductMappings(connectionId);
    res.json(mappings);
  })
);

/**
 * POST /api/ecommerce/connections/:connectionId/mappings
 * Create a product mapping
 */
router.post(
  '/connections/:connectionId/mappings',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { connectionId } = req.params;
    const mapping = await ecommerceService.createProductMapping({
      ...req.body,
      connectionId,
    });
    res.status(201).json(mapping);
  })
);

/**
 * PUT /api/ecommerce/mappings/:mappingId
 * Update a product mapping
 */
router.put(
  '/mappings/:mappingId',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { mappingId } = req.params;
    const mapping = await ecommerceService.updateProductMapping(mappingId, req.body);

    if (!mapping) {
      res.status(404).json({ error: 'Mapping not found' });
      return;
    }

    res.json(mapping);
  })
);

/**
 * DELETE /api/ecommerce/mappings/:mappingId
 * Delete a product mapping
 */
router.delete(
  '/mappings/:mappingId',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { mappingId } = req.params;
    const success = await ecommerceService.deleteProductMapping(mappingId);

    if (!success) {
      res.status(404).json({ error: 'Mapping not found' });
      return;
    }

    res.status(204).send();
  })
);

// ============================================================================
// INVENTORY SYNC
// ============================================================================

/**
 * POST /api/ecommerce/sync/inventory
 * Sync inventory
 */
router.post(
  '/sync/inventory',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const result = await ecommerceService.syncInventory(req.body);
    res.json(result);
  })
);

// ============================================================================
// PRODUCT SYNC
// ============================================================================

/**
 * POST /api/ecommerce/sync/products
 * Sync products
 */
router.post(
  '/sync/products',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const result = await ecommerceService.syncProducts(req.body);
    res.json(result);
  })
);

// ============================================================================
// ORDER SYNC
// ============================================================================

/**
 * POST /api/ecommerce/sync/orders
 * Sync orders
 */
router.post(
  '/sync/orders',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const result = await ecommerceService.syncOrders(req.body);
    res.json(result);
  })
);

// ============================================================================
// WEBHOOKS
// ============================================================================

/**
 * POST /api/ecommerce/webhooks/:connectionId
 * Process incoming webhook
 */
router.post(
  '/webhooks/:connectionId',
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { connectionId } = req.params;
    const event = (req.headers['x-webhook-event'] as string) || 'unknown';
    await ecommerceService.processWebhook(connectionId, event, req.body);
    res.status(200).send();
  })
);

// ============================================================================
// STATUS & REPORTING
// ============================================================================

/**
 * GET /api/ecommerce/status
 * Get connection status overview
 */
router.get(
  '/status',
  authenticate,
  asyncHandler(async (_req: AuthenticatedRequest, res) => {
    const status = await ecommerceService.getConnectionStatus();
    res.json(status);
  })
);

/**
 * GET /api/ecommerce/errors
 * Get sync errors
 */
router.get(
  '/errors',
  authenticate,
  asyncHandler(async (_req: AuthenticatedRequest, res) => {
    const errors = await ecommerceService.getSyncErrors();
    res.json(errors);
  })
);

/**
 * GET /api/ecommerce/pending
 * Get pending syncs
 */
router.get(
  '/pending',
  authenticate,
  asyncHandler(async (_req: AuthenticatedRequest, res) => {
    const pending = await ecommerceService.getPendingSyncs();
    res.json(pending);
  })
);

/**
 * GET /api/ecommerce/connections/:connectionId/logs
 * Get sync logs for a connection
 */
router.get(
  '/connections/:connectionId/logs',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { connectionId } = req.params;
    const limit = parseInt(req.query.limit as string) || 50;
    const logs = await ecommerceService.getSyncLogs(connectionId, limit);
    res.json(logs);
  })
);

/**
 * GET /api/ecommerce/connections/:connectionId/settings
 * Get platform-specific settings
 */
router.get(
  '/connections/:connectionId/settings',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { connectionId } = req.params;
    const connection = await ecommerceService.getConnection(connectionId);

    if (!connection) {
      res.status(404).json({ error: 'Connection not found' });
      return;
    }

    const settings = await ecommerceService.getPlatformSettings(
      connectionId,
      connection.platformType
    );
    res.json(settings);
  })
);

export default router;
