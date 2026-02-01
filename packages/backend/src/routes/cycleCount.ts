/**
 * Cycle Count routes
 *
 * Endpoints for managing cycle counts and inventory adjustments
 */

import { Router } from 'express';
import { cycleCountService } from '../services/CycleCountService';
import { asyncHandler, authenticate, authorize } from '../middleware';
import { requirePermission } from '../middleware/permissions';
import { AuthenticatedRequest } from '../middleware/auth';
import { UserRole, CycleCountStatus, CycleCountType, Permission } from '@opsui/shared';

const router = Router();

// All cycle count routes require authentication
router.use(authenticate);

// ============================================================================
// CYCLE COUNT PLAN ROUTES
// ============================================================================

/**
 * POST /api/cycle-count/plans
 * Create a new cycle count plan
 */
router.post(
  '/plans',
  authorize(UserRole.STOCK_CONTROLLER, UserRole.SUPERVISOR, UserRole.ADMIN),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { planName, countType, scheduledDate, location, sku, countBy, notes } = req.body;

    // Validate required fields
    if (!planName || !countType || !scheduledDate || !countBy) {
      res.status(400).json({
        error: 'Missing required fields',
        code: 'MISSING_FIELDS',
      });
      return;
    }

    const plan = await cycleCountService.createCycleCountPlan({
      planName,
      countType,
      scheduledDate: new Date(scheduledDate),
      location,
      sku,
      countBy,
      createdBy: req.user!.userId,
      notes,
    });

    res.status(201).json(plan);
  })
);

/**
 * GET /api/cycle-count/plans
 * Get all cycle count plans with optional filters
 * All authenticated users can view, but are filtered based on role:
 * - Pickers/Packers: Only see their assigned counts
 * - Stock Controllers: See their assigned counts
 * - Supervisors/Admins: See all counts
 */
router.get(
  '/plans',
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const filters = {
      status: req.query.status as CycleCountStatus | undefined,
      countType: req.query.countType as CycleCountType | undefined,
      location: req.query.location as string | undefined,
      countBy: req.query.countBy as string | undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string) : 50,
      offset: req.query.offset ? parseInt(req.query.offset as string) : 0,
      requestingUserRole: req.user!.role,
      requestingUserId: req.user!.userId,
    };

    const result = await cycleCountService.getAllCycleCountPlans(filters);
    res.json(result);
  })
);

/**
 * GET /api/cycle-count/plans/:planId
 * Get a specific cycle count plan by ID
 */
router.get(
  '/plans/:planId',
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { planId } = req.params;
    const plan = await cycleCountService.getCycleCountPlan(planId);
    res.json(plan);
  })
);

/**
 * POST /api/cycle-count/plans/:planId/start
 * Start a cycle count plan
 */
router.post(
  '/plans/:planId/start',
  authorize(UserRole.STOCK_CONTROLLER, UserRole.SUPERVISOR, UserRole.ADMIN),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { planId } = req.params;
    const plan = await cycleCountService.startCycleCountPlan(planId);
    res.json(plan);
  })
);

/**
 * POST /api/cycle-count/plans/:planId/complete
 * Complete a cycle count plan
 */
router.post(
  '/plans/:planId/complete',
  authorize(UserRole.STOCK_CONTROLLER, UserRole.SUPERVISOR, UserRole.ADMIN),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { planId } = req.params;
    const plan = await cycleCountService.completeCycleCountPlan(planId);
    res.json(plan);
  })
);

/**
 * POST /api/cycle-count/plans/:planId/reconcile
 * Reconcile a cycle count plan (approve all variances)
 * Requires APPROVE_CYCLE_COUNTS permission
 */
router.post(
  '/plans/:planId/reconcile',
  requirePermission(Permission.APPROVE_CYCLE_COUNTS),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { planId } = req.params;
    const { notes } = req.body;

    const plan = await cycleCountService.reconcileCycleCountPlan({
      planId,
      reconciledBy: req.user!.userId,
      notes,
    });

    res.json(plan);
  })
);

// ============================================================================
// CYCLE COUNT ENTRY ROUTES
// ============================================================================

/**
 * POST /api/cycle-count/entries
 * Create a cycle count entry (record counted quantity)
 * Requires PERFORM_CYCLE_COUNTS permission
 */
router.post(
  '/entries',
  requirePermission(Permission.PERFORM_CYCLE_COUNTS),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { planId, sku, binLocation, countedQuantity, notes } = req.body;

    // Validate required fields
    if (!planId || !sku || !binLocation || countedQuantity === undefined) {
      res.status(400).json({
        error: 'Missing required fields',
        code: 'MISSING_FIELDS',
      });
      return;
    }

    const entry = await cycleCountService.createCycleCountEntry({
      planId,
      sku,
      binLocation,
      countedQuantity: parseFloat(countedQuantity),
      countedBy: req.user!.userId,
      notes,
    });

    res.status(201).json(entry);
  })
);

/**
 * PATCH /api/cycle-count/entries/:entryId/variance
 * Update variance status (approve/reject)
 * Requires APPROVE_CYCLE_COUNTS permission
 */
router.patch(
  '/entries/:entryId/variance',
  requirePermission(Permission.APPROVE_CYCLE_COUNTS),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { entryId } = req.params;
    const { status, notes } = req.body;

    if (!status) {
      res.status(400).json({
        error: 'Status is required',
        code: 'MISSING_STATUS',
      });
      return;
    }

    const entry = await cycleCountService.updateVarianceStatus({
      entryId,
      status,
      reviewedBy: req.user!.userId,
      notes,
    });

    res.json(entry);
  })
);

/**
 * POST /api/cycle-count/plans/:planId/bulk-variance-update
 * Bulk update variance status (approve/reject all pending variances)
 * Requires APPROVE_CYCLE_COUNTS permission
 */
router.post(
  '/plans/:planId/bulk-variance-update',
  requirePermission(Permission.APPROVE_CYCLE_COUNTS),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { planId } = req.params;
    const { status, notes, autoApproveZeroVariance = false } = req.body;

    if (!status || !['APPROVED', 'REJECTED'].includes(status)) {
      res.status(400).json({
        error: 'Status must be APPROVED or REJECTED',
        code: 'INVALID_STATUS',
      });
      return;
    }

    const result = await cycleCountService.bulkUpdateVarianceStatus({
      planId,
      status,
      reviewedBy: req.user!.userId,
      notes,
      autoApproveZeroVariance,
    });

    res.json(result);
  })
);

/**
 * GET /api/cycle-count/plans/:planId/reconcile-summary
 * Get summary of inventory adjustments before reconciling
 */
router.get(
  '/plans/:planId/reconcile-summary',
  authorize(UserRole.STOCK_CONTROLLER, UserRole.SUPERVISOR, UserRole.ADMIN),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { planId } = req.params;
    const summary = await cycleCountService.getReconcileSummary(planId);
    res.json(summary);
  })
);

/**
 * POST /api/cycle-count/plans/:planId/cancel
 * Cancel a cycle count plan (only SCHEDULED or IN_PROGRESS)
 */
router.post(
  '/plans/:planId/cancel',
  authorize(UserRole.STOCK_CONTROLLER, UserRole.SUPERVISOR, UserRole.ADMIN),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { planId } = req.params;
    const { reason } = req.body;

    const plan = await cycleCountService.cancelCycleCountPlan({
      planId,
      cancelledBy: req.user!.userId,
      reason,
    });

    res.json(plan);
  })
);

/**
 * GET /api/cycle-count/plans/:planId/check-collisions
 * Check for potential collisions with other active counts in same location
 */
router.get(
  '/plans/:planId/check-collisions',
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { planId } = req.params;
    const collisions = await cycleCountService.checkForCollisions(planId);
    res.json(collisions);
  })
);

/**
 * GET /api/cycle-count/plans/:planId/export
 * Export cycle count data as CSV
 */
router.get(
  '/plans/:planId/export',
  authorize(UserRole.SUPERVISOR, UserRole.ADMIN),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { planId } = req.params;
    const csvData = await cycleCountService.exportCycleCountData(planId);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="cycle-count-${planId}.csv"`);
    res.send(csvData);
  })
);

/**
 * GET /api/cycle-count/plans/:planId/audit-log
 * Get audit log for a cycle count plan
 */
router.get(
  '/plans/:planId/audit-log',
  authorize(UserRole.SUPERVISOR, UserRole.ADMIN),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { planId } = req.params;
    const auditLog = await cycleCountService.getCycleCountAuditLog(planId);
    res.json(auditLog);
  })
);

// ============================================================================
// TOLERANCE ROUTES
// ============================================================================

/**
 * GET /api/cycle-count/tolerances
 * Get all tolerance rules
 */
router.get(
  '/tolerances',
  authorize(UserRole.SUPERVISOR, UserRole.ADMIN),
  asyncHandler(async (_req: AuthenticatedRequest, res) => {
    const tolerances = await cycleCountService.getAllTolerances();
    res.json(tolerances);
  })
);

/**
 * GET /api/cycle-count/debug-permissions
 * TEMPORARY: Debug endpoint to check user permissions
 */
router.get(
  '/debug-permissions',
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    try {
      console.log('[debug-permissions] Request received, req.user:', req.user);

      if (!req.user) {
        console.log('[debug-permissions] No user found in request');
        res.status(401).json({
          error: 'Not authenticated',
          code: 'NOT_AUTHENTICATED',
        });
        return;
      }

      const { customRoleRepository } = await import('../repositories/CustomRoleRepository');
      const { DEFAULT_ROLE_PERMISSIONS, Permission } = await import('@opsui/shared');

      console.log(
        '[debug-permissions] Getting permissions for user:',
        req.user.userId,
        'role:',
        req.user.role
      );

      const user = req.user;
      const userRoleKey = user.role as keyof typeof DEFAULT_ROLE_PERMISSIONS;
      const defaultPerms = DEFAULT_ROLE_PERMISSIONS[userRoleKey] || [];
      console.log(
        '[debug-permissions] Default permissions for role',
        user.role,
        ':',
        defaultPerms.length
      );

      const userPerms = await customRoleRepository.getUserPermissions(user.userId, user.role);
      console.log('[debug-permissions] User permissions:', userPerms.length);

      const debugInfo = {
        userId: user.userId,
        role: user.role,
        baseRole: user.baseRole,
        effectiveRole: user.effectiveRole,
        availableRoles: Object.keys(DEFAULT_ROLE_PERMISSIONS),
        defaultPermissions: defaultPerms,
        userPermissions: userPerms,
        hasPerformCycleCounts: userPerms.includes(Permission.PERFORM_CYCLE_COUNTS),
        hasAdminFullAccess: userPerms.includes(Permission.ADMIN_FULL_ACCESS),
      };

      console.log('[debug-permissions] Debug info:', JSON.stringify(debugInfo, null, 2));
      res.json(debugInfo);
    } catch (error: any) {
      console.error('[debug-permissions] Error:', error);
      res.status(500).json({
        error: error.message,
        stack: error.stack,
      });
    }
  })
);

export default router;
