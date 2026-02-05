/**
 * Production Kanban Board
 *
 * Drag-and-drop board for managing production orders across statuses
 * Industry-standard visual workflow management
 */

import { useState, useMemo } from 'react';
import { Button, Badge, useToast } from '@/components/shared';
import { ProductionOrder, ProductionOrderStatus } from '@opsui/shared';
import {
  ClipboardDocumentListIcon,
  PlusIcon,
  ClockIcon,
  WrenchScrewdriverIcon,
  PauseCircleIcon,
  CheckCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';

// ============================================================================
// TYPES
// ============================================================================

interface KanbanColumn {
  id: ProductionOrderStatus;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgColor: string;
  borderColor: string;
}

interface ProductionKanbanBoardProps {
  orders: ProductionOrder[];
  onOrderClick: (orderId: string) => void;
  onUpdateStatus?: (orderId: string, newStatus: ProductionOrderStatus) => Promise<void>;
  onNewOrder?: () => void;
}

// ============================================================================
// COLUMN CONFIGURATION
// ============================================================================

const COLUMNS: KanbanColumn[] = [
  {
    id: 'DRAFT' as ProductionOrderStatus,
    title: 'Draft',
    icon: ClipboardDocumentListIcon,
    color: 'text-gray-400',
    bgColor: 'bg-gray-500/10',
    borderColor: 'border-gray-500/30',
  },
  {
    id: 'PLANNED' as ProductionOrderStatus,
    title: 'Planned',
    icon: ClockIcon,
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/30',
  },
  {
    id: 'RELEASED' as ProductionOrderStatus,
    title: 'Released',
    icon: PlusIcon,
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-500/10',
    borderColor: 'border-cyan-500/30',
  },
  {
    id: 'IN_PROGRESS' as ProductionOrderStatus,
    title: 'In Production',
    icon: WrenchScrewdriverIcon,
    color: 'text-primary-400',
    bgColor: 'bg-primary-500/10',
    borderColor: 'border-primary-500/30',
  },
  {
    id: 'ON_HOLD' as ProductionOrderStatus,
    title: 'On Hold',
    icon: PauseCircleIcon,
    color: 'text-warning-400',
    bgColor: 'bg-warning-500/10',
    borderColor: 'border-warning-500/30',
  },
  {
    id: 'COMPLETED' as ProductionOrderStatus,
    title: 'Completed',
    icon: CheckCircleIcon,
    color: 'text-success-400',
    bgColor: 'bg-success-500/10',
    borderColor: 'border-success-500/30',
  },
  {
    id: 'CANCELLED' as ProductionOrderStatus,
    title: 'Cancelled',
    icon: XCircleIcon,
    color: 'text-error-400',
    bgColor: 'bg-error-500/10',
    borderColor: 'border-error-500/30',
  },
];

// ============================================================================
// SUBCOMPONENTS
// ============================================================================

function PriorityBadge({ priority }: { priority: string }) {
  const colors: Record<string, string> = {
    LOW: 'bg-gray-500/20 text-gray-300 border border-gray-500/30',
    MEDIUM: 'bg-blue-500/20 text-blue-300 border border-blue-500/30',
    HIGH: 'bg-orange-500/20 text-orange-300 border border-orange-500/30',
    URGENT: 'bg-red-500/20 text-red-300 border border-red-500/30 animate-pulse',
  };

  return (
    <Badge variant="default" className={`text-xs px-2 py-0.5 ${colors[priority] || colors.MEDIUM}`}>
      {priority}
    </Badge>
  );
}

function MaterialAlert({ hasShortage }: { hasShortage: boolean }) {
  if (!hasShortage) return null;

  return (
    <div className="mt-2 flex items-center gap-1.5 text-xs text-warning-400 bg-warning-500/10 px-2 py-1 rounded-md">
      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
        />
      </svg>
      <span>Material Shortage</span>
    </div>
  );
}

interface KanbanCardProps {
  order: ProductionOrder;
  onClick: () => void;
  showMaterialAlert?: boolean;
}

function KanbanCard({ order, onClick, showMaterialAlert }: KanbanCardProps) {
  const progress =
    order.quantityToProduce > 0
      ? Math.round((order.quantityCompleted / order.quantityToProduce) * 100)
      : 0;

  const isOverdue =
    order.scheduledEndDate &&
    new Date(order.scheduledEndDate) < new Date() &&
    order.status !== 'COMPLETED';

  return (
    <div
      onClick={onClick}
      className="group bg-gray-800/80 backdrop-blur-sm rounded-lg p-4 border border-white/[0.08]
                 hover:border-primary-500/50 hover:shadow-lg hover:shadow-primary-500/10
                 cursor-pointer transition-all duration-200 hover:-translate-y-0.5"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="text-sm font-semibold text-white truncate group-hover:text-primary-300 transition-colors">
              {order.orderNumber || order.orderId}
            </h4>
            {isOverdue && (
              <Badge variant="error" className="text-xs px-1.5 py-0">
                Overdue
              </Badge>
            )}
          </div>
          <p className="text-xs text-gray-400 truncate">{order.productName}</p>
        </div>
        <PriorityBadge priority={order.priority} />
      </div>

      {/* Progress */}
      {order.status === 'IN_PROGRESS' || order.status === 'RELEASED' ? (
        <div className="mb-3">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-gray-400">Progress</span>
            <span className="text-white font-medium">{progress}%</span>
          </div>
          <div className="w-full bg-white/[0.08] rounded-full h-1.5">
            <div
              className="bg-gradient-to-r from-primary-500 to-primary-400 h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      ) : null}

      {/* Details */}
      <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
        <span>
          Qty: {order.quantityCompleted}/{order.quantityToProduce}
        </span>
        {order.scheduledEndDate && (
          <span className={isOverdue ? 'text-error-400' : ''}>
            Due: {new Date(order.scheduledEndDate).toLocaleDateString()}
          </span>
        )}
      </div>

      {/* Material Alert - only show if actual shortage detected */}
      {/* Material availability check requires inventory integration */}
      {showMaterialAlert && false && <MaterialAlert hasShortage={true} />}
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function ProductionKanbanBoard({
  orders,
  onOrderClick,
  onUpdateStatus,
  onNewOrder,
}: ProductionKanbanBoardProps) {
  const { showToast } = useToast();
  const [draggedOrder, setDraggedOrder] = useState<ProductionOrder | null>(null);

  // Group orders by status
  const ordersByColumn = useMemo(() => {
    const grouped: Record<ProductionOrderStatus, ProductionOrder[]> = {
      DRAFT: [],
      PLANNED: [],
      RELEASED: [],
      IN_PROGRESS: [],
      ON_HOLD: [],
      COMPLETED: [],
      CANCELLED: [],
    };

    orders.forEach(order => {
      if (grouped[order.status]) {
        grouped[order.status].push(order);
      }
    });

    return grouped;
  }, [orders]);

  const handleDragStart = (order: ProductionOrder) => {
    setDraggedOrder(order);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (columnId: ProductionOrderStatus) => {
    if (!draggedOrder || draggedOrder.status === columnId) {
      setDraggedOrder(null);
      return;
    }

    if (onUpdateStatus) {
      try {
        await onUpdateStatus(draggedOrder.orderId, columnId);
        showToast(`Order moved to ${columnId.replace('_', ' ')}`, 'success');
      } catch (error: any) {
        showToast(error?.response?.data?.error || 'Failed to update status', 'error');
      }
    }

    setDraggedOrder(null);
  };

  const getTotalCount = () => orders.length;

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white">Production Board</h2>
          <p className="text-gray-400 text-sm mt-1">Drag and drop orders to update status</p>
        </div>
        {onNewOrder && (
          <Button
            variant="primary"
            size="lg"
            className="flex items-center gap-2"
            onClick={onNewOrder}
          >
            <PlusIcon className="h-5 w-5" />
            New Order
          </Button>
        )}
      </div>

      {/* Kanban Board */}
      <div className="flex-1 overflow-x-auto">
        <div className="flex gap-4 min-w-max h-full">
          {COLUMNS.filter(col => {
            // Hide CANCELLED column by default, show others
            return col.id !== 'CANCELLED';
          }).map(column => {
            const columnOrders = ordersByColumn[column.id] || [];
            const columnCount = columnOrders.length;

            return (
              <div
                key={column.id}
                className={`flex-shrink-0 w-80 flex flex-col rounded-xl border-2 transition-all duration-200 ${
                  draggedOrder && column.id !== draggedOrder.status
                    ? `${column.borderColor} bg-gray-800/30`
                    : `${column.borderColor} ${column.bgColor}`
                }`}
                onDragOver={handleDragOver}
                onDrop={() => handleDrop(column.id)}
              >
                {/* Column Header */}
                <div
                  className={`p-4 border-b ${column.borderColor} sticky top-0 ${column.bgColor} rounded-t-xl`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <column.icon className={`h-5 w-5 ${column.color}`} />
                      <h3 className="font-semibold text-white">{column.title}</h3>
                    </div>
                    <Badge
                      variant="default"
                      className={`${column.bgColor} ${column.color} border ${column.borderColor}`}
                    >
                      {columnCount}
                    </Badge>
                  </div>
                </div>

                {/* Column Content */}
                <div className="flex-1 p-3 space-y-3 overflow-y-auto max-h-[calc(100vh-300px)]">
                  {columnOrders.length === 0 ? (
                    <div className="flex items-center justify-center h-32 text-gray-500 text-sm">
                      No orders
                    </div>
                  ) : (
                    columnOrders.map(order => (
                      <div
                        key={order.orderId}
                        draggable={!!onUpdateStatus}
                        onDragStart={() => handleDragStart(order)}
                        className={onUpdateStatus ? 'cursor-grab active:cursor-grabbing' : ''}
                      >
                        <KanbanCard
                          order={order}
                          onClick={() => onOrderClick(order.orderId)}
                          showMaterialAlert
                        />
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Summary Footer */}
      <div className="mt-4 flex items-center justify-between text-sm text-gray-400 px-2">
        <span>Total Orders: {getTotalCount()}</span>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-warning-500" />
            <span>Material Shortage</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-error-500" />
            <span>Overdue</span>
          </div>
        </div>
      </div>
    </div>
  );
}
