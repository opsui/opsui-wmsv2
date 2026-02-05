/**
 * Material Management Modal
 *
 * Modal for managing production order materials (issue/return)
 */

import { Modal, FormInput, Button, useToast } from '@/components/shared';
import { useState } from 'react';
import { useIssueMaterial, useReturnMaterial } from '@/services/api';

// ============================================================================
// TYPES
// ============================================================================

interface MaterialManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  orderId: string;
  components: Array<{
    componentId: string;
    sku: string;
    description?: string;
    quantityRequired: number;
    quantityIssued: number;
    quantityReturned: number;
    unitOfMeasure: string;
    binLocation?: string;
    lotNumber?: string;
  }>;
  orderStatus?: string;
}

type ActionType = 'issue' | 'return';

interface MaterialFormData {
  componentId: string;
  quantity: number;
  binLocation?: string;
  lotNumber?: string;
  notes?: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function MaterialManagementModal({
  isOpen,
  onClose,
  onSuccess,
  orderId,
  components,
  orderStatus,
}: MaterialManagementModalProps) {
  const { showToast } = useToast();
  const issueMutation = useIssueMaterial();
  const returnMutation = useReturnMaterial();

  const [actionType, setActionType] = useState<ActionType>('issue');
  const [selectedComponentId, setSelectedComponentId] = useState('');
  const [formData, setFormData] = useState<MaterialFormData>({
    componentId: '',
    quantity: 1,
    binLocation: '',
    lotNumber: '',
    notes: '',
  });

  const [errors, setErrors] = useState<Partial<Record<keyof MaterialFormData, string>>>({});

  const selectedComponent = components.find(c => c.componentId === selectedComponentId);

  // Calculate max quantity based on action type
  const maxQuantity =
    actionType === 'issue'
      ? (selectedComponent?.quantityRequired || 0) - (selectedComponent?.quantityIssued || 0)
      : (selectedComponent?.quantityIssued || 0) - (selectedComponent?.quantityReturned || 0);

  const canIssue = orderStatus === 'RELEASED' || orderStatus === 'IN_PROGRESS';
  const canReturn =
    orderStatus === 'IN_PROGRESS' || orderStatus === 'ON_HOLD' || orderStatus === 'COMPLETED';

  const resetForm = () => {
    setSelectedComponentId('');
    setFormData({
      componentId: '',
      quantity: 1,
      binLocation: '',
      lotNumber: '',
      notes: '',
    });
    setErrors({});
  };

  const handleActionTypeChange = (type: ActionType) => {
    setActionType(type);
    resetForm();
  };

  const handleComponentChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const componentId = e.target.value;
    setSelectedComponentId(componentId);
    setFormData(prev => ({ ...prev, componentId }));
    setErrors({});
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'quantity' ? parseFloat(value) || 0 : value,
    }));
    if (errors[name as keyof MaterialFormData]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof MaterialFormData, string>> = {};

    if (!selectedComponentId) {
      newErrors.componentId = 'Component is required';
    }
    if (formData.quantity <= 0) {
      newErrors.quantity = 'Quantity must be greater than 0';
    }
    if (actionType === 'issue' && formData.quantity > maxQuantity) {
      newErrors.quantity = `Cannot issue more than ${maxQuantity} ${selectedComponent?.unitOfMeasure || ''}`;
    }
    if (actionType === 'return' && formData.quantity > maxQuantity) {
      newErrors.quantity = `Cannot return more than ${maxQuantity} ${selectedComponent?.unitOfMeasure || ''}`;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    const mutation = actionType === 'issue' ? issueMutation : returnMutation;

    try {
      await mutation.mutateAsync({
        orderId,
        data: {
          ...formData,
          quantity: formData.quantity,
        },
      });

      const successMsg =
        actionType === 'issue'
          ? 'Materials issued successfully'
          : 'Materials returned successfully';
      showToast(successMsg, 'success');

      resetForm();
      onSuccess?.();
    } catch (error: any) {
      const errorMessage =
        error?.response?.data?.error || error?.message || `Failed to ${actionType} materials`;
      showToast(errorMessage, 'error');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Material Management"
      size="lg"
      footer={
        <>
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={issueMutation.isPending || returnMutation.isPending}
          >
            Close
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            disabled={issueMutation.isPending || returnMutation.isPending}
          >
            {issueMutation.isPending || returnMutation.isPending
              ? 'Processing...'
              : actionType === 'issue'
                ? 'Issue Materials'
                : 'Return Materials'}
          </Button>
        </>
      }
    >
      <div className="space-y-6">
        {/* Action Type Toggle */}
        <div className="flex gap-2">
          <Button
            type="button"
            variant={actionType === 'issue' ? 'primary' : 'secondary'}
            onClick={() => handleActionTypeChange('issue')}
            disabled={!canIssue}
            className="flex-1"
          >
            Issue Materials
          </Button>
          <Button
            type="button"
            variant={actionType === 'return' ? 'primary' : 'secondary'}
            onClick={() => handleActionTypeChange('return')}
            disabled={!canReturn}
            className="flex-1"
          >
            Return Materials
          </Button>
        </div>

        {!canIssue && actionType === 'issue' && (
          <p className="text-sm text-warning-400">
            Materials can only be issued for RELEASED or IN_PROGRESS orders
          </p>
        )}
        {!canReturn && actionType === 'return' && (
          <p className="text-sm text-warning-400">
            Materials can only be returned from IN_PROGRESS, ON_HOLD, or COMPLETED orders
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Component Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Component *</label>
            <select
              name="componentId"
              value={selectedComponentId}
              onChange={handleComponentChange}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              required
              disabled={issueMutation.isPending || returnMutation.isPending}
            >
              <option value="">Select a component...</option>
              {components.map(comp => (
                <option key={comp.componentId} value={comp.componentId}>
                  {comp.sku} - {comp.description || 'No description'}
                  (Required: {comp.quantityRequired}, Issued: {comp.quantityIssued}, Returned:{' '}
                  {comp.quantityReturned})
                </option>
              ))}
            </select>
            {errors.componentId && (
              <p className="mt-1 text-sm text-red-400">{errors.componentId}</p>
            )}
          </div>

          {/* Component Details */}
          {selectedComponent && (
            <div className="p-4 bg-white/5 border border-gray-700 rounded-lg">
              <h4 className="text-sm font-semibold text-white mb-2">Component Details</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-gray-400">SKU:</span>
                  <span className="ml-2 text-white">{selectedComponent.sku}</span>
                </div>
                <div>
                  <span className="text-gray-400">Unit of Measure:</span>
                  <span className="ml-2 text-white">{selectedComponent.unitOfMeasure}</span>
                </div>
                <div>
                  <span className="text-gray-400">Required:</span>
                  <span className="ml-2 text-white">{selectedComponent.quantityRequired}</span>
                </div>
                <div>
                  <span className="text-gray-400">Already Issued:</span>
                  <span className="ml-2 text-white">{selectedComponent.quantityIssued}</span>
                </div>
                <div>
                  <span className="text-gray-400">Already Returned:</span>
                  <span className="ml-2 text-white">{selectedComponent.quantityReturned}</span>
                </div>
                <div>
                  <span className="text-gray-400">
                    {actionType === 'issue' ? 'Available to Issue:' : 'Available to Return:'}
                  </span>
                  <span className="ml-2 text-primary-400 font-semibold">{maxQuantity}</span>
                </div>
              </div>
            </div>
          )}

          {/* Quantity */}
          <FormInput
            label={`${actionType === 'issue' ? 'Issue' : 'Return'} Quantity *`}
            name="quantity"
            type="number"
            value={formData.quantity}
            onChange={handleChange}
            error={errors.quantity}
            required
            disabled={!selectedComponent}
            placeholder={`Max: ${maxQuantity}`}
          />

          {/* Bin Location */}
          <FormInput
            label="Bin Location"
            name="binLocation"
            type="text"
            value={formData.binLocation || ''}
            onChange={handleChange}
            placeholder="e.g., A-01-01"
            disabled={!selectedComponent}
          />

          {/* Lot Number */}
          <FormInput
            label="Lot Number"
            name="lotNumber"
            type="text"
            value={formData.lotNumber || ''}
            onChange={handleChange}
            placeholder="Optional lot tracking number"
            disabled={!selectedComponent}
          />

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Notes</label>
            <textarea
              name="notes"
              value={formData.notes || ''}
              onChange={handleChange}
              placeholder="Optional notes about this transaction"
              rows={3}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              disabled={!selectedComponent}
            />
          </div>
        </form>
      </div>
    </Modal>
  );
}
