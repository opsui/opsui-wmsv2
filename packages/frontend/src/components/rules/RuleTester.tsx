/**
 * Rule Tester component
 *
 * Tests business rules against sample data
 * Shows matched conditions and action results
 */

import { useState } from 'react';
import {
  PlayIcon,
  CheckCircleIcon,
  XCircleIcon,
  DocumentTextIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { cn } from '@/lib/utils';
import { RuleCondition } from './RuleBuilder';
import { RuleAction } from './ActionBuilder';

// ============================================================================
// TYPES
// ============================================================================

interface RuleTesterProps {
  conditions: RuleCondition[];
  actions: RuleAction[];
  className?: string;
}

interface TestResult {
  matched: boolean;
  matchedConditions?: Array<{
    condition: RuleCondition;
    result: boolean;
    reason?: string;
  }>;
  actions?: Array<{
    action: RuleAction;
    parameters: Record<string, any>;
  }>;
  error?: string;
}

// ============================================================================
// RULE EVALUATION ENGINE
// ============================================================================

function evaluateCondition(condition: RuleCondition, data: Record<string, any>): boolean {
  // Handle nested groups
  if (condition.conditions && condition.conditions.length > 0) {
    const logicalOperator = condition.logicalOperator || 'AND';
    const results = condition.conditions.map(c => evaluateCondition(c, data));

    if (logicalOperator === 'AND') {
      return results.every(r => r === true);
    } else {
      return results.some(r => r === true);
    }
  }

  // Get field value from data (supports dot notation)
  const fieldValue = getNestedValue(data, condition.field);
  const conditionValue = condition.value;

  // Evaluate based on operator
  switch (condition.operator) {
    case 'eq':
      return fieldValue === conditionValue;
    case 'ne':
      return fieldValue !== conditionValue;
    case 'gt':
      return (
        typeof fieldValue === 'number' &&
        typeof conditionValue === 'number' &&
        fieldValue > conditionValue
      );
    case 'gte':
      return (
        typeof fieldValue === 'number' &&
        typeof conditionValue === 'number' &&
        fieldValue >= conditionValue
      );
    case 'lt':
      return (
        typeof fieldValue === 'number' &&
        typeof conditionValue === 'number' &&
        fieldValue < conditionValue
      );
    case 'lte':
      return (
        typeof fieldValue === 'number' &&
        typeof conditionValue === 'number' &&
        fieldValue <= conditionValue
      );
    case 'contains':
      return typeof fieldValue === 'string' && fieldValue.includes(conditionValue);
    case 'not_contains':
      return typeof fieldValue === 'string' && !fieldValue.includes(conditionValue);
    case 'in':
      return Array.isArray(conditionValue) && conditionValue.includes(fieldValue);
    case 'not_in':
      return Array.isArray(conditionValue) && !conditionValue.includes(fieldValue);
    case 'exists':
      return fieldValue !== undefined && fieldValue !== null;
    case 'not_exists':
      return fieldValue === undefined || fieldValue === null;
    case 'is_empty':
      return fieldValue === '' || fieldValue === null || fieldValue === undefined;
    case 'is_not_empty':
      return fieldValue !== '' && fieldValue !== null && fieldValue !== undefined;
    default:
      return false;
  }
}

function getNestedValue(obj: Record<string, any>, path: string): any {
  return path.split('.').reduce((current, key) => current?.[key], obj);
}

function evaluateRule(
  conditions: RuleCondition[],
  actions: RuleAction[],
  testData: Record<string, any>
): TestResult {
  try {
    // Check if all top-level conditions match
    const conditionResults = conditions.map(condition => ({
      condition,
      result: evaluateCondition(condition, testData),
    }));

    const allMatched = conditionResults.every(r => r.result === true);

    if (!allMatched) {
      return {
        matched: false,
        matchedConditions: conditionResults,
      };
    }

    // Simulate action execution
    const actionResults = actions.map(action => ({
      action,
      parameters: { ...action.parameters },
    }));

    return {
      matched: true,
      matchedConditions: conditionResults,
      actions: actionResults,
    };
  } catch (error) {
    return {
      matched: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// ============================================================================
// SAMPLE DATA TEMPLATES
// ============================================================================

const SAMPLE_TEMPLATES = [
  {
    name: 'High Priority Order',
    data: {
      order: {
        orderId: 'ORD-001',
        status: 'PENDING',
        priority: 'URGENT',
        itemCount: 15,
        totalValue: 2500.0,
      },
      user: {
        userId: 'user-123',
        role: 'PICKER',
        email: 'picker@example.com',
      },
      sku: {
        skuId: 'SKU-001',
        quantity: 100,
      },
    },
  },
  {
    name: 'Low Inventory Alert',
    data: {
      sku: {
        skuId: 'SKU-002',
        quantity: 5,
        minThreshold: 10,
      },
      order: {
        status: 'PENDING',
      },
    },
  },
  {
    name: 'Picker Assignment',
    data: {
      user: {
        userId: 'user-456',
        role: 'PICKER',
        assignedTasks: 3,
      },
      order: {
        status: 'PENDING',
        zone: 'A',
      },
    },
  },
];

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function RuleTester({ conditions, actions, className }: RuleTesterProps) {
  const [testData, setTestData] = useState('');
  const [result, setResult] = useState<TestResult | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');

  const handleLoadTemplate = (templateName: string) => {
    const template = SAMPLE_TEMPLATES.find(t => t.name === templateName);
    if (template) {
      setSelectedTemplate(templateName);
      setTestData(JSON.stringify(template.data, null, 2));
      setResult(null);
    }
  };

  const handleTest = () => {
    try {
      const data = JSON.parse(testData || '{}');
      const testResult = evaluateRule(conditions, actions, data);
      setResult(testResult);
    } catch (error) {
      setResult({
        matched: false,
        error: 'Invalid JSON: ' + (error instanceof Error ? error.message : 'Unknown error'),
      });
    }
  };

  const isValidJson = () => {
    try {
      JSON.parse(testData || '{}');
      return true;
    } catch {
      return false;
    }
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-white">Test Rule</h3>
        <div className="flex gap-2">
          {SAMPLE_TEMPLATES.map(template => (
            <button
              key={template.name}
              onClick={() => handleLoadTemplate(template.name)}
              className={cn(
                'px-3 py-1.5 text-xs rounded-lg transition-colors',
                selectedTemplate === template.name
                  ? 'bg-primary-500/20 text-primary-400 border border-primary-500/30'
                  : 'bg-white/5 text-gray-400 border border-white/[0.08] hover:bg-white/10'
              )}
            >
              {template.name}
            </button>
          ))}
        </div>
      </div>

      {/* Test Data Input */}
      <div className="space-y-2">
        <label className="block text-xs text-gray-400">Test Data (JSON)</label>
        <div className="relative">
          <textarea
            value={testData}
            onChange={e => setTestData(e.target.value)}
            placeholder='{"order": {"status": "PENDING", "priority": "HIGH"}}'
            className={cn(
              'w-full h-48 px-4 py-3 rounded-lg bg-black/20 border text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm font-mono',
              isValidJson() || !testData ? 'border-white/[0.08]' : 'border-red-500/30'
            )}
          />
          {!isValidJson() && testData && (
            <div className="absolute top-2 right-2 text-xs text-red-400">Invalid JSON</div>
          )}
        </div>
      </div>

      {/* Test Button */}
      <button
        onClick={handleTest}
        disabled={!testData || !isValidJson() || conditions.length === 0}
        className={cn(
          'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
          !testData || !isValidJson() || conditions.length === 0
            ? 'bg-gray-500/20 text-gray-500 cursor-not-allowed'
            : 'bg-primary-500/20 text-primary-400 hover:bg-primary-500/30 border border-primary-500/30'
        )}
      >
        <PlayIcon className="h-4 w-4" />
        Test Rule
      </button>

      {/* Results */}
      {result && (
        <div className="space-y-3">
          {/* Match Status */}
          <div
            className={cn(
              'flex items-center gap-3 p-4 rounded-lg border',
              result.matched
                ? 'bg-green-500/10 border-green-500/30'
                : 'bg-red-500/10 border-red-500/30'
            )}
          >
            {result.matched ? (
              <CheckCircleIcon className="h-6 w-6 text-green-400 flex-shrink-0" />
            ) : (
              <XCircleIcon className="h-6 w-6 text-red-400 flex-shrink-0" />
            )}
            <div>
              <p
                className={cn(
                  'text-sm font-medium',
                  result.matched ? 'text-green-400' : 'text-red-400'
                )}
              >
                {result.matched ? 'Rule Matched!' : 'Rule Not Matched'}
              </p>
              <p className="text-xs text-gray-400">
                {result.matched
                  ? 'All conditions were met and actions will be executed'
                  : 'One or more conditions failed'}
              </p>
            </div>
          </div>

          {/* Error */}
          {result.error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30">
              <p className="text-sm text-red-400">{result.error}</p>
            </div>
          )}

          {/* Condition Results */}
          {result.matchedConditions && (
            <div className="space-y-2">
              <p className="text-xs text-gray-400">Condition Results:</p>
              <div className="space-y-1">
                {result.matchedConditions.map((item, index) => (
                  <ConditionResultItem
                    key={index}
                    condition={item.condition}
                    result={item.result}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Action Results */}
          {result.matched && result.actions && result.actions.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-gray-400">Actions to Execute:</p>
              <div className="space-y-1">
                {result.actions.map((item, index) => (
                  <ActionResultItem key={index} action={item.action} parameters={item.parameters} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// CONDITION RESULT ITEM
// ============================================================================

interface ConditionResultItemProps {
  condition: RuleCondition;
  result: boolean;
}

function ConditionResultItem({ condition, result }: ConditionResultItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const renderConditionText = (cond: RuleCondition): string => {
    if (cond.conditions) {
      return `[${cond.logicalOperator || 'AND'} Group]`;
    }
    return `${cond.field} ${cond.operator} ${cond.value}`;
  };

  return (
    <div className="flex items-start gap-2">
      {result ? (
        <CheckCircleIcon className="h-4 w-4 text-green-400 flex-shrink-0 mt-0.5" />
      ) : (
        <XCircleIcon className="h-4 w-4 text-red-400 flex-shrink-0 mt-0.5" />
      )}
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className={cn('text-sm', result ? 'text-green-400' : 'text-red-400')}>
            {renderConditionText(condition)}
          </span>
          {condition.conditions && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-xs text-gray-400 hover:text-white"
            >
              {isExpanded ? 'Hide' : 'Show'}
            </button>
          )}
        </div>
        {isExpanded && condition.conditions && (
          <div className="ml-4 mt-1 space-y-1">
            {condition.conditions.map((nested, i) => (
              <ConditionResultItem
                key={i}
                condition={nested}
                result={evaluateCondition(nested, {})} // This would need actual test data
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// ACTION RESULT ITEM
// ============================================================================

interface ActionResultItemProps {
  action: RuleAction;
  parameters: Record<string, any>;
}

function ActionResultItem({ action, parameters }: ActionResultItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const getActionLabel = (type: string): string => {
    switch (type) {
      case 'send_notification':
        return 'Send Notification';
      case 'update_field':
        return 'Update Field';
      case 'set_field':
        return 'Set Field';
      case 'add_tag':
        return 'Add Tag';
      default:
        return type;
    }
  };

  return (
    <div className="flex items-start gap-2">
      <DocumentTextIcon className="h-4 w-4 text-primary-400 flex-shrink-0 mt-0.5" />
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm text-primary-400">{getActionLabel(action.type)}</span>
          <span className="text-xs text-gray-400">
            {Object.entries(parameters)
              .filter(([_, v]) => v !== undefined && v !== '')
              .map(([k, v]) => `${k}=${v}`)
              .join(', ')}
          </span>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-xs text-gray-400 hover:text-white"
          >
            {isExpanded ? 'Hide' : 'Show'}
          </button>
        </div>
        {isExpanded && (
          <div className="ml-4 mt-1 p-2 rounded bg-black/20 text-xs">
            <pre className="text-gray-300">{JSON.stringify(parameters, null, 2)}</pre>
          </div>
        )}
      </div>
    </div>
  );
}
