/**
 * Production Page - Industry-Standard Tabbed Navigation
 *
 * Following MES (Manufacturing Execution System) conventions:
 * - Dashboard: KPIs and overview metrics
 * - Orders: Active production orders with Kanban view
 * - Analytics: OEE, performance trends, detailed reports
 * - Work Centers: Equipment status and capacity
 * - BOMs: Bill of materials management
 */

import { useSearchParams } from 'react-router-dom';
import { Header, Button, Card, CardContent, CardHeader, CardTitle } from '@/components/shared';
import { useProductionOrders, useBOMs, useUpdateProductionOrder } from '@/services/api';
import { useState, useMemo } from 'react';
import { ProductionOrder as SharedProductionOrder, ProductionOrderStatus } from '@opsui/shared';
import { CreateProductionOrderModal } from '@/components/production/CreateProductionOrderModal';
import { CreateBOMModal } from '@/components/production/CreateBOMModal';
import { ProductionOrderDetailsModal } from '@/components/production/ProductionOrderDetailsModal';
import { ProductionKanbanBoard } from '@/components/production/ProductionKanbanBoard';
import { WorkCenterView } from '@/components/production/WorkCenterView';
import { ProductionAnalyticsDashboard } from '@/components/production/ProductionAnalyticsDashboard';
import {
  PlusIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  ChartBarIcon,
  ClipboardDocumentListIcon,
  DocumentChartBarIcon,
  BuildingOfficeIcon,
} from '@heroicons/react/24/outline';

type ProductionOrder = SharedProductionOrder;

type TabType = 'dashboard' | 'orders' | 'analytics' | 'workcenters' | 'bom';

interface TabConfig {
  id: TabType;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const TABS: TabConfig[] = [
  { id: 'dashboard', label: 'Dashboard', icon: ChartBarIcon },
  { id: 'orders', label: 'Orders', icon: ClipboardDocumentListIcon },
  { id: 'analytics', label: 'Analytics', icon: DocumentChartBarIcon },
  { id: 'workcenters', label: 'Work Centers', icon: BuildingOfficeIcon },
  { id: 'bom', label: 'BOMs', icon: DocumentTextIcon },
];

export function ProductionPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCreateBOMModalOpen, setIsCreateBOMModalOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  // Get active tab from URL or default to dashboard
  const activeTab = (searchParams.get('tab') as TabType) || 'dashboard';

  const setActiveTab = (tab: TabType) => {
    setSearchParams({ tab });
  };

  // Fetch data
  const { data: ordersData, isLoading: isOrdersLoading } = useProductionOrders();
  const { data: bomsData } = useBOMs();

  // Action hooks
  const updateOrderMutation = useUpdateProductionOrder();

  const handleUpdateOrderStatus = async (orderId: string, newStatus: ProductionOrderStatus) => {
    try {
      await updateOrderMutation.mutateAsync({ orderId, data: { status: newStatus } });
    } catch (error: any) {
      throw error;
    }
  };

  const orders: ProductionOrder[] = ordersData?.orders || [];
  const activeOrders = orders.filter(o => o.status !== 'COMPLETED' && o.status !== 'CANCELLED');

  const isLoading = isOrdersLoading;

  // Calculate dashboard metrics
  const dashboardMetrics = useMemo(() => {
    const draft = orders.filter(o => o.status === 'DRAFT').length;
    const planned = orders.filter(o => o.status === 'PLANNED').length;
    const inProduction = orders.filter(
      o => o.status === 'IN_PROGRESS' || o.status === 'RELEASED'
    ).length;
    const onHold = orders.filter(o => o.status === 'ON_HOLD').length;
    const completed = orders.filter(o => o.status === 'COMPLETED').length;

    const overdueOrders = orders.filter(
      o =>
        o.scheduledEndDate && new Date(o.scheduledEndDate) < new Date() && o.status !== 'COMPLETED'
    );
    const upcomingDeadlines = orders.filter(
      o =>
        o.scheduledEndDate &&
        new Date(o.scheduledEndDate) >= new Date() &&
        new Date(o.scheduledEndDate) <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) &&
        o.status !== 'COMPLETED'
    );

    return {
      draft,
      planned,
      inProduction,
      onHold,
      completed,
      overdueOrders: overdueOrders.length,
      upcomingDeadlines: upcomingDeadlines.length,
    };
  }, [orders]);

  return (
    <div className="min-h-screen">
      <Header />

      <main className="w-full px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Production Management</h1>
            <p className="mt-2 text-gray-400">Manufacturing Execution System</p>
          </div>
          <div className="flex gap-3">
            <Button
              variant="secondary"
              className="flex items-center gap-2"
              onClick={() => setIsCreateBOMModalOpen(true)}
            >
              <DocumentTextIcon className="h-5 w-5" />
              New BOM
            </Button>
            <Button
              variant="primary"
              className="flex items-center gap-2"
              onClick={() => setIsCreateModalOpen(true)}
            >
              <PlusIcon className="h-5 w-5" />
              New Order
            </Button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="mb-6">
          <div className="border-b border-white/[0.08]">
            <nav className="flex gap-1 -mb-px overflow-x-auto">
              {TABS.map(tab => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all duration-200 whitespace-nowrap rounded-t-lg ${
                      isActive
                        ? 'border-primary-500 text-primary-400 bg-primary-500/10'
                        : 'border-transparent text-gray-400 hover:text-gray-200 hover:bg-white/[0.03]'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {tab.label}
                    {tab.id === 'dashboard' && dashboardMetrics.overdueOrders > 0 && (
                      <span className="ml-1 px-1.5 py-0.5 text-xs font-medium rounded-full bg-error-500/20 text-error-300">
                        !
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-4">
              <div className="animate-spin rounded-full h-12 w-12 border-2 border-white/[0.08] border-t-primary-500"></div>
              <p className="text-gray-400 text-sm">Loading production data...</p>
            </div>
          </div>
        )}

        {/* Tab Content */}
        {!isLoading && (
          <div>
            {/* Dashboard Tab */}
            {activeTab === 'dashboard' && (
              <div className="space-y-6">
                {/* Key Metrics Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card variant="glass" className="p-4 border-l-4 border-l-white/[0.3]">
                    <p className="text-sm text-gray-400">Draft</p>
                    <p className="text-2xl font-bold text-white">{dashboardMetrics.draft}</p>
                  </Card>
                  <Card variant="glass" className="p-4 border-l-4 border-l-blue-500">
                    <p className="text-sm text-gray-400">Planned</p>
                    <p className="text-2xl font-bold text-white">{dashboardMetrics.planned}</p>
                  </Card>
                  <Card variant="glass" className="p-4 border-l-4 border-l-primary-500">
                    <p className="text-sm text-gray-400">In Production</p>
                    <p className="text-2xl font-bold text-white">{dashboardMetrics.inProduction}</p>
                  </Card>
                  <Card variant="glass" className="p-4 border-l-4 border-l-success-500">
                    <p className="text-sm text-gray-400">Completed Today</p>
                    <p className="text-2xl font-bold text-white">{dashboardMetrics.completed}</p>
                  </Card>
                </div>

                {/* Alerts and Quick Actions */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {(dashboardMetrics.overdueOrders > 0 ||
                    dashboardMetrics.upcomingDeadlines > 0) && (
                    <Card variant="glass">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <ExclamationTriangleIcon className="h-5 w-5 text-warning-400" />
                          Alerts
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {dashboardMetrics.overdueOrders > 0 && (
                            <div className="p-3 bg-error-500/10 border border-white/[0.08] rounded-lg">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-white">
                                  Overdue Orders
                                </span>
                                <span className="text-lg font-bold text-error-400">
                                  {dashboardMetrics.overdueOrders}
                                </span>
                              </div>
                            </div>
                          )}
                          {dashboardMetrics.upcomingDeadlines > 0 && (
                            <div className="p-3 bg-warning-500/10 border border-white/[0.08] rounded-lg">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-white">
                                  Due This Week
                                </span>
                                <span className="text-lg font-bold text-warning-400">
                                  {dashboardMetrics.upcomingDeadlines}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Quick Stats */}
                  <Card variant="glass">
                    <CardHeader>
                      <CardTitle>Quick Stats</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-gray-400">Total Orders</p>
                          <p className="text-xl font-bold text-white">{orders.length}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400">Active BOMs</p>
                          <p className="text-xl font-bold text-white">
                            {bomsData?.boms?.length || 0}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400">On Hold</p>
                          <p className="text-xl font-bold text-warning-400">
                            {dashboardMetrics.onHold}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400">Work Centers</p>
                          <p className="text-xl font-bold text-white">3</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}

            {/* Orders Tab */}
            {activeTab === 'orders' && (
              <ProductionKanbanBoard
                orders={activeOrders}
                onOrderClick={orderId => setSelectedOrderId(orderId)}
                onUpdateStatus={handleUpdateOrderStatus}
                onNewOrder={() => setIsCreateModalOpen(true)}
              />
            )}

            {/* Analytics Tab */}
            {activeTab === 'analytics' && <ProductionAnalyticsDashboard orders={orders} />}

            {/* Work Centers Tab */}
            {activeTab === 'workcenters' && (
              <WorkCenterView
                orders={orders}
                onWorkCenterClick={centerId => console.log('Work center:', centerId)}
              />
            )}

            {/* BOMs Tab */}
            {activeTab === 'bom' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-white">Bills of Materials</h2>
                  <Button
                    variant="secondary"
                    className="flex items-center gap-2"
                    onClick={() => setIsCreateBOMModalOpen(true)}
                  >
                    <PlusIcon className="h-4 w-4" />
                    New BOM
                  </Button>
                </div>

                {bomsData?.boms && bomsData.boms.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {bomsData.boms.map((bom: any) => (
                      <Card key={bom.bomId} variant="glass">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <h3 className="text-lg font-semibold text-white">{bom.name}</h3>
                              <p className="text-sm text-gray-400">{bom.productId}</p>
                            </div>
                            <span
                              className={`px-2 py-1 rounded text-xs font-medium ${
                                bom.status === 'ACTIVE'
                                  ? 'bg-success-500/20 text-success-300'
                                  : 'bg-gray-500/20 text-gray-300'
                              }`}
                            >
                              {bom.status}
                            </span>
                          </div>
                          <div className="space-y-1 text-sm">
                            <p className="text-gray-400">
                              Version: <span className="text-white">{bom.version}</span>
                            </p>
                            <p className="text-gray-400">
                              Components:{' '}
                              <span className="text-white">{bom.components?.length || 0}</span>
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <Card variant="glass">
                    <CardContent className="py-12 text-center">
                      <DocumentTextIcon className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-white mb-2">No BOMs Created</h3>
                      <p className="text-gray-400 mb-4">
                        Create a Bill of Materials to start production
                      </p>
                      <Button
                        variant="primary"
                        className="flex items-center gap-2 mx-auto"
                        onClick={() => setIsCreateBOMModalOpen(true)}
                      >
                        <PlusIcon className="h-4 w-4" />
                        Create First BOM
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Modals */}
      <CreateProductionOrderModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={() => {
          setIsCreateModalOpen(false);
          window.location.reload();
        }}
      />

      <CreateBOMModal
        isOpen={isCreateBOMModalOpen}
        onClose={() => setIsCreateBOMModalOpen(false)}
        onSuccess={() => {
          setIsCreateBOMModalOpen(false);
          window.location.reload();
        }}
      />

      <ProductionOrderDetailsModal
        isOpen={!!selectedOrderId}
        onClose={() => setSelectedOrderId(null)}
        orderId={selectedOrderId || ''}
        onActionSuccess={() => {
          setSelectedOrderId(null);
          window.location.reload();
        }}
      />
    </div>
  );
}

// Default export for compatibility with index.ts
export default ProductionPage;
