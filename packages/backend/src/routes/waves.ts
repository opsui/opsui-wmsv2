/**
 * Wave Picking Routes
 *
 * API endpoints for wave picking operations
 */

import { Router } from 'express';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { authorize } from '../middleware/auth';
import { wavePickingService, WaveStrategy, WaveCriteria } from '../services/WavePickingService';
import { logger } from '../config/logger';

const router = Router();

/**
 * POST /api/v1/waves/create
 * Create a new wave based on criteria
 */
router.post('/create', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const criteria: WaveCriteria = req.body;

    // Validate required fields
    if (!criteria.strategy) {
      res.status(400).json({
        error: 'Missing required field',
        message: 'strategy is required',
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

    const wave = await wavePickingService.createWave(criteria, context);

    res.status(201).json({
      success: true,
      message: 'Wave created successfully',
      data: wave,
    });
  } catch (error) {
    logger.error('Wave creation error', { error });
    res.status(500).json({
      error: 'Wave creation failed',
      message: (error as any).message,
    });
  }
});

/**
 * POST /api/v1/waves/:waveId/release
 * Release a wave (make it active for picking)
 */
router.post(
  '/:waveId/release',
  authenticate,
  authorize('ADMIN', 'SUPERVISOR'),
  async (req: AuthenticatedRequest, res) => {
    try {
      const { waveId } = req.params;

      const context = {
        userId: req.user?.userId,
        userEmail: req.user?.email,
        userRole: req.user?.role,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        requestId: req.id,
      };

      const wave = await wavePickingService.releaseWave(waveId, context);

      res.json({
        success: true,
        message: 'Wave released successfully',
        data: wave,
      });
    } catch (error) {
      logger.error('Wave release error', { error });
      res.status(500).json({
        error: 'Wave release failed',
        message: (error as any).message,
      });
    }
  }
);

/**
 * GET /api/v1/waves/:waveId/status
 * Get wave status and progress
 */
router.get('/:waveId/status', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const { waveId } = req.params;

    const status = await wavePickingService.getWaveStatus(waveId);

    if (!status) {
      res.status(404).json({
        error: 'Wave not found',
        message: `Wave ${waveId} not found`,
      });
      return;
    }

    res.json({
      success: true,
      data: status,
    });
  } catch (error) {
    logger.error('Wave status error', { error });
    res.status(500).json({
      error: 'Failed to get wave status',
      message: (error as any).message,
    });
  }
});

/**
 * GET /api/v1/waves/picker/:pickerId
 * Get active waves for a picker
 */
router.get('/picker/:pickerId', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const { pickerId } = req.params;

    const waves = await wavePickingService.getActiveWavesForPicker(pickerId);

    res.json({
      success: true,
      data: waves,
    });
  } catch (error) {
    logger.error('Get picker waves error', { error });
    res.status(500).json({
      error: 'Failed to get picker waves',
      message: (error as any).message,
    });
  }
});

/**
 * POST /api/v1/waves/:waveId/complete
 * Mark a wave as completed
 */
router.post(
  '/:waveId/complete',
  authenticate,
  authorize('ADMIN', 'SUPERVISOR'),
  async (req: AuthenticatedRequest, res) => {
    try {
      const { waveId } = req.params;

      const context = {
        userId: req.user?.userId,
        userEmail: req.user?.email,
        userRole: req.user?.role,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        requestId: req.id,
      };

      await wavePickingService.completeWave(waveId, context);

      res.json({
        success: true,
        message: 'Wave marked as completed',
      });
    } catch (error) {
      logger.error('Wave completion error', { error });
      res.status(500).json({
        error: 'Wave completion failed',
        message: (error as any).message,
      });
    }
  }
);

/**
 * GET /api/v1/waves/strategies
 * Get available wave strategies
 */
router.get('/strategies', authenticate, (req, res) => {
  res.json({
    success: true,
    data: {
      strategies: [
        {
          id: WaveStrategy.CARRIER,
          name: 'Carrier-based',
          description: 'Group orders by shipping carrier to meet cutoff times',
        },
        {
          id: WaveStrategy.PRIORITY,
          name: 'Priority-based',
          description: 'Group orders by priority level',
        },
        {
          id: WaveStrategy.ZONE,
          name: 'Zone-based',
          description: 'Group orders by warehouse zone proximity',
        },
        {
          id: WaveStrategy.DEADLINE,
          name: 'Deadline-based',
          description: 'Group orders by delivery deadline',
        },
        {
          id: WaveStrategy.SKU_COMPATIBILITY,
          name: 'SKU Compatibility',
          description: 'Group orders with shared SKUs for efficient picking',
        },
        {
          id: WaveStrategy.BALANCED,
          name: 'Balanced',
          description: 'Balance multiple criteria for optimal efficiency',
        },
      ],
    },
  });
});

export default router;
