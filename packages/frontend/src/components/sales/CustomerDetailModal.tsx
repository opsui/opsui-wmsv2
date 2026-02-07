/**
 * Customer Detail Modal
 *
 * Modal for viewing and editing customer details with interaction history
 */

import { Modal, FormInput, FormSelect, Button, useToast } from '@/components/shared';
import { useFormValidation, commonValidations } from '@/hooks/useFormValidation';
import {
  useUpdateCustomer,
  useCustomerInteractions,
  useLogInteraction,
  useCustomer,
} from '@/services/api';
import { useState, useEffect } from 'react';
import {
  PhoneIcon,
  EnvelopeIcon,
  MapPinIcon,
  BuildingOfficeIcon,
} from '@heroicons/react/24/outline';

// ============================================================================
// TYPES
// ============================================================================

interface CustomerDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  customerId: string;
}

interface CustomerFormData {
  companyName: string;
  contactName?: string;
  email?: string;
  phone?: string;
  status: 'PROSPECT' | 'ACTIVE' | 'INACTIVE' | 'BLOCKED';
  notes?: string;
}

interface InteractionFormData {
  interactionType: 'CALL' | 'EMAIL' | 'MEETING' | 'NOTE' | 'OTHER';
  subject: string;
  notes: string;
  durationMinutes?: number;
  nextFollowUpDate?: string;
}

const INTERACTION_TYPES = [
  { value: 'CALL', label: 'Phone Call' },
  { value: 'EMAIL', label: 'Email' },
  { value: 'MEETING', label: 'Meeting' },
  { value: 'NOTE', label: 'Note' },
  { value: 'OTHER', label: 'Other' },
];

// ============================================================================
// COMPONENT
// ============================================================================

export function CustomerDetailModal({
  isOpen,
  onClose,
  onSuccess,
  customerId,
}: CustomerDetailModalProps) {
  const { showToast } = useToast();
  const updateCustomerMutation = useUpdateCustomer();
  const logInteractionMutation = useLogInteraction();

  const { data: customer, isLoading: isLoadingCustomer } = useCustomer(customerId);
  const { data: interactionsData, isLoading: isLoadingInteractions } = useCustomerInteractions(
    customerId,
    20
  );

  const [isEditing, setIsEditing] = useState(false);
  const [showNewInteraction, setShowNewInteraction] = useState(false);

  const { values, errors, handleChange, handleBlur, handleSubmit, isSubmitting, reset, setValues } =
    useFormValidation<CustomerFormData>({
      initialValues: {
        companyName: '',
        contactName: '',
        email: '',
        phone: '',
        status: 'PROSPECT',
        notes: '',
      },
      validationRules: {
        companyName: {
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
        status: {
          required: true,
        },
      },
      onSubmit: async values => {
        try {
          await updateCustomerMutation.mutateAsync({
            customerId,
            data: values,
          });
          showToast('Customer updated successfully', 'success');
          setIsEditing(false);
          onSuccess?.();
        } catch (error: any) {
          const errorMessage =
            error?.response?.data?.error || error?.message || 'Failed to update customer';
          showToast(errorMessage, 'error');
        }
      },
    });

  const {
    values: interactionValues,
    errors: interactionErrors,
    handleChange: handleInteractionChange,
    handleBlur: handleInteractionBlur,
    handleSubmit: handleInteractionSubmit,
    isSubmitting: isSubmittingInteraction,
    reset: resetInteraction,
  } = useFormValidation<InteractionFormData>({
    initialValues: {
      interactionType: 'CALL',
      subject: '',
      notes: '',
      durationMinutes: undefined,
      nextFollowUpDate: '',
    },
    validationRules: {
      interactionType: {
        required: true,
      },
      subject: {
        required: true,
        minLength: 2,
        maxLength: 200,
      },
      notes: {
        required: true,
        minLength: 2,
      },
      durationMinutes: {
        required: false,
        pattern: /^\d+$/,
        customError: 'Must be a number',
      },
      nextFollowUpDate: {
        required: false,
      },
    },
    onSubmit: async values => {
      try {
        await logInteractionMutation.mutateAsync({
          customerId,
          ...values,
          nextFollowUpDate: values.nextFollowUpDate ? new Date(values.nextFollowUpDate) : undefined,
        });
        showToast('Interaction logged successfully', 'success');
        resetInteraction();
        setShowNewInteraction(false);
        onSuccess?.();
      } catch (error: any) {
        const errorMessage =
          error?.response?.data?.error || error?.message || 'Failed to log interaction';
        showToast(errorMessage, 'error');
      }
    },
  });

  // Update form values when customer data loads
  useEffect(() => {
    if (customer) {
      setValues({
        companyName: customer.companyName,
        contactName: customer.contactName || '',
        email: customer.email || '',
        phone: customer.phone || '',
        status: customer.status,
        notes: customer.notes || '',
      });
    }
  }, [customer, setValues]);

  const handleModalClose = () => {
    setIsEditing(false);
    setShowNewInteraction(false);
    reset();
    resetInteraction();
    onClose();
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      PROSPECT: 'bg-purple-500/20 text-purple-300 border border-purple-500/30',
      ACTIVE: 'bg-success-500/20 text-success-300 border border-success-500/30',
      INACTIVE: 'bg-gray-500/20 text-gray-300 border border-gray-500/30',
      BLOCKED: 'bg-danger-500/20 text-danger-300 border border-danger-500/30',
    };
    return colors[status] || colors.PROSPECT;
  };

  const getInteractionTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      CALL: 'bg-blue-500/20 text-blue-300',
      EMAIL: 'bg-purple-500/20 text-purple-300',
      MEETING: 'bg-green-500/20 text-green-300',
      NOTE: 'bg-yellow-500/20 text-yellow-300',
      OTHER: 'bg-gray-500/20 text-gray-300',
    };
    return colors[type] || colors.OTHER;
  };

  if (isLoadingCustomer) {
    return (
      <Modal isOpen={isOpen} onClose={handleModalClose} title="Customer Details" size="xl">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
        </div>
      </Modal>
    );
  }

  if (!customer) {
    return null;
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleModalClose}
      title="Customer Details"
      size="xl"
      footer={
        <>
          <Button variant="secondary" onClick={handleModalClose}>
            Close
          </Button>
          {!isEditing && (
            <Button variant="primary" onClick={() => setIsEditing(true)}>
              Edit Customer
            </Button>
          )}
          {isEditing && (
            <>
              <Button variant="secondary" onClick={() => setIsEditing(false)}>
                Cancel
              </Button>
              <Button variant="primary" onClick={handleSubmit} disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : 'Save Changes'}
              </Button>
            </>
          )}
        </>
      }
    >
      <div className="space-y-6">
        {/* Customer Info */}
        <div className="grid grid-cols-3 gap-6">
          {/* Main Details */}
          <div className="col-span-2 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-bold text-white">{customer.companyName}</h2>
                <p className="text-sm text-gray-400">{customer.customerNumber}</p>
              </div>
              {!isEditing && (
                <span
                  className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(customer.status)}`}
                >
                  {customer.status}
                </span>
              )}
            </div>

            <div className="space-y-3">
              {customer.contactName && (
                <div className="flex items-center gap-3 text-sm">
                  <BuildingOfficeIcon className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-300">{customer.contactName}</span>
                </div>
              )}
              {customer.email && (
                <div className="flex items-center gap-3 text-sm">
                  <EnvelopeIcon className="h-4 w-4 text-gray-400" />
                  <a href={`mailto:${customer.email}`} className="text-primary-400 hover:underline">
                    {customer.email}
                  </a>
                </div>
              )}
              {customer.phone && (
                <div className="flex items-center gap-3 text-sm">
                  <PhoneIcon className="h-4 w-4 text-gray-400" />
                  <a href={`tel:${customer.phone}`} className="text-primary-400 hover:underline">
                    {customer.phone}
                  </a>
                </div>
              )}
              {customer.billingAddress && (
                <div className="flex items-start gap-3 text-sm">
                  <MapPinIcon className="h-4 w-4 text-gray-400 mt-0.5" />
                  <span className="text-gray-300">
                    {[
                      customer.billingAddress.street1,
                      customer.billingAddress.city,
                      customer.billingAddress.state,
                      customer.billingAddress.postalCode,
                    ]
                      .filter(Boolean)
                      .join(', ')}
                  </span>
                </div>
              )}
            </div>

            {/* Financial Info */}
            <div className="grid grid-cols-3 gap-4 mt-4">
              <div className="bg-white/5 p-3 rounded-lg text-center">
                <p className="text-gray-400 text-xs mb-1">Account Balance</p>
                <p className="text-lg font-bold text-white">
                  ${(customer.accountBalance || 0).toFixed(2)}
                </p>
              </div>
              {customer.creditLimit !== undefined && (
                <div className="bg-white/5 p-3 rounded-lg text-center">
                  <p className="text-gray-400 text-xs mb-1">Credit Limit</p>
                  <p className="text-lg font-bold text-white">${customer.creditLimit.toFixed(2)}</p>
                </div>
              )}
              {customer.paymentTerms && (
                <div className="bg-white/5 p-3 rounded-lg text-center">
                  <p className="text-gray-400 text-xs mb-1">Payment Terms</p>
                  <p className="text-sm text-white">{customer.paymentTerms}</p>
                </div>
              )}
            </div>

            {/* Edit Form */}
            {isEditing && (
              <div className="space-y-3 mt-4 pt-4 border-t border-white/10">
                <FormInput
                  label="Company Name"
                  name="companyName"
                  value={values.companyName}
                  onChange={handleChange}
                  onBlur={() => handleBlur('companyName')}
                  error={errors.companyName}
                  required
                />
                <FormInput
                  label="Contact Name"
                  name="contactName"
                  value={values.contactName || ''}
                  onChange={handleChange}
                  onBlur={() => handleBlur('contactName')}
                  error={errors.contactName}
                />
                <div className="grid grid-cols-2 gap-3">
                  <FormInput
                    label="Email"
                    name="email"
                    type="email"
                    value={values.email || ''}
                    onChange={handleChange}
                    onBlur={() => handleBlur('email')}
                    error={errors.email}
                  />
                  <FormInput
                    label="Phone"
                    name="phone"
                    type="tel"
                    value={values.phone || ''}
                    onChange={handleChange}
                    onBlur={() => handleBlur('phone')}
                    error={errors.phone}
                  />
                </div>
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
                    { value: 'BLOCKED', label: 'Blocked' },
                  ]}
                />
                <FormInput
                  label="Notes"
                  name="notes"
                  value={values.notes || ''}
                  onChange={handleChange}
                  onBlur={() => handleBlur('notes')}
                  error={errors.notes}
                  multiline
                  rows={3}
                />
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="col-span-1">
            <div className="bg-white/5 rounded-lg p-4 border border-white/10">
              <h3 className="text-sm font-semibold text-white mb-3">Quick Actions</h3>
              <div className="space-y-2">
                <Button
                  variant="secondary"
                  size="sm"
                  className="w-full"
                  onClick={() => setShowNewInteraction(true)}
                >
                  Log Interaction
                </Button>
                <Button variant="secondary" size="sm" className="w-full">
                  Create Quote
                </Button>
                <Button variant="secondary" size="sm" className="w-full">
                  View Orders
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Interaction History */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-white">Interaction History</h3>
          </div>

          {showNewInteraction ? (
            <div className="bg-white/5 rounded-lg p-4 border border-white/10 mb-4">
              <h4 className="text-sm font-semibold text-white mb-3">Log New Interaction</h4>
              <form onSubmit={handleInteractionSubmit} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <FormSelect
                    label="Type"
                    name="interactionType"
                    value={interactionValues.interactionType}
                    onChange={handleInteractionChange}
                    onBlur={() => handleInteractionBlur('interactionType')}
                    error={interactionErrors.interactionType}
                    required
                    options={INTERACTION_TYPES}
                  />
                  <FormInput
                    label="Duration (minutes)"
                    name="durationMinutes"
                    type="number"
                    min="0"
                    value={interactionValues.durationMinutes || ''}
                    onChange={handleInteractionChange}
                    onBlur={() => handleInteractionBlur('durationMinutes')}
                    error={interactionErrors.durationMinutes}
                  />
                </div>
                <FormInput
                  label="Subject"
                  name="subject"
                  value={interactionValues.subject}
                  onChange={handleInteractionChange}
                  onBlur={() => handleInteractionBlur('subject')}
                  error={interactionErrors.subject}
                  required
                  placeholder="Interaction summary"
                />
                <FormInput
                  label="Notes"
                  name="notes"
                  value={interactionValues.notes}
                  onChange={handleInteractionChange}
                  onBlur={() => handleInteractionBlur('notes')}
                  error={interactionErrors.notes}
                  required
                  multiline
                  rows={3}
                  placeholder="Details of the interaction..."
                />
                <FormInput
                  label="Next Follow-up Date"
                  name="nextFollowUpDate"
                  type="date"
                  value={interactionValues.nextFollowUpDate || ''}
                  onChange={handleInteractionChange}
                  onBlur={() => handleInteractionBlur('nextFollowUpDate')}
                  error={interactionErrors.nextFollowUpDate}
                  min={new Date().toISOString().split('T')[0]}
                />
                <div className="flex gap-2">
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    disabled={isSubmittingInteraction}
                  >
                    {isSubmittingInteraction ? 'Saving...' : 'Save Interaction'}
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setShowNewInteraction(false);
                      resetInteraction();
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </div>
          ) : null}

          {isLoadingInteractions ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-500"></div>
            </div>
          ) : interactionsData?.interactions && interactionsData.interactions.length > 0 ? (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {interactionsData.interactions.map((interaction: any) => (
                <div
                  key={interaction.interactionId}
                  className="bg-white/5 rounded-lg p-3 border border-white/10"
                >
                  <div className="flex items-start justify-between mb-2">
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-medium ${getInteractionTypeColor(interaction.interactionType)}`}
                    >
                      {interaction.interactionType}
                    </span>
                    <span className="text-xs text-gray-400">
                      {new Date(interaction.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-white">{interaction.subject}</p>
                  <p className="text-xs text-gray-400 mt-1">{interaction.notes}</p>
                  {interaction.durationMinutes && (
                    <p className="text-xs text-gray-500 mt-1">{interaction.durationMinutes} min</p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400 text-center py-8">No interactions logged yet</p>
          )}
        </div>
      </div>
    </Modal>
  );
}
