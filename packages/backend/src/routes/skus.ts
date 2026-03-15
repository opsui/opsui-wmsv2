/**
 * SKU catalog routes
 */

import { Router } from 'express';
import { inventoryService } from '../services/InventoryService';
import { getDefaultPool } from '../db/client';
import { asyncHandler, authenticate, authorize } from '../middleware';
import { AuthenticatedRequest } from '../middleware/auth';
import { NetSuiteClient } from '../services/NetSuiteClient';
import { UserRole, validateSKU } from '@opsui/shared';

const router = Router();

router.get(
  '/netsuite-image/:fileId',
  asyncHandler(async (req, res) => {
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');

    const fileId = String(req.params.fileId || '').trim();
    const organizationId = String(req.query.org || '').trim();

    if (!fileId || !organizationId) {
      res.status(400).json({ error: 'fileId and org are required' });
      return;
    }

    const integrationResult = await getDefaultPool().query(
      `SELECT i.configuration
       FROM integrations i
       JOIN integration_organizations io ON io.integration_id = i.integration_id
       WHERE io.organization_id = $1
         AND i.provider = 'NETSUITE'
       ORDER BY i.created_at DESC NULLS LAST
       LIMIT 1`,
      [organizationId]
    );

    const integrationConfig = integrationResult.rows[0]?.configuration;
    const authConfig = integrationConfig?.auth || integrationConfig;

    if (!authConfig?.accountId || !authConfig?.tokenId || !authConfig?.consumerKey) {
      res.status(404).json({ error: 'NetSuite integration not configured for organization' });
      return;
    }

    const client = new NetSuiteClient({
      accountId: authConfig.accountId,
      tokenId: authConfig.tokenId,
      tokenSecret: authConfig.tokenSecret,
      consumerKey: authConfig.consumerKey,
      consumerSecret: authConfig.consumerSecret,
    });

    try {
      const file = await client.getFile(fileId);

      res.setHeader('Cache-Control', 'public, max-age=3600');

      if (file.data) {
        res.type(file.contentType);
        res.send(Buffer.from(file.data, 'base64'));
        return;
      }

      if (file.url) {
        res.redirect(file.url);
        return;
      }

      res.status(404).json({ error: 'File content not available' });
    } catch (error: any) {
      res.status(502).json({
        error: 'Failed to fetch NetSuite image',
        message: error.message,
      });
    }
  })
);

// All remaining SKU routes require authentication
router.use(authenticate);

/**
 * GET /api/skus
 * Get all or search SKUs with pagination
 */
router.get(
  '/',
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const searchTerm = req.query.q as string;
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = Math.min(parseInt(req.query.pageSize as string) || 20, 100);
    const sortBy = (req.query.sortBy as string) || 'sku';
    const sortOrder = (req.query.sortOrder as string) || 'asc';
    const category = req.query.category as string;
    const stockStatus = req.query.stockStatus as string;

    // Get all SKUs first
    let allSKUs = searchTerm
      ? await inventoryService.searchSKUs(searchTerm)
      : await inventoryService.getAllSKUs(1000);

    // Apply category filter
    if (category && category !== 'all') {
      allSKUs = allSKUs.filter((sku: any) => sku.category === category);
    }

    // Apply stock status filter
    if (stockStatus && stockStatus !== 'all') {
      allSKUs = allSKUs.filter((sku: any) => {
        const qty = sku.totalQuantity || 0;
        switch (stockStatus) {
          case 'in-stock':
            return qty > 10;
          case 'low-stock':
            return qty > 0 && qty <= 10;
          case 'out-of-stock':
            return qty === 0;
          default:
            return true;
        }
      });
    }

    // Apply sorting
    allSKUs.sort((a: any, b: any) => {
      let aVal = a[sortBy] ?? '';
      let bVal = b[sortBy] ?? '';

      if (typeof aVal === 'string') aVal = aVal.toLowerCase();
      if (typeof bVal === 'string') bVal = bVal.toLowerCase();

      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    // Get unique categories for filter
    const categories = [...new Set(allSKUs.map((sku: any) => sku.category).filter(Boolean))];

    // Apply pagination
    const totalItems = allSKUs.length;
    const totalPages = Math.ceil(totalItems / pageSize);
    const startIndex = (page - 1) * pageSize;
    const paginatedData = allSKUs.slice(startIndex, startIndex + pageSize);

    res.json({
      data: paginatedData,
      pagination: {
        page,
        pageSize,
        totalItems,
        totalPages,
      },
      filters: {
        categories,
      },
    });
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
    if (!sku.image) {
      const hydratedImage = await inventoryService.hydrateNetSuiteSKUImage(
        req.params.sku,
        req.user?.organizationId
      );
      if (hydratedImage) {
        sku.image = hydratedImage;
      }
    }
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
