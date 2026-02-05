/**
 * Work Center View
 *
 * Visual representation of production lines/work centers and their current status
 * Shows capacity utilization and active orders per work center
 */

import { useMemo } from 'react';
import { Badge } from '@/components/shared';
import { ProductionOrder } from '@opsui/shared';
import { WrenchScrewdriverIcon, CubeIcon, ClockIcon } from '@heroicons/react/24/outline';

// ============================================================================
// TYPES
// ============================================================================

interface WorkCenter {
  id: string;
  name: string;
  capacity: number; // max concurrent orders
  activeOrders: number;
  status: 'idle' | 'active' | 'overloaded' | 'maintenance';
  utilization: number; // percentage
}

interface WorkCenterViewProps {
  orders: ProductionOrder[];
  workCenters?: WorkCenter[];
  onWorkCenterClick?: (workCenterId: string) => void;
}

// ============================================================================
// SUBCOMPONENTS
// ============================================================================

interface WorkCenterCardProps {
  workCenter: WorkCenter;
  orders: ProductionOrder[];
  onClick?: () => void;
}

function WorkCenterCard({ workCenter, orders, onClick }: WorkCenterCardProps) {
  const statusColors = {
    idle: 'border-gray-500/30 bg-gray-500/5',
    active: 'border-success-500/30 bg-success-500/5',
    overloaded: 'border-warning-500/30 bg-warning-500/5',
    maintenance: 'border-error-500/30 bg-error-500/5',
  };

  const statusIcons = {
    idle: { icon: ClockIcon, color: 'text-gray-400', label: 'Idle' },
    active: { icon: WrenchScrewdriverIcon, color: 'text-success-400', label: 'Active' },
    overloaded: { icon: WrenchScrewdriverIcon, color: 'text-warning-400', label: 'Overloaded' },
    maintenance: { icon: WrenchScrewdriverIcon, color: 'text-error-400', label: 'Maintenance' },
  };

  const StatusIcon = statusIcons[workCenter.status].icon;

  const activeOrders = orders.filter(
    o => o.assignedTo === workCenter.id && (o.status === 'IN_PROGRESS' || o.status === 'RELEASED')
  );

  return (
    <div
      onClick={onClick}
      className={`relative p-5 rounded-xl border-2 transition-all duration-200 cursor-pointer
                  hover:shadow-lg hover:scale-[1.02] ${statusColors[workCenter.status]}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${statusColors[workCenter.status]}`}>
            <CubeIcon className={`h-6 w-6 ${statusIcons[workCenter.status].color}`} />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">{workCenter.name}</h3>
            <div className="flex items-center gap-1.5 mt-0.5">
              <StatusIcon className={`h-3.5 w-3.5 ${statusIcons[workCenter.status].color}`} />
              <span className={`text-xs font-medium ${statusIcons[workCenter.status].color}`}>
                {statusIcons[workCenter.status].label}
              </span>
            </div>
          </div>
        </div>
        <Badge
          variant="default"
          className={`${workCenter.utilization > 90 ? 'bg-warning-500/20 text-warning-300' : 'bg-primary-500/20 text-primary-300'}`}
        >
          {workCenter.utilization}% Utilization
        </Badge>
      </div>

      {/* Capacity Bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-xs mb-2">
          <span className="text-gray-400">Capacity</span>
          <span className="text-white font-medium">
            {workCenter.activeOrders} / {workCenter.capacity} orders
          </span>
        </div>
        <div className="w-full bg-white/[0.08] rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-300 ${
              workCenter.utilization > 90
                ? 'bg-gradient-to-r from-warning-600 to-warning-400'
                : workCenter.utilization > 70
                  ? 'bg-gradient-to-r from-primary-600 to-primary-400'
                  : 'bg-gradient-to-r from-success-600 to-success-400'
            }`}
            style={{ width: `${Math.min(workCenter.utilization, 100)}%` }}
          />
        </div>
      </div>

      {/* Active Orders Preview */}
      {activeOrders.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-gray-400 font-medium">Active Orders</p>
          <div className="space-y-1.5 max-h-32 overflow-y-auto">
            {activeOrders.slice(0, 3).map(order => (
              <div
                key={order.orderId}
                className="flex items-center justify-between p-2 bg-gray-800/50 rounded-lg text-xs"
              >
                <span className="text-white font-medium">{order.orderNumber || order.orderId}</span>
                <div className="flex items-center gap-2">
                  <span className="text-gray-400">{order.productName}</span>
                  <span
                    className={`
                    px-1.5 py-0.5 rounded text-xs font-medium
                    ${order.status === 'IN_PROGRESS' ? 'bg-primary-500/20 text-primary-300' : 'bg-blue-500/20 text-blue-300'}
                  `}
                  >
                    {order.status === 'IN_PROGRESS' ? 'In Progress' : 'Released'}
                  </span>
                </div>
              </div>
            ))}
            {activeOrders.length > 3 && (
              <p className="text-xs text-gray-500 text-center">
                +{activeOrders.length - 3} more orders
              </p>
            )}
          </div>
        </div>
      )}

      {/* Overloaded Warning */}
      {workCenter.status === 'overloaded' && (
        <div className="mt-3 flex items-center gap-2 text-xs text-warning-400 bg-warning-500/10 px-3 py-2 rounded-lg border border-warning-500/20">
          <svg
            className="h-4 w-4 flex-shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <span>Exceeds capacity by {workCenter.activeOrders - workCenter.capacity} order(s)</span>
        </div>
      )}
    </div>
  );
}

interface WorkCenterSummaryProps {
  workCenters: WorkCenter[];
}

function WorkCenterSummary({ workCenters }: WorkCenterSummaryProps) {
  const totalCapacity = workCenters.reduce((sum, wc) => sum + wc.capacity, 0);
  const totalActive = workCenters.reduce((sum, wc) => sum + wc.activeOrders, 0);
  const avgUtilization = Math.round(
    workCenters.reduce((sum, wc) => sum + wc.utilization, 0) / workCenters.length
  );
  const activeCount = workCenters.filter(wc => wc.status === 'active').length;
  const overloadedCount = workCenters.filter(wc => wc.status === 'overloaded').length;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div className="p-4 bg-gray-800/50 rounded-xl border border-white/[0.08]">
        <p className="text-xs text-gray-400 mb-1">Total Capacity</p>
        <p className="text-2xl font-bold text-white">{totalCapacity}</p>
        <p className="text-xs text-gray-500 mt-1">orders across all centers</p>
      </div>
      <div className="p-4 bg-gray-800/50 rounded-xl border border-white/[0.08]">
        <p className="text-xs text-gray-400 mb-1">Active Orders</p>
        <p className="text-2xl font-bold text-primary-400">{totalActive}</p>
        <p className="text-xs text-gray-500 mt-1">currently in production</p>
      </div>
      <div className="p-4 bg-gray-800/50 rounded-xl border border-white/[0.08]">
        <p className="text-xs text-gray-400 mb-1">Avg Utilization</p>
        <p className="text-2xl font-bold text-success-400">{avgUtilization}%</p>
        <p className="text-xs text-gray-500 mt-1">across work centers</p>
      </div>
      <div className="p-4 bg-gray-800/50 rounded-xl border border-white/[0.08]">
        <p className="text-xs text-gray-400 mb-1">Active Centers</p>
        <div className="flex items-center gap-3">
          <p className="text-2xl font-bold text-white">
            {activeCount}/{workCenters.length}
          </p>
          {overloadedCount > 0 && (
            <Badge variant="warning" className="text-xs">
              {overloadedCount} overloaded
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function WorkCenterView({
  orders,
  workCenters: propWorkCenters,
  onWorkCenterClick,
}: WorkCenterViewProps) {
  // Generate work centers from orders if not provided
  const workCenters = useMemo(() => {
    if (propWorkCenters) return propWorkCenters;

    // Auto-generate work centers based on assignedTo field
    const centerMap = new Map<string, { activeOrders: number; capacity: number }>();

    orders.forEach(order => {
      const centerId = order.assignedTo || 'Unassigned';
      if (!centerMap.has(centerId)) {
        centerMap.set(centerId, { activeOrders: 0, capacity: 3 });
      }
      if (order.status === 'IN_PROGRESS' || order.status === 'RELEASED') {
        const data = centerMap.get(centerId)!;
        data.activeOrders++;
      }
    });

    return Array.from(centerMap.entries()).map(([id, data]) => {
      const utilization = Math.round((data.activeOrders / data.capacity) * 100);
      let status: WorkCenter['status'] = 'idle';
      if (data.activeOrders === 0) status = 'idle';
      else if (data.activeOrders > data.capacity) status = 'overloaded';
      else status = 'active';

      return {
        id,
        name: id === 'Unassigned' ? 'Unassigned Orders' : id,
        capacity: data.capacity,
        activeOrders: data.activeOrders,
        status,
        utilization,
      };
    });
  }, [orders, propWorkCenters]);

  if (workCenters.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <CubeIcon className="h-16 w-16 text-gray-600 mb-4" />
        <p className="text-gray-400">No work centers configured</p>
        <p className="text-gray-500 text-sm mt-1">
          Assign production orders to work centers to see capacity
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-white">Work Center Overview</h2>
        <p className="text-gray-400 text-sm mt-1">
          Monitor capacity utilization across production lines
        </p>
      </div>

      {/* Summary Stats */}
      <WorkCenterSummary workCenters={workCenters} />

      {/* Work Centers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {workCenters.map(workCenter => (
          <WorkCenterCard
            key={workCenter.id}
            workCenter={workCenter}
            orders={orders}
            onClick={() => onWorkCenterClick?.(workCenter.id)}
          />
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 text-xs text-gray-400 py-4 border-t border-white/[0.08]">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-success-500" />
          <span>Active</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-warning-500" />
          <span>Overloaded</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-gray-500" />
          <span>Idle</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-error-500" />
          <span>Maintenance</span>
        </div>
      </div>
    </div>
  );
}
