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
} from '@/components/shared';
import {
  ArrowLeftIcon,
  PlusIcon,
  PencilIcon,
  EyeIcon,
  ChevronRightIcon,
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
// HELPER COMPONENTS
// ============================================================================

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
    ASSET: 'from-blue-500/20 to-blue-600/20 border-blue-500/30 text-blue-400',
    LIABILITY: 'from-rose-500/20 to-rose-600/20 border-rose-500/30 text-rose-400',
    EQUITY: 'from-purple-500/20 to-purple-600/20 border-purple-500/30 text-purple-400',
    REVENUE: 'from-emerald-500/20 to-emerald-600/20 border-emerald-500/30 text-emerald-400',
    EXPENSE: 'from-amber-500/20 to-amber-600/20 border-amber-500/30 text-amber-400',
  };

  return (
    <>
      <tr
        className={`border-b border-gray-800 hover:bg-white/[0.02] ${account.isHeader ? 'bg-white/[0.03]' : ''}`}
        style={{ paddingLeft: `${account.level * 16}px` }}
      >
        <td className="py-3 px-4">
          <div className="flex items-center gap-2">
            {hasChildren ? (
              <button
                onClick={() => onToggleExpand(account.accountId)}
                className="p-1 hover:bg-white/10 rounded"
                aria-label={isExpanded ? 'Collapse' : 'Expand'}
              >
                <ChevronRightIcon
                  className={`h-4 w-4 text-gray-500 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                />
              </button>
            ) : (
              <span className="w-6" />
            )}
            <span
              className={`font-mono text-sm ${account.isHeader ? 'font-bold' : ''}`}
              style={{ paddingLeft: `${account.level * 12}px` }}
            >
              {account.accountCode}
            </span>
          </div>
        </td>
        <td className="py-3 px-4">
          <div className="flex items-center gap-2">
            {account.isHeader ? (
              <FolderIcon className="h-4 w-4 text-gray-500" />
            ) : (
              <DocumentTextIcon className="h-4 w-4 text-gray-600" />
            )}
            <span className={`text-sm ${account.isHeader ? 'font-bold' : 'text-gray-300'}`}>
              {account.accountName}
            </span>
            {!account.isActive && (
              <span className="px-2 py-0.5 rounded-full text-xs bg-gray-500/20 text-gray-500">
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
            className={`inline-flex items-center gap-1 text-sm ${account.normalBalance === 'D' ? 'text-blue-400' : 'text-rose-400'}`}
          >
            {account.normalBalance === 'D' ? (
              <ArrowDownIcon className="h-3 w-3" />
            ) : (
              <ArrowUpIcon className="h-3 w-3" />
            )}
            {account.normalBalance === 'D' ? 'Debit' : 'Credit'}
          </span>
        </td>
        <td className="py-3 px-4 text-sm text-gray-500">{account.parentAccountId || '-'}</td>
        <td className="py-3 px-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => onViewBalance(account.accountId)}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              title="View Balance"
            >
              <EyeIcon className="h-4 w-4 text-gray-400" />
            </button>
            <button
              onClick={() => onEdit(account)}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              title="Edit Account"
            >
              <PencilIcon className="h-4 w-4 text-gray-400" />
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

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-sm font-medium text-gray-300 mb-2 block">Account Code *</label>
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
        <label className="text-sm font-medium text-gray-300 mb-2 block">Account Name *</label>
        <Input
          type="text"
          value={formData.accountName}
          onChange={e => setFormData({ ...formData, accountName: e.target.value })}
          placeholder="e.g., Cash"
          required
        />
      </div>

      <div>
        <label className="text-sm font-medium text-gray-300 mb-2 block">Account Type *</label>
        <select
          value={formData.accountType}
          onChange={e => setFormData({ ...formData, accountType: e.target.value as AccountType })}
          required
          disabled={!!account}
          className="w-full px-4 py-2 bg-white/[0.05] border border-white/[0.08] rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
        >
          <option value={AccountType.ASSET}>Asset</option>
          <option value={AccountType.LIABILITY}>Liability</option>
          <option value={AccountType.EQUITY}>Equity</option>
          <option value={AccountType.REVENUE}>Revenue</option>
          <option value={AccountType.EXPENSE}>Expense</option>
        </select>
      </div>

      <div>
        <label className="text-sm font-medium text-gray-300 mb-2 block">
          Parent Account (optional)
        </label>
        <select
          value={formData.parentAccountId}
          onChange={e => setFormData({ ...formData, parentAccountId: e.target.value })}
          className="w-full px-4 py-2 bg-white/[0.05] border border-white/[0.08] rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
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
        <label className="text-sm font-medium text-gray-300 mb-2 block">Normal Balance *</label>
        <select
          value={formData.normalBalance}
          onChange={e =>
            setFormData({ ...formData, normalBalance: e.target.value as NormalBalance })
          }
          required
          className="w-full px-4 py-2 bg-white/[0.05] border border-white/[0.08] rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
        >
          <option value="D">Debit</option>
          <option value="C">Credit</option>
        </select>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="isHeader"
          checked={formData.isHeader}
          onChange={e => setFormData({ ...formData, isHeader: e.target.checked })}
          className="w-4 h-4 rounded border-gray-600 bg-white/5 text-primary-500 focus:ring-primary-500"
        />
        <label htmlFor="isHeader" className="text-sm text-gray-300">
          This is a header account (contains sub-accounts)
        </label>
      </div>

      <div>
        <label className="text-sm font-medium text-gray-300 mb-2 block">Description</label>
        <textarea
          value={formData.description}
          onChange={e => setFormData({ ...formData, description: e.target.value })}
          placeholder="Optional description"
          rows={3}
          className="w-full px-4 py-2 bg-white/[0.05] border border-white/[0.08] rounded-xl text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
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
    new Set(['ACT-1000', 'ACT-2000', 'ACT-3000', 'ACT-4000', 'ACT-5000'])
  );
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showBalanceModal, setShowBalanceModal] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<ChartOfAccounts | undefined>();
  const [selectedAccountForBalance, setSelectedAccountForBalance] = useState<string | undefined>();

  // API hooks
  const {
    data: accounts = [],
    isLoading,
    refetch,
  } = useChartOfAccounts({
    accountType: filterType || undefined,
    isActive: filterActive === 'active' ? true : filterActive === 'inactive' ? false : undefined,
  });

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
  const parentOptions = accounts.filter(a => a.isHeader || !a.parentAccountId);

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
              <h1 className="text-3xl font-bold text-white tracking-tight">Chart of Accounts</h1>
              <p className="mt-2 text-gray-400">Manage your account structure and hierarchy</p>
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
              <div className="flex-1 min-w-[200px]">
                <label htmlFor="filter-type" className="text-sm text-gray-400 mb-2 block">
                  Account Type
                </label>
                <select
                  id="filter-type"
                  value={filterType}
                  onChange={e => setFilterType(e.target.value)}
                  className="w-full px-4 py-2 bg-white/[0.05] border border-white/[0.08] rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                >
                  <option value="">All Types</option>
                  <option value="ASSET">Assets</option>
                  <option value="LIABILITY">Liabilities</option>
                  <option value="EQUITY">Equity</option>
                  <option value="REVENUE">Revenue</option>
                  <option value="EXPENSE">Expenses</option>
                </select>
              </div>
              <div className="flex-1 min-w-[200px]">
                <label htmlFor="filter-status" className="text-sm text-gray-400 mb-2 block">
                  Status
                </label>
                <select
                  id="filter-status"
                  value={filterActive}
                  onChange={e => setFilterActive(e.target.value)}
                  className="w-full px-4 py-2 bg-white/[0.05] border border-white/[0.08] rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                >
                  <option value="all">All</option>
                  <option value="active">Active Only</option>
                  <option value="inactive">Inactive Only</option>
                </select>
              </div>
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
                <FolderIcon className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400">No accounts found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full" role="table" aria-label="Chart of accounts">
                  <thead>
                    <tr className="border-b border-gray-700">
                      <th
                        scope="col"
                        className="text-left py-3 px-4 text-sm font-medium text-gray-400 w-40"
                      >
                        Account Code
                      </th>
                      <th
                        scope="col"
                        className="text-left py-3 px-4 text-sm font-medium text-gray-400"
                      >
                        Account Name
                      </th>
                      <th
                        scope="col"
                        className="text-left py-3 px-4 text-sm font-medium text-gray-400 w-32"
                      >
                        Type
                      </th>
                      <th
                        scope="col"
                        className="text-center py-3 px-4 text-sm font-medium text-gray-400 w-28"
                      >
                        Normal Balance
                      </th>
                      <th
                        scope="col"
                        className="text-left py-3 px-4 text-sm font-medium text-gray-400 w-32"
                      >
                        Parent
                      </th>
                      <th
                        scope="col"
                        className="text-right py-3 px-4 text-sm font-medium text-gray-400 w-24"
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
