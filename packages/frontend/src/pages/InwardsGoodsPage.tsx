/**
 * Inwards Goods page
 *
 * Comprehensive inbound receiving interface for inwards goods personnel
 * Features: ASN management, receiving workflow, quality checks, putaway tasks
 * - Unique design: Workflow-focused with progress stages
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
} from '@/components/shared';
import { useFormValidation } from '@/hooks/useFormValidation';
import {
  InboxIcon,
  TruckIcon,
  CheckCircleIcon,
  PlusIcon,
  XMarkIcon,
  CubeIcon,
  ArrowRightIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';
import {
  ASNStatus,
  ReceiptStatus,
  PutawayStatus,
  type AdvanceShippingNotice,
  type Receipt,
  type PutawayTask,
} from '@opsui/shared';

// ============================================================================
// TYPES
// ============================================================================

type WorkflowStage = 'dashboard' | 'asn' | 'receiving' | 'putaway';

interface StageConfig {
  id: WorkflowStage;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}

// ============================================================================
// SUBCOMPONENTS
// ============================================================================

function WorkflowStage({
  stage,
  isActive,
  isCompleted,
  onClick,
}: {
  stage: StageConfig;
  isActive: boolean;
  isCompleted: boolean;
  onClick: () => void;
}) {
  const StageIcon = stage.icon;

  return (
    <button
      onClick={onClick}
      className={`relative flex-1 flex flex-col items-center p-4 rounded-xl transition-all duration-300 ${
        isActive
          ? 'bg-primary-500/20 border-2 border-primary-500'
          : isCompleted
            ? 'bg-success-500/10 border border-success-500/30 cursor-pointer hover:border-success-500/50'
            : 'bg-gray-800/50 border border-gray-700 cursor-pointer hover:border-gray-600'
      }`}
    >
      <div
        className={`p-3 rounded-full mb-2 ${
          isActive
            ? 'bg-primary-500 text-white'
            : isCompleted
              ? 'bg-success-500/20 text-success-400'
              : 'bg-gray-700 text-gray-400'
        }`}
      >
        <StageIcon className="h-6 w-6" />
      </div>
      <span
        className={`text-sm font-semibold ${
          isActive ? 'text-white' : isCompleted ? 'text-success-400' : 'text-gray-400'
        }`}
      >
        {stage.label}
      </span>

      {/* Connection line */}
      <div
        className={`absolute -right-3 top-1/2 -translate-y-1/2 z-10 ${
          isCompleted ? 'text-success-500' : 'text-gray-700'
        }`}
      >
        <ArrowRightIcon className="h-6 w-6" />
      </div>
    </button>
  );
}

function MetricCard({
  title,
  value,
  icon: Icon,
  color = 'primary',
}: {
  title: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  color?: 'primary' | 'success' | 'warning' | 'error';
}) {
  const colorStyles = {
    primary: 'from-primary-500/20 to-primary-500/5 border-primary-500/30',
    success: 'from-success-500/20 to-success-500/5 border-success-500/30',
    warning: 'from-warning-500/20 to-warning-500/5 border-warning-500/30',
    error: 'from-error-500/20 to-error-500/5 border-error-500/30',
  };

  return (
    <div className={`bg-gradient-to-br ${colorStyles[color]} border rounded-xl p-6 card-hover`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-400 uppercase tracking-wider">{title}</p>
          <p className="mt-2 text-3xl font-bold text-white">{value}</p>
        </div>
        <Icon className={`h-8 w-8 text-${color === 'primary' ? 'primary' : color}-400`} />
      </div>
    </div>
  );
}

function StatusBadge({
  status,
  type = 'asn',
}: {
  status: string;
  type?: 'asn' | 'receipt' | 'putaway';
}) {
  const getStatusStyles = () => {
    if (type === 'asn') {
      switch (status) {
        case ASNStatus.PENDING:
          return 'bg-gray-500/20 text-gray-300 border border-gray-500/30';
        case ASNStatus.IN_TRANSIT:
          return 'bg-blue-500/20 text-blue-300 border border-blue-500/30';
        case ASNStatus.RECEIVED:
          return 'bg-success-500/20 text-success-300 border border-success-500/30';
        case ASNStatus.PARTIALLY_RECEIVED:
          return 'bg-warning-500/20 text-warning-300 border border-warning-500/30';
        case ASNStatus.CANCELLED:
          return 'bg-error-500/20 text-error-300 border border-error-500/30';
        default:
          return 'bg-gray-500/20 text-gray-300';
      }
    } else if (type === 'receipt') {
      switch (status) {
        case ReceiptStatus.RECEIVING:
          return 'bg-blue-500/20 text-blue-300 border border-blue-500/30';
        case ReceiptStatus.COMPLETED:
          return 'bg-success-500/20 text-success-300 border border-success-500/30';
        case ReceiptStatus.CANCELLED:
          return 'bg-error-500/20 text-error-300 border border-error-500/30';
        default:
          return 'bg-gray-500/20 text-gray-300';
      }
    } else {
      switch (status) {
        case PutawayStatus.PENDING:
          return 'bg-gray-500/20 text-gray-300 border border-gray-500/30';
        case PutawayStatus.IN_PROGRESS:
          return 'bg-blue-500/20 text-blue-300 border border-blue-500/30';
        case PutawayStatus.COMPLETED:
          return 'bg-success-500/20 text-success-300 border border-success-500/30';
        case PutawayStatus.CANCELLED:
          return 'bg-error-500/20 text-error-300 border border-error-500/30';
        default:
          return 'bg-gray-500/20 text-gray-300';
      }
    }
  };

  return (
    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusStyles()}`}>
      {status.replace(/_/g, ' ')}
    </span>
  );
}

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
          <TruckIcon className="h-8 w-8 text-blue-400" />
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
}: {
  receipt: Receipt;
  onViewDetails: (receiptId: string) => void;
}) {
  const itemCount = receipt.lineItems?.length || 0;

  return (
    <Card variant="glass" className="card-hover border-l-4 border-l-orange-500">
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="text-lg font-semibold text-white">{receipt.receiptId}</h3>
              <StatusBadge status={receipt.status} type="receipt" />
            </div>
            <p className="text-sm text-gray-400">
              {new Date(receipt.receiptDate).toLocaleString()}
            </p>
          </div>
          <InboxIcon className="h-8 w-8 text-orange-400" />
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

        <Button
          variant="secondary"
          size="sm"
          onClick={() => onViewDetails(receipt.receiptId)}
          className="w-full"
        >
          View Details
        </Button>
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
          <CubeIcon className="h-8 w-8 text-purple-400" />
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
// MODALS (simplified for brevity - same as before)
// ============================================================================

function CreateASNModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const { showToast } = useToast();
  const createASN = useCreateASN();

  // Form validation
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

  // Form validation
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

  // Form validation
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
  const currentStage = (searchParams.get('tab') as WorkflowStage) || 'dashboard';
  const navigate = useNavigate();

  const [asnModalOpen, setAsnModalOpen] = useState(false);
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [putawayUpdateModalOpen, setPutawayUpdateModalOpen] = useState(false);
  const [selectedPutawayTask, setSelectedPutawayTask] = useState<PutawayTask | null>(null);

  // Search states
  const [asnsSearchTerm, setAsnsSearchTerm] = useState('');
  const [receiptsSearchTerm, setReceiptsSearchTerm] = useState('');
  const [putawaySearchTerm, setPutawaySearchTerm] = useState('');

  // Pagination state for ASNs
  const [asnsCurrentPage, setAsnsCurrentPage] = useState(1);
  const asnsPerPage = 6;

  // Pagination state for receipts
  const [receiptsCurrentPage, setReceiptsCurrentPage] = useState(1);
  const receiptsPerPage = 6;

  // Pagination state for putaway tasks
  const [putawayCurrentPage, setPutawayCurrentPage] = useState(1);
  const putawayPerPage = 6;

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

  const { data: dashboard, isLoading } = useInwardsDashboard();
  const { data: asns, refetch: refetchAsns } = useASNs({ enabled: currentStage === 'asn' });
  const { data: receipts, refetch: refetchReceipts } = useReceipts({
    enabled: currentStage === 'receiving',
  });
  const { data: putawayTasks, refetch: refetchPutawayTasks } = usePutawayTasks({
    enabled: currentStage === 'putaway',
  });

  const updateASNStatus = useUpdateASNStatus();

  const stages: StageConfig[] = [
    { id: 'dashboard', label: 'Overview', icon: CubeIcon, description: 'Dashboard and metrics' },
    { id: 'asn', label: 'ASN', icon: TruckIcon, description: 'Advance Shipping Notices' },
    { id: 'receiving', label: 'Receiving', icon: InboxIcon, description: 'Receive incoming goods' },
    { id: 'putaway', label: 'Putaway', icon: CubeIcon, description: 'Store items in bins' },
  ];

  const currentStageIndex = stages.findIndex(s => s.id === currentStage);

  const handleStartReceiving = async (asnId: string) => {
    try {
      await updateASNStatus.mutateAsync({ asnId, status: ASNStatus.RECEIVED });
      showToast('ASN marked as received', 'success');
      setReceiptModalOpen(true);
      refetchAsns();
    } catch (error: any) {
      console.error('Failed to update ASN status:', error);
      showToast(error?.message || 'Failed to update ASN status', 'error');
    }
  };

  if (isLoading && currentStage === 'dashboard') {
    return (
      <div className="min-h-screen">
        <Header />
        <main className="w-full px-4 sm:px-6 lg:px-8 py-8 space-y-6">
          <Skeleton variant="text" className="w-64 h-10 mb-2" />
          <Skeleton variant="text" className="w-96 h-6 mb-6" />
          <div className="flex items-stretch gap-2 mb-8">
            <Skeleton variant="rounded" className="flex-1 h-28" />
            <Skeleton variant="rounded" className="flex-1 h-28" />
            <Skeleton variant="rounded" className="flex-1 h-28" />
            <Skeleton variant="rounded" className="flex-1 h-28" />
          </div>
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

      <main className="w-full px-4 sm:px-6 lg:px-8 py-8">
        {/* Workflow Stages */}
        <div className="flex items-stretch gap-2 mb-8">
          {stages.map((stage, index) => (
            <div key={stage.id} className="flex-1 relative">
              <WorkflowStage
                stage={stage}
                isActive={stage.id === currentStage}
                isCompleted={index < currentStageIndex}
                onClick={() => setSearchParams({ tab: stage.id })}
              />
              {index === stages.length - 1 && (
                <div className="absolute -right-3 top-1/2 -translate-y-1/2 z-10 text-gray-700">
                  <CheckCircleIcon className="h-6 w-6" />
                </div>
              )}
            </div>
          ))}
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
                title="Pending Putaway"
                value={dashboard.pendingPutaway}
                icon={CubeIcon}
                color="error"
              />
              <MetricCard
                title="Received Today"
                value={dashboard.todayReceived}
                icon={CheckCircleIcon}
                color="success"
              />
            </div>

            <Card variant="glass">
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
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
          <div className="space-y-6">
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1">
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
                    className="pl-10 pr-4 py-2.5 w-64 bg-white/[0.05] border border-white/[0.08] rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-primary-500/50 focus:bg-white/[0.08] transition-all duration-300"
                  />
                </div>
                <Button variant="primary" onClick={() => setAsnModalOpen(true)}>
                  <PlusIcon className="h-5 w-5 mr-2" />
                  New ASN
                </Button>
              </div>
            </div>

            {asns && asns.length > 0 ? (
              (() => {
                const filteredAsns = asns.filter((asn: AdvanceShippingNotice) => {
                  if (!asnsSearchTerm.trim()) return true;
                  const query = asnsSearchTerm.toLowerCase();
                  return (
                    asn.asnId?.toLowerCase().includes(query) ||
                    asn.purchaseOrderNumber?.toLowerCase().includes(query) ||
                    asn.supplierId?.toLowerCase().includes(query) ||
                    asn.status?.toLowerCase().includes(query)
                  );
                });
                const totalPages = Math.ceil(filteredAsns.length / asnsPerPage);
                const paginatedAsns = filteredAsns.slice(
                  (asnsCurrentPage - 1) * asnsPerPage,
                  asnsCurrentPage * asnsPerPage
                );
                return (
                  <>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {paginatedAsns.length === 0 ? (
                        <Card variant="glass">
                          <CardContent className="p-12 text-center">
                            <p className="text-gray-400">No ASNs match your search</p>
                          </CardContent>
                        </Card>
                      ) : (
                        paginatedAsns.map((asn: AdvanceShippingNotice) => (
                          <ASNCard
                            key={asn.asnId}
                            asn={asn}
                            onViewDetails={id => navigate(`/inwards/asn/${id}`)}
                            onStartReceiving={handleStartReceiving}
                          />
                        ))
                      )}
                    </div>

                    {/* Pagination for ASNs */}
                    {totalPages > 1 && (
                      <div className="flex justify-center mt-6">
                        <Pagination
                          currentPage={asnsCurrentPage}
                          totalItems={filteredAsns.length}
                          pageSize={asnsPerPage}
                          onPageChange={setAsnsCurrentPage}
                        />
                      </div>
                    )}
                  </>
                );
              })()
            ) : (
              <Card variant="glass">
                <CardContent className="p-12 text-center">
                  <TruckIcon className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-white mb-2">No ASNs</h3>
                  <p className="text-gray-400">Create an ASN to track incoming shipments</p>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Receiving Stage */}
        {currentStage === 'receiving' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1">
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
                    className="pl-10 pr-4 py-2.5 w-64 bg-white/[0.05] border border-white/[0.08] rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-primary-500/50 focus:bg-white/[0.08] transition-all duration-300"
                  />
                </div>
                <Button variant="primary" onClick={() => setReceiptModalOpen(true)}>
                  <PlusIcon className="h-5 w-5 mr-2" />
                  New Receipt
                </Button>
              </div>
            </div>

            {receipts && receipts.length > 0 ? (
              (() => {
                const filteredReceipts = receipts.filter((receipt: Receipt) => {
                  if (!receiptsSearchTerm.trim()) return true;
                  const query = receiptsSearchTerm.toLowerCase();
                  return (
                    receipt.receiptId?.toLowerCase().includes(query) ||
                    receipt.asnId?.toLowerCase().includes(query) ||
                    receipt.receiptType?.toLowerCase().includes(query) ||
                    receipt.status?.toLowerCase().includes(query)
                  );
                });
                const totalPages = Math.ceil(filteredReceipts.length / receiptsPerPage);
                const paginatedReceipts = filteredReceipts.slice(
                  (receiptsCurrentPage - 1) * receiptsPerPage,
                  receiptsCurrentPage * receiptsPerPage
                );
                return (
                  <>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {paginatedReceipts.length === 0 ? (
                        <Card variant="glass">
                          <CardContent className="p-12 text-center">
                            <p className="text-gray-400">No receipts match your search</p>
                          </CardContent>
                        </Card>
                      ) : (
                        paginatedReceipts.map((receipt: Receipt) => (
                          <ReceiptCard
                            key={receipt.receiptId}
                            receipt={receipt}
                            onViewDetails={id => navigate(`/inwards/receipt/${id}`)}
                          />
                        ))
                      )}
                    </div>

                    {/* Pagination for Receipts */}
                    {totalPages > 1 && (
                      <div className="flex justify-center mt-6">
                        <Pagination
                          currentPage={receiptsCurrentPage}
                          totalItems={filteredReceipts.length}
                          pageSize={receiptsPerPage}
                          onPageChange={setReceiptsCurrentPage}
                        />
                      </div>
                    )}
                  </>
                );
              })()
            ) : (
              <Card variant="glass">
                <CardContent className="p-12 text-center">
                  <InboxIcon className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-white mb-2">No Receipts</h3>
                  <p className="text-gray-400">Create a receipt to record incoming goods</p>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Putaway Stage */}
        {currentStage === 'putaway' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-white">Putaway Tasks</h2>
                <p className="text-gray-400 text-sm mt-1">
                  Store received items in their bin locations
                </p>
              </div>
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search tasks..."
                  value={putawaySearchTerm}
                  onChange={e => setPutawaySearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2.5 w-64 bg-white/[0.05] border border-white/[0.08] rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-primary-500/50 focus:bg-white/[0.08] transition-all duration-300"
                />
              </div>
            </div>

            {putawayTasks && putawayTasks.length > 0 ? (
              (() => {
                const filteredTasks = putawayTasks.filter((task: PutawayTask) => {
                  if (!putawaySearchTerm.trim()) return true;
                  const query = putawaySearchTerm.toLowerCase();
                  return (
                    task.putawayTaskId?.toLowerCase().includes(query) ||
                    task.receiptLineId?.toLowerCase().includes(query) ||
                    task.sku?.toLowerCase().includes(query) ||
                    task.targetBinLocation?.toLowerCase().includes(query) ||
                    task.status?.toLowerCase().includes(query)
                  );
                });
                const totalPages = Math.ceil(filteredTasks.length / putawayPerPage);
                const paginatedTasks = filteredTasks.slice(
                  (putawayCurrentPage - 1) * putawayPerPage,
                  putawayCurrentPage * putawayPerPage
                );
                return (
                  <>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {paginatedTasks.length === 0 ? (
                        <Card variant="glass">
                          <CardContent className="p-12 text-center">
                            <p className="text-gray-400">No putaway tasks match your search</p>
                          </CardContent>
                        </Card>
                      ) : (
                        paginatedTasks.map((task: PutawayTask) => (
                          <PutawayTaskCard
                            key={task.putawayTaskId}
                            task={task}
                            onAssign={id => navigate(`/inwards/putaway/${id}`)}
                            onUpdate={() => {
                              setSelectedPutawayTask(task);
                              setPutawayUpdateModalOpen(true);
                            }}
                          />
                        ))
                      )}
                    </div>

                    {/* Pagination for Putaway Tasks */}
                    {totalPages > 1 && (
                      <div className="flex justify-center mt-6">
                        <Pagination
                          currentPage={putawayCurrentPage}
                          totalItems={filteredTasks.length}
                          pageSize={putawayPerPage}
                          onPageChange={setPutawayCurrentPage}
                        />
                      </div>
                    )}
                  </>
                );
              })()
            ) : (
              <Card variant="glass">
                <CardContent className="p-12 text-center">
                  <CubeIcon className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-white mb-2">No Putaway Tasks</h3>
                  <p className="text-gray-400">Putaway tasks appear after receiving goods</p>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </main>

      {asnModalOpen && (
        <CreateASNModal onClose={() => setAsnModalOpen(false)} onSuccess={() => refetchAsns()} />
      )}
      {receiptModalOpen && (
        <CreateReceiptModal
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
    </div>
  );
}

export default InwardsGoodsPage;
