/**
 * BottomNavigation - Fixed bottom navigation bar for mobile
 *
 * Features:
 * - Role-based navigation items
 * - Safe area inset support for notched devices
 * - Haptic feedback on tap
 * - Badge support for notifications
 * - Accessible with proper ARIA attributes
 */

import React from 'react';
import { cn } from '@/lib/utils';

export interface NavItem {
  /** Unique identifier */
  id: string;
  /** Display label */
  label: string;
  /** Icon component */
  icon: React.ReactNode;
  /** Navigation path */
  path: string;
  /** Badge count (optional) */
  badge?: number;
  /** Whether this item is disabled */
  disabled?: boolean;
}

export interface BottomNavigationProps {
  /** Navigation items to display */
  items: NavItem[];
  /** Currently active item ID */
  activeId?: string;
  /** Callback when item is clicked */
  onItemClick: (item: NavItem) => void;
  /** User role for role-based visibility */
  userRole?: string;
  /** Additional CSS classes */
  className?: string;
  /** Whether to show labels */
  showLabels?: boolean;
  /** Enable haptic feedback */
  hapticFeedback?: boolean;
}

export function BottomNavigation({
  items,
  activeId,
  onItemClick,
  className,
  showLabels = true,
  hapticFeedback = true,
}: BottomNavigationProps) {
  const handleItemClick = (item: NavItem) => {
    if (item.disabled) return;

    // Haptic feedback
    if (hapticFeedback && 'vibrate' in navigator) {
      navigator.vibrate(10);
    }

    onItemClick(item);
  };

  const handleKeyDown = (e: React.KeyboardEvent, item: NavItem) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleItemClick(item);
    }
  };

  return (
    <nav
      role="navigation"
      aria-label="Main navigation"
      className={cn(
        'fixed bottom-0 left-0 right-0 z-50',
        'bg-white dark:bg-dark-100',
        'border-t border-gray-200 dark:border-white/10',
        'flex justify-around items-stretch',
        // Safe area for notched devices
        'pb-[env(safe-area-inset-bottom,0px)]',
        // Height
        'h-16',
        // Only show on mobile
        'lg:hidden',
        className
      )}
    >
      {items.map((item) => {
        const isActive = activeId === item.id;
        const showBadge = item.badge && item.badge > 0;

        return (
          <button
            key={item.id}
            type="button"
            onClick={() => handleItemClick(item)}
            onKeyDown={(e) => handleKeyDown(e, item)}
            disabled={item.disabled}
            aria-current={isActive ? 'page' : undefined}
            aria-label={cn(
              item.label,
              showBadge && `(${item.badge} notifications)`,
              item.disabled && '(disabled)'
            ).trim()}
            className={cn(
              'flex-1 flex flex-col items-center justify-center',
              'py-2 px-1',
              'transition-colors duration-150',
              // Touch-friendly
              'min-h-touch',
              // Active state
              isActive
                ? 'text-primary-600 dark:text-primary-400'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300',
              // Disabled state
              item.disabled && 'opacity-50 cursor-not-allowed',
              // Focus state
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset'
            )}
          >
            {/* Icon container with badge */}
            <div className="relative">
              <div
                className={cn(
                  'w-6 h-6',
                  // Active indicator
                  isActive && 'scale-110 transition-transform'
                )}
              >
                {item.icon}
              </div>

              {/* Badge */}
              {showBadge && (
                <span
                  className={cn(
                    'absolute -top-1 -right-1',
                    'min-w-[18px] h-[18px] px-1',
                    'flex items-center justify-center',
                    'bg-error-500 text-white',
                    'text-xs font-medium',
                    'rounded-full',
                    'ring-2 ring-white dark:ring-dark-100'
                  )}
                  aria-hidden="true"
                >
                  {item.badge! > 99 ? '99+' : item.badge}
                </span>
              )}
            </div>

            {/* Label */}
            {showLabels && (
              <span
                className={cn(
                  'mt-1 text-xs font-medium',
                  'truncate max-w-full',
                  // Slightly bolder when active
                  isActive && 'font-semibold'
                )}
              >
                {item.label}
              </span>
            )}

            {/* Active indicator dot */}
            {isActive && (
              <span
                className="absolute bottom-1 w-1 h-1 rounded-full bg-primary-600 dark:bg-primary-400"
                aria-hidden="true"
              />
            )}
          </button>
        );
      })}
    </nav>
  );
}

// Default navigation items by role
export const DEFAULT_NAV_ITEMS: Record<string, NavItem[]> = {
  picker: [
    { id: 'orders', label: 'Orders', icon: '📋', path: '/orders' },
    { id: 'waves', label: 'Waves', icon: '🌊', path: '/waves' },
    { id: 'scan', label: 'Scan', icon: '📷', path: '/scan' },
    { id: 'stock', label: 'Stock', icon: '📦', path: '/stock-control' },
    { id: 'more', label: 'More', icon: '☰', path: '/more' },
  ],
  packer: [
    { id: 'packing', label: 'Packing', icon: '📦', path: '/packing' },
    { id: 'shipped', label: 'Shipped', icon: '🚚', path: '/shipped-orders' },
    { id: 'scan', label: 'Scan', icon: '📷', path: '/scan' },
    { id: 'stock', label: 'Stock', icon: '📦', path: '/stock-control' },
    { id: 'more', label: 'More', icon: '☰', path: '/more' },
  ],
  supervisor: [
    { id: 'dashboard', label: 'Dashboard', icon: '📊', path: '/dashboard' },
    { id: 'orders', label: 'Orders', icon: '📋', path: '/orders' },
    { id: 'packing', label: 'Packing', icon: '📦', path: '/packing' },
    { id: 'reports', label: 'Reports', icon: '📈', path: '/reports' },
    { id: 'more', label: 'More', icon: '☰', path: '/more' },
  ],
  admin: [
    { id: 'dashboard', label: 'Dashboard', icon: '📊', path: '/dashboard' },
    { id: 'users', label: 'Users', icon: '👥', path: '/user-roles' },
    { id: 'settings', label: 'Settings', icon: '⚙️', path: '/settings' },
    { id: 'reports', label: 'Reports', icon: '📈', path: '/reports' },
    { id: 'more', label: 'More', icon: '☰', path: '/more' },
  ],
};

export default BottomNavigation;
