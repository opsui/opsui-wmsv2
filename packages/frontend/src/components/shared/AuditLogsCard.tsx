/**
 * Audit Logs Card Component
 *
 * Displays comprehensive audit logs for SOC2/ISO27001 compliance
 * Shows all system activity regardless of role or user
 */

import { useState, useMemo } from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Badge,
  Input,
} from '@/components/shared';
import {
  DocumentTextIcon,
  ShieldCheckIcon,
  UserIcon,
  CogIcon,
  ChevronDownIcon,
  FunnelIcon,
  XMarkIcon,
  CalendarIcon,
  MagnifyingGlassIcon,
  ArrowUturnLeftIcon,
  CheckIcon,
  ShoppingCartIcon,
  TruckIcon,
  XCircleIcon,
  CubeIcon,
  PlayIcon,
  DocumentPlusIcon,
  RocketLaunchIcon,
  CheckCircleIcon,
  MapPinIcon,
  ArrowRightIcon,
  AdjustmentsHorizontalIcon,
  InboxIcon,
} from '@heroicons/react/24/outline';
import { AuditLog, useAuditCategories, useAuditActions, useAuditUsers, useAuditResourceTypes } from '@/services/api';

// ============================================================================
// TYPES
// ============================================================================

interface AuditLogsCardProps {
  logs: AuditLog[];
  isLoading?: boolean;
  onFiltersChange?: (filters: AuditLogFilters) => void;
  hasNextPage?: boolean;
  hasPreviousPage?: boolean;
  totalPages?: number;
}

export interface AuditLogFilters {
  category?: string | null;
  action?: string | null;
  userEmail?: string | null;
  resourceType?: string | null;
  startDate?: Date | null;
  endDate?: Date | null;
  search?: string | null;
  page?: number;
}

// Category icons and colors
const CATEGORY_CONFIG: Record<string, { icon: any; color: string; label: string }> = {
  AUTHENTICATION: {
    icon: ShieldCheckIcon,
    color: 'primary',
    label: 'Authentication',
  },
  AUTHORIZATION: {
    icon: UserIcon,
    color: 'secondary',
    label: 'Authorization',
  },
  USER_MANAGEMENT: {
    icon: UserIcon,
    color: 'info',
    label: 'User Management',
  },
  DATA_ACCESS: {
    icon: DocumentTextIcon,
    color: 'success',
    label: 'Data Access',
  },
  DATA_MODIFICATION: {
    icon: CogIcon,
    color: 'purple',
    label: 'Data Modification',
  },
  CONFIGURATION: {
    icon: CogIcon,
    color: 'purple',
    label: 'Configuration',
  },
  SECURITY: {
    icon: ShieldCheckIcon,
    color: 'danger',
    label: 'Security',
  },
  API_ACCESS: {
    icon: DocumentTextIcon,
    color: 'info',
    label: 'API Access',
  },
  SYSTEM: {
    icon: CogIcon,
    color: 'gray',
    label: 'System',
  },
};

// All known categories (from backend AuditCategory enum)
const ALL_CATEGORIES = Object.keys(CATEGORY_CONFIG);

// All known action types (from backend AuditEventType enum)
const ALL_ACTIONS = [
  'LOGIN_SUCCESS',
  'LOGIN_FAILED',
  'LOGOUT',
  'USER_CREATED',
  'USER_UPDATED',
  'USER_DELETED',
  'PASSWORD_CHANGED',
  'PASSWORD_RESET',
  'ROLE_ASSIGNED',
  'ROLE_REVOKED',
  'PERMISSION_GRANTED',
  'PERMISSION_REVOKED',
  'ORDER_CREATED',
  'ORDER_UPDATED',
  'ORDER_CANCELLED',
  'ORDER_CLAIMED',
  'ORDER_COMPLETED',
  'ITEM_PICKED',
  'ITEM_PACKED',
  'INVENTORY_CREATED',
  'INVENTORY_UPDATED',
  'INVENTORY_DELETED',
  'STOCK_ADJUSTMENT',
  'CYCLE_COUNT_STARTED',
  'CYCLE_COUNT_COMPLETED',
  'DISCREPANCY_FOUND',
  'DISCREPANCY_RESOLVED',
  'EXCEPTION_CREATED',
  'EXCEPTION_RESOLVED',
  'CONFIGURATION_CHANGED',
  'SYSTEM_BACKUP',
  'SYSTEM_RESTORE',
  'MAINTENANCE_MODE',
  'API_ACCESS',
  'DATA_EXPORTED',
  'DATA_IMPORTED',
  'SETTINGS_UPDATED',
];

// Color mapping for action icons - consistent dark shades
const ACTION_COLOR_MAP: Record<string, { icon: string; bg: string }> = {
  purple: { icon: 'text-purple-700 dark:text-purple-500', bg: 'bg-purple-100 dark:bg-purple-500/20' },
  amber: { icon: 'text-amber-700 dark:text-amber-500', bg: 'bg-amber-100 dark:bg-amber-500/20' },
  red: { icon: 'text-red-700 dark:text-red-500', bg: 'bg-red-100 dark:bg-red-500/20' },
  blue: { icon: 'text-blue-700 dark:text-blue-500', bg: 'bg-blue-100 dark:bg-blue-500/20' },
  green: { icon: 'text-green-700 dark:text-green-500', bg: 'bg-green-100 dark:bg-green-500/20' },
  gray: { icon: 'text-gray-700 dark:text-gray-500', bg: 'bg-gray-100 dark:bg-gray-500/20' },
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function AuditLogsCard({ logs, isLoading, onFiltersChange, hasNextPage, hasPreviousPage, totalPages }: AuditLogsCardProps) {
  const [filters, setFilters] = useState<AuditLogFilters>({
    category: null,
    action: null,
    userEmail: null,
    resourceType: null,
    startDate: null,
    endDate: null,
    search: null,
  });
  const [expandedLog, setExpandedLog] = useState<number | null>(null);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Fetch all available categories and actions from the API
  const { data: apiCategories } = useAuditCategories();
  const { data: apiActions } = useAuditActions();
  const { data: apiUsers } = useAuditUsers();
  const { data: apiResourceTypes } = useAuditResourceTypes();

  // Get unique values for filters
  // Use API results when available, otherwise fall back to constants or derive from logs
  const filterOptions = useMemo(() => {
    // Categories: use API results or fall back to all known categories
    const categories = (apiCategories || ALL_CATEGORIES).sort();

    // Actions: use API results or fall back to all known actions
    const actions = (apiActions || ALL_ACTIONS).sort();

    // User emails: use API results or derive from logs
    const userEmails = (apiUsers as string[] | undefined || Array.from(new Set(logs.map(log => log.userEmail).filter(Boolean)))).sort();

    // Resource types: use API results or derive from logs
    const resourceTypes = (apiResourceTypes as string[] | undefined || Array.from(new Set(logs.map(log => log.resourceType).filter(Boolean)))).sort();

    return { categories, actions, userEmails, resourceTypes };
  }, [logs, apiCategories, apiActions, apiUsers, apiResourceTypes]);

  // Note: Server-side filtering is handled by the parent component
  // We display the logs as-is from the server (already filtered & paginated)
  const filteredLogs = logs;

  // Notify parent of filter changes (for server-side filtering)
  const updateFilters = (newFilters: Partial<AuditLogFilters>) => {
    const updated = { ...filters, ...newFilters };
    setFilters(updated);
    onFiltersChange?.(updated);
  };

  const clearFilters = () => {
    const cleared: AuditLogFilters = {
      category: null,
      action: null,
      userEmail: null,
      resourceType: null,
      startDate: null,
      endDate: null,
      search: null,
      page: 1, // Reset to page 1
    };
    setFilters(cleared);
    onFiltersChange?.(cleared);
  };

  // Check if there are active filters (excluding page from the check)
  const hasActiveFilters = Object.entries(filters).some(([key, value]) =>
    key !== 'page' && value !== null
  );

  // Format timestamp
  const formatTimestamp = (timestamp: Date | string | undefined) => {
    if (!timestamp) return 'N/A';
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  // Get category config
  const getCategoryConfig = (category: string) => {
    return CATEGORY_CONFIG[category] || {
      icon: DocumentTextIcon,
      color: 'gray',
      label: category,
    };
  };

  return (
    <Card variant="glass" className="card-hover">
      <CardHeader>
        <div className="flex flex-col gap-4">
          {/* Title Row */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle>
              <div className="flex items-center gap-2">
                <DocumentTextIcon className="h-5 w-5" />
                <span>Audit Logs</span>
                <Badge variant="info" className="ml-2">
                  {filteredLogs.length}
                </Badge>
                {hasActiveFilters && (
                  <Badge variant="warning" className="ml-1">
                    Filtered
                  </Badge>
                )}
              </div>
            </CardTitle>
            <div className="flex items-center gap-2">
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="px-3 py-2 text-sm font-medium dark:text-red-400 text-red-600 dark:hover:text-red-300 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-all duration-200"
                >
                  <XMarkIcon className="h-4 w-4 inline mr-1" />
                  Clear
                </button>
              )}
              <button
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 ${
                  showAdvancedFilters
                    ? 'dark:text-white text-black dark:bg-white/[0.08] bg-gray-100 dark:border-white/[0.12] border-gray-300 shadow-lg dark:shadow-blue-500/10 shadow-gray-200'
                    : 'dark:text-gray-300 text-gray-800 dark:hover:text-white hover:text-black dark:hover:bg-white/[0.05] hover:bg-gray-100 dark:border-transparent border-transparent dark:hover:border-white/[0.08] hover:border-gray-300'
                }`}
              >
                <FunnelIcon className="h-4 w-4" />
                <span>Filters</span>
                <ChevronDownIcon
                  className={`h-3 w-3 transition-transform duration-300 ${showAdvancedFilters ? 'rotate-180' : ''}`}
                />
              </button>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 dark:text-gray-500 text-gray-400" />
            <Input
              type="text"
              placeholder="Search logs..."
              value={filters.search || ''}
              onChange={(e) => updateFilters({ search: e.target.value || null })}
              className="pl-10"
            />
          </div>

          {/* Advanced Filters */}
          {showAdvancedFilters && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 animate-fade-in">
              {/* Category Filter */}
              <div className="relative">
                <select
                  value={filters.category ?? ''}
                  onChange={(e) => updateFilters({ category: e.target.value || null })}
                  className="w-full appearance-none bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 pr-10 text-sm font-medium dark:text-white text-gray-900 dark:hover:bg-gray-700 hover:bg-gray-50 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Categories</option>
                  {filterOptions.categories.map(category => {
                    const config = getCategoryConfig(category);
                    return (
                      <option key={category} value={category}>
                        {config.label}
                      </option>
                    );
                  })}
                </select>
                <FunnelIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 dark:text-gray-500 text-gray-400 pointer-events-none" />
              </div>

              {/* Action Filter */}
              <div className="relative">
                <select
                  value={filters.action || ''}
                  onChange={(e) => updateFilters({ action: e.target.value || null })}
                  className="w-full appearance-none bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 pr-10 text-sm font-medium dark:text-white text-gray-900 dark:hover:bg-gray-700 hover:bg-gray-50 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Actions</option>
                  {filterOptions.actions.map(action => (
                    <option key={action} value={action}>
                      {action}
                    </option>
                  ))}
                </select>
                <FunnelIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 dark:text-gray-500 text-gray-400 pointer-events-none" />
              </div>

              {/* User Email Filter */}
              <div className="relative">
                <select
                  value={filters.userEmail ?? ''}
                  onChange={(e) => updateFilters({ userEmail: e.target.value || null })}
                  className="w-full appearance-none bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 pr-10 text-sm font-medium dark:text-white text-gray-900 dark:hover:bg-gray-700 hover:bg-gray-50 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Users</option>
                  {filterOptions.userEmails.filter((e): e is string => Boolean(e)).map(email => (
                    <option key={email} value={email}>
                      {email}
                    </option>
                  ))}
                </select>
                <UserIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 dark:text-gray-500 text-gray-400 pointer-events-none" />
              </div>

              {/* Resource Type Filter */}
              <div className="relative">
                <select
                  value={filters.resourceType ?? ''}
                  onChange={(e) => updateFilters({ resourceType: e.target.value || null })}
                  className="w-full appearance-none bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 pr-10 text-sm font-medium dark:text-white text-gray-900 dark:hover:bg-gray-700 hover:bg-gray-50 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Resources</option>
                  {filterOptions.resourceTypes.filter((t): t is string => Boolean(t)).map(type => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
                <CogIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 dark:text-gray-500 text-gray-400 pointer-events-none" />
              </div>

              {/* Date Range Filters */}
              <div className="relative">
                <input
                  type="date"
                  value={filters.startDate ? filters.startDate.toISOString().split('T')[0] : ''}
                  onChange={(e) => updateFilters({ startDate: e.target.value ? new Date(e.target.value) : null })}
                  className="w-full appearance-none bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 pr-10 text-sm font-medium dark:text-white text-gray-900 dark:hover:bg-gray-700 hover:bg-gray-50 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Start Date"
                />
                <CalendarIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 dark:text-gray-500 text-gray-400 pointer-events-none" />
              </div>

              <div className="relative">
                <input
                  type="date"
                  value={filters.endDate ? filters.endDate.toISOString().split('T')[0] : ''}
                  onChange={(e) => {
                    // Set to end of the selected day
                    const date = e.target.value ? new Date(e.target.value) : null;
                    if (date) {
                      date.setHours(23, 59, 59, 999);
                    }
                    updateFilters({ endDate: date });
                  }}
                  className="w-full appearance-none bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 pr-10 text-sm font-medium dark:text-white text-gray-900 dark:hover:bg-gray-700 hover:bg-gray-50 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="End Date"
                />
                <CalendarIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 dark:text-gray-500 text-gray-400 pointer-events-none" />
              </div>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="dark:text-gray-400 text-gray-500">Loading audit logs...</div>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <DocumentTextIcon className="h-16 w-16 dark:text-gray-600 text-gray-400 mb-4" />
            <p className="text-sm dark:text-gray-400 text-gray-600">No audit logs found</p>
            <p className="text-xs dark:text-gray-500 text-gray-500 mt-2">
              {hasActiveFilters ? 'Try adjusting your filters' : 'System activity will appear here'}
            </p>
          </div>
        ) : (
          <div className="space-y-3 max-h-[600px] overflow-y-auto">
            {filteredLogs.map((log) => {
              const isExpanded = expandedLog === log.id;
              const desc = log.actionDescription?.toLowerCase() || '';
              const actionType = log.actionType;

              // Determine icon based on action type and description
              let ActionIcon: any;
              let iconColor: string = 'purple';

              // Check action type first (more reliable)
              if (actionType === 'ITEM_SCANNED') {
                // Individual item scan during picking
                ActionIcon = CheckIcon;
                iconColor = 'blue';
              }
              else if (actionType === 'PICK_CONFIRMED') {
                if (desc.includes('unverified')) {
                  // Undo-pick
                  ActionIcon = ArrowUturnLeftIcon;
                  iconColor = 'amber';
                } else {
                  // Regular pick - box icon (order list)
                  ActionIcon = CubeIcon;
                  iconColor = 'purple';
                }
              }
              else if (actionType === 'PACK_COMPLETED') {
                // Check if it's packing/verifying vs shipping
                if (desc.includes('Packed') || desc.includes('packed')) {
                  ActionIcon = CheckIcon;
                  iconColor = 'green';
                } else {
                  // Ship order
                  ActionIcon = TruckIcon;
                  iconColor = 'green';
                }
              }
              else if (actionType === 'ORDER_UPDATED') {
                ActionIcon = CogIcon;
                iconColor = 'gray';
              }
              else if (actionType === 'ORDER_CLAIMED') {
                ActionIcon = ShoppingCartIcon;
                iconColor = 'blue';
              }
              else if (actionType === 'ORDER_UNCLAIMED') {
                ActionIcon = XCircleIcon;
                iconColor = 'red';
              }
              else if (actionType === 'ORDER_CONTINUED') {
                ActionIcon = PlayIcon;
                iconColor = 'blue';
              }
              else if (actionType === 'WAVE_CREATED') {
                ActionIcon = DocumentPlusIcon;
                iconColor = 'blue';
              }
              else if (actionType === 'WAVE_RELEASED') {
                ActionIcon = RocketLaunchIcon;
                iconColor = 'green';
              }
              else if (actionType === 'WAVE_COMPLETED') {
                ActionIcon = CheckCircleIcon;
                iconColor = 'green';
              }
              else if (actionType === 'SLOTTING_IMPLEMENTED') {
                ActionIcon = AdjustmentsHorizontalIcon;
                iconColor = 'purple';
              }
              else if (actionType === 'ZONE_ASSIGNED') {
                ActionIcon = MapPinIcon;
                iconColor = 'blue';
              }
              else if (actionType === 'ZONE_RELEASED') {
                ActionIcon = ArrowRightIcon;
                iconColor = 'amber';
              }
              else if (actionType === 'ZONE_REBALANCED') {
                ActionIcon = AdjustmentsHorizontalIcon;
                iconColor = 'purple';
              }
              else if (actionType === 'PUTAWAY_COMPLETED') {
                ActionIcon = InboxIcon;
                iconColor = 'green';
              }
              else if (actionType === 'CYCLE_COUNT_PLAN_CREATED') {
                ActionIcon = DocumentPlusIcon;
                iconColor = 'blue';
              }
              else if (actionType === 'CYCLE_COUNT_STARTED') {
                ActionIcon = PlayIcon;
                iconColor = 'green';
              }
              else if (actionType === 'CYCLE_COUNT_COMPLETED') {
                ActionIcon = CheckCircleIcon;
                iconColor = 'green';
              }
              else if (actionType === 'CYCLE_COUNT_RECONCILED') {
                ActionIcon = ShieldCheckIcon;
                iconColor = 'purple';
              }
              else if (actionType === 'BIN_LOCATION_CREATED') {
                ActionIcon = MapPinIcon;
                iconColor = 'green';
              }
              else if (actionType === 'BIN_LOCATION_UPDATED') {
                ActionIcon = CogIcon;
                iconColor = 'blue';
              }
              else if (actionType === 'BIN_LOCATION_DELETED') {
                ActionIcon = XCircleIcon;
                iconColor = 'red';
              }
              else if (actionType === 'CUSTOM_ROLE_CREATED') {
                ActionIcon = DocumentPlusIcon;
                iconColor = 'green';
              }
              else if (actionType === 'CUSTOM_ROLE_UPDATED') {
                ActionIcon = CogIcon;
                iconColor = 'blue';
              }
              else if (actionType === 'CUSTOM_ROLE_DELETED') {
                ActionIcon = XCircleIcon;
                iconColor = 'red';
              }
              else if (actionType === 'ORDER_CANCELLED') {
                ActionIcon = XCircleIcon;
                iconColor = 'red';
              }
              else if (actionType === 'ROLE_GRANTED') {
                ActionIcon = ShieldCheckIcon;
                iconColor = 'green';
              }
              else if (actionType === 'ROLE_REVOKED') {
                ActionIcon = ShieldCheckIcon;
                iconColor = 'amber';
              }
              // Fallback to description-based checks for unknown action types
              else if (desc.includes('shipped order')) {
                ActionIcon = TruckIcon;
                iconColor = 'green';
              }
              else if (desc.includes('cancelled order')) {
                ActionIcon = XCircleIcon;
                iconColor = 'red';
              }
              else if (desc.includes('unclaimed order')) {
                ActionIcon = XCircleIcon;
                iconColor = 'red';
              }
              else if (desc.includes('claimed order')) {
                ActionIcon = ShoppingCartIcon;
                iconColor = 'blue';
              }
              // Default
              else {
                ActionIcon = CogIcon;
                iconColor = 'gray';
              }

              const colors = ACTION_COLOR_MAP[iconColor] || ACTION_COLOR_MAP.gray;

              return (
                <div
                  key={log.id}
                  className={`dark:border dark:border-white/[0.08] border border-gray-200 rounded-xl overflow-hidden transition-all duration-300 ${
                    isExpanded
                      ? 'dark:bg-white/[0.04] bg-gray-50'
                      : 'dark:hover:bg-white/[0.02] hover:bg-gray-50'
                  }`}
                >
                  {/* Main row - always visible */}
                  <div
                    className="p-4 cursor-pointer"
                    onClick={() => setExpandedLog(isExpanded ? null : (log.id || 0))}
                  >
                    <div className="flex items-start gap-3">
                      {/* Action Icon - different icons for different actions */}
                      <div className={`flex-shrink-0 w-10 h-10 rounded-lg ${colors.bg} flex items-center justify-center`}>
                        <ActionIcon className={`h-5 w-5 ${colors.icon}`} />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        {/* Human-readable action description */}
                        <div className="text-sm dark:text-white text-gray-900 font-medium mb-1">
                          {log.actionDescription || log.actionType}
                        </div>

                        {/* User and timestamp */}
                        <div className="flex items-center gap-3 text-xs dark:text-gray-400 text-gray-600 flex-wrap">
                          {log.userEmail && (
                            <span className="dark:text-gray-300 text-gray-700">
                              {log.userEmail}
                            </span>
                          )}
                          <span>•</span>
                          <span>{formatTimestamp(log.occurredAt)}</span>
                        </div>

                        {/* Key details extracted from metadata - filter out technical fields and role assignment details */}
                        {log.metadata && (log.metadata as any).details && Object.keys((log.metadata as any).details).length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {Object.entries((log.metadata as any).details)
                              .filter(([key]) => ![
                                'requestData', 'requestBody', 'sku', 'quantity', 'binLocation', 'pickTaskId', 'barcode',
                                // Role assignment details - shown in Role Details section instead
                                'role', 'grantedTo', 'grantedToEmail', 'grantedBy', 'grantedByEmail',
                                'revokedFrom', 'revokedFromEmail', 'revokedBy', 'revokedByEmail'
                              ].includes(key))
                              .map(([key, value]) => (
                                <span
                                  key={key}
                                  className="inline-flex items-center px-2 py-0.5 rounded text-xs dark:bg-white/[0.06] bg-gray-200 dark:text-gray-400 text-gray-600"
                                >
                                  <span className="dark:text-gray-500 text-gray-500 mr-1">{key}:</span>
                                  <span className="dark:text-gray-300 text-gray-700 font-medium">
                                    {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                                  </span>
                                </span>
                              ))}
                          </div>
                        )}
                      </div>

                      {/* Expand/Collapse Indicator */}
                      <ChevronDownIcon
                        className={`h-5 w-5 dark:text-gray-400 text-gray-600 transition-transform duration-200 flex-shrink-0 ${
                          isExpanded ? 'rotate-180' : ''
                        }`}
                      />
                    </div>
                  </div>

                  {/* Expanded details */}
                  {isExpanded && (
                    <div className="px-4 pb-4 border-t dark:border-white/[0.08] border-gray-200">
                      <div className="grid grid-cols-1 gap-3 mt-4 text-sm">
                        {/* Action Summary */}
                        <div>
                          <span className="font-medium dark:text-gray-400 text-gray-600 text-xs uppercase tracking-wide">
                            Action
                          </span>
                          <div className="dark:text-white text-gray-900 text-sm mt-1">
                            {log.actionDescription || log.actionType}
                          </div>
                        </div>

                        {/* Performed By */}
                        {log.userEmail && (
                          <div>
                            <span className="font-medium dark:text-gray-400 text-gray-600 text-xs uppercase tracking-wide">
                              Performed By
                            </span>
                            <div className="dark:text-gray-200 text-gray-800 text-sm mt-1">
                              {log.userEmail}
                            </div>
                          </div>
                        )}

                        {/* User/Resource Affected */}
                        {log.resourceId && (
                          <div>
                            <span className="font-medium dark:text-gray-400 text-gray-600 text-xs uppercase tracking-wide">
                              {/* Show appropriate label based on resource type */}
                              {log.resourceType === 'order' || log.actionType?.includes('ORDER') || log.actionType === 'PICK_CONFIRMED' || log.actionType === 'ITEM_SCANNED' || log.actionType === 'PACK_COMPLETED'
                                ? 'Order Affected'
                                : 'User Affected'}
                            </span>
                            <div className="dark:text-gray-200 text-gray-800 text-sm mt-1">
                              {/* For role assignments, use the name from metadata instead of user ID */}
                              {log.actionType === 'ROLE_GRANTED' || log.actionType === 'ROLE_REVOKED'
                                ? ((log.metadata as any)?.details?.grantedTo ||
                                   (log.metadata as any)?.details?.revokedFrom ||
                                   log.resourceId)
                                : log.resourceId}
                            </div>
                          </div>
                        )}

                        {/* Role Information (if applicable) */}
                        {log.metadata && (
                          (log.metadata as any).details?.role ||
                          (log.metadata as any).role ||
                          (log.metadata as any).grantedBy ||
                          (log.metadata as any).details?.grantedTo
                        ) && (
                          <div>
                            <span className="font-medium dark:text-gray-400 text-gray-600 text-xs uppercase tracking-wide">
                              Role Details
                            </span>
                            <div className="dark:text-gray-200 text-gray-800 text-sm mt-1 space-y-1">
                              {/* Check for new format (in details) or old format (at metadata root) */}
                              {((log.metadata as any).details?.role || (log.metadata as any).role) && (
                                <div>
                                  <span className="dark:text-gray-500 text-gray-600">Role: </span>
                                  <span className="font-medium">
                                    {(() => {
                                      const rawRole = (log.metadata as any).details?.role || (log.metadata as any).role;
                                      // Remove prefix pattern like "testacc1123System Administrator" -> "System Administrator"
                                      // Match patterns like: <letters><numbers><RoleName>
                                      return rawRole.replace(/^[a-z]+[0-9]+/, '');
                                    })()}
                                  </span>
                                </div>
                              )}
                              {(log.metadata as any).details?.grantedTo || (log.metadata as any).grantedTo && (
                                <div>
                                  <span className="dark:text-gray-500 text-gray-600">Granted To: </span>
                                  <span className="font-medium">{(log.metadata as any).details?.grantedTo || (log.metadata as any).grantedTo}</span>
                                </div>
                              )}
                              {(log.metadata as any).details?.grantedBy || (log.metadata as any).grantedBy && (
                                <div>
                                  <span className="dark:text-gray-500 text-gray-600">Granted By: </span>
                                  <span className="font-medium">{(log.metadata as any).details?.grantedBy || (log.metadata as any).grantedBy}</span>
                                </div>
                              )}
                              {((log.metadata as any).details?.grantedByEmail || (log.metadata as any).grantedByEmail) && (
                                <div>
                                  <span className="dark:text-gray-500 text-gray-600">({(log.metadata as any).details?.grantedByEmail || (log.metadata as any).grantedByEmail})</span>
                                </div>
                              )}
                              {(log.metadata as any).details?.revokedFrom && (
                                <div>
                                  <span className="dark:text-gray-500 text-gray-600">Revoked From: </span>
                                  <span className="font-medium">{(log.metadata as any).details?.revokedFrom}</span>
                                </div>
                              )}
                              {(log.metadata as any).details?.revokedBy && (
                                <div>
                                  <span className="dark:text-gray-500 text-gray-600">Revoked By: </span>
                                  <span className="font-medium">{(log.metadata as any).details?.revokedBy}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Technical Details (collapsed by default) */}
                        {(log.ipAddress || log.userAgent || log.correlationId) && (
                          <details className="group pt-2 border-t dark:border-white/[0.05] border-gray-200">
                            <summary className="cursor-pointer text-xs dark:text-gray-500 text-gray-500 hover:dark:text-gray-400 hover:text-gray-600 list-none flex items-center gap-1">
                              <ChevronDownIcon className="h-3 w-3 transition-transform group-open:rotate-180" />
                              Technical details
                            </summary>
                            <div className="mt-3 space-y-2 text-xs">
                              {log.ipAddress && (
                                <div>
                                  <span className="font-medium dark:text-gray-500 text-gray-500">IP: </span>
                                  <span className="dark:text-gray-400 text-gray-600 font-mono">{log.ipAddress}</span>
                                </div>
                              )}
                              {log.userAgent && (
                                <div>
                                  <span className="font-medium dark:text-gray-500 text-gray-500">User Agent: </span>
                                  <span className="dark:text-gray-400 text-gray-600">{log.userAgent}</span>
                                </div>
                              )}
                              {log.correlationId && (
                                <div>
                                  <span className="font-medium dark:text-gray-500 text-gray-500">Trace ID: </span>
                                  <span className="dark:text-gray-400 text-gray-600 font-mono">{log.correlationId}</span>
                                </div>
                              )}
                            </div>
                          </details>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {filteredLogs.length > 0 && (
          <div className="mt-6 pt-4 border-t dark:border-white/[0.08] border-gray-200">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-sm dark:text-gray-400 text-gray-600">
                Page {filters.page || 1}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => updateFilters({ page: Math.max(1, (filters.page || 1) - 1) })}
                  disabled={!hasPreviousPage && (filters.page || 1) <= 1}
                  className="px-3 py-2 text-sm font-medium dark:text-gray-300 text-gray-700 dark:bg-white/[0.05] bg-gray-100 dark:hover:bg-white/[0.1] hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
                >
                  Previous
                </button>
                {/* Calculate max page to show */}
                {(() => {
                  const currentPage = filters.page || 1;
                  const maxPage = hasNextPage ? currentPage + 1 : currentPage;
                  const pagesToShow = [];
                  for (let i = 1; i <= maxPage; i++) {
                    pagesToShow.push(i);
                  }
                  return pagesToShow.map((pageNum) => (
                    <button
                      key={pageNum}
                      onClick={() => updateFilters({ page: pageNum })}
                      className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                        currentPage === pageNum
                          ? 'dark:bg-blue-600 bg-blue-600 dark:text-white text-white'
                          : 'dark:text-gray-300 text-gray-700 dark:bg-white/[0.05] bg-gray-100 dark:hover:bg-white/[0.1] hover:bg-gray-200'
                      }`}
                    >
                      {pageNum}
                    </button>
                  ));
                })()}
                <button
                  onClick={() => updateFilters({ page: (filters.page || 1) + 1 })}
                  disabled={!hasNextPage}
                  className="px-3 py-2 text-sm font-medium dark:text-gray-300 text-gray-700 dark:bg-white/[0.05] bg-gray-100 dark:hover:bg-white/[0.1] hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
