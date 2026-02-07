/**
 * Inwards Goods page
 *
 * Comprehensive inbound receiving interface for inwards goods personnel
 * Features: ASN management, receiving workflow, QC inspection, staging, license plating, putaway tasks
 * - Industry-standard workflow-based navigation
 * - Quality Control (QC) inspection stage
 * - Staging area management
 * - License plating for item tracking
 * - Receiving exception handling (short/over/damaged)
 * - Serial/Lot number capture
 * - Smart putaway with location suggestions
 */

import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  useInwardsDashboard,
  useASNs,
  useReceipts,
  usePutawayTasks,
  useCreateASN,
  useCreateReceipt,
  useUpdateASNStatus,
  useUpdatePutawayTask,
  useQualityInspections,
  useLicensePlates,
  useStagingLocations,
  useReceivingExceptions,
} from '@/services/api';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Header,
  Button,
  Pagination,
  useToast,
  MetricCardSkeleton,
  Skeleton,
  ConfirmDialog,
  Breadcrumb,
} from '@/components/shared';
import { useFormValidation } from '@/hooks/useFormValidation';
import {
  InboxIcon,
  TruckIcon,
  PlusIcon,
  XMarkIcon,
  CubeIcon,
  MagnifyingGlassIcon,
  ClipboardDocumentCheckIcon,
  TagIcon,
  ExclamationTriangleIcon,
  ChevronRightIcon,
  CheckCircleIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import {
  ASNStatus,
  ReceiptStatus,
  PutawayStatus,
  QualityStatus,
  InspectionStatus,
  LicensePlateStatus,
  StagingLocationStatus,
  ReceivingExceptionStatus,
  type AdvanceShippingNotice,
  type Receipt,
  type PutawayTask,
  type QualityInspection,
  type LicensePlate,
  type StagingLocation,
  type ReceivingException,
} from '@opsui/shared';

// ============================================================================
// TYPES
// ============================================================================

type TabStage = 'overview' | 'asn' | 'receiving' | 'qc' | 'staging' | 'putaway' | 'exceptions';

// ============================================================================
// SUBCOMPONENTS - Workflow Progress Indicator
// ============================================================================

function WorkflowStep({
  label,
  count,
  isActive,
  isComplete,
  onClick,
}: {
  label: string;
  count?: number;
  isActive: boolean;
  isComplete: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-2 px-4 py-3 rounded-xl transition-all duration-200 ${
        isActive
          ? 'bg-primary-500/20 border-2 border-primary-500'
          : isComplete
            ? 'bg-success-500/10 border-2 border-success-500/50 hover:border-success-500'
            : 'bg-white/5 border-2 border-white/10'
      } ${onClick ? 'cursor-pointer' : 'cursor-default'}`}
    >
      <div
        className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
          isActive
            ? 'bg-primary-500 text-white'
            : isComplete
              ? 'bg-success-500 text-white'
              : 'bg-gray-700 text-gray-400'
        }`}
      >
        {isComplete ? (
          <CheckCircleIcon className="h-6 w-6" />
        ) : (
          <span className="text-sm font-medium">{label[0]}</span>
        )}
      </div>
      <div className="text-center">
        <p
          className={`text-xs font-medium ${isActive || isComplete ? 'text-white' : 'text-gray-400'}`}
        >
          {label}
        </p>
        {count !== undefined && (
          <p className={`text-xs ${isActive || isComplete ? 'text-white/70' : 'text-gray-500'}`}>
            {count} pending
          </p>
        )}
      </div>
    </button>
  );
}

function WorkflowProgress({
  currentStage,
  counts,
  onStageClick,
}: {
  currentStage: TabStage;
  counts: {
    asn: number;
    receiving: number;
    qc: number;
    staging: number;
    putaway: number;
    exceptions: number;
  };
  onStageClick: (stage: TabStage) => void;
}) {
  const stages: Array<{ key: TabStage; label: string; countKey: keyof typeof counts }> = [
    { key: 'asn', label: 'ASN', countKey: 'asn' },
    { key: 'receiving', label: 'Receiving', countKey: 'receiving' },
    { key: 'qc', label: 'QC', countKey: 'qc' },
    { key: 'staging', label: 'Staging', countKey: 'staging' },
    { key: 'putaway', label: 'Putaway', countKey: 'putaway' },
  ];

  const stageOrder = ['asn', 'receiving', 'qc', 'staging', 'putaway'];
  const currentIndex = stageOrder.indexOf(currentStage);

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
      <div className="flex items-center justify-between gap-2 overflow-x-auto">
        {stages.map((stage, index) => {
          const isComplete = index < currentIndex;
          const isActive = stage.key === currentStage;

          return (
            <div key={stage.key} className="flex items-center gap-2 flex-shrink-0">
              <WorkflowStep
                label={stage.label}
                count={counts[stage.countKey]}
                isActive={isActive}
                isComplete={isComplete}
                onClick={() => onStageClick(stage.key)}
              />
              {index < stages.length - 1 && (
                <ChevronRightIcon
                  className={`h-5 w-5 ${isComplete ? 'text-success-500' : 'text-gray-600'}`}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Exceptions Alert */}
      {counts.exceptions > 0 && (
        <div className="mt-4 pt-4 border-t border-white/10">
          <button
            onClick={() => onStageClick('exceptions')}
            className="w-full flex items-center justify-between px-4 py-3 bg-error-500/10 border border-error-500/30 rounded-xl hover:bg-error-500/20 transition-colors"
          >
            <div className="flex items-center gap-3">
              <ExclamationTriangleIcon className="h-5 w-5 text-error-400" />
              <span className="text-sm font-medium text-error-300">
                {counts.exceptions} Receiving Exception{counts.exceptions > 1 ? 's' : ''} Require
                Attention
              </span>
            </div>
            <ChevronRightIcon className="h-5 w-5 text-error-400" />
          </button>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// SUBCOMPONENTS - Metric Cards
// ============================================================================

function MetricCard({
  title,
  value,
  icon: Icon,
  color = 'primary',
  trend,
  onClick,
}: {
  title: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  color?: 'primary' | 'success' | 'warning' | 'error';
  trend?: string;
  onClick?: () => void;
}) {
  const colorStyles = {
    primary:
      'from-primary-500/20 to-primary-500/5 border-primary-500/30 hover:border-primary-500/50',
    success:
      'from-success-500/20 to-success-500/5 border-success-500/30 hover:border-success-500/50',
    warning:
      'from-warning-500/20 to-warning-500/5 border-warning-500/30 hover:border-warning-500/50',
    error: 'from-error-500/20 to-error-500/5 border-error-500/30 hover:border-error-500/50',
  };

  const iconColors = {
    primary: 'bg-primary-500/20 text-primary-400',
    success: 'bg-success-500/20 text-success-400',
    warning: 'bg-warning-500/20 text-warning-400',
    error: 'bg-error-500/20 text-error-400',
  };

  return (
    <button
      onClick={onClick}
      className={`relative bg-gradient-to-br ${colorStyles[color]} border rounded-xl p-5 transition-all duration-200 hover:scale-[1.02] ${onClick ? 'cursor-pointer' : ''}`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 text-left">
          <p className="text-xs text-gray-400 uppercase tracking-wider font-medium">{title}</p>
          <p className="mt-2 text-3xl font-bold text-white">{value}</p>
          {trend && <p className="mt-1 text-xs text-gray-400">{trend}</p>}
        </div>
        <div className={`p-3 rounded-lg ${iconColors[color]}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </button>
  );
}

// ============================================================================
// SUBCOMPONENTS - Status Badges
// ============================================================================

function StatusBadge({
  status,
  type = 'asn',
}: {
  status: string;
  type?: 'asn' | 'receipt' | 'putaway' | 'qc' | 'license' | 'staging' | 'exception';
}) {
  const getStatusStyles = () => {
    const baseStyles = 'px-2.5 py-1 rounded-md text-xs font-semibold border shrink-0';

    if (type === 'asn') {
      switch (status) {
        case ASNStatus.PENDING:
          return `${baseStyles} bg-gray-500/10 text-gray-300 border-gray-500/30`;
        case ASNStatus.IN_TRANSIT:
          return `${baseStyles} bg-blue-500/10 text-blue-300 border-blue-500/30`;
        case ASNStatus.RECEIVED:
          return `${baseStyles} bg-success-500/10 text-success-300 border-success-500/30`;
        case ASNStatus.PARTIALLY_RECEIVED:
          return `${baseStyles} bg-warning-500/10 text-warning-300 border-warning-500/30`;
        case ASNStatus.CANCELLED:
          return `${baseStyles} bg-error-500/10 text-error-300 border-error-500/30`;
        default:
          return `${baseStyles} bg-gray-500/10 text-gray-300`;
      }
    } else if (type === 'receipt') {
      switch (status) {
        case ReceiptStatus.RECEIVING:
          return `${baseStyles} bg-blue-500/10 text-blue-300 border-blue-500/30`;
        case ReceiptStatus.COMPLETED:
          return `${baseStyles} bg-success-500/10 text-success-300 border-success-500/30`;
        case ReceiptStatus.CANCELLED:
          return `${baseStyles} bg-error-500/10 text-error-300 border-error-500/30`;
        default:
          return `${baseStyles} bg-gray-500/10 text-gray-300`;
      }
    } else if (type === 'putaway') {
      switch (status) {
        case PutawayStatus.PENDING:
          return `${baseStyles} bg-gray-500/10 text-gray-300 border-gray-500/30`;
        case PutawayStatus.IN_PROGRESS:
          return `${baseStyles} bg-blue-500/10 text-blue-300 border-blue-500/30`;
        case PutawayStatus.COMPLETED:
          return `${baseStyles} bg-success-500/10 text-success-300 border-success-500/30`;
        case PutawayStatus.CANCELLED:
          return `${baseStyles} bg-error-500/10 text-error-300 border-error-500/30`;
        default:
          return `${baseStyles} bg-gray-500/10 text-gray-300`;
      }
    } else if (type === 'qc') {
      switch (status) {
        case QualityStatus.PENDING:
          return `${baseStyles} bg-gray-500/10 text-gray-300 border-gray-500/30`;
        case QualityStatus.PASSED:
          return `${baseStyles} bg-success-500/10 text-success-300 border-success-500/30`;
        case QualityStatus.FAILED:
          return `${baseStyles} bg-error-500/10 text-error-300 border-error-500/30`;
        case QualityStatus.PARTIAL:
          return `${baseStyles} bg-warning-500/10 text-warning-300 border-warning-500/30`;
        default:
          return `${baseStyles} bg-gray-500/10 text-gray-300`;
      }
    } else if (type === 'license') {
      switch (status) {
        case LicensePlateStatus.OPEN:
          return `${baseStyles} bg-gray-500/10 text-gray-300 border-gray-500/30`;
        case LicensePlateStatus.SEALED:
          return `${baseStyles} bg-blue-500/10 text-blue-300 border-blue-500/30`;
        case LicensePlateStatus.IN_QC:
          return `${baseStyles} bg-purple-500/10 text-purple-300 border-purple-500/30`;
        case LicensePlateStatus.QC_PASSED:
          return `${baseStyles} bg-success-500/10 text-success-300 border-success-500/30`;
        case LicensePlateStatus.QC_FAILED:
          return `${baseStyles} bg-error-500/10 text-error-300 border-error-500/30`;
        case LicensePlateStatus.IN_STAGING:
          return `${baseStyles} bg-orange-500/10 text-orange-300 border-orange-500/30`;
        case LicensePlateStatus.PUTAWAY_COMPLETE:
          return `${baseStyles} bg-success-500/10 text-success-300 border-success-500/30`;
        case LicensePlateStatus.CLOSED:
          return `${baseStyles} bg-gray-500/10 text-gray-400 border-gray-500/30`;
        default:
          return `${baseStyles} bg-gray-500/10 text-gray-300`;
      }
    } else if (type === 'staging') {
      switch (status) {
        case StagingLocationStatus.AVAILABLE:
          return `${baseStyles} bg-success-500/10 text-success-300 border-success-500/30`;
        case StagingLocationStatus.OCCUPIED:
          return `${baseStyles} bg-warning-500/10 text-warning-300 border-warning-500/30`;
        case StagingLocationStatus.RESERVED:
          return `${baseStyles} bg-blue-500/10 text-blue-300 border-blue-500/30`;
        case StagingLocationStatus.BLOCKED:
          return `${baseStyles} bg-error-500/10 text-error-300 border-error-500/30`;
        default:
          return `${baseStyles} bg-gray-500/10 text-gray-300`;
      }
    } else if (type === 'exception') {
      switch (status) {
        case ReceivingExceptionStatus.OPEN:
          return `${baseStyles} bg-error-500/10 text-error-300 border-error-500/30`;
        case ReceivingExceptionStatus.INVESTIGATING:
          return `${baseStyles} bg-blue-500/10 text-blue-300 border-blue-500/30`;
        case ReceivingExceptionStatus.AWAITING_DECISION:
          return `${baseStyles} bg-warning-500/10 text-warning-300 border-warning-500/30`;
        case ReceivingExceptionStatus.RESOLVED:
          return `${baseStyles} bg-success-500/10 text-success-300 border-success-500/30`;
        case ReceivingExceptionStatus.CANCELLED:
          return `${baseStyles} bg-gray-500/10 text-gray-400 border-gray-500/30`;
        default:
          return `${baseStyles} bg-gray-500/10 text-gray-300`;
      }
    }
    return `${baseStyles} bg-gray-500/10 text-gray-300`;
  };

  return <span className={getStatusStyles()}>{status.replace(/_/g, ' ')}</span>;
}

// ============================================================================
// SUBCOMPONENTS - List/Table View for better data density
// ============================================================================

function ASNListItem({
  asn,
  onViewDetails,
  onStartReceiving,
}: {
  asn: AdvanceShippingNotice;
  onViewDetails: (asnId: string) => void;
  onStartReceiving: (asnId: string) => void;
}) {
  const itemCount = asn.lineItems?.length || 0;
  const totalExpected = asn.lineItems?.reduce((sum, item) => sum + item.expectedQuantity, 0) || 0;
  const isUrgent = new Date(asn.expectedArrivalDate) < new Date(Date.now() + 24 * 60 * 60 * 1000);

  return (
    <div className="bg-gray-800/40 border border-gray-700 rounded-xl p-4 hover:border-gray-600 transition-all">
      <div className="flex items-center gap-4">
        {/* Status indicator */}
        <div
          className={`w-2 h-12 rounded-full ${
            asn.status === ASNStatus.IN_TRANSIT
              ? 'bg-blue-500'
              : asn.status === ASNStatus.RECEIVED
                ? 'bg-success-500'
                : asn.status === ASNStatus.PARTIALLY_RECEIVED
                  ? 'bg-warning-500'
                  : 'bg-gray-500'
          }`}
        />

        {/* Main content */}
        <div className="flex-1 min-w-0 grid grid-cols-12 gap-4 items-center">
          {/* PO Number */}
          <div className="col-span-3">
            <p className="text-sm font-semibold text-white truncate">{asn.purchaseOrderNumber}</p>
            <p className="text-xs text-gray-400 truncate">{asn.supplierId}</p>
          </div>

          {/* Status */}
          <div className="col-span-2">
            <StatusBadge status={asn.status} type="asn" />
          </div>

          {/* Details */}
          <div className="col-span-4 grid grid-cols-3 gap-2 text-xs">
            <div>
              <p className="text-gray-500">Expected</p>
              <p className="text-gray-300">
                {new Date(asn.expectedArrivalDate).toLocaleDateString()}
              </p>
            </div>
            <div>
              <p className="text-gray-500">Items</p>
              <p className="text-gray-300">
                {itemCount} ({totalExpected})
              </p>
            </div>
            <div>
              <p className="text-gray-500">Carrier</p>
              <p className="text-gray-300">{asn.carrier || 'TBD'}</p>
            </div>
          </div>

          {/* Urgency indicator */}
          {isUrgent && (
            <div className="col-span-1">
              <span className="px-2 py-1 rounded-md text-xs font-medium bg-warning-500/10 text-warning-300 border border-warning-500/30">
                Urgent
              </span>
            </div>
          )}

          {/* Actions */}
          <div className="col-span-2 flex gap-2 justify-end">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onViewDetails(asn.asnId)}
              className="px-3"
            >
              View
            </Button>
            {asn.status === ASNStatus.IN_TRANSIT && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => onStartReceiving(asn.asnId)}
                className="px-3"
              >
                Receive
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ReceiptListItem({
  receipt,
  onViewDetails,
  onCreateLicensePlate,
}: {
  receipt: Receipt;
  onViewDetails: (receiptId: string) => void;
  onCreateLicensePlate?: (receiptId: string) => void;
}) {
  const hasExceptions =
    receipt.lineItems?.some(
      item => item.quantityDamaged > 0 || item.quantityReceived !== item.quantityOrdered
    ) || false;

  return (
    <div className="bg-gray-800/40 border border-gray-700 rounded-xl p-4 hover:border-gray-600 transition-all">
      <div className="flex items-center gap-4">
        {/* Status indicator */}
        <div
          className={`w-2 h-12 rounded-full ${
            receipt.status === ReceiptStatus.RECEIVING
              ? 'bg-blue-500'
              : receipt.status === ReceiptStatus.COMPLETED
                ? 'bg-success-500'
                : 'bg-error-500'
          }`}
        />

        {/* Main content */}
        <div className="flex-1 min-w-0 grid grid-cols-12 gap-4 items-center">
          {/* Receipt ID */}
          <div className="col-span-3">
            <p className="text-sm font-semibold text-white truncate">{receipt.receiptId}</p>
            <p className="text-xs text-gray-400">
              {new Date(receipt.receiptDate).toLocaleDateString()}
            </p>
          </div>

          {/* Status & Type */}
          <div className="col-span-2 flex items-center gap-2">
            <StatusBadge status={receipt.status} type="receipt" />
            {hasExceptions && (
              <span className="px-2 py-1 rounded-md text-xs font-medium bg-warning-500/10 text-warning-300 border border-warning-500/30">
                !
              </span>
            )}
          </div>

          {/* Type */}
          <div className="col-span-2">
            <p className="text-xs text-gray-500">Type</p>
            <p className="text-sm text-gray-300">{receipt.receiptType}</p>
          </div>

          {/* Items */}
          <div className="col-span-2">
            <p className="text-xs text-gray-500">Items</p>
            <p className="text-sm text-gray-300">{receipt.lineItems?.length || 0}</p>
          </div>

          {/* Actions */}
          <div className="col-span-3 flex gap-2 justify-end">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onViewDetails(receipt.receiptId)}
              className="px-3"
            >
              View
            </Button>
            {onCreateLicensePlate && receipt.status === ReceiptStatus.RECEIVING && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => onCreateLicensePlate(receipt.receiptId)}
                className="px-3"
              >
                <TagIcon className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// SUBCOMPONENTS - Compact Cards for Staging/Putaway
// ============================================================================

function CompactTaskCard({
  title,
  subtitle,
  status,
  statusType,
  progress,
  total,
  onAction,
  actionLabel,
  icon: Icon,
  color = 'primary',
}: {
  title: string;
  subtitle: string;
  status: string;
  statusType: 'putaway' | 'qc' | 'license' | 'staging';
  progress?: number;
  total?: number;
  onAction?: () => void;
  actionLabel?: string;
  icon: React.ComponentType<{ className?: string }>;
  color?: 'primary' | 'success' | 'warning' | 'error';
}) {
  const progressPercent =
    progress !== undefined && total !== undefined && total > 0
      ? Math.round((progress / total) * 100)
      : 0;

  const colorClasses = {
    primary: { bg: 'bg-primary-500/10', text: 'text-primary-400', progress: 'bg-primary-500' },
    success: { bg: 'bg-success-500/10', text: 'text-success-400', progress: 'bg-success-500' },
    warning: { bg: 'bg-warning-500/10', text: 'text-warning-400', progress: 'bg-warning-500' },
    error: { bg: 'bg-error-500/10', text: 'text-error-400', progress: 'bg-error-500' },
  };

  const colors = colorClasses[color];

  return (
    <div className="bg-gray-800/40 border border-gray-700 rounded-xl p-4 hover:border-gray-600 transition-all">
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-lg ${colors.bg}`}>
          <Icon className={`h-5 w-5 ${colors.text}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <p className="text-sm font-semibold text-white truncate">{title}</p>
            <StatusBadge status={status} type={statusType} />
          </div>
          <p className="text-xs text-gray-400 mb-2">{subtitle}</p>

          {progress !== undefined && total !== undefined && (
            <div className="mb-2">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-gray-500">Progress</span>
                <span className="text-gray-300">
                  {progress} / {total}
                </span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-1.5">
                <div
                  className={`${colors.progress} h-1.5 rounded-full transition-all`}
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          )}

          {onAction && actionLabel && (
            <Button variant="primary" size="sm" onClick={onAction} className="w-full mt-2">
              {actionLabel}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function ExceptionCard({
  exception,
  onInvestigate,
  onResolve,
}: {
  exception: ReceivingException;
  onInvestigate: (exceptionId: string) => void;
  onResolve: (exceptionId: string) => void;
}) {
  return (
    <div className="bg-error-500/5 border border-error-500/30 rounded-xl p-4">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-error-500/10">
          <ExclamationTriangleIcon className="h-5 w-5 text-error-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <p className="text-sm font-semibold text-white truncate">{exception.sku}</p>
            <StatusBadge status={exception.status} type="exception" />
          </div>
          <p className="text-xs text-error-300 font-medium mb-2">
            {exception.exceptionType.replace(/_/g, ' ')}
          </p>

          <div className="grid grid-cols-2 gap-3 mb-3">
            <div className="bg-white/5 p-2 rounded-lg">
              <p className="text-xs text-gray-500">Expected</p>
              <p className="text-sm text-white">{exception.expectedQuantity}</p>
            </div>
            <div className="bg-white/5 p-2 rounded-lg">
              <p className="text-xs text-gray-500">Actual</p>
              <p className="text-sm text-white">{exception.actualQuantity}</p>
            </div>
          </div>

          <div className="flex gap-2">
            {exception.status === ReceivingExceptionStatus.OPEN && (
              <Button
                variant="warning"
                size="sm"
                onClick={() => onInvestigate(exception.exceptionId)}
                className="flex-1"
              >
                Investigate
              </Button>
            )}
            {exception.status === ReceivingExceptionStatus.INVESTIGATING && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => onResolve(exception.exceptionId)}
                className="flex-1"
              >
                Resolve
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// MODALS
// ============================================================================

function CreateASNModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const { showToast } = useToast();
  const createASN = useCreateASN();

  const {
    values: formData,
    errors,
    handleChange,
    handleSubmit,
    isSubmitting,
  } = useFormValidation({
    initialValues: {
      supplierId: '',
      poNumber: '',
      expectedDate: '',
    },
    validationRules: {
      supplierId: { required: true, minLength: 2, maxLength: 50 },
      poNumber: { required: true, minLength: 2, maxLength: 50 },
      expectedDate: {
        required: true,
        custom: (value: string) => {
          const date = new Date(value);
          if (isNaN(date.getTime())) {
            return 'Invalid date format';
          }
          if (date < new Date()) {
            return 'Expected date must be in the future';
          }
          return null;
        },
      },
    },
    onSubmit: async values => {
      try {
        await createASN.mutateAsync({
          supplierId: values.supplierId,
          purchaseOrderNumber: values.poNumber,
          expectedArrivalDate: new Date(values.expectedDate),
          carrier: '',
          trackingNumber: '',
          shipmentNotes: '',
          lineItems: [{ sku: 'SKU-001', expectedQuantity: 1, unitCost: 0 }],
        });
        showToast('ASN created successfully', 'success');
        onSuccess();
        onClose();
      } catch (error: any) {
        console.error('Failed to create ASN:', error);
        showToast(error?.message || 'Failed to create ASN', 'error');
        throw error;
      }
    },
  });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="max-w-md w-full">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Create Advance Shipping Notice</CardTitle>
            <button onClick={onClose} className="text-gray-400 hover:text-white">
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Supplier ID</label>
              <input
                type="text"
                name="supplierId"
                required
                value={formData.supplierId}
                onChange={handleChange}
                className={`w-full px-3 py-2 bg-gray-700 border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                  errors.supplierId ? 'border-red-500' : 'border-gray-600'
                }`}
                placeholder="SUP-001"
              />
              {errors.supplierId && (
                <p className="mt-1 text-sm text-red-400">{errors.supplierId}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">PO Number</label>
              <input
                type="text"
                name="poNumber"
                required
                value={formData.poNumber}
                onChange={handleChange}
                className={`w-full px-3 py-2 bg-gray-700 border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                  errors.poNumber ? 'border-red-500' : 'border-gray-600'
                }`}
                placeholder="PO-2024-001"
              />
              {errors.poNumber && <p className="mt-1 text-sm text-red-400">{errors.poNumber}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Expected Arrival
              </label>
              <input
                type="date"
                name="expectedDate"
                required
                value={formData.expectedDate}
                onChange={handleChange}
                className={`w-full px-3 py-2 bg-gray-700 border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                  errors.expectedDate ? 'border-red-500' : 'border-gray-600'
                }`}
              />
              {errors.expectedDate && (
                <p className="mt-1 text-sm text-red-400">{errors.expectedDate}</p>
              )}
            </div>
            <div className="flex gap-3">
              <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={isSubmitting || createASN.isPending}
                className="flex-1"
              >
                {isSubmitting || createASN.isPending ? 'Creating...' : 'Create ASN'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function CreateReceiptModal({
  asnId,
  onClose,
  onSuccess,
}: {
  asnId?: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { showToast } = useToast();
  const createReceipt = useCreateReceipt();

  const {
    values: formData,
    errors,
    handleChange,
    handleSubmit,
    isSubmitting,
  } = useFormValidation({
    initialValues: {
      receiptType: 'PO' as 'PO' | 'RETURN' | 'TRANSFER' | 'ADJUSTMENT',
    },
    validationRules: {
      receiptType: { required: true },
    },
    onSubmit: async values => {
      try {
        await createReceipt.mutateAsync({
          asnId,
          receiptType: values.receiptType,
          lineItems: [
            { sku: 'SKU-001', quantityOrdered: 10, quantityReceived: 10, quantityDamaged: 0 },
          ],
        });
        showToast('Receipt created successfully', 'success');
        onSuccess();
        onClose();
      } catch (error: any) {
        console.error('Failed to create receipt:', error);
        showToast(error?.message || 'Failed to create receipt', 'error');
        throw error;
      }
    },
  });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="max-w-md w-full">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Create Receipt</CardTitle>
            <button onClick={onClose} className="text-gray-400 hover:text-white">
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Receipt Type</label>
              <select
                name="receiptType"
                value={formData.receiptType}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="PO">Purchase Order</option>
                <option value="RETURN">Customer Return</option>
                <option value="TRANSFER">Warehouse Transfer</option>
              </select>
              {errors.receiptType && (
                <p className="mt-1 text-sm text-red-400">{errors.receiptType}</p>
              )}
            </div>
            <div className="flex gap-3">
              <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={isSubmitting || createReceipt.isPending}
                className="flex-1"
              >
                {isSubmitting || createReceipt.isPending ? 'Creating...' : 'Create'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function UpdatePutawayTaskModal({
  task,
  onClose,
  onSuccess,
}: {
  task: PutawayTask;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { showToast } = useToast();
  const updatePutawayTask = useUpdatePutawayTask();

  const remaining = task.quantityToPutaway - task.quantityPutaway;

  const {
    values: formData,
    errors,
    handleChange,
    handleSubmit,
    isSubmitting,
  } = useFormValidation({
    initialValues: {
      quantityPutaway: task.quantityPutaway,
    },
    validationRules: {
      quantityPutaway: {
        required: true,
        custom: (value: string) => {
          const num = parseInt(value);
          if (isNaN(num)) return 'Must be a number';
          if (num < 0) return 'Cannot be negative';
          if (num < task.quantityPutaway) return 'Cannot be less than current progress';
          if (num > task.quantityToPutaway)
            return `Cannot exceed total (${task.quantityToPutaway})`;
          return null;
        },
      },
    },
    onSubmit: async values => {
      try {
        const qty = Number(values.quantityPutaway);
        await updatePutawayTask.mutateAsync({
          putawayTaskId: task.putawayTaskId,
          dto: {
            quantityPutaway: qty,
            status:
              qty >= task.quantityToPutaway ? PutawayStatus.COMPLETED : PutawayStatus.IN_PROGRESS,
          },
        });
        showToast('Putaway task updated successfully', 'success');
        onSuccess();
        onClose();
      } catch (error: any) {
        console.error('Failed to update putaway task:', error);
        showToast(error?.message || 'Failed to update putaway task', 'error');
        throw error;
      }
    },
  });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="max-w-md w-full">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Update Putaway Progress</CardTitle>
            <button onClick={onClose} className="text-gray-400 hover:text-white">
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4 p-3 bg-white/5 rounded-lg">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-gray-400">SKU</p>
                <p className="text-white font-medium">{task.sku}</p>
              </div>
              <div>
                <p className="text-gray-400">Target Bin</p>
                <p className="text-white font-medium">{task.targetBinLocation}</p>
              </div>
              <div>
                <p className="text-gray-400">Current Progress</p>
                <p className="text-white font-medium">
                  {task.quantityPutaway} / {task.quantityToPutaway}
                </p>
              </div>
              <div>
                <p className="text-gray-400">Remaining</p>
                <p className="text-white font-medium">{remaining}</p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Quantity Put Away
              </label>
              <input
                type="number"
                name="quantityPutaway"
                min={task.quantityPutaway}
                max={task.quantityToPutaway}
                value={formData.quantityPutaway}
                onChange={handleChange}
                className={`w-full px-3 py-2 bg-gray-700 border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                  errors.quantityPutaway ? 'border-red-500' : 'border-gray-600'
                }`}
              />
              {errors.quantityPutaway && (
                <p className="mt-1 text-sm text-red-400">{errors.quantityPutaway}</p>
              )}
            </div>

            <div className="flex gap-3">
              <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={isSubmitting || updatePutawayTask.isPending}
                className="flex-1"
              >
                {isSubmitting || updatePutawayTask.isPending ? 'Updating...' : 'Update'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================================
// MAIN PAGE
// ============================================================================

function InwardsGoodsPage() {
  const { showToast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const currentStage = (searchParams.get('tab') as TabStage) || 'overview';
  const navigate = useNavigate();

  // Modal states
  const [asnModalOpen, setAsnModalOpen] = useState(false);
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [putawayUpdateModalOpen, setPutawayUpdateModalOpen] = useState(false);
  const [selectedPutawayTask, setSelectedPutawayTask] = useState<PutawayTask | null>(null);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [pendingAsnId, setPendingAsnId] = useState<string | null>(null);

  // Search states
  const [asnsSearchTerm, setAsnsSearchTerm] = useState('');
  const [receiptsSearchTerm, setReceiptsSearchTerm] = useState('');
  const [putawaySearchTerm, setPutawaySearchTerm] = useState('');
  const [qcSearchTerm, setQcSearchTerm] = useState('');
  const [exceptionsSearchTerm, setExceptionsSearchTerm] = useState('');

  // Pagination states
  const [asnsCurrentPage, setAsnsCurrentPage] = useState(1);
  const asnsPerPage = 10;
  const [receiptsCurrentPage, setReceiptsCurrentPage] = useState(1);
  const receiptsPerPage = 10;
  const [putawayCurrentPage, setPutawayCurrentPage] = useState(1);
  const putawayPerPage = 10;
  const [qcCurrentPage, setQcCurrentPage] = useState(1);
  const qcPerPage = 10;
  const [exceptionsCurrentPage, setExceptionsCurrentPage] = useState(1);
  const exceptionsPerPage = 10;

  // Reset pagination when search changes
  useEffect(() => {
    setAsnsCurrentPage(1);
  }, [asnsSearchTerm]);
  useEffect(() => {
    setReceiptsCurrentPage(1);
  }, [receiptsSearchTerm]);
  useEffect(() => {
    setPutawayCurrentPage(1);
  }, [putawaySearchTerm]);
  useEffect(() => {
    setQcCurrentPage(1);
  }, [qcSearchTerm]);
  useEffect(() => {
    setExceptionsCurrentPage(1);
  }, [exceptionsSearchTerm]);

  // Data fetching
  const { data: dashboard, isLoading: isLoadingDashboard } = useInwardsDashboard();
  const {
    data: asnsData,
    refetch: refetchAsns,
    isLoading: isLoadingASNs,
  } = useASNs({
    enabled: true,
  });
  const {
    data: receiptsData,
    refetch: refetchReceipts,
    isLoading: isLoadingReceipts,
  } = useReceipts({
    enabled: true,
  });
  const {
    data: putawayData,
    refetch: refetchPutawayTasks,
    isLoading: isLoadingPutaway,
  } = usePutawayTasks({
    enabled: true,
  });
  const { data: qcData, isLoading: isLoadingQC } = useQualityInspections({
    referenceId: 'all',
    enabled: true,
  });
  const { data: licensePlatesData, isLoading: isLoadingLicensePlates } = useLicensePlates({
    enabled: true,
  });
  const { data: stagingData, isLoading: isLoadingStaging } = useStagingLocations({
    enabled: true,
  });
  const { data: exceptionsData, isLoading: isLoadingExceptions } = useReceivingExceptions({
    enabled: true,
  });

  // Extract arrays from paginated responses
  const asns = asnsData?.asns ?? [];
  const receipts = receiptsData?.receipts ?? [];
  const putawayTasks = putawayData?.tasks ?? [];
  const qcInspections = qcData?.inspections ?? [];
  const licensePlates = licensePlatesData?.licensePlates ?? [];
  const stagingLocations = stagingData?.stagingLocations ?? [];
  const receivingExceptions = exceptionsData?.exceptions ?? [];

  // Calculate counts for workflow
  const inTransitAsnCount = asns.filter(
    (a: AdvanceShippingNotice) =>
      a.status === ASNStatus.IN_TRANSIT || a.status === ASNStatus.PENDING
  ).length;
  const activeReceiptsCount = receipts.filter(
    (r: Receipt) => r.status === ReceiptStatus.RECEIVING
  ).length;
  const pendingQcCount = qcInspections.filter(
    (i: QualityInspection) =>
      i.status === InspectionStatus.PENDING || i.status === InspectionStatus.IN_PROGRESS
  ).length;
  const openStagingCount = stagingLocations.filter(
    (l: StagingLocation) => l.status === StagingLocationStatus.AVAILABLE
  ).length;
  const openExceptionsCount = receivingExceptions.filter(
    (e: ReceivingException) => e.status === ReceivingExceptionStatus.OPEN
  ).length;
  const pendingPutawayCount = putawayTasks.filter(
    (t: PutawayTask) => t.status === PutawayStatus.PENDING || t.status === PutawayStatus.IN_PROGRESS
  ).length;

  const updateASNStatus = useUpdateASNStatus();

  const handleStartReceiving = (asnId: string) => {
    setPendingAsnId(asnId);
    setConfirmDialogOpen(true);
  };

  const handleConfirmStartReceiving = async () => {
    if (!pendingAsnId) return;

    try {
      await updateASNStatus.mutateAsync({ asnId: pendingAsnId, status: ASNStatus.RECEIVED });
      showToast('ASN marked as received', 'success');
      setReceiptModalOpen(true);
      refetchAsns();
    } catch (error: any) {
      console.error('Failed to update ASN status:', error);
      showToast(error?.message || 'Failed to update ASN status', 'error');
    } finally {
      setConfirmDialogOpen(false);
      setPendingAsnId(null);
    }
  };

  const handleStageClick = (stage: TabStage) => {
    setSearchParams({ tab: stage });
  };

  // Loading skeleton
  if (isLoadingDashboard && currentStage === 'overview') {
    return (
      <div className="min-h-screen">
        <Header />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
          <Skeleton variant="text" className="w-64 h-10 mb-2" />
          <Skeleton variant="text" className="w-96 h-6 mb-6" />
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
            <MetricCardSkeleton />
            <MetricCardSkeleton />
            <MetricCardSkeleton />
            <MetricCardSkeleton />
            <MetricCardSkeleton />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb Navigation */}
        <Breadcrumb />

        {/* Page Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Inwards Goods</h1>
            <p className="mt-2 text-gray-400">Manage receiving from ASN to putaway</p>
          </div>
          <div className="flex gap-3">
            <Button
              variant="secondary"
              onClick={() => setAsnModalOpen(true)}
              className="flex items-center gap-2"
            >
              <TruckIcon className="h-5 w-5" />
              New ASN
            </Button>
            <Button
              variant="primary"
              onClick={() => setReceiptModalOpen(true)}
              className="flex items-center gap-2"
            >
              <InboxIcon className="h-5 w-5" />
              New Receipt
            </Button>
          </div>
        </div>

        {/* Workflow Progress */}
        <div className="mb-8">
          <WorkflowProgress
            currentStage={currentStage}
            counts={{
              asn: inTransitAsnCount,
              receiving: activeReceiptsCount,
              qc: pendingQcCount,
              staging: openStagingCount,
              putaway: pendingPutawayCount,
              exceptions: openExceptionsCount,
            }}
            onStageClick={handleStageClick}
          />
        </div>

        {/* Overview Stage */}
        {currentStage === 'overview' && dashboard && (
          <div className="space-y-8">
            {/* Metrics Row */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
              <MetricCard
                title="In Transit ASNs"
                value={inTransitAsnCount}
                icon={TruckIcon}
                color="primary"
                onClick={() => setSearchParams({ tab: 'asn' })}
              />
              <MetricCard
                title="Active Receiving"
                value={activeReceiptsCount}
                icon={InboxIcon}
                color="warning"
                onClick={() => setSearchParams({ tab: 'receiving' })}
              />
              <MetricCard
                title="Pending QC"
                value={pendingQcCount}
                icon={ClipboardDocumentCheckIcon}
                color="error"
                onClick={() => setSearchParams({ tab: 'qc' })}
              />
              <MetricCard
                title="Pending Putaway"
                value={pendingPutawayCount}
                icon={CubeIcon}
                color="success"
                onClick={() => setSearchParams({ tab: 'putaway' })}
              />
              <MetricCard
                title="Exceptions"
                value={openExceptionsCount}
                icon={ExclamationTriangleIcon}
                color="error"
                onClick={() => setSearchParams({ tab: 'exceptions' })}
              />
            </div>

            {/* Recent Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Recent ASNs */}
              <Card variant="glass">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Recent Shipments</CardTitle>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setSearchParams({ tab: 'asn' })}
                    >
                      View All
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {asns.slice(0, 4).map((asn: AdvanceShippingNotice) => (
                      <ASNListItem
                        key={asn.asnId}
                        asn={asn}
                        onViewDetails={id => navigate(`/inwards/asn/${id}`)}
                        onStartReceiving={handleStartReceiving}
                      />
                    ))}
                    {asns.length === 0 && (
                      <div className="text-center py-8 text-gray-400">
                        <TruckIcon className="h-12 w-12 mx-auto mb-2 text-gray-600" />
                        <p>No shipments yet</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Active Tasks */}
              <Card variant="glass">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Active Tasks</CardTitle>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setSearchParams({ tab: 'putaway' })}
                    >
                      View All
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {/* Putaway Tasks */}
                    {putawayTasks.slice(0, 2).map((task: PutawayTask) => (
                      <CompactTaskCard
                        key={task.putawayTaskId}
                        title={task.sku}
                        subtitle={`To: ${task.targetBinLocation}`}
                        status={task.status}
                        statusType="putaway"
                        progress={task.quantityPutaway}
                        total={task.quantityToPutaway}
                        onAction={() => {
                          setSelectedPutawayTask(task);
                          setPutawayUpdateModalOpen(true);
                        }}
                        actionLabel="Update"
                        icon={CubeIcon}
                        color="primary"
                      />
                    ))}
                    {/* QC Inspections */}
                    {qcInspections.slice(0, 2).map((inspection: QualityInspection) => (
                      <CompactTaskCard
                        key={inspection.inspectionId}
                        title={inspection.sku}
                        subtitle={`Inspection: ${inspection.inspectionId}`}
                        status={inspection.status}
                        statusType="qc"
                        onAction={() => navigate(`/inwards/qc/${inspection.inspectionId}`)}
                        actionLabel="Inspect"
                        icon={ClipboardDocumentCheckIcon}
                        color="success"
                      />
                    ))}
                    {putawayTasks.length === 0 && qcInspections.length === 0 && (
                      <div className="text-center py-8 text-gray-400">
                        <ClockIcon className="h-12 w-12 mx-auto mb-2 text-gray-600" />
                        <p>No active tasks</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* ASN Stage */}
        {currentStage === 'asn' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-white">Advance Shipping Notices</h2>
                <p className="text-gray-400 text-sm mt-1">
                  Track incoming shipments before arrival
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search ASNs..."
                    value={asnsSearchTerm}
                    onChange={e => setAsnsSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2.5 w-64 bg-gray-700/50 border border-gray-600 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-primary-500/50"
                  />
                </div>
              </div>
            </div>

            {isLoadingASNs ? (
              <div className="space-y-3">
                <Skeleton variant="rounded" className="h-20" />
                <Skeleton variant="rounded" className="h-20" />
                <Skeleton variant="rounded" className="h-20" />
              </div>
            ) : (
              <div className="space-y-3">
                {asns
                  .filter((asn: AdvanceShippingNotice) => {
                    if (!asnsSearchTerm.trim()) return true;
                    const query = asnsSearchTerm.toLowerCase();
                    return (
                      asn.purchaseOrderNumber.toLowerCase().includes(query) ||
                      asn.supplierId.toLowerCase().includes(query) ||
                      asn.asnId.toLowerCase().includes(query)
                    );
                  })
                  .slice((asnsCurrentPage - 1) * asnsPerPage, asnsCurrentPage * asnsPerPage)
                  .map((asn: AdvanceShippingNotice) => (
                    <ASNListItem
                      key={asn.asnId}
                      asn={asn}
                      onViewDetails={id => navigate(`/inwards/asn/${id}`)}
                      onStartReceiving={handleStartReceiving}
                    />
                  ))}
                {asns.length === 0 && (
                  <Card variant="glass">
                    <CardContent className="p-12 text-center">
                      <TruckIcon className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-white mb-2">No ASNs</h3>
                      <p className="text-gray-400 mb-4">
                        Create an ASN to track incoming shipments
                      </p>
                      <Button variant="primary" onClick={() => setAsnModalOpen(true)}>
                        <PlusIcon className="h-5 w-5 mr-2" />
                        Create ASN
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {asns.length > asnsPerPage && (
              <div className="flex justify-center">
                <Pagination
                  currentPage={asnsCurrentPage}
                  totalItems={asns.length}
                  pageSize={asnsPerPage}
                  onPageChange={setAsnsCurrentPage}
                />
              </div>
            )}
          </div>
        )}

        {/* Receiving Stage */}
        {currentStage === 'receiving' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-white">Receiving Dock</h2>
                <p className="text-gray-400 text-sm mt-1">Receive and verify incoming goods</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search receipts..."
                    value={receiptsSearchTerm}
                    onChange={e => setReceiptsSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2.5 w-64 bg-gray-700/50 border border-gray-600 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-primary-500/50"
                  />
                </div>
              </div>
            </div>

            {isLoadingReceipts ? (
              <div className="space-y-3">
                <Skeleton variant="rounded" className="h-20" />
                <Skeleton variant="rounded" className="h-20" />
                <Skeleton variant="rounded" className="h-20" />
              </div>
            ) : (
              <div className="space-y-3">
                {receipts
                  .filter((receipt: Receipt) => {
                    if (!receiptsSearchTerm.trim()) return true;
                    const query = receiptsSearchTerm.toLowerCase();
                    return (
                      receipt.receiptId.toLowerCase().includes(query) ||
                      receipt.receiptType.toLowerCase().includes(query)
                    );
                  })
                  .slice(
                    (receiptsCurrentPage - 1) * receiptsPerPage,
                    receiptsCurrentPage * receiptsPerPage
                  )
                  .map((receipt: Receipt) => (
                    <ReceiptListItem
                      key={receipt.receiptId}
                      receipt={receipt}
                      onViewDetails={id => navigate(`/inwards/receipt/${id}`)}
                      onCreateLicensePlate={id => navigate(`/inwards/license-plate/create/${id}`)}
                    />
                  ))}
                {receipts.length === 0 && (
                  <Card variant="glass">
                    <CardContent className="p-12 text-center">
                      <InboxIcon className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-white mb-2">No Receipts</h3>
                      <p className="text-gray-400 mb-4">
                        Create a receipt to record incoming goods
                      </p>
                      <Button variant="primary" onClick={() => setReceiptModalOpen(true)}>
                        <PlusIcon className="h-5 w-5 mr-2" />
                        Create Receipt
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {receipts.length > receiptsPerPage && (
              <div className="flex justify-center">
                <Pagination
                  currentPage={receiptsCurrentPage}
                  totalItems={receipts.length}
                  pageSize={receiptsPerPage}
                  onPageChange={setReceiptsCurrentPage}
                />
              </div>
            )}
          </div>
        )}

        {/* QC Stage */}
        {currentStage === 'qc' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-white">Quality Control</h2>
                <p className="text-gray-400 text-sm mt-1">
                  Inspect received goods for quality compliance
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search inspections..."
                    value={qcSearchTerm}
                    onChange={e => setQcSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2.5 w-64 bg-gray-700/50 border border-gray-600 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-primary-500/50"
                  />
                </div>
              </div>
            </div>

            {isLoadingQC ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <Skeleton variant="rounded" className="h-40" />
                <Skeleton variant="rounded" className="h-40" />
                <Skeleton variant="rounded" className="h-40" />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {qcInspections
                  .filter((i: QualityInspection) => {
                    if (!qcSearchTerm.trim()) return true;
                    const query = qcSearchTerm.toLowerCase();
                    return (
                      i.sku.toLowerCase().includes(query) ||
                      i.inspectionId.toLowerCase().includes(query)
                    );
                  })
                  .slice((qcCurrentPage - 1) * qcPerPage, qcCurrentPage * qcPerPage)
                  .map((inspection: QualityInspection) => (
                    <CompactTaskCard
                      key={inspection.inspectionId}
                      title={inspection.sku}
                      subtitle={`Passed: ${inspection.quantityPassed} | Failed: ${inspection.quantityFailed}`}
                      status={inspection.status}
                      statusType="qc"
                      onAction={() => navigate(`/inwards/qc/${inspection.inspectionId}`)}
                      actionLabel={
                        inspection.status === InspectionStatus.PENDING
                          ? 'Start'
                          : inspection.status === InspectionStatus.IN_PROGRESS
                            ? 'Complete'
                            : undefined
                      }
                      icon={ClipboardDocumentCheckIcon}
                      color={
                        inspection.status === InspectionStatus.PASSED
                          ? 'success'
                          : inspection.status === InspectionStatus.FAILED
                            ? 'error'
                            : inspection.status === InspectionStatus.CONDITIONAL_PASSED
                              ? 'warning'
                              : 'primary'
                      }
                    />
                  ))}
                {qcInspections.length === 0 && (
                  <Card variant="glass" className="md:col-span-2 lg:col-span-3">
                    <CardContent className="p-12 text-center">
                      <ClipboardDocumentCheckIcon className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-white mb-2">No QC Inspections</h3>
                      <p className="text-gray-400">QC inspections will appear after receiving</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {qcInspections.length > qcPerPage && (
              <div className="flex justify-center">
                <Pagination
                  currentPage={qcCurrentPage}
                  totalItems={qcInspections.length}
                  pageSize={qcPerPage}
                  onPageChange={setQcCurrentPage}
                />
              </div>
            )}
          </div>
        )}

        {/* Staging Stage */}
        {currentStage === 'staging' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-white">Staging Areas</h2>
              <p className="text-gray-400 text-sm mt-1">License plates and staging locations</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Staging Locations */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-4">Staging Locations</h3>
                {isLoadingStaging ? (
                  <div className="space-y-3">
                    <Skeleton variant="rounded" className="h-24" />
                    <Skeleton variant="rounded" className="h-24" />
                  </div>
                ) : (
                  <div className="space-y-3">
                    {stagingLocations.slice(0, 5).map((location: StagingLocation) => (
                      <CompactTaskCard
                        key={location.stagingLocationId}
                        title={location.locationCode}
                        subtitle={`Zone: ${location.zone}`}
                        status={location.status}
                        statusType="staging"
                        progress={location.currentOccupancy}
                        total={location.capacity}
                        onAction={() =>
                          navigate(`/inwards/staging/${location.stagingLocationId}/assign`)
                        }
                        actionLabel={
                          location.status === StagingLocationStatus.AVAILABLE ? 'Assign' : undefined
                        }
                        icon={CubeIcon}
                        color={
                          location.status === StagingLocationStatus.AVAILABLE
                            ? 'success'
                            : location.status === StagingLocationStatus.OCCUPIED
                              ? 'warning'
                              : 'error'
                        }
                      />
                    ))}
                    {stagingLocations.length === 0 && (
                      <div className="text-center py-8 text-gray-400">
                        <CubeIcon className="h-12 w-12 mx-auto mb-2 text-gray-600" />
                        <p>No staging locations configured</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* License Plates */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-4">License Plates</h3>
                {isLoadingLicensePlates ? (
                  <div className="space-y-3">
                    <Skeleton variant="rounded" className="h-24" />
                    <Skeleton variant="rounded" className="h-24" />
                  </div>
                ) : (
                  <div className="space-y-3">
                    {licensePlates.slice(0, 5).map((plate: LicensePlate) => (
                      <CompactTaskCard
                        key={plate.licensePlateId}
                        title={plate.barcode}
                        subtitle={`SKU: ${plate.sku}${plate.lotNumber ? ` | Lot: ${plate.lotNumber}` : ''}`}
                        status={plate.status}
                        statusType="license"
                        progress={plate.quantityPutaway}
                        total={plate.quantity}
                        onAction={() => {
                          if (plate.status === LicensePlateStatus.OPEN) {
                            navigate(`/inwards/license-plate/${plate.licensePlateId}/seal`);
                          } else if (plate.status === LicensePlateStatus.SEALED) {
                            navigate(`/inwards/qc/create/${plate.licensePlateId}`);
                          } else if (plate.status === LicensePlateStatus.QC_PASSED) {
                            navigate(`/inwards/staging/assign/${plate.licensePlateId}`);
                          }
                        }}
                        actionLabel={
                          plate.status === LicensePlateStatus.OPEN
                            ? 'Seal'
                            : plate.status === LicensePlateStatus.SEALED
                              ? 'Start QC'
                              : plate.status === LicensePlateStatus.QC_PASSED
                                ? 'Stage'
                                : undefined
                        }
                        icon={TagIcon}
                        color="primary"
                      />
                    ))}
                    {licensePlates.length === 0 && (
                      <div className="text-center py-8 text-gray-400">
                        <TagIcon className="h-12 w-12 mx-auto mb-2 text-gray-600" />
                        <p>No license plates created</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Putaway Stage */}
        {currentStage === 'putaway' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-white">Putaway Tasks</h2>
                <p className="text-gray-400 text-sm mt-1">
                  Store received items in their bin locations
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search tasks..."
                    value={putawaySearchTerm}
                    onChange={e => setPutawaySearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2.5 w-64 bg-gray-700/50 border border-gray-600 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-primary-500/50"
                  />
                </div>
              </div>
            </div>

            {isLoadingPutaway ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <Skeleton variant="rounded" className="h-40" />
                <Skeleton variant="rounded" className="h-40" />
                <Skeleton variant="rounded" className="h-40" />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {putawayTasks
                  .filter((task: PutawayTask) => {
                    if (!putawaySearchTerm.trim()) return true;
                    const query = putawaySearchTerm.toLowerCase();
                    return (
                      task.sku.toLowerCase().includes(query) ||
                      task.targetBinLocation.toLowerCase().includes(query) ||
                      task.putawayTaskId.toLowerCase().includes(query)
                    );
                  })
                  .slice(
                    (putawayCurrentPage - 1) * putawayPerPage,
                    putawayCurrentPage * putawayPerPage
                  )
                  .map((task: PutawayTask) => (
                    <CompactTaskCard
                      key={task.putawayTaskId}
                      title={task.sku}
                      subtitle={`To: ${task.targetBinLocation}${task.assignedTo ? ` | Assigned: ${task.assignedTo}` : ''}`}
                      status={task.status}
                      statusType="putaway"
                      progress={task.quantityPutaway}
                      total={task.quantityToPutaway}
                      onAction={() => {
                        setSelectedPutawayTask(task);
                        setPutawayUpdateModalOpen(true);
                      }}
                      actionLabel="Update"
                      icon={CubeIcon}
                      color="purple"
                    />
                  ))}
                {putawayTasks.length === 0 && (
                  <Card variant="glass" className="md:col-span-2 lg:col-span-3">
                    <CardContent className="p-12 text-center">
                      <CubeIcon className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-white mb-2">No Putaway Tasks</h3>
                      <p className="text-gray-400">
                        Putaway tasks will appear after receiving goods
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {putawayTasks.length > putawayPerPage && (
              <div className="flex justify-center">
                <Pagination
                  currentPage={putawayCurrentPage}
                  totalItems={putawayTasks.length}
                  pageSize={putawayPerPage}
                  onPageChange={setPutawayCurrentPage}
                />
              </div>
            )}
          </div>
        )}

        {/* Exceptions Stage */}
        {currentStage === 'exceptions' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-white">Receiving Exceptions</h2>
                <p className="text-gray-400 text-sm mt-1">
                  Manage receiving discrepancies and exceptions
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search exceptions..."
                    value={exceptionsSearchTerm}
                    onChange={e => setExceptionsSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2.5 w-64 bg-gray-700/50 border border-gray-600 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-primary-500/50"
                  />
                </div>
              </div>
            </div>

            {isLoadingExceptions ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Skeleton variant="rounded" className="h-40" />
                <Skeleton variant="rounded" className="h-40" />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {receivingExceptions
                  .filter((exception: ReceivingException) => {
                    if (!exceptionsSearchTerm.trim()) return true;
                    const query = exceptionsSearchTerm.toLowerCase();
                    return (
                      exception.sku.toLowerCase().includes(query) ||
                      exception.exceptionType.toLowerCase().includes(query) ||
                      exception.exceptionId.toLowerCase().includes(query)
                    );
                  })
                  .slice(
                    (exceptionsCurrentPage - 1) * exceptionsPerPage,
                    exceptionsCurrentPage * exceptionsPerPage
                  )
                  .map((exception: ReceivingException) => (
                    <ExceptionCard
                      key={exception.exceptionId}
                      exception={exception}
                      onInvestigate={id => navigate(`/inwards/exceptions/${id}`)}
                      onResolve={id => navigate(`/inwards/exceptions/${id}/resolve`)}
                    />
                  ))}
                {receivingExceptions.length === 0 && (
                  <Card variant="glass" className="md:col-span-2">
                    <CardContent className="p-12 text-center">
                      <ExclamationTriangleIcon className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-white mb-2">No Exceptions</h3>
                      <p className="text-gray-400">No receiving exceptions to display</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {receivingExceptions.length > exceptionsPerPage && (
              <div className="flex justify-center">
                <Pagination
                  currentPage={exceptionsCurrentPage}
                  totalItems={receivingExceptions.length}
                  pageSize={exceptionsPerPage}
                  onPageChange={setExceptionsCurrentPage}
                />
              </div>
            )}
          </div>
        )}
      </main>

      {/* Modals */}
      {asnModalOpen && (
        <CreateASNModal onClose={() => setAsnModalOpen(false)} onSuccess={() => refetchAsns()} />
      )}
      {receiptModalOpen && (
        <CreateReceiptModal
          asnId={undefined}
          onClose={() => setReceiptModalOpen(false)}
          onSuccess={() => refetchReceipts()}
        />
      )}
      {putawayUpdateModalOpen && selectedPutawayTask && (
        <UpdatePutawayTaskModal
          task={selectedPutawayTask}
          onClose={() => {
            setPutawayUpdateModalOpen(false);
            setSelectedPutawayTask(null);
          }}
          onSuccess={() => refetchPutawayTasks()}
        />
      )}

      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={confirmDialogOpen}
        onClose={() => {
          setConfirmDialogOpen(false);
          setPendingAsnId(null);
        }}
        onConfirm={handleConfirmStartReceiving}
        title="Start Receiving Process"
        message="This will mark the ASN as received and create a receipt. Are you sure you want to proceed?"
        confirmText="Start Receiving"
        cancelText="Cancel"
        variant="info"
        isLoading={updateASNStatus.isPending}
      />
    </div>
  );
}

export default InwardsGoodsPage;
