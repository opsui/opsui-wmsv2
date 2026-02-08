/**
 * Breadcrumb component
 *
 * Provides consistent breadcrumb navigation across all pages
 * Supports tab-based navigation, nested routes, and multi-level paths
 */

import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { HomeIcon, ChevronRightIcon, UserCircleIcon } from '@heroicons/react/24/outline';
import { useAuthStore } from '@/stores';
import { UserRole } from '@opsui/shared';

// ============================================================================
// TYPES
// ============================================================================

export interface BreadcrumbItem {
  label: string;
  path?: string;
  icon?: React.ComponentType<{ className?: string }>;
}

export interface BreadcrumbProps {
  /** Breadcrumb items (if provided, overrides auto-detection) */
  items?: BreadcrumbItem[];
  /** Home label (default: "Overview" for tab pages, "Home" otherwise) */
  homeLabel?: string;
  /** Home path (default: auto-detected based on current route) */
  homePath?: string;
  /** Current page label (if provided, overrides auto-detection) */
  currentLabel?: string;
  /** Show home icon (default: true) */
  showHomeIcon?: boolean;
  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// TAB CONFIGURATION FOR PAGES WITH TAB NAVIGATION
// ============================================================================

const TAB_PAGE_CONFIG: Record<
  string,
  {
    homePath: string;
    homeLabel: string;
    tabLabels: Record<string, string>;
    hideBreadcrumb?: boolean;
  }
> = {
  '/inwards': {
    homePath: '/inwards',
    homeLabel: 'Overview',
    tabLabels: {
      asn: 'Advance Shipping Notices',
      receiving: 'Receiving Dock',
      qc: 'Quality Control',
      staging: 'Staging Areas',
      putaway: 'Putaway Tasks',
      exceptions: 'Receiving Exceptions',
      dashboard: 'Dashboard',
    },
  },
  '/stock-control': {
    homePath: '/stock-control',
    homeLabel: 'Dashboard',
    tabLabels: {
      inventory: 'Inventory Management',
      transactions: 'Stock Transactions',
      'quick-actions': 'Quick Actions',
      movements: 'Stock Movements',
      adjustments: 'Stock Adjustments',
      dashboard: 'Dashboard',
    },
  },
  '/production': {
    homePath: '/production',
    homeLabel: 'Dashboard',
    tabLabels: {
      orders: 'Production Orders',
      schedule: 'Production Schedule',
      maintenance: 'Equipment Maintenance',
      dashboard: 'Dashboard',
    },
  },
  '/maintenance': {
    homePath: '/maintenance',
    homeLabel: 'Dashboard',
    tabLabels: {
      requests: 'Maintenance Requests',
      schedule: 'Maintenance Schedule',
      equipment: 'Equipment Management',
      history: 'Maintenance History',
      dashboard: 'Dashboard',
    },
  },
  '/sales': {
    homePath: '/sales',
    homeLabel: 'Dashboard',
    tabLabels: {
      customers: 'Customers',
      leads: 'Leads',
      opportunities: 'Opportunities',
      quotes: 'Quotes',
      orders: 'Sales Orders',
      dashboard: 'Dashboard',
    },
  },
  '/accounting': {
    homePath: '/accounting',
    homeLabel: 'Overview',
    tabLabels: {
      'chart-of-accounts': 'Chart of Accounts',
      'journal-entries': 'Journal Entries',
      'trial-balance': 'Trial Balance',
      'balance-sheet': 'Balance Sheet',
      'cash-flow': 'Cash Flow Statement',
      'ar-aging': 'Accounts Receivable Aging',
      'ap-aging': 'Accounts Payable Aging',
      'bank-reconciliation': 'Bank Reconciliation',
      'fixed-assets': 'Fixed Assets',
      budgeting: 'Budgeting',
      dashboard: 'Dashboard',
    },
  },
  '/rma': {
    homePath: '/rma',
    homeLabel: 'Overview',
    tabLabels: {
      requests: 'RMA Requests',
      inspections: 'Inspections',
      refunds: 'Refunds',
      dashboard: 'Dashboard',
    },
  },
  '/orders': {
    homePath: '/orders',
    homeLabel: 'Order Queue',
    tabLabels: {},
  },
  '/packing': {
    homePath: '/packing',
    homeLabel: 'Packing Queue',
    tabLabels: {},
  },
  '/cycle-counting': {
    homePath: '/cycle-counting',
    homeLabel: 'Cycle Count Plans',
    tabLabels: {
      schedules: 'Count Schedules',
      'root-cause': 'Root Cause Analysis',
      mobile: 'Mobile Counting',
    },
  },
  // Admin/Operations pages
  '/dashboard': {
    homePath: '/dashboard',
    homeLabel: 'Dashboard',
    tabLabels: {},
    hideBreadcrumb: true,
  },
  '/exceptions': {
    homePath: '/dashboard',
    homeLabel: 'Dashboard',
    tabLabels: {},
  },
  // Inventory pages
  '/bin-locations': {
    homePath: '/bin-locations',
    homeLabel: 'Bin Locations',
    tabLabels: {},
  },
  '/location-capacity': {
    homePath: '/location-capacity',
    homeLabel: 'Location Capacity',
    tabLabels: {},
  },
  '/quality-control': {
    homePath: '/quality-control',
    homeLabel: 'Quality Control',
    tabLabels: {},
  },
  // Warehouse Operations pages
  '/search': {
    homePath: '/search',
    homeLabel: 'Product Search',
    tabLabels: {},
  },
  '/waves': {
    homePath: '/waves',
    homeLabel: 'Wave Picking',
    tabLabels: {},
  },
  '/zones': {
    homePath: '/zones',
    homeLabel: 'Zone Picking',
    tabLabels: {},
  },
  '/slotting': {
    homePath: '/slotting',
    homeLabel: 'Slotting',
    tabLabels: {},
  },
  '/route-optimization': {
    homePath: '/route-optimization',
    homeLabel: 'Route Optimization',
    tabLabels: {},
  },
  '/shipped-orders': {
    homePath: '/shipped-orders',
    homeLabel: 'Shipped Orders',
    tabLabels: {},
  },
  // Admin pages
  '/user-roles': {
    homePath: '/user-roles',
    homeLabel: 'User Roles',
    tabLabels: {},
  },
  '/business-rules': {
    homePath: '/business-rules',
    homeLabel: 'Business Rules',
    tabLabels: {},
  },
  '/integrations': {
    homePath: '/integrations',
    homeLabel: 'Integrations',
    tabLabels: {},
  },
  '/reports': {
    homePath: '/reports',
    homeLabel: 'Reports',
    tabLabels: {},
  },
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function Breadcrumb({
  items,
  homeLabel,
  homePath,
  currentLabel,
  showHomeIcon = true,
  className = '',
}: BreadcrumbProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();

  // Get auth state to detect admin users in role-switching mode
  const user = useAuthStore(state => state.user);
  const activeRole = useAuthStore(state => state.activeRole);

  // Check if user is an admin in role-switching mode
  const isAdminInRoleView = user?.role === UserRole.ADMIN && activeRole !== null;

  // If items are provided, use them directly
  if (items) {
    return (
      <nav className={`flex items-center gap-2 text-sm ${className}`}>
        {isAdminInRoleView && (
          <>
            <button
              onClick={() => navigate('/dashboard')}
              className="flex items-center gap-1 text-purple-400 hover:text-purple-300 transition-colors"
            >
              <UserCircleIcon className="h-4 w-4" />
              <span>Admin Dashboard</span>
            </button>
            <ChevronRightIcon className="h-4 w-4 text-gray-600" />
          </>
        )}
        {items.map((item, index) => (
          <div key={index} className="flex items-center gap-2">
            {index > 0 && <ChevronRightIcon className="h-4 w-4 text-gray-600" />}
            {item.path ? (
              <button
                onClick={() => navigate(item.path!)}
                className="flex items-center gap-1 text-gray-400 hover:text-white transition-colors"
              >
                {item.icon && <item.icon className="h-4 w-4" />}
                <span>{item.label}</span>
              </button>
            ) : (
              <span className="text-white font-medium">{item.label}</span>
            )}
          </div>
        ))}
      </nav>
    );
  }

  // Auto-detect breadcrumb based on current route
  const pathname = location.pathname;

  // Determine base path and check if it's a tab page
  let basePath = pathname;
  let currentTab: string | null = null;
  let currentId: string | null = null;

  // Check for nested route patterns (e.g., /orders/:orderId/pick)
  const nestedRoutePatterns = [
    {
      pattern: /^\/orders\/([^/]+)\/pick$/,
      basePath: '/orders',
      label: (id: string) => `Picking Order ${id}`,
    },
    {
      pattern: /^\/packing\/([^/]+)\/pack$/,
      basePath: '/packing',
      label: (id: string) => `Packing Order ${id}`,
    },
    {
      pattern: /^\/cycle-counting\/([^/]+)$/,
      basePath: '/cycle-counting',
      label: (id: string) => `Cycle Count ${id}`,
    },
    {
      pattern: /^\/cycle-counting\/mobile\/([^/]+)$/,
      basePath: '/cycle-counting',
      label: (_id: string) => 'Mobile Counting',
    },
  ];

  let nestedRouteMatch: { basePath: string; currentLabel: string } | null = null;

  for (const routePattern of nestedRoutePatterns) {
    const match = pathname.match(routePattern.pattern);
    if (match) {
      nestedRouteMatch = {
        basePath: routePattern.basePath,
        currentLabel: routePattern.label(match[1]),
      };
      break;
    }
  }

  // Check for accounting sub-pages
  if (pathname.startsWith('/accounting/') && pathname !== '/accounting') {
    const subPath = pathname.replace('/accounting/', '');
    const accountingConfig = TAB_PAGE_CONFIG['/accounting'];
    if (accountingConfig.tabLabels[subPath]) {
      return (
        <nav className={`mb-6 flex items-center gap-2 text-sm ${className}`}>
          {isAdminInRoleView && (
            <>
              <button
                onClick={() => navigate('/dashboard')}
                className="flex items-center gap-1 text-purple-400 hover:text-purple-300 transition-colors"
              >
                <UserCircleIcon className="h-4 w-4" />
                <span>Admin Dashboard</span>
              </button>
              <ChevronRightIcon className="h-4 w-4 text-gray-600" />
            </>
          )}
          <button
            onClick={() => navigate('/accounting')}
            className="flex items-center gap-1 text-gray-400 hover:text-white transition-colors"
          >
            {showHomeIcon && <HomeIcon className="h-4 w-4" />}
            <span>{homeLabel || accountingConfig.homeLabel}</span>
          </button>
          <ChevronRightIcon className="h-4 w-4 text-gray-600" />
          <span className="text-white font-medium">
            {currentLabel || accountingConfig.tabLabels[subPath]}
          </span>
        </nav>
      );
    }
  }

  // Handle nested routes
  if (nestedRouteMatch) {
    const config = TAB_PAGE_CONFIG[nestedRouteMatch.basePath];
    return (
      <nav className={`mb-6 flex items-center gap-2 text-sm ${className}`}>
        {isAdminInRoleView && (
          <>
            <button
              onClick={() => navigate('/dashboard')}
              className="flex items-center gap-1 text-purple-400 hover:text-purple-300 transition-colors"
            >
              <UserCircleIcon className="h-4 w-4" />
              <span>Admin Dashboard</span>
            </button>
            <ChevronRightIcon className="h-4 w-4 text-gray-600" />
          </>
        )}
        <button
          onClick={() => navigate(nestedRouteMatch!.basePath)}
          className="flex items-center gap-1 text-gray-400 hover:text-white transition-colors"
        >
          {showHomeIcon && <HomeIcon className="h-4 w-4" />}
          <span>{homeLabel || config?.homeLabel || 'Overview'}</span>
        </button>
        <ChevronRightIcon className="h-4 w-4 text-gray-600" />
        <span className="text-white font-medium">
          {currentLabel || nestedRouteMatch.currentLabel}
        </span>
      </nav>
    );
  }

  // Handle tab-based pages
  const searchParams = new URLSearchParams(location.search);
  const tabParam = searchParams.get('tab');

  // Find matching base path
  for (const [path, config] of Object.entries(TAB_PAGE_CONFIG)) {
    if (pathname === path || pathname === path + '/') {
      // Don't show breadcrumb for pages with hideBreadcrumb flag
      if (config.hideBreadcrumb) {
        return null;
      }

      basePath = path;
      currentTab = tabParam;

      // If on dashboard/overview tab, show Admin Dashboard link if admin in role view
      if (!currentTab || currentTab === 'dashboard' || currentTab === 'overview') {
        if (isAdminInRoleView) {
          return (
            <nav className={`mb-6 flex items-center gap-2 text-sm ${className}`}>
              <button
                onClick={() => navigate('/dashboard')}
                className="flex items-center gap-1 text-purple-400 hover:text-purple-300 transition-colors"
              >
                <UserCircleIcon className="h-4 w-4" />
                <span>Admin Dashboard</span>
              </button>
              <ChevronRightIcon className="h-4 w-4 text-gray-600" />
              <span className="text-gray-400">{config.homeLabel}</span>
            </nav>
          );
        }
        return null;
      }

      return (
        <nav className={`mb-6 flex items-center gap-2 text-sm ${className}`}>
          {isAdminInRoleView && (
            <>
              <button
                onClick={() => navigate('/dashboard')}
                className="flex items-center gap-1 text-purple-400 hover:text-purple-300 transition-colors"
              >
                <UserCircleIcon className="h-4 w-4" />
                <span>Admin Dashboard</span>
              </button>
              <ChevronRightIcon className="h-4 w-4 text-gray-600" />
            </>
          )}
          <button
            onClick={() => {
              // Clear tab parameter to return to overview/dashboard
              navigate(path);
            }}
            className="flex items-center gap-1 text-gray-400 hover:text-white transition-colors"
          >
            {showHomeIcon && <HomeIcon className="h-4 w-4" />}
            <span>{homeLabel || config.homeLabel}</span>
          </button>
          <ChevronRightIcon className="h-4 w-4 text-gray-600" />
          <span className="text-white font-medium">
            {currentLabel || (currentTab && config.tabLabels[currentTab]) || currentTab}
          </span>
        </nav>
      );
    }
  }

  // Default: no breadcrumb for pages without special navigation
  return null;
}

export default Breadcrumb;
