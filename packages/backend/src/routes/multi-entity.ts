/**
 * Multi-Entity API Routes
 *
 * REST API for multi-company, multi-subsidiary ERP operations
 * Handles entities, inter-company transactions, consolidation rules, and entity user assignments
 */

import { Router } from 'express';
import { multiEntityService } from '../services/MultiEntityService';
import { asyncHandler, authenticate, authorize } from '../middleware';
import { AuthenticatedRequest } from '../middleware/auth';
import {
  UserRole,
  EntityType,
  EntityStatus,
  IntercompanyTransactionType,
  IntercompanyTransactionStatus,
} from '@opsui/shared';

const router = Router();

// All multi-entity routes require authentication
router.use(authenticate);

// Multi-entity management requires Admin access
const adminAuth = authorize(UserRole.ADMIN);

// Entity users can be managed by Admin or HR Manager
const userManagementAuth = authorize(UserRole.ADMIN, UserRole.HR_MANAGER);

// Entity viewers can read entity data
const viewerAuth = authorize(
  UserRole.ADMIN,
  UserRole.HR_MANAGER,
  UserRole.ACCOUNTING,
  UserRole.SALES,
  UserRole.SUPERVISOR
);

// ============================================================================
// ENTITIES
// ============================================================================

/**
 * GET /api/multi-entity/entities
 * Get all entities with optional filters
 * Query params: entity_type, entity_status, parent_entity_id, base_currency, country_code, is_active, search
 */
router.get(
  '/entities',
  viewerAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const filters = {
      entity_type: req.query.entity_type as EntityType | undefined,
      entity_status: req.query.entity_status as EntityStatus | undefined,
      parent_entity_id: req.query.parent_entity_id as string | undefined,
      base_currency: req.query.base_currency as string | undefined,
      country_code: req.query.country_code as string | undefined,
      is_active:
        req.query.is_active === 'true' ? true : req.query.is_active === 'false' ? false : undefined,
      search: req.query.search as string | undefined,
    };

    const entities = await multiEntityService.getEntities(filters);
    res.json(entities);
  })
);

/**
 * GET /api/multi-entity/entities/hierarchy
 * Get entity hierarchy tree
 * Query params: root_entity_id (optional)
 */
router.get(
  '/entities/hierarchy',
  viewerAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const rootEntityId = req.query.root_entity_id as string | undefined;
    const hierarchy = await multiEntityService.getEntityHierarchy(rootEntityId);
    res.json(hierarchy);
  })
);

/**
 * GET /api/multi-entity/entities/:id
 * Get entity by ID
 */
router.get(
  '/entities/:id',
  viewerAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const includeHierarchy = req.query.include_hierarchy === 'true';
    const entity = includeHierarchy
      ? await multiEntityService.getEntityWithHierarchy(req.params.id)
      : await multiEntityService.getEntityById(req.params.id);
    res.json(entity);
  })
);

/**
 * GET /api/multi-entity/entities/:id/subsidiaries
 * Get all subsidiaries of an entity
 * Query params: include_children (default: true)
 */
router.get(
  '/entities/:id/subsidiaries',
  viewerAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const includeChildren = req.query.include_children !== 'false';
    const subsidiaries = await multiEntityService.getEntitySubsidiaries(
      req.params.id,
      includeChildren
    );
    res.json(subsidiaries);
  })
);

/**
 * POST /api/multi-entity/entities
 * Create a new entity
 */
router.post(
  '/entities',
  adminAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const entity = await multiEntityService.createEntity(req.body, req.user?.userId || '');
    res.status(201).json(entity);
  })
);

/**
 * PUT /api/multi-entity/entities/:id
 * Update an entity
 */
router.put(
  '/entities/:id',
  adminAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const entity = await multiEntityService.updateEntity(
      req.params.id,
      req.body,
      req.user?.userId || ''
    );
    res.json(entity);
  })
);

/**
 * DELETE /api/multi-entity/entities/:id
 * Delete (soft delete) an entity
 */
router.delete(
  '/entities/:id',
  adminAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const deleted = await multiEntityService.deleteEntity(req.params.id, req.user?.userId || '');
    res.json({ success: deleted });
  })
);

// ============================================================================
// ENTITY SETTINGS
// ============================================================================

/**
 * GET /api/multi-entity/entities/:id/settings
 * Get all settings for an entity
 */
router.get(
  '/entities/:id/settings',
  viewerAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const settings = await multiEntityService.getEntitySettings(req.params.id);
    res.json(settings);
  })
);

/**
 * GET /api/multi-entity/entities/:id/settings/:key
 * Get a specific setting value
 */
router.get(
  '/entities/:id/settings/:key',
  viewerAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const value = await multiEntityService.getEntitySetting(
      req.params.id,
      req.params.key,
      req.query.default as string | undefined
    );
    res.json({ key: req.params.key, value });
  })
);

/**
 * PUT /api/multi-entity/entities/:id/settings/:key
 * Set entity setting value
 * Body: { value: string, type: 'STRING' | 'NUMBER' | 'BOOLEAN' | 'JSON' }
 */
router.put(
  '/entities/:id/settings/:key',
  adminAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { value, type } = req.body;
    const setting = await multiEntityService.setEntitySetting(
      req.params.id,
      req.params.key,
      value,
      type || 'STRING',
      req.user?.userId || ''
    );
    res.json({ key: req.params.key, value });
  })
);

// ============================================================================
// INTER-COMPANY TRANSACTIONS
// ============================================================================

/**
 * GET /api/multi-entity/transactions
 * Get inter-company transactions with optional filters
 * Query params: from_entity_id, to_entity_id, entity_id, transaction_type, transaction_status, date_from, date_to, search
 */
router.get(
  '/transactions',
  viewerAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const filters = {
      from_entity_id: req.query.from_entity_id as string | undefined,
      to_entity_id: req.query.to_entity_id as string | undefined,
      entity_id: req.query.entity_id as string | undefined,
      transaction_type: req.query.transaction_type as IntercompanyTransactionType | undefined,
      transaction_status: req.query.transaction_status as IntercompanyTransactionStatus | undefined,
      date_from: req.query.date_from ? new Date(req.query.date_from as string) : undefined,
      date_to: req.query.date_to ? new Date(req.query.date_to as string) : undefined,
      search: req.query.search as string | undefined,
    };

    const transactions = await multiEntityService.getIntercompanyTransactions(filters);
    res.json(transactions);
  })
);

/**
 * GET /api/multi-entity/transactions/summary
 * Get inter-company transaction summary
 * Query params: same as /transactions
 */
router.get(
  '/transactions/summary',
  viewerAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const filters = {
      from_entity_id: req.query.from_entity_id as string | undefined,
      to_entity_id: req.query.to_entity_id as string | undefined,
      entity_id: req.query.entity_id as string | undefined,
      transaction_type: req.query.transaction_type as IntercompanyTransactionType | undefined,
      transaction_status: req.query.transaction_status as IntercompanyTransactionStatus | undefined,
      date_from: req.query.date_from ? new Date(req.query.date_from as string) : undefined,
      date_to: req.query.date_to ? new Date(req.query.date_to as string) : undefined,
    };

    const summary = await multiEntityService.getIntercompanyTransactionSummary(filters);
    res.json(summary);
  })
);

/**
 * GET /api/multi-entity/transactions/:id
 * Get inter-company transaction by ID
 */
router.get(
  '/transactions/:id',
  viewerAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const transaction = await multiEntityService.getIntercompanyTransactionById(req.params.id);
    res.json(transaction);
  })
);

/**
 * POST /api/multi-entity/transactions
 * Create a new inter-company transaction
 */
router.post(
  '/transactions',
  adminAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const transaction = await multiEntityService.createIntercompanyTransaction(
      req.body,
      req.user?.userId || ''
    );
    res.status(201).json(transaction);
  })
);

/**
 * PUT /api/multi-entity/transactions/:id
 * Update an inter-company transaction
 */
router.put(
  '/transactions/:id',
  adminAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const transaction = await multiEntityService.updateIntercompanyTransaction(
      req.params.id,
      req.body,
      req.user?.userId || ''
    );
    res.json(transaction);
  })
);

/**
 * POST /api/multi-entity/transactions/:id/approve
 * Approve an inter-company transaction
 */
router.post(
  '/transactions/:id/approve',
  adminAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const transaction = await multiEntityService.approveIntercompanyTransaction(
      req.params.id,
      req.user?.userId || ''
    );
    res.json(transaction);
  })
);

// ============================================================================
// ENTITY RELATIONSHIPS
// ============================================================================

/**
 * GET /api/multi-entity/entities/:id/relationships
 * Get relationships for an entity
 */
router.get(
  '/entities/:id/relationships',
  viewerAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const relationships = await multiEntityService.getEntityRelationships(req.params.id);
    res.json(relationships);
  })
);

/**
 * POST /api/multi-entity/relationships
 * Create a new entity relationship
 */
router.post(
  '/relationships',
  adminAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const relationship = await multiEntityService.createEntityRelationship(
      req.body,
      req.user?.userId || ''
    );
    res.status(201).json(relationship);
  })
);

/**
 * DELETE /api/multi-entity/relationships/:id
 * Delete an entity relationship
 */
router.delete(
  '/relationships/:id',
  adminAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const deleted = await multiEntityService.deleteEntityRelationship(req.params.id);
    res.json({ success: deleted });
  })
);

// ============================================================================
// ENTITY USERS
// ============================================================================

/**
 * GET /api/multi-entity/entities/:id/users
 * Get users assigned to an entity
 */
router.get(
  '/entities/:id/users',
  viewerAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const users = await multiEntityService.getEntityUsers(req.params.id);
    res.json(users);
  })
);

/**
 * GET /api/multi-entity/users/:id/entities
 * Get entities for a user
 */
router.get(
  '/users/:id/entities',
  userManagementAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const entities = await multiEntityService.getUserEntities(req.params.id);
    res.json(entities);
  })
);

/**
 * GET /api/multi-entity/users/:id/default-entity
 * Get user's default entity
 */
router.get(
  '/users/:id/default-entity',
  viewerAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const entity = await multiEntityService.getUserDefaultEntity(req.params.id);
    res.json(entity);
  })
);

/**
 * POST /api/multi-entity/users/assign
 * Assign user to entity
 */
router.post(
  '/users/assign',
  userManagementAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const entityUser = await multiEntityService.assignUserToEntity(
      req.body,
      req.user?.userId || ''
    );
    res.status(201).json(entityUser);
  })
);

/**
 * PUT /api/multi-entity/entity-users/:id
 * Update entity user assignment
 */
router.put(
  '/entity-users/:id',
  userManagementAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const entityUser = await multiEntityService.updateEntityUserAssignment(req.params.id, req.body);
    res.json(entityUser);
  })
);

/**
 * DELETE /api/multi-entity/entity-users/:id
 * Remove user from entity
 */
router.delete(
  '/entity-users/:id',
  userManagementAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const deleted = await multiEntityService.removeUserFromEntity(req.params.id);
    res.json({ success: deleted });
  })
);

/**
 * POST /api/multi-entity/users/:id/default-entity
 * Set default entity for user
 * Body: { entity_id: string }
 */
router.post(
  '/users/:id/default-entity',
  userManagementAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { entity_id } = req.body;
    const result = await multiEntityService.setUserDefaultEntity(req.params.id, entity_id);
    res.json({ success: result });
  })
);

/**
 * GET /api/multi-entity/users/:id/entities/:entityId/permissions/:permission
 * Check if user has permission on entity
 */
router.get(
  '/users/:userId/entities/:entityId/permissions/:permission',
  viewerAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const hasPermission = await multiEntityService.checkEntityPermission(
      req.params.userId,
      req.params.entityId,
      req.params.permission
    );
    res.json({ has_permission: hasPermission });
  })
);

// ============================================================================
// CONSOLIDATION RULES
// ============================================================================

/**
 * GET /api/multi-entity/consolidation-rules
 * Get consolidation rules
 * Query params: parent_entity_id (optional)
 */
router.get(
  '/consolidation-rules',
  viewerAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const parentId = req.query.parent_entity_id as string | undefined;
    const rules = await multiEntityService.getConsolidationRules(parentId);
    res.json(rules);
  })
);

/**
 * GET /api/multi-entity/consolidation-rules/:id
 * Get consolidation rule by ID
 */
router.get(
  '/consolidation-rules/:id',
  viewerAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const rule = await multiEntityService.getConsolidationRuleById(req.params.id);
    res.json(rule);
  })
);

/**
 * POST /api/multi-entity/consolidation-rules
 * Create a new consolidation rule
 */
router.post(
  '/consolidation-rules',
  adminAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const rule = await multiEntityService.createConsolidationRule(req.body, req.user?.userId || '');
    res.status(201).json(rule);
  })
);

/**
 * PUT /api/multi-entity/consolidation-rules/:id
 * Update a consolidation rule
 */
router.put(
  '/consolidation-rules/:id',
  adminAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const rule = await multiEntityService.updateConsolidationRule(req.params.id, req.body);
    res.json(rule);
  })
);

/**
 * DELETE /api/multi-entity/consolidation-rules/:id
 * Delete a consolidation rule
 */
router.delete(
  '/consolidation-rules/:id',
  adminAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const deleted = await multiEntityService.deleteConsolidationRule(req.params.id);
    res.json({ success: deleted });
  })
);

// ============================================================================
// ENTITY EXCHANGE RATES
// ============================================================================

/**
 * GET /api/multi-entity/entities/:id/exchange-rates
 * Get exchange rates for an entity
 */
router.get(
  '/entities/:id/exchange-rates',
  viewerAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const rates = await multiEntityService.getEntityExchangeRates(req.params.id);
    res.json(rates);
  })
);

/**
 * GET /api/multi-entity/entities/:id/exchange-rates/:fromCurrency/:toCurrency
 * Get latest exchange rate for currency pair
 */
router.get(
  '/entities/:id/exchange-rates/:fromCurrency/:toCurrency',
  viewerAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const rate = await multiEntityService.getLatestExchangeRate(
      req.params.id,
      req.params.fromCurrency.toUpperCase(),
      req.params.toCurrency.toUpperCase()
    );
    res.json(rate);
  })
);

/**
 * PUT /api/multi-entity/exchange-rates
 * Set exchange rate
 */
router.put(
  '/exchange-rates',
  adminAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const rate = await multiEntityService.setExchangeRate(req.body, req.user?.userId || '');
    res.json(rate);
  })
);

// ============================================================================
// CONSOLIDATION
// ============================================================================

/**
 * POST /api/multi-entity/consolidation
 * Generate consolidated financial statements
 * Body: { period: string, parent_entity_id: string }
 */
router.post(
  '/consolidation',
  viewerAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { period, parent_entity_id } = req.body;
    const financials = await multiEntityService.generateConsolidatedFinancials(
      period,
      parent_entity_id
    );
    res.json(financials);
  })
);

// ============================================================================
// AUDIT LOG
// ============================================================================

/**
 * GET /api/multi-entity/entities/:id/audit-log
 * Get audit log for an entity
 * Query params: limit (default: 100)
 */
router.get(
  '/entities/:id/audit-log',
  adminAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
    const auditLog = await multiEntityService.getEntityAuditLog(req.params.id, limit);
    res.json(auditLog);
  })
);

// ============================================================================
// EXPORT ROUTER
// ============================================================================

export default router;
