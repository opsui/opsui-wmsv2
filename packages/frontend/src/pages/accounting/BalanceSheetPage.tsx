/**
 * Balance Sheet Page
 *
 * Displays the balance sheet statement showing Assets = Liabilities + Equity
 * as of a specific date.
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
  Skeleton,
} from '@/components/shared';
import {
  ArrowLeftIcon,
  BuildingOfficeIcon,
  PrinterIcon,
  ArrowDownTrayIcon,
  ScaleIcon,
  ArrowTrendingUpIcon,
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
}

function AccountSection({
  title,
  accounts,
  totalLabel,
  total,
  colorClass = 'text-white',
}: AccountSectionProps) {
  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  };

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-medium text-gray-400 uppercase tracking-wider">{title}</h4>
      <div className="space-y-2">
        {accounts.map(account => (
          <div
            key={account.accountId}
            className="flex items-center justify-between py-2 border-b border-gray-800"
          >
            <span className="text-sm text-gray-300">{account.accountName}</span>
            <span className={`text-sm font-medium ${colorClass}`}>
              {formatCurrency(account.amount)}
            </span>
          </div>
        ))}
        <div className="flex items-center justify-between py-2 bg-white/[0.03] px-3 rounded-lg">
          <span className="text-sm font-medium text-gray-400">{totalLabel}</span>
          <span className={`text-sm font-bold ${colorClass}`}>{formatCurrency(total)}</span>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN PAGE
// ============================================================================

function BalanceSheetPage() {
  const navigate = useNavigate();

  // State
  const [asOfDate, setAsOfDate] = useState<string>(new Date().toISOString().split('T')[0]);

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
    <div className="min-h-screen">
      <Header />

      <main className="w-full px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigate('/accounting')}
              className="flex items-center gap-2"
            >
              <ArrowLeftIcon className="h-4 w-4" />
              Back to Accounting
            </Button>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-500/20 rounded-xl">
                <BuildingOfficeIcon className="h-8 w-8 text-blue-400" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white tracking-tight">Balance Sheet</h1>
                <p className="mt-2 text-gray-400">
                  Financial position statement: Assets = Liabilities + Equity
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="secondary" onClick={exportToCSV} className="flex items-center gap-2">
                <ArrowDownTrayIcon className="h-4 w-4" />
                Export CSV
              </Button>
              <Button variant="secondary" onClick={handlePrint} className="flex items-center gap-2">
                <PrinterIcon className="h-4 w-4" />
                Print
              </Button>
            </div>
          </div>
        </div>

        {/* Filters */}
        <Card variant="glass" className="mb-6">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <label htmlFor="as-of-date" className="text-sm text-gray-400 mb-2 block">
                  As of Date
                </label>
                <input
                  id="as-of-date"
                  type="date"
                  value={asOfDate}
                  onChange={e => setAsOfDate(e.target.value)}
                  className="px-4 py-2 bg-white/[0.05] border border-white/[0.08] rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                />
              </div>

              {balanceSheet && (
                <div className="flex items-center gap-2">
                  <ScaleIcon
                    className={`h-5 w-5 ${isBalanced ? 'text-emerald-400' : 'text-rose-400'}`}
                  />
                  <span
                    className={`text-sm font-medium ${isBalanced ? 'text-emerald-400' : 'text-rose-400'}`}
                  >
                    {isBalanced ? 'Balanced' : 'Out of Balance'}
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Balance Sheet Report */}
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton variant="rounded" className="h-64" />
          </div>
        ) : balanceSheet ? (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Assets Column */}
              <Card variant="glass">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <div className="p-2 bg-blue-500/20 rounded-lg">
                      <BuildingOfficeIcon className="h-5 w-5 text-blue-400" />
                    </div>
                    Assets
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Current Assets */}
                  <AccountSection
                    title="Current Assets"
                    accounts={balanceSheet.assets.current}
                    totalLabel="Total Current Assets"
                    total={balanceSheet.assets.currentTotal}
                    colorClass="text-blue-400"
                  />

                  {/* Non-Current Assets */}
                  <AccountSection
                    title="Non-Current Assets"
                    accounts={balanceSheet.assets.nonCurrent}
                    totalLabel="Total Non-Current Assets"
                    total={balanceSheet.assets.nonCurrentTotal}
                    colorClass="text-blue-400"
                  />

                  {/* Total Assets */}
                  <div className="pt-4 border-t-2 border-gray-700">
                    <div className="flex items-center justify-between">
                      <span className="text-base font-bold text-white">TOTAL ASSETS</span>
                      <span className="text-xl font-bold text-blue-400">
                        {formatCurrency(balanceSheet.assets.total)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Liabilities Column */}
              <Card variant="glass">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <div className="p-2 bg-rose-500/20 rounded-lg">
                      <ArrowTrendingUpIcon className="h-5 w-5 text-rose-400" />
                    </div>
                    Liabilities
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Current Liabilities */}
                  <AccountSection
                    title="Current Liabilities"
                    accounts={balanceSheet.liabilities.current}
                    totalLabel="Total Current Liabilities"
                    total={balanceSheet.liabilities.currentTotal}
                    colorClass="text-rose-400"
                  />

                  {/* Non-Current Liabilities */}
                  <AccountSection
                    title="Non-Current Liabilities"
                    accounts={balanceSheet.liabilities.nonCurrent}
                    totalLabel="Total Non-Current Liabilities"
                    total={balanceSheet.liabilities.nonCurrentTotal}
                    colorClass="text-rose-400"
                  />

                  {/* Total Liabilities */}
                  <div className="pt-4 border-t-2 border-gray-700">
                    <div className="flex items-center justify-between">
                      <span className="text-base font-bold text-white">TOTAL LIABILITIES</span>
                      <span className="text-xl font-bold text-rose-400">
                        {formatCurrency(balanceSheet.liabilities.total)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Equity Column */}
              <Card variant="glass">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <div className="p-2 bg-purple-500/20 rounded-lg">
                      <ScaleIcon className="h-5 w-5 text-purple-400" />
                    </div>
                    Equity
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <AccountSection
                    title="Equity Accounts"
                    accounts={balanceSheet.equity.breakdown}
                    totalLabel="TOTAL EQUITY"
                    total={balanceSheet.equity.total}
                    colorClass="text-purple-400"
                  />

                  {/* Total Liabilities + Equity */}
                  <div className="pt-4 border-t-2 border-gray-700">
                    <div className="flex items-center justify-between">
                      <span className="text-base font-bold text-white">TOTAL L&E</span>
                      <span className="text-xl font-bold text-purple-400">
                        {formatCurrency(balanceSheet.liabilities.total + balanceSheet.equity.total)}
                      </span>
                    </div>
                  </div>

                  {/* Balance Verification */}
                  <div
                    className={`mt-4 p-4 rounded-lg border ${isBalanced ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-rose-500/10 border-rose-500/30'}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <ScaleIcon
                          className={`h-5 w-5 ${isBalanced ? 'text-emerald-400' : 'text-rose-400'}`}
                        />
                        <span className="text-sm font-medium text-gray-300">
                          {isBalanced ? 'Balance Verified' : 'Balance Mismatch'}
                        </span>
                      </div>
                      <span
                        className={`text-lg font-bold ${isBalanced ? 'text-emerald-400' : 'text-rose-400'}`}
                      >
                        {isBalanced ? '✓' : '✗'}
                      </span>
                    </div>
                    {!isBalanced && (
                      <p className="text-xs text-rose-300 mt-2">
                        Difference:{' '}
                        {formatCurrency(
                          Math.abs(
                            balanceSheet.assets.total -
                              (balanceSheet.liabilities.total + balanceSheet.equity.total)
                          )
                        )}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Summary Card at bottom */}
            <Card variant="glass" className="mt-6">
              <CardContent className="p-6">
                <div className="grid grid-cols-3 gap-8">
                  <div className="text-center">
                    <p className="text-sm text-gray-400 mb-2">Total Assets</p>
                    <p className="text-3xl font-bold text-blue-400">
                      {formatCurrency(balanceSheet.assets.total)}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-gray-400 mb-2">Total Liabilities</p>
                    <p className="text-3xl font-bold text-rose-400">
                      {formatCurrency(balanceSheet.liabilities.total)}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-gray-400 mb-2">Total Equity</p>
                    <p className="text-3xl font-bold text-purple-400">
                      {formatCurrency(balanceSheet.equity.total)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        ) : (
          <Card variant="glass">
            <CardContent className="p-12 text-center">
              <BuildingOfficeIcon className="h-16 w-16 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400">No balance sheet data available for the selected date</p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}

export default BalanceSheetPage;
