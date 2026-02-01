/**
 * Cycle Count Detail page
 *
 * Dedicated page for viewing and managing a single cycle count plan
 * @updated 2025-01-26
 */

import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  useCycleCountPlan,
  useStartCycleCount,
  useCompleteCycleCount,
  useReconcileCycleCount,
  useCreateCycleCountEntry,
  useUpdateVarianceStatus,
  useBulkUpdateVarianceStatus,
  useReconcileSummary,
  useCancelCycleCount,
  useCheckCollisions,
  useCycleCountAuditLog,
  useExportCycleCount,
  useStockControlInventory,
  useBinLocations,
  useBarcodeLookup,
  useAssignableUsers,
} from '@/services/api';
import { Header, Select } from '@/components/shared';
import { useToast } from '@/components/shared';
import { QuickCountPanel, CountSheetPrint } from '@/components/cycle-count';
import { useAuthStore } from '@/stores';
import { useFormValidation } from '@/hooks/useFormValidation';
import { CycleCountStatus, CycleCountType, VarianceStatus, UserRole } from '@opsui/shared';
import {
  ChartBarIcon,
  PlayIcon,
  CheckIcon,
  PlusIcon,
  ExclamationTriangleIcon,
  ClipboardDocumentListIcon,
  ArrowLeftIcon,
  XMarkIcon,
  QrCodeIcon,
  InformationCircleIcon,
  DocumentIcon,
  ClockIcon,
  NoSymbolIcon,
} from '@heroicons/react/24/outline';
import { Card, CardHeader, CardContent, CardTitle, Button } from '@/components/shared';

// Status Badge component (shared with CycleCountingPage)
function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    SCHEDULED: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    IN_PROGRESS: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    COMPLETED: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    RECONCILED: 'bg-green-500/20 text-green-400 border-green-500/30',
    CANCELLED: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  };

  const labels: Record<string, string> = {
    SCHEDULED: 'Scheduled',
    IN_PROGRESS: 'In Progress',
    COMPLETED: 'Completed',
    RECONCILED: 'Reconciled',
    CANCELLED: 'Cancelled',
  };

  return (
    <span
      className={`px-3 py-1 rounded-full text-xs font-medium border ${styles[status] || 'bg-gray-500/20 text-gray-400'}`}
    >
      {labels[status] || status}
    </span>
  );
}

function VarianceStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    PENDING: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    APPROVED: 'bg-green-500/20 text-green-400 border-green-500/30',
    REJECTED: 'bg-red-500/20 text-red-400 border-red-500/30',
    AUTO_ADJUSTED: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  };

  const labels: Record<string, string> = {
    PENDING: 'Pending',
    APPROVED: 'Approved',
    REJECTED: 'Rejected',
    AUTO_ADJUSTED: 'Auto-Adjusted',
  };

  return (
    <span
      className={`px-2 py-1 rounded-full text-xs font-medium border ${styles[status] || 'bg-gray-500/20 text-gray-400'}`}
    >
      {labels[status] || status}
    </span>
  );
}

// Count Entry Modal
function CountEntryModal({
  plan,
  onClose,
  onSuccess,
  prefillSku,
  prefillLocation,
}: {
  plan: any;
  onClose: () => void;
  onSuccess: () => void;
  prefillSku?: string;
  prefillLocation?: string;
}) {
  const createEntryMutation = useCreateCycleCountEntry();
  const [errorMessage, setErrorMessage] = useState('');
  const [skuSearch, setSkuSearch] = useState('');
  const prefillValues = useState({
    sku: prefillSku,
    location: prefillLocation,
  })[0];

  // Barcode scanning state
  const [barcode, setBarcode] = useState('');
  const [barcodeStatus, setBarcodeStatus] = useState<'idle' | 'loading' | 'success' | 'error'>(
    'idle'
  );
  const [barcodeMessage, setBarcodeMessage] = useState('');

  // Bin location quantities state
  const [skuBinLocations, setSkuBinLocations] = useState<
    Array<{ binId: string; quantity: number }>
  >([]);

  // Barcode lookup hook
  const {
    data: barcodeData,
    isLoading: barcodeLoading,
    isError: barcodeError,
    refetch: refetchBarcode,
  } = useBarcodeLookup(barcode, barcodeStatus === 'loading');

  // Fetch SKUs and bin locations
  const { data: inventoryData, isLoading: loadingInventory } = useStockControlInventory({
    limit: 1000,
  });
  const { data: binsData, isLoading: loadingBins } = useBinLocations();

  const skus = inventoryData?.items || [];
  const binLocations = binsData || []; // API returns array directly, not wrapped in object

  // Get pending entries from plan (items to be counted)
  const pendingEntries = plan?.countEntries?.filter((e: any) => e.countedQuantity === 0) || [];

  // Get unique SKUs from pending entries for the counting guide
  const pendingSkus = Array.from(new Map(pendingEntries.map((e: any) => [e.sku, e])).values());

  // Filter SKUs based on search
  const filteredSkus = skuSearch
    ? skus.filter(
        (item: any) =>
          item.sku?.toLowerCase().includes(skuSearch.toLowerCase()) ||
          item.name?.toLowerCase().includes(skuSearch.toLowerCase())
      )
    : skus;

  // Deduplicate SKUs to avoid React key warnings
  const uniqueSkus = Array.from(
    new Map(filteredSkus.map((item: any) => [item.sku, item])).values()
  );

  // Form validation
  const {
    values: formData,
    errors,
    handleChange,
    isSubmitting,
    setFieldValue,
    handleBlur,
  } = useFormValidation({
    initialValues: {
      sku: prefillValues.sku || plan.sku || '',
      binLocation: prefillValues.location || plan.location || '',
      countedQuantity: '',
      notes: '',
    },
    validationRules: {
      sku: { required: true },
      binLocation: { required: true },
      countedQuantity: {
        required: true,
        custom: (value: string) => {
          const num = parseInt(value);
          if (isNaN(num)) {
            return 'Must be a valid number';
          }
          if (num < 0) {
            return 'Cannot be negative';
          }
          return null;
        },
      },
    },
    onSubmit: async values => {
      // Validate that the SKU exists in the inventory list
      const skuExists = skus.some((item: any) => item.sku === values.sku);
      if (!skuExists) {
        setErrorMessage('Invalid SKU. Please select a valid SKU from the dropdown list.');
        return;
      }

      try {
        await createEntryMutation.mutateAsync({
          planId: plan.planId,
          sku: values.sku,
          binLocation: values.binLocation,
          countedQuantity: parseInt(values.countedQuantity),
          notes: values.notes,
        });
        onSuccess();
        onClose();
      } catch (error: any) {
        const errorMsg = error?.message || String(error);
        if (
          errorMsg.includes('inventory_transactions_sku_fkey') ||
          errorMsg.includes('foreign key constraint')
        ) {
          setErrorMessage('SKU not found. Please create this SKU first in Stock Control.');
        } else {
          setErrorMessage(`Failed to create entry: ${errorMsg}`);
        }
        throw error;
      }
    },
  });

  // Update bin location quantities when SKU changes
  const updateSkuBinLocations = (selectedSku: string) => {
    if (!selectedSku) {
      setSkuBinLocations([]);
      return;
    }

    // Find all bin locations for this SKU from inventory
    const skuInventory = skus.filter((item: any) => item.sku === selectedSku);
    const binQuantities = skuInventory.map((item: any) => ({
      binId: item.binLocation,
      quantity: item.quantity || 0,
    }));

    setSkuBinLocations(binQuantities);
  };

  // Handle barcode scanning
  const handleBarcodeChange = (value: string) => {
    setBarcode(value);
    setErrorMessage('');

    // When barcode is complete (typical barcode lengths), trigger lookup
    if (value.length >= 8) {
      setBarcodeStatus('loading');
      setBarcodeMessage('Looking up barcode...');

      // Small delay to allow user to finish scanning
      setTimeout(() => {
        setBarcodeStatus('loading');
        refetchBarcode();
      }, 300);
    } else if (value.length === 0) {
      setBarcodeStatus('idle');
      setBarcodeMessage('');
    }
  };

  // Process barcode lookup result
  const processBarcodeResult = () => {
    if (barcodeLoading) return;

    if (barcodeError) {
      setBarcodeStatus('error');
      setBarcodeMessage('Barcode not found');
      return;
    }

    if (barcodeData && barcodeData.sku) {
      // Check if plan has a locked SKU and verify it matches
      if (plan.sku && barcodeData.sku !== plan.sku) {
        setBarcodeStatus('error');
        setBarcodeMessage(`Mismatch! Scanned ${barcodeData.sku}, but plan requires ${plan.sku}`);
        return;
      }

      setBarcodeStatus('success');
      setBarcodeMessage(`Found: ${barcodeData.productName || barcodeData.sku}`);
      setSku(barcodeData.sku);
      setSkuSearch('');

      // Update bin location quantities for this SKU
      updateSkuBinLocations(barcodeData.sku);

      // Focus on quantity field after successful scan
      setTimeout(() => {
        const quantityInput = document.querySelector('input[type="number"]') as HTMLInputElement;
        quantityInput?.focus();
      }, 100);
    } else {
      setBarcodeStatus('error');
      setBarcodeMessage('No SKU found for this barcode');
    }
  };

  // Process barcode result when data changes
  if (barcode && barcodeStatus === 'loading' && !barcodeLoading) {
    processBarcodeResult();
  }

  // Clear barcode input
  const clearBarcode = () => {
    setBarcode('');
    setBarcodeStatus('idle');
    setBarcodeMessage('');
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="dark:bg-gray-900 bg-white rounded-xl shadow-2xl max-w-md w-full">
        <div className="px-6 py-4 dark:bg-success-500/10 bg-success-50 border-b dark:border-success-500/20 border-success-200 flex justify-between items-center">
          <h3 className="text-lg font-semibold dark:text-white text-gray-900">Add Count Entry</h3>
          <button
            onClick={onClose}
            className="dark:text-gray-400 text-gray-600 dark:hover:text-white hover:text-gray-900"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>
        <form onSubmit={createEntry} className="p-6 space-y-4">
          {/* Barcode Scanning */}
          <div>
            <label className="block text-sm font-medium dark:text-gray-300 text-gray-700 mb-1">
              Scan Barcode {plan.sku ? '(Verification)' : '(Optional)'}
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <QrCodeIcon className="h-5 w-5 dark:text-gray-500 text-gray-400" />
              </div>
              <input
                type="text"
                value={barcode}
                onChange={e => handleBarcodeChange(e.target.value)}
                className={`w-full pl-10 pr-10 py-2 dark:bg-gray-800 bg-gray-50 border dark:border-gray-600 border-gray-300 rounded-lg dark:text-white text-gray-900 ${
                  barcodeStatus === 'success'
                    ? 'border-green-500 focus:ring-green-500'
                    : barcodeStatus === 'error'
                      ? 'border-red-500 focus:ring-red-500'
                      : 'focus:ring-primary-500'
                }`}
                placeholder="Scan or enter barcode..."
                autoFocus
              />
              {barcode && (
                <button
                  type="button"
                  onClick={clearBarcode}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  <XMarkIcon className="h-5 w-5 dark:text-gray-500 text-gray-400 hover:dark:text-gray-300 hover:text-gray-600" />
                </button>
              )}
            </div>
            {/* Barcode status message display */}
            {barcodeMessage && (
              <p
                className={`text-xs mt-1 ${
                  barcodeStatus === 'success'
                    ? 'text-green-500'
                    : barcodeStatus === 'error'
                      ? 'text-red-500'
                      : 'text-gray-500'
                }`}
              >
                {barcodeMessage}
                {plan.sku && barcodeStatus === 'success' && (
                  <span className="ml-2 text-blue-400">âœ“ Matches plan SKU</span>
                )}
              </p>
            )}
          </div>

          {/* SKU Dropdown */}
          <div>
            <label className="block text-sm font-medium dark:text-gray-300 text-gray-700 mb-1">
              SKU {plan.sku && <span className="text-xs text-blue-400">(Locked by Plan)</span>}
            </label>
            <div className="relative">
              <input
                type="text"
                required
                name="sku"
                value={formData.sku}
                onChange={e => {
                  const value = e.target.value.toUpperCase();
                  handleChange({
                    ...e,
                    target: { ...e.target, name: 'sku', value },
                  } as React.ChangeEvent<HTMLInputElement>);
                  setSkuSearch(value);
                  setErrorMessage('');
                  // Update bin location quantities when SKU is manually entered
                  if (!plan.sku) {
                    updateSkuBinLocations(value);
                  }
                }}
                onBlur={() => handleBlur('sku')}
                onFocus={() => setSkuSearch(formData.sku || '')}
                disabled={!!plan.sku}
                className={`w-full px-3 py-2 dark:bg-gray-800 bg-gray-50 border rounded-lg dark:text-white text-gray-900 ${
                  plan.sku ? 'opacity-75 cursor-not-allowed' : ''
                } ${
                  errors.sku
                    ? 'border-red-500 focus:ring-red-500'
                    : 'dark:border-gray-600 border-gray-300'
                }`}
                placeholder="Search SKU..."
                autoComplete="off"
              />
              {errors.sku && <p className="mt-1 text-sm text-red-400">{errors.sku}</p>}
              {!plan.sku && skuSearch && uniqueSkus.length > 0 && (
                <div className="absolute z-10 w-full mt-1 dark:bg-gray-800 bg-white border dark:border-gray-600 border-gray-300 rounded-lg shadow-lg max-h-60 overflow-auto">
                  {uniqueSkus.slice(0, 20).map((item: any, index: number) => (
                    <div
                      key={`${item.sku}-${index}`}
                      onClick={() => {
                        setFieldValue('sku', item.sku);
                        setSkuSearch('');
                        // Update bin location quantities for this SKU
                        if (!plan.sku) {
                          updateSkuBinLocations(item.sku);
                        }
                      }}
                      className="px-3 py-2 dark:text-gray-300 text-gray-700 dark:hover:bg-gray-700 hover:bg-gray-100 cursor-pointer text-sm"
                    >
                      <div className="font-medium">{item.sku}</div>
                      <div className="text-xs dark:text-gray-500 text-gray-500">{item.name}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {loadingInventory && (
              <p className="text-xs dark:text-gray-500 text-gray-500 mt-1">Loading SKUs...</p>
            )}
          </div>

          {/* Bin Location Dropdown */}
          <div>
            <label className="block text-sm font-medium dark:text-gray-300 text-gray-700 mb-1">
              Bin Location{' '}
              {plan.location && <span className="text-xs text-blue-400">(Locked by Plan)</span>}
            </label>
            <Select
              name="binLocation"
              value={formData.binLocation}
              onChange={e => {
                if (!plan.location) {
                  handleChange(e);
                }
              }}
              disabled={!!plan.location}
              options={[
                { value: '', label: 'Select location...' },
                ...binLocations.map((bin: any) => ({
                  value: bin.binId,
                  label: `${bin.binId} ${bin.zone ? `(${bin.zone})` : ''}`,
                })),
              ]}
              className={plan.location ? 'opacity-75 cursor-not-allowed' : ''}
            />
            {errors.binLocation && (
              <p className="mt-1 text-sm text-red-400">{errors.binLocation}</p>
            )}
            {loadingBins && (
              <p className="text-xs dark:text-gray-500 text-gray-500 mt-1">Loading locations...</p>
            )}

            {/* Show bin location quantities when location is not locked */}
            {!plan.location && formData.sku && skuBinLocations.length > 0 && (
              <div className="mt-2 p-2 dark:bg-blue-500/10 bg-blue-50 dark:border dark:border-blue-500/30 border border-blue-200 rounded-lg">
                <p className="text-xs font-medium dark:text-blue-400 text-blue-700 mb-1">
                  Bin Locations for {formData.sku}:
                </p>
                <div className="space-y-1">
                  {skuBinLocations.map(bin => (
                    <div
                      key={bin.binId}
                      className="flex justify-between text-xs dark:text-gray-300 text-gray-700"
                    >
                      <span>{bin.binId}</span>
                      <span className="font-medium">Qty: {bin.quantity}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Counting Guide - Show expected items from plan */}
          {pendingSkus.length > 0 && (
            <div className="p-3 dark:bg-gray-800 bg-gray-50 dark:border dark:border-gray-700 border border-gray-200 rounded-lg max-h-40 overflow-y-auto">
              <p className="text-xs font-medium dark:text-gray-300 text-gray-700 mb-2 flex items-center gap-1">
                <ClipboardDocumentListIcon className="h-4 w-4 dark:text-blue-400 text-blue-600" />
                Items to Count ({pendingSkus.length} remaining):
              </p>
              <div className="space-y-1">
                {pendingSkus.slice(0, 10).map((entry: any) => (
                  <div
                    key={entry.sku}
                    className="flex justify-between items-center text-xs dark:text-gray-400 text-gray-600 dark:hover:bg-gray-700 hover:bg-gray-100 p-1 rounded cursor-pointer"
                    onClick={() => {
                      if (!plan.sku) {
                        setFieldValue('sku', entry.sku);
                        setSkuSearch('');
                        updateSkuBinLocations(entry.sku);
                      }
                    }}
                  >
                    <span className="dark:text-gray-300 text-gray-700">{entry.sku}</span>
                    <span className="dark:text-gray-500 text-gray-500">
                      {entry.binLocation} • System: {entry.systemQuantity}
                    </span>
                  </div>
                ))}
                {pendingSkus.length > 10 && (
                  <p className="text-xs dark:text-gray-500 text-gray-500 text-center pt-1">
                    ... and {pendingSkus.length - 10} more
                  </p>
                )}
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium dark:text-gray-300 text-gray-700 mb-1">
              Counted Quantity
            </label>
            <input
              type="number"
              name="countedQuantity"
              required
              min="0"
              value={formData.countedQuantity}
              onChange={handleChange}
              onBlur={() => handleBlur('countedQuantity')}
              className={`w-full px-3 py-2 dark:bg-gray-800 bg-gray-50 border rounded-lg dark:text-white text-gray-900 ${
                errors.countedQuantity ? 'border-red-500' : 'dark:border-gray-600 border-gray-300'
              }`}
              placeholder="Enter counted quantity"
            />
            {errors.countedQuantity && (
              <p className="mt-1 text-sm text-red-400">{errors.countedQuantity}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium dark:text-gray-300 text-gray-700 mb-1">
              Notes
            </label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              className="w-full px-3 py-2 dark:bg-gray-800 bg-gray-50 border dark:border-gray-600 border-gray-300 rounded-lg dark:text-white text-gray-900 resize-none"
              placeholder="Optional notes"
              rows={2}
            />
          </div>

          {errorMessage && (
            <div className="p-3 rounded-lg dark:bg-danger-500/10 dark:border dark:border-danger-500/30 bg-red-50 border border-red-200">
              <p className="text-sm dark:text-danger-400 text-red-700">{errorMessage}</p>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              className="flex-1"
              disabled={isSubmitting || createEntryMutation.isPending}
            >
              {isSubmitting || createEntryMutation.isPending ? 'Adding...' : 'Add Entry'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Variance Approval Modal
function VarianceApprovalModal({
  entry,
  onClose,
  onSuccess,
}: {
  entry: any;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const updateMutation = useUpdateVarianceStatus();
  const [notes, setNotes] = useState('');
  const [reasonCode, setReasonCode] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const handleApprove = async () => {
    setErrorMessage('');
    try {
      await updateMutation.mutateAsync({
        entryId: entry.entryId,
        status: 'APPROVED',
        notes: notes || undefined,
      });
      onSuccess();
      onClose();
    } catch (error: any) {
      setErrorMessage(error?.message || 'Failed to approve variance');
    }
  };

  const handleReject = async () => {
    setErrorMessage('');
    try {
      await updateMutation.mutateAsync({
        entryId: entry.entryId,
        status: 'REJECTED',
        notes: notes || undefined,
      });
      onSuccess();
      onClose();
    } catch (error: any) {
      setErrorMessage(error?.message || 'Failed to reject variance');
    }
  };

  // Get variance severity
  const getVarianceSeverity = (variancePercent: number) => {
    const percent = Math.abs(variancePercent || 0);
    if (percent > 10) return { level: 'critical', color: 'text-red-600', label: 'Critical' };
    if (percent > 5) return { level: 'high', color: 'text-orange-500', label: 'High' };
    if (percent > 2) return { level: 'medium', color: 'text-yellow-500', label: 'Medium' };
    return { level: 'low', color: 'text-green-500', label: 'Low' };
  };

  const severity = getVarianceSeverity(entry.variancePercent || 0);

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="dark:bg-gray-900 bg-white rounded-xl shadow-2xl max-w-md w-full">
        <div className="px-6 py-4 border-b dark:border-gray-700 border-gray-200 flex justify-between items-center">
          <h3 className="text-lg font-semibold dark:text-white text-gray-900">Review Variance</h3>
          <div className="flex items-center gap-2">
            <span
              className={`text-xs font-medium px-2 py-1 rounded ${severity.color} bg-opacity-10 dark:bg-opacity-20`}
            >
              {severity.label} Severity
            </span>
            <button
              onClick={onClose}
              className="dark:text-gray-400 text-gray-600 dark:hover:text-white hover:text-gray-900"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>
        </div>
        <div className="p-6">
          {/* Variance Details */}
          <div className="mb-6 p-4 dark:bg-gray-800 bg-gray-50 rounded-lg">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="dark:text-gray-400 text-gray-500">SKU:</span>
                <span className="ml-2 dark:text-white text-gray-900 font-medium">{entry.sku}</span>
              </div>
              <div>
                <span className="dark:text-gray-400 text-gray-500">Location:</span>
                <span className="ml-2 dark:text-white text-gray-900 font-medium">
                  {entry.binLocation}
                </span>
              </div>
              <div>
                <span className="dark:text-gray-400 text-gray-500">System Qty:</span>
                <span className="ml-2 dark:text-white text-gray-900 font-medium">
                  {entry.systemQuantity}
                </span>
              </div>
              <div>
                <span className="dark:text-gray-400 text-gray-500">Counted Qty:</span>
                <span className="ml-2 dark:text-white text-gray-900 font-medium">
                  {entry.countedQuantity}
                </span>
              </div>
              <div className="col-span-2">
                <span className="dark:text-gray-400 text-gray-500">Variance:</span>
                <span
                  className={`ml-2 font-bold ${entry.variance > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}
                >
                  {entry.variance > 0 ? '+' : ''}
                  {entry.variance}
                  {entry.variancePercent ? ` (${entry.variancePercent.toFixed(1)}%)` : ''}
                </span>
              </div>
            </div>
          </div>

          {/* What Happens Info Box */}
          <div className="mb-6 p-3 dark:bg-blue-500/10 dark:border dark:border-blue-500/30 bg-blue-50 dark:border-blue-200 border rounded-lg">
            <div className="flex items-start gap-2">
              <InformationCircleIcon className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
              <div className="text-xs dark:text-gray-300 text-gray-700">
                <p className="font-medium mb-1">What happens:</p>
                <ul className="list-disc list-inside space-y-1 dark:text-gray-400 text-gray-600">
                  <li>
                    <strong className="text-green-500">Approve:</strong> Inventory will be adjusted
                    to counted quantity. Transaction created automatically.
                  </li>
                  <li>
                    <strong className="text-red-500">Reject:</strong> Counted quantity is NOT
                    applied. System quantity stays unchanged. Please re-count this item.
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Reason Code */}
          <div className="mb-4">
            <label className="block text-sm font-medium dark:text-gray-300 text-gray-700 mb-2">
              Reason Code *
            </label>
            <Select
              required
              value={reasonCode}
              onChange={e => setReasonCode(e.target.value)}
              options={[
                { value: '', label: 'Select reason...' },
                { value: 'DATA_ENTRY_ERROR', label: 'Data Entry Error - Typo or input mistake' },
                { value: 'DAMAGE', label: 'Damage - Product damaged during handling' },
                { value: 'THEFT', label: 'Theft - Missing items (investigate)' },
                { value: 'RECEIVING_ERROR', label: 'Receiving Error - Wrong qty received' },
                { value: 'SYSTEM_ERROR', label: 'System Error - Inventory discrepancy' },
                { value: 'CYCLE_COUNT_SLIP', label: 'Cycle Count Slip - Missed during count' },
                { value: 'UNKNOWN', label: 'Unknown - Cause undetermined' },
              ]}
            />
          </div>

          {/* Notes Input */}
          <div className="mb-4">
            <label className="block text-sm font-medium dark:text-gray-300 text-gray-700 mb-2">
              Additional Notes {reasonCode === 'UNKNOWN' ? '(required for unknown)' : '(optional)'}
            </label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Provide additional context about this variance..."
              className="w-full px-3 py-2 dark:bg-gray-800 bg-gray-50 border dark:border-gray-600 border-gray-300 rounded-lg dark:text-white text-gray-900 resize-none"
              rows={3}
            />
          </div>

          {errorMessage && (
            <div className="mb-4 p-3 rounded-lg dark:bg-red-500/10 bg-red-50 dark:border dark:border-red-500/30 border border-red-200">
              <p className="text-sm dark:text-red-400 text-red-700">{errorMessage}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={handleApprove}
              disabled={updateMutation.isPending}
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <CheckIcon className="h-4 w-4" />
              {updateMutation.isPending ? 'Approving...' : 'Approve'}
            </button>
            <button
              onClick={handleReject}
              disabled={updateMutation.isPending}
              className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <XMarkIcon className="h-4 w-4" />
              {updateMutation.isPending ? 'Rejecting...' : 'Reject'}
            </button>
          </div>

          <button
            onClick={onClose}
            className="w-full mt-3 px-4 py-2 dark:bg-gray-800 bg-gray-100 dark:text-gray-300 text-gray-700 rounded-lg hover:dark:bg-gray-700 hover:bg-gray-200"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// Helper to get count type description
function getCountTypeDescription(countType: string, location?: string): string {
  switch (countType) {
    case CycleCountType.BLANKET:
      return `Starting BLANKET count will auto-generate count entries for ALL SKUs in location ${location || 'the specified location'}. You will then enter the actual counted quantity for each entry.`;
    case CycleCountType.ABC:
      return 'Starting ABC count will auto-generate count entries for high-value (Category A) items based on tolerance rules.';
    case CycleCountType.SPOT_CHECK:
      return 'Starting SPOT CHECK will randomly sample items (15% or minimum 5 items) to verify inventory accuracy.';
    case CycleCountType.RECEIVING:
      return 'Starting RECEIVING count will generate entries for items from recent receipts (last 7 days) to verify incoming inventory.';
    case CycleCountType.SHIPPING:
      return 'Starting SHIPPING count will generate entries for items in orders ready to ship (PICKING/PICKED/PACKED) to verify before dispatch.';
    case CycleCountType.AD_HOC:
    default:
      return 'Starting this count allows you to manually add count entries for specific SKUs and locations.';
  }
}

// Helper to get auto-generation info
function getAutoGenerationInfo(countType: string): {
  willAutoGenerate: boolean;
  description: string;
} {
  switch (countType) {
    case CycleCountType.BLANKET:
      return {
        willAutoGenerate: true,
        description: 'Entries will be auto-generated for all SKUs in the location',
      };
    case CycleCountType.ABC:
      return {
        willAutoGenerate: true,
        description: 'Entries will be auto-generated for Category A (high-value) items',
      };
    case CycleCountType.SPOT_CHECK:
      return {
        willAutoGenerate: true,
        description: 'Entries will be auto-generated from random sample',
      };
    case CycleCountType.RECEIVING:
      return {
        willAutoGenerate: true,
        description: 'Entries will be auto-generated for recent receipts',
      };
    case CycleCountType.SHIPPING:
      return {
        willAutoGenerate: true,
        description: 'Entries will be auto-generated for items in orders to ship',
      };
    case CycleCountType.AD_HOC:
    default:
      return {
        willAutoGenerate: false,
        description: 'Add entries manually after starting',
      };
  }
}

export default function CycleCountDetailPage() {
  const { showToast } = useToast();
  const { planId } = useParams<{ planId: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [showEntryModal, setShowEntryModal] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<any>(null);
  const [showOnlyVariances, setShowOnlyVariances] = useState(false);
  const [showStartConfirm, setShowStartConfirm] = useState(false);
  const [prefillSku, setPrefillSku] = useState('');
  const [prefillLocation, setPrefillLocation] = useState('');
  const [showBulkApproveModal, setShowBulkApproveModal] = useState(false);
  const [showReconcileSummary, setShowReconcileSummary] = useState(false);
  const [showAuditLog, setShowAuditLog] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [quickCountMode, setQuickCountMode] = useState(false);
  const [showPrintSheet, setShowPrintSheet] = useState(false);

  const { data: plan, isLoading, error, refetch } = useCycleCountPlan(planId!);
  const { data: assignableUsers = [] } = useAssignableUsers();
  const { data: collisions } = useCheckCollisions(planId!);
  const { data: reconcileSummaryData } = useReconcileSummary(planId!);
  const { data: auditLogData } = useCycleCountAuditLog(planId!);
  const startMutation = useStartCycleCount();
  const completeMutation = useCompleteCycleCount();
  const reconcileMutation = useReconcileCycleCount();
  const bulkUpdateMutation = useBulkUpdateVarianceStatus();
  const cancelMutation = useCancelCycleCount();
  const exportMutation = useExportCycleCount();

  // Check if user can reconcile cycle counts
  const canReconcile =
    user?.role === UserRole.STOCK_CONTROLLER ||
    user?.role === UserRole.SUPERVISOR ||
    user?.role === UserRole.ADMIN;

  // Check if user can perform cycle counts (add entries)
  const canPerformCounts =
    user?.role === UserRole.PICKER ||
    user?.role === UserRole.STOCK_CONTROLLER ||
    user?.role === UserRole.SUPERVISOR ||
    user?.role === UserRole.ADMIN;

  // Check if user can approve variances
  const canApproveVariance =
    user?.role === UserRole.STOCK_CONTROLLER ||
    user?.role === UserRole.SUPERVISOR ||
    user?.role === UserRole.ADMIN;

  // Helper to get user name from userId
  const getUserName = (userId: string) => {
    const foundUser = assignableUsers.find((u: any) => u.userId === userId);
    return foundUser?.name || userId;
  };

  // Get severity for variance display
  const getVarianceSeverity = (variancePercent: number) => {
    const percent = Math.abs(variancePercent || 0);
    if (percent > 10)
      return {
        level: 'critical',
        color: 'text-red-600 dark:text-red-400',
        bg: 'bg-red-100 dark:bg-red-500/20',
      };
    if (percent > 5)
      return { level: 'high', color: 'text-orange-500', bg: 'bg-orange-100 dark:bg-orange-500/20' };
    if (percent > 2)
      return {
        level: 'medium',
        color: 'text-yellow-500',
        bg: 'bg-yellow-100 dark:bg-yellow-500/20',
      };
    return { level: 'low', color: 'text-green-500', bg: 'bg-green-100 dark:bg-green-500/20' };
  };

  // Get pending entries (items not yet counted)
  const getPendingEntries = () => {
    return plan?.countEntries?.filter((e: any) => e.countedQuantity === 0) || [];
  };

  const handleQuickCount = (entry: any) => {
    setPrefillSku(entry.sku);
    setPrefillLocation(entry.binLocation);
    setShowEntryModal(true);
  };

  const handleStart = async () => {
    // Check if this count type auto-generates entries
    const autoGenInfo = getAutoGenerationInfo(plan?.countType || '');

    if (autoGenInfo.willAutoGenerate && !showStartConfirm) {
      // Show confirmation first
      setShowStartConfirm(true);
      return;
    }

    try {
      await startMutation.mutateAsync(planId!);
      setShowStartConfirm(false);
      refetch();

      // Show success message based on count type
      const entryCount = plan?.countEntries?.length || 0;
      if (autoGenInfo.willAutoGenerate && entryCount > 0) {
        // Entries were pre-created, show info
        showToast(
          `${entryCount} count entries have been auto-generated. Please verify the physical quantities and update as needed.`,
          'info'
        );
      }
    } catch (error) {
      console.error('Failed to start cycle count:', error);
      setShowStartConfirm(false);
    }
  };

  const handleComplete = async () => {
    // Check if there are any count entries
    const entryCount = plan?.countEntries?.length || 0;
    if (entryCount === 0) {
      showToast(
        'Cannot complete a cycle count without any count entries. Please add at least one count entry before completing.',
        'error'
      );
      return;
    }

    try {
      await completeMutation.mutateAsync(planId!);
      refetch();
    } catch (error) {
      console.error('Failed to complete cycle count:', error);
    }
  };

  const handleReconcile = async () => {
    try {
      await reconcileMutation.mutateAsync({
        planId: planId!,
        notes: 'Bulk reconcile all variances',
      });
      refetch();
    } catch (error) {
      console.error('Failed to reconcile cycle count:', error);
    }
  };

  const handleBulkApprove = async (autoApproveZeroVariance = false) => {
    try {
      const result = await bulkUpdateMutation.mutateAsync({
        planId: planId!,
        status: 'APPROVED',
        autoApproveZeroVariance,
        notes: 'Bulk approved',
      });
      showToast(
        `Approved ${result.updated} variances. ${result.skipped > 0 ? `(${result.skipped} zero-variance entries skipped)` : ''}`,
        'success'
      );
      refetch();
      setShowBulkApproveModal(false);
    } catch (error: any) {
      showToast(`Failed to bulk approve: ${error.message}`, 'error');
    }
  };

  const handleBulkReject = async () => {
    try {
      const result = await bulkUpdateMutation.mutateAsync({
        planId: planId!,
        status: 'REJECTED',
        notes: 'Bulk rejected - please re-count these items',
      });
      showToast(`Rejected ${result.updated} variances. Please re-count these items.`, 'success');
      refetch();
      setShowBulkApproveModal(false);
    } catch (error: any) {
      showToast(`Failed to bulk reject: ${error.message}`, 'error');
    }
  };

  const handleCancel = async () => {
    try {
      await cancelMutation.mutateAsync({
        planId: planId!,
        reason: 'Cancelled by user',
      });
      setShowCancelConfirm(false);
      refetch();
    } catch (error: any) {
      showToast(`Failed to cancel: ${error.message}`, 'error');
    }
  };

  const handleExport = () => {
    exportMutation.mutate(planId!);
  };

  const pendingVarianceCount =
    plan?.countEntries?.filter(
      (e: any) => e.varianceStatus === VarianceStatus.PENDING && e.variance !== 0
    ).length || 0;

  const totalEntries = plan?.countEntries?.length || 0;
  const completedEntries =
    plan?.countEntries?.filter((e: any) => e.varianceStatus !== VarianceStatus.PENDING).length || 0;
  const progressPercent =
    totalEntries > 0 ? Math.round((completedEntries / totalEntries) * 100) : 0;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-gray-400">Loading cycle count details...</div>
      </div>
    );
  }

  if (error || !plan) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <Card className="max-w-md bg-gray-800 border border-gray-700">
          <CardContent className="p-6 text-center">
            <ExclamationTriangleIcon className="h-12 w-12 text-warning-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">Plan Not Found</h2>
            <p className="text-gray-400 mb-4">The cycle count plan could not be loaded.</p>
            <Button onClick={() => navigate('/cycle-counting')}>Back to Cycle Counts</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back button */}
        <button
          onClick={() => navigate('/cycle-counting')}
          className="flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors"
        >
          <ArrowLeftIcon className="h-5 w-5" />
          Back to Cycle Counts
        </button>

        {/* Header */}
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-3xl font-bold text-white">{plan.planName}</h1>
            <div className="flex items-center gap-3 mt-2">
              <StatusBadge status={plan.status} />
              <span className="text-sm text-gray-400">
                Scheduled: {new Date(plan.scheduledDate).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>

        {/* Progress Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <Card variant="glass" className="text-center">
            <CardContent className="p-6">
              <p className="text-3xl font-bold text-white">{totalEntries}</p>
              <p className="text-sm text-gray-400 mt-1">Total Entries</p>
            </CardContent>
          </Card>
          <Card variant="glass" className="text-center">
            <CardContent className="p-6">
              <p className="text-3xl font-bold text-success-400">{completedEntries}</p>
              <p className="text-sm text-gray-400 mt-1">Completed</p>
            </CardContent>
          </Card>
          <Card variant="glass" className="text-center">
            <CardContent className="p-6">
              <p className="text-3xl font-bold text-white">{progressPercent}%</p>
              <p className="text-sm text-gray-400 mt-1">Progress</p>
            </CardContent>
          </Card>
        </div>

        {/* Progress Bar */}
        {totalEntries > 0 && (
          <div className="mb-6">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-400">Completion Progress</span>
              <span className="text-gray-300">
                {completedEntries} of {totalEntries}
              </span>
            </div>
            <div className="h-3 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-primary-500 to-primary-400 transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}

        {/* Plan Details */}
        <Card variant="glass" className="mb-6">
          <CardHeader>
            <CardTitle>Plan Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-400 mb-1">Type</p>
                <p className="font-medium text-white">{plan.countType}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400 mb-1">Assigned To</p>
                <p className="font-medium text-white">{getUserName(plan.countBy)}</p>
              </div>
              {plan.location && (
                <div>
                  <p className="text-sm text-gray-400 mb-1">Location</p>
                  <p className="font-medium text-white">{plan.location}</p>
                </div>
              )}
              {plan.sku && (
                <div>
                  <p className="text-sm text-gray-400 mb-1">Planned SKU(s)</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {plan.sku.split(',').map((s: string, i: number) => {
                      const trimmedSku = s.trim();
                      return trimmedSku ? (
                        <span
                          key={i}
                          className="inline-flex px-2 py-0.5 bg-blue-500/20 border border-blue-500/30 rounded text-sm text-blue-400"
                        >
                          {trimmedSku}
                        </span>
                      ) : null;
                    })}
                  </div>
                </div>
              )}
              {plan.createdAt && (
                <div>
                  <p className="text-sm text-gray-400 mb-1">Created</p>
                  <p className="font-medium text-white">
                    {new Date(plan.createdAt).toLocaleDateString()}
                  </p>
                </div>
              )}
              {plan.completedAt && (
                <div>
                  <p className="text-sm text-gray-400 mb-1">Completed</p>
                  <p className="font-medium text-white">
                    {new Date(plan.completedAt).toLocaleDateString()}
                  </p>
                </div>
              )}
            </div>

            {/* Items to Count Summary */}
            {plan.countEntries && plan.countEntries.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-700">
                <p className="text-sm text-gray-400 mb-2">Counting Progress</p>
                <div className="grid grid-cols-3 gap-3">
                  <div className="text-center p-2 bg-gray-800/50 rounded-lg">
                    <p className="text-lg font-bold text-white">{plan.countEntries.length}</p>
                    <p className="text-xs text-gray-400">Total Items</p>
                  </div>
                  <div className="text-center p-2 bg-green-500/10 border border-green-500/30 rounded-lg">
                    <p className="text-lg font-bold text-green-400">{completedEntries}</p>
                    <p className="text-xs text-gray-400">Counted</p>
                  </div>
                  <div className="text-center p-2 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                    <p className="text-lg font-bold text-yellow-400">
                      {plan.countEntries.length - completedEntries}
                    </p>
                    <p className="text-xs text-gray-400">Remaining</p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Actions */}
        <Card variant="glass" className="mb-6">
          <CardHeader>
            <CardTitle>Actions</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Collision Warning */}
            {collisions?.hasCollisions && (
              <div className="mb-4 p-3 bg-orange-500/10 border border-orange-500/30 rounded-lg">
                <div className="flex items-center gap-2 text-orange-400">
                  <ExclamationTriangleIcon className="h-5 w-5" />
                  <span className="font-medium">Collision Warning</span>
                </div>
                <p className="text-sm text-gray-400 mt-1">
                  Other active counts in this location:
                  {collisions.collidingCounts.map((c: any) => (
                    <span key={c.planId} className="ml-2 text-orange-300">
                      "{c.planName}" ({c.status})
                    </span>
                  ))}
                </p>
              </div>
            )}

            <div className="flex flex-wrap gap-3">
              {plan.status === CycleCountStatus.SCHEDULED && (
                <>
                  <Button
                    onClick={handleStart}
                    disabled={startMutation.isPending || collisions?.hasCollisions}
                    className="flex items-center gap-2"
                  >
                    <PlayIcon className="h-4 w-4" />
                    {startMutation.isPending ? 'Starting...' : 'Start Count'}
                  </Button>
                  {canReconcile && (
                    <Button
                      onClick={() => setShowCancelConfirm(true)}
                      className="flex items-center gap-2 bg-red-600 hover:bg-red-700"
                    >
                      <NoSymbolIcon className="h-4 w-4" />
                      Cancel Count
                    </Button>
                  )}
                </>
              )}
              {plan.status === CycleCountStatus.IN_PROGRESS && (
                <>
                  {canPerformCounts && (
                    <Button
                      onClick={() => setShowEntryModal(true)}
                      className="flex items-center gap-2"
                    >
                      <PlusIcon className="h-4 w-4" />
                      Add Entry
                    </Button>
                  )}
                  <Button
                    onClick={handleComplete}
                    disabled={
                      completeMutation.isPending ||
                      !plan.countEntries ||
                      plan.countEntries.length === 0
                    }
                    className="flex items-center gap-2"
                    title={
                      !plan.countEntries || plan.countEntries.length === 0
                        ? 'Add at least one count entry before completing'
                        : undefined
                    }
                  >
                    <CheckIcon className="h-4 w-4" />
                    {completeMutation.isPending ? 'Completing...' : 'Complete Count'}
                  </Button>
                  {canReconcile && (
                    <Button
                      onClick={() => setShowCancelConfirm(true)}
                      className="flex items-center gap-2 bg-red-600 hover:bg-red-700"
                    >
                      <NoSymbolIcon className="h-4 w-4" />
                      Cancel
                    </Button>
                  )}
                </>
              )}
              {plan.status === CycleCountStatus.COMPLETED && (
                <>
                  {pendingVarianceCount > 0 && canApproveVariance && (
                    <>
                      <Button
                        onClick={() => setShowBulkApproveModal(true)}
                        className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
                      >
                        <CheckIcon className="h-4 w-4" />
                        Bulk Approve All
                      </Button>
                      <Button
                        onClick={() => setShowBulkApproveModal(true)}
                        className="flex items-center gap-2 bg-red-600 hover:bg-red-700"
                      >
                        <XMarkIcon className="h-4 w-4" />
                        Bulk Reject All
                      </Button>
                    </>
                  )}
                  {pendingVarianceCount === 0 && canReconcile && (
                    <Button
                      onClick={() => setShowReconcileSummary(true)}
                      disabled={reconcileMutation.isPending}
                      className="flex items-center gap-2"
                    >
                      <ChartBarIcon className="h-4 w-4" />
                      Review & Reconcile
                    </Button>
                  )}
                  <Button
                    onClick={handleExport}
                    disabled={exportMutation.isPending}
                    className="flex items-center gap-2"
                  >
                    <DocumentIcon className="h-4 w-4" />
                    Export CSV
                  </Button>
                  {/* New: Quick Count Mode Button */}
                  {plan.status === CycleCountStatus.IN_PROGRESS &&
                    getPendingEntries().length > 0 && (
                      <Button
                        onClick={() => setQuickCountMode(true)}
                        className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700"
                      >
                        <QrCodeIcon className="h-4 w-4" />
                        Quick Count Mode
                      </Button>
                    )}
                  {/* New: Print Count Sheet Button */}
                  <Button
                    onClick={() => setShowPrintSheet(true)}
                    className="flex items-center gap-2"
                    variant="secondary"
                  >
                    <DocumentIcon className="h-4 w-4" />
                    Print Sheet
                  </Button>
                </>
              )}
              {(plan.status === CycleCountStatus.COMPLETED ||
                plan.status === CycleCountStatus.RECONCILED) &&
                canReconcile && (
                  <Button
                    onClick={() => setShowAuditLog(true)}
                    className="flex items-center gap-2"
                    variant="secondary"
                  >
                    <ClockIcon className="h-4 w-4" />
                    View Audit Log
                  </Button>
                )}
              {pendingVarianceCount > 0 && (
                <div className="flex items-center gap-2 px-4 py-2 dark:bg-warning-500/20 dark:text-warning-400 bg-yellow-100 text-yellow-800 rounded-xl">
                  <ExclamationTriangleIcon className="h-4 w-4" />
                  {pendingVarianceCount} variance(s) pending review
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Pending Items to Count */}
        {plan.status === CycleCountStatus.IN_PROGRESS && getPendingEntries().length > 0 && (
          <Card variant="glass" className="mb-6 border-l-4 border-l-yellow-500">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500" />
                Pending Items to Count ({getPendingEntries().length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-400 mb-3">
                These items from your plan still need to be counted. Click "Quick Count" to add an
                entry.
              </p>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {getPendingEntries()
                  .slice(0, 20)
                  .map((entry: any) => (
                    <div
                      key={entry.entryId}
                      className="flex items-center justify-between p-3 bg-gray-800/50 dark:bg-gray-800 rounded-lg dark:hover:bg-gray-700 hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <span className="font-medium dark:text-white text-gray-900">
                            {entry.sku}
                          </span>
                          <span className="text-sm dark:text-gray-400 text-gray-600">
                            {entry.binLocation}
                          </span>
                          <span className="text-sm dark:text-gray-500 text-gray-500">
                            System: {entry.systemQuantity}
                          </span>
                        </div>
                      </div>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleQuickCount(entry)}
                        className="ml-3"
                      >
                        Quick Count
                      </Button>
                    </div>
                  ))}
                {getPendingEntries().length > 20 && (
                  <p className="text-center text-sm text-gray-500 pt-2">
                    ... and {getPendingEntries().length - 20} more items
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Count Entries */}
        {plan.countEntries && plan.countEntries.length > 0 && (
          <Card variant="glass" className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ClipboardDocumentListIcon className="h-5 w-5 dark:text-primary-400 text-primary-600" />
                  Count Entries
                  <span className="text-sm dark:text-gray-400 text-gray-500">
                    ({plan.countEntries.length} total)
                  </span>
                </div>
                <button
                  onClick={() => setShowOnlyVariances(!showOnlyVariances)}
                  className={`text-sm px-3 py-1.5 rounded-lg transition-colors ${
                    showOnlyVariances
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'dark:bg-gray-700 bg-gray-200 dark:text-gray-200 text-gray-700 dark:hover:bg-gray-600 hover:bg-gray-300'
                  }`}
                >
                  {showOnlyVariances
                    ? 'Show All'
                    : `Show Only Variances (${plan.countEntries.filter((e: any) => e.variance !== 0).length})`}
                </button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto rounded-xl dark:border dark:border-white/10 border border-gray-200">
                <table className="min-w-full dark:divide-y dark:divide-white/10 divide-y divide-gray-200">
                  <thead className="dark:bg-white/5 bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium dark:text-gray-400 text-gray-500 uppercase tracking-wider">
                        SKU
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium dark:text-gray-400 text-gray-500 uppercase tracking-wider">
                        Location
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium dark:text-gray-400 text-gray-500 uppercase tracking-wider">
                        System Qty
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium dark:text-gray-400 text-gray-500 uppercase tracking-wider">
                        Counted Qty
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium dark:text-gray-400 text-gray-500 uppercase tracking-wider">
                        Variance
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium dark:text-gray-400 text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium dark:text-gray-400 text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="dark:bg-gray-900/50 bg-white dark:divide-y dark:divide-white/10 divide-y divide-gray-200">
                    {plan.countEntries
                      .filter((entry: any) => !showOnlyVariances || entry.variance !== 0)
                      .sort((a: any, b: any) => Math.abs(b.variance) - Math.abs(a.variance))
                      .map((entry: any) => {
                        const severity = getVarianceSeverity(entry.variancePercent || 0);

                        return (
                          <tr
                            key={entry.entryId}
                            className="dark:hover:bg-white/5 hover:bg-gray-50 transition-colors"
                          >
                            <td className="px-4 py-3 text-sm font-medium dark:text-white text-gray-900">
                              {entry.sku}
                            </td>
                            <td className="px-4 py-3 text-sm dark:text-gray-300 text-gray-700">
                              {entry.binLocation}
                            </td>
                            <td className="px-4 py-3 text-sm text-right dark:text-gray-300 text-gray-700">
                              {entry.systemQuantity}
                            </td>
                            <td className="px-4 py-3 text-sm text-right dark:text-gray-300 text-gray-700">
                              {entry.countedQuantity}
                            </td>
                            <td
                              className={`px-4 py-3 text-sm text-right font-medium dark:text-white text-gray-900 ${
                                entry.variance !== 0
                                  ? entry.variance > 0
                                    ? 'text-green-600 dark:text-green-400'
                                    : 'text-red-600 dark:text-red-400'
                                  : ''
                              }`}
                            >
                              {entry.variance > 0 ? '+' : ''}
                              {entry.variance}
                              {entry.variancePercent && (
                                <span className="ml-1 text-xs opacity-70">
                                  ({entry.variancePercent.toFixed(1)}%)
                                </span>
                              )}
                              {entry.variance !== 0 && (
                                <span
                                  className={`ml-2 text-xs px-2 py-0.5 rounded ${severity.bg} ${severity.color}`}
                                >
                                  {severity.level}
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm text-center">
                              <VarianceStatusBadge status={entry.varianceStatus} />
                            </td>
                            <td className="px-4 py-3 text-sm text-right">
                              {entry.varianceStatus === VarianceStatus.PENDING &&
                                entry.variance !== 0 &&
                                canApproveVariance && (
                                  <button
                                    onClick={() => setSelectedEntry(entry)}
                                    className="text-blue-400 hover:text-blue-300 text-xs font-medium"
                                  >
                                    Review
                                  </button>
                                )}
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Notes */}
        {plan.notes && (
          <Card variant="glass">
            <CardHeader>
              <CardTitle>Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm dark:text-gray-400 text-gray-600 dark:bg-white/5 bg-gray-50 rounded-xl p-4">
                {plan.notes}
              </p>
            </CardContent>
          </Card>
        )}
      </main>

      {/* Start Count Confirmation Modal */}
      {showStartConfirm && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="dark:bg-gray-900 bg-white rounded-xl shadow-2xl max-w-md w-full">
            <div className="px-6 py-4 border-b dark:border-gray-700 border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-semibold dark:text-white text-gray-900">
                Start {plan?.countType} Count
              </h3>
              <button
                onClick={() => setShowStartConfirm(false)}
                className="dark:text-gray-400 text-gray-600 dark:hover:text-white hover:text-gray-900"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            <div className="p-6">
              <div className="mb-6 p-4 dark:bg-blue-500/10 bg-blue-50 dark:border dark:border-blue-500/30 border border-blue-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <InformationCircleIcon className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm dark:text-gray-300 text-gray-700 font-medium mb-1">
                      {getAutoGenerationInfo(plan?.countType || '').description}
                    </p>
                    <p className="text-xs dark:text-gray-400 text-gray-500 mt-2">
                      {getCountTypeDescription(plan?.countType || '', plan?.location, plan?.sku)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowStartConfirm(false)}
                  className="flex-1 px-4 py-2 dark:bg-gray-800 bg-gray-100 dark:text-gray-300 text-gray-700 rounded-lg hover:dark:bg-gray-700 hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleStart}
                  disabled={startMutation.isPending}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <PlayIcon className="h-4 w-4" />
                  {startMutation.isPending ? 'Starting...' : 'Start Count'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showEntryModal && (
        <CountEntryModal
          plan={plan}
          prefillSku={prefillSku}
          prefillLocation={prefillLocation}
          onClose={() => {
            setShowEntryModal(false);
            setPrefillSku('');
            setPrefillLocation('');
            refetch();
          }}
          onSuccess={() => {
            setShowEntryModal(false);
            setPrefillSku('');
            setPrefillLocation('');
            refetch();
          }}
        />
      )}
      {selectedEntry && (
        <VarianceApprovalModal
          entry={selectedEntry}
          onClose={() => setSelectedEntry(null)}
          onSuccess={() => {
            setSelectedEntry(null);
            refetch();
          }}
        />
      )}

      {/* Bulk Approve/Reject Modal */}
      {showBulkApproveModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="dark:bg-gray-900 bg-white rounded-xl shadow-2xl max-w-lg w-full">
            <div className="px-6 py-4 border-b dark:border-gray-700 border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-semibold dark:text-white text-gray-900">
                Bulk Update Variances ({pendingVarianceCount} pending)
              </h3>
              <button
                onClick={() => setShowBulkApproveModal(false)}
                className="dark:text-gray-400 text-gray-600 dark:hover:text-white hover:text-gray-900"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            <div className="p-6">
              <p className="text-sm dark:text-gray-300 text-gray-700 mb-4">
                This will {canApproveVariance ? 'approve' : 'reject'} all {pendingVarianceCount}{' '}
                pending variances.
                {canApproveVariance &&
                  ' Approved variances will immediately adjust inventory levels.'}
              </p>

              <div className="mb-4 p-4 dark:bg-gray-800 bg-gray-50 rounded-lg">
                <h4 className="font-medium dark:text-white text-gray-900 mb-2">Summary:</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="dark:text-gray-400 text-gray-600">Pending Variances:</span>
                    <span className="ml-2 dark:text-white text-gray-900 font-medium">
                      {pendingVarianceCount}
                    </span>
                  </div>
                  {canApproveVariance && reconcileSummaryData && (
                    <>
                      <div>
                        <span className="dark:text-gray-400 text-gray-600">Total Adjustment:</span>
                        <span className="ml-2 dark:text-white text-gray-900 font-medium">
                          {reconcileSummaryData.totalAdjustmentValue} units
                        </span>
                      </div>
                      <div className="col-span-2">
                        <span className="dark:text-gray-400 text-gray-600">SKUs Affected:</span>
                        <span className="ml-2 dark:text-white text-gray-900 font-medium">
                          {reconcileSummaryData.skusToAdjust.map((s: any) => s.sku).join(', ')}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {canApproveVariance && (
                <div className="mb-4">
                  <label className="flex items-center gap-2 text-sm dark:text-gray-300 text-gray-700">
                    <input type="checkbox" id="autoZeroVariance" className="rounded" />
                    <span>
                      Also auto-approve entries with zero variance (
                      {reconcileSummaryData?.zeroVarianceEntries || 0} entries)
                    </span>
                  </label>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => setShowBulkApproveModal(false)}
                  className="flex-1 px-4 py-2 dark:bg-gray-800 bg-gray-100 dark:text-gray-300 text-gray-700 rounded-lg hover:dark:bg-gray-700 hover:bg-gray-200"
                >
                  Cancel
                </button>
                {canApproveVariance && (
                  <>
                    <button
                      onClick={() => handleBulkReject()}
                      disabled={bulkUpdateMutation.isPending}
                      className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                    >
                      {bulkUpdateMutation.isPending ? 'Rejecting...' : 'Reject All'}
                    </button>
                    <button
                      onClick={() => handleBulkApprove(true)}
                      disabled={bulkUpdateMutation.isPending}
                      className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                    >
                      {bulkUpdateMutation.isPending ? 'Approving...' : 'Approve All'}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reconcile Summary Modal */}
      {showReconcileSummary && canApproveVariance && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="dark:bg-gray-900 bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="px-6 py-4 border-b dark:border-gray-700 border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-semibold dark:text-white text-gray-900">
                Review & Reconcile Summary
              </h3>
              <button
                onClick={() => setShowReconcileSummary(false)}
                className="dark:text-gray-400 text-gray-600 dark:hover:text-white hover:text-gray-900"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            <div className="p-6">
              {reconcileSummaryData && reconcileSummaryData.pendingVarianceCount > 0 ? (
                <>
                  <div className="mb-6 p-4 dark:bg-yellow-500/10 dark:border dark:border-yellow-500/30 bg-yellow-50 dark:border-yellow-200 border rounded-lg">
                    <div className="flex items-start gap-3">
                      <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm dark:text-gray-300 text-gray-700 font-medium">
                          You have {reconcileSummaryData.pendingVarianceCount} pending variance(s)
                        </p>
                        <p className="text-xs dark:text-gray-400 text-gray-500 mt-1">
                          Please review all variances before reconciling. Reconciling will approve
                          all pending variances and adjust inventory.
                        </p>
                      </div>
                    </div>
                  </div>

                  <h4 className="font-medium dark:text-white text-gray-900 mb-3">
                    Inventory Adjustments:
                  </h4>
                  <div className="overflow-x-auto mb-4">
                    <table className="min-w-full text-sm">
                      <thead className="dark:bg-gray-800 bg-gray-100">
                        <tr>
                          <th className="px-3 py-2 text-left dark:text-gray-400 text-gray-600">
                            SKU
                          </th>
                          <th className="px-3 py-2 text-left dark:text-gray-400 text-gray-600">
                            Location
                          </th>
                          <th className="px-3 py-2 text-right dark:text-gray-400 text-gray-600">
                            System
                          </th>
                          <th className="px-3 py-2 text-right dark:text-gray-400 text-gray-600">
                            Counted
                          </th>
                          <th className="px-3 py-2 text-right dark:text-gray-400 text-gray-600">
                            Variance
                          </th>
                          <th className="px-3 py-2 text-right dark:text-gray-400 text-gray-600">
                            %
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y dark:divide-gray-700 divide-gray-200">
                        {reconcileSummaryData.skusToAdjust.map((item: any, index: number) => (
                          <tr key={index}>
                            <td className="px-3 py-2 dark:text-white text-gray-900">{item.sku}</td>
                            <td className="px-3 py-2 dark:text-gray-300 text-gray-700">
                              {item.binLocation}
                            </td>
                            <td className="px-3 py-2 text-right dark:text-gray-300 text-gray-700">
                              {item.systemQuantity}
                            </td>
                            <td className="px-3 py-2 text-right dark:text-gray-300 text-gray-700">
                              {item.countedQuantity}
                            </td>
                            <td
                              className={`px-3 py-2 text-right font-medium ${
                                item.variance > 0 ? 'text-green-500' : 'text-red-500'
                              }`}
                            >
                              {item.variance > 0 ? '+' : ''}
                              {item.variance}
                            </td>
                            <td className="px-3 py-2 text-right dark:text-gray-300 text-gray-700">
                              {item.variancePercent.toFixed(1)}%
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowReconcileSummary(false)}
                      className="flex-1 px-4 py-2 dark:bg-gray-800 bg-gray-100 dark:text-gray-300 text-gray-700 rounded-lg hover:dark:bg-gray-700 hover:bg-gray-200"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => {
                        handleReconcile();
                        setShowReconcileSummary(false);
                      }}
                      disabled={reconcileMutation.isPending}
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                      {reconcileMutation.isPending ? 'Reconciling...' : 'Approve All & Reconcile'}
                    </button>
                  </div>
                </>
              ) : (
                <div className="text-center py-8">
                  <CheckIcon className="h-12 w-12 text-green-500 mx-auto mb-3" />
                  <p className="text-lg font-medium dark:text-white text-gray-900">All Set!</p>
                  <p className="text-sm dark:text-gray-400 text-gray-600 mt-1">
                    No pending variances. You can reconcile this count.
                  </p>
                  <div className="flex gap-3 mt-6 justify-center">
                    <button
                      onClick={() => setShowReconcileSummary(false)}
                      className="px-4 py-2 dark:bg-gray-800 bg-gray-100 dark:text-gray-300 text-gray-700 rounded-lg hover:dark:bg-gray-700 hover:bg-gray-200"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => {
                        handleReconcile();
                        setShowReconcileSummary(false);
                      }}
                      disabled={reconcileMutation.isPending}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                      {reconcileMutation.isPending ? 'Reconciling...' : 'Reconcile'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Cancel Confirmation Modal */}
      {showCancelConfirm && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="dark:bg-gray-900 bg-white rounded-xl shadow-2xl max-w-md w-full">
            <div className="px-6 py-4 border-b dark:border-gray-700 border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-semibold dark:text-white text-gray-900">
                Cancel Cycle Count
              </h3>
              <button
                onClick={() => setShowCancelConfirm(false)}
                className="dark:text-gray-400 text-gray-600 dark:hover:text-white hover:text-gray-900"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            <div className="p-6">
              <div className="mb-6 p-4 dark:bg-red-500/10 bg-red-50 dark:border dark:border-red-500/30 border border-red-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <ExclamationTriangleIcon className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm dark:text-gray-300 text-gray-700 font-medium mb-1">
                      Are you sure you want to cancel this cycle count?
                    </p>
                    <p className="text-xs dark:text-gray-400 text-gray-500">
                      This will mark the count as cancelled. This action cannot be undone.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowCancelConfirm(false)}
                  className="flex-1 px-4 py-2 dark:bg-gray-800 bg-gray-100 dark:text-gray-300 text-gray-700 rounded-lg hover:dark:bg-gray-700 hover:bg-gray-200"
                >
                  No, Keep It
                </button>
                <button
                  onClick={handleCancel}
                  disabled={cancelMutation.isPending}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                >
                  {cancelMutation.isPending ? 'Cancelling...' : 'Yes, Cancel'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Audit Log Modal */}
      {showAuditLog && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="dark:bg-gray-900 bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="px-6 py-4 border-b dark:border-gray-700 border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-semibold dark:text-white text-gray-900">Audit Log</h3>
              <button
                onClick={() => setShowAuditLog(false)}
                className="dark:text-gray-400 text-gray-600 dark:hover:text-white hover:text-gray-900"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            <div className="p-6">
              {auditLogData && auditLogData.length > 0 ? (
                <div className="space-y-4">
                  {auditLogData.map((log: any, index: number) => (
                    <div
                      key={index}
                      className="p-3 dark:bg-gray-800 bg-gray-50 rounded-lg border dark:border-gray-700 border-gray-200"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                          <ClockIcon className="h-4 w-4 text-gray-500" />
                          <span className="text-sm font-medium dark:text-white text-gray-900">
                            {log.action}
                          </span>
                        </div>
                        <span className="text-xs text-gray-500">
                          {new Date(log.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-xs dark:text-gray-400 text-gray-600">By: {log.userName}</p>
                      {Object.keys(log.details).length > 0 && (
                        <pre className="mt-2 text-xs dark:text-gray-500 text-gray-700 overflow-x-auto">
                          {JSON.stringify(log.details, null, 2)}
                        </pre>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center dark:text-gray-400 text-gray-600 py-8">
                  No audit log available
                </p>
              )}
              <div className="mt-4">
                <button
                  onClick={() => setShowAuditLog(false)}
                  className="w-full px-4 py-2 dark:bg-gray-800 bg-gray-100 dark:text-gray-300 text-gray-700 rounded-lg hover:dark:bg-gray-700 hover:bg-gray-200"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Count Mode Panel */}
      {quickCountMode && plan && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <QuickCountPanel
              plan={plan}
              pendingEntries={getPendingEntries()}
              onCompleteEntry={(_entryId, countedQuantity) => {
                // Submit the count entry
                createMutation.mutate({
                  planId: plan.planId,
                  sku: plan.sku || '',
                  binLocation: plan.location || '',
                  countedQuantity,
                });
              }}
              onCancel={() => setQuickCountMode(false)}
            />
          </div>
        </div>
      )}

      {/* Print Count Sheet Modal */}
      {showPrintSheet && plan && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <CountSheetPrint
              plan={plan}
              entries={plan.countEntries || []}
              onPrint={() => setShowPrintSheet(false)}
            />
            <div className="p-4 border-t dark:border-gray-700">
              <button
                onClick={() => setShowPrintSheet(false)}
                className="w-full px-4 py-2 bg-gray-200 dark:bg-gray-800 dark:text-gray-300 text-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
