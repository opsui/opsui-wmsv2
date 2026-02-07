/**
 * RMA (Return Merchandise Authorization) page
 *
 * Handles customer returns, warranty claims, and refurbishments
 * - Unique design: Returns pipeline layout with stage-based navigation
 */

import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Header,
  Button,
  Pagination,
  Breadcrumb,
} from '@/components/shared';
import {
  ArrowPathIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  PlusIcon,
  TruckIcon,
  CubeIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';
import { CreateRMAModal } from '@/components/rma/CreateRMAModal';
import { RMADetailModal } from '@/components/rma/RMADetailModal';
import {
  useRMADashboard,
  useRMARequests,
  useApproveRMA,
  useRejectRMA,
  useReceiveRMA,
  useStartInspection,
} from '@/services/api';
import { RMARequest, RMAStatus } from '@opsui/shared';

// ============================================================================
// TYPES
// ============================================================================

type TabType = 'dashboard' | 'requests' | 'processing' | 'completed';

// ============================================================================
// SUBCOMPONENTS
// ============================================================================

// Returns Pipeline Stage - vertical timeline style
function ReturnsPipelineStage({
  step,
  label,
  count,
  isActive,
  onClick,
}: {
  step: number;
  label: string;
  count: number;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`relative flex items-center gap-4 p-4 rounded-xl transition-all duration-300 ${
        isActive
          ? 'bg-primary-500/20 border-2 border-primary-500 shadow-lg shadow-primary-500/20'
          : 'bg-gray-800/50 border border-gray-700 hover:border-gray-600'
      }`}
    >
      {/* Step number circle */}
      <div
        className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${
          isActive ? 'bg-primary-500 text-white' : 'bg-gray-700 text-gray-400'
        }`}
      >
        {step}
      </div>

      {/* Content */}
      <div className="flex-1 text-left">
        <p className={`font-semibold ${isActive ? 'text-white' : 'text-gray-300'}`}>{label}</p>
        <p className={`text-sm ${isActive ? 'text-primary-400' : 'text-gray-500'}`}>
          {count} {count === 1 ? 'item' : 'items'}
        </p>
      </div>

      {/* Arrow for non-last items */}
      <div className="absolute -right-3 top-1/2 -translate-y-1/2 z-10 text-gray-700">
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </button>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    PENDING: 'bg-gray-500/20 text-gray-300 border border-gray-500/30',
    APPROVED: 'bg-blue-500/20 text-blue-300 border border-blue-500/30',
    RECEIVED: 'bg-purple-500/20 text-purple-300 border border-purple-500/30',
    INSPECTING: 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30',
    REFUNDED: 'bg-green-500/20 text-green-300 border border-green-500/30',
    REPLACED: 'bg-green-500/20 text-green-300 border border-green-500/30',
    REJECTED: 'bg-red-500/20 text-red-300 border border-red-500/30',
    CLOSED: 'bg-gray-500/20 text-gray-400 border border-gray-500/30',
  };

  const labels: Record<string, string> = {
    PENDING: 'Pending',
    APPROVED: 'Approved',
    RECEIVED: 'Received',
    INSPECTING: 'Inspecting',
    REFUNDED: 'Refunded',
    REPLACED: 'Replaced',
    REJECTED: 'Rejected',
    CLOSED: 'Closed',
  };

  return (
    <span
      className={`px-3 py-1 rounded-full text-xs font-semibold ${styles[status] || styles.PENDING}`}
    >
      {labels[status] || status}
    </span>
  );
}

function ReasonBadge({ reason }: { reason: string }) {
  const styles: Record<string, string> = {
    DEFECTIVE: 'bg-orange-500/10 text-orange-400',
    DAMAGED_SHIPPING: 'bg-red-500/10 text-red-400',
    WRONG_ITEM: 'bg-purple-500/10 text-purple-400',
    NO_LONGER_NEEDED: 'bg-gray-500/10 text-gray-400',
    WARRANTY: 'bg-blue-500/10 text-blue-400',
    OTHER: 'bg-gray-500/10 text-gray-400',
  };

  const labels: Record<string, string> = {
    DEFECTIVE: 'Defective',
    DAMAGED_SHIPPING: 'Damaged in Shipping',
    WRONG_ITEM: 'Wrong Item',
    NO_LONGER_NEEDED: 'No Longer Needed',
    WARRANTY: 'Warranty Claim',
    OTHER: 'Other',
  };

  return (
    <span className={`px-2 py-1 rounded text-xs font-medium ${styles[reason] || styles.OTHER}`}>
      {labels[reason] || reason}
    </span>
  );
}

function RMARequestCard({
  request,
  onViewDetails,
  onApprove,
  onReject,
  onReceive,
  onStartInspection,
}: {
  request: RMARequest;
  onViewDetails: (rmaId: string) => void;
  onApprove: (rmaId: string) => void;
  onReject: (rmaId: string) => void;
  onReceive: (rmaId: string) => void;
  onStartInspection: (rmaId: string) => void;
}) {
  const resolutionActions: Record<string, JSX.Element[]> = {
    [RMAStatus.PENDING]: [
      <Button
        variant="secondary"
        size="sm"
        className="flex-1"
        key="details"
        onClick={() => onViewDetails(request.rmaId)}
      >
        View Details
      </Button>,
      <Button
        variant="success"
        size="sm"
        className="flex-1"
        key="approve"
        onClick={() => onApprove(request.rmaId)}
      >
        Approve
      </Button>,
      <Button
        variant="danger"
        size="sm"
        className="flex-1"
        key="reject"
        onClick={() => onReject(request.rmaId)}
      >
        Reject
      </Button>,
    ],
    [RMAStatus.APPROVED]: [
      <Button
        variant="primary"
        size="sm"
        className="flex-1"
        key="receive"
        onClick={() => onReceive(request.rmaId)}
      >
        Mark Received
      </Button>,
    ],
    [RMAStatus.RECEIVED]: [
      <Button
        variant="primary"
        size="sm"
        className="flex-1"
        key="inspect"
        onClick={() => onStartInspection(request.rmaId)}
      >
        Start Inspection
      </Button>,
    ],
    [RMAStatus.INSPECTING]: [
      <Button
        variant="secondary"
        size="sm"
        className="flex-1"
        key="details"
        onClick={() => onViewDetails(request.rmaId)}
      >
        View Details
      </Button>,
    ],
    [RMAStatus.REFUNDED]: [
      <Button
        variant="secondary"
        size="sm"
        className="w-full"
        key="details"
        onClick={() => onViewDetails(request.rmaId)}
      >
        View Details
      </Button>,
    ],
    [RMAStatus.REPLACED]: [
      <Button
        variant="secondary"
        size="sm"
        className="w-full"
        key="details"
        onClick={() => onViewDetails(request.rmaId)}
      >
        View Details
      </Button>,
    ],
    [RMAStatus.REPAIRED]: [
      <Button
        variant="secondary"
        size="sm"
        className="w-full"
        key="details"
        onClick={() => onViewDetails(request.rmaId)}
      >
        View Details
      </Button>,
    ],
    [RMAStatus.REJECTED]: [
      <Button
        variant="secondary"
        size="sm"
        className="w-full"
        key="details"
        onClick={() => onViewDetails(request.rmaId)}
      >
        View Details
      </Button>,
    ],
    [RMAStatus.CLOSED]: [
      <Button
        variant="secondary"
        size="sm"
        className="w-full"
        key="details"
        onClick={() => onViewDetails(request.rmaId)}
      >
        View Details
      </Button>,
    ],
    [RMAStatus.AWAITING_DECISION]: [
      <Button
        variant="secondary"
        size="sm"
        className="w-full"
        key="details"
        onClick={() => onViewDetails(request.rmaId)}
      >
        View Details
      </Button>,
    ],
    [RMAStatus.REFUND_APPROVED]: [
      <Button
        variant="secondary"
        size="sm"
        className="w-full"
        key="details"
        onClick={() => onViewDetails(request.rmaId)}
      >
        View Details
      </Button>,
    ],
    [RMAStatus.REFUND_PROCESSING]: [
      <Button
        variant="secondary"
        size="sm"
        className="w-full"
        key="details"
        onClick={() => onViewDetails(request.rmaId)}
      >
        View Details
      </Button>,
    ],
    [RMAStatus.REPLACEMENT_APPROVED]: [
      <Button
        variant="secondary"
        size="sm"
        className="w-full"
        key="details"
        onClick={() => onViewDetails(request.rmaId)}
      >
        View Details
      </Button>,
    ],
    [RMAStatus.REPLACEMENT_PROCESSING]: [
      <Button
        variant="secondary"
        size="sm"
        className="w-full"
        key="details"
        onClick={() => onViewDetails(request.rmaId)}
      >
        View Details
      </Button>,
    ],
    [RMAStatus.REPAIR_APPROVED]: [
      <Button
        variant="secondary"
        size="sm"
        className="w-full"
        key="details"
        onClick={() => onViewDetails(request.rmaId)}
      >
        View Details
      </Button>,
    ],
    [RMAStatus.REPAIRING]: [
      <Button
        variant="secondary"
        size="sm"
        className="w-full"
        key="details"
        onClick={() => onViewDetails(request.rmaId)}
      >
        View Details
      </Button>,
    ],
  };

  return (
    <Card variant="glass" className="card-hover overflow-hidden">
      {/* Top status bar */}
      <div
        className={`h-1 ${
          request.status === 'REFUNDED' ||
          request.status === 'REPLACED' ||
          request.status === 'CLOSED'
            ? 'bg-success-500'
            : request.status === 'PENDING'
              ? 'bg-gray-500'
              : request.status === 'APPROVED' || request.status === 'RECEIVED'
                ? 'bg-blue-500'
                : request.status === 'INSPECTING'
                  ? 'bg-yellow-500'
                  : request.status === 'REJECTED'
                    ? 'bg-red-500'
                    : 'bg-gray-500'
        }`}
      />

      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="text-lg font-semibold text-white">{request.rmaId}</h3>
              <StatusBadge status={request.status} />
              <ReasonBadge reason={request.reason} />
            </div>
            <p className="text-gray-300 font-medium">{request.productName}</p>
            <p className="text-sm text-gray-400 mt-1">
              SKU: {request.sku} | Qty: {request.quantity}
            </p>
          </div>
        </div>

        {/* Customer and Order Info */}
        <div className="grid grid-cols-2 gap-3 mb-4 text-sm bg-white/5 p-3 rounded-lg">
          <div>
            <p className="text-gray-400 text-xs">Customer</p>
            <p className="text-white font-medium">{request.customerName}</p>
          </div>
          <div>
            <p className="text-gray-400 text-xs">Order ID</p>
            <p className="text-white font-medium">{request.orderId}</p>
          </div>
        </div>

        {/* Dates */}
        <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
          <div className="bg-white/5 p-2 rounded-lg">
            <p className="text-gray-400 text-xs">Created</p>
            <p className="text-white">{new Date(request.createdAt).toLocaleDateString()}</p>
          </div>
          {request.resolvedAt && (
            <div className="bg-white/5 p-2 rounded-lg">
              <p className="text-gray-400 text-xs">Resolved</p>
              <p className="text-success-400">
                {new Date(request.resolvedAt).toLocaleDateString()}
              </p>
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex gap-2">
          {resolutionActions[request.status] || resolutionActions.PENDING}
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// MAIN PAGE
// ============================================================================

function RMAPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = (searchParams.get('tab') as TabType) || 'dashboard';

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedRMAId, setSelectedRMAId] = useState<string | null>(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  // Pagination state
  const [requestsCurrentPage, setRequestsCurrentPage] = useState(1);
  const [processingCurrentPage, setProcessingCurrentPage] = useState(1);
  const [completedCurrentPage, setCompletedCurrentPage] = useState(1);
  const itemsPerPage = 6;

  // Search states
  const [requestsSearchTerm, setRequestsSearchTerm] = useState('');
  const [processingSearchTerm, setProcessingSearchTerm] = useState('');
  const [completedSearchTerm, setCompletedSearchTerm] = useState('');

  // API queries
  const { data: dashboard } = useRMADashboard();
  const { data: requestsData, refetch } = useRMARequests({ limit: 100 });

  // Mutations
  const approveMutation = useApproveRMA();
  const rejectMutation = useRejectRMA();
  const receiveMutation = useReceiveRMA();
  const inspectMutation = useStartInspection();

  const allRequests: RMARequest[] = requestsData?.requests || [];

  // Reset pagination when search changes
  useEffect(() => {
    setRequestsCurrentPage(1);
  }, [requestsSearchTerm]);

  useEffect(() => {
    setProcessingCurrentPage(1);
  }, [processingSearchTerm]);

  useEffect(() => {
    setCompletedCurrentPage(1);
  }, [completedSearchTerm]);

  // Refresh data when mutations complete
  useEffect(() => {
    if (
      approveMutation.isSuccess ||
      rejectMutation.isSuccess ||
      receiveMutation.isSuccess ||
      inspectMutation.isSuccess
    ) {
      refetch();
    }
  }, [
    approveMutation.isSuccess,
    rejectMutation.isSuccess,
    receiveMutation.isSuccess,
    inspectMutation.isSuccess,
    refetch,
  ]);

  const setTab = (tab: TabType) => {
    setSearchParams({ tab });
  };

  // Handlers
  const handleViewDetails = (rmaId: string) => {
    setSelectedRMAId(rmaId);
  };

  const handleApprove = async (rmaId: string) => {
    try {
      await approveMutation.mutateAsync(rmaId);
    } catch (error) {
      console.error('Failed to approve RMA:', error);
    }
  };

  const handleReject = async (rmaId: string) => {
    if (!rejectReason.trim()) {
      return;
    }
    try {
      await rejectMutation.mutateAsync({ rmaId, rejectionReason: rejectReason });
      setShowRejectModal(false);
      setRejectReason('');
    } catch (error) {
      console.error('Failed to reject RMA:', error);
    }
  };

  const handleReceive = async (rmaId: string) => {
    try {
      await receiveMutation.mutateAsync(rmaId);
    } catch (error) {
      console.error('Failed to mark RMA as received:', error);
    }
  };

  const handleStartInspection = async (rmaId: string) => {
    try {
      await inspectMutation.mutateAsync(rmaId);
    } catch (error) {
      console.error('Failed to start inspection:', error);
    }
  };

  // Returns pipeline stages
  const pipelineStages = [
    {
      step: 1,
      label: 'Requests',
      count: allRequests.filter(r => r.status === RMAStatus.PENDING).length,
      tab: 'requests' as TabType,
    },
    {
      step: 2,
      label: 'Approved',
      count: allRequests.filter(r => r.status === RMAStatus.APPROVED).length,
      tab: 'processing' as TabType,
    },
    {
      step: 3,
      label: 'Processing',
      count: allRequests.filter(r => [RMAStatus.RECEIVED, RMAStatus.INSPECTING].includes(r.status))
        .length,
      tab: 'processing' as TabType,
    },
    {
      step: 4,
      label: 'Completed',
      count: allRequests.filter(r =>
        [
          RMAStatus.REFUNDED,
          RMAStatus.REPLACED,
          RMAStatus.REPAIRED,
          RMAStatus.CLOSED,
          RMAStatus.REJECTED,
        ].includes(r.status)
      ).length,
      tab: 'completed' as TabType,
    },
  ];

  return (
    <div className="min-h-screen">
      <Header />

      <main className="w-full px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb Navigation */}
        <Breadcrumb />
        {/* Page Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
              <ArrowPathIcon className="h-8 w-8 text-primary-400" />
              Returns & RMA
            </h1>
            <p className="mt-2 text-gray-400">
              Customer returns, warranty claims, and refurbishments
            </p>
          </div>
          <Button
            variant="primary"
            className="flex items-center gap-2"
            onClick={() => setShowCreateModal(true)}
          >
            <PlusIcon className="h-5 w-5" />
            New RMA
          </Button>
        </div>

        {/* Dashboard Tab */}
        {currentTab === 'dashboard' && (
          <div className="space-y-8">
            {/* Returns Pipeline */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {pipelineStages.map(stage => (
                <div key={stage.step} className="relative">
                  <ReturnsPipelineStage
                    step={stage.step}
                    label={stage.label}
                    count={stage.count}
                    isActive={false}
                    onClick={() => setTab(stage.tab)}
                  />
                </div>
              ))}
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card variant="glass" className="p-6 border-t-4 border-t-warning-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Pending Review</p>
                    <p className="mt-2 text-3xl font-bold text-white">
                      {dashboard?.pendingRequests ?? 0}
                    </p>
                  </div>
                  <ClockIcon className="h-8 w-8 text-warning-400" />
                </div>
              </Card>
              <Card variant="glass" className="p-6 border-t-4 border-t-primary-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">In Progress</p>
                    <p className="mt-2 text-3xl font-bold text-white">
                      {dashboard?.inProgress ?? 0}
                    </p>
                  </div>
                  <CubeIcon className="h-8 w-8 text-primary-400" />
                </div>
              </Card>
              <Card variant="glass" className="p-6 border-t-4 border-t-success-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Completed Today</p>
                    <p className="mt-2 text-3xl font-bold text-white">
                      {dashboard?.completedToday ?? 0}
                    </p>
                  </div>
                  <CheckCircleIcon className="h-8 w-8 text-success-400" />
                </div>
              </Card>
              <Card variant="glass" className="p-6 border-t-4 border-t-error-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Urgent</p>
                    <p className="mt-2 text-3xl font-bold text-white">{dashboard?.urgent ?? 0}</p>
                  </div>
                  <ExclamationTriangleIcon className="h-8 w-8 text-error-400 animate-pulse" />
                </div>
              </Card>
            </div>

            {/* Quick Actions */}
            <Card variant="glass">
              <CardHeader>
                <CardTitle>Returns Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Button
                    variant="primary"
                    size="lg"
                    className="flex items-center justify-center gap-2"
                    onClick={() => setShowCreateModal(true)}
                  >
                    <PlusIcon className="h-5 w-5" />
                    <span>New RMA Request</span>
                  </Button>
                  <Button
                    variant="secondary"
                    size="lg"
                    className="flex items-center justify-center gap-2"
                    onClick={() => setTab('processing')}
                  >
                    <CubeIcon className="h-5 w-5" />
                    <span>View Processing</span>
                  </Button>
                  <Button
                    variant="secondary"
                    size="lg"
                    className="flex items-center justify-center gap-2"
                    onClick={() => setTab('requests')}
                  >
                    <TruckIcon className="h-5 w-5" />
                    <span>Track Returns</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Requests Tab */}
        {currentTab === 'requests' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-white">RMA Requests</h2>
                <p className="text-gray-400 text-sm mt-1">
                  Pending return requests awaiting review
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search requests..."
                    value={requestsSearchTerm}
                    onChange={e => setRequestsSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2.5 w-64 bg-white/[0.05] border border-white/[0.08] rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-primary-500/50 focus:bg-white/[0.08] transition-all duration-300"
                  />
                </div>
                <Button
                  variant="primary"
                  className="flex items-center gap-2"
                  onClick={() => setShowCreateModal(true)}
                >
                  <PlusIcon className="h-5 w-5" />
                  New Request
                </Button>
              </div>
            </div>

            {(() => {
              const filteredRequests = allRequests.filter(r => {
                if (r.status !== 'PENDING') return false;
                if (!requestsSearchTerm.trim()) return true;
                const query = requestsSearchTerm.toLowerCase();
                return (
                  r.rmaId?.toLowerCase().includes(query) ||
                  r.customerName?.toLowerCase().includes(query) ||
                  r.orderId?.toLowerCase().includes(query) ||
                  r.sku?.toLowerCase().includes(query) ||
                  r.productName?.toLowerCase().includes(query) ||
                  r.reason?.toLowerCase().includes(query)
                );
              });
              const totalPages = Math.ceil(filteredRequests.length / itemsPerPage);
              const paginatedRequests = filteredRequests.slice(
                (requestsCurrentPage - 1) * itemsPerPage,
                requestsCurrentPage * itemsPerPage
              );
              return (
                <>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {paginatedRequests.length === 0 ? (
                      <Card variant="glass">
                        <CardContent className="p-12 text-center">
                          <p className="text-gray-400">No requests match your search</p>
                        </CardContent>
                      </Card>
                    ) : (
                      paginatedRequests.map(request => (
                        <RMARequestCard
                          key={request.rmaId}
                          request={request}
                          onViewDetails={handleViewDetails}
                          onApprove={handleApprove}
                          onReject={handleReject}
                          onReceive={handleReceive}
                          onStartInspection={handleStartInspection}
                        />
                      ))
                    )}
                  </div>

                  {/* Pagination for Requests */}
                  {totalPages > 1 && (
                    <div className="flex justify-center mt-6">
                      <Pagination
                        currentPage={requestsCurrentPage}
                        totalItems={filteredRequests.length}
                        pageSize={itemsPerPage}
                        onPageChange={setRequestsCurrentPage}
                      />
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        )}

        {/* Processing Tab */}
        {currentTab === 'processing' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-white">Returns Processing</h2>
                <p className="text-gray-400 text-sm mt-1">
                  Approved returns being inspected and processed
                </p>
              </div>
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search processing..."
                  value={processingSearchTerm}
                  onChange={e => setProcessingSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2.5 w-64 bg-white/[0.05] border border-white/[0.08] rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-primary-500/50 focus:bg-white/[0.08] transition-all duration-300"
                />
              </div>
            </div>

            {(() => {
              const filteredRequests = allRequests.filter(r => {
                if (!['APPROVED', 'RECEIVED', 'INSPECTING'].includes(r.status)) return false;
                if (!processingSearchTerm.trim()) return true;
                const query = processingSearchTerm.toLowerCase();
                return (
                  r.rmaId?.toLowerCase().includes(query) ||
                  r.customerName?.toLowerCase().includes(query) ||
                  r.orderId?.toLowerCase().includes(query) ||
                  r.sku?.toLowerCase().includes(query) ||
                  r.productName?.toLowerCase().includes(query) ||
                  r.reason?.toLowerCase().includes(query)
                );
              });
              const totalPages = Math.ceil(filteredRequests.length / itemsPerPage);
              const paginatedRequests = filteredRequests.slice(
                (processingCurrentPage - 1) * itemsPerPage,
                processingCurrentPage * itemsPerPage
              );
              return (
                <>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {paginatedRequests.length === 0 ? (
                      <Card variant="glass">
                        <CardContent className="p-12 text-center">
                          <p className="text-gray-400">No processing items match your search</p>
                        </CardContent>
                      </Card>
                    ) : (
                      paginatedRequests.map(request => (
                        <RMARequestCard
                          key={request.rmaId}
                          request={request}
                          onViewDetails={handleViewDetails}
                          onApprove={handleApprove}
                          onReject={handleReject}
                          onReceive={handleReceive}
                          onStartInspection={handleStartInspection}
                        />
                      ))
                    )}
                  </div>

                  {/* Pagination for Processing */}
                  {totalPages > 1 && (
                    <div className="flex justify-center mt-6">
                      <Pagination
                        currentPage={processingCurrentPage}
                        totalItems={filteredRequests.length}
                        pageSize={itemsPerPage}
                        onPageChange={setProcessingCurrentPage}
                      />
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        )}

        {/* Completed Tab */}
        {currentTab === 'completed' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-white">Completed Returns</h2>
                <p className="text-gray-400 text-sm mt-1">History of all resolved RMA requests</p>
              </div>
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search completed..."
                  value={completedSearchTerm}
                  onChange={e => setCompletedSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2.5 w-64 bg-white/[0.05] border border-white/[0.08] rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-primary-500/50 focus:bg-white/[0.08] transition-all duration-300"
                />
              </div>
            </div>

            {(() => {
              const filteredRequests = allRequests.filter(r => {
                if (!['REFUNDED', 'REPLACED', 'REJECTED', 'CLOSED'].includes(r.status))
                  return false;
                if (!completedSearchTerm.trim()) return true;
                const query = completedSearchTerm.toLowerCase();
                return (
                  r.rmaId?.toLowerCase().includes(query) ||
                  r.customerName?.toLowerCase().includes(query) ||
                  r.orderId?.toLowerCase().includes(query) ||
                  r.sku?.toLowerCase().includes(query) ||
                  r.productName?.toLowerCase().includes(query) ||
                  r.reason?.toLowerCase().includes(query)
                );
              });
              const totalPages = Math.ceil(filteredRequests.length / itemsPerPage);
              const paginatedRequests = filteredRequests.slice(
                (completedCurrentPage - 1) * itemsPerPage,
                completedCurrentPage * itemsPerPage
              );
              return (
                <>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {paginatedRequests.length === 0 ? (
                      <Card variant="glass">
                        <CardContent className="p-12 text-center">
                          <p className="text-gray-400">No completed returns match your search</p>
                        </CardContent>
                      </Card>
                    ) : (
                      paginatedRequests.map(request => (
                        <RMARequestCard
                          key={request.rmaId}
                          request={request}
                          onViewDetails={handleViewDetails}
                          onApprove={handleApprove}
                          onReject={handleReject}
                          onReceive={handleReceive}
                          onStartInspection={handleStartInspection}
                        />
                      ))
                    )}
                  </div>

                  {/* Pagination for Completed */}
                  {totalPages > 1 && (
                    <div className="flex justify-center mt-6">
                      <Pagination
                        currentPage={completedCurrentPage}
                        totalItems={filteredRequests.length}
                        pageSize={itemsPerPage}
                        onPageChange={setCompletedCurrentPage}
                      />
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        )}
      </main>

      {/* Modals */}
      <CreateRMAModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => refetch()}
      />

      {selectedRMAId && (
        <RMADetailModal
          isOpen={!!selectedRMAId}
          onClose={() => setSelectedRMAId(null)}
          rmaId={selectedRMAId}
        />
      )}
    </div>
  );
}

export default RMAPage;
