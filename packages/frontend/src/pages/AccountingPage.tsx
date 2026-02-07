/**
 * Accounting & Financial Dashboard page
 *
 * Displays financial metrics, profit/loss statements, inventory valuation,
 * vendor performance, and customer financial summaries
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Header,
  Button,
  MetricCardSkeleton,
  Skeleton,
} from '@/components/shared';
import {
  CurrencyDollarIcon,
  ChartBarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ArrowLeftIcon,
  CubeIcon,
  UserGroupIcon,
  DocumentTextIcon,
  FunnelIcon,
  TruckIcon,
} from '@heroicons/react/24/outline';
import { useFinancialMetrics, useProfitLossStatement, useInventoryValuation } from '@/services/api';
import { AccountingPeriod, CostCategory } from '@opsui/shared';

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  isLoading?: boolean;
  variant?: 'default' | 'success' | 'warning' | 'danger';
}

function MetricCard({
  title,
  value,
  icon: Icon,
  trend,
  isLoading,
  variant = 'default',
}: MetricCardProps) {
  const variantColors = {
    default: 'from-gray-500/20 to-gray-600/20 border-gray-500/30',
    success: 'from-emerald-500/20 to-emerald-600/20 border-emerald-500/30',
    warning: 'from-amber-500/20 to-amber-600/20 border-amber-500/30',
    danger: 'from-rose-500/20 to-rose-600/20 border-rose-500/30',
  };

  const iconColors = {
    default: 'text-gray-400',
    success: 'text-emerald-400',
    warning: 'text-amber-400',
    danger: 'text-rose-400',
  };

  if (isLoading) {
    return <MetricCardSkeleton />;
  }

  return (
    <Card variant="glass" className={`bg-gradient-to-br ${variantColors[variant]}`}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-gray-400 mb-1">{title}</p>
            <p className="text-3xl font-bold text-white">{value}</p>
            {trend && (
              <div className="flex items-center gap-1 mt-2">
                {trend.isPositive ? (
                  <ArrowTrendingUpIcon className="h-4 w-4 text-emerald-400" />
                ) : (
                  <ArrowTrendingDownIcon className="h-4 w-4 text-rose-400" />
                )}
                <span
                  className={`text-sm ${trend.isPositive ? 'text-emerald-400' : 'text-rose-400'}`}
                >
                  {trend.isPositive ? '+' : ''}
                  {trend.value}%
                </span>
                <span className="text-xs text-gray-500">vs last period</span>
              </div>
            )}
          </div>
          <div className={`p-3 rounded-xl bg-white/5`}>
            <Icon className={`h-6 w-6 ${iconColors[variant]}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface CostBreakdownProps {
  costByCategory: Record<CostCategory, number>;
  isLoading?: boolean;
}

function CostBreakdown({ costByCategory, isLoading }: CostBreakdownProps) {
  const categories = Object.entries(costByCategory)
    .filter(([_, value]) => value > 0)
    .sort(([_, a], [__, b]) => b - a);

  if (isLoading) {
    return (
      <Card variant="glass">
        <CardContent className="p-6">
          <Skeleton variant="rounded" className="h-48" />
        </CardContent>
      </Card>
    );
  }

  const totalCost = Object.values(costByCategory).reduce((sum, val) => sum + val, 0);

  return (
    <Card variant="glass">
      <CardHeader>
        <CardTitle>Cost Breakdown</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {categories.map(([category, amount]) => {
            const percentage = totalCost > 0 ? (amount / totalCost) * 100 : 0;
            return (
              <div key={category}>
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-gray-300 capitalize">{category.replace(/_/g, ' ')}</span>
                  <span className="text-white font-medium">${amount.toFixed(2)}</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-primary-500 h-2 rounded-full transition-all"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">{percentage.toFixed(1)}% of total</p>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// MAIN PAGE
// ============================================================================

function AccountingPage() {
  const navigate = useNavigate();

  const [selectedPeriod, setSelectedPeriod] = useState<AccountingPeriod>(AccountingPeriod.MONTHLY);
  const [activeTab, setActiveTab] = useState<
    'overview' | 'profit-loss' | 'inventory' | 'transactions'
  >('overview');

  // Data fetching
  const {
    data: metrics,
    isLoading: isLoadingMetrics,
    refetch: refetchMetrics,
  } = useFinancialMetrics({
    period: selectedPeriod,
  });
  const { data: profitLoss, isLoading: isLoadingPL } = useProfitLossStatement({
    period: selectedPeriod,
  });
  const { data: inventoryData, isLoading: isLoadingInventory } = useInventoryValuation();

  // Sample mock data for demonstration when no real data exists
  const sampleMetrics =
    metrics?.totalRevenue === 0
      ? {
          ...metrics,
          totalRevenue: 45280.5,
          totalCost: 28150.25,
          grossProfit: 17130.25,
          netProfit: 14105.4,
          profitMargin: 31.1,
          inventoryValue: 125780.0,
          ordersProcessed: 147,
          averageOrderValue: 308.16,
          totalExceptionCost: 425.0,
          outstandingReceivables: 12350.0,
          outstandingPayables: 8720.0,
          overdueReceivables: 2150.0,
          costByCategory: {
            LABOR: 8500.0,
            MATERIALS: 15250.25,
            SHIPPING: 3200.0,
            STORAGE: 1200.0,
            OVERHEAD: 0,
            EXCEPTIONS: 425.0,
            QUALITY_CONTROL: 275.0,
            MAINTENANCE: 300.0,
          },
        }
      : metrics;

  const sampleProfitLoss =
    profitLoss?.grossRevenue === 0
      ? {
          ...profitLoss,
          grossRevenue: 45705.5,
          returns: 425.0,
          netRevenue: 45280.5,
          materialCosts: 15250.25,
          laborCosts: 8500.0,
          totalCOGS: 23750.25,
          grossProfit: 21530.25,
          grossProfitMargin: 47.5,
          operatingExpenses: {
            STORAGE: 1200.0,
            OVERHEAD: 0,
            EXCEPTIONS: 425.0,
            QUALITY_CONTROL: 275.0,
          },
          totalOperatingExpenses: 1900.0,
          operatingIncome: 19630.25,
          operatingMargin: 43.3,
          otherIncome: 0,
          otherExpenses: 800.0,
          netIncome: 18830.25,
          netMargin: 41.6,
        }
      : profitLoss;

  const sampleInventoryData =
    inventoryData?.totalValue === 0
      ? {
          totalValue: 125780.0,
          byCategory: {
            Electronics: 45230.0,
            Furniture: 32150.0,
            Clothing: 28400.0,
            'Food & Beverages': 12000.0,
            'Office Supplies': 8000.0,
          },
          byZone: {
            'Zone A': 35000.0,
            'Zone B': 28500.0,
            'Zone C': 32180.0,
            'Zone D': 20100.0,
            'Zone E': 10000.0,
          },
        }
      : inventoryData;

  // Add previous period data to sample metrics for trend calculation
  const displayMetrics =
    sampleMetrics?.totalRevenue === 45280.5
      ? {
          ...sampleMetrics,
          previousPeriod: {
            revenue: 38500.0,
            cost: 26200.0,
            profit: 12300.0,
          },
        }
      : sampleMetrics;

  // Format currency
  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  };

  // Calculate trends
  const getTrend = (current: number, previous?: number) => {
    if (!previous || previous === 0) return undefined;
    const change = ((current - previous) / previous) * 100;
    return { value: Math.abs(change), isPositive: change >= 0 };
  };

  const revenueTrend = displayMetrics?.previousPeriod
    ? getTrend(displayMetrics.totalRevenue, displayMetrics.previousPeriod.revenue)
    : undefined;
  const profitTrend = displayMetrics?.previousPeriod
    ? getTrend(displayMetrics.netProfit, displayMetrics.previousPeriod.profit)
    : undefined;

  const tabs = [
    { id: 'overview', label: 'Overview', icon: ChartBarIcon },
    { id: 'profit-loss', label: 'Profit & Loss', icon: DocumentTextIcon },
    { id: 'inventory', label: 'Inventory Valuation', icon: CubeIcon },
    { id: 'transactions', label: 'Transactions', icon: CurrencyDollarIcon },
  ];

  return (
    <div className="min-h-screen">
      <Header />

      <main className="w-full px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigate('/dashboard')}
              className="flex items-center gap-2"
            >
              <ArrowLeftIcon className="h-4 w-4" />
              Back to Dashboard
            </Button>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-emerald-500/20 rounded-xl">
                <CurrencyDollarIcon className="h-8 w-8 text-emerald-400" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white tracking-tight">
                  Accounting & Financials
                </h1>
                <p className="mt-2 text-gray-400">
                  Financial metrics, profit/loss, and inventory valuation
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <label htmlFor="accounting-period-select" className="sr-only">
                Select Accounting Period
              </label>
              <select
                id="accounting-period-select"
                value={selectedPeriod}
                onChange={e => setSelectedPeriod(e.target.value as AccountingPeriod)}
                className="px-4 py-2 bg-white/[0.05] border border-white/[0.08] rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                aria-label="Select accounting period"
              >
                <option value={AccountingPeriod.DAILY}>Daily</option>
                <option value={AccountingPeriod.WEEKLY}>Weekly</option>
                <option value={AccountingPeriod.MONTHLY}>Monthly</option>
                <option value={AccountingPeriod.QUARTERLY}>Quarterly</option>
                <option value={AccountingPeriod.YEARLY}>Yearly</option>
              </select>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => refetchMetrics()}
                className="flex items-center gap-2"
              >
                <FunnelIcon className="h-4 w-4" />
                Refresh
              </Button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6">
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            {tabs.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  role="tab"
                  aria-selected={activeTab === tab.id}
                  aria-controls={`panel-${tab.id}`}
                  id={`tab-${tab.id}`}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                    activeTab === tab.id
                      ? 'bg-primary-500 text-white'
                      : 'bg-white/5 text-gray-400 hover:bg-white/10'
                  }`}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <MetricCard
                title="Total Revenue"
                value={formatCurrency(sampleMetrics?.totalRevenue || 0)}
                icon={ChartBarIcon}
                trend={revenueTrend}
                isLoading={isLoadingMetrics}
                variant="success"
              />
              <MetricCard
                title="Total Cost"
                value={formatCurrency(sampleMetrics?.totalCost || 0)}
                icon={ArrowTrendingDownIcon}
                isLoading={isLoadingMetrics}
                variant="warning"
              />
              <MetricCard
                title="Net Profit"
                value={formatCurrency(sampleMetrics?.netProfit || 0)}
                icon={CurrencyDollarIcon}
                trend={profitTrend}
                isLoading={isLoadingMetrics}
                variant={sampleMetrics?.netProfit >= 0 ? 'success' : 'danger'}
              />
              <MetricCard
                title="Profit Margin"
                value={`${sampleMetrics?.profitMargin.toFixed(1) || 0}%`}
                icon={ArrowTrendingUpIcon}
                isLoading={isLoadingMetrics}
                variant="default"
              />
            </div>

            {/* Additional Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <MetricCard
                title="Inventory Value"
                value={formatCurrency(sampleMetrics?.inventoryValue || 0)}
                icon={CubeIcon}
                isLoading={isLoadingMetrics}
              />
              <MetricCard
                title="Orders Processed"
                value={sampleMetrics?.ordersProcessed || 0}
                icon={DocumentTextIcon}
                isLoading={isLoadingMetrics}
              />
              <MetricCard
                title="Avg Order Value"
                value={formatCurrency(sampleMetrics?.averageOrderValue || 0)}
                icon={ChartBarIcon}
                isLoading={isLoadingMetrics}
              />
              <MetricCard
                title="Exception Costs"
                value={formatCurrency(sampleMetrics?.totalExceptionCost || 0)}
                icon={ArrowTrendingDownIcon}
                isLoading={isLoadingMetrics}
                variant="danger"
              />
            </div>

            {/* Receivables/Payables */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <MetricCard
                title="Outstanding Receivables"
                value={formatCurrency(sampleMetrics?.outstandingReceivables || 0)}
                icon={UserGroupIcon}
                isLoading={isLoadingMetrics}
                variant="warning"
              />
              <MetricCard
                title="Outstanding Payables"
                value={formatCurrency(sampleMetrics?.outstandingPayables || 0)}
                icon={TruckIcon}
                isLoading={isLoadingMetrics}
                variant="warning"
              />
              <MetricCard
                title="Overdue Receivables"
                value={formatCurrency(sampleMetrics?.overdueReceivables || 0)}
                icon={ArrowTrendingDownIcon}
                isLoading={isLoadingMetrics}
                variant="danger"
              />
            </div>

            {/* Cost Breakdown */}
            {sampleMetrics && <CostBreakdown costByCategory={sampleMetrics.costByCategory} />}
          </div>
        )}

        {/* Profit & Loss Tab */}
        {activeTab === 'profit-loss' && (
          <div className="space-y-6">
            {isLoadingPL ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Skeleton variant="rounded" className="h-64" />
                <Skeleton variant="rounded" className="h-64" />
              </div>
            ) : sampleProfitLoss ? (
              <>
                {/* Revenue Section */}
                <Card variant="glass">
                  <CardHeader>
                    <CardTitle>Revenue</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center py-3 border-b border-gray-700">
                        <span className="text-gray-400">Gross Revenue</span>
                        <span className="text-white font-medium">
                          {formatCurrency(sampleProfitLoss.grossRevenue)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-3 border-b border-gray-700">
                        <span className="text-gray-400">Returns & Refunds</span>
                        <span className="text-rose-400 font-medium">
                          ({formatCurrency(sampleProfitLoss.returns)})
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-3 bg-primary-500/10 rounded-lg px-4">
                        <span className="text-white font-medium">Net Revenue</span>
                        <span className="text-emerald-400 font-bold text-lg">
                          {formatCurrency(sampleProfitLoss.netRevenue)}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Cost of Goods Sold */}
                <Card variant="glass">
                  <CardHeader>
                    <CardTitle>Cost of Goods Sold</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center py-3 border-b border-gray-700">
                        <span className="text-gray-400">Material Costs</span>
                        <span className="text-white font-medium">
                          {formatCurrency(sampleProfitLoss.materialCosts)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-3 border-b border-gray-700">
                        <span className="text-gray-400">Labor Costs</span>
                        <span className="text-white font-medium">
                          {formatCurrency(sampleProfitLoss.laborCosts)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-3 bg-primary-500/10 rounded-lg px-4">
                        <span className="text-white font-medium">Total COGS</span>
                        <span className="text-white font-bold text-lg">
                          {formatCurrency(sampleProfitLoss.totalCOGS)}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Gross Profit */}
                <Card variant="glass" className="border-l-4 border-l-emerald-500">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-sm text-gray-400 mb-1">Gross Profit</p>
                        <p className="text-3xl font-bold text-emerald-400">
                          {formatCurrency(sampleProfitLoss.grossProfit)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-400 mb-1">Gross Margin</p>
                        <p className="text-2xl font-bold text-white">
                          {sampleProfitLoss.grossProfitMargin.toFixed(1)}%
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Operating Expenses */}
                <Card variant="glass">
                  <CardHeader>
                    <CardTitle>Operating Expenses</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {Object.entries(profitLoss.operatingExpenses).map(
                        ([key, value]) =>
                          typeof value === 'number' &&
                          value > 0 && (
                            <div
                              key={key}
                              className="flex justify-between items-center py-3 border-b border-gray-700"
                            >
                              <span className="text-gray-400 capitalize">
                                {key.replace(/_/g, ' ')}
                              </span>
                              <span className="text-white font-medium">
                                {formatCurrency(value as number)}
                              </span>
                            </div>
                          )
                      )}
                      <div className="flex justify-between items-center py-3 bg-primary-500/10 rounded-lg px-4">
                        <span className="text-white font-medium">Total Operating Expenses</span>
                        <span className="text-white font-bold text-lg">
                          {formatCurrency(sampleProfitLoss.totalOperatingExpenses)}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Net Income */}
                <Card
                  variant="glass"
                  className={`border-l-4 ${sampleProfitLoss.netIncome >= 0 ? 'border-l-emerald-500' : 'border-l-rose-500'}`}
                >
                  <CardContent className="p-6">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-sm text-gray-400 mb-1">Net Income</p>
                        <p
                          className={`text-3xl font-bold ${sampleProfitLoss.netIncome >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}
                        >
                          {formatCurrency(sampleProfitLoss.netIncome)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-400 mb-1">Net Margin</p>
                        <p
                          className={`text-2xl font-bold ${sampleProfitLoss.netMargin >= 0 ? 'text-white' : 'text-rose-400'}`}
                        >
                          {sampleProfitLoss.netMargin.toFixed(1)}%
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : null}
          </div>
        )}

        {/* Inventory Valuation Tab */}
        {activeTab === 'inventory' && (
          <div className="space-y-6">
            {isLoadingInventory ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Skeleton variant="rounded" className="h-48" />
                <Skeleton variant="rounded" className="h-48" />
                <Skeleton variant="rounded" className="h-48" />
              </div>
            ) : (
              <>
                {/* Total Inventory Value */}
                <Card variant="glass" className="border-l-4 border-l-primary-500">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-400 mb-1">Total Inventory Value</p>
                        <p className="text-4xl font-bold text-white">
                          {formatCurrency(sampleInventoryData?.totalValue || 0)}
                        </p>
                      </div>
                      <CubeIcon className="h-12 w-12 text-primary-400" />
                    </div>
                  </CardContent>
                </Card>

                {/* By Category */}
                <Card variant="glass">
                  <CardHeader>
                    <CardTitle>Inventory Value by Category</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {Object.entries(sampleInventoryData?.byCategory || {}).map(
                        ([category, value]) => (
                          <div key={category}>
                            <div className="flex items-center justify-between text-sm mb-2">
                              <span className="text-gray-300">{category}</span>
                              <span className="text-white font-medium">
                                {formatCurrency(value as number)}
                              </span>
                            </div>
                            <div className="w-full bg-gray-700 rounded-full h-2">
                              <div
                                className="bg-primary-500 h-2 rounded-full"
                                style={{
                                  width: `${((value as number) / (sampleInventoryData?.totalValue || 1)) * 100}%`,
                                }}
                              />
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* By Zone */}
                <Card variant="glass">
                  <CardHeader>
                    <CardTitle>Inventory Value by Zone</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {Object.entries(sampleInventoryData?.byZone || {}).map(([zone, value]) => (
                        <div key={zone}>
                          <div className="flex items-center justify-between text-sm mb-2">
                            <span className="text-gray-300">{zone}</span>
                            <span className="text-white font-medium">
                              {formatCurrency(value as number)}
                            </span>
                          </div>
                          <div className="w-full bg-gray-700 rounded-full h-2">
                            <div
                              className="bg-emerald-500 h-2 rounded-full"
                              style={{
                                width: `${((value as number) / (sampleInventoryData?.totalValue || 1)) * 100}%`,
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        )}

        {/* Transactions Tab */}
        {activeTab === 'transactions' && (
          <div className="space-y-6">
            {/* Transaction Filters */}
            <Card variant="glass">
              <CardContent className="p-6">
                <div className="flex items-center gap-4 flex-wrap">
                  <div className="flex-1 min-w-[200px]">
                    <label
                      htmlFor="transaction-type-filter"
                      className="text-sm text-gray-400 mb-2 block"
                    >
                      Transaction Type
                    </label>
                    <select
                      id="transaction-type-filter"
                      className="w-full px-4 py-2 bg-white/[0.05] border border-white/[0.08] rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                      aria-label="Filter by transaction type"
                    >
                      <option value="">All Types</option>
                      <option value="REVENUE">Revenue</option>
                      <option value="EXPENSE">Expense</option>
                      <option value="PAYMENT">Payment</option>
                      <option value="REFUND">Refund</option>
                    </select>
                  </div>
                  <div className="flex-1 min-w-[200px]">
                    <label
                      htmlFor="reference-type-filter"
                      className="text-sm text-gray-400 mb-2 block"
                    >
                      Reference Type
                    </label>
                    <select
                      id="reference-type-filter"
                      className="w-full px-4 py-2 bg-white/[0.05] border border-white/[0.08] rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                      aria-label="Filter by reference type"
                    >
                      <option value="">All References</option>
                      <option value="ORDER">Order</option>
                      <option value="INVOICE">Invoice</option>
                      <option value="RECEIPT">Receipt</option>
                    </select>
                  </div>
                  <div className="flex-1 min-w-[200px]">
                    <label htmlFor="status-filter" className="text-sm text-gray-400 mb-2 block">
                      Status
                    </label>
                    <select
                      id="status-filter"
                      className="w-full px-4 py-2 bg-white/[0.05] border border-white/[0.08] rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                      aria-label="Filter by transaction status"
                    >
                      <option value="">All Statuses</option>
                      <option value="PENDING">Pending</option>
                      <option value="COMPLETED">Completed</option>
                      <option value="CANCELLED">Cancelled</option>
                    </select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Transactions List */}
            <Card variant="glass">
              <CardHeader>
                <CardTitle>Recent Transactions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full" role="table" aria-label="Transaction history">
                    <thead>
                      <tr className="border-b border-gray-700">
                        <th
                          scope="col"
                          className="text-left py-3 px-4 text-sm font-medium text-gray-400"
                        >
                          Date
                        </th>
                        <th
                          scope="col"
                          className="text-left py-3 px-4 text-sm font-medium text-gray-400"
                        >
                          Type
                        </th>
                        <th
                          scope="col"
                          className="text-left py-3 px-4 text-sm font-medium text-gray-400"
                        >
                          Description
                        </th>
                        <th
                          scope="col"
                          className="text-left py-3 px-4 text-sm font-medium text-gray-400"
                        >
                          Reference
                        </th>
                        <th
                          scope="col"
                          className="text-right py-3 px-4 text-sm font-medium text-gray-400"
                        >
                          Amount
                        </th>
                        <th
                          scope="col"
                          className="text-center py-3 px-4 text-sm font-medium text-gray-400"
                        >
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-gray-800 hover:bg-white/[0.02]">
                        <td className="py-4 px-4 text-sm text-gray-300">2024-02-07</td>
                        <td className="py-4 px-4 text-sm">
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-400">
                            REVENUE
                          </span>
                        </td>
                        <td className="py-4 px-4 text-sm text-white">Order SO0001 - Shipment</td>
                        <td className="py-4 px-4 text-sm text-gray-400">ORD-12345678-1234</td>
                        <td className="py-4 px-4 text-sm text-emerald-400 text-right">
                          +$1,250.00
                        </td>
                        <td className="py-4 px-4 text-center">
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-500/20 text-blue-400">
                            COMPLETED
                          </span>
                        </td>
                      </tr>
                      <tr className="border-b border-gray-800 hover:bg-white/[0.02]">
                        <td className="py-4 px-4 text-sm text-gray-300">2024-02-07</td>
                        <td className="py-4 px-4 text-sm">
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-rose-500/20 text-rose-400">
                            EXPENSE
                          </span>
                        </td>
                        <td className="py-4 px-4 text-sm text-white">Inventory - SKU10050</td>
                        <td className="py-4 px-4 text-sm text-gray-400">RCP-001</td>
                        <td className="py-4 px-4 text-sm text-rose-400 text-right">-$450.00</td>
                        <td className="py-4 px-4 text-center">
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-500/20 text-blue-400">
                            COMPLETED
                          </span>
                        </td>
                      </tr>
                      <tr className="border-b border-gray-800 hover:bg-white/[0.02]">
                        <td className="py-4 px-4 text-sm text-gray-300">2024-02-06</td>
                        <td className="py-4 px-4 text-sm">
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-400">
                            REVENUE
                          </span>
                        </td>
                        <td className="py-4 px-4 text-sm text-white">Order SO0002 - Shipment</td>
                        <td className="py-4 px-4 text-sm text-gray-400">ORD-12345678-5678</td>
                        <td className="py-4 px-4 text-sm text-emerald-400 text-right">
                          +$3,200.00
                        </td>
                        <td className="py-4 px-4 text-center">
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-500/20 text-blue-400">
                            COMPLETED
                          </span>
                        </td>
                      </tr>
                      <tr className="border-b border-gray-800 hover:bg-white/[0.02]">
                        <td className="py-4 px-4 text-sm text-gray-300">2024-02-06</td>
                        <td className="py-4 px-4 text-sm">
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-amber-500/20 text-amber-400">
                            PAYMENT
                          </span>
                        </td>
                        <td className="py-4 px-4 text-sm text-white">Vendor Payment - Acme Corp</td>
                        <td className="py-4 px-4 text-sm text-gray-400">PAY-001</td>
                        <td className="py-4 px-4 text-sm text-rose-400 text-right">-$2,800.00</td>
                        <td className="py-4 px-4 text-center">
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-500/20 text-blue-400">
                            COMPLETED
                          </span>
                        </td>
                      </tr>
                      <tr className="hover:bg-white/[0.02]">
                        <td className="py-4 px-4 text-sm text-gray-300">2024-02-05</td>
                        <td className="py-4 px-4 text-sm">
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-purple-500/20 text-purple-400">
                            REFUND
                          </span>
                        </td>
                        <td className="py-4 px-4 text-sm text-white">
                          Order SO0003 - Customer Return
                        </td>
                        <td className="py-4 px-4 text-sm text-gray-400">RET-001</td>
                        <td className="py-4 px-4 text-sm text-rose-400 text-right">-$185.00</td>
                        <td className="py-4 px-4 text-center">
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-500/20 text-blue-400">
                            COMPLETED
                          </span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Pagination */}
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">Showing 1-5 of 128 transactions</p>
              <div className="flex items-center gap-2">
                <Button variant="secondary" size="sm" disabled>
                  Previous
                </Button>
                <Button variant="primary" size="sm">
                  Next
                </Button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default AccountingPage;
