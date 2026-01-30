/**
 * Action Builder component
 *
 * Configures rule actions with parameter inputs based on action type
 * Supports: send_notification, update_field, set_field, add_tag, etc.
 */

import { useState } from 'react';
import { CheckIcon, CogIcon, EnvelopeIcon, PencilIcon, TagIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { cn } from '@/lib/utils';

// ============================================================================
// TYPES
// ============================================================================

export interface RuleAction {
  id: string;
  type: string;
  parameters: Record<string, any>;
}

interface ActionBuilderProps {
  actions: RuleAction[];
  onChange: (actions: RuleAction[]) => void;
  className?: string;
}

// ============================================================================
// ACTION DEFINITIONS
// ============================================================================

const ACTION_TYPES = [
  {
    type: 'send_notification',
    label: 'Send Notification',
    icon: EnvelopeIcon,
    description: 'Send a notification to users',
    parameters: [
      { name: 'templateId', label: 'Template ID', type: 'string', placeholder: 'order_claimed' },
      { name: 'recipients', label: 'Recipients', type: 'string', placeholder: 'admin, supervisor' },
      { name: 'channels', label: 'Channels', type: 'string', placeholder: 'EMAIL, PUSH' },
    ],
  },
  {
    type: 'update_field',
    label: 'Update Field',
    icon: PencilIcon,
    description: 'Update a field on the entity',
    parameters: [
      { name: 'field', label: 'Field Name', type: 'string', placeholder: 'status, priority' },
      { name: 'value', label: 'New Value', type: 'string', placeholder: 'new value' },
    ],
  },
  {
    type: 'add_tag',
    label: 'Add Tag',
    icon: TagIcon,
    description: 'Add a tag to the entity',
    parameters: [
      { name: 'tag', label: 'Tag', type: 'string', placeholder: 'priority, urgent' },
    ],
  },
  {
    type: 'set_field',
    label: 'Set Field',
    icon: CogIcon,
    description: 'Set a field to a specific value',
    parameters: [
      { name: 'field', label: 'Field Name', type: 'string', placeholder: 'assigned_to' },
      { name: 'value', label: 'Value', type: 'string', placeholder: 'user123' },
    ],
  },
];

// ============================================================================
// ACTION PARAMETER EDITOR
// ============================================================================

interface ActionParameterEditorProps {
  parameter: {
    name: string;
    label: string;
    type: string;
    placeholder?: string;
  };
  value: any;
  onChange: (value: any) => void;
}

function ActionParameterEditor({ parameter, value, onChange }: ActionParameterEditorProps) {
  const inputId = `param-${parameter.name}`;

  switch (parameter.type) {
    case 'boolean':
      return (
        <select
          id={inputId}
          value={value?.toString() || ''}
          onChange={(e) => onChange(e.target.value === 'true')}
          className="w-full px-3 py-2 rounded-lg bg-black/20 border border-white/[0.08] text-white focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
        >
          <option value="">Select...</option>
          <option value="true">True</option>
          <option value="false">False</option>
        </select>
      );

    case 'number':
      return (
        <input
          type="number"
          id={inputId}
          value={value || ''}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          placeholder={parameter.placeholder}
          className="w-full px-3 py-2 rounded-lg bg-black/20 border border-white/[0.08] text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
        />
      );

    default:
      return (
        <input
          type="text"
          id={inputId}
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={parameter.placeholder}
          className="w-full px-3 py-2 rounded-lg bg-black/20 border border-white/[0.08] text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
        />
      );
  }
}

// ============================================================================
// ACTION ROW COMPONENT
// ============================================================================

function ActionRow({
  action,
  availableActionTypes = ACTION_TYPES,
  onUpdate,
  onDelete,
}: {
  action: RuleAction;
  availableActionTypes?: typeof ACTION_TYPES;
  onUpdate: (action: RuleAction) => void;
  onDelete: () => void;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const actionType = availableActionTypes.find(t => t.type === action.type) || ACTION_TYPES[0];
  const Icon = actionType?.icon || CogIcon;

  return (
    <div className="space-y-2">
      {/* Action Header */}
      <div
        className={cn(
          'flex items-center gap-3 p-3 rounded-lg border transition-all cursor-pointer hover:bg-white/5',
          isExpanded ? 'bg-primary-500/10 border-primary-500/30' : 'bg-white/5 border-white/[0.08]'
        )}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className={cn('p-2 rounded-full', isExpanded ? 'bg-primary-500/20' : 'bg-gray-500/20')}>
          <Icon className={cn('h-4 w-4', isExpanded ? 'text-primary-400' : 'text-gray-400')} />
        </div>

        <div className="flex-1">
          <div className="text-sm font-medium text-white">{actionType.label}</div>
          {!isExpanded && (
            <div className="text-xs text-gray-400">{actionType.description}</div>
          )}
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="p-1 text-gray-400 hover:text-red-400 transition-colors"
        >
          <XMarkIcon className="h-4 w-4" />
        </button>
      </div>

      {/* Expanded Parameters */}
      {isExpanded && (
        <div className="ml-9 space-y-2 p-3 rounded-lg bg-black/20 border border-white/[0.08]">
          {actionType.parameters.map((param) => (
            <div key={param.name}>
              <label className="block text-xs text-gray-400 mb-1">{param.label}</label>
              <ActionParameterEditor
                parameter={param}
                value={action.parameters[param.name]}
                onChange={(value) => onUpdate({ ...action, parameters: { ...action.parameters, [param.name]: value } })}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// MAIN ACTION BUILDER COMPONENT
// ============================================================================

export function ActionBuilder({ actions, onChange, className }: ActionBuilderProps) {
  const [idCounter, setIdCounter] = useState(0);

  const addAction = () => {
    const newAction: RuleAction = {
      id: `action-${Date.now()}-${idCounter}`,
      type: ACTION_TYPES[0].type,
      parameters: {},
    };
    onChange([...actions, newAction]);
    setIdCounter(idCounter + 1);
  };

  const updateAction = (index: number, updated: RuleAction) => {
    const newActions = [...actions];
    newActions[index] = updated;
    onChange(newActions);
  };

  const removeAction = (index: number) => {
    const newActions = actions.filter((_, i) => i !== index);
    onChange(newActions);
  };

  return (
    <div className={cn('space-y-3', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-white">Actions</h3>
        <button
          onClick={addAction}
          className="flex items-center gap-1 px-3 py-1.5 text-sm text-primary-400 hover:text-primary-300 transition-colors"
        >
          <CheckIcon className="h-4 w-4" />
          Add Action
        </button>
      </div>

      {/* Actions List */}
      {actions.length === 0 ? (
        <div className="text-center py-8 text-gray-400 text-sm border-2 border-dashed border-white/[0.08] rounded-lg">
          <p>No actions added yet</p>
          <p className="text-xs mt-1">Click "Add Action" to specify what happens when conditions are met</p>
        </div>
      ) : (
        <div className="space-y-2">
          {actions.map((action, index) => (
            <ActionRow
              key={action.id}
              action={action}
              onUpdate={(updated) => updateAction(index, updated)}
              onDelete={() => removeAction(index)}
            />
          ))}
        </div>
      )}

      {/* Preview */}
      {actions.length > 0 && (
        <div className="p-3 rounded-lg bg-black/20 border border-white/[0.08]">
          <p className="text-xs text-gray-400 mb-2">Action Summary:</p>
          <div className="space-y-1">
            {actions.map((action, index) => {
              const actionType = ACTION_TYPES.find(t => t.type === action.type);
              return (
                <div key={action.id} className="text-sm text-white flex items-center gap-2">
                  {index > 0 && <span className="text-gray-500">then</span>}
                  <span className="text-primary-400">{actionType?.label}: </span>
                  <span className="text-gray-300">
                    {Object.entries(action.parameters)
                      .filter(([_, v]) => v !== undefined && v !== '')
                      .map(([k, v], i, arr) => (
                        <span key={k}>
                          {k}={v}
                          {i < arr.length - 1 && ', '}
                        </span>
                      ))}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// ACTION PREVIEW COMPONENT
// ============================================================================

interface ActionPreviewProps {
  actions: RuleAction[];
}

export function ActionPreview({ actions }: ActionPreviewProps) {
  if (actions.length === 0) {
    return null;
  }

  return (
    <div className="space-y-1">
      {actions.map((action, index) => {
        const actionType = ACTION_TYPES.find(t => t.type === action.type);
        return (
          <div key={action.id} className="text-sm text-gray-300 flex items-center gap-2">
            {index > 0 && <span className="text-gray-500">→</span>}
            <span className="text-primary-400">{actionType?.label}:</span>
            <span>
              {Object.entries(action.parameters)
                .filter(([_, v]) => v !== undefined && v !== '')
                .map(([k, v], i, arr) => (
                  <span key={k}>
                    {k}={v}
                    {i < arr.length - 1 ? ', ' : ''}
                  </span>
                ))}
            </span>
          </div>
        );
      })}
    </div>
  );
}
