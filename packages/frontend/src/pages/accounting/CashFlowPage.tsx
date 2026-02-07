/**
 * Cash Flow Statement Page
 *
 * Displays the cash flow statement showing cash inflows and outflows
 * from operating, investing, and financing activities.
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
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  PrinterIcon,
  ArrowDownTrayIcon,
  CurrencyDollarIcon,
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
}

function CashFlowSection({
  title,
  subtitle,
  items,
  totalLabel,
  total,
  isInflow = true,
}: CashFlowSectionProps) {
  const formatCurrency = (value: number): string => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(num);
  };

  return (
    <div className="space-y-3">
      <div>
        <h4 className="text-sm font-medium text-gray-400 uppercase tracking-wider">{title}</h4>
        {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
      </div>
      <div className="space-y-2">
        {items.map((item, index) => (
          <div
            key={index}
            className="flex items-center justify-between py-2 border-b border-gray-800"
          >
            <span className="text-sm text-gray-300">{item.name}</span>
            <span
              className={`text-sm font-medium ${item.amount >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}
            >
              {item.amount >= 0 ? '+' : ''}
              {formatCurrency(item.amount)}
            </span>
          </div>
        ))}
        <div
          className={`flex items-center justify-between py-2 bg-white/[0.03] px-3 rounded-lg border-l-4 ${isInflow ? 'border-l-emerald-500' : 'border-l-rose-500'}`}
        >
          <span className="text-sm font-medium text-gray-400">{totalLabel}</span>
          <span
            className={`text-sm font-bold ${total >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}
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

  // Format currency
  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  };

  // Calculate period info
  const getPeriodLabel = () => {
    if (!cashFlow?.period) return '';
    const start = new Date(cashFlow.period.startDate || Date.now());
    const end = new Date(cashFlow.period.endDate || Date.now());
    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    if (days <= 31) {
      return `${days} days`;
    }
    const months = Math.floor(days / 30);
    return `${months} month${months > 1 ? 's' : ''}`;
  };

  // Export to CSV
  const exportToCSV = () => {
    if (!cashFlow) return;

    const lines: string[] = [];

    lines.push('CASH FLOW STATEMENT');
    lines.push(
      `Period: ${new Date(cashFlow.period?.startDate || '').toLocaleDateString()} - ${new Date(cashFlow.period?.endDate || '').toLocaleDateString()}`
    );
    lines.push('');

    lines.push('OPERATING ACTIVITIES');
    (cashFlow.operating?.activities || []).forEach((act: any) => {
      lines.push(`${act.name},${(act.amount || 0).toFixed(2)}`);
    });
    lines.push(`Net Cash from Operating,${(cashFlow.operating?.total || 0).toFixed(2)}`);
    lines.push('');

    lines.push('INVESTING ACTIVITIES');
    (cashFlow.investing?.activities || []).forEach((act: any) => {
      lines.push(`${act.name},${(act.amount || 0).toFixed(2)}`);
    });
    lines.push(`Net Cash from Investing,${(cashFlow.investing?.total || 0).toFixed(2)}`);
    lines.push('');

    lines.push('FINANCING ACTIVITIES');
    (cashFlow.financing?.activities || []).forEach((act: any) => {
      lines.push(`${act.name},${(act.amount || 0).toFixed(2)}`);
    });
    lines.push(`Net Cash from Financing,${(cashFlow.financing?.total || 0).toFixed(2)}`);
    lines.push('');

    lines.push(`NET CASH FLOW,${(cashFlow.netCashFlow || 0).toFixed(2)}`);

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
              <div className="p-3 bg-emerald-500/20 rounded-xl">
                <CurrencyDollarIcon className="h-8 w-8 text-emerald-400" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white tracking-tight">
                  Cash Flow Statement
                </h1>
                <p className="mt-2 text-gray-400">
                  Cash inflows and outflows from operating, investing, and financing activities
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
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex-1 min-w-[200px]">
                <label htmlFor="start-date" className="text-sm text-gray-400 mb-2 block">
                  Start Date
                </label>
                <input
                  id="start-date"
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  className="w-full px-4 py-2 bg-white/[0.05] border border-white/[0.08] rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                />
              </div>
              <div className="flex-1 min-w-[200px]">
                <label htmlFor="end-date" className="text-sm text-gray-400 mb-2 block">
                  End Date
                </label>
                <input
                  id="end-date"
                  type="date"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  className="w-full px-4 py-2 bg-white/[0.05] border border-white/[0.08] rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                />
              </div>
              {cashFlow && (
                <div className="px-4 py-2 bg-white/[0.03] rounded-xl">
                  <p className="text-xs text-gray-500">Period</p>
                  <p className="text-sm font-medium text-white">{getPeriodLabel()}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Cash Flow Statement */}
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton variant="rounded" className="h-64" />
          </div>
        ) : cashFlow ? (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Operating Activities */}
              <Card variant="glass">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <div className="p-2 bg-emerald-500/20 rounded-lg">
                      <CurrencyDollarIcon className="h-5 w-5 text-emerald-400" />
                    </div>
                    Operating Activities
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CashFlowSection
                    title="Cash from Operations"
                    subtitle="Primary business activities"
                    items={cashFlow.operating?.activities || []}
                    totalLabel="Net Cash from Operations"
                    total={cashFlow.operating?.total || 0}
                    isInflow={(cashFlow.operating?.total || 0) >= 0}
                  />
                </CardContent>
              </Card>

              {/* Investing Activities */}
              <Card variant="glass">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <div className="p-2 bg-blue-500/20 rounded-lg">
                      <ArrowTrendingUpIcon className="h-5 w-5 text-blue-400" />
                    </div>
                    Investing Activities
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CashFlowSection
                    title="Cash from Investments"
                    subtitle="Asset purchases and sales"
                    items={cashFlow.investing?.activities || []}
                    totalLabel="Net Cash from Investing"
                    total={cashFlow.investing?.total || 0}
                    isInflow={(cashFlow.investing?.total || 0) >= 0}
                  />
                </CardContent>
              </Card>

              {/* Financing Activities */}
              <Card variant="glass">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <div className="p-2 bg-purple-500/20 rounded-lg">
                      <ArrowTrendingDownIcon className="h-5 w-5 text-purple-400" />
                    </div>
                    Financing Activities
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CashFlowSection
                    title="Cash from Financing"
                    subtitle="Debt and equity transactions"
                    items={cashFlow.financing?.activities || []}
                    totalLabel="Net Cash from Financing"
                    total={cashFlow.financing?.total || 0}
                    isInflow={(cashFlow.financing?.total || 0) >= 0}
                  />
                </CardContent>
              </Card>
            </div>
            // Summary Card
            <Card variant="glass" className="mt-6">
              <CardContent className="p-6">
                <div className="grid grid-cols-4 gap-6">
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <CurrencyDollarIcon className="h-5 w-5 text-emerald-400" />
                      <p className="text-xs text-gray-500">Operating</p>
                    </div>
                    <p
                      className={`text-xl font-bold ${cashFlow.operating.total >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}
                    >
                      {cashFlow.operating.total >= 0 ? '+' : ''}
                      {formatCurrency(cashFlow.operating.total)}
                    </p>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <ArrowTrendingUpIcon className="h-5 w-5 text-blue-400" />
                      <p className="text-xs text-gray-500">Investing</p>
                    </div>
                    <p
                      className={`text-xl font-bold ${cashFlow.investing.total >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}
                    >
                      {cashFlow.investing.total >= 0 ? '+' : ''}
                      {formatCurrency(cashFlow.investing.total)}
                    </p>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <ArrowTrendingDownIcon className="h-5 w-5 text-purple-400" />
                      <p className="text-xs text-gray-500">Financing</p>
                    </div>
                    <p
                      className={`text-xl font-bold ${cashFlow.financing.total >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}
                    >
                      {cashFlow.financing.total >= 0 ? '+' : ''}
                      {formatCurrency(cashFlow.financing.total)}
                    </p>
                  </div>
                  <div className="text-center border-l border-gray-700">
                    <p className="text-xs text-gray-500 mb-2">Net Cash Flow</p>
                    <p
                      className={`text-2xl font-bold ${cashFlow.netCashFlow >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}
                    >
                      {cashFlow.netCashFlow >= 0 ? '+' : ''}
                      {formatCurrency(cashFlow.netCashFlow)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            {/* Reconciliation Card */}
            <Card variant="glass" className="mt-6">
              <CardHeader>
                <CardTitle>Cash Flow Reconciliation</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between py-2 border-b border-gray-800">
                    <span className="text-sm text-gray-400">
                      Net cash from operating activities
                    </span>
                    <span
                      className={`text-sm font-medium ${cashFlow.operating.total >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}
                    >
                      {formatCurrency(cashFlow.operating.total)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-gray-800">
                    <span className="text-sm text-gray-400">
                      Net cash from investing activities
                    </span>
                    <span
                      className={`text-sm font-medium ${cashFlow.investing.total >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}
                    >
                      {formatCurrency(cashFlow.investing.total)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-gray-800">
                    <span className="text-sm text-gray-400">
                      Net cash from financing activities
                    </span>
                    <span
                      className={`text-sm font-medium ${cashFlow.financing.total >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}
                    >
                      {formatCurrency(cashFlow.financing.total)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-3 bg-white/[0.03] px-3 rounded-lg">
                    <span className="text-base font-bold text-white">Net change in cash</span>
                    <span
                      className={`text-xl font-bold ${cashFlow.netCashFlow >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}
                    >
                      {cashFlow.netCashFlow >= 0 ? '+' : ''}
                      {formatCurrency(cashFlow.netCashFlow)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        ) : (
          <Card variant="glass">
            <CardContent className="p-12 text-center">
              <CurrencyDollarIcon className="h-16 w-16 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400">No cash flow data available for the selected period</p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}

export default CashFlowPage;
