/**
 * Budgeting & Forecasting Page
 *
 * Manage budgets, forecasts, and perform variance analysis
 * comparing budgeted vs actual performance.
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
  ChartBarIcon,
  PlusIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  PrinterIcon,
  ArrowDownTrayIcon,
} from '@heroicons/react/24/outline';

// ============================================================================
// TYPES
// ============================================================================

interface BudgetLine {
  accountId: string;
  accountName: string;
  accountCode: string;
  period: string;
  budgetedAmount: number;
  actualAmount: number;
  variance: number;
  variancePercent: number;
}

interface Budget {
  budgetId: string;
  budgetName: string;
  fiscalYear: number;
  budgetType: string;
  status: string;
}

// ============================================================================
// MAIN PAGE
// ============================================================================

function BudgetingPage() {
  const navigate = useNavigate();

  // State
  const [selectedBudgetId, setSelectedBudgetId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [showAddBudgetModal, setShowAddBudgetModal] = useState(false);

  // Mock data
  const mockBudgets: Budget[] = [
    { budgetId: 'BG-2024-001', budgetName: 'FY 2024 Operating Budget', fiscalYear: 2024, budgetType: 'ANNUAL', status: 'ACTIVE' },
    { budgetId: 'BG-2024-002', budgetName: 'FY 2024 Q1 Forecast', fiscalYear: 2024, budgetType: 'QUARTERLY', status: 'ACTIVE' },
  ];

  const mockBudgetLines: BudgetLine[] = [
    {
      accountId: 'ACT-4100',
      accountName: 'Sales Revenue',
      accountCode: '4100',
      period: '2024-01',
      budgetedAmount: 500000,
      actualAmount: 525000,
      variance: -25000,
      variancePercent: -5,
    },
    {
      accountId: 'ACT-5100',
      accountName: 'Cost of Goods Sold',
      accountCode: '5100',
      period: '2024-01',
      budgetedAmount: 300000,
      actualAmount: 290000,
      variance: 10000,
      variancePercent: 3.33,
    },
    {
      accountId: 'ACT-5200',
      accountName: 'Operating Expenses',
      accountCode: '5200',
      period: '2024-01',
      budgetedAmount: 80000,
      actualAmount: 85000,
      variance: -5000,
      variancePercent: -6.25,
    },
    {
      accountId: 'ACT-5210',
      accountName: 'Salaries & Wages',
      accountCode: '5210',
      period: '2024-01',
      budgetedAmount: 50000,
      actualAmount: 52000,
      variance: -2000,
      variancePercent: -4,
    },
    {
      accountId: 'ACT-5220',
      accountName: 'Rent & Utilities',
      accountCode: '5220',
      period: '2024-01',
      budgetedAmount: 15000,
      actualAmount: 14800,
      variance: 200,
      variancePercent: 1.33,
    },
  ];

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  };

  // Export to CSV
  const exportToCSV = () => {
    if (!selectedBudgetId) return;

    const budget = mockBudgets.find(b => b.budgetId === selectedBudgetId);
    const lines: string[] = [];

    lines.push(`BUDGET VS ACTUAL REPORT - ${budget?.budgetName}`);
    lines.push(`Fiscal Year: ${budget?.fiscalYear}`);
    lines.push('');

    lines.push('Account,Account Code,Budgeted,Actual,Variance,Variance %');
    mockBudgetLines.forEach(line => {
      lines.push(
        `${line.accountName},${line.accountCode},${line.budgetedAmount},` +
        `${line.actualAmount},${line.variance},${line.variancePercent.toFixed(2)}%`
      );
    });

    const csvContent = lines.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `budget-${budget?.budgetName?.toLowerCase().replace(/\s+/g, '-')}.csv`;
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
                <ChartBarIcon className="h-8 w-8 text-emerald-400" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white tracking-tight">Budgeting & Forecasting</h1>
                <p className="mt-2 text-gray-400">
                  Manage budgets and analyze variances
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
              <Button onClick={() => setShowAddBudgetModal(true)} className="flex items-center gap-2">
                <PlusIcon className="h-4 w-4" />
                New Budget
              </Button>
            </div>
          </div>
        </div>

        {/* Budget Selection */}
        <Card variant="glass" className="mb-6">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <label htmlFor="budget-select" className="text-sm text-gray-400 mb-2 block">
                  Select Budget
                </label>
                <select
                  id="budget-select"
                  value={selectedBudgetId}
                  onChange={e => setSelectedBudgetId(e.target.value)}
                  className="w-full px-4 py-2 bg-white/[0.05] border border-white/[0.08] rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                >
                  <option value="">Select a budget...</option>
                  {mockBudgets.map(budget => (
                    <option key={budget.budgetId} value={budget.budgetId}>
                      {budget.budgetName} ({budget.fiscalYear})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Budget vs Actual Report */}
        {selectedBudgetId && !isLoading && (
          <div className="space-y-6">
            {/* Summary Stats */}
            <Card variant="glass">
              <CardContent className="p-6">
                <div className="grid grid-cols-4 gap-6">
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Total Budgeted</p>
                    <p className="text-2xl font-bold text-blue-400">
                      {formatCurrency(mockBudgetLines.reduce((sum, l) => sum + l.budgetedAmount, 0))}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Total Actual</p>
                    <p className="text-2xl font-bold text-purple-400">
                      {formatCurrency(mockBudgetLines.reduce((sum, l) => sum + l.actualAmount, 0))}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Net Variance</p>
                    <p className={`text-2xl font-bold ${
                      mockBudgetLines.reduce((sum, l) => sum + l.variance, 0) >= 0
                        ? 'text-emerald-400'
                        : 'text-rose-400'
                    }`}>
                      {formatCurrency(mockBudgetLines.reduce((sum, l) => sum + l.variance, 0))}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Under/Over Budget</p>
                    <p className={`text-2xl font-bold ${
                      mockBudgetLines.reduce((sum, l) => sum + l.variance, 0) >= 0
                        ? 'text-emerald-400'
                        : 'text-rose-400'
                    }`}>
                      {mockBudgetLines.reduce((sum, l) => sum + l.variance, 0) >= 0 ? 'Under' : 'Over'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Variance Table */}
            <Card variant="glass">
              <CardHeader>
                <CardTitle>Budget vs Actual Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full" role="table">
                    <thead>
                      <tr className="border-b border-gray-700">
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Account</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Account Code</th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-gray-400">Budgeted</th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-gray-400">Actual</th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-gray-400">Variance</th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-gray-400">Variance %</th>
                        <th className="text-center py-3 px-4 text-sm font-medium text-gray-400">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {mockBudgetLines.map((line, index) => (
                        <tr key={index} className="border-b border-gray-800 hover:bg-white/[0.02]">
                          <td className="py-3 px-4 text-sm text-white font-medium">{line.accountName}</td>
                          <td className="py-3 px-4 text-sm font-mono text-gray-400">{line.accountCode}</td>
                          <td className="py-3 px-4 text-sm text-right text-blue-400">
                            {formatCurrency(line.budgetedAmount)}
                          </td>
                          <td className="py-3 px-4 text-sm text-right text-purple-400">
                            {formatCurrency(line.actualAmount)}
                          </td>
                          <td className={`py-3 px-4 text-sm text-right font-medium ${
                            line.variance >= 0 ? 'text-emerald-400' : 'text-rose-400'
                          }`}>
                            {line.variance >= 0 ? '+' : ''}{formatCurrency(line.variance)}
                          </td>
                          <td className={`py-3 px-4 text-sm text-right ${
                            line.variancePercent >= 0 ? 'text-emerald-400' : 'text-rose-400'
                          }`}>
                            {line.variancePercent >= 0 ? '+' : ''}{line.variancePercent.toFixed(2)}%
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center justify-center gap-1">
                              {Math.abs(line.variancePercent) <= 5 ? (
                                <div className="flex items-center gap-1 px-2 py-1 bg-emerald-500/20 rounded-full">
                                  <ArrowTrendingUpIcon className="h-3 w-3 text-emerald-400" />
                                  <span className="text-xs text-emerald-400">On Track</span>
                                </div>
                              ) : Math.abs(line.variancePercent) <= 10 ? (
                                <div className="flex items-center gap-1 px-2 py-1 bg-amber-500/20 rounded-full">
                                  <ArrowTrendingDownIcon className="h-3 w-3 text-amber-400" />
                                  <span className="text-xs text-amber-400">Watch</span>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1 px-2 py-1 bg-rose-500/20 rounded-full">
                                  <ArrowTrendingDownIcon className="h-3 w-3 text-rose-400" />
                                  <span className="text-xs text-rose-400">Alert</span>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {!selectedBudgetId && (
          <Card variant="glass">
            <CardContent className="p-12 text-center">
              <ChartBarIcon className="h-16 w-16 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400">Select a budget to view variance analysis</p>
            </CardContent>
          </Card>
        )}

        {/* Add Budget Modal */}
        {showAddBudgetModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <Card variant="glass" className="w-full max-w-md mx-4">
              <CardHeader>
                <CardTitle>Create New Budget</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <p className="text-gray-400 mb-4">Budget creation form would go here...</p>
                <div className="flex justify-end gap-3">
                  <Button variant="secondary" onClick={() => setShowAddBudgetModal(false)}>
                    Cancel
                  </Button>
                  <Button onClick={() => setShowAddBudgetModal(false)}>Create</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}

export default BudgetingPage;
