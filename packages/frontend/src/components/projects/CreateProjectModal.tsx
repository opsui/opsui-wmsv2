/**
 * Create Project Modal Component
 *
 * Modal form for creating new projects with validation
 */

import { useState, useEffect } from 'react';
import { Modal, FormInput, FormTextarea, FormSelect, Button } from '@/components/shared';
import { CalendarIcon } from '@heroicons/react/24/outline';
import type { CreateProjectDTO, ProjectType, BillingType, Customer, User } from '@opsui/shared';

// ============================================================================
// TYPES
// ============================================================================

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  customers: Customer[];
  users: User[];
}

interface FormErrors {
  project_name?: string;
  project_type?: string;
  start_date?: string;
  estimated_budget?: string;
  billing_type?: string;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function CreateProjectModal({
  isOpen,
  onClose,
  onSuccess,
  customers,
  users,
}: CreateProjectModalProps) {
  // Form state
  const [formData, setFormData] = useState<CreateProjectDTO>({
    project_name: '',
    project_description: '',
    customer_id: '',
    project_type: 'TIME_MATERIALS' as ProjectType,
    start_date: new Date(),
    end_date: undefined,
    estimated_budget: 0,
    billing_type: 'MILESTONE' as BillingType,
    advance_payment: 0,
    project_manager_id: '',
    account_manager_id: '',
    tags: [],
    priority: 'MEDIUM',
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setFormData({
        project_name: '',
        project_description: '',
        customer_id: '',
        project_type: 'TIME_MATERIALS' as ProjectType,
        start_date: new Date(),
        end_date: undefined,
        estimated_budget: 0,
        billing_type: 'MILESTONE' as BillingType,
        advance_payment: 0,
        project_manager_id: '',
        account_manager_id: '',
        tags: [],
        priority: 'MEDIUM',
      });
      setErrors({});
    }
  }, [isOpen]);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.project_name.trim()) {
      newErrors.project_name = 'Project name is required';
    }

    if (!formData.start_date) {
      newErrors.start_date = 'Start date is required';
    }

    if (formData.estimated_budget !== undefined && formData.estimated_budget < 0) {
      newErrors.estimated_budget = 'Budget must be a positive number';
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
      const response = await fetch('/api/projects', {
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
        console.error('Failed to create project:', error);
        setErrors({ project_name: error.message || 'Failed to create project' });
      }
    } catch (error) {
      console.error('Failed to create project:', error);
      setErrors({ project_name: 'An unexpected error occurred' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name.includes('budget') || name.includes('payment') ? Number(value) || 0 : value,
    }));
    // Clear error for this field
    setErrors(prev => ({ ...prev, [name]: undefined }));
  };

  const projectTypeOptions = [
    { value: 'FIXED_BID', label: 'Fixed Bid' },
    { value: 'TIME_MATERIALS', label: 'Time & Materials' },
    { value: 'COST_PLUS', label: 'Cost Plus' },
    { value: 'RETAINER', label: 'Retainer' },
    { value: 'INTERNAL', label: 'Internal' },
  ];

  const billingTypeOptions = [
    { value: 'MILESTONE', label: 'Milestone' },
    { value: 'PROGRESS', label: 'Progress Billing' },
    { value: 'TIME_MATERIAL', label: 'Time & Material' },
    { value: 'FIXED_INTERVAL', label: 'Fixed Interval' },
    { value: 'COMPLETION', label: 'On Completion' },
  ];

  const priorityOptions = [
    { value: 'LOW', label: 'Low' },
    { value: 'MEDIUM', label: 'Medium' },
    { value: 'HIGH', label: 'High' },
    { value: 'URGENT', label: 'Urgent' },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create New Project"
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Creating...' : 'Create Project'}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Project Name */}
        <FormInput
          label="Project Name"
          name="project_name"
          value={formData.project_name}
          onChange={handleChange}
          error={errors.project_name}
          required
          placeholder="Enter project name"
        />

        {/* Description */}
        <FormTextarea
          label="Description"
          name="project_description"
          value={formData.project_description || ''}
          onChange={handleChange}
          placeholder="Enter project description (optional)"
          rows={3}
        />

        {/* Customer */}
        <FormSelect
          label="Customer"
          name="customer_id"
          value={formData.customer_id || ''}
          onChange={handleChange}
          options={[
            { value: '', label: 'Select a customer (optional)' },
            ...customers.map(c => ({ value: c.id, label: c.name })),
          ]}
        />

        {/* Project Type & Priority */}
        <div className="grid grid-cols-2 gap-4">
          <FormSelect
            label="Project Type"
            name="project_type"
            value={formData.project_type || ''}
            onChange={handleChange}
            options={projectTypeOptions}
            required
          />

          <FormSelect
            label="Priority"
            name="priority"
            value={formData.priority || ''}
            onChange={handleChange}
            options={priorityOptions}
          />
        </div>

        {/* Dates */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Start Date <span className="text-error-400">*</span>
            </label>
            <input
              type="date"
              name="start_date"
              value={
                formData.start_date ? new Date(formData.start_date).toISOString().split('T')[0] : ''
              }
              onChange={handleChange}
              className="w-full px-4 py-2.5 bg-white/[0.05] border border-white/[0.08] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500/50"
              required
            />
            {errors.start_date && (
              <p className="text-sm text-error-400 mt-1">{errors.start_date}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">End Date</label>
            <input
              type="date"
              name="end_date"
              value={
                formData.end_date ? new Date(formData.end_date).toISOString().split('T')[0] : ''
              }
              onChange={handleChange}
              className="w-full px-4 py-2.5 bg-white/[0.05] border border-white/[0.08] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500/50"
            />
          </div>
        </div>

        {/* Budget */}
        <FormInput
          label="Estimated Budget"
          name="estimated_budget"
          type="number"
          value={formData.estimated_budget || 0}
          onChange={handleChange}
          error={errors.estimated_budget}
          placeholder="0.00"
          min="0"
          step="0.01"
        />

        {/* Billing Type */}
        <FormSelect
          label="Billing Type"
          name="billing_type"
          value={formData.billing_type || ''}
          onChange={handleChange}
          options={billingTypeOptions}
        />

        {/* Advance Payment */}
        <FormInput
          label="Advance Payment"
          name="advance_payment"
          type="number"
          value={formData.advance_payment || 0}
          onChange={handleChange}
          placeholder="0.00"
          min="0"
          step="0.01"
        />

        {/* Managers */}
        <div className="grid grid-cols-2 gap-4">
          <FormSelect
            label="Project Manager"
            name="project_manager_id"
            value={formData.project_manager_id || ''}
            onChange={handleChange}
            options={[
              { value: '', label: 'Select manager (optional)' },
              ...users.map(u => ({
                value: u.user_id,
                label: `${u.first_name} ${u.last_name}`,
              })),
            ]}
          />

          <FormSelect
            label="Account Manager"
            name="account_manager_id"
            value={formData.account_manager_id || ''}
            onChange={handleChange}
            options={[
              { value: '', label: 'Select manager (optional)' },
              ...users.map(u => ({
                value: u.user_id,
                label: `${u.first_name} ${u.last_name}`,
              })),
            ]}
          />
        </div>
      </form>
    </Modal>
  );
}

export default CreateProjectModal;
