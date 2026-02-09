/**
 * Time Entry Modal Component
 *
 * Modal form for logging time entries with project and task selection
 */

import { useState, useEffect } from 'react';
import { Modal, FormInput, FormTextarea, FormSelect, Button } from '@/components/shared';
import { CalendarIcon, ClockIcon } from '@heroicons/react/24/outline';
import type { CreateTimeEntryDTO, ProjectTask, WorkType } from '@opsui/shared';

// ============================================================================
// TYPES
// ============================================================================

interface TimeEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  projectId: string;
  tasks: ProjectTask[];
}

interface FormErrors {
  work_date?: string;
  regular_hours?: string;
  description?: string;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function TimeEntryModal({
  isOpen,
  onClose,
  onSuccess,
  projectId,
  tasks,
}: TimeEntryModalProps) {
  // Form state
  const [formData, setFormData] = useState<CreateTimeEntryDTO>({
    project_id: projectId,
    task_id: '',
    work_date: new Date(),
    work_type: 'REGULAR' as WorkType,
    regular_hours: 0,
    overtime_1_5_hours: 0,
    overtime_2_0_hours: 0,
    description: '',
    billable: true,
    billing_rate: undefined,
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setFormData({
        project_id: projectId,
        task_id: '',
        work_date: new Date(),
        work_type: 'REGULAR' as WorkType,
        regular_hours: 0,
        overtime_1_5_hours: 0,
        overtime_2_0_hours: 0,
        description: '',
        billable: true,
        billing_rate: undefined,
      });
      setErrors({});
    }
  }, [isOpen, projectId]);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.work_date) {
      newErrors.work_date = 'Work date is required';
    }

    const totalHours =
      (formData.regular_hours || 0) +
      (formData.overtime_1_5_hours || 0) +
      (formData.overtime_2_0_hours || 0);

    if (totalHours <= 0) {
      newErrors.regular_hours = 'At least one hour type must be greater than 0';
    }

    if (!formData.description?.trim()) {
      newErrors.description = 'Description is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/projects/time-entries', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        onSuccess();
      } else {
        const error = await response.json();
        console.error('Failed to create time entry:', error);
        setErrors({ description: error.message || 'Failed to create time entry' });
      }
    } catch (error) {
      console.error('Failed to create time entry:', error);
      setErrors({ description: 'An unexpected error occurred' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;

    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else if (name.includes('hours') || name === 'billing_rate') {
      setFormData(prev => ({
        ...prev,
        [name]: Number(value) || 0,
      }));
    } else if (name === 'work_date') {
      setFormData(prev => ({
        ...prev,
        [name]: new Date(value),
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }

    // Clear error for this field
    setErrors(prev => ({ ...prev, [name]: undefined }));
  };

  const workTypeOptions = [
    { value: 'REGULAR', label: 'Regular' },
    { value: 'OVERTIME_1_5', label: 'Overtime (1.5x)' },
    { value: 'OVERTIME_2_0', label: 'Overtime (2.0x)' },
    { value: 'TRAVEL', label: 'Travel' },
    { value: 'TRAINING', label: 'Training' },
  ];

  // Calculate total hours
  const totalHours =
    (formData.regular_hours || 0) +
    (formData.overtime_1_5_hours || 0) +
    (formData.overtime_2_0_hours || 0);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Log Time Entry"
      size="md"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : 'Save Time Entry'}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Work Date */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Work Date <span className="text-error-400">*</span>
          </label>
          <input
            type="date"
            name="work_date"
            value={
              formData.work_date ? new Date(formData.work_date).toISOString().split('T')[0] : ''
            }
            onChange={handleChange}
            className="w-full px-4 py-2.5 bg-white/[0.05] border border-white/[0.08] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500/50"
            required
          />
          {errors.work_date && <p className="text-sm text-error-400 mt-1">{errors.work_date}</p>}
        </div>

        {/* Task Selection */}
        <FormSelect
          label="Task"
          name="task_id"
          value={formData.task_id || ''}
          onChange={handleChange}
          options={[
            { value: '', label: 'Select a task (optional)' },
            ...tasks.map(t => ({ value: t.task_id, label: t.task_name })),
          ]}
        />

        {/* Work Type */}
        <FormSelect
          label="Work Type"
          name="work_type"
          value={formData.work_type || ''}
          onChange={handleChange}
          options={workTypeOptions}
          required
        />

        {/* Hours */}
        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-300">
            Hours <span className="text-error-400">*</span>
          </label>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Regular</label>
              <input
                type="number"
                name="regular_hours"
                value={formData.regular_hours || 0}
                onChange={handleChange}
                min="0"
                step="0.25"
                placeholder="0.00"
                className="w-full px-3 py-2 bg-white/[0.05] border border-white/[0.08] rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-1">OT (1.5x)</label>
              <input
                type="number"
                name="overtime_1_5_hours"
                value={formData.overtime_1_5_hours || 0}
                onChange={handleChange}
                min="0"
                step="0.25"
                placeholder="0.00"
                className="w-full px-3 py-2 bg-white/[0.05] border border-white/[0.08] rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-1">OT (2.0x)</label>
              <input
                type="number"
                name="overtime_2_0_hours"
                value={formData.overtime_2_0_hours || 0}
                onChange={handleChange}
                min="0"
                step="0.25"
                placeholder="0.00"
                className="w-full px-3 py-2 bg-white/[0.05] border border-white/[0.08] rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50"
              />
            </div>
          </div>

          {errors.regular_hours && <p className="text-sm text-error-400">{errors.regular_hours}</p>}

          {/* Total Hours Display */}
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <ClockIcon className="h-4 w-4" />
            <span>Total: {totalHours.toFixed(2)} hours</span>
          </div>
        </div>

        {/* Description */}
        <FormTextarea
          label="Description"
          name="description"
          value={formData.description || ''}
          onChange={handleChange}
          error={errors.description}
          required
          placeholder="Describe the work performed"
          rows={3}
        />

        {/* Billable & Billing Rate */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center h-full pt-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                name="billable"
                checked={formData.billable || false}
                onChange={handleChange}
                className="w-4 h-4 rounded border-gray-600 text-primary-600 focus:ring-primary-500 focus:ring-offset-gray-900"
              />
              <span className="text-sm text-gray-300">Billable</span>
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Billing Rate (optional)
            </label>
            <input
              type="number"
              name="billing_rate"
              value={formData.billing_rate || ''}
              onChange={handleChange}
              min="0"
              step="0.01"
              placeholder="0.00"
              className="w-full px-4 py-2.5 bg-white/[0.05] border border-white/[0.08] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500/50"
            />
          </div>
        </div>
      </form>
    </Modal>
  );
}

export default TimeEntryModal;
