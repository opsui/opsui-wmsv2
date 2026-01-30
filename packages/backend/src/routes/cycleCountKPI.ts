/**
 * Cycle Count KPI routes
 *
 * Endpoints for cycle count analytics and dashboards
 */

import { Router } from 'express';
import { cycleCountKPIService } from '../services/CycleCountKPIService';
import { asyncHandler, authenticate, authorize } from '../middleware';
import { AuthenticatedRequest } from '../middleware/auth';
import { UserRole } from '@opsui/shared';

const router = Router();

// All KPI routes require authentication
router.use(authenticate);

/**
 * GET /api/cycle-count/kpi/overall
 * Get overall KPIs for cycle counting
 */
router.get(
  '/overall',
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const filters = {
      startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
      endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
      location: req.query.location as string | undefined,
      countType: req.query.countType as string | undefined,
    };

    const kpis = await cycleCountKPIService.getOverallKPIs(filters);
    res.json(kpis);
  })
);

/**
 * GET /api/cycle-count/kpi/accuracy-trend
 * Get accuracy trends over time
 */
router.get(
  '/accuracy-trend',
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const days = req.query.days ? parseInt(req.query.days as string) : 30;
    const trend = await cycleCountKPIService.getAccuracyTrend(days);
    res.json(trend);
  })
);

/**
 * GET /api/cycle-count/kpi/top-discrepancies
 * Get SKUs with most discrepancies
 */
router.get(
  '/top-discrepancies',
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
    const days = req.query.days ? parseInt(req.query.days as string) : 30;
    const discrepancies = await cycleCountKPIService.getTopDiscrepancySKUs(limit, days);
    res.json(discrepancies);
  })
);

/**
 * GET /api/cycle-count/kpi/user-performance
 * Get performance by user
 */
router.get(
  '/user-performance',
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const days = req.query.days ? parseInt(req.query.days as string) : 30;
    const performance = await cycleCountKPIService.getCountByUser(days);
    res.json(performance);
  })
);

/**
 * GET /api/cycle-count/kpi/zone-performance
 * Get performance by zone
 */
router.get(
  '/zone-performance',
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const days = req.query.days ? parseInt(req.query.days as string) : 30;
    const performance = await cycleCountKPIService.getZonePerformance(days);
    res.json(performance);
  })
);

/**
 * GET /api/cycle-count/kpi/count-type-effectiveness
 * Get effectiveness by count type
 */
router.get(
  '/count-type-effectiveness',
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const days = req.query.days ? parseInt(req.query.days as string) : 90;
    const effectiveness = await cycleCountKPIService.getCountTypeEffectiveness(days);
    res.json(effectiveness);
  })
);

/**
 * GET /api/cycle-count/kpi/daily-stats
 * Get daily statistics for charts
 */
router.get(
  '/daily-stats',
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const days = req.query.days ? parseInt(req.query.days as string) : 30;
    const stats = await cycleCountKPIService.getDailyStats(days);
    res.json(stats);
  })
);

/**
 * GET /api/cycle-count/kpi/dashboard
 * Get real-time dashboard data (aggregates all KPIs)
 */
router.get(
  '/dashboard',
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const filters = {
      startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
      endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
      location: req.query.location as string | undefined,
      countType: req.query.countType as string | undefined,
    };

    const dashboard = await cycleCountKPIService.getRealTimeDashboard(filters);
    res.json(dashboard);
  })
);

export default router;
