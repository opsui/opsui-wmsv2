/**
 * Create Production Order Modal
 *
 * Modal form for creating a new production order
 */

import { Modal, FormInput, FormSelect, Button, useToast } from '@/components/shared';
import { useState } from 'react';
import { useCreateProductionOrder, useBOMs } from '@/services/api';

// ============================================================================
// TYPES
// ============================================================================

interface CreateProductionOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface ProductionOrderFormData {
  bomId: string;
  quantityToProduce: number;
  scheduledStartDate: string;
  scheduledEndDate: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  assignedTo?: string;
}

const priorityOptions = [
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Normal' },
  { value: 'HIGH', label: 'High' },
  { value: 'URGENT', label: 'Urgent' },
];

// ============================================================================
// COMPONENT
// ============================================================================

export function CreateProductionOrderModal({
  isOpen,
  onClose,
  onSuccess,
}: CreateProductionOrderModalProps) {
  const { showToast } = useToast();
  const createOrderMutation = useCreateProductionOrder();
  const { data: bomsData } = useBOMs();

  const [formData, setFormData] = useState<ProductionOrderFormData>({
    bomId: '',
    quantityToProduce: 1,
    scheduledStartDate: new Date().toISOString().split('T')[0],
    scheduledEndDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    priority: 'MEDIUM',
    assignedTo: '',
  });

  const [errors, setErrors] = useState<Partial<Record<keyof ProductionOrderFormData, string>>>({});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'quantityToProduce' ? parseInt(value) || 0 : value,
    }));
    // Clear error when user starts typing
    if (errors[name as keyof ProductionOrderFormData]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof ProductionOrderFormData, string>> = {};

    if (!formData.bomId) {
      newErrors.bomId = 'BOM is required';
    }
    if (formData.quantityToProduce <= 0) {
      newErrors.quantityToProduce = 'Quantity must be greater than 0';
    }
    if (!formData.scheduledStartDate) {
      newErrors.scheduledStartDate = 'Start date is required';
    }
    if (!formData.scheduledEndDate) {
      newErrors.scheduledEndDate = 'End date is required';
    }
    if (formData.scheduledStartDate >= formData.scheduledEndDate) {
      newErrors.scheduledEndDate = 'End date must be after start date';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    try {
      await createOrderMutation.mutateAsync(formData);
      showToast('Production order created successfully', 'success');
      // Reset form
      setFormData({
        bomId: '',
        quantityToProduce: 1,
        scheduledStartDate: new Date().toISOString().split('T')[0],
        scheduledEndDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split('T')[0],
        priority: 'MEDIUM',
        assignedTo: '',
      });
      setErrors({});
      onClose();
      onSuccess?.();
    } catch (error: any) {
      const errorMessage =
        error?.response?.data?.error || error?.message || 'Failed to create production order';
      showToast(errorMessage, 'error');
    }
  };

  const bomOptions = [
    { value: '', label: 'Select a BOM...' },
    ...(bomsData?.boms || []).map((bom: any) => ({
      value: bom.bomId,
      label: `${bom.name} (v${bom.version}) - ${bom.productId}`,
    })),
  ];

  const hasNoBOMs = !bomsData?.boms || bomsData?.boms?.length === 0;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create Production Order"
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={createOrderMutation.isPending}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmit} disabled={createOrderMutation.isPending}>
            {createOrderMutation.isPending ? 'Creating...' : 'Create Order'}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormSelect
          label="Bill of Materials"
          name="bomId"
          value={formData.bomId}
          onChange={handleChange}
          error={errors.bomId}
          options={bomOptions}
          required
        />

        {hasNoBOMs && (
          <div className="flex items-center justify-between p-3 bg-warning-500/10 border border-warning-500/30 rounded-lg">
            <div className="flex items-center gap-2 text-sm text-warning-300">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              No BOMs available. You need to create a Bill of Materials first.
            </div>
            <button
              type="button"
              onClick={() => {
                onClose();
                window.location.href = '/production?tab=bom';
              }}
              className="px-3 py-1.5 bg-warning-500 hover:bg-warning-600 text-white text-xs font-medium rounded-md transition-colors"
            >
              Go to BOMs
            </button>
          </div>
        )}

        <FormInput
          label="Quantity to Produce"
          name="quantityToProduce"
          type="number"
          value={formData.quantityToProduce}
          onChange={handleChange}
          error={errors.quantityToProduce}
          required
          placeholder="Enter quantity to produce"
        />

        <div className="grid grid-cols-2 gap-4">
          <FormInput
            label="Start Date"
            name="scheduledStartDate"
            type="date"
            value={formData.scheduledStartDate}
            onChange={handleChange}
            error={errors.scheduledStartDate}
            required
          />

          <FormInput
            label="End Date"
            name="scheduledEndDate"
            type="date"
            value={formData.scheduledEndDate}
            onChange={handleChange}
            error={errors.scheduledEndDate}
            required
          />
        </div>

        <FormSelect
          label="Priority"
          name="priority"
          value={formData.priority}
          onChange={handleChange}
          options={priorityOptions}
          required
        />

        <FormInput
          label="Assigned To (Optional)"
          name="assignedTo"
          type="text"
          value={formData.assignedTo || ''}
          onChange={handleChange}
          placeholder="User ID or team name"
        />
      </form>
    </Modal>
  );
}
