/**
 * Trial Balance Page
 *
 * Displays the trial balance report showing all account balances
 * to verify that total debits equal total credits.
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
  DocumentTextIcon,
  ArrowDownIcon,
  PrinterIcon,
  ArrowDownTrayIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { useTrialBalance } from '@/services/api';
import { type TrialBalance, type TrialBalanceLine } from '@opsui/shared';

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

interface AccountGroup {
  accountType: string;
  accounts: TrialBalanceLine[];
  totalDebit: number;
  totalCredit: number;
}

function groupAccountsByType(lines: TrialBalanceLine[]): AccountGroup[] {
  const groups: Record<string, AccountGroup> = {};

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

  return Object.values(groups);
}

// ============================================================================
// MAIN PAGE
// ============================================================================

function TrialBalancePage() {
  const navigate = useNavigate();

  // State
  const [asOfDate, setAsOfDate] = useState<string>(new Date().toISOString().split('T')[0]);

  // API hook
  const { data: trialBalance, isLoading, refetch } = useTrialBalance(asOfDate);

  // Format currency
  const formatCurrency = (value: number | string): string => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(num);
  };

  // Calculate totals
  const totalDebit = trialBalance?.totalDebit || 0;
  const totalCredit = trialBalance?.totalCredit || 0;
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;
  const lines = trialBalance?.lines || [];
  const accountGroups = groupAccountsByType(lines);

  // Get balance status
  const getBalanceStatus = () => {
    if (isBalanced) {
      return { label: 'Balanced', variant: 'success' as const, color: 'text-emerald-400' };
    }
    const difference = Math.abs(totalDebit - totalCredit);
    return {
      label: `Out of Balance by ${formatCurrency(difference)}`,
      variant: 'danger' as const,
      color: 'text-rose-400',
    };
  };

  const balanceStatus = getBalanceStatus();

  // Export to CSV
  const exportToCSV = () => {
    if (!lines.length) return;

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
            <div>
              <h1 className="text-3xl font-bold text-white tracking-tight">Trial Balance</h1>
              <p className="mt-2 text-gray-400">Verify debits equal credits for all accounts</p>
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
              <div className="flex items-center gap-4">
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
              </div>

              {trialBalance && (
                <div className="text-right">
                  <p className="text-sm text-gray-400 mb-1">Balance Status</p>
                  <div className="flex items-center gap-2">
                    {isBalanced ? (
                      <svg
                        className="h-5 w-5 text-emerald-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    ) : (
                      <XMarkIcon className="h-5 w-5 text-rose-400" />
                    )}
                    <span className={`text-lg font-bold ${balanceStatus.color}`}>
                      {balanceStatus.label}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Trial Balance Report */}
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton variant="rounded" className="h-64" />
          </div>
        ) : trialBalance && lines.length > 0 ? (
          <div className="space-y-6">
            {/* Summary Card */}
            <Card variant="glass" className="border-l-4 border-l-emerald-500">
              <CardContent className="p-6">
                <div className="grid grid-cols-3 gap-6">
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Report Date</p>
                    <p className="text-lg font-medium text-white">
                      {new Date(trialBalance.asOfDate).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Total Debits</p>
                    <p className="text-2xl font-bold text-blue-400">{formatCurrency(totalDebit)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Total Credits</p>
                    <p className="text-2xl font-bold text-rose-400">
                      {formatCurrency(totalCredit)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Account Groups */}
            {accountGroups.map(group => (
              <Card key={group.accountType} variant="glass">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>{group.accountType} Accounts</span>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-blue-400">
                        Debits: {formatCurrency(group.totalDebit)}
                      </span>
                      <span className="text-rose-400">
                        Credits: {formatCurrency(group.totalCredit)}
                      </span>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full" role="table">
                      <thead>
                        <tr className="border-b border-gray-700">
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">
                            Account Code
                          </th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">
                            Account Name
                          </th>
                          <th className="text-right py-3 px-4 text-sm font-medium text-gray-400 w-40">
                            Debit Balance
                          </th>
                          <th className="text-right py-3 px-4 text-sm font-medium text-gray-400 w-40">
                            Credit Balance
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {group.accounts.map(account => (
                          <tr
                            key={account.accountId}
                            className="border-b border-gray-800 hover:bg-white/[0.02]"
                          >
                            <td className="py-3 px-4 text-sm font-mono text-gray-300">
                              {account.accountCode}
                            </td>
                            <td className="py-3 px-4 text-sm text-white">{account.accountName}</td>
                            <td className="py-3 px-4 text-sm text-right">
                              <span
                                className={
                                  account.debitBalance > 0 ? 'text-blue-400' : 'text-gray-600'
                                }
                              >
                                {account.debitBalance > 0
                                  ? formatCurrency(account.debitBalance)
                                  : '-'}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-sm text-right">
                              <span
                                className={
                                  account.creditBalance > 0 ? 'text-rose-400' : 'text-gray-600'
                                }
                              >
                                {account.creditBalance > 0
                                  ? formatCurrency(account.creditBalance)
                                  : '-'}
                              </span>
                            </td>
                          </tr>
                        ))}
                        <tr className="border-t-2 border-gray-700 bg-white/[0.02]">
                          <td
                            colSpan={2}
                            className="py-3 px-4 text-sm font-medium text-gray-400 text-right"
                          >
                            {group.accountType} Total:
                          </td>
                          <td className="py-3 px-4 text-sm text-right font-medium text-blue-400">
                            {formatCurrency(group.totalDebit)}
                          </td>
                          <td className="py-3 px-4 text-sm text-right font-medium text-rose-400">
                            {formatCurrency(group.totalCredit)}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            ))}

            {/* Grand Total */}
            <Card variant="glass" className="border-t-4 border-t-emerald-500">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Grand Total</p>
                    <p className="text-2xl font-bold text-white">
                      {isBalanced ? 'Trial Balance is Balanced' : 'Trial Balance is Out of Balance'}
                    </p>
                  </div>
                  <div className="flex items-center gap-8">
                    <div className="text-right">
                      <p className="text-xs text-gray-500 mb-1">Total Debits</p>
                      <p className="text-2xl font-bold text-blue-400">
                        {formatCurrency(totalDebit)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500 mb-1">Total Credits</p>
                      <p className="text-2xl font-bold text-rose-400">
                        {formatCurrency(totalCredit)}
                      </p>
                    </div>
                  </div>
                </div>
                {!isBalanced && (
                  <div className="mt-4 p-4 bg-rose-500/10 border border-rose-500/30 rounded-lg">
                    <div className="flex items-center gap-2">
                      <XMarkIcon className="h-5 w-5 text-rose-400" />
                      <p className="text-sm text-rose-300">
                        Difference: {formatCurrency(Math.abs(totalDebit - totalCredit))}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        ) : (
          <Card variant="glass">
            <CardContent className="p-12 text-center">
              <DocumentTextIcon className="h-16 w-16 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400">No trial balance data available for the selected date</p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}

export default TrialBalancePage;
