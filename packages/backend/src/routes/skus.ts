/**
 * SKU catalog routes
 */

import { Router } from 'express';
import { inventoryService } from '../services/InventoryService';
import { asyncHandler, authenticate, authorize } from '../middleware';
import { AuthenticatedRequest } from '../middleware/auth';
import { UserRole, validateSKU } from '@opsui/shared';

const router = Router();

// All SKU routes require authentication
router.use(authenticate);

/**
 * GET /api/skus
 * Get all or search SKUs
 */
router.get(
  '/',
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const searchTerm = req.query.q as string;

    // If no search term, return all SKUs
    if (!searchTerm) {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
      const results = await inventoryService.getAllSKUs(Math.min(limit, 500));
      res.json(results);
      return;
    }

    const results = await inventoryService.searchSKUs(searchTerm);
    res.json(results);
  })
);

/**
 * GET /api/skus/categories
 * Get all SKU categories
 */
router.get(
  '/categories',
  asyncHandler(async (_req: AuthenticatedRequest, res) => {
    const categories = await inventoryService.getCategories();
    res.json(categories);
  })
);

/**
 * GET /api/skus/:sku
 * Get SKU details with inventory
 */
router.get(
  '/:sku',
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    validateSKU(req.params.sku);
    const sku = await inventoryService.getSKUWithInventory(req.params.sku);
    res.json(sku);
  })
);

/**
 * POST /api/skus/:sku/reserve
 * Reserve inventory for an order (internal use, usually called automatically)
 */
router.post(
  '/:sku/reserve',
  authorize(UserRole.ADMIN, UserRole.SUPERVISOR),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    validateSKU(req.params.sku);

    const { binLocation, quantity, orderId } = req.body;

    if (!binLocation || !quantity || !orderId) {
      res.status(400).json({
        error: 'binLocation, quantity, and orderId are required',
        code: 'MISSING_FIELDS',
      });
      return;
    }

    const inventory = await inventoryService.reserveInventory(
      req.params.sku,
      binLocation,
      quantity,
      orderId
    );
    res.json(inventory);
  })
);

/**
 * POST /api/skus/:sku/release
 * Release inventory reservation
 */
router.post(
  '/:sku/release',
  authorize(UserRole.ADMIN, UserRole.SUPERVISOR),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    validateSKU(req.params.sku);

    const { binLocation, quantity, orderId } = req.body;

    if (!binLocation || !quantity || !orderId) {
      res.status(400).json({
        error: 'binLocation, quantity, and orderId are required',
        code: 'MISSING_FIELDS',
      });
      return;
    }

    const inventory = await inventoryService.releaseReservation(
      req.params.sku,
      binLocation,
      quantity,
      orderId
    );
    res.json(inventory);
  })
);

export default router;
