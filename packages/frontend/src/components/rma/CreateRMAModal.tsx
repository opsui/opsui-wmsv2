/**
 * Create RMA Modal
 *
 * Modal form for creating a new Return Merchandise Authorization request
 */

import { useState, ChangeEvent } from 'react';
import { Modal, Button, useToast } from '@/components/shared';
import { useCreateRMA } from '@/services/api';
import { RMAReason, RMAPriority } from '@opsui/shared';

// ============================================================================
// TYPES
// ============================================================================

interface CreateRMAModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  defaultOrderId?: string;
  defaultOrderItemId?: string;
  defaultSku?: string;
  defaultProductName?: string;
  defaultQuantity?: number;
}

interface RMAFormData {
  orderId: string;
  orderItemId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  sku: string;
  productName: string;
  quantity: string;
  reason: RMAReason;
  reasonDescription: string;
  priority: RMAPriority;
  customerNotes: string;
}

const REASON_OPTIONS = [
  { value: RMAReason.DEFECTIVE, label: 'Defective Product' },
  { value: RMAReason.DAMAGED_SHIPPING, label: 'Damaged in Shipping' },
  { value: RMAReason.WRONG_ITEM, label: 'Wrong Item Shipped' },
  { value: RMAReason.NO_LONGER_NEEDED, label: 'No Longer Needed' },
  { value: RMAReason.WARRANTY, label: 'Warranty Claim' },
  { value: RMAReason.OTHER, label: 'Other' },
];

const PRIORITY_OPTIONS = [
  { value: RMAPriority.LOW, label: 'Low' },
  { value: RMAPriority.NORMAL, label: 'Normal' },
  { value: RMAPriority.HIGH, label: 'High' },
  { value: RMAPriority.URGENT, label: 'Urgent' },
];

// ============================================================================
// COMPONENT
// ============================================================================

export function CreateRMAModal({
  isOpen,
  onClose,
  onSuccess,
  defaultOrderId,
  defaultOrderItemId,
  defaultSku,
  defaultProductName,
  defaultQuantity,
}: CreateRMAModalProps) {
  const { showToast } = useToast();
  const createRMAMutation = useCreateRMA();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [values, setValues] = useState<RMAFormData>({
    orderId: defaultOrderId || '',
    orderItemId: defaultOrderItemId || '',
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    sku: defaultSku || '',
    productName: defaultProductName || '',
    quantity: defaultQuantity?.toString() || '1',
    reason: RMAReason.DEFECTIVE,
    reasonDescription: '',
    priority: RMAPriority.NORMAL,
    customerNotes: '',
  });

  const [errors, setErrors] = useState<Partial<Record<keyof RMAFormData, string>>>({});

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setValues(prev => ({ ...prev, [name]: value }));
    // Clear error when user types
    if (errors[name as keyof RMAFormData]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof RMAFormData, string>> = {};

    if (!values.orderId.trim()) {
      newErrors.orderId = 'Order ID is required';
    }
    if (!values.orderItemId.trim()) {
      newErrors.orderItemId = 'Order Item ID is required';
    }
    if (!values.customerName.trim()) {
      newErrors.customerName = 'Customer name is required';
    }
    if (!values.sku.trim()) {
      newErrors.sku = 'SKU is required';
    }
    if (!values.productName.trim()) {
      newErrors.productName = 'Product name is required';
    }
    const qty = parseInt(values.quantity);
    if (isNaN(qty) || qty < 1) {
      newErrors.quantity = 'Quantity must be at least 1';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      await createRMAMutation.mutateAsync({
        ...values,
        quantity: parseInt(values.quantity),
      });
      showToast(`RMA Created - Return request has been created successfully.`, 'success');
      setValues({
        orderId: defaultOrderId || '',
        orderItemId: defaultOrderItemId || '',
        customerName: '',
        customerEmail: '',
        customerPhone: '',
        sku: defaultSku || '',
        productName: defaultProductName || '',
        quantity: defaultQuantity?.toString() || '1',
        reason: RMAReason.DEFECTIVE,
        reasonDescription: '',
        priority: RMAPriority.NORMAL,
        customerNotes: '',
      });
      onSuccess?.();
      onClose();
    } catch (error: any) {
      showToast(
        `Failed to Create RMA - ${error.response?.data?.error || error.message || 'An error occurred while creating the RMA request.'}`,
        'error'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClassName =
    'w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-primary-500/50 focus:bg-white/10 transition-all duration-300';
  const errorClassName = 'border-red-500/50 focus:border-red-500';
  const labelClassName = 'block text-sm font-medium text-gray-300 mb-1.5';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create Return Request" size="lg">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Order Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white">Order Information</h3>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="orderId" className={labelClassName}>
                Order ID *
              </label>
              <input
                id="orderId"
                name="orderId"
                type="text"
                value={values.orderId}
                onChange={handleChange}
                placeholder="e.g., ORD-20260114-6060"
                className={`${inputClassName} ${errors.orderId ? errorClassName : ''}`}
                required
              />
              {errors.orderId && <p className="mt-1 text-sm text-red-400">{errors.orderId}</p>}
            </div>

            <div>
              <label htmlFor="orderItemId" className={labelClassName}>
                Order Item ID *
              </label>
              <input
                id="orderItemId"
                name="orderItemId"
                type="text"
                value={values.orderItemId}
                onChange={handleChange}
                placeholder="e.g., ITEM-001"
                className={`${inputClassName} ${errors.orderItemId ? errorClassName : ''}`}
                required
              />
              {errors.orderItemId && (
                <p className="mt-1 text-sm text-red-400">{errors.orderItemId}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="sku" className={labelClassName}>
                SKU *
              </label>
              <input
                id="sku"
                name="sku"
                type="text"
                value={values.sku}
                onChange={handleChange}
                placeholder="e.g., WMS-001"
                className={`${inputClassName} ${errors.sku ? errorClassName : ''}`}
                required
              />
              {errors.sku && <p className="mt-1 text-sm text-red-400">{errors.sku}</p>}
            </div>

            <div>
              <label htmlFor="productName" className={labelClassName}>
                Product Name *
              </label>
              <input
                id="productName"
                name="productName"
                type="text"
                value={values.productName}
                onChange={handleChange}
                placeholder="e.g., Widget A"
                className={`${inputClassName} ${errors.productName ? errorClassName : ''}`}
                required
              />
              {errors.productName && (
                <p className="mt-1 text-sm text-red-400">{errors.productName}</p>
              )}
            </div>
          </div>

          <div>
            <label htmlFor="quantity" className={labelClassName}>
              Quantity *
            </label>
            <input
              id="quantity"
              name="quantity"
              type="number"
              min="1"
              value={values.quantity}
              onChange={handleChange}
              className={`${inputClassName} ${errors.quantity ? errorClassName : ''}`}
              required
            />
            {errors.quantity && <p className="mt-1 text-sm text-red-400">{errors.quantity}</p>}
          </div>
        </div>

        {/* Customer Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white">Customer Information</h3>

          <div>
            <label htmlFor="customerName" className={labelClassName}>
              Customer Name *
            </label>
            <input
              id="customerName"
              name="customerName"
              type="text"
              value={values.customerName}
              onChange={handleChange}
              placeholder="e.g., John Smith"
              className={`${inputClassName} ${errors.customerName ? errorClassName : ''}`}
              required
            />
            {errors.customerName && (
              <p className="mt-1 text-sm text-red-400">{errors.customerName}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="customerEmail" className={labelClassName}>
                Email (Optional)
              </label>
              <input
                id="customerEmail"
                name="customerEmail"
                type="email"
                value={values.customerEmail}
                onChange={handleChange}
                placeholder="customer@example.com"
                className={inputClassName}
              />
            </div>

            <div>
              <label htmlFor="customerPhone" className={labelClassName}>
                Phone (Optional)
              </label>
              <input
                id="customerPhone"
                name="customerPhone"
                type="tel"
                value={values.customerPhone}
                onChange={handleChange}
                placeholder="+1 (555) 123-4567"
                className={inputClassName}
              />
            </div>
          </div>
        </div>

        {/* Return Details */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white">Return Details</h3>

          <div>
            <label htmlFor="reason" className={labelClassName}>
              Reason for Return *
            </label>
            <select
              id="reason"
              name="reason"
              value={values.reason}
              onChange={handleChange}
              className={inputClassName}
              required
            >
              {REASON_OPTIONS.map(option => (
                <option key={option.value} value={option.value} className="bg-gray-800">
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="reasonDescription" className={labelClassName}>
              Reason Description
            </label>
            <textarea
              id="reasonDescription"
              name="reasonDescription"
              value={values.reasonDescription}
              onChange={handleChange}
              placeholder="Please provide details about the reason for return..."
              rows={3}
              className={inputClassName}
            />
          </div>

          <div>
            <label htmlFor="priority" className={labelClassName}>
              Priority *
            </label>
            <select
              id="priority"
              name="priority"
              value={values.priority}
              onChange={handleChange}
              className={inputClassName}
              required
            >
              {PRIORITY_OPTIONS.map(option => (
                <option key={option.value} value={option.value} className="bg-gray-800">
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="customerNotes" className={labelClassName}>
              Customer Notes (Optional)
            </label>
            <textarea
              id="customerNotes"
              name="customerNotes"
              value={values.customerNotes}
              onChange={handleChange}
              placeholder="Any additional notes from the customer..."
              rows={2}
              className={inputClassName}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-700">
          <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={isSubmitting}>
            {isSubmitting ? 'Creating...' : 'Create RMA'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
