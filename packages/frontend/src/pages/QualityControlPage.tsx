/**
 * Quality Control Page
 *
 * Manages quality inspections, inspection checklists, and return authorizations.
 * Provides tabbed interface for different quality control workflows.
 */

import React, { useState, useEffect } from 'react';
import {
  DocumentPlusIcon,
  ClipboardDocumentCheckIcon,
  EyeIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  ChevronLeftIcon,
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

// ============================================================================
// TYPES
// ============================================================================

type ReturnStatus = ReturnAuthorization['status'];

// ============================================================================
// STATUS BADGES
// ============================================================================

function InspectionStatusBadge({ status }: { status: InspectionStatus }) {
  const styles: Record<InspectionStatus, string> = {
    [InspectionStatus.PENDING]: 'bg-gray-100 text-gray-800',
    [InspectionStatus.IN_PROGRESS]: 'bg-blue-100 text-blue-800',
    [InspectionStatus.PASSED]: 'bg-green-100 text-green-800',
    [InspectionStatus.FAILED]: 'bg-red-100 text-red-800',
    [InspectionStatus.CONDITIONAL_PASSED]: 'bg-yellow-100 text-yellow-800',
    [InspectionStatus.CANCELLED]: 'bg-gray-200 text-gray-600',
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
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}

function ReturnStatusBadge({ status }: { status: ReturnStatus }) {
  const styles: Record<string, string> = {
    PENDING: 'bg-yellow-100 text-yellow-800',
    APPROVED: 'bg-blue-100 text-blue-800',
    RECEIVED: 'bg-purple-100 text-purple-800',
    INSPECTED: 'bg-indigo-100 text-indigo-800',
    PROCESSED: 'bg-green-100 text-green-800',
    REJECTED: 'bg-red-100 text-red-800',
    COMPLETED: 'bg-green-100 text-green-800',
  };

  return (
    <span
      className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-800'}`}
    >
      {status}
    </span>
  );
}

function DispositionBadge({ disposition }: { disposition?: DispositionAction }) {
  if (!disposition) {
    return (
      <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
        Pending
      </span>
    );
  }

  const styles: Record<string, string> = {
    RETURN_TO_VENDOR: 'bg-blue-100 text-blue-800',
    RESTOCK: 'bg-green-100 text-green-800',
    REWORK: 'bg-yellow-100 text-yellow-800',
    SCRAP: 'bg-red-100 text-red-800',
    QUARANTINE: 'bg-purple-100 text-purple-800',
    CREDIT_ONLY: 'bg-orange-100 text-orange-800',
    DONATE: 'bg-pink-100 text-pink-800',
  };

  return (
    <span
      className={`px-2 py-1 rounded-full text-xs font-medium ${styles[disposition] || 'bg-gray-100 text-gray-800'}`}
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
          showToast('Inspection updated successfully', 'success');
        } else {
          await createMutation.mutateAsync(values as any);
          showToast('Inspection created successfully', 'success');
        }
        onSuccess();
        onClose();
      } catch (error: any) {
        console.error('Failed to save inspection:', error);
        showToast(error?.message || 'Failed to save inspection', 'error');
        throw error;
      }
    },
  });

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {isEdit ? 'Edit Inspection' : 'Create Inspection'}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Inspection Type *
              </label>
              <select
                name="inspectionType"
                required
                value={formData.inspectionType}
                onChange={handleChange}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.inspectionType ? 'border-red-500' : 'border-gray-300'
                }`}
              >
                <option value={InspectionType.INCOMING}>Incoming</option>
                <option value={InspectionType.OUTGOING}>Outgoing</option>
                <option value={InspectionType.INVENTORY}>Inventory</option>
                <option value={InspectionType.RETURN}>Return</option>
                <option value={InspectionType.DAMAGE}>Damage</option>
                <option value={InspectionType.EXPIRATION}>Expiration</option>
              </select>
              {errors.inspectionType && (
                <p className="mt-1 text-sm text-red-500">{errors.inspectionType}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Reference Type *
              </label>
              <select
                name="referenceType"
                required
                value={formData.referenceType}
                onChange={handleChange}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.referenceType ? 'border-red-500' : 'border-gray-300'
                }`}
              >
                <option value="INVENTORY">Inventory</option>
                <option value="ASN">ASN</option>
                <option value="RECEIPT">Receipt</option>
                <option value="ORDER">Order</option>
                <option value="RETURN">Return</option>
              </select>
              {errors.referenceType && (
                <p className="mt-1 text-sm text-red-500">{errors.referenceType}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Reference ID *</label>
              <input
                type="text"
                name="referenceId"
                required
                value={formData.referenceId}
                onChange={handleChange}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.referenceId ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Enter reference ID"
              />
              {errors.referenceId && (
                <p className="mt-1 text-sm text-red-500">{errors.referenceId}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">SKU *</label>
              <input
                type="text"
                name="sku"
                required
                value={formData.sku}
                onChange={handleChange}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.sku ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Enter SKU"
              />
              {errors.sku && <p className="mt-1 text-sm text-red-500">{errors.sku}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
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
                  errors.quantityInspected ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.quantityInspected && (
                <p className="mt-1 text-sm text-red-500">{errors.quantityInspected}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
              <input
                type="text"
                name="location"
                value={formData.location}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter location"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Lot Number</label>
              <input
                type="text"
                name="lotNumber"
                value={formData.lotNumber}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter lot number"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              rows={3}
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter inspection notes"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
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
      showToast('Checklist saved successfully', 'success');
      onSuccess();
    } catch (error: any) {
      console.error('Failed to save checklist:', error);
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
      showToast('Checklist deleted successfully', 'success');
      onSuccess();
    } catch (error: any) {
      console.error('Failed to delete checklist:', error);
      showToast(error?.message || 'Failed to delete checklist', 'error');
    } finally {
      setDeleteConfirm(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-900">
            {isEdit ? 'Edit Checklist' : 'Create Checklist'}
          </h2>
          {isEdit && (
            <button
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
              className="text-red-600 hover:text-red-800 text-sm"
            >
              Delete
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Checklist Name *
              </label>
              <input
                type="text"
                required
                value={formData.checklistName}
                onChange={e => setFormData({ ...formData, checklistName: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter checklist name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Inspection Type *
              </label>
              <select
                required
                value={formData.inspectionType}
                onChange={e =>
                  setFormData({ ...formData, inspectionType: e.target.value as InspectionType })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              rows={2}
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter checklist description"
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-medium text-gray-700">Checklist Items</label>
              <button
                type="button"
                onClick={handleAddItem}
                className="text-blue-600 hover:text-blue-800 text-sm"
              >
                + Add Item
              </button>
            </div>
            <div className="space-y-2">
              {formData.items.map((item, index) => (
                <div
                  key={item.itemId}
                  className="flex items-center space-x-2 p-2 border border-gray-200 rounded-md"
                >
                  <input
                    type="text"
                    required
                    value={item.itemDescription}
                    onChange={e => handleUpdateItem(index, 'itemDescription', e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                    placeholder="Item description"
                  />
                  <select
                    value={item.itemType}
                    onChange={e => handleUpdateItem(index, 'itemType', e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                  >
                    <option value="CHECKBOX">Checkbox</option>
                    <option value="TEXT">Text</option>
                    <option value="NUMBER">Number</option>
                    <option value="DATE">Date</option>
                  </select>
                  <label className="flex items-center text-sm">
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
                    className="text-red-600 hover:text-red-800"
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
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
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

  // Fetch data
  const { data: inspectionsData, refetch: refetchInspections } = useQualityInspections({
    enabled: true,
  });
  const { data: checklistsData, refetch: refetchChecklists } = useInspectionChecklists({
    enabled: true,
  });
  const { data: returnsData } = useReturnAuthorizations({
    enabled: true,
  });

  const inspections = inspectionsData?.inspections || [];
  const checklists = checklistsData?.checklists || [];
  const returns = returnsData?.returns || [];

  // Filter data
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

  return (
    <div className="min-h-screen">
      <Header />
      {/* Breadcrumb Navigation */}
      <Breadcrumb />
      <main className="w-full px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div>
                <h1 className="text-2xl font-bold text-white">Quality Control</h1>
                <p className="text-sm text-gray-400 mt-1">
                  Manage inspections, checklists, and returns
                </p>
              </div>
            </div>
            <div className="flex space-x-3">
              {activeTab === 'inspections' && (
                <button
                  onClick={() => setInspectionModalOpen(true)}
                  className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  <DocumentPlusIcon className="h-5 w-5 mr-2" />
                  New Inspection
                </button>
              )}
              {activeTab === 'checklists' && (
                <button
                  onClick={() => setChecklistModalOpen(true)}
                  className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  <ClipboardDocumentCheckIcon className="h-5 w-5 mr-2" />
                  New Checklist
                </button>
              )}
            </div>
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-800">
            <nav className="flex space-x-8">
              <button
                onClick={() => setActiveTab('inspections')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'inspections'
                    ? 'border-blue-500 text-blue-400'
                    : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-700'
                }`}
              >
                Inspections
              </button>
              <button
                onClick={() => setActiveTab('checklists')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'checklists'
                    ? 'border-blue-500 text-blue-400'
                    : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-700'
                }`}
              >
                Checklists
              </button>
              <button
                onClick={() => setActiveTab('returns')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'returns'
                    ? 'border-blue-500 text-blue-400'
                    : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-700'
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
                  <label className="text-sm font-medium text-gray-300">Filter by Status:</label>
                  <select
                    value={inspectionFilter}
                    onChange={e => setInspectionFilter(e.target.value)}
                    className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-sm text-white"
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
                    className="pl-10 pr-4 py-2 w-64 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
              </div>

              {/* Inspections Table */}
              <div className="glass-card rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-800">
                  <thead className="bg-gray-900/50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        ID
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        SKU
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-gray-900/30 divide-y divide-gray-800">
                    {paginatedInspections.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-400">
                          {searchedInspections.length === 0
                            ? 'No inspections found'
                            : 'No inspections on this page'}
                        </td>
                      </tr>
                    ) : (
                      paginatedInspections.map((inspection: QualityInspection) => (
                        <tr key={inspection.inspectionId}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">
                            {inspection.inspectionId}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                            {inspection.inspectionType}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                            {inspection.sku}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <InspectionStatusBadge status={inspection.status} />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                            {new Date(inspection.createdAt).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                            <button
                              onClick={() => {
                                setSelectedInspection(inspection);
                                setInspectionModalOpen(true);
                              }}
                              className="text-blue-400 hover:text-blue-300 mr-3"
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
                    className="pl-10 pr-4 py-2 w-64 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
              </div>

              {/* Checklists Table */}
              <div className="glass-card rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-800">
                  <thead className="bg-gray-900/50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        ID
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Items
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-gray-900/30 divide-y divide-gray-800">
                    {paginatedChecklists.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-400">
                          {searchedChecklists.length === 0
                            ? 'No checklists found'
                            : 'No checklists on this page'}
                        </td>
                      </tr>
                    ) : (
                      paginatedChecklists.map((checklist: InspectionChecklist) => (
                        <tr key={checklist.checklistId}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">
                            {checklist.checklistId}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                            {checklist.checklistName}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                            {checklist.inspectionType}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                            {checklist.items?.length || 0}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                            <button
                              onClick={() => {
                                setSelectedChecklist(checklist);
                                setChecklistModalOpen(true);
                              }}
                              className="text-blue-400 hover:text-blue-300 mr-3"
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
                  <label className="text-sm font-medium text-gray-300">Filter by Status:</label>
                  <select
                    value={returnFilter}
                    onChange={e => setReturnFilter(e.target.value)}
                    className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-sm text-white"
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
                    className="pl-10 pr-4 py-2 w-64 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
              </div>

              {/* Returns Table */}
              <div className="glass-card rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-800">
                  <thead className="bg-gray-900/50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        ID
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Order
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Customer
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Disposition
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Return Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-gray-900/30 divide-y divide-gray-800">
                    {paginatedReturns.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-4 text-center text-sm text-gray-400">
                          {searchedReturns.length === 0
                            ? 'No returns found'
                            : 'No returns on this page'}
                        </td>
                      </tr>
                    ) : (
                      paginatedReturns.map((returnAuth: ReturnAuthorization) => (
                        <tr key={returnAuth.returnId}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">
                            {returnAuth.returnId}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                            {returnAuth.orderId}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                            {returnAuth.customerName}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <ReturnStatusBadge status={returnAuth.status} />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {returnAuth.items && returnAuth.items.length > 0 ? (
                              <DispositionBadge disposition={returnAuth.items[0].disposition} />
                            ) : (
                              <span className="text-gray-500">-</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                            {new Date(returnAuth.returnDate).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                            <button
                              onClick={() => {
                                setSelectedInspection(undefined);
                                // View details - could implement a detail modal
                              }}
                              className="text-blue-400 hover:text-blue-300"
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
