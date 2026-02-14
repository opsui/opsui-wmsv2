/**
 * Create Lead Modal
 *
 * Modal form for creating a new sales lead with validation
 */

import { Modal, FormInput, FormSelect, Button, useToast } from '@/components/shared';
import { useFormValidation, commonValidations } from '@/hooks/useFormValidation';
import { useCreateLead, useUsers } from '@/services/api';

// ============================================================================
// TYPES
// ============================================================================

interface CreateLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface LeadFormData {
  customerName: string;
  contactName?: string;
  email?: string;
  phone?: string;
  company?: string;
  source: string;
  estimatedValue?: string;
  description?: string;
  assignedTo: string;
  expectedCloseDate?: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
}

const LEAD_SOURCES = [
  { value: 'WEBSITE', label: 'Website' },
  { value: 'REFERRAL', label: 'Referral' },
  { value: 'COLD_CALL', label: 'Cold Call' },
  { value: 'TRADE_SHOW', label: 'Trade Show' },
  { value: 'EMAIL_CAMPAIGN', label: 'Email Campaign' },
  { value: 'SOCIAL_MEDIA', label: 'Social Media' },
  { value: 'ADVERTISEMENT', label: 'Advertisement' },
  { value: 'PARTNER', label: 'Partner' },
  { value: 'OTHER', label: 'Other' },
];

const PRIORITIES = [
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
  { value: 'URGENT', label: 'Urgent' },
];

// ============================================================================
// COMPONENT
// ============================================================================

export function CreateLeadModal({ isOpen, onClose, onSuccess }: CreateLeadModalProps) {
  const { showToast } = useToast();
  const createLeadMutation = useCreateLead();
  const { data: users = [] } = useUsers();

  const { values, errors, handleChange, handleBlur, handleSubmit, isSubmitting, reset } =
    useFormValidation<LeadFormData>({
      initialValues: {
        customerName: '',
        contactName: '',
        email: '',
        phone: '',
        company: '',
        source: 'WEBSITE',
        estimatedValue: '',
        description: '',
        assignedTo: '',
        expectedCloseDate: '',
        priority: 'MEDIUM',
      },
      validationRules: {
        customerName: {
          required: true,
          minLength: 2,
          maxLength: 100,
        },
        contactName: {
          required: false,
          minLength: 2,
          maxLength: 100,
        },
        email: {
          ...commonValidations.email,
          required: false,
        },
        phone: {
          ...commonValidations.phone,
          required: false,
        },
        source: {
          required: true,
        },
        assignedTo: {
          required: true,
        },
        priority: {
          required: true,
        },
        estimatedValue: {
          required: false,
          pattern: /^\d+(\.\d{1,2})?$/,
        },
        expectedCloseDate: {
          required: false,
        },
      },
      onSubmit: async values => {
        try {
          await createLeadMutation.mutateAsync({
            ...values,
            estimatedValue: values.estimatedValue ? parseFloat(values.estimatedValue) : undefined,
          });
          showToast('Lead created successfully', 'success');
          reset();
          onClose();
          onSuccess?.();
        } catch (error: any) {
          const errorMessage =
            error?.response?.data?.error || error?.message || 'Failed to create lead';
          showToast(errorMessage, 'error');
        }
      },
    });

  const handleModalClose = () => {
    reset();
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleModalClose}
      title="Create New Lead"
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={handleModalClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="min-w-[120px]"
          >
            {isSubmitting ? 'Creating...' : 'Create Lead'}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormInput
            label="Customer Name *"
            name="customerName"
            value={values.customerName}
            onChange={handleChange}
            onBlur={() => handleBlur('customerName')}
            error={errors.customerName}
            required
            placeholder="Enter customer or company name"
            className="col-span-2"
          />

          <FormInput
            label="Contact Name"
            name="contactName"
            value={values.contactName || ''}
            onChange={handleChange}
            onBlur={() => handleBlur('contactName')}
            error={errors.contactName}
            placeholder="Primary contact person"
          />

          <FormInput
            label="Company"
            name="company"
            value={values.company || ''}
            onChange={handleChange}
            onBlur={() => handleBlur('company')}
            error={errors.company}
            placeholder="Company name"
          />

          <FormInput
            label="Email"
            name="email"
            type="email"
            value={values.email || ''}
            onChange={handleChange}
            onBlur={() => handleBlur('email')}
            error={errors.email}
            placeholder="contact@company.com"
          />

          <FormInput
            label="Phone"
            name="phone"
            type="tel"
            value={values.phone || ''}
            onChange={handleChange}
            onBlur={() => handleBlur('phone')}
            error={errors.phone}
            placeholder="+1 (555) 123-4567"
          />

          <FormSelect
            label="Lead Source *"
            name="source"
            value={values.source}
            onChange={handleChange}
            onBlur={() => handleBlur('source')}
            error={errors.source}
            required
            options={LEAD_SOURCES}
          />

          <FormSelect
            label="Priority *"
            name="priority"
            value={values.priority}
            onChange={handleChange}
            onBlur={() => handleBlur('priority')}
            error={errors.priority}
            required
            options={PRIORITIES}
          />

          <FormInput
            label="Estimated Value"
            name="estimatedValue"
            type="number"
            step="0.01"
            value={values.estimatedValue || ''}
            onChange={handleChange}
            onBlur={() => handleBlur('estimatedValue')}
            error={errors.estimatedValue}
            placeholder="0.00"
          />

          <FormInput
            label="Expected Close Date"
            name="expectedCloseDate"
            type="date"
            value={values.expectedCloseDate || ''}
            onChange={handleChange}
            onBlur={() => handleBlur('expectedCloseDate')}
            error={errors.expectedCloseDate}
            min={new Date().toISOString().split('T')[0]}
          />

          <FormSelect
            label="Assigned To *"
            name="assignedTo"
            value={values.assignedTo}
            onChange={handleChange}
            onBlur={() => handleBlur('assignedTo')}
            error={errors.assignedTo}
            required
            options={users.map(u => ({ value: u.userId, label: u.name || u.email }))}
          />

          <FormInput
            label="Description"
            name="description"
            value={values.description || ''}
            onChange={handleChange}
            onBlur={() => handleBlur('description')}
            error={errors.description}
            placeholder="Additional notes about this lead..."
            multiline
            rows={3}
            className="col-span-2"
          />
        </div>
      </form>
    </Modal>
  );
}
