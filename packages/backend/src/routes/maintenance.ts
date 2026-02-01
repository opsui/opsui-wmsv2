/**
 * Maintenance & Assets Routes
 *
 * API endpoints for asset management and maintenance workflows
 */

import { Router } from 'express';
import { maintenanceService } from '../services/MaintenanceService';
import { authenticate, authorize, asyncHandler } from '../middleware';
import { AuthenticatedRequest } from '../middleware/auth';
import { UserRole, AssetStatus, MaintenanceStatus } from '@opsui/shared';

const router = Router();

// All maintenance routes require authentication
router.use(authenticate);

// ============================================================================
// ASSETS
// ============================================================================

/**
 * POST /api/maintenance/assets
 * Create a new asset
 * Access: ADMIN, SUPERVISOR, MAINTENANCE
 */
router.post(
  '/assets',
  authorize(UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.MAINTENANCE),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const asset = await maintenanceService.createAsset(req.body, req.user!.userId);
    res.status(201).json(asset);
  })
);

/**
 * GET /api/maintenance/assets
 * Get all assets with optional filtering
 * Access: All authenticated users
 */
router.get(
  '/assets',
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { status, type, limit, offset } = req.query;
    const result = await maintenanceService.getAllAssets({
      status: status as AssetStatus,
      type: type as string,
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined,
    });
    res.json(result);
  })
);

/**
 * GET /api/maintenance/assets/:assetId
 * Get a specific asset by ID
 * Access: All authenticated users
 */
router.get(
  '/assets/:assetId',
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { assetId } = req.params;
    const asset = await maintenanceService.getAssetById(assetId);
    res.json(asset);
  })
);

/**
 * PUT /api/maintenance/assets/:assetId
 * Update an asset
 * Access: ADMIN, SUPERVISOR, MAINTENANCE
 */
router.put(
  '/assets/:assetId',
  authorize(UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.MAINTENANCE),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { assetId } = req.params;
    const asset = await maintenanceService.updateAsset(assetId, req.body, req.user!.userId);
    res.json(asset);
  })
);

/**
 * POST /api/maintenance/assets/:assetId/retire
 * Retire an asset
 * Access: ADMIN, SUPERVISOR
 */
router.post(
  '/assets/:assetId/retire',
  authorize(UserRole.ADMIN, UserRole.SUPERVISOR),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { assetId } = req.params;
    const asset = await maintenanceService.retireAsset(assetId, req.user!.userId);
    res.json(asset);
  })
);

// ============================================================================
// MAINTENANCE SCHEDULES
// ============================================================================

/**
 * POST /api/maintenance/schedules
 * Create a new maintenance schedule
 * Access: ADMIN, SUPERVISOR, MAINTENANCE
 */
router.post(
  '/schedules',
  authorize(UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.MAINTENANCE),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const schedule = await maintenanceService.createSchedule(req.body, req.user!.userId);
    res.status(201).json(schedule);
  })
);

/**
 * GET /api/maintenance/schedules
 * Get all maintenance schedules
 * Access: All authenticated users
 */
router.get(
  '/schedules',
  asyncHandler(async (_req: AuthenticatedRequest, res) => {
    const schedules = await maintenanceService.getUpcomingMaintenance(30);
    res.json({ schedules, count: schedules.length });
  })
);

/**
 * GET /api/maintenance/assets/:assetId/schedules
 * Get maintenance schedules for an asset
 * Access: All authenticated users
 */
router.get(
  '/assets/:assetId/schedules',
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { assetId } = req.params;
    const schedules = await maintenanceService.getSchedulesByAsset(assetId);
    res.json({ schedules, count: schedules.length });
  })
);

/**
 * GET /api/maintenance/schedules/due
 * Get upcoming maintenance schedules
 * Access: All authenticated users
 */
router.get(
  '/schedules/due',
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { days } = req.query;
    const schedules = await maintenanceService.getUpcomingMaintenance(
      days ? parseInt(days as string) : 7
    );
    res.json({ schedules, count: schedules.length });
  })
);

// ============================================================================
// WORK ORDERS
// ============================================================================

/**
 * POST /api/maintenance/work-orders
 * Create a new work order
 * Access: ADMIN, SUPERVISOR, MAINTENANCE
 */
router.post(
  '/work-orders',
  authorize(UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.MAINTENANCE),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const workOrder = await maintenanceService.createWorkOrder(req.body, req.user!.userId);
    res.status(201).json(workOrder);
  })
);

/**
 * GET /api/maintenance/work-orders
 * Get all work orders with optional filtering
 * Access: All authenticated users
 */
router.get(
  '/work-orders',
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { status, assignedTo, limit, offset } = req.query;
    const result = await maintenanceService.getAllWorkOrders({
      status: status as MaintenanceStatus,
      assignedTo: assignedTo as string,
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined,
    });
    res.json(result);
  })
);

/**
 * GET /api/maintenance/work-orders/:workOrderId
 * Get a specific work order by ID
 * Access: All authenticated users
 */
router.get(
  '/work-orders/:workOrderId',
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { workOrderId } = req.params;
    const workOrder = await maintenanceService.getWorkOrderById(workOrderId);
    res.json(workOrder);
  })
);

/**
 * POST /api/maintenance/work-orders/:workOrderId/start
 * Start a work order
 * Access: ADMIN, SUPERVISOR, MAINTENANCE
 */
router.post(
  '/work-orders/:workOrderId/start',
  authorize(UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.MAINTENANCE),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { workOrderId } = req.params;
    const workOrder = await maintenanceService.startWorkOrder(workOrderId, req.user!.userId);
    res.json(workOrder);
  })
);

/**
 * POST /api/maintenance/work-orders/:workOrderId/complete
 * Complete a work order
 * Access: ADMIN, SUPERVISOR, MAINTENANCE
 */
router.post(
  '/work-orders/:workOrderId/complete',
  authorize(UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.MAINTENANCE),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { workOrderId } = req.params;
    const workOrder = await maintenanceService.completeWorkOrder(
      workOrderId,
      req.body,
      req.user!.userId
    );
    res.json(workOrder);
  })
);

// ============================================================================
// SERVICE HISTORY
// ============================================================================

/**
 * GET /api/maintenance/assets/:assetId/service-history
 * Get service history for an asset
 * Access: All authenticated users
 */
router.get(
  '/assets/:assetId/service-history',
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { assetId } = req.params;
    const { limit } = req.query;
    const serviceLogs = await maintenanceService.getAssetServiceHistory(
      assetId,
      limit ? parseInt(limit as string) : 50
    );
    res.json({ serviceLogs, count: serviceLogs.length });
  })
);

/**
 * POST /api/maintenance/service-logs
 * Add a service log entry
 * Access: ADMIN, SUPERVISOR, MAINTENANCE
 */
router.post(
  '/service-logs',
  authorize(UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.MAINTENANCE),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const serviceLog = await maintenanceService.addServiceLog({
      ...req.body,
      createdAt: new Date(),
    });
    res.status(201).json(serviceLog);
  })
);

// ============================================================================
// METER READINGS
// ============================================================================

/**
 * POST /api/maintenance/meter-readings
 * Add a meter reading
 * Access: ADMIN, SUPERVISOR, MAINTENANCE
 */
router.post(
  '/meter-readings',
  authorize(UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.MAINTENANCE),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const reading = await maintenanceService.addMeterReading(req.body, req.user!.userId);
    res.status(201).json(reading);
  })
);

/**
 * GET /api/maintenance/assets/:assetId/meter-readings
 * Get meter readings for an asset
 * Access: All authenticated users
 */
router.get(
  '/assets/:assetId/meter-readings',
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { assetId } = req.params;
    const { limit } = req.query;
    const readings = await maintenanceService.getMeterReadingsByAsset(
      assetId,
      limit ? parseInt(limit as string) : 100
    );
    res.json({ readings, count: readings.length });
  })
);

export default router;
