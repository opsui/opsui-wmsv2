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
  Breadcrumb,
} from '@/components/shared';
import {
  ArrowLeftIcon,
  BuildingOffice2Icon,
  CheckCircleIcon,
  XCircleIcon,
  PlusIcon,
  ChevronDownIcon,
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
// CUSTOM DROPDOWN COMPONENT
// ============================================================================

interface CustomDropdownProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
}

function CustomDropdown({ label, value, onChange, options, placeholder }: CustomDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);

  const selectedOption = options.find(opt => opt.value === value);

  return (
    <div className="relative flex-1 min-w-[200px]">
      <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 block">
        {label}
      </label>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full px-4 py-3 bg-gradient-to-r from-white to-gray-50 dark:from-gray-800 dark:to-gray-850 border-2 ${
          isOpen
            ? 'border-emerald-500 dark:border-emerald-400 ring-4 ring-emerald-500/20'
            : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
        } rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none transition-all duration-200 flex items-center justify-between shadow-sm`}
      >
        <span className={value === '' ? 'text-gray-500 dark:text-gray-400' : 'font-medium'}>
          {selectedOption?.label || placeholder || 'Select...'}
        </span>
        <ChevronDownIcon
          className={`h-5 w-5 text-gray-500 dark:text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-10 animate-in fade-in" onClick={() => setIsOpen(false)} />
          <div className="absolute z-20 w-full mt-2 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-600 rounded-xl shadow-xl animate-in slide-in-from-top-2 duration-200 overflow-hidden">
            {options.map((option, index) => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className={`w-full px-4 py-3 text-sm text-left transition-all duration-200 border-b last:border-b-0 border-gray-100 dark:border-gray-700 ${
                  value === option.value
                    ? 'bg-gradient-to-r from-emerald-500 via-teal-500 to-blue-500 text-white font-semibold shadow-md'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gradient-to-r hover:from-emerald-100/80 hover:to-teal-100/80 dark:hover:from-emerald-900/40 dark:hover:to-teal-900/40 hover:pl-2 hover:scale-[1.02]'
                }`}
                style={{ animationDelay: `${index * 25}ms` }}
              >
                {option.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
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
    if (!selectedAccountId) {
      alert('Please select a bank account');
      return;
    }
    if (!statementDate) {
      alert('Please enter a statement date');
      return;
    }
    if (statementBalance === '' || statementBalance === null || statementBalance === undefined) {
      alert('Please enter a statement balance');
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
        {/* Breadcrumb Navigation */}
        <Breadcrumb />

        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-500/20 rounded-xl">
                <BuildingOffice2Icon className="h-8 w-8 text-blue-400" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
                  Bank Reconciliation
                </h1>
                <p className="mt-2 text-gray-600 dark:text-gray-400">
                  Match bank statements with book records
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Start Reconciliation Form */}
        <Card variant="glass" className="mb-6">
          <CardHeader>
            <CardTitle className="text-gray-900 dark:text-white">
              Start New Reconciliation
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <CustomDropdown
                label="Bank Account"
                value={selectedAccountId}
                onChange={setSelectedAccountId}
                placeholder="Select account..."
                options={[
                  { value: '', label: 'Select account...' },
                  ...mockAccounts.map(acc => ({
                    value: acc.id,
                    label: acc.name,
                  })),
                ]}
              />
              <div>
                <label
                  htmlFor="statement-date"
                  className="text-sm text-gray-700 dark:text-gray-400 mb-2 block font-medium"
                >
                  Statement Date
                </label>
                <input
                  id="statement-date"
                  type="date"
                  value={statementDate}
                  onChange={e => setStatementDate(e.target.value)}
                  className="w-full px-4 py-2 bg-white dark:bg-white/[0.05] border border-gray-300 dark:border-white/[0.08] rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                />
              </div>
              <div>
                <label
                  htmlFor="statement-balance"
                  className="text-sm text-gray-700 dark:text-gray-400 mb-2 block font-medium"
                >
                  Statement Balance
                </label>
                <input
                  id="statement-balance"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={statementBalance}
                  onChange={e => setStatementBalance(e.target.value)}
                  className="w-full px-4 py-2 bg-white dark:bg-white/[0.05] border border-gray-300 dark:border-white/[0.08] rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                />
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <Button
                variant="primary"
                onClick={startReconciliation}
                className="flex items-center gap-2"
              >
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
                <CardTitle className="text-gray-900 dark:text-white">Balance Comparison</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                      Statement Balance
                    </p>
                    <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                      {formatCurrency(mockReconciliation.statementBalance)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Book Balance</p>
                    <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                      {formatCurrency(mockReconciliation.bookBalance)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Difference</p>
                    <p
                      className={`text-2xl font-bold ${
                        Math.abs(mockReconciliation.difference) < 0.01
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {formatCurrency(mockReconciliation.difference)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Status</p>
                    <p
                      className={`text-lg font-bold ${
                        Math.abs(mockReconciliation.difference) < 0.01
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-amber-600 dark:text-amber-400'
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
                <CardTitle className="text-gray-900 dark:text-white">
                  Transactions to Clear
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full" role="table">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-gray-700">
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-400">
                          Cleared
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-400">
                          Date
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-400">
                          Type
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-400">
                          Description
                        </th>
                        <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-400">
                          Amount
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-400">
                          Reference
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {mockItems.map(item => (
                        <tr
                          key={item.itemId}
                          className={`border-b border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-white/[0.02] cursor-pointer ${
                            item.isCleared ? 'opacity-50' : ''
                          }`}
                          onClick={() => toggleItemCleared(item.itemId)}
                        >
                          <td className="py-3 px-4">
                            {item.isCleared ? (
                              <CheckCircleIcon className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                            ) : (
                              <XCircleIcon className="h-5 w-5 text-gray-400 dark:text-gray-600" />
                            )}
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-700 dark:text-gray-300">
                            {new Date(item.transactionDate).toLocaleDateString()}
                          </td>
                          <td className="py-3 px-4 text-sm">
                            <span
                              className={`px-2 py-1 rounded text-xs font-medium ${
                                item.transactionType === 'DEPOSIT'
                                  ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-400'
                                  : 'bg-rose-500/20 text-rose-700 dark:text-rose-400'
                              }`}
                            >
                              {item.transactionType}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-900 dark:text-white">
                            {item.description}
                          </td>
                          <td
                            className={`py-3 px-4 text-sm text-right font-medium ${
                              item.amount >= 0
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-rose-600 dark:text-rose-400'
                            }`}
                          >
                            {formatCurrency(item.amount)}
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-500 dark:text-gray-400 font-mono">
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
                variant="primary"
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
