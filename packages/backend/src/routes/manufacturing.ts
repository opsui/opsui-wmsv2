/**
 * Manufacturing API Routes
 *
 * REST API for manufacturing operations
 * Handles work centers, routings, MPS, MRP, production orders,
 * shop floor control, quality, and capacity planning
 */

import { Router, Response } from 'express';
import { manufacturingService } from '../services/ManufacturingService';
import { asyncHandler, authenticate, authorize } from '../middleware';
import { AuthenticatedRequest } from '../middleware/auth';
import {
  UserRole,
  WorkCenterStatus,
  RoutingStatus,
  ProductionOrderStatus,
  MRPPlanStatus,
  CapacityPlanStatus,
} from '@opsui/shared';

const router = Router();

// All manufacturing routes require authentication
router.use(authenticate);

// Manufacturing management requires Admin, Supervisor, or Production access
const manufacturingAuth = authorize(UserRole.ADMIN, UserRole.SUPERVISOR);

// Shop floor operations can be accessed by workers
const shopFloorAuth = authorize(UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.INWARDS);

// Analytics and reporting
const analyticsAuth = authorize(UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.ACCOUNTING);

// ============================================================================
// DASHBOARD
// ============================================================================

/**
 * GET /api/manufacturing/dashboard
 * Get manufacturing dashboard metrics
 */
router.get(
  '/dashboard',
  analyticsAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const entityId = req.query.entity_id as string | undefined;
    const metrics = await manufacturingService.getDashboardMetrics(entityId);
    res.json(metrics);
  })
);

// ============================================================================
// WORK CENTERS
// ============================================================================

/**
 * GET /api/manufacturing/work-centers
 * Get all work centers with optional filters
 */
router.get(
  '/work-centers',
  manufacturingAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const filters: any = {
      entity_id: req.query.entity_id as string | undefined,
      department: req.query.department as string | undefined,
      work_center_status: req.query.work_center_status as WorkCenterStatus | undefined,
      site_id: req.query.site_id as string | undefined,
      search: req.query.search as string | undefined,
    };

    const workCenters = await manufacturingService.getWorkCenters(filters);
    res.json(workCenters);
  })
);

/**
 * GET /api/manufacturing/work-centers/active
 * Get active work centers
 */
router.get(
  '/work-centers/active',
  manufacturingAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const workCenters = await manufacturingService.getWorkCenters({
      work_center_status: WorkCenterStatus.ACTIVE,
    });
    res.json(workCenters);
  })
);

/**
 * GET /api/manufacturing/work-centers/:id
 * Get work center with queue information
 */
router.get(
  '/work-centers/:id',
  manufacturingAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const workCenter = await manufacturingService.getWorkCenterWithQueue(req.params.id);
    if (!workCenter) {
      res.status(404).json({ error: 'Work center not found' });
      return;
    }
    res.json(workCenter);
  })
);

/**
 * POST /api/manufacturing/work-centers
 * Create a new work center
 */
router.post(
  '/work-centers',
  manufacturingAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const workCenter = await manufacturingService.createWorkCenter(req.body);
    res.status(201).json(workCenter);
  })
);

/**
 * GET /api/manufacturing/work-centers/overloaded
 * Get overloaded work centers
 */
router.get(
  '/work-centers/load/overloaded',
  manufacturingAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const overloaded = await manufacturingService.getOverloadedWorkCenters();
    res.json(overloaded);
  })
);

// ============================================================================
// ROUTINGS
// ============================================================================

/**
 * GET /api/manufacturing/routings
 * Get all routings with optional filters
 */
router.get(
  '/routings',
  manufacturingAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const filters: any = {
      entity_id: req.query.entity_id as string | undefined,
      sku: req.query.sku as string | undefined,
      routing_status: req.query.routing_status as RoutingStatus | undefined,
      search: req.query.search as string | undefined,
    };

    const routings = await manufacturingService.getRoutings(filters);
    res.json(routings);
  })
);

/**
 * GET /api/manufacturing/routings/:id
 * Get routing with details
 */
router.get(
  '/routings/:id',
  manufacturingAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const routing = await manufacturingService.getRoutingWithDetails(req.params.id);
    if (!routing) {
      res.status(404).json({ error: 'Routing not found' });
      return;
    }
    res.json(routing);
  })
);

/**
 * POST /api/manufacturing/routings
 * Create a new routing
 */
router.post(
  '/routings',
  manufacturingAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const routing = await manufacturingService.createRouting(req.body);
    res.status(201).json(routing);
  })
);

/**
 * GET /api/manufacturing/routings/sku/:sku
 * Get routings for a specific SKU
 */
router.get(
  '/routings/sku/:sku',
  manufacturingAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const routings = await manufacturingService.getRoutings({
      sku: req.params.sku,
      routing_status: RoutingStatus.ACTIVE,
    });
    res.json(routings);
  })
);

// ============================================================================
// PRODUCTION ORDERS
// ============================================================================

/**
 * GET /api/manufacturing/production-orders
 * Get all production orders with optional filters
 */
router.get(
  '/production-orders',
  manufacturingAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const filters: any = {
      entity_id: req.query.entity_id as string | undefined,
      sku: req.query.sku as string | undefined,
      order_status: req.query.order_status as ProductionOrderStatus | undefined,
      order_type: req.query.order_type as string | undefined,
      start_date_from: req.query.start_date_from
        ? new Date(req.query.start_date_from as string)
        : undefined,
      start_date_to: req.query.start_date_to
        ? new Date(req.query.start_date_to as string)
        : undefined,
      due_date_from: req.query.due_date_from
        ? new Date(req.query.due_date_from as string)
        : undefined,
      due_date_to: req.query.due_date_to ? new Date(req.query.due_date_to as string) : undefined,
      customer_id: req.query.customer_id as string | undefined,
      sales_order_id: req.query.sales_order_id as string | undefined,
      job_number: req.query.job_number as string | undefined,
      search: req.query.search as string | undefined,
    };

    const orders = await manufacturingService.getProductionOrders(filters);
    res.json(orders);
  })
);

/**
 * GET /api/manufacturing/production-orders/active
 * Get active production orders
 */
router.get(
  '/production-orders/active',
  manufacturingAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const orders = await manufacturingService.getActiveProductionOrders();
    res.json(orders);
  })
);

/**
 * GET /api/manufacturing/production-orders/past-due
 * Get past due production orders
 */
router.get(
  '/production-orders/past-due',
  manufacturingAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const orders = await manufacturingService.getProductionOrders({});
    // Filter for past due would be done in service
    res.json(orders.filter((o: any) => o.due_date < new Date() && o.order_status !== 'COMPLETED'));
  })
);

/**
 * GET /api/manufacturing/production-orders/:id
 * Get production order with details
 */
router.get(
  '/production-orders/:id',
  manufacturingAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const order = await manufacturingService.getProductionOrderWithDetails(req.params.id);
    if (!order) {
      res.status(404).json({ error: 'Production order not found' });
      return;
    }
    res.json(order);
  })
);

/**
 * POST /api/manufacturing/production-orders
 * Create a new production order
 */
router.post(
  '/production-orders',
  manufacturingAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const dto = {
      ...req.body,
      created_by: req.user!.userId,
    };
    const order = await manufacturingService.createProductionOrder(dto);
    res.status(201).json(order);
  })
);

/**
 * PUT /api/manufacturing/production-orders/:id/release
 * Release production order
 */
router.put(
  '/production-orders/:id/release',
  manufacturingAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const dto = {
      order_id: req.params.id,
      release_date: req.body.release_date ? new Date(req.body.release_date) : undefined,
    };
    const order = await manufacturingService.releaseProductionOrder(dto);
    res.json(order);
  })
);

// ============================================================================
// SHOP FLOOR TRANSACTIONS
// ============================================================================

/**
 * GET /api/manufacturing/shop-floor/transactions
 * Get shop floor transactions
 */
router.get(
  '/shop-floor/transactions',
  shopFloorAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    // Would implement query in service
    res.json({ message: 'Shop floor transactions endpoint' });
  })
);

/**
 * POST /api/manufacturing/shop-floor/transactions
 * Create shop floor transaction
 */
router.post(
  '/shop-floor/transactions',
  shopFloorAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const dto = {
      ...req.body,
    };
    const transaction = await manufacturingService.createShopFloorTransaction(dto);
    res.status(201).json(transaction);
  })
);

/**
 * POST /api/manufacturing/shop/report-quantity
 * Report quantity completion
 */
router.post(
  '/shop/report-quantity',
  shopFloorAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const result = await manufacturingService.recordQuantityCompletion(
      req.body.production_order_id,
      req.body.operation_id,
      req.body.quantity,
      req.body.scrap || 0,
      req.user!.userId
    );
    res.json(result);
  })
);

// ============================================================================
// MRP
// ============================================================================

/**
 * GET /api/manufacturing/mrp/plans
 * Get MRP plans
 */
router.get(
  '/mrp/plans',
  manufacturingAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const filters: any = {
      entity_id: req.query.entity_id as string | undefined,
      plan_status: req.query.plan_status as MRPPlanStatus | undefined,
      created_by: req.query.created_by as string | undefined,
    };

    const plans = await manufacturingService.getMRPPlans(filters);
    res.json(plans);
  })
);

/**
 * POST /api/manufacturing/mrp/plans
 * Create MRP plan
 */
router.post(
  '/mrp/plans',
  manufacturingAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const plan = await manufacturingService.createMRPPlan(req.body);
    res.status(201).json(plan);
  })
);

/**
 * GET /api/manufacturing/mrp/actions/pending
 * Get pending MRP action messages
 */
router.get(
  '/mrp/actions/pending',
  manufacturingAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const planId = req.query.plan_id as string | undefined;
    const actions = await manufacturingService.getPendingMRPActions(planId);
    res.json(actions);
  })
);

// ============================================================================
// CAPACITY PLANNING
// ============================================================================

/**
 * GET /api/manufacturing/capacity/plans
 * Get capacity plans
 */
router.get(
  '/capacity/plans',
  manufacturingAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const filters: any = {
      entity_id: req.query.entity_id as string | undefined,
      plan_status: req.query.plan_status as CapacityPlanStatus | undefined,
    };

    const plans = await manufacturingService.getCapacityPlans(filters);
    res.json(plans);
  })
);

/**
 * POST /api/manufacturing/capacity/plans
 * Create capacity plan
 */
router.post(
  '/capacity/plans',
  manufacturingAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const plan = await manufacturingService.createCapacityPlan(req.body);
    res.status(201).json(plan);
  })
);

/**
 * GET /api/manufacturing/capacity/overloaded
 * Get overloaded work centers
 */
router.get(
  '/capacity/overloaded',
  manufacturingAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const overloaded = await manufacturingService.getOverloadedWorkCenters();
    res.json(overloaded);
  })
);

export default router;
