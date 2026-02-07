/**
 * Bank Reconciliation Page
 *
 * Provides tools for reconciling bank accounts with book balances,
 * tracking cleared and outstanding transactions.
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
  BuildingOffice2Icon,
  CheckCircleIcon,
  XCircleIcon,
  PlusIcon,
} from '@heroicons/react/24/outline';

// ============================================================================
// TYPES
// ============================================================================

interface ReconciliationItem {
  itemId: string;
  transactionType: string;
  transactionDate: Date;
  description: string;
  amount: number;
  isCleared: boolean;
  referenceNumber?: string;
}

interface BankReconciliation {
  reconciliationId: string;
  bankAccountId: string;
  statementDate: Date;
  statementBalance: number;
  bookBalance: number;
  difference: number;
  status: string;
}

// ============================================================================
// MAIN PAGE
// ============================================================================

function BankReconciliationPage() {
  const navigate = useNavigate();

  // State
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [statementDate, setStatementDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [statementBalance, setStatementBalance] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  // Mock data
  const mockAccounts = [
    { id: 'BA-001', name: 'Primary Checking - Bank of America', balance: 125000 },
    { id: 'BA-002', name: 'Savings - Wells Fargo', balance: 50000 },
  ];

  const mockReconciliation: BankReconciliation = {
    reconciliationId: 'BR-001',
    bankAccountId: 'BA-001',
    statementDate: new Date(),
    statementBalance: 124500,
    bookBalance: 125000,
    difference: 500,
    status: 'IN_PROGRESS',
  };

  const mockItems: ReconciliationItem[] = [
    {
      itemId: '1',
      transactionType: 'DEPOSIT',
      transactionDate: new Date('2025-01-15'),
      description: 'Customer Payment - INV-2025-001',
      amount: 5000,
      isCleared: true,
      referenceNumber: 'CHK-1001',
    },
    {
      itemId: '2',
      transactionType: 'WITHDRAWAL',
      transactionDate: new Date('2025-01-16'),
      description: 'Vendor Payment - Acme Corp',
      amount: -2500,
      isCleared: true,
      referenceNumber: 'ACH-2001',
    },
    {
      itemId: '3',
      transactionType: 'DEPOSIT',
      transactionDate: new Date('2025-01-18'),
      description: 'Customer Payment - INV-2025-005',
      amount: 3500,
      isCleared: false,
      referenceNumber: 'CHK-1002',
    },
    {
      itemId: '4',
      transactionType: 'WITHDRAWAL',
      transactionDate: new Date('2025-01-19'),
      description: 'Bank Service Fee',
      amount: -25,
      isCleared: false,
    },
  ];

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  };

  const startReconciliation = () => {
    if (!selectedAccountId || !statementDate || !statementBalance) {
      alert('Please fill in all fields');
      return;
    }
    setIsLoading(true);
    // Simulate API call
    setTimeout(() => setIsLoading(false), 1000);
  };

  const toggleItemCleared = (itemId: string) => {
    // In real implementation, this would update the state
    console.log('Toggle item:', itemId);
  };

  const completeReconciliation = () => {
    alert('Reconciliation completed successfully!');
    navigate('/accounting');
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
                <BuildingOffice2Icon className="h-8 w-8 text-blue-400" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white tracking-tight">
                  Bank Reconciliation
                </h1>
                <p className="mt-2 text-gray-400">Match bank statements with book records</p>
              </div>
            </div>
          </div>
        </div>

        {/* Start Reconciliation Form */}
        <Card variant="glass" className="mb-6">
          <CardHeader>
            <CardTitle>Start New Reconciliation</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label htmlFor="bank-account" className="text-sm text-gray-400 mb-2 block">
                  Bank Account
                </label>
                <select
                  id="bank-account"
                  value={selectedAccountId}
                  onChange={e => setSelectedAccountId(e.target.value)}
                  className="w-full px-4 py-2 bg-white/[0.05] border border-white/[0.08] rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                >
                  <option value="">Select account...</option>
                  {mockAccounts.map(acc => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="statement-date" className="text-sm text-gray-400 mb-2 block">
                  Statement Date
                </label>
                <input
                  id="statement-date"
                  type="date"
                  value={statementDate}
                  onChange={e => setStatementDate(e.target.value)}
                  className="w-full px-4 py-2 bg-white/[0.05] border border-white/[0.08] rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                />
              </div>
              <div>
                <label htmlFor="statement-balance" className="text-sm text-gray-400 mb-2 block">
                  Statement Balance
                </label>
                <input
                  id="statement-balance"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={statementBalance}
                  onChange={e => setStatementBalance(e.target.value)}
                  className="w-full px-4 py-2 bg-white/[0.05] border border-white/[0.08] rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                />
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <Button onClick={startReconciliation} className="flex items-center gap-2">
                <PlusIcon className="h-4 w-4" />
                Start Reconciliation
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Reconciliation Summary */}
        {selectedAccountId && (
          <div className="space-y-6">
            {/* Balance Comparison */}
            <Card variant="glass">
              <CardHeader>
                <CardTitle>Balance Comparison</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Statement Balance</p>
                    <p className="text-2xl font-bold text-blue-400">
                      {formatCurrency(mockReconciliation.statementBalance)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Book Balance</p>
                    <p className="text-2xl font-bold text-purple-400">
                      {formatCurrency(mockReconciliation.bookBalance)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Difference</p>
                    <p
                      className={`text-2xl font-bold ${
                        Math.abs(mockReconciliation.difference) < 0.01
                          ? 'text-emerald-400'
                          : 'text-rose-400'
                      }`}
                    >
                      {formatCurrency(mockReconciliation.difference)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Status</p>
                    <p
                      className={`text-lg font-bold ${
                        Math.abs(mockReconciliation.difference) < 0.01
                          ? 'text-emerald-400'
                          : 'text-amber-400'
                      }`}
                    >
                      {Math.abs(mockReconciliation.difference) < 0.01 ? 'Balanced' : 'In Progress'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Reconciliation Items */}
            <Card variant="glass">
              <CardHeader>
                <CardTitle>Transactions to Clear</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full" role="table">
                    <thead>
                      <tr className="border-b border-gray-700">
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">
                          Cleared
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">
                          Date
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">
                          Type
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">
                          Description
                        </th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-gray-400">
                          Amount
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">
                          Reference
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {mockItems.map(item => (
                        <tr
                          key={item.itemId}
                          className={`border-b border-gray-800 hover:bg-white/[0.02] cursor-pointer ${
                            item.isCleared ? 'opacity-50' : ''
                          }`}
                          onClick={() => toggleItemCleared(item.itemId)}
                        >
                          <td className="py-3 px-4">
                            {item.isCleared ? (
                              <CheckCircleIcon className="h-5 w-5 text-emerald-400" />
                            ) : (
                              <XCircleIcon className="h-5 w-5 text-gray-600" />
                            )}
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-300">
                            {new Date(item.transactionDate).toLocaleDateString()}
                          </td>
                          <td className="py-3 px-4 text-sm">
                            <span
                              className={`px-2 py-1 rounded text-xs font-medium ${
                                item.transactionType === 'DEPOSIT'
                                  ? 'bg-emerald-500/20 text-emerald-400'
                                  : 'bg-rose-500/20 text-rose-400'
                              }`}
                            >
                              {item.transactionType}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-sm text-white">{item.description}</td>
                          <td
                            className={`py-3 px-4 text-sm text-right font-medium ${
                              item.amount >= 0 ? 'text-emerald-400' : 'text-rose-400'
                            }`}
                          >
                            {formatCurrency(item.amount)}
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-500 font-mono">
                            {item.referenceNumber || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Complete Button */}
            <div className="flex justify-end">
              <Button
                onClick={completeReconciliation}
                disabled={Math.abs(mockReconciliation.difference) >= 0.01}
                className="flex items-center gap-2"
              >
                <CheckCircleIcon className="h-4 w-4" />
                Complete Reconciliation
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default BankReconciliationPage;
