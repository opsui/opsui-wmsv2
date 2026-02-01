/**
 * Schedule Management Page
 *
 * Admin interface for managing automated recurring cycle count schedules.
 * Allows creating, editing, and viewing recurring count schedules.
 */

import { useState } from 'react';
import {
  useRecurringSchedules,
  useAssignableUsers,
  useCreateRecurringSchedule,
  useUpdateRecurringSchedule,
  useDeleteRecurringSchedule,
} from '@/services/api';
import { CycleCountType } from '@opsui/shared';
import { Header, useToast, ConfirmDialog } from '@/components/shared';
import { useFormValidation } from '@/hooks/useFormValidation';
import {
  MagnifyingGlassIcon,
  PlusIcon,
  CalendarDaysIcon,
  ClockIcon,
  UserIcon,
  MapPinIcon,
  TagIcon,
  DocumentTextIcon,
  PencilIcon,
  TrashIcon,
  PlayIcon,
  PauseIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

interface ScheduleFormData {
  scheduleName: string;
  countType: CycleCountType;
  frequencyType: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY';
  frequencyInterval: number;
  location?: string;
  sku?: string;
  assignedTo: string;
  nextRunDate: string;
  notes?: string;
}

const DEFAULT_FORM_DATA: ScheduleFormData = {
  scheduleName: '',
  countType: CycleCountType.ABC,
  frequencyType: 'WEEKLY',
  frequencyInterval: 1,
  location: '',
  sku: '',
  assignedTo: '',
  nextRunDate: '',
  notes: '',
};

export function ScheduleManagementPage() {
  const { showToast } = useToast();

  // Queries
  const { data: schedules = [], isLoading } = useRecurringSchedules();
  const { data: users = [] } = useAssignableUsers();

  // Mutations
  const createMutation = useCreateRecurringSchedule();
  const updateMutation = useUpdateRecurringSchedule();
  const deleteMutation = useDeleteRecurringSchedule();

  // State
  const [showModal, setShowModal] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    scheduleId: string;
    scheduleName: string;
  }>({
    isOpen: false,
    scheduleId: '',
    scheduleName: '',
  });

  // Form validation
  const { values, errors, handleChange, handleSubmit, isSubmitting, reset, setFieldValue } =
    useFormValidation<ScheduleFormData>({
      initialValues: DEFAULT_FORM_DATA,
      validationRules: {
        scheduleName: {
          required: true,
          minLength: 3,
          maxLength: 100,
        },
        countType: {
          required: true,
        },
        frequencyType: {
          required: true,
        },
        frequencyInterval: {
          required: true,
          custom: value => {
            const num = Number(value);
            if (isNaN(num) || num < 1) {
              return 'Must be at least 1';
            }
            return null;
          },
        },
        assignedTo: {
          required: true,
        },
        nextRunDate: {
          required: true,
          custom: value => {
            if (!value) return 'Next run date is required';
            const date = new Date(value);
            if (isNaN(date.getTime())) return 'Invalid date format';
            if (date < new Date()) return 'Next run date must be in the future';
            return null;
          },
        },
      },
      onSubmit: async formData => {
        try {
          if (editingSchedule) {
            await updateMutation.mutateAsync({
              scheduleId: editingSchedule,
              updates: formData,
            });
            showToast('Schedule updated successfully', 'success');
          } else {
            await createMutation.mutateAsync(formData);
            showToast('Schedule created successfully', 'success');
          }
          setShowModal(false);
          reset();
          setEditingSchedule(null);
        } catch (error: any) {
          showToast(error?.message || 'Failed to save schedule', 'error');
          throw error;
        }
      },
    });

  // Filter schedules
  const filteredSchedules = schedules.filter(schedule => {
    if (filterStatus === 'active' && !schedule.isActive) return false;
    if (filterStatus === 'inactive' && schedule.isActive) return false;

    if (searchTerm.trim()) {
      const query = searchTerm.toLowerCase();
      return (
        schedule.scheduleId?.toLowerCase().includes(query) ||
        schedule.scheduleName?.toLowerCase().includes(query) ||
        schedule.countType?.toLowerCase().includes(query) ||
        schedule.location?.toLowerCase().includes(query) ||
        schedule.sku?.toLowerCase().includes(query) ||
        schedule.assignedTo?.toLowerCase().includes(query) ||
        schedule.notes?.toLowerCase().includes(query)
      );
    }

    return true;
  });

  // Open modal for creating new schedule
  const handleCreate = () => {
    setEditingSchedule(null);
    reset();
    setShowModal(true);
  };

  // Open modal for editing existing schedule
  const handleEdit = (scheduleId: string) => {
    const schedule = schedules.find(s => s.scheduleId === scheduleId);
    if (schedule) {
      setEditingSchedule(scheduleId);
      setFieldValue('scheduleName', schedule.scheduleName);
      setFieldValue('countType', schedule.countType as CycleCountType);
      setFieldValue('frequencyType', schedule.frequencyType);
      setFieldValue('frequencyInterval', schedule.frequencyInterval);
      setFieldValue('location', schedule.location || '');
      setFieldValue('sku', schedule.sku || '');
      setFieldValue('assignedTo', schedule.assignedTo);
      setFieldValue('nextRunDate', new Date(schedule.nextRunDate).toISOString().slice(0, 16));
      setFieldValue('notes', schedule.notes || '');
      setShowModal(true);
    }
  };

  // Delete schedule
  const handleDelete = (scheduleId: string, scheduleName: string) => {
    setDeleteConfirm({ isOpen: true, scheduleId, scheduleName });
  };

  const confirmDelete = async () => {
    const { scheduleId } = deleteConfirm;
    try {
      await deleteMutation.mutateAsync(scheduleId);
      showToast('Schedule deleted successfully', 'success');
    } catch (error: any) {
      showToast(error?.message || 'Failed to delete schedule', 'error');
    } finally {
      setDeleteConfirm({ isOpen: false, scheduleId: '', scheduleName: '' });
    }
  };

  // Toggle schedule active status
  const handleToggleActive = async (scheduleId: string, isActive: boolean) => {
    try {
      await updateMutation.mutateAsync({
        scheduleId,
        updates: { isActive: !isActive },
      });
      showToast(`Schedule ${!isActive ? 'enabled' : 'disabled'} successfully`, 'success');
    } catch (error: any) {
      showToast(error?.message || 'Failed to update schedule', 'error');
    }
  };

  // Format date for display
  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Get count type display name
  const getCountTypeDisplayName = (type: string) => {
    const names: Record<string, string> = {
      ABC: 'ABC Analysis',
      BLANKET: 'Blanket Count',
      SPOT_CHECK: 'Spot Check',
      RECEIVING: 'Receiving Count',
      SHIPPING: 'Shipping Count',
      AD_HOC: 'Ad Hoc',
    };
    return names[type] || type;
  };

  // Get frequency display name
  const getFrequencyDisplayName = (type: string, interval: number) => {
    const names: Record<string, string> = {
      DAILY: interval === 1 ? 'Daily' : `Every ${interval} days`,
      WEEKLY: interval === 1 ? 'Weekly' : `Every ${interval} weeks`,
      MONTHLY: interval === 1 ? 'Monthly' : `Every ${interval} months`,
      QUARTERLY: interval === 1 ? 'Quarterly' : `Every ${interval} quarters`,
    };
    return names[type] || `${type} (${interval})`;
  };

  // Get status badge styling
  const getStatusBadgeClass = (isActive: boolean) => {
    return isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen">
        <Header />
        <div className="flex items-center justify-center min-h-[calc(100vh-64px)]">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-t-blue-500 border-solid rounded-full animate-spin" />
            <p className="text-gray-400">Loading schedules...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header />
      <main className="w-full px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* Page Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                <CalendarDaysIcon className="h-6 w-6 text-blue-400" />
                Recurring Count Schedules
              </h1>
              <p className="text-gray-400 mt-1">
                Automate your cycle counts by creating recurring schedules
              </p>
            </div>
            <button
              onClick={handleCreate}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <PlusIcon className="h-5 w-5" />
              Create Schedule
            </button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="glass-card rounded-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Total Schedules</p>
                  <p className="text-3xl font-bold mt-2 text-blue-400">{schedules.length}</p>
                </div>
                <div className="p-3 rounded-lg bg-blue-500/20">
                  <CalendarDaysIcon className="h-8 w-8 text-blue-400" />
                </div>
              </div>
            </div>
            <div className="glass-card rounded-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Active</p>
                  <p className="text-3xl font-bold mt-2 text-green-400">
                    {schedules.filter(s => s.isActive).length}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-green-500/20">
                  <PlayIcon className="h-8 w-8 text-green-400" />
                </div>
              </div>
            </div>
            <div className="glass-card rounded-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Inactive</p>
                  <p className="text-3xl font-bold mt-2 text-gray-400">
                    {schedules.filter(s => !s.isActive).length}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-gray-500/20">
                  <PauseIcon className="h-8 w-8 text-gray-400" />
                </div>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="glass-card rounded-lg p-4">
            <div className="flex flex-wrap gap-4">
              {/* Status Filters */}
              <div className="flex gap-2">
                <button
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    filterStatus === 'all'
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-400 hover:text-white hover:bg-gray-800'
                  }`}
                  onClick={() => setFilterStatus('all')}
                >
                  All ({schedules.length})
                </button>
                <button
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    filterStatus === 'active'
                      ? 'bg-green-600 text-white'
                      : 'text-gray-400 hover:text-white hover:bg-gray-800'
                  }`}
                  onClick={() => setFilterStatus('active')}
                >
                  Active ({schedules.filter(s => s.isActive).length})
                </button>
                <button
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    filterStatus === 'inactive'
                      ? 'bg-gray-600 text-white'
                      : 'text-gray-400 hover:text-white hover:bg-gray-800'
                  }`}
                  onClick={() => setFilterStatus('inactive')}
                >
                  Inactive ({schedules.filter(s => !s.isActive).length})
                </button>
              </div>

              {/* Search */}
              <div className="relative flex-1 max-w-md">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search schedules..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Schedules Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredSchedules.length === 0 ? (
              <div className="col-span-full flex flex-col items-center justify-center py-20 text-center">
                <div className="glass-card rounded-lg p-8">
                  <CalendarDaysIcon className="h-16 w-16 mx-auto mb-4 text-gray-600" />
                  <h3 className="text-xl font-semibold text-white mb-3">No schedules found</h3>
                  <p className="text-gray-400 mb-6 max-w-md">
                    {filterStatus === 'all' && searchTerm === ''
                      ? 'Get started by creating your first automated recurring count schedule.'
                      : filterStatus === 'active'
                        ? 'No active schedules found. Create a new schedule or enable an existing one.'
                        : filterStatus === 'inactive'
                          ? 'No inactive schedules found. Disable an active schedule to pause it.'
                          : 'No schedules match your search criteria. Try adjusting your filters.'}
                  </p>
                  <button
                    onClick={handleCreate}
                    className="inline-flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                  >
                    <PlusIcon className="h-5 w-5" />
                    Create Your First Schedule
                  </button>
                </div>
              </div>
            ) : (
              filteredSchedules.map(schedule => (
                <div
                  key={schedule.scheduleId}
                  className="glass-card rounded-lg overflow-hidden hover:border-blue-500/30 transition-all"
                >
                  {/* Card Header */}
                  <div className="bg-gray-900/50 px-4 py-3 border-b border-gray-800">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-base font-semibold text-white truncate pr-2">
                            {schedule.scheduleName}
                          </h3>
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeClass(
                              schedule.isActive
                            )}`}
                          >
                            <div
                              className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                                schedule.isActive ? 'bg-green-500' : 'bg-gray-500'
                              }`}
                            />
                            {schedule.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-gray-400">
                          <span className="inline-flex items-center gap-1">
                            <TagIcon className="h-4 w-4" />
                            {getCountTypeDisplayName(schedule.countType)}
                          </span>
                          <span>•</span>
                          <span className="inline-flex items-center gap-1">
                            <ClockIcon className="h-4 w-4" />
                            {getFrequencyDisplayName(
                              schedule.frequencyType,
                              schedule.frequencyInterval
                            )}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleToggleActive(schedule.scheduleId, schedule.isActive)}
                          className="p-1.5 rounded hover:bg-gray-800 text-gray-400 hover:text-white transition-colors"
                          title={schedule.isActive ? 'Disable schedule' : 'Enable schedule'}
                        >
                          {schedule.isActive ? (
                            <PauseIcon className="h-4 w-4" />
                          ) : (
                            <PlayIcon className="h-4 w-4" />
                          )}
                        </button>
                        <button
                          onClick={() => handleEdit(schedule.scheduleId)}
                          className="p-1.5 rounded hover:bg-gray-800 text-gray-400 hover:text-white transition-colors"
                          title="Edit schedule"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(schedule.scheduleId, schedule.scheduleName)}
                          className="p-1.5 rounded hover:bg-red-500/10 text-gray-400 hover:text-red-400 transition-colors"
                          title="Delete schedule"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="p-4 space-y-3">
                    {/* Next Run */}
                    <div className="flex items-start gap-2">
                      <CalendarDaysIcon className="h-5 w-5 text-blue-400 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-xs text-gray-400 mb-1">Next Run</p>
                        <p className="text-sm text-white font-medium">
                          {formatDate(schedule.nextRunDate)}
                        </p>
                      </div>
                    </div>

                    {/* Details */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                      {schedule.location && (
                        <div className="flex items-start gap-2">
                          <MapPinIcon className="h-5 w-5 text-purple-400 mt-0.5" />
                          <div className="flex-1">
                            <p className="text-xs text-gray-400 mb-1">Location</p>
                            <p className="text-white">{schedule.location}</p>
                          </div>
                        </div>
                      )}
                      {schedule.sku && (
                        <div className="flex items-start gap-2">
                          <TagIcon className="h-5 w-5 text-orange-400 mt-0.5" />
                          <div className="flex-1">
                            <p className="text-xs text-gray-400 mb-1">SKU</p>
                            <p className="text-white font-mono">{schedule.sku}</p>
                          </div>
                        </div>
                      )}
                      <div className="flex items-start gap-2 sm:col-span-2">
                        <UserIcon className="h-5 w-5 text-cyan-400 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-xs text-gray-400 mb-1">Assigned To</p>
                          <p className="text-white">
                            {users.find((u: any) => u.userId === schedule.assignedTo)?.name ||
                              schedule.assignedTo}
                          </p>
                        </div>
                      </div>
                      {schedule.lastRunDate && (
                        <div className="flex items-start gap-2">
                          <ClockIcon className="h-5 w-5 text-gray-400 mt-0.5" />
                          <div className="flex-1">
                            <p className="text-xs text-gray-400 mb-1">Last Run</p>
                            <p className="text-sm text-gray-300">
                              {formatDate(schedule.lastRunDate)}
                            </p>
                          </div>
                        </div>
                      )}
                      {schedule.notes && (
                        <div className="flex items-start gap-2 col-span-1 sm:col-span-2">
                          <DocumentTextIcon className="h-5 w-5 text-gray-400 mt-0.5" />
                          <div className="flex-1">
                            <p className="text-xs text-gray-400 mb-1">Notes</p>
                            <p className="text-sm text-gray-300">{schedule.notes}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Create/Edit Modal */}
        {showModal && (
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
            onClick={() => setShowModal(false)}
          >
            <div
              className="bg-gray-900 rounded-lg shadow-xl max-w-2xl w-full mx-4 border border-gray-800 max-h-[90vh] overflow-y-auto"
              onClick={e => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="sticky top-0 z-10 bg-gray-900 border-b border-gray-800 px-6 py-4 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-white">
                    {editingSchedule ? 'Edit Schedule' : 'Create New Schedule'}
                  </h2>
                  <p className="text-sm text-gray-400">
                    {editingSchedule
                      ? 'Update the schedule configuration below.'
                      : 'Configure a new automated recurring count schedule.'}
                  </p>
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-2 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-white transition-colors"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>

              {/* Modal Body - Form */}
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                {/* Schedule Name */}
                <div>
                  <label
                    htmlFor="scheduleName"
                    className="block text-sm font-medium text-gray-300 mb-1"
                  >
                    Schedule Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    id="scheduleName"
                    name="scheduleName"
                    type="text"
                    value={values.scheduleName}
                    onChange={handleChange}
                    className={`w-full px-3 py-2 bg-gray-800 border rounded-lg focus:ring-2 focus:ring-blue-500 text-white placeholder-gray-500 ${
                      errors.scheduleName ? 'border-red-500' : 'border-gray-700'
                    }`}
                    placeholder="e.g., Weekly A-Items Count Zone A"
                  />
                  {errors.scheduleName && (
                    <p className="mt-1 text-sm text-red-400">{errors.scheduleName}</p>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Count Type */}
                  <div>
                    <label
                      htmlFor="countType"
                      className="block text-sm font-medium text-gray-300 mb-1"
                    >
                      Count Type <span className="text-red-400">*</span>
                    </label>
                    <select
                      id="countType"
                      name="countType"
                      value={values.countType}
                      onChange={handleChange}
                      className={`w-full px-3 py-2 bg-gray-800 border rounded-lg focus:ring-2 focus:ring-blue-500 text-white ${
                        errors.countType ? 'border-red-500' : 'border-gray-700'
                      }`}
                    >
                      <option value={CycleCountType.ABC}>ABC Analysis</option>
                      <option value={CycleCountType.BLANKET}>Blanket Count</option>
                      <option value={CycleCountType.SPOT_CHECK}>Spot Check</option>
                      <option value={CycleCountType.RECEIVING}>Receiving Count</option>
                      <option value={CycleCountType.SHIPPING}>Shipping Count</option>
                      <option value={CycleCountType.AD_HOC}>Ad Hoc</option>
                    </select>
                    {errors.countType && (
                      <p className="mt-1 text-sm text-red-400">{errors.countType}</p>
                    )}
                  </div>

                  {/* Frequency Type */}
                  <div>
                    <label
                      htmlFor="frequencyType"
                      className="block text-sm font-medium text-gray-300 mb-1"
                    >
                      Frequency <span className="text-red-400">*</span>
                    </label>
                    <select
                      id="frequencyType"
                      name="frequencyType"
                      value={values.frequencyType}
                      onChange={handleChange}
                      className={`w-full px-3 py-2 bg-gray-800 border rounded-lg focus:ring-2 focus:ring-blue-500 text-white ${
                        errors.frequencyType ? 'border-red-500' : 'border-gray-700'
                      }`}
                    >
                      <option value="DAILY">Daily</option>
                      <option value="WEEKLY">Weekly</option>
                      <option value="MONTHLY">Monthly</option>
                      <option value="QUARTERLY">Quarterly</option>
                    </select>
                    {errors.frequencyType && (
                      <p className="mt-1 text-sm text-red-400">{errors.frequencyType}</p>
                    )}
                  </div>
                </div>

                {/* Frequency Interval */}
                <div>
                  <label
                    htmlFor="frequencyInterval"
                    className="block text-sm font-medium text-gray-300 mb-1"
                  >
                    Interval <span className="text-red-400">*</span>
                  </label>
                  <input
                    id="frequencyInterval"
                    name="frequencyInterval"
                    type="number"
                    min="1"
                    max="52"
                    value={values.frequencyInterval}
                    onChange={handleChange}
                    className={`w-full px-3 py-2 bg-gray-800 border rounded-lg focus:ring-2 focus:ring-blue-500 text-white placeholder-gray-500 ${
                      errors.frequencyInterval ? 'border-red-500' : 'border-gray-700'
                    }`}
                    placeholder="1"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    How often to repeat (e.g., 2 = every 2 weeks, 6 = every 6 months)
                  </p>
                  {errors.frequencyInterval && (
                    <p className="mt-1 text-sm text-red-400">{errors.frequencyInterval}</p>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Location */}
                  <div>
                    <label
                      htmlFor="location"
                      className="block text-sm font-medium text-gray-300 mb-1"
                    >
                      Location <span className="text-gray-500">(optional)</span>
                    </label>
                    <input
                      id="location"
                      name="location"
                      type="text"
                      value={values.location}
                      onChange={handleChange}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 text-white placeholder-gray-500"
                      placeholder="e.g., A-01-01 or leave blank"
                    />
                  </div>

                  {/* SKU */}
                  <div>
                    <label htmlFor="sku" className="block text-sm font-medium text-gray-300 mb-1">
                      SKU <span className="text-gray-500">(optional)</span>
                    </label>
                    <input
                      id="sku"
                      name="sku"
                      type="text"
                      value={values.sku}
                      onChange={handleChange}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 text-white placeholder-gray-500"
                      placeholder="e.g., SKU-12345 or leave blank"
                    />
                  </div>
                </div>

                {/* Assigned To */}
                <div>
                  <label
                    htmlFor="assignedTo"
                    className="block text-sm font-medium text-gray-300 mb-1"
                  >
                    Assigned To <span className="text-red-400">*</span>
                  </label>
                  <select
                    id="assignedTo"
                    name="assignedTo"
                    value={values.assignedTo}
                    onChange={handleChange}
                    className={`w-full px-3 py-2 bg-gray-800 border rounded-lg focus:ring-2 focus:ring-blue-500 text-white ${
                      errors.assignedTo ? 'border-red-500' : 'border-gray-700'
                    }`}
                  >
                    <option value="">Select a user...</option>
                    {users.map((user: any) => (
                      <option key={user.userId} value={user.userId}>
                        {user.name} ({user.role})
                      </option>
                    ))}
                  </select>
                  {errors.assignedTo && (
                    <p className="mt-1 text-sm text-red-400">{errors.assignedTo}</p>
                  )}
                </div>

                {/* Next Run Date */}
                <div>
                  <label
                    htmlFor="nextRunDate"
                    className="block text-sm font-medium text-gray-300 mb-1"
                  >
                    Next Run Date <span className="text-red-400">*</span>
                  </label>
                  <input
                    id="nextRunDate"
                    name="nextRunDate"
                    type="datetime-local"
                    value={values.nextRunDate}
                    onChange={handleChange}
                    min={new Date().toISOString().slice(0, 16)}
                    className={`w-full px-3 py-2 bg-gray-800 border rounded-lg focus:ring-2 focus:ring-blue-500 text-white ${
                      errors.nextRunDate ? 'border-red-500' : 'border-gray-700'
                    }`}
                  />
                  <p className="mt-1 text-xs text-gray-500">First time this schedule will run</p>
                  {errors.nextRunDate && (
                    <p className="mt-1 text-sm text-red-400">{errors.nextRunDate}</p>
                  )}
                </div>

                {/* Notes */}
                <div>
                  <label htmlFor="notes" className="block text-sm font-medium text-gray-300 mb-1">
                    Notes <span className="text-gray-500">(optional)</span>
                  </label>
                  <textarea
                    id="notes"
                    name="notes"
                    value={values.notes}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 text-white placeholder-gray-500 resize-none"
                    rows={3}
                    placeholder="Add any additional notes or instructions..."
                  />
                </div>

                {/* Form Actions */}
                <div className="flex justify-end space-x-3 pt-4 border-t border-gray-800">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 border border-gray-700 rounded-lg text-gray-300 hover:bg-gray-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {isSubmitting
                      ? 'Saving...'
                      : editingSchedule
                        ? 'Update Schedule'
                        : 'Create Schedule'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete Confirmation Dialog */}
        <ConfirmDialog
          isOpen={deleteConfirm.isOpen}
          onClose={() => setDeleteConfirm({ isOpen: false, scheduleId: '', scheduleName: '' })}
          onConfirm={confirmDelete}
          title="Delete Schedule"
          message={`Are you sure you want to delete "${deleteConfirm.scheduleName}"? This action cannot be undone and will permanently remove this schedule.`}
          confirmText="Delete"
          cancelText="Cancel"
          variant="danger"
          isLoading={deleteMutation.isPending}
        />
      </main>
    </div>
  );
}

export default ScheduleManagementPage;
