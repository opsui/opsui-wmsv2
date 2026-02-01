/**
 * Cycle Counting Page
 *
 * Interface for scheduling and performing cycle counts
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useCycleCountPlans,
  useCreateCycleCountPlan,
  useStockControlInventory,
  useBinLocations,
  useAssignableUsers,
  useCycleCountDashboard,
} from '@/services/api';
import { useAuthStore } from '@/stores';
import { CycleCountStatus, CycleCountType, UserRole } from '@opsui/shared';
import {
  ClipboardDocumentListIcon,
  PlusIcon,
  ChartBarIcon,
  ClipboardDocumentCheckIcon,
  MagnifyingGlassIcon,
  CalendarDaysIcon,
  LightBulbIcon,
  ChevronLeftIcon,
} from '@heroicons/react/24/outline';
import { Header, Select, Pagination, Button } from '@/components/shared';
import { useToast } from '@/components/shared';
import { useFormValidation } from '@/hooks/useFormValidation';

// ============================================================================
// COMPONENTS
// ============================================================================

// Tab Button Component
function TabButton({
  active,
  onClick,
  children,
  icon: Icon,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
        active
          ? 'bg-blue-600 text-white shadow-lg'
          : 'text-gray-400 hover:text-white hover:bg-gray-800'
      }`}
    >
      <Icon className="h-5 w-5" />
      {children}
    </button>
  );
}

function StatusBadge({ status }: { status: CycleCountStatus }) {
  const styles = {
    [CycleCountStatus.SCHEDULED]: 'bg-gray-100 text-gray-800',
    [CycleCountStatus.IN_PROGRESS]: 'bg-blue-100 text-blue-800',
    [CycleCountStatus.COMPLETED]: 'bg-green-100 text-green-800',
    [CycleCountStatus.RECONCILED]: 'bg-purple-100 text-purple-800',
    [CycleCountStatus.CANCELLED]: 'bg-red-100 text-red-800',
  };

  const labels = {
    [CycleCountStatus.SCHEDULED]: 'Scheduled',
    [CycleCountStatus.IN_PROGRESS]: 'In Progress',
    [CycleCountStatus.COMPLETED]: 'Completed',
    [CycleCountStatus.RECONCILED]: 'Reconciled',
    [CycleCountStatus.CANCELLED]: 'Cancelled',
  };

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}

function CreateCycleCountModal({
  onClose,
  onSuccess,
  assignableUsers,
}: {
  onClose: () => void;
  onSuccess: () => void;
  assignableUsers: Array<{ userId: string; name: string; role: string }>;
}) {
  const { user } = useAuthStore();
  const { showToast } = useToast();
  const createMutation = useCreateCycleCountPlan();
  const [skuSearch, setSkuSearch] = useState('');

  // Fetch SKUs and bin locations
  const { data: inventoryData, isLoading: loadingInventory } = useStockControlInventory({
    limit: 1000,
  });
  const { data: binsData, isLoading: loadingBins } = useBinLocations();

  const skus = inventoryData?.items || [];
  const binLocations = binsData || [];

  // Filter SKUs based on search
  const filteredSkus = skuSearch
    ? skus.filter(
        (item: any) =>
          item.sku?.toLowerCase().includes(skuSearch.toLowerCase()) ||
          item.name?.toLowerCase().includes(skuSearch.toLowerCase())
      )
    : skus;

  // Deduplicate SKUs
  const uniqueSkus = Array.from(
    new Map(filteredSkus.map((item: any) => [item.sku, item])).values()
  );

  // Type-specific configuration
  const getTypeConfig = (countType: string) => {
    switch (countType) {
      case CycleCountType.BLANKET:
        return {
          locationRequired: true,
          locationLabel: 'Location *',
          locationHint: 'Counts ALL items in selected location',
          showSku: false,
          notesPlaceholder: 'Any additional notes...',
        };
      case CycleCountType.ABC:
        return {
          locationRequired: false,
          locationLabel: 'Location (Optional)',
          locationHint: 'Counts high-value items based on ABC category',
          showSku: true,
          notesPlaceholder: 'Any additional notes...',
        };
      case CycleCountType.RECEIVING:
        return {
          locationRequired: false,
          locationLabel: 'Location (Optional)',
          locationHint: 'Count during receiving process',
          showSku: true,
          notesPlaceholder: 'Add PO # or shipment details here...',
        };
      case CycleCountType.SHIPPING:
        return {
          locationRequired: false,
          locationLabel: 'Location (Optional)',
          locationHint: 'Count during shipping process',
          showSku: true,
          notesPlaceholder: 'Add Order # or customer details here...',
        };
      default:
        return {
          locationRequired: false,
          locationLabel: 'Location (Optional - leave blank for all locations)',
          locationHint: '',
          showSku: true,
          notesPlaceholder: 'Additional instructions or notes...',
        };
    }
  };

  // Form validation
  const {
    values: formData,
    errors,
    handleChange,
    handleSubmit,
    isSubmitting,
    setFieldValue,
  } = useFormValidation({
    initialValues: {
      planName: '',
      countType: CycleCountType.AD_HOC,
      scheduledDate: new Date().toISOString().split('T')[0],
      location: '',
      sku: '',
      notes: '',
      assignedTo: user?.userId || '',
    },
    validationRules: {
      planName: { required: true, minLength: 3, maxLength: 100 },
      countType: { required: true },
      scheduledDate: { required: true },
      assignedTo: { required: true },
      location: {
        custom: (value: string) => {
          const typeConfig = getTypeConfig(formData.countType);
          if (typeConfig.locationRequired && !value) {
            return 'Location is required for Blanket counts';
          }
          return null;
        },
      },
    },
    onSubmit: async values => {
      try {
        await createMutation.mutateAsync({
          planName: values.planName,
          countType: values.countType,
          scheduledDate: values.scheduledDate,
          location: values.location,
          sku: values.sku,
          notes: values.notes,
          countBy: values.assignedTo,
        });
        showToast('Cycle count plan created successfully', 'success');
        onSuccess();
        onClose();
      } catch (error: any) {
        console.error('Failed to create cycle count plan:', error);
        showToast(error?.message || 'Failed to create plan', 'error');
        throw error;
      }
    },
  });

  const typeConfig = getTypeConfig(formData.countType);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-lg shadow-xl max-w-lg w-full mx-4 border border-gray-800">
        <div className="p-6 border-b border-gray-800">
          <h2 className="text-xl font-semibold text-white">Create Cycle Count Plan</h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Plan Name *</label>
            <input
              type="text"
              name="planName"
              required
              value={formData.planName}
              onChange={handleChange}
              className={`w-full px-3 py-2 bg-gray-800 border rounded-lg focus:ring-2 focus:ring-blue-500 text-white placeholder-gray-500 ${
                errors.planName ? 'border-red-500' : 'border-gray-700'
              }`}
              placeholder="e.g., Zone A Weekly Count"
            />
            {errors.planName && <p className="mt-1 text-sm text-red-400">{errors.planName}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Count Type *</label>
            <Select
              required
              name="countType"
              value={formData.countType}
              options={[
                { value: CycleCountType.AD_HOC, label: 'Ad-Hoc Count - General purpose counting' },
                { value: CycleCountType.ABC, label: 'ABC Analysis - High-value items' },
                {
                  value: CycleCountType.BLANKET,
                  label: 'Blanket Count - Count ALL items in a location',
                },
                { value: CycleCountType.SPOT_CHECK, label: 'Spot Check - Random verification' },
                {
                  value: CycleCountType.RECEIVING,
                  label: 'Receiving Count - During goods receipt',
                },
                { value: CycleCountType.SHIPPING, label: 'Shipping Count - Before dispatch' },
              ]}
            />
            {errors.countType && <p className="mt-1 text-sm text-red-400">{errors.countType}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Assigned To *</label>
            <Select
              required
              name="assignedTo"
              value={formData.assignedTo}
              options={[
                { value: '', label: 'Select a user...' },
                ...assignableUsers.map(u => ({
                  value: u.userId,
                  label: `${u.name} (${u.role})`,
                })),
              ]}
            />
            {errors.assignedTo && <p className="mt-1 text-sm text-red-400">{errors.assignedTo}</p>}
          </div>

          <div>
            <label
              className={`block text-sm font-medium text-gray-300 mb-1 ${typeConfig.locationRequired ? 'text-yellow-400' : ''}`}
            >
              {typeConfig.locationLabel}
            </label>
            <Select
              name="location"
              value={formData.location}
              required={typeConfig.locationRequired}
              options={[
                {
                  value: '',
                  label: typeConfig.locationRequired ? 'Select a location...' : 'All Locations',
                },
                ...binLocations.map((bin: any) => ({
                  value: bin.binId,
                  label: `${bin.binId} ${bin.zone ? `(${bin.zone})` : ''}`,
                })),
              ]}
            />
            {errors.location && <p className="mt-1 text-sm text-red-400">{errors.location}</p>}
            {typeConfig.locationHint && (
              <p className="text-xs text-blue-400 mt-1">{typeConfig.locationHint}</p>
            )}
            {loadingBins && <p className="text-xs text-gray-500 mt-1">Loading locations...</p>}
          </div>

          {typeConfig.showSku ? (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                SKUs (Optional - separate multiple SKUs with commas)
              </label>
              <div className="relative">
                <input
                  type="text"
                  name="sku"
                  value={formData.sku}
                  onChange={e => {
                    const value = e.target.value.toUpperCase();
                    handleChange({
                      ...e,
                      target: { ...e.target, name: 'sku', value },
                    } as React.ChangeEvent<HTMLInputElement>);
                    // Get the last SKU after comma for search
                    const lastCommaIndex = value.lastIndexOf(',');
                    const searchValue =
                      lastCommaIndex >= 0 ? value.slice(lastCommaIndex + 1).trim() : value;
                    setSkuSearch(searchValue);
                  }}
                  onFocus={() => {
                    // Get the last SKU after comma for search
                    const lastCommaIndex = formData.sku.lastIndexOf(',');
                    const searchValue =
                      lastCommaIndex >= 0
                        ? formData.sku.slice(lastCommaIndex + 1).trim()
                        : formData.sku;
                    setSkuSearch(searchValue);
                  }}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 text-white placeholder-gray-500"
                  placeholder="Search SKUs (comma-separated)..."
                  autoComplete="off"
                />
                {skuSearch && uniqueSkus.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-lg max-h-60 overflow-auto">
                    {uniqueSkus.slice(0, 20).map((item: any, index: number) => (
                      <div
                        key={`${item.sku}-${index}`}
                        onClick={() => {
                          // Append SKU to existing ones with comma
                          const currentSkus = formData.sku
                            ? formData.sku
                                .split(',')
                                .map(s => s.trim())
                                .filter(s => s)
                            : [];
                          if (!currentSkus.includes(item.sku)) {
                            const newSkus = [...currentSkus, item.sku].join(', ');
                            setFieldValue('sku', newSkus);
                          }
                          setSkuSearch('');
                        }}
                        className="px-3 py-2 text-gray-300 hover:bg-gray-700 cursor-pointer text-sm"
                      >
                        <div className="font-medium">{item.sku}</div>
                        <div className="text-xs text-gray-500">{item.name}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {loadingInventory && <p className="text-xs text-gray-500 mt-1">Loading SKUs...</p>}
              {formData.sku && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {formData.sku.split(',').map((s, i) => {
                    const trimmedSku = s.trim();
                    return trimmedSku ? (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1 px-2 py-1 bg-blue-500/20 border border-blue-500/30 rounded text-sm text-blue-400"
                      >
                        {trimmedSku}
                        <button
                          type="button"
                          onClick={() => {
                            const currentSkus = formData.sku
                              .split(',')
                              .map(sku => sku.trim())
                              .filter(sku => sku);
                            const newSkus = currentSkus.filter((_, idx) => idx !== i).join(', ');
                            setFieldValue('sku', newSkus);
                          }}
                          className="hover:text-blue-300"
                        >
                          ×
                        </button>
                      </span>
                    ) : null;
                  })}
                </div>
              )}
            </div>
          ) : (
            <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
              <p className="text-sm text-blue-400">
                <strong>Blanket Count:</strong> All SKUs in the selected location will be counted.
                Individual SKU selection is not available for this type.
              </p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Notes</label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows={3}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 text-white placeholder-gray-500"
              placeholder={typeConfig.notesPlaceholder}
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-700 rounded-lg text-gray-300 hover:bg-gray-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || createMutation.isPending}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {isSubmitting || createMutation.isPending ? 'Creating...' : 'Create Plan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN PAGE
// ============================================================================

export function CycleCountingPage() {
  const { showToast: _showToast } = useToast();
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState<CycleCountStatus | ''>('');
  const [activeTab, setActiveTab] = useState<'counts' | 'analytics' | 'schedules'>('counts');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [searchTerm, setSearchTerm] = useState('');

  const {
    data: plansData,
    isLoading,
    refetch: _refetch,
  } = useCycleCountPlans({
    status: filterStatus || undefined,
  });

  // Debug logging (can be removed after verification)
  // console.log('[CycleCountingPage] filterStatus:', filterStatus, 'plans:', plansData?.plans?.length, 'user:', user?.userId, user?.role);

  // Fetch assignable users for the dropdown
  const { data: assignableUsers = [] } = useAssignableUsers();

  // Fetch KPI dashboard data for analytics tab
  const { data: dashboard, isLoading: dashboardLoading } = useCycleCountDashboard();

  const plans = plansData?.plans || [];

  // Search filtering
  const filteredPlans = plans.filter((plan: any) => {
    if (!searchTerm.trim()) return true;
    const search = searchTerm.toLowerCase();
    return (
      plan.planName?.toLowerCase().includes(search) ||
      plan.planId?.toLowerCase().includes(search) ||
      plan.location?.toLowerCase().includes(search) ||
      plan.sku?.toLowerCase().includes(search)
    );
  });

  // Pagination
  const paginatedPlans = filteredPlans.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  const totalPages = Math.ceil(filteredPlans.length / itemsPerPage);

  // Reset page when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  // Debug: Log full plans data (can be removed after verification)
  // if (plans.length > 0) {
  //   console.log('[CycleCountingPage] Plans data:', JSON.stringify(plans, null, 2));
  // }

  const overallKPIs = dashboard?.overallKPIs;
  const accuracyTrend = dashboard?.accuracyTrend || [];
  const topDiscrepancies = dashboard?.topDiscrepancies || [];
  const userPerformance = dashboard?.userPerformance || [];
  const zonePerformance = dashboard?.zonePerformance || [];
  const countTypeEffectiveness = dashboard?.countTypeEffectiveness || [];

  // Helper to get user name from userId
  const getUserName = (userId: string) => {
    const foundUser = assignableUsers?.find(u => u.userId === userId);
    return foundUser?.name || userId;
  };

  const canCreatePlan =
    user?.role === UserRole.STOCK_CONTROLLER ||
    user?.role === UserRole.SUPERVISOR ||
    user?.role === UserRole.ADMIN;

  const canViewAnalytics = user?.role === UserRole.SUPERVISOR || user?.role === UserRole.ADMIN;

  return (
    <div className="min-h-screen">
      <Header />
      <main className="w-full px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <Button
                variant="secondary"
                onClick={() => navigate(-1)}
                className="flex items-center gap-2"
              >
                <ChevronLeftIcon className="h-4 w-4" />
                Back to Dashboard
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-white">Cycle Counting</h1>
                <p className="text-gray-400 mt-1">
                  Manage scheduled and ad-hoc inventory cycle counts
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {/* Tab Navigation */}
              <div className="flex items-center gap-2 bg-gray-800 rounded-lg p-1">
                <TabButton
                  active={activeTab === 'counts'}
                  onClick={() => setActiveTab('counts')}
                  icon={ClipboardDocumentListIcon}
                >
                  Counts
                </TabButton>
                {canViewAnalytics && (
                  <>
                    <TabButton
                      active={activeTab === 'analytics'}
                      onClick={() => setActiveTab('analytics')}
                      icon={ChartBarIcon}
                    >
                      Analytics
                    </TabButton>
                    <TabButton
                      active={false}
                      onClick={() => navigate('/cycle-counting/kpi')}
                      icon={ChartBarIcon}
                    >
                      KPI
                    </TabButton>
                    <TabButton
                      active={false}
                      onClick={() => navigate('/cycle-counting/root-cause')}
                      icon={LightBulbIcon}
                    >
                      Root Cause
                    </TabButton>
                  </>
                )}
                {(user?.role === UserRole.SUPERVISOR || user?.role === UserRole.ADMIN) && (
                  <TabButton
                    active={false}
                    onClick={() => navigate('/cycle-counting/schedules')}
                    icon={CalendarDaysIcon}
                  >
                    Schedules
                  </TabButton>
                )}
              </div>
              {activeTab === 'counts' && canCreatePlan && (
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <PlusIcon className="h-5 w-5" />
                  New Cycle Count
                </button>
              )}
            </div>
          </div>

          {/* COUNTS TAB */}
          {activeTab === 'counts' && (
            <>
              {/* Filters */}
              <div className="glass-card rounded-lg p-4">
                <div className="flex flex-wrap gap-4">
                  <div className="relative">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                      placeholder="Search plans..."
                      className="pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Status</label>
                    <Select
                      value={filterStatus}
                      onChange={e => setFilterStatus(e.target.value as CycleCountStatus | '')}
                      options={[
                        { value: '', label: 'All Statuses' },
                        { value: CycleCountStatus.SCHEDULED, label: 'Scheduled' },
                        { value: CycleCountStatus.IN_PROGRESS, label: 'In Progress' },
                        { value: CycleCountStatus.COMPLETED, label: 'Completed' },
                        { value: CycleCountStatus.RECONCILED, label: 'Reconciled' },
                      ]}
                      className="w-48"
                    />
                  </div>
                </div>
              </div>

              {/* Plans List */}
              <div className="glass-card rounded-lg overflow-hidden">
                {isLoading ? (
                  <div className="p-8 text-center text-gray-400">Loading cycle count plans...</div>
                ) : plans.length === 0 ? (
                  <div className="p-8 text-center text-gray-400">
                    <ClipboardDocumentListIcon className="h-12 w-12 mx-auto mb-4 text-gray-600" />
                    <p>No cycle count plans found</p>
                    {canCreatePlan && (
                      <button
                        onClick={() => setShowCreateModal(true)}
                        className="mt-4 text-blue-400 hover:text-blue-300"
                      >
                        Create your first cycle count plan
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-800">
                      <thead className="bg-gray-900/50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                            Plan Name
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                            Type
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                            Scheduled Date
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                            Location/SKU
                          </th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-400 uppercase">
                            Status
                          </th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-400 uppercase">
                            Entries
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                            Assigned To
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-gray-900/30 divide-y divide-gray-800">
                        {paginatedPlans.map((plan: any) => {
                          const pendingVariances =
                            plan.countEntries?.filter(
                              (e: any) => e.varianceStatus === 'PENDING' && e.variance !== 0
                            ).length || 0;

                          return (
                            <tr key={plan.planId} className="hover:bg-gray-800/50">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-white">
                                  {plan.planName}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-white">{plan.countType}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-white">
                                  {new Date(plan.scheduledDate).toLocaleDateString()}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-white">
                                  {plan.location || plan.sku || 'All Locations/SKUs'}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-center">
                                <StatusBadge status={plan.status} />
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-center">
                                <div className="text-sm text-white">
                                  {plan.countEntries?.length || 0}
                                  {pendingVariances > 0 && (
                                    <span className="ml-2 text-yellow-400">
                                      ({pendingVariances} pending)
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-white">
                                  {plan.assignedToName || getUserName(plan.countBy)}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-right">
                                <button
                                  onClick={() => navigate(`/cycle-counting/${plan.planId}`)}
                                  className="text-blue-400 hover:text-blue-300 text-sm font-medium"
                                >
                                  Edit
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>

                    {totalPages > 1 && (
                      <div className="mt-4 flex justify-center">
                        <Pagination
                          currentPage={currentPage}
                          totalItems={plansData?.plans?.length || 0}
                          pageSize={itemsPerPage}
                          onPageChange={page => {
                            setCurrentPage(page);
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}

          {/* ANALYTICS TAB */}
          {activeTab === 'analytics' && canViewAnalytics && (
            <div className="space-y-6">
              {dashboardLoading ? (
                <div className="glass-card rounded-xl p-12 text-center text-gray-400">
                  Loading analytics...
                </div>
              ) : (
                <>
                  {/* Overall KPI Cards */}
                  {overallKPIs && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                      <div className="glass-card rounded-xl p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-gray-400">Total Counts</p>
                            <p className="text-3xl font-bold mt-2 text-blue-400">
                              {overallKPIs.totalCounts}
                            </p>
                            <p className="text-sm text-gray-500 mt-1">
                              {overallKPIs.completedCounts} completed
                            </p>
                          </div>
                          <div className="p-3 rounded-lg bg-blue-500/20">
                            <ClipboardDocumentCheckIcon className="h-8 w-8 text-blue-400" />
                          </div>
                        </div>
                      </div>
                      <div className="glass-card rounded-xl p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-gray-400">Completion Rate</p>
                            <p className="text-3xl font-bold mt-2 text-green-400">
                              {overallKPIs.completionRate.toFixed(1)}%
                            </p>
                          </div>
                          <div className="p-3 rounded-lg bg-green-500/20">
                            <ChartBarIcon className="h-8 w-8 text-green-400" />
                          </div>
                        </div>
                      </div>
                      <div className="glass-card rounded-xl p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-gray-400">Average Accuracy</p>
                            <p className="text-3xl font-bold mt-2 text-purple-400">
                              {overallKPIs.averageAccuracy.toFixed(1)}%
                            </p>
                          </div>
                          <div className="p-3 rounded-lg bg-purple-500/20">
                            <ClipboardDocumentCheckIcon className="h-8 w-8 text-purple-400" />
                          </div>
                        </div>
                      </div>
                      <div className="glass-card rounded-xl p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-gray-400">Pending Variances</p>
                            <p
                              className={`text-3xl font-bold mt-2 ${overallKPIs.pendingVariances > 0 ? 'text-yellow-400' : 'text-green-400'}`}
                            >
                              {overallKPIs.pendingVariances}
                            </p>
                            {overallKPIs.highValueVarianceCount > 0 && (
                              <p className="text-sm text-orange-400 mt-1">
                                {overallKPIs.highValueVarianceCount} high severity
                              </p>
                            )}
                          </div>
                          <div
                            className={`p-3 rounded-lg ${overallKPIs.pendingVariances > 0 ? 'bg-yellow-500/20' : 'bg-green-500/20'}`}
                          >
                            <ChartBarIcon
                              className={`h-8 w-8 ${overallKPIs.pendingVariances > 0 ? 'text-yellow-400' : 'text-green-400'}`}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Accuracy Trend Chart */}
                  <div className="glass-card rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-white mb-4">
                      Accuracy Trend (Last 30 Days)
                    </h3>
                    <div className="relative h-48">
                      <div className="flex items-end justify-between h-full gap-1">
                        {accuracyTrend.map((point: any, index: number) => {
                          const maxAccuracy = Math.max(
                            ...accuracyTrend.map((d: any) => d.accuracy),
                            100
                          );
                          const minAccuracy = Math.min(
                            ...accuracyTrend.map((d: any) => d.accuracy),
                            0
                          );
                          const height =
                            ((point.accuracy - minAccuracy) / (maxAccuracy - minAccuracy)) * 100;
                          return (
                            <div
                              key={index}
                              className="flex-1 flex flex-col items-center gap-2 group"
                            >
                              <div className="relative w-full flex items-end justify-center">
                                <div
                                  className="w-full bg-blue-500 hover:bg-blue-400 transition-all rounded-t"
                                  style={{ height: `${Math.max(height, 5)}%` }}
                                  title={`${point.period}: ${point.accuracy.toFixed(1)}%`}
                                />
                              </div>
                              {accuracyTrend.length <= 10 && (
                                <span className="text-xs text-gray-500 transform -rotate-45 origin-top-left truncate w-16 text-center">
                                  {new Date(point.period).toLocaleDateString(undefined, {
                                    month: 'short',
                                    day: 'numeric',
                                  })}
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Two Column Layout */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Top Discrepancies */}
                    <div className="glass-card rounded-xl p-6">
                      <h3 className="text-lg font-semibold text-white mb-4">
                        Top Discrepancy SKUs
                      </h3>
                      <div className="overflow-x-auto">
                        <table className="min-w-full">
                          <thead>
                            <tr className="text-left text-sm text-gray-400 border-b border-gray-700">
                              <th className="pb-3">SKU</th>
                              <th className="pb-3">Name</th>
                              <th className="pb-3 text-right">Variance Count</th>
                              <th className="pb-3 text-right">Avg Variance %</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-800">
                            {topDiscrepancies.length === 0 ? (
                              <tr>
                                <td colSpan={4} className="py-8 text-center text-gray-500">
                                  No discrepancies found
                                </td>
                              </tr>
                            ) : (
                              topDiscrepancies.map((item: any, index: number) => (
                                <tr key={index} className="hover:bg-gray-800/50">
                                  <td className="py-3 font-medium text-white">{item.sku}</td>
                                  <td className="py-3 text-gray-300">{item.name}</td>
                                  <td className="py-3 text-right text-yellow-400">
                                    {item.varianceCount}
                                  </td>
                                  <td className="py-3 text-right text-orange-400">
                                    {item.averageVariancePercent.toFixed(1)}%
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Zone Performance */}
                    <div className="glass-card rounded-xl p-6">
                      <h3 className="text-lg font-semibold text-white mb-4">Zone Performance</h3>
                      <div className="space-y-4">
                        {zonePerformance.length === 0 ? (
                          <p className="text-gray-500 text-center py-8">No zone data available</p>
                        ) : (
                          zonePerformance.map((zone: any, index: number) => (
                            <div key={index} className="space-y-2">
                              <div className="flex justify-between items-center">
                                <span className="font-medium text-white">Zone {zone.zone}</span>
                                <span className="text-sm text-gray-400">
                                  {zone.countsCompleted} counts • {zone.averageAccuracy.toFixed(1)}%
                                  accuracy
                                </span>
                              </div>
                              <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
                                <div
                                  className={`h-full transition-all ${
                                    zone.averageAccuracy >= 98
                                      ? 'bg-green-500'
                                      : zone.averageAccuracy >= 95
                                        ? 'bg-yellow-500'
                                        : 'bg-red-500'
                                  }`}
                                  style={{ width: `${zone.averageAccuracy}%` }}
                                />
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>

                  {/* User Performance */}
                  <div className="glass-card rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-white mb-4">
                      User Performance (Last 30 Days)
                    </h3>
                    <div className="overflow-x-auto">
                      <table className="min-w-full">
                        <thead>
                          <tr className="text-left text-sm text-gray-400 border-b border-gray-700">
                            <th className="pb-3">User</th>
                            <th className="pb-3 text-right">Counts Completed</th>
                            <th className="pb-3 text-right">Items Counted</th>
                            <th className="pb-3 text-right">Accuracy</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800">
                          {userPerformance.length === 0 ? (
                            <tr>
                              <td colSpan={4} className="py-8 text-center text-gray-500">
                                No performance data available
                              </td>
                            </tr>
                          ) : (
                            userPerformance.map((user: any, index: number) => (
                              <tr key={index} className="hover:bg-gray-800/50">
                                <td className="py-3 font-medium text-white">{user.name}</td>
                                <td className="py-3 text-right text-blue-400">
                                  {user.countsCompleted}
                                </td>
                                <td className="py-3 text-right text-gray-300">
                                  {user.itemsCounted}
                                </td>
                                <td className="py-3 text-right">
                                  <span
                                    className={`px-2 py-1 rounded text-sm ${
                                      user.averageAccuracy >= 98
                                        ? 'bg-green-500/20 text-green-400'
                                        : user.averageAccuracy >= 95
                                          ? 'bg-yellow-500/20 text-yellow-400'
                                          : 'bg-red-500/20 text-red-400'
                                    }`}
                                  >
                                    {user.averageAccuracy.toFixed(1)}%
                                  </span>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Count Type Effectiveness */}
                  <div className="glass-card rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-white mb-4">
                      Count Type Effectiveness (Last 90 Days)
                    </h3>
                    <div className="overflow-x-auto">
                      <table className="min-w-full">
                        <thead>
                          <tr className="text-left text-sm text-gray-400 border-b border-gray-700">
                            <th className="pb-3">Count Type</th>
                            <th className="pb-3 text-right">Completed</th>
                            <th className="pb-3 text-right">Accuracy</th>
                            <th className="pb-3 text-right">Avg Duration</th>
                            <th className="pb-3 text-right">Variance Detection</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800">
                          {countTypeEffectiveness.map((type: any, index: number) => {
                            const formatDuration = (hours: number) => {
                              if (hours < 1) return `${Math.round(hours * 60)}m`;
                              return `${hours.toFixed(1)}h`;
                            };
                            return (
                              <tr key={index} className="hover:bg-gray-800/50">
                                <td className="py-3 font-medium text-white">
                                  {type.countType
                                    .replace(/_/g, ' ')
                                    .toLowerCase()
                                    .replace(/\b\w/g, (l: string) => l.toUpperCase())}
                                </td>
                                <td className="py-3 text-right text-blue-400">
                                  {type.countsCompleted}
                                </td>
                                <td className="py-3 text-right">
                                  <span
                                    className={`px-2 py-1 rounded text-sm ${
                                      type.averageAccuracy >= 98
                                        ? 'bg-green-500/20 text-green-400'
                                        : type.averageAccuracy >= 95
                                          ? 'bg-yellow-500/20 text-yellow-400'
                                          : 'bg-red-500/20 text-red-400'
                                    }`}
                                  >
                                    {type.averageAccuracy.toFixed(1)}%
                                  </span>
                                </td>
                                <td className="py-3 text-right text-gray-300">
                                  {formatDuration(type.averageDuration)}
                                </td>
                                <td className="py-3 text-right text-purple-400">
                                  {type.varianceDetectionRate.toFixed(1)}%
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Additional Stats Footer */}
                  {overallKPIs && (
                    <div className="glass-card rounded-xl p-6">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
                        <div>
                          <p className="text-2xl font-bold text-white">
                            {overallKPIs.inProgressCounts}
                          </p>
                          <p className="text-sm text-gray-400 mt-1">In Progress</p>
                        </div>
                        <div>
                          <p className="text-2xl font-bold text-white">
                            {overallKPIs.scheduledCounts}
                          </p>
                          <p className="text-sm text-gray-400 mt-1">Scheduled</p>
                        </div>
                        <div>
                          <p className="text-2xl font-bold text-white">
                            {overallKPIs.totalItemsCounted}
                          </p>
                          <p className="text-sm text-gray-400 mt-1">Items Counted</p>
                        </div>
                        <div>
                          <p className="text-2xl font-bold text-white">
                            {overallKPIs.totalVariances}
                          </p>
                          <p className="text-sm text-gray-400 mt-1">Total Variances</p>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {showCreateModal && (
            <CreateCycleCountModal
              onClose={() => setShowCreateModal(false)}
              onSuccess={() => {
                setShowCreateModal(false);
                // Cache invalidation is handled by the mutation hook, no need to manually refetch
              }}
              assignableUsers={assignableUsers}
            />
          )}
        </div>
      </main>
    </div>
  );
}
