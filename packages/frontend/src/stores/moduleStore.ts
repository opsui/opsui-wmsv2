/**
 * Module Store
 *
 * Manages module subscriptions and entitlements for the current entity
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  ModuleId,
  UserTierId,
  ModuleDefinition,
  MODULE_DEFINITIONS,
  USER_TIERS,
  ModuleCategory,
} from '@opsui/shared';
import { apiClient } from '@/lib/api-client';

// ============================================================================
// TYPES
// ============================================================================

export interface ModuleSubscription {
  moduleId: ModuleId;
  moduleName: string;
  pricePerPeriod: number;
  billingCycle: 'MONTHLY' | 'ANNUAL' | 'TRIAL' | 'CUSTOM';
  status: 'ACTIVE' | 'SUSPENDED' | 'CANCELLED' | 'EXPIRED' | 'TRIAL' | 'PENDING_PAYMENT';
}

export interface ModuleBillingSummary {
  entityId: string;
  enabledModules: ModuleSubscription[];
  userTier: {
    tierId: UserTierId;
    tierName: string;
    monthlyFee: number;
    currentUserCount: number;
    maxUserCount: number | null;
  };
  addons: Array<{
    addonId: string;
    monthlyFee: number;
    isActive: boolean;
  }>;
  totals: {
    monthly: number;
    annual: number;
    currency: string;
  };
}

export interface ModuleWithStatus extends ModuleDefinition {
  isEnabled: boolean;
  subscription?: ModuleSubscription;
}

interface ModuleState {
  // State
  enabledModules: ModuleId[];
  modulesWithStatus: ModuleWithStatus[];
  billingSummary: ModuleBillingSummary | null;
  isLoading: boolean;
  error: string | null;
  lastFetched: number | null;

  // Computed (via methods)
  isModuleEnabled: (moduleId: ModuleId) => boolean;
  getModulesByCategory: (category: ModuleCategory) => ModuleWithStatus[];

  // Actions
  fetchModules: () => Promise<void>;
  fetchBillingSummary: () => Promise<void>;
  enableModule: (moduleId: ModuleId, billingCycle: 'MONTHLY' | 'ANNUAL') => Promise<void>;
  disableModule: (moduleId: ModuleId) => Promise<void>;
  setUserTier: (tierId: UserTierId) => Promise<void>;
  clearCache: () => void;
}

// ============================================================================
// API BASE - Using apiClient which has auth handling and base URL configured
// ============================================================================

// apiClient base URL is /api/v1, so modules are at /modules

// ============================================================================
// STORE
// ============================================================================

export const useModuleStore = create<ModuleState>()(
  persist(
    (set, get) => ({
      // Initial state
      enabledModules: [],
      modulesWithStatus: [],
      billingSummary: null,
      isLoading: false,
      error: null,
      lastFetched: null,

      // Computed methods
      isModuleEnabled: (moduleId: ModuleId): boolean => {
        const state = get();
        return state.enabledModules.includes(moduleId);
      },

      getModulesByCategory: (category: ModuleCategory): ModuleWithStatus[] => {
        const state = get();
        return state.modulesWithStatus.filter(m => m.category === category);
      },

      // Actions
      fetchModules: async () => {
        set({ isLoading: true, error: null });
        try {
          const response = await apiClient.get('/modules/status');
          const data = response.data;

          set({
            enabledModules: data.enabledModules,
            modulesWithStatus: data.modulesWithStatus,
            isLoading: false,
            lastFetched: Date.now(),
          });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to fetch modules',
            isLoading: false,
          });
        }
      },

      fetchBillingSummary: async () => {
        set({ isLoading: true, error: null });
        try {
          const response = await apiClient.get('/modules/billing');
          const data = response.data;

          set({
            billingSummary: data,
            isLoading: false,
          });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to fetch billing summary',
            isLoading: false,
          });
        }
      },

      enableModule: async (moduleId: ModuleId, billingCycle: 'MONTHLY' | 'ANNUAL') => {
        set({ isLoading: true, error: null });
        try {
          await apiClient.post('/modules/enable', { moduleId, billingCycle });

          // Refresh modules
          await get().fetchModules();
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to enable module',
            isLoading: false,
          });
          throw error;
        }
      },

      disableModule: async (moduleId: ModuleId) => {
        set({ isLoading: true, error: null });
        try {
          await apiClient.post('/modules/disable', { moduleId });

          // Refresh modules
          await get().fetchModules();
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to disable module',
            isLoading: false,
          });
          throw error;
        }
      },

      setUserTier: async (tierId: UserTierId) => {
        set({ isLoading: true, error: null });
        try {
          await apiClient.post('/modules/tier', { tierId });

          // Refresh billing summary
          await get().fetchBillingSummary();
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to set user tier',
            isLoading: false,
          });
          throw error;
        }
      },

      clearCache: () => {
        set({
          enabledModules: [],
          modulesWithStatus: [],
          billingSummary: null,
          lastFetched: null,
        });
      },
    }),
    {
      name: 'opsui-module-store',
      partialize: state => ({
        enabledModules: state.enabledModules,
        lastFetched: state.lastFetched,
      }),
    }
  )
);

// ============================================================================
// HOOKS
// ============================================================================

/**
 * Hook to check if a module is enabled
 */
export function useModuleEnabled(moduleId: ModuleId): boolean {
  const enabledModules = useModuleStore(state => state.enabledModules);
  return enabledModules.includes(moduleId);
}

/**
 * Hook to check if multiple modules are enabled
 */
export function useModulesEnabled(moduleIds: ModuleId[]): Record<ModuleId, boolean> {
  const enabledModules = useModuleStore(state => state.enabledModules);
  return moduleIds.reduce(
    (acc, id) => {
      acc[id] = enabledModules.includes(id);
      return acc;
    },
    {} as Record<ModuleId, boolean>
  );
}

/**
 * Hook to get all modules in a category with their status
 */
export function useModulesByCategory(category: ModuleCategory): ModuleWithStatus[] {
  const modulesWithStatus = useModuleStore(state => state.modulesWithStatus);
  return modulesWithStatus.filter(m => m.category === category);
}

/**
 * Hook to get the billing summary
 */
export function useBillingSummary() {
  return useModuleStore(state => state.billingSummary);
}

/**
 * Hook to get user tier information
 */
export function useUserTier() {
  const billingSummary = useModuleStore(state => state.billingSummary);
  return billingSummary?.userTier ?? null;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get category display name
 */
export function getCategoryDisplayName(category: ModuleCategory): string {
  const names: Record<ModuleCategory, string> = {
    'core-warehouse': 'Core Warehouse Operations',
    'advanced-warehouse': 'Advanced Warehouse Features',
    logistics: 'Logistics & Route Optimization',
    'quality-compliance': 'Quality & Compliance',
    'business-automation': 'Business Automation',
    'analytics-intelligence': 'Analytics & Intelligence',
    'enterprise-management': 'Enterprise Management',
  };
  return names[category] ?? category;
}

/**
 * Get tier display name
 */
export function getTierDisplayName(tierId: UserTierId): string {
  return USER_TIERS[tierId]?.name ?? tierId;
}

/**
 * Calculate price for a selection of modules and tier
 */
export function calculatePrice(
  moduleIds: ModuleId[],
  tierId: UserTierId,
  billingCycle: 'MONTHLY' | 'ANNUAL'
): number {
  if (billingCycle === 'MONTHLY') {
    return (
      moduleIds.reduce((sum, id) => {
        const module = MODULE_DEFINITIONS[id];
        return sum + (module?.pricing.monthly ?? 0);
      }, 0) + (USER_TIERS[tierId]?.monthlyFee ?? 0)
    );
  } else {
    return (
      moduleIds.reduce((sum, id) => {
        const module = MODULE_DEFINITIONS[id];
        return sum + (module?.pricing.annual ?? 0);
      }, 0) +
      (USER_TIERS[tierId]?.monthlyFee ?? 0) * 12
    );
  }
}
