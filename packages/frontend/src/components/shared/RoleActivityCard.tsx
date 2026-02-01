/**
 * Unified Role Activity Card Component
 *
 * Displays activity for any role with a dropdown selector
 * Dynamic component that adapts to all available roles in the system
 */

import { useState, useMemo, useRef, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, Button } from '@/components/shared';
import {
  UsersIcon,
  CubeIcon,
  ClipboardDocumentListIcon,
  DocumentTextIcon,
  XMarkIcon,
  ShoppingBagIcon,
  TruckIcon,
  CogIcon,
  TagIcon,
  WrenchIcon,
  ArrowPathIcon,
  ChevronDownIcon,
  EyeIcon,
} from '@heroicons/react/24/outline';
import { UserRole } from '@opsui/shared';

// ============================================================================
// TYPES
// ============================================================================

interface RoleActivityCardProps {
  role: UserRole | 'all';
  onRoleChange: (role: UserRole | 'all') => void;
  activities: Record<UserRole, any[]>;
  isLoading?: boolean;
  onViewOrders?: (roleId: string, roleName: string, roleType: UserRole) => void;
  orders?: any[];
  transactions?: any[];
  ordersLoading?: boolean;
  transactionsLoading?: boolean;
}

// Role configuration - maps roles to their display names, icons, and styling
const ROLE_CONFIG: Record<
  UserRole,
  { label: string; icon: any; color: string; idField: string; nameField: string }
> = {
  [UserRole.PICKER]: {
    label: 'Pickers',
    icon: UsersIcon,
    color: 'primary',
    idField: 'pickerId',
    nameField: 'pickerName',
  },
  [UserRole.PACKER]: {
    label: 'Packers',
    icon: CubeIcon,
    color: 'success',
    idField: 'packerId',
    nameField: 'packerName',
  },
  [UserRole.STOCK_CONTROLLER]: {
    label: 'Stock Controllers',
    icon: ClipboardDocumentListIcon,
    color: 'info',
    idField: 'controllerId',
    nameField: 'controllerName',
  },
  [UserRole.INWARDS]: {
    label: 'Inwards/Receiving',
    icon: TruckIcon,
    color: 'warning',
    idField: 'inwardsId',
    nameField: 'inwardsName',
  },
  [UserRole.PRODUCTION]: {
    label: 'Production',
    icon: CogIcon,
    color: 'secondary',
    idField: 'productionId',
    nameField: 'productionName',
  },
  [UserRole.SALES]: {
    label: 'Sales',
    icon: TagIcon,
    color: 'accent',
    idField: 'salesId',
    nameField: 'salesName',
  },
  [UserRole.MAINTENANCE]: {
    label: 'Maintenance',
    icon: WrenchIcon,
    color: 'danger',
    idField: 'maintenanceId',
    nameField: 'maintenanceName',
  },
  [UserRole.RMA]: {
    label: 'RMA/Returns',
    icon: ArrowPathIcon,
    color: 'purple',
    idField: 'rmaId',
    nameField: 'rmaName',
  },
  [UserRole.SUPERVISOR]: {
    label: 'Supervisors',
    icon: UsersIcon,
    color: 'primary',
    idField: 'supervisorId',
    nameField: 'supervisorName',
  },
  [UserRole.ADMIN]: {
    label: 'Admins',
    icon: CogIcon,
    color: 'gray',
    idField: 'adminId',
    nameField: 'adminName',
  },
};

// Get all available role keys
const ALL_ROLES = Object.values(UserRole).filter(
  (role): role is UserRole => role !== UserRole.SUPERVISOR && role !== UserRole.ADMIN
) as UserRole[];

// ============================================================================
// MAIN COMPONENT
// ============================================================================

// Custom role selector dropdown component matching navbar theme
interface RoleSelectorDropdownProps {
  value: UserRole | 'all';
  onChange: (role: UserRole | 'all') => void;
}

function RoleSelectorDropdown({ value, onChange }: RoleSelectorDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Build options with "All Roles" + individual roles
  const options = [
    { value: 'all' as const, label: 'All Roles', icon: UsersIcon },
    ...ALL_ROLES.map(userRole => {
      const config = ROLE_CONFIG[userRole];
      return {
        value: userRole,
        label: config.label,
        icon: config.icon,
      };
    }),
  ];

  const selectedOption = options.find(opt => opt.value === value);

  return (
    <div className="relative z-[9999]" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 ${
          isOpen
            ? 'dark:text-white text-black dark:bg-white/[0.08] bg-gray-100 dark:border-white/[0.12] border-gray-300 shadow-lg dark:shadow-blue-500/10 shadow-gray-200'
            : 'dark:text-gray-300 text-gray-800 dark:hover:text-white hover:text-black dark:hover:bg-white/[0.05] hover:bg-gray-100 dark:border-transparent border-transparent dark:hover:border-white/[0.08] hover:border-gray-300'
        }`}
      >
        {selectedOption && <selectedOption.icon className="h-4 w-4" />}
        <span>{selectedOption?.label}</span>
        <ChevronDownIcon
          className={`h-3 w-3 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-56 dark:bg-gray-900 bg-white rounded-xl dark:border-gray-700 border-gray-200 shadow-2xl animate-fade-in">
          <div className="py-2">
            {options.map(option => {
              const OptionIcon = option.icon;
              const isActive = option.value === value;
              return (
                <button
                  key={option.value}
                  onClick={() => {
                    onChange(option.value);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-all duration-200 group ${
                    isActive
                      ? 'dark:text-white text-black dark:bg-blue-600 bg-blue-50'
                      : 'dark:text-gray-200 text-gray-800 dark:hover:text-white hover:text-black dark:hover:bg-gray-800 hover:bg-gray-100'
                  }`}
                >
                  <OptionIcon
                    className={`h-4 w-4 flex-shrink-0 transition-colors duration-200 ${
                      isActive
                        ? 'dark:text-white text-black'
                        : 'dark:text-gray-400 text-gray-600 dark:group-hover:text-gray-300 group-hover:text-gray-700'
                    }`}
                  />
                  {option.label}
                  {isActive && (
                    <span className="ml-auto w-1.5 h-1.5 rounded-full dark:bg-white bg-gray-900 dark:shadow-[0_0_8px_rgba(255,255,255,0.6)] shadow-[0_0_8px_rgba(0,0,0,0.3)] animate-pulse"></span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export function RoleActivityCard({
  role,
  onRoleChange,
  activities,
  isLoading,
  onViewOrders,
  orders,
  transactions,
  ordersLoading,
  transactionsLoading,
}: RoleActivityCardProps) {
  const [selectedMember, setSelectedMember] = useState<{
    id: string;
    name: string;
    roleType: UserRole;
  } | null>(null);

  // Format current view for better readability
  const formatView = (
    currentView: string | undefined,
    userRole: UserRole,
    currentOrderId?: string | null
  ) => {
    if (!currentView) return { display: 'None', label: 'badge-info' };

    // Common view patterns
    if (currentView.includes('/profile') || currentView.includes('Profile')) {
      return { display: 'Profile', label: 'badge-info' };
    }

    // Role-specific patterns
    switch (userRole) {
      case UserRole.PICKER:
        if (
          currentView === 'Order Queue' ||
          currentView === '/orders' ||
          currentView === '/orders/' ||
          currentView === 'Orders Page'
        ) {
          return { display: 'Order Queue', label: 'badge-primary' };
        }
        // For pickers with an active order, show the order ID
        if (
          currentView.includes('Picking Order') ||
          currentView.includes('/pick/') ||
          currentView.includes('/orders/') ||
          currentOrderId
        ) {
          if (currentOrderId) {
            return {
              display: `Picking ${currentOrderId}`,
              label: 'badge-success',
            };
          }
          // Match both SO#### format and ORD-YYYYMMDD-#### format
          const soMatch = currentView.match(/SO\d{4}/);
          const ordMatch = currentView.match(/ORD-\d{8}-\d{4}/);
          const orderMatch = soMatch || ordMatch;
          return {
            display: orderMatch ? `Picking ${orderMatch[0]}` : 'Picking',
            label: 'badge-success',
          };
        }
        break;

      case UserRole.PACKER:
        if (
          currentView === 'Packing Queue' ||
          currentView === '/packing' ||
          currentView === '/packing/' ||
          currentView === 'Packing Page'
        ) {
          return { display: 'Packing Queue', label: 'badge-primary' };
        }
        if (
          currentView.includes('Packing Order') ||
          currentView.includes('/pack/') ||
          currentView.includes('/packing/') ||
          currentView.includes('Packing ORD-') ||
          currentView.includes('Packing SO')
        ) {
          // Match both SO#### format and ORD-YYYYMMDD-#### format
          const soMatch = currentView.match(/SO\d{4}/);
          const ordMatch = currentView.match(/ORD-\d{8}-\d{4}/);
          const orderMatch = soMatch || ordMatch;
          return {
            display: orderMatch ? `Packing ${orderMatch[0]}` : 'Packing',
            label: 'badge-success',
          };
        }
        break;

      case UserRole.STOCK_CONTROLLER:
        if (
          currentView === 'Stock Control Dashboard' ||
          currentView === '/stock-control' ||
          currentView === '/stock-control/'
        ) {
          return { display: 'Stock Control', label: 'badge-primary' };
        }
        if (
          currentView === 'Stock Control - Inventory' ||
          currentView.includes('Inventory Management') ||
          currentView === '/inventory'
        ) {
          return { display: 'Inventory Management', label: 'badge-success' };
        }
        if (
          currentView === 'Stock Control - Transactions' ||
          currentView.includes('Transactions') ||
          currentView.includes('/transactions')
        ) {
          return { display: 'Transactions', label: 'badge-info' };
        }
        if (
          currentView === 'Stock Control - Quick Actions' ||
          currentView.includes('Quick Actions')
        ) {
          return { display: 'Quick Actions', label: 'badge-warning' };
        }
        break;

      case UserRole.INWARDS:
        if (
          currentView === 'Inwards Dashboard' ||
          currentView === '/inwards' ||
          currentView === '/inwards/'
        ) {
          return { display: 'Inwards Dashboard', label: 'badge-primary' };
        }
        if (
          currentView.includes('Receiving') ||
          currentView.includes('/receipts/') ||
          currentView.includes('/receipts')
        ) {
          return { display: 'Receiving', label: 'badge-success' };
        }
        if (currentView.includes('Putaway') || currentView.includes('/putaway')) {
          return { display: 'Putaway', label: 'badge-warning' };
        }
        break;

      case UserRole.PRODUCTION:
        if (currentView.includes('Production') || currentView === '/production') {
          return { display: 'Production', label: 'badge-primary' };
        }
        break;

      case UserRole.SALES:
        if (currentView.includes('Sales') || currentView === '/sales') {
          return { display: 'Sales Dashboard', label: 'badge-primary' };
        }
        break;

      case UserRole.MAINTENANCE:
        if (currentView.includes('Maintenance') || currentView === '/maintenance') {
          return { display: 'Maintenance', label: 'badge-primary' };
        }
        break;

      case UserRole.RMA:
        if (currentView.includes('RMA') || currentView.includes('Returns')) {
          return { display: 'RMA Dashboard', label: 'badge-primary' };
        }
        break;
    }

    return { display: currentView, label: 'badge-info' };
  };

  // Get status badge style
  const getStatusBadge = (status: string | undefined) => {
    if (status === 'INACTIVE') return 'badge-error';
    if (status === 'ACTIVE' || status === 'PICKING' || status === 'PACKING') return 'badge-success';
    return 'badge-info';
  };

  // Format time ago
  const formatTimeAgo = (timestamp: string | undefined) => {
    if (!timestamp) return 'Never';
    return `${Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000)}s ago`;
  };

  // Handle view orders/activity
  const handleViewOrders = (memberId: string, memberName: string, roleType: UserRole) => {
    setSelectedMember({ id: memberId, name: memberName, roleType });
    if (onViewOrders) {
      onViewOrders(memberId, memberName, roleType);
    }
  };

  // Render activity table for a specific role
  const renderActivityTable = (userRole: UserRole, data: any[]) => {
    const config = ROLE_CONFIG[userRole];
    const Icon = config.icon;

    if (!data || data.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-16">
          <Icon className="h-16 w-16 dark:text-gray-600 text-gray-400 mb-4" />
          <p className="text-sm dark:text-gray-400 text-gray-600">
            No active {config.label.toLowerCase()}
          </p>
          <p className="text-xs dark:text-gray-500 text-gray-500 mt-2">
            {config.label} will appear here when they are active
          </p>
        </div>
      );
    }

    return (
      <div className="mobile-table-container">
        <table className="min-w-full dark:divide-y dark:divide-white/[0.08] divide-y divide-gray-200">
          <thead>
            <tr>
              <th className="w-48 px-2 sm:px-4 py-3 text-left text-xs font-semibold dark:text-gray-400 text-gray-600 uppercase tracking-wider">
                {config.label.slice(0, -1)} {/* Remove 's' */}
              </th>
              <th className="w-32 px-2 sm:px-4 py-3 text-center text-xs font-semibold dark:text-gray-400 text-gray-600 uppercase tracking-wider">
                Actions
              </th>
              <th className="w-40 px-2 sm:px-4 py-3 text-center text-xs font-semibold dark:text-gray-400 text-gray-600 uppercase tracking-wider">
                Location
              </th>
              {/* Progress column - shown for all roles but only has data for picker/packer */}
              <th className="w-24 px-2 sm:px-4 py-3 text-center text-xs font-semibold dark:text-gray-400 text-gray-600 uppercase tracking-wider">
                Progress
              </th>
              <th className="w-28 px-2 sm:px-4 py-3 text-center text-xs font-semibold dark:text-gray-400 text-gray-600 uppercase tracking-wider">
                Status
              </th>
              <th className="w-32 px-2 sm:px-4 py-3 text-center text-xs font-semibold dark:text-gray-400 text-gray-600 uppercase tracking-wider">
                Last Activity
              </th>
            </tr>
          </thead>
          <tbody className="dark:divide-y dark:divide-white/[0.05] divide-y divide-gray-200">
            {data.map((member: any, idx: number) => {
              const memberId = member[config.idField] || `idx-${idx}`;
              const memberName = member[config.nameField];
              const { display: displayView, label: viewLabel } = formatView(
                member.currentView,
                userRole,
                member.currentOrderId
              );
              const statusBadge = getStatusBadge(member.status);

              return (
                <tr
                  key={`${userRole}-${memberId}`}
                  className="dark:hover:bg-white/[0.02] hover:bg-gray-50 transition-colors"
                >
                  <td className="w-48 px-2 sm:px-4 py-3 text-sm dark:text-white text-gray-900">
                    <div className="flex flex-col">
                      <span className="font-medium">{memberName}</span>
                      <span className="text-xs dark:text-gray-500 text-gray-500">({memberId})</span>
                    </div>
                  </td>
                  <td className="w-32 px-2 sm:px-4 py-3 text-sm text-center">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleViewOrders(memberId, memberName, userRole)}
                      className="text-xs touch-target"
                    >
                      {userRole === UserRole.STOCK_CONTROLLER ? (
                        <>
                          <ClipboardDocumentListIcon className="h-3 w-3 mr-1" />
                          View Activity
                        </>
                      ) : (
                        <>
                          <DocumentTextIcon className="h-3 w-3 mr-1" />
                          View Orders
                        </>
                      )}
                    </Button>
                  </td>
                  <td className="w-40 px-2 sm:px-4 py-3 text-sm text-center dark:text-white text-gray-900 font-medium">
                    <span className={viewLabel}>{displayView}</span>
                  </td>
                  {/* Progress column - always shown, with data for picker/packer */}
                  <td className="w-24 px-2 sm:px-4 py-3 text-sm text-center dark:text-white text-gray-900">
                    {userRole === UserRole.PICKER || userRole === UserRole.PACKER
                      ? member.currentOrderId
                        ? `${member.orderProgress}%`
                        : '-'
                      : '-'}
                  </td>
                  <td className="w-28 px-2 sm:px-4 py-3 text-center">
                    <span className={statusBadge}>{member.status || 'IDLE'}</span>
                  </td>
                  <td className="w-32 px-2 sm:px-4 py-3 text-sm text-center dark:text-gray-400 text-gray-600">
                    {formatTimeAgo(member.lastViewedAt)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  // Render orders modal
  const renderOrdersModal = () => {
    if (!selectedMember) return null;

    const isStockController = selectedMember.roleType === UserRole.STOCK_CONTROLLER;
    const modalData = isStockController ? transactions : orders;
    const modalLoading = isStockController ? transactionsLoading : ordersLoading;

    return (
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
            onClick={() => setSelectedMember(null)}
          />
          <div className="inline-block align-bottom glass-card rounded-2xl text-left overflow-hidden shadow-premium-lg transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full animate-scale-in">
            <div className="dark:bg-white/[0.02] bg-gray-50 px-6 py-4 sm:px-6 flex items-center justify-between dark:border-b border-b dark:border-white/[0.08] border-gray-200">
              <div>
                <h3 className="text-lg leading-6 font-semibold dark:text-white text-gray-900">
                  {isStockController
                    ? `${selectedMember.name}'s Activity`
                    : `${selectedMember.name}'s Orders`}
                </h3>
                <p className="mt-1 text-sm dark:text-gray-400 text-gray-600">
                  {modalData?.length || 0} {isStockController ? 'transaction' : 'order'}
                  {(modalData?.length || 0) !== 1 ? 's' : ''}
                </p>
              </div>
              <button
                onClick={() => setSelectedMember(null)}
                className="dark:text-gray-400 text-gray-500 dark:hover:text-white hover:text-gray-900 focus:outline-none transition-colors duration-200 hover:rotate-90 transform"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            <div className="px-6 py-5 sm:px-6 max-h-96 overflow-y-auto">
              {modalLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="dark:text-gray-400 text-gray-500">
                    Loading {isStockController ? 'transactions' : 'orders'}...
                  </div>
                </div>
              ) : modalData && modalData.length > 0 ? (
                <div className="space-y-3">
                  {modalData.map((item: any) => (
                    <div
                      key={isStockController ? item.transactionId : item.orderId}
                      className="dark:border dark:border-white/[0.08] border border-gray-200 rounded-xl p-4 dark:hover:bg-white/[0.02] hover:bg-gray-50 transition-all duration-300"
                    >
                      {isStockController ? (
                        // Transaction Card
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span
                                className={`badge ${
                                  item.type === 'STOCK_IN'
                                    ? 'badge-success'
                                    : item.type === 'STOCK_OUT' || item.type === 'ADJUSTMENT'
                                      ? 'badge-warning'
                                      : 'badge-info'
                                }`}
                              >
                                {item.type === 'STOCK_IN'
                                  ? 'Stock In'
                                  : item.type === 'STOCK_OUT'
                                    ? 'Stock Out'
                                    : item.type === 'TRANSFER'
                                      ? 'Transfer'
                                      : item.type === 'ADJUSTMENT'
                                        ? 'Adjustment'
                                        : item.type === 'STOCK_COUNT'
                                          ? 'Stock Count'
                                          : item.type}
                              </span>
                              <h4 className="text-sm font-semibold dark:text-white text-gray-900">
                                {item.sku}
                              </h4>
                            </div>
                            <div className="grid grid-cols-2 gap-4 text-xs dark:text-gray-400 text-gray-600">
                              <div>
                                <span className="font-medium dark:text-white text-gray-900">
                                  Bin:{' '}
                                </span>
                                {item.binLocation || 'N/A'}
                              </div>
                              <div>
                                <span className="font-medium dark:text-white text-gray-900">
                                  Quantity:{' '}
                                </span>
                                {item.quantityChange > 0
                                  ? `+${item.quantityChange}`
                                  : item.quantityChange}
                              </div>
                              <div className="col-span-2">
                                <span className="font-medium dark:text-white text-gray-900">
                                  Reason:{' '}
                                </span>
                                {item.reason || 'N/A'}
                              </div>
                              <div className="col-span-2">
                                <span className="font-medium dark:text-white text-gray-900">
                                  Time:{' '}
                                </span>
                                {item.createdAt
                                  ? new Date(item.createdAt).toLocaleString()
                                  : 'Unknown'}
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        // Order Card
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm font-semibold dark:text-white text-gray-900">
                                {item.orderId}
                              </h4>
                              {item.status === 'PICKED' || item.progress === 100 ? (
                                <span className="badge badge-primary">PICKED</span>
                              ) : item.status === 'PACKED' ? (
                                <span className="badge badge-success">PACKED</span>
                              ) : (
                                <span className="badge badge-warning">IN QUEUE</span>
                              )}
                            </div>
                            <p className="text-sm dark:text-gray-300 text-gray-600 mt-1">
                              {item.customerName}
                            </p>
                            <div className="mt-2 grid grid-cols-3 gap-4 text-xs dark:text-gray-400 text-gray-600">
                              <div>
                                <span className="font-medium dark:text-white text-gray-900">
                                  Progress:{' '}
                                </span>
                                {item.progress}%
                              </div>
                              <div>
                                <span className="font-medium dark:text-white text-gray-900">
                                  Items:{' '}
                                </span>
                                {item.itemCount || 0}
                              </div>
                              <div>
                                <span className="font-medium dark:text-white text-gray-900">
                                  Priority:{' '}
                                </span>
                                {item.priority}
                              </div>
                            </div>
                          </div>
                          {(item.status === 'PICKING' ||
                            item.status === 'PICKED' ||
                            item.progress === 100) && (
                            <Button
                              size="sm"
                              variant="primary"
                              onClick={() =>
                                (window.location.href = `/orders/${item.orderId}/pick`)
                              }
                              className="flex items-center gap-2 shrink-0"
                            >
                              <EyeIcon className="h-4 w-4" />
                              Live View
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  {isStockController ? (
                    <ClipboardDocumentListIcon className="h-14 w-14 dark:text-gray-600 text-gray-400 mx-auto mb-4" />
                  ) : (
                    <ShoppingBagIcon className="h-14 w-14 dark:text-gray-600 text-gray-400 mx-auto mb-4" />
                  )}
                  <p className="text-sm dark:text-gray-400 text-gray-600">
                    No {isStockController ? 'transactions' : 'orders'} found
                  </p>
                </div>
              )}
            </div>
            <div className="dark:bg-white/[0.02] bg-gray-50 px-6 py-4 sm:px-6 sm:flex sm:flex-row-reverse dark:border-t border-t dark:border-white/[0.08] border-gray-200">
              <Button
                variant="secondary"
                onClick={() => setSelectedMember(null)}
                className="w-full sm:w-auto sm:text-sm"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Get roles to display based on current selection
  // For "all", only show roles that have actual users currently active
  const rolesToDisplay = useMemo(() => {
    if (role === 'all') {
      return ALL_ROLES.filter(userRole => {
        const roleActivity = activities[userRole];
        return roleActivity && roleActivity.length > 0;
      });
    }
    return [role];
  }, [role, activities]);

  return (
    <>
      <Card variant="glass" className="card-hover">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle>Role Activity</CardTitle>
            <RoleSelectorDropdown value={role} onChange={onRoleChange} />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="dark:text-gray-400 text-gray-500">Loading activity...</div>
            </div>
          ) : role === 'all' ? (
            // Show all roles stacked (only those with active users)
            rolesToDisplay.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16">
                <UsersIcon className="h-16 w-16 dark:text-gray-600 text-gray-400 mb-4" />
                <p className="text-sm dark:text-gray-400 text-gray-600">No active roles</p>
                <p className="text-xs dark:text-gray-500 text-gray-500 mt-2">
                  Activity will appear here when users are active
                </p>
              </div>
            ) : (
              <div className="space-y-8">
                {rolesToDisplay.map(userRole => {
                  const config = ROLE_CONFIG[userRole];
                  return (
                    <div key={userRole}>
                      <h3 className="text-lg font-semibold dark:text-white text-gray-900 mb-4 flex items-center gap-2">
                        <config.icon className={`h-5 w-5 text-${config.color}-400`} />
                        {config.label}
                      </h3>
                      {renderActivityTable(userRole, activities[userRole] || [])}
                    </div>
                  );
                })}
              </div>
            )
          ) : (
            // Show selected role
            renderActivityTable(role, activities[role] || [])
          )}
        </CardContent>
      </Card>
      {renderOrdersModal()}
    </>
  );
}
