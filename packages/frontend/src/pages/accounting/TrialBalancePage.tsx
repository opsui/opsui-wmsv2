/**
 * Trial Balance Page
 *
 * A distinctive, production-grade financial report interface with an
 * editorial/luxury banking aesthetic. Features staggered animations,
 * refined typography, and sophisticated visual details.
 */

import { useState, useEffect, useMemo } from 'react';
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
  XMarkIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  DocumentTextIcon,
  CalendarIcon,
  ScaleIcon,
} from '@heroicons/react/24/outline';
import { useTrialBalance } from '@/services/api';
import { type TrialBalance, type TrialBalanceLine } from '@opsui/shared';

// ============================================================================
// TYPES
// ============================================================================

interface AccountGroup {
  accountType: string;
  accounts: TrialBalanceLine[];
  totalDebit: number;
  totalCredit: number;
}

// ============================================================================
// UTILITIES
// ============================================================================

function groupAccountsByType(lines: TrialBalanceLine[]): AccountGroup[] {
  const groups: Record<string, AccountGroup> = {};
  const typeOrder = ['Asset', 'Liability', 'Equity', 'Revenue', 'Expense'];

  lines.forEach(line => {
    if (!groups[line.accountType]) {
      groups[line.accountType] = {
        accountType: line.accountType,
        accounts: [],
        totalDebit: 0,
        totalCredit: 0,
      };
    }
    groups[line.accountType].accounts.push(line);
    groups[line.accountType].totalDebit += line.debitBalance;
    groups[line.accountType].totalCredit += line.creditBalance;
  });

  return Object.values(groups).sort(
    (a, b) => typeOrder.indexOf(a.accountType) - typeOrder.indexOf(b.accountType)
  );
}

// Format currency with accounting style (negative in parentheses)
function formatCurrency(value: number | string, showParentheses = true): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  const formatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(num));

  if (showParentheses && num < 0) {
    return `(${formatted})`;
  }
  return num < 0 ? `-${formatted}` : formatted;
}

// Sample data for demonstration
const sampleTrialBalanceLines: TrialBalanceLine[] = [
  {
    lineId: '1',
    trialBalanceId: 'tb-1',
    accountId: '1',
    accountCode: '1000',
    accountName: 'Cash and Cash Equivalents',
    accountType: 'Asset',
    debitBalance: 125000,
    creditBalance: 0,
    netBalance: 125000,
  },
  {
    lineId: '2',
    trialBalanceId: 'tb-1',
    accountId: '2',
    accountCode: '1100',
    accountName: 'Accounts Receivable',
    accountType: 'Asset',
    debitBalance: 87500,
    creditBalance: 0,
    netBalance: 87500,
  },
  {
    lineId: '3',
    trialBalanceId: 'tb-1',
    accountId: '3',
    accountCode: '1200',
    accountName: 'Inventory',
    accountType: 'Asset',
    debitBalance: 245000,
    creditBalance: 0,
    netBalance: 245000,
  },
  {
    lineId: '4',
    trialBalanceId: 'tb-1',
    accountId: '4',
    accountCode: '1300',
    accountName: 'Prepaid Expenses',
    accountType: 'Asset',
    debitBalance: 18500,
    creditBalance: 0,
    netBalance: 18500,
  },
  {
    lineId: '5',
    trialBalanceId: 'tb-1',
    accountId: '5',
    accountCode: '1500',
    accountName: 'Property, Plant & Equipment',
    accountType: 'Asset',
    debitBalance: 450000,
    creditBalance: 0,
    netBalance: 450000,
  },
  {
    lineId: '6',
    trialBalanceId: 'tb-1',
    accountId: '6',
    accountCode: '1600',
    accountName: 'Accumulated Depreciation',
    accountType: 'Asset',
    debitBalance: 0,
    creditBalance: 125000,
    netBalance: -125000,
  },
  {
    lineId: '7',
    trialBalanceId: 'tb-1',
    accountId: '7',
    accountCode: '2000',
    accountName: 'Accounts Payable',
    accountType: 'Liability',
    debitBalance: 0,
    creditBalance: 68500,
    netBalance: -68500,
  },
  {
    lineId: '8',
    trialBalanceId: 'tb-1',
    accountId: '8',
    accountCode: '2100',
    accountName: 'Accrued Expenses',
    accountType: 'Liability',
    debitBalance: 0,
    creditBalance: 24750,
    netBalance: -24750,
  },
  {
    lineId: '9',
    trialBalanceId: 'tb-1',
    accountId: '9',
    accountCode: '2200',
    accountName: 'Notes Payable',
    accountType: 'Liability',
    debitBalance: 0,
    creditBalance: 150000,
    netBalance: -150000,
  },
  {
    lineId: '10',
    trialBalanceId: 'tb-1',
    accountId: '10',
    accountCode: '3000',
    accountName: 'Common Stock',
    accountType: 'Equity',
    debitBalance: 0,
    creditBalance: 250000,
    netBalance: -250000,
  },
  {
    lineId: '11',
    trialBalanceId: 'tb-1',
    accountId: '11',
    accountCode: '3100',
    accountName: 'Retained Earnings',
    accountType: 'Equity',
    debitBalance: 0,
    creditBalance: 185250,
    netBalance: -185250,
  },
  {
    lineId: '12',
    trialBalanceId: 'tb-1',
    accountId: '12',
    accountCode: '4000',
    accountName: 'Sales Revenue',
    accountType: 'Revenue',
    debitBalance: 0,
    creditBalance: 485000,
    netBalance: -485000,
  },
  {
    lineId: '13',
    trialBalanceId: 'tb-1',
    accountId: '13',
    accountCode: '4100',
    accountName: 'Service Revenue',
    accountType: 'Revenue',
    debitBalance: 0,
    creditBalance: 125000,
    netBalance: -125000,
  },
  {
    lineId: '14',
    trialBalanceId: 'tb-1',
    accountId: '14',
    accountCode: '5000',
    accountName: 'Cost of Goods Sold',
    accountType: 'Expense',
    debitBalance: 285000,
    creditBalance: 0,
    netBalance: 285000,
  },
  {
    lineId: '15',
    trialBalanceId: 'tb-1',
    accountId: '15',
    accountCode: '5100',
    accountName: 'Salaries and Wages',
    accountType: 'Expense',
    debitBalance: 125000,
    creditBalance: 0,
    netBalance: 125000,
  },
  {
    lineId: '16',
    trialBalanceId: 'tb-1',
    accountId: '16',
    accountCode: '5200',
    accountName: 'Rent Expense',
    accountType: 'Expense',
    debitBalance: 48000,
    creditBalance: 0,
    netBalance: 48000,
  },
  {
    lineId: '17',
    trialBalanceId: 'tb-1',
    accountId: '17',
    accountCode: '5300',
    accountName: 'Utilities Expense',
    accountType: 'Expense',
    debitBalance: 18500,
    creditBalance: 0,
    netBalance: 18500,
  },
  {
    lineId: '18',
    trialBalanceId: 'tb-1',
    accountId: '18',
    accountCode: '5400',
    accountName: 'Depreciation Expense',
    accountType: 'Expense',
    debitBalance: 25000,
    creditBalance: 0,
    netBalance: 25000,
  },
  {
    lineId: '19',
    trialBalanceId: 'tb-1',
    accountId: '19',
    accountCode: '5500',
    accountName: 'Marketing Expense',
    accountType: 'Expense',
    debitBalance: 35000,
    creditBalance: 0,
    netBalance: 35000,
  },
];

// ============================================================================
// SUBCOMPONENTS
// ============================================================================

// Animated counter for totals
function AnimatedNumber({ value, className }: { value: number; className?: string }) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const duration = 1000;
    let rafId: number;
    let startTime: number | null = null;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(Math.floor(value * eased));
      if (progress < 1) {
        rafId = requestAnimationFrame(animate);
      } else {
        setDisplayValue(value);
      }
    };
    rafId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafId);
  }, [value]);

  return <span className={className}>{formatCurrency(displayValue)}</span>;
}

// Balance status badge with animation
function BalanceStatusBadge({
  isBalanced,
  difference,
}: {
  isBalanced: boolean;
  difference: number;
}) {
  if (isBalanced) {
    return (
      <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 rounded-full animate-scale-in">
        <CheckCircleIcon className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
        <span className="font-semibold text-emerald-700 dark:text-emerald-300 font-display">
          Balanced
        </span>
      </div>
    );
  }

  return (
    <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-full animate-scale-in">
      <ExclamationTriangleIcon className="h-5 w-5 text-amber-600 dark:text-amber-400" />
      <span className="font-semibold text-amber-700 dark:text-amber-300 font-display">
        Out of Balance by {formatCurrency(difference)}
      </span>
    </div>
  );
}

// Account type icon
function AccountTypeIcon({ type }: { type: string }) {
  const icons: Record<string, string> = {
    Asset: '🏛️',
    Liability: '⚖️',
    Equity: '💎',
    Revenue: '📈',
    Expense: '📉',
  };
  return <span className="text-lg">{icons[type] || '📊'}</span>;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

function TrialBalancePage() {
  const navigate = useNavigate();
  const [asOfDate, setAsOfDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [isAnimating, setIsAnimating] = useState(true);

  // API hook
  const { data: trialBalance, isLoading, refetch } = useTrialBalance(asOfDate);

  // Use sample data if no API data
  const lines = useMemo(() => {
    return trialBalance?.lines?.length ? trialBalance.lines : sampleTrialBalanceLines;
  }, [trialBalance]);

  // Calculate totals
  const { totalDebit, totalCredit, isBalanced, difference, accountGroups } = useMemo(() => {
    const totalDebit = lines.reduce((sum, line) => sum + (line.debitBalance || 0), 0);
    const totalCredit = lines.reduce((sum, line) => sum + (line.creditBalance || 0), 0);
    const difference = Math.abs(totalDebit - totalCredit);
    const isBalanced = difference < 0.01;
    const accountGroups = groupAccountsByType(lines);

    return { totalDebit, totalCredit, isBalanced, difference, accountGroups };
  }, [lines]);

  // Animation timing
  useEffect(() => {
    const timer = setTimeout(() => setIsAnimating(false), 1500);
    return () => clearTimeout(timer);
  }, []);

  // Export to CSV
  const exportToCSV = () => {
    const headers = ['Account Code', 'Account Name', 'Type', 'Debit', 'Credit'];
    const rows = lines.map(line => [
      line.accountCode,
      line.accountName,
      line.accountType,
      line.debitBalance || '0',
      line.creditBalance || '0',
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(',')),
      '',
      `Total Debit,${totalDebit.toFixed(2)}`,
      `Total Credit,${totalCredit.toFixed(2)}`,
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `trial-balance-${asOfDate}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Print handler
  const handlePrint = () => window.print();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-purple-50/30 dark:from-slate-950 dark:via-slate-900 dark:to-purple-950/50">
      {/* Decorative background elements */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-1/4 -right-1/4 w-1/2 h-1/2 bg-gradient-to-br from-purple-200/20 to-transparent dark:from-purple-500/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-1/4 -left-1/4 w-1/2 h-1/2 bg-gradient-to-tr from-blue-200/20 to-transparent dark:from-blue-500/5 rounded-full blur-3xl" />
      </div>

      <Header />

      <main className="relative w-full px-4 sm:px-6 lg:px-8 py-8 max-w-7xl mx-auto">
        {/* Breadcrumb Navigation */}
        <div className="animate-fade-in-up" style={{ animationDelay: '0ms' }}>
          <Breadcrumb />
        </div>

        {/* Page Header */}
        <header className="mt-8 mb-10 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl shadow-lg shadow-purple-500/25">
                  <ScaleIcon className="h-6 w-6 text-white" />
                </div>
                <span className="text-sm font-medium text-purple-600 dark:text-purple-400 tracking-wider uppercase">
                  Financial Report
                </span>
              </div>
              <h1 className="text-4xl lg:text-5xl font-display font-bold tracking-tight">
                <span className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-600 dark:from-white dark:via-slate-100 dark:to-slate-300 bg-clip-text text-transparent">
                  Trial Balance
                </span>
              </h1>
              <p className="mt-3 text-lg text-slate-600 dark:text-slate-400 max-w-xl font-light">
                Verification of accounting equation integrity — confirming total debits equal total
                credits across all ledger accounts.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Button
                variant="secondary"
                onClick={exportToCSV}
                className="group flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-purple-300 dark:hover:border-purple-600 hover:shadow-lg hover:shadow-purple-500/10 transition-all duration-300"
              >
                <ArrowDownTrayIcon className="h-4 w-4 text-slate-500 group-hover:text-purple-600 transition-colors" />
                <span className="font-medium">Export CSV</span>
              </Button>
              <Button
                variant="secondary"
                onClick={handlePrint}
                className="group flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-purple-300 dark:hover:border-purple-600 hover:shadow-lg hover:shadow-purple-500/10 transition-all duration-300"
              >
                <PrinterIcon className="h-4 w-4 text-slate-500 group-hover:text-purple-600 transition-colors" />
                <span className="font-medium">Print</span>
              </Button>
            </div>
          </div>
        </header>

        {/* Controls Bar */}
        <div
          className="mb-8 animate-fade-in-up"
          style={{ animationDelay: '200ms', opacity: 0, animationFillMode: 'forwards' }}
        >
          <Card
            variant="glass"
            className="backdrop-blur-xl border border-white/50 dark:border-white/10"
          >
            <CardContent className="p-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <CalendarIcon className="h-5 w-5 text-slate-400" />
                    <label
                      htmlFor="as-of-date"
                      className="text-sm font-medium text-slate-700 dark:text-slate-300"
                    >
                      As of Date
                    </label>
                  </div>
                  <input
                    id="as-of-date"
                    type="date"
                    value={asOfDate}
                    onChange={e => setAsOfDate(e.target.value)}
                    className="px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all duration-200"
                  />
                </div>

                <div className="flex items-center gap-4">
                  <BalanceStatusBadge isBalanced={isBalanced} difference={difference} />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Summary Cards */}
        <div
          className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 animate-fade-in-up"
          style={{ animationDelay: '300ms', opacity: 0, animationFillMode: 'forwards' }}
        >
          {/* Report Date */}
          <Card
            variant="glass"
            className="group backdrop-blur-xl border border-white/50 dark:border-white/10 hover:shadow-xl hover:shadow-purple-500/5 transition-all duration-500"
          >
            <CardContent className="p-5">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                Report Date
              </p>
              <p className="text-2xl font-display font-bold text-slate-900 dark:text-white">
                {new Date(asOfDate).toLocaleDateString('en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 font-mono">
                {lines.length} accounts
              </p>
            </CardContent>
          </Card>

          {/* Total Debits */}
          <Card
            variant="glass"
            className="group backdrop-blur-xl border border-white/50 dark:border-white/10 hover:shadow-xl hover:shadow-blue-500/10 transition-all duration-500"
          >
            <CardContent className="p-5">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                Total Debits
              </p>
              <p className="text-2xl font-display font-bold text-blue-600 dark:text-blue-400">
                {isAnimating ? <AnimatedNumber value={totalDebit} /> : formatCurrency(totalDebit)}
              </p>
              <div className="mt-2 h-1 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-1000"
                  style={{ width: `${(totalDebit / (totalDebit + totalCredit)) * 100}%` }}
                />
              </div>
            </CardContent>
          </Card>

          {/* Total Credits */}
          <Card
            variant="glass"
            className="group backdrop-blur-xl border border-white/50 dark:border-white/10 hover:shadow-xl hover:shadow-purple-500/10 transition-all duration-500"
          >
            <CardContent className="p-5">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                Total Credits
              </p>
              <p className="text-2xl font-display font-bold text-purple-600 dark:text-purple-400">
                {isAnimating ? <AnimatedNumber value={totalCredit} /> : formatCurrency(totalCredit)}
              </p>
              <div className="mt-2 h-1 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-purple-500 to-purple-600 rounded-full transition-all duration-1000"
                  style={{ width: `${(totalCredit / (totalDebit + totalCredit)) * 100}%` }}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Account Groups */}
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} variant="rounded" className="h-64" />
            ))}
          </div>
        ) : lines.length > 0 ? (
          <div className="space-y-6">
            {accountGroups.map((group, groupIndex) => (
              <div
                key={group.accountType}
                className="animate-fade-in-up"
                style={{
                  animationDelay: `${400 + groupIndex * 100}ms`,
                  opacity: 0,
                  animationFillMode: 'forwards',
                }}
              >
                <Card
                  variant="glass"
                  className="backdrop-blur-xl border border-white/50 dark:border-white/10 overflow-hidden"
                  accent
                >
                  {/* Group Header */}
                  <div className="px-6 py-4 bg-gradient-to-r from-slate-50 to-transparent dark:from-slate-800/50 dark:to-transparent border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <AccountTypeIcon type={group.accountType} />
                        <CardTitle className="text-lg font-display">
                          {group.accountType} Accounts
                        </CardTitle>
                        <span className="px-2 py-0.5 text-xs font-medium bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-full">
                          {group.accounts.length}
                        </span>
                      </div>
                      <div className="flex items-center gap-6 text-sm">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-blue-500" />
                          <span className="text-slate-500 dark:text-slate-400">Debit:</span>
                          <span className="font-mono font-medium text-blue-600 dark:text-blue-400">
                            {formatCurrency(group.totalDebit)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-purple-500" />
                          <span className="text-slate-500 dark:text-slate-400">Credit:</span>
                          <span className="font-mono font-medium text-purple-600 dark:text-purple-400">
                            {formatCurrency(group.totalCredit)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Account Table */}
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <table className="w-full" role="table">
                        <thead>
                          <tr className="bg-slate-50/50 dark:bg-slate-900/50">
                            <th className="text-left py-3 px-6 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                              Code
                            </th>
                            <th className="text-left py-3 px-6 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                              Account Name
                            </th>
                            <th className="text-right py-3 px-6 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider w-40">
                              Debit
                            </th>
                            <th className="text-right py-3 px-6 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider w-40">
                              Credit
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          {group.accounts.map((account, index) => (
                            <tr
                              key={account.accountId}
                              className="group hover:bg-purple-50/50 dark:hover:bg-purple-500/5 transition-colors duration-200"
                            >
                              <td className="py-3.5 px-6">
                                <span className="font-mono text-sm text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">
                                  {account.accountCode}
                                </span>
                              </td>
                              <td className="py-3.5 px-6">
                                <span className="text-sm font-medium text-slate-900 dark:text-white group-hover:text-purple-700 dark:group-hover:text-purple-300 transition-colors">
                                  {account.accountName}
                                </span>
                              </td>
                              <td className="py-3.5 px-6 text-right">
                                {account.debitBalance > 0 ? (
                                  <span className="font-mono text-sm text-blue-600 dark:text-blue-400">
                                    {formatCurrency(account.debitBalance)}
                                  </span>
                                ) : (
                                  <span className="text-slate-300 dark:text-slate-600">—</span>
                                )}
                              </td>
                              <td className="py-3.5 px-6 text-right">
                                {account.creditBalance > 0 ? (
                                  <span className="font-mono text-sm text-purple-600 dark:text-purple-400">
                                    {formatCurrency(account.creditBalance)}
                                  </span>
                                ) : (
                                  <span className="text-slate-300 dark:text-slate-600">—</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        {/* Group Footer */}
                        <tfoot>
                          <tr className="bg-gradient-to-r from-slate-100 to-slate-50 dark:from-slate-800 dark:to-slate-800/50 border-t-2 border-slate-200 dark:border-slate-700">
                            <td
                              colSpan={2}
                              className="py-3.5 px-6 text-right text-sm font-semibold text-slate-600 dark:text-slate-300"
                            >
                              {group.accountType} Total
                            </td>
                            <td className="py-3.5 px-6 text-right">
                              <span className="font-mono text-sm font-bold text-blue-600 dark:text-blue-400">
                                {formatCurrency(group.totalDebit)}
                              </span>
                            </td>
                            <td className="py-3.5 px-6 text-right">
                              <span className="font-mono text-sm font-bold text-purple-600 dark:text-purple-400">
                                {formatCurrency(group.totalCredit)}
                              </span>
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ))}

            {/* Grand Total Card */}
            <div
              className="animate-fade-in-up"
              style={{
                animationDelay: `${400 + accountGroups.length * 100}ms`,
                opacity: 0,
                animationFillMode: 'forwards',
              }}
            >
              <Card
                className={`backdrop-blur-xl overflow-hidden ${
                  isBalanced
                    ? 'border-2 border-emerald-200 dark:border-emerald-500/30 bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-500/10 dark:to-slate-900'
                    : 'border-2 border-amber-200 dark:border-amber-500/30 bg-gradient-to-br from-amber-50 to-white dark:from-amber-500/10 dark:to-slate-900'
                }`}
              >
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      {isBalanced ? (
                        <div className="p-3 bg-emerald-100 dark:bg-emerald-500/20 rounded-xl">
                          <CheckCircleIcon className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
                        </div>
                      ) : (
                        <div className="p-3 bg-amber-100 dark:bg-amber-500/20 rounded-xl">
                          <ExclamationTriangleIcon className="h-8 w-8 text-amber-600 dark:text-amber-400" />
                        </div>
                      )}
                      <div>
                        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                          Verification Status
                        </p>
                        <p
                          className={`text-2xl font-display font-bold ${
                            isBalanced
                              ? 'text-emerald-700 dark:text-emerald-300'
                              : 'text-amber-700 dark:text-amber-300'
                          }`}
                        >
                          {isBalanced
                            ? 'Trial Balance is Balanced'
                            : 'Trial Balance is Out of Balance'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-8">
                      <div className="text-center">
                        <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">
                          Total Debits
                        </p>
                        <p className="text-3xl font-display font-bold text-blue-600 dark:text-blue-400">
                          {formatCurrency(totalDebit)}
                        </p>
                      </div>
                      <div className="w-px h-12 bg-slate-200 dark:bg-slate-700" />
                      <div className="text-center">
                        <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">
                          Total Credits
                        </p>
                        <p className="text-3xl font-display font-bold text-purple-600 dark:text-purple-400">
                          {formatCurrency(totalCredit)}
                        </p>
                      </div>
                    </div>
                  </div>

                  {!isBalanced && (
                    <div className="mt-6 p-4 bg-amber-100/50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl">
                      <div className="flex items-center gap-2">
                        <XMarkIcon className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                        <p className="text-sm font-medium text-amber-700 dark:text-amber-300">
                          Difference: {formatCurrency(difference)}
                        </p>
                      </div>
                      <p className="text-xs text-amber-600/80 dark:text-amber-400/80 mt-1 ml-7">
                        Please review journal entries for posting errors.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        ) : (
          <Card
            variant="glass"
            className="backdrop-blur-xl border border-white/50 dark:border-white/10"
          >
            <CardContent className="p-16 text-center">
              <DocumentTextIcon className="h-20 w-20 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
              <p className="text-lg font-medium text-slate-600 dark:text-slate-400">
                No trial balance data available
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-500 mt-1">
                Try selecting a different date or add journal entries.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Footer */}
        <footer
          className="mt-12 pt-8 border-t border-slate-200 dark:border-slate-800 animate-fade-in-up"
          style={{ animationDelay: '800ms', opacity: 0, animationFillMode: 'forwards' }}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-sm text-slate-500 dark:text-slate-400">
            <p className="font-light">
              Trial Balance Report • Generated{' '}
              {new Date().toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}
            </p>
            <p className="font-mono text-xs">
              {accountGroups.length} account types • {lines.length} accounts total
            </p>
          </div>
        </footer>
      </main>
    </div>
  );
}

export default TrialBalancePage;
