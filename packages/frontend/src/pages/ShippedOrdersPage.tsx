/**
 * Shipped Orders Page
 *
 * View and manage all shipped orders with tracking details,
 * filtering, and export capabilities.
 */

import { useState, useEffect, useMemo } from 'react';
import {
  TruckIcon,
  DocumentTextIcon,
  ArrowDownTrayIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  XMarkIcon,
  CalendarIcon,
  CheckIcon,
} from '@heroicons/react/24/outline';
import { OrderStatus, OrderPriority } from '@opsui/shared';
import { Header, Pagination, Card, Badge, Button, useToast } from '@/components/shared';
import { cn } from '@/lib/utils';
import { useShippedOrders, useExportShippedOrders } from '@/services/api';

// ============================================================================
// TYPES
// ============================================================================

interface ShippedOrder {
  id: string;
  orderId: string;
  customerName: string;
  status: OrderStatus;
  priority: OrderPriority;
  itemCount: number;
  totalValue: number;
  shippedAt: string;
  deliveredAt?: string;
  trackingNumber?: string;
  carrier?: string;
  shippingAddress: string;
  shippedBy: string;
  notes?: string;
}

interface FilterOptions {
  dateFrom: string;
  dateTo: string;
  carrier: string;
  search: string;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function ShippedOrdersPage() {
  const { showToast } = useToast();

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(20);

  // Filter state
  const [filters, setFilters] = useState<FilterOptions>({
    dateFrom: '',
    dateTo: '',
    carrier: '',
    search: '',
  });
  const [showFilters, setShowFilters] = useState(false);

  // Sort state
  const [sortBy, setSortBy] = useState<'shippedAt' | 'customerName' | 'totalValue'>('shippedAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Selected orders for export
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());

  // Fetch shipped orders
  const {
    data: shippedOrdersData,
    isLoading,
    error,
    refetch,
  } = useShippedOrders({
    page: currentPage,
    limit: pageSize,
    filters,
    sortBy,
    sortOrder,
  });

  const exportedOrdersMutation = useExportShippedOrders();

  // Handle filter changes
  const updateFilter = (key: keyof FilterOptions, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1); // Reset to first page when filters change
  };

  const clearFilters = () => {
    setFilters({
      dateFrom: '',
      dateTo: '',
      carrier: '',
      search: '',
    });
    setCurrentPage(1);
  };

  // Handle sort
  const handleSort = (column: 'shippedAt' | 'customerName' | 'totalValue') => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('desc');
    }
  };

  // Handle export
  const handleExport = async () => {
    if (selectedOrders.size === 0) {
      showToast({
        type: 'error',
        message: 'Please select orders to export',
      });
      return;
    }

    try {
      await exportedOrdersMutation.mutateAsync(Array.from(selectedOrders));
      showToast({
        type: 'success',
        message: `${selectedOrders.size} orders exported successfully`,
      });
      setSelectedOrders(new Set());
    } catch {
      showToast({
        type: 'error',
        message: 'Failed to export orders',
      });
    }
  };

  // Toggle order selection
  const toggleOrderSelection = (orderId: string) => {
    setSelectedOrders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(orderId)) {
        newSet.delete(orderId);
      } else {
        newSet.add(orderId);
      }
      return newSet;
    });
  };

  // Select all visible orders
  const toggleSelectAll = () => {
    if (shippedOrdersData?.orders) {
      const allSelected = shippedOrdersData.orders.every(order =>
        selectedOrders.has(order.id)
      );

      if (allSelected) {
        // Deselect all
        setSelectedOrders(new Set());
      } else {
        // Select all
        setSelectedOrders(
          new Set(shippedOrdersData.orders.map(order => order.id))
        );
      }
    }
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(dateString));
  };

  // Get priority badge color
  const getPriorityColor = (priority: OrderPriority) => {
    switch (priority) {
      case OrderPriority.URGENT:
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case OrderPriority.HIGH:
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      case OrderPriority.LOW:
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  // Get status badge color
  const getStatusColor = (status: OrderStatus) => {
    switch (status) {
      case OrderStatus.SHIPPED:
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case OrderStatus.DELIVERED:
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  // Calculate statistics
  const statistics = useMemo(() => {
    if (!shippedOrdersData?.orders) {
      return { totalOrders: 0, totalValue: 0, deliveredCount: 0, pendingDelivery: 0 };
    }

    const orders = shippedOrdersData.orders;
    return {
      totalOrders: orders.length,
      totalValue: orders.reduce((sum, order) => sum + order.totalValue, 0),
      deliveredCount: orders.filter(o => o.deliveredAt).length,
      pendingDelivery: orders.filter(o => !o.deliveredAt).length,
    };
  }, [shippedOrdersData]);

  const activeFiltersCount = Object.values(filters).filter(
    v => v !== '' && v !== null && v !== undefined
  ).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <Header
        title="Shipped Orders"
        icon={<TruckIcon className="h-6 w-6" />}
        description="View and manage all shipped orders"
      />

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Shipped</p>
              <p className="text-2xl font-bold">{shippedOrdersData?.total || 0}</p>
            </div>
            <TruckIcon className="h-8 w-8 text-gray-400" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Value</p>
              <p className="text-2xl font-bold">{formatCurrency(statistics.totalValue)}</p>
            </div>
            <DocumentTextIcon className="h-8 w-8 text-gray-400" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Delivered</p>
              <p className="text-2xl font-bold text-green-600">{statistics.deliveredCount}</p>
            </div>
            <CheckIcon className="h-8 w-8 text-green-500" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Pending Delivery</p>
              <p className="text-2xl font-bold text-orange-600">{statistics.pendingDelivery}</p>
            </div>
            <CalendarIcon className="h-8 w-8 text-orange-500" />
          </div>
        </Card>
      </div>

      {/* Filters and Actions */}
      <Card className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Search */}
          <div className="flex-1 min-w-[300px]">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by order ID, customer..."
                value={filters.search}
                onChange={e => updateFilter('search', e.target.value)}
                className={cn(
                  'w-full rounded-md border-0 py-2 pl-10 pr-4 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-primary-600 dark:bg-gray-800 dark:text-white dark:ring-gray-600',
                  activeFiltersCount > 0 && 'ring-2 ring-primary-600'
                )}
              />
            </div>
          </div>

          {/* Filter Button */}
          <Button
            variant="secondary"
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              'relative',
              activeFiltersCount > 0 && 'ring-2 ring-primary-600'
            )}
          >
            <FunnelIcon className="h-5 w-5 mr-2" />
            Filters
            {activeFiltersCount > 0 && (
              <span className="ml-2 rounded-full bg-primary-600 px-2 py-0.5 text-xs text-white">
                {activeFiltersCount}
              </span>
            )}
          </Button>

          {/* Export Button */}
          <Button
            variant="secondary"
            onClick={handleExport}
            disabled={selectedOrders.size === 0}
          >
            <ArrowDownTrayIcon className="h-5 w-5 mr-2" />
            Export ({selectedOrders.size})
          </Button>

          {/* Refresh Button */}
          <Button variant="secondary" onClick={() => refetch()} isLoading={isLoading}>
            Refresh
          </Button>
        </div>

        {/* Expandable Filters */}
        {showFilters && (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-4 border-t pt-4 dark:border-gray-700">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                From Date
              </label>
              <input
                type="date"
                value={filters.dateFrom}
                onChange={e => updateFilter('dateFrom', e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white sm:text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                To Date
              </label>
              <input
                type="date"
                value={filters.dateTo}
                onChange={e => updateFilter('dateTo', e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white sm:text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Carrier
              </label>
              <select
                value={filters.carrier}
                onChange={e => updateFilter('carrier', e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white sm:text-sm"
              >
                <option value="">All Carriers</option>
                <option value="FedEx">FedEx</option>
                <option value="UPS">UPS</option>
                <option value="DHL">DHL</option>
                <option value="USPS">USPS</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="flex items-end">
              <Button variant="secondary" onClick={clearFilters} className="w-full">
                <XMarkIcon className="h-5 w-5 mr-2" />
                Clear Filters
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Orders Table */}
      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            <p className="mt-2 text-gray-500">Loading shipped orders...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-red-600">
            Failed to load shipped orders
          </div>
        ) : shippedOrdersData?.orders && shippedOrdersData.orders.length > 0 ? (
          <>
            {/* Toolbar */}
            <div className="border-b px-6 py-3 bg-gray-50 dark:bg-gray-800 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <input
                  type="checkbox"
                  checked={shippedOrdersData.orders.every(order =>
                    selectedOrders.has(order.id)
                  )}
                  onChange={toggleSelectAll}
                  className="h-4 w-4 text-primary-600 rounded focus:ring-primary-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Select All ({shippedOrdersData.orders.length})
                </span>
              </div>

              <div className="text-sm text-gray-500">
                Showing {shippedOrdersData.orders.length} of {shippedOrdersData.total} orders
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-6 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={shippedOrdersData.orders.every(order =>
                          selectedOrders.has(order.id)
                        )}
                        onChange={toggleSelectAll}
                        className="h-4 w-4 text-primary-600 rounded focus:ring-primary-500"
                      />
                    </th>
                    <th
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700"
                      onClick={() => handleSort('customerName')}
                    >
                      Customer {sortBy === 'customerName' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </th>
                    <th
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700"
                      onClick={() => handleSort('shippedAt')}
                    >
                      Shipped Date {sortBy === 'shippedAt' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Order ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Items
                    </th>
                    <th
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700"
                      onClick={() => handleSort('totalValue')}
                    >
                      Value {sortBy === 'totalValue' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tracking
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Carrier
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                  {shippedOrdersData.orders.map(order => (
                    <tr
                      key={order.id}
                      className={cn(
                        'hover:bg-gray-50 dark:hover:bg-gray-800',
                        selectedOrders.has(order.id) && 'bg-primary-50 dark:bg-primary-900/20'
                      )}
                    >
                      <td className="px-6 py-4">
                        <input
                          type="checkbox"
                          checked={selectedOrders.has(order.id)}
                          onChange={() => toggleOrderSelection(order.id)}
                          className="h-4 w-4 text-primary-600 rounded focus:ring-primary-500"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {order.customerName}
                        </div>
                        <div className="text-xs text-gray-500">{order.shippingAddress}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900 dark:text-white">
                          {formatDate(order.shippedAt)}
                        </div>
                        <div className="text-xs text-gray-500">
                          by {order.shippedBy}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-mono text-primary-600 dark:text-primary-400">
                          {order.orderId}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                        {order.itemCount}
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">
                        {formatCurrency(order.totalValue)}
                      </td>
                      <td className="px-6 py-4">
                        {order.trackingNumber ? (
                          <span className="text-sm font-mono text-primary-600 dark:text-primary-400">
                            {order.trackingNumber}
                          </span>
                        ) : (
                          <span className="text-sm text-gray-400 italic">N/A</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                        {order.carrier || '-'}
                      </td>
                      <td className="px-6 py-4">
                        <Badge className={getStatusColor(order.status)}>
                          {order.deliveredAt ? 'Delivered' : 'In Transit'}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="border-t px-6 py-4 flex items-center justify-between">
              <div className="text-sm text-gray-700 dark:text-gray-300">
                Showing {((currentPage - 1) * pageSize) + 1} to{' '}
                {Math.min(currentPage * pageSize, shippedOrdersData.total)} of{' '}
                {shippedOrdersData.total} orders
              </div>
              <Pagination
                currentPage={currentPage}
                totalPages={Math.ceil((shippedOrdersData.total || 0) / pageSize)}
                onPageChange={setCurrentPage}
              />
            </div>
          </>
        ) : (
          <div className="p-8 text-center">
            <TruckIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No shipped orders found
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              {activeFiltersCount > 0
                ? 'Try adjusting your filters'
                : 'Orders will appear here once they are shipped'}
            </p>
          </div>
        )}
      </Card>
    </div>
  );
}
