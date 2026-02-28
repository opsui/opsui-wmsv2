/**
 * Lead Detail Modal
 *
 * Modal for viewing lead details and converting leads to customers.
 */

import { Modal, Button, useToast } from '@/components/shared';
import { useLead, useConvertLeadToCustomer } from '@/services/api';
import {
  UserIcon,
  BuildingOfficeIcon,
  EnvelopeIcon,
  PhoneIcon,
  CurrencyDollarIcon,
  TagIcon,
} from '@heroicons/react/24/outline';

// ============================================================================
// TYPES
// ============================================================================

interface LeadDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  leadId: string;
}

const STATUS_STYLES: Record<string, string> = {
  NEW: 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
  CONTACTED: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30',
  QUALIFIED: 'bg-green-500/20 text-green-400 border border-green-500/30',
  PROPOSAL: 'bg-purple-500/20 text-purple-400 border border-purple-500/30',
  NEGOTIATION: 'bg-orange-500/20 text-orange-400 border border-orange-500/30',
  WON: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
  LOST: 'bg-rose-500/20 text-rose-400 border border-rose-500/30',
};

const PRIORITY_STYLES: Record<string, string> = {
  LOW: 'bg-slate-500/20 text-slate-400 border border-slate-500/30',
  MEDIUM: 'bg-amber-500/20 text-amber-400 border border-amber-500/30',
  HIGH: 'bg-orange-500/20 text-orange-400 border border-orange-500/30',
  URGENT: 'bg-rose-500/20 text-rose-400 border border-rose-500/30',
};

// ============================================================================
// COMPONENT
// ============================================================================

export function LeadDetailModal({ isOpen, onClose, onSuccess, leadId }: LeadDetailModalProps) {
  const { showToast } = useToast();
  const { data: lead, isLoading } = useLead(leadId, isOpen);
  const convertMutation = useConvertLeadToCustomer();

  const handleConvert = async () => {
    try {
      await convertMutation.mutateAsync(leadId);
      showToast('Lead converted to customer successfully!', 'success');
      onSuccess?.();
      onClose();
    } catch (error: any) {
      showToast(error?.message || 'Failed to convert lead', 'error');
    }
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Lead Details"
      size="lg"
      footer={
        <div className="flex items-center justify-between">
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
          {lead && lead.status !== 'WON' && lead.status !== 'LOST' && (
            <Button
              variant="primary"
              onClick={handleConvert}
              disabled={convertMutation.isPending}
            >
              {convertMutation.isPending ? 'Converting...' : 'Convert to Customer'}
            </Button>
          )}
        </div>
      }
    >
      {isLoading ? (
        <div className="flex items-center justify-center py-12 text-gray-500 dark:text-gray-400">
          Loading lead details...
        </div>
      ) : !lead ? (
        <div className="flex items-center justify-center py-12 text-gray-500 dark:text-gray-400">
          Lead not found
        </div>
      ) : (
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-amber-500/20 flex items-center justify-center">
                <UserIcon className="h-6 w-6 text-amber-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {lead.customerName}
                </h3>
                {lead.company && (
                  <p className="text-sm text-gray-500 dark:text-gray-400">{lead.company}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {lead.priority && (
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${PRIORITY_STYLES[lead.priority] || PRIORITY_STYLES.MEDIUM}`}>
                  {lead.priority}
                </span>
              )}
              <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_STYLES[lead.status] || STATUS_STYLES.NEW}`}>
                {lead.status}
              </span>
            </div>
          </div>

          {/* Details grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {lead.email && (
              <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                <EnvelopeIcon className="h-4 w-4 text-gray-400 flex-shrink-0" />
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Email</p>
                  <p className="text-sm text-gray-900 dark:text-white">{lead.email}</p>
                </div>
              </div>
            )}
            {lead.phone && (
              <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                <PhoneIcon className="h-4 w-4 text-gray-400 flex-shrink-0" />
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Phone</p>
                  <p className="text-sm text-gray-900 dark:text-white">{lead.phone}</p>
                </div>
              </div>
            )}
            {lead.company && (
              <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                <BuildingOfficeIcon className="h-4 w-4 text-gray-400 flex-shrink-0" />
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Company</p>
                  <p className="text-sm text-gray-900 dark:text-white">{lead.company}</p>
                </div>
              </div>
            )}
            {lead.estimatedValue != null && (
              <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                <CurrencyDollarIcon className="h-4 w-4 text-gray-400 flex-shrink-0" />
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Estimated Value</p>
                  <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(lead.estimatedValue)}
                  </p>
                </div>
              </div>
            )}
            {lead.source && (
              <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                <TagIcon className="h-4 w-4 text-gray-400 flex-shrink-0" />
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Source</p>
                  <p className="text-sm text-gray-900 dark:text-white">{lead.source}</p>
                </div>
              </div>
            )}
            {lead.assignedTo && (
              <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                <UserIcon className="h-4 w-4 text-gray-400 flex-shrink-0" />
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Assigned To</p>
                  <p className="text-sm text-gray-900 dark:text-white">{lead.assignedTo}</p>
                </div>
              </div>
            )}
          </div>

          {/* Notes */}
          {lead.notes && (
            <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Notes</p>
              <p className="text-sm text-gray-900 dark:text-white whitespace-pre-wrap">{lead.notes}</p>
            </div>
          )}

          {/* Created date */}
          {lead.createdAt && (
            <p className="text-xs text-gray-400 dark:text-gray-500">
              Created {new Date(lead.createdAt).toLocaleDateString()}
            </p>
          )}
        </div>
      )}
    </Modal>
  );
}
