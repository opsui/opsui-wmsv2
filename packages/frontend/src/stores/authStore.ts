/**
 * Auth store using Zustand
 *
 * Manages user authentication state and active role switching
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, UserRole, AuthTokens } from '@opsui/shared';

// Import enum values
import { UserRole as UserRoleEnum } from '@opsui/shared';

// ============================================================================
// TYPES
// ============================================================================

interface AuthState {
  // State
  isAuthenticated: boolean;
  accessToken: string | null;
  refreshToken: string | null;
  user: User | null;
  activeRole: UserRole | null; // Active role for multi-role users

  // Actions
  login: (tokens: AuthTokens) => void;
  logout: () => void;
  updateTokens: (accessToken: string, refreshToken: string, user: User) => void;
  setUser: (user: User | null) => void;
  setActiveRole: (activeRole: UserRole | null) => void;
  clearAuth: () => void;

  // Helpers
  getEffectiveRole: () => UserRole | null; // Get the role to use (activeRole if set, otherwise base role)
  hasRole: (...roles: UserRole[]) => boolean;
  canPick: () => boolean;
  canPack: () => boolean;
  canSupervise: () => boolean;
}

// ============================================================================
// STORE
// ============================================================================

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // Initial state
      isAuthenticated: false,
      accessToken: null,
      refreshToken: null,
      user: null,
      activeRole: null,

      // Login
      login: (tokens: AuthTokens) => {
        set({
          isAuthenticated: true,
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          user: tokens.user,
          activeRole: null, // Reset active role on login
        });
      },

      // Logout
      logout: () => {
        set({
          isAuthenticated: false,
          accessToken: null,
          refreshToken: null,
          user: null,
          activeRole: null,
        });
      },

      // Update tokens (from refresh)
      updateTokens: (accessToken: string, refreshToken: string, user: User) => {
        set(state => ({
          isAuthenticated: true,
          accessToken,
          refreshToken,
          user,
          // Preserve activeRole from state if not provided in updated user
          activeRole: user.activeRole ?? state.activeRole,
        }));
      },

      // Set user
      setUser: (user: User | null) => {
        set({ user, activeRole: user?.activeRole ?? null });
      },

      // Set active role (for multi-role users switching views)
      setActiveRole: (activeRole: UserRole | null) => {
        set({ activeRole });
      },

      // Clear auth data
      clearAuth: () => {
        set({
          isAuthenticated: false,
          accessToken: null,
          refreshToken: null,
          user: null,
          activeRole: null,
        });
      },

      // Get the effective role (activeRole if set, otherwise base role)
      getEffectiveRole: () => {
        const state = get();
        return state.activeRole ?? state.user?.role ?? null;
      },

      // Check if user has any of the specified roles (using effective role)
      hasRole: (...roles: UserRole[]) => {
        const effectiveRole = get().getEffectiveRole();
        if (!effectiveRole) return false;
        return roles.includes(effectiveRole);
      },

      // Check if user can pick (admin users can always pick, regardless of active role)
      canPick: () => {
        const state = get();
        if (state.user?.role === UserRoleEnum.ADMIN) {
          return true;
        }
        return state.hasRole(UserRoleEnum.PICKER, UserRoleEnum.ADMIN);
      },

      // Check if user can pack (admin users can always pack, regardless of active role)
      canPack: () => {
        const state = get();
        if (state.user?.role === UserRoleEnum.ADMIN) {
          return true;
        }
        return state.hasRole(UserRoleEnum.PACKER, UserRoleEnum.ADMIN);
      },

      // Check if user can supervise (using base role for admin/supervisor, not effective role)
      // This allows admin/supervisor users to access supervision features even when
      // they have an active worker role set (e.g., for testing or role switching)
      canSupervise: () => {
        const state = get();
        // Check base user role first - admin/supervisor users can always supervise
        if (
          state.user?.role === UserRoleEnum.ADMIN ||
          state.user?.role === UserRoleEnum.SUPERVISOR
        ) {
          return true;
        }
        // For non-admin/supervisor base roles, check effective role
        return state.hasRole(UserRoleEnum.SUPERVISOR, UserRoleEnum.ADMIN);
      },
    }),
    {
      name: 'wms-auth-storage',
      // Only persist these fields
      partialize: state => ({
        isAuthenticated: state.isAuthenticated,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        user: state.user,
        activeRole: state.activeRole,
      }),
    }
  )
);

// ============================================================================
// SELECTORS
// ============================================================================

export const selectIsAuthenticated = (state: AuthState) => state.isAuthenticated;
export const selectUser = (state: AuthState) => state.user;
export const selectUserRole = (state: AuthState) => state.user?.role;
export const selectActiveRole = (state: AuthState) => state.activeRole;
export const selectEffectiveRole = (state: AuthState) => state.activeRole ?? state.user?.role;
export const selectAccessToken = (state: AuthState) => state.accessToken;
