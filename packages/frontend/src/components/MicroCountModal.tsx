/**
 * Micro-Count Modal
 *
 * Quick count modal for interleaved counting during picking
 * Allows pickers to verify inventory counts while on the floor
 */

import { useState } from 'react';
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  XMarkIcon,
  QrCodeIcon,
} from '@heroicons/react/24/outline';
import { useCreateMicroCount, useBarcodeLookup } from '@/services/api';
import { useAuthStore } from '@/stores';

interface MicroCountModalProps {
  isOpen: boolean;
  onClose: () => void;
  sku: string;
  binLocation: string;
  systemQuantity?: number;
  orderId?: string;
  onSuccess?: (result: any) => void;
}

export function MicroCountModal({
  isOpen,
  onClose,
  sku,
  binLocation,
  systemQuantity = 0,
  orderId,
  onSuccess,
}: MicroCountModalProps) {
  const { user } = useAuthStore();
  const createMicroCount = useCreateMicroCount();

  const [countedQuantity, setCountedQuantity] = useState('');
  const [barcode, setBarcode] = useState('');
  const [barcodeStatus, setBarcodeStatus] = useState<'idle' | 'loading' | 'success' | 'error'>(
    'idle'
  );
  const [barcodeMessage, setBarcodeMessage] = useState('');
  const [notes, setNotes] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Barcode lookup hook
  const {
    data: barcodeData,
    isLoading: barcodeLoading,
    isError: barcodeError,
    refetch: refetchBarcode,
  } = useBarcodeLookup(barcode, barcodeStatus === 'loading');

  // Handle barcode scanning
  const handleBarcodeChange = (value: string) => {
    setBarcode(value);
    setErrorMessage('');

    if (value.length >= 8) {
      setBarcodeStatus('loading');
      setBarcodeMessage('Verifying barcode...');

      setTimeout(() => {
        refetchBarcode();
      }, 300);
    } else if (value.length === 0) {
      setBarcodeStatus('idle');
      setBarcodeMessage('');
    }
  };

  // Process barcode lookup result
  if (barcode && barcodeStatus === 'loading' && !barcodeLoading) {
    if (barcodeError) {
      setBarcodeStatus('error');
      setBarcodeMessage('Barcode not found');
    } else if (barcodeData && barcodeData.sku) {
      if (barcodeData.sku !== sku) {
        setBarcodeStatus('error');
        setBarcodeMessage(`Mismatch! Scanned ${barcodeData.sku}, but location requires ${sku}`);
      } else {
        setBarcodeStatus('success');
        setBarcodeMessage(`Verified: ${barcodeData.productName || sku}`);
        setCountedQuantity('1'); // Default to 1 for quick scan
      }
    }
  }

  // Clear barcode input
  const clearBarcode = () => {
    setBarcode('');
    setBarcodeStatus('idle');
    setBarcodeMessage('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    const qty = parseInt(countedQuantity);
    if (isNaN(qty) || qty < 0) {
      setErrorMessage('Please enter a valid quantity');
      return;
    }

    try {
      const result = await createMicroCount.mutateAsync({
        sku,
        binLocation,
        countedQuantity: qty,
        orderId,
        notes: notes || `Micro-count during picking for order ${orderId}`,
      });

      onSuccess?.(result);
      handleClose();
    } catch (error: any) {
      setErrorMessage(error?.message || 'Failed to record micro-count');
    }
  };

  const handleClose = () => {
    setCountedQuantity('');
    setBarcode('');
    setBarcodeStatus('idle');
    setBarcodeMessage('');
    setNotes('');
    setErrorMessage('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="dark:bg-gray-900 bg-white rounded-xl shadow-2xl max-w-md w-full">
        {/* Header */}
        <div className="px-6 py-4 border-b dark:border-gray-700 border-gray-200 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <QrCodeIcon className="h-5 w-5 text-blue-500" />
            <h3 className="text-lg font-semibold dark:text-white text-gray-900">
              Quick Micro-Count
            </h3>
          </div>
          <button
            onClick={handleClose}
            className="dark:text-gray-400 text-gray-600 dark:hover:text-white hover:text-gray-900"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Info Banner */}
        <div className="mx-6 mt-4 p-3 dark:bg-blue-500/10 bg-blue-50 dark:border dark:border-blue-500/30 border border-blue-200 rounded-lg">
          <div className="flex items-start gap-2">
            <InformationCircleIcon className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
            <div className="text-sm dark:text-gray-300 text-gray-700">
              <p className="font-medium mb-1">Quick Inventory Verification</p>
              <p className="text-xs dark:text-gray-400 text-gray-500">
                Scan or enter the quantity to verify inventory. Small variances (&le;2%) will
                auto-adjust.
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* SKU and Location (Read-only) */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium dark:text-gray-400 text-gray-500 mb-1">
                SKU
              </label>
              <div className="px-3 py-2 dark:bg-gray-800 bg-gray-50 dark:border dark:border-gray-700 border border-gray-300 rounded-lg dark:text-white text-gray-900">
                {sku}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium dark:text-gray-400 text-gray-500 mb-1">
                Location
              </label>
              <div className="px-3 py-2 dark:bg-gray-800 bg-gray-50 dark:border dark:border-gray-700 border border-gray-300 rounded-lg dark:text-white text-gray-900">
                {binLocation}
              </div>
            </div>
          </div>

          {/* System Quantity */}
          <div>
            <label className="block text-sm font-medium dark:text-gray-300 text-gray-700 mb-1">
              System Quantity
            </label>
            <div className="px-3 py-2 dark:bg-gray-800 bg-gray-50 dark:border dark:border-gray-700 border border-gray-300 rounded-lg dark:text-white text-gray-900">
              {systemQuantity}
            </div>
          </div>

          {/* Barcode Scanning */}
          <div>
            <label className="block text-sm font-medium dark:text-gray-300 text-gray-700 mb-1">
              Scan Barcode (Optional)
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
                      : 'focus:ring-blue-500'
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
              </p>
            )}
          </div>

          {/* Counted Quantity */}
          <div>
            <label className="block text-sm font-medium dark:text-gray-300 text-gray-700 mb-1">
              Counted Quantity *
            </label>
            <input
              type="number"
              required
              min="0"
              value={countedQuantity}
              onChange={e => setCountedQuantity(e.target.value)}
              className="w-full px-3 py-2 dark:bg-gray-800 bg-gray-50 border dark:border-gray-600 border-gray-300 rounded-lg dark:text-white text-gray-900"
              placeholder="Enter actual quantity"
              autoFocus={!barcode}
            />
          </div>

          {/* Variance Preview */}
          {countedQuantity && (
            <div className="p-3 dark:bg-gray-800 bg-gray-50 dark:border dark:border-gray-700 border border-gray-300 rounded-lg">
              <div className="flex justify-between items-center text-sm">
                <span className="dark:text-gray-400 text-gray-600">Expected Variance:</span>
                <span
                  className={`font-medium ${
                    parseInt(countedQuantity) === systemQuantity
                      ? 'text-green-500'
                      : (Math.abs(parseInt(countedQuantity) - systemQuantity) / systemQuantity) *
                            100 <=
                          2
                        ? 'text-yellow-500'
                        : 'text-orange-500'
                  }`}
                >
                  {parseInt(countedQuantity) - systemQuantity > 0 ? '+' : ''}
                  {parseInt(countedQuantity) - systemQuantity}
                  {' ('}
                  {Math.abs(
                    ((parseInt(countedQuantity) - systemQuantity) / systemQuantity) * 100
                  ).toFixed(1)}
                  %)
                </span>
              </div>
              {parseInt(countedQuantity) !== systemQuantity && (
                <div className="mt-2 flex items-start gap-2 text-xs dark:text-gray-400 text-gray-500">
                  {Math.abs(
                    ((parseInt(countedQuantity) - systemQuantity) / systemQuantity) * 100
                  ) <= 2 ? (
                    <>
                      <CheckCircleIcon className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>Within tolerance - will auto-adjust inventory</span>
                    </>
                  ) : (
                    <>
                      <ExclamationTriangleIcon className="h-4 w-4 text-orange-500 mt-0.5 flex-shrink-0" />
                      <span>Outside tolerance - requires supervisor review</span>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium dark:text-gray-300 text-gray-700 mb-1">
              Notes (Optional)
            </label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full px-3 py-2 dark:bg-gray-800 bg-gray-50 border dark:border-gray-600 border-gray-300 rounded-lg dark:text-white text-gray-900 resize-none"
              placeholder="Any additional notes..."
              rows={2}
            />
          </div>

          {errorMessage && (
            <div className="p-3 rounded-lg dark:bg-red-500/10 dark:border dark:border-red-500/30 bg-red-50 border border-red-200">
              <p className="text-sm dark:text-red-400 text-red-700">{errorMessage}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 px-4 py-2 dark:bg-gray-800 bg-gray-100 dark:text-gray-300 text-gray-700 rounded-lg hover:dark:bg-gray-700 hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createMicroCount.isPending || !countedQuantity}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {createMicroCount.isPending ? 'Recording...' : 'Record Count'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
