/**
 * Variance Severity Routes
 *
 * API endpoints for managing variance severity configurations
 */

import { Router } from 'express';
import { varianceSeverityService } from '../services/VarianceSeverityService';
import { asyncHandler, authenticate, authorize } from '../middleware';
import { requirePermission } from '../middleware/permissions';
import { AuthenticatedRequest } from '../middleware/auth';
import { UserRole, Permission } from '@opsui/shared';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * GET /api/cycle-count/severity/configs
 * Get all variance severity configurations
 */
router.get(
  '/configs',
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const includeInactive = req.query.includeInactive === 'true';
    const configs = await varianceSeverityService.getAllSeverityConfigs(includeInactive);
    res.json(configs);
  })
);

/**
 * GET /api/cycle-count/severity/configs/:configId
 * Get a specific severity configuration
 */
router.get(
  '/configs/:configId',
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { configId } = req.params;
    const config = await varianceSeverityService.getSeverityConfig(configId);
    res.json(config);
  })
);

/**
 * POST /api/cycle-count/severity/configs
 * Create a new severity configuration
 * Requires MANAGE_BUSINESS_RULES permission
 */
router.post(
  '/configs',
  requirePermission(Permission.MANAGE_BUSINESS_RULES),
  authorize(UserRole.SUPERVISOR, UserRole.ADMIN),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const {
      severityLevel,
      minVariancePercent,
      maxVariancePercent,
      requiresApproval,
      requiresManagerApproval,
      autoAdjust,
      colorCode,
    } = req.body;

    const config = await varianceSeverityService.createSeverityConfig({
      severityLevel,
      minVariancePercent,
      maxVariancePercent,
      requiresApproval,
      requiresManagerApproval,
      autoAdjust,
      colorCode,
    });

    res.status(201).json(config);
  })
);

/**
 * PUT /api/cycle-count/severity/configs/:configId
 * Update a severity configuration
 * Requires MANAGE_BUSINESS_RULES permission
 */
router.put(
  '/configs/:configId',
  requirePermission(Permission.MANAGE_BUSINESS_RULES),
  authorize(UserRole.SUPERVISOR, UserRole.ADMIN),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { configId } = req.params;
    const updates = req.body;

    const config = await varianceSeverityService.updateSeverityConfig(configId, updates);
    res.json(config);
  })
);

/**
 * DELETE /api/cycle-count/severity/configs/:configId
 * Delete (soft-delete) a severity configuration
 * Requires MANAGE_BUSINESS_RULES permission
 */
router.delete(
  '/configs/:configId',
  requirePermission(Permission.MANAGE_BUSINESS_RULES),
  authorize(UserRole.SUPERVISOR, UserRole.ADMIN),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { configId } = req.params;
    await varianceSeverityService.deleteSeverityConfig(configId);
    res.status(204).send();
  })
);

/**
 * POST /api/cycle-count/severity/configs/reset
 * Reset to default severity configurations
 * Requires MANAGE_BUSINESS_RULES permission
 */
router.post(
  '/configs/reset',
  requirePermission(Permission.MANAGE_BUSINESS_RULES),
  authorize(UserRole.SUPERVISOR, UserRole.ADMIN),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    await varianceSeverityService.resetToDefaults();
    res.json({ message: 'Severity configurations reset to defaults' });
  })
);

/**
 * GET /api/cycle-count/severity/determine
 * Determine severity for a given variance percentage
 */
router.get(
  '/determine',
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const variancePercent = parseFloat(req.query.variance as string);

    if (isNaN(variancePercent)) {
      res.status(400).json({
        error: 'Invalid variance_percent parameter',
        code: 'INVALID_PARAM',
      });
      return;
    }

    const determination = await varianceSeverityService.getSeverityForVariance(variancePercent);
    res.json(determination);
  })
);

export default router;
