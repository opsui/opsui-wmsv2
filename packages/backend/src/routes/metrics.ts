/**
 * Metrics and dashboard routes
 */

import { Router } from 'express';
import { metricsService } from '../services/MetricsService';
import { asyncHandler, authenticate, authorize } from '../middleware';
import { AuthenticatedRequest } from '../middleware/auth';
import { UserRole } from '@opsui/shared';

const router = Router();

// All metrics routes require authentication
router.use(authenticate);

/**
 * GET /api/metrics/dashboard
 * Get dashboard metrics
 */
router.get(
  '/dashboard',
  authorize(UserRole.SUPERVISOR, UserRole.ADMIN),
  asyncHandler(async (_req: AuthenticatedRequest, res) => {
    const metrics = await metricsService.getDashboardMetrics();
    res.json(metrics);
  })
);

/**
 * GET /api/metrics/picker/:pickerId
 * Get performance metrics for a specific picker
 */
router.get(
  '/picker/:pickerId',
  authorize(UserRole.SUPERVISOR, UserRole.ADMIN),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const pickerId = req.params.pickerId;

    // Default to last 7 days
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Allow custom date range
    if (req.query.startDate) {
      startDate.setTime(new Date(req.query.startDate as string).getTime());
    }
    if (req.query.endDate) {
      endDate.setTime(new Date(req.query.endDate as string).getTime());
    }

    const performance = await metricsService.getPickerPerformance(pickerId, startDate, endDate);
    res.json(performance);
  })
);

/**
 * GET /api/metrics/pickers
 * Get performance metrics for all pickers
 */
router.get(
  '/pickers',
  authorize(UserRole.SUPERVISOR, UserRole.ADMIN),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    console.log('[MetricsRoute] /pickers query params:', req.query);

    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);

    if (req.query.startDate) {
      const parsedStart = new Date(req.query.startDate as string);
      if (!isNaN(parsedStart.getTime())) {
        startDate.setTime(parsedStart.getTime());
      }
    }
    if (req.query.endDate) {
      const parsedEnd = new Date(req.query.endDate as string);
      if (!isNaN(parsedEnd.getTime())) {
        endDate.setTime(parsedEnd.getTime());
      }
    }

    console.log(
      '[MetricsRoute] Fetching picker performance from',
      startDate.toISOString(),
      'to',
      endDate.toISOString()
    );
    const performance = await metricsService.getAllPickersPerformance(startDate, endDate);
    console.log('[MetricsRoute] Picker performance result:', performance?.length || 0, 'pickers');
    res.json(performance);
  })
);

/**
 * GET /api/metrics/packers
 * Get performance metrics for all packers
 */
router.get(
  '/packers',
  authorize(UserRole.SUPERVISOR, UserRole.ADMIN),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);

    if (req.query.startDate) {
      const parsedStart = new Date(req.query.startDate as string);
      if (!isNaN(parsedStart.getTime())) {
        startDate.setTime(parsedStart.getTime());
      }
    }
    if (req.query.endDate) {
      const parsedEnd = new Date(req.query.endDate as string);
      if (!isNaN(parsedEnd.getTime())) {
        endDate.setTime(parsedEnd.getTime());
      }
    }

    const performance = await metricsService.getAllPackersPerformance(startDate, endDate);
    res.json(performance);
  })
);

/**
 * GET /api/metrics/stock-controllers
 * Get performance metrics for all stock controllers
 */
router.get(
  '/stock-controllers',
  authorize(UserRole.SUPERVISOR, UserRole.ADMIN),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);

    if (req.query.startDate) {
      const parsedStart = new Date(req.query.startDate as string);
      if (!isNaN(parsedStart.getTime())) {
        startDate.setTime(parsedStart.getTime());
      }
    }
    if (req.query.endDate) {
      const parsedEnd = new Date(req.query.endDate as string);
      if (!isNaN(parsedEnd.getTime())) {
        endDate.setTime(parsedEnd.getTime());
      }
    }

    const performance = await metricsService.getAllStockControllersPerformance(startDate, endDate);
    res.json(performance);
  })
);

/**
 * GET /api/metrics/orders/status-breakdown
 * Get order status breakdown
 */
router.get(
  '/orders/status-breakdown',
  authorize(UserRole.SUPERVISOR, UserRole.ADMIN),
  asyncHandler(async (_req: AuthenticatedRequest, res) => {
    const breakdown = await metricsService.getOrderStatusBreakdown();
    res.json(breakdown);
  })
);

/**
 * GET /api/metrics/orders/hourly-throughput
 * Get hourly throughput for the last 24 hours
 */
router.get(
  '/orders/hourly-throughput',
  authorize(UserRole.SUPERVISOR, UserRole.ADMIN),
  asyncHandler(async (_req: AuthenticatedRequest, res) => {
    const throughput = await metricsService.getHourlyThroughput();
    res.json(throughput);
  })
);

/**
 * GET /api/metrics/orders/throughput
 * Get throughput by time range
 * Query params: range (daily|weekly|monthly|quarterly|yearly)
 */
router.get(
  '/orders/throughput',
  authorize(UserRole.SUPERVISOR, UserRole.ADMIN),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const range = (req.query.range as string) || 'daily';
    // Validate range
    const validRanges = ['daily', 'weekly', 'monthly', 'quarterly', 'yearly'];
    if (!validRanges.includes(range)) {
      res.status(400).json({ error: 'Invalid range. Must be one of: ' + validRanges.join(', ') });
      return;
    }
    const throughput = await metricsService.getThroughputByRange(range as any);
    res.json(throughput);
  })
);

/**
 * GET /api/metrics/skus/top-picked
 * Get top SKUs by scan type (pick, pack, verify, all)
 * Query params: limit, scanType, timePeriod
 */
router.get(
  '/skus/top-picked',
  authorize(UserRole.SUPERVISOR, UserRole.ADMIN),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
    const scanType = (req.query.scanType as string) || 'pick';
    const timePeriod = (req.query.timePeriod as string) || 'monthly';

    // Validate scanType
    const validScanTypes = ['pick', 'pack', 'verify', 'all'];
    if (!validScanTypes.includes(scanType)) {
      res
        .status(400)
        .json({ error: 'Invalid scanType. Must be one of: ' + validScanTypes.join(', ') });
      return;
    }

    // Validate timePeriod
    const validTimePeriods = ['daily', 'weekly', 'monthly', 'yearly'];
    if (!validTimePeriods.includes(timePeriod)) {
      res
        .status(400)
        .json({ error: 'Invalid timePeriod. Must be one of: ' + validTimePeriods.join(', ') });
      return;
    }

    const topSKUs = await metricsService.getTopSKUsByScanType(
      scanType as any,
      limit,
      timePeriod as any
    );
    res.json(topSKUs);
  })
);

/**
 * GET /api/metrics/picker-activity
 * Get real-time picker activity
 */
router.get(
  '/picker-activity',
  authorize(UserRole.SUPERVISOR, UserRole.ADMIN),
  asyncHandler(async (_req: AuthenticatedRequest, res) => {
    console.log('[MetricsRoute] Calling getPickerActivity');
    const activity = await metricsService.getPickerActivity();
    console.log('[MetricsRoute] Activity count:', activity?.length || 0);
    if (activity && activity.length > 0) {
      console.log('[MetricsRoute] First picker:', JSON.stringify(activity[0], null, 2));
    }
    res.json(activity);
  })
);

/**
 * GET /api/metrics/picker/:pickerId/orders
 * Get all orders with progress for a specific picker
 */
router.get(
  '/picker/:pickerId/orders',
  authorize(UserRole.SUPERVISOR, UserRole.ADMIN),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const pickerId = req.params.pickerId;
    const orders = await metricsService.getPickerOrders(pickerId);
    res.json(orders);
  })
);

/**
 * GET /api/metrics/packer-activity
 * Get real-time packer activity
 */
router.get(
  '/packer-activity',
  authorize(UserRole.SUPERVISOR, UserRole.ADMIN),
  asyncHandler(async (_req: AuthenticatedRequest, res) => {
    console.log('[MetricsRoute] Calling getPackerActivity');
    const activity = await metricsService.getPackerActivity();
    console.log('[MetricsRoute] Packer activity count:', activity?.length || 0);
    if (activity && activity.length > 0) {
      console.log('[MetricsRoute] First packer:', JSON.stringify(activity[0], null, 2));
    }
    res.json(activity);
  })
);

/**
 * GET /api/metrics/packer/:packerId/orders
 * Get all orders with progress for a specific packer
 */
router.get(
  '/packer/:packerId/orders',
  authorize(UserRole.SUPERVISOR, UserRole.ADMIN),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const packerId = req.params.packerId;
    const orders = await metricsService.getPackerOrders(packerId);
    res.json(orders);
  })
);

/**
 * GET /api/metrics/stock-controller-activity
 * Get real-time stock controller activity
 */
router.get(
  '/stock-controller-activity',
  authorize(UserRole.STOCK_CONTROLLER, UserRole.SUPERVISOR, UserRole.ADMIN),
  asyncHandler(async (_req: AuthenticatedRequest, res) => {
    console.log('[MetricsRoute] Calling getStockControllerActivity');
    const activity = await metricsService.getStockControllerActivity();
    console.log('[MetricsRoute] Stock controller activity count:', activity?.length || 0);
    if (activity && activity.length > 0) {
      console.log('[MetricsRoute] First stock controller:', JSON.stringify(activity[0], null, 2));
    }
    res.json(activity);
  })
);

/**
 * GET /api/metrics/stock-controller/:controllerId/transactions
 * Get transaction history for a specific stock controller
 */
router.get(
  '/stock-controller/:controllerId/transactions',
  authorize(UserRole.SUPERVISOR, UserRole.ADMIN),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const controllerId = req.params.controllerId;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
    const transactions = await metricsService.getStockControllerTransactions(controllerId, limit);
    res.json(transactions);
  })
);

/**
 * GET /api/metrics/my-performance
 * Get current user's performance metrics
 */
router.get(
  '/my-performance',
  authorize(UserRole.PICKER, UserRole.ADMIN),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);

    if (req.query.startDate) {
      startDate.setTime(new Date(req.query.startDate as string).getTime());
    }
    if (req.query.endDate) {
      endDate.setTime(new Date(req.query.endDate as string).getTime());
    }

    const performance = await metricsService.getPickerPerformance(
      req.user.userId,
      startDate,
      endDate
    );
    res.json(performance);
  })
);

export default router;
