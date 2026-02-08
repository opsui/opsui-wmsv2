/**
 * Order queue page - Premium dark theme
 *
 * Lists available orders for pickers to claim
 */

import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useOrderQueue, useClaimOrder, useContinueOrder } from '@/services/api';
import {
  Card,
  CardContent,
  Button,
  Header,
  Pagination,
  useToast,
  Breadcrumb,
} from '@/components/shared';
import { OrderPriorityBadge, OrderStatusBadge } from '@/components/shared';
import { formatDate } from '@/lib/utils';
import { useAuthStore } from '@/stores';
import { usePageTracking, PageViews } from '@/hooks/usePageTracking';
import { useOrderUpdates } from '@/hooks/useWebSocket';
import {
  ShoppingBagIcon,
  MagnifyingGlassIcon,
  ClipboardDocumentListIcon,
  QueueListIcon,
  ExclamationTriangleIcon,
  ChartBarIcon,
  ArrowPathIcon,
  ChevronDownIcon,
} from '@heroicons/react/24/outline';
import { OrderPriority, OrderStatus } from '@opsui/shared';

// ============================================================================
// FILTER DROPDOWN COMPONENTS
// ============================================================================

interface StatusFilterDropdownProps {
  value: OrderStatus;
  onChange: (status: OrderStatus) => void;
}

function StatusFilterDropdown({ value, onChange }: StatusFilterDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const options = [
    { value: 'PENDING' as OrderStatus, label: 'Pending', icon: ShoppingBagIcon },
    { value: 'PICKING' as OrderStatus, label: 'Tote', icon: ClipboardDocumentListIcon },
  ];

  const selectedOption = options.find(opt => opt.value === value);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative z-[9999]" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
          isOpen
            ? 'bg-primary-600 text-white shadow-lg'
            : 'bg-white/[0.05] text-gray-300 hover:bg-white/[0.08] hover:text-white border border-white/[0.08]'
        }`}
      >
        {selectedOption && <selectedOption.icon className="h-4 w-4" />}
        <span>{selectedOption?.label}</span>
        <ChevronDownIcon
          className={`h-3 w-3 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-48 bg-gray-900 rounded-lg border border-white/[0.08] shadow-2xl animate-fade-in">
          <div className="py-2">
            {options.map(option => {
              const OptionIcon = option.icon;
              const isActive = option.value === value;
              return (
                <button
                  key={option.value}
                  onClick={() => {
                    onChange(option.value);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-all duration-200 group ${
                    isActive
                      ? 'text-white bg-primary-600'
                      : 'text-gray-300 hover:text-white hover:bg-white/[0.05]'
                  }`}
                >
                  <OptionIcon
                    className={`h-4 w-4 flex-shrink-0 transition-colors duration-200 ${
                      isActive ? 'text-white' : 'text-gray-500 group-hover:text-gray-400'
                    }`}
                  />
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

interface PriorityFilterDropdownProps {
  value: OrderPriority | undefined;
  onChange: (priority: OrderPriority | undefined) => void;
}

function PriorityFilterDropdown({ value, onChange }: PriorityFilterDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const options = [
    { value: undefined as OrderPriority | undefined, label: 'All Priority', icon: QueueListIcon },
    { value: 'URGENT' as OrderPriority, label: 'Urgent', icon: ExclamationTriangleIcon },
    { value: 'HIGH' as OrderPriority, label: 'High', icon: ChartBarIcon },
    { value: 'NORMAL' as OrderPriority, label: 'Normal', icon: ClipboardDocumentListIcon },
    { value: 'LOW' as OrderPriority, label: 'Low', icon: ArrowPathIcon },
  ];

  const selectedOption = options.find(opt => opt.value === value);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative z-[9999]" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
          isOpen
            ? 'bg-primary-600 text-white shadow-lg'
            : 'bg-white/[0.05] text-gray-300 hover:bg-white/[0.08] hover:text-white border border-white/[0.08]'
        }`}
      >
        {selectedOption && <selectedOption.icon className="h-4 w-4" />}
        <span>{selectedOption?.label}</span>
        <ChevronDownIcon
          className={`h-3 w-3 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-48 bg-gray-900 rounded-lg border border-white/[0.08] shadow-2xl animate-fade-in">
          <div className="py-2">
            {options.map(option => {
              const OptionIcon = option.icon;
              const isActive = option.value === value;
              return (
                <button
                  key={option.label}
                  onClick={() => {
                    onChange(option.value);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-all duration-200 group ${
                    isActive
                      ? 'text-white bg-primary-600'
                      : 'text-gray-300 hover:text-white hover:bg-white/[0.05]'
                  }`}
                >
                  <OptionIcon
                    className={`h-4 w-4 flex-shrink-0 transition-colors duration-200 ${
                      isActive ? 'text-white' : 'text-gray-500 group-hover:text-gray-400'
                    }`}
                  />
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// COMPONENT
// ============================================================================

export function OrderQueuePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const canPick = useAuthStore(state => state.canPick);
  const userId = useAuthStore(state => state.user?.userId);
  const { showToast } = useToast();

  // Track current page for admin dashboard
  usePageTracking({ view: PageViews.ORDER_QUEUE });

  const [statusFilter, setStatusFilter] = useState<OrderStatus>(OrderStatus.PENDING);
  const [priorityFilter, setPriorityFilter] = useState<OrderPriority | undefined>();
  const [claimingOrderId, setClaimingOrderId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Read status from URL params immediately on every render
  const urlStatus = searchParams.get('status') as OrderStatus | null;
  const effectiveStatusFilter =
    urlStatus && Object.values(OrderStatus).includes(urlStatus) ? urlStatus : statusFilter;

  // Ref to prevent multiple simultaneous claim attempts (synchronous check)
  const isClaimingRef = useRef(false);
  // Ref to track last claimed order to prevent duplicate WebSocket toasts
  const lastClaimedOrderIdRef = useRef<string | null>(null);
  const isAdmin = useAuthStore(state => state.user?.role === 'ADMIN');
  const getEffectiveRole = useAuthStore(state => state.getEffectiveRole);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const { data: queueData, isLoading } = useOrderQueue({
    status: statusFilter,
    priority: priorityFilter,
    pickerId: statusFilter === 'PICKING' && !(isAdmin && !getEffectiveRole()) ? userId : undefined,
    page,
    limit: pageSize,
  });

  // Separate query to check if user has PICKING orders (for auto-detect)
  // This fetches ALL orders (no status filter) to check for PICKING status
  const allOrdersQuery = useOrderQueue({
    status: undefined as OrderStatus | undefined, // No status filter - get all orders
    pickerId: userId, // Only this picker's orders
    page: 1,
    limit: 100, // Fetch enough orders to detect PICKING status
  });
  const allOrdersData = allOrdersQuery.data;

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [statusFilter, priorityFilter]);

  // Debug: Log orders to see if items are included (must be before any conditional returns)
  const orders = queueData?.orders || [];

  // Filter orders based on search query
  const filteredOrders = useMemo(() => {
    if (!searchQuery.trim()) {
      return orders;
    }

    const query = searchQuery.toLowerCase().trim();

    return orders.filter(order => {
      // Search in order ID
      if (order.orderId.toLowerCase().includes(query)) {
        return true;
      }

      // Search in customer name
      if (order.customerName?.toLowerCase().includes(query)) {
        return true;
      }

      // Search in items (SKU and name)
      if (order.items && order.items.length > 0) {
        return order.items.some(item => {
          // Search in SKU
          if (item.sku?.toLowerCase().includes(query)) {
            return true;
          }
          // Search in item name
          if (item.name?.toLowerCase().includes(query)) {
            return true;
          }
          return false;
        });
      }

      return false;
    });
  }, [orders, searchQuery]);
  useEffect(() => {
    if (orders.length > 0) {
      console.log('[OrderQueue] Orders loaded:', orders);
      console.log('[OrderQueue] First order:', orders[0]);
      console.log('[OrderQueue] First order items:', orders[0].items);
      console.log('[OrderQueue] First order items length:', orders[0].items?.length);
      // Log all orders with their item counts
      orders.forEach((order, idx) => {
        console.log(
          `[OrderQueue] Order ${idx + 1}: ${order.orderId}, Status: ${order.status}, Items: ${order.items?.length || 0}`
        );
      });
    }
  }, [orders]);

  // Track if we've done the initial auto-detect
  const hasAutoDetectedRef = useRef(false);

  // Handler to update status filter and sync with URL
  const handleStatusFilterChange = (status: OrderStatus) => {
    setStatusFilter(status);
    // Update URL params to reflect the change
    setSearchParams({ status });
    // Mark as auto-detected since user manually changed it
    hasAutoDetectedRef.current = true;
  };

  // Auto-detect which tab to show based on whether picker has items in tote
  // Priority: 1) PICKING orders (tote), 2) URL status, 3) default to PENDING
  useEffect(() => {
    // Skip if we already auto-detected or user manually navigated
    if (hasAutoDetectedRef.current) {
      console.log('[OrderQueue] Skipping auto-detect - already done');
      return;
    }

    const urlStatus = searchParams.get('status') as OrderStatus | null;
    console.log('[OrderQueue] Auto-detect check - URL status:', urlStatus);
    console.log(
      '[OrderQueue] allOrdersData:',
      allOrdersData,
      'isLoading:',
      allOrdersQuery.isLoading
    );

    if (allOrdersData?.orders) {
      // Data loaded - first check for PICKING orders (highest priority)
      const allOrders = allOrdersData.orders || [];
      const pickingOrders = allOrders.filter(o => o.status === OrderStatus.PICKING);
      console.log(
        '[OrderQueue] Auto-detect: total orders:',
        allOrders.length,
        'PICKING orders:',
        pickingOrders.length
      );

      if (pickingOrders.length > 0) {
        console.log('[OrderQueue] Picker has items in tote, showing TOTE tab');
        setStatusFilter(OrderStatus.PICKING);
        // Update URL to show we're on TOTE tab (helps with back navigation)
        setSearchParams({ status: OrderStatus.PICKING });
        hasAutoDetectedRef.current = true;
        return;
      }

      // No PICKING orders - check URL or default to PENDING
      if (urlStatus && Object.values(OrderStatus).includes(urlStatus)) {
        console.log('[OrderQueue] No PICKING orders, using URL status:', urlStatus);
        setStatusFilter(urlStatus);
      } else {
        console.log('[OrderQueue] No items in tote and no URL status, defaulting to PENDING');
        setStatusFilter(OrderStatus.PENDING);
      }
      hasAutoDetectedRef.current = true;
    } else {
      console.log('[OrderQueue] Waiting for data to load...');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allOrdersData, searchParams]);

  // Refetch orders when component mounts or filter changes to get fresh progress data
  useEffect(() => {
    queryClient.invalidateQueries({ queryKey: ['orders'] });
  }, [queryClient, statusFilter, priorityFilter]);

  // ==========================================================================
  // Real-time WebSocket Subscriptions
  // ==========================================================================

  // Subscribe to order updates for real-time queue updates
  useOrderUpdates(
    (data: { orderId: string; pickerId?: string; pickerName?: string; reason?: string }) => {
      // Refresh order queue for all events
      queryClient.invalidateQueries({ queryKey: ['order-queue'] });

      // CRITICAL: Only show toast for claim events NOT initiated by current user
      // Don't show if we just claimed this order ourselves (prevents duplicate notifications)
      if (data.orderId === lastClaimedOrderIdRef.current) {
        // We just claimed this order, don't show WebSocket toast
        // Clear the ref after a short delay to allow for future updates
        setTimeout(() => {
          if (lastClaimedOrderIdRef.current === data.orderId) {
            lastClaimedOrderIdRef.current = null;
          }
        }, 2000);
        return;
      }

      // Only show toast for claims by other users, not for unclaims
      const isOtherUsersClaim = data.pickerId && data.pickerId !== userId;
      if (isOtherUsersClaim) {
        showToast(
          `Order ${data.orderId} has been claimed by ${data.pickerName || data.pickerId}`,
          'success',
          3000
        );
      }
    }
  );

  const claimMutation = useClaimOrder();
  const continueMutation = useContinueOrder();

  const handleClaimOrder = async (orderId: string, orderStatus: OrderStatus) => {
    if (!userId) {
      showToast('You must be logged in to claim orders', 'error');
      return;
    }

    // For PICKING orders, call continue endpoint to log the action
    if (orderStatus === OrderStatus.PICKING) {
      try {
        await continueMutation.mutateAsync({ orderId });
      } catch {
        // Silently ignore errors - continue is just for audit logging
      }
      // Invalidate picker activity cache so admin dashboard shows this as current order
      queryClient.invalidateQueries({ queryKey: ['metrics', 'picker-activity'] });
      navigate(`/orders/${orderId}/pick`);
      return;
    }

    // For PENDING orders, claim the order
    // CRITICAL: Synchronous check to prevent multiple simultaneous claims
    // Use ref for immediate check before async operations
    if (isClaimingRef.current) {
      console.log('[OrderQueue] Already claiming an order, ignoring click');
      return;
    }

    // Also check the state-based lock (redundant but safe)
    if (claimingOrderId === orderId) {
      return;
    }

    // Set both ref and state for maximum protection
    isClaimingRef.current = true;
    setClaimingOrderId(orderId);
    lastClaimedOrderIdRef.current = orderId; // Track this order as just claimed

    try {
      await claimMutation.mutateAsync({
        orderId,
        dto: { pickerId: userId },
      });
      showToast(`Order ${orderId} claimed successfully`, 'success');

      // Navigate to picking page for the claimed order
      navigate(`/orders/${orderId}/pick`);
    } catch (error: any) {
      // Handle specific error messages based on response
      if (error?.response?.data?.error) {
        const backendError = error.response.data.error;

        if (backendError.includes('already claimed')) {
          showToast('Order is already claimed by another picker', 'error');
        } else if (backendError.includes('status')) {
          showToast(`Order cannot be claimed: ${backendError}`, 'error');
        } else if (backendError.includes('too many active orders')) {
          showToast(
            'You have reached the maximum of 5 active orders. Please complete some orders before claiming more.',
            'error'
          );
        } else {
          showToast(backendError, 'error');
        }
      } else {
        showToast(error instanceof Error ? error.message : 'Failed to claim order', 'error');
      }
    } finally {
      isClaimingRef.current = false;
      setClaimingOrderId(null);
    }
  };

  if (!canPick) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card variant="glass" className="max-w-md">
          <CardContent className="p-6 text-center">
            <p className="text-gray-400">You need picker privileges to view this page.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-gray-400">Loading order queue...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen overflow-x-hidden">
      <Header />
      <main className="w-full px-4 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-6 sm:space-y-8 animate-in overflow-x-hidden">
        {/* Breadcrumb Navigation */}
        <Breadcrumb />
        {/* Page Header - Centered */}
        <div className="text-center">
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Order Queue</h1>
          <p className="mt-2 text-gray-400 text-responsive-sm">
            {queueData?.total || 0} order{(queueData?.total || 0) !== 1 ? 's' : ''} available
          </p>
        </div>

        {/* Filter Bar - Status and Priority filters */}
        <div className="flex flex-wrap items-center justify-center gap-3">
          <StatusFilterDropdown value={statusFilter} onChange={handleStatusFilterChange} />
          <PriorityFilterDropdown value={priorityFilter} onChange={setPriorityFilter} />
        </div>

        {/* Search Bar - Below Header */}
        <div className="flex justify-center">
          <div className="w-full max-w-2xl relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search order"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{ fontSize: '16px' }}
              className="w-full pl-11 pr-4 py-2.5 bg-white/[0.05] border border-white/[0.08] rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-primary-500/50 focus:bg-white/[0.08] transition-all duration-300"
            />
          </div>
        </div>

        {/* Order List - Centered */}
        {filteredOrders.length === 0 ? (
          <Card variant="glass" className="card-hover">
            <CardContent className="p-8 sm:p-16 text-center">
              <ShoppingBagIcon className="h-12 w-12 sm:h-16 sm:w-16 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400 text-responsive-sm">
                {searchQuery ? 'No orders match your search' : 'No orders available'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6 justify-center">
            {filteredOrders.map(order => (
              <Card key={order.orderId} variant="glass" className="card-hover group flex flex-col">
                <CardContent className="p-4 sm:p-5 flex-1 flex flex-col">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-white text-base sm:text-lg tracking-tight truncate">
                        {order.orderId}
                      </h3>
                      <p className="text-sm text-gray-400 mt-1 truncate">{order.customerName}</p>
                    </div>
                    <div className="flex flex-col gap-2 ml-2">
                      <OrderPriorityBadge priority={order.priority} />
                      <OrderStatusBadge status={order.status} />
                    </div>
                  </div>

                  {/* Scrollable content area */}
                  <div className="flex-1 overflow-y-auto space-y-3 text-sm text-gray-400 overflow-x-hidden">
                    <div className="flex items-center justify-between">
                      <span>Items:</span>
                      <span className="text-white font-medium">{order.items?.length || 0}</span>
                    </div>
                    {order.totalAmount != null && (
                      <div className="flex items-center justify-between">
                        <span>Total:</span>
                        <span className="text-white font-medium">
                          {order.currency || 'NZD'} ${Number(order.totalAmount).toFixed(2)}
                        </span>
                      </div>
                    )}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span>Progress:</span>
                        <span className="text-white font-medium">{order.progress}%</span>
                      </div>
                      {/* Progress bar */}
                      <div className="w-full bg-white/[0.05] rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-primary-500 to-primary-400 h-full rounded-full transition-all duration-500"
                          style={{ width: `${order.progress}%` }}
                        />
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Created:</span>
                      <span className="text-white font-medium text-xs sm:text-sm">
                        {formatDate(order.createdAt)}
                      </span>
                    </div>

                    {/* Show items with details - always visible */}
                    {order.items && order.items.length > 0 ? (
                      <div className="mt-4 pt-4 border-t border-white/[0.08]">
                        <p className="font-medium text-gray-300 mb-3 text-xs uppercase tracking-wider">
                          Items to Pick:
                        </p>
                        <div className="space-y-2">
                          {order.items.map((item, itemIdx) => {
                            // Check if item is completed (COMPLETED for pick_tasks, FULLY_PICKED for order_items)
                            const isCompleted =
                              item.status === 'COMPLETED' ||
                              item.status === 'FULLY_PICKED' ||
                              item.pickedQuantity >= item.quantity;
                            const isSkipped = item.status === 'SKIPPED';
                            const isPartial =
                              !isCompleted &&
                              !isSkipped &&
                              item.pickedQuantity > 0 &&
                              item.pickedQuantity < item.quantity;
                            const itemStatusColor = isCompleted
                              ? 'text-success-400 bg-success-500/10 border-success-500/20'
                              : isSkipped
                                ? 'text-warning-400 bg-warning-500/10 border-warning-500/20'
                                : isPartial
                                  ? 'text-primary-400 bg-primary-500/10 border-primary-500/20'
                                  : 'text-gray-400 bg-white/[0.02] border-white/[0.05]';

                            return (
                              <div
                                key={`${order.orderId}-item-${itemIdx}`}
                                className={`text-xs p-2.5 rounded-lg border ${itemStatusColor}`}
                              >
                                {/* First row: SKU and Name */}
                                <div className="flex items-start gap-2 mb-1.5">
                                  <span className="font-semibold text-xs break-all">
                                    {item.sku}
                                  </span>
                                  <span className="text-gray-500 flex-shrink-0">"</span>
                                  <span className="text-gray-300 break-all">{item.name}</span>
                                </div>
                                {/* Second row: Location and Quantity */}
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-gray-400 text-xs">
                                    Loc:{' '}
                                    <span className="text-white font-medium">
                                      {item.binLocation}
                                    </span>
                                  </span>
                                  <span className="font-semibold text-sm">
                                    {isSkipped
                                      ? 'Skipped'
                                      : `${item.pickedQuantity || 0}/${item.quantity}`}
                                  </span>
                                </div>
                                {/* Third row: Pricing (if available) */}
                                {item.unitPrice != null && (
                                  <div className="flex items-center justify-between text-xs border-t border-white/[0.05] pt-1 mt-1">
                                    <span className="text-gray-500">
                                      {item.currency || 'NZD'} ${Number(item.unitPrice).toFixed(2)}
                                      /ea
                                    </span>
                                    {item.lineTotal != null && (
                                      <span className="text-white font-medium">
                                        {item.currency || 'NZD'} $
                                        {Number(item.lineTotal).toFixed(2)}
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      <div className="mt-4 pt-4 border-t border-white/[0.08] text-xs text-gray-500">
                        No items available
                      </div>
                    )}
                  </div>

                  {/* Claim button - always at the bottom */}
                  <div className="mt-4 pt-4 border-t border-white/[0.08]">
                    <Button
                      fullWidth
                      size="sm"
                      variant="primary"
                      onClick={() => handleClaimOrder(order.orderId, order.status)}
                      disabled={
                        claimMutation.isPending ||
                        (order.status !== 'PENDING' && order.status !== 'PICKING') ||
                        (order.status === 'PENDING' && claimingOrderId === order.orderId)
                      }
                      isLoading={order.status === 'PENDING' && claimingOrderId === order.orderId}
                      className="group-hover:shadow-glow transition-all duration-300 touch-target"
                    >
                      {order.status === 'PICKING' ? 'Continue' : 'Claim'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Pagination */}
        {queueData?.total && queueData.total > 0 && (
          <Pagination
            currentPage={page}
            totalItems={queueData.total}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
            pageSizeOptions={[10, 20, 50, 100]}
          />
        )}
      </main>
    </div>
  );
}
