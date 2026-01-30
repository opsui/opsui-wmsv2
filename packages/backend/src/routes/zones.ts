/**
 * Zone Picking Routes
 *
 * API endpoints for zone-based picking operations
 */

import { Router } from 'express';
import { authenticate, AuthenticatedRequest, requirePicker } from '../middleware/auth';
import { authorize } from '../middleware/auth';
import { zonePickingService } from '../services/ZonePickingService';
import { logger } from '../config/logger';

const router = Router();

/**
 * GET /api/v1/zones
 * Get all zones in the warehouse
 */
router.get('/', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const zones = await zonePickingService.getZones();

    res.json({
      success: true,
      data: zones,
    });
  } catch (error) {
    logger.error('Get zones error', { error });
    res.status(500).json({
      error: 'Failed to get zones',
      message: (error as any).message,
    });
  }
});

/**
 * GET /api/v1/zones/:zoneId/stats
 * Get statistics for a specific zone
 */
router.get('/:zoneId/stats', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const { zoneId } = req.params;

    const stats = await zonePickingService.getZoneStats(zoneId);

    if (!stats) {
      res.status(404).json({
        error: 'Zone not found',
        message: `Zone ${zoneId} not found`,
      });
      return;
    }

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    logger.error('Get zone stats error', { error });
    res.status(500).json({
      error: 'Failed to get zone stats',
      message: (error as any).message,
    });
  }
});

/**
 * GET /api/v1/zones/stats/all
 * Get statistics for all zones
 */
router.get('/stats/all', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const stats = await zonePickingService.getAllZoneStats();

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    logger.error('Get all zone stats error', { error });
    res.status(500).json({
      error: 'Failed to get zone stats',
      message: (error as any).message,
    });
  }
});

/**
 * POST /api/v1/zones/assign
 * Assign a picker to a zone
 */
router.post('/assign', authenticate, authorize('ADMIN', 'SUPERVISOR'), async (req: AuthenticatedRequest, res) => {
  try {
    const { pickerId, zoneId } = req.body;

    if (!pickerId || !zoneId) {
      res.status(400).json({
        error: 'Missing required fields',
        message: 'pickerId and zoneId are required',
      });
      return;
    }

    const context = {
      userId: req.user?.userId,
      userEmail: req.user?.email,
      userRole: req.user?.role,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      requestId: req.id,
    };

    const assignment = await zonePickingService.assignPickerToZone(pickerId, zoneId, context);

    res.status(201).json({
      success: true,
      message: 'Picker assigned to zone',
      data: assignment,
    });
  } catch (error) {
    logger.error('Zone assignment error', { error });
    res.status(500).json({
      error: 'Zone assignment failed',
      message: (error as any).message,
    });
  }
});

/**
 * POST /api/v1/zones/release
 * Release picker from current zone
 */
router.post('/release', authenticate, requirePicker, async (req: AuthenticatedRequest, res) => {
  try {
    const { pickerId } = req.body;

    if (!pickerId) {
      // Use current user if not specified
      req.body.pickerId = req.user?.userId;
    }

    const context = {
      userId: req.user?.userId,
      userEmail: req.user?.email,
      userRole: req.user?.role,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      requestId: req.id,
    };

    await zonePickingService.releasePickerFromZone(req.body.pickerId, context);

    res.json({
      success: true,
      message: 'Picker released from zone',
    });
  } catch (error) {
    logger.error('Zone release error', { error });
    res.status(500).json({
      error: 'Zone release failed',
      message: (error as any).message,
    });
  }
});

/**
 * POST /api/v1/zones/rebalance
 * Rebalance pickers across zones based on workload
 */
router.post('/rebalance', authenticate, authorize('ADMIN', 'SUPERVISOR'), async (req: AuthenticatedRequest, res) => {
  try {
    const context = {
      userId: req.user?.userId,
      userEmail: req.user?.email,
      userRole: req.user?.role,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      requestId: req.id,
    };

    await zonePickingService.rebalancePickers(context);

    res.json({
      success: true,
      message: 'Pickers rebalanced across zones',
    });
  } catch (error) {
    logger.error('Zone rebalance error', { error });
    res.status(500).json({
      error: 'Zone rebalancing failed',
      message: (error as any).message,
    });
  }
});

/**
 * GET /api/v1/zones/:zoneId/tasks
 * Get pick tasks for a specific zone
 */
router.get('/:zoneId/tasks', authenticate, requirePicker, async (req: AuthenticatedRequest, res) => {
  try {
    const { zoneId } = req.params;
    const { status } = req.query;

    const statuses = status ? (status as string).split(',') : undefined;

    const tasks = await zonePickingService.getZonePickTasks(
      zoneId,
      statuses as any
    );

    res.json({
      success: true,
      data: tasks,
    });
  } catch (error) {
    logger.error('Get zone tasks error', { error });
    res.status(500).json({
      error: 'Failed to get zone tasks',
      message: (error as any).message,
    });
  }
});

export default router;
