/**
 * Location Capacity Page
 *
 * Interface for managing location capacity rules and viewing alerts
 */

import { useState } from 'react';
import {
  useCapacityRules,
  useLocationCapacities,
  useCapacityAlerts,
  useCreateCapacityRule,
  useUpdateCapacityRule,
  useDeleteCapacityRule,
  useAcknowledgeAlert,
  useRecalculateCapacity,
} from '@/services/api';
import { useAuthStore } from '@/stores';
import { CapacityType, CapacityRuleStatus, CapacityUnit, UserRole, BinType } from '@opsui/shared';
import {
  CubeIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  ExclamationTriangleIcon,
  CheckIcon,
  ArrowPathIcon,
  MagnifyingGlassIcon,
  ChevronLeftIcon,
} from '@heroicons/react/24/outline';
import {
  useToast,
  Pagination,
  Modal,
  FormInput,
  FormSelect,
  FormTextarea,
  ConfirmDialog,
  Button,
  Breadcrumb,
  Header,
} from '@/components/shared';
import { useFormValidation } from '@/hooks/useFormValidation';
import { useNavigate } from 'react-router-dom';

// ============================================================================
// COMPONENTS
// ============================================================================

function CapacityBar({
  utilization,
  maximum,
  warningThreshold,
}: {
  utilization: number;
  maximum: number;
  warningThreshold: number;
}) {
  const percent = (utilization / maximum) * 100;
  const isWarning = percent >= warningThreshold;
  const isCritical = percent >= 100;

  return (
    <div className="relative">
      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${
            isCritical ? 'bg-red-500' : isWarning ? 'bg-yellow-500' : 'bg-green-500'
          }`}
          style={{ width: `${Math.min(percent, 100)}%` }}
        />
      </div>
      <div className="flex justify-between mt-1 text-xs text-gray-500">
        <span>
          {utilization.toFixed(1)} / {maximum} {utilization > maximum ? '⚠' : ''}
        </span>
        <span>{percent.toFixed(1)}%</span>
      </div>
    </div>
  );
}

function CapacityRuleModal({
  rule,
  onClose,
  onSuccess,
}: {
  rule?: any;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const createMutation = useCreateCapacityRule();
  const updateMutation = useUpdateCapacityRule();
  const isEdit = !!rule;
  const { showToast } = useToast();

  const {
    values,
    errors,
    handleChange,
    handleBlur,
    handleSubmit,
    isSubmitting,
    reset,
    setFieldValue: _setFieldValue,
  } = useFormValidation({
    initialValues: {
      ruleName: rule?.ruleName || '',
      description: rule?.description || '',
      capacityType: rule?.capacityType || CapacityType.QUANTITY,
      capacityUnit: rule?.capacityUnit || CapacityUnit.UNITS,
      appliesTo: rule?.appliesTo || 'ALL',
      zone: rule?.zone || '',
      locationType: rule?.locationType || '',
      specificLocation: rule?.specificLocation || '',
      maximumCapacity: String(rule?.maximumCapacity || 100),
      warningThreshold: String(rule?.warningThreshold || 80),
      allowOverfill: rule?.allowOverfill || false,
      overfillThreshold: String(rule?.overfillThreshold || 10),
      priority: String(rule?.priority || 0),
    },
    validationRules: {
      ruleName: { required: true, minLength: 3, maxLength: 100 },
      description: { maxLength: 500 },
      capacityType: { required: true },
      capacityUnit: { required: true },
      appliesTo: { required: true },
      maximumCapacity: {
        required: true,
        custom: value => {
          const num = Number(value);
          if (isNaN(num) || num <= 0) return 'Must be a positive number';
          return null;
        },
      },
      warningThreshold: {
        required: true,
        custom: value => {
          const num = Number(value);
          if (isNaN(num) || num < 1 || num > 100) return 'Must be between 1 and 100';
          return null;
        },
      },
    },
    onSubmit: async formValues => {
      try {
        const payload = {
          ...formValues,
          maximumCapacity: parseFloat(formValues.maximumCapacity),
          warningThreshold: parseFloat(formValues.warningThreshold),
          overfillThreshold: parseFloat(formValues.overfillThreshold),
          priority: parseInt(formValues.priority),
        };

        if (isEdit) {
          await updateMutation.mutateAsync({
            ruleId: rule.ruleId,
            updates: payload,
          });
          showToast('Capacity rule updated successfully', 'success');
        } else {
          await createMutation.mutateAsync(payload);
          showToast('Capacity rule created successfully', 'success');
        }
        onSuccess();
        onClose();
      } catch (error: any) {
        showToast(error?.message || 'Failed to save capacity rule', 'error');
      }
    },
  });

  const handleModalClose = () => {
    reset();
    onClose();
  };

  return (
    <Modal
      isOpen={true}
      onClose={handleModalClose}
      title={isEdit ? 'Edit Capacity Rule' : 'Create Capacity Rule'}
      size="lg"
      footer={
        <>
          <button
            type="button"
            onClick={handleModalClose}
            className="px-4 py-2 border border-gray-700 rounded-lg text-gray-300 hover:bg-gray-800"
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 min-w-[120px]"
          >
            {isSubmitting ? 'Saving...' : isEdit ? 'Update Rule' : 'Create Rule'}
          </button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormInput
            label="Rule Name"
            name="ruleName"
            value={values.ruleName}
            onChange={handleChange}
            onBlur={() => handleBlur('ruleName')}
            error={errors.ruleName}
            required
            placeholder="e.g., Standard Shelf Capacity"
            className="col-span-2"
          />

          <FormTextarea
            label="Description"
            name="description"
            value={values.description}
            onChange={handleChange}
            onBlur={() => handleBlur('description')}
            error={errors.description}
            placeholder="Optional description..."
            rows={2}
            className="col-span-2"
          />

          <FormSelect
            label="Capacity Type"
            name="capacityType"
            value={values.capacityType}
            onChange={handleChange}
            onBlur={() => handleBlur('capacityType')}
            error={errors.capacityType}
            required
            options={[
              { value: CapacityType.QUANTITY, label: 'Quantity' },
              { value: CapacityType.WEIGHT, label: 'Weight' },
              { value: CapacityType.VOLUME, label: 'Volume' },
            ]}
          />

          <FormSelect
            label="Capacity Unit"
            name="capacityUnit"
            value={values.capacityUnit}
            onChange={handleChange}
            onBlur={() => handleBlur('capacityUnit')}
            error={errors.capacityUnit}
            required
            options={[
              { value: CapacityUnit.UNITS, label: 'Units' },
              { value: CapacityUnit.LBS, label: 'Pounds' },
              { value: CapacityUnit.KG, label: 'Kilograms' },
              { value: CapacityUnit.CUBIC_FT, label: 'Cubic Feet' },
              { value: CapacityUnit.CUBIC_M, label: 'Cubic Meters' },
              { value: CapacityUnit.PALLET, label: 'Pallets' },
            ]}
          />

          <FormSelect
            label="Applies To"
            name="appliesTo"
            value={values.appliesTo}
            onChange={handleChange}
            onBlur={() => handleBlur('appliesTo')}
            error={errors.appliesTo}
            required
            options={[
              { value: 'ALL', label: 'All Locations' },
              { value: 'ZONE', label: 'Specific Zone' },
              { value: 'LOCATION_TYPE', label: 'Location Type' },
              { value: 'SPECIFIC_LOCATION', label: 'Specific Location' },
            ]}
          />

          {values.appliesTo === 'ZONE' && (
            <FormInput
              label="Zone"
              name="zone"
              value={values.zone}
              onChange={handleChange}
              onBlur={() => handleBlur('zone')}
              error={errors.zone}
              required
              placeholder="e.g., Zone-A"
            />
          )}

          {values.appliesTo === 'LOCATION_TYPE' && (
            <FormSelect
              label="Location Type"
              name="locationType"
              value={values.locationType}
              onChange={handleChange}
              onBlur={() => handleBlur('locationType')}
              error={errors.locationType}
              required
              options={[
                { value: '', label: 'Select type...' },
                { value: BinType.SHELF, label: 'Shelf' },
                { value: BinType.FLOOR, label: 'Floor' },
                { value: BinType.RACK, label: 'Rack' },
                { value: BinType.BIN, label: 'Bin' },
              ]}
            />
          )}

          {values.appliesTo === 'SPECIFIC_LOCATION' && (
            <FormInput
              label="Location"
              name="specificLocation"
              value={values.specificLocation}
              onChange={handleChange}
              onBlur={() => handleBlur('specificLocation')}
              error={errors.specificLocation}
              required
              placeholder="e.g., Zone-A-01-01"
            />
          )}

          <FormInput
            label="Maximum Capacity"
            name="maximumCapacity"
            type="number"
            value={values.maximumCapacity}
            onChange={handleChange}
            onBlur={() => handleBlur('maximumCapacity')}
            error={errors.maximumCapacity}
            required
          />

          <FormInput
            label="Warning Threshold (%)"
            name="warningThreshold"
            type="number"
            value={values.warningThreshold}
            onChange={handleChange}
            onBlur={() => handleBlur('warningThreshold')}
            error={errors.warningThreshold}
            required
          />

          <FormInput
            label="Priority"
            name="priority"
            type="number"
            value={values.priority}
            onChange={handleChange}
            onBlur={() => handleBlur('priority')}
            error={errors.priority}
            placeholder="Higher priority rules take precedence"
          />

          <div className="flex items-center space-y-0">
            <input
              type="checkbox"
              id="allowOverfill"
              checked={values.allowOverfill}
              onChange={handleChange}
              name="allowOverfill"
              className="h-4 w-4 text-blue-600 rounded bg-gray-800 border-gray-700 focus:ring-blue-500"
            />
            <label htmlFor="allowOverfill" className="ml-2 text-sm text-gray-300">
              Allow Overfill
            </label>
          </div>

          {values.allowOverfill && (
            <FormInput
              label="Overfill Threshold (%)"
              name="overfillThreshold"
              type="number"
              value={values.overfillThreshold}
              onChange={handleChange}
              onBlur={() => handleBlur('overfillThreshold')}
              error={errors.overfillThreshold}
            />
          )}
        </div>
      </form>
    </Modal>
  );
}

// ============================================================================
// MAIN PAGE
// ============================================================================

export function LocationCapacityPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'overview' | 'rules' | 'alerts'>('overview');
  const [showRuleModal, setShowRuleModal] = useState(false);
  const [selectedRule, setSelectedRule] = useState<any>(null);
  const [filterType, setFilterType] = useState<string>('');
  const [showAlertsOnly, setShowAlertsOnly] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [rulesPage, setRulesPage] = useState(1);
  const [alertsPage, setAlertsPage] = useState(1);
  const itemsPerPage = 10;
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; ruleId: string }>({
    isOpen: false,
    ruleId: '',
  });

  const { data: rulesData, isLoading: rulesLoading, refetch: refetchRules } = useCapacityRules();
  const {
    data: capacitiesData,
    isLoading: capacitiesLoading,
    refetch: refetchCapacities,
  } = useLocationCapacities({
    capacityType: filterType || undefined,
    showAlertsOnly,
  });
  const {
    data: alertsData,
    isLoading: alertsLoading,
    refetch: refetchAlerts,
  } = useCapacityAlerts({
    acknowledged: false,
  });

  const deleteMutation = useDeleteCapacityRule();
  const acknowledgeMutation = useAcknowledgeAlert();
  const recalculateMutation = useRecalculateCapacity();

  const rules = rulesData || [];
  const capacities = capacitiesData?.capacities || [];
  const alerts = alertsData?.alerts || [];

  const canManageRules =
    user?.role === UserRole.STOCK_CONTROLLER ||
    user?.role === UserRole.SUPERVISOR ||
    user?.role === UserRole.ADMIN;

  // Search and filter logic
  const filteredCapacities = capacities.filter((cap: any) =>
    cap.binLocation.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredRules = rules.filter(
    (rule: any) =>
      rule.ruleName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rule.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredAlerts = alerts.filter((alert: any) =>
    alert.binLocation.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Pagination logic
  const paginatedCapacities = filteredCapacities.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const paginatedRules = filteredRules.slice(
    (rulesPage - 1) * itemsPerPage,
    rulesPage * itemsPerPage
  );

  const paginatedAlerts = filteredAlerts.slice(
    (alertsPage - 1) * itemsPerPage,
    alertsPage * itemsPerPage
  );

  const totalCapacityPages = Math.ceil(filteredCapacities.length / itemsPerPage);
  const totalRulesPages = Math.ceil(filteredRules.length / itemsPerPage);
  const totalAlertsPages = Math.ceil(filteredAlerts.length / itemsPerPage);

  const handleDeleteRule = async (ruleId: string) => {
    setDeleteConfirm({ isOpen: true, ruleId });
  };

  const confirmDeleteRule = async () => {
    const { ruleId } = deleteConfirm;
    try {
      await deleteMutation.mutateAsync(ruleId);
      refetchRules();
      showToast('Capacity rule deleted successfully', 'success');
    } catch (error: any) {
      showToast(error?.message || 'Failed to delete capacity rule', 'error');
    } finally {
      setDeleteConfirm({ isOpen: false, ruleId: '' });
    }
  };

  const handleAcknowledgeAlert = async (alertId: string) => {
    try {
      await acknowledgeMutation.mutateAsync(alertId);
      refetchAlerts();
      refetchCapacities();
      showToast('Alert acknowledged successfully', 'success');
    } catch (error: any) {
      showToast(error?.message || 'Failed to acknowledge alert', 'error');
    }
  };

  const handleRecalculate = async (binLocation: string) => {
    try {
      await recalculateMutation.mutateAsync(binLocation);
      refetchCapacities();
      showToast('Capacity recalculated successfully', 'success');
    } catch (error: any) {
      showToast(error?.message || 'Failed to recalculate capacity', 'error');
    }
  };

  const totalCapacity = capacities.reduce(
    (sum: number, cap: { maximumCapacity: number }) => sum + cap.maximumCapacity,
    0
  );
  const totalUtilization = capacities.reduce(
    (sum: number, cap: { currentUtilization: number }) => sum + cap.currentUtilization,
    0
  );
  const overallUtilization = totalCapacity > 0 ? (totalUtilization / totalCapacity) * 100 : 0;

  return (
    <div className="min-h-screen">
      <Header />
      {/* Breadcrumb Navigation */}
      <Breadcrumb />
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
                <h1 className="text-2xl font-bold text-white">Location Capacity</h1>
                <p className="text-gray-400 mt-1">
                  Monitor and manage bin location capacity constraints
                </p>
              </div>
            </div>
            {canManageRules && (
              <button
                onClick={() => {
                  setSelectedRule(null);
                  setShowRuleModal(true);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <PlusIcon className="h-5 w-5" />
                New Rule
              </button>
            )}
          </div>

          {/* Tabs */}
          <div className="glass-card rounded-lg">
            <div className="border-b border-gray-800">
              <nav className="flex -mb-px">
                <button
                  onClick={() => setActiveTab('overview')}
                  className={`px-6 py-4 border-b-2 font-medium text-sm ${
                    activeTab === 'overview'
                      ? 'border-blue-500 text-blue-400'
                      : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-700'
                  }`}
                >
                  <CubeIcon className="h-5 w-5 inline mr-2" />
                  Overview
                </button>
                <button
                  onClick={() => setActiveTab('rules')}
                  className={`px-6 py-4 border-b-2 font-medium text-sm ${
                    activeTab === 'rules'
                      ? 'border-blue-500 text-blue-400'
                      : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-700'
                  }`}
                >
                  Rules
                </button>
                <button
                  onClick={() => setActiveTab('alerts')}
                  className={`px-6 py-4 border-b-2 font-medium text-sm ${
                    activeTab === 'alerts'
                      ? 'border-blue-500 text-blue-400'
                      : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-700'
                  }`}
                >
                  Alerts
                  {alerts.length > 0 && (
                    <span className="ml-2 bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                      {alerts.length}
                    </span>
                  )}
                </button>
              </nav>
            </div>

            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="p-6">
                {capacitiesLoading ? (
                  <div className="flex justify-center items-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                  </div>
                ) : (
                  <>
                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                      <div className="bg-blue-900/30 border border-blue-800 rounded-lg p-4">
                        <div className="text-sm text-blue-300 font-medium">Total Locations</div>
                        <div className="text-2xl font-bold text-blue-100 mt-1">
                          {capacities.length}
                        </div>
                      </div>
                      <div className="bg-green-900/30 border border-green-800 rounded-lg p-4">
                        <div className="text-sm text-green-300 font-medium">Total Capacity</div>
                        <div className="text-2xl font-bold text-green-100 mt-1">
                          {totalCapacity.toFixed(0)}
                        </div>
                      </div>
                      <div className="bg-yellow-900/30 border border-yellow-800 rounded-lg p-4">
                        <div className="text-sm text-yellow-300 font-medium">Utilization</div>
                        <div className="text-2xl font-bold text-yellow-100 mt-1">
                          {overallUtilization.toFixed(1)}%
                        </div>
                      </div>
                      <div className="bg-red-900/30 border border-red-800 rounded-lg p-4">
                        <div className="text-sm text-red-300 font-medium">Active Alerts</div>
                        <div className="text-2xl font-bold text-red-100 mt-1">{alerts.length}</div>
                      </div>
                    </div>

                    {/* Overall Utilization Bar */}
                    <div className="mb-6">
                      <h3 className="text-lg font-semibold text-white mb-3">
                        Overall Capacity Utilization
                      </h3>
                      <CapacityBar
                        utilization={totalUtilization}
                        maximum={totalCapacity}
                        warningThreshold={80}
                      />
                    </div>

                    {/* Capacities by Location */}
                    <div>
                      <div className="flex justify-between items-center mb-3">
                        <h3 className="text-lg font-semibold text-white">Location Capacities</h3>
                        <div className="flex gap-2">
                          <div className="relative">
                            <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                            <input
                              type="text"
                              value={searchTerm}
                              onChange={e => {
                                setSearchTerm(e.target.value);
                                setCurrentPage(1);
                              }}
                              placeholder="Search locations..."
                              className="pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                          </div>
                          <select
                            value={filterType}
                            onChange={e => setFilterType(e.target.value)}
                            className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white"
                          >
                            <option value="">All Types</option>
                            <option value={CapacityType.QUANTITY}>Quantity</option>
                            <option value={CapacityType.WEIGHT}>Weight</option>
                            <option value={CapacityType.VOLUME}>Volume</option>
                          </select>
                          <label className="flex items-center gap-2 text-sm text-gray-300">
                            <input
                              type="checkbox"
                              checked={showAlertsOnly}
                              onChange={e => setShowAlertsOnly(e.target.checked)}
                              className="rounded bg-gray-800 border-gray-700"
                            />
                            Alerts Only
                          </label>
                        </div>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-800">
                          <thead className="bg-gray-900/50">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                                Location
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                                Type
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                                Utilization
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                                Status
                              </th>
                              <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase">
                                Actions
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-gray-900/30 divide-y divide-gray-800">
                            {paginatedCapacities.length === 0 ? (
                              <tr>
                                <td colSpan={5} className="px-6 py-12 text-center text-gray-400">
                                  No location capacities found.
                                </td>
                              </tr>
                            ) : (
                              paginatedCapacities.map((capacity: any) => (
                                <tr key={capacity.capacityId} className="hover:bg-gray-800/50">
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm font-medium text-white">
                                      {capacity.binLocation}
                                    </div>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm text-white">
                                      {capacity.capacityType}
                                    </div>
                                  </td>
                                  <td className="px-6 py-4">
                                    <div className="w-48">
                                      <CapacityBar
                                        utilization={capacity.currentUtilization}
                                        maximum={capacity.maximumCapacity}
                                        warningThreshold={capacity.warningThreshold}
                                      />
                                    </div>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <span
                                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                                        capacity.status === CapacityRuleStatus.EXCEEDED
                                          ? 'bg-red-900/50 text-red-300'
                                          : capacity.status === CapacityRuleStatus.WARNING
                                            ? 'bg-yellow-900/50 text-yellow-300'
                                            : 'bg-green-900/50 text-green-300'
                                      }`}
                                    >
                                      {capacity.status}
                                    </span>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                                    <button
                                      onClick={() => handleRecalculate(capacity.binLocation)}
                                      className="text-blue-400 hover:text-blue-300 mr-3"
                                      title="Recalculate"
                                      disabled={recalculateMutation.isPending}
                                    >
                                      <ArrowPathIcon
                                        className={`h-4 w-4 inline ${recalculateMutation.isPending ? 'animate-spin' : ''}`}
                                      />
                                    </button>
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>

                      {totalCapacityPages > 1 && (
                        <div className="mt-4">
                          <Pagination
                            currentPage={currentPage}
                            totalItems={filteredCapacities.length}
                            pageSize={itemsPerPage}
                            onPageChange={setCurrentPage}
                          />
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Rules Tab */}
            {activeTab === 'rules' && (
              <div className="p-6">
                {rulesLoading ? (
                  <div className="flex justify-center items-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between items-center mb-4">
                      <div className="relative">
                        <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                        <input
                          type="text"
                          value={searchTerm}
                          onChange={e => {
                            setSearchTerm(e.target.value);
                            setRulesPage(1);
                          }}
                          placeholder="Search rules..."
                          className="pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-800">
                        <thead className="bg-gray-900/50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                              Rule Name
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                              Type
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                              Applies To
                            </th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase">
                              Max Capacity
                            </th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase">
                              Warning %
                            </th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-400 uppercase">
                              Priority
                            </th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-gray-900/30 divide-y divide-gray-800">
                          {paginatedRules.length === 0 ? (
                            <tr>
                              <td colSpan={7} className="px-6 py-12 text-center text-gray-400">
                                {searchTerm
                                  ? 'No rules match your search.'
                                  : 'No capacity rules configured. Create a rule to get started.'}
                              </td>
                            </tr>
                          ) : (
                            paginatedRules.map((rule: any) => (
                              <tr key={rule.ruleId} className="hover:bg-gray-800/50">
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="text-sm font-medium text-white">
                                    {rule.ruleName}
                                  </div>
                                  {rule.description && (
                                    <div className="text-xs text-gray-400">{rule.description}</div>
                                  )}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="text-sm text-white">{rule.capacityType}</div>
                                  <div className="text-xs text-gray-400">{rule.capacityUnit}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="text-sm text-white">
                                    {rule.appliesTo === 'ALL' && 'All Locations'}
                                    {rule.appliesTo === 'ZONE' && `Zone: ${rule.zone}`}
                                    {rule.appliesTo === 'LOCATION_TYPE' &&
                                      `Type: ${rule.locationType}`}
                                    {rule.appliesTo === 'SPECIFIC_LOCATION' &&
                                      `Location: ${rule.specificLocation}`}
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-white">
                                  {rule.maximumCapacity}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-white">
                                  {rule.warningThreshold}%
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-white">
                                  {rule.priority}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                  {canManageRules && (
                                    <>
                                      <button
                                        onClick={() => {
                                          setSelectedRule(rule);
                                          setShowRuleModal(true);
                                        }}
                                        className="text-blue-400 hover:text-blue-300 mr-3"
                                      >
                                        <PencilIcon className="h-4 w-4 inline" />
                                      </button>
                                      <button
                                        onClick={() => handleDeleteRule(rule.ruleId)}
                                        className="text-red-400 hover:text-red-300"
                                      >
                                        <TrashIcon className="h-4 w-4 inline" />
                                      </button>
                                    </>
                                  )}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>

                    {totalRulesPages > 1 && (
                      <div className="mt-4">
                        <Pagination
                          currentPage={rulesPage}
                          totalItems={filteredRules.length}
                          pageSize={itemsPerPage}
                          onPageChange={setRulesPage}
                        />
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Alerts Tab */}
            {activeTab === 'alerts' && (
              <div className="p-6">
                {alertsLoading ? (
                  <div className="flex justify-center items-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                  </div>
                ) : paginatedAlerts.length === 0 ? (
                  <div className="text-center py-12">
                    <CheckIcon className="h-12 w-12 mx-auto mb-4 text-green-600" />
                    <p className="text-gray-400">
                      {searchTerm ? 'No alerts match your search.' : 'No active capacity alerts'}
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="mb-4">
                      <div className="relative">
                        <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                        <input
                          type="text"
                          value={searchTerm}
                          onChange={e => {
                            setSearchTerm(e.target.value);
                            setAlertsPage(1);
                          }}
                          placeholder="Search alerts..."
                          className="pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-full max-w-md"
                        />
                      </div>
                    </div>
                    <div className="space-y-4">
                      {paginatedAlerts.map((alert: any) => (
                        <div
                          key={alert.alertId}
                          className={`border rounded-lg p-4 ${
                            alert.alertType === 'EXCEEDED' || alert.alertType === 'CRITICAL'
                              ? 'border-red-900 bg-red-900/20'
                              : 'border-yellow-900 bg-yellow-900/20'
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-start">
                              <ExclamationTriangleIcon
                                className={`h-6 w-6 mr-3 ${
                                  alert.alertType === 'EXCEEDED' || alert.alertType === 'CRITICAL'
                                    ? 'text-red-400'
                                    : 'text-yellow-400'
                                }`}
                              />
                              <div>
                                <h4
                                  className={`font-semibold ${
                                    alert.alertType === 'EXCEEDED' || alert.alertType === 'CRITICAL'
                                      ? 'text-red-200'
                                      : 'text-yellow-200'
                                  }`}
                                >
                                  {alert.binLocation} - {alert.capacityType} Capacity{' '}
                                  {alert.alertType}
                                </h4>
                                <p className="text-sm mt-1 text-gray-300">{alert.alertMessage}</p>
                                <div className="text-sm mt-2 text-gray-300">
                                  <span className="font-medium text-white">Current: </span>
                                  {alert.currentUtilization.toFixed(1)} / {alert.maximumCapacity} (
                                  {alert.utilizationPercent.toFixed(1)}%)
                                </div>
                              </div>
                            </div>
                            <button
                              onClick={() => handleAcknowledgeAlert(alert.alertId)}
                              disabled={acknowledgeMutation.isPending}
                              className="px-3 py-1 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-300 hover:bg-gray-700 disabled:opacity-50"
                            >
                              {acknowledgeMutation.isPending ? 'Acknowledging...' : 'Acknowledge'}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {totalAlertsPages > 1 && (
                      <div className="mt-4">
                        <Pagination
                          currentPage={alertsPage}
                          totalItems={filteredAlerts.length}
                          pageSize={itemsPerPage}
                          onPageChange={setAlertsPage}
                        />
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          {showRuleModal && (
            <CapacityRuleModal
              rule={selectedRule}
              onClose={() => setShowRuleModal(false)}
              onSuccess={() => {
                setShowRuleModal(false);
                refetchRules();
              }}
            />
          )}

          <ConfirmDialog
            isOpen={deleteConfirm.isOpen}
            onClose={() => setDeleteConfirm({ isOpen: false, ruleId: '' })}
            onConfirm={confirmDeleteRule}
            title="Delete Capacity Rule"
            message="Are you sure you want to delete this capacity rule? This action cannot be undone."
            confirmText="Delete"
            cancelText="Cancel"
            variant="danger"
            isLoading={deleteMutation.isPending}
          />
        </div>
      </main>
    </div>
  );
}
