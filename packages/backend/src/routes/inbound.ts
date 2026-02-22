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
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const filters = {
      status: req.query.status as ASNStatus | undefined,
      supplierId: req.query.supplierId as string | undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string) : 50,
      offset: req.query.offset ? parseInt(req.query.offset as string) : 0,
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

// ============================================================================
// LICENSE PLATE ROUTES
// ============================================================================

/**
 * GET /api/inbound/license-plates
 * Get all license plates with optional filters
 */
router.get(
  '/license-plates',
  authorize('INWARDS' as UserRole, UserRole.SUPERVISOR, UserRole.ADMIN, UserRole.STOCK_CONTROLLER),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const filters = {
      status: req.query.status as string | undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string) : 50,
      offset: req.query.offset ? parseInt(req.query.offset as string) : 0,
    };

    const result = await inboundReceivingService.getLicensePlates(filters);
    res.json(result);
    return;
  })
);

/**
 * GET /api/inbound/license-plates/:licensePlateId
 * Get a specific license plate by ID
 */
router.get(
  '/license-plates/:licensePlateId',
  authorize('INWARDS' as UserRole, UserRole.SUPERVISOR, UserRole.ADMIN, UserRole.STOCK_CONTROLLER),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { licensePlateId } = req.params;
    const licensePlate = await inboundReceivingService.getLicensePlate(licensePlateId);
    res.json(licensePlate);
    return;
  })
);

/**
 * GET /api/inbound/license-plates/barcode/:barcode
 * Get a license plate by barcode
 */
router.get(
  '/license-plates/barcode/:barcode',
  authorize('INWARDS' as UserRole, UserRole.SUPERVISOR, UserRole.ADMIN, UserRole.STOCK_CONTROLLER),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { barcode } = req.params;
    const licensePlate = await inboundReceivingService.getLicensePlateByBarcode(barcode);
    res.json(licensePlate);
    return;
  })
);

/**
 * POST /api/inbound/license-plates
 * Create a new license plate
 */
router.post(
  '/license-plates',
  authorize('INWARDS' as UserRole, UserRole.SUPERVISOR, UserRole.ADMIN),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const licensePlate = await inboundReceivingService.createLicensePlate({
      ...req.body,
      createdBy: req.user!.userId,
    });
    res.status(201).json(licensePlate);
    return;
  })
);

/**
 * POST /api/inbound/license-plates/:licensePlateId/seal
 * Seal a license plate
 */
router.post(
  '/license-plates/:licensePlateId/seal',
  authorize('INWARDS' as UserRole, UserRole.SUPERVISOR, UserRole.ADMIN),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { licensePlateId } = req.params;
    const licensePlate = await inboundReceivingService.sealLicensePlate(licensePlateId);
    res.json(licensePlate);
    return;
  })
);

/**
 * PATCH /api/inbound/license-plates/:licensePlateId/status
 * Update license plate status
 */
router.patch(
  '/license-plates/:licensePlateId/status',
  authorize('INWARDS' as UserRole, UserRole.SUPERVISOR, UserRole.ADMIN),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { licensePlateId } = req.params;
    const { status } = req.body;

    if (!status) {
      res.status(400).json({
        error: 'Status is required',
        code: 'MISSING_STATUS',
      });
      return;
    }

    const licensePlate = await inboundReceivingService.updateLicensePlateStatus(
      licensePlateId,
      status
    );
    res.json(licensePlate);
    return;
  })
);

/**
 * GET /api/inbound/license-plates/suggest-staging/:sku
 * Get suggested staging location for SKU
 */
router.get(
  '/license-plates/suggest-staging/:sku',
  authorize('INWARDS' as UserRole, UserRole.SUPERVISOR, UserRole.ADMIN, UserRole.STOCK_CONTROLLER),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { sku } = req.params;
    const suggestions = await inboundReceivingService.getSuggestedStaging(sku);
    res.json(suggestions);
    return;
  })
);

// ============================================================================
// STAGING LOCATION ROUTES
// ============================================================================

/**
 * GET /api/inbound/staging-locations
 * Get all staging locations with optional filters
 */
router.get(
  '/staging-locations',
  authorize('INWARDS' as UserRole, UserRole.SUPERVISOR, UserRole.ADMIN, UserRole.STOCK_CONTROLLER),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const filters = {
      zone: req.query.zone as string | undefined,
      status: req.query.status as string | undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string) : 50,
      offset: req.query.offset ? parseInt(req.query.offset as string) : 0,
    };

    const result = await inboundReceivingService.getStagingLocations(filters);
    res.json(result);
    return;
  })
);

/**
 * GET /api/inbound/staging-locations/:stagingLocationId
 * Get a specific staging location by ID
 */
router.get(
  '/staging-locations/:stagingLocationId',
  authorize('INWARDS' as UserRole, UserRole.SUPERVISOR, UserRole.ADMIN, UserRole.STOCK_CONTROLLER),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { stagingLocationId } = req.params;
    const stagingLocation = await inboundReceivingService.getStagingLocation(stagingLocationId);
    res.json(stagingLocation);
    return;
  })
);

/**
 * POST /api/inbound/staging-locations/assign
 * Assign a license plate to a staging location
 */
router.post(
  '/staging-locations/assign',
  authorize('INWARDS' as UserRole, UserRole.SUPERVISOR, UserRole.ADMIN),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { licensePlateId, stagingLocationId } = req.body;

    if (!licensePlateId || !stagingLocationId) {
      res.status(400).json({
        error: 'licensePlateId and stagingLocationId are required',
        code: 'MISSING_FIELDS',
      });
      return;
    }

    const result = await inboundReceivingService.assignToStagingLocation({
      licensePlateId,
      stagingLocationId,
      userId: req.user!.userId,
    });
    res.json(result);
    return;
  })
);

/**
 * POST /api/inbound/staging-locations/release/:licensePlateId
 * Release a license plate from staging
 */
router.post(
  '/staging-locations/release/:licensePlateId',
  authorize('INWARDS' as UserRole, UserRole.SUPERVISOR, UserRole.ADMIN),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { licensePlateId } = req.params;
    const result = await inboundReceivingService.releaseFromStaging(licensePlateId);
    res.json(result);
    return;
  })
);

/**
 * GET /api/inbound/staging-locations/:stagingLocationId/contents
 * Get contents of a staging location
 */
router.get(
  '/staging-locations/:stagingLocationId/contents',
  authorize('INWARDS' as UserRole, UserRole.SUPERVISOR, UserRole.ADMIN, UserRole.STOCK_CONTROLLER),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { stagingLocationId } = req.params;
    const contents = await inboundReceivingService.getStagingLocationContents(stagingLocationId);
    res.json(contents);
    return;
  })
);

// ============================================================================
// RECEIVING EXCEPTION ROUTES
// ============================================================================

/**
 * GET /api/inbound/exceptions
 * Get all receiving exceptions with optional filters
 */
router.get(
  '/exceptions',
  authorize('INWARDS' as UserRole, UserRole.SUPERVISOR, UserRole.ADMIN, UserRole.STOCK_CONTROLLER),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const filters = {
      status: req.query.status as string | undefined,
      exceptionType: req.query.exceptionType as string | undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string) : 50,
      offset: req.query.offset ? parseInt(req.query.offset as string) : 0,
    };

    const result = await inboundReceivingService.getReceivingExceptions(filters);
    res.json(result);
    return;
  })
);

/**
 * GET /api/inbound/exceptions/:exceptionId
 * Get a specific receiving exception by ID
 */
router.get(
  '/exceptions/:exceptionId',
  authorize('INWARDS' as UserRole, UserRole.SUPERVISOR, UserRole.ADMIN, UserRole.STOCK_CONTROLLER),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { exceptionId } = req.params;
    const exception = await inboundReceivingService.getReceivingException(exceptionId);
    res.json(exception);
    return;
  })
);

/**
 * POST /api/inbound/exceptions
 * Create a new receiving exception
 */
router.post(
  '/exceptions',
  authorize('INWARDS' as UserRole, UserRole.SUPERVISOR, UserRole.ADMIN),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const exception = await inboundReceivingService.createReceivingException({
      ...req.body,
      createdBy: req.user!.userId,
    });
    res.status(201).json(exception);
    return;
  })
);

/**
 * PATCH /api/inbound/exceptions/:exceptionId/status
 * Update exception status
 */
router.patch(
  '/exceptions/:exceptionId/status',
  authorize('INWARDS' as UserRole, UserRole.SUPERVISOR, UserRole.ADMIN),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { exceptionId } = req.params;
    const { status } = req.body;

    if (!status) {
      res.status(400).json({
        error: 'Status is required',
        code: 'MISSING_STATUS',
      });
      return;
    }

    const exception = await inboundReceivingService.updateReceivingExceptionStatus(
      exceptionId,
      status
    );
    res.json(exception);
    return;
  })
);

/**
 * POST /api/inbound/exceptions/:exceptionId/resolve
 * Resolve a receiving exception
 */
router.post(
  '/exceptions/:exceptionId/resolve',
  authorize('INWARDS' as UserRole, UserRole.SUPERVISOR, UserRole.ADMIN),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { exceptionId } = req.params;
    const { resolution, resolutionNotes } = req.body;

    if (!resolution) {
      res.status(400).json({
        error: 'Resolution is required',
        code: 'MISSING_RESOLUTION',
      });
      return;
    }

    const exception = await inboundReceivingService.resolveReceivingException({
      exceptionId,
      resolution,
      resolutionNotes,
      resolvedBy: req.user!.userId,
    });
    res.json(exception);
    return;
  })
);

export default router;
