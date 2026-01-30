/**
 * Business Rules Engine Service
 *
 * Core service for evaluating and executing business rules.
 * Supports configurable allocation logic and automated decision making.
 */

import { businessRulesRepository } from '../repositories/BusinessRulesRepository';
import {
  BusinessRule,
  RuleCondition,
  RuleAction,
  RuleExecutionLog,
  RuleEventType,
  ConditionOperator,
  ActionType,
  LogicalOperator,
} from '@opsui/shared';

// ============================================================================
// TYPES
// ============================================================================

interface RuleContext {
  eventType: RuleEventType;
  entity: any;
  entityType: string;
  entityId: string;
  userId: string;
}

interface ConditionEvaluationResult {
  condition: RuleCondition;
  result: boolean;
  error?: string;
}

interface RuleEvaluationResult {
  rule: BusinessRule;
  conditionsMet: boolean;
  conditionResults: ConditionEvaluationResult[];
  shouldExecute: boolean;
}

// ============================================================================
// SERVICE
// ============================================================================

export class BusinessRulesService {
  /**
   * Trigger rule evaluation for an event
   */
  async triggerEvent(context: RuleContext): Promise<void> {
    const startTime = Date.now();

    // Find all active rules for this event type
    const rules = await businessRulesRepository.findActiveRulesByEventType(context.eventType);

    // Evaluate and execute rules in priority order
    for (const rule of rules) {
      await this.evaluateAndExecuteRule(rule, context);
    }
  }

  /**
   * Evaluate and execute a single rule
   */
  async evaluateAndExecuteRule(rule: BusinessRule, context: RuleContext): Promise<void> {
    const startTime = Date.now();
    const executionResults: any[] = [];

    try {
      // Evaluate conditions
      const evaluationResult = this.evaluateRuleConditions(rule, context);

      // Create execution log
      const log: Omit<RuleExecutionLog, 'logId'> = {
        ruleId: rule.ruleId,
        eventType: context.eventType,
        entityId: context.entityId,
        entityType: context.entityType,
        triggeredAt: new Date(),
        triggeredBy: context.userId,
        conditionsMet: evaluationResult.conditionsMet,
        executionTimeMs: Date.now() - startTime,
        executionResults: [],
      };

      // If conditions are met, execute actions
      if (evaluationResult.shouldExecute) {
        for (const action of rule.actions) {
          try {
            const result = await this.executeAction(action, context);
            executionResults.push({
              actionId: action.actionId,
              actionType: action.actionType,
              success: true,
              result,
            });
          } catch (error: any) {
            executionResults.push({
              actionId: action.actionId,
              actionType: action.actionType,
              success: false,
              errorMessage: error.message,
            });
          }
        }
      }

      log.executionResults = executionResults;
      await businessRulesRepository.createExecutionLog(log);
    } catch (error: any) {
      // Log execution error
      await businessRulesRepository.createExecutionLog({
        ruleId: rule.ruleId,
        eventType: context.eventType,
        entityId: context.entityId,
        entityType: context.entityType,
        triggeredAt: new Date(),
        triggeredBy: context.userId,
        conditionsMet: false,
        executionTimeMs: Date.now() - startTime,
        executionResults: [],
        errorMessage: error.message,
      });
    }
  }

  /**
   * Evaluate all conditions for a rule
   */
  evaluateRuleConditions(rule: BusinessRule, context: RuleContext): RuleEvaluationResult {
    if (rule.conditions.length === 0) {
      // No conditions = always execute
      return {
        rule,
        conditionsMet: true,
        conditionResults: [],
        shouldExecute: true,
      };
    }

    const conditionResults: ConditionEvaluationResult[] = [];
    let finalResult = true;
    let currentOperator: LogicalOperator = LogicalOperator.AND;

    for (let i = 0; i < rule.conditions.length; i++) {
      const condition = rule.conditions[i];
      const result = this.evaluateCondition(condition, context);
      conditionResults.push(result);

      // Apply logical operator
      if (i === 0) {
        finalResult = result.result;
      } else {
        if (currentOperator === LogicalOperator.AND) {
          finalResult = finalResult && result.result;
        } else {
          finalResult = finalResult || result.result;
        }
      }

      // Set operator for next iteration
      currentOperator = condition.logicalOperator || LogicalOperator.AND;
    }

    const conditionsMet = conditionResults.every(r => r.result);

    return {
      rule,
      conditionsMet,
      conditionResults,
      shouldExecute: finalResult,
    };
  }

  /**
   * Evaluate a single condition
   */
  evaluateCondition(condition: RuleCondition, context: RuleContext): ConditionEvaluationResult {
    try {
      // Extract value from entity using dot notation
      const actualValue = this.getFieldValue(context.entity, condition.field);
      const expectedValue = condition.value;

      let result = false;

      switch (condition.operator) {
        case ConditionOperator.EQUALS:
          result = actualValue == expectedValue;
          break;

        case ConditionOperator.NOT_EQUALS:
          result = actualValue != expectedValue;
          break;

        case ConditionOperator.GREATER_THAN:
          result = this.compareValues(actualValue, expectedValue) > 0;
          break;

        case ConditionOperator.LESS_THAN:
          result = this.compareValues(actualValue, expectedValue) < 0;
          break;

        case ConditionOperator.GREATER_THAN_OR_EQUAL:
          result = this.compareValues(actualValue, expectedValue) >= 0;
          break;

        case ConditionOperator.LESS_THAN_OR_EQUAL:
          result = this.compareValues(actualValue, expectedValue) <= 0;
          break;

        case ConditionOperator.CONTAINS:
          result = String(actualValue).toLowerCase().includes(String(expectedValue).toLowerCase());
          break;

        case ConditionOperator.NOT_CONTAINS:
          result = !String(actualValue).toLowerCase().includes(String(expectedValue).toLowerCase());
          break;

        case ConditionOperator.STARTS_WITH:
          result = String(actualValue)
            .toLowerCase()
            .startsWith(String(expectedValue).toLowerCase());
          break;

        case ConditionOperator.ENDS_WITH:
          result = String(actualValue).toLowerCase().endsWith(String(expectedValue).toLowerCase());
          break;

        case ConditionOperator.IN:
          result = Array.isArray(expectedValue) && expectedValue.includes(actualValue);
          break;

        case ConditionOperator.NOT_IN:
          result = Array.isArray(expectedValue) && !expectedValue.includes(actualValue);
          break;

        case ConditionOperator.BETWEEN:
          const min = expectedValue;
          const max = condition.value2;
          result =
            this.compareValues(actualValue, min) >= 0 && this.compareValues(actualValue, max) <= 0;
          break;

        case ConditionOperator.IS_NULL:
          result = actualValue === null || actualValue === undefined;
          break;

        case ConditionOperator.IS_NOT_NULL:
          result = actualValue !== null && actualValue !== undefined;
          break;

        case ConditionOperator.MATCHES_REGEX:
          try {
            const regex = new RegExp(String(expectedValue));
            result = regex.test(String(actualValue));
          } catch (e) {
            result = false;
          }
          break;

        default:
          result = false;
      }

      return {
        condition,
        result,
      };
    } catch (error: any) {
      return {
        condition,
        result: false,
        error: error.message,
      };
    }
  }

  /**
   * Execute a rule action
   */
  async executeAction(action: RuleAction, context: RuleContext): Promise<any> {
    switch (action.actionType) {
      case ActionType.SET_PRIORITY:
        return this.actionSetPriority(action, context);

      case ActionType.ASSIGN_USER:
        return this.actionAssignUser(action, context);

      case ActionType.SEND_NOTIFICATION:
        return this.actionSendNotification(action, context);

      case ActionType.BLOCK_ACTION:
        return this.actionBlockAction(action, context);

      case ActionType.MODIFY_FIELD:
        return this.actionModifyField(action, context);

      default:
        throw new Error(`Unknown action type: ${action.actionType}`);
    }
  }

  // ==========================================================================
  // ACTION IMPLEMENTATIONS
  // ==========================================================================

  private async actionSetPriority(action: RuleAction, context: RuleContext): Promise<any> {
    const { field, value } = action.parameters;
    // This would typically update the entity in the database
    // For now, we return a marker indicating the action should be performed
    return {
      type: 'SET_PRIORITY',
      field: field || 'priority',
      value,
    };
  }

  private async actionAssignUser(action: RuleAction, context: RuleContext): Promise<any> {
    const { userId, role } = action.parameters;
    return {
      type: 'ASSIGN_USER',
      userId,
      role,
    };
  }

  private async actionSendNotification(action: RuleAction, context: RuleContext): Promise<any> {
    const { message, recipients, type } = action.parameters;
    // This would integrate with a notification service
    return {
      type: 'SEND_NOTIFICATION',
      message,
      recipients,
      notificationType: type,
    };
  }

  private async actionBlockAction(action: RuleAction, context: RuleContext): Promise<any> {
    const { reason } = action.parameters;
    // This would prevent an action from completing
    return {
      type: 'BLOCK_ACTION',
      blocked: true,
      reason,
    };
  }

  private async actionModifyField(action: RuleAction, context: RuleContext): Promise<any> {
    const { field, value, operation } = action.parameters;
    let finalValue = value;

    if (operation === 'add') {
      const currentValue = this.getFieldValue(context.entity, field);
      finalValue = Number(currentValue) + Number(value);
    } else if (operation === 'multiply') {
      const currentValue = this.getFieldValue(context.entity, field);
      finalValue = Number(currentValue) * Number(value);
    }

    return {
      type: 'MODIFY_FIELD',
      field,
      value: finalValue,
    };
  }

  // ==========================================================================
  // UTILITY METHODS
  // ==========================================================================

  /**
   * Get field value from object using dot notation
   */
  private getFieldValue(obj: any, fieldPath: string): any {
    const keys = fieldPath.split('.');
    let value = obj;

    for (const key of keys) {
      if (value === null || value === undefined) {
        return null;
      }
      value = value[key];
    }

    return value;
  }

  /**
   * Compare two values for sorting
   */
  private compareValues(a: any, b: any): number {
    if (a === null || a === undefined) return -1;
    if (b === null || b === undefined) return 1;

    const numA = Number(a);
    const numB = Number(b);

    if (!isNaN(numA) && !isNaN(numB)) {
      return numA - numB;
    }

    const strA = String(a).toLowerCase();
    const strB = String(b).toLowerCase();

    if (strA < strB) return -1;
    if (strA > strB) return 1;
    return 0;
  }
}

export const businessRulesService = new BusinessRulesService();
