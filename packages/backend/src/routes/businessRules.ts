/**
 * Business Rules API Routes
 *
 * REST API for managing business rules, viewing execution logs,
 * and testing rule conditions.
 */

import { Router, Request, Response } from 'express';
import { businessRulesRepository } from '../repositories/BusinessRulesRepository';
import { businessRulesService } from '../services/BusinessRulesService';
import { asyncHandler, authenticate, authorize } from '../middleware';
import { BusinessRule, RuleStatus, RuleType, RuleEventType, UserRole } from '@opsui/shared';

const router = Router();

// All business rules routes require authentication
router.use(authenticate);

// ============================================================================
// CRUD ROUTES
// ============================================================================

/**
 * GET /api/business-rules
 * Get all business rules with optional filtering
 */
router.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const { status, ruleType, includeInactive } = req.query;

    const rules = await businessRulesRepository.findAll({
      status: status as RuleStatus,
      ruleType: ruleType as RuleType,
      includeInactive: includeInactive === 'true',
    });

    res.json({
      success: true,
      data: {
        rules,
        count: rules.length,
      },
    });
  })
);

/**
 * GET /api/business-rules/:ruleId
 * Get a specific business rule by ID
 */
router.get(
  '/:ruleId',
  asyncHandler(async (req: Request, res: Response) => {
    const { ruleId } = req.params;
    const rule = await businessRulesRepository.findById(ruleId);

    if (!rule) {
      res.status(404).json({
        success: false,
        error: 'Rule not found',
      });
      return;
    }

    res.json({
      success: true,
      data: { rule },
    });
  })
);

/**
 * POST /api/business-rules
 * Create a new business rule (ADMIN/SUPERVISOR only)
 */
router.post(
  '/',
  authorize(UserRole.ADMIN, UserRole.SUPERVISOR),
  asyncHandler(async (req: Request, res: Response) => {
    const ruleData: Omit<BusinessRule, 'ruleId' | 'createdAt' | 'executionCount' | 'version'> =
      req.body;

    // Validate required fields
    if (!ruleData.name || !ruleData.ruleType || !ruleData.createdBy) {
      res.status(400).json({
        success: false,
        error: 'Missing required fields: name, ruleType, createdBy',
      });
      return;
    }

    const rule = await businessRulesRepository.create(ruleData);

    res.status(201).json({
      success: true,
      data: { rule },
    });
  })
);

/**
 * PUT /api/business-rules/:ruleId
 * Update an existing business rule (ADMIN/SUPERVISOR only)
 */
router.put(
  '/:ruleId',
  authorize(UserRole.ADMIN, UserRole.SUPERVISOR),
  asyncHandler(async (req: Request, res: Response) => {
    const { ruleId } = req.params;
    const updates = req.body;

    const rule = await businessRulesRepository.update(ruleId, updates);

    if (!rule) {
      res.status(404).json({
        success: false,
        error: 'Rule not found',
      });
      return;
    }

    res.json({
      success: true,
      data: { rule },
    });
  })
);

/**
 * DELETE /api/business-rules/:ruleId
 * Delete a business rule (ADMIN only)
 */
router.delete(
  '/:ruleId',
  authorize(UserRole.ADMIN),
  asyncHandler(async (req: Request, res: Response) => {
    const { ruleId } = req.params;
    const deleted = await businessRulesRepository.delete(ruleId);

    if (!deleted) {
      res.status(404).json({
        success: false,
        error: 'Rule not found',
      });
      return;
    }

    res.json({
      success: true,
      message: 'Rule deleted successfully',
    });
  })
);

// ============================================================================
// EXECUTION LOGS
// ============================================================================

/**
 * GET /api/business-rules/:ruleId/execution-logs
 * Get execution logs for a specific rule
 */
router.get(
  '/:ruleId/execution-logs',
  asyncHandler(async (req: Request, res: Response) => {
    const { ruleId } = req.params;
    const limit = parseInt(req.query.limit as string) || 100;

    const logs = await businessRulesRepository.findExecutionLogs(ruleId, limit);

    res.json({
      success: true,
      data: {
        logs,
        count: logs.length,
      },
    });
  })
);

// ============================================================================
// RULE TESTING
// ============================================================================

/**
 * POST /api/business-rules/test
 * Test rule conditions against sample data
 */
router.post(
  '/test',
  authorize(UserRole.ADMIN, UserRole.SUPERVISOR),
  asyncHandler(async (req: Request, res: Response) => {
    const { rule, entity, entityType, entityId } = req.body;

    if (!rule || !entity) {
      res.status(400).json({
        success: false,
        error: 'Missing required fields: rule, entity',
      });
      return;
    }

    const context = {
      eventType: rule.triggerEvents[0] || RuleEventType.ORDER_CREATED,
      entity,
      entityType: entityType || 'test',
      entityId: entityId || 'test-entity',
      userId: 'test-user',
    };

    const evaluationResult = businessRulesService.evaluateRuleConditions(rule, context);

    res.json({
      success: true,
      data: {
        shouldExecute: evaluationResult.shouldExecute,
        conditionsMet: evaluationResult.conditionsMet,
        conditionResults: evaluationResult.conditionResults,
      },
    });
  })
);

/**
 * POST /api/business-rules/:ruleId/activate
 * Activate a rule (ADMIN/SUPERVISOR only)
 */
router.post(
  '/:ruleId/activate',
  authorize(UserRole.ADMIN, UserRole.SUPERVISOR),
  asyncHandler(async (req: Request, res: Response) => {
    const { ruleId } = req.params;

    const rule = await businessRulesRepository.update(ruleId, {
      status: RuleStatus.ACTIVE,
      updatedBy: (req as any).user?.userId || 'system',
    });

    if (!rule) {
      res.status(404).json({
        success: false,
        error: 'Rule not found',
      });
      return;
    }

    res.json({
      success: true,
      data: { rule },
    });
  })
);

/**
 * POST /api/business-rules/:ruleId/deactivate
 * Deactivate a rule (ADMIN/SUPERVISOR only)
 */
router.post(
  '/:ruleId/deactivate',
  authorize(UserRole.ADMIN, UserRole.SUPERVISOR),
  asyncHandler(async (req: Request, res: Response) => {
    const { ruleId } = req.params;

    const rule = await businessRulesRepository.update(ruleId, {
      status: RuleStatus.INACTIVE,
      updatedBy: (req as any).user?.userId || 'system',
    });

    if (!rule) {
      res.status(404).json({
        success: false,
        error: 'Rule not found',
      });
      return;
    }

    res.json({
      success: true,
      data: { rule },
    });
  })
);

/**
 * GET /api/business-rules/stats/summary
 * Get summary statistics for business rules
 */
router.get(
  '/stats/summary',
  asyncHandler(async (req: Request, res: Response) => {
    const allRules = await businessRulesRepository.findAll({ includeInactive: true });

    const stats = {
      total: allRules.length,
      active: allRules.filter((r: BusinessRule) => r.status === RuleStatus.ACTIVE).length,
      inactive: allRules.filter((r: BusinessRule) => r.status === RuleStatus.INACTIVE).length,
      draft: allRules.filter((r: BusinessRule) => r.status === RuleStatus.DRAFT).length,
      byType: {
        ALLOCATION: allRules.filter((r: BusinessRule) => r.ruleType === 'ALLOCATION').length,
        PICKING: allRules.filter((r: BusinessRule) => r.ruleType === 'PICKING').length,
        SHIPPING: allRules.filter((r: BusinessRule) => r.ruleType === 'SHIPPING').length,
        INVENTORY: allRules.filter((r: BusinessRule) => r.ruleType === 'INVENTORY').length,
        VALIDATION: allRules.filter((r: BusinessRule) => r.ruleType === 'VALIDATION').length,
        NOTIFICATION: allRules.filter((r: BusinessRule) => r.ruleType === 'NOTIFICATION').length,
      },
      totalExecutions: allRules.reduce((sum: number, r: BusinessRule) => sum + r.executionCount, 0),
    };

    res.json({
      success: true,
      data: stats,
    });
  })
);

export default router;
