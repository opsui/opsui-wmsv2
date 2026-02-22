/**
 * Balance Sheet Page
 *
 * Displays the balance sheet statement showing Assets = Liabilities + Equity
 * as of a specific date.
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
  ArrowDownTrayIcon,
  PrinterIcon,
  ScaleIcon,
  ChartBarIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline';
import { useBalanceSheet } from '@/services/api';
import { type BalanceSheetItem } from '@opsui/shared';

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

interface AccountSectionProps {
  title: string;
  accounts: BalanceSheetItem[];
  totalLabel: string;
  total: number;
  colorClass?: string;
  accentColor?: string;
  animationDelay?: number;
}

function AccountSection({
  title,
  accounts,
  totalLabel,
  total,
  colorClass = 'text-white',
  accentColor = 'emerald',
  animationDelay = 0,
}: AccountSectionProps) {
  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  };

  // Build dynamic classes based on accent color
  const getAccentClasses = () => {
    const colorMap: Record<string, { bg: string; border: string; text: string }> = {
      blue: {
        bg: 'bg-blue-500/10 dark:bg-blue-500/10',
        border: 'border-blue-500/30',
        text: 'text-blue-600 dark:text-blue-400',
      },
      rose: {
        bg: 'bg-rose-500/10 dark:bg-rose-500/10',
        border: 'border-rose-500/30',
        text: 'text-rose-600 dark:text-rose-400',
      },
      purple: {
        bg: 'bg-purple-500/10 dark:bg-purple-500/10',
        border: 'border-purple-500/30',
        text: 'text-purple-600 dark:text-purple-400',
      },
      emerald: {
        bg: 'bg-emerald-500/10 dark:bg-emerald-500/10',
        border: 'border-emerald-500/30',
        text: 'text-emerald-600 dark:text-emerald-400',
      },
    };
    return colorMap[accentColor] || colorMap.emerald;
  };

  const accentClasses = getAccentClasses();

  return (
    <div className="space-y-3" style={{ animationDelay: `${animationDelay}ms` }}>
      <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-widest border-b border-gray-200 dark:border-gray-700/50 pb-2">
        {title}
      </h4>
      <div className="space-y-1">
        {accounts.map((account, idx) => (
          <div
            key={account.accountId}
            className="group flex items-center justify-between py-2.5 px-3 -mx-3 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 transition-all duration-200 cursor-default"
            style={{ animationDelay: `${animationDelay + idx * 50}ms` }}
          >
            <span className="text-sm text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-gray-100 transition-colors">
              {account.accountName}
            </span>
            <span className={`ledger-currency text-sm font-medium ${colorClass}`}>
              {formatCurrency(account.amount)}
            </span>
          </div>
        ))}
      </div>
      <div
        className={`flex items-center justify-between py-3 px-4 ${accentClasses.bg} rounded-xl border ${accentClasses.border}`}
      >
        <span className={`text-xs font-semibold ${accentClasses.text} uppercase tracking-wider`}>
          {totalLabel}
        </span>
        <span className={`ledger-currency text-sm font-bold ${colorClass}`}>
          {formatCurrency(total)}
        </span>
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
}

function AnimatedNumber({ value, className = '', prefix = '$', delay = 0 }: AnimatedNumberProps) {
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
  }).format(displayValue);

  return (
    <span className={`ledger-currency ${className}`}>
      {prefix}
      {formattedValue}
    </span>
  );
}

// ============================================================================
// MAIN PAGE
// ============================================================================

function BalanceSheetPage() {
  const navigate = useNavigate();

  // State
  const [asOfDate, setAsOfDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [isAnimating, setIsAnimating] = useState(true);

  // API hook
  const { data: balanceSheet, isLoading, refetch } = useBalanceSheet(asOfDate);

  // Format currency
  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  };

  // Check if balance sheet balances
  const isBalanced =
    balanceSheet &&
    Math.abs(
      balanceSheet.assets.total - (balanceSheet.liabilities.total + balanceSheet.equity.total)
    ) < 0.01;

  // Animation complete handler
  useEffect(() => {
    const timer = setTimeout(() => setIsAnimating(false), 1500);
    return () => clearTimeout(timer);
  }, [balanceSheet]);

  // Export to CSV
  const exportToCSV = () => {
    if (!balanceSheet) return;

    const lines: string[] = [];

    lines.push('BALANCE SHEET');
    lines.push(`As of ${new Date(balanceSheet.asOfDate).toLocaleDateString()}`);
    lines.push('');

    lines.push('ASSETS');
    lines.push('Current Assets');
    balanceSheet.assets.current.forEach((acc: { accountName: string; amount: number }) => {
      lines.push(`${acc.accountName},${acc.amount.toFixed(2)}`);
    });
    lines.push(`Total Current Assets,${balanceSheet.assets.currentTotal.toFixed(2)}`);
    lines.push('');

    lines.push('Non-Current Assets');
    balanceSheet.assets.nonCurrent.forEach((acc: { accountName: string; amount: number }) => {
      lines.push(`${acc.accountName},${acc.amount.toFixed(2)}`);
    });
    lines.push(`Total Non-Current Assets,${balanceSheet.assets.nonCurrentTotal.toFixed(2)}`);
    lines.push(`TOTAL ASSETS,${balanceSheet.assets.total.toFixed(2)}`);
    lines.push('');

    lines.push('LIABILITIES');
    lines.push('Current Liabilities');
    balanceSheet.liabilities.current.forEach((acc: { accountName: string; amount: number }) => {
      lines.push(`${acc.accountName},${acc.amount.toFixed(2)}`);
    });
    lines.push(`Total Current Liabilities,${balanceSheet.liabilities.currentTotal.toFixed(2)}`);
    lines.push('');

    lines.push('Non-Current Liabilities');
    balanceSheet.liabilities.nonCurrent.forEach((acc: { accountName: string; amount: number }) => {
      lines.push(`${acc.accountName},${acc.amount.toFixed(2)}`);
    });
    lines.push(
      `Total Non-Current Liabilities,${balanceSheet.liabilities.nonCurrentTotal.toFixed(2)}`
    );
    lines.push(`TOTAL LIABILITIES,${balanceSheet.liabilities.total.toFixed(2)}`);
    lines.push('');

    lines.push('EQUITY');
    balanceSheet.equity.breakdown.forEach((acc: { accountName: string; amount: number }) => {
      lines.push(`${acc.accountName},${acc.amount.toFixed(2)}`);
    });
    lines.push(`TOTAL EQUITY,${balanceSheet.equity.total.toFixed(2)}`);
    lines.push('');
    lines.push(
      `TOTAL LIABILITIES AND EQUITY,${(balanceSheet.liabilities.total + balanceSheet.equity.total).toFixed(2)}`
    );

    const csvContent = lines.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `balance-sheet-${asOfDate}.csv`;
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
                    <DocumentTextIcon className="h-7 w-7 text-purple-500 dark:text-purple-400" />
                  </div>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-widest">
                    Financial Statement
                  </p>
                </div>
              </div>

              <h1 className="ledger-title text-4xl sm:text-5xl text-gray-900 dark:text-white">
                Balance Sheet
              </h1>

              <p className="text-gray-600 dark:text-gray-400 max-w-xl text-lg leading-relaxed">
                Statement of financial position showing the relationship between assets,
                liabilities, and equity.
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
                  className="w-full sm:w-auto px-4 py-3 rounded-xl text-sm bg-white dark:bg-slate-800/50 border border-gray-300 dark:border-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500/30"
                />
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

          {/* Decorative line */}
          <div className="mt-8 h-px bg-gradient-to-r from-transparent via-purple-500/30 to-transparent" />
        </header>

        {/* Balance Sheet Report */}
        {isLoading ? (
          <div className="space-y-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="accounting-card rounded-2xl p-6">
                <Skeleton variant="text" className="h-6 w-32 mb-4" />
                <Skeleton variant="rounded" className="h-40" />
              </div>
            ))}
          </div>
        ) : balanceSheet ? (
          <>
            {/* Balance Equation Header */}
            <div className="mb-8 p-6 rounded-2xl bg-white dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700/50">
              <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-8 text-center">
                <div className="flex items-center gap-2">
                  <span className="ledger-currency text-2xl font-bold text-blue-600 dark:text-blue-400">
                    <AnimatedNumber value={balanceSheet.assets.total} delay={200} />
                  </span>
                  <span className="text-sm text-gray-500 dark:text-gray-400">Assets</span>
                </div>
                <span className="text-2xl text-gray-400 dark:text-gray-500">=</span>
                <div className="flex items-center gap-2">
                  <span className="ledger-currency text-2xl font-bold text-rose-600 dark:text-rose-400">
                    <AnimatedNumber value={balanceSheet.liabilities.total} delay={400} />
                  </span>
                  <span className="text-sm text-gray-500 dark:text-gray-400">Liabilities</span>
                </div>
                <span className="text-2xl text-gray-400 dark:text-gray-500">+</span>
                <div className="flex items-center gap-2">
                  <span className="ledger-currency text-2xl font-bold text-purple-600 dark:text-purple-400">
                    <AnimatedNumber value={balanceSheet.equity.total} delay={600} />
                  </span>
                  <span className="text-sm text-gray-500 dark:text-gray-400">Equity</span>
                </div>
              </div>

              {/* Balance Status */}
              <div className="mt-6 flex justify-center">
                <div
                  className={`inline-flex items-center gap-3 px-6 py-3 rounded-full ${
                    isBalanced
                      ? 'bg-emerald-100 dark:bg-emerald-500/10 border border-emerald-300 dark:border-emerald-500/20'
                      : 'bg-rose-100 dark:bg-rose-500/10 border border-rose-300 dark:border-rose-500/20'
                  }`}
                >
                  <ScaleIcon
                    className={`h-5 w-5 ${isBalanced ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}
                  />
                  <span
                    className={`text-sm font-semibold ${isBalanced ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}
                  >
                    {isBalanced ? 'Balance Verified ✓' : 'Balance Mismatch'}
                  </span>
                  {!isBalanced && (
                    <span className="text-xs text-rose-600/80 dark:text-rose-400/80">
                      Diff:{' '}
                      {formatCurrency(
                        Math.abs(
                          balanceSheet.assets.total -
                            (balanceSheet.liabilities.total + balanceSheet.equity.total)
                        )
                      )}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Three Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
              {/* Assets Column */}
              <div
                className="accounting-card deco-corner rounded-2xl overflow-hidden"
                style={{ animationDelay: '100ms' }}
              >
                <div className="bg-gradient-to-r from-blue-100 dark:from-blue-500/10 to-blue-50 dark:to-blue-600/5 px-6 py-5 border-b border-blue-200 dark:border-blue-500/10">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-blue-200 dark:bg-blue-500/20 rounded-xl">
                        <ChartBarIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <h2 className="ledger-title text-xl text-gray-900 dark:text-white">Assets</h2>
                    </div>
                  </div>
                </div>

                <div className="p-6 space-y-6">
                  {/* Current Assets */}
                  <AccountSection
                    title="Current Assets"
                    accounts={balanceSheet.assets.current}
                    totalLabel="Total Current"
                    total={balanceSheet.assets.currentTotal}
                    colorClass="text-blue-600 dark:text-blue-300"
                    accentColor="blue"
                    animationDelay={150}
                  />

                  {/* Non-Current Assets */}
                  <AccountSection
                    title="Non-Current Assets"
                    accounts={balanceSheet.assets.nonCurrent}
                    totalLabel="Total Non-Current"
                    total={balanceSheet.assets.nonCurrentTotal}
                    colorClass="text-blue-600 dark:text-blue-300"
                    accentColor="blue"
                    animationDelay={250}
                  />

                  {/* Total Assets */}
                  <div className="pt-6 border-t-2 border-blue-200 dark:border-blue-500/20">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-gray-800 dark:text-gray-200 uppercase tracking-wider">
                        Total Assets
                      </span>
                      <span className="ledger-currency text-2xl font-bold text-blue-600 dark:text-blue-400">
                        {formatCurrency(balanceSheet.assets.total)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Liabilities Column */}
              <div
                className="accounting-card deco-corner rounded-2xl overflow-hidden"
                style={{ animationDelay: '200ms' }}
              >
                <div className="bg-gradient-to-r from-rose-100 dark:from-rose-500/10 to-rose-50 dark:to-rose-600/5 px-6 py-5 border-b border-rose-200 dark:border-rose-500/10">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-rose-200 dark:bg-rose-500/20 rounded-xl">
                        <ChartBarIcon className="h-5 w-5 text-rose-600 dark:text-rose-400" />
                      </div>
                      <h2 className="ledger-title text-xl text-gray-900 dark:text-white">
                        Liabilities
                      </h2>
                    </div>
                  </div>
                </div>

                <div className="p-6 space-y-6">
                  {/* Current Liabilities */}
                  <AccountSection
                    title="Current Liabilities"
                    accounts={balanceSheet.liabilities.current}
                    totalLabel="Total Current"
                    total={balanceSheet.liabilities.currentTotal}
                    colorClass="text-rose-600 dark:text-rose-300"
                    accentColor="rose"
                    animationDelay={250}
                  />

                  {/* Non-Current Liabilities */}
                  <AccountSection
                    title="Non-Current Liabilities"
                    accounts={balanceSheet.liabilities.nonCurrent}
                    totalLabel="Total Non-Current"
                    total={balanceSheet.liabilities.nonCurrentTotal}
                    colorClass="text-rose-600 dark:text-rose-300"
                    accentColor="rose"
                    animationDelay={350}
                  />

                  {/* Total Liabilities */}
                  <div className="pt-6 border-t-2 border-rose-200 dark:border-rose-500/20">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-gray-800 dark:text-gray-200 uppercase tracking-wider">
                        Total Liabilities
                      </span>
                      <span className="ledger-currency text-2xl font-bold text-rose-600 dark:text-rose-400">
                        {formatCurrency(balanceSheet.liabilities.total)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Equity Column */}
              <div
                className="accounting-card deco-corner rounded-2xl overflow-hidden"
                style={{ animationDelay: '300ms' }}
              >
                <div className="bg-gradient-to-r from-purple-100 dark:from-purple-500/10 to-purple-50 dark:to-purple-600/5 px-6 py-5 border-b border-purple-200 dark:border-purple-500/10">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-purple-200 dark:bg-purple-500/20 rounded-xl">
                        <ScaleIcon className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                      </div>
                      <h2 className="ledger-title text-xl text-gray-900 dark:text-white">Equity</h2>
                    </div>
                  </div>
                </div>

                <div className="p-6 space-y-6">
                  {/* Equity Accounts */}
                  <AccountSection
                    title="Equity Accounts"
                    accounts={balanceSheet.equity.breakdown}
                    totalLabel="Total Equity"
                    total={balanceSheet.equity.total}
                    colorClass="text-purple-600 dark:text-purple-300"
                    accentColor="purple"
                    animationDelay={350}
                  />

                  {/* Total L&E */}
                  <div className="pt-6 border-t-2 border-purple-200 dark:border-purple-500/20">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-gray-800 dark:text-gray-200 uppercase tracking-wider">
                        Total L&E
                      </span>
                      <span className="ledger-currency text-2xl font-bold text-purple-600 dark:text-purple-400">
                        {formatCurrency(balanceSheet.liabilities.total + balanceSheet.equity.total)}
                      </span>
                    </div>
                  </div>

                  {/* Balance Verification Card */}
                  <div
                    className={`mt-6 p-5 rounded-xl border ${
                      isBalanced
                        ? 'bg-gradient-to-br from-emerald-50 dark:from-emerald-500/10 to-emerald-100/50 dark:to-emerald-600/5 border-emerald-200 dark:border-emerald-500/20'
                        : 'bg-gradient-to-br from-rose-50 dark:from-rose-500/10 to-rose-100/50 dark:to-rose-600/5 border-rose-200 dark:border-rose-500/20'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <ScaleIcon
                          className={`h-5 w-5 ${isBalanced ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}
                        />
                        <span
                          className={`text-sm font-semibold ${isBalanced ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}
                        >
                          {isBalanced ? 'Verified' : 'Mismatch'}
                        </span>
                      </div>
                      <div
                        className={`profit-indicator w-8 h-8 rounded-full flex items-center justify-center ${
                          isBalanced
                            ? 'bg-emerald-200 dark:bg-emerald-500/20'
                            : 'bg-rose-200 dark:bg-rose-500/20'
                        }`}
                      >
                        <span
                          className={`text-lg font-bold ${isBalanced ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}
                        >
                          {isBalanced ? '✓' : '✗'}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1 text-xs text-gray-500 dark:text-gray-400">
                      <div className="flex justify-between">
                        <span>Assets</span>
                        <span className="ledger-currency text-blue-600 dark:text-blue-400">
                          {formatCurrency(balanceSheet.assets.total)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Liabilities + Equity</span>
                        <span className="ledger-currency text-purple-600 dark:text-purple-400">
                          {formatCurrency(
                            balanceSheet.liabilities.total + balanceSheet.equity.total
                          )}
                        </span>
                      </div>
                      <div className="h-px bg-gray-200 dark:bg-gray-700/30 my-2" />
                      <div className="flex justify-between font-semibold">
                        <span>Difference</span>
                        <span
                          className={`ledger-currency ${isBalanced ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}
                        >
                          {formatCurrency(
                            Math.abs(
                              balanceSheet.assets.total -
                                (balanceSheet.liabilities.total + balanceSheet.equity.total)
                            )
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Summary Footer */}
            <div
              className="mt-10 accounting-card rounded-2xl overflow-hidden"
              style={{ animationDelay: '400ms' }}
            >
              <div className="p-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  {/* Total Assets */}
                  <div className="text-center space-y-3">
                    <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-100 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 mb-2">
                      <ChartBarIcon className="h-7 w-7 text-blue-600 dark:text-blue-400" />
                    </div>
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-widest">
                      Total Assets
                    </p>
                    <p className="ledger-currency text-3xl sm:text-4xl font-bold text-blue-600 dark:text-blue-400">
                      {formatCurrency(balanceSheet.assets.total)}
                    </p>
                  </div>

                  {/* Total Liabilities */}
                  <div className="text-center space-y-3">
                    <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-rose-100 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 mb-2">
                      <ChartBarIcon className="h-7 w-7 text-rose-600 dark:text-rose-400" />
                    </div>
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-widest">
                      Total Liabilities
                    </p>
                    <p className="ledger-currency text-3xl sm:text-4xl font-bold text-rose-600 dark:text-rose-400">
                      {formatCurrency(balanceSheet.liabilities.total)}
                    </p>
                  </div>

                  {/* Total Equity */}
                  <div className="text-center space-y-3">
                    <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-purple-100 dark:bg-purple-500/10 border border-purple-200 dark:border-purple-500/20 mb-2">
                      <ScaleIcon className="h-7 w-7 text-purple-600 dark:text-purple-400" />
                    </div>
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-widest">
                      Total Equity
                    </p>
                    <p className="ledger-currency text-3xl sm:text-4xl font-bold text-purple-600 dark:text-purple-400">
                      {formatCurrency(balanceSheet.equity.total)}
                    </p>
                  </div>
                </div>

                {/* Decorative footer line */}
                <div className="mt-8 flex items-center justify-center">
                  <div className="h-px w-24 bg-gradient-to-r from-transparent to-gray-200 dark:to-gray-700/30" />
                  <div className="px-4">
                    <div
                      className={`w-2 h-2 rounded-full ${isBalanced ? 'bg-emerald-500' : 'bg-rose-500'}`}
                    />
                  </div>
                  <div className="h-px w-24 bg-gradient-to-l from-transparent to-gray-200 dark:to-gray-700/30" />
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="accounting-card rounded-2xl p-16 text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gray-100 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700/30 mb-6">
              <DocumentTextIcon className="h-10 w-10 text-gray-400 dark:text-gray-500" />
            </div>
            <h3 className="ledger-title text-xl text-gray-800 dark:text-gray-200 mb-2">
              No Data Available
            </h3>
            <p className="text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
              No balance sheet data available for the selected date. Try selecting a different date.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}

export default BalanceSheetPage;
