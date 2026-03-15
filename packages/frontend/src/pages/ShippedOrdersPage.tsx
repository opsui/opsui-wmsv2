/**
 * Shipped Orders Page
 *
 * Displays shipped orders and exports
 *
 * ============================================================================
 * AESTHETIC DIRECTION: SHIPPING STATION - PURPLE FULFILLMENT
 * ============================================================================
 * Fulfillment-focused shipping interface:
 * - Purple accent color system for brand consistency
 * - Staggered entrance animations for order cards
 * - Export functionality with status indicators
 * - Order timeline with tracking visualization
 * - Carrier badge system with branding
 * ============================================================================
 */

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  TruckIcon,
  DocumentArrowDownIcon,
  DocumentTextIcon,
  MagnifyingGlassIcon,
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon,
  ArrowRightIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  PrinterIcon,
  MapPinIcon,
  CubeIcon,
  TagIcon,
} from '@heroicons/react/24/outline';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  FulfillmentPackingSlip,
  FULFILLMENT_SLIP_PRINT_STYLES,
  printFulfillmentSlipElement,
} from '@/components/orders/FulfillmentPackingSlip';
import { Header, Breadcrumb, useToast } from '@/components/shared';
import { cn } from '@/lib/utils';
import {
  nzcApi,
  orderApi,
  authApi,
  useShippedOrders,
  useNZCTracking,
  useExportShippedOrders,
} from '@/services/api';
import type { NZCLabelResponse } from '@opsui/shared';

// ============================================================================
// TYPES
// ============================================================================

interface ShippedOrder {
  id: string;
  orderNumber: string;
  customerName: string;
  carrier: string;
  trackingNumber: string;
  shippedAt: string;
  estimatedDelivery: string | null;
  status: 'in_transit' | 'out_for_delivery' | 'delivered' | 'exception';
  itemCount: number;
  items: Array<{ sku: string; name: string; quantity: number; image?: string }>;
  destination: { company?: string; address: string; phone?: string };
}

interface LabelPreview {
  connote: string;
  label: NZCLabelResponse;
}

interface DocumentBlockProps {
  title: string;
  description: string;
  icon: typeof DocumentTextIcon;
  isOpen: boolean;
  onToggle: () => void;
  preview?: ReactNode;
  badge?: string;
  children: ReactNode;
}

function addBusinessDays(from: string, days: number): string {
  const date = new Date(from);
  let added = 0;
  while (added < days) {
    date.setDate(date.getDate() + 1);
    const dow = date.getDay();
    if (dow !== 0 && dow !== 6) added++;
  }
  return date.toISOString();
}

function estimateDeliveryFromService(
  serviceType: string | undefined,
  shippedAt: string
): string | null {
  if (!serviceType) return null;
  const s = serviceType.toLowerCase();
  let days: number;
  if (s.includes('overnight') || s.includes('next day') || s.includes('express')) {
    days = 1;
  } else if (s.includes('2') || s.includes('two')) {
    days = 2;
  } else if (s.includes('3') || s.includes('three')) {
    days = 3;
  } else if (s.includes('economy') || s.includes('rural') || s.includes('5')) {
    days = 5;
  } else {
    days = 2; // sensible default for NZC domestic
  }
  return addBusinessDays(shippedAt, days);
}

function parseDestination(raw: string | null | undefined): ShippedOrder['destination'] {
  if (!raw) return { address: '—' };
  try {
    const a = JSON.parse(raw);
    const addressParts = [a.addressLine1, a.addressLine2, a.city, a.postalCode].filter(Boolean);
    const company = a.company && a.company !== '-' ? a.company : undefined;
    const phone = a.phone && a.phone.replace(/-/g, '').trim() ? a.phone : undefined;
    return { company, address: addressParts.join(', ') || '—', phone };
  } catch {
    return { address: raw };
  }
}

function parseConnotes(trackingNumber: string | null | undefined) {
  if (!trackingNumber || trackingNumber === 'N/A' || trackingNumber === 'â€”') return [];

  return trackingNumber
    .split(',')
    .map(token => token.trim())
    .filter(Boolean);
}

function parseShipmentConnotes(trackingNumber: string | null | undefined) {
  if (!trackingNumber) return [];

  const normalized = trackingNumber.trim();
  if (!normalized || normalized === 'N/A') return [];

  if (!/[A-Za-z0-9]/.test(normalized)) return [];

  return normalized
    .split(',')
    .map(token => token.trim())
    .filter(Boolean);
}

function getLabelSource(label: NZCLabelResponse) {
  const normalizedContentType = (label.contentType || '').toLowerCase();

  if (normalizedContentType.includes('pdf') || label.data.startsWith('JVBERi0')) {
    return {
      src: `data:application/pdf;base64,${label.data}`,
      mimeType: 'application/pdf',
      extension: 'pdf',
      isPdf: true,
    };
  }

  return {
    src: `data:image/png;base64,${label.data}`,
    mimeType: 'image/png',
    extension: 'png',
    isPdf: false,
  };
}

function base64ToBlob(base64: string, mimeType: string) {
  const binary = window.atob(base64);
  const bytes = Uint8Array.from(binary, char => char.charCodeAt(0));
  return new Blob([bytes], { type: mimeType });
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function DocumentBlock({
  title,
  description,
  icon: Icon,
  isOpen,
  onToggle,
  preview,
  badge,
  children,
}: DocumentBlockProps) {
  return (
    <div className="space-y-3" onClick={event => event.stopPropagation()}>
      <button
        type="button"
        onClick={event => {
          event.stopPropagation();
          onToggle();
        }}
        className="group block w-full text-left"
      >
        <div className="relative overflow-hidden rounded-[28px] bg-slate-100 shadow-[0_22px_45px_rgba(15,23,42,0.14)] ring-1 ring-slate-200/80 transition duration-200 group-hover:-translate-y-0.5 group-hover:shadow-[0_28px_55px_rgba(15,23,42,0.18)] dark:bg-slate-900 dark:ring-white/10 dark:shadow-[0_22px_45px_rgba(2,6,23,0.55)] dark:group-hover:shadow-[0_28px_55px_rgba(2,6,23,0.7)]">
          {preview ?? (
            <div className="flex h-48 items-center justify-center text-sm text-slate-500 dark:text-slate-300">
              Preview unavailable
            </div>
          )}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-950/18 via-transparent to-white/10 dark:from-slate-950/45 dark:via-slate-950/10 dark:to-white/5" />
          <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between px-4 py-4">
            <div className="flex items-start gap-3">
              <div className="rounded-2xl bg-white/92 p-2 text-sky-700 shadow-sm backdrop-blur dark:bg-slate-950/88 dark:text-sky-300 dark:ring-1 dark:ring-white/10">
                <Icon className="h-5 w-5" />
              </div>
              <div className="rounded-2xl bg-white/92 px-3 py-2 shadow-sm backdrop-blur dark:bg-slate-950/88 dark:ring-1 dark:ring-white/10">
                <div className="flex items-center gap-2">
                  <div className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                    {title}
                  </div>
                  {badge ? (
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-200">
                      {badge}
                    </span>
                  ) : null}
                </div>
                <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-300">
                  {description}
                </div>
              </div>
            </div>
            <div className="rounded-full bg-white/92 p-2 text-slate-500 shadow-sm backdrop-blur dark:bg-slate-950/88 dark:text-slate-200 dark:ring-1 dark:ring-white/10">
              {isOpen ? (
                <ChevronDownIcon className="h-5 w-5" />
              ) : (
                <ChevronRightIcon className="h-5 w-5" />
              )}
            </div>
          </div>
          <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-between px-4 pb-4">
            <span className="rounded-full bg-white/92 px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm backdrop-blur dark:bg-slate-950/88 dark:text-slate-100 dark:ring-1 dark:ring-white/10">
              Click to {isOpen ? 'collapse' : 'expand'}
            </span>
          </div>
        </div>
      </button>
      {isOpen && (
        <div className="rounded-3xl bg-white/88 p-4 shadow-[0_12px_32px_rgba(15,23,42,0.08)] ring-1 ring-slate-200/80 backdrop-blur dark:bg-slate-950/82 dark:ring-white/10 dark:shadow-[0_12px_32px_rgba(2,6,23,0.45)]">
          {children}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// TRACKING PANEL
// ============================================================================

function TrackingPanel({
  connote,
  onConsignmentDeleted,
}: {
  connote: string;
  onConsignmentDeleted?: (data: {
    status: 'ok' | 'consignment_deleted' | 'not_found';
    connote: string;
    results: any[];
    removedFromShippedOrders?: boolean;
    affectedOrderIds?: string[];
    affectedShipmentIds?: string[];
    message?: string;
  }) => void;
}) {
  const { data, isLoading, isError } = useNZCTracking(connote);
  const results: any[] = data?.results ?? [];
  const events: any[] = results[0]?.Events ?? [];
  const status: string =
    data?.status === 'consignment_deleted'
      ? data.message ||
        'This NZC consignment was deleted and the order was removed from shipped orders.'
      : data?.status === 'not_found'
        ? 'Tracking unavailable'
        : (results[0]?.Status ?? '');

  useEffect(() => {
    if (data?.status === 'consignment_deleted' && data.removedFromShippedOrders) {
      onConsignmentDeleted?.(data);
    }
  }, [data, onConsignmentDeleted]);

  if (isLoading) {
    return <p className="shipping-history-status text-xs opacity-60">Loading tracking…</p>;
  }
  if (isError) {
    return (
      <p className="shipping-history-status text-xs opacity-60">Could not load tracking info</p>
    );
  }
  if (events.length === 0) {
    return (
      <p className="shipping-history-status text-xs opacity-60">
        {status || 'No tracking events yet'}
      </p>
    );
  }

  return (
    <>
      {events.map((event: any, i: number) => (
        <div key={i} className="shipping-history-item">
          <div className={cn('shipping-history-dot', i === 0 && 'shipping-history-active')} />
          <div className="shipping-history-content">
            <span className="shipping-history-status">{event.Description}</span>
            {event.Location && <span className="shipping-history-location">{event.Location}</span>}
            <span className="shipping-history-time">
              {new Date(event.EventDT).toLocaleString('en-NZ', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          </div>
        </div>
      ))}
    </>
  );
}

// ============================================================================
// COMPONENT
// ============================================================================

export function ShippedOrdersPage() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedOrder, setSelectedOrder] = useState<ShippedOrder | null>(null);
  const [isPackingSlipOpen, setIsPackingSlipOpen] = useState(false);
  const [isNzcLabelOpen, setIsNzcLabelOpen] = useState(false);
  const [reprintingConnotes, setReprintingConnotes] = useState<Record<string, boolean>>({});
  const handledDeletedConnotesRef = useRef<Set<string>>(new Set());

  const { data: shippedData, isLoading: loading } = useShippedOrders({ limit: 100 });
  const apiResponse = shippedData?.data;
  const exportMutation = useExportShippedOrders();
  const { data: assignableUsers = [] } = useQuery({
    queryKey: ['users', 'assignable'],
    queryFn: authApi.getAssignableUsers,
    staleTime: 300000,
  });

  const orders: ShippedOrder[] = useMemo(() => {
    if (!apiResponse?.orders) return [];
    return apiResponse.orders.map(o => ({
      id: o.id,
      orderNumber: o.orderId,
      customerName: o.customerName,
      carrier: o.carrier || 'Unknown',
      trackingNumber: o.trackingNumber || '—',
      shippedAt: o.shippedAt,
      estimatedDelivery:
        o.deliveredAt ||
        (o as any).estimatedDeliveryDate ||
        estimateDeliveryFromService((o as any).serviceType, o.shippedAt),
      status: (o.deliveredAt ? 'delivered' : 'in_transit') as ShippedOrder['status'],
      itemCount: o.itemCount,
      items: (o as any).items ?? [],
      destination: parseDestination(o.shippingAddress),
    }));
  }, [apiResponse]);

  const stats = apiResponse?.stats;

  const filteredOrders = orders.filter(order => {
    const matchesSearch =
      order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.trackingNumber.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  useEffect(() => {
    setIsPackingSlipOpen(false);
    setIsNzcLabelOpen(false);
  }, [selectedOrder?.id]);

  useEffect(() => {
    if (selectedOrder && !orders.some(order => order.id === selectedOrder.id)) {
      setSelectedOrder(null);
    }
  }, [orders, selectedOrder]);

  const selectedOrderId = selectedOrder?.orderNumber || '';
  const selectedConnotes = useMemo(
    () => parseShipmentConnotes(selectedOrder?.trackingNumber),
    [selectedOrder?.trackingNumber]
  );

  const { data: selectedOrderDetail, isFetching: isLoadingOrderDetail } = useQuery({
    queryKey: ['orders', 'detail', selectedOrderId],
    queryFn: () => orderApi.getOrder(selectedOrderId),
    enabled: Boolean(selectedOrderId),
    staleTime: 30000,
  });

  const { data: selectedLabels, isFetching: isLoadingLabels } = useQuery({
    queryKey: ['nzc', 'labels', selectedConnotes],
    queryFn: async () => {
      const labels = await Promise.all(
        selectedConnotes.map(async connote => ({
          connote,
          label: await nzcApi.getLabel(connote, 'LABEL_PNG_100X175'),
        }))
      );
      return labels;
    },
    enabled: selectedConnotes.length > 0,
    staleTime: 300000,
  });

  const assignableUserNameMap = useMemo(
    () =>
      assignableUsers.reduce<Record<string, string>>((acc, user) => {
        acc[user.userId] = user.name;
        return acc;
      }, {}),
    [assignableUsers]
  );

  const selectedOrderItemImageMap = useMemo(() => {
    const detailItems = Array.isArray((selectedOrderDetail as any)?.items)
      ? (selectedOrderDetail as any).items
      : [];
    const listItems = Array.isArray(selectedOrder?.items) ? selectedOrder.items : [];

    return [...detailItems, ...listItems].reduce<Record<string, string>>((acc, item: any) => {
      if (item?.sku && item?.image) {
        acc[String(item.sku)] = String(item.image);
      }
      return acc;
    }, {});
  }, [selectedOrder?.items, selectedOrderDetail]);

  const selectedOrderPickedByLabel = useMemo(() => {
    if (!selectedOrderDetail) return 'Unknown';

    const pickerName = (selectedOrderDetail as any).pickerName;
    if (pickerName) return pickerName;

    const pickerId = (selectedOrderDetail as any).pickerId;
    return (pickerId && assignableUserNameMap[pickerId]) || pickerId || 'Unknown';
  }, [assignableUserNameMap, selectedOrderDetail]);

  const selectedOrderPackedByLabel = useMemo(() => {
    if (!selectedOrderDetail) return null;

    const packerName = (selectedOrderDetail as any).packerName;
    if (packerName) return packerName;

    const packerId = (selectedOrderDetail as any).packerId;
    return (packerId && assignableUserNameMap[packerId]) || packerId || null;
  }, [assignableUserNameMap, selectedOrderDetail]);

  const packingSlipElementId = selectedOrderDetail
    ? `shipped-packing-slip-${selectedOrderDetail.orderId}`
    : 'shipped-packing-slip-preview';
  const primaryLabel = selectedLabels?.[0]?.label;
  const primaryLabelSource = primaryLabel ? getLabelSource(primaryLabel) : null;

  const getStatusConfig = (status: ShippedOrder['status']) => {
    const configs = {
      in_transit: {
        label: 'In Transit',
        icon: TruckIcon,
        className: 'shipping-status-transit',
      },
      out_for_delivery: {
        label: 'Out for Delivery',
        icon: ArrowRightIcon,
        className: 'shipping-status-delivery',
      },
      delivered: {
        label: 'Delivered',
        icon: CheckCircleIcon,
        className: 'shipping-status-delivered',
      },
      exception: {
        label: 'Exception',
        icon: XCircleIcon,
        className: 'shipping-status-exception',
      },
    };
    return configs[status];
  };

  const getCarrierClass = (carrier: string) => {
    const carriers: Record<string, string> = {
      FedEx: 'shipping-carrier-fedex',
      UPS: 'shipping-carrier-ups',
      DHL: 'shipping-carrier-dhl',
      USPS: 'shipping-carrier-usps',
    };
    return carriers[carrier] || 'shipping-carrier-default';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleDeletedConsignment = (data: {
    connote: string;
    affectedOrderIds?: string[];
    message?: string;
  }) => {
    if (handledDeletedConnotesRef.current.has(data.connote)) {
      return;
    }

    handledDeletedConnotesRef.current.add(data.connote);
    queryClient.invalidateQueries({ queryKey: ['orders', 'shipped'] });

    for (const orderId of data.affectedOrderIds || []) {
      queryClient.invalidateQueries({ queryKey: ['orders', 'detail', orderId] });
    }

    if (
      selectedOrder &&
      ((data.affectedOrderIds || []).includes(selectedOrder.orderNumber) ||
        parseShipmentConnotes(selectedOrder.trackingNumber).includes(data.connote))
    ) {
      setSelectedOrder(null);
    }

    showToast(
      data.message ||
        `NZC consignment ${data.connote} was deleted. The order was removed from shipped orders.`,
      'warning'
    );
  };

  const handleExport = async () => {
    const ids = filteredOrders.map(o => o.id);
    if (ids.length === 0) return;
    const data = await exportMutation.mutateAsync(ids);
    const blob = data instanceof Blob ? data : new Blob([data as string], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `shipped-orders-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  const handlePrintPackingSlip = async () => {
    if (!selectedOrderDetail) {
      showToast('Packing slip is still loading', 'warning');
      return;
    }

    try {
      await printFulfillmentSlipElement(packingSlipElementId);
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Failed to print packing slip', 'error');
    }
  };

  const handleDownloadPackingSlip = () => {
    if (!selectedOrderDetail) {
      showToast('Packing slip is still loading', 'warning');
      return;
    }

    const slipElement = document.getElementById(packingSlipElementId);
    if (!slipElement) {
      showToast('Packing slip preview is not ready yet', 'warning');
      return;
    }

    downloadBlob(
      new Blob(
        [
          `<!doctype html><html><head><meta charset="utf-8" /><title>Packing Slip ${selectedOrderDetail.orderId}</title><style>${FULFILLMENT_SLIP_PRINT_STYLES}</style></head><body class="fulfillment-slip-print-preview">${slipElement.outerHTML}</body></html>`,
        ],
        { type: 'text/html' }
      ),
      `packing-slip-${selectedOrderDetail.orderId}.html`
    );
  };

  const handleDownloadLabel = (connote: string, label: NZCLabelResponse) => {
    const labelSource = getLabelSource(label);
    downloadBlob(
      base64ToBlob(label.data, labelSource.mimeType),
      `${connote}-label.${labelSource.extension}`
    );
  };

  const handlePrintLabel = (label: NZCLabelResponse) => {
    const labelSource = getLabelSource(label);
    const printWindow = window.open('', '_blank', 'noopener,noreferrer,width=900,height=1200');

    if (!printWindow) {
      showToast('Popup blocked. Please allow popups to print labels.', 'warning');
      return;
    }

    printWindow.document.write(`
      <html>
        <head>
          <title>NZC Shipping Label</title>
          <style>
            html, body { margin: 0; padding: 0; background: #ffffff; }
            img, iframe { display: block; width: 100%; height: auto; border: 0; }
          </style>
        </head>
        <body>
          ${
            labelSource.isPdf
              ? `<iframe src="${labelSource.src}" title="NZC Shipping Label" style="height:100vh;"></iframe>`
              : `<img src="${labelSource.src}" alt="NZC Shipping Label" />`
          }
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
                setTimeout(function() {
                  window.close();
                }, 400);
              }, 150);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleReprintLabel = async (connote: string) => {
    setReprintingConnotes(current => ({ ...current, [connote]: true }));
    try {
      await nzcApi.reprintLabel(connote, 1);
      showToast(`NZC reprint requested for ${connote}`, 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Failed to reprint label', 'error');
    } finally {
      setReprintingConnotes(current => ({ ...current, [connote]: false }));
    }
  };

  return (
    <div className="min-h-screen shipping-page-container">
      <Header />
      {/* Atmospheric background */}
      <div className="shipping-atmosphere" aria-hidden="true" />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8 relative z-10">
        {/* Breadcrumb Navigation */}
        <Breadcrumb />

        {/* Hero Header */}
        <div className="shipping-hero">
          <div className="shipping-hero-content">
            <div className="flex items-center gap-3 mb-3">
              <div className="shipping-icon-wrapper">
                <TruckIcon className="h-6 w-6" />
              </div>
              <div className="shipping-badge-live">
                <ClockIcon className="h-3 w-3 mr-1" />
                Live Tracking
              </div>
            </div>
            <h1 className="shipping-title">Shipped Orders</h1>
            <p className="shipping-subtitle">
              Track and manage all shipped orders with real-time status updates
            </p>
          </div>
          <div className="shipping-hero-stats">
            <div className="shipping-stat-mini">
              <span className="shipping-stat-mini-value">
                {stats?.totalShipped ?? orders.length}
              </span>
              <span className="shipping-stat-mini-label">Total Shipped</span>
            </div>
            <div className="shipping-stat-mini">
              <span className="shipping-stat-mini-value shipping-stat-success">
                {stats?.delivered ?? orders.filter(o => o.status === 'delivered').length}
              </span>
              <span className="shipping-stat-mini-label">Delivered</span>
            </div>
            <div className="shipping-stat-mini">
              <span className="shipping-stat-mini-value shipping-stat-warning">
                {stats?.pendingDelivery ?? orders.filter(o => o.status === 'in_transit').length}
              </span>
              <span className="shipping-stat-mini-label">Pending Delivery</span>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="shipping-controls">
          <div className="shipping-search-wrapper">
            <MagnifyingGlassIcon className="shipping-search-icon" />
            <input
              type="text"
              placeholder="Search by order, customer, or tracking..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="shipping-search-input"
            />
          </div>

          <div className="shipping-filters">
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="shipping-filter-select"
            >
              <option value="all">All Status</option>
              <option value="in_transit">In Transit</option>
              <option value="out_for_delivery">Out for Delivery</option>
              <option value="delivered">Delivered</option>
              <option value="exception">Exception</option>
            </select>

            <button
              onClick={handleExport}
              disabled={exportMutation.isPending || filteredOrders.length === 0}
              className="shipping-export-btn disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <DocumentArrowDownIcon className="h-4 w-4" />
              {exportMutation.isPending ? 'Exporting…' : 'Export'}
            </button>
          </div>
        </div>

        {/* Orders List */}
        {loading ? (
          <div className="shipping-loading">
            <div className="shipping-loading-bars">
              {[1, 2, 3, 4, 5].map(i => (
                <div
                  key={i}
                  className="shipping-loading-bar"
                  style={{ animationDelay: `${i * 0.1}s` }}
                />
              ))}
            </div>
            <p className="shipping-loading-text">Loading shipments...</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="shipping-empty">
            <TruckIcon className="h-12 w-12 mb-3" />
            <p className="text-lg font-medium">No shipments found</p>
            <p className="text-sm">Try adjusting your search or filter criteria</p>
          </div>
        ) : (
          <div className="shipping-orders-grid">
            {filteredOrders.map((order, index) => {
              const statusConfig = getStatusConfig(order.status);
              const StatusIcon = statusConfig.icon;

              return (
                <div
                  key={order.id}
                  className={cn(
                    'shipping-order-card',
                    selectedOrder?.id === order.id && 'shipping-order-selected'
                  )}
                  style={{ animationDelay: `${index * 0.05}s` }}
                  onClick={() => setSelectedOrder(selectedOrder?.id === order.id ? null : order)}
                >
                  <div className="shipping-order-header">
                    <div className="shipping-order-info">
                      <h3 className="shipping-order-number">{order.orderNumber}</h3>
                      <p className="shipping-order-customer">{order.customerName}</p>
                    </div>
                    <div className={cn('shipping-order-status', statusConfig.className)}>
                      <StatusIcon className="h-4 w-4" />
                      <span>{statusConfig.label}</span>
                    </div>
                  </div>

                  <div className="shipping-order-details">
                    <div className="shipping-detail-row">
                      <div className="shipping-detail-item">
                        <CubeIcon className="h-4 w-4" />
                        <span>{order.itemCount} items</span>
                      </div>
                      <div className={cn('shipping-carrier-badge', getCarrierClass(order.carrier))}>
                        {order.carrier}
                      </div>
                    </div>

                    {order.items.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-1">
                        {order.items.map((item, itemIndex) => (
                          <div
                            key={`${order.id}-${item.sku}-${itemIndex}`}
                            className="flex items-center gap-1.5 bg-white/8 rounded-lg px-2 py-1 text-xs text-white/90"
                          >
                            {item.image ? (
                              <img
                                src={item.image}
                                alt={item.name}
                                className="w-8 h-8 rounded object-cover flex-shrink-0"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded bg-white/10 flex items-center justify-center flex-shrink-0">
                                <CubeIcon className="h-4 w-4 text-white/50" />
                              </div>
                            )}
                            <div className="flex flex-col min-w-0">
                              <span className="font-medium truncate max-w-[120px] text-white/90">
                                {item.name}
                              </span>
                              <span className="text-white/50">×{item.quantity}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="shipping-detail-row">
                      <div className="shipping-detail-item" style={{ alignItems: 'flex-start' }}>
                        <MapPinIcon className="h-4 w-4 mt-0.5 flex-shrink-0" />
                        <div className="flex flex-col gap-0.5">
                          {order.destination.company && (
                            <span className="font-medium">{order.destination.company}</span>
                          )}
                          <span>{order.destination.address}</span>
                          {order.destination.phone && (
                            <span className="opacity-60 text-xs">{order.destination.phone}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="shipping-tracking-row">
                      <span className="shipping-tracking-label">Tracking</span>
                      <span className="shipping-tracking-number">{order.trackingNumber}</span>
                    </div>
                  </div>

                  <div className="shipping-order-timeline">
                    <div className="shipping-timeline-item">
                      <div className="shipping-timeline-dot shipping-timeline-start" />
                      <div className="shipping-timeline-content">
                        <span className="shipping-timeline-label">Shipped</span>
                        <span className="shipping-timeline-time">
                          {formatDate(order.shippedAt)}
                        </span>
                      </div>
                    </div>
                    <div className="shipping-timeline-line" />
                    <div className="shipping-timeline-item">
                      <div
                        className={cn(
                          'shipping-timeline-dot',
                          order.status === 'delivered'
                            ? 'shipping-timeline-end'
                            : 'shipping-timeline-pending'
                        )}
                      />
                      <div className="shipping-timeline-content">
                        <span className="shipping-timeline-label">
                          {order.status === 'delivered' ? 'Delivered' : 'Est. Delivery'}
                        </span>
                        <span className="shipping-timeline-time">
                          {order.estimatedDelivery ? formatDate(order.estimatedDelivery) : '—'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {selectedOrder?.id === order.id && (
                    <div
                      className="shipping-order-expanded"
                      onClick={event => event.stopPropagation()}
                    >
                      <div className="shipping-expanded-section">
                        <h4 className="shipping-expanded-title">Tracking History</h4>
                        <div className="shipping-tracking-history">
                          {order.trackingNumber !== '—' ? (
                            <TrackingPanel
                              connote={
                                parseShipmentConnotes(order.trackingNumber)[0] ||
                                order.trackingNumber
                              }
                              onConsignmentDeleted={handleDeletedConsignment}
                            />
                          ) : (
                            <p className="shipping-history-status text-xs opacity-60">
                              No tracking number available
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="mt-4 space-y-3">
                        <DocumentBlock
                          title="Packing Slip"
                          description="Small live preview of the original packing slip."
                          icon={DocumentTextIcon}
                          isOpen={isPackingSlipOpen}
                          onToggle={() => setIsPackingSlipOpen(current => !current)}
                          preview={
                            isLoadingOrderDetail ? (
                              <div className="flex h-56 items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 text-sm text-slate-500">
                                Loading packing slip preview...
                              </div>
                            ) : selectedOrderDetail ? (
                              <div className="h-56 overflow-hidden bg-slate-100">
                                <div
                                  className="origin-top-left"
                                  style={{
                                    width: '625%',
                                    transform: 'scale(0.16)',
                                    transformOrigin: 'top left',
                                  }}
                                >
                                  <FulfillmentPackingSlip
                                    order={selectedOrderDetail}
                                    pickedByLabel={selectedOrderPickedByLabel}
                                    packedByLabel={selectedOrderPackedByLabel}
                                    itemImageMap={selectedOrderItemImageMap}
                                    containerId={`${packingSlipElementId}-preview`}
                                  />
                                </div>
                              </div>
                            ) : (
                              <div className="flex h-56 items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 text-sm text-slate-500">
                                Packing slip preview unavailable
                              </div>
                            )
                          }
                        >
                          <div className="flex flex-wrap items-center gap-3">
                            <button
                              type="button"
                              onClick={handlePrintPackingSlip}
                              disabled={isLoadingOrderDetail}
                              className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              <PrinterIcon className="h-4 w-4" />
                              Reprint
                            </button>
                            <button
                              type="button"
                              onClick={handleDownloadPackingSlip}
                              disabled={isLoadingOrderDetail}
                              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              <DocumentArrowDownIcon className="h-4 w-4" />
                              Download
                            </button>
                          </div>
                          <div className="mt-3 rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
                            {isLoadingOrderDetail ? (
                              <p>Loading packing slip details...</p>
                            ) : selectedOrderDetail ? (
                              <div className="space-y-4">
                                <div className="grid gap-2 sm:grid-cols-2">
                                  <p>
                                    <span className="font-medium text-slate-900">Sales Order:</span>{' '}
                                    {selectedOrderDetail.netsuiteSoTranId ||
                                      selectedOrderDetail.orderId}
                                  </p>
                                  <p>
                                    <span className="font-medium text-slate-900">Fulfillment:</span>{' '}
                                    {selectedOrderDetail.netsuiteIfTranId || 'Pending'}
                                  </p>
                                  <p>
                                    <span className="font-medium text-slate-900">Carrier:</span>{' '}
                                    {selectedOrderDetail.carrier || 'N/A'}
                                  </p>
                                  <p>
                                    <span className="font-medium text-slate-900">Items:</span>{' '}
                                    {selectedOrderDetail.items?.length || 0}
                                  </p>
                                </div>
                                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                                  <div className="max-h-[42rem] overflow-auto">
                                    <FulfillmentPackingSlip
                                      order={selectedOrderDetail}
                                      pickedByLabel={selectedOrderPickedByLabel}
                                      packedByLabel={selectedOrderPackedByLabel}
                                      itemImageMap={selectedOrderItemImageMap}
                                      containerId={packingSlipElementId}
                                    />
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <p>Packing slip data is not available for this order yet.</p>
                            )}
                          </div>
                        </DocumentBlock>

                        <DocumentBlock
                          title="NZC Ticket Label"
                          description="Small live preview of the NZC shipping label."
                          icon={TagIcon}
                          isOpen={isNzcLabelOpen}
                          onToggle={() => setIsNzcLabelOpen(current => !current)}
                          badge={
                            selectedConnotes.length > 1
                              ? `${selectedConnotes.length} labels`
                              : undefined
                          }
                          preview={
                            selectedConnotes.length === 0 ? (
                              <div className="flex h-56 items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 text-sm text-slate-500">
                                No NZC label attached
                              </div>
                            ) : isLoadingLabels ? (
                              <div className="flex h-56 items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 text-sm text-slate-500">
                                Loading label preview...
                              </div>
                            ) : primaryLabelSource ? (
                              <div className="relative flex h-56 items-center justify-center bg-[radial-gradient(circle_at_top,#f8fafc,#e2e8f0)] p-4">
                                <div className="max-h-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-md">
                                  {primaryLabelSource.isPdf ? (
                                    <iframe
                                      src={primaryLabelSource.src}
                                      title="NZC Label Preview"
                                      className="h-48 w-72 pointer-events-none"
                                    />
                                  ) : (
                                    <img
                                      src={primaryLabelSource.src}
                                      alt="NZC Label Preview"
                                      className="h-48 w-auto object-contain"
                                    />
                                  )}
                                </div>
                                {selectedConnotes.length > 1 ? (
                                  <div className="absolute right-4 top-4 rounded-full bg-slate-900 px-2.5 py-1 text-xs font-semibold text-white shadow">
                                    +{selectedConnotes.length - 1} more
                                  </div>
                                ) : null}
                              </div>
                            ) : (
                              <div className="flex h-56 items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 text-sm text-slate-500">
                                Label preview unavailable
                              </div>
                            )
                          }
                        >
                          {selectedConnotes.length === 0 ? (
                            <p className="text-sm text-slate-500">
                              No NZC connote is attached to this shipment.
                            </p>
                          ) : isLoadingLabels ? (
                            <p className="text-sm text-slate-500">Loading NZC label preview...</p>
                          ) : (
                            <div className="space-y-4">
                              {(selectedLabels || []).map(({ connote, label }: LabelPreview) => {
                                const labelSource = getLabelSource(label);
                                return (
                                  <div
                                    key={connote}
                                    className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                                  >
                                    <div className="flex flex-wrap items-center justify-between gap-3">
                                      <div>
                                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                                          Connote
                                        </p>
                                        <p className="text-base font-semibold text-slate-900">
                                          {connote}
                                        </p>
                                      </div>
                                      <div className="flex flex-wrap items-center gap-2">
                                        <button
                                          type="button"
                                          onClick={() => handleReprintLabel(connote)}
                                          disabled={!!reprintingConnotes[connote]}
                                          className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
                                        >
                                          <PrinterIcon className="h-4 w-4" />
                                          Reprint
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handlePrintLabel(label)}
                                          className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                                        >
                                          <PrinterIcon className="h-4 w-4" />
                                          Print
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleDownloadLabel(connote, label)}
                                          className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                                        >
                                          <DocumentArrowDownIcon className="h-4 w-4" />
                                          Download
                                        </button>
                                      </div>
                                    </div>
                                    <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white">
                                      {labelSource.isPdf ? (
                                        <iframe
                                          src={labelSource.src}
                                          title={`NZC Label ${connote}`}
                                          className="h-[480px] w-full"
                                        />
                                      ) : (
                                        <img
                                          src={labelSource.src}
                                          alt={`NZC Label ${connote}`}
                                          className="max-h-[480px] w-full object-contain"
                                        />
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </DocumentBlock>
                      </div>
                    </div>
                  )}

                  <div className="shipping-order-footer">
                    <button
                      className="shipping-track-btn"
                      onClick={e => {
                        e.stopPropagation();
                        setSelectedOrder(selectedOrder?.id === order.id ? null : order);
                      }}
                    >
                      {selectedOrder?.id === order.id ? 'Hide Tracking' : 'Track Package'}
                      <ChevronRightIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

export default ShippedOrdersPage;
