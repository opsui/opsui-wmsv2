/**
 * Bank Reconciliation Page
 *
 * Provides tools for reconciling bank accounts with book balances,
 * tracking cleared and outstanding transactions.
 *
 * Design: Ledger Noir Aesthetic
 * - DM Serif Display for elegant headings
 * - IBM Plex Mono for precise financial figures
 * - Staggered entrance animations
 * - Atmospheric depth with subtle glows
 * - Blue accent for bank/financial theme
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
  BuildingOffice2Icon,
  CheckCircleIcon,
  XCircleIcon,
  PlusIcon,
  ChevronDownIcon,
  ScaleIcon,
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
      <label className="absolute -top-2 left-3 text-xs font-medium text-gray-500 dark:text-gray-400 bg-white dark:bg-slate-900 px-2 rounded">
        {label}
      </label>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full px-4 py-3 bg-white dark:bg-slate-800/50 border-2 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none transition-all duration-200 flex items-center justify-between ${
          isOpen
            ? 'border-blue-500 dark:border-blue-400 ring-4 ring-blue-500/20'
            : 'border-gray-300 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-500/50'
        }`}
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
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className="absolute z-20 w-full mt-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl shadow-xl overflow-hidden">
            {options.map((option, index) => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className={`w-full px-4 py-3 text-sm text-left transition-all duration-200 border-b last:border-b-0 border-gray-100 dark:border-slate-700 ${
                  value === option.value
                    ? 'bg-blue-500 text-white font-semibold'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-500/10'
                }`}
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
// TRANSACTION ROW COMPONENT
// ============================================================================

interface TransactionRowProps {
  item: ReconciliationItem;
  index: number;
  onToggle: (itemId: string) => void;
}

function TransactionRow({ item, index, onToggle }: TransactionRowProps) {
  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  };

  return (
    <tr
      className={`group border-b border-gray-200 dark:border-gray-800 hover:bg-gray-100 dark:hover:bg-white/5 cursor-pointer transition-all duration-200 ${
        item.isCleared ? 'opacity-50' : ''
      }`}
      onClick={() => onToggle(item.itemId)}
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <td className="py-4 px-4">
        <div
          className={`w-6 h-6 rounded-full flex items-center justify-center transition-all duration-200 ${
            item.isCleared
              ? 'bg-emerald-100 dark:bg-emerald-500/20'
              : 'bg-gray-200 dark:bg-gray-700 group-hover:bg-blue-100 dark:group-hover:bg-blue-500/20'
          }`}
        >
          {item.isCleared ? (
            <CheckCircleIcon className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          ) : (
            <XCircleIcon className="h-5 w-5 text-gray-400 dark:text-gray-500" />
          )}
        </div>
      </td>
      <td className="py-4 px-4 text-sm text-gray-700 dark:text-gray-300">
        {new Date(item.transactionDate).toLocaleDateString()}
      </td>
      <td className="py-4 px-4 text-sm">
        <span
          className={`px-3 py-1 rounded-lg text-xs font-semibold ${
            item.transactionType === 'DEPOSIT'
              ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400'
              : 'bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-400'
          }`}
        >
          {item.transactionType}
        </span>
      </td>
      <td className="py-4 px-4 text-sm text-gray-900 dark:text-white font-medium">
        {item.description}
      </td>
      <td
        className={`py-4 px-4 text-sm text-right ledger-currency font-bold ${
          item.amount >= 0
            ? 'text-emerald-600 dark:text-emerald-400'
            : 'text-rose-600 dark:text-rose-400'
        }`}
      >
        {formatCurrency(item.amount)}
      </td>
      <td className="py-4 px-4 text-sm text-gray-500 dark:text-gray-400 font-mono">
        {item.referenceNumber || '-'}
      </td>
    </tr>
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
  const [items, setItems] = useState<ReconciliationItem[]>([]);

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

  // Initialize items when account is selected
  useEffect(() => {
    if (selectedAccountId) {
      setItems(mockItems);
    }
  }, [selectedAccountId]);

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
    setTimeout(() => setIsLoading(false), 1000);
  };

  const toggleItemCleared = (itemId: string) => {
    setItems(prevItems =>
      prevItems.map(item =>
        item.itemId === itemId ? { ...item, isCleared: !item.isCleared } : item
      )
    );
  };

  const completeReconciliation = () => {
    alert('Reconciliation completed successfully!');
    navigate('/accounting');
  };

  // Calculate totals
  const clearedTotal = items.filter(i => i.isCleared).reduce((sum, i) => sum + i.amount, 0);
  const outstandingTotal = items.filter(i => !i.isCleared).reduce((sum, i) => sum + i.amount, 0);
  const isBalanced = Math.abs(mockReconciliation.difference) < 0.01;

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
                  <div className="absolute inset-0 bg-blue-500/20 blur-xl rounded-full" />
                  <div className="relative p-3 bg-gradient-to-br from-blue-500/20 to-blue-600/10 rounded-2xl border border-blue-500/20">
                    <BuildingOffice2Icon className="h-7 w-7 text-blue-500 dark:text-blue-400" />
                  </div>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-widest">
                    Financial Reconciliation
                  </p>
                </div>
              </div>

              <h1 className="ledger-title text-4xl sm:text-5xl text-gray-900 dark:text-white">
                Bank Reconciliation
              </h1>

              <p className="text-gray-600 dark:text-gray-400 max-w-xl text-lg leading-relaxed">
                Match bank statement transactions with book records to ensure accuracy
              </p>
            </div>
          </div>

          {/* Decorative line */}
          <div className="mt-8 h-px bg-gradient-to-r from-transparent via-blue-500/30 to-transparent" />
        </header>

        {/* Start Reconciliation Form */}
        <div
          className="accounting-card deco-corner rounded-2xl overflow-hidden mb-8"
          style={{ animationDelay: '100ms' }}
        >
          <div className="bg-gradient-to-r from-blue-100 dark:from-blue-500/10 to-blue-50 dark:to-blue-600/5 px-6 py-5 border-b border-blue-200 dark:border-blue-500/10">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-200 dark:bg-blue-500/20 rounded-xl">
                <PlusIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <h2 className="ledger-title text-xl text-gray-900 dark:text-white">
                Start New Reconciliation
              </h2>
            </div>
          </div>

          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
              <div className="relative group">
                <label
                  htmlFor="statement-date"
                  className="absolute -top-2 left-3 text-xs font-medium text-gray-500 dark:text-gray-400 bg-white dark:bg-slate-900 px-2 rounded"
                >
                  Statement Date
                </label>
                <input
                  id="statement-date"
                  type="date"
                  value={statementDate}
                  onChange={e => setStatementDate(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl text-sm bg-white dark:bg-slate-800/50 border border-gray-300 dark:border-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/30"
                />
              </div>
              <div className="relative group">
                <label
                  htmlFor="statement-balance"
                  className="absolute -top-2 left-3 text-xs font-medium text-gray-500 dark:text-gray-400 bg-white dark:bg-slate-900 px-2 rounded"
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
                  className="w-full px-4 py-3 rounded-xl text-sm bg-white dark:bg-slate-800/50 border border-gray-300 dark:border-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/30"
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end">
              <Button
                variant="primary"
                onClick={startReconciliation}
                className="flex items-center gap-2 px-6 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-xl"
              >
                <PlusIcon className="h-4 w-4" />
                Start Reconciliation
              </Button>
            </div>
          </div>
        </div>

        {/* Reconciliation Content */}
        {selectedAccountId && (
          <div className="space-y-6">
            {/* Balance Comparison */}
            <div className="mb-8 p-6 rounded-2xl bg-white dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700/50">
              <div className="flex flex-col md:flex-row items-center justify-center gap-6 md:gap-12 text-center">
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    Statement Balance
                  </span>
                  <span className="text-3xl font-bold ledger-currency text-blue-600 dark:text-blue-400">
                    <AnimatedNumber value={mockReconciliation.statementBalance} delay={100} />
                  </span>
                </div>
                <div className="hidden md:block w-px h-12 bg-gray-300 dark:bg-gray-700" />
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Book Balance</span>
                  <span className="text-3xl font-bold ledger-currency text-purple-600 dark:text-purple-400">
                    <AnimatedNumber value={mockReconciliation.bookBalance} delay={200} />
                  </span>
                </div>
                <div className="hidden md:block w-px h-12 bg-gray-300 dark:bg-gray-700" />
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Difference</span>
                  <span
                    className={`text-3xl font-bold ledger-currency ${
                      isBalanced
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-rose-600 dark:text-rose-400'
                    }`}
                  >
                    <AnimatedNumber value={Math.abs(mockReconciliation.difference)} delay={300} />
                  </span>
                </div>
              </div>

              {/* Balance Status */}
              <div className="mt-6 flex justify-center">
                <div
                  className={`inline-flex items-center gap-3 px-6 py-3 rounded-full ${
                    isBalanced
                      ? 'bg-emerald-100 dark:bg-emerald-500/10 border border-emerald-300 dark:border-emerald-500/20'
                      : 'bg-amber-100 dark:bg-amber-500/10 border border-amber-300 dark:border-amber-500/20'
                  }`}
                >
                  <ScaleIcon
                    className={`h-5 w-5 ${
                      isBalanced
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-amber-600 dark:text-amber-400'
                    }`}
                  />
                  <span
                    className={`text-sm font-semibold ${
                      isBalanced
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-amber-600 dark:text-amber-400'
                    }`}
                  >
                    {isBalanced ? 'Balanced ✓' : 'Reconciliation In Progress'}
                  </span>
                </div>
              </div>
            </div>

            {/* Reconciliation Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="accounting-card rounded-xl p-5 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20">
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-2">
                  Cleared Items
                </p>
                <p className="text-2xl font-bold ledger-currency text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(clearedTotal)}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {items.filter(i => i.isCleared).length} transactions
                </p>
              </div>
              <div className="accounting-card rounded-xl p-5 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20">
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-2">
                  Outstanding Items
                </p>
                <p className="text-2xl font-bold ledger-currency text-amber-600 dark:text-amber-400">
                  {formatCurrency(outstandingTotal)}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {items.filter(i => !i.isCleared).length} transactions
                </p>
              </div>
              <div className="accounting-card rounded-xl p-5 bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20">
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-2">
                  Net Adjustment
                </p>
                <p
                  className={`text-2xl font-bold ledger-currency ${clearedTotal >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}
                >
                  {formatCurrency(clearedTotal)}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">to book balance</p>
              </div>
            </div>

            {/* Transactions Table */}
            <div
              className="accounting-card deco-corner rounded-2xl overflow-hidden"
              style={{ animationDelay: '300ms' }}
            >
              <div className="bg-gradient-to-r from-slate-100 dark:from-slate-800/50 to-white dark:to-slate-800/30 px-6 py-5 border-b border-gray-200 dark:border-gray-700/50">
                <h2 className="ledger-title text-lg text-gray-900 dark:text-white">
                  Transactions to Clear
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Click on a row to toggle the cleared status
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full" role="table">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="text-left py-4 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-widest">
                        Cleared
                      </th>
                      <th className="text-left py-4 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-widest">
                        Date
                      </th>
                      <th className="text-left py-4 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-widest">
                        Type
                      </th>
                      <th className="text-left py-4 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-widest">
                        Description
                      </th>
                      <th className="text-right py-4 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-widest">
                        Amount
                      </th>
                      <th className="text-left py-4 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-widest">
                        Reference
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, index) => (
                      <TransactionRow
                        key={item.itemId}
                        item={item}
                        index={index}
                        onToggle={toggleItemCleared}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Complete Button */}
            <div className="flex justify-end">
              <Button
                variant="primary"
                onClick={completeReconciliation}
                disabled={!isBalanced}
                className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all duration-200 ${
                  isBalanced
                    ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
                    : 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                }`}
              >
                <CheckCircleIcon className="h-5 w-5" />
                Complete Reconciliation
              </Button>
            </div>

            {/* Decorative footer line */}
            <div className="mt-8 flex items-center justify-center">
              <div className="h-px w-24 bg-gradient-to-r from-transparent to-gray-200 dark:to-gray-700/30" />
              <div
                className={`px-4 w-2 h-2 rounded-full ${
                  isBalanced ? 'bg-emerald-500' : 'bg-amber-500'
                }`}
              />
              <div className="h-px w-24 bg-gradient-to-l from-transparent to-gray-200 dark:to-gray-700/30" />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default BankReconciliationPage;
