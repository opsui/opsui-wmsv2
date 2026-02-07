/**
 * Accounts Receivable Aging Page
 *
 * Displays aging report for accounts receivable showing outstanding invoices
 * grouped by aging buckets (current, 30-60, 60-90, 90-120, 120+ days).
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
  ClockIcon,
  CurrencyDollarIcon,
  PrinterIcon,
  ArrowDownTrayIcon,
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
// MAIN PAGE
// ============================================================================

function ARAgingPage() {
  const navigate = useNavigate();

  // State
  const [asOfDate, setAsOfDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [isLoading, setIsLoading] = useState(false);

  // Mock data for now - would be replaced with API call
  const mockReport: AgingReport = {
    asOfDate: new Date(),
    buckets: [
      { days: 30, label: 'Current (0-30 days)', amount: 45000, count: 12 },
      { days: 60, label: '31-60 days', amount: 15000, count: 5 },
      { days: 90, label: '61-90 days', amount: 8000, count: 3 },
      { days: 120, label: '91-120 days', amount: 3000, count: 1 },
      { days: 999, label: 'Over 120 days', amount: 1500, count: 1 },
    ],
    totalOutstanding: 72500,
  };

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  };

  // Export to CSV
  const exportToCSV = () => {
    const lines: string[] = [];

    lines.push('ACCOUNTS RECEIVABLE AGING REPORT');
    lines.push(`As of ${new Date(mockReport.asOfDate).toLocaleDateString()}`);
    lines.push('');

    mockReport.buckets.forEach(bucket => {
      lines.push(`${bucket.label},${formatCurrency(bucket.amount)},${bucket.count} invoices`);
    });

    lines.push('');
    lines.push(`TOTAL OUTSTANDING,${formatCurrency(mockReport.totalOutstanding)}`);

    const csvContent = lines.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ar-aging-${asOfDate}.csv`;
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
              <div className="p-3 bg-amber-500/20 rounded-xl">
                <ClockIcon className="h-8 w-8 text-amber-400" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white tracking-tight">
                  Accounts Receivable Aging
                </h1>
                <p className="mt-2 text-gray-400">
                  Track outstanding invoices by aging period
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
          </CardContent>
        </Card>

        {/* Aging Report */}
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton variant="rounded" className="h-64" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Summary Card */}
            <Card variant="glass" className="border-l-4 border-l-amber-500">
              <CardContent className="p-6">
                <div className="grid grid-cols-3 gap-6">
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Report Date</p>
                    <p className="text-lg font-medium text-white">
                      {new Date(mockReport.asOfDate).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Total Outstanding</p>
                    <p className="text-2xl font-bold text-amber-400">
                      {formatCurrency(mockReport.totalOutstanding)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Total Invoices</p>
                    <p className="text-2xl font-bold text-white">
                      {mockReport.buckets.reduce((sum, b) => sum + b.count, 0)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Aging Buckets */}
            <Card variant="glass">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CurrencyDollarIcon className="h-5 w-5 text-amber-400" />
                  Aging Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {mockReport.buckets.map((bucket, index) => {
                    const percent = mockReport.totalOutstanding > 0
                      ? (bucket.amount / mockReport.totalOutstanding) * 100
                      : 0;

                    let colorClass = 'text-emerald-400';
                    let bgClass = 'bg-emerald-500/20';

                    if (bucket.days >= 90) {
                      colorClass = 'text-rose-400';
                      bgClass = 'bg-rose-500/20';
                    } else if (bucket.days >= 60) {
                      colorClass = 'text-amber-400';
                      bgClass = 'bg-amber-500/20';
                    }

                    return (
                      <div key={index} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="text-sm text-gray-300 min-w-[140px]">{bucket.label}</span>
                            <span className={`text-lg font-bold ${colorClass}`}>
                              {formatCurrency(bucket.amount)}
                            </span>
                            <span className="text-xs text-gray-500">({bucket.count} invoices)</span>
                          </div>
                          <span className="text-sm text-gray-400">{percent.toFixed(1)}%</span>
                        </div>
                        <div className="w-full bg-white/[0.05] rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${bgClass} transition-all duration-500`}
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Health Indicator */}
            <Card variant="glass">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-3 rounded-xl ${
                      mockReport.buckets[0].amount / mockReport.totalOutstanding > 0.5
                        ? 'bg-emerald-500/20'
                        : mockReport.buckets[1].amount / mockReport.totalOutstanding > 0.3
                        ? 'bg-amber-500/20'
                        : 'bg-rose-500/20'
                    }`}>
                      <ClockIcon className={`h-6 w-6 ${
                        mockReport.buckets[0].amount / mockReport.totalOutstanding > 0.5
                          ? 'text-emerald-400'
                          : mockReport.buckets[1].amount / mockReport.totalOutstanding > 0.3
                          ? 'text-amber-400'
                          : 'text-rose-400'
                      }`} />
                    </div>
                    <div>
                      <p className="text-sm text-gray-400">Collection Health</p>
                      <p className="text-lg font-bold text-white">
                        {mockReport.buckets[0].amount / mockReport.totalOutstanding > 0.5
                          ? 'Good'
                          : mockReport.buckets[1].amount / mockReport.totalOutstanding > 0.3
                          ? 'Fair'
                          : 'Poor'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500 mb-1">Current Ratio</p>
                    <p className="text-2xl font-bold text-emerald-400">
                      {((mockReport.buckets[0].amount / mockReport.totalOutstanding) * 100).toFixed(0)}%
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}

export default ARAgingPage;
