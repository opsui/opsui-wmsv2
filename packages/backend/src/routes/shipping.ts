/**
 * Shipping routes
 *
 * Endpoints for managing carriers, shipments, labels, and tracking
 */

import { Router } from 'express';
import { shippingService } from '../services/ShippingService';
import { asyncHandler, authenticate, authorize } from '../middleware';
import { AuthenticatedRequest } from '../middleware/auth';
import { UserRole, ShipmentStatus } from '@opsui/shared';

const router = Router();

// All shipping routes require authentication
router.use(authenticate);

// ============================================================================
// CARRIER ROUTES
// ============================================================================

/**
 * GET /api/shipping/carriers
 * Get all active carriers
 */
router.get(
  '/carriers',
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const carriers = await shippingService.getActiveCarriers();
    res.json(carriers);
  })
);

/**
 * GET /api/shipping/carriers/:carrierId
 * Get a specific carrier by ID
 */
router.get(
  '/carriers/:carrierId',
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { carrierId } = req.params;
    const carrier = await shippingService.getCarrier(carrierId);
    res.json(carrier);
  })
);

// ============================================================================
// SHIPMENT ROUTES
// ============================================================================

/**
 * POST /api/shipping/shipments
 * Create a new shipment
 */
router.post(
  '/shipments',
  authorize(UserRole.SUPERVISOR, UserRole.ADMIN),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const {
      orderId,
      carrierId,
      serviceType,
      shippingMethod,
      shipFromAddress,
      shipToAddress,
      totalWeight,
      totalPackages,
      dimensions,
      insuranceValue,
      shipDate,
    } = req.body;

    // Validate required fields
    if (
      !orderId ||
      !carrierId ||
      !serviceType ||
      !shippingMethod ||
      !shipFromAddress ||
      !shipToAddress ||
      !totalWeight ||
      !totalPackages
    ) {
      res.status(400).json({
        error: 'Missing required fields',
        code: 'MISSING_FIELDS',
      });
      return;
    }

    const shipment = await shippingService.createShipment({
      orderId,
      carrierId,
      serviceType,
      shippingMethod,
      shipFromAddress,
      shipToAddress,
      totalWeight,
      totalPackages,
      dimensions,
      insuranceValue,
      shipDate: shipDate ? new Date(shipDate) : undefined,
      createdBy: req.user!.userId,
    });

    res.status(201).json(shipment);
  })
);

/**
 * GET /api/shipping/shipments
 * Get all shipments with optional filters
 */
router.get(
  '/shipments',
  authorize(UserRole.SUPERVISOR, UserRole.ADMIN),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const filters = {
      status: req.query.status as ShipmentStatus | undefined,
      carrierId: req.query.carrierId as string | undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string) : 50,
      offset: req.query.offset ? parseInt(req.query.offset as string) : 0,
    };

    const result = await shippingService.getAllShipments(filters);
    res.json(result);
  })
);

/**
 * GET /api/shipping/shipments/:shipmentId
 * Get a specific shipment by ID
 */
router.get(
  '/shipments/:shipmentId',
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { shipmentId } = req.params;
    const shipment = await shippingService.getShipment(shipmentId);
    res.json(shipment);
  })
);

/**
 * GET /api/shipping/orders/:orderId/shipment
 * Get shipment by order ID
 */
router.get(
  '/orders/:orderId/shipment',
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { orderId } = req.params;
    const shipment = await shippingService.getShipmentByOrderId(orderId);

    if (!shipment) {
      res.status(404).json({
        error: 'Shipment not found for this order',
        code: 'SHIPMENT_NOT_FOUND',
      });
      return;
    }

    res.json(shipment);
  })
);

/**
 * PATCH /api/shipping/shipments/:shipmentId/status
 * Update shipment status
 */
router.patch(
  '/shipments/:shipmentId/status',
  authorize(UserRole.SUPERVISOR, UserRole.ADMIN),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { shipmentId } = req.params;
    const { status } = req.body;

    if (!status) {
      res.status(400).json({
        error: 'Status is required',
        code: 'MISSING_STATUS',
      });
      return;
    }

    const shipment = await shippingService.updateShipmentStatus(
      shipmentId,
      status,
      req.user!.userId
    );

    res.json(shipment);
  })
);

/**
 * POST /api/shipping/shipments/:shipmentId/tracking
 * Add tracking number to shipment
 */
router.post(
  '/shipments/:shipmentId/tracking',
  authorize(UserRole.SUPERVISOR, UserRole.ADMIN),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { shipmentId } = req.params;
    const { trackingNumber, trackingUrl } = req.body;

    if (!trackingNumber) {
      res.status(400).json({
        error: 'trackingNumber is required',
        code: 'MISSING_TRACKING_NUMBER',
      });
      return;
    }

    const shipment = await shippingService.addTrackingNumber(
      shipmentId,
      trackingNumber,
      trackingUrl
    );

    res.json(shipment);
  })
);

// ============================================================================
// SHIPPING LABEL ROUTES
// ============================================================================

/**
 * POST /api/shipping/labels
 * Create a shipping label
 */
router.post(
  '/labels',
  authorize(UserRole.SUPERVISOR, UserRole.ADMIN),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { shipmentId, packageNumber, packageWeight, packageDimensions } = req.body;

    // Validate required fields
    if (!shipmentId || !packageNumber || !packageWeight) {
      res.status(400).json({
        error: 'Missing required fields',
        code: 'MISSING_FIELDS',
      });
      return;
    }

    const label = await shippingService.createShippingLabel({
      shipmentId,
      packageNumber: parseInt(packageNumber),
      packageWeight: parseFloat(packageWeight),
      packageDimensions,
      createdBy: req.user!.userId,
    });

    res.status(201).json(label);
  })
);

/**
 * POST /api/shipping/labels/:labelId/print
 * Mark label as printed
 */
router.post(
  '/labels/:labelId/print',
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { labelId } = req.params;
    const label = await shippingService.markLabelPrinted(labelId);
    res.json(label);
  })
);

// ============================================================================
// TRACKING EVENT ROUTES
// ============================================================================

/**
 * GET /api/shipping/shipments/:shipmentId/tracking/events
 * Get tracking events for shipment
 */
router.get(
  '/shipments/:shipmentId/tracking/events',
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { shipmentId } = req.params;
    const events = await shippingService.getTrackingEvents(shipmentId);
    res.json(events);
  })
);

/**
 * POST /api/shipping/tracking/events
 * Add tracking event (for webhooks or manual entry)
 */
router.post(
  '/tracking/events',
  authorize(UserRole.SUPERVISOR, UserRole.ADMIN),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const {
      shipmentId,
      eventCode,
      eventDescription,
      eventLocation,
      eventDate,
      eventSource,
      rawEventData,
    } = req.body;

    // Validate required fields
    if (!shipmentId || !eventCode || !eventDescription || !eventDate) {
      res.status(400).json({
        error: 'Missing required fields',
        code: 'MISSING_FIELDS',
      });
      return;
    }

    const event = await shippingService.addTrackingEvent({
      shipmentId,
      eventCode,
      eventDescription,
      eventLocation,
      eventDate: new Date(eventDate),
      eventSource: eventSource || 'MANUAL',
      rawEventData,
    });

    res.status(201).json(event);
  })
);

export default router;
