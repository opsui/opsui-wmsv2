/**
 * Warehouse Slotting Routes
 *
 * API endpoints for warehouse slotting optimization and ABC analysis
 */

import { Router } from 'express';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { authorize } from '../middleware/auth';
import { slottingOptimizationService, ABCClass } from '../services/SlottingOptimizationService';
import { logger } from '../config/logger';
import { UserRole } from '@opsui/shared';

const router = Router();

/**
 * GET /api/v1/slotting/analysis
 * Run ABC analysis for all SKUs
 */
router.get('/analysis', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const { days } = req.query;

    const analysis = await slottingOptimizationService.runABCAnalysis(
      days ? parseInt(days as string) : 90
    );

    res.json({
      success: true,
      data: analysis,
      meta: {
        totalSKUs: analysis.length,
        analysisDays: days || 90,
      },
    });
  } catch (error) {
    logger.error('Slotting analysis error', { error });
    res.status(500).json({
      error: 'Analysis failed',
      message: (error as any).message,
    });
  }
});

/**
 * GET /api/v1/slotting/recommendations
 * Get slotting recommendations for implementation
 */
router.get('/recommendations', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const { minPriority, maxRecommendations } = req.query;

    const recommendations = await slottingOptimizationService.getSlottingRecommendations({
      minPriority: minPriority as any,
      maxRecommendations: maxRecommendations ? parseInt(maxRecommendations as string) : undefined,
    });

    res.json({
      success: true,
      data: recommendations,
      meta: {
        totalRecommendations: recommendations.length,
      },
    });
  } catch (error) {
    logger.error('Get recommendations error', { error });
    res.status(500).json({
      error: 'Failed to get recommendations',
      message: (error as any).message,
    });
  }
});

/**
 * POST /api/v1/slotting/implement
 * Implement a slotting recommendation
 */
router.post(
  '/implement',
  authenticate,
  authorize(UserRole.ADMIN, UserRole.SUPERVISOR),
  async (req: AuthenticatedRequest, res) => {
    try {
      const { sku, fromLocation, toLocation } = req.body;

      if (!sku || !fromLocation || !toLocation) {
        res.status(400).json({
          error: 'Missing required fields',
          message: 'sku, fromLocation, and toLocation are required',
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

      await slottingOptimizationService.implementRecommendation(
        {
          sku,
          fromLocation,
          toLocation,
          estimatedBenefit: { travelTimeReduction: 0, annualSavings: 0 },
          effort: 'LOW',
          priority: 1,
        },
        context
      );

      res.json({
        success: true,
        message: 'Slotting recommendation implemented',
      });
    } catch (error) {
      logger.error('Implement recommendation error', { error });
      res.status(500).json({
        error: 'Implementation failed',
        message: (error as any).message,
      });
    }
  }
);

/**
 * GET /api/v1/slotting/velocity/:sku
 * Get velocity data for a specific SKU
 */
router.get('/velocity/:sku', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const { sku } = req.params;
    const { days } = req.query;

    const velocity = await slottingOptimizationService.getVelocityData(
      sku,
      days ? parseInt(days as string) : 90
    );

    if (!velocity) {
      res.status(404).json({
        error: 'SKU not found',
        message: `No velocity data found for SKU: ${sku}`,
      });
      return;
    }

    res.json({
      success: true,
      data: velocity,
    });
  } catch (error) {
    logger.error('Get velocity error', { error });
    res.status(500).json({
      error: 'Failed to get velocity data',
      message: (error as any).message,
    });
  }
});

/**
 * GET /api/v1/slotting/stats
 * Get overall slotting statistics
 */
router.get('/stats', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const stats = await slottingOptimizationService.getSlottingStats();

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    logger.error('Get slotting stats error', { error });
    res.status(500).json({
      error: 'Failed to get slotting stats',
      message: (error as any).message,
    });
  }
});

/**
 * GET /api/v1/slotting/classes
 * Get ABC class definitions
 */
router.get('/classes', authenticate, (_req, res) => {
  res.json({
    success: true,
    data: {
      classes: [
        {
          class: ABCClass.A,
          name: 'Class A - High Velocity',
          description: 'Fast-moving items (top 20% by velocity, 80% of movement)',
          color: '#10b981', // green
          recommendedZones: ['A', 'B'],
          placementStrategy: 'Near depot, easy access',
        },
        {
          class: ABCClass.B,
          name: 'Class B - Medium Velocity',
          description: 'Medium-moving items (next 30% by velocity, 15% of movement)',
          color: '#f59e0b', // amber
          recommendedZones: ['B', 'C'],
          placementStrategy: 'Moderate access',
        },
        {
          class: ABCClass.C,
          name: 'Class C - Low Velocity',
          description: 'Slow-moving items (bottom 50% by velocity, 5% of movement)',
          color: '#6b7280', // gray
          recommendedZones: ['C', 'D', 'E'],
          placementStrategy: 'Further from depot, bulk storage',
        },
      ],
    },
  });
});

export default router;
