/**
 * Maintenance page
 *
 * Equipment maintenance and service request management
 * - Industry-standard CMMS functionality
 */

import { useSearchParams } from 'react-router-dom';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Header,
  Button,
  useToast,
  Pagination,
  Breadcrumb,
} from '@/components/shared';
import {
  useAssets,
  useMaintenanceWorkOrders,
  useMaintenanceDashboard,
  useCreateAsset,
  useCreateWorkOrder,
  useStartWorkOrder,
  useCompleteWorkOrder,
} from '@/services/api';
import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  WrenchScrewdriverIcon,
  ClipboardDocumentListIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  PlusIcon,
  UserIcon,
  BellIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import {
  AssetStatus,
  MaintenanceStatus,
  MaintenancePriority,
  MaintenanceType,
  AssetType,
} from '@opsui/shared';

// ============================================================================
// TYPES
// ============================================================================

type TabType = 'dashboard' | 'requests' | 'schedule' | 'equipment';

interface WorkOrderDisplay {
  workOrderId: string;
  workOrderNumber: string;
  title: string;
  description?: string;
  assetId: string;
  assetName?: string;
  maintenanceType: MaintenanceType;
  priority: MaintenancePriority;
  status: MaintenanceStatus;
  scheduledDate: string;
  estimatedDurationHours: number;
  assignedTo?: string;
  createdAt: string;
  actualStartDate?: string;
  completedAt?: string;
}

interface AssetDisplay {
  assetId: string;
  assetNumber: string;
  name: string;
  description?: string;
  location?: string;
  type: string;
  status: AssetStatus;
  lastMaintenanceDate?: string;
  nextMaintenanceDate?: string;
}

// ============================================================================
// SUBCOMPONENTS
// ============================================================================

// Equipment Status Card - distinctive grid layout
function EquipmentStatusCard({
  equipment,
  onClick,
}: {
  equipment: AssetDisplay;
  onClick: () => void;
}) {
  const statusConfig: Record<AssetStatus, { color: string; icon: any; label: string }> = {
    [AssetStatus.OPERATIONAL]: { color: 'success', icon: CheckCircleIcon, label: 'Operational' },
    [AssetStatus.IN_MAINTENANCE]: {
      color: 'warning',
      icon: WrenchScrewdriverIcon,
      label: 'In Maintenance',
    },
    [AssetStatus.OUT_OF_SERVICE]: {
      color: 'error',
      icon: ExclamationTriangleIcon,
      label: 'Out of Service',
    },
    [AssetStatus.RETIRED]: { color: 'gray', icon: XMarkIcon, label: 'Retired' },
  };

  const config = statusConfig[equipment.status] || statusConfig[AssetStatus.OPERATIONAL];
  const StatusIcon = config.icon;

  return (
    <button
      onClick={onClick}
      className="relative p-5 bg-gray-800/50 border border-gray-700 rounded-xl hover:border-gray-600 transition-all duration-300 text-left group"
    >
      {/* Status indicator strip */}
      <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-xl bg-${config.color}-500`} />

      <div className="flex items-start justify-between mb-3 pl-3">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-white group-hover:text-primary-400 transition-colors">
            {equipment.name}
          </h3>
          <p className="text-sm text-gray-400 mt-1">{equipment.assetNumber}</p>
          {equipment.location && <p className="text-xs text-gray-500">{equipment.location}</p>}
        </div>
        <div className={`p-2 rounded-lg bg-${config.color}-500/10`}>
          <StatusIcon className={`h-5 w-5 text-${config.color}-400`} />
        </div>
      </div>

      {(equipment.lastMaintenanceDate || equipment.nextMaintenanceDate) && (
        <div className="grid grid-cols-2 gap-3 pl-3">
          {equipment.lastMaintenanceDate && (
            <div className="bg-white/5 p-2 rounded-lg">
              <p className="text-xs text-gray-400">Last Service</p>
              <p className="text-sm text-white">
                {new Date(equipment.lastMaintenanceDate).toLocaleDateString()}
              </p>
            </div>
          )}
          {equipment.nextMaintenanceDate && (
            <div className="bg-white/5 p-2 rounded-lg">
              <p className="text-xs text-gray-400">Next Service</p>
              <p className="text-sm text-white">
                {new Date(equipment.nextMaintenanceDate).toLocaleDateString()}
              </p>
            </div>
          )}
        </div>
      )}

      <div className={`mt-3 pl-3 text-xs font-medium text-${config.color}-400`}>{config.label}</div>
    </button>
  );
}

function StatusBadge({ status }: { status: MaintenanceStatus }) {
  const styles: Record<MaintenanceStatus, string> = {
    [MaintenanceStatus.SCHEDULED]: 'bg-gray-500/20 text-gray-300 border border-gray-500/30',
    [MaintenanceStatus.IN_PROGRESS]:
      'bg-primary-500/20 text-primary-300 border border-primary-500/30',
    [MaintenanceStatus.COMPLETED]:
      'bg-success-500/20 text-success-300 border border-success-500/30',
    [MaintenanceStatus.CANCELLED]: 'bg-error-500/20 text-error-300 border border-error-500/30',
    [MaintenanceStatus.OVERDUE]:
      'bg-red-500/20 text-red-300 border border-red-500/30 animate-pulse',
  };

  const labels: Record<MaintenanceStatus, string> = {
    [MaintenanceStatus.SCHEDULED]: 'Scheduled',
    [MaintenanceStatus.IN_PROGRESS]: 'In Progress',
    [MaintenanceStatus.COMPLETED]: 'Completed',
    [MaintenanceStatus.CANCELLED]: 'Cancelled',
    [MaintenanceStatus.OVERDUE]: 'Overdue',
  };

  return (
    <span
      className={`px-3 py-1 rounded-full text-xs font-semibold ${styles[status] || styles[MaintenanceStatus.SCHEDULED]}`}
    >
      {labels[status] || status}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: MaintenancePriority }) {
  const styles: Record<MaintenancePriority, string> = {
    [MaintenancePriority.LOW]: 'bg-gray-500/10 text-gray-400',
    [MaintenancePriority.MEDIUM]: 'bg-blue-500/10 text-blue-400',
    [MaintenancePriority.HIGH]: 'bg-orange-500/10 text-orange-400',
    [MaintenancePriority.EMERGENCY]: 'bg-red-500/10 text-red-400 animate-pulse',
  };

  return (
    <span
      className={`px-2 py-1 rounded text-xs font-medium ${styles[priority] || styles[MaintenancePriority.MEDIUM]}`}
    >
      {priority}
    </span>
  );
}

function MaintenanceRequestCard({
  request,
  onStart,
  onComplete,
}: {
  request: WorkOrderDisplay;
  onStart?: (workOrderId: string) => void;
  onComplete?: (workOrderId: string) => void;
}) {
  return (
    <Card variant="glass" className="card-hover">
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="text-lg font-semibold text-white">{request.title}</h3>
              <StatusBadge status={request.status} />
              <PriorityBadge priority={request.priority} />
            </div>
            {request.description && <p className="text-gray-300">{request.description}</p>}
            <p className="text-sm text-gray-400 mt-2">Asset ID: {request.assetId}</p>
            {request.assetName && <p className="text-sm text-gray-400">{request.assetName}</p>}
          </div>
          <WrenchScrewdriverIcon className="h-6 w-6 text-gray-500 flex-shrink-0 ml-4" />
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4 text-sm bg-white/5 p-3 rounded-lg">
          <div>
            <p className="text-gray-400 text-xs">Work Order ID</p>
            <p className="text-white font-medium">{request.workOrderNumber}</p>
          </div>
          <div>
            <p className="text-gray-400 text-xs">Scheduled</p>
            <p className="text-white">{new Date(request.scheduledDate).toLocaleDateString()}</p>
          </div>
          <div>
            <p className="text-gray-400 text-xs">Type</p>
            <p className="text-white">{request.maintenanceType}</p>
          </div>
          <div>
            <p className="text-gray-400 text-xs">Duration</p>
            <p className="text-white">{request.estimatedDurationHours}h</p>
          </div>
          {request.assignedTo && (
            <div className="col-span-2">
              <p className="text-gray-400 text-xs">Assigned To</p>
              <p className="text-white flex items-center gap-2">
                <UserIcon className="h-4 w-4" />
                {request.assignedTo}
              </p>
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <Button variant="secondary" size="sm" className="flex-1">
            View Details
          </Button>
          {request.status === MaintenanceStatus.SCHEDULED && (
            <Button
              variant="primary"
              size="sm"
              className="flex-1"
              onClick={() => onStart?.(request.workOrderId)}
            >
              Start Work
            </Button>
          )}
          {request.status === MaintenanceStatus.IN_PROGRESS && (
            <Button
              variant="success"
              size="sm"
              className="flex-1"
              onClick={() => onComplete?.(request.workOrderId)}
            >
              Complete Work
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// MODAL COMPONENTS
// ============================================================================

interface CreateAssetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

function CreateAssetModal({ isOpen, onClose, onSuccess }: CreateAssetModalProps) {
  const { showToast } = useToast();
  const createAssetMutation = useCreateAsset();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: AssetType.EQUIPMENT,
    serialNumber: '',
    manufacturer: '',
    model: '',
    location: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createAssetMutation.mutateAsync(formData);
      showToast('Asset created successfully', 'success');
      setFormData({
        name: '',
        description: '',
        type: AssetType.EQUIPMENT,
        serialNumber: '',
        manufacturer: '',
        model: '',
        location: '',
      });
      onSuccess();
      onClose();
    } catch (error) {
      showToast('Failed to create asset', 'error');
    }
  };

  return (
    <div
      className={`fixed inset-0 z-50 ${isOpen ? 'flex' : 'hidden'} items-center justify-center bg-black/50`}
    >
      <div className="bg-gray-800 rounded-xl p-6 w-full max-w-lg mx-4">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">Create New Asset</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Asset Name *</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="e.g., Forklift A-01"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Asset Type *</label>
            <select
              value={formData.type}
              onChange={e => setFormData({ ...formData, type: e.target.value as AssetType })}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value={AssetType.MACHINERY}>Machinery</option>
              <option value={AssetType.VEHICLE}>Vehicle</option>
              <option value={AssetType.EQUIPMENT}>Equipment</option>
              <option value={AssetType.FACILITY}>Facility</option>
              <option value={AssetType.TOOL}>Tool</option>
              <option value={AssetType.OTHER}>Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              rows={3}
              placeholder="Asset description..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Serial Number</label>
              <input
                type="text"
                value={formData.serialNumber}
                onChange={e => setFormData({ ...formData, serialNumber: e.target.value })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Location</label>
              <input
                type="text"
                value={formData.location}
                onChange={e => setFormData({ ...formData, location: e.target.value })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="e.g., Zone A"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Manufacturer</label>
              <input
                type="text"
                value={formData.manufacturer}
                onChange={e => setFormData({ ...formData, manufacturer: e.target.value })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Model</label>
              <input
                type="text"
                value={formData.model}
                onChange={e => setFormData({ ...formData, model: e.target.value })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={createAssetMutation.isPending}
              className="flex-1"
            >
              {createAssetMutation.isPending ? 'Creating...' : 'Create Asset'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface CreateWorkOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  assets: AssetDisplay[];
}

function CreateWorkOrderModal({ isOpen, onClose, onSuccess, assets }: CreateWorkOrderModalProps) {
  const { showToast } = useToast();
  const createWorkOrderMutation = useCreateWorkOrder();
  const [formData, setFormData] = useState({
    assetId: '',
    title: '',
    description: '',
    maintenanceType: MaintenanceType.PREVENTIVE,
    priority: MaintenancePriority.MEDIUM,
    scheduledDate: new Date().toISOString().split('T')[0],
    estimatedDurationHours: 1,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createWorkOrderMutation.mutateAsync(formData);
      showToast('Work order created successfully', 'success');
      setFormData({
        assetId: '',
        title: '',
        description: '',
        maintenanceType: MaintenanceType.PREVENTIVE,
        priority: MaintenancePriority.MEDIUM,
        scheduledDate: new Date().toISOString().split('T')[0],
        estimatedDurationHours: 1,
      });
      onSuccess();
      onClose();
    } catch (error) {
      showToast('Failed to create work order', 'error');
    }
  };

  return (
    <div
      className={`fixed inset-0 z-50 ${isOpen ? 'flex' : 'hidden'} items-center justify-center bg-black/50`}
    >
      <div className="bg-gray-800 rounded-xl p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">Create Work Order</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Asset *</label>
            <select
              required
              value={formData.assetId}
              onChange={e => setFormData({ ...formData, assetId: e.target.value })}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">Select an asset</option>
              {assets.map(asset => (
                <option key={asset.assetId} value={asset.assetId}>
                  {asset.assetNumber} - {asset.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Title *</label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={e => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="e.g., Monthly Inspection"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              rows={3}
              placeholder="Work order description..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Type *</label>
              <select
                value={formData.maintenanceType}
                onChange={e =>
                  setFormData({ ...formData, maintenanceType: e.target.value as MaintenanceType })
                }
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value={MaintenanceType.PREVENTIVE}>Preventive</option>
                <option value={MaintenanceType.CORRECTIVE}>Corrective</option>
                <option value={MaintenanceType.EMERGENCY}>Emergency</option>
                <option value={MaintenanceType.PREDICTIVE}>Predictive</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Priority *</label>
              <select
                value={formData.priority}
                onChange={e =>
                  setFormData({ ...formData, priority: e.target.value as MaintenancePriority })
                }
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value={MaintenancePriority.LOW}>Low</option>
                <option value={MaintenancePriority.MEDIUM}>Medium</option>
                <option value={MaintenancePriority.HIGH}>High</option>
                <option value={MaintenancePriority.EMERGENCY}>Emergency</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Scheduled Date *
              </label>
              <input
                type="date"
                required
                value={formData.scheduledDate}
                onChange={e => setFormData({ ...formData, scheduledDate: e.target.value })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Est. Duration (hours) *
              </label>
              <input
                type="number"
                required
                min="0.5"
                step="0.5"
                value={formData.estimatedDurationHours}
                onChange={e =>
                  setFormData({ ...formData, estimatedDurationHours: parseFloat(e.target.value) })
                }
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={createWorkOrderMutation.isPending}
              className="flex-1"
            >
              {createWorkOrderMutation.isPending ? 'Creating...' : 'Create Work Order'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN PAGE
// ============================================================================

function MaintenancePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = (searchParams.get('tab') as TabType) || 'dashboard';
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Modal states
  const [isCreateAssetModalOpen, setIsCreateAssetModalOpen] = useState(false);
  const [isCreateWorkOrderModalOpen, setIsCreateWorkOrderModalOpen] = useState(false);

  // Handlers
  const handleModalSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['maintenance'] });
  };

  // Fetch maintenance data from backend
  const {
    data: dashboardData,
    isLoading: isDashboardLoading,
    error: dashboardError,
  } = useMaintenanceDashboard();
  const {
    data: workOrdersData,
    isLoading: isWorkOrdersLoading,
    error: workOrdersError,
  } = useMaintenanceWorkOrders();
  const { data: assetsData, isLoading: isAssetsLoading, error: assetsError } = useAssets();

  // Work order mutations
  const startWorkOrderMutation = useStartWorkOrder();
  const completeWorkOrderMutation = useCompleteWorkOrder();

  // Handlers
  const handleStartWorkOrder = async (workOrderId: string) => {
    try {
      await startWorkOrderMutation.mutateAsync(workOrderId);
      showToast('Work order started', 'success');
    } catch (error) {
      showToast('Failed to start work order', 'error');
    }
  };

  const handleCompleteWorkOrder = async (workOrderId: string) => {
    try {
      await completeWorkOrderMutation.mutateAsync({
        workOrderId,
        data: { workPerformed: 'Maintenance completed', notes: 'Completed via maintenance page' },
      });
      showToast('Work order completed', 'success');
    } catch (error) {
      showToast('Failed to complete work order', 'error');
    }
  };

  // Show error toasts
  useEffect(() => {
    if (dashboardError) {
      showToast('Failed to load maintenance dashboard', 'error');
    }
  }, [dashboardError, showToast]);

  useEffect(() => {
    if (workOrdersError) {
      showToast('Failed to load work orders', 'error');
    }
  }, [workOrdersError, showToast]);

  useEffect(() => {
    if (assetsError) {
      showToast('Failed to load assets', 'error');
    }
  }, [assetsError, showToast]);

  // Use real data from backend or fallback to defaults
  const dashboard = dashboardData || {
    openRequests: 0,
    inProgress: 0,
    completedToday: 0,
    urgent: 0,
    equipmentDown: 0,
    equipmentNeedsService: 0,
  };

  // Map work orders to display format
  const requests: WorkOrderDisplay[] = (workOrdersData?.workOrders || []).map((wo: any) => ({
    workOrderId: wo.workOrderId,
    workOrderNumber: wo.workOrderNumber,
    title: wo.title,
    description: wo.description,
    assetId: wo.assetId,
    assetName: wo.assetId, // Will be resolved with asset data
    maintenanceType: wo.maintenanceType,
    priority: wo.priority,
    status: wo.status,
    scheduledDate: wo.scheduledDate,
    estimatedDurationHours: wo.estimatedDurationHours,
    assignedTo: wo.assignedTo,
    createdAt: wo.createdAt,
    actualStartDate: wo.actualStartDate,
    completedAt: wo.completedAt,
  }));

  // Map assets to display format
  const equipment: AssetDisplay[] = (assetsData?.assets || []).map((asset: any) => ({
    assetId: asset.assetId,
    assetNumber: asset.assetNumber,
    name: asset.name,
    description: asset.description,
    location: asset.location,
    type: asset.type,
    status: asset.status,
    lastMaintenanceDate: asset.lastMaintenanceDate,
    nextMaintenanceDate: asset.nextMaintenanceDate,
  }));

  // Show loading state
  const isLoading = isDashboardLoading || isWorkOrdersLoading || isAssetsLoading;

  // Pagination
  const totalRequests = requests.length;
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedRequests = requests.slice(startIndex, endIndex);

  const setTab = (tab: TabType) => {
    setSearchParams({ tab });
    setCurrentPage(1); // Reset pagination when changing tabs
  };

  return (
    <div className="min-h-screen">
      <Header />

      <main className="w-full px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb Navigation */}
        <Breadcrumb />
        {/* Page Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Equipment Maintenance</h1>
            <p className="mt-2 text-gray-400">Manage service requests and equipment status</p>
          </div>
          <div className="flex gap-3">
            <Button
              variant="secondary"
              className="flex items-center gap-2"
              onClick={() => setIsCreateAssetModalOpen(true)}
            >
              <PlusIcon className="h-5 w-5" />
              New Asset
            </Button>
            <Button
              variant="primary"
              className="flex items-center gap-2"
              onClick={() => setIsCreateWorkOrderModalOpen(true)}
            >
              <PlusIcon className="h-5 w-5" />
              New Request
            </Button>
          </div>
        </div>

        {/* Loading Spinner */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="flex flex-col items-center gap-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
              <p className="text-gray-400 text-sm">Loading maintenance data...</p>
            </div>
          </div>
        )}

        {/* Dashboard Tab */}
        {!isLoading && currentTab === 'dashboard' && (
          <div className="space-y-8">
            {/* Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card variant="glass" className="p-6 border-l-4 border-l-warning-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Open Requests</p>
                    <p className="mt-2 text-3xl font-bold text-white">{dashboard.openRequests}</p>
                  </div>
                  <ClipboardDocumentListIcon className="h-8 w-8 text-warning-400" />
                </div>
              </Card>
              <Card variant="glass" className="p-6 border-l-4 border-l-primary-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">In Progress</p>
                    <p className="mt-2 text-3xl font-bold text-white">{dashboard.inProgress}</p>
                  </div>
                  <WrenchScrewdriverIcon className="h-8 w-8 text-primary-400" />
                </div>
              </Card>
              <Card variant="glass" className="p-6 border-l-4 border-l-success-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Completed Today</p>
                    <p className="mt-2 text-3xl font-bold text-white">{dashboard.completedToday}</p>
                  </div>
                  <CheckCircleIcon className="h-8 w-8 text-success-400" />
                </div>
              </Card>
              <Card variant="glass" className="p-6 border-l-4 border-l-error-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Urgent</p>
                    <p className="mt-2 text-3xl font-bold text-white">{dashboard.urgent}</p>
                  </div>
                  <BellIcon className="h-8 w-8 text-error-400 animate-pulse" />
                </div>
              </Card>
            </div>

            {/* Equipment Overview Grid */}
            <Card variant="glass">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Equipment Overview</CardTitle>
                  <div className="flex items-center gap-4 text-sm text-gray-300">
                    <span className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-success-500"></span>
                      Operational (
                      {equipment.filter(e => e.status === AssetStatus.OPERATIONAL).length})
                    </span>
                    <span className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-warning-500"></span>
                      In Maintenance (
                      {equipment.filter(e => e.status === AssetStatus.IN_MAINTENANCE).length})
                    </span>
                    <span className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-error-500"></span>
                      Out of Service (
                      {equipment.filter(e => e.status === AssetStatus.OUT_OF_SERVICE).length})
                    </span>
                    <span className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-gray-500"></span>
                      Retired ({equipment.filter(e => e.status === AssetStatus.RETIRED).length})
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {equipment.map(eq => (
                    <EquipmentStatusCard
                      key={eq.assetId}
                      equipment={eq}
                      onClick={() => {
                        /* Navigate to equipment details */
                      }}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Recent Requests */}
            <Card variant="glass">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Recent Requests</CardTitle>
                  <Button variant="secondary" size="sm" onClick={() => setTab('requests')}>
                    View All
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {requests.slice(0, 2).map(request => (
                    <MaintenanceRequestCard
                      key={request.workOrderId}
                      request={request}
                      onStart={handleStartWorkOrder}
                      onComplete={handleCompleteWorkOrder}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Requests Tab */}
        {!isLoading && currentTab === 'requests' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-white">Maintenance Requests</h2>
                <p className="text-gray-400 text-sm mt-1">All service requests and work orders</p>
              </div>
              <Button
                variant="primary"
                className="flex items-center gap-2"
                onClick={() => setIsCreateWorkOrderModalOpen(true)}
              >
                <PlusIcon className="h-5 w-5" />
                New Request
              </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {paginatedRequests.map(request => (
                <MaintenanceRequestCard
                  key={request.workOrderId}
                  request={request}
                  onStart={handleStartWorkOrder}
                  onComplete={handleCompleteWorkOrder}
                />
              ))}
            </div>

            {/* Pagination */}
            {totalRequests > 0 && (
              <Pagination
                currentPage={currentPage}
                totalItems={totalRequests}
                pageSize={pageSize}
                onPageChange={setCurrentPage}
                onPageSizeChange={setPageSize}
              />
            )}
          </div>
        )}

        {/* Schedule Tab */}
        {!isLoading && currentTab === 'schedule' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-white">Maintenance Schedule</h2>
              <p className="text-gray-400 text-sm mt-1">Calendar view of scheduled maintenance</p>
            </div>

            {/* Upcoming Maintenance Timeline */}
            <Card variant="glass">
              <CardContent className="p-6">
                {/* Combine equipment next service dates with maintenance requests */}
                {(() => {
                  const scheduledItems: Array<{
                    id: string;
                    title: string;
                    type: 'equipment' | 'request';
                    date: string;
                    status: AssetStatus | MaintenanceStatus;
                    priority?: MaintenancePriority;
                  }> = [];

                  // Add equipment scheduled services
                  equipment.forEach(eq => {
                    if (eq.nextMaintenanceDate) {
                      scheduledItems.push({
                        id: eq.assetId,
                        title: `${eq.name} - Scheduled Service`,
                        type: 'equipment',
                        date: eq.nextMaintenanceDate,
                        status: eq.status,
                      });
                    }
                  });

                  // Add maintenance requests with created dates
                  requests.forEach(req => {
                    if (
                      req.status === MaintenanceStatus.SCHEDULED ||
                      req.status === MaintenanceStatus.IN_PROGRESS
                    ) {
                      scheduledItems.push({
                        id: req.workOrderId,
                        title: req.title,
                        type: 'request',
                        date: req.scheduledDate,
                        status: req.status,
                        priority: req.priority,
                      });
                    }
                  });

                  // Sort by date
                  scheduledItems.sort(
                    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
                  );

                  // Group by date
                  const itemsByDate: Record<string, typeof scheduledItems> = {};
                  scheduledItems.forEach(item => {
                    const date = new Date(item.date).toLocaleDateString();
                    if (!itemsByDate[date]) {
                      itemsByDate[date] = [];
                    }
                    itemsByDate[date].push(item);
                  });

                  const sortedDates = Object.keys(itemsByDate).sort((a, b) => {
                    return new Date(a).getTime() - new Date(b).getTime();
                  });

                  if (sortedDates.length === 0) {
                    return (
                      <div className="text-center py-12">
                        <ClockIcon className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                        <p className="text-gray-400">No scheduled maintenance</p>
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-6">
                      {sortedDates.map((date, dateIndex) => (
                        <div key={date} className="relative">
                          {/* Date header */}
                          <div className="flex items-center gap-4 mb-4">
                            <div className="flex flex-col items-center">
                              <div
                                className={`w-12 h-12 rounded-full border-2 flex items-center justify-center ${
                                  new Date(date) < new Date()
                                    ? 'bg-warning-500/20 border-warning-500'
                                    : 'bg-primary-500/20 border-primary-500'
                                }`}
                              >
                                <span
                                  className={`text-xs font-bold ${
                                    new Date(date) < new Date()
                                      ? 'text-warning-400'
                                      : 'text-primary-400'
                                  }`}
                                >
                                  {new Date(date).getDate()}
                                </span>
                              </div>
                              {dateIndex < sortedDates.length - 1 && (
                                <div className="w-0.5 h-full bg-gray-700 mt-2" />
                              )}
                            </div>
                            <div className="flex-1">
                              <h3 className="text-lg font-semibold text-white">
                                {new Date(date).toLocaleDateString('en-US', {
                                  weekday: 'long',
                                  month: 'long',
                                  day: 'numeric',
                                })}
                              </h3>
                              <p className="text-sm text-gray-400">
                                {itemsByDate[date].length} item
                                {itemsByDate[date].length !== 1 ? 's' : ''} scheduled
                              </p>
                            </div>
                          </div>

                          {/* Items for this date */}
                          <div className="ml-16 space-y-3">
                            {itemsByDate[date].map(item => (
                              <div
                                key={item.id}
                                className={`bg-white/5 border rounded-lg p-4 transition-colors ${
                                  item.type === 'equipment'
                                    ? 'border-gray-700 hover:border-gray-600'
                                    : item.priority === MaintenancePriority.EMERGENCY
                                      ? 'border-error-500/50 bg-error-500/5'
                                      : 'border-gray-700 hover:border-gray-600'
                                }`}
                              >
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                      {item.type === 'equipment' ? (
                                        <WrenchScrewdriverIcon className="h-5 w-5 text-gray-400" />
                                      ) : (
                                        <ClipboardDocumentListIcon className="h-5 w-5 text-gray-400" />
                                      )}
                                      <h4 className="font-semibold text-white">{item.title}</h4>
                                      {item.type === 'request' && item.priority && (
                                        <PriorityBadge priority={item.priority} />
                                      )}
                                      {item.type === 'request' && (
                                        <StatusBadge status={item.status as MaintenanceStatus} />
                                      )}
                                      {item.type === 'equipment' && (
                                        <span
                                          className={`px-2 py-1 rounded text-xs font-semibold ${
                                            item.status === AssetStatus.OPERATIONAL
                                              ? 'bg-success-500/20 text-success-300'
                                              : item.status === AssetStatus.IN_MAINTENANCE
                                                ? 'bg-warning-500/20 text-warning-300'
                                                : item.status === AssetStatus.OUT_OF_SERVICE
                                                  ? 'bg-error-500/20 text-error-300'
                                                  : 'bg-gray-500/20 text-gray-300'
                                          }`}
                                        >
                                          {item.status === AssetStatus.OPERATIONAL
                                            ? 'Operational'
                                            : item.status === AssetStatus.IN_MAINTENANCE
                                              ? 'In Maintenance'
                                              : item.status === AssetStatus.OUT_OF_SERVICE
                                                ? 'Out of Service'
                                                : 'Retired'}
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-gray-400 text-xs">ID: {item.id}</p>
                                  </div>
                                  <Button variant="secondary" size="sm">
                                    {item.type === 'equipment' ? 'View Equipment' : 'View Request'}
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </CardContent>
            </Card>

            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card variant="glass" className="p-6">
                <h3 className="text-sm text-gray-400 mb-2">Overdue</h3>
                <p className="text-3xl font-bold text-warning-400">
                  {equipment.filter(
                    e => e.nextMaintenanceDate && new Date(e.nextMaintenanceDate) < new Date()
                  ).length + requests.filter(r => r.status === MaintenanceStatus.OVERDUE).length}
                </p>
              </Card>
              <Card variant="glass" className="p-6">
                <h3 className="text-sm text-gray-400 mb-2">Due Today</h3>
                <p className="text-3xl font-bold text-primary-400">
                  {
                    equipment.filter(e => {
                      if (!e.nextMaintenanceDate) return false;
                      const serviceDate = new Date(e.nextMaintenanceDate).toDateString();
                      const today = new Date().toDateString();
                      return serviceDate === today;
                    }).length
                  }
                </p>
              </Card>
              <Card variant="glass" className="p-6">
                <h3 className="text-sm text-gray-400 mb-2">This Week</h3>
                <p className="text-3xl font-bold text-white">
                  {
                    equipment.filter(e => {
                      if (!e.nextMaintenanceDate) return false;
                      const serviceDate = new Date(e.nextMaintenanceDate);
                      const now = new Date();
                      const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
                      return serviceDate >= now && serviceDate <= weekFromNow;
                    }).length
                  }
                </p>
              </Card>
              <Card variant="glass" className="p-6">
                <h3 className="text-sm text-gray-400 mb-2">Active Requests</h3>
                <p className="text-3xl font-bold text-white">
                  {requests.filter(r => r.status === MaintenanceStatus.IN_PROGRESS).length}
                </p>
              </Card>
            </div>
          </div>
        )}

        {/* Equipment Tab */}
        {!isLoading && currentTab === 'equipment' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-white">Equipment Registry</h2>
              <p className="text-gray-400 text-sm mt-1">All warehouse equipment and status</p>
            </div>
            <Card variant="glass">
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {equipment.map(eq => (
                    <EquipmentStatusCard
                      key={eq.assetId}
                      equipment={eq}
                      onClick={() => {
                        /* Navigate to equipment details */
                      }}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Modals */}
        <CreateAssetModal
          isOpen={isCreateAssetModalOpen}
          onClose={() => setIsCreateAssetModalOpen(false)}
          onSuccess={handleModalSuccess}
        />
        <CreateWorkOrderModal
          isOpen={isCreateWorkOrderModalOpen}
          onClose={() => setIsCreateWorkOrderModalOpen(false)}
          onSuccess={handleModalSuccess}
          assets={equipment}
        />
      </main>
    </div>
  );
}

export default MaintenancePage;
