/**
 * Purchasing API Routes
 *
 * REST API for purchasing operations
 * Handles purchase requisitions, RFQs, purchase orders, receipts,
 * three-way matching, vendor catalogs, and vendor performance
 */

import { Router } from 'express';
import { purchasingService } from '../services/PurchasingService';
import { asyncHandler, authenticate, authorize } from '../middleware';
import { AuthenticatedRequest } from '../middleware/auth';
import { UserRole } from '@opsui/shared';
import type {
  RequisitionStatus,
  RFQStatus,
  PurchaseOrderStatus,
} from '@opsui/shared';

const router = Router();

// All purchasing routes require authentication
router.use(authenticate);

// Purchasing management requires Admin, Supervisor, or Sales access
const purchasingAuth = authorize(UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.SALES);

// Requisition approval can be done by approvers
const approvalAuth = authorize(UserRole.ADMIN, UserRole.SUPERVISOR);

// Vendor management
const vendorAuth = authorize(UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.SALES);

// Receiving/Receipt operations
const receivingAuth = authorize(UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.INWARDS);

// Three-way matching and accounting
const matchingAuth = authorize(UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.ACCOUNTING);

// Analytics and reporting
const analyticsAuth = authorize(
  UserRole.ADMIN,
  UserRole.SUPERVISOR,
  UserRole.SALES,
  UserRole.ACCOUNTING
);

// ============================================================================
// DASHBOARD METRICS
// ============================================================================

/**
 * GET /api/purchasing/dashboard
 * Get purchasing dashboard metrics
 */
router.get(
  '/dashboard',
  analyticsAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const entityId = req.query.entity_id as string | undefined;
    const metrics = await purchasingService.getDashboardMetrics(entityId);
    res.json(metrics);
  })
);

// ============================================================================
// PURCHASE REQUISITIONS
// ============================================================================

/**
 * GET /api/purchasing/requisitions
 * Get all purchase requisitions with optional filters
 * Query params: entity_id, requested_by, department, approval_status, date_from, date_to, job_number, search
 */
router.get(
  '/requisitions',
  purchasingAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const filters: any = {
      entity_id: req.query.entity_id as string | undefined,
      requested_by: req.query.requested_by as string | undefined,
      department: req.query.department as string | undefined,
      approval_status: req.query.approval_status as RequisitionStatus | undefined,
      date_from: req.query.date_from ? new Date(req.query.date_from as string) : undefined,
      date_to: req.query.date_to ? new Date(req.query.date_to as string) : undefined,
      required_by_from: req.query.required_by_from
        ? new Date(req.query.required_by_from as string)
        : undefined,
      required_by_to: req.query.required_by_to
        ? new Date(req.query.required_by_to as string)
        : undefined,
      job_number: req.query.job_number as string | undefined,
      search: req.query.search as string | undefined,
    };

    const requisitions = await purchasingService.queryRequisitions(filters);
    res.json(requisitions);
  })
);

/**
 * GET /api/purchasing/requisitions/pending
 * Get requisitions pending approval
 */
router.get(
  '/requisitions/pending',
  approvalAuth,
  asyncHandler(async (_req: AuthenticatedRequest, res) => {
    const requisitions = await purchasingService.getPendingApprovals();
    res.json(requisitions);
  })
);

/**
 * GET /api/purchasing/requisitions/:id
 * Get requisition with details
 */
router.get(
  '/requisitions/:id',
  purchasingAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const requisition = await purchasingService.getRequisitionWithDetails(req.params.id);
    if (!requisition) {
      res.status(404).json({ error: 'Requisition not found' });
      return;
    }
    res.json(requisition);
  })
);

/**
 * POST /api/purchasing/requisitions
 * Create a new purchase requisition
 */
router.post(
  '/requisitions',
  purchasingAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const dto = {
      ...req.body,
      requested_by: req.user!.userId,
    };
    const requisition = await purchasingService.createRequisition(dto);
    res.status(201).json(requisition);
  })
);

/**
 * PUT /api/purchasing/requisitions/:id/submit
 * Submit requisition for approval
 */
router.put(
  '/requisitions/:id/submit',
  purchasingAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const requisition = await purchasingService.submitRequisition(req.params.id);
    res.json(requisition);
  })
);

/**
 * POST /api/purchasing/requisitions/:id/approve
 * Approve or reject requisition
 */
router.post(
  '/requisitions/:id/approve',
  approvalAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const dto = {
      requisition_id: req.params.id,
      approval_status: req.body.approval_status,
      rejection_reason: req.body.rejection_reason,
    };
    const requisition = await purchasingService.processRequisitionApproval(dto);
    res.json(requisition);
  })
);

/**
 * POST /api/purchasing/requisitions/:id/convert-to-po
 * Convert requisition to purchase order
 */
router.post(
  '/requisitions/:id/convert-to-po',
  purchasingAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const dto = {
      requisition_id: req.params.id,
      ...req.body,
    };
    const po = await purchasingService.convertRequisitionToPO(dto);
    res.status(201).json(po);
  })
);

// ============================================================================
// RFQ MANAGEMENT
// ============================================================================

/**
 * GET /api/purchasing/rfqs
 * Get all RFQs with optional filters
 * Query params: entity_id, rfq_status, created_by, date_from, date_to, due_date_from, due_date_to, source_type, source_id, vendor_id, search
 */
router.get(
  '/rfqs',
  purchasingAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    // Would implement queryWithFilters in service
    const filters: any = {
      entity_id: req.query.entity_id as string | undefined,
      rfq_status: req.query.rfq_status as RFQStatus | undefined,
      created_by: req.query.created_by as string | undefined,
      date_from: req.query.date_from ? new Date(req.query.date_from as string) : undefined,
      date_to: req.query.date_to ? new Date(req.query.date_to as string) : undefined,
      due_date_from: req.query.due_date_from
        ? new Date(req.query.due_date_from as string)
        : undefined,
      due_date_to: req.query.due_date_to ? new Date(req.query.due_date_to as string) : undefined,
      source_type: req.query.source_type as string | undefined,
      source_id: req.query.source_id as string | undefined,
      vendor_id: req.query.vendor_id as string | undefined,
      search: req.query.search as string | undefined,
    };

    // Placeholder - would implement RFQ query
    res.json({ message: 'RFQ query endpoint', filters });
  })
);

/**
 * GET /api/purchasing/rfqs/pending
 * Get RFQs awaiting vendor response
 */
router.get(
  '/rfqs/pending',
  purchasingAuth,
  asyncHandler(async (_req: AuthenticatedRequest, res) => {
    const rfqs = await purchasingService.getRFQsAwaitingResponse();
    res.json(rfqs);
  })
);

/**
 * GET /api/purchasing/rfqs/:id
 * Get RFQ with details
 */
router.get(
  '/rfqs/:id',
  purchasingAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const rfq = await purchasingService.getRFQWithDetails(req.params.id);
    if (!rfq) {
      res.status(404).json({ error: 'RFQ not found' });
      return;
    }
    res.json(rfq);
  })
);

/**
 * POST /api/purchasing/rfqs
 * Create a new RFQ
 */
router.post(
  '/rfqs',
  purchasingAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const rfq = await purchasingService.createRFQ(req.body);
    res.status(201).json(rfq);
  })
);

/**
 * PUT /api/purchasing/rfqs/:id/send
 * Send RFQ to vendors
 */
router.put(
  '/rfqs/:id/send',
  purchasingAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const rfq = await purchasingService.sendRFQ(req.params.id);
    res.json(rfq);
  })
);

/**
 * POST /api/purchasing/rfqs/:rfq_vendor_id/response
 * Record vendor response to RFQ
 */
router.post(
  '/rfqs/:rfq_vendor_id/response',
  purchasingAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const response = await purchasingService.recordVendorResponse(
      req.params.rfq_vendor_id,
      req.body
    );
    res.status(201).json(response);
  })
);

/**
 * POST /api/purchasing/rfqs/:id/award
 * Award RFQ to vendor
 */
router.post(
  '/rfqs/:id/award',
  purchasingAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const dto = {
      rfq_id: req.params.id,
      ...req.body,
    };
    const result = await purchasingService.awardRFQ(dto);
    res.json(result);
  })
);

// ============================================================================
// VENDOR CATALOGS
// ============================================================================

/**
 * GET /api/purchasing/vendor-catalogs/:vendor_id
 * Get vendor catalog
 */
router.get(
  '/vendor-catalogs/:vendor_id',
  vendorAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const activeOnly = req.query.active !== 'false';
    const catalog = await purchasingService.getVendorCatalog(req.params.vendor_id, activeOnly);
    res.json(catalog);
  })
);

/**
 * GET /api/purchasing/vendor-catalogs/sku/:sku
 * Find vendors for SKU
 */
router.get(
  '/vendor-catalogs/sku/:sku',
  vendorAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const vendors = await purchasingService.findVendorsForSKU(req.params.sku);
    res.json(vendors);
  })
);

/**
 * POST /api/purchasing/vendor-catalogs
 * Add item to vendor catalog
 */
router.post(
  '/vendor-catalogs',
  vendorAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const item = await purchasingService.addVendorCatalogItem(req.body);
    res.status(201).json(item);
  })
);

// ============================================================================
// PURCHASE ORDERS
// ============================================================================

/**
 * GET /api/purchasing/purchase-orders
 * Get all purchase orders with optional filters
 * Query params: entity_id, vendor_id, po_status, three_way_match_status, date_from, date_to, source_type, source_id, created_by, search
 */
router.get(
  '/purchase-orders',
  purchasingAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const filters: any = {
      entity_id: req.query.entity_id as string | undefined,
      vendor_id: req.query.vendor_id as string | undefined,
      po_status: req.query.po_status as PurchaseOrderStatus | undefined,
      three_way_match_status: req.query.three_way_match_status as string | undefined,
      date_from: req.query.date_from ? new Date(req.query.date_from as string) : undefined,
      date_to: req.query.date_to ? new Date(req.query.date_to as string) : undefined,
      source_type: req.query.source_type as string | undefined,
      source_id: req.query.source_id as string | undefined,
      created_by: req.query.created_by as string | undefined,
      search: req.query.search as string | undefined,
    };

    // Placeholder - would implement PO query
    res.json({ message: 'Purchase Order query endpoint', filters });
  })
);

/**
 * GET /api/purchasing/purchase-orders/open
 * Get open purchase orders
 */
router.get(
  '/purchase-orders/open',
  purchasingAuth,
  asyncHandler(async (_req: AuthenticatedRequest, res) => {
    const orders = await purchasingService.getOpenPurchaseOrders();
    res.json(orders);
  })
);

/**
 * GET /api/purchasing/purchase-orders/:id
 * Get purchase order with details
 */
router.get(
  '/purchase-orders/:id',
  purchasingAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const po = await purchasingService.getPurchaseOrderWithDetails(req.params.id);
    if (!po) {
      res.status(404).json({ error: 'Purchase Order not found' });
      return;
    }
    res.json(po);
  })
);

/**
 * POST /api/purchasing/purchase-orders
 * Create a new purchase order
 */
router.post(
  '/purchase-orders',
  purchasingAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const dto = {
      ...req.body,
      created_by: req.user!.userId,
    };
    const po = await purchasingService.createPurchaseOrder(dto);
    res.status(201).json(po);
  })
);

/**
 * PUT /api/purchasing/purchase-orders/:id/submit
 * Submit PO for approval
 */
router.put(
  '/purchase-orders/:id/submit',
  purchasingAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const po = await purchasingService.submitPurchaseOrder(req.params.id);
    res.json(po);
  })
);

/**
 * PUT /api/purchasing/purchase-orders/:id/approve
 * Approve PO
 */
router.put(
  '/purchase-orders/:id/approve',
  approvalAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const po = await purchasingService.approvePurchaseOrder(req.params.id, req.user!.userId);
    res.json(po);
  })
);

// ============================================================================
// PURCHASE RECEIPTS
// ============================================================================

/**
 * GET /api/purchasing/receipts
 * Get all purchase receipts with optional filters
 * Query params: po_id, vendor_id, date_from, date_to, status
 */
router.get(
  '/receipts',
  receivingAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    // Placeholder - would implement receipt query
    const filters: any = {
      po_id: req.query.po_id as string | undefined,
      vendor_id: req.query.vendor_id as string | undefined,
      date_from: req.query.date_from ? new Date(req.query.date_from as string) : undefined,
      date_to: req.query.date_to ? new Date(req.query.date_to as string) : undefined,
      status: req.query.status as string | undefined,
    };
    res.json({ message: 'Receipt query endpoint', filters });
  })
);

/**
 * GET /api/purchasing/receipts/open
 * Get open receipts (not fully put away)
 */
router.get(
  '/receipts/open',
  receivingAuth,
  asyncHandler(async (_req: AuthenticatedRequest, res) => {
    // Would need to implement in service
    res.json({ message: 'Open receipts endpoint' });
  })
);

/**
 * GET /api/purchasing/receipts/:id
 * Get receipt with details
 */
router.get(
  '/receipts/:id',
  receivingAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const receipt = await purchasingService.getReceiptWithDetails(req.params.id);
    if (!receipt) {
      res.status(404).json({ error: 'Receipt not found' });
      return;
    }
    res.json(receipt);
  })
);

/**
 * POST /api/purchasing/receipts
 * Create a new purchase receipt
 */
router.post(
  '/receipts',
  receivingAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const dto = {
      ...req.body,
      received_by: req.user!.userId,
    };
    const receipt = await purchasingService.createPurchaseReceipt(dto);
    res.status(201).json(receipt);
  })
);

/**
 * PUT /api/purchasing/receipts/:id/quality
 * Update receipt line quality
 */
router.put(
  '/receipts/lines/:line_id/quality',
  receivingAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const dto = {
      receipt_line_id: req.params.line_id,
      ...req.body,
    };
    const line = await purchasingService.updateReceiptQuality(dto);
    res.json(line);
  })
);

// ============================================================================
// THREE-WAY MATCHING
// ============================================================================

/**
 * GET /api/purchasing/match/exceptions
 * Get three-way match exceptions
 */
router.get(
  '/match/exceptions',
  matchingAuth,
  asyncHandler(async (_req: AuthenticatedRequest, res) => {
    const exceptions = await purchasingService.getMatchExceptions();
    res.json(exceptions);
  })
);

/**
 * GET /api/purchasing/match/po/:po_id
 * Get three-way match summary for PO
 */
router.get(
  '/match/po/:po_id',
  matchingAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const summary = await purchasingService.getThreeWayMatchSummary(req.params.po_id);
    res.json(summary);
  })
);

/**
 * POST /api/purchasing/match/:match_id/resolve
 * Resolve variance
 */
router.post(
  '/match/:match_id/resolve',
  matchingAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const dto = {
      match_id: req.params.match_id,
      ...req.body,
      resolved_by: req.user!.userId,
    };
    const resolved = await purchasingService.resolveVariance(dto);
    res.json(resolved);
  })
);

// ============================================================================
// VENDOR PERFORMANCE
// ============================================================================

/**
 * GET /api/purchasing/vendor-performance/:vendor_id
 * Get vendor performance summary
 */
router.get(
  '/vendor-performance/:vendor_id',
  vendorAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const performance = await purchasingService.getVendorPerformance(req.params.vendor_id);
    if (!performance) {
      res.status(404).json({ error: 'Vendor performance not found' });
      return;
    }
    res.json(performance);
  })
);

/**
 * GET /api/purchasing/vendor-performance/ranking
 * Get vendor ranking
 */
router.get(
  '/vendor-performance/ranking',
  vendorAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
    const ranking = await purchasingService.getVendorRanking(limit);
    res.json(ranking);
  })
);

/**
 * GET /api/purchasing/vendor-performance/at-risk
 * Get vendors at risk
 */
router.get(
  '/vendor-performance/at-risk',
  vendorAuth,
  asyncHandler(async (_req: AuthenticatedRequest, res) => {
    const vendors = await purchasingService.getVendorsAtRisk();
    res.json(vendors);
  })
);

/**
 * POST /api/purchasing/vendor-performance/events
 * Create vendor performance event
 */
router.post(
  '/vendor-performance/events',
  vendorAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const dto = {
      ...req.body,
      reported_by: req.user!.userId,
    };
    const event = await purchasingService.createVendorEvent(dto);
    res.status(201).json(event);
  })
);

/**
 * POST /api/purchasing/vendor-scorecards
 * Create vendor scorecard
 */
router.post(
  '/vendor-scorecards',
  vendorAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const dto = {
      ...req.body,
      reviewed_by: req.user!.userId,
    };
    const scorecard = await purchasingService.createVendorScorecard(dto);
    res.status(201).json(scorecard);
  })
);

export default router;
