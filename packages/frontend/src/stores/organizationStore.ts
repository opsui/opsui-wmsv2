/**
 * Organization Store
 *
 * State management for multi-tenant organization context.
 * Handles current organization, user's organizations, and switching.
 */

import type { OrganizationUserRole, OrganizationWithStats } from '@opsui/shared';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ============================================================================
// TYPES
// ============================================================================

interface UserOrganization {
  organizationId: string;
  organizationName: string;
  slug: string;
  role: OrganizationUserRole;
  isPrimary: boolean;
  logoUrl: string | null;
}

interface OrganizationState {
  // Current organization
  currentOrganization: OrganizationWithStats | null;
  currentOrganizationId: string | null;

  // User's organizations
  userOrganizations: UserOrganization[];

  // Loading states
  isLoading: boolean;
  isSwitching: boolean;

  // Error state
  error: string | null;

  // Actions
  setCurrentOrganization: (organization: OrganizationWithStats | null) => void;
  setCurrentOrganizationId: (id: string | null) => void;
  setUserOrganizations: (organizations: UserOrganization[]) => void;
  addOrganization: (organization: UserOrganization) => void;
  removeOrganization: (organizationId: string) => void;
  updateOrganization: (organizationId: string, updates: Partial<UserOrganization>) => void;
  setLoading: (loading: boolean) => void;
  setSwitching: (switching: boolean) => void;
  setError: (error: string | null) => void;
  clearOrganization: () => void;

  // Computed helpers
  getPrimaryOrganization: () => UserOrganization | undefined;
  isOrganizationMember: (organizationId: string) => boolean;
  isOrganizationAdmin: (organizationId: string) => boolean;
}

// ============================================================================
// STORE
// ============================================================================

export const useOrganizationStore = create<OrganizationState>()(
  persist(
    (set, get) => ({
      // Initial state
      currentOrganization: null,
      currentOrganizationId: null,
      userOrganizations: [],
      isLoading: false,
      isSwitching: false,
      error: null,

      // Actions
      setCurrentOrganization: organization => {
        set({
          currentOrganization: organization,
          currentOrganizationId: organization?.organizationId || null,
        });
      },

      setCurrentOrganizationId: id => {
        set({ currentOrganizationId: id });
      },

      setUserOrganizations: organizations => {
        set({ userOrganizations: organizations });

        // Auto-select primary or first organization if none selected
        const state = get();
        if (!state.currentOrganizationId && organizations.length > 0) {
          const primary = organizations.find(o => o.isPrimary);
          set({
            currentOrganizationId: primary?.organizationId || organizations[0].organizationId,
          });
        }
      },

      addOrganization: organization => {
        set(state => ({
          userOrganizations: [...state.userOrganizations, organization],
        }));
      },

      removeOrganization: organizationId => {
        set(state => {
          const newOrgs = state.userOrganizations.filter(o => o.organizationId !== organizationId);

          // If removed current organization, switch to another
          let newCurrentId = state.currentOrganizationId;
          if (state.currentOrganizationId === organizationId) {
            const primary = newOrgs.find(o => o.isPrimary);
            newCurrentId = primary?.organizationId || newOrgs[0]?.organizationId || null;
          }

          return {
            userOrganizations: newOrgs,
            currentOrganizationId: newCurrentId,
          };
        });
      },

      updateOrganization: (organizationId, updates) => {
        set(state => ({
          userOrganizations: state.userOrganizations.map(o =>
            o.organizationId === organizationId ? { ...o, ...updates } : o
          ),
        }));
      },

      setLoading: loading => set({ isLoading: loading }),
      setSwitching: switching => set({ isSwitching: switching }),
      setError: error => set({ error }),

      clearOrganization: () => {
        set({
          currentOrganization: null,
          currentOrganizationId: null,
          userOrganizations: [],
          error: null,
        });
      },

      // Computed helpers
      getPrimaryOrganization: () => {
        const state = get();
        return state.userOrganizations.find(o => o.isPrimary);
      },

      isOrganizationMember: organizationId => {
        const state = get();
        return state.userOrganizations.some(o => o.organizationId === organizationId);
      },

      isOrganizationAdmin: organizationId => {
        const state = get();
        const org = state.userOrganizations.find(o => o.organizationId === organizationId);
        return org?.role === 'ORG_OWNER' || org?.role === 'ORG_ADMIN';
      },
    }),
    {
      name: 'organization-storage',
      partialize: state => ({
        currentOrganizationId: state.currentOrganizationId,
      }),
    }
  )
);

// ============================================================================
// HOOKS
// ============================================================================

/**
 * Hook to get current organization ID for API requests
 */
export function useCurrentOrganizationId(): string | null {
  return useOrganizationStore(state => state.currentOrganizationId);
}

/**
 * Hook to get current organization
 */
export function useCurrentOrganization(): OrganizationWithStats | null {
  return useOrganizationStore(state => state.currentOrganization);
}

/**
 * Hook to get user's organizations
 */
export function useUserOrganizations(): UserOrganization[] {
  return useOrganizationStore(state => state.userOrganizations);
}

/**
 * Hook to check if user has any organizations
 */
export function useHasOrganizations(): boolean {
  return useOrganizationStore(state => state.userOrganizations.length > 0);
}

/**
 * Hook to get organization switcher options
 */
export function useOrganizationOptions(): Array<{
  value: string;
  label: string;
  logo: string | null;
}> {
  return useOrganizationStore(state =>
    state.userOrganizations.map(org => ({
      value: org.organizationId,
      label: org.organizationName,
      logo: org.logoUrl,
    }))
  );
}
