/**
 * Tests for RolesManagementPage component
 */

import { describe, it, expect, vi } from 'vitest';
import { renderWithProviders } from '@/test/utils';
import RolesManagementPage from '../RolesManagementPage';

// Mock the modules
vi.mock('@/stores', async () => {
  const actual = await vi.importActual<any>('@/stores');
  return {
    ...actual,
    useAuthStore: Object.assign(
      vi.fn((selector: any) => {
        const state = {
          user: { userId: 'test-user', name: 'Test User', role: 'ADMIN', active: true },
          canSupervise: () => true,
          getEffectiveRole: () => 'ADMIN',
          isAuthenticated: true,
        };
        return selector ? selector(state) : state;
      }),
      {
        getState: () => ({
          isAuthenticated: true,
          user: { userId: 'test-user', name: 'Test User', role: 'ADMIN', active: true },
          canSupervise: () => true,
          getEffectiveRole: () => 'ADMIN',
        }),
      }
    ),
    playSound: vi.fn(),
  };
});

vi.mock('@/hooks/useWebSocket', async () => ({
  ...(await vi.importActual('@/hooks/useWebSocket')),
  useWebSocket: vi.fn(() => ({
    connectionStatus: 'connected',
    socketId: 'test-socket',
    reconnect: vi.fn(),
  })),
}));

vi.mock('@/services/api', async () => ({
  ...(await vi.importActual('@/services/api')),
  useCustomRoles: vi.fn(() => ({ data: [], isLoading: false })),
  useCreateCustomRole: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
  useUpdateCustomRole: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
  useDeleteCustomRole: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
}));

vi.mock('@/components/shared', async () => ({
  ...(await vi.importActual('@/components/shared')),
  useToast: vi.fn(() => ({
    toast: vi.fn(),
    dismiss: vi.fn(),
  })),
}));

describe('RolesManagementPage', () => {
  it('renders without crashing', () => {
    renderWithProviders(<RolesManagementPage />);
    expect(true).toBe(true);
  });
});
