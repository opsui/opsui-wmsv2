/**
 * Interleaved Count routes
 *
 * Endpoints for micro-counts performed during picking and other operations
 */

import { Router } from 'express';
import { interleavedCountService } from '../services/InterleavedCountService';
import { asyncHandler, authenticate } from '../middleware';
import { AuthenticatedRequest } from '../middleware/auth';
import { Permission } from '@opsui/shared';
import { requirePermission } from '../middleware/permissions';

const router = Router();

// All interleaved count routes require authentication
router.use(authenticate);

/**
 * POST /api/interleaved-count/micro
 * Create a micro-count (quick count during picking)
 * Requires PERFORM_CYCLE_COUNTS permission
 */
router.post(
  '/micro',
  requirePermission(Permission.PERFORM_CYCLE_COUNTS),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { sku, binLocation, countedQuantity, orderId, notes } = req.body;

    // Validate required fields
    if (!sku || !binLocation || countedQuantity === undefined) {
      res.status(400).json({
        error: 'Missing required fields',
        code: 'MISSING_FIELDS',
      });
      return;
    }

    const microCount = await interleavedCountService.createMicroCount({
      sku,
      binLocation,
      countedQuantity: parseFloat(countedQuantity),
      userId: req.user!.userId,
      orderId,
      notes,
    });

    res.status(201).json(microCount);
  })
);

/**
 * GET /api/interleaved-count/stats
 * Get micro-count statistics for the current user
 */
router.get(
  '/stats',
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const days = req.query.days ? parseInt(req.query.days as string) : 30;

    const stats = await interleavedCountService.getMicroCountStats(req.user!.userId, days);

    res.json(stats);
  })
);

export default router;
