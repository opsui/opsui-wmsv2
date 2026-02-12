/**
 * Packing queue page
 *
 * Shows orders ready to be packed and currently assigned orders
 */

import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useClaimOrderForPacking } from '@/services/api';
import {
  Card,
  CardContent,
  Button,
  Header,
  Pagination,
  useToast,
  Breadcrumb,
} from '@/components/shared';
import { TaskStatusBadge } from '@/components/shared';
import { OrderStatus, OrderPriority, type Order } from '@opsui/shared';
import {
  ExclamationCircleIcon,
  CubeIcon,
  ClockIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';
import { useAuthStore } from '@/stores';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

// ============================================================================
// TYPES
// ============================================================================

type TabType = 'my-orders' | 'waiting';

// ============================================================================
// COMPONENT
// ============================================================================

export function PackingQueuePage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [filter, setFilter] = useState<'all' | 'high' | 'urgent'>('all');
  const [activeTab, setActiveTab] = useState<TabType>('waiting');
  const [searchQuery, setSearchQuery] = useState('');
  const currentUser = useAuthStore(state => state.user);

  // Pagination for my orders
  const [myOrdersCurrentPage, setMyOrdersCurrentPage] = useState(1);
  const myOrdersPerPage = 6;

  // Pagination for waiting orders
  const [waitingCurrentPage, setWaitingCurrentPage] = useState(1);
  const waitingPerPage = 6;

  // Get orders that are PICKED (ready for packing) - fetch full order details for accurate counts
  const {
    data: waitingData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['orders', 'full', OrderStatus.PICKED],
    queryFn: async () => {
      console.log('[PackingQueuePage] Fetching PICKED orders');
      const response = await apiClient.get(`/orders/full?status=${OrderStatus.PICKED}`);
      console.log('[PackingQueuePage] PICKED orders response:', response.data);
      return response.data;
    },
    refetchInterval: 5000, // Poll every 5 seconds for updates
  });

  // Get my current orders in PACKING status
  const { data: myOrdersData, isLoading: isLoadingMyOrders } = useQuery({
    queryKey: ['orders', 'full', OrderStatus.PACKING, currentUser?.userId],
    queryFn: async () => {
      if (!currentUser?.userId) return { orders: [] };
      console.log('[PackingQueuePage] Fetching PACKING orders for user:', currentUser.userId);
      const response = await apiClient.get(
        `/orders/full?status=${OrderStatus.PACKING}&packerId=${currentUser.userId}`
      );
      console.log('[PackingQueuePage] PACKING orders response:', response.data);
      return response.data;
    },
    enabled: !!currentUser?.userId,
    refetchInterval: 5000, // Poll every 5 seconds for updates
  });

  console.log('[PackingQueuePage] State:', {
    isLoading,
    isLoadingMyOrders,
    error,
    ordersCount: waitingData?.orders?.length,
    myOrdersCount: myOrdersData?.orders?.length,
  });

  const claimMutation = useClaimOrderForPacking();

  const orders = waitingData?.orders || [];
  const myOrders = myOrdersData?.orders || [];

  // Search filter for waiting orders
  const searchedOrders = useMemo(() => {
    if (!searchQuery.trim()) {
      return orders;
    }

    const query = searchQuery.toLowerCase().trim();

    return orders.filter((order: Order) => {
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

  // Search filter for my orders
  const searchedMyOrders = useMemo(() => {
    if (!searchQuery.trim()) {
      return myOrders;
    }

    const query = searchQuery.toLowerCase().trim();

    return myOrders.filter((order: Order) => {
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
  }, [myOrders, searchQuery]);

  // Filter by priority (applied after search)
  const filteredOrders = searchedOrders.filter((order: Order) => {
    if (filter === 'all') return true;
    if (filter === 'high') return order.priority === OrderPriority.HIGH;
    if (filter === 'urgent') return order.priority === OrderPriority.URGENT;
    return true;
  });

  // Auto-select tab: if user has active orders, show my-orders, otherwise show waiting
  useEffect(() => {
    if (searchedMyOrders.length > 0) {
      setActiveTab('my-orders');
    } else {
      setActiveTab('waiting');
    }
  }, [searchedMyOrders.length]);

  const handleClaimOrder = async (orderId: string) => {
    if (!currentUser?.userId) {
      console.error('No user ID found');
      return;
    }

    try {
      await claimMutation.mutateAsync(
        { orderId, packerId: currentUser.userId },
        {
          onSuccess: () => {
            showToast('Order claimed successfully', 'success');
            navigate(`/packing/${orderId}/pack`);
          },
        }
      );
    } catch (error: any) {
      console.error('Failed to claim order:', error);
      showToast(error?.message || 'Failed to claim order', 'error');
    }
  };

  const getPriorityColor = (priority: OrderPriority) => {
    switch (priority) {
      case OrderPriority.URGENT:
        return 'text-error-400 border-error-500/30 bg-error-500/10';
      case OrderPriority.HIGH:
        return 'text-warning-400 border-warning-500/30 bg-warning-500/10';
      case OrderPriority.NORMAL:
        return 'text-primary-400 border-primary-500/30 bg-primary-500/10';
      case OrderPriority.LOW:
        return 'text-gray-400 border-gray-500/30 bg-gray-500/10';
      default:
        return 'text-gray-400 border-gray-500/30 bg-gray-500/10';
    }
  };

  const getPriorityLabel = (priority: OrderPriority) => {
    switch (priority) {
      case OrderPriority.URGENT:
        return 'Urgent';
      case OrderPriority.HIGH:
        return 'High';
      case OrderPriority.NORMAL:
        return 'Normal';
      case OrderPriority.LOW:
        return 'Low';
      default:
        return 'Normal';
    }
  };

  return (
    <div className="min-h-screen">
      <Header />
      <main
        id="main-content"
        className="w-full px-4 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-6 sm:space-y-8 animate-in"
        // Safe area padding for notched devices
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 1rem)' }}
        tabIndex={-1}
      >
        {/* Breadcrumb Navigation */}
        <Breadcrumb />
        {/* Header - Responsive layout */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Packing Queue</h1>
            <p className="mt-1 sm:mt-2 text-gray-400 text-sm sm:text-base">Orders ready to be packed</p>
          </div>

          {/* Search Bar - Full width on mobile */}
          <div className="relative w-full sm:w-64">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="search"
              placeholder="Search order"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 sm:py-2.5 bg-white/[0.05] border border-white/[0.08] rounded-xl text-base sm:text-sm text-white placeholder-gray-500 focus:outline-none focus:border-primary-500/50 focus:bg-white/[0.08] transition-all duration-300"
              aria-label="Search orders"
            />
          </div>
        </div>

        {/* Tabs - Scrollable on mobile with touch-friendly targets */}
        <div className="flex items-center gap-2 sm:gap-3 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 sm:pb-0 touch-scroll">
          <Button
            variant={activeTab === 'my-orders' ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setActiveTab('my-orders')}
            disabled={searchedMyOrders.length === 0}
            className="min-h-touch whitespace-nowrap flex-shrink-0"
          >
            My Orders ({searchedMyOrders.length})
          </Button>
          <Button
            variant={activeTab === 'waiting' ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setActiveTab('waiting')}
            className="min-h-touch whitespace-nowrap flex-shrink-0"
          >
            Waiting ({filteredOrders.length})
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => navigate('/shipped-orders')}
            className="min-h-touch whitespace-nowrap flex-shrink-0"
          >
            Shipped Orders
          </Button>
        </div>

        {/* Priority Filters - only show on Waiting tab */}
        {activeTab === 'waiting' && (
          <div className="flex items-center gap-2 sm:gap-3 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 sm:pb-0 touch-scroll">
            <Button
              variant={filter === 'all' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setFilter('all')}
              className="min-h-touch whitespace-nowrap flex-shrink-0"
            >
              All
            </Button>
            <Button
              variant={filter === 'high' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setFilter('high')}
              className="min-h-touch whitespace-nowrap flex-shrink-0"
            >
              High Priority
            </Button>
            <Button
              variant={filter === 'urgent' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setFilter('urgent')}
              className="min-h-touch whitespace-nowrap flex-shrink-0"
            >
              Urgent
            </Button>
          </div>
        )}

        {/* My Orders Tab Content */}
        {activeTab === 'my-orders' && (
          <>
            {isLoadingMyOrders ? (
              <div className="flex items-center justify-center py-20">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
              </div>
            ) : searchedMyOrders.length === 0 ? (
              <Card variant="glass" className="card-hover">
                <CardContent className="p-12 text-center">
                  <ClockIcon className="h-16 w-16 text-gray-500 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-white mb-2">No active orders</h3>
                  <p className="text-gray-400">
                    {searchQuery
                      ? 'No orders match your search'
                      : "You don't have any orders currently assigned to you"}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {searchedMyOrders
                    .slice(
                      (myOrdersCurrentPage - 1) * myOrdersPerPage,
                      myOrdersCurrentPage * myOrdersPerPage
                    )
                    .map((order: any) => (
                      <Card
                        key={order.orderId}
                        variant="glass"
                        className="border-primary-500/50 border-2 shadow-glow card-hover cursor-pointer"
                        onClick={() => navigate(`/packing/${order.orderId}/pack`)}
                      >
                        <CardContent className="p-6 space-y-4">
                          {/* Header */}
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h3 className="font-bold text-white text-lg tracking-tight">
                                {order.orderId}
                              </h3>
                              <p className="text-sm text-gray-400 mt-1">{order.customerName}</p>
                            </div>
                            <span
                              className={`text-xs font-semibold px-3 py-1 rounded-full border ${getPriorityColor(
                                order.priority
                              )}`}
                            >
                              {getPriorityLabel(order.priority)}
                            </span>
                          </div>

                          {/* Stats */}
                          <div className="grid grid-cols-2 gap-4 py-4 border-t border-b border-white/[0.08]">
                            <div>
                              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">
                                Items
                              </p>
                              <p className="text-xl font-bold text-white">
                                {order.items?.length || 0}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">
                                Progress
                              </p>
                              <p className="text-xl font-bold text-primary-400">
                                {order.progress}%
                              </p>
                            </div>
                          </div>

                          {/* Status Badge */}
                          <div className="flex items-center justify-between">
                            <TaskStatusBadge status={order.status as any} />
                            <Button variant="primary" size="sm" className="shadow-glow">
                              Continue Packing
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                </div>

                {/* Pagination for My Orders */}
                {searchedMyOrders.length > myOrdersPerPage && (
                  <div className="flex justify-center mt-6">
                    <Pagination
                      currentPage={myOrdersCurrentPage}
                      totalItems={searchedMyOrders.length}
                      pageSize={myOrdersPerPage}
                      onPageChange={setMyOrdersCurrentPage}
                    />
                  </div>
                )}
              </>
            )}
          </>
        )}

        {/* Waiting Tab Content */}
        {activeTab === 'waiting' && (
          <>
            {/* Loading State */}
            {isLoading && (
              <div className="flex items-center justify-center py-20">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
              </div>
            )}

            {/* Error State */}
            {error && (
              <Card variant="glass" className="border-error-500/50 border-2">
                <CardContent className="p-8 text-center">
                  <ExclamationCircleIcon className="h-12 w-12 text-error-400 mx-auto mb-4" />
                  <p className="text-white font-semibold">Failed to load packing queue</p>
                  <Button onClick={() => refetch()} className="mt-4">
                    Retry
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Empty State */}
            {!isLoading && !error && filteredOrders.length === 0 && (
              <Card variant="glass" className="card-hover">
                <CardContent className="p-12 text-center">
                  <CubeIcon className="h-16 w-16 text-gray-500 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-white mb-2">No orders to pack</h3>
                  <p className="text-gray-400">
                    {filter === 'all'
                      ? 'There are no orders ready for packing'
                      : `No ${filter} priority orders ready for packing`}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Orders Grid */}
            {!isLoading && !error && filteredOrders.length > 0 && (
              <>
                {myOrders.length === 0 && (
                  <div className="mb-6">
                    <p className="text-sm text-gray-400 text-center">
                      Click an order below to start packing
                    </p>
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredOrders
                    .slice(
                      (waitingCurrentPage - 1) * waitingPerPage,
                      waitingCurrentPage * waitingPerPage
                    )
                    .map((order: Order) => (
                      <Card
                        key={order.orderId}
                        variant="glass"
                        className="card-hover group cursor-pointer"
                        onClick={() => handleClaimOrder(order.orderId)}
                      >
                        <CardContent className="p-6 space-y-4">
                          {/* Header */}
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h3 className="font-bold text-white text-lg tracking-tight group-hover:text-primary-400 transition-colors">
                                {order.orderId}
                              </h3>
                              <p className="text-sm text-gray-400 mt-1">{order.customerName}</p>
                            </div>
                            <span
                              className={`text-xs font-semibold px-3 py-1 rounded-full border ${getPriorityColor(
                                order.priority
                              )}`}
                            >
                              {getPriorityLabel(order.priority)}
                            </span>
                          </div>

                          {/* Stats */}
                          <div className="grid grid-cols-2 gap-4 py-4 border-t border-b border-white/[0.08]">
                            <div>
                              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">
                                Items
                              </p>
                              <p className="text-xl font-bold text-white">
                                {order.items?.length || 0}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">
                                Progress
                              </p>
                              <p className="text-xl font-bold text-success-400">
                                {order.progress}%
                              </p>
                            </div>
                          </div>

                          {/* Status Badge */}
                          <div className="flex items-center justify-between">
                            <TaskStatusBadge status={order.status as any} />
                            <Button
                              variant="primary"
                              size="sm"
                              className="shadow-glow"
                              disabled={claimMutation.isPending}
                            >
                              Start Packing
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                </div>

                {/* Pagination for Waiting Orders */}
                {filteredOrders.length > waitingPerPage && (
                  <div className="flex justify-center mt-6">
                    <Pagination
                      currentPage={waitingCurrentPage}
                      totalItems={filteredOrders.length}
                      pageSize={waitingPerPage}
                      onPageChange={setWaitingCurrentPage}
                    />
                  </div>
                )}
              </>
            )}
          </>
        )}
      </main>
    </div>
  );
}
