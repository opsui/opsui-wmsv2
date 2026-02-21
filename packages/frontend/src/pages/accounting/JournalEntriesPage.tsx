/**
 * Journal Entries Page
 *
 * Create and manage journal entries for double-entry bookkeeping.
 * Each entry must balance (debits = credits).
 *
 * Design: Ledger Noir Aesthetic
 * - Refined, editorial financial command center
 * - DM Serif Display for headings, IBM Plex Mono for numbers
 * - Emerald/gold accent palette
 * - Staggered animations and micro-interactions
 */

import { useState, useEffect, useRef } from 'react';
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
  PlusIcon,
  EyeIcon,
  CheckIcon,
  DocumentTextIcon,
  XMarkIcon,
  TrashIcon,
  ChevronDownIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  CalculatorIcon,
  BookOpenIcon,
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
// ANIMATED COUNTER COMPONENT
// ============================================================================

function AnimatedCounter({
  value,
  duration = 1000,
  prefix = '$',
  decimals = 2,
}: {
  value: number;
  duration?: number;
  prefix?: string;
  decimals?: number;
}) {
  const [displayValue, setDisplayValue] = useState(0);
  const startTime = useRef<number | null>(null);
  const startValue = useRef(0);

  useEffect(() => {
    startValue.current = displayValue;
    startTime.current = null;

    const animate = (currentTime: number) => {
      if (!startTime.current) startTime.current = currentTime;
      const progress = Math.min((currentTime - startTime.current) / duration, 1);

      // Easing function for smooth animation
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      const currentValue = startValue.current + (value - startValue.current) * easeOutQuart;

      setDisplayValue(currentValue);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [value, duration]);

  return (
    <span className="ledger-currency">
      {prefix}
      {displayValue.toFixed(decimals)}
    </span>
  );
}

// ============================================================================
// CUSTOM DROPDOWN COMPONENT - Refined
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
    <div className="relative flex-1 min-w-[200px] group">
      <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wider">
        {label}
      </label>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full px-4 py-3.5 bg-white dark:bg-slate-800/80 border-2 rounded-xl text-sm transition-all duration-300 flex items-center justify-between ${
          isOpen
            ? 'border-emerald-500 dark:border-emerald-400 ring-4 ring-emerald-500/10 shadow-lg shadow-emerald-500/5'
            : 'border-slate-200 dark:border-slate-700 hover:border-emerald-300 dark:hover:border-emerald-600'
        } text-slate-900 dark:text-white focus:outline-none`}
      >
        <span className={value === '' ? 'text-slate-400 dark:text-slate-500' : 'font-medium'}>
          {selectedOption?.label || placeholder || 'Select...'}
        </span>
        <ChevronDownIcon
          className={`h-5 w-5 text-slate-400 transition-transform duration-300 ${isOpen ? 'rotate-180 text-emerald-500' : ''}`}
        />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className="absolute z-20 w-full mt-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl shadow-black/10 overflow-hidden animate-in slide-in-from-top-2 duration-200">
            {options.map((option, index) => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className={`w-full px-4 py-3 text-sm text-left transition-all duration-200 border-b border-slate-100 dark:border-slate-700 last:border-0 ${
                  value === option.value
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-semibold'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 hover:pl-6'
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

// Compact inline dropdown for table cells
interface InlineDropdownProps {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
}

function InlineDropdown({ value, onChange, options, placeholder }: InlineDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const selectedOption = options.find(opt => opt.value === value);

  return (
    <div className="relative w-full">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full px-3 py-2 bg-white dark:bg-slate-800/50 border rounded-lg text-sm transition-all duration-200 flex items-center justify-between ${
          isOpen
            ? 'border-emerald-500 ring-2 ring-emerald-500/20'
            : 'border-slate-300 dark:border-slate-600 hover:border-emerald-400'
        } text-slate-900 dark:text-white focus:outline-none`}
      >
        <span className={`truncate ${value === '' ? 'text-slate-400' : ''}`}>
          {selectedOption?.label || placeholder || 'Select...'}
        </span>
        <ChevronDownIcon
          className={`h-4 w-4 text-slate-400 flex-shrink-0 ml-2 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className="absolute z-20 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg shadow-xl overflow-hidden max-h-48 overflow-y-auto">
            {options.map(option => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className={`w-full px-3 py-2 text-sm text-left transition-all duration-150 ${
                  value === option.value
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-semibold'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/20'
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
// STATUS BADGE COMPONENT - Refined
// ============================================================================

function JournalEntryStatusBadge({ status }: { status: JournalEntryStatus }) {
  const config: Record<JournalEntryStatus, { label: string; className: string }> = {
    [JournalEntryStatus.DRAFT]: {
      label: 'Draft',
      className:
        'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-600',
    },
    [JournalEntryStatus.SUBMITTED]: {
      label: 'Submitted',
      className:
        'bg-sky-50 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400 border-sky-200 dark:border-sky-700',
    },
    [JournalEntryStatus.APPROVED]: {
      label: 'Approved',
      className:
        'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-700',
    },
    [JournalEntryStatus.POSTED]: {
      label: 'Posted',
      className:
        'bg-emerald-100 text-emerald-800 dark:bg-emerald-800/40 dark:text-emerald-300 border-emerald-300 dark:border-emerald-600',
    },
    [JournalEntryStatus.REVERSED]: {
      label: 'Reversed',
      className:
        'bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400 border-rose-200 dark:border-rose-700',
    },
  };

  const { label, className } = config[status];

  return (
    <span className={`px-2.5 py-1 rounded-md text-xs font-semibold border ${className}`}>
      {label}
    </span>
  );
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
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Header Section with Art Deco Accent */}
      <div className="relative pb-4 border-b border-slate-200 dark:border-slate-700">
        <div className="absolute top-0 left-0 w-16 h-1 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full" />
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mt-3 ledger-title">
          {entry ? 'Edit Journal Entry' : 'New Journal Entry'}
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Each entry must balance — debits must equal credits
        </p>
      </div>

      {/* Entry Details Grid */}
      <div className="grid grid-cols-2 gap-6">
        <FormField label="Entry Number" required>
          <Input
            type="text"
            value={formData.entryNumber}
            onChange={e => setFormData({ ...formData, entryNumber: e.target.value })}
            placeholder="JE-2024-001"
            required
            disabled={!!entry}
            className="font-mono"
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

      <div className="grid grid-cols-2 gap-6">
        <FormField label="Fiscal Period" required>
          <Input
            type="month"
            value={formData.fiscalPeriod}
            onChange={e => setFormData({ ...formData, fiscalPeriod: e.target.value })}
            required
            className="font-mono"
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

      {/* Entry Lines Section */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
              <CalculatorIcon className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <label className="text-sm font-semibold text-slate-900 dark:text-white">
              Entry Lines
            </label>
          </div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={addLine}
            className="flex items-center gap-1.5"
          >
            <PlusIcon className="h-3.5 w-3.5" />
            Add Line
          </Button>
        </div>

        {/* Ledger-style Table */}
        <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden bg-white dark:bg-slate-800/50">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700">
                <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Account
                </th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Description
                </th>
                <th className="text-right py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider w-32">
                  Debit
                </th>
                <th className="text-right py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider w-32">
                  Credit
                </th>
                <th className="w-12" />
              </tr>
            </thead>
            <tbody>
              {formData.lines.map((line, index) => (
                <tr
                  key={index}
                  className="border-b border-slate-100 dark:border-slate-700/50 last:border-0 hover:bg-slate-50/50 dark:hover:bg-slate-700/20 transition-colors"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <td className="py-3 px-4">
                    <InlineDropdown
                      value={line.accountId}
                      onChange={val => updateLine(index, 'accountId', val)}
                      placeholder="Select Account"
                      options={[
                        { value: '', label: 'Select Account' },
                        ...accounts.map(acc => ({
                          value: acc.accountId,
                          label: `${acc.accountCode} - ${acc.accountName}`,
                        })),
                      ]}
                    />
                  </td>
                  <td className="py-3 px-4">
                    <Input
                      type="text"
                      value={line.description}
                      onChange={e => updateLine(index, 'description', e.target.value)}
                      placeholder="Description"
                      className="text-sm"
                    />
                  </td>
                  <td className="py-3 px-4">
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
                        $
                      </span>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={line.debitAmount || ''}
                        onChange={e =>
                          updateLine(index, 'debitAmount', parseFloat(e.target.value) || 0)
                        }
                        placeholder="0.00"
                        className="text-right text-sm font-mono pl-6"
                      />
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
                        $
                      </span>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={line.creditAmount || ''}
                        onChange={e =>
                          updateLine(index, 'creditAmount', parseFloat(e.target.value) || 0)
                        }
                        placeholder="0.00"
                        className="text-right text-sm font-mono pl-6"
                      />
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <button
                      type="button"
                      onClick={() => removeLine(index)}
                      disabled={formData.lines.length <= 2}
                      className="p-2 hover:bg-rose-100 dark:hover:bg-rose-900/30 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed group"
                    >
                      <TrashIcon className="h-4 w-4 text-slate-400 group-hover:text-rose-500 transition-colors" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            {/* Totals Footer */}
            <tfoot className="bg-slate-50 dark:bg-slate-800/80 border-t-2 border-slate-200 dark:border-slate-700">
              <tr>
                <td colSpan={2} className="py-3 px-4 text-right">
                  <span className="text-sm font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                    Totals
                  </span>
                </td>
                <td className="py-3 px-4 text-right">
                  <span
                    className={`text-sm font-mono font-semibold ${totalDebits > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}
                  >
                    ${totalDebits.toFixed(2)}
                  </span>
                </td>
                <td className="py-3 px-4 text-right">
                  <span
                    className={`text-sm font-mono font-semibold ${totalCredits > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400'}`}
                  >
                    ${totalCredits.toFixed(2)}
                  </span>
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Balance Indicator */}
        <div className="mt-4 flex items-center gap-3">
          {isBalanced ? (
            <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg">
              <CheckIcon className="h-5 w-5 text-emerald-500" />
              <span className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
                Entry is balanced
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-4 py-2 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-lg">
              <XMarkIcon className="h-5 w-5 text-rose-500" />
              <span className="text-sm font-medium text-rose-700 dark:text-rose-400">
                Entry must balance (difference: ${Math.abs(totalDebits - totalCredits).toFixed(2)})
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Notes */}
      <FormField label="Notes (optional)">
        <textarea
          value={formData.notes}
          onChange={e => setFormData({ ...formData, notes: e.target.value })}
          placeholder="Additional notes..."
          rows={2}
          className="w-full px-4 py-3 bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all"
        />
      </FormField>

      {/* Actions */}
      <div className="flex items-center gap-3 justify-end pt-4 border-t border-slate-200 dark:border-slate-700">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={isLoading}>
          Cancel
        </Button>
        <Button
          type="submit"
          variant="primary"
          disabled={isLoading || !isBalanced}
          className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600"
        >
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
          <div className="space-y-4">
            <Skeleton variant="rounded" className="h-20" />
            <Skeleton variant="rounded" className="h-48" />
          </div>
        ) : entry ? (
          <div className="space-y-6">
            {/* Art Deco Header */}
            <div className="relative pb-4 border-b border-slate-200 dark:border-slate-700">
              <div className="absolute top-0 left-0 w-20 h-1 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full" />
              <div className="flex items-start justify-between mt-3">
                <div>
                  <h3 className="text-xl font-semibold text-slate-900 dark:text-white ledger-title">
                    {entry.entryNumber}
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                    {entry.description}
                  </p>
                </div>
                <JournalEntryStatusBadge status={entry.status} />
              </div>
            </div>

            {/* Entry Meta Grid */}
            <div className="grid grid-cols-3 gap-6">
              <div className="space-y-1">
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Date
                </p>
                <p className="text-sm font-medium text-slate-900 dark:text-white">
                  {new Date(entry.entryDate).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Period
                </p>
                <p className="text-sm font-medium text-slate-900 dark:text-white font-mono">
                  {entry.fiscalPeriod}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Total
                </p>
                <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 font-mono">
                  ${entry.totalDebit.toFixed(2)}
                </p>
              </div>
            </div>

            {/* Lines Table */}
            <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700">
                    <th className="text-left py-2.5 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Account
                    </th>
                    <th className="text-left py-2.5 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Description
                    </th>
                    <th className="text-right py-2.5 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider w-28">
                      Debit
                    </th>
                    <th className="text-right py-2.5 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider w-28">
                      Credit
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {entry.lines?.map((line, index) => (
                    <tr
                      key={index}
                      className="border-b border-slate-100 dark:border-slate-700/50 last:border-0"
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <td className="py-3 px-4">
                        <span className="text-sm font-mono font-medium text-slate-900 dark:text-white">
                          {line.accountCode}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm text-slate-600 dark:text-slate-400">
                        {line.description || '—'}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {line.debitAmount > 0 ? (
                          <span className="text-sm font-mono font-medium text-emerald-600 dark:text-emerald-400">
                            ${line.debitAmount.toFixed(2)}
                          </span>
                        ) : (
                          <span className="text-sm text-slate-300 dark:text-slate-600">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {line.creditAmount > 0 ? (
                          <span className="text-sm font-mono font-medium text-amber-600 dark:text-amber-400">
                            ${line.creditAmount.toFixed(2)}
                          </span>
                        ) : (
                          <span className="text-sm text-slate-300 dark:text-slate-600">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-50 dark:bg-slate-800/80 border-t-2 border-slate-200 dark:border-slate-700">
                  <tr>
                    <td colSpan={2} className="py-2.5 px-4 text-right">
                      <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        Totals
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-right">
                      <span className="text-sm font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                        ${entry.totalDebit.toFixed(2)}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-right">
                      <span className="text-sm font-mono font-semibold text-amber-600 dark:text-amber-400">
                        ${entry.totalCredit.toFixed(2)}
                      </span>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {entry.notes && (
              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4">
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                  Notes
                </p>
                <p className="text-sm text-slate-700 dark:text-slate-300">{entry.notes}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-3 justify-end pt-4 border-t border-slate-200 dark:border-slate-700">
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
                <Button
                  variant="success"
                  onClick={handlePost}
                  disabled={postMutation.isPending}
                  className="bg-gradient-to-r from-emerald-500 to-teal-500"
                >
                  Post Entry
                </Button>
              )}
              {canApprove && (
                <Button
                  variant="primary"
                  onClick={handleApprove}
                  disabled={approveMutation.isPending}
                  className="bg-gradient-to-r from-emerald-500 to-teal-500"
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
  const [isAnimating, setIsAnimating] = useState(true);
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

  // Entrance animation
  useEffect(() => {
    const timer = setTimeout(() => setIsAnimating(false), 100);
    return () => clearTimeout(timer);
  }, []);

  // Sample data for demonstration
  const sampleEntries = [
    {
      journalEntryId: 'JE-001',
      entryNumber: 'JE-2024-0001',
      entryDate: '2024-02-15',
      description: 'Cash sale - Order SO0001',
      fiscalPeriod: 'Feb 2024',
      status: JournalEntryStatus.POSTED,
      totalDebit: 1250.0,
      totalCredit: 1250.0,
      lines: [
        {
          accountId: '1000',
          accountCode: '1000',
          accountName: 'Cash',
          debitAmount: 1250.0,
          creditAmount: 0,
        },
        {
          accountId: '4000',
          accountCode: '4000',
          accountName: 'Sales Revenue',
          debitAmount: 0,
          creditAmount: 1250.0,
        },
      ],
    },
    {
      journalEntryId: 'JE-002',
      entryNumber: 'JE-2024-0002',
      entryDate: '2024-02-14',
      description: 'Inventory purchase - SKU10050',
      fiscalPeriod: 'Feb 2024',
      status: JournalEntryStatus.APPROVED,
      totalDebit: 450.0,
      totalCredit: 450.0,
      lines: [
        {
          accountId: '1500',
          accountCode: '1500',
          accountName: 'Inventory',
          debitAmount: 450.0,
          creditAmount: 0,
        },
        {
          accountId: '2000',
          accountCode: '2000',
          accountName: 'Accounts Payable',
          debitAmount: 0,
          creditAmount: 450.0,
        },
      ],
    },
    {
      journalEntryId: 'JE-003',
      entryNumber: 'JE-2024-0003',
      entryDate: '2024-02-13',
      description: 'Rent payment - February 2024',
      fiscalPeriod: 'Feb 2024',
      status: JournalEntryStatus.POSTED,
      totalDebit: 2800.0,
      totalCredit: 2800.0,
      lines: [
        {
          accountId: '6100',
          accountCode: '6100',
          accountName: 'Rent Expense',
          debitAmount: 2800.0,
          creditAmount: 0,
        },
        {
          accountId: '1000',
          accountCode: '1000',
          accountName: 'Cash',
          debitAmount: 0,
          creditAmount: 2800.0,
        },
      ],
    },
    {
      journalEntryId: 'JE-004',
      entryNumber: 'JE-2024-0004',
      entryDate: '2024-02-12',
      description: 'Customer refund - Order SO0003',
      fiscalPeriod: 'Feb 2024',
      status: JournalEntryStatus.SUBMITTED,
      totalDebit: 185.0,
      totalCredit: 185.0,
      lines: [
        {
          accountId: '4200',
          accountCode: '4200',
          accountName: 'Sales Returns',
          debitAmount: 185.0,
          creditAmount: 0,
        },
        {
          accountId: '1000',
          accountCode: '1000',
          accountName: 'Cash',
          debitAmount: 0,
          creditAmount: 185.0,
        },
      ],
    },
    {
      journalEntryId: 'JE-005',
      entryNumber: 'JE-2024-0005',
      entryDate: '2024-02-11',
      description: 'Payroll expense - Bi-weekly',
      fiscalPeriod: 'Feb 2024',
      status: JournalEntryStatus.DRAFT,
      totalDebit: 5500.0,
      totalCredit: 5500.0,
      lines: [
        {
          accountId: '6200',
          accountCode: '6200',
          accountName: 'Wages Expense',
          debitAmount: 5500.0,
          creditAmount: 0,
        },
        {
          accountId: '2100',
          accountCode: '2100',
          accountName: 'Wages Payable',
          debitAmount: 0,
          creditAmount: 5500.0,
        },
      ],
    },
  ];

  // Use API data or fall back to sample data
  const apiEntries = entriesData?.entries || [];
  const entries = apiEntries.length > 0 ? apiEntries : sampleEntries;
  const totalEntries = entriesData?.total || sampleEntries.length;
  const totalPages = Math.ceil(totalEntries / pageSize);

  // Calculate summary metrics
  const totalDebits = entries.reduce((sum: number, e: JournalEntry) => sum + e.totalDebit, 0);
  const totalCredits = entries.reduce((sum: number, e: JournalEntry) => sum + e.totalCredit, 0);
  const postedCount = entries.filter(
    (e: JournalEntry) => e.status === JournalEntryStatus.POSTED
  ).length;

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
    <div className="min-h-screen relative">
      {/* Atmospheric Background */}
      <div className="accounting-atmosphere" />

      <Header />

      <main className="w-full px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        {/* Breadcrumb Navigation */}
        <Breadcrumb />

        {/* Hero Section - Asymmetric Layout */}
        <div className="mb-8 relative">
          {/* Decorative Element */}
          <div className="absolute -top-4 -left-4 w-32 h-32 bg-gradient-to-br from-emerald-500/10 to-teal-500/5 rounded-full blur-3xl pointer-events-none" />

          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
            {/* Title Area */}
            <div
              className={`transition-all duration-700 ${isAnimating ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'}`}
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                  <BookOpenIcon className="h-5 w-5 text-white" />
                </div>
                <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                  Double-Entry Bookkeeping
                </span>
              </div>
              <h1 className="text-4xl lg:text-5xl font-bold text-slate-900 dark:text-white tracking-tight ledger-title">
                Journal Entries
              </h1>
              <p className="mt-3 text-lg text-slate-600 dark:text-slate-400 max-w-xl">
                Create and manage accounting entries with automatic debit-credit balancing
              </p>
            </div>

            {/* Summary Metrics - Floating Cards */}
            <div
              className={`flex flex-wrap gap-4 transition-all duration-700 delay-150 ${isAnimating ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'}`}
            >
              {/* Total Debits */}
              <div className="px-5 py-4 bg-white dark:bg-slate-800/80 backdrop-blur-xl border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl shadow-slate-900/5 min-w-[160px]">
                <div className="flex items-center gap-2 mb-1">
                  <ArrowTrendingUpIcon className="h-4 w-4 text-emerald-500" />
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Total Debits
                  </span>
                </div>
                <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 ledger-currency">
                  {formatCurrency(totalDebits)}
                </p>
              </div>

              {/* Total Credits */}
              <div className="px-5 py-4 bg-white dark:bg-slate-800/80 backdrop-blur-xl border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl shadow-slate-900/5 min-w-[160px]">
                <div className="flex items-center gap-2 mb-1">
                  <ArrowTrendingDownIcon className="h-4 w-4 text-amber-500" />
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Total Credits
                  </span>
                </div>
                <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 ledger-currency">
                  {formatCurrency(totalCredits)}
                </p>
              </div>

              {/* Posted Count */}
              <div className="px-5 py-4 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-2xl shadow-xl shadow-emerald-500/20 min-w-[120px]">
                <div className="text-xs font-semibold text-emerald-100 uppercase tracking-wider mb-1">
                  Posted
                </div>
                <p className="text-2xl font-bold text-white ledger-currency">{postedCount}</p>
              </div>

              {/* New Entry Button */}
              <Button
                variant="primary"
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-2 h-auto px-6 py-4 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 shadow-lg shadow-emerald-500/20 rounded-2xl"
              >
                <PlusIcon className="h-5 w-5" />
                <span className="font-semibold">New Entry</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Filters Section */}
        <div
          className={`mb-6 transition-all duration-700 delay-300 ${isAnimating ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'}`}
        >
          <div className="bg-white dark:bg-slate-800/60 backdrop-blur-xl border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-xl shadow-slate-900/5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1.5 h-6 bg-gradient-to-b from-emerald-500 to-teal-500 rounded-full" />
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Filter Entries
              </h3>
            </div>
            <div className="flex items-end gap-4 flex-wrap">
              <CustomDropdown
                label="Status"
                value={filterStatus}
                onChange={setFilterStatus}
                placeholder="All Statuses"
                options={[
                  { value: '', label: 'All Statuses' },
                  { value: JournalEntryStatus.DRAFT, label: 'Draft' },
                  { value: JournalEntryStatus.SUBMITTED, label: 'Submitted' },
                  { value: JournalEntryStatus.APPROVED, label: 'Approved' },
                  { value: JournalEntryStatus.POSTED, label: 'Posted' },
                  { value: JournalEntryStatus.REVERSED, label: 'Reversed' },
                ]}
              />
              <div className="flex-1 min-w-[180px]">
                <label
                  htmlFor="date-from"
                  className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wider"
                >
                  From Date
                </label>
                <Input
                  id="date-from"
                  type="date"
                  value={dateFrom}
                  onChange={e => setDateFrom(e.target.value)}
                  className="font-mono"
                />
              </div>
              <div className="flex-1 min-w-[180px]">
                <label
                  htmlFor="date-to"
                  className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wider"
                >
                  To Date
                </label>
                <Input
                  id="date-to"
                  type="date"
                  value={dateTo}
                  onChange={e => setDateTo(e.target.value)}
                  className="font-mono"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Entries Table */}
        <div
          className={`transition-all duration-700 delay-500 ${isAnimating ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'}`}
        >
          <div className="bg-white dark:bg-slate-800/60 backdrop-blur-xl border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl shadow-slate-900/5 overflow-hidden">
            {/* Table Header */}
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-6 bg-gradient-to-b from-emerald-500 to-teal-500 rounded-full" />
                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Entries
                </h3>
                <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 text-xs font-medium rounded-full">
                  {totalEntries}
                </span>
              </div>
            </div>

            {/* Table Content */}
            <div className="p-6">
              {isLoading ? (
                <div className="space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <div
                      key={i}
                      className="h-16 bg-slate-100 dark:bg-slate-700/50 rounded-xl animate-pulse"
                    />
                  ))}
                </div>
              ) : entries.length === 0 ? (
                <div className="text-center py-16">
                  <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-slate-100 dark:bg-slate-700/50 flex items-center justify-center">
                    <DocumentTextIcon className="h-10 w-10 text-slate-400 dark:text-slate-500" />
                  </div>
                  <p className="text-lg font-medium text-slate-600 dark:text-slate-400 mb-1">
                    No journal entries found
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-500">
                    Create your first entry to get started
                  </p>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full" role="table" aria-label="Journal entries">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-slate-700">
                          <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                            Entry #
                          </th>
                          <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                            Date
                          </th>
                          <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                            Description
                          </th>
                          <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider w-28">
                            Period
                          </th>
                          <th className="text-center py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider w-28">
                            Status
                          </th>
                          <th className="text-right py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider w-32">
                            Total
                          </th>
                          <th className="text-center py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider w-20">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {entries.map((entry: JournalEntry, index: number) => (
                          <tr
                            key={entry.journalEntryId}
                            className="border-b border-slate-100 dark:border-slate-700/50 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-all duration-200 group cursor-pointer"
                            onClick={() => setViewEntryId(entry.journalEntryId)}
                            style={{
                              animationDelay: `${index * 50}ms`,
                            }}
                          >
                            <td className="py-4 px-4">
                              <span className="text-sm font-mono font-semibold text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                                {entry.entryNumber}
                              </span>
                            </td>
                            <td className="py-4 px-4">
                              <span className="text-sm text-slate-600 dark:text-slate-300 font-mono">
                                {new Date(entry.entryDate).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric',
                                })}
                              </span>
                            </td>
                            <td className="py-4 px-4">
                              <span className="text-sm text-slate-700 dark:text-slate-300 line-clamp-1">
                                {entry.description}
                              </span>
                            </td>
                            <td className="py-4 px-4">
                              <span className="text-sm text-slate-500 dark:text-slate-400 font-mono">
                                {entry.fiscalPeriod}
                              </span>
                            </td>
                            <td className="py-4 px-4 text-center">
                              <JournalEntryStatusBadge status={entry.status} />
                            </td>
                            <td className="py-4 px-4 text-right">
                              <span className="text-sm font-mono font-semibold text-slate-900 dark:text-white">
                                {formatCurrency(entry.totalDebit)}
                              </span>
                            </td>
                            <td className="py-4 px-4 text-center">
                              <button
                                onClick={e => {
                                  e.stopPropagation();
                                  setViewEntryId(entry.journalEntryId);
                                }}
                                className="p-2 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 rounded-lg transition-colors"
                                title="View Entry"
                              >
                                <EyeIcon className="h-4 w-4 text-slate-400 group-hover:text-emerald-500 transition-colors" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-200 dark:border-slate-700">
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        Showing {currentPage * pageSize + 1}–
                        {Math.min((currentPage + 1) * pageSize, totalEntries)} of {totalEntries}
                      </p>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
                          disabled={currentPage === 0}
                          className="px-4"
                        >
                          Previous
                        </Button>
                        <span className="text-sm text-slate-400 px-3 font-mono">
                          {currentPage + 1} / {totalPages}
                        </span>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => setCurrentPage(Math.min(totalPages - 1, currentPage + 1))}
                          disabled={currentPage >= totalPages - 1}
                          className="px-4"
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

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
