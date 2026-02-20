/**
 * Module Management Page
 *
 * Admin interface for managing module subscriptions and billing
 * Follows SaaS subscription management best practices
 *
 * ============================================================================
 * AESTHETIC DIRECTION: SYSTEM CORE
 * ============================================================================
 * Enterprise subscription aesthetic:
 * - Dark theme with slate/gray accents for professionalism
 * - Module card flip entrance animations
 * - Subscription status with tiered indicators
 * - Cost visualization with progress bars
 * - Category organization with expansion states
 * ============================================================================
 */

import {
  Badge,
  Breadcrumb,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  ConfirmDialog,
  Header,
  LoadingSpinner,
} from '@/components/shared';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores';
import {
  getCategoryDisplayName,
  useModuleStore,
  useModuleStoreHydrated,
} from '@/stores/moduleStore';
import {
  BoltIcon,
  BuildingOfficeIcon,
  ChartBarIcon,
  CheckCircleIcon,
  ChevronDownIcon,
  Cog6ToothIcon,
  CogIcon,
  CubeIcon,
  CurrencyDollarIcon,
  PlusIcon,
  ShieldCheckIcon,
  SparklesIcon,
  TruckIcon,
  UsersIcon,
} from '@heroicons/react/24/outline';
import { ModuleCategory, ModuleId, USER_TIERS, UserRole, UserTierId } from '@opsui/shared';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

// ============================================================================
// TYPES
// ============================================================================

interface ModuleWithStatus {
  id: ModuleId;
  name: string;
  description: string;
  category: ModuleCategory;
  pricing: { monthly: number; annual: number };
  features: string[];
  dependencies?: ModuleId[];
  isEnabled: boolean;
  subscription?: {
    moduleId: ModuleId;
    moduleName: string;
    pricePerPeriod: number;
    billingCycle: 'MONTHLY' | 'ANNUAL';
    status: string;
  };
}

// ============================================================================
// CATEGORY ICONS
// ============================================================================

const CATEGORY_ICONS: Record<ModuleCategory, React.ComponentType<{ className?: string }>> = {
  'core-warehouse': CubeIcon,
  'advanced-warehouse': BoltIcon,
  logistics: TruckIcon,
  'quality-compliance': ShieldCheckIcon,
  'business-automation': CogIcon,
  'analytics-intelligence': ChartBarIcon,
  'enterprise-management': BuildingOfficeIcon,
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function ModuleManagementPage() {
  const navigate = useNavigate();
  const user = useAuthStore(state => state.user);

  // Check if store has hydrated from localStorage
  const isHydrated = useModuleStoreHydrated();

  // Module store - with safe defaults
  const modulesWithStatus = useModuleStore(state => state?.modulesWithStatus ?? []);
  const billingSummary = useModuleStore(state => state?.billingSummary ?? null);
  const isLoading = useModuleStore(state => state?.isLoading ?? false);
  const fetchModules = useModuleStore(state => state?.fetchModules);
  const fetchBillingSummary = useModuleStore(state => state?.fetchBillingSummary);
  const enableModule = useModuleStore(state => state?.enableModule);
  const disableModule = useModuleStore(state => state?.disableModule);
  const setUserTier = useModuleStore(state => state?.setUserTier);

  // Local state
  const [selectedCategory, setSelectedCategory] = useState<ModuleCategory | 'all'>('all');
  const [billingCycle, setBillingCycle] = useState<'MONTHLY' | 'ANNUAL'>('MONTHLY');
  const [expandedModules, setExpandedModules] = useState<Set<ModuleId>>(new Set());
  const [showTiersModal, setShowTiersModal] = useState(false);
  const [disableConfirm, setDisableConfirm] = useState<{
    isOpen: boolean;
    moduleId: ModuleId | null;
  }>({
    isOpen: false,
    moduleId: null,
  });
  const [actionLoading, setActionLoading] = useState<ModuleId | null>(null);

  // Check admin access
  useEffect(() => {
    if (user?.role !== UserRole.ADMIN) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  // Fetch data on mount
  useEffect(() => {
    if (fetchModules && fetchBillingSummary) {
      fetchModules();
      fetchBillingSummary();
    }
  }, [fetchModules, fetchBillingSummary]);

  // Group modules by category - with comprehensive safety checks
  const modulesByCategory = (() => {
    if (!Array.isArray(modulesWithStatus) || modulesWithStatus.length === 0) {
      return {};
    }
    try {
      return modulesWithStatus.reduce(
        (acc, module) => {
          if (!module || !module.category) return acc;
          if (!acc[module.category]) {
            acc[module.category] = [];
          }
          acc[module.category].push(module as ModuleWithStatus);
          return acc;
        },
        {} as Record<ModuleCategory, ModuleWithStatus[]>
      );
    } catch (error) {
      console.error('Error grouping modules:', error);
      return {};
    }
  })();

  // Calculate totals
  const safeModules = Array.isArray(modulesWithStatus) ? modulesWithStatus : [];
  const enabledCount = safeModules.filter(m => m.isEnabled).length;
  const totalModules = safeModules.length || 1; // Avoid division by zero
  const monthlyTotal = billingSummary?.totals.monthly ?? 0;
  const annualTotal = billingSummary?.totals.annual ?? 0;

  // Toggle module expansion
  const toggleModuleExpansion = (moduleId: ModuleId) => {
    setExpandedModules(prev => {
      const next = new Set(prev);
      if (next.has(moduleId)) {
        next.delete(moduleId);
      } else {
        next.add(moduleId);
      }
      return next;
    });
  };

  // Handle module toggle
  const handleToggleModule = async (moduleId: ModuleId, currentlyEnabled: boolean) => {
    if (currentlyEnabled) {
      setDisableConfirm({ isOpen: true, moduleId });
    } else {
      try {
        setActionLoading(moduleId);
        await enableModule(moduleId, billingCycle);
      } catch (error) {
        console.error('Failed to enable module:', error);
        alert(error instanceof Error ? error.message : 'Failed to enable module');
      } finally {
        setActionLoading(null);
      }
    }
  };

  // Confirm disable module
  const confirmDisableModule = async () => {
    if (!disableConfirm.moduleId) return;
    try {
      setActionLoading(disableConfirm.moduleId);
      await disableModule(disableConfirm.moduleId);
    } catch (error) {
      console.error('Failed to disable module:', error);
      alert(error instanceof Error ? error.message : 'Failed to disable module');
    } finally {
      setActionLoading(null);
      setDisableConfirm({ isOpen: false, moduleId: null });
    }
  };

  // Handle tier change
  const handleTierChange = async (tierId: UserTierId) => {
    try {
      await setUserTier(tierId);
      setShowTiersModal(false);
    } catch (error) {
      console.error('Failed to change tier:', error);
      alert(error instanceof Error ? error.message : 'Failed to update tier');
    }
  };

  // Categories for filter tabs
  const categories: Array<{ id: ModuleCategory | 'all'; name: string }> = [
    { id: 'all', name: 'All Modules' },
    { id: 'core-warehouse', name: 'Core' },
    { id: 'advanced-warehouse', name: 'Advanced' },
    { id: 'logistics', name: 'Logistics' },
    { id: 'quality-compliance', name: 'Quality' },
    { id: 'business-automation', name: 'Automation' },
    { id: 'analytics-intelligence', name: 'Analytics' },
    { id: 'enterprise-management', name: 'Enterprise' },
  ];

  // Get price based on billing cycle
  const getPrice = (module: ModuleWithStatus) => {
    return billingCycle === 'ANNUAL' ? module.pricing.annual : module.pricing.monthly;
  };

  // Breadcrumb items
  const breadcrumbItems = [
    { label: 'Dashboard', path: '/dashboard' },
    { label: 'Module Management' },
  ];

  // Show loading state while hydrating or fetching initial data
  if (!isHydrated || (isLoading && modulesWithStatus.length === 0)) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Header />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center h-64">
            <LoadingSpinner size="lg" />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <Breadcrumb items={breadcrumbItems} className="mb-6" />

        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-primary-100 dark:bg-primary-900/30 rounded-lg">
              <Cog6ToothIcon className="h-6 w-6 text-primary-600 dark:text-primary-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Module Management
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Manage your subscription modules and billing
              </p>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {/* Enabled Modules */}
          <Card className="relative overflow-hidden">
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 overflow-hidden">
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                    Active Modules
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                    {enabledCount}
                    <span className="text-base font-normal text-gray-400"> / {totalModules}</span>
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                    {((enabledCount / totalModules) * 100).toFixed(0)}% utilization
                  </p>
                </div>
                <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-xl shrink-0">
                  <SparklesIcon className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
              </div>
              <div className="mt-3 h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-purple-500 rounded-full transition-all duration-500"
                  style={{ width: `${(enabledCount / totalModules) * 100}%` }}
                />
              </div>
            </CardContent>
          </Card>

          {/* User Tier */}
          <Card className="overflow-hidden">
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 overflow-hidden">
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                    User Tier
                  </p>
                  <p className="text-lg font-bold text-gray-900 dark:text-white mt-1 truncate">
                    {billingSummary?.userTier?.tierName ?? 'Starter'}
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                    {billingSummary?.userTier?.currentUserCount ?? 0} active users
                  </p>
                </div>
                <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl shrink-0">
                  <UsersIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
              <Button
                variant="secondary"
                size="sm"
                className="mt-3 w-full"
                onClick={() => setShowTiersModal(true)}
              >
                Change Tier
              </Button>
            </CardContent>
          </Card>

          {/* Monthly Cost */}
          <Card className="overflow-hidden">
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 overflow-hidden">
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                    Monthly Cost
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                    ${monthlyTotal.toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Billed monthly</p>
                </div>
                <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-xl shrink-0">
                  <CurrencyDollarIcon className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Annual Savings */}
          <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-800 overflow-hidden">
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 overflow-hidden">
                  <p className="text-sm font-medium text-green-700 dark:text-green-400 truncate">
                    Annual Cost
                  </p>
                  <p className="text-2xl font-bold text-green-900 dark:text-white mt-1">
                    ${annualTotal.toLocaleString()}
                  </p>
                  <p className="text-xs text-green-600 dark:text-green-500 mt-1">
                    Save ~17% vs monthly
                  </p>
                </div>
                <div className="p-3 bg-green-200 dark:bg-green-800/50 rounded-xl shrink-0">
                  <CurrencyDollarIcon className="h-6 w-6 text-green-700 dark:text-green-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Controls Bar */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            {/* Category Tabs */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 lg:pb-0">
              {Array.isArray(categories) &&
                categories.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors',
                      selectedCategory === cat.id
                        ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                    )}
                  >
                    {cat.name}
                  </button>
                ))}
            </div>

            {/* Billing Cycle Toggle */}
            <div className="flex items-center bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
              <button
                onClick={() => setBillingCycle('MONTHLY')}
                className={cn(
                  'px-4 py-2 rounded-md text-sm font-medium transition-all',
                  billingCycle === 'MONTHLY'
                    ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                )}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingCycle('ANNUAL')}
                className={cn(
                  'px-4 py-2 rounded-md text-sm font-medium transition-all',
                  billingCycle === 'ANNUAL'
                    ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                )}
              >
                Annual
                <Badge variant="success" size="sm" className="ml-2">
                  -17%
                </Badge>
              </button>
            </div>
          </div>
        </div>

        {/* Module List */}
        <div className="space-y-6">
          {(Object.entries(modulesByCategory) as [ModuleCategory, ModuleWithStatus[]][]).map(
            ([category, modules]) => {
              if (selectedCategory !== 'all' && category !== selectedCategory) return null;
              // Safety check for modules array
              if (!Array.isArray(modules) || modules.length === 0) return null;

              const CategoryIcon = CATEGORY_ICONS[category] || CubeIcon;
              const categoryEnabledCount = modules.filter(m => m.isEnabled).length;

              return (
                <div key={category}>
                  {/* Category Header */}
                  <div className="flex items-center gap-2 mb-3">
                    <CategoryIcon className="h-5 w-5 text-gray-400" />
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {getCategoryDisplayName(category as ModuleCategory)}
                    </h2>
                    <Badge variant="default" size="sm">
                      {categoryEnabledCount}/{modules.length} active
                    </Badge>
                  </div>

                  {/* Module Cards */}
                  <div className="grid gap-3">
                    {modules.map(module => {
                      const isExpanded = expandedModules.has(module.id);
                      const isActionLoading = actionLoading === module.id;

                      return (
                        <Card
                          key={module.id}
                          className={cn(
                            'transition-all duration-200 overflow-hidden',
                            module.isEnabled
                              ? 'border-l-4 border-l-green-500'
                              : 'hover:border-gray-300 dark:hover:border-gray-600'
                          )}
                        >
                          <div className="p-4">
                            <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                              {/* Module Info */}
                              <div className="flex-1 min-w-0 overflow-hidden">
                                <div className="flex flex-wrap items-center gap-2 mb-1">
                                  <h3 className="text-base font-semibold text-gray-900 dark:text-white truncate">
                                    {module.name}
                                  </h3>
                                  {module.isEnabled ? (
                                    <Badge variant="success" size="sm">
                                      Active
                                    </Badge>
                                  ) : (
                                    <Badge variant="default" size="sm">
                                      Inactive
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
                                  {module.description}
                                </p>
                                {module.dependencies && module.dependencies.length > 0 && (
                                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-1 truncate">
                                    Requires: {module.dependencies.join(', ')}
                                  </p>
                                )}
                              </div>

                              {/* Price & Action */}
                              <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4 shrink-0">
                                <div className="text-left sm:text-right shrink-0">
                                  <p className="text-xl font-bold text-gray-900 dark:text-white">
                                    ${getPrice(module)}
                                  </p>
                                  <p className="text-xs text-gray-400">
                                    /{billingCycle === 'ANNUAL' ? 'year' : 'mo'}
                                  </p>
                                </div>

                                <button
                                  onClick={e => {
                                    e.stopPropagation();
                                    handleToggleModule(module.id, module.isEnabled);
                                  }}
                                  disabled={isActionLoading || isLoading}
                                  className={cn(
                                    'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all shrink-0',
                                    module.isEnabled
                                      ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/50'
                                      : 'bg-primary-600 text-white hover:bg-primary-700',
                                    (isActionLoading || isLoading) &&
                                      'opacity-50 cursor-not-allowed'
                                  )}
                                >
                                  {isActionLoading ? (
                                    <LoadingSpinner size="sm" />
                                  ) : module.isEnabled ? (
                                    <>
                                      <CheckCircleIcon className="h-4 w-4" />
                                      <span>Active</span>
                                    </>
                                  ) : (
                                    <>
                                      <PlusIcon className="h-4 w-4" />
                                      <span>Enable</span>
                                    </>
                                  )}
                                </button>

                                {/* Expand Button */}
                                <button
                                  onClick={e => {
                                    e.stopPropagation();
                                    toggleModuleExpansion(module.id);
                                  }}
                                  className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 shrink-0"
                                >
                                  <ChevronDownIcon
                                    className={cn(
                                      'h-5 w-5 transition-transform',
                                      isExpanded && 'rotate-180'
                                    )}
                                  />
                                </button>
                              </div>
                            </div>

                            {/* Expanded Features */}
                            {isExpanded && (
                              <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                                <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
                                  Included Features
                                </h4>
                                <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
                                  {Array.isArray(module.features) &&
                                    module.features.map((feature, idx) => (
                                      <li
                                        key={idx}
                                        className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400 min-w-0"
                                      >
                                        <CheckCircleIcon className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                                        <span className="truncate">{feature}</span>
                                      </li>
                                    ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              );
            }
          )}
        </div>

        {/* Empty State */}
        {modulesWithStatus.length === 0 && !isLoading && (
          <Card>
            <CardContent className="py-12 text-center">
              <CubeIcon className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No modules found
              </h3>
              <p className="text-gray-500 dark:text-gray-400">
                Unable to load module definitions. Please try refreshing the page.
              </p>
            </CardContent>
          </Card>
        )}
      </main>

      {/* User Tier Selection Modal */}
      {showTiersModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-lg max-h-[90vh] overflow-hidden">
            <CardHeader className="border-b border-gray-100 dark:border-gray-700">
              <CardTitle>Select User Tier</CardTitle>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Choose a plan based on your team size
              </p>
            </CardHeader>
            <CardContent className="p-4 overflow-y-auto">
              <div className="space-y-2">
                {Object.values(USER_TIERS || {}).map(tier => {
                  const isSelected = billingSummary?.userTier?.tierId === tier.id;
                  return (
                    <button
                      key={tier.id}
                      onClick={() => handleTierChange(tier.id)}
                      className={cn(
                        'w-full p-4 rounded-xl border-2 text-left transition-all',
                        isSelected
                          ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                          : 'border-gray-200 dark:border-gray-700 hover:border-primary-300 dark:hover:border-primary-700'
                      )}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0 overflow-hidden">
                          <div
                            className={cn(
                              'w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0',
                              isSelected
                                ? 'border-primary-500 bg-primary-500'
                                : 'border-gray-300 dark:border-gray-600'
                            )}
                          >
                            {isSelected && <CheckCircleIcon className="h-3 w-3 text-white" />}
                          </div>
                          <div className="min-w-0 overflow-hidden">
                            <p className="font-semibold text-gray-900 dark:text-white truncate">
                              {tier.name}
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                              {tier.description}
                            </p>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-lg font-bold text-gray-900 dark:text-white">
                            {tier.monthlyFee === 0 ? 'Free' : `$${tier.monthlyFee}`}
                          </p>
                          <p className="text-xs text-gray-400">/month</p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <Button variant="secondary" onClick={() => setShowTiersModal(false)}>
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Disable Confirmation Dialog */}
      <ConfirmDialog
        isOpen={disableConfirm.isOpen}
        onClose={() => setDisableConfirm({ isOpen: false, moduleId: null })}
        onConfirm={confirmDisableModule}
        title="Disable Module"
        message={`Are you sure you want to disable the ${disableConfirm.moduleId || ''} module? Users will lose access to this functionality immediately.`}
        confirmText="Disable Module"
        variant="danger"
      />
    </div>
  );
}
