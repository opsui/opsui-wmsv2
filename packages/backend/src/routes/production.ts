/**
 * Production Management Routes
 *
 * API endpoints for production orders, BOMs, and manufacturing workflows
 */

import { Router, Response } from 'express';
import { productionService } from '../services/ProductionService';
import { authenticate, authorize } from '../middleware';
import { AuthenticatedRequest } from '../middleware/auth';
import { UserRole, ProductionOrderStatus } from '@opsui/shared';
import { asyncHandler } from '../middleware';

const router = Router();

// All production routes require authentication
router.use(authenticate);

// ============================================================================
// BILLS OF MATERIALS
// ============================================================================

/**
 * POST /api/production/bom
 * Create a new Bill of Materials
 * Access: ADMIN, SUPERVISOR, PRODUCTION
 */
router.post(
  '/bom',
  authorize(UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.PRODUCTION),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const bom = await productionService.createBOM(req.body, req.user!.userId);
    res.status(201).json(bom);
  })
);

/**
 * GET /api/production/bom
 * Get all Bills of Materials
 * Access: All authenticated users
 */
router.get(
  '/bom',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { productId, status } = req.query;
    const boms = await productionService.getAllBOMs({
      productId: productId as string,
      status: status as string,
    });
    res.json({ boms, count: boms.length });
  })
);

/**
 * GET /api/production/bom/:bomId
 * Get a specific BOM by ID
 * Access: All authenticated users
 */
router.get(
  '/bom/:bomId',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { bomId } = req.params;
    const bom = await productionService.getBOMById(bomId);
    res.json(bom);
  })
);

// ============================================================================
// PRODUCTION ORDERS
// ============================================================================

/**
 * POST /api/production/orders
 * Create a new production order
 * Access: ADMIN, SUPERVISOR, PRODUCTION
 */
router.post(
  '/orders',
  authorize(UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.PRODUCTION),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const order = await productionService.createProductionOrder(req.body, req.user!.userId);
    res.status(201).json(order);
  })
);

/**
 * GET /api/production/orders
 * Get all production orders with optional filtering
 * Access: All authenticated users
 */
router.get(
  '/orders',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { status, assignedTo, limit, offset } = req.query;
    const result = await productionService.getAllProductionOrders({
      status: status as ProductionOrderStatus,
      assignedTo: assignedTo as string,
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined,
    });
    res.json(result);
  })
);

/**
 * GET /api/production/orders/:orderId
 * Get a specific production order by ID
 * Access: All authenticated users
 */
router.get(
  '/orders/:orderId',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { orderId } = req.params;
    const order = await productionService.getProductionOrderById(orderId);
    res.json(order);
  })
);

/**
 * PUT /api/production/orders/:orderId
 * Update a production order
 * Access: ADMIN, SUPERVISOR, PRODUCTION
 */
router.put(
  '/orders/:orderId',
  authorize(UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.PRODUCTION),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { orderId } = req.params;
    const order = await productionService.updateProductionOrder(
      orderId,
      req.body,
      req.user!.userId
    );
    res.json(order);
  })
);

/**
 * POST /api/production/orders/:orderId/release
 * Release a production order (PLANNED → RELEASED)
 * Access: ADMIN, SUPERVISOR, PRODUCTION
 */
router.post(
  '/orders/:orderId/release',
  authorize(UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.PRODUCTION),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { orderId } = req.params;
    const order = await productionService.releaseProductionOrder(orderId, req.user!.userId);
    res.json(order);
  })
);

/**
 * POST /api/production/orders/:orderId/start
 * Start a production order (RELEASED → IN_PROGRESS)
 * Access: PRODUCTION, ADMIN, SUPERVISOR
 */
router.post(
  '/orders/:orderId/start',
  authorize(UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.PRODUCTION),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { orderId } = req.params;
    const order = await productionService.startProductionOrder(orderId, req.user!.userId);
    res.json(order);
  })
);

/**
 * POST /api/production/orders/:orderId/output
 * Record production output
 * Access: PRODUCTION, ADMIN, SUPERVISOR
 */
router.post(
  '/orders/:orderId/output',
  authorize(UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.PRODUCTION),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { orderId } = req.params;
    const output = await productionService.recordProductionOutput(
      {
        ...req.body,
        orderId,
      },
      req.user!.userId
    );
    res.status(201).json(output);
  })
);

/**
 * GET /api/production/orders/:orderId/journal
 * Get production journal entries for an order
 * Access: All authenticated users
 */
router.get(
  '/orders/:orderId/journal',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { orderId } = req.params;
    const journal = await productionService.getProductionJournal(orderId);
    res.json({ journal, count: journal.length });
  })
);

export default router;
