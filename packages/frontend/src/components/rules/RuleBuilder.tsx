/**
 * Rule Builder component
 *
 * Visual condition builder for business rules with nested groups (AND/OR)
 * Field selector, operator selector, and value input with type validation
 */

import { useState } from 'react';
import {
  PlusIcon,
  TrashIcon,
  ChevronDownIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';
import { cn } from '@/lib/utils';

// ============================================================================
// TYPES
// ============================================================================

export interface RuleCondition {
  id: string;
  field: string;
  operator: string;
  value: any;
  logicalOperator?: 'AND' | 'OR'; // For grouping conditions
  conditions?: RuleCondition[]; // Nested conditions for groups
}

interface RuleBuilderProps {
  conditions: RuleCondition[];
  onChange: (conditions: RuleCondition[]) => void;
  availableFields?: FieldDefinition[];
  className?: string;
}

export interface FieldDefinition {
  field: string;
  label: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'select';
  options?: Array<{ value: string; label: string }>;
  operators?: Array<{ value: string; label: string }>;
}

// ============================================================================
// DEFAULT FIELD DEFINITIONS
// ============================================================================

const DEFAULT_FIELDS: FieldDefinition[] = [
  {
    field: 'order.status',
    label: 'Order Status',
    type: 'select',
    options: [
      { value: 'PENDING', label: 'Pending' },
      { value: 'PICKING', label: 'Picking' },
      { value: 'PICKED', label: 'Picked' },
      { value: 'PACKING', label: 'Packing' },
      { value: 'SHIPPED', label: 'Shipped' },
    ],
    operators: [
      { value: 'eq', label: 'Equals' },
      { value: 'ne', label: 'Not Equals' },
      { value: 'in', label: 'In' },
    ],
  },
  {
    field: 'order.priority',
    label: 'Order Priority',
    type: 'select',
    options: [
      { value: 'LOW', label: 'Low' },
      { value: 'NORMAL', label: 'Normal' },
      { value: 'HIGH', label: 'High' },
      { value: 'URGENT', label: 'Urgent' },
    ],
    operators: [
      { value: 'eq', label: 'Equals' },
      { value: 'ne', label: 'Not Equals' },
      { value: 'in', label: 'In' },
    ],
  },
  {
    field: 'order.itemCount',
    label: 'Item Count',
    type: 'number',
    operators: [
      { value: 'eq', label: 'Equals' },
      { value: 'ne', label: 'Not Equals' },
      { value: 'gt', label: 'Greater Than' },
      { value: 'gte', label: 'Greater or Equal' },
      { value: 'lt', label: 'Less Than' },
      { value: 'lte', label: 'Less or Equal' },
    ],
  },
  {
    field: 'order.totalValue',
    label: 'Order Total Value',
    type: 'number',
    operators: [
      { value: 'eq', label: 'Equals' },
      { value: 'ne', label: 'Not Equals' },
      { value: 'gt', label: 'Greater Than' },
      { value: 'gte', label: 'Greater or Equal' },
    ],
  },
  {
    field: 'sku.quantity',
    label: 'SKU Quantity',
    type: 'number',
    operators: [
      { value: 'eq', label: 'Equals' },
      { value: 'ne', label: 'Not Equals' },
      { value: 'lt', label: 'Less Than' },
      { value: 'lte', label: 'Less or Equal' },
    ],
  },
  {
    field: 'user.role',
    label: 'User Role',
    type: 'select',
    options: [
      { value: 'PICKER', label: 'Picker' },
      { value: 'PACKER', label: 'Packer' },
      { value: 'STOCK_CONTROLLER', label: 'Stock Controller' },
      { value: 'ADMIN', label: 'Admin' },
      { value: 'SUPERVISOR', label: 'Supervisor' },
    ],
    operators: [
      { value: 'eq', label: 'Equals' },
      { value: 'ne', label: 'Not Equals' },
      { value: 'in', label: 'In' },
    ],
  },
];

const getOperatorsForField = (field: FieldDefinition) => {
  return (
    field.operators || [
      { value: 'eq', label: 'Equals' },
      { value: 'ne', label: 'Not Equals' },
      { value: 'contains', label: 'Contains' },
    ]
  );
};

// ============================================================================
// CONDITION ROW COMPONENT
// ============================================================================

function ConditionRow({
  condition,
  fieldDefinitions,
  onUpdate,
  onDelete,
  onToggleGroup,
  level = 0,
}: {
  condition: RuleCondition;
  fieldDefinitions: FieldDefinition[];
  onUpdate: (condition: RuleCondition) => void;
  onDelete: () => void;
  onToggleGroup: () => void;
  level?: number;
}) {
  const [isExpanded, setIsExpanded] = useState(condition.conditions !== undefined);

  const fieldDef = fieldDefinitions.find(f => f.field === condition.field) || DEFAULT_FIELDS[0];
  const operators = getOperatorsForField(fieldDef);

  const isGroup = condition.conditions !== undefined;

  return (
    <div className={cn('space-y-2', level > 0 && 'ml-4 pl-4 border-l-2 border-white/[0.08]')}>
      <div className="flex items-center gap-2">
        {/* Logical Operator for groups with siblings */}
        {level > 0 && (
          <button
            onClick={onToggleGroup}
            className="p-1 text-gray-400 hover:text-white transition-colors"
          >
            <ChevronRightIcon
              className={cn('h-4 w-4 transition-transform', isExpanded && 'rotate-90')}
            />
          </button>
        )}

        {/* Condition Row */}
        <div
          className={cn(
            'flex-1 flex items-center gap-2 p-3 rounded-lg border transition-all',
            isGroup ? 'bg-primary-500/10 border-primary-500/30' : 'bg-white/5 border-white/[0.08]'
          )}
        >
          {/* Expand/Collapse button for groups */}
          {isGroup && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1 text-gray-400 hover:text-white transition-colors"
            >
              <ChevronDownIcon
                className={cn('h-4 w-4 transition-transform', isExpanded && 'rotate-180')}
              />
            </button>
          )}

          {/* Field Selector */}
          <select
            value={condition.field}
            onChange={e => onUpdate({ ...condition, field: e.target.value })}
            className="flex-1 px-3 py-2 rounded-lg bg-black/20 border border-white/[0.08] text-white focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
          >
            {fieldDefinitions.map(field => (
              <option key={field.field} value={field.field}>
                {field.label}
              </option>
            ))}
          </select>

          {/* Operator Selector */}
          <select
            value={condition.operator}
            onChange={e => onUpdate({ ...condition, operator: e.target.value })}
            className="px-3 py-2 rounded-lg bg-black/20 border border-white/[0.08] text-white focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
          >
            {operators.map(op => (
              <option key={op.value} value={op.value}>
                {op.label}
              </option>
            ))}
          </select>

          {/* Value Input */}
          <div className="flex-1">
            {fieldDef.type === 'select' ? (
              <select
                value={condition.value}
                onChange={e => onUpdate({ ...condition, value: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-black/20 border border-white/[0.08] text-white focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
              >
                <option value="">Select value...</option>
                {fieldDef.options?.map(opt => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            ) : fieldDef.type === 'boolean' ? (
              <select
                value={condition.value?.toString() || ''}
                onChange={e => onUpdate({ ...condition, value: e.target.value === 'true' })}
                className="w-full px-3 py-2 rounded-lg bg-black/20 border border-white/[0.08] text-white focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
              >
                <option value="">Select...</option>
                <option value="true">True</option>
                <option value="false">False</option>
              </select>
            ) : fieldDef.type === 'number' ? (
              <input
                type="number"
                value={condition.value || ''}
                onChange={e => onUpdate({ ...condition, value: parseFloat(e.target.value) || 0 })}
                placeholder="Value"
                className="w-full px-3 py-2 rounded-lg bg-black/20 border border-white/[0.08] text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
              />
            ) : fieldDef.type === 'date' ? (
              <input
                type="date"
                value={condition.value || ''}
                onChange={e => onUpdate({ ...condition, value: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-black/20 border border-white/[0.08] text-white focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
              />
            ) : (
              <input
                type="text"
                value={condition.value || ''}
                onChange={e => onUpdate({ ...condition, value: e.target.value })}
                placeholder="Value"
                className="w-full px-3 py-2 rounded-lg bg-black/20 border border-white/[0.08] text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
              />
            )}
          </div>

          {/* Add nested condition button for groups */}
          {isGroup && (
            <button
              onClick={() => {
                const newCondition: RuleCondition = {
                  id: `condition-${Date.now()}-${Math.random()}`,
                  field: fieldDefinitions[0].field,
                  operator: 'eq',
                  value: '',
                };
                onUpdate({
                  ...condition,
                  conditions: [...(condition.conditions || []), newCondition],
                });
              }}
              className="p-2 text-gray-400 hover:text-primary-400 transition-colors"
              title="Add condition"
            >
              <PlusIcon className="h-4 w-4" />
            </button>
          )}

          {/* Delete button */}
          <button
            onClick={onDelete}
            className="p-2 text-gray-400 hover:text-red-400 transition-colors"
            title="Delete"
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Nested conditions for groups */}
      {isGroup && isExpanded && condition.conditions && (
        <div className="space-y-2 mt-2">
          {condition.conditions.map((nestedCondition, index) => (
            <ConditionRow
              key={nestedCondition.id}
              condition={nestedCondition}
              fieldDefinitions={fieldDefinitions}
              onUpdate={updated => {
                const newConditions = [...condition.conditions!];
                newConditions[index] = updated;
                onUpdate({ ...condition, conditions: newConditions });
              }}
              onDelete={() => {
                const newConditions =
                  condition.conditions?.filter(c => c.id !== nestedCondition.id) || [];
                onUpdate({ ...condition, conditions: newConditions });
              }}
              onToggleGroup={() => {
                // Toggle logical operator for nested items
                const newConditions = [...condition.conditions!];
                newConditions[index] = {
                  ...newConditions[index],
                  logicalOperator: newConditions[index].logicalOperator === 'AND' ? 'OR' : 'AND',
                };
                onUpdate({ ...condition, conditions: newConditions });
              }}
              level={level + 1}
            />
          ))}

          {/* Logical operator selector for nested items */}
          {condition.conditions && condition.conditions.length > 1 && (
            <div className="flex items-center gap-2 ml-4 mt-2">
              <span className="text-xs text-gray-400">Conditions match:</span>
              <button
                onClick={() => onUpdate({ ...condition, logicalOperator: 'AND' })}
                className={cn(
                  'px-2 py-1 rounded text-xs transition-colors',
                  condition.logicalOperator === 'AND'
                    ? 'bg-primary-500/20 text-primary-400'
                    : 'bg-white/5 text-gray-400 hover:bg-white/10'
                )}
              >
                All
              </button>
              <button
                onClick={() => onUpdate({ ...condition, logicalOperator: 'OR' })}
                className={cn(
                  'px-2 py-1 rounded text-xs transition-colors',
                  condition.logicalOperator === 'OR'
                    ? 'bg-primary-500/20 text-primary-400'
                    : 'bg-white/5 text-gray-400 hover:bg-white/10'
                )}
              >
                Any
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// MAIN RULE BUILDER COMPONENT
// ============================================================================

export function RuleBuilder({
  conditions,
  onChange,
  availableFields = DEFAULT_FIELDS,
  className,
}: RuleBuilderProps) {
  const [idCounter, setIdCounter] = useState(0);

  const addCondition = () => {
    const newCondition: RuleCondition = {
      id: `condition-${Date.now()}-${idCounter}`,
      field: availableFields[0].field,
      operator: 'eq',
      value: '',
    };
    onChange([...conditions, newCondition]);
    setIdCounter(idCounter + 1);
  };

  const addConditionGroup = () => {
    const newGroup: RuleCondition = {
      id: `group-${Date.now()}-${idCounter}`,
      field: '',
      operator: '',
      value: '',
      logicalOperator: 'AND',
      conditions: [
        {
          id: `condition-${Date.now()}-${idCounter + 1}`,
          field: availableFields[0].field,
          operator: 'eq',
          value: '',
        },
        {
          id: `condition-${Date.now()}-${idCounter + 2}`,
          field: availableFields[0].field,
          operator: 'eq',
          value: '',
        },
      ],
    };
    onChange([...conditions, newGroup]);
    setIdCounter(idCounter + 3);
  };

  const updateCondition = (index: number, updated: RuleCondition) => {
    const newConditions = [...conditions];
    newConditions[index] = updated;
    onChange(newConditions);
  };

  const removeCondition = (index: number) => {
    const newConditions = conditions.filter((_, i) => i !== index);
    onChange(newConditions);
  };

  return (
    <div className={cn('space-y-3', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-white">Conditions</h3>
        <div className="flex gap-2">
          <button
            onClick={addCondition}
            className="flex items-center gap-1 px-3 py-1.5 text-sm text-primary-400 hover:text-primary-300 transition-colors"
          >
            <PlusIcon className="h-4 w-4" />
            Add Condition
          </button>
          <button
            onClick={addConditionGroup}
            className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-400 hover:text-white transition-colors"
          >
            <PlusIcon className="h-4 w-4" />
            Add Group
          </button>
        </div>
      </div>

      {/* Conditions List */}
      {conditions.length === 0 ? (
        <div className="text-center py-8 text-gray-400 text-sm border-2 border-dashed border-white/[0.08] rounded-lg">
          <p>No conditions added yet</p>
          <p className="text-xs mt-1">Click "Add Condition" to start building your rule</p>
        </div>
      ) : (
        <div className="space-y-2">
          {conditions.map((condition, index) => (
            <ConditionRow
              key={condition.id}
              condition={condition}
              fieldDefinitions={availableFields}
              onUpdate={updated => updateCondition(index, updated)}
              onDelete={() => removeCondition(index)}
              onToggleGroup={() => {
                const updated = {
                  ...condition,
                  logicalOperator: (condition.logicalOperator === 'AND' ? 'OR' : 'AND') as
                    | 'AND'
                    | 'OR',
                };
                updateCondition(index, updated);
              }}
            />
          ))}
        </div>
      )}

      {/* Logical operator for top-level conditions */}
      {conditions.length > 1 && (
        <div className="flex items-center gap-2 pt-2">
          <span className="text-xs text-gray-400">All conditions must match:</span>
          <button
            onClick={() => {
              // This would need to be handled at a higher level
              console.log('Toggle logical operator for root conditions');
            }}
            className="px-2 py-1 rounded text-xs bg-primary-500/20 text-primary-400"
          >
            AND
          </button>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// PREVIEW COMPONENT
// ============================================================================

interface RulePreviewProps {
  conditions: RuleCondition[];
  fieldDefinitions?: FieldDefinition[];
}

export function RulePreview({ conditions, fieldDefinitions = DEFAULT_FIELDS }: RulePreviewProps) {
  const renderCondition = (condition: RuleCondition): string => {
    if (condition.conditions) {
      // Group
      const operator = condition.logicalOperator || 'AND';
      const inner = condition.conditions.map(c => renderCondition(c)).join(` ${operator} `);
      return `(${inner})`;
    }

    const fieldDef = fieldDefinitions.find(f => f.field === condition.field) || DEFAULT_FIELDS[0];
    const operatorLabel =
      getOperatorsForField(fieldDef).find(o => o.value === condition.operator)?.label ||
      condition.operator;

    // Format value based on type
    let valueStr = '';
    if (fieldDef.type === 'select' && fieldDef.options) {
      const opt = fieldDef.options.find(o => o.value === condition.value);
      valueStr = opt?.label || condition.value;
    } else {
      valueStr = String(condition.value);
    }

    return `${fieldDef.label} ${operatorLabel} ${valueStr}`;
  };

  if (conditions.length === 0) {
    return (
      <div className="p-4 text-center text-gray-400 text-sm border-2 border-dashed border-white/[0.08] rounded-lg">
        No conditions to preview
      </div>
    );
  }

  const preview = conditions.map(c => renderCondition(c)).join(' AND ');

  return (
    <div className="p-3 rounded-lg bg-black/20 border border-white/[0.08]">
      <p className="text-xs text-gray-400 mb-1">Rule Preview:</p>
      <code className="text-sm text-primary-400 break-all">{preview}</code>
    </div>
  );
}
