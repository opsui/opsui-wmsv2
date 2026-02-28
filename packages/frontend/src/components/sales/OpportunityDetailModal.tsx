/**
 * Opportunity Detail Modal
 *
 * Modal for viewing opportunity details, pipeline stage, and expected value.
 */

import { Modal, Button, useToast } from '@/components/shared';
import { useOpportunity } from '@/services/api';
import {
  TrophyIcon,
  CurrencyDollarIcon,
  CalendarIcon,
  UserIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';

// ============================================================================
// TYPES
// ============================================================================

interface OpportunityDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  opportunityId: string;
  onCreateQuote?: (opportunityId: string) => void;
}

const STAGE_STYLES: Record<string, string> = {
  PROSPECTING: 'bg-slate-500/20 text-slate-400 border border-slate-500/30',
  QUALIFICATION: 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
  PROPOSAL: 'bg-purple-500/20 text-purple-400 border border-purple-500/30',
  NEGOTIATION: 'bg-amber-500/20 text-amber-400 border border-amber-500/30',
  CLOSED_WON: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
  CLOSED_LOST: 'bg-rose-500/20 text-rose-400 border border-rose-500/30',
};

// ============================================================================
// COMPONENT
// ============================================================================

export function OpportunityDetailModal({
  isOpen,
  onClose,
  onSuccess: _onSuccess,
  opportunityId,
  onCreateQuote,
}: OpportunityDetailModalProps) {
  const { showToast: _showToast } = useToast();
  const { data: opportunity, isLoading } = useOpportunity(opportunityId, isOpen);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(value);

  const getDaysUntilClose = (dateStr: string) => {
    const closeDate = new Date(dateStr);
    const today = new Date();
    const diffMs = closeDate.getTime() - today.getTime();
    return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  };

  const stage = opportunity?.stage ?? '';
  const isClosed = stage === 'CLOSED_WON' || stage === 'CLOSED_LOST';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Opportunity Details"
      size="lg"
      footer={
        <div className="flex items-center justify-between">
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
          {!isClosed && onCreateQuote && (
            <Button
              variant="primary"
              onClick={() => {
                onCreateQuote(opportunityId);
                onClose();
              }}
            >
              Create Quote
            </Button>
          )}
        </div>
      }
    >
      {isLoading ? (
        <div className="flex items-center justify-center py-12 text-gray-500 dark:text-gray-400">
          Loading opportunity details...
        </div>
      ) : !opportunity ? (
        <div className="flex items-center justify-center py-12 text-gray-500 dark:text-gray-400">
          Opportunity not found
        </div>
      ) : (
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-amber-500/20 flex items-center justify-center">
                <TrophyIcon className="h-6 w-6 text-amber-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {opportunity.name}
                </h3>
                {opportunity.opportunityNumber && (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {opportunity.opportunityNumber}
                  </p>
                )}
              </div>
            </div>
            <span
              className={`px-2.5 py-1 rounded-full text-xs font-medium ${STAGE_STYLES[stage] || STAGE_STYLES.PROSPECTING}`}
            >
              {stage.replace('_', ' ')}
            </span>
          </div>

          {/* Probability bar */}
          {opportunity.probability != null && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs text-gray-500 dark:text-gray-400">Win Probability</p>
                <p className="text-xs font-medium text-gray-900 dark:text-white">
                  {opportunity.probability}%
                </p>
              </div>
              <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full"
                  style={{ width: `${opportunity.probability}%` }}
                />
              </div>
            </div>
          )}

          {/* Key metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {opportunity.amount != null && (
              <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                <CurrencyDollarIcon className="h-4 w-4 text-gray-400 flex-shrink-0" />
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Deal Value</p>
                  <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(opportunity.amount)}
                  </p>
                </div>
              </div>
            )}
            {opportunity.expectedCloseDate && (
              <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                <CalendarIcon className="h-4 w-4 text-gray-400 flex-shrink-0" />
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Expected Close</p>
                  <p className="text-sm text-gray-900 dark:text-white">
                    {new Date(opportunity.expectedCloseDate).toLocaleDateString()}
                  </p>
                  {!isClosed &&
                    (() => {
                      const days = getDaysUntilClose(opportunity.expectedCloseDate);
                      return (
                        <p
                          className={`text-xs ${days < 0 ? 'text-rose-400' : days <= 7 ? 'text-amber-400' : 'text-gray-400'}`}
                        >
                          {days < 0 ? `${Math.abs(days)}d overdue` : `${days}d remaining`}
                        </p>
                      );
                    })()}
                </div>
              </div>
            )}
            {opportunity.assignedTo && (
              <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                <UserIcon className="h-4 w-4 text-gray-400 flex-shrink-0" />
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Assigned To</p>
                  <p className="text-sm text-gray-900 dark:text-white">{opportunity.assignedTo}</p>
                </div>
              </div>
            )}
            {opportunity.probability != null && opportunity.amount != null && (
              <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                <ChartBarIcon className="h-4 w-4 text-gray-400 flex-shrink-0" />
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Weighted Value</p>
                  <p className="text-sm font-medium text-purple-600 dark:text-purple-400">
                    {formatCurrency((opportunity.amount * opportunity.probability) / 100)}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Description */}
          {opportunity.description && (
            <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Description</p>
              <p className="text-sm text-gray-900 dark:text-white whitespace-pre-wrap">
                {opportunity.description}
              </p>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
