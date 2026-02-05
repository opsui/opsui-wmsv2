/**
 * Create BOM Modal
 *
 * Modal form for creating a new Bill of Materials
 */

import { Modal, FormInput, FormSelect, Button, useToast } from '@/components/shared';
import { useState } from 'react';
import { useCreateBOM } from '@/services/api';

// ============================================================================
// TYPES
// ============================================================================

interface CreateBOMModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface BOMComponentFormData {
  sku: string;
  quantity: number;
  unitOfMeasure: string;
  isOptional: boolean;
}

interface BOMFormData {
  name: string;
  description?: string;
  productId: string;
  totalQuantity: number;
  unitOfMeasure: string;
  components: BOMComponentFormData[];
}

const unitOfMeasureOptions = [
  { value: 'EA', label: 'Each (EA)' },
  { value: 'PCS', label: 'Pieces (PCS)' },
  { value: 'KG', label: 'Kilograms (KG)' },
  { value: 'LB', label: 'Pounds (LB)' },
  { value: 'L', label: 'Liters (L)' },
  { value: 'M', label: 'Meters (M)' },
  { value: 'M2', label: 'Square Meters (M2)' },
  { value: 'M3', label: 'Cubic Meters (M3)' },
];

// ============================================================================
// COMPONENT
// ============================================================================

export function CreateBOMModal({ isOpen, onClose, onSuccess }: CreateBOMModalProps) {
  const { showToast } = useToast();
  const createBOMMutation = useCreateBOM();

  const [formData, setFormData] = useState<BOMFormData>({
    name: '',
    description: '',
    productId: '',
    totalQuantity: 1,
    unitOfMeasure: 'EA',
    components: [{ sku: '', quantity: 1, unitOfMeasure: 'EA', isOptional: false }],
  });

  const [errors, setErrors] = useState<Partial<Record<keyof BOMFormData, string>>>({});
  const [componentErrors, setComponentErrors] = useState<boolean[]>([]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'totalQuantity' ? parseInt(value) || 0 : value,
    }));
    if (errors[name as keyof BOMFormData]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  const handleComponentChange = (
    index: number,
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    const newComponents = [...formData.components];
    newComponents[index] = {
      ...newComponents[index],
      [name]:
        name === 'quantity'
          ? parseFloat(value) || 0
          : value === 'isOptional'
            ? (e.target as HTMLInputElement).checked
            : value,
    };
    setFormData(prev => ({ ...prev, components: newComponents }));

    const newErrors = [...componentErrors];
    newErrors[index] = false;
    setComponentErrors(newErrors);
  };

  const addComponent = () => {
    setFormData(prev => ({
      ...prev,
      components: [
        ...prev.components,
        { sku: '', quantity: 1, unitOfMeasure: 'EA', isOptional: false },
      ],
    }));
    setComponentErrors([...componentErrors, false]);
  };

  const removeComponent = (index: number) => {
    if (formData.components.length > 1) {
      setFormData(prev => ({
        ...prev,
        components: prev.components.filter((_, i) => i !== index),
      }));
      setComponentErrors(componentErrors.filter((_, i) => i !== index));
    }
  };

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof BOMFormData, string>> = {};

    if (!formData.name || formData.name.trim() === '') {
      newErrors.name = 'BOM name is required';
    }
    if (!formData.productId || formData.productId.trim() === '') {
      newErrors.productId = 'Product ID is required';
    }
    if (formData.totalQuantity <= 0) {
      newErrors.totalQuantity = 'Total quantity must be greater than 0';
    }

    // Validate components
    const newComponentErrors: boolean[] = formData.components.map(comp => {
      return !comp.sku || comp.sku.trim() === '' || comp.quantity <= 0;
    });

    setErrors(newErrors);
    setComponentErrors(newComponentErrors);

    return Object.keys(newErrors).length === 0 && newComponentErrors.every(e => !e);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    try {
      await createBOMMutation.mutateAsync(formData);
      showToast('BOM created successfully', 'success');

      // Reset form
      setFormData({
        name: '',
        description: '',
        productId: '',
        totalQuantity: 1,
        unitOfMeasure: 'EA',
        components: [{ sku: '', quantity: 1, unitOfMeasure: 'EA', isOptional: false }],
      });
      setErrors({});
      setComponentErrors([]);

      onClose();
      onSuccess?.();
    } catch (error: any) {
      const errorMessage = error?.response?.data?.error || error?.message || 'Failed to create BOM';
      showToast(errorMessage, 'error');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create Bill of Materials"
      size="xl"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={createBOMMutation.isPending}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmit} disabled={createBOMMutation.isPending}>
            {createBOMMutation.isPending ? 'Creating...' : 'Create BOM'}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* BOM Details */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white">BOM Details</h3>

          <FormInput
            label="BOM Name"
            name="name"
            type="text"
            value={formData.name}
            onChange={handleChange}
            error={errors.name}
            required
            placeholder="e.g., Widget A Assembly BOM"
          />

          <FormInput
            label="Product ID (Finished Good SKU)"
            name="productId"
            type="text"
            value={formData.productId}
            onChange={handleChange}
            error={errors.productId}
            required
            placeholder="e.g., PROD-001"
          />

          <FormInput
            label="Description"
            name="description"
            type="text"
            value={formData.description || ''}
            onChange={handleChange}
            placeholder="Optional description of this BOM"
          />

          <div className="grid grid-cols-2 gap-4">
            <FormInput
              label="Total Quantity"
              name="totalQuantity"
              type="number"
              value={formData.totalQuantity}
              onChange={handleChange}
              error={errors.totalQuantity}
              required
            />

            <FormSelect
              label="Unit of Measure"
              name="unitOfMeasure"
              value={formData.unitOfMeasure}
              onChange={handleChange}
              options={unitOfMeasureOptions}
              required
            />
          </div>
        </div>

        {/* Components */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">Components</h3>
            <Button type="button" variant="secondary" size="sm" onClick={addComponent}>
              + Add Component
            </Button>
          </div>

          <div className="space-y-3">
            {formData.components.map((component, index) => (
              <div
                key={index}
                className={`p-4 bg-white/5 border rounded-lg ${
                  componentErrors[index] ? 'border-red-500' : 'border-gray-700'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <span className="text-sm font-medium text-gray-300">Component {index + 1}</span>
                  {formData.components.length > 1 && (
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => removeComponent(index)}
                    >
                      Remove
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-400 mb-1">
                      Component SKU *
                    </label>
                    <input
                      type="text"
                      name="sku"
                      value={component.sku}
                      onChange={e => handleComponentChange(index, e)}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="e.g., COMP-001"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">
                      Quantity *
                    </label>
                    <input
                      type="number"
                      name="quantity"
                      min="0.01"
                      step="0.01"
                      value={component.quantity}
                      onChange={e => handleComponentChange(index, e)}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">
                      Unit of Measure
                    </label>
                    <select
                      name="unitOfMeasure"
                      value={component.unitOfMeasure}
                      onChange={e => handleComponentChange(index, e)}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      {unitOfMeasureOptions.map(opt => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="col-span-2 flex items-center gap-2">
                    <input
                      type="checkbox"
                      name="isOptional"
                      id={`component-${index}-optional`}
                      checked={component.isOptional}
                      onChange={e => handleComponentChange(index, e)}
                      className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-primary-500 focus:ring-2 focus:ring-primary-500"
                    />
                    <label
                      htmlFor={`component-${index}-optional`}
                      className="text-sm text-gray-300"
                    >
                      This component is optional
                    </label>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </form>
    </Modal>
  );
}
