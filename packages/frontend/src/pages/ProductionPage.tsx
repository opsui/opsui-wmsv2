/**
 * Production Page - Manufacturing Execution System
 *
 * ============================================================================
 * AESTHETIC DIRECTION: PURPLE INDUSTRIAL
 * ============================================================================
 * Industrial manufacturing execution system aesthetic with purple theme:
 * - Dark theme with purple accents matching application brand
 * - Vertical slide-up entrance animations with stagger
 * - Industrial geometric elements and diagonal lines
 * - Ambient purple lighting with brand-consistent glows
 * - OEE metrics with performance dashboards
 * ============================================================================
 */

import { useSearchParams } from 'react-router-dom';
import {
  Header,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Breadcrumb,
} from '@/components/shared';
import { useProductionOrders, useBOMs, useUpdateProductionOrder } from '@/services/api';
import { useState, useMemo, useEffect, useRef } from 'react';
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
  ArrowTrendingUpIcon,
  BoltIcon,
  CogIcon,
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

// Animated counter hook
function useAnimatedCounter(end: number, duration: number = 800) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (end === 0) {
      setValue(0);
      return;
    }

    const startTime = Date.now();
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.floor(end * eased));

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    requestAnimationFrame(animate);
  }, [end, duration]);

  return value;
}

// Intersection observer for scroll animations
function useInView(threshold = 0.1) {
  const ref = useRef<HTMLDivElement>(null);
  const [isInView, setIsInView] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
        }
      },
      { threshold }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [threshold]);

  return { ref, isInView };
}

// Animated metric card with industrial styling
function MetricCard({
  label,
  value,
  color = 'purple',
  delay = 0,
  icon: Icon,
}: {
  label: string;
  value: number;
  color?: 'purple' | 'blue' | 'emerald' | 'slate';
  delay?: number;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  const { ref, isInView } = useInView(0.1);
  const animatedValue = useAnimatedCounter(isInView ? value : 0, 1000);

  const colorClasses = {
    purple: 'from-purple-500 to-purple-400 text-purple-400 border-purple-500/30',
    blue: 'from-blue-500 to-cyan-500 text-blue-400 border-blue-500/30',
    emerald: 'from-emerald-500 to-teal-500 text-emerald-400 border-emerald-500/30',
    slate: 'from-slate-400 to-slate-500 text-slate-300 border-slate-500/30',
  };

  return (
    <div
      ref={ref}
      className="relative group"
      style={{
        opacity: isInView ? 1 : 0,
        transform: isInView ? 'translateY(0)' : 'translateY(40px)',
        transition: `all 0.6s cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms`,
      }}
    >
      {/* Industrial corner accent */}
      <div className="absolute -top-px -left-px w-4 h-4 border-t-2 border-l-2 border-purple-500/50 rounded-tl-lg" />
      <div className="absolute -bottom-px -right-px w-4 h-4 border-b-2 border-r-2 border-purple-500/50 rounded-br-lg" />

      <div
        className={`relative bg-gradient-to-br from-slate-900/90 to-slate-800/50 border ${colorClasses[color].split(' ').pop()} rounded-xl p-5 overflow-hidden`}
      >
        {/* Background glow */}
        <div
          className={`absolute inset-0 bg-gradient-to-br ${colorClasses[color].split(' ').slice(0, 2).join(' ')} opacity-5`}
        />

        <div className="relative">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-slate-500 uppercase tracking-wider">{label}</p>
            {Icon && <Icon className={`h-4 w-4 ${colorClasses[color].split(' ')[2]}`} />}
          </div>
          <p className={`text-4xl font-light ${colorClasses[color].split(' ')[2]}`}>
            {animatedValue}
          </p>
        </div>
      </div>
    </div>
  );
}

// Alert card with industrial styling
function AlertCard({
  type,
  label,
  value,
  delay = 0,
}: {
  type: 'error' | 'warning';
  label: string;
  value: number;
  delay?: number;
}) {
  const { ref, isInView } = useInView(0.1);
  const animatedValue = useAnimatedCounter(isInView ? value : 0, 800);

  const typeClasses = {
    error: 'from-rose-500/10 to-rose-500/5 border-rose-500/30 text-rose-400',
    warning: 'from-amber-500/10 to-amber-500/5 border-amber-500/30 text-amber-400',
  };

  return (
    <div
      ref={ref}
      className="relative"
      style={{
        opacity: isInView ? 1 : 0,
        transform: isInView ? 'translateY(20px)' : 'translateY(30px)',
        transition: `all 0.5s cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms`,
      }}
    >
      <div className={`relative bg-gradient-to-br ${typeClasses[type]} border rounded-lg p-4`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ExclamationTriangleIcon className={`h-5 w-5 ${typeClasses[type].split(' ').pop()}`} />
            <span className="text-sm font-medium text-white">{label}</span>
          </div>
          <span className={`text-2xl font-light ${typeClasses[type].split(' ').pop()}`}>
            {animatedValue}
          </span>
        </div>
      </div>
    </div>
  );
}

export function ProductionPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCreateBOMModalOpen, setIsCreateBOMModalOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  const activeTab = (searchParams.get('tab') as TabType) || 'dashboard';

  const setActiveTab = (tab: TabType) => {
    setSearchParams({ tab });
  };

  const { data: ordersData, isLoading: isOrdersLoading } = useProductionOrders();
  const { data: bomsData } = useBOMs();

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
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950/30 to-slate-950">
      {/* Industrial ambient background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {/* Purple ambient lighting effect */}
        <div className="absolute top-0 left-1/4 w-[600px] h-[400px] bg-purple-500/8 rounded-full blur-[150px] -translate-y-1/2" />
        <div className="absolute top-0 right-1/4 w-[400px] h-[300px] bg-purple-400/6 rounded-full blur-[120px] -translate-y-1/2" />
        <div className="absolute bottom-0 left-1/3 w-[500px] h-[300px] bg-purple-500/6 rounded-full blur-[100px] translate-y-1/2" />

        {/* Industrial grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.015]"
          style={{
            backgroundImage: `
              linear-gradient(to right, white 1px, transparent 1px),
              linear-gradient(to bottom, white 1px, transparent 1px)
            `,
            backgroundSize: '60px 60px',
          }}
        />

        {/* Diagonal industrial lines */}
        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            background: `repeating-linear-gradient(
            45deg,
            transparent,
            transparent 100px,
            white 100px,
            white 101px
          )`,
          }}
        />
      </div>

      <Header />

      <main className="relative w-full px-4 sm:px-6 lg:px-8 py-8">
        <Breadcrumb />

        {/* Page Header with industrial styling */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 shadow-lg shadow-purple-500/30">
                <BoltIcon className="h-6 w-6 text-white" />
              </div>
              <span className="text-xs font-medium uppercase tracking-[0.3em] text-purple-400/80">
                Manufacturing Execution System
              </span>
            </div>
            <h1 className="text-4xl sm:text-5xl font-extralight text-white tracking-tight mb-2">
              Production Management
            </h1>
            <p className="text-slate-400 font-light">
              Monitor, control, and optimize manufacturing operations
            </p>
          </div>

          <div className="flex gap-3">
            <Button
              variant="secondary"
              className="flex items-center gap-2 h-11 px-5 border-slate-700 hover:border-purple-500/30"
              onClick={() => setIsCreateBOMModalOpen(true)}
            >
              <DocumentTextIcon className="h-4 w-4" />
              New BOM
            </Button>
            <Button
              variant="primary"
              className="flex items-center gap-2 h-11 px-5 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-400 hover:to-purple-500 text-white font-medium shadow-lg shadow-purple-500/25"
              onClick={() => setIsCreateModalOpen(true)}
            >
              <PlusIcon className="h-4 w-4" />
              New Order
            </Button>
          </div>
        </div>

        {/* Tab Navigation with industrial styling */}
        <div className="mb-8">
          <div className="flex gap-1 p-1 rounded-xl bg-slate-900/50 border border-slate-800 w-fit overflow-x-auto">
            {TABS.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-all duration-300 whitespace-nowrap ${
                    isActive
                      ? 'text-slate-900'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                  }`}
                >
                  {isActive && (
                    <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg shadow-lg shadow-purple-500/25" />
                  )}
                  <Icon className="h-4 w-4 relative" />
                  <span className="relative">{tab.label}</span>
                  {tab.id === 'dashboard' && dashboardMetrics.overdueOrders > 0 && (
                    <span
                      className={`relative ml-1 w-2 h-2 rounded-full ${
                        isActive ? 'bg-slate-900' : 'bg-rose-400 animate-pulse'
                      }`}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-4">
              <div className="relative">
                <div className="w-16 h-16 rounded-full border-2 border-purple-500/20 border-t-purple-500 animate-spin" />
                <CogIcon className="absolute inset-0 m-auto h-6 w-6 text-purple-400 animate-pulse" />
              </div>
              <p className="text-slate-400 text-sm font-light">
                Initializing production systems...
              </p>
            </div>
          </div>
        )}

        {/* Tab Content */}
        {!isLoading && (
          <div>
            {/* Dashboard Tab */}
            {activeTab === 'dashboard' && (
              <div className="space-y-8">
                {/* Key Metrics Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <MetricCard
                    label="Draft Orders"
                    value={dashboardMetrics.draft}
                    color="slate"
                    delay={0}
                    icon={DocumentTextIcon}
                  />
                  <MetricCard
                    label="Planned"
                    value={dashboardMetrics.planned}
                    color="blue"
                    delay={100}
                    icon={ClipboardDocumentListIcon}
                  />
                  <MetricCard
                    label="In Production"
                    value={dashboardMetrics.inProduction}
                    color="purple"
                    delay={200}
                    icon={BoltIcon}
                  />
                  <MetricCard
                    label="Completed Today"
                    value={dashboardMetrics.completed}
                    color="emerald"
                    delay={300}
                    icon={ArrowTrendingUpIcon}
                  />
                </div>

                {/* Alerts and Quick Stats */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Alerts */}
                  {(dashboardMetrics.overdueOrders > 0 ||
                    dashboardMetrics.upcomingDeadlines > 0) && (
                    <div className="relative">
                      <div className="absolute -inset-px bg-gradient-to-r from-rose-500/20 via-amber-500/10 to-rose-500/20 rounded-2xl" />
                      <div className="relative rounded-2xl bg-gradient-to-br from-slate-900/90 to-slate-800/50 border border-white/5 p-6">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-8 h-8 rounded-lg bg-rose-500/10 flex items-center justify-center">
                            <ExclamationTriangleIcon className="h-4 w-4 text-rose-400" />
                          </div>
                          <h3 className="text-lg font-light text-white">Production Alerts</h3>
                        </div>
                        <div className="space-y-3">
                          {dashboardMetrics.overdueOrders > 0 && (
                            <AlertCard
                              type="error"
                              label="Overdue Orders"
                              value={dashboardMetrics.overdueOrders}
                              delay={100}
                            />
                          )}
                          {dashboardMetrics.upcomingDeadlines > 0 && (
                            <AlertCard
                              type="warning"
                              label="Due This Week"
                              value={dashboardMetrics.upcomingDeadlines}
                              delay={200}
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Quick Stats */}
                  <div className="relative">
                    <div className="absolute -inset-px bg-gradient-to-r from-purple-500/10 via-transparent to-purple-500/10 rounded-2xl" />
                    <div className="relative rounded-2xl bg-gradient-to-br from-slate-900/90 to-slate-800/50 border border-white/5 p-6">
                      <div className="flex items-center gap-3 mb-6">
                        <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
                          <ChartBarIcon className="h-4 w-4 text-purple-400" />
                        </div>
                        <h3 className="text-lg font-light text-white">Quick Stats</h3>
                      </div>

                      <div className="grid grid-cols-2 gap-6">
                        <div>
                          <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">
                            Total Orders
                          </p>
                          <p className="text-3xl font-light text-white">{orders.length}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">
                            Active BOMs
                          </p>
                          <p className="text-3xl font-light text-white">
                            {bomsData?.boms?.length || 0}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">
                            On Hold
                          </p>
                          <p className="text-3xl font-light text-purple-400">
                            {dashboardMetrics.onHold}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">
                            Work Centers
                          </p>
                          <p className="text-3xl font-light text-white">3</p>
                        </div>
                      </div>
                    </div>
                  </div>
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
                  <div>
                    <h2 className="text-2xl font-light text-white">Bills of Materials</h2>
                    <p className="text-sm text-slate-500 mt-1">
                      Manage product component specifications
                    </p>
                  </div>
                  <Button
                    variant="secondary"
                    className="flex items-center gap-2 border-slate-700 hover:border-purple-500/30"
                    onClick={() => setIsCreateBOMModalOpen(true)}
                  >
                    <PlusIcon className="h-4 w-4" />
                    New BOM
                  </Button>
                </div>

                {bomsData?.boms && bomsData.boms.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {bomsData.boms.map((bom: any, index: number) => (
                      <BOMCard key={bom.bomId} bom={bom} index={index} />
                    ))}
                  </div>
                ) : (
                  <div className="relative rounded-3xl bg-gradient-to-br from-slate-900/80 to-slate-800/50 border border-white/5 p-12 text-center">
                    <div className="absolute inset-0 flex items-center justify-center opacity-5">
                      <DocumentTextIcon className="h-64 w-64 text-white" />
                    </div>
                    <div className="relative">
                      <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-purple-500/10 flex items-center justify-center border border-purple-500/20">
                        <DocumentTextIcon className="h-10 w-10 text-purple-400" />
                      </div>
                      <h3 className="text-2xl font-light text-white mb-3">No BOMs Created</h3>
                      <p className="text-slate-400 font-light max-w-md mx-auto mb-6">
                        Create a Bill of Materials to define product components and start
                        production.
                      </p>
                      <Button
                        variant="primary"
                        className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-400 hover:to-purple-500 text-white font-medium shadow-lg shadow-purple-500/25"
                        onClick={() => setIsCreateBOMModalOpen(true)}
                      >
                        <PlusIcon className="h-4 w-4 mr-2" />
                        Create First BOM
                      </Button>
                    </div>
                  </div>
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

// BOM Card component
function BOMCard({ bom, index }: { bom: any; index: number }) {
  const { ref, isInView } = useInView(0.1);

  return (
    <div
      ref={ref}
      className="group relative"
      style={{
        opacity: isInView ? 1 : 0,
        transform: isInView ? 'translateY(0)' : 'translateY(30px)',
        transition: `all 0.5s cubic-bezier(0.16, 1, 0.3, 1) ${index * 100}ms`,
      }}
    >
      <div className="relative bg-gradient-to-br from-slate-900/90 to-slate-800/50 border border-white/5 rounded-xl p-5 hover:border-purple-500/30 transition-colors duration-300">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-light text-white group-hover:text-purple-400 transition-colors">
              {bom.name}
            </h3>
            <p className="text-sm text-slate-500">{bom.productId}</p>
          </div>
          <span
            className={`px-2.5 py-1 rounded-full text-xs font-medium ${
              bom.status === 'ACTIVE'
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                : 'bg-slate-500/10 text-slate-400 border border-slate-500/20'
            }`}
          >
            {bom.status}
          </span>
        </div>
        <div className="flex items-center gap-4 text-sm text-slate-500">
          <div className="flex items-center gap-1.5">
            <span>Version:</span>
            <span className="text-white">{bom.version}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span>Components:</span>
            <span className="text-white">{bom.components?.length || 0}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProductionPage;
