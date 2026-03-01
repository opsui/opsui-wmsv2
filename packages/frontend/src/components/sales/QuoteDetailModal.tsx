/**
 * Quote Detail Modal
 *
 * Modal for viewing quote details, line items, and performing quote actions
 * (send to customer, accept/convert to order).
 * When accepted, shows live order fulfillment status through to shipped.
 */

import { Modal, Button, useToast } from '@/components/shared';
import { useQuote, useSendQuote, useAcceptQuote, useShipOrder } from '@/services/api';
import { apiClient } from '@/lib/api-client';
import { useQuery } from '@tanstack/react-query';
import {
  DocumentTextIcon,
  CalendarIcon,
  UserIcon,
  CurrencyDollarIcon,
  TruckIcon,
  CheckCircleIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import { useState } from 'react';

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

// Order lifecycle steps for display in the accepted quote view
const ORDER_STEPS = [
  { status: 'PENDING', label: 'Queued' },
  { status: 'PICKING', label: 'Picking' },
  { status: 'PICKED', label: 'Picked' },
  { status: 'PACKING', label: 'Packing' },
  { status: 'PACKED', label: 'Packed' },
  { status: 'SHIPPED', label: 'Shipped' },
] as const;

const ORDER_STATUS_ORDER = ['PENDING', 'PICKING', 'PICKED', 'PACKING', 'PACKED', 'SHIPPED'];

// ============================================================================
// ORDER FULFILLMENT TRACKER
// ============================================================================

function OrderFulfillmentTracker({
  orderId,
  onShipped,
}: {
  orderId: string;
  onShipped?: () => void;
}) {
  const { data: order, isLoading } = useQuery({
    queryKey: ['orders', orderId],
    queryFn: async () => {
      const response = await apiClient.get(`/orders/${orderId}`);
      return response.data;
    },
    enabled: !!orderId,
    refetchInterval: 10000, // poll every 10s so salesperson sees live progress
  });
  const shipMutation = useShipOrder();
  const { showToast } = useToast();
  const [showShipForm, setShowShipForm] = useState(false);
  const [carrier, setCarrier] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
        <ClockIcon className="h-4 w-4 animate-spin" />
        Loading order status...
      </div>
    );
  }

  if (!order) {
    return (
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Order <span className="font-mono font-medium text-gray-900 dark:text-white">{orderId}</span>{' '}
        created and queued for picking.
      </p>
    );
  }

  const currentStatusIndex = ORDER_STATUS_ORDER.indexOf(order.status);
  const isShipped = order.status === 'SHIPPED';
  const isPacked = order.status === 'PACKED';

  const handleShip = async () => {
    if (!carrier.trim() || !trackingNumber.trim()) {
      showToast('Carrier and tracking number are required', 'error');
      return;
    }
    try {
      await shipMutation.mutateAsync({
        orderId,
        carrier: carrier.trim(),
        trackingNumber: trackingNumber.trim(),
      });
      showToast(`Order ${orderId} marked as shipped!`, 'success');
      setShowShipForm(false);
      onShipped?.();
    } catch (error: any) {
      showToast(error?.response?.data?.error || 'Failed to mark order as shipped', 'error');
    }
  };

  return (
    <div className="space-y-4">
      {/* Order ID */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Order{' '}
          <span className="font-mono font-medium text-gray-900 dark:text-white">{orderId}</span>
        </p>
        <span
          className={`px-2 py-0.5 rounded text-xs font-semibold ${
            isShipped
              ? 'bg-emerald-500/20 text-emerald-400'
              : isPacked
                ? 'bg-blue-500/20 text-blue-400'
                : 'bg-amber-500/20 text-amber-400'
          }`}
        >
          {order.status}
        </span>
      </div>

      {/* Step progress bar */}
      <div className="flex items-center gap-0">
        {ORDER_STEPS.map((step, idx) => {
          const stepIndex = ORDER_STATUS_ORDER.indexOf(step.status);
          const isDone = stepIndex <= currentStatusIndex;
          const isCurrent = stepIndex === currentStatusIndex;
          const isLast = idx === ORDER_STEPS.length - 1;

          return (
            <div key={step.status} className="flex items-center flex-1 min-w-0">
              <div className="flex flex-col items-center flex-1">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center border-2 transition-colors ${
                    isDone
                      ? 'bg-emerald-500 border-emerald-500'
                      : isCurrent
                        ? 'border-amber-400 bg-amber-400/20'
                        : 'border-gray-600 bg-transparent'
                  }`}
                >
                  {isDone && <CheckCircleIcon className="h-3.5 w-3.5 text-white" />}
                </div>
                <span
                  className={`text-[10px] mt-1 font-medium truncate text-center ${
                    isDone
                      ? 'text-emerald-400'
                      : isCurrent
                        ? 'text-amber-400'
                        : 'text-gray-600 dark:text-gray-500'
                  }`}
                >
                  {step.label}
                </span>
              </div>
              {!isLast && (
                <div
                  className={`h-0.5 flex-1 mx-1 mt-[-16px] transition-colors ${
                    stepIndex < currentStatusIndex ? 'bg-emerald-500' : 'bg-gray-700'
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Shipped info */}
      {isShipped && (order.carrier || order.trackingNumber) && (
        <div className="flex items-start gap-3 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
          <TruckIcon className="h-4 w-4 text-emerald-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm space-y-0.5">
            {order.carrier && (
              <p className="text-gray-300">
                <span className="text-gray-500">Carrier: </span>
                <span className="font-medium">{order.carrier}</span>
              </p>
            )}
            {order.trackingNumber && (
              <p className="text-gray-300">
                <span className="text-gray-500">Tracking: </span>
                <span className="font-mono font-medium text-emerald-400">
                  {order.trackingNumber}
                </span>
              </p>
            )}
          </div>
        </div>
      )}

      {/* Ship form — shown for PACKED orders */}
      {isPacked && !showShipForm && (
        <Button
          size="sm"
          variant="primary"
          onClick={() => setShowShipForm(true)}
          className="flex items-center gap-2"
        >
          <TruckIcon className="h-4 w-4" />
          Mark as Shipped
        </Button>
      )}

      {isPacked && showShipForm && (
        <div className="space-y-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
          <p className="text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wide">
            Shipping Details
          </p>
          <div className="space-y-2">
            <div>
              <label className="text-xs text-gray-500 dark:text-gray-400">Carrier</label>
              <input
                type="text"
                value={carrier}
                onChange={e => setCarrier(e.target.value)}
                placeholder="e.g. NZ Post, DHL, FedEx"
                className="w-full mt-1 px-3 py-2 text-sm bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 dark:text-gray-400">Tracking Number</label>
              <input
                type="text"
                value={trackingNumber}
                onChange={e => setTrackingNumber(e.target.value)}
                placeholder="e.g. NZ123456789NZ"
                className="w-full mt-1 px-3 py-2 text-sm bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="primary"
              onClick={handleShip}
              disabled={shipMutation.isPending}
              className="flex items-center gap-2"
            >
              <TruckIcon className="h-4 w-4" />
              {shipMutation.isPending ? 'Shipping...' : 'Confirm Shipment'}
            </Button>
            <Button size="sm" variant="secondary" onClick={() => setShowShipForm(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
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
  const [createdOrderId, setCreatedOrderId] = useState<string | null>(null);

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
      const result = await acceptMutation.mutateAsync(quoteId);
      const orderId = result?.order?.orderId;
      if (orderId) {
        setCreatedOrderId(orderId);
      }
      showToast(`Quote ${quote?.quoteNumber} accepted! Order created.`, 'success');
      onSuccess?.();
      onAccepted?.();
    } catch (error: any) {
      showToast(error?.message || 'Failed to accept quote', 'error');
    }
  };

  // Reset created order state when modal closes
  const handleClose = () => {
    setCreatedOrderId(null);
    onClose();
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

  // The linked order ID — either just created this session or previously linked on the quote
  const linkedOrderId = createdOrderId ?? quote?.convertedToOrderId ?? null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Quote Details"
      size="lg"
      footer={
        <div className="flex items-center justify-between">
          <Button variant="secondary" onClick={handleClose}>
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

          {/* Order fulfillment tracker — shown when quote is accepted and has a linked order */}
          {(status === 'ACCEPTED' || linkedOrderId) && linkedOrderId && (
            <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
              <p className="text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-3">
                Order Fulfillment
              </p>
              <OrderFulfillmentTracker orderId={linkedOrderId} onShipped={onSuccess} />
            </div>
          )}

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
