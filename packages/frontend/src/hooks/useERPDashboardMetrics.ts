/**
 * useERPDashboardMetrics
 *
 * Orchestrating hook that aggregates KPIs from all enabled ERP modules
 * for the cross-module Enterprise Overview section on the admin dashboard.
 *
 * Each module's query is gated by useModuleEnabled() so only enabled
 * modules incur an API call. All queries run in parallel via TanStack Query.
 */

import {
  useFinancialMetrics,
  useSalesDashboard,
  useStockControlDashboard,
  useProductionDashboard,
  usePurchasingDashboard,
  useEmployees,
  useLeaveRequests,
  usePayrollPeriods,
} from '@/services/api';
import { useModuleEnabled } from '@/stores/moduleStore';
import type { MetricCardColor } from '@/components/shared/MetricCard';
import type { MiniChartConfig } from '@/components/shared/MiniChartPanel';
import {
  BanknotesIcon,
  ChartBarIcon,
  CubeIcon,
  TruckIcon,
  WrenchScrewdriverIcon,
  UserGroupIcon,
  CalendarDaysIcon,
  ExclamationTriangleIcon,
  ArrowTrendingUpIcon,
  DocumentTextIcon,
  ClipboardDocumentListIcon,
  ShoppingCartIcon,
} from '@heroicons/react/24/outline';

// ============================================================================
// TYPES
// ============================================================================

export interface ERPKPIMetric {
  title: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  color: MetricCardColor;
  onClick?: () => void;
}

export interface ERPKPISection {
  id: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  metrics: ERPKPIMetric[];
  isLoading: boolean;
  navigateTo: string;
  /** Optional mini chart visualization for the section */
  visualization?: MiniChartConfig;
}

// ============================================================================
// COLORS FOR CHARTS
// ============================================================================

const CHART_COLORS = {
  // Financial colors
  revenue: '#10b981',
  expenses: '#f59e0b',
  profit: '#8b5cf6',

  // Status colors
  healthy: '#10b981',
  warning: '#f59e0b',
  critical: '#ef4444',
  neutral: '#6366f1',

  // Sales pipeline colors
  leads: '#8b5cf6',
  opportunities: '#3b82f6',
  quotes: '#f59e0b',
  closed: '#10b981',

  // Inventory colors
  inStock: '#10b981',
  lowStock: '#f59e0b',
  outOfStock: '#ef4444',
  overStock: '#3b82f6',

  // Production colors
  completed: '#10b981',
  inProgress: '#3b82f6',
  queued: '#f59e0b',
  onHold: '#ef4444',

  // Purchasing colors
  open: '#3b82f6',
  pending: '#f59e0b',
  overdue: '#ef4444',
  exception: '#ef4444',
};

// ============================================================================
// HELPERS
// ============================================================================

function formatCurrency(value: number | undefined | null): string {
  if (value == null || isNaN(value)) return '$0';
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  return `$${value.toFixed(0)}`;
}

function formatPercent(value: number | undefined | null): string {
  if (value == null || isNaN(value)) return '0%';
  return `${value.toFixed(1)}%`;
}

function formatDate(date: string | Date | undefined | null): string {
  if (!date) return 'N/A';
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ============================================================================
// HOOK
// ============================================================================

export function useERPDashboardMetrics(navigate: (path: string) => void) {
  // Module enablement checks
  const isFinanceEnabled = useModuleEnabled('finance-accounting');
  const isInventoryEnabled = useModuleEnabled('inventory-management');
  const isProductionEnabled = useModuleEnabled('production-manufacturing');
  const isProcurementEnabled = useModuleEnabled('procurement');
  const isHREnabled = useModuleEnabled('human-resources');
  // Sales is part of order-management (core module)
  const isSalesEnabled = useModuleEnabled('order-management');

  // Fetch data — each query only fires if its module is enabled
  const { data: financialData, isLoading: finLoading } = useFinancialMetrics({
    period: 'monthly',
    enabled: isFinanceEnabled,
  });

  const { data: salesData, isLoading: salesLoading } = useSalesDashboard();

  const { data: stockData, isLoading: stockLoading } = useStockControlDashboard();

  const { data: productionData, isLoading: prodLoading } = useProductionDashboard();

  const { data: purchasingData, isLoading: purchLoading } = usePurchasingDashboard({
    enabled: isProcurementEnabled,
  });

  const { data: employeesData, isLoading: empLoading } = useEmployees({
    status: 'ACTIVE',
  });

  const { data: leaveData, isLoading: leaveLoading } = useLeaveRequests({
    status: 'PENDING',
  });

  const { data: payrollData, isLoading: payrollLoading } = usePayrollPeriods();

  // Build sections
  const sections: ERPKPISection[] = [];

  // --- Financial Overview ---
  if (isFinanceEnabled) {
    const fin = financialData as any;
    const profitMargin = fin?.profitMargin ?? 0;
    sections.push({
      id: 'financial',
      title: 'Financial Overview',
      icon: BanknotesIcon,
      navigateTo: '/accounting',
      isLoading: finLoading,
      metrics: [
        {
          title: 'Revenue MTD',
          value: formatCurrency(fin?.totalRevenue),
          icon: BanknotesIcon,
          color: 'success',
          onClick: () => navigate('/accounting'),
        },
        {
          title: 'Gross Margin',
          value: formatPercent(fin?.profitMargin),
          icon: ArrowTrendingUpIcon,
          color: profitMargin >= 20 ? 'success' : 'warning',
          onClick: () => navigate('/accounting'),
        },
        {
          title: 'Outstanding AR',
          value: formatCurrency(fin?.outstandingReceivables),
          icon: DocumentTextIcon,
          color: (fin?.overdueReceivables ?? 0) > 0 ? 'warning' : 'primary',
          onClick: () => navigate('/accounting/ar-aging'),
        },
        {
          title: 'Outstanding AP',
          value: formatCurrency(fin?.outstandingPayables),
          icon: ClipboardDocumentListIcon,
          color: 'primary',
          onClick: () => navigate('/accounting/ap-aging'),
        },
      ],
      visualization: {
        type: 'gauge',
        title: 'Gross Margin',
        value: profitMargin,
        max: 100,
        label: formatPercent(profitMargin),
        color: profitMargin >= 20 ? CHART_COLORS.healthy : CHART_COLORS.warning,
        navigateTo: '/accounting',
      },
    });
  }

  // --- Sales Pipeline ---
  if (isSalesEnabled) {
    const sales = salesData as any;
    const activeLeads = sales?.activeLeads ?? 0;
    const activeOpportunities = sales?.activeOpportunities ?? 0;
    const pendingQuotes = sales?.pendingQuotes ?? 0;
    const closedWon = sales?.closedWon ?? 0;

    sections.push({
      id: 'sales',
      title: 'Sales Pipeline',
      icon: ChartBarIcon,
      navigateTo: '/sales',
      isLoading: salesLoading,
      metrics: [
        {
          title: 'Pipeline Value',
          value: formatCurrency(sales?.totalPipeline),
          icon: ChartBarIcon,
          color: 'primary',
          onClick: () => navigate('/sales'),
        },
        {
          title: 'Open Quotes',
          value: pendingQuotes,
          icon: DocumentTextIcon,
          color: pendingQuotes > 0 ? 'warning' : 'success',
          onClick: () => navigate('/sales'),
        },
        {
          title: 'Active Leads',
          value: activeLeads,
          icon: ArrowTrendingUpIcon,
          color: 'success',
          onClick: () => navigate('/sales'),
        },
        {
          title: 'Customers',
          value: sales?.totalCustomers ?? 0,
          icon: UserGroupIcon,
          color: 'primary',
          onClick: () => navigate('/sales'),
        },
      ],
      visualization: {
        type: 'funnel-bar',
        title: 'Pipeline Stages',
        headline: formatCurrency(sales?.totalPipeline),
        stages: [
          { label: 'Leads', value: activeLeads, color: CHART_COLORS.leads },
          { label: 'Opportunities', value: activeOpportunities, color: CHART_COLORS.opportunities },
          { label: 'Quotes', value: pendingQuotes, color: CHART_COLORS.quotes },
          { label: 'Closed Won', value: closedWon, color: CHART_COLORS.closed },
        ],
        navigateTo: '/sales',
      },
    });
  }

  // --- Inventory Health ---
  if (isInventoryEnabled) {
    const stock = stockData as any;
    const healthyItems =
      (stock?.totalSKUs ?? 0) - (stock?.lowStockItems ?? 0) - (stock?.outOfStockItems ?? 0);

    sections.push({
      id: 'inventory',
      title: 'Inventory Health',
      icon: CubeIcon,
      navigateTo: '/stock-control',
      isLoading: stockLoading,
      metrics: [
        {
          title: 'Inventory Value',
          value: formatCurrency(stock?.totalInventoryValue),
          icon: CubeIcon,
          color: 'primary',
          onClick: () => navigate('/stock-control'),
        },
        {
          title: 'Low Stock',
          value: stock?.lowStockItems ?? 0,
          icon: ExclamationTriangleIcon,
          color: (stock?.lowStockItems ?? 0) > 0 ? 'warning' : 'success',
          onClick: () => navigate('/stock-control'),
        },
        {
          title: 'Out of Stock',
          value: stock?.outOfStockItems ?? 0,
          icon: ExclamationTriangleIcon,
          color: (stock?.outOfStockItems ?? 0) > 0 ? 'error' : 'success',
          onClick: () => navigate('/stock-control'),
        },
        {
          title: 'Total SKUs',
          value: stock?.totalSKUs ?? 0,
          icon: CubeIcon,
          color: 'primary',
          onClick: () => navigate('/stock-control'),
        },
      ],
      visualization: {
        type: 'stacked-bar',
        title: 'Stock Status',
        headline: stock?.totalSKUs ?? 0,
        subtitle: 'total SKUs',
        segments: [
          { label: 'Healthy', value: Math.max(0, healthyItems), color: CHART_COLORS.inStock },
          { label: 'Low', value: stock?.lowStockItems ?? 0, color: CHART_COLORS.lowStock },
          { label: 'Out', value: stock?.outOfStockItems ?? 0, color: CHART_COLORS.outOfStock },
        ],
        navigateTo: '/stock-control',
      },
    });
  }

  // --- Purchasing ---
  if (isProcurementEnabled) {
    const purch = purchasingData as any;
    sections.push({
      id: 'purchasing',
      title: 'Purchasing',
      icon: ShoppingCartIcon,
      navigateTo: '/stock-control',
      isLoading: purchLoading,
      metrics: [
        {
          title: 'Open PO Value',
          value: formatCurrency(purch?.total_open_order_value),
          icon: ShoppingCartIcon,
          color: 'primary',
          onClick: () => navigate('/stock-control'),
        },
        {
          title: 'Past Due POs',
          value: purch?.orders_past_due ?? 0,
          icon: ExclamationTriangleIcon,
          color: (purch?.orders_past_due ?? 0) > 0 ? 'error' : 'success',
          onClick: () => navigate('/stock-control'),
        },
        {
          title: 'Pending Receipts',
          value: purch?.pending_receipts ?? 0,
          icon: TruckIcon,
          color: (purch?.pending_receipts ?? 0) > 0 ? 'warning' : 'success',
          onClick: () => navigate('/inwards'),
        },
        {
          title: 'Match Exceptions',
          value: purch?.match_exceptions ?? 0,
          icon: ExclamationTriangleIcon,
          color: (purch?.match_exceptions ?? 0) > 0 ? 'error' : 'success',
          onClick: () => navigate('/stock-control'),
        },
      ],
    });
  }

  // --- Production ---
  if (isProductionEnabled) {
    const prod = productionData as any;
    const inProgress = prod?.inProgress ?? 0;
    const queued = prod?.queued ?? 0;
    const completedToday = prod?.completedToday ?? 0;
    const onHold = prod?.onHold ?? 0;
    const activeOrders = inProgress + queued;

    sections.push({
      id: 'production',
      title: 'Production',
      icon: WrenchScrewdriverIcon,
      navigateTo: '/production',
      isLoading: prodLoading,
      metrics: [
        {
          title: 'Active Orders',
          value: activeOrders,
          icon: WrenchScrewdriverIcon,
          color: 'primary',
          onClick: () => navigate('/production'),
        },
        {
          title: 'In Progress',
          value: inProgress,
          icon: ArrowTrendingUpIcon,
          color: 'success',
          onClick: () => navigate('/production'),
        },
        {
          title: 'Completed Today',
          value: completedToday,
          icon: ChartBarIcon,
          color: 'success',
          onClick: () => navigate('/production'),
        },
        {
          title: 'On Hold',
          value: onHold,
          icon: ExclamationTriangleIcon,
          color: onHold > 0 ? 'warning' : 'success',
          onClick: () => navigate('/production'),
        },
      ],
      visualization: {
        type: 'donut',
        title: 'Order Status',
        segments: [
          { label: 'In Progress', value: inProgress, color: CHART_COLORS.inProgress },
          { label: 'Queued', value: queued, color: CHART_COLORS.queued },
          { label: 'Completed', value: completedToday, color: CHART_COLORS.completed },
          { label: 'On Hold', value: onHold, color: CHART_COLORS.onHold },
        ],
        navigateTo: '/production',
      },
    });
  }

  // --- HR ---
  if (isHREnabled) {
    const employees = employeesData as any;
    const leaves = leaveData as any;
    const periods = payrollData as any;

    // Find next upcoming payroll date
    const upcomingPeriod = Array.isArray(periods)
      ? periods.find((p: any) => new Date(p.payDate) >= new Date())
      : null;

    const employeeCount = employees?.total ?? (Array.isArray(employees) ? employees.length : 0);
    const pendingLeaves = Array.isArray(leaves) ? leaves.length : (leaves?.total ?? 0);

    sections.push({
      id: 'hr',
      title: 'Human Resources',
      icon: UserGroupIcon,
      navigateTo: '/hr/employees',
      isLoading: empLoading || leaveLoading || payrollLoading,
      metrics: [
        {
          title: 'Active Employees',
          value: employeeCount,
          icon: UserGroupIcon,
          color: 'primary',
          onClick: () => navigate('/hr/employees'),
        },
        {
          title: 'Pending Leave',
          value: pendingLeaves,
          icon: CalendarDaysIcon,
          color: pendingLeaves > 0 ? 'warning' : 'success',
          onClick: () => navigate('/hr/leave'),
        },
        {
          title: 'Next Payroll',
          value: formatDate(upcomingPeriod?.payDate),
          icon: BanknotesIcon,
          color: 'primary',
          onClick: () => navigate('/hr/payroll'),
        },
      ],
    });
  }

  const isLoading = sections.some(s => s.isLoading);

  return { sections, isLoading };
}
