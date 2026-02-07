/**
 * Create Quote Modal
 *
 * Modal form for creating a new sales quote with line items
 */

import { Modal, FormInput, FormSelect, Button, useToast } from '@/components/shared';
import { useFormValidation, commonValidations } from '@/hooks/useFormValidation';
import { useCreateQuote, useCustomers, useOpportunities } from '@/services/api';
import { useState } from 'react';
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline';

// ============================================================================
// TYPES
// ============================================================================

interface CreateQuoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface QuoteFormData {
  customerId: string;
  opportunityId?: string;
  validUntil: string;
  notes?: string;
  termsAndConditions?: string;
}

interface QuoteLineItem {
  sku: string;
  description: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  taxRate: number;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function CreateQuoteModal({ isOpen, onClose, onSuccess }: CreateQuoteModalProps) {
  const { showToast } = useToast();
  const createQuoteMutation = useCreateQuote();
  const { data: customersData } = useCustomers();
  const { data: opportunitiesData } = useOpportunities();

  const customers = customersData?.customers || [];
  const opportunities = opportunitiesData?.opportunities || [];

  const [lineItems, setLineItems] = useState<QuoteLineItem[]>([
    {
      sku: '',
      description: '',
      quantity: 1,
      unitPrice: 0,
      discount: 0,
      taxRate: 15,
    },
  ]);

  const { values, errors, handleChange, handleBlur, handleSubmit, isSubmitting, reset } =
    useFormValidation<QuoteFormData>({
      initialValues: {
        customerId: '',
        opportunityId: '',
        validUntil: '',
        notes: '',
        termsAndConditions: '',
      },
      validationRules: {
        customerId: {
          required: true,
        },
        validUntil: {
          required: true,
        },
        opportunityId: {
          required: false,
        },
      },
      onSubmit: async values => {
        // Validate line items
        if (lineItems.length === 0) {
          showToast('Please add at least one line item', 'error');
          return;
        }

        const hasInvalidItem = lineItems.some(
          item => !item.sku || !item.description || item.quantity <= 0 || item.unitPrice < 0
        );

        if (hasInvalidItem) {
          showToast('Please fill in all required line item fields', 'error');
          return;
        }

        try {
          await createQuoteMutation.mutateAsync({
            ...values,
            lineItems: lineItems.map((item, index) => ({
              ...item,
              lineNumber: index + 1,
              total:
                item.quantity *
                item.unitPrice *
                (1 - item.discount / 100) *
                (1 + item.taxRate / 100),
            })),
          });
          showToast('Quote created successfully', 'success');
          reset();
          setLineItems([
            {
              sku: '',
              description: '',
              quantity: 1,
              unitPrice: 0,
              discount: 0,
              taxRate: 15,
            },
          ]);
          onClose();
          onSuccess?.();
        } catch (error: any) {
          const errorMessage =
            error?.response?.data?.error || error?.message || 'Failed to create quote';
          showToast(errorMessage, 'error');
        }
      },
    });

  const addLineItem = () => {
    setLineItems([
      ...lineItems,
      {
        sku: '',
        description: '',
        quantity: 1,
        unitPrice: 0,
        discount: 0,
        taxRate: 15,
      },
    ]);
  };

  const removeLineItem = (index: number) => {
    if (lineItems.length > 1) {
      setLineItems(lineItems.filter((_, i) => i !== index));
    }
  };

  const updateLineItem = (index: number, field: keyof QuoteLineItem, value: any) => {
    const newItems = [...lineItems];
    newItems[index] = { ...newItems[index], [field]: value };
    setLineItems(newItems);
  };

  const calculateTotals = () => {
    let subtotal = 0;
    let totalTax = 0;
    let totalDiscount = 0;

    lineItems.forEach(item => {
      const lineTotal = item.quantity * item.unitPrice;
      const lineDiscount = lineTotal * (item.discount / 100);
      const lineSubtotal = lineTotal - lineDiscount;
      const lineTax = lineSubtotal * (item.taxRate / 100);

      subtotal += lineSubtotal;
      totalTax += lineTax;
      totalDiscount += lineDiscount;
    });

    return {
      subtotal,
      totalTax,
      totalDiscount,
      total: subtotal + totalTax,
    };
  };

  const totals = calculateTotals();

  // Build options for select dropdowns
  const customerOptions = customers.map(c => ({
    value: c.customerId,
    label: `${c.customerNumber} - ${c.companyName}`,
  }));

  const opportunityOptions = [
    { value: '', label: 'Select an opportunity...' },
    ...opportunities.map(o => ({
      value: o.opportunityId,
      label: `${o.opportunityNumber} - ${o.name}`,
    })),
  ];

  const handleModalClose = () => {
    reset();
    setLineItems([
      {
        sku: '',
        description: '',
        quantity: 1,
        unitPrice: 0,
        discount: 0,
        taxRate: 15,
      },
    ]);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleModalClose}
      title="Create New Quote"
      size="xl"
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
            {isSubmitting ? 'Creating...' : 'Create Quote'}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Quote Details */}
        <div className="grid grid-cols-2 gap-4">
          <FormSelect
            label="Customer *"
            name="customerId"
            value={values.customerId}
            onChange={handleChange}
            onBlur={() => handleBlur('customerId')}
            error={errors.customerId}
            required
            options={customerOptions}
          />

          <FormSelect
            label="Opportunity (Optional)"
            name="opportunityId"
            value={values.opportunityId || ''}
            onChange={handleChange}
            onBlur={() => handleBlur('opportunityId')}
            error={errors.opportunityId}
            options={opportunityOptions}
          />

          <FormInput
            label="Valid Until *"
            name="validUntil"
            type="date"
            value={values.validUntil}
            onChange={handleChange}
            onBlur={() => handleBlur('validUntil')}
            error={errors.validUntil}
            required
            min={new Date().toISOString().split('T')[0]}
          />
        </div>

        {/* Line Items */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-white">Line Items</h3>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={addLineItem}
              className="flex items-center gap-1"
            >
              <PlusIcon className="h-4 w-4" />
              Add Item
            </Button>
          </div>

          <div className="space-y-3">
            {lineItems.map((item, index) => (
              <div key={index} className="bg-white/5 rounded-lg p-4 border border-white/10">
                <div className="grid grid-cols-12 gap-2 items-start">
                  {/* SKU */}
                  <div className="col-span-2">
                    <label className="block text-xs text-gray-400 mb-1">SKU *</label>
                    <input
                      type="text"
                      value={item.sku}
                      onChange={e => updateLineItem(index, 'sku', e.target.value)}
                      placeholder="SKU"
                      className="w-full px-2 py-1.5 bg-white/5 border border-white/10 rounded text-sm text-white focus:outline-none focus:border-primary-500"
                    />
                  </div>

                  {/* Description */}
                  <div className="col-span-3">
                    <label className="block text-xs text-gray-400 mb-1">Description *</label>
                    <input
                      type="text"
                      value={item.description}
                      onChange={e => updateLineItem(index, 'description', e.target.value)}
                      placeholder="Item description"
                      className="w-full px-2 py-1.5 bg-white/5 border border-white/10 rounded text-sm text-white focus:outline-none focus:border-primary-500"
                    />
                  </div>

                  {/* Quantity */}
                  <div className="col-span-1">
                    <label className="block text-xs text-gray-400 mb-1">Qty *</label>
                    <input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={e =>
                        updateLineItem(index, 'quantity', parseInt(e.target.value) || 0)
                      }
                      className="w-full px-2 py-1.5 bg-white/5 border border-white/10 rounded text-sm text-white focus:outline-none focus:border-primary-500"
                    />
                  </div>

                  {/* Unit Price */}
                  <div className="col-span-2">
                    <label className="block text-xs text-gray-400 mb-1">Unit Price *</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={item.unitPrice}
                      onChange={e =>
                        updateLineItem(index, 'unitPrice', parseFloat(e.target.value) || 0)
                      }
                      className="w-full px-2 py-1.5 bg-white/5 border border-white/10 rounded text-sm text-white focus:outline-none focus:border-primary-500"
                    />
                  </div>

                  {/* Discount */}
                  <div className="col-span-1">
                    <label className="block text-xs text-gray-400 mb-1">Discount %</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={item.discount}
                      onChange={e =>
                        updateLineItem(index, 'discount', parseFloat(e.target.value) || 0)
                      }
                      className="w-full px-2 py-1.5 bg-white/5 border border-white/10 rounded text-sm text-white focus:outline-none focus:border-primary-500"
                    />
                  </div>

                  {/* Tax Rate */}
                  <div className="col-span-1">
                    <label className="block text-xs text-gray-400 mb-1">Tax %</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={item.taxRate}
                      onChange={e =>
                        updateLineItem(index, 'taxRate', parseFloat(e.target.value) || 0)
                      }
                      className="w-full px-2 py-1.5 bg-white/5 border border-white/10 rounded text-sm text-white focus:outline-none focus:border-primary-500"
                    />
                  </div>

                  {/* Line Total */}
                  <div className="col-span-1">
                    <label className="block text-xs text-gray-400 mb-1">Total</label>
                    <div className="px-2 py-1.5 bg-primary-500/20 border border-primary-500/30 rounded text-sm text-primary-300 font-medium">
                      $
                      {(
                        item.quantity *
                        item.unitPrice *
                        (1 - item.discount / 100) *
                        (1 + item.taxRate / 100)
                      ).toFixed(2)}
                    </div>
                  </div>

                  {/* Remove Button */}
                  <div className="col-span-1 flex items-end">
                    <button
                      type="button"
                      onClick={() => removeLineItem(index)}
                      disabled={lineItems.length === 1}
                      className="p-1.5 text-danger-400 hover:text-danger-300 hover:bg-danger-500/20 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Totals */}
        <div className="bg-white/5 rounded-lg p-4 border border-white/10">
          <div className="flex justify-end">
            <div className="w-64 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Subtotal:</span>
                <span className="text-white">${totals.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Discount:</span>
                <span className="text-danger-400">-${totals.totalDiscount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Tax:</span>
                <span className="text-white">${totals.totalTax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold border-t border-white/10 pt-2">
                <span className="text-white">Total:</span>
                <span className="text-primary-400">${totals.total.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Notes and Terms */}
        <div className="grid grid-cols-2 gap-4">
          <FormInput
            label="Notes"
            name="notes"
            value={values.notes || ''}
            onChange={handleChange}
            onBlur={() => handleBlur('notes')}
            error={errors.notes}
            placeholder="Additional notes for the customer..."
            multiline
            rows={3}
          />

          <FormInput
            label="Terms & Conditions"
            name="termsAndConditions"
            value={values.termsAndConditions || ''}
            onChange={handleChange}
            onBlur={() => handleBlur('termsAndConditions')}
            error={errors.termsAndConditions}
            placeholder="Payment terms, delivery terms, etc..."
            multiline
            rows={3}
          />
        </div>
      </form>
    </Modal>
  );
}
