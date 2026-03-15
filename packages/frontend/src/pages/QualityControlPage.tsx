/**
 * Quality Control Page
 *
 * Manages quality inspections, inspection checklists, and return authorizations.
 * Provides tabbed interface for different quality control workflows.
 *
 * ============================================================================
 * AESTHETIC DIRECTION: INSPECTION LAB
 * ============================================================================
 * Precision-focused quality assurance interface:
 * - Dark theme with cyan/teal accents for technical precision
 * - Scale-in entrance animations for inspection cards
 * - Clean status badges with gradient fills
 * - High-contrast pass/fail indicators
 * ============================================================================
 */

import React, { useState, useEffect } from 'react';
import {
  DocumentPlusIcon,
  ClipboardDocumentCheckIcon,
  EyeIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  ChevronLeftIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline';
import {
  Pagination,
  Header,
  useToast,
  ConfirmDialog,
  Button,
  Breadcrumb,
} from '@/components/shared';
import { useNavigate } from 'react-router-dom';
import {
  InspectionType,
  InspectionStatus,
  QualityInspection,
  InspectionChecklist,
  ReturnAuthorization,
  DispositionAction,
} from '@opsui/shared';
import {
  useQualityInspections,
  useInspectionChecklists,
  useReturnAuthorizations,
  useCreateInspection,
  useCreateChecklist,
  useUpdateInspection,
  useDeleteChecklist,
} from '../services/api';
import { useFormValidation } from '@/hooks/useFormValidation';
import { useFeedbackSounds } from '@/hooks/useSoundEffects';

// ============================================================================
// TYPES
// ============================================================================

type ReturnStatus = ReturnAuthorization['status'];

// ============================================================================
// STATUS BADGES
// ============================================================================

function InspectionStatusBadge({ status }: { status: InspectionStatus }) {
  const styles: Record<InspectionStatus, string> = {
    [InspectionStatus.PENDING]:
      'bg-gradient-to-r from-gray-100 to-gray-50 dark:from-gray-700 dark:to-gray-800 text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-600',
    [InspectionStatus.IN_PROGRESS]:
      'bg-gradient-to-r from-cyan-100 to-teal-50 dark:from-cyan-900/30 dark:to-teal-900/20 text-cyan-800 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-500/30',
    [InspectionStatus.PASSED]:
      'bg-gradient-to-r from-emerald-100 to-green-50 dark:from-emerald-900/30 dark:to-green-900/20 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30',
    [InspectionStatus.FAILED]:
      'bg-gradient-to-r from-red-100 to-rose-50 dark:from-red-900/30 dark:to-rose-900/20 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-500/30',
    [InspectionStatus.CONDITIONAL_PASSED]:
      'bg-gradient-to-r from-amber-100 to-yellow-50 dark:from-amber-900/30 dark:to-yellow-900/20 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-500/30',
    [InspectionStatus.CANCELLED]:
      'bg-gradient-to-r from-gray-100 to-slate-50 dark:from-gray-700 dark:to-slate-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-600',
  };

  const labels: Record<InspectionStatus, string> = {
    [InspectionStatus.PENDING]: 'Pending',
    [InspectionStatus.IN_PROGRESS]: 'In Progress',
    [InspectionStatus.PASSED]: 'Passed',
    [InspectionStatus.FAILED]: 'Failed',
    [InspectionStatus.CONDITIONAL_PASSED]: 'Conditional',
    [InspectionStatus.CANCELLED]: 'Cancelled',
  };

  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}

function ReturnStatusBadge({ status }: { status: ReturnStatus }) {
  const styles: Record<string, string> = {
    PENDING: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300',
    APPROVED: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300',
    RECEIVED: 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300',
    INSPECTED: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-300',
    PROCESSED: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300',
    REJECTED: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300',
    COMPLETED: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300',
  };

  return (
    <span
      className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'}`}
    >
      {status}
    </span>
  );
}

function DispositionBadge({ disposition }: { disposition?: DispositionAction }) {
  if (!disposition) {
    return (
      <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
        Pending
      </span>
    );
  }

  const styles: Record<string, string> = {
    RETURN_TO_VENDOR: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300',
    RESTOCK: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300',
    REWORK: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300',
    SCRAP: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300',
    QUARANTINE: 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300',
    CREDIT_ONLY: 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300',
    DONATE: 'bg-pink-100 dark:bg-pink-900/30 text-pink-800 dark:text-pink-300',
  };

  return (
    <span
      className={`px-2 py-1 rounded-full text-xs font-medium ${styles[disposition] || 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'}`}
    >
      {disposition.replace(/_/g, ' ')}
    </span>
  );
}

// ============================================================================
// INSPECTION MODAL
// ============================================================================

interface InspectionModalProps {
  inspection?: QualityInspection;
  onClose: () => void;
  onSuccess: () => void;
}

function InspectionModal({ inspection, onClose, onSuccess }: InspectionModalProps) {
  const { showToast } = useToast();
  const { playSuccess, playError } = useFeedbackSounds();
  const isEdit = !!inspection;
  const createMutation = useCreateInspection();
  const updateMutation = useUpdateInspection();

  // Form validation
  const {
    values: formData,
    errors,
    handleChange,
    handleSubmit,
    isSubmitting,
  } = useFormValidation({
    initialValues: {
      inspectionType: inspection?.inspectionType || InspectionType.INCOMING,
      referenceType: inspection?.referenceType || 'INVENTORY',
      referenceId: inspection?.referenceId || '',
      sku: inspection?.sku || '',
      quantityInspected: inspection?.quantityInspected || 1,
      location: inspection?.location || '',
      lotNumber: inspection?.lotNumber || '',
      notes: inspection?.notes || '',
    },
    validationRules: {
      inspectionType: { required: true },
      referenceType: { required: true },
      referenceId: { required: true, minLength: 2 },
      sku: { required: true, minLength: 2 },
      quantityInspected: {
        required: true,
        custom: (value: number) => {
          if (value < 1) {
            return 'Must be at least 1';
          }
          return null;
        },
      },
    },
    onSubmit: async values => {
      try {
        if (isEdit && inspection) {
          await updateMutation.mutateAsync({
            inspectionId: inspection.inspectionId,
            updates: values as any,
          });
          playSuccess();
          showToast('Inspection updated successfully', 'success');
        } else {
          await createMutation.mutateAsync(values as any);
          playSuccess();
          showToast('Inspection created successfully', 'success');
        }
        onSuccess();
        onClose();
      } catch (error: any) {
        console.error('Failed to save inspection:', error);
        playError();
        showToast(error?.message || 'Failed to save inspection', 'error');
        throw error;
      }
    },
  });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {isEdit ? 'Edit Inspection' : 'Create Inspection'}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Inspection Type *
              </label>
              <select
                name="inspectionType"
                required
                value={formData.inspectionType}
                onChange={handleChange}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.inspectionType ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                } bg-white dark:bg-gray-800 text-gray-900 dark:text-white [&_option]:bg-white [&_option]:text-gray-900 dark:[&_option]:bg-gray-900 dark:[&_option]:text-gray-100`}
              >
                <option value={InspectionType.INCOMING}>Incoming</option>
                <option value={InspectionType.OUTGOING}>Outgoing</option>
                <option value={InspectionType.INVENTORY}>Inventory</option>
                <option value={InspectionType.RETURN}>Return</option>
                <option value={InspectionType.DAMAGE}>Damage</option>
                <option value={InspectionType.EXPIRATION}>Expiration</option>
              </select>
              {errors.inspectionType && (
                <p className="mt-1 text-sm text-red-500 dark:text-red-400">
                  {errors.inspectionType}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Reference Type *
              </label>
              <select
                name="referenceType"
                required
                value={formData.referenceType}
                onChange={handleChange}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.referenceType ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                } bg-white dark:bg-gray-800 text-gray-900 dark:text-white [&_option]:bg-white [&_option]:text-gray-900 dark:[&_option]:bg-gray-900 dark:[&_option]:text-gray-100`}
              >
                <option value="INVENTORY">Inventory</option>
                <option value="ASN">ASN</option>
                <option value="RECEIPT">Receipt</option>
                <option value="ORDER">Order</option>
                <option value="RETURN">Return</option>
              </select>
              {errors.referenceType && (
                <p className="mt-1 text-sm text-red-500 dark:text-red-400">
                  {errors.referenceType}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Reference ID *
              </label>
              <input
                type="text"
                name="referenceId"
                required
                value={formData.referenceId}
                onChange={handleChange}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.referenceId ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                } bg-white dark:bg-gray-800 text-gray-900 dark:text-white`}
                placeholder="Enter reference ID"
              />
              {errors.referenceId && (
                <p className="mt-1 text-sm text-red-500 dark:text-red-400">{errors.referenceId}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                SKU *
              </label>
              <input
                type="text"
                name="sku"
                required
                value={formData.sku}
                onChange={handleChange}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.sku ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                } bg-white dark:bg-gray-800 text-gray-900 dark:text-white`}
                placeholder="Enter SKU"
              />
              {errors.sku && (
                <p className="mt-1 text-sm text-red-500 dark:text-red-400">{errors.sku}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Quantity Inspected *
              </label>
              <input
                type="number"
                name="quantityInspected"
                required
                min="1"
                value={formData.quantityInspected}
                onChange={handleChange}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.quantityInspected
                    ? 'border-red-500'
                    : 'border-gray-300 dark:border-gray-600'
                } bg-white dark:bg-gray-800 text-gray-900 dark:text-white`}
              />
              {errors.quantityInspected && (
                <p className="mt-1 text-sm text-red-500 dark:text-red-400">
                  {errors.quantityInspected}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Location
              </label>
              <input
                type="text"
                name="location"
                value={formData.location}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                placeholder="Enter location"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Lot Number
              </label>
              <input
                type="text"
                name="lotNumber"
                value={formData.lotNumber}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                placeholder="Enter lot number"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Notes
            </label>
            <textarea
              rows={3}
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              placeholder="Enter inspection notes"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : (isEdit ? 'Update' : 'Create') + ' Inspection'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================================================
// CHECKLIST MODAL
// ============================================================================

interface ChecklistModalProps {
  checklist?: InspectionChecklist;
  onClose: () => void;
  onSuccess: () => void;
}

function ChecklistModal({ checklist, onClose, onSuccess }: ChecklistModalProps) {
  const { showToast } = useToast();
  const { playSuccess, playError } = useFeedbackSounds();
  const isEdit = !!checklist;
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [formData, setFormData] = useState({
    checklistName: checklist?.checklistName || '',
    description: checklist?.description || '',
    inspectionType: checklist?.inspectionType || InspectionType.INCOMING,
    items: checklist?.items || [
      {
        itemId: `item-${Date.now()}`,
        checklistId: checklist?.checklistId || '',
        itemDescription: 'Item 1',
        itemType: 'CHECKBOX',
        isRequired: true,
        displayOrder: 0,
      },
    ],
  });

  const createMutation = useCreateChecklist();
  const deleteMutation = useDeleteChecklist();

  const handleAddItem = () => {
    setFormData({
      ...formData,
      items: [
        ...formData.items,
        {
          itemId: `item-${Date.now()}`,
          checklistId: checklist?.checklistId || '',
          itemDescription: `Item ${formData.items.length + 1}`,
          itemType: 'CHECKBOX',
          isRequired: true,
          displayOrder: formData.items.length,
        },
      ],
    });
  };

  const handleRemoveItem = (index: number) => {
    setFormData({
      ...formData,
      items: formData.items.filter((_, i) => i !== index),
    });
  };

  const handleUpdateItem = (index: number, field: string, value: any) => {
    const newItems = [...formData.items];
    newItems[index] = { ...newItems[index], [field]: value };
    setFormData({ ...formData, items: newItems });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createMutation.mutateAsync(formData as any);
      playSuccess();
      showToast('Checklist saved successfully', 'success');
      onSuccess();
    } catch (error: any) {
      console.error('Failed to save checklist:', error);
      playError();
      showToast(error?.message || 'Failed to save checklist', 'error');
    }
  };

  const handleDelete = async () => {
    if (!checklist) return;
    setDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!checklist) return;
    try {
      await deleteMutation.mutateAsync(checklist.checklistId);
      playSuccess();
      showToast('Checklist deleted successfully', 'success');
      onSuccess();
    } catch (error: any) {
      console.error('Failed to delete checklist:', error);
      playError();
      showToast(error?.message || 'Failed to delete checklist', 'error');
    } finally {
      setDeleteConfirm(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {isEdit ? 'Edit Checklist' : 'Create Checklist'}
          </h2>
          {isEdit && (
            <button
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
              className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 text-sm"
            >
              Delete
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Checklist Name *
              </label>
              <input
                type="text"
                required
                value={formData.checklistName}
                onChange={e => setFormData({ ...formData, checklistName: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                placeholder="Enter checklist name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Inspection Type *
              </label>
              <select
                required
                value={formData.inspectionType}
                onChange={e =>
                  setFormData({ ...formData, inspectionType: e.target.value as InspectionType })
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white [&_option]:bg-white [&_option]:text-gray-900 dark:[&_option]:bg-gray-900 dark:[&_option]:text-gray-100"
              >
                <option value={InspectionType.INCOMING}>Incoming</option>
                <option value={InspectionType.OUTGOING}>Outgoing</option>
                <option value={InspectionType.INVENTORY}>Inventory</option>
                <option value={InspectionType.RETURN}>Return</option>
                <option value={InspectionType.DAMAGE}>Damage</option>
                <option value={InspectionType.EXPIRATION}>Expiration</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Description
            </label>
            <textarea
              rows={2}
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              placeholder="Enter checklist description"
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Checklist Items
              </label>
              <button
                type="button"
                onClick={handleAddItem}
                className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-sm"
              >
                + Add Item
              </button>
            </div>
            <div className="space-y-2">
              {formData.items.map((item, index) => (
                <div
                  key={item.itemId}
                  className="flex items-center space-x-2 p-2 border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800"
                >
                  <input
                    type="text"
                    required
                    value={item.itemDescription}
                    onChange={e => handleUpdateItem(index, 'itemDescription', e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="Item description"
                  />
                  <select
                    value={item.itemType}
                    onChange={e => handleUpdateItem(index, 'itemType', e.target.value)}
                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white [&_option]:bg-white [&_option]:text-gray-900 dark:[&_option]:bg-gray-900 dark:[&_option]:text-gray-100"
                  >
                    <option value="CHECKBOX">Checkbox</option>
                    <option value="TEXT">Text</option>
                    <option value="NUMBER">Number</option>
                    <option value="DATE">Date</option>
                  </select>
                  <label className="flex items-center text-sm text-gray-700 dark:text-gray-300">
                    <input
                      type="checkbox"
                      checked={item.isRequired}
                      onChange={e => handleUpdateItem(index, 'isRequired', e.target.checked)}
                      className="mr-1"
                    />
                    Required
                  </label>
                  <button
                    type="button"
                    onClick={() => handleRemoveItem(index)}
                    className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {isEdit ? 'Update' : 'Create'} Checklist
            </button>
          </div>
        </form>

        <ConfirmDialog
          isOpen={deleteConfirm}
          onClose={() => setDeleteConfirm(false)}
          onConfirm={confirmDelete}
          title="Delete Checklist"
          message="Are you sure you want to delete this checklist? This action cannot be undone."
          confirmText="Delete"
          cancelText="Cancel"
          variant="danger"
          isLoading={deleteMutation.isPending}
        />
      </div>
    </div>
  );
}

// ============================================================================
// MAIN PAGE
// ============================================================================

export function QualityControlPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'inspections' | 'checklists' | 'returns'>(
    'inspections'
  );
  const [selectedInspection, setSelectedInspection] = useState<QualityInspection | undefined>();
  const [selectedChecklist, setSelectedChecklist] = useState<InspectionChecklist | undefined>();
  const [inspectionModalOpen, setInspectionModalOpen] = useState(false);
  const [checklistModalOpen, setChecklistModalOpen] = useState(false);
  const [inspectionFilter, setInspectionFilter] = useState<string>('all');
  const [returnFilter, setReturnFilter] = useState<string>('all');

  // Search states
  const [inspectionsSearchTerm, setInspectionsSearchTerm] = useState('');
  const [checklistsSearchTerm, setChecklistsSearchTerm] = useState('');
  const [returnsSearchTerm, setReturnsSearchTerm] = useState('');

  // Pagination state for inspections
  const [inspectionsCurrentPage, setInspectionsCurrentPage] = useState(1);
  const inspectionsPerPage = 10;

  // Pagination state for checklists
  const [checklistsCurrentPage, setChecklistsCurrentPage] = useState(1);
  const checklistsPerPage = 10;

  // Pagination state for returns
  const [returnsCurrentPage, setReturnsCurrentPage] = useState(1);
  const returnsPerPage = 10;

  // Reset pagination when filter changes
  useEffect(() => {
    setInspectionsCurrentPage(1);
  }, [inspectionFilter, inspectionsSearchTerm]);

  useEffect(() => {
    setChecklistsCurrentPage(1);
  }, [checklistsSearchTerm]);

  useEffect(() => {
    setReturnsCurrentPage(1);
  }, [returnFilter, returnsSearchTerm]);

  // ============================================================================
  // MOCK DATA
  // ============================================================================

  const mockInspections: QualityInspection[] = [
    {
      inspectionId: 'QI-2024-001',
      inspectionType: InspectionType.INCOMING,
      referenceType: 'INVENTORY',
      referenceId: 'INV-1001',
      sku: 'WIDGET-A-001',
      quantityInspected: 500,
      location: 'A-01-01',
      lotNumber: 'LOT-2024-001',
      status: InspectionStatus.PASSED,
      inspectorId: 'user-001',
      createdAt: '2024-01-15T09:30:00Z',
      updatedAt: '2024-01-15T10:45:00Z',
      notes: 'All items passed quality checks. Packaging intact.',
    },
    {
      inspectionId: 'QI-2024-002',
      inspectionType: InspectionType.INCOMING,
      referenceType: 'ASN',
      referenceId: 'ASN-2024-0456',
      sku: 'ELECTRONIC-B-002',
      quantityInspected: 250,
      location: 'B-02-05',
      lotNumber: 'LOT-2024-012',
      status: InspectionStatus.FAILED,
      inspectorId: 'user-002',
      createdAt: '2024-01-16T14:20:00Z',
      updatedAt: '2024-01-16T15:30:00Z',
      notes: '3 units found with damaged packaging. 1 unit missing accessories.',
    },
    {
      inspectionId: 'QI-2024-003',
      inspectionType: InspectionType.OUTGOING,
      referenceType: 'ORDER',
      referenceId: 'ORD-78542',
      sku: 'GADGET-C-003',
      quantityInspected: 100,
      location: 'C-03-02',
      lotNumber: 'LOT-2024-025',
      status: InspectionStatus.IN_PROGRESS,
      inspectorId: 'user-001',
      createdAt: '2024-01-17T08:00:00Z',
      updatedAt: '2024-01-17T08:00:00Z',
      notes: 'Currently inspecting outbound shipment for customer.',
    },
    {
      inspectionId: 'QI-2024-004',
      inspectionType: InspectionType.INVENTORY,
      referenceType: 'INVENTORY',
      referenceId: 'INV-2045',
      sku: 'COMPONENT-D-004',
      quantityInspected: 1000,
      location: 'D-04-01',
      lotNumber: 'LOT-2023-089',
      status: InspectionStatus.CONDITIONAL_PASSED,
      inspectorId: 'user-003',
      createdAt: '2024-01-18T11:15:00Z',
      updatedAt: '2024-01-18T12:30:00Z',
      notes:
        'Passed with conditions. Minor cosmetic defects on 5% of items approved for discount sale.',
    },
    {
      inspectionId: 'QI-2024-005',
      inspectionType: InspectionType.RETURN,
      referenceType: 'RETURN',
      referenceId: 'RTA-2024-123',
      sku: 'PRODUCT-E-005',
      quantityInspected: 25,
      location: 'E-05-03',
      lotNumber: 'LOT-2024-031',
      status: InspectionStatus.PENDING,
      inspectorId: null,
      createdAt: '2024-01-19T16:45:00Z',
      updatedAt: '2024-01-19T16:45:00Z',
      notes: 'Customer return awaiting inspection.',
    },
    {
      inspectionId: 'QI-2024-006',
      inspectionType: InspectionType.DAMAGE,
      referenceType: 'INVENTORY',
      referenceId: 'INV-3102',
      sku: 'MATERIAL-F-006',
      quantityInspected: 150,
      location: 'F-06-02',
      lotNumber: 'LOT-2024-008',
      status: InspectionStatus.FAILED,
      inspectorId: 'user-002',
      createdAt: '2024-01-20T10:30:00Z',
      updatedAt: '2024-01-20T11:00:00Z',
      notes: 'Water damage detected during spot check. Entire lot quarantined.',
    },
    {
      inspectionId: 'QI-2024-007',
      inspectionType: InspectionType.EXPIRATION,
      referenceType: 'INVENTORY',
      referenceId: 'INV-4105',
      sku: 'SUPPLY-G-007',
      quantityInspected: 300,
      location: 'G-07-01',
      lotNumber: 'LOT-2023-045',
      status: InspectionStatus.PASSED,
      inspectorId: 'user-003',
      createdAt: '2024-01-21T13:20:00Z',
      updatedAt: '2024-01-21T14:15:00Z',
      notes: 'Expiration date verification complete. All items within acceptable range.',
    },
    {
      inspectionId: 'QI-2024-008',
      inspectionType: InspectionType.INCOMING,
      referenceType: 'RECEIPT',
      referenceId: 'RCPT-2024-089',
      sku: 'PART-H-008',
      quantityInspected: 750,
      location: 'H-08-04',
      lotNumber: 'LOT-2024-055',
      status: InspectionStatus.CANCELLED,
      inspectorId: 'user-001',
      createdAt: '2024-01-22T09:00:00Z',
      updatedAt: '2024-01-22T09:30:00Z',
      notes: 'Inspection cancelled - shipment arrived damaged beyond assessment.',
    },
    {
      inspectionId: 'QI-2024-009',
      inspectionType: InspectionType.INVENTORY,
      referenceType: 'INVENTORY',
      referenceId: 'INV-5201',
      sku: 'ITEM-I-009',
      quantityInspected: 200,
      location: 'I-09-02',
      lotNumber: 'LOT-2024-067',
      status: InspectionStatus.PASSED,
      inspectorId: 'user-002',
      createdAt: '2024-02-01T10:00:00Z',
      updatedAt: '2024-02-01T11:30:00Z',
      notes: 'Quarterly quality audit. All standards met.',
    },
    {
      inspectionId: 'QI-2024-010',
      inspectionType: InspectionType.OUTGOING,
      referenceType: 'ORDER',
      referenceId: 'ORD-89012',
      sku: 'PRODUCT-J-010',
      quantityInspected: 400,
      location: 'J-10-01',
      lotNumber: 'LOT-2024-078',
      status: InspectionStatus.IN_PROGRESS,
      inspectorId: 'user-003',
      createdAt: '2024-02-02T14:15:00Z',
      updatedAt: '2024-02-02T14:15:00Z',
      notes: 'Pre-shipment inspection in progress.',
    },
    {
      inspectionId: 'QI-2024-011',
      inspectionType: InspectionType.INCOMING,
      referenceType: 'ASN',
      referenceId: 'ASN-2024-089',
      sku: 'RAW-K-011',
      quantityInspected: 600,
      location: 'K-11-03',
      lotNumber: 'LOT-2024-089',
      status: InspectionStatus.PASSED,
      inspectorId: 'user-001',
      createdAt: '2024-02-03T08:30:00Z',
      updatedAt: '2024-02-03T10:00:00Z',
      notes: 'Raw material quality verification complete. Certified for production use.',
    },
    {
      inspectionId: 'QI-2024-012',
      inspectionType: InspectionType.RETURN,
      referenceType: 'RETURN',
      referenceId: 'RTA-2024-234',
      sku: 'GOODS-L-012',
      quantityInspected: 45,
      location: 'L-12-02',
      lotNumber: 'LOT-2024-091',
      status: InspectionStatus.CONDITIONAL_PASSED,
      inspectorId: 'user-002',
      createdAt: '2024-02-04T11:45:00Z',
      updatedAt: '2024-02-04T13:00:00Z',
      notes: 'Returned goods inspected. Minor wear acceptable for restock as open-box.',
    },
  ];

  const mockChecklists: InspectionChecklist[] = [
    {
      checklistId: 'CL-001',
      checklistName: 'Incoming Material Inspection',
      description: 'Standard checklist for all incoming raw materials and components',
      inspectionType: InspectionType.INCOMING,
      isActive: true,
      items: [
        {
          itemId: 'CL-001-01',
          checklistId: 'CL-001',
          itemDescription: 'Verify quantity matches packing slip',
          itemType: 'CHECKBOX',
          isRequired: true,
          displayOrder: 1,
        },
        {
          itemId: 'CL-001-02',
          checklistId: 'CL-001',
          itemDescription: 'Check for visible damage to packaging',
          itemType: 'CHECKBOX',
          isRequired: true,
          displayOrder: 2,
        },
        {
          itemId: 'CL-001-03',
          checklistId: 'CL-001',
          itemDescription: 'Verify lot/batch number',
          itemType: 'TEXT',
          isRequired: true,
          displayOrder: 3,
        },
        {
          itemId: 'CL-001-04',
          checklistId: 'CL-001',
          itemDescription: 'Check expiration date',
          itemType: 'DATE',
          isRequired: false,
          displayOrder: 4,
        },
        {
          itemId: 'CL-001-05',
          checklistId: 'CL-001',
          itemDescription: 'Number of defective items found',
          itemType: 'NUMBER',
          isRequired: true,
          displayOrder: 5,
        },
      ],
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    },
    {
      checklistId: 'CL-002',
      checklistName: 'Outgoing Shipment Verification',
      description: 'Quality checks before shipping products to customers',
      inspectionType: InspectionType.OUTGOING,
      isActive: true,
      items: [
        {
          itemId: 'CL-002-01',
          checklistId: 'CL-002',
          itemDescription: 'Verify product quantity',
          itemType: 'NUMBER',
          isRequired: true,
          displayOrder: 1,
        },
        {
          itemId: 'CL-002-02',
          checklistId: 'CL-002',
          itemDescription: 'Check product condition',
          itemType: 'CHECKBOX',
          isRequired: true,
          displayOrder: 2,
        },
        {
          itemId: 'CL-002-03',
          checklistId: 'CL-002',
          itemDescription: 'Verify correct accessories included',
          itemType: 'CHECKBOX',
          isRequired: true,
          displayOrder: 3,
        },
        {
          itemId: 'CL-002-04',
          checklistId: 'CL-002',
          itemDescription: 'Confirm shipping address on label',
          itemType: 'CHECKBOX',
          isRequired: true,
          displayOrder: 4,
        },
      ],
      createdAt: '2024-01-05T00:00:00Z',
      updatedAt: '2024-01-05T00:00:00Z',
    },
    {
      checklistId: 'CL-003',
      checklistName: 'Inventory Cycle Count',
      description: 'Monthly inventory audit and verification checklist',
      inspectionType: InspectionType.INVENTORY,
      isActive: true,
      items: [
        {
          itemId: 'CL-003-01',
          checklistId: 'CL-003',
          itemDescription: 'Physical count quantity',
          itemType: 'NUMBER',
          isRequired: true,
          displayOrder: 1,
        },
        {
          itemId: 'CL-003-02',
          checklistId: 'CL-003',
          itemDescription: 'Compare with system quantity',
          itemType: 'CHECKBOX',
          isRequired: true,
          displayOrder: 2,
        },
        {
          itemId: 'CL-003-03',
          checklistId: 'CL-003',
          itemDescription: 'Note any discrepancies',
          itemType: 'TEXT',
          isRequired: false,
          displayOrder: 3,
        },
        {
          itemId: 'CL-003-04',
          checklistId: 'CL-003',
          itemDescription: 'Verify storage location',
          itemType: 'CHECKBOX',
          isRequired: true,
          displayOrder: 4,
        },
      ],
      createdAt: '2024-01-10T00:00:00Z',
      updatedAt: '2024-01-10T00:00:00Z',
    },
    {
      checklistId: 'CL-004',
      checklistName: 'Return Merchandise Inspection',
      description: 'Inspection process for customer returned items',
      inspectionType: InspectionType.RETURN,
      isActive: true,
      items: [
        {
          itemId: 'CL-004-01',
          checklistId: 'CL-004',
          itemDescription: 'Reason for return verified',
          itemType: 'CHECKBOX',
          isRequired: true,
          displayOrder: 1,
        },
        {
          itemId: 'CL-004-02',
          checklistId: 'CL-004',
          itemDescription: 'Item condition assessment',
          itemType: 'TEXT',
          isRequired: true,
          displayOrder: 2,
        },
        {
          itemId: 'CL-004-03',
          checklistId: 'CL-004',
          itemDescription: 'All original accessories present',
          itemType: 'CHECKBOX',
          isRequired: true,
          displayOrder: 3,
        },
        {
          itemId: 'CL-004-04',
          checklistId: 'CL-004',
          itemDescription: 'Recommended disposition',
          itemType: 'TEXT',
          isRequired: true,
          displayOrder: 4,
        },
      ],
      createdAt: '2024-01-15T00:00:00Z',
      updatedAt: '2024-01-15T00:00:00Z',
    },
    {
      checklistId: 'CL-005',
      checklistName: 'Damage Assessment Report',
      description: 'Detailed checklist for assessing damaged goods',
      inspectionType: InspectionType.DAMAGE,
      isActive: true,
      items: [
        {
          itemId: 'CL-005-01',
          checklistId: 'CL-005',
          itemDescription: 'Type of damage observed',
          itemType: 'TEXT',
          isRequired: true,
          displayOrder: 1,
        },
        {
          itemId: 'CL-005-02',
          checklistId: 'CL-005',
          itemDescription: 'Extent of damage (%)',
          itemType: 'NUMBER',
          isRequired: true,
          displayOrder: 2,
        },
        {
          itemId: 'CL-005-03',
          checklistId: 'CL-005',
          itemDescription: 'Probable cause of damage',
          itemType: 'TEXT',
          isRequired: true,
          displayOrder: 3,
        },
        {
          itemId: 'CL-005-04',
          checklistId: 'CL-005',
          itemDescription: 'Photo documentation attached',
          itemType: 'CHECKBOX',
          isRequired: true,
          displayOrder: 4,
        },
      ],
      createdAt: '2024-01-20T00:00:00Z',
      updatedAt: '2024-01-20T00:00:00Z',
    },
    {
      checklistId: 'CL-006',
      checklistName: 'Expiration Date Verification',
      description: 'Check items for expiration and shelf life',
      inspectionType: InspectionType.EXPIRATION,
      isActive: true,
      items: [
        {
          itemId: 'CL-006-01',
          checklistId: 'CL-006',
          itemDescription: 'Manufacturing date',
          itemType: 'DATE',
          isRequired: true,
          displayOrder: 1,
        },
        {
          itemId: 'CL-006-02',
          checklistId: 'CL-006',
          itemDescription: 'Expiration date',
          itemType: 'DATE',
          isRequired: true,
          displayOrder: 2,
        },
        {
          itemId: 'CL-006-03',
          checklistId: 'CL-006',
          itemDescription: 'Days until expiration',
          itemType: 'NUMBER',
          isRequired: true,
          displayOrder: 3,
        },
        {
          itemId: 'CL-006-04',
          checklistId: 'CL-006',
          itemDescription: 'Storage conditions adequate',
          itemType: 'CHECKBOX',
          isRequired: true,
          displayOrder: 4,
        },
      ],
      createdAt: '2024-01-25T00:00:00Z',
      updatedAt: '2024-01-25T00:00:00Z',
    },
    {
      checklistId: 'CL-007',
      checklistName: 'Electronics Testing Protocol',
      description: 'Electrical and functional testing for electronic components',
      inspectionType: InspectionType.INCOMING,
      isActive: true,
      items: [
        {
          itemId: 'CL-007-01',
          checklistId: 'CL-007',
          itemDescription: 'Visual inspection completed',
          itemType: 'CHECKBOX',
          isRequired: true,
          displayOrder: 1,
        },
        {
          itemId: 'CL-007-02',
          checklistId: 'CL-007',
          itemDescription: 'Power-on test passed',
          itemType: 'CHECKBOX',
          isRequired: true,
          displayOrder: 2,
        },
        {
          itemId: 'CL-007-03',
          checklistId: 'CL-007',
          itemDescription: 'Functionality test results',
          itemType: 'TEXT',
          isRequired: true,
          displayOrder: 3,
        },
        {
          itemId: 'CL-007-04',
          checklistId: 'CL-007',
          itemDescription: 'Safety certification verified',
          itemType: 'CHECKBOX',
          isRequired: true,
          displayOrder: 4,
        },
      ],
      createdAt: '2024-02-01T00:00:00Z',
      updatedAt: '2024-02-01T00:00:00Z',
    },
    {
      checklistId: 'CL-008',
      checklistName: 'Perishable Goods Inspection',
      description: 'Quality checks for perishable inventory items',
      inspectionType: InspectionType.INVENTORY,
      isActive: true,
      items: [
        {
          itemId: 'CL-008-01',
          checklistId: 'CL-008',
          itemDescription: 'Temperature on delivery',
          itemType: 'NUMBER',
          isRequired: true,
          displayOrder: 1,
        },
        {
          itemId: 'CL-008-02',
          checklistId: 'CL-008',
          itemDescription: 'Current storage temperature',
          itemType: 'NUMBER',
          isRequired: true,
          displayOrder: 2,
        },
        {
          itemId: 'CL-008-03',
          checklistId: 'CL-008',
          itemDescription: 'Signs of spoilage',
          itemType: 'CHECKBOX',
          isRequired: true,
          displayOrder: 3,
        },
        {
          itemId: 'CL-008-04',
          checklistId: 'CL-008',
          itemDescription: 'Quality grade assignment',
          itemType: 'TEXT',
          isRequired: true,
          displayOrder: 4,
        },
      ],
      createdAt: '2024-02-05T00:00:00Z',
      updatedAt: '2024-02-05T00:00:00Z',
    },
  ];

  const mockReturns: ReturnAuthorization[] = [
    {
      returnId: 'RTA-2024-001',
      orderId: 'ORD-78542',
      customerId: 'CUST-1001',
      customerName: 'Acme Corporation',
      status: 'COMPLETED',
      returnDate: '2024-01-10T00:00:00Z',
      receivedDate: '2024-01-15T00:00:00Z',
      reason: 'Defective product received',
      notes: 'Customer reported multiple units not functioning. Full refund processed.',
      items: [
        {
          id: 'RTA-2024-001-01',
          returnId: 'RTA-2024-001',
          orderId: 'ORD-78542',
          sku: 'ELECTRONIC-B-002',
          quantity: 5,
          reason: 'Defective - power failure',
          disposition: 'SCRAP',
          condition: 'Non-functional',
          createdAt: '2024-01-10T00:00:00Z',
        },
      ],
      createdAt: '2024-01-10T00:00:00Z',
      updatedAt: '2024-01-16T00:00:00Z',
    },
    {
      returnId: 'RTA-2024-002',
      orderId: 'ORD-78890',
      customerId: 'CUST-1045',
      customerName: 'Global Tech Industries',
      status: 'PROCESSED',
      returnDate: '2024-01-12T00:00:00Z',
      receivedDate: '2024-01-18T00:00:00Z',
      reason: 'Wrong item shipped',
      notes: 'Warehouse error - incorrect SKU sent. Correct item reshipped.',
      items: [
        {
          id: 'RTA-2024-002-01',
          returnId: 'RTA-2024-002',
          orderId: 'ORD-78890',
          sku: 'GADGET-C-003',
          quantity: 25,
          reason: 'Wrong item',
          disposition: 'RESTOCK',
          condition: 'Like new',
          createdAt: '2024-01-12T00:00:00Z',
        },
      ],
      createdAt: '2024-01-12T00:00:00Z',
      updatedAt: '2024-01-19T00:00:00Z',
    },
    {
      returnId: 'RTA-2024-003',
      orderId: 'ORD-79234',
      customerId: 'CUST-1089',
      customerName: 'Prime Logistics LLC',
      status: 'RECEIVED',
      returnDate: '2024-01-20T00:00:00Z',
      receivedDate: '2024-01-22T00:00:00Z',
      reason: 'No longer needed',
      notes: 'Project cancelled. Items returned unopened.',
      items: [
        {
          id: 'RTA-2024-003-01',
          returnId: 'RTA-2024-003',
          orderId: 'ORD-79234',
          sku: 'SUPPLY-G-007',
          quantity: 100,
          reason: 'Project cancellation',
          disposition: null,
          condition: 'New in box',
          createdAt: '2024-01-20T00:00:00Z',
        },
      ],
      createdAt: '2024-01-20T00:00:00Z',
      updatedAt: '2024-01-22T00:00:00Z',
    },
    {
      returnId: 'RTA-2024-004',
      orderId: 'ORD-79567',
      customerId: 'CUST-1123',
      customerName: 'Summit Solutions Inc',
      status: 'INSPECTED',
      returnDate: '2024-01-25T00:00:00Z',
      receivedDate: '2024-01-28T00:00:00Z',
      reason: 'Damaged during shipping',
      notes: 'Items arrived with box damage. Contents inspection pending.',
      items: [
        {
          id: 'RTA-2024-004-01',
          returnId: 'RTA-2024-004',
          orderId: 'ORD-79567',
          sku: 'PART-H-008',
          quantity: 50,
          reason: 'Shipping damage',
          disposition: 'QUARANTINE',
          condition: 'Box damaged, contents unknown',
          createdAt: '2024-01-25T00:00:00Z',
        },
      ],
      createdAt: '2024-01-25T00:00:00Z',
      updatedAt: '2024-01-29T00:00:00Z',
    },
    {
      returnId: 'RTA-2024-005',
      orderId: 'ORD-79890',
      customerId: 'CUST-1156',
      customerName: 'Metro Distributors',
      status: 'APPROVED',
      returnDate: '2024-02-01T00:00:00Z',
      receivedDate: null,
      reason: 'Product did not meet specifications',
      notes: 'Return approved. Awaiting receipt of items.',
      items: [
        {
          id: 'RTA-2024-005-01',
          returnId: 'RTA-2024-005',
          orderId: 'ORD-79890',
          sku: 'COMPONENT-D-004',
          quantity: 75,
          reason: 'Spec mismatch',
          disposition: null,
          condition: 'Unknown',
          createdAt: '2024-02-01T00:00:00Z',
        },
      ],
      createdAt: '2024-02-01T00:00:00Z',
      updatedAt: '2024-02-01T00:00:00Z',
    },
    {
      returnId: 'RTA-2024-006',
      orderId: 'ORD-80123',
      customerId: 'CUST-1189',
      customerName: 'Atlantic Trading Co',
      status: 'PENDING',
      returnDate: '2024-02-05T00:00:00Z',
      receivedDate: null,
      reason: 'Quality issues',
      notes: 'Customer reports surface finish defects. Awaiting approval.',
      items: [
        {
          id: 'RTA-2024-006-01',
          returnId: 'RTA-2024-006',
          orderId: 'ORD-80123',
          sku: 'PRODUCT-E-005',
          quantity: 30,
          reason: 'Surface defects',
          disposition: null,
          condition: 'Unknown',
          createdAt: '2024-02-05T00:00:00Z',
        },
      ],
      createdAt: '2024-02-05T00:00:00Z',
      updatedAt: '2024-02-05T00:00:00Z',
    },
    {
      returnId: 'RTA-2024-007',
      orderId: 'ORD-80456',
      customerId: 'CUST-1223',
      customerName: 'Pacific Rim Enterprises',
      status: 'REJECTED',
      returnDate: '2024-02-08T00:00:00Z',
      receivedDate: null,
      reason: 'Return window expired',
      notes: 'Return rejected - outside of 30-day return policy.',
      items: [
        {
          id: 'RTA-2024-007-01',
          returnId: 'RTA-2024-007',
          orderId: 'ORD-80456',
          sku: 'MATERIAL-F-006',
          quantity: 200,
          reason: 'Late return request',
          disposition: null,
          condition: 'Unknown',
          createdAt: '2024-02-08T00:00:00Z',
        },
      ],
      createdAt: '2024-02-08T00:00:00Z',
      updatedAt: '2024-02-08T00:00:00Z',
    },
    {
      returnId: 'RTA-2024-008',
      orderId: 'ORD-80789',
      customerId: 'CUST-1256',
      customerName: 'Northwest Supply Chain',
      status: 'COMPLETED',
      returnDate: '2024-02-10T00:00:00Z',
      receivedDate: '2024-02-12T00:00:00Z',
      reason: 'Excess inventory - order error',
      notes: 'Customer ordered double quantity by mistake. Credit issued.',
      items: [
        {
          id: 'RTA-2024-008-01',
          returnId: 'RTA-2024-008',
          orderId: 'ORD-80789',
          sku: 'ITEM-I-009',
          quantity: 150,
          reason: 'Ordering error',
          disposition: 'RESTOCK',
          condition: 'New',
          createdAt: '2024-02-10T00:00:00Z',
        },
      ],
      createdAt: '2024-02-10T00:00:00Z',
      updatedAt: '2024-02-13T00:00:00Z',
    },
    {
      returnId: 'RTA-2024-009',
      orderId: 'ORD-81123',
      customerId: 'CUST-1289',
      customerName: 'Central Valley Manufacturing',
      status: 'PROCESSED',
      returnDate: '2024-02-14T00:00:00Z',
      receivedDate: '2024-02-16T00:00:00Z',
      reason: 'Incomplete shipment',
      notes: 'Missing parts found and shipped separately. Return not needed.',
      items: [
        {
          id: 'RTA-2024-009-01',
          returnId: 'RTA-2024-009',
          orderId: 'ORD-81123',
          sku: 'RAW-K-011',
          quantity: 40,
          reason: 'Error - parts found',
          disposition: 'CREDIT_ONLY',
          condition: 'N/A',
          createdAt: '2024-02-14T00:00:00Z',
        },
      ],
      createdAt: '2024-02-14T00:00:00Z',
      updatedAt: '2024-02-17T00:00:00Z',
    },
    {
      returnId: 'RTA-2024-010',
      orderId: 'ORD-81456',
      customerId: 'CUST-1323',
      customerName: 'East Coast Distributors',
      status: 'INSPECTED',
      returnDate: '2024-02-15T00:00:00Z',
      receivedDate: '2024-02-18T00:00:00Z',
      reason: 'Package arrived open',
      notes: 'Shipping damage reported. Items quarantined for inspection.',
      items: [
        {
          id: 'RTA-2024-010-01',
          returnId: 'RTA-2024-010',
          orderId: 'ORD-81456',
          sku: 'GOODS-L-012',
          quantity: 80,
          reason: 'Package tampering',
          disposition: 'QUARANTINE',
          condition: 'Package opened',
          createdAt: '2024-02-15T00:00:00Z',
        },
      ],
      createdAt: '2024-02-15T00:00:00Z',
      updatedAt: '2024-02-19T00:00:00Z',
    },
    {
      returnId: 'RTA-2024-011',
      orderId: 'ORD-81789',
      customerId: 'CUST-1356',
      customerName: 'Heartland Foods Corp',
      status: 'RECEIVED',
      returnDate: '2024-02-16T00:00:00Z',
      receivedDate: '2024-02-18T00:00:00Z',
      reason: 'Temperature sensitive items warm',
      notes: 'Cold chain breach suspected. Items isolated.',
      items: [
        {
          id: 'RTA-2024-011-01',
          returnId: 'RTA-2024-011',
          orderId: 'ORD-81789',
          sku: 'SUPPLY-G-007',
          quantity: 25,
          reason: 'Cold chain failure',
          disposition: null,
          condition: 'Temperature issue',
          createdAt: '2024-02-16T00:00:00Z',
        },
      ],
      createdAt: '2024-02-16T00:00:00Z',
      updatedAt: '2024-02-18T00:00:00Z',
    },
  ];

  // ============================================================================
  // FETCH DATA
  // ============================================================================

  const { data: inspectionsData, refetch: refetchInspections } = useQualityInspections({
    enabled: true,
  });
  const { data: checklistsData, refetch: refetchChecklists } = useInspectionChecklists({
    enabled: true,
  });
  const { data: returnsData } = useReturnAuthorizations({
    enabled: true,
  });

  const inspections = inspectionsData?.inspections?.length
    ? inspectionsData.inspections
    : mockInspections;
  const checklists = checklistsData?.checklists?.length
    ? checklistsData.checklists
    : mockChecklists;
  const returns = returnsData?.returns?.length ? returnsData.returns : mockReturns;

  // ============================================================================
  // FILTER DATA
  // ============================================================================

  const filteredInspections =
    inspectionFilter === 'all'
      ? inspections
      : inspections.filter((i: QualityInspection) => i.status === inspectionFilter);

  const filteredReturns =
    returnFilter === 'all'
      ? returns
      : returns.filter((r: ReturnAuthorization) => r.status === returnFilter);

  // Search filters
  const searchedInspections = filteredInspections.filter((inspection: QualityInspection) => {
    if (!inspectionsSearchTerm.trim()) return true;
    const query = inspectionsSearchTerm.toLowerCase();
    return (
      inspection.inspectionId.toLowerCase().includes(query) ||
      inspection.sku.toLowerCase().includes(query) ||
      inspection.inspectionType.toLowerCase().includes(query) ||
      inspection.location?.toLowerCase().includes(query) ||
      inspection.lotNumber?.toLowerCase().includes(query)
    );
  });

  const searchedChecklists = checklists.filter((checklist: InspectionChecklist) => {
    if (!checklistsSearchTerm.trim()) return true;
    const query = checklistsSearchTerm.toLowerCase();
    return (
      checklist.checklistId.toLowerCase().includes(query) ||
      checklist.checklistName.toLowerCase().includes(query) ||
      checklist.inspectionType.toLowerCase().includes(query) ||
      checklist.description?.toLowerCase().includes(query)
    );
  });

  const searchedReturns = filteredReturns.filter((returnAuth: ReturnAuthorization) => {
    if (!returnsSearchTerm.trim()) return true;
    const query = returnsSearchTerm.toLowerCase();
    return (
      returnAuth.returnId.toLowerCase().includes(query) ||
      returnAuth.orderId.toLowerCase().includes(query) ||
      returnAuth.customerName?.toLowerCase().includes(query) ||
      returnAuth.status.toLowerCase().includes(query)
    );
  });

  // Paginate inspections
  const inspectionsTotalPages = Math.ceil(searchedInspections.length / inspectionsPerPage);
  const paginatedInspections = searchedInspections.slice(
    (inspectionsCurrentPage - 1) * inspectionsPerPage,
    inspectionsCurrentPage * inspectionsPerPage
  );

  // Paginate checklists
  const checklistsTotalPages = Math.ceil(searchedChecklists.length / checklistsPerPage);
  const paginatedChecklists = searchedChecklists.slice(
    (checklistsCurrentPage - 1) * checklistsPerPage,
    checklistsCurrentPage * checklistsPerPage
  );

  // Paginate returns
  const returnsTotalPages = Math.ceil(searchedReturns.length / returnsPerPage);
  const paginatedReturns = searchedReturns.slice(
    (returnsCurrentPage - 1) * returnsPerPage,
    returnsCurrentPage * returnsPerPage
  );

  // Calculate pending inspections count
  const pendingInspectionsCount = inspections.filter(
    (i: QualityInspection) =>
      i.status === InspectionStatus.PENDING || i.status === InspectionStatus.IN_PROGRESS
  ).length;

  return (
    <div className="min-h-screen relative">
      {/* Atmospheric background - Inspection Lab theme */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-cyan-500/8 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-teal-600/6 rounded-full blur-3xl" />
        <div className="absolute top-1/3 right-1/4 w-80 h-80 bg-emerald-500/5 rounded-full blur-3xl" />
        {/* Technical grid pattern overlay */}
        <div
          className="absolute inset-0 opacity-[0.015]"
          style={{
            backgroundImage: `linear-gradient(rgba(6, 182, 212, 0.5) 1px, transparent 1px),
                              linear-gradient(90deg, rgba(6, 182, 212, 0.5) 1px, transparent 1px)`,
            backgroundSize: '40px 40px',
          }}
        />
      </div>

      <Header />
      {/* Breadcrumb Navigation */}
      <Breadcrumb />
      <main className="w-full px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        <div className="space-y-6">
          {/* Header - Inspection Lab Design */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="flex items-center gap-5">
              <div className="relative">
                {/* Outer ring animation */}
                <div className="absolute inset-0 bg-cyan-500/20 rounded-2xl animate-pulse" />
                {/* Main icon container */}
                <div className="relative p-4 bg-gradient-to-br from-cyan-500/25 to-teal-500/15 rounded-2xl border border-cyan-500/40 shadow-lg shadow-cyan-500/20 backdrop-blur-sm">
                  <ShieldCheckIcon className="h-9 w-9 text-cyan-400" />
                </div>
                {/* Corner accent */}
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-cyan-400 rounded-full shadow-lg shadow-cyan-400/50" />
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white tracking-tight">
                  Quality Control
                </h1>
                <p className="mt-1.5 text-gray-500 dark:text-gray-400 text-sm tracking-wide uppercase">
                  Inspection Lab
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {/* Active inspections indicator */}
              <div className="flex items-center gap-3 px-4 py-2 bg-gradient-to-r from-cyan-500/10 to-transparent rounded-lg border border-cyan-500/20">
                <div className="relative">
                  <div className="w-2.5 h-2.5 bg-amber-400 rounded-full" />
                  <div className="absolute inset-0 w-2.5 h-2.5 bg-amber-400 rounded-full animate-ping" />
                </div>
                <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                  {pendingInspectionsCount} Pending
                </span>
              </div>

              <div className="flex space-x-3">
                {activeTab === 'inspections' && (
                  <button
                    onClick={() => setInspectionModalOpen(true)}
                    className="flex items-center px-4 py-2.5 bg-gradient-to-r from-cyan-500 to-teal-600 text-white rounded-lg hover:from-cyan-600 hover:to-teal-700 shadow-lg shadow-cyan-500/20"
                  >
                    <DocumentPlusIcon className="h-5 w-5 mr-2" />
                    New Inspection
                  </button>
                )}
                {activeTab === 'checklists' && (
                  <button
                    onClick={() => setChecklistModalOpen(true)}
                    className="flex items-center px-4 py-2.5 bg-gradient-to-r from-cyan-500 to-teal-600 text-white rounded-lg hover:from-cyan-600 hover:to-teal-700 shadow-lg shadow-cyan-500/20"
                  >
                    <ClipboardDocumentCheckIcon className="h-5 w-5 mr-2" />
                    New Checklist
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-200 dark:border-gray-800">
            <nav className="flex space-x-8">
              <button
                onClick={() => setActiveTab('inspections')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'inspections'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-gray-700'
                }`}
              >
                Inspections
              </button>
              <button
                onClick={() => setActiveTab('checklists')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'checklists'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-gray-700'
                }`}
              >
                Checklists
              </button>
              <button
                onClick={() => setActiveTab('returns')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'returns'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-gray-700'
                }`}
              >
                Returns
              </button>
            </nav>
          </div>

          {/* Inspections Tab */}
          {activeTab === 'inspections' && (
            <div className="space-y-4">
              {/* Filter and Search */}
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center space-x-4">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Filter by Status:
                  </label>
                  <select
                    value={inspectionFilter}
                    onChange={e => setInspectionFilter(e.target.value)}
                    className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md text-sm text-gray-900 dark:text-white [&_option]:bg-white [&_option]:text-gray-900 dark:[&_option]:bg-gray-900 dark:[&_option]:text-gray-100"
                  >
                    <option value="all">All</option>
                    <option value={InspectionStatus.PENDING}>Pending</option>
                    <option value={InspectionStatus.IN_PROGRESS}>In Progress</option>
                    <option value={InspectionStatus.PASSED}>Passed</option>
                    <option value={InspectionStatus.FAILED}>Failed</option>
                    <option value={InspectionStatus.CONDITIONAL_PASSED}>Conditional</option>
                  </select>
                </div>
                <div className="relative">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search inspections..."
                    value={inspectionsSearchTerm}
                    onChange={e => setInspectionsSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 w-64 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
              </div>

              {/* Inspections Table */}
              <div className="glass-card rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
                  <thead className="bg-gray-100 dark:bg-gray-900/50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                        ID
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                        Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                        SKU
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-900/30 divide-y divide-gray-200 dark:divide-gray-800">
                    {paginatedInspections.length === 0 ? (
                      <tr>
                        <td
                          colSpan={6}
                          className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400"
                        >
                          {searchedInspections.length === 0
                            ? 'No inspections found'
                            : 'No inspections on this page'}
                        </td>
                      </tr>
                    ) : (
                      paginatedInspections.map((inspection: QualityInspection) => (
                        <tr
                          key={inspection.inspectionId}
                          className="hover:bg-gray-50 dark:hover:bg-gray-800/50"
                        >
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                            {inspection.inspectionId}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                            {inspection.inspectionType}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                            {inspection.sku}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <InspectionStatusBadge status={inspection.status} />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                            {new Date(inspection.createdAt).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                            <button
                              onClick={() => {
                                setSelectedInspection(inspection);
                                setInspectionModalOpen(true);
                              }}
                              className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 mr-3"
                            >
                              <EyeIcon className="h-5 w-5 inline" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination for Inspections */}
              {inspectionsTotalPages > 1 && (
                <div className="flex justify-center mt-4">
                  <Pagination
                    currentPage={inspectionsCurrentPage}
                    totalItems={searchedInspections.length}
                    pageSize={inspectionsPerPage}
                    onPageChange={setInspectionsCurrentPage}
                  />
                </div>
              )}
            </div>
          )}

          {/* Checklists Tab */}
          {activeTab === 'checklists' && (
            <div className="space-y-4">
              {/* Search */}
              <div className="flex justify-end">
                <div className="relative">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search checklists..."
                    value={checklistsSearchTerm}
                    onChange={e => setChecklistsSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 w-64 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
              </div>

              {/* Checklists Table */}
              <div className="glass-card rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
                  <thead className="bg-gray-100 dark:bg-gray-900/50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                        ID
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                        Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                        Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                        Items
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-900/30 divide-y divide-gray-200 dark:divide-gray-800">
                    {paginatedChecklists.length === 0 ? (
                      <tr>
                        <td
                          colSpan={5}
                          className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400"
                        >
                          {searchedChecklists.length === 0
                            ? 'No checklists found'
                            : 'No checklists on this page'}
                        </td>
                      </tr>
                    ) : (
                      paginatedChecklists.map((checklist: InspectionChecklist) => (
                        <tr
                          key={checklist.checklistId}
                          className="hover:bg-gray-50 dark:hover:bg-gray-800/50"
                        >
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                            {checklist.checklistId}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                            {checklist.checklistName}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                            {checklist.inspectionType}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                            {checklist.items?.length || 0}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                            <button
                              onClick={() => {
                                setSelectedChecklist(checklist);
                                setChecklistModalOpen(true);
                              }}
                              className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 mr-3"
                            >
                              <EyeIcon className="h-5 w-5 inline" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination for Checklists */}
              {checklistsTotalPages > 1 && (
                <div className="flex justify-center mt-4">
                  <Pagination
                    currentPage={checklistsCurrentPage}
                    totalItems={searchedChecklists.length}
                    pageSize={checklistsPerPage}
                    onPageChange={setChecklistsCurrentPage}
                  />
                </div>
              )}
            </div>
          )}

          {/* Returns Tab */}
          {activeTab === 'returns' && (
            <div className="space-y-4">
              {/* Filter and Search */}
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center space-x-4">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Filter by Status:
                  </label>
                  <select
                    value={returnFilter}
                    onChange={e => setReturnFilter(e.target.value)}
                    className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md text-sm text-gray-900 dark:text-white [&_option]:bg-white [&_option]:text-gray-900 dark:[&_option]:bg-gray-900 dark:[&_option]:text-gray-100"
                  >
                    <option value="all">All</option>
                    <option value="PENDING">Pending</option>
                    <option value="APPROVED">Approved</option>
                    <option value="RECEIVED">Received</option>
                    <option value="INSPECTED">Inspected</option>
                    <option value="PROCESSED">Processed</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="REJECTED">Rejected</option>
                  </select>
                </div>
                <div className="relative">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search returns..."
                    value={returnsSearchTerm}
                    onChange={e => setReturnsSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 w-64 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
              </div>

              {/* Returns Table */}
              <div className="glass-card rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
                  <thead className="bg-gray-100 dark:bg-gray-900/50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                        ID
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                        Order
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                        Customer
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                        Disposition
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                        Return Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-900/30 divide-y divide-gray-200 dark:divide-gray-800">
                    {paginatedReturns.length === 0 ? (
                      <tr>
                        <td
                          colSpan={7}
                          className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400"
                        >
                          {searchedReturns.length === 0
                            ? 'No returns found'
                            : 'No returns on this page'}
                        </td>
                      </tr>
                    ) : (
                      paginatedReturns.map((returnAuth: ReturnAuthorization) => (
                        <tr
                          key={returnAuth.returnId}
                          className="hover:bg-gray-50 dark:hover:bg-gray-800/50"
                        >
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                            {returnAuth.returnId}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                            {returnAuth.orderId}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                            {returnAuth.customerName}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <ReturnStatusBadge status={returnAuth.status} />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {returnAuth.items && returnAuth.items.length > 0 ? (
                              <DispositionBadge disposition={returnAuth.items[0].disposition} />
                            ) : (
                              <span className="text-gray-500 dark:text-gray-500">-</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                            {new Date(returnAuth.returnDate).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                            <button
                              onClick={() => {
                                setSelectedInspection(undefined);
                                // View details - could implement a detail modal
                              }}
                              className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                            >
                              <EyeIcon className="h-5 w-5 inline" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination for Returns */}
              {returnsTotalPages > 1 && (
                <div className="flex justify-center mt-4">
                  <Pagination
                    currentPage={returnsCurrentPage}
                    totalItems={searchedReturns.length}
                    pageSize={returnsPerPage}
                    onPageChange={setReturnsCurrentPage}
                  />
                </div>
              )}
            </div>
          )}

          {/* Modals */}
          {inspectionModalOpen && (
            <InspectionModal
              inspection={selectedInspection}
              onClose={() => {
                setInspectionModalOpen(false);
                setSelectedInspection(undefined);
              }}
              onSuccess={() => {
                setInspectionModalOpen(false);
                setSelectedInspection(undefined);
                refetchInspections();
              }}
            />
          )}

          {checklistModalOpen && (
            <ChecklistModal
              checklist={selectedChecklist}
              onClose={() => {
                setChecklistModalOpen(false);
                setSelectedChecklist(undefined);
              }}
              onSuccess={() => {
                setChecklistModalOpen(false);
                setSelectedChecklist(undefined);
                refetchChecklists();
              }}
            />
          )}
        </div>
      </main>
    </div>
  );
}
