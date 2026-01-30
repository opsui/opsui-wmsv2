/**
 * Lazy-loaded pages with code splitting
 *
 * This file exports lazy-loaded versions of all pages for improved performance
 * and reduced initial bundle size. Each page is loaded only when needed.
 */

import { lazy } from 'react';

// Create lazy-loaded components with loading fallback
const createLazyPage = (importFn: () => Promise<{ default: React.ComponentType }>) => {
  return lazy(importFn);
};

// ============================================================================
// AUTH PAGES
// ============================================================================

export const LazyLoginPage = createLazyPage(() => import('./LoginPage'));

// ============================================================================
// DASHBOARD PAGES
// ============================================================================

export const LazyDashboardPage = createLazyPage(() => import('./DashboardPage'));

// ============================================================================
// ORDER PAGES
// ============================================================================

export const LazyOrderQueuePage = createLazyPage(() => import('./OrderQueuePage'));
export const LazyPickingPage = createLazyPage(() => import('./PickingPage'));

// ============================================================================
// PACKING PAGES
// ============================================================================

export const LazyPackingQueuePage = createLazyPage(() => import('./PackingQueuePage'));
export const LazyPackingPage = createLazyPage(() => import('./PackingPage'));

// ============================================================================
// STOCK CONTROL PAGES
// ============================================================================

export const LazyStockControlPage = createLazyPage(() => import('./StockControlPage'));
export const LazyCycleCountingPage = createLazyPage(() => import('./CycleCountingPage'));
export const LazyCycleCountDetailPage = createLazyPage(() => import('./CycleCountDetailPage'));
export const LazyCycleCountKPIPage = createLazyPage(() => import('./CycleCountKPIPage'));
export const LazyMobileScanningPage = createLazyPage(() => import('./MobileScanningPage'));
export const LazyScheduleManagementPage = createLazyPage(() => import('./ScheduleManagementPage'));
export const LazyLocationCapacityPage = createLazyPage(() => import('./LocationCapacityPage'));
export const LazyBinLocationsPage = createLazyPage(() => import('./BinLocationsPage'));

// ============================================================================
// QUALITY CONTROL PAGES
// ============================================================================

export const LazyQualityControlPage = createLazyPage(() => import('./QualityControlPage'));

// ============================================================================
// INWARDS GOODS PAGES
// ============================================================================

export const LazyInwardsGoodsPage = createLazyPage(() => import('./InwardsGoodsPage'));

// ============================================================================
// PRODUCTION PAGES
// ============================================================================

export const LazyProductionPage = createLazyPage(() => import('./ProductionPage'));

// ============================================================================
// MAINTENANCE PAGES
// ============================================================================

export const LazyMaintenancePage = createLazyPage(() => import('./MaintenancePage'));

// ============================================================================
// RMA PAGES
// ============================================================================

export const LazyRMAPage = createLazyPage(() => import('./RMAPage'));

// ============================================================================
// SALES PAGES
// ============================================================================

export const LazySalesPage = createLazyPage(() => import('./SalesPage'));

// ============================================================================
// SHIPPING PAGES
// ============================================================================

export const LazyShippedOrdersPage = createLazyPage(() => import('./ShippedOrdersPage'));

// ============================================================================
// ADMIN PAGES
// ============================================================================

export const LazyAdminSettingsPage = createLazyPage(() => import('./AdminSettingsPage'));
export const LazyUserRolesPage = createLazyPage(() => import('./UserRolesPage'));
export const LazyRolesManagementPage = createLazyPage(() => import('./RolesManagementPage'));
export const LazyExceptionsPage = createLazyPage(() => import('./ExceptionsPage'));

// ============================================================================
// BUSINESS RULES & REPORTS PAGES
// ============================================================================

export const LazyBusinessRulesPage = createLazyPage(() => import('./BusinessRulesPage'));
export const LazyReportsPage = createLazyPage(() => import('./ReportsPage'));
export const LazyIntegrationsPage = createLazyPage(() => import('./IntegrationsPage'));

// ============================================================================
// WAREHOUSE OPERATIONS PAGES
// ============================================================================

export const LazyProductSearchPage = createLazyPage(() => import('./ProductSearchPage'));
export const LazyWavePickingPage = createLazyPage(() => import('./WavePickingPage'));
export const LazyZonePickingPage = createLazyPage(() => import('./ZonePickingPage'));
export const LazySlottingPage = createLazyPage(() => import('./SlottingPage'));
export const LazyRouteOptimizationPage = createLazyPage(() => import('./RouteOptimizationPage'));

// ============================================================================
// NOTIFICATION PAGES
// ============================================================================

export const LazyNotificationPreferencesPage = createLazyPage(
  () => import('./NotificationPreferencesPage')
);
export const LazyNotificationsPage = createLazyPage(() => import('./NotificationsPage'));

// ============================================================================
// ADVANCED FEATURES PAGES
// ============================================================================

export const LazyRootCauseAnalysisPage = createLazyPage(() => import('./RootCauseAnalysisPage'));
export const LazyDeveloperPage = createLazyPage(() => import('./DeveloperPage'));

// ============================================================================
// UTILITY PAGES
// ============================================================================

export const LazyNotFoundPage = createLazyPage(() => import('./NotFoundPage'));
