/**
 * Notification History component
 *
 * Displays filterable list of past notifications with search by type/date
 * and bulk actions (mark all read, delete all)
 */

import { useState } from 'react';
import {
  useNotifications,
  useMarkAsRead,
  useMarkAllAsRead,
  useDeleteNotification,
} from '@/services/api';
import {
  BellIcon,
  EnvelopeIcon,
  ChatBubbleLeftRightIcon,
  DevicePhoneMobileIcon,
  CheckIcon,
  TrashIcon,
  ChevronDownIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/shared';

// ============================================================================
// TYPES
// ============================================================================

interface NotificationHistoryProps {
  userId?: string;
  limit?: number;
  className?: string;
}

type NotificationType =
  | 'ORDER_CLAIMED'
  | 'ORDER_COMPLETED'
  | 'PICK_UPDATED'
  | 'INVENTORY_LOW'
  | 'EXCEPTION_REPORTED'
  | 'ZONE_ASSIGNED'
  | 'WAVE_CREATED'
  | 'SYSTEM_ALERT';
type NotificationChannel = 'EMAIL' | 'SMS' | 'PUSH' | 'IN_APP';

interface Notification {
  notificationId: string;
  type: NotificationType;
  channel: NotificationChannel;
  title: string;
  message: string;
  status: 'PENDING' | 'SENT' | 'DELIVERED' | 'FAILED' | 'READ';
  createdAt: string;
  readAt?: string;
  data?: Record<string, unknown>;
}

// ============================================================================
// SUBCOMPONENTS
// ============================================================================

const channelIcons = {
  EMAIL: EnvelopeIcon,
  SMS: ChatBubbleLeftRightIcon,
  PUSH: DevicePhoneMobileIcon,
  IN_APP: BellIcon,
};

const channelColors = {
  EMAIL: 'text-blue-300 bg-blue-900/40 border border-blue-500/40',
  SMS: 'text-green-300 bg-green-900/40 border border-green-500/40',
  PUSH: 'text-purple-300 bg-purple-900/40 border border-purple-500/40',
  IN_APP: 'text-yellow-300 bg-yellow-900/40 border border-yellow-500/40',
};

const statusConfig = {
  PENDING: { label: 'Pending', color: 'bg-gray-800/60 text-gray-300 border border-gray-600/50' },
  SENT: { label: 'Sent', color: 'bg-blue-900/60 text-blue-300 border border-blue-500/50' },
  DELIVERED: {
    label: 'Delivered',
    color: 'bg-green-900/60 text-green-300 border border-green-500/50',
  },
  FAILED: { label: 'Failed', color: 'bg-red-900/60 text-red-300 border border-red-500/50' },
  READ: { label: 'Read', color: 'bg-primary-900/60 text-primary-300 border border-primary-500/50' },
};

const typeLabels: Record<NotificationType, string> = {
  ORDER_CLAIMED: 'Order Claimed',
  ORDER_COMPLETED: 'Order Completed',
  PICK_UPDATED: 'Pick Updated',
  INVENTORY_LOW: 'Low Inventory',
  EXCEPTION_REPORTED: 'Exception',
  ZONE_ASSIGNED: 'Zone Assigned',
  WAVE_CREATED: 'Wave Created',
  SYSTEM_ALERT: 'System Alert',
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function NotificationHistory({ limit = 50, className }: NotificationHistoryProps) {
  const [filterType, setFilterType] = useState<NotificationType | ''>('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data, isLoading } = useNotifications({
    type: filterType || undefined,
    status: filterStatus as any,
    unreadOnly,
    limit,
  });

  const markAsRead = useMarkAsRead();
  const markAllAsRead = useMarkAllAsRead();
  const deleteNotification = useDeleteNotification();

  const notifications = (data?.notifications || []) as Notification[];

  // Filter by search query
  const filteredNotifications = notifications.filter((notification: Notification) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      notification.title.toLowerCase().includes(query) ||
      notification.message.toLowerCase().includes(query) ||
      typeLabels[notification.type].toLowerCase().includes(query)
    );
  });

  const handleMarkAsRead = async (id: string) => {
    await markAsRead.mutateAsync(id);
  };

  const handleMarkAllAsRead = async () => {
    await markAllAsRead.mutateAsync();
  };

  const handleDelete = async (id: string) => {
    await deleteNotification.mutateAsync(id);
  };

  const unreadCount = notifications.filter((n: Notification) => n.status !== 'READ').length;

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header with stats and bulk actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold text-white">Notification History</h3>
          {unreadCount > 0 && <Badge variant="info">{unreadCount} unread</Badge>}
        </div>
        <div className="flex gap-2">
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllAsRead}
              className="px-3 py-1.5 text-sm text-primary-400 hover:text-primary-300 transition-colors"
            >
              Mark all read
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search notifications..."
            className="w-full pl-10 pr-4 py-2 rounded-lg bg-white/5 border border-white/[0.08] text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
          />
        </div>

        {/* Type filter */}
        <select
          value={filterType}
          onChange={e => setFilterType(e.target.value as NotificationType | '')}
          className="px-3 py-2 rounded-lg bg-gray-800 border border-gray-600 text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm [&_option]:bg-gray-900 [&_option]:text-gray-100"
        >
          <option value="">All Types</option>
          {Object.entries(typeLabels).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>

        {/* Status filter */}
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          className="px-3 py-2 rounded-lg bg-gray-800 border border-gray-600 text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm [&_option]:bg-gray-900 [&_option]:text-gray-100"
        >
          <option value="">All Status</option>
          {Object.entries(statusConfig).map(([key, { label }]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>

        {/* Unread only toggle */}
        <button
          onClick={() => setUnreadOnly(!unreadOnly)}
          className={cn(
            'px-3 py-2 rounded-lg border text-sm transition-colors',
            unreadOnly
              ? 'bg-primary-500/20 text-primary-400 border-primary-500/30'
              : 'bg-white/5 text-gray-400 border-white/[0.08] hover:bg-white/10'
          )}
        >
          Unread only
        </button>
      </div>

      {/* Notifications list */}
      {isLoading ? (
        <div className="text-center py-8 text-gray-400">Loading notifications...</div>
      ) : filteredNotifications.length === 0 ? (
        <div className="text-center py-8 text-gray-400">
          {searchQuery || filterType || filterStatus || unreadOnly
            ? 'No notifications match your filters'
            : 'No notifications yet'}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredNotifications.map((notification: Notification) => {
            const ChannelIcon = channelIcons[notification.channel];
            const statusInfo = statusConfig[notification.status];
            const isUnread = notification.status !== 'READ';
            const isExpanded = expandedId === notification.notificationId;

            return (
              <div
                key={notification.notificationId}
                className={cn(
                  'border rounded-lg transition-all cursor-pointer hover:bg-white/5',
                  isUnread
                    ? 'bg-primary-500/5 border-primary-500/20'
                    : 'bg-white/5 border-white/[0.08]'
                )}
              >
                <div
                  className="flex items-start gap-3 p-4"
                  onClick={() => setExpandedId(isExpanded ? null : notification.notificationId)}
                >
                  {/* Channel icon */}
                  <div
                    className={cn(
                      'flex-shrink-0 p-2 rounded-full',
                      channelColors[notification.channel]
                    )}
                  >
                    <ChannelIcon className="h-4 w-4" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium text-white">
                            {notification.title}
                          </span>
                          <Badge variant="default" className="text-xs">
                            {typeLabels[notification.type]}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-400 line-clamp-2">{notification.message}</p>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span
                          className={cn(
                            'text-xs px-2 py-0.5 rounded-full border',
                            statusInfo.color
                          )}
                        >
                          {statusInfo.label}
                        </span>
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            setExpandedId(isExpanded ? null : notification.notificationId);
                          }}
                          className="p-1 text-gray-400 hover:text-white transition-colors"
                        >
                          <ChevronDownIcon
                            className={cn(
                              'h-4 w-4 transition-transform',
                              isExpanded && 'rotate-180'
                            )}
                          />
                        </button>
                      </div>
                    </div>

                    {/* Timestamp */}
                    <div className="mt-2 text-xs text-gray-500">
                      {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                    </div>
                  </div>

                  {/* Mark as read button */}
                  {isUnread && (
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        handleMarkAsRead(notification.notificationId);
                      }}
                      className="flex-shrink-0 p-2 text-primary-400 hover:text-primary-300 transition-colors"
                      title="Mark as read"
                    >
                      <CheckIcon className="h-5 w-5" />
                    </button>
                  )}

                  {/* Delete button */}
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      handleDelete(notification.notificationId);
                    }}
                    className="flex-shrink-0 p-2 text-gray-400 hover:text-red-400 transition-colors"
                    title="Delete notification"
                  >
                    <TrashIcon className="h-5 w-5" />
                  </button>
                </div>

                {/* Expanded details */}
                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-gray-700 pt-3">
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="flex flex-col">
                        <span className="text-gray-500 text-xs uppercase tracking-wide">Type</span>
                        <span className="text-gray-200">{typeLabels[notification.type]}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-gray-500 text-xs uppercase tracking-wide">
                          Channel
                        </span>
                        <span className="text-gray-200">{notification.channel}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-gray-500 text-xs uppercase tracking-wide">
                          Status
                        </span>
                        <span className="text-gray-200">
                          {statusConfig[notification.status].label}
                        </span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-gray-500 text-xs uppercase tracking-wide">
                          Created
                        </span>
                        <span className="text-gray-200">
                          {new Date(notification.createdAt).toLocaleString()}
                        </span>
                      </div>
                    </div>
                    {notification.data && (
                      <div className="mt-4 p-3 rounded-lg bg-gray-900/50 border border-gray-700">
                        <div className="text-xs text-gray-400 mb-2 uppercase tracking-wide font-medium">
                          Notification Data
                        </div>
                        <pre className="text-xs text-gray-300 overflow-auto max-h-40 font-mono leading-relaxed">
                          {JSON.stringify(notification.data, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
