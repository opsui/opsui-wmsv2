/**
 * Quote Detail Modal
 *
 * Modal for viewing quote details, line items, and performing quote actions
 * (send to customer, accept/convert to order).
 */

import { Modal, Button, useToast } from '@/components/shared';
import { useQuote, useSendQuote, useAcceptQuote } from '@/services/api';
import {
  DocumentTextIcon,
  CalendarIcon,
  UserIcon,
  CurrencyDollarIcon,
} from '@heroicons/react/24/outline';

// ============================================================================
// TYPES
// ============================================================================

interface QuoteDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  quoteId: string;
  onAccepted?: () => void;
}

const STATUS_STYLES: Record<string, string> = {
  DRAFT: 'bg-slate-500/20 text-slate-400 border border-slate-500/30',
  SENT: 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
  ACCEPTED: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
  REJECTED: 'bg-rose-500/20 text-rose-400 border border-rose-500/30',
  EXPIRED: 'bg-gray-500/20 text-gray-400 border border-gray-500/30',
};

// ============================================================================
// COMPONENT
// ============================================================================

export function QuoteDetailModal({
  isOpen,
  onClose,
  onSuccess,
  quoteId,
  onAccepted,
}: QuoteDetailModalProps) {
  const { showToast } = useToast();
  const { data: quote, isLoading } = useQuote(quoteId, isOpen);
  const sendMutation = useSendQuote();
  const acceptMutation = useAcceptQuote();

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);

  const handleSend = async () => {
    try {
      await sendMutation.mutateAsync(quoteId);
      showToast(`Quote ${quote?.quoteNumber} sent to customer!`, 'success');
      onSuccess?.();
    } catch (error: any) {
      showToast(error?.message || 'Failed to send quote', 'error');
    }
  };

  const handleAccept = async () => {
    try {
      await acceptMutation.mutateAsync(quoteId);
      showToast(`Quote ${quote?.quoteNumber} accepted! Order created.`, 'success');
      onSuccess?.();
      onAccepted?.();
      onClose();
    } catch (error: any) {
      showToast(error?.message || 'Failed to accept quote', 'error');
    }
  };

  const status = quote?.status ?? '';
  const isExpiredOrRejected = status === 'EXPIRED' || status === 'REJECTED';

  const lineItems: any[] = quote?.lineItems ?? quote?.items ?? [];
  const subtotal = lineItems.reduce(
    (sum: number, item: any) => sum + Number(item.lineTotal ?? item.totalPrice ?? 0),
    0
  );
  const totalAmount = quote?.totalAmount ?? quote?.total ?? subtotal;
  const taxAmount = quote?.taxAmount ?? quote?.tax ?? 0;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Quote Details"
      size="lg"
      footer={
        <div className="flex items-center justify-between">
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
          {!isExpiredOrRejected && status !== 'ACCEPTED' && (
            <div className="flex items-center gap-2">
              {status === 'DRAFT' && (
                <Button variant="secondary" onClick={handleSend} disabled={sendMutation.isPending}>
                  {sendMutation.isPending ? 'Sending...' : 'Send to Customer'}
                </Button>
              )}
              {status === 'SENT' && (
                <Button
                  variant="primary"
                  onClick={handleAccept}
                  disabled={acceptMutation.isPending}
                >
                  {acceptMutation.isPending ? 'Accepting...' : 'Accept & Create Order'}
                </Button>
              )}
            </div>
          )}
        </div>
      }
    >
      {isLoading ? (
        <div className="flex items-center justify-center py-12 text-gray-500 dark:text-gray-400">
          Loading quote details...
        </div>
      ) : !quote ? (
        <div className="flex items-center justify-center py-12 text-gray-500 dark:text-gray-400">
          Quote not found
        </div>
      ) : (
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-amber-500/20 flex items-center justify-center">
                <DocumentTextIcon className="h-6 w-6 text-amber-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {quote.quoteNumber}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">{quote.customerName}</p>
              </div>
            </div>
            <span
              className={`px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_STYLES[status] || STATUS_STYLES.DRAFT}`}
            >
              {status}
            </span>
          </div>

          {/* Meta */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {quote.validUntil && (
              <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                <CalendarIcon className="h-4 w-4 text-gray-400 flex-shrink-0" />
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Valid Until</p>
                  <p className="text-sm text-gray-900 dark:text-white">
                    {new Date(quote.validUntil).toLocaleDateString()}
                  </p>
                </div>
              </div>
            )}
            {quote.assignedTo && (
              <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                <UserIcon className="h-4 w-4 text-gray-400 flex-shrink-0" />
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Created By</p>
                  <p className="text-sm text-gray-900 dark:text-white">{quote.assignedTo}</p>
                </div>
              </div>
            )}
          </div>

          {/* Line items */}
          {lineItems.length > 0 ? (
            <div>
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Line Items
              </h4>
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-800/50">
                    <tr>
                      <th className="text-left px-4 py-2 text-xs font-medium text-gray-500 dark:text-gray-400">
                        Item
                      </th>
                      <th className="text-center px-4 py-2 text-xs font-medium text-gray-500 dark:text-gray-400">
                        Qty
                      </th>
                      <th className="text-right px-4 py-2 text-xs font-medium text-gray-500 dark:text-gray-400">
                        Unit Price
                      </th>
                      <th className="text-right px-4 py-2 text-xs font-medium text-gray-500 dark:text-gray-400">
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {lineItems.map((item: any, idx: number) => (
                      <tr
                        key={idx}
                        className={
                          idx < lineItems.length - 1
                            ? 'border-b border-gray-200 dark:border-gray-700'
                            : ''
                        }
                      >
                        <td className="px-4 py-3 text-gray-900 dark:text-white">
                          {item.description ?? item.productName ?? item.sku ?? `Item ${idx + 1}`}
                        </td>
                        <td className="px-4 py-3 text-center text-gray-500 dark:text-gray-400">
                          {item.quantity ?? 1}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-500 dark:text-gray-400">
                          {formatCurrency(Number(item.unitPrice ?? item.price ?? 0))}
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-gray-900 dark:text-white">
                          {formatCurrency(Number(item.lineTotal ?? item.totalPrice ?? 0))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}

          {/* Totals */}
          <div className="space-y-2 pt-2 border-t border-gray-200 dark:border-gray-700">
            {taxAmount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">Tax</span>
                <span className="text-gray-900 dark:text-white">{formatCurrency(taxAmount)}</span>
              </div>
            )}
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Total</span>
              <div className="flex items-center gap-2">
                <CurrencyDollarIcon className="h-4 w-4 text-emerald-400" />
                <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(Number(totalAmount))}
                </span>
              </div>
            </div>
          </div>

          {/* Notes */}
          {quote.notes && (
            <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Notes</p>
              <p className="text-sm text-gray-900 dark:text-white whitespace-pre-wrap">
                {quote.notes}
              </p>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
