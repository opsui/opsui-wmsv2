/**
 * Cash Flow Statement Page
 *
 * Displays the cash flow statement showing cash inflows and outflows
 * from operating, investing, and financing activities.
 *
 * Design: Purple Industrial Aesthetic
 * - DM Serif Display for elegant headings
 * - IBM Plex Mono for precise financial figures
 * - Staggered entrance animations
 * - Atmospheric depth with subtle glows
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Header,
  Button,
  Skeleton,
  Breadcrumb,
} from '@/components/shared';
import {
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  PrinterIcon,
  ArrowDownTrayIcon,
  CurrencyDollarIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import { useCashFlowStatement } from '@/services/api';
import { type CashFlowStatement } from '@opsui/shared';

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

interface CashFlowSectionProps {
  title: string;
  subtitle?: string;
  items: Array<{ name: string; amount: number }>;
  totalLabel: string;
  total: number;
  isInflow?: boolean;
  animationDelay?: number;
}

function CashFlowSection({
  title,
  subtitle,
  items,
  totalLabel,
  total,
  isInflow = true,
  animationDelay = 0,
}: CashFlowSectionProps) {
  const formatCurrency = (value: number): string => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(num);
  };

  return (
    <div className="space-y-3" style={{ animationDelay: `${animationDelay}ms` }}>
      <div>
        <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-widest border-b border-gray-200 dark:border-gray-700/50 pb-2">
          {title}
        </h4>
        {subtitle && <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">{subtitle}</p>}
      </div>
      <div className="space-y-1">
        {items.map((item, index) => (
          <div
            key={index}
            className="group flex items-center justify-between py-2.5 px-3 -mx-3 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 transition-all duration-200 cursor-default"
            style={{ animationDelay: `${animationDelay + index * 50}ms` }}
          >
            <span className="text-sm text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-gray-100 transition-colors">
              {item.name}
            </span>
            <span
              className={`ledger-currency text-sm font-medium ${item.amount >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}
            >
              {item.amount >= 0 ? '+' : ''}
              {formatCurrency(item.amount)}
            </span>
          </div>
        ))}
        <div
          className={`flex items-center justify-between py-3 px-4 bg-gray-100 dark:bg-white/[0.03] rounded-xl border-l-4 ${isInflow ? 'border-l-emerald-500 dark:border-l-emerald-400' : 'border-l-rose-500 dark:border-l-rose-400'}`}
        >
          <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
            {totalLabel}
          </span>
          <span
            className={`ledger-currency text-sm font-bold ${total >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}
          >
            {total >= 0 ? '+' : ''}
            {formatCurrency(total)}
          </span>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// ANIMATED NUMBER COMPONENT
// ============================================================================

interface AnimatedNumberProps {
  value: number;
  className?: string;
  prefix?: string;
  delay?: number;
  showSign?: boolean;
}

function AnimatedNumber({
  value,
  className = '',
  prefix = '$',
  delay = 0,
  showSign = false,
}: AnimatedNumberProps) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const duration = 1000;
    const steps = 60;
    const increment = value / steps;
    let current = 0;

    const timeout = setTimeout(() => {
      const interval = setInterval(() => {
        current += increment;
        if (current >= value) {
          setDisplayValue(value);
          clearInterval(interval);
        } else {
          setDisplayValue(Math.floor(current * 100) / 100);
        }
      }, duration / steps);

      return () => clearInterval(interval);
    }, delay);

    return () => clearTimeout(timeout);
  }, [value, delay]);

  const formattedValue = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(displayValue));

  const sign = showSign && value >= 0 ? '+' : value < 0 ? '-' : '';

  return (
    <span className={`ledger-currency ${className}`}>
      {sign}
      {prefix}
      {formattedValue}
    </span>
  );
}

// ============================================================================
// MAIN PAGE
// ============================================================================

function CashFlowPage() {
  const navigate = useNavigate();

  // State
  const [startDate, setStartDate] = useState<string>(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [endDate, setEndDate] = useState<string>(new Date().toISOString().split('T')[0]);

  // API hook
  const { data: cashFlow, isLoading, refetch } = useCashFlowStatement({ startDate, endDate });

  // Sample cash flow data
  const sampleCashFlow = {
    period: { startDate, endDate },
    operating: {
      activities: [
        { name: 'Net Income', amount: 45000 },
        { name: 'Depreciation', amount: 5000 },
        { name: 'Accounts Receivable', amount: -3500 },
        { name: 'Inventory', amount: -2000 },
        { name: 'Accounts Payable', amount: 2500 },
      ],
      total: 47000,
    },
    investing: {
      activities: [
        { name: 'Equipment Purchases', amount: -15000 },
        { name: 'Vehicle Purchase', amount: -8000 },
        { name: 'Sale of Assets', amount: 3000 },
      ],
      total: -20000,
    },
    financing: {
      activities: [
        { name: 'Loan Repayment', amount: -5000 },
        { name: 'Dividends Paid', amount: -10000 },
        { name: 'Capital Contribution', amount: 20000 },
      ],
      total: 5000,
    },
    netCashFlow: 32000,
  };

  // Use sample data if API returns nothing
  const displayCashFlow = cashFlow || sampleCashFlow;

  // Format currency
  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  };

  // Calculate period info
  const getPeriodLabel = () => {
    const period = displayCashFlow?.period;
    if (!period) return '30 days';
    const start = new Date(period.startDate || Date.now());
    const end = new Date(period.endDate || Date.now());
    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    if (days <= 31) {
      return `${days} days`;
    }
    const months = Math.floor(days / 30);
    return `${months} month${months > 1 ? 's' : ''}`;
  };

  // Export to CSV
  const exportToCSV = () => {
    if (!displayCashFlow) return;

    const lines: string[] = [];

    lines.push('CASH FLOW STATEMENT');
    lines.push(
      `Period: ${new Date(displayCashFlow.period?.startDate || '').toLocaleDateString()} - ${new Date(displayCashFlow.period?.endDate || '').toLocaleDateString()}`
    );
    lines.push('');

    lines.push('OPERATING ACTIVITIES');
    (displayCashFlow.operating?.activities || []).forEach((act: any) => {
      lines.push(`${act.name},${(act.amount || 0).toFixed(2)}`);
    });
    lines.push(`Net Cash from Operating,${(displayCashFlow.operating?.total || 0).toFixed(2)}`);
    lines.push('');

    lines.push('INVESTING ACTIVITIES');
    (displayCashFlow.investing?.activities || []).forEach((act: any) => {
      lines.push(`${act.name},${(act.amount || 0).toFixed(2)}`);
    });
    lines.push(`Net Cash from Investing,${(displayCashFlow.investing?.total || 0).toFixed(2)}`);
    lines.push('');

    lines.push('FINANCING ACTIVITIES');
    (displayCashFlow.financing?.activities || []).forEach((act: any) => {
      lines.push(`${act.name},${(act.amount || 0).toFixed(2)}`);
    });
    lines.push(`Net Cash from Financing,${(displayCashFlow.financing?.total || 0).toFixed(2)}`);
    lines.push('');

    lines.push(`NET CASH FLOW,${(displayCashFlow.netCashFlow || 0).toFixed(2)}`);

    const csvContent = lines.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cash-flow-${startDate}-to-${endDate}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Print
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen accounting-page-container">
      <Header />

      {/* Atmospheric background */}
      <div className="accounting-atmosphere" aria-hidden="true" />

      <main className="relative z-10 w-full px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb Navigation */}
        <Breadcrumb />

        {/* Page Header - Editorial Style */}
        <header className="mb-10 ledger-hero">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
            {/* Title Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="absolute inset-0 bg-purple-500/20 blur-xl rounded-full" />
                  <div className="relative p-3 bg-gradient-to-br from-purple-500/20 to-purple-600/10 rounded-2xl border border-purple-500/20">
                    <CurrencyDollarIcon className="h-7 w-7 text-purple-500 dark:text-purple-400" />
                  </div>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-widest">
                    Financial Statement
                  </p>
                </div>
              </div>

              <h1 className="ledger-title text-4xl sm:text-5xl text-gray-900 dark:text-white">
                Cash Flow Statement
              </h1>

              <p className="text-gray-600 dark:text-gray-400 max-w-xl text-lg leading-relaxed">
                Cash inflows and outflows from operating, investing, and financing activities
              </p>
            </div>

            {/* Actions & Date */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              {/* Date Filters */}
              <div className="flex items-center gap-3">
                <div className="relative group">
                  <label
                    htmlFor="start-date"
                    className="absolute -top-2 left-3 text-xs font-medium text-gray-500 dark:text-gray-400 bg-white dark:bg-slate-900 px-2 rounded"
                  >
                    Start Date
                  </label>
                  <input
                    id="start-date"
                    type="date"
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                    className="w-full sm:w-auto px-4 py-3 rounded-xl text-sm bg-white dark:bg-slate-800/50 border border-gray-300 dark:border-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500/30"
                  />
                </div>
                <div className="relative group">
                  <label
                    htmlFor="end-date"
                    className="absolute -top-2 left-3 text-xs font-medium text-gray-500 dark:text-gray-400 bg-white dark:bg-slate-900 px-2 rounded"
                  >
                    End Date
                  </label>
                  <input
                    id="end-date"
                    type="date"
                    value={endDate}
                    onChange={e => setEndDate(e.target.value)}
                    className="w-full sm:w-auto px-4 py-3 rounded-xl text-sm bg-white dark:bg-slate-800/50 border border-gray-300 dark:border-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500/30"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  onClick={exportToCSV}
                  className="action-button-enhanced flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-100 dark:bg-purple-500/20 border border-purple-300 dark:border-purple-500/30 text-purple-700 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-purple-500/30"
                >
                  <ArrowDownTrayIcon className="h-4 w-4" />
                  <span className="hidden sm:inline">Export</span>
                </Button>
                <Button
                  variant="secondary"
                  onClick={handlePrint}
                  className="action-button-enhanced flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-100 dark:bg-purple-500/20 border border-purple-300 dark:border-purple-500/30 text-purple-700 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-purple-500/30"
                >
                  <PrinterIcon className="h-4 w-4" />
                  <span className="hidden sm:inline">Print</span>
                </Button>
              </div>
            </div>
          </div>

          {/* Period indicator */}
          {displayCashFlow && (
            <div className="mt-6 flex items-center gap-3">
              <div className="px-4 py-2 bg-gray-100 dark:bg-white/[0.03] rounded-xl border border-gray-200 dark:border-gray-700/30">
                <p className="text-xs text-gray-500 dark:text-gray-500">Period</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {getPeriodLabel()}
                </p>
              </div>
            </div>
          )}

          {/* Decorative line */}
          <div className="mt-8 h-px bg-gradient-to-r from-transparent via-purple-500/30 to-transparent" />
        </header>

        {/* Cash Flow Statement */}
        {isLoading ? (
          <div className="space-y-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="accounting-card rounded-2xl p-6">
                <Skeleton variant="text" className="h-6 w-32 mb-4" />
                <Skeleton variant="rounded" className="h-40" />
              </div>
            ))}
          </div>
        ) : displayCashFlow ? (
          <>
            {/* Net Cash Flow Header */}
            <div className="mb-8 p-6 rounded-2xl bg-white dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700/50">
              <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-6 text-center">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Net Cash Flow</span>
                  <span
                    className={`text-3xl font-bold ledger-currency ${displayCashFlow.netCashFlow >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}
                  >
                    <AnimatedNumber value={displayCashFlow.netCashFlow} delay={200} showSign />
                  </span>
                </div>
                <ArrowPathIcon className="h-5 w-5 text-gray-400 dark:text-gray-500 rotate-90" />
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <span className="text-xs text-gray-500 dark:text-gray-400 block">Opening</span>
                    <span className="ledger-currency text-lg font-bold text-gray-600 dark:text-gray-400">
                      $0.00
                    </span>
                  </div>
                  <span className="text-xl text-gray-400 dark:text-gray-500">→</span>
                  <div className="text-center">
                    <span className="text-xs text-gray-500 dark:text-gray-400 block">Closing</span>
                    <span
                      className={`ledger-currency text-lg font-bold ${displayCashFlow.netCashFlow >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}
                    >
                      {formatCurrency(Math.abs(displayCashFlow.netCashFlow))}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Three Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
              {/* Operating Activities */}
              <div
                className="accounting-card deco-corner rounded-2xl overflow-hidden"
                style={{ animationDelay: '100ms' }}
              >
                <div className="bg-gradient-to-r from-emerald-100 dark:from-emerald-500/10 to-emerald-50 dark:to-emerald-600/5 px-6 py-5 border-b border-emerald-200 dark:border-emerald-500/10">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-emerald-200 dark:bg-emerald-500/20 rounded-xl">
                        <CurrencyDollarIcon className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <h2 className="ledger-title text-xl text-gray-900 dark:text-white">
                        Operating
                      </h2>
                    </div>
                  </div>
                </div>

                <div className="p-6">
                  <CashFlowSection
                    title="Cash from Operations"
                    subtitle="Primary business activities"
                    items={displayCashFlow.operating?.activities || []}
                    totalLabel="Net Cash from Operations"
                    total={displayCashFlow.operating?.total || 0}
                    isInflow={(displayCashFlow.operating?.total || 0) >= 0}
                    animationDelay={150}
                  />

                  {/* Total */}
                  <div className="pt-6 mt-6 border-t-2 border-emerald-200 dark:border-emerald-500/20">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-gray-800 dark:text-gray-200 uppercase tracking-wider">
                        Net Operating
                      </span>
                      <span
                        className={`ledger-currency text-2xl font-bold ${(displayCashFlow.operating?.total || 0) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}
                      >
                        <AnimatedNumber
                          value={displayCashFlow.operating?.total || 0}
                          delay={200}
                          showSign
                        />
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Investing Activities */}
              <div
                className="accounting-card deco-corner rounded-2xl overflow-hidden"
                style={{ animationDelay: '200ms' }}
              >
                <div className="bg-gradient-to-r from-blue-100 dark:from-blue-500/10 to-blue-50 dark:to-blue-600/5 px-6 py-5 border-b border-blue-200 dark:border-blue-500/10">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-blue-200 dark:bg-blue-500/20 rounded-xl">
                        <ArrowTrendingUpIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <h2 className="ledger-title text-xl text-gray-900 dark:text-white">
                        Investing
                      </h2>
                    </div>
                  </div>
                </div>

                <div className="p-6">
                  <CashFlowSection
                    title="Cash from Investments"
                    subtitle="Asset purchases and sales"
                    items={displayCashFlow.investing?.activities || []}
                    totalLabel="Net Cash from Investing"
                    total={displayCashFlow.investing?.total || 0}
                    isInflow={(displayCashFlow.investing?.total || 0) >= 0}
                    animationDelay={250}
                  />

                  {/* Total */}
                  <div className="pt-6 mt-6 border-t-2 border-blue-200 dark:border-blue-500/20">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-gray-800 dark:text-gray-200 uppercase tracking-wider">
                        Net Investing
                      </span>
                      <span
                        className={`ledger-currency text-2xl font-bold ${(displayCashFlow.investing?.total || 0) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}
                      >
                        <AnimatedNumber
                          value={displayCashFlow.investing?.total || 0}
                          delay={400}
                          showSign
                        />
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Financing Activities */}
              <div
                className="accounting-card deco-corner rounded-2xl overflow-hidden"
                style={{ animationDelay: '300ms' }}
              >
                <div className="bg-gradient-to-r from-purple-100 dark:from-purple-500/10 to-purple-50 dark:to-purple-600/5 px-6 py-5 border-b border-purple-200 dark:border-purple-500/10">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-purple-200 dark:bg-purple-500/20 rounded-xl">
                        <ArrowTrendingDownIcon className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                      </div>
                      <h2 className="ledger-title text-xl text-gray-900 dark:text-white">
                        Financing
                      </h2>
                    </div>
                  </div>
                </div>

                <div className="p-6">
                  <CashFlowSection
                    title="Cash from Financing"
                    subtitle="Debt and equity transactions"
                    items={displayCashFlow.financing?.activities || []}
                    totalLabel="Net Cash from Financing"
                    total={displayCashFlow.financing?.total || 0}
                    isInflow={(displayCashFlow.financing?.total || 0) >= 0}
                    animationDelay={350}
                  />

                  {/* Total */}
                  <div className="pt-6 mt-6 border-t-2 border-purple-200 dark:border-purple-500/20">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-gray-800 dark:text-gray-200 uppercase tracking-wider">
                        Net Financing
                      </span>
                      <span
                        className={`ledger-currency text-2xl font-bold ${(displayCashFlow.financing?.total || 0) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}
                      >
                        <AnimatedNumber
                          value={displayCashFlow.financing?.total || 0}
                          delay={600}
                          showSign
                        />
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Summary Card */}
            <div
              className="mt-10 accounting-card rounded-2xl overflow-hidden"
              style={{ animationDelay: '400ms' }}
            >
              <div className="p-8">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                  {/* Operating */}
                  <div className="text-center space-y-3">
                    <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-100 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 mb-2">
                      <CurrencyDollarIcon className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-widest">
                      Operating
                    </p>
                    <p
                      className={`ledger-currency text-2xl sm:text-3xl font-bold ${displayCashFlow.operating.total >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}
                    >
                      {displayCashFlow.operating.total >= 0 ? '+' : ''}
                      {formatCurrency(displayCashFlow.operating.total)}
                    </p>
                  </div>

                  {/* Investing */}
                  <div className="text-center space-y-3">
                    <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-100 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 mb-2">
                      <ArrowTrendingUpIcon className="h-7 w-7 text-blue-600 dark:text-blue-400" />
                    </div>
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-widest">
                      Investing
                    </p>
                    <p
                      className={`ledger-currency text-2xl sm:text-3xl font-bold ${displayCashFlow.investing.total >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}
                    >
                      {displayCashFlow.investing.total >= 0 ? '+' : ''}
                      {formatCurrency(displayCashFlow.investing.total)}
                    </p>
                  </div>

                  {/* Financing */}
                  <div className="text-center space-y-3">
                    <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-purple-100 dark:bg-purple-500/10 border border-purple-200 dark:border-purple-500/20 mb-2">
                      <ArrowTrendingDownIcon className="h-7 w-7 text-purple-600 dark:text-purple-400" />
                    </div>
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-widest">
                      Financing
                    </p>
                    <p
                      className={`ledger-currency text-2xl sm:text-3xl font-bold ${displayCashFlow.financing.total >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}
                    >
                      {displayCashFlow.financing.total >= 0 ? '+' : ''}
                      {formatCurrency(displayCashFlow.financing.total)}
                    </p>
                  </div>

                  {/* Net Cash Flow */}
                  <div className="text-center space-y-3 border-l border-gray-200 dark:border-gray-700">
                    <div
                      className={`inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-2 ${displayCashFlow.netCashFlow >= 0 ? 'bg-emerald-100 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20' : 'bg-rose-100 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20'}`}
                    >
                      <ArrowPathIcon
                        className={`h-7 w-7 ${displayCashFlow.netCashFlow >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}
                      />
                    </div>
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-widest">
                      Net Cash Flow
                    </p>
                    <p
                      className={`ledger-currency text-3xl sm:text-4xl font-bold ${displayCashFlow.netCashFlow >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}
                    >
                      {displayCashFlow.netCashFlow >= 0 ? '+' : ''}
                      {formatCurrency(displayCashFlow.netCashFlow)}
                    </p>
                  </div>
                </div>

                {/* Decorative footer line */}
                <div className="mt-8 flex items-center justify-center">
                  <div className="h-px w-24 bg-gradient-to-r from-transparent to-gray-200 dark:to-gray-700/30" />
                  <div className="px-4">
                    <div
                      className={`w-2 h-2 rounded-full ${displayCashFlow.netCashFlow >= 0 ? 'bg-emerald-500' : 'bg-rose-500'}`}
                    />
                  </div>
                  <div className="h-px w-24 bg-gradient-to-l from-transparent to-gray-200 dark:to-gray-700/30" />
                </div>
              </div>
            </div>

            {/* Reconciliation Card */}
            <div
              className="mt-6 accounting-card rounded-2xl overflow-hidden"
              style={{ animationDelay: '500ms' }}
            >
              <div className="px-6 py-5 border-b border-gray-200 dark:border-gray-700/50">
                <h3 className="ledger-title text-lg text-gray-900 dark:text-white">
                  Cash Flow Reconciliation
                </h3>
              </div>
              <div className="p-6">
                <div className="space-y-1">
                  <div className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-800">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      Net cash from operating activities
                    </span>
                    <span
                      className={`ledger-currency text-sm font-medium ${displayCashFlow.operating.total >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}
                    >
                      {displayCashFlow.operating.total >= 0 ? '+' : ''}
                      {formatCurrency(displayCashFlow.operating.total)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-800">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      Net cash from investing activities
                    </span>
                    <span
                      className={`ledger-currency text-sm font-medium ${displayCashFlow.investing.total >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}
                    >
                      {displayCashFlow.investing.total >= 0 ? '+' : ''}
                      {formatCurrency(displayCashFlow.investing.total)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-800">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      Net cash from financing activities
                    </span>
                    <span
                      className={`ledger-currency text-sm font-medium ${displayCashFlow.financing.total >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}
                    >
                      {displayCashFlow.financing.total >= 0 ? '+' : ''}
                      {formatCurrency(displayCashFlow.financing.total)}
                    </span>
                  </div>
                  <div
                    className={`flex items-center justify-between py-4 px-4 rounded-xl mt-2 ${displayCashFlow.netCashFlow >= 0 ? 'bg-emerald-50 dark:bg-emerald-500/10' : 'bg-rose-50 dark:bg-rose-500/10'}`}
                  >
                    <span className="text-base font-bold text-gray-900 dark:text-white">
                      Net change in cash
                    </span>
                    <span
                      className={`ledger-currency text-xl font-bold ${displayCashFlow.netCashFlow >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}
                    >
                      {displayCashFlow.netCashFlow >= 0 ? '+' : ''}
                      {formatCurrency(displayCashFlow.netCashFlow)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="accounting-card rounded-2xl p-16 text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gray-100 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700/30 mb-6">
              <CurrencyDollarIcon className="h-10 w-10 text-gray-400 dark:text-gray-500" />
            </div>
            <h3 className="ledger-title text-xl text-gray-800 dark:text-gray-200 mb-2">
              No Data Available
            </h3>
            <p className="text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
              No cash flow data available for the selected period. Try selecting a different date
              range.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}

export default CashFlowPage;
