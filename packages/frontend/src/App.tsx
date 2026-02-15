/**
 * App component
 *
 * Main application with routing and authentication
 * Uses lazy loading for route-based code splitting
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Suspense, lazy, useEffect, useState } from 'react';
import { useAuthStore, useUIStore } from '@/stores';
import { NotificationCenter, ToastProvider, ErrorBoundary } from '@/components/shared';
import { useAdminRoleAutoSwitch } from '@/hooks/useAdminRoleAutoSwitch';
import webSocketService from '@/services/WebSocketService';
import { UserRole } from '@opsui/shared';

// ============================================================================
// LAZY LOADED PAGE COMPONENTS
// ============================================================================

const LoginPage = lazy(() => import('@/pages/LoginPage').then(m => ({ default: m.LoginPage })));
const DashboardPage = lazy(() => import('@/pages/DashboardPage').then(m => ({ default: m.DashboardPage })));
const OrderQueuePage = lazy(() => import('@/pages/OrderQueuePage').then(m => ({ default: m.OrderQueuePage })));
const PickingPage = lazy(() => import('@/pages/PickingPage').then(m => ({ default: m.PickingPage })));
const PackingQueuePage = lazy(() => import('@/pages/PackingQueuePage').then(m => ({ default: m.PackingQueuePage })));
const PackingPage = lazy(() => import('@/pages/PackingPage').then(m => ({ default: m.PackingPage })));
const ShippedOrdersPage = lazy(() => import('@/pages/ShippedOrdersPage').then(m => ({ default: m.ShippedOrdersPage })));
const StockControlPage = lazy(() => import('@/pages/StockControlPage').then(m => ({ default: m.StockControlPage })));
const InwardsGoodsPage = lazy(() => import('@/pages/InwardsGoodsPage').then(m => ({ default: m.InwardsGoodsPage })));
const ProductionPage = lazy(() => import('@/pages/ProductionPage').then(m => ({ default: m.ProductionPage })));
const MaintenancePage = lazy(() => import('@/pages/MaintenancePage').then(m => ({ default: m.MaintenancePage })));
const RMAPage = lazy(() => import('@/pages/RMAPage').then(m => ({ default: m.RMAPage })));
const SalesPage = lazy(() => import('@/pages/SalesPage').then(m => ({ default: m.SalesPage })));
const AdminSettingsPage = lazy(() => import('@/pages/AdminSettingsPage').then(m => ({ default: m.AdminSettingsPage })));
const UserRolesPage = lazy(() => import('@/pages/UserRolesPage').then(m => ({ default: m.UserRolesPage })));
const RolesManagementPage = lazy(() => import('@/pages/RolesManagementPage').then(m => ({ default: m.RolesManagementPage })));
const ExceptionsPage = lazy(() => import('@/pages/ExceptionsPage').then(m => ({ default: m.ExceptionsPage })));
const CycleCountingPage = lazy(() => import('@/pages/CycleCountingPage').then(m => ({ default: m.CycleCountingPage })));
const CycleCountDetailPage = lazy(() => import('@/pages/CycleCountDetailPage').then(m => ({ default: m.CycleCountDetailPage })));
const LocationCapacityPage = lazy(() => import('@/pages/LocationCapacityPage').then(m => ({ default: m.LocationCapacityPage })));
const BinLocationsPage = lazy(() => import('@/pages/BinLocationsPage').then(m => ({ default: m.BinLocationsPage })));
const QualityControlPage = lazy(() => import('@/pages/QualityControlPage').then(m => ({ default: m.QualityControlPage })));
const BusinessRulesPage = lazy(() => import('@/pages/BusinessRulesPage').then(m => ({ default: m.BusinessRulesPage })));
const ReportsPage = lazy(() => import('@/pages/ReportsPage').then(m => ({ default: m.ReportsPage })));
const IntegrationsPage = lazy(() => import('@/pages/IntegrationsPage').then(m => ({ default: m.IntegrationsPage })));
const ProductSearchPage = lazy(() => import('@/pages/ProductSearchPage').then(m => ({ default: m.ProductSearchPage })));
const WavePickingPage = lazy(() => import('@/pages/WavePickingPage').then(m => ({ default: m.WavePickingPage })));
const ZonePickingPage = lazy(() => import('@/pages/ZonePickingPage').then(m => ({ default: m.ZonePickingPage })));
const SlottingPage = lazy(() => import('@/pages/SlottingPage').then(m => ({ default: m.SlottingPage })));
const RouteOptimizationPage = lazy(() => import('@/pages/RouteOptimizationPage').then(m => ({ default: m.RouteOptimizationPage })));
const DeveloperPage = lazy(() => import('@/pages/DeveloperPage').then(m => ({ default: m.DeveloperPage })));
const NotificationPreferencesPage = lazy(() => import('@/pages/NotificationPreferencesPage').then(m => ({ default: m.NotificationPreferencesPage })));
const NotificationsPage = lazy(() => import('@/pages/NotificationsPage').then(m => ({ default: m.NotificationsPage })));
const MobileScanningPage = lazy(() => import('@/pages/MobileScanningPage').then(m => ({ default: m.MobileScanningPage })));
const ScheduleManagementPage = lazy(() => import('@/pages/ScheduleManagementPage').then(m => ({ default: m.ScheduleManagementPage })));
const RootCauseAnalysisPage = lazy(() => import('@/pages/RootCauseAnalysisPage').then(m => ({ default: m.RootCauseAnalysisPage })));
const AccountingPage = lazy(() => import('@/pages/AccountingPage').then(m => ({ default: m.AccountingPage })));
const ChartOfAccountsPage = lazy(() => import('@/pages/ChartOfAccountsPage').then(m => ({ default: m.ChartOfAccountsPage })));
const JournalEntriesPage = lazy(() => import('@/pages/JournalEntriesPage').then(m => ({ default: m.JournalEntriesPage })));
const TrialBalancePage = lazy(() => import('@/pages/TrialBalancePage').then(m => ({ default: m.TrialBalancePage })));
const BalanceSheetPage = lazy(() => import('@/pages/BalanceSheetPage').then(m => ({ default: m.BalanceSheetPage })));
const CashFlowPage = lazy(() => import('@/pages/CashFlowPage').then(m => ({ default: m.CashFlowPage })));
const ARAgingPage = lazy(() => import('@/pages/ARAgingPage').then(m => ({ default: m.ARAgingPage })));
const APAgingPage = lazy(() => import('@/pages/APAgingPage').then(m => ({ default: m.APAgingPage })));
const BankReconciliationPage = lazy(() => import('@/pages/BankReconciliationPage').then(m => ({ default: m.BankReconciliationPage })));
const FixedAssetsPage = lazy(() => import('@/pages/FixedAssetsPage').then(m => ({ default: m.FixedAssetsPage })));
const BudgetingPage = lazy(() => import('@/pages/BudgetingPage').then(m => ({ default: m.BudgetingPage })));
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage').then(m => ({ default: m.NotFoundPage })));
// HR & Payroll pages
const EmployeesPage = lazy(() => import('@/pages/EmployeesPage').then(m => ({ default: m.EmployeesPage })));
const TimesheetsPage = lazy(() => import('@/pages/TimesheetsPage').then(m => ({ default: m.TimesheetsPage })));
const PayrollDashboardPage = lazy(() => import('@/pages/PayrollDashboardPage').then(m => ({ default: m.PayrollDashboardPage })));
const PayrollProcessingPage = lazy(() => import('@/pages/PayrollProcessingPage').then(m => ({ default: m.PayrollProcessingPage })));
const PayrollRunsPage = lazy(() => import('@/pages/PayrollRunsPage').then(m => ({ default: m.PayrollRunsPage })));
const LeaveRequestsPage = lazy(() => import('@/pages/LeaveRequestsPage').then(m => ({ default: m.LeaveRequestsPage })));
const HRSettingsPage = lazy(() => import('@/pages/HRSettingsPage').then(m => ({ default: m.HRSettingsPage })));

// ============================================================================
// PAGE LOADING FALLBACK
// ============================================================================

function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center dark:bg-gray-900 bg-gray-50">
      <div className="flex flex-col items-center gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent" />
        <p className="text-sm dark:text-gray-400 text-gray-600">Loading...</p>
      </div>
    </div>
  );
}

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
      // Prevent uncaught errors from crashing the app
      throwOnError: false,
    },
    mutations: {
      throwOnError: false,
    },
  },
});

// ============================================================================
// PROTECTED ROUTE COMPONENT
// ============================================================================

function ProtectedRoute({
  children,
  requiredRoles,
}: {
  children: React.ReactNode;
  requiredRoles?: UserRole[];
}) {
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);
  const user = useAuthStore(state => state.user);
  const activeRole = useAuthStore(state => state.activeRole);
  const getEffectiveRole = useAuthStore(state => state.getEffectiveRole);

  // Use effective role (active role if set, otherwise base role) for authorization
  const effectiveRole = getEffectiveRole();

  // Not authenticated - redirect to login
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  // Check role requirements using effective role
  if (requiredRoles && requiredRoles.length > 0) {
    // Special case: Admin/Supervisor users with an active worker role can still access
    // their management routes. This allows useAdminRoleAutoSwitch hook to properly
    // clear the active role when navigating from a worker view back to admin pages.
    const isManagerWithWorkerRole =
      (user.role === UserRole.ADMIN || user.role === UserRole.SUPERVISOR) &&
      activeRole !== null &&
      activeRole !== user.role;

    // Check if user has access via effective role OR is manager with worker role accessing their management routes
    let hasRole = effectiveRole ? requiredRoles.includes(effectiveRole) : false;

    // Admin users with active worker role can access ADMIN required routes
    if (
      user.role === UserRole.ADMIN &&
      isManagerWithWorkerRole &&
      requiredRoles.includes(UserRole.ADMIN)
    ) {
      hasRole = true;
    }

    // Supervisor users with active worker role can access SUPERVISOR required routes
    if (
      user.role === UserRole.SUPERVISOR &&
      isManagerWithWorkerRole &&
      requiredRoles.includes(UserRole.SUPERVISOR)
    ) {
      hasRole = true;
    }

    if (!hasRole) {
      // Redirect to appropriate page based on effective role
      if (effectiveRole === 'PICKER') {
        return <Navigate to="/orders" replace />;
      }
      if (effectiveRole === 'PACKER') {
        return <Navigate to="/packing" replace />;
      }
      if (effectiveRole === 'STOCK_CONTROLLER') {
        return <Navigate to="/stock-control" replace />;
      }
      if (effectiveRole === ('INWARDS' as UserRole)) {
        return <Navigate to="/inwards" replace />;
      }
      if (effectiveRole === ('PRODUCTION' as UserRole)) {
        return <Navigate to="/production" replace />;
      }
      if (effectiveRole === ('MAINTENANCE' as UserRole)) {
        return <Navigate to="/maintenance" replace />;
      }
      if (effectiveRole === ('SALES' as UserRole)) {
        return <Navigate to="/sales" replace />;
      }
      if (effectiveRole === ('RMA' as UserRole)) {
        return <Navigate to="/rma" replace />;
      }
      return <Navigate to="/dashboard" replace />;
    }
  }

  return <Suspense fallback={<PageLoader />}>{children}</Suspense>;
}

// ============================================================================
// PUBLIC ROUTE COMPONENT (for login page)
// ============================================================================

function PublicRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);
  const userRole = useAuthStore(state => state.user?.role);

  // Already authenticated - redirect to appropriate page
  if (isAuthenticated) {
    if (userRole === 'PICKER') {
      return <Navigate to="/orders" replace />;
    }
    if (userRole === 'PACKER') {
      return <Navigate to="/packing" replace />;
    }
    if (userRole === 'STOCK_CONTROLLER') {
      return <Navigate to="/stock-control" replace />;
    }
    if (userRole === ('INWARDS' as UserRole)) {
      return <Navigate to="/inwards" replace />;
    }
    if (userRole === ('PRODUCTION' as UserRole)) {
      return <Navigate to="/production" replace />;
    }
    if (userRole === ('MAINTENANCE' as UserRole)) {
      return <Navigate to="/maintenance" replace />;
    }
    if (userRole === ('SALES' as UserRole)) {
      return <Navigate to="/sales" replace />;
    }
    return <Navigate to="/dashboard" replace />;
  }

  return <Suspense fallback={<PageLoader />}>{children}</Suspense>;
}

// ============================================================================
// NAVIGATION TRACKER COMPONENT
// ============================================================================

function NavigationTracker() {
  const location = useLocation();
  const userId = useAuthStore(state => state.user?.userId);
  const userRole = useAuthStore(state => state.user?.role);
  const accessToken = useAuthStore(state => state.accessToken);

  // Store the last known view for workers (persists across tab switches)
  const [lastKnownView, setLastKnownView] = useState<string>('');
  // Track if page is visible to know when to update view on return
  const [isPageVisible, setIsPageVisible] = useState(true);

  useEffect(() => {
    // Handle visibility change for idle status
    const handleVisibilityChange = () => {
      const wasVisible = isPageVisible;
      const isVisible = !document.hidden;
      setIsPageVisible(isVisible);

      // Update idle status when visibility changes for workers (picker, packer, stock controller, inwards, production, maintenance, sales)
      if (
        userId &&
        (userRole === 'PICKER' ||
          userRole === 'PACKER' ||
          userRole === 'STOCK_CONTROLLER' ||
          userRole === ('INWARDS' as UserRole) ||
          userRole === ('PRODUCTION' as UserRole) ||
          userRole === ('MAINTENANCE' as UserRole) ||
          userRole === ('SALES' as UserRole))
      ) {
        const updateIdleStatus = async () => {
          try {
            await fetch('/api/v1/auth/set-idle', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${accessToken}`,
              },
            });
          } catch (error) {
            // Silent fail
          }
        };

        // Set to idle when page is hidden
        if (isVisible === false) {
          updateIdleStatus();
        }
        // When returning to tab, update current view to set user back to active
        else if (isVisible === true && wasVisible === false && lastKnownView) {
          // Update the view which will set the user back to active
          fetch('/api/v1/auth/current-view', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify({ view: lastKnownView }),
          }).catch(() => {
            // Silent fail
          });
        }
      }
    };

    // Listen for visibility changes
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [userId, userRole, accessToken, lastKnownView, isPageVisible]);

  useEffect(() => {
    // Only track navigation for authenticated users
    if (!userId || !userRole) {
      return;
    }

    // Convert path to display text for backend
    let displayView: string = '';

    // Parse URL search params for stock control tab tracking
    const searchParams = new URLSearchParams(location.search);
    const tabParam = searchParams.get('tab');

    // Check if user is on their primary work page
    const isPickerOnPage =
      userRole === 'PICKER' &&
      (location.pathname === '/orders' || location.pathname === '/orders/');
    const isPackerOnPage =
      userRole === 'PACKER' &&
      (location.pathname === '/packing' || location.pathname === '/packing/');
    const isStockControllerOnPage =
      userRole === 'STOCK_CONTROLLER' &&
      (location.pathname === '/stock-control' || location.pathname === '/stock-control/');
    const isInwardsOnPage =
      userRole === ('INWARDS' as UserRole) &&
      (location.pathname === '/inwards' || location.pathname === '/inwards/');
    const isProductionOnPage =
      userRole === ('PRODUCTION' as UserRole) &&
      (location.pathname === '/production' || location.pathname === '/production/');
    const isMaintenanceOnPage =
      userRole === ('MAINTENANCE' as UserRole) &&
      (location.pathname === '/maintenance' || location.pathname === '/maintenance/');
    const isSalesOnPage =
      userRole === ('SALES' as UserRole) &&
      (location.pathname === '/sales' || location.pathname === '/sales/');

    if (location.pathname === '/orders' || location.pathname === '/orders/') {
      displayView = 'Order Queue';
    } else if (location.pathname.includes('/orders/') && location.pathname.includes('/pick')) {
      // Extract order ID from path like /orders/SO1234/pick or /orders/ORD-12345678-1234/pick
      const soMatch = location.pathname.match(/SO\d{4}/);
      const ordMatch = location.pathname.match(/ORD-\d{8}-\d{4}/);
      const match = soMatch || ordMatch;
      displayView = match ? `Picking Order ${match[0]}` : 'Picking Order';
    } else if (location.pathname === '/packing' || location.pathname === '/packing/') {
      displayView = 'Packing Queue';
    } else if (location.pathname.includes('/packing/') && location.pathname.includes('/pack')) {
      // Extract order ID from path like /packing/SO1234/pack or /packing/ORD-12345678-1234/pack
      const soMatch = location.pathname.match(/SO\d{4}/);
      const ordMatch = location.pathname.match(/ORD-\d{8}-\d{4}/);
      const match = soMatch || ordMatch;
      displayView = match ? `Packing Order ${match[0]}` : 'Packing Order';
    } else if (location.pathname === '/dashboard') {
      displayView = 'Dashboard';
    } else if (isStockControllerOnPage) {
      // Map tab parameter to view name
      const tabViewMap: Record<string, string> = {
        dashboard: 'Stock Control Dashboard',
        inventory: 'Stock Control - Inventory',
        transactions: 'Stock Control - Transactions',
        'quick-actions': 'Stock Control - Quick Actions',
      };
      displayView = tabViewMap[tabParam || 'dashboard'] || 'Stock Control Dashboard';
    } else if (isInwardsOnPage) {
      // Map tab parameter to view name for inwards goods
      const tabViewMap: Record<string, string> = {
        dashboard: 'Inwards Goods Dashboard',
        asn: 'Inwards Goods - ASNs',
        receiving: 'Inwards Goods - Receiving',
        putaway: 'Inwards Goods - Putaway',
      };
      displayView = tabViewMap[tabParam || 'dashboard'] || 'Inwards Goods Dashboard';
    } else if (isProductionOnPage) {
      // Map tab parameter to view name for production
      const tabViewMap: Record<string, string> = {
        dashboard: 'Production Dashboard',
        orders: 'Production - Orders',
        schedule: 'Production - Schedule',
        maintenance: 'Production - Maintenance',
      };
      displayView = tabViewMap[tabParam || 'dashboard'] || 'Production Dashboard';
    } else if (isMaintenanceOnPage) {
      // Map tab parameter to view name for maintenance
      const tabViewMap: Record<string, string> = {
        dashboard: 'Maintenance Dashboard',
        requests: 'Maintenance - Requests',
        schedule: 'Maintenance - Schedule',
        equipment: 'Maintenance - Equipment',
      };
      displayView = tabViewMap[tabParam || 'dashboard'] || 'Maintenance Dashboard';
    } else if (isSalesOnPage) {
      // Map tab parameter to view name for sales
      const tabViewMap: Record<string, string> = {
        dashboard: 'Sales Dashboard',
        customers: 'Sales - Customers',
        leads: 'Sales - Leads',
        opportunities: 'Sales - Opportunities',
        quotes: 'Sales - Quotes',
      };
      displayView = tabViewMap[tabParam || 'dashboard'] || 'Sales Dashboard';
    } else if (location.pathname === '/login') {
      displayView = 'Login';
    } else if (
      userRole === 'PICKER' ||
      userRole === 'PACKER' ||
      userRole === 'STOCK_CONTROLLER' ||
      userRole === ('INWARDS' as UserRole) ||
      userRole === ('PRODUCTION' as UserRole) ||
      userRole === ('MAINTENANCE' as UserRole) ||
      userRole === ('SALES' as UserRole)
    ) {
      // Worker on any other page - use last known view if available
      displayView = lastKnownView || '';
    } else {
      // For other roles, show the path
      displayView = location.pathname;
    }

    // For workers, store the view when on their primary work page
    if (
      (isPickerOnPage ||
        isPackerOnPage ||
        isStockControllerOnPage ||
        isInwardsOnPage ||
        isProductionOnPage ||
        isMaintenanceOnPage ||
        isSalesOnPage) &&
      displayView
    ) {
      setLastKnownView(displayView);
    }

    // Update current view in backend on navigation (silent, no console spam)
    const updateCurrentView = async () => {
      try {
        await fetch(`${import.meta.env.VITE_API_BASE_URL || '/api/v1'}/auth/current-view`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ view: displayView }),
        });
      } catch (error) {
        // Silent fail
      }
    };

    updateCurrentView();
  }, [location.pathname, location.search, userId, userRole, accessToken, lastKnownView]);

  return null; // This component doesn't render anything
}

// ============================================================================
// APP INNER COMPONENT (inside Router)
// ============================================================================

function AppInner() {
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);
  const userRole = useAuthStore(state => state.user?.role);

  // Auto-switch admin users back to ADMIN role when visiting admin pages
  useAdminRoleAutoSwitch();

  // Determine default route based on role
  const getDefaultRoute = () => {
    if (!isAuthenticated) return '/login';
    if (userRole === 'PICKER') return '/orders';
    if (userRole === 'PACKER') return '/packing';
    if (userRole === 'STOCK_CONTROLLER') return '/stock-control';
    if (userRole === ('INWARDS' as UserRole)) return '/inwards';
    if (userRole === ('DISPATCH' as UserRole)) return '/shipped-orders';
    if (userRole === ('PRODUCTION' as UserRole)) return '/production';
    if (userRole === ('MAINTENANCE' as UserRole)) return '/maintenance';
    if (userRole === ('SALES' as UserRole)) return '/sales';
    if (userRole === ('RMA' as UserRole)) return '/rma';
    if (userRole === ('ACCOUNTING' as UserRole)) return '/accounting';
    return '/dashboard';
  };

  return (
    <>
      <NavigationTracker />
      <Routes>
        {/* Public routes */}
        <Route
          path="/login"
          element={
            <PublicRoute>
              <LoginPage />
            </PublicRoute>
          }
        />

        {/* Picker routes */}
        <Route
          path="/orders"
          element={
            <ProtectedRoute requiredRoles={[UserRole.PICKER, UserRole.ADMIN, UserRole.SUPERVISOR]}>
              <OrderQueuePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/orders/:orderId/pick"
          element={
            <ProtectedRoute requiredRoles={[UserRole.PICKER, UserRole.ADMIN, UserRole.SUPERVISOR]}>
              <PickingPage />
            </ProtectedRoute>
          }
        />

        {/* Packer routes */}
        <Route
          path="/packing"
          element={
            <ProtectedRoute requiredRoles={[UserRole.PACKER, UserRole.ADMIN, UserRole.SUPERVISOR]}>
              <PackingQueuePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/packing/:orderId/pack"
          element={
            <ProtectedRoute requiredRoles={[UserRole.PACKER, UserRole.ADMIN, UserRole.SUPERVISOR]}>
              <PackingPage />
            </ProtectedRoute>
          }
        />

        {/* Shipping routes */}
        <Route
          path="/shipped-orders"
          element={
            <ProtectedRoute requiredRoles={[UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.PACKER]}>
              <ShippedOrdersPage />
            </ProtectedRoute>
          }
        />

        {/* Admin/Supervisor routes */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute requiredRoles={[UserRole.ADMIN, UserRole.SUPERVISOR]}>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/exceptions"
          element={
            <ProtectedRoute>
              <ExceptionsPage />
            </ProtectedRoute>
          }
        />

        {/* Stock Controller routes */}
        <Route
          path="/stock-control"
          element={
            <ProtectedRoute
              requiredRoles={['STOCK_CONTROLLER' as UserRole, UserRole.ADMIN, UserRole.SUPERVISOR]}
            >
              <StockControlPage />
            </ProtectedRoute>
          }
        />

        {/* Inwards Goods routes */}
        <Route
          path="/inwards"
          element={
            <ProtectedRoute
              requiredRoles={['INWARDS' as UserRole, UserRole.ADMIN, UserRole.SUPERVISOR]}
            >
              <InwardsGoodsPage />
            </ProtectedRoute>
          }
        />

        {/* Production routes */}
        <Route
          path="/production"
          element={
            <ProtectedRoute
              requiredRoles={['PRODUCTION' as UserRole, UserRole.ADMIN, UserRole.SUPERVISOR]}
            >
              <ProductionPage />
            </ProtectedRoute>
          }
        />

        {/* Maintenance routes */}
        <Route
          path="/maintenance"
          element={
            <ProtectedRoute
              requiredRoles={['MAINTENANCE' as UserRole, UserRole.ADMIN, UserRole.SUPERVISOR]}
            >
              <MaintenancePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/rma"
          element={
            <ProtectedRoute
              requiredRoles={['RMA' as UserRole, UserRole.ADMIN, UserRole.SUPERVISOR]}
            >
              <RMAPage />
            </ProtectedRoute>
          }
        />

        {/* Sales routes */}
        <Route
          path="/sales"
          element={
            <ProtectedRoute
              requiredRoles={['SALES' as UserRole, UserRole.ADMIN, UserRole.SUPERVISOR]}
            >
              <SalesPage />
            </ProtectedRoute>
          }
        />

        {/* Phase 2: Operational Excellence routes */}
        <Route
          path="/cycle-counting"
          element={
            <ProtectedRoute
              requiredRoles={[
                UserRole.ADMIN,
                UserRole.SUPERVISOR,
                UserRole.STOCK_CONTROLLER,
                UserRole.PICKER,
              ]}
            >
              <CycleCountingPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/cycle-counting/:planId"
          element={
            <ProtectedRoute
              requiredRoles={[
                UserRole.ADMIN,
                UserRole.SUPERVISOR,
                UserRole.STOCK_CONTROLLER,
                UserRole.PICKER,
              ]}
            >
              <CycleCountDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/cycle-counting/mobile/:planId"
          element={
            <ProtectedRoute
              requiredRoles={[
                UserRole.ADMIN,
                UserRole.SUPERVISOR,
                UserRole.STOCK_CONTROLLER,
                UserRole.PICKER,
              ]}
            >
              <MobileScanningPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/cycle-counting/schedules"
          element={
            <ProtectedRoute requiredRoles={[UserRole.ADMIN, UserRole.SUPERVISOR]}>
              <ScheduleManagementPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/cycle-counting/root-cause"
          element={
            <ProtectedRoute
              requiredRoles={[UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.STOCK_CONTROLLER]}
            >
              <RootCauseAnalysisPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/location-capacity"
          element={
            <ProtectedRoute requiredRoles={[UserRole.ADMIN, UserRole.SUPERVISOR]}>
              <LocationCapacityPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/bin-locations"
          element={
            <ProtectedRoute
              requiredRoles={['STOCK_CONTROLLER' as UserRole, UserRole.ADMIN, UserRole.SUPERVISOR]}
            >
              <BinLocationsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/quality-control"
          element={
            <ProtectedRoute requiredRoles={[UserRole.ADMIN, UserRole.SUPERVISOR]}>
              <QualityControlPage />
            </ProtectedRoute>
          }
        />

        {/* Phase 3: Advanced Features routes */}
        <Route
          path="/business-rules"
          element={
            <ProtectedRoute requiredRoles={[UserRole.ADMIN, UserRole.SUPERVISOR]}>
              <BusinessRulesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/reports"
          element={
            <ProtectedRoute requiredRoles={[UserRole.ADMIN, UserRole.SUPERVISOR]}>
              <ReportsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/integrations"
          element={
            <ProtectedRoute requiredRoles={[UserRole.ADMIN, UserRole.SUPERVISOR]}>
              <IntegrationsPage />
            </ProtectedRoute>
          }
        />

        {/* Warehouse Operations routes */}
        <Route
          path="/search"
          element={
            <ProtectedRoute
              requiredRoles={[
                UserRole.ADMIN,
                UserRole.SUPERVISOR,
                UserRole.PICKER,
                'STOCK_CONTROLLER' as UserRole,
              ]}
            >
              <ProductSearchPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/waves"
          element={
            <ProtectedRoute requiredRoles={[UserRole.ADMIN, UserRole.SUPERVISOR]}>
              <WavePickingPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/zones"
          element={
            <ProtectedRoute requiredRoles={[UserRole.ADMIN, UserRole.SUPERVISOR]}>
              <ZonePickingPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/slotting"
          element={
            <ProtectedRoute requiredRoles={[UserRole.ADMIN, UserRole.SUPERVISOR]}>
              <SlottingPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/route-optimization"
          element={
            <ProtectedRoute requiredRoles={[UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.PICKER]}>
              <RouteOptimizationPage />
            </ProtectedRoute>
          }
        />
        {/* User Roles route */}
        <Route
          path="/user-roles"
          element={
            <ProtectedRoute requiredRoles={[UserRole.ADMIN]}>
              <UserRolesPage />
            </ProtectedRoute>
          }
        />

        {/* Roles Management route - Custom roles with permissions */}
        <Route
          path="/roles-management"
          element={
            <ProtectedRoute requiredRoles={[UserRole.ADMIN]}>
              <RolesManagementPage />
            </ProtectedRoute>
          }
        />

        {/* Role Settings route - accessible to all authenticated users */}
        <Route
          path="/role-settings"
          element={
            <ProtectedRoute>
              <AdminSettingsPage />
            </ProtectedRoute>
          }
        />

        {/* Accounting & Financials route - Admin/Supervisor/Accounting only */}
        <Route
          path="/accounting"
          element={
            <ProtectedRoute
              requiredRoles={[UserRole.ADMIN, UserRole.SUPERVISOR, 'ACCOUNTING' as UserRole]}
            >
              <AccountingPage />
            </ProtectedRoute>
          }
        />

        {/* Accounting Sub-pages - Phase 1: Core Accounting */}
        <Route
          path="/accounting/chart-of-accounts"
          element={
            <ProtectedRoute
              requiredRoles={[UserRole.ADMIN, UserRole.SUPERVISOR, 'ACCOUNTING' as UserRole]}
            >
              <ChartOfAccountsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/accounting/journal-entries"
          element={
            <ProtectedRoute
              requiredRoles={[UserRole.ADMIN, UserRole.SUPERVISOR, 'ACCOUNTING' as UserRole]}
            >
              <JournalEntriesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/accounting/trial-balance"
          element={
            <ProtectedRoute
              requiredRoles={[UserRole.ADMIN, UserRole.SUPERVISOR, 'ACCOUNTING' as UserRole]}
            >
              <TrialBalancePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/accounting/balance-sheet"
          element={
            <ProtectedRoute
              requiredRoles={[UserRole.ADMIN, UserRole.SUPERVISOR, 'ACCOUNTING' as UserRole]}
            >
              <BalanceSheetPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/accounting/cash-flow"
          element={
            <ProtectedRoute
              requiredRoles={[UserRole.ADMIN, UserRole.SUPERVISOR, 'ACCOUNTING' as UserRole]}
            >
              <CashFlowPage />
            </ProtectedRoute>
          }
        />

        {/* Accounting Sub-pages - Phase 2 & 3: Advanced Features */}
        <Route
          path="/accounting/ar-aging"
          element={
            <ProtectedRoute
              requiredRoles={[UserRole.ADMIN, UserRole.SUPERVISOR, 'ACCOUNTING' as UserRole]}
            >
              <ARAgingPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/accounting/ap-aging"
          element={
            <ProtectedRoute
              requiredRoles={[UserRole.ADMIN, UserRole.SUPERVISOR, 'ACCOUNTING' as UserRole]}
            >
              <APAgingPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/accounting/bank-reconciliation"
          element={
            <ProtectedRoute
              requiredRoles={[UserRole.ADMIN, UserRole.SUPERVISOR, 'ACCOUNTING' as UserRole]}
            >
              <BankReconciliationPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/accounting/fixed-assets"
          element={
            <ProtectedRoute
              requiredRoles={[UserRole.ADMIN, UserRole.SUPERVISOR, 'ACCOUNTING' as UserRole]}
            >
              <FixedAssetsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/accounting/budgeting"
          element={
            <ProtectedRoute
              requiredRoles={[UserRole.ADMIN, UserRole.SUPERVISOR, 'ACCOUNTING' as UserRole]}
            >
              <BudgetingPage />
            </ProtectedRoute>
          }
        />

        {/* HR & Payroll routes */}
        <Route
          path="/hr/employees"
          element={
            <ProtectedRoute
              requiredRoles={[UserRole.ADMIN, 'HR_MANAGER' as UserRole, 'HR_ADMIN' as UserRole]}
            >
              <EmployeesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/hr/timesheets"
          element={
            <ProtectedRoute
              requiredRoles={[
                UserRole.ADMIN,
                'HR_MANAGER' as UserRole,
                'HR_ADMIN' as UserRole,
                UserRole.PICKER,
                UserRole.PACKER,
              ]}
            >
              <TimesheetsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/hr/payroll"
          element={
            <ProtectedRoute
              requiredRoles={[UserRole.ADMIN, 'HR_MANAGER' as UserRole, 'HR_ADMIN' as UserRole]}
            >
              <PayrollDashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/hr/payroll/process"
          element={
            <ProtectedRoute
              requiredRoles={[UserRole.ADMIN, 'HR_MANAGER' as UserRole, 'HR_ADMIN' as UserRole]}
            >
              <PayrollProcessingPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/hr/payroll/runs"
          element={
            <ProtectedRoute
              requiredRoles={[UserRole.ADMIN, 'HR_MANAGER' as UserRole, 'HR_ADMIN' as UserRole]}
            >
              <PayrollRunsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/hr/leave"
          element={
            <ProtectedRoute
              requiredRoles={[
                UserRole.ADMIN,
                'HR_MANAGER' as UserRole,
                'HR_ADMIN' as UserRole,
                UserRole.PICKER,
                UserRole.PACKER,
              ]}
            >
              <LeaveRequestsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/hr/settings"
          element={
            <ProtectedRoute requiredRoles={[UserRole.ADMIN, 'HR_ADMIN' as UserRole]}>
              <HRSettingsPage />
            </ProtectedRoute>
          }
        />

        {/* Notification Preferences route - accessible to all authenticated users */}
        <Route
          path="/notifications/preferences"
          element={
            <ProtectedRoute>
              <NotificationPreferencesPage />
            </ProtectedRoute>
          }
        />

        {/* Notifications page - accessible to all authenticated users */}
        <Route
          path="/notifications"
          element={
            <ProtectedRoute>
              <NotificationsPage />
            </ProtectedRoute>
          }
        />

        {/* Developer Panel - only in development */}
        {process.env.NODE_ENV === 'development' && (
          <Route
            path="/developer"
            element={
              <ProtectedRoute requiredRoles={[UserRole.ADMIN]}>
                <DeveloperPage />
              </ProtectedRoute>
            }
          />
        )}

        {/* Default route */}
        <Route path="/" element={<Navigate to={getDefaultRoute()} replace />} />

        {/* 404 Not Found page */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
      <NotificationCenter />
    </>
  );
}

// ============================================================================
// APP COMPONENT
// ============================================================================

function App() {
  // Initialize and sync theme
  useEffect(() => {
    // Apply theme function
    const applyTheme = () => {
      const theme = useUIStore.getState().theme;
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

      const shouldBeDark = theme === 'dark' || (theme === 'auto' && prefersDark);

      if (shouldBeDark) {
        document.documentElement.classList.add('dark');
        document.documentElement.classList.remove('light');
      } else {
        document.documentElement.classList.remove('dark');
        document.documentElement.classList.add('light');
      }
    };

    // Apply initial theme
    applyTheme();

    // Listen for system preference changes when in auto mode
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemThemeChange = () => {
      const theme = useUIStore.getState().theme;
      if (theme === 'auto') {
        applyTheme();
      }
    };

    mediaQuery.addEventListener('change', handleSystemThemeChange);

    // Subscribe to theme changes in the store
    const unsubscribe = useUIStore.subscribe(() => {
      applyTheme();
    });

    return () => {
      mediaQuery.removeEventListener('change', handleSystemThemeChange);
      unsubscribe();
    };
  }, []);

  // WebSocket connection management
  useEffect(() => {
    const accessToken = useAuthStore.getState().accessToken;

    // Connect WebSocket when authenticated
    if (accessToken && !webSocketService.isConnected()) {
      webSocketService.connect();
    }

    // Subscribe to auth state changes
    const unsubscribe = useAuthStore.subscribe(state => {
      const token = state.accessToken;
      if (token && !webSocketService.isConnected()) {
        webSocketService.connect();
      } else if (!token && webSocketService.isConnected()) {
        webSocketService.disconnect();
      }
    });

    return () => {
      unsubscribe();
      // Disconnect WebSocket on unmount
      webSocketService.disconnect();
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <ToastProvider>
          <BrowserRouter
            future={{
              v7_startTransition: true,
              v7_relativeSplatPath: true,
            }}
          >
            <AppInner />
          </BrowserRouter>
        </ToastProvider>
      </ErrorBoundary>
    </QueryClientProvider>
  );
}

export default App;
