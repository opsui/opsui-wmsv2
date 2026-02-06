/**
 * Accounting & Financial API Routes
 *
 * REST API for financial metrics, inventory valuation, profit/loss reporting,
 * vendor performance, and transaction management
 */

import { Router } from 'express';
import { accountingService } from '../services/AccountingService';
import { asyncHandler, authenticate, authorize } from '../middleware';
import { AuthenticatedRequest } from '../middleware/auth';
import { UserRole, AccountingPeriod, TransactionType } from '@opsui/shared';

const router = Router();

// All accounting routes require authentication
router.use(authenticate);

// Most accounting routes require supervisor, admin, or accounting access
const accountingAuth = authorize(UserRole.SUPERVISOR, UserRole.ADMIN, UserRole.ACCOUNTING);

// ============================================================================
// FINANCIAL METRICS
// ============================================================================

/**
 * GET /api/accounting/metrics
 * Get financial metrics for a period
 */
router.get(
  '/metrics',
  accountingAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const period = req.query.period as AccountingPeriod;
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

    const metrics = await accountingService.getFinancialMetrics({
      period,
      startDate,
      endDate,
    });

    res.json(metrics);
  })
);

// ============================================================================
// INVENTORY VALUATION
// ============================================================================

/**
 * GET /api/accounting/inventory/valuation
 * Get inventory valuation details
 */
router.get(
  '/inventory/valuation',
  accountingAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const category = req.query.category as string | undefined;
    const zone = req.query.zone as string | undefined;
    const sku = req.query.sku as string | undefined;

    const valuation = await accountingService.getInventoryValuationDetails({
      category,
      zone,
      sku,
    });

    res.json({
      valuation,
      totalValue: valuation.reduce((sum, item) => sum + item.totalValue, 0),
      count: valuation.length,
    });
  })
);

// ============================================================================
// LABOR COSTS
// ============================================================================

/**
 * GET /api/accounting/labor-costs
 * Get labor cost details
 */
router.get(
  '/labor-costs',
  accountingAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const period = req.query.period as AccountingPeriod;
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
    const userId = req.query.userId as string | undefined;
    const role = req.query.role as UserRole | undefined;

    const start =
      startDate || (period ? undefined : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));
    const end = endDate || new Date();

    const laborCosts = await accountingService.getLaborCostDetails({
      startDate: start!,
      endDate: end,
      userId,
      role,
    });

    res.json({
      laborCosts,
      totalCost: laborCosts.reduce((sum, item) => sum + item.totalCost, 0),
      totalHours: laborCosts.reduce((sum, item) => sum + item.hoursWorked, 0),
      count: laborCosts.length,
    });
  })
);

// ============================================================================
// PROFIT & LOSS STATEMENT
// ============================================================================

/**
 * GET /api/accounting/profit-loss
 * Generate profit & loss statement
 */
router.get(
  '/profit-loss',
  accountingAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const period = req.query.period as AccountingPeriod;
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

    const statement = await accountingService.generateProfitLossStatement({
      period,
      startDate,
      endDate,
    });

    res.json(statement);
  })
);

// ============================================================================
// VENDOR PERFORMANCE (FINANCIAL)
// ============================================================================

/**
 * GET /api/accounting/vendors/:vendorId/financial
 * Get financial performance summary for a vendor
 */
router.get(
  '/vendors/:vendorId/financial',
  accountingAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { vendorId } = req.params;
    const period = req.query.period as AccountingPeriod;
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

    const performance = await accountingService.getVendorPerformanceFinancial(vendorId, {
      period,
      startDate,
      endDate,
    });

    res.json(performance);
  })
);

/**
 * GET /api/accounting/vendors/financial
 * Get financial performance for all vendors
 */
router.get(
  '/vendors/financial',
  accountingAuth,
  asyncHandler(async (_req: AuthenticatedRequest, res) => {
    // This would aggregate all vendors - for now return empty
    res.json({
      vendors: [],
      total: 0,
    });
  })
);

// ============================================================================
// CUSTOMER FINANCIAL SUMMARY
// ============================================================================

/**
 * GET /api/accounting/customers/:customerId/financial
 * Get financial summary for a customer
 */
router.get(
  '/customers/:customerId/financial',
  accountingAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { customerId } = req.params;
    const period = req.query.period as AccountingPeriod;
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

    const summary = await accountingService.getCustomerFinancialSummary(customerId, {
      period,
      startDate,
      endDate,
    });

    res.json(summary);
  })
);

/**
 * GET /api/accounting/customers/financial
 * Get financial summary for all customers
 */
router.get(
  '/customers/financial',
  accountingAuth,
  asyncHandler(async (_req: AuthenticatedRequest, res) => {
    // This would aggregate all customers - for now return empty
    res.json({
      customers: [],
      total: 0,
    });
  })
);

// ============================================================================
// FINANCIAL TRANSACTIONS
// ============================================================================

/**
 * POST /api/accounting/transactions
 * Create a financial transaction
 */
router.post(
  '/transactions',
  accountingAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const {
      transactionType,
      amount,
      currency,
      referenceType,
      referenceId,
      description,
      customerId,
      vendorId,
      account,
      notes,
    } = req.body;

    if (!transactionType || !amount || !referenceType || !referenceId || !description || !account) {
      res.status(400).json({
        error: 'Missing required fields',
        code: 'MISSING_FIELDS',
      });
      return;
    }

    const transaction = await accountingService.createTransaction({
      transactionType,
      amount: parseFloat(amount),
      currency,
      referenceType,
      referenceId,
      description,
      customerId,
      vendorId,
      createdBy: req.user!.userId,
      account,
      notes,
    });

    res.status(201).json(transaction);
  })
);

/**
 * GET /api/accounting/transactions
 * Get financial transactions
 */
router.get(
  '/transactions',
  accountingAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const transactionType = req.query.type as TransactionType | undefined;
    const referenceType = req.query.referenceType as string | undefined;
    const customerId = req.query.customerId as string | undefined;
    const vendorId = req.query.vendorId as string | undefined;
    const status = req.query.status as string | undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
    const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;

    const result = await accountingService.getTransactions({
      transactionType,
      referenceType,
      customerId,
      vendorId,
      status,
      limit,
      offset,
    });

    res.json(result);
  })
);

// ============================================================================
// ROLE PERMISSIONS MATRIX
// ============================================================================

/**
 * GET /api/accounting/roles/permissions
 * Get role permissions matrix
 */
router.get(
  '/roles/permissions',
  authorize(UserRole.ADMIN),
  asyncHandler(async (_req: AuthenticatedRequest, res) => {
    // This would return the full permissions matrix
    // For now, return a basic structure
    const { UserRole, PERMISSION_GROUPS } = await import('@opsui/shared');

    const matrix = Object.values(UserRole).map(role => ({
      role,
      permissions: [],
      permissionCategories: PERMISSION_GROUPS,
    }));

    res.json({
      matrix,
      permissionGroups: PERMISSION_GROUPS,
      roles: Object.values(UserRole),
    });
  })
);

export default router;
