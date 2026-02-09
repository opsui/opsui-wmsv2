/**
 * Advanced Inventory Routes
 *
 * API endpoints for advanced inventory management
 */

import { Router } from 'express';
import { advancedInventoryService } from '../services/AdvancedInventoryService';
import { asyncHandler, authenticate } from '../middleware';
import type { AuthenticatedRequest } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticate);

// ============================================================================
// LANDED COST
// ============================================================================

/**
 * POST /api/advanced-inventory/landed-cost
 * Add landed cost component
 */
router.post(
  '/landed-cost',
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const component = await advancedInventoryService.addLandedCostComponent(req.body);
    res.status(201).json(component);
  })
);

/**
 * GET /api/advanced-inventory/landed-cost/receipt/:receiptLineId
 * Calculate landed cost for a receipt line
 */
router.get(
  '/landed-cost/receipt/:receiptLineId',
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { receiptLineId } = req.params;
    const landedCost = await advancedInventoryService.calculateLandedCost(receiptLineId);
    res.json({ receiptLineId, landedCost });
  })
);

/**
 * GET /api/advanced-inventory/layers/:sku
 * Get inventory layers for a SKU
 */
router.get(
  '/layers/:sku',
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { sku } = req.params;
    const includeExhausted = req.query.includeExhausted === 'true';
    const layers = await advancedInventoryService.getInventoryLayers(sku, includeExhausted);
    res.json(layers);
  })
);

/**
 * GET /api/advanced-inventory/layers/:sku/summary
 * Get inventory layers summary
 */
router.get(
  '/layers/:sku/summary',
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { sku } = req.params;
    const summary = await advancedInventoryService.getInventoryLayersSummary(sku);
    res.json(summary);
  })
);

// ============================================================================
// ABC ANALYSIS
// ============================================================================

/**
 * POST /api/advanced-inventory/abc-analysis
 * Run ABC analysis
 */
router.post(
  '/abc-analysis',
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const analysis = await advancedInventoryService.runABCAnalysis({
      ...req.body,
      createdBy: req.user?.userId,
    });
    res.status(201).json(analysis);
  })
);

/**
 * GET /api/advanced-inventory/abc-analysis/latest
 * Get latest ABC analysis
 */
router.get(
  '/abc-analysis/latest',
  asyncHandler(async (_req: AuthenticatedRequest, res) => {
    const analysis = await advancedInventoryService.getLatestABCAnalysis();
    res.json(analysis);
  })
);

/**
 * GET /api/advanced-inventory/abc-analysis/:analysisId
 * Get ABC analysis with details
 */
router.get(
  '/abc-analysis/:analysisId',
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { analysisId } = req.params;
    const result = await advancedInventoryService.getABCAnalysis(analysisId);

    if (!result) {
      res.status(404).json({ error: 'Analysis not found' });
      return;
    }

    res.json(result);
  })
);

// ============================================================================
// DEMAND FORECASTING
// ============================================================================

/**
 * POST /api/advanced-inventory/forecasts
 * Create demand forecast
 */
router.post(
  '/forecasts',
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const forecast = await advancedInventoryService.createDemandForecast({
      ...req.body,
      createdBy: req.user?.userId,
    });
    res.status(201).json(forecast);
  })
);

/**
 * GET /api/advanced-inventory/forecasts/:forecastId
 * Get demand forecast with details
 */
router.get(
  '/forecasts/:forecastId',
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { forecastId } = req.params;
    const result = await advancedInventoryService.getDemandForecast(forecastId);

    if (!result) {
      res.status(404).json({ error: 'Forecast not found' });
      return;
    }

    res.json(result);
  })
);

// ============================================================================
// SAFETY STOCK
// ============================================================================

/**
 * POST /api/advanced-inventory/safety-stock/calculate
 * Calculate safety stock
 */
router.post(
  '/safety-stock/calculate',
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const safetyStock = await advancedInventoryService.calculateSafetyStock({
      ...req.body,
      calculatedBy: req.user?.userId,
    });
    res.status(201).json(safetyStock);
  })
);

/**
 * GET /api/advanced-inventory/safety-stock/alerts
 * Get safety stock alerts
 */
router.get(
  '/safety-stock/alerts',
  asyncHandler(async (_req: AuthenticatedRequest, res) => {
    const alerts = await advancedInventoryService.getSafetyStockAlerts();
    res.json(alerts);
  })
);

// ============================================================================
// CYCLE COUNT OPTIMIZATION
// ============================================================================

/**
 * POST /api/advanced-inventory/cycle-count-optimization
 * Create cycle count optimization
 */
router.post(
  '/cycle-count-optimization',
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const optimization = await advancedInventoryService.createCycleCountOptimization({
      ...req.body,
      createdBy: req.user?.userId,
    });
    res.status(201).json(optimization);
  })
);

/**
 * GET /api/advanced-inventory/cycle-count-schedule
 * Get cycle count schedule
 */
router.get(
  '/cycle-count-schedule',
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : new Date();
    const endDate = req.query.endDate
      ? new Date(req.query.endDate as string)
      : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const schedule = await advancedInventoryService.getCycleCountSchedule(startDate, endDate);
    res.json(schedule);
  })
);

// ============================================================================
// SLOW MOVING INVENTORY
// ============================================================================

/**
 * GET /api/advanced-inventory/slow-moving
 * Get slow moving inventory
 */
router.get(
  '/slow-moving',
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const thresholdDays = parseInt(req.query.threshold as string) || 90;
    const inventory = await advancedInventoryService.getSlowMovingInventory(thresholdDays);
    res.json(inventory);
  })
);

/**
 * GET /api/advanced-inventory/investment-analysis
 * Get inventory investment analysis
 */
router.get(
  '/investment-analysis',
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const startDate = req.query.startDate
      ? new Date(req.query.startDate as string)
      : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : new Date();

    const analysis = await advancedInventoryService.getInventoryInvestmentAnalysis(
      startDate,
      endDate
    );
    res.json(analysis);
  })
);

export default router;
