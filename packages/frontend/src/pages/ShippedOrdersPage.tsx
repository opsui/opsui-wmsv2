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

import { useState, useEffect } from 'react';
import {
  TruckIcon,
  DocumentArrowDownIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon,
  ArrowRightIcon,
  ChevronRightIcon,
  CalendarIcon,
  MapPinIcon,
  CubeIcon,
} from '@heroicons/react/24/outline';
import { Header, Button, Badge, Breadcrumb } from '@/components/shared';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

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
  estimatedDelivery: string;
  status: 'in_transit' | 'out_for_delivery' | 'delivered' | 'exception';
  items: number;
  destination: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function ShippedOrdersPage() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<ShippedOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedOrder, setSelectedOrder] = useState<ShippedOrder | null>(null);

  useEffect(() => {
    // Simulated data - in real app, this would be an API call
    const mockOrders: ShippedOrder[] = [
      {
        id: '1',
        orderNumber: 'ORD-2024-001234',
        customerName: 'Acme Corp',
        carrier: 'FedEx',
        trackingNumber: '794644790230',
        shippedAt: '2024-01-15T10:30:00Z',
        estimatedDelivery: '2024-01-18T16:00:00Z',
        status: 'in_transit',
        items: 5,
        destination: 'Los Angeles, CA',
      },
      {
        id: '2',
        orderNumber: 'ORD-2024-001235',
        customerName: 'TechStart Inc',
        carrier: 'UPS',
        trackingNumber: '1Z999AA10123456784',
        shippedAt: '2024-01-15T11:45:00Z',
        estimatedDelivery: '2024-01-17T12:00:00Z',
        status: 'out_for_delivery',
        items: 2,
        destination: 'San Francisco, CA',
      },
      {
        id: '3',
        orderNumber: 'ORD-2024-001236',
        customerName: 'Global Retail',
        carrier: 'DHL',
        trackingNumber: '1234567890',
        shippedAt: '2024-01-14T09:00:00Z',
        estimatedDelivery: '2024-01-16T14:00:00Z',
        status: 'delivered',
        items: 8,
        destination: 'New York, NY',
      },
      {
        id: '4',
        orderNumber: 'ORD-2024-001237',
        customerName: 'Speed Logistics',
        carrier: 'USPS',
        trackingNumber: '9400111899223385111111',
        shippedAt: '2024-01-15T14:20:00Z',
        estimatedDelivery: '2024-01-19T18:00:00Z',
        status: 'exception',
        items: 3,
        destination: 'Chicago, IL',
      },
      {
        id: '5',
        orderNumber: 'ORD-2024-001238',
        customerName: 'Metro Supplies',
        carrier: 'FedEx',
        trackingNumber: '794644790231',
        shippedAt: '2024-01-15T08:15:00Z',
        estimatedDelivery: '2024-01-18T10:00:00Z',
        status: 'in_transit',
        items: 12,
        destination: 'Seattle, WA',
      },
    ];

    setTimeout(() => {
      setOrders(mockOrders);
      setLoading(false);
    }, 500);
  }, []);

  const filteredOrders = orders.filter(order => {
    const matchesSearch =
      order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.trackingNumber.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

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

  const handleExport = () => {
    // Export logic would go here
    alert('Export functionality would generate a CSV/PDF of shipped orders');
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
              <span className="shipping-stat-mini-value">{orders.length}</span>
              <span className="shipping-stat-mini-label">Total Shipped</span>
            </div>
            <div className="shipping-stat-mini">
              <span className="shipping-stat-mini-value shipping-stat-success">
                {orders.filter(o => o.status === 'delivered').length}
              </span>
              <span className="shipping-stat-mini-label">Delivered</span>
            </div>
            <div className="shipping-stat-mini">
              <span className="shipping-stat-mini-value shipping-stat-warning">
                {orders.filter(o => o.status === 'exception').length}
              </span>
              <span className="shipping-stat-mini-label">Exceptions</span>
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

            <button onClick={handleExport} className="shipping-export-btn">
              <DocumentArrowDownIcon className="h-4 w-4" />
              Export
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
                        <span>{order.items} items</span>
                      </div>
                      <div className={cn('shipping-carrier-badge', getCarrierClass(order.carrier))}>
                        {order.carrier}
                      </div>
                    </div>

                    <div className="shipping-detail-row">
                      <div className="shipping-detail-item">
                        <MapPinIcon className="h-4 w-4" />
                        <span>{order.destination}</span>
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
                          {formatDate(order.estimatedDelivery)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {selectedOrder?.id === order.id && (
                    <div className="shipping-order-expanded">
                      <div className="shipping-expanded-section">
                        <h4 className="shipping-expanded-title">Tracking History</h4>
                        <div className="shipping-tracking-history">
                          <div className="shipping-history-item">
                            <div className="shipping-history-dot shipping-history-active" />
                            <div className="shipping-history-content">
                              <span className="shipping-history-status">Package shipped</span>
                              <span className="shipping-history-location">Origin facility</span>
                              <span className="shipping-history-time">
                                {formatDate(order.shippedAt)}
                              </span>
                            </div>
                          </div>
                          <div className="shipping-history-item">
                            <div className="shipping-history-dot" />
                            <div className="shipping-history-content">
                              <span className="shipping-history-status">
                                In transit to destination
                              </span>
                              <span className="shipping-history-location">Regional hub</span>
                            </div>
                          </div>
                          <div className="shipping-history-item">
                            <div className="shipping-history-dot" />
                            <div className="shipping-history-content">
                              <span className="shipping-history-status">Out for delivery</span>
                              <span className="shipping-history-location">Local facility</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="shipping-order-footer">
                    <button className="shipping-track-btn">
                      Track Package
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
