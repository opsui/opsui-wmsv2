/**
 * Unclaim Modal Component
 *
 * Modal for pickers/packers to unclaim orders with categorized reasons
 */

import { useState } from 'react';
import { XMarkIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { Button } from './Button';

// Unclaim reason categories
export interface UnclaimReasonCategory {
  id: string;
  label: string;
  icon: any;
  color: string;
  reasons: UnclaimReason[];
}

export interface UnclaimReason {
  id: string;
  label: string;
  description: string;
  requiresNotes: boolean;
}

// Reason categories
const UNCLAIM_CATEGORIES: UnclaimReasonCategory[] = [
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
    color: 'text-warning-400',
    reasons: [
      {
        id: 'scanner_malfunction',
        label: 'Scanner Malfunction',
        description: 'Barcode scanner not working',
        requiresNotes: false,
      },
      {
        id: 'pallet_jack_broken',
        label: 'Pallet Jack Broken',
        description: 'Equipment unavailable or broken',
        requiresNotes: false,
      },
      {
        id: 'label_printer_down',
        label: 'Label Printer Down',
        description: 'Cannot print shipping labels',
        requiresNotes: false,
      },
      {
        id: 'other_equipment',
        label: 'Other Equipment',
        description: 'Other equipment issue',
        requiresNotes: true,
      },
    ],
  },
  {
    id: 'staff',
    label: 'Staff Issues',
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
          d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
        />
      </svg>
    ),
    color: 'text-info-400',
    reasons: [
      {
        id: 'illness',
        label: 'Illness',
        description: 'Feeling unwell and unable to continue',
        requiresNotes: false,
      },
      {
        id: 'emergency',
        label: 'Emergency',
        description: 'Personal emergency requires leaving',
        requiresNotes: false,
      },
      {
        id: 'injury',
        label: 'Injury',
        description: 'Minor injury preventing work',
        requiresNotes: false,
      },
    ],
  },
  {
    id: 'order',
    label: 'Order Problems',
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
          d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z"
        />
      </svg>
    ),
    color: 'text-error-400',
    reasons: [
      {
        id: 'wrong_items',
        label: 'Wrong Items',
        description: 'Order has incorrect items',
        requiresNotes: true,
      },
      {
        id: 'damaged_items',
        label: 'Damaged Items',
        description: 'Items arrived damaged',
        requiresNotes: true,
      },
      {
        id: 'missing_items',
        label: 'Missing Items',
        description: 'Cannot find items in order',
        requiresNotes: true,
      },
      {
        id: 'complex_order',
        label: 'Complex Order',
        description: 'Order too complex for current capacity',
        requiresNotes: true,
      },
    ],
  },
  {
    id: 'inventory',
    label: 'Inventory Issues',
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
          d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125"
        />
      </svg>
    ),
    color: 'text-primary-400',
    reasons: [
      {
        id: 'cannot_locate',
        label: 'Cannot Locate',
        description: 'Unable to find item location',
        requiresNotes: true,
      },
      {
        id: 'bin_empty',
        label: 'Bin Empty',
        description: 'Bin shows stock but is actually empty',
        requiresNotes: true,
      },
      {
        id: 'wrong_bin',
        label: 'Wrong Bin Location',
        description: 'Item is in different bin than system shows',
        requiresNotes: true,
      },
      {
        id: 'stock_discrepancy',
        label: 'Stock Discrepancy',
        description: 'System shows different quantity than actual',
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

interface UnclaimModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string, notes: string) => void;
  orderId: string;
  isLoading?: boolean;
}

export function UnclaimModal({
  isOpen,
  onClose,
  onConfirm,
  orderId,
  isLoading = false,
}: UnclaimModalProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [notes, setNotes] = useState('');

  if (!isOpen) return null;

  const selectedReasonData = UNCLAIM_CATEGORIES.flatMap(cat => cat.reasons).find(
    r => r.id === selectedReason
  );

  const canConfirm =
    selectedReason && (!selectedReasonData?.requiresNotes || notes.trim().length > 0);

  const handleConfirm = () => {
    if (!canConfirm) return;
    const reasonLabel = selectedReasonData?.label || 'Unknown';
    const fullReason = selectedCategory
      ? `[${UNCLAIM_CATEGORIES.find(c => c.id === selectedCategory)?.label}] ${reasonLabel}`
      : reasonLabel;
    onConfirm(fullReason, notes);
  };

  const handleClose = () => {
    setSelectedCategory(null);
    setSelectedReason(null);
    setNotes('');
    onClose();
  };

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
              <div className="p-2 rounded-lg bg-error-500/10">
                <ExclamationTriangleIcon className="h-5 w-5 text-error-400" />
              </div>
              <div>
                <h3 className="text-lg leading-6 font-semibold text-white">Unclaim Order</h3>
                <p className="text-sm text-gray-400">{orderId}</p>
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
          <div className="px-6 py-4 bg-error-500/5 border-b border-error-500/10">
            <p className="text-sm text-error-300">
              <strong>Warning:</strong> You are about to unclaim this order. All your progress will
              be reset and the order will return to the queue. This action cannot be undone.
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
                  {UNCLAIM_CATEGORIES.map(category => {
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
                    {UNCLAIM_CATEGORIES.find(c => c.id === selectedCategory)?.reasons.map(
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
              variant="danger"
              onClick={handleConfirm}
              disabled={!canConfirm || isLoading}
              className="w-full sm:w-auto"
            >
              {isLoading ? 'Unclaiming...' : 'Unclaim Order'}
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
