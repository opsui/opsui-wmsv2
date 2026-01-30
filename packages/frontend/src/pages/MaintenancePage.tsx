/**
 * Maintenance page
 *
 * Equipment maintenance and service request management
 * - Unique design: Equipment grid layout with status indicators
 */

import { useSearchParams } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent, Header, Button, useToast, Pagination } from '@/components/shared';
import { useAssets, useMaintenanceWorkOrders, useMaintenanceDashboard } from '@/services/api';
import { useEffect, useState } from 'react';
import {
  WrenchScrewdriverIcon,
  ClipboardDocumentListIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  PlusIcon,
  UserIcon,
  ArrowPathIcon,
  BellIcon,
} from '@heroicons/react/24/outline';

// ============================================================================
// TYPES
// ============================================================================

type TabType = 'dashboard' | 'requests' | 'schedule' | 'equipment';

interface MaintenanceRequest {
  requestId: string;
  title: string;
  description: string;
  equipment: string;
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  createdAt: string;
  assignedTo?: string;
  completedAt?: string;
}

interface Equipment {
  id: string;
  name: string;
  location: string;
  status: 'OPERATIONAL' | 'NEEDS_MAINTENANCE' | 'DOWN' | 'IN_SERVICE';
  lastService: string;
  nextService: string;
}

// ============================================================================
// SUBCOMPONENTS
// ============================================================================

// Equipment Status Card - distinctive grid layout
function EquipmentStatusCard({
  equipment,
  onClick,
}: {
  equipment: Equipment;
  onClick: () => void;
}) {
  const statusConfig = {
    OPERATIONAL: { color: 'success', icon: CheckCircleIcon, label: 'Operational' },
    NEEDS_MAINTENANCE: { color: 'warning', icon: WrenchScrewdriverIcon, label: 'Needs Service' },
    DOWN: { color: 'error', icon: ExclamationTriangleIcon, label: 'Down' },
    IN_SERVICE: { color: 'primary', icon: ArrowPathIcon, label: 'In Service' },
  };

  const config = statusConfig[equipment.status];
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
          <p className="text-sm text-gray-400 mt-1">{equipment.location}</p>
        </div>
        <div className={`p-2 rounded-lg bg-${config.color}-500/10`}>
          <StatusIcon className={`h-5 w-5 text-${config.color}-400`} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 pl-3">
        <div className="bg-white/5 p-2 rounded-lg">
          <p className="text-xs text-gray-400">Last Service</p>
          <p className="text-sm text-white">
            {new Date(equipment.lastService).toLocaleDateString()}
          </p>
        </div>
        <div className="bg-white/5 p-2 rounded-lg">
          <p className="text-xs text-gray-400">Next Service</p>
          <p className="text-sm text-white">
            {new Date(equipment.nextService).toLocaleDateString()}
          </p>
        </div>
      </div>

      <div className={`mt-3 pl-3 text-xs font-medium text-${config.color}-400`}>{config.label}</div>
    </button>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    PENDING: 'bg-gray-500/20 text-gray-300 border border-gray-500/30',
    IN_PROGRESS: 'bg-primary-500/20 text-primary-300 border border-primary-500/30',
    COMPLETED: 'bg-success-500/20 text-success-300 border border-success-500/30',
    CANCELLED: 'bg-error-500/20 text-error-300 border border-error-500/30',
  };

  const labels: Record<string, string> = {
    PENDING: 'Pending',
    IN_PROGRESS: 'In Progress',
    COMPLETED: 'Completed',
    CANCELLED: 'Cancelled',
  };

  return (
    <span
      className={`px-3 py-1 rounded-full text-xs font-semibold ${styles[status] || styles.PENDING}`}
    >
      {labels[status] || status}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  const styles: Record<string, string> = {
    LOW: 'bg-gray-500/10 text-gray-400',
    NORMAL: 'bg-blue-500/10 text-blue-400',
    HIGH: 'bg-orange-500/10 text-orange-400',
    URGENT: 'bg-red-500/10 text-red-400 animate-pulse',
  };

  return (
    <span className={`px-2 py-1 rounded text-xs font-medium ${styles[priority] || styles.NORMAL}`}>
      {priority}
    </span>
  );
}

function MaintenanceRequestCard({ request }: { request: MaintenanceRequest }) {
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
            <p className="text-gray-300">{request.description}</p>
            <p className="text-sm text-gray-400 mt-2">Equipment: {request.equipment}</p>
          </div>
          <WrenchScrewdriverIcon className="h-6 w-6 text-gray-500 flex-shrink-0 ml-4" />
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4 text-sm bg-white/5 p-3 rounded-lg">
          <div>
            <p className="text-gray-400 text-xs">Request ID</p>
            <p className="text-white font-medium">{request.requestId}</p>
          </div>
          <div>
            <p className="text-gray-400 text-xs">Created</p>
            <p className="text-white">{new Date(request.createdAt).toLocaleDateString()}</p>
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
          {request.status === 'PENDING' && (
            <Button variant="primary" size="sm" className="flex-1">
              Start Work
            </Button>
          )}
          {request.status === 'IN_PROGRESS' && (
            <Button variant="success" size="sm" className="flex-1">
              Update Progress
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// MAIN PAGE
// ============================================================================

function MaintenancePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = (searchParams.get('tab') as TabType) || 'dashboard';
  const { showToast } = useToast();
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Fetch maintenance data from backend
  const { data: dashboardData, isLoading: isDashboardLoading, error: dashboardError } = useMaintenanceDashboard();
  const { data: workOrdersData, isLoading: isWorkOrdersLoading, error: workOrdersError } = useMaintenanceWorkOrders();
  const { data: assetsData, isLoading: isAssetsLoading, error: assetsError } = useAssets();

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

  const requests: MaintenanceRequest[] = workOrdersData?.workOrders || [];
  const equipment: Equipment[] = assetsData?.assets || [];

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
        {/* Page Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Equipment Maintenance</h1>
            <p className="mt-2 text-gray-400">Manage service requests and equipment status</p>
          </div>
          <Button variant="primary" className="flex items-center gap-2">
            <PlusIcon className="h-5 w-5" />
            New Request
          </Button>
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
                  <div className="flex items-center gap-4 text-sm">
                    <span className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-success-500"></span>
                      Operational ({equipment.filter(e => e.status === 'OPERATIONAL').length})
                    </span>
                    <span className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-warning-500"></span>
                      Needs Service (
                      {equipment.filter(e => e.status === 'NEEDS_MAINTENANCE').length})
                    </span>
                    <span className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-error-500"></span>
                      Down ({equipment.filter(e => e.status === 'DOWN').length})
                    </span>
                    <span className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-primary-500"></span>
                      In Service ({equipment.filter(e => e.status === 'IN_SERVICE').length})
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {equipment.map(eq => (
                    <EquipmentStatusCard
                      key={eq.id}
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
                    <MaintenanceRequestCard key={request.requestId} request={request} />
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
              <Button variant="primary" className="flex items-center gap-2">
                <PlusIcon className="h-5 w-5" />
                New Request
              </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {paginatedRequests.map(request => (
                <MaintenanceRequestCard key={request.requestId} request={request} />
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
                    status: string;
                    priority?: string;
                  }> = [];

                  // Add equipment scheduled services
                  equipment.forEach(eq => {
                    scheduledItems.push({
                      id: eq.id,
                      title: `${eq.name} - Scheduled Service`,
                      type: 'equipment',
                      date: eq.nextService,
                      status: eq.status,
                    });
                  });

                  // Add maintenance requests with created dates
                  requests.forEach(req => {
                    if (req.status === 'PENDING' || req.status === 'IN_PROGRESS') {
                      scheduledItems.push({
                        id: req.requestId,
                        title: req.title,
                        type: 'request',
                        date: req.createdAt,
                        status: req.status,
                        priority: req.priority,
                      });
                    }
                  });

                  // Sort by date
                  scheduledItems.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

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
                              <div className={`w-12 h-12 rounded-full border-2 flex items-center justify-center ${
                                new Date(date) < new Date()
                                  ? 'bg-warning-500/20 border-warning-500'
                                  : 'bg-primary-500/20 border-primary-500'
                              }`}>
                                <span className={`text-xs font-bold ${
                                  new Date(date) < new Date() ? 'text-warning-400' : 'text-primary-400'
                                }`}>
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
                                {itemsByDate[date].length} item{itemsByDate[date].length !== 1 ? 's' : ''} scheduled
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
                                    : item.priority === 'URGENT'
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
                                        <StatusBadge status={item.status} />
                                      )}
                                      {item.type === 'equipment' && (
                                        <span
                                          className={`px-2 py-1 rounded text-xs font-semibold ${
                                            item.status === 'OPERATIONAL'
                                              ? 'bg-success-500/20 text-success-300'
                                              : item.status === 'NEEDS_MAINTENANCE'
                                                ? 'bg-warning-500/20 text-warning-300'
                                                : item.status === 'DOWN'
                                                  ? 'bg-error-500/20 text-error-300'
                                                  : 'bg-primary-500/20 text-primary-300'
                                          }`}
                                        >
                                          {item.status.replace('_', ' ')}
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
                  {
                    equipment.filter(e => new Date(e.nextService) < new Date()).length +
                    requests.filter(r => r.status === 'PENDING' && new Date(r.createdAt) < new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)).length
                  }
                </p>
              </Card>
              <Card variant="glass" className="p-6">
                <h3 className="text-sm text-gray-400 mb-2">Due Today</h3>
                <p className="text-3xl font-bold text-primary-400">
                  {
                    equipment.filter(e => {
                      const serviceDate = new Date(e.nextService).toDateString();
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
                      const serviceDate = new Date(e.nextService);
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
                  {requests.filter(r => r.status === 'IN_PROGRESS').length}
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
                      key={eq.id}
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
      </main>
    </div>
  );
}

export default MaintenancePage;
