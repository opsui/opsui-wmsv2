/**
 * Order Exception routes
 *
 * Endpoints for logging and resolving order exceptions during fulfillment
 */

import { Router } from 'express';
import { orderExceptionService } from '../services/OrderExceptionService';
import { asyncHandler, authenticate, authorize } from '../middleware';
import { AuthenticatedRequest } from '../middleware/auth';
import { UserRole, ExceptionType, ExceptionStatus } from '@opsui/shared';

const router = Router();

// All exception routes require authentication
router.use(authenticate);

/**
 * POST /api/exceptions/log
 * Log a new exception during picking
 */
router.post(
  '/log',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    console.log('[POST /api/exceptions/log] Request body:', JSON.stringify(req.body, null, 2));

    // Normalize snake_case to camelCase for compatibility with API client
    const orderId = req.body.orderId || req.body.order_id;
    const orderItemId = req.body.orderItemId || req.body.order_item_id;
    const sku = req.body.sku;
    const type = req.body.type;
    const quantityExpected = req.body.quantityExpected ?? req.body.quantity_expected;
    const quantityActual = req.body.quantityActual ?? req.body.quantity_actual;
    const reason = req.body.reason;
    const substituteSku = req.body.substituteSku ?? req.body.substitute_sku;

    // Validate required fields
    if (
      !orderId ||
      !orderItemId ||
      !sku ||
      !type ||
      typeof quantityExpected !== 'number' ||
      typeof quantityActual !== 'number' ||
      !reason
    ) {
      res.status(400).json({
        error: 'Missing required fields',
        code: 'MISSING_FIELDS',
        details: {
          orderId: !!orderId,
          orderItemId: !!orderItemId,
          sku: !!sku,
          type: !!type,
          quantityExpected: typeof quantityExpected === 'number',
          quantityActual: typeof quantityActual === 'number',
          reason: !!reason,
        },
      });
      return;
    }

    // Validate exception type
    const validTypes = Object.values(ExceptionType);
    if (!validTypes.includes(type)) {
      res.status(400).json({
        error: 'Invalid exception type',
        code: 'INVALID_TYPE',
        validTypes,
      });
      return;
    }

    const exception = await orderExceptionService.logException({
      orderId,
      orderItemId,
      sku,
      type,
      quantityExpected,
      quantityActual,
      reason,
      reportedBy: req.user.userId,
      substituteSku,
    });

    res.json(exception);
  })
);

/**
 * GET /api/exceptions
 * Get all exceptions with optional filters
 */
router.get(
  '/',
  authorize(UserRole.SUPERVISOR, UserRole.ADMIN),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const filters = {
      status: req.query.status as ExceptionStatus | undefined,
      orderId: req.query.orderId as string | undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string) : 50,
      offset: req.query.offset ? parseInt(req.query.offset as string) : 0,
    };

    const result = await orderExceptionService.getAllExceptions(filters);
    res.json(result);
  })
);

/**
 * GET /api/exceptions/open
 * Get all open exceptions that need attention
 */
router.get(
  '/open',
  authorize(UserRole.SUPERVISOR, UserRole.ADMIN),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const filters = {
      orderId: req.query.orderId as string | undefined,
      sku: req.query.sku as string | undefined,
      type: req.query.type as ExceptionType | undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string) : 50,
      offset: req.query.offset ? parseInt(req.query.offset as string) : 0,
    };

    const result = await orderExceptionService.getOpenExceptions(filters);
    res.json(result);
  })
);

/**
 * GET /api/exceptions/summary
 * Get exception summary statistics
 */
router.get(
  '/summary',
  authorize(UserRole.SUPERVISOR, UserRole.ADMIN),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const summary = await orderExceptionService.getExceptionSummary();
    res.json(summary);
  })
);

/**
 * GET /api/exceptions/:exceptionId
 * Get a specific exception by ID
 */
router.get(
  '/:exceptionId',
  authorize(UserRole.SUPERVISOR, UserRole.ADMIN),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { exceptionId } = req.params;
    const exception = await orderExceptionService.getException(exceptionId);
    res.json(exception);
  })
);

/**
 * POST /api/exceptions/:exceptionId/resolve
 * Resolve an exception with a specific action
 */
router.post(
  '/:exceptionId/resolve',
  authorize(UserRole.SUPERVISOR, UserRole.ADMIN),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { exceptionId } = req.params;
    const { resolution, notes, substituteSku, newQuantity, newBinLocation } = req.body;

    // Validate resolution
    if (!resolution) {
      res.status(400).json({
        error: 'Resolution is required',
        code: 'MISSING_RESOLUTION',
      });
      return;
    }

    const resolved = await orderExceptionService.resolveException({
      exceptionId,
      resolution,
      notes,
      resolvedBy: req.user.userId,
      substituteSku,
      newQuantity,
      newBinLocation,
    });

    res.json(resolved);
  })
);

/**
 * POST /api/exceptions/report-problem
 * Report a general problem (not tied to a specific order)
 */
router.post(
  '/report-problem',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { problemType, location, description } = req.body;

    // Validate required fields
    if (!problemType || !description) {
      res.status(400).json({
        error: 'Missing required fields',
        code: 'MISSING_FIELDS',
      });
      return;
    }

    // Store problem report in database via service
    const problemReport = await orderExceptionService.reportProblem({
      problemType,
      location,
      description,
      reportedBy: req.user.userId,
    });

    res.json({
      success: true,
      message: 'Problem reported successfully',
      data: problemReport,
    });
  })
);

/**
 * GET /api/exceptions/problems
 * Get all problem reports
 */
router.get(
  '/problems',
  authorize(UserRole.SUPERVISOR, UserRole.ADMIN),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const filters = {
      status: req.query.status as string | undefined,
      problemType: req.query.problemType as string | undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string) : 50,
      offset: req.query.offset ? parseInt(req.query.offset as string) : 0,
    };

    const result = await orderExceptionService.getProblemReports(filters);
    res.json(result);
  })
);

/**
 * POST /api/exceptions/problems/:problemId/resolve
 * Resolve a problem report
 */
router.post(
  '/problems/:problemId/resolve',
  authorize(UserRole.SUPERVISOR, UserRole.ADMIN),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { problemId } = req.params;
    const { resolution, notes } = req.body;

    // Validate resolution
    if (!resolution) {
      res.status(400).json({
        error: 'Resolution is required',
        code: 'MISSING_RESOLUTION',
      });
      return;
    }

    const resolved = await orderExceptionService.resolveProblemReport({
      problemId,
      resolution,
      notes,
      resolvedBy: req.user.userId,
    });

    res.json({
      success: true,
      message: 'Problem report resolved successfully',
      data: resolved,
    });
  })
);

export default router;
