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
  street1: string;
  street2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
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
        street1: '',
        street2: '',
        city: '',
        state: '',
        postalCode: '',
        country: 'NZ',
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
        street1: {
          required: true,
          minLength: 2,
          maxLength: 200,
        },
        street2: {
          required: false,
          maxLength: 200,
        },
        city: {
          required: true,
          minLength: 2,
          maxLength: 100,
        },
        state: {
          required: true,
          minLength: 2,
          maxLength: 100,
        },
        postalCode: {
          required: true,
          minLength: 2,
          maxLength: 20,
        },
        country: {
          required: true,
          minLength: 2,
          maxLength: 100,
        },
      },
      onSubmit: async values => {
        try {
          // Transform form data to match CreateCustomerDTO
          const customerData = {
            companyName: values.companyName,
            contactName: values.contactName,
            email: values.email,
            phone: values.phone,
            billingAddress: {
              street1: values.street1,
              street2: values.street2 || undefined,
              city: values.city,
              state: values.state,
              postalCode: values.postalCode,
              country: values.country,
            },
          };
          await createCustomerMutation.mutateAsync(customerData as any);
          showToast('Customer created successfully', 'success');
          reset();
          onClose();
          onSuccess?.();
        } catch (error: any) {
          const errorMessage =
            error?.response?.data?.error || error?.message || 'Failed to create customer';
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

        {/* Billing Address Section */}
        <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
          <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
            Billing Address
          </h4>

          <div className="space-y-4">
            <FormInput
              label="Street Address"
              name="street1"
              value={values.street1}
              onChange={handleChange}
              onBlur={() => handleBlur('street1')}
              error={errors.street1}
              required
              placeholder="123 Main Street"
            />

            <FormInput
              label="Street Address 2"
              name="street2"
              value={values.street2}
              onChange={handleChange}
              onBlur={() => handleBlur('street2')}
              error={errors.street2}
              placeholder="Apt, Suite, Unit, etc. (optional)"
            />

            <div className="grid grid-cols-2 gap-4">
              <FormInput
                label="City"
                name="city"
                value={values.city}
                onChange={handleChange}
                onBlur={() => handleBlur('city')}
                error={errors.city}
                required
                placeholder="Auckland"
              />

              <FormInput
                label="State/Province"
                name="state"
                value={values.state}
                onChange={handleChange}
                onBlur={() => handleBlur('state')}
                error={errors.state}
                required
                placeholder="Auckland"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormInput
                label="Postal Code"
                name="postalCode"
                value={values.postalCode}
                onChange={handleChange}
                onBlur={() => handleBlur('postalCode')}
                error={errors.postalCode}
                required
                placeholder="1010"
              />

              <FormInput
                label="Country"
                name="country"
                value={values.country}
                onChange={handleChange}
                onBlur={() => handleBlur('country')}
                error={errors.country}
                required
                placeholder="NZ"
              />
            </div>
          </div>
        </div>
      </form>
    </Modal>
  );
}