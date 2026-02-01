/**
 * Undo Pick Modal Component
 *
 * Modal for pickers to undo picks with categorized reasons
 */

import { useState } from 'react';
import { XMarkIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { Button } from './Button';

export interface UndoPickReasonCategory {
  id: string;
  label: string;
  icon: any;
  color: string;
  reasons: UndoPickReason[];
}

export interface UndoPickReason {
  id: string;
  label: string;
  description: string;
  requiresNotes: boolean;
}

// Reason categories for undo-pick
const UNDO_PICK_CATEGORIES: UndoPickReasonCategory[] = [
  {
    id: 'quality',
    label: 'Quality Issues',
    icon: ({ className }: { className: string }) => (
      <svg
        className={className}
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
        />
      </svg>
    ),
    color: 'text-error-400',
    reasons: [
      {
        id: 'damaged',
        label: 'Damaged Item',
        description: 'Item arrived damaged during picking',
        requiresNotes: false,
      },
      {
        id: 'defective',
        label: 'Defective Item',
        description: 'Item has quality defect or issue',
        requiresNotes: true,
      },
      {
        id: 'expired',
        label: 'Expired Item',
        description: 'Item is past expiration date',
        requiresNotes: false,
      },
    ],
  },
  {
    id: 'wrong_item',
    label: 'Wrong Item',
    icon: ({ className }: { className: string }) => (
      <svg
        className={className}
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3"
        />
      </svg>
    ),
    color: 'text-warning-400',
    reasons: [
      {
        id: 'wrong_item_picked',
        label: 'Wrong Item Picked',
        description: 'Accidentally picked incorrect item',
        requiresNotes: false,
      },
      {
        id: 'wrong_bin',
        label: 'Wrong Bin Location',
        description: 'Item was from wrong bin location',
        requiresNotes: true,
      },
      {
        id: 'wrong_barcode',
        label: 'Wrong Barcode Scan',
        description: 'Scanned wrong barcode by mistake',
        requiresNotes: false,
      },
    ],
  },
  {
    id: 'quantity',
    label: 'Quantity Issues',
    icon: ({ className }: { className: string }) => (
      <svg
        className={className}
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M15 12H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
    color: 'text-info-400',
    reasons: [
      {
        id: 'overpicked',
        label: 'Overpicked',
        description: 'Picked more than required quantity',
        requiresNotes: false,
      },
      {
        id: 'adjust_quantity',
        label: 'Adjust Quantity',
        description: 'Need to adjust picked quantity',
        requiresNotes: true,
      },
    ],
  },
  {
    id: 'equipment',
    label: 'Equipment Issues',
    icon: ({ className }: { className: string }) => (
      <svg
        className={className}
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
    color: 'text-primary-400',
    reasons: [
      {
        id: 'scanner_error',
        label: 'Scanner Error',
        description: 'Scanner malfunction or error',
        requiresNotes: false,
      },
      {
        id: 'system_error',
        label: 'System Error',
        description: 'System or app error during pick',
        requiresNotes: true,
      },
    ],
  },
  {
    id: 'other',
    label: 'Other',
    icon: ({ className }: { className: string }) => (
      <svg
        className={className}
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z"
        />
      </svg>
    ),
    color: 'text-gray-400',
    reasons: [
      {
        id: 'other',
        label: 'Other Reason',
        description: 'Another reason not listed above',
        requiresNotes: true,
      },
    ],
  },
];

interface UndoPickModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string, notes: string) => void;
  itemName: string;
  sku: string;
  currentQuantity: number;
  totalQuantity: number;
  wasCompleted: boolean;
  isLoading?: boolean;
}

export function UndoPickModal({
  isOpen,
  onClose,
  onConfirm,
  itemName,
  sku,
  currentQuantity,
  wasCompleted,
  isLoading = false,
}: UndoPickModalProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [notes, setNotes] = useState('');

  if (!isOpen) return null;

  const selectedReasonData = UNDO_PICK_CATEGORIES.flatMap(cat => cat.reasons).find(
    r => r.id === selectedReason
  );

  const canConfirm =
    selectedReason && (!selectedReasonData?.requiresNotes || notes.trim().length > 0);

  const handleConfirm = () => {
    if (!canConfirm) return;
    const reasonLabel = selectedReasonData?.label || 'Unknown';
    const fullReason = selectedCategory
      ? `[${UNDO_PICK_CATEGORIES.find(c => c.id === selectedCategory)?.label}] ${reasonLabel}`
      : reasonLabel;
    onConfirm(fullReason, notes);
  };

  const handleClose = () => {
    setSelectedCategory(null);
    setSelectedReason(null);
    setNotes('');
    onClose();
  };

  const newQuantity = Math.max(0, currentQuantity - 1);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
          onClick={handleClose}
        ></div>

        {/* Modal panel */}
        <div className="inline-block align-bottom glass-card rounded-2xl text-left overflow-hidden shadow-premium-lg transform transition-all sm:my-8 sm:align-middle sm:max-w-3xl sm:w-full animate-scale-in">
          {/* Modal header */}
          <div className="bg-white/[0.02] px-6 py-4 sm:px-6 flex items-center justify-between border-b border-white/[0.08]">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-warning-500/10">
                <ExclamationTriangleIcon className="h-5 w-5 text-warning-400" />
              </div>
              <div>
                <h3 className="text-lg leading-6 font-semibold text-white">Undo Pick</h3>
                <p className="text-sm text-gray-400">
                  {itemName} ({sku})
                </p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-white focus:outline-none transition-colors duration-200"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          {/* Warning message */}
          <div className="px-6 py-4 bg-warning-500/5 border-b border-warning-500/10">
            <p className="text-sm text-warning-300">
              <strong>Warning:</strong> You are about to undo a pick. This will reduce the picked
              quantity from <span className="font-mono">{currentQuantity}</span> to{' '}
              <span className="font-mono">{newQuantity}</span>.
              {wasCompleted && ' This item was fully picked.'}
            </p>
          </div>

          {/* Modal content */}
          <div className="px-6 py-5 sm:px-6 max-h-[60vh] overflow-y-auto">
            {!selectedCategory ? (
              // Category selection
              <div>
                <label className="block text-sm font-medium text-white mb-3">
                  Select a Reason Category <span className="text-error-400">*</span>
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {UNDO_PICK_CATEGORIES.map(category => {
                    const Icon = category.icon;
                    return (
                      <button
                        key={category.id}
                        onClick={() => setSelectedCategory(category.id)}
                        className="text-left p-4 rounded-lg border-2 border-white/[0.08] hover:border-white/[0.15] bg-white/[0.02] hover:bg-white/[0.05] transition-all"
                      >
                        <div className="flex items-center gap-3">
                          <Icon className={`h-5 w-5 ${category.color}`} />
                          <span className="font-medium text-white">{category.label}</span>
                        </div>
                        <p className="text-xs text-gray-400 mt-2">
                          {category.reasons.length} options
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              // Reason selection within category
              <div>
                <button
                  onClick={() => {
                    setSelectedCategory(null);
                    setSelectedReason(null);
                    setNotes('');
                  }}
                  className="text-sm text-gray-400 hover:text-white mb-4 flex items-center gap-1"
                >
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"
                    />
                  </svg>
                  Back to categories
                </button>

                <div>
                  <label className="block text-sm font-medium text-white mb-3">
                    Select Specific Reason <span className="text-error-400">*</span>
                  </label>
                  <div className="space-y-2">
                    {UNDO_PICK_CATEGORIES.find(c => c.id === selectedCategory)?.reasons.map(
                      reason => (
                        <button
                          key={reason.id}
                          onClick={() => setSelectedReason(reason.id)}
                          className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                            selectedReason === reason.id
                              ? 'border-primary-500 bg-primary-500/10'
                              : 'border-white/[0.08] hover:border-white/[0.15] bg-white/[0.02]'
                          }`}
                        >
                          <div className="font-medium text-white">{reason.label}</div>
                          <div className="text-xs text-gray-400 mt-1">{reason.description}</div>
                          {reason.requiresNotes && (
                            <div className="text-xs text-warning-400 mt-2">
                              Additional notes required
                            </div>
                          )}
                        </button>
                      )
                    )}
                  </div>
                </div>

                {/* Notes field (shown when reason requires notes) */}
                {selectedReasonData?.requiresNotes && (
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-white mb-2">
                      Additional Details <span className="text-error-400">*</span>
                    </label>
                    <textarea
                      value={notes}
                      onChange={e => setNotes(e.target.value)}
                      rows={3}
                      className="w-full px-4 py-2 bg-white/[0.02] border border-white/[0.08] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-primary-500"
                      placeholder="Please provide more details about this issue..."
                    />
                  </div>
                )}

                {/* Optional notes for all reasons */}
                {!selectedReasonData?.requiresNotes && (
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-white mb-2">
                      Additional Notes (Optional)
                    </label>
                    <textarea
                      value={notes}
                      onChange={e => setNotes(e.target.value)}
                      rows={2}
                      className="w-full px-4 py-2 bg-white/[0.02] border border-white/[0.08] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-primary-500"
                      placeholder="Add any additional context..."
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Modal footer */}
          <div className="bg-white/[0.02] px-6 py-4 sm:px-6 sm:flex sm:flex-row-reverse gap-3 border-t border-white/[0.08]">
            <Button
              variant="warning"
              onClick={handleConfirm}
              disabled={!canConfirm || isLoading}
              className="w-full sm:w-auto"
            >
              {isLoading ? 'Undoing...' : 'Undo Pick'}
            </Button>
            <Button variant="secondary" onClick={handleClose} className="w-full sm:w-auto">
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
