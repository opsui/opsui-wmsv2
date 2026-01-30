/**
 * Schedule Management Page
 *
 * Admin interface for managing automated recurring cycle count schedules.
 * Allows creating, editing, and viewing recurring count schedules.
 */

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  useRecurringSchedules,
  useCreateRecurringSchedule,
  useUpdateRecurringSchedule,
  useDeleteRecurringSchedule,
} from '@/services/api';
import { CycleCountType } from '@opsui/shared';
import { Header, useToast, ConfirmDialog } from '@/components/shared';
import { useFormValidation } from '@/hooks/useFormValidation';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';

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
  const queryClient = useQueryClient();

  // Queries
  const { data: schedules = [], isLoading } = useRecurringSchedules();
  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const response = await fetch('/api/v1/users/assignable');
      return response.json();
    },
  });

  // Mutations
  const createMutation = useCreateRecurringSchedule();
  const updateMutation = useUpdateRecurringSchedule();
  const deleteMutation = useDeleteRecurringSchedule();

  // State
  const [showModal, setShowModal] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; scheduleId: string }>({
    isOpen: false,
    scheduleId: '',
  });

  // Reset to first page when search changes
  useEffect(() => {
    // No pagination, but keeping effect for consistency
  }, [searchTerm]);

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
          throw error; // Re-throw to prevent form from resetting
        }
      },
    });

  // Filter schedules
  const filteredSchedules = schedules.filter(schedule => {
    // Status filter
    if (filterStatus === 'active' && !schedule.isActive) return false;
    if (filterStatus === 'inactive' && schedule.isActive) return false;

    // Search filter
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
  const handleDelete = async (scheduleId: string) => {
    setDeleteConfirm({ isOpen: true, scheduleId });
  };

  const confirmDelete = async () => {
    const { scheduleId } = deleteConfirm;
    try {
      await deleteMutation.mutateAsync(scheduleId);
      showToast('Schedule deleted successfully', 'success');
    } catch (error: any) {
      showToast(error?.message || 'Failed to delete schedule', 'error');
    } finally {
      setDeleteConfirm({ isOpen: false, scheduleId: '' });
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

  // Calculate frequency description
  const getFrequencyDescription = (frequencyType: string, interval: number) => {
    const intervalText = interval > 1 ? `Every ${interval} ` : '';
    const typeText = frequencyType.toLowerCase();
    return `${intervalText}${typeText}`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen">
        <Header />
        <div className="schedule-management-page loading">
          <div className="loading-spinner">Loading schedules...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header />
      <div className="schedule-management-page">
        <div className="page-header">
          <h1>Recurring Count Schedules</h1>
          <button onClick={handleCreate} className="btn btn-primary">
            + New Schedule
          </button>
        </div>

        {/* Filters */}
        <div className="filters">
          <div className="filter-group">
            <button
              className={`filter-btn ${filterStatus === 'all' ? 'active' : ''}`}
              onClick={() => setFilterStatus('all')}
            >
              All ({schedules.length})
            </button>
            <button
              className={`filter-btn ${filterStatus === 'active' ? 'active' : ''}`}
              onClick={() => setFilterStatus('active')}
            >
              Active ({schedules.filter(s => s.isActive).length})
            </button>
            <button
              className={`filter-btn ${filterStatus === 'inactive' ? 'active' : ''}`}
              onClick={() => setFilterStatus('inactive')}
            >
              Inactive ({schedules.filter(s => !s.isActive).length})
            </button>
          </div>

          {/* Search Input */}
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search schedules..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2.5 w-64 bg-white/[0.05] border border-white/[0.08] rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
            />
          </div>
        </div>

        {/* Schedules List */}
        <div className="schedules-list">
          {filteredSchedules.length === 0 ? (
            <div className="empty-state">
              <p>No schedules found.</p>
              <button onClick={handleCreate} className="btn btn-primary">
                Create your first schedule
              </button>
            </div>
          ) : (
            <div className="schedules-grid">
              {filteredSchedules.map(schedule => (
                <div key={schedule.scheduleId} className="schedule-card">
                  <div className="card-header">
                    <div className="header-info">
                      <h3>{schedule.scheduleName}</h3>
                      <span className={`status-badge ${schedule.isActive ? 'active' : 'inactive'}`}>
                        {schedule.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <div className="card-actions">
                      <button
                        onClick={() => handleToggleActive(schedule.scheduleId, schedule.isActive)}
                        className="btn-icon"
                        title={schedule.isActive ? 'Disable' : 'Enable'}
                      >
                        {schedule.isActive ? '⏸' : '▶️'}
                      </button>
                      <button
                        onClick={() => handleEdit(schedule.scheduleId)}
                        className="btn-icon"
                        title="Edit"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => handleDelete(schedule.scheduleId)}
                        className="btn-icon btn-delete"
                        title="Delete"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>

                  <div className="card-body">
                    <div className="schedule-details">
                      <div className="detail-row">
                        <span className="label">Type:</span>
                        <span className="value">{schedule.countType}</span>
                      </div>
                      <div className="detail-row">
                        <span className="label">Frequency:</span>
                        <span className="value">
                          {getFrequencyDescription(
                            schedule.frequencyType,
                            schedule.frequencyInterval
                          )}
                        </span>
                      </div>
                      <div className="detail-row">
                        <span className="label">Next Run:</span>
                        <span className="value">{formatDate(schedule.nextRunDate)}</span>
                      </div>
                      {schedule.location && (
                        <div className="detail-row">
                          <span className="label">Location:</span>
                          <span className="value">{schedule.location}</span>
                        </div>
                      )}
                      {schedule.sku && (
                        <div className="detail-row">
                          <span className="label">SKU:</span>
                          <span className="value">{schedule.sku}</span>
                        </div>
                      )}
                      <div className="detail-row">
                        <span className="label">Assigned To:</span>
                        <span className="value">{schedule.assignedTo}</span>
                      </div>
                      {schedule.notes && (
                        <div className="detail-row">
                          <span className="label">Notes:</span>
                          <span className="value">{schedule.notes}</span>
                        </div>
                      )}
                      {schedule.lastRunDate && (
                        <div className="detail-row">
                          <span className="label">Last Run:</span>
                          <span className="value">{formatDate(schedule.lastRunDate)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Create/Edit Modal */}
        {showModal && (
          <div className="modal-overlay" onClick={() => setShowModal(false)}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h2>{editingSchedule ? 'Edit Schedule' : 'Create Schedule'}</h2>
                <button onClick={() => setShowModal(false)} className="btn-close">
                  ✕
                </button>
              </div>

              <form onSubmit={handleSubmit} className="modal-body">
                <div className="form-group">
                  <label htmlFor="scheduleName">Schedule Name *</label>
                  <input
                    id="scheduleName"
                    name="scheduleName"
                    type="text"
                    value={values.scheduleName}
                    onChange={handleChange}
                    className={`input ${errors.scheduleName ? 'input-error' : ''}`}
                    placeholder="Weekly A-Items Count"
                  />
                  {errors.scheduleName && <p className="error-text">{errors.scheduleName}</p>}
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="countType">Count Type *</label>
                    <select
                      id="countType"
                      name="countType"
                      value={values.countType}
                      onChange={handleChange}
                      className={`select ${errors.countType ? 'input-error' : ''}`}
                    >
                      <option value={CycleCountType.ABC}>ABC Analysis</option>
                      <option value={CycleCountType.BLANKET}>Blanket Count</option>
                      <option value={CycleCountType.SPOT_CHECK}>Spot Check</option>
                      <option value={CycleCountType.RECEIVING}>Receiving Count</option>
                      <option value={CycleCountType.SHIPPING}>Shipping Count</option>
                      <option value={CycleCountType.AD_HOC}>Ad Hoc</option>
                    </select>
                    {errors.countType && <p className="error-text">{errors.countType}</p>}
                  </div>

                  <div className="form-group">
                    <label htmlFor="frequencyType">Frequency *</label>
                    <select
                      id="frequencyType"
                      name="frequencyType"
                      value={values.frequencyType}
                      onChange={handleChange}
                      className={`select ${errors.frequencyType ? 'input-error' : ''}`}
                    >
                      <option value="DAILY">Daily</option>
                      <option value="WEEKLY">Weekly</option>
                      <option value="MONTHLY">Monthly</option>
                      <option value="QUARTERLY">Quarterly</option>
                    </select>
                    {errors.frequencyType && <p className="error-text">{errors.frequencyType}</p>}
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="frequencyInterval">Interval *</label>
                  <input
                    id="frequencyInterval"
                    name="frequencyInterval"
                    type="number"
                    min="1"
                    value={values.frequencyInterval}
                    onChange={handleChange}
                    className={`input ${errors.frequencyInterval ? 'input-error' : ''}`}
                    placeholder="1"
                  />
                  <small>How often the schedule repeats (e.g., 2 for every 2 weeks)</small>
                  {errors.frequencyInterval && (
                    <p className="error-text">{errors.frequencyInterval}</p>
                  )}
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="location">Location (Optional)</label>
                    <input
                      id="location"
                      name="location"
                      type="text"
                      value={values.location}
                      onChange={handleChange}
                      className="input"
                      placeholder="A-01-01"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="sku">SKU (Optional)</label>
                    <input
                      id="sku"
                      name="sku"
                      type="text"
                      value={values.sku}
                      onChange={handleChange}
                      className="input"
                      placeholder="SKU-12345"
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="assignedTo">Assigned To *</label>
                    <select
                      id="assignedTo"
                      name="assignedTo"
                      value={values.assignedTo}
                      onChange={handleChange}
                      className={`select ${errors.assignedTo ? 'input-error' : ''}`}
                    >
                      <option value="">Select user...</option>
                      {users.map((user: any) => (
                        <option key={user.userId} value={user.userId}>
                          {user.name} ({user.role})
                        </option>
                      ))}
                    </select>
                    {errors.assignedTo && <p className="error-text">{errors.assignedTo}</p>}
                  </div>

                  <div className="form-group">
                    <label htmlFor="nextRunDate">Next Run Date *</label>
                    <input
                      id="nextRunDate"
                      name="nextRunDate"
                      type="datetime-local"
                      value={values.nextRunDate}
                      onChange={handleChange}
                      className={`input ${errors.nextRunDate ? 'input-error' : ''}`}
                    />
                    {errors.nextRunDate && <p className="error-text">{errors.nextRunDate}</p>}
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="notes">Notes</label>
                  <textarea
                    id="notes"
                    name="notes"
                    value={values.notes}
                    onChange={handleChange}
                    className="textarea"
                    rows={3}
                    placeholder="Additional notes..."
                  />
                </div>

                <div className="modal-footer">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="btn btn-secondary"
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
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

        <ConfirmDialog
          isOpen={deleteConfirm.isOpen}
          onClose={() => setDeleteConfirm({ isOpen: false, scheduleId: '' })}
          onConfirm={confirmDelete}
          title="Delete Schedule"
          message="Are you sure you want to delete this schedule? This action cannot be undone."
          confirmText="Delete"
          cancelText="Cancel"
          variant="danger"
          isLoading={deleteMutation.isPending}
        />
      </div>
    </div>
  );
}

export default ScheduleManagementPage;
