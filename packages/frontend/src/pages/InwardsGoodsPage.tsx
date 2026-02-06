/**
 * Inwards Goods page
 *
 * Comprehensive inbound receiving interface for inwards goods personnel
 * Features: ASN management, receiving workflow, QC inspection, staging, license plating, putaway tasks
 * - Industry-standard tabbed navigation
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

type TabStage = 'dashboard' | 'asn' | 'receiving' | 'qc' | 'staging' | 'exceptions' | 'putaway';

interface TabConfig {
  id: TabStage;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  badge?: string;
}

// ============================================================================
// SUBCOMPONENTS - Segmented Tab Navigation
// ============================================================================

function SegmentedTab({
  tab,
  isActive,
  onClick,
  badge,
}: {
  tab: TabConfig;
  isActive: boolean;
  onClick: () => void;
  badge?: string;
}) {
  const TabIcon = tab.icon;

  return (
    <button
      onClick={onClick}
      className={`relative flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all duration-200 ${
        isActive
          ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/30'
          : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
      }`}
    >
      <TabIcon className="h-4 w-4" />
      <span className="text-sm">{tab.label}</span>
      {badge && (
        <span
          className={`ml-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
            isActive ? 'bg-white/20 text-white' : 'bg-primary-500/20 text-primary-400'
          }`}
        >
          {badge}
        </span>
      )}
    </button>
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
}: {
  title: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  color?: 'primary' | 'success' | 'warning' | 'error';
  trend?: string;
}) {
  const colorStyles = {
    primary: 'from-primary-500/20 to-primary-500/5 border-primary-500/30',
    success: 'from-success-500/20 to-success-500/5 border-success-500/30',
    warning: 'from-warning-500/20 to-warning-500/5 border-warning-500/30',
    error: 'from-error-500/20 to-error-500/5 border-error-500/30',
  };

  return (
    <div className={`bg-gradient-to-br ${colorStyles[color]} border rounded-xl p-5 card-hover`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs text-gray-400 uppercase tracking-wider font-medium">{title}</p>
          <p className="mt-2 text-3xl font-bold text-white">{value}</p>
          {trend && <p className="mt-1 text-xs text-gray-400">{trend}</p>}
        </div>
        <div
          className={`p-3 rounded-lg ${
            color === 'primary'
              ? 'bg-primary-500/20'
              : color === 'success'
                ? 'bg-success-500/20'
                : color === 'warning'
                  ? 'bg-warning-500/20'
                  : 'bg-error-500/20'
          }`}
        >
          <Icon className={`h-5 w-5 text-${color === 'primary' ? 'primary' : color}-400`} />
        </div>
      </div>
    </div>
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
    const baseStyles = 'px-3 py-1 rounded-full text-xs font-medium border';

    if (type === 'asn') {
      switch (status) {
        case ASNStatus.PENDING:
          return `${baseStyles} bg-gray-500/20 text-gray-300 border-gray-500/30`;
        case ASNStatus.IN_TRANSIT:
          return `${baseStyles} bg-blue-500/20 text-blue-300 border-blue-500/30`;
        case ASNStatus.RECEIVED:
          return `${baseStyles} bg-success-500/20 text-success-300 border-success-500/30`;
        case ASNStatus.PARTIALLY_RECEIVED:
          return `${baseStyles} bg-warning-500/20 text-warning-300 border-warning-500/30`;
        case ASNStatus.CANCELLED:
          return `${baseStyles} bg-error-500/20 text-error-300 border-error-500/30`;
        default:
          return `${baseStyles} bg-gray-500/20 text-gray-300`;
      }
    } else if (type === 'receipt') {
      switch (status) {
        case ReceiptStatus.RECEIVING:
          return `${baseStyles} bg-blue-500/20 text-blue-300 border-blue-500/30`;
        case ReceiptStatus.COMPLETED:
          return `${baseStyles} bg-success-500/20 text-success-300 border-success-500/30`;
        case ReceiptStatus.CANCELLED:
          return `${baseStyles} bg-error-500/20 text-error-300 border-error-500/30`;
        default:
          return `${baseStyles} bg-gray-500/20 text-gray-300`;
      }
    } else if (type === 'putaway') {
      switch (status) {
        case PutawayStatus.PENDING:
          return `${baseStyles} bg-gray-500/20 text-gray-300 border-gray-500/30`;
        case PutawayStatus.IN_PROGRESS:
          return `${baseStyles} bg-blue-500/20 text-blue-300 border-blue-500/30`;
        case PutawayStatus.COMPLETED:
          return `${baseStyles} bg-success-500/20 text-success-300 border-success-500/30`;
        case PutawayStatus.CANCELLED:
          return `${baseStyles} bg-error-500/20 text-error-300 border-error-500/30`;
        default:
          return `${baseStyles} bg-gray-500/20 text-gray-300`;
      }
    } else if (type === 'qc') {
      switch (status) {
        case QualityStatus.PENDING:
          return `${baseStyles} bg-gray-500/20 text-gray-300 border-gray-500/30`;
        case QualityStatus.PASSED:
          return `${baseStyles} bg-success-500/20 text-success-300 border-success-500/30`;
        case QualityStatus.FAILED:
          return `${baseStyles} bg-error-500/20 text-error-300 border-error-500/30`;
        case QualityStatus.PARTIAL:
          return `${baseStyles} bg-warning-500/20 text-warning-300 border-warning-500/30`;
        default:
          return `${baseStyles} bg-gray-500/20 text-gray-300`;
      }
    } else if (type === 'license') {
      switch (status) {
        case LicensePlateStatus.OPEN:
          return `${baseStyles} bg-gray-500/20 text-gray-300 border-gray-500/30`;
        case LicensePlateStatus.SEALED:
          return `${baseStyles} bg-blue-500/20 text-blue-300 border-blue-500/30`;
        case LicensePlateStatus.IN_QC:
          return `${baseStyles} bg-purple-500/20 text-purple-300 border-purple-500/30`;
        case LicensePlateStatus.QC_PASSED:
          return `${baseStyles} bg-success-500/20 text-success-300 border-success-500/30`;
        case LicensePlateStatus.QC_FAILED:
          return `${baseStyles} bg-error-500/20 text-error-300 border-error-500/30`;
        case LicensePlateStatus.IN_STAGING:
          return `${baseStyles} bg-orange-500/20 text-orange-300 border-orange-500/30`;
        case LicensePlateStatus.PUTAWAY_COMPLETE:
          return `${baseStyles} bg-success-500/20 text-success-300 border-success-500/30`;
        case LicensePlateStatus.CLOSED:
          return `${baseStyles} bg-gray-500/20 text-gray-400 border-gray-500/30`;
        default:
          return `${baseStyles} bg-gray-500/20 text-gray-300`;
      }
    } else if (type === 'staging') {
      switch (status) {
        case StagingLocationStatus.AVAILABLE:
          return `${baseStyles} bg-success-500/20 text-success-300 border-success-500/30`;
        case StagingLocationStatus.OCCUPIED:
          return `${baseStyles} bg-warning-500/20 text-warning-300 border-warning-500/30`;
        case StagingLocationStatus.RESERVED:
          return `${baseStyles} bg-blue-500/20 text-blue-300 border-blue-500/30`;
        case StagingLocationStatus.BLOCKED:
          return `${baseStyles} bg-error-500/20 text-error-300 border-error-500/30`;
        default:
          return `${baseStyles} bg-gray-500/20 text-gray-300`;
      }
    } else if (type === 'exception') {
      switch (status) {
        case ReceivingExceptionStatus.OPEN:
          return `${baseStyles} bg-error-500/20 text-error-300 border-error-500/30`;
        case ReceivingExceptionStatus.INVESTIGATING:
          return `${baseStyles} bg-blue-500/20 text-blue-300 border-blue-500/30`;
        case ReceivingExceptionStatus.AWAITING_DECISION:
          return `${baseStyles} bg-warning-500/20 text-warning-300 border-warning-500/30`;
        case ReceivingExceptionStatus.RESOLVED:
          return `${baseStyles} bg-success-500/20 text-success-300 border-success-500/30`;
        case ReceivingExceptionStatus.CANCELLED:
          return `${baseStyles} bg-gray-500/20 text-gray-400 border-gray-500/30`;
        default:
          return `${baseStyles} bg-gray-500/20 text-gray-300`;
      }
    }
    return `${baseStyles} bg-gray-500/20 text-gray-300`;
  };

  return <span className={getStatusStyles()}>{status.replace(/_/g, ' ')}</span>;
}

// ============================================================================
// SUBCOMPONENTS - Cards for each entity type
// ============================================================================

function ASNCard({
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

  return (
    <Card variant="glass" className="card-hover border-l-4 border-l-blue-500">
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="text-lg font-semibold text-white">{asn.purchaseOrderNumber}</h3>
              <StatusBadge status={asn.status} type="asn" />
            </div>
            <p className="text-sm text-gray-400">Supplier: {asn.supplierId}</p>
          </div>
          <TruckIcon className="h-8 w-8 text-blue-400 flex-shrink-0" />
        </div>

        <div className="grid grid-cols-3 gap-4 mb-4 text-sm bg-white/5 p-3 rounded-lg">
          <div>
            <p className="text-gray-400 text-xs">Expected</p>
            <p className="text-white font-medium">
              {new Date(asn.expectedArrivalDate).toLocaleDateString()}
            </p>
          </div>
          <div>
            <p className="text-gray-400 text-xs">Items</p>
            <p className="text-white font-medium">
              {itemCount} ({totalExpected} units)
            </p>
          </div>
          <div>
            <p className="text-gray-400 text-xs">Carrier</p>
            <p className="text-white font-medium">{asn.carrier || 'TBD'}</p>
          </div>
        </div>

        {asn.status === ASNStatus.IN_TRANSIT && (
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onViewDetails(asn.asnId)}
              className="flex-1"
            >
              View Details
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => onStartReceiving(asn.asnId)}
              className="flex-1"
            >
              <InboxIcon className="h-4 w-4 mr-1" />
              Start Receiving
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ReceiptCard({
  receipt,
  onViewDetails,
  onCreateLicensePlate,
}: {
  receipt: Receipt;
  onViewDetails: (receiptId: string) => void;
  onCreateLicensePlate?: (receiptId: string) => void;
}) {
  const itemCount = receipt.lineItems?.length || 0;
  const hasExceptions =
    receipt.lineItems?.some(
      item => item.quantityDamaged > 0 || item.quantityReceived !== item.quantityOrdered
    ) || false;

  return (
    <Card
      variant="glass"
      className={`card-hover border-l-4 ${hasExceptions ? 'border-l-warning-500' : 'border-l-orange-500'}`}
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="text-lg font-semibold text-white">{receipt.receiptId}</h3>
              <StatusBadge status={receipt.status} type="receipt" />
              {hasExceptions && (
                <span className="px-2 py-1 rounded-full text-xs font-medium bg-warning-500/20 text-warning-300 border border-warning-500/30">
                  Exceptions
                </span>
              )}
            </div>
            <p className="text-sm text-gray-400">
              {new Date(receipt.receiptDate).toLocaleString()}
            </p>
          </div>
          <InboxIcon className="h-8 w-8 text-orange-400 flex-shrink-0" />
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4 text-sm bg-white/5 p-3 rounded-lg">
          <div>
            <p className="text-gray-400 text-xs">Type</p>
            <p className="text-white font-medium">{receipt.receiptType}</p>
          </div>
          <div>
            <p className="text-gray-400 text-xs">Items</p>
            <p className="text-white font-medium">{itemCount}</p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onViewDetails(receipt.receiptId)}
            className="flex-1"
          >
            View Details
          </Button>
          {onCreateLicensePlate && receipt.status === ReceiptStatus.RECEIVING && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => onCreateLicensePlate(receipt.receiptId)}
              className="flex-1"
            >
              <TagIcon className="h-4 w-4 mr-1" />
              Create License Plate
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function LicensePlateCard({
  plate,
  onSeal,
  onStartQC,
  onAssignToStaging,
}: {
  plate: LicensePlate;
  onSeal: (plateId: string) => void;
  onStartQC: (plateId: string) => void;
  onAssignToStaging: (plateId: string) => void;
}) {
  const progress =
    plate.quantity > 0 ? Math.round((plate.quantityPutaway / plate.quantity) * 100) : 0;

  return (
    <Card variant="glass" className="card-hover border-l-4 border-l-purple-500">
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="text-lg font-semibold text-white truncate">{plate.barcode}</h3>
              <StatusBadge status={plate.status} type="license" />
            </div>
            <p className="text-sm text-gray-400 truncate">SKU: {plate.sku}</p>
            {plate.lotNumber && <p className="text-xs text-gray-500">Lot: {plate.lotNumber}</p>}
          </div>
          <TagIcon className="h-8 w-8 text-purple-400 flex-shrink-0" />
        </div>

        <div className="mb-4">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-400">Putaway Progress</span>
            <span className="text-white font-medium">
              {plate.quantityPutaway} / {plate.quantity}
            </span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div
              className="bg-purple-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="flex gap-2">
          {plate.status === LicensePlateStatus.OPEN && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => onSeal(plate.licensePlateId)}
              className="flex-1"
            >
              Seal Plate
            </Button>
          )}
          {plate.status === LicensePlateStatus.SEALED && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => onStartQC(plate.licensePlateId)}
              className="flex-1"
            >
              Start QC
            </Button>
          )}
          {plate.status === LicensePlateStatus.QC_PASSED && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => onAssignToStaging(plate.licensePlateId)}
              className="flex-1"
            >
              Assign to Staging
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function QCInspectionCard({
  inspection,
  onStartInspection,
  onCompleteInspection,
}: {
  inspection: QualityInspection;
  onStartInspection: (inspectionId: string) => void;
  onCompleteInspection: (inspectionId: string) => void;
}) {
  return (
    <Card variant="glass" className="card-hover border-l-4 border-l-green-500">
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="text-lg font-semibold text-white">{inspection.sku}</h3>
              <StatusBadge status={inspection.status} type="qc" />
            </div>
            <p className="text-sm text-gray-400">
              Qty: {inspection.quantityInspected} | Passed: {inspection.quantityPassed} | Failed:{' '}
              {inspection.quantityFailed}
            </p>
          </div>
          <ClipboardDocumentCheckIcon className="h-8 w-8 text-green-400 flex-shrink-0" />
        </div>

        <div className="flex gap-2">
          {inspection.status === InspectionStatus.PENDING && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => onStartInspection(inspection.inspectionId)}
              className="flex-1"
            >
              Start Inspection
            </Button>
          )}
          {inspection.status === InspectionStatus.IN_PROGRESS && (
            <Button
              variant="success"
              size="sm"
              onClick={() => onCompleteInspection(inspection.inspectionId)}
              className="flex-1"
            >
              Complete QC
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function StagingLocationCard({
  location,
  onAssign,
}: {
  location: StagingLocation;
  onAssign: (locationId: string) => void;
}) {
  const occupancyPercent = (location.currentOccupancy / location.capacity) * 100;

  return (
    <Card variant="glass" className="card-hover border-l-4 border-l-orange-500">
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="text-lg font-semibold text-white">{location.locationCode}</h3>
              <StatusBadge status={location.status} type="staging" />
            </div>
            <p className="text-sm text-gray-400">Zone: {location.zone}</p>
          </div>
          <CubeIcon className="h-8 w-8 text-orange-400 flex-shrink-0" />
        </div>

        <div className="mb-4">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-400">Occupancy</span>
            <span className="text-white font-medium">
              {location.currentOccupancy} / {location.capacity}
            </span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-300 ${
                occupancyPercent > 90
                  ? 'bg-error-500'
                  : occupancyPercent > 70
                    ? 'bg-warning-500'
                    : 'bg-success-500'
              }`}
              style={{ width: `${occupancyPercent}%` }}
            />
          </div>
        </div>

        {location.status === StagingLocationStatus.AVAILABLE && (
          <Button
            variant="primary"
            size="sm"
            onClick={() => onAssign(location.stagingLocationId)}
            className="w-full"
          >
            Assign License Plate
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

function ReceivingExceptionCard({
  exception,
  onInvestigate,
  onResolve,
}: {
  exception: ReceivingException;
  onInvestigate: (exceptionId: string) => void;
  onResolve: (exceptionId: string) => void;
}) {
  return (
    <Card variant="glass" className="card-hover border-l-4 border-l-red-500">
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="text-lg font-semibold text-white">{exception.sku}</h3>
              <StatusBadge status={exception.status} type="exception" />
            </div>
            <p className="text-sm text-red-400 font-medium">
              {exception.exceptionType.replace(/_/g, ' ')}
            </p>
          </div>
          <ExclamationTriangleIcon className="h-8 w-8 text-red-400 flex-shrink-0" />
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4 text-sm bg-white/5 p-3 rounded-lg">
          <div>
            <p className="text-gray-400 text-xs">Expected</p>
            <p className="text-white font-medium">{exception.expectedQuantity}</p>
          </div>
          <div>
            <p className="text-gray-400 text-xs">Actual</p>
            <p className="text-white font-medium">{exception.actualQuantity}</p>
          </div>
        </div>

        <p className="text-sm text-gray-300 mb-4 line-clamp-2">{exception.description}</p>

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
      </CardContent>
    </Card>
  );
}

function PutawayTaskCard({
  task,
  onAssign,
  onUpdate,
}: {
  task: PutawayTask;
  onAssign: (taskId: string) => void;
  onUpdate: (taskId: string) => void;
}) {
  const progress =
    task.quantityToPutaway > 0
      ? Math.round((task.quantityPutaway / task.quantityToPutaway) * 100)
      : 0;

  return (
    <Card variant="glass" className="card-hover border-l-4 border-l-purple-500">
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="text-lg font-semibold text-white">{task.sku}</h3>
              <StatusBadge status={task.status} type="putaway" />
            </div>
            <p className="text-sm text-gray-400">
              Target: <span className="text-white font-medium">{task.targetBinLocation}</span>
            </p>
          </div>
          <CubeIcon className="h-8 w-8 text-purple-400 flex-shrink-0" />
        </div>

        <div className="mb-4">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-400">Progress</span>
            <span className="text-white font-medium">
              {task.quantityPutaway} / {task.quantityToPutaway}
            </span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div
              className="bg-purple-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="flex gap-2">
          {task.status === PutawayStatus.PENDING && !task.assignedTo && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => onAssign(task.putawayTaskId)}
              className="flex-1"
            >
              Assign Task
            </Button>
          )}
          {task.assignedTo && task.status === PutawayStatus.IN_PROGRESS && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => onUpdate(task.putawayTaskId)}
              className="flex-1"
            >
              Update Progress
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
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
            <CardTitle>Create ASN</CardTitle>
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
                className={`w-full px-3 py-2 bg-white/5 border rounded-lg text-white ${
                  errors.supplierId ? 'border-red-500' : 'border-white/10'
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
                className={`w-full px-3 py-2 bg-white/5 border rounded-lg text-white ${
                  errors.poNumber ? 'border-red-500' : 'border-white/10'
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
                className={`w-full px-3 py-2 bg-white/5 border rounded-lg text-white ${
                  errors.expectedDate ? 'border-red-500' : 'border-white/10'
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
                {isSubmitting || createASN.isPending ? 'Creating...' : 'Create'}
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
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
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
                className={`w-full px-3 py-2 bg-white/5 border rounded-lg text-white ${
                  errors.quantityPutaway ? 'border-red-500' : 'border-white/10'
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
  const currentStage = (searchParams.get('tab') as TabStage) || 'dashboard';
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
  const [stagingSearchTerm, setStagingSearchTerm] = useState('');
  const [exceptionsSearchTerm, setExceptionsSearchTerm] = useState('');

  // Pagination states
  const [asnsCurrentPage, setAsnsCurrentPage] = useState(1);
  const asnsPerPage = 6;
  const [receiptsCurrentPage, setReceiptsCurrentPage] = useState(1);
  const receiptsPerPage = 6;
  const [putawayCurrentPage, setPutawayCurrentPage] = useState(1);
  const putawayPerPage = 6;
  const [qcCurrentPage, setQcCurrentPage] = useState(1);
  const qcPerPage = 6;
  const [exceptionsCurrentPage, setExceptionsCurrentPage] = useState(1);
  const exceptionsPerPage = 6;

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
    enabled: currentStage === 'asn',
  });
  const {
    data: receiptsData,
    refetch: refetchReceipts,
    isLoading: isLoadingReceipts,
  } = useReceipts({
    enabled: currentStage === 'receiving',
  });
  const {
    data: putawayData,
    refetch: refetchPutawayTasks,
    isLoading: isLoadingPutaway,
  } = usePutawayTasks({
    enabled: currentStage === 'putaway',
  });
  const { data: qcData, isLoading: isLoadingQC } = useQualityInspections({
    referenceId: currentStage === 'qc' ? 'all' : undefined,
    status: currentStage === 'qc' ? undefined : undefined,
    enabled: currentStage === 'qc',
  });
  const { data: licensePlatesData, isLoading: isLoadingLicensePlates } = useLicensePlates({
    enabled: currentStage === 'qc' || currentStage === 'staging',
  });
  const { data: stagingData, isLoading: isLoadingStaging } = useStagingLocations({
    enabled: currentStage === 'staging',
  });
  const { data: exceptionsData, isLoading: isLoadingExceptions } = useReceivingExceptions({
    enabled: currentStage === 'exceptions',
  });

  // Extract arrays from paginated responses
  const asns = asnsData?.asns ?? [];
  const receipts = receiptsData?.receipts ?? [];
  const putawayTasks = putawayData?.tasks ?? [];
  const qcInspections = qcData?.inspections ?? [];
  const licensePlates = licensePlatesData?.licensePlates ?? [];
  const stagingLocations = stagingData?.stagingLocations ?? [];
  const receivingExceptions = exceptionsData?.exceptions ?? [];

  // Calculate badges for tabs
  const inTransitAsnCount = asns.filter(
    (a: AdvanceShippingNotice) => a.status === ASNStatus.IN_TRANSIT
  ).length;
  const activeReceiptsCount = receipts.filter(
    (r: Receipt) => r.status === ReceiptStatus.RECEIVING
  ).length;
  const pendingQcCount = qcInspections.filter(
    (i: QualityInspection) => i.status === InspectionStatus.PENDING
  ).length;
  const openStagingCount = stagingLocations.filter(
    (l: StagingLocation) => l.status === StagingLocationStatus.AVAILABLE
  ).length;
  const openExceptionsCount = receivingExceptions.filter(
    (e: ReceivingException) => e.status === ReceivingExceptionStatus.OPEN
  ).length;
  const pendingPutawayCount = putawayTasks.filter(
    (t: PutawayTask) => t.status === PutawayStatus.PENDING
  ).length;

  const updateASNStatus = useUpdateASNStatus();

  const tabs: TabConfig[] = [
    {
      id: 'dashboard',
      label: 'Overview',
      icon: CubeIcon,
      description: 'Dashboard and metrics',
    },
    {
      id: 'asn',
      label: 'ASN',
      icon: TruckIcon,
      description: 'Advance Shipping Notices',
      badge: inTransitAsnCount > 0 ? String(inTransitAsnCount) : undefined,
    },
    {
      id: 'receiving',
      label: 'Receiving',
      icon: InboxIcon,
      description: 'Receive incoming goods',
      badge: activeReceiptsCount > 0 ? String(activeReceiptsCount) : undefined,
    },
    {
      id: 'qc',
      label: 'QC Inspection',
      icon: ClipboardDocumentCheckIcon,
      description: 'Quality control checks',
      badge: pendingQcCount > 0 ? String(pendingQcCount) : undefined,
    },
    {
      id: 'staging',
      label: 'Staging',
      icon: TagIcon,
      description: 'License plates & staging',
      badge: openStagingCount > 0 ? String(openStagingCount) : undefined,
    },
    {
      id: 'exceptions',
      label: 'Exceptions',
      icon: ExclamationTriangleIcon,
      description: 'Receiving discrepancies',
      badge: openExceptionsCount > 0 ? String(openExceptionsCount) : undefined,
    },
    {
      id: 'putaway',
      label: 'Putaway',
      icon: CubeIcon,
      description: 'Store items in bins',
      badge: pendingPutawayCount > 0 ? String(pendingPutawayCount) : undefined,
    },
  ];

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

  // Loading skeleton
  if (isLoadingDashboard && currentStage === 'dashboard') {
    return (
      <div className="min-h-screen">
        <Header />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
          <Skeleton variant="text" className="w-64 h-10 mb-2" />
          <Skeleton variant="text" className="w-96 h-6 mb-6" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
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
        {/* Tabbed Navigation */}
        <div className="mb-8 overflow-x-auto">
          <div className="inline-flex gap-2 bg-white/5 p-2 rounded-xl min-w-full sm:min-w-0">
            {tabs.map(tab => (
              <SegmentedTab
                key={tab.id}
                tab={tab}
                isActive={currentStage === tab.id}
                badge={tab.badge}
                onClick={() => setSearchParams({ tab: tab.id })}
              />
            ))}
          </div>
        </div>

        {/* Dashboard Stage */}
        {currentStage === 'dashboard' && dashboard && (
          <div className="space-y-8">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-white">Receiving Overview</h2>
              <div className="text-sm text-gray-400">
                Track your inbound shipments from ASN to putaway
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <MetricCard
                title="Pending ASNs"
                value={dashboard.pendingASNs}
                icon={TruckIcon}
                color="primary"
              />
              <MetricCard
                title="Active Receipts"
                value={dashboard.activeReceipts}
                icon={InboxIcon}
                color="warning"
              />
              <MetricCard
                title="Pending QC"
                value={pendingQcCount}
                icon={ClipboardDocumentCheckIcon}
                color="error"
              />
              <MetricCard
                title="Pending Putaway"
                value={dashboard.pendingPutaway}
                icon={CubeIcon}
                color="success"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <MetricCard
                title="Open Exceptions"
                value={openExceptionsCount}
                icon={ExclamationTriangleIcon}
                color="error"
              />
              <MetricCard
                title="License Plates"
                value={licensePlates.length}
                icon={TagIcon}
                color="primary"
              />
              <MetricCard
                title="Available Staging"
                value={openStagingCount}
                icon={CubeIcon}
                color="success"
              />
            </div>

            <Card variant="glass">
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Button
                    variant="primary"
                    size="lg"
                    onClick={() => setAsnModalOpen(true)}
                    className="flex items-center justify-center gap-2"
                  >
                    <PlusIcon className="h-5 w-5" />
                    New ASN
                  </Button>
                  <Button
                    variant="secondary"
                    size="lg"
                    onClick={() => setReceiptModalOpen(true)}
                    className="flex items-center justify-center gap-2"
                  >
                    <InboxIcon className="h-5 w-5" />
                    New Receipt
                  </Button>
                  <Button
                    variant="secondary"
                    size="lg"
                    onClick={() => setSearchParams({ tab: 'exceptions' })}
                    className="flex items-center justify-center gap-2"
                  >
                    <ExclamationTriangleIcon className="h-5 w-5" />
                    View Exceptions
                  </Button>
                  <Button
                    variant="secondary"
                    size="lg"
                    onClick={() => setSearchParams({ tab: 'putaway' })}
                    className="flex items-center justify-center gap-2"
                  >
                    <CubeIcon className="h-5 w-5" />
                    View Putaway
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ASN Stage */}
        {currentStage === 'asn' && (
          <InwardsStageContent
            title="Advance Shipping Notices"
            subtitle="Track incoming shipments before arrival"
            searchTerm={asnsSearchTerm}
            onSearchChange={setAsnsSearchTerm}
            onAddNew={() => setAsnModalOpen(true)}
            addNewLabel="New ASN"
            isLoading={isLoadingASNs}
            items={asns}
            currentPage={asnsCurrentPage}
            setCurrentPage={setAsnsCurrentPage}
            itemsPerPage={asnsPerPage}
            renderCard={(asn: AdvanceShippingNotice) => (
              <ASNCard
                key={asn.asnId}
                asn={asn}
                onViewDetails={id => navigate(`/inwards/asn/${id}`)}
                onStartReceiving={handleStartReceiving}
              />
            )}
            emptyIcon={TruckIcon}
            emptyTitle="No ASNs"
            emptyDescription="Create an ASN to track incoming shipments"
          />
        )}

        {/* Receiving Stage */}
        {currentStage === 'receiving' && (
          <InwardsStageContent
            title="Receiving Dock"
            subtitle="Receive and verify incoming goods"
            searchTerm={receiptsSearchTerm}
            onSearchChange={setReceiptsSearchTerm}
            onAddNew={() => setReceiptModalOpen(true)}
            addNewLabel="New Receipt"
            isLoading={isLoadingReceipts}
            items={receipts}
            currentPage={receiptsCurrentPage}
            setCurrentPage={setReceiptsCurrentPage}
            itemsPerPage={receiptsPerPage}
            renderCard={(receipt: Receipt) => (
              <ReceiptCard
                key={receipt.receiptId}
                receipt={receipt}
                onViewDetails={id => navigate(`/inwards/receipt/${id}`)}
                onCreateLicensePlate={id => navigate(`/inwards/license-plate/create/${id}`)}
              />
            )}
            emptyIcon={InboxIcon}
            emptyTitle="No Receipts"
            emptyDescription="Create a receipt to record incoming goods"
          />
        )}

        {/* QC Inspection Stage */}
        {currentStage === 'qc' && (
          <InwardsStageContent
            title="Quality Control Inspection"
            subtitle="Inspect received goods for quality compliance"
            searchTerm={qcSearchTerm}
            onSearchChange={setQcSearchTerm}
            addNewLabel={undefined}
            isLoading={isLoadingQC}
            items={qcInspections}
            currentPage={qcCurrentPage}
            setCurrentPage={setQcCurrentPage}
            itemsPerPage={qcPerPage}
            renderCard={(inspection: QualityInspection) => (
              <QCInspectionCard
                key={inspection.inspectionId}
                inspection={inspection}
                onStartInspection={id => navigate(`/inwards/qc/${id}`)}
                onCompleteInspection={id => navigate(`/inwards/qc/${id}/complete`)}
              />
            )}
            emptyIcon={ClipboardDocumentCheckIcon}
            emptyTitle="No QC Inspections"
            emptyDescription="QC inspections will appear after receiving"
          />
        )}

        {/* Staging Stage */}
        {currentStage === 'staging' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-white">Staging Areas</h2>
                <p className="text-gray-400 text-sm mt-1">License plates and staging locations</p>
              </div>
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search..."
                  aria-label="Search staging"
                  value={stagingSearchTerm}
                  onChange={e => setStagingSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2.5 w-full sm:w-64 bg-white/[0.05] border border-white/[0.08] rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-primary-500/50 focus:bg-white/[0.08] transition-all duration-300"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Staging Locations */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white">Staging Locations</h3>
                {isLoadingStaging ? (
                  <div className="space-y-4">
                    <Skeleton variant="rounded" className="h-40" />
                    <Skeleton variant="rounded" className="h-40" />
                  </div>
                ) : stagingLocations.length > 0 ? (
                  stagingLocations
                    .filter((l: StagingLocation) => {
                      if (!stagingSearchTerm.trim()) return true;
                      const query = stagingSearchTerm.toLowerCase();
                      return (
                        l.locationCode.toLowerCase().includes(query) ||
                        l.zone.toLowerCase().includes(query)
                      );
                    })
                    .slice(0, 4)
                    .map((location: StagingLocation) => (
                      <StagingLocationCard
                        key={location.stagingLocationId}
                        location={location}
                        onAssign={() =>
                          navigate(`/inwards/staging/${location.stagingLocationId}/assign`)
                        }
                      />
                    ))
                ) : (
                  <Card variant="glass">
                    <CardContent className="p-8 text-center">
                      <CubeIcon className="h-12 w-12 text-gray-600 mx-auto mb-3" />
                      <p className="text-gray-400">No staging locations configured</p>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* License Plates */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white">License Plates</h3>
                {isLoadingLicensePlates ? (
                  <div className="space-y-4">
                    <Skeleton variant="rounded" className="h-40" />
                    <Skeleton variant="rounded" className="h-40" />
                  </div>
                ) : licensePlates.length > 0 ? (
                  licensePlates
                    .filter((p: LicensePlate) => {
                      if (!stagingSearchTerm.trim()) return true;
                      const query = stagingSearchTerm.toLowerCase();
                      return (
                        p.barcode.toLowerCase().includes(query) ||
                        p.sku.toLowerCase().includes(query)
                      );
                    })
                    .slice(0, 4)
                    .map((plate: LicensePlate) => (
                      <LicensePlateCard
                        key={plate.licensePlateId}
                        plate={plate}
                        onSeal={() =>
                          navigate(`/inwards/license-plate/${plate.licensePlateId}/seal`)
                        }
                        onStartQC={() => navigate(`/inwards/qc/create/${plate.licensePlateId}`)}
                        onAssignToStaging={() =>
                          navigate(`/inwards/staging/assign/${plate.licensePlateId}`)
                        }
                      />
                    ))
                ) : (
                  <Card variant="glass">
                    <CardContent className="p-8 text-center">
                      <TagIcon className="h-12 w-12 text-gray-600 mx-auto mb-3" />
                      <p className="text-gray-400">No license plates created</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Exceptions Stage */}
        {currentStage === 'exceptions' && (
          <InwardsStageContent
            title="Receiving Exceptions"
            subtitle="Manage receiving discrepancies and exceptions"
            searchTerm={exceptionsSearchTerm}
            onSearchChange={setExceptionsSearchTerm}
            addNewLabel={undefined}
            isLoading={isLoadingExceptions}
            items={receivingExceptions}
            currentPage={exceptionsCurrentPage}
            setCurrentPage={setExceptionsCurrentPage}
            itemsPerPage={exceptionsPerPage}
            renderCard={(exception: ReceivingException) => (
              <ReceivingExceptionCard
                key={exception.exceptionId}
                exception={exception}
                onInvestigate={id => navigate(`/inwards/exceptions/${id}`)}
                onResolve={id => navigate(`/inwards/exceptions/${id}/resolve`)}
              />
            )}
            emptyIcon={ExclamationTriangleIcon}
            emptyTitle="No Exceptions"
            emptyDescription="No receiving exceptions to display"
          />
        )}

        {/* Putaway Stage */}
        {currentStage === 'putaway' && (
          <InwardsStageContent
            title="Putaway Tasks"
            subtitle="Store received items in their bin locations"
            searchTerm={putawaySearchTerm}
            onSearchChange={setPutawaySearchTerm}
            addNewLabel={undefined}
            isLoading={isLoadingPutaway}
            items={putawayTasks}
            currentPage={putawayCurrentPage}
            setCurrentPage={setPutawayCurrentPage}
            itemsPerPage={putawayPerPage}
            renderCard={(task: PutawayTask) => (
              <PutawayTaskCard
                key={task.putawayTaskId}
                task={task}
                onAssign={id => navigate(`/inwards/putaway/${id}`)}
                onUpdate={() => {
                  setSelectedPutawayTask(task);
                  setPutawayUpdateModalOpen(true);
                }}
              />
            )}
            emptyIcon={CubeIcon}
            emptyTitle="No Putaway Tasks"
            emptyDescription="Putaway tasks appear after receiving goods"
          />
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

// ============================================================================
// HELPER COMPONENT - Stage Content Layout
// ============================================================================

function InwardsStageContent<T>({
  title,
  subtitle,
  searchTerm,
  onSearchChange,
  onAddNew,
  addNewLabel,
  isLoading,
  items,
  currentPage,
  setCurrentPage,
  itemsPerPage,
  renderCard,
  emptyIcon: EmptyIcon,
  emptyTitle,
  emptyDescription,
}: {
  title: string;
  subtitle: string;
  searchTerm: string;
  onSearchChange: (value: string) => void;
  onAddNew?: () => void;
  addNewLabel?: string;
  isLoading: boolean;
  items: T[];
  currentPage: number;
  setCurrentPage: (page: number) => void;
  itemsPerPage: number;
  renderCard: (item: T) => React.ReactNode;
  emptyIcon: React.ComponentType<{ className?: string }>;
  emptyTitle: string;
  emptyDescription: string;
}) {
  const filteredItems = items.filter((item: any) => {
    if (!searchTerm.trim()) return true;
    const query = searchTerm.toLowerCase();
    // Generic search across common properties
    return (
      (item.id && item.id.toLowerCase().includes(query)) ||
      (item.name && item.name.toLowerCase().includes(query)) ||
      (item.sku && item.sku.toLowerCase().includes(query)) ||
      (item.barcode && item.barcode.toLowerCase().includes(query)) ||
      (item.status && item.status.toLowerCase().includes(query))
    );
  });

  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
  const paginatedItems = filteredItems.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1">
          <h2 className="text-2xl font-bold text-white">{title}</h2>
          <p className="text-gray-400 text-sm mt-1">{subtitle}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder={`Search ${title.toLowerCase()}...`}
              aria-label={`Search ${title}`}
              value={searchTerm}
              onChange={e => onSearchChange(e.target.value)}
              className="pl-10 pr-4 py-2.5 w-full sm:w-64 bg-white/[0.05] border border-white/[0.08] rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-primary-500/50 focus:bg-white/[0.08] transition-all duration-300"
            />
          </div>
          {onAddNew && addNewLabel && (
            <Button variant="primary" onClick={onAddNew}>
              <PlusIcon className="h-5 w-5 mr-2" />
              {addNewLabel}
            </Button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton variant="rounded" className="h-48" />
          <Skeleton variant="rounded" className="h-48" />
        </div>
      ) : filteredItems.length > 0 ? (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" role="region" aria-live="polite">
            {paginatedItems.map((item, index) => (
              <div key={index}>{renderCard(item)}</div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center mt-6">
              <Pagination
                currentPage={currentPage}
                totalItems={filteredItems.length}
                pageSize={itemsPerPage}
                onPageChange={setCurrentPage}
              />
            </div>
          )}
        </>
      ) : (
        <Card variant="glass">
          <CardContent className="p-12 text-center">
            <EmptyIcon className="h-16 w-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">{emptyTitle}</h3>
            <p className="text-gray-400">{emptyDescription}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default InwardsGoodsPage;
