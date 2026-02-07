/**
 * RMA (Return Merchandise Authorization) Routes
 *
 * API endpoints for managing customer returns, warranty claims, and refurbishments
 */

import { Router } from 'express';
import { rmaService } from '../services/RMAService';
import { authenticate, authorize, asyncHandler } from '../middleware';
import { AuthenticatedRequest } from '../middleware/auth';
import { UserRole } from '@opsui/shared';

const router = Router();

// Debug logging
console.log('[RMA Routes] Registering RMA routes...');

// All RMA routes require authentication
router.use(authenticate);

// ============================================================================
// DASHBOARD
// ============================================================================

/**
 * GET /api/rma/dashboard
 * Get RMA dashboard statistics
 * Access: Users with RMA role, ADMIN, or SUPERVISOR
 */
router.get(
  '/dashboard',
  authorize(UserRole.RMA, UserRole.ADMIN, UserRole.SUPERVISOR),
  asyncHandler(async (_req: AuthenticatedRequest, res) => {
    console.log('[RMA Routes] GET /dashboard called');
    const dashboard = await rmaService.getDashboard();
    res.json(dashboard);
  })
);

// ============================================================================
// RMA REQUESTS
// ============================================================================

/**
 * POST /api/rma/requests
 * Create a new RMA request
 * Access: Users with RMA role (or ADMIN, SUPERVISOR)
 */
router.post(
  '/requests',
  authorize(UserRole.RMA, UserRole.ADMIN, UserRole.SUPERVISOR),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const rma = await rmaService.createRMARequest(req.body, req.user!.userId);
    res.status(201).json(rma);
  })
);

/**
 * GET /api/rma/requests
 * Get all RMA requests with optional filtering
 * Access: Users with RMA role, ADMIN, or SUPERVISOR
 */
router.get(
  '/requests',
  authorize(UserRole.RMA, UserRole.ADMIN, UserRole.SUPERVISOR),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { status, reason, priority, customerId, orderId, limit, offset } = req.query;

    const filters: any = {};
    if (status) filters.status = status;
    if (reason) filters.reason = reason;
    if (priority) filters.priority = priority;
    if (customerId) filters.customerId = customerId;
    if (orderId) filters.orderId = orderId;
    if (limit) filters.limit = parseInt(limit as string);
    if (offset) filters.offset = parseInt(offset as string);

    const result = await rmaService.getRMAs(filters);
    res.json(result);
  })
);

/**
 * GET /api/rma/requests/:rmaId
 * Get a specific RMA request by ID
 * Access: Users with VIEW_RMA_REQUESTS permission
 */
router.get(
  '/requests/:rmaId',
  authorize(UserRole.RMA, UserRole.ADMIN, UserRole.SUPERVISOR),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { rmaId } = req.params;
    const rma = await rmaService.getRMAById(rmaId);
    res.json(rma);
  })
);

/**
 * PUT /api/rma/requests/:rmaId/status
 * Update RMA status
 * Access: Users with PROCESS_RMA permission (or ADMIN, SUPERVISOR)
 */
router.put(
  '/requests/:rmaId/status',
  authorize(UserRole.RMA, UserRole.ADMIN, UserRole.SUPERVISOR),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { rmaId } = req.params;
    const rma = await rmaService.updateRMAStatus(rmaId, req.body, req.user!.userId);
    res.json(rma);
  })
);

/**
 * POST /api/rma/requests/:rmaId/approve
 * Approve an RMA request
 * Access: Users with PROCESS_RMA permission
 */
router.post(
  '/requests/:rmaId/approve',
  authorize(UserRole.RMA, UserRole.ADMIN, UserRole.SUPERVISOR),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { rmaId } = req.params;
    const rma = await rmaService.approveRMA(rmaId, req.user!.userId);
    res.json(rma);
  })
);

/**
 * POST /api/rma/requests/:rmaId/reject
 * Reject an RMA request
 * Access: Users with PROCESS_RMA permission
 */
router.post(
  '/requests/:rmaId/reject',
  authorize(UserRole.RMA, UserRole.ADMIN, UserRole.SUPERVISOR),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { rmaId } = req.params;
    const { rejectionReason } = req.body;

    if (!rejectionReason || rejectionReason.trim() === '') {
      res.status(400).json({ error: 'Rejection reason is required' });
      return;
    }

    const rma = await rmaService.rejectRMA(rmaId, rejectionReason, req.user!.userId);
    res.json(rma);
  })
);

/**
 * POST /api/rma/requests/:rmaId/receive
 * Mark RMA as received
 * Access: Users with PROCESS_RMA permission
 */
router.post(
  '/requests/:rmaId/receive',
  authorize(UserRole.RMA, UserRole.ADMIN, UserRole.SUPERVISOR),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { rmaId } = req.params;
    const rma = await rmaService.markAsReceived(rmaId, req.user!.userId);
    res.json(rma);
  })
);

/**
 * POST /api/rma/requests/:rmaId/inspect
 * Start inspection for RMA
 * Access: Users with PROCESS_RMA permission
 */
router.post(
  '/requests/:rmaId/inspect',
  authorize(UserRole.RMA, UserRole.ADMIN, UserRole.SUPERVISOR),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { rmaId } = req.params;
    const rma = await rmaService.startInspection(rmaId, req.user!.userId);
    res.json(rma);
  })
);

/**
 * POST /api/rma/requests/:rmaId/close
 * Close an RMA request
 * Access: Users with PROCESS_RMA permission
 */
router.post(
  '/requests/:rmaId/close',
  authorize(UserRole.RMA, UserRole.ADMIN, UserRole.SUPERVISOR),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { rmaId } = req.params;
    const rma = await rmaService.closeRMA(rmaId, req.user!.userId);
    res.json(rma);
  })
);

// ============================================================================
// INSPECTIONS
// ============================================================================

/**
 * POST /api/rma/requests/:rmaId/inspections
 * Create an inspection record
 * Access: Users with PROCESS_RMA permission
 */
router.post(
  '/requests/:rmaId/inspections',
  authorize(UserRole.RMA, UserRole.ADMIN, UserRole.SUPERVISOR),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { rmaId } = req.params;
    const inspection = await rmaService.createInspection(rmaId, req.body, req.user!.userId);
    res.status(201).json(inspection);
  })
);

/**
 * GET /api/rma/requests/:rmaId/inspections
 * Get inspection records for an RMA
 * Access: Users with VIEW_RMA_REQUESTS permission
 */
router.get(
  '/requests/:rmaId/inspections',
  authorize(UserRole.RMA, UserRole.ADMIN, UserRole.SUPERVISOR),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { rmaId } = req.params;
    const inspections = await rmaService.getInspections(rmaId);
    res.json({ inspections, count: inspections.length });
  })
);

// ============================================================================
// RESOLUTIONS
// ============================================================================

/**
 * POST /api/rma/requests/:rmaId/refund
 * Process refund for RMA
 * Access: Users with PROCESS_RMA permission
 */
router.post(
  '/requests/:rmaId/refund',
  authorize(UserRole.RMA, UserRole.ADMIN, UserRole.SUPERVISOR),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { rmaId } = req.params;
    const rma = await rmaService.processRefund(rmaId, req.body, req.user!.userId);
    res.json(rma);
  })
);

/**
 * POST /api/rma/requests/:rmaId/replacement
 * Send replacement for RMA
 * Access: Users with PROCESS_RMA permission
 */
router.post(
  '/requests/:rmaId/replacement',
  authorize(UserRole.RMA, UserRole.ADMIN, UserRole.SUPERVISOR),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { rmaId } = req.params;
    const rma = await rmaService.sendReplacement(rmaId, req.body, req.user!.userId);
    res.json(rma);
  })
);

// ============================================================================
// COMMUNICATIONS
// ============================================================================

/**
 * POST /api/rma/requests/:rmaId/communications
 * Add a communication record
 * Access: Users with PROCESS_RMA permission
 */
router.post(
  '/requests/:rmaId/communications',
  authorize(UserRole.RMA, UserRole.ADMIN, UserRole.SUPERVISOR),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { rmaId } = req.params;
    const { type, direction, content, subject } = req.body;

    await rmaService.addCommunication(rmaId, type, direction, content, req.user!.userId, subject);

    res.status(201).json({ message: 'Communication added' });
  })
);

/**
 * GET /api/rma/requests/:rmaId/communications
 * Get communication history for an RMA
 * Access: Users with VIEW_RMA_REQUESTS permission
 */
router.get(
  '/requests/:rmaId/communications',
  authorize(UserRole.RMA, UserRole.ADMIN, UserRole.SUPERVISOR),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { rmaId } = req.params;
    const communications = await rmaService.getCommunications(rmaId);
    res.json({ communications, count: communications.length });
  })
);

// ============================================================================
// ACTIVITY LOG
// ============================================================================

/**
 * GET /api/rma/requests/:rmaId/activity
 * Get activity log for an RMA
 * Access: Users with VIEW_RMA_REQUESTS permission
 */
router.get(
  '/requests/:rmaId/activity',
  authorize(UserRole.RMA, UserRole.ADMIN, UserRole.SUPERVISOR),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { rmaId } = req.params;
    const { limit } = req.query;
    const activity = await rmaService.getActivityLog(rmaId, limit ? parseInt(limit as string) : 50);
    res.json({ activity, count: activity.length });
  })
);

export default router;
