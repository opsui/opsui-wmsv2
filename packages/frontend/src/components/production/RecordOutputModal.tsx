/**
 * Record Production Output Modal
 *
 * Modal for recording production output and rejected quantities
 */

import { Modal, FormInput, Button, useToast } from '@/components/shared';
import { useState } from 'react';
import { useRecordProductionOutput } from '@/services/api';

// ============================================================================
// TYPES
// ============================================================================

interface RecordOutputModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  orderId: string;
  orderDetails: {
    productId: string;
    productName: string;
    quantityToProduce: number;
    quantityCompleted: number;
    quantityRejected: number;
    unitOfMeasure: string;
  };
}

interface OutputFormData {
  quantity: number;
  quantityRejected: number;
  lotNumber?: string;
  binLocation?: string;
  notes?: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function RecordOutputModal({
  isOpen,
  onClose,
  onSuccess,
  orderId,
  orderDetails,
}: RecordOutputModalProps) {
  const { showToast } = useToast();
  const recordOutputMutation = useRecordProductionOutput();

  const remainingToProduce =
    orderDetails.quantityToProduce - orderDetails.quantityCompleted - orderDetails.quantityRejected;

  const [formData, setFormData] = useState<OutputFormData>({
    quantity: Math.min(remainingToProduce, 1),
    quantityRejected: 0,
    lotNumber: '',
    binLocation: '',
    notes: '',
  });

  const [errors, setErrors] = useState<Partial<Record<keyof OutputFormData, string>>>({});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'quantity' || name === 'quantityRejected' ? parseFloat(value) || 0 : value,
    }));
    if (errors[name as keyof OutputFormData]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof OutputFormData, string>> = {};

    if (formData.quantity <= 0) {
      newErrors.quantity = 'Quantity must be greater than 0';
    }
    if (formData.quantityRejected < 0) {
      newErrors.quantityRejected = 'Rejected quantity cannot be negative';
    }

    const totalOutput = formData.quantity + formData.quantityRejected;
    if (totalOutput > remainingToProduce) {
      newErrors.quantity = `Total output (${totalOutput}) cannot exceed remaining (${remainingToProduce})`;
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
      await recordOutputMutation.mutateAsync({
        orderId,
        data: formData,
      });

      showToast('Production output recorded successfully', 'success');

      // Reset form
      setFormData({
        quantity: Math.min(remainingToProduce, 1),
        quantityRejected: 0,
        lotNumber: '',
        binLocation: '',
        notes: '',
      });
      setErrors({});

      onClose();
      onSuccess?.();
    } catch (error: any) {
      const errorMessage =
        error?.response?.data?.error || error?.message || 'Failed to record output';
      showToast(errorMessage, 'error');
    }
  };

  const calculateProgress = () => {
    const totalCompleted = orderDetails.quantityCompleted + formData.quantity;
    return Math.min(100, Math.round((totalCompleted / orderDetails.quantityToProduce) * 100));
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Record Production Output"
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={recordOutputMutation.isPending}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            disabled={recordOutputMutation.isPending}
          >
            {recordOutputMutation.isPending ? 'Recording...' : 'Record Output'}
          </Button>
        </>
      }
    >
      <div className="space-y-6">
        {/* Order Summary */}
        <div className="p-4 bg-white/5 border border-gray-700 rounded-lg">
          <h3 className="text-sm font-semibold text-white mb-3">Order Summary</h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-gray-400">Product:</span>
              <span className="ml-2 text-white">{orderDetails.productName}</span>
            </div>
            <div>
              <span className="text-gray-400">SKU:</span>
              <span className="ml-2 text-white">{orderDetails.productId}</span>
            </div>
            <div>
              <span className="text-gray-400">Quantity to Produce:</span>
              <span className="ml-2 text-white">
                {orderDetails.quantityToProduce} {orderDetails.unitOfMeasure}
              </span>
            </div>
            <div>
              <span className="text-gray-400">Unit of Measure:</span>
              <span className="ml-2 text-white">{orderDetails.unitOfMeasure}</span>
            </div>
            <div>
              <span className="text-gray-400">Already Completed:</span>
              <span className="ml-2 text-success-400">{orderDetails.quantityCompleted}</span>
            </div>
            <div>
              <span className="text-gray-400">Already Rejected:</span>
              <span className="ml-2 text-error-400">{orderDetails.quantityRejected}</span>
            </div>
            <div className="col-span-2">
              <span className="text-gray-400">Remaining to Produce:</span>
              <span className="ml-2 text-primary-400 font-semibold">
                {remainingToProduce} {orderDetails.unitOfMeasure}
              </span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-4">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-400">Current Progress</span>
              <span className="text-white">
                {orderDetails.quantityCompleted} / {orderDetails.quantityToProduce}
              </span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div
                className="bg-success-500 h-2 rounded-full transition-all"
                style={{
                  width: `${Math.round((orderDetails.quantityCompleted / orderDetails.quantityToProduce) * 100)}%`,
                }}
              />
            </div>
          </div>

          {/* New Progress Preview */}
          {formData.quantity > 0 && (
            <div className="mt-3 p-3 bg-primary-500/10 border border-primary-500/30 rounded-lg">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-300">After Recording:</span>
                <span className="text-primary-300 font-semibold">{calculateProgress()}%</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div
                  className="bg-primary-500 h-2 rounded-full transition-all"
                  style={{ width: `${calculateProgress()}%` }}
                />
              </div>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Good Quantity */}
          <FormInput
            label={`Good Quantity Produced (${orderDetails.unitOfMeasure}) *`}
            name="quantity"
            type="number"
            value={formData.quantity}
            onChange={handleChange}
            error={errors.quantity}
            required
            placeholder={`Max: ${remainingToProduce}`}
          />

          {/* Rejected Quantity */}
          <FormInput
            label={`Rejected Quantity (${orderDetails.unitOfMeasure})`}
            name="quantityRejected"
            type="number"
            value={formData.quantityRejected}
            onChange={handleChange}
            error={errors.quantityRejected}
            placeholder="Quantity that did not pass quality check"
          />

          {/* Lot Number */}
          <FormInput
            label="Lot Number"
            name="lotNumber"
            type="text"
            value={formData.lotNumber || ''}
            onChange={handleChange}
            placeholder="Optional lot/batch number for traceability"
          />

          {/* Bin Location */}
          <FormInput
            label="Bin Location"
            name="binLocation"
            type="text"
            value={formData.binLocation || ''}
            onChange={handleChange}
            placeholder="e.g., A-01-01"
          />

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Notes</label>
            <textarea
              name="notes"
              value={formData.notes || ''}
              onChange={handleChange}
              placeholder="Optional notes about this production run"
              rows={3}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </form>
      </div>
    </Modal>
  );
}
