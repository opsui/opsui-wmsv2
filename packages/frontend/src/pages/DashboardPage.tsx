/**
 * Dashboard page
 *
 * Supervisor dashboard showing real-time warehouse metrics
 *
 * Design: Industrial Command Center aesthetic
 * - Bold typography with Clash Display-inspired headers
 * - Deep space gradients with purple accents
 * - Staggered entrance animations
 * - Asymmetric hero layout for visual impact
 * - Atmospheric depth with layered glass effects
 */

import {
  AuditLogsCard,
  Breadcrumb,
  Card,
  CardContent,
  Header,
  MetricCardSkeleton,
  OrderStatusChart,
  PerformanceChart,
  RoleActivityCard,
  Skeleton,
  ThroughputChart,
  TopSKUsChart,
  useToast,
  type AuditLogFilters,
} from '@/components/shared';
import { ERPKPISummary } from '@/components/shared/ERPKPISummary';
import { MetricCard } from '@/components/shared/MetricCard';
import { useDebouncedInvalidation } from '@/hooks/useDebouncedInvalidation';
import { useERPDashboardMetrics } from '@/hooks/useERPDashboardMetrics';
import {
  useInventoryUpdates,
  useNotifications,
  useOrderUpdates,
  usePickUpdates,
} from '@/hooks/useWebSocket';
import { formatDate } from '@/lib/utils';
import {
  useAllPackersPerformance,
  useAllPickersPerformance,
  useAllStockControllersPerformance,
  useAuditLogs,
  useDashboardMetrics,
  useHourlyThroughput,
  useOrderStatusBreakdown,
  useRoleActivity,
  useRoleDetails,
  useThroughputByRange,
  useTopSKUs,
  type AuditLog,
} from '@/services/api';
import { useAuthStore } from '@/stores';
import {
  ArrowTrendingUpIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  QueueListIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';
import { OrderStatus, UserRole } from '@opsui/shared';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// ============================================================================
// ANIMATION STYLES (injected for staggered reveals)
// ============================================================================

// Core styles — always injected (stagger-in runs once on mount, not infinite)
const staggerStylesCore = `
  @keyframes dashboard-stagger-in {
    from {
      opacity: 0;
      transform: translateY(20px) scale(0.95);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  .dashboard-stagger-1 { animation: dashboard-stagger-in 0.6s ease-out 0.1s both; }
  .dashboard-stagger-2 { animation: dashboard-stagger-in 0.6s ease-out 0.2s both; }
  .dashboard-stagger-3 { animation: dashboard-stagger-in 0.6s ease-out 0.3s both; }
  .dashboard-stagger-4 { animation: dashboard-stagger-in 0.6s ease-out 0.4s both; }
  .dashboard-stagger-5 { animation: dashboard-stagger-in 0.6s ease-out 0.5s both; }
  .dashboard-stagger-6 { animation: dashboard-stagger-in 0.6s ease-out 0.6s both; }
  .dashboard-stagger-7 { animation: dashboard-stagger-in 0.6s ease-out 0.7s both; }
  .dashboard-stagger-8 { animation: dashboard-stagger-in 0.6s ease-out 0.75s both; }
  .dashboard-stagger-9 { animation: dashboard-stagger-in 0.6s ease-out 0.8s both; }
  .dashboard-stagger-10 { animation: dashboard-stagger-in 0.6s ease-out 0.85s both; }
  .dashboard-stagger-11 { animation: dashboard-stagger-in 0.6s ease-out 0.9s both; }
  .dashboard-stagger-12 { animation: dashboard-stagger-in 0.6s ease-out 0.95s both; }
  .dashboard-stagger-13 { animation: dashboard-stagger-in 0.6s ease-out 1.0s both; }
  .dashboard-stagger-14 { animation: dashboard-stagger-in 0.6s ease-out 1.05s both; }
  .dashboard-stagger-15 { animation: dashboard-stagger-in 0.6s ease-out 1.1s both; }
  .dashboard-stagger-16 { animation: dashboard-stagger-in 0.6s ease-out 1.15s both; }
  .dashboard-stagger-17 { animation: dashboard-stagger-in 0.6s ease-out 1.2s both; }
  .dashboard-stagger-18 { animation: dashboard-stagger-in 0.6s ease-out 1.25s both; }
  .dashboard-stagger-19 { animation: dashboard-stagger-in 0.6s ease-out 1.3s both; }
  .dashboard-stagger-20 { animation: dashboard-stagger-in 0.6s ease-out 1.35s both; }
  .dashboard-stagger-21 { animation: dashboard-stagger-in 0.6s ease-out 1.4s both; }
  .dashboard-stagger-22 { animation: dashboard-stagger-in 0.6s ease-out 1.45s both; }
  .dashboard-stagger-23 { animation: dashboard-stagger-in 0.6s ease-out 1.5s both; }
  .dashboard-stagger-24 { animation: dashboard-stagger-in 0.6s ease-out 1.55s both; }
  .dashboard-stagger-25 { animation: dashboard-stagger-in 0.6s ease-out 1.6s both; }
  .dashboard-stagger-26 { animation: dashboard-stagger-in 0.6s ease-out 1.65s both; }
  .dashboard-stagger-27 { animation: dashboard-stagger-in 0.6s ease-out 1.7s both; }
  .dashboard-stagger-28 { animation: dashboard-stagger-in 0.6s ease-out 1.75s both; }
  .dashboard-stagger-29 { animation: dashboard-stagger-in 0.6s ease-out 1.8s both; }
  .dashboard-stagger-30 { animation: dashboard-stagger-in 0.6s ease-out 1.85s both; }

  .metric-card-glow {
    box-shadow: 0 0 20px rgba(168, 85, 247, 0.12);
  }

  .hero-title-gradient {
    background: linear-gradient(135deg, #a855f7 0%, #c084fc 50%, #e879f9 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
`;

// Infinite animations — suppressed in performance mode to reduce sustained CPU/GPU load
const staggerStylesInfinite = `
  @keyframes metric-pulse-glow {
    0%, 100% {
      box-shadow: 0 0 20px rgba(168, 85, 247, 0.1);
    }
    50% {
      box-shadow: 0 0 30px rgba(168, 85, 247, 0.2);
    }
  }

  @keyframes hero-gradient-shift {
    0%, 100% {
      background-position: 0% 50%;
    }
    50% {
      background-position: 100% 50%;
    }
  }
`;

// ============================================================================
// SUBCOMPONENTS
// ============================================================================

// ============================================================================
// COMPONENT
// ============================================================================

export function DashboardPage() {
  const { showToast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { invalidateQueued } = useDebouncedInvalidation(500);
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
  const [scanType, setScanType] = useState<'pick' | 'pack' | 'verify' | 'all'>('pick');
  const [topSKUsTimePeriod, setTopSKUsTimePeriod] = useState<
    'daily' | 'weekly' | 'monthly' | 'yearly'
  >('monthly');
  const [activityView, setActivityView] = useState<'role-activity' | 'audit-logs'>('role-activity');
  const [auditLogFilters, setAuditLogFilters] = useState<AuditLogFilters>({});

  // Cross-module ERP KPIs
  const { sections: erpSections } = useERPDashboardMetrics(navigate);

  // ==========================================================================
  // Real-time WebSocket Subscriptions
  // ==========================================================================

  // Subscribe to order updates to refresh metrics and order data
  const handleOrderUpdate = useCallback(
    (data: { orderId: string; pickerId?: string; pickerName?: string; reason?: string }) => {
      invalidateQueued('dashboard-metrics');
      invalidateQueued('role-activity');
      if (data.reason) {
        invalidateQueued('order-status-breakdown');
      }
      invalidateQueued('throughput');
      invalidateQueued('top-skus');

      if (data.reason) {
        showToast(`Order ${data.orderId} has been cancelled`, 'warning', 3000);
      } else if (!data.pickerName) {
        showToast(`Order ${data.orderId} has been completed`, 'success', 3000);
      }
    },
    [invalidateQueued, showToast]
  );
  useOrderUpdates(handleOrderUpdate);

  // Subscribe to pick updates to refresh performance metrics
  const handlePickUpdate = useCallback(() => {
    invalidateQueued('picker-performance');
    invalidateQueued('packer-performance');
    invalidateQueued('dashboard-metrics');
    invalidateQueued('role-activity');
  }, [invalidateQueued]);
  usePickUpdates(handlePickUpdate);

  // Subscribe to inventory updates
  const handleInventoryUpdate = useCallback(
    (data: { sku: string; binLocation?: string; quantity?: number }) => {
      invalidateQueued('dashboard-metrics');
      if (data.quantity !== undefined && data.quantity > 0) {
        showToast(`SKU ${data.sku} is running low (${data.quantity} remaining)`, 'error', 5000);
      }
    },
    [invalidateQueued, showToast]
  );
  useInventoryUpdates(handleInventoryUpdate);

  // Subscribe to notifications
  const handleNotification = useCallback(
    (notification: { notificationId: string; title: string; message: string }) => {
      showToast(
        `${notification.title || 'Notification'}: ${notification.message || ''}`,
        'info',
        4000
      );
    },
    [showToast]
  );
  useNotifications(handleNotification);

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

  // Hourly throughput data for hero card sparklines
  const { data: hourlyThroughputData } = useHourlyThroughput({
    enabled: canSupervise(),
  });

  // Transform hourly throughput data into sparkline format for each metric card
  const sparklineData = useMemo(() => {
    if (!hourlyThroughputData || !Array.isArray(hourlyThroughputData)) {
      return {
        activeStaff: [],
        ordersPerHour: [],
        queueDepth: [],
        exceptions: [],
      };
    }

    // Assuming hourlyThroughputData is an array of { hour: string, orders: number, picks: number, ... }
    // Transform for each metric
    return {
      activeStaff: hourlyThroughputData.slice(-8).map((d: any) => ({
        value: d.activePickers ?? d.activeStaff ?? 0,
        label: d.hour ?? d.label,
      })),
      ordersPerHour: hourlyThroughputData.slice(-8).map((d: any) => ({
        value: d.ordersPerHour ?? d.orders ?? 0,
        label: d.hour ?? d.label,
      })),
      queueDepth: hourlyThroughputData.slice(-8).map((d: any) => ({
        value: d.queueDepth ?? 0,
        label: d.hour ?? d.label,
      })),
      exceptions: hourlyThroughputData.slice(-8).map((d: any) => ({
        value: d.exceptions ?? 0,
        label: d.hour ?? d.label,
      })),
    };
  }, [hourlyThroughputData]);

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

  // Inject stagger animation styles on mount — suppress infinite animations in performance mode
  useEffect(() => {
    const styleId = 'dashboard-stagger-styles';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      const isPerformanceMode = document.documentElement.classList.contains('performance-mode');
      style.textContent = isPerformanceMode
        ? staggerStylesCore
        : staggerStylesCore + staggerStylesInfinite;
      document.head.appendChild(style);
    }
  }, []);

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
            <Card variant="glass" className="p-6 h-96">
              <Skeleton variant="text" className="w-32 h-6 mb-4" />
              <Skeleton variant="rectangular" className="w-full h-72" />
            </Card>
            <Card variant="glass" className="p-6 h-96">
              <Skeleton variant="text" className="w-32 h-6 mb-4" />
              <Skeleton variant="rectangular" className="w-full h-72" />
            </Card>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen overflow-x-hidden">
      <Header />
      <main
        id="main-content"
        className="w-full px-4 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-4 sm:space-y-6 lg:space-y-8 overflow-x-hidden"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 1rem)' }}
        tabIndex={-1}
      >
        {/* Breadcrumb Navigation */}
        <Breadcrumb />

        {/* Hero Section - Asymmetric Layout */}
        <div className="dashboard-stagger-1 relative">
          {/* Decorative background elements */}
          <div className="absolute -left-4 -top-4 w-32 h-32 bg-gradient-to-br from-purple-500/10 to-transparent rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -right-4 -bottom-4 w-40 h-40 bg-gradient-to-tl from-purple-500/10 to-transparent rounded-full blur-3xl pointer-events-none" />

          {/* Main header */}
          <div className="relative flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
            <div>
              <h1
                className="
                text-4xl sm:text-5xl lg:text-6xl 
                font-black 
                tracking-tight
                font-['Archivo',sans-serif]
              "
              >
                <span className="hero-title-gradient">Command</span>
                <span className="dark:text-white text-gray-900"> Center</span>
              </h1>
              <p className="mt-2 sm:mt-3 text-base sm:text-lg dark:text-gray-400 text-gray-600 max-w-xl">
                Business operations at a glance
              </p>
            </div>

            {/* Status indicator */}
            <div className="flex items-center gap-3 px-4 py-2 rounded-full bg-gradient-to-r from-purple-500/10 to-violet-500/10 border border-purple-500/20">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-purple-500"></span>
              </span>
              <span className="text-sm font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-wider">
                Live
              </span>
            </div>
          </div>
        </div>

        {/* Key Metrics - Responsive grid with staggered animations */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5 lg:gap-6">
          <MetricCard
            title="Active Staff"
            value={metrics.activePickers}
            icon={UserGroupIcon}
            color="primary"
            index={0}
            sparkline={sparklineData.activeStaff}
          />
          <MetricCard
            title="Orders/Hour"
            value={metrics.ordersPickedPerHour}
            icon={ArrowTrendingUpIcon}
            color="success"
            index={1}
            sparkline={sparklineData.ordersPerHour}
          />
          <MetricCard
            title="Queue Depth"
            value={metrics.queueDepth}
            icon={QueueListIcon}
            color="warning"
            onClick={() => navigate('/orders')}
            index={2}
            sparkline={sparklineData.queueDepth}
          />
          <MetricCard
            title="Exceptions"
            value={metrics.exceptions}
            icon={ExclamationTriangleIcon}
            color={metrics.exceptions > 0 ? 'error' : 'success'}
            onClick={() => (window.location.href = '/exceptions')}
            index={3}
            sparkline={sparklineData.exceptions}
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

        <div className="grid grid-cols-1 gap-4 sm:gap-6">
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

        {/* Cross-Module ERP KPI Summary */}
        {hasBaseAdminRole && <ERPKPISummary sections={erpSections} />}

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
                      ? 'dark:bg-purple-600 bg-purple-600 text-white shadow-lg dark:shadow-purple-500/30 shadow-purple-500/20'
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
                      ? 'dark:bg-purple-600 bg-purple-600 text-white shadow-lg dark:shadow-purple-500/30 shadow-purple-500/20'
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
