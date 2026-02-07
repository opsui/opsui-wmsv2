/**
 * Create Opportunity Modal
 *
 * Modal form for creating a new sales opportunity with validation
 */

import { Modal, FormInput, FormSelect, Button, useToast } from '@/components/shared';
import { useFormValidation, commonValidations } from '@/hooks/useFormValidation';
import { useCreateOpportunity, useUsers, useCustomers } from '@/services/api';

// ============================================================================
// TYPES
// ============================================================================

interface CreateOpportunityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface OpportunityFormData {
  customerId?: string;
  name: string;
  amount: string;
  expectedCloseDate: string;
  stage: string;
  probability: string;
  source: string;
  description?: string;
  assignedTo: string;
  competitor?: string;
}

const STAGES = [
  { value: 'PROSPECTING', label: 'Prospecting', probability: 10 },
  { value: 'QUALIFICATION', label: 'Qualification', probability: 25 },
  { value: 'PROPOSAL', label: 'Proposal', probability: 50 },
  { value: 'NEGOTIATION', label: 'Negotiation', probability: 75 },
  { value: 'CLOSED_WON', label: 'Closed Won', probability: 100 },
  { value: 'CLOSED_LOST', label: 'Closed Lost', probability: 0 },
];

const SOURCES = [
  { value: 'LEAD_CONVERSION', label: 'Lead Conversion' },
  { value: 'REFERRAL', label: 'Referral' },
  { value: 'COLD_CALL', label: 'Cold Call' },
  { value: 'WEBSITE', label: 'Website' },
  { value: 'TRADE_SHOW', label: 'Trade Show' },
  { value: 'PARTNER', label: 'Partner' },
  { value: 'EXISTING_CUSTOMER', label: 'Existing Customer' },
  { value: 'OTHER', label: 'Other' },
];

// ============================================================================
// COMPONENT
// ============================================================================

export function CreateOpportunityModal({
  isOpen,
  onClose,
  onSuccess,
}: CreateOpportunityModalProps) {
  const { showToast } = useToast();
  const createOpportunityMutation = useCreateOpportunity();
  const { data: usersData } = useUsers();
  const { data: customersData } = useCustomers();

  const users = usersData?.users || [];
  const customers = customersData?.customers || [];

  const { values, errors, handleChange, handleBlur, handleSubmit, isSubmitting, reset, setValue } =
    useFormValidation<OpportunityFormData>({
      initialValues: {
        customerId: '',
        name: '',
        amount: '',
        expectedCloseDate: '',
        stage: 'PROSPECTING',
        probability: '10',
        source: 'WEBSITE',
        description: '',
        assignedTo: '',
        competitor: '',
      },
      validationRules: {
        name: {
          required: true,
          minLength: 2,
          maxLength: 200,
        },
        amount: {
          required: true,
          pattern: /^\d+(\.\d{1,2})?$/,
          customError: 'Must be a valid amount',
        },
        expectedCloseDate: {
          required: true,
        },
        stage: {
          required: true,
        },
        probability: {
          required: true,
          pattern: /^\d+$/,
          customError: 'Must be a number between 0 and 100',
        },
        source: {
          required: true,
        },
        assignedTo: {
          required: true,
        },
        customerId: {
          required: false,
        },
      },
      onSubmit: async values => {
        try {
          await createOpportunityMutation.mutateAsync({
            ...values,
            amount: parseFloat(values.amount),
            probability: parseInt(values.probability),
            customerId: values.customerId || undefined,
          });
          showToast('Opportunity created successfully', 'success');
          reset();
          onClose();
          onSuccess?.();
        } catch (error: any) {
          const errorMessage =
            error?.response?.data?.error || error?.message || 'Failed to create opportunity';
          showToast(errorMessage, 'error');
        }
      },
    });

  // Update probability when stage changes
  const handleStageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const stage = e.target.value;
    const selectedStage = STAGES.find(s => s.value === stage);
    if (selectedStage) {
      setValue('probability', selectedStage.probability.toString());
    }
    handleChange(e);
  };

  // Build options for select dropdowns
  const customerOptions = [
    { value: '', label: 'Select a customer...' },
    ...customers.map(c => ({
      value: c.customerId,
      label: `${c.customerNumber} - ${c.companyName}`,
    })),
  ];

  const handleModalClose = () => {
    reset();
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleModalClose}
      title="Create New Opportunity"
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
            {isSubmitting ? 'Creating...' : 'Create Opportunity'}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormInput
            label="Opportunity Name *"
            name="name"
            value={values.name}
            onChange={handleChange}
            onBlur={() => handleBlur('name')}
            error={errors.name}
            required
            placeholder="e.g., Annual Software License"
            className="col-span-2"
          />

          <FormSelect
            label="Customer (Optional)"
            name="customerId"
            value={values.customerId || ''}
            onChange={handleChange}
            onBlur={() => handleBlur('customerId')}
            error={errors.customerId}
            options={customerOptions}
          />

          <FormInput
            label="Amount *"
            name="amount"
            type="number"
            step="0.01"
            value={values.amount}
            onChange={handleChange}
            onBlur={() => handleBlur('amount')}
            error={errors.amount}
            required
            placeholder="0.00"
          />

          <FormSelect
            label="Stage *"
            name="stage"
            value={values.stage}
            onChange={handleStageChange}
            onBlur={() => handleBlur('stage')}
            error={errors.stage}
            required
            options={STAGES.map(s => ({ value: s.value, label: s.label }))}
          />

          <FormInput
            label="Probability (%) *"
            name="probability"
            type="number"
            min="0"
            max="100"
            value={values.probability}
            onChange={handleChange}
            onBlur={() => handleBlur('probability')}
            error={errors.probability}
            required
            placeholder="10"
          />

          <FormInput
            label="Expected Close Date *"
            name="expectedCloseDate"
            type="date"
            value={values.expectedCloseDate}
            onChange={handleChange}
            onBlur={() => handleBlur('expectedCloseDate')}
            error={errors.expectedCloseDate}
            required
            min={new Date().toISOString().split('T')[0]}
          />

          <FormSelect
            label="Source *"
            name="source"
            value={values.source}
            onChange={handleChange}
            onBlur={() => handleBlur('source')}
            error={errors.source}
            required
            options={SOURCES}
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
            label="Competitor (Optional)"
            name="competitor"
            value={values.competitor || ''}
            onChange={handleChange}
            onBlur={() => handleBlur('competitor')}
            error={errors.competitor}
            placeholder="Main competitor"
          />

          <FormInput
            label="Description"
            name="description"
            value={values.description || ''}
            onChange={handleChange}
            onBlur={() => handleBlur('description')}
            error={errors.description}
            placeholder="Additional details about this opportunity..."
            multiline
            rows={3}
            className="col-span-2"
          />
        </div>
      </form>
    </Modal>
  );
}
