/**
 * @file authStore.test.ts
 * @purpose Tests for authentication store using Zustand
 * @complexity medium
 * @tested yes
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { act } from 'react';
import type { User, UserRole, AuthTokens } from '@opsui/shared';
import { UserRole as UserRoleEnum } from '@opsui/shared';
import {
  useAuthStore,
  selectIsAuthenticated,
  selectUser,
  selectUserRole,
  selectActiveRole,
  selectEffectiveRole,
  selectAccessToken,
} from './authStore';

// Mock user data
const mockUser: User = {
  userId: 'USR-001',
  name: 'Test User',
  email: 'test@example.com',
  role: UserRoleEnum.PICKER,
  activeRole: null,
  additionalRoles: [UserRoleEnum.PACKER, UserRoleEnum.STOCK_CONTROLLER],
  createdAt: '2024-01-01T00:00:00Z',
  lastLoginAt: '2024-01-15T00:00:00Z',
  isActive: true,
  currentView: 'Dashboard',
  currentViewUpdatedAt: '2024-01-15T00:00:00Z',
  deletedAt: null,
  isAdmin: false,
};

const mockAdminUser: User = {
  ...mockUser,
  userId: 'USR-ADMIN',
  role: UserRoleEnum.ADMIN,
  isAdmin: true,
  additionalRoles: [
    UserRoleEnum.PICKER,
    UserRoleEnum.PACKER,
    UserRoleEnum.STOCK_CONTROLLER,
    UserRoleEnum.SUPERVISOR,
  ],
};

const mockAuthTokens: AuthTokens = {
  accessToken: 'mock-access-token',
  refreshToken: 'mock-refresh-token',
  user: mockUser,
};

describe('authStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    act(() => {
      useAuthStore.getState().clearAuth();
    });
  });

  describe('initial state', () => {
    it('should have correct initial state', () => {
      const state = useAuthStore.getState();

      expect(state.isAuthenticated).toBe(false);
      expect(state.accessToken).toBeNull();
      expect(state.refreshToken).toBeNull();
      expect(state.user).toBeNull();
      expect(state.activeRole).toBeNull();
    });
  });

  describe('login', () => {
    it('should set authentication state on login', () => {
      act(() => {
        useAuthStore.getState().login(mockAuthTokens);
      });

      const state = useAuthStore.getState();

      expect(state.isAuthenticated).toBe(true);
      expect(state.accessToken).toBe(mockAuthTokens.accessToken);
      expect(state.refreshToken).toBe(mockAuthTokens.refreshToken);
      expect(state.user).toEqual(mockUser);
      expect(state.activeRole).toBeNull(); // Should reset active role on login
    });

    it('should handle login for admin users', () => {
      const adminTokens: AuthTokens = {
        ...mockAuthTokens,
        user: mockAdminUser,
      };

      act(() => {
        useAuthStore.getState().login(adminTokens);
      });

      const state = useAuthStore.getState();

      expect(state.isAuthenticated).toBe(true);
      expect(state.user?.role).toBe(UserRoleEnum.ADMIN);
      expect(state.user?.isAdmin).toBe(true);
    });
  });

  describe('logout', () => {
    it('should clear authentication state on logout', () => {
      act(() => {
        useAuthStore.getState().login(mockAuthTokens);
      });

      act(() => {
        useAuthStore.getState().logout();
      });

      const state = useAuthStore.getState();

      expect(state.isAuthenticated).toBe(false);
      expect(state.accessToken).toBeNull();
      expect(state.refreshToken).toBeNull();
      expect(state.user).toBeNull();
      expect(state.activeRole).toBeNull();
    });
  });

  describe('updateTokens', () => {
    it('should update tokens and preserve active role', () => {
      act(() => {
        useAuthStore.getState().login(mockAuthTokens);
        useAuthStore.getState().setActiveRole(UserRoleEnum.PACKER);
      });

      const newTokens: AuthTokens = {
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
        user: mockUser,
      };

      act(() => {
        useAuthStore
          .getState()
          .updateTokens(newTokens.accessToken, newTokens.refreshToken, newTokens.user);
      });

      const state = useAuthStore.getState();

      expect(state.isAuthenticated).toBe(true);
      expect(state.accessToken).toBe('new-access-token');
      expect(state.refreshToken).toBe('new-refresh-token');
      expect(state.activeRole).toBe(UserRoleEnum.PACKER); // Preserved
    });

    it('should use activeRole from updated user if provided', () => {
      act(() => {
        useAuthStore.getState().login(mockAuthTokens);
        useAuthStore.getState().setActiveRole(UserRoleEnum.PICKER);
      });

      const userWithActiveRole: User = {
        ...mockUser,
        activeRole: UserRoleEnum.PACKER,
      };

      act(() => {
        useAuthStore
          .getState()
          .updateTokens('new-access-token', 'new-refresh-token', userWithActiveRole);
      });

      const state = useAuthStore.getState();
      expect(state.activeRole).toBe(UserRoleEnum.PACKER);
    });
  });

  describe('setUser', () => {
    it('should set user and their active role', () => {
      const userWithActiveRole: User = {
        ...mockUser,
        activeRole: UserRoleEnum.PACKER,
      };

      act(() => {
        useAuthStore.getState().setUser(userWithActiveRole);
      });

      const state = useAuthStore.getState();

      expect(state.user).toEqual(userWithActiveRole);
      expect(state.activeRole).toBe(UserRoleEnum.PACKER);
    });

    it('should set user to null', () => {
      act(() => {
        useAuthStore.getState().login(mockAuthTokens);
      });

      act(() => {
        useAuthStore.getState().setUser(null);
      });

      expect(useAuthStore.getState().user).toBeNull();
      expect(useAuthStore.getState().activeRole).toBeNull();
    });
  });

  describe('setActiveRole', () => {
    it('should set active role', () => {
      act(() => {
        useAuthStore.getState().login(mockAuthTokens);
      });

      act(() => {
        useAuthStore.getState().setActiveRole(UserRoleEnum.PACKER);
      });

      expect(useAuthStore.getState().activeRole).toBe(UserRoleEnum.PACKER);
    });

    it('should allow clearing active role by setting to null', () => {
      act(() => {
        useAuthStore.getState().login(mockAuthTokens);
        useAuthStore.getState().setActiveRole(UserRoleEnum.PACKER);
      });

      act(() => {
        useAuthStore.getState().setActiveRole(null);
      });

      expect(useAuthStore.getState().activeRole).toBeNull();
    });
  });

  describe('clearAuth', () => {
    it('should clear all auth data', () => {
      act(() => {
        useAuthStore.getState().login(mockAuthTokens);
        useAuthStore.getState().setActiveRole(UserRoleEnum.PACKER);
      });

      act(() => {
        useAuthStore.getState().clearAuth();
      });

      const state = useAuthStore.getState();

      expect(state.isAuthenticated).toBe(false);
      expect(state.accessToken).toBeNull();
      expect(state.refreshToken).toBeNull();
      expect(state.user).toBeNull();
      expect(state.activeRole).toBeNull();
    });
  });

  describe('getEffectiveRole', () => {
    it('should return activeRole when set', () => {
      act(() => {
        useAuthStore.getState().login(mockAuthTokens);
        useAuthStore.getState().setActiveRole(UserRoleEnum.PACKER);
      });

      expect(useAuthStore.getState().getEffectiveRole()).toBe(UserRoleEnum.PACKER);
    });

    it('should return user base role when activeRole is not set', () => {
      act(() => {
        useAuthStore.getState().login(mockAuthTokens);
      });

      expect(useAuthStore.getState().getEffectiveRole()).toBe(UserRoleEnum.PICKER);
    });

    it('should return null when not authenticated', () => {
      expect(useAuthStore.getState().getEffectiveRole()).toBeNull();
    });
  });

  describe('hasRole', () => {
    it('should return true when user has the role', () => {
      act(() => {
        useAuthStore.getState().login(mockAuthTokens);
      });

      expect(useAuthStore.getState().hasRole(UserRoleEnum.PICKER)).toBe(true);
    });

    it('should return true when activeRole matches', () => {
      act(() => {
        useAuthStore.getState().login(mockAuthTokens);
        useAuthStore.getState().setActiveRole(UserRoleEnum.PACKER);
      });

      expect(useAuthStore.getState().hasRole(UserRoleEnum.PACKER)).toBe(true);
    });

    it('should return false when user does not have the role', () => {
      act(() => {
        useAuthStore.getState().login(mockAuthTokens);
      });

      expect(useAuthStore.getState().hasRole(UserRoleEnum.SUPERVISOR)).toBe(false);
    });

    it('should return false when not authenticated', () => {
      expect(useAuthStore.getState().hasRole(UserRoleEnum.PICKER)).toBe(false);
    });

    it('should check against multiple roles', () => {
      act(() => {
        useAuthStore.getState().login(mockAuthTokens);
      });

      expect(useAuthStore.getState().hasRole(UserRoleEnum.PICKER, UserRoleEnum.PACKER)).toBe(true);
      expect(useAuthStore.getState().hasRole(UserRoleEnum.SUPERVISOR, UserRoleEnum.ADMIN)).toBe(
        false
      );
    });
  });

  describe('canPick', () => {
    it('should return true for admin users regardless of active role', () => {
      const adminTokens: AuthTokens = {
        ...mockAuthTokens,
        user: mockAdminUser,
      };

      act(() => {
        useAuthStore.getState().login(adminTokens);
        useAuthStore.getState().setActiveRole(UserRoleEnum.STOCK_CONTROLLER);
      });

      expect(useAuthStore.getState().canPick()).toBe(true);
    });

    it('should return true for picker role', () => {
      act(() => {
        useAuthStore.getState().login(mockAuthTokens);
      });

      expect(useAuthStore.getState().canPick()).toBe(true);
    });

    it('should return true when activeRole is picker', () => {
      const packerUser: User = {
        ...mockUser,
        role: UserRoleEnum.PACKER,
        additionalRoles: [UserRoleEnum.PICKER],
      };

      act(() => {
        useAuthStore.getState().login({ ...mockAuthTokens, user: packerUser });
        useAuthStore.getState().setActiveRole(UserRoleEnum.PICKER);
      });

      expect(useAuthStore.getState().canPick()).toBe(true);
    });

    it('should return false for non-picker users', () => {
      const stockControllerUser: User = {
        ...mockUser,
        role: UserRoleEnum.STOCK_CONTROLLER,
        additionalRoles: [],
      };

      act(() => {
        useAuthStore.getState().login({ ...mockAuthTokens, user: stockControllerUser });
      });

      expect(useAuthStore.getState().canPick()).toBe(false);
    });
  });

  describe('canPack', () => {
    it('should return true for admin users regardless of active role', () => {
      const adminTokens: AuthTokens = {
        ...mockAuthTokens,
        user: mockAdminUser,
      };

      act(() => {
        useAuthStore.getState().login(adminTokens);
        useAuthStore.getState().setActiveRole(UserRoleEnum.STOCK_CONTROLLER);
      });

      expect(useAuthStore.getState().canPack()).toBe(true);
    });

    it('should return true for packer role', () => {
      const packerUser: User = {
        ...mockUser,
        role: UserRoleEnum.PACKER,
      };

      act(() => {
        useAuthStore.getState().login({ ...mockAuthTokens, user: packerUser });
      });

      expect(useAuthStore.getState().canPack()).toBe(true);
    });

    it('should return true when activeRole is packer', () => {
      act(() => {
        useAuthStore.getState().login(mockAuthTokens);
        useAuthStore.getState().setActiveRole(UserRoleEnum.PACKER);
      });

      expect(useAuthStore.getState().canPack()).toBe(true);
    });

    it('should return false for non-packer users', () => {
      const pickerOnlyUser: User = {
        ...mockUser,
        role: UserRoleEnum.PICKER,
        additionalRoles: [],
      };

      act(() => {
        useAuthStore.getState().login({ ...mockAuthTokens, user: pickerOnlyUser });
      });

      expect(useAuthStore.getState().canPack()).toBe(false);
    });
  });

  describe('canSupervise', () => {
    it('should return true for admin users regardless of active role', () => {
      const adminTokens: AuthTokens = {
        ...mockAuthTokens,
        user: mockAdminUser,
      };

      act(() => {
        useAuthStore.getState().login(adminTokens);
        useAuthStore.getState().setActiveRole(UserRoleEnum.PICKER);
      });

      expect(useAuthStore.getState().canSupervise()).toBe(true);
    });

    it('should return true for supervisor role', () => {
      const supervisorUser: User = {
        ...mockUser,
        role: UserRoleEnum.SUPERVISOR,
      };

      act(() => {
        useAuthStore.getState().login({ ...mockAuthTokens, user: supervisorUser });
      });

      expect(useAuthStore.getState().canSupervise()).toBe(true);
    });

    it('should return true when activeRole is supervisor', () => {
      const adminWithSupervisor: User = {
        ...mockAdminUser,
        additionalRoles: [...mockAdminUser.additionalRoles!, UserRoleEnum.SUPERVISOR],
      };

      act(() => {
        useAuthStore.getState().login({ ...mockAuthTokens, user: adminWithSupervisor });
        useAuthStore.getState().setActiveRole(UserRoleEnum.SUPERVISOR);
      });

      expect(useAuthStore.getState().canSupervise()).toBe(true);
    });

    it('should return false for non-supervisor users', () => {
      act(() => {
        useAuthStore.getState().login(mockAuthTokens);
      });

      expect(useAuthStore.getState().canSupervise()).toBe(false);
    });
  });

  describe('selectors', () => {
    it('selectIsAuthenticated should return authentication status', () => {
      expect(selectIsAuthenticated(useAuthStore.getState())).toBe(false);

      act(() => {
        useAuthStore.getState().login(mockAuthTokens);
      });

      expect(selectIsAuthenticated(useAuthStore.getState())).toBe(true);
    });

    it('selectUser should return user', () => {
      expect(selectUser(useAuthStore.getState())).toBeNull();

      act(() => {
        useAuthStore.getState().login(mockAuthTokens);
      });

      expect(selectUser(useAuthStore.getState())).toEqual(mockUser);
    });

    it('selectUserRole should return user base role', () => {
      expect(selectUserRole(useAuthStore.getState())).toBeUndefined();

      act(() => {
        useAuthStore.getState().login(mockAuthTokens);
      });

      expect(selectUserRole(useAuthStore.getState())).toBe(UserRoleEnum.PICKER);
    });

    it('selectActiveRole should return active role', () => {
      expect(selectActiveRole(useAuthStore.getState())).toBeNull();

      act(() => {
        useAuthStore.getState().login(mockAuthTokens);
        useAuthStore.getState().setActiveRole(UserRoleEnum.PACKER);
      });

      expect(selectActiveRole(useAuthStore.getState())).toBe(UserRoleEnum.PACKER);
    });

    it('selectEffectiveRole should return active role if set, otherwise base role', () => {
      // Returns undefined when not authenticated (user is null, so user?.role is undefined)
      expect(selectEffectiveRole(useAuthStore.getState())).toBeUndefined();

      act(() => {
        useAuthStore.getState().login(mockAuthTokens);
      });

      expect(selectEffectiveRole(useAuthStore.getState())).toBe(UserRoleEnum.PICKER);

      act(() => {
        useAuthStore.getState().setActiveRole(UserRoleEnum.PACKER);
      });

      expect(selectEffectiveRole(useAuthStore.getState())).toBe(UserRoleEnum.PACKER);
    });

    it('selectAccessToken should return access token', () => {
      expect(selectAccessToken(useAuthStore.getState())).toBeNull();

      act(() => {
        useAuthStore.getState().login(mockAuthTokens);
      });

      expect(selectAccessToken(useAuthStore.getState())).toBe(mockAuthTokens.accessToken);
    });
  });
});
