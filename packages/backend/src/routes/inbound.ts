/**
 * Inbound Receiving routes
 *
 * Endpoints for managing Advance Shipping Notices (ASN), receipts, and putaway tasks
 */

import { Router } from 'express';
import { inboundReceivingService } from '../services/InboundReceivingService';
import { asyncHandler, authenticate, authorize } from '../middleware';
import { AuthenticatedRequest } from '../middleware/auth';
import { UserRole, ASNStatus, ReceiptStatus, PutawayStatus } from '@opsui/shared';

const router = Router();

// All inbound routes require authentication
router.use(authenticate);

// ============================================================================
// DASHBOARD ROUTES
// ============================================================================

/**
 * GET /api/inbound/dashboard
 * Get inwards goods dashboard metrics
 */
router.get(
  '/dashboard',
  authorize('INWARDS' as UserRole, UserRole.SUPERVISOR, UserRole.ADMIN),
  asyncHandler(async (_req: AuthenticatedRequest, res) => {
    const dashboard = await inboundReceivingService.getDashboardMetrics();
    res.json(dashboard);
  })
);

// ============================================================================
// ASN ROUTES
// ============================================================================

/**
 * POST /api/inbound/asn
 * Create a new Advance Shipping Notice
 */
router.post(
  '/asn',
  authorize('INWARDS' as UserRole, UserRole.SUPERVISOR, UserRole.ADMIN),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const {
      supplierId,
      purchaseOrderNumber,
      expectedArrivalDate,
      carrier,
      trackingNumber,
      shipmentNotes,
      lineItems,
    } = req.body;

    // Validate required fields
    if (
      !supplierId ||
      !purchaseOrderNumber ||
      !expectedArrivalDate ||
      !lineItems ||
      lineItems.length === 0
    ) {
      res.status(400).json({
        error: 'Missing required fields',
        code: 'MISSING_FIELDS',
      });
      return;
    }

    const asn = await inboundReceivingService.createASN({
      supplierId,
      purchaseOrderNumber,
      expectedArrivalDate: new Date(expectedArrivalDate),
      carrier,
      trackingNumber,
      shipmentNotes,
      createdBy: req.user!.userId,
      lineItems,
    });

    res.status(201).json(asn);
    return;
  })
);

/**
 * GET /api/inbound/asn
 * Get all ASNs with optional filters
 */
router.get(
  '/asn',
  authorize('INWARDS' as UserRole, UserRole.SUPERVISOR, UserRole.ADMIN),
  asyncHandler(async (_req: AuthenticatedRequest, res) => {
    const filters = {
      status: _req.query.status as ASNStatus | undefined,
      supplierId: _req.query.supplierId as string | undefined,
      limit: _req.query.limit ? parseInt(_req.query.limit as string) : 50,
      offset: _req.query.offset ? parseInt(_req.query.offset as string) : 0,
    };

    const result = await inboundReceivingService.getAllASNs(filters);
    res.json(result);
    return;
  })
);

/**
 * GET /api/inbound/asn/:asnId
 * Get a specific ASN by ID
 */
router.get(
  '/asn/:asnId',
  authorize('INWARDS' as UserRole, UserRole.SUPERVISOR, UserRole.ADMIN),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { asnId } = req.params;
    const asn = await inboundReceivingService.getASN(asnId);
    res.json(asn);
    return;
  })
);

/**
 * PATCH /api/inbound/asn/:asnId/status
 * Update ASN status
 */
router.patch(
  '/asn/:asnId/status',
  authorize('INWARDS' as UserRole, UserRole.SUPERVISOR, UserRole.ADMIN),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { asnId } = req.params;
    const { status } = req.body;

    if (!status) {
      res.status(400).json({
        error: 'Status is required',
        code: 'MISSING_STATUS',
      });
      return;
    }

    const asn = await inboundReceivingService.updateASNStatus(asnId, status);
    res.json(asn);
    return;
  })
);

// ============================================================================
// RECEIPT ROUTES
// ============================================================================

/**
 * POST /api/inbound/receipts
 * Create a new receipt
 */
router.post(
  '/receipts',
  authorize('INWARDS' as UserRole, UserRole.STOCK_CONTROLLER, UserRole.SUPERVISOR, UserRole.ADMIN),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { asnId, receiptType, lineItems } = req.body;

    // Validate required fields
    if (!receiptType || !lineItems || lineItems.length === 0) {
      res.status(400).json({
        error: 'Missing required fields',
        code: 'MISSING_FIELDS',
      });
      return;
    }

    const receipt = await inboundReceivingService.createReceipt({
      asnId,
      receiptType,
      receivedBy: req.user!.userId,
      lineItems,
    });

    res.status(201).json(receipt);
    return;
  })
);

/**
 * GET /api/inbound/receipts
 * Get all receipts with optional filters
 */
router.get(
  '/receipts',
  authorize('INWARDS' as UserRole, UserRole.SUPERVISOR, UserRole.ADMIN, UserRole.STOCK_CONTROLLER),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const filters = {
      status: req.query.status as ReceiptStatus | undefined,
      asnId: req.query.asnId as string | undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string) : 50,
      offset: req.query.offset ? parseInt(req.query.offset as string) : 0,
    };

    const result = await inboundReceivingService.getAllReceipts(filters);
    res.json(result);
    return;
  })
);

/**
 * GET /api/inbound/receipts/:receiptId
 * Get a specific receipt by ID
 */
router.get(
  '/receipts/:receiptId',
  authorize('INWARDS' as UserRole, UserRole.SUPERVISOR, UserRole.ADMIN, UserRole.STOCK_CONTROLLER),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { receiptId } = req.params;
    const receipt = await inboundReceivingService.getReceipt(receiptId);
    res.json(receipt);
    return;
  })
);

// ============================================================================
// PUTAWAY ROUTES
// ============================================================================

/**
 * GET /api/inbound/putaway
 * Get putaway tasks with optional filters
 */
router.get(
  '/putaway',
  authorize('INWARDS' as UserRole, UserRole.STOCK_CONTROLLER, UserRole.SUPERVISOR, UserRole.ADMIN),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const filters = {
      status: req.query.status as PutawayStatus | undefined,
      assignedTo: req.query.assignedTo as string | undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string) : 50,
      offset: req.query.offset ? parseInt(req.query.offset as string) : 0,
    };

    const result = await inboundReceivingService.getPutawayTasks(filters);
    res.json(result);
    return;
  })
);

/**
 * POST /api/inbound/putaway/:putawayTaskId/assign
 * Assign putaway task to user
 */
router.post(
  '/putaway/:putawayTaskId/assign',
  authorize('INWARDS' as UserRole, UserRole.STOCK_CONTROLLER, UserRole.SUPERVISOR, UserRole.ADMIN),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { putawayTaskId } = req.params;

    const task = await inboundReceivingService.assignPutawayTask(putawayTaskId, req.user!.userId);

    res.json(task);
    return;
  })
);

/**
 * PATCH /api/inbound/putaway/:putawayTaskId
 * Update putaway task (complete or partial putaway)
 */
router.patch(
  '/putaway/:putawayTaskId',
  authorize('INWARDS' as UserRole, UserRole.STOCK_CONTROLLER, UserRole.SUPERVISOR, UserRole.ADMIN),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { putawayTaskId } = req.params;
    const { quantityPutaway, status } = req.body;

    if (quantityPutaway === undefined || quantityPutaway <= 0) {
      res.status(400).json({
        error: 'Valid quantityPutaway is required',
        code: 'INVALID_QUANTITY',
      });
      return;
    }

    const task = await inboundReceivingService.updatePutawayTask({
      putawayTaskId,
      quantityPutaway: parseInt(quantityPutaway),
      userId: req.user!.userId,
      status,
    });

    res.json(task);
    return;
  })
);

export default router;
