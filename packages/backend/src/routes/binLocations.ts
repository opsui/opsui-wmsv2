/**
 * Bin Location routes
 *
 * Endpoints for managing warehouse bin locations
 */

import { Router } from 'express';
import { binLocationService } from '../services/BinLocationService';
import { asyncHandler, authenticate, authorize } from '../middleware';
import { AuthenticatedRequest } from '../middleware/auth';
import { UserRole, BinType } from '@opsui/shared';

const router = Router();

// All bin location routes require authentication
router.use(authenticate);

// ============================================================================
// BIN LOCATION CRUD ROUTES
// ============================================================================

/**
 * POST /api/bin-locations
 * Create a new bin location
 */
router.post(
  '/',
  authorize(UserRole.STOCK_CONTROLLER, UserRole.SUPERVISOR, UserRole.ADMIN),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { binId, zone, aisle, shelf, type } = req.body;

    // Validate required fields
    if (!binId || !zone || !aisle || !shelf || !type) {
      res.status(400).json({
        error: 'Missing required fields: binId, zone, aisle, shelf, type',
        code: 'MISSING_FIELDS',
      });
      return;
    }

    // Validate type
    if (!Object.values(BinType).includes(type)) {
      res.status(400).json({
        error: `Invalid type. Must be one of: ${Object.values(BinType).join(', ')}`,
        code: 'INVALID_TYPE',
      });
      return;
    }

    const location = await binLocationService.createBinLocation({
      binId,
      zone,
      aisle,
      shelf,
      type,
    });

    res.status(201).json(location);
  })
);

/**
 * POST /api/bin-locations/batch
 * Batch create bin locations
 */
router.post(
  '/batch',
  authorize(UserRole.STOCK_CONTROLLER, UserRole.SUPERVISOR, UserRole.ADMIN),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { locations } = req.body;

    if (!Array.isArray(locations) || locations.length === 0) {
      res.status(400).json({
        error: 'locations must be a non-empty array',
        code: 'INVALID_INPUT',
      });
      return;
    }

    // Validate each location
    for (const loc of locations) {
      if (!loc.binId || !loc.zone || !loc.aisle || !loc.shelf || !loc.type) {
        res.status(400).json({
          error: 'Each location must have binId, zone, aisle, shelf, and type',
          code: 'MISSING_FIELDS',
        });
        return;
      }

      if (!Object.values(BinType).includes(loc.type)) {
        res.status(400).json({
          error: `Invalid type. Must be one of: ${Object.values(BinType).join(', ')}`,
          code: 'INVALID_TYPE',
        });
        return;
      }
    }

    const result = await binLocationService.batchCreateBinLocations(locations);

    res.status(201).json({
      created: result.created,
      failed: result.failed,
      summary: {
        total: locations.length,
        createdCount: result.created.length,
        failedCount: result.failed.length,
      },
    });
  })
);

/**
 * GET /api/bin-locations
 * Get all bin locations with optional filters
 */
router.get(
  '/',
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const filters = {
      zone: req.query.zone as string | undefined,
      type: req.query.type as BinType | undefined,
      active: req.query.active === 'true' ? true : req.query.active === 'false' ? false : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string) : 100,
      offset: req.query.offset ? parseInt(req.query.offset as string) : 0,
    };

    const result = await binLocationService.getAllBinLocations(filters);
    res.json(result);
  })
);

/**
 * GET /api/bin-locations/zones
 * Get all available zones
 */
router.get(
  '/zones',
  asyncHandler(async (_req: AuthenticatedRequest, res) => {
    const zones = await binLocationService.getZones();
    res.json({ zones });
  })
);

/**
 * GET /api/bin-locations/by-zone/:zone
 * Get all bin locations for a specific zone
 */
router.get(
  '/by-zone/:zone',
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { zone } = req.params;
    const locations = await binLocationService.getBinLocationsByZone(zone);
    res.json(locations);
  })
);

/**
 * GET /api/bin-locations/:binId
 * Get a specific bin location by ID
 */
router.get(
  '/:binId',
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { binId } = req.params;
    const location = await binLocationService.getBinLocation(binId);
    res.json(location);
  })
);

/**
 * PATCH /api/bin-locations/:binId
 * Update a bin location
 */
router.patch(
  '/:binId',
  authorize(UserRole.STOCK_CONTROLLER, UserRole.SUPERVISOR, UserRole.ADMIN),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { binId } = req.params;
    const updates = req.body;

    // Validate type if provided
    if (updates.type !== undefined && !Object.values(BinType).includes(updates.type)) {
      res.status(400).json({
        error: `Invalid type. Must be one of: ${Object.values(BinType).join(', ')}`,
        code: 'INVALID_TYPE',
      });
      return;
    }

    const location = await binLocationService.updateBinLocation(binId, updates);
    res.json(location);
  })
);

/**
 * DELETE /api/bin-locations/:binId
 * Delete a bin location
 */
router.delete(
  '/:binId',
  authorize(UserRole.SUPERVISOR, UserRole.ADMIN),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { binId } = req.params;
    await binLocationService.deleteBinLocation(binId);
    res.status(204).send();
  })
);

export default router;
