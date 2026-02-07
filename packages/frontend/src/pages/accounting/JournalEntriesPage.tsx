/**
 * Journal Entries Page
 *
 * Create and manage journal entries for double-entry bookkeeping.
 * Each entry must balance (debits = credits).
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
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
  Badge,
  FormField,
  Breadcrumb,
} from '@/components/shared';
import {
  ArrowLeftIcon,
  PlusIcon,
  EyeIcon,
  CheckIcon,
  DocumentTextIcon,
  XMarkIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import {
  useJournalEntries,
  useJournalEntry,
  useChartOfAccounts,
  useCreateJournalEntry,
  useApproveJournalEntry,
  usePostJournalEntry,
  useReverseJournalEntry,
} from '@/services/api';
import { JournalEntryStatus, type ChartOfAccounts, type JournalEntry } from '@opsui/shared';

// ============================================================================
// TYPES
// ============================================================================

interface JournalEntryLineInput {
  accountId: string;
  description: string;
  debitAmount: number;
  creditAmount: number;
}

interface JournalEntryFormData {
  entryNumber: string;
  entryDate: string;
  fiscalPeriod: string;
  description: string;
  lines: JournalEntryLineInput[];
  notes?: string;
}

// ============================================================================
// STATUS BADGE COMPONENT
// ============================================================================

function JournalEntryStatusBadge({ status }: { status: JournalEntryStatus }) {
  const statusConfig: Record<JournalEntryStatus, { label: string; variant: any }> = {
    [JournalEntryStatus.DRAFT]: { label: 'Draft', variant: 'default' },
    [JournalEntryStatus.SUBMITTED]: { label: 'Submitted', variant: 'info' },
    [JournalEntryStatus.APPROVED]: { label: 'Approved', variant: 'success' },
    [JournalEntryStatus.POSTED]: { label: 'Posted', variant: 'success' },
    [JournalEntryStatus.REVERSED]: { label: 'Reversed', variant: 'danger' },
  };

  const config = statusConfig[status];
  return <Badge variant={config.variant}>{config.label}</Badge>;
}

// ============================================================================
// JOURNAL ENTRY FORM COMPONENT
// ============================================================================

interface JournalEntryFormProps {
  entry?: JournalEntry;
  onSubmit: (data: any) => void;
  onCancel: () => void;
  accounts: ChartOfAccounts[];
  isLoading?: boolean;
}

function JournalEntryForm({
  entry,
  onSubmit,
  onCancel,
  accounts,
  isLoading,
}: JournalEntryFormProps) {
  const [formData, setFormData] = useState<JournalEntryFormData>({
    entryNumber: entry?.entryNumber || '',
    entryDate: entry?.entryDate
      ? new Date(entry.entryDate).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0],
    fiscalPeriod: entry?.fiscalPeriod || new Date().toISOString().slice(0, 7),
    description: entry?.description || '',
    lines: entry?.lines?.map(l => ({
      accountId: l.accountId,
      description: l.description || '',
      debitAmount: l.debitAmount || 0,
      creditAmount: l.creditAmount || 0,
    })) || [{ accountId: '', description: '', debitAmount: 0, creditAmount: 0 }],
    notes: entry?.notes || '',
  });

  // Calculate totals
  const totalDebits = formData.lines.reduce((sum, line) => sum + (line.debitAmount || 0), 0);
  const totalCredits = formData.lines.reduce((sum, line) => sum + (line.creditAmount || 0), 0);
  const isBalanced = Math.abs(totalDebits - totalCredits) < 0.01 && totalDebits > 0;

  const addLine = () => {
    setFormData({
      ...formData,
      lines: [
        ...formData.lines,
        { accountId: '', description: '', debitAmount: 0, creditAmount: 0 },
      ],
    });
  };

  const removeLine = (index: number) => {
    if (formData.lines.length > 2) {
      setFormData({
        ...formData,
        lines: formData.lines.filter((_, i) => i !== index),
      });
    }
  };

  const updateLine = (index: number, field: keyof JournalEntryLineInput, value: any) => {
    const newLines = [...formData.lines];
    newLines[index] = { ...newLines[index], [field]: value };

    // Auto-fill opposite amount if entering debit or credit
    if (field === 'debitAmount' && value > 0) {
      newLines[index].creditAmount = 0;
    } else if (field === 'creditAmount' && value > 0) {
      newLines[index].debitAmount = 0;
    }

    setFormData({ ...formData, lines: newLines });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      lines: formData.lines.filter(l => l.accountId && (l.debitAmount > 0 || l.creditAmount > 0)),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <FormField label="Entry Number" required>
          <Input
            type="text"
            value={formData.entryNumber}
            onChange={e => setFormData({ ...formData, entryNumber: e.target.value })}
            placeholder="JE-2024-001"
            required
            disabled={!!entry}
          />
        </FormField>

        <FormField label="Entry Date" required>
          <Input
            type="date"
            value={formData.entryDate}
            onChange={e => setFormData({ ...formData, entryDate: e.target.value })}
            required
          />
        </FormField>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <FormField label="Fiscal Period" required>
          <Input
            type="month"
            value={formData.fiscalPeriod}
            onChange={e => setFormData({ ...formData, fiscalPeriod: e.target.value })}
            required
          />
        </FormField>
      </div>

      <FormField label="Description" required>
        <Input
          type="text"
          value={formData.description}
          onChange={e => setFormData({ ...formData, description: e.target.value })}
          placeholder="e.g., Monthly rent payment"
          required
        />
      </FormField>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-gray-300">Entry Lines</label>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={addLine}
            className="flex items-center gap-1"
          >
            <PlusIcon className="h-3 w-3" />
            Add Line
          </Button>
        </div>

        <div className="border border-white/[0.08] rounded-xl overflow-hidden">
          <table className="w-full">
            <thead className="bg-white/[0.03]">
              <tr>
                <th className="text-left py-2 px-3 text-xs font-medium text-gray-400">Account</th>
                <th className="text-left py-2 px-3 text-xs font-medium text-gray-400">
                  Description
                </th>
                <th className="text-right py-2 px-3 text-xs font-medium text-gray-400 w-28">
                  Debit
                </th>
                <th className="text-right py-2 px-3 text-xs font-medium text-gray-400 w-28">
                  Credit
                </th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody>
              {formData.lines.map((line, index) => (
                <tr key={index} className="border-t border-white/[0.05]">
                  <td className="py-2 px-3">
                    <select
                      value={line.accountId}
                      onChange={e => updateLine(index, 'accountId', e.target.value)}
                      className="w-full px-2 py-1.5 bg-white/[0.05] border border-white/[0.08] rounded-lg text-sm text-white focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
                      required
                    >
                      <option value="">Select Account</option>
                      {accounts.map(acc => (
                        <option key={acc.accountId} value={acc.accountId}>
                          {acc.accountCode} - {acc.accountName}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="py-2 px-3">
                    <Input
                      type="text"
                      value={line.description}
                      onChange={e => updateLine(index, 'description', e.target.value)}
                      placeholder="Description"
                      className="text-sm"
                    />
                  </td>
                  <td className="py-2 px-3">
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={line.debitAmount || ''}
                      onChange={e =>
                        updateLine(index, 'debitAmount', parseFloat(e.target.value) || 0)
                      }
                      placeholder="0.00"
                      className="text-right text-sm"
                    />
                  </td>
                  <td className="py-2 px-3">
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={line.creditAmount || ''}
                      onChange={e =>
                        updateLine(index, 'creditAmount', parseFloat(e.target.value) || 0)
                      }
                      placeholder="0.00"
                      className="text-right text-sm"
                    />
                  </td>
                  <td className="py-2 px-3">
                    <button
                      type="button"
                      onClick={() => removeLine(index)}
                      disabled={formData.lines.length <= 2}
                      className="p-1 hover:bg-white/10 rounded transition-colors disabled:opacity-30"
                    >
                      <TrashIcon className="h-4 w-4 text-gray-500" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-white/[0.03] border-t border-white/[0.08]">
              <tr>
                <td colSpan={2} className="py-2 px-3 text-sm font-medium text-gray-400 text-right">
                  Totals:
                </td>
                <td className="py-2 px-3 text-right">
                  <span
                    className={`text-sm font-medium ${totalDebits > 0 ? 'text-blue-400' : 'text-gray-500'}`}
                  >
                    ${totalDebits.toFixed(2)}
                  </span>
                </td>
                <td className="py-2 px-3 text-right">
                  <span
                    className={`text-sm font-medium ${totalCredits > 0 ? 'text-rose-400' : 'text-gray-500'}`}
                  >
                    ${totalCredits.toFixed(2)}
                  </span>
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>

        {!isBalanced && (
          <p className="text-sm text-rose-400 mt-2 flex items-center gap-1">
            <XMarkIcon className="h-4 w-4" />
            Entry must balance (debits = credits)
          </p>
        )}

        {isBalanced && (
          <p className="text-sm text-emerald-400 mt-2 flex items-center gap-1">
            <CheckIcon className="h-4 w-4" />
            Entry is balanced
          </p>
        )}
      </div>

      <FormField label="Notes (optional)">
        <textarea
          value={formData.notes}
          onChange={e => setFormData({ ...formData, notes: e.target.value })}
          placeholder="Additional notes..."
          rows={2}
          className="w-full px-4 py-2 bg-white/[0.05] border border-white/[0.08] rounded-xl text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
        />
      </FormField>

      <div className="flex items-center gap-3 justify-end pt-4 border-t border-white/[0.08]">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={isLoading}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" disabled={isLoading || !isBalanced}>
          {entry ? 'Update' : 'Create'} Entry
        </Button>
      </div>
    </form>
  );
}

// ============================================================================
// VIEW ENTRY MODAL
// ============================================================================

interface ViewEntryModalProps {
  entryId: string;
  onClose: () => void;
  onApprove: () => void;
  onPost: () => void;
  onReverse: () => void;
}

function ViewEntryModal({ entryId, onClose, onApprove, onPost, onReverse }: ViewEntryModalProps) {
  const { data: entry, isLoading } = useJournalEntry(entryId);
  const approveMutation = useApproveJournalEntry();
  const postMutation = usePostJournalEntry();
  const reverseMutation = useReverseJournalEntry();

  const handleApprove = async () => {
    await approveMutation.mutateAsync(entryId);
    onApprove();
  };

  const handlePost = async () => {
    await postMutation.mutateAsync(entryId);
    onPost();
  };

  const handleReverse = async () => {
    const reason = prompt('Enter reason for reversal:');
    if (reason) {
      await reverseMutation.mutateAsync({ entryId, reason });
      onReverse();
    }
  };

  const canApprove =
    entry?.status === JournalEntryStatus.DRAFT || entry?.status === JournalEntryStatus.SUBMITTED;
  const canPost = entry?.status === JournalEntryStatus.APPROVED;
  const canReverse = entry?.status === JournalEntryStatus.POSTED;

  return (
    <Modal isOpen={true} onClose={onClose} title="Journal Entry" size="lg">
      <div className="p-6">
        {isLoading ? (
          <Skeleton variant="rounded" className="h-64" />
        ) : entry ? (
          <div className="space-y-6">
            {/* Header Info */}
            <div className="grid grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-gray-500 mb-1">Entry Number</p>
                <p className="text-sm font-medium text-white">{entry.entryNumber}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Date</p>
                <p className="text-sm text-gray-300">
                  {new Date(entry.entryDate).toLocaleDateString()}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Period</p>
                <p className="text-sm text-gray-300">{entry.fiscalPeriod}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Status</p>
                <JournalEntryStatusBadge status={entry.status} />
              </div>
            </div>

            <div>
              <p className="text-xs text-gray-500 mb-1">Description</p>
              <p className="text-sm text-white">{entry.description}</p>
            </div>

            {/* Lines */}
            <div className="border border-white/[0.08] rounded-xl overflow-hidden">
              <table className="w-full">
                <thead className="bg-white/[0.03]">
                  <tr>
                    <th className="text-left py-2 px-3 text-xs font-medium text-gray-400">
                      Account
                    </th>
                    <th className="text-left py-2 px-3 text-xs font-medium text-gray-400">
                      Description
                    </th>
                    <th className="text-right py-2 px-3 text-xs font-medium text-gray-400 w-28">
                      Debit
                    </th>
                    <th className="text-right py-2 px-3 text-xs font-medium text-gray-400 w-28">
                      Credit
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {entry.lines?.map((line, index) => (
                    <tr key={index} className="border-t border-white/[0.05]">
                      <td className="py-2 px-3 text-sm text-white">{line.accountCode}</td>
                      <td className="py-2 px-3 text-sm text-gray-300">{line.description || '-'}</td>
                      <td className="py-2 px-3 text-sm text-right text-blue-400">
                        {line.debitAmount > 0 ? `$${line.debitAmount.toFixed(2)}` : '-'}
                      </td>
                      <td className="py-2 px-3 text-sm text-right text-rose-400">
                        {line.creditAmount > 0 ? `$${line.creditAmount.toFixed(2)}` : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-white/[0.03] border-t border-white/[0.08]">
                  <tr>
                    <td
                      colSpan={2}
                      className="py-2 px-3 text-sm font-medium text-gray-400 text-right"
                    >
                      Totals:
                    </td>
                    <td className="py-2 px-3 text-sm text-right font-medium text-blue-400">
                      ${entry.totalDebit.toFixed(2)}
                    </td>
                    <td className="py-2 px-3 text-sm text-right font-medium text-rose-400">
                      ${entry.totalCredit.toFixed(2)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {entry.notes && (
              <div>
                <p className="text-xs text-gray-500 mb-1">Notes</p>
                <p className="text-sm text-gray-300">{entry.notes}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-3 justify-end pt-4 border-t border-white/[0.08]">
              <Button variant="secondary" onClick={onClose}>
                Close
              </Button>
              {canReverse && (
                <Button
                  variant="danger"
                  onClick={handleReverse}
                  disabled={reverseMutation.isPending}
                >
                  Reverse Entry
                </Button>
              )}
              {canPost && (
                <Button variant="success" onClick={handlePost} disabled={postMutation.isPending}>
                  Post Entry
                </Button>
              )}
              {canApprove && (
                <Button
                  variant="primary"
                  onClick={handleApprove}
                  disabled={approveMutation.isPending}
                >
                  Approve
                </Button>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </Modal>
  );
}

// ============================================================================
// MAIN PAGE
// ============================================================================

function JournalEntriesPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // State
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [viewEntryId, setViewEntryId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const pageSize = 20;

  // API hooks
  const {
    data: entriesData,
    isLoading,
    refetch,
  } = useJournalEntries({
    status: filterStatus || undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    limit: pageSize,
    offset: currentPage * pageSize,
  });

  const { data: accounts = [] } = useChartOfAccounts();
  const createMutation = useCreateJournalEntry();

  const entries = entriesData?.entries || [];
  const totalEntries = entriesData?.total || 0;
  const totalPages = Math.ceil(totalEntries / pageSize);

  // Format currency
  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  };

  const handleCreateEntry = async (data: any) => {
    await createMutation.mutateAsync(data);
    setShowCreateModal(false);
    refetch();
  };

  const handleViewEntryClose = () => {
    setViewEntryId(null);
    refetch();
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
            <div>
              <h1 className="text-3xl font-bold text-white tracking-tight">Journal Entries</h1>
              <p className="mt-2 text-gray-400">Create and manage double-entry journal entries</p>
            </div>
            <Button
              variant="primary"
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2"
            >
              <PlusIcon className="h-4 w-4" />
              New Entry
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card variant="glass" className="mb-6">
          <CardContent className="p-6">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex-1 min-w-[200px]">
                <label htmlFor="filter-status" className="text-sm text-gray-400 mb-2 block">
                  Status
                </label>
                <select
                  id="filter-status"
                  value={filterStatus}
                  onChange={e => setFilterStatus(e.target.value)}
                  className="w-full px-4 py-2 bg-white/[0.05] border border-white/[0.08] rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                >
                  <option value="">All Statuses</option>
                  <option value={JournalEntryStatus.DRAFT}>Draft</option>
                  <option value={JournalEntryStatus.SUBMITTED}>Submitted</option>
                  <option value={JournalEntryStatus.APPROVED}>Approved</option>
                  <option value={JournalEntryStatus.POSTED}>Posted</option>
                  <option value={JournalEntryStatus.REVERSED}>Reversed</option>
                </select>
              </div>
              <div className="flex-1 min-w-[200px]">
                <label htmlFor="date-from" className="text-sm text-gray-400 mb-2 block">
                  From Date
                </label>
                <Input
                  id="date-from"
                  type="date"
                  value={dateFrom}
                  onChange={e => setDateFrom(e.target.value)}
                />
              </div>
              <div className="flex-1 min-w-[200px]">
                <label htmlFor="date-to" className="text-sm text-gray-400 mb-2 block">
                  To Date
                </label>
                <Input
                  id="date-to"
                  type="date"
                  value={dateTo}
                  onChange={e => setDateTo(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Entries Table */}
        <Card variant="glass">
          <CardHeader>
            <CardTitle>Entries ({totalEntries})</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                <Skeleton variant="rounded" className="h-16" />
                <Skeleton variant="rounded" className="h-16" />
                <Skeleton variant="rounded" className="h-16" />
              </div>
            ) : entries.length === 0 ? (
              <div className="text-center py-12">
                <DocumentTextIcon className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400">No journal entries found</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full" role="table" aria-label="Journal entries">
                    <thead>
                      <tr className="border-b border-gray-700">
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">
                          Entry Number
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">
                          Date
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">
                          Description
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-400 w-28">
                          Period
                        </th>
                        <th className="text-center py-3 px-4 text-sm font-medium text-gray-400 w-28">
                          Status
                        </th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-gray-400 w-28">
                          Total
                        </th>
                        <th className="text-center py-3 px-4 text-sm font-medium text-gray-400 w-24">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {entries.map((entry: JournalEntry) => (
                        <tr
                          key={entry.journalEntryId}
                          className="border-b border-gray-800 hover:bg-white/[0.02]"
                        >
                          <td className="py-3 px-4 text-sm font-medium text-white">
                            {entry.entryNumber}
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-300">
                            {new Date(entry.entryDate).toLocaleDateString()}
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-300">{entry.description}</td>
                          <td className="py-3 px-4 text-sm text-gray-400">{entry.fiscalPeriod}</td>
                          <td className="py-3 px-4 text-center">
                            <JournalEntryStatusBadge status={entry.status} />
                          </td>
                          <td className="py-3 px-4 text-sm text-right text-white font-medium">
                            {formatCurrency(entry.totalDebit)}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <button
                              onClick={() => setViewEntryId(entry.journalEntryId)}
                              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                              title="View Entry"
                            >
                              <EyeIcon className="h-4 w-4 text-gray-400" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-800">
                    <p className="text-sm text-gray-500">
                      Showing {currentPage * pageSize + 1}-
                      {Math.min((currentPage + 1) * pageSize, totalEntries)} of {totalEntries}{' '}
                      entries
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
                        disabled={currentPage === 0}
                      >
                        Previous
                      </Button>
                      <span className="text-sm text-gray-400 px-2">
                        Page {currentPage + 1} of {totalPages}
                      </span>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setCurrentPage(Math.min(totalPages - 1, currentPage + 1))}
                        disabled={currentPage >= totalPages - 1}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Create Entry Modal */}
        <Modal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          title="Create Journal Entry"
          size="lg"
        >
          <JournalEntryForm
            accounts={accounts}
            onSubmit={handleCreateEntry}
            onCancel={() => setShowCreateModal(false)}
            isLoading={createMutation.isPending}
          />
        </Modal>

        {/* View Entry Modal */}
        {viewEntryId && (
          <ViewEntryModal
            entryId={viewEntryId}
            onClose={handleViewEntryClose}
            onApprove={handleViewEntryClose}
            onPost={handleViewEntryClose}
            onReverse={handleViewEntryClose}
          />
        )}
      </main>
    </div>
  );
}

export default JournalEntriesPage;
