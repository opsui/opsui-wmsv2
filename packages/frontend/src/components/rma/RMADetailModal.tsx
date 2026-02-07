/**
 * RMA Detail Modal
 *
 * Modal for viewing and managing RMA request details
 */

import { useState } from 'react';
import { Modal, Button, Card, CardContent, useToast, Badge } from '@/components/shared';
import {
  useRMA,
  useRMAActivity,
  useRMACommunications,
  useApproveRMA,
  useRejectRMA,
  useReceiveRMA,
  useStartInspection,
  useProcessRMARefund,
  useSendRMAReplacement,
  useCloseRMA,
  useCreateRMAInspection,
} from '@/services/api';
import {
  RMAStatus,
  RMAPriority,
  RMACondition,
  RMADisposition,
  RMAResolutionType,
} from '@opsui/shared';
import { CheckCircleIcon, XCircleIcon, ShoppingBagIcon } from '@heroicons/react/24/outline';

// ============================================================================
// TYPES
// ============================================================================

interface RMADetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  rmaId: string;
}

interface InspectionFormData {
  condition: RMACondition;
  disposition: RMADisposition;
  findings: string;
  recommendedResolution: RMAResolutionType;
  estimatedRefund: string;
}

interface RefundFormData {
  refundMethod: string;
  amount: string;
  notes: string;
}

interface ReplacementFormData {
  shippingMethod: string;
  shippingAddress: string;
  trackingNumber: string;
}

interface RejectFormData {
  rejectionReason: string;
}

const CONDITION_OPTIONS = [
  { value: RMACondition.NEW, label: 'New / Unopened' },
  { value: RMACondition.LIKE_NEW, label: 'Like New' },
  { value: RMACondition.GOOD, label: 'Good' },
  { value: RMACondition.FAIR, label: 'Fair' },
  { value: RMACondition.POOR, label: 'Poor' },
  { value: RMACondition.DAMAGED, label: 'Damaged' },
];

const DISPOSITION_OPTIONS = [
  { value: RMADisposition.RESALE, label: 'Return to Stock / Resale' },
  { value: RMADisposition.REFURBISH, label: 'Refurbish' },
  { value: RMADisposition.REPAIR, label: 'Repair' },
  { value: RMADisposition.DISPOSE, label: 'Dispose' },
  { value: RMADisposition.RETURN_TO_VENDOR, label: 'Return to Vendor' },
  { value: RMADisposition.QUARANTINE, label: 'Quarantine' },
];

const RESOLUTION_OPTIONS = [
  { value: RMAResolutionType.REFUND, label: 'Refund' },
  { value: RMAResolutionType.REPLACEMENT, label: 'Replacement' },
  { value: RMAResolutionType.REPAIR, label: 'Repair' },
  { value: RMAResolutionType.CREDIT, label: 'Store Credit' },
  { value: RMAResolutionType.EXCHANGE, label: 'Exchange' },
];

const REFUND_METHODS = [
  { value: 'ORIGINAL', label: 'Original Payment Method' },
  { value: 'STORE_CREDIT', label: 'Store Credit' },
  { value: 'CHECK', label: 'Check' },
  { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
];

const SHIPPING_METHODS = [
  { value: 'STANDARD', label: 'Standard Ground' },
  { value: 'EXPRESS', label: 'Express' },
  { value: 'OVERNIGHT', label: 'Overnight' },
  { value: 'EXPEDITED', label: 'Expedited' },
];

const selectClassName =
  'w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-primary-500/50';
const textareaClassName =
  'w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-primary-500/50';
const labelClassName = 'block text-sm font-medium text-gray-300 mb-1.5';

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

function StatusBadge({ status }: { status: RMAStatus }) {
  const styles: Record<RMAStatus, string> = {
    [RMAStatus.PENDING]: 'bg-gray-500/20 text-gray-300 border border-gray-500/30',
    [RMAStatus.APPROVED]: 'bg-blue-500/20 text-blue-300 border border-blue-500/30',
    [RMAStatus.REJECTED]: 'bg-red-500/20 text-red-300 border border-red-500/30',
    [RMAStatus.RECEIVED]: 'bg-purple-500/20 text-purple-300 border border-purple-500/30',
    [RMAStatus.INSPECTING]: 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30',
    [RMAStatus.AWAITING_DECISION]: 'bg-orange-500/20 text-orange-300 border border-orange-500/30',
    [RMAStatus.REFUND_APPROVED]: 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30',
    [RMAStatus.REFUND_PROCESSING]: 'bg-teal-500/20 text-teal-300 border border-teal-500/30',
    [RMAStatus.REFUNDED]: 'bg-green-500/20 text-green-300 border border-green-500/30',
    [RMAStatus.REPLACEMENT_APPROVED]:
      'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30',
    [RMAStatus.REPLACEMENT_PROCESSING]:
      'bg-violet-500/20 text-violet-300 border border-violet-500/30',
    [RMAStatus.REPLACED]: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30',
    [RMAStatus.REPAIR_APPROVED]: 'bg-pink-500/20 text-pink-300 border border-pink-500/30',
    [RMAStatus.REPAIRING]: 'bg-rose-500/20 text-rose-300 border border-rose-500/30',
    [RMAStatus.REPAIRED]: 'bg-lime-500/20 text-lime-300 border border-lime-500/30',
    [RMAStatus.CLOSED]: 'bg-gray-500/20 text-gray-400 border border-gray-500/30',
  };

  const labels: Record<RMAStatus, string> = {
    [RMAStatus.PENDING]: 'Pending',
    [RMAStatus.APPROVED]: 'Approved',
    [RMAStatus.REJECTED]: 'Rejected',
    [RMAStatus.RECEIVED]: 'Received',
    [RMAStatus.INSPECTING]: 'Inspecting',
    [RMAStatus.AWAITING_DECISION]: 'Awaiting Decision',
    [RMAStatus.REFUND_APPROVED]: 'Refund Approved',
    [RMAStatus.REFUND_PROCESSING]: 'Refund Processing',
    [RMAStatus.REFUNDED]: 'Refunded',
    [RMAStatus.REPLACEMENT_APPROVED]: 'Replacement Approved',
    [RMAStatus.REPLACEMENT_PROCESSING]: 'Replacement Processing',
    [RMAStatus.REPLACED]: 'Replaced',
    [RMAStatus.REPAIR_APPROVED]: 'Repair Approved',
    [RMAStatus.REPAIRING]: 'Repairing',
    [RMAStatus.REPAIRED]: 'Repaired',
    [RMAStatus.CLOSED]: 'Closed',
  };

  return (
    <Badge className={styles[status] || styles[RMAStatus.PENDING]}>
      {labels[status] || status}
    </Badge>
  );
}

function PriorityBadge({ priority }: { priority: RMAPriority }) {
  const styles: Record<RMAPriority, string> = {
    [RMAPriority.LOW]: 'bg-gray-500/20 text-gray-300',
    [RMAPriority.NORMAL]: 'bg-blue-500/20 text-blue-300',
    [RMAPriority.HIGH]: 'bg-orange-500/20 text-orange-300',
    [RMAPriority.URGENT]: 'bg-red-500/20 text-red-300',
  };

  return <Badge className={styles[priority]}>{priority}</Badge>;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function RMADetailModal({ isOpen, onClose, rmaId }: RMADetailModalProps) {
  const { showToast } = useToast();
  const { data: rma, isLoading } = useRMA(rmaId, isOpen);
  const { data: activityData } = useRMAActivity(rmaId, 50, isOpen);
  const { data: communicationsData } = useRMACommunications(rmaId, isOpen);

  const approveMutation = useApproveRMA();
  const rejectMutation = useRejectRMA();
  const receiveMutation = useReceiveRMA();
  const inspectMutation = useStartInspection();
  const refundMutation = useProcessRMARefund();
  const replacementMutation = useSendRMAReplacement();
  const closeMutation = useCloseRMA();
  const createInspectionMutation = useCreateRMAInspection();

  const [activeTab, setActiveTab] = useState<'details' | 'activity' | 'communications'>('details');
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [showInspectionForm, setShowInspectionForm] = useState(false);
  const [showRefundForm, setShowRefundForm] = useState(false);
  const [showReplacementForm, setShowReplacementForm] = useState(false);

  const [rejectForm, setRejectForm] = useState<RejectFormData>({ rejectionReason: '' });
  const [inspectionForm, setInspectionForm] = useState<InspectionFormData>({
    condition: RMACondition.GOOD,
    disposition: RMADisposition.RESALE,
    findings: '',
    recommendedResolution: RMAResolutionType.REFUND,
    estimatedRefund: '',
  });
  const [refundForm, setRefundForm] = useState<RefundFormData>({
    refundMethod: 'ORIGINAL',
    amount: '',
    notes: '',
  });
  const [replacementForm, setReplacementForm] = useState<ReplacementFormData>({
    shippingMethod: 'STANDARD',
    shippingAddress: '',
    trackingNumber: '',
  });

  const activity = activityData?.activity || [];
  const communications = communicationsData?.communications || [];

  if (isLoading) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="RMA Details" size="xl">
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
        </div>
      </Modal>
    );
  }

  if (!rma) {
    return null;
  }

  const handleApprove = async () => {
    try {
      await approveMutation.mutateAsync(rmaId);
      showToast('The RMA request has been approved.', 'success');
    } catch (error: any) {
      showToast(
        `Failed to approve RMA - ${error.response?.data?.error || error.message || 'Failed to approve RMA.'}`,
        'error'
      );
    }
  };

  const handleReject = async () => {
    if (!rejectForm.rejectionReason.trim()) {
      showToast('Please provide a reason for rejection.', 'warning');
      return;
    }
    try {
      await rejectMutation.mutateAsync({
        rmaId,
        rejectionReason: rejectForm.rejectionReason,
      });
      showToast('The RMA request has been rejected.', 'success');
      setShowRejectForm(false);
      setRejectForm({ rejectionReason: '' });
    } catch (error: any) {
      showToast(
        `Failed to reject RMA - ${error.response?.data?.error || error.message || 'Failed to reject RMA.'}`,
        'error'
      );
    }
  };

  const handleReceive = async () => {
    try {
      await receiveMutation.mutateAsync(rmaId);
      showToast('The return has been marked as received.', 'success');
    } catch (error: any) {
      showToast(
        `Failed to mark RMA as received - ${error.response?.data?.error || error.message || 'Failed to mark RMA as received.'}`,
        'error'
      );
    }
  };

  const handleStartInspection = async () => {
    try {
      await inspectMutation.mutateAsync(rmaId);
      showToast('The inspection process has been started.', 'success');
    } catch (error: any) {
      showToast(
        `Failed to start inspection - ${error.response?.data?.error || error.message || 'Failed to start inspection.'}`,
        'error'
      );
    }
  };

  const handleSubmitInspection = async () => {
    try {
      await createInspectionMutation.mutateAsync({
        rmaId,
        data: {
          ...inspectionForm,
          estimatedRefund: inspectionForm.estimatedRefund
            ? parseFloat(inspectionForm.estimatedRefund)
            : undefined,
        },
      });
      showToast('The inspection results have been recorded.', 'success');
      setShowInspectionForm(false);
    } catch (error: any) {
      showToast(
        `Failed to record inspection - ${error.response?.data?.error || error.message || 'Failed to record inspection.'}`,
        'error'
      );
    }
  };

  const handleProcessRefund = async () => {
    try {
      await refundMutation.mutateAsync({
        rmaId,
        data: {
          ...refundForm,
          amount: refundForm.amount ? parseFloat(refundForm.amount) : undefined,
        },
      });
      showToast('The refund has been processed successfully.', 'success');
      setShowRefundForm(false);
    } catch (error: any) {
      showToast(
        `Failed to process refund - ${error.response?.data?.error || error.message || 'Failed to process refund.'}`,
        'error'
      );
    }
  };

  const handleSendReplacement = async () => {
    try {
      await replacementMutation.mutateAsync({
        rmaId,
        data: replacementForm,
      });
      showToast('The replacement has been shipped.', 'success');
      setShowReplacementForm(false);
    } catch (error: any) {
      showToast(
        `Failed to ship replacement - ${error.response?.data?.error || error.message || 'Failed to ship replacement.'}`,
        'error'
      );
    }
  };

  const handleClose = async () => {
    try {
      await closeMutation.mutateAsync(rmaId);
      showToast('The RMA has been closed.', 'success');
      onClose();
    } catch (error: any) {
      showToast(
        `Failed to close RMA - ${error.response?.data?.error || error.message || 'Failed to close RMA.'}`,
        'error'
      );
    }
  };

  const canApprove = rma.status === RMAStatus.PENDING;
  const canReject = rma.status === RMAStatus.PENDING || rma.status === RMAStatus.APPROVED;
  const canReceive = rma.status === RMAStatus.APPROVED;
  const canInspect = rma.status === RMAStatus.RECEIVED || rma.status === RMAStatus.INSPECTING;
  const canProcessRefund =
    rma.status === RMAStatus.INSPECTING ||
    rma.status === RMAStatus.AWAITING_DECISION ||
    rma.status === RMAStatus.REFUND_APPROVED;
  const canSendReplacement =
    rma.status === RMAStatus.INSPECTING ||
    rma.status === RMAStatus.AWAITING_DECISION ||
    rma.status === RMAStatus.REPLACEMENT_APPROVED;
  const canClose = [
    RMAStatus.REFUNDED,
    RMAStatus.REPLACED,
    RMAStatus.REPAIRED,
    RMAStatus.REJECTED,
  ].includes(rma.status);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`RMA: ${rma.rmaNumber}`} size="xl">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <StatusBadge status={rma.status} />
            <PriorityBadge priority={rma.priority} />
          </div>
          <div className="flex gap-2">
            {canApprove && (
              <Button variant="success" size="sm" onClick={handleApprove}>
                <CheckCircleIcon className="h-4 w-4 mr-1" />
                Approve
              </Button>
            )}
            {canReject && !showRejectForm && (
              <Button variant="danger" size="sm" onClick={() => setShowRejectForm(true)}>
                <XCircleIcon className="h-4 w-4 mr-1" />
                Reject
              </Button>
            )}
            {canReceive && (
              <Button variant="primary" size="sm" onClick={handleReceive}>
                <ShoppingBagIcon className="h-4 w-4 mr-1" />
                Mark Received
              </Button>
            )}
            {canInspect && !showInspectionForm && (
              <Button variant="primary" size="sm" onClick={handleStartInspection}>
                Start Inspection
              </Button>
            )}
            {canProcessRefund && !showRefundForm && (
              <Button variant="success" size="sm" onClick={() => setShowRefundForm(true)}>
                Process Refund
              </Button>
            )}
            {canSendReplacement && !showReplacementForm && (
              <Button variant="primary" size="sm" onClick={() => setShowReplacementForm(true)}>
                Send Replacement
              </Button>
            )}
            {canClose && (
              <Button variant="secondary" size="sm" onClick={handleClose}>
                Close RMA
              </Button>
            )}
          </div>
        </div>

        {/* Reject Form */}
        {showRejectForm && (
          <Card variant="glass" className="p-4">
            <h4 className="text-lg font-semibold text-white mb-4">Reject RMA</h4>
            <div className="space-y-3">
              <label className={labelClassName}>Rejection Reason</label>
              <textarea
                value={rejectForm.rejectionReason}
                onChange={e => setRejectForm({ ...rejectForm, rejectionReason: e.target.value })}
                placeholder="Please provide a reason for rejecting this RMA..."
                rows={3}
                className={textareaClassName}
              />
              <div className="flex gap-2 mt-4">
                <Button variant="danger" onClick={handleReject}>
                  Confirm Rejection
                </Button>
                <Button variant="secondary" onClick={() => setShowRejectForm(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* Inspection Form */}
        {showInspectionForm && (
          <Card variant="glass" className="p-4">
            <h4 className="text-lg font-semibold text-white mb-4">Inspection Results</h4>
            <div className="space-y-4">
              <div>
                <label className={labelClassName}>Item Condition</label>
                <select
                  value={inspectionForm.condition}
                  onChange={e =>
                    setInspectionForm({
                      ...inspectionForm,
                      condition: e.target.value as RMACondition,
                    })
                  }
                  className={selectClassName}
                >
                  {CONDITION_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value} className="bg-gray-800">
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClassName}>Disposition</label>
                <select
                  value={inspectionForm.disposition}
                  onChange={e =>
                    setInspectionForm({
                      ...inspectionForm,
                      disposition: e.target.value as RMADisposition,
                    })
                  }
                  className={selectClassName}
                >
                  {DISPOSITION_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value} className="bg-gray-800">
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClassName}>Recommended Resolution</label>
                <select
                  value={inspectionForm.recommendedResolution}
                  onChange={e =>
                    setInspectionForm({
                      ...inspectionForm,
                      recommendedResolution: e.target.value as RMAResolutionType,
                    })
                  }
                  className={selectClassName}
                >
                  {RESOLUTION_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value} className="bg-gray-800">
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClassName}>Estimated Refund Amount</label>
                <input
                  type="number"
                  step="0.01"
                  value={inspectionForm.estimatedRefund}
                  onChange={e =>
                    setInspectionForm({ ...inspectionForm, estimatedRefund: e.target.value })
                  }
                  placeholder="0.00"
                  className={selectClassName}
                />
              </div>
              <div>
                <label className={labelClassName}>Inspection Findings</label>
                <textarea
                  value={inspectionForm.findings}
                  onChange={e => setInspectionForm({ ...inspectionForm, findings: e.target.value })}
                  placeholder="Describe the inspection findings..."
                  rows={3}
                  className={textareaClassName}
                />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <Button variant="primary" onClick={handleSubmitInspection}>
                Save Inspection
              </Button>
              <Button variant="secondary" onClick={() => setShowInspectionForm(false)}>
                Cancel
              </Button>
            </div>
          </Card>
        )}

        {/* Refund Form */}
        {showRefundForm && (
          <Card variant="glass" className="p-4">
            <h4 className="text-lg font-semibold text-white mb-4">Process Refund</h4>
            <div className="space-y-4">
              <div>
                <label className={labelClassName}>Refund Method</label>
                <select
                  value={refundForm.refundMethod}
                  onChange={e => setRefundForm({ ...refundForm, refundMethod: e.target.value })}
                  className={selectClassName}
                >
                  {REFUND_METHODS.map(opt => (
                    <option key={opt.value} value={opt.value} className="bg-gray-800">
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClassName}>Refund Amount</label>
                <input
                  type="number"
                  step="0.01"
                  value={refundForm.amount}
                  onChange={e => setRefundForm({ ...refundForm, amount: e.target.value })}
                  placeholder={rma.refundAmount?.toString() || '0.00'}
                  className={selectClassName}
                />
              </div>
              <div>
                <label className={labelClassName}>Notes</label>
                <textarea
                  value={refundForm.notes}
                  onChange={e => setRefundForm({ ...refundForm, notes: e.target.value })}
                  placeholder="Additional notes about the refund..."
                  rows={2}
                  className={textareaClassName}
                />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <Button variant="success" onClick={handleProcessRefund}>
                Process Refund
              </Button>
              <Button variant="secondary" onClick={() => setShowRefundForm(false)}>
                Cancel
              </Button>
            </div>
          </Card>
        )}

        {/* Replacement Form */}
        {showReplacementForm && (
          <Card variant="glass" className="p-4">
            <h4 className="text-lg font-semibold text-white mb-4">Send Replacement</h4>
            <div className="space-y-4">
              <div>
                <label className={labelClassName}>Shipping Method</label>
                <select
                  value={replacementForm.shippingMethod}
                  onChange={e =>
                    setReplacementForm({ ...replacementForm, shippingMethod: e.target.value })
                  }
                  className={selectClassName}
                >
                  {SHIPPING_METHODS.map(opt => (
                    <option key={opt.value} value={opt.value} className="bg-gray-800">
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClassName}>Shipping Address</label>
                <textarea
                  value={replacementForm.shippingAddress}
                  onChange={e =>
                    setReplacementForm({ ...replacementForm, shippingAddress: e.target.value })
                  }
                  placeholder="Enter the shipping address..."
                  rows={3}
                  className={textareaClassName}
                />
              </div>
              <div>
                <label className={labelClassName}>Tracking Number (Optional)</label>
                <input
                  type="text"
                  value={replacementForm.trackingNumber}
                  onChange={e =>
                    setReplacementForm({ ...replacementForm, trackingNumber: e.target.value })
                  }
                  placeholder="Enter tracking number if available..."
                  className={selectClassName}
                />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <Button variant="primary" onClick={handleSendReplacement}>
                Ship Replacement
              </Button>
              <Button variant="secondary" onClick={() => setShowReplacementForm(false)}>
                Cancel
              </Button>
            </div>
          </Card>
        )}

        {/* Tabs */}
        <div className="border-b border-gray-700">
          <nav className="flex gap-6">
            <button
              onClick={() => setActiveTab('details')}
              className={`pb-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'details'
                  ? 'border-primary-500 text-primary-400'
                  : 'border-transparent text-gray-400 hover:text-gray-300'
              }`}
            >
              Details
            </button>
            <button
              onClick={() => setActiveTab('activity')}
              className={`pb-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'activity'
                  ? 'border-primary-500 text-primary-400'
                  : 'border-transparent text-gray-400 hover:text-gray-300'
              }`}
            >
              Activity ({activity.length})
            </button>
            <button
              onClick={() => setActiveTab('communications')}
              className={`pb-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'communications'
                  ? 'border-primary-500 text-primary-400'
                  : 'border-transparent text-gray-400 hover:text-gray-300'
              }`}
            >
              Communications ({communications.length})
            </button>
          </nav>
        </div>

        {/* Details Tab */}
        {activeTab === 'details' && (
          <div className="space-y-6">
            {/* Order Info */}
            <Card variant="glass">
              <CardContent className="p-4 space-y-4">
                <h4 className="text-lg font-semibold text-white">Order Information</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-400">Order ID</p>
                    <p className="text-white font-medium">{rma.orderId}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Order Item ID</p>
                    <p className="text-white font-medium">{rma.orderItemId}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">SKU</p>
                    <p className="text-white font-medium">{rma.sku}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Product</p>
                    <p className="text-white font-medium">{rma.productName}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Quantity</p>
                    <p className="text-white font-medium">{rma.quantity}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Reason</p>
                    <p className="text-white font-medium">{rma.reason}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Customer Info */}
            <Card variant="glass">
              <CardContent className="p-4 space-y-4">
                <h4 className="text-lg font-semibold text-white">Customer Information</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-400">Name</p>
                    <p className="text-white font-medium">{rma.customerName}</p>
                  </div>
                  {rma.customerEmail && (
                    <div>
                      <p className="text-gray-400">Email</p>
                      <p className="text-white font-medium">{rma.customerEmail}</p>
                    </div>
                  )}
                  {rma.customerPhone && (
                    <div>
                      <p className="text-gray-400">Phone</p>
                      <p className="text-white font-medium">{rma.customerPhone}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Timeline */}
            <Card variant="glass">
              <CardContent className="p-4 space-y-4">
                <h4 className="text-lg font-semibold text-white">Timeline</h4>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Requested</span>
                    <span className="text-white">
                      {rma.requestedDate ? new Date(rma.requestedDate).toLocaleString() : 'N/A'}
                    </span>
                  </div>
                  {rma.approvedAt && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Approved</span>
                      <span className="text-white">
                        {new Date(rma.approvedAt).toLocaleString()}
                      </span>
                    </div>
                  )}
                  {rma.receivedAt && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Received</span>
                      <span className="text-white">
                        {new Date(rma.receivedAt).toLocaleString()}
                      </span>
                    </div>
                  )}
                  {rma.inspectedAt && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Inspected</span>
                      <span className="text-white">
                        {new Date(rma.inspectedAt).toLocaleString()}
                      </span>
                    </div>
                  )}
                  {rma.resolvedAt && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Resolved</span>
                      <span className="text-white">
                        {new Date(rma.resolvedAt).toLocaleString()}
                      </span>
                    </div>
                  )}
                  {rma.closedAt && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Closed</span>
                      <span className="text-white">{new Date(rma.closedAt).toLocaleString()}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Notes */}
            {(rma.customerNotes ||
              rma.internalNotes ||
              rma.resolutionNotes ||
              rma.rejectionReason) && (
              <Card variant="glass">
                <CardContent className="p-4 space-y-4">
                  <h4 className="text-lg font-semibold text-white">Notes</h4>
                  {rma.customerNotes && (
                    <div>
                      <p className="text-gray-400 text-sm">Customer Notes</p>
                      <p className="text-white">{rma.customerNotes}</p>
                    </div>
                  )}
                  {rma.internalNotes && (
                    <div>
                      <p className="text-gray-400 text-sm">Internal Notes</p>
                      <p className="text-white">{rma.internalNotes}</p>
                    </div>
                  )}
                  {rma.resolutionNotes && (
                    <div>
                      <p className="text-gray-400 text-sm">Resolution Notes</p>
                      <p className="text-white">{rma.resolutionNotes}</p>
                    </div>
                  )}
                  {rma.rejectionReason && (
                    <div>
                      <p className="text-gray-400 text-sm">Rejection Reason</p>
                      <p className="text-white">{rma.rejectionReason}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Activity Tab */}
        {activeTab === 'activity' && (
          <div className="space-y-3">
            {activity.length === 0 ? (
              <Card variant="glass">
                <CardContent className="p-8 text-center text-gray-400">
                  No activity recorded yet
                </CardContent>
              </Card>
            ) : (
              activity.map((item: any) => (
                <Card key={item.activityId} variant="glass">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="text-white font-medium">{item.description}</p>
                        <p className="text-gray-400 text-sm mt-1">
                          By {item.userName} • {new Date(item.createdAt).toLocaleString()}
                        </p>
                      </div>
                      <span className="px-2 py-1 bg-gray-700 text-gray-300 text-xs rounded">
                        {item.activityType}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}

        {/* Communications Tab */}
        {activeTab === 'communications' && (
          <div className="space-y-3">
            {communications.length === 0 ? (
              <Card variant="glass">
                <CardContent className="p-8 text-center text-gray-400">
                  No communications recorded yet
                </CardContent>
              </Card>
            ) : (
              communications.map((item: any) => (
                <Card key={item.communicationId} variant="glass">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        {item.subject && <p className="text-white font-medium">{item.subject}</p>}
                        <p className="text-gray-300 mt-1">{item.content}</p>
                        <p className="text-gray-400 text-sm mt-2">
                          {new Date(item.createdAt).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex flex-col gap-1 items-end">
                        <span
                          className={`px-2 py-1 text-xs rounded ${
                            item.direction === 'INBOUND'
                              ? 'bg-blue-500/20 text-blue-300'
                              : 'bg-green-500/20 text-green-300'
                          }`}
                        >
                          {item.direction}
                        </span>
                        <span className="px-2 py-1 bg-gray-700 text-gray-300 text-xs rounded">
                          {item.type}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-end pt-4 border-t border-gray-700">
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
}
