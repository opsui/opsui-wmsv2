/**
 * BottomNavigation - Enhanced bottom navigation bar for mobile
 *
 * Features:
 * - Role-based navigation items
 * - Safe area inset support for notched devices
 * - Haptic feedback on tap
 * - Badge support for notifications
 * - Accessible with proper ARIA attributes
 * - Distinctive design following frontend skill guidelines
 */

import { cn } from '@/lib/utils';
import {
  Bars3Icon,
  ChartBarIcon,
  ClipboardDocumentListIcon,
  Cog6ToothIcon,
  CubeIcon,
  HomeIcon,
  MagnifyingGlassIcon,
  ShoppingBagIcon,
  SparklesIcon,
  UsersIcon,
} from '@heroicons/react/24/outline';
import React, { useEffect, useRef, useState } from 'react';

// Custom CSS animations for bottom navigation
const BOTTOM_NAV_STYLES = `
  @keyframes navItemPulse {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.1); }
  }
  
  @keyframes navRipple {
    0% { transform: scale(0.8); opacity: 1; }
    100% { transform: scale(2.5); opacity: 0; }
  }
  
  @keyframes badgePop {
    0% { transform: scale(0.5); opacity: 0; }
    50% { transform: scale(1.2); }
    100% { transform: scale(1); opacity: 1; }
  }
  
  @keyframes iconFloat {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-2px); }
  }
  
  @keyframes activeGlow {
    0%, 100% { box-shadow: 0 0 8px rgba(59, 130, 246, 0.4); }
    50% { box-shadow: 0 0 16px rgba(59, 130, 246, 0.6); }
  }
  
  .nav-item-active .nav-icon-wrapper {
    animation: iconFloat 2s ease-in-out infinite;
  }
  
  .nav-badge-pop {
    animation: badgePop 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
  }
  
  .nav-active-glow {
    animation: activeGlow 2s ease-in-out infinite;
  }
  
  .nav-ripple {
    animation: navRipple 0.6s ease-out forwards;
  }
`;

// Inject styles once
if (typeof document !== 'undefined' && !document.getElementById('bottom-nav-styles')) {
  const styleSheet = document.createElement('style');
  styleSheet.id = 'bottom-nav-styles';
  styleSheet.textContent = BOTTOM_NAV_STYLES;
  document.head.appendChild(styleSheet);
}

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
  /** Color theme for this item */
  theme?: 'blue' | 'emerald' | 'violet' | 'amber' | 'rose';
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

// Theme color configurations
const NAV_THEMES: Record<string, { gradient: string; shadow: string; indicator: string }> = {
  blue: {
    gradient: 'from-blue-500 to-cyan-500',
    shadow: 'shadow-blue-500/30',
    indicator: 'bg-gradient-to-r from-blue-400 to-cyan-400',
  },
  emerald: {
    gradient: 'from-emerald-500 to-green-500',
    shadow: 'shadow-emerald-500/30',
    indicator: 'bg-gradient-to-r from-emerald-400 to-green-400',
  },
  violet: {
    gradient: 'from-violet-500 to-purple-500',
    shadow: 'shadow-violet-500/30',
    indicator: 'bg-gradient-to-r from-violet-400 to-purple-400',
  },
  amber: {
    gradient: 'from-amber-500 to-yellow-500',
    shadow: 'shadow-amber-500/30',
    indicator: 'bg-gradient-to-r from-amber-400 to-yellow-400',
  },
  rose: {
    gradient: 'from-rose-500 to-pink-500',
    shadow: 'shadow-rose-500/30',
    indicator: 'bg-gradient-to-r from-rose-400 to-pink-400',
  },
};

export function BottomNavigation({
  items,
  activeId,
  onItemClick,
  className,
  showLabels = true,
  hapticFeedback = true,
}: BottomNavigationProps) {
  const [rippleEffect, setRippleEffect] = useState<{ id: string; x: number; y: number } | null>(
    null
  );
  const itemRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const handleItemClick = (item: NavItem, e: React.MouseEvent) => {
    if (item.disabled) return;

    // Create ripple effect at click position
    const rect = itemRefs.current[item.id]?.getBoundingClientRect();
    if (rect) {
      setRippleEffect({
        id: item.id,
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
      setTimeout(() => setRippleEffect(null), 600);
    }

    // Haptic feedback
    if (hapticFeedback && 'vibrate' in navigator) {
      navigator.vibrate(10);
    }

    onItemClick(item);
  };

  const handleKeyDown = (e: React.KeyboardEvent, item: NavItem) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onItemClick(item);
    }
  };

  return (
    <nav
      role="navigation"
      aria-label="Main navigation"
      className={cn(
        'fixed bottom-0 left-0 right-0 z-50',
        // Enhanced background with gradient and glass effect
        'bg-gradient-to-t from-slate-900 via-slate-900/98 to-slate-900/95',
        'dark:from-dark-100 dark:via-dark-100/98 dark:to-dark-100/95',
        'backdrop-blur-xl',
        // Top border with gradient
        'border-t border-white/10',
        // Subtle top highlight
        'before:absolute before:top-0 before:left-0 before:right-0 before:h-px',
        'before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent',
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
      {items.map((item, index) => {
        const isActive = activeId === item.id;
        const showBadge = item.badge && item.badge > 0;
        const theme = NAV_THEMES[item.theme || 'blue'];

        return (
          <button
            key={item.id}
            ref={el => {
              itemRefs.current[item.id] = el;
            }}
            type="button"
            onClick={e => handleItemClick(item, e)}
            onKeyDown={e => handleKeyDown(e, item)}
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
              'transition-all duration-300',
              // Touch-friendly
              'min-h-touch',
              // Positioning context for indicator dot
              'relative',
              // Active state with enhanced styling
              isActive ? 'nav-item-active' : '',
              // Disabled state
              item.disabled && 'opacity-50 cursor-not-allowed',
              // Focus state
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset'
            )}
            style={{
              animationDelay: `${index * 50}ms`,
            }}
          >
            {/* Ripple effect */}
            {rippleEffect?.id === item.id && (
              <span
                className="nav-ripple absolute w-8 h-8 rounded-full bg-white/30 pointer-events-none"
                style={{
                  left: rippleEffect.x - 16,
                  top: rippleEffect.y - 16,
                }}
              />
            )}

            {/* Icon container with badge */}
            <div className="relative flex items-center justify-center nav-icon-wrapper">
              {/* Background glow for active state */}
              {isActive && (
                <div
                  className={cn(
                    'absolute w-12 h-12 rounded-2xl bg-gradient-to-br opacity-20 blur-xl',
                    theme.gradient
                  )}
                />
              )}

              {/* Icon wrapper */}
              <div
                className={cn(
                  'relative flex items-center justify-center transition-all duration-300',
                  isActive ? 'scale-110 -translate-y-1' : 'scale-100 group-hover:scale-105'
                )}
              >
                {/* Active background pill */}
                {isActive && (
                  <div
                    className={cn(
                      'absolute w-10 h-10 rounded-xl bg-gradient-to-br nav-active-glow',
                      theme.gradient,
                      theme.shadow,
                      'shadow-lg'
                    )}
                  />
                )}

                {/* Icon */}
                <div
                  className={cn(
                    'relative z-10 transition-colors duration-300',
                    isActive
                      ? 'text-white'
                      : 'text-slate-400 dark:text-gray-500 hover:text-slate-200 dark:hover:text-gray-300'
                  )}
                >
                  {item.icon}
                </div>
              </div>

              {/* Badge */}
              {showBadge && (
                <span
                  className={cn(
                    'absolute -top-1.5 -right-2.5',
                    'min-w-[20px] h-5 px-1.5',
                    'flex items-center justify-center',
                    'bg-gradient-to-r from-red-500 to-orange-500 text-white',
                    'text-xs font-bold',
                    'rounded-full',
                    'ring-2 ring-slate-900 dark:ring-dark-100',
                    'shadow-lg shadow-red-500/30',
                    'nav-badge-pop'
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
                  'mt-1.5 text-[10px] font-medium tracking-wide transition-all duration-300',
                  'truncate max-w-full',
                  isActive ? 'text-white font-semibold' : 'text-slate-500 dark:text-gray-500'
                )}
                style={{ fontFamily: "'Inter', sans-serif" }}
              >
                {item.label}
              </span>
            )}

            {/* Active indicator bar */}
            {isActive && (
              <span
                className={cn(
                  'absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full',
                  theme.indicator,
                  'shadow-lg'
                )}
                aria-hidden="true"
              />
            )}
          </button>
        );
      })}

      {/* Ambient light effect on edges */}
      <div className="absolute bottom-0 left-4 w-16 h-16 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />
      <div className="absolute bottom-0 right-4 w-16 h-16 bg-purple-500/10 rounded-full blur-2xl pointer-events-none" />
    </nav>
  );
}

// Default navigation items by role using Heroicons
// Each role has a distinct color theme
export const DEFAULT_NAV_ITEMS: Record<string, NavItem[]> = {
  'stock-controller': [
    {
      id: 'stock-control',
      label: 'Stock',
      icon: <CubeIcon className="w-6 h-6" />,
      path: '/stock-control',
      theme: 'violet',
    },
    {
      id: 'cycle-counting',
      label: 'Counts',
      icon: <ClipboardDocumentListIcon className="w-6 h-6" />,
      path: '/cycle-counting',
      theme: 'blue',
    },
    {
      id: 'slotting',
      label: 'Slotting',
      icon: <SparklesIcon className="w-6 h-6" />,
      path: '/slotting',
      theme: 'emerald',
    },
    {
      id: 'route-optimization',
      label: 'Routes',
      icon: <ChartBarIcon className="w-6 h-6" />,
      path: '/route-optimization',
      theme: 'amber',
    },
    {
      id: 'more',
      label: 'More',
      icon: <Bars3Icon className="w-6 h-6" />,
      path: '/more',
      theme: 'rose',
    },
  ],
  picker: [
    {
      id: 'orders',
      label: 'Orders',
      icon: <ClipboardDocumentListIcon className="w-6 h-6" />,
      path: '/orders',
      theme: 'blue',
    },
    {
      id: 'scan',
      label: 'Scan',
      icon: <MagnifyingGlassIcon className="w-6 h-6" />,
      path: '/scan',
      theme: 'emerald',
    },
    {
      id: 'stock',
      label: 'Stock',
      icon: <CubeIcon className="w-6 h-6" />,
      path: '/stock-control',
      theme: 'violet',
    },
    {
      id: 'more',
      label: 'More',
      icon: <Bars3Icon className="w-6 h-6" />,
      path: '/more',
      theme: 'amber',
    },
  ],
  packer: [
    {
      id: 'packing',
      label: 'Packing',
      icon: <CubeIcon className="w-6 h-6" />,
      path: '/packing',
      theme: 'blue',
    },
    {
      id: 'shipped',
      label: 'Shipped',
      icon: <ShoppingBagIcon className="w-6 h-6" />,
      path: '/shipped-orders',
      theme: 'emerald',
    },
    {
      id: 'scan',
      label: 'Scan',
      icon: <MagnifyingGlassIcon className="w-6 h-6" />,
      path: '/scan',
      theme: 'violet',
    },
    {
      id: 'more',
      label: 'More',
      icon: <Bars3Icon className="w-6 h-6" />,
      path: '/more',
      theme: 'amber',
    },
  ],
  supervisor: [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: <HomeIcon className="w-6 h-6" />,
      path: '/dashboard',
      theme: 'blue',
    },
    {
      id: 'orders',
      label: 'Orders',
      icon: <ClipboardDocumentListIcon className="w-6 h-6" />,
      path: '/orders',
      theme: 'emerald',
    },
    {
      id: 'packing',
      label: 'Packing',
      icon: <CubeIcon className="w-6 h-6" />,
      path: '/packing',
      theme: 'violet',
    },
    {
      id: 'reports',
      label: 'Reports',
      icon: <ChartBarIcon className="w-6 h-6" />,
      path: '/reports',
      theme: 'amber',
    },
    {
      id: 'more',
      label: 'More',
      icon: <Bars3Icon className="w-6 h-6" />,
      path: '/more',
      theme: 'rose',
    },
  ],
  admin: [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: <HomeIcon className="w-6 h-6" />,
      path: '/dashboard',
      theme: 'blue',
    },
    {
      id: 'users',
      label: 'Users',
      icon: <UsersIcon className="w-6 h-6" />,
      path: '/user-roles',
      theme: 'emerald',
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: <Cog6ToothIcon className="w-6 h-6" />,
      path: '/settings',
      theme: 'violet',
    },
    {
      id: 'reports',
      label: 'Reports',
      icon: <ChartBarIcon className="w-6 h-6" />,
      path: '/reports',
      theme: 'amber',
    },
    {
      id: 'more',
      label: 'More',
      icon: <Bars3Icon className="w-6 h-6" />,
      path: '/more',
      theme: 'rose',
    },
  ],
};

export default BottomNavigation;
