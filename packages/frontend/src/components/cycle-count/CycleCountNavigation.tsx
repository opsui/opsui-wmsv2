/**
 * Cycle Count Navigation Component
 *
 * Shared navigation bar for all cycle counting pages.
 * Ensures consistent positioning and styling across Counts, Analytics, Root Cause, and Schedules pages.
 * Theme-aware: Supports both light and dark modes.
 */

import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores';
import { UserRole } from '@opsui/shared';
import {
  ClipboardDocumentListIcon,
  ChartBarIcon,
  LightBulbIcon,
  CalendarDaysIcon,
} from '@heroicons/react/24/outline';

interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  icon: React.ComponentType<{ className?: string }>;
}

// Tab Button Component
function TabButton({ active, onClick, children, icon: Icon }: TabButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all duration-300 ${
        active
          ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-500/20 dark:shadow-blue-500/20'
          : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700/50'
      }`}
    >
      <Icon className="h-5 w-5" />
      {children}
    </button>
  );
}

export interface CycleCountNavigationProps {
  /** The currently active page */
  activePage: 'counts' | 'analytics' | 'root-cause' | 'schedules';
  /** Optional callback for local tab changes (for CycleCountingPage with local tabs) */
  onLocalTabChange?: (tab: 'counts' | 'analytics') => void;
}

/**
 * Navigation bar for cycle counting section.
 * Always renders in the same position with consistent styling.
 */
export function CycleCountNavigation({ activePage, onLocalTabChange }: CycleCountNavigationProps) {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const canViewAnalytics = user?.role === UserRole.SUPERVISOR || user?.role === UserRole.ADMIN;
  const canManageSchedules = user?.role === UserRole.SUPERVISOR || user?.role === UserRole.ADMIN;

  const handleNavigate = (page: string) => {
    // For local tabs (counts/analytics on same page), use callback if provided
    if (onLocalTabChange && (page === 'counts' || page === 'analytics')) {
      onLocalTabChange(page as 'counts' | 'analytics');
      return;
    }

    // Otherwise navigate to the page
    switch (page) {
      case 'counts':
        navigate('/cycle-counting');
        break;
      case 'analytics':
        navigate('/cycle-counting?tab=analytics');
        break;
      case 'root-cause':
        navigate('/cycle-counting/root-cause');
        break;
      case 'schedules':
        navigate('/cycle-counting/schedules');
        break;
    }
  };

  return (
    <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800/50 backdrop-blur rounded-xl p-1.5 border border-gray-200 dark:border-gray-700/50 shadow-sm dark:shadow-lg">
      <TabButton
        active={activePage === 'counts'}
        onClick={() => handleNavigate('counts')}
        icon={ClipboardDocumentListIcon}
      >
        Counts
      </TabButton>
      {canViewAnalytics && (
        <>
          <TabButton
            active={activePage === 'analytics'}
            onClick={() => handleNavigate('analytics')}
            icon={ChartBarIcon}
          >
            Analytics
          </TabButton>
          <TabButton
            active={activePage === 'root-cause'}
            onClick={() => handleNavigate('root-cause')}
            icon={LightBulbIcon}
          >
            Root Cause
          </TabButton>
        </>
      )}
      {canManageSchedules && (
        <TabButton
          active={activePage === 'schedules'}
          onClick={() => handleNavigate('schedules')}
          icon={CalendarDaysIcon}
        >
          Schedules
        </TabButton>
      )}
    </div>
  );
}
