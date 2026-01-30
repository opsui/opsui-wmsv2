/**
 * Stock Control routes
 *
 * Routes for stock controllers to manage inventory, perform stock counts,
 * transfers, and adjustments
 */

import { Router } from 'express';
import { stockControlService } from '../services/StockControlService';
import { asyncHandler, authenticate, authorize } from '../middleware';
import { AuthenticatedRequest } from '../middleware/auth';
import { UserRole, validateBinLocation, validateSKU } from '@opsui/shared';

const router = Router();

// All stock control routes require authentication
router.use(authenticate);

// Only stock controllers, supervisors, and admins can access these routes
router.use(authorize(UserRole.STOCK_CONTROLLER, UserRole.SUPERVISOR, UserRole.ADMIN));

/**
 * GET /api/stock-control/dashboard
 * Get stock control dashboard with overview statistics
 */
router.get(
  '/dashboard',
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const dashboard = await stockControlService.getDashboard();
    res.json(dashboard);
  })
);

/**
 * GET /api/stock-control/inventory
 * Get paginated inventory list with filters
 */
router.get(
  '/inventory',
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const filters = {
      name: req.query.name as string | undefined,
      sku: req.query.sku as string | undefined,
      category: req.query.category as string | undefined,
      binLocation: req.query.binLocation as string | undefined,
      lowStock: req.query.lowStock === 'true',
      outOfStock: req.query.outOfStock === 'true',
      page: req.query.page ? parseInt(req.query.page as string) : 1,
      limit: req.query.limit ? parseInt(req.query.limit as string) : 50,
    };

    const result = await stockControlService.getInventoryList(filters);
    res.json(result);
  })
);

/**
 * GET /api/stock-control/inventory/:sku
 * Get detailed inventory information for a specific SKU
 */
router.get(
  '/inventory/:sku',
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    validateSKU(req.params.sku);
    const inventory = await stockControlService.getSKUInventoryDetail(req.params.sku);
    res.json(inventory);
  })
);

/**
 * POST /api/stock-control/stock-count
 * Create a new stock count
 */
router.post(
  '/stock-count',
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { binLocation, type } = req.body;

    validateBinLocation(binLocation);

    if (!['FULL', 'CYCLIC', 'SPOT'].includes(type)) {
      res.status(400).json({
        error: 'Invalid count type. Must be FULL, CYCLIC, or SPOT',
        code: 'INVALID_TYPE',
      });
      return;
    }

    const stockCount = await stockControlService.createStockCount(
      binLocation,
      type,
      req.user.userId
    );

    res.json(stockCount);
  })
);

/**
 * POST /api/stock-control/stock-count/:countId/submit
 * Submit stock count results
 */
router.post(
  '/stock-count/:countId/submit',
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { countId } = req.params;
    const { items } = req.body;

    if (!Array.isArray(items)) {
      res.status(400).json({
        error: 'Items must be an array',
        code: 'INVALID_ITEMS',
      });
      return;
    }

    const result = await stockControlService.submitStockCount(countId, items, req.user.userId);

    res.json(result);
  })
);

/**
 * GET /api/stock-control/stock-counts
 * Get list of stock counts
 */
router.get(
  '/stock-counts',
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const filters = {
      status: req.query.status as string | undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string) : 50,
      offset: req.query.offset ? parseInt(req.query.offset as string) : 0,
    };

    const result = await stockControlService.getStockCounts(filters);
    res.json(result);
  })
);

/**
 * POST /api/stock-control/transfer
 * Transfer stock between bin locations
 */
router.post(
  '/transfer',
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { sku, fromBin, toBin, quantity, reason } = req.body;

    validateSKU(sku);
    validateBinLocation(fromBin);
    validateBinLocation(toBin);

    if (typeof quantity !== 'number' || quantity <= 0) {
      res.status(400).json({
        error: 'Quantity must be a positive number',
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

    const transfer = await stockControlService.transferStock(
      sku,
      fromBin,
      toBin,
      quantity,
      reason,
      req.user.userId
    );

    res.json(transfer);
  })
);

/**
 * POST /api/stock-control/adjust
 * Adjust inventory quantities
 */
router.post(
  '/adjust',
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
        error: 'Quantity must be a number (positive to add, negative to remove)',
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

    const adjustment = await stockControlService.adjustInventory(
      sku,
      binLocation,
      quantity,
      reason,
      req.user.userId
    );

    res.json(adjustment);
  })
);

/**
 * GET /api/stock-control/transactions
 * Get transaction history with detailed filters
 */
router.get(
  '/transactions',
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const filters = {
      sku: req.query.sku as string | undefined,
      binLocation: req.query.binLocation as string | undefined,
      type: req.query.type as any,
      userId: req.query.userId as string | undefined,
      startDate: req.query.startDate as string | undefined,
      endDate: req.query.endDate as string | undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string) : 100,
      offset: req.query.offset ? parseInt(req.query.offset as string) : 0,
    };

    const result = await stockControlService.getTransactionHistory(filters);
    res.json(result);
  })
);

/**
 * GET /api/stock-control/reports/low-stock
 * Get low stock report
 */
router.get(
  '/reports/low-stock',
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const threshold = req.query.threshold ? parseInt(req.query.threshold as string) : 10;

    const report = await stockControlService.getLowStockReport(threshold);
    res.json(report);
  })
);

/**
 * GET /api/stock-control/reports/movements
 * Get stock movement report
 */
router.get(
  '/reports/movements',
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const filters = {
      startDate: req.query.startDate as string | undefined,
      endDate: req.query.endDate as string | undefined,
      sku: req.query.sku as string | undefined,
    };

    const report = await stockControlService.getMovementReport(filters);
    res.json(report);
  })
);

/**
 * POST /api/stock-control/reconcile
 * Reconcile inventory discrepancies
 */
router.post(
  '/reconcile',
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { discrepancies } = req.body;

    if (!Array.isArray(discrepancies)) {
      res.status(400).json({
        error: 'Discrepancies must be an array',
        code: 'INVALID_DISCREPANCIES',
      });
      return;
    }

    const result = await stockControlService.reconcileDiscrepancies(discrepancies, req.user.userId);

    res.json(result);
  })
);

/**
 * GET /api/stock-control/bins
 * Get list of all bin locations
 */
router.get(
  '/bins',
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const filters = {
      zone: req.query.zone as string | undefined,
      active: req.query.active === 'true' ? true : req.query.active === 'false' ? false : undefined,
    };

    const bins = await stockControlService.getBinLocations(filters);
    res.json(bins);
  })
);

export default router;
