/**
 * Sales & CRM Routes
 *
 * API endpoints for customers, leads, opportunities, and quotes
 */

import { Router } from 'express';
import { salesService } from '../services/SalesService';
import { authenticate, authorize, asyncHandler } from '../middleware';
import { AuthenticatedRequest } from '../middleware/auth';
import { UserRole, CustomerStatus, LeadStatus, OpportunityStage, QuoteStatus } from '@opsui/shared';

const router = Router();

// All sales routes require authentication
router.use(authenticate);

// ============================================================================
// DASHBOARD
// ============================================================================

/**
 * GET /api/sales/dashboard
 * Get sales dashboard statistics
 * Access: All authenticated users
 */
router.get(
  '/dashboard',
  asyncHandler(async (_req: AuthenticatedRequest, res) => {
    const dashboard = await salesService.getDashboard();
    res.json(dashboard);
  })
);

// ============================================================================
// CUSTOMERS
// ============================================================================

/**
 * POST /api/sales/customers
 * Create a new customer
 * Access: ADMIN, SUPERVISOR, SALES
 */
router.post(
  '/customers',
  authorize(UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.SALES),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const customer = await salesService.createCustomer(req.body, req.user!.userId);
    res.status(201).json(customer);
  })
);

/**
 * GET /api/sales/customers
 * Get all customers with optional filtering
 * Access: All authenticated users
 */
router.get(
  '/customers',
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { status, assignedTo, limit, offset } = req.query;
    const result = await salesService.getAllCustomers({
      status: status as CustomerStatus,
      assignedTo: assignedTo as string,
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined,
    });
    res.json(result);
  })
);

/**
 * GET /api/sales/customers/:customerId
 * Get a specific customer by ID
 * Access: All authenticated users
 */
router.get(
  '/customers/:customerId',
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { customerId } = req.params;
    const customer = await salesService.getCustomerById(customerId);
    res.json(customer);
  })
);

/**
 * PUT /api/sales/customers/:customerId
 * Update a customer
 * Access: ADMIN, SUPERVISOR, SALES
 */
router.put(
  '/customers/:customerId',
  authorize(UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.SALES),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { customerId } = req.params;
    const customer = await salesService.updateCustomer(customerId, req.body, req.user!.userId);
    res.json(customer);
  })
);

// ============================================================================
// LEADS
// ============================================================================

/**
 * POST /api/sales/leads
 * Create a new lead
 * Access: ADMIN, SUPERVISOR, SALES
 */
router.post(
  '/leads',
  authorize(UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.SALES),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const lead = await salesService.createLead(req.body, req.user!.userId);
    res.status(201).json(lead);
  })
);

/**
 * GET /api/sales/leads
 * Get all leads with optional filtering
 * Access: All authenticated users
 */
router.get(
  '/leads',
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { status, assignedTo, limit, offset } = req.query;
    const result = await salesService.getAllLeads({
      status: status as LeadStatus,
      assignedTo: assignedTo as string,
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined,
    });
    res.json(result);
  })
);

/**
 * GET /api/sales/leads/:leadId
 * Get a specific lead by ID
 * Access: All authenticated users
 */
router.get(
  '/leads/:leadId',
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { leadId } = req.params;
    const lead = await salesService.getLeadById(leadId);
    res.json(lead);
  })
);

/**
 * PUT /api/sales/leads/:leadId
 * Update a lead
 * Access: ADMIN, SUPERVISOR, SALES
 */
router.put(
  '/leads/:leadId',
  authorize(UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.SALES),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { leadId } = req.params;
    const lead = await salesService.updateLead(leadId, req.body, req.user!.userId);
    res.json(lead);
  })
);

/**
 * POST /api/sales/leads/:leadId/convert
 * Convert a lead to a customer
 * Access: ADMIN, SUPERVISOR, SALES
 */
router.post(
  '/leads/:leadId/convert',
  authorize(UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.SALES),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { leadId } = req.params;
    const customer = await salesService.convertLeadToCustomer(leadId, req.user!.userId);
    res.status(201).json(customer);
  })
);

// ============================================================================
// OPPORTUNITIES
// ============================================================================

/**
 * POST /api/sales/opportunities
 * Create a new opportunity
 * Access: ADMIN, SUPERVISOR, SALES
 */
router.post(
  '/opportunities',
  authorize(UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.SALES),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const opportunity = await salesService.createOpportunity(req.body, req.user!.userId);
    res.status(201).json(opportunity);
  })
);

/**
 * GET /api/sales/opportunities
 * Get all opportunities with optional filtering
 * Access: All authenticated users
 */
router.get(
  '/opportunities',
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { stage, customerId, assignedTo, limit, offset } = req.query;
    const result = await salesService.getAllOpportunities({
      stage: stage as OpportunityStage,
      customerId: customerId as string,
      assignedTo: assignedTo as string,
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined,
    });
    res.json(result);
  })
);

/**
 * GET /api/sales/opportunities/:opportunityId
 * Get a specific opportunity by ID
 * Access: All authenticated users
 */
router.get(
  '/opportunities/:opportunityId',
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { opportunityId } = req.params;
    const opportunity = await salesService.getOpportunityById(opportunityId);
    res.json(opportunity);
  })
);

/**
 * PUT /api/sales/opportunities/:opportunityId/stage
 * Update opportunity stage
 * Access: ADMIN, SUPERVISOR, SALES
 */
router.put(
  '/opportunities/:opportunityId/stage',
  authorize(UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.SALES),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { opportunityId } = req.params;
    const { stage } = req.body;
    const opportunity = await salesService.updateOpportunityStage(
      opportunityId,
      stage,
      req.user!.userId
    );
    res.json(opportunity);
  })
);

// ============================================================================
// QUOTES
// ============================================================================

/**
 * POST /api/sales/quotes
 * Create a new quote
 * Access: ADMIN, SUPERVISOR, SALES
 */
router.post(
  '/quotes',
  authorize(UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.SALES),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const quote = await salesService.createQuote(req.body, req.user!.userId);
    res.status(201).json(quote);
  })
);

/**
 * GET /api/sales/quotes
 * Get all quotes with optional filtering
 * Access: All authenticated users
 */
router.get(
  '/quotes',
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { customerId, status, limit, offset } = req.query;
    const result = await salesService.getAllQuotes({
      customerId: customerId as string,
      status: status as QuoteStatus,
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined,
    });
    res.json(result);
  })
);

/**
 * GET /api/sales/quotes/:quoteId
 * Get a specific quote by ID
 * Access: All authenticated users
 */
router.get(
  '/quotes/:quoteId',
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { quoteId } = req.params;
    const quote = await salesService.getQuoteById(quoteId);
    res.json(quote);
  })
);

/**
 * POST /api/sales/quotes/:quoteId/send
 * Send a quote to customer
 * Access: ADMIN, SUPERVISOR, SALES
 */
router.post(
  '/quotes/:quoteId/send',
  authorize(UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.SALES),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { quoteId } = req.params;
    const quote = await salesService.sendQuote(quoteId, req.user!.userId);
    res.json(quote);
  })
);

/**
 * POST /api/sales/quotes/:quoteId/accept
 * Accept a quote (mark as accepted and convert to order)
 * Access: ADMIN, SUPERVISOR, SALES
 */
router.post(
  '/quotes/:quoteId/accept',
  authorize(UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.SALES),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { quoteId } = req.params;
    const result = await salesService.acceptQuote(quoteId, req.user!.userId);
    res.json(result);
  })
);

// ============================================================================
// CUSTOMER INTERACTIONS
// ============================================================================

/**
 * POST /api/sales/interactions
 * Log a customer interaction
 * Access: ADMIN, SUPERVISOR, SALES
 */
router.post(
  '/interactions',
  authorize(UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.SALES),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const interaction = await salesService.logInteraction({
      ...req.body,
      createdAt: new Date(),
    });
    res.status(201).json(interaction);
  })
);

/**
 * GET /api/sales/customers/:customerId/interactions
 * Get interaction history for a customer
 * Access: All authenticated users
 */
router.get(
  '/customers/:customerId/interactions',
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { customerId } = req.params;
    const { limit } = req.query;
    const interactions = await salesService.getCustomerInteractions(
      customerId,
      limit ? parseInt(limit as string) : 50
    );
    res.json({ interactions, count: interactions.length });
  })
);

export default router;
