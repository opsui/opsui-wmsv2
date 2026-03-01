/**
 * Accounts Payable Aging Page
 *
 * Displays aging report for accounts payable showing outstanding invoices
 * grouped by aging buckets (current, 30-60, 60-90, 90-120, 120+ days).
 *
 * Design: Purple Industrial Aesthetic
 * - DM Serif Display for elegant headings
 * - IBM Plex Mono for precise financial figures
 * - Staggered entrance animations
 * - Atmospheric depth with subtle glows
 * - Purple accent matching application brand
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
  ClockIcon,
  CurrencyDollarIcon,
  PrinterIcon,
  ArrowDownTrayIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';

// ============================================================================
// TYPES
// ============================================================================

interface AgingBucket {
  days: number;
  label: string;
  amount: number;
  count: number;
}

interface AgingReport {
  asOfDate: Date;
  buckets: AgingBucket[];
  totalOutstanding: number;
}

// ============================================================================
// ANIMATED NUMBER COMPONENT
// ============================================================================

interface AnimatedNumberProps {
  value: number;
  className?: string;
  prefix?: string;
  delay?: number;
}

function AnimatedNumber({ value, className = '', prefix = '$', delay = 0 }: AnimatedNumberProps) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const duration = 800;
    let rafId: number;
    let startTime: number | null = null;

    const delayId = setTimeout(() => {
      const animate = (timestamp: number) => {
        if (!startTime) startTime = timestamp;
        const progress = Math.min((timestamp - startTime) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        setDisplayValue(Math.floor(value * eased * 100) / 100);
        if (progress < 1) {
          rafId = requestAnimationFrame(animate);
        } else {
          setDisplayValue(value);
        }
      };
      rafId = requestAnimationFrame(animate);
    }, delay);

    return () => {
      clearTimeout(delayId);
      cancelAnimationFrame(rafId);
    };
  }, [value, delay]);

  const formattedValue = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(displayValue);

  return (
    <span className={`ledger-currency ${className}`}>
      {prefix}
      {formattedValue}
    </span>
  );
}

// ============================================================================
// AGING BUCKET CARD COMPONENT
// ============================================================================

interface AgingBucketCardProps {
  bucket: AgingBucket;
  totalOutstanding: number;
  index: number;
}

function AgingBucketCard({ bucket, totalOutstanding, index }: AgingBucketCardProps) {
  const percent = totalOutstanding > 0 ? (bucket.amount / totalOutstanding) * 100 : 0;

  // Color mapping based on aging severity
  const getColorScheme = (days: number) => {
    if (days <= 30)
      return {
        text: 'text-emerald-600 dark:text-emerald-400',
        bg: 'bg-emerald-500/20',
        bgLight: 'bg-emerald-100 dark:bg-emerald-500/10',
        border: 'border-emerald-200 dark:border-emerald-500/20',
        progress: 'bg-emerald-500',
      };
    if (days <= 60)
      return {
        text: 'text-blue-600 dark:text-blue-400',
        bg: 'bg-blue-500/20',
        bgLight: 'bg-blue-100 dark:bg-blue-500/10',
        border: 'border-blue-200 dark:border-blue-500/20',
        progress: 'bg-blue-500',
      };
    if (days <= 90)
      return {
        text: 'text-amber-600 dark:text-amber-400',
        bg: 'bg-amber-500/20',
        bgLight: 'bg-amber-100 dark:bg-amber-500/10',
        border: 'border-amber-200 dark:border-amber-500/20',
        progress: 'bg-amber-500',
      };
    return {
      text: 'text-rose-600 dark:text-rose-400',
      bg: 'bg-rose-500/20',
      bgLight: 'bg-rose-100 dark:bg-rose-500/10',
      border: 'border-rose-200 dark:border-rose-500/20',
      progress: 'bg-rose-500',
    };
  };

  const colors = getColorScheme(bucket.days);

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  };

  return (
    <div
      className={`accounting-card rounded-xl overflow-hidden ${colors.bgLight} border ${colors.border}`}
      style={{ animationDelay: `${100 + index * 100}ms` }}
    >
      <div className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-widest">
            {bucket.label}
          </h4>
          <span
            className={`px-2 py-1 rounded-lg text-xs font-bold ${colors.text} ${colors.bgLight}`}
          >
            {percent.toFixed(1)}%
          </span>
        </div>

        <div className="flex items-end justify-between mb-3">
          <span className={`text-2xl font-bold ledger-currency ${colors.text}`}>
            <AnimatedNumber value={bucket.amount} delay={200 + index * 100} />
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {bucket.count} bill{bucket.count !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-gray-200 dark:bg-white/[0.05] rounded-full h-2 overflow-hidden">
          <div
            className={`h-2 rounded-full ${colors.progress} transition-all duration-1000 ease-out`}
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN PAGE
// ============================================================================

function APAgingPage() {
  const navigate = useNavigate();

  // State
  const [asOfDate, setAsOfDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [isLoading, setIsLoading] = useState(false);

  // Mock data for now - would be replaced with API call
  const mockReport: AgingReport = {
    asOfDate: new Date(),
    buckets: [
      { days: 30, label: 'Current (0-30 days)', amount: 28000, count: 8 },
      { days: 60, label: '31-60 days', amount: 12000, count: 4 },
      { days: 90, label: '61-90 days', amount: 5000, count: 2 },
      { days: 120, label: '91-120 days', amount: 2000, count: 1 },
      { days: 999, label: 'Over 120 days', amount: 800, count: 1 },
    ],
    totalOutstanding: 47800,
  };

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  };

  // Calculate overdue amount (60+ days)
  const overdueAmount =
    mockReport.buckets[2].amount + mockReport.buckets[3].amount + mockReport.buckets[4].amount;

  // Calculate payment health
  const currentRatio = mockReport.buckets[0].amount / mockReport.totalOutstanding;
  const getHealthStatus = () => {
    if (overdueAmount === 0)
      return {
        status: 'Excellent',
        icon: CheckCircleIcon,
        color: 'text-emerald-600 dark:text-emerald-400',
        bg: 'bg-emerald-100 dark:bg-emerald-500/20',
      };
    if (overdueAmount < 5000)
      return {
        status: 'Good',
        icon: CheckCircleIcon,
        color: 'text-blue-600 dark:text-blue-400',
        bg: 'bg-blue-100 dark:bg-blue-500/20',
      };
    if (overdueAmount < 15000)
      return {
        status: 'Fair',
        icon: ExclamationTriangleIcon,
        color: 'text-amber-600 dark:text-amber-400',
        bg: 'bg-amber-100 dark:bg-amber-500/20',
      };
    return {
      status: 'Needs Attention',
      icon: ExclamationTriangleIcon,
      color: 'text-rose-600 dark:text-rose-400',
      bg: 'bg-rose-100 dark:bg-rose-500/20',
    };
  };
  const health = getHealthStatus();
  const HealthIcon = health.icon;

  // Export to CSV
  const exportToCSV = () => {
    const lines: string[] = [];

    lines.push('ACCOUNTS PAYABLE AGING REPORT');
    lines.push(`As of ${new Date(mockReport.asOfDate).toLocaleDateString()}`);
    lines.push('');

    mockReport.buckets.forEach(bucket => {
      lines.push(`${bucket.label},${formatCurrency(bucket.amount)},${bucket.count} bills`);
    });

    lines.push('');
    lines.push(`TOTAL OUTSTANDING,${formatCurrency(mockReport.totalOutstanding)}`);

    const csvContent = lines.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ap-aging-${asOfDate}.csv`;
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
                    <ClockIcon className="h-7 w-7 text-purple-500 dark:text-purple-400" />
                  </div>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-widest">
                    Financial Report
                  </p>
                </div>
              </div>

              <h1 className="ledger-title text-4xl sm:text-5xl text-gray-900 dark:text-white">
                Accounts Payable Aging
              </h1>

              <p className="text-gray-600 dark:text-gray-400 max-w-xl text-lg leading-relaxed">
                Track outstanding bills by aging period to manage payments and vendor relationships
              </p>
            </div>

            {/* Actions & Date */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              {/* Date Picker */}
              <div className="relative group">
                <label
                  htmlFor="as-of-date"
                  className="absolute -top-2 left-3 text-xs font-medium text-gray-500 dark:text-gray-400 bg-white dark:bg-slate-900 px-2 rounded"
                >
                  As of Date
                </label>
                <input
                  id="as-of-date"
                  type="date"
                  value={asOfDate}
                  onChange={e => setAsOfDate(e.target.value)}
                  className="w-full sm:w-auto px-4 py-3 rounded-xl text-sm bg-white dark:bg-slate-800/50 border border-gray-300 dark:border-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500/30 focus:border-rose-500/30"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  onClick={exportToCSV}
                  className="action-button-enhanced flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-100 dark:bg-rose-500/20 border border-rose-300 dark:border-rose-500/30 text-rose-700 dark:text-rose-300 hover:bg-rose-200 dark:hover:bg-rose-500/30"
                >
                  <ArrowDownTrayIcon className="h-4 w-4" />
                  <span className="hidden sm:inline">Export</span>
                </Button>
                <Button
                  variant="secondary"
                  onClick={handlePrint}
                  className="action-button-enhanced flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-100 dark:bg-rose-500/20 border border-rose-300 dark:border-rose-500/30 text-rose-700 dark:text-rose-300 hover:bg-rose-200 dark:hover:bg-rose-500/30"
                >
                  <PrinterIcon className="h-4 w-4" />
                  <span className="hidden sm:inline">Print</span>
                </Button>
              </div>
            </div>
          </div>

          {/* Decorative line */}
          <div className="mt-8 h-px bg-gradient-to-r from-transparent via-purple-500/30 to-transparent" />
        </header>

        {/* Report Content */}
        {isLoading ? (
          <div className="space-y-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="accounting-card rounded-2xl p-6">
                <Skeleton variant="text" className="h-6 w-32 mb-4" />
                <Skeleton variant="rounded" className="h-40" />
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-6">
            {/* Summary Header */}
            <div className="mb-8 p-6 rounded-2xl bg-white dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700/50">
              <div className="flex flex-col md:flex-row items-center justify-center gap-6 md:gap-12 text-center">
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    Total Outstanding
                  </span>
                  <span className="text-3xl font-bold ledger-currency text-rose-600 dark:text-rose-400">
                    <AnimatedNumber value={mockReport.totalOutstanding} delay={100} />
                  </span>
                </div>
                <div className="hidden md:block w-px h-12 bg-gray-300 dark:bg-gray-700" />
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Total Bills</span>
                  <span className="text-3xl font-bold text-gray-900 dark:text-white">
                    {mockReport.buckets.reduce((sum, b) => sum + b.count, 0)}
                  </span>
                </div>
                <div className="hidden md:block w-px h-12 bg-gray-300 dark:bg-gray-700" />
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Report Date</span>
                  <span className="text-lg font-medium text-gray-900 dark:text-white">
                    {new Date(mockReport.asOfDate).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Aging Buckets Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {mockReport.buckets.map((bucket, index) => (
                <AgingBucketCard
                  key={index}
                  bucket={bucket}
                  totalOutstanding={mockReport.totalOutstanding}
                  index={index}
                />
              ))}
            </div>

            {/* Detailed Breakdown Card */}
            <div
              className="accounting-card deco-corner rounded-2xl overflow-hidden"
              style={{ animationDelay: '600ms' }}
            >
              <div className="bg-gradient-to-r from-rose-100 dark:from-rose-500/10 to-rose-50 dark:to-rose-600/5 px-6 py-5 border-b border-rose-200 dark:border-rose-500/10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-rose-200 dark:bg-rose-500/20 rounded-xl">
                      <CurrencyDollarIcon className="h-5 w-5 text-rose-600 dark:text-rose-400" />
                    </div>
                    <h2 className="ledger-title text-xl text-gray-900 dark:text-white">
                      Aging Breakdown
                    </h2>
                  </div>
                </div>
              </div>

              <div className="p-6">
                <div className="space-y-3">
                  {mockReport.buckets.map((bucket, index) => {
                    const percent =
                      mockReport.totalOutstanding > 0
                        ? (bucket.amount / mockReport.totalOutstanding) * 100
                        : 0;

                    let colorClass = 'text-emerald-600 dark:text-emerald-400';
                    let dotClass = 'bg-emerald-500';

                    if (bucket.days >= 90) {
                      colorClass = 'text-rose-600 dark:text-rose-400';
                      dotClass = 'bg-rose-500';
                    } else if (bucket.days >= 60) {
                      colorClass = 'text-amber-600 dark:text-amber-400';
                      dotClass = 'bg-amber-500';
                    } else if (bucket.days > 30) {
                      colorClass = 'text-blue-600 dark:text-blue-400';
                      dotClass = 'bg-blue-500';
                    }

                    return (
                      <div
                        key={index}
                        className="group flex items-center justify-between py-3 px-4 -mx-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/5 transition-all duration-200 cursor-default"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-3 h-3 rounded-full ${dotClass}`} />
                          <span className="text-sm text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-gray-100 transition-colors">
                            {bucket.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {bucket.count} bill{bucket.count !== 1 ? 's' : ''}
                          </span>
                          <span className={`ledger-currency text-sm font-bold ${colorClass}`}>
                            {formatCurrency(bucket.amount)}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-400 w-12 text-right">
                            {percent.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    );
                  })}

                  {/* Total Row */}
                  <div className="flex items-center justify-between py-4 px-4 mt-4 bg-rose-50 dark:bg-rose-500/10 rounded-xl border border-rose-200 dark:border-rose-500/20">
                    <span className="text-sm font-bold text-gray-800 dark:text-gray-200 uppercase tracking-wider">
                      Total Outstanding
                    </span>
                    <div className="flex items-center gap-4">
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {mockReport.buckets.reduce((sum, b) => sum + b.count, 0)} bills
                      </span>
                      <span className="ledger-currency text-xl font-bold text-rose-600 dark:text-rose-400">
                        {formatCurrency(mockReport.totalOutstanding)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Health Card */}
            <div
              className="accounting-card deco-corner rounded-2xl overflow-hidden"
              style={{ animationDelay: '700ms' }}
            >
              <div className="bg-gradient-to-r from-slate-100 dark:from-slate-800/50 to-white dark:to-slate-800/30 px-6 py-5 border-b border-gray-200 dark:border-gray-700/50">
                <h2 className="ledger-title text-lg text-gray-900 dark:text-white">
                  Payment Health
                </h2>
              </div>

              <div className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`p-4 rounded-2xl ${health.bg}`}>
                      <HealthIcon className={`h-8 w-8 ${health.color}`} />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-1">
                        Health Status
                      </p>
                      <p className={`text-2xl font-bold ${health.color}`}>{health.status}</p>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                      Overdue (60+ days)
                    </p>
                    <div className="flex items-baseline gap-1">
                      <span
                        className={`text-4xl font-bold ${overdueAmount > 10000 ? 'text-rose-600 dark:text-rose-400' : 'text-amber-600 dark:text-amber-400'}`}
                      >
                        {formatCurrency(overdueAmount)}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                      requires attention
                    </p>
                  </div>
                </div>

                {/* Health Bar */}
                <div className="mt-6">
                  <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-2">
                    <span>Overdue</span>
                    <span>Moderate</span>
                    <span>Current</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-white/[0.05] rounded-full h-3 overflow-hidden">
                    <div
                      className={`h-3 rounded-full transition-all duration-1000 ease-out ${
                        currentRatio > 0.6
                          ? 'bg-emerald-500'
                          : currentRatio > 0.4
                            ? 'bg-amber-500'
                            : 'bg-rose-500'
                      }`}
                      style={{ width: `${currentRatio * 100}%` }}
                    />
                  </div>
                  <div className="flex justify-between mt-2">
                    <span className="text-xs text-rose-500 dark:text-rose-400">High Risk</span>
                    <span className="text-xs text-amber-500 dark:text-amber-400">Moderate</span>
                    <span className="text-xs text-emerald-500 dark:text-emerald-400">Healthy</span>
                  </div>
                </div>

                {/* Decorative footer line */}
                <div className="mt-8 flex items-center justify-center">
                  <div className="h-px w-24 bg-gradient-to-r from-transparent to-gray-200 dark:to-gray-700/30" />
                  <div
                    className={`px-4 w-2 h-2 rounded-full ${
                      overdueAmount === 0
                        ? 'bg-emerald-500'
                        : overdueAmount < 15000
                          ? 'bg-amber-500'
                          : 'bg-rose-500'
                    }`}
                  />
                  <div className="h-px w-24 bg-gradient-to-l from-transparent to-gray-200 dark:to-gray-700/30" />
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default APAgingPage;
