/**
 * Header component - Theme-aware (light/dark mode)
 *
 * Application header with user info, navigation links, and logout button
 */

import {
  useLogout,
  useMarkAsRead,
  useMyRoles,
  useNotifications,
  useNotificationStats,
  useSetActiveRole,
} from '@/services/api';
import webSocketService from '@/services/WebSocketService';
import { useAuthStore, useUIStore } from '@/stores';
import {
  AdjustmentsHorizontalIcon,
  ArrowPathIcon,
  ArrowRightStartOnRectangleIcon,
  BanknotesIcon,
  Bars3Icon,
  BellIcon,
  BuildingOfficeIcon,
  CalendarDaysIcon,
  ChartBarIcon,
  ChevronDownIcon,
  ClipboardDocumentListIcon,
  CogIcon,
  CubeIcon,
  CurrencyDollarIcon,
  DocumentChartBarIcon,
  ExclamationCircleIcon,
  ExclamationTriangleIcon,
  InboxIcon,
  MagnifyingGlassIcon,
  MapIcon,
  MoonIcon,
  QueueListIcon,
  ScaleIcon,
  ServerIcon,
  ShieldCheckIcon,
  SunIcon,
  TagIcon,
  TruckIcon,
  UserGroupIcon,
  WrenchScrewdriverIcon,
} from '@heroicons/react/24/outline';
import type { Notification } from '@opsui/shared';
import { UserRole } from '@opsui/shared';
import { useQueryClient } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { UserRoleBadge } from './index';

// ============================================================================
// MOBILE MENU COMPONENT
// ============================================================================

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  navGroups: Array<{
    key: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    items: Array<{
      key: string;
      label: string;
      path: string;
      icon: React.ComponentType<{ className?: string }>;
      requiredRole?: UserRole;
    }>;
  }>;
  userName: string;
  userEmail: string;
  userRole: string;
  userId: string;
  getEffectiveRole: () => string | null;
  onLogout: () => void;
  onNavigate: (path: string, requiredRole?: UserRole) => void;
  hasRoleSwitcher: boolean;
  allRoleViews: Array<{
    key: string;
    label: string;
    path: string;
    icon: React.ComponentType<{ className?: string }>;
    role: any;
  }>;
  onRoleSwitch: (role: any, path: string) => void;
  currentPath: string;
  currentSearch: string;
  onHoverOff?: () => void;
}

function MobileMenu({
  isOpen,
  onClose,
  navGroups,
  userName,
  userEmail,
  userRole,
  userId,
  getEffectiveRole,
  onLogout,
  onNavigate,
  hasRoleSwitcher,
  allRoleViews,
  onRoleSwitch,
  currentPath,
  currentSearch,
  onHoverOff,
}: MobileMenuProps) {
  const [showRoleSwitcher, setShowRoleSwitcher] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Handle open/close animations
  useEffect(() => {
    if (isOpen) {
      // Small delay to ensure transition plays on open
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 10);
      setIsClosing(false);
      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
      setIsClosing(false);
    }
  }, [isOpen]);

  const handleMouseEnter = () => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
    setIsClosing(false);
  };

  const handleMouseLeave = () => {
    setIsClosing(true);
    closeTimeoutRef.current = setTimeout(() => {
      onHoverOff?.();
    }, 300);
  };

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
    }, 300);
  };

  useEffect(() => {
    // Prevent body scroll when menu is open
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
      }
    };
  }, []);

  const handleNavigate = (path: string, requiredRole?: UserRole) => {
    onNavigate(path, requiredRole);
    handleClose();
  };

  const handleLogout = () => {
    onLogout();
    handleClose();
  };

  const handleRoleClick = async (role: any, path: string) => {
    onRoleSwitch(role, path);
    setShowRoleSwitcher(false);
    handleClose();
  };

  if (!isOpen && !isClosing) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] transition-opacity duration-300 ${
          isClosing || !isVisible ? 'opacity-0' : 'opacity-100'
        }`}
        onClick={handleClose}
        onMouseLeave={handleMouseLeave}
        aria-hidden="true"
      />

      {/* Menu Drawer */}
      <div
        className={`fixed inset-y-0 left-0 z-[110] w-80 max-w-[85vw] transform transition-transform duration-300 ease-out ${
          isClosing || !isVisible ? '-translate-x-full' : 'translate-x-0'
        }`}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <div className="bg-white dark:glass-card h-full flex flex-col shadow-2xl border-r border-gray-200 dark:border-none">
          {/* Header */}
          <div className="border-b border-gray-200 dark:border-white/[0.08] px-6 py-4">
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                {userName}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{userEmail}</p>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
            {/* Role Switcher Section for users with multiple roles */}
            {hasRoleSwitcher && (
              <div>
                <button
                  onClick={() => setShowRoleSwitcher(!showRoleSwitcher)}
                  className="w-full flex items-center justify-between px-4 py-3 mb-4 rounded-lg dark:bg-primary-500/10 dark:border-primary-500/20 border border-primary-500/30 touch-target"
                >
                  <div className="flex items-center gap-3">
                    <CogIcon className="h-5 w-5 dark:text-primary-400 text-primary-600" />
                    <div className="text-left">
                      <p className="text-sm font-semibold dark:text-white text-gray-900">
                        Switch Role
                      </p>
                      <p className="text-xs dark:text-primary-300 text-primary-700">
                        {getEffectiveRole() || userRole}
                      </p>
                    </div>
                  </div>
                  <ChevronDownIcon
                    className={`h-5 w-5 dark:text-primary-400 text-primary-600 transition-transform duration-300 ${showRoleSwitcher ? 'rotate-180' : ''}`}
                  />
                </button>

                {showRoleSwitcher && (
                  <div className="ml-4 space-y-2 mb-4">
                    {allRoleViews.map(view => {
                      const ViewIcon = view.icon;
                      const isActive = view.role === getEffectiveRole();
                      return (
                        <button
                          key={view.key}
                          onClick={() => handleRoleClick(view.role, view.path)}
                          className={`w-full flex items-center gap-3 px-4 py-3 text-left rounded-lg transition-all duration-200 touch-target ${
                            isActive
                              ? 'dark:bg-primary-600 bg-primary-600 text-white'
                              : 'dark:bg-white/[0.05] dark:hover:bg-white/[0.08] bg-gray-100 dark:text-white text-gray-900 hover:bg-gray-200'
                          }`}
                        >
                          <ViewIcon className="h-5 w-5 flex-shrink-0" />
                          <span className="font-medium text-sm">{view.label}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {navGroups.map(group => {
              const GroupIcon = group.icon;
              return (
                <div key={group.key}>
                  <h3 className="flex items-center gap-2 text-xs font-semibold dark:text-gray-500 text-gray-600 uppercase tracking-wider mb-3 px-2">
                    <GroupIcon className="h-4 w-4" />
                    {group.label}
                  </h3>
                  <div className="space-y-1">
                    {group.items.map(item => {
                      const ItemIcon = item.icon;
                      // Check if this item is active (matches pathname, and query params if specified)
                      const itemUrl = new URL(item.path, 'http://dummy');
                      let isActive = itemUrl.pathname === currentPath;
                      // If item has query params, verify they match
                      if (isActive && itemUrl.search) {
                        const currentUrl = new URL(currentPath + currentSearch, 'http://dummy');
                        const itemParams = new URLSearchParams(itemUrl.search);
                        const currentParams = new URLSearchParams(currentUrl.search);
                        for (const [key, value] of itemParams.entries()) {
                          if (currentParams.get(key) !== value) {
                            isActive = false;
                            break;
                          }
                        }
                      }
                      return (
                        <button
                          key={item.key}
                          onClick={() => handleNavigate(item.path, item.requiredRole)}
                          className={`w-full flex items-center gap-3 px-4 py-3 text-left rounded-lg transition-all duration-200 touch-target ${
                            isActive
                              ? 'dark:text-white text-primary-700 dark:bg-primary-600/20 bg-primary-100 dark:border-primary-500/30 border-primary-300 border'
                              : 'dark:text-gray-300 text-gray-700 dark:hover:bg-white/[0.05] hover:bg-gray-100 dark:hover:text-white hover:text-gray-900 border border-transparent'
                          }`}
                        >
                          <ItemIcon
                            className={`h-5 w-5 flex-shrink-0 ${isActive ? 'dark:text-primary-400 text-primary-600' : 'dark:text-gray-500 text-gray-500'}`}
                          />
                          <span className="font-medium">{item.label}</span>
                          {isActive && (
                            <span className="ml-auto w-1.5 h-1.5 rounded-full dark:bg-primary-400 bg-primary-600 dark:shadow-[0_0_8px_rgba(96,165,250,0.6)] shadow-[0_0_8px_rgba(37,99,235,0.6)] animate-pulse" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer - Settings and Logout */}
          <div className="dark:border-t dark:border-white/[0.08] border-t border-gray-200 px-4 py-4 space-y-2">
            <div className="flex items-center justify-between px-2 py-2">
              <span className="text-sm dark:text-gray-400 text-gray-600">Current Role</span>
              <UserRoleBadge role={(getEffectiveRole() || userRole) as UserRole} userId={userId} />
            </div>
            {/* Settings button - accessible to all authenticated users */}
            <button
              onClick={() => {
                setShowRoleSwitcher(false);
                handleNavigate('/role-settings?section=role-switcher');
              }}
              className="w-full flex items-center gap-3 px-4 py-3 text-left rounded-lg dark:text-gray-400 text-gray-600 dark:hover:bg-white/[0.05] hover:bg-gray-100 dark:hover:text-white hover:text-gray-900 transition-all duration-200 touch-target"
            >
              <CogIcon className="h-5 w-5" />
              <span className="font-medium text-sm">Settings</span>
            </button>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 text-left rounded-lg dark:text-error-400 text-error-600 dark:hover:bg-error-500/10 hover:bg-error-50 dark:hover:text-error-300 hover:text-error-700 transition-all duration-200 touch-target"
            >
              <ArrowRightStartOnRectangleIcon className="h-5 w-5" />
              <span className="font-medium">Logout</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ============================================================================
// DROPDOWN COMPONENT
// ============================================================================

interface NavDropdownProps {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  items: Array<{
    key: string;
    label: string;
    path: string;
    icon: React.ComponentType<{ className?: string }>;
    requiredRole?: UserRole; // Optional role required for this item
  }>;
  currentPath: string;
  currentSearch: string;
  onNavigateWithRole?: (path: string, role?: UserRole) => void;
}

function NavDropdown({
  label,
  icon: Icon,
  items,
  currentPath,
  currentSearch,
  onNavigateWithRole,
}: NavDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const navigate = useNavigate();

  // Helper to check if a nav item is active
  // Matches if: pathname matches AND (item has no query params OR item's query params are present in current URL)
  const isItemActive = (itemPath: string): boolean => {
    const itemUrl = new URL(itemPath, 'http://dummy');
    if (itemUrl.pathname !== currentPath) return false;
    // If item has no query params, just match pathname
    if (!itemUrl.search) return true;
    // If item has query params, check if they're present in current URL
    const currentUrl = new URL(currentPath + currentSearch, 'http://dummy');
    const itemParams = new URLSearchParams(itemUrl.search);
    const currentParams = new URLSearchParams(currentUrl.search);
    for (const [key, value] of itemParams.entries()) {
      if (currentParams.get(key) !== value) return false;
    }
    return true;
  };

  const hasActiveItem = items.some(item => isItemActive(item.path));

  const handleMouseEnter = () => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
    setIsOpen(true);
  };

  const handleMouseLeave = () => {
    // Quick close when leaving to prevent overlap with other dropdowns
    closeTimeoutRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 50);
  };

  const handleItemClick = (item: { path: string; requiredRole?: UserRole }) => {
    if (onNavigateWithRole && item.requiredRole) {
      onNavigateWithRole(item.path, item.requiredRole);
    } else {
      navigate(item.path);
    }
    setIsOpen(false);
  };

  return (
    <div
      className="relative z-[9999] min-w-0 shrink"
      ref={dropdownRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1.5 px-2 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
          hasActiveItem
            ? 'dark:text-white text-primary-700 dark:bg-white/[0.08] bg-primary-100 dark:border-white/[0.15] border-primary-300 shadow-md dark:shadow-white/[0.1] shadow-primary-200'
            : 'dark:text-gray-300 text-gray-600 dark:hover:text-white hover:text-primary-700 dark:hover:bg-white/[0.05] hover:bg-primary-50 dark:border-transparent border-transparent dark:hover:border-white/[0.1] hover:border-primary-200'
        }`}
      >
        <Icon
          className={`h-4 w-4 flex-shrink-0 transition-transform duration-300 ${isOpen ? 'scale-110' : ''}`}
        />
        <span className="truncate">{label}</span>
        <ChevronDownIcon
          className={`h-3 w-3 flex-shrink-0 transition-transform duration-300 ease-out ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown with smooth animations */}
      <div
        className={`absolute top-full left-0 mt-2 w-60 overflow-hidden rounded-xl shadow-xl transition-all duration-300 ease-out origin-top ${
          isOpen
            ? 'opacity-100 scale-y-100 translate-y-0'
            : 'opacity-0 scale-y-95 -translate-y-2 pointer-events-none'
        } dark:bg-gray-800/95 bg-white/95 dark:border-white/[0.1] border-gray-200 backdrop-blur-sm`}
      >
        <div className="py-2">
          {items.map((item, index) => {
            const ItemIcon = item.icon;
            const isActive = isItemActive(item.path);
            return (
              <button
                key={item.key}
                onClick={() => handleItemClick(item)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-all duration-200 group ${
                  isActive
                    ? 'dark:text-white text-primary-700 dark:bg-white/[0.08] bg-primary-100'
                    : 'dark:text-gray-300 text-gray-700 dark:hover:text-white hover:text-primary-700 dark:hover:bg-white/[0.05] hover:bg-primary-50'
                }`}
                style={{
                  transitionDelay: isOpen ? `${index * 30}ms` : '0ms',
                  opacity: isOpen ? 1 : 0,
                  transform: isOpen ? 'translateX(0)' : 'translateX(-8px)',
                }}
              >
                <ItemIcon
                  className={`h-4 w-4 flex-shrink-0 transition-all duration-200 ${
                    isActive
                      ? 'dark:text-primary-300 text-primary-600'
                      : 'dark:text-gray-500 text-gray-500 dark:group-hover:text-primary-300 group-hover:text-primary-500'
                  }`}
                />
                <span className="flex-1 text-left">{item.label}</span>
                {isActive && (
                  <span className="w-1.5 h-1.5 rounded-full dark:bg-primary-300 bg-primary-600 dark:shadow-[0_0_8px_rgba(96,165,250,0.6)] shadow-[0_0_8px_rgba(37,99,235,0.6)] animate-pulse"></span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// NOTIFICATION PREVIEW COMPONENT
// ============================================================================

interface NotificationPreviewProps {
  limit?: number;
  onNotificationClick?: () => void;
  navigate?: (path: string) => void;
}

// Notification type to route mapping
const getNotificationRoute = (type: string, data?: Record<string, any>): string | null => {
  switch (type) {
    case 'EXCEPTION_REPORTED':
    case 'EXCEPTION_RESOLVED':
      return '/exceptions';
    case 'ORDER_CLAIMED':
    case 'ORDER_COMPLETED':
    case 'ORDER_CANCELLED':
    case 'ORDER_SHIPPED':
    case 'PICK_UPDATED':
    case 'PICK_COMPLETED':
      return data?.orderId ? `/picking/${data.orderId}` : '/order-queue';
    case 'INVENTORY_LOW':
      return '/stock-control';
    case 'QUALITY_FAILED':
    case 'QUALITY_APPROVED':
      return '/quality-control';
    case 'WAVE_CREATED':
    case 'WAVE_COMPLETED':
      return data?.waveId ? `/wave-picking` : '/wave-picking';
    case 'ZONE_ASSIGNED':
      return data?.zoneId ? `/zone-picking` : '/zone-picking';
    case 'CYCLE_COUNT_CREATED':
    case 'CYCLE_COUNT_COMPLETED':
    case 'VARIANCE_DETECTED':
      return data?.countId ? `/cycle-counting/${data.countId}` : '/cycle-counting';
    default:
      return null;
  }
};

function NotificationPreview({
  limit = 5,
  onNotificationClick,
  navigate,
}: NotificationPreviewProps) {
  const { data, isLoading } = useNotifications({ limit });
  const notifications = data?.notifications || [];
  const markAsRead = useMarkAsRead();

  if (isLoading) {
    return (
      <div className="px-5 py-8 text-center">
        <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary-500 border-t-transparent mx-auto"></div>
      </div>
    );
  }

  if (notifications.length === 0) {
    return (
      <div className="px-5 py-8 text-center">
        <BellIcon className="h-8 w-8 dark:text-gray-600 text-gray-400 mx-auto mb-2" />
        <p className="text-sm dark:text-gray-400 text-gray-600">No notifications yet</p>
      </div>
    );
  }

  const typeColors: Record<string, string> = {
    ORDER_CLAIMED: 'text-blue-400',
    ORDER_COMPLETED: 'text-green-400',
    ORDER_CANCELLED: 'text-red-400',
    ORDER_SHIPPED: 'text-purple-400',
    PICK_UPDATED: 'text-yellow-400',
    PICK_COMPLETED: 'text-green-400',
    INVENTORY_LOW: 'text-orange-400',
    EXCEPTION_REPORTED: 'text-red-400',
    EXCEPTION_RESOLVED: 'text-green-400',
    QUALITY_FAILED: 'text-red-400',
    QUALITY_APPROVED: 'text-green-400',
    WAVE_CREATED: 'text-blue-400',
    WAVE_COMPLETED: 'text-green-400',
    ZONE_ASSIGNED: 'text-purple-400',
    SYSTEM_ALERT: 'text-yellow-400',
  };

  const handleNotificationClick = async (notification: Notification) => {
    // Mark as read
    if (notification.status !== 'READ') {
      await markAsRead.mutateAsync(notification.notificationId);
    }

    // Navigate to relevant page
    const route = getNotificationRoute(notification.type, notification.data);
    if (route && navigate) {
      navigate(route);
    }

    // Close the panel
    onNotificationClick?.();
  };

  return (
    <div className="space-y-1">
      {notifications.map((notification: Notification) => (
        <div
          key={notification.notificationId}
          className={`px-5 py-3 dark:hover:bg-white/[0.05] hover:bg-primary-50 transition-all duration-200 cursor-pointer ${
            notification.status !== 'READ' ? 'dark:bg-primary-500/20 bg-primary-100' : ''
          }`}
          onClick={() => handleNotificationClick(notification)}
        >
          <div className="flex items-start gap-3">
            <BellIcon
              className={`h-4 w-4 mt-0.5 flex-shrink-0 ${typeColors[notification.type] || 'text-gray-400'}`}
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium dark:text-white text-gray-900 truncate">
                {notification.title}
              </p>
              <p className="text-xs dark:text-gray-400 text-gray-600 line-clamp-2 mt-0.5">
                {notification.message}
              </p>
              <p className="text-xs dark:text-gray-500 text-gray-500 mt-1">
                {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
              </p>
            </div>
            {notification.status !== 'READ' && (
              <span className="flex-shrink-0 w-2 h-2 rounded-full bg-primary-500 dark:bg-primary-400"></span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// THEME TOGGLE COMPONENT
// ============================================================================

function ThemeToggle() {
  const theme = useUIStore(state => state.theme);
  const setTheme = useUIStore(state => state.setTheme);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    // Immediately update DOM for instant feedback
    const html = document.documentElement;
    if (newTheme === 'dark') {
      html.classList.add('dark');
      html.classList.remove('light');
    } else {
      html.classList.remove('dark');
      html.classList.add('light');
    }
  };

  const isDark = theme !== 'light';

  return (
    <button
      onClick={toggleTheme}
      className="p-2 min-w-0 shrink dark:text-gray-400 text-gray-700 dark:hover:text-white hover:text-primary-700 dark:hover:bg-white/[0.05] hover:bg-primary-50 rounded-xl transition-all duration-200 group"
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {isDark ? (
        <SunIcon className="h-5 w-5 flex-shrink-0 group-hover:rotate-90 transition-transform duration-300" />
      ) : (
        <MoonIcon className="h-5 w-5 flex-shrink-0 group-hover:-rotate-12 transition-transform duration-300" />
      )}
    </button>
  );
}

// ============================================================================
// NOTIFICATION PANEL COMPONENT
// ============================================================================

function NotificationPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const navigate = useNavigate();
  const canSupervise = useAuthStore(state => state.canSupervise);
  const queryClient = useQueryClient();

  // Get actual notification count from the notification API
  const { data: notificationStats } = useNotificationStats();
  const unreadCount = notificationStats?.unread || 0;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Listen for real-time notifications via WebSocket
  useEffect(() => {
    const unsubscribe = webSocketService.on('notification:new', data => {
      console.log('[Header] New notification received:', data);
      // Invalidate queries to refresh notifications
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications', 'stats'] });
    });

    return () => {
      unsubscribe();
    };
  }, [queryClient]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
      }
    };
  }, []);

  // Show notification panel for all authenticated users

  const handleMouseEnter = () => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
    setIsOpen(true);
  };

  const handleMouseLeave = () => {
    // Delay before closing to allow mouse to reach the dropdown
    closeTimeoutRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 150);
  };

  return (
    <div
      className="relative z-[9999] min-w-0 shrink"
      ref={dropdownRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <button
        className={`relative p-2 min-w-0 shrink dark:text-gray-400 text-gray-700 dark:hover:text-white hover:text-primary-700 dark:hover:bg-white/[0.05] hover:bg-primary-50 rounded-xl transition-all duration-200 group hover:scale-110 ${
          isOpen ? 'dark:bg-white/[0.08] bg-primary-100' : ''
        }`}
        aria-label={`Notifications: ${unreadCount} unread`}
      >
        <BellIcon className="h-5 w-5 flex-shrink-0 transition-transform duration-200" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center px-1 text-[10px] font-bold text-white dark:bg-error-600 bg-error-500 rounded-full animate-pulse shadow-lg dark:shadow-error-500/50">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-96 dark:bg-gray-800 bg-white dark:border-white/[0.1] border-primary-200 rounded-xl shadow-xl animate-fade-in">
          {/* Header */}
          <div className="px-5 py-3.5 dark:border-b border-b dark:border-gray-700 border-primary-200 flex items-center justify-between">
            <p className="text-sm font-semibold dark:text-white text-gray-900">Notifications</p>
            <span className="text-xs dark:text-primary-300 text-primary-600">
              {unreadCount} {unreadCount === 1 ? 'unread' : 'unread'}
            </span>
          </div>

          {/* Notification Preview - show recent notifications */}
          <div className="py-2 max-h-[400px] overflow-y-auto">
            <NotificationPreview
              limit={5}
              onNotificationClick={() => setIsOpen(false)}
              navigate={navigate}
            />
          </div>

          {/* Footer */}
          <div className="dark:border-t border-t dark:border-gray-700 border-primary-200 px-5 py-3 flex gap-3">
            <button
              onClick={() => {
                navigate('/notifications');
                setIsOpen(false);
              }}
              className="flex-1 text-xs font-medium dark:text-primary-300 text-primary-600 dark:hover:text-primary-200 hover:text-primary-800 transition-colors"
            >
              View All Notifications
            </button>
            {canSupervise() && (
              <button
                onClick={() => {
                  navigate('/dashboard');
                  setIsOpen(false);
                }}
                className="flex-1 text-xs font-medium dark:text-gray-400 text-gray-600 dark:hover:text-gray-300 hover:text-primary-700 transition-colors"
              >
                Dashboard
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// ROLE VIEW DROPDOWN COMPONENT (for Admin)
// ============================================================================

interface RoleViewDropdownProps {
  userName: string;
  userEmail: string;
  availableViews?: Array<{
    key: string;
    label: string;
    path: string;
    icon: React.ComponentType<{ className?: string }>;
    role: UserRole;
  }>;
}

const STORAGE_KEY = 'admin-role-visibility';

function loadRoleVisibility(): Record<string, boolean> {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored) as Record<string, boolean>;
    }
  } catch (error) {
    console.error('Failed to load role visibility settings:', error);
  }
  // Default: all roles visible
  return {
    picking: true,
    packing: true,
    'stock-control': true,
    inwards: true,
    sales: true,
    production: true,
    maintenance: true,
    rma: true,
    accounting: true,
    admin: true,
  };
}

function RoleViewDropdown({ userName, userEmail, availableViews }: RoleViewDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const navigate = useNavigate();
  const setActiveRoleMutation = useSetActiveRole();
  const getEffectiveRole = useAuthStore(state => state.getEffectiveRole);
  const setActiveRole = useAuthStore(state => state.setActiveRole);
  const [roleVisibility, setRoleVisibility] = useState<Record<string, boolean>>(() =>
    loadRoleVisibility()
  );

  // Use provided availableViews or default to all views (for backwards compatibility)
  const dropdownRoleViews = availableViews || [
    { key: 'admin', label: 'Admin View', path: '/dashboard', icon: CogIcon, role: UserRole.ADMIN },
    {
      key: 'picking',
      label: 'Picking View',
      path: '/orders',
      icon: ClipboardDocumentListIcon,
      role: UserRole.PICKER,
    },
    {
      key: 'packing',
      label: 'Packing View',
      path: '/packing',
      icon: CubeIcon,
      role: UserRole.PACKER,
    },
    {
      key: 'stock-control',
      label: 'Stock Control View',
      path: '/stock-control',
      icon: ScaleIcon,
      role: UserRole.STOCK_CONTROLLER,
    },
    {
      key: 'inwards',
      label: 'Inwards View',
      path: '/inwards',
      icon: InboxIcon,
      role: 'INWARDS' as UserRole,
    },
    {
      key: 'sales',
      label: 'Sales View',
      path: '/sales',
      icon: CurrencyDollarIcon,
      role: 'SALES' as UserRole,
    },
    {
      key: 'production',
      label: 'Production View',
      path: '/production',
      icon: CogIcon,
      role: 'PRODUCTION' as UserRole,
    },
    {
      key: 'maintenance',
      label: 'Maintenance View',
      path: '/maintenance',
      icon: WrenchScrewdriverIcon,
      role: 'MAINTENANCE' as UserRole,
    },
    { key: 'rma', label: 'RMA View', path: '/rma', icon: ArrowPathIcon, role: 'RMA' as UserRole },
    {
      key: 'accounting',
      label: 'Accounting View',
      path: '/accounting',
      icon: CurrencyDollarIcon,
      role: 'ACCOUNTING' as UserRole,
    },
  ];

  // Reload visibility settings when dropdown opens
  useEffect(() => {
    if (isOpen) {
      setRoleVisibility(loadRoleVisibility());
    }
  }, [isOpen]);

  // Listen for storage changes (other tabs) and window focus (same tab)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY || !e.key) {
        setRoleVisibility(loadRoleVisibility());
      }
    };

    const handleFocus = () => {
      setRoleVisibility(loadRoleVisibility());
    };

    const handleRoleVisibilityChanged = () => {
      setRoleVisibility(loadRoleVisibility());
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('role-visibility-changed', handleRoleVisibilityChanged);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('role-visibility-changed', handleRoleVisibilityChanged);
    };
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Hover handlers with buffer delay to prevent flickering
  const handleMouseEnter = () => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
    setIsOpen(true);
  };

  const handleMouseLeave = () => {
    // 150ms delay before closing to allow mouse to move to dropdown content
    closeTimeoutRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 150);
  };

  // Filter role views based on visibility settings
  const roleViews = dropdownRoleViews.filter(view => roleVisibility[view.key] !== false);

  const handleRoleClick = async (role: UserRole, path: string) => {
    console.log('[RoleViewDropdown] Switching to role:', role);
    try {
      // Optimistically update local state immediately for instant UI feedback
      // This prevents the "click twice" issue where the UI shows the old role
      setActiveRole(role);

      // Call API to set active role (syncs with server)
      // When switching to ADMIN view, we still set activeRole to ADMIN
      // This makes getEffectiveRole() return ADMIN (since activeRole === user.role)
      await setActiveRoleMutation.mutateAsync(role);

      // Navigate to the role's page
      navigate(path);
      setIsOpen(false);
    } catch (error) {
      console.error('[RoleViewDropdown] Failed to switch role:', error);
    }
  };

  const handleSettingsClick = () => {
    navigate('/role-settings?section=role-switcher');
    setIsOpen(false);
  };

  return (
    <div
      className="relative z-[9999] min-w-0 shrink"
      ref={dropdownRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 dark:hover:bg-white/[0.05] hover:bg-primary-50 rounded-lg px-2 py-1.5 transition-all duration-300 group"
      >
        <div className="text-left min-w-0">
          <h2 className="text-sm font-semibold dark:text-white text-gray-800 tracking-tight dark:group-hover:text-white group-hover:text-primary-800 transition-colors truncate max-w-[100px] xl:max-w-[120px]">
            {userName}
          </h2>
          <p className="text-xs dark:text-gray-400 text-gray-500 dark:group-hover:text-gray-300 group-hover:text-primary-600 transition-colors truncate hidden xl:block max-w-[100px]">
            {userEmail}
          </p>
        </div>
        <ChevronDownIcon
          className={`h-4 w-4 flex-shrink-0 dark:text-gray-400 text-gray-500 dark:group-hover:text-primary-300 group-hover:text-primary-600 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-72 dark:bg-gray-800 bg-white dark:border-white/[0.1] border-primary-200 rounded-xl shadow-xl animate-fade-in">
          <div className="px-5 py-3.5 dark:border-b border-b dark:border-gray-700 border-primary-200">
            <p className="text-xs font-semibold dark:text-primary-300 text-primary-600 uppercase tracking-wider">
              Role Views
            </p>
          </div>
          <div className="py-2">
            {roleViews.map(view => {
              const ViewIcon = view.icon;
              const isActive = view.role === getEffectiveRole();
              return (
                <button
                  key={view.key}
                  onClick={() => handleRoleClick(view.role, view.path)}
                  disabled={setActiveRoleMutation.isPending}
                  className={`w-full flex items-center gap-3 px-5 py-3.5 text-sm font-medium transition-all duration-200 group ${
                    isActive
                      ? 'dark:text-white text-primary-700 dark:bg-white/[0.08] bg-primary-100'
                      : 'dark:text-white text-gray-700 dark:hover:text-white hover:text-primary-700 dark:hover:bg-white/[0.05] hover:bg-primary-50'
                  }`}
                >
                  <ViewIcon
                    className={`h-4 w-4 flex-shrink-0 transition-colors duration-200 ${
                      isActive
                        ? 'dark:text-primary-300 text-primary-600'
                        : 'dark:text-gray-300 text-gray-500 dark:group-hover:text-primary-300 group-hover:text-primary-500'
                    }`}
                  />
                  <div className="text-left flex-1">
                    <div className={isActive ? 'font-semibold' : 'font-normal'}>{view.label}</div>
                    {isActive && (
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs dark:text-primary-300 text-primary-600">
                          Current View
                        </span>
                        <span className="w-1.5 h-1.5 rounded-full dark:bg-primary-300 bg-primary-600 dark:shadow-[0_0_8px_rgba(96,165,250,0.6)] shadow-[0_0_8px_rgba(37,99,235,0.5)] animate-pulse"></span>
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Settings Button */}
          <div className="dark:border-t border-t dark:border-gray-700 border-primary-200">
            <button
              onClick={handleSettingsClick}
              className="w-full flex items-center gap-3 px-5 py-3.5 text-sm font-medium dark:text-white text-gray-700 dark:hover:text-white hover:text-primary-700 dark:hover:bg-white/[0.05] hover:bg-primary-50 transition-all duration-200 group"
            >
              <CogIcon className="h-4 w-4 flex-shrink-0 transition-colors duration-200 dark:text-gray-300 text-gray-500 dark:group-hover:text-primary-300 group-hover:text-primary-500" />
              <span className="flex-1 text-left">Role Settings</span>
              <span className="text-xs dark:text-gray-400 text-gray-500 dark:group-hover:text-gray-300 group-hover:text-primary-500">
                {roleViews.length} / {dropdownRoleViews.length} visible
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// COMPONENT
// ============================================================================

export function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuthStore(state => state.user);
  const logout = useAuthStore(state => state.logout);
  const logoutMutation = useLogout();
  const setActiveRoleMutation = useSetActiveRole();
  const setActiveRole = useAuthStore(state => state.setActiveRole);
  const getEffectiveRole = useAuthStore(state => state.getEffectiveRole);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Listen for role color changes
  useEffect(() => {
    const handleRoleColorChanged = () => {
      // Force re-render when role colors change
      setMobileMenuOpen(prev => prev); // Trigger re-render
    };
    window.addEventListener('role-color-changed', handleRoleColorChanged);
    return () => window.removeEventListener('role-color-changed', handleRoleColorChanged);
  }, []);

  // Fetch user's additional granted roles
  const { data: additionalRoles = [] } = useMyRoles();

  // Determine if user should see role switcher (admin OR has additional granted roles)
  const hasRoleSwitcher = user?.role === UserRole.ADMIN || additionalRoles.length > 0;

  const handleLogout = async () => {
    try {
      // Call backend logout endpoint to clear current_view and active orders
      await logoutMutation.mutateAsync();
    } catch (error) {
      // Continue with logout even if backend call fails
      console.error('Logout API call failed:', error);
    } finally {
      // Clear local auth state
      logout();
      // Navigate to login page
      navigate('/login');
    }
  };

  if (!user) {
    return null;
  }

  // Get the effective role (switched role) or fall back to base role
  const effectiveRole = getEffectiveRole() || user.role;

  // Group navigation items into dropdowns
  const getNavGroups = () => {
    const groups: Array<{
      key: string;
      label: string;
      icon: React.ComponentType<{ className?: string }>;
      items: Array<{
        key: string;
        label: string;
        path: string;
        icon: React.ComponentType<{ className?: string }>;
        requiredRole?: UserRole;
      }>;
    }> = [];

    // Operations Group - for supervisors and admins (oversight/monitoring)
    // Only show when effective role is ADMIN or SUPERVISOR
    if (effectiveRole === UserRole.SUPERVISOR || effectiveRole === UserRole.ADMIN) {
      const items: Array<{
        key: string;
        label: string;
        path: string;
        icon: React.ComponentType<{ className?: string }>;
        requiredRole?: UserRole;
      }> = [
        { key: 'dashboard', label: 'Dashboard', path: '/dashboard', icon: ChartBarIcon },
        {
          key: 'exceptions',
          label: 'Exceptions',
          path: '/exceptions',
          icon: ExclamationTriangleIcon,
        },
      ];
      groups.push({
        key: 'operations',
        label: 'Operations',
        icon: ChartBarIcon,
        items,
      });
    }

    // Picking Group - for pickers (Order Queue is their primary interface)
    if (effectiveRole === UserRole.PICKER) {
      groups.push({
        key: 'picking',
        label: 'Picking',
        icon: ClipboardDocumentListIcon,
        items: [
          {
            key: 'order-queue',
            label: 'Order Queue',
            path: '/orders',
            icon: QueueListIcon,
          },
        ],
      });
    }

    // Inventory Management Group - different items based on role
    if (
      effectiveRole === UserRole.SUPERVISOR ||
      effectiveRole === UserRole.ADMIN ||
      effectiveRole === UserRole.STOCK_CONTROLLER ||
      effectiveRole === UserRole.PICKER
    ) {
      const items: Array<{
        key: string;
        label: string;
        path: string;
        icon: React.ComponentType<{ className?: string }>;
        requiredRole?: UserRole;
      }> = [];

      // Stock Controller only sees Cycle Counting
      if (effectiveRole === UserRole.STOCK_CONTROLLER) {
        items.push({
          key: 'cycle-counting',
          label: 'Cycle Counting',
          path: '/cycle-counting',
          icon: ClipboardDocumentListIcon,
        });
      } else {
        // Admin, Supervisor, and Picker see more items
        // Order Queue - NOT for Stock Controller (handled in Picking group for Pickers)
        if (effectiveRole !== UserRole.PICKER) {
          items.push({
            key: 'order-queue',
            label: 'Order Queue',
            path: '/orders',
            icon: QueueListIcon,
            requiredRole: UserRole.PICKER, // Switch to picker role when admin clicks
          });
        }

        // Stock Control - only for supervisors and pickers (NOT admin - they use role view)
        if (effectiveRole !== UserRole.ADMIN) {
          items.push({
            key: 'stock-control',
            label: 'Stock Control',
            path: '/stock-control',
            icon: ScaleIcon,
          });
        }

        // Quick Adjust - only for supervisors and admins
        if (effectiveRole === UserRole.SUPERVISOR || effectiveRole === UserRole.ADMIN) {
          items.push({
            key: 'quick-adjust',
            label: 'Quick Adjust',
            path: '/stock-control?tab=quick-actions',
            icon: AdjustmentsHorizontalIcon,
          });
        }

        // Cycle Counting - available to admins, supervisors, and pickers
        items.push({
          key: 'cycle-counting',
          label: 'Cycle Counting',
          path: '/cycle-counting',
          icon: ClipboardDocumentListIcon,
        });

        // Bin Locations, Location Capacity, Bin Utilization, Quality Control - only for supervisors and admins
        if (effectiveRole === UserRole.SUPERVISOR || effectiveRole === UserRole.ADMIN) {
          items.push({
            key: 'bin-locations',
            label: 'Bin Locations',
            path: '/bin-locations',
            icon: CubeIcon,
          });
          items.push({
            key: 'location-capacity',
            label: 'Location Capacity',
            path: '/location-capacity',
            icon: ScaleIcon,
          });
          items.push({
            key: 'bin-utilization',
            label: 'Bin Utilization',
            path: '/stock-control?tab=analytics',
            icon: ChartBarIcon,
          });
          items.push({
            key: 'quality-control',
            label: 'Quality Control',
            path: '/quality-control',
            icon: ShieldCheckIcon,
          });
        }
      }

      if (items.length > 0) {
        groups.push({
          key: 'inventory',
          label: 'Inventory',
          icon: CubeIcon,
          items,
        });
      }
    }

    // Warehouse Operations Group - for supervisors, admins, and pickers
    // Shows advanced picking and slotting features
    if (
      effectiveRole === UserRole.SUPERVISOR ||
      effectiveRole === UserRole.ADMIN ||
      effectiveRole === UserRole.PICKER
    ) {
      const items: Array<{
        key: string;
        label: string;
        path: string;
        icon: React.ComponentType<{ className?: string }>;
        requiredRole?: UserRole;
      }> = [];

      // Product Search - available to pickers, supervisors, admins
      items.push({
        key: 'search',
        label: 'Product Search',
        path: '/search',
        icon: MagnifyingGlassIcon,
      });

      // Wave Picking and Zone Picking - supervisors and admins only
      if (effectiveRole === UserRole.SUPERVISOR || effectiveRole === UserRole.ADMIN) {
        items.push(
          {
            key: 'waves',
            label: 'Wave Picking',
            path: '/waves',
            icon: QueueListIcon,
          },
          {
            key: 'zones',
            label: 'Zone Picking',
            path: '/zones',
            icon: CubeIcon,
          }
        );
      }

      // Slotting - supervisors and admins only
      if (effectiveRole === UserRole.SUPERVISOR || effectiveRole === UserRole.ADMIN) {
        items.push({
          key: 'slotting',
          label: 'Slotting',
          path: '/slotting',
          icon: TagIcon,
        });
      }

      // Route Optimization - available to pickers, supervisors, and admins
      items.push({
        key: 'route-optimization',
        label: 'Route Optimization',
        path: '/route-optimization',
        icon: MapIcon,
      });

      // Shipped Orders - available to pickers, supervisors, and admins
      items.push({
        key: 'shipped-orders',
        label: 'Shipped Orders',
        path: '/shipped-orders',
        icon: TruckIcon,
      });

      if (items.length > 0) {
        groups.push({
          key: 'warehouse-ops',
          label: 'Warehouse',
          icon: BuildingOfficeIcon,
          items,
        });
      }
    }

    // Packer Operations Group - for packers
    if (effectiveRole === UserRole.PACKER) {
      groups.push({
        key: 'packing-ops',
        label: 'Packing',
        icon: CubeIcon,
        items: [
          {
            key: 'packing',
            label: 'Packing Queue',
            path: '/packing',
            icon: CubeIcon,
            requiredRole: UserRole.PACKER,
          },
          {
            key: 'shipped-orders',
            label: 'Shipped Orders',
            path: '/shipped-orders',
            icon: TruckIcon,
          },
          { key: 'search', label: 'Product Search', path: '/search', icon: MagnifyingGlassIcon },
        ],
      });
    }

    // Inwards Operations Group - for inwards/receiving
    if (effectiveRole === ('INWARDS' as UserRole)) {
      groups.push({
        key: 'inwards-ops',
        label: 'Receiving',
        icon: InboxIcon,
        items: [
          { key: 'inwards', label: 'Inwards/Receiving', path: '/inwards', icon: InboxIcon },
          { key: 'search', label: 'Product Search', path: '/search', icon: MagnifyingGlassIcon },
          { key: 'stock-control', label: 'Stock Control', path: '/stock-control', icon: ScaleIcon },
        ],
      });
    }

    // Sales Operations Group - for sales
    if (effectiveRole === ('SALES' as UserRole)) {
      groups.push({
        key: 'sales-ops',
        label: 'Sales',
        icon: CurrencyDollarIcon,
        items: [
          { key: 'sales', label: 'Sales Dashboard', path: '/sales', icon: CurrencyDollarIcon },
          { key: 'search', label: 'Product Search', path: '/search', icon: MagnifyingGlassIcon },
          {
            key: 'shipped-orders',
            label: 'Shipped Orders',
            path: '/shipped-orders',
            icon: TruckIcon,
          },
        ],
      });
    }

    // Production Operations Group - for production
    if (effectiveRole === ('PRODUCTION' as UserRole)) {
      groups.push({
        key: 'production-ops',
        label: 'Production',
        icon: CogIcon,
        items: [
          {
            key: 'production',
            label: 'Production Dashboard',
            path: '/production',
            icon: ChartBarIcon,
          },
          { key: 'search', label: 'Product Search', path: '/search', icon: MagnifyingGlassIcon },
          { key: 'stock-control', label: 'Stock Control', path: '/stock-control', icon: ScaleIcon },
        ],
      });
    }

    // Maintenance Operations Group - for maintenance
    if (effectiveRole === ('MAINTENANCE' as UserRole)) {
      groups.push({
        key: 'maintenance-ops',
        label: 'Maintenance',
        icon: WrenchScrewdriverIcon,
        items: [
          {
            key: 'maintenance',
            label: 'Maintenance',
            path: '/maintenance',
            icon: WrenchScrewdriverIcon,
          },
          { key: 'search', label: 'Product Search', path: '/search', icon: MagnifyingGlassIcon },
          { key: 'bin-locations', label: 'Bin Locations', path: '/bin-locations', icon: CubeIcon },
        ],
      });
    }

    // RMA Operations Group - for RMA/returns
    if (effectiveRole === ('RMA' as UserRole)) {
      groups.push({
        key: 'rma-ops',
        label: 'Returns',
        icon: ArrowPathIcon,
        items: [
          { key: 'rma', label: 'RMA/Returns', path: '/rma', icon: ArrowPathIcon },
          { key: 'search', label: 'Product Search', path: '/search', icon: MagnifyingGlassIcon },
          {
            key: 'shipped-orders',
            label: 'Shipped Orders',
            path: '/shipped-orders',
            icon: TruckIcon,
          },
          { key: 'stock-control', label: 'Stock Control', path: '/stock-control', icon: ScaleIcon },
        ],
      });
    }

    // Accounting Operations Group - for Accounting
    // Note: Accounting pages are now in the Admin/Supervisor groups below

    // Accounting Group - for admins and accounting role
    // Core accounting functions (not reports)
    if (effectiveRole === UserRole.ADMIN || effectiveRole === ('ACCOUNTING' as UserRole)) {
      groups.push({
        key: 'accounting',
        label: 'Accounting',
        icon: CurrencyDollarIcon,
        items: [
          {
            key: 'accounting',
            label: 'Accounting Dashboard',
            path: '/accounting',
            icon: ChartBarIcon,
          },
          {
            key: 'chart-of-accounts',
            label: 'Chart of Accounts',
            path: '/accounting/chart-of-accounts',
            icon: QueueListIcon,
          },
          {
            key: 'journal-entries',
            label: 'Journal Entries',
            path: '/accounting/journal-entries',
            icon: ClipboardDocumentListIcon,
          },
        ],
      });
    }

    // Reports Group - for supervisors, admins, and accounting role
    // All accounting reports and general reports
    if (
      effectiveRole === UserRole.ADMIN ||
      effectiveRole === UserRole.SUPERVISOR ||
      effectiveRole === ('ACCOUNTING' as UserRole)
    ) {
      groups.push({
        key: 'reports',
        label: 'Reports',
        icon: DocumentChartBarIcon,
        items: [
          { key: 'reports', label: 'All Reports', path: '/reports', icon: DocumentChartBarIcon },
          {
            key: 'trial-balance',
            label: 'Trial Balance',
            path: '/accounting/trial-balance',
            icon: ScaleIcon,
          },
          {
            key: 'balance-sheet',
            label: 'Balance Sheet',
            path: '/accounting/balance-sheet',
            icon: BuildingOfficeIcon,
          },
          {
            key: 'cash-flow',
            label: 'Cash Flow Statement',
            path: '/accounting/cash-flow',
            icon: ArrowPathIcon,
          },
          {
            key: 'ar-aging',
            label: 'AR Aging Report',
            path: '/accounting/ar-aging',
            icon: TagIcon,
          },
          {
            key: 'ap-aging',
            label: 'AP Aging Report',
            path: '/accounting/ap-aging',
            icon: ExclamationCircleIcon,
          },
          {
            key: 'bank-reconciliation',
            label: 'Bank Reconciliation',
            path: '/accounting/bank-reconciliation',
            icon: AdjustmentsHorizontalIcon,
          },
          {
            key: 'fixed-assets',
            label: 'Fixed Assets',
            path: '/accounting/fixed-assets',
            icon: BuildingOfficeIcon,
          },
          {
            key: 'budgeting',
            label: 'Budgeting & Forecasting',
            path: '/accounting/budgeting',
            icon: DocumentChartBarIcon,
          },
        ],
      });
    }

    // Admin Tools Group - for admins, HR Manager, HR Admin
    // HR and Payroll items are included here since they're admin functions
    if (
      effectiveRole === UserRole.ADMIN ||
      effectiveRole === ('HR_MANAGER' as UserRole) ||
      effectiveRole === ('HR_ADMIN' as UserRole)
    ) {
      const adminItems = [
        { key: 'user-roles', label: 'User Roles', path: '/user-roles', icon: UserGroupIcon },
        {
          key: 'business-rules',
          label: 'Business Rules',
          path: '/business-rules',
          icon: CogIcon,
        },
        { key: 'integrations', label: 'Integrations', path: '/integrations', icon: ServerIcon },
      ];

      // Add HR & Payroll items for HR roles and Admin
      if (
        effectiveRole === UserRole.ADMIN ||
        effectiveRole === ('HR_MANAGER' as UserRole) ||
        effectiveRole === ('HR_ADMIN' as UserRole)
      ) {
        adminItems.push(
          { key: 'employees', label: 'Employees', path: '/hr/employees', icon: UserGroupIcon },
          {
            key: 'timesheets',
            label: 'Timesheets',
            path: '/hr/timesheets',
            icon: ClipboardDocumentListIcon,
          },
          { key: 'payroll', label: 'Payroll Dashboard', path: '/hr/payroll', icon: BanknotesIcon },
          {
            key: 'payroll-process',
            label: 'Process Payroll',
            path: '/hr/payroll/process',
            icon: AdjustmentsHorizontalIcon,
          },
          {
            key: 'payroll-runs',
            label: 'Payroll History',
            path: '/hr/payroll/runs',
            icon: DocumentChartBarIcon,
          },
          { key: 'leave', label: 'Leave Management', path: '/hr/leave', icon: CalendarDaysIcon },
          {
            key: 'hr-settings',
            label: 'HR Settings',
            path: '/hr/settings',
            icon: CogIcon,
          }
        );
      }

      groups.push({
        key: 'admin',
        label: 'Admin',
        icon: CogIcon,
        items: adminItems,
      });
    }

    // Production Management - also available to ADMIN and SUPERVISOR
    if (effectiveRole === UserRole.ADMIN || effectiveRole === UserRole.SUPERVISOR) {
      groups.push({
        key: 'production-management',
        label: 'Production',
        icon: CogIcon,
        items: [
          {
            key: 'production',
            label: 'Production Dashboard',
            path: '/production',
            icon: ChartBarIcon,
          },
        ],
      });
    }

    return groups;
  };

  const navGroups = getNavGroups();

  // Define all available role views with their paths and icons
  const allAvailableRoleViews = [
    { key: 'admin', label: 'Admin View', path: '/dashboard', icon: CogIcon, role: UserRole.ADMIN },
    {
      key: 'picking',
      label: 'Picking View',
      path: '/orders',
      icon: ClipboardDocumentListIcon,
      role: UserRole.PICKER,
    },
    {
      key: 'packing',
      label: 'Packing View',
      path: '/packing',
      icon: CubeIcon,
      role: UserRole.PACKER,
    },
    {
      key: 'stock-control',
      label: 'Stock Control View',
      path: '/stock-control',
      icon: ScaleIcon,
      role: UserRole.STOCK_CONTROLLER,
    },
    {
      key: 'inwards',
      label: 'Inwards View',
      path: '/inwards',
      icon: InboxIcon,
      role: 'INWARDS' as UserRole,
    },
    {
      key: 'sales',
      label: 'Sales View',
      path: '/sales',
      icon: CurrencyDollarIcon,
      role: 'SALES' as UserRole,
    },
    {
      key: 'production',
      label: 'Production View',
      path: '/production',
      icon: CogIcon,
      role: 'PRODUCTION' as UserRole,
    },
    {
      key: 'maintenance',
      label: 'Maintenance View',
      path: '/maintenance',
      icon: WrenchScrewdriverIcon,
      role: 'MAINTENANCE' as UserRole,
    },
    { key: 'rma', label: 'RMA View', path: '/rma', icon: ArrowPathIcon, role: 'RMA' as UserRole },
    {
      key: 'accounting',
      label: 'Accounting View',
      path: '/accounting',
      icon: CurrencyDollarIcon,
      role: 'ACCOUNTING' as UserRole,
    },
  ];

  // Filter role views to only include user's base role + granted additional roles
  // Admin users can see all role views
  const availableRoles =
    user?.role === UserRole.ADMIN
      ? Object.values(UserRole) // Admins see all roles
      : ([user?.role, ...(additionalRoles || [])].filter(Boolean) as UserRole[]);

  const allRoleViews = allAvailableRoleViews.filter(view => availableRoles.includes(view.role));

  const handleRoleSwitch = async (role: UserRole, path: string) => {
    console.log('[Header] Switching to role:', role, 'path:', path);
    try {
      // Optimistically update local state immediately for instant UI feedback
      setActiveRole(role);

      await setActiveRoleMutation.mutateAsync(role);
      console.log('[Header] Role set successfully, navigating to:', path);
      navigate(path);
      console.log('[Header] Navigation called');
    } catch (error) {
      console.error('[Header] Failed to switch role:', error);
    }
  };

  // Handle navigation with optional role switching for admin users
  const handleNavigateWithRole = async (path: string, requiredRole?: UserRole) => {
    // If user is admin and a specific role is required, switch to that role first
    if (requiredRole && user?.role === UserRole.ADMIN && requiredRole !== getEffectiveRole()) {
      console.log('[Header] Admin navigating to role-specific page, switching to:', requiredRole);
      await handleRoleSwitch(requiredRole, path);
    } else {
      navigate(path);
    }
  };

  return (
    <>
      <header className="relative z-50">
        <div className="w-full">
          <div className="relative flex items-center h-14 px-4">
            {/* Left side - Menu button */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              onMouseEnter={() => setMobileMenuOpen(true)}
              className="p-2 dark:text-gray-300 text-gray-700 dark:hover:text-white hover:text-gray-900 touch-target rounded-lg dark:hover:bg-white/[0.05] hover:bg-gray-100 transition-colors"
              aria-label="Open menu"
            >
              <Bars3Icon className="h-6 w-6" />
            </button>

            {/* Center - Actions Toolbar (absolutely positioned for true center) */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-1 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-1">
              {/* Theme Toggle */}
              <ThemeToggle />

              {/* Notification Panel */}
              <NotificationPanel />

              {/* Divider */}
              <div className="w-px h-5 bg-gray-200 dark:bg-gray-700 mx-1" />

              {/* Settings button */}
              <button
                onClick={() => navigate('/role-settings?section=role-switcher')}
                className="p-2 dark:text-gray-400 text-gray-600 dark:hover:text-white hover:text-primary-700 dark:hover:bg-white/[0.05] hover:bg-primary-50 rounded-lg transition-colors"
                title="Settings"
                aria-label="Settings"
              >
                <CogIcon className="h-5 w-5" />
              </button>

              {/* Logout button */}
              <button
                onClick={handleLogout}
                disabled={logoutMutation.isPending}
                className="p-2 dark:text-gray-400 text-gray-600 dark:hover:text-error-400 hover:text-error-600 dark:hover:bg-error-500/10 hover:bg-error-50 rounded-lg transition-colors disabled:opacity-50"
                title={logoutMutation.isPending ? 'Logging out...' : 'Logout'}
                aria-label={logoutMutation.isPending ? 'Logging out...' : 'Logout'}
              >
                <ArrowRightStartOnRectangleIcon className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Menu */}
      <MobileMenu
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        navGroups={navGroups}
        userName={user.name}
        userEmail={user.email}
        userRole={user.role}
        userId={user.userId}
        getEffectiveRole={getEffectiveRole}
        onLogout={handleLogout}
        onNavigate={handleNavigateWithRole}
        hasRoleSwitcher={hasRoleSwitcher}
        allRoleViews={allRoleViews}
        onRoleSwitch={handleRoleSwitch}
        currentPath={location.pathname}
        currentSearch={location.search}
        onHoverOff={() => setMobileMenuOpen(false)}
      />
    </>
  );
}
