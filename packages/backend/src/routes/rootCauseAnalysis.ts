/**
 * Root Cause Analysis Routes
 *
 * API endpoints for variance root cause categorization and analysis
 */

import { Router } from 'express';
import { rootCauseAnalysisService } from '../services/RootCauseAnalysisService';
import { asyncHandler, authenticate, authorize } from '../middleware';
import { requirePermission } from '../middleware/permissions';
import { AuthenticatedRequest } from '../middleware/auth';
import { UserRole, Permission } from '@opsui/shared';

const router = Router();

// All routes require authentication
router.use(authenticate);

// ============================================================================
// ROOT CAUSE CATEGORIES
// ============================================================================

/**
 * GET /api/cycle-count/root-causes/categories
 * Get all root cause categories
 */
router.get(
  '/categories',
  asyncHandler(async (_req: AuthenticatedRequest, res) => {
    const categories = await rootCauseAnalysisService.getAllCategories();
    res.json(categories);
  })
);

/**
 * GET /api/cycle-count/root-causes/categories/:categoryId
 * Get a specific root cause category
 */
router.get(
  '/categories/:categoryId',
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { categoryId } = req.params;
    const category = await rootCauseAnalysisService.getCategory(categoryId);
    res.json(category);
  })
);

// ============================================================================
// ROOT CAUSE RECORDING
// ============================================================================

/**
 * POST /api/cycle-count/root-causes
 * Record root cause for a variance entry
 * Requires PERFORM_CYCLE_COUNTS permission
 */
router.post(
  '/',
  requirePermission(Permission.PERFORM_CYCLE_COUNTS),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { entryId, categoryId, additionalNotes } = req.body;

    // Validate required fields
    if (!entryId || !categoryId) {
      res.status(400).json({
        error: 'Missing required fields',
        code: 'MISSING_FIELDS',
      });
      return;
    }

    const rootCause = await rootCauseAnalysisService.recordRootCause({
      entryId,
      categoryId,
      additionalNotes,
      createdBy: req.user!.userId,
    });

    res.status(201).json(rootCause);
  })
);

/**
 * GET /api/cycle-count/root-causes/entry/:entryId
 * Get root cause for a specific entry
 */
router.get(
  '/entry/:entryId',
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { entryId } = req.params;
    const rootCause = await rootCauseAnalysisService.getRootCauseForEntry(entryId);
    res.json(rootCause);
  })
);

// ============================================================================
// ANALYTICS ENDPOINTS
// ============================================================================

/**
 * GET /api/cycle-count/root-causes/pareto
 * Get Pareto analysis of root causes (80/20 rule)
 */
router.get(
  '/pareto',
  authorize(UserRole.STOCK_CONTROLLER, UserRole.SUPERVISOR, UserRole.ADMIN),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const days = req.query.days ? parseInt(req.query.days as string) : 30;
    const paretoData = await rootCauseAnalysisService.getRootCausePareto(days);
    res.json(paretoData);
  })
);

/**
 * GET /api/cycle-count/root-causes/breakdown
 * Get category breakdown with trend analysis
 */
router.get(
  '/breakdown',
  authorize(UserRole.STOCK_CONTROLLER, UserRole.SUPERVISOR, UserRole.ADMIN),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const days = req.query.days ? parseInt(req.query.days as string) : 30;
    const breakdown = await rootCauseAnalysisService.getCategoryBreakdown(days);
    res.json(breakdown);
  })
);

/**
 * GET /api/cycle-count/root-causes/trending
 * Get trending root causes (increasing problems)
 */
router.get(
  '/trending',
  authorize(UserRole.STOCK_CONTROLLER, UserRole.SUPERVISOR, UserRole.ADMIN),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const days = req.query.days ? parseInt(req.query.days as string) : 30;
    const trending = await rootCauseAnalysisService.getTrendingRootCauses(days);
    res.json(trending);
  })
);

/**
 * GET /api/cycle-count/root-causes/sku/:sku
 * Get root cause analysis for a specific SKU
 */
router.get(
  '/sku/:sku',
  authorize(UserRole.STOCK_CONTROLLER, UserRole.SUPERVISOR, UserRole.ADMIN),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { sku } = req.params;
    const days = req.query.days ? parseInt(req.query.days as string) : 30;
    const skuAnalysis = await rootCauseAnalysisService.getRootCauseBySKU(sku, days);
    res.json(skuAnalysis);
  })
);

/**
 * GET /api/cycle-count/root-causes/zone/:zone
 * Get root cause analysis for a specific zone
 */
router.get(
  '/zone/:zone',
  authorize(UserRole.STOCK_CONTROLLER, UserRole.SUPERVISOR, UserRole.ADMIN),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { zone } = req.params;
    const days = req.query.days ? parseInt(req.query.days as string) : 30;
    const zoneAnalysis = await rootCauseAnalysisService.getRootCauseByZone(zone, days);
    res.json(zoneAnalysis);
  })
);

export default router;
