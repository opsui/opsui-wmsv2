/**
 * Inventory routes
 */

import { Router } from 'express';
import { inventoryService } from '../services/InventoryService';
import { asyncHandler, authenticate, authorize } from '../middleware';
import { AuthenticatedRequest } from '../middleware/auth';
import { UserRole, validateBinLocation, validateSKU } from '@opsui/shared';

const router = Router();

// All inventory routes require authentication
router.use(authenticate);

/**
 * GET /api/inventory/sku/:sku
 * Get inventory for a specific SKU
 */
router.get(
  '/sku/:sku',
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    validateSKU(req.params.sku);
    const inventory = await inventoryService.getInventoryBySKU(req.params.sku);
    res.json(inventory);
  })
);

/**
 * GET /api/inventory/bin/:binLocation
 * Get inventory at a specific bin location
 */
router.get(
  '/bin/:binLocation',
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    validateBinLocation(req.params.binLocation);
    const inventory = await inventoryService.getInventoryByBinLocation(req.params.binLocation);
    res.json(inventory);
  })
);

/**
 * GET /api/inventory/sku/:sku/available
 * Get available inventory locations for a SKU
 */
router.get(
  '/sku/:sku/available',
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    validateSKU(req.params.sku);
    const available = await inventoryService.getAvailableInventory(req.params.sku);
    res.json(available);
  })
);

/**
 * GET /api/inventory/sku/:sku/total
 * Get total available quantity for a SKU
 */
router.get(
  '/sku/:sku/total',
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    validateSKU(req.params.sku);
    const total = await inventoryService.getTotalAvailable(req.params.sku);
    res.json({ sku: req.params.sku, totalAvailable: total });
  })
);

/**
 * POST /api/inventory/adjust
 * Manually adjust inventory (admin/supervisor only)
 */
router.post(
  '/adjust',
  authorize(UserRole.ADMIN, UserRole.SUPERVISOR),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { sku, binLocation, quantity, reason } = req.body;

    validateSKU(sku);
    validateBinLocation(binLocation);

    if (typeof quantity !== 'number') {
      res.status(400).json({
        error: 'Quantity must be a number',
        code: 'INVALID_QUANTITY',
      });
      return;
    }

    if (!reason || typeof reason !== 'string') {
      res.status(400).json({
        error: 'Reason is required',
        code: 'MISSING_REASON',
      });
      return;
    }

    const inventory = await inventoryService.adjustInventory(
      sku,
      binLocation,
      quantity,
      req.user.userId,
      reason
    );
    res.json(inventory);
  })
);

/**
 * GET /api/inventory/transactions
 * Get transaction history
 */
router.get(
  '/transactions',
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const filters = {
      sku: req.query.sku as string | undefined,
      orderId: req.query.orderId as string | undefined,
      type: req.query.type as any,
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
      offset: req.query.offset ? parseInt(req.query.offset as string) : undefined,
    };

    const result = await inventoryService.getTransactionHistory(filters);
    res.json(result);
  })
);

/**
 * GET /api/inventory/alerts/low-stock
 * Get low stock alerts
 */
router.get(
  '/alerts/low-stock',
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const threshold = req.query.threshold ? parseInt(req.query.threshold as string) : 10;
    const alerts = await inventoryService.getLowStockAlerts(threshold);
    res.json(alerts);
  })
);

/**
 * GET /api/inventory/reconcile/:sku
 * Reconcile inventory for a SKU
 */
router.get(
  '/reconcile/:sku',
  authorize(UserRole.ADMIN, UserRole.SUPERVISOR),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    validateSKU(req.params.sku);
    const reconciliation = await inventoryService.reconcileInventory(req.params.sku);
    res.json(reconciliation);
  })
);

/**
 * GET /api/inventory/metrics
 * Get inventory metrics
 */
router.get(
  '/metrics',
  authorize(UserRole.ADMIN, UserRole.SUPERVISOR),
  asyncHandler(async (_req: AuthenticatedRequest, res) => {
    const metrics = await inventoryService.getInventoryMetrics();
    res.json(metrics);
  })
);

export default router;
