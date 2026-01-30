/**
 * Business Rules Page
 *
 * Manages business rules for the warehouse management system.
 * Provides interface for creating, editing, testing, and activating rules.
 */

import { useState } from 'react';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  XMarkIcon,
  BeakerIcon,
  PowerIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';
import {
  BusinessRule,
  RuleType,
  RuleStatus,
  ConditionOperator,
  ActionType,
  RuleEventType,
} from '@opsui/shared';
import { Header, Pagination, useToast, ConfirmDialog } from '@/components/shared';
import { RuleBuilder, ActionBuilder, RuleTester } from '@/components/rules';
import {
  useBusinessRules,
  useCreateBusinessRule,
  useUpdateBusinessRule,
  useDeleteBusinessRule,
  useActivateBusinessRule,
  useDeactivateBusinessRule,
} from '@/services/api';
import { cn } from '@/lib/utils';
import { useFormValidation } from '@/hooks/useFormValidation';

// ============================================================================
// TYPES
// ============================================================================

interface RuleConditionFormData {
  field: string;
  operator: ConditionOperator;
  value: string | number | boolean;
  value2?: string | number;
  logicalOperator: 'AND' | 'OR';
}

// ============================================================================
// MAIN PAGE COMPONENT
// ============================================================================

export function BusinessRulesPage() {
  const { showToast } = useToast();
  const [filter, setFilter] = useState<'ALL' | RuleStatus>('ALL');
  const [selectedRule, setSelectedRule] = useState<BusinessRule | undefined>();
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; ruleId: string }>({
    isOpen: false,
    ruleId: '',
  });

  // Use React Query hooks
  const { data, isLoading, error, refetch } = useBusinessRules();
  const createRule = useCreateBusinessRule();
  const updateRule = useUpdateBusinessRule();
  const deleteRule = useDeleteBusinessRule();
  const activateRuleMutation = useActivateBusinessRule();
  const deactivateRuleMutation = useDeactivateBusinessRule();

  const rules = data?.rules || [];

  const filteredRules = rules.filter(
    (rule: BusinessRule) => filter === 'ALL' || rule.status === filter
  );

  // Search
  const [searchTerm, setSearchTerm] = useState('');
  const searchedRules = filteredRules.filter((rule: BusinessRule) => {
    if (!searchTerm.trim()) return true;
    const search = searchTerm.toLowerCase();
    return (
      rule.name?.toLowerCase().includes(search) ||
      rule.description?.toLowerCase().includes(search) ||
      rule.ruleId?.toLowerCase().includes(search)
    );
  });

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const paginatedRules = searchedRules.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  const totalPages = Math.ceil(searchedRules.length / itemsPerPage);

  const handleDeleteRule = async (ruleId: string) => {
    setDeleteConfirm({ isOpen: true, ruleId });
  };

  const confirmDeleteRule = async () => {
    const { ruleId } = deleteConfirm;
    try {
      await deleteRule.mutateAsync(ruleId);
      showToast('Rule deleted successfully', 'success');
      refetch();
    } catch (error: any) {
      showToast(error?.message || 'Failed to delete rule', 'error');
    } finally {
      setDeleteConfirm({ isOpen: false, ruleId: '' });
    }
  };

  const handleToggleRule = async (rule: BusinessRule) => {
    try {
      if (rule.status === RuleStatus.ACTIVE) {
        await deactivateRuleMutation.mutateAsync(rule.ruleId);
        showToast('Rule deactivated successfully', 'success');
      } else {
        await activateRuleMutation.mutateAsync(rule.ruleId);
        showToast('Rule activated successfully', 'success');
      }
      refetch();
    } catch (error: any) {
      showToast(error?.message || 'Failed to toggle rule', 'error');
    }
  };

  return (
    <div className="min-h-screen">
      <Header />
      <main className="w-full px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Business Rules</h1>
          <p className="mt-2 text-gray-400">
            Configure automated decision logic for order allocation, picking, and shipping
          </p>
        </div>

        {/* Actions Bar */}
        <div className="mb-6 flex items-center justify-between gap-4">
          <div className="flex-1 max-w-md">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={e => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search rules..."
                className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => setFilter('ALL')}
              className={cn(
                'px-4 py-2 rounded-md font-medium transition-colors',
                filter === 'ALL'
                  ? 'bg-blue-900/50 text-blue-300 border border-blue-700'
                  : 'bg-white/5 text-gray-300 border border-white/[0.08] hover:bg-white/10'
              )}
            >
              All Rules
            </button>
            <button
              onClick={() => setFilter(RuleStatus.ACTIVE)}
              className={cn(
                'px-4 py-2 rounded-md font-medium transition-colors',
                filter === RuleStatus.ACTIVE
                  ? 'bg-green-900/50 text-green-300 border border-green-700'
                  : 'bg-white/5 text-gray-300 border border-white/[0.08] hover:bg-white/10'
              )}
            >
              Active
            </button>
            <button
              onClick={() => setFilter(RuleStatus.DRAFT)}
              className={cn(
                'px-4 py-2 rounded-md font-medium transition-colors',
                filter === RuleStatus.DRAFT
                  ? 'bg-yellow-900/50 text-yellow-300 border border-yellow-700'
                  : 'bg-white/5 text-gray-300 border border-white/[0.08] hover:bg-white/10'
              )}
            >
              Draft
            </button>
          </div>

          <button
            onClick={() => {
              setSelectedRule(undefined);
              setModalOpen(true);
            }}
            className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            New Rule
          </button>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
            <p className="mt-4 text-gray-400">Loading business rules...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-center">
            <p className="text-red-400">Failed to load business rules</p>
            <button
              onClick={() => refetch()}
              className="mt-2 text-sm text-red-300 hover:text-red-200 underline"
            >
              Retry
            </button>
          </div>
        )}

        {/* Rules Table */}
        {!isLoading && !error && (
          <div className="glass-card rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-800">
              <thead className="bg-gray-900/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Rule Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Priority
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Executions
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-gray-900/30 divide-y divide-gray-800">
                {paginatedRules.map(rule => (
                  <tr key={rule.ruleId} className="hover:bg-gray-800/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-white">{rule.name}</div>
                        <div className="text-sm text-gray-400">{rule.description}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-900/50 text-blue-300 border border-blue-700">
                        {rule.ruleType}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <StatusBadge status={rule.status} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                      {rule.priority}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                      {rule.executionCount || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => setSelectedRule(rule)}
                        className="text-purple-400 hover:text-purple-300 mr-3"
                        title="Test Rule"
                      >
                        <BeakerIcon className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleToggleRule(rule)}
                        className={cn(
                          'mr-3 transition-colors',
                          rule.status === RuleStatus.ACTIVE
                            ? 'text-green-400 hover:text-green-300'
                            : 'text-gray-400 hover:text-gray-300'
                        )}
                        title={rule.status === RuleStatus.ACTIVE ? 'Deactivate' : 'Activate'}
                      >
                        <PowerIcon
                          className={cn(
                            'h-5 w-5',
                            rule.status === RuleStatus.ACTIVE && 'text-green-400'
                          )}
                        />
                      </button>
                      <button
                        onClick={() => {
                          setSelectedRule(rule);
                          setModalOpen(true);
                        }}
                        className="text-blue-400 hover:text-blue-300 mr-3"
                        title="Edit Rule"
                      >
                        <PencilIcon className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleDeleteRule(rule.ruleId)}
                        className="text-red-400 hover:text-red-300"
                        title="Delete Rule"
                      >
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {totalPages > 1 && (
              <div className="mt-4 flex justify-center">
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                />
              </div>
            )}

            {paginatedRules.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-400">No business rules found</p>
                <button
                  onClick={() => {
                    setSelectedRule(undefined);
                    setModalOpen(true);
                  }}
                  className="mt-4 text-primary-400 hover:text-primary-300"
                >
                  Create your first rule
                </button>
              </div>
            )}
          </div>
        )}

        {/* Rule Modal */}
        {modalOpen && (
          <RuleModal
            rule={selectedRule}
            onClose={() => {
              setModalOpen(false);
              setSelectedRule(undefined);
            }}
            onSave={async ruleData => {
              if (selectedRule) {
                await updateRule.mutateAsync({
                  ruleId: selectedRule.ruleId,
                  updates: ruleData,
                });
              } else {
                await createRule.mutateAsync(ruleData);
              }
              refetch();
            }}
          />
        )}

        <ConfirmDialog
          isOpen={deleteConfirm.isOpen}
          onClose={() => setDeleteConfirm({ isOpen: false, ruleId: '' })}
          onConfirm={confirmDeleteRule}
          title="Delete Business Rule"
          message="Are you sure you want to delete this rule? This action cannot be undone."
          confirmText="Delete"
          cancelText="Cancel"
          variant="danger"
          isLoading={deleteRule.isPending}
        />

        {/* Test Panel */}
        {selectedRule && !modalOpen && (
          <TestPanel rule={selectedRule} onClose={() => setSelectedRule(undefined)} />
        )}
      </main>
    </div>
  );
}

// ============================================================================
// STATUS BADGE
// ============================================================================

function StatusBadge({ status }: { status: RuleStatus }) {
  const styles: Record<RuleStatus, string> = {
    [RuleStatus.DRAFT]: 'bg-yellow-100 text-yellow-800',
    [RuleStatus.ACTIVE]: 'bg-green-100 text-green-800',
    [RuleStatus.INACTIVE]: 'bg-gray-100 text-gray-800',
    [RuleStatus.ARCHIVED]: 'bg-red-100 text-red-800',
  };

  const icons: Record<RuleStatus, React.ReactNode> = {
    [RuleStatus.DRAFT]: <ClockIcon className="h-4 w-4 inline mr-1" />,
    [RuleStatus.ACTIVE]: <CheckCircleIcon className="h-4 w-4 inline mr-1" />,
    [RuleStatus.INACTIVE]: <XCircleIcon className="h-4 w-4 inline mr-1" />,
    [RuleStatus.ARCHIVED]: <XCircleIcon className="h-4 w-4 inline mr-1" />,
  };

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status]}`}>
      {icons[status]}
      {status}
    </span>
  );
}

// ============================================================================
// RULE MODAL
// ============================================================================

interface RuleModalProps {
  rule?: BusinessRule;
  onClose: () => void;
  onSave: (
    rule: Omit<BusinessRule, 'ruleId' | 'createdAt' | 'executionCount' | 'version' | 'createdBy'>
  ) => Promise<void> | void;
}

function RuleModal({ rule, onClose, onSave }: RuleModalProps) {
  const isEdit = !!rule;
  const { showToast } = useToast();

  // Convert existing rule conditions to RuleBuilder format
  const initialConditions =
    rule?.conditions?.map(cond => ({
      id: cond.conditionId,
      field: cond.field,
      operator: cond.operator,
      value: cond.value,
      logicalOperator: 'AND' as const,
    })) || [];

  // Convert existing rule actions to ActionBuilder format
  const initialActions =
    rule?.actions?.map(action => ({
      id: action.actionId,
      type: action.actionType,
      parameters: action.parameters,
    })) || [];

  const [conditions, setConditions] = useState(initialConditions);
  const [actions, setActions] = useState(initialActions);

  // Form validation
  const {
    values: formData,
    errors,
    handleChange,
    handleSubmit,
    isSubmitting,
    reset,
    setFieldValue,
  } = useFormValidation({
    initialValues: {
      name: rule?.name || '',
      description: rule?.description || '',
      ruleType: rule?.ruleType || RuleType.ALLOCATION,
      status: rule?.status || RuleStatus.DRAFT,
      priority: rule?.priority || 50,
      triggerEvents: rule?.triggerEvents || [RuleEventType.ORDER_CREATED],
    },
    validationRules: {
      name: {
        required: true,
        minLength: 3,
        maxLength: 100,
      },
      ruleType: {
        required: true,
      },
      priority: {
        required: true,
        custom: value => {
          const num = Number(value);
          if (isNaN(num) || num < 0 || num > 100) {
            return 'Priority must be between 0 and 100';
          }
          return null;
        },
      },
    },
    onSubmit: async values => {
      // Convert RuleBuilder conditions back to BusinessRule conditions
      const ruleConditions = conditions.map((cond, index) => ({
        conditionId: cond.id,
        ruleId: rule?.ruleId || '',
        field: cond.field,
        operator: cond.operator as ConditionOperator,
        value: cond.value,
        order: index,
      }));

      // Convert ActionBuilder actions back to BusinessRule actions
      const ruleActions = actions.map((action, index) => ({
        actionId: action.id,
        ruleId: rule?.ruleId || '',
        actionType: action.type as ActionType,
        parameters: action.parameters,
        order: index,
      }));

      try {
        await onSave({
          ...values,
          conditions: ruleConditions,
          actions: ruleActions,
        });
        showToast(isEdit ? 'Rule updated successfully' : 'Rule created successfully', 'success');
        onClose();
      } catch (error: any) {
        showToast(error?.message || 'Failed to save rule', 'error');
        throw error;
      }
    },
  });

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/[0.08]">
          <h2 className="text-xl font-bold text-white">
            {isEdit ? 'Edit Rule' : 'Create New Rule'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white transition-colors"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <form id="rule-form" onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Info */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-gray-400">Basic Information</h3>

              <div>
                <label className="block text-sm font-medium text-white mb-1">Rule Name *</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 bg-black/20 border text-white placeholder-gray-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                    errors.name ? 'border-red-500' : 'border-white/[0.08]'
                  }`}
                  placeholder="e.g., High Priority Order Allocation"
                  required
                />
                {errors.name && <p className="mt-1 text-sm text-red-400">{errors.name}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-1">Description</label>
                <textarea
                  rows={2}
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-black/20 border border-white/[0.08] text-white placeholder-gray-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Describe what this rule does..."
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-white mb-1">Rule Type *</label>
                  <select
                    name="ruleType"
                    value={formData.ruleType}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-black/20 border text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value={RuleType.ALLOCATION}>Allocation</option>
                    <option value={RuleType.PICKING}>Picking</option>
                    <option value={RuleType.SHIPPING}>Shipping</option>
                    <option value={RuleType.INVENTORY}>Inventory</option>
                    <option value={RuleType.VALIDATION}>Validation</option>
                    <option value={RuleType.NOTIFICATION}>Notification</option>
                  </select>
                  {errors.ruleType && (
                    <p className="mt-1 text-sm text-red-400">{errors.ruleType}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-white mb-1">Priority *</label>
                  <input
                    type="number"
                    name="priority"
                    value={formData.priority}
                    onChange={handleChange}
                    className={`w-full px-3 py-2 bg-black/20 border text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                      errors.priority ? 'border-red-500' : 'border-white/[0.08]'
                    }`}
                    min="0"
                    max="100"
                    required
                  />
                  {errors.priority && (
                    <p className="mt-1 text-sm text-red-400">{errors.priority}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-white mb-1">
                    Initial Status
                  </label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-black/20 border border-white/[0.08] text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value={RuleStatus.DRAFT}>Draft</option>
                    <option value={RuleStatus.ACTIVE}>Active</option>
                    <option value={RuleStatus.INACTIVE}>Inactive</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Conditions */}
            <div className="space-y-4">
              <RuleBuilder
                conditions={conditions}
                onChange={setConditions}
                className="p-4 rounded-lg bg-white/5 border border-white/[0.08]"
              />
            </div>

            {/* Actions */}
            <div className="space-y-4">
              <ActionBuilder
                actions={actions}
                onChange={setActions}
                className="p-4 rounded-lg bg-white/5 border border-white/[0.08]"
              />
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t border-white/[0.08]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-white/[0.08] rounded-lg text-gray-300 hover:bg-white/5 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="rule-form"
            disabled={isSubmitting}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Saving...' : isEdit ? 'Update Rule' : 'Create Rule'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// TEST PANEL
// ============================================================================

interface TestPanelProps {
  rule: BusinessRule;
  onClose: () => void;
}

function TestPanel({ rule, onClose }: TestPanelProps) {
  // Convert rule conditions to RuleBuilder format
  const conditions =
    rule.conditions?.map(cond => ({
      id: cond.conditionId,
      field: cond.field,
      operator: cond.operator,
      value: cond.value,
      logicalOperator: 'AND' as const,
    })) || [];

  // Convert rule actions to ActionBuilder format
  const actions =
    rule.actions?.map(action => ({
      id: action.actionId,
      type: action.actionType,
      parameters: action.parameters,
    })) || [];

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/[0.08]">
          <div>
            <h2 className="text-xl font-bold text-white">Test Rule: {rule.name}</h2>
            <p className="text-sm text-gray-400 mt-1">{rule.description}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white transition-colors"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-2 gap-6">
            {/* Rule Preview */}
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-medium text-white mb-3">Conditions</h3>
                <RulePreview conditions={conditions} />
              </div>

              <div>
                <h3 className="text-sm font-medium text-white mb-3">Actions</h3>
                <ActionPreview actions={actions} />
              </div>
            </div>

            {/* Tester */}
            <div>
              <RuleTester conditions={conditions} actions={actions} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// PREVIEW COMPONENTS
// ============================================================================

interface RulePreviewProps {
  conditions: Array<{
    id: string;
    field: string;
    operator: string;
    value: any;
    logicalOperator?: 'AND' | 'OR';
  }>;
}

function RulePreview({ conditions }: RulePreviewProps) {
  if (conditions.length === 0) {
    return (
      <div className="p-4 rounded-lg bg-white/5 border border-white/[0.08] text-center text-gray-400 text-sm">
        No conditions defined
      </div>
    );
  }

  return (
    <div className="p-4 rounded-lg bg-white/5 border border-white/[0.08] space-y-2">
      {conditions.map((cond, index) => (
        <div key={cond.id} className="text-sm">
          <span className="text-gray-400">{index > 0 ? 'AND ' : ''}</span>
          <span className="text-white">{cond.field}</span>
          <span className="text-primary-400 mx-1">{cond.operator}</span>
          <span className="text-white">{JSON.stringify(cond.value)}</span>
        </div>
      ))}
    </div>
  );
}

interface ActionPreviewProps {
  actions: Array<{
    id: string;
    type: string;
    parameters: Record<string, any>;
  }>;
}

function ActionPreview({ actions }: ActionPreviewProps) {
  if (actions.length === 0) {
    return (
      <div className="p-4 rounded-lg bg-white/5 border border-white/[0.08] text-center text-gray-400 text-sm">
        No actions defined
      </div>
    );
  }

  return (
    <div className="p-4 rounded-lg bg-white/5 border border-white/[0.08] space-y-2">
      {actions.map((action, index) => (
        <div key={action.id} className="text-sm">
          <span className="text-gray-400">{index > 0 ? 'THEN ' : ''}</span>
          <span className="text-green-400">{action.type}</span>
          <span className="text-gray-300 text-xs ml-2">
            {Object.entries(action.parameters)
              .filter(([_, v]) => v !== undefined && v !== '')
              .map(([k, v]) => `${k}=${v}`)
              .join(', ')}
          </span>
        </div>
      ))}
    </div>
  );
}
