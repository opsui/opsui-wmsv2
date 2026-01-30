/**
 * Quality Control routes
 *
 * Endpoints for managing quality inspections, checklists, and returns
 */

import { Router } from 'express';
import { qualityControlService } from '../services/QualityControlService';
import { asyncHandler, authenticate, authorize } from '../middleware';
import { AuthenticatedRequest } from '../middleware/auth';
import { UserRole, InspectionStatus, InspectionType } from '@opsui/shared';

const router = Router();

// All quality control routes require authentication
router.use(authenticate);

// ============================================================================
// INSPECTION CHECKLIST ROUTES
// ============================================================================

/**
 * POST /api/quality-control/checklists
 * Create an inspection checklist
 */
router.post(
  '/checklists',
  authorize(UserRole.SUPERVISOR, UserRole.ADMIN),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { checklistName, description, inspectionType, sku, category, items } = req.body;

    // Validate required fields
    if (!checklistName || !inspectionType || !items || !Array.isArray(items)) {
      res.status(400).json({
        error: 'Missing required fields',
        code: 'MISSING_FIELDS',
      });
      return;
    }

    const checklist = await qualityControlService.createInspectionChecklist({
      checklistName,
      description,
      inspectionType,
      sku,
      category,
      items,
      createdBy: req.user!.userId,
    });

    res.status(201).json(checklist);
  })
);

/**
 * GET /api/quality-control/checklists
 * Get all inspection checklists
 */
router.get(
  '/checklists',
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const filters = {
      inspectionType: req.query.type as InspectionType | undefined,
      sku: req.query.sku as string | undefined,
      category: req.query.category as string | undefined,
      activeOnly: req.query.active === 'true',
    };

    const checklists = await qualityControlService.getAllInspectionChecklists(filters);
    res.json(checklists);
  })
);

/**
 * GET /api/quality-control/checklists/:checklistId
 * Get a specific inspection checklist
 */
router.get(
  '/checklists/:checklistId',
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { checklistId } = req.params;
    const checklist = await qualityControlService.getInspectionChecklist(checklistId);
    res.json(checklist);
  })
);

// ============================================================================
// QUALITY INSPECTION ROUTES
// ============================================================================

/**
 * POST /api/quality-control/inspections
 * Create a quality inspection
 */
router.post(
  '/inspections',
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const {
      inspectionType,
      referenceType,
      referenceId,
      sku,
      quantityInspected,
      location,
      lotNumber,
      expirationDate,
      checklistId,
      notes,
    } = req.body;

    // Validate required fields
    if (
      !inspectionType ||
      !referenceType ||
      !referenceId ||
      !sku ||
      quantityInspected === undefined
    ) {
      res.status(400).json({
        error: 'Missing required fields',
        code: 'MISSING_FIELDS',
      });
      return;
    }

    const inspection = await qualityControlService.createInspection({
      inspectionType,
      referenceType,
      referenceId,
      sku,
      quantityInspected: parseInt(quantityInspected),
      inspectorId: req.user!.userId,
      location,
      lotNumber,
      expirationDate: expirationDate ? new Date(expirationDate) : undefined,
      checklistId,
      notes,
    });

    res.status(201).json(inspection);
  })
);

/**
 * GET /api/quality-control/inspections
 * Get all quality inspections
 */
router.get(
  '/inspections',
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const filters = {
      status: req.query.status as InspectionStatus | undefined,
      inspectionType: req.query.type as InspectionType | undefined,
      referenceType: req.query.referenceType as string | undefined,
      referenceId: req.query.referenceId as string | undefined,
      sku: req.query.sku as string | undefined,
      inspectorId: req.query.inspectorId as string | undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string) : 50,
      offset: req.query.offset ? parseInt(req.query.offset as string) : 0,
    };

    const result = await qualityControlService.getAllQualityInspections(filters);
    res.json(result);
  })
);

/**
 * GET /api/quality-control/inspections/:inspectionId
 * Get a specific quality inspection
 */
router.get(
  '/inspections/:inspectionId',
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { inspectionId } = req.params;
    const inspection = await qualityControlService.getQualityInspection(inspectionId);
    res.json(inspection);
  })
);

/**
 * POST /api/quality-control/inspections/:inspectionId/start
 * Start an inspection
 */
router.post(
  '/inspections/:inspectionId/start',
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { inspectionId } = req.params;
    const inspection = await qualityControlService.startInspection(inspectionId);
    res.json(inspection);
  })
);

/**
 * PATCH /api/quality-control/inspections/:inspectionId/status
 * Update inspection status (complete inspection)
 */
router.patch(
  '/inspections/:inspectionId/status',
  authorize(UserRole.SUPERVISOR, UserRole.ADMIN),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { inspectionId } = req.params;
    const {
      status,
      quantityPassed,
      quantityFailed,
      defectType,
      defectDescription,
      dispositionAction,
      dispositionNotes,
      notes,
    } = req.body;

    if (!status) {
      res.status(400).json({
        error: 'Status is required',
        code: 'MISSING_STATUS',
      });
      return;
    }

    const inspection = await qualityControlService.updateInspectionStatus({
      inspectionId,
      status,
      quantityPassed: quantityPassed ? parseInt(quantityPassed) : undefined,
      quantityFailed: quantityFailed ? parseInt(quantityFailed) : undefined,
      defectType,
      defectDescription,
      dispositionAction,
      dispositionNotes,
      approvedBy: req.user!.userId,
      notes,
    });

    res.json(inspection);
  })
);

/**
 * GET /api/quality-control/inspections/:inspectionId/results
 * Get inspection results
 */
router.get(
  '/inspections/:inspectionId/results',
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { inspectionId } = req.params;
    const results = await qualityControlService.getInspectionResults(inspectionId);
    res.json(results);
  })
);

/**
 * POST /api/quality-control/inspections/results
 * Save inspection result
 */
router.post(
  '/inspections/results',
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { inspectionId, checklistItemId, result, passed, notes, imageUrl } = req.body;

    // Validate required fields
    if (!inspectionId || !checklistItemId || result === undefined || passed === undefined) {
      res.status(400).json({
        error: 'Missing required fields',
        code: 'MISSING_FIELDS',
      });
      return;
    }

    const inspectionResult = await qualityControlService.saveInspectionResult({
      inspectionId,
      checklistItemId,
      result,
      passed,
      notes,
      imageUrl,
    });

    res.status(201).json(inspectionResult);
  })
);

// ============================================================================
// RETURN AUTHORIZATION ROUTES
// ============================================================================

/**
 * POST /api/quality-control/returns
 * Create a return authorization
 */
router.post(
  '/returns',
  authorize(UserRole.SUPERVISOR, UserRole.ADMIN),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const {
      orderId,
      customerId,
      customerName,
      returnReason,
      items,
      totalRefundAmount,
      restockingFee,
    } = req.body;

    // Validate required fields
    if (
      !orderId ||
      !customerId ||
      !customerName ||
      !returnReason ||
      !items ||
      !Array.isArray(items) ||
      !totalRefundAmount
    ) {
      res.status(400).json({
        error: 'Missing required fields',
        code: 'MISSING_FIELDS',
      });
      return;
    }

    const returnAuth = await qualityControlService.createReturnAuthorization({
      orderId,
      customerId,
      customerName,
      returnReason,
      items,
      authorizedBy: req.user!.userId,
      totalRefundAmount,
      restockingFee,
    });

    res.status(201).json(returnAuth);
  })
);

/**
 * GET /api/quality-control/returns
 * Get all return authorizations
 */
router.get(
  '/returns',
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const filters = {
      status: req.query.status as string | undefined,
      orderId: req.query.orderId as string | undefined,
      customerId: req.query.customerId as string | undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string) : 50,
      offset: req.query.offset ? parseInt(req.query.offset as string) : 0,
    };

    const result = await qualityControlService.getAllReturnAuthorizations(filters);
    res.json(result);
  })
);

/**
 * GET /api/quality-control/returns/:returnId
 * Get a specific return authorization
 */
router.get(
  '/returns/:returnId',
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { returnId } = req.params;
    const returnAuth = await qualityControlService.getReturnAuthorization(returnId);
    res.json(returnAuth);
  })
);

/**
 * PATCH /api/quality-control/returns/:returnId/status
 * Update return authorization status
 */
router.patch(
  '/returns/:returnId/status',
  authorize(UserRole.SUPERVISOR, UserRole.ADMIN),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { returnId } = req.params;
    const { status } = req.body;

    if (!status) {
      res.status(400).json({
        error: 'Status is required',
        code: 'MISSING_STATUS',
      });
      return;
    }

    const returnAuth = await qualityControlService.updateReturnAuthorizationStatus(
      returnId,
      status,
      req.user!.userId
    );

    res.json(returnAuth);
  })
);

export default router;
