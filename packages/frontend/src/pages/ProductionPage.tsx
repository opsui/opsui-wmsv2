/**
 * Production page
 *
 * Production management for manufacturing and assembly operations
 * - Unique design: Manufacturing line layout with production stages
 */

import { useSearchParams } from 'react-router-dom';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Header,
  Button,
  useToast,
  Pagination,
} from '@/components/shared';
import { useProductionOrders, useProductionDashboard } from '@/services/api';
import { useEffect, useState } from 'react';
import {
  WrenchScrewdriverIcon,
  ClipboardDocumentListIcon,
  ClockIcon,
  CheckCircleIcon,
  PlusIcon,
  CogIcon,
  UserIcon,
  PlayIcon,
  PauseIcon,
} from '@heroicons/react/24/outline';

// ============================================================================
// TYPES
// ============================================================================

type TabType = 'dashboard' | 'orders' | 'schedule' | 'maintenance';

interface ProductionOrder {
  orderId: string;
  productSku: string;
  productName: string;
  quantity: number;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'ON_HOLD';
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  startDate: string;
  endDate?: string;
  assignedTo?: string;
}

// ============================================================================
// SUBCOMPONENTS
// ============================================================================

// Production Line Stage - horizontal progress indicator
function ProductionLineStage({
  label,
  count,
  isActive,
  isCompleted,
  onClick,
}: {
  label: string;
  count: number;
  isActive: boolean;
  isCompleted: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 relative p-4 rounded-xl transition-all duration-300 ${
        isActive
          ? 'bg-primary-500/20 border-2 border-primary-500 shadow-lg shadow-primary-500/20'
          : isCompleted
            ? 'bg-success-500/10 border border-success-500/30 cursor-pointer hover:border-success-500/50'
            : 'bg-gray-800/50 border border-gray-700 cursor-pointer hover:border-gray-600'
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <span
          className={`text-sm font-semibold ${
            isActive ? 'text-white' : isCompleted ? 'text-success-400' : 'text-gray-400'
          }`}
        >
          {label}
        </span>
        <span
          className={`text-2xl font-bold ${
            isActive ? 'text-white' : isCompleted ? 'text-success-400' : 'text-gray-500'
          }`}
        >
          {count}
        </span>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-gray-700 rounded-full h-1.5">
        <div
          className={`h-1.5 rounded-full transition-all duration-300 ${
            isActive ? 'bg-primary-500' : isCompleted ? 'bg-success-500' : 'bg-gray-600'
          }`}
          style={{ width: isActive ? '75%' : isCompleted ? '100%' : '0%' }}
        />
      </div>

      {/* Arrow connector on the right */}
      <div
        className={`absolute -right-3 top-1/2 -translate-y-1/2 z-10 ${
          isCompleted ? 'text-success-500' : 'text-gray-700'
        }`}
      >
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </button>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    PENDING: 'bg-gray-500/20 text-gray-300 border border-gray-500/30',
    IN_PROGRESS: 'bg-primary-500/20 text-primary-300 border border-primary-500/30',
    COMPLETED: 'bg-success-500/20 text-success-300 border border-success-500/30',
    ON_HOLD: 'bg-warning-500/20 text-warning-300 border border-warning-500/30',
  };

  const labels: Record<string, string> = {
    PENDING: 'Queued',
    IN_PROGRESS: 'In Production',
    COMPLETED: 'Finished',
    ON_HOLD: 'On Hold',
  };

  return (
    <span
      className={`px-3 py-1 rounded-full text-xs font-semibold ${styles[status] || styles.PENDING}`}
    >
      {labels[status] || status}
    </span>
  );
}

function PriorityIndicator({ priority }: { priority: string }) {
  const colors: Record<string, string> = {
    LOW: 'bg-gray-500',
    NORMAL: 'bg-blue-500',
    HIGH: 'bg-orange-500',
    URGENT: 'bg-red-500 animate-pulse',
  };

  return (
    <div className="flex items-center gap-2">
      <div className={`w-2 h-2 rounded-full ${colors[priority] || colors.NORMAL}`} />
      <span className="text-xs text-gray-400">{priority}</span>
    </div>
  );
}

function ProductionOrderCard({ order }: { order: ProductionOrder }) {
  const progress =
    order.status === 'COMPLETED'
      ? 100
      : order.status === 'IN_PROGRESS'
        ? 60
        : order.status === 'ON_HOLD'
          ? 30
          : 0;

  return (
    <Card variant="glass" className="card-hover overflow-hidden">
      {/* Status bar */}
      <div
        className={`h-1 ${
          order.status === 'COMPLETED'
            ? 'bg-success-500'
            : order.status === 'IN_PROGRESS'
              ? 'bg-primary-500'
              : order.status === 'ON_HOLD'
                ? 'bg-warning-500'
                : 'bg-gray-500'
        }`}
      />

      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="text-lg font-semibold text-white">{order.orderId}</h3>
              <StatusBadge status={order.status} />
            </div>
            <p className="text-gray-300 font-medium">{order.productName}</p>
            <p className="text-sm text-gray-400 mt-1">SKU: {order.productSku}</p>
          </div>
          <PriorityIndicator priority={order.priority} />
        </div>

        {/* Production progress */}
        <div className="mb-4 p-3 bg-white/5 rounded-lg">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-400">Production Progress</span>
            <span className="text-white font-medium">{progress}%</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-300 ${
                order.status === 'COMPLETED'
                  ? 'bg-success-500'
                  : order.status === 'IN_PROGRESS'
                    ? 'bg-primary-500'
                    : order.status === 'ON_HOLD'
                      ? 'bg-warning-500'
                      : 'bg-gray-500'
              }`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-4 text-sm">
          <div className="bg-white/5 p-3 rounded-lg text-center">
            <p className="text-gray-400 text-xs mb-1">Quantity</p>
            <p className="text-lg font-bold text-white">{order.quantity}</p>
          </div>
          <div className="bg-white/5 p-3 rounded-lg text-center">
            <p className="text-gray-400 text-xs mb-1">Start Date</p>
            <p className="text-sm text-white">{new Date(order.startDate).toLocaleDateString()}</p>
          </div>
          {order.endDate && (
            <div className="bg-white/5 p-3 rounded-lg text-center">
              <p className="text-gray-400 text-xs mb-1">End Date</p>
              <p className="text-sm text-success-400">
                {new Date(order.endDate).toLocaleDateString()}
              </p>
            </div>
          )}
        </div>

        {order.assignedTo && (
          <div className="flex items-center gap-2 p-2 bg-primary-500/10 rounded-lg mb-4">
            <UserIcon className="h-4 w-4 text-primary-400" />
            <span className="text-sm text-gray-300">
              Assigned to: <span className="text-white font-medium">{order.assignedTo}</span>
            </span>
          </div>
        )}

        <div className="flex gap-2">
          <Button variant="secondary" size="sm" className="flex-1">
            View Details
          </Button>
          {order.status === 'PENDING' && (
            <Button
              variant="primary"
              size="sm"
              className="flex-1 flex items-center justify-center gap-1"
            >
              <PlayIcon className="h-4 w-4" />
              Start
            </Button>
          )}
          {order.status === 'IN_PROGRESS' && (
            <>
              <Button
                variant="warning"
                size="sm"
                className="flex-1 flex items-center justify-center gap-1"
              >
                <PauseIcon className="h-4 w-4" />
                Pause
              </Button>
              <Button variant="success" size="sm" className="flex-1">
                Complete
              </Button>
            </>
          )}
          {order.status === 'ON_HOLD' && (
            <Button
              variant="primary"
              size="sm"
              className="flex-1 flex items-center justify-center gap-1"
            >
              <PlayIcon className="h-4 w-4" />
              Resume
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// MAIN PAGE
// ============================================================================

function ProductionPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = (searchParams.get('tab') as TabType) || 'dashboard';
  const { showToast } = useToast();
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Fetch production data from backend
  const {
    data: dashboardData,
    isLoading: isDashboardLoading,
    error: dashboardError,
  } = useProductionDashboard();
  const {
    data: ordersData,
    isLoading: isOrdersLoading,
    error: ordersError,
  } = useProductionOrders();

  // Show error toasts
  useEffect(() => {
    if (dashboardError) {
      showToast('Failed to load production dashboard', 'error');
    }
  }, [dashboardError, showToast]);

  useEffect(() => {
    if (ordersError) {
      showToast('Failed to load production orders', 'error');
    }
  }, [ordersError, showToast]);

  // Use real data from backend or fallback to defaults
  const dashboard = dashboardData || {
    queued: 0,
    inProgress: 0,
    completedToday: 0,
    onHold: 0,
  };

  const orders: ProductionOrder[] = ordersData?.orders || [];

  // Show loading state
  const isLoading = isDashboardLoading || isOrdersLoading;

  // Pagination
  const totalOrders = orders.length;
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedOrders = orders.slice(startIndex, endIndex);

  const setTab = (tab: TabType) => {
    setSearchParams({ tab });
    setCurrentPage(1); // Reset pagination when changing tabs
  };

  // Production line stages
  const stages = [
    { id: 'queued' as const, label: 'Queued', count: dashboard.queued, tab: 'orders' as TabType },
    {
      id: 'in-progress' as const,
      label: 'In Production',
      count: dashboard.inProgress,
      tab: 'orders' as TabType,
    },
    {
      id: 'completed' as const,
      label: 'Completed',
      count: dashboard.completedToday,
      tab: 'orders' as TabType,
    },
    { id: 'on-hold' as const, label: 'On Hold', count: dashboard.onHold, tab: 'orders' as TabType },
  ];

  return (
    <div className="min-h-screen">
      <Header />

      <main className="w-full px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white tracking-tight">Production Line</h1>
          <p className="mt-2 text-gray-400">Manufacturing and assembly operations management</p>
        </div>

        {/* Loading Spinner */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="flex flex-col items-center gap-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
              <p className="text-gray-400 text-sm">Loading production data...</p>
            </div>
          </div>
        )}

        {/* Production Line Stages */}
        {!isLoading && (
          <div className="flex items-stretch gap-2 mb-8">
            {stages.map((stage, index) => (
              <div key={stage.id} className="flex-1 relative">
                <ProductionLineStage
                  label={stage.label}
                  count={stage.count}
                  isActive={false}
                  isCompleted={index < 2}
                  onClick={() => setTab(stage.tab)}
                />
                {index === stages.length - 1 && (
                  <div className="absolute -right-3 top-1/2 -translate-y-1/2 z-10 text-gray-700">
                    <CheckCircleIcon className="h-6 w-6" />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Dashboard Tab */}
        {!isLoading && currentTab === 'dashboard' && (
          <div className="space-y-8">
            {/* Overview Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card variant="glass" className="p-6 border-l-4 border-l-gray-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Queued Orders</p>
                    <p className="mt-2 text-3xl font-bold text-white">{dashboard.queued}</p>
                  </div>
                  <ClipboardDocumentListIcon className="h-8 w-8 text-gray-400" />
                </div>
              </Card>
              <Card variant="glass" className="p-6 border-l-4 border-l-primary-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">In Production</p>
                    <p className="mt-2 text-3xl font-bold text-white">{dashboard.inProgress}</p>
                  </div>
                  <WrenchScrewdriverIcon className="h-8 w-8 text-primary-400" />
                </div>
              </Card>
              <Card variant="glass" className="p-6 border-l-4 border-l-success-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Completed Today</p>
                    <p className="mt-2 text-3xl font-bold text-white">{dashboard.completedToday}</p>
                  </div>
                  <CheckCircleIcon className="h-8 w-8 text-success-400" />
                </div>
              </Card>
              <Card variant="glass" className="p-6 border-l-4 border-l-warning-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">On Hold</p>
                    <p className="mt-2 text-3xl font-bold text-white">{dashboard.onHold}</p>
                  </div>
                  <PauseIcon className="h-8 w-8 text-warning-400" />
                </div>
              </Card>
            </div>

            {/* Quick Actions */}
            <Card variant="glass">
              <CardHeader>
                <CardTitle>Production Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Button
                    variant="primary"
                    size="lg"
                    className="flex items-center justify-center gap-2"
                  >
                    <PlusIcon className="h-5 w-5" />
                    <span>New Production Order</span>
                  </Button>
                  <Button
                    variant="secondary"
                    size="lg"
                    className="flex items-center justify-center gap-2"
                    onClick={() => setTab('orders')}
                  >
                    <ClipboardDocumentListIcon className="h-5 w-5" />
                    <span>View All Orders</span>
                  </Button>
                  <Button
                    variant="secondary"
                    size="lg"
                    className="flex items-center justify-center gap-2"
                    onClick={() => setTab('schedule')}
                  >
                    <ClockIcon className="h-5 w-5" />
                    <span>Production Schedule</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Orders Tab */}
        {!isLoading && currentTab === 'orders' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-white">Production Orders</h2>
                <p className="text-gray-400 text-sm mt-1">
                  Manage manufacturing orders and track progress
                </p>
              </div>
              <Button variant="primary" className="flex items-center gap-2">
                <PlusIcon className="h-5 w-5" />
                New Order
              </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {paginatedOrders.map(order => (
                <ProductionOrderCard key={order.orderId} order={order} />
              ))}
            </div>

            {/* Pagination */}
            {totalOrders > 0 && (
              <Pagination
                currentPage={currentPage}
                totalItems={totalOrders}
                pageSize={pageSize}
                onPageChange={setCurrentPage}
                onPageSizeChange={setPageSize}
              />
            )}
          </div>
        )}

        {/* Schedule Tab */}
        {!isLoading && currentTab === 'schedule' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-white">Production Schedule</h2>
              <p className="text-gray-400 text-sm mt-1">Calendar view of production schedules</p>
            </div>

            {/* Schedule Timeline */}
            <Card variant="glass">
              <CardContent className="p-6">
                {/* Group orders by date */}
                {(() => {
                  const ordersByDate: Record<string, ProductionOrder[]> = {};
                  orders.forEach(order => {
                    const date = new Date(order.startDate).toLocaleDateString();
                    if (!ordersByDate[date]) {
                      ordersByDate[date] = [];
                    }
                    ordersByDate[date].push(order);
                  });

                  const sortedDates = Object.keys(ordersByDate).sort((a, b) => {
                    return new Date(a).getTime() - new Date(b).getTime();
                  });

                  if (sortedDates.length === 0) {
                    return (
                      <div className="text-center py-12">
                        <ClockIcon className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                        <p className="text-gray-400">No scheduled production orders</p>
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-6">
                      {sortedDates.map((date, dateIndex) => (
                        <div key={date} className="relative">
                          {/* Date header */}
                          <div className="flex items-center gap-4 mb-4">
                            <div className="flex flex-col items-center">
                              <div className="w-12 h-12 rounded-full bg-primary-500/20 border-2 border-primary-500 flex items-center justify-center">
                                <span className="text-xs font-bold text-primary-400">
                                  {new Date(date).getDate()}
                                </span>
                              </div>
                              <div className="w-0.5 h-full bg-gray-700 mt-2" />
                            </div>
                            <div className="flex-1">
                              <h3 className="text-lg font-semibold text-white">
                                {new Date(date).toLocaleDateString('en-US', {
                                  weekday: 'long',
                                  month: 'long',
                                  day: 'numeric',
                                })}
                              </h3>
                              <p className="text-sm text-gray-400">
                                {ordersByDate[date].length} order
                                {ordersByDate[date].length !== 1 ? 's' : ''} scheduled
                              </p>
                            </div>
                          </div>

                          {/* Orders for this date */}
                          <div className="ml-16 space-y-3">
                            {ordersByDate[date].map(order => (
                              <div
                                key={order.orderId}
                                className="bg-white/5 border border-gray-700 rounded-lg p-4 hover:border-gray-600 transition-colors"
                              >
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                      <h4 className="font-semibold text-white">{order.orderId}</h4>
                                      <StatusBadge status={order.status} />
                                      <PriorityIndicator priority={order.priority} />
                                    </div>
                                    <p className="text-gray-300 text-sm mb-1">
                                      {order.productName}
                                    </p>
                                    <p className="text-gray-400 text-xs">SKU: {order.productSku}</p>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-2xl font-bold text-white">
                                      {order.quantity}
                                    </p>
                                    <p className="text-xs text-gray-400">units</p>
                                  </div>
                                </div>

                                {/* Timeline bar */}
                                <div className="mt-3 pt-3 border-t border-gray-700">
                                  <div className="flex items-center gap-4">
                                    <div className="flex items-center gap-2 text-xs text-gray-400">
                                      <ClockIcon className="h-3 w-3" />
                                      <span>
                                        Start:{' '}
                                        {new Date(order.startDate).toLocaleTimeString([], {
                                          hour: '2-digit',
                                          minute: '2-digit',
                                        })}
                                      </span>
                                    </div>
                                    {order.endDate && (
                                      <div className="flex items-center gap-2 text-xs text-gray-400">
                                        <CheckCircleIcon className="h-3 w-3" />
                                        <span>
                                          End:{' '}
                                          {new Date(order.endDate).toLocaleTimeString([], {
                                            hour: '2-digit',
                                            minute: '2-digit',
                                          })}
                                        </span>
                                      </div>
                                    )}
                                    {order.assignedTo && (
                                      <div className="flex items-center gap-2 text-xs text-primary-400">
                                        <UserIcon className="h-3 w-3" />
                                        <span>{order.assignedTo}</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </CardContent>
            </Card>

            {/* Upcoming Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card variant="glass" className="p-6">
                <h3 className="text-sm text-gray-400 mb-2">Today</h3>
                <p className="text-3xl font-bold text-white">
                  {
                    orders.filter(
                      o => new Date(o.startDate).toDateString() === new Date().toDateString()
                    ).length
                  }
                </p>
              </Card>
              <Card variant="glass" className="p-6">
                <h3 className="text-sm text-gray-400 mb-2">This Week</h3>
                <p className="text-3xl font-bold text-white">
                  {
                    orders.filter(o => {
                      const start = new Date(o.startDate);
                      const now = new Date();
                      const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
                      return start >= now && start <= weekFromNow;
                    }).length
                  }
                </p>
              </Card>
              <Card variant="glass" className="p-6">
                <h3 className="text-sm text-gray-400 mb-2">Overdue</h3>
                <p className="text-3xl font-bold text-warning-400">
                  {
                    orders.filter(o => {
                      if (!o.endDate) return false;
                      return new Date(o.endDate) < new Date() && o.status !== 'COMPLETED';
                    }).length
                  }
                </p>
              </Card>
            </div>
          </div>
        )}

        {/* Maintenance Tab */}
        {!isLoading && currentTab === 'maintenance' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-white">Equipment Maintenance</h2>
                <p className="text-gray-400 text-sm mt-1">
                  Manage production equipment maintenance
                </p>
              </div>
              <Button variant="primary" className="flex items-center gap-2">
                <PlusIcon className="h-5 w-5" />
                New Maintenance Request
              </Button>
            </div>

            {/* Equipment Status Overview */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card variant="glass" className="p-6 border-l-4 border-l-success-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Operational</p>
                    <p className="mt-2 text-3xl font-bold text-white">3</p>
                  </div>
                  <CheckCircleIcon className="h-8 w-8 text-success-400" />
                </div>
              </Card>
              <Card variant="glass" className="p-6 border-l-4 border-l-warning-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Maintenance Due</p>
                    <p className="mt-2 text-3xl font-bold text-white">1</p>
                  </div>
                  <WrenchScrewdriverIcon className="h-8 w-8 text-warning-400" />
                </div>
              </Card>
              <Card variant="glass" className="p-6 border-l-4 border-l-error-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Out of Service</p>
                    <p className="mt-2 text-3xl font-bold text-white">0</p>
                  </div>
                  <CogIcon className="h-8 w-8 text-error-400" />
                </div>
              </Card>
              <Card variant="glass" className="p-6 border-l-4 border-l-primary-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Total Equipment</p>
                    <p className="mt-2 text-3xl font-bold text-white">4</p>
                  </div>
                  <ClipboardDocumentListIcon className="h-8 w-8 text-primary-400" />
                </div>
              </Card>
            </div>

            {/* Equipment List */}
            <Card variant="glass">
              <CardHeader>
                <CardTitle>Equipment Inventory</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Equipment Item */}
                  {[
                    {
                      id: 'EQ-001',
                      name: 'Assembly Line A',
                      type: 'Assembly Line',
                      status: 'OPERATIONAL',
                      lastMaintenance: '2025-01-20',
                      nextMaintenance: '2025-02-20',
                      uptime: '98.5%',
                    },
                    {
                      id: 'EQ-002',
                      name: 'CNC Machine 1',
                      type: 'CNC Machine',
                      status: 'OPERATIONAL',
                      lastMaintenance: '2025-01-15',
                      nextMaintenance: '2025-02-15',
                      uptime: '99.2%',
                    },
                    {
                      id: 'EQ-003',
                      name: 'Packaging Unit B',
                      type: 'Packaging Unit',
                      status: 'MAINTENANCE_DUE',
                      lastMaintenance: '2025-01-10',
                      nextMaintenance: '2025-02-10',
                      uptime: '97.8%',
                    },
                    {
                      id: 'EQ-004',
                      name: 'Quality Control Station',
                      type: 'Testing Equipment',
                      status: 'OPERATIONAL',
                      lastMaintenance: '2025-01-25',
                      nextMaintenance: '2025-02-25',
                      uptime: '99.9%',
                    },
                  ].map(equipment => (
                    <div
                      key={equipment.id}
                      className="bg-white/5 border border-gray-700 rounded-lg p-4 hover:border-gray-600 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h4 className="font-semibold text-white">{equipment.name}</h4>
                            <span
                              className={`px-2 py-1 rounded text-xs font-semibold ${
                                equipment.status === 'OPERATIONAL'
                                  ? 'bg-success-500/20 text-success-300'
                                  : equipment.status === 'MAINTENANCE_DUE'
                                    ? 'bg-warning-500/20 text-warning-300'
                                    : 'bg-error-500/20 text-error-300'
                              }`}
                            >
                              {equipment.status.replace('_', ' ')}
                            </span>
                          </div>
                          <p className="text-gray-400 text-sm">{equipment.type}</p>
                          <p className="text-gray-500 text-xs mt-1">ID: {equipment.id}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-400">Uptime</p>
                          <p className="text-xl font-bold text-success-400">{equipment.uptime}</p>
                        </div>
                      </div>

                      {/* Maintenance Info */}
                      <div className="mt-4 pt-3 border-t border-gray-700 grid grid-cols-3 gap-4 text-xs">
                        <div>
                          <p className="text-gray-500">Last Maintenance</p>
                          <p className="text-gray-300">
                            {new Date(equipment.lastMaintenance).toLocaleDateString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-500">Next Maintenance</p>
                          <p
                            className={
                              new Date(equipment.nextMaintenance) <
                              new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
                                ? 'text-warning-400 font-semibold'
                                : 'text-gray-300'
                            }
                          >
                            {new Date(equipment.nextMaintenance).toLocaleDateString()}
                          </p>
                        </div>
                        <div>
                          <Button variant="secondary" size="sm" className="w-full">
                            Schedule Maintenance
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}

export default ProductionPage;
