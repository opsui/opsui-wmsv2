/**
 * Production Order Details Modal
 *
 * Comprehensive view of production order details including components, journal, and actions
 */

import { Modal, Button, useToast } from '@/components/shared';
import { useProductionOrder, useProductionJournal, useUpdateProductionOrder } from '@/services/api';
import { MaterialManagementModal } from './MaterialManagementModal';
import { RecordOutputModal } from './RecordOutputModal';
import { useState } from 'react';
import {
  CheckCircleIcon,
  XCircleIcon,
  PauseCircleIcon,
  UserIcon,
  WrenchScrewdriverIcon,
  PlusIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import { ProductionOrderStatus } from '@opsui/shared';

// ============================================================================
// TYPES
// ============================================================================

interface ProductionOrderDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string;
  onActionSuccess?: () => void;
}

// ============================================================================
// SUBCOMPONENTS
// ============================================================================

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    DRAFT: 'bg-gray-500/20 text-gray-300 border border-gray-500/30',
    PLANNED: 'bg-blue-500/20 text-blue-300 border border-blue-500/30',
    RELEASED: 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30',
    IN_PROGRESS: 'bg-primary-500/20 text-primary-300 border border-primary-500/30',
    ON_HOLD: 'bg-warning-500/20 text-warning-300 border border-warning-500/30',
    COMPLETED: 'bg-success-500/20 text-success-300 border border-success-500/30',
    CANCELLED: 'bg-error-500/20 text-error-300 border border-error-500/30',
  };

  return (
    <span
      className={`px-3 py-1 rounded-full text-xs font-semibold ${styles[status] || styles.DRAFT}`}
    >
      {status.replace('_', ' ')}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  const colors: Record<string, string> = {
    LOW: 'bg-gray-500',
    MEDIUM: 'bg-blue-500',
    HIGH: 'bg-orange-500',
    URGENT: 'bg-red-500 animate-pulse',
  };

  return (
    <div className="flex items-center gap-2">
      <div className={`w-2 h-2 rounded-full ${colors[priority] || colors.MEDIUM}`} />
      <span className="text-xs text-gray-300">{priority}</span>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function ProductionOrderDetailsModal({
  isOpen,
  onClose,
  orderId,
  onActionSuccess,
}: ProductionOrderDetailsModalProps) {
  const { data: order, isLoading } = useProductionOrder(orderId);
  const { data: journalData } = useProductionJournal(orderId);
  const updateOrderMutation = useUpdateProductionOrder();
  const { showToast } = useToast();

  const [showMaterialModal, setShowMaterialModal] = useState(false);
  const [showOutputModal, setShowOutputModal] = useState(false);

  const handleStatusChange = async (newStatus: ProductionOrderStatus) => {
    try {
      await updateOrderMutation.mutateAsync({
        orderId,
        data: { status: newStatus },
      });
      showToast(`Order status changed to ${newStatus.replace('_', ' ')}`, 'success');
      onActionSuccess?.();
    } catch (error: any) {
      showToast(error?.response?.data?.error || 'Failed to update status', 'error');
    }
  };

  if (!isOpen) return null;

  if (isLoading) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="Production Order Details" size="xl">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
        </div>
      </Modal>
    );
  }

  if (!order) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="Production Order Details" size="xl">
        <p className="text-gray-400">Order not found</p>
      </Modal>
    );
  }

  const journal = journalData?.journal || [];

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={`Order ${order.orderNumber || order.orderId}`}
        size="xl"
        footer={
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        }
      >
        <div className="space-y-6">
          {/* Order Header */}
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-xl font-bold text-white">{order.productName}</h2>
                <StatusBadge status={order.status} />
                <PriorityBadge priority={order.priority} />
              </div>
              <p className="text-gray-400">SKU: {order.productId}</p>
              <p className="text-sm text-gray-500">Order ID: {order.orderId}</p>
            </div>
          </div>

          {/* Quantity & Progress */}
          <div className="grid grid-cols-4 gap-4">
            <div className="p-4 bg-white/5 border border-gray-700 rounded-lg text-center">
              <p className="text-gray-400 text-xs mb-1">To Produce</p>
              <p className="text-2xl font-bold text-white">{order.quantityToProduce}</p>
            </div>
            <div className="p-4 bg-white/5 border border-gray-700 rounded-lg text-center">
              <p className="text-gray-400 text-xs mb-1">Completed</p>
              <p className="text-2xl font-bold text-success-400">{order.quantityCompleted}</p>
            </div>
            <div className="p-4 bg-white/5 border border-gray-700 rounded-lg text-center">
              <p className="text-gray-400 text-xs mb-1">Rejected</p>
              <p className="text-2xl font-bold text-error-400">{order.quantityRejected}</p>
            </div>
            <div className="p-4 bg-white/5 border border-gray-700 rounded-lg text-center">
              <p className="text-gray-400 text-xs mb-1">Progress</p>
              <p className="text-2xl font-bold text-primary-400">
                {Math.round((order.quantityCompleted / order.quantityToProduce) * 100)}%
              </p>
            </div>
          </div>

          {/* Progress Bar */}
          <div>
            <div className="w-full bg-gray-700 rounded-full h-3">
              <div
                className="bg-success-500 h-3 rounded-full transition-all"
                style={{
                  width: `${Math.min(100, (order.quantityCompleted / order.quantityToProduce) * 100)}%`,
                }}
              />
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-white/5 border border-gray-700 rounded-lg">
              <h3 className="text-sm font-semibold text-white mb-2">Scheduled Dates</h3>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Start:</span>
                  <span className="text-white">
                    {new Date(order.scheduledStartDate).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">End:</span>
                  <span className="text-white">
                    {new Date(order.scheduledEndDate).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
            <div className="p-4 bg-white/5 border border-gray-700 rounded-lg">
              <h3 className="text-sm font-semibold text-white mb-2">Actual Dates</h3>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Start:</span>
                  <span className={order.actualStartDate ? 'text-success-400' : 'text-gray-500'}>
                    {order.actualStartDate
                      ? new Date(order.actualStartDate).toLocaleString()
                      : 'Not started'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">End:</span>
                  <span className={order.actualEndDate ? 'text-success-400' : 'text-gray-500'}>
                    {order.actualEndDate
                      ? new Date(order.actualEndDate).toLocaleString()
                      : 'Not completed'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Assignment */}
          {(order.assignedTo || order.workCenter) && (
            <div className="p-4 bg-white/5 border border-gray-700 rounded-lg">
              <h3 className="text-sm font-semibold text-white mb-2">Assignment</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                {order.assignedTo && (
                  <div className="flex items-center gap-2">
                    <UserIcon className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-400">Assigned to:</span>
                    <span className="text-white">{order.assignedTo}</span>
                  </div>
                )}
                {order.workCenter && (
                  <div className="flex items-center gap-2">
                    <WrenchScrewdriverIcon className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-400">Work Center:</span>
                    <span className="text-white">{order.workCenter}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Components/Materials */}
          <div className="p-4 bg-white/5 border border-gray-700 rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-white">Components / Materials</h3>
              {(order.status === 'RELEASED' ||
                order.status === 'IN_PROGRESS' ||
                order.status === 'ON_HOLD' ||
                order.status === 'COMPLETED') && (
                <Button variant="primary" size="sm" onClick={() => setShowMaterialModal(true)}>
                  Manage Materials
                </Button>
              )}
            </div>
            <div className="space-y-2">
              {order.components?.length > 0 ? (
                order.components.map((comp: any) => {
                  const issueStatus = comp.quantityIssued >= comp.quantityRequired;
                  const returnStatus = comp.quantityReturned > 0;

                  return (
                    <div
                      key={comp.componentId}
                      className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg border border-gray-700"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-white">{comp.sku}</span>
                          {issueStatus && <CheckCircleIcon className="h-4 w-4 text-success-400" />}
                          {returnStatus && <ArrowPathIcon className="h-4 w-4 text-warning-400" />}
                        </div>
                        {comp.description && (
                          <p className="text-xs text-gray-400">{comp.description}</p>
                        )}
                      </div>
                      <div className="text-right text-sm">
                        <div className="text-gray-400">
                          Required: <span className="text-white">{comp.quantityRequired}</span>
                        </div>
                        <div className="text-gray-400">
                          Issued:{' '}
                          <span className={issueStatus ? 'text-success-400' : 'text-white'}>
                            {comp.quantityIssued}
                          </span>
                        </div>
                        {returnStatus && (
                          <div className="text-gray-400">
                            Returned:{' '}
                            <span className="text-warning-400">{comp.quantityReturned}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-sm text-gray-500">No components found</p>
              )}
            </div>
          </div>

          {/* Notes */}
          {order.notes && (
            <div className="p-4 bg-white/5 border border-gray-700 rounded-lg">
              <h3 className="text-sm font-semibold text-white mb-2">Notes</h3>
              <p className="text-sm text-gray-300">{order.notes}</p>
            </div>
          )}

          {/* Production Journal */}
          <div className="p-4 bg-white/5 border border-gray-700 rounded-lg">
            <h3 className="text-sm font-semibold text-white mb-3">Production Journal</h3>
            {journal.length > 0 ? (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {journal.map((entry: any) => (
                  <div
                    key={entry.journalId}
                    className="flex items-start gap-3 p-3 bg-gray-800/50 rounded-lg text-sm"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-white">{entry.entryType}</span>
                        <span className="text-gray-500">
                          {new Date(entry.enteredAt).toLocaleString()}
                        </span>
                      </div>
                      {entry.notes && <p className="text-gray-300">{entry.notes}</p>}
                      {entry.quantity && (
                        <p className="text-gray-400">Quantity: {entry.quantity}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No journal entries yet</p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2 pt-4 border-t border-gray-700">
            {order.status === 'PLANNED' || order.status === 'DRAFT' ? (
              <>
                <Button
                  variant="success"
                  className="flex items-center gap-1"
                  onClick={() => handleStatusChange('RELEASED' as ProductionOrderStatus)}
                >
                  <PlusIcon className="h-4 w-4" />
                  Release Order
                </Button>
              </>
            ) : order.status === 'RELEASED' ? (
              <>
                <Button
                  variant="primary"
                  className="flex items-center gap-1"
                  onClick={() => handleStatusChange('IN_PROGRESS' as ProductionOrderStatus)}
                >
                  <PlusIcon className="h-4 w-4" />
                  Start Production
                </Button>
                <Button
                  variant="warning"
                  className="flex items-center gap-1"
                  onClick={() => handleStatusChange('ON_HOLD' as ProductionOrderStatus)}
                >
                  <PauseCircleIcon className="h-4 w-4" />
                  Hold Order
                </Button>
              </>
            ) : order.status === 'IN_PROGRESS' ? (
              <>
                <Button
                  variant="primary"
                  className="flex items-center gap-1"
                  onClick={() => setShowOutputModal(true)}
                >
                  <PlusIcon className="h-4 w-4" />
                  Record Output
                </Button>
                <Button
                  variant="warning"
                  className="flex items-center gap-1"
                  onClick={() => handleStatusChange('ON_HOLD' as ProductionOrderStatus)}
                >
                  <PauseCircleIcon className="h-4 w-4" />
                  Hold Order
                </Button>
                <Button
                  variant="success"
                  className="flex items-center gap-1"
                  onClick={() => handleStatusChange('COMPLETED' as ProductionOrderStatus)}
                >
                  <CheckCircleIcon className="h-4 w-4" />
                  Complete Order
                </Button>
              </>
            ) : order.status === 'ON_HOLD' ? (
              <>
                <Button
                  variant="primary"
                  className="flex items-center gap-1"
                  onClick={() => handleStatusChange('RELEASED' as ProductionOrderStatus)}
                >
                  <ArrowPathIcon className="h-4 w-4" />
                  Resume Order
                </Button>
                <Button
                  variant="error"
                  className="flex items-center gap-1"
                  onClick={() => handleStatusChange('CANCELLED' as ProductionOrderStatus)}
                >
                  <XCircleIcon className="h-4 w-4" />
                  Cancel Order
                </Button>
              </>
            ) : null}
          </div>
        </div>
      </Modal>

      {/* Material Management Modal */}
      <MaterialManagementModal
        isOpen={showMaterialModal}
        onClose={() => setShowMaterialModal(false)}
        onSuccess={() => {
          setShowMaterialModal(false);
          onActionSuccess?.();
        }}
        orderId={orderId}
        components={order.components || []}
        orderStatus={order.status}
      />

      {/* Record Output Modal */}
      {showOutputModal && (
        <RecordOutputModal
          isOpen={showOutputModal}
          onClose={() => setShowOutputModal(false)}
          onSuccess={() => {
            setShowOutputModal(false);
            onActionSuccess?.();
          }}
          orderId={orderId}
          orderDetails={{
            productId: order.productId,
            productName: order.productName,
            quantityToProduce: order.quantityToProduce,
            quantityCompleted: order.quantityCompleted,
            quantityRejected: order.quantityRejected,
            unitOfMeasure: order.unitOfMeasure,
          }}
        />
      )}
    </>
  );
}
