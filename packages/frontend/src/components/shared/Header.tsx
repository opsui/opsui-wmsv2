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
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import GlobalSearch from './GlobalSearch';
import { UserRoleBadge } from './index';

// ============================================================================
// MOBILE MENU COMPONENT - Enhanced with distinctive design
// Following frontend skill guidelines for bold, memorable aesthetics
// ============================================================================

// Custom CSS keyframes for animations (injected once)
const MOBILE_MENU_STYLES = `
  @keyframes mobileMenuSlideIn {
    from { transform: translateX(-100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
  
  @keyframes staggerFadeIn {
    from { opacity: 0; transform: translateX(-12px) scale(0.98); }
    to { opacity: 1; transform: translateX(0) scale(1); }
  }
  
  @keyframes pulseGlow {
    0%, 100% { box-shadow: 0 0 8px rgba(168, 85, 247, 0.4); }
    50% { box-shadow: 0 0 16px rgba(168, 85, 247, 0.6); }
  }
  
  @keyframes shimmerMove {
    0% { background-position: -200% 0; }
    100% { background-position: 200% 0; }
  }
  
  @keyframes iconBounce {
    0%, 100% { transform: scale(1) rotate(0deg); }
    50% { transform: scale(1.15) rotate(-5deg); }
  }
  
  @keyframes floatParticle {
    0%, 100% { transform: translateY(0) rotate(0deg); opacity: 0.3; }
    50% { transform: translateY(-8px) rotate(180deg); opacity: 0.6; }
  }
  
  .mobile-menu-item {
    animation: staggerFadeIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
    opacity: 0;
  }
  
  .mobile-menu-item:hover .nav-icon {
    animation: iconBounce 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
  }
  
  .active-indicator-glow {
    animation: pulseGlow 2s ease-in-out infinite;
  }
  
  .shimmer-text {
    background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.1) 50%, transparent 100%);
    background-size: 200% 100%;
    animation: shimmerMove 3s ease-in-out infinite;
  }
  
  .floating-particle {
    animation: floatParticle 4s ease-in-out infinite;
  }
`;

// Section color themes for visual differentiation
const SECTION_THEMES: Record<string, { accent: string; gradient: string; iconBg: string }> = {
  dashboard: {
    accent: 'from-purple-500 to-violet-400',
    gradient: 'from-purple-500/10 to-violet-400/5',
    iconBg: 'bg-gradient-to-br from-purple-500 to-violet-400',
  },
  sales: {
    accent: 'from-emerald-500 to-green-400',
    gradient: 'from-emerald-500/10 to-green-400/5',
    iconBg: 'bg-gradient-to-br from-emerald-500 to-green-400',
  },
  finance: {
    accent: 'from-amber-500 to-yellow-400',
    gradient: 'from-amber-500/10 to-yellow-400/5',
    iconBg: 'bg-gradient-to-br from-amber-500 to-yellow-400',
  },
  inventory: {
    accent: 'from-violet-500 to-purple-400',
    gradient: 'from-violet-500/10 to-purple-400/5',
    iconBg: 'bg-gradient-to-br from-violet-500 to-purple-400',
  },
  hr: {
    accent: 'from-rose-500 to-pink-400',
    gradient: 'from-rose-500/10 to-pink-400/5',
    iconBg: 'bg-gradient-to-br from-rose-500 to-pink-400',
  },
  production: {
    accent: 'from-orange-500 to-red-400',
    gradient: 'from-orange-500/10 to-red-400/5',
    iconBg: 'bg-gradient-to-br from-orange-500 to-red-400',
  },
  warehouse: {
    accent: 'from-teal-500 to-cyan-400',
    gradient: 'from-teal-500/10 to-cyan-400/5',
    iconBg: 'bg-gradient-to-br from-teal-500 to-cyan-400',
  },
  support: {
    accent: 'from-slate-500 to-gray-400',
    gradient: 'from-slate-500/10 to-gray-400/5',
    iconBg: 'bg-gradient-to-br from-slate-500 to-gray-400',
  },
  reports: {
    accent: 'from-violet-500 to-purple-400',
    gradient: 'from-violet-500/10 to-purple-400/5',
    iconBg: 'bg-gradient-to-br from-violet-500 to-purple-400',
  },
  admin: {
    accent: 'from-fuchsia-500 to-pink-400',
    gradient: 'from-fuchsia-500/10 to-pink-400/5',
    iconBg: 'bg-gradient-to-br from-fuchsia-500 to-pink-400',
  },
};

// Inject styles once
if (typeof document !== 'undefined' && !document.getElementById('mobile-menu-styles')) {
  const styleSheet = document.createElement('style');
  styleSheet.id = 'mobile-menu-styles';
  styleSheet.textContent = MOBILE_MENU_STYLES;
  document.head.appendChild(styleSheet);
}

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
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Handle open/close animations with proper exit timing
  useEffect(() => {
    if (isOpen) {
      // Opening: show immediately, animate in
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 10);
      setIsClosing(false);
      return () => clearTimeout(timer);
    } else {
      // Closing: start exit animation, then unmount after transition completes
      setIsVisible(false); // Trigger fade out
      setIsClosing(true); // Keep mounted during exit animation
      const timer = setTimeout(() => {
        setIsClosing(false); // Now unmount
      }, 500); // Match the CSS transition duration
      return () => clearTimeout(timer);
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

  // Store scroll position to restore after closing
  const scrollPositionRef = useRef(0);

  useEffect(() => {
    if (isOpen) {
      scrollPositionRef.current = window.scrollY;
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollPositionRef.current}px`;
      document.body.style.left = '0';
      document.body.style.right = '0';
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.left = '';
      document.body.style.right = '';
      document.body.style.overflow = '';
      window.scrollTo(0, scrollPositionRef.current);
    }
    return () => {
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.left = '';
      document.body.style.right = '';
      document.body.style.overflow = '';
    };
  }, [isOpen]);

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

  // Get theme for a section
  const getSectionTheme = (key: string) => SECTION_THEMES[key] || SECTION_THEMES.dashboard;

  // Check if an item is active
  const isItemActive = (itemPath: string): { isActive: boolean; itemPathname: string } => {
    const itemPathname = itemPath.split('?')[0];
    let isActive = itemPathname === currentPath;

    if (isActive) {
      const itemQuery = itemPath.includes('?') ? itemPath.split('?')[1] : '';
      if (itemQuery) {
        const itemParams = new URLSearchParams(itemQuery);
        const currentParams = new URLSearchParams(currentSearch);
        for (const [key, value] of itemParams.entries()) {
          if (currentParams.get(key) !== value) {
            isActive = false;
            break;
          }
        }
        for (const [key] of currentParams.entries()) {
          if (!itemParams.has(key)) {
            isActive = false;
            break;
          }
        }
      } else if (currentSearch) {
        isActive = false;
      }
    }
    return { isActive, itemPathname };
  };

  if (!isOpen && !isClosing) return null;

  return (
    <>
      {/* Backdrop overlay - simple dark overlay without blur to avoid color distortion */}
      <div
        className={`fixed inset-0 z-[105] transition-opacity duration-500 ease-out ${
          isClosing || !isVisible ? 'opacity-0 pointer-events-none' : 'opacity-100'
        }`}
        style={{
          background: 'rgba(0, 0, 0, 0.85)',
        }}
        onClick={() => onHoverOff?.()}
      />

      {/* Menu Drawer with enhanced styling */}
      <div
        className={`fixed inset-y-0 left-0 z-[110] w-[340px] max-w-[90vw] transform transition-all duration-500 ease-out ${
          isClosing || !isVisible ? '-translate-x-full opacity-0' : 'translate-x-0 opacity-100'
        }`}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <div
          className="h-full flex flex-col relative overflow-hidden"
          style={{
            background: 'linear-gradient(180deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
            boxShadow:
              '20px 0 60px -15px rgba(0, 0, 0, 0.5), 0 0 100px -20px rgba(168, 85, 247, 0.15)',
          }}
        >
          {/* Animated background gradient mesh */}
          <div className="absolute inset-0 opacity-30 pointer-events-none">
            <div
              className="absolute top-0 left-0 w-96 h-96 rounded-full blur-3xl"
              style={{
                background: 'radial-gradient(circle, rgba(168, 85, 247, 0.3) 0%, transparent 70%)',
                transform: 'translate(-50%, -50%)',
              }}
            />
            <div
              className="absolute bottom-0 right-0 w-96 h-96 rounded-full blur-3xl"
              style={{
                background: 'radial-gradient(circle, rgba(168, 85, 247, 0.2) 0%, transparent 70%)',
                transform: 'translate(50%, 50%)',
              }}
            />
          </div>

          {/* Noise texture overlay */}
          <div
            className="absolute inset-0 opacity-[0.03] pointer-events-none"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
            }}
          />

          {/* Floating particles decoration */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="absolute w-1 h-1 rounded-full bg-white/20 floating-particle"
                style={{
                  left: `${10 + i * 15}%`,
                  top: `${20 + (i % 3) * 25}%`,
                  animationDelay: `${i * 0.5}s`,
                }}
              />
            ))}
          </div>

          {/* Header with user info */}
          <div className="relative border-b border-white/10 px-6 py-5">
            <div className="flex items-center gap-4">
              {/* Avatar with gradient border */}
              <div className="relative">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-violet-600 p-0.5 shadow-lg shadow-purple-500/20">
                  <div className="w-full h-full rounded-[10px] bg-slate-900 flex items-center justify-center">
                    <span
                      className="text-lg font-bold bg-gradient-to-br from-purple-400 to-violet-400 bg-clip-text text-transparent"
                      style={{ fontFamily: "'Outfit', sans-serif" }}
                    >
                      {userName.charAt(0).toUpperCase()}
                    </span>
                  </div>
                </div>
                {/* Online indicator */}
                <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-slate-900 shadow-lg shadow-emerald-500/50" />
              </div>

              <div className="flex-1 min-w-0">
                <h2
                  className="text-base font-semibold text-white truncate tracking-tight"
                  style={{ fontFamily: "'Outfit', sans-serif" }}
                >
                  {userName}
                </h2>
                <p
                  className="text-sm text-slate-400 truncate"
                  style={{ fontFamily: "'Inter', sans-serif" }}
                >
                  {userEmail}
                </p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 overscroll-contain scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
            {/* Role Switcher Section for users with multiple roles */}
            {hasRoleSwitcher && (
              <div className="mobile-menu-item" style={{ animationDelay: '50ms' }}>
                <button
                  onClick={() => setShowRoleSwitcher(!showRoleSwitcher)}
                  className="w-full flex items-center justify-between px-4 py-3.5 rounded-xl bg-gradient-to-r from-purple-500/10 to-violet-500/10 border border-purple-500/20 hover:border-purple-400/40 transition-all duration-300 group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-violet-500 flex items-center justify-center shadow-lg shadow-purple-500/20">
                      <CogIcon className="w-4 h-4 text-white" />
                    </div>
                    <div className="text-left">
                      <p
                        className="text-sm font-semibold text-white"
                        style={{ fontFamily: "'Outfit', sans-serif" }}
                      >
                        Switch Role
                      </p>
                      <p
                        className="text-xs text-purple-300"
                        style={{ fontFamily: "'Inter', sans-serif" }}
                      >
                        {getEffectiveRole() || userRole}
                      </p>
                    </div>
                  </div>
                  <ChevronDownIcon
                    className={`w-5 h-5 text-purple-400 transition-transform duration-300 ${showRoleSwitcher ? 'rotate-180' : ''}`}
                  />
                </button>

                {showRoleSwitcher && (
                  <div className="mt-3 ml-2 space-y-1.5 overflow-hidden">
                    {allRoleViews.map((view, index) => {
                      const ViewIcon = view.icon;
                      const isActive = view.role === getEffectiveRole();
                      const theme = getSectionTheme(view.key);
                      return (
                        <button
                          key={view.key}
                          onClick={() => handleRoleClick(view.role, view.path)}
                          className={`mobile-menu-item w-full flex items-center gap-3 px-4 py-2.5 text-left rounded-lg transition-all duration-300 group ${
                            isActive
                              ? `bg-gradient-to-r ${theme.gradient} border border-white/20`
                              : 'hover:bg-white/5 border border-transparent'
                          }`}
                          style={{ animationDelay: `${100 + index * 30}ms` }}
                        >
                          <div
                            className={`w-7 h-7 rounded-lg ${theme.iconBg} flex items-center justify-center shadow-lg`}
                          >
                            <ViewIcon className="w-3.5 h-3.5 text-white" />
                          </div>
                          <span
                            className={`font-medium text-sm ${isActive ? 'text-white' : 'text-slate-300 group-hover:text-white'}`}
                            style={{ fontFamily: "'Inter', sans-serif" }}
                          >
                            {view.label}
                          </span>
                          {isActive && (
                            <span className="ml-auto w-2 h-2 rounded-full bg-gradient-to-r from-purple-400 to-violet-400 active-indicator-glow" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Navigation Groups */}
            {navGroups.map((group, groupIndex) => {
              const GroupIcon = group.icon;
              const theme = getSectionTheme(group.key);

              return (
                <div
                  key={group.key}
                  className="mobile-menu-item"
                  style={{ animationDelay: `${100 + groupIndex * 80}ms` }}
                >
                  {/* Section Header */}
                  <div
                    className={`flex items-center gap-2.5 px-3 py-2 mb-2 rounded-lg bg-gradient-to-r ${theme.gradient}`}
                  >
                    <div
                      className={`w-6 h-6 rounded-md ${theme.iconBg} flex items-center justify-center shadow-md`}
                    >
                      <GroupIcon className="w-3.5 h-3.5 text-white" />
                    </div>
                    <h3
                      className="text-xs font-bold uppercase tracking-widest text-slate-300"
                      style={{ fontFamily: "'Outfit', sans-serif" }}
                    >
                      {group.label}
                    </h3>
                  </div>

                  {/* Navigation Items */}
                  <div className="space-y-1 pl-2">
                    {group.items.map((item, itemIndex) => {
                      const ItemIcon = item.icon;
                      const { isActive } = isItemActive(item.path);
                      const isHovered = hoveredItem === item.key;

                      return (
                        <button
                          key={item.key}
                          onClick={() => handleNavigate(item.path, item.requiredRole)}
                          onMouseEnter={() => setHoveredItem(item.key)}
                          onMouseLeave={() => setHoveredItem(null)}
                          className={`relative w-full flex items-center gap-3 px-4 py-2.5 text-left rounded-xl transition-all duration-300 group overflow-hidden ${
                            isActive
                              ? `bg-gradient-to-r ${theme.gradient} border border-white/20 shadow-lg`
                              : 'hover:bg-white/5 border border-transparent'
                          }`}
                          style={{
                            transitionDelay: `${groupIndex * 80 + itemIndex * 40}ms`,
                          }}
                        >
                          {/* Hover shimmer effect */}
                          <div
                            className={`absolute inset-0 shimmer-text transition-opacity duration-300 ${isHovered ? 'opacity-100' : 'opacity-0'}`}
                          />

                          {/* Icon */}
                          <div
                            className={`nav-icon relative z-10 w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-300 ${
                              isActive
                                ? `${theme.iconBg} shadow-lg`
                                : 'bg-white/5 group-hover:bg-white/10'
                            }`}
                          >
                            <ItemIcon
                              className={`w-4 h-4 transition-colors duration-300 ${
                                isActive ? 'text-white' : 'text-slate-400 group-hover:text-white'
                              }`}
                            />
                          </div>

                          {/* Label */}
                          <span
                            className={`relative z-10 font-medium text-sm tracking-wide transition-colors duration-300 ${
                              isActive ? 'text-white' : 'text-slate-300 group-hover:text-white'
                            }`}
                            style={{ fontFamily: "'Inter', sans-serif" }}
                          >
                            {item.label}
                          </span>

                          {/* Active indicator */}
                          {isActive && (
                            <span
                              className={`relative z-10 ml-auto w-2 h-2 rounded-full bg-gradient-to-r ${theme.accent} active-indicator-glow`}
                            />
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
          <div className="relative border-t border-white/10 px-4 py-4 space-y-2">
            {/* Gradient line accent */}
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-purple-500/50 to-transparent" />

            <div className="flex items-center justify-between px-4 py-2.5 rounded-lg bg-white/5">
              <span
                className="text-sm text-slate-400"
                style={{ fontFamily: "'Inter', sans-serif" }}
              >
                Current Role
              </span>
              <UserRoleBadge role={(getEffectiveRole() || userRole) as UserRole} userId={userId} />
            </div>

            {/* Settings button */}
            <button
              onClick={() => {
                setShowRoleSwitcher(false);
                handleNavigate('/role-settings?section=role-switcher');
              }}
              className="w-full flex items-center gap-3 px-4 py-3 text-left rounded-xl bg-white/5 hover:bg-white/10 border border-transparent hover:border-white/10 transition-all duration-300 group"
            >
              <div className="w-8 h-8 rounded-lg bg-slate-700 flex items-center justify-center group-hover:bg-slate-600 transition-colors">
                <CogIcon className="w-4 h-4 text-slate-300 group-hover:text-white transition-colors" />
              </div>
              <span
                className="font-medium text-sm text-slate-300 group-hover:text-white transition-colors"
                style={{ fontFamily: "'Inter', sans-serif" }}
              >
                Settings
              </span>
            </button>

            {/* Logout button */}
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 text-left rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 hover:border-red-500/40 transition-all duration-300 group"
            >
              <div className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center group-hover:bg-red-500/30 transition-colors">
                <ArrowRightStartOnRectangleIcon className="w-4 h-4 text-red-400 group-hover:text-red-300 transition-colors" />
              </div>
              <span
                className="font-medium text-sm text-red-400 group-hover:text-red-300 transition-colors"
                style={{ fontFamily: "'Inter', sans-serif" }}
              >
                Logout
              </span>
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

const NavDropdown = memo(function NavDropdown({
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
  // Matches ONLY exact path - no parent/child relationship matching
  const isItemActive = (itemPath: string): boolean => {
    // Direct string comparison for pathnames - no URL parsing ambiguity
    const itemPathname = itemPath.split('?')[0];
    const currentPathname = currentPath;

    // Parent paths MUST NOT match child paths
    // /accounting does NOT match /accounting/chart-of-accounts
    if (itemPathname !== currentPathname) return false;

    // Handle query params if present
    const itemQuery = itemPath.includes('?') ? itemPath.split('?')[1] : '';
    if (!itemQuery) return true;

    // Parse and compare query parameters
    const itemParams = new URLSearchParams(itemQuery);
    const currentParams = new URLSearchParams(currentSearch);

    // All item params must match
    for (const [key, value] of itemParams.entries()) {
      if (currentParams.get(key) !== value) return false;
    }
    // No extra params allowed
    for (const [key] of currentParams.entries()) {
      if (!itemParams.has(key)) return false;
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
    }, 25);
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
        className={`flex items-center gap-1.5 px-2 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
          hasActiveItem
            ? 'text-primary-700 dark:text-white bg-primary-50 dark:bg-white/[0.08] border border-primary-200 dark:border-white/[0.15]'
            : 'text-gray-600 dark:text-gray-300 hover:text-primary-700 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-white/[0.05]'
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
        } dark:bg-gray-800 bg-white dark:border-gray-700 border-gray-200`}
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
                  <span className="w-1.5 h-1.5 rounded-full dark:bg-primary-300 bg-primary-600 indicator-dot"></span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
});

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
    ORDER_CLAIMED: 'text-purple-400',
    ORDER_COMPLETED: 'text-green-400',
    ORDER_CANCELLED: 'text-red-400',
    ORDER_SHIPPED: 'text-violet-400',
    PICK_UPDATED: 'text-yellow-400',
    PICK_COMPLETED: 'text-green-400',
    INVENTORY_LOW: 'text-orange-400',
    EXCEPTION_REPORTED: 'text-red-400',
    EXCEPTION_RESOLVED: 'text-green-400',
    QUALITY_FAILED: 'text-red-400',
    QUALITY_APPROVED: 'text-green-400',
    WAVE_CREATED: 'text-purple-400',
    WAVE_COMPLETED: 'text-green-400',
    ZONE_ASSIGNED: 'text-violet-400',
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
    // Only update the store - App.tsx handles DOM updates with smooth transitions
    setTheme(newTheme);
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
    }, 50);
  };

  return (
    <div
      className="relative z-[9999] min-w-0 shrink"
      ref={dropdownRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <button
        className="relative p-2 min-w-0 shrink dark:text-gray-400 text-gray-700 dark:hover:text-white hover:text-primary-700 dark:hover:bg-white/[0.05] hover:bg-primary-50 rounded-xl transition-all duration-200 group hover:scale-110"
        aria-label={`Notifications: ${unreadCount} unread`}
      >
        <BellIcon className="h-5 w-5 flex-shrink-0 transition-transform duration-200" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center px-1 text-[10px] font-bold text-white dark:bg-error-600 bg-error-500 rounded-full shadow-lg dark:shadow-error-500/50">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-96 rounded-2xl shadow-2xl animate-fade-in overflow-hidden dropdown-menu-enhanced">
          {/* Header with gradient accent */}
          <div className="relative px-5 py-4 border-b border-gray-100 dark:border-gray-700/50">
            {/* Gradient accent line at top */}
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary-400 via-purple-400 to-primary-400" />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BellIcon className="h-4 w-4 text-primary-500 dark:text-primary-400" />
                <p
                  className="text-sm font-semibold dark:text-white text-gray-900"
                  style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                >
                  Notifications
                </p>
              </div>
              {unreadCount > 0 && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-primary-100 dark:bg-primary-500/20 text-primary-700 dark:text-primary-300 notification-badge-enhanced">
                  {unreadCount} {unreadCount === 1 ? 'unread' : 'unread'}
                </span>
              )}
            </div>
          </div>

          {/* Notification Preview - show recent notifications */}
          <div className="py-1 max-h-[400px] overflow-y-auto">
            <NotificationPreview
              limit={5}
              onNotificationClick={() => setIsOpen(false)}
              navigate={navigate}
            />
          </div>

          {/* Footer with enhanced styling */}
          <div className="border-t border-gray-100 dark:border-gray-700/50 px-4 py-3 bg-gray-50/50 dark:bg-gray-800/50">
            <div className="flex gap-2">
              <button
                onClick={() => {
                  navigate('/notifications');
                  setIsOpen(false);
                }}
                className="flex-1 text-xs font-semibold px-3 py-2 rounded-lg bg-primary-500 hover:bg-primary-600 text-white transition-all duration-200 hover:shadow-lg hover:shadow-primary-500/25"
                style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
              >
                View All
              </button>
              {canSupervise() && (
                <button
                  onClick={() => {
                    navigate('/dashboard');
                    setIsOpen(false);
                  }}
                  className="flex-1 text-xs font-medium px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600 transition-all duration-200"
                  style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                >
                  Dashboard
                </button>
              )}
            </div>
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
  // Default: all roles visible - organized by ERP priority
  return {
    admin: true,
    sales: true,
    accounting: true,
    'stock-control': true,
    inwards: true,
    production: true,
    picking: true,
    packing: true,
    rma: true,
    maintenance: true,
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
  // Organized by ERP business priority
  const dropdownRoleViews = availableViews || [
    // 1. Admin - System oversight
    { key: 'admin', label: 'Admin View', path: '/dashboard', icon: CogIcon, role: UserRole.ADMIN },
    // 2. Sales - Revenue generation
    {
      key: 'sales',
      label: 'Sales View',
      path: '/sales',
      icon: CurrencyDollarIcon,
      role: 'SALES' as UserRole,
    },
    // 3. Finance - Financial management
    {
      key: 'accounting',
      label: 'Finance View',
      path: '/accounting',
      icon: BanknotesIcon,
      role: 'ACCOUNTING' as UserRole,
    },
    // 4. Inventory - Stock management
    {
      key: 'stock-control',
      label: 'Inventory View',
      path: '/stock-control',
      icon: CubeIcon,
      role: UserRole.STOCK_CONTROLLER,
    },
    {
      key: 'inwards',
      label: 'Receiving View',
      path: '/inwards',
      icon: InboxIcon,
      role: 'INWARDS' as UserRole,
    },
    // 5. Production - Manufacturing
    {
      key: 'production',
      label: 'Production View',
      path: '/production',
      icon: CogIcon,
      role: 'PRODUCTION' as UserRole,
    },
    // 6. Warehouse - Fulfillment operations
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
    // 7. Support - Returns & Maintenance
    {
      key: 'rma',
      label: 'Returns View',
      path: '/rma',
      icon: ArrowPathIcon,
      role: 'RMA' as UserRole,
    },
    {
      key: 'maintenance',
      label: 'Maintenance View',
      path: '/maintenance',
      icon: WrenchScrewdriverIcon,
      role: 'MAINTENANCE' as UserRole,
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
    // Short delay before closing to allow mouse to move to dropdown content
    closeTimeoutRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 50);
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
        className="flex items-center gap-1.5 dark:hover:bg-white/[0.05] hover:bg-gray-100 rounded-lg px-2 py-1.5 transition-all duration-200 group"
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
        <div className="absolute top-full left-0 mt-2 w-72 dark:bg-gray-800 bg-white dark:border-gray-700 border-primary-200 rounded-xl shadow-xl animate-fade-in">
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
                        <span className="w-1.5 h-1.5 rounded-full dark:bg-primary-300 bg-primary-600 indicator-dot"></span>
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
  /** True while the global search is expanded on mobile – hides other toolbar icons */
  const [isMobileSearchActive, setIsMobileSearchActive] = useState(false);

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

  const handleLogout = useCallback(async () => {
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
  }, [logoutMutation, logout, navigate]);

  if (!user) {
    return null;
  }

  // Get the effective role (switched role) or fall back to base role
  const effectiveRole = getEffectiveRole() || user.role;

  // Helper function to get the home path for a given role
  // Note: Admins always go to their dashboard, regardless of current role view
  const getHomePathForRole = (role: UserRole | string, baseRole: UserRole): string => {
    // Admins always go to their dashboard, even when in a different role view
    if (baseRole === UserRole.ADMIN) {
      return '/dashboard';
    }

    switch (role) {
      case UserRole.ADMIN:
      case UserRole.SUPERVISOR:
        return '/dashboard';
      case UserRole.PICKER:
        return '/orders';
      case UserRole.PACKER:
        return '/packing';
      case UserRole.STOCK_CONTROLLER:
        return '/stock-control';
      case 'SALES':
        return '/sales';
      case 'ACCOUNTING':
        return '/accounting';
      case 'INWARDS':
        return '/inwards';
      case 'PRODUCTION':
        return '/production';
      case 'RMA':
        return '/rma';
      case 'MAINTENANCE':
        return '/maintenance';
      case 'HR_MANAGER':
      case 'HR_ADMIN':
        return '/hr';
      default:
        return '/dashboard';
    }
  };

  // Group navigation items into dropdowns
  // Organization: Modular ERP System - ordered by business priority
  // 1. Dashboard (Central Overview) -> 2. Sales & CRM -> 3. Finance/Accounting ->
  // 4. Inventory -> 5. HR & Payroll -> 6. Production -> 7. Reports -> 8. Admin
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

    // =========================================================================
    // 1. DASHBOARD - Central Overview (Highest Priority)
    // =========================================================================
    // For admins and supervisors - provides business-wide oversight
    if (effectiveRole === UserRole.SUPERVISOR || effectiveRole === UserRole.ADMIN) {
      groups.push({
        key: 'dashboard',
        label: 'Dashboard',
        icon: ChartBarIcon,
        items: [
          { key: 'dashboard-main', label: 'Overview', path: '/dashboard', icon: ChartBarIcon },
          {
            key: 'exceptions',
            label: 'Exceptions',
            path: '/exceptions',
            icon: ExclamationTriangleIcon,
          },
        ],
      });
    }

    // =========================================================================
    // 2. SALES & CRM - Revenue Generation (Critical for Business)
    // =========================================================================
    if (
      effectiveRole === UserRole.ADMIN ||
      effectiveRole === UserRole.SUPERVISOR ||
      effectiveRole === ('SALES' as UserRole)
    ) {
      const salesItems: Array<{
        key: string;
        label: string;
        path: string;
        icon: React.ComponentType<{ className?: string }>;
        requiredRole?: UserRole;
      }> = [{ key: 'sales', label: 'Sales Dashboard', path: '/sales', icon: CurrencyDollarIcon }];

      // Only show Order Queue for non-admin roles (admin accesses it via role view switcher)
      if (effectiveRole !== UserRole.ADMIN) {
        salesItems.splice(1, 0, {
          key: 'order-queue',
          label: 'Order Queue',
          path: '/orders',
          icon: QueueListIcon,
          requiredRole: UserRole.PICKER,
        });
      }

      // Add customer-related items for admins and supervisors
      if (effectiveRole === UserRole.ADMIN || effectiveRole === UserRole.SUPERVISOR) {
        salesItems.push({
          key: 'search',
          label: 'Product Search',
          path: '/search',
          icon: MagnifyingGlassIcon,
        });
      }

      groups.push({
        key: 'sales',
        label: 'Sales',
        icon: CurrencyDollarIcon,
        items: salesItems,
      });
    }

    // =========================================================================
    // 3. FINANCE & ACCOUNTING - Financial Management
    // =========================================================================
    if (effectiveRole === UserRole.ADMIN || effectiveRole === ('ACCOUNTING' as UserRole)) {
      groups.push({
        key: 'finance',
        label: 'Finance',
        icon: BanknotesIcon,
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

    // =========================================================================
    // 4. INVENTORY - Stock Management
    // =========================================================================
    if (
      effectiveRole === UserRole.SUPERVISOR ||
      effectiveRole === UserRole.ADMIN ||
      effectiveRole === UserRole.STOCK_CONTROLLER ||
      effectiveRole === UserRole.PICKER ||
      effectiveRole === ('INWARDS' as UserRole)
    ) {
      const inventoryItems: Array<{
        key: string;
        label: string;
        path: string;
        icon: React.ComponentType<{ className?: string }>;
        requiredRole?: UserRole;
      }> = [];

      // Stock Control - core inventory function
      inventoryItems.push({
        key: 'stock-control',
        label: 'Stock Control',
        path: '/stock-control',
        icon: ScaleIcon,
      });

      // Quick Adjust - for supervisors and admins
      if (effectiveRole === UserRole.SUPERVISOR || effectiveRole === UserRole.ADMIN) {
        inventoryItems.push({
          key: 'quick-adjust',
          label: 'Quick Adjust',
          path: '/stock-control?tab=quick-actions',
          icon: AdjustmentsHorizontalIcon,
        });
      }

      // Cycle Counting - available to all inventory roles
      inventoryItems.push({
        key: 'cycle-counting',
        label: 'Cycle Counting',
        path: '/cycle-counting',
        icon: ClipboardDocumentListIcon,
      });

      // Inwards/Receiving
      inventoryItems.push({
        key: 'inwards',
        label: 'Receiving',
        path: '/inwards',
        icon: InboxIcon,
      });

      // Advanced inventory features for supervisors and admins
      if (effectiveRole === UserRole.SUPERVISOR || effectiveRole === UserRole.ADMIN) {
        inventoryItems.push(
          {
            key: 'bin-locations',
            label: 'Bin Locations',
            path: '/bin-locations',
            icon: CubeIcon,
          },
          {
            key: 'location-capacity',
            label: 'Location Capacity',
            path: '/location-capacity',
            icon: ScaleIcon,
          },
          {
            key: 'quality-control',
            label: 'Quality Control',
            path: '/quality-control',
            icon: ShieldCheckIcon,
          }
        );
      }

      groups.push({
        key: 'inventory',
        label: 'Inventory',
        icon: CubeIcon,
        items: inventoryItems,
      });
    }

    // =========================================================================
    // 5. HR & PAYROLL - Human Resources
    // =========================================================================
    if (
      effectiveRole === UserRole.ADMIN ||
      effectiveRole === ('HR_MANAGER' as UserRole) ||
      effectiveRole === ('HR_ADMIN' as UserRole)
    ) {
      groups.push({
        key: 'hr',
        label: 'HR & Payroll',
        icon: UserGroupIcon,
        items: [
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
          },
        ],
      });
    }

    // =========================================================================
    // 6. PRODUCTION - Manufacturing Operations
    // =========================================================================
    if (
      effectiveRole === UserRole.ADMIN ||
      effectiveRole === UserRole.SUPERVISOR ||
      effectiveRole === ('PRODUCTION' as UserRole)
    ) {
      const productionItems: Array<{
        key: string;
        label: string;
        path: string;
        icon: React.ComponentType<{ className?: string }>;
        requiredRole?: UserRole;
      }> = [
        {
          key: 'production',
          label: 'Production Dashboard',
          path: '/production',
          icon: ChartBarIcon,
        },
      ];

      // Add more production features for admins and supervisors
      if (effectiveRole === UserRole.ADMIN || effectiveRole === UserRole.SUPERVISOR) {
        productionItems.push({
          key: 'search',
          label: 'Product Search',
          path: '/search',
          icon: MagnifyingGlassIcon,
        });
      }

      groups.push({
        key: 'production',
        label: 'Production',
        icon: CogIcon,
        items: productionItems,
      });
    }

    // =========================================================================
    // 7. WAREHOUSE OPERATIONS - Fulfillment & Logistics
    // =========================================================================
    // For pickers, packers, and warehouse staff
    if (
      effectiveRole === UserRole.PICKER ||
      effectiveRole === UserRole.PACKER ||
      effectiveRole === UserRole.SUPERVISOR ||
      effectiveRole === UserRole.ADMIN
    ) {
      const warehouseItems: Array<{
        key: string;
        label: string;
        path: string;
        icon: React.ComponentType<{ className?: string }>;
        requiredRole?: UserRole;
      }> = [];

      // Picker-specific items
      if (effectiveRole === UserRole.PICKER) {
        warehouseItems.push({
          key: 'order-queue',
          label: 'Order Queue',
          path: '/orders',
          icon: QueueListIcon,
        });
      }

      // Packer-specific items
      if (effectiveRole === UserRole.PACKER) {
        warehouseItems.push({
          key: 'packing',
          label: 'Packing Queue',
          path: '/packing',
          icon: CubeIcon,
          requiredRole: UserRole.PACKER,
        });
      }

      // Wave and Zone Picking - supervisors and admins only
      if (effectiveRole === UserRole.SUPERVISOR || effectiveRole === UserRole.ADMIN) {
        warehouseItems.push(
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
          },
          {
            key: 'slotting',
            label: 'Slotting',
            path: '/slotting',
            icon: TagIcon,
          }
        );
      }

      // Route Optimization - available to all warehouse roles
      if (effectiveRole !== UserRole.PACKER) {
        warehouseItems.push({
          key: 'route-optimization',
          label: 'Route Optimization',
          path: '/route-optimization',
          icon: MapIcon,
        });
      }

      // Shipped Orders
      warehouseItems.push({
        key: 'shipped-orders',
        label: 'Shipped Orders',
        path: '/shipped-orders',
        icon: TruckIcon,
      });

      if (warehouseItems.length > 0) {
        groups.push({
          key: 'warehouse',
          label: 'Warehouse',
          icon: BuildingOfficeIcon,
          items: warehouseItems,
        });
      }
    }

    // =========================================================================
    // 8. RETURNS & MAINTENANCE - Support Functions
    // =========================================================================
    if (effectiveRole === ('RMA' as UserRole) || effectiveRole === ('MAINTENANCE' as UserRole)) {
      const supportItems: Array<{
        key: string;
        label: string;
        path: string;
        icon: React.ComponentType<{ className?: string }>;
        requiredRole?: UserRole;
      }> = [];

      if (effectiveRole === ('RMA' as UserRole)) {
        supportItems.push(
          { key: 'rma', label: 'RMA/Returns', path: '/rma', icon: ArrowPathIcon },
          { key: 'stock-control', label: 'Stock Control', path: '/stock-control', icon: ScaleIcon }
        );
      }

      if (effectiveRole === ('MAINTENANCE' as UserRole)) {
        supportItems.push(
          {
            key: 'maintenance',
            label: 'Maintenance',
            path: '/maintenance',
            icon: WrenchScrewdriverIcon,
          },
          { key: 'bin-locations', label: 'Bin Locations', path: '/bin-locations', icon: CubeIcon }
        );
      }

      supportItems.push({
        key: 'search',
        label: 'Product Search',
        path: '/search',
        icon: MagnifyingGlassIcon,
      });

      if (supportItems.length > 0) {
        groups.push({
          key: 'support',
          label: 'Support',
          icon: WrenchScrewdriverIcon,
          items: supportItems,
        });
      }
    }

    // =========================================================================
    // 9. REPORTS - Business Intelligence
    // =========================================================================
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
        ],
      });
    }

    // =========================================================================
    // 10. ADMIN - System Configuration (Lowest Priority)
    // =========================================================================
    if (
      effectiveRole === UserRole.ADMIN ||
      effectiveRole === ('HR_MANAGER' as UserRole) ||
      effectiveRole === ('HR_ADMIN' as UserRole)
    ) {
      groups.push({
        key: 'admin',
        label: 'Admin',
        icon: CogIcon,
        items: [
          { key: 'user-roles', label: 'User Roles', path: '/user-roles', icon: UserGroupIcon },
          {
            key: 'business-rules',
            label: 'Business Rules',
            path: '/business-rules',
            icon: CogIcon,
          },
          { key: 'integrations', label: 'Integrations', path: '/integrations', icon: ServerIcon },
        ],
      });
    }

    return groups;
  };

  // Memoize navigation groups to prevent recalculation on every render
  const navGroups = useMemo(() => getNavGroups(), [effectiveRole, additionalRoles]);

  // Define all available role views with their paths and icons
  // Organized by ERP business priority: Admin -> Sales -> Finance -> Inventory -> HR -> Production -> Warehouse -> Support
  const allAvailableRoleViews = [
    // 1. Admin - System oversight
    { key: 'admin', label: 'Admin View', path: '/dashboard', icon: CogIcon, role: UserRole.ADMIN },
    // 2. Sales - Revenue generation
    {
      key: 'sales',
      label: 'Sales View',
      path: '/sales',
      icon: CurrencyDollarIcon,
      role: 'SALES' as UserRole,
    },
    // 3. Finance - Financial management
    {
      key: 'accounting',
      label: 'Finance View',
      path: '/accounting',
      icon: BanknotesIcon,
      role: 'ACCOUNTING' as UserRole,
    },
    // 4. Inventory - Stock management
    {
      key: 'stock-control',
      label: 'Inventory View',
      path: '/stock-control',
      icon: CubeIcon,
      role: UserRole.STOCK_CONTROLLER,
    },
    {
      key: 'inwards',
      label: 'Receiving View',
      path: '/inwards',
      icon: InboxIcon,
      role: 'INWARDS' as UserRole,
    },
    // 5. Production - Manufacturing
    {
      key: 'production',
      label: 'Production View',
      path: '/production',
      icon: CogIcon,
      role: 'PRODUCTION' as UserRole,
    },
    // 6. Warehouse - Fulfillment operations
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
    // 7. Support - Returns & Maintenance
    {
      key: 'rma',
      label: 'Returns View',
      path: '/rma',
      icon: ArrowPathIcon,
      role: 'RMA' as UserRole,
    },
    {
      key: 'maintenance',
      label: 'Maintenance View',
      path: '/maintenance',
      icon: WrenchScrewdriverIcon,
      role: 'MAINTENANCE' as UserRole,
    },
  ];

  // Filter role views to only include user's base role + granted additional roles
  // Admin users can see all role views
  const availableRoles =
    user?.role === UserRole.ADMIN
      ? Object.values(UserRole) // Admins see all roles
      : ([user?.role, ...(additionalRoles || [])].filter(Boolean) as UserRole[]);

  const allRoleViews = allAvailableRoleViews.filter(view => availableRoles.includes(view.role));

  const handleRoleSwitch = useCallback(
    async (role: UserRole, path: string) => {
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
    },
    [setActiveRole, setActiveRoleMutation, navigate]
  );

  // Handle navigation with optional role switching for admin users
  const handleNavigateWithRole = useCallback(
    async (path: string, requiredRole?: UserRole) => {
      // If user is admin and a specific role is required, switch to that role first
      if (requiredRole && user?.role === UserRole.ADMIN && requiredRole !== getEffectiveRole()) {
        console.log('[Header] Admin navigating to role-specific page, switching to:', requiredRole);
        await handleRoleSwitch(requiredRole, path);
      } else {
        navigate(path);
      }
    },
    [user?.role, getEffectiveRole, handleRoleSwitch, navigate]
  );

  return (
    <>
      <header className="relative z-50">
        <div className="w-full">
          {/* Mobile: Logo above toolbar (stacked), desktop: horizontal layout */}
          {/* Mobile: flex-col for stacking, desktop: flex-row */}
          <div className="relative flex flex-col md:flex-row md:items-center md:h-14 px-4 py-2 md:py-0">
            {/* Mobile: Top row - Hamburger on left, Logo centered. Desktop: Left side with menu */}
            <div className="flex items-center justify-between md:justify-start w-full md:w-auto mb-2 md:mb-0">
              {/* Hamburger - always visible */}
              <button
                onClick={() => setMobileMenuOpen(true)}
                onMouseEnter={() => setMobileMenuOpen(true)}
                className="p-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/[0.05] touch-target rounded-lg transition-colors"
                aria-label="Open menu"
              >
                <Bars3Icon className="h-6 w-6 text-gray-700 dark:text-gray-300" />
              </button>

              {/* Logo - centered on mobile, left on desktop */}
              <button
                onClick={() => {
                  const homePath = getHomePathForRole(effectiveRole, user.role);
                  navigate(homePath);
                }}
                className="text-xl font-bold tracking-tight dark:text-white text-gray-900 cursor-pointer absolute left-1/2 -translate-x-1/2 md:static md:translate-x-0 md:mx-0 relative group overflow-hidden"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                title="Go to home"
              >
                <span className="relative z-10 transition-all duration-300 group-hover:text-white dark:group-hover:text-white">
                  Ops
                  <span className="text-purple-500 dark:text-purple-400 group-hover:text-purple-300 transition-colors">
                    UI
                  </span>
                </span>
                {/* Animated background reveal on hover */}
                <span className="absolute inset-0 bg-gradient-to-r from-purple-600 to-violet-500 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out rounded-lg" />
                {/* Glow pulse effect */}
                <span className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                  <span className="absolute inset-0 animate-pulse bg-purple-500/30 blur-md" />
                </span>
              </button>
              {/* Spacer for mobile to balance hamburger */}
              <div className="w-10 md:hidden"></div>
            </div>

            {/* Toolbar - centered on mobile (flex), absolute centered on desktop */}
            <div className="relative flex items-center justify-center gap-1 p-1.5 sm:p-1 mx-auto md:mx-0 md:absolute md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2">
              {/* Animated gradient border */}
              <div className="absolute inset-0 rounded-full bg-gradient-to-r from-purple-500 via-violet-500 to-purple-600 opacity-60 animate-gradient-shift bg-[length:200%_100%]" />
              {/* Inner container with glass effect */}
              <div className="relative flex items-center justify-center gap-1 bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl rounded-full px-2 py-1 sm:py-0.5">
                {/* Subtle purple glow on hover - pointer-events-none to not block clicks */}
                <div className="absolute inset-0 rounded-full bg-purple-500/0 hover:bg-purple-500/10 transition-colors duration-300 pointer-events-none" />
                {/* Global Search — passes callback so it can hide sibling icons on mobile */}
                <GlobalSearch onMobileSearchActive={setIsMobileSearchActive} />

                {/* Other toolbar icons: hidden on mobile while search is expanded */}
                <div className={isMobileSearchActive ? 'hidden md:contents' : 'contents'}>
                  {/* Theme Toggle */}
                  <ThemeToggle />

                  {/* Notification Panel */}
                  <NotificationPanel />

                  {/* Divider */}
                  <div className="w-px h-5 bg-gradient-to-b from-transparent via-purple-400/50 to-transparent mx-1" />

                  {/* Settings button */}
                  <button
                    onClick={() => navigate('/role-settings?section=role-switcher')}
                    className="p-2 dark:text-gray-400 text-gray-600 dark:hover:text-purple-300 hover:text-purple-700 dark:hover:bg-purple-500/10 hover:bg-purple-50 rounded-lg transition-colors"
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
