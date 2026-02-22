/**
 * Accounting & Financial Dashboard page
 *
 * Displays financial metrics, profit/loss statements, inventory valuation,
 * vendor performance, and customer financial summaries
 *
 * ============================================================================
 * AESTHETIC DIRECTION: PURPLE INDUSTRIAL
 * ============================================================================
 * A refined, editorial financial command center:
 * - Dark, luxurious background with layered depth
 * - DM Serif Display for headlines (editorial, refined)
 * - IBM Plex Mono for numbers (precise, professional)
 * - Asymmetric hero section with signature visual
 * - Art Deco-inspired geometric accents
 * - Purple accent highlights matching application brand
 * - Orchestrated entrance animations
 * ============================================================================
 */

import React, { useState, useEffect, useRef } from 'react';
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
  Breadcrumb,
} from '@/components/shared';
import {
  CurrencyDollarIcon,
  ChartBarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  CubeIcon,
  UserGroupIcon,
  DocumentTextIcon,
  FunnelIcon,
  TruckIcon,
  ChevronDownIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';
import { useFinancialMetrics, useProfitLossStatement, useInventoryValuation } from '@/services/api';
import { AccountingPeriod, CostCategory } from '@opsui/shared';

// ============================================================================
// NUMBER COUNTER HOOK - Animates number counting
// ============================================================================

function useCountUp(end: number, duration: number = 1000, startOnMount: boolean = true) {
  const [count, setCount] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  const startAnimation = () => {
    setIsAnimating(true);
    const startTime = performance.now();
    const startValue = 0;

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Easing function - ease-out cubic
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const currentValue = startValue + (end - startValue) * easeOut;

      setCount(currentValue);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setIsAnimating(false);
      }
    };

    requestAnimationFrame(animate);
  };

  useEffect(() => {
    if (startOnMount && end > 0) {
      startAnimation();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [end, startOnMount]);

  return { count, isAnimating, startAnimation };
}

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
  delay?: number;
  isHero?: boolean;
}

function MetricCard({
  title,
  value,
  icon: Icon,
  trend,
  isLoading,
  variant = 'default',
  delay = 0,
  isHero = false,
}: MetricCardProps) {
  const variantColors = {
    default: 'border-slate-600/30',
    success: 'border-emerald-500/30',
    warning: 'border-amber-500/30',
    danger: 'border-rose-500/30',
  };

  const iconColors = {
    default: 'text-slate-400',
    success: 'text-emerald-400',
    warning: 'text-amber-400',
    danger: 'text-rose-400',
  };

  const glowColors = {
    default: '',
    success: 'profit-indicator',
    warning: '',
    danger: '',
  };

  if (isLoading) {
    return <MetricCardSkeleton />;
  }

  return (
    <div
      className={`accounting-card rounded-2xl deco-corner ${variantColors[variant]} ${isHero ? 'col-span-full lg:col-span-2' : ''}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className={`p-6 ${isHero ? 'lg:p-8' : ''}`}>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-slate-400 mb-2 tracking-wide uppercase">
              {title}
            </p>
            <p
              className={`ledger-currency text-white ${
                isHero ? 'text-4xl lg:text-5xl' : 'text-2xl lg:text-3xl'
              } ${variant === 'success' ? 'text-emerald-400' : ''} ${variant === 'danger' ? 'text-rose-400' : ''}`}
              style={{ animationDelay: `${delay + 100}ms` }}
            >
              {value}
            </p>
            {trend && (
              <div className="flex items-center gap-2 mt-3">
                <span
                  className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-sm font-medium ${
                    trend.isPositive
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : 'bg-rose-500/20 text-rose-400'
                  }`}
                >
                  {trend.isPositive ? (
                    <ArrowTrendingUpIcon className="h-4 w-4" />
                  ) : (
                    <ArrowTrendingDownIcon className="h-4 w-4" />
                  )}
                  {trend.isPositive ? '+' : ''}
                  {trend.value.toFixed(1)}%
                </span>
                <span className="text-xs text-slate-500">vs last period</span>
              </div>
            )}
          </div>
          <div
            className={`p-3 rounded-xl bg-white/5 ${glowColors[variant]} transition-all duration-300`}
          >
            <Icon className={`h-6 w-6 ${iconColors[variant]}`} />
          </div>
        </div>
      </div>
    </div>
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
      <div className="accounting-card rounded-2xl">
        <div className="p-6">
          <Skeleton variant="rounded" className="h-48" />
        </div>
      </div>
    );
  }

  const totalCost = Object.values(costByCategory).reduce((sum, val) => sum + val, 0);

  const categoryColors: Record<string, string> = {
    LABOR: 'bg-emerald-500',
    MATERIALS: 'bg-cyan-500',
    SHIPPING: 'bg-amber-500',
    STORAGE: 'bg-violet-500',
    OVERHEAD: 'bg-slate-500',
    EXCEPTIONS: 'bg-rose-500',
    QUALITY_CONTROL: 'bg-teal-500',
    MAINTENANCE: 'bg-orange-500',
  };

  return (
    <div className="accounting-card rounded-2xl" style={{ animationDelay: '300ms' }}>
      <div className="p-6">
        <h3 className="ledger-title text-xl text-white mb-6">Cost Breakdown</h3>
        <div className="space-y-4">
          {categories.map(([category, amount], index) => {
            const percentage = totalCost > 0 ? (amount / totalCost) * 100 : 0;
            return (
              <div key={category} style={{ animationDelay: `${350 + index * 50}ms` }}>
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-slate-300 capitalize tracking-wide">
                    {category.replace(/_/g, ' ').toLowerCase()}
                  </span>
                  <span className="ledger-currency text-white font-medium">
                    ${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-2 bg-slate-700/50 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${categoryColors[category] || 'bg-slate-500'} rounded-full transition-all duration-700 ease-out`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <span className="text-xs text-slate-500 w-12 text-right">
                    {percentage.toFixed(1)}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// PERIOD DROPDOWN COMPONENT
// ============================================================================

interface PeriodDropdownProps {
  selectedPeriod: AccountingPeriod;
  onSelectPeriod: (period: AccountingPeriod) => void;
}

const PERIOD_OPTIONS = [
  { value: AccountingPeriod.DAILY, label: 'Daily' },
  { value: AccountingPeriod.WEEKLY, label: 'Weekly' },
  { value: AccountingPeriod.MONTHLY, label: 'Monthly' },
  { value: AccountingPeriod.QUARTERLY, label: 'Quarterly' },
  { value: AccountingPeriod.YEARLY, label: 'Yearly' },
];

function PeriodDropdown({ selectedPeriod, onSelectPeriod }: PeriodDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const selectedLabel =
    PERIOD_OPTIONS.find(opt => opt.value === selectedPeriod)?.label || 'Monthly';

  return (
    <div className="relative" ref={dropdownRef}>
      <Button
        variant="secondary"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 min-w-[140px] justify-between bg-slate-800/50 border-slate-600/30 hover:bg-slate-700/50 hover:border-purple-500/30"
      >
        <span className="text-slate-300">{selectedLabel}</span>
        <ChevronDownIcon
          className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </Button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 min-w-[140px] bg-slate-800/95 backdrop-blur-xl border border-slate-600/30 rounded-xl shadow-xl overflow-hidden z-50">
          {PERIOD_OPTIONS.map(option => (
            <button
              key={option.value}
              onClick={() => {
                onSelectPeriod(option.value);
                setIsOpen(false);
              }}
              className={`w-full px-4 py-2.5 text-sm text-left transition-all duration-150 ${
                option.value === selectedPeriod
                  ? 'bg-emerald-500/20 text-emerald-400 font-medium'
                  : 'text-slate-300 hover:bg-slate-700/50 hover:text-white'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
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

  // Sample mock data for demonstration - varies by period
  const getSampleMetrics = (period: AccountingPeriod) => {
    const periodData = {
      [AccountingPeriod.DAILY]: {
        totalRevenue: 2850.0,
        totalCost: 1920.5,
        grossProfit: 929.5,
        netProfit: 720.8,
        profitMargin: 25.3,
        ordersProcessed: 12,
        averageOrderValue: 237.5,
        previousPeriod: { revenue: 2450.0, cost: 1750.0, profit: 700.0 },
      },
      [AccountingPeriod.WEEKLY]: {
        totalRevenue: 18540.0,
        totalCost: 12050.25,
        grossProfit: 6489.75,
        netProfit: 5320.5,
        profitMargin: 28.7,
        ordersProcessed: 78,
        averageOrderValue: 237.7,
        previousPeriod: { revenue: 16800.0, cost: 11200.0, profit: 5600.0 },
      },
      [AccountingPeriod.MONTHLY]: {
        totalRevenue: 45280.5,
        totalCost: 28150.25,
        grossProfit: 17130.25,
        netProfit: 14105.4,
        profitMargin: 31.1,
        ordersProcessed: 147,
        averageOrderValue: 308.16,
        previousPeriod: { revenue: 38500.0, cost: 26200.0, profit: 12300.0 },
      },
      [AccountingPeriod.QUARTERLY]: {
        totalRevenue: 148750.0,
        totalCost: 92450.0,
        grossProfit: 56300.0,
        netProfit: 46350.0,
        profitMargin: 31.2,
        ordersProcessed: 512,
        averageOrderValue: 290.5,
        previousPeriod: { revenue: 125800.0, cost: 84200.0, profit: 41600.0 },
      },
      [AccountingPeriod.YEARLY]: {
        totalRevenue: 589200.0,
        totalCost: 365800.0,
        grossProfit: 223400.0,
        netProfit: 183400.0,
        profitMargin: 31.1,
        ordersProcessed: 2150,
        averageOrderValue: 274.0,
        previousPeriod: { revenue: 495000.0, cost: 332000.0, profit: 163000.0 },
      },
    };

    const data = periodData[period];
    return {
      ...metrics,
      totalRevenue: data.totalRevenue,
      totalCost: data.totalCost,
      grossProfit: data.grossProfit,
      netProfit: data.netProfit,
      profitMargin: data.profitMargin,
      inventoryValue: 125780.0,
      ordersProcessed: data.ordersProcessed,
      averageOrderValue: data.averageOrderValue,
      totalExceptionCost: 425.0,
      outstandingReceivables: 12350.0,
      outstandingPayables: 8720.0,
      overdueReceivables: 2150.0,
      costByCategory: {
        LABOR: data.totalCost * 0.3,
        MATERIALS: data.totalCost * 0.54,
        SHIPPING: data.totalCost * 0.11,
        STORAGE: data.totalCost * 0.04,
        OVERHEAD: 0,
        EXCEPTIONS: 425.0,
        QUALITY_CONTROL: 275.0,
        MAINTENANCE: 300.0,
      },
      previousPeriod: data.previousPeriod,
    };
  };

  const sampleMetrics = metrics?.totalRevenue === 0 ? getSampleMetrics(selectedPeriod) : metrics;

  // Sample P&L data - varies by period
  const getSampleProfitLoss = (period: AccountingPeriod) => {
    const periodData = {
      [AccountingPeriod.DAILY]: {
        grossRevenue: 2875.0,
        returns: 25.0,
        netRevenue: 2850.0,
        materialCosts: 960.25,
        laborCosts: 576.15,
        totalCOGS: 1536.4,
        grossProfit: 1313.6,
        grossProfitMargin: 46.1,
        operatingExpenses: {
          STORAGE: 38.4,
          OVERHEAD: 0,
          EXCEPTIONS: 25.0,
          QUALITY_CONTROL: 18.5,
        },
        totalOperatingExpenses: 81.9,
        operatingIncome: 1231.7,
        operatingMargin: 43.2,
        otherIncome: 0,
        otherExpenses: 35.0,
        netIncome: 1196.7,
        netMargin: 42.0,
      },
      [AccountingPeriod.WEEKLY]: {
        grossRevenue: 18725.0,
        returns: 185.0,
        netRevenue: 18540.0,
        materialCosts: 6235.0,
        laborCosts: 3741.0,
        totalCOGS: 9976.0,
        grossProfit: 8564.0,
        grossProfitMargin: 45.7,
        operatingExpenses: {
          STORAGE: 270.0,
          OVERHEAD: 0,
          EXCEPTIONS: 180.0,
          QUALITY_CONTROL: 130.0,
        },
        totalOperatingExpenses: 580.0,
        operatingIncome: 7984.0,
        operatingMargin: 43.1,
        otherIncome: 0,
        otherExpenses: 250.0,
        netIncome: 7734.0,
        netMargin: 41.7,
      },
      [AccountingPeriod.MONTHLY]: {
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
      },
      [AccountingPeriod.QUARTERLY]: {
        grossRevenue: 150050.0,
        returns: 1300.0,
        netRevenue: 148750.0,
        materialCosts: 49920.0,
        laborCosts: 27756.0,
        totalCOGS: 77676.0,
        grossProfit: 71074.0,
        grossProfitMargin: 47.8,
        operatingExpenses: {
          STORAGE: 3600.0,
          OVERHEAD: 0,
          EXCEPTIONS: 1275.0,
          QUALITY_CONTROL: 825.0,
        },
        totalOperatingExpenses: 5700.0,
        operatingIncome: 65374.0,
        operatingMargin: 43.9,
        otherIncome: 0,
        otherExpenses: 2400.0,
        netIncome: 62974.0,
        netMargin: 42.3,
      },
      [AccountingPeriod.YEARLY]: {
        grossRevenue: 594600.0,
        returns: 5400.0,
        netRevenue: 589200.0,
        materialCosts: 197352.0,
        laborCosts: 109624.0,
        totalCOGS: 306976.0,
        grossProfit: 282224.0,
        grossProfitMargin: 47.9,
        operatingExpenses: {
          STORAGE: 14400.0,
          OVERHEAD: 0,
          EXCEPTIONS: 5100.0,
          QUALITY_CONTROL: 3300.0,
        },
        totalOperatingExpenses: 22800.0,
        operatingIncome: 259424.0,
        operatingMargin: 44.0,
        otherIncome: 0,
        otherExpenses: 9600.0,
        netIncome: 249824.0,
        netMargin: 42.4,
      },
    };

    const data = periodData[period];
    return {
      ...profitLoss,
      grossRevenue: data.grossRevenue,
      returns: data.returns,
      netRevenue: data.netRevenue,
      materialCosts: data.materialCosts,
      laborCosts: data.laborCosts,
      totalCOGS: data.totalCOGS,
      grossProfit: data.grossProfit,
      grossProfitMargin: data.grossProfitMargin,
      operatingExpenses: data.operatingExpenses,
      totalOperatingExpenses: data.totalOperatingExpenses,
      operatingIncome: data.operatingIncome,
      operatingMargin: data.operatingMargin,
      otherIncome: data.otherIncome,
      otherExpenses: data.otherExpenses,
      netIncome: data.netIncome,
      netMargin: data.netMargin,
    };
  };

  const sampleProfitLoss =
    profitLoss?.grossRevenue === 0 ? getSampleProfitLoss(selectedPeriod) : profitLoss;

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

  // Format currency
  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Calculate trends
  const getTrend = (current: number, previous?: number) => {
    if (!previous || previous === 0) return undefined;
    const change = ((current - previous) / previous) * 100;
    return { value: Math.abs(change), isPositive: change >= 0 };
  };

  const revenueTrend = sampleMetrics?.previousPeriod
    ? getTrend(sampleMetrics.totalRevenue, sampleMetrics.previousPeriod.revenue)
    : undefined;
  const profitTrend = sampleMetrics?.previousPeriod
    ? getTrend(sampleMetrics.netProfit, sampleMetrics.previousPeriod.profit)
    : undefined;

  const tabs = [
    { id: 'overview', label: 'Overview', icon: ChartBarIcon },
    { id: 'profit-loss', label: 'Profit & Loss', icon: DocumentTextIcon },
    { id: 'inventory', label: 'Inventory Valuation', icon: CubeIcon },
    { id: 'transactions', label: 'Transactions', icon: CurrencyDollarIcon },
  ];

  return (
    <div className="min-h-screen relative accounting-page-container">
      {/* Atmospheric background elements */}
      <div className="accounting-atmosphere" />
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div
          className="ledger-float-element absolute top-20 right-20 w-64 h-64 border border-purple-500/10 rounded-full"
          style={{ animationDelay: '0s' }}
        />
        <div
          className="ledger-float-element absolute bottom-40 left-20 w-48 h-48 border border-purple-400/10 rounded-full"
          style={{ animationDelay: '2s' }}
        />
        <div
          className="ledger-float-element absolute top-1/3 left-1/4 w-32 h-32 border border-purple-500/5 rotate-45"
          style={{ animationDelay: '4s' }}
        />
      </div>

      <Header />

      <main className="w-full px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        {/* Breadcrumb Navigation */}
        <Breadcrumb />

        {/* Page Header - Asymmetric Hero */}
        <div className="mb-10 ledger-hero">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
            {/* Left side - Title and description */}
            <div
              className="flex items-start gap-5"
              style={{ animation: 'ledger-stagger-in 0.5s ease-out' }}
            >
              <div className="p-4 bg-gradient-to-br from-purple-500/20 to-purple-600/10 rounded-2xl border border-purple-500/30 shadow-lg shadow-purple-500/10">
                <CurrencyDollarIcon className="h-8 w-8 text-purple-400" />
              </div>
              <div>
                <h1 className="ledger-title text-3xl lg:text-4xl text-white mb-2">
                  Accounting & Financials
                </h1>
                <p className="text-slate-400 max-w-md">
                  Financial metrics, profit & loss analysis, and inventory valuation
                </p>
              </div>
            </div>

            {/* Right side - Controls */}
            <div
              className="flex items-center gap-3"
              style={{ animation: 'ledger-stagger-in 0.5s ease-out 100ms backwards' }}
            >
              <PeriodDropdown
                selectedPeriod={selectedPeriod}
                onSelectPeriod={period => {
                  setSelectedPeriod(period);
                }}
              />
              <Button
                variant="secondary"
                size="sm"
                onClick={() => refetchMetrics()}
                disabled={isLoadingMetrics}
                className="flex items-center gap-2 bg-slate-800/50 border-slate-600/30 hover:bg-slate-700/50 hover:border-purple-500/30"
              >
                <FunnelIcon className={`h-4 w-4 ${isLoadingMetrics ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
        </div>

        {/* Tabs - Refined */}
        <div className="mb-8">
          <div className="flex items-center gap-1 overflow-x-auto pb-2">
            {tabs.map((tab, index) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  role="tab"
                  aria-selected={isActive}
                  aria-controls={`panel-${tab.id}`}
                  id={`tab-${tab.id}`}
                  className={`ledger-tab flex items-center gap-2.5 px-5 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? 'bg-purple-500/15 text-purple-400 border border-purple-500/30'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/50 border border-transparent'
                  }`}
                  style={{ animationDelay: `${150 + index * 50}ms` }}
                >
                  <Icon
                    className={`h-4 w-4 transition-transform duration-200 ${isActive ? 'scale-110' : ''}`}
                  />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* Hero Metric + Key Metrics Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* Hero Metric - Net Profit */}
              <MetricCard
                title="Net Profit"
                value={formatCurrency(sampleMetrics?.netProfit || 0)}
                icon={SparklesIcon}
                trend={profitTrend}
                isLoading={isLoadingMetrics}
                variant={sampleMetrics?.netProfit >= 0 ? 'success' : 'danger'}
                delay={0}
                isHero
              />

              {/* Supporting metrics */}
              <MetricCard
                title="Total Revenue"
                value={formatCurrency(sampleMetrics?.totalRevenue || 0)}
                icon={ChartBarIcon}
                trend={revenueTrend}
                isLoading={isLoadingMetrics}
                variant="default"
                delay={50}
              />
              <MetricCard
                title="Total Cost"
                value={formatCurrency(sampleMetrics?.totalCost || 0)}
                icon={ArrowTrendingDownIcon}
                isLoading={isLoadingMetrics}
                variant="warning"
                delay={100}
              />
              <MetricCard
                title="Profit Margin"
                value={`${sampleMetrics?.profitMargin.toFixed(1) || 0}%`}
                icon={ArrowTrendingUpIcon}
                isLoading={isLoadingMetrics}
                variant="default"
                delay={150}
              />
            </div>

            {/* Secondary Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <MetricCard
                title="Inventory Value"
                value={formatCurrency(sampleMetrics?.inventoryValue || 0)}
                icon={CubeIcon}
                isLoading={isLoadingMetrics}
                delay={200}
              />
              <MetricCard
                title="Orders Processed"
                value={sampleMetrics?.ordersProcessed || 0}
                icon={DocumentTextIcon}
                isLoading={isLoadingMetrics}
                delay={250}
              />
              <MetricCard
                title="Avg Order Value"
                value={formatCurrency(sampleMetrics?.averageOrderValue || 0)}
                icon={ChartBarIcon}
                isLoading={isLoadingMetrics}
                delay={300}
              />
              <MetricCard
                title="Exception Costs"
                value={formatCurrency(sampleMetrics?.totalExceptionCost || 0)}
                icon={ArrowTrendingDownIcon}
                isLoading={isLoadingMetrics}
                variant="danger"
                delay={350}
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
                delay={400}
              />
              <MetricCard
                title="Outstanding Payables"
                value={formatCurrency(sampleMetrics?.outstandingPayables || 0)}
                icon={TruckIcon}
                isLoading={isLoadingMetrics}
                variant="warning"
                delay={450}
              />
              <MetricCard
                title="Overdue Receivables"
                value={formatCurrency(sampleMetrics?.overdueReceivables || 0)}
                icon={ArrowTrendingDownIcon}
                isLoading={isLoadingMetrics}
                variant="danger"
                delay={500}
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
                <div className="accounting-card rounded-2xl" style={{ animationDelay: '50ms' }}>
                  <div className="p-6">
                    <h3 className="ledger-title text-xl text-emerald-400 mb-6">Revenue</h3>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center py-3 border-b border-slate-700/50">
                        <span className="text-slate-400">Gross Revenue</span>
                        <span className="ledger-currency text-white font-medium">
                          {formatCurrency(sampleProfitLoss.grossRevenue)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-3 border-b border-slate-700/50">
                        <span className="text-slate-400">Returns & Refunds</span>
                        <span className="ledger-currency text-rose-400 font-medium">
                          ({formatCurrency(sampleProfitLoss.returns)})
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-4 bg-emerald-500/10 rounded-xl px-4 border border-emerald-500/20">
                        <span className="text-white font-medium">Net Revenue</span>
                        <span className="ledger-currency text-emerald-400 text-lg">
                          {formatCurrency(sampleProfitLoss.netRevenue)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Cost of Goods Sold */}
                <div className="accounting-card rounded-2xl" style={{ animationDelay: '100ms' }}>
                  <div className="p-6">
                    <h3 className="ledger-title text-xl text-rose-400 mb-6">Cost of Goods Sold</h3>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center py-3 border-b border-slate-700/50">
                        <span className="text-slate-400">Material Costs</span>
                        <span className="ledger-currency text-white font-medium">
                          {formatCurrency(sampleProfitLoss.materialCosts)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-3 border-b border-slate-700/50">
                        <span className="text-slate-400">Labor Costs</span>
                        <span className="ledger-currency text-white font-medium">
                          {formatCurrency(sampleProfitLoss.laborCosts)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-4 bg-rose-500/10 rounded-xl px-4 border border-rose-500/20">
                        <span className="text-white font-medium">Total COGS</span>
                        <span className="ledger-currency text-rose-400 text-lg">
                          {formatCurrency(sampleProfitLoss.totalCOGS)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Gross Profit */}
                <div
                  className="accounting-card rounded-2xl border-l-4 border-l-emerald-500 bg-gradient-to-r from-emerald-500/10 to-transparent"
                  style={{ animationDelay: '150ms' }}
                >
                  <div className="p-6">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-sm text-slate-400 mb-2">Gross Profit</p>
                        <p className="ledger-currency text-3xl text-emerald-400">
                          {formatCurrency(sampleProfitLoss.grossProfit)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-slate-400 mb-2">Gross Margin</p>
                        <p className="ledger-currency text-2xl text-white">
                          {sampleProfitLoss.grossProfitMargin.toFixed(1)}%
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Operating Expenses */}
                <div className="accounting-card rounded-2xl" style={{ animationDelay: '200ms' }}>
                  <div className="p-6">
                    <h3 className="ledger-title text-xl text-amber-400 mb-6">Operating Expenses</h3>
                    <div className="space-y-4">
                      {Object.entries(sampleProfitLoss.operatingExpenses).map(
                        ([key, value]) =>
                          typeof value === 'number' &&
                          value > 0 && (
                            <div
                              key={key}
                              className="flex justify-between items-center py-3 border-b border-slate-700/50"
                            >
                              <span className="text-slate-400 capitalize">
                                {key.replace(/_/g, ' ').toLowerCase()}
                              </span>
                              <span className="ledger-currency text-white font-medium">
                                {formatCurrency(value as number)}
                              </span>
                            </div>
                          )
                      )}
                      <div className="flex justify-between items-center py-4 bg-amber-500/10 rounded-xl px-4 border border-amber-500/20">
                        <span className="text-white font-medium">Total Operating Expenses</span>
                        <span className="ledger-currency text-amber-400 text-lg">
                          {formatCurrency(sampleProfitLoss.totalOperatingExpenses)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Net Income */}
                <div
                  className={`accounting-card rounded-2xl border-l-4 ${sampleProfitLoss.netIncome >= 0 ? 'border-l-emerald-500 bg-gradient-to-r from-emerald-500/10 to-transparent' : 'border-l-rose-500 bg-gradient-to-r from-rose-500/10 to-transparent'}`}
                  style={{ animationDelay: '250ms' }}
                >
                  <div className="p-6">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-sm text-slate-400 mb-2">Net Income</p>
                        <p
                          className={`ledger-currency text-3xl ${sampleProfitLoss.netIncome >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}
                        >
                          {formatCurrency(sampleProfitLoss.netIncome)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-slate-400 mb-2">Net Margin</p>
                        <p className={`ledger-currency text-2xl text-white`}>
                          {sampleProfitLoss.netMargin.toFixed(1)}%
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
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
                <div
                  className="accounting-card rounded-2xl border-l-4 border-l-cyan-500 bg-gradient-to-r from-cyan-500/10 to-transparent"
                  style={{ animationDelay: '50ms' }}
                >
                  <div className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-slate-400 mb-2">Total Inventory Value</p>
                        <p className="ledger-currency text-4xl text-white">
                          {formatCurrency(sampleInventoryData?.totalValue || 0)}
                        </p>
                      </div>
                      <div className="p-4 bg-cyan-500/20 rounded-2xl">
                        <CubeIcon className="h-10 w-10 text-cyan-400" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* By Category */}
                <div className="accounting-card rounded-2xl" style={{ animationDelay: '100ms' }}>
                  <div className="p-6">
                    <h3 className="ledger-title text-xl text-white mb-6">
                      Inventory Value by Category
                    </h3>
                    <div className="space-y-4">
                      {Object.entries(sampleInventoryData?.byCategory || {}).map(
                        ([category, value], index) => (
                          <div key={category} style={{ animationDelay: `${150 + index * 50}ms` }}>
                            <div className="flex items-center justify-between text-sm mb-2">
                              <span className="text-slate-300 font-medium">{category}</span>
                              <span className="ledger-currency text-white font-medium">
                                {formatCurrency(value as number)}
                              </span>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="flex-1 h-3 bg-slate-700/50 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-gradient-to-r from-cyan-500 to-teal-500 rounded-full transition-all duration-700"
                                  style={{
                                    width: `${((value as number) / (sampleInventoryData?.totalValue || 1)) * 100}%`,
                                  }}
                                />
                              </div>
                              <span className="text-xs text-slate-500 w-12 text-right">
                                {(
                                  ((value as number) / (sampleInventoryData?.totalValue || 1)) *
                                  100
                                ).toFixed(1)}
                                %
                              </span>
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                </div>

                {/* By Zone */}
                <div className="accounting-card rounded-2xl" style={{ animationDelay: '150ms' }}>
                  <div className="p-6">
                    <h3 className="ledger-title text-xl text-white mb-6">
                      Inventory Value by Zone
                    </h3>
                    <div className="space-y-4">
                      {Object.entries(sampleInventoryData?.byZone || {}).map(
                        ([zone, value], index) => (
                          <div key={zone} style={{ animationDelay: `${200 + index * 50}ms` }}>
                            <div className="flex items-center justify-between text-sm mb-2">
                              <span className="text-slate-300 font-medium">{zone}</span>
                              <span className="ledger-currency text-white font-medium">
                                {formatCurrency(value as number)}
                              </span>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="flex-1 h-3 bg-slate-700/50 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-gradient-to-r from-emerald-500 to-green-500 rounded-full transition-all duration-700"
                                  style={{
                                    width: `${((value as number) / (sampleInventoryData?.totalValue || 1)) * 100}%`,
                                  }}
                                />
                              </div>
                              <span className="text-xs text-slate-500 w-12 text-right">
                                {(
                                  ((value as number) / (sampleInventoryData?.totalValue || 1)) *
                                  100
                                ).toFixed(1)}
                                %
                              </span>
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* Transactions Tab */}
        {activeTab === 'transactions' && (
          <div className="space-y-6">
            {/* Transaction Filters */}
            <div className="accounting-card rounded-2xl" style={{ animationDelay: '50ms' }}>
              <div className="p-6">
                <div className="flex items-center gap-4 flex-wrap">
                  <div className="flex-1 min-w-[200px]">
                    <label
                      htmlFor="transaction-type-filter"
                      className="text-sm text-slate-400 mb-2 block"
                    >
                      Transaction Type
                    </label>
                    <select
                      id="transaction-type-filter"
                      className="w-full px-4 py-2.5 bg-slate-800/50 border border-slate-600/30 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all"
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
                      className="text-sm text-slate-400 mb-2 block"
                    >
                      Reference Type
                    </label>
                    <select
                      id="reference-type-filter"
                      className="w-full px-4 py-2.5 bg-slate-800/50 border border-slate-600/30 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all"
                    >
                      <option value="">All References</option>
                      <option value="ORDER">Order</option>
                      <option value="INVOICE">Invoice</option>
                      <option value="RECEIPT">Receipt</option>
                    </select>
                  </div>
                  <div className="flex-1 min-w-[200px]">
                    <label htmlFor="status-filter" className="text-sm text-slate-400 mb-2 block">
                      Status
                    </label>
                    <select
                      id="status-filter"
                      className="w-full px-4 py-2.5 bg-slate-800/50 border border-slate-600/30 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all"
                    >
                      <option value="">All Statuses</option>
                      <option value="PENDING">Pending</option>
                      <option value="COMPLETED">Completed</option>
                      <option value="CANCELLED">Cancelled</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Transactions List */}
            <div className="accounting-card rounded-2xl" style={{ animationDelay: '100ms' }}>
              <div className="p-6">
                <h3 className="ledger-title text-xl text-white mb-6">Recent Transactions</h3>
                <div className="overflow-x-auto">
                  <table className="w-full" role="table">
                    <thead>
                      <tr className="border-b border-slate-700/50">
                        <th className="text-left py-3 px-4 text-sm font-medium text-slate-400">
                          Date
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-slate-400">
                          Type
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-slate-400">
                          Description
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-slate-400">
                          Reference
                        </th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-slate-400">
                          Amount
                        </th>
                        <th className="text-center py-3 px-4 text-sm font-medium text-slate-400">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="transaction-row border-b border-slate-700/30">
                        <td className="py-4 px-4 text-sm text-slate-300">2024-02-07</td>
                        <td className="py-4 px-4">
                          <span className="status-badge-ledger completed px-2 py-1 rounded-lg text-xs font-medium">
                            REVENUE
                          </span>
                        </td>
                        <td className="py-4 px-4 text-sm text-white">Order SO0001 - Shipment</td>
                        <td className="py-4 px-4 text-sm text-slate-500 ledger-currency">
                          ORD-12345678-1234
                        </td>
                        <td className="py-4 px-4 text-sm text-emerald-400 text-right ledger-currency">
                          +$1,250.00
                        </td>
                        <td className="py-4 px-4 text-center">
                          <span className="status-badge-ledger completed px-2 py-1 rounded-lg text-xs font-medium">
                            COMPLETED
                          </span>
                        </td>
                      </tr>
                      <tr className="transaction-row border-b border-slate-700/30">
                        <td className="py-4 px-4 text-sm text-slate-300">2024-02-07</td>
                        <td className="py-4 px-4">
                          <span className="px-2 py-1 rounded-lg text-xs font-medium bg-rose-500/15 text-rose-400 border border-rose-500/30">
                            EXPENSE
                          </span>
                        </td>
                        <td className="py-4 px-4 text-sm text-white">Inventory - SKU10050</td>
                        <td className="py-4 px-4 text-sm text-slate-500 ledger-currency">
                          RCP-001
                        </td>
                        <td className="py-4 px-4 text-sm text-rose-400 text-right ledger-currency">
                          -$450.00
                        </td>
                        <td className="py-4 px-4 text-center">
                          <span className="status-badge-ledger completed px-2 py-1 rounded-lg text-xs font-medium">
                            COMPLETED
                          </span>
                        </td>
                      </tr>
                      <tr className="transaction-row border-b border-slate-700/30">
                        <td className="py-4 px-4 text-sm text-slate-300">2024-02-06</td>
                        <td className="py-4 px-4">
                          <span className="status-badge-ledger completed px-2 py-1 rounded-lg text-xs font-medium">
                            REVENUE
                          </span>
                        </td>
                        <td className="py-4 px-4 text-sm text-white">Order SO0002 - Shipment</td>
                        <td className="py-4 px-4 text-sm text-slate-500 ledger-currency">
                          ORD-12345678-5678
                        </td>
                        <td className="py-4 px-4 text-sm text-emerald-400 text-right ledger-currency">
                          +$3,200.00
                        </td>
                        <td className="py-4 px-4 text-center">
                          <span className="status-badge-ledger completed px-2 py-1 rounded-lg text-xs font-medium">
                            COMPLETED
                          </span>
                        </td>
                      </tr>
                      <tr className="transaction-row border-b border-slate-700/30">
                        <td className="py-4 px-4 text-sm text-slate-300">2024-02-06</td>
                        <td className="py-4 px-4">
                          <span className="px-2 py-1 rounded-lg text-xs font-medium bg-amber-500/15 text-amber-400 border border-amber-500/30">
                            PAYMENT
                          </span>
                        </td>
                        <td className="py-4 px-4 text-sm text-white">Vendor Payment - Acme Corp</td>
                        <td className="py-4 px-4 text-sm text-slate-500 ledger-currency">
                          PAY-001
                        </td>
                        <td className="py-4 px-4 text-sm text-rose-400 text-right ledger-currency">
                          -$2,800.00
                        </td>
                        <td className="py-4 px-4 text-center">
                          <span className="status-badge-ledger completed px-2 py-1 rounded-lg text-xs font-medium">
                            COMPLETED
                          </span>
                        </td>
                      </tr>
                      <tr className="transaction-row">
                        <td className="py-4 px-4 text-sm text-slate-300">2024-02-05</td>
                        <td className="py-4 px-4">
                          <span className="px-2 py-1 rounded-lg text-xs font-medium bg-violet-500/15 text-violet-400 border border-violet-500/30">
                            REFUND
                          </span>
                        </td>
                        <td className="py-4 px-4 text-sm text-white">
                          Order SO0003 - Customer Return
                        </td>
                        <td className="py-4 px-4 text-sm text-slate-500 ledger-currency">
                          RET-001
                        </td>
                        <td className="py-4 px-4 text-sm text-rose-400 text-right ledger-currency">
                          -$185.00
                        </td>
                        <td className="py-4 px-4 text-center">
                          <span className="status-badge-ledger completed px-2 py-1 rounded-lg text-xs font-medium">
                            COMPLETED
                          </span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-400">Showing 1-5 of 128 transactions</p>
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled
                  className="bg-slate-800/50 border-slate-600/30"
                >
                  Previous
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  className="bg-purple-500/20 border border-purple-500/30 text-purple-400 hover:bg-purple-500/30"
                >
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
