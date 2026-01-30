/**
 * Exceptions Management Page
 *
 * Supervisor dashboard for viewing and resolving order exceptions
 */

import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  useExceptions,
  useOpenExceptions,
  useExceptionSummary,
  useResolveException,
  useReportProblem,
} from '@/services/api';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Header,
  Button,
  Pagination,
  Input,
  ListSkeleton,
  Skeleton,
  MetricCardSkeleton,
} from '@/components/shared';
import { useToast } from '@/components/shared';
import { useAuthStore } from '@/stores';
import {
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XMarkIcon,
  ClockIcon,
  ChevronRightIcon,
  ExclamationCircleIcon,
  InformationCircleIcon,
  ArrowUturnLeftIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';
import {
  ExceptionType,
  ExceptionStatus,
  ExceptionResolution,
  type OrderException,
} from '@opsui/shared';

// ============================================================================
// SUBCOMPONENTS
// ============================================================================

function ExceptionBadge({ status }: { status: ExceptionStatus }) {
  const statusConfig: Record<ExceptionStatus, { color: string; label: string }> = {
    [ExceptionStatus.OPEN]: {
      color: 'bg-red-900/60 text-red-300 border border-red-500/50',
      label: 'OPEN',
    },
    [ExceptionStatus.REVIEWING]: {
      color: 'bg-yellow-900/60 text-yellow-300 border border-yellow-500/50',
      label: 'REVIEWING',
    },
    [ExceptionStatus.APPROVED]: {
      color: 'bg-blue-900/60 text-blue-300 border border-blue-500/50',
      label: 'APPROVED',
    },
    [ExceptionStatus.REJECTED]: {
      color: 'bg-gray-700/60 text-gray-300 border border-gray-500/50',
      label: 'REJECTED',
    },
    [ExceptionStatus.RESOLVED]: {
      color: 'bg-green-900/60 text-green-300 border border-green-500/50',
      label: 'RESOLVED',
    },
    [ExceptionStatus.CANCELLED]: {
      color: 'bg-gray-700/60 text-gray-300 border border-gray-500/50',
      label: 'CANCELLED',
    },
  };

  const config = statusConfig[status] || statusConfig[ExceptionStatus.OPEN];

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
      {config.label}
    </span>
  );
}

function ExceptionTypeBadge({ type }: { type: ExceptionType }) {
  const typeConfig: Record<ExceptionType, { icon: any; color: string; label: string }> = {
    [ExceptionType.UNCLAIM]: {
      icon: XMarkIcon,
      color: 'text-gray-300',
      label: 'Unclaimed',
    },
    [ExceptionType.UNDO_PICK]: {
      icon: ArrowUturnLeftIcon,
      color: 'text-yellow-300',
      label: 'Undo Pick',
    },
    [ExceptionType.SHORT_PICK]: {
      icon: ExclamationTriangleIcon,
      color: 'text-red-300',
      label: 'Short Pick',
    },
    [ExceptionType.SHORT_PICK_BACKORDER]: {
      icon: ClockIcon,
      color: 'text-yellow-300',
      label: 'Backorder',
    },
    [ExceptionType.DAMAGE]: {
      icon: ExclamationCircleIcon,
      color: 'text-red-300',
      label: 'Damaged',
    },
    [ExceptionType.DEFECTIVE]: {
      icon: ExclamationCircleIcon,
      color: 'text-red-300',
      label: 'Defective',
    },
    [ExceptionType.WRONG_ITEM]: {
      icon: ExclamationTriangleIcon,
      color: 'text-red-300',
      label: 'Wrong Item',
    },
    [ExceptionType.SUBSTITUTION]: {
      icon: InformationCircleIcon,
      color: 'text-blue-300',
      label: 'Substitution',
    },
    [ExceptionType.OUT_OF_STOCK]: {
      icon: ExclamationTriangleIcon,
      color: 'text-red-300',
      label: 'Out of Stock',
    },
    [ExceptionType.BIN_MISMATCH]: {
      icon: ExclamationTriangleIcon,
      color: 'text-yellow-300',
      label: 'Bin Mismatch',
    },
    [ExceptionType.BARCODE_MISMATCH]: {
      icon: ExclamationTriangleIcon,
      color: 'text-yellow-300',
      label: 'Barcode Issue',
    },
    [ExceptionType.EXPIRED]: {
      icon: ExclamationTriangleIcon,
      color: 'text-red-300',
      label: 'Expired',
    },
    [ExceptionType.OTHER]: { icon: InformationCircleIcon, color: 'text-gray-300', label: 'Other' },
  };

  const config = typeConfig[type] || typeConfig[ExceptionType.OTHER];
  const Icon = config.icon;

  return (
    <div className="flex items-center gap-1.5">
      <Icon className={`h-4 w-4 ${config.color}`} />
      <span className="text-sm font-medium text-white">{config.label}</span>
    </div>
  );
}

// ============================================================================
// COMPONENT
// ============================================================================

export function ExceptionsPage() {
  const { showToast } = useToast();
  const location = useLocation();
  const navigate = useNavigate();
  const searchParams = new URLSearchParams(location.search);
  const isReportMode = searchParams.get('report') === 'true';

  const canSupervise = useAuthStore(state => state.canSupervise);
  const currentUser = useAuthStore(state => state.user);
  const [selectedException, setSelectedException] = useState<OrderException | null>(null);
  const [filterStatus, setFilterStatus] = useState<ExceptionStatus | 'all'>('all');
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [resolution, setResolution] = useState<ExceptionResolution>(ExceptionResolution.BACKORDER);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [substituteSku, setSubstituteSku] = useState('');
  const [newQuantity, setNewQuantity] = useState(0);
  const [newBinLocation, setNewBinLocation] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [searchQuery, setSearchQuery] = useState('');

  // Report problem states
  const [problemType, setProblemType] = useState<'EQUIPMENT' | 'FACILITY' | 'SYSTEM' | 'OTHER'>(
    'OTHER'
  );
  const [problemDescription, setProblemDescription] = useState('');
  const [problemLocation, setProblemLocation] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Report problem mutation
  const reportProblemMutation = useReportProblem();

  // Fetch exceptions
  const {
    data: allExceptions,
    isLoading: allLoading,
    refetch: refetchAll,
  } = useExceptions(
    filterStatus === 'all'
      ? { limit: pageSize, offset: (page - 1) * pageSize }
      : { status: filterStatus, limit: pageSize, offset: (page - 1) * pageSize }
  );

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [filterStatus, searchQuery]);

  const {
    data: openExceptions,
    isLoading: openLoading,
    refetch: refetchOpen,
  } = useOpenExceptions();
  const {
    data: summary,
    isLoading: summaryLoading,
    refetch: refetchSummary,
  } = useExceptionSummary();

  const resolveMutation = useResolveException();

  // In report mode, allow all authenticated users to report problems
  // Otherwise, require supervisor/admin access
  if (!isReportMode && !canSupervise()) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="max-w-md">
          <CardContent className="p-6 text-center">
            <ExclamationTriangleIcon className="h-12 w-12 text-warning-600 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">Access Denied</h2>
            <p className="text-gray-400">
              You need supervisor or admin privileges to view this page.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleResolve = async () => {
    if (!selectedException || !currentUser) return;

    try {
      await resolveMutation.mutateAsync({
        exceptionId: selectedException.exceptionId,
        dto: {
          exceptionId: selectedException.exceptionId,
          resolution,
          notes: resolutionNotes,
          resolvedBy: currentUser.userId,
          substituteSku: resolution === ExceptionResolution.SUBSTITUTE ? substituteSku : undefined,
          newQuantity: resolution === ExceptionResolution.ADJUST_QUANTITY ? newQuantity : undefined,
          newBinLocation:
            resolution === ExceptionResolution.TRANSFER_BIN ? newBinLocation : undefined,
        },
      });

      // Refetch data
      refetchAll();
      refetchOpen();
      refetchSummary();

      setShowResolveModal(false);
      setSelectedException(null);
      setResolutionNotes('');
      setSubstituteSku('');
      setNewQuantity(0);
      setNewBinLocation('');
    } catch (error) {
      console.error('Failed to resolve exception:', error);
    }
  };

  const getResolutionOptions = (exceptionType: ExceptionType) => {
    const commonOptions = [
      {
        value: ExceptionResolution.CANCEL_ITEM,
        label: 'Cancel Item',
        description: 'Remove this item from the order',
      },
      {
        value: ExceptionResolution.CANCEL_ORDER,
        label: 'Cancel Order',
        description: 'Cancel the entire order',
      },
      {
        value: ExceptionResolution.CONTACT_CUSTOMER,
        label: 'Contact Customer',
        description: 'Reach out to customer for guidance',
      },
      {
        value: ExceptionResolution.MANUAL_OVERRIDE,
        label: 'Manual Override',
        description: 'Manually resolve without automated action',
      },
    ];

    const typeSpecificOptions: Record<ExceptionType, typeof commonOptions> = {
      [ExceptionType.UNCLAIM]: [
        {
          value: ExceptionResolution.MANUAL_OVERRIDE,
          label: 'Re-assign Order',
          description: 'Assign order to a different picker/packer',
        },
        {
          value: ExceptionResolution.CONTACT_CUSTOMER,
          label: 'Investigate Issue',
          description: 'Review the unclaim reason and follow up',
        },
        {
          value: ExceptionResolution.CANCEL_ORDER,
          label: 'Cancel Order',
          description: 'Cancel the order if needed',
        },
        {
          value: ExceptionResolution.MANUAL_OVERRIDE,
          label: 'Archive',
          description: 'Mark as reviewed and close',
        },
      ],
      [ExceptionType.SHORT_PICK]: [
        {
          value: ExceptionResolution.BACKORDER,
          label: 'Backorder',
          description: 'Place item on backorder',
        },
        {
          value: ExceptionResolution.SUBSTITUTE,
          label: 'Substitute',
          description: 'Offer substitute product',
        },
        {
          value: ExceptionResolution.ADJUST_QUANTITY,
          label: 'Adjust Quantity',
          description: 'Update quantity to what is available',
        },
        ...commonOptions,
      ],
      [ExceptionType.SHORT_PICK_BACKORDER]: [
        {
          value: ExceptionResolution.BACKORDER,
          label: 'Backorder',
          description: 'Confirm backorder for customer',
        },
        {
          value: ExceptionResolution.SUBSTITUTE,
          label: 'Substitute',
          description: 'Offer substitute product instead',
        },
        {
          value: ExceptionResolution.CANCEL_ITEM,
          label: 'Cancel Item',
          description: 'Remove this item from order',
        },
        ...commonOptions.filter(o => o.value !== ExceptionResolution.CANCEL_ITEM),
      ],
      [ExceptionType.DAMAGE]: [
        {
          value: ExceptionResolution.RETURN_TO_STOCK,
          label: 'Return to Stock',
          description: 'Return item if salvageable',
        },
        {
          value: ExceptionResolution.WRITE_OFF,
          label: 'Write Off',
          description: 'Write off damaged item',
        },
        {
          value: ExceptionResolution.SUBSTITUTE,
          label: 'Substitute',
          description: 'Send replacement item',
        },
        ...commonOptions,
      ],
      [ExceptionType.DEFECTIVE]: [
        {
          value: ExceptionResolution.RETURN_TO_STOCK,
          label: 'Return to Stock',
          description: 'Return for RMA if applicable',
        },
        {
          value: ExceptionResolution.WRITE_OFF,
          label: 'Write Off',
          description: 'Write off defective item',
        },
        {
          value: ExceptionResolution.SUBSTITUTE,
          label: 'Substitute',
          description: 'Send replacement item',
        },
        ...commonOptions,
      ],
      [ExceptionType.WRONG_ITEM]: [
        {
          value: ExceptionResolution.TRANSFER_BIN,
          label: 'Transfer Bin',
          description: 'Move item to correct bin location',
        },
        {
          value: ExceptionResolution.RETURN_TO_STOCK,
          label: 'Return to Stock',
          description: 'Return item to inventory',
        },
        ...commonOptions,
      ],
      [ExceptionType.SUBSTITUTION]: [
        {
          value: ExceptionResolution.SUBSTITUTE,
          label: 'Confirm Substitution',
          description: 'Process the substitution',
        },
        ...commonOptions,
      ],
      [ExceptionType.OUT_OF_STOCK]: [
        {
          value: ExceptionResolution.BACKORDER,
          label: 'Backorder',
          description: 'Place on backorder',
        },
        {
          value: ExceptionResolution.SUBSTITUTE,
          label: 'Substitute',
          description: 'Offer alternative product',
        },
        {
          value: ExceptionResolution.CANCEL_ITEM,
          label: 'Cancel Item',
          description: 'Remove item from order',
        },
        ...commonOptions.filter(o => o.value !== ExceptionResolution.CANCEL_ITEM),
      ],
      [ExceptionType.BIN_MISMATCH]: [
        {
          value: ExceptionResolution.TRANSFER_BIN,
          label: 'Transfer Bin',
          description: 'Update to correct bin location',
        },
        {
          value: ExceptionResolution.RETURN_TO_STOCK,
          label: 'Return to Stock',
          description: 'Return item for proper stocking',
        },
        ...commonOptions,
      ],
      [ExceptionType.BARCODE_MISMATCH]: [
        {
          value: ExceptionResolution.MANUAL_OVERRIDE,
          label: 'Manual Override',
          description: 'Manually verify and correct',
        },
        ...commonOptions,
      ],
      [ExceptionType.EXPIRED]: [
        {
          value: ExceptionResolution.WRITE_OFF,
          label: 'Write Off',
          description: 'Dispose of expired item',
        },
        {
          value: ExceptionResolution.SUBSTITUTE,
          label: 'Substitute',
          description: 'Send fresh replacement',
        },
        ...commonOptions,
      ],
      [ExceptionType.OTHER]: commonOptions,
    };

    return typeSpecificOptions[exceptionType] || commonOptions;
  };

  const displayExceptions =
    filterStatus === 'all' || filterStatus === ExceptionStatus.OPEN
      ? openExceptions?.exceptions || []
      : allExceptions?.exceptions || [];

  // Filter exceptions based on search
  const filteredExceptions = displayExceptions.filter(exc => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      exc.exceptionId?.toLowerCase().includes(query) ||
      exc.orderId?.toLowerCase().includes(query) ||
      exc.sku?.toLowerCase().includes(query) ||
      exc.type?.toLowerCase().includes(query) ||
      exc.status?.toLowerCase().includes(query)
    );
  });

  return (
    <div className="min-h-screen">
      <Header />
      <main className="w-full px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Report Problem Form */}
        {isReportMode && (
          <div className="animate-in">
            {submitSuccess ? (
              <Card className="max-w-2xl mx-auto border-2 border-green-500/30">
                <CardContent className="p-8 text-center">
                  <CheckCircleIcon className="h-16 w-16 text-success-500 mx-auto mb-4" />
                  <h2 className="text-2xl font-bold text-white mb-2">Problem Reported</h2>
                  <p className="text-gray-300 mb-6">
                    Thank you for reporting this issue. The admin team has been notified and will
                    review it shortly.
                  </p>
                  <Button
                    onClick={() => {
                      setSubmitSuccess(false);
                      setProblemDescription('');
                      setProblemLocation('');
                      setProblemType('OTHER');
                    }}
                  >
                    Report Another Problem
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <Card className="max-w-2xl mx-auto">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ExclamationCircleIcon className="h-6 w-6 text-warning-500" />
                    Report a Problem
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Problem Type
                    </label>
                    <select
                      value={problemType}
                      onChange={e => setProblemType(e.target.value as any)}
                      className="w-full px-4 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="EQUIPMENT">Equipment Issue</option>
                      <option value="FACILITY">Facility/Infrastructure</option>
                      <option value="SYSTEM">System/Software</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Location (optional)
                    </label>
                    <Input
                      type="text"
                      value={problemLocation}
                      onChange={e => setProblemLocation(e.target.value)}
                      placeholder="e.g., Zone A, Bin 12-03, Packing Station 2"
                      className="w-full"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Description *
                    </label>
                    <textarea
                      value={problemDescription}
                      onChange={e => setProblemDescription(e.target.value)}
                      placeholder="Please describe the problem you're experiencing..."
                      rows={4}
                      className="w-full px-4 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      required
                    />
                  </div>

                  <div className="flex gap-3 justify-end">
                    <Button variant="secondary" onClick={() => navigate('/exceptions')}>
                      Cancel
                    </Button>
                    <Button
                      onClick={async () => {
                        if (!problemDescription.trim()) {
                          return;
                        }
                        try {
                          await reportProblemMutation.mutateAsync({
                            problemType,
                            location: problemLocation || undefined,
                            description: problemDescription,
                          });
                          setSubmitSuccess(true);
                        } catch (error) {
                          console.error('Failed to report problem:', error);
                        }
                      }}
                      disabled={reportProblemMutation.isPending || !problemDescription.trim()}
                    >
                      {reportProblemMutation.isPending ? 'Submitting...' : 'Submit Report'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Exception Management Interface - only show when NOT in report mode */}
        {!isReportMode && canSupervise() && (
          <>
            {/* Page Header */}
            <div className="animate-in">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h1 className="text-3xl font-bold text-white tracking-tight">
                    Exception Management
                  </h1>
                  <p className="mt-2 text-gray-400">View and resolve order exceptions</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search exceptions..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="pl-9 pr-3 py-1.5 w-64 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      refetchAll();
                      refetchOpen();
                      refetchSummary();
                    }}
                  >
                    <ClockIcon className="h-4 w-4 mr-2" />
                    Refresh
                  </Button>
                </div>
              </div>
            </div>

            {/* Summary Cards */}
            {!summaryLoading && summary && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card variant="glass" className="card-hover">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-400 uppercase tracking-wider">
                          Total Exceptions
                        </p>
                        <p className="mt-3 text-3xl font-bold text-white tracking-tight">
                          {summary.total}
                        </p>
                      </div>
                      <div className="p-3 rounded-xl bg-gray-500/10 text-gray-400 border border-gray-500/20">
                        <ExclamationTriangleIcon className="h-6 w-6" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card variant="glass" className="card-hover">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-400 uppercase tracking-wider">
                          Open
                        </p>
                        <p className="mt-3 text-3xl font-bold text-error-400 tracking-tight">
                          {summary.open}
                        </p>
                      </div>
                      <div className="p-3 rounded-xl bg-error-500/10 text-error-400 border border-error-500/20">
                        <ExclamationCircleIcon className="h-6 w-6" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card variant="glass" className="card-hover">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-400 uppercase tracking-wider">
                          Resolved
                        </p>
                        <p className="mt-3 text-3xl font-bold text-success-400 tracking-tight">
                          {summary.resolved}
                        </p>
                      </div>
                      <div className="p-3 rounded-xl bg-success-500/10 text-success-400 border border-success-500/20">
                        <CheckCircleIcon className="h-6 w-6" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card variant="glass" className="card-hover">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-400 uppercase tracking-wider">
                          Resolution Rate
                        </p>
                        <p className="mt-3 text-3xl font-bold text-primary-400 tracking-tight">
                          {summary.total > 0
                            ? Math.round((summary.resolved / summary.total) * 100)
                            : 0}
                          %
                        </p>
                      </div>
                      <div className="p-3 rounded-xl bg-primary-500/10 text-primary-400 border border-primary-500/20">
                        <InformationCircleIcon className="h-6 w-6" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Type Breakdown */}
            {!summaryLoading && summary && Object.keys(summary.byType).length > 0 && (
              <Card variant="glass" className="card-hover">
                <CardHeader>
                  <CardTitle>Exceptions by Type</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {Object.entries(summary.byType).map(([type, count]) => (
                      <div
                        key={type}
                        className="text-center p-4 rounded-xl bg-white/[0.02] border border-white/[0.05]"
                      >
                        <p className="text-2xl font-bold text-white">{count}</p>
                        <p className="text-xs text-gray-400 mt-1">{type.replace(/_/g, ' ')}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Filter Tabs */}
            <div className="flex gap-2">
              <button
                onClick={() => setFilterStatus('all')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  filterStatus === 'all'
                    ? 'bg-primary-500 text-white'
                    : 'bg-white/[0.02] text-gray-400 hover:text-white border border-white/[0.05]'
                }`}
              >
                All ({openExceptions?.total || 0})
              </button>
              <button
                onClick={() => setFilterStatus(ExceptionStatus.OPEN)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  filterStatus === ExceptionStatus.OPEN
                    ? 'bg-primary-500 text-white'
                    : 'bg-white/[0.02] text-gray-400 hover:text-white border border-white/[0.05]'
                }`}
              >
                Open ({summary?.open || 0})
              </button>
              <button
                onClick={() => setFilterStatus(ExceptionStatus.RESOLVED)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  filterStatus === ExceptionStatus.RESOLVED
                    ? 'bg-primary-500 text-white'
                    : 'bg-white/[0.02] text-gray-400 hover:text-white border border-white/[0.05]'
                }`}
              >
                Resolved ({summary?.resolved || 0})
              </button>
            </div>

            {/* Exceptions List */}
            <Card variant="glass" className="card-hover">
              <CardHeader>
                <CardTitle>
                  {filterStatus === 'all'
                    ? 'All Open Exceptions'
                    : filterStatus === ExceptionStatus.OPEN
                      ? 'Open Exceptions'
                      : filterStatus === ExceptionStatus.RESOLVED
                        ? 'Resolved Exceptions'
                        : 'Exceptions'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {openLoading ? (
                  <ListSkeleton items={6} />
                ) : filteredExceptions.length > 0 ? (
                  <div className="space-y-3">
                    {filteredExceptions.map(exception => {
                      return (
                        <div
                          key={exception.exceptionId}
                          className="border border-white/[0.08] rounded-xl p-4 hover:bg-white/[0.02] transition-all duration-300"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <ExceptionTypeBadge type={exception.type} />
                                <ExceptionBadge status={exception.status} />
                                <span className="text-xs text-gray-500">
                                  {exception.exceptionId}
                                </span>
                              </div>

                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                <div>
                                  <span className="text-gray-400">Order:</span>
                                  <span className="ml-2 text-white font-medium">
                                    {exception.orderId}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-gray-400">SKU:</span>
                                  <span className="ml-2 text-white font-medium">
                                    {exception.sku}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-gray-400">Qty:</span>
                                  <span className="ml-2 text-white">
                                    {exception.quantityActual} / {exception.quantityExpected}
                                    {exception.quantityShort > 0 && (
                                      <span className="text-error-400 ml-1">
                                        (-{exception.quantityShort})
                                      </span>
                                    )}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-gray-400">Reported:</span>
                                  <span className="ml-2 text-white">
                                    {new Date(exception.reportedAt).toLocaleString()}
                                  </span>
                                </div>
                              </div>

                              {exception.reason && (
                                <div className="mt-3 p-3 bg-white/[0.02] rounded-lg">
                                  <p className="text-sm text-gray-300">{exception.reason}</p>
                                </div>
                              )}

                              {exception.resolution && (
                                <div className="mt-3 flex items-center gap-2">
                                  <span className="text-sm text-gray-400">Resolution:</span>
                                  <span className="text-sm font-medium text-success-400">
                                    {exception.resolution.replace(/_/g, ' ')}
                                  </span>
                                </div>
                              )}

                              {exception.resolutionNotes && (
                                <div className="mt-2 p-3 bg-success-500/10 border border-success-500/20 rounded-lg">
                                  <p className="text-sm text-success-300">
                                    {exception.resolutionNotes}
                                  </p>
                                </div>
                              )}
                            </div>

                            {exception.status === ExceptionStatus.OPEN ? (
                              // Standard Exception: Resolve Button
                              <Button
                                variant="primary"
                                size="sm"
                                onClick={() => {
                                  setSelectedException(exception);
                                  setShowResolveModal(true);
                                  setResolution(ExceptionResolution.BACKORDER);
                                  setResolutionNotes('');
                                  setSubstituteSku('');
                                  setNewQuantity(0);
                                  setNewBinLocation('');
                                }}
                                className="ml-4"
                              >
                                Resolve
                                <ChevronRightIcon className="h-4 w-4 ml-1" />
                              </Button>
                            ) : null}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-16">
                    <CheckCircleIcon className="h-16 w-16 text-gray-600 mb-4" />
                    <p className="text-sm text-gray-400">
                      {searchQuery ? 'No exceptions match your search' : 'No exceptions found'}
                    </p>
                    <p className="text-xs text-gray-500 mt-2">
                      {!searchQuery && filterStatus === 'all'
                        ? 'Great job! No open exceptions.'
                        : 'No exceptions match this filter.'}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Pagination */}
            {allExceptions?.total && allExceptions.total > 0 && (
              <Pagination
                currentPage={page}
                totalItems={allExceptions.total}
                pageSize={pageSize}
                onPageChange={setPage}
                onPageSizeChange={setPageSize}
                pageSizeOptions={[10, 20, 50, 100]}
              />
            )}
          </>
        )}
      </main>

      {/* Resolve Modal - available to all authenticated users */}
      {showResolveModal && selectedException && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            {/* Background overlay */}
            <div
              className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
              onClick={() => setShowResolveModal(false)}
            ></div>

            {/* Modal panel */}
            <div className="inline-block align-bottom glass-card rounded-2xl text-left overflow-hidden shadow-premium-lg transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full animate-scale-in">
              {/* Modal header */}
              <div className="bg-white/[0.02] px-6 py-4 sm:px-6 flex items-center justify-between border-b border-white/[0.08]">
                <div>
                  <h3 className="text-lg leading-6 font-semibold text-white">Resolve Exception</h3>
                  <p className="mt-1 text-sm text-gray-400">{selectedException.exceptionId}</p>
                </div>
                <button
                  onClick={() => setShowResolveModal(false)}
                  className="text-gray-400 hover:text-white focus:outline-none transition-colors duration-200"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>

              {/* Modal content */}
              <div className="px-6 py-5 sm:px-6 max-h-[60vh] overflow-y-auto">
                {/* Exception Details */}
                <div className="mb-6 p-4 bg-white/[0.02] rounded-xl border border-white/[0.08]">
                  <div className="flex items-center gap-2 mb-3">
                    <ExceptionTypeBadge type={selectedException.type} />
                    <ExceptionBadge status={selectedException.status} />
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-400">Order:</span>
                      <span className="ml-2 text-white font-medium">
                        {selectedException.orderId}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400">SKU:</span>
                      <span className="ml-2 text-white font-medium">{selectedException.sku}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Expected:</span>
                      <span className="ml-2 text-white">{selectedException.quantityExpected}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Actual:</span>
                      <span className="ml-2 text-white">{selectedException.quantityActual}</span>
                    </div>
                  </div>
                  {selectedException.reason && (
                    <div className="mt-3 pt-3 border-t border-white/[0.05]">
                      <p className="text-xs text-gray-400 mb-1">Reason:</p>
                      <p className="text-sm text-gray-300">{selectedException.reason}</p>
                    </div>
                  )}
                </div>

                {/* Resolution Selection */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-white mb-3">
                      Select Resolution Action <span className="text-error-400">*</span>
                    </label>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {getResolutionOptions(selectedException.type).map(option => (
                        <button
                          key={option.value}
                          onClick={() => setResolution(option.value)}
                          className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                            resolution === option.value
                              ? 'border-primary-500 bg-primary-500/10'
                              : 'border-white/[0.08] hover:border-white/[0.15] bg-white/[0.02]'
                          }`}
                        >
                          <div className="font-medium text-white">{option.label}</div>
                          <div className="text-xs text-gray-400 mt-1">{option.description}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Conditional Fields */}
                  {resolution === ExceptionResolution.SUBSTITUTE && (
                    <div>
                      <label className="block text-sm font-medium text-white mb-2">
                        Substitute SKU
                      </label>
                      <input
                        type="text"
                        value={substituteSku}
                        onChange={e => setSubstituteSku(e.target.value.toUpperCase())}
                        className="w-full px-4 py-2 bg-white/[0.02] border border-white/[0.08] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-primary-500"
                        placeholder="Enter substitute SKU..."
                      />
                    </div>
                  )}

                  {resolution === ExceptionResolution.ADJUST_QUANTITY && (
                    <div>
                      <label className="block text-sm font-medium text-white mb-2">
                        New Quantity
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={selectedException.quantityExpected}
                        value={newQuantity}
                        onChange={e => setNewQuantity(parseInt(e.target.value) || 0)}
                        className="w-full px-4 py-2 bg-white/[0.02] border border-white/[0.08] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-primary-500"
                        placeholder="Enter new quantity..."
                      />
                    </div>
                  )}

                  {resolution === ExceptionResolution.TRANSFER_BIN && (
                    <div>
                      <label className="block text-sm font-medium text-white mb-2">
                        New Bin Location
                      </label>
                      <input
                        type="text"
                        value={newBinLocation}
                        onChange={e => setNewBinLocation(e.target.value.toUpperCase())}
                        className="w-full px-4 py-2 bg-white/[0.02] border border-white/[0.08] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-primary-500"
                        placeholder="Enter new bin location..."
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-white mb-2">
                      Resolution Notes
                    </label>
                    <textarea
                      value={resolutionNotes}
                      onChange={e => setResolutionNotes(e.target.value)}
                      rows={3}
                      className="w-full px-4 py-2 bg-white/[0.02] border border-white/[0.08] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-primary-500"
                      placeholder="Add notes about this resolution..."
                    />
                  </div>
                </div>
              </div>

              {/* Modal footer */}
              <div className="bg-white/[0.02] px-6 py-4 sm:px-6 sm:flex sm:flex-row-reverse gap-3 border-t border-white/[0.08]">
                <Button
                  variant="primary"
                  onClick={handleResolve}
                  disabled={resolveMutation.isPending}
                  className="w-full sm:w-auto"
                >
                  {resolveMutation.isPending ? 'Resolving...' : 'Resolve Exception'}
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => setShowResolveModal(false)}
                  className="w-full sm:w-auto"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
