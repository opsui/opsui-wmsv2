/**
 * Create Customer Modal
 *
 * Modal form for creating a new customer with validation
 */

import { Modal, FormInput, FormSelect, Button, useToast } from '@/components/shared';
import { useFormValidation, commonValidations } from '@/hooks/useFormValidation';
import { useCreateCustomer } from '@/services/api';

// ============================================================================
// TYPES
// ============================================================================

interface CreateCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface CustomerFormData {
  companyName: string;
  contactName: string;
  email: string;
  phone: string;
  status: 'PROSPECT' | 'ACTIVE' | 'INACTIVE';
}

// ============================================================================
// COMPONENT
// ============================================================================

export function CreateCustomerModal({ isOpen, onClose, onSuccess }: CreateCustomerModalProps) {
  const { showToast } = useToast();
  const createCustomerMutation = useCreateCustomer();

  const { values, errors, handleChange, handleBlur, handleSubmit, isSubmitting, reset } =
    useFormValidation<CustomerFormData>({
      initialValues: {
        companyName: '',
        contactName: '',
        email: '',
        phone: '',
        status: 'PROSPECT',
      },
      validationRules: {
        companyName: {
          required: true,
          minLength: 2,
          maxLength: 100,
        },
        contactName: {
          required: true,
          minLength: 2,
          maxLength: 100,
        },
        email: {
          ...commonValidations.email,
          required: true,
        },
        phone: {
          ...commonValidations.phone,
          required: false,
        },
        status: {
          required: true,
        },
      },
      onSubmit: async values => {
        try {
          await createCustomerMutation.mutateAsync(values);
          showToast('Customer created successfully', 'success');
          reset();
          onClose();
          onSuccess?.();
        } catch (error: any) {
          const errorMessage = error?.response?.data?.error || error?.message || 'Failed to create customer';
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
      title="Create New Customer"
      size="md"
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
            {isSubmitting ? 'Creating...' : 'Create Customer'}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormInput
          label="Company Name"
          name="companyName"
          value={values.companyName}
          onChange={handleChange}
          onBlur={() => handleBlur('companyName')}
          error={errors.companyName}
          required
          placeholder="Enter company name"
        />

        <FormInput
          label="Contact Name"
          name="contactName"
          value={values.contactName}
          onChange={handleChange}
          onBlur={() => handleBlur('contactName')}
          error={errors.contactName}
          required
          placeholder="Enter contact person name"
        />

        <FormInput
          label="Email"
          name="email"
          type="email"
          value={values.email}
          onChange={handleChange}
          onBlur={() => handleBlur('email')}
          error={errors.email}
          required
          placeholder="contact@company.com"
        />

        <FormInput
          label="Phone"
          name="phone"
          type="tel"
          value={values.phone}
          onChange={handleChange}
          onBlur={() => handleBlur('phone')}
          error={errors.phone}
          placeholder="+1 (555) 123-4567"
        />

        <FormSelect
          label="Status"
          name="status"
          value={values.status}
          onChange={handleChange}
          onBlur={() => handleBlur('status')}
          error={errors.status}
          required
          options={[
            { value: 'PROSPECT', label: 'Prospect' },
            { value: 'ACTIVE', label: 'Active' },
            { value: 'INACTIVE', label: 'Inactive' },
          ]}
        />
      </form>
    </Modal>
  );
}
