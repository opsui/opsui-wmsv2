/**
 * Dashboard page
 *
 * Supervisor dashboard showing real-time warehouse metrics
 */

import { useState, useMemo } from 'react';
import {
  useDashboardMetrics,
  useRoleActivity,
  useRoleDetails,
  useThroughputByRange,
  useOrderStatusBreakdown,
  useTopSKUs,
  useAllPickersPerformance,
  useAllPackersPerformance,
  useAllStockControllersPerformance,
  useOrderQueue,
  useAuditLogs,
  type AuditLog,
} from '@/services/api';
import {
  Card,
  CardContent,
  Header,
  RoleActivityCard,
  AuditLogsCard,
  ThroughputChart,
  OrderStatusChart,
  TopSKUsChart,
  PerformanceChart,
  Button,
  Pagination,
  type AuditLogFilters,
  MetricCardSkeleton,
  Skeleton,
  ListSkeleton,
  Breadcrumb,
} from '@/components/shared';
import { useToast } from '@/components/shared';
import { useAuthStore } from '@/stores';
import { UserRole, OrderStatus } from '@opsui/shared';
import {
  UserGroupIcon,
  QueueListIcon,
  ArrowTrendingUpIcon,
  ExclamationTriangleIcon,
  XMarkIcon,
  EyeIcon,
  DocumentTextIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';
import { OrderPriorityBadge, OrderStatusBadge } from '@/components/shared';
import { formatDate } from '@/lib/utils';
import {
  useOrderUpdates,
  usePickUpdates,
  useInventoryUpdates,
  useNotifications,
} from '@/hooks/useWebSocket';
import { useQueryClient } from '@tanstack/react-query';

// ============================================================================
// SUBCOMPONENTS
// ============================================================================

function MetricCard({
  title,
  value,
  icon: Icon,
  color = 'primary',
  onClick,
}: {
  title: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  color?: 'primary' | 'success' | 'warning' | 'error';
  onClick?: () => void;
}) {
  const colorStyles = {
    primary:
      'dark:bg-primary-500/15 bg-primary-500/15 dark:text-primary-400 text-primary-600 dark:border-primary-500/20 border-primary-500/30',
    success:
      'dark:bg-success-500/15 bg-success-500/15 dark:text-success-400 text-success-600 dark:border-success-500/20 border-success-500/30',
    warning:
      'dark:bg-warning-500/15 bg-warning-500/15 dark:text-warning-400 text-warning-600 dark:border-warning-500/20 border-warning-500/30',
    error:
      'dark:bg-error-500/15 bg-error-500/15 dark:text-error-400 text-error-600 dark:border-error-500/20 border-error-500/30',
  };

  return (
    <div onClick={onClick} className={`${onClick ? 'cursor-pointer' : ''}`}>
      <Card
        variant="glass"
        className="card-hover shadow-lg dark:shadow-blue-500/5 shadow-gray-200/50 group h-full"
      >
        <CardContent className="p-4 sm:p-5 lg:p-6">
          <div className="flex flex-col items-center text-center gap-3">
            <div
              className={`p-3 sm:p-4 rounded-xl ${colorStyles[color]} transition-all duration-300 group-hover:scale-110 shadow-lg dark:shadow-none`}
            >
              <Icon className="h-6 w-6 sm:h-7 sm:w-7" />
            </div>
            <div className="w-full">
              <p className="text-sm sm:text-base font-semibold dark:text-gray-300 text-gray-700 uppercase tracking-wide">
                {title}
              </p>
              <p className="mt-1 text-3xl sm:text-4xl font-bold dark:text-white text-gray-900 tracking-tight group-hover:scale-105 transition-transform duration-300">
                {value}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Admin Orders Modal Component
function AdminOrdersModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const pageSize = 10;
  const { data: queueData, isLoading } = useOrderQueue({
    status: 'PENDING' as OrderStatus,
    page: currentPage,
    limit: pageSize,
    enabled: isOpen, // Only fetch when modal is actually open
  });

  // Filter orders based on search
  const filteredOrders = queueData?.orders
    ? queueData.orders.filter(order => {
        if (!searchQuery.trim()) return true;
        const query = searchQuery.toLowerCase();
        return (
          order.orderId?.toLowerCase().includes(query) ||
          order.customerName?.toLowerCase().includes(query) ||
          order.status?.toLowerCase().includes(query)
        );
      })
    : [];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-6xl max-h-[80vh] dark:bg-gray-900 bg-white rounded-2xl dark:border border-gray-200 shadow-2xl animate-fade-in flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 dark:border-b border-gray-200">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-semibold dark:text-white text-gray-900">
              All Orders (Admin View)
            </h2>
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search orders..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-9 pr-3 py-1.5 w-64 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700"
              />
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 dark:text-gray-400 text-gray-600 dark:hover:text-white hover:text-gray-900 rounded-lg dark:hover:bg-white/[0.05] hover:bg-gray-100"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <ListSkeleton items={5} />
          ) : !queueData?.orders || queueData.orders.length === 0 ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-gray-400">No orders available</div>
            </div>
          ) : (
            <>
              {filteredOrders.length === 0 ? (
                <div className="flex items-center justify-center h-64">
                  <div className="text-gray-400">No orders match your search</div>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredOrders.map(order => (
                    <Card
                      key={order.orderId}
                      variant="glass"
                      className="p-4 dark:bg-white/[0.02] bg-gray-50/50 border-opacity-50"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold dark:text-white text-gray-900 truncate">
                              {order.orderId}
                            </h3>
                            <OrderPriorityBadge priority={order.priority} />
                            <OrderStatusBadge status={order.status} />
                            <span className="text-xs px-2 py-0.5 rounded-full dark:bg-gray-700/50 bg-gray-200 dark:text-gray-400 text-gray-500 border dark:border-gray-600 border-gray-300">
                              Read-only
                            </span>
                          </div>
                          <p className="text-sm dark:text-gray-400 text-gray-600 truncate">
                            {order.customerName}
                          </p>
                          <div className="mt-3 flex items-center gap-6 text-sm dark:text-gray-400 text-gray-600">
                            <span>
                              Items:{' '}
                              <span className="dark:text-white text-gray-900 font-medium">
                                {order.items?.length || 0}
                              </span>
                            </span>
                            <span>
                              Progress:{' '}
                              <span className="dark:text-white text-gray-900 font-medium">
                                {order.progress}%
                              </span>
                            </span>
                            <span>
                              Created:{' '}
                              <span className="dark:text-white text-gray-900 font-medium">
                                {formatDate(order.createdAt)}
                              </span>
                            </span>
                          </div>
                        </div>
                        {order.status === 'PICKING' && (
                          <Button
                            size="sm"
                            variant="primary"
                            onClick={() => (window.location.href = `/orders/${order.orderId}/pick`)}
                            className="flex items-center gap-2 shrink-0"
                          >
                            <EyeIcon className="h-4 w-4" />
                            Live View
                          </Button>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              )}

              {/* Pagination */}
              <div className="mt-4 flex justify-center">
                <Pagination
                  currentPage={currentPage}
                  totalItems={queueData?.total || 0}
                  pageSize={pageSize}
                  onPageChange={setCurrentPage}
                />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// COMPONENT
// ============================================================================

export function DashboardPage() {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const canSupervise = useAuthStore(state => state.canSupervise);
  // Check if user has admin/supervisor as their BASE role (not active role)
  // This is important for features like audit logs that require actual permissions
  const hasBaseAdminRole = useAuthStore(state => {
    const baseRole = state.user?.role;
    return baseRole === UserRole.ADMIN || baseRole === UserRole.SUPERVISOR;
  });
  const [selectedRole, setSelectedRole] = useState<UserRole | 'all'>('all');
  const [selectedMember, setSelectedMember] = useState<{
    id: string;
    name: string;
    roleType: UserRole;
  } | null>(null);
  const [throughputRange, setThroughputRange] = useState<
    'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly'
  >('daily');
  const [performanceRange, setPerformanceRange] = useState<
    'daily' | 'weekly' | 'monthly' | 'yearly'
  >('weekly');
  const [performanceRole, setPerformanceRole] = useState<
    UserRole.PICKER | UserRole.PACKER | UserRole.STOCK_CONTROLLER
  >(UserRole.PICKER);
  const [showAdminOrders, setShowAdminOrders] = useState(false);
  const [scanType, setScanType] = useState<'pick' | 'pack' | 'verify' | 'all'>('pick');
  const [topSKUsTimePeriod, setTopSKUsTimePeriod] = useState<
    'daily' | 'weekly' | 'monthly' | 'yearly'
  >('monthly');
  const [activityView, setActivityView] = useState<'role-activity' | 'audit-logs'>('role-activity');
  const [auditLogFilters, setAuditLogFilters] = useState<AuditLogFilters>({});

  // ==========================================================================
  // Real-time WebSocket Subscriptions
  // ==========================================================================

  // Subscribe to order updates to refresh metrics and order data
  useOrderUpdates(
    (data: { orderId: string; pickerId?: string; pickerName?: string; reason?: string }) => {
      // Refresh dashboard metrics and role activity for all order events
      queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] });
      queryClient.invalidateQueries({ queryKey: ['role-activity'] });
      // Only invalidate order status breakdown on status changes (not on every pick/pack event)
      // This prevents the chart from flashing constantly
      if (data.reason) {
        // Order was cancelled/completed - status definitely changed
        queryClient.invalidateQueries({ queryKey: ['order-status-breakdown'] });
      }
      queryClient.invalidateQueries({ queryKey: ['throughput'] });
      queryClient.invalidateQueries({ queryKey: ['top-skus'] });

      // Show toast for specific events
      if (data.reason) {
        // Order was cancelled
        showToast(`Order ${data.orderId} has been cancelled`, 'warning', 3000);
      } else if (data.pickerName) {
        // Order was claimed
        // Don't show toast for claims as they happen frequently
      } else {
        // Order was completed
        showToast(`Order ${data.orderId} has been completed`, 'success', 3000);
      }
    }
  );

  // Subscribe to pick updates to refresh performance metrics
  usePickUpdates(() => {
    // Refresh performance data and metrics for all pick events
    queryClient.invalidateQueries({ queryKey: ['picker-performance'] });
    queryClient.invalidateQueries({ queryKey: ['packer-performance'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] });
    queryClient.invalidateQueries({ queryKey: ['role-activity'] });
  });

  // Subscribe to inventory updates
  useInventoryUpdates((data: { sku: string; binLocation?: string; quantity?: number }) => {
    // Refresh inventory-related metrics
    queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] });

    // Show alert toast for low stock
    if (data.quantity !== undefined && data.quantity > 0) {
      showToast(`SKU ${data.sku} is running low (${data.quantity} remaining)`, 'error', 5000);
    }
  });

  // Subscribe to notifications
  useNotifications((notification: { notificationId: string; title: string; message: string }) => {
    // Show toast for notifications
    showToast(
      `${notification.title || 'Notification'}: ${notification.message || ''}`,
      'info',
      4000
    );
  });

  // ==========================================================================
  // Data Hooks
  // ==========================================================================

  // Handle audit log filter changes
  const handleAuditFiltersChange = (filters: AuditLogFilters) => {
    setAuditLogFilters(filters);
  };

  // Only fetch metrics if user has supervisor privileges
  const { data: metrics, isLoading: metricsLoading } = useDashboardMetrics({
    enabled: canSupervise(),
  });

  // Use generic role activity hook to fetch all role activities
  const { data: roleActivitiesData, isLoading: roleActivitiesLoading } = useRoleActivity('all', {
    enabled: canSupervise(),
  });

  // Graph data hooks
  const { data: throughputData, isLoading: throughputLoading } = useThroughputByRange(
    throughputRange,
    {
      enabled: canSupervise(),
    }
  );

  const {
    data: orderStatusBreakdown,
    isLoading: statusBreakdownLoading,
    error: statusBreakdownError,
  } = useOrderStatusBreakdown({
    enabled: canSupervise(),
  }) as { data: any[] | undefined; isLoading: boolean; error: unknown };

  const { data: topSKUs, isLoading: topSKUsLoading } = useTopSKUs(10, scanType, topSKUsTimePeriod, {
    enabled: canSupervise(),
  }) as { data: any[] | undefined; isLoading: boolean };

  // Calculate date range for performance based on selected time range
  // Use useMemo to prevent date objects from changing on every render
  const { startDate, endDate } = useMemo(() => {
    const end = new Date();
    const daysMap = {
      daily: 1,
      weekly: 7,
      monthly: 30,
      yearly: 365,
    };
    const days = daysMap[performanceRange];
    const start = new Date(end.getTime() - days * 24 * 60 * 60 * 1000);
    return { startDate: start, endDate: end };
  }, [performanceRange]);

  // Fetch performance data based on selected role
  const { data: pickerPerformance, isLoading: pickerPerformanceLoading } = useAllPickersPerformance(
    startDate,
    endDate,
    { enabled: canSupervise() && performanceRole === UserRole.PICKER }
  );

  const { data: packerPerformance, isLoading: packerPerformanceLoading } = useAllPackersPerformance(
    startDate,
    endDate,
    { enabled: canSupervise() && performanceRole === UserRole.PACKER }
  );

  const { data: stockControllerPerformance, isLoading: stockControllerPerformanceLoading } =
    useAllStockControllersPerformance(startDate, endDate, {
      enabled: canSupervise() && performanceRole === UserRole.STOCK_CONTROLLER,
    });

  // Transform performance data to common format based on role
  const performanceData = useMemo(() => {
    const data =
      performanceRole === UserRole.PICKER
        ? pickerPerformance
        : performanceRole === UserRole.PACKER
          ? packerPerformance
          : stockControllerPerformance;

    if (!data || !Array.isArray(data)) return [];

    return data.map((item: any) => ({
      userId:
        performanceRole === UserRole.STOCK_CONTROLLER
          ? item.controllerId
          : performanceRole === UserRole.PACKER
            ? item.packerId
            : item.pickerId,
      userName:
        performanceRole === UserRole.STOCK_CONTROLLER
          ? item.controllerName
          : performanceRole === UserRole.PACKER
            ? item.packerName
            : item.pickerName,
      tasksCompleted: item.tasksCompleted,
      ordersCompleted:
        performanceRole === UserRole.STOCK_CONTROLLER
          ? item.transactionsCompleted
          : item.ordersCompleted,
      totalItemsProcessed: item.totalItemsProcessed,
      averageTimePerTask: item.averageTimePerTask,
    }));
  }, [performanceRole, pickerPerformance, packerPerformance, stockControllerPerformance]);

  const performanceLoading =
    performanceRole === UserRole.PICKER
      ? pickerPerformanceLoading
      : performanceRole === UserRole.PACKER
        ? packerPerformanceLoading
        : stockControllerPerformanceLoading;

  // Default activities object for all roles
  const defaultActivities: Record<UserRole, any[]> = {
    [UserRole.PICKER]: [],
    [UserRole.PACKER]: [],
    [UserRole.STOCK_CONTROLLER]: [],
    [UserRole.INWARDS]: [],
    [UserRole.PRODUCTION]: [],
    [UserRole.SALES]: [],
    [UserRole.MAINTENANCE]: [],
    [UserRole.RMA]: [],
    [UserRole.SUPERVISOR]: [],
    [UserRole.ADMIN]: [],
    [UserRole.DISPATCH]: [],
    [UserRole.ACCOUNTING]: [],
  };

  // Explicitly type roleActivities to ensure it satisfies Record<UserRole, any[]>
  const roleActivities: Record<UserRole, any[]> = (roleActivitiesData ??
    defaultActivities) as Record<UserRole, any[]>;

  // Fetch audit logs (only for admin/supervisor)
  // Pass filters from the component state for server-side filtering
  const { data: auditLogsData, isLoading: auditLogsLoading } = useAuditLogs(
    {
      limit: 50,
      offset: ((auditLogFilters.page || 1) - 1) * 50,
      category: auditLogFilters.category || undefined,
      action: auditLogFilters.action || undefined,
      username: auditLogFilters.userEmail || undefined,
      resourceType: auditLogFilters.resourceType || undefined,
      startDate: auditLogFilters.startDate || undefined,
      endDate: auditLogFilters.endDate || undefined,
    },
    { enabled: hasBaseAdminRole }
  );
  const auditLogs: AuditLog[] = (auditLogsData ?? []) as AuditLog[];

  // Use generic role details hook for selected member
  const { data: memberData, isLoading: memberDataLoading } = useRoleDetails(
    selectedMember?.roleType || UserRole.PICKER,
    selectedMember?.id || null,
    !!selectedMember
  );

  if (!canSupervise) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="max-w-md">
          <CardContent className="p-6 text-center">
            <ExclamationTriangleIcon className="h-12 w-12 text-warning-600 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
            <p className="text-gray-600">
              You need supervisor or admin privileges to view this page.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (metricsLoading || !metrics) {
    return (
      <div className="min-h-screen">
        <Header />
        <main className="w-full px-4 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-6 sm:space-y-8">
          <div className="animate-in">
            <Skeleton variant="text" className="w-48 h-10 mb-2" />
            <Skeleton variant="text" className="w-64 h-6" />
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
            <MetricCardSkeleton />
            <MetricCardSkeleton />
            <MetricCardSkeleton />
            <MetricCardSkeleton />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card variant="glass" className="p-6 h-80">
              <Skeleton variant="text" className="w-32 h-6 mb-4" />
              <Skeleton variant="rectangular" className="w-full h-60" />
            </Card>
            <Card variant="glass" className="p-6 h-80">
              <Skeleton variant="text" className="w-32 h-6 mb-4" />
              <Skeleton variant="rectangular" className="w-full h-60" />
            </Card>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen overflow-x-hidden">
      <Header />
      <AdminOrdersModal isOpen={showAdminOrders} onClose={() => setShowAdminOrders(false)} />
      <main
        id="main-content"
        className="w-full px-4 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-4 sm:space-y-6 lg:space-y-8 overflow-x-hidden"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 1rem)' }}
        tabIndex={-1}
      >
        {/* Breadcrumb Navigation */}
        <Breadcrumb />
        {/* Page Header */}
        <div className="animate-in">
          <h1 className="text-2xl sm:text-3xl font-bold dark:text-white text-gray-900 tracking-tight">
            Dashboard
          </h1>
          <p className="mt-1 sm:mt-2 dark:text-gray-400 text-gray-600 text-sm sm:text-base">
            Real-time warehouse operations overview
          </p>
        </div>

        {/* Key Metrics - Responsive grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 lg:gap-6">
          <MetricCard
            title="Active Staff"
            value={metrics.activePickers}
            icon={UserGroupIcon}
            color="primary"
          />
          <MetricCard
            title="Orders/Hour"
            value={metrics.ordersPickedPerHour}
            icon={ArrowTrendingUpIcon}
            color="success"
          />
          <MetricCard
            title="Queue Depth"
            value={metrics.queueDepth}
            icon={QueueListIcon}
            color="warning"
            onClick={() => setShowAdminOrders(true)}
          />
          <MetricCard
            title="Exceptions"
            value={metrics.exceptions}
            icon={ExclamationTriangleIcon}
            color={metrics.exceptions > 0 ? 'error' : 'success'}
            onClick={() => (window.location.href = '/exceptions')}
          />
        </div>

        {/* Charts Section - Stack on mobile */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          <ThroughputChart
            data={(throughputData as any) ?? []}
            isLoading={throughputLoading}
            onRangeChange={setThroughputRange}
          />
          <OrderStatusChart
            data={orderStatusBreakdown ?? []}
            isLoading={statusBreakdownLoading}
            error={statusBreakdownError}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          <TopSKUsChart
            data={topSKUs ?? []}
            isLoading={topSKUsLoading}
            limit={10}
            onScanTypeChange={setScanType}
            onTimePeriodChange={setTopSKUsTimePeriod}
          />
          <PerformanceChart
            data={performanceData}
            isLoading={performanceLoading}
            onRangeChange={setPerformanceRange}
            onRoleChange={setPerformanceRole}
          />
        </div>

        {/* Unified Role Activity / Audit Logs */}
        <div className="flex flex-col gap-4">
          {/* Toggle between Role Activity and Audit Logs - only for admin/supervisor */}
          {hasBaseAdminRole && (
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0 touch-scroll -mx-4 px-4 sm:mx-0 sm:px-0">
                <button
                  onClick={() => setActivityView('role-activity')}
                  className={`px-4 py-3 sm:py-2 rounded-lg text-sm font-medium transition-all min-h-touch whitespace-nowrap flex-shrink-0 ${
                    activityView === 'role-activity'
                      ? 'dark:bg-blue-600 bg-blue-600 text-white shadow-lg dark:shadow-blue-500/30 shadow-blue-500/20'
                      : 'dark:bg-white/[0.05] bg-gray-100 dark:text-gray-400 text-gray-700 dark:hover:bg-white/[0.1] hover:bg-gray-200 dark:hover:text-gray-300 hover:text-gray-900'
                  }`}
                >
                  <UserGroupIcon className="h-4 w-4 inline mr-2" />
                  Role Activity
                </button>
                <button
                  onClick={() => setActivityView('audit-logs')}
                  className={`px-4 py-3 sm:py-2 rounded-lg text-sm font-medium transition-all min-h-touch whitespace-nowrap flex-shrink-0 ${
                    activityView === 'audit-logs'
                      ? 'dark:bg-blue-600 bg-blue-600 text-white shadow-lg dark:shadow-blue-500/30 shadow-blue-500/20'
                      : 'dark:bg-white/[0.05] bg-gray-100 dark:text-gray-400 text-gray-700 dark:hover:bg-white/[0.1] hover:bg-gray-200 dark:hover:text-gray-300 hover:text-gray-900'
                  }`}
                >
                  <DocumentTextIcon className="h-4 w-4 inline mr-2" />
                  Audit Logs
                </button>
              </div>
            </div>
          )}

          {activityView === 'audit-logs' && hasBaseAdminRole ? (
            <AuditLogsCard
              logs={auditLogs}
              isLoading={auditLogsLoading}
              onFiltersChange={handleAuditFiltersChange}
              hasNextPage={auditLogs.length === 50}
              hasPreviousPage={(auditLogFilters.page || 1) > 1}
            />
          ) : (
            <RoleActivityCard
              role={selectedRole}
              onRoleChange={setSelectedRole}
              activities={roleActivities}
              isLoading={roleActivitiesLoading}
              onViewOrders={(roleId, roleName, roleType) =>
                setSelectedMember({ id: roleId, name: roleName, roleType })
              }
              orders={memberData || []}
              transactions={memberData || []}
              ordersLoading={memberDataLoading}
              transactionsLoading={memberDataLoading}
            />
          )}
        </div>
      </main>
    </div>
  );
}
