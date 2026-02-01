/**
 * Location Capacity routes
 *
 * Endpoints for managing location capacity rules, utilization, and alerts
 */

import { Router } from 'express';
import { locationCapacityService } from '../services/LocationCapacityService';
import { asyncHandler, authenticate, authorize } from '../middleware';
import { AuthenticatedRequest } from '../middleware/auth';
import { UserRole, CapacityRuleStatus, CapacityType } from '@opsui/shared';

const router = Router();

// All location capacity routes require authentication
router.use(authenticate);

// ============================================================================
// CAPACITY RULE ROUTES
// ============================================================================

/**
 * POST /api/location-capacity/rules
 * Create a new capacity rule
 */
router.post(
  '/rules',
  authorize(UserRole.STOCK_CONTROLLER, UserRole.SUPERVISOR, UserRole.ADMIN),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const {
      ruleName,
      description,
      capacityType,
      capacityUnit,
      appliesTo,
      zone,
      locationType,
      specificLocation,
      maximumCapacity,
      warningThreshold,
      allowOverfill,
      overfillThreshold,
      priority,
    } = req.body;

    // Validate required fields
    if (
      !ruleName ||
      !capacityType ||
      !capacityUnit ||
      !appliesTo ||
      maximumCapacity === undefined
    ) {
      res.status(400).json({
        error: 'Missing required fields',
        code: 'MISSING_FIELDS',
      });
      return;
    }

    const rule = await locationCapacityService.createCapacityRule({
      ruleName,
      description,
      capacityType,
      capacityUnit,
      appliesTo,
      zone,
      locationType,
      specificLocation,
      maximumCapacity,
      warningThreshold: warningThreshold || 80,
      allowOverfill: allowOverfill || false,
      overfillThreshold,
      priority: priority || 0,
      createdBy: req.user!.userId,
    });

    res.status(201).json(rule);
  })
);

/**
 * GET /api/location-capacity/rules
 * Get all capacity rules
 */
router.get(
  '/rules',
  asyncHandler(async (_req: AuthenticatedRequest, res) => {
    const rules = await locationCapacityService.getAllCapacityRules();
    res.json(rules);
  })
);

/**
 * GET /api/location-capacity/rules/:ruleId
 * Get a specific capacity rule by ID
 */
router.get(
  '/rules/:ruleId',
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { ruleId } = req.params;
    const rule = await locationCapacityService.getCapacityRule(ruleId);
    res.json(rule);
  })
);

/**
 * PATCH /api/location-capacity/rules/:ruleId
 * Update a capacity rule
 */
router.patch(
  '/rules/:ruleId',
  authorize(UserRole.STOCK_CONTROLLER, UserRole.SUPERVISOR, UserRole.ADMIN),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { ruleId } = req.params;
    const updates = req.body;

    const rule = await locationCapacityService.updateCapacityRule(ruleId, updates);
    res.json(rule);
  })
);

/**
 * DELETE /api/location-capacity/rules/:ruleId
 * Delete a capacity rule
 */
router.delete(
  '/rules/:ruleId',
  authorize(UserRole.SUPERVISOR, UserRole.ADMIN),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { ruleId } = req.params;
    await locationCapacityService.deleteCapacityRule(ruleId);
    res.status(204).send();
  })
);

// ============================================================================
// LOCATION CAPACITY ROUTES
// ============================================================================

/**
 * GET /api/location-capacity/locations/:binLocation
 * Get capacity for a specific location
 */
router.get(
  '/locations/:binLocation',
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { binLocation } = req.params;
    const capacity = await locationCapacityService.getLocationCapacity(binLocation);
    res.json(capacity);
  })
);

/**
 * GET /api/location-capacity/locations
 * Get all location capacities with optional filters
 */
router.get(
  '/locations',
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const filters = {
      capacityType: req.query.capacityType as CapacityType | undefined,
      status: req.query.status as CapacityRuleStatus | undefined,
      showAlertsOnly: req.query.showAlertsOnly === 'true',
      limit: req.query.limit ? parseInt(req.query.limit as string) : 100,
      offset: req.query.offset ? parseInt(req.query.offset as string) : 0,
    };

    const result = await locationCapacityService.getAllLocationCapacities(filters);
    res.json(result);
  })
);

/**
 * POST /api/location-capacity/locations/:binLocation/recalculate
 * Recalculate capacity utilization for a location
 */
router.post(
  '/locations/:binLocation/recalculate',
  authorize(UserRole.STOCK_CONTROLLER, UserRole.SUPERVISOR, UserRole.ADMIN),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { binLocation } = req.params;
    const capacity = await locationCapacityService.recalculateLocationCapacity(binLocation);
    res.json(capacity);
  })
);

// ============================================================================
// CAPACITY ALERT ROUTES
// ============================================================================

/**
 * GET /api/location-capacity/alerts
 * Get all capacity alerts
 */
router.get(
  '/alerts',
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const filters = {
      acknowledged:
        req.query.acknowledged === 'true'
          ? true
          : req.query.acknowledged === 'false'
            ? false
            : undefined,
      alertType: req.query.alertType as 'WARNING' | 'EXCEEDED' | 'CRITICAL' | undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string) : 50,
      offset: req.query.offset ? parseInt(req.query.offset as string) : 0,
    };

    const result = await locationCapacityService.getAllCapacityAlerts(filters);
    res.json(result);
  })
);

/**
 * POST /api/location-capacity/alerts/:alertId/acknowledge
 * Acknowledge a capacity alert
 */
router.post(
  '/alerts/:alertId/acknowledge',
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { alertId } = req.params;

    const alert = await locationCapacityService.acknowledgeCapacityAlert({
      alertId,
      acknowledgedBy: req.user!.userId,
    });

    res.json(alert);
  })
);

export default router;
