/**
 * Chart of Accounts Page
 *
 * Display and manage the Chart of Accounts (COA) - the hierarchical structure
 * of all accounts used in the double-entry accounting system.
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
  Modal,
  Input,
  Skeleton,
  Breadcrumb,
} from '@/components/shared';
import {
  ArrowLeftIcon,
  PlusIcon,
  PencilIcon,
  EyeIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  FolderIcon,
  DocumentTextIcon,
  ArrowDownIcon,
  ArrowUpIcon,
} from '@heroicons/react/24/outline';
import {
  useChartOfAccounts,
  useAccountBalance,
  useCreateAccount,
  useUpdateAccount,
} from '@/services/api';
import { AccountType, type ChartOfAccounts } from '@opsui/shared';

type NormalBalance = 'D' | 'C';

// ============================================================================
// TYPES
// ============================================================================

interface AccountNode extends ChartOfAccounts {
  children: AccountNode[];
  level: number;
}

// ============================================================================
// SAMPLE DATA
// ============================================================================

const sampleAccounts: ChartOfAccounts[] = [
  // Assets
  {
    accountId: 'ACT-1000',
    accountCode: '1000',
    accountName: 'ASSETS',
    accountType: AccountType.ASSET,
    normalBalance: 'D',
    isHeader: true,
    isActive: true,
    parentAccountId: null,
  },
  {
    accountId: 'ACT-1100',
    accountCode: '1100',
    accountName: 'Current Assets',
    accountType: AccountType.ASSET,
    normalBalance: 'D',
    isHeader: true,
    isActive: true,
    parentAccountId: 'ACT-1000',
  },
  {
    accountId: 'ACT-1110',
    accountCode: '1110',
    accountName: 'Cash',
    accountType: AccountType.ASSET,
    normalBalance: 'D',
    isHeader: false,
    isActive: true,
    parentAccountId: 'ACT-1100',
    description: 'Cash on hand and in banks',
  },
  {
    accountId: 'ACT-1120',
    accountCode: '1120',
    accountName: 'Accounts Receivable',
    accountType: AccountType.ASSET,
    normalBalance: 'D',
    isHeader: false,
    isActive: true,
    parentAccountId: 'ACT-1100',
    description: 'Money owed by customers',
  },
  {
    accountId: 'ACT-1130',
    accountCode: '1130',
    accountName: 'Inventory',
    accountType: AccountType.ASSET,
    normalBalance: 'D',
    isHeader: false,
    isActive: true,
    parentAccountId: 'ACT-1100',
    description: 'Products for sale',
  },
  {
    accountId: 'ACT-1200',
    accountCode: '1200',
    accountName: 'Non-Current Assets',
    accountType: AccountType.ASSET,
    normalBalance: 'D',
    isHeader: true,
    isActive: true,
    parentAccountId: 'ACT-1000',
  },
  {
    accountId: 'ACT-1210',
    accountCode: '1210',
    accountName: 'Equipment',
    accountType: AccountType.ASSET,
    normalBalance: 'D',
    isHeader: false,
    isActive: true,
    parentAccountId: 'ACT-1200',
    description: 'Machinery and equipment',
  },
  {
    accountId: 'ACT-1220',
    accountCode: '1220',
    accountName: 'Accumulated Depreciation',
    accountType: AccountType.ASSET,
    normalBalance: 'C',
    isHeader: false,
    isActive: true,
    parentAccountId: 'ACT-1200',
    description: 'Depreciation on equipment',
  },
  // Liabilities
  {
    accountId: 'ACT-2000',
    accountCode: '2000',
    accountName: 'LIABILITIES',
    accountType: AccountType.LIABILITY,
    normalBalance: 'C',
    isHeader: true,
    isActive: true,
    parentAccountId: null,
  },
  {
    accountId: 'ACT-2100',
    accountCode: '2100',
    accountName: 'Current Liabilities',
    accountType: AccountType.LIABILITY,
    normalBalance: 'C',
    isHeader: true,
    isActive: true,
    parentAccountId: 'ACT-2000',
  },
  {
    accountId: 'ACT-2110',
    accountCode: '2110',
    accountName: 'Accounts Payable',
    accountType: AccountType.LIABILITY,
    normalBalance: 'C',
    isHeader: false,
    isActive: true,
    parentAccountId: 'ACT-2100',
    description: 'Money owed to suppliers',
  },
  {
    accountId: 'ACT-2120',
    accountCode: '2120',
    accountName: 'Accrued Expenses',
    accountType: AccountType.LIABILITY,
    normalBalance: 'C',
    isHeader: false,
    isActive: true,
    parentAccountId: 'ACT-2100',
    description: 'Expenses incurred but not yet paid',
  },
  {
    accountId: 'ACT-2200',
    accountCode: '2200',
    accountName: 'Non-Current Liabilities',
    accountType: AccountType.LIABILITY,
    normalBalance: 'C',
    isHeader: true,
    isActive: true,
    parentAccountId: 'ACT-2000',
  },
  {
    accountId: 'ACT-2210',
    accountCode: '2210',
    accountName: 'Long-Term Debt',
    accountType: AccountType.LIABILITY,
    normalBalance: 'C',
    isHeader: false,
    isActive: true,
    parentAccountId: 'ACT-2200',
    description: 'Loans and long-term obligations',
  },
  // Equity
  {
    accountId: 'ACT-3000',
    accountCode: '3000',
    accountName: 'EQUITY',
    accountType: AccountType.EQUITY,
    normalBalance: 'C',
    isHeader: true,
    isActive: true,
    parentAccountId: null,
  },
  {
    accountId: 'ACT-3100',
    accountCode: '3100',
    accountName: "Owner's Equity",
    accountType: AccountType.EQUITY,
    normalBalance: 'C',
    isHeader: false,
    isActive: true,
    parentAccountId: 'ACT-3000',
    description: "Owner's investment in the business",
  },
  {
    accountId: 'ACT-3200',
    accountCode: '3200',
    accountName: 'Retained Earnings',
    accountType: AccountType.EQUITY,
    normalBalance: 'C',
    isHeader: false,
    isActive: true,
    parentAccountId: 'ACT-3000',
    description: 'Accumulated profits',
  },
  // Revenue
  {
    accountId: 'ACT-4000',
    accountCode: '4000',
    accountName: 'REVENUE',
    accountType: AccountType.REVENUE,
    normalBalance: 'C',
    isHeader: true,
    isActive: true,
    parentAccountId: null,
  },
  {
    accountId: 'ACT-4100',
    accountCode: '4100',
    accountName: 'Sales Revenue',
    accountType: AccountType.REVENUE,
    normalBalance: 'C',
    isHeader: false,
    isActive: true,
    parentAccountId: 'ACT-4000',
    description: 'Income from sales',
  },
  {
    accountId: 'ACT-4200',
    accountCode: '4200',
    accountName: 'Service Revenue',
    accountType: AccountType.REVENUE,
    normalBalance: 'C',
    isHeader: false,
    isActive: true,
    parentAccountId: 'ACT-4000',
    description: 'Income from services',
  },
  // Expenses
  {
    accountId: 'ACT-5000',
    accountCode: '5000',
    accountName: 'EXPENSES',
    accountType: AccountType.EXPENSE,
    normalBalance: 'D',
    isHeader: true,
    isActive: true,
    parentAccountId: null,
  },
  {
    accountId: 'ACT-5100',
    accountCode: '5100',
    accountName: 'Cost of Goods Sold',
    accountType: AccountType.EXPENSE,
    normalBalance: 'D',
    isHeader: false,
    isActive: true,
    parentAccountId: 'ACT-5000',
    description: 'Direct costs of goods sold',
  },
  {
    accountId: 'ACT-5200',
    accountCode: '5200',
    accountName: 'Operating Expenses',
    accountType: AccountType.EXPENSE,
    normalBalance: 'D',
    isHeader: true,
    isActive: true,
    parentAccountId: 'ACT-5000',
  },
  {
    accountId: 'ACT-5210',
    accountCode: '5210',
    accountName: 'Rent Expense',
    accountType: AccountType.EXPENSE,
    normalBalance: 'D',
    isHeader: false,
    isActive: true,
    parentAccountId: 'ACT-5200',
    description: 'Rent for facilities',
  },
  {
    accountId: 'ACT-5220',
    accountCode: '5220',
    accountName: 'Utilities Expense',
    accountType: AccountType.EXPENSE,
    normalBalance: 'D',
    isHeader: false,
    isActive: true,
    parentAccountId: 'ACT-5200',
    description: 'Electricity, water, gas',
  },
  {
    accountId: 'ACT-5230',
    accountCode: '5230',
    accountName: 'Salaries Expense',
    accountType: AccountType.EXPENSE,
    normalBalance: 'D',
    isHeader: false,
    isActive: true,
    parentAccountId: 'ACT-5200',
    description: 'Employee salaries and wages',
  },
];

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

// Custom Dropdown Component
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

interface AccountRowProps {
  account: AccountNode;
  onEdit: (account: ChartOfAccounts) => void;
  onViewBalance: (accountId: string) => void;
  expandedNodes: Set<string>;
  onToggleExpand: (accountId: string) => void;
}

function AccountRow({
  account,
  onEdit,
  onViewBalance,
  expandedNodes,
  onToggleExpand,
}: AccountRowProps) {
  const hasChildren = account.children.length > 0;
  const isExpanded = expandedNodes.has(account.accountId);
  const accountTypeColors: Record<string, string> = {
    ASSET: 'from-blue-500/20 to-blue-600/20 border-blue-500/30 text-blue-600 dark:text-blue-400',
    LIABILITY:
      'from-rose-500/20 to-rose-600/20 border-rose-500/30 text-rose-600 dark:text-rose-400',
    EQUITY:
      'from-purple-500/20 to-purple-600/20 border-purple-500/30 text-purple-600 dark:text-purple-400',
    REVENUE:
      'from-emerald-500/20 to-emerald-600/20 border-emerald-500/30 text-emerald-600 dark:text-emerald-400',
    EXPENSE:
      'from-amber-500/20 to-amber-600/20 border-amber-500/30 text-amber-600 dark:text-amber-400',
  };

  return (
    <>
      <tr
        className={`border-b border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-white/[0.02] ${account.isHeader ? 'bg-gray-50 dark:bg-white/[0.03]' : ''}`}
        style={{ paddingLeft: `${account.level * 16}px` }}
      >
        <td className="py-3 px-4">
          <div className="flex items-center gap-2">
            {hasChildren ? (
              <button
                onClick={() => onToggleExpand(account.accountId)}
                className="p-1 hover:bg-gray-200 dark:hover:bg-white/10 rounded"
                aria-label={isExpanded ? 'Collapse' : 'Expand'}
              >
                <ChevronRightIcon
                  className={`h-4 w-4 text-gray-500 dark:text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                />
              </button>
            ) : (
              <span className="w-6" />
            )}
            <span
              className={`font-mono text-sm ${account.isHeader ? 'font-bold text-gray-900 dark:text-white' : 'text-gray-800 dark:text-gray-200'}`}
              style={{ paddingLeft: `${account.level * 12}px` }}
            >
              {account.accountCode}
            </span>
          </div>
        </td>
        <td className="py-3 px-4">
          <div className="flex items-center gap-2">
            {account.isHeader ? (
              <FolderIcon className="h-4 w-4 text-gray-500 dark:text-gray-400" />
            ) : (
              <DocumentTextIcon className="h-4 w-4 text-gray-400 dark:text-gray-500" />
            )}
            <span
              className={`text-sm ${account.isHeader ? 'font-bold text-gray-900 dark:text-white' : 'text-gray-800 dark:text-gray-100'}`}
            >
              {account.accountName}
            </span>
            {!account.isActive && (
              <span className="px-2 py-0.5 rounded-full text-xs bg-gray-200 dark:bg-gray-500/20 text-gray-600 dark:text-gray-400">
                Inactive
              </span>
            )}
          </div>
        </td>
        <td className="py-3 px-4">
          <span
            className={`px-2 py-1 rounded-full text-xs font-medium bg-gradient-to-r ${accountTypeColors[account.accountType]}`}
          >
            {account.accountType}
          </span>
        </td>
        <td className="py-3 px-4 text-center">
          <span
            className={`inline-flex items-center gap-1 text-sm ${account.normalBalance === 'D' ? 'text-blue-600 dark:text-blue-400' : 'text-rose-600 dark:text-rose-400'}`}
          >
            {account.normalBalance === 'D' ? (
              <ArrowDownIcon className="h-3 w-3" />
            ) : (
              <ArrowUpIcon className="h-3 w-3" />
            )}
            {account.normalBalance === 'D' ? 'Debit' : 'Credit'}
          </span>
        </td>
        <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-300">
          {account.parentAccountId || '-'}
        </td>
        <td className="py-3 px-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => onViewBalance(account.accountId)}
              className="p-2 hover:bg-gray-200 dark:hover:bg-white/10 rounded-lg transition-colors"
              title="View Balance"
            >
              <EyeIcon className="h-4 w-4 text-gray-500 dark:text-gray-400" />
            </button>
            <button
              onClick={() => onEdit(account)}
              className="p-2 hover:bg-gray-200 dark:hover:bg-white/10 rounded-lg transition-colors"
              title="Edit Account"
            >
              <PencilIcon className="h-4 w-4 text-gray-500 dark:text-gray-400" />
            </button>
          </div>
        </td>
      </tr>
      {isExpanded &&
        account.children.map(child => (
          <AccountRow
            key={child.accountId}
            account={child}
            onEdit={onEdit}
            onViewBalance={onViewBalance}
            expandedNodes={expandedNodes}
            onToggleExpand={onToggleExpand}
          />
        ))}
    </>
  );
}

interface AccountFormProps {
  account?: ChartOfAccounts;
  onSubmit: (data: any) => void;
  onCancel: () => void;
  parentOptions: ChartOfAccounts[];
  isLoading?: boolean;
}

function AccountForm({ account, onSubmit, onCancel, parentOptions, isLoading }: AccountFormProps) {
  const [formData, setFormData] = useState({
    accountCode: account?.accountCode || '',
    accountName: account?.accountName || '',
    accountType: account?.accountType || AccountType.ASSET,
    parentAccountId: account?.parentAccountId || '',
    normalBalance: account?.normalBalance || ('D' as NormalBalance),
    isHeader: account?.isHeader || false,
    description: account?.description || '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const accountTypeOptions = [
    { value: AccountType.ASSET, label: 'Asset' },
    { value: AccountType.LIABILITY, label: 'Liability' },
    { value: AccountType.EQUITY, label: 'Equity' },
    { value: AccountType.REVENUE, label: 'Revenue' },
    { value: AccountType.EXPENSE, label: 'Expense' },
  ];

  const normalBalanceOptions = [
    { value: 'D', label: 'Debit' },
    { value: 'C', label: 'Credit' },
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
          Account Code *
        </label>
        <Input
          type="text"
          value={formData.accountCode}
          onChange={e => setFormData({ ...formData, accountCode: e.target.value })}
          placeholder="e.g., 1110"
          required
          disabled={!!account}
        />
      </div>

      <div>
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
          Account Name *
        </label>
        <Input
          type="text"
          value={formData.accountName}
          onChange={e => setFormData({ ...formData, accountName: e.target.value })}
          placeholder="e.g., Cash"
          required
        />
      </div>

      <div>
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
          Account Type *
        </label>
        <select
          value={formData.accountType}
          onChange={e => setFormData({ ...formData, accountType: e.target.value as AccountType })}
          required
          disabled={!!account}
          className="w-full px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
        >
          {accountTypeOptions.map(opt => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
          Parent Account (optional)
        </label>
        <select
          value={formData.parentAccountId}
          onChange={e => setFormData({ ...formData, parentAccountId: e.target.value })}
          className="w-full px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
        >
          <option value="">No Parent</option>
          {parentOptions
            .filter((a: ChartOfAccounts) => a.accountId !== account?.accountId)
            .map((opt: ChartOfAccounts) => (
              <option key={opt.accountId} value={opt.accountId}>
                {opt.accountCode} - {opt.accountName}
              </option>
            ))}
        </select>
      </div>

      <div>
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
          Normal Balance *
        </label>
        <select
          value={formData.normalBalance}
          onChange={e =>
            setFormData({ ...formData, normalBalance: e.target.value as NormalBalance })
          }
          required
          className="w-full px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
        >
          {normalBalanceOptions.map(opt => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="isHeader"
          checked={formData.isHeader}
          onChange={e => setFormData({ ...formData, isHeader: e.target.checked })}
          className="w-4 h-4 rounded border-gray-400 dark:border-gray-600 bg-gray-100 dark:bg-white/5 text-primary-500 dark:text-primary-400 focus:ring-primary-500"
        />
        <label htmlFor="isHeader" className="text-sm text-gray-700 dark:text-gray-300">
          This is a header account (contains sub-accounts)
        </label>
      </div>

      <div>
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
          Description
        </label>
        <textarea
          value={formData.description}
          onChange={e => setFormData({ ...formData, description: e.target.value })}
          placeholder="Optional description"
          rows={3}
          className="w-full px-4 py-2 bg-gray-100 dark:bg-white/[0.05] border border-gray-300 dark:border-white/[0.08] rounded-xl text-sm text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
        />
      </div>

      <div className="flex items-center gap-3 justify-end pt-4">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={isLoading}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" disabled={isLoading}>
          {account ? 'Update' : 'Create'} Account
        </Button>
      </div>
    </form>
  );
}

// ============================================================================
// MAIN PAGE
// ============================================================================

function ChartOfAccountsPage() {
  const navigate = useNavigate();

  // State
  const [filterType, setFilterType] = useState<string>('');
  const [filterActive, setFilterActive] = useState<string>('all');
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(
    new Set([
      'ACT-1000',
      'ACT-1100',
      'ACT-1200',
      'ACT-2000',
      'ACT-2100',
      'ACT-2200',
      'ACT-3000',
      'ACT-4000',
      'ACT-5000',
      'ACT-5200',
    ])
  );
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showBalanceModal, setShowBalanceModal] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<ChartOfAccounts | undefined>();
  const [selectedAccountForBalance, setSelectedAccountForBalance] = useState<string | undefined>();

  // API hooks
  const {
    data: apiAccounts = [],
    isLoading,
    refetch,
  } = useChartOfAccounts({
    accountType: filterType || undefined,
    isActive: filterActive === 'active' ? true : filterActive === 'inactive' ? false : undefined,
  });

  // Use sample data if API returns nothing
  const accounts = apiAccounts.length > 0 ? apiAccounts : sampleAccounts;

  const { data: balanceData } = useAccountBalance(
    selectedAccountForBalance || '',
    undefined,
    !!selectedAccountForBalance
  );

  const createMutation = useCreateAccount();
  const updateMutation = useUpdateAccount();

  // Build tree structure
  const buildAccountTree = (flatAccounts: ChartOfAccounts[]): AccountNode[] => {
    const accountMap = new Map<string, AccountNode>();
    const rootAccounts: AccountNode[] = [];

    // First pass: create nodes
    flatAccounts.forEach(account => {
      accountMap.set(account.accountId, { ...account, children: [], level: 0 });
    });

    // Second pass: build hierarchy
    flatAccounts.forEach(account => {
      const node = accountMap.get(account.accountId)!;
      if (account.parentAccountId && accountMap.has(account.parentAccountId)) {
        const parent = accountMap.get(account.parentAccountId)!;
        parent.children.push(node);
        node.level = parent.level + 1;
      } else {
        rootAccounts.push(node);
      }
    });

    // Sort by code within each level
    const sortTree = (nodes: AccountNode[]) => {
      nodes.sort((a, b) => a.accountCode.localeCompare(b.accountCode));
      nodes.forEach(node => sortTree(node.children));
    };
    sortTree(rootAccounts);

    return rootAccounts;
  };

  const accountTree = buildAccountTree(accounts);

  // Format currency
  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  };

  // Handlers
  const handleToggleExpand = (accountId: string) => {
    setExpandedNodes(prev => {
      const next = new Set(prev);
      if (next.has(accountId)) {
        next.delete(accountId);
      } else {
        next.add(accountId);
      }
      return next;
    });
  };

  const handleCreateAccount = async (data: any) => {
    await createMutation.mutateAsync(data);
    setShowCreateModal(false);
    refetch();
  };

  const handleEditAccount = async (data: any) => {
    if (selectedAccount) {
      await updateMutation.mutateAsync({ accountId: selectedAccount.accountId, data });
      setShowEditModal(false);
      setSelectedAccount(undefined);
      refetch();
    }
  };

  const handleEditClick = (account: ChartOfAccounts) => {
    setSelectedAccount(account);
    setShowEditModal(true);
  };

  const handleViewBalance = (accountId: string) => {
    setSelectedAccountForBalance(accountId);
    setShowBalanceModal(true);
  };

  // Get parent options (only header accounts)
  const parentOptions = (accounts.length > 0 ? accounts : sampleAccounts).filter(
    a => a.isHeader || !a.parentAccountId
  );

  return (
    <div className="min-h-screen">
      <Header />

      <main className="w-full px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb Navigation */}
        <Breadcrumb />

        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
                Chart of Accounts
              </h1>
              <p className="mt-2 text-gray-600 dark:text-gray-400">
                Manage your account structure and hierarchy
              </p>
            </div>
            <Button
              variant="primary"
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2"
            >
              <PlusIcon className="h-4 w-4" />
              New Account
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card variant="glass" className="mb-6">
          <CardContent className="p-6">
            <div className="flex items-center gap-4 flex-wrap">
              <CustomDropdown
                label="Account Type"
                value={filterType}
                onChange={setFilterType}
                placeholder="All Types"
                options={[
                  { value: '', label: 'All Types' },
                  { value: 'ASSET', label: 'Assets' },
                  { value: 'LIABILITY', label: 'Liabilities' },
                  { value: 'EQUITY', label: 'Equity' },
                  { value: 'REVENUE', label: 'Revenue' },
                  { value: 'EXPENSE', label: 'Expenses' },
                ]}
              />
              <CustomDropdown
                label="Status"
                value={filterActive}
                onChange={setFilterActive}
                placeholder="All"
                options={[
                  { value: 'all', label: 'All' },
                  { value: 'active', label: 'Active Only' },
                  { value: 'inactive', label: 'Inactive Only' },
                ]}
              />
            </div>
          </CardContent>
        </Card>

        {/* Accounts Table */}
        <Card variant="glass">
          <CardHeader>
            <CardTitle>Accounts ({accounts.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                <Skeleton variant="rounded" className="h-12" />
                <Skeleton variant="rounded" className="h-12" />
                <Skeleton variant="rounded" className="h-12" />
              </div>
            ) : accounts.length === 0 ? (
              <div className="text-center py-12">
                <FolderIcon className="h-16 w-16 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400">No accounts found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full" role="table" aria-label="Chart of accounts">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th
                        scope="col"
                        className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300 w-40"
                      >
                        Account Code
                      </th>
                      <th
                        scope="col"
                        className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300"
                      >
                        Account Name
                      </th>
                      <th
                        scope="col"
                        className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300 w-32"
                      >
                        Type
                      </th>
                      <th
                        scope="col"
                        className="text-center py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300 w-28"
                      >
                        Normal Balance
                      </th>
                      <th
                        scope="col"
                        className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300 w-32"
                      >
                        Parent
                      </th>
                      <th
                        scope="col"
                        className="text-right py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300 w-24"
                      >
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {accountTree.map(account => (
                      <AccountRow
                        key={account.accountId}
                        account={account}
                        onEdit={handleEditClick}
                        onViewBalance={handleViewBalance}
                        expandedNodes={expandedNodes}
                        onToggleExpand={handleToggleExpand}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Create Account Modal */}
        <Modal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          title="Create New Account"
          size="md"
        >
          <AccountForm
            parentOptions={parentOptions}
            onSubmit={handleCreateAccount}
            onCancel={() => setShowCreateModal(false)}
            isLoading={createMutation.isPending}
          />
        </Modal>

        {/* Edit Account Modal */}
        <Modal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setSelectedAccount(undefined);
          }}
          title="Edit Account"
          size="md"
        >
          <AccountForm
            account={selectedAccount}
            parentOptions={parentOptions}
            onSubmit={handleEditAccount}
            onCancel={() => {
              setShowEditModal(false);
              setSelectedAccount(undefined);
            }}
            isLoading={updateMutation.isPending}
          />
        </Modal>

        {/* Account Balance Modal */}
        <Modal
          isOpen={showBalanceModal}
          onClose={() => {
            setShowBalanceModal(false);
            setSelectedAccountForBalance(undefined);
          }}
          title="Account Balance"
          size="sm"
        >
          <div className="p-6">
            {balanceData ? (
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-400 mb-1">Account</p>
                  <p className="text-lg font-medium text-white">
                    {accounts.find(a => a.accountId === selectedAccountForBalance)?.accountName}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-400 mb-1">Current Balance</p>
                  <p className="text-3xl font-bold text-emerald-400">
                    {formatCurrency(balanceData.currentBalance)}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Total Debits</p>
                    <p className="text-lg text-blue-400">
                      {formatCurrency(balanceData.totalDebits)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Total Credits</p>
                    <p className="text-lg text-rose-400">
                      {formatCurrency(balanceData.totalCredits)}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <Skeleton variant="rounded" className="h-48" />
            )}
          </div>
        </Modal>
      </main>
    </div>
  );
}

export default ChartOfAccountsPage;
