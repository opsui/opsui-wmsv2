/**
 * Unit tests for BusinessRulesService
 * @covers src/services/BusinessRulesService.ts
 */

import { BusinessRulesService, businessRulesService } from '../BusinessRulesService';
import {
  BusinessRule,
  RuleCondition,
  RuleAction,
  RuleEventType,
  ConditionOperator,
  ActionType,
  LogicalOperator,
  RuleType,
  RuleStatus,
} from '@opsui/shared';

// Mock the repository
jest.mock('../../repositories/BusinessRulesRepository', () => ({
  businessRulesRepository: {
    findActiveRulesByEventType: jest.fn(),
    createExecutionLog: jest.fn(),
  },
}));

import { businessRulesRepository } from '../../repositories/BusinessRulesRepository';

describe('BusinessRulesService', () => {
  let service: BusinessRulesService;

  const mockRule: BusinessRule = {
    ruleId: 'rule-001',
    name: 'High Priority Order Rule',
    description: 'Set priority for high-value orders',
    ruleType: RuleType.ALLOCATION,
    status: RuleStatus.ACTIVE,
    priority: 10,
    triggerEvents: [RuleEventType.ORDER_CREATED],
    conditions: [
      {
        conditionId: 'cond-001',
        ruleId: 'rule-001',
        field: 'total',
        operator: ConditionOperator.GREATER_THAN,
        value: 1000,
        order: 1,
      },
    ],
    actions: [
      {
        actionId: 'action-001',
        ruleId: 'rule-001',
        actionType: ActionType.SET_PRIORITY,
        parameters: { field: 'priority', value: 'HIGH' },
        order: 1,
      },
    ],
    createdBy: 'user-001',
    createdAt: new Date('2024-01-01'),
    version: 1,
    executionCount: 0,
  };

  const mockContext = {
    eventType: RuleEventType.ORDER_CREATED,
    entity: { total: 1500, priority: 'NORMAL' },
    entityType: 'order',
    entityId: 'order-001',
    userId: 'user-001',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new BusinessRulesService();
  });

  // ==========================================================================
  // TRIGGER EVENT
  // ==========================================================================

  describe('triggerEvent', () => {
    it('should return early when context is not provided', async () => {
      await service.triggerEvent(undefined as any);
      expect(businessRulesRepository.findActiveRulesByEventType).not.toHaveBeenCalled();
    });

    it('should find and execute rules for event type', async () => {
      (businessRulesRepository.findActiveRulesByEventType as jest.Mock).mockResolvedValue([
        mockRule,
      ]);
      (businessRulesRepository.createExecutionLog as jest.Mock).mockResolvedValue(undefined);

      await service.triggerEvent(mockContext);

      expect(businessRulesRepository.findActiveRulesByEventType).toHaveBeenCalledWith(
        RuleEventType.ORDER_CREATED
      );
      expect(businessRulesRepository.createExecutionLog).toHaveBeenCalled();
    });

    it('should handle multiple rules for the same event', async () => {
      const mockRule2: BusinessRule = {
        ...mockRule,
        ruleId: 'rule-002',
        priority: 5, // Lower priority, should execute second
      };

      (businessRulesRepository.findActiveRulesByEventType as jest.Mock).mockResolvedValue([
        mockRule,
        mockRule2,
      ]);
      (businessRulesRepository.createExecutionLog as jest.Mock).mockResolvedValue(undefined);

      await service.triggerEvent(mockContext);

      expect(businessRulesRepository.createExecutionLog).toHaveBeenCalledTimes(2);
    });
  });

  // ==========================================================================
  // EVALUATE CONDITIONS
  // ==========================================================================

  describe('evaluateCondition', () => {
    it('should evaluate EQUALS condition correctly', () => {
      const condition: RuleCondition = {
        conditionId: 'cond-001',
        ruleId: 'rule-001',
        field: 'status',
        operator: ConditionOperator.EQUALS,
        value: 'PENDING',
        order: 1,
      };

      const context = {
        ...mockContext,
        entity: { status: 'PENDING' },
      };

      const result = service['evaluateCondition'](condition, context);

      expect(result.result).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should evaluate NOT_EQUALS condition correctly', () => {
      const condition: RuleCondition = {
        conditionId: 'cond-001',
        ruleId: 'rule-001',
        field: 'status',
        operator: ConditionOperator.NOT_EQUALS,
        value: 'CANCELLED',
        order: 1,
      };

      const context = {
        ...mockContext,
        entity: { status: 'PENDING' },
      };

      const result = service['evaluateCondition'](condition, context);

      expect(result.result).toBe(true);
    });

    it('should evaluate GREATER_THAN condition correctly', () => {
      const condition: RuleCondition = {
        conditionId: 'cond-001',
        ruleId: 'rule-001',
        field: 'total',
        operator: ConditionOperator.GREATER_THAN,
        value: 1000,
        order: 1,
      };

      const context = {
        ...mockContext,
        entity: { total: 1500 },
      };

      const result = service['evaluateCondition'](condition, context);

      expect(result.result).toBe(true);
    });

    it('should evaluate LESS_THAN condition correctly', () => {
      const condition: RuleCondition = {
        conditionId: 'cond-001',
        ruleId: 'rule-001',
        field: 'quantity',
        operator: ConditionOperator.LESS_THAN,
        value: 100,
        order: 1,
      };

      const context = {
        ...mockContext,
        entity: { quantity: 50 },
      };

      const result = service['evaluateCondition'](condition, context);

      expect(result.result).toBe(true);
    });

    it('should evaluate GREATER_THAN_OR_EQUAL condition correctly', () => {
      const condition: RuleCondition = {
        conditionId: 'cond-001',
        ruleId: 'rule-001',
        field: 'total',
        operator: ConditionOperator.GREATER_THAN_OR_EQUAL,
        value: 1000,
        order: 1,
      };

      const context = {
        ...mockContext,
        entity: { total: 1000 },
      };

      const result = service['evaluateCondition'](condition, context);

      expect(result.result).toBe(true);
    });

    it('should evaluate LESS_THAN_OR_EQUAL condition correctly', () => {
      const condition: RuleCondition = {
        conditionId: 'cond-001',
        ruleId: 'rule-001',
        field: 'quantity',
        operator: ConditionOperator.LESS_THAN_OR_EQUAL,
        value: 100,
        order: 1,
      };

      const context = {
        ...mockContext,
        entity: { quantity: 100 },
      };

      const result = service['evaluateCondition'](condition, context);

      expect(result.result).toBe(true);
    });

    it('should evaluate CONTAINS condition correctly', () => {
      const condition: RuleCondition = {
        conditionId: 'cond-001',
        ruleId: 'rule-001',
        field: 'sku',
        operator: ConditionOperator.CONTAINS,
        value: 'ABC',
        order: 1,
      };

      const context = {
        ...mockContext,
        entity: { sku: 'XYZ-ABC-123' },
      };

      const result = service['evaluateCondition'](condition, context);

      expect(result.result).toBe(true);
    });

    it('should evaluate NOT_CONTAINS condition correctly', () => {
      const condition: RuleCondition = {
        conditionId: 'cond-001',
        ruleId: 'rule-001',
        field: 'sku',
        operator: ConditionOperator.NOT_CONTAINS,
        value: 'DEF',
        order: 1,
      };

      const context = {
        ...mockContext,
        entity: { sku: 'ABC-123' },
      };

      const result = service['evaluateCondition'](condition, context);

      expect(result.result).toBe(true);
    });

    it('should evaluate STARTS_WITH condition correctly', () => {
      const condition: RuleCondition = {
        conditionId: 'cond-001',
        ruleId: 'rule-001',
        field: 'sku',
        operator: ConditionOperator.STARTS_WITH,
        value: 'ABC',
        order: 1,
      };

      const context = {
        ...mockContext,
        entity: { sku: 'ABC-123' },
      };

      const result = service['evaluateCondition'](condition, context);

      expect(result.result).toBe(true);
    });

    it('should evaluate ENDS_WITH condition correctly', () => {
      const condition: RuleCondition = {
        conditionId: 'cond-001',
        ruleId: 'rule-001',
        field: 'sku',
        operator: ConditionOperator.ENDS_WITH,
        value: '123',
        order: 1,
      };

      const context = {
        ...mockContext,
        entity: { sku: 'ABC-123' },
      };

      const result = service['evaluateCondition'](condition, context);

      expect(result.result).toBe(true);
    });

    it('should evaluate IN condition correctly', () => {
      const condition: RuleCondition = {
        conditionId: 'cond-001',
        ruleId: 'rule-001',
        field: 'status',
        operator: ConditionOperator.IN,
        value: ['PENDING', 'PROCESSING'] as any,
        order: 1,
      };

      const context = {
        ...mockContext,
        entity: { status: 'PROCESSING' },
      };

      const result = service['evaluateCondition'](condition, context);

      expect(result.result).toBe(true);
    });

    it('should evaluate NOT_IN condition correctly', () => {
      const condition: RuleCondition = {
        conditionId: 'cond-001',
        ruleId: 'rule-001',
        field: 'status',
        operator: ConditionOperator.NOT_IN,
        value: ['CANCELLED', 'RETURNED'] as any,
        order: 1,
      };

      const context = {
        ...mockContext,
        entity: { status: 'PENDING' },
      };

      const result = service['evaluateCondition'](condition, context);

      expect(result.result).toBe(true);
    });

    it('should evaluate BETWEEN condition correctly', () => {
      const condition: RuleCondition = {
        conditionId: 'cond-001',
        ruleId: 'rule-001',
        field: 'quantity',
        operator: ConditionOperator.BETWEEN,
        value: 10,
        value2: 100,
        order: 1,
      };

      const context = {
        ...mockContext,
        entity: { quantity: 50 },
      };

      const result = service['evaluateCondition'](condition, context);

      expect(result.result).toBe(true);
    });

    it('should evaluate IS_NULL condition correctly', () => {
      const condition: RuleCondition = {
        conditionId: 'cond-001',
        ruleId: 'rule-001',
        field: 'cancelledAt',
        operator: ConditionOperator.IS_NULL,
        value: null,
        order: 1,
      };

      const context = {
        ...mockContext,
        entity: { cancelledAt: null },
      };

      const result = service['evaluateCondition'](condition, context);

      expect(result.result).toBe(true);
    });

    it('should evaluate IS_NOT_NULL condition correctly', () => {
      const condition: RuleCondition = {
        conditionId: 'cond-001',
        ruleId: 'rule-001',
        field: 'shippedAt',
        operator: ConditionOperator.IS_NOT_NULL,
        value: null,
        order: 1,
      };

      const context = {
        ...mockContext,
        entity: { shippedAt: new Date() },
      };

      const result = service['evaluateCondition'](condition, context);

      expect(result.result).toBe(true);
    });

    it('should evaluate MATCHES_REGEX condition correctly', () => {
      const condition: RuleCondition = {
        conditionId: 'cond-001',
        ruleId: 'rule-001',
        field: 'sku',
        operator: ConditionOperator.MATCHES_REGEX,
        value: '^ABC-\\d{3}$',
        order: 1,
      };

      const context = {
        ...mockContext,
        entity: { sku: 'ABC-123' },
      };

      const result = service['evaluateCondition'](condition, context);

      expect(result.result).toBe(true);
    });

    it('should handle nested field paths', () => {
      const condition: RuleCondition = {
        conditionId: 'cond-001',
        ruleId: 'rule-001',
        field: 'customer.status',
        operator: ConditionOperator.EQUALS,
        value: 'ACTIVE',
        order: 1,
      };

      const context = {
        ...mockContext,
        entity: { customer: { status: 'ACTIVE' } },
      };

      const result = service['evaluateCondition'](condition, context);

      expect(result.result).toBe(true);
    });

    it('should return error when field does not exist', () => {
      const condition: RuleCondition = {
        conditionId: 'cond-001',
        ruleId: 'rule-001',
        field: 'nonexistent.field',
        operator: ConditionOperator.EQUALS,
        value: 'test',
        order: 1,
      };

      const context = {
        ...mockContext,
        entity: { other: 'value' },
      };

      const result = service['evaluateCondition'](condition, context);

      expect(result.result).toBe(false);
    });
  });

  // ==========================================================================
  // EVALUATE RULE CONDITIONS
  // ==========================================================================

  describe('evaluateRuleConditions', () => {
    it('should return true for rule with no conditions', () => {
      const ruleWithNoConditions: BusinessRule = {
        ...mockRule,
        conditions: [],
      };

      const result = service.evaluateRuleConditions(ruleWithNoConditions, mockContext);

      expect(result.conditionsMet).toBe(true);
      expect(result.shouldExecute).toBe(true);
      expect(result.conditionResults).toEqual([]);
    });

    it('should evaluate single condition correctly', () => {
      const result = service.evaluateRuleConditions(mockRule, mockContext);

      expect(result.conditionsMet).toBe(true);
      expect(result.shouldExecute).toBe(true);
      expect(result.conditionResults).toHaveLength(1);
      expect(result.conditionResults[0].result).toBe(true);
    });

    it('should evaluate multiple conditions with AND logic', () => {
      const ruleWithMultipleConditions: BusinessRule = {
        ...mockRule,
        conditions: [
          {
            conditionId: 'cond-001',
            ruleId: 'rule-001',
            field: 'total',
            operator: ConditionOperator.GREATER_THAN,
            value: 1000,
            order: 1,
            logicalOperator: LogicalOperator.AND,
          },
          {
            conditionId: 'cond-002',
            ruleId: 'rule-001',
            field: 'priority',
            operator: ConditionOperator.EQUALS,
            value: 'NORMAL',
            order: 2,
          },
        ],
      };

      const context = {
        ...mockContext,
        entity: { total: 1500, priority: 'NORMAL' },
      };

      const result = service.evaluateRuleConditions(ruleWithMultipleConditions, context);

      expect(result.shouldExecute).toBe(true);
    });

    it('should evaluate multiple conditions with OR logic', () => {
      const ruleWithOrConditions: BusinessRule = {
        ...mockRule,
        conditions: [
          {
            conditionId: 'cond-001',
            ruleId: 'rule-001',
            field: 'total',
            operator: ConditionOperator.GREATER_THAN,
            value: 10000,
            order: 1,
            logicalOperator: LogicalOperator.OR,
          },
          {
            conditionId: 'cond-002',
            ruleId: 'rule-001',
            field: 'priority',
            operator: ConditionOperator.EQUALS,
            value: 'URGENT',
            order: 2,
          },
        ],
      };

      const context = {
        ...mockContext,
        entity: { total: 500, priority: 'URGENT' },
      };

      const result = service.evaluateRuleConditions(ruleWithOrConditions, context);

      expect(result.shouldExecute).toBe(true);
    });

    it('should return false when conditions are not met', () => {
      const result = service.evaluateRuleConditions(mockRule, {
        ...mockContext,
        entity: { total: 500 }, // Less than 1000 threshold
      });

      expect(result.conditionsMet).toBe(false);
      expect(result.shouldExecute).toBe(false);
    });
  });

  // ==========================================================================
  // EXECUTE ACTIONS
  // ==========================================================================

  describe('executeAction', () => {
    it('should execute SET_PRIORITY action', async () => {
      const action: RuleAction = {
        actionId: 'action-001',
        ruleId: 'rule-001',
        actionType: ActionType.SET_PRIORITY,
        parameters: { field: 'priority', value: 'HIGH' },
        order: 1,
      };

      const result = await service.executeAction(action, mockContext);

      expect(result).toEqual({
        type: 'SET_PRIORITY',
        field: 'priority',
        value: 'HIGH',
      });
    });

    it('should execute ASSIGN_USER action', async () => {
      const action: RuleAction = {
        actionId: 'action-001',
        ruleId: 'rule-001',
        actionType: ActionType.ASSIGN_USER,
        parameters: { userId: 'user-123', role: 'PICKER' },
        order: 1,
      };

      const result = await service.executeAction(action, mockContext);

      expect(result).toEqual({
        type: 'ASSIGN_USER',
        userId: 'user-123',
        role: 'PICKER',
      });
    });

    it('should execute SEND_NOTIFICATION action', async () => {
      const action: RuleAction = {
        actionId: 'action-001',
        ruleId: 'rule-001',
        actionType: ActionType.SEND_NOTIFICATION,
        parameters: {
          message: 'Order requires approval',
          recipients: ['manager@example.com'],
          type: 'EMAIL',
        },
        order: 1,
      };

      const result = await service.executeAction(action, mockContext);

      expect(result).toEqual({
        type: 'SEND_NOTIFICATION',
        message: 'Order requires approval',
        recipients: ['manager@example.com'],
        notificationType: 'EMAIL',
      });
    });

    it('should execute BLOCK_ACTION action', async () => {
      const action: RuleAction = {
        actionId: 'action-001',
        ruleId: 'rule-001',
        actionType: ActionType.BLOCK_ACTION,
        parameters: { reason: 'Credit limit exceeded' },
        order: 1,
      };

      const result = await service.executeAction(action, mockContext);

      expect(result).toEqual({
        type: 'BLOCK_ACTION',
        blocked: true,
        reason: 'Credit limit exceeded',
      });
    });

    it('should execute MODIFY_FIELD action', async () => {
      const action: RuleAction = {
        actionId: 'action-001',
        ruleId: 'rule-001',
        actionType: ActionType.MODIFY_FIELD,
        parameters: { field: 'total', value: 100 },
        order: 1,
      };

      const result = await service.executeAction(action, mockContext);

      expect(result).toEqual({
        type: 'MODIFY_FIELD',
        field: 'total',
        value: 100,
      });
    });

    it('should execute MODIFY_FIELD with add operation', async () => {
      const action: RuleAction = {
        actionId: 'action-001',
        ruleId: 'rule-001',
        actionType: ActionType.MODIFY_FIELD,
        parameters: { field: 'total', value: 50, operation: 'add' },
        order: 1,
      };

      const context = {
        ...mockContext,
        entity: { total: 100 },
      };

      const result = await service.executeAction(action, context);

      expect(result).toEqual({
        type: 'MODIFY_FIELD',
        field: 'total',
        value: 150, // 100 + 50
      });
    });

    it('should execute MODIFY_FIELD with multiply operation', async () => {
      const action: RuleAction = {
        actionId: 'action-001',
        ruleId: 'rule-001',
        actionType: ActionType.MODIFY_FIELD,
        parameters: { field: 'total', value: 2, operation: 'multiply' },
        order: 1,
      };

      const context = {
        ...mockContext,
        entity: { total: 100 },
      };

      const result = await service.executeAction(action, context);

      expect(result).toEqual({
        type: 'MODIFY_FIELD',
        field: 'total',
        value: 200, // 100 * 2
      });
    });

    it('should throw error for unknown action type', async () => {
      const action: RuleAction = {
        actionId: 'action-001',
        ruleId: 'rule-001',
        actionType: 'UNKNOWN' as ActionType,
        parameters: {},
        order: 1,
      };

      await expect(service.executeAction(action, mockContext)).rejects.toThrow(
        'Unknown action type'
      );
    });
  });

  // ==========================================================================
  // EVALUATE AND EXECUTE RULE
  // ==========================================================================

  describe('evaluateAndExecuteRule', () => {
    it('should execute actions when conditions are met', async () => {
      (businessRulesRepository.createExecutionLog as jest.Mock).mockResolvedValue(undefined);

      await service.evaluateAndExecuteRule(mockRule, mockContext);

      expect(businessRulesRepository.createExecutionLog).toHaveBeenCalledWith(
        expect.objectContaining({
          ruleId: 'rule-001',
          conditionsMet: true,
          executionResults: expect.any(Array),
        })
      );
    });

    it('should not execute actions when conditions are not met', async () => {
      (businessRulesRepository.createExecutionLog as jest.Mock).mockResolvedValue(undefined);

      const context = {
        ...mockContext,
        entity: { total: 500 }, // Below threshold
      };

      await service.evaluateAndExecuteRule(mockRule, context);

      expect(businessRulesRepository.createExecutionLog).toHaveBeenCalledWith(
        expect.objectContaining({
          conditionsMet: false,
          executionResults: [],
        })
      );
    });

    it('should handle action execution errors gracefully', async () => {
      // Create a rule with an action that will fail
      const ruleWithErrorAction: BusinessRule = {
        ...mockRule,
        actions: [
          {
            actionId: 'action-error',
            ruleId: 'rule-001',
            actionType: 'UNKNOWN' as ActionType,
            parameters: {},
            order: 1,
          },
        ],
      };

      (businessRulesRepository.createExecutionLog as jest.Mock).mockResolvedValue(undefined);

      await service.evaluateAndExecuteRule(ruleWithErrorAction, mockContext);

      const logCall = (businessRulesRepository.createExecutionLog as jest.Mock).mock.calls[0][0];
      expect(logCall.executionResults).toHaveLength(1);
      expect(logCall.executionResults[0].success).toBe(false);
      expect(logCall.executionResults[0].errorMessage).toBeDefined();
    });
  });

  // ==========================================================================
  // SINGLETON EXPORT
  // ==========================================================================

  describe('businessRulesService singleton', () => {
    it('should export singleton instance', () => {
      expect(businessRulesService).toBeInstanceOf(BusinessRulesService);
    });
  });
});
